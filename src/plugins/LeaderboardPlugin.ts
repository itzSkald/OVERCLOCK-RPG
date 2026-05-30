// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard Plugin
//
// Handles leaderboard display and online presence tracking.
// Uses the modular database layer for all database operations.
// ─────────────────────────────────────────────────────────────────────────────

import type { IPlugin, IEngine, Player } from '../engine/types';
import { createPresenceChannel, type PresenceState, type RealtimeSubscription } from '../lib/db';

export interface LeaderboardEntry {
  user_id: string;
  handle: string;
  highest_stage: number;
  overclock_count: number;
  total_damage: number;
  updated_at: string;
  isOnline?: boolean;
}

export class LeaderboardPlugin implements IPlugin {
  id = 'leaderboard';
  dependencies = ['auth'];

  private engine!: IEngine;
  private entries: LeaderboardEntry[] = [];
  private onlineUserIds = new Set<string>();
  private onlineCount = 0;
  private presenceSubscription: RealtimeSubscription | null = null;
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
    console.log('[v0] LeaderboardPlugin.fetchLeaderboard() called');
    const { data, error } = await this.engine.storage.loadMany<LeaderboardEntry>(
      'leaderboard',
      {},
      'user_id, handle, highest_stage, overclock_count, total_damage, updated_at'
    );
    console.log('[v0] Leaderboard fetch result:', { dataLength: data?.length, error });
    if (error) {
      console.error('[v0] Leaderboard fetch error:', error);
    }
    if (data) {
      this.entries = data
        .sort((a, b) => b.highest_stage - a.highest_stage || b.total_damage - a.total_damage)
        .map(e => ({ ...e, isOnline: this.onlineUserIds.has(e.user_id) }));
      console.log('[v0] Leaderboard entries set:', this.entries.length);
      this.notify();
    }
  }

  private joinPresence(): void {
    if (this.presenceSubscription || !this.userId) return;

    this.presenceSubscription = createPresenceChannel(
      this.userId,
      { user_id: this.userId, handle: this.playerHandle },
      {
        onSync: (state) => this.syncPresence(state),
      }
    );
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
    if (this.presenceSubscription) {
      this.presenceSubscription.unsubscribe();
      this.presenceSubscription = null;
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
