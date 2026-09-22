/**
 * Constraints in, a program out.
 *
 * ══ FOUR STEPS, NO BRANCHES PER GOAL ══
 *
 *   1. refuse what cannot honestly be built        (`refusalFor`)
 *   2. pick the week's shape from the rulebook     (`skeletonFor`)
 *   3. fill each slot against what is in the room  (`fillSlot`)
 *   4. prescribe, week by week, deloads included   (`prescribeReps`)
 *
 * There is no `if (goal === 'strength')` anywhere below. Everything goal-specific is a table lookup, which
 * is what makes a new goal an authoring job rather than an engineering one — and what makes the whole
 * matrix testable, since the code path is identical for every athlete who ever uses it.
 *
 * ══ IT REFUSES, AND SAYS WHY ══
 *
 * Three things can make a request unbuildable: a goal with no authored rulebook, a limitation that
 * contradicts the goal, and a room with too little in it. All three return a `CoachRefusal` carrying a
 * sentence the wizard can show verbatim. None of them return a thin program with the problem buried in
 * week 3 — a plan that quietly omits what the athlete asked for is worse than one that never claimed to
 * have it.
 *
 * Pure: type-only imports, injected catalogue, injected equipment gate. The whole matrix runs under
 * `node --test` in milliseconds.
 */

import type { ProgramDay, ProgramExercise, ProgramStructure } from '@/data/programs-live';

import {
  effectiveEquipment,
  isCount,
  isEnduranceGoal,
  MAX_DAYS_PER_WEEK,
  MIN_DAYS_PER_WEEK,
  normalise,
  type CoachConstraints,
  type DayIntent,
  type FocusMuscle,
  type Goal,
  type Limitation,
  type PinnedExercise,
} from './constraints.ts';
import {
  candidatesFor,
  canStretch,
  contextFrom,
  fillSlot,
  isCompound,
  trainablePatterns,
  type CandidateContext,
  type CatalogExercise,
  type EquipmentGate,
} from './candidates.ts';
import {
  exerciseBudget,
  nameForWeek,
  prescribeHold,
  prescribeReps,
  prescribeCardio,
  roleFor,
} from './prescribe.ts';
import { MIN_DAY_MOVEMENTS } from './day.ts';
import {
  equipmentAfterLimitations,
  forbidsRunning,
  limitationExcludeKeys,
  limitationKeepKeys,
  limitationPatterns,
} from './rulebook/limitations.ts';
import {
  dayForFocus,
  defaultWeeksFor,
  firstUnviableDay,
  fullBodyFallback,
  isAuthored,
  weekForAnyDays,
  weekIsViable,
  type DaySkeleton,
} from './rulebook/skeletons.ts';
import { bandFor, deloadSets, deloadWeeks, GOAL_CATEGORY, type PasCategory } from './rulebook/volume.ts';
import {
  assembleEndurance,
  buildRunDay,
  enduranceBlock,
  enduranceConcernOf,
  pacesFor,
  type EnduranceConcern,
  type EnduranceOpts,
  type SessionRole,
  type TrainingPaces,
} from './rulebook/endurance.ts';
import { cueFor } from './rulebook/cues.ts';
import {
  FOCUS_EXTRA_SETS,
  FOCUS_SLOT_INDEX,
  FOCUS_SPEC,
  focusApplies,
  focusMuscleIds,
  focusMusclesForSlot,
  focusSlotsFor,
} from './rulebook/focus.ts';
import { PIN_FAMILIES, type PinFamily } from './rulebook/pinned.ts';
import {
  ACTIVITY_PLURAL,
  ATHLETE_SIZED_RUN_HAS_WARMUP,
  COMPARE_MIN_PER_MI,
  CONCERN,
  DEFAULT_CARDIO_MIN,
  DEFAULT_RUN_MIN,
  DELOAD_RUN_MULTIPLIER,
  INTERFERENCE_COST,
  INTERFERENCE_RULES,
  isLowerHeavy,
  liftDaysAtPeak,
  liftGoalFor,
  liftLoadOf,
  LONG_SHARE_BY_RUNS,
  MIN_ENDURANCE_DAYS,
  MIN_RACE_RUN_DAYS,
  RACE_LIFT_GOAL,
  RACE_WEEK_LIFT,
  RUN_DEMAND,
  TRI_LIFT_DAYS_MAX,
  type LiftLoad,
  type RunDemand,
} from './rulebook/hybrid.ts';
import { aliasKey, resolveAgainstCatalog } from '../exercise-picker/aliases.ts';

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// RESULT
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Why the coach will not build this, in words an athlete can act on. */
export interface CoachRefusal {
  /** `empty_week`: a `days` week with nothing in it but rest — there is no session to build. */
  reason: 'goal_not_authored' | 'limitation_conflicts_with_goal' | 'not_enough_equipment' | 'empty_week';
  message: string;
}

/** What had to give, so the wizard can say it before the athlete finds out for themselves. */
export interface AssemblyNote {
  /** `stretched`: filled from the tier above the athlete because their own held nothing — `fillSlot`. */
  kind: 'relaxed' | 'dropped' | 'stretched';
  day: string;
  wanted: string;
  got?: string;
}

/**
 * Holt changed the split, and why — shown prominently rather than buried in the notes.
 *
 * This is the difference between a generator and a coach. A generator fills the days it was told to fill;
 * a coach says "that split doesn't work with what you've got, here's what I'd do instead" and then does it.
 */
export interface Restructure {
  from: string;
  to: string;
  because: string;
}

export interface Assembly {
  structure: ProgramStructure;
  notes: AssemblyNote[];
  category: PasCategory;
  deloadWeeks: number[];
  /** Set when Holt overrode the requested split because the room could not support it. */
  restructured?: Restructure;
  /**
   * A race built on `buildAnyway`: what Holt would have refused, for the chat to say ONCE with its
   * suggestion (CA-D12). Absent on every other build.
   */
  concern?: EnduranceConcern | null;

  // ── Athlete-authored (CA-D3 / CA-D12) — always present on a strength or hybrid build ────────────────
  /**
   * Pinned names the catalogue could not match — to be ASKED BACK ("which row did you mean?"), never
   * silently dropped. The athlete's own words, exactly as given.
   */
  unresolved?: string[];
  /**
   * Pinned exercises that matched but were held out by a wall — a stated limitation, kit they have not
   * said they own, an exclusion they asked for, or a week with no lift day to put them on. Each one also
   * has its sentence in `concerns`. A pin marked `confirmed` is never held for a limitation or kit.
   */
  held?: PinHeld[];
  /** Family words Holt turned into a specific movement — "rows" → Barbell Bent-Over Row — to say so. */
  chosen?: PinChosen[];
  /**
   * One sentence each, in Holt's voice, to say ONCE and then drop (CA-D12): a heavy leg day before the
   * athlete's own long run, a week with no rest day, a clamp, a held pin. Never a refusal.
   */
  concerns?: string[];
  /**
   * The seven days of the week as Holt laid them out, rest days included — a race build that keeps lifting
   * and nothing else (`assembleRaceAndLift`).
   *
   * ⚠ THE REST DAYS ARE THE POINT. `structure` holds sessions and a program has no rest rows, so the one
   * thing that actually separates a leg day from the long run — the day off between them — is invisible
   * there. This is the only place it survives, for a surface that wants to say "Monday lift, Tuesday run".
   */
  weekShape?: readonly ('run' | 'lift' | 'rest')[];
}

export interface PinHeld {
  /** What the athlete wrote. */
  asked: string;
  /** The catalogue's name for what matched (the athlete's words again when a family matched nothing). */
  name: string;
  catalogKey: string;
  reason: 'limitation' | 'equipment' | 'excluded' | 'no_lift_day';
}

export interface PinChosen {
  /** What the athlete wrote. */
  asked: string;
  catalogKey: string;
  /** The catalogue's name for what went in. */
  name: string;
}

export type AssembleResult = { ok: true; assembly: Assembly } | { ok: false; refusal: CoachRefusal };

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// CARDIO ACTIVITY CHOICE
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * What the athlete can use for a cardio bout, best first, and what each can express.
 *
 * Injected as a table rather than imported from `conditioning.ts` so this module stays free of the cardio
 * vocabulary — but the values mirror it exactly (`OUTDOOR_CAPABLE`, `TRACKS_DISTANCE`, `RATE_KIND`), and
 * the assembler never invents a rate the app cannot render. A rower has no honest pace, so it gets time.
 */
interface CardioOption {
  activity: string;
  /** Equipment id required indoors. `null` means it needs nothing (it is done outside). */
  needs: string | null;
  modality: 'outdoor' | 'indoor';
  rateKind: 'pace' | 'speed' | 'none';
  tracksDistance: boolean;
}

const CARDIO_OPTIONS: readonly CardioOption[] = [
  { activity: 'run', needs: null, modality: 'outdoor', rateKind: 'pace', tracksDistance: true },
  { activity: 'bike', needs: 'bike', modality: 'indoor', rateKind: 'speed', tracksDistance: true },
  // A fan bike is a bike. It is a separate id in the gear picker because it gates different catalogue
  // exercises, but for the purpose of "ride for 20 minutes" the distinction does not exist.
  { activity: 'bike', needs: 'airbike', modality: 'indoor', rateKind: 'speed', tracksDistance: true },
  { activity: 'row', needs: 'rower', modality: 'indoor', rateKind: 'none', tracksDistance: true },
  { activity: 'run', needs: 'treadmill', modality: 'indoor', rateKind: 'pace', tracksDistance: true },
  { activity: 'elliptical', needs: 'elliptical', modality: 'indoor', rateKind: 'none', tracksDistance: true },
  { activity: 'walk', needs: null, modality: 'outdoor', rateKind: 'pace', tracksDistance: true },
];

/**
 * Pick a cardio bout the athlete can actually do.
 *
 * Walking is last and always available, which is the point of having it in the list — a conditioning day
 * for someone with no equipment, no treadmill and sore knees still finishes with something, and a walk is
 * an honest prescription rather than a consolation.
 */
