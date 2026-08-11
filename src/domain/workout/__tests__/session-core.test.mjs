import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blockAt,
  breakBlock,
  endsSupersetRound,
  groupFieldsOf,
  groupKindOf,
  makeSuperset,
  nextInSuperset,
  sessionSetsFor,
  sessionToTemplateExercises,
  supersetRounds,
} from '../session-core.ts';

const targets = (sets) => sets.map((s) => s.targetReps);

test('a flat prescription builds the same sets it always did', () => {
  const sets = sessionSetsFor({ name: 'Bench Press', sets: 4, reps: 8 });
  assert.equal(sets.length, 4);
  assert.deepEqual(targets(sets), [8, 8, 8, 8]);
  assert.deepEqual(sets.map((s) => s.setIndex), [0, 1, 2, 3]);
  assert.ok(sets.every((s) => s.weight === null && s.actualReps === null && !s.done));
});

test('a ladder arrives as four DIFFERENT sets, not four identical ones', () => {
  const sets = sessionSetsFor({ name: 'Incline Bench Press', repScheme: [6, 6, 4, 4] });
  assert.deepEqual(targets(sets), [6, 6, 4, 4], 'the regression: this used to be [6, 6, 6, 6]');
});

test('a descending wave keeps its shape', () => {
  assert.deepEqual(targets(sessionSetsFor({ name: 'Barbell Squat', repScheme: [10, 8, 6, 4] })), [10, 8, 6, 4]);
});

test('a to-failure set is flagged and carries no invented rep count', () => {
  const sets = sessionSetsFor({ name: 'Dips', repScheme: ['F', 'F', 'F'] });
  assert.equal(sets.length, 3);
  assert.ok(sets.every((s) => s.toFailure === true));
  assert.deepEqual(targets(sets), [0, 0, 0], 'zero, so no fabricated volume and no fabricated PR');
});

test('a mixed ladder flags only the failure set', () => {
  const sets = sessionSetsFor({ name: 'EZ-Bar Upright Row', repScheme: [10, 10, 10, 'F'] });
  assert.deepEqual(sets.map((s) => !!s.toFailure), [false, false, false, true]);
  assert.deepEqual(targets(sets), [10, 10, 10, 0]);
});

test('a timed item carries its work time as a target, separate from what gets recorded', () => {
  const [set] = sessionSetsFor({ name: 'Banded Pull Aparts', durationSec: 30 });
  assert.equal(set.targetSec, 30, 'the ask');
  assert.equal(set.durationSec, undefined, 'the answer is not pre-filled with the question');
});

/**
 * ⚠ THE 60-SECOND PLANK THAT WAS STORED AS TEN REPS.
 *
 * `repTargets` fills an item prescribing no reps out to `DEFAULT_REPS`, which is right when somebody is
 * AUTHORING and wrong for a hold: a Plank prescribes `durationSec` and nothing else, so it arrived with
 * `targetReps: 10`, completing back-filled the actual to 10, and the save wrote "Plank — 10 reps" into
 * the athlete's history. Same fabrication a to-failure set was already protected from, same fix.
 */
test('a hold has no rep count, and never invents one', () => {
  const [set] = sessionSetsFor({ name: 'Plank', durationSec: 60 });
  assert.equal(set.targetReps, 0, 'a hold prescribes seconds, not repetitions');
  assert.equal(set.targetSec, 60);
  assert.equal(set.actualReps, null);
});

test('a timed item that ALSO names reps still reports zero — the clock is the whole ask', () => {
  // `schemeText` renders such an item as its duration alone, so the set underneath must agree.
  const [set] = sessionSetsFor({ name: 'Dead Hang', durationSec: 45, reps: 12 });
  assert.equal(set.targetReps, 0);
  assert.equal(set.targetSec, 45);
});

test('an ordinary set is untouched by the hold rule', () => {
  const sets = sessionSetsFor({ name: 'Bench Press', sets: 3, reps: 8 });
  assert.deepEqual(targets(sets), [8, 8, 8]);
});

