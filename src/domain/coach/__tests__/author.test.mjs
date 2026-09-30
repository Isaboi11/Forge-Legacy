/**
 * author.test.mjs — Holt writes a typed session himself, and the app decides whether it stands.
 *
 * Coach-AI-Amendment-003 (PO, 2026-09-30): *"I need the coach holt to read and listen to everything I type
 * and build a custom program to what I'm telling him."* The model now chooses the movements for a typed ask.
 * These tests hold the other half of that sentence: nothing he writes reaches a card without passing the
 * catalogue, the athlete's kit, their level and their limitations — in code, not in the prompt.
 *
 * ⚠ NO TEST HERE CALLS A MODEL. What the model actually writes for a given sentence is measured live
 * (`Live AI tests spend real money`); what the app does with whatever comes back is proven here.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/author.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildPickerDb } from '../../exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../home-gym/equipment.ts';
import {
  AUTHOR_SCHEMA,
  authoredIsWhole,
  authorFallbackLine,
  authorResultFrom,
  authorUserTurn,
  movementsFor,
  narrowAuthorRequest,
  sanitizeAuthored,
} from '../author.ts';
import { AUTHOR_CATALOGUE, AUTHOR_CATALOGUE_COUNT } from '../author-catalogue.ts';
import { authoredLine, authorFacts, droppedLine, validateAuthored } from '../author-validate.ts';
import { writtenDayCardFor } from '../chat-core.ts';
import { authorCatalogueSource, OUT } from '../../../../scripts/build-author-catalogue.mjs';
import { buildCoachAuthorDeploy, DEPLOY_COPY } from '../../../../scripts/build-coach-author-deploy.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '../../../..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const src = (f) => JSON.parse(readFileSync(path.join(here, '../../exercise-relationships/source', f), 'utf8'));

const POOL = buildPickerDb({
  exercises: src('exercises.json'),
  exerciseMuscles: src('exercise_muscles.json'),
  muscles: src('muscles.json'),
  equipment: src('equipment.json'),
});

/** Verbatim, as it arrived on the PO's phone. */
const SAID =
  "I'm working out chest and tries today. I have about an hour. I really want to develop my upper chest and I'm usually trying to do about two tricep workouts and then the rest as a chest workout. Give me an hour to an hour 15 minute workout.";

const PO = { experience: 'advanced', environment: 'full_gym', ownedEquipment: [], limitations: [] };

const ex = (key, sets = 4, reps = 10, more = {}) => ({ key, sets, reps, repsTo: 0, seconds: 0, group: '', part: 'main', note: '', ...more });
/** The session that sentence asks for, as the model would hand it back. */
const ASKED = {
  say: 'Upper chest leads with two inclines and a low-to-high fly, and triceps is held to two.',
  title: 'Chest & Triceps',
  days: [
    {
      name: 'Chest & Triceps',
      exercises: [
        ex('barbell-incline-bench-press', 4, 6, { note: '30-degree incline' }),
        ex('dumbbell-incline-bench-press', 4, 8),
        ex('barbell-bench-press', 3, 8),
        ex('low-to-high-cable-fly', 3, 12),
        ex('cable-triceps-pushdown', 3, 12),
        ex('dumbbell-skull-crusher', 3, 12),
      ],
    },
  ],
  unmet: [],
};
const plan = (exercises, more = {}) => ({ say: 'Done.', title: 'Session', days: [{ name: 'Session', exercises }], unmet: [], ...more });

// ─────────────────────────────────────────────────────────────────────────────
// WHAT HE IS GIVEN
// ─────────────────────────────────────────────────────────────────────────────

test('the catalogue in the prompt is the catalogue the app shows, and is current', async () => {
  assert.equal(read(OUT), (await authorCatalogueSource()).replace(/\r\n/g, '\n'), 'run `node --experimental-strip-types scripts/build-author-catalogue.mjs`');
  const keys = AUTHOR_CATALOGUE.split('\n').filter((l) => l.includes(': ')).flatMap((l) => l.split(': ')[1].split(' ')).map((k) => k.replace(/[*^]+$/, ''));
  assert.equal(keys.length, POOL.length);
  assert.equal(AUTHOR_CATALOGUE_COUNT, POOL.length);
  assert.deepEqual([...keys].sort(), POOL.map((e) => e.key).sort(), 'every visible movement, and nothing the app withholds');
  assert.ok(POOL.length < src('exercises.json').length, 'the pool must stay smaller than the raw file');
});

