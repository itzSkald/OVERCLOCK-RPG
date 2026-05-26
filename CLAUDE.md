# Overclock — Codebase Notes

## MODULARITY RULES (NON-NEGOTIABLE)

- **NEVER hardcode** — all data, tables, state fields, modifiers, and events MUST be declared by plugins. The engine core NEVER references specific game logic.
- **NEVER import `supabase` directly in plugins** — use `engine.storage` (the PluginStorage layer). Only `src/lib/supabase.ts` and `AuthPlugin` (for auth SDK methods) may import the raw client.
- **NEVER modify core files when adding features** — a new feature = a new plugin file + register in `App.tsx`. You should NEVER need to touch `Engine.ts`, `StateManager.ts`, `PluginRegistry.ts`, or `PluginStorage.ts`.
- **100% modular** — plugins declare their own `defaultState`, `stateKeys`, and register their own tables via `engine.storage.registerTable()`. No central registry of game-specific data.
- **Plugins communicate only via events and shared GameState** — never import another plugin's internals. Use `engine.getPlugin<T>(id)` for typed access to public methods only.
- **NEVER await network calls inside `init()`** — this blocks boot and causes black screens. Use fire-and-forget: `void this.loadData()`.

## Adding a plugin

1. Create `src/plugins/MyPlugin.ts`:

```ts
import type { IPlugin, IEngine, GameState } from '../engine/types';

export class MyPlugin implements IPlugin {
  id = 'my_plugin';
  dependencies = ['auth'];   // ids that must init before this one
  stateKeys = ['myField'] as (keyof GameState)[];  // fields this plugin owns
  defaultState = { myField: 'initial_value' };     // defaults for those fields

  private engine!: IEngine;
  private unsub?: () => void;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    // Register any tables this plugin needs
    engine.storage.registerTable(this.id, { table: 'my_table', userScoped: true });

    this.unsub = engine.on('some_event', (event) => { /* ... */ });

    // If you need data from the network, fire-and-forget:
    void this.loadData();
  }

  private async loadData(): Promise<void> {
    const { data } = await this.engine.storage.load('my_table', { user_id: '...' });
    // process data...
  }

  onTick(delta: number, state: GameState): void {
    // runs every 100ms, delta = seconds since last tick
  }

  cleanup(): void {
    this.unsub?.();
    this.engine?.removeModifiers(this.id);  // always use ?. in cleanup
  }
}
```

2. Register it in `src/App.tsx` inside `buildEngine()`:

```ts
engine.register(new MyPlugin());
```

That's it. The registry resolves init order from `dependencies` automatically. The engine pre-populates `defaultState` before any `init()` runs, and auto-restores `stateKeys` from saved data when a save is loaded.

## Adding new GameState fields

When your plugin needs to own new state:

1. Add the field to `GameState` in `src/engine/types.ts`:
   ```ts
   export interface GameState {
     // ...existing fields...
     myField: string;
   }
   ```

2. Add the field's default to `DEFAULT_STATE` in `src/engine/StateManager.ts`:
   ```ts
   export const DEFAULT_STATE: GameState = {
     // ...existing defaults...
     myField: 'initial_value',
   };
   ```

3. Declare `stateKeys` and `defaultState` on your plugin class (as shown above). The engine auto-restores these from saved data on load.

## Adding a new database table

When your plugin needs its own table:

1. Create a Supabase migration using the `mcp__supabase__apply_migration` tool:
   ```sql
   CREATE TABLE IF NOT EXISTS my_table (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid REFERENCES auth.users(id) NOT NULL,
     some_data jsonb DEFAULT '{}'::jsonb,
     created_at timestamptz DEFAULT now()
   );
   ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users can read own data" ON my_table FOR SELECT TO authenticated USING (auth.uid() = user_id);
   CREATE POLICY "Users can insert own data" ON my_table FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
   CREATE POLICY "Users can update own data" ON my_table FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
   CREATE POLICY "Users can delete own data" ON my_table FOR DELETE TO authenticated USING (auth.uid() = user_id);
   ```

