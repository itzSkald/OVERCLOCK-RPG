import type { IPlugin, IEngine, GameState, GameEvent, Player } from '../engine/types';
import type { AuthPlugin } from './AuthPlugin';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  check: (state: GameState, ctx: AchievementContext) => boolean;
}

export interface UnlockedAchievement {
  achievement_id: string;
  unlocked_at: string;
}

interface AchievementContext {
  totalKills: number;
  totalBossKills: number;
  totalSkillsUsed: number;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'first_blood',
    name: 'FIRST BLOOD',
    description: 'Defeat your first enemy',
    icon: 'Crosshair',
    color: '#00f5ff',
    check: (_s, ctx) => ctx.totalKills >= 1,
  },
  {
    id: 'stage_10',
    name: 'WARMING UP',
    description: 'Reach stage 10',
    icon: 'TrendingUp',
    color: '#00f5ff',
    check: s => s.highestStage >= 10,
  },
  {
    id: 'stage_25',
    name: 'MID GAME',
    description: 'Reach stage 25',
    icon: 'TrendingUp',
    color: '#39ff14',
    check: s => s.highestStage >= 25,
  },
  {
    id: 'stage_50',
    name: 'DEEP RUN',
    description: 'Reach stage 50',
    icon: 'TrendingUp',
    color: '#ffaa00',
    check: s => s.highestStage >= 50,
  },
  {
    id: 'stage_100',
    name: 'ENDGAME',
    description: 'Reach stage 100',
    icon: 'TrendingUp',
    color: '#ff0080',
    check: s => s.highestStage >= 100,
  },
  {
    id: 'first_overclock',
    name: 'REBOOT',
    description: 'Perform your first Overclock',
    icon: 'RotateCcw',
    color: '#ff0080',
    check: s => s.totalOverclocks >= 1,
  },
  {
    id: 'overclock_5',
    name: 'SERIAL OVERCLOCKER',
    description: 'Perform 5 Overclocks',
    icon: 'RotateCcw',
    color: '#ff0080',
    check: s => s.totalOverclocks >= 5,
  },
  {
    id: 'boss_slayer',
    name: 'BOSS SLAYER',
    description: 'Defeat 10 bosses',
    icon: 'Skull',
    color: '#ff4444',
    check: (_s, ctx) => ctx.totalBossKills >= 10,
  },
  {
    id: 'gold_hoarder',
    name: 'GOLD HOARDER',
    description: 'Accumulate 10,000 gold',
    icon: 'Coins',
    color: '#ffaa00',
    check: s => s.gold >= 10000,
  },
  {
    id: 'full_equipped',
    name: 'FULLY LOADED',
    description: 'Fill all motherboard slots',
    icon: 'HardDrive',
    color: '#39ff14',
    check: s => {
      const slots = s.equippedItems;
      if (!slots) return false;
      return Object.values(slots).every(arr =>
        Array.isArray(arr) && arr.length > 0 && arr.every(item => item !== null)
      );
    },
  },
  {
    id: 'skill_master',
    name: 'SKILL MASTER',
    description: 'Use skills 50 times',
    icon: 'Zap',
    color: '#00f5ff',
    check: (_s, ctx) => ctx.totalSkillsUsed >= 50,
  },
  {
    id: 'kill_100',
    name: 'CENTURION',
    description: 'Defeat 100 enemies',
    icon: 'Target',
    color: '#39ff14',
    check: (_s, ctx) => ctx.totalKills >= 100,
  },
];

interface AchievementStatsRow {
  user_id: string;
  total_kills: number;
  total_boss_kills: number;
  total_skills_used: number;
}

export class AchievementPlugin implements IPlugin {
  id = 'achievement';
  dependencies = ['auth'];
  stateKeys = [] as (keyof GameState)[];

  private engine!: IEngine;
  private unlocked: Set<string> = new Set();
  private unlockedList: UnlockedAchievement[] = [];
  private listeners: Array<() => void> = [];
  private unsubs: Array<() => void> = [];
  private userId: string | null = null;
  private ctx: AchievementContext = { totalKills: 0, totalBossKills: 0, totalSkillsUsed: 0 };
  private sessionKills = 0;
  private sessionBossKills = 0;
  private sessionSkillsUsed = 0;
  private checkTimer: ReturnType<typeof setInterval> | null = null;
  private saveStatsTimer: ReturnType<typeof setInterval> | null = null;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    engine.storage.registerTable(this.id, { table: 'achievements', userScoped: true });
    engine.storage.registerTable('achievement_stats', { table: 'achievement_stats', userScoped: true });

