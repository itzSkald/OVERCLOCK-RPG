import type { IPlugin, PluginRole, IEngine, GameState } from './types';

export class PluginRegistry {
  private plugins = new Map<string, IPlugin>();
  private roles = new Map<PluginRole, string>();
  private _failedPlugins = new Set<string>();

  get failedPlugins(): ReadonlySet<string> {
    return this._failedPlugins;
  }

  register(plugin: IPlugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  collectDefaultState(): Partial<GameState> {
    const merged: Partial<GameState> = {};
    for (const plugin of this.plugins.values()) {
      if (plugin.defaultState) {
        Object.assign(merged, plugin.defaultState);
      }
    }
    return merged;
  }

  getStateKeys(): Map<string, (keyof GameState)[]> {
    const map = new Map<string, (keyof GameState)[]>();
    for (const plugin of this.plugins.values()) {
      if (plugin.stateKeys && plugin.stateKeys.length > 0) {
        map.set(plugin.id, plugin.stateKeys);
      }
    }
    return map;
  }

  async initAll(engine: IEngine): Promise<void> {
    // Pre-populate engine state with all plugin defaults before any init() runs
    const pluginDefaults = this.collectDefaultState();
    if (Object.keys(pluginDefaults).length > 0) {
      engine.updateState(pluginDefaults);
    }

    const ordered = this.resolveOrder();
    for (const plugin of ordered) {
      engine.emit('boot_log', `> LOADING PLUGIN: ${plugin.id.toUpperCase()}...`);
      try {
        await plugin.init(engine);
        if (plugin.roles) {
          for (const role of plugin.roles) {
            this.roles.set(role, plugin.id);
          }
        }
        engine.emit('boot_log', `> PLUGIN ${plugin.id.toUpperCase()}: OK`);
      } catch (err) {
        this._failedPlugins.add(plugin.id);
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Engine] Plugin "${plugin.id}" failed to init:`, err);
        engine.emit('boot_log', `> PLUGIN ${plugin.id.toUpperCase()}: FAILED (${msg})`);
      }
    }
  }

  get<T extends IPlugin>(id: string): T | undefined {
    return this.plugins.get(id) as T | undefined;
  }

  getByRole(role: PluginRole): IPlugin | undefined {
    const id = this.roles.get(role);
    return id ? this.plugins.get(id) : undefined;
  }

  all(): IPlugin[] {
    return Array.from(this.plugins.values());
  }

  private resolveOrder(): IPlugin[] {
    const visited = new Set<string>();
    const result: IPlugin[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const plugin = this.plugins.get(id);
      if (!plugin) return;
      for (const dep of plugin.dependencies ?? []) {
        visit(dep);
      }
      result.push(plugin);
    };

    for (const id of this.plugins.keys()) {
      visit(id);
    }

    return result;
  }

  cleanup(): void {
    for (const plugin of this.plugins.values()) {
      try {
        plugin.cleanup?.();
      } catch {
        // Plugin may not have been initialized yet (React strict mode double-invoke)
      }
    }
  }
}
