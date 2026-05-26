// =====================================================================
// Core engine types - zero external dependencies
// =====================================================================

export type GameEventType =
  | 'tap'
  | 'tick'
  | 'stage_clear'
  | 'boss_spawn'
  | 'boss_timeout'
  | 'boss_defeat'
  | 'component_purchase'
  | 'component_levelup'
  | 'overclock'
  | 'overclock_confirm'
  | 'player_joined'
  | 'player_tap'
  | 'state_sync'
  | 'save_requested'
  | 'save_complete'
  | 'auth_success'
  | 'auth_failed'
  | 'auth_signout'
  | 'auth_awaiting_confirmation'
  | 'gold_changed'
  | 'enemy_hit'
  | 'enemy_death'
  | 'enemy_spawn'
  | 'damage_number'
  | 'skill_activated'
  | 'offline_progress'
  | 'boot_log'
  | 'zone_changed'
  | 'item_drop'
  | 'item_equipped'
  | 'item_unequipped';

export interface GameEvent<T = unknown> {
  type: GameEventType;
  payload: T;
  timestamp: number;
}

export type EventHandler<T = unknown> = (event: GameEvent<T>) => void;

export interface Player {
  id: string;
  handle: string;
  avatarIndex: number;
}

export interface Enemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  isBoss: boolean;
  tier: number;
}

export interface ComponentDef {
  id: string;
  name: string;
  description: string;
  baseDps: number;
  baseCost: number;
  costMultiplier: number;
  level: number;
  unlocked: boolean;
  color: 'cyan' | 'green' | 'pink' | 'amber';
}

export interface ArtifactDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  purchased: boolean;
  modifier: ModifierDef;
}

export interface ModifierDef {
  type: 'tap_damage' | 'idle_dps' | 'gold_rate' | 'crit_chance' | 'crit_multiplier';
  value: number;
  isMultiplier: boolean;
}

export type ItemSlot = 'RAM' | 'GPU' | 'CPU' | 'EXPANSION';
export type ItemRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export interface HardwareItem {
  id: string;
  name: string;
  slot: ItemSlot;
  rarity: ItemRarity;
  tier: number;
  stats: ModifierDef[];
  flavorText: string;
  droppedAt: number;
}

export interface OverclockUpgrade {
  id: string;
  level: number;
}

export interface GameState {
  stage: number;
  highestStage: number;
  enemy: Enemy | null;
  gold: number;
  overclockCount: number;
  overclockUpgrades: Record<string, OverclockUpgrade>;
  components: Record<string, ComponentDef>;
  artifacts: Record<string, ArtifactDef>;
  inventory: HardwareItem[];
  equippedItems: Record<ItemSlot, HardwareItem | null>;
  totalDamageDealt: number;
  bossTimeRemaining: number;
  isBossActive: boolean;
  lastSaveTime: number;
  lastTickTime: number;
  schemaVersion: number;
}

export interface DamageNumberEvent {
  id: string;
  value: number;
  type: 'normal' | 'crit' | 'idle' | 'boss';
  x?: number;
  y?: number;
}

export type PluginRole = 'auth' | 'persistence' | 'realtime' | 'tick_provider' | 'ui_registry';

export interface IPlugin {
  id: string;
  dependencies?: string[];
  roles?: PluginRole[];
  defaultState?: Partial<GameState>;
  stateKeys?: (keyof GameState)[];

  init(engine: IEngine): Promise<void>;
  onTick?(delta: number, state: GameState): void;
  onEvent?(event: GameEvent): void;
  cleanup?(): void;
}

export interface IPluginStorage {
  registerTable(pluginId: string, adapter: { table: string; userScoped: boolean }): void;
  load<T = unknown>(table: string, filters: Record<string, unknown>, select?: string): Promise<{ data: T | null; error: string | null }>;
  loadMany<T = unknown>(table: string, filters: Record<string, unknown>, select?: string): Promise<{ data: T[]; error: string | null }>;
  save(table: string, data: Record<string, unknown>, conflictKey?: string): Promise<{ error: string | null }>;
  insert<T = unknown>(table: string, data: Record<string, unknown>, select?: string): Promise<{ data: T | null; error: string | null }>;
  remove(table: string, filters: Record<string, unknown>): Promise<{ error: string | null }>;
}

export interface IEngine {
  state: GameState;
  storage: IPluginStorage;
  emit<T>(type: GameEventType, payload: T): void;
  on<T>(type: GameEventType, handler: EventHandler<T>): () => void;
  off<T>(type: GameEventType, handler: EventHandler<T>): void;
  getPlugin<T extends IPlugin>(id: string): T | undefined;
  updateState(partial: Partial<GameState>): void;
  getModifier(type: ModifierDef['type']): number;
  addModifier(pluginId: string, modifier: ModifierDef): void;
  removeModifiers(pluginId: string): void;
  getPluginStateKeys(): (keyof GameState)[];
  getPluginDefaults(): Partial<GameState>;
}
