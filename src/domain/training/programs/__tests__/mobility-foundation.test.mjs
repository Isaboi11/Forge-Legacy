/**
 * mobility-foundation.test.mjs — the acceptance gate for Sort 23, held to
 * `Docs/Mobility-Foundation-Blueprint-v1.0.md` (LOCKED).
 *
 * ══ WHAT IS DIFFERENT ABOUT THIS ONE ══
 *
 * Every other program in the catalog is sets and reps with a warm-up in front of it. This one is
 * MAIN-only (PAS-D9), its work is measured in seconds, and its progressed variable is how long the
 * athlete stays in a position rather than how much they lift or how many times. Almost none of the
 * shared rules in `programs.test.mjs` can see whether that is true, so the rules that matter live here.
 *
 * ══ THE ONE THE BLUEPRINT CARES ABOUT MOST ══
 *
 * §4 and §9: at BEGINNER the ONLY thing that progresses is hold duration. The harder-variation lever —
 * deeper positions, more demanding poses — is deliberately withheld, because it is the entire content
 * boundary Mobility Intermediate must later prove it crosses (§9's three-part falsifiable test). A
 * well-meaning edit that swaps in a couch stretch at week 4 would look like a coaching improvement and
 * would quietly spend the successor's only means of differentiation. `the exercise selection is
 * identical in every week` is the test that stops it.
 *
 * Run:  node --test --experimental-strip-types src/domain/training/programs/__tests__/mobility-foundation.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { structureFromDefinition } from '../../../program/adopt-core.ts';
import { schemeText } from '../../../program/prescription.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const p = JSON.parse(readFileSync(join(HERE, '..', 'mobility-foundation.json'), 'utf8'));
const SOURCE = join(HERE, '..', '..', '..', 'exercise-relationships', 'source');
const EXERCISES = JSON.parse(readFileSync(join(SOURCE, 'exercises.json'), 'utf8'));
const byId = new Map(EXERCISES.map((e) => [e.id, e]));

const sessions = p.blocks.flatMap((b) => b.workouts);
const everyItem = sessions.flatMap((w) => w.main);
const isHold = (ex) => ex.durationSec != null;

// ── the Blueprint's locked metadata ─────────────────────────────────────────

test('the catalog metadata is the Blueprint’s, not a judgement call', () => {
  assert.equal(p.id, 'mobility-foundation');
  assert.equal(p.name, 'Mobility Foundation');
  assert.equal(p.family, 'Mobility');
  assert.equal(p.difficulty, 'Beginner');
  assert.equal(p.durationWeeks, 4);
  assert.equal(p.frequencyPerWeek, 5);
  assert.equal(p.successorName, 'Mobility Intermediate');
  assert.equal(sessions.length, 20, 'the Blueprint fixes 20 total workouts');
  assert.ok(p.name.length <= 60, 'PAS-D1 hard limit');
  // Not `LOCKED`: Lock Approval is the product owner's signature and this repo cannot give it itself.
  assert.notEqual(p.status, 'LOCKED');
  assert.ok(p.sourceFile.endsWith('.md'), 'authored in-repo against a Design Record, not a .docx');
});

test('no deload, because there is no fatigue to discharge', () => {
  // PAS-D7: under 7 weeks, none is mandatory — and §6 argues a low-intensity practice accumulates none.
  // Asserted as the absence of a week that trains less than the others, which is what a deload IS.
  const sizes = new Set(p.blocks.map((b) => b.workouts.length));
  assert.deepEqual([...sizes], [5], 'a week with a different session count is a deload nobody authored');
  assert.ok(!/deload/i.test(JSON.stringify(p.blocks.map((b) => b.label))), 'a block is labelled as a deload');
});

// ── the family's structural signature ───────────────────────────────────────

/**
 * MOBILITY is the catalog's one MAIN-only family (PAS-D9, Blueprint §3). Everywhere else an empty
 * `warmup` would be the 2026-08-06 sweep having stripped a session bare; here it is the specification.
 * Asserted so that a future pass "restoring" the warm-ups this family is defined by not having fails.
 */
test('every session is MAIN-only — the family’s signature, not a gap', () => {
  for (const w of sessions) {
    assert.deepEqual(w.warmup, [], `${w.code} authored a warm-up; MOBILITY is MAIN-only`);
    assert.equal(w.modality, 'mobility', `${w.code} modality`);
    assert.ok(w.main.length >= 5 && w.main.length <= 10, `${w.code} has ${w.main.length} items (PAS-D11: 5–10)`);
  }
});

/**
 * §3's sequencing rule, and the one a coach would notice first: static stretching NEVER precedes the
 * dynamic work. Stretching cold is how people get hurt doing the thing that is supposed to prevent it.
 */
