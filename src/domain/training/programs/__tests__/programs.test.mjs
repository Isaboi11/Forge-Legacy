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
/** Every shipped definition, however it was authored. Structural rules apply to all of them. */
const all = [i3, ii4, ie, sq, bp, dl];
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
