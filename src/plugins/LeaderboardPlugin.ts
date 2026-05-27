import type { IPlugin, IEngine, Player } from '../engine/types';
import { supabase } from '../lib/supabase';

export interface LeaderboardEntry {
  user_id: string;
  handle: string;
  highest_stage: number;
  overclock_count: number;
  total_damage: number;
  updated_at: string;
  isOnline?: boolean;
}

type PresenceState = Record<string, { user_id: string; handle: string }[]>;

export class LeaderboardPlugin implements IPlugin {
  id = 'leaderboard';
  dependencies = ['auth'];

  private engine!: IEngine;
  private entries: LeaderboardEntry[] = [];
  private onlineUserIds = new Set<string>();
  private onlineCount = 0;
  private presenceChannel: ReturnType<typeof supabase.channel> | null = null;
  private listeners = new Set<() => void>();
  private unsubAuth?: () => void;
  private unsubSignout?: () => void;
  private userId: string | null = null;
  private playerHandle = '';

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    this.unsubAuth = engine.on<Player>('auth_success', (event) => {
      this.userId = event.payload.id;
      this.playerHandle = event.payload.handle;
      void this.joinPresence();
      void this.fetchLeaderboard();
    });

    this.unsubSignout = engine.on('auth_signout', () => {
      this.userId = null;
      this.leavePresence();
    });

    const authPlugin = engine.getPlugin<IPlugin & { getPlayer(): Player | null }>('auth');
    const existingPlayer = authPlugin?.getPlayer();
    if (existingPlayer) {
      this.userId = existingPlayer.id;
      this.playerHandle = existingPlayer.handle;
      void this.joinPresence();
      void this.fetchLeaderboard();
    }
  }

  async fetchLeaderboard(): Promise<void> {
    const { data } = await this.engine.storage.loadMany<LeaderboardEntry>(
      'leaderboard',
      {},
      'user_id, handle, highest_stage, overclock_count, total_damage, updated_at'
    );
    if (data) {
      this.entries = data
        .sort((a, b) => b.highest_stage - a.highest_stage || b.total_damage - a.total_damage)
        .map(e => ({ ...e, isOnline: this.onlineUserIds.has(e.user_id) }));
      this.notify();
    }
  }

  private async joinPresence(): Promise<void> {
    if (this.presenceChannel || !this.userId) return;

    this.presenceChannel = supabase.channel('online_players', {
      config: { presence: { key: this.userId } },
    });

    this.presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = this.presenceChannel!.presenceState<{ user_id: string; handle: string }>();
        this.syncPresence(state as unknown as PresenceState);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.presenceChannel!.track({
            user_id: this.userId,
            handle: this.playerHandle,
          });
        }
      });
  }

  private syncPresence(state: PresenceState): void {
    this.onlineUserIds.clear();
    for (const presences of Object.values(state)) {
      for (const p of presences) {
        this.onlineUserIds.add(p.user_id);
      }
    }
    this.onlineCount = this.onlineUserIds.size;
    this.entries = this.entries.map(e => ({
      ...e,
      isOnline: this.onlineUserIds.has(e.user_id),
    }));
    this.notify();
  }

  private leavePresence(): void {
    if (this.presenceChannel) {
      supabase.removeChannel(this.presenceChannel);
      this.presenceChannel = null;
    }
    this.onlineUserIds.clear();
    this.onlineCount = 0;
    this.notify();
  }

  getEntries(): LeaderboardEntry[] {
    return this.entries;
  }

  getOnlineCount(): number {
    return this.onlineCount;
  }

  getCurrentUserId(): string | null {
    return this.userId;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  cleanup(): void {
    this.unsubAuth?.();
    this.unsubSignout?.();
    this.leavePresence();
    this.listeners.clear();
  }
}
