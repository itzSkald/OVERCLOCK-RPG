import type { IPlugin, IEngine, GameState, GameEvent, ComponentDef } from '../engine/types';
import type { GoldPlugin } from './GoldPlugin';
import type { EnemyPlugin } from './EnemyPlugin';

const INITIAL_COMPONENTS: ComponentDef[] = [
  {
    id: 'gpu',
    name: 'GPU_UNIT',
    description: 'Parallel damage processor',
    baseDps: 0.5,
    baseCost: 10,
    costMultiplier: 1.15,
    level: 0,
    unlocked: true,
    color: 'cyan',
  },
  {
    id: 'ram',
    name: 'RAM_BANK',
    description: 'Buffer overflow exploit',
    baseDps: 2,
    baseCost: 100,
    costMultiplier: 1.18,
    level: 0,
    unlocked: false,
    color: 'green',
  },
  {
    id: 'cpu_cooler',
    name: 'CPU_COOLER',
    description: 'Thermal attack array',
    baseDps: 8,
    baseCost: 1000,
    costMultiplier: 1.2,
    level: 0,
    unlocked: false,
    color: 'amber',
  },
  {
    id: 'ssd',
    name: 'SSD_DRIVE',
    description: 'High-speed data injection',
    baseDps: 40,
    baseCost: 10000,
    costMultiplier: 1.22,
    level: 0,
    unlocked: false,
    color: 'pink',
  },
  {
    id: 'psu',
    name: 'PSU_CORE',
    description: 'Power surge devastator',
    baseDps: 200,
    baseCost: 100000,
    costMultiplier: 1.25,
    level: 0,
    unlocked: false,
    color: 'cyan',
  },
];

export function getComponentCost(comp: ComponentDef): number {
  return Math.floor(comp.baseCost * Math.pow(comp.costMultiplier, comp.level));
}

export function getComponentDps(comp: ComponentDef): number {
  if (comp.level === 0) return 0;
  return comp.baseDps * comp.level;
}

export function getTotalIdleDps(components: Record<string, ComponentDef>): number {
  return Object.values(components).reduce((sum, c) => sum + getComponentDps(c), 0);
}

export class ComponentPlugin implements IPlugin {
  id = 'component';
  dependencies = ['gold', 'enemy'];
  stateKeys = ['components'] as (keyof GameState)[];

  private engine!: IEngine;
  private idleDamageAccum = 0;

  get defaultState() {
    const initialMap: Record<string, ComponentDef> = {};
    for (const c of INITIAL_COMPONENTS) {
      initialMap[c.id] = { ...c };
    }
    return { components: initialMap };
  }

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    engine.on('state_sync', (event: GameEvent<{ savedState: GameState } | null>) => {
      if (event.payload?.savedState?.components) {
        const saved = event.payload.savedState.components;
        const merged: Record<string, ComponentDef> = {};
        for (const c of INITIAL_COMPONENTS) {
          merged[c.id] = saved[c.id] ? { ...c, ...saved[c.id] } : { ...c };
        }
        engine.updateState({ components: merged });
      }
    });

    engine.on('overclock', () => {
      const reset: Record<string, ComponentDef> = {};
      for (const c of INITIAL_COMPONENTS) {
        reset[c.id] = { ...c };
      }
      engine.updateState({ components: reset });
    });
  }

  purchase(componentId: string): boolean {
    const state = this.engine.state;
    const comp = state.components[componentId];
    if (!comp) return false;

    const cost = getComponentCost(comp);
    const goldPlugin = this.engine.getPlugin<GoldPlugin>('gold');
    if (!goldPlugin?.spend(cost)) return false;

    const updatedComp = { ...comp, level: comp.level + 1 };

    // Unlock next component
    const idx = INITIAL_COMPONENTS.findIndex(c => c.id === componentId);
    const nextComp = INITIAL_COMPONENTS[idx + 1];

    const updatedComponents = { ...state.components, [componentId]: updatedComp };
    if (nextComp && !state.components[nextComp.id]?.unlocked) {
      updatedComponents[nextComp.id] = { ...state.components[nextComp.id], unlocked: true };
    }

    this.engine.updateState({ components: updatedComponents });
    this.engine.emit('component_levelup', { componentId, level: updatedComp.level, cost });
    return true;
  }

  onTick(delta: number, state: GameState): void {
    if (!state.enemy || state.enemy.hp <= 0) return;

    const idleDps = getTotalIdleDps(state.components) * this.engine.getModifier('idle_dps');
    if (idleDps <= 0) return;

    this.idleDamageAccum += idleDps * delta;

    if (this.idleDamageAccum >= 1) {
      const dmg = Math.floor(this.idleDamageAccum);
      this.idleDamageAccum -= dmg;

      const enemyPlugin = this.engine.getPlugin<EnemyPlugin>('enemy');
      enemyPlugin?.applyDamage(dmg);

      const dmgEvent = {
        id: `idle_${Date.now()}`,
        value: dmg,
        type: 'idle' as const,
      };
      this.engine.emit('damage_number', dmgEvent);
    }
  }
}
