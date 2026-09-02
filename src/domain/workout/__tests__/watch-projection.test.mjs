import test from 'node:test';
import assert from 'node:assert/strict';

import { projectWatchState, targetLine } from '../watch-projection.ts';

/**
 * The wrist can only ever be wrong in one of two ways: it shows the wrong set, or it disagrees with the
 * phone about whether the session is over. Everything below is one of those two.
 *
 * ⚠ `now` IS ALWAYS INJECTED. A projection that read the clock itself could not be tested at a boundary,
 * and the rest boundary — `endsAt > now` — is exactly where the Rest/Active decision is made.
 */

const T0 = Date.parse('2026-09-02T10:00:00.000Z');

const set = (o = {}) => ({ setIndex: 0, weight: 185, targetReps: 8, actualReps: null, done: false, ...o });

const ex = (o = {}) => ({
  name: 'Barbell Bench Press',
  section: 'main',
  position: 0,
  sets: [set({ setIndex: 0 }), set({ setIndex: 1 }), set({ setIndex: 2 })],
  ...o,
});

const session = (o = {}) => ({
  workoutName: 'Push Day A',
  activityType: 'strength',
  startedAt: '2026-09-02T09:14:00.000Z',
  exercises: [ex()],
  ...o,
});

const noRest = { endsAt: null, paused: false, pausedRemaining: null, totalSec: 120 };
const project = (o = {}) =>
  projectWatchState({ session: session(), units: 'imperial', rest: noRest, now: T0, ...o });

// ─────────────────────────────────────────────────────────────────────────────

test('no session, and a session with no strength work, both read as Idle', () => {
  assert.equal(project({ session: null }).phase, 'idle');

  // A cardio-only session is the case the build plan calls out: V1 is strength-only and says so by
  // staying on Idle, rather than drawing an Active screen with nothing to put in it.
  const cardio = session({ exercises: [ex({ kind: 'cardio', name: 'Treadmill', sets: [set()] })] });
  const s = project({ session: cardio });
  assert.equal(s.phase, 'idle');
  assert.equal(s.workoutName, 'Push Day A');

  // An empty session is Idle, not a crash and not "Finished".
  assert.equal(project({ session: session({ exercises: [] }) }).phase, 'idle');
});

test('Active carries the set, the target, the bars and the two indices a command needs', () => {
  const s = project();
  assert.equal(s.phase, 'active');
  assert.equal(s.exercise, 'Barbell Bench Press');
  assert.equal(s.setLabel, 'Set 1 of 3');
  assert.equal(s.target, '185 lb × 8');
  assert.equal(s.setsDone, 0);
  assert.equal(s.setsTotal, 3);
  assert.equal(s.exerciseIndex, 0);
  assert.equal(s.setIndex, 0);
});

test('the cursor lands on the first UNFINISHED set, and the bars count what is behind it', () => {
  const e = ex({ sets: [set({ setIndex: 0, done: true }), set({ setIndex: 1, done: true }), set({ setIndex: 2 })] });
  const s = project({ session: session({ exercises: [e] }) });
  assert.equal(s.setLabel, 'Set 3 of 3');
  assert.equal(s.setIndex, 2);
  assert.equal(s.setsDone, 2);
});

test('the cursor starts where the ATHLETE is, not at index zero', () => {
  /* They skipped ahead to arms on purpose. The wrist must not call them back to the squat set they
     deliberately left — `exerciseIndex` is where they are, and `live-session.ts` says as much. */
  const squat = ex({ name: 'Back Squat', position: 0 });
  const curl = ex({ name: 'Barbell Curl', position: 1, sets: [set({ weight: 60, targetReps: 12 })] });
  const s = project({ session: session({ exercises: [squat, curl], exerciseIndex: 1 }) });
  assert.equal(s.exercise, 'Barbell Curl');
  assert.equal(s.exerciseIndex, 1);

  // …but it walks on when the exercise they are on is finished.
  const doneCurl = ex({ name: 'Barbell Curl', position: 1, sets: [set({ done: true })] });
  const s2 = project({ session: session({ exercises: [squat, doneCurl], exerciseIndex: 1 }) });
  assert.equal(s2.exercise, 'Back Squat');
});

test('a cardio block is stepped over, never pointed at', () => {
  const run = ex({ kind: 'cardio', name: 'Treadmill', position: 0, sets: [set({ done: false })] });
  const press = ex({ name: 'Overhead Press', position: 1, sets: [set({ weight: 95, targetReps: 5 })] });
  const s = project({ session: session({ exercises: [run, press], exerciseIndex: 0 }) });
  assert.equal(s.phase, 'active');
  assert.equal(s.exercise, 'Overhead Press');
  assert.equal(s.exerciseIndex, 1);
});

test('every target shape a session can hold becomes a finished string', () => {
  assert.equal(targetLine(set(), 'imperial'), '185 lb × 8');

  // The athlete's unit, converted once, here. 185 lb → 84 kg.
  assert.equal(targetLine(set(), 'metric'), '84 kg × 8');

  // A rep range is the ask, not two numbers to reconcile on the wrist.
  assert.equal(targetLine(set({ targetRepsMax: 10 }), 'imperial'), '185 lb × 8–10');
  // A max equal to the floor is not a range.
  assert.equal(targetLine(set({ targetRepsMax: 8 }), 'imperial'), '185 lb × 8');

  // To failure keeps the phone's own notation.
  assert.equal(targetLine(set({ toFailure: true }), 'imperial'), '185 lb × F');
  assert.equal(targetLine(set({ toFailure: true, weight: null }), 'imperial'), 'to failure');

  // A timed set states the time, not a rep count it does not have.
  assert.equal(targetLine(set({ targetSec: 45, weight: null }), 'imperial'), '45s');
  assert.equal(targetLine(set({ targetSec: 45, weight: 95 }), 'imperial'), '95 lb × 45s');

  // Bodyweight gets no unit at all rather than "0 lb".
  assert.equal(targetLine(set({ weight: null, targetReps: 12 }), 'imperial'), '12 reps');
  assert.equal(targetLine(set({ weight: 0, targetReps: 12 }), 'imperial'), '12 reps');

  // An untouched set in a percentage program falls back to what was prescribed.
  assert.equal(targetLine(set({ weight: null, targetWeight: 225 }), 'imperial'), '225 lb × 8');
});

