export interface Region {
  id: number;
  x: number;                 // grid position 0-99
  y: number;
  population: number;
  faith: number;             // 0-100
  resources: number;         // 0-100
  faction: 'believer' | 'apostate' | 'wanderer';
  isActive: boolean;
  foundedAt: number;         // day index
}

export interface Entity {
  id: number;
  regionId: number;
  type: 'believer' | 'apostate' | 'wanderer';
  faith: number;             // 0-100
  karma: number;
  health: number;            // 0-100
}

export interface EntityAction {
  type: 'idle' | 'build' | 'migrate' | 'flee' | 'convert';
  targetRegionId?: number;
  newFaction?: 'believer' | 'apostate' | 'wanderer';
}

export interface RegionAction {
  type: 'none' | 'schism' | 'abandon';
  newRegionCoords?: { x: number; y: number };
}

/**
 * Determines behavior for a single entity per tick.
 * - health < 20 → FLEE (move to a region with highest health/safety or faith)
 * - faith > 70 → BUILDING (contributes to region resources)
 * - faith < 30 → MIGRATING or CONVERT
 * - faith 30-70 → IDLE
 */
export function tickEntityBehavior(entity: Entity, regions: Region[], rng: () => number): EntityAction {
  const currentRegion = regions.find(r => r.id === entity.regionId);

  // 1. Critical health → FLEE
  if (entity.health < 20) {
    const safeRegions = regions.filter(r => r.isActive && r.id !== entity.regionId && r.resources > 20);
    if (safeRegions.length > 0) {
      // Find the safest/best region
      const target = safeRegions.reduce((prev, curr) => (curr.resources > prev.resources ? curr : prev));
      return { type: 'flee', targetRegionId: target.id };
    }
    return { type: 'idle' };
  }

  // 2. Low Faith → Migrate or Convert
  if (entity.faith < 30) {
    const dice = rng();
    if (dice < 0.4) {
      // Convert to opposite faction (believer <-> apostate, wanderers can go either way)
      let newFaction: 'believer' | 'apostate' | 'wanderer' = 'wanderer';
      if (entity.type === 'believer') {
        newFaction = 'apostate';
      } else if (entity.type === 'apostate') {
        newFaction = 'believer';
      } else {
        newFaction = dice < 0.2 ? 'believer' : 'apostate';
      }
      return { type: 'convert', newFaction };
    } else {
      // Migrate to another active region with better faith align or higher resources
      const candidateRegions = regions.filter(r => r.isActive && r.id !== entity.regionId);
      if (candidateRegions.length > 0) {
        // Pick one based on faction alignment
        const aligned = candidateRegions.filter(r => 
          (entity.type === 'believer' && r.faction === 'believer') ||
          (entity.type === 'apostate' && r.faction === 'apostate')
        );
        const target = aligned.length > 0 ? aligned[Math.floor(rng() * aligned.length)] : candidateRegions[Math.floor(rng() * candidateRegions.length)];
        return { type: 'migrate', targetRegionId: target.id };
      }
    }
  }

  // 3. High Faith → BUILD
  if (entity.faith > 70) {
    return { type: 'build' };
  }

  // 4. Default → IDLE
  return { type: 'idle' };
}

/**
 * Determines behavior for a region.
 */
export function tickRegionBehavior(region: Region, allRegions: Region[], rng: () => number): RegionAction {
  if (!region.isActive) return { type: 'none' };

  // Schism: large population (> 150) and low resources or high tension
  if (region.population > 150 && rng() < 0.1) {
    // Propose schism: create a new region nearby
    const angle = rng() * Math.PI * 2;
    const distance = 15 + rng() * 15; // 15-30 grid units away
    let newX = Math.round(region.x + Math.cos(angle) * distance);
    let newY = Math.round(region.y + Math.sin(angle) * distance);

    // Keep in bounds
    newX = Math.max(5, Math.min(95, newX));
    newY = Math.max(5, Math.min(95, newY));

    return { type: 'schism', newRegionCoords: { x: newX, y: newY } };
  }

  // Abandon: zero population or extremely low resources and faith
  if (region.population === 0 && rng() < 0.5) {
    return { type: 'abandon' };
  }

  return { type: 'none' };
}
