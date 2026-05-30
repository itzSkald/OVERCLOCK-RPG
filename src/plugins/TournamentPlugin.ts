import type { IPlugin, IEngine, GameState, GameEvent, Player } from '../engine/types';
import type { AuthPlugin } from './AuthPlugin';

export interface Tournament {
  id: string;
  name: string;
  template_name: string;
  bracket_number: number;
  starts_at: string;
  ends_at: string;
  join_closes_at: string | null;
  prize_diamonds: number;
  entry_fee_diamonds: number;
  player_cap: number;
  status: 'upcoming' | 'active' | 'ended';
}

export interface TournamentEntry {
  id: string;
  tournament_id: string;
  user_id: string;
  handle: string;
  score: number;
  rank: number | null;
  joined_at: string;
  start_max_stage: number;
}

export class TournamentPlugin implements IPlugin {
  id = 'tournament';
  dependencies = ['auth'];
  stateKeys = [] as (keyof GameState)[];

  private engine!: IEngine;
  private userId: string | null = null;
  private handle: string = '';
  private tournaments: Tournament[] = [];
  private myEntries: Record<string, TournamentEntry> = {};
  private leaderboards: Record<string, TournamentEntry[]> = {};
  private participantCounts: Record<string, number> = {};
  private listeners: Array<() => void> = [];
  private unsubs: Array<() => void> = [];

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    engine.storage.registerTable(this.id + '_t', { table: 'tournaments', userScoped: false });
    engine.storage.registerTable(this.id + '_e', { table: 'tournament_entries', userScoped: false });

    this.unsubs.push(
      engine.on('auth_success', (event: GameEvent<Player>) => {
        this.userId = event.payload.id;
        this.handle = event.payload.handle;
        void this.load();
      })
    );

    const existing = engine.getPlugin<AuthPlugin>('auth')?.getPlayer();
    if (existing) {
      this.userId = existing.id;
      this.handle = existing.handle;
      void this.load();
    }

