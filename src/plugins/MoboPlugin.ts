import type { IPlugin, IEngine, GameState } from '../engine/types';
import type { GoldPlugin } from './GoldPlugin';
import { MOBO_TIERS, type MoboTierDef } from '../config/game.config';

export type { MoboTierDef };
export { MOBO_TIERS };

export class MoboPlugin implements IPlugin {
  id = 'mobo';
  dependencies = ['gold', 'items'];
  stateKeys = ['motherboardTier', 'ramSlots', 'expansionSlots'] as (keyof GameState)[];
  defaultState = { motherboardTier: 0, ramSlots: 1, expansionSlots: 1 };

  private engine!: IEngine;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;
  }

  getCurrentTierDef(): MoboTierDef {
    return MOBO_TIERS[this.engine.state.motherboardTier ?? 0] ?? MOBO_TIERS[0];
  }

  getNextTierDef(): MoboTierDef | null {
    const tier = this.engine.state.motherboardTier ?? 0;
    return MOBO_TIERS[tier + 1] ?? null;
  }

  upgrade(): boolean {
    const next = this.getNextTierDef();
    if (!next) return false;

    // Check if player has enough diamonds
    const diamonds = this.engine.state.diamonds ?? 0;
    if (diamonds < next.diamondCost) return false;

    // Check and spend gold
    const goldPlugin = this.engine.getPlugin<GoldPlugin>('gold');
    if (!goldPlugin?.spend(next.goldCost)) return false;

    // Spend diamonds
    if (next.diamondCost > 0) {
      this.engine.updateState({ diamonds: diamonds - next.diamondCost });
    }

    // Expand equippedItems arrays for new slot counts
    const equipped = { ...(this.engine.state.equippedItems) };
    while ((equipped.RAM?.length ?? 0) < next.ramSlots) {
      equipped.RAM = [...(equipped.RAM ?? [null]), null];
    }
    while ((equipped.EXPANSION?.length ?? 0) < next.expansionSlots) {
      equipped.EXPANSION = [...(equipped.EXPANSION ?? [null]), null];
    }

    this.engine.updateState({
      motherboardTier: next.tier,
      ramSlots: next.ramSlots,
      expansionSlots: next.expansionSlots,
      equippedItems: equipped,
    });

    this.engine.emit('mobo_upgrade', { tier: next.tier, ramSlots: next.ramSlots, expansionSlots: next.expansionSlots });
    this.engine.emit('save_requested', {});
    return true;
  }

  cleanup(): void {}
}
