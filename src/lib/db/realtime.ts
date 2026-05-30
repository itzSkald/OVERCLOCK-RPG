ead// ─────────────────────────────────────────────────────────────────────────────
// Realtime Module
//
// Handles realtime subscriptions and presence tracking.
// ─────────────────────────────────────────────────────────────────────────────

import type { RealtimeChannel } from '@supabase/supabase-js';
import { getClient } from './client';
import { getCurrentConfig } from './client';

export interface PresencePayload {
  user_id: string;
  handle: string;
  [key: string]: unknown;
}

export type PresenceState = Record<string, PresencePayload[]>;

export interface RealtimeSubscription {
  channel: RealtimeChannel;
  unsubscribe: () => void;
}

/**
 * Create a presence channel for tracking online users.
 */
export function createPresenceChannel(
  userId: string,
  payload: PresencePayload,
  callbacks: {
    onSync?: (state: PresenceState) => void;
    onJoin?: (key: string, current: PresencePayload[], joined: PresencePayload[]) => void;
    onLeave?: (key: string, current: PresencePayload[], left: PresencePayload[]) => void;
  }
): RealtimeSubscription {
  const config = getCurrentConfig();
  const channelName = config?.realtime.presenceChannel ?? 'online_players';
  
  const client = getClient();
  const channel = client.channel(channelName, {
    config: { presence: { key: userId } },
  });
  
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresencePayload>();
      callbacks.onSync?.(state as unknown as PresenceState);
    })
    .on('presence', { event: 'join' }, ({ key, currentPresences, newPresences }) => {
      callbacks.onJoin?.(key, currentPresences, newPresences);
    })
    .on('presence', { event: 'leave' }, ({ key, currentPresences, leftPresences }) => {
      callbacks.onLeave?.(key, currentPresences, leftPresences);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track(payload);
      }
    });
  
  return {
    channel,
    unsubscribe: () => {
      client.removeChannel(channel);
    },
  };
}

/**
 * Subscribe to database changes on a table.
 */
export function subscribeToTable<T = unknown>(
  table: string,
  callbacks: {
    onInsert?: (payload: T) => void;
    onUpdate?: (payload: T, oldPayload: T) => void;
    onDelete?: (oldPayload: T) => void;
  },
  filter?: { column: string; value: string }
): RealtimeSubscription {
  const client = getClient();
  const channel = client.channel(`table:${table}`);
  
  let subscription = channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table,
      ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
    },
    (payload) => {
      switch (payload.eventType) {
        case 'INSERT':
          callbacks.onInsert?.(payload.new as T);
          break;
        case 'UPDATE':
          callbacks.onUpdate?.(payload.new as T, payload.old as T);
          break;
        case 'DELETE':
          callbacks.onDelete?.(payload.old as T);
          break;
      }
    }
  );
  
  subscription.subscribe();
  
  return {
    channel,
    unsubscribe: () => {
      client.removeChannel(channel);
    },
  };
}

/**
 * Create a custom realtime channel for broadcasting messages.
 */
export function createBroadcastChannel<T = unknown>(
  channelName: string,
  eventName: string,
  onMessage: (payload: T) => void
): RealtimeSubscription & { broadcast: (payload: T) => Promise<void> } {
  const client = getClient();
  const channel = client.channel(channelName);
  
  channel
    .on('broadcast', { event: eventName }, ({ payload }) => {
      onMessage(payload as T);
    })
    .subscribe();
  
  return {
    channel,
    unsubscribe: () => {
      client.removeChannel(channel);
    },
    broadcast: async (payload: T) => {
      await channel.send({
        type: 'broadcast',
        event: eventName,
        payload,
      });
    },
  };
}
