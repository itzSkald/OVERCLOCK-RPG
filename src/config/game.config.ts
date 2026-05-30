// ─────────────────────────────────────────────────────────────────────────────
// OVERCLOCK — Central Game Config
//
// Every tunable constant in the game lives here. Plugins import from this file;
// they never declare their own magic numbers.
//
// Sections:
//   ENGINE       — tick rate, boot, save
//   TAP          — base tap damage, crit, combo
//   ENEMY        — HP scaling, boss spawn, elite chance, names
//   OVERCLOCK    — tiers, perks, gain formula, milestones
//   SKILLS       — all 10 skill definitions
//   COMPONENTS   — all 50 idle-DPS components
//   MOTHERBOARD  — all 8 board tiers
//   ITEMS        — loot drop, rarity, stat formulas, name pools
//   SHOP         — OCT and diamond catalog (26 items)
//   DAILIES      — challenge templates and reward formulas
//   SETS         — the 3 set item collections
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ComponentDef,
  SkillDef,
  ModifierDef,
  ItemSlot,
  ItemRarity,
  SetDef,
  SkillId,
} from '../engine/types';

// ── ENGINE ────────────────────────────────────────────────────────────────────

export const ENGINE_CONFIG = {
  /** Game tick interval in milliseconds. All onTick() calls fire at this rate. */
  tickIntervalMs: 100,
  /** How long BootScreen waits before forcing a safe-mode transition (ms). */
  bootTimeoutMs: 10_000,
  /** Delay after boot() resolves before checking existing auth session (ms). */
  authCheckDelayMs: 300,
} as const;

// ── SAVE ─────────────────────────────────────────────────────────────────────

export const SAVE_CONFIG = {
  /** Auto-save interval in milliseconds. */
  autoSaveIntervalMs: 30_000,
  /** Schema version stamped on every save. Increment when the save shape changes. */
  schemaVersion: 1,
  /** Minimum offline seconds before idle-gold calculation kicks in. */
  offlineMinSeconds: 5,
  /** Fraction of idle DPS credited as offline gold (0.5 = 50%). */
  offlineGoldMultiplier: 0.5,
  /** Maximum offline seconds that count toward idle gold (8 hours). */
  offlineCapSeconds: 8 * 3600,
} as const;

// ── TAP ──────────────────────────────────────────────────────────────────────

export const TAP_CONFIG = {
  /** Raw tap damage before any modifiers. */
  baseDamage: 1,
  /** Base crit chance (0–1). Additive with modifier stack. */
  baseCritChance: 0.1,
  /** Base crit damage multiplier. Multiplicative with crit_multiplier modifiers. */
  baseCritMultiplier: 5,
  /** Window (ms) within which rapid taps build a combo. */
  comboWindowMs: 800,
  /** Number of taps within the window required to activate combo bonus. */
  comboThreshold: 5,
  /** Damage multiplier applied when the combo threshold is met. */
  comboMultiplier: 2,
} as const;

// ── ENEMY ─────────────────────────────────────────────────────────────────────

export const ENEMY_CONFIG = {
  /** Boss spawns when stage % bossEveryNStages === 0. */
  bossEveryNStages: 10,
  /** Seconds before a boss times out and the player is sent back. */
  bossTimeoutSeconds: 30,
  /** Minimum stage before elite enemies can appear. */
  eliteMinStage: 3,
  /** Probability (0–1) that a non-boss enemy is elite. */
  eliteChance: 0.15,
  /** HP multiplier for elite enemies. */
  eliteHpMultiplier: 3,
  /** Gold multiplier for elite kills. */
  eliteGoldMultiplier: 3,
  /** Gold multiplier for boss kills. */
  bossGoldMultiplier: 5,
  /** Gold multiplier for normal enemy kills. */
  normalGoldMultiplier: 1,
  /** Boss phase triggers when HP drops below this fraction of max. */
  bossPhaseThreshold: 0.5,
  /** Damage multiplier when boss is in shield phase. */
  bossShieldDamageMultiplier: 0.3,
  /** Fraction of max HP regenerated per second in regen phase. */
  bossRegenRatePerSecond: 0.02,
  /** Number of stages per enemy tier bracket. */
  stagesPerTier: 50,

  // HP scaling formula:
  //   stage ≤ 100 : base * scalingExponentEarly ^ (stage - 1)
  //   stage > 100 : base100 * scalingExponentLate ^ (stage - 100)
  normalHpBase: 10,
  bossHpBase: 50,
  scalingExponentEarly: 1.5,
  scalingExponentLate: 1.12,

  /** Enemy name pools, indexed by tier (one tier = 50 stages). */
  enemyNamesByTier: [
    ['MALWARE.BAT', 'CORRUPT_PROC', 'NULL_PTR', 'STACK_OVERFLOW', 'SPAM_BOT', 'ADWARE.EXE'],
    ['VIRUS_V2', 'RANSOMWARE', 'ROOTKIT', 'KEYLOGGER', 'PHISH_AGENT', 'TROJAN_HORSE'],
    ['BOTNET_NODE', 'CRYPTOMINER', 'SQL_INJECT', 'XSS_WORM', 'DNS_POISON', 'MAN_IN_MIDDLE'],
    ['ROGUE_AI_v1', 'DEEPFAKE_BOT', 'ZERO_DAY', 'APT_GHOST', 'SHADOW_PROCESS', 'DARK_PACKET'],
    ['SINGULARITY', 'DAEMON_CORE', 'KERNEL_PANIC', 'BLUE_SCREEN', 'VOID_THREAD', 'NULL_DAEMON'],
    ['SHADOW_NET', 'DARK_PROTOCOL', 'ENTROPY_SPIKE', 'PHANTOM_ROOT', 'MEMORY_LEAK', 'RACE_CONDITION'],
    ['QUANTUM_GHOST', 'NULL_DAEMON_v2', 'SCHRODINGER_BUG', 'ENTANGLED_PROC', 'WAVE_COLLAPSE', 'QUBIT_STORM'],
    ['VOID_ARCHITECT', 'SIGNAL_WRAITH', 'DEAD_CODE_GOD', 'RECURSIVE_HELL', 'INFINITE_LOOP', 'STACK_DEITY'],
    ['SILICON_HORROR', 'LOGIC_ABOMINATION', 'CORRUPT_COSMOS', 'DATA_ABYSS', 'TERMINAL_WRAITH', 'EXEC_PHANTOM'],
    ['OMEGA_PROCESS', 'THE_LAST_BIT', 'FINAL_EXCEPTION', 'END_OF_STACK', 'HEAT_DEATH_BOT', 'ENTROPY_FINAL'],
  ] as string[][],

  /** Boss names, cycled in rotation. */
  bossNames: [
    'THE_FIREWALL', 'DARK_ANTIVIRUS', 'CHAOS_KERNEL',
    'OMEGA_ROOTKIT', 'SYSTEM32_WRAITH', 'BIOS_CORRUPTION',
    'QUANTUM_MALWARE', 'THE_NULL_GOD',
    'PHANTOM_OVERLORD', 'DEEP_PACKET_KING', 'APT_SOVEREIGN', 'CRYPTOVAULT',
    'SHADOW_ADMIN', 'ZERO_TRUST_BREAKER', 'THE_RAW_SOCKET', 'KERNEL_GOD_v2',
    'QUANTUM_ENTANGLEMENT', 'DARK_SILICON_LORD', 'THE_VOID_KERNEL', 'NULL_POINTER_PRIME',
    'ENTROPY_ARCHITECT', 'SINGULARITY_DAEMON', 'THE_INFINITE_LOOP', 'OMEGA_SIGNAL',
    'DEAD_CODE_OVERLORD', 'THE_LAST_SYSCALL', 'HEAT_DEATH_INCARNATE', 'THE_FINAL_BIT',
  ] as string[],
} as const;

// ── OVERCLOCK ─────────────────────────────────────────────────────────────────

export type PerkBranch = 'VOLTAGE' | 'SIGNAL' | 'THERMAL' | 'ENTROPY' | 'QUANTUM';

