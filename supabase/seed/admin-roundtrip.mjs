// Operator dashboard gate check (migrations 0129 + 0130 + 0133 + 0137 + 0167).
//
// ══ WHAT THIS PROVES, AND WHY IT IS THE ONLY THING STANDING BETWEEN A TYPO AND TOTAL EXPOSURE ══
//
// Every `admin_*` function is SECURITY DEFINER: it runs as the table owner and RLS does not apply to
// it. The ONLY thing keeping a normal athlete out is `perform public.admin_guard()` as the first
// statement of each body. One function that forgets it hands the whole population's aggregates to
// anybody with an account — and it would look completely fine in code review, because the other seven
// have the line.
//
// So step 2 loops EVERY function by name and asserts 42501. It is a regression test for a mistake
// nobody would otherwise catch.
//
// ⚠ ADDING AN ADMIN FUNCTION ANYWHERE MEANS ADDING ITS NAME TO `FUNCTIONS` BELOW IN THE SAME COMMIT.
//
// ══ RUNNING IT ══
//
//   SB_EMAIL=<a NON-admin test account>  SB_PASS=...
//   SB_ADMIN_EMAIL=<you>                 SB_ADMIN_PASS=...
//   node supabase/seed/admin-roundtrip.mjs
//
// The admin half is skipped (not failed) if SB_ADMIN_* is absent, so the gate check can be run on its
// own. The NON-admin half is the half that matters and is never skipped.

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

const TZ = 'UTC';

/**
 * Every admin READ model, with the arguments the app sends. Keep in lockstep with 0130, 0133, 0137, 0167, 0176.
 *
 * ⚠ `admin_recent_signups` (0137) and both 0167 functions were missing from this list until 0167 —
 *   0137 shipped an admin function and never added it here, which is precisely the omission this file
 *   exists to catch. If you add an `admin_*` function and this list does not grow in the same commit,
 *   nothing anywhere will tell you.
 */
const FUNCTIONS = [
  ['admin_overview', { p_days: 30, p_tz: TZ }],
  ['admin_growth', { p_days: 30, p_tz: TZ }],
  ['admin_retention_cohorts', { p_weeks: 12, p_tz: TZ }],
  ['admin_engagement', { p_days: 30, p_tz: TZ }],
  ['admin_feature_adoption', { p_days: 30, p_tz: TZ }],
  ['admin_content_popularity', { p_days: 30, p_limit: 10, p_tz: TZ }],
  ['admin_social_health', { p_days: 30, p_tz: TZ }],
  ['admin_events', { p_days: 30, p_limit: 10, p_tz: TZ }], // 0133
  ['admin_recent_signups', { p_limit: 10 }], // 0137
  ['admin_feedback', { p_limit: 10, p_status: null }], // 0167
  ['admin_client_errors', { p_days: 7, p_limit: 10, p_status: null }], // 0176
  ['admin_client_error_detail', { p_fingerprint: 'deadbeef', p_limit: 5 }], // 0176
];

/**
 * Guarded WRITE functions. Refusal is asserted for anon and for a signed-in non-admin — the half that
 * matters — but they are NOT invoked in the admin section, because a gate check must not mutate data to
 * prove the gate works. `admin_guard()` is the first statement of each body, so a non-admin is refused
 * before any argument is even validated, which is what makes a bogus id safe to send here.
 */
const GUARDED_WRITES = [
  ['admin_feedback_set_status', { p_id: -1, p_status: 'READ' }], // 0167
  ['admin_client_error_set_status', { p_fingerprint: 'deadbeef', p_status: 'ACKED', p_note: null }], // 0176
];

/** Everything a non-admin must be refused, read or write. */
const ALL_GUARDED = [...FUNCTIONS, ...GUARDED_WRITES];

/** Tables a non-admin must not be able to read across. Checked alongside the RPCs. */
const CLOSED_TABLES = ['app_admins', 'metrics_daily'];

const client = () =>
  createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

