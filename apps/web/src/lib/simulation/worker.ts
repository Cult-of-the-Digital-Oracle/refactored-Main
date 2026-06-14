// worker.ts — Continent-scale civilization simulator running in a Web Worker.
// Storage = SoA TypedArrays (zero GC pressure). Spatial hash for neighbor queries.
// Comlink exposes the control plane; per-frame render data goes via raw postMessage
// with transferable buffers (bypasses Comlink's JSON marshalling).

import * as Comlink from 'comlink';
import seedrandom from 'seedrandom';
import { CivilizationMap } from './mapGen';
import {
  WORLD_PX, MAX_ENTITIES, MAX_BUILDINGS,
  SPATIAL_GRID_CELLS, SPATIAL_CELL_PX, BIOME,
  RACE, ACTION, RACE_TO_FACTION,
  type FactionType, type RaceId, type SimWorldState,
  type SimEntity, type SimRegion, type SimDivineEvent,
  type WorkerUpdateMessage,
} from './types';

const MAX_BOATS = 300;
const BOAT_SLOTS = 3;

// Bridge: how many settlement landmarks the on-chain snapshot has added (dedup).
let civSettlementsPlaced = 0;

// ----- SoA storage -----
const PositionX = new Float32Array(MAX_ENTITIES);
const PositionY = new Float32Array(MAX_ENTITIES);
const VelocityX = new Float32Array(MAX_ENTITIES);
const VelocityY = new Float32Array(MAX_ENTITIES);
const EntityType = new Uint8Array(MAX_ENTITIES);
const IsActive = new Uint8Array(MAX_ENTITIES);
const Health = new Float32Array(MAX_ENTITIES);
const Cooldown = new Int16Array(MAX_ENTITIES);
const SpawnCooldown = new Int16Array(MAX_ENTITIES);
const ActionState = new Uint8Array(MAX_ENTITIES);
const RegionRef = new Uint16Array(MAX_ENTITIES);

const BPosX = new Float32Array(MAX_BUILDINGS);
const BPosY = new Float32Array(MAX_BUILDINGS);
const BRace = new Uint8Array(MAX_BUILDINGS);
const BSubType = new Uint8Array(MAX_BUILDINGS);
const BActive = new Uint8Array(MAX_BUILDINGS);
const BAge = new Uint16Array(MAX_BUILDINGS);

// Boats (dynamic — navigate toward target sand tile, carry up to 3 passengers)
const BoatPosX = new Float32Array(MAX_BOATS);
const BoatPosY = new Float32Array(MAX_BOATS);
const BoatVelX = new Float32Array(MAX_BOATS);
const BoatVelY = new Float32Array(MAX_BOATS);
const BoatActive = new Uint8Array(MAX_BOATS);
const BoatTargetX = new Float32Array(MAX_BOATS);
const BoatTargetY = new Float32Array(MAX_BOATS);
// Flat [boatId*3 + slot] → entityId (-1 if empty)
const BoatPassengers = new Int32Array(MAX_BOATS * BOAT_SLOTS);

// Per-entity boarding state
const BoardedBoat = new Int16Array(MAX_ENTITIES);   // -1 if on land
const BoardedSlot = new Uint8Array(MAX_ENTITIES);

// Slot offsets (px) — passenger feet position relative to boat centre
const SLOT_OFFSETS: ReadonlyArray<[number, number]> = [
  [0, 2],    // front centre
  [-8, 4],   // left rear
  [8, 4],    // right rear
];

const CellHead = new Int32Array(SPATIAL_GRID_CELLS * SPATIAL_GRID_CELLS);
const CellNext = new Int32Array(MAX_ENTITIES);

// ----- World state -----
let day = 0;
let seed = '';
let map: CivilizationMap | null = null;
let rng: seedrandom.PRNG = seedrandom('init');
let eventFeed: string[] = [];
let recentVisualEvents: SimDivineEvent[] = [];
let regions: SimRegion[] = [];
let loopHandle: any = null;
let tickCount = 0;
let updateCallback: ((m: WorkerUpdateMessage) => void) | null = null;

let entityFreeCursor = 0;
let buildingFreeCursor = 0;

function addEvent(msg: string) {
  const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  eventFeed.unshift(`[${ts}] ${msg}`);
  if (eventFeed.length > 50) eventFeed.pop();
}

// ----- Spawn helpers -----
function spawnEntity(type: number, x: number, y: number, regionId = 0): number {
  // O(1) typical via free cursor
  let id = -1;
  for (let i = 0; i < MAX_ENTITIES; i++) {
    const idx = (entityFreeCursor + i) % MAX_ENTITIES;
    if (!IsActive[idx]) { id = idx; break; }
  }
  if (id === -1) return -1;
  entityFreeCursor = (id + 1) % MAX_ENTITIES;

  IsActive[id] = 1;
  EntityType[id] = type;
  PositionX[id] = x;
  PositionY[id] = y;
  VelocityX[id] = (rng() - 0.5) * 2;
  VelocityY[id] = (rng() - 0.5) * 2;
  ActionState[id] = ACTION.IDLE;
  Cooldown[id] = 0;
  SpawnCooldown[id] = 0;
  RegionRef[id] = regionId;

  const race = (type / 10) | 0;
  if (race === 1) Health[id] = 100 + (type % 10) * 20;
  else if (race === 2) Health[id] = 150 + (type % 10) * 25;
  else if (race === 3) Health[id] = 80 + (type % 10) * 15;
  else Health[id] = 50;

  return id;
}

