import type { IPlugin, IEngine, GameEvent, GameState, Player } from '../engine/types';
import type { AuthPlugin } from './AuthPlugin';

const SCHEMA_VERSION = 1;

export class SupabasePlugin implements IPlugin {
  id = 'supabase';
  dependencies = ['auth'];
  roles = ['persistence'] as const;

  private engine!: IEngine;
  private userId: string | null = null;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    engine.storage.registerTable(this.id, { table: 'player_saves', userScoped: true });
    engine.storage.registerTable('leaderboard', { table: 'leaderboard', userScoped: true });

    engine.on('auth_success', async (event: GameEvent<Player>) => {
      this.userId = event.payload.id;
      await this.loadSave();
    });

    engine.on('auth_signout', () => {
      this.userId = null;
    });

    engine.on('save_requested', async () => {
      await this.writeSave();
    });

    const authPlugin = engine.getPlugin<AuthPlugin>('auth');
    const existingPlayer = authPlugin?.getPlayer();
    if (existingPlayer) {
      this.userId = existingPlayer.id;
      void this.loadSave();
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
    if (elapsed < 5) return 0;

    const components = savedState.components ?? {};
    let idleDps = 0;
    for (const comp of Object.values(components)) {
      if (comp.level > 0) {
        idleDps += comp.baseDps * comp.level;
      }
    }

    const maxOfflineSecs = 8 * 3600;
    const cappedElapsed = Math.min(elapsed, maxOfflineSecs);
    return Math.floor(idleDps * cappedElapsed * 0.5);
  }

  private async writeSave(): Promise<void> {
    if (!this.userId) return;

    const state = this.engine.state;
    const authPlugin = this.engine.getPlugin<AuthPlugin>('auth');
    const player = authPlugin?.getPlayer();

    const { error } = await this.engine.storage.save('player_saves', {
      user_id: this.userId,
      save_data: state,
      schema_version: SCHEMA_VERSION,
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
