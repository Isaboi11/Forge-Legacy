// Shared helper for the seed/verify scripts. Reads URL + publishable key from .env (gitignored);
// email/password come from process.env at runtime (never written to a file). Not shipped in the app.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

export async function signedInClient() {
  const sb = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = process.env.SB_EMAIL;
  const password = process.env.SB_PASS;
  if (!email || !password) throw new Error('pass SB_EMAIL + SB_PASS at runtime');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error('sign-in failed: ' + error.message);
  return { sb, uid: data.user.id };
}
