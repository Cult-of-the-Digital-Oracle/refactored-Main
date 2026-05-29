// atlas-loader.ts — Loads WebP atlases produced by scripts/build-atlas.mjs and
// exposes named PIXI textures. Designed to be called once per page mount.

import { Assets, Texture, Rectangle } from 'pixi.js';
import type { AtlasManifest, RaceId, EntityTypeId } from './types';
import { RACE } from './types';

const MANIFEST_URL = '/oracle-world/manifest.json';

let manifest: AtlasManifest | null = null;
let textures: Map<string, Texture> = new Map();
let loadingPromise: Promise<void> | null = null;

export async function ensureAtlasesLoaded(): Promise<void> {
  if (manifest) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const res = await fetch(MANIFEST_URL);
    if (!res.ok) throw new Error(`failed to load atlas manifest: ${res.status}`);
    const m: AtlasManifest = await res.json();

    // Load all atlas WebPs in parallel via PIXI Assets (gives us GPU-uploaded base textures)
    const atlasNames = Object.keys(m.atlases);
    const atlasTextures = await Promise.all(
      atlasNames.map((name) => Assets.load(`/oracle-world/${m.atlases[name].file}`))
    );
    const atlasMap = new Map<string, Texture>();
    atlasNames.forEach((name, i) => {
      const tex = atlasTextures[i] as Texture;
      // Pixel-art crisp scaling
      tex.source.scaleMode = 'nearest';
      tex.source.style.scaleMode = 'nearest';
      atlasMap.set(name, tex);
    });

    // Slice each frame into a sub-texture (cheap — shares GPU memory with base)
    textures = new Map();
    for (const [name, f] of Object.entries(m.frames)) {
      const base = atlasMap.get(f.atlas);
      if (!base) continue;
      const sub = new Texture({
        source: base.source,
        frame: new Rectangle(f.x, f.y, f.w, f.h),
      });
      textures.set(name, sub);
    }

    manifest = m;
  })();

  return loadingPromise;
}

export function getTexture(name: string): Texture {
  const t = textures.get(name);
  return t ?? Texture.WHITE;
}

export function hasFrame(name: string): boolean {
  return textures.has(name);
}

export function getManifest(): AtlasManifest | null {
  return manifest;
}

// ----- EntityType (numeric) → atlas frame name -----

// Order MUST stay in sync with the worker's subType assignment.
const HUMAN_NPCS = [
  'human_villager', 'human_knight', 'human_archer', 'human_mage',
  'human_king', 'human_queen', 'human_ninja', 'human_priest',
  'human_farmer', 'human_general',
];
const ORC_NPCS = [
  'orc_peon', 'orc_grunt', 'orc_troll', 'orc_shaman',
  'orc_warchief', 'orc_wolf_rider', 'orc_berserker', 'orc_hunter',
  'orc_brute', 'orc_drummer',
];
const ELF_NPCS = [
  'elf_villager', 'elf_ranger', 'elf_druid', 'elf_spellblade',
  'elf_high_lord', 'elf_princess', 'elf_assasin', 'elf_healer',
  'elf_weaver', 'elf_treant',
];
const LAND_FAUNA = ['land_cat', 'land_dog', 'land_cow', 'land_sheep', 'land_wolf', 'land_bear'];
const WATER_FAUNA = ['water_fish', 'water_crab', 'water_turtle', 'water_shark', 'water_dolphin', 'water_kraken'];

export function frameForEntityType(type: EntityTypeId): string {
  if (type >= 10 && type <= 19) return HUMAN_NPCS[type - 10] ?? 'human_villager';
  if (type >= 20 && type <= 29) return ORC_NPCS[type - 20] ?? 'orc_peon';
  if (type >= 30 && type <= 39) return ELF_NPCS[type - 30] ?? 'elf_villager';
  if (type >= 40 && type <= 45) return LAND_FAUNA[type - 40] ?? 'land_cat';
  if (type >= 50 && type <= 55) return WATER_FAUNA[type - 50] ?? 'water_fish';
  return 'human_villager';
}

