/**
 * One workout, for today.
 *
 * ══ A DIFFERENT QUESTION FROM A PROGRAM, ASKED A DIFFERENT WAY ══
 *
 * A program starts from a goal and works down to today. A single workout starts from today: *"what are
 * you training?"* — and the answer is usually a split ("push day") or a body part ("chest and triceps"),
 * never "hypertrophy over eight weeks". So the intake is one question, not four, and the fill strategy
 * changes with the answer.
 *
 * ══ TWO FILL STRATEGIES, BECAUSE THE TWO ANSWERS ARE NOT THE SAME SHAPE ══
 *
 *  · **A split** is already a pattern list — `PUSH`, `PULL`, `LEGS` — so it reuses the program engine's
 *    skeletons unchanged. A push day is a push day whether it sits in a block or stands alone.
 *
 *  · **Body parts** are not. "Chest and triceps" names muscles, and the movements that train them span
 *    patterns unevenly — nearly every chest exercise is a Horizontal Push, while triceps work is spread
 *    across three patterns. Filling that from a pattern skeleton would either miss the muscle or prescribe
 *    five bench variants. So it selects by muscle and then *spreads* across patterns (see `roundRobin`),
 *    which is what stops a chest day being the same press four times.
 *
 * The output is a `ProgramDay` — the shape the Program Builder, the workout templates and `template-day-core`
 * all already speak. Nothing new to teach the app.
 */

import type { ProgramDay, ProgramExercise } from '@/data/programs-live';

import {
  equipmentForEnvironment,
  type Environment,
  type Experience,
  type Goal,
  type Limitation,
  type SessionMinutes,
} from './constraints.ts';
import {
  contextFrom,
  isCompound,
  type CatalogExercise,
  type EquipmentGate,
} from './candidates.ts';
import { exerciseBudget, prescribeReps, roleFor } from './prescribe.ts';
import { cueFor } from './rulebook/cues.ts';
import { GOAL_CATEGORY } from './rulebook/volume.ts';
import { equipmentAfterLimitations, limitationPatterns } from './rulebook/limitations.ts';
import { skeletonFor } from './rulebook/skeletons.ts';
import { preferenceRank } from './rulebook/preferences.ts';
import type { LearnedPreferences } from './learned-preference.ts';
import { bandFor, type PasCategory } from './rulebook/volume.ts';
import { fillSlot } from './candidates.ts';

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// WHAT ARE YOU TRAINING?
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export type SplitName = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full_body';

export const SPLITS: readonly SplitName[] = ['push', 'pull', 'legs', 'upper', 'lower', 'full_body'];

/** The catalogue's own name for conditioning work. One place, so a rename cannot silently empty a day. */
export const CARDIO_PATTERN = 'Cardio / Locomotion';

export const SPLIT_LABEL: Record<SplitName, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  upper: 'Upper body',
  lower: 'Lower body',
  full_body: 'Full body',
};

/**
 * The body parts an athlete actually names, mapped onto the dataset's 29 muscle ids.
 *
 * Nobody walks into a gym thinking "today I train my transverse abdominis". They say chest, back, arms.
 * These groupings are the translation, and they are deliberately generous — "back" includes traps because
 * someone saying "back day" means shrugs are fair game, and excluding them would feel like the app
 * disagreeing with them about their own body.
 */
export type BodyPart =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'glutes'
  | 'core';

export const BODY_PARTS: readonly BodyPart[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'legs',
  'glutes',
  'core',
];

/**
 * ⚠ BICEPS AND TRICEPS ARE SEPARATE, not one "Arms" chip.
 *
 * Nobody trains "arms" — they train back and biceps, or chest and triceps. Collapsing the two meant an
 * athlete who wanted a chest-and-triceps day either got curls they did not ask for or had to leave arms
 * off entirely. Forearms ride with biceps because that is what a curl actually loads.
 */
