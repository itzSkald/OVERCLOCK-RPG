import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, existsSync } from 'node:fs';

// Parse a simple .env file into key-value pairs
function parseEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  try {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex).trim();
          let value = trimmed.slice(eqIndex + 1).trim();
          // Remove surrounding quotes if present
          if ((value.startsWith("'") && value.endsWith("'")) || 
              (value.startsWith('"') && value.endsWith('"'))) {
            value = value.slice(1, -1);
          }
          result[key] = value;
        }
      }
    }
  } catch (e) {
    console.warn('[vite.config] Error reading env file:', filePath, e);
  }
  return result;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars from multiple sources
  const viteEnv = loadEnv(mode, process.cwd(), '');
  
  // Also try to load from v0's shared env location
  const v0Env = parseEnvFile('/vercel/share/.env.project');
  
  console.log('[vite.config] Loaded v0 env keys:', Object.keys(v0Env).filter(k => k.includes('SUPABASE')));
  
  // Merge: v0 env takes precedence, then vite env
  const env = { ...viteEnv, ...v0Env };
  
  // Support both NEXT_PUBLIC_* and VITE_* prefixes for Supabase
  const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  console.log('[vite.config] Supabase URL:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : '(empty)');
  console.log('[vite.config] Supabase Key:', supabaseAnonKey ? 'present' : '(empty)');
  
  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    define: {
      // Expose both VITE_* and NEXT_PUBLIC_* variants so the app code can use either
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'import.meta.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
  };
});
