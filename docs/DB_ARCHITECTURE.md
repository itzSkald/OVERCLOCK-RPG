# Database Architecture Diagram

## Module Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Code                           │
│  (Components, Pages, Plugins, Services)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Single Entry Point                           │
│                  src/lib/db/index.ts                            │
│  (Re-exports all functions - one place to import from)         │
└──┬──────────┬──────────┬──────────┬──────────┬────────────────┬┘
   │          │          │          │          │                │
   ▼          ▼          ▼          ▼          ▼                ▼
┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────────┐
│Que │  │Auth│  │Real│  │Conf│  │Clie│  │Compat. │
│ries│  │    │  │time│  │ig  │  │ent │  │Layer   │
└────┘  └────┘  └────┘  └────┘  └────┘  └────────┘
   │       │       │       │       │           │
   │       │       │       │       │           │
   ▼       ▼       ▼       ▼       ▼           ▼
  
┌──────────────────────────────────────────────────────┐
│         Supabase Client Instance (Singleton)         │
│  (Initialized once, reused everywhere)               │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│              Supabase Cloud Service                  │
│  (PostgreSQL Database + Auth + Realtime)             │
└──────────────────────────────────────────────────────┘
```

## Data Flow Example: Loading User Data

```
Component
   │
   ├─ import { loadOne } from '@/lib/db'
   │
   ▼
await loadOne<Profile>('profiles', { id: userId })
   │
   ├─ Calls: src/lib/db/queries.ts → loadOne()
   │
   ├─ Gets client: src/lib/db/client.ts → getClient()
   │
   ├─ Applies config: src/lib/db/config.ts
   │
   ├─ Executes query with retry logic
   │    (Attempt 1, 2, 3 if needed)
   │
   ├─ Handles errors automatically
   │
   ▼
Returns: { data: Profile | null, error: Error | null }
```

## Module Responsibilities

```
┌─────────────────────────────────────────────────────┐
│ config.ts                                           │
│                                                     │
│ ✓ Database connection settings                     │
│ ✓ Auth behavior configuration                      │
│ ✓ Query timeouts and retry settings                │
│ ✓ Realtime channel configuration                   │
│                                                     │
│ Exports: createDatabaseConfig(), dbConfig           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ client.ts                                           │
│                                                     │
│ ✓ Initializes Supabase client (singleton)          │
│ ✓ Manages client lifecycle                         │
│ ✓ Applies configuration                            │
│                                                     │
│ Exports: getClient(), initializeClient()            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ queries.ts                                          │
│                                                     │
│ ✓ loadOne() - Single record fetch                  │
│ ✓ loadMany() - Multiple records with filters       │
│ ✓ insert() - Create new records                    │
│ ✓ update() - Modify existing records               │
│ ✓ upsert() - Insert or update on conflict          │
│ ✓ remove() - Delete records                        │
│ ✓ rpc() - Call database functions                  │
│                                                     │
│ All include retry logic and error handling          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ auth.ts                                             │
│                                                     │
│ ✓ signUp() - Create new account                    │
│ ✓ signIn() - Login with credentials                │
│ ✓ signOut() - Logout                               │
│ ✓ getSession() - Get current session               │
│ ✓ resetPassword() - Send password reset email      │
│ ✓ onAuthStateChange() - Listen to auth events      │
│                                                     │
│ All handle token refresh automatically              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ realtime.ts                                         │
│                                                     │
│ ✓ createPresenceChannel() - Track online users     │
│ ✓ subscribeToTable() - Listen to table changes     │
│ ✓ createBroadcastChannel() - Send custom events    │
│                                                     │
│ All manage subscriptions and cleanup                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ index.ts                                            │
│                                                     │
│ ✓ Re-exports everything from all modules           │
│ ✓ Single source for all database imports           │
│                                                     │
│ Exports: All functions from queries, auth, realtime │
└─────────────────────────────────────────────────────┘
```

## Usage Patterns

### Pattern 1: Simple Component Import

```tsx
// In any component
import { loadOne, update } from '@/lib/db';

const MyComponent = () => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await loadOne('profiles', { id: userId });
      setProfile(data);
    };
    fetch();
  }, [userId]);

  const handleUpdate = async () => {
    await update('profiles', { handle: 'NEW_NAME' }, { id: userId });
    // Re-fetch or optimistic update
  };

  return <div>{profile?.handle}</div>;
};
```

### Pattern 2: Plugin Usage

```tsx
// In a plugin
import { loadMany, subscribeToTable } from '@/lib/db';

export class LeaderboardPlugin {
  async initialize() {
    // Load initial data
    const { data: entries } = await loadMany('leaderboard', {});
    
    // Subscribe to updates
    subscribeToTable('leaderboard', {
      onInsert: (row) => this.emit('entry:new', row),
      onUpdate: (row) => this.emit('entry:updated', row),
    });
  }
}
```

### Pattern 3: Error Handling

```tsx
const { data, error } = await loadOne('profiles', { id });

if (error) {
  // Automatically retried 3 times already
  console.error('Failed after retries:', error);
  // Handle gracefully - show fallback UI
} else {
  // Process data
}
```

### Pattern 4: Plugin Storage Wrapper

```tsx
// Plugins also use engine.storage which wraps the db layer
const { data } = await this.engine.storage.load('profiles', { id });
```

## Benefits of This Architecture

| Aspect | Benefit |
|--------|---------|
| **Modularity** | Each concern has its own file, easy to understand |
| **Configuration-Driven** | Change settings via env vars, no code changes needed |
| **Error Handling** | Automatic retries, consistent error handling |
| **Type Safety** | Full TypeScript support with generics |
| **Testability** | Mockable modules, clear boundaries |
| **Maintainability** | Single entry point, clear responsibilities |
| **Performance** | Singleton client, connection pooling |
| **Backward Compatible** | Old code still works during transition |

## Future Extensions

The modular architecture makes it easy to add:

- **Caching Layer** - Add a `cache.ts` module with memoization
- **Analytics** - Add an `analytics.ts` module to track DB operations
- **Validation** - Add a `validation.ts` module for input sanitization
- **Logging** - Centralized logging in `client.ts`
- **Rate Limiting** - Add middleware in `queries.ts`
- **Multi-Tenancy** - Add tenant context to all queries

Just add new files to `src/lib/db/` and export from `index.ts`.
