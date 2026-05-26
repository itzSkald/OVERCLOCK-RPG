import type { IPlugin, IEngine, GameState, Enemy, GameEvent } from '../engine/types';

const ENEMY_NAMES_BY_TIER = [
  ['MALWARE.BAT', 'CORRUPT_PROC', 'NULL_PTR', 'STACK_OVERFLOW'],
  ['VIRUS_V2', 'RANSOMWARE', 'ROOTKIT', 'KEYLOGGER'],
  ['BOTNET_NODE', 'CRYPTOMINER', 'SQL_INJECT', 'XSS_WORM'],
  ['ROGUE_AI_v1', 'DEEPFAKE_BOT', 'ZERO_DAY', 'APT_GHOST'],
  ['SINGULARITY', 'DAEMON_CORE', 'KERNEL_PANIC', 'BLUE_SCREEN'],
];

const BOSS_NAMES = [
  'THE_FIREWALL', 'DARK_ANTIVIRUS', 'CHAOS_KERNEL',
  'OMEGA_ROOTKIT', 'SYSTEM32_WRAITH', 'BIOS_CORRUPTION',
  'QUANTUM_MALWARE', 'THE_NULL_GOD',
];

export function getEnemyHp(stage: number): number {
  return Math.floor(10 * Math.pow(1.5, stage - 1));
}

export function getBossHp(stage: number): number {
  return Math.floor(50 * Math.pow(1.5, stage - 1));
}

export function getEnemyTier(stage: number): number {
  return Math.floor((stage - 1) / 10);
}

function getEnemyName(stage: number, isBoss: boolean): string {
  if (isBoss) {
    const idx = Math.floor((stage / 10 - 1)) % BOSS_NAMES.length;
    return BOSS_NAMES[idx];
  }
  const tier = Math.min(getEnemyTier(stage), ENEMY_NAMES_BY_TIER.length - 1);
  const names = ENEMY_NAMES_BY_TIER[tier];
  return names[Math.floor(Math.random() * names.length)];
}

export function spawnEnemy(stage: number): Enemy {
  const isBoss = stage % 10 === 0;
  return {
    id: `enemy_${stage}_${Date.now()}`,
    name: getEnemyName(stage, isBoss),
    hp: isBoss ? getBossHp(stage) : getEnemyHp(stage),
    maxHp: isBoss ? getBossHp(stage) : getEnemyHp(stage),
    isBoss,
    tier: getEnemyTier(stage),
  };
}

export class EnemyPlugin implements IPlugin {
  id = 'enemy';
  dependencies = ['stage'];
  stateKeys = ['enemy', 'isBossActive', 'bossTimeRemaining'] as (keyof GameState)[];

  private engine!: IEngine;
  private bossTimer = 0;
  private readonly BOSS_TIMEOUT = 30;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    engine.on('state_sync', (event: GameEvent<{ savedState: GameState } | null>) => {
      const stage = event.payload?.savedState?.stage ?? engine.state.stage;
      this.spawnForStage(stage);
    });

    engine.on('stage_clear', (event: GameEvent<{ stage: number }>) => {
      this.spawnForStage(event.payload.stage + 1);
    });

    engine.on('overclock', () => {
      this.spawnForStage(1);
    });
  }

  private spawnForStage(stage: number): void {
    const enemy = spawnEnemy(stage);
    const highestStage = Math.max(stage, this.engine.state.highestStage ?? 1);
    this.engine.updateState({ enemy, stage, highestStage });

    if (enemy.isBoss) {
      this.bossTimer = this.BOSS_TIMEOUT;
      this.engine.updateState({ isBossActive: true, bossTimeRemaining: this.BOSS_TIMEOUT });
      this.engine.emit('boss_spawn', { enemy });
    } else {
      this.engine.updateState({ isBossActive: false, bossTimeRemaining: 0 });
      this.engine.emit('enemy_spawn', { enemy });
    }
  }

  applyDamage(amount: number): void {
    const state = this.engine.state;
    if (!state.enemy) return;

    const newHp = Math.max(0, state.enemy.hp - amount);
    const updatedEnemy = { ...state.enemy, hp: newHp };

    this.engine.updateState({
      enemy: updatedEnemy,
      totalDamageDealt: state.totalDamageDealt + amount,
    });

    this.engine.emit('enemy_hit', { damage: amount, hp: newHp, maxHp: state.enemy.maxHp });

    if (newHp <= 0) {
      this.handleEnemyDeath();
    }
  }

  private handleEnemyDeath(): void {
    const state = this.engine.state;
    if (!state.enemy) return;

    const goldReward = Math.floor(state.enemy.maxHp * (state.enemy.isBoss ? 5 : 1));
    this.engine.emit('enemy_death', { enemy: state.enemy, goldReward });
    this.engine.updateState({ isBossActive: false });
    this.engine.emit('stage_clear', { stage: state.stage, goldReward });
  }

  onTick(delta: number, state: GameState): void {
    if (!state.isBossActive) return;

    this.bossTimer -= delta;
    const remaining = Math.max(0, this.bossTimer);
    this.engine.updateState({ bossTimeRemaining: remaining });

    if (remaining <= 0) {
      this.engine.updateState({ isBossActive: false });
      this.engine.emit('boss_timeout', { stage: state.stage });
      this.spawnForStage(Math.max(1, state.stage - 1));
    }
  }
}
