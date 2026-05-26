import type { IPlugin, IEngine, GameEvent, GameState } from '../engine/types';

export class GoldPlugin implements IPlugin {
  id = 'gold';
  stateKeys = ['gold'] as (keyof GameState)[];
  defaultState = { gold: 0 };

  private engine!: IEngine;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    engine.on('enemy_death', (event: GameEvent<{ goldReward: number }>) => {
      const state = engine.state;
      const goldRate = engine.getModifier('gold_rate');
      const reward = Math.floor(event.payload.goldReward * goldRate);
      const newGold = state.gold + reward;
      engine.updateState({ gold: newGold });
      engine.emit('gold_changed', { gold: newGold, delta: reward });
    });

    engine.on('state_sync', (event: GameEvent<{ savedState: GameState; offlineGold: number } | null>) => {
      if (event.payload?.savedState) {
        const { offlineGold } = event.payload;
        // gold field is already auto-restored by engine; just add offline bonus
        if (offlineGold > 0) {
          engine.updateState({ gold: engine.state.gold + offlineGold });
          engine.emit('offline_progress', { goldEarned: offlineGold });
        }
      }
    });

    engine.on('overclock', () => {
      engine.updateState({ gold: 0 });
    });
  }

  spend(amount: number): boolean {
    const state = this.engine.state;
    if (state.gold < amount) return false;
    const newGold = state.gold - amount;
    this.engine.updateState({ gold: newGold });
    this.engine.emit('gold_changed', { gold: newGold, delta: -amount });
    return true;
  }

  canAfford(amount: number): boolean {
    return this.engine.state.gold >= amount;
  }
}
