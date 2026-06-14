import * as fs from 'fs';
import * as path from 'path';
import seedrandom from 'seedrandom';
import { tickEntityBehavior, tickRegionBehavior, Region, Entity } from './entityBehavior';
import { applyNaturalGrowth, checkSchism, checkAbandon, RegionHistory } from './naturalGrowth';

export { Region, Entity };

export interface CivWorldState {
  day: number;               // current day index (block.timestamp / 86400)
  seed: string;              // deterministic daily seed
  regions: Region[];
  entities: Entity[];
  totalPopulation: number;
  totalFaith: number;        // scaled 1e6 (analog USDY, e.g. sum of entity faiths)
  dominantFaction: 'believer' | 'apostate' | 'balanced';
  activeRegions: number;
  lastUpdatedAt: number;     // unix timestamp
}

export interface DivineToolParams {
  targetRegionId?: number;
  magnitude?: number;
}

export interface DivineToolResult {
  success: boolean;
  affectedEntities: number;
  affectedRegions: number[];
  description: string;
}

export class CivilizationEngine {
  private state!: CivWorldState;
  private stateFilePath: string;
  private historyFilePath: string;
  private recentHistory: RegionHistory[] = [];

  constructor(stateFilePath?: string) {
    this.stateFilePath = stateFilePath || process.env.CIV_STATE_FILE || path.join(process.cwd(), 'civ-state.json');
    this.historyFilePath = path.join(path.dirname(this.stateFilePath), 'civ-history.json');
  }

  /**
   * Initializes the civilization world.
   * Loads from disk if exists, otherwise creates a brand new world.
   */
  async initialize(): Promise<void> {
    if (fs.existsSync(this.stateFilePath)) {
      try {
        const raw = fs.readFileSync(this.stateFilePath, 'utf8');
        this.state = JSON.parse(raw);
        console.log(`Loaded civilization state. Day: ${this.state.day}, Population: ${this.state.totalPopulation}`);
        
        if (fs.existsSync(this.historyFilePath)) {
          const rawHist = fs.readFileSync(this.historyFilePath, 'utf8');
          this.recentHistory = JSON.parse(rawHist);
        }
        return;
      } catch (err) {
        console.error('Failed to load state from disk, generating new world...', err);
      }
    }

    // Create a new world
    const startDay = Math.floor(Date.now() / 86400000);
    this.state = this.createNewWorld(startDay);
    await this.saveState();
  }

  /**
   * Returns a deterministic seeded RNG for a given seed string.
   */
  private getRNG(customSeed?: string): () => number {
    return seedrandom(customSeed || this.state.seed);
  }

  /** Next unused entity id — deterministic (max existing + 1). Replaces Date.now()
   *  so ids of spawned entities are reproducible across runs. */
  private nextEntityId(): number {
    let max = 0;
    for (const e of this.state.entities) if (e.id > max) max = e.id;
    return max + 1;
  }

  /** Refresh region populations + aggregate totals from the current entities/regions
   *  WITHOUT applying growth/decay (that belongs to tick()). */
  private recomputeTotals(): void {
    const { regions, entities } = this.state;
    regions.forEach(r => {
      if (r.isActive) r.population = entities.filter(e => e.regionId === r.id).length;
    });
    this.state.totalPopulation = regions.reduce((s, r) => s + (r.isActive ? r.population : 0), 0);
    this.state.totalFaith = entities.reduce((s, e) => s + e.faith, 0);
    this.state.activeRegions = regions.filter(r => r.isActive).length;
    const believers = entities.filter(e => e.type === 'believer').length;
    const apostates = entities.filter(e => e.type === 'apostate').length;
    this.state.dominantFaction = believers > apostates * 1.2 ? 'believer'
      : apostates > believers * 1.2 ? 'apostate' : 'balanced';
  }

