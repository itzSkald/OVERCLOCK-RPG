import type { IPlugin, IEngine, GameState, Enemy, GameEvent } from '../engine/types';
import type { SkillPlugin } from './SkillPlugin';
import { ENEMY_CONFIG } from '../config/game.config';

export function getEnemyHp(stage: number): number {
  const { normalHpBase: base, scalingExponentEarly: expE, scalingExponentLate: expL } = ENEMY_CONFIG;
  if (stage <= 100) return Math.floor(base * Math.pow(expE, stage - 1));
  const base100 = Math.floor(base * Math.pow(expE, 99));
  return Math.floor(base100 * Math.pow(expL, stage - 100));
}

export function getBossHp(stage: number): number {
  const { bossHpBase: base, scalingExponentEarly: expE, scalingExponentLate: expL } = ENEMY_CONFIG;
  if (stage <= 100) return Math.floor(base * Math.pow(expE, stage - 1));
  const base100 = Math.floor(base * Math.pow(expE, 99));
  return Math.floor(base100 * Math.pow(expL, stage - 100));
}

export function getEnemyTier(stage: number): number {
  return Math.min(Math.floor((stage - 1) / ENEMY_CONFIG.stagesPerTier), ENEMY_CONFIG.enemyNamesByTier.length - 1);
}

function getEnemyName(stage: number, isBoss: boolean): string {
  if (isBoss) {
    const idx = Math.floor((stage / 10 - 1)) % ENEMY_CONFIG.bossNames.length;
    return ENEMY_CONFIG.bossNames[idx];
  }
  const tier = Math.min(getEnemyTier(stage), ENEMY_CONFIG.enemyNamesByTier.length - 1);
  const names = ENEMY_CONFIG.enemyNamesByTier[tier];
  return names[Math.floor(Math.random() * names.length)];
}

export function spawnEnemy(stage: number): Enemy {
  const isBoss = stage % ENEMY_CONFIG.bossEveryNStages === 0;
  const isElite = !isBoss && stage > ENEMY_CONFIG.eliteMinStage && Math.random() < ENEMY_CONFIG.eliteChance;
  const hpMultiplier = isElite ? ENEMY_CONFIG.eliteHpMultiplier : 1;
  const baseHp = isBoss ? getBossHp(stage) : getEnemyHp(stage) * hpMultiplier;

  return {
    id: `enemy_${stage}_${Date.now()}`,
    name: isElite ? `[E] ${getEnemyName(stage, false)}` : getEnemyName(stage, isBoss),
    hp: baseHp,
    maxHp: baseHp,
    isBoss,
    tier: getEnemyTier(stage),
    enemyType: isBoss ? 'boss' : isElite ? 'elite' : 'normal',
    bossPhase: 'none',
    isElite,
    phaseThreshold: isBoss ? 0.5 : 0,
  };
}

export class EnemyPlugin implements IPlugin {
  id = 'enemy';
  dependencies = ['stage'];
  stateKeys = ['enemy', 'isBossActive', 'bossTimeRemaining', 'pendingBossReturn', 'pendingBossStage'] as (keyof GameState)[];

  private engine!: IEngine;
  private bossTimer = 0;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    engine.on('state_sync', (event: GameEvent<{ savedState: GameState } | null>) => {
      const stage = event.payload?.savedState?.stage ?? engine.state.stage;
      this.spawnForStage(stage);
    });

    engine.on('stage_clear', (event: GameEvent<{ stage: number }>) => {
      const clearedStage = event.payload.stage;
      const nextStage = clearedStage + 1;
      const pendingBoss = this.engine.state.pendingBossStage;
      if (this.engine.state.pendingBossReturn && clearedStage >= (pendingBoss ?? 0)) {
        // Player progressed past the pending boss stage legitimately — clear flag and advance
        this.engine.updateState({ pendingBossReturn: false, pendingBossStage: null });
        this.spawnForStage(nextStage);
      } else if (this.engine.state.pendingBossReturn && nextStage === pendingBoss) {
        // Next stage is the pending boss — skip it, respawn same stage to keep farming
        this.spawnForStage(clearedStage);
      } else {
        this.spawnForStage(nextStage);
      }
    });

