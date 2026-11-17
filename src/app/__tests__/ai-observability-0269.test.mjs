// node --experimental-strip-types --test src/app/__tests__/ai-observability-0269.test.mjs
//
// Static guards on migration 0269 (AI Road to 10 Sprint 1, PL-4): the paste bundle carries the migration
// statement for statement, the grants leave the app exactly one function, the canary spends nothing until the PO
// sets its URL, and the alert's thresholds are the page's. The end-to-end run (PGlite, 77 scenarios: the claim,
// the record, every alert, the cooldown, RLS on the votes) was done in a scratch harness outside the repo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import { splitSqlStatements, normaliseStatement } from '../../../scripts/rls-static-check.mjs';
import { DEFAULT_AI_THRESHOLDS } from '../../domain/admin/ai-health-core.ts';
import { AI_FEEDBACK_FEATURES } from '../../domain/ai/ai-feedback-core.ts';
import { destinationFor } from '../../domain/notifications/destination.ts';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const MIGRATION = read('../../../supabase/migrations/0269_ai_observability.sql');
const BUNDLE = read('../../../supabase/apply/pending-0269.sql');
const LIVE = read('../../data/ai-health-live.ts');
const ADMIN_LIVE = read('../../data/admin-live.ts');

const section = (sql, from, to) => sql.slice(sql.indexOf(from), to ? sql.indexOf(to) : undefined);
const S1 = section(BUNDLE, '-- §1 — THE STATEMENTS', '-- §2 — THE ASSERTION');
const S2 = section(BUNDLE, '-- §2 — THE ASSERTION', '-- §3 — THE REPORT');
const S3 = section(BUNDLE, '-- §3 — THE REPORT');

