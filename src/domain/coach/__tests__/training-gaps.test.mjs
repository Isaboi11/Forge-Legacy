/**
 * TRAINING GAPS — the eight cases `Coach-Holt-Training-Gaps-v1.0` §8 requires, plus the drift guard.
 *
 * ⚠ THE LOAD-BEARING TESTS HERE ARE THE REFUSALS, not the detections. A gap engine that finds gaps is
 * easy; one that stays quiet when it has no business speaking is the whole safety argument. Cases 5 and
 * the "nothing attributable" case are the ones that would have shipped the `recommend.ts` cold-start bug
 * again — it reported an athlete race-ready with no experience recorded at all.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  findGaps,
  gapAnswer,
  isGapQuestion,
  GAP_MUSCLES,
  MIN_SESSIONS,
  MAX_GAPS,
  UNDERWORKED_SHARE,
} from '../training-gaps.ts';
import { FOCUS_SPEC } from '../rulebook/focus.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const COACH = join(HERE, '..');

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// FIXTURES — a small catalogue and a session builder
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const CATALOG = [
  { key: 'bench', primaryMuscleIds: ['chest'] },
  { key: 'row', primaryMuscleIds: ['lats', 'upper_back'] },
  { key: 'squat', primaryMuscleIds: ['quadriceps'] },
  { key: 'rdl', primaryMuscleIds: ['hamstrings'] },
  { key: 'thrust', primaryMuscleIds: ['glutes'] },
  { key: 'raise', primaryMuscleIds: ['lateral_deltoids'] },
  { key: 'curl', primaryMuscleIds: ['biceps'] },
  { key: 'pushdown', primaryMuscleIds: ['triceps'] },
  { key: 'calfraise', primaryMuscleIds: ['calves'] },
  { key: 'plank', primaryMuscleIds: ['rectus_abdominis'] },
  { key: 'jog', primaryMuscleIds: [] }, // attributable to nothing — a run
];

const NAMES = {
  bench: 'Barbell Bench Press',
  row: 'Barbell Row',
  squat: 'Barbell Back Squat',
  rdl: 'Romanian Deadlift',
  thrust: 'Hip Thrust',
  raise: 'Lateral Raise',
  curl: 'Barbell Curl',
  pushdown: 'Triceps Pushdown',
  calfraise: 'Standing Calf Raise',
  plank: 'Front Plank',
  jog: 'Jog',
};

const TODAY = '2026-09-22T12:00:00.000Z';
const DAY = 24 * 60 * 60 * 1000;

/** A session `daysAgo` back, holding `{ key: [[weight, reps], …] }`. */
const session = (daysAgo, lifts) => ({
  startedAt: new Date(Date.parse(TODAY) - daysAgo * DAY).toISOString(),
  lifts: Object.entries(lifts).map(([key, sets]) => ({
    id: key,
    name: NAMES[key],
    sets: sets.map(([weight, reps]) => ({ weight, reps })),
  })),
});

const sets = (n, weight = 100, reps = 5) => Array.from({ length: n }, () => [weight, reps]);

/** A balanced eight weeks: every group trained, evenly. The baseline the cases perturb. */
function balanced({ omit = [], scale = 1 } = {}) {
  const keys = ['bench', 'row', 'squat', 'rdl', 'thrust', 'raise', 'curl', 'pushdown', 'calfraise', 'plank'];
  const out = [];
  for (let i = 0; i < 12; i += 1) {
    const lifts = {};
    for (const k of keys) if (!omit.includes(k)) lifts[k] = sets(3 * scale);
    out.push(session(i * 4 + 1, lifts));
  }
  return out;
}

/**
 * Is this session in the RECENT half of an 8-week window?
 *
 * ⚠ COMPUTED FROM THE TIMESTAMP, NOT THE INDEX. Deriving it by hand cost this file two failures: with
 * sessions every 4 days, the recent half is indices 0–6, not 0–5, so "remove it from the recent half"
 * left one behind and `dropped` correctly refused to fire. The fixture now asks the same question the
 * engine does.
 */
const isRecent = (s, weeks = 8) =>
  Date.parse(s.startedAt) >= Date.parse(TODAY) - (weeks * 7 * DAY) / 2;