async function signIn(email, password) {
  const sb = client();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return { sb, uid: data.user.id };
}

let pass = 0;
let fail = 0;
const check = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (ok) pass += 1;
  else fail += 1;
};

// ── 1. anon — the grant, not the guard ───────────────────────────────────────
console.log('\n── anon (no session) ──');
{
  const sb = client();

  // RLS on with ZERO policies. PostgREST reports this as an empty result, not an error.
  for (const t of CLOSED_TABLES) {
    const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true });
    check(!error && count === 0, `${t} is not enumerable by anon (count=${count ?? 'null'}${error ? ', ' + error.message : ''})`);
  }

  // `revoke execute from public` means anon cannot invoke these at all.
  for (const [fn, args] of ALL_GUARDED) {
    const { error: e } = await sb.rpc(fn, args);
    check(!!e, `anon ${fn} → refused${e ? ` (${e.code ?? '?'})` : ' — NOT REFUSED'}`);
  }
}

// ── 2. a signed-in NON-admin — the guard ─────────────────────────────────────
console.log('\n── signed-in non-admin ──');
if (!process.env.SB_EMAIL || !process.env.SB_PASS) {
  console.log('✗ SB_EMAIL / SB_PASS not set — THIS IS THE HALF THAT MATTERS. Set them and re-run.');
  fail += 1;
} else {
  const { sb } = await signIn(process.env.SB_EMAIL, process.env.SB_PASS);

  const { data: isAdmin, error: adminErr } = await sb.rpc('is_app_admin');
  check(!adminErr && isAdmin === false, `is_app_admin() === false (got ${JSON.stringify(isAdmin)})`);

  for (const t of CLOSED_TABLES) {
    const { data: rows } = await sb.from(t).select('*').limit(5);
    check((rows ?? []).length === 0, `${t} reads back empty for a signed-in athlete (${(rows ?? []).length} rows)`);
  }

  // 0131: an athlete may read THEIR OWN events and nobody else's (P6-A1-D10), and may not rewrite them.
  const { error: evReadErr } = await sb.from('app_events').select('id').limit(1);
  check(!evReadErr, `own app_events are readable${evReadErr ? ' — ' + evReadErr.message : ''}`);

  const { error: evUpdErr } = await sb.from('app_events').update({ kind: 'tampered' }).eq('kind', 'screen_view');
  check(!!evUpdErr, `app_events UPDATE is refused${evUpdErr ? '' : ' — IT WAS NOT. An append-only log its subject can rewrite is not a log.'}`);

  const { error: evDelErr } = await sb.from('app_events').delete().eq('kind', 'screen_view');
  check(!!evDelErr, `app_events DELETE is refused${evDelErr ? '' : ' — IT WAS NOT.'}`);

  // 0167: an athlete may read THEIR OWN feedback and may not rewrite or delete it (no UPDATE/DELETE
  // policy exists), which is what stops a report being edited after we have read it.
  const { error: fbReadErr } = await sb.from('feedback').select('id').limit(1);
  check(!fbReadErr, `own feedback is readable${fbReadErr ? ' — ' + fbReadErr.message : ''}`);

  const { error: fbUpdErr } = await sb.from('feedback').update({ status: 'CLOSED' }).eq('status', 'NEW');
  check(!!fbUpdErr, `feedback UPDATE is refused${fbUpdErr ? '' : ' — IT WAS NOT. An athlete must not be able to close their own ticket.'}`);

  const { error: fbDelErr } = await sb.from('feedback').delete().eq('status', 'NEW');
  check(!!fbDelErr, `feedback DELETE is refused${fbDelErr ? '' : ' — IT WAS NOT.'}`);

  for (const [fn, args] of ALL_GUARDED) {
    const { data, error: e } = await sb.rpc(fn, args);
    // 42501 specifically — not merely "an error", and NOT an empty result. An empty result would be
    // indistinguishable from "there is no data yet" and would hide a guard that silently does nothing.
    const refused = e?.code === '42501' || /not authorized/i.test(e?.message ?? '');
    check(refused, `${fn} → 42501 not authorized${refused ? '' : ` — GOT ${e ? e.code : `DATA: ${JSON.stringify(data).slice(0, 90)}`}`}`);
  }

  await sb.auth.signOut();
}

