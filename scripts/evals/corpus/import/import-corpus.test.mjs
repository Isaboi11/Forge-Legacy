/**
 * import-corpus.test.mjs — the IM-2 suite proven before `scripts/evals/run.mjs` exists (contract §1.4).
 *
 * Hand-made recordings, graded through the REAL import path (`readImportPhoto` under the repo's harness). No model
 * is called and no network is touched: `fetch` is replaced with one that fails the test if anything reaches for it.
 *
 * Run:  node --test --experimental-strip-types scripts/evals/corpus/import/import-corpus.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { gradeRead, LEGACY_FLOOR, nameMatches, parseSpec, readThroughApp, suite } from '../../suites/import-corpus.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..', '..', '..', '..');
const manifest = JSON.parse(fs.readFileSync(path.join(here, 'manifest.json'), 'utf8'));
const item = (id) => manifest.items.find((i) => i.id === id);

/* The app reads a photo by fetching its own data: URI (`readAsBase64`) — that stays local. Anything else is the
   network, and this test must never reach it. */
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith('data:')) return realFetch(url, init);
  throw new Error(`this test must never reach the network (asked for ${url})`);
};

/** A recording in the runner's shape: what each function returned. */
const recording = (bodies) => ({ reply: { bodies }, usage: {} });
const ok = (text) => ({ status: 200, body: { ok: true, text } });
const DOWN = { status: 503, body: { ok: false, reason: 'unavailable' } };

const DAY8 = `"TEMPO TUESDAY"
Day: 8 Tuesday 10-08-24
Warm Up: Get Loose and memorize the rep tempo.
1. BACK SQUAT 4 sets of 4 reps @ 60%
* 2 min rest between sets
2. FRONT SQUAT 3 sets of 4 reps @ 45%
% taken from Back Squat max, 2 min rest
3. DB Bulgarian Split Squats 3 sets of 5 reps each leg
2 min rest between sets
Cardio
BB RDL's
3 sets of 5 reps
90 sec rest between sets
Recovery
All you can eat tacos.
8-9 hrs sleep
30 min walk`;

test('the suite is the §1.4 shape, and its prompt sources are real', async () => {
  for (const k of ['name', 'functions', 'promptSources', 'model', 'cases', 'deterministic', 'grade', 'callLive', 'estimateUsd', 'threshold']) {
    assert.ok(k in suite, k);
  }
  assert.equal(suite.name, 'import-corpus');
  assert.deepEqual(suite.threshold, { metric: 'pass_rate', min: 0.95 });
  for (const s of suite.promptSources) {
    const src = fs.readFileSync(path.join(ROOT, s.file), 'utf8');
    assert.match(src, new RegExp(`const ${s.exportName} = \``), `${s.file} holds ${s.exportName}`);
  }
  const cases = await suite.cases();
  assert.ok(cases.length >= 60, `${cases.length} graded cases`);
  assert.ok(cases.every((c) => c.id && c.input?.sha256 && c.expect));
});

test('the key format reads every form, and refuses one it cannot', () => {
  assert.deepEqual(parseSpec('Back Squat | 5x5 @70%'), { line: 'Back Squat | 5x5 @70%', optional: false, name: 'Back Squat', pct: [70], kind: 'reps', sets: 5, reps: 5 });
  assert.equal(parseSpec('Bench Press | 3x8-12').repsMax, 12);
  assert.equal(parseSpec('Plank | 3x30s').sec, 30);
  assert.equal(parseSpec('Stairmaster | 1x3min').sec, 180);
  assert.deepEqual(parseSpec('Dips | F/F/F').ladder, ['F', 'F', 'F']);
  assert.deepEqual(parseSpec('Back Squat | 4/6/8/6/4 @67%').ladder, [4, 6, 8, 6, 4]);
  assert.deepEqual(parseSpec('Back Squat | 5x5 @67,70,73,75,77%').pct, [67, 70, 73, 75, 77]);
  assert.equal(parseSpec('? KB Swings | 3x10').optional, true);
  assert.equal(parseSpec('Push-ups | 2x?').kind, 'any');
  assert.equal(parseSpec('Farmers Walk | 5x30yd').kind, 'distance');
  assert.equal(parseSpec('Back Squat | ?x?').sets, null);
  assert.throws(() => parseSpec('Back Squat 5x5'));
  assert.throws(() => parseSpec('Back Squat | five by five'));
});