// Pick a sand tile somewhere far away, in any direction — boats can roam to
// any corner of the world as long as they can find a water path.
function pickBoatTarget(boatId: number) {
  if (!map) return;
  for (let attempt = 0; attempt < 50; attempt++) {
    const tx = (rng() * map.width) | 0;
    const ty = (rng() * map.height) | 0;
    if (map.getAt(tx, ty) !== BIOME.SAND) continue;
    const dx = tx * 16 - BoatPosX[boatId];
    const dy = ty * 16 - BoatPosY[boatId];
    if (dx * dx + dy * dy < 600 * 600) continue; // min distance
    BoatTargetX[boatId] = tx * 16;
    BoatTargetY[boatId] = ty * 16;
    return;
  }
  // Fallback — any point in the world (boat will path toward whatever water it
  // can reach in that direction)
  BoatTargetX[boatId] = rng() * WORLD_PX;
  BoatTargetY[boatId] = rng() * WORLD_PX;
}

function spawnBoat(x: number, y: number): number {
  for (let i = 0; i < MAX_BOATS; i++) {
    if (!BoatActive[i]) {
      BoatActive[i] = 1;
      BoatPosX[i] = x;
      BoatPosY[i] = y;
      BoatVelX[i] = 0;
      BoatVelY[i] = 0;
      BoatPassengers[i * BOAT_SLOTS] = -1;
      BoatPassengers[i * BOAT_SLOTS + 1] = -1;
      BoatPassengers[i * BOAT_SLOTS + 2] = -1;
      pickBoatTarget(i);
      return i;
    }
  }
  return -1;
}

function spawnBuilding(race: RaceId, x: number, y: number): number {
  let id = -1;
  for (let i = 0; i < MAX_BUILDINGS; i++) {
    const idx = (buildingFreeCursor + i) % MAX_BUILDINGS;
    if (!BActive[idx]) { id = idx; break; }
  }
  if (id === -1) return -1;
  buildingFreeCursor = (id + 1) % MAX_BUILDINGS;

  BActive[id] = 1;
  BPosX[id] = x;
  BPosY[id] = y;
  BRace[id] = race;
  BSubType[id] = (rng() * 20) | 0;
  BAge[id] = 0;
  return id;
}

