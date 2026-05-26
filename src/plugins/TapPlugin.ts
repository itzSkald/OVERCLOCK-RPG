import type { IPlugin, IEngine, GameState } from '../engine/types';
import type { EnemyPlugin } from './EnemyPlugin';
import type { DamageNumberEvent } from '../engine/types';

const BASE_TAP_DAMAGE = 1;
const CRIT_CHANCE = 0.1;
const CRIT_MULTIPLIER = 5;
const COMBO_WINDOW_MS = 800;
const COMBO_THRESHOLD = 5;
const COMBO_MULTIPLIER = 2;

export class TapPlugin implements IPlugin {
  id = 'tap';
  dependencies = ['enemy'];

  private engine!: IEngine;
  private comboCount = 0;
  private lastTapTime = 0;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;
  }

  tap(x?: number, y?: number): void {
    const state = this.engine.state;
    if (!state.enemy || state.enemy.hp <= 0) return;

    const now = Date.now();
    if (now - this.lastTapTime < COMBO_WINDOW_MS) {
      this.comboCount++;
    } else {
      this.comboCount = 1;
    }
    this.lastTapTime = now;

    const isCrit = Math.random() < (CRIT_CHANCE + this.engine.getModifier('crit_chance') - 1);
    const comboBonus = this.comboCount >= COMBO_THRESHOLD ? COMBO_MULTIPLIER : 1;
    const tapDamage = this.engine.getModifier('tap_damage') * BASE_TAP_DAMAGE;

    let damage = tapDamage * comboBonus;
    if (isCrit) damage *= (CRIT_MULTIPLIER * this.engine.getModifier('crit_multiplier'));
    damage = Math.ceil(damage);

    const dmgEvent: DamageNumberEvent = {
      id: `dmg_${Date.now()}_${Math.random()}`,
      value: damage,
      type: isCrit ? 'crit' : 'normal',
      x,
      y,
    };
    this.engine.emit('damage_number', dmgEvent);

    const enemyPlugin = this.engine.getPlugin<EnemyPlugin>('enemy');
    enemyPlugin?.applyDamage(damage);
  }

  onTick(_delta: number, _state: GameState): void {}
}
