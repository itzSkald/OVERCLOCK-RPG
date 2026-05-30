import type { IPlugin, IEngine, GameState, OverclockUpgrade } from '../engine/types';
import {
  OVERCLOCK_PERKS,
  OVERCLOCK_CONFIG,
  type PerkBranch,
  type OverclockPerkDef,
} from '../config/game.config';

export type { PerkBranch, OverclockPerkDef };
export { OVERCLOCK_PERKS };

export const BRANCH_COLORS = OVERCLOCK_CONFIG.branchColors;
export const BRANCH_SKILL_UNLOCKS = OVERCLOCK_CONFIG.branchSkillUnlocks;
export const TIER_NAMES = OVERCLOCK_CONFIG.tierNames;

export function calculateOverclockGain(highestStage: number, tier: number): number {
  if (highestStage < OVERCLOCK_CONFIG.minStageToOverclock) return 0;
  // Base OCT: 1 point per stagesPerOCT stages reached
  const base = Math.floor(highestStage / OVERCLOCK_CONFIG.stagesPerOCT);
  const milestoneBonus = OVERCLOCK_CONFIG.milestones
    .filter(m => highestStage >= m.stage)
    .reduce((sum, m) => sum + m.bonus, 0);
  const tierMultiplier = 1 + tier * OVERCLOCK_CONFIG.tierMultiplierPerTier;
  return Math.max(1, Math.floor((base + milestoneBonus) * tierMultiplier));
}

export function calculateTier(totalOverclocks: number): number {
  return Math.min(Math.floor(totalOverclocks / OVERCLOCK_CONFIG.runsPerTier), OVERCLOCK_CONFIG.maxTier);
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
