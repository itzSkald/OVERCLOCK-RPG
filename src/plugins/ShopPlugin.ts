import type { IPlugin, IEngine, GameState, GameEvent, Player } from '../engine/types';
import type { AuthPlugin } from './AuthPlugin';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  currency: 'oct' | 'diamond';
  price: number;
  modifierType: 'tap_damage' | 'idle_dps' | 'gold_rate' | 'crit_chance' | 'crit_multiplier';
  modifierValue: number;
  isMultiplier: boolean;
  color: string;
  icon: string;
  maxPurchases: number;
}

export const SHOP_CATALOG: ShopItem[] = [
  // OC Token store — permanent passive boosts
  {
    id: 'shop_tap_1',
    name: 'NEURAL OVERCLK I',
    description: '+15% tap damage permanently',
    currency: 'oct',
    price: 1,
    modifierType: 'tap_damage',
    modifierValue: 1.15,
    isMultiplier: true,
    color: '#00f5ff',
    icon: 'Zap',
    maxPurchases: 5,
  },
  {
    id: 'shop_tap_2',
    name: 'NEURAL OVERCLK II',
    description: '+30% tap damage permanently',
    currency: 'oct',
    price: 3,
    modifierType: 'tap_damage',
    modifierValue: 1.3,
    isMultiplier: true,
    color: '#00f5ff',
    icon: 'Zap',
    maxPurchases: 3,
  },
  {
    id: 'shop_dps_1',
    name: 'PASSIVE HEAT SINK I',
    description: '+20% idle DPS permanently',
    currency: 'oct',
    price: 1,
    modifierType: 'idle_dps',
    modifierValue: 1.2,
    isMultiplier: true,
    color: '#39ff14',
    icon: 'Cpu',
    maxPurchases: 5,
  },
  {
    id: 'shop_dps_2',
    name: 'PASSIVE HEAT SINK II',
    description: '+50% idle DPS permanently',
    currency: 'oct',
    price: 3,
    modifierType: 'idle_dps',
    modifierValue: 1.5,
    isMultiplier: true,
    color: '#39ff14',
    icon: 'Cpu',
    maxPurchases: 3,
  },
  {
    id: 'shop_gold_1',
    name: 'GOLD MINER CHIP I',
    description: '+25% gold rate permanently',
    currency: 'oct',
    price: 2,
    modifierType: 'gold_rate',
    modifierValue: 1.25,
    isMultiplier: true,
    color: '#ffaa00',
    icon: 'Coins',
    maxPurchases: 4,
  },
  {
    id: 'shop_crit_1',
    name: 'PRECISION CORE',
    description: '+5% crit chance permanently',
    currency: 'oct',
    price: 2,
    modifierType: 'crit_chance',
    modifierValue: 0.05,
    isMultiplier: false,
    color: '#ff0080',
    icon: 'Target',
    maxPurchases: 4,
  },
  // Diamond store — powerful boosts
  {
    id: 'shop_d_tap_1',
    name: 'QUANTUM STRIKE',
    description: '+50% tap damage permanently',
    currency: 'diamond',
    price: 5,
    modifierType: 'tap_damage',
    modifierValue: 1.5,
    isMultiplier: true,
    color: '#00f5ff',
    icon: 'Zap',
    maxPurchases: 3,
  },
  {
    id: 'shop_d_dps_1',
    name: 'NEURAL GRID BOOST',
    description: '+75% idle DPS permanently',
    currency: 'diamond',
    price: 5,
    modifierType: 'idle_dps',
    modifierValue: 1.75,
    isMultiplier: true,
    color: '#39ff14',
    icon: 'Cpu',
    maxPurchases: 3,
  },
  {
    id: 'shop_d_gold_1',
    name: 'FRACTAL EXTRACTOR',
    description: '+100% gold rate permanently',
    currency: 'diamond',
    price: 8,
    modifierType: 'gold_rate',
    modifierValue: 2.0,
    isMultiplier: true,
    color: '#ffaa00',
    icon: 'Coins',
    maxPurchases: 2,
  },
  {
    id: 'shop_d_crit_1',
    name: 'EXPLOIT CHAIN',
    description: '+50% crit damage permanently',
    currency: 'diamond',
    price: 10,
    modifierType: 'crit_multiplier',
    modifierValue: 1.5,
    isMultiplier: true,
    color: '#ff0080',
    icon: 'Target',
    maxPurchases: 2,
  },
];

export class ShopPlugin implements IPlugin {
  id = 'shop';
  dependencies = ['auth'];
  stateKeys = [] as (keyof GameState)[];

  private engine!: IEngine;
  private userId: string | null = null;
  private purchaseCounts: Record<string, number> = {};
  private listeners: Array<() => void> = [];
  private unsubs: Array<() => void> = [];

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    engine.storage.registerTable(this.id, { table: 'shop_purchases', userScoped: true });

    this.unsubs.push(
      engine.on('auth_success', (event: GameEvent<Player>) => {
        this.userId = event.payload.id;
        void this.loadPurchases();
      })
    );

    const existingPlayer = engine.getPlugin<AuthPlugin>('auth')?.getPlayer();
    if (existingPlayer) {
      this.userId = existingPlayer.id;
      void this.loadPurchases();
    }

    this.unsubs.push(
      engine.on('state_sync', () => {
        this.applyAllModifiers();
      })
    );
  }

  private async loadPurchases(): Promise<void> {
    if (!this.userId) return;
    const { data } = await this.engine.storage.loadMany<{ item_id: string }>('shop_purchases', { user_id: this.userId }, 'item_id');
    this.purchaseCounts = {};
    for (const row of data) {
      this.purchaseCounts[row.item_id] = (this.purchaseCounts[row.item_id] ?? 0) + 1;
    }
    this.applyAllModifiers();
    this.notify();
  }

  private applyAllModifiers(): void {
    this.engine.removeModifiers(this.id);
    for (const item of SHOP_CATALOG) {
      const count = this.purchaseCounts[item.id] ?? 0;
      for (let i = 0; i < count; i++) {
        this.engine.addModifier(this.id, {
          type: item.modifierType,
          value: item.modifierValue,
          isMultiplier: item.isMultiplier,
        });
      }
    }
  }

  getPurchaseCount(itemId: string): number {
    return this.purchaseCounts[itemId] ?? 0;
  }

  canBuy(item: ShopItem): boolean {
    const count = this.getPurchaseCount(item.id);
    if (count >= item.maxPurchases) return false;
    if (item.currency === 'oct') {
      return this.engine.state.overclockCount >= item.price;
    }
    return this.engine.state.diamonds >= item.price;
  }

  buy(itemId: string): boolean {
    const item = SHOP_CATALOG.find(i => i.id === itemId);
    if (!item || !this.userId) return false;
    if (!this.canBuy(item)) return false;

    // Deduct currency
    if (item.currency === 'oct') {
      this.engine.updateState({ overclockCount: this.engine.state.overclockCount - item.price });
    } else {
      this.engine.updateState({ diamonds: this.engine.state.diamonds - item.price });
    }

    // Record
    this.purchaseCounts[item.id] = (this.purchaseCounts[item.id] ?? 0) + 1;
    this.applyAllModifiers();

    // Persist
    void this.engine.storage.insert('shop_purchases', {
      user_id: this.userId,
      item_id: item.id,
      currency: item.currency,
      price: item.price,
    });

    this.engine.emit('shop_purchase', { item });
    this.notify();
    return true;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  cleanup(): void {
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
    this.engine?.removeModifiers(this.id);
  }
}
