import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bannedFamily,
  capFrames,
  clipIsLong,
  FORM_CLIP_MS,
  FORM_CLIP_SECONDS,
  FORM_FIX_MAX,
  FORM_FRAME_BASE64_CHARS,
  FORM_FRAME_MAX_EDGE,
  FORM_FRAMES_MAX,
  FORM_FRAMES_MIN,
  FORM_GOOD_MAX,
  FORM_LINE_CHARS,
  FORM_NO_READ,
  FORM_OUTPUT_CAP,
  formCheckSummary,
  formClipNotice,
  formResultFrom,
  frameTimestamps,
  isBannedSentence,
  parseFormRead,
  sanitizeFormRead,
} from '../form-check.ts';

/*
 * FORM CHECK — the frame maths, the caps, and the guard.
 *
 * ⚠ The `sanitizeFormRead` half of this file is the one that matters, and it is written the way
 * `feedback_verify_guards_empirically` asks for: known-bad sentences that a prompt-ignoring model would
 * produce, AND known-good technique sentences that must survive it. A guard proved in only one direction
 * is a guard that might be deleting all the coaching.
 */

const frame = (n = 500) => 'A'.repeat(n);

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Which moments to sample
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('frame timestamps are in order, inside the clip, and never on either end', () => {
  const times = frameTimestamps(8000, 5);
  assert.equal(times.length, 5);
  for (let i = 1; i < times.length; i += 1) assert.ok(times[i] > times[i - 1], 'strictly increasing');
  assert.ok(times[0] > 0, 't=0 is the frame before anybody moved');
  assert.ok(times[times.length - 1] < 8000, 'past the last frame decodes black or throws');
  // Evenly spaced: every gap is the same.
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  assert.deepEqual(new Set(gaps).size, 1);
});

test('a longer clip is sampled across the first FORM_CLIP_SECONDS only', () => {
  const times = frameTimestamps(45_000, 4);
  assert.ok(times[times.length - 1] <= FORM_CLIP_MS, `last frame at ${times[times.length - 1]}ms`);
  // …and the window really is the cap, not the clip.
  assert.deepEqual(frameTimestamps(45_000, 4), frameTimestamps(FORM_CLIP_MS, 4));
});

test('the count is clamped, whatever is asked for', () => {
  assert.equal(frameTimestamps(8000, 1).length, FORM_FRAMES_MIN);
  assert.equal(frameTimestamps(8000, 2).length, FORM_FRAMES_MIN);
  assert.equal(frameTimestamps(8000, 99).length, FORM_FRAMES_MAX);
  assert.equal(frameTimestamps(8000, 4).length, 4);
});

test('an unknown duration is treated as a full-length clip rather than refused', () => {
  for (const bad of [null, undefined, 0, -1, NaN, Infinity, 'eight seconds']) {
    const times = frameTimestamps(bad, 4);
    assert.equal(times.length, 4, `${String(bad)} still yields frames`);
    assert.ok(times.every((t) => t > 0 && t < FORM_CLIP_MS));
  }
});