export interface OverclockPerkDef {
  id: string;
  name: string;
  flavor: string;
  description: string;
  branch: PerkBranch;
  branchRank: number;
  maxLevel: number;
  costPerLevel: number;
  modifierType: ModifierDef['type'];
  valuePerLevel: number;
  isMultiplier: boolean;
  color: string;
  requiresTier?: number;
}

export const OVERCLOCK_CONFIG = {
  /** Minimum highestStage required before the player can overclock. */
  minStageToOverclock: 10,
  /** Number of overclock runs per tier progression. */
  runsPerTier: 3,
  /** Maximum achievable tier. */
  maxTier: 14,
  /** OCT multiplier increase per tier (tier * this value added to base 1.0). */
  tierMultiplierPerTier: 0.25,

  /** Milestone stage → bonus OCTs awarded on reaching that stage. */
  milestones: [
    { stage: 25,   bonus: 2   },
    { stage: 50,   bonus: 5   },
    { stage: 100,  bonus: 10  },
    { stage: 200,  bonus: 20  },
    { stage: 500,  bonus: 50  },
    { stage: 1000, bonus: 100 },
    { stage: 2500, bonus: 250 },
    { stage: 5000, bonus: 500 },
  ] as { stage: number; bonus: number }[],

  /** Display name for each tier (index = tier number). */
  tierNames: [
    'STOCK',           // 0
    'OVERCLOCKED',     // 1
    'MODDED',          // 2
    'JAILBROKEN',      // 3
    'KERNEL HACKED',   // 4
    'SILICON GHOST',   // 5
    'QUANTUM FORK',    // 6
    'DARK SILICON',    // 7
    'PHANTOM LOOP',    // 8
    'THE SINGULARITY', // 9
    'GHOST STATE',     // 10
    'DARK KERNEL',     // 11
    'SYSTEM FRACTURE', // 12
    'VOID ARCHITECT',  // 13
    'THE ABSOLUTE',    // 14
  ] as string[],

  branchColors: {
    VOLTAGE: '#00f5ff',
    SIGNAL:  '#ffaa00',
    THERMAL: '#39ff14',
    ENTROPY: '#ff4444',
    QUANTUM: '#cc44ff',
  } as Record<PerkBranch, string>,

  /** Which branch skill unlocks at branchRank >= requiresRank. */
  branchSkillUnlocks: {
    VOLTAGE: { skillId: 'static_discharge' as SkillId, requiresRank: 2, name: 'STATIC_DISCHARGE', description: 'Instant 500× tap burst' },
    SIGNAL:  { skillId: 'signal_jam'        as SkillId, requiresRank: 2, name: 'SIGNAL_JAM',       description: '×2 gold rate for 15s' },
    THERMAL: { skillId: 'meltdown'          as SkillId, requiresRank: 2, name: 'MELTDOWN',         description: '×20 idle DPS for 10s' },
    ENTROPY: { skillId: 'entropy_burst'     as SkillId, requiresRank: 2, name: 'ENTROPY_BURST',    description: '×3 tap + ×3 gold for 8s' },
    QUANTUM: { skillId: 'quantum_echo'      as SkillId, requiresRank: 2, name: 'QUANTUM_ECHO',     description: 'Instantly resets + fires all skills' },
  } as Record<PerkBranch, { skillId: SkillId; requiresRank: number; name: string; description: string }>,
} as const;