export const BODY_PART_MUSCLES: Record<BodyPart, readonly string[]> = {
  chest: ['chest'],
  back: ['lats', 'upper_back', 'traps'],
  shoulders: ['front_deltoids', 'lateral_deltoids', 'rear_deltoids', 'rotator_cuff'],
  biceps: ['biceps', 'forearms'],
  triceps: ['triceps'],
  legs: ['quadriceps', 'hamstrings', 'calves', 'adductors', 'abductors'],
  glutes: ['glutes'],
  core: ['rectus_abdominis', 'obliques', 'transverse_abdominis', 'erector_spinae'],
};

export const BODY_PART_LABEL: Record<BodyPart, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  legs: 'Legs',
  glutes: 'Glutes',
  core: 'Core',
};

/** What today's workout is for. */
export type DayFocus =
  | { kind: 'split'; split: SplitName }
  | {
      kind: 'body_parts';
      parts: readonly BodyPart[];
      /**
       * ⚠ **A FLAG RATHER THAN A NINTH `BodyPart`, AND THAT IS THE WHOLE REASON IT IS SHAPED THIS WAY.**
       *
       * Conditioning is not a muscle. The body-part path selects on `primaryMuscleIds`, and the 20
       * `Cardio / Locomotion` movements — jump rope, ski erg, sled drag, bear crawl — do not name a
       * primary mover in any sense a filter could use. Adding `'cardio'` to `BodyPart` would put a
       * non-muscle into `BODY_PART_MUSCLES`, into the exercise library's own filters, and into every
       * switch that believes that union is anatomy.
       *
       * Optional, so every existing focus keeps its meaning untouched. `parts: []` with `cardio: true`
       * is a legitimate request: a conditioning-only session.
       */
      cardio?: boolean;
    };

export interface DayRequest {
  focus: DayFocus;
  sessionMinutes: SessionMinutes;
  experience: Experience;
  environment: Environment;
  ownedEquipment: readonly string[];
  limitations: readonly Limitation[];
  excludeExercises?: readonly string[];
  /**
   * ⚠ **A ONE-OFF WORKOUT DOES HAVE A GOAL, AND ASSUMING ONE WAS THE BUG.**
   *
   * This used to default to HYPERTROPHY with a comment claiming a single session has no stated goal. It
   * does — the athlete simply was never asked. And the difference is not cosmetic: the same back-and-
   * biceps session is 5 × 5 heavy under STRENGTH and 3 × 12 under HYPERTROPHY. Prescribing one when they
   * wanted the other is not a near-miss, it is a different workout.
   *
   * HYPERTROPHY remains the fallback for callers that genuinely have no goal to hand (a template, a
   * quick-start), because a moderate range is the least wrong guess. It is now a fallback rather than an
   * assumption dressed as a decision.
   */
  goal?: Goal;
  /** Overrides the category derived from `goal`. Rarely needed; `goal` is the honest input. */
  category?: PasCategory;
  /** What this athlete keeps choosing — resolved by the caller. See `learned-preference.ts`. */
  learned?: LearnedPreferences;
}

