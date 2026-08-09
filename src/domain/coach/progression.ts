/**
 * What to do with the weight, based on what they actually lifted.
 *
 * ══ THE ONE THING A GENERATOR CANNOT DO AND A COACH ALWAYS DOES ══
 *
 * Everything else in `domain/coach` decides what to train. This decides *how much*, and it is the only
 * part that reads the athlete's own history rather than a table. A coach who watched you hit 3 × 10 at
 * 135 last Tuesday does not hand you 3 × 10 at 135 again — they say go to 140. That single behaviour is
 * most of what makes coaching feel like coaching, and it needs no AI at all: the data is already in
 * `workouts`, logged set by set.
 *
 * ══ DOUBLE PROGRESSION, WHICH THE PRESCRIPTION MODEL WAS ALREADY SHAPED FOR ══
 *
 * `prescribe.ts` climbs reps through a range week to week — 3 × 8, 3 × 9, 3 × 10 — and then wraps. This
 * closes that loop: when every working set reaches the TOP of the range, the reps reset and the weight
 * goes up. Reps are the progression within a range; weight is the progression between them. Nothing here
 * invents a scheme — it finishes the one already in the model.
 *
 * ══ WHAT IT WILL NOT DO ══
 *
 * It never says "you failed", it never prescribes a deload off one bad session, and it never pushes
 * through a miss. A single short set is a Tuesday, not a trend; two in a row is information. The
 * asymmetry is deliberate — advancing someone too fast costs them a rep, and it is the cheaper mistake to
 * make in the other direction.
 *
 * Pure: history in, a recommendation out. No Supabase, no catalogue.
 */

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// INPUT
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** One logged set, in the shape `progress-core.LoggedSet` already uses. */
export interface HistorySet {
  weight: number | null;
  reps: number | null;
}

/** One past session of a single exercise, newest first when passed in. */
export interface HistorySession {
  /** ISO. Only used to order and to say "last Tuesday" — never parsed for anything load-bearing. */
  startedAt: string;
  sets: readonly HistorySet[];
}

