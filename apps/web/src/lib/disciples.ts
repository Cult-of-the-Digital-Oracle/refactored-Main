// disciples.ts — Bridge between TempleVault Disciples and the /oracle-world
// simulator. Each active Disciple wallet becomes a deterministic HERO NPC
// rendered above regular populations.

import type { PublicClient } from 'viem';
import { TEMPLE_VAULT_ABI } from './contracts';
import { generateDiscipleName } from './discipleName';
import { WORLD_TILES, BIOME, type BiomeId } from './simulation/types';

const TILE_PX = 16;

export interface HeroDisciple {
  tokenId: number;
  address: string;
  name: string;
  race: 1 | 2 | 3;     // 1=Human/Believer, 2=Orc/Apostate, 3=Elf/Wanderer
  subType: number;     // 0-9, picks the unit sprite within the race
  x: number;
  y: number;
  stake: bigint;
  karma: number;
  joinedAt: number;    // day index
}

// FNV-1a inspired hash — deterministic per address, no crypto needed
function hashAddressU32(addr: string, salt: number): number {
  let h = 0x811c9dc5 ^ salt;
  for (let i = 0; i < addr.length; i++) {
    h = Math.imul(h ^ addr.charCodeAt(i), 0x01000193);
  }
  return h >>> 0;
}

/**
 * Derive a deterministic world position for a wallet. If biomeGrid is supplied
 * we retry up to 32 candidates to land the hero on walkable terrain.
 */
export function positionForAddress(
  addr: string,
  biomeGrid?: Uint8Array | null,
): { x: number; y: number } {
  const WORLD_PX = WORLD_TILES * TILE_PX;
  for (let attempt = 0; attempt < 32; attempt++) {
    const hx = hashAddressU32(addr, attempt * 2 + 1);
    const hy = hashAddressU32(addr, attempt * 2 + 2);
    // Stay 800 px away from world edges
    const x = (hx % (WORLD_PX - 1600)) + 800;
    const y = (hy % (WORLD_PX - 1600)) + 800;
    if (!biomeGrid) return { x, y };
    const tx = Math.floor(x / TILE_PX);
    const ty = Math.floor(y / TILE_PX);
    const idx = ty * WORLD_TILES + tx;
    const b = biomeGrid[idx] as BiomeId;
    if (b === BIOME.GRASS || b === BIOME.FOREST || b === BIOME.SAND) {
      return { x, y };
    }
  }
  // Fallback: world centre
  return { x: WORLD_PX / 2, y: WORLD_PX / 2 };
}

/**
 * Race assignment is deterministic from the address, but tilted slightly toward
 * Humans (Believers) since the cult is human-centric in lore.
 */
export function raceForAddress(addr: string): 1 | 2 | 3 {
  const h = hashAddressU32(addr, 0xc01dface) % 100;
  if (h < 55) return 1;        // 55% believer / human
  if (h < 80) return 3;        // 25% wanderer / elf
  return 2;                    // 20% apostate / orc
}

export function subTypeForAddress(addr: string): number {
  return hashAddressU32(addr, 0xfee15bad) % 10;
}

/**
 * Read every active Disciple from TempleVault into HeroDisciple records.
 * Capped at MAX so we never overload the renderer if production grows huge.
 */
export async function fetchActiveDisciples(
  client: PublicClient,
  vaultAddress: `0x${string}`,
  biomeGrid: Uint8Array | null,
  MAX = 200,
): Promise<HeroDisciple[]> {
  const nextIdBig = (await client.readContract({
    address: vaultAddress,
    abi: TEMPLE_VAULT_ABI,
    functionName: 'nextId',
  })) as bigint;
  const total = Number(nextIdBig);
  if (total === 0) return [];

  const start = Math.max(1, total - MAX + 1);
  const calls = [];
  for (let i = start; i <= total; i++) {
    calls.push(
      client.readContract({
        address: vaultAddress,
        abi: TEMPLE_VAULT_ABI,
        functionName: 'disciples',
        args: [BigInt(i)],
      }),
    );
  }
  const rows = (await Promise.all(calls)) as Array<readonly unknown[]>;

  const result: HeroDisciple[] = [];
  for (let i = 0; i < rows.length; i++) {
    const tokenId = start + i;
    const [disciple, stakeAmount, active, karma, joinedAt] = rows[i] as [
      `0x${string}`, bigint, boolean, bigint, bigint,
    ];
    if (!active) continue;
    const addr = disciple.toLowerCase();
    const { x, y } = positionForAddress(addr, biomeGrid);
    const race = raceForAddress(addr);
    const subType = subTypeForAddress(addr);
    result.push({
      tokenId,
      address: addr,
      name: generateDiscipleName(addr),
      race, subType, x, y,
      stake: stakeAmount,
      karma: Number(karma),
      joinedAt: Number(joinedAt),
    });
  }
  return result;
}
