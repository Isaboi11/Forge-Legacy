import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  ASK_COACHING_MAX,
  buildAskContext,
  coachingText,
  findExerciseMentions,
  isWhyQuestion,
  programSummary,
} from '../ask-context.ts';
import { HIDDEN_EXERCISE_IDS } from '../../exercise-picker/catalog-core.ts';

/*
 * THE REAL INPUTS, read as data — `data.ts` and the coaching service import JSON in a way `node --test`
 * cannot load. The catalogue is the VISIBLE one (hidden rows filtered, as `PICKER_DB` does), and the
 * coaching lookup serves Published records only, projected the way `integration.ts` projects them.
 */
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(process.cwd(), rel), 'utf8'));
const raw = readJson('src/domain/exercise-relationships/source/exercises.json');
const ROWS = Array.isArray(raw) ? raw : (raw.exercises ?? []);
const CATALOG = ROWS.filter((r) => !HIDDEN_EXERCISE_IDS.has(r.id)).map((r) => ({
  key: r.id,
  name: r.name,
  aliases: r.aliases ?? [],
}));
const RECORDS = new Map(readJson('src/domain/exercise-coaching/content/coaching_content.json').map((r) => [r.exerciseId, r]));
const coachingFor = (key) => {
  const r = RECORDS.get(key);
  if (!r || r.contentStatus !== 'Published') return null;
  return {
    whyItMatters: r.whyItMatters,
    instructions: [...r.setupInstructions, ...r.executionSteps],
    tips: r.cueHierarchy.length ? r.cueHierarchy : r.coachingTips,
    commonMistakes: r.commonMistakes,
    safetyNotes: r.safetyNotes,
  };
};
const SOURCES = { catalog: CATALOG, coachingFor };
const names = (q) => findExerciseMentions(q, CATALOG).map((m) => m.name);

test('the inputs are the real ones', () => {
  assert.ok(CATALOG.length > 700, `catalogue: ${CATALOG.length}`);
  const published = [...RECORDS.values()].filter((r) => r.contentStatus === 'Published').length;
  assert.ok(published > 700, `published coaching records: ${published}`);
});

// ── Names in a sentence ──────────────────────────────────────────────────────────────────────────────

test('abbreviations, including their plural: "RDL", "RDLs"', () => {
  assert.deepEqual(names('how do I keep my back flat on RDL'), ['Barbell Romanian Deadlift']);
  assert.deepEqual(names('how do I stop my back rounding on RDLs?'), ['Barbell Romanian Deadlift']);
});

test('full names and plurals: "romanian deadlift", "skull crushers", "lat pulldowns"', () => {
  assert.deepEqual(names('romanian deadlift form tips'), ['Barbell Romanian Deadlift']);
  assert.deepEqual(names('are skull crushers bad for elbows'), ['Barbell Skull Crusher']);
  assert.deepEqual(names('lat pulldowns vs pullups'), ['Cable Lat Pulldown', 'Pull-Up']);
});

test('a one-letter typo is forgiven — but never by changing the first letter', () => {
  assert.deepEqual(names('my deadlfit form breaks down'), ['Barbell Deadlift']);
  // "rounding" is a single edit from "bounding" — a different word, not a typo.
  assert.ok(!names('my back keeps rounding').includes('Bounding'));
});

test('two lifts joined by "or"/"and"/a comma stay two lifts', () => {
  assert.deepEqual(names('bench press or incline dumbbell press for chest'), [
    'Barbell Bench Press',
    'Dumbbell Incline Bench Press',
  ]);
  assert.deepEqual(names('tips for pull ups and dips'), ['Pull-Up', 'Parallel Bar Dip']);
  // "bigger arms, curls" is not a single-arm curl.
  assert.ok(!names('I want bigger arms, curls every day?').some((n) => /single-arm/i.test(n)));
});

test('ordinary sentences name nothing', () => {
  for (const q of ['how many sets should I do per week', 'is running bad for gains', 'I feel lazy today', 'why is my back sore']) {
    assert.deepEqual(names(q), [], q);
  }
});

test('at most three, in the order they were said', () => {
  const m = names('bench press, romanian deadlift, pull ups, skull crushers and planks');
  assert.equal(m.length, ASK_COACHING_MAX);
  assert.deepEqual(m, ['Barbell Bench Press', 'Barbell Romanian Deadlift', 'Pull-Up']);
});

test('it is quick enough to run on every message', () => {
  const t = performance.now();
  for (let i = 0; i < 20; i += 1) findExerciseMentions('should I do bench press or incline dumbbell press before my romanian deadlifts on leg day', CATALOG);
  const per = (performance.now() - t) / 20;
  /*
   * ⚠ A CEILING, NOT A BENCHMARK. It guards "this is a scan, not a second" — 12 ms per question on this
   * machine alone. It ran at 85 ms inside the full suite, where a few dozen test files share the CPU, and a
   * guard that goes red on a busy machine is one people learn to re-run rather than read. 250 ms still
   * catches the regression it exists for (a scan that became quadratic, or one that started reading a file).
   */
  assert.ok(per < 250, `${per.toFixed(1)} ms per question`);
});

// ── Coaching records ─────────────────────────────────────────────────────────────────────────────────

