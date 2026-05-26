import { supabase } from '../lib/supabase';

export interface StorageAdapter {
  table: string;
  userScoped: boolean;
}

export class PluginStorage {
  private adapters = new Map<string, StorageAdapter>();

  registerTable(pluginId: string, adapter: StorageAdapter): void {
    this.adapters.set(pluginId, adapter);
  }

  getAdapter(pluginId: string): StorageAdapter | undefined {
    return this.adapters.get(pluginId);
  }

  async load<T = unknown>(
    table: string,
    filters: Record<string, unknown>,
    select = '*'
  ): Promise<{ data: T | null; error: string | null }> {
    try {
      let query = supabase.from(table).select(select);
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
      const { data, error } = await query.maybeSingle();
      if (error) return { data: null, error: error.message };
      return { data: data as T, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async loadMany<T = unknown>(
    table: string,
    filters: Record<string, unknown>,
    select = '*'
  ): Promise<{ data: T[]; error: string | null }> {
    try {
      let query = supabase.from(table).select(select);
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
      const { data, error } = await query;
      if (error) return { data: [], error: error.message };
      return { data: (data ?? []) as T[], error: null };
    } catch (err) {
      return { data: [], error: err instanceof Error ? err.message : String(err) };
    }
  }

  async save(
    table: string,
    data: Record<string, unknown>,
    conflictKey?: string
  ): Promise<{ error: string | null }> {
    try {
      const opts = conflictKey ? { onConflict: conflictKey } : undefined;
      const { error } = await supabase.from(table).upsert(data, opts);
      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }

  async insert<T = unknown>(
    table: string,
    data: Record<string, unknown>,
    select?: string
  ): Promise<{ data: T | null; error: string | null }> {
    try {
      let query = supabase.from(table).insert(data);
      if (select) {
        const { data: result, error } = await query.select(select).single();
        if (error) return { data: null, error: error.message };
        return { data: result as T, error: null };
      }
      const { error } = await query;
      if (error) return { data: null, error: error.message };
      return { data: null, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async remove(
    table: string,
    filters: Record<string, unknown>
  ): Promise<{ error: string | null }> {
    try {
      let query = supabase.from(table).delete();
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
      const { error } = await query;
      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }
}
