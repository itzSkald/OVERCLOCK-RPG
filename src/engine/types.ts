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
  | 'skill_point_earned'
  | 'offline_progress'
  | 'boot_log'
  | 'zone_changed'
  | 'item_drop'
  | 'item_equipped'
  | 'item_unequipped'
  | 'mobo_upgrade'
  | 'daily_completed'
  | 'achievement_unlocked'
  | 'diamonds_earned'
  | 'shop_purchase'
  | 'tournament_joined'
  | 'tournament_score_update'
  | 'set_completed'
  | 'set_item_added'
  | 'item_scrapped'
  | 'hero_upgrade'
  | 'skill_upgrade';

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

export type EnemyType = 'normal' | 'elite' | 'boss';
export type BossPhase = 'none' | 'shield' | 'enrage' | 'regen';

export interface Enemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  isBoss: boolean;
  tier: number;
  enemyType: EnemyType;
  bossPhase: BossPhase;
  isElite: boolean;
  phaseThreshold: number;
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
export type ItemRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';

export interface HardwareItem {
  id: string;
  name: string;
  slot: ItemSlot;
  rarity: ItemRarity;
  tier: number;
  stats: ModifierDef[];
  flavorText: string;
  droppedAt: number;
  setId?: string;
}

export interface SetPieceDef {
  name: string;
  slot: ItemSlot;
  stats: ModifierDef[];
  flavorText: string;
}

export interface SetDef {
  id: string;
  name: string;
  description: string;
  color: string;
  pieces: SetPieceDef[];
  setBonusDescription: string;
  setBonus: ModifierDef[];
}

export interface OverclockUpgrade {
  id: string;
  level: number;
}

export type SkillId =
  | 'surge'
  | 'overclock_pulse'
  | 'gold_rush'
  | 'firewall'
  | 'chain_hack'
  | 'static_discharge'
  | 'signal_jam'
  | 'meltdown'
  | 'entropy_burst'
  | 'quantum_echo';

export interface SkillDef {
  id: SkillId;
  name: string;
  description: string;
  cooldown: number;
  duration: number;
  color: string;
  icon: string;
  unlockStage: number;
}

export interface SkillCooldownState {
  readyAt: number;
  activeUntil: number;
}

export interface GameState {
  stage: number;
  highestStage: number;
  maxStage: number;
  tournamentMaxStage: number;
  tournamentSessionId: string | null;
  enemy: Enemy | null;
  gold: number;
  overclockCount: number;
  overclockTier: number;
  totalOverclocks: number;
  overclockUpgrades: Record<string, OverclockUpgrade>;
  components: Record<string, ComponentDef>;
  artifacts: Record<string, ArtifactDef>;
  inventory: HardwareItem[];
  equippedItems: Record<ItemSlot, (HardwareItem | null)[]>;
  motherboardTier: number;
  ramSlots: number;
  expansionSlots: number;
  skillCooldowns: Record<SkillId, SkillCooldownState>;
  totalDamageDealt: number;
  bossTimeRemaining: number;
  isBossActive: boolean;
  pendingBossReturn: boolean;
  pendingBossStage: number | null;
  diamonds: number;
  skillPoints: number;
  claimedSkillPointMilestones: number[];
  setItems: HardwareItem[];
  collectedSets: Record<string, boolean>;
  scrap: number;
  // Hero upgrades (tap power, crit chance, crit damage)
  heroUpgrades: Record<string, number>;
  // Skill level upgrades
  skillUpgrades: Record<SkillId, number>;
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

/** Column definition for auto-schema creation */
export interface ColumnDef {
  name: string;
  type: string;
  primaryKey?: boolean;
  default?: string;
  nullable?: boolean;
  unique?: boolean;
  references?: { table: string; column: string; onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' };
  check?: string;
}

/** Index definition for auto-schema creation */
export interface IndexDef {
  name: string;
  columns: string[];
  unique?: boolean;
}

/** RLS policy definition for auto-schema creation */
export interface RLSPolicy {
  name: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  using?: string;
  withCheck?: string;
}

/** Table schema definition - plugins define this to auto-create their database tables */
export interface TableSchema {
  name: string;
  columns: ColumnDef[];
  indexes?: IndexDef[];
  rls?: RLSPolicy[];
}

export interface IPlugin {
  id: string;
  dependencies?: string[];
  roles?: PluginRole[];
  defaultState?: Partial<GameState>;
  stateKeys?: (keyof GameState)[];
  
  /** Optional: Define database tables this plugin requires. Auto-created on engine boot. */
  schema?: TableSchema[];

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
