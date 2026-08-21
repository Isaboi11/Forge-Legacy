/**
 * photo-transcript.test.mjs — the photo-import guard, proved in BOTH directions.
 *
 * ══ WHY BOTH DIRECTIONS ══
 *
 * A filter that only proves it blocks prose has proved half of nothing — the same thing
 * `0173_moderation_blocklist_language.sql` learned when a blocklist that caught every slur also ate
 * `therapist`. A guard this strict fails in the expensive direction silently: an athlete photographs a
 * real program, gets "that isn't a program", and there is no error anywhere to find.
 *
 * So the known-good half below is the important half, and it is deliberately built from the SHAPES a
 * real transcription arrives in — ragged trailing cells, blank spacer rows, a fenced block the model
 * was told not to emit — rather than from one tidy example that would pass whatever I wrote.
 *
 * ══ THE ONE THAT MATTERS MOST ══
 *
 * `refuses a description of a person` is not a nice-to-have among the prose cases. The app cannot
 * enforce what is in front of the camera, so the guarantee it makes instead is that the function has no
 * channel that can carry a sentence about it. That test is that guarantee.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeTranscript } from '../photo-transcript.ts';

const HEADER = 'Week\tDay\tExercise\tSets\tReps';

const table = (...rows) => [HEADER, ...rows].join('\n');

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// KNOWN GOOD — real transcripts survive intact
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('a plain training table passes through unchanged', () => {
  const tsv = table('1\tPush A\tBench Press\t3\t8', '1\tPush A\tIncline DB Press\t3\t10');
  const r = sanitizeTranscript(tsv);
  assert.equal(r.ok, true);
  assert.equal(r.tsv, tsv);
  assert.equal(r.rows, 2);
});

test('rows are counted without the header', () => {
  const r = sanitizeTranscript(table('1\tA\tSquat\t5\t5', '1\tA\tRow\t3\t10', '2\tB\tDeadlift\t1\t5'));
  assert.equal(r.ok, true);
  assert.equal(r.rows, 3);
});

test('blank spacer rows are dropped, real rows are not', () => {
  const r = sanitizeTranscript(table('1\tA\tSquat\t5\t5', '\t\t\t\t', '1\tA\tRow\t3\t10'));
  assert.equal(r.ok, true);
  assert.equal(r.rows, 2);
  assert.ok(!r.tsv.includes('\t\t\t\t'));
});

test('a fenced block the model was told not to emit is unwrapped, not refused', () => {
  const r = sanitizeTranscript(['```tsv', HEADER, '1\tA\tSquat\t5\t5', '```'].join('\n'));
  assert.equal(r.ok, true);
  assert.equal(r.rows, 1);
});

test('ragged rows survive — a sheet with missing cells is normal, not malformed', () => {
  const r = sanitizeTranscript(table('1\tA\tSquat\t5\t5', '1\tA\tFace Pull\t\t'));
  assert.equal(r.ok, true);
  assert.equal(r.rows, 2);
});

test('an endurance sheet written one row per day passes — it is the session reader’s input', () => {
  const r = sanitizeTranscript(
    ['Week\tDay\tSession', '1\tMon\t75min bike Z2 w/ 3x8min Z3', '1\tTue\t2000yd swim'].join('\n'),
  );
  assert.equal(r.ok, true);
  assert.equal(r.rows, 2);
});

test('header aliases other than the literal words are accepted', () => {
  const r = sanitizeTranscript(['Day\tMovement\tScheme', 'A\tBack Squat\t3x8'].join('\n'));
  assert.equal(r.ok, true);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// KNOWN BAD — nothing that is not a table row comes back
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('⚠ refuses a description of a person — the function has no channel for a sentence', () => {
  const r = sanitizeTranscript(
    'The person in this photo appears to be a young man in his late teens, shirtless, with visible\n' +
      'abdominal definition. His posture suggests he is mid-set on a barbell squat.',
  );
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'not_a_program');
});

test('refuses model prose about the image', () => {
  const r = sanitizeTranscript("This image shows a 4-week push/pull/legs program. Here's what I found:");
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'not_a_program');
});

test('prose wrapped AROUND a real table keeps only the table', () => {
  const r = sanitizeTranscript(
    ["Sure! Here's the program I read from your photo:", HEADER, '1\tA\tSquat\t5\t5', 'Let me know if you want changes!'].join('\n'),
  );
  assert.equal(r.ok, true);
  assert.equal(r.rows, 1);
  assert.ok(!r.tsv.includes('Sure'));
  assert.ok(!r.tsv.includes('Let me know'));
});

test('refuses a tabbed grid that is not training — the header gate, not the tab gate', () => {
  const r = sanitizeTranscript(['Date\tVendor\tAmount', '2026-08-01\tZions Bank\t12.00'].join('\n'));
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'not_a_program');
});

test('one vocabulary word is not enough — a contact list is refused on “Name”', () => {
  // The boundary the two-word rule buys. One word accepts this; requiring an exercise column would
  // reject the endurance sheet above. Both failures are locked here so neither can come back.
  const r = sanitizeTranscript(['Name\tEmail\tPhone', 'Isaiah\ta@b.com\t555'].join('\n'));
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'not_a_program');
});

test('a header with nothing under it is unreadable, not the wrong photo', () => {
  const r = sanitizeTranscript(HEADER);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'unreadable');
});

test('empty, null and undefined refuse rather than throw', () => {
  for (const bad of ['', null, undefined, '   \n  \n']) {
    const r = sanitizeTranscript(bad);
    assert.equal(r.ok, false);
  }
});

test('a runaway repetition is bounded rather than handed on', () => {
  const rows = Array.from({ length: 5000 }, (_, i) => `1\tA\tSquat ${i}\t3\t8`);
  const r = sanitizeTranscript(table(...rows));
  assert.equal(r.ok, true);
  assert.ok(r.rows < 700, `expected the row cap to bite, got ${r.rows}`);
});

test('an absurdly long line is truncated, not passed on whole', () => {
  const r = sanitizeTranscript(table(`1\tA\t${'x'.repeat(5000)}\t3\t8`));
  assert.equal(r.ok, true);
  assert.ok(r.tsv.length < 1000);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE HANDOFF — what survives must actually parse
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('⚠ a sanitised transcript is accepted by the real parser, not just by this file', async () => {
  // The guard being "safe" is worthless if what it emits is not what `parseProgramTable` eats. This is
  // the seam the whole feature rests on: model transcribes → THIS drops → the existing parser decides.
  const { parseProgramTable } = await import('../import-parse.ts');
  const r = sanitizeTranscript(table('1\tPush A\tBench Press\t3\t8', '1\tPush A\tIncline DB Press\t3\t10'));
  assert.equal(r.ok, true);

  const parsed = parseProgramTable(r.tsv);
  assert.equal(parsed.ok, true, `parser refused the sanitised transcript: ${parsed.error ?? ''}`);
  assert.equal(parsed.weeks.length, 1);
  assert.equal(parsed.weeks[0].days[0].items.length, 2);
  // Verbatim, per import-parse's own rule — the photo path must not become the one that renames a lift.
  assert.equal(parsed.weeks[0].days[0].items[0].name, 'Bench Press');
});
