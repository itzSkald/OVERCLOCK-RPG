import { createClient } from '@supabase/supabase-js';

// Prioritize NEXT_PUBLIC_ (Vercel integration) over VITE_ env vars
const supabaseUrl = (import.meta.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL) as string;
const supabaseAnonKey = (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `Supabase env vars missing. Ensure VITE_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and VITE_SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY are set.`,
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Prevent automatic session refresh on visibility change which can cause
    // auth state events to fire and potentially reload/reset game state
    autoRefreshToken: true,
    persistSession: true,
    // Disable automatic detection of session from URL (prevents reloads on tab switch)
    detectSessionInUrl: false,
  },
});