function chooseCardio(
  owned: readonly string[],
  bannedActivities: ReadonlySet<string>,
): CardioOption | null {
  for (const o of CARDIO_OPTIONS) {
    if (bannedActivities.has(o.activity)) continue;
    if (o.needs != null && !owned.includes(o.needs)) continue;
    return o;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// REFUSALS
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Everything that makes a request unbuildable, checked before any work is done. */
export function refusalFor(c: CoachConstraints): CoachRefusal | null {
  if (!isAuthored(c.goal)) {
    return {
      reason: 'goal_not_authored',
      message: isEnduranceGoal(c.goal)
        ? "I can't build running plans yet — that part of the coach isn't written. I can build you a strength, muscle, conditioning or mobility block in the meantime."
        : "I don't have a plan for that goal yet.",
    };
  }

  // A running goal for someone who cannot run is not a plan to be improvised around — it is a
  // contradiction, and building a marathon block out of bike intervals would be answering a question
  // nobody asked.
  //
  // ⚠ UNLESS THEY ASKED ANYWAY (CA-D12, PO 2026-09-21). With `buildAnyway` the race is built WITH running,
  // for this build only, and the conflict comes back as the plan's `concern` rather than as a no. It is
  // still a running plan, never the bike-interval improvisation above.
  if (isEnduranceGoal(c.goal) && forbidsRunning(c.limitations) && !c.buildAnyway) {
    return {
      reason: 'limitation_conflicts_with_goal',
      message:
        "You've told me not to prescribe running, and that goal is a running goal. Drop the restriction or pick a different goal and I'll build it.",
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// ASSEMBLY
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A repeated day type is not the same session twice.
 *
 * Four-day upper/lower means training Upper on Monday and again on Thursday, and handing over two
 * identical lists makes the second one feel like a photocopy. Rotating the slot order changes what LEADS,
 * which changes what gets the athlete's freshest effort — the difference between a heavy day and a volume
 * day, expressed in the one dimension this model has. Naming them A and B is then truthful rather than
 * decorative.
 */
function variantFor(day: DaySkeleton, occurrence: number, total: number): DaySkeleton {
  if (total < 2) return day;
  /*
   * ⚠ NOT IF THE NAME ALREADY CARRIES ONE. Full-body weeks are authored as A/B/C and a four-day week is
   * [A, B, C, A] — so the repeat got lettered again and came out as "Full Body A A". Those days are
   * already differentiated by design, which is the entire reason they are A, B and C; re-lettering them
   * says the same thing twice and reads as a bug because it is one.
   */
  if (/\s[A-Z]$/.test(day.name)) return day;
  const letter = String.fromCharCode(65 + occurrence);
  const slots = [...day.slots.slice(occurrence), ...day.slots.slice(0, occurrence)];
  return { ...day, name: `${day.name} ${letter}`, slots };
}

/** A pinned exercise that resolved, passed its walls, and has a day to go on. */
interface PlacedPin {
  pin: PinnedExercise;
  exercise: CatalogExercise;
}

/**
 * The focus, pre-resolved once per build: which patterns a day may gain, the primary-muscle ids that earn
 * an extra set, and for each extra slot the pools its pick is drawn from, best first — the group's own
 * primary movers, then anything that works the group, then the whole pool (`rulebook/focus.ts`).
 */
interface FocusPlan {
  focus: readonly FocusMuscle[];
  muscles: ReadonlySet<string>;
  pools: ReadonlyMap<string, readonly (readonly CatalogExercise[])[]>;
}

const NO_FOCUS: FocusPlan = { focus: [], muscles: new Set(), pools: new Map() };

function focusPlanFor(focus: readonly FocusMuscle[], pool: readonly CatalogExercise[]): FocusPlan {
  if (focus.length === 0) return NO_FOCUS;
  const pools = new Map<string, (readonly CatalogExercise[])[]>();
  for (const f of focus) {
    for (const pattern of FOCUS_SPEC[f]?.slots ?? []) {
      if (pools.has(pattern)) continue;
      const muscles = focusMusclesForSlot(pattern, focus);
      pools.set(pattern, [
        pool.filter((e) => e.primaryMuscleIds.some((m) => muscles.has(m))),
        pool.filter((e) => e.muscleIds.some((m) => muscles.has(m))),
        pool,
      ]);
    }
  }
  return { focus, muscles: focusMuscleIds(focus), pools };
}

function buildDay(
  skeleton: DaySkeleton,
  letter: string,
  pool: readonly CatalogExercise[],
  baseCtx: CandidateContext,
  opts: {
    category: PasCategory;
    /** The block's goal, so the coaching cue can say what the set is FOR — see `rulebook/cues.ts`. */
    goal: CoachConstraints['goal'];
    experience: CoachConstraints['experience'];
    weekIndex: number;
    /** The block's full length — `prescribeReps` needs it to know whether `weekIndex` can ramp (PAS-A7-D2). */
    totalWeeks: number;
    isDeload: boolean;
    budget: number;
    /** PAS-D11's per-session set ceiling for this week — `null` where the category states none. */
    maxSets: number | null;
    owned: readonly string[];
    bannedActivities: ReadonlySet<string>;
    /** The athlete's own exercises for this day, placed before anything the rulebook chooses. */
    pins?: readonly PlacedPin[];
    focus?: FocusPlan;
  },
  notes: AssemblyNote[],
): ProgramDay {
  const main: ProgramExercise[] = [];
  const used = new Set<string>(baseCtx.used);
  const cardioSlots = skeleton.cardioFinisher ? 1 : 0;
  const focus = opts.focus ?? NO_FOCUS;
  let sets = 0;

  const pctxFor = () => ({
    category: opts.category,
    experience: opts.experience.lifting,
    weekIndex: opts.weekIndex,
    totalWeeks: opts.totalWeeks,
    isDeload: opts.isDeload,
  });
  /* The extra set a focused group earns — on its primary movers only, never in a deload (the deload has
     to stay lighter than the week before it, PAS-D8), and always inside the session's ceiling below. */
  const focusBonus = (ex: CatalogExercise): number =>
    !opts.isDeload && ex.primaryMuscleIds.some((m) => focus.muscles.has(m)) ? FOCUS_EXTRA_SETS : 0;
  const cueOf = (ex: CatalogExercise) =>
    cueFor({ pattern: ex.pattern, goal: opts.goal, experience: opts.experience.lifting, isPrimary: main.length === 0 });

  /*
   * ══ 1. THE ATHLETE'S OWN EXERCISES ARE PLACED FIRST (CA-D3) ══
   *
   * Placed before a single slot is filled, and outside the budget and the set ceiling: they are the
   * athlete's, and a coach does not trim somebody's bench press to make room for his own accessory. What
   * the ceiling governs is everything Holt ADDS around them — so a day of four pinned lifts gets few or no
   * extra movements, which is exactly right. `sets`/`reps` are verbatim when given ("5×5"), else the
   * rulebook's for that position. A verbatim count is still cut in a deload week, like everything else,
   * and `assemble` says so once (`CONCERN.pinDeload`) rather than letting the athlete find a 3×5.
   *
   * ⚠ PLACED FIRST IS NOT ORDERED FIRST. The first build led a full-body day with *Bench · Barbell Curl ·
   * Back Squat* — the athlete's curl ahead of the day's squat, which breaks the one ordering rule that
   * holds across every goal (compounds first, `candidates.ts`). So a pinned COMPOUND leads the day, and a
   * pinned isolation movement has its room and its sets reserved now and is written after the rulebook's
   * compounds, at the end of the day — still guaranteed, just where an isolation movement belongs.
   */
  const slots = [...skeleton.slots];
  const pinRow = (pin: PinnedExercise, exercise: CatalogExercise, index: number): { row: ProgramExercise; dose: number } => {
    const cue = cueFor({ pattern: exercise.pattern, goal: opts.goal, experience: opts.experience.lifting, isPrimary: index === 0 });
    const pctx = pctxFor();
    const verbatimSets = isCount(pin.sets) && pin.sets >= 1 ? Math.round(pin.sets) : null;
    const own = verbatimSets != null ? (opts.isDeload ? deloadSets(verbatimSets) : verbatimSets) : null;
    if (opts.category === 'MOBILITY' || exercise.pattern === 'Mobility') {
      const hold = prescribeHold(pctx);
      const row = { catalogKey: exercise.key, name: exercise.name, sets: own ?? hold.sets, durationSec: hold.durationSec, ...(cue ? { coachNote: cue } : {}) };
      return { row, dose: 0 };
    }
    const rx = prescribeReps(roleFor(index, isCompound(exercise.pattern)), pctx);
    const dose = own ?? rx.sets + focusBonus(exercise);
    const verbatimReps = isCount(pin.reps) && pin.reps >= 1 ? Math.round(pin.reps) : null;
    const row = {
      catalogKey: exercise.key,
      name: exercise.name,
      sets: dose,
      reps: verbatimReps ?? rx.reps,
      ...(verbatimReps != null ? {} : { repsMax: rx.repsMax }),
      ...(cue ? { coachNote: cue } : {}),
    };
    return { row, dose };
  };

  const dayPins: PlacedPin[] = [];
  for (const p of opts.pins ?? []) {
    if (used.has(p.exercise.key)) continue; // the same lift named twice for one day is one row, not two
    used.add(p.exercise.key);
    dayPins.push(p);
    // The pin takes the slot of its own pattern, so the day does not also get the rulebook's version.
    const taken = slots.indexOf(p.exercise.pattern);
    if (taken >= 0) slots.splice(taken, 1);
  }
  for (const { pin, exercise } of dayPins.filter((p) => isCompound(p.exercise.pattern))) {
    const { row, dose } = pinRow(pin, exercise, main.length);
    sets += dose;
    main.push(row);
  }
  const tail = dayPins
    .filter((p) => !isCompound(p.exercise.pattern))
    .map((p) => pinRow(p.pin, p.exercise, Infinity));
  // Room and sets held back for the athlete's isolation work, written after the fill below.
  const reservedCount = tail.length;
  const reservedSets = tail.reduce((n, t) => n + t.dose, 0);

  /*
   * ══ 2. THE FOCUS TAKES A SLOT EARLY ══
   *
   * After the day's lead movements and before its tail — see `FOCUS_SLOT_INDEX`. What falls off the end
   * of the budget in exchange is the last isolation or core movement, which is the trade a focus is.
   */
  const extra = new Set<number>();
  const focusSlots = focus.focus.length > 0 ? focusSlotsFor(skeleton.slots, focus.focus) : [];
  if (focusSlots.length > 0) {
    const at = Math.min(FOCUS_SLOT_INDEX, slots.length);
    slots.splice(at, 0, ...focusSlots);
    focusSlots.forEach((_, i) => extra.add(at + i));
  }

  for (let si = 0; si < slots.length; si++) {
    const pattern = slots[si];
    if (main.length >= opts.budget - cardioSlots - reservedCount) break;
    /* ⚠ THE SET CEILING IS HELD HERE, NOT ONLY IN THE VALIDATOR. The budget counts EXERCISES and PAS-D11
       caps both: an advanced lifter's 75-minute hypertrophy day is eight exercises at four sets each —
       32 against HYPERTROPHY's 30 — so the builder wrote a day its own validator rejects (75 of 125
       advanced 75-minute muscle builds in the stress sweep, 2026-09-21). A slot that cannot carry a real
       dose of at least two sets inside the ceiling is not started. */
    if (opts.maxSets != null && opts.maxSets - sets - reservedSets < 2) break;

    const isFocusSlot = extra.has(si);
    let found: ReturnType<typeof fillSlot> = null;
    if (isFocusSlot) {
      // The group's own movers first, then anything that works it, then the pattern's usual answer.
      for (const p of focus.pools.get(pattern) ?? [pool]) {
        found = fillSlot(pattern, p, { ...baseCtx, used });
        if (found) break;
      }
      // A focus slot the room cannot fill is not a gap in the plan the athlete was promised — no note.
      if (!found) continue;
    } else {
      found = fillSlot(pattern, pool, { ...baseCtx, used });
    }
    if (!found) {
      // Only worth telling the athlete about once, and only on the first week — the same gap repeats
      // every week and a list of forty identical notes is noise, not information.
      if (opts.weekIndex === 0) notes.push({ kind: 'dropped', day: skeleton.name, wanted: pattern });
      continue;
    }
    if (found.relaxed && opts.weekIndex === 0 && !isFocusSlot) {
      notes.push({ kind: 'relaxed', day: skeleton.name, wanted: pattern, got: found.pattern });
    }
    /* Reaching a tier above the athlete is reported the same way relaxing a pattern is: it is the right
       call and it is still a thing they are owed a sentence about. Week 0 only, for the same reason —
       the same stretch repeats every week and forty identical notes are noise. */
    if (found.stretched && opts.weekIndex === 0) {
      notes.push({ kind: 'stretched', day: skeleton.name, wanted: pattern, got: found.exercise.name });
    }

    used.add(found.exercise.key);
    const role = roleFor(main.length, isCompound(found.pattern));
    const pctx = pctxFor();

    /* HOW to do it, not just how much — the line the athlete reads under THE PLAN SAYS. Keyed on the
       movement pattern and the goal, so it is a rulebook decision like every other number here rather
       than 733 hand-written strings. `null` for an advanced lifter on an accessory, deliberately. */
    const cue = cueOf(found.exercise);

    if (opts.category === 'MOBILITY') {
      const hold = prescribeHold(pctx);
      main.push({
        catalogKey: found.exercise.key,
        name: found.exercise.name,
        sets: hold.sets,
        durationSec: hold.durationSec,
        ...(cue ? { coachNote: cue } : {}),
      });
    } else {
      const rx = prescribeReps(role, pctx);
      const wanted = rx.sets + focusBonus(found.exercise);
      // The last slot takes what the ceiling leaves — the day keeps its length and its tail is lighter.
      const dose = opts.maxSets != null ? Math.min(wanted, opts.maxSets - sets - reservedSets) : wanted;
      sets += dose;
      main.push({
        catalogKey: found.exercise.key,
        name: found.exercise.name,
        sets: dose,
        reps: rx.reps,
        repsMax: rx.repsMax,
        ...(cue ? { coachNote: cue } : {}),
      });
    }
  }

  // The athlete's isolation work, in the place an isolation movement belongs.
  for (const t of tail) main.push(t.row);

  if (skeleton.cardioFinisher) {
    const opt = chooseCardio(opts.owned, opts.bannedActivities);
    if (opt) {
      main.push(
        prescribeCardio({
          activity: opt.activity,
          modality: opt.modality,
          // Time, not distance: a conditioning finisher is a dose of minutes, and prescribing a distance
          // makes a slower athlete work longer for the same line on the page.
          targetSec: skeleton.cardioFinisher.minutes * 60,
          rateKind: opt.rateKind,
          tracksDistance: opt.tracksDistance,
        }) as ProgramExercise,
      );
    } else if (opts.weekIndex === 0) {
      notes.push({ kind: 'dropped', day: skeleton.name, wanted: 'cardio finisher' });
    }
  }

  return {
    letter,
    name: nameForWeek(skeleton.name, opts.isDeload),
    warmup: [],
    main,
    cooldown: [],
  };
}

/**
 * Build the program.
 *
 * ⚠ ALWAYS `vary: true`. Weeks are not interchangeable here: reps climb through their range week to week
 * and PAS-D7's deloads cut sets in specific ones, so a single repeating template could express neither.
 * Materialising every week costs a little size in the jsonb column and buys an honest plan — and it is
 * the shape `swapSessionOrder` converts to on its first use anyway.
 */
export function assemble(
  rawConstraints: CoachConstraints,
  pool: readonly CatalogExercise[],
  canDo: EquipmentGate,
): AssembleResult {
  const c = normalise(rawConstraints);

  /*
   * ══ A WEEK THE ATHLETE SHAPED COMES FIRST (CA §4.1) ══
   *
   * "Run twice, lift three days" is not a goal with a split — it is a week of days, and the goal only
   * decides what the LIFT days are for. It goes before the refusals because the one refusal that could
   * fire here (a race goal with running ruled out) is about a race build, and a run-and-lift week is not
   * one: its runs meet the limitation on their own terms, day by day, in `assembleHybrid`.
   *
   * ⚠ UNLESS THERE IS A RACE DATE ON IT, and then it is BOTH. `CONCERN.hybridNotRace` has always said
   * *"if there's a race, give me the date and I'll build to it"* — so a `days` week with a date is a race
   * block whose week the athlete laid out, and it goes to `assembleRaceAndLift` with their order intact.
   */
  const ordered = raceOrderFrom(c);
  if (ordered) return assembleRaceAndLift(c, pool, canDo, ordered);
  if (c.days && c.days.length > 0) return assembleHybrid(c, pool, canDo);

  const refusal = refusalFor(c);
  if (refusal) return { ok: false, refusal };

  /* ══ A RACE THAT KEEPS LIFTING ══ "Half marathon in November, also lift 3x" is one block, not two: the
     run days are the race plan's own and the rest are the strength rulebook's. `liftDays: 0` or absent is
     the pure race plan, unchanged. */
  if (isEnduranceGoal(c.goal) && isCount(c.liftDays) && c.liftDays > 0) {
    return assembleRaceAndLift(c, pool, canDo, null);
  }

  /*
   * ══ THE ONE FAMILY BRANCH ══
   *
   * A race plan is built BACKWARDS FROM A DATE and measured in weekly miles; everything below this line
   * fills a fixed weekly split with exercises. They are two different products, not two settings of one,
   * and pretending otherwise would mean a skeleton table with a "long run" slot that no movement pattern
   * can fill. All five endurance goals still run through a single machine of their own — the per-GOAL
   * differences live in `RACE_SPEC`, which is the promise this engine was built on.
   */
  if (isEnduranceGoal(c.goal)) return withUnplacedPins(assembleEnduranceGoal(c, pool), c, pool);

  /* ⚠ `weekForAnyDays`, NOT `skeletonFor` — identical at 2–6, and the one place a 1- or 7-day week the
     athlete dictated (`athleteSetDays`) gets a shape instead of a refusal. */
  const requested = weekForAnyDays(c.goal, c.daysPerWeek, c.splitStyle ?? null);
  if (!requested) {
    return {
      ok: false,
      refusal: { reason: 'goal_not_authored', message: "I don't have a plan for that goal yet." },
    };
  }

  const concerns: string[] = [...dayCountConcerns(rawConstraints, c)];
  const plan = planLifts(c, c.goal, requested, pool, canDo, (day) => (isCount(day) ? day : null), concerns);

  const notes: AssemblyNote[] = [];
  const weekPlans = Array.from({ length: plan.weeks }, (_, weekIndex) => ({
    days: plan.variants.map((_, i) => liftDay(plan, i, String.fromCharCode(65 + i), weekIndex, pool, c, notes)),
  }));

  const thin = thinRefusal(weekPlans.flatMap((w) => w.days), c, plan.owned);
  if (thin) return { ok: false, refusal: thin };

  const structure: ProgramStructure = {
    name: nameFor(c.goal, plan.weeks),
    weeks: plan.weeks,
    daysPerWeek: c.daysPerWeek,
    vary: true,
    days: weekPlans[0].days,
    weekPlans,
  };

  concerns.push(...pinCeilingConcerns(plan, weekPlans[0].days.map((day, lift) => ({ day, lift }))));

  return {
    ok: true,
    assembly: {
      structure,
      notes,
      category: plan.category,
      deloadWeeks: plan.deloads,
      restructured: plan.restructured,
      unresolved: plan.unresolved,
      held: plan.held,
      chosen: plan.chosen,
      concerns: [...new Set(concerns)],
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE LIFT WEEK — shared by the strength path and the lift days of a hybrid week
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Everything the lift days of one build share, resolved once rather than per day per week. */
interface LiftPlan {
  variants: DaySkeleton[];
  baseCtx: CandidateContext;
  owned: readonly string[];
  bannedActivities: ReadonlySet<string>;
  restructured?: Restructure;
  category: PasCategory;
  goal: Goal;
  weeks: number;
  deloads: number[];
  /** Placed pins, by lift-day index. */
  pinsByDay: PlacedPin[][];
  focus: FocusPlan;
  unresolved: string[];
  held: PinHeld[];
  chosen: PinChosen[];
}

/**
 * The room, the context, the split check, the variants, the pins and the focus — everything before a
 * single day is built.
 *
 * `liftGoal` is the goal the lift days are FOR: the block's own goal on the strength path, and
 * `liftGoalFor(goal)` on a hybrid week (a race goal lends its lift days to `health`). `pinDay` turns a
 * pin's `day` into a lift-day index, or null when it names no lift day — the two paths index days
 * differently (training days vs the `days` week) and this is the one place that difference lives.
 */
function planLifts(
  c: CoachConstraints,
  liftGoal: Goal,
  requested: DaySkeleton[],
  pool: readonly CatalogExercise[],
  canDo: EquipmentGate,
  pinDay: (day: number | null | undefined) => number | null,
  concerns: string[],
): LiftPlan {
  const weeks = c.weeks ?? defaultWeeksFor(liftGoal);
  const category = GOAL_CATEGORY[liftGoal as keyof typeof GOAL_CATEGORY] as PasCategory;
  const deloads = deloadWeeks(weeks);

  // Equipment resolves in two steps and the order matters: the environment decides what is in the room,
  // then a limitation takes things back out of it. Doing it the other way lets a `no_barbell` athlete at
  // a full gym be handed a barbell.
  const owned = equipmentAfterLimitations(effectiveEquipment(c), c.limitations);
  const bannedActivities = new Set(
    c.limitations.flatMap((l) => (l === 'no_running' || l === 'knees' || l === 'no_jumping' ? ['run'] : [])),
  );

  const baseCtx = contextFrom({
    owned,
    canDo,
    experience: c.experience.lifting,
    limitations: c.limitations,
    limitationPatterns,
    /* A pattern ban is too blunt at both ends: it misses the upright row a shoulder complaint means, and
       it takes the glute bridge a bad back wants. Both tables, or neither is doing its job. */
    limitationKeys: limitationExcludeKeys,
    limitationKeepKeys,
    excludeExercises: c.excludeExercises,
    /* What this athlete keeps swapping TO. ⚠ It re-ranks within a pattern and can never remove one, so
       a program built with it is the same shape as one built without — just filled with the movements
       they actually do. Absent for anybody who has never swapped, which is most people. */
    learned: c.learned,
    recent: c.recent,
  });

  /*
   * ══ HOLT CHANGES THE SPLIT WHEN THE ROOM CANNOT SUPPORT IT ══
   *
   * A bodyweight athlete with no bar has no pulling pattern at all. Asked for a body-part split, the
   * assembler used to build a "Back & Biceps" day out of whatever it could still reach — which came out
   * as a hamstring curl and a plank, under that name. It was not a thin back day; it was not a back day,
   * and it said it was. That is worse than any gap, because the athlete has no way to tell.
   *
   * So the split is checked against what is actually trainable BEFORE anything is built. If a day cannot
   * be honest about itself, the whole split is wrong for this room and full body is used instead — which
   * is always viable, because a full-body day wants one of everything and is content with what it gets.
   *
   * The athlete is told, in Holt's voice, at the top of the result. A coach who silently substitutes is
   * not being tactful, he is being unaccountable.
   */
  const trainable = trainablePatterns(pool, baseCtx);
  let skeleton = requested;
  let restructured: Restructure | undefined;

  if (!weekIsViable(requested, trainable)) {
    const blocked = firstUnviableDay(requested, trainable);
    /* ⚠ THROUGH `skeletonFor`, not the raw table. `fullBodyFallback` returns the bare full-body week, and
       using it directly stripped the cardio finishers off a CONDITIONING block — Holt restructured the
       split and quietly deleted the conditioning while he was at it. `skeletonFor` re-applies whatever
       the goal requires on top of the chosen shape, which is exactly the point of it existing.
       (`weekForAnyDays` is `skeletonFor` with the athlete's 1- and 7-day ends derived from it.) */
    const fallback =
      weekForAnyDays(liftGoal, requested.length, 'full_body') ??
      fullBodyFallback(Math.min(MAX_DAYS_PER_WEEK, Math.max(MIN_DAYS_PER_WEEK, requested.length)));
    if (fallback && fallback.length === requested.length && weekIsViable(fallback, trainable)) {
      skeleton = fallback;
      restructured = {
        from: requested[0]?.name ?? 'that split',
        to: 'full body',
        because: blocked
          ? `A ${blocked.name.toLowerCase()} day needs equipment you haven't got, and I'm not going to write one that can't train what it says on the tin. Full-body sessions cover you properly with what's there.`
          : "That split needs equipment you haven't got. Full-body sessions cover you properly with what's there.",
      };
    }
    // No viable fallback at all is not a restructure — it is a room with nothing in it, and the
    // empty-day check below refuses in plain terms rather than shipping a shell.
  }

  // Name each repeated day type by how many times it appears, so "Upper A" only exists when there is a B.
  const occurrences = new Map<string, number>();
  for (const d of skeleton) occurrences.set(d.name, (occurrences.get(d.name) ?? 0) + 1);
  const seen = new Map<string, number>();
  const variants = skeleton.map((d) => {
    const n = seen.get(d.name) ?? 0;
    seen.set(d.name, n + 1);
    return variantFor(d, n, occurrences.get(d.name) ?? 1);
  });

  // ── The focus: a table lookup, or nothing — and said once when the goal sets it aside ──
  const wantsFocus = (c.focusMuscles ?? []).length > 0;
  const focus = wantsFocus && focusApplies(liftGoal) ? focusPlanFor(c.focusMuscles ?? [], pool) : NO_FOCUS;
  if (wantsFocus && !focusApplies(liftGoal)) concerns.push(CONCERN.focusIgnored());

  // ── The athlete's own exercises: resolved, walled, and given a day ──
  const pins = placePins(c, pool, canDo, owned, baseCtx, variants, pinDay, concerns);
  if (pins.hasVerbatimSets && deloads.length > 0) concerns.push(CONCERN.pinDeload(deloads[0] + 1));

  return {
    variants,
    baseCtx,
    owned,
    bannedActivities,
    restructured,
    category,
    goal: liftGoal,
    weeks,
    deloads,
    pinsByDay: pins.byDay,
    focus,
    unresolved: pins.unresolved,
    held: pins.held,
    chosen: pins.chosen,
  };
}

/**
 * Lift day `i` of the plan, for one week.
 *
 * `over` is how one week asks for a different day than the block's — race week's short upper session
 * (`RACE_WEEK_LIFT`), and nothing else so far. Absent is the plan's own day, exactly as before.
 */
function liftDay(
  plan: LiftPlan,
  i: number,
  letter: string,
  weekIndex: number,
  pool: readonly CatalogExercise[],
  c: CoachConstraints,
  notes: AssemblyNote[],
  over?: { skeleton?: DaySkeleton; maxExercises?: number },
): ProgramDay {
  const isDeload = plan.deloads.includes(weekIndex);
  const band = bandFor(plan.category, isDeload);
  const budget = Math.min(exerciseBudget(c.sessionMinutes), band.maxExercises, over?.maxExercises ?? Infinity);
  return buildDay(over?.skeleton ?? plan.variants[i], letter, pool, plan.baseCtx, {
    category: plan.category,
    goal: plan.goal,
    experience: c.experience,
    weekIndex,
    totalWeeks: plan.weeks,
    isDeload,
    budget,
    maxSets: band.maxSets,
    owned: plan.owned,
    bannedActivities: plan.bannedActivities,
    pins: plan.pinsByDay[i] ?? [],
    focus: plan.focus,
  }, notes);
}

/*
 * ══ ⚠ A BACKSTOP, AND HONESTLY NOT THE THING THAT FIXED THE REPORT ══
 *
 * The check here used to be `main.length === 0`. Zero was refused; one and two were shipped — as an
 * EIGHT-WEEK BLOCK. The single-workout path was given `MIN_DAY_MOVEMENTS` when the PO reported this
 * class of bug against it (`day.ts`, `thin-day.test.mjs`, 2026-08-14); the assembler was never
 * brought along, so a program could still ship a two-movement day that a one-off workout refused.
 *
 * ⚠ **IT WOULD NOT HAVE CAUGHT THE 2026-08-17 REPORT.** That program — dumbbells, a mat, a bench and
 * a bad back — came out at *Box Squat to Bench · Seated Dumbbell Shoulder Press · Dead Bug*, three
 * movements a day for eight weeks, which clears a floor of three by exactly nothing. What repaired
 * that is `STRETCH_CEILING` in `candidates.ts`; this closes the hole underneath it so the next
 * starved room refuses instead of shipping. Swept after the fix: **54,000 combinations across six
 * rooms, 0 refusals, thinnest day shipped anywhere = 4.** It is a guard that should never fire.
 *
 * Same constant as the day builder, deliberately — a session is a session, and a floor that differed
 * between them would mean Holt refusing to write a workout he would happily put in a program.
 *
 * ⚠ NOT THE PAS-D11 FLOOR, which is 4–5 depending on category. That one is already handled, and
 * deliberately as a DEVIATION rather than a failure, by `validate-program.ts` — a room that cannot
 * reach five movements gets a note, not a refusal. Re-deciding it here would overrule the standard
 * from the wrong file.
 *
 * ⚠ IT IS CHECKED ON EVERY WEEK, NOT JUST THE FIRST. A deload cuts sets, never exercises (PAS-A6-D2),
 * so week 1 is representative today — but that is a property of the volume tables, not a guarantee
 * this check is entitled to assume.
 *
 * ⚠ LIFT DAYS ONLY. A hybrid week's run is one row by design, and is not a thin lift day.
 */
function thinRefusal(liftDays: readonly ProgramDay[], c: CoachConstraints, owned: readonly string[]): CoachRefusal | null {
  const thin = liftDays.filter((d) => d.main.length < MIN_DAY_MOVEMENTS);
  if (thin.length === 0) return null;
  const bareRoom = c.environment === 'bodyweight' || owned.length === 0;
  return {
    reason: 'not_enough_equipment',
    message: c.limitations.length > 0 && !bareRoom
      ? "Between what you've got to train with and what you've told me to work around, I can't fill a session properly — and a three-movement week isn't a program. Add what else you have access to, or take one restriction off, and I'll build it."
      : "There isn't enough here for me to build a full week — I couldn't fill a single day. Tell me what you have access to, or pick bodyweight-only and I'll work with that.",
  };
}

/**
 * CA-D12 for the day count: a count the athlete set outside Holt's own 2–6 is built and said once; a count
 * Holt had to clamp is said too, never done silently. Absent when nothing about the count is unusual.
 */
function dayCountConcerns(raw: CoachConstraints, c: CoachConstraints): string[] {
  const out: string[] = [];
  const asked = isCount(raw.daysPerWeek) ? Math.round(raw.daysPerWeek) : null;
  if (asked != null && asked !== c.daysPerWeek) out.push(CONCERN.clampedDays(asked, c.daysPerWeek));
  if (c.daysPerWeek >= 7) out.push(CONCERN.noRestDay());
  if (c.daysPerWeek === 1) out.push(CONCERN.oneDay());
  return out;
}

/** A day the athlete's own sets pushed past the session ceiling — theirs, and said once. Week 1 only. */
function pinCeilingConcerns(plan: LiftPlan, week1: readonly { day: ProgramDay; lift: number }[]): string[] {
  const band = bandFor(plan.category, false);
  const out: string[] = [];
  week1.forEach(({ day: d, lift }) => {
    if ((plan.pinsByDay[lift] ?? []).length === 0) return;
    const sets = d.main.reduce((n, ex) => n + (ex.kind === 'cardio' ? 0 : (ex.sets ?? 0)), 0);
    if (d.main.length > band.maxExercises || (band.maxSets != null && sets > band.maxSets)) {
      out.push(CONCERN.pinOverCeiling(d.name));
    }
  });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// PINNED EXERCISES — CA-D3's "Exercises given" and "Everything given"
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Resolve, wall, and place every pin.
 *
 * ══ EVERY PIN ENDS IN EXACTLY ONE OF FOUR PLACES ══
 *
 *   · on a day            — resolved, allowed, placed
 *   · `unresolved`        — the catalogue could not match the words; asked back
 *   · `held`              — matched, but a wall stands (limitation, kit, exclusion, no lift day), with
 *                           its sentence in `concerns`
 *   · (a duplicate)       — the same lift named twice for one day is one row
 *
 * There is no fifth place. Silently dropping a name is the Exercise Picker's known failure (`resolveKey`
 * miss = silent drop) and the sweep test asserts it cannot happen here.
 *
 * ══ RESOLUTION: THE CATALOGUE'S RESOLVER, THEN THE FAMILY TABLE ══
 *
 * A given `catalogKey` that is in the pool wins. Otherwise `resolveAgainstCatalog` — the same path the
 * Program Builder's import uses, matcher first and curated aliases only on a miss — and only then
 * `rulebook/pinned.ts`'s families ("rows", "curls"), which pick inside ONE pattern with the rulebook's own
 * ranking, in the athlete's room, and are reported on `chosen`.
 *
 * ══ PLACEMENT: THE DAY THEY SAID, ELSE THE DAY WHOSE PATTERN FITS ══
 *
 * A pin's own day wins when it names a lift day. Otherwise it goes on the day that lists its movement
 * pattern EARLIEST — a bench press lands where a horizontal push leads, not where one is the sixth slot —
 * then the day carrying the fewest pins, then the earliest day. Each pin is placed once a week: "bench,
 * rows, pull-ups, curls, three days" spreads the four across the week rather than stacking all four on
 * every day, and the rulebook fills around them.
 */
function placePins(
  c: CoachConstraints,
  pool: readonly CatalogExercise[],
  canDo: EquipmentGate,
  owned: readonly string[],
  ctx: CandidateContext,
  days: readonly DaySkeleton[],
  pinDay: (day: number | null | undefined) => number | null,
  concerns: string[],
): { byDay: PlacedPin[][]; unresolved: string[]; held: PinHeld[]; chosen: PinChosen[]; hasVerbatimSets: boolean } {
  const byDay: PlacedPin[][] = days.map(() => []);
  const unresolved: string[] = [];
  const held: PinHeld[] = [];
  const chosen: PinChosen[] = [];
  const pins = c.pinned ?? [];
  if (pins.length === 0) return { byDay, unresolved, held, chosen, hasVerbatimSets: false };

  const byKey = new Map(pool.map((e) => [e.key, e]));
  const catalog = pool.map((e) => ({ key: e.key, name: e.name, aliases: e.aliases ? [...e.aliases] : undefined }));
  const room = effectiveEquipment(c);
  let hasVerbatimSets = false;

  for (const pin of pins) {
    const label = (pin.name ?? '').trim() || pin.catalogKey || '';
    const found = resolvePin(pin, pool, byKey, catalog, ctx);
    if (!found) {
      unresolved.push(label);
      continue;
    }
    if (found.kind === 'family_blocked') {
      // The family exists but nothing in it survives the room and the limitations — say which wall.
      const reason = ctx.excludePatterns.has(found.family.pattern) ? 'limitation' : 'equipment';
      held.push({ asked: label, name: label, catalogKey: '', reason });
      concerns.push(reason === 'limitation' ? CONCERN.pinHeldLimitation(label, null) : CONCERN.pinHeldEquipment(label));
      continue;
    }
    const ex = found.exercise;
    if (found.kind === 'family') chosen.push({ asked: label, catalogKey: ex.key, name: ex.name });

    if (days.length === 0) {
      held.push({ asked: label, name: ex.name, catalogKey: ex.key, reason: 'no_lift_day' });
      concerns.push(CONCERN.pinNoLiftDay(ex.name));
      continue;
    }

    const wall = pin.confirmed ? null : wallFor(ex, c, ctx, canDo, owned, room);
    if (wall) {
      held.push({ asked: label, name: ex.name, catalogKey: ex.key, reason: wall.reason });
      concerns.push(
        wall.reason === 'limitation'
          ? CONCERN.pinHeldLimitation(ex.name, wall.limitation)
          : wall.reason === 'excluded'
            ? CONCERN.pinHeldExcluded(ex.name)
            : CONCERN.pinHeldEquipment(ex.name),
      );
      continue;
    }

    const own = pinDay(pin.day);
    const target = own != null && own >= 0 && own < days.length ? own : bestDayFor(ex.pattern, days, byDay);
    byDay[target].push({ pin, exercise: ex });
    if (isCount(pin.sets)) hasVerbatimSets = true;
  }

  return { byDay, unresolved, held, chosen, hasVerbatimSets };
}

type ResolvedPin =
  | { kind: 'exact'; exercise: CatalogExercise }
  | { kind: 'family'; exercise: CatalogExercise; family: PinFamily }
  | { kind: 'family_blocked'; family: PinFamily };

function resolvePin(
  pin: PinnedExercise,
  pool: readonly CatalogExercise[],
  byKey: ReadonlyMap<string, CatalogExercise>,
  catalog: { key: string; name: string; aliases?: string[] }[],
  ctx: CandidateContext,
): ResolvedPin | null {
  if (pin.catalogKey && byKey.has(pin.catalogKey)) return { kind: 'exact', exercise: byKey.get(pin.catalogKey)! };
  const name = (pin.name ?? '').trim();
  if (!name) return null;

  const matched = resolveAgainstCatalog(name, catalog);
  const exact = matched ? byKey.get(matched.key) : undefined;
  if (exact) return { kind: 'exact', exercise: exact };

  const key = aliasKey(name);
  const family = PIN_FAMILIES.find((f) => aliasKey(f.words) === key);
  if (!family) return null;

  // Inside the one pattern, in the rulebook's own order, in this room — the athlete's level first, then
  // the tier above, exactly as `fillSlot` walks it. Never a relaxed pattern: "rows" is a row or nothing.
  const members = pool.filter((e) => e.pattern === family.pattern && (!family.name || family.name.test(e.name)));
  for (const stretch of canStretch(ctx.experience) ? [false, true] : [false]) {
    const pick = candidatesFor(family.pattern, members, ctx, stretch)[0];
    if (pick) return { kind: 'family', exercise: pick, family };
  }
  return { kind: 'family_blocked', family };
}

/**
 * Which wall, if any, stands between a resolved pin and the program.
 *
 * The same gates `candidatesFor` applies to anything Holt picks — the athlete's exclusions, a limitation's
 * patterns (with its carve-outs) and keys, and the room after limitations — minus difficulty and
 * coherence, which are Holt's judgements about what to CHOOSE and have nothing to say about what the
 * athlete chose. A limitation is named by the first one that bites, so the sentence can say which.
 */
function wallFor(
  ex: CatalogExercise,
  c: CoachConstraints,
  ctx: CandidateContext,
  canDo: EquipmentGate,
  owned: readonly string[],
  room: readonly string[],
): { reason: 'limitation' | 'equipment' | 'excluded'; limitation: Limitation | null } | null {
  if (c.excludeExercises.includes(ex.key)) return { reason: 'excluded', limitation: null };
  const patternBanned = ctx.excludePatterns.has(ex.pattern) && !ctx.keepKeys?.has(ex.key);
  if (ctx.excludeKeys.has(ex.key) || patternBanned || !canDo(ex, owned)) {
    if (!canDo(ex, room)) return { reason: 'equipment', limitation: null };
    const blame =
      c.limitations.find(
        (l) =>
          limitationExcludeKeys(l).includes(ex.key) ||
          (limitationPatterns(l).includes(ex.pattern) && !limitationKeepKeys(l).includes(ex.key)) ||
          !canDo(ex, equipmentAfterLimitations(room, [l])),
      ) ?? null;
    return { reason: 'limitation', limitation: blame };
  }
  return null;
}

/** The lift day a pin with no day of its own belongs on — see `placePins`. */
function bestDayFor(pattern: string, days: readonly DaySkeleton[], byDay: readonly PlacedPin[][]): number {
  let best = 0;
  let bestScore = [Infinity, Infinity];
  days.forEach((d, i) => {
    const at = d.slots.indexOf(pattern);
    const score = [at < 0 ? Infinity : at, byDay[i].length];
    if (score[0] < bestScore[0] || (score[0] === bestScore[0] && score[1] < bestScore[1])) {
      best = i;
      bestScore = score;
    }
  });
  return best;
}

/**
 * A race plan has no lift day, so a pin cannot be placed in one — and must not vanish either. Every pin
 * on a race build comes back held (`no_lift_day`) or unresolved, with its sentence.
 */
function withUnplacedPins(res: AssembleResult, c: CoachConstraints, pool: readonly CatalogExercise[]): AssembleResult {
  if (!res.ok || (c.pinned ?? []).length === 0) return res;
  const concerns: string[] = [];
  const ctx = contextFrom({
    owned: [],
    canDo: () => true,
    experience: c.experience.lifting,
    limitations: [],
    limitationPatterns: () => [],
  });
  const pins = placePins(c, pool, () => true, [], ctx, [], () => null, concerns);
  return {
    ok: true,
    assembly: {
      ...res.assembly,
      unresolved: pins.unresolved,
      held: pins.held,
      chosen: pins.chosen,
      // ⚠ ADDED TO, NOT REPLACING. The race plan may already carry one (a target time's, `goalTime`), and
      // assigning over it would drop a sentence the athlete is owed.
      concerns: [...new Set([...(res.assembly.concerns ?? []), ...concerns])],
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// A RACE THAT KEEPS LIFTING — one block, two rulebooks
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * ══ "STRONG AND RUN A SUB-25 5K" IS ONE PLAN ══
 *
 * The corpus asks for both halves in one sentence — *"marathons and bench 3 plates"*, *"half marathon in
 * Nov, also lift 3x"* — and the engine used to answer with one half or the other: a race goal built a
 * running-only block, and a `days` week built easy runs with no race progression in them at all. Only 5 of
 * 18 casual hybrids landed in the live run.
 *
 * Nothing here is a third rulebook. The running days ARE `endurance.ts`'s days, off the same volume curve,
 * with the same phases, the same taper and the same race week (`enduranceBlock`). The lifting days ARE the
 * strength rulebook's, through the same `planLifts` and `buildDay` a pure strength block uses, so the goal,
 * the focus, the pins, the limitations and the room all apply without a second copy of any of them. What is
 * new is two decisions and nothing else:
 *
 *   1. HOW MANY of each the week holds — `splitRaceWeek`, off two tables.
 *   2. WHICH ORDER they sit in — `arrangeRaceWeek`, off `INTERFERENCE_RULES`, unless the athlete fixed it.
 */

/** One day of the week beside a race: which rulebook fills it, or nothing. */
type RaceSlot = 'run' | 'lift' | 'rest';

/** The week the athlete laid out themselves — a `days` week with a race date on it. */
interface GivenOrder {
  slots: RaceSlot[];
  asGiven: boolean;
}

const WEEK_DAYS = 7;

/** Rest to the end of the calendar week, so "the day after" wraps across a real Sunday and not a list. */
const padWeek = (slots: readonly RaceSlot[]): RaceSlot[] => [
  ...slots.slice(0, WEEK_DAYS),
  ...Array.from({ length: Math.max(0, WEEK_DAYS - slots.length) }, (): RaceSlot => 'rest'),
];

/**
 * Is this a race block whose week the athlete already laid out?
 *
 * A `days` week plus a race date, which is exactly what `CONCERN.hybridNotRace` has always offered to
 * build. Below two running days it is not a race block whatever the date says — one run a week cannot
 * carry a progression — and `CONCERN.raceNeedsTwoRuns` says so instead of quietly building one.
 */
function raceOrderFrom(c: CoachConstraints): GivenOrder | null {
  const week = c.days ?? [];
  if (week.length === 0 || !isEnduranceGoal(c.goal) || !c.raceDate) return null;
  const slots: RaceSlot[] = week.map((d) => (d.kind === 'rest' ? 'rest' : d.kind === 'lift' ? 'lift' : 'run'));
  if (slots.filter((s) => s === 'run').length < MIN_ENDURANCE_DAYS) return null;
  return { slots: padWeek(slots), asGiven: c.daysAsGiven === true };
}

/**
 * How the week divides between the race and the barbell.
 *
 * Two tables and a floor, and every one of them can only ever take lifting days AWAY — the running days
 * are what the race needs, and a race build that quietly ran less because the athlete also wanted to lift
 * would be the coach answering a question nobody asked.
 */
function splitRaceWeek(opts: { goal: Goal; week: number; asked: number; peakMi: number }): { runDays: number; liftDays: number } {
  const byLoad = opts.goal === 'triathlon' ? TRI_LIFT_DAYS_MAX : liftDaysAtPeak(opts.peakMi);
  const floor = Math.max(
    MIN_ENDURANCE_DAYS,
    Math.min(MIN_RACE_RUN_DAYS[opts.goal] ?? MIN_ENDURANCE_DAYS, opts.week - 1),
  );
  const lift = Math.max(0, Math.min(opts.asked, byLoad, opts.week - floor));
  const runDays = Math.max(MIN_ENDURANCE_DAYS, opts.week - lift);
  return { runDays, liftDays: Math.max(0, opts.week - runDays) };
}

/** Which session sits in each slot of the week, once the rest days are taken out. */
type RaceSession = { kind: 'run'; at: number } | { kind: 'lift'; at: number };

const sessionsIn = (slots: readonly RaceSlot[]): RaceSession[] => {
  let run = 0;
  let lift = 0;
  return slots
    .filter((s) => s !== 'rest')
    .map((s): RaceSession => (s === 'run' ? { kind: 'run', at: run++ } : { kind: 'lift', at: lift++ }));
};

/**
 * The session on each of the seven days, rest days included as gaps.
 *
 * ⚠ ADJACENCY IS CALENDAR DAYS, NOT SESSION ORDER. Reading the sessions as a list makes a rest day
 * invisible, which is the one thing that actually separates a leg day from a long run.
 */
function byDay(slots: readonly RaceSlot[]): (RaceSession | null)[] {
  const sessions = sessionsIn(slots);
  let k = 0;
  return slots.map((s) => (s === 'rest' ? null : (sessions[k++] ?? null)));
}

/** A rule that stands in the week as laid out, with the lift day it is about. */
interface Interference {
  rule: (typeof INTERFERENCE_RULES)[number];
  liftDay: string;
}

/**
 * The first interference rule the week breaks — one sentence's worth, in the table's own priority order.
 *
 * Read cyclically: the week repeats, so Sunday is the day before Monday, and a rest day between a leg day
 * and a long run is the cheapest fix there is.
 */
function firstInterference(
  slots: readonly RaceSlot[],
  demands: readonly RunDemand[],
  loads: readonly LiftLoad[],
  names: readonly string[],
): Interference | null {
  const atDay = byDay(slots);
  for (const rule of INTERFERENCE_RULES) {
    for (let i = 0; i < atDay.length; i += 1) {
      const a = atDay[i];
      const b = atDay[(i + 1) % atDay.length];
      if (!a || !b) continue;
      const lift = rule.where === 'day_before' ? a : b;
      const run = rule.where === 'day_before' ? b : a;
      if (lift.kind !== 'lift' || run.kind !== 'run') continue;
      if (demands[run.at] !== rule.of || !rule.forbids.includes(loads[lift.at] ?? 'upper')) continue;
      return { rule, liftDay: names[lift.at] ?? 'That lift day' };
    }
  }
  return null;
}

/** Every way to choose `k` of `n` positions, in lexicographic order — so the arrangement is stable. */
function choose(n: number, k: number): number[][] {
  if (k <= 0) return [[]];
  const out: number[][] = [];
  const walk = (start: number, taken: number[]): void => {
    if (taken.length === k) {
      out.push([...taken]);
      return;
    }
    for (let i = start; i <= n - (k - taken.length); i += 1) {
      taken.push(i);
      walk(i + 1, taken);
      taken.pop();
    }
  };
  walk(0, []);
  return out;
}

/**
 * The order Holt lays out when the athlete did not fix one.
 *
 * Each side keeps its own internal order — the running week's spacing is `composeRunWeek`'s work and the
 * lift days are the split's rotation — so this only chooses WHERE in the seven days each one lands. Every
 * interleaving is scored against `INTERFERENCE_RULES` and the cheapest wins; at most a couple of hundred
 * arrangements exist, so it is exhaustive rather than clever. Ties keep the earliest, which puts the
 * running week at the front of the week and reads the way a runner's calendar does.
 */
function arrangeRaceWeek(opts: { demands: readonly RunDemand[]; loads: readonly LiftLoad[] }): RaceSlot[] {
  const runs = opts.demands.length;
  const lifts = opts.loads.length;
  let best: RaceSlot[] | null = null;
  let bestCost = Infinity;
  for (const runAt of choose(WEEK_DAYS, Math.min(runs, WEEK_DAYS))) {
    const free = Array.from({ length: WEEK_DAYS }, (_, i) => i).filter((i) => !runAt.includes(i));
    for (const pick of choose(free.length, Math.min(lifts, free.length))) {
      const liftAt = pick.map((i) => free[i]);
      const slots: RaceSlot[] = Array.from({ length: WEEK_DAYS }, (_, i) =>
        runAt.includes(i) ? 'run' : liftAt.includes(i) ? 'lift' : 'rest',
      );
      const cost = raceWeekCost(slots, opts.demands, opts.loads);
      if (cost < bestCost) {
        best = slots;
        bestCost = cost;
        if (cost === 0) return slots;
      }
    }
  }
  return best ?? padWeek(Array.from({ length: runs }, (): RaceSlot => 'run'));
}

/** What an arrangement costs — the rules' own numbers, plus keeping the lift days apart as a tiebreak. */
function raceWeekCost(slots: readonly RaceSlot[], demands: readonly RunDemand[], loads: readonly LiftLoad[]): number {
  const atDay = byDay(slots);
  let total = 0;
  for (let i = 0; i < atDay.length; i += 1) {
    const a = atDay[i];
    const b = atDay[(i + 1) % atDay.length];
    if (!a || !b) continue;
    for (const rule of INTERFERENCE_RULES) {
      const lift = rule.where === 'day_before' ? a : b;
      const run = rule.where === 'day_before' ? b : a;
      if (lift.kind !== 'lift' || run.kind !== 'run') continue;
      if (demands[run.at] === rule.of && rule.forbids.includes(loads[lift.at] ?? 'upper')) total += rule.cost;
    }
    if (a.kind === 'lift' && b.kind === 'lift') {
      total += INTERFERENCE_COST.sameKindBackToBack;
      if (loads[a.at] === 'lower_heavy' && loads[b.at] === 'lower_heavy') total += INTERFERENCE_COST.heavyLegsBackToBack;
    }
  }
  return total;
}

/**
 * The athlete's own week, made to fit the block that was actually built.
 *
 * ⚠ THE ONLY THINGS THAT MOVE ARE THE ONES THE RULEBOOK CHANGED — a lifting day the week could not hold
 * (`splitRaceWeek`) becomes a rest day, and a running day EPS-D7 insisted on takes the first free day. The
 * order they wrote is otherwise kept exactly, because it is theirs (CA-D12).
 */
function fitGiven(slots: readonly RaceSlot[], runDays: number, liftDays: number): RaceSlot[] {
  const out = padWeek(slots);
  const count = (k: RaceSlot) => out.filter((s) => s === k).length;
  for (let i = out.length - 1; i >= 0 && count('lift') > liftDays; i -= 1) if (out[i] === 'lift') out[i] = 'rest';
  for (let i = out.length - 1; i >= 0 && count('run') > runDays; i -= 1) if (out[i] === 'run') out[i] = 'rest';
  while (count('run') < runDays && out.includes('rest')) out[out.indexOf('rest')] = 'run';
  return out;
}

/**
 * A race build that keeps lifting.
 *
 * `given` is the athlete's own week when they wrote one; null means Holt lays it out. Everything else is
 * the two rulebooks, unchanged, plus the sentences about what had to give.
 */
function assembleRaceAndLift(
  c: CoachConstraints,
  pool: readonly CatalogExercise[],
  canDo: EquipmentGate,
  given: GivenOrder | null,
): AssembleResult {
  const refused = refusalFor(c);
  if (refused) return { ok: false, refusal: refused };

  const concerns: string[] = [];
  const stretchKeys = stretchKeysIn(pool);
  const eopts = (enduranceDays: number): EnduranceOpts => ({
    todayISO: new Date().toISOString().slice(0, 10),
    stretchKeys,
    canRunContinuously: c.canRunContinuously ?? undefined,
    recentRaceMi: c.recentRaceMi,
    recentRaceSec: c.recentRaceSec,
    enduranceDays,
    keepDaysInRaceWeek: true,
  });

  const week = given ? given.slots.filter((s) => s !== 'rest').length : c.daysPerWeek;
  const asked = given ? given.slots.filter((s) => s === 'lift').length : Math.max(0, Math.round(c.liftDays ?? 0));

  /* The curve is read BEFORE the week is split, because how much lifting a week can hold depends on how
     much running it is doing (`LIFT_DAYS_AT_PEAK_MI`) — and the curve itself never moves with the split,
     so reading it twice cannot change it. */
  let block = enduranceBlock(c, eopts(Math.max(MIN_ENDURANCE_DAYS, week - asked)));
  if (block.refusal && c.buildAnyway !== true) {
    // The rulebook's refusals are about time and base, and they arrive through the same channel the
    // wizard already shows — see `assembleEnduranceGoal`.
    return { ok: false, refusal: { reason: 'limitation_conflicts_with_goal', message: block.refusal.message } };
  }
  const peakMi = block.volume.reduce((n, v) => Math.max(n, v.mileage), 0);

  let liftDays = asked;
  if (!given) {
    const split = splitRaceWeek({ goal: c.goal, week, asked, peakMi });
    if (split.runDays !== block.daysPerWeek) block = enduranceBlock(c, eopts(split.runDays));
    liftDays = split.liftDays;
  }
  /* EPS-D7 can move the running days on its own — a beginner gets three whatever they asked for, and
     nobody who cannot yet run continuously gets more than four. The week does not grow to pay for it: the
     lifting gives way, and the sentence below says so. */
  const runDays = block.daysPerWeek;
  liftDays = Math.max(0, Math.min(liftDays, week - runDays));

  const liftGoal = c.strengthGoal ?? RACE_LIFT_GOAL;
  const requested = raceLiftWeek(c, liftGoal, liftDays);
  const plan = planLifts(
    { ...c, weeks: block.weeks, daysPerWeek: Math.max(1, requested.length) },
    liftGoal,
    requested,
    pool,
    canDo,
    // A pin's `day` indexes the athlete's own week where they wrote one, and the lift days otherwise.
    (day) => (isCount(day) ? (given ? liftIndexIn(given.slots, day) : day) : null),
    concerns,
  );
  liftDays = plan.variants.length;
  if (liftDays < asked) concerns.push(CONCERN.liftDaysTrimmed(asked, liftDays, peakMi));
  if (block.goalTime?.concern) concerns.push(block.goalTime.concern);

  /*
   * The week's shape is chosen ONCE, off the last week before the taper — where the long run is longest and
   * the lifting hardest to place. A shape that changed week to week would be a program the athlete cannot
   * put in a calendar, and a week whose length changed would be one the validator will not walk.
   */
  const shapeWeek = block.volume.reduce((best, v, i) => (v.phase === 'taper' ? best : i), 0);
  const demands = (block.weekPlans[shapeWeek]?.roles ?? []).map((r) => RUN_DEMAND[r]);
  const loads = plan.variants.map(liftLoadOf);
  const names = plan.variants.map((v) => v.name);
  const slots = given?.asGiven ? fitGiven(given.slots, runDays, liftDays) : arrangeRaceWeek({ demands, loads });

  const clash = firstInterference(slots, demands, loads, names);
  if (clash) {
    /* The athlete's order is kept and named (CA-D12). Holt's own is the cheapest arrangement there was, so
       the only thing left to say about the long run is that there was nowhere else to put it. */
    concerns.push(
      !given?.asGiven && clash.rule.where === 'day_before' && clash.rule.of === 'long'
        ? CONCERN.heavyLegsUnavoidable()
        : clash.rule.say(clash.liftDay),
    );
  }

  const sessions = sessionsIn(slots);
  const notes: AssemblyNote[] = [];
  const raceWeek = block.weeks - 1;
  const raceWeekLift = {
    skeleton: dayForFocus(RACE_WEEK_LIFT.focus) ?? undefined,
    maxExercises: RACE_WEEK_LIFT.maxExercises,
  };
  const weekPlans = block.weekPlans.map((ew, weekIndex) => {
    const isDeload = plan.deloads.includes(weekIndex);
    /* ⚠ NOTHING IS SCHEDULED AFTER THE RACE. The week's shape is the block's, and in race week that can put
       a lifting day after the thing the block was built for — so in that one week the race goes last and
       whatever sat behind it moves in front of it. */
    const order = weekIndex === raceWeek ? raceLast(sessions, ew.roles) : sessions;
    const days = order.map((s, i): ProgramDay => {
      const letter = String.fromCharCode(65 + i);
      if (s.kind === 'lift') {
        return liftDay(plan, s.at, letter, weekIndex, pool, c, notes, weekIndex === raceWeek ? raceWeekLift : undefined);
      }
      const run = ew.days[Math.min(s.at, ew.days.length - 1)];
      return marked({ ...run, letter }, isDeload);
    });
    return { days };
  });

  const thin = thinRefusal(
    weekPlans.flatMap((w) => w.days.filter((d) => d.main.some((e) => e.kind !== 'cardio'))),
    c,
    plan.owned,
  );
  if (thin) return { ok: false, refusal: thin };

  concerns.push(
    ...pinCeilingConcerns(
      plan,
      weekPlans[0].days
        .map((day, i) => ({ day, lift: sessions[i].kind === 'lift' ? sessions[i].at : null }))
        .filter((d): d is { day: ProgramDay; lift: number } => d.lift != null),
    ),
  );

  const label = block.spec.label.replace(/^./, (ch) => ch.toUpperCase());
  const structure: ProgramStructure = {
    name: liftDays > 0 ? `${block.weeks}-Week ${label} & Lifting Plan` : `${block.weeks}-Week ${label} Plan`,
    weeks: block.weeks,
    daysPerWeek: sessions.length,
    vary: true,
    days: weekPlans[0].days,
    weekPlans,
  };

  return {
    ok: true,
    assembly: {
      structure,
      notes,
      /* ⚠ THE LIFT GOAL'S CATEGORY, NOT `RUNNING`. The volume gates (PAS-D11) are about the lifting — a
         RUNNING band caps a day at three exercises and would reject every strength day in the block. The
         run days fall under its floor and are reported as deviations, which is what a deviation is for. */
      category: (liftDays > 0 ? GOAL_CATEGORY[liftGoal as keyof typeof GOAL_CATEGORY] : 'RUNNING') as PasCategory,
      deloadWeeks: plan.deloads,
      restructured: plan.restructured,
      unresolved: plan.unresolved,
      held: plan.held,
      chosen: plan.chosen,
      concerns: [...new Set(concerns)],
      weekShape: slots,
      ...(enduranceConcernOf(block, c) ? { concern: enduranceConcernOf(block, c) } : {}),
    },
  };
}

/** The race week's sessions with the race itself last — see the note at its call site. */
function raceLast(sessions: readonly RaceSession[], roles: readonly SessionRole[]): RaceSession[] {
  const at = roles.indexOf('race');
  if (at < 0) return [...sessions];
  const race = sessions.find((s) => s.kind === 'run' && s.at === at);
  if (!race) return [...sessions];
  return [...sessions.filter((s) => s !== race), race];
}

/**
 * The lifting week beside a race — the goal's own split at this many days, with any day the athlete NAMED
 * taking its named shape ("legs Wednesday", "upper Monday"), exactly as a run-and-lift week does it.
 */
function raceLiftWeek(c: CoachConstraints, liftGoal: Goal, liftDays: number): DaySkeleton[] {
  if (liftDays <= 0) return [];
  const base = weekForAnyDays(liftGoal, liftDays, c.splitStyle ?? null) ?? [];
  const named = (c.days ?? []).filter((d) => d.kind === 'lift');
  return base.map((day, i) => {
    const want = dayForFocus(named[i]?.focus);
    if (!want) return day;
    // A named day still inherits the goal's finisher, so a conditioning lift day stays conditioning.
    return day.cardioFinisher ? { ...want, cardioFinisher: day.cardioFinisher } : want;
  });
}

/** The lift-day index of a day in the athlete's own week, or null when that day is not a lift day. */
function liftIndexIn(slots: readonly RaceSlot[], day: number): number | null {
  if (slots[day] !== 'lift') return null;
  return slots.slice(0, day).filter((s) => s === 'lift').length;
}

/**
 * Lower-body static stretches from the real catalogue, for a runner's cool-down.
 *
 * Sorted so the same athlete gets the same plan twice — the determinism the matrix test asserts for every
 * other goal — and pulled from the pool rather than named in the rulebook, because a cool-down naming an
 * exercise nobody can open is worse than no cool-down.
 */
const stretchKeysIn = (pool: readonly CatalogExercise[]): string[] =>
  pool
    .filter((e) => e.modality === 'Mobility' && /stretch/i.test(e.name))
    .map((e) => e.key)
    .sort()
    .slice(0, 6);

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// HYBRID WEEKS — CA §4.1
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** One entry of the athlete's week, carrying where it came from and, for a lift, which lift day it is. */
interface WeekEntry {
  intent: DayIntent;
  /** Index in `c.days`. */
  at: number;
  /** Lift-day index into the plan, for `lift` entries. */
  lift: number | null;
  /** Comparable length of a run (miles, or minutes ÷ `COMPARE_MIN_PER_MI`). 0 for everything else. */
  length: number;
}

/**
 * A run-and-lift week.
 *
 * Lift days are the strength rulebook's, exactly — the same `planLifts` and `buildDay` as a strength
 * block, so the goal, the focus, the pins, the limitations and the room all apply without a second copy
 * of any of it. Run days are `endurance.ts`'s own easy and long days (`buildRunDay`), sized from the
 * athlete's words or their weekly miles. What is new is only the ORDER: `arrangeWeek` keeps a heavy leg
 * day off the day before the long run when Holt is free to choose, and names it when he is not.
 */
function assembleHybrid(c: CoachConstraints, pool: readonly CatalogExercise[], canDo: EquipmentGate): AssembleResult {
  const week = c.days ?? [];
  if (!week.some((d) => d.kind !== 'rest')) {
    return {
      ok: false,
      refusal: {
        reason: 'empty_week',
        message: "That week is all rest — give me at least one day to train and I'll build around it.",
      },
    };
  }

  const concerns: string[] = [];
  /* A date with only one running day on the week is the one case that reaches here WITH a race: the
     sentence says what is missing rather than asking again for something they already gave. */
  if (isEnduranceGoal(c.goal)) {
    concerns.push(c.raceDate ? CONCERN.raceNeedsTwoRuns() : CONCERN.hybridNotRace());
  }
  const liftGoal = liftGoalFor(c.goal);

  // ── Lift days: the goal's own week at this many lift days, with any day the athlete named taking its
  //    named shape. A named day inherits the goal's finisher, so a conditioning week stays conditioning. ──
  let liftCount = 0;
  const entries: WeekEntry[] = week.map((intent, at) => ({
    intent,
    at,
    lift: intent.kind === 'lift' ? liftCount++ : null,
    length: 0,
  }));
  const goalWeek = liftCount > 0 ? (weekForAnyDays(liftGoal, liftCount, c.splitStyle ?? null) ?? []) : [];
  const requested: DaySkeleton[] = entries
    .filter((e) => e.lift != null)
    .map((e, k) => {
      const base = goalWeek[k] ?? goalWeek[0];
      const named = dayForFocus(e.intent.focus);
      if (!named) return base;
      return base?.cardioFinisher ? { ...named, cardioFinisher: base.cardioFinisher } : named;
    })
    .filter((d): d is DaySkeleton => d != null);

  const plan = planLifts(
    c,
    liftGoal,
    requested,
    pool,
    canDo,
    (day) => (isCount(day) ? (entries[day]?.lift ?? null) : null),
    concerns,
  );

  // ── Runs: sized, then the longest one found (the day the interference rule protects) ──
  const runsBanned = forbidsRunning(c.limitations);
  const runsOverridden = runsBanned && c.buildAnyway === true;
  const sizes = sizeRuns(entries, c);
  for (const e of entries) e.length = sizes.get(e.at)?.compare ?? 0;
  const runLengths = entries.filter((e) => e.intent.kind === 'run').map((e) => e.length);
  const longest = Math.max(0, ...runLengths);
  // A key run exists only when ONE run is the longest — seven equal miles have no long run to protect.
  const keyAt = runLengths.filter((l) => l === longest).length === 1 ? entries.find((e) => e.intent.kind === 'run' && e.length === longest)?.at ?? null : null;

  const heavy = (e: WeekEntry): boolean => e.lift != null && !!plan.variants[e.lift] && isLowerHeavy(plan.variants[e.lift]);
  const order = c.daysAsGiven ? entries : arrangeWeek(entries, keyAt, heavy);

  // ── Interference, said once: the athlete's order is kept; Holt's own is only ever unavoidable ──
  if (keyAt != null && !(runsBanned && !runsOverridden)) {
    const k = order.findIndex((e) => e.at === keyAt);
    const before = order[(k - 1 + order.length) % order.length];
    if (order.length > 1 && heavy(before)) {
      concerns.push(
        c.daysAsGiven
          ? CONCERN.heavyLegsBeforeLongRun(plan.variants[before.lift!].name)
          : CONCERN.heavyLegsUnavoidable(),
      );
    }
  }
  if (c.daysPerWeek >= 7) concerns.push(CONCERN.noRestDay());
  if (c.daysPerWeek === 1) concerns.push(CONCERN.oneDay());

  /* A target time sets paces here too (`pacesFor`) — an athlete chasing one does not stop chasing it
     because this week is a run-and-lift week rather than a race build. A recent result still wins. */
  const { paces } = pacesFor({
    goal: c.goal,
    recentRaceMi: c.recentRaceMi,
    recentRaceSec: c.recentRaceSec,
    goalTimeSec: c.goalTimeSec,
  });
  const stretchKeys = stretchKeysIn(pool);
  const bannedActivities = plan.bannedActivities;
  // A holder, not a `let` — it is written inside the day builder's closure below.
  const swap: { to: string | null } = { to: null };

  /* A week with no lift day is a running week and is authored against the running band. Its deload
     week keeps the marker (PAS-D8 reads it on every day) and cuts the runs Holt sized
     (`DELOAD_RUN_MULTIPLIER`); the validator's "lighter by sets" check has no sets to measure there. */
  if (liftCount === 0) plan.category = 'RUNNING';

  const notes: AssemblyNote[] = [];
  const sessions = order.filter((e) => e.intent.kind !== 'rest');
  const weekPlans = Array.from({ length: plan.weeks }, (_, weekIndex) => {
    const isDeload = plan.deloads.includes(weekIndex);
    return {
      days: sessions.map((e, i): ProgramDay => {
        const letter = String.fromCharCode(65 + i);
        if (e.intent.kind === 'lift') return liftDay(plan, e.lift!, letter, weekIndex, pool, c, notes);
        const size = sizes.get(e.at);
        if (e.intent.kind === 'run' && !(runsBanned && !runsOverridden)) {
          return marked(runDay(size, e.at === keyAt, c, paces, stretchKeys, letter, isDeload), isDeload);
        }
        // A cardio day, or a run the athlete's limitation turned into one.
        const preferred = e.intent.kind === 'cardio' ? e.intent.focus : null;
        const minutes = size?.min ?? (size?.mi != null ? size.mi * COMPARE_MIN_PER_MI : DEFAULT_CARDIO_MIN);
        const day = cardioDay(plan.owned, bannedActivities, preferred, minutes, letter);
        if (e.intent.kind === 'run') swap.to = day.activity;
        return marked(day.day, isDeload);
      }),
    };
  });

  if (runsOverridden && entries.some((e) => e.intent.kind === 'run')) concerns.push(CONCERN.runsKept());
  if (swap.to) concerns.push(CONCERN.runsSwapped(ACTIVITY_PLURAL[swap.to] ?? 'other cardio'));

  const liftDays = weekPlans.flatMap((w) => w.days.filter((_, i) => sessions[i].intent.kind === 'lift'));
  const thin = thinRefusal(liftDays, c, plan.owned);
  if (thin) return { ok: false, refusal: thin };

  const week1Lifts = weekPlans[0].days
    .map((day, i) => ({ day, lift: sessions[i].lift }))
    .filter((d): d is { day: ProgramDay; lift: number } => d.lift != null);
  concerns.push(...pinCeilingConcerns(plan, week1Lifts));

  const hasRuns = entries.some((e) => e.intent.kind === 'run' || e.intent.kind === 'cardio');
  const structure: ProgramStructure = {
    name: liftCount > 0 && hasRuns ? `${plan.weeks}-Week Run & Lift Block` : liftCount > 0 ? nameFor(liftGoal, plan.weeks) : `${plan.weeks}-Week Running Block`,
    weeks: plan.weeks,
    daysPerWeek: sessions.length,
    vary: true,
    days: weekPlans[0].days,
    weekPlans,
  };

  return {
    ok: true,
    assembly: {
      structure,
      notes,
      category: plan.category,
      deloadWeeks: plan.deloads,
      restructured: plan.restructured,
      unresolved: plan.unresolved,
      held: plan.held,
      chosen: plan.chosen,
      concerns: [...new Set(concerns)],
    },
  };
}

/** A non-lift day in a deload week carries the marker too — PAS-D8 reads it on every day of the week. */
const marked = (day: ProgramDay, isDeload: boolean): ProgramDay =>
  isDeload ? { ...day, name: nameForWeek(day.name, true) } : day;

/** A run's size: what to write on it, whether the athlete said it, and a length to compare runs by. */
interface RunSize {
  mi: number | null;
  min: number | null;
  athlete: boolean;
  compare: number;
}

/**
 * Size every run in the week.
 *
 *   1. the athlete's own miles or minutes, verbatim;
 *   2. else a share of their weekly miles (`currentWeeklyMi` less anything they sized themselves), the
 *      longest share to the LAST unsized run (`LONG_SHARE_BY_RUNS`) so the week has a long run;
 *   3. else the rulebook's default minutes for their running experience.
 *
 * Cardio entries are sized too (minutes only) so the caller has one map to read.
 */
function sizeRuns(entries: readonly WeekEntry[], c: CoachConstraints): Map<number, RunSize> {
  const out = new Map<number, RunSize>();
  const unsized: number[] = [];
  let given = 0;
  for (const e of entries) {
    const { kind, runMi, runMin } = e.intent;
    if (kind !== 'run' && kind !== 'cardio') continue;
    if (isCount(runMi) && runMi > 0 && kind === 'run') {
      out.set(e.at, { mi: runMi, min: null, athlete: true, compare: runMi });
      given += runMi;
    } else if (isCount(runMin) && runMin > 0) {
      out.set(e.at, { mi: null, min: runMin, athlete: true, compare: runMin / COMPARE_MIN_PER_MI });
      if (kind === 'run') given += runMin / COMPARE_MIN_PER_MI;
    } else if (kind === 'run') {
      unsized.push(e.at);
    }
  }
  if (unsized.length === 0) return out;

  const weekly = isCount(c.currentWeeklyMi) && c.currentWeeklyMi > 0 ? c.currentWeeklyMi - given : 0;
  if (weekly >= unsized.length) {
    const longShare = LONG_SHARE_BY_RUNS[unsized.length] ?? LONG_SHARE_BY_RUNS[7];
    const longMi = unsized.length === 1 ? weekly : weekly * longShare;
    const easyMi = unsized.length === 1 ? 0 : (weekly - longMi) / (unsized.length - 1);
    unsized.forEach((at, i) => {
      const mi = Math.round((i === unsized.length - 1 ? longMi : easyMi) * 10) / 10;
      out.set(at, { mi, min: null, athlete: false, compare: mi });
    });
  } else {
    const min = DEFAULT_RUN_MIN[c.experience.running];
    for (const at of unsized) out.set(at, { mi: null, min, athlete: false, compare: min / COMPARE_MIN_PER_MI });
  }
  return out;
}

/**
 * A run day in `endurance.ts`'s own shape — `buildRunDay`'s easy or long day, then its one row set to the
 * size decided above. A run the athlete sized loses the warm-up jog (`ATHLETE_SIZED_RUN_HAS_WARMUP`); a
 * runner who cannot yet run continuously gets the rulebook's run/walk, unless they sized it themselves.
 */
function runDay(
  size: RunSize | undefined,
  isKey: boolean,
  c: CoachConstraints,
  paces: TrainingPaces | null,
  stretchKeys: readonly string[],
  letter: string,
  isDeload: boolean,
): ProgramDay {
  const athlete = size?.athlete ?? false;
  const role = c.canRunContinuously === false && !athlete ? 'run_walk' : isKey ? 'long' : 'easy';
  /* PAS-D8 generalised to mileage, as `assembleEnduranceGoal` does: a deload week keeps the frequency and
     cuts the distance. Only a run HOLT sized — the athlete's mile stays a mile. */
  const cut = isDeload && !athlete ? DELOAD_RUN_MULTIPLIER : 1;
  const mi = size?.mi != null ? Math.round(size.mi * cut * 10) / 10 : null;
  const min = size?.min != null ? size.min * cut : null;
  const day = buildRunDay(
    { role, weeklyMi: mi ?? 1, longRunMi: isKey ? (mi ?? 1) : 0, paces, stretchKeys, hardCount: 6, progress: 0 },
    letter,
  );
  if (role === 'run_walk') return day;
  const [first, ...rest] = day.main;
  const row: ProgramExercise = { ...first };
  if (mi != null) {
    row.targetMi = mi;
    delete row.targetSec;
  } else if (min != null) {
    row.targetSec = Math.round(min * 60);
    delete row.targetMi;
  }
  return {
    ...day,
    warmup: athlete && !ATHLETE_SIZED_RUN_HAS_WARMUP ? [] : day.warmup,
    main: [row, ...rest],
  };
}

/** A timed bout on the athlete's preferred activity when they can do it, else the first they can. */
function cardioDay(
  owned: readonly string[],
  banned: ReadonlySet<string>,
  preferred: string | null | undefined,
  minutes: number,
  letter: string,
): { day: ProgramDay; activity: string } {
  const want = (preferred ?? '').toLowerCase().replace(/[^a-z]/g, '');
  const usable = (o: CardioOption) => !banned.has(o.activity) && (o.needs == null || owned.includes(o.needs));
  const opt =
    CARDIO_OPTIONS.find((o) => want !== '' && o.activity === want && usable(o)) ??
    chooseCardio(owned, banned) ??
    CARDIO_OPTIONS[CARDIO_OPTIONS.length - 1];
  const row = prescribeCardio({
    activity: opt.activity,
    modality: opt.modality,
    targetSec: Math.round(minutes * 60),
    rateKind: opt.rateKind,
    tracksDistance: opt.tracksDistance,
  }) as ProgramExercise;
  return { day: { letter, name: row.name || 'Cardio', warmup: [], main: [row], cooldown: [] }, activity: opt.activity };
}

/**
 * The order Holt chooses when the athlete did not fix one.
 *
 * Every ordering is scored against `INTERFERENCE_COST` — a heavy leg day before the long run, heavy leg
 * days back to back, sessions of one kind back to back — cyclically, because the week repeats and Sunday
 * is the day before Monday. Rest entries take part: a rest day is the cheapest thing to put between a
 * leg day and a long run. Seven entries is 5,040 orderings, which is nothing, so this is exhaustive
 * rather than clever. Ties keep the athlete's own listing order — the permutations are walked in
 * lexicographic order of their original positions and only a strictly better score replaces the best.
 */
function arrangeWeek(
  entries: readonly WeekEntry[],
  keyAt: number | null,
  heavy: (e: WeekEntry) => boolean,
): WeekEntry[] {
  const n = entries.length;
  if (n < 2) return [...entries];
  const cost = (seq: readonly WeekEntry[]): number => {
    let total = 0;
    for (let i = 0; i < n; i++) {
      const a = seq[i];
      const b = seq[(i + 1) % n];
      if (keyAt != null && b.at === keyAt && heavy(a)) total += INTERFERENCE_COST.heavyLegsBeforeLongRun;
      if (heavy(a) && heavy(b)) total += INTERFERENCE_COST.heavyLegsBackToBack;
      if (a.intent.kind !== 'rest' && a.intent.kind === b.intent.kind) total += INTERFERENCE_COST.sameKindBackToBack;
    }
    return total;
  };

  let best = [...entries];
  let bestCost = cost(best);
  const idx = entries.map((_, i) => i);
  // Heap-free lexicographic permutation walk (next_permutation).
  for (;;) {
    let i = n - 2;
    while (i >= 0 && idx[i] >= idx[i + 1]) i--;
    if (i < 0) break;
    let j = n - 1;
    while (idx[j] <= idx[i]) j--;
    [idx[i], idx[j]] = [idx[j], idx[i]];
    for (let l = i + 1, r = n - 1; l < r; l++, r--) [idx[l], idx[r]] = [idx[r], idx[l]];
    const seq = idx.map((k) => entries[k]);
    const s = cost(seq);
    if (s < bestCost) {
      best = seq;
      bestCost = s;
      if (s === 0) break;
    }
  }
  return best;
}

/**
 * Adapt the endurance rulebook to the assembler's result shape.
 *
 * Two things happen here that the rulebook cannot do for itself: the static stretches for the cool-down
 * are pulled from the real catalogue (so the keys are guaranteed to resolve — a cool-down naming an
 * exercise nobody can open is worse than no cool-down), and "today" is passed in from the clock rather
 * than read inside a pure module, so the whole thing stays testable against a fixed date.
 */
function assembleEnduranceGoal(c: CoachConstraints, pool: readonly CatalogExercise[]): AssembleResult {
  const stretchKeys = stretchKeysIn(pool);

  const result = assembleEndurance(c, {
    todayISO: new Date().toISOString().slice(0, 10),
    stretchKeys,
    canRunContinuously: c.canRunContinuously ?? undefined,
    recentRaceMi: c.recentRaceMi,
    recentRaceSec: c.recentRaceSec,
  });

  if (result.refusal) {
    return {
      ok: false,
      // The rulebook's refusals are about time and base rather than equipment, but they arrive through
      // the same channel so the wizard needs no second code path to show one.
      refusal: { reason: 'limitation_conflicts_with_goal', message: result.refusal.message },
    };
  }

  return {
    ok: true,
    assembly: {
      structure: result.structure,
      notes: [],
      category: GOAL_CATEGORY[c.goal as keyof typeof GOAL_CATEGORY] as PasCategory,
      // Endurance recovery is the step-down week inside the volume curve, not a separate deload table —
      // PAS-D8 generalised to mileage: keep the frequency, cut the distance.
      deloadWeeks: result.volume.filter((v) => v.isDeload).map((v) => v.weekIndex),
      ...(result.concern ? { concern: result.concern } : {}),
      /* The target time's one sentence rides the same channel every other "said once" line does, so the
         chat needs no second field to read (`concerns`, CA-D12). */
      ...(result.goalTime?.concern ? { concerns: [result.goalTime.concern] } : {}),
    },
  };
}

/**
 * What to call it.
 *
 * Plain and descriptive, not evocative. Forge's own catalogue programs have authored names with a
 * controlled vocabulary behind them (PAS-D1) and the coach is not entitled to that voice — a generated
 * block called "Iron & Engine" would be borrowing the catalogue's authority. The athlete renames it in
 * the Builder if they want to, and most will.
 */
function nameFor(goal: Goal, weeks: number): string {
  const noun: Record<string, string> = {
    strength: 'Strength',
    muscle: 'Muscle',
    weight_loss: 'Conditioning',
    conditioning: 'Conditioning',
    mobility: 'Mobility',
  };
  return `${weeks}-Week ${noun[goal] ?? 'Training'} Block`;
}