test('a circuit member gets one set PER ROUND, because a round is what you tick off', () => {
  const sets = sessionSetsFor({ name: 'Burpees', reps: 10, groupId: 'hiit', groupRounds: 4 });
  assert.equal(sets.length, 4, 'four rounds of ten burpees is forty burpees and four rows');
  assert.deepEqual(targets(sets), [10, 10, 10, 10]);
});

test('an AMRAP member gets ONE row — nobody knows how many rounds are coming', () => {
  const sets = sessionSetsFor({ name: 'Wall Balls', reps: 20, groupId: 'a1', groupRounds: 3, groupCapSec: 600 });
  assert.equal(sets.length, 1, 'pre-drawing rows would either cap the athlete or invent ones they never owed');
});

test('a loose exercise is untouched by the round expansion', () => {
  assert.equal(sessionSetsFor({ name: 'Barbell Squat', repScheme: [5, 5, 5, 5, 5] }).length, 5);
});

test('circuit membership carries through so the logger can rebuild the same block', () => {
  const g = groupFieldsOf({ name: 'Wall Balls', groupId: 'a1', groupName: 'AMRAP #1', groupCapSec: 600 });
  assert.deepEqual(g, { groupId: 'a1', groupName: 'AMRAP #1', groupKind: undefined, groupRounds: undefined, groupCapSec: 600 });
});

test('a loose exercise reports no group rather than a falsy one', () => {
  assert.equal(groupFieldsOf({ name: 'Barbell Squat', sets: 5, reps: 5 }).groupId, undefined);
});

// ── BLOCKS: supersets and circuits ──────────────────────────────────────────────────────────────────

const exOf = (name, sets, group) => ({
  name,
  section: 'main',
  position: 0,
  sets: Array.from({ length: sets }, (_, i) => ({ setIndex: i, weight: null, targetReps: 8, actualReps: null, done: false })),
  ...(group ?? {}),
});
/** Mark (exercise, set) done. */
const log = (list, ei, si) =>
  list.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.map((s, j) => (j !== si ? s : { ...s, done: true })) }));

test('a block that never said what it is reads as a circuit', () => {
  // Every grouped block authored before supersets existed was a circuit. Absent must not become
  // "superset" or the shipped programs would silently change how they are performed.
  assert.equal(groupKindOf(undefined), 'circuit');
  assert.equal(groupKindOf({}), 'circuit');
  assert.equal(groupKindOf({ groupKind: 'circuit' }), 'circuit');
  assert.equal(groupKindOf({ groupKind: 'superset' }), 'superset');
});

test('a block is found by ADJACENCY, not by scanning the whole session for an id', () => {
  // Two blocks sharing an id sit apart. Filtering by id would report one six-exercise block.
  const list = [
    exOf('A', 3, { groupId: 'g1', groupKind: 'superset', groupRounds: 3 }),
    exOf('B', 3, { groupId: 'g1', groupKind: 'superset', groupRounds: 3 }),
    exOf('Loose', 3),
    exOf('C', 3, { groupId: 'g1', groupKind: 'superset', groupRounds: 3 }),
  ];
  const first = blockAt(list, 0);
  assert.equal(first.start, 0);
  assert.equal(first.count, 2, 'the run stops at the loose exercise');
  assert.equal(blockAt(list, 2), null, 'an ungrouped exercise is in no block');
  assert.equal(blockAt(list, 3).count, 1, 'the later run is its own block');
});

test('superset rounds come from the LONGEST member, so logged work is never hidden', () => {
  const list = makeSuperset([exOf('Press', 3), exOf('Row', 4)], 0, 2, 'g1');
  const b = blockAt(list, 0);
  assert.equal(supersetRounds(list, b), 4, 'four rounds — the fourth just has one lift in it');
  assert.equal(b.rounds, 4);
  assert.equal(b.kind, 'superset');
  assert.equal(b.name, 'Superset');
});