// ----- Tick: one simulation step -----
function tick() {
  if (!map) return;

  // 1. Rebuild spatial hash
  CellHead.fill(-1);
  for (let i = 0; i < MAX_ENTITIES; i++) {
    if (!IsActive[i]) continue;
    const cx = (PositionX[i] / SPATIAL_CELL_PX) | 0;
    const cy = (PositionY[i] / SPATIAL_CELL_PX) | 0;
    if (cx >= 0 && cx < SPATIAL_GRID_CELLS && cy >= 0 && cy < SPATIAL_GRID_CELLS) {
      const idx = cy * SPATIAL_GRID_CELLS + cx;
      CellNext[i] = CellHead[idx];
      CellHead[idx] = i;
    }
  }

  // 2. Age buildings
  for (let i = 0; i < MAX_BUILDINGS; i++) {
    if (BActive[i] && BAge[i] < 100) BAge[i]++;
  }

  // 2b. Boats — target-based navigation, slide along coasts, disembark passengers on arrival.
  for (let b = 0; b < MAX_BOATS; b++) {
    if (!BoatActive[b]) continue;

    // Steer toward target sand tile
    const tdx = BoatTargetX[b] - BoatPosX[b];
    const tdy = BoatTargetY[b] - BoatPosY[b];
    const tdist = Math.hypot(tdx, tdy);

    if (tdist < 80) {
      // Arrived — disembark all passengers onto nearest sand tile, pick new target
      const arrivalTx = (BoatPosX[b] / 16) | 0;
      const arrivalTy = (BoatPosY[b] / 16) | 0;
      let landX = -1, landY = -1;
      for (let r = 1; r <= 4 && landX < 0; r++) {
        for (let dy = -r; dy <= r && landX < 0; dy++) {
          for (let dx = -r; dx <= r && landX < 0; dx++) {
            if (map.getAt(arrivalTx + dx, arrivalTy + dy) === BIOME.SAND) {
              landX = arrivalTx + dx;
              landY = arrivalTy + dy;
            }
          }
        }
      }
      for (let s = 0; s < BOAT_SLOTS; s++) {
        const eid = BoatPassengers[b * BOAT_SLOTS + s];
        if (eid < 0) continue;
        if (IsActive[eid] && landX >= 0) {
          PositionX[eid] = landX * 16 + 8;
          PositionY[eid] = landY * 16 + 8;
          VelocityX[eid] = 0;
          VelocityY[eid] = 0;
          BoardedBoat[eid] = -1;
        }
        BoatPassengers[b * BOAT_SLOTS + s] = -1;
      }
      pickBoatTarget(b);
    } else {
      // Acceleration toward target (capped speed)
      const accel = 0.05;
      BoatVelX[b] += (tdx / tdist) * accel;
      BoatVelY[b] += (tdy / tdist) * accel;
      // Cap speed
      const sp = Math.hypot(BoatVelX[b], BoatVelY[b]);
      const MAX_SPEED = 1.2;
      if (sp > MAX_SPEED) {
        BoatVelX[b] = (BoatVelX[b] / sp) * MAX_SPEED;
        BoatVelY[b] = (BoatVelY[b] / sp) * MAX_SPEED;
      }
    }

    // Attempt move with axis-separated slide so boats hug coastlines smoothly
    const nx = BoatPosX[b] + BoatVelX[b];
    const ny = BoatPosY[b] + BoatVelY[b];
    if (map.isWaterAtPx(nx, ny)) {
      BoatPosX[b] = nx;
      BoatPosY[b] = ny;
    } else if (map.isWaterAtPx(nx, BoatPosY[b])) {
      BoatPosX[b] = nx;
      BoatVelY[b] *= -0.3;
    } else if (map.isWaterAtPx(BoatPosX[b], ny)) {
      BoatPosY[b] = ny;
      BoatVelX[b] *= -0.3;
    } else {
      BoatVelX[b] *= -0.5;
      BoatVelY[b] *= -0.5;
    }

    BoatVelX[b] *= 0.96;
    BoatVelY[b] *= 0.96;

    // Sync passenger positions to boat
    for (let s = 0; s < BOAT_SLOTS; s++) {
      const eid = BoatPassengers[b * BOAT_SLOTS + s];
      if (eid < 0) continue;
      if (!IsActive[eid] || BoardedBoat[eid] !== b) {
        BoatPassengers[b * BOAT_SLOTS + s] = -1;
        continue;
      }
      const ox = SLOT_OFFSETS[s][0];
      const oy = SLOT_OFFSETS[s][1];
      PositionX[eid] = BoatPosX[b] + ox;
      PositionY[eid] = BoatPosY[b] + oy;
      VelocityX[eid] = BoatVelX[b];
      VelocityY[eid] = BoatVelY[b];
      ActionState[eid] = ACTION.IDLE;
    }
  }

  // 3. Per-entity AI
  for (let i = 0; i < MAX_ENTITIES; i++) {
    if (!IsActive[i]) continue;

    // Boarded NPCs sit out the normal AI; the boat-sync pass owns their pose.
    if (BoardedBoat[i] >= 0) {
      const boatId = BoardedBoat[i];
      if (boatId < 0 || !BoatActive[boatId]) {
        BoardedBoat[i] = -1;
      } else {
        // Maybe disembark when the boat is touching sand
        const tx = (BoatPosX[boatId] / 16) | 0;
        const ty = (BoatPosY[boatId] / 16) | 0;
        let sandX = -1, sandY = -1;
        for (let dy = -1; dy <= 1 && sandX < 0; dy++) {
          for (let dx = -1; dx <= 1 && sandX < 0; dx++) {
            if (map.getAt(tx + dx, ty + dy) === BIOME.SAND) {
              sandX = tx + dx;
              sandY = ty + dy;
            }
          }
        }
        if (sandX >= 0 && rng() < 0.02) {
          // Disembark
          BoatPassengers[boatId * BOAT_SLOTS + BoardedSlot[i]] = -1;
          BoardedBoat[i] = -1;
          PositionX[i] = sandX * 16 + 8;
          PositionY[i] = sandY * 16 + 8;
          VelocityX[i] = 0;
          VelocityY[i] = 0;
        }
        continue;
      }
    }

    ActionState[i] = ACTION.IDLE;
    if (Cooldown[i] > 0) Cooldown[i]--;
    if (SpawnCooldown[i] > 0) SpawnCooldown[i]--;

    const type = EntityType[i];
    const myRace = (type / 10) | 0;
    const isWaterAnimal = myRace === 5;
    const isAnimal = myRace >= 4;
    const isSentient = myRace >= 1 && myRace <= 3;

    if (isAnimal) {
      // Random wander + occasional reproduction
      VelocityX[i] += (rng() - 0.5) * (isWaterAnimal ? 0.8 : 1.2);
      VelocityY[i] += (rng() - 0.5) * (isWaterAnimal ? 0.8 : 1.2);

      // Natural reproduction rate — tuned 20× slower than baseline so the
      // continent doesn't saturate within minutes.
      if (SpawnCooldown[i] === 0 && rng() < 0.00008) {
        spawnEntity(type, PositionX[i] + (rng() - 0.5) * 10, PositionY[i] + (rng() - 0.5) * 10);
        SpawnCooldown[i] = 1500;
      }
    } else {
      // Sentient race: hate triangle (H↔O, O↔E)
      const cx = (PositionX[i] / SPATIAL_CELL_PX) | 0;
      const cy = (PositionY[i] / SPATIAL_CELL_PX) | 0;

      let targetId = -1;
      let minDistSq = 999999;
      let repulseX = 0, repulseY = 0;

      const minNX = Math.max(0, cx - 1);
      const maxNX = Math.min(SPATIAL_GRID_CELLS - 1, cx + 1);
      const minNY = Math.max(0, cy - 1);
      const maxNY = Math.min(SPATIAL_GRID_CELLS - 1, cy + 1);

      for (let ny = minNY; ny <= maxNY; ny++) {
        for (let nx = minNX; nx <= maxNX; nx++) {
          let curr = CellHead[ny * SPATIAL_GRID_CELLS + nx];
          while (curr !== -1) {
            if (curr !== i && IsActive[curr]) {
              const tgtRace = (EntityType[curr] / 10) | 0;
              const dx = PositionX[curr] - PositionX[i];
              const dy = PositionY[curr] - PositionY[i];
              const distSq = dx * dx + dy * dy;

              // Hate matrix
              const isHated =
                (myRace === 1 && tgtRace === 2) ||
                (myRace === 2 && (tgtRace === 1 || tgtRace === 3)) ||
                (myRace === 3 && tgtRace === 2);

              if (isHated) {
                if (distSq < minDistSq && distSq < 20000) {
                  minDistSq = distSq;
                  targetId = curr;
                }
              } else if (tgtRace === myRace) {
                if (distSq < 250 && distSq > 0.1) {
                  repulseX -= dx;
                  repulseY -= dy;
                }
              }
            }
            curr = CellNext[curr];
          }
        }
      }

      VelocityX[i] += repulseX * 0.05;
      VelocityY[i] += repulseY * 0.05;

      if (targetId !== -1) {
        const dist = Math.sqrt(minDistSq);
        if (dist < 25) {
          // Attack
          if (Cooldown[i] === 0) {
            ActionState[i] = ACTION.ATTACK;
            const damage = myRace === 2 ? 25 : 15;
            Health[targetId] -= damage;
            Cooldown[i] = 30;
            if (Health[targetId] <= 0) IsActive[targetId] = 0;
          }
        } else {
          // Chase
          VelocityX[i] += (PositionX[targetId] - PositionX[i]) / dist * 0.9;
          VelocityY[i] += (PositionY[targetId] - PositionY[i]) / dist * 0.9;
        }
      } else {
        // Idle behavior: wander + occasional build/spawn
        VelocityX[i] += (rng() - 0.5) * 0.3;
        VelocityY[i] += (rng() - 0.5) * 0.3;

        if (Cooldown[i] === 0) {
          const roll = rng();
          if (
            roll < 0.002 &&
            map.isWalkable((PositionX[i] / 16) | 0, (PositionY[i] / 16) | 0)
          ) {
            // Check no nearby building
            let tooClose = false;
            for (let b = 0; b < MAX_BUILDINGS; b++) {
              if (!BActive[b]) continue;
              const dx = BPosX[b] - PositionX[i];
              const dy = BPosY[b] - PositionY[i];
              if (dx * dx + dy * dy < 4000) { tooClose = true; break; }
            }
            if (!tooClose) {
              spawnBuilding(myRace as RaceId, PositionX[i], PositionY[i]);
              ActionState[i] = ACTION.BUILD;
            }
            Cooldown[i] = 200;
          } else if (roll > 0.99975 && SpawnCooldown[i] === 0) {
            // 20× slower than the old 0.005 chance — natural humanoid growth
            // is meant to be slow drift, not a swarm.
            spawnEntity(type, PositionX[i] + (rng() - 0.5) * 10, PositionY[i] + (rng() - 0.5) * 10, RegionRef[i]);
            SpawnCooldown[i] = 300;
          }
        }
      }
    }

    // Boarding: humanoids standing on sand near a boat may climb in
    if (isSentient && rng() < 0.0008) {
      const tileX = (PositionX[i] / 16) | 0;
      const tileY = (PositionY[i] / 16) | 0;
      if (map.getAt(tileX, tileY) === BIOME.SAND) {
        for (let b = 0; b < MAX_BOATS; b++) {
          if (!BoatActive[b]) continue;
          const dx = BoatPosX[b] - PositionX[i];
          const dy = BoatPosY[b] - PositionY[i];
          if (dx * dx + dy * dy > 90 * 90) continue;
          for (let s = 0; s < BOAT_SLOTS; s++) {
            if (BoatPassengers[b * BOAT_SLOTS + s] === -1) {
              BoatPassengers[b * BOAT_SLOTS + s] = i;
              BoardedBoat[i] = b;
              BoardedSlot[i] = s;
              break;
            }
          }
          break;
        }
      }
    }

    // Mark walking state if not already attacking/building
    if (ActionState[i] === ACTION.IDLE) {
      if (Math.abs(VelocityX[i]) > 0.1 || Math.abs(VelocityY[i]) > 0.1) {
        ActionState[i] = ACTION.WALK;
      }
    }

    // Damping + integrate
    const oldX = PositionX[i];
    const oldY = PositionY[i];
    VelocityX[i] *= 0.85;
    VelocityY[i] *= 0.85;
    PositionX[i] += VelocityX[i];
    PositionY[i] += VelocityY[i];

    // HARD enforcement of terrain restriction. After integration:
    //   - revert step if it crossed onto the wrong biome
    //   - if even the old position was wrong (e.g. spawned mid-ocean by a
    //     divine tool), teleport to the nearest valid tile.
    if (isWaterAnimal) {
      if (!map.isWaterAtPx(PositionX[i], PositionY[i])) {
        if (!map.isWaterAtPx(oldX, oldY)) {
          // Beached — find nearest water tile within 8-tile radius
          const tx = (PositionX[i] / 16) | 0;
          const ty = (PositionY[i] / 16) | 0;
          outerW: for (let r = 1; r <= 8; r++) {
            for (let dy = -r; dy <= r; dy++) {
              for (let dx = -r; dx <= r; dx++) {
                if (map.isWaterAtPx((tx + dx) * 16 + 8, (ty + dy) * 16 + 8)) {
                  PositionX[i] = (tx + dx) * 16 + 8;
                  PositionY[i] = (ty + dy) * 16 + 8;
                  VelocityX[i] = 0;
                  VelocityY[i] = 0;
                  break outerW;
                }
              }
            }
          }
        } else {
          PositionX[i] = oldX;
          PositionY[i] = oldY;
          VelocityX[i] = -VelocityX[i] * 0.3;
          VelocityY[i] = -VelocityY[i] * 0.3;
        }
      }
    } else {
      // sentient OR land fauna — can't walk on water
      if (map.isWaterAtPx(PositionX[i], PositionY[i])) {
        if (map.isWaterAtPx(oldX, oldY)) {
          // Stuck in water — teleport to nearest walkable tile within 8 tiles
          const tx = (PositionX[i] / 16) | 0;
          const ty = (PositionY[i] / 16) | 0;
          outerL: for (let r = 1; r <= 8; r++) {
            for (let dy = -r; dy <= r; dy++) {
              for (let dx = -r; dx <= r; dx++) {
                if (map.isWalkable(tx + dx, ty + dy)) {
                  PositionX[i] = (tx + dx) * 16 + 8;
                  PositionY[i] = (ty + dy) * 16 + 8;
                  VelocityX[i] = 0;
                  VelocityY[i] = 0;
                  break outerL;
                }
              }
            }
          }
        } else {
          PositionX[i] = oldX;
          PositionY[i] = oldY;
          VelocityX[i] = -VelocityX[i] * 0.3;
          VelocityY[i] = -VelocityY[i] * 0.3;
        }
      }
    }

    // World bounds
    if (PositionX[i] < 0) { PositionX[i] = 0; VelocityX[i] *= -1; }
    if (PositionX[i] > WORLD_PX) { PositionX[i] = WORLD_PX; VelocityX[i] *= -1; }
    if (PositionY[i] < 0) { PositionY[i] = 0; VelocityY[i] *= -1; }
    if (PositionY[i] > WORLD_PX) { PositionY[i] = WORLD_PX; VelocityY[i] *= -1; }
  }

  tickCount++;
}

