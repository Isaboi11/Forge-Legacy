/**
 * workout-section-wiring.test.mjs — a warm-up added mid-session stays a warm-up, all the way down.
 *
 * PO (2026-09-04): *"When you do a 'build as you go workout', there's no way to do a warm up or add a
 * warm up. How do we solve this?"*
 *
 * Nothing was missing from the MODEL. `SessionExercise.section` has been `'warmup' | 'main' | 'cooldown'`
 * since W-9; `save-core.ts` has written it since the beginning; `detail-core.ts` has grouped history by
 * it. Two links in the middle were broken, and they were broken in a way no type checker can see:
 *
 *   1. The Exercise Picker had no way to SAY it, so `pickedToExercise` hard-coded `section: 'main'`.
 *      Every exercise anyone ever added mid-workout was recorded as a main lift.
 *   2. The logger never DREW it. Not once — it printed the literal string `Main lift` under every
 *      exercise name in the app, which meant a program day's prescribed warm-up was mislabelled too.
 *
 * Both are string-level wiring between a screen and an AsyncStorage payload. `tsc` is happy either way:
 * a hard-coded `'main'` is a perfectly valid `WorkoutSectionKind`, and a literal `"Main lift"` is a
 * perfectly valid `<Text>` child. Hence a source guard — same shape as `sheet-drag-wiring.test.mjs`.
 *
 * Each assertion below is the exact line that makes one link real. Delete the link and the test fails.
 *
 * Run:  node --test src/app/__tests__/workout-section-wiring.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
/** Comments explain the wiring at length; they must never be able to SATISFY a test about it. */
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const PICKER = strip(read('../exercise-picker.tsx'));
const WORKOUT = strip(read('../workout.tsx'));
const INBOX = strip(read('../../lib/exercise-inbox.ts'));
const SAVE = strip(read('../../domain/workout/save-core.ts'));

/* ── 1 · THE PICKER CAN SAY IT ───────────────────────────────────────────────────────────────────── */

test('the picker offers all three sections, not just the warm-up that was asked for', () => {
  // Two of three would leave the identical complaint waiting behind the third.
  for (const key of ['warmup', 'main', 'cooldown']) {
    assert.match(PICKER, new RegExp(`\\{ key: '${key}' as const, label: '[^']+' \\}`), `the '${key}' pill is gone`);
  }
  assert.match(PICKER, /useState<WorkoutSectionKind>\('main'\)/, 'the section chooser must default to main — the common case answers nothing');
});

test('⚠ the chooser is visible BEFORE anything is picked, or it does not answer the complaint', () => {
  // A control that only appears after you have already added the exercise leaves "there's no way to
  // add a warm up" exactly as true as it was. Gated on the MODE, never on `picked.length`.
  const row = PICKER.slice(PICKER.indexOf('styles.sectionPickRow'));
  assert.ok(row.length > 0, 'the section chooser is gone');
  const gate = PICKER.slice(0, PICKER.indexOf('styles.sectionPickRow')).lastIndexOf('{isAdd ?');
  assert.ok(gate !== -1, 'the section chooser must be gated on isAdd alone');
  const between = PICKER.slice(gate, PICKER.indexOf('styles.sectionPickRow'));
  assert.ok(!between.includes('picked.length'), 'the section chooser must not wait for a pick to appear');
});

test('the pick is written to the workout inbox, and only when it is a real decision', () => {
  assert.match(
    PICKER,
    /section: addSection === 'main' \? undefined : addSection,/,
    'the picker no longer sends the chosen section to the active workout',
  );
});

/* ── 2 · THE HAND-OFF CARRIES IT ─────────────────────────────────────────────────────────────────── */

test('the add inbox has somewhere to put it, and stays readable by an older build', () => {
  assert.match(
    INBOX,
    /kind: 'add'; items: PickedExercise\[\]; group\?: 'superset'; section\?: WorkoutSectionKind/,
    'ExerciseInbox lost its section field',
  );
  // Optional on purpose: a payload written before this existed must still drain, as 'main'.
  assert.ok(!/section: WorkoutSectionKind\b/.test(INBOX), 'section must stay optional on the inbox');
});

/* ── 3 · THE WORKOUT APPLIES IT ──────────────────────────────────────────────────────────────────── */