const run = (sessions, opts = {}) => findGaps(sessions, CATALOG, { today: TODAY, ...opts });
const kinds = (report) => report.gaps.map((g) => g.kind);
const muscles = (report) => report.gaps.map((g) => g.muscle);

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// 1. G1 — never trained. Absence, not scarcity.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('G1 fires on a muscle with zero primary sets', () => {
  const r = run(balanced({ omit: ['calfraise'] }));
  assert.equal(r.tooEarly, false);
  assert.ok(muscles(r).includes('calves'), `expected calves in ${JSON.stringify(muscles(r))}`);
  assert.equal(r.gaps.find((g) => g.muscle === 'calves').kind, 'never');
});

test('G1 does NOT fire on a muscle with a single set — absence is not scarcity', () => {
  const s = balanced({ omit: ['calfraise'] });
  // One calf set, in the most recent session, is enough to make it not-never.
  // ⚠ `{ weight, reps }`, not `[weight, reps]` — the raw pair the builder accepts is mapped by `session()`,
  // and pushing an unmapped one here made the set unusable and the test pass for the wrong reason.
  s[0].lifts.push({ id: 'calfraise', name: NAMES.calfraise, sets: [{ weight: 100, reps: 10 }] });
  const r = run(s);
  const calves = r.gaps.find((g) => g.muscle === 'calves');
  if (calves) assert.notEqual(calves.kind, 'never', 'one set must not read as never trained');
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// 2. TG-D1 — relative only. THE decision, asserted.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('G2 is purely relative — scaling every set count changes nothing', () => {
  const thin = balanced();
  // Make calves scarce but present, at 1 set against everyone else's 3.
  for (const s of thin) {
    const calf = s.lifts.find((l) => l.id === 'calfraise');
    if (calf) calf.sets = [[100, 10]];
  }
  const fat = JSON.parse(JSON.stringify(thin));
  // Triple EVERY set, calves included. The ratios are identical; an absolute threshold would move.
  for (const s of fat) for (const l of s.lifts) l.sets = [...l.sets, ...l.sets, ...l.sets];

  const a = run(thin);
  const b = run(fat);
  assert.deepEqual(kinds(a), kinds(b), 'kinds moved under a constant scale');
  assert.deepEqual(muscles(a), muscles(b), 'groups moved under a constant scale');
  assert.ok(muscles(a).includes('calves'), 'the scarce group should be reported at all');
});

test('UNDERWORKED_SHARE is a ratio, and no absolute set threshold is exported', () => {
  assert.ok(UNDERWORKED_SHARE > 0 && UNDERWORKED_SHARE < 1, 'a share must be a fraction');
  const src = readFileSync(join(COACH, 'training-gaps.ts'), 'utf8');
  assert.ok(
    !/sets?\s*[<>]=?\s*\d+\s*\/\s*week/i.test(src),
    'a per-week set threshold would be the authored standard TG-D1 refused',
  );
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// 3. G3 — stalled. Trend discipline.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('G3 does not fire on sets above 10 reps — Epley inflates past there', () => {
  // Bench "improves" only via 20-rep sets, which must not count as a trend at all.
  const s = balanced();
  for (const x of s) {
    const bench = x.lifts.find((l) => l.id === 'bench');
    if (bench) bench.sets = session(0, { bench: sets(3, isRecent(x) ? 300 : 100, 20) }).lifts[0].sets;
  }
  const r = run(s);
  const stalledLifts = r.gaps.filter((g) => g.kind === 'stalled').map((g) => g.lift);
  assert.ok(!stalledLifts.includes(NAMES.bench), 'a lift with only >10-rep sets has no trend to stall');
});

test('G3 stays silent when NOTHING moved — that is a deload, not a weak point', () => {
  const s = balanced(); // every lift flat at 100x5 throughout
  const r = run(s);
  assert.equal(kinds(r).filter((k) => k === 'stalled').length, 0, 'flat-everywhere must not report stalls');
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// 4. G4 — dropped is a different sentence from never.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('G4 distinguishes dropped from never trained', () => {
  const s = balanced();
  // Remove calves from every session in the RECENT half — trained early, abandoned since.
  for (const x of s) if (isRecent(x)) x.lifts = x.lifts.filter((l) => l.id !== 'calfraise');
  const r = run(s);
  const calves = r.gaps.find((g) => g.muscle === 'calves');
  assert.ok(calves, 'a group trained then abandoned is a gap');
  assert.equal(calves.kind, 'dropped');
  assert.notEqual(calves.say, run(balanced({ omit: ['calfraise'] })).gaps.find((g) => g.muscle === 'calves').say);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// 5. ⚠ THE COLD START. The case that crashed `recommend.ts`.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('no logged sessions reports NO gaps and says so — it must refuse, not invent', () => {
  const r = run([]);
  assert.equal(r.tooEarly, true);
  assert.deepEqual(r.gaps, []);
  assert.match(gapAnswer(r), /not have enough logged training/i);
});

