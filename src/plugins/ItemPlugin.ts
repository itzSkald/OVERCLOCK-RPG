import type { IPlugin, IEngine, GameState, GameEvent, HardwareItem, ItemSlot, ItemRarity, ModifierDef } from '../engine/types';

const SLOT_ITEMS: Record<ItemSlot, string[]> = {
  RAM: [
    'DDR5_GHOST', 'PHANTOM_RAM', 'VENOM_DIMM', 'SHADOW_CACHE',
    'HYPERTHREAD_STICK', 'OVERCLOCKED_DDR', 'VOLATILE_BANK', 'NULL_PTR_MODULE',
  ],
  GPU: [
    'VOID_SHADER', 'FRACTURE_GPU', 'DARK_RENDERER', 'QUANTUM_CORE_GPU',
    'ROGUE_PIXEL', 'SHADER_DAEMON', 'ENTROPY_CARD', 'PARALLEL_GHOST',
  ],
  CPU: [
    'EXPLOIT_PROC', 'SILICON_WRAITH', 'ZERO_DAY_CHIP', 'OVERCLOCK_CORE',
    'PHANTOM_CPU', 'DAEMON_PROC', 'ROOTKIT_SILICON', 'NULL_CORE',
  ],
  EXPANSION: [
    'CHAOS_NIC', 'GHOST_RAID', 'OVERFLOW_PCI', 'BACKDOOR_CARD',
    'INJECTION_BUS', 'EXPLOIT_BRIDGE', 'DARK_PCIE', 'SHADOW_EXPANSION',
  ],
};

const ITEM_FLAVORS: Record<string, string> = {
  DDR5_GHOST: 'Addresses that should not exist hold your arsenal.',
  PHANTOM_RAM: 'It shows up in no process table. Runs in everything.',
  VENOM_DIMM: 'Leaked from a black site. Runs hot. Runs mean.',
  SHADOW_CACHE: 'Prefetches tomorrow\'s attacks.',
  HYPERTHREAD_STICK: 'Twice the threads, twice the carnage.',
  OVERCLOCKED_DDR: 'Voided warranty. Doubled damage.',
  VOLATILE_BANK: 'Contents survive power loss. Revenants don\'t reset.',
  NULL_PTR_MODULE: 'References nothing. Destroys everything.',
  VOID_SHADER: 'Renders pain in resolutions enemies can\'t perceive.',
  FRACTURE_GPU: 'Stress-tested past the point of sanity.',
  DARK_RENDERER: 'Draws frames of destruction before they happen.',
  QUANTUM_CORE_GPU: 'Superposition: hit and miss, simultaneously.',
  ROGUE_PIXEL: 'One bad actor in 4K. That\'s enough.',
  SHADER_DAEMON: 'Compiles malice into every draw call.',
  ENTROPY_CARD: 'Randomness as a weapon. Chaos is the strategy.',
  PARALLEL_GHOST: 'Multiple threads, zero traces.',
  EXPLOIT_PROC: 'Runs your code before you write it.',
  SILICON_WRAITH: 'No heat signature. No mercy.',
  ZERO_DAY_CHIP: 'Patched by no one. Feared by all.',
  OVERCLOCK_CORE: 'Cooling not included. Sanity not included.',
  PHANTOM_CPU: 'Listed as idle in all monitors. Never idle.',
  DAEMON_PROC: 'init spawned it. Nothing can kill it.',
  ROOTKIT_SILICON: 'Embedded in firmware. Deeper than the OS.',
  NULL_CORE: 'Undefined behavior is a feature.',
  CHAOS_NIC: 'Packets arrive before they are sent.',
  GHOST_RAID: 'Storage array that only you can see.',
  OVERFLOW_PCI: 'Buffer overflow weaponized as hardware.',
  BACKDOOR_CARD: 'Manufacturer left a key. You found it.',
  INJECTION_BUS: 'Everything on the bus is yours now.',
  EXPLOIT_BRIDGE: 'Bridges two networks neither should touch.',
  DARK_PCIE: 'PCIe lane to somewhere the spec forgot.',
  SHADOW_EXPANSION: 'Expands into address space that does not exist.',
};

const RARITY_WEIGHTS: [ItemRarity, number][] = [
  ['Common', 60],
  ['Rare', 28],
  ['Epic', 10],
  ['Legendary', 2],
];

const RARITY_STAT_MULTIPLIERS: Record<ItemRarity, number> = {
  Common: 1,
  Rare: 1.8,
  Epic: 3.2,
  Legendary: 6,
};

const SLOTS: ItemSlot[] = ['RAM', 'GPU', 'CPU', 'EXPANSION'];

const SLOT_PRIMARY_STAT: Record<ItemSlot, ModifierDef['type']> = {
  RAM: 'idle_dps',
  GPU: 'tap_damage',
  CPU: 'crit_chance',
  EXPANSION: 'gold_rate',
};

const SLOT_SECONDARY_STAT: Record<ItemSlot, ModifierDef['type']> = {
  RAM: 'tap_damage',
  GPU: 'idle_dps',
  CPU: 'crit_multiplier',
  EXPANSION: 'tap_damage',
};

