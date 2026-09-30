// ════════════════════════════════════════════════════════════════════════════
// CHEER ROUNDTRIP — does a workout message actually travel? (0231 / 0240 / 0241)
//
// Run: node supabase/seed/_with-qa-env.mjs cheer-roundtrip.mjs
//
// PO 2026-09-30: "I sent a message … but don't know if he got it. How do I make sure that function is
// working properly?" This walks the whole path with the two QA accounts, each through its OWN sign-in
// and the anon key — the same RLS the app uses — and prints what each side can see:
//
//   A sends  →  B's workout screen can read it  →  B closes it  →  A sees "seen"  →  A deletes it
//
// ⚠ IT DOES NOT REPLY. A reply fires 0240's push to the sender, and these are the App Store review
// accounts. `seen_at` exercises the same recipient-write path without sending anything to a phone.
// It leaves nothing behind: the one row it writes is deleted at the end, pass or fail.
// ════════════════════════════════════════════════════════════════════════════

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

const { SB_EMAIL, SB_PASS, SB2_EMAIL, SB2_PASS } = process.env;
if (!SB_EMAIL || !SB_PASS || !SB2_EMAIL || !SB2_PASS) {
  console.error('Needs SB_EMAIL / SB_PASS / SB2_EMAIL / SB2_PASS — run it through _with-qa-env.mjs.');
  process.exit(2);
}

const client = () => createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
async function signIn(email, password) {
  const sb = client();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed: ${error.message}`);
  return { sb, id: data.user.id };
}

let failed = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

const A = await signIn(SB_EMAIL, SB_PASS);
const B = await signIn(SB2_EMAIL, SB2_PASS);
const body = `roundtrip ${new Date().toISOString().slice(11, 19)}`;
const since = new Date(Date.now() - 60_000).toISOString();

// 1 · A sends (exactly the app's insert)
const ins = await A.sb.from('workout_cheers').insert({ to_id: B.id, body });
check(!ins.error, 'A sends a message to B', ins.error ? `${ins.error.code} ${ins.error.message}` : '');

let rowId = null;
try {
  // 2 · A can read its own sent row (what the new status line reads)
  const mine = await A.sb.from('workout_cheers').select('id, seen_at, reply').eq('from_id', A.id).eq('to_id', B.id).eq('body', body).maybeSingle();
  rowId = mine.data?.id ?? null;
  check(!!rowId && mine.data.seen_at === null, 'A sees it as sent, not yet seen', mine.error?.message ?? '');

  // 3 · B's workout screen query (exactly `fetchUnseenCheers`)
  const unseen = await B.sb
    .from('workout_cheers')
    .select('id, body, created_at, from_id, sender:profiles!workout_cheers_from_id_fkey(first_name, name)')
    .eq('to_id', B.id)
    .is('seen_at', null)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(10);
  const got = (unseen.data ?? []).find((r) => r.id === rowId);
  check(!!got, 'B\'s workout screen can read it', unseen.error?.message ?? '');
  check(!!(got?.sender?.first_name || got?.sender?.name), 'B is given the sender\'s name', got ? '' : 'no row');

  // 4 · B closes it (exactly `markCheerSeen`)
  const seen = await B.sb.from('workout_cheers').update({ seen_at: new Date().toISOString() }).eq('id', rowId);
  check(!seen.error, 'B closes it', seen.error?.message ?? '');

  // 5 · A sees that it was seen
  const after = await A.sb.from('workout_cheers').select('seen_at').eq('id', rowId).maybeSingle();
  check(!!after.data?.seen_at, 'A sees "seen"', after.error?.message ?? '');

  // 6 · it has left B's unseen list
  const again = await B.sb.from('workout_cheers').select('id').eq('to_id', B.id).is('seen_at', null).eq('id', rowId);
  check((again.data ?? []).length === 0, 'it no longer shows for B');
} finally {
  if (rowId) {
    const del = await A.sb.from('workout_cheers').delete().eq('id', rowId);
    check(!del.error, 'cleaned up', del.error?.message ?? '');
  }
}

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
