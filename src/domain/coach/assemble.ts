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
  isEnduranceGoal,
  normalise,
  type CoachConstraints,
  type Goal,
} from './constraints.ts';
import {
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
import { equipmentAfterLimitations, forbidsRunning, limitationPatterns } from './rulebook/limitations.ts';
import {
  defaultWeeksFor,
  firstUnviableDay,
  fullBodyFallback,
  isAuthored,
  skeletonFor,
  weekIsViable,
  type DaySkeleton,
} from './rulebook/skeletons.ts';
import { bandFor, deloadWeeks, GOAL_CATEGORY, type PasCategory } from './rulebook/volume.ts';
import { assembleEndurance } from './rulebook/endurance.ts';
import { cueFor } from './rulebook/cues.ts';

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// RESULT
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Why the coach will not build this, in words an athlete can act on. */
export interface CoachRefusal {
  reason: 'goal_not_authored' | 'limitation_conflicts_with_goal' | 'not_enough_equipment';
  message: string;
}

/** What had to give, so the wizard can say it before the athlete finds out for themselves. */
export interface AssemblyNote {
  kind: 'relaxed' | 'dropped';
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
  if (isEnduranceGoal(c.goal) && forbidsRunning(c.limitations)) {
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
    isDeload: boolean;
    budget: number;
    owned: readonly string[];
    bannedActivities: ReadonlySet<string>;
  },
  notes: AssemblyNote[],
): ProgramDay {
  const main: ProgramExercise[] = [];
  const used = new Set<string>(baseCtx.used);
  const cardioSlots = skeleton.cardioFinisher ? 1 : 0;

  for (const pattern of skeleton.slots) {
    if (main.length >= opts.budget - cardioSlots) break;

    const found = fillSlot(pattern, pool, { ...baseCtx, used });
    if (!found) {
      // Only worth telling the athlete about once, and only on the first week — the same gap repeats
      // every week and a list of forty identical notes is noise, not information.
      if (opts.weekIndex === 0) notes.push({ kind: 'dropped', day: skeleton.name, wanted: pattern });
      continue;
    }
    if (found.relaxed && opts.weekIndex === 0) {
      notes.push({ kind: 'relaxed', day: skeleton.name, wanted: pattern, got: found.pattern });
    }

    used.add(found.exercise.key);
    const role = roleFor(main.length, isCompound(found.pattern));
    const pctx = {
      category: opts.category,
      experience: opts.experience.lifting,
      weekIndex: opts.weekIndex,
      isDeload: opts.isDeload,
    };

    /* HOW to do it, not just how much — the line the athlete reads under THE PLAN SAYS. Keyed on the
       movement pattern and the goal, so it is a rulebook decision like every other number here rather
       than 733 hand-written strings. `null` for an advanced lifter on an accessory, deliberately. */
    const cue = cueFor({
      pattern: found.exercise.pattern,
      goal: opts.goal,
      experience: opts.experience.lifting,
      isPrimary: main.length === 0,
    });

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
      main.push({
        catalogKey: found.exercise.key,
        name: found.exercise.name,
        sets: rx.sets,
        reps: rx.reps,
        repsMax: rx.repsMax,
        ...(cue ? { coachNote: cue } : {}),
      });
    }
  }

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

  const refusal = refusalFor(c);
  if (refusal) return { ok: false, refusal };

  /*
   * ══ THE ONE FAMILY BRANCH ══
   *
   * A race plan is built BACKWARDS FROM A DATE and measured in weekly miles; everything below this line
   * fills a fixed weekly split with exercises. They are two different products, not two settings of one,
   * and pretending otherwise would mean a skeleton table with a "long run" slot that no movement pattern
   * can fill. All five endurance goals still run through a single machine of their own — the per-GOAL
   * differences live in `RACE_SPEC`, which is the promise this engine was built on.
   */
  if (isEnduranceGoal(c.goal)) return assembleEnduranceGoal(c, pool);

  const requested = skeletonFor(c.goal, c.daysPerWeek, c.splitStyle ?? null);
  if (!requested) {
    return {
      ok: false,
      refusal: { reason: 'goal_not_authored', message: "I don't have a plan for that goal yet." },
    };
  }

  const weeks = c.weeks ?? defaultWeeksFor(c.goal);
  const category = GOAL_CATEGORY[c.goal as keyof typeof GOAL_CATEGORY] as PasCategory;
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
    excludeExercises: c.excludeExercises,
    /* What this athlete keeps swapping TO. ⚠ It re-ranks within a pattern and can never remove one, so
       a program built with it is the same shape as one built without — just filled with the movements
       they actually do. Absent for anybody who has never swapped, which is most people. */
    learned: c.learned,
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
       the goal requires on top of the chosen shape, which is exactly the point of it existing. */
    const fallback = skeletonFor(c.goal, c.daysPerWeek, 'full_body') ?? fullBodyFallback(c.daysPerWeek);
    if (fallback && weekIsViable(fallback, trainable)) {
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

  const notes: AssemblyNote[] = [];
  const weekPlans = Array.from({ length: weeks }, (_, weekIndex) => {
    const isDeload = deloads.includes(weekIndex);
    const band = bandFor(category, isDeload);
    const budget = Math.min(exerciseBudget(c.sessionMinutes), band.maxExercises);

    return {
      days: variants.map((d, i) =>
        buildDay(d, String.fromCharCode(65 + i), pool, baseCtx, {
          category,
          goal: c.goal,
          experience: c.experience,
          weekIndex,
          isDeload,
          budget,
          owned,
          bannedActivities,
        }, notes),
      ),
    };
  });

  // An empty room can leave a day with nothing in it. `trainingDays` filters those out, so the program
  // would silently be shorter than the athlete was told — refuse instead and say what is missing.
  const emptyDays = weekPlans[0]?.days.filter((d) => d.main.length === 0) ?? [];
  if (emptyDays.length > 0) {
    return {
      ok: false,
      refusal: {
        reason: 'not_enough_equipment',
        message:
          "There isn't enough here for me to build a full week — I couldn't fill a single day. Tell me what you have access to, or pick bodyweight-only and I'll work with that.",
      },
    };
  }

  const structure: ProgramStructure = {
    name: nameFor(c.goal, weeks),
    weeks,
    daysPerWeek: c.daysPerWeek,
    vary: true,
    days: weekPlans[0].days,
    weekPlans,
  };

  return { ok: true, assembly: { structure, notes, category, deloadWeeks: deloads, restructured } };
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
  // Lower-body static stretches, which is what a runner's cool-down wants. Sorted so the same athlete
  // gets the same plan twice — the determinism the matrix test asserts for every other goal.
  const stretchKeys = pool
    .filter((e) => e.modality === 'Mobility' && /stretch/i.test(e.name))
    .map((e) => e.key)
    .sort()
    .slice(0, 6);

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
