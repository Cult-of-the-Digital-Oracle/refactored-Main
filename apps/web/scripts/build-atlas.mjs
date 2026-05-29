// build-atlas.mjs
// Asset pipeline: chroma-crop PNGs from PixelArtAssets → 64x64 WebP atlases + manifest.
// Run with: node scripts/build-atlas.mjs

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');
const SOURCE = path.resolve(APP_ROOT, '../../../PixelArtAssets/Pixel Art Assets');
const OUT_DIR = path.resolve(APP_ROOT, 'public/oracle-world');

const SIZE_ENTITY = 64;
const SIZE_TILE = 16;
const ATLAS_COLS = 16;

const WEBP_OPTS = { quality: 92, alphaQuality: 100, effort: 6, smartSubsample: false };

const CATEGORY_RULES = [
  { match: /^01_npcs[\\/]human/, atlas: 'units', size: SIZE_ENTITY, type: 'human' },
  { match: /^01_npcs[\\/]orc/, atlas: 'units', size: SIZE_ENTITY, type: 'orc' },
  { match: /^01_npcs[\\/]elf/, atlas: 'units', size: SIZE_ENTITY, type: 'elf' },
  { match: /^02_fauna[\\/]land/, atlas: 'units', size: SIZE_ENTITY, type: 'land_fauna' },
  { match: /^02_fauna[\\/]water/, atlas: 'units', size: SIZE_ENTITY, type: 'water_fauna' },
  { match: /^03_buildings[\\/]human/, atlas: 'buildings', size: SIZE_ENTITY, type: 'human_building' },
  { match: /^03_buildings[\\/]orc/, atlas: 'buildings', size: SIZE_ENTITY, type: 'orc_building' },
  { match: /^03_buildings[\\/]elf/, atlas: 'buildings', size: SIZE_ENTITY, type: 'elf_building' },
  { match: /^04_infrastructures/, atlas: 'buildings', size: SIZE_ENTITY, type: 'infra' },
  { match: /^05_environment[\\/]biomes/, atlas: 'env', size: SIZE_TILE, type: 'biome' },
  { match: /^05_environment[\\/]trees/, atlas: 'env', size: SIZE_ENTITY, type: 'tree' },
  { match: /^05_environment[\\/]props/, atlas: 'env', size: SIZE_ENTITY, type: 'prop' },
  { match: /^06_vfx/, atlas: 'vfx', size: SIZE_ENTITY, type: 'vfx' },
];

async function walkPNGs(dir, rel = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const r = rel ? path.join(rel, e.name) : e.name;
    if (e.isDirectory()) out.push(...await walkPNGs(abs, r));
    else if (e.name.toLowerCase().endsWith('.png')) out.push({ abs, rel: r, name: e.name });
  }
  return out;
}

function shouldKeep(file, filesInDir) {
  // Skip alternate char variants (-v1, -v2, etc) — they are different sprites, not -G versions
  if (/-v\d+\.png$/i.test(file.name)) return false;
  // If bare .png exists alongside a -G.png with same base, skip the bare one
  if (!/-G\d*\.png$/i.test(file.name)) {
    const base = file.name.replace(/\.png$/i, '');
    if (filesInDir.has(`${base}-G.png`)) return false;
  }
  return true;
}

function spriteName(file) {
  let s = file.name.replace(/\.png$/i, '');
  s = s.replace(/-G\d*$/i, '').replace(/_G\d+$/i, '');
  s = s.replace(/^\d+_/, '');
  s = s.toLowerCase()
       .replace(/[^a-z0-9]+/g, '_')
       .replace(/^_|_$/g, '');
  // Strip redundant category-name prefixes
  const STRIPS = [
    'npc_', 'fauna_', 'building_',
    'infrastruktur_pendukung_', 'infrastructure_',
    'lingkungan_bioma_alam_', 'environment_',
    'proyektil_vfx_engine_', 'vfx_',
  ];
  for (const p of STRIPS) {
    if (s.startsWith(p)) s = s.slice(p.length);
  }
  // Normalize race plurals
  s = s.replace(/^elves_/, 'elf_').replace(/^orcs_/, 'orc_');
  // Disambiguate building prefixes (drop redundant race)
  // e.g. human_human_castle -> human_castle, orc_orc_mud_hut -> orc_mud_hut
  s = s.replace(/^(human|orc|elf)_\1_/, '$1_');
  return s;
}