test('the dashboard paste copy is current, self-contained, and small enough to paste', () => {
  const copy = read(DEPLOY_COPY);
  assert.equal(copy, buildCoachAuthorDeploy(), 'run `node scripts/build-coach-author-deploy.mjs`');
  assert.ok(!copy.includes("'../../../src/"), 'an import from src/ was not inlined');
  // coach-ask's paste copy is 128 KB and goes into the dashboard editor whole; stay well under it.
  assert.ok(new TextEncoder().encode(copy).length < 100_000, `paste copy is ${new TextEncoder().encode(copy).length} bytes`);
});

test('⛔ the function guards before it spends, answers the browser preflight, and caches the catalogue', () => {
  const fn = read('supabase/functions/coach-author/index.ts');
  assert.ok(fn.indexOf('medicalRoute(line)') < fn.indexOf("rpc('coach_ai_spend_credits'"), 'the medical guard runs before the credit');
  assert.ok(fn.indexOf("rpc('coach_ai_spend_credits'") < fn.indexOf('api.anthropic.com'), 'the credit is reserved before the model is called');
  assert.match(fn, /req\.method === 'OPTIONS'/);
  assert.match(fn, /cache_control: \{ type: 'ephemeral' \}/);
  assert.match(fn, /\$\{AUTHOR_CATALOGUE\}/);
  // Nothing per-request in the cached block.
  const system = fn.slice(fn.indexOf('const SYSTEM = `'), fn.indexOf('const json ='));
  assert.ok(!/\$\{(?!AUTHOR_CATALOGUE\})/.test(system), 'the system block interpolates something other than the catalogue');
});

test('⛔ there is no field he could write a load in', () => {
  const fields = JSON.stringify(AUTHOR_SCHEMA).toLowerCase();
  for (const banned of ['weight', 'load', 'percent', 'rpe', 'lbs', 'kg']) assert.ok(!fields.includes(`"${banned}`), `the schema has a "${banned}" field`);
  assert.deepEqual(AUTHOR_SCHEMA.properties.days.items.properties.exercises.items.required, ['key', 'sets', 'reps', 'repsTo', 'seconds', 'group', 'part', 'note']);
});

test('the request is narrowed, and the newest words are the ones kept', () => {
  const r = narrowAuthorRequest({
    kind: 'banana',
    said: ['1', '2', '3', '4', '5', '6', '7', 42, '  '],
    minutes: 'sixty',
    days: 9,
    goal: 'run_marathon',
    level: 'expert',
    room: 'outdoor',
    canUse: ['barbell', 'barbell', 7],
    notes: Array.from({ length: 30 }, (_, i) => `note ${i}`),
  });
  assert.equal(r.kind, 'day');
  assert.deepEqual(r.said, ['2', '3', '4', '5', '6', '7']);
  assert.deepEqual([r.minutes, r.days, r.goal, r.level, r.room], [null, null, null, null, null]);
  assert.deepEqual(r.canUse, ['barbell']);
  assert.equal(r.notes.length, 20);
});

test('⚠ the real sentence reaches him whole, with what the app knows beside it', () => {
  const facts = authorFacts(PO, POOL, canDoExercise);
  const turn = authorUserTurn(
    narrowAuthorRequest({ kind: 'day', said: [SAID], minutes: 60, goal: null, level: 'advanced', room: 'full_gym', ...facts, recent: ['barbell-bench-press'] }),
  );
  assert.ok(turn.includes(SAID), 'every word they said');
  assert.match(turn, /Write ONE training session\./);
  assert.match(turn, /60 minutes — about 6 movements/);
  assert.match(turn, /Goal: not given\. Read it from their words/);
  assert.match(turn, /prefer something else unless they asked for it by name: barbell-bench-press/);
  assert.ok(facts.canUse.includes('barbell') && facts.canUse.includes('cable'));
});

