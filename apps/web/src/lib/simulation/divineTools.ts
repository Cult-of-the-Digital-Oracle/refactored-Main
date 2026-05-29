// divineTools.ts — Single source of truth for the 10 Demiurge tools.
// Imported by both the worker (effect logic) and the HUD (panel/log display).

export interface DivineToolDef {
  id: number;
  name: string;
  polarity: 'good' | 'evil';
  icon: string;
  description: string;
}

export const DIVINE_TOOLS: Record<number, DivineToolDef> = {
  0: { id: 0, name: 'Blessing Rain',       polarity: 'good', icon: '✨', description: 'Heal all entities in radius. Restores Health.' },
  1: { id: 1, name: 'Bountiful Harvest',   polarity: 'good', icon: '🌾', description: 'Spawns abundant fauna across the region.' },
  2: { id: 2, name: 'Spawn Missionaries',  polarity: 'good', icon: '🕯️', description: 'Spawns 50 faithful humans near the region.' },
  3: { id: 3, name: 'Found Settlement',    polarity: 'good', icon: '🏛️', description: 'Constructs 5 human buildings instantly.' },
  4: { id: 4, name: 'Shield of Faith',     polarity: 'good', icon: '🛡️', description: 'Grants extra Health to humans in the area.' },
  5: { id: 5, name: 'Meteor Strike',       polarity: 'evil', icon: '☄️', description: 'Annihilates all life and buildings in a radius.' },
  6: { id: 6, name: 'Plague Wave',         polarity: 'evil', icon: '☠️', description: 'Damages every entity in a wide radius.' },
  7: { id: 7, name: 'Orc Horde',           polarity: 'evil', icon: '👹', description: 'Spawns 100 orcs at the target.' },
  8: { id: 8, name: 'Famine',              polarity: 'evil', icon: '🥀', description: 'Kills a portion of fauna across the continent.' },
  9: { id: 9, name: 'Whisper Apostasy',    polarity: 'evil', icon: '🌀', description: 'Converts humans in the area to orcs.' },
};

export const TOOL_NAMES = Object.values(DIVINE_TOOLS).map(t => t.name);