// Chroma-key: remove pure-ish green background → alpha 0
async function chromaCrop(buf) {
  const img = sharp(buf).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const len = out.length;
  for (let i = 0; i < len; i += 4) {
    const r = out[i], g = out[i + 1], b = out[i + 2];
    // Pure-ish green: g dominant, r and b much lower
    if (g > 150 && g > r + 40 && g > b + 40) {
      out[i + 3] = 0;
    }
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 0 })
    .toBuffer();
}

// Process one source PNG → sized RGBA buffer (raw, ready to composite)
async function processSprite(filePath, targetSize) {
  const src = await fs.readFile(filePath);
  const chromaCleaned = await chromaCrop(src);
  // trim transparent border, then contain-fit resize w/ nearest-neighbor
  return sharp(chromaCleaned)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 0 })
    .resize(targetSize, targetSize, {
      fit: 'contain',
      kernel: 'nearest',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
}

// Pack uniform-size sprites into a single atlas via row-grid layout
async function packUniformAtlas(sprites, cellSize) {
  if (sprites.length === 0) return null;
  const cols = Math.min(ATLAS_COLS, sprites.length);
  const rows = Math.ceil(sprites.length / cols);
  const W = cols * cellSize;
  const H = rows * cellSize;

  // Empty transparent canvas
  const canvas = sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  });

  const composites = [];
  const frames = {};
  for (let i = 0; i < sprites.length; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const x = col * cellSize, y = row * cellSize;
    composites.push({
      input: sprites[i].data,
      raw: { width: cellSize, height: cellSize, channels: 4 },
      left: x, top: y
    });
    frames[sprites[i].name] = { x, y, w: cellSize, h: cellSize };
  }

  const webp = await canvas.composite(composites).webp(WEBP_OPTS).toBuffer();
  return { buffer: webp, width: W, height: H, frames };
}

