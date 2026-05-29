import type { IPlugin, IEngine, GameState } from '../engine/types';
import { SAVE_CONFIG } from '../config/game.config';

export class SavePlugin implements IPlugin {
  id = 'save';
  dependencies = ['supabase'];
  stateKeys = ['totalDamageDealt', 'overclockCount', 'lastSaveTime'] as (keyof GameState)[];
  defaultState = { totalDamageDealt: 0, overclockCount: 0 };

  private engine!: IEngine;
  private saveTimer: ReturnType<typeof setInterval> | null = null;
  private boundBeforeUnload!: () => void;
  private boundVisibilityChange!: () => void;

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

    // Save when tab becomes hidden to ensure progress is persisted
    // This prevents data loss if the user closes the browser from the hidden tab
    this.boundVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        engine.emit('save_requested', {});
      }
      // Note: We intentionally do NOT reload state when visibility becomes 'visible'
      // to prevent resetting user progress when they switch back to this tab
    };
    document.addEventListener('visibilitychange', this.boundVisibilityChange);
  }

  private startAutoSave(): void {
    this.stopAutoSave();
    this.saveTimer = setInterval(() => {
      this.engine.emit('save_requested', {});
    }, SAVE_CONFIG.autoSaveIntervalMs);
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
    document.removeEventListener('visibilitychange', this.boundVisibilityChange);
  }
}
