# OVERCLOCK-RPG: v0 & AI Build Instructions

**STATUS: CRITICAL — When requesting code generation, ANY hardcoded values will break the build. This document is your safeguard.**

---

## Golden Rule: ZERO HARDCODING

✅ **CORRECT**: Configuration in external files  
❌ **WRONG**: Strings, numbers, arrays, or logic embedded in plugin/component code

Every game constant, formula, default value, item name, boss stat, or skill definition must be:
1. **Declared** in a config file (`src/config/*.ts`)
2. **Imported** into the plugin
3. **Used** via the imported reference

**Never, ever hardcode in plugin methods.**

---

## Quick Ref: File Structure

```
src/
├── config/
│   ├── game.config.ts          ← Game data, formulas, item definitions
│   ├── items.config.ts          ← Item names, stat ranges, drop rates
│   ├── skills.config.ts         ← Skill definitions, cooldowns
│   ├── bosses.config.ts         ← Boss stats, phases, abilities
│   └── ...other configs
├── engine/
│   ├── types.ts                ← Core engine types (DON'T MODIFY UNLESS NECESSARY)
│   ├── Engine.ts               ← Tick loop, plugin registry (HANDS OFF)
│   ├── StateManager.ts         ← State updates (READ-ONLY)
│   └── ...other engine files
├── plugins/
│   ├── MyPlugin.ts             ← YOUR NEW PLUGINS (see template below)
│   ├── ComponentPlugin.ts      ← Example of correct plugin structure
│   └── ...other plugins
└── components/
    └── ...UI components
```

---

## When v0 / AI Tool Asks for Code

### DO:

✅ "Add a new feature as a plugin"  
✅ "Create `src/config/newfeature.config.ts` with these values"  
✅ "Register in `src/App.tsx` plugins array"  
✅ "Import config constants at plugin top"  
✅ "Use `engine.storage.registerTable()` for DB tables"  
✅ "Emit events via `engine.emit()`"  
✅ "Listen via `engine.on()`"  
✅ "Use `engine.getModifier()` for stat bonuses"  
✅ "Add new GameState fields → add to `src/engine/types.ts` + declare in plugin's `stateKeys` and `defaultState`"

### DON'T:

❌ "Hardcode boss HP, item names, or drop rates in the plugin"  
❌ "Put magic numbers anywhere except config files"  
❌ "Modify `Engine.ts`, `StateManager.ts`, `PluginRegistry.ts`"  
❌ "Import supabase directly (use `engine.storage` only)"  
❌ "Await network calls in `init()` — use fire-and-forget"  
❌ "Create plugin state fields not in `stateKeys` or `defaultState`"  
❌ "Import plugin A's internals in plugin B (use `engine.getPlugin<T>(id)` public methods only)"

---

## Plugin Template (Copy This)

```typescript
// src/plugins/MyPlugin.ts

import type { IPlugin, IEngine, GameState, GameEvent } from '../engine/types';
import { MY_CONFIG } from '../config/myfeature.config';

export class MyPlugin implements IPlugin {
  id = 'my_plugin';                          // Unique string ID
  dependencies = ['auth', 'persistence'];   // Plugins that must init first
  stateKeys = ['myField'] as (keyof GameState)[]; // Fields this plugin owns
  
  defaultState = {
    myField: MY_CONFIG.initialValue,         // ← Use config, NEVER hardcode
  };

  private engine!: IEngine;
  private unsub?: () => void;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    // Register any database tables
    engine.storage.registerTable(this.id, {
      table: 'my_table',
      userScoped: true,
    });

    // Subscribe to events (fire-and-forget for network)
    this.unsub = engine.on('some_event', (event) => {
      // Handle event
    });

    // Fire-and-forget data loading (NEVER await in init)
    void this.loadData();
  }

  private async loadData(): Promise<void> {
    const { data, error } = await this.engine.storage.load('my_table', {
      user_id: 'current_user_id',
    });
    if (error) return; // Log/ignore silently
    // Process data...
  }

  // Called every 100ms by the engine
  onTick?(delta: number, state: GameState): void {
    // Use config constants: MY_CONFIG.someValue
    // Never hardcode numbers here
  }

  // Called on every event (optional)
  onEvent?(event: GameEvent): void {
    if (event.type === 'specific_event') {
      // Handle
    }
  }

  // Always clean up
  cleanup(): void {
    this.unsub?.();
    this.engine?.removeModifiers(this.id);
  }
}
```

