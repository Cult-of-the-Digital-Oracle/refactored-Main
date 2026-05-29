import { CivWorldState, Region, Entity } from './civilizationEngine';

export interface RegionHistory {
  regionId: number;
  day: number;
  faith: number;
  population: number;
}

/**
 * Checks if a region should trigger a schism (split).
 * Condition: population > 150, and random chance.
 */
export function checkSchism(region: Region, rng: () => number): boolean {
  if (region.population > 150 && rng() < 0.15) {
    return true;
  }
  return false;
}

/**
 * Checks if a region should be abandoned.
 * Condition: population is 0, or faith is under 10 for 3 consecutive days.
 */
export function checkAbandon(region: Region, recentHistory: RegionHistory[]): boolean {
  if (region.population === 0) return true;

  // Filter history for this region in the last 3 days
  const regionHist = recentHistory
    .filter(h => h.regionId === region.id)
    .sort((a, b) => b.day - a.day); // newest first

  if (regionHist.length >= 3) {
    const last3DaysLowFaith = regionHist.slice(0, 3).every(h => h.faith < 10);
    if (last3DaysLowFaith && region.faith < 10) {
      return true;
    }
  }

  return false;
}

/**
 * Applies organic growth, seasonal cycles, faith decay, and updates regions/entities.
 */
export function applyNaturalGrowth(world: CivWorldState, rng: () => number): CivWorldState {
  const K = 200; // Carrying capacity per region
  const baseGrowthRate = 0.08; // 8% base population growth rate

  // 1. Seasonal Cycle (7 day cycle)
  const seasonDay = world.day % 7;
  let seasonalMultiplier = 1.0;
  if (seasonDay === 0 || seasonDay === 6) {
    seasonalMultiplier = 0.8; // Penalty: winter/drought season
  } else if (seasonDay === 3) {
    seasonalMultiplier = 1.3; // Bonus: harvest season
  }

  const updatedRegions: Region[] = world.regions.map(region => {
    if (!region.isActive) return region;

    // A. Logistic Growth: dP = r * P * (1 - P/K)
    const P = region.population;
    if (P > 0) {
      const r = baseGrowthRate * seasonalMultiplier;
      const dP = r * P * (1 - P / K);
      const newPop = Math.max(1, Math.min(K, Math.round(P + dP)));
      region.population = newPop;
    }

    // B. Faith Decay: Without divine events, faith decays by 2%
    region.faith = Math.max(0, region.faith * 0.98);

    // C. Resource updates: builders contribute to resources, population consumes them
    // Let's assume resources regenerates slightly naturally, and grows based on pop
    const naturalRegen = 5;
    const consumption = region.population * 0.05;
    region.resources = Math.max(0, Math.min(100, region.resources + naturalRegen - consumption));

    // Update dominant faction in region based on faith
    if (region.faith > 60) {
      region.faction = 'believer';
    } else if (region.faith < 40) {
      region.faction = 'apostate';
    } else {
      region.faction = 'wanderer';
    }

    return region;
  });

  // 2. Entity natural updates (aging, random faith drift, natural healing)
  const updatedEntities: Entity[] = world.entities.map(entity => {
    // Faith decays slightly or drifts towards region's faith
    const targetRegion = updatedRegions.find(r => r.id === entity.regionId);
    if (targetRegion) {
      // Drift towards region faith by 5%
      entity.faith = entity.faith * 0.95 + targetRegion.faith * 0.05;
      
      // Natural health recovery if region resources are high
      if (targetRegion.resources > 50) {
        entity.health = Math.min(100, entity.health + 2);
      } else if (targetRegion.resources < 15) {
        entity.health = Math.max(0, entity.health - 3); // starving
      }
    }

    // Small random faith drift
    entity.faith = Math.max(0, Math.min(100, entity.faith + (rng() - 0.5) * 4));
    
    // Convert entity type based on faith thresholds
    if (entity.faith > 65) {
      entity.type = 'believer';
    } else if (entity.faith < 35) {
      entity.type = 'apostate';
    } else {
      entity.type = 'wanderer';
    }

    return entity;
  }).filter(entity => entity.health > 0); // Remove dead entities

  // Recalculate region populations from actual entities
  updatedRegions.forEach(r => {
    if (r.isActive) {
      r.population = updatedEntities.filter(e => e.regionId === r.id).length;
    }
  });

  // Calculate totals
  const totalPopulation = updatedRegions.reduce((sum, r) => sum + (r.isActive ? r.population : 0), 0);
  const totalFaith = updatedEntities.reduce((sum, e) => sum + e.faith, 0);
  const activeRegions = updatedRegions.filter(r => r.isActive).length;

  // Dominant faction calculation
  const believers = updatedEntities.filter(e => e.type === 'believer').length;
  const apostates = updatedEntities.filter(e => e.type === 'apostate').length;
  let dominantFaction: 'believer' | 'apostate' | 'balanced' = 'balanced';
  if (believers > apostates * 1.2) {
    dominantFaction = 'believer';
  } else if (apostates > believers * 1.2) {
    dominantFaction = 'apostate';
  }

  return {
    ...world,
    regions: updatedRegions,
    entities: updatedEntities,
    totalPopulation,
    totalFaith,
    dominantFaction,
    activeRegions,
    lastUpdatedAt: Math.floor(Date.now() / 1000)
  };
}
