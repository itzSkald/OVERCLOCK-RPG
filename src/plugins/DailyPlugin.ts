import type { IPlugin, IEngine, GameState, GameEvent } from '../engine/types';

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

interface ChallengeTemplate {
  type: string;
  label: string;
  targetFn: (stage: number) => number;
  rewardFn: (stage: number) => number;
}

const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  { type: 'kill_enemies', label: 'Eliminate {n} enemies', targetFn: s => 10 + s * 2, rewardFn: s => 50 + s * 20 },
  { type: 'earn_gold', label: 'Earn {n} gold', targetFn: s => 100 + s * 50, rewardFn: s => 30 + s * 15 },
  { type: 'reach_stage', label: 'Reach stage {n}', targetFn: s => Math.max(s + 3, 5), rewardFn: s => 80 + s * 30 },
  { type: 'use_skills', label: 'Use {n} skills', targetFn: () => 5, rewardFn: s => 40 + s * 10 },
  { type: 'defeat_bosses', label: 'Defeat {n} bosses', targetFn: () => 2, rewardFn: s => 100 + s * 40 },
  { type: 'tap_damage', label: 'Deal {n} tap damage', targetFn: s => 200 + s * 100, rewardFn: s => 60 + s * 25 },
];

const CHALLENGES_PER_DAY = 3;

function getUTCDateString(): string {
  return new Date().toISOString().split('T')[0];
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

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    engine.storage.registerTable(this.id, { table: 'daily_challenges', userScoped: true });

    this.unsubs.push(
      engine.on('auth_success', (event: GameEvent<{ userId: string }>) => {
        this.userId = event.payload.userId;
        void this.loadOrGenerateChallenges();
      })
    );

    this.unsubs.push(
      engine.on('enemy_death', (event: GameEvent<{ enemy: { isBoss: boolean } }>) => {
        this.killCount++;
        this.incrementChallenge('kill_enemies', 1);
        if (event.payload.enemy.isBoss) {
          this.bossesKilled++;
          this.incrementChallenge('defeat_bosses', 1);
        }
      })
    );

    this.unsubs.push(
      engine.on('stage_clear', (event: GameEvent<{ goldReward: number }>) => {
        this.goldEarned += event.payload.goldReward;
        this.incrementChallenge('earn_gold', event.payload.goldReward);
        const currentStage = this.engine.state.stage;
        this.updateMaxChallenge('reach_stage', currentStage);
      })
    );

    this.unsubs.push(
      engine.on('skill_activated', () => {
        this.skillsUsed++;
        this.incrementChallenge('use_skills', 1);
      })
    );

    this.unsubs.push(
      engine.on('enemy_hit', (event: GameEvent<{ damage: number }>) => {
        this.tapDamage += event.payload.damage;
        this.incrementChallenge('tap_damage', event.payload.damage);
      })
    );
  }

  private async loadOrGenerateChallenges(): Promise<void> {
    if (!this.userId) return;

    const today = getUTCDateString();
    const { data } = await this.engine.storage.loadMany('daily_challenges', {
      user_id: this.userId,
      challenge_date: today,
    });

    if (data && data.length >= CHALLENGES_PER_DAY) {
      this.challenges = data as DailyChallenge[];
    } else {
      await this.generateChallenges(today);
    }
    this.notify();
  }

  private async generateChallenges(date: string): Promise<void> {
    if (!this.userId) return;

    const stage = this.engine.state.highestStage ?? 1;
    const seed = dateSeed(date + this.userId.slice(0, 8));
    const shuffled = seededShuffle(CHALLENGE_TEMPLATES, seed);
    const selected = shuffled.slice(0, CHALLENGES_PER_DAY);

    this.challenges = [];
    for (const template of selected) {
      const target = template.targetFn(stage);
      const reward = template.rewardFn(stage);
      const label = template.label.replace('{n}', target.toString());

      const { data } = await this.engine.storage.insert('daily_challenges', {
        user_id: this.userId,
        challenge_date: date,
        challenge_type: template.type,
        challenge_label: label,
        target_value: target,
        current_value: 0,
        completed: false,
        reward_gold: reward,
      }, 'id, challenge_type, challenge_label, target_value, current_value, completed, reward_gold, challenge_date');

      if (data) {
        this.challenges.push(data as DailyChallenge);
      }
    }
  }

  private incrementChallenge(type: string, amount: number): void {
    let changed = false;
    for (const c of this.challenges) {
      if (c.challenge_type === type && !c.completed) {
        c.current_value = Math.min(c.current_value + amount, c.target_value);
        if (c.current_value >= c.target_value) {
          c.completed = true;
          this.engine.emit('daily_completed', { challenge: c });
          this.engine.updateState({ gold: this.engine.state.gold + c.reward_gold });
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
          this.engine.emit('daily_completed', { challenge: c });
          this.engine.updateState({ gold: this.engine.state.gold + c.reward_gold });
        }
        changed = true;
        void this.saveProgress(c);
      }
    }
    if (changed) this.notify();
  }

  private async saveProgress(challenge: DailyChallenge): Promise<void> {
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
