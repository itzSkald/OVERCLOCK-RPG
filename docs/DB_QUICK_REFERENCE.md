# Database Quick Reference

## Single Import Point

```ts
import {
  // Queries
  loadOne, loadMany, insert, update, upsert, remove, rpc,
  // Auth
  signUp, signIn, signOut, getSession, resetPassword, onAuthStateChange,
  // Realtime
  createPresenceChannel, subscribeToTable, createBroadcastChannel,
} from '@/lib/db';
```

## Most Common Operations

### Load Data
```ts
// Single record
const { data } = await loadOne<T>('table_name', { id: 'value' });

// Multiple records with filters
const { data } = await loadMany<T>('table_name', { status: 'active' });

// With sorting and limit
const { data } = await loadMany<T>(
  'table_name', 
  {},
  '*',
  { orderBy: 'created_at', ascending: false, limit: 10 }
);
```

### Modify Data
```ts
// Insert
await insert('table_name', { col1: 'val1', col2: 'val2' });

// Update
await update('table_name', { col1: 'new_val' }, { id: 'value' });

// Upsert (insert or update on conflict)
await upsert('table_name', { id: 'value', col1: 'val' }, 'id');

// Delete
await remove('table_name', { id: 'value' });
```

### Authentication
```ts
// Sign up
const { user } = await signUp('email@example.com', 'password');

// Sign in
const { user } = await signIn('email@example.com', 'password');

// Sign out
await signOut();

// Get current user
const { session } = await getSession();
```

### Realtime
```ts
// Track presence
const presence = createPresenceChannel(userId, { handle: 'player' }, {
  onSync: (state) => { /* all online users */ },
  onJoin: (key, joined) => { /* user joined */ },
  onLeave: (key, left) => { /* user left */ },
});

// Subscribe to table changes
subscribeToTable('leaderboard', {
  onInsert: (row) => { /* ... */ },
  onUpdate: (row) => { /* ... */ },
  onDelete: (oldRow) => { /* ... */ },
});
```

## Error Handling

All functions return `{ data, error }` or `{ success, error }`:

```ts
const { data, error } = await loadOne('profiles', { id });

if (error) {
  console.error('Error:', error.message);
  // Retry logic is automatic, but you can handle errors here
}
```

## Configuration

Edit `src/lib/db/config.ts` to customize:
- Supabase URL and key
- Auth token refresh interval
- Query timeout and retry attempts
- Realtime channel names

## Backward Compatibility

Old code still works:
```ts
import { supabase } from '@/lib/supabase';
// supabase.from('table').select('*') still works
```

But prefer the new modular API for consistency.

## Adding to Plugins

Plugins should import from `@/lib/db`:

```ts
import { loadMany, subscribeToTable } from '@/lib/db';

export class MyPlugin {
  async load() {
    const { data } = await loadMany('my_table', {});
    subscribeToTable('my_table', {
      onInsert: (row) => this.handleNewRow(row),
    });
  }
}
```

Or through `engine.storage` (which wraps `@/lib/db`):

```ts
const { data } = await this.engine.storage.load('my_table', {});
```