---

## Config File Template (Copy This)

```typescript
// src/config/myfeature.config.ts

export const MY_CONFIG = {
  // ─────────────────────────────────────────────────
  // NEVER edit these in the plugin—only here
  // ─────────────────────────────────────────────────
  initialValue: 'default',
  updateInterval: 5000, // ms
  maxItems: 100,
  rarityWeights: [
    ['Common', 50],
    ['Rare', 30],
    ['Epic', 15],
    ['Legendary', 4],
  ] as const,

  formulas: {
    calculateBonus: (tier: number) => tier * 1.5,
    calculateCost: (level: number) => Math.floor(100 * Math.pow(1.2, level)),
  },
};
```

---

## Adding a New GameState Field

**Scenario**: You need a new field (e.g., `myCounter: number`)

### Step 1: Add to `src/engine/types.ts`
```typescript
export interface GameState {
  // ...existing fields...
  myCounter: number;  // ← Add here
}
```

### Step 2: Add default to `src/engine/StateManager.ts`
```typescript
export const DEFAULT_STATE: GameState = {
  // ...existing defaults...
  myCounter: 0,  // ← Add here
};
```

### Step 3: Declare in your plugin
```typescript
export class MyPlugin implements IPlugin {
  stateKeys = ['myCounter'] as (keyof GameState)[];
  defaultState = { myCounter: 0 };  // OR import from config
  // ...rest of plugin
}
```

That's it. The engine auto-restores from saves.

---

## Adding a Database Table

**When**: Your plugin needs persistent data (leaderboard, raids, etc.)

### Step 1: Create migration (ask the agent to create)
```sql
CREATE TABLE IF NOT EXISTS my_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
-- Add policies for SELECT, INSERT, UPDATE, DELETE
```

### Step 2: Register in plugin's `init()`
```typescript
async init(engine: IEngine): Promise<void> {
  this.engine = engine;
  engine.storage.registerTable(this.id, {
    table: 'my_table',
    userScoped: true,  // RLS scoped to user_id
  });
}
```

### Step 3: Use `engine.storage` (NEVER import supabase)
```typescript
// Load
const { data, error } = await engine.storage.load('my_table', {
  user_id: userId,
});

// Save
await engine.storage.save('my_table', {
  user_id: userId,
  data: { some: 'value' },
}, 'user_id'); // conflictKey = upsert column

// Insert
const { data, error } = await engine.storage.insert('my_table', {
  user_id: userId,
  data: {},
});

// Delete
await engine.storage.remove('my_table', { user_id: userId });
```

---

## Events: Emitting & Listening

### Adding a new event type:

1. **Add to `src/engine/types.ts`**:
```typescript
export type GameEventType = '...' | 'my_event_type';
```

2. **Emit from anywhere**:
```typescript
engine.emit('my_event_type', { some: 'payload' });
```

3. **Listen anywhere**:
```typescript
engine.on('my_event_type', (event) => {
  console.log(event.payload);
});
```

**Rule**: Only emit when something meaningful happens. Don't spam events.

---

## Modifiers: Adding Stat Bonuses

Modifiers are how equipment, upgrades, and buffs apply bonuses without hardcoding.

### Add a modifier type to `src/engine/types.ts` if new:
```typescript
export interface ModifierDef {
  type: 'tap_damage' | 'idle_dps' | 'gold_rate' | 'crit_chance' | 'crit_multiplier' | 'your_new_type';
  value: number;
  isMultiplier: boolean;  // true = 1.5x multiplier; false = +100 additive
}
```

### In your plugin, apply modifiers:
```typescript
// Add
engine.addModifier(this.id, {
  type: 'tap_damage',
  value: 1.25,       // 25% bonus
  isMultiplier: true,
});

// Remove all of plugin's modifiers (in cleanup)
engine.removeModifiers(this.id);
```

### In calculations, fetch the modifier:
```typescript
const tapDamageBonus = engine.getModifier('tap_damage'); // e.g., 1.25
const totalDamage = baseDamage * tapDamageBonus;
```

