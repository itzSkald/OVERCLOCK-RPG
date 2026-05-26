import type { GameState } from './types';

export const DEFAULT_STATE: GameState = {
  stage: 1,
  highestStage: 1,
  enemy: null,
  gold: 0,
  overclockCount: 0,
  overclockUpgrades: {},
  components: {},
  artifacts: {},
  inventory: [],
  equippedItems: { RAM: null, GPU: null, CPU: null, EXPANSION: null },
  totalDamageDealt: 0,
  bossTimeRemaining: 30,
  isBossActive: false,
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