// ----- Render frame (zero-copy) -----
function postRenderFrame() {
  let count = 0;
  let bCount = 0;
  for (let i = 0; i < MAX_ENTITIES; i++) if (IsActive[i]) count++;
  for (let i = 0; i < MAX_BUILDINGS; i++) if (BActive[i]) bCount++;

  const positions = new Float32Array(count * 2);
  const velocities = new Float32Array(count * 2);
  const types = new Uint8Array(count);
  const states = new Uint8Array(count);

  let idx = 0;
  for (let i = 0; i < MAX_ENTITIES; i++) {
    if (!IsActive[i]) continue;
    positions[idx * 2] = PositionX[i];
    positions[idx * 2 + 1] = PositionY[i];
    velocities[idx * 2] = VelocityX[i];
    velocities[idx * 2 + 1] = VelocityY[i];
    types[idx] = EntityType[i];
    states[idx] = ActionState[i];
    idx++;
  }

  const bPositions = new Float32Array(bCount * 2);
  const bRaces = new Uint8Array(bCount);
  const bSubTypes = new Uint8Array(bCount);
  const bAges = new Uint16Array(bCount);

  let bIdx = 0;
  for (let i = 0; i < MAX_BUILDINGS; i++) {
    if (!BActive[i]) continue;
    bPositions[bIdx * 2] = BPosX[i];
    bPositions[bIdx * 2 + 1] = BPosY[i];
    bRaces[bIdx] = BRace[i];
    bSubTypes[bIdx] = BSubType[i];
    bAges[bIdx] = BAge[i];
    bIdx++;
  }

  // Boats — separate small array
  let boatCount = 0;
  for (let i = 0; i < MAX_BOATS; i++) if (BoatActive[i]) boatCount++;
  const boatPositions = new Float32Array(boatCount * 2);
  const boatVelocities = new Float32Array(boatCount * 2);
  let bi = 0;
  for (let i = 0; i < MAX_BOATS; i++) {
    if (!BoatActive[i]) continue;
    boatPositions[bi * 2] = BoatPosX[i];
    boatPositions[bi * 2 + 1] = BoatPosY[i];
    boatVelocities[bi * 2] = BoatVelX[i];
    boatVelocities[bi * 2 + 1] = BoatVelY[i];
    bi++;
  }

  // Comlink ignores messages it doesn't recognize; this RENDER_FRAME goes to a
  // dedicated listener on the main thread. We cast because TS resolves `self`
  // to Window in this lib config — at runtime this is DedicatedWorkerGlobalScope.
  (self as unknown as Worker).postMessage(
    {
      type: 'RENDER_FRAME',
      positions, velocities, types, states, count,
      bPositions, bRaces, bSubTypes, bAges, bCount,
      boatPositions, boatVelocities, boatCount,
    },
    [
      positions.buffer, velocities.buffer,
      types.buffer, states.buffer,
      bPositions.buffer, bRaces.buffer,
      bSubTypes.buffer, bAges.buffer,
      boatPositions.buffer, boatVelocities.buffer,
    ]
  );
}