2. Register the table in your plugin's `init()`:
   ```ts
   engine.storage.registerTable(this.id, { table: 'my_table', userScoped: true });
   ```

3. Use `engine.storage` methods — NEVER import supabase directly:
   ```ts
   await this.engine.storage.load('my_table', { user_id: userId });
   await this.engine.storage.save('my_table', { user_id: userId, some_data: {} }, 'user_id');
   ```

## Adding a new game event

1. Add the event name to `GameEventType` in `src/engine/types.ts`:
   ```ts
   export type GameEventType = '...' | 'my_event';
   ```

2. Emit it wherever it makes sense: `engine.emit('my_event', payload)`.
3. Listen anywhere: `engine.on('my_event', handler)`.

## Plugin state management

- **`defaultState`**: declare the initial values for your plugin's GameState fields. The engine merges all plugin defaults before boot.
- **`stateKeys`**: declare which GameState keys belong to this plugin. On save load, the engine auto-restores these from saved data (no manual `state_sync` handler needed for pure field restoration).
- **Post-restore logic**: if your plugin needs to DO something after state loads (apply modifiers, spawn entities), listen to `state_sync` — but your fields are already populated by the time it fires.
- **State**: read with `engine.state.field`, write with `engine.updateState({ field: value })` (shallow merge).

## Database access (PluginStorage)

Plugins access the database exclusively through `engine.storage`:

```ts
// Register your table in init()
engine.storage.registerTable(this.id, { table: 'my_table', userScoped: true });

// Read one row
const { data, error } = await engine.storage.load('my_table', { user_id: userId }, 'col1, col2');

// Read many rows
const { data: rows } = await engine.storage.loadMany('my_table', { user_id: userId });

// Upsert (insert or update on conflict)
await engine.storage.save('my_table', { user_id, col1: 'val' }, 'user_id');

// Insert new row (optionally return columns)
await engine.storage.insert('my_table', { user_id, col1: 'val' }, 'id, col1');

// Delete
await engine.storage.remove('my_table', { id: rowId });
```

## Key rules

- **`init()` must return fast — never `await` network calls inside it**: `init()` is awaited by `engine.boot()`, which only emits `'ALL SYSTEMS ONLINE'` after every plugin has finished initializing. `BootScreen` waits for that event before calling `onComplete`. If any plugin `await`s a network request inside `init()`, the entire boot hangs and the screen stays black forever. Pattern: fire-and-forget with `void`:
  ```ts
  // WRONG — blocks boot:
  await this.loadSave();
  // CORRECT — does not block boot; state_sync fires when it completes:
  void this.loadSave();
  ```
- **Error isolation**: if a plugin's `init()` throws, it is caught by the registry and boot continues. The failed plugin is logged and skipped. This prevents one broken plugin from crashing the whole game.
- **`init()` timing trap**: if you listen for `auth_success` inside your plugin's `init()`, it won't fire for already-logged-in users because `AuthPlugin` emits it asynchronously. Fix: at the end of `init()`, also check `engine.getPlugin<AuthPlugin>('auth')?.getPlayer()` directly.
- **Always unsubscribe**: store the return value of `engine.on(...)` and call it in `cleanup()`.
- **Always use `?.` in cleanup**: `cleanup()` may be called before `init()` finishes (React strict mode). Always guard: `this.engine?.removeModifiers(this.id)`.
- **Modifiers**: use `engine.addModifier(this.id, { type, value, isMultiplier })` to stack numeric effects (tap_damage, idle_dps, gold_rate, crit_chance, crit_multiplier). Always call `engine.removeModifiers(this.id)` before re-adding and in `cleanup()`.

## Boot screen note

- `boot_log` events are buffered in the engine and replayed to any late subscriber, so `BootScreen` always sees the full sequence even if it mounts after `engine.boot()` fires.
- BootScreen has a 10-second safety timeout. If boot hangs, it auto-transitions to safe mode.