---

## Asking v0 / Code Tools the RIGHT Way

### ❌ WRONG:
> "Add a boss with 500 HP and a phase at 250 HP that blocks 50% damage"

**Problem**: The tool will hardcode 500, 250, 0.5 in the code.

### ✅ CORRECT:
> "Create `src/config/bosses.config.ts` with boss definitions including { id, name, maxHp, phases: [{ threshold, name, shieldChance }] }. Then create `BossPlugin` that reads from that config, implements phase detection via the `bossPhase` field in `Enemy` type, and adds shield modifiers via `engine.addModifier()`. Register in App.tsx."

---

## Checking Build Health

Before pushing to production:

```bash
npm run build
```

If it fails:
1. Check for hardcoded strings/numbers in plugin files
2. Verify all imports point to config files
3. Check `src/engine/types.ts` for any new GameState fields
4. Run `npm run typecheck` to catch missed types

---

## Example: Correct vs. Wrong

### ❌ WRONG – Hardcoded Boss Plugin
```typescript
export class BossPlugin implements IPlugin {
  id = 'boss';

  onTick(delta: number, state: GameState): void {
    // ❌❌❌ HARDCODED VALUES
    if (state.enemy.hp < state.enemy.maxHp * 0.5) {
      state.enemy.bossPhase = 'enrage';
    }
    if (state.enemy.hp < 300 && !state.enemy.hasShield) {
      state.enemy.hasShield = true;
      // Shield blocks 50% damage ❌ HARDCODED
    }
  }
}
```

### ✅ CORRECT – Config-Driven Boss Plugin
```typescript
// src/config/bosses.config.ts
export const BOSS_CONFIG = {
  phases: [
    { threshold: 0.5, name: 'enrage', damageMult: 0.5 },
    { threshold: 0.25, name: 'shield', blockChance: 0.5 },
  ],
};

// src/plugins/BossPlugin.ts
import { BOSS_CONFIG } from '../config/bosses.config';

export class BossPlugin implements IPlugin {
  id = 'boss';

  onTick(delta: number, state: GameState): void {
    if (!state.enemy) return;
    
    for (const phase of BOSS_CONFIG.phases) {
      if (state.enemy.hp < state.enemy.maxHp * phase.threshold) {
        state.enemy.bossPhase = phase.name;
        if (phase.damageMult !== undefined) {
          // Apply modifier from config
          this.engine.addModifier(this.id, {
            type: 'tap_damage',
            value: phase.damageMult,
            isMultiplier: true,
          });
        }
      }
    }
  }
}
```

---

## Summary Checklist

When a tool generates code:

- [ ] No hardcoded strings, numbers, or arrays in plugin files
- [ ] All game data in `src/config/*.ts`
- [ ] New GameState fields added to `types.ts` + `StateManager.ts`
- [ ] Plugin declares `stateKeys` and `defaultState`
- [ ] Plugin added to `src/App.tsx` `createEngine()` function
- [ ] Database tables registered via `engine.storage.registerTable()`
- [ ] Network calls are fire-and-forget (no await in `init()`)
- [ ] No direct supabase imports (only in AuthPlugin & SupabasePlugin)
- [ ] Modifiers used for stat bonuses, not hardcoded multipliers
- [ ] `cleanup()` always removes modifiers and unsubscribes
- [ ] Build passes: `npm run build && npm run typecheck`

---

## Where to Put Things

| Item | Location |
|------|----------|
| Game constants, formulas | `src/config/` |
| New plugin | `src/plugins/YourPlugin.ts` + register in `App.tsx` |
| New GameState field | `src/engine/types.ts` + `src/engine/StateManager.ts` |
| New event type | `src/engine/types.ts` GameEventType union |
| UI component | `src/components/` |
| Database schema | Via migration (plugin declares via `schema` property) |

---

## One More Time: THE RULE

> **Every single number, string, array, or configuration value that affects gameplay MUST live in `src/config/` and be imported into plugins. ZERO hardcoding in plugin methods.**

If you violate this, the build will be fragile, impossible to balance, and a nightmare to maintain.

---

**Created**: 2026-05-31  
**For**: v0.dev, ChatGPT, Claude, and any code generation tool  
**Enforced by**: Vidarss (Team Lead)