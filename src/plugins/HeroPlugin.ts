import type { IPlugin, IEngine, GameState, SkillId } from '../engine/types';
import { 
  HERO_CONFIG, 
  SKILL_UPGRADE_CONFIG, 
  type HeroUpgradeDef, 
  type SkillUpgradeDef,
  getHeroUpgradeCost,
  getHeroUpgradeBulkCost,
  getHeroUpgradeValue,
  getSkillUpgradeCost,
  getSkillUpgradeBulkCost,
  getSkillEffectivenessMultiplier,
} from '../config/game.config';

export class HeroPlugin implements IPlugin {
  id = 'hero';
  dependencies = ['gold'];
  stateKeys = ['heroUpgrades', 'skillUpgrades'] as (keyof GameState)[];
  defaultState = {
    heroUpgrades: {} as Record<string, number>,
    skillUpgrades: {} as Record<SkillId, number>,
  };

  private engine!: IEngine;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;
    this.applyAllModifiers();
  }

  /**
   * Get the cost for the next level of a hero upgrade
   */
  getUpgradeCost(upgradeId: string): number {
    const upgrade = HERO_CONFIG.upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return Infinity;
    const level = this.getHeroUpgradeLevel(upgradeId);
    if (level >= upgrade.maxLevel) return Infinity;
    return getHeroUpgradeCost(upgrade, level);
  }

  /**
   * Get bulk cost for purchasing multiple levels
   */
  getBulkCost(upgradeId: string, count: number): number {
    const upgrade = HERO_CONFIG.upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return Infinity;
    const level = this.getHeroUpgradeLevel(upgradeId);
    const maxPurchasable = Math.min(count, upgrade.maxLevel - level);
    if (maxPurchasable <= 0) return Infinity;
    return getHeroUpgradeBulkCost(upgrade, level, maxPurchasable);
  }

  /**
   * Get the current level of a hero upgrade
   */
  getHeroUpgradeLevel(upgradeId: string): number {
    return this.engine.state.heroUpgrades[upgradeId] ?? 0;
  }

  /**
   * Purchase a hero upgrade level (or multiple levels)
   */
  purchaseHeroUpgrade(upgradeId: string, count: number = 1): boolean {
    const upgrade = HERO_CONFIG.upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return false;

    const level = this.getHeroUpgradeLevel(upgradeId);
    const maxPurchasable = Math.min(count, upgrade.maxLevel - level);
    if (maxPurchasable <= 0) return false;

    const cost = getHeroUpgradeBulkCost(upgrade, level, maxPurchasable);
    if (this.engine.state.gold < cost) return false;

    // Deduct gold and increase level
    const newLevel = level + maxPurchasable;
    const newHeroUpgrades = {
      ...this.engine.state.heroUpgrades,
      [upgradeId]: newLevel,
    };

    this.engine.updateState({
      gold: this.engine.state.gold - cost,
      heroUpgrades: newHeroUpgrades,
    });

    // Update modifiers
    this.updateHeroModifier(upgrade, newLevel);
    this.engine.emit('hero_upgrade', { upgradeId, newLevel, levelsPurchased: maxPurchasable });

    return true;
  }

  /**
   * Get the cost for the next level of a skill upgrade
   */
  getSkillCost(skillId: SkillId): number {
    const upgrade = SKILL_UPGRADE_CONFIG.upgrades.find(u => u.skillId === skillId);
    if (!upgrade) return Infinity;
    const level = this.getSkillUpgradeLevel(skillId);
    if (level >= upgrade.maxLevel) return Infinity;
    return getSkillUpgradeCost(upgrade, level);
  }

  /**
   * Get bulk cost for purchasing multiple skill levels
   */
  getSkillBulkCost(skillId: SkillId, count: number): number {
    const upgrade = SKILL_UPGRADE_CONFIG.upgrades.find(u => u.skillId === skillId);
    if (!upgrade) return Infinity;
    const level = this.getSkillUpgradeLevel(skillId);
    const maxPurchasable = Math.min(count, upgrade.maxLevel - level);
    if (maxPurchasable <= 0) return Infinity;
    return getSkillUpgradeBulkCost(upgrade, level, maxPurchasable);
  }

  /**
   * Get the current level of a skill upgrade
   */
  getSkillUpgradeLevel(skillId: SkillId): number {
    return this.engine.state.skillUpgrades[skillId] ?? 0;
  }

  /**
   * Get the effectiveness multiplier for a skill (1 + level * effectPerLevel)
   */
  getSkillEffectiveness(skillId: SkillId): number {
    const upgrade = SKILL_UPGRADE_CONFIG.upgrades.find(u => u.skillId === skillId);
    if (!upgrade) return 1;
    const level = this.getSkillUpgradeLevel(skillId);
    return getSkillEffectivenessMultiplier(upgrade, level);
  }

  /**
   * Purchase a skill upgrade level (or multiple levels)
   */
  purchaseSkillUpgrade(skillId: SkillId, count: number = 1): boolean {
    const upgrade = SKILL_UPGRADE_CONFIG.upgrades.find(u => u.skillId === skillId);
    if (!upgrade) return false;

    const level = this.getSkillUpgradeLevel(skillId);
    const maxPurchasable = Math.min(count, upgrade.maxLevel - level);
    if (maxPurchasable <= 0) return false;

    const cost = getSkillUpgradeBulkCost(upgrade, level, maxPurchasable);
    if (this.engine.state.gold < cost) return false;

    // Deduct gold and increase level
    const newLevel = level + maxPurchasable;
    const newSkillUpgrades = {
      ...this.engine.state.skillUpgrades,
      [skillId]: newLevel,
    };

    this.engine.updateState({
      gold: this.engine.state.gold - cost,
      skillUpgrades: newSkillUpgrades,
    });

    this.engine.emit('skill_upgrade', { skillId, newLevel, levelsPurchased: maxPurchasable });

    return true;
  }

  /**
   * Get all hero upgrades with their current state
   */
  getHeroUpgrades(): (HeroUpgradeDef & { level: number; cost: number; canAfford: boolean; totalValue: number })[] {
    const gold = this.engine.state.gold;
    return HERO_CONFIG.upgrades.map(upgrade => {
      const level = this.getHeroUpgradeLevel(upgrade.id);
      const cost = level >= upgrade.maxLevel ? Infinity : getHeroUpgradeCost(upgrade, level);
      return {
        ...upgrade,
        level,
        cost,
        canAfford: gold >= cost && level < upgrade.maxLevel,
        totalValue: getHeroUpgradeValue(upgrade, level),
      };
    });
  }

  /**
   * Get all skill upgrades with their current state
   */
  getSkillUpgrades(): (SkillUpgradeDef & { level: number; cost: number; canAfford: boolean; effectiveness: number })[] {
    const gold = this.engine.state.gold;
    return SKILL_UPGRADE_CONFIG.upgrades.map(upgrade => {
      const level = this.getSkillUpgradeLevel(upgrade.skillId);
      const cost = level >= upgrade.maxLevel ? Infinity : getSkillUpgradeCost(upgrade, level);
      const effectiveness = getSkillEffectivenessMultiplier(upgrade, level);
      return {
        ...upgrade,
        level,
        cost,
        canAfford: gold >= cost && level < upgrade.maxLevel,
        effectiveness,
      };
    });
  }

  /**
   * Apply all hero modifiers based on current state
   */
  private applyAllModifiers(): void {
    for (const upgrade of HERO_CONFIG.upgrades) {
      const level = this.getHeroUpgradeLevel(upgrade.id);
      if (level > 0) {
        this.updateHeroModifier(upgrade, level);
      }
    }
  }

  /**
   * Update a single hero modifier
   */
  private updateHeroModifier(upgrade: HeroUpgradeDef, level: number): void {
    // Remove existing modifier first
    this.engine.removeModifiers(`hero_${upgrade.id}`);
    
    if (level > 0) {
      this.engine.addModifier(`hero_${upgrade.id}`, {
        type: upgrade.modifierType,
        value: getHeroUpgradeValue(upgrade, level),
        isMultiplier: upgrade.isMultiplier,
      });
    }
  }

  /**
   * Get total tap power from hero upgrades
   */
  getTotalTapPower(): number {
    const tapPowerUpgrade = HERO_CONFIG.upgrades.find(u => u.id === 'hero_tap_power');
    if (!tapPowerUpgrade) return 0;
    const level = this.getHeroUpgradeLevel('hero_tap_power');
    return getHeroUpgradeValue(tapPowerUpgrade, level);
  }

  /**
   * Get max purchasable levels with current gold
   */
  getMaxPurchasable(upgradeId: string): number {
    const upgrade = HERO_CONFIG.upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return 0;
    
    const level = this.getHeroUpgradeLevel(upgradeId);
    let gold = this.engine.state.gold;
    let count = 0;
    
    for (let i = level; i < upgrade.maxLevel && gold >= getHeroUpgradeCost(upgrade, i); i++) {
      gold -= getHeroUpgradeCost(upgrade, i);
      count++;
    }
    
    return count;
  }

  cleanup(): void {
    for (const upgrade of HERO_CONFIG.upgrades) {
      this.engine.removeModifiers(`hero_${upgrade.id}`);
    }
  }
}
