import '../../../data/__tests__/harness/hooks.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/*
 * ONE RULE FOR "IS THERE TRAINING WRITTEN HERE", IN THREE PLACES THAT MUST AGREE (AI audit 2026-11-16, V-D1).
 *
 *   · `card-transcript.ts` — `cleanCardTranscript`, the device's guard on a photographed card. It decides.
 *   · `workout-ai-gate.ts` — "nothing to read" vs "AI, because lifts are written but none were read". It IMPORTS the
 *     rule, so it cannot drift.
 *   · `supabase/functions/workout-card-read/index.ts` — a dashboard paste that imports nothing, so it carries a COPY.
 *     That copy is read here as text, evaluated, and run through the same cases. Change one without the other and
 *     this file fails.
 *
 * The first rule ("a digit, then x, sets, reps or %") refused "Bench Press 4×6-8", "Plank 3 × 30s", "15 Push-ups",
 * "Run 5 km" and every Sets/Reps column sheet, and the 2 credits were kept. It also ACCEPTED a menu ("18% gratuity")
 * and a till receipt ("2% MILK"). Both halves are pinned below.
 */

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');
const DOMAIN = read('src/domain/workout/card-transcript.ts');
const GATE = read('src/domain/workout/workout-ai-gate.ts');
const FN = read('supabase/functions/workout-card-read/index.ts');

const { LIFTY, cleanCardTranscript } = await import('../card-transcript.ts');
const { whenToUseAi } = await import('../workout-ai-gate.ts');
const { readWrittenWorkout, writtenToTemplate } = await import('../written-workout.ts');
const { resolveExerciseName } = await import('../../exercise-picker/data.ts');
const resolveKey = (n) => resolveExerciseName(n)?.key;

const BEGIN = '// ── LIFTY: begin ──';
const END = '// ── LIFTY: end ──';
const block = (src) => {
  const a = src.indexOf(BEGIN);
  const b = src.indexOf(END);
  assert.ok(a >= 0 && b > a, 'the LIFTY block is marked');
  return src.slice(a + BEGIN.length, b).trim();
};
/** The function's own copy of the rule, compiled from its source text. */
const FN_LIFTY = new Function(`${block(FN)}\nreturn LIFTY;`)();

/** What the function answers for an answer from the model (its own boundary, line for line). */
const fnAccepts = (text) => !(/^NOT_A_WORKOUT\b/.test(text) || !FN_LIFTY.test(text));
const appAccepts = (text) => cleanCardTranscript(text).ok;

/* ── the three agree ─────────────────────────────────────────────────────── */

test('the function carries the domain’s rule character for character', () => {
  assert.equal(block(FN), block(DOMAIN));
  assert.equal(FN_LIFTY.source, LIFTY.source);
  assert.equal(FN_LIFTY.flags, LIFTY.flags);
  assert.ok(!/g|y/.test(LIFTY.flags), 'no g/y flag: .test() must not carry lastIndex between cards');
});

