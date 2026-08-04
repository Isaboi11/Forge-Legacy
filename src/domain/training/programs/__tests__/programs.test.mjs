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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { MODALITIES, SPLITS, PROGRAM_THEMES, PROGRAM_FAMILIES, PROGRAM_STRUCTURES } from '../../schema.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROGRAMS = join(HERE, '..');
const CATALOG = join(HERE, '..', '..', '..', 'exercise-relationships', 'source', 'exercises.json');
const catalogIds = new Set(JSON.parse(readFileSync(CATALOG, 'utf8')).map((e) => e.id));

const load = (f) => JSON.parse(readFileSync(join(PROGRAMS, f), 'utf8'));
const i3 = load('strength-foundation-i-3day.json');
const ii4 = load('strength-foundation-ii-4day.json');
const ie = load('iron-and-engine.json');
const sq = load('squat-ascent-intermediate.json');

/** GENERATED from `.docx` — the ingest owns these. */
const generated = [i3, ii4];
/** Every shipped definition, however it was authored. Structural rules apply to all of them. */
const all = [i3, ii4, ie, sq];
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

test('warm-ups are preserved as freeform prep (not catalog-linked)', () => {
  const w = i3.blocks[0].workouts[0];
  assert.ok(Array.isArray(w.warmup) && w.warmup.length > 0);
  for (const item of w.warmup) assert.ok(item.text && !('catalogKey' in item));
});

/**
 * ── IRON & ENGINE, AGAINST THE PRODUCTION STANDARD ──────────────────────────────────────────────────
 *
 * The Standard is a document; these are the parts of it a machine can hold us to. The rest — "confidence
 * before complexity", the coaching audit — lives in the Design Record, where a human signs it.
 */

