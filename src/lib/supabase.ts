import { createClient } from '@supabase/supabase-js';

// Read Supabase config from environment variables (modular - no hardcoded values)
const supabaseUrl = (
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  import.meta.env.VITE_SUPABASE_URL
) as string;

const supabaseAnonKey = (
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY
) as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.',
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