test('nothing is held before the joint has been moved', () => {
  for (const w of sessions) {
    const firstHold = w.main.findIndex(isHold);
    const lastDynamic = w.main.map(isHold).lastIndexOf(false);
    const holds = w.main.filter(isHold);
    const timedOpener = isHold(w.main[0]) && w.main[0].durationSec >= 60;
    /*
     * The opener is allowed to be timed — a session may open with BREATHWORK, which is prescribed in
     * seconds and is not a stretch. It is told apart by duration: the breathing drills run 60s and up,
     * every stretch runs 50s or less. So the rule is applied to what follows the opener.
     */
    const body = timedOpener ? w.main.slice(1) : w.main;
    const bodyFirstHold = body.findIndex(isHold);
    const bodyLastDynamic = body.map(isHold).lastIndexOf(false);
    assert.ok(holds.length > 0, `${w.code} ends in no holds at all`);
    assert.ok(bodyLastDynamic >= 0, `${w.code} has no dynamic work`);
    assert.ok(
      bodyFirstHold > bodyLastDynamic,
      `${w.code}: a static hold sits before dynamic work (first hold ${bodyFirstHold}, last drill ${bodyLastDynamic})`,
    );
    assert.ok(firstHold >= 0 && lastDynamic >= 0);
  }
});

test('a session opens with breathwork or global movement, never with the day’s deepest position', () => {
  for (const w of sessions) {
    const open = w.main[0];
    const opensGlobal = ['cat-cow', 'inchworm'].includes(open.catalogKey);
    const opensBreath = isHold(open) && open.durationSec >= 60;
    assert.ok(opensGlobal || opensBreath, `${w.code} opens on ${open.displayName}`);
  }
});

// ── Time-Based Progression (Model 5) ────────────────────────────────────────

/** The holds of one week, by session and position, so weeks can be compared item for item. */
const holdsOf = (block) =>
  block.workouts.flatMap((w) => w.main.map((ex, i) => ({ at: `${w.code}[${i}]`, sec: ex.durationSec ?? null })));

test('hold duration is the progressed variable, and it only ever goes up', () => {
  for (let i = 1; i < p.blocks.length; i++) {
    const prev = holdsOf(p.blocks[i - 1]);
    const cur = holdsOf(p.blocks[i]);
    assert.equal(prev.length, cur.length, `${p.blocks[i].label} is not the same shape as the week before`);
    let grew = 0;
    for (let j = 0; j < cur.length; j++) {
      assert.equal(prev[j].at, cur[j].at, 'the sessions moved between weeks');
      if (cur[j].sec == null) {
        assert.equal(prev[j].sec, null, `${cur[j].at} stopped being timed`);
        continue;
      }
      assert.ok(cur[j].sec >= prev[j].sec, `${p.blocks[i].label} ${cur[j].at} got SHORTER: ${prev[j].sec} → ${cur[j].sec}`);
      if (cur[j].sec > prev[j].sec) grew++;
    }
    assert.ok(grew > 0, `${p.blocks[i].label} progressed nothing — a week that repeats is not a block`);
  }
});

/**
 * ⚠ THE LEVER THAT BELONGS TO THE SUCCESSOR.
 *
 * Blueprint §4: progression here is duration-only ON A FOUNDATIONAL VARIATION SET. §9 then makes the
 * whole Foundation ↔ Intermediate distinction rest on Intermediate introducing harder variations —
 * which only works if this program never does. Swapping a deeper pose into week 4 would read as good
 * coaching and would spend the successor's only means of being a different program.
 */
test('the exercise selection is identical in every week — the harder-variation lever is untouched', () => {
  const shapeOf = (block) =>
    block.workouts.map((w) => `${w.code}:${w.split}:${w.main.map((ex) => ex.catalogKey).join(',')}`).join('|');
  const first = shapeOf(p.blocks[0]);
  for (const b of p.blocks.slice(1)) {
    assert.equal(shapeOf(b), first, `${b.label} changed the movements; only the durations may change`);
  }
});

test('the dynamic drills never progress — this is not a volume program', () => {
  const drillsOf = (block) =>
    block.workouts.flatMap((w) => w.main.filter((ex) => !isHold(ex)).map((ex) => `${ex.catalogKey} ${ex.sets}x${ex.reps}`));
  const first = drillsOf(p.blocks[0]);
  for (const b of p.blocks.slice(1)) {
    assert.deepEqual(drillsOf(b), first, `${b.label} changed a drill's sets or reps; duration is the only variable`);
  }
});

test('the deepest holds are never front-loaded into week 1', () => {
  const longest = (b) => Math.max(...b.workouts.flatMap((w) => w.main.filter(isHold).map((ex) => ex.durationSec)));
  const week1 = longest(p.blocks[0]);
  const week4 = longest(p.blocks[3]);
  assert.ok(week4 > week1, `week 4 (${week4}s) must ask for more than week 1 (${week1}s)`);
  const stretches = p.blocks[0].workouts.flatMap((w) => w.main.filter((ex) => isHold(ex) && ex.durationSec < 60));
  assert.ok(stretches.every((ex) => ex.durationSec <= 30), 'week 1 asks a beginner to hold something for too long');
});

// ── what the athlete can actually do at home ────────────────────────────────

/**
 * The Blueprint says HOME, and the equipment gate cannot enforce it — `foam-roll-quadriceps` and
 * `thoracic-extension-on-bench` are both `equipmentId: 'bodyweight'`, because the field records what
 * you LOAD and not what you need to own. That is exactly the hole Close Quarters' bench fell through.
 * Here it is closed by NAME, on the small list of things this program is not allowed to assume.
 */