test('an exercise question carries the published coaching record, trimmed', () => {
  const ctx = buildAskContext({ question: 'how do I stop my back rounding on RDLs?' }, SOURCES);
  assert.equal(ctx.coaching?.length, 1);
  assert.equal(ctx.coaching[0].name, 'Barbell Romanian Deadlift');
  assert.match(ctx.coaching[0].text, /^Cues: /);
  assert.ok(ctx.coaching[0].text.length <= 420, `${ctx.coaching[0].text.length} chars`);
  // The record's own words, not invented ones.
  const rec = coachingFor('barbell-romanian-deadlift');
  assert.ok(ctx.coaching[0].text.includes(rec.tips[0]));
});

test('an exercise with no published record contributes nothing (never a draft)', () => {
  const unpublished = [...RECORDS.values()].find((r) => r.contentStatus !== 'Published' && CATALOG.some((c) => c.key === r.exerciseId));
  assert.ok(unpublished, 'expected at least one unpublished record in the visible catalogue');
  const entry = CATALOG.find((c) => c.key === unpublished.exerciseId);
  const ctx = buildAskContext({ question: `how do I do the ${entry.name}` }, { catalog: [entry], coachingFor });
  assert.equal(ctx.coaching, undefined);
});

test('a follow-up without a name uses the lift from earlier in THIS conversation', () => {
  const ctx = buildAskContext(
    {
      question: 'and what about my grip?',
      history: [
        { role: 'athlete', text: 'how deep should I go on skull crushers' },
        { role: 'holt', text: 'Lower until the bar is just above your forehead.' },
      ],
    },
    SOURCES,
  );
  assert.deepEqual(ctx.coaching?.map((c) => c.name), ['Barbell Skull Crusher']);
});

test('coachingText keeps the most important cue first and stays within budget', () => {
  const text = coachingText({
    whyItMatters: 'Builds the hinge. It also does other things.',
    instructions: ['Stand tall.', 'Soft knees.'],
    tips: ['Push the hips back.', 'Bar close.', 'Neutral spine.', 'Fourth cue.'],
    commonMistakes: ['Rounding.', 'Squatting it.'],
    safetyNotes: [],
  });
  assert.ok(text.startsWith('Cues: Push the hips back. Bar close. Neutral spine.'));
  assert.ok(!text.includes('Fourth cue'));
  assert.ok(text.includes('Why: Builds the hinge.') && !text.includes('other things'));
});

// ── Program and rationale ────────────────────────────────────────────────────────────────────────────

const PROGRAM = {
  name: 'Strength Block',
  weeks: 8,
  daysPerWeek: 4,
  vary: false,
  weekPlans: null,
  days: [
    { letter: 'A', name: 'Upper A', warmup: [], main: [{ name: 'Barbell Bench Press', catalogKey: 'barbell-bench-press', sets: 4, reps: 6 }], cooldown: [] },
    { letter: 'B', name: 'Lower A', warmup: [], main: [{ name: 'Barbell Romanian Deadlift', catalogKey: 'barbell-romanian-deadlift', sets: 3, reps: 8 }], cooldown: [] },
  ],
};

test('the program is one short line: name, week N of M, today', () => {
  assert.equal(
    programSummary({ structure: PROGRAM, week: 3, today: ['Upper A'] }),
    'Strength Block — week 3 of 8, 4 days a week. Today: Upper A.',
  );
  assert.equal(programSummary({ structure: PROGRAM }), 'Strength Block — 8 weeks, 4 days a week.');
});

test('"why" questions get the rationale and where the lift sits; other questions do not', () => {
  const why = buildAskContext(
    { question: 'why are RDLs in my plan?', program: { structure: PROGRAM, week: 2 }, rationale: 'Four days gives us frequency.' },
    SOURCES,
  );
  assert.equal(why.rationale, 'Four days gives us frequency. Barbell Romanian Deadlift is on Lower A, 3×8.');
  assert.match(why.program ?? '', /^Strength Block — week 2 of 8/);

  const how = buildAskContext(
    { question: 'how do I brace for RDLs?', program: { structure: PROGRAM, week: 2 }, rationale: 'Four days gives us frequency.' },
    SOURCES,
  );
  assert.equal(how.rationale, undefined);
});

test('the rationale can be derived from the rulebook inputs', () => {
  const ctx = buildAskContext(
    {
      question: "what's the point of the deload week?",
      rationale: { goal: 'strength', daysPerWeek: 4, sessionMinutes: 60, weeks: 8, splitStyle: null, deloadWeeks: [3] },
    },
    SOURCES,
  );
  assert.match(ctx.rationale ?? '', /Week 4 backs off deliberately/);
});

test('isWhyQuestion', () => {
  for (const q of ['why is X in my plan', 'How come I only squat once?', "what's the point of this", 'explain my program']) assert.ok(isWhyQuestion(q), q);
  for (const q of ['how do I brace', 'what weight should I use']) assert.ok(!isWhyQuestion(q), q);
});

test('the whole context stays small — a few hundred tokens', () => {
  const ctx = buildAskContext(
    {
      question: 'why is bench press, romanian deadlift and pull ups all in my plan?',
      program: { structure: PROGRAM, week: 3, today: ['Upper A'] },
      rationale: 'Four days gives us enough frequency to train every major muscle group twice a week without cramming a session.',
    },
    SOURCES,
  );
  const chars = JSON.stringify(ctx).length;
  assert.ok(chars < 2000, `${chars} chars ≈ ${Math.round(chars / 4)} tokens`);
  assert.equal(ctx.coaching?.length, 3);
});

test('an empty question builds an empty context, not a throw', () => {
  assert.deepEqual(buildAskContext({ question: '' }, SOURCES), {});
});