test('a long clip is announced BEFORE the read, and a short one says nothing', () => {
  assert.equal(formClipNotice(6000), null);
  assert.equal(formClipNotice(FORM_CLIP_MS), null, 'exactly the window is not "longer"');
  assert.equal(formClipNotice(null), null, 'an unknown duration makes no claim');
  assert.equal(clipIsLong(30_000), true);
  const notice = formClipNotice(30_000);
  assert.ok(notice.includes(String(FORM_CLIP_SECONDS)));
  assert.ok(!/sorry|can'?t|too long/i.test(notice), 'it is a cap, not a refusal');
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The frame caps
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('capFrames keeps order and refuses anything unusable', () => {
  const three = [frame(200), frame(201), frame(202)];
  assert.deepEqual(capFrames(three), three, 'order is the information — a bar going up vs down');

  assert.equal(capFrames([frame(), frame()]), null, 'two frames cannot show a direction');
  assert.equal(capFrames([]), null);
  assert.equal(capFrames(null), null);
  assert.equal(capFrames('not an array'), null);
  assert.equal(capFrames([frame(), frame(), 42]), null, 'a non-string is a broken client');
  assert.equal(capFrames([frame(), frame(), frame(10)]), null, 'ten characters is not an image');
  assert.equal(capFrames([frame(), frame(), frame(FORM_FRAME_BASE64_CHARS + 1)]), null, 'over the API limit');
});

test('capFrames truncates past the ceiling and strips a data-URI prefix', () => {
  const many = Array.from({ length: 12 }, (_, i) => frame(300 + i));
  assert.equal(capFrames(many).length, FORM_FRAMES_MAX);
  const prefixed = [`data:image/jpeg;base64,${frame()}`, frame(), frame()];
  assert.ok(capFrames(prefixed).every((f) => !f.startsWith('data:')), 'the API takes raw base64');
});

test('the whole request has a ceiling too, not only each frame', () => {
  const huge = Array.from({ length: 6 }, () => frame(3_000_000));
  assert.equal(capFrames(huge), null, '18 MB of base64 is a client that skipped the resize');
});

test('the caps are the numbers the amendment and the API fixed', () => {
  assert.equal(FORM_OUTPUT_CAP, 900, 'CA-D5: form check 900 output tokens');
  assert.equal(FORM_FRAMES_MIN, 3);
  assert.equal(FORM_FRAMES_MAX, 6);
  assert.equal(FORM_CLIP_SECONDS, 10);
  assert.ok(FORM_FRAME_MAX_EDGE <= 1568, 'the API scales anything longer, so paying for it buys nothing');
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// ⛔ THE GUARD — known-bad
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Sentences a model that ignored the prompt would write. NONE of these may reach a screen. */
const BANNED_SENTENCES = [
  // pain and injury, including the reassuring forms
  'That should not hurt at the bottom.',
  'A little soreness there is normal.',
  'You are going to injure your lower back doing that.',
  'That rounding puts your discs under load.',
  'That looks like shoulder impingement.',
  'Your knee pain is coming from the valgus collapse.',
  'The tendon is taking the load instead of the muscle.',
  'You may have strained something on the third rep.',
  'Nothing there looks torn.',
  'It should heal fine if you back off.',
  'Any numbness in the hands is worth watching.',
  // diagnosis and referral
  'This is a classic case of anterior pelvic tilt as a condition.',
  'Get that looked at before you load it again.',
  'You should see a physio about that hip.',
  'Stop lifting until it settles down.',
  'A doctor would tell you the same thing.',
  // verdicts
  'That rep was not safe.',
  'That is dangerous for your spine.',
  'This is risky at that depth.',
  'You are at risk of an injury there.',
  'Squatting like that is bad for your knees.',
  'It is perfectly safe to keep going.',
  // the body
  'You have put on some muscle since the last one.',
  'Your physique is coming along.',
  'Dropping some weight would make the depth easier.',
  'You look strong in these.',
  'Your body fat is hiding the bar position.',
  'A leaner athlete would get deeper here.',
  // numbers
  'That looks like about 225 lb on the bar.',
  'Your max is probably around 300.',
  'Work at 80% of your 1RM next time.',
  'Take 20 kg off and rebuild it.',
];

test('every banned sentence is caught, and named', () => {
  // Collected rather than asserted one at a time: a guard is tuned by seeing ALL the misses at once, and
  // a loop that throws on the first one hides the other thirty.
  const missed = BANNED_SENTENCES.filter((s) => bannedFamily(s) === null);
  assert.deepEqual(missed, [], `NOT CAUGHT:\n${missed.join('\n')}`);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// ✅ THE GUARD — known-good
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Real technique coaching. EVERY ONE must survive, or the guard is deleting the product.
 *
 * ⚠ The last few are the near misses the regexes were tuned around: "pinch your shoulder blades" (the
 * word `pinch` is NOT banned), "shift your weight back" (`your weight` is NOT banned), "don't lean back"
 * (only `leaner`/`lean mass` are), and the safety squat bar (which is a bar).
 */
const GOOD_SENTENCES = [
  'The bar drifts forward out of the bottom.',
  'Depth is there — hip crease is under the knee on every rep.',
  'Your brace holds all the way through the first two reps.',
  'Knees cave in on the way up out of the hole.',
  'The hips shoot up before the bar leaves the floor.',
  'Ribs stay down and the spine keeps its shape.',
  'Elbows flare out as the bar comes down.',
  'Chest stays up through the whole rep.',
  'The eccentric is rushed; you are dumping it.',
  'Bar path is straight over the middle of your foot.',
  'The walkout is uneven — your left foot lands wider.',
  'Lockout is complete and the bar is stable overhead.',
  'You lose the brace at the turnaround, third rep on.',
  'Set your grip a thumb-width wider.',
  'Push the floor away instead of pulling with your back.',
  'Pinch your shoulder blades together before you unrack.',
  'Shift your weight back into your heels as you sit down.',
  'Do not lean back at the top of the press.',
  'Your back rounds slightly at the bottom of the last rep.',
  'The safety squat bar changes the torso angle, so this looks different.',
  'Keep your body tight over the bar on the way up.',
  'Three sets of eight at that tempo would tidy this up.',
  'Head and eye line stay neutral; you are not craning up.',
  'Your left knee tracks further out than your right.',
  'Tempo is even between reps one and four.',
];

test('every real technique sentence survives the guard', () => {
  const dropped = GOOD_SENTENCES.filter(isBannedSentence).map((s) => `[${bannedFamily(s)}] ${s}`);
  assert.deepEqual(dropped, [], `WRONGLY DROPPED:\n${dropped.join('\n')}`);
});

test('the two directions are separated with margin — no overlap at all', () => {
  const caught = BANNED_SENTENCES.filter(isBannedSentence).length;
  const dropped = GOOD_SENTENCES.filter(isBannedSentence).length;
  assert.equal(caught, BANNED_SENTENCES.length);
  assert.equal(dropped, 0);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// sanitizeFormRead
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('a clean read passes through unchanged', () => {
  const read = sanitizeFormRead(
    {
      lift: 'Back Squat',
      looksGood: ['Depth is there on every rep.', 'Your brace holds.'],
      fix: ['The bar drifts forward out of the bottom.'],
      cue: 'chest through the bar',
    },
    'Back Squat',
  );
  assert.deepEqual(read, {
    lift: 'Back Squat',
    looksGood: ['Depth is there on every rep.', 'Your brace holds.'],
    fix: ['The bar drifts forward out of the bottom.'],
    cue: 'chest through the bar',
  });
});

test('a medical sentence is dropped and the technique beside it is kept', () => {
  const read = sanitizeFormRead({
    lift: 'Deadlift',
    looksGood: ['Bar path is straight. That should not hurt at all.'],
    fix: ['The hips shoot up early. Get that back looked at before you load it.'],
    cue: 'push the floor away',
  });
  assert.deepEqual(read.looksGood, ['Bar path is straight.']);
  assert.deepEqual(read.fix, ['The hips shoot up early.']);
  assert.equal(read.cue, 'push the floor away');
});

test('a prompt-ignoring model cannot get medical text onto the screen', () => {
  // Every field full of the worst answer the model could give.
  const read = sanitizeFormRead({
    lift: 'Squat',
    looksGood: ['You have leaned out since last time.', 'Nothing looks torn.'],
    fix: [
      'That is dangerous for your lower back and you should see a physio.',
      'Your knee pain is from the valgus collapse — stop squatting until it settles.',
    ],
    cue: 'do not let it hurt',
  });
  assert.equal(read, null, 'nothing survived, so there is no read — not a partial one');
});

test('one bad field does not take the whole read with it', () => {
  const read = sanitizeFormRead({
    lift: 'Bench Press',
    looksGood: ['That is risky at that depth.'],
    fix: ['Elbows flare out as the bar comes down.'],
    cue: 'squeeze the bar apart',
  });
  assert.deepEqual(read.looksGood, []);
  assert.deepEqual(read.fix, ['Elbows flare out as the bar comes down.']);
});

test('the counts and lengths are capped, and the fix order is preserved', () => {
  const read = sanitizeFormRead({
    lift: 'Overhead Press',
    looksGood: ['One.', 'Two.', 'Three.', 'Four.', 'Five.'],
    fix: ['Biggest.', 'Second.', 'Third.', 'Fourth.'],
    cue: 'x'.repeat(400),
  });
  assert.equal(read.looksGood.length, FORM_GOOD_MAX);
  assert.equal(read.fix.length, FORM_FIX_MAX);
  assert.deepEqual(read.fix, ['Biggest.', 'Second.'], 'biggest first, as the prompt requires');
  assert.ok(read.cue.length <= FORM_LINE_CHARS);
});

test('the lift is taken from the request, never from the model', () => {
  const read = sanitizeFormRead(
    { lift: 'Romanian Deadlift', looksGood: ['Bar path is straight.'], fix: [], cue: '' },
    'Back Squat',
  );
  assert.equal(read.lift, 'Back Squat', 'a model cannot rename what the athlete said they did');
});

test('sanitizeFormRead never throws, whatever it is handed', () => {
  for (const junk of [null, undefined, 42, 'a sentence', [], [1, 2], { }, { fix: 'not an array' }]) {
    assert.doesNotThrow(() => sanitizeFormRead(junk));
  }
  assert.equal(sanitizeFormRead({ looksGood: [], fix: [], cue: '' }), null);
  // A string in place of an array is read as one line rather than dropped — models do this.
  assert.deepEqual(sanitizeFormRead({ fix: 'The bar drifts forward.' }).fix, ['The bar drifts forward.']);
});

test('the honest "I cannot see it" answer survives as a fix', () => {
  const read = sanitizeFormRead({
    looksGood: [],
    fix: ['I cannot see the bar in these frames — film from the side, a couple of steps back.'],
    cue: '',
  });
  assert.equal(read.fix.length, 1);
  assert.deepEqual(read.looksGood, []);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// parseFormRead
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('JSON is read through fences and surrounding prose', () => {
  const wrapped = '```json\n{"looksGood":["Depth is there."],"fix":["Bar drifts forward."],"cue":"stay over mid-foot"}\n```';
  const read = parseFormRead(wrapped, 'Front Squat');
  assert.equal(read.lift, 'Front Squat');
  assert.deepEqual(read.fix, ['Bar drifts forward.']);

  const chatty = 'Here is what I see:\n{"looksGood":[],"fix":["Hips shoot up."],"cue":"chest up"}\nHope that helps.';
  assert.deepEqual(parseFormRead(chatty).fix, ['Hips shoot up.']);
});

test('parseFormRead refuses anything that is not a read, without throwing', () => {
  for (const junk of ['', '   ', 'no json here', '{ broken', '[1,2,3]', null, 42, '{}']) {
    assert.equal(parseFormRead(junk), null, `should be null: ${String(junk)}`);
  }
});

test('the guard still runs on parsed JSON — not only on an object handed in directly', () => {
  const evil = '{"looksGood":[],"fix":["That is dangerous for your back."],"cue":"stop if it hurts"}';
  assert.equal(parseFormRead(evil, 'Squat'), null);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// What Holt says
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('the summary reads as Holt: the good, the biggest fix, then the cue', () => {
  const lines = formCheckSummary({
    lift: 'Back Squat',
    looksGood: ['Depth is there on every rep.'],
    fix: ['The bar drifts forward out of the bottom.', 'Your brace goes at the turnaround.'],
    cue: 'chest through the bar',
  });
  assert.deepEqual(lines, [
    'Back Squat — Depth is there on every rep.',
    'The bar drifts forward out of the bottom.',
    'Then: Your brace goes at the turnaround.',
    'Next set, think: "chest through the bar"',
  ]);
  // Holt-Voice: plain text only.
  for (const line of lines) assert.ok(!/[*_#•]|^\d\./.test(line), `markdown in: ${line}`);
});

test('the lift is still named when there is nothing good to say', () => {
  const lines = formCheckSummary({ lift: 'Deadlift', looksGood: [], fix: ['The hips shoot up early.'], cue: '' });
  assert.equal(lines.length, 2);
  assert.ok(lines[0].startsWith('Deadlift —'));
  assert.equal(lines[1], 'The hips shoot up early.');
});

test('one fix means no "Then" line, and a quoted cue is not double-quoted', () => {
  const lines = formCheckSummary({ lift: 'Bench', looksGood: [], fix: ['Elbows flare.'], cue: '"squeeze the bar apart"' });
  assert.ok(!lines.some((l) => l.startsWith('Then:')));
  assert.equal(lines[lines.length - 1], 'Next set, think: "squeeze the bar apart"');
});

test('no read is a plain next step, never an apology or a verdict', () => {
  assert.deepEqual(formCheckSummary(null), [FORM_NO_READ]);
  assert.deepEqual(formCheckSummary(undefined), [FORM_NO_READ]);
  assert.deepEqual(formCheckSummary({ lift: 'Squat', looksGood: [], fix: [], cue: '' }), [FORM_NO_READ]);
  assert.ok(!/sorry|failed|error/i.test(FORM_NO_READ));
  assert.ok(/film/i.test(FORM_NO_READ), 'it says what to do next');
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The wire
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('every failure the function can answer with maps to its own kind', () => {
  assert.deepEqual(formResultFrom({ route: 'crisis' }), { kind: 'stopped', route: 'crisis' });
  assert.deepEqual(formResultFrom({ route: 'medical_stop' }), { kind: 'stopped', route: 'medical_stop' });
  assert.deepEqual(formResultFrom({ ok: false, reason: 'unreadable' }), { kind: 'unreadable' });
  assert.deepEqual(formResultFrom({ ok: false, reason: 'bad_request' }), { kind: 'bad_frames' });
  assert.deepEqual(formResultFrom({ ok: false, reason: 'out_of_credits', remaining: 0, allowance: 120 }), {
    kind: 'out_of_credits',
    remaining: 0,
    allowance: 120,
  });
  // 0203's gate answers a non-Premium-AI account with an allowance of 0 — not a used-up month.
  assert.deepEqual(formResultFrom({ ok: false, reason: 'out_of_credits', remaining: 0, allowance: 0 }), {
    kind: 'not_entitled',
  });
  // A server failure is never the athlete's connection, and an unknown reason is still a server failure.
  for (const reason of ['unconfigured', 'meter_unavailable', 'upstream_error', 'upstream_unreachable', 'brand_new']) {
    assert.deepEqual(formResultFrom({ ok: false, reason }), { kind: 'unavailable' });
  }
  assert.deepEqual(formResultFrom(null), { kind: 'unavailable' });
});

test('the app re-runs the guard on the function\'s answer', () => {
  // A stale deployment of the function cannot put a medical sentence on the screen of a current build.
  const body = { ok: true, read: { looksGood: [], fix: ['See a physio about that knee.'], cue: '' }, remaining: 9 };
  assert.deepEqual(formResultFrom(body, 'Squat'), { kind: 'unreadable' });

  const good = { ok: true, read: { looksGood: ['Depth is there.'], fix: [], cue: '' }, remaining: 9 };
  const result = formResultFrom(good, 'Squat');
  assert.equal(result.kind, 'ok');
  assert.equal(result.read.lift, 'Squat');
  assert.equal(result.remaining, 9);
});
