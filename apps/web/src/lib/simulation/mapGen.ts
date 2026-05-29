// mapGen.ts — Continent-scale procedural map (1024×1024 tiles).
// FastNoiseLite multi-octave noise + radial falloff for an "island continent" feel.

// @ts-ignore — package ships JS only
import FastNoiseLite from 'fastnoise-lite';
import { WORLD_TILES, BIOME, type BiomeId } from './types';

export interface TreeSpawn {
  x: number;       // pixel coords
  y: number;
  variant: number; // index into TREE_FRAMES (renderer decides)
  dead: boolean;
}

export interface GrassSpawn {
  x: number;
  y: number;
  variant: number;
}

export interface PropSpawn {
  x: number;
  y: number;
  kind: 'boat' | 'dock';
  variant: number;
}

export class CivilizationMap {
  readonly width = WORLD_TILES;
  readonly height = WORLD_TILES;
  private grid: Uint8Array;
  private trees: TreeSpawn[] = [];
  private grass: GrassSpawn[] = [];
  private props: PropSpawn[] = [];

  constructor(seedString: string) {
    this.grid = new Uint8Array(this.width * this.height);
    this.generate(seedString);
  }

  private hashSeed(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return h;
  }

  private generate(seedString: string) {
    const seed = this.hashSeed(seedString);

    // Three independent noise generators
    const heightNoise = new FastNoiseLite();
    heightNoise.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2);
    heightNoise.SetSeed(seed);
    heightNoise.SetFrequency(0.005);
    heightNoise.SetFractalType(FastNoiseLite.FractalType.FBm);
    heightNoise.SetFractalOctaves(4);
    heightNoise.SetFractalLacunarity(2.0);
    heightNoise.SetFractalGain(0.5);

    const moistureNoise = new FastNoiseLite();
    moistureNoise.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2);
    moistureNoise.SetSeed(seed + 1337);
    moistureNoise.SetFrequency(0.012);

    const forestNoise = new FastNoiseLite();
    forestNoise.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2);
    forestNoise.SetSeed(seed + 9001);
    forestNoise.SetFrequency(0.03);

    const cx = this.width / 2;
    const cy = this.height / 2;
    const maxR = Math.hypot(cx, cy);

    // Deterministic placeholder RNG (Mulberry32 from seed)
    let rngState = (seed >>> 0) || 1;
    const rand = () => {
      rngState |= 0;
      rngState = (rngState + 0x6D2B79F5) | 0;
      let t = rngState;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        // Radial continent falloff — gentler so most of the world is land/coast,
        // only the very outer corners fall to deep sea.
        const dx = x - cx;
        const dy = y - cy;
        const r = Math.hypot(dx, dy) / maxR;          // 0..1 (corner)
        const falloff = Math.max(0, 1 - Math.pow(r, 3.5) * 0.9);

        // Multi-octave height noise → -1..1
        const hn = heightNoise.GetNoise(x, y);
        const h = hn * 0.7 * falloff + falloff * 0.45 - 0.25;

        // Temperature: hotter at vertical middle, cold at top/bottom
        const lat = Math.abs(y - cy) / cy;
        const temp = 1 - lat * 1.05;

        // Moisture
        const m = (moistureNoise.GetNoise(x, y) + 1) * 0.5;

        let biome: BiomeId;
        if (h < -0.05) biome = BIOME.DEEP_SEA;
        else if (h < 0.05) biome = BIOME.SHALLOW_SEA;
        else if (h < 0.12) biome = BIOME.SAND;
        else if (h < 0.45) {
          if (m > 0.55 && forestNoise.GetNoise(x, y) > -0.1) biome = BIOME.FOREST;
          else biome = BIOME.GRASS;
        } else if (h < 0.75) biome = BIOME.MOUNTAIN;
        else biome = BIOME.MOUNTAIN;

        // Snow override at high altitude + cold latitude
        if (h > 0.35 && temp < 0.3) biome = BIOME.SNOW;
        if (h > 0.55 && temp < 0.5) biome = BIOME.SNOW;

        this.grid[y * this.width + x] = biome;
      }
    }

    // Sparse tree placement. Strided scatter avoids O(n) Poisson sampling cost.
    const TILE_PX = 16;
    // Helper to detect a coast cell: shallow_sea with at least one orthogonally
    // adjacent sand tile. Used to place docks.
    const hasAdjacentSand = (x: number, y: number) => {
      return (
        this.grid[y * this.width + (x + 1)] === BIOME.SAND ||
        this.grid[y * this.width + (x - 1)] === BIOME.SAND ||
        this.grid[(y + 1) * this.width + x] === BIOME.SAND ||
        this.grid[(y - 1) * this.width + x] === BIOME.SAND
      );
    };
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const b = this.grid[y * this.width + x];
        const wx = x * TILE_PX;
        const wy = y * TILE_PX;
        // Coast props (boats in shallow water, docks where shallow meets sand)
        if (b === BIOME.SHALLOW_SEA) {
          if (x > 0 && y > 0 && x < this.width - 1 && y < this.height - 1) {
            if (hasAdjacentSand(x, y) && rand() < 0.018) {
              this.props.push({
                x: wx + TILE_PX * 0.5,
                y: wy + TILE_PX * 0.5,
                kind: 'dock',
                variant: rand() < 0.5 ? 0 : 1,
              });
            } else if (rand() < 0.0003) {
              this.props.push({
                x: wx + rand() * TILE_PX,
                y: wy + rand() * TILE_PX,
                kind: 'boat',
                variant: 0,
              });
            }
          }
        }
        if (b === BIOME.FOREST && rand() < 0.10) {
          const dead = rand() < 0.06;
          this.trees.push({
            x: wx + rand() * TILE_PX,
            y: wy + rand() * TILE_PX,
            variant: Math.floor(rand() * 4),
            dead,
          });
        } else if (b === BIOME.GRASS && rand() < 0.015) {
          this.trees.push({
            x: wx + rand() * TILE_PX,
            y: wy + rand() * TILE_PX,
            variant: Math.floor(rand() * 4),
            dead: false,
          });
        } else if (b === BIOME.GRASS && rand() < 0.04) {
          this.grass.push({
            x: wx + rand() * TILE_PX,
            y: wy + rand() * TILE_PX,
            variant: Math.floor(rand() * 2),
          });
        }
      }
    }
  }

  getAt(x: number, y: number): BiomeId {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return BIOME.DEEP_SEA;
    return this.grid[y * this.width + x] as BiomeId;
  }

  isWalkable(x: number, y: number): boolean {
    const b = this.getAt(x, y);
    return b === BIOME.GRASS || b === BIOME.FOREST || b === BIOME.SAND;
  }

  isWaterAtPx(xPx: number, yPx: number): boolean {
    const tx = Math.floor(xPx / 16);
    const ty = Math.floor(yPx / 16);
    const b = this.getAt(tx, ty);
    return b === BIOME.DEEP_SEA || b === BIOME.SHALLOW_SEA;
  }

  getGrid(): Uint8Array {
    return this.grid;
  }

  getTrees(): readonly TreeSpawn[] {
    return this.trees;
  }

  getGrass(): readonly GrassSpawn[] {
    return this.grass;
  }

  getProps(): readonly PropSpawn[] {
    return this.props;
  }
}