/** name → body, for every `create or replace function public.<name>(` in the migration. */
function functions(sql) {
  const out = new Map();
  for (const m of sql.matchAll(/create or replace function public\.(\w+)\s*\(([\s\S]*?)\$\$([\s\S]*?)\$\$;/g)) out.set(m[1], m[3]);
  return out;
}
const FNS = functions(MIGRATION);
const NEW_FUNCTIONS = [
  'ai_spend_failed',
  'ai_ops_secret_ok',
  'ai_health_alert_state',
  'ai_health_alert_tick',
  'ai_canary_begin',
  'ai_canary_record',
  'ai_canary_tick',
  'admin_ai_health',
];

test('§1 is the migration, statement for statement (parsed, not eyeballed)', () => {
  const mig = splitSqlStatements(MIGRATION).map((s) => normaliseStatement(s.code));
  const s1 = splitSqlStatements(S1).map((s) => normaliseStatement(s.code));
  assert.equal(mig.length, 44, 'the migration has 44 statements');
  assert.equal(s1.length, mig.length, `§1 has ${s1.length} of ${mig.length}`);
  mig.forEach((stmt, i) => assert.equal(s1[i], stmt, `statement ${i + 1} of ${mig.length} differs`));
  // And byte for byte, from the first statement section to the end of the file.
  const body = MIGRATION.slice(MIGRATION.lastIndexOf('\n-- ─', MIGRATION.indexOf('-- 0. 0268 FIRST')) + 1).trimEnd();
  assert.ok(BUNDLE.includes(body), 'the bundle carries the migration text verbatim');
});

test('both files say APPLY AFTER 0268, and the first statement refuses without 0268', () => {
  assert.match(MIGRATION.slice(0, 600), /APPLY AFTER 0268/);
  assert.match(BUNDLE.slice(0, 600), /APPLY AFTER 0268/);
  const first = splitSqlStatements(MIGRATION)[0].code;
  assert.match(first, /^do \$\$/);
  for (const col of ["'coach_ai_spend', 'fn'", "'coach_ai_spend', 'outcome'", "'coach_ai_spend', 'latency_ms'", "'coach_ai_spend', 'reservation_id'", "'coach_ai_reservation', 'reserved_at'", "'coach_ai_reservation', 'settled_at'"]) {
    assert.ok(first.includes(col), `the 0268 guard checks ${col}`);
  }
  assert.match(first, /raise exception '0269 needs 0268 first/);
});

test('idempotent: tables if-not-exists, policies dropped first, the row on conflict, jobs unscheduled first', () => {
  for (const t of ['ai_feedback', 'ai_ops_config', 'ai_canary_runs']) {
    assert.match(MIGRATION, new RegExp(`create table if not exists public\\.${t} \\(`), t);
    assert.match(MIGRATION, new RegExp(`alter table public\\.${t}\\s+enable row level security;`), `${t} RLS`);
  }
  assert.doesNotMatch(MIGRATION, /create table public\./);
  for (const p of ['ai_feedback_select_own', 'ai_feedback_insert_own', 'ai_feedback_update_own']) {
    assert.ok(MIGRATION.indexOf(`drop policy if exists ${p}`) < MIGRATION.indexOf(`create policy ${p}`), p);
  }
  assert.match(MIGRATION, /insert into public\.ai_ops_config \(id\) values \(true\) on conflict \(id\) do nothing;/);
  for (const job of ['forge-ai-health-alert', 'forge-ai-canary']) {
    assert.ok(MIGRATION.indexOf(`select cron.unschedule('${job}')`) < MIGRATION.indexOf(`select cron.schedule('${job}'`), job);
  }
  assert.match(MIGRATION, /cron\.schedule\('forge-ai-health-alert', '25 \* \* \* \*'/);
  assert.match(MIGRATION, /cron\.schedule\('forge-ai-canary', '40 15 \* \* \*'/);
});

test('§2 raises on every piece, §3 only reads, and the header predicts §3', () => {
  assert.ok((S2.match(/raise exception '0269:/g) ?? []).length >= 12, 'at least 12 assertions');
  for (const what of ['row-level security OFF', 'policies', 'ai_feedback_one_vote', 'anon can call', 'authenticated EXECUTE', 'service_role', 'SECURITY DEFINER', 'forge-ai-health-alert', 'forge-ai-canary']) {
    assert.ok(S2.includes(what), `§2 checks ${what}`);
  }
  const s3 = splitSqlStatements(S3);
  assert.equal(s3.length, 1, '§3 is one statement');
  assert.match(s3[0].code, /^select\b/);
  assert.doesNotMatch(s3[0].code, /\b(insert|update|delete|truncate|alter|create|drop|grant|revoke)\b/i);
  assert.match(BUNDLE, /PREDICTED §3/);
  assert.match(BUNDLE, /anon_can_call = \(none\) · authenticated_can_call = admin_ai_health/);
  assert.match(BUNDLE, /alerts_now = \[\]/);
});

test('grants: revoked from public, anon AND authenticated; the app calls only admin_ai_health; the canary is service_role', () => {
  for (const name of NEW_FUNCTIONS) assert.ok(FNS.has(name), `${name} is created`);
  assert.equal(FNS.size, NEW_FUNCTIONS.length, 'no other function is (re)written here');
  for (const sig of ['ai_spend_failed(text, boolean)', 'ai_ops_secret_ok(text)', 'ai_health_alert_state()', 'ai_health_alert_tick()', 'ai_canary_tick()', 'ai_canary_begin(text)', 'ai_canary_record(text, jsonb)']) {
    assert.match(MIGRATION, new RegExp(`revoke all on function public\\.${sig.replace(/[()]/g, '\\$&')}\\s+from public, anon, authenticated;`), sig);
  }
  assert.match(MIGRATION, /revoke all on function public\.admin_ai_health\(integer, text\)\s+from public, anon;/);
  const toAuthenticated = [...MIGRATION.matchAll(/grant execute on function public\.(\w+)\([^)]*\)\s+to authenticated;/g)].map((m) => m[1]);
  assert.deepEqual(toAuthenticated, ['admin_ai_health']);
  const toService = [...MIGRATION.matchAll(/grant execute on function public\.(\w+)\([^)]*\)\s+to service_role;/g)].map((m) => m[1]);
  assert.deepEqual(toService, ['ai_canary_begin', 'ai_canary_record']);
  const code = splitSqlStatements(MIGRATION).map((s) => s.code).join(';\n');
  assert.doesNotMatch(code, /\bgrant\b[^;]*\bto (anon|public)\b/i, 'nothing is granted to anon or public');
  // Tables: the ops pair to nobody; the votes to authenticated by column, never delete.
  assert.match(MIGRATION, /revoke all on table public\.ai_ops_config, public\.ai_canary_runs from anon, authenticated;/);
  assert.match(MIGRATION, /grant insert \(feature, ref, rating, note, model\) on table public\.ai_feedback to authenticated;/);
  assert.match(MIGRATION, /grant update \(feature, ref, rating, note, model\) on table public\.ai_feedback to authenticated;/);
  assert.doesNotMatch(MIGRATION, /grant [^;]*delete[^;]*ai_feedback/i);
});

test('never retypes a live function: every name here is new to the ledger', () => {
  const dir = new URL('../../../supabase/migrations/', import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql') && !x.startsWith('0269_'))) {
    const sql = readFileSync(new URL(f, dir), 'utf8');
    for (const name of NEW_FUNCTIONS) assert.doesNotMatch(sql, new RegExp(`function public\\.${name}\\s*\\(`), `${name} already exists in ${f}`);
  }
});

test('the canary tick returns before any request while canary_url is null (applying spends nothing)', () => {
  const tick = FNS.get('ai_canary_tick');
  const early = tick.indexOf('if v_cfg.canary_url is null then\n    return;');
  assert.ok(early > 0, 'early return');
  assert.ok(early < tick.indexOf('net.http_post'), 'before the request');
  assert.match(tick, /'x-cron-secret', v_cfg\.cron_secret/);
  assert.match(tick, /timeout_milliseconds := 60000/);
  assert.match(MIGRATION, /canary_url\s+text check \(canary_url is null or/, 'no default URL');
});

test('the claim and the record check the secret first, and the claim refuses a second run inside the gap', () => {
  for (const name of ['ai_canary_begin', 'ai_canary_record']) {
    const body = FNS.get(name).replace(/^[\s\S]*?\bbegin\b/i, '').trim();
    assert.match(body, /^if not public\.ai_ops_secret_ok\(p_secret\) then\s+raise exception 'not authorized' using errcode = '42501';/, name);
  }
  assert.match(FNS.get('ai_canary_begin'), /c\.canary_started_at < now\(\) - make_interval\(hours => c\.canary_min_gap_hours\)/);
  // The record keeps kinds and numbers only — an unknown kind is 'other', never 'ok'.
  const rec = FNS.get('ai_canary_record');
  assert.match(rec, /then e ->> 'kind' else 'other' end/);
  assert.doesNotMatch(rec, /'detail'|'message'|'error'/);
});

test('admin_ai_health: the guard first, the secret never in the payload, legacy grouped by action', () => {
  const body = FNS.get('admin_ai_health');
  assert.equal(body.replace(/^[\s\S]*?\bbegin\b/i, '').trim().split(';')[0].trim(), 'perform public.admin_guard()');
  assert.doesNotMatch(body, /cron_secret|canary_url'/);
  assert.match(body, /'configured', coalesce\(v_cfg\.canary_url is not null, false\)/);
  assert.match(body, /coalesce\(x\.fn, 'legacy:' \|\| x\.action\)/);
  assert.match(body, /\(x\.reservation_id is not null and x\.uncharged\)\s+as refunded/);
  assert.match(body, /coalesce\(sum\(s\.credits\) filter \(where not s\.refunded\), 0\)/);
  assert.match(body, /percentile_cont\(0\.95\)/);
  assert.match(LIVE, /callRpc<unknown>\('admin_ai_health', \{ p_days: days, p_tz: tz \}\)/);
  assert.match(ADMIN_LIVE, /admin_ai_health: '0269'/, 'a missing function names the file to paste');
});

test('"failed" excludes the athlete’s own cancel; old rows fall back to their uncharged flag', () => {
  const f = FNS.get('ai_spend_failed');
  // 'guarded' (0268): a server guard stopped the call on purpose after the reserve, refunded — not a fault.
  assert.match(f, /when p_outcome is not null then p_outcome not in \('ok', 'cancelled', 'guarded'\)/);
  assert.match(f, /else coalesce\(p_uncharged, false\)/);
});

test('the alert: the four checks, the 24 h rule, the cooldown and the stamp only when someone was told', () => {
  const state = FNS.get('ai_health_alert_state');
  for (const kind of ['canary_failed', 'key_drained', 'failure_rate', 'unsettled']) assert.ok(state.includes(`'kind', '${kind}'`), kind);
  assert.match(state, /if v_calls >= v_cfg\.fail_min_calls and v_fail::numeric \/ v_calls > v_cfg\.fail_rate then/);
  assert.match(state, /interval '26 hours'/);
  assert.match(state, /limit v_cfg\.drain_streak/);
  // 0268's column is reserved_at (coach_ai_reservation has no created_at).
  assert.match(state, /r\.settled_at is null\s+and r\.reserved_at < now\(\) - make_interval\(mins => v_cfg\.unsettled_minutes\)/);
  assert.match(FNS.get('admin_ai_health'), /min\(r\.reserved_at\)/);
  assert.doesNotMatch(MIGRATION, /\br\.created_at\b/);
  const tick = FNS.get('ai_health_alert_tick');
  assert.match(tick, /where c\.id for update;/, 'locked against the canary report racing it');
  assert.match(tick, /< v_now - make_interval\(hours => v_cfg\.alert_cooldown_hours\)/);
  assert.match(tick, /'ai_alert', v_now, 'AI alert', left\(v_body, 240\), '\/admin-ai'/);
  assert.match(tick, /t\.user_id = a\.user_id and t\.disabled_at is null/, 'only operators with a live device');
  assert.match(tick, /on conflict do nothing;/);
  assert.match(tick, /if v_sent > 0 then\s+update public\.ai_ops_config c\s+set last_alert_at/);
});

test('the thresholds are one set of numbers: 0269’s column defaults == the page’s', () => {
  const def = (col) => Number(MIGRATION.match(new RegExp(`\\n  ${col}\\s+(?:numeric|integer) not null default ([0-9.]+)`))?.[1]);
  assert.deepEqual(
    {
      failRate: def('fail_rate'),
      failMinCalls: def('fail_min_calls'),
      drainStreak: def('drain_streak'),
      unsettledMinutes: def('unsettled_minutes'),
      alertCooldownHours: def('alert_cooldown_hours'),
      canaryMinGapHours: def('canary_min_gap_hours'),
    },
    DEFAULT_AI_THRESHOLDS,
  );
  assert.deepEqual(DEFAULT_AI_THRESHOLDS, { failRate: 0.05, failMinCalls: 10, drainStreak: 3, unsettledMinutes: 30, alertCooldownHours: 6, canaryMinGapHours: 20 });
});

test('the vote table: one per athlete per output, the feature list is the app’s, refs bounded', () => {
  const list = MIGRATION.match(/check \(feature in \(([^)]*)\)\)/)[1].split(',').map((s) => s.trim().replace(/'/g, ''));
  // 0272 adds `workout_tidy` (its own test, migration-0272, holds the full list against the app's).
  assert.deepEqual(list, AI_FEEDBACK_FEATURES.filter((f) => f !== 'workout_tidy'));
  assert.match(MIGRATION, /constraint ai_feedback_one_vote unique \(athlete_id, feature, ref\)/);
  assert.match(MIGRATION, /athlete_id  uuid not null default auth\.uid\(\) references public\.profiles \(id\) on delete cascade/);
  assert.match(MIGRATION, /check \(rating in \(-1, 1\)\)/);
  assert.match(MIGRATION, /check \(length\(ref\) between 1 and 120 and ref ~ '\^\[A-Za-z0-9_\.:-\]\+\$'\)/);
  assert.doesNotMatch(MIGRATION, /for delete/);
});

test('a tapped AI alert opens /admin-ai, not the inbox catch-all', () => {
  assert.equal(destinationFor({ kind: 'ai_alert' }), '/admin-ai');
  assert.equal(destinationFor({ kind: 'feedback_filed' }), '/admin', 'the neighbours are unchanged');
});
