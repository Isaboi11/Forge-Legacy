import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * The ONE Supabase client for the app (Phase 1 of the Supabase pivot).
 *
 * Reads `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY` — the publishable (RLS-scoped) key, inlined into the
 * client bundle by Expo. The service_role key is NEVER referenced here. Sessions persist via
 * AsyncStorage so "self" survives reloads as a real `auth.uid()` (retiring the `?as=` demo override).
 *
 * `detectSessionInUrl` is off — there's no web OAuth redirect flow; auth is email/password (Phase 1).
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loud in dev rather than silently pointing at nothing — copy .env.example → .env.
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — see .env.example');
}

// Expo static rendering evaluates this module in Node (no `window`). The auth client's initialize()
// eagerly reads storage → AsyncStorage(web) → `window.localStorage`, which throws server-side. So on
// the server give it a no-op storage and skip persistence; the real client (browser/native) gets full
// AsyncStorage persistence. An environment guard, not a preview shim.
const isServer = typeof window === 'undefined';
const noopStorage = {
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
};

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: isServer ? noopStorage : AsyncStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});
