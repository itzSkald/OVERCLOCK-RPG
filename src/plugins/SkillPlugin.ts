import type { IPlugin, IEngine, GameState, SkillDef, SkillId, SkillCooldownState } from '../engine/types';
import type { EnemyPlugin } from './EnemyPlugin';
import {
  BRANCH_SKILL_UNLOCKS,
  BRANCH_COLORS,
  isBranchSkillUnlocked,
  type PerkBranch,
} from './OverclockPlugin';

// Base stage-unlocked skills
export const BASE_SKILLS: SkillDef[] = [
  {
    id: 'surge',
    name: 'SURGE',
    description: 'Tap damage ×10 for 5s',
    cooldown: 30,
    duration: 5,
    color: '#00f5ff',
    icon: 'Zap',
    unlockStage: 1,
  },
  {
    id: 'overclock_pulse',
    name: 'OC PULSE',
    description: 'Idle DPS ×5 for 8s',
    cooldown: 45,
    duration: 8,
    color: '#ff0080',
    icon: 'Cpu',
    unlockStage: 5,
  },
  {
    id: 'gold_rush',
    name: 'GOLD RUSH',
    description: 'Gold gain ×3 for 10s',
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
    description: 'Auto-tap 20×/s for 6s',
    cooldown: 50,
    duration: 6,
    color: '#ff4444',
    icon: 'Link',
    unlockStage: 20,
  },
];

// Branch-exclusive skills — unlocked via overclock path investment
export const BRANCH_SKILLS: SkillDef[] = [
  {
    id: 'static_discharge',
    name: 'STATIC DISCHARGE',
    description: 'Instant 500× tap burst',
    cooldown: 120,
    duration: 0,
    color: BRANCH_COLORS.VOLTAGE,
    icon: 'Zap',
    unlockStage: 9999,
  },
  {
    id: 'signal_jam',
    name: 'SIGNAL JAM',
    description: '×2 gold rate for 15s',
    cooldown: 90,
    duration: 15,
    color: BRANCH_COLORS.SIGNAL,
    icon: 'Wifi',
    unlockStage: 9999,
  },
  {
    id: 'meltdown',
    name: 'MELTDOWN',
    description: '×20 idle DPS for 10s',
    cooldown: 100,
    duration: 10,
    color: BRANCH_COLORS.THERMAL,
    icon: 'Flame',
    unlockStage: 9999,
  },
  {
    id: 'entropy_burst',
    name: 'ENTROPY BURST',
    description: '×3 tap + ×3 gold for 8s',
    cooldown: 110,
    duration: 8,
    color: BRANCH_COLORS.ENTROPY,
    icon: 'Shuffle',
    unlockStage: 9999,
  },
  {
    id: 'quantum_echo',
    name: 'QUANTUM ECHO',
    description: 'Activate all skills instantly',
    cooldown: 180,
    duration: 0,
    color: BRANCH_COLORS.QUANTUM,
    icon: 'Infinity',
    unlockStage: 9999,
  },
];

export const SKILLS: SkillDef[] = [...BASE_SKILLS, ...BRANCH_SKILLS];

const BRANCHES: PerkBranch[] = ['VOLTAGE', 'SIGNAL', 'THERMAL', 'ENTROPY', 'QUANTUM'];

const BRANCH_SKILL_ID_MAP: Record<PerkBranch, SkillId> = {
  VOLTAGE: 'static_discharge',
  SIGNAL:  'signal_jam',
  THERMAL: 'meltdown',
  ENTROPY: 'entropy_burst',
  QUANTUM: 'quantum_echo',
};

const DEFAULT_CD: SkillCooldownState = { readyAt: 0, activeUntil: 0 };