// ----- Divine tool actions -----
const TOOL_NAMES = [
  'Blessing Rain', 'Bountiful Harvest', 'Spawn Missionaries', 'Found Settlement',
  'Shield of Faith', 'Meteor Strike', 'Plague Wave', 'Orc Horde',
  'Famine', 'Whisper Apostasy',
];

function applyDivineTool(toolId: number, region: SimRegion): SimDivineEvent {
  const tx = region.x;
  const ty = region.y;
  const polarity: 'good' | 'evil' = toolId < 5 ? 'good' : 'evil';

  switch (toolId) {
    case 0: // Blessing Rain
      for (let i = 0; i < MAX_ENTITIES; i++) {
        if (!IsActive[i]) continue;
        const dx = PositionX[i] - tx, dy = PositionY[i] - ty;
        if (dx * dx + dy * dy < 1000 * 1000) Health[i] = Math.min(Health[i] + 30, 200);
      }
      break;
    case 1: // Bountiful Harvest
      for (let i = 0; i < 30; i++) {
        spawnEntity(40 + ((rng() * 6) | 0),
          tx + (rng() - 0.5) * 800, ty + (rng() - 0.5) * 800);
      }
      break;
    case 2: // Spawn Missionaries
      for (let i = 0; i < 50; i++) {
        spawnEntity(10 + ((rng() * 10) | 0),
          tx + (rng() - 0.5) * 600, ty + (rng() - 0.5) * 600, region.id);
      }
      break;
    case 3: // Found Settlement
      for (let i = 0; i < 5; i++) {
        spawnBuilding(RACE.HUMAN,
          tx + (rng() - 0.5) * 400, ty + (rng() - 0.5) * 400);
      }
      break;
    case 4: // Shield of Faith
      for (let i = 0; i < MAX_ENTITIES; i++) {
        if (!IsActive[i]) continue;
        if (((EntityType[i] / 10) | 0) !== 1) continue;
        const dx = PositionX[i] - tx, dy = PositionY[i] - ty;
        if (dx * dx + dy * dy < 1500 * 1500) Health[i] += 50;
      }
      break;
    case 5: // Meteor Strike
      for (let i = 0; i < MAX_ENTITIES; i++) {
        if (!IsActive[i]) continue;
        const dx = PositionX[i] - tx, dy = PositionY[i] - ty;
        if (dx * dx + dy * dy < 800 * 800) {
          Health[i] -= 1000;
          if (Health[i] <= 0) IsActive[i] = 0;
        }
      }
      for (let i = 0; i < MAX_BUILDINGS; i++) {
        if (!BActive[i]) continue;
        const dx = BPosX[i] - tx, dy = BPosY[i] - ty;
        if (dx * dx + dy * dy < 800 * 800) BActive[i] = 0;
      }
      break;
    case 6: // Plague Wave
      for (let i = 0; i < MAX_ENTITIES; i++) {
        if (!IsActive[i]) continue;
        const dx = PositionX[i] - tx, dy = PositionY[i] - ty;
        if (dx * dx + dy * dy < 1500 * 1500) {
          Health[i] -= 50;
          if (Health[i] <= 0) IsActive[i] = 0;
        }
      }
      break;
    case 7: // Orc Horde
      for (let i = 0; i < 100; i++) {
        spawnEntity(20 + ((rng() * 10) | 0),
          tx + (rng() - 0.5) * 1000, ty + (rng() - 0.5) * 1000);
      }
      break;
    case 8: // Famine
      for (let i = 0; i < MAX_ENTITIES; i++) {
        if (!IsActive[i]) continue;
        if (((EntityType[i] / 10) | 0) < 4) continue;
        if (rng() < 0.4) IsActive[i] = 0;
      }
      break;
    case 9: // Whisper Apostasy
      for (let i = 0; i < MAX_ENTITIES; i++) {
        if (!IsActive[i]) continue;
        if (((EntityType[i] / 10) | 0) !== 1) continue;
        const dx = PositionX[i] - tx, dy = PositionY[i] - ty;
        if (dx * dx + dy * dy < 1000 * 1000 && rng() < 0.5) {
          EntityType[i] = 20 + (EntityType[i] - 10);
        }
      }
      break;
  }

  return {
    toolId,
    toolName: TOOL_NAMES[toolId] ?? `Tool#${toolId}`,
    polarity,
    description: `${TOOL_NAMES[toolId]} cast at ${region.faction} region`,
    targetRegionId: region.id,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

// ----- Comlink API -----
const simulationAPI = {
  async initialize(dayIndex: number): Promise<SimWorldState> {
    day = dayIndex;
    seed = `oracle-civ-${dayIndex}`;
    rng = seedrandom(seed);
    map = new CivilizationMap(seed);
    eventFeed = [];
    recentVisualEvents = [];
    tickCount = 0;
    entityFreeCursor = 0;
    buildingFreeCursor = 0;
    civSettlementsPlaced = 0;

    IsActive.fill(0);
    BActive.fill(0);
    BoatActive.fill(0);
    BoardedBoat.fill(-1);
    BoatPassengers.fill(-1);

    // Place 3 region centers on walkable terrain, spread apart
    regions = [];
    const TILE_PX = 16;
    let attempts = 0;
    while (regions.length < 3 && attempts < 5000) {
      attempts++;
      const tx = (rng() * map.width) | 0;
      const ty = (rng() * map.height) | 0;
      if (!map.isWalkable(tx, ty)) continue;
      const px = tx * TILE_PX, py = ty * TILE_PX;
      let tooClose = false;
      for (const r of regions) {
        const dx = r.x - px, dy = r.y - py;
        if (dx * dx + dy * dy < 4000 * 4000) { tooClose = true; break; }
      }
      if (tooClose) continue;

      const idx = regions.length;
      const faction: FactionType = idx === 0 ? 'believer' : idx === 1 ? 'apostate' : 'wanderer';
      regions.push({
        id: idx,
        x: px, y: py,
        population: 0, faith: 50, resources: 70,
        faction, isActive: true, foundedAt: dayIndex,
        level: 1, buildings: [],
      });
    }

    // Seed initial population + a coherent village per region.
    // Layout (concentric):
    //   r=0       great_hall (civic centre, biggest)
    //   r~150     monument (landmark)
    //   r~280     castle (subType 9)
    //   r=80-350  4-5 huts + 2-3 windmills/towers
    //   r=500-700 2-3 farms
    //   r=400-450 3-4 perimeter walls (subType 20)
    const placeBuilding = (race: RaceId, x: number, y: number, subType: number) => {
      if (!map!.isWalkable((x / 16) | 0, (y / 16) | 0)) return -1;
      const id = spawnBuilding(race, x, y);
      if (id !== -1) {
        BSubType[id] = subType;
        BAge[id] = 80; // pre-grown so the village looks established
      }
      return id;
    };

    for (const r of regions) {
      const baseType = r.faction === 'believer' ? 10 : r.faction === 'apostate' ? 20 : 30;
      const race = r.faction === 'believer' ? RACE.HUMAN : r.faction === 'apostate' ? RACE.ORC : RACE.ELF;

      for (let i = 0; i < 200; i++) {
        const subType = (rng() * 10) | 0;
        // Reject any candidate position that lands on water — keeps initial
        // population strictly on land even when a region centre is near a coast.
        let sx = r.x, sy = r.y;
        for (let tries = 0; tries < 12; tries++) {
          const angle = rng() * Math.PI * 2;
          const dist = rng() * 300;
          const cx = r.x + Math.cos(angle) * dist;
          const cy = r.y + Math.sin(angle) * dist;
          if (!map.isWaterAtPx(cx, cy)) { sx = cx; sy = cy; break; }
        }
        spawnEntity(baseType + subType, sx, sy, r.id);
      }

      // 1. Great hall at the centre — the city's civic heart
      placeBuilding(race, r.x, r.y, 22);

      // 2. Monument nearby
      {
        const a = rng() * Math.PI * 2;
        placeBuilding(race, r.x + Math.cos(a) * 200, r.y + Math.sin(a) * 200, 21);
      }

      // 3. Castle (subType 9) slightly further out
      {
        const a = rng() * Math.PI * 2;
        placeBuilding(race, r.x + Math.cos(a) * 320, r.y + Math.sin(a) * 320, 9);
      }

      // 4. Houses (huts, subType 2) — 5 around
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + rng() * 0.3;
        const d = 130 + rng() * 80;
        placeBuilding(race, r.x + Math.cos(a) * d, r.y + Math.sin(a) * d, 2);
      }

      // 5. Mid-ring: 2 windmill/lumber/moonwell (5) + 2 tower (6)
      for (let i = 0; i < 4; i++) {
        const a = rng() * Math.PI * 2;
        const d = 230 + rng() * 60;
        placeBuilding(race, r.x + Math.cos(a) * d, r.y + Math.sin(a) * d, i < 2 ? 5 : 6);
      }

      // 6. Farms at outer ring
      for (let i = 0; i < 3; i++) {
        const a = rng() * Math.PI * 2;
        const d = 500 + rng() * 200;
        placeBuilding(race, r.x + Math.cos(a) * d, r.y + Math.sin(a) * d, 3);
      }

      // 7. Perimeter walls (subType 20) — 4 cardinal posts at ~420px
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        placeBuilding(race, r.x + Math.cos(a) * 420, r.y + Math.sin(a) * 420, 20);
      }
    }

    // Spawn boats at coastlines (from mapGen's prop placements)
    const allProps = map.getProps();
    for (const p of allProps) {
      if (p.kind === 'boat') spawnBoat(p.x, p.y);
    }

    // Scatter fauna
    for (let i = 0; i < 200; i++) {
      const isWater = rng() < 0.4;
      const baseType = isWater ? 50 : 40;
      const subType = (rng() * 6) | 0;
      let x = rng() * WORLD_PX, y = rng() * WORLD_PX;
      let tries = 0;
      while (tries < 20) {
        const ok = isWater
          ? map.isWaterAtPx(x, y)
          : map.isWalkable((x / 16) | 0, (y / 16) | 0);
        if (ok) break;
        x = rng() * WORLD_PX;
        y = rng() * WORLD_PX;
        tries++;
      }
      spawnEntity(baseType + subType, x, y);
    }

    addEvent(`Day ${dayIndex}: continent seeded — ${regions.length} regions, fauna scattered.`);
    return this.getWorldState();
  },

  getBiomeGrid(): Uint8Array {
    return map ? map.getGrid() : new Uint8Array(0);
  },

  getTreesAndGrass() {
    if (!map) return { trees: [], grass: [], props: [] };
    return {
      trees: [...map.getTrees()],
      grass: [...map.getGrass()],
      props: [...map.getProps()],
    };
  },

  getWorldState(): SimWorldState {
    let totalPop = 0;
    let totalFaith = 0;
    const factionCount: Record<FactionType, number> = { believer: 0, apostate: 0, wanderer: 0 };

    for (let i = 0; i < MAX_ENTITIES; i++) {
      if (!IsActive[i]) continue;
      const race = (EntityType[i] / 10) | 0;
      if (race >= 4) continue; // fauna excluded from civ stats
      totalPop++;
      const faction = RACE_TO_FACTION[race as RaceId];
      factionCount[faction]++;
      const faithVal = race === 1 ? 75 : race === 2 ? 25 : 50;
      totalFaith += faithVal;
    }

    // Recompute per-region population
    for (const r of regions) {
      let pop = 0;
      let believers = 0;
      for (let i = 0; i < MAX_ENTITIES; i++) {
        if (!IsActive[i]) continue;
        const race = (EntityType[i] / 10) | 0;
        if (race >= 4) continue;
        const dx = PositionX[i] - r.x;
        const dy = PositionY[i] - r.y;
        if (dx * dx + dy * dy < 2000 * 2000) {
          pop++;
          if (race === 1) believers++;
        }
      }
      r.population = pop;
      r.faith = pop > 0 ? Math.round((100 * believers) / pop) : 0;
    }

    let dominant: FactionType | 'balanced' = 'balanced';
    if (factionCount.believer > factionCount.apostate + factionCount.wanderer) dominant = 'believer';
    else if (factionCount.apostate > factionCount.believer + factionCount.wanderer) dominant = 'apostate';
    else if (factionCount.wanderer > factionCount.believer + factionCount.apostate) dominant = 'wanderer';

    return {
      day, seed,
      regions: [...regions],
      entities: [],   // entities flow via RENDER_FRAME, not state
      totalPopulation: totalPop,
      totalFaith,
      dominantFaction: dominant,
      activeRegionsCount: regions.filter(r => r.isActive).length,
      lastUpdatedAt: Math.floor(Date.now() / 1000),
    };
  },

  // Bridge the live world toward the on-chain CivilizationLog snapshot. Growth-only
  // + per-call caps + settlement dedup → purely additive, never destabilizes the sim.
  applyCivSnapshot(snap: { totalPopulation: number; dominantFaction: number; activeRegions: number }) {
    if (!map || regions.length === 0) return;
    // on-chain dominantFaction: 0=believer→HUMAN(base 10), 1=apostate→ORC(base 20), 2=balanced→ELF(base 30)
    const base = snap.dominantFaction === 0 ? 10 : snap.dominantFaction === 1 ? 20 : 30;
    const race = base === 10 ? RACE.HUMAN : base === 20 ? RACE.ORC : RACE.ELF;

    // 1. Spawn density — trend the live population toward a scaled on-chain target.
    let live = 0;
    for (let i = 0; i < MAX_ENTITIES; i++) if (IsActive[i]) live++;
    const target = Math.max(150, Math.min(3000, Math.round(snap.totalPopulation * 4)));
    const deficit = Math.min(300, target - live); // cap spawn batch per call
    for (let n = 0; n < deficit; n++) {
      const r = regions[(rng() * regions.length) | 0];
      let sx = r.x, sy = r.y;
      for (let t = 0; t < 12; t++) {
        const a = rng() * Math.PI * 2, d = rng() * 600;
        const cx = r.x + Math.cos(a) * d, cy = r.y + Math.sin(a) * d;
        if (!map.isWaterAtPx(cx, cy)) { sx = cx; sy = cy; break; }
      }
      spawnEntity(base + ((rng() * 10) | 0), sx, sy, r.id);
    }

    // 2. Settlements — landmark buildings scaled by activeRegions (deduped, capped).
    const wantSettlements = Math.min(10, Math.max(0, snap.activeRegions) * 2);
    while (civSettlementsPlaced < wantSettlements) {
      const r = regions[(rng() * regions.length) | 0];
      const a = rng() * Math.PI * 2, d = 180 + rng() * 260;
      const x = r.x + Math.cos(a) * d, y = r.y + Math.sin(a) * d;
      if (!map.isWaterAtPx(x, y)) {
        const id = spawnBuilding(race, x, y);
        if (id !== -1) { BSubType[id] = civSettlementsPlaced % 2 === 0 ? 21 : 2; BAge[id] = 80; }
      }
      civSettlementsPlaced++;
    }
  },

  triggerDivineTool(toolId: number, targetRegionId: number): SimDivineEvent | null {
    const region = regions.find(r => r.id === targetRegionId) ?? regions[0];
    if (!region) return null;
    const ev = applyDivineTool(toolId, region);
    recentVisualEvents.push(ev);
    addEvent(`${ev.toolName} cast at region ${region.id} (${region.faction}).`);
    return ev;
  },

  // Direct user-spawned entities (sandbox / map click)
  spawnAt(factionBase: number, x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const subType = factionBase >= 40 ? (rng() * 6) | 0 : (rng() * 10) | 0;
      spawnEntity(factionBase + subType,
        x + (rng() - 0.5) * 80, y + (rng() - 0.5) * 80);
    }
  },

  // Map click meteor
  meteorAt(x: number, y: number, radius: number) {
    const rSq = radius * radius;
    for (let i = 0; i < MAX_ENTITIES; i++) {
      if (!IsActive[i]) continue;
      const dx = PositionX[i] - x, dy = PositionY[i] - y;
      if (dx * dx + dy * dy < rSq) {
        Health[i] -= 1000;
        if (Health[i] <= 0) IsActive[i] = 0;
      }
    }
    for (let i = 0; i < MAX_BUILDINGS; i++) {
      if (!BActive[i]) continue;
      const dx = BPosX[i] - x, dy = BPosY[i] - y;
      if (dx * dx + dy * dy < rSq) BActive[i] = 0;
    }
  },

  startLoop(cb: (m: WorkerUpdateMessage) => void) {
    if (loopHandle) return;
    updateCallback = cb;

    // 15Hz tick
    loopHandle = setInterval(() => {
      tick();
      postRenderFrame();

      // HUD state update at 1Hz (every 15 ticks)
      if (tickCount % 15 === 0 && updateCallback) {
        updateCallback({
          type: 'TICK_UPDATE',
          state: this.getWorldState(),
          events: [...eventFeed],
        });
      }
    }, 66.6);

    addEvent('Continent simulation online — 15 Hz tick.');
  },

  stopLoop() {
    if (loopHandle) {
      clearInterval(loopHandle);
      loopHandle = null;
      updateCallback = null;
    }
  },

  consumeVisualEvents(): SimDivineEvent[] {
    const evs = [...recentVisualEvents];
    recentVisualEvents = [];
    return evs;
  },
};

export type SimulationWorkerAPI = typeof simulationAPI;
Comlink.expose(simulationAPI);
