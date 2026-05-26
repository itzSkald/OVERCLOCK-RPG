import type { IPlugin, IEngine, GameState } from '../engine/types';

const SAVE_INTERVAL_MS = 30_000;

export class SavePlugin implements IPlugin {
  id = 'save';
  dependencies = ['supabase'];
  stateKeys = ['totalDamageDealt', 'overclockCount', 'lastSaveTime'] as (keyof GameState)[];
  defaultState = { totalDamageDealt: 0, overclockCount: 0 };

  private engine!: IEngine;
  private saveTimer: ReturnType<typeof setInterval> | null = null;
  private boundBeforeUnload!: () => void;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    engine.on('auth_success', () => {
      this.startAutoSave();
    });

    engine.on('auth_signout', () => {
      this.stopAutoSave();
    });

    this.boundBeforeUnload = () => engine.emit('save_requested', {});
    window.addEventListener('beforeunload', this.boundBeforeUnload);
  }

  private startAutoSave(): void {
    this.stopAutoSave();
    this.saveTimer = setInterval(() => {
      this.engine.emit('save_requested', {});
    }, SAVE_INTERVAL_MS);
  }

  private stopAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
  }

  saveNow(): void {
    this.engine.emit('save_requested', {});
  }

  cleanup(): void {
    this.stopAutoSave();
    window.removeEventListener('beforeunload', this.boundBeforeUnload);
  }
}
