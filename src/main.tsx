import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Debug: Check if env vars are available
console.log('[v0] main.tsx loading...');
console.log('[v0] SUPABASE_URL:', import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '(not set)');
console.log('[v0] SUPABASE_KEY present:', !!(import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY));

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  console.log('[v0] React render complete');
} catch (err) {
  console.error('[v0] React render error:', err);
}