test('what he is told about the athlete comes from the tables that then check him', () => {
  const bare = authorFacts({ ...PO, environment: 'bodyweight' }, POOL, canDoExercise).canUse;
  assert.ok(bare.includes('bodyweight') && !bare.includes('barbell') && !bare.includes('dumbbell'), `bodyweight only: ${bare}`);
  const hurt = authorFacts({ ...PO, limitations: ['no_overhead'] }, POOL, canDoExercise);
  assert.ok(hurt.offPatterns.includes('Vertical Push'), `overhead work is off: ${hurt.offPatterns}`);
  assert.deepEqual(authorFacts(PO, POOL, canDoExercise).offPatterns, []);
  assert.equal(movementsFor(30), 4);
  assert.equal(movementsFor(75), 8);
});

// ─────────────────────────────────────────────────────────────────────────────
// WHAT HE HANDS BACK
// ─────────────────────────────────────────────────────────────────────────────

test('the reply is cut to shape: junk keys out, marks stripped, one day for a day', () => {
  const p = sanitizeAuthored(
    {
      say: 'x'.repeat(900),
      title: 'T',
      days: [
        { name: 'A', exercises: [ex('Barbell-Bench-Press*'), ex('muscle-up^'), ex('DROP TABLE'), { key: 5 }, ex('plank', 3, 0, { seconds: 45 })] },
        { name: 'B', exercises: [ex('push-up')] },
      ],
      unmet: ['There is no landmine press in the app.', 'b', 'c', 'd', 'x'.repeat(300)],
      weight: 225,
    },
    'day',
  );
  assert.equal(p.days.length, 1);
  assert.deepEqual(p.days[0].exercises.map((e) => e.key), ['barbell-bench-press', 'muscle-up', 'plank']);
  assert.equal(p.say.length, 320);
  assert.deepEqual(p.unmet, ['There is no landmine press in the app.', 'b', 'c'], 'three at most, and an over-long one is dropped whole, never cut');
  assert.equal('weight' in p, false);
  assert.equal(sanitizeAuthored({ days: [] }, 'day'), null);
  assert.equal(sanitizeAuthored('nope', 'day'), null);
  assert.equal(sanitizeAuthored({ days: Array.from({ length: 9 }, () => ({ name: 'D', exercises: [ex('push-up')] })) }, 'program').days.length, 7);
});

// ─────────────────────────────────────────────────────────────────────────────
// WHETHER IT STANDS
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ the session the PO asked for goes onto the card exactly as written', () => {
  const v = validateAuthored(ASKED, PO, POOL, canDoExercise);
  assert.deepEqual(v.dropped, []);
  assert.deepEqual(
    v.days[0].main.map((m) => `${m.name} ${m.sets}x${m.reps}`),
    [
      'Barbell Incline Bench Press 4x6',
      'Dumbbell Incline Bench Press 4x8',
      'Barbell Bench Press 3x8',
      'Low-to-High Cable Fly 3x12',
      'Cable Triceps Pushdown 3x12',
      'Dumbbell Skull Crusher 3x12',
    ],
  );
  assert.equal(v.days[0].main[0].coachNote, '30-degree incline');
  assert.equal(v.days[0].name, 'Chest & Triceps');
  assert.equal(v.days[0].letter, 'A');
  // Nothing was dropped, so his own sentence stands.
  assert.equal(authoredLine(ASKED, v), ASKED.say);
  for (const m of v.days[0].main) for (const banned of ['weight', 'percentOfMax', 'percentScheme']) assert.equal(banned in m, false);
});

test('⛔ a movement that is not in the library never reaches the card, and he says so', () => {
  const v = validateAuthored(plan([ex('landmine-unicorn-press'), ex('barbell-bench-press'), ex('push-up'), ex('cable-triceps-pushdown')]), PO, POOL, canDoExercise);
  assert.deepEqual(v.days[0].main.map((m) => m.catalogKey), ['barbell-bench-press', 'push-up', 'cable-triceps-pushdown']);
  assert.deepEqual(v.dropped, [{ name: 'landmine unicorn press', why: 'unknown' }]);
  assert.match(authoredLine(plan([]), v), /^Here's what I wrote for that\. I left out landmine unicorn press: it isn't in the exercise library\.$/);
});

