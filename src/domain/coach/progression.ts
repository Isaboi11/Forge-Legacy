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
/**
 * `[typical, floor]` in pounds — what an intermediate adds, and the smallest jump that is ever worth
 * making on this movement no matter who is lifting.
 *
 * ⚠ THE FLOOR IS THE HALF THE FIRST VERSION DID NOT HAVE, AND THE PO CAUGHT IT TWICE. There was one
 * global minimum of 2.5 lb, so the advanced multiplier below dragged everything down to it: a lat
 * pulldown at 140 was offered *"go to 142.5"*, and a back squat was offered 2.5 lb. Two and a half pounds
 * is not a training stimulus on a pulldown — it is inside the noise of how you sat down.
 *
 * The PO's own spec, which this table now encodes: the big lifts (squat, hinge, deadlift, carry) take the
 * biggest jumps; presses and pulls 5–10; curls 5; shoulder isolation 2.5–5 *depending on the equipment*.
 * Nothing weighted may ever suggest less than 2.5, and almost nothing should suggest less than 5.
 */
const INCREMENT_BY_PATTERN: Record<string, [typical: number, floor: number]> = {
  'Squat / Knee Dominant': [10, 10],
  'Hinge / Hip Dominant': [10, 10],
  Carry: [10, 10],
  'Calf / Ankle': [10, 5],
  'Horizontal Push': [5, 5],
  'Vertical Push': [5, 5],
  'Horizontal Pull': [5, 5],
  'Vertical Pull': [5, 5],
  'Power / Plyometric': [5, 5],
  'Elbow Flexion': [5, 5],
  'Elbow Extension': [5, 5],
  'Hip Isolation': [5, 5],
  Core: [5, 5],
  'Shoulder Isolation': [2.5, 2.5],
  'Neck Isolation': [2.5, 2.5],
  Mobility: [0, 0],
};

/**
 * The smallest change the equipment can physically make, in pounds. Zero = this lift takes no load.
 *
 * ⚠ THESE ARE THE CATALOGUE'S OWN `equipmentId` VALUES. The first version tested for `'machine'`, which
 * is not one of them — the id is `selectorized_machine` — so every machine silently fell to the default
 * branch. Ids, never labels.
 *
 * ⚠ A DUMBBELL RACK GOES UP IN FIVES and cannot be subdivided, which is the PO's point: a 2.5 lb
 * suggestion on a dumbbell lift describes a weight that does not exist in the room.
 */
const EQUIPMENT_STEP: Record<string, number> = {
  barbell: 5, //            a 2.5 lb plate on each side
  dumbbell: 5, //           the rack: 5, 10, 15… and no way between them
  kettlebell: 5,
  cable: 2.5, //            stacks commonly carry 2.5 lb add-on pins
  selectorized_machine: 5,
  smith_machine: 5,
  sled: 10, //              you load it with 10s and 25s
  medicine_ball: 2,
  bodyweight: 0,
  resistance_band: 0, //    a band is a different band, not a heavier one
  suspension_trainer: 0,
  battle_rope: 0,
  plyo_box: 0,
  cardio: 0,
};

/** What this lift can physically move by. Unknown equipment gets 5 — the safe, common answer. */
export function loadableStep(equipment: string | null | undefined): number {
  if (equipment == null) return 5;
  return EQUIPMENT_STEP[equipment] ?? 5;
}

/** Beginners add faster because they adapt faster — the one place experience changes the arithmetic. */
const EXPERIENCE_MULTIPLIER = { beginner: 1.5, intermediate: 1, advanced: 0.5 } as const;

/**
 * How much weight to add to this lift, in pounds.
 *
 * Three things decide it, in this order, and the order is the fix:
 *
 *   1. **The movement.** A deadlift absorbs 10 lb without anyone noticing; a lateral raise does not.
 *   2. **Experience**, which may make the jump bigger but may never take it under the movement's floor.
 *      An advanced lifter progresses in smaller relative steps — that is real — but "smaller" on a squat
 *      means 10 rather than 15, not 2.5.
 *   3. **The equipment**, last, because it is a physical constraint rather than a coaching opinion: the
 *      answer is rounded UP to something that exists in the room. On dumbbells that turns a 2.5 lb
 *      shoulder jump into 5, which is the only honest answer when the rack has nothing in between.
 */
