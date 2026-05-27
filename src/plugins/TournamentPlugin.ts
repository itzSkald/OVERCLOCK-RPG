import type { IPlugin, IEngine, GameState, GameEvent, Player } from '../engine/types';
import type { AuthPlugin } from './AuthPlugin';

export interface Tournament {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  prize_diamonds: number;
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
}

export class TournamentPlugin implements IPlugin {
  id = 'tournament';
  dependencies = ['auth'];
  stateKeys = [] as (keyof GameState)[];

  private engine!: IEngine;
  private userId: string | null = null;
  private handle: string = '';
  private activeTournament: Tournament | null = null;
  private myEntry: TournamentEntry | null = null;
  private leaderboard: TournamentEntry[] = [];
  private listeners: Array<() => void> = [];
  private unsubs: Array<() => void> = [];
  private scoreUpdateTimer: ReturnType<typeof setInterval> | null = null;

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

    const existingPlayer = engine.getPlugin<AuthPlugin>('auth')?.getPlayer();
    if (existingPlayer) {
      this.userId = existingPlayer.id;
      this.handle = existingPlayer.handle;
      void this.load();
    }

    this.unsubs.push(
      engine.on('stage_clear', () => {
        void this.updateScore();
      })
    );
  }

  private async load(): Promise<void> {
    await this.loadActiveTournament();
    if (this.activeTournament) {
      await Promise.all([this.loadMyEntry(), this.loadLeaderboard()]);
    }
    this.notify();
  }

  private async loadActiveTournament(): Promise<void> {
    const { data } = await this.engine.storage.load<Tournament>(
      'tournaments',
      { status: 'active' },
      'id, name, starts_at, ends_at, prize_diamonds, status'
    );
    this.activeTournament = data;
  }

  private async loadMyEntry(): Promise<void> {
    if (!this.activeTournament || !this.userId) return;
    const { data } = await this.engine.storage.load<TournamentEntry>(
      'tournament_entries',
      { tournament_id: this.activeTournament.id, user_id: this.userId },
      'id, tournament_id, user_id, handle, score, rank, joined_at'
    );
    this.myEntry = data;
  }

  private async loadLeaderboard(): Promise<void> {
    if (!this.activeTournament) return;
    const { data } = await this.engine.storage.loadMany<TournamentEntry>(
      'tournament_entries',
      { tournament_id: this.activeTournament.id },
      'id, handle, score, rank, joined_at'
    );
    this.leaderboard = data.sort((a, b) => b.score - a.score).slice(0, 25);
  }

  async joinTournament(): Promise<boolean> {
    if (!this.activeTournament || !this.userId || this.myEntry) return false;

    const { data } = await this.engine.storage.insert<TournamentEntry>(
      'tournament_entries',
      {
        tournament_id: this.activeTournament.id,
        user_id: this.userId,
        handle: this.handle,
        score: this.engine.state.highestStage,
        rank: null,
      },
      'id, tournament_id, user_id, handle, score, rank, joined_at'
    );

    if (data) {
      this.myEntry = data;
      await this.loadLeaderboard();
      this.engine.emit('tournament_joined', { tournament: this.activeTournament });
      this.notify();
      return true;
    }
    return false;
  }

  private async updateScore(): Promise<void> {
    if (!this.myEntry || !this.activeTournament) return;
    const newScore = this.engine.state.highestStage;
    if (newScore <= this.myEntry.score) return;

    this.myEntry.score = newScore;
    await this.engine.storage.save(
      'tournament_entries',
      { id: this.myEntry.id, score: newScore },
      'id'
    );

    this.engine.emit('tournament_score_update', { score: newScore });
    await this.loadLeaderboard();
    this.notify();
  }

  refreshLeaderboard(): void {
    if (this.activeTournament) {
      void this.loadLeaderboard().then(() => this.notify());
    }
  }

  getActiveTournament(): Tournament | null { return this.activeTournament; }
  getMyEntry(): TournamentEntry | null { return this.myEntry; }
  getLeaderboard(): TournamentEntry[] { return this.leaderboard; }
  isJoined(): boolean { return this.myEntry !== null; }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  cleanup(): void {
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
    if (this.scoreUpdateTimer) clearInterval(this.scoreUpdateTimer);
  }
}