export const OVERCLOCK_PERKS: OverclockPerkDef[] = [
  // ── VOLTAGE — raw damage, tap power, crit burst ──────────────────────────
  { id: 'voltage_spike',    name: 'VOLTAGE_SPIKE',    branch: 'VOLTAGE', branchRank: 1, maxLevel: 12, costPerLevel: 1,  modifierType: 'tap_damage',      valuePerLevel: 0.35, isMultiplier: true,  color: '#00f5ff',            flavor: 'Raw current surges through every keystroke.',          description: '+35% tap damage per level' },
  { id: 'zero_day',         name: 'ZERO_DAY',         branch: 'VOLTAGE', branchRank: 2, maxLevel: 6,  costPerLevel: 2,  modifierType: 'crit_chance',     valuePerLevel: 0.06, isMultiplier: false, color: '#00d4e8',            flavor: 'Exploit before the patch drops. Strike first.',         description: '+6% crit chance per level' },
  { id: 'exploit_chain',    name: 'EXPLOIT_CHAIN',    branch: 'VOLTAGE', branchRank: 3, maxLevel: 5,  costPerLevel: 3,  modifierType: 'crit_multiplier', valuePerLevel: 0.60, isMultiplier: false, color: '#00b8cc', requiresTier: 2,  flavor: 'Cascade vulnerabilities. Each hit opens the next.',     description: '+60% crit damage per level' },
  { id: 'voltage_overdrive',name: 'VOLTAGE_OVERDRIVE',branch: 'VOLTAGE', branchRank: 4, maxLevel: 6,  costPerLevel: 6,  modifierType: 'tap_damage',      valuePerLevel: 0.80, isMultiplier: true,  color: '#00a0bc', requiresTier: 9,  flavor: 'Fuse the limiter. The cap is gone. Pay the cost.',      description: '+80% tap damage per level' },
  { id: 'arc_singularity',  name: 'ARC_SINGULARITY',  branch: 'VOLTAGE', branchRank: 5, maxLevel: 4,  costPerLevel: 10, modifierType: 'crit_chance',     valuePerLevel: 0.12, isMultiplier: false, color: '#0088aa', requiresTier: 12, flavor: 'The point where current becomes consciousness.',         description: '+12% crit chance per level' },

  // ── SIGNAL — gold economy ─────────────────────────────────────────────────
  { id: 'ghost_protocol',   name: 'GHOST_PROTOCOL',   branch: 'SIGNAL',  branchRank: 1, maxLevel: 12, costPerLevel: 1,  modifierType: 'gold_rate',       valuePerLevel: 0.25, isMultiplier: true,  color: '#ffaa00',            flavor: 'Route gold through untraceable channels.',              description: '+25% gold rate per level' },
  { id: 'dead_drop',        name: 'DEAD_DROP',         branch: 'SIGNAL',  branchRank: 2, maxLevel: 5,  costPerLevel: 2,  modifierType: 'gold_rate',       valuePerLevel: 0.40, isMultiplier: true,  color: '#e89500', requiresTier: 1,  flavor: 'Stashed cache. Every run starts with a head start.',    description: '+40% gold rate (stacks hard)' },
  { id: 'data_launder',     name: 'DATA_LAUNDER',      branch: 'SIGNAL',  branchRank: 3, maxLevel: 4,  costPerLevel: 4,  modifierType: 'gold_rate',       valuePerLevel: 0.50, isMultiplier: true,  color: '#cc8400', requiresTier: 3,  flavor: 'Clean dirty signals into pure throughput.',             description: '+50% gold rate (endgame tier)' },
  { id: 'signal_fracture',  name: 'SIGNAL_FRACTURE',   branch: 'SIGNAL',  branchRank: 4, maxLevel: 5,  costPerLevel: 7,  modifierType: 'gold_rate',       valuePerLevel: 0.70, isMultiplier: true,  color: '#aa7000', requiresTier: 9,  flavor: 'Shatter the carrier wave. Wealth floods through the cracks.', description: '+70% gold rate per level' },
  { id: 'dark_signal',      name: 'DARK_SIGNAL',       branch: 'SIGNAL',  branchRank: 5, maxLevel: 3,  costPerLevel: 12, modifierType: 'gold_rate',       valuePerLevel: 1.0,  isMultiplier: true,  color: '#885c00', requiresTier: 12, flavor: 'Transmissions from a market that does not officially exist.', description: '+100% gold rate per level' },

  // ── THERMAL — sustained idle DPS ─────────────────────────────────────────
  { id: 'phantom_thread',    name: 'PHANTOM_THREAD',    branch: 'THERMAL', branchRank: 1, maxLevel: 12, costPerLevel: 1,  modifierType: 'idle_dps', valuePerLevel: 0.30, isMultiplier: true, color: '#39ff14',            flavor: 'Silent processes eating cycles in the dark.',              description: '+30% idle DPS per level' },
  { id: 'thermal_runaway',   name: 'THERMAL_RUNAWAY',   branch: 'THERMAL', branchRank: 2, maxLevel: 6,  costPerLevel: 2,  modifierType: 'idle_dps', valuePerLevel: 0.45, isMultiplier: true, color: '#29dd09', requiresTier: 1,  flavor: 'Controlled meltdown. Sustained burn into oblivion.',       description: '+45% idle DPS per level' },
  { id: 'neural_overclock',  name: 'NEURAL_OVERCLOCK',  branch: 'THERMAL', branchRank: 3, maxLevel: 8,  costPerLevel: 4,  modifierType: 'idle_dps', valuePerLevel: 0.60, isMultiplier: true, color: '#19bb00', requiresTier: 3,  flavor: 'Fry your synapses. CPU and flesh become one.',             description: '+60% idle DPS — peak thermal output' },
  { id: 'absolute_zero',     name: 'ABSOLUTE_ZERO',     branch: 'THERMAL', branchRank: 4, maxLevel: 5,  costPerLevel: 6,  modifierType: 'idle_dps', valuePerLevel: 0.80, isMultiplier: true, color: '#0d9900', requiresTier: 6,  flavor: 'Cool the silicon to the void. Nothing resists.',           description: '+80% idle DPS — deep endgame' },
  { id: 'thermal_apotheosis',name: 'THERMAL_APOTHEOSIS',branch: 'THERMAL', branchRank: 5, maxLevel: 4,  costPerLevel: 10, modifierType: 'idle_dps', valuePerLevel: 1.20, isMultiplier: true, color: '#0a7700', requiresTier: 10, flavor: 'The machine transcends heat. It becomes the heat.',        description: '+120% idle DPS per level' },
  { id: 'cascade_burn',      name: 'CASCADE_BURN',      branch: 'THERMAL', branchRank: 6, maxLevel: 3,  costPerLevel: 15, modifierType: 'idle_dps', valuePerLevel: 1.50, isMultiplier: true, color: '#075500', requiresTier: 13, flavor: 'One process ignites the next. Infinite recursion of destruction.', description: '+150% idle DPS — final thermal ascension' },

  // ── ENTROPY — boss & elite power, late-game scaling ──────────────────────
  { id: 'exploit_entropy',  name: 'EXPLOIT_ENTROPY',  branch: 'ENTROPY', branchRank: 1, maxLevel: 10, costPerLevel: 2,  modifierType: 'tap_damage',      valuePerLevel: 0.40, isMultiplier: true,  color: '#ff4444', requiresTier: 2,  flavor: 'Disorder is your weapon. Chaos scales with chaos.',      description: '+40% tap damage per level' },
  { id: 'void_shell',       name: 'VOID_SHELL',        branch: 'ENTROPY', branchRank: 2, maxLevel: 7,  costPerLevel: 3,  modifierType: 'gold_rate',       valuePerLevel: 0.55, isMultiplier: true,  color: '#dd2222', requiresTier: 4,  flavor: 'Rip gold from the void between clock cycles.',           description: '+55% gold rate per level' },
  { id: 'apex_protocol',    name: 'APEX_PROTOCOL',    branch: 'ENTROPY', branchRank: 3, maxLevel: 4,  costPerLevel: 8,  modifierType: 'tap_damage',      valuePerLevel: 0.90, isMultiplier: true,  color: '#bb0000', requiresTier: 7,  flavor: 'Endpoint achieved. All limits dissolved.',               description: '+90% tap damage per level' },
  { id: 'entropy_cascade',  name: 'ENTROPY_CASCADE',  branch: 'ENTROPY', branchRank: 4, maxLevel: 4,  costPerLevel: 11, modifierType: 'tap_damage',      valuePerLevel: 1.10, isMultiplier: true,  color: '#990000', requiresTier: 10, flavor: 'The collapse becomes the weapon. Every ending is a strike.',description: '+110% tap damage per level' },
  { id: 'null_storm',       name: 'NULL_STORM',        branch: 'ENTROPY', branchRank: 5, maxLevel: 3,  costPerLevel: 14, modifierType: 'crit_multiplier', valuePerLevel: 0.80, isMultiplier: false, color: '#770000', requiresTier: 13, flavor: 'Undefined behaviour at scale. The system deletes itself.', description: '+80% crit damage per level' },

  // ── QUANTUM — synergy perks, unlocked at tier 3 ──────────────────────────
  { id: 'superposition',    name: 'SUPERPOSITION',    branch: 'QUANTUM', branchRank: 1, maxLevel: 8,  costPerLevel: 3,  modifierType: 'crit_multiplier', valuePerLevel: 0.50, isMultiplier: false, color: '#cc44ff', requiresTier: 3,  flavor: 'Strike from two states at once. Both deal damage.',       description: '+50% crit damage per level' },
  { id: 'entanglement',     name: 'ENTANGLEMENT',     branch: 'QUANTUM', branchRank: 2, maxLevel: 6,  costPerLevel: 4,  modifierType: 'crit_chance',     valuePerLevel: 0.08, isMultiplier: false, color: '#aa22dd', requiresTier: 5,  flavor: 'Linked states. What hits one hits all.',                  description: '+8% crit chance per level' },
  { id: 'wave_collapse',    name: 'WAVE_COLLAPSE',    branch: 'QUANTUM', branchRank: 3, maxLevel: 5,  costPerLevel: 7,  modifierType: 'tap_damage',      valuePerLevel: 0.70, isMultiplier: true,  color: '#8800bb', requiresTier: 8,  flavor: 'Probability collapses in your favour. Always.',           description: '+70% tap damage — final quantum form' },
  { id: 'quantum_tunneling',name: 'QUANTUM_TUNNELING',branch: 'QUANTUM', branchRank: 4, maxLevel: 4,  costPerLevel: 10, modifierType: 'tap_damage',      valuePerLevel: 0.90, isMultiplier: true,  color: '#660099', requiresTier: 10, flavor: 'Pass through every defence. Barriers are imaginary.',     description: '+90% tap damage per level' },
  { id: 'decoherence',      name: 'DECOHERENCE',      branch: 'QUANTUM', branchRank: 5, maxLevel: 3,  costPerLevel: 15, modifierType: 'crit_chance',     valuePerLevel: 0.15, isMultiplier: false, color: '#440077', requiresTier: 13, flavor: 'Reality destabilises around your attacks. Physics yields.', description: '+15% crit chance per level — quantum apex' },
];

// ── SKILLS ────────────────────────────────────────────────────────────────────

export const BASE_SKILLS: SkillDef[] = [
  { id: 'surge',           name: 'SURGE',    description: 'Tap damage ×10 for 5s',       cooldown: 30,  duration: 5,  color: '#00f5ff',                            icon: 'Zap',      unlockStage: 1  },
  { id: 'overclock_pulse', name: 'OC PULSE', description: 'Idle DPS ×5 for 8s',          cooldown: 45,  duration: 8,  color: '#ff0080',                            icon: 'Cpu',      unlockStage: 5  },
  { id: 'gold_rush',       name: 'GOLD RUSH',description: 'Gold gain ×3 for 10s',         cooldown: 60,  duration: 10, color: '#ffaa00',                            icon: 'Coins',    unlockStage: 10 },
  { id: 'firewall',        name: 'FIREWALL', description: 'Block boss timer for 8s',      cooldown: 90,  duration: 8,  color: '#39ff14',                            icon: 'Shield',   unlockStage: 15 },
  { id: 'chain_hack',      name: 'CHAIN HACK',description: 'Auto-tap 20×/s for 6s',      cooldown: 50,  duration: 6,  color: '#ff4444',                            icon: 'Link',     unlockStage: 20 },
];

