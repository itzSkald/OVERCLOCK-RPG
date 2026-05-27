import type { IPlugin, IEngine, GameState, OverclockUpgrade, SkillId } from '../engine/types';

export type PerkBranch = 'VOLTAGE' | 'SIGNAL' | 'THERMAL' | 'ENTROPY' | 'QUANTUM';

export interface OverclockPerkDef {
  id: string;
  name: string;
  flavor: string;
  description: string;
  branch: PerkBranch;
  branchRank: number;
  maxLevel: number;
  costPerLevel: number;
  modifierType: 'tap_damage' | 'idle_dps' | 'gold_rate' | 'crit_chance' | 'crit_multiplier';
  valuePerLevel: number;
  isMultiplier: boolean;
  color: string;
  requiresTier?: number;
}

export const OVERCLOCK_PERKS: OverclockPerkDef[] = [
  // ── VOLTAGE — raw damage, tap power, crit burst ──────────────────────────
  {
    id: 'voltage_spike',
    name: 'VOLTAGE_SPIKE',
    flavor: 'Raw current surges through every keystroke.',
    description: '+35% tap damage per level',
    branch: 'VOLTAGE', branchRank: 1, maxLevel: 12, costPerLevel: 1,
    modifierType: 'tap_damage', valuePerLevel: 0.35, isMultiplier: true,
    color: '#00f5ff',
  },
  {
    id: 'zero_day',
    name: 'ZERO_DAY',
    flavor: 'Exploit before the patch drops. Strike first.',
    description: '+6% crit chance per level',
    branch: 'VOLTAGE', branchRank: 2, maxLevel: 6, costPerLevel: 2,
    modifierType: 'crit_chance', valuePerLevel: 0.06, isMultiplier: false,
    color: '#00d4e8',
  },
  {
    id: 'exploit_chain',
    name: 'EXPLOIT_CHAIN',
    flavor: 'Cascade vulnerabilities. Each hit opens the next.',
    description: '+60% crit damage per level',
    branch: 'VOLTAGE', branchRank: 3, maxLevel: 5, costPerLevel: 3,
    modifierType: 'crit_multiplier', valuePerLevel: 0.60, isMultiplier: false,
    color: '#00b8cc', requiresTier: 2,
  },
  {
    id: 'voltage_overdrive',
    name: 'VOLTAGE_OVERDRIVE',
    flavor: 'Fuse the limiter. The cap is gone. Pay the cost.',
    description: '+80% tap damage per level',
    branch: 'VOLTAGE', branchRank: 4, maxLevel: 6, costPerLevel: 6,
    modifierType: 'tap_damage', valuePerLevel: 0.80, isMultiplier: true,
    color: '#00a0bc', requiresTier: 9,
  },
  {
    id: 'arc_singularity',
    name: 'ARC_SINGULARITY',
    flavor: 'The point where current becomes consciousness.',
    description: '+12% crit chance per level',
    branch: 'VOLTAGE', branchRank: 5, maxLevel: 4, costPerLevel: 10,
    modifierType: 'crit_chance', valuePerLevel: 0.12, isMultiplier: false,
    color: '#0088aa', requiresTier: 12,
  },

  // ── SIGNAL — gold economy, run acceleration ──────────────────────────────
  {
    id: 'ghost_protocol',
    name: 'GHOST_PROTOCOL',
    flavor: 'Route gold through untraceable channels.',
    description: '+25% gold rate per level',
    branch: 'SIGNAL', branchRank: 1, maxLevel: 12, costPerLevel: 1,
    modifierType: 'gold_rate', valuePerLevel: 0.25, isMultiplier: true,
    color: '#ffaa00',
  },
  {
    id: 'dead_drop',
    name: 'DEAD_DROP',
    flavor: 'Stashed cache. Every run starts with a head start.',
    description: '+40% gold rate (stacks hard)',
    branch: 'SIGNAL', branchRank: 2, maxLevel: 5, costPerLevel: 2,
    modifierType: 'gold_rate', valuePerLevel: 0.40, isMultiplier: true,
    color: '#e89500', requiresTier: 1,
  },
  {
    id: 'data_launder',
    name: 'DATA_LAUNDER',
    flavor: 'Clean dirty signals into pure throughput.',
    description: '+50% gold rate (endgame tier)',
    branch: 'SIGNAL', branchRank: 3, maxLevel: 4, costPerLevel: 4,
    modifierType: 'gold_rate', valuePerLevel: 0.50, isMultiplier: true,
    color: '#cc8400', requiresTier: 3,
  },
  {
    id: 'signal_fracture',
    name: 'SIGNAL_FRACTURE',
    flavor: 'Shatter the carrier wave. Wealth floods through the cracks.',
    description: '+70% gold rate per level',
    branch: 'SIGNAL', branchRank: 4, maxLevel: 5, costPerLevel: 7,
    modifierType: 'gold_rate', valuePerLevel: 0.70, isMultiplier: true,
    color: '#aa7000', requiresTier: 9,
  },
  {
    id: 'dark_signal',
    name: 'DARK_SIGNAL',
    flavor: 'Transmissions from a market that does not officially exist.',
    description: '+100% gold rate per level',
    branch: 'SIGNAL', branchRank: 5, maxLevel: 3, costPerLevel: 12,
    modifierType: 'gold_rate', valuePerLevel: 1.0, isMultiplier: true,
    color: '#885c00', requiresTier: 12,
  },

  // ── THERMAL — sustained idle DPS ─────────────────────────────────────────
  {
    id: 'phantom_thread',
    name: 'PHANTOM_THREAD',
    flavor: 'Silent processes eating cycles in the dark.',
    description: '+30% idle DPS per level',
    branch: 'THERMAL', branchRank: 1, maxLevel: 12, costPerLevel: 1,
    modifierType: 'idle_dps', valuePerLevel: 0.30, isMultiplier: true,
    color: '#39ff14',
  },
  {
    id: 'thermal_runaway',
    name: 'THERMAL_RUNAWAY',
    flavor: 'Controlled meltdown. Sustained burn into oblivion.',
    description: '+45% idle DPS per level',
    branch: 'THERMAL', branchRank: 2, maxLevel: 6, costPerLevel: 2,
    modifierType: 'idle_dps', valuePerLevel: 0.45, isMultiplier: true,
    color: '#29dd09', requiresTier: 1,
  },
  {
    id: 'neural_overclock',
    name: 'NEURAL_OVERCLOCK',
    flavor: 'Fry your synapses. CPU and flesh become one.',
    description: '+60% idle DPS — peak thermal output',
    branch: 'THERMAL', branchRank: 3, maxLevel: 8, costPerLevel: 4,
    modifierType: 'idle_dps', valuePerLevel: 0.60, isMultiplier: true,
    color: '#19bb00', requiresTier: 3,
  },
  {
    id: 'absolute_zero',
    name: 'ABSOLUTE_ZERO',
    flavor: 'Cool the silicon to the void. Nothing resists.',
    description: '+80% idle DPS — deep endgame',
    branch: 'THERMAL', branchRank: 4, maxLevel: 5, costPerLevel: 6,
    modifierType: 'idle_dps', valuePerLevel: 0.80, isMultiplier: true,
    color: '#0d9900', requiresTier: 6,
  },
  {
    id: 'thermal_apotheosis',
    name: 'THERMAL_APOTHEOSIS',
    flavor: 'The machine transcends heat. It becomes the heat.',
    description: '+120% idle DPS per level',
    branch: 'THERMAL', branchRank: 5, maxLevel: 4, costPerLevel: 10,
    modifierType: 'idle_dps', valuePerLevel: 1.20, isMultiplier: true,
    color: '#0a7700', requiresTier: 10,
  },
  {
    id: 'cascade_burn',
    name: 'CASCADE_BURN',
    flavor: 'One process ignites the next. Infinite recursion of destruction.',
    description: '+150% idle DPS — final thermal ascension',
    branch: 'THERMAL', branchRank: 6, maxLevel: 3, costPerLevel: 15,
    modifierType: 'idle_dps', valuePerLevel: 1.50, isMultiplier: true,
    color: '#075500', requiresTier: 13,
  },

  // ── ENTROPY — boss & elite power, late-game scaling ──────────────────────
  {
    id: 'exploit_entropy',
    name: 'EXPLOIT_ENTROPY',
    flavor: 'Disorder is your weapon. Chaos scales with chaos.',
    description: '+40% tap damage per level',
    branch: 'ENTROPY', branchRank: 1, maxLevel: 10, costPerLevel: 2,
    modifierType: 'tap_damage', valuePerLevel: 0.40, isMultiplier: true,
    color: '#ff4444', requiresTier: 2,
  },
  {
    id: 'void_shell',
    name: 'VOID_SHELL',
    flavor: 'Rip gold from the void between clock cycles.',
    description: '+55% gold rate per level',
    branch: 'ENTROPY', branchRank: 2, maxLevel: 7, costPerLevel: 3,
    modifierType: 'gold_rate', valuePerLevel: 0.55, isMultiplier: true,
    color: '#dd2222', requiresTier: 4,
  },
  {
    id: 'apex_protocol',
    name: 'APEX_PROTOCOL',
    flavor: 'Endpoint achieved. All limits dissolved.',
    description: '+90% tap damage per level',
    branch: 'ENTROPY', branchRank: 3, maxLevel: 4, costPerLevel: 8,
    modifierType: 'tap_damage', valuePerLevel: 0.90, isMultiplier: true,
    color: '#bb0000', requiresTier: 7,
  },
  {
    id: 'entropy_cascade',
    name: 'ENTROPY_CASCADE',
    flavor: 'The collapse becomes the weapon. Every ending is a strike.',
    description: '+110% tap damage per level',
    branch: 'ENTROPY', branchRank: 4, maxLevel: 4, costPerLevel: 11,
    modifierType: 'tap_damage', valuePerLevel: 1.10, isMultiplier: true,
    color: '#990000', requiresTier: 10,
  },
  {
    id: 'null_storm',
    name: 'NULL_STORM',
    flavor: 'Undefined behaviour at scale. The system deletes itself.',
    description: '+80% crit damage per level',
    branch: 'ENTROPY', branchRank: 5, maxLevel: 3, costPerLevel: 14,
    modifierType: 'crit_multiplier', valuePerLevel: 0.80, isMultiplier: false,
    color: '#770000', requiresTier: 13,
  },

  // ── QUANTUM — unlocked at tier 3, high-cost synergy perks ────────────────
  {
    id: 'superposition',
    name: 'SUPERPOSITION',
    flavor: 'Strike from two states at once. Both deal damage.',
    description: '+50% crit damage per level',
    branch: 'QUANTUM', branchRank: 1, maxLevel: 8, costPerLevel: 3,
    modifierType: 'crit_multiplier', valuePerLevel: 0.50, isMultiplier: false,
    color: '#cc44ff', requiresTier: 3,
  },
  {
    id: 'entanglement',
    name: 'ENTANGLEMENT',
    flavor: 'Linked states. What hits one hits all.',
    description: '+8% crit chance per level',
    branch: 'QUANTUM', branchRank: 2, maxLevel: 6, costPerLevel: 4,
    modifierType: 'crit_chance', valuePerLevel: 0.08, isMultiplier: false,
    color: '#aa22dd', requiresTier: 5,
  },
  {
    id: 'wave_collapse',
    name: 'WAVE_COLLAPSE',
    flavor: 'Probability collapses in your favour. Always.',
    description: '+70% tap damage — final quantum form',
    branch: 'QUANTUM', branchRank: 3, maxLevel: 5, costPerLevel: 7,
    modifierType: 'tap_damage', valuePerLevel: 0.70, isMultiplier: true,
    color: '#8800bb', requiresTier: 8,
  },
  {
    id: 'quantum_tunneling',
    name: 'QUANTUM_TUNNELING',
    flavor: 'Pass through every defence. Barriers are imaginary.',
    description: '+90% tap damage per level',
    branch: 'QUANTUM', branchRank: 4, maxLevel: 4, costPerLevel: 10,
    modifierType: 'tap_damage', valuePerLevel: 0.90, isMultiplier: true,
    color: '#660099', requiresTier: 10,
  },
  {
    id: 'decoherence',
    name: 'DECOHERENCE',
    flavor: 'Reality destabilises around your attacks. Physics yields.',
    description: '+15% crit chance per level — quantum apex',
    branch: 'QUANTUM', branchRank: 5, maxLevel: 3, costPerLevel: 15,
    modifierType: 'crit_chance', valuePerLevel: 0.15, isMultiplier: false,
    color: '#440077', requiresTier: 13,
  },
];