test('a per-side ask travels in its own field, so the watch can set it smaller', () => {
  const e = ex({ name: 'Bulgarian Split Squat', per: 'leg' });
  assert.equal(project({ session: session({ exercises: [e] }) }).perLabel, 'per leg');
  assert.equal(project().perLabel, undefined);
});

test('Rest carries a deadline, not a countdown — which is why it survives going out of range', () => {
  const rest = { endsAt: T0 + 72_000, paused: false, pausedRemaining: null, totalSec: 120 };
  const e = ex({ sets: [set({ setIndex: 0, done: true }), set({ setIndex: 1 }), set({ setIndex: 2 })] });
  const s = project({ session: session({ exercises: [e] }), rest });

  assert.equal(s.phase, 'rest');
  assert.equal(s.restEndsAt, T0 + 72_000);
  assert.equal(s.restRemainingSec, null);
  assert.equal(s.restTotalSec, 120);

  // NEXT is what you are about to walk back and do — on every rest, not only supersets.
  assert.equal(s.nextExercise, 'Barbell Bench Press');
  assert.equal(s.nextTarget, '185 lb × 8');
  assert.equal(s.exerciseComplete, false);
});

test('an expired deadline is not a rest — the boundary is exclusive', () => {
  const e = ex({ sets: [set({ setIndex: 0, done: true }), set({ setIndex: 1 })] });
  const s = session({ exercises: [e] });

  assert.equal(project({ session: s, rest: { ...noRest, endsAt: T0 + 1 } }).phase, 'rest');
  assert.equal(project({ session: s, rest: { ...noRest, endsAt: T0 } }).phase, 'active');
  assert.equal(project({ session: s, rest: { ...noRest, endsAt: T0 - 1 } }).phase, 'active');
});

test('a paused rest freezes its remaining and drops the deadline', () => {
  const e = ex({ sets: [set({ setIndex: 0, done: true }), set({ setIndex: 1 })] });
  const rest = { endsAt: T0 + 40_000, paused: true, pausedRemaining: 41, totalSec: 120 };
  const s = project({ session: session({ exercises: [e] }), rest });

  assert.equal(s.phase, 'rest');
  assert.equal(s.restEndsAt, null, 'a paused deadline would keep counting on the wrist');
  assert.equal(s.restRemainingSec, 41);

  // Paused with nothing frozen is not a rest at all.
  assert.equal(project({ session: session({ exercises: [e] }), rest: { ...rest, pausedRemaining: null } }).phase, 'active');
});

test('finishing an exercise changes the Rest header instead of adding a screen', () => {
  const bench = ex({ name: 'Barbell Bench Press', position: 0, sets: [set({ done: true })] });
  const incline = ex({ name: 'Incline Dumbbell Press', position: 1, sets: [set({ weight: 60, targetReps: 10 })] });
  const rest = { endsAt: T0 + 151_000, paused: false, pausedRemaining: null, totalSec: 180 };
  const s = project({ session: session({ exercises: [bench, incline], exerciseIndex: 0 }), rest });

  assert.equal(s.phase, 'rest');
  assert.equal(s.exerciseComplete, true);
  assert.equal(s.completedExercise, 'Barbell Bench Press');
  assert.equal(s.nextExercise, 'Incline Dumbbell Press');
  assert.equal(s.nextTarget, '60 lb × 10');
});

test('Finished counts the work, and beats a rest that is still running', () => {
  const e = ex({ sets: [set({ setIndex: 0, done: true }), set({ setIndex: 1, done: true })] });
  const s = project({
    session: session({ exercises: [e] }),
    // The last Set done starts a rest on the phone. The wrist must not draw a ring counting down to
    // nothing — that is the watch disagreeing with the phone about whether the session is over.
    rest: { endsAt: T0 + 90_000, paused: false, pausedRemaining: null, totalSec: 120 },
  });

  assert.equal(s.phase, 'finished');
  assert.equal(s.totalSets, 2);
  assert.equal(s.workoutName, 'Push Day A');
  assert.equal(s.elapsedSec, 2760, '09:14:00 → 10:00:00 is 46 minutes');
  assert.equal(s.restEndsAt, undefined);
});

test('Finished counts only strength sets, and survives an unparseable start time', () => {
  const done = ex({ sets: [set({ done: true }), set({ done: true })] });
  const run = ex({ kind: 'cardio', name: 'Treadmill', position: 1, sets: [set({ done: true })] });
  assert.equal(project({ session: session({ exercises: [done, run] }) }).totalSets, 2);

  const bad = session({ exercises: [done], startedAt: 'not a date' });
  assert.equal(project({ session: bad }).elapsedSec, 0);
});

test('the state is versioned, because two builds will talk to each other', () => {
  for (const s of [
    project({ session: null }),
    project(),
    project({ session: session({ exercises: [ex({ sets: [set({ done: true })] })] }) }),
  ]) {
    assert.equal(s.v, 1);
  }
});