export class SkillPlugin implements IPlugin {
  id = 'skill';
  dependencies = ['enemy', 'tap'];
  stateKeys = ['skillCooldowns'] as (keyof GameState)[];
  defaultState = {
    skillCooldowns: {
      surge:             { ...DEFAULT_CD },
      overclock_pulse:   { ...DEFAULT_CD },
      gold_rush:         { ...DEFAULT_CD },
      firewall:          { ...DEFAULT_CD },
      chain_hack:        { ...DEFAULT_CD },
      static_discharge:  { ...DEFAULT_CD },
      signal_jam:        { ...DEFAULT_CD },
      meltdown:          { ...DEFAULT_CD },
      entropy_burst:     { ...DEFAULT_CD },
      quantum_echo:      { ...DEFAULT_CD },
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
    const cd = cooldowns[skillId] ?? DEFAULT_CD;

    if (cd.readyAt > now) return false;
    if (!this.isSkillAccessible(skillId)) return false;

    const newCd: SkillCooldownState = {
      readyAt: now + skill.cooldown * 1000,
      activeUntil: skill.duration > 0 ? now + skill.duration * 1000 : 0,
    };

    this.engine.updateState({
      skillCooldowns: { ...cooldowns, [skillId]: newCd },
    });

    this.applySkillEffect(skill);
    this.engine.emit('skill_activated', { skillId, skill });
    return true;
  }

  isSkillAccessible(skillId: SkillId): boolean {
    const skill = SKILLS.find(s => s.id === skillId);
    if (!skill) return false;
    const state = this.engine.state;
    if (skill.unlockStage < 9999) {
      return state.stage >= skill.unlockStage || state.highestStage >= skill.unlockStage;
    }
    const upgrades = state.overclockUpgrades ?? {};
    const branch = this.getBranchForSkill(skillId);
    if (!branch) return false;
    return isBranchSkillUnlocked(upgrades, branch);
  }

  private getBranchForSkill(skillId: SkillId): PerkBranch | null {
    for (const branch of BRANCHES) {
      if (BRANCH_SKILL_ID_MAP[branch] === skillId) return branch;
    }
    return null;
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
        // No modifier — isFirewallActive() is polled by StagePlugin
        break;

      case 'chain_hack':
        this.startChainHack(skill.duration);
        break;

      case 'static_discharge': {
        const enemyPlugin = this.engine.getPlugin<EnemyPlugin>('enemy');
        if (enemyPlugin && this.engine.state.enemy) {
          const burst = Math.ceil(this.engine.getModifier('tap_damage') * 500);
          enemyPlugin.applyDamage(burst);
          this.engine.emit('damage_number', {
            id: `discharge_${Date.now()}`,
            value: burst,
            type: 'boss' as const,
          });
        }
        break;
      }

      case 'signal_jam':
        this.engine.addModifier(this.modKey('signal_jam'), { type: 'gold_rate', value: 2, isMultiplier: true });
        setTimeout(() => this.engine.removeModifiers(this.modKey('signal_jam')), skill.duration * 1000);
        break;

      case 'meltdown':
        this.engine.addModifier(this.modKey('meltdown'), { type: 'idle_dps', value: 20, isMultiplier: true });
        setTimeout(() => this.engine.removeModifiers(this.modKey('meltdown')), skill.duration * 1000);
        break;

      case 'entropy_burst':
        this.engine.addModifier(this.modKey('entropy_burst_tap'),  { type: 'tap_damage', value: 3, isMultiplier: true });
        this.engine.addModifier(this.modKey('entropy_burst_gold'), { type: 'gold_rate',  value: 3, isMultiplier: true });
        setTimeout(() => {
          this.engine.removeModifiers(this.modKey('entropy_burst_tap'));
          this.engine.removeModifiers(this.modKey('entropy_burst_gold'));
        }, skill.duration * 1000);
        break;

      case 'quantum_echo': {
        // Zero out all base skill cooldowns then activate each
        const zeroed: Partial<GameState['skillCooldowns']> = {};
        for (const s of BASE_SKILLS) {
          zeroed[s.id] = { readyAt: 0, activeUntil: 0 };
        }
        this.engine.updateState({ skillCooldowns: { ...this.engine.state.skillCooldowns, ...zeroed } });
        let delay = 10;
        for (const s of BASE_SKILLS) {
          setTimeout(() => { this.activateSkill(s.id); }, delay);
          delay += 20;
        }
        break;
      }
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
    const cd = this.engine.state.skillCooldowns[skillId] ?? DEFAULT_CD;
    return cd.activeUntil > Date.now();
  }

  isFirewallActive(): boolean {
    return this.isSkillActive('firewall');
  }

  getUnlockedSkills(): SkillDef[] {
    return SKILLS.filter(s => this.isSkillAccessible(s.id));
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
    this.engine?.removeModifiers(this.modKey('entropy_burst_tap'));
    this.engine?.removeModifiers(this.modKey('entropy_burst_gold'));
  }
}
