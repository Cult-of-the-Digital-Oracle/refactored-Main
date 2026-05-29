export interface DivineTool {
  readonly id: number;
  readonly name: string;
  readonly polarity: 'good' | 'evil';
  readonly cooldownDays: number;
  readonly desc: string;
}

export const DIVINE_TOOLS: readonly DivineTool[] = [
  // GOOD TOOLS (polarity = 'good', id 0-4)
  { id: 0, name: 'Blessing Rain',   polarity: 'good', cooldownDays: 2, desc: '+30% faith all regions, health recovery' },
  { id: 1, name: 'Harvest Tide',    polarity: 'good', cooldownDays: 3, desc: '+50% resources all regions' },
  { id: 2, name: 'Missionary Wave', polarity: 'good', cooldownDays: 4, desc: 'Spawn 20 new believer entities' },
  { id: 3, name: 'Architect Gift',  polarity: 'good', cooldownDays: 5, desc: 'Found 1 new settlement organically' },
  { id: 4, name: 'Peace Covenant',  polarity: 'good', cooldownDays: 6, desc: 'Halt all faction conflicts, boost harmony' },

  // EVIL TOOLS (polarity = 'evil', id 5-9)
  { id: 5, name: 'Meteor Strike',   polarity: 'evil', cooldownDays: 3, desc: '-40% population target region, drain resources' },
  { id: 6, name: 'Plague Wave',     polarity: 'evil', cooldownDays: 5, desc: 'Spreads health damage across random nodes' },
  { id: 7, name: 'Drought',         polarity: 'evil', cooldownDays: 4, desc: '-60% resources all regions, health drain' },
  { id: 8, name: 'Civil War Seed',  polarity: 'evil', cooldownDays: 7, desc: 'Tension/conflict and damage largest region' },
  { id: 9, name: 'Apostasy Wave',   polarity: 'evil', cooldownDays: 3, desc: '-40% faith all units, convert to apostates' },
] as const;

export type ToolId = 0|1|2|3|4|5|6|7|8|9;

export class CooldownManager {
  private lastUsed: Map<ToolId, number> = new Map(); // toolId -> day index

  constructor() {}

  /**
   * Checks if a tool can be used on the current day.
   */
  canUse(toolId: ToolId, currentDay: number): boolean {
    const lastDayUsed = this.lastUsed.get(toolId);
    if (lastDayUsed === undefined) return true;

    const tool = DIVINE_TOOLS.find(t => t.id === toolId);
    if (!tool) return false;

    return currentDay - lastDayUsed >= tool.cooldownDays;
  }

  /**
   * Records that a tool was used on the current day.
   */
  use(toolId: ToolId, currentDay: number): void {
    this.lastUsed.set(toolId, currentDay);
  }

  /**
   * Gets a list of available tools with the given polarity.
   */
  getAvailable(polarity: 'good' | 'evil', currentDay: number): ToolId[] {
    return DIVINE_TOOLS
      .filter(t => t.polarity === polarity && this.canUse(t.id as ToolId, currentDay))
      .map(t => t.id as ToolId);
  }

  /**
   * Serialize last used timestamps for disk persistence.
   */
  serialize(): Record<number, number> {
    const data: Record<number, number> = {};
    this.lastUsed.forEach((day, toolId) => {
      data[toolId] = day;
    });
    return data;
  }

  /**
   * Load last used timestamps from serialized data.
   */
  deserialize(data: Record<number, number>): void {
    this.lastUsed.clear();
    if (!data) return;
    Object.entries(data).forEach(([toolIdStr, day]) => {
      const toolId = parseInt(toolIdStr) as ToolId;
      this.lastUsed.set(toolId, day);
    });
  }
}