    this.unsubs.push(engine.on('stage_clear', () => { void this.updateAllScores(); }));
  }

  private async load(): Promise<void> {
    await this.loadTournaments();
    if (this.tournaments.length > 0 && this.userId) {
      await Promise.all([this.loadMyEntries(), this.loadAllLeaderboards()]);
    }
    this.notify();
  }

  private async loadTournaments(): Promise<void> {
    // Load all non-ended tournaments (upcoming + active)
    const { data } = await this.engine.storage.loadMany<Tournament>(
      'tournaments',
      {},
      'id, name, template_name, bracket_number, starts_at, ends_at, join_closes_at, prize_diamonds, entry_fee_diamonds, player_cap, status'
    );
    // Filter client-side: exclude ended, sort by starts_at
    const fromDb = data
      .filter(t => t.status !== 'ended')
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

    // If the DB has no tournaments, generate rotating ones locally
    this.tournaments = fromDb.length > 0 ? fromDb : this.generateLocalTournaments();
  }

  /**
   * Generate a set of always-available rotating tournaments based on the
   * current week. These act as live data until an admin seeds the DB.
   */
  private generateLocalTournaments(): Tournament[] {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const dayMs = 24 * 60 * 60 * 1000;

    // Weekly tournament — resets every Monday 00:00 UTC
    const dayOfWeek = new Date().getUTCDay(); // 0=Sun
    const msIntoWeek = ((dayOfWeek === 0 ? 6 : dayOfWeek - 1) * dayMs) + (Date.now() % dayMs);
    const weekStart = now - msIntoWeek;
    const weekEnd = weekStart + weekMs;

    // 3-day sprint — resets every 3 days
    const epochDays = Math.floor(now / dayMs);
    const sprintCycle = Math.floor(epochDays / 3);
    const sprintStart = sprintCycle * 3 * dayMs;
    const sprintEnd = sprintStart + 3 * dayMs;

    // Daily blitz — resets every 24h at midnight UTC
    const dayStart = Math.floor(now / dayMs) * dayMs;
    const dayEnd = dayStart + dayMs;

    const templates: Array<{
      id: string; name: string; template_name: string; bracket_number: number;
      starts: number; ends: number; joinCloses: number | null;
      prize: number; cap: number;
    }> = [
      { id: 'local-weekly-1',  name: 'WEEKLY CIRCUIT',   template_name: 'weekly',  bracket_number: 1, starts: weekStart,  ends: weekEnd,  joinCloses: weekStart + dayMs,  prize: 500, cap: 128 },
      { id: 'local-sprint-1',  name: '72H SPRINT',       template_name: 'sprint',  bracket_number: 1, starts: sprintStart, ends: sprintEnd, joinCloses: sprintStart + 6 * 60 * 60 * 1000, prize: 200, cap: 64 },
      { id: 'local-daily-1',   name: 'DAILY BLITZ',      template_name: 'daily',   bracket_number: 1, starts: dayStart,   ends: dayEnd,   joinCloses: dayStart + 2 * 60 * 60 * 1000,   prize: 75,  cap: 32 },
      // Upcoming next week
      { id: 'local-weekly-2',  name: 'WEEKLY CIRCUIT II', template_name: 'weekly', bracket_number: 2, starts: weekEnd,    ends: weekEnd + weekMs, joinCloses: null, prize: 500, cap: 128 },
      { id: 'local-sprint-2',  name: '72H SPRINT II',    template_name: 'sprint',  bracket_number: 2, starts: sprintEnd,  ends: sprintEnd + 3 * dayMs, joinCloses: null, prize: 200, cap: 64 },
    ];

    return templates.map(t => {
      const status: Tournament['status'] =
        now >= t.starts && now < t.ends ? 'active' :
        now < t.starts ? 'upcoming' : 'ended';

      return {
        id: t.id,
        name: t.name,
        template_name: t.template_name,
        bracket_number: t.bracket_number,
        starts_at: new Date(t.starts).toISOString(),
        ends_at: new Date(t.ends).toISOString(),
        join_closes_at: t.joinCloses ? new Date(t.joinCloses).toISOString() : null,
        prize_diamonds: t.prize,
        entry_fee_diamonds: 0,
        player_cap: t.cap,
        status,
      };
    }).filter(t => t.status !== 'ended');
  }

  private async loadMyEntries(): Promise<void> {
    if (!this.userId) return;
    const { data } = await this.engine.storage.loadMany<TournamentEntry>(
      'tournament_entries',
      { user_id: this.userId },
      'id, tournament_id, user_id, handle, score, rank, joined_at, start_max_stage'
    );
    this.myEntries = {};
    for (const e of data) {
      this.myEntries[e.tournament_id] = e;
    }
  }

  private async loadAllLeaderboards(): Promise<void> {
    for (const t of this.tournaments) {
      await this.loadLeaderboard(t.id);
    }
  }

  private async loadLeaderboard(tournamentId: string): Promise<void> {
    if (this.isLocalTournament(tournamentId)) {
      // Local tournaments: leaderboard is in-memory only
      const existing = this.leaderboards[tournamentId] ?? [];
      const sorted = [...existing].sort((a, b) => b.score - a.score).slice(0, 50);
      this.leaderboards[tournamentId] = sorted;
      this.participantCounts[tournamentId] = sorted.length;
      return;
    }
    const { data } = await this.engine.storage.loadMany<TournamentEntry>(
      'tournament_entries',
      { tournament_id: tournamentId },
      'id, user_id, handle, score, rank, joined_at, start_max_stage'
    );
    const sorted = data.sort((a, b) => b.score - a.score).slice(0, 50);
    this.leaderboards[tournamentId] = sorted;
    this.participantCounts[tournamentId] = data.length;
  }

  /** True when a tournament is locally generated (not stored in the DB). */
  private isLocalTournament(tournamentId: string): boolean {
    return tournamentId.startsWith('local-');
  }

  async joinTournament(tournamentId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.userId) return { success: false, error: 'Not logged in' };
    if (this.myEntries[tournamentId]) return { success: false, error: 'Already joined' };

    const t = this.tournaments.find(x => x.id === tournamentId);
    if (!t) return { success: false, error: 'Tournament not found' };
    if (t.status === 'ended') return { success: false, error: 'Tournament has ended' };

    if (t.join_closes_at && new Date() > new Date(t.join_closes_at)) {
      return { success: false, error: 'Join window has closed' };
    }

    const participantCount = this.participantCounts[tournamentId] ?? 0;
    if (participantCount >= t.player_cap) return { success: false, error: 'Bracket is full' };

    if (t.entry_fee_diamonds > 0) {
      if (this.engine.state.diamonds < t.entry_fee_diamonds) {
        return { success: false, error: `Need ${t.entry_fee_diamonds} ◈ to enter` };
      }
      this.engine.updateState({ diamonds: this.engine.state.diamonds - t.entry_fee_diamonds });
    }

    const currentMaxStage = this.engine.state.maxStage ?? 1;
    const sessionId = `${tournamentId}-${this.userId}-${Date.now()}`;

    let entry: TournamentEntry;

    if (this.isLocalTournament(tournamentId)) {
      // Local tournament — store entry in memory only
      entry = {
        id: `local-entry-${Date.now()}`,
        tournament_id: tournamentId,
        user_id: this.userId,
        handle: this.handle,
        score: this.engine.state.highestStage,
        rank: null,
        joined_at: new Date().toISOString(),
        start_max_stage: currentMaxStage,
      };
    } else {
      const { data, error } = await this.engine.storage.insert<TournamentEntry>(
        'tournament_entries',
        {
          tournament_id: tournamentId,
          user_id: this.userId,
          handle: this.handle,
          score: this.engine.state.highestStage,
          rank: null,
          start_max_stage: currentMaxStage,
        },
        'id, tournament_id, user_id, handle, score, rank, joined_at, start_max_stage'
      );

      if (error || !data) {
        if (t.entry_fee_diamonds > 0) {
          this.engine.updateState({ diamonds: this.engine.state.diamonds + t.entry_fee_diamonds });
        }
        return { success: false, error: 'Failed to join' };
      }
      entry = data;
    }

    this.myEntries[tournamentId] = entry;
    this.participantCounts[tournamentId] = participantCount + 1;
    // For local tournaments seed the leaderboard with this entry
    if (this.isLocalTournament(tournamentId)) {
      this.leaderboards[tournamentId] = [entry, ...(this.leaderboards[tournamentId] ?? [])];
    }
    this.engine.updateState({ tournamentSessionId: sessionId, tournamentMaxStage: currentMaxStage });
    await this.loadLeaderboard(tournamentId);
    this.engine.emit('tournament_joined', { tournament: t });
    this.notify();
    return { success: true };
  }

  private async updateAllScores(): Promise<void> {
    const newScore = this.engine.state.highestStage;
    for (const [tid, entry] of Object.entries(this.myEntries)) {
      if (newScore <= entry.score) continue;
      entry.score = newScore;
      if (this.isLocalTournament(tid)) {
        // Update in-memory leaderboard entry
        const lb = this.leaderboards[tid] ?? [];
        const idx = lb.findIndex(e => e.id === entry.id);
        if (idx >= 0) lb[idx].score = newScore;
      } else {
        await this.engine.storage.save(
          'tournament_entries',
          { id: entry.id, score: newScore },
          'id'
        );
      }
      this.engine.emit('tournament_score_update', { tournamentId: tid, score: newScore });
      await this.loadLeaderboard(tid);
    }
    if (Object.keys(this.myEntries).length > 0) this.notify();
  }

  refreshLeaderboard(tournamentId: string): void {
    void this.loadLeaderboard(tournamentId).then(() => this.notify());
  }

  getAll(): Tournament[] { return this.tournaments; }
  getActive(): Tournament[] { return this.tournaments.filter(t => t.status === 'active'); }
  getUpcoming(): Tournament[] { return this.tournaments.filter(t => t.status === 'upcoming'); }
  getMyEntry(tournamentId: string): TournamentEntry | null { return this.myEntries[tournamentId] ?? null; }
  getLeaderboard(tournamentId: string): TournamentEntry[] { return this.leaderboards[tournamentId] ?? []; }
  getParticipantCount(tournamentId: string): number { return this.participantCounts[tournamentId] ?? 0; }
  isJoined(tournamentId: string): boolean { return !!this.myEntries[tournamentId]; }
  
  canJoin(tournamentId: string): { canJoin: boolean; reason?: string } {
    const t = this.tournaments.find(x => x.id === tournamentId);
    if (!t) return { canJoin: false, reason: 'Tournament not found' };
    if (t.status === 'ended') return { canJoin: false, reason: 'Tournament has ended' };
    if (this.myEntries[tournamentId]) return { canJoin: false, reason: 'Already joined' };
    if (t.join_closes_at && new Date() > new Date(t.join_closes_at)) {
      return { canJoin: false, reason: 'Join window closed' };
    }
    const participantCount = this.participantCounts[tournamentId] ?? 0;
    if (participantCount >= t.player_cap) return { canJoin: false, reason: 'Bracket full' };
    return { canJoin: true };
  }
  
  getJoinWindowRemaining(tournamentId: string): number | null {
    const t = this.tournaments.find(x => x.id === tournamentId);
    if (!t || !t.join_closes_at) return null;
    const remaining = new Date(t.join_closes_at).getTime() - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private notify(): void { for (const l of this.listeners) l(); }

  cleanup(): void {
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
  }
}