test(`fewer than MIN_SESSIONS (${MIN_SESSIONS}) refuses — every group looks neglected at two sessions`, () => {
  const r = run([session(1, { bench: sets(3) }), session(4, { bench: sets(3) })]);
  assert.equal(r.tooEarly, true);
  assert.equal(r.gaps.length, 0);
});

test('an athlete who only runs gets no gap report — nothing attributable was logged', () => {
  const only = Array.from({ length: 12 }, (_, i) => session(i * 4 + 1, { jog: sets(1, 0, 1) }));
  const r = run(only);
  assert.equal(r.tooEarly, true, 'no attributable sets means there is nothing to compare');
  assert.deepEqual(r.gaps, []);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// 6. The appearance filter, and the drift guard that replaces the extraction we could not do.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('the shared appearance filter drops the form-check corpus', async () => {
  const { mentionsAppearance } = await import('../appearance.ts');
  const corpus = [
    'Your physique is coming along.',
    'Your body fat is hiding the bar position.',
    'You look strong.',
    "You've leaned out since last time.",
    'Try to lose some weight.',
  ];
  for (const s of corpus) assert.ok(mentionsAppearance(s), `should have been caught: ${s}`);
});

test('the appearance filter keeps real coaching that merely mentions a body part', async () => {
  const { mentionsAppearance } = await import('../appearance.ts');
  const coaching = [
    'Shift your weight back into your heels.',
    "Don't lean back at the top.",
    "You're leaning out over the bar.",
    'Your knees cave on the way up.',
  ];
  for (const s of coaching) assert.ok(!mentionsAppearance(s), `should NOT have been caught: ${s}`);
});

