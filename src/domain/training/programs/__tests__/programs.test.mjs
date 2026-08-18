/**
 * programs.test.mjs — validates the generated ProgramDefinition JSON against the
 * authoritative catalog + the schema enums. This is the conversion's acceptance gate:
 * no dangling catalogKeys, all enums in range, structure honestly omitted where the
 * program isn't single-structure, and no fabricated data.
 *
 * Run:  node --test src/domain/training/programs/__tests__/programs.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { MODALITIES, SPLITS, PROGRAM_THEMES, PROGRAM_FAMILIES, PROGRAM_STRUCTURES } from '../../schema.ts';
import { buildPickerDb } from '../../../exercise-picker/catalog-core.ts';
import { ALIASES_BY_ID } from '../../../exercise-picker/aliases.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROGRAMS = join(HERE, '..');
const SOURCE = join(HERE, '..', '..', '..', 'exercise-relationships', 'source');
const source = (f) => JSON.parse(readFileSync(join(SOURCE, f), 'utf8'));

/**
 * ⚠ THE VISIBLE CATALOGUE, NOT THE FILE — the same correction `aliases.test.mjs` already carries.
 *
 * This was `new Set(exercises.json.map(e => e.id))`, all 797 rows, and that is not what a program is
 * allowed to prescribe. `HIDDEN_EXERCISE_IDS` removes 76 of them from browse, search and the picker, so
 * a program naming one prescribes an exercise the athlete cannot open, cannot read coaching for, and
 * cannot swap out. It is a dangling key in every way that matters to the person training.
 *
 * It passed for months: Iron & Engine's Engine circuits prescribed `air-bike`, a row that exists in the
 * file and is hidden from the app, and this test said the program was clean 7 times over.
 */
const PICKER_DB = buildPickerDb({
  exercises: source('exercises.json'),
  exerciseMuscles: source('exercise_muscles.json'),
  muscles: source('muscles.json'),
  equipment: source('equipment.json'),
});
const catalogIds = new Set(PICKER_DB.map((x) => x.key));

/**
 * `itemByName`, which is what `structureFromDefinition` resolves a prose warm-up with. Copied rather
 * than imported because `data.ts` imports JSON in a way `node --test` cannot load — same reason, and
 * same shape, as the copy in `aliases.test.mjs`.
 */
