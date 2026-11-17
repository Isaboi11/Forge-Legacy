import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { withoutFrameRefs, sanitizeFormRead } from '../form-check.ts';

/*
 * Frame numbers never reach the athlete (Sprint 2 eval, 2026-11-17: with dense frames one clip in 21 said
 * "visible around frames 27-28"; the 09-25 baseline was 0). The boundary DELETES the reference — it never writes.
 */

test('the two sentences from the 11-17 eval lose their frame numbers and keep their coaching', () => {
  assert.equal(
    withoutFrameRefs('Your torso leans back and rocks at the top of the curl to help the weight up, visible around frames 27-28.'),
    'Your torso leans back and rocks at the top of the curl to help the weight up.',
  );
  assert.equal(
    withoutFrameRefs('Control the dumbbell down rather than dropping it, especially visible on the rep finishing around frame 24-25.'),
    'Control the dumbbell down rather than dropping it.',
  );
});

test('brackets, phrases, and sentences that cannot be saved', () => {
  assert.equal(withoutFrameRefs('Your knees cave slightly at the bottom (frame 12).'), 'Your knees cave slightly at the bottom.');
  assert.equal(withoutFrameRefs('Your hips shoot up first at frame 5 on the second rep.'), 'Your hips shoot up first on the second rep.');
  assert.equal(withoutFrameRefs('The bar drifts forward in F14 and F15 as you stand.'), 'The bar drifts forward as you stand.');
  assert.equal(withoutFrameRefs('Frame 3.'), null);
  assert.equal(withoutFrameRefs('See frames 4 to 6.'), null);
  // Untouched: no number, or a number that is not a frame.
  for (const s of ['Brace before each rep.', 'Keep the bar over mid-foot for all 5 reps.', 'The frames show a steady tempo.', 'Rest 2 minutes between sets.']) {
    assert.equal(withoutFrameRefs(s), s);
  }
});

test('the whole read goes through it: fix, cue, look-good lines, the view line', () => {
  const read = sanitizeFormRead({
    lift: 'Dumbbell Curl',
    looksGood: ['The elbow stays pinned at your side, clearest in frame 9.'],
    fix: ['Your torso leans back and rocks at the top of the curl to help the weight up, visible around frames 27-28.'],
    cue: 'elbows still',
    encourage: 'Strong set.',
    view: 'side',
    viewLine: 'From the side.',
    reps: 8,
    marks: [],
  }, 'Dumbbell Curl', 30);
  assert.ok(read, 'the read survives');
  const text = JSON.stringify({ g: read.looksGood, f: read.fix, c: read.cue, e: read.encourage, v: read.viewLine });
  assert.doesNotMatch(text, /\b(?:frames?|F)\s*#?\d/i, text);
  assert.match(text, /help the weight up\./);
});

test('the server bundle carries the same boundary', () => {
  const bundle = readFileSync(new URL('../../../../supabase/apply/deploy-coach-form-check.ts', import.meta.url), 'utf8');
  assert.match(bundle, /function withoutFrameRefs\(/);
});