// Building frame lookup — 20 sub-types per race, ordered roughly primitive → modern
const HUMAN_BUILDINGS = [
  'human_campfire', 'human_hunting_tent', 'human_wood_hut', 'human_wheat_farm',
  'human_fish_pond', 'human_windmill', 'human_watchtower', 'human_barracks',
  'human_shipyard', 'human_castle', 'human_brick_factory', 'human_iron_factory',
  'human_eco_greenhouse', 'human_concrete_apartment', 'human_brutalist_bunker',
  'human_vertical_garden', 'human_radio_tower', 'human_oil_pump',
  'human_solar_array', 'human_glass_skyscraper',
];
const ORC_BUILDINGS = [
  'orc_skull_bonfire', 'orc_hide_tent', 'orc_mud_hut', 'orc_boar_pen',
  'orc_swamp_fishery', 'orc_lumber_camp', 'orc_spike_tower', 'orc_fighting_pit',
  'orc_war_raft', 'orc_chieftain_fort', 'orc_scrap_foundry', 'orc_slag_pit',
  'orc_ash_furnace', 'orc_iron_bunker', 'orc_spiked_bastion',
  'orc_diesel_generator', 'orc_signal_tower', 'orc_oil_rig',
  'orc_neon_reactor', 'orc_cyber_citadel',
];
const ELF_BUILDINGS = [
  'elf_magic_lantern', 'elf_leaf_tent', 'elf_small_treehouse', 'elf_berry_farm',
  'elf_lotus_pond', 'elf_moonwell', 'elf_crystal_tower', 'elf_archery_range',
  'elf_swan_boat', 'elf_grand_tree_palace', 'elf_mana_loom', 'elf_crystal_mine',
  'elf_solarpunk_greenhouse', 'elf_luminescent_apt', 'elf_nature_bastion',
  'elf_wind_spire', 'elf_star_observatory', 'elf_aether_pump',
  'elf_solar_matrix', 'elf_bio_spire',
];

// Infrastructure (subType 20-22) — race-specific landmarks that the worker
// seeds at each region center, not picked by the random builder loop.
const HUMAN_INFRA = ['human_wall', 'hero_monument_human', 'human_great_hall_1'];
const ORC_INFRA = ['orc_barricade', 'giant_totem_orc', 'orc_great_hall'];
const ELF_INFRA = ['elf_crystal_fence', 'tree_of_life_elf', 'elf_great_hall'];

export const SUBTYPE_WALL = 20;
export const SUBTYPE_MONUMENT = 21;
export const SUBTYPE_GREAT_HALL = 22;

export function frameForBuilding(race: RaceId, subType: number): string {
  if (subType >= 20 && subType <= 22) {
    const i = subType - 20;
    if (race === RACE.HUMAN) return HUMAN_INFRA[i];
    if (race === RACE.ORC) return ORC_INFRA[i];
    if (race === RACE.ELF) return ELF_INFRA[i];
  }
  const idx = subType % 20;
  if (race === RACE.HUMAN) return HUMAN_BUILDINGS[idx];
  if (race === RACE.ORC) return ORC_BUILDINGS[idx];
  if (race === RACE.ELF) return ELF_BUILDINGS[idx];
  return 'human_wood_hut';
}

// Per-subType base render scale (after the audit).
// Reference: NPC base = 0.32. Real-world proportion guide:
//   campfire < NPC < hut < tower < castle < great hall < skyscraper
export const BUILDING_SCALE: readonly number[] = [
  0.11,  // 0  campfire / skull bonfire / magic lantern  (small fire pit)
  0.42,  // 1  hunting tent / hide tent / leaf tent
  0.58,  // 2  wood hut / mud hut / small treehouse
  0.55,  // 3  wheat farm / boar pen / berry farm        (wide, low)
  0.55,  // 4  fish pond / swamp fishery / lotus pond
  0.72,  // 5  windmill / lumber camp / moonwell
  0.88,  // 6  watchtower / spike tower / crystal tower  (tall)
  0.72,  // 7  barracks / fighting pit / archery range
  0.66,  // 8  shipyard / war raft / swan boat
  1.05,  // 9  castle / chieftain fort / grand tree palace
  0.82,  // 10 brick factory / scrap foundry / mana loom
  0.80,  // 11 iron factory / slag pit / crystal mine
  0.74,  // 12 eco-greenhouse / ash furnace / solarpunk greenhouse
  0.90,  // 13 concrete apartment / iron bunker / luminescent apt
  0.92,  // 14 brutalist bunker / spiked bastion / nature bastion
  0.88,  // 15 vertical garden / diesel generator / wind spire
  1.08,  // 16 radio tower / signal tower / star observatory (very tall)
  0.80,  // 17 oil pump / oil rig / aether pump
  0.94,  // 18 solar array / neon reactor / solar matrix
  1.20,  // 19 glass skyscraper / cyber-citadel / bio-spire (skyscraper)
  // ----- Infrastructure (subType 20-22) -----
  0.65,  // 20 wall / barricade / crystal_fence            (wide, low — perimeter)
  1.00,  // 21 monument / totem / tree_of_life             (tall landmark)
  1.40,  // 22 great_hall                                   (BIGGEST — civic centre)
];