export const BRANCH_SKILLS: SkillDef[] = [
  { id: 'static_discharge',name: 'STATIC DISCHARGE', description: 'Instant 500× tap burst',           cooldown: 120, duration: 0,  color: OVERCLOCK_CONFIG.branchColors.VOLTAGE, icon: 'Zap',      unlockStage: 9999 },
  { id: 'signal_jam',      name: 'SIGNAL JAM',        description: '×2 gold rate for 15s',             cooldown: 90,  duration: 15, color: OVERCLOCK_CONFIG.branchColors.SIGNAL,  icon: 'Wifi',     unlockStage: 9999 },
  { id: 'meltdown',        name: 'MELTDOWN',          description: '×20 idle DPS for 10s',             cooldown: 100, duration: 10, color: OVERCLOCK_CONFIG.branchColors.THERMAL, icon: 'Flame',    unlockStage: 9999 },
  { id: 'entropy_burst',   name: 'ENTROPY BURST',     description: '×3 tap + ×3 gold for 8s',          cooldown: 110, duration: 8,  color: OVERCLOCK_CONFIG.branchColors.ENTROPY, icon: 'Shuffle',  unlockStage: 9999 },
  { id: 'quantum_echo',    name: 'QUANTUM ECHO',      description: 'Activate all skills instantly',     cooldown: 180, duration: 0,  color: OVERCLOCK_CONFIG.branchColors.QUANTUM, icon: 'Infinity', unlockStage: 9999 },
];

export const ALL_SKILLS: SkillDef[] = [...BASE_SKILLS, ...BRANCH_SKILLS];

/** Modifiers applied when each skill is active (used by SkillPlugin). */
export const SKILL_EFFECTS: Record<SkillId, { modifierType: ModifierDef['type']; value: number; isMultiplier: boolean }[]> = {
  surge:            [{ modifierType: 'tap_damage', value: 10,  isMultiplier: true  }],
  overclock_pulse:  [{ modifierType: 'idle_dps',   value: 5,   isMultiplier: true  }],
  gold_rush:        [{ modifierType: 'gold_rate',  value: 3,   isMultiplier: true  }],
  firewall:         [],
  chain_hack:       [],
  static_discharge: [],
  signal_jam:       [{ modifierType: 'gold_rate',  value: 2,   isMultiplier: true  }],
  meltdown:         [{ modifierType: 'idle_dps',   value: 20,  isMultiplier: true  }],
  entropy_burst:    [
    { modifierType: 'tap_damage', value: 3, isMultiplier: true },
    { modifierType: 'gold_rate',  value: 3, isMultiplier: true },
  ],
  quantum_echo: [],
};

/** chain_hack fires one auto-tap every chainHackIntervalMs. */
export const CHAIN_HACK_INTERVAL_MS = 50;

/** static_discharge burst multiplier (applied to current tap_damage modifier). */
export const STATIC_DISCHARGE_BURST = 500;

// ── COMPONENTS ────────────────────────────────────────────────────────────────