test('the function’s boundary uses that rule, and nothing else', () => {
  assert.match(FN, /if \(\/\^NOT_A_WORKOUT\\b\/\.test\(text\) \|\| !LIFTY\.test\(text\)\) \{\s*return json\(\{ ok: false, reason: 'not_a_program'/);
  assert.ok(!FN.includes(String.raw`\d\s*(?:x\s*\d|sets?\b|reps?\b|%)`), 'the old rule is gone from the function');
});

test('the gate imports the rule rather than keeping a copy', () => {
  assert.match(GATE, /import \{ LIFTY \} from '\.\/card-transcript\.ts';/);
  assert.ok(!/const LIFTY\s*=/.test(GATE));
  assert.ok(!DOMAIN.includes(String.raw`\d\s*(?:x\s*\d|sets?\b|reps?\b|%)`), 'the old rule is gone from the domain');
});

test('the function file is still self-contained: its only import is supabase-js', () => {
  const imports = [...FN.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ['jsr:@supabase/supabase-js@2']);
});

/* ── what it accepts ─────────────────────────────────────────────────────── */

const ACCEPT = {
  /* The audit's probes (refused before). */
  'Unicode ×': 'Bench Press 4×6-8',
  'a hold, N × time': 'Plank 3 × 30s',
  'count first': '15 Push-ups',
  'a distance': 'Run 5 km',
  'a tab table with a Sets/Reps header': 'Exercise\tSets\tReps\nBench Press\t4\t8\nBent Over Row\t3\t10',
  'a space table with a Sets/Reps header': 'Exercise        Sets   Reps\nBench Press     4      8\nBent Over Row   3      10',
  'a pipe table with a Reps/Weight header': '| Exercise | Reps | Weight |\n|---|---|---|\n| Back Squat | 5 | 225 |',
  /* The rest of the broadened rule. */
  'capital X': 'Squat 3X10',
  'a distance done N times': '400m x 6\nrest 90s',
  'time first': '30s plank',
  'a clock time': 'Wall sit 1:30',
  'a movement with a word between': 'Jump rope 2 min',
  'a row for metres': 'Row 500m',
  'a format word': 'AMRAP 12\n10 Burpees\n15 Air Squats',
  'Sets: N': 'Goblet Squat  Sets: 3  Reps: 12',
  '@ a %': 'Back Squat @ 75%',
  '% of a max': 'Deadlift 80% of 1RM',
  'two %s on a line': 'Bench 65% 75% 85%',
  'a counted list with bullets and numbers': '- 20 air squats\n- 10 burpees\n1. 15 kettlebell swings',
  /* What was always accepted still is. */
  'N sets of N reps': '1. Back Squat 5 sets of 5 reps @ 75%',
  '4x10': 'Lat Pulldown 4x10',
};

for (const [name, text] of Object.entries(ACCEPT)) {
  test(`accepted by the app and the function alike: ${name}`, () => {
    assert.equal(appAccepts(text), true, text);
    assert.equal(fnAccepts(text), true, text);
  });
}

/* ── what it still refuses ───────────────────────────────────────────────── */

/*
 * Junk a transcriber could be shown, written the way it would copy it (there is no live answer for a photo of a menu:
 * the prompt says NOT_A_WORKOUT for those, and this rule is what stands behind the prompt). Each one carries the
 * numbers, times, %s and "x"s that real junk has, so it tests the rule rather than an empty page.
 */
const REFUSE = {
  'a restaurant menu with prices (old rule: accepted, on "18% gratuity")': `THE CORNER BISTRO
Starters
Garlic Knots (6)   7.50
Buffalo Wings, 12 pc   14.99
Soup of the Day   cup 5 / bowl 8
Mains
8 oz Sirloin with two sides   24.00
Grilled Salmon   22.50
Kids Menu (12 & under)   8.99
Open daily 11:30 - 10:00
18% gratuity added for parties of 6 or more`,
  'a grocery receipt (old rule: accepted, on "2% MILK")': `FRESH MART #0412
11/14/26   6:42 PM
2% MILK 1 GAL          4.29
BANANAS 2.31 lb @ 0.59/lb   1.36
YOGURT CUPS  2 x 1.25   2.50
EGGS LARGE 12 CT       3.79
SOURDOUGH BREAD        5.00
SUBTOTAL              16.94
TAX 7.25%              0.36
TOTAL                 17.30
VISA ************4417
THANK YOU FOR SHOPPING`,
  'a text message': `Mom
Today 9:41 AM
Hey sweetie, running 10 min late, traffic is crazy
Can you grab 2 cartons of eggs and a loaf of bread?
Love you, see you at 6:30`,
  'a recipe': `Grandma's Banana Bread
2 cups flour
1 tsp baking soda
3 ripe bananas, mashed
1/2 cup sugar
2 eggs
Preheat oven to 350°F. Mix, pour into a loaf pan and bake 60 min.
Cool 10 minutes before slicing. Serves 8.`,
  'a selfie caption': `sunday funday with my favorite people ☀️
#blessed #squadgoals #summer2026`,
  'a gym selfie caption': `Leg day done 💪 feeling strong
#legday #gymlife #fitfam`,
  'a description of a photograph': 'The image shows a man standing in a gym next to a squat rack. He is wearing a grey shirt and appears to be resting.',
  'a rest day': 'Rest day\n30 min walk\nEat big\nSleep 9 hrs',
  'the model’s own refusal': 'NOT_A_WORKOUT',
};

for (const [name, text] of Object.entries(REFUSE)) {
  test(`refused by the app and the function alike: ${name}`, () => {
    assert.deepEqual(cleanCardTranscript(text), { ok: false, reason: 'not_a_program' }, text);
    assert.equal(fnAccepts(text), false, text);
  });
}

/* ── the real corpus: every real sheet and card ──────────────────────────── */

const FIXTURES = 'src/domain/program/__tests__/fixtures';
const SHEETS = fs.readdirSync(path.join(process.cwd(), FIXTURES)).map((f) => [f, read(`${FIXTURES}/${f}`)]);

test('all 21 real photo sheets are accepted by both — 12 of them were refused before (a Sets/Reps header, no "x")', () => {
  /* Web/trunk port: build 11's 21st sheet (`aunt-five-day-split-2026-10-06.txt`) arrived with the 10-06 paste-import
     fix (bb2e6ea0), which this line does not carry yet — 20 sheets here, 21 once it lands. Every sheet present is
     still held to both rules below. */
  assert.ok(SHEETS.length >= 20, `${SHEETS.length} sheets`);
  for (const [f, text] of SHEETS) {
    assert.equal(appAccepts(text), true, f);
    assert.equal(fnAccepts(text), true, f);
  }
});

const CARDS = Object.fromEntries(
  (
    await Promise.all(
      ['squatober-2024-week2', 'squatober-2024-week3', 'squatober-2025', 'squatober-2026-day1'].map(async (f) =>
        Object.entries(await import(`./fixtures/${f}.mjs`)).map(([k, v]) => [`${f} ${k}`, v]),
      ),
    )
  ).flat(),
);
/* Rest-day cards: a nap, a walk, a meal — no training to import. Both rules, old and new, refuse them. */
const REST_DAYS = ['squatober-2024-week2 D1213', 'squatober-2025 S11_DAY45'];

test('every real Squatober card and every real answer for it is accepted by both; the two rest-day cards are not', () => {
  assert.ok(Object.keys(CARDS).length >= 22);
  for (const [name, text] of Object.entries(CARDS)) {
    const want = !REST_DAYS.includes(name);
    assert.equal(appAccepts(text), want, name);
    assert.equal(fnAccepts(text), want, name);
  }
});

/* ── the gate agrees ─────────────────────────────────────────────────────── */

const gate = (text) => {
  const w = readWrittenWorkout(text);
  return whenToUseAi(text, w, writtenToTemplate(w, resolveKey)).kind;
};

test('the squad screen’s gate reads the same rule: junk is nothing to read; training the reader cannot read goes to AI', () => {
  for (const text of Object.values(REFUSE)) assert.equal(gate(text), 'none', text);
  for (const text of ['Bench Press 4×6-8', '15 Push-ups', 'Run 5 km']) {
    const w = readWrittenWorkout(text);
    const rows = writtenToTemplate(w, resolveKey);
    assert.notEqual(gate(text), 'none', `${text} is training, not "nothing to read" (${rows.length} rows read)`);
  }
});