export function buildingScale(subType: number): number {
  return BUILDING_SCALE[subType] ?? BUILDING_SCALE[subType % 20] ?? 0.6;
}

// Per-NPC class adjustment. Most humanoids share a base size; large creatures
// get a multiplier so they feel chunky vs villagers, leaders get a small bonus.
export function unitScaleMultiplier(type: number): number {
  if (type === 39) return 1.55;    // elf_treant — tree-creature
  if (type === 55) return 1.65;    // water_kraken
  if (type === 45) return 1.35;    // land_bear
  if (type === 28 || type === 22) return 1.35; // orc_brute, orc_troll
  if (type === 53) return 1.30;    // water_shark
  if (type === 54) return 1.20;    // water_dolphin
  if (type === 14 || type === 24 || type === 34) return 1.15; // king / warchief / high_lord
  if (type === 15 || type === 35) return 1.1;  // queen / princess
  if (type === 40 || type === 41) return 0.65; // cat, dog — small
  if (type === 50 || type === 51) return 0.55; // fish, crab — small
  return 1.0;
}

// Env render scales — kept here so a single audit is the source of truth.
export const ENV_SCALE = {
  TREE_LIVING: 0.85,
  TREE_DEAD: 0.75,
  GRASS: 0.09,          // tiny tuft — strictly smaller than an NPC
  BOAT: 0.55,           // small boat
  DOCK: 0.50,           // wooden dock
};

// Projectile lookup — type → VFX frame name (null = melee, no sprite).
const PROJECTILE_BY_TYPE: Record<number, string | undefined> = {
  12: 'arrow_projectile',    // human_archer
  13: 'magic_bolt',          // human_mage
  17: 'magic_bolt',          // human_priest
  23: 'magic_bolt',          // orc_shaman
  24: 'axe_projectile',      // orc_warchief
  26: 'axe_projectile',      // orc_berserker
  27: 'arrow_projectile',    // orc_hunter
  28: 'axe_projectile',      // orc_brute
  31: 'arrow_projectile',    // elf_ranger
  32: 'magic_bolt',          // elf_druid
  33: 'magic_bolt',          // elf_spellblade
  34: 'magic_bolt',          // elf_high_lord
  35: 'magic_bolt',          // elf_princess
  36: 'arrow_projectile',    // elf_assassin
  37: 'magic_bolt',          // elf_healer
  38: 'magic_bolt',          // elf_weaver
};

export function projectileFor(type: number): string | undefined {
  return PROJECTILE_BY_TYPE[type];
}

// Prop frames (coast decorations)
export const PROP_FRAMES = {
  BOAT: 'transport_boat',
  DOCK_1: 'wooden_dock',
  DOCK_2: 'wooden_dock_2',
} as const;

// Biome tile lookup
export function frameForBiome(biomeId: number): string {
  switch (biomeId) {
    case 0: return 'deep_sea_biome';
    case 1: return 'shallow_sea_biome';
    case 2: return 'sand_biome';
    case 3: return 'grass_biome';
    case 4: return 'forest_biome';
    case 5: return 'mountain_biome';
    case 6: return 'snow_peak_biome';
    default: return 'grass_biome';
  }
}

// Tree variants
export const TREE_FRAMES = ['oak_tree_1', 'oak_tree_2', 'pine_tree', 'birch_tree'];
export const DEAD_TREE_FRAMES = ['dead_tree_1', 'dead_tree_2'];
export const GRASS_FRAMES = ['tall_grass_1', 'tall_grass_2'];

// VFX frames
export const VFX = {
  ARROW: 'arrow_projectile',
  AXE: 'axe_projectile',
  MAGIC_BOLT: 'magic_bolt',
  METEOR: 'meteor_strike',
  LIGHTNING: 'lightning_strike',
  EXPLOSION: 'explosion_debris',
  RAIN: 'raindrop_particle',
  SNOW: 'snowflake_particle',
} as const;