    this.unsubs.push(
      engine.on('auth_success', (event: GameEvent<Player>) => {
        this.userId = event.payload.id;
        void this.loadAchievements();
      })
    );

    // Handle already-logged-in users
    const existingPlayer = engine.getPlugin<AuthPlugin>('auth')?.getPlayer();
    if (existingPlayer) {
      this.userId = existingPlayer.id;
      void this.loadAchievements();
    }

    this.unsubs.push(
      engine.on('enemy_death', (event: GameEvent<{ enemy: { isBoss: boolean } }>) => {
        this.ctx.totalKills++;
        this.sessionKills++;
        if (event.payload.enemy.isBoss) {
          this.ctx.totalBossKills++;
          this.sessionBossKills++;
        }
      })
    );

    this.unsubs.push(
      engine.on('skill_activated', () => {
        this.ctx.totalSkillsUsed++;
        this.sessionSkillsUsed++;
      })
    );

    this.checkTimer = setInterval(() => this.checkAchievements(), 2000);
    // Persist stats every 30 seconds
    this.saveStatsTimer = setInterval(() => void this.saveStats(), 30000);
  }

  private async loadAchievements(): Promise<void> {
    if (!this.userId) return;

    const [achievementsResult, statsResult] = await Promise.all([
      this.engine.storage.loadMany('achievements', { user_id: this.userId }),
      this.engine.storage.load<AchievementStatsRow>('achievement_stats', { user_id: this.userId }),
    ]);

    if (achievementsResult.data) {
      this.unlockedList = achievementsResult.data as UnlockedAchievement[];
      this.unlocked = new Set(this.unlockedList.map(a => a.achievement_id));
    }

    if (statsResult.data) {
      this.ctx.totalKills = statsResult.data.total_kills;
      this.ctx.totalBossKills = statsResult.data.total_boss_kills;
      this.ctx.totalSkillsUsed = statsResult.data.total_skills_used;
    }

    this.notify();
  }

  private async saveStats(): Promise<void> {
    if (!this.userId || (this.sessionKills === 0 && this.sessionBossKills === 0 && this.sessionSkillsUsed === 0)) return;

    await this.engine.storage.save('achievement_stats', {
      user_id: this.userId,
      total_kills: this.ctx.totalKills,
      total_boss_kills: this.ctx.totalBossKills,
      total_skills_used: this.ctx.totalSkillsUsed,
      updated_at: new Date().toISOString(),
    }, 'user_id');

    this.sessionKills = 0;
    this.sessionBossKills = 0;
    this.sessionSkillsUsed = 0;
  }

  private checkAchievements(): void {
    if (!this.userId) return;

    const state = this.engine.state;
    for (const def of ACHIEVEMENT_DEFS) {
      if (this.unlocked.has(def.id)) continue;
      if (def.check(state, this.ctx)) {
        this.unlock(def);
      }
    }
  }

  private unlock(def: AchievementDef): void {
    if (this.unlocked.has(def.id)) return;

    this.unlocked.add(def.id);
    const entry: UnlockedAchievement = { achievement_id: def.id, unlocked_at: new Date().toISOString() };
    this.unlockedList.push(entry);

    this.engine.emit('achievement_unlocked', { achievement: def });
    this.notify();

    void this.saveAchievement(def.id);
  }

  private async saveAchievement(achievementId: string): Promise<void> {
    if (!this.userId) return;
    await this.engine.storage.insert('achievements', {
      user_id: this.userId,
      achievement_id: achievementId,
    });
  }

  getUnlocked(): Set<string> {
    return this.unlocked;
  }

  getUnlockedList(): UnlockedAchievement[] {
    return this.unlockedList;
  }

  getProgress(): { total: number; unlocked: number } {
    return { total: ACHIEVEMENT_DEFS.length, unlocked: this.unlocked.size };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  cleanup(): void {
    void this.saveStats();
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
    this.listeners = [];
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    if (this.saveStatsTimer) {
      clearInterval(this.saveStatsTimer);
      this.saveStatsTimer = null;
    }
  }
}