  /**
   * Tick civilization by one day.
   */
  async tick(targetDay?: number): Promise<void> {
    const nextDay = targetDay !== undefined ? targetDay : this.state.day + 1;
    console.log(`Ticking civilization from day ${this.state.day} to ${nextDay}...`);

    this.state.day = nextDay;
    this.state.seed = `oracle-civ-${nextDay}`;
    const rng = this.getRNG();

    // 1. Record current region stats in history
    this.state.regions.forEach(r => {
      if (r.isActive) {
        this.recentHistory.push({
          regionId: r.id,
          day: this.state.day - 1,
          faith: r.faith,
          population: r.population
        });
      }
    });

    // Keep history capped at last 10 days
    const minDay = this.state.day - 10;
    this.recentHistory = this.recentHistory.filter(h => h.day >= minDay);

    // 2. Apply Natural Growth & decay
    this.state = applyNaturalGrowth(this.state, rng);

    // 3. Process region-level behaviors (schisms, abandonments)
    const activeRegions = this.state.regions.filter(r => r.isActive);
    for (const region of activeRegions) {
      // Check for abandonment
      if (checkAbandon(region, this.recentHistory)) {
        console.log(`Region ${region.id} has been abandoned.`);
        region.isActive = false;
        region.population = 0;
        // Turn entities in abandoned region into wanderers or kill them
        this.state.entities.forEach(e => {
          if (e.regionId === region.id) {
            e.type = 'wanderer';
            e.faith = Math.max(0, e.faith - 20);
          }
        });
        continue;
      }

      // Check for schisms (creating a new region)
      if (checkSchism(region, rng)) {
        const nextId = this.state.regions.length;
        const angle = rng() * Math.PI * 2;
        const dist = 20 + rng() * 10;
        const newX = Math.max(10, Math.min(90, Math.round(region.x + Math.cos(angle) * dist)));
        const newY = Math.max(10, Math.min(90, Math.round(region.y + Math.sin(angle) * dist)));

        console.log(`A schism occurred in region ${region.id}! Founding new settlement at (${newX}, ${newY}).`);
        const newRegion: Region = {
          id: nextId,
          x: newX,
          y: newY,
          population: 10,
          faith: Math.round(region.faith * 0.8), // inherits slightly lower faith
          resources: 40,
          faction: region.faith > 50 ? 'believer' : 'apostate',
          isActive: true,
          foundedAt: this.state.day
        };
        this.state.regions.push(newRegion);

        // Move 10 entities to this new region
        let moved = 0;
        this.state.entities.forEach(e => {
          if (e.regionId === region.id && moved < 10) {
            e.regionId = nextId;
            moved++;
          }
        });
      }
    }

    // 4. Process entity actions
    const currentActiveRegions = this.state.regions.filter(r => r.isActive);
    this.state.entities.forEach(entity => {
      const action = tickEntityBehavior(entity, currentActiveRegions, rng);
      if (action.type === 'convert' && action.newFaction) {
        entity.type = action.newFaction;
        entity.faith = action.newFaction === 'believer' ? 75 : action.newFaction === 'apostate' ? 20 : 50;
      } else if (action.type === 'migrate' && action.targetRegionId !== undefined) {
        entity.regionId = action.targetRegionId;
      } else if (action.type === 'flee' && action.targetRegionId !== undefined) {
        entity.regionId = action.targetRegionId;
        entity.health = Math.min(100, entity.health + 5); // recovers slightly while fleeing to safety
      } else if (action.type === 'build') {
        const reg = this.state.regions.find(r => r.id === entity.regionId);
        if (reg) {
          reg.resources = Math.min(100, reg.resources + 1);
          entity.karma += 0.5;
        }
      }
    });

    this.state.lastUpdatedAt = Math.floor(Date.now() / 1000);
    await this.saveState();
  }