test('a superset advances ROUND-MAJOR — A1, B1, A2, B2 — which is what makes it a superset', () => {
  let list = makeSuperset([exOf('Press', 2), exOf('Row', 2)], 0, 2, 'g1');
  const b = () => blockAt(list, 0);

  assert.deepEqual(nextInSuperset(list, b()), { exIdx: 0, setIdx: 0, round: 0 }, 'A, round 1');
  list = log(list, 0, 0);
  assert.deepEqual(nextInSuperset(list, b()), { exIdx: 1, setIdx: 0, round: 0 }, 'then B, still round 1');
  list = log(list, 1, 0);
  assert.deepEqual(nextInSuperset(list, b()), { exIdx: 0, setIdx: 1, round: 1 }, 'back to A for round 2');
  list = log(list, 0, 1);
  assert.deepEqual(nextInSuperset(list, b()), { exIdx: 1, setIdx: 1, round: 1 });
  list = log(list, 1, 1);
  assert.equal(nextInSuperset(list, b()), null, 'block complete');
});

test('rest is owed after the LAST member of a round, never between A and B', () => {
  // This is the whole reason a superset is not two cards in a row: resting after A defeats it.
  let list = makeSuperset([exOf('Press', 2), exOf('Row', 2)], 0, 2, 'g1');
  const b = blockAt(list, 0);

  assert.equal(endsSupersetRound(list, b, 0, 0), false, 'B still owes round 1 — no rest yet');
  list = log(list, 0, 0);
  assert.equal(endsSupersetRound(list, b, 1, 0), true, 'B closes round 1 — rest now');
});

test('a member already logged out of order does not hold the round open', () => {
  // Somebody logged B's round-1 set first. Finishing A must still close the round.
  const list = log(makeSuperset([exOf('Press', 2), exOf('Row', 2)], 0, 2, 'g1'), 1, 0);
  assert.equal(endsSupersetRound(list, blockAt(list, 0), 0, 0), true);
});

test('breaking a superset leaves ordinary exercises and every logged set intact', () => {
  const grouped = log(makeSuperset([exOf('Press', 2), exOf('Row', 2), exOf('Curl', 2)], 0, 2, 'g1'), 0, 0);
  const flat = breakBlock(grouped, 0);

  assert.equal(blockAt(flat, 0), null);
  assert.ok(!('groupId' in flat[0]) && !('groupKind' in flat[0]), 'the group fields are gone, not nulled');
  assert.equal(flat[0].sets[0].done, true, 'the work survives the ungrouping');
  assert.equal(flat.length, 3);
  assert.deepEqual(flat[2], grouped[2], 'an exercise outside the block is untouched');
});

test('a superset needs at least two members', () => {
  const one = makeSuperset([exOf('Press', 3)], 0, 1, 'g1');
  assert.equal(blockAt(one, 0), null, 'one exercise is not a superset');
});

test('makeSuperset never touches exercises outside the run', () => {
  const list = makeSuperset([exOf('A', 3), exOf('B', 3), exOf('C', 3)], 0, 2, 'g1');
  assert.equal(list[2].groupId, undefined);
  assert.equal(blockAt(list, 0).count, 2);
});

test('a circuit keeps its own identity and its clock', () => {
  const list = [
    exOf('Burpee', 1, { groupId: 'c1', groupName: 'HIIT Finisher', groupRounds: 4, groupCapSec: 480 }),
    exOf('Wall Ball', 1, { groupId: 'c1', groupName: 'HIIT Finisher', groupRounds: 4, groupCapSec: 480 }),
  ];
  const b = blockAt(list, 1);
  assert.equal(b.kind, 'circuit', 'no groupKind means circuit');
  assert.equal(b.name, 'HIIT Finisher');
  assert.equal(b.capSec, 480, 'the AMRAP cap survives');
});