    engine.on('overclock', () => {
      this.engine.updateState({ pendingBossReturn: false, pendingBossStage: null });
      this.spawnForStage(1);
    });
  }

  private spawnForStage(stage: number): void {
    const enemy = spawnEnemy(stage);
    const highestStage = Math.max(stage, this.engine.state.highestStage ?? 1);
    const maxStage = Math.max(highestStage, this.engine.state.maxStage ?? 1);
    this.engine.updateState({ enemy, stage, highestStage, maxStage });

    if (enemy.isBoss) {
      this.bossTimer = ENEMY_CONFIG.bossTimeoutSeconds;
      this.engine.updateState({ isBossActive: true, bossTimeRemaining: ENEMY_CONFIG.bossTimeoutSeconds });
      this.engine.emit('boss_spawn', { enemy });
    } else {
      this.engine.updateState({ isBossActive: false, bossTimeRemaining: 0 });
      this.engine.emit('enemy_spawn', { enemy });
    }
  }

  returnToBoss(): void {
    const bossStage = this.engine.state.pendingBossStage;
    if (!bossStage) return;
    this.engine.updateState({ pendingBossReturn: false, pendingBossStage: null });
    this.spawnForStage(bossStage);
  }

  applyDamage(amount: number): void {
    const state = this.engine.state;
    if (!state.enemy) return;

    let effectiveDamage = amount;

    if (state.enemy.bossPhase === 'shield') {
      effectiveDamage = Math.ceil(amount * ENEMY_CONFIG.bossShieldDamageMultiplier);
    }

    const newHp = Math.max(0, state.enemy.hp - effectiveDamage);
    const updatedEnemy = { ...state.enemy, hp: newHp };

    if (updatedEnemy.isBoss && updatedEnemy.bossPhase === 'none' && newHp <= updatedEnemy.maxHp * updatedEnemy.phaseThreshold) {
      const phases: Array<'shield' | 'enrage' | 'regen'> = ['shield', 'enrage', 'regen'];
      updatedEnemy.bossPhase = phases[Math.floor(Math.random() * phases.length)];
    }

    this.engine.updateState({
      enemy: updatedEnemy,
      totalDamageDealt: state.totalDamageDealt + effectiveDamage,
    });

    this.engine.emit('enemy_hit', { damage: effectiveDamage, hp: newHp, maxHp: state.enemy.maxHp });

    if (newHp <= 0) {
      this.handleEnemyDeath();
    }
  }

  private handleEnemyDeath(): void {
    const state = this.engine.state;
    if (!state.enemy) return;

    const goldMultiplier = state.enemy.isBoss ? ENEMY_CONFIG.bossGoldMultiplier : state.enemy.isElite ? ENEMY_CONFIG.eliteGoldMultiplier : ENEMY_CONFIG.normalGoldMultiplier;
    const goldReward = Math.floor(state.enemy.maxHp * goldMultiplier);
    this.engine.emit('enemy_death', { enemy: state.enemy, goldReward });
    this.engine.updateState({ isBossActive: false });
    this.engine.emit('stage_clear', { stage: state.stage, goldReward });
  }

  onTick(delta: number, state: GameState): void {
    if (!state.isBossActive) return;

    const skillPlugin = this.engine.getPlugin<SkillPlugin>('skill');
    const frozen = skillPlugin?.isFirewallActive() ?? false;

    if (!frozen) {
      this.bossTimer -= delta;
    }
    const remaining = Math.max(0, this.bossTimer);
    this.engine.updateState({ bossTimeRemaining: remaining });

    if (state.enemy?.bossPhase === 'regen' && state.enemy.hp < state.enemy.maxHp) {
      const regenAmount = Math.ceil(state.enemy.maxHp * ENEMY_CONFIG.bossRegenRatePerSecond * delta);
      const newHp = Math.min(state.enemy.maxHp, state.enemy.hp + regenAmount);
      this.engine.updateState({ enemy: { ...state.enemy, hp: newHp } });
    }

    if (remaining <= 0) {
      this.engine.updateState({
        isBossActive: false,
        pendingBossReturn: true,
        pendingBossStage: state.stage,
      });
      this.engine.emit('boss_timeout', { stage: state.stage });
      // Drop back one stage to farm normal enemies
      this.spawnForStage(Math.max(1, state.stage - 1));
    }
  }
}