const normName = (s) =>
  s
    .split(/[—–]|\s-\s/)[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
const BY_NAME = new Map();
for (const x of PICKER_DB) {
  BY_NAME.set(normName(x.name), x);
  for (const a of x.aliases ?? []) if (!BY_NAME.has(normName(a))) BY_NAME.set(normName(a), x);
}
for (const x of PICKER_DB) {
  for (const a of ALIASES_BY_ID.get(x.key) ?? []) if (!BY_NAME.has(normName(a))) BY_NAME.set(normName(a), x);
}
const resolvesByName = (n) => BY_NAME.has(normName(n ?? ''));

const load = (f) => JSON.parse(readFileSync(join(PROGRAMS, f), 'utf8'));
const i3 = load('strength-foundation-i-3day.json');
const ii4 = load('strength-foundation-ii-4day.json');
const ie = load('iron-and-engine.json');
const sq = load('squat-ascent-intermediate.json');
const bp = load('bench-approach-intermediate.json');
const dl = load('deadlift-measure-intermediate.json');

/**
 * The percentage-loaded specialization blocks, each paired with the lift it TESTS.
 *
 * Every rule below runs over all three. Writing them against one program is how the second and third
 * ship with a defect the first was fixed for — which is exactly what happened to the `lower`/`legs`
 * split rule, caught only because a reviewer read the sibling.
 */
const SPECIALIZATIONS = [
  { p: sq, tested: 'barbell-back-squat', family: /squat/ },
  { p: bp, tested: 'barbell-bench-press', family: /bench|press/ },
  { p: dl, tested: 'barbell-deadlift', family: /deadlift/ },
];

/** GENERATED from `.docx` — the ingest owns these. */
const generated = [i3, ii4];

/**
 * EVERY shipped definition, READ FROM THE DIRECTORY — not a hand-kept list.
 *
 * This was `[i3, ii4, ie, sq, bp, dl]`, and a seventh program was added without being added to it. The
 * whole file then passed, 31 green, having validated nothing about the new one — no dangling-key check,
 * no split check, no unit check. A guard that silently stops covering what it is for is worse than no
 * guard, because the green is read as an answer.
 *
 * Same fix as `route-guard.test.mjs`: derive the list from the filesystem so it cannot fall behind.
 */
const all = readdirSync(PROGRAMS)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map(load);

test('the validator covers every definition in the directory', () => {
  // The named imports above must all be IN that list — a rename would otherwise leave a test
  // asserting things about a file the catalog no longer ships.
  const ids = new Set(all.map((p) => p.id));
  for (const p of [i3, ii4, ie, sq, bp, dl]) {
    assert.ok(ids.has(p.id), `${p.id} is imported by name but not present in the programs directory`);
  }
  assert.ok(all.length >= 6, `expected at least the six known programs, found ${all.length}`);
});
const UNITS = new Set(['reps', 'seconds', 'minutes', 'yards']);

/** A cardio bout carries a `cardio:<activity>` key, which is not a row in `exercises.json`. */
const isCardio = (ex) => ex.kind === 'cardio';
const CARDIO_ACTIVITIES = new Set(['run', 'walk', 'bike', 'row', 'elliptical', 'swim', 'stair']);

/** Every main-work item across every shipped program, labelled well enough to name in a failure. */
function* everyPrescription() {
  for (const p of all) {
    for (const b of p.blocks) {
      for (const w of b.workouts) {
        for (const [i, ex] of w.main.entries()) yield [ex, `${p.id} ${b.label} ${w.code}[${i}] ${ex.displayName}`];
      }
    }
  }
}

test('exactly the two PO-approved LOCKED programs are generated from .docx', () => {
  assert.equal(i3.id, 'strength-foundation-i-3day');
  assert.equal(ii4.id, 'strength-foundation-ii-4day');
  for (const p of generated) assert.match(p.status, /LOCKED/i);
});

/**
 * Iron & Engine was authored in-repo rather than converted, so it is the one shipped program the ingest
 * neither produces nor validates. Both facts are asserted rather than left to a comment: a `.docx`
 * appearing under it later, or the status quietly being promoted to LOCKED without the PO, should both
 * fail here. Phases 1–8 are complete; Lock Approval is a signature this repo cannot give itself.
 */
test('Iron & Engine ships un-LOCKED, with a Design Record instead of a .docx', () => {
  assert.equal(ie.id, 'iron-and-engine');
  assert.doesNotMatch(ie.status, /^LOCKED$/i);
  assert.match(ie.status, /Lock Approval outstanding/i);
  assert.match(ie.sourceFile, /\.md$/);
  assert.equal(ie.source, 'forge');
});

test('program-level enums are in range', () => {
  for (const p of all) {
    assert.ok(PROGRAM_FAMILIES.includes(p.family), `family: ${p.family}`);
    assert.ok(PROGRAM_THEMES.includes(p.theme), `theme: ${p.theme}`);
    if (p.structure !== undefined) assert.ok(PROGRAM_STRUCTURES.includes(p.structure), `structure: ${p.structure}`);
    assert.ok(p.durationWeeks > 0 && p.frequencyPerWeek > 0);
    assert.ok(Array.isArray(p.goals) && p.goals.length > 0);
    assert.ok(p.sourceFile && p.source === 'forge');
  }
});

test('PO decisions are reflected: themes + 4-day structure omitted', () => {
  assert.equal(i3.theme, 'beginner');
  assert.equal(i3.structure, 'full_body');
  assert.equal(ii4.theme, 'strength');
  assert.equal(ii4.structure, undefined); // per-workout split only (Workout B is an upper day)
});

test('every block/workout is well-formed with in-range modality + split', () => {
  for (const p of all) {
    assert.ok(p.blocks.length > 0, `${p.id} has blocks`);
    for (const b of p.blocks) {
      assert.ok(b.weekStart > 0 && b.weekEnd >= b.weekStart, `${p.id} ${b.label} week range`);
      assert.ok(b.workouts.length > 0, `${p.id} ${b.label} has workouts`);
      for (const w of b.workouts) {
        assert.ok(MODALITIES.includes(w.modality), `${p.id} ${w.code} modality ${w.modality}`);
        assert.ok(SPLITS.includes(w.split), `${p.id} ${w.code} split ${w.split}`);
        assert.ok(w.main.length > 0, `${p.id} ${w.code} has main work`);
      }
    }
  }
});

test('every main-work catalogKey (and substitution) resolves to the real catalog — no dangling keys', () => {
  for (const [ex, where] of everyPrescription()) {
    if (isCardio(ex)) {
      // A bout's key is `cardio:<activity>`, and the activity must be one the app can actually start.
      const activity = ex.catalogKey.replace(/^cardio:/, '');
      assert.match(ex.catalogKey, /^cardio:/, `${where} cardio key`);
      assert.ok(CARDIO_ACTIVITIES.has(activity), `${where} unknown cardio activity: ${activity}`);
      assert.equal(ex.activity, activity, `${where} activity must match its key`);
    } else {
      assert.ok(catalogIds.has(ex.catalogKey), `${where} dangling catalogKey: ${ex.catalogKey}`);
    }
    assert.ok(UNITS.has(ex.unit), `${where} unit ${ex.unit}`);
    if (ex.substitution?.catalogKey) {
      assert.ok(catalogIds.has(ex.substitution.catalogKey), `${where} dangling substitution key: ${ex.substitution.catalogKey}`);
    }
  }
});

/**
 * `reps > 0` used to be asserted flatly, which is only true of a program that can say nothing but
 * sets × reps. A timed carry, a ladder and a cardio bout all legitimately carry `reps: 0` — the reps
 * field is simply not where their prescription lives. So the rule becomes: EVERY item must prescribe
 * SOMETHING, by exactly one route. An item carrying neither reps, nor a ladder, nor a duration, nor a
 * cardio target is a blank line the athlete would read as an instruction.
 */
test('every prescription states its work — by reps, ladder, duration or cardio target', () => {
  for (const [ex, where] of everyPrescription()) {
    assert.ok(ex.sets > 0, `${where} sets must be positive`);
    const states =
      ex.reps > 0 ||
      (Array.isArray(ex.repScheme) && ex.repScheme.length > 0) ||
      ex.durationSec > 0 ||
      (isCardio(ex) && (ex.targetSec > 0 || ex.targetMi > 0));
    assert.ok(states, `${where} prescribes nothing at all`);
  }
});

test('a ladder is a real per-set list, and its length is the set count', () => {
  for (const [ex, where] of everyPrescription()) {
    if (!ex.repScheme) continue;
    assert.ok(Array.isArray(ex.repScheme) && ex.repScheme.length > 0, `${where} empty repScheme`);
    for (const t of ex.repScheme) {
      assert.ok(t === 'F' || (Number.isInteger(t) && t > 0), `${where} bad rep target: ${JSON.stringify(t)}`);
    }
    // `setCount` reads the ladder's LENGTH and ignores `sets`. They must not disagree, or Program
    // Detail's planned-set meta and the logger's row count describe two different sessions.
    assert.equal(ex.sets, ex.repScheme.length, `${where} sets disagrees with its ladder`);
  }
});

/**
 * Circuits are derived by ADJACENCY, not by id alone — so a block's members must be neighbours, and
 * every member must repeat identical block metadata. A member that disagrees with its neighbours about
 * the round count silently becomes a different block, and the athlete owes a number nobody wrote.
 */
test('circuit blocks are adjacent runs whose members agree on the block', () => {
  for (const p of all) {
    for (const b of p.blocks) {
      for (const w of b.workouts) {
        const seen = new Set();
        let prev = null;
        for (const ex of w.main) {
          const gid = ex.groupId ?? null;
          if (gid && gid !== prev) {
            assert.ok(!seen.has(gid), `${p.id} ${w.code}: block ${gid} is not one adjacent run`);
            seen.add(gid);
          }
          prev = gid;
          if (!gid) continue;

          // Rounds XOR a clock. An AMRAP that also claims rounds is prescribing a number it cannot know.
          const capped = ex.groupCapSec != null && ex.groupCapSec > 0;
          if (capped) assert.equal(ex.groupRounds, undefined, `${p.id} ${w.code}: AMRAP ${gid} also claims rounds`);
          else assert.ok(ex.groupRounds > 0, `${p.id} ${w.code}: block ${gid} has neither rounds nor a cap`);

          // A member is ONE bout per round — the block's round count is the repetition, so `sets: 3`
          // here would be read by `setCount` as three sets INSIDE every round.
          assert.equal(ex.sets, 1, `${p.id} ${w.code}: circuit member ${ex.displayName} must be one bout`);
        }

        const members = w.main.filter((ex) => ex.groupId);
        for (const gid of seen) {
          const run = members.filter((ex) => ex.groupId === gid);
          assert.ok(run.length > 1, `${p.id} ${w.code}: block ${gid} has a single member`);
          for (const ex of run) {
            assert.equal(ex.groupName, run[0].groupName, `${p.id} ${w.code}: ${gid} name disagrees`);
            assert.equal(ex.groupKind, run[0].groupKind, `${p.id} ${w.code}: ${gid} kind disagrees`);
            assert.equal(ex.groupRounds, run[0].groupRounds, `${p.id} ${w.code}: ${gid} rounds disagree`);
            assert.equal(ex.groupCapSec ?? null, run[0].groupCapSec ?? null, `${p.id} ${w.code}: ${gid} cap disagrees`);
          }
        }
      }
    }
  }
});

/**
 * A cardio target of `null` prescribes an open bout and must survive as null. A ZERO would read as a
 * target already met the moment the athlete starts — the distinction the prescription model exists to
 * protect, asserted at the point programs are authored rather than only where they are rendered.
 */
test('cardio bouts carry a real target, never a zero standing in for null', () => {
  for (const [ex, where] of everyPrescription()) {
    if (!isCardio(ex)) continue;
    assert.ok(ex.modality === 'indoor' || ex.modality === 'outdoor', `${where} modality`);
    for (const k of ['targetSec', 'targetMi']) {
      if (ex[k] === undefined || ex[k] === null) continue;
      assert.ok(ex[k] > 0, `${where} ${k} is 0 — write null for "no target"`);
    }
    assert.ok(ex.targetSec > 0 || ex.targetMi > 0, `${where} prescribes no bout`);
  }
});

test('4-day program surfaces the upper accessory day (honest per-workout split)', () => {
  const splits = new Set(ii4.blocks[0].workouts.map((w) => w.split));
  assert.ok(splits.has('upper'), 'expected an upper-focused workout in II-4day');
  assert.ok(splits.has('full_body'), 'expected full-body workouts in II-4day');
});

/**
 * ── WARM-UPS: PREP THE APP CAN SHOW, AND NOTHING ELSE ───────────────────────────────────────────────
 *
 * PO decision 2026-08-06: a program prescribes only exercises that are really in the catalogue, and it
 * does not prescribe ramp sets — "people will warm up properly on their own".
 *
 * That retired 244 of the 405 authored warm-up items. They fell into two groups, and BOTH were invisible
 * to the old assertions, which only checked that an item had `text` and no `catalogKey`:
 *
 *  · 232 resolved to NOTHING. "Build-up sets", "Bike or brisk walk", "Empty bar squats", "Light lat
 *    pulldown". A warm-up is matched back to the catalogue BY NAME (`structureFromDefinition` →
 *    `itemByName`), so these entered the athlete's session as a row with no demo, no coaching and no
 *    logging identity — a line of prose wearing an exercise's clothes.
 *  · 12 resolved fine and were still ramp sets: "Barbell Bench Press — empty bar, 8 reps".
 *
 * The rule below is the one that would have caught both.
 */
test('every warm-up is freeform prep that resolves to a REAL, visible exercise', () => {
  for (const p of all) {
    for (const b of p.blocks) {
      for (const w of b.workouts) {
        assert.ok(Array.isArray(w.warmup), `${p.id} ${w.code} warmup array`);
        for (const item of w.warmup) {
          const where = `${p.id} ${b.label} ${w.code} "${item.name}"`;
          assert.ok(item.text, `${where} has no text`);
          assert.ok(!('catalogKey' in item), `${where} is catalog-linked; warm-ups are freeform`);
          assert.ok(resolvesByName(item.name), `${where} resolves to no visible exercise`);
          assert.doesNotMatch(item.detail ?? '', /empty[\s-]bar/i, `${where} is a ramp set, not prep`);
        }
      }
    }
  }
});

test('the beginner program still opens with prep, and it is real', () => {
  // The floor the sweep above must not be allowed to reach: stripping everything would also pass it.
  const w = i3.blocks[0].workouts[0];
  assert.ok(w.warmup.length > 0, 'Confidence Builder lost its warm-up entirely');
});

/**
 * ── IRON & ENGINE, AGAINST THE PRODUCTION STANDARD ──────────────────────────────────────────────────
 *
 * The Standard is a document; these are the parts of it a machine can hold us to. The rest — "confidence
 * before complexity", the coaching audit — lives in the Design Record, where a human signs it.
 */

/**
 * ⚠ AMENDED 2026-08-06, AND THE PRODUCTION STANDARD NOW DISAGREES WITH THE CODE.
 *
 * This asserted the Standard's shape: 1 general + 1–2 pattern prep + 1 rehearsal, so 3–4 items. Two of
 * those three elements are exactly what the PO ordered removed — the "general" was a 2-minute bike or
 * rowing machine, the "rehearsal" was an empty-bar set of the day's lift. What survives is the pattern
 * prep, which is the part that was catalogue-backed all along.
 *
 * So the ceiling stays (warm-ups are not workouts) and the floor moves to 2. `Forge-Program-Production
 * -Standard.docx` §warm-up is now stale and needs the PO's amendment — it is a .docx under the
 * append/annotate-only rule, so it is flagged, not edited.
 */
test('Iron & Engine: every session opens with real pattern prep', () => {
  for (const b of ie.blocks) {
    for (const w of b.workouts) {
      assert.ok(w.warmup.length >= 2 && w.warmup.length <= 4, `${b.label} ${w.code} warm-up length`);
    }
  }
});

test('Iron & Engine: every session closes with an Engine finisher', () => {
  for (const b of ie.blocks) {
    for (const w of b.workouts) {
      const last = w.main[w.main.length - 1];
      const isFinisher = Boolean(last.groupId) || isCardio(last);
      assert.ok(isFinisher, `${b.label} ${w.code} does not end in an Engine block`);
      const name = last.groupName ?? last.displayName;
      assert.match(name, /Engine/, `${b.label} ${w.code} finisher is not named Engine: ${name}`);
    }
  }
});

/**
 * ── THE SIX-DAY WEEK IS FOUR IRON DAYS PLUS TWO ENGINE DAYS ─────────────────────────────────────────
 *
 * This is the load-bearing shape of the program and the reason it is survivable at six days: going from
 * four days to six added NO barbell volume. Each primary is still trained once a week. What the two
 * extra days carry is conditioning.
 *
 * Asserted, because it is exactly the property that would erode first — the tempting edit is to give
 * days C and F a barbell primary "since we're here anyway", which quietly turns a recoverable six-day
 * program into six heavy days and breaks the Recovery Standard without changing a single rep count.
 */
const IRON_DAYS = ['A', 'B', 'D', 'E'];
const ENGINE_DAYS = ['C', 'F'];

test('Iron & Engine: six days = four IRON days + two ENGINE days', () => {
  for (const b of ie.blocks) {
    assert.deepEqual(b.workouts.map((w) => w.code), ['A', 'B', 'C', 'D', 'E', 'F'], `${b.label} day codes`);
    for (const w of b.workouts) {
      if (ENGINE_DAYS.includes(w.code)) {
        assert.equal(w.modality, 'conditioning', `${b.label} ${w.code} should be an engine day`);
        assert.equal(w.split, 'conditioning', `${b.label} ${w.code} split`);
        // No barbell primary. A conditioning day that opens with a heavy bar is an iron day in disguise.
        assert.doesNotMatch(w.main[0].catalogKey, /^barbell-/, `${b.label} ${w.code} opens with a barbell lift`);
      } else {
        assert.equal(w.modality, 'strength', `${b.label} ${w.code} should be an iron day`);
      }
    }
  }
});

/**
 * STABILITY 70–80%, VARIATION 20–30% (Production Standard §"Stability vs Variety"). The measurable half
 * is the primary lift: the first main-work item of each IRON day must be the SAME movement in all three
 * blocks. Iron & Engine's whole claim is that four lifts stay put for six weeks while the load waves.
 */
test('Iron & Engine: the four primary lifts never change across the six weeks', () => {
  const byCode = new Map();
  for (const b of ie.blocks) {
    for (const w of b.workouts) {
      if (!IRON_DAYS.includes(w.code)) continue;
      const primary = w.main[0].catalogKey;
      const prior = byCode.get(w.code);
      if (prior) assert.equal(primary, prior, `day ${w.code} changed its primary lift in ${b.label}`);
      else byCode.set(w.code, primary);
    }
  }
  assert.deepEqual(
    [...byCode.entries()].sort(),
    [['A', 'barbell-back-squat'], ['B', 'barbell-bench-press'], ['D', 'barbell-deadlift'], ['E', 'pull-up']],
  );
});

/** Each primary is trained ONCE a week — the check that six days did not become six heavy days. */
test('Iron & Engine: no primary lift is trained twice in the same week', () => {
  for (const b of ie.blocks) {
    const primaries = b.workouts.filter((w) => IRON_DAYS.includes(w.code)).map((w) => w.main[0].catalogKey);
    assert.equal(new Set(primaries).size, primaries.length, `${b.label} repeats a primary lift within the week`);
  }
});

test('Iron & Engine: intensity waves down over the blocks, never up', () => {
  // Weeks 1–2 flat sixes → 3–4 descending ladders → 5–6 heavy triples. Read off the primary of day A.
  const primaries = ie.blocks.map((b) => b.workouts[0].main[0]);
  const lowest = primaries.map((p) => Math.min(...(p.repScheme ?? [p.reps]).filter((r) => r !== 'F')));
  for (let i = 1; i < lowest.length; i++) {
    assert.ok(lowest[i] <= lowest[i - 1], `block ${i + 1} does not get heavier (${lowest[i - 1]} → ${lowest[i]})`);
  }
});

test('Iron & Engine: the block schedule covers all six weeks with no gap or overlap', () => {
  const sorted = [...ie.blocks].sort((a, b) => a.weekStart - b.weekStart);
  assert.equal(sorted[0].weekStart, 1);
  assert.equal(sorted[sorted.length - 1].weekEnd, ie.durationWeeks);
  for (let i = 1; i < sorted.length; i++) {
    assert.equal(sorted[i].weekStart, sorted[i - 1].weekEnd + 1, `gap or overlap before ${sorted[i].label}`);
  }
  for (const b of sorted) assert.equal(b.workouts.length, ie.frequencyPerWeek, `${b.label} day count`);
});

// ─────────────────────────────────────────────────────────────────────────────
// The percentage-loaded specialization blocks — squat, bench, deadlift
//
// Every rule here runs over ALL THREE. Written against one program, these are
// exactly how the second and third ship with a defect the first was fixed for.
// ─────────────────────────────────────────────────────────────────────────────

/** Per-set percentages for an item, however it was authored. */
const pcts = (ex) => ex.percentScheme ?? Array(ex.sets).fill(ex.percentOfMax);
const loaded = (ex) => ex.percentOfMax != null || Boolean(ex.percentScheme);
const everyItem = (p) => p.blocks.flatMap((b) => b.workouts.flatMap((w) => w.main.map((ex) => [ex, w, b])));

test('specializations: every percentage is a real percentage', () => {
  for (const [ex, where] of everyPrescription()) {
    if (!loaded(ex)) continue;
    for (const v of pcts(ex)) {
      if (v == null) continue;
      assert.ok(Number.isFinite(v) && v > 0 && v <= 150, `${where} percentage out of range: ${v}`);
    }
  }
});

test('specializations: a per-set percentage list matches its set count exactly', () => {
  // Shorter silently leaves later sets unloaded; longer prescribes sets that do not exist.
  for (const [ex, where] of everyPrescription()) {
    if (!ex.percentScheme) continue;
    assert.equal(ex.percentScheme.length, ex.sets, `${where} percentScheme disagrees with its set count`);
  }
});

test('specializations: a borrowed percentage names a lift that is really in the catalog', () => {
  for (const [ex, where] of everyPrescription()) {
    if (!ex.percentOf) continue;
    assert.ok(catalogIds.has(ex.percentOf), `${where} percentOf points at nothing: ${ex.percentOf}`);
  }
});

/**
 * THE RULE THAT COST A ROUND ALREADY.
 *
 * Squat Ascent's first draft asked for a "Tempo Squat max" and a "Pause Squat max" — numbers nobody has
 * ever tested — because two variations carried a percentage and no `percentOf`, so each defaulted to its
 * own catalog key. Every one of those prescriptions rendered with no weight against it.
 *
 * Exactly ONE lift per block is a lift you test. Every relative of it borrows that number.
 */
test('specializations: a VARIATION of the specialized lift never asks for a max of its own', () => {
  for (const { p, tested, family } of SPECIALIZATIONS) {
    for (const [ex, w] of everyItem(p)) {
      if (!loaded(ex) || !family.test(ex.catalogKey)) continue;
      if (ex.catalogKey === tested) {
        assert.equal(ex.percentOf, undefined, `${p.id} ${w.name}: the tested lift borrows from nobody`);
      } else {
        assert.equal(ex.percentOf, tested, `${p.id} ${w.name}: ${ex.displayName} must borrow ${tested}`);
      }
    }
  }
});

test('specializations: the gate asks for at most three maxes, and never for a variation', () => {
  for (const { p, tested, family } of SPECIALIZATIONS) {
    const keys = new Set();
    for (const [ex] of everyItem(p)) if (loaded(ex)) keys.add(ex.percentOf ?? ex.catalogKey);
    assert.ok(keys.has(tested), `${p.id} must load its own specialized lift`);
    assert.ok(keys.size <= 3, `${p.id} asks for ${keys.size} maxes: ${[...keys].join(', ')}`);
    for (const k of keys) {
      if (k === tested) continue;
      assert.ok(!family.test(k), `${p.id} asks for a max of a variation: ${k}`);
    }
  }
});

test('specializations: peak intensity climbs every week and reaches a true max', () => {
  for (const { p, tested } of SPECIALIZATIONS) {
    const tops = p.blocks.map((b) =>
      Math.max(...b.workouts.flatMap((w) => w.main.filter((ex) => ex.catalogKey === tested).flatMap(pcts))),
    );
    for (let i = 1; i < tops.length; i += 1) {
      assert.ok(tops[i] > tops[i - 1], `${p.id} week ${i + 1} peaks at ${tops[i]}%, no higher than week ${i}`);
    }
    assert.equal(tops.at(-1), 100, `${p.id} must finish on a real max attempt`);
  }
});

test('specializations: volume peaks mid-block and the final week is the lightest', () => {
  // Volume climbing into a test day is how you arrive at the test tired.
  for (const { p, tested } of SPECIALIZATIONS) {
    const vols = p.blocks.map((b) =>
      b.workouts
        .flatMap((w) => w.main.filter((ex) => ex.catalogKey === tested))
        .reduce((a, ex) => a + (ex.repScheme ?? Array(ex.sets).fill(ex.reps)).reduce((x, y) => x + y, 0), 0),
    );
    assert.ok(vols.indexOf(Math.max(...vols)) < vols.length - 1, `${p.id} volume peaks in the final week`);
    assert.equal(Math.min(...vols), vols.at(-1), `${p.id} test week is not the lightest`);
  }
});

test('specializations: a near-max is rehearsed before it is tested', () => {
  // Test day must not be the first time in a month the athlete has been under a heavy bar.
  for (const { p, tested } of SPECIALIZATIONS) {
    const before = p.blocks
      .slice(0, -1)
      .flatMap((b) => b.workouts.flatMap((w) => w.main.filter((ex) => ex.catalogKey === tested).flatMap(pcts)));
    assert.ok(Math.max(...before) >= 90, `${p.id} has nothing at or above 90% before the test week`);
  }
});

/**
 * THE DEADLIFT IS NOT THE SQUAT, AND A TEMPLATE MUST NOT SAY OTHERWISE.
 *
 * The squat and the bench tolerate daily submaximal work. Heavy pulling does not. A later edit that
 * "harmonises" the three blocks onto one frequency would be the template writing the training, so the
 * difference is asserted here rather than left to a Design Record nobody re-reads.
 */
/** A session is HEAVY in a lift when it takes that lift to 80% or above. */
const HEAVY_PCT = 80;
const topPctOf = (w, key) => {
  const items = w.main.filter((ex) => ex.catalogKey === key);
  const all = items.flatMap(pcts).filter((v) => v != null);
  return all.length ? Math.max(...all) : 0;
};

/**
 * THE RULE IS ABOUT PULLS, NOT ABOUT SESSIONS.
 *
 * This first asserted four sessions a week, which conflated the two and made the block look like it
 * trained less than its siblings. It trains just as often — five days, like the squat and bench blocks.
 * What is rationed is the COMPETITION PULL: twice a week, never heavy in back-to-back sessions. The
 * other three days carry variations, squat work and pressing, which build the same positions at a
 * fraction of the spinal cost.
 */
test('the deadlift block pulls twice a week, and never heavy twice in a row', () => {
  assert.equal(dl.frequencyPerWeek, 5, 'trains as often as its siblings');
  for (const b of dl.blocks) {
    const pulls = b.workouts.map((w) => w.main.some((ex) => ex.catalogKey === 'barbell-deadlift'));
    assert.equal(pulls.filter(Boolean).length, 2, `${b.label} does not pull exactly twice`);
    /*
     * HEAVY, not merely present. The first draft of this test asserted no two consecutive PULLING
     * sessions and failed on week 4 — a 68% speed double followed by the test. That pairing is correct
     * peaking practice, not a risk, and the test was measuring the wrong thing. What must never happen
     * is two consecutive sessions that both take the bar to 80%+.
     */
    const heavy = b.workouts.map((w) => topPctOf(w, 'barbell-deadlift') >= HEAVY_PCT);
    for (let i = 1; i < heavy.length; i += 1) {
      assert.ok(!(heavy[i] && heavy[i - 1]), `${b.label} pulls heavy in back-to-back sessions`);
    }
  }
});

test('the squat and bench blocks train their lift — or a variation of it — in every session', () => {
  /*
   * The premise is the LIFT, not one catalog row. Squat Ascent's "Tempo Control" day trains the tempo
   * squat, the front squat and Bulgarians and never touches `barbell-back-squat` — which is the session
   * working as designed. An exact-key assertion here called that a defect.
   */
  for (const { p, family } of [SPECIALIZATIONS[0], SPECIALIZATIONS[1]]) {
    for (const b of p.blocks) {
      for (const w of b.workouts) {
        assert.ok(
          w.main.some((ex) => family.test(ex.catalogKey)),
          `${p.id} ${b.label} ${w.code} (${w.name}) trains nothing from the specialized family`,
        );
      }
    }
  }
});

/**
 * `lower` is only correct inside a declared `upper_lower` structure; otherwise a lower-body session is
 * `legs` (`schema.ts`, resolver spec §08). Squat Ascent shipped with `lower` and no structure — found by
 * reading its sibling, not by any test, which is why there is now a test.
 */
test('a program with no declared structure never claims an upper_lower split', () => {
  for (const p of all) {
    if (p.structure === 'upper_lower') continue;
    for (const b of p.blocks) {
      for (const w of b.workouts) {
        assert.notEqual(w.split, 'lower', `${p.id} ${w.code}: use 'legs' — 'lower' needs an upper_lower structure`);
      }
    }
  }
});

test('specializations: four weeks, no gap or overlap, and no claimed LOCK', () => {
  for (const { p } of SPECIALIZATIONS) {
    const covered = p.blocks.flatMap((b) =>
      Array.from({ length: b.weekEnd - b.weekStart + 1 }, (_, i) => b.weekStart + i),
    );
    assert.deepEqual(covered.sort((a, b) => a - b), [1, 2, 3, 4], `${p.id} week coverage`);
    assert.equal(p.durationWeeks, 4);
    for (const b of p.blocks) assert.equal(b.workouts.length, p.frequencyPerWeek, `${p.id} ${b.label} size`);
    assert.notEqual(p.status, 'LOCKED', `${p.id} claims a lock nobody signed`);
    assert.ok(p.sourceFile.endsWith('.md'), `${p.id} should cite a Design Record`);
    assert.ok(p.name.length <= 60, `${p.id} exceeds the PAS-D1 hard limit`);
    assert.equal(p.successorName, null, `${p.id} is a standalone block`);
  }
});

/**
 * ── EVERY AUTHORED PROGRAM IS ACTUALLY IN THE APP ────────────────────────────────────────────────────
 *
 * A PROGRAM IS IN THE CATALOGUE BECAUSE IT IS IN `DEFINITIONS`, NOT BECAUSE ITS FILE EXISTS.
 *
 * `Within Reach` and `Strength Builder I` were authored, schema-valid, wired into the recommender, and
 * verified movement-by-movement against the visible catalogue — and were still invisible to every
 * athlete, because `index.ts` had not been told about them. Nothing failed: the recommender resolved
 * their ids, the program guards passed, and every test in this file reads the DIRECTORY, which is exactly
 * where they were. The web bundle is what told on it.
 *
 * Reads the index as TEXT rather than importing it: the module pulls in sixteen JSON files, which
 * `node --test` cannot resolve without import attributes.
 *
 * Names are compared as trimmed LINES rather than by a built regex. The first version used
 * `new RegExp("\b" + name + ",")`, and in a JS string that escape is a BACKSPACE character rather than a
 * word boundary — so it matched nothing and reported all sixteen programs unregistered while they were
 * registered fine. Exact line matching needs no escaping and cannot fail in that direction.
 */
test('every program file is registered in index.ts, and every registration has a file', () => {
  const indexSrc = readFileSync(join(PROGRAMS, 'index.ts'), 'utf8');
  const from = indexSrc.indexOf('const DEFINITIONS');
  const listedNames = new Set(
    indexSrc
      .slice(from, indexSrc.indexOf('as unknown as', from))
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.endsWith(',') && !l.includes(' '))
      .map((l) => l.slice(0, -1)),
  );

  const importPairs = [...indexSrc.matchAll(/import (\w+) from '\.\/([a-z0-9-]+)\.json'/g)];
  const imported = new Set(importPairs.map((m) => m[2]));
  const listed = new Set(importPairs.filter((m) => listedNames.has(m[1])).map((m) => m[2]));

  const onDisk = readdirSync(PROGRAMS)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));

  assert.ok(listed.size > 0, 'parsed no registrations at all — this test would pass vacuously');
  assert.deepEqual(
    onDisk.filter((f) => !listed.has(f)),
    [],
    'authored but invisible to athletes — add them to DEFINITIONS',
  );
  assert.deepEqual(
    [...imported].filter((f) => !onDisk.includes(f)),
    [],
    'index.ts imports a program file that does not exist',
  );
  assert.deepEqual(
    [...imported].filter((f) => !listed.has(f)),
    [],
    'imported but missing from DEFINITIONS — the import alone does nothing',
  );
});
