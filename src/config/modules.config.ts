/**
 * Home/Landing Module Configuration
 * 
 * Controls visibility and settings for modular game sections.
 * Each module can be independently enabled/disabled without touching the rest of the page.
 */

export interface ModuleConfig {
  /** Whether this module is enabled and visible */
  enabled: boolean;
  /** Display order (lower = appears first) */
  order: number;
  /** Optional label override */
  label?: string;
}

export interface ModulesConfiguration {
  /** Daily Ops / Challenges module */
  dailyOps: ModuleConfig;
  /** Tournaments module */
  tournaments: ModuleConfig;
  /** Clans module */
  clans: ModuleConfig;
  /** Leaderboard module */
  leaderboard: ModuleConfig;
  /** Achievements module */
  achievements: ModuleConfig;
  /** Shop module */
  shop: ModuleConfig;
}

/**
 * Default module configuration.
 * Edit this object to enable/disable modules or change their order.
 */
export const MODULES_CONFIG: ModulesConfiguration = {
  dailyOps: {
    enabled: true,
    order: 1,
    label: 'DAILY',
  },
  tournaments: {
    enabled: true,
    order: 2,
    label: 'TOURNEY',
  },
  clans: {
    enabled: true,
    order: 3,
    label: 'CLAN',
  },
  leaderboard: {
    enabled: true,
    order: 4,
    label: 'RANKS',
  },
  achievements: {
    enabled: true,
    order: 5,
    label: 'FEATS',
  },
  shop: {
    enabled: true,
    order: 6,
    label: 'SHOP',
  },
};

/**
 * Helper to get enabled modules sorted by order
 */
export function getEnabledModules(): Array<{ key: keyof ModulesConfiguration; config: ModuleConfig }> {
  return (Object.entries(MODULES_CONFIG) as Array<[keyof ModulesConfiguration, ModuleConfig]>)
    .filter(([, config]) => config.enabled)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, config]) => ({ key, config }));
}

/**
 * Check if a specific module is enabled
 */
export function isModuleEnabled(module: keyof ModulesConfiguration): boolean {
  return MODULES_CONFIG[module]?.enabled ?? false;
}