export const BRANCH_COLORS: Record<PerkBranch, string> = {
  VOLTAGE: '#00f5ff',
  SIGNAL:  '#ffaa00',
  THERMAL: '#39ff14',
  ENTROPY: '#ff4444',
  QUANTUM: '#cc44ff',
};

// Skill unlocked when branchRank >= requiresRank in the given branch
export const BRANCH_SKILL_UNLOCKS: Record<PerkBranch, {
  skillId: SkillId;
  requiresRank: number;
  name: string;
  description: string;
}> = {
  VOLTAGE: { skillId: 'static_discharge', requiresRank: 2, name: 'STATIC_DISCHARGE', description: 'Instant 500× tap burst' },
  SIGNAL:  { skillId: 'signal_jam',       requiresRank: 2, name: 'SIGNAL_JAM',       description: '×2 gold rate for 15s' },
  THERMAL: { skillId: 'meltdown',         requiresRank: 2, name: 'MELTDOWN',         description: '×20 idle DPS for 10s' },
  ENTROPY: { skillId: 'entropy_burst',    requiresRank: 2, name: 'ENTROPY_BURST',    description: '×3 tap + ×3 gold for 8s' },
  QUANTUM: { skillId: 'quantum_echo',     requiresRank: 2, name: 'QUANTUM_ECHO',     description: 'Instantly resets + fires all skills' },
};