const FORBIDDEN = /foam[- ]?roll|lacrosse|bench|hang|kettlebell|band/i;

test('nothing here needs equipment a beginner at home may not own', () => {
  for (const ex of everyItem) {
    const row = byId.get(ex.catalogKey);
    assert.ok(row, `${ex.catalogKey} is not in the catalog`);
    assert.equal(row.equipmentId, 'bodyweight', `${ex.displayName} needs ${row.equipmentId}`);
    assert.doesNotMatch(ex.catalogKey, FORBIDDEN, `${ex.displayName} assumes a tool this program cannot recommend`);
  }
});

/**
 * §10.2 asks for 10–30 minutes, the shortest sessions in the catalog. Holds run their own clock; a drill
 * rep is counted at a slow 4 seconds, which is what a mobility rep is; rests are transitions and count.
 *
 * ⚠ **WEEK 1 LANDS AT 8.0–9.6 MINUTES, UNDER THE BLUEPRINT'S OWN FLOOR, AND IS LEFT THERE.** Reaching 10
 * would mean lengthening week 1's holds past what a beginner should be asked to hold, or adding drills
 * that then cannot progress — bending the training to hit a number in a table, which is the exact error
 * the 2026-08-06 coaching audit found in Muscle Building Intermediate's twelve sets of lateral raises.
 * The Blueprint itself says the 5-day cadence is "practice consistency, not training stress" (§6), and a
 * nine-minute session that grows to thirteen is how a five-day habit survives its first week.
 *
 * ↩️ It was first written up as a STANDARD CONFLICT and it is not one. §10.2 calls its own ranges
 * "quality-review guidelines, not import rules" and asks for a written note when a program falls
 * outside — which the Design Record §7 is. The program is compliant by the route the Standard specifies.
 * The floor below stays at 5 deliberately: it guards against a session collapsing to nothing, and the
 * CEILING is asserted exactly, because the ceiling is the half that protects the athlete.
 */
test('every session is short enough to actually be done five times a week', () => {
  const minutes = (w) => {
    const sec = w.main.reduce((t, ex) => {
      const sides = ex.per ? 2 : 1;
      const work = isHold(ex) ? ex.durationSec * sides : ex.sets * ex.reps * 4 * sides;
      return t + work + (ex.restSec ?? 0) * ex.sets;
    }, 0);
    return sec / 60;
  };
  for (const b of p.blocks) {
    for (const w of b.workouts) {
      const m = minutes(w);
      assert.ok(m >= 5 && m <= 30, `${b.label} ${w.code} runs ~${m.toFixed(1)} min (§10.2 ceiling is 30)`);
    }
  }
});

// ── the week rotates, rather than doing the same thing five times ───────────

test('the five sessions cover the body rather than repeating one region', () => {
  const week = p.blocks[0].workouts;
  assert.deepEqual(week.map((w) => w.code), ['A', 'B', 'C', 'D', 'E']);
  assert.equal(new Set(week.map((w) => w.name)).size, 5, 'two sessions share a name');
  const splits = new Set(week.map((w) => w.split));
  for (const s of ['core', 'legs', 'upper', 'full_body']) {
    assert.ok(splits.has(s), `no session covers ${s}`);
  }
  // A region worked every single day is the thing §2's rotation exists to prevent.
  const counts = new Map();
  for (const w of week) for (const ex of w.main) counts.set(ex.catalogKey, (counts.get(ex.catalogKey) ?? 0) + 1);
  for (const [key, n] of counts) assert.ok(n <= 2, `${key} appears in ${n} of the 5 sessions`);
});

// ── the crossing to the athlete ─────────────────────────────────────────────

test('a per-side hold reaches the athlete saying which side', () => {
  const perSide = everyItem.filter((ex) => ex.per);
  assert.ok(perSide.length > 50, `expected most holds to be per side, found ${perSide.length}`);
  assert.ok(perSide.every((ex) => ex.per === 'side' || ex.per === 'leg'));

  // End to end: the JSON, through adoption, to the line the athlete reads.
  const structure = structureFromDefinition(p);
  assert.equal(structure.weeks, 4);
  assert.ok(structure.vary, 'four blocks must produce per-week plans, or the progression is thrown away');
  const week4 = structure.weekPlans[3].days;
  const held = week4.flatMap((d) => d.main).find((x) => x.catalogKey === '90-90-hip-stretch');
  assert.ok(held, 'the 90/90 hip stretch did not survive adoption');
  assert.equal(schemeText(held), '50s per side');
});

test('the adopted week 1 and week 4 are not the same session', () => {
  const structure = structureFromDefinition(p);
  const line = (wk, key) => {
    const ex = structure.weekPlans[wk].days.flatMap((d) => d.main).find((x) => x.catalogKey === key);
    return ex ? schemeText(ex) : null;
  };
  assert.equal(line(0, 'child-s-pose'), '20s');
  assert.equal(line(3, 'child-s-pose'), '50s');
});