// ── 3. the admin — the payload ───────────────────────────────────────────────
console.log('\n── signed-in admin ──');
if (!process.env.SB_ADMIN_EMAIL || !process.env.SB_ADMIN_PASS) {
  console.log('… SB_ADMIN_EMAIL / SB_ADMIN_PASS not set — skipping (the gate check above still ran).');
} else {
  const { sb } = await signIn(process.env.SB_ADMIN_EMAIL, process.env.SB_ADMIN_PASS);

  const { data: isAdmin } = await sb.rpc('is_app_admin');
  check(isAdmin === true, `is_app_admin() === true (got ${JSON.stringify(isAdmin)}) — if false, run the grant block at the end of the paste bundle`);

  if (isAdmin === true) {
    for (const [fn, args] of FUNCTIONS) {
      const t0 = Date.now();
      const { data, error: e } = await sb.rpc(fn, args);
      const ms = Date.now() - t0;
      check(!e && data != null, `${fn} returns a payload${e ? ` — ${e.message}` : ''}`);
      // The early-warning signal for the statement-timeout risk. Supabase caps `authenticated` at a
      // few seconds; when one of these starts creeping, `metrics_daily` (Phase 2) is the fix — raising
      // the timeout only converts a fast failure into a slow one and hides the growth.
      check(ms < 2000, `${fn} in ${ms}ms (< 2000ms)`);
    }

    const { data: ov } = await sb.rpc('admin_overview', { p_days: 30, p_tz: TZ });
    check(ov?.tiles != null && ov?.series != null, 'admin_overview carries tiles + series');
    check(ov?.active_def === 'saved_workout', `active_def is stated in the payload (got ${JSON.stringify(ov?.active_def)})`);

    const { data: co } = await sb.rpc('admin_retention_cohorts', { p_weeks: 12, p_tz: TZ });
    check(Array.isArray(co?.cohorts), 'admin_retention_cohorts returns an array');
    check(typeof co?.current_week === 'string', 'the partial current week is labelled in the payload');
    // The invariant that keeps the grid from lying: nothing may claim a week the cohort has not aged into.
    const bogus = (co?.cohorts ?? []).flatMap((c) => (c.cells ?? []).filter((x) => x.k > c.max_k).map((x) => `${c.week} k=${x.k} > max_k=${c.max_k}`));
    check(bogus.length === 0, `no cohort cell exceeds its max_k${bogus.length ? ` — ${bogus.slice(0, 3).join(', ')}` : ''}`);

    // AA-D2: population aggregates only. A handle or an athlete id in a payload means somebody added a
    // per-athlete drill-down without the amendment that would be required to allow one.
    //
    // ⚠ SCOPED TO THESE TWO PAYLOADS ON PURPOSE — do not widen it to every function in FUNCTIONS.
    //   `admin_recent_signups` (0137, permitted by AA-D8) and `admin_feedback` (0167) both return a
    //   handle BY DESIGN: account existence and a support ticket are not performance data, and a bug
    //   report you cannot attribute is a bug report you cannot answer. AA-D2 forbids a named athlete
    //   beside a volume number, a standing, a leaderboard position or a rank — which is exactly what
    //   `admin_overview` and `admin_retention_cohorts` carry, and why they are the two checked here.
    const blob = JSON.stringify([ov, co]);
    check(!/"handle"|"athlete_id"|"user_id"/.test(blob), 'no per-athlete identity leaks into a payload (AA-D2)');
  }

  await sb.auth.signOut();
}

console.log(`\n${fail === 0 ? 'ADMIN GATE OK' : 'ADMIN GATE FAILED'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
