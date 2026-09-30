import './harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * ONE PHOTO READER FOR EVERY IMPORT DOOR (PO 2026-09-30). The functions are faked, answering with what the live
 * prompts REALLY returned for the PO's Season 12 Day 1 photo; the reader, the AI check and the conversion are real.
 */

const { supabase, db, ATHLETE } = await import('@/lib/supabase');
const { CONSENT_POLICY_VERSION } = await import('@/domain/consent/consent');
const { refreshConsents } = await import('@/lib/consent');
const { readImportPhoto } = await import('@/data/import-photo-read');
const { resolveExerciseName } = await import('@/domain/exercise-picker/data');
const S12 = await import('../../domain/workout/__tests__/fixtures/squatober-2026-day1.mjs');
const resolveKey = (n) => resolveExerciseName(n)?.key;

globalThis.FileReader ??= class {
  readAsDataURL(blob) {
    blob.arrayBuffer().then(
      (b) => {
        this.result = `data:${blob.type};base64,${Buffer.from(b).toString('base64')}`;
        this.onload?.();
      },
      () => this.onerror?.(),
    );
  }
};
let n = 0;
const photo = () => {
  n += 1;
  return `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, n, n, 7, n]).toString('base64')}`;
};

/** Each function answers what it is given here; `calls` counts who was asked. */
let calls = {};
const answers = (byName) => {
  supabase.functions.invoke = async (name) => {
    calls[name] = (calls[name] ?? 0) + 1;
    const a = byName[name];
    if (!a) throw new Error(`unexpected call to ${name}`);
    const [body, status = 200] = a;
    if (status === 200) return { data: body, error: null };
    return { data: null, error: { message: 'non-2xx', context: new Response(JSON.stringify(body), { status }) } };
  };
};
const NOT_FOUND = [{ code: 'NOT_FOUND', message: 'Requested function was not found' }, 404];

test.beforeEach(async () => {
  db.reset();
  db.rows('health_consents').push({ athlete_id: ATHLETE, kind: 'ai_sharing', action: 'granted', policy_version: CONSENT_POLICY_VERSION.ai_sharing, created_at: new Date().toISOString() });
  await refreshConsents();
  calls = {};
});

const squatOf = (r) => r.weeks[0].days[0].items.find((i) => /back squat/i.test(i.name));

test('the card is read whole, laid out by AI, and comes back as nine squat sets with their percentages', async () => {
  answers({ 'workout-card-read': [{ ok: true, text: S12.S12_DAY1_CARD }], 'workout-tidy': [{ ok: true, text: S12.S12_DAY1_CARD_TIDY_2 }] });
  const r = await readImportPhoto(photo(), resolveKey);
  assert.equal(r.kind, 'ok');
  assert.equal(r.via, 'card');
  assert.deepEqual(calls, { 'workout-card-read': 1, 'workout-tidy': 1 });
  assert.deepEqual([squatOf(r).sets, squatOf(r).rx.percentScheme], [9, [60, 65, 70, 73, 75, 78, 82, 85, 87]]);
  assert.equal(r.weeks[0].days[0].name, 'Deep End Diving');
  assert.deepEqual(r.checks, []);
});

test('before workout-card-read is deployed: the table read, then the same AI check', async () => {
  answers({
    'workout-card-read': NOT_FOUND,
    'program-photo-read': [{ ok: true, tsv: S12.S12_DAY1_TABLE.replace(/\r/g, ''), rows: 11 }],
    'workout-tidy': [{ ok: true, text: S12.S12_DAY1_TABLE_TIDY_1 }],
  });
  const r = await readImportPhoto(photo(), resolveKey);
  assert.equal(r.kind, 'ok');
  assert.equal(r.via, 'card');
  assert.deepEqual(calls, { 'workout-card-read': 1, 'program-photo-read': 1, 'workout-tidy': 1 });
  assert.equal(squatOf(r).sets, 9);
});

test('an AI layout that changed a number is thrown away — the reader’s own reading, and a line saying to check it', async () => {
  const changed = S12.S12_DAY1_CARD_TIDY_2.replace('3 reps @ 73%', '3 reps @ 74%');
  /* A card this session has not tidied yet (a tidy is remembered by its text, and the first test tidied the card). */
  const card = S12.S12_DAY1_CARD.replace('Thursday', 'Thursday.');
  answers({ 'workout-card-read': [{ ok: true, text: card }], 'workout-tidy': [{ ok: true, text: changed }] });
  const r = await readImportPhoto(photo(), resolveKey);
  assert.equal(r.kind, 'ok');
  assert.equal(calls['workout-tidy'], 1);
  assert.ok(r.checks.some((c) => /changed a number/.test(c)), JSON.stringify(r.checks));
  assert.ok(!JSON.stringify(r.weeks).includes('74'), 'the changed number never reaches the preview');
  /* The card's own tally says the reader alone came up short — and that is said too. */
  assert.ok(r.checks.some((c) => /9 total sets/.test(c)), JSON.stringify(r.checks));
});

test('a program sheet of several days still goes to the table reader, and AI is not asked', async () => {
  const tsv = 'Week\tDay\tExercise\tSets\tReps\n1\tA\tBack Squat\t5\t5\n1\tB\tBench Press\t5\t5\n2\tA\tBack Squat\t5\t3\n2\tB\tBench Press\t5\t3';
  answers({ 'workout-card-read': NOT_FOUND, 'program-photo-read': [{ ok: true, tsv, rows: 5 }] });
  const r = await readImportPhoto(photo(), resolveKey);
  assert.equal(r.kind, 'ok');
  assert.equal(r.via, 'table');
  assert.equal(r.weeks.length, 2);
  assert.equal(calls['workout-tidy'], undefined);
});

test('a refusal keeps its name, and nothing else is asked', async () => {
  answers({ 'workout-card-read': [{ ok: false, reason: 'not_a_program' }] });
  assert.equal((await readImportPhoto(photo(), resolveKey)).kind, 'not_a_program');
  assert.deepEqual(calls, { 'workout-card-read': 1 });
});