test('⚠ pickedToExercise no longer hard-codes main — this was the whole bug', () => {
  const from = WORKOUT.indexOf('function pickedToExercise');
  const to = WORKOUT.indexOf('function swapExercise');
  assert.ok(from !== -1 && to > from, 'pickedToExercise is gone, or no longer sits above swapExercise');
  const fn = WORKOUT.slice(from, to);
  assert.match(fn, /section: SessionExercise\['section'\] = 'main'/, 'the section is no longer a parameter');
  assert.ok(!/section: 'main',/.test(fn), "pickedToExercise is hard-coding section: 'main' again");
  // CRLF-tolerant: this repo's .tsx files are CRLF and a bare \n never matches them.
  assert.match(fn, /\r?\n {4}section,\r?\n/, 'the built exercise does not carry the passed section');
  // The cardio branch returns early — it has to be told too, or a run added as a warm-up is a main lift.
  assert.match(fn, /cardioExercise\(picked, position, \{ section,/, 'the cardio branch drops the section');
});

test('the drain passes the inbox section through, defaulting to main', () => {
  assert.match(WORKOUT, /const addedSection = inbox\.section \?\? 'main';/, 'the drain ignores the inbox section');
  assert.match(
    WORKOUT,
    /pickedToExercise\(p, pos \+ i, addedSection\)/,
    'the drain builds the exercise without the section it just read',
  );
});

test('⚠ swapping a warm-up for something else leaves it a warm-up', () => {
  /* `swapExercise` has two branches and they used to disagree. The ordinary one spreads `...ex` and
     keeps everything; the one that fires when the KIND changes (a run swapped for a lift, or back)
     rebuilds the slot through `pickedToExercise` and so took its 'main' default. A prescribed warm-up
     jog swapped for a stretch was filed as a main lift. One action, one answer. */
  const fn = WORKOUT.slice(WORKOUT.indexOf('function swapExercise'), WORKOUT.indexOf('const styles ='));
  assert.ok(fn.length > 0, 'swapExercise is gone');
  assert.match(fn, /pickedToExercise\(p, ex\.position, ex\.section\)/, 'the kind-change swap drops the section again');
  assert.match(fn, /\r?\n {4}\.\.\.ex,\r?\n/, 'the ordinary swap no longer carries the old slot forward');
});

test('a warm-up opens with a warm-up’s volume, not a main lift’s', () => {
  assert.match(
    WORKOUT,
    /const AD_HOC_SETS: Record<SessionExercise\['section'\], number> = \{ warmup: 2, main: 3, cooldown: 1 \};/,
    'the per-section set table changed — intended, but say so here too',
  );
  assert.match(WORKOUT, /length: AD_HOC_SETS\[section\]/, 'the set count is not reading the table');
});

/* ── 4 · THE LOGGER DRAWS IT ─────────────────────────────────────────────────────────────────────── */

test('⚠ the hero no longer calls every exercise in the app a main lift', () => {
  /* The literal string IS the regression — it was printed under warm-ups, cool-downs and stretches
     alike. So the assertion is not "the one-line JSX form is gone" (which a reformat would sneak past,
     as this test's own first draft proved) but "the phrase exists in exactly one place in this file,
     and that place is the lookup table". Comments are already stripped, so the three that discuss it
     do not count. */
  const hits = WORKOUT.split('Main lift').length - 1;
  assert.equal(hits, 1, `"Main lift" appears ${hits}× — it belongs only in SECTION_LABEL`);
  assert.match(WORKOUT, /main: 'Main lift',/, 'the one survivor must be the SECTION_LABEL entry');
  assert.match(WORKOUT, /\{SECTION_LABEL\[ex\.section\]\}/, 'the hero does not read the section');
});

test('both hero faces say it, because the hero collapses itself', () => {
  // The expanded card auto-collapses the moment the first set resolves, so a label that lives only
  // there is invisible for most of the exercise. Same rule the plan cue already follows.
  const strip_ = WORKOUT.slice(WORKOUT.indexOf('styles.heroStripText'), WORKOUT.indexOf('styles.heroStripMeta'));
  assert.match(strip_, /styles\.heroStripSection.*SECTION_LABEL\[ex\.section\]/s, 'the collapsed strip lost the section');
});

test('the plan, the peek and the toast all name it', () => {
  // The Overview is the one screen that shows the whole session at once — its own comment says it is
  // "where you actually notice that today has three warm-ups", which it could not previously tell you.
  assert.match(WORKOUT, /\$\{SECTION_LABEL\[e\.section\]\} · /, 'the Overview row dropped the section');
  assert.match(WORKOUT, /SECTION_LABEL\[ex\.section\]\} · \$\{progress\}/, 'the pager peek dropped the section');
  assert.match(WORKOUT, /const addedNoun = SECTION_NOUN\[addedSection\];/, 'the add toast no longer says what landed');
});

test('main stays unlabelled everywhere — an accent on the default means nothing', () => {
  // Four exercises in five are main lifts. Labelling those is furniture; labelling the exception is
  // information. Every display site guards on `!== 'main'` or maps through SECTION_LABEL's own 'main'.
  assert.match(WORKOUT, /ex\.section !== 'main' && styles\.heroEquipSection/, 'the hero tints the default section');
  assert.match(WORKOUT, /\{ex\.section !== 'main' \? \(/, 'the collapsed strip labels main lifts');
  assert.match(WORKOUT, /ex\.section === 'main' \? progress :/, 'the peek labels main lifts');
});

/* ── 5 · AND IT SURVIVES FINISH ──────────────────────────────────────────────────────────────────── */

test('the section reaches save_workout, so a warm-up is a warm-up in history too', () => {
  // Already true before this change and guarded here because the whole feature is worthless without it:
  // `detail-core.ts` groups a saved workout by section, so this column is what makes the label persist.
  assert.match(SAVE, /\r?\n {4}section: ex\.section,\r?\n/, 'buildSaveExercises dropped the section column');
});