test('names forgive spelling, not a different lift', () => {
  assert.ok(nameMatches('DB RDL\'s', 'Dumbbell Romanian Deadlift'));
  assert.ok(nameMatches('DB/or KB Farmers Walk', 'DB Farmers Walk'));
  assert.ok(!nameMatches('Back Squat', 'Front Squat'));
  assert.ok(!nameMatches('Bench Press', 'Close Grip Bench Press'));
});

test('a hand-made recording of a real card grades structure-correct through the real path', async () => {
  const r = await suite.grade({ id: 'squatober-2024-08', expect: item('squatober-2024-08') }, recording({
    'workout-card-read': ok(DAY8),
    // The AI layout pass is asked for a single workout; "unreadable" is its honest failure — the reader's own reading stands.
    'workout-tidy': { status: 200, body: { ok: false, reason: 'unreadable' } },
  }));
  assert.equal(r.pass, true, r.notes);
  assert.equal(r.score, 1);
});

test('one wrong number fails the case, and says which', async () => {
  const r = await suite.grade({ id: 'squatober-2024-08', expect: item('squatober-2024-08') }, recording({
    'workout-card-read': ok(DAY8.replace('3 sets of 4 reps @ 45%', '3 sets of 6 reps @ 45%')),
    'workout-tidy': { status: 200, body: { ok: false, reason: 'unreadable' } },
  }));
  assert.equal(r.pass, false);
  assert.match(r.notes, /Front Squat: 6 reps, key 4/);
  assert.ok(r.score > 0 && r.score < 1, `partial credit ${r.score}`);
});

test('a recording that lacks an answer the path now asks for fails loudly instead of grading half a read', async () => {
  const r = await suite.grade({ id: 'squatober-2024-08', expect: item('squatober-2024-08') }, recording({ 'workout-card-read': ok(DAY8.replace('Tuesday', 'Tuesday.')) }));
  assert.equal(r.pass, false);
  assert.match(r.notes, /asked workout-tidy/);
});

test('a rest-day card passes only when nothing is imported', async () => {
  const rest = { id: 'squatober-2024-5-6', expect: item('squatober-2024-5-6') };
  assert.equal(rest.expect.expect, 'refuse');
  const refused = await suite.grade(rest, recording({ 'workout-card-read': { status: 200, body: { ok: false, reason: 'not_a_program' } } }));
  assert.equal(refused.pass, true, refused.notes);
  const imported = await suite.grade(rest, recording({ 'workout-card-read': ok('Active Rest\nGet in a 30 min walk each day\n3 sets of 10 squats'), 'workout-tidy': DOWN }));
  assert.equal(imported.pass, false, imported.notes);
});

test('a multi-week sheet goes to the table reader whole and grades 3 weeks × 4 days — range tops counted, not failed', async () => {
  const tsv = fs.readFileSync(path.join(ROOT, 'src/domain/program/__tests__/fixtures/po-3-week-photo.tsv'), 'utf8').replace(/\r/g, '');
  const text = `3 WEEK PROGRAM\n${tsv.split('\n').filter((l) => l.trim()).map((l) => l.split('\t').join(' | ')).join('\n')}`;
  const result = await readThroughApp('data:image/png;base64,iVBORw0KGgo=', async (name) => (name === 'workout-card-read' ? ok(text) : DOWN));
  const g = gradeRead(item('po-3-week-upper-lower'), result);
  assert.equal(result.via, 'table');
  assert.equal(g.pass, true, g.notes);
  assert.match(g.notes, /rangeTopDropped \d+/, 'the table path cannot hold "8-12"’s 12 — counted where a reader can see it');
});

test('the deterministic checks pass at $0, including today’s floor on the repo’s typed transcripts', async () => {
  const checks = await suite.deterministic();
  for (const c of checks) assert.equal(c.pass, true, `${c.id}: ${c.notes}`);
  const legacy = checks.find((c) => c.id === 'legacy-transcripts');
  assert.match(legacy.notes, new RegExp(`^(\\d+)/`));
  assert.ok(Number(legacy.notes.split('/')[0]) >= LEGACY_FLOOR);
});

test('the live estimate is honest arithmetic over the meter’s own rates, and callLive refuses without a key', async () => {
  const cases = await suite.cases();
  const all = suite.estimateUsd(cases);
  assert.ok(all > 0.5 && all < 3, `$${all} for ${cases.length} cases`);
  assert.equal(suite.estimateUsd([]), 0);
  assert.ok(suite.estimateUsd(cases.slice(0, 10)) < all);
  await assert.rejects(() => suite.callLive(cases[0], { apiKey: '', signal: undefined }), /needs an Anthropic API key/);
});