  /**
   * Applies a divine tool effect to the world state.
   */
  async applyDivineTool(toolId: number, params: DivineToolParams = {}): Promise<DivineToolResult> {
    // Seed by (toolId, day) — NOT Date.now() — so the resulting world state and
    // its on-chain keccak hash are reproducible for the same logical inputs.
    const rng = this.getRNG(`divine-tool-${toolId}-${this.state.day}`);
    let description = '';
    let affectedEntities = 0;
    const affectedRegions: number[] = [];

    const activeRegions = this.state.regions.filter(r => r.isActive);
    if (activeRegions.length === 0) {
      return { success: false, affectedEntities: 0, affectedRegions: [], description: 'No active regions' };
    }

    // Determine target region
    let targetRegion = activeRegions[0];
    if (params.targetRegionId !== undefined) {
      const specified = activeRegions.find(r => r.id === params.targetRegionId);
      if (specified) targetRegion = specified;
    } else {
      // Pick random active region or largest region depending on tool
      targetRegion = activeRegions[Math.floor(rng() * activeRegions.length)];
    }

    console.log(`Applying divine tool ${toolId} on region ${targetRegion.id}...`);

    switch (toolId) {
      case 0: // Blessing Rain (Good, polarity=1)
        description = `A warm golden rain falls from the heavens, cleansing doubts and filling hearts with devotion.`;
        this.state.entities.forEach(e => {
          e.faith = Math.min(100, e.faith + 25);
          e.health = Math.min(100, e.health + 10);
          affectedEntities++;
        });
        activeRegions.forEach(r => {
          r.faith = Math.min(100, r.faith + 20);
          affectedRegions.push(r.id);
        });
        break;

      case 1: // Harvest Tide (Good, polarity=1)
        description = `Fields spontaneously overflow with rich crops. Storage barns burst at the seams!`;
        activeRegions.forEach(r => {
          r.resources = Math.min(100, r.resources + 50);
          affectedRegions.push(r.id);
        });
        this.state.entities.forEach(e => {
          e.health = Math.min(100, e.health + 20);
          affectedEntities++;
        });
        break;

      case 2: // Missionary Wave (Good, polarity=1)
        description = `Inspired visionaries arise, converting lost souls and swelling the ranks of believers.`;
        // Spawn 20 believer units in target region
        const baseId = this.nextEntityId();
        for (let i = 0; i < 20; i++) {
          this.state.entities.push({
            id: baseId + i,
            regionId: targetRegion.id,
            type: 'believer',
            faith: 80 + Math.floor(rng() * 20),
            karma: 10,
            health: 100
          });
          affectedEntities++;
        }
        targetRegion.faith = Math.min(100, targetRegion.faith + 30);
        affectedRegions.push(targetRegion.id);
        break;

      case 3: // Architect Gift (Good, polarity=1)
        description = `Monolithic stones arrange themselves into new settlements. A new region has been established!`;
        // Found a new settlement
        const nextId = this.state.regions.length;
        const newX = Math.max(10, Math.min(90, 20 + Math.floor(rng() * 60)));
        const newY = Math.max(10, Math.min(90, 20 + Math.floor(rng() * 60)));
        const newReg: Region = {
          id: nextId,
          x: newX,
          y: newY,
          population: 15,
          faith: 60,
          resources: 80,
          faction: 'believer',
          isActive: true,
          foundedAt: this.state.day
        };
        this.state.regions.push(newReg);
        affectedRegions.push(nextId);

        // Spawn 15 initial settlers
        const sId = this.nextEntityId();
        for (let i = 0; i < 15; i++) {
          this.state.entities.push({
            id: sId + i,
            regionId: nextId,
            type: 'believer',
            faith: 70,
            karma: 5,
            health: 100
          });
          affectedEntities++;
        }
        break;

      case 4: // Peace Covenant (Good, polarity=1)
        description = `A solemn peace descends. Believers and Apostates lay down their weapons to converse in peace.`;
        this.state.entities.forEach(e => {
          e.karma = Math.min(100, e.karma + 30);
          e.health = Math.min(100, e.health + 15);
          affectedEntities++;
        });
        activeRegions.forEach(r => {
          r.faith = Math.min(100, r.faith * 0.9 + 50); // move towards balance/harmony
          affectedRegions.push(r.id);
        });
        break;

      case 5: // Meteor Strike (Evil, polarity=0)
        description = `A roaring ball of cosmic fire crashes into Region ${targetRegion.id}, obliterating settlements.`;
        affectedRegions.push(targetRegion.id);
        // Kill 40% of entities in targetRegion
        const localEntities = this.state.entities.filter(e => e.regionId === targetRegion.id);
        const toKill = Math.floor(localEntities.length * 0.40);
        let killed = 0;
        this.state.entities = this.state.entities.filter(e => {
          if (e.regionId === targetRegion.id && killed < toKill) {
            killed++;
            affectedEntities++;
            return false;
          }
          return true;
        });
        targetRegion.resources = Math.max(0, targetRegion.resources - 50);
        targetRegion.faith = Math.max(0, targetRegion.faith - 20); // fear/apostasy
        break;

      case 6: // Plague Wave (Evil, polarity=0)
        description = `A choking green fog spreads disease across the perimeters, causing suffering.`;
        this.state.entities.forEach(e => {
          if (e.regionId === targetRegion.id || rng() < 0.3) {
            e.health = Math.max(5, e.health - 40);
            e.faith = Math.max(0, e.faith - 10);
            affectedEntities++;
          }
        });
        activeRegions.forEach(r => {
          if (r.id === targetRegion.id || rng() < 0.4) {
            r.resources = Math.max(0, r.resources - 30);
            affectedRegions.push(r.id);
          }
        });
        break;

      case 7: // Drought (Evil, polarity=0)
        description = `The sun blazes with unnatural fury. Rivers dry up and crops turn to ash.`;
        activeRegions.forEach(r => {
          r.resources = Math.max(0, r.resources - 60);
          affectedRegions.push(r.id);
        });
        this.state.entities.forEach(e => {
          e.health = Math.max(10, e.health - 15);
          affectedEntities++;
        });
        break;

      case 8: // Civil War Seed (Evil, polarity=0)
        description = `Ideological hatred flares. Neighbors turn on each other, tearing the region apart.`;
        affectedRegions.push(targetRegion.id);
        this.state.entities.forEach(e => {
          if (e.regionId === targetRegion.id) {
            e.health = Math.max(10, e.health - 25);
            e.faith = Math.max(0, e.faith - 15);
            e.karma = Math.max(0, e.karma - 30);
            affectedEntities++;
          }
        });
        targetRegion.resources = Math.max(0, targetRegion.resources - 30);
        break;

      case 9: // Apostasy Wave (Evil, polarity=0)
        description = `Whispers of the Great Void echo through minds. Faith collapses as dread sweeps the land.`;
        this.state.entities.forEach(e => {
          e.faith = Math.max(0, e.faith - 40);
          e.type = 'apostate';
          affectedEntities++;
        });
        activeRegions.forEach(r => {
          r.faith = Math.max(0, r.faith - 30);
          r.faction = 'apostate';
          affectedRegions.push(r.id);
        });
        break;

      default:
        return { success: false, affectedEntities: 0, affectedRegions: [], description: `Unknown tool ID ${toolId}` };
    }

    // Recalculate aggregate totals only — do NOT run full natural growth here.
    // The daily tick() applies growth/decay; doing it here too double-applied it
    // on divine-event days. Totals still refresh so the snapshot stays correct.
    this.recomputeTotals();
    await this.saveState();

    return {
      success: true,
      affectedEntities,
      affectedRegions,
      description
    };
  }

