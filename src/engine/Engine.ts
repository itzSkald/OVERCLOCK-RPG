import { EventSystem } from './EventSystem';
import { StateManager, DEFAULT_STATE } from './StateManager';
import { ModifierSystem } from './ModifierSystem';
import { PluginRegistry } from './PluginRegistry';
import { PluginStorage } from './PluginStorage';
import { schemaManager } from './SchemaManager';
import { registerAllSchemas } from './schemas';
import type {
  IEngine,
  IPlugin,
  IPluginStorage,
  GameEventType,
  EventHandler,
  GameState,
  ModifierDef,
} from './types';

export class GameEngine implements IEngine {
  private events = new EventSystem();
  private stateManager = new StateManager();
  private modifiers = new ModifierSystem();
  private registry = new PluginRegistry();
  private _storage = new PluginStorage();
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private lastTickTime = Date.now();
  private bootLogBuffer: string[] = [];
  isBooted = false;

  get storage(): IPluginStorage {
    return this._storage;
  }

  get state(): GameState {
    return this.stateManager.get();
  }

  emit<T>(type: GameEventType, payload: T): void {
    if (type === 'boot_log') {
      this.bootLogBuffer.push(payload as string);
    }
    this.events.emit(type, payload);
  }

  on<T>(type: GameEventType, handler: EventHandler<T>): () => void {
    const unsub = this.events.on(type, handler);
    // Replay buffered boot logs to any late subscriber (e.g. BootScreen mounts after boot fires)
    if (type === 'boot_log' && this.bootLogBuffer.length > 0) {
      const buffered = [...this.bootLogBuffer];
      Promise.resolve().then(() => {
        for (const line of buffered) {
          (handler as EventHandler<string>)({ type: 'boot_log', payload: line, timestamp: Date.now() });
        }
      });
    }
    return unsub;
  }

  off<T>(type: GameEventType, handler: EventHandler<T>): void {
    this.events.off(type, handler);
  }

  updateState(partial: Partial<GameState>): void {
    this.stateManager.update(partial);
  }

  replaceState(next: GameState): void {
    this.stateManager.replace(next);
  }

  subscribeState(listener: (state: GameState) => void): () => void {
    return this.stateManager.subscribe(listener);
  }

  getModifier(type: ModifierDef['type']): number {
    return this.modifiers.compute(type);
  }

  addModifier(pluginId: string, modifier: ModifierDef): void {
    this.modifiers.add(pluginId, modifier);
  }

  removeModifiers(pluginId: string): void {
    this.modifiers.remove(pluginId);
  }

  getPlugin<T extends IPlugin>(id: string): T | undefined {
    return this.registry.get<T>(id);
  }

  getPluginStateKeys(): (keyof GameState)[] {
    const all: (keyof GameState)[] = [];
    for (const keys of this.registry.getStateKeys().values()) {
      for (const k of keys) {
        if (!all.includes(k)) all.push(k);
      }
    }
    return all;
  }

  getPluginDefaults(): Partial<GameState> {
    return this.registry.collectDefaultState();
  }

  register(plugin: IPlugin): void {
    this.registry.register(plugin);
  }

  async boot(): Promise<void> {
    this.emit('boot_log', '> OVERCLOCK.EXE v1.0.0');
    this.emit('boot_log', '> INITIALIZING ENGINE...');
    
    // Register schemas from centralized definitions
    this.emit('boot_log', '> CHECKING DATABASE SCHEMA...');
    registerAllSchemas();
    
    // Also register schemas from individual plugins
    for (const plugin of this.registry.all()) {
      schemaManager.registerPluginSchemas(plugin);
    }
    
    // Auto-create missing tables
    try {
      const schemaLog = await schemaManager.ensureSchemas();
      for (const line of schemaLog) {
        this.emit('boot_log', `  ${line}`);
      }
    } catch (err) {
      this.emit('boot_log', `  Schema check skipped: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    
    await this.registry.initAll(this);
    this.emit('boot_log', '> ALL SYSTEMS ONLINE');
    this.isBooted = true;
    this.startTick();
  }

  private startTick(): void {
    // Initialize lastTickTime on first tick (needed for offline gold calculations)
    const now = Date.now();
    this.lastTickTime = now;
    this.stateManager.update({ lastTickTime: now });
    
    this.tickInterval = setInterval(() => {
      const now = Date.now();
      const delta = (now - this.lastTickTime) / 1000;
      this.lastTickTime = now;
      this.stateManager.update({ lastTickTime: now });

      for (const plugin of this.registry.all()) {
        plugin.onTick?.(delta, this.state);
      }

      this.emit('tick', { delta });
    }, 100);
  }

  destroy(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.registry.cleanup();
    this.events.clear();
    this.stateManager.replace({ ...DEFAULT_STATE });
    this.bootLogBuffer = [];
  }
}

let engineInstance: GameEngine | null = null;

export function getEngine(): GameEngine {
  if (!engineInstance) {
    engineInstance = new GameEngine();
  }
  return engineInstance;
}

export function resetEngine(): void {
  engineInstance?.destroy();
  engineInstance = new GameEngine();
}