async function main() {
  console.log(`[atlas] source: ${SOURCE}`);
  console.log(`[atlas] output: ${OUT_DIR}\n`);

  // 1. Walk all PNGs
  const allFiles = await walkPNGs(SOURCE);
  console.log(`[atlas] scanned ${allFiles.length} PNG files`);

  // Index files per directory for the dedup filter
  const byDir = new Map();
  for (const f of allFiles) {
    const d = path.dirname(f.rel);
    if (!byDir.has(d)) byDir.set(d, new Set());
    byDir.get(d).add(f.name);
  }

  // 2. Filter
  const kept = allFiles.filter(f => shouldKeep(f, byDir.get(path.dirname(f.rel))));
  console.log(`[atlas] kept ${kept.length} files after dedup\n`);

  // 3. Categorize
  const buckets = { units: [], buildings: [], env_entity: [], env_tile: [], vfx: [] };

  for (const f of kept) {
    const rule = CATEGORY_RULES.find(r => r.match.test(f.rel));
    if (!rule) {
      console.warn(`  [skip] uncategorized: ${f.rel}`);
      continue;
    }
    const bucket = rule.atlas === 'env'
      ? (rule.size === SIZE_TILE ? 'env_tile' : 'env_entity')
      : rule.atlas;
    buckets[bucket].push({ ...f, rule });
  }

  // 4. Process all sprites
  console.log(`[atlas] processing sprites (chroma-crop + resize)...`);
  const processedBuckets = {};
  for (const [bucketName, files] of Object.entries(buckets)) {
    if (files.length === 0) continue;
    const size = files[0].rule.size;
    const sprites = [];
    for (const f of files) {
      const name = spriteName(f);
      try {
        const { data } = await processSprite(f.abs, size);
        sprites.push({ name, data, size });
      } catch (err) {
        console.warn(`  [err] ${f.rel}: ${err.message}`);
      }
    }
    processedBuckets[bucketName] = { sprites, size };
    console.log(`  ${bucketName}: ${sprites.length} sprites @ ${size}px`);
  }

  // 5. Pack atlases
  console.log(`\n[atlas] packing WebP atlases...`);
  const atlases = {};
  const allFrames = {};

  const finalAtlases = {
    units: processedBuckets.units,
    buildings: processedBuckets.buildings,
    vfx: processedBuckets.vfx,
  };
  for (const [atlasName, bucket] of Object.entries(finalAtlases)) {
    if (!bucket || bucket.sprites.length === 0) continue;
    const packed = await packUniformAtlas(bucket.sprites, bucket.size);
    if (!packed) continue;
    atlases[atlasName] = { file: `${atlasName}.webp`, width: packed.width, height: packed.height };
    for (const [n, f] of Object.entries(packed.frames)) {
      allFrames[n] = { atlas: atlasName, ...f };
    }
  }

  // env needs special handling: tiles (16) and entities (64) packed separately
  // We pack them into ONE env.webp file with tiles in top row and entities below.
  const tiles = processedBuckets.env_tile?.sprites ?? [];
  const envEntities = processedBuckets.env_entity?.sprites ?? [];

  if (tiles.length > 0 || envEntities.length > 0) {
    // Tiles: pack into a 1-row strip at top, each cell 16x16
    const tileRowCount = Math.ceil(tiles.length / 32);
    const tileRowW = 32 * SIZE_TILE; // 512 px
    const tileRowH = tileRowCount * SIZE_TILE;

    // Entities: standard 16-col grid, each 64×64
    const entCols = Math.min(ATLAS_COLS, envEntities.length || 1);
    const entRows = envEntities.length === 0 ? 0 : Math.ceil(envEntities.length / entCols);
    const entW = entCols * SIZE_ENTITY;
    const entH = entRows * SIZE_ENTITY;

    const W = Math.max(tileRowW, entW);
    const H = tileRowH + entH;

    const canvas = sharp({
      create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    });

    const composites = [];

    // tiles row(s) at top
    for (let i = 0; i < tiles.length; i++) {
      const col = i % 32, row = Math.floor(i / 32);
      const x = col * SIZE_TILE, y = row * SIZE_TILE;
      composites.push({
        input: tiles[i].data,
        raw: { width: SIZE_TILE, height: SIZE_TILE, channels: 4 },
        left: x, top: y
      });
      allFrames[tiles[i].name] = { atlas: 'env', x, y, w: SIZE_TILE, h: SIZE_TILE };
    }

    // entities below tile strip
    for (let i = 0; i < envEntities.length; i++) {
      const col = i % entCols, row = Math.floor(i / entCols);
      const x = col * SIZE_ENTITY, y = tileRowH + row * SIZE_ENTITY;
      composites.push({
        input: envEntities[i].data,
        raw: { width: SIZE_ENTITY, height: SIZE_ENTITY, channels: 4 },
        left: x, top: y
      });
      allFrames[envEntities[i].name] = { atlas: 'env', x, y, w: SIZE_ENTITY, h: SIZE_ENTITY };
    }

    const webp = await canvas.composite(composites).webp(WEBP_OPTS).toBuffer();
    atlases.env = { file: 'env.webp', width: W, height: H };
    // Persist tile/entity dimensions for renderer
    atlases.env.tileRowsHeight = tileRowH;

    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(path.join(OUT_DIR, 'env.webp'), webp);
    console.log(`  env.webp: ${W}×${H} (${(webp.length / 1024).toFixed(1)} KB)`);
  }

  // Write the other atlases
  await fs.mkdir(OUT_DIR, { recursive: true });
  for (const [atlasName, bucket] of Object.entries(finalAtlases)) {
    if (!bucket || bucket.sprites.length === 0) continue;
    const packed = await packUniformAtlas(bucket.sprites, bucket.size);
    await fs.writeFile(path.join(OUT_DIR, `${atlasName}.webp`), packed.buffer);
    const kb = (packed.buffer.length / 1024).toFixed(1);
    console.log(`  ${atlasName}.webp: ${packed.width}×${packed.height} (${kb} KB)`);
  }

  // 6. Write manifest
  const manifest = {
    generated: new Date().toISOString(),
    spriteSize: SIZE_ENTITY,
    tileSize: SIZE_TILE,
    atlases,
    frames: allFrames,
  };
  await fs.writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n[atlas] manifest.json: ${Object.keys(allFrames).length} frames`);

  // Total size report
  let totalKB = 0;
  for (const name of ['units', 'buildings', 'env', 'vfx']) {
    try {
      const s = await fs.stat(path.join(OUT_DIR, `${name}.webp`));
      totalKB += s.size / 1024;
    } catch {}
  }
  console.log(`[atlas] total atlas size: ${(totalKB / 1024).toFixed(2)} MB`);
  console.log(`[atlas] done.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