/** What was asked of them, from `prescribeReps`. */
export interface Prescription {
  sets: number;
  /** Bottom of the range. */
  reps: number;
  /** Top of the range, or null when the prescription is a single number. */
  repsMax: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// OUTPUT
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export type ProgressionAction = 'add_weight' | 'add_reps' | 'hold' | 'back_off' | 'no_history';

export interface Progression {
  action: ProgressionAction;
  /** The weight to put on the bar, when history gives one. `null` means the athlete decides. */
  suggestedWeight: number | null;
  /** The rep target for the coming session. */
  suggestedReps: number;
  /** One sentence, written to be shown verbatim. */
  message: string;
  /** What it read, so a screen can show the evidence rather than asking for trust. */
  basis: { weight: number; reps: number[]; when: string } | null;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// INCREMENTS
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * How much to add, in pounds, by movement pattern.
 *
 * ⚠ POUNDS BECAUSE POUNDS ARE CANONICAL in this app — every stored weight is lb and `useUnits` converts
 * for display. Returning kg here would put a second unit into the model, which is exactly the bug the
 * canonical-unit rule exists to prevent.
 *
 * The spread is the real coaching content: a deadlift absorbs 10 lb without anyone noticing, a lateral
 * raise does not, and telling someone to add 10 lb to a lateral raise is how they learn to ignore the
 * coach. Lower-body compounds move fastest, upper-body compounds next, isolation slowest.
 */
const INCREMENT_BY_PATTERN: Record<string, number> = {
  'Squat / Knee Dominant': 10,
  'Hinge / Hip Dominant': 10,
  'Horizontal Push': 5,
  'Vertical Push': 5,
  'Horizontal Pull': 5,
  'Vertical Pull': 5,
  Carry: 10,
  'Power / Plyometric': 5,
  'Elbow Flexion': 2.5,
  'Elbow Extension': 2.5,
  'Shoulder Isolation': 2.5,
  'Hip Isolation': 5,
  'Calf / Ankle': 5,
  Core: 2.5,
  Mobility: 0,
};

/** Beginners add faster because they adapt faster — the one place experience changes the arithmetic. */
const EXPERIENCE_MULTIPLIER = { beginner: 1.5, intermediate: 1, advanced: 0.5 } as const;

export function incrementFor(
  pattern: string,
  experience: 'beginner' | 'intermediate' | 'advanced',
): number {
  const base = INCREMENT_BY_PATTERN[pattern] ?? 5;
  const raw = base * EXPERIENCE_MULTIPLIER[experience];
  // Round to the smallest plate pair that actually exists on a rack. 3.75 lb is not a thing you can load.
  return Math.max(2.5, Math.round(raw / 2.5) * 2.5);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// READING THE HISTORY
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const workingSets = (s: HistorySession): { weight: number; reps: number }[] =>
  s.sets
    .filter((x): x is { weight: number; reps: number } => x.weight != null && x.reps != null && x.reps > 0)
    .map((x) => ({ weight: x.weight, reps: x.reps }));

/**
 * The weight the session was actually done at.
 *
 * The MODE, not the max and not the mean: a top set of 185 after three at 135 describes a session at 135
 * with one heavy single on the end, and calling that "a 185 session" would advance them off a set they did
 * once. The mode is what they trained at.
 */
function workingWeight(sets: readonly { weight: number; reps: number }[]): number | null {
  if (sets.length === 0) return null;
  const counts = new Map<number, number>();
  for (const s of sets) counts.set(s.weight, (counts.get(s.weight) ?? 0) + 1);
  let best = sets[0].weight;
  let bestN = 0;
  for (const [w, n] of counts) {
    // Ties go to the heavier weight — two at 135 and two at 145 is a session that moved up, not down.
    if (n > bestN || (n === bestN && w > best)) {
      best = w;
      bestN = n;
    }
  }
  return best;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE DECISION
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface ProgressionInput {
  exerciseName: string;
  pattern: string;
  experience: 'beginner' | 'intermediate' | 'advanced';
  prescription: Prescription;
  /** Past sessions of THIS exercise, newest first. Only the two most recent are read. */
  history: readonly HistorySession[];
}

/**
 * What to do this time.
 *
 * Reads at most the last two sessions. More history would let it spot a longer plateau, but it would also
 * let a good month three weeks ago argue with a bad week now, and the athlete is standing in front of the
 * bar wanting one number.
 */
export function progressionFor(input: ProgressionInput): Progression {
  const { prescription: rx, pattern, experience } = input;
  const top = rx.repsMax ?? rx.reps;

  const last = input.history[0] ? workingSets(input.history[0]) : [];
  if (last.length === 0) {
    return {
      action: 'no_history',
      suggestedWeight: null,
      suggestedReps: rx.reps,
      message: `First time on ${input.exerciseName} — pick a weight you could do a couple more reps with, and note what you land on.`,
      basis: null,
    };
  }

  const weight = workingWeight(last)!;
  const reps = last.map((s) => s.reps);
  const at = last.filter((s) => s.weight === weight);
  const when = input.history[0].startedAt;
  const basis = { weight, reps, when };
  const step = incrementFor(pattern, experience);

  // ── A drop worth noticing, but only across two sessions ────────────────────────────────────────────
  const prior = input.history[1] ? workingSets(input.history[1]) : [];
  const priorWeight = prior.length > 0 ? workingWeight(prior) : null;
  if (priorWeight != null && weight < priorWeight * 0.9) {
    return {
      action: 'back_off',
      suggestedWeight: weight,
      suggestedReps: rx.reps,
      message: `${input.exerciseName} came down from ${fmt(priorWeight)} to ${fmt(weight)} — stay at ${fmt(weight)} and rebuild from there.`,
      basis,
    };
  }

  const everySetAtTop = at.length >= Math.min(rx.sets, at.length) && at.every((s) => s.reps >= top);
  const everySetAtBottom = at.every((s) => s.reps >= rx.reps);

  // ── Topped the range on every set: the weight goes up and the reps reset ───────────────────────────
  if (everySetAtTop && at.length >= rx.sets) {
    const next = weight + step;
    return {
      action: 'add_weight',
      suggestedWeight: next,
      suggestedReps: rx.reps,
      message: `You hit ${at.length} × ${top} at ${fmt(weight)} on ${input.exerciseName} — go to ${fmt(next)} and start back at ${rx.reps}.`,
      basis,
    };
  }

  // ── Inside the range: same weight, one more rep ────────────────────────────────────────────────────
  if (everySetAtBottom) {
    const best = Math.max(...at.map((s) => s.reps));
    const target = Math.min(top, best + 1);
    return {
      action: 'add_reps',
      suggestedWeight: weight,
      suggestedReps: target,
      message:
        target > best
          ? `Stay at ${fmt(weight)} on ${input.exerciseName} and go for ${target} — one more than last time.`
          : `Stay at ${fmt(weight)} on ${input.exerciseName} and hold ${target}.`,
      basis,
    };
  }

  // ── Short of the bottom: hold. Never push through a miss ───────────────────────────────────────────
  return {
    action: 'hold',
    suggestedWeight: weight,
    suggestedReps: rx.reps,
    message: `${input.exerciseName} was short of ${rx.reps} last time — same ${fmt(weight)}, get all ${rx.sets} sets this time.`,
    basis,
  };
}

/** `137.5` → `137.5 lb`, `140` → `140 lb`. Never a trailing `.0`. */
const fmt = (n: number): string => `${Number.isInteger(n) ? n : n.toFixed(1)} lb`;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// APPLYING IT TO A DAY
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Attach a progression to every exercise in a day the coach just built.
 *
 * ⚠ HISTORY IS KEYED BY NAME, not by catalogue key, because that is how the app logs it — a saved workout
 * records `LoggedExercise { name, section, sets }` and no id. So the lookup is by name, and a rename in
 * the catalogue would orphan the history. Worth knowing before anyone renames anything.
 */
export function progressionsForDay(
  exercises: readonly { name: string; catalogKey?: string; sets?: number; reps?: number; repsMax?: number | null }[],
  patternOf: (key: string | undefined) => string,
  historyByName: (name: string) => readonly HistorySession[],
  experience: 'beginner' | 'intermediate' | 'advanced',
): Progression[] {
  return exercises.map((ex) =>
    progressionFor({
      exerciseName: ex.name,
      pattern: patternOf(ex.catalogKey),
      experience,
      prescription: { sets: ex.sets ?? 3, reps: ex.reps ?? 8, repsMax: ex.repsMax ?? null },
      history: historyByName(ex.name),
    }),
  );
}
