// RLS isolation check: an UNAUTHENTICATED (anon) client must NOT see the demo's private spine
// (chapters/PRs/timeline are owner-only), but CAN read the public profile (intended — always-ungated
// core identity). Proves the policies both permit self and deny others.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const anon = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

let ok = true;
for (const t of ['chapters', 'personal_records', 'timeline_events']) {
  const { count, error } = await anon.from(t).select('*', { count: 'exact', head: true });
  const pass = !error && count === 0;
  ok = ok && pass;
  console.log(`${pass ? '✓' : '✗'} anon ${t}: count=${count ?? 'null'} ${error ? '· ' + error.message : ''} — expect 0 (owner-only)`);
}
const { data } = await anon.from('profiles').select('name');
const names = (data ?? []).map((p) => p.name);
const profOk = names.includes('Ada Ridge');
console.log(`${profOk ? '✓' : '✗'} anon profiles: ${JSON.stringify(names)} — expect Ada Ridge readable (world-read public identity)`);
console.log(ok && profOk ? '\nRLS ISOLATION OK' : '\nRLS CHECK FAILED');
