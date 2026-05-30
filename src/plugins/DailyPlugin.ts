import type { IPlugin, IEngine, GameState, GameEvent, Player, TableSchema } from '../engine/types';
import type { AuthPlugin } from './AuthPlugin';
import { CHALLENGE_TEMPLATES, DAILY_CONFIG } from '../config/game.config';

export interface DailyChallenge {
  id: string;
  challenge_type: string;
  challenge_label: string;
  target_value: number;
  current_value: number;
  completed: boolean;
  reward_gold: number;
  challenge_date: string;
}

export function getDiamondReward(challengeType: string, highestStage: number): number {
  const base = Math.max(1, Math.floor(highestStage / DAILY_CONFIG.diamondStageDivisor));
  const weight = DAILY_CONFIG.diamondDifficulty[challengeType] ?? 1;
  return Math.min(DAILY_CONFIG.maxDiamondReward, Math.floor(base * weight));
}

/**
 * Get the current date string in London timezone (Europe/London).
 * Daily challenges reset at midnight London time.
 */
function getLondonDateString(): string {
  const now = new Date();
  // Format date in London timezone
  const londonDate = now.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  return londonDate; // Returns YYYY-MM-DD format
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    const j = Math.abs(s) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function dateSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export class DailyPlugin implements IPlugin {
  id = 'daily';
  dependencies = ['auth'];
  stateKeys = [] as (keyof GameState)[];

  /** Define the database table this plugin requires - auto-created on boot */
  schema: TableSchema[] = [{
    name: 'daily_challenges',
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'uuid', nullable: false },
      { name: 'challenge_type', type: 'text', nullable: false },
      { name: 'challenge_label', type: 'text', nullable: false },
      { name: 'target_value', type: 'integer', nullable: false },
      { name: 'current_value', type: 'integer', nullable: false, default: '0' },
      { name: 'completed', type: 'boolean', nullable: false, default: 'false' },
      { name: 'reward_gold', type: 'integer', nullable: false, default: '0' },
      { name: 'challenge_date', type: 'date', nullable: false },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()' },
    ],
    indexes: [
      { name: 'idx_daily_challenges_user_date', columns: ['user_id', 'challenge_date'] },
    ],
    rls: [
      { name: 'daily_challenges_select_own', operation: 'SELECT', using: 'auth.uid() = user_id' },
      { name: 'daily_challenges_insert_own', operation: 'INSERT', withCheck: 'auth.uid() = user_id' },
      { name: 'daily_challenges_update_own', operation: 'UPDATE', using: 'auth.uid() = user_id' },
    ],
  }];

  private engine!: IEngine;
  private challenges: DailyChallenge[] = [];
  private listeners: Array<() => void> = [];
  private unsubs: Array<() => void> = [];
  private userId: string | null = null;
  private killCount = 0;
  private goldEarned = 0;
  private tapDamage = 0;
  private skillsUsed = 0;
  private bossesKilled = 0;
  private critHits = 0;
  private consecutiveKills = 0;
  private consecutiveBosses = 0;
  private lastSkillTime = 0;
  private skillChain = 0;
  private consecutiveTaps = 0;
  private idleKills = 0;
  private goldSpent = 0;
  private stagesCleared = 0;
  private wavesEndured = 0;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    engine.storage.registerTable(this.id, { table: 'daily_challenges', userScoped: true });

    this.unsubs.push(
      engine.on('auth_success', (event: GameEvent<Player>) => {
        this.userId = event.payload.id;
        void this.loadOrGenerateChallenges();
      })
    );

    // Handle already-logged-in users (auth_success may have fired before this plugin inited)
    const existingPlayer = engine.getPlugin<AuthPlugin>('auth')?.getPlayer();
    if (existingPlayer) {
      this.userId = existingPlayer.id;
      void this.loadOrGenerateChallenges();
    }

    this.unsubs.push(
      engine.on('enemy_death', (event: GameEvent<{ enemy: { isBoss: boolean } }>) => {
        this.killCount++;
        this.consecutiveKills++;
        this.incrementChallenge('kill_enemies', 1);
        this.incrementChallenge('kill_streak', 1);
        this.incrementChallenge('endurance', 1);
        if (event.payload.enemy.isBoss) {
          this.bossesKilled++;
          this.consecutiveBosses++;
          this.incrementChallenge('defeat_bosses', 1);
          this.incrementChallenge('boss_streak', 1);
        } else {
          this.consecutiveBosses = 0;
        }
        // idle kills: enemies killed without tapping (tap_damage hasn't changed)
        if (this.tapDamage === 0) {
          this.idleKills++;
          this.incrementChallenge('idle_kills', 1);
        }
      })
    );

    this.unsubs.push(
      engine.on('stage_clear', (event: GameEvent<{ goldReward: number }>) => {
        this.goldEarned += event.payload.goldReward;
        this.stagesCleared++;
        this.wavesEndured++;
        this.incrementChallenge('earn_gold', event.payload.goldReward);
        this.incrementChallenge('earn_gold_fast', event.payload.goldReward);
        this.incrementChallenge('clear_stages', 1);
        const currentStage = this.engine.state.stage;
        this.updateMaxChallenge('reach_stage', currentStage);
        // Reset per-stage counters
        this.tapDamage = 0;
      })
    );

    this.unsubs.push(
      engine.on('skill_activated', () => {
        this.skillsUsed++;
        const now = Date.now();
        if (now - this.lastSkillTime < 3000) {
          this.skillChain++;
          this.incrementChallenge('skill_combos', 1);
        } else {
          this.skillChain = 1;
        }
        this.lastSkillTime = now;
        this.incrementChallenge('use_skills', 1);
      })
    );

    this.unsubs.push(
      engine.on('enemy_hit', (event: GameEvent<{ damage: number; isCrit?: boolean }>) => {
        this.tapDamage += event.payload.damage;
        this.consecutiveTaps++;
        this.incrementChallenge('tap_damage', event.payload.damage);
        this.incrementChallenge('tap_frenzy', event.payload.damage);
        this.incrementChallenge('precision_hits', 1);
        if (event.payload.isCrit) {
          this.critHits++;
          this.incrementChallenge('overclock_tap', 1);
          this.incrementChallenge('collect_crits', 1);
        }
      })
    );

    this.unsubs.push(
      engine.on('gold_spent', (event: GameEvent<{ amount: number }>) => {
        this.goldSpent += event.payload.amount;
        this.incrementChallenge('spend_gold', event.payload.amount);
      })
    );

    this.unsubs.push(
      engine.on('gold_earned', (event: GameEvent<{ amount: number }>) => {
        this.incrementChallenge('gold_hoard', event.payload.amount);
      })
    );

    this.unsubs.push(
      engine.on('overclock', (event: GameEvent<{ count: number }>) => {
        this.updateMaxChallenge('reach_overclock', event.payload.count);
      })
    );
  }

  private async loadOrGenerateChallenges(): Promise<void> {
    if (!this.userId) {
      console.log('[v0] DailyPlugin: No userId, skipping loadOrGenerateChallenges');
      return;
    }

    const today = getLondonDateString();
    
    // Try to load from DB first
    const { data, error } = await this.engine.storage.loadMany('daily_challenges', {
      user_id: this.userId,
      challenge_date: today,
    });

    if (error) {
      console.log('[v0] DailyPlugin: DB error, generating local challenges:', error);
      this.generateLocalChallenges(today);
      this.notify();
      return;
    }

    if (data && data.length >= DAILY_CONFIG.challengesPerDay) {
      this.challenges = data as DailyChallenge[];
    } else if (data && data.length > 0) {
      // Has some but not enough - use what we have plus generate more locally
      this.challenges = data as DailyChallenge[];
    } else {
      // No data - try to insert to DB, fall back to local
      await this.generateChallenges(today);
    }
    this.notify();
  }

  /**
   * Generate challenges locally in memory (no DB).
   * Used as fallback when DB is unavailable.
   */
  private generateLocalChallenges(date: string): void {
    const stage = this.engine.state.highestStage ?? 1;
    const seed = dateSeed(date + (this.userId?.slice(0, 8) ?? 'anon'));
    const shuffled = seededShuffle(CHALLENGE_TEMPLATES, seed);
    const selected = shuffled.slice(0, DAILY_CONFIG.challengesPerDay);

    this.challenges = selected.map((template, idx) => {
      const target = template.targetFn(stage);
      const reward = template.rewardFn(stage);
      const label = template.label.replace('{n}', target.toString());
      return {
        id: `local-${date}-${idx}`,
        challenge_type: template.type,
        challenge_label: label,
        target_value: target,
        current_value: 0,
        completed: false,
        reward_gold: reward,
        challenge_date: date,
      };
    });
  }

  private async generateChallenges(date: string): Promise<void> {
    if (!this.userId) return;

    const stage = this.engine.state.highestStage ?? 1;
    const seed = dateSeed(date + this.userId.slice(0, 8));
    const shuffled = seededShuffle(CHALLENGE_TEMPLATES, seed);
    const selected = shuffled.slice(0, DAILY_CONFIG.challengesPerDay);

    this.challenges = [];
    let dbFailed = false;

    for (let idx = 0; idx < selected.length; idx++) {
      const template = selected[idx];
      const target = template.targetFn(stage);
      const reward = template.rewardFn(stage);
      const label = template.label.replace('{n}', target.toString());

      if (!dbFailed) {
        const { data, error } = await this.engine.storage.insert('daily_challenges', {
          user_id: this.userId,
          challenge_date: date,
          challenge_type: template.type,
          challenge_label: label,
          target_value: target,
          current_value: 0,
          completed: false,
          reward_gold: reward,
        }, 'id, challenge_type, challenge_label, target_value, current_value, completed, reward_gold, challenge_date');

        if (error) {
          console.log('[v0] DailyPlugin: DB insert failed, switching to local mode');
          dbFailed = true;
        } else if (data) {
          this.challenges.push(data as DailyChallenge);
          continue;
        }
      }

      // Fallback: create local challenge
      this.challenges.push({
        id: `local-${date}-${idx}`,
        challenge_type: template.type,
        challenge_label: label,
        target_value: target,
        current_value: 0,
        completed: false,
        reward_gold: reward,
        challenge_date: date,
      });
    }
  }

  private incrementChallenge(type: string, amount: number): void {
    let changed = false;
    for (const c of this.challenges) {
      if (c.challenge_type === type && !c.completed) {
        c.current_value = Math.min(c.current_value + amount, c.target_value);
        if (c.current_value >= c.target_value) {
          c.completed = true;
          const diamonds = getDiamondReward(c.challenge_type, this.engine.state.highestStage);
          this.engine.emit('daily_completed', { challenge: c });
          // Daily ops reward diamonds only - no gold
          this.engine.updateState({
            diamonds: this.engine.state.diamonds + diamonds,
          });
          this.engine.emit('diamonds_earned', { amount: diamonds, source: 'daily' });
        }
        changed = true;
        void this.saveProgress(c);
      }
    }
    if (changed) this.notify();
  }

  private updateMaxChallenge(type: string, value: number): void {
    let changed = false;
    for (const c of this.challenges) {
      if (c.challenge_type === type && !c.completed && value > c.current_value) {
        c.current_value = Math.min(value, c.target_value);
        if (c.current_value >= c.target_value) {
          c.completed = true;
          const diamonds = getDiamondReward(c.challenge_type, this.engine.state.highestStage);
          this.engine.emit('daily_completed', { challenge: c });
          // Daily ops reward diamonds only - no gold
          this.engine.updateState({
            diamonds: this.engine.state.diamonds + diamonds,
          });
          this.engine.emit('diamonds_earned', { amount: diamonds, source: 'daily' });
        }
        changed = true;
        void this.saveProgress(c);
      }
    }
    if (changed) this.notify();
  }

  private async saveProgress(challenge: DailyChallenge): Promise<void> {
    // Skip DB save for local challenges
    if (challenge.id.startsWith('local-')) return;
    
    await this.engine.storage.save('daily_challenges', {
      id: challenge.id,
      current_value: challenge.current_value,
      completed: challenge.completed,
    }, 'id');
  }

  getChallenges(): DailyChallenge[] {
    return this.challenges;
  }

  getCompletedCount(): number {
    return this.challenges.filter(c => c.completed).length;
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
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
    this.listeners = [];
  }
}