export const TIER_NAMES: string[] = [
  'STOCK',            // 0  — first run
  'OVERCLOCKED',      // 1  — 3 OC
  'MODDED',           // 2  — 6 OC
  'JAILBROKEN',       // 3  — 9 OC
  'KERNEL HACKED',    // 4  — 12 OC
  'SILICON GHOST',    // 5  — 15 OC
  'QUANTUM FORK',     // 6  — 18 OC
  'DARK SILICON',     // 7  — 21 OC
  'PHANTOM LOOP',     // 8  — 24 OC
  'THE SINGULARITY',  // 9  — 27 OC
  'GHOST STATE',      // 10 — 30 OC
  'DARK KERNEL',      // 11 — 33 OC
  'SYSTEM FRACTURE',  // 12 — 36 OC
  'VOID ARCHITECT',   // 13 — 39 OC
  'THE ABSOLUTE',     // 14 — 42 OC
];

export function calculateOverclockGain(highestStage: number, tier: number): number {
  if (highestStage < 10) return 0;
  const base = Math.floor(Math.max(0, highestStage - 9) / 5) + 1;
  const milestoneBonus =
    (highestStage >= 5000 ? 500 : 0) +
    (highestStage >= 2500 ? 250 : 0) +
    (highestStage >= 1000 ? 100 : 0) +
    (highestStage >= 500  ? 50  : 0) +
    (highestStage >= 200  ? 20  : 0) +
    (highestStage >= 100  ? 10  : 0) +
    (highestStage >= 50   ? 5   : 0) +
    (highestStage >= 25   ? 2   : 0);
  const tierMultiplier = 1 + tier * 0.25;
  return Math.max(1, Math.floor((base + milestoneBonus) * tierMultiplier));
}