test('⛔ kit: a bodyweight athlete is never handed a barbell, whatever he wrote', () => {
  const v = validateAuthored(plan([ex('barbell-bench-press'), ex('push-up'), ex('decline-push-up'), ex('close-grip-push-up')]), { ...PO, environment: 'bodyweight' }, POOL, canDoExercise);
  assert.deepEqual(v.dropped, [{ name: 'Barbell Bench Press', why: 'gear' }]);
  for (const m of v.days[0].main) assert.ok(canDoExercise(POOL.find((e) => e.key === m.catalogKey), []));
});

test('⛔ limitations: what they said to work around is out, and named (CA-D12 — never silently)', () => {
  const v = validateAuthored(
    plan([ex('barbell-overhead-press'), ex('barbell-bench-press'), ex('dumbbell-bench-press'), ex('cable-triceps-pushdown')]),
    { ...PO, limitations: ['no_overhead'] },
    POOL,
    canDoExercise,
  );
  assert.ok(!v.days[0].main.some((m) => m.catalogKey === 'barbell-overhead-press'));
  assert.deepEqual(v.dropped, [{ name: 'Barbell Overhead Press', why: 'limit' }]);
  assert.match(droppedLine(v.dropped), /because of what you told me to work around/);
});

test('⛔ what they said to leave out stays out', () => {
  const v = validateAuthored(plan([ex('barbell-bench-press'), ex('push-up'), ex('dumbbell-bench-press'), ex('machine-chest-press')]), { ...PO, excludeExercises: ['push-up'] }, POOL, canDoExercise);
  assert.ok(!v.days[0].main.some((m) => m.catalogKey === 'push-up'));
});

test('⛔ level: the advanced tier is not handed to a beginner', () => {
  const rest = [ex('barbell-bench-press'), ex('push-up'), ex('cable-triceps-pushdown')];
  // An advanced movement the PO's own gym and level would be allowed — found by asking the validator itself.
  const advanced = POOL.filter((e) => e.difficulty === 'Advanced').find(
    (e) => validateAuthored(plan([ex(e.key), ...rest]), PO, POOL, canDoExercise)?.dropped.length === 0,
  );
  assert.ok(advanced, 'the catalogue has an advanced movement a full gym can do');
  const v = validateAuthored(plan([ex(advanced.key), ...rest]), { ...PO, experience: 'beginner' }, POOL, canDoExercise);
  assert.deepEqual(v.dropped, [{ name: advanced.name, why: 'level' }]);
});

test('⚠ a plan the drops leave too thin is refused whole, so the rulebook builds instead', () => {
  assert.equal(validateAuthored(plan([ex('barbell-bench-press'), ex('dumbbell-bench-press'), ex('push-up')]), { ...PO, environment: 'bodyweight' }, POOL, canDoExercise), null);
  assert.equal(validateAuthored(plan([ex('nope-one'), ex('nope-two'), ex('nope-three')]), PO, POOL, canDoExercise), null);
});

test('numbers out of range are replaced by the plain default, a hold is held, a repeat is written once', () => {
  const v = validateAuthored(
    plan([ex('barbell-bench-press', 40, 900), ex('barbell-bench-press', 3, 8), ex('plank', 3, 12, { seconds: 45 }), ex('side-plank', 3, 0), ex('push-up', 0, 0)]),
    PO,
    POOL,
    canDoExercise,
  );
  const [bench, plank, side, push] = v.days[0].main;
  assert.equal(v.days[0].main.length, 4, 'the second bench press is the same movement');
  assert.deepEqual([bench.sets, bench.reps], [3, 10]);
  assert.deepEqual([plank.sets, plank.durationSec, plank.reps], [3, 45, undefined]);
  assert.equal(side.durationSec, 30);
  assert.deepEqual([push.sets, push.reps], [3, 10]);
});

