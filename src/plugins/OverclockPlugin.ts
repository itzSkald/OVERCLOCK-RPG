import type { IPlugin, IEngine, GameState, OverclockUpgrade } from '../engine/types';

export interface OverclockPerkDef {
  id: string;
  name: string;
  flavor: string;
  description: string;
  maxLevel: number;
  costPerLevel: number;
  modifierType: 'tap_damage' | 'idle_dps' | 'gold_rate' | 'crit_chance' | 'crit_multiplier';
  valuePerLevel: number;
  isMultiplier: boolean;
  color: string;
}

export const OVERCLOCK_PERKS: OverclockPerkDef[] = [
  {
    id: 'neural_overclock',
    name: 'NEURAL_OVERCLOCK',
    flavor: 'Fry your synapses for pure throughput.',
    description: '+30% tap damage per level',
    maxLevel: 10,
    costPerLevel: 1,
    modifierType: 'tap_damage',
    valuePerLevel: 0.30,
    isMultiplier: true,
    color: '#00f5ff',
  },
  {
    id: 'phantom_thread',
    name: 'PHANTOM_THREAD',
    flavor: 'Silent processes eating cycles in the dark.',
    description: '+25% idle DPS per level',
    maxLevel: 10,
    costPerLevel: 1,
    modifierType: 'idle_dps',
    valuePerLevel: 0.25,
    isMultiplier: true,
    color: '#39ff14',
  },
  {
    id: 'ghost_protocol',
    name: 'GHOST_PROTOCOL',
    flavor: 'Route gold through untraceable channels.',
    description: '+20% gold rate per level',
    maxLevel: 8,
    costPerLevel: 2,
    modifierType: 'gold_rate',
    valuePerLevel: 0.20,
    isMultiplier: true,
    color: '#ffaa00',
  },
  {
    id: 'zero_day',
    name: 'ZERO_DAY',
    flavor: 'Exploit before the patch drops.',
    description: '+5% crit chance per level',
    maxLevel: 6,
    costPerLevel: 3,
    modifierType: 'crit_chance',
    valuePerLevel: 0.05,
    isMultiplier: false,
    color: '#ff0080',
  },
  {
    id: 'exploit_chain',
    name: 'EXPLOIT_CHAIN',
    flavor: 'Cascade vulnerabilities into devastation.',
    description: '+50% crit multiplier per level',
    maxLevel: 5,
    costPerLevel: 4,
    modifierType: 'crit_multiplier',
    valuePerLevel: 0.50,
    isMultiplier: false,
    color: '#ff6600',
  },
];

export function calculateOverclockGain(highestStage: number): number {
  if (highestStage < 5) return 0;
  return Math.floor(Math.pow((highestStage - 4) / 10, 0.5));
}

export function getOverclockPerkLevel(upgrades: Record<string, OverclockUpgrade>, perkId: string): number {
  return upgrades[perkId]?.level ?? 0;
}

export class OverclockPlugin implements IPlugin {
  id = 'overclock';
  stateKeys = ['overclockCount', 'overclockUpgrades'] as (keyof GameState)[];
  defaultState = { overclockCount: 0, overclockUpgrades: {} };

  private engine!: IEngine;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    engine.on('state_sync', () => {
      // State fields auto-restored by engine; apply modifiers from restored upgrades
      this.applyAllModifiers();
    });
  }

  canOverclock(): boolean {
    const state = this.engine.state;
    return calculateOverclockGain(state.highestStage ?? state.stage) > 0;
  }

  getAvailableOCT(): number {
    return this.engine.state.overclockCount - this.getSpentOCT();
  }

  getSpentOCT(): number {
    const upgrades = this.engine.state.overclockUpgrades ?? {};
    let spent = 0;
    for (const perk of OVERCLOCK_PERKS) {
      const level = getOverclockPerkLevel(upgrades, perk.id);
      spent += level * perk.costPerLevel;
    }
    return spent;
  }

  canBuyPerk(perkId: string): boolean {
    const perk = OVERCLOCK_PERKS.find(p => p.id === perkId);
    if (!perk) return false;
    const level = getOverclockPerkLevel(this.engine.state.overclockUpgrades ?? {}, perkId);
    if (level >= perk.maxLevel) return false;
    return this.getAvailableOCT() >= perk.costPerLevel;
  }

  buyPerk(perkId: string): boolean {
    if (!this.canBuyPerk(perkId)) return false;
    const upgrades = { ...(this.engine.state.overclockUpgrades ?? {}) };
    const current = upgrades[perkId]?.level ?? 0;
    upgrades[perkId] = { id: perkId, level: current + 1 };
    this.engine.updateState({ overclockUpgrades: upgrades });
    this.applyAllModifiers();
    return true;
  }

  perform(): void {
    const state = this.engine.state;
    const highestStage = state.highestStage ?? state.stage;
    const gain = calculateOverclockGain(highestStage);
    if (gain <= 0) return;

    const newCount = state.overclockCount + gain;
    this.engine.updateState({
      overclockCount: newCount,
      stage: 1,
      highestStage: 1,
      gold: 0,
    });

    this.applyAllModifiers();
    this.engine.emit('overclock', { gain, totalOverclocks: newCount });
  }

  private applyAllModifiers(): void {
    this.engine.removeModifiers('overclock');
    const upgrades = this.engine.state.overclockUpgrades ?? {};
    for (const perk of OVERCLOCK_PERKS) {
      const level = getOverclockPerkLevel(upgrades, perk.id);
      if (level <= 0) continue;
      const totalValue = perk.isMultiplier
        ? 1 + level * perk.valuePerLevel
        : level * perk.valuePerLevel;
      this.engine.addModifier('overclock', {
        type: perk.modifierType,
        value: totalValue,
        isMultiplier: perk.isMultiplier,
      });
    }
  }
}