export function incrementFor(
  pattern: string,
  experience: 'beginner' | 'intermediate' | 'advanced',
  equipment?: string | null,
): number {
  const [typical, floor] = INCREMENT_BY_PATTERN[pattern] ?? [5, 5];
  if (typical === 0) return 0; // mobility — there is nothing to add

  const step = loadableStep(equipment);
  if (step === 0) return 0; // a band or bodyweight lift does not progress in pounds

  const wanted = Math.max(floor, typical * EXPERIENCE_MULTIPLIER[experience]);
  // UP to the next loadable notch, never down — rounding down is how a floor of 5 becomes 2.5 again.
  return Math.max(step, Math.ceil(wanted / step) * step);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// CHANGING THE BAR MID-SET
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** The empty bar. Nothing barbell goes below it, and a suggestion under it is not a suggestion. */
const BAR_LB = 45;

export interface BackOffInput {
  /** What is on the bar right now. */
  current: number;
  /** Working weights from recent sessions of this lift, newest first. */
  recent: readonly number[];
  equipment: string | null;
}

/**
 * ══ "THAT FELT HEAVY" — HOW FAR DOWN? ══
 *
 * ⚠ THE FIRST VERSION USED `incrementFor`, AND THE PO CAUGHT IT: *"taking 2.5 lb off a barbell back
 * squat is not going to be good."* Two things were wrong with that, and only one of them was a bug.
 *
 * The bug: the pattern lookup was failing, so the increment fell to its 5 lb default and then halved for
 * an advanced lifter. Fixed at the call site — but a correct lookup would have said 5 lb off a squat,
 * which is barely better.
 *
 * The real error was using an increment at all. **Adding and backing off are not the same move in
 * opposite directions.** Adding is double progression: a deliberately small, fixed step you earn by
 * topping the rep range. Backing off is a rescue — the load is wrong *right now* — and how wrong it is
 * scales with the load. Five pounds off a 315 squat is a rounding error; off a 65 lb overhead press it is
 * a real cut. A single fixed number cannot serve both.
 *
 * So:
 *   1. **Somewhere they have actually worked, if there is one.** A weight from a recent session that is
 *      genuinely lighter beats any percentage — it is a real number this athlete has really moved for
 *      real reps, which is the whole reason the app keeps a history.
 *   2. **Otherwise ~10%**, rounded to something loadable and floored at the empty bar.
 *
 * Returns null when there is nothing sensible to suggest — bodyweight, or a load already at the bar.
 * Null means say nothing, never zero.
 */
export function backOffTo(input: BackOffInput): number | null {
  const { current, recent, equipment } = input;
  if (!Number.isFinite(current) || current <= 0) return null;

  const step = loadableStep(equipment);
  const isBarbell = equipment === 'barbell';
  const floor = isBarbell ? BAR_LB : step;
  if (current <= floor) return null; // already as light as this lift goes

  /* A real session beats a formula — but only one that is a MEANINGFUL step down. A weight 2 lb lighter
     than today's is the same session, and offering it would be the app pretending to have an answer. */
  const meaningful = current - Math.max(step, current * 0.04);
  const fromHistory = recent.filter((w) => Number.isFinite(w) && w > 0 && w <= meaningful).sort((a, b) => b - a)[0];
  if (fromHistory != null && fromHistory >= floor) return fromHistory;

  const target = current * 0.9;
  const rounded = Math.round(target / step) * step;
  /* Never round back up to where we started: a 50 lb dumbbell press at 10% is 45, which rounds to 45 —
     fine — but a 47.5 lb load would round to 45 too, and on a lift whose step is larger than the drop
     the arithmetic can land exactly on `current`. One step down is the honest floor for a back-off. */
  const next = Math.min(rounded, current - step);
  return next >= floor ? next : floor;
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

/**
 * One past session reduced to the single figure the "Last" column shows — `{ weight: 185, reps: 10 }`.
 *
 * The WORKING weight (the mode, per above) paired with the BEST reps achieved at it. Both halves matter:
 * the mode keeps a heavy single on the end of three back-off sets from being reported as the session, and
 * the best reps at that weight is what the athlete is trying to beat. Averaging the reps instead would
 * show a number they never actually did.
 *
 * Null when the session logged nothing loadable — a bodyweight-only or unlogged entry says nothing about
 * what to do next, and the caller must render an em-dash rather than a zero.
 */
export function sessionPerformance(session: HistorySession): { weight: number; reps: number } | null {
  const sets = workingSets(session);
  if (sets.length === 0) return null;
  const weight = workingWeight(sets)!;
  const at = sets.filter((s) => s.weight === weight);
  return { weight, reps: Math.max(...at.map((s) => s.reps)) };
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
  /**
   * The catalogue's `equipmentId`. Optional, and its absence costs only precision — the increment falls
   * back to the safe 5 lb notch rather than inventing a weight the rack does not have.
   */
  equipment?: string | null;
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
  const step = incrementFor(pattern, experience, input.equipment);

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

  /*
   * ── A BODYWEIGHT LIFT PROGRESSES IN REPS, FULL STOP ──────────────────────────────────────────────
   *
   * `weight: 0` is a real logged answer in this app, not a missing one — it is how a pull-up, a push-up
   * or a dip is recorded (`metrics.ts`: "a bodyweight set sets no weight record"). Run through the
   * arithmetic below unguarded, three sets of twelve push-ups tops the range and the coach says *"go to
   * 2.5 lb"*, which is not a thing anybody can do to a push-up and is the kind of line that teaches an
   * athlete to stop reading the coach.
   *
   * So the weight branch is skipped entirely and the rep branch answers instead. Adding a weight belt is
   * a real progression, but it is a change of exercise the athlete makes, not one the app assigns.
   */
  if (weight === 0) {
    const best = Math.max(...at.map((s) => s.reps));
    const target = everySetAtBottom ? Math.min(top, best + 1) : rx.reps;
    return {
      action: everySetAtBottom ? 'add_reps' : 'hold',
      suggestedWeight: 0,
      suggestedReps: target,
      message: everySetAtBottom
        ? `You got ${best} on ${input.exerciseName} — go for ${target} this time.`
        : `${input.exerciseName} was short of ${rx.reps} last time — same again, get all ${rx.sets} sets.`,
      basis,
    };
  }

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