test('groupFieldsOf carries the kind through from the program', () => {
  assert.equal(groupFieldsOf({ name: 'x', groupId: 'g', groupKind: 'superset' }).groupKind, 'superset');
  assert.equal(groupFieldsOf({ name: 'x', groupId: 'g' }).groupKind, undefined, 'absent stays absent');
});

// ── percentage prescriptions carry the bar they ask for ──────────────────────

const LOAD = { maxes: { 'back-squat': 405 }, unit: 'lb', rules: { increment: 5, bar: 45 } };

test('a percentage prescription puts the resolved bar on every set', () => {
  const ex = { name: 'Back Squat', catalogKey: 'back-squat', sets: 5, reps: 5, percentOfMax: 75 };
  const sets = sessionSetsFor(ex, LOAD);
  assert.equal(sets.length, 5);
  assert.deepEqual(sets.map((s) => s.targetWeight), [305, 305, 305, 305, 305]);
});

test('THE ASK IS NOT THE ANSWER — weight stays unentered', () => {
  // Seeding `weight` from the target would record a lift the athlete never made the moment they
  // finished a session without touching a set, and could announce a personal record for it.
  const ex = { name: 'Back Squat', catalogKey: 'back-squat', sets: 3, reps: 5, percentOfMax: 75 };
  for (const s of sessionSetsFor(ex, LOAD)) {
    assert.equal(s.weight, null);
    assert.equal(s.targetWeight, 305);
  }
});

test('a ramp carries one bar per rung', () => {
  const ex = {
    name: 'Back Squat',
    catalogKey: 'back-squat',
    repScheme: [5, 4, 3, 2, 1],
    percentScheme: [65, 75, 80, 87, 92],
  };
  const sets = sessionSetsFor(ex, LOAD);
  assert.deepEqual(sets.map((s) => s.targetReps), [5, 4, 3, 2, 1]);
  assert.deepEqual(sets.map((s) => s.targetWeight), [265, 305, 325, 350, 375]);
});

test('a percentage against a lift with no max carries no target weight', () => {
  const ex = { name: 'Bench Press', catalogKey: 'bench-press', sets: 5, reps: 5, percentOfMax: 75 };
  for (const s of sessionSetsFor(ex, LOAD)) {
    assert.equal(s.targetWeight, undefined, 'absent, never 0 — a 0 lb target is a false claim');
  }
});

test('a percentage borrowed from another lift resolves against THAT lift', () => {
  const ex = {
    name: 'Front Squat',
    catalogKey: 'front-squat',
    sets: 3,
    reps: 4,
    percentOfMax: 45,
    percentOf: 'back-squat',
  };
  assert.deepEqual(sessionSetsFor(ex, LOAD).map((s) => s.targetWeight), [180, 180, 180]);
});

test('a program without percentages is untouched by any of this', () => {
  const ex = { name: 'Chin Up', catalogKey: 'chin-up', sets: 4, reps: 6 };
  for (const s of sessionSetsFor(ex, LOAD)) assert.equal(s.targetWeight, undefined);
  // And with no context at all, which is every session built before this existed.
  for (const s of sessionSetsFor(ex)) assert.equal(s.targetWeight, undefined);
});

test('a circuit member repeats its bar across the rounds a round-per-set expansion creates', () => {
  const ex = {
    name: 'Back Squat',
    catalogKey: 'back-squat',
    reps: 3,
    groupId: 'g1',
    groupRounds: 4,
    percentOfMax: 70,
  };
  const sets = sessionSetsFor(ex, LOAD);
  assert.equal(sets.length, 4, 'four rounds are four rows to tick off');
  assert.deepEqual(sets.map((s) => s.targetWeight), [285, 285, 285, 285]);
});

// ── snapshotting a live session for someone joining it (0121) ────────────────
//
// From the PO: *"in the middle of a workout you should be able to invite someone and have them join
// where you're at in that workout."* The invite carries the WORKOUT, not a pointer to it (0093) — the
// guest may not own the program it came from — so the live session has to be reduced to the four fields
// 0093 defined, and the host's position has to be expressed in terms of THAT list.