test('⛔ a cue or a line of his that reads as medical is cut', () => {
  const p = plan([ex('barbell-bench-press', 3, 8, { note: 'stop if your shoulder hurts' }), ex('push-up'), ex('dumbbell-bench-press')], {
    say: 'This one is easy on your injured shoulder.',
    unmet: ['skipped dips because of your shoulder pain', 'no landmine press'],
  });
  const v = validateAuthored(p, PO, POOL, canDoExercise);
  assert.equal('coachNote' in v.days[0].main[0], false);
  assert.equal(authoredLine(p, v), "Here's what I wrote for that. What I couldn't do: no landmine press.");
});

test('a week: each day is checked, lettered and named', () => {
  const p = sanitizeAuthored(
    {
      say: 'Push, pull, legs.',
      title: 'Three Day Split',
      days: [
        { name: 'Push', exercises: [ex('barbell-bench-press'), ex('barbell-overhead-press'), ex('cable-triceps-pushdown')] },
        { name: '', exercises: [ex('barbell-bent-over-row'), ex('cable-lat-pulldown'), ex('barbell-biceps-curl')] },
        { name: 'Legs', exercises: [ex('barbell-back-squat'), ex('barbell-romanian-deadlift'), ex('barbell-calf-raise')] },
      ],
      unmet: [],
    },
    'program',
  );
  const v = validateAuthored(p, PO, POOL, canDoExercise);
  assert.deepEqual(v.days.map((d) => `${d.letter} ${d.name}`), ['A Push', 'B Day 2', 'C Legs']);
  assert.equal(v.title, 'Three Day Split');
});

// ─────────────────────────────────────────────────────────────────────────────
// THE WIRE
// ─────────────────────────────────────────────────────────────────────────────

