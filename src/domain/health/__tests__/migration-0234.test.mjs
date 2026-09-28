import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { toPayloadRow } from '../import-rows.ts';

/**
 * 0234 against the things it must not drift from: the client payload it reads, the inbox function it
 * restates, and the paste bundle the PO actually runs.
 */

const root = process.cwd();
const read = (p) => readFileSync(join(root, p), 'utf8');
const MIG = read('supabase/migrations/0234_apple_health_import.sql');
const BUNDLE = read('supabase/apply/pending-0234.sql');

/** The `create or replace function public.<name>` statement through its terminating `$$;`/`$fn$;`. */
function fnBody(sql, name) {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  assert.ok(start >= 0, `${name} not found`);
  const tag = sql.slice(start).match(/\bas (\$[a-z]*\$)/)[1];
  const open = sql.indexOf(`as ${tag}`, start) + 3 + tag.length;
  const close = sql.indexOf(`${tag};`, open);
  return sql.slice(start, close + tag.length + 1);
}

/**
 * Top-level statements, split on `;` outside comments and dollar quotes. Enough for these files; it is a
 * test helper, not a SQL parser.
 */
const DOLLAR = /\$[a-z]*\$/y;

function statements(sql) {
  const out = [];
  let cur = '';
  let quote = null;
  for (let i = 0; i < sql.length; i++) {
    if (!quote && sql.startsWith('--', i)) {
      const nl = sql.indexOf('\n', i);
      i = nl < 0 ? sql.length : nl;
      cur += '\n';
      continue;
    }
    if (!quote && sql[i] === "'") {
      const end = sql.indexOf("'", i + 1);
      cur += sql.slice(i, end + 1);
      i = end;
      continue;
    }
    DOLLAR.lastIndex = i;
    const tag = DOLLAR.exec(sql)?.[0];
    if (tag && (!quote || quote === tag)) {
      quote = quote ? null : tag;
      cur += tag;
      i += tag.length - 1;
      continue;
    }
    if (!quote && sql[i] === ';') {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += sql[i];
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

test('the RPC reads exactly the payload field names import-rows.ts sends', () => {
  const rpc = fnBody(MIG, 'import_external_workouts');
  const sent = Object.keys(
    toPayloadRow({
      externalId: 'x',
      activityType: 'running',
      name: 'Run',
      indoor: false,
      startedAt: '2026-07-01T00:00:00.000Z',
      endedAt: '2026-07-01T00:30:00.000Z',
      durationSec: 1800,
      distanceMi: 3.1,
      sourceLabel: 'Garmin Connect',
      sourceRank: 2,
    }),
  );
  const read_ = [...rpc.matchAll(/v_row->>'([a-z_]+)'/g)].map((m) => m[1]);
  // `indoor` is carried and deliberately not stored (the name says it) — every other field is read.
  for (const k of sent.filter((k) => k !== 'indoor')) assert.ok(read_.includes(k), `RPC never reads ${k}`);
  for (const k of read_) assert.ok(sent.includes(k), `RPC reads ${k}, which the client never sends`);
});

test('saved_at is the workout’s real end, never now()', () => {
  const rpc = fnBody(MIG, 'import_external_workouts');
  const ins = rpc.slice(rpc.indexOf('insert into public.workouts'), rpc.indexOf('returning id into v_id'));
  const cols = ins.slice(ins.indexOf('(') + 1, ins.indexOf(')')).split(',').map((s) => s.trim());
  const valSrc = ins.slice(ins.indexOf('values (') + 8, ins.indexOf('on conflict'));
  const vals = [];
  let depth = 0;
  let cur = '';
  for (const ch of valSrc.slice(0, valSrc.lastIndexOf(')'))) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      vals.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  vals.push(cur.trim());
  assert.equal(cols.length, vals.length);
  assert.equal(vals[cols.indexOf('saved_at')], 'v_end');
  assert.equal(vals[cols.indexOf('started_at')], 'v_start');
  assert.equal(vals[cols.indexOf('source')], 'p_source');
  assert.ok(!/now\(\)/.test(ins), 'the insert must not stamp now() anywhere');
});

test('the RPC is SECURITY INVOKER, capped at 200 rows, and idempotent on the unique index', () => {
  const rpc = fnBody(MIG, 'import_external_workouts');
  assert.match(rpc, /\n\s*security invoker\n/);
  assert.doesNotMatch(rpc, /security definer/);
  assert.match(rpc, /jsonb_array_length\(p_rows\) > 200/);
  assert.match(rpc, /on conflict \(athlete_id, source, external_id\) where external_id is not null do nothing/);
  assert.match(MIG, /create unique index if not exists workouts_external_uniq\s+on public\.workouts \(athlete_id, source, external_id\)\s+where external_id is not null;/);
  assert.match(rpc, /evaluate_honors\('import'\)/);
});

test('notification_events_for is 0225’s body plus exactly one line', () => {
  const was = fnBody(read('supabase/migrations/0225_block_enforcement.sql'), 'notification_events_for').split('\n');
  const now = fnBody(MIG, 'notification_events_for').split('\n');
  assert.equal(now.length, was.length + 1);
  const added = now.findIndex((l, i) => l !== was[i]);
  assert.match(now[added], /^\s+and w\.source = 'forge'\s+-- 0234/);
  assert.match(now[added - 1], /and w\.saved_at > now\(\) - interval '24 hours'/, 'in branch 16, beside its window');
  assert.deepEqual([...now.slice(0, added), ...now.slice(added + 1)], was);
  // 0225 must still be the newest body before 0234 — a later redefinition means 0234 rebuilt from a stale one.
  const later = readdirSync(join(root, 'supabase', 'migrations')).filter((f) => {
    const n = Number(f.slice(0, 4));
    return n > 225 && n < 234 && read(`supabase/migrations/${f}`).includes('function public.notification_events_for(');
  });
  assert.deepEqual(later, []);
  assert.match(MIG, /revoke execute on function public\.notification_events_for\(uuid\) from public, anon, authenticated;/);
});

test('the push trigger keeps 0153’s arms and function, and adds only the source gate', () => {
  assert.match(
    MIG,
    /create trigger push_workout_saved\n\s+after insert or update of saved_at on public\.workouts\n\s+for each row\n\s+when \(new\.state = 'saved' and new\.saved_at is not null and new\.source = 'forge'\)\n\s+execute function public\.push_tg_training_finished\(\);/,
  );
});

test('the paste bundle carries every 0234 statement verbatim', () => {
  const body = MIG.slice(MIG.indexOf('\nbegin;\n') + 1);
  const want = statements(body);
  const got = new Set(statements(BUNDLE));
  const missing = want.filter((s) => !got.has(s));
  assert.deepEqual(missing, [], 'statements in the migration that the bundle does not carry verbatim');
  assert.ok(want.length >= 30, `only ${want.length} statements parsed — the splitter is broken`);
  console.log(`# pending-0234 §1: ${want.length} of ${want.length} statements present verbatim`);
});
