# Database Modularization Migration Guide

This document describes the refactored modular database architecture and how it maintains backward compatibility while improving maintainability.

## Summary of Changes

The database layer has been completely refactored into a **modular, configuration-driven system** while maintaining 100% backward compatibility with existing code. All database operations are now centralized in `src/lib/db/` with clear separation of concerns.

### What Changed

**Before:**
- Direct imports from `src/lib/supabase.ts`
- Scattered database logic across plugins
- Hard-coded connection details
- Limited error handling and retry logic

**After:**
- Centralized database module in `src/lib/db/`
- Configuration-driven (no code changes needed to update connection settings)
- Automatic retry logic with exponential backoff
- Clear API for queries, auth, and realtime operations
- 100% backward compatible (old code still works)

### New Architecture

```
src/lib/db/
├── index.ts          # Single import point (all re-exports)
├── config.ts         # Database configuration and validation
├── client.ts         # Supabase client initialization
├── queries.ts        # CRUD operations (load, upsert, insert, update, delete, rpc)
├── auth.ts          # Authentication operations (signUp, signIn, signOut, etc.)
└── realtime.ts      # Presence, table subscriptions, and broadcast channels
```

## Backward Compatibility

**All existing code continues to work without changes.** The old `src/lib/supabase.ts` file now re-exports from the new modular system:

```ts
// This still works (deprecated but functional)
import { supabase } from '@/lib/supabase';
const { data } = await supabase.from('profiles').select('*');

// This is the new recommended way
import { loadMany } from '@/lib/db';
const { data } = await loadMany('profiles', {});
```

## How Plugins Were Updated

All plugins now use the new modular system:

### AuthPlugin.ts
- **Before:** Direct `supabase` imports with scattered logic
- **After:** Uses `signUp`, `signIn`, `signOut`, `getSession`, `onAuthStateChange` from `@/lib/db/auth`
- **Benefit:** Clear API, automatic error handling, no need to manage client state

### LeaderboardPlugin.ts
- **Before:** Direct `supabase` queries and manual realtime subscriptions
- **After:** Uses `loadMany` for queries and `subscribeToTable` for realtime updates
- **Benefit:** Retry logic built-in, consistent error handling, cleaner code

### SchemaManager.ts
- **Before:** Direct table queries with scattered logic
- **After:** Uses `loadOne`, `loadMany`, `insert`, `update`, `upsert`, `remove` operations
- **Benefit:** Standardized API, automatic retries, consistent error handling

### PluginStorage.ts
- **Before:** Wrapper around raw supabase client
- **After:** Uses the modular database functions
- **Benefit:** Cleaner implementation, better testability

## Configuration

All database settings are centralized in `src/lib/db/config.ts`. To customize behavior, modify environment variables or directly configure:

```ts
// src/lib/db/config.ts
export const dbConfig = {
  connection: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
  },
  auth: {
    refreshTokenInterval: 5 * 60 * 1000, // 5 minutes
    persistSession: true,
  },
  query: {
    timeoutMs: 10000,        // 10 second timeout
    retryCount: 3,           // Retry 3 times on failure
    retryDelayMs: 1000,      // 1 second delay between retries
  },
  realtime: {
    presenceChannelName: 'presence',
  },
};
```

To change these settings:

1. **Via environment variables** (recommended):
   ```bash
   SUPABASE_URL=your_url
   SUPABASE_ANON_KEY=your_key
   ```

2. **Direct configuration** (if needed):
   Edit `src/lib/db/config.ts` and update the `dbConfig` object.

## Migration Path (Optional)

You don't need to update existing code, but we recommend gradually migrating to the new API for consistency:

### Query Operations

**Old way:**
```ts
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

**New way:**
```ts
import { loadOne } from '@/lib/db';
const { data, error } = await loadOne<Profile>('profiles', { id: userId });
```

### Insert Operations

**Old way:**
```ts
const { data, error } = await supabase
  .from('profiles')
  .insert([{ id: userId, handle: 'player' }])
  .select('id, handle');
```

**New way:**
```ts
import { insert } from '@/lib/db';
const { data, error } = await insert<Profile>('profiles', { id: userId, handle: 'player' }, 'id, handle');
```

### Realtime Subscriptions

**Old way:**
```ts
supabase
  .channel('realtime:leaderboard')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, (payload) => {
    console.log('Change received!', payload)
  })
  .subscribe()
```

**New way:**
```ts
import { subscribeToTable } from '@/lib/db';
subscribeToTable('leaderboard', {
  onInsert: (row) => console.log('New:', row),
  onUpdate: (row) => console.log('Updated:', row),
  onDelete: (row) => console.log('Deleted:', row),
});
```

### Authentication

**Old way:**
```ts
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
});
```

**New way:**
```ts
import { signUp } from '@/lib/db';
const { user, error } = await signUp('user@example.com', 'password123');
```

## Error Handling

All database functions now include automatic error handling and retry logic:

```ts
import { loadOne } from '@/lib/db';

try {
  const { data, error } = await loadOne('profiles', { id: userId });
  
  if (error) {
    console.error('Failed to load profile:', error.message);
    return null;
  }
  
  return data;
} catch (err) {
  console.error('Unexpected error:', err);
}
```

Errors include:
- `NetworkError` - Connection issues (auto-retried)
- `TimeoutError` - Request took too long (auto-retried)
- `DatabaseError` - Table or constraint error
- `AuthError` - Authentication failed

## Adding New Database Modules

To add new database functionality, follow this pattern:

1. Create a new file in `src/lib/db/` (e.g., `src/lib/db/analytics.ts`)
2. Implement your functions using the established patterns
3. Re-export from `src/lib/db/index.ts`

Example:

```ts
// src/lib/db/analytics.ts
import { loadMany } from './queries';

export async function getPlayerStats(userId: string) {
  return loadMany('player_stats', { user_id: userId });
}

export async function trackEvent(event: string, metadata: Record<string, any>) {
  return insert('events', { event, metadata, created_at: new Date().toISOString() });
}
```

```ts
// src/lib/db/index.ts - add to exports
export * from './analytics';
```

## Testing

The modular architecture makes testing easier:

```ts
// Example test (using vitest or jest)
import { describe, it, expect, vi } from 'vitest';
import { loadOne } from '@/lib/db';

describe('Database Operations', () => {
  it('should load a user profile', async () => {
    const { data } = await loadOne('profiles', { id: 'test-user' });
    expect(data).toBeDefined();
    expect(data?.id).toBe('test-user');
  });
});
```

## Performance Improvements

The new architecture provides several performance benefits:

1. **Automatic Retries** - Failed queries retry with exponential backoff (3 retries by default)
2. **Configurable Timeouts** - Set timeout per environment (10 seconds by default)
3. **Better Error Recovery** - Network errors don't crash the app
4. **Consistent Pooling** - Single client instance reused across the app

## Troubleshooting

**"Cannot find module '@/lib/db'"**
- Make sure `tsconfig.json` has path alias: `"@/*": ["src/*"]`
- Clear node_modules and reinstall: `rm -rf node_modules && pnpm install`

**"Database connection failed"**
- Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`
- Verify Supabase project is running
- Check network connectivity

**"Queries timeout frequently"**
- Increase `query.timeoutMs` in `src/lib/db/config.ts`
- Check Supabase service status
- Consider adding indexes to frequently queried columns

## Summary

This refactoring provides:
✅ Modular, reusable database code
✅ Configuration-driven (no code changes for connection updates)
✅ Automatic error handling and retry logic
✅ 100% backward compatible
✅ Cleaner, more maintainable codebase
✅ Better separation of concerns
✅ Easier to test and debug

All existing functionality is preserved while the implementation is now clean, modular, and easy to maintain.