test('an outage is never a refusal, and every fallback has words that say the rulebook built it', () => {
  assert.equal(authorResultFrom({ ok: true, plan: ASKED, remaining: 12 }, 'day').kind, 'ok');
  assert.equal(authorResultFrom({ ok: true, plan: { days: [] } }, 'day').kind, 'none');
  assert.deepEqual(authorResultFrom({ ok: false, reason: 'stop', route: 'urgent' }, 'day'), { kind: 'stop', route: 'urgent' });
  assert.deepEqual(authorResultFrom({ ok: false, reason: 'stop', route: '???' }, 'day'), { kind: 'stop', route: 'medical' });
  assert.equal(authorResultFrom({ ok: false, reason: 'out_of_credits', allowance: 200 }, 'day').kind, 'out_of_credits');
  assert.equal(authorResultFrom({ ok: false, reason: 'out_of_credits', allowance: 0 }, 'day').kind, 'not_entitled');
  assert.equal(authorResultFrom({ ok: false, reason: 'upstream_error' }, 'day').kind, 'unavailable');
  assert.equal(authorResultFrom(null, 'day').kind, 'unavailable');
  for (const kind of ['none', 'out_of_credits', 'not_entitled', 'unavailable', 'offline']) {
    assert.match(authorFallbackLine({ kind }), /rulebook/);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// WHAT THE LIVE RUNS TAUGHT (2026-09-30, `scripts/holt-corpus/author-live.mjs`)
// ─────────────────────────────────────────────────────────────────────────────

test("⚠ a misspelled key is read as the movement it names, by the app's own resolver", () => {
  // All four came back from the live model; each used to cost the athlete a slot.
  const v = validateAuthored(plan([ex('incline-dumbbell-bench-press'), ex('dips'), ex('leg-press-machine'), ex('dumbbell-shoulder-press')]), PO, POOL, canDoExercise);
  assert.deepEqual(v.dropped, []);
  assert.deepEqual(v.days[0].main.map((m) => m.catalogKey), ['dumbbell-incline-bench-press', 'parallel-bar-dip', 'machine-leg-press', 'seated-dumbbell-shoulder-press']);
  // …and a name nothing answers to is still dropped, never guessed at.
  assert.equal(validateAuthored(plan([ex('weighted-pull-up-placeholder'), ex('push-up'), ex('pull-up'), ex('plank', 3, 0, { seconds: 30 })]), PO, POOL, canDoExercise).dropped[0].why, 'unknown');
});

test('a range he wrote is a range on the card; a single number stays one', () => {
  const v = validateAuthored(plan([ex('cable-biceps-curl', 3, 15, { repsTo: 20 }), ex('barbell-back-squat', 5, 5), ex('push-up', 3, 12, { repsTo: 8 })]), PO, POOL, canDoExercise);
  const [curl, squat, push] = v.days[0].main;
  assert.deepEqual([curl.reps, curl.repsMax], [15, 20]);
  assert.equal('repsMax' in squat, false);
  assert.equal('repsMax' in push, false, 'a top below the bottom is not a range');
});

test('supersets and circuits become the block the logger already runs', () => {
  const g = (key, group, sets = 3) => ex(key, sets, 10, { group });
  const v = validateAuthored(
    plan([g('barbell-bench-press', 'A', 4), g('barbell-bent-over-row', 'A'), g('cable-crossover', 'B'), g('cable-seated-row', 'B'), g('push-up', 'C'), ex('plank', 3, 0, { seconds: 30 })]),
    PO,
    POOL,
    canDoExercise,
  );
  const [a1, a2, b1, b2, alone, plank] = v.days[0].main;
  assert.equal(a1.groupId, a2.groupId);
  assert.notEqual(a1.groupId, b1.groupId);
  assert.equal(b1.groupId, b2.groupId);
  assert.deepEqual([a1.groupKind, a1.groupName, a1.groupRounds, a1.groupCapSec], ['superset', 'Superset', 4, null], "rounds are the longest member's sets, the logger's rule");
  assert.equal(alone.groupId, undefined, 'one movement with a letter of its own is just a movement');
  assert.equal(plank.groupId, undefined);
  const circuit = validateAuthored(plan(['push-up', 'bodyweight-squat', 'pull-up', 'glute-bridge', 'burpee'].map((k) => g(k, 'A'))), PO, POOL, canDoExercise);
  assert.ok(circuit.days[0].main.every((m) => m.groupKind === 'circuit' && m.groupName === 'Circuit'));
  // The card letters them the way a coach writes them.
  assert.deepEqual(writtenDayCardFor({}, v.days[0]).rows.map((r) => r.name.slice(0, 5)), ['A1 · ', 'A2 · ', 'B1 · ', 'B2 · ', 'Push-', 'Plank']);
});

test('a warm-up and a cool-down go in their own sections and do not count as the session', () => {
  const v = validateAuthored(
    plan([ex('cat-cow', 1, 10, { part: 'warmup' }), ex('barbell-back-squat'), ex('barbell-romanian-deadlift'), ex('leg-extension-machine'), ex('pigeon-stretch', 1, 0, { seconds: 30, part: 'cooldown' })]),
    PO,
    POOL,
    canDoExercise,
  );
  assert.deepEqual([v.days[0].warmup.length, v.days[0].main.length, v.days[0].cooldown.length], [1, 3, 1]);
  assert.deepEqual(writtenDayCardFor({}, v.days[0]).rows.map((r) => r.name), ['Warm-up · Cat-Cow', 'Barbell Back Squat', 'Barbell Romanian Deadlift', 'Leg Extension Machine', 'Cool-down · Pigeon Stretch']);
  // Two main movements and a warm-up is not three movements.
  assert.equal(validateAuthored(plan([ex('cat-cow', 1, 10, { part: 'warmup' }), ex('push-up'), ex('pull-up')]), PO, POOL, canDoExercise), null);
});

test('⚠ cardio is a bout: written as cardio-bike, stored as the row the logger and the rulebook use', () => {
  const v = validateAuthored(plan([ex('cardio-bike', 1, 0, { seconds: 300, part: 'warmup' }), ex('barbell-bench-press'), ex('push-up'), ex('cable-crossover'), ex('cardio-row', 1, 0, { seconds: 600 })]), PO, POOL, canDoExercise);
  assert.deepEqual(v.days[0].warmup[0], { catalogKey: 'cardio:bike', name: v.days[0].warmup[0].name, kind: 'cardio', activity: 'bike', modality: 'indoor', sets: 1, targetSec: 300 });
  assert.equal(v.days[0].main[3].catalogKey, 'cardio:row');
  assert.equal(writtenDayCardFor({}, v.days[0]).rows[0].prescription, '5 min');
  assert.deepEqual(v.dropped, []);
});

test('⛔ a bout needs the machine, and a limitation takes the run', () => {
  const three = [ex('dumbbell-bench-press'), ex('push-up'), ex('dumbbell-chest-fly')];
  const home = { ...PO, environment: 'home', ownedEquipment: ['dumbbells', 'bench'] };
  assert.deepEqual(validateAuthored(plan([ex('cardio-bike', 1, 0, { seconds: 300 }), ...three]), home, POOL, canDoExercise).dropped.map((d) => d.why), ['gear']);
  assert.deepEqual(authorFacts(home, POOL, canDoExercise).cardio, ['cardio-run', 'cardio-walk'], 'a run or a walk needs nothing; a machine needs the machine');
  assert.deepEqual(validateAuthored(plan([ex('cardio-run', 1, 0, { seconds: 600 }), ...three]), { ...PO, limitations: ['knees'] }, POOL, canDoExercise).dropped.map((d) => d.why), ['limit']);
  assert.ok(!authorFacts({ ...PO, limitations: ['knees'] }, POOL, canDoExercise).cardio.includes('cardio-run'));
  assert.equal(validateAuthored(plan([ex('cardio-teleport', 1, 0, { seconds: 600 }), ...three]), PO, POOL, canDoExercise).dropped[0].why, 'unknown');
});

test('he is told the exact movements, not only the equipment class', () => {
  const bare = authorFacts({ ...PO, environment: 'bodyweight' }, POOL, canDoExercise);
  assert.ok(bare.only.includes('push-up') && !bare.only.includes('parallel-bar-dip'), 'a dip is "bodyweight" and still needs bars');
  assert.deepEqual(bare.cannot, [], 'one list or the other, whichever is shorter');
  const gym = authorFacts(PO, POOL, canDoExercise);
  assert.deepEqual(gym.only, []);
  assert.ok(gym.cannot.includes('jump-rope-intervals'), 'a full gym has no rope on file');
  for (const k of bare.only) assert.ok(canDoExercise(POOL.find((e) => e.key === k), []));
  // A limitation's carve-outs are named to him as well as its bans.
  const back = authorFacts({ ...PO, limitations: ['lower_back'] }, POOL, canDoExercise);
  assert.ok(back.keep.includes('glute-bridge'), `the hinge ban keeps the glute bridge: ${back.keep.slice(0, 5)}`);
  const turn = authorUserTurn(narrowAuthorRequest({ kind: 'day', said: ['legs'], ...bare }));
  assert.match(turn, /Their kit allows ONLY these movements/);
  assert.doesNotMatch(turn, /Equipment they can use/);
});

test("what he could not do is said once, whole, and never in the app's own jargon", () => {
  const p = plan([ex('barbell-bench-press'), ex('push-up'), ex('cable-crossover')], {
    say: 'I kept the overhead pressing out because of what you asked me to work around.',
    unmet: [
      'I kept the overhead pressing out because of what you asked me to work around.',
      "There's no landmine press in the app, so I used a cable press.",
      'The Vertical Push section is excluded so the key was dropped.',
    ],
  });
  const v = validateAuthored(p, PO, POOL, canDoExercise);
  assert.equal(
    authoredLine(p, v),
    "I kept the overhead pressing out because of what you asked me to work around. What I couldn't do: There's no landmine press in the app, so I used a cable press.",
  );
});

test('a plan that stops after one movement is not whole, and the function asks once more', () => {
  assert.equal(authoredIsWhole(null), false);
  assert.equal(authoredIsWhole(sanitizeAuthored({ days: [{ name: 'x', exercises: [ex('jump-rope', 1, 0, { part: 'warmup' })] }] }, 'day')), false);
  assert.equal(authoredIsWhole(sanitizeAuthored(ASKED, 'day')), true);
  const fn = read('supabase/functions/coach-author/index.ts');
  assert.match(fn, /attempt < 2 && !authoredIsWhole\(plan\)/);
  assert.match(fn, /p_credits: attempt === 0 \? reserved\.credits_spent : 0/, 'the second ask rides on the credit already reserved');
});
