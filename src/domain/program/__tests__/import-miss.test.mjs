import '../../../data/__tests__/harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
 * IM-5 — "Send this to Forge so we learn this format?" (AI Road to 10 Sprint 3b; migration 0275). When it is offered,
 * what is sent, what an operator copies for Claude — and that 0275 locks the table down the way the contract says.
 */

const { importUnsureReasons, importMissRead, importMissCorrected, importMissForClaude, importMissSendsLine, shapeImportMisses } = await import('../import-miss.ts');

const item = (name, extra = {}) => ({ name, sets: 3, reps: 10, setsAssumed: false, repsAssumed: false, ...extra });
const weeks = (items) => [{ index: 1, days: [{ name: 'Day 1', letter: 'A', items }] }];
const known = (n) => ['Back Squat', 'Bench Press'].includes(n);

test('offered only on an unsure read — a card\'s warm-up and recovery lines are not doubt', () => {
  const w = weeks([item('Back Squat'), item('Bench Press')]);
  assert.deepEqual(importUnsureReasons({ weeks: w, skipped: ['Warm-up: 5 jumping jacks', 'Recovery: 30 min walk · Steak'], checks: [], isKnown: known }), []);
  assert.deepEqual(importUnsureReasons({ weeks: w, skipped: ['Rounds: 8m'], checks: [], isKnown: known }), ['A line wasn’t read as training.']);
  assert.deepEqual(importUnsureReasons({ weeks: w, skipped: [], checks: ['“Row” — no reps were read.', 'x'], isKnown: known }), ['2 things to check.']);
  assert.deepEqual(importUnsureReasons({ weeks: weeks([item('Zottman Thing'), item('Back Squat', { section: 'warmup' })]), skipped: [], checks: [], isKnown: known }), ['A lift name we don’t know.']);
});

test('what is sent: the read, the reasons — and what they changed only when they changed something', () => {
  const read = weeks([item('Back Squat', { rx: { repScheme: [5, 4, 3], percentScheme: [70, 75, 80] } })]);
  const r = importMissRead({ weeks: read, skipped: ['a'.repeat(500)], checks: [], reasons: ['A line wasn’t read as training.'], via: 'photos' });
  assert.equal(r.via, 'photos');
  assert.deepEqual(r.weeks[0].days[0].items[0], { name: 'Back Squat', sets: 3, reps: 10, ladder: [5, 4, 3], pcts: [70, 75, 80] });
  assert.ok(r.skipped[0].length <= 301, 'a long line is clipped');
  assert.equal(importMissCorrected(read, read), null);
  const edited = weeks([item('Back Squat', { sets: 5, reps: 5 })]);
  assert.equal(importMissCorrected(read, edited)[0].days[0].items[0].sets, 5);
});

test('the words say exactly what goes — never the photo unless ticked', () => {
  assert.match(importMissSendsLine('photo', false), /the words we read off your photo \(not the photo\)/);
  assert.match(importMissSendsLine('photo', true), /^We’ll send your photo/);
  assert.match(importMissSendsLine('paste', false), /the text you pasted/);
  for (const s of [importMissSendsLine('paste', false), importMissSendsLine('photo', true)]) {
    assert.match(s, /your account/);
    assert.match(s, /deleted after 90 days/);
  }
});

test('the queue reads the server\'s rows, says a bad answer out loud, and "Copy for Claude" carries the job and no account', () => {
  assert.throws(() => shapeImportMisses(null));
  assert.throws(() => shapeImportMisses([{ kind: 'paste' }]));
  const [m] = shapeImportMisses([
    {
      id: 'm1',
      created_at: '2026-11-18T10:00:00Z',
      kind: 'photo',
      input_text: 'CIRCUIT\nRounds: 3\nHIIT\n20 Wall Balls',
      photo_path: 'u1/x.jpg',
      read: { via: 'photos', weeks: [{ week: 1, days: [{ name: 'Day 1', items: [{ name: 'Wall Balls', sets: 1, reps: 20 }] }] }], reasons: ['One thing to check.'] },
      corrected: [{ week: 1, days: [{ name: 'Day 1', items: [{ name: 'Wall Balls', sets: 3, reps: 20 }] }] }],
      app_version: '1.0.0 · 01a1ed2c',
      athlete: 'Jane Doe',
      handle: 'jane',
    },
  ]);
  const t = importMissForClaude(m);
  assert.match(t, /reader rule|rule to the reader/);
  assert.match(t, /corpus/);
  assert.match(t, /Wall Balls \| 1x20/);
  assert.match(t, /changed it to by hand[\s\S]*Wall Balls \| 3x20/);
  assert.match(t, /Rounds: 3/);
  assert.doesNotMatch(t, /Jane|@jane/, 'no account details travel to the clipboard');
});

test('0275: RLS on, no client grant on the table, the account is auth.uid(), anon and public revoked, a private bucket, a 90-day purge', () => {
  const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/0275_import_misses.sql'), 'utf8');
  assert.match(sql, /alter table public\.import_misses enable row level security/);
  assert.match(sql, /revoke all on table public\.import_misses from public, anon, authenticated/);
  assert.doesNotMatch(sql, /grant [a-z, ()]* on (table )?public\.import_misses\b/i, 'no table grant to any client role');
  assert.match(sql, /v_uid uuid := auth\.uid\(\)/);
  assert.match(sql, /values \(v_uid, p_kind/);
  assert.match(sql, /values \('import-misses', 'import-misses', false/);
  assert.match(sql, /interval '90 days'/);
  assert.match(sql, /cron\.schedule\('forge-import-misses-purge'/);
  /* Every function is revoked from anon (Supabase grants new functions to anon DIRECTLY). */
  const fns = [...sql.matchAll(/create or replace function (public\.[a-z_]+)\(/g)].map((m) => m[1]);
  for (const fn of new Set(fns)) assert.match(sql, new RegExp(`revoke all on function ${fn.replace('.', '\\.')}\\([^)]*\\)\\s+from public, anon`), fn);
  /* The operator functions are guarded inside. */
  for (const fn of ['admin_import_misses', 'admin_import_miss_resolve', 'admin_import_miss_photo_debts', 'admin_import_miss_photos_cleared']) {
    const body = sql.slice(sql.indexOf(`function public.${fn}(`));
    assert.match(body.slice(0, body.indexOf('$$;')), /perform public\.admin_guard\(\)/, fn);
  }
  /* The paste bundle carries the migration's statements. */
  const bundle = fs.readFileSync(path.join(process.cwd(), 'supabase/apply/pending-0275.sql'), 'utf8');
  for (const fn of new Set(fns)) assert.ok(bundle.includes(`create or replace function ${fn}(`), `bundle has ${fn}`);
});