export interface DayResult {
  day: ProgramDay;
  /** Patterns or body parts nothing could be found for, so the wizard can say it rather than hide it. */
  missing: string[];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// SPREADING ACROSS PATTERNS
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Take the best from each pattern in turn, then go round again.
 *
 * ⚠ THIS IS WHAT STOPS A CHEST DAY BEING FOUR BENCH PRESSES. Ranked purely by quality, the top five
 * chest exercises are all Horizontal Push — bench, incline bench, dumbbell bench, close-grip bench, fly —
 * because that is genuinely what trains a chest. Taking the top five gives a day that is one movement
 * repeated with a different angle, which is not a workout, it is a warm-up for an argument.
 *
 * Round-robin gives breadth first and depth second: the best press, then the best triceps movement, then
 * the second-best press. When a pattern runs out the rotation simply skips it, so a focus that really
 * does live in one pattern still fills its day rather than coming up short.
 */
function roundRobin(queues: CatalogExercise[][], budget: number, out: CatalogExercise[]): void {
  let progress = true;
  while (out.length < budget && progress) {
    progress = false;
    for (const q of queues) {
      if (out.length >= budget) break;
      const next = q.shift();
      if (next) {
        out.push(next);
        progress = true;
      }
    }
  }
}

/**
 * Breadth across the patterns that matter, then depth into them — and only then the marginal ones.
 *
 * ⚠ A SECOND PASS MUST GO DEEPER, NOT WIDER. Rotating through every matching pattern until the day is
 * full sounds fair and produces nonsense: "back day" came out as row, pull-up, shrug, then *Barbell Front
 * Rack Carry*, *Barbell Clean* and *Medicine Ball Squat to Throw*, because those patterns technically list
 * `upper_back` as a primary mover and the rotation had run out of good ones to visit.
 *
 * The rule that fixes it: a pattern only joins the rotation if it holds a movement the rulebook names for
 * it — a canonical answer, not merely a matching muscle. Those patterns are cycled until the day is full,
 * going deeper (bench, then incline, then dumbbell press) rather than reaching sideways. Everything else
 * is a last resort, used only when the preferred patterns cannot fill the day at all, which is what keeps
 * a bodyweight athlete's options open without letting a clean into someone's back day.
 */
function selectForFocus(
  byPattern: Map<string, CatalogExercise[]>,
  budget: number,
): CatalogExercise[] {
  const preferred: CatalogExercise[][] = [];
  const marginal: CatalogExercise[][] = [];
  for (const [pattern, list] of byPattern) {
    if (list.length === 0) continue;
    const leadIsCanonical = Number.isFinite(preferenceRank(pattern, list[0].key));
    (leadIsCanonical ? preferred : marginal).push(list);
  }

  const out: CatalogExercise[] = [];
  roundRobin(preferred, budget, out);
  if (out.length < budget) roundRobin(marginal, budget, out);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// BUILDING
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Build today's workout.
 *
 * Compounds are ordered first regardless of how the exercises were chosen — the one ordering rule that
 * holds for every session in the app, and the reason `roleFor` can decide a prescription from position
 * alone.
 */
/**
 * ⚠ **FEWER THAN THREE MOVEMENTS IS NOT A SESSION, AND SHIPPING ONE IS WORSE THAN SAYING SO.**
 *
 * Reported by the PO: *"I tried having him build a home body weight workout and it came up with one
 * thing."* Measured across the whole matrix — 11 focuses × 5 goals × 4 lengths × 3 levels × 4
 * limitation sets, in five equipment states — **2,240 of 13,200 combinations return one or two
 * movements**, and a further 1,040 return none. A bodyweight *pull* day came back as a single Plank; a
 * back-and-biceps day came back empty.
 *
 * The number is not a guess. At a FULL GYM exactly 20 of 2,640 combinations fall under three, and every
 * one of them is the same case: a shoulders focus from someone who has said their shoulders are the
 * thing to work around — which Holt should refuse rather than build. It never fires on a session anyone
 * would call complete, and it fires on every session that reads as broken. That is the separation a
 * threshold needs before it is allowed to refuse anything.
 */
export const MIN_DAY_MOVEMENTS = 3;

/**
 * Why a day came out too thin to be a session.
 *
 * ⚠ **ANSWERED BY RE-RUNNING THE BUILDER, NEVER BY GUESSING.** The alternative is inferring the cause
 * from the shape of the request — "they picked bodyweight, so it must be the gear" — which is wrong the
 * moment someone with an empty home gym asks for a shoulder day while their shoulder is the problem.
 * Holt is about to tell the athlete WHY he cannot do something and offer them a fix; he had better be
 * right about which fix.
 *
 * Two extra builds. The builder is synchronous and returns in single-digit milliseconds, and this only
 * runs on the path where there is already nothing to show.
 */
export type ThinReason = 'gear' | 'limits' | 'both' | 'unknown';

export function whyThin(
  req: DayRequest,
  found: number,
  pool: readonly CatalogExercise[],
  canDo: EquipmentGate,
): ThinReason | null {
  if (found >= MIN_DAY_MOVEMENTS) return null;

  const enough = (over: Partial<DayRequest>) =>
    buildDayWorkout({ ...req, ...over }, pool, canDo).day.main.length >= MIN_DAY_MOVEMENTS;

  // Everything the gym has, and nothing the athlete has had to declare.
  const gearFixes = enough({ environment: 'full_gym', ownedEquipment: [] });
  const limitsFix = req.limitations.length > 0 && enough({ limitations: [] });

  if (gearFixes && limitsFix) return 'both';
  if (gearFixes) return 'gear';
  if (limitsFix) return 'limits';
  // Neither lever helps: the focus simply has nothing in the catalogue for this athlete.
  return 'unknown';
}

export function buildDayWorkout(
  req: DayRequest,
  pool: readonly CatalogExercise[],
  canDo: EquipmentGate,
): DayResult {
  const category: PasCategory = req.category ?? (req.goal ? (GOAL_CATEGORY[req.goal] as PasCategory) : ('HYPERTROPHY' as PasCategory));
  const band = bandFor(category, false);
  const budget = Math.min(exerciseBudget(req.sessionMinutes), band.maxExercises);

  // ⚠ THROUGH `equipmentForEnvironment`, exactly as the program assembler does — not `req.ownedEquipment`
  // directly. A full-gym athlete's owned list is usually EMPTY (they own nothing; the gym does), so
  // reading it raw handed the day builder a bare floor: a full-gym chest day came back as four push-up
  // variants and "back day" came back empty, because with no bar there is no back movement to find.
  const owned = equipmentAfterLimitations(
    equipmentForEnvironment(req.environment, req.ownedEquipment),
    req.limitations,
  );

  const ctx = contextFrom({
    owned,
    canDo,
    experience: req.experience,
    limitations: req.limitations,
    limitationPatterns,
    excludeExercises: req.excludeExercises ?? [],
    // Same map the program assembler gets — a single day and a twelve-week block should not disagree
    // about which row of a movement pattern this athlete actually does.
    learned: req.learned,
  });

  const missing: string[] = [];
  const chosen: { ex: CatalogExercise; pattern: string }[] = [];

  if (req.focus.kind === 'split') {
    // A split IS a pattern list, so this is the program engine's own fill path, unchanged.
    const skeleton = skeletonFor(splitGoalFor(req.focus.split), splitDaysFor(req.focus.split));
    const slots = skeleton ? skeletonSlotsFor(req.focus.split, skeleton) : [];
    const used = new Set<string>();
    for (const pattern of slots) {
      if (chosen.length >= budget) break;
      const found = fillSlot(pattern, pool, { ...ctx, used });
      if (!found) {
        missing.push(pattern);
        continue;
      }
      used.add(found.exercise.key);
      chosen.push({ ex: found.exercise, pattern: found.pattern });
    }
  } else {
    const targets = new Set(req.focus.parts.flatMap((p) => BODY_PART_MUSCLES[p]));

    // Primary movers only. An exercise that hits the chest as a SECONDARY is not a chest exercise, and a
    // "chest day" made of movements that merely involve the chest is the commonest way this goes wrong.
    const byPattern = new Map<string, CatalogExercise[]>();
    for (const ex of pool) {
      /* Conditioning joins on its PATTERN, not on a muscle — see the note on `DayFocus.cardio`. It is an
         `||` rather than a separate pass so a session that asks for chest and conditioning gets both
         spread through the same round-robin, instead of the cardio arriving as an afterthought bolted
         on the end. */
      const wanted = ex.primaryMuscleIds.some((m) => targets.has(m)) || (req.focus.cardio === true && ex.pattern === CARDIO_PATTERN);
      if (!wanted) continue;
      if (ctx.excludePatterns.has(ex.pattern) || ctx.excludeKeys.has(ex.key)) continue;
      if (!canDo(ex, owned)) continue;
      if (!difficultyAllows(ex, req.experience)) continue;
      const list = byPattern.get(ex.pattern) ?? [];
      list.push(ex);
      byPattern.set(ex.pattern, list);
    }

    for (const [pattern, list] of byPattern) {
      list.sort(
        (a, b) =>
          (preferenceRank(pattern, a.key) === preferenceRank(pattern, b.key)
            ? 0
            : preferenceRank(pattern, a.key) - preferenceRank(pattern, b.key)) ||
          b.muscleIds.length - a.muscleIds.length ||
          a.key.localeCompare(b.key),
      );
    }

    /*
     * ⚠ THE ROTATION IS ORDERED BY EACH PATTERN'S BEST ANSWER, NOT BY WHETHER IT IS A COMPOUND.
     *
     * Compound-first is right for a SPLIT day, where the pattern list is the coaching. It is wrong here.
     * "Chest and arms" opened with a *Barbell Front Rack Carry* and "back" with a *Barbell Clean* — both
     * are compounds, both genuinely list those muscles as primary movers, and neither is what anybody
     * means. `Carry` simply sorted before `Horizontal Push`.
     *
     * A pattern earns the lead by containing the canonical movement for it: Horizontal Push holds the
     * bench press (preference rank 0), so it goes first; Carry holds nothing preferred, so it goes last
     * and only appears at all if the day still has room. Compound-ness survives as the tiebreak among
     * patterns that are equally un-preferred.
     */
    const bestRank = (pattern: string, list: CatalogExercise[]) =>
      list.length > 0 ? preferenceRank(pattern, list[0].key) : Number.POSITIVE_INFINITY;

    const ordered = new Map(
      [...byPattern.entries()].sort((a, b) => {
        const ra = bestRank(a[0], a[1]);
        const rb = bestRank(b[0], b[1]);
        return (
          (ra === rb ? 0 : ra - rb) ||
          Number(isCompound(b[0])) - Number(isCompound(a[0])) ||
          a[0].localeCompare(b[0])
        );
      }),
    );

    /*
     * ⚠ **CONDITIONING GETS A SLOT RESERVED, OR IT NEVER ARRIVES.**
     *
     * Letting it compete in the rotation on merit was the obvious implementation and it was wrong:
     * `Cardio / Locomotion` holds no preferred movement, so it sorts last, and a back day fills its
     * whole budget from Horizontal Pull, Vertical Pull and Shoulder Isolation before reaching it. The
     * measured result was that "Back & Cardio" produced a session byte-identical to "Back" — under a
     * title that said Cardio. A card naming something the session does not contain is the exact failure
     * this surface exists to avoid.
     *
     * So conditioning is a FINISHER: one piece, taken off the top of the cardio queue, with the muscle
     * work budgeted around it. A whole day of it is different — `parts` is empty, there is nothing to
     * reserve against, and the rotation is already all cardio.
     */
    const wantsFinisher = req.focus.cardio === true && req.focus.parts.length > 0;
    const finisher = wantsFinisher ? (ordered.get(CARDIO_PATTERN) ?? [])[0] : undefined;
    if (wantsFinisher) ordered.delete(CARDIO_PATTERN);

    for (const ex of selectForFocus(ordered, finisher ? budget - 1 : budget)) chosen.push({ ex, pattern: ex.pattern });
    if (finisher) chosen.push({ ex: finisher, pattern: finisher.pattern });

    for (const p of req.focus.parts) {
      const muscles = new Set(BODY_PART_MUSCLES[p]);
      if (!chosen.some((c) => c.ex.primaryMuscleIds.some((m) => muscles.has(m)))) missing.push(p);
    }
    // Asked for and not found — say so, rather than let a title claim it.
    if (req.focus.cardio && !chosen.some((c) => c.pattern === CARDIO_PATTERN)) missing.push('Cardio');
  }

  chosen.sort((a, b) => Number(isCompound(b.pattern)) - Number(isCompound(a.pattern)));

  const main: ProgramExercise[] = chosen.map(({ ex, pattern }, i) => {
    const rx = prescribeReps(roleFor(i, isCompound(pattern)), {
      category,
      experience: req.experience,
      // A one-off workout has no week to be in. Index 0 puts every rep target at the bottom of its range,
      // which is the honest starting point for a session with no history behind it.
      weekIndex: 0,
      isDeload: false,
    });
    /*
     * ⚠ **A SINGLE DAY GOT NO COACHING CUE AT ALL**, while every program session did. Same tempo, same
     * technique, same field already rendered under THE PLAN SAYS — a one-off workout simply never went
     * through the code that attaches it. The cue needs the goal, which is the other thing this session
     * was never asked, so both gaps closed on the same question.
     */
    const cue = req.goal ? cueFor({ pattern, goal: req.goal, experience: req.experience, isPrimary: i === 0 }) : null;
    return {
      catalogKey: ex.key,
      name: ex.name,
      sets: rx.sets,
      reps: rx.reps,
      repsMax: rx.repsMax,
      ...(cue ? { coachNote: cue } : {}),
    };
  });

  /* ⚠ THE TITLE IS NAMED FROM WHAT IS IN THE DAY, NOT FROM WHAT WAS ASKED FOR. If conditioning was
     requested and nothing could be found for it — a bare floor and no rope — the session is "Back", not
     "Back & Cardio". `missing` already carries the fact; the name must not contradict it. */
  const gotCardio = chosen.some((c) => c.pattern === CARDIO_PATTERN);
  const named: DayFocus =
    req.focus.kind === 'body_parts' && req.focus.cardio && !gotCardio ? { ...req.focus, cardio: false } : req.focus;

  return { day: { letter: 'A', name: titleFor(named), warmup: [], main, cooldown: [] }, missing };
}

function difficultyAllows(ex: CatalogExercise, experience: Experience): boolean {
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 } as const;
  const ceiling = { beginner: 0, intermediate: 1, advanced: 2 } as const;
  return order[ex.difficulty] <= ceiling[experience];
}

/** A split maps onto the goal whose skeletons already express it. */
const splitGoalFor = (s: SplitName) => (s === 'push' || s === 'pull' || s === 'legs' ? 'muscle' : 'strength');
const splitDaysFor = (s: SplitName) => (s === 'push' || s === 'pull' || s === 'legs' ? 3 : s === 'full_body' ? 2 : 4);

/** Pull the one day out of the week's skeleton that matches the split the athlete asked for. */
function skeletonSlotsFor(split: SplitName, week: { name: string; slots: readonly string[] }[]): readonly string[] {
  const want: Record<SplitName, string> = {
    push: 'Push',
    pull: 'Pull',
    legs: 'Legs',
    upper: 'Upper',
    lower: 'Lower',
    full_body: 'Full Body A',
  };
  return week.find((d) => d.name === want[split])?.slots ?? week[0]?.slots ?? [];
}

/** ⚠ Exported so a template saved from a Holt day is named the same thing the card called it. */
export function titleFor(focus: DayFocus): string {
  if (focus.kind === 'split') return SPLIT_LABEL[focus.split];
  // Conditioning reads as one more thing being trained, because that is what it is: "Back & Cardio".
  const parts = [...focus.parts.map((p) => BODY_PART_LABEL[p]), ...(focus.cardio ? ['Cardio'] : [])];
  if (parts.length === 0) return 'Workout';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}`;
}
