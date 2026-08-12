import test from 'node:test';
import assert from 'node:assert/strict';

import { coachLine } from '../coach-says.ts';

// ─────────────────────────────────────────────────────────────────────────────
// THE ORDER — most recent wins
// ─────────────────────────────────────────────────────────────────────────────

test('the live line outranks everything — it is ten seconds old', () => {
  const got = coachLine({ live: 'Next set, 195.', progression: 'Go to 190.', planCue: 'Brace first.' });
  assert.deepEqual(got, { text: 'Next set, 195.', source: 'live' });
});

test('progression outranks the plan cue — days beat timeless', () => {
  assert.deepEqual(coachLine({ progression: 'Go to 190.', planCue: 'Brace first.' }), {
    text: 'Go to 190.',
    source: 'progression',
  });
});

test('the plan cue speaks whenever the two above are silent', () => {
  // A first-time lift, or the quietest intensity — which is most of the session for many athletes.
  assert.deepEqual(coachLine({ planCue: 'Feel it in your legs, not your back.' }), {
    text: 'Feel it in your legs, not your back.',
    source: 'plan',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SILENCE IS A REAL ANSWER
// ─────────────────────────────────────────────────────────────────────────────

test('nothing to say returns null — the caller draws the mark alone', () => {
  assert.equal(coachLine({}), null);
  assert.equal(coachLine({ live: null, progression: null, planCue: null }), null);
});

test('⚠ a whitespace-only cue is nothing, not something', () => {
  /* An author who opened the cue field and thought better of it must not put an empty bubble on the
     athlete's screen for the whole exercise. */
  assert.equal(coachLine({ planCue: '   ' }), null);
  assert.equal(coachLine({ live: '\n', progression: '  ', planCue: '' }), null);
});

test('an empty higher tier falls through rather than winning with nothing', () => {
  assert.deepEqual(coachLine({ live: '  ', progression: 'Go to 190.' }), {
    text: 'Go to 190.',
    source: 'progression',
  });
});

test('lines are trimmed — trailing whitespace is not part of what he said', () => {
  assert.equal(coachLine({ live: '  Next set, 195.  ' })?.text, 'Next set, 195.');
});

test('undefined and null are the same absence', () => {
  assert.deepEqual(coachLine({ live: undefined, progression: 'Hold 185.' }), {
    text: 'Hold 185.',
    source: 'progression',
  });
});
