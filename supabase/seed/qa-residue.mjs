// What the two-account roundtrip left behind, and the SQL to clear it.
//
//   node supabase/seed/_with-qa-env.mjs qa-residue.mjs
//
// ══ WHY THIS IS SEPARATE FROM THE ROUNDTRIP'S OWN TEARDOWN ══
//
// The roundtrip cleans up after itself and then READS for its own leftovers, because a delete that a
// policy filters to zero rows resolves without an error — it reports success and removes nothing. That
// is exactly what `challenges` does: 0059 grants select, insert and update and **no delete at all**, so
// every competition the roundtrip created is still there and still in both athletes' history.
//
// `cancel_challenge` is not a way out either: it refuses any terminal state (CS-D14 — a closed season's
// standings are immutable), and a finished competition is terminal. So the only path is the SQL editor,
// and the only safe SQL is one that names the exact rows. This script reads them and writes that SQL.
//
// It is READ-ONLY. It prints; it never deletes.

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

const sb = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
  email: process.env.SB_EMAIL,
  password: process.env.SB_PASS,
});
if (authErr) throw new Error(`sign-in failed: ${authErr.message}`);
console.log(`signed in as ${process.env.SB_EMAIL}\n`);

/*
 * ⚠ MATCHED ON THE NAME PREFIX THIS RUNNER CONTROLS, NOT ON "everything that looks like a test".
 *
 * `February Volume` is the reviewer's seeded competition and Apple is meant to see it. A cleanup that
 * swept by date, or by "competitions with two entrants", would take it. Only names this file's own
 * harness writes — `QA Squad Volume …`, `QA Head to Head …` — are ever listed.
 */
const { data: rows, error } = await sb
  .from('challenges')
  .select('id, name, state, context, created_at, creator_id')
  .like('name', 'QA %')
  .order('created_at');
if (error) throw error;

const { data: squads } = await sb.from('squads').select('id, name').like('name', 'QA %');
const { data: posts } = await sb.from('squad_posts').select('id').like('body', 'Roundtrip:%');
const { data: invites } = await sb.from('workout_invites').select('id').eq('workout_name', 'Roundtrip Upper');
const { data: workouts } = await sb.from('workouts').select('id').eq('athlete_id', auth.user.id).eq('name', 'Roundtrip Upper');

console.log(`competitions : ${(rows ?? []).length}`);
for (const r of rows ?? []) console.log(`   ${r.created_at.slice(0, 19)}  ${r.state.padEnd(10)} ${r.context.padEnd(8)} ${r.name}`);
console.log(`squads       : ${(squads ?? []).length}${(squads ?? []).map((s) => `\n   ${s.name}`).join('')}`);
console.log(`posts        : ${(posts ?? []).length}`);
console.log(`invites      : ${(invites ?? []).length}`);
console.log(`workouts     : ${(workouts ?? []).length}`);

const removable = { squads, posts, invites, workouts };
for (const [what, list] of Object.entries(removable)) {
  if ((list ?? []).length) console.log(`\n⚠ ${what}: ${list.length} left — the roundtrip should have removed these. Re-run its teardown.`);
}

if (!(rows ?? []).length) {
  console.log('\n✅ Nothing stranded. No SQL needed.');
} else {
  console.log('\n── Paste this into the Supabase SQL editor ───────────────────────────────────');
  console.log('-- Forge Legacy — clear the two-account roundtrip\'s stranded competitions.');
  console.log('-- `challenges` has no DELETE policy (0059), so the athlete\'s own session cannot do this.');
  console.log('-- Named ids only: `February Volume` and every real competition are untouched.');
  console.log('begin;');
  const ids = (rows ?? []).map((r) => `'${r.id}'`).join(',\n    ');
  console.log(`  delete from public.challenge_results      where challenge_id in (\n    ${ids}\n  );`);
  console.log(`  delete from public.challenge_participants where challenge_id in (\n    ${ids}\n  );`);
  console.log(`  delete from public.challenges             where id in (\n    ${ids}\n  );`);
  console.log('commit;');
  console.log('──────────────────────────────────────────────────────────────────────────────');
  console.log(`\n${(rows ?? []).length} competitions would be removed. Re-run this script afterwards; it should print "Nothing stranded".`);
}