test('Iron & Engine: the Standard\'s warm-up shape, every session', () => {
  for (const b of ie.blocks) {
    for (const w of b.workouts) {
      // 1 general + 1–2 pattern prep + 1 rehearsal, and a hard ceiling: warm-ups are not workouts.
      assert.ok(w.warmup.length >= 3 && w.warmup.length <= 4, `${b.label} ${w.code} warm-up length`);
      for (const item of w.warmup) assert.ok(item.text && !('catalogKey' in item));
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
// Squat Ascent — the first percentage-loaded program in the catalog
// ─────────────────────────────────────────────────────────────────────────────

/** Per-set percentages for an item, however it was authored. */
const pcts = (ex) => ex.percentScheme ?? Array(ex.sets).fill(ex.percentOfMax);

test('Squat Ascent: every percentage is a real percentage', () => {
  for (const [ex, where] of everyPrescription()) {
    if (ex.percentOfMax == null && !ex.percentScheme) continue;
    for (const p of pcts(ex)) {
      if (p == null) continue;
      assert.ok(Number.isFinite(p) && p > 0 && p <= 150, `${where} percentage out of range: ${p}`);
    }
  }
});

test('Squat Ascent: a per-set percentage list matches its ladder exactly', () => {
  // A shorter list silently leaves later sets unloaded; a longer one prescribes sets that do not exist.
  for (const [ex, where] of everyPrescription()) {
    if (!ex.percentScheme) continue;
    assert.equal(ex.percentScheme.length, ex.sets, `${where} percentScheme disagrees with its set count`);
  }
});

test('Squat Ascent: a borrowed percentage names a lift that is really in the catalog', () => {
  for (const [ex, where] of everyPrescription()) {
    if (!ex.percentOf) continue;
    assert.ok(catalogIds.has(ex.percentOf), `${where} percentOf points at nothing: ${ex.percentOf}`);
  }
});

test('Squat Ascent: the front squat borrows the BACK squat max, never its own', () => {
  // Resolving 48% against an untested front-squat max would put a materially wrong bar in front of the
  // athlete, with full confidence. This is the one relationship the schema cannot infer.
  const fronts = sq.blocks.flatMap((b) =>
    b.workouts.flatMap((w) => w.main.filter((ex) => ex.catalogKey === 'barbell-front-squat')),
  );
  assert.ok(fronts.length > 0, 'expected front squat work');
  for (const f of fronts) assert.equal(f.percentOf, 'barbell-back-squat');
});

test('Squat Ascent: the squat is trained every single session', () => {
  // The whole premise. A session without it is a different program.
  for (const b of sq.blocks) {
    for (const w of b.workouts) {
      const hasSquat = w.main.some((ex) => /squat/.test(ex.catalogKey));
      assert.ok(hasSquat, `${b.label} ${w.code} has no squat in it`);
    }
  }
});

test('Squat Ascent: peak intensity climbs every week, and reaches a true max', () => {
  const tops = sq.blocks.map((b) =>
    Math.max(
      ...b.workouts.flatMap((w) =>
        w.main.filter((ex) => ex.catalogKey === 'barbell-back-squat').flatMap((ex) => pcts(ex)),
      ),
    ),
  );
  for (let i = 1; i < tops.length; i += 1) {
    assert.ok(tops[i] > tops[i - 1], `week ${i + 1} peaks at ${tops[i]}%, no higher than week ${i}`);
  }
  assert.equal(tops.at(-1), 100, 'the block has to finish on a real max attempt');
});

test('Squat Ascent: volume peaks mid-block and falls away into the test', () => {
  // Volume climbing into a test day is how you arrive at it tired. Week 4 must be the lightest.
  const vols = sq.blocks.map((b) =>
    b.workouts
      .flatMap((w) => w.main.filter((ex) => ex.catalogKey === 'barbell-back-squat'))
      .reduce((a, ex) => a + (ex.repScheme ?? Array(ex.sets).fill(ex.reps)).reduce((x, y) => x + y, 0), 0),
  );
  const peak = Math.max(...vols);
  assert.ok(vols.indexOf(peak) < vols.length - 1, 'volume must not peak in the final week');
  assert.equal(Math.min(...vols), vols.at(-1), 'the test week has to be the lightest');
});

test('Squat Ascent: a near-max is rehearsed before it is tested', () => {
  // Test day must not be the first time in a month the athlete has been under a heavy bar.
  const beforeTestWeek = sq.blocks.slice(0, -1).flatMap((b) =>
    b.workouts.flatMap((w) => w.main.filter((ex) => ex.catalogKey === 'barbell-back-squat').flatMap(pcts)),
  );
  assert.ok(Math.max(...beforeTestWeek) >= 90, 'nothing at or above 90% before the test week');
});

test('Squat Ascent: four weeks of blocks, no gap and no overlap', () => {
  const covered = sq.blocks.flatMap((b) => Array.from({ length: b.weekEnd - b.weekStart + 1 }, (_, i) => b.weekStart + i));
  assert.deepEqual(covered.sort((a, b) => a - b), [1, 2, 3, 4]);
  assert.equal(sq.durationWeeks, 4);
  for (const b of sq.blocks) assert.equal(b.workouts.length, sq.frequencyPerWeek);
});

test('Squat Ascent: it does not claim a LOCK nobody signed', () => {
  assert.notEqual(sq.status, 'LOCKED');
  assert.ok(sq.sourceFile.endsWith('.md'), 'an authored program cites a Design Record, not a .docx');
  assert.ok(sq.name.length <= 60, 'PAS-D1 hard limit');
});

test('Squat Ascent: a squat VARIATION never asks for a max of its own', () => {
  /*
   * Caught in review, not by the unit tests: the tempo squat and pause squat were authored with a
   * percentage and no `percentOf`, so each defaulted to its own catalog key. The entry gate then asked
   * the athlete for a "Tempo Squat max" and a "Pause Squat max" — numbers nobody has ever tested — and
   * every one of those prescriptions rendered with no weight against it.
   *
   * The rule: exactly ONE squat is a lift you test. Every other squat borrows its number.
   */
  const TESTED = 'barbell-back-squat';
  for (const b of sq.blocks) {
    for (const w of b.workouts) {
      for (const ex of w.main) {
        if (!/squat/.test(ex.catalogKey)) continue;
        if (ex.percentOfMax == null && !ex.percentScheme) continue;
        if (ex.catalogKey === TESTED) {
          assert.equal(ex.percentOf, undefined, `${w.name}: the tested lift borrows from nobody`);
        } else {
          assert.equal(ex.percentOf, TESTED, `${w.name}: ${ex.displayName} must borrow the back squat max`);
        }
      }
    }
  }
});

test('Squat Ascent: the gate asks for three maxes — the three lifts it actually loads', () => {
  const keys = new Set();
  for (const b of sq.blocks) {
    for (const w of b.workouts) {
      for (const ex of w.main) {
        if (ex.percentOfMax != null || ex.percentScheme) keys.add(ex.percentOf ?? ex.catalogKey);
      }
    }
  }
  assert.deepEqual(
    [...keys].sort(),
    ['barbell-back-squat', 'barbell-bench-press', 'barbell-deadlift'],
    'every extra key here is one more number the athlete is asked for before they can start',
  );
});