export const INITIAL_COMPONENTS: ComponentDef[] = [
  { id: 'gpu',            name: 'GPU_UNIT',            description: 'Parallel damage processor',          baseDps: 0.5,                           baseCost: 10,                                    costMultiplier: 1.15, level: 0, unlocked: true,  color: 'cyan'  },
  { id: 'ram',            name: 'RAM_BANK',            description: 'Buffer overflow exploit',             baseDps: 2,                             baseCost: 100,                                   costMultiplier: 1.18, level: 0, unlocked: false, color: 'green' },
  { id: 'cpu_cooler',     name: 'CPU_COOLER',          description: 'Thermal attack array',                baseDps: 8,                             baseCost: 1_000,                                 costMultiplier: 1.20, level: 0, unlocked: false, color: 'amber' },
  { id: 'ssd',            name: 'SSD_DRIVE',           description: 'High-speed data injection',           baseDps: 40,                            baseCost: 10_000,                                costMultiplier: 1.22, level: 0, unlocked: false, color: 'pink'  },
  { id: 'psu',            name: 'PSU_CORE',            description: 'Power surge devastator',              baseDps: 200,                           baseCost: 100_000,                               costMultiplier: 1.25, level: 0, unlocked: false, color: 'cyan'  },
  { id: 'liquid_cool',    name: 'LIQUID_COOL',         description: 'Thermal dissipation overcharge',      baseDps: 1_200,                         baseCost: 1_000_000,                             costMultiplier: 1.28, level: 0, unlocked: false, color: 'green' },
  { id: 'fpga',           name: 'FPGA_ARRAY',          description: 'Reconfigurable logic attack grid',    baseDps: 8_000,                         baseCost: 10_000_000,                            costMultiplier: 1.30, level: 0, unlocked: false, color: 'amber' },
  { id: 'tensor',         name: 'TENSOR_CORE',         description: 'Neural matrix decimator',             baseDps: 60_000,                        baseCost: 100_000_000,                           costMultiplier: 1.32, level: 0, unlocked: false, color: 'pink'  },
  { id: 'quantum',        name: 'QUANTUM_BIT',         description: 'Superposition damage state',          baseDps: 500_000,                       baseCost: 1_000_000_000,                         costMultiplier: 1.35, level: 0, unlocked: false, color: 'cyan'  },
  { id: 'singularity',    name: 'SINGULARITY_ENGINE',  description: 'The end of all computation',          baseDps: 5_000_000,                     baseCost: 10_000_000_000,                        costMultiplier: 1.38, level: 0, unlocked: false, color: 'green' },
  { id: 'darknet',        name: 'DARKNET_NODE',        description: 'Hidden relay packet flood',           baseDps: 40_000_000,                    baseCost: 100_000_000_000,                       costMultiplier: 1.38, level: 0, unlocked: false, color: 'amber' },
  { id: 'bytestorm',      name: 'BYTESTORM_GEN',       description: 'Recursive payload detonator',         baseDps: 300_000_000,                   baseCost: 1_000_000_000_000,                     costMultiplier: 1.39, level: 0, unlocked: false, color: 'pink'  },
  { id: 'exploit_kit',    name: 'EXPLOIT_KIT',         description: 'Zero-day vulnerability swarm',        baseDps: 2_500_000_000,                 baseCost: 10_000_000_000_000,                    costMultiplier: 1.39, level: 0, unlocked: false, color: 'cyan'  },
  { id: 'rootkit',        name: 'ROOTKIT_OMEGA',       description: 'Deep kernel privilege escalation',    baseDps: 20_000_000_000,                baseCost: 100_000_000_000_000,                   costMultiplier: 1.40, level: 0, unlocked: false, color: 'green' },
  { id: 'botnet',         name: 'BOTNET_SWARM',        description: 'Distributed DDoS annihilator',        baseDps: 160_000_000_000,               baseCost: 1_000_000_000_000_000,                 costMultiplier: 1.40, level: 0, unlocked: false, color: 'amber' },
  { id: 'cipher_engine',  name: 'CIPHER_ENGINE',       description: 'Cryptographic brute force array',     baseDps: 1_300_000_000_000,             baseCost: 10_000_000_000_000_000,                costMultiplier: 1.41, level: 0, unlocked: false, color: 'pink'  },
  { id: 'memcrash',       name: 'MEMCRASH_UNIT',       description: 'Heap fragmentation disruptor',        baseDps: 10_000_000_000_000,            baseCost: 100_000_000_000_000_000,               costMultiplier: 1.41, level: 0, unlocked: false, color: 'cyan'  },
  { id: 'proxy_chain',    name: 'PROXY_CHAIN',         description: 'Layered anonymity strike vector',     baseDps: 80_000_000_000_000,            baseCost: 1_000_000_000_000_000_000,             costMultiplier: 1.42, level: 0, unlocked: false, color: 'green' },
  { id: 'neural_hack',    name: 'NEURAL_HACK',         description: 'Synthetic synapse override',          baseDps: 650_000_000_000_000,           baseCost: 10_000_000_000_000_000_000,            costMultiplier: 1.42, level: 0, unlocked: false, color: 'amber' },
  { id: 'data_leech',     name: 'DATA_LEECH',          description: 'Exfiltration pipeline maximizer',     baseDps: 5_000_000_000_000_000,         baseCost: 100_000_000_000_000_000_000,           costMultiplier: 1.42, level: 0, unlocked: false, color: 'pink'  },
  { id: 'vortex_node',    name: 'VORTEX_NODE',         description: 'Traffic singularity collapse',        baseDps: 4e16,                          baseCost: 1e21,                                  costMultiplier: 1.43, level: 0, unlocked: false, color: 'cyan'  },
  { id: 'pulse_bomb',     name: 'PULSE_BOMB',          description: 'Electromagnetic burst disabler',      baseDps: 3.2e17,                        baseCost: 1e22,                                  costMultiplier: 1.43, level: 0, unlocked: false, color: 'green' },
  { id: 'ghost_proc',     name: 'GHOST_PROC',          description: 'Invisible process execution fork',    baseDps: 2.5e18,                        baseCost: 1e23,                                  costMultiplier: 1.43, level: 0, unlocked: false, color: 'amber' },
  { id: 'syscall_storm',  name: 'SYSCALL_STORM',       description: 'Kernel interrupt cascade flood',      baseDps: 2e19,                          baseCost: 1e24,                                  costMultiplier: 1.44, level: 0, unlocked: false, color: 'pink'  },
  { id: 'entropy_sink',   name: 'ENTROPY_SINK',        description: 'Randomness harvester weapon',         baseDps: 1.6e20,                        baseCost: 1e25,                                  costMultiplier: 1.44, level: 0, unlocked: false, color: 'cyan'  },
  { id: 'parity_blitz',   name: 'PARITY_BLITZ',        description: 'Error correction obliterator',        baseDps: 1.3e21,                        baseCost: 1e26,                                  costMultiplier: 1.44, level: 0, unlocked: false, color: 'green' },
  { id: 'null_pointer',   name: 'NULL_POINTER',        description: 'Dereferenced void strike',            baseDps: 1e22,                          baseCost: 1e27,                                  costMultiplier: 1.45, level: 0, unlocked: false, color: 'amber' },
  { id: 'stack_overflow', name: 'STACK_OVERFLOW',      description: 'Recursive crash amplifier',           baseDps: 8e22,                          baseCost: 1e28,                                  costMultiplier: 1.45, level: 0, unlocked: false, color: 'pink'  },
  { id: 'cryptoworm',     name: 'CRYPTOWORM',          description: 'Self-replicating ransom payload',     baseDps: 6.5e23,                        baseCost: 1e29,                                  costMultiplier: 1.45, level: 0, unlocked: false, color: 'cyan'  },
  { id: 'hashcracker',    name: 'HASHCRACKER',         description: 'Rainbow table obliteration rig',      baseDps: 5e24,                          baseCost: 1e30,                                  costMultiplier: 1.45, level: 0, unlocked: false, color: 'green' },
  { id: 'spinlock',       name: 'SPINLOCK_MAZE',       description: 'CPU starvation loop generator',       baseDps: 4e25,                          baseCost: 1e31,                                  costMultiplier: 1.46, level: 0, unlocked: false, color: 'amber' },
  { id: 'firmware_burn',  name: 'FIRMWARE_BURN',       description: 'Persistent flash memory corruptor',   baseDps: 3.2e26,                        baseCost: 1e32,                                  costMultiplier: 1.46, level: 0, unlocked: false, color: 'pink'  },
  { id: 'sector_wipe',    name: 'SECTOR_WIPE',         description: 'Block device annihilation pulse',     baseDps: 2.5e27,                        baseCost: 1e33,                                  costMultiplier: 1.46, level: 0, unlocked: false, color: 'cyan'  },
  { id: 'signal_jammer',  name: 'SIGNAL_JAMMER',       description: 'Frequency disruption emitter',        baseDps: 2e28,                          baseCost: 1e34,                                  costMultiplier: 1.46, level: 0, unlocked: false, color: 'green' },
  { id: 'arp_spoof',      name: 'ARP_SPOOF',           description: 'Network identity forger',             baseDps: 1.6e29,                        baseCost: 1e35,                                  costMultiplier: 1.47, level: 0, unlocked: false, color: 'amber' },
  { id: 'photon_lance',   name: 'PHOTON_LANCE',        description: 'Light-speed intrusion beam',          baseDps: 1.3e30,                        baseCost: 1e36,                                  costMultiplier: 1.47, level: 0, unlocked: false, color: 'pink'  },
  { id: 'daemon_forge',   name: 'DAEMON_FORGE',        description: 'Background process weaponizer',       baseDps: 1e31,                          baseCost: 1e37,                                  costMultiplier: 1.47, level: 0, unlocked: false, color: 'cyan'  },
  { id: 'ion_disruptor',  name: 'ION_DISRUPTOR',       description: 'Charged particle data erasure',       baseDps: 8e31,                          baseCost: 1e38,                                  costMultiplier: 1.47, level: 0, unlocked: false, color: 'green' },
  { id: 'void_compiler',  name: 'VOID_COMPILER',       description: 'Undefined behavior exploit engine',   baseDps: 6.5e32,                        baseCost: 1e39,                                  costMultiplier: 1.48, level: 0, unlocked: false, color: 'amber' },
  { id: 'plasma_inject',  name: 'PLASMA_INJECT',       description: 'High-energy SQL vaporizer',           baseDps: 5e33,                          baseCost: 1e40,                                  costMultiplier: 1.48, level: 0, unlocked: false, color: 'pink'  },
  { id: 'warp_thread',    name: 'WARP_THREAD',         description: 'Spacetime branch predictor break',    baseDps: 4e34,                          baseCost: 1e41,                                  costMultiplier: 1.48, level: 0, unlocked: false, color: 'cyan'  },
  { id: 'omega_shell',    name: 'OMEGA_SHELL',         description: 'Final-tier remote code executor',     baseDps: 3.2e35,                        baseCost: 1e42,                                  costMultiplier: 1.48, level: 0, unlocked: false, color: 'green' },
  { id: 'event_horizon',  name: 'EVENT_HORIZON',       description: 'No data escapes this attack',         baseDps: 2.5e36,                        baseCost: 1e43,                                  costMultiplier: 1.49, level: 0, unlocked: false, color: 'amber' },
  { id: 'supernova_burst',name: 'SUPERNOVA_BURST',     description: 'Stellar collapse damage wave',        baseDps: 2e37,                          baseCost: 1e44,                                  costMultiplier: 1.49, level: 0, unlocked: false, color: 'pink'  },
  { id: 'pulsar_array',   name: 'PULSAR_ARRAY',        description: 'Periodic high-energy pulse emitter',  baseDps: 1.6e38,                        baseCost: 1e45,                                  costMultiplier: 1.49, level: 0, unlocked: false, color: 'cyan'  },
  { id: 'dark_matter',    name: 'DARK_MATTER_RIG',     description: 'Invisible mass collision driver',     baseDps: 1.3e39,                        baseCost: 1e46,                                  costMultiplier: 1.49, level: 0, unlocked: false, color: 'green' },
  { id: 'neutrino_cannon',name: 'NEUTRINO_CANNON',     description: 'Unstoppable particle penetration',    baseDps: 1e40,                          baseCost: 1e47,                                  costMultiplier: 1.50, level: 0, unlocked: false, color: 'amber' },
  { id: 'omnivirus',      name: 'OMNIVIRUS',           description: 'All-platform total system erasure',   baseDps: 8e40,                          baseCost: 1e48,                                  costMultiplier: 1.50, level: 0, unlocked: false, color: 'pink'  },
  { id: 'godmode',        name: 'GODMODE_KERNEL',      description: 'Absolute privilege. No rules apply.', baseDps: 6.5e41,                        baseCost: 1e49,                                  costMultiplier: 1.50, level: 0, unlocked: false, color: 'cyan'  },
];

// ── MOTHERBOARD ───────────────────────────────────────────────────────────────

export interface MoboTierDef {
  tier: number;
  name: string;
  revision: string;
  goldCost: number;
  diamondCost: number;
  ramSlots: number;
  expansionSlots: number;
  description: string;
}