const lift = (name, sets, targetReps = 8, catalogKey = null) => ({
  name,
  catalogKey,
  section: 'main',
  position: 0,
  sets: Array.from({ length: sets }, (_, i) => ({ setIndex: i, targetReps, weight: 185, actualReps: 8, done: true })),
});
const run = () => ({ name: 'Run', kind: 'cardio', activity: 'run', section: 'main', position: 0, sets: [{ setIndex: 0, targetReps: 0, weight: null, actualReps: null, done: false }] });

test('a live session reduces to the four fields an invite carries', () => {
  const out = sessionToTemplateExercises([lift('Back Squat', 4, 5, 'back-squat'), lift('Leg Press', 3, 12)]);
  assert.deepEqual(out, [
    { catalogKey: 'back-squat', name: 'Back Squat', sets: 4, targetReps: 5 },
    { catalogKey: null, name: 'Leg Press', sets: 3, targetReps: 12 },
  ]);
});

test('logged weight never travels — those are your working sets, not their prescription', () => {
  const out = sessionToTemplateExercises([lift('Bench Press', 3)]);
  assert.equal('weight' in out[0], false);
  assert.equal('actualReps' in out[0], false);
});

test('a rep wave keeps its FIRST target, which is the set the guest starts on', () => {
  const wave = {
    name: 'Deadlift',
    catalogKey: 'deadlift',
    section: 'main',
    position: 0,
    sets: [6, 6, 4, 4].map((r, i) => ({ setIndex: i, targetReps: r, weight: null, actualReps: null, done: false })),
  };
  assert.equal(sessionToTemplateExercises([wave])[0].targetReps, 6);
});

test('cardio is dropped — a leg is a distance and a clock, not a list of sets', () => {
  const out = sessionToTemplateExercises([lift('Row', 3), run(), lift('Pull-up', 4)]);
  assert.deepEqual(out.map((e) => e.name), ['Row', 'Pull-up']);
});

test('a session that is only a run snapshots to nothing, which reads as a freestyle share', () => {
  assert.deepEqual(sessionToTemplateExercises([run()]), []);
});

/**
 * ⚠ THE POSITION IS INTO THE SNAPSHOT, NOT INTO THE SESSION.
 *
 * Because cardio is dropped, the two lists are different lengths the moment a session contains a run.
 * Handing the guest the session's own index would land them on the wrong lift — silently, and by exactly
 * the number of runs above the host's position. Both call sites compute it by snapshotting everything
 * BEFORE the current exercise and taking the length; this is that arithmetic.
 */
test('the joining position counts the snapshot, not the session', () => {
  const session = [lift('Squat', 3), run(), lift('Bench', 3), lift('Row', 3)];
  // Host is on 'Bench', which is index 2 of the session but index 1 of the snapshot.
  const at = 2;
  const startIndex = sessionToTemplateExercises(session.slice(0, at)).length;
  assert.equal(startIndex, 1);
  assert.equal(sessionToTemplateExercises(session)[startIndex].name, 'Bench');
});

test('a host standing on a cardio leg lands the guest on the next real lift, not past the end', () => {
  const session = [lift('Squat', 3), run()];
  const shape = sessionToTemplateExercises(session);
  const startIndex = Math.min(sessionToTemplateExercises(session.slice(0, 1)).length, Math.max(0, shape.length - 1));
  assert.equal(startIndex, 0);
  assert.equal(shape[startIndex].name, 'Squat');
});

test('an exercise with no sets is not a thing to join at', () => {
  const empty = { name: 'Placeholder', catalogKey: null, section: 'main', position: 0, sets: [] };
  assert.deepEqual(sessionToTemplateExercises([empty, lift('Curl', 3)]).map((e) => e.name), ['Curl']);
});
