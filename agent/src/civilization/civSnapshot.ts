import { ethers } from 'ethers';
import { CivWorldState } from './civilizationEngine';

export interface CivSnapshotPayload {
  stateHash: string;       // bytes32 (hex string starting with 0x)
  totalEntities: number;   // uint32
  totalPopulation: number; // uint32
  totalFaith: bigint;      // uint64 (scaled 1e6)
  dominantFaction: number; // uint8 (0=believer, 1=apostate, 2=balanced)
  activeRegions: number;   // uint8
  snapshotAt: bigint;      // uint64 (unix timestamp)
}

const CIV_LOG_ABI = [
  "function postSnapshot(uint256 day, tuple(bytes32 stateHash, uint32 totalEntities, uint32 totalPopulation, uint64 totalFaith, uint8 dominantFaction, uint8 activeRegions, uint64 snapshotAt) snap) external",
  "function logDivineEvent(tuple(uint8 toolId, uint8 polarity, uint64 executedAt, uint8 targetRegion, uint32 magnitude) ev) external",
  "function postDemiurgePreview(tuple(uint8[5] toolIds, uint8[5] weights, uint8 forcedPolarity, uint64 decisionAt, uint64 scheduledFor, string prophecyHash) preview) external"
];

/**
 * Computes a Keccak256 hash of the serialized world state.
 */
export function hashWorldState(world: CivWorldState): string {
  const stateJson = JSON.stringify({
    day: world.day,
    regions: world.regions,
    totalPopulation: world.totalPopulation,
    totalFaith: world.totalFaith,
    dominantFaction: world.dominantFaction,
    activeRegions: world.activeRegions
  });
  return ethers.keccak256(ethers.toUtf8Bytes(stateJson));
}

/**
 * Builds the snapshot payload from the current world state.
 */
export function buildSnapshot(world: CivWorldState): CivSnapshotPayload {
  const hash = hashWorldState(world);
  
  let dominantFaction = 2; // balanced
  if (world.dominantFaction === 'believer') dominantFaction = 0;
  else if (world.dominantFaction === 'apostate') dominantFaction = 1;

  return {
    stateHash: hash,
    totalEntities: world.entities.length,
    totalPopulation: world.totalPopulation,
    totalFaith: BigInt(Math.round(world.totalFaith * 1e6)), // Scale to 6 decimals
    dominantFaction,
    activeRegions: world.activeRegions,
    snapshotAt: BigInt(world.lastUpdatedAt)
  };
}

/**
 * Posts a civilization snapshot to CivilizationLog.sol.
 */
export async function postSnapshotToChain(
  signer: ethers.Wallet,
  civLogAddress: string,
  day: number,
  snapshot: CivSnapshotPayload
): Promise<string> {
  const contract = new ethers.Contract(civLogAddress, CIV_LOG_ABI, signer);
  const tx = await contract.postSnapshot(BigInt(day), {
    stateHash: snapshot.stateHash,
    totalEntities: snapshot.totalEntities,
    totalPopulation: snapshot.totalPopulation,
    totalFaith: snapshot.totalFaith,
    dominantFaction: snapshot.dominantFaction,
    activeRegions: snapshot.activeRegions,
    snapshotAt: snapshot.snapshotAt
  });
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Logs a divine event to CivilizationLog.sol.
 */
export async function postDivineEventToChain(
  signer: ethers.Wallet,
  civLogAddress: string,
  event: {
    toolId: number;
    polarity: number; // 0=evil, 1=good
    executedAt: number;
    targetRegion: number;
    magnitude: number;
  }
): Promise<string> {
  const contract = new ethers.Contract(civLogAddress, CIV_LOG_ABI, signer);
  const tx = await contract.logDivineEvent({
    toolId: event.toolId,
    polarity: event.polarity,
    executedAt: BigInt(event.executedAt),
    targetRegion: event.targetRegion,
    magnitude: event.magnitude
  });
  const receipt = await tx.wait();
  return receipt.hash;
}
