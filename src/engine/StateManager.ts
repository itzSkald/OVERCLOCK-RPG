import type { GameState, SkillCooldownState, SkillId } from './types';

const DEFAULT_SKILL_COOLDOWN: SkillCooldownState = { readyAt: 0, activeUntil: 0 };

const DEFAULT_SKILL_COOLDOWNS: Record<SkillId, SkillCooldownState> = {
  surge: DEFAULT_SKILL_COOLDOWN,
  overclock_pulse: DEFAULT_SKILL_COOLDOWN,
  gold_rush: DEFAULT_SKILL_COOLDOWN,
  firewall: DEFAULT_SKILL_COOLDOWN,
  chain_hack: DEFAULT_SKILL_COOLDOWN,
};

export const DEFAULT_STATE: GameState = {
  stage: 1,
  highestStage: 1,
  enemy: null,
  gold: 0,
  overclockCount: 0,
  overclockTier: 0,
  totalOverclocks: 0,
  overclockUpgrades: {},
  components: {},
  artifacts: {},
  inventory: [],
  equippedItems: { RAM: [null], GPU: [null], CPU: [null], EXPANSION: [null] },
  motherboardTier: 0,
  ramSlots: 1,
  expansionSlots: 1,
  skillCooldowns: DEFAULT_SKILL_COOLDOWNS,
  totalDamageDealt: 0,
  bossTimeRemaining: 30,
  isBossActive: false,
  pendingBossReturn: false,
  pendingBossStage: null,
  diamonds: 0,
  lastSaveTime: Date.now(),
  lastTickTime: Date.now(),
  schemaVersion: 1,
};

type Listener = (state: GameState) => void;

export class StateManager {
  private state: GameState;
  private listeners = new Set<Listener>();

  constructor(initial?: Partial<GameState>) {
    this.state = { ...DEFAULT_STATE, ...initial };
  }

  get(): GameState {
    return this.state;
  }

  update(partial: Partial<GameState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  replace(next: GameState): void {
    this.state = next;
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
