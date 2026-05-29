import type { IPlugin, IEngine, GameEvent, GameState, Player } from '../engine/types';
import type { AuthPlugin } from './AuthPlugin';
import { SAVE_CONFIG } from '../config/game.config';

export class SupabasePlugin implements IPlugin {
  id = 'supabase';
  dependencies = ['auth'];
  roles = ['persistence'] as const;

  private engine!: IEngine;
  private userId: string | null = null;
  private hasLoadedSave = false;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    engine.storage.registerTable(this.id, { table: 'player_saves', userScoped: true });
    engine.storage.registerTable('leaderboard', { table: 'leaderboard', userScoped: true });

    engine.on('auth_success', async (event: GameEvent<Player>) => {
      // Only load save once per session to prevent state resets on token refresh
      // or visibility change. If userId changes, it's a different user - reload.
      if (this.hasLoadedSave && this.userId === event.payload.id) {
        return;
      }
      this.userId = event.payload.id;
      await this.loadSave();
      this.hasLoadedSave = true;
    });

    engine.on('auth_signout', () => {
      this.userId = null;
      this.hasLoadedSave = false;
    });

    engine.on('save_requested', async () => {
      await this.writeSave();
    });

    const authPlugin = engine.getPlugin<AuthPlugin>('auth');
    const existingPlayer = authPlugin?.getPlayer();
    if (existingPlayer && !this.hasLoadedSave) {
      this.userId = existingPlayer.id;
      void this.loadSave().then(() => {
        this.hasLoadedSave = true;
      });
    }
  }

  private async loadSave(): Promise<void> {
    if (!this.userId) return;

    try {
      const { data, error } = await this.engine.storage.load<{ save_data: GameState; schema_version: number }>(
        'player_saves',
        { user_id: this.userId },
        'save_data, schema_version'
      );

      if (error || !data) {
        this.engine.emit('state_sync', null);
        return;
      }

      const savedState = data.save_data as GameState;
      this.autoRestoreState(savedState);

      const offlineGold = this.calculateOfflineProgress(savedState);
      this.engine.emit('state_sync', {
        savedState,
        offlineGold,
        schemaVersion: data.schema_version,
      });
    } catch {
      this.engine.emit('state_sync', null);
    }
  }

  private autoRestoreState(savedState: GameState): void {
    const stateKeys = this.engine.getPluginStateKeys();
    const defaults = this.engine.getPluginDefaults();
    const restored: Partial<GameState> = {};

    for (const key of stateKeys) {
      const savedVal = (savedState as Record<string, unknown>)[key];
      if (savedVal !== undefined) {
        (restored as Record<string, unknown>)[key] = savedVal;
      } else if (key in defaults) {
        (restored as Record<string, unknown>)[key] = (defaults as Record<string, unknown>)[key];
      }
    }

    if (Object.keys(restored).length > 0) {
      this.engine.updateState(restored);
    }
  }

  private calculateOfflineProgress(savedState: GameState): number {
    if (!savedState?.lastTickTime) return 0;

    const elapsed = (Date.now() - savedState.lastTickTime) / 1000;
    if (elapsed < SAVE_CONFIG.offlineMinSeconds) return 0;

    const components = savedState.components ?? {};
    let idleDps = 0;
    for (const comp of Object.values(components)) {
      if (comp.level > 0) idleDps += comp.baseDps * comp.level;
    }

    const cappedElapsed = Math.min(elapsed, SAVE_CONFIG.offlineCapSeconds);
    return Math.floor(idleDps * cappedElapsed * SAVE_CONFIG.offlineGoldMultiplier);
  }

  private async writeSave(): Promise<void> {
    if (!this.userId) return;

    const state = this.engine.state;
    const authPlugin = this.engine.getPlugin<AuthPlugin>('auth');
    const player = authPlugin?.getPlayer();

    const { error } = await this.engine.storage.save('player_saves', {
      user_id: this.userId,
      save_data: state,
      schema_version: SAVE_CONFIG.schemaVersion,
      updated_at: new Date().toISOString(),
    }, 'user_id');

    if (!error) {
      await this.updateLeaderboard(state, player?.handle ?? '');
      this.engine.emit('save_complete', {});
    }
  }

  private async updateLeaderboard(state: GameState, handle: string): Promise<void> {
    if (!this.userId) return;
    await this.engine.storage.save('leaderboard', {
      user_id: this.userId,
      handle,
      highest_stage: state.highestStage ?? state.stage,
      overclock_count: state.overclockCount,
      total_damage: state.totalDamageDealt,
      updated_at: new Date().toISOString(),
    }, 'user_id');
  }

  cleanup(): void {}
}