// 1 tier every 3 overclock runs, capped at tier 14
export function calculateTier(totalOverclocks: number): number {
  return Math.min(Math.floor(totalOverclocks / 3), TIER_NAMES.length - 1);
}

export function getOverclockPerkLevel(upgrades: Record<string, OverclockUpgrade>, perkId: string): number {
  return upgrades[perkId]?.level ?? 0;
}

export function isPerkUnlocked(
  perk: OverclockPerkDef,
  upgrades: Record<string, OverclockUpgrade>,
  tier: number,
): boolean {
  if (perk.requiresTier !== undefined && tier < perk.requiresTier) return false;
  if (perk.branchRank > 1) {
    const prev = OVERCLOCK_PERKS.find(
      p => p.branch === perk.branch && p.branchRank === perk.branchRank - 1,
    );
    if (prev && getOverclockPerkLevel(upgrades, prev.id) < 1) return false;
  }
  return true;
}

// Returns the highest branchRank purchased in a given branch (0 if none)
export function getBranchMaxRank(upgrades: Record<string, OverclockUpgrade>, branch: PerkBranch): number {
  const perks = OVERCLOCK_PERKS.filter(p => p.branch === branch);
  let max = 0;
  for (const p of perks) {
    if (getOverclockPerkLevel(upgrades, p.id) >= 1) max = Math.max(max, p.branchRank);
  }
  return max;
}