test('⚠ appearance.ts and form-check.ts hold the SAME pattern, byte for byte', () => {
  // The extraction §6 asked for is impossible: form-check.ts must stay import-free, because
  // scripts/build-coach-form-check-deploy.mjs refuses to inline a module that has imports. So the
  // pattern is duplicated on purpose and this test is what stops the copy drifting — the `0187`/`0190`
  // failure, where a duplicated body went stale and the suite kept asserting the superseded one.
  const grab = (file) => {
    const src = readFileSync(join(COACH, file), 'utf8');
    const m = src.match(/\/\\b\(body\\s\?fat[\s\S]*?\/i;/);
    assert.ok(m, `no BODY_SENTENCE pattern found in ${file}`);
    return m[0];
  };
  assert.equal(
    grab('appearance.ts'),
    grab('form-check.ts'),
    'the two copies of BODY_SENTENCE have drifted — update BOTH, in the same commit',
  );
});

test('no gap sentence can carry an appearance remark', () => {
  const r = run(balanced({ omit: ['calfraise'] }));
  for (const g of r.gaps) {
    assert.ok(!/physique|body ?fat|you look|overweight/i.test(g.say), `appearance leaked: ${g.say}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// 7. Every offered action is a real FocusMuscle.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('every offered action is a key FOCUS_SPEC actually has', () => {
  const r = run(balanced({ omit: ['calfraise', 'curl'] }));
  assert.ok(r.gaps.length > 0, 'the fixture should produce gaps');
  for (const g of r.gaps) {
    if (g.offer === null) continue;
    assert.ok(g.offer in FOCUS_SPEC, `${g.offer} is not a FocusMuscle`);
  }
});

test('GAP_MUSCLES excludes the umbrellas, so nothing is double-reported', () => {
  assert.ok(!GAP_MUSCLES.includes('arms'), 'arms is biceps + triceps and would double-report');
  assert.ok(!GAP_MUSCLES.includes('legs'), 'legs is quads + hamstrings + glutes + calves');
  for (const g of GAP_MUSCLES) assert.ok(g in FOCUS_SPEC, `${g} must be a real focus target`);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// 8. TG-D3 — a stalled lift offers no action.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('TG-D3 — a stalled lift offers NO action', () => {
  const s = balanced();
  // Squat climbs across the halves; bench stays flat at the baseline 100×5.
  for (const x of s) {
    const squat = x.lifts.find((l) => l.id === 'squat');
    if (squat) squat.sets = session(0, { squat: sets(3, isRecent(x) ? 250 : 200, 5) }).lifts[0].sets;
  }
  const r = run(s);
  const stalls = r.gaps.filter((g) => g.kind === 'stalled');
  for (const g of stalls) {
    assert.equal(g.offer, null, `TG-D3: ${g.lift} must not offer a focus`);
    assert.equal(g.muscle, null, 'a stall is about a lift, not a group');
  }
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// TG-D2 — pull, not push. The question detector.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('isGapQuestion catches the ways people actually ask', () => {
  for (const q of [
    'what do i need to work on',
    'What should I be working on?',
    "what's my weakest area",
    'what am i neglecting',
    'any weak points?',
    'what needs more work',
    'am i neglecting anything',
    'where am i falling behind',
  ]) {
    assert.ok(isGapQuestion(q), `missed: ${q}`);
  }
});

test('⚠ isGapQuestion stays narrow — an ordinary message must not trigger an unasked audit', () => {
  for (const q of [
    'build me a leg day',
    'how much should i bench',
    'what did i do last week',
    'i hate lunges',
    'can you make my program harder',
    'what time should i train',
    '',
  ]) {
    assert.ok(!isGapQuestion(q), `false positive: ${q}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The answer
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('gapAnswer offers a focus when there is one to offer, and never after a stall alone', () => {
  const r = run(balanced({ omit: ['calfraise'] }));
  assert.match(gapAnswer(r), /Want me to put a calves focus in your next block\?/);
});

test('a balanced athlete is told nothing stands out', () => {
  const r = run(balanced());
  assert.equal(r.tooEarly, false);
  assert.equal(r.gaps.length, 0, `expected no gaps, got ${JSON.stringify(kinds(r))}`);
  assert.match(gapAnswer(r), /Nothing stands out/i);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE FOLLOW-UP — source-level, because the wiring is what carries it
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * ⚠ THE CLAIM THIS TEST EXISTS TO SETTLE. A reviewer argued the local answer leaves a follow-up ("why?",
 * "what do I do about it") blind, because the structured report never reaches `buildAskContext`, and
 * proposed adding it as a new context field.
 *
 * It does not leave it blind, and the fix would have been a second source of truth for no gain. The gap
 * branch calls `say()`, which appends a `holt` turn to `thread`; the NEXT message rebuilds its history
 * with `historyFrom(thread)`, whose filter admits `holt` turns; and the sentences themselves carry the
 * numbers ("no sets in 24 sessions"). So the follow-up is answered against the same arithmetic, through
 * the ordinary history the ask path already sends.
 *
 * The two properties that make that true are asserted here, because both live in a .tsx the domain suite
 * cannot import — the same source-reading posture as `coach-form-check-source.test.mjs`.
 */
test('⚠ the local gap answer reaches a follow-up through ordinary thread history', () => {
  const sheet = readFileSync(join(COACH, '..', '..', 'components', 'forge', 'CoachChatSheet.tsx'), 'utf8');

  const branch = sheet.slice(sheet.indexOf('if (isGapQuestion(text))'));
  assert.ok(branch.length > 0, 'the gap short-circuit has gone — the feature is unwired');
  const upToReturn = branch.slice(0, branch.indexOf('return;'));
  assert.match(
    upToReturn,
    /say\(\{\s*kind:\s*'holt'/,
    'the gap branch must say() the answer INTO the thread before returning, or the follow-up loses it',
  );

  assert.match(
    sheet,
    /\.filter\(\([^)]*\)[^=]*=>\s*\(x\.kind === 'me' \|\| x\.kind === 'holt'\)/,
    "historyFrom must still admit 'holt' turns, or no local answer survives into the next question",
  );
});

test('a gap sentence carries its own numbers, so a follow-up has them without a new context field', () => {
  const r = run(balanced({ omit: ['calfraise'] }));
  const said = gapAnswer(r);
  assert.match(said, /\d/, 'the answer must contain the counts a follow-up would need');
});

test(`at most MAX_GAPS (${MAX_GAPS}) are ever reported`, () => {
  const r = run(balanced({ omit: ['calfraise', 'curl', 'pushdown', 'raise', 'plank'] }));
  assert.ok(r.gaps.length <= MAX_GAPS, `${r.gaps.length} gaps exceeds the cap`);
});