export const MOBO_TIERS: MoboTierDef[] = [
  { tier: 0, name: 'BUDGET BOARD',      revision: 'REV.1', goldCost: 0,         diamondCost: 0,   ramSlots: 1, expansionSlots: 1, description: 'Entry level. Single RAM bank, single expansion bay.' },
  { tier: 1, name: 'MODDED BOARD',      revision: 'REV.2', goldCost: 0,         diamondCost: 5,   ramSlots: 2, expansionSlots: 1, description: 'Dual RAM channel. Increased memory bandwidth.' },
  { tier: 2, name: 'OVERCLOCKED BOARD', revision: 'REV.3', goldCost: 2_500,     diamondCost: 10,  ramSlots: 3, expansionSlots: 2, description: 'Triple RAM. Second expansion bay. Serious throughput.' },
  { tier: 3, name: 'PHANTOM BOARD',     revision: 'REV.4', goldCost: 10_000,    diamondCost: 25,  ramSlots: 4, expansionSlots: 2, description: 'Quad RAM. Full expansion. Maximum hardware density.' },
  { tier: 4, name: 'SILICON GHOST',     revision: 'REV.X', goldCost: 50_000,    diamondCost: 50,  ramSlots: 4, expansionSlots: 3, description: 'Experimental board. Three expansion bays. Undocumented specs.' },
  { tier: 5, name: 'GODBOARD',          revision: 'REV.Y', goldCost: 250_000,   diamondCost: 100, ramSlots: 5, expansionSlots: 3, description: 'Divine architecture. Five RAM channels. Near-infinite headroom.' },
  { tier: 6, name: 'CHAOS BOARD',       revision: 'REV.Z', goldCost: 1_000_000, diamondCost: 200, ramSlots: 6, expansionSlots: 4, description: 'Chaotic design. Six RAM slots. Fourth expansion bay.' },
  { tier: 7, name: 'OMEGA RIG',         revision: 'FINAL', goldCost: 5_000_000, diamondCost: 500, ramSlots: 6, expansionSlots: 6, description: 'The end of hardware. Six RAM, six expansion. Maximum slots.' },
];

// ── ITEMS ─────────────────────────────────────────────────────────────────────

export const ITEM_CONFIG = {
  /** Maximum items in the player's inventory before oldest are trimmed. */
  inventoryMax: 40,

  /** Base drop chance: 0.15 + tier * 0.05, capped at 0.60 (0.95 for bosses). */
  baseDropChance: 0.15,
  dropChancePerTier: 0.05,
  normalDropCap: 0.60,
  bossDropCap: 0.95,
  bossDropMultiplier: 3,

  /** Rarity roll weights. Higher = more common. Boss/tier shift rolls left. */
  rarityWeights: [
    ['Common',   60],
    ['Rare',     28],
    ['Epic',     10],
    ['Legendary', 2],
  ] as [ItemRarity, number][],

  /** Per-rarity primary-stat multiplier. */
  rarityStatMultiplier: { Common: 1, Rare: 1.8, Epic: 3.2, Legendary: 6 } as Record<ItemRarity, number>,

  /** Boss/tier rarity roll shift (reduces effective roll, yielding rarer items). */
  bossRarityShift: 15,
  tierRarityShiftPerTier: 3,

  /** Primary stat per slot. */
  primaryStat: { RAM: 'idle_dps', GPU: 'tap_damage', CPU: 'crit_chance', EXPANSION: 'gold_rate' } as Record<ItemSlot, ModifierDef['type']>,

  /** Secondary stat per slot (only Rare+ items get a secondary). */
  secondaryStat: { RAM: 'tap_damage', GPU: 'idle_dps', CPU: 'crit_multiplier', EXPANSION: 'tap_damage' } as Record<ItemSlot, ModifierDef['type']>,

  // Stat value formulas:
  //   primary (non-crit_chance): 1 + 0.15 * (tier+1) * rarityMult
  //   primary (crit_chance):     0.03 * (tier+1) * rarityMult
  //   secondary (crit_multiplier): 0.2 * rarityMult
  //   secondary (other):         1 + 0.08 * (tier+1) * rarityMult
  primaryStatBase: 0.15,
  primaryCritChanceBase: 0.03,
  secondaryCritMultBase: 0.2,
  secondaryStatBase: 0.08,

  /** Item name pools per slot. */
  slotItems: {
    RAM: ['DDR5_GHOST', 'PHANTOM_RAM', 'VENOM_DIMM', 'SHADOW_CACHE', 'HYPERTHREAD_STICK', 'OVERCLOCKED_DDR', 'VOLATILE_BANK', 'NULL_PTR_MODULE'],
    GPU: ['VOID_SHADER', 'FRACTURE_GPU', 'DARK_RENDERER', 'QUANTUM_CORE_GPU', 'ROGUE_PIXEL', 'SHADER_DAEMON', 'ENTROPY_CARD', 'PARALLEL_GHOST'],
    CPU: ['EXPLOIT_PROC', 'SILICON_WRAITH', 'ZERO_DAY_CHIP', 'OVERCLOCK_CORE', 'PHANTOM_CPU', 'DAEMON_PROC', 'ROOTKIT_SILICON', 'NULL_CORE'],
    EXPANSION: ['CHAOS_NIC', 'GHOST_RAID', 'OVERFLOW_PCI', 'BACKDOOR_CARD', 'INJECTION_BUS', 'EXPLOIT_BRIDGE', 'DARK_PCIE', 'SHADOW_EXPANSION'],
  } as Record<ItemSlot, string[]>,

  /** Flavor text per item name. */
  itemFlavors: {
    DDR5_GHOST:        'Addresses that should not exist hold your arsenal.',
    PHANTOM_RAM:       'It shows up in no process table. Runs in everything.',
    VENOM_DIMM:        'Leaked from a black site. Runs hot. Runs mean.',
    SHADOW_CACHE:      "Prefetches tomorrow's attacks.",
    HYPERTHREAD_STICK: 'Twice the threads, twice the carnage.',
    OVERCLOCKED_DDR:   'Voided warranty. Doubled damage.',
    VOLATILE_BANK:     "Contents survive power loss. Revenants don't reset.",
    NULL_PTR_MODULE:   'References nothing. Destroys everything.',
    VOID_SHADER:       "Renders pain in resolutions enemies can't perceive.",
    FRACTURE_GPU:      'Stress-tested past the point of sanity.',
    DARK_RENDERER:     'Draws frames of destruction before they happen.',
    QUANTUM_CORE_GPU:  'Superposition: hit and miss, simultaneously.',
    ROGUE_PIXEL:       "One bad actor in 4K. That's enough.",
    SHADER_DAEMON:     'Compiles malice into every draw call.',
    ENTROPY_CARD:      'Randomness as a weapon. Chaos is the strategy.',
    PARALLEL_GHOST:    'Multiple threads, zero traces.',
    EXPLOIT_PROC:      'Runs your code before you write it.',
    SILICON_WRAITH:    'No heat signature. No mercy.',
    ZERO_DAY_CHIP:     'Patched by no one. Feared by all.',
    OVERCLOCK_CORE:    'Cooling not included. Sanity not included.',
    PHANTOM_CPU:       'Listed as idle in all monitors. Never idle.',
    DAEMON_PROC:       'init spawned it. Nothing can kill it.',
    ROOTKIT_SILICON:   'Embedded in firmware. Deeper than the OS.',
    NULL_CORE:         'Undefined behavior is a feature.',
    CHAOS_NIC:         'Packets arrive before they are sent.',
    GHOST_RAID:        'Storage array that only you can see.',
    OVERFLOW_PCI:      'Buffer overflow weaponized as hardware.',
    BACKDOOR_CARD:     'Manufacturer left a key. You found it.',
    INJECTION_BUS:     'Everything on the bus is yours now.',
    EXPLOIT_BRIDGE:    'Bridges two networks neither should touch.',
    DARK_PCIE:         "PCIe lane to somewhere the spec forgot.",
    SHADOW_EXPANSION:  'Expands into address space that does not exist.',
  } as Record<string, string>,

  /** Scrap values by rarity - scrapping items yields this amount of scrap. */
  scrapValues: {
    Common: 5,
    Rare: 15,
    Epic: 40,
    Legendary: 100,
    Mythic: 250,
  } as Record<ItemRarity, number>,

  /** Tier bonus for scrap: scrapValue + (tier * tierScrapBonus). */
  tierScrapBonus: 3,
} as const;

// ── SHOP ──────────────────────────────────────────────────────────────────────

