# OVERCLOCK Engine Plugin Instructions

This document describes how to create plugins and UI screens that integrate correctly with the OVERCLOCK game engine. Follow these steps exactly to ensure compatibility with the existing architecture.

---

## Table of Contents

1. [Pre-Implementation Checklist](#1-pre-implementation-checklist)
2. [Locate the General Config File](#2-locate-the-general-config-file)
3. [Plugin Interface and Structure](#3-plugin-interface-and-structure)
4. [Create the Plugin File](#4-create-the-plugin-file)
5. [Register the Plugin](#5-register-the-plugin)
6. [Create the UI Screen Component](#6-create-the-ui-screen-component)
7. [Wire UI into GameScreen](#7-wire-ui-into-gamescreen)
8. [Database Integration](#8-database-integration)
9. [File Naming and Location Conventions](#9-file-naming-and-location-conventions)
10. [Complete Example](#10-complete-example)

---

## 1. Pre-Implementation Checklist

Before implementing any new plugin, confirm the following:

### Environment
- [ ] Supabase environment variables are set correctly in `/vercel/share/.env.project`
- [ ] The app uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `VITE_` equivalents)
- [ ] Verify connection: `src/lib/supabase.ts` should support both VITE_ and NEXT_PUBLIC_ env vars

### Database
- [ ] Check existing tables in Supabase before creating new ones
- [ ] Create migration files in `supabase/migrations/` with timestamp prefix (e.g., `20260530120000_create_my_table.sql`)
- [ ] Apply migrations via Supabase MCP or dashboard

### Existing Patterns
- [ ] Search for similar plugins in `src/plugins/` to follow established patterns
- [ ] Check `src/config/game.config.ts` for existing config sections
- [ ] Verify the feature doesn't already exist in another plugin

---

## 2. Locate the General Config File

All tunable constants live in one central file:

```
src/config/game.config.ts
```

### Config Sections
The file is organized into sections:
- `ENGINE_CONFIG` — tick rate, boot, save
- `SAVE_CONFIG` — auto-save, schema version, offline progress
- `TAP_CONFIG` — tap damage, crit, combo
- `ENEMY_CONFIG` — HP scaling, boss spawn, elite chance
- `OVERCLOCK_CONFIG` — tiers, perks, gain formula
- `DAILY_CONFIG` — challenge templates, rewards
- (Add your section here following the pattern)

### Adding a New Config Section

```typescript
// ── MY_FEATURE ────────────────────────────────────────────────────────────────

export const MY_FEATURE_CONFIG = {
  /** Description of what this does. */
  someValue: 100,
  /** Another tunable. */
  anotherValue: 0.5,
} as const;
```

**Rules:**
- Add JSDoc comments for every field
- Use `as const` for type safety
- Never hardcode magic numbers in plugin files — import from config
- Group related constants together

---

## 3. Plugin Interface and Structure

All plugins must implement the `IPlugin` interface from `src/engine/types.ts`:

```typescript
export interface IPlugin {
  id: string;                              // Unique identifier (lowercase, no spaces)
  dependencies?: string[];                 // Plugin IDs that must init first
  roles?: PluginRole[];                    // Optional roles: 'auth' | 'persistence' | 'realtime' | 'tick_provider' | 'ui_registry'
  defaultState?: Partial<GameState>;       // Default values for state keys this plugin manages
  stateKeys?: (keyof GameState)[];         // Which GameState keys this plugin owns

  init(engine: IEngine): Promise<void>;    // Called during boot — required
  onTick?(delta: number, state: GameState): void;  // Called every 100ms
  onEvent?(event: GameEvent): void;        // Subscribe to engine events
  cleanup?(): void;                        // Called on engine destroy
}
```

### GameState Keys
If your plugin manages persistent state, you must:
1. Add the key(s) to the `GameState` interface in `src/engine/types.ts`
2. Declare them in `stateKeys` array
3. Provide `defaultState` values

---

## 4. Create the Plugin File

Location: `src/plugins/[FeatureName]Plugin.ts`

### Minimal Plugin Template

```typescript
import type { IPlugin, IEngine, GameState } from '../engine/types';

export class MyFeaturePlugin implements IPlugin {
  id = 'myfeature';
  stateKeys = ['myFeatureData'] as (keyof GameState)[];
  defaultState = { myFeatureData: null };

  private engine!: IEngine;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    // Subscribe to events
    engine.on('some_event', (event) => {
      // Handle event
    });
  }

  // Optional: Called every tick (100ms)
  onTick(delta: number, state: GameState): void {
    // Update logic
  }

  // Optional: Cleanup on destroy
  cleanup(): void {
    // Unsubscribe, clear intervals, etc.
  }

  // Public methods for UI to call
  doSomething(): boolean {
    // Plugin logic
    this.engine.updateState({ /* changes */ });
    this.engine.emit('my_event', { /* payload */ });
    return true;
  }
}
```

### Plugin with Database Access

```typescript
import type { IPlugin, IEngine, GameState } from '../engine/types';

export class MyDbPlugin implements IPlugin {
  id = 'mydb';
  dependencies = ['supabase']; // Ensure SupabasePlugin inits first

  private engine!: IEngine;
  private userId: string | null = null;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    // Get user ID from auth
    engine.on('auth_success', (event) => {
      this.userId = event.payload.id;
      this.loadData();
    });

    engine.on('auth_signout', () => {
      this.userId = null;
    });
  }

  private async loadData(): Promise<void> {
    if (!this.userId) return;

    const { data, error } = await this.engine.storage.load('my_table', {
      user_id: this.userId,
    });

    if (data) {
      // Process data
    }
  }

  async saveData(record: MyRecord): Promise<boolean> {
    if (!this.userId) return false;

    const { error } = await this.engine.storage.save('my_table', {
      user_id: this.userId,
      ...record,
    }, 'id'); // conflict key for upsert

    return !error;
  }
}
```

### Event Types
Add new events to `GameEventType` in `src/engine/types.ts`:

```typescript
export type GameEventType =
  | 'tap'
  | 'tick'
  // ... existing events
  | 'my_feature_activated'  // Add your events
  | 'my_feature_completed';
```

---

## 5. Register the Plugin

Location: `src/App.tsx`

### Step 1: Import the Plugin

```typescript
import { MyFeaturePlugin } from './plugins/MyFeaturePlugin';
```

### Step 2: Register in createEngine()

```typescript
function createEngine(): GameEngine {
  resetEngine();
  const engine = getEngine();

  // ... existing plugins
  engine.register(new MyFeaturePlugin()); // Add at appropriate position

  return engine;
}
```

### Registration Order
Plugins init in dependency order. Place your plugin:
- **Early** if other plugins depend on it
- **After dependencies** if it needs other plugins (use `dependencies` array)
- **Late** for UI-only features with no dependents

---

## 6. Create the UI Screen Component

Location: `src/components/game/[FeatureName]Screen.tsx`

### Screen Component Template

```typescript
import React, { useState } from 'react';
import { X, SomeIcon } from 'lucide-react';
import type { GameEngine } from '../../engine/Engine';
import type { MyFeaturePlugin } from '../../plugins/MyFeaturePlugin';
import { useGameState } from '../../hooks/useGameState';

interface MyFeatureScreenProps {
  engine: GameEngine;
  onClose: () => void;
}

export const MyFeatureScreen: React.FC<MyFeatureScreenProps> = ({ engine, onClose }) => {
  // Get plugin instance
  const plugin = engine.getPlugin<MyFeaturePlugin>('myfeature');
  
  // Subscribe to reactive state
  const someValue = useGameState(engine, s => s.someValue);
  
  // Local UI state
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    if (!plugin) return;
    setLoading(true);
    await plugin.doSomething();
    setLoading(false);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, maxHeight: '90vh',
          background: '#04040a',
          border: '1px solid #00f5ff33',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#050010',
          borderBottom: '1px solid #0a2838',
        }}>
          <div className="flex items-center gap-2">
            <SomeIcon size={16} color="#00f5ff" />
            <span className="font-pixel" style={{ color: '#00f5ff', fontSize: '10px', letterSpacing: '2px' }}>
              MY FEATURE
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <X size={16} color="#3a4a5a" />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {/* Your UI content */}
        </div>

        {/* Footer (optional) */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid #1a2a3a',
          background: '#050010',
        }}>
          <button
            onClick={handleAction}
            disabled={loading}
            className="font-pixel"
            style={{
              width: '100%',
              background: '#0a1828',
              border: '1px solid #00f5ff',
              color: '#00f5ff',
              padding: '10px',
              fontSize: '9px',
              letterSpacing: '2px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'LOADING...' : 'DO ACTION'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

### Styling Conventions
- Use inline styles (not CSS modules)
- Colors: `#00f5ff` (cyan), `#ff0080` (pink), `#39ff14` (green), `#ffaa00` (amber), `#ff4444` (red)
- Background: `#04040a`, `#050010`, `#0a0a0f`
- Borders: `#1a2a3a`, `#0a2838`, `${color}33` (33% opacity)
- Font classes: `font-pixel` for headings, `font-mono` via `fontFamily: 'var(--font-mono)'`
- Use `lucide-react` icons

---

## 7. Wire UI into GameScreen

Location: `src/components/game/GameScreen.tsx`

### Step 1: Import the Screen

```typescript
import { MyFeatureScreen } from './MyFeatureScreen';
```

### Step 2: Add State

```typescript
const [showMyFeature, setShowMyFeature] = useState(false);
```

### Step 3: Add to Modals

```typescript
const modals = (
  <>
    {/* ... existing modals */}
    {showMyFeature && <MyFeatureScreen engine={engine} onClose={() => setShowMyFeature(false)} />}
  </>
);
```

### Step 4: Add Desktop Button (in right sidebar)

```typescript
<Tooltip content={<><TooltipLabel label="MY FEATURE" color="#00f5ff" /><TooltipText>Description here.</TooltipText></>} position="left">
  <button
    onClick={() => setShowMyFeature(true)}
    style={{
      width: '100%', background: '#080810',
      border: '1px solid #0a2838',
      color: '#2a4a5a', padding: '12px 10px',
      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
      transition: 'all 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = '#00f5ff'; e.currentTarget.style.color = '#00f5ff'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = '#0a2838'; e.currentTarget.style.color = '#2a4a5a'; }}
  >
    <SomeIcon size={20} />
    <div className="font-pixel" style={{ fontSize: '7px', letterSpacing: '2px' }}>MY FEATURE</div>
  </button>
</Tooltip>
```

### Step 5: Add Mobile Tab

```typescript
<MobileTab
  icon={<SomeIcon size={15} color="#3a4a5a" />}
  label="FEATURE"
  activeColor="#00f5ff"
  onClick={() => setShowMyFeature(true)}
/>
```

---

## 8. Database Integration

### Migration File Format

Location: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`

```sql
-- Create table
CREATE TABLE IF NOT EXISTS my_feature (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_my_feature_user_id ON my_feature(user_id);

-- Enable RLS
ALTER TABLE my_feature ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "my_feature_select_own" ON my_feature
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "my_feature_insert_own" ON my_feature
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "my_feature_update_own" ON my_feature
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "my_feature_delete_own" ON my_feature
  FOR DELETE USING (auth.uid() = user_id);
```

### Using engine.storage

```typescript
// Load single record
const { data, error } = await this.engine.storage.load<MyType>('my_table', {
  user_id: this.userId,
});

// Load multiple records
const { data, error } = await this.engine.storage.loadMany<MyType>('my_table', {
  user_id: this.userId,
});

// Save (upsert)
const { error } = await this.engine.storage.save('my_table', {
  user_id: this.userId,
  ...data,
}, 'id'); // conflict key

// Insert (no upsert)
const { data, error } = await this.engine.storage.insert<MyType>('my_table', {
  user_id: this.userId,
  ...data,
});

// Delete
const { error } = await this.engine.storage.remove('my_table', {
  id: recordId,
});
```

---

## 9. File Naming and Location Conventions

| Type | Location | Naming |
|------|----------|--------|
| Plugin | `src/plugins/` | `[FeatureName]Plugin.ts` |
| UI Screen | `src/components/game/` | `[FeatureName]Screen.tsx` |
| UI Panel | `src/components/game/` | `[FeatureName]Panel.tsx` |
| Config | `src/config/game.config.ts` | Section: `[FEATURE_NAME]_CONFIG` |
| Types | `src/engine/types.ts` | Add to existing interfaces |
| Migration | `supabase/migrations/` | `YYYYMMDDHHMMSS_description.sql` |
| Docs | `docs/` | `[FEATURE_NAME].md` |

---

## 10. Complete Example

### Adding a "Bounty" Feature

**1. Add config to `src/config/game.config.ts`:**

```typescript
export const BOUNTY_CONFIG = {
  /** Minimum stage to unlock bounties. */
  unlockStage: 50,
  /** Base diamond reward. */
  baseDiamondReward: 5,
  /** Reward multiplier per bounty difficulty tier. */
  difficultyMultiplier: 1.5,
} as const;
```

**2. Add state to `src/engine/types.ts`:**

```typescript
// In GameState interface
activeBounty: BountyDef | null;
completedBounties: string[];

// Add new type
export interface BountyDef {
  id: string;
  name: string;
  targetKills: number;
  rewardDiamonds: number;
  difficulty: number;
}
```

**3. Create `src/plugins/BountyPlugin.ts`:**

```typescript
import type { IPlugin, IEngine, GameState, BountyDef } from '../engine/types';
import { BOUNTY_CONFIG } from '../config/game.config';

export class BountyPlugin implements IPlugin {
  id = 'bounty';
  stateKeys = ['activeBounty', 'completedBounties'] as (keyof GameState)[];
  defaultState = { activeBounty: null, completedBounties: [] };

  private engine!: IEngine;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    engine.on('enemy_death', () => {
      this.checkBountyProgress();
    });
  }

  private checkBountyProgress(): void {
    // Implementation
  }

  acceptBounty(bounty: BountyDef): boolean {
    if (this.engine.state.highestStage < BOUNTY_CONFIG.unlockStage) return false;
    this.engine.updateState({ activeBounty: bounty });
    return true;
  }
}
```

**4. Register in `src/App.tsx`:**

```typescript
import { BountyPlugin } from './plugins/BountyPlugin';
// ...
engine.register(new BountyPlugin());
```

**5. Create `src/components/game/BountyScreen.tsx`** (following template above)

**6. Wire into `src/components/game/GameScreen.tsx`:**
- Import screen
- Add state: `const [showBounty, setShowBounty] = useState(false);`
- Add to modals
- Add desktop button and mobile tab

---

## Summary Checklist

When creating a new plugin:

- [ ] Check env vars point to correct Supabase project
- [ ] Add config section to `game.config.ts`
- [ ] Add state keys to `GameState` interface if needed
- [ ] Add event types to `GameEventType` if needed
- [ ] Create plugin file implementing `IPlugin`
- [ ] Register plugin in `App.tsx`
- [ ] Create UI screen component
- [ ] Wire screen into `GameScreen.tsx` (modals, desktop button, mobile tab)
- [ ] Create migration file if database needed
- [ ] Apply migration to Supabase
- [ ] Test on both mobile and desktop layouts