  /**
   * Helper to create a new deterministic initial world.
   */
  private createNewWorld(dayIndex: number): CivWorldState {
    const seed = `oracle-civ-${dayIndex}`;
    const rng = seedrandom(seed);

    // Initial regions (3 regions)
    const regions: Region[] = [
      { id: 0, x: 25, y: 35, population: 30, faith: 70, resources: 80, faction: 'believer', isActive: true, foundedAt: dayIndex },
      { id: 1, x: 75, y: 45, population: 30, faith: 30, resources: 60, faction: 'apostate', isActive: true, foundedAt: dayIndex },
      { id: 2, x: 50, y: 75, population: 40, faith: 50, resources: 70, faction: 'wanderer', isActive: true, foundedAt: dayIndex }
    ];

    // Initial entities (100 total)
    const entities: Entity[] = [];
    let entityId = 1;

    regions.forEach(region => {
      for (let i = 0; i < region.population; i++) {
        // Deterministic properties
        const rVal = rng();
        let type: 'believer' | 'apostate' | 'wanderer' = 'wanderer';
        let faith = 50;

        if (region.faction === 'believer') {
          type = rVal < 0.7 ? 'believer' : rVal < 0.9 ? 'wanderer' : 'apostate';
          faith = type === 'believer' ? 75 : type === 'apostate' ? 20 : 50;
        } else if (region.faction === 'apostate') {
          type = rVal < 0.7 ? 'apostate' : rVal < 0.9 ? 'wanderer' : 'believer';
          faith = type === 'believer' ? 75 : type === 'apostate' ? 20 : 50;
        } else {
          type = rVal < 0.4 ? 'believer' : rVal < 0.8 ? 'apostate' : 'wanderer';
          faith = type === 'believer' ? 75 : type === 'apostate' ? 20 : 50;
        }

        entities.push({
          id: entityId++,
          regionId: region.id,
          type,
          faith: Math.round(faith + (rng() - 0.5) * 10),
          karma: Math.round(50 + (rng() - 0.5) * 20),
          health: 100
        });
      }
    });

    return {
      day: dayIndex,
      seed,
      regions,
      entities,
      totalPopulation: entities.length,
      totalFaith: entities.reduce((sum, e) => sum + e.faith, 0),
      dominantFaction: 'balanced',
      activeRegions: regions.length,
      lastUpdatedAt: Math.floor(Date.now() / 1000)
    };
  }

  /**
   * Generates a snapshot payload ready for CivilizationLog.sol.
   */
  getSnapshot(): any {
    // Generate keccak256 hash of current world state JSON
    const stateJson = JSON.stringify({
      day: this.state.day,
      regions: this.state.regions,
      totalPopulation: this.state.totalPopulation,
      totalFaith: this.state.totalFaith,
      dominantFaction: this.state.dominantFaction,
      activeRegions: this.state.activeRegions
    });

    // Simple hash (using standard ethers keccak256 requires importing ethers)
    // We will do that in civSnapshot.ts.
    return {
      day: this.state.day,
      totalEntities: this.state.entities.length,
      totalPopulation: this.state.totalPopulation,
      totalFaith: this.state.totalFaith,
      dominantFaction: this.state.dominantFaction === 'believer' ? 0 : this.state.dominantFaction === 'apostate' ? 1 : 2,
      activeRegions: this.state.activeRegions,
      snapshotAt: this.state.lastUpdatedAt,
      rawJson: stateJson
    };
  }

  async saveState(): Promise<void> {
    try {
      const dir = path.dirname(this.stateFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf8');
      fs.writeFileSync(this.historyFilePath, JSON.stringify(this.recentHistory, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to write state to disk', err);
    }
  }

  getWorldState(): CivWorldState {
    return this.state;
  }
}
