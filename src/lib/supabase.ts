import { createClient } from '@supabase/supabase-js';

// Fallback values for the correct Supabase project
const FALLBACK_SUPABASE_URL = 'https://akfzmzfjvrmzwkvltpko.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrZnptemZqdnJtendrdmx0cGtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwODczNTEsImV4cCI6MjA5NTY2MzM1MX0.t9JlaLOfrjTIDzDknD-O3nlhHZWqo6X-fDoDAfFH-Sk';

// Prioritize env vars, fallback to hardcoded values
const supabaseUrl = (
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  import.meta.env.VITE_SUPABASE_URL || 
  FALLBACK_SUPABASE_URL
) as string;

const supabaseAnonKey = (
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  FALLBACK_SUPABASE_ANON_KEY
) as string;

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