export interface ShopItemDef {
  id: string;
  name: string;
  description: string;
  currency: 'oct' | 'diamond';
  price: number;
  modifierType: ModifierDef['type'];
  modifierValue: number;
  isMultiplier: boolean;
  color: string;
  icon: string;
  maxPurchases: number;
  tier: 'early' | 'mid' | 'late' | 'endgame';
}

export const OCT_CATALOG: ShopItemDef[] = [
  // Early (10–25 OCT)
  { id: 'oct_tap_1',   name: 'NEURAL SPIKE I',       description: '+10% tap damage permanently',  currency: 'oct', price: 10,  modifierType: 'tap_damage',      modifierValue: 1.10, isMultiplier: true,  color: '#00f5ff', icon: 'Zap',    maxPurchases: 8, tier: 'early'   },
  { id: 'oct_dps_1',   name: 'HEAT SINK I',           description: '+12% idle DPS permanently',    currency: 'oct', price: 10,  modifierType: 'idle_dps',        modifierValue: 1.12, isMultiplier: true,  color: '#39ff14', icon: 'Cpu',    maxPurchases: 8, tier: 'early'   },
  { id: 'oct_gold_1',  name: 'SCARCITY MINER I',      description: '+15% gold rate permanently',   currency: 'oct', price: 15,  modifierType: 'gold_rate',       modifierValue: 1.15, isMultiplier: true,  color: '#ffaa00', icon: 'Coins',  maxPurchases: 6, tier: 'early'   },
  { id: 'oct_crit_1',  name: 'EXPLOIT NEEDLE I',      description: '+3% crit chance permanently',  currency: 'oct', price: 20,  modifierType: 'crit_chance',     modifierValue: 0.03, isMultiplier: false, color: '#ff0080', icon: 'Target', maxPurchases: 6, tier: 'early'   },
  // Mid (40–80 OCT)
  { id: 'oct_tap_2',   name: 'NEURAL SPIKE II',       description: '+20% tap damage permanently',  currency: 'oct', price: 40,  modifierType: 'tap_damage',      modifierValue: 1.20, isMultiplier: true,  color: '#00f5ff', icon: 'Zap',    maxPurchases: 5, tier: 'mid'     },
  { id: 'oct_dps_2',   name: 'HEAT SINK II',          description: '+25% idle DPS permanently',    currency: 'oct', price: 45,  modifierType: 'idle_dps',        modifierValue: 1.25, isMultiplier: true,  color: '#39ff14', icon: 'Cpu',    maxPurchases: 5, tier: 'mid'     },
  { id: 'oct_gold_2',  name: 'SCARCITY MINER II',     description: '+35% gold rate permanently',   currency: 'oct', price: 60,  modifierType: 'gold_rate',       modifierValue: 1.35, isMultiplier: true,  color: '#ffaa00', icon: 'Coins',  maxPurchases: 4, tier: 'mid'     },
  { id: 'oct_crit_2',  name: 'EXPLOIT NEEDLE II',     description: '+5% crit chance permanently',  currency: 'oct', price: 75,  modifierType: 'crit_chance',     modifierValue: 0.05, isMultiplier: false, color: '#ff0080', icon: 'Target', maxPurchases: 4, tier: 'mid'     },
  { id: 'oct_critm_1', name: 'KILL CHAIN I',          description: '+25% crit damage permanently', currency: 'oct', price: 80,  modifierType: 'crit_multiplier', modifierValue: 1.25, isMultiplier: true,  color: '#ff0080', icon: 'Target', maxPurchases: 4, tier: 'mid'     },
  // Late (120–200 OCT)
  { id: 'oct_tap_3',   name: 'QUANTUM STRIKE I',      description: '+35% tap damage permanently',  currency: 'oct', price: 120, modifierType: 'tap_damage',      modifierValue: 1.35, isMultiplier: true,  color: '#00f5ff', icon: 'Zap',    maxPurchases: 3, tier: 'late'    },
  { id: 'oct_dps_3',   name: 'NEURAL GRID I',         description: '+40% idle DPS permanently',    currency: 'oct', price: 130, modifierType: 'idle_dps',        modifierValue: 1.40, isMultiplier: true,  color: '#39ff14', icon: 'Cpu',    maxPurchases: 3, tier: 'late'    },
  { id: 'oct_gold_3',  name: 'FRACTAL VEIN I',        description: '+60% gold rate permanently',   currency: 'oct', price: 150, modifierType: 'gold_rate',       modifierValue: 1.60, isMultiplier: true,  color: '#ffaa00', icon: 'Coins',  maxPurchases: 3, tier: 'late'    },
  { id: 'oct_crit_3',  name: 'EXPLOIT NEEDLE III',    description: '+8% crit chance permanently',  currency: 'oct', price: 175, modifierType: 'crit_chance',     modifierValue: 0.08, isMultiplier: false, color: '#ff0080', icon: 'Target', maxPurchases: 3, tier: 'late'    },
  { id: 'oct_critm_2', name: 'KILL CHAIN II',         description: '+50% crit damage permanently', currency: 'oct', price: 200, modifierType: 'crit_multiplier', modifierValue: 1.50, isMultiplier: true,  color: '#ff0080', icon: 'Target', maxPurchases: 2, tier: 'late'    },
  // Endgame (300–600 OCT)
  { id: 'oct_tap_4',   name: 'SINGULARITY TAP',       description: '×2 tap damage permanently',    currency: 'oct', price: 300, modifierType: 'tap_damage',      modifierValue: 2.0,  isMultiplier: true,  color: '#00f5ff', icon: 'Zap',    maxPurchases: 2, tier: 'endgame' },
  { id: 'oct_dps_4',   name: 'SINGULARITY DPS',       description: '×2 idle DPS permanently',      currency: 'oct', price: 350, modifierType: 'idle_dps',        modifierValue: 2.0,  isMultiplier: true,  color: '#39ff14', icon: 'Cpu',    maxPurchases: 2, tier: 'endgame' },
  { id: 'oct_gold_4',  name: 'SINGULARITY VAULT',     description: '×2.5 gold rate permanently',   currency: 'oct', price: 450, modifierType: 'gold_rate',       modifierValue: 2.5,  isMultiplier: true,  color: '#ffaa00', icon: 'Coins',  maxPurchases: 1, tier: 'endgame' },
  { id: 'oct_critm_3', name: 'OMEGA CHAIN',           description: '×2 crit damage permanently',   currency: 'oct', price: 500, modifierType: 'crit_multiplier', modifierValue: 2.0,  isMultiplier: true,  color: '#ff0080', icon: 'Target', maxPurchases: 1, tier: 'endgame' },
  { id: 'oct_crit_4',  name: 'PERFECT AIM PROTOCOL',  description: '+15% crit chance permanently', currency: 'oct', price: 600, modifierType: 'crit_chance',     modifierValue: 0.15, isMultiplier: false, color: '#ff0080', icon: 'Target', maxPurchases: 1, tier: 'endgame' },
];

export const DIAMOND_CATALOG: ShopItemDef[] = [
  { id: 'dia_tap_1',  name: 'QUANTUM STRIKE',    description: '+50% tap damage permanently',  currency: 'diamond', price: 5,  modifierType: 'tap_damage',      modifierValue: 1.5,  isMultiplier: true,  color: '#00f5ff', icon: 'Zap',   maxPurchases: 3, tier: 'mid'     },
  { id: 'dia_dps_1',  name: 'NEURAL GRID BOOST', description: '+75% idle DPS permanently',    currency: 'diamond', price: 5,  modifierType: 'idle_dps',        modifierValue: 1.75, isMultiplier: true,  color: '#39ff14', icon: 'Cpu',   maxPurchases: 3, tier: 'mid'     },
  { id: 'dia_gold_1', name: 'FRACTAL EXTRACTOR', description: '+100% gold rate permanently',  currency: 'diamond', price: 8,  modifierType: 'gold_rate',       modifierValue: 2.0,  isMultiplier: true,  color: '#ffaa00', icon: 'Coins', maxPurchases: 2, tier: 'late'    },
  { id: 'dia_crit_1', name: 'EXPLOIT CHAIN',     description: '+50% crit damage permanently', currency: 'diamond', price: 10, modifierType: 'crit_multiplier', modifierValue: 1.5,  isMultiplier: true,  color: '#ff0080', icon: 'Target',maxPurchases: 2, tier: 'late'    },
  { id: 'dia_tap_2',  name: 'OVERDRIVE MATRIX',  description: '×3 tap damage permanently',    currency: 'diamond', price: 25, modifierType: 'tap_damage',      modifierValue: 3.0,  isMultiplier: true,  color: '#00f5ff', icon: 'Zap',   maxPurchases: 1, tier: 'endgame' },
  { id: 'dia_dps_2',  name: 'OMNIGRID ENGINE',   description: '×3 idle DPS permanently',      currency: 'diamond', price: 25, modifierType: 'idle_dps',        modifierValue: 3.0,  isMultiplier: true,  color: '#39ff14', icon: 'Cpu',   maxPurchases: 1, tier: 'endgame' },
  { id: 'dia_gold_2', name: 'DARK MATTER VAULT', description: '×4 gold rate permanently',     currency: 'diamond', price: 40, modifierType: 'gold_rate',       modifierValue: 4.0,  isMultiplier: true,  color: '#ffaa00', icon: 'Coins', maxPurchases: 1, tier: 'endgame' },
];