export function isBranchSkillUnlocked(upgrades: Record<string, OverclockUpgrade>, branch: PerkBranch): boolean {
  return getBranchMaxRank(upgrades, branch) >= BRANCH_SKILL_UNLOCKS[branch].requiresRank;
}

export class OverclockPlugin implements IPlugin {
  id = 'overclock';
  stateKeys = ['overclockCount', 'overclockTier', 'totalOverclocks', 'overclockUpgrades'] as (keyof GameState)[];
  defaultState = { overclockCount: 0, overclockTier: 0, totalOverclocks: 0, overclockUpgrades: {} };

  private engine!: IEngine;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;
    engine.on('state_sync', () => { this.applyAllModifiers(); });
  }

  canOverclock(): boolean {
    const state = this.engine.state;
    return calculateOverclockGain(state.highestStage ?? state.stage, state.overclockTier ?? 0) > 0;
  }

  getAvailableOCT(): number {
    return this.engine.state.overclockCount - this.getSpentOCT();
  }

  getSpentOCT(): number {
    const upgrades = this.engine.state.overclockUpgrades ?? {};
    let spent = 0;
    for (const perk of OVERCLOCK_PERKS) {
      spent += getOverclockPerkLevel(upgrades, perk.id) * perk.costPerLevel;
    }
    return spent;
  }

  canBuyPerk(perkId: string): boolean {
    const perk = OVERCLOCK_PERKS.find(p => p.id === perkId);
    if (!perk) return false;
    const state = this.engine.state;
    const upgrades = state.overclockUpgrades ?? {};
    const tier = state.overclockTier ?? 0;
    if (!isPerkUnlocked(perk, upgrades, tier)) return false;
    if (getOverclockPerkLevel(upgrades, perkId) >= perk.maxLevel) return false;
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
    const currentTier = state.overclockTier ?? 0;
    const gain = calculateOverclockGain(state.highestStage ?? state.stage, currentTier);
    if (gain <= 0) return;

    const newTotalOverclocks = (state.totalOverclocks ?? 0) + 1;
    const newTier = calculateTier(newTotalOverclocks);
    const newCount = state.overclockCount + gain;

    this.engine.updateState({
      overclockCount: newCount,
      overclockTier: newTier,
      totalOverclocks: newTotalOverclocks,
      stage: 1,
      highestStage: 1,
      gold: 0,
    });

    this.applyAllModifiers();
    this.engine.emit('overclock', { gain, totalOverclocks: newTotalOverclocks, newTier });
    this.engine.emit('save_requested', {});
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

  cleanup(): void {
    this.engine?.removeModifiers(this.id);
  }
}
