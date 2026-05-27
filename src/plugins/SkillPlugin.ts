import type { IPlugin, IEngine, GameState, SkillDef, SkillId, SkillCooldownState } from '../engine/types';
import type { EnemyPlugin } from './EnemyPlugin';

export const SKILLS: SkillDef[] = [
  {
    id: 'surge',
    name: 'SURGE',
    description: 'Tap damage x10 for 5s',
    cooldown: 30,
    duration: 5,
    color: '#00f5ff',
    icon: 'Zap',
    unlockStage: 1,
  },
  {
    id: 'overclock_pulse',
    name: 'OC PULSE',
    description: 'Idle DPS x5 for 8s',
    cooldown: 45,
    duration: 8,
    color: '#ff0080',
    icon: 'Cpu',
    unlockStage: 5,
  },
  {
    id: 'gold_rush',
    name: 'GOLD RUSH',
    description: 'Gold gain x3 for 10s',
    cooldown: 60,
    duration: 10,
    color: '#ffaa00',
    icon: 'Coins',
    unlockStage: 10,
  },
  {
    id: 'firewall',
    name: 'FIREWALL',
    description: 'Block boss timer for 8s',
    cooldown: 90,
    duration: 8,
    color: '#39ff14',
    icon: 'Shield',
    unlockStage: 15,
  },
  {
    id: 'chain_hack',
    name: 'CHAIN HACK',
    description: 'Auto-tap 20x/s for 6s',
    cooldown: 50,
    duration: 6,
    color: '#ff4444',
    icon: 'Link',
    unlockStage: 20,
  },
];

export class SkillPlugin implements IPlugin {
  id = 'skill';
  dependencies = ['enemy', 'tap'];
  stateKeys = ['skillCooldowns'] as (keyof GameState)[];
  defaultState = {
    skillCooldowns: {
      surge: { readyAt: 0, activeUntil: 0 },
      overclock_pulse: { readyAt: 0, activeUntil: 0 },
      gold_rush: { readyAt: 0, activeUntil: 0 },
      firewall: { readyAt: 0, activeUntil: 0 },
      chain_hack: { readyAt: 0, activeUntil: 0 },
    },
  };

  private engine!: IEngine;
  private chainHackInterval: ReturnType<typeof setInterval> | null = null;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;
  }

  activateSkill(skillId: SkillId): boolean {
    const skill = SKILLS.find(s => s.id === skillId);
    if (!skill) return false;

    const now = Date.now();
    const cooldowns = this.engine.state.skillCooldowns;
    const cd = cooldowns[skillId];

    if (cd.readyAt > now) return false;
    if (this.engine.state.highestStage < skill.unlockStage) return false;

    const newCd: SkillCooldownState = {
      readyAt: now + skill.cooldown * 1000,
      activeUntil: now + skill.duration * 1000,
    };

    this.engine.updateState({
      skillCooldowns: { ...cooldowns, [skillId]: newCd },
    });

    this.applySkillEffect(skill);
    this.engine.emit('skill_activated', { skillId, skill });
    return true;
  }

  private applySkillEffect(skill: SkillDef): void {
    switch (skill.id) {
      case 'surge':
        this.engine.addModifier(this.modKey('surge'), { type: 'tap_damage', value: 10, isMultiplier: true });
        setTimeout(() => this.engine.removeModifiers(this.modKey('surge')), skill.duration * 1000);
        break;

      case 'overclock_pulse':
        this.engine.addModifier(this.modKey('overclock_pulse'), { type: 'idle_dps', value: 5, isMultiplier: true });
        setTimeout(() => this.engine.removeModifiers(this.modKey('overclock_pulse')), skill.duration * 1000);
        break;

      case 'gold_rush':
        this.engine.addModifier(this.modKey('gold_rush'), { type: 'gold_rate', value: 3, isMultiplier: true });
        setTimeout(() => this.engine.removeModifiers(this.modKey('gold_rush')), skill.duration * 1000);
        break;

      case 'firewall':
        this.engine.addModifier(this.modKey('firewall'), { type: 'idle_dps', value: 1, isMultiplier: true });
        setTimeout(() => this.engine.removeModifiers(this.modKey('firewall')), skill.duration * 1000);
        break;

      case 'chain_hack':
        this.startChainHack(skill.duration);
        break;
    }
  }

  private startChainHack(duration: number): void {
    if (this.chainHackInterval) clearInterval(this.chainHackInterval);

    this.chainHackInterval = setInterval(() => {
      const enemyPlugin = this.engine.getPlugin<EnemyPlugin>('enemy');
      if (!enemyPlugin || !this.engine.state.enemy) return;
      const tapDmg = this.engine.getModifier('tap_damage');
      enemyPlugin.applyDamage(Math.ceil(tapDmg));
      this.engine.emit('damage_number', {
        id: `chain_${Date.now()}_${Math.random()}`,
        value: Math.ceil(tapDmg),
        type: 'normal' as const,
      });
    }, 50);

    setTimeout(() => {
      if (this.chainHackInterval) {
        clearInterval(this.chainHackInterval);
        this.chainHackInterval = null;
      }
    }, duration * 1000);
  }

  isSkillActive(skillId: SkillId): boolean {
    const cd = this.engine.state.skillCooldowns[skillId];
    return cd.activeUntil > Date.now();
  }

  isFirewallActive(): boolean {
    return this.isSkillActive('firewall');
  }

  getUnlockedSkills(): SkillDef[] {
    return SKILLS.filter(s => this.engine.state.stage >= s.unlockStage || this.engine.state.highestStage >= s.unlockStage);
  }

  private modKey(skillId: string): string {
    return `skill_${skillId}`;
  }

  cleanup(): void {
    if (this.chainHackInterval) {
      clearInterval(this.chainHackInterval);
      this.chainHackInterval = null;
    }
    for (const skill of SKILLS) {
      this.engine?.removeModifiers(this.modKey(skill.id));
    }
  }
}