function rollRarity(tier: number, isBoss: boolean): ItemRarity {
  // Boss kills and higher tiers shift rarity up
  const bossBonus = isBoss ? 15 : 0;
  const tierBonus = tier * 3;
  const total = RARITY_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total - bossBonus - tierBonus;

  for (const [rarity, weight] of RARITY_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return isBoss && tier >= 3 ? 'Epic' : 'Common';
}

function rollDropChance(tier: number, isBoss: boolean): boolean {
  const base = 0.15 + tier * 0.05;
  const chance = isBoss ? Math.min(0.95, base * 3) : Math.min(0.60, base);
  return Math.random() < chance;
}

function generateItem(tier: number, isBoss: boolean): HardwareItem {
  const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)];
  const rarity = rollRarity(tier, isBoss);
  const names = SLOT_ITEMS[slot];
  const name = names[Math.floor(Math.random() * names.length)];
  const mult = RARITY_STAT_MULTIPLIERS[rarity];

  const primaryType = SLOT_PRIMARY_STAT[slot];
  const secondaryType = SLOT_SECONDARY_STAT[slot];

  const stats: ModifierDef[] = [
    {
      type: primaryType,
      value: primaryType === 'crit_chance'
        ? parseFloat((0.03 * (tier + 1) * mult).toFixed(3))
        : parseFloat((1 + 0.15 * (tier + 1) * mult).toFixed(3)),
      isMultiplier: primaryType !== 'crit_chance',
    },
  ];

  // Rare+ get a secondary stat
  if (rarity !== 'Common') {
    stats.push({
      type: secondaryType,
      value: secondaryType === 'crit_multiplier'
        ? parseFloat((0.2 * mult).toFixed(3))
        : parseFloat((1 + 0.08 * (tier + 1) * mult).toFixed(3)),
      isMultiplier: secondaryType !== 'crit_multiplier',
    });
  }

  return {
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    slot,
    rarity,
    tier,
    stats,
    flavorText: ITEM_FLAVORS[name] ?? 'Unknown provenance.',
    droppedAt: Date.now(),
  };
}

const INVENTORY_MAX = 40;

export class ItemPlugin implements IPlugin {
  id = 'items';
  dependencies = ['enemy'];
  stateKeys = ['inventory', 'equippedItems'] as (keyof GameState)[];
  defaultState = { inventory: [], equippedItems: { RAM: null, GPU: null, CPU: null, EXPANSION: null } };

  private engine!: IEngine;
  private unsub?: () => void;
  private unsubSync?: () => void;
  private unsubOverclock?: () => void;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    this.unsubSync = engine.on('state_sync', () => {
      // State fields auto-restored by engine; re-apply equipped item modifiers
      this.applyEquippedModifiers();
    });

    this.unsub = engine.on('enemy_death', (event: GameEvent<{ enemy: { isBoss: boolean; tier: number } }>) => {
      const { enemy } = event.payload;
      if (rollDropChance(enemy.tier, enemy.isBoss)) {
        const item = generateItem(enemy.tier, enemy.isBoss);
        const current = engine.state.inventory ?? [];
        const trimmed = current.length >= INVENTORY_MAX ? current.slice(current.length - INVENTORY_MAX + 1) : current;
        engine.updateState({ inventory: [...trimmed, item] });
        engine.emit('item_drop', { item });
      }
    });

    this.unsubOverclock = engine.on('overclock', () => {
      // Keep equipped items and inventory across overclock — they are permanent
    });
  }

  equip(itemId: string): boolean {
    const state = this.engine.state;
    const item = state.inventory.find(i => i.id === itemId);
    if (!item) return false;

    const previouslyEquipped = state.equippedItems[item.slot];
    const newEquipped = { ...state.equippedItems, [item.slot]: item };

    // Move displaced item back to inventory
    let newInventory = state.inventory.filter(i => i.id !== itemId);
    if (previouslyEquipped) {
      newInventory = [...newInventory, previouslyEquipped];
    }

    this.engine.updateState({ equippedItems: newEquipped, inventory: newInventory });
    this.applyEquippedModifiers();
    this.engine.emit('item_equipped', { item, slot: item.slot });
    return true;
  }

  unequip(slot: ItemSlot): boolean {
    const state = this.engine.state;
    const item = state.equippedItems[slot];
    if (!item) return false;

    const newEquipped = { ...state.equippedItems, [slot]: null };
    const newInventory = [...state.inventory, item];
    this.engine.updateState({ equippedItems: newEquipped, inventory: newInventory });
    this.applyEquippedModifiers();
    this.engine.emit('item_unequipped', { item, slot });
    return true;
  }

  private applyEquippedModifiers(): void {
    this.engine.removeModifiers('items');
    const equipped = this.engine.state.equippedItems;
    for (const item of Object.values(equipped)) {
      if (!item) continue;
      for (const stat of item.stats) {
        this.engine.addModifier('items', stat);
      }
    }
  }

  cleanup(): void {
    this.unsub?.();
    this.unsubSync?.();
    this.unsubOverclock?.();
    this.engine?.removeModifiers('items');
  }
}
