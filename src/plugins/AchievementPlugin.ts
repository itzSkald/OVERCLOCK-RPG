import type { IPlugin, IEngine, GameState, GameEvent, Player } from '../engine/types';
import type { AuthPlugin } from './AuthPlugin';
import { ACHIEVEMENT_CONFIG, type AchievementDef } from '../config/game.config';

export interface UnlockedAchievement {
  achievement_id: string;
  unlocked_at: string;
}

interface AchievementContext {
  totalKills: number;
  totalBossKills: number;
  totalSkillsUsed: number;
  totalGoldEarned: number;
}

/**
 * Build check function from config-based achievement definition.
 * This converts the declarative config into runtime check functions.
 */
function buildCheckFn(def: AchievementDef): (state: GameState, ctx: AchievementContext) => boolean {
  switch (def.type) {
    case 'kills':
      return (_s, ctx) => ctx.totalKills >= def.threshold;
    case 'boss_kills':
      return (_s, ctx) => ctx.totalBossKills >= def.threshold;
    case 'stage':
      return (s) => (s.highestStage ?? 0) >= def.threshold;
    case 'overclocks':
      return (s) => (s.totalOverclocks ?? 0) >= def.threshold;
    case 'gold':
      return (_s, ctx) => ctx.totalGoldEarned >= def.threshold;
    case 'skills':
      return (_s, ctx) => ctx.totalSkillsUsed >= def.threshold;
    case 'components_unlocked':
      return (s) => Object.values(s.components ?? {}).filter(c => c.unlocked).length >= def.threshold;
    case 'component_level':
      return (s) => Object.values(s.components ?? {}).some(c => c.level >= def.threshold);
    case 'items_equipped':
      return (s) => {
        const slots = s.equippedItems;
        if (!slots) return false;
        const count = Object.values(slots).reduce((sum, arr) => {
          if (!Array.isArray(arr)) return sum;
          return sum + arr.filter(item => item !== null).length;
        }, 0);
        return count >= def.threshold;
      };
    case 'set_complete':
      return (s) => {
        if (!def.setId) return false;
        return (s.completedSets ?? []).includes(def.setId);
      };
    case 'oct_spent':
      return (s) => (s.octSpent ?? 0) >= def.threshold;
    case 'diamonds':
      return (s) => (s.diamonds ?? 0) >= def.threshold;
    default:
      return () => false;
  }
}

/** Runtime achievement with check function built from config */
interface RuntimeAchievement extends AchievementDef {
  check: (state: GameState, ctx: AchievementContext) => boolean;
}

/** Build runtime achievements from config */
const RUNTIME_ACHIEVEMENTS: RuntimeAchievement[] = ACHIEVEMENT_CONFIG.achievements.map(def => ({
  ...def,
  check: buildCheckFn(def),
}));

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
  private ctx: AchievementContext = { totalKills: 0, totalBossKills: 0, totalSkillsUsed: 0, totalGoldEarned: 0 };
  private sessionKills = 0;
  private sessionBossKills = 0;
  private sessionSkillsUsed = 0;
  private sessionGoldEarned = 0;
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

    this.unsubs.push(
      engine.on('stage_clear', (event: GameEvent<{ goldReward: number }>) => {
        this.ctx.totalGoldEarned += event.payload.goldReward;
        this.sessionGoldEarned += event.payload.goldReward;
      })
    );

    this.checkTimer = setInterval(() => this.checkAchievements(), 2000);
    // Persist stats at configured interval
    this.saveStatsTimer = setInterval(() => void this.saveStats(), ACHIEVEMENT_CONFIG.persistIntervalMs);
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
      this.ctx.totalGoldEarned = (statsResult.data as AchievementStatsRow & { total_gold_earned?: number }).total_gold_earned ?? 0;
    }

    this.notify();
  }

  private async saveStats(): Promise<void> {
    if (!this.userId || (this.sessionKills === 0 && this.sessionBossKills === 0 && this.sessionSkillsUsed === 0 && this.sessionGoldEarned === 0)) return;

    await this.engine.storage.save('achievement_stats', {
      user_id: this.userId,
      total_kills: this.ctx.totalKills,
      total_boss_kills: this.ctx.totalBossKills,
      total_skills_used: this.ctx.totalSkillsUsed,
      total_gold_earned: this.ctx.totalGoldEarned,
      updated_at: new Date().toISOString(),
    }, 'user_id');

    this.sessionKills = 0;
    this.sessionBossKills = 0;
    this.sessionSkillsUsed = 0;
    this.sessionGoldEarned = 0;
  }

  private checkAchievements(): void {
    if (!this.userId) return;

    const state = this.engine.state;
    for (const def of RUNTIME_ACHIEVEMENTS) {
      if (this.unlocked.has(def.id)) continue;
      if (def.check(state, this.ctx)) {
        this.unlock(def);
      }
    }
  }

  private unlock(def: RuntimeAchievement): void {
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
    return { total: RUNTIME_ACHIEVEMENTS.length, unlocked: this.unlocked.size };
  }

  /** Get all achievement definitions (for UI) */
  getDefinitions(): AchievementDef[] {
    return ACHIEVEMENT_CONFIG.achievements;
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