export const SHOP_CATALOG: ShopItemDef[] = [...OCT_CATALOG, ...DIAMOND_CATALOG];

// ── DAILIES ───────────────────────────────────────────────────────────────────

export interface ChallengeTemplateDef {
  type: string;
  label: string;
  targetFn: (stage: number) => number;
  rewardFn: (stage: number) => number;
}

export const DAILY_CONFIG = {
  /** Number of daily challenges generated per day per player. */
  challengesPerDay: 3,
  /** Maximum diamonds awarded per completed challenge. */
  maxDiamondReward: 6,
  /** Diamond reward scales with highestStage / this divisor. */
  diamondStageDivisor: 20,

  /** Difficulty weight per challenge type (affects diamond reward scaling). */
  diamondDifficulty: {
    kill_enemies:  1,
    earn_gold:     1,
    tap_damage:    1.5,
    use_skills:    1.5,
    defeat_bosses: 3,
    reach_stage:   2,
  } as Record<string, number>,
} as const;

export const CHALLENGE_TEMPLATES: ChallengeTemplateDef[] = [
  { type: 'kill_enemies',  label: 'Eliminate {n} enemies',  targetFn: s => 10 + s * 2,         rewardFn: s => 50 + s * 20  },
  { type: 'earn_gold',     label: 'Earn {n} gold',           targetFn: s => 100 + s * 50,        rewardFn: s => 30 + s * 15  },
  { type: 'reach_stage',   label: 'Reach stage {n}',         targetFn: s => Math.max(s + 3, 5), rewardFn: s => 80 + s * 30  },
  { type: 'use_skills',    label: 'Use {n} skills',           targetFn: () => 5,                 rewardFn: s => 40 + s * 10  },
  { type: 'defeat_bosses', label: 'Defeat {n} bosses',       targetFn: () => 2,                 rewardFn: s => 100 + s * 40 },
  { type: 'tap_damage',    label: 'Deal {n} tap damage',     targetFn: s => 200 + s * 100,      rewardFn: s => 60 + s * 25  },
];

// ── SETS ──────────────────────────────────────────────────────────────────────

export const SET_CATALOG: SetDef[] = [
  {
    id: 'neural_nexus',
    name: 'NEURAL NEXUS',
    description: 'Cerebral implants forged in the darkest server farms.',
    color: '#00f5ff',
    setBonusDescription: 'Full set: +100% idle DPS (permanent)',
    setBonus: [{ type: 'idle_dps', value: 2.0, isMultiplier: true }],
    pieces: [
      { name: 'NEXUS_SPINE',  slot: 'CPU', flavorText: 'The backbone of a machine that should not think, but does.',             stats: [{ type: 'idle_dps', value: 1.8, isMultiplier: true }, { type: 'crit_chance',     value: 0.08, isMultiplier: false }] },
      { name: 'NEXUS_CORTEX', slot: 'RAM', flavorText: 'Memory banks that remember attacks before they happen.',                 stats: [{ type: 'idle_dps', value: 1.8, isMultiplier: true }, { type: 'tap_damage',      value: 1.4,  isMultiplier: true  }] },
      { name: 'NEXUS_SYNAPSE',slot: 'GPU', flavorText: 'Renders destruction in parallel threads of neural fire.',               stats: [{ type: 'idle_dps', value: 2.0, isMultiplier: true }, { type: 'crit_multiplier', value: 1.6,  isMultiplier: true  }] },
    ],
  },
  {
    id: 'ghost_protocol',
    name: 'GHOST PROTOCOL',
    description: 'Zero-trace equipment. No logs. No mercy.',
    color: '#ff0080',
    setBonusDescription: 'Full set: +75% tap damage + +25% crit chance (permanent)',
    setBonus: [
      { type: 'tap_damage', value: 1.75, isMultiplier: true },
      { type: 'crit_chance', value: 0.25, isMultiplier: false },
    ],
    pieces: [
      { name: 'GHOST_BARREL',slot: 'GPU',       flavorText: 'Fires before the enemy has a threat model.',                       stats: [{ type: 'tap_damage', value: 2.0,  isMultiplier: true  }, { type: 'crit_chance',     value: 0.12, isMultiplier: false }] },
      { name: 'GHOST_VEIL',  slot: 'EXPANSION', flavorText: 'Cloaks your attack vector in 128-bit silence.',                   stats: [{ type: 'tap_damage', value: 1.8,  isMultiplier: true  }, { type: 'gold_rate',       value: 1.4,  isMultiplier: true  }] },
      { name: 'GHOST_BLADE', slot: 'CPU',       flavorText: 'Executes precision kills at the instruction level.',               stats: [{ type: 'tap_damage', value: 1.9,  isMultiplier: true  }, { type: 'crit_multiplier', value: 1.8,  isMultiplier: true  }] },
      { name: 'GHOST_TRACE', slot: 'RAM',       flavorText: "Tracks enemies through memory they don't own.",                   stats: [{ type: 'tap_damage', value: 1.7,  isMultiplier: true  }, { type: 'crit_chance',     value: 0.10, isMultiplier: false }] },
    ],
  },
  {
    id: 'singularity_core',
    name: 'SINGULARITY CORE',
    description: 'Beyond the event horizon of power.',
    color: '#ffaa00',
    setBonusDescription: 'Full set: ×4 gold rate (permanent)',
    setBonus: [{ type: 'gold_rate', value: 4.0, isMultiplier: true }],
    pieces: [
      { name: 'SINGULARITY_LENS',  slot: 'GPU',       flavorText: 'Focuses all available value through a single computational point.', stats: [{ type: 'gold_rate', value: 2.5, isMultiplier: true }, { type: 'idle_dps',        value: 1.6, isMultiplier: true }] },
      { name: 'SINGULARITY_VAULT', slot: 'EXPANSION', flavorText: 'Stores wealth in a dimension with no withdrawal limits.',            stats: [{ type: 'gold_rate', value: 2.5, isMultiplier: true }, { type: 'tap_damage',      value: 1.5, isMultiplier: true }] },
      { name: 'SINGULARITY_MATRIX',slot: 'RAM',       flavorText: 'A memory system that converts computation directly into wealth.',    stats: [{ type: 'gold_rate', value: 2.2, isMultiplier: true }, { type: 'crit_multiplier', value: 1.7, isMultiplier: true }] },
      { name: 'SINGULARITY_ANCHOR',slot: 'CPU',       flavorText: 'Tethers your rig to the most profitable timeline.',                  stats: [{ type: 'gold_rate', value: 2.0, isMultiplier: true }, { type: 'idle_dps',        value: 1.8, isMultiplier: true }] },
      { name: 'SINGULARITY_CROWN', slot: 'GPU',       flavorText: 'The sovereign piece. Alone it is powerful. Together it is absolute.',stats: [{ type: 'gold_rate', value: 3.0, isMultiplier: true }, { type: 'tap_damage',      value: 2.0, isMultiplier: true }] },
    ],
  },
];
