import type { GoalId, EquipmentId } from './derive';

/**
 * Pure recommendation core — the goal × experience × equipment map ported from the design's
 * `Forge Onboarding.dc.html`, resolved to a REAL catalog id. Deliberately has NO app imports (no catalog,
 * no `@` alias), so it is directly unit-testable (node --test type-strips this .ts).
 *
 * ⚠️ Thin catalog: only Strength Foundation I + II are authored today, so the design's richer ids alias or
 * fall back to one of those two — the *mechanism* is real (goal/experience/equipment all feed it), the
 * *catalog* is small. Adding programs later just extends CATALOG_ALIAS (or the catalog gains the real ids).
 */

export const FALLBACK_ID = 'strength-foundation-i-3day'; // Strength Foundation I — the design's own fallback
export const ADVANCED_ID = 'strength-foundation-ii-4day'; // Strength Foundation II

type Experience = 'beginner' | 'intermediate' | 'advanced';
type Access = 'gym' | 'home' | 'bodyweight';

export interface RecommendInput {
  experience?: string | null;
  primaryGoal?: GoalId | null;
  equipment?: readonly EquipmentId[] | null;
  /**
   * The athlete's Home Gym profile, when they've built one (`src/domain/home-gym/equipment.ts` ids).
   * `null`/absent = never set up, and the coarse `equipment` answer stands on its own.
   */
  homeGym?: readonly string[] | null;
}

function expFor(e: string | null | undefined): Experience {
  return e === 'intermediate' || e === 'advanced' ? e : 'beginner';
}

/**
 * "Home Gym" is one checkbox covering everything from a pair of bands to a fully-kitted garage, and
 * those two athletes should not get the same program. When a real profile exists we read the tier off
 * the gear itself: a bar with a rack or bench runs barbell programming, so it earns the `gym` tier
 * even though the athlete trains alone in a garage.
 *
 * Deliberately only used to REFINE a `homegym` answer — never to downgrade someone who said they have
 * a full commercial gym, whose access their home profile says nothing about.
 */
function accessFromGear(gym: readonly string[]): Access {
  const has = (...ids: string[]) => ids.some((id) => gym.includes(id));
  const bar = has('barbell', 'plates', 'trapbar', 'ezbar', 'smith');
  if (bar && has('rack', 'bench', 'smith')) return 'gym';
  if (bar || has('dumbbells', 'kettlebells', 'cable', 'latpulldown', 'legpress', 'legmachine')) return 'home';
  return 'bodyweight'; // bands, a mat and a pull-up bar is bodyweight programming with resistance
}

/** Access tier from equipment — richest wins (matches derive.environmentForEquipment ordering). */
export function accessFor(
  equipment: readonly EquipmentId[] | null | undefined,
  homeGym?: readonly string[] | null,
): Access {
  const eq = equipment ?? [];
  if (eq.includes('fullgym')) return 'gym';
  if (eq.includes('homegym')) {
    // A profile is a better answer than the checkbox that prompted it — but an EMPTY one is a real
    // "I own nothing", so it legitimately drops them to bodyweight.
    if (homeGym != null) return accessFromGear(homeGym);
    return 'home';
  }
  if (eq.includes('dumbbells')) return 'home';
  return 'bodyweight';
}

/** The design's gym-access map. Its ids are the INTENDED catalog (aliased to real ids in resolveRecommendationId). */
const GYM_MAP: Record<GoalId, Record<Experience, string>> = {
  strength: { beginner: 'strength-foundation-1', intermediate: 'strength-powerbuilding-1', advanced: 'strength-531' },
  muscle: { beginner: 'mb-arms-aesthetics', intermediate: 'mb-hypertrophy-block', advanced: 'mb-ppl' },
  endurance: { beginner: 'run-c25k', intermediate: 'run-10k', advanced: 'run-half-base' },
  fatloss: { beginner: 'cond-hiit', intermediate: 'cond-circuit', advanced: 'cond-metcon' },
  athletic: { beginner: 'cond-hiit', intermediate: 'cond-engine', advanced: 'cond-metcon' },
  health: { beginner: 'fbh-full-body-3', intermediate: 'fbh-full-body-3', advanced: 'mb-upper-lower' },
};

/**
 * The design's intended program id for the inputs (may be an id not yet in our catalog).
 *
 * ══ THE HOME AND BODYWEIGHT TIERS NO LONGER BORROW GYM IDS ══
 *
 * Two ids used to serve two access tiers at once, and that is what made them impossible to alias
 * honestly: `fbh-full-body-3` meant both "home/strength" and "gym/health", and `cond-circuit` meant
 * both "home/fatloss" and "gym/fatloss/intermediate". One alias entry cannot answer a dumbbells-only
 * athlete and a commercial-gym athlete with the same program — whichever real program it points at is
 * wrong for one of them, and the wrong direction here is prescribing a barbell to somebody who owns
 * a pair of dumbbells.
 *
 * So the tiers that cannot run barbell programming now resolve to `fbh-bodyweight-basics`, which is
 * the one id in the design's vocabulary that already means "needs no equipment". It under-serves a
 * dumbbell owner rather than over-prescribing to them — the safe direction of the two — and it leaves
 * every gym id with exactly one meaning, which is what lets the alias table below be read and checked.
 *
 * `fbh-dumbbell-only` (home/muscle) keeps its own id because a real dumbbell program is authored for it.
 */
export function intendedProgramId(input: RecommendInput): string {
  const primary: GoalId = input.primaryGoal ?? 'health';
  const exp = expFor(input.experience);
  const access = accessFor(input.equipment, input.homeGym);
  if (access === 'bodyweight') return 'fbh-bodyweight-basics';
  if (access === 'home') {
    if (primary === 'muscle') return 'fbh-dumbbell-only';
    if (primary === 'health') return 'fbh-home-minimalist';
    /* ⚠ THIS TIER USED TO FALL THROUGH TO THE NO-EQUIPMENT PROGRAM, and it was the right answer only
       because nothing better existed: 15 of the 18 dumbbell answers handed somebody a bodyweight block
       after they had just said they own dumbbells. `Within Reach` is authored for exactly this athlete —
       full-body barbell-free strength that keeps loading by moving to one limb at a time once a fixed
       pair of bells stops being heavy — so strength, fat loss and athletic now have a real home here.
       Endurance still does not: a running goal is not answered by dumbbells, and Holt builds those. */
    if (primary === 'endurance') return 'fbh-bodyweight-basics';
    return 'fbh-home-strength';
  }
  return (GYM_MAP[primary] ?? GYM_MAP.health)[exp] ?? 'fbh-full-body-3';
}

/**
 * Intended id → a REAL catalog id. Everything unmapped falls back to Strength Foundation I.
 *
 * ══ THIS TABLE IS WHAT SWITCHES THE GUIDED ON-RAMP BACK ON ══
 *
 * It held three entries — all strength, all gym — while fourteen programs shipped. `canRecommend`
 * therefore failed 51 of its 54 combinations and Home stopped offering "Help me find one" at all
 * (see the note on `canRecommend`). The catalog had grown; this map had not been told.
 *
 * Every entry below points at a program that is authored, shipping, and a defensible answer to the
 * question that reaches it. Where the catalog cannot answer precisely, the alias errs toward the
 * program an athlete can actually run — never toward the one that merely sounds closer.
 *
 * ⚠ ENDURANCE RESOLVES TO CONDITIONING, AND THAT IS A JUDGEMENT, NOT A PLACEHOLDER.
 *
 * The `run-*` ids are the design's intended Running family and nothing in the catalog answers them.
 * But the intake never asks about running: the goal is presented to the athlete as *"Improve
 * Endurance — go longer. Build your engine and stamina."*, which is the question Athletic Conditioning
 * Foundation ("build a base of work capacity from a standing start") and Iron & Engine ("conditioning
 * that survives a heavy session") are written to answer. Routing that wording to a conditioning block
 * is honest; routing it to a barbell strength program was not.
 *
 * When the Running family lands, re-point these three ids at it — that is the only edit needed, and
 * the recommendation changes without anything else moving.
 */
const CATALOG_ALIAS: Record<string, string> = {
  // Strength — the three that were already here.
  'strength-foundation-1': FALLBACK_ID,
  'strength-powerbuilding-1': ADVANCED_ID,
  /* ⚠ ADVANCED NO LONGER COLLAPSES ONTO A "FOUNDATION". Until `Strength Builder I` was authored this
     pointed at Strength Foundation II — an Intermediate block whose own stated goal is "improve gym
     confidence" — which is what `catalogServesLevel` exists to refuse to say to a fifteen-year lifter.
     It is also the successor Strength Foundation II has always NAMED, so graduating one now reaches the
     other instead of falling through to Holt. */
  'strength-531': 'strength-builder-i-4day',

  // Full Body & Home. Both no-equipment ids land on the same program because there is one authored
  // for training with nothing, and it is the honest answer to both questions.
  'fbh-bodyweight-basics': 'bodyweight-foundation',
  /* ⚠ POINTED AT THE DUMBBELL PROGRAM, NOT THE BODYWEIGHT ONE. "Feel good, move well, stay strong for
     life" is what a full-body strength block three days a week IS — and this athlete has told us they
     own dumbbells. Sending them to a no-equipment program would ignore the one fact they volunteered. */
  'fbh-home-minimalist': 'within-reach-dumbbell-3day',
  'fbh-dumbbell-only': 'close-quarters-6day',
  /* Dumbbell strength, fat loss and athletic — the gap `Within Reach` was written to close. */
  'fbh-home-strength': 'within-reach-dumbbell-3day',
  // gym/health at beginner and intermediate — a full-body 3-day that teaches the patterns, which is
  // what "general health, at a gym, new to this" actually wants.
  'fbh-full-body-3': FALLBACK_ID,

  // Muscle Building. A beginner asking for size at a gym gets foundational strength first —
  // Muscle Building Intermediate opens above where they are, and telling them so is the coaching.
  'mb-arms-aesthetics': FALLBACK_ID,
  'mb-hypertrophy-block': 'muscle-building-intermediate',
  'mb-upper-lower': 'muscle-building-intermediate',
  'mb-ppl': 'frame-by-frame-5day',

  // Conditioning — beginner and intermediate to the foundation, advanced to the six-day block.
  'cond-hiit': 'athletic-conditioning-foundation',
  'cond-circuit': 'athletic-conditioning-foundation',
  'cond-engine': 'iron-and-engine',
  'cond-metcon': 'iron-and-engine',

  // Endurance at a gym, until the Running family is authored — see the note above.
  'run-c25k': 'athletic-conditioning-foundation',
  'run-10k': 'athletic-conditioning-foundation',
  'run-half-base': 'iron-and-engine',
};

/** Pure: resolve intake → a real catalog program id. Always returns an id that exists in the catalog. */
export function resolveRecommendationId(input: RecommendInput): string {
  return CATALOG_ALIAS[intendedProgramId(input)] ?? FALLBACK_ID;
}

/**
 * IS THE CATALOGUE ACTUALLY WRITTEN FOR THIS ATHLETE, OR ONLY THE NEAREST THING TO THEM?
 *
 * ══ THE NINETY SECONDS THIS EXISTS TO STOP ══
 *
 * A lifter of fifteen years answers three questions — very experienced, get stronger, full gym — and is
 * handed **Strength Foundation II**, a block tagged `Intermediate` whose own stated goals include
 * *"improve gym confidence"*. To somebody who has coached other people, that is the app announcing it
 * cannot tell them apart from a novice, in the first minute, before they have logged a thing.
 *
 * It is not a bug in the map. The map is doing its best: **one of fourteen shipping programs is tagged
 * Advanced, and it is conditioning.** There is genuinely nothing else to hand them.
 *
 * So the fix is not a better guess — it is admitting it. This decides WHETHER the recommendation is
 * worth making; the surface decides what to say instead (see `ExperienceLevelCard`, suggested mode).
 *
 * ⚠ IT ONLY EVER LOOKS DOWNWARD. A BEGINNER BEING OFFERED AN INTERMEDIATE PROGRAM IS FINE and must not
 * trip this: the catalogue is 590/733 `Intermediate` at exercise level for the same reason — the tag
 * describes technical demand, not required fitness, and `STRETCH_CEILING` already reaches a beginner one
 * tier up on purpose. Only a program authored BELOW the athlete's own level is the failure here.
 *
 * Unknown or unparseable difficulty counts as served: refusing to recommend because a tag was misspelt
 * would turn a data problem into a silent product outage.
 */
const LEVEL_RANK: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
const DIFFICULTY_RANK: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 };

export function catalogServesLevel(experience: string | null | undefined, programDifficulty: string | null | undefined): boolean {
  const want = LEVEL_RANK[expFor(experience)];
  const got = DIFFICULTY_RANK[(programDifficulty ?? '').trim()];
  if (got == null) return true; // an unreadable tag is a data problem, not a reason to refuse
  return got >= want;
}

/**
 * MATCH A PROGRAM'S NAMED SUCCESSOR TO SOMETHING THAT ACTUALLY EXISTS.
 *
 * ⚠ SIX OF THE SEVEN NAMED SUCCESSORS DO NOT EXIST. Only *Strength Foundation II* is real; Bodyweight
 * Strength, Conditioning Intermediate, Muscle Building Advanced and the rest are intentions written into
 * the programs that lead to them. Printing `successorName` straight out would promise six programs nobody
 * has authored — the same defect that closed the guided on-ramp, arriving at the other end of the
 * athlete's journey.
 *
 * Matching is by NAME because that is what the field holds: authored for a human to read, never as a
 * foreign key. Compared with punctuation and case stripped, and in BOTH directions, because a successor
 * named "Strength Foundation II" is filed as "Strength Foundation II (4-Day)" — an exact match finds
 * none of them.
 *
 * Returns the id of the real program, or null when the successor is still only an intention.
 *
 * Lives here rather than beside the catalogue because `recommend.ts` imports through the `@/` alias,
 * which `node --test` cannot resolve — so anything testable has to sit on this side of that line.
 */
export function successorIdFor(
  named: string | null | undefined,
  catalog: readonly { id: string; name: string }[],
): string | null {
  const key = loose(named ?? '');
  if (!key) return null;
  const hit = catalog.find((d) => {
    const n = loose(d.name);
    return n === key || n.startsWith(key) || key.startsWith(n);
  });
  return hit?.id ?? null;
}

const loose = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The 6 goals the intake asks about — every question the catalog has to be able to answer. */
const GOALS: readonly GoalId[] = ['strength', 'muscle', 'fatloss', 'endurance', 'health', 'athletic'];
const EXPERIENCES: readonly Experience[] = ['beginner', 'intermediate', 'advanced'];
/** One equipment answer per access tier — `accessFor` reduces all five checkboxes to these three. */
const ACCESS_ANSWERS: readonly (readonly EquipmentId[])[] = [['fullgym'], ['dumbbells'], []];

/**
 * IS THE GUIDED ON-RAMP WORTH OFFERING YET?
 *
 * `resolveRecommendationId` always returns a real id — that is its invariant, and it is achieved by a
 * fallback. So "we can recommend" is NOT "the answer exists"; it is "the answer corresponds to what was
 * asked". Today it does not: of the 54 goal × experience × access combinations the intake can produce,
 * only gym-access strength lands on a program authored for that goal. An athlete who says *I want to run
 * a 10k, bodyweight only* answers three questions and is handed a 3-day barbell program.
 *
 * That is a promise the catalog cannot keep, so Home does not make it — see the starting-point slot in
 * `(tabs)/index.tsx`. This is a derived condition rather than a flag on purpose: when the Running,
 * Conditioning, Muscle Building and Full Body families land (either authored under the design's own ids
 * or aliased to them), the on-ramp returns without anyone having to remember it was switched off.
 *
 * A combination counts as answered only when the program it RESOLVES TO is really in the catalog.
 * Reaching `FALLBACK_ID` is precisely the case this rules out.
 *
 * ⚠ IT FOLLOWS THE ALIAS TO ITS TARGET, AND THAT IS THE WHOLE GUARD.
 *
 * This used to accept `CATALOG_ALIAS[intended] != null` — the mere EXISTENCE of an alias entry — which
 * was safe only while the table was nearly empty. The moment the table names every intended id (which
 * is what makes the on-ramp work at all), that test is true for every input and `canRecommend` returns
 * true for ANY catalog, including an empty one. It would have gone on reporting that the app can
 * recommend after somebody deleted every program in it.
 *
 * Checking the TARGET keeps the question honest and makes it stricter than before: an alias pointing at
 * a program nobody authored now fails, where previously it passed for being written down.
 */
export function canRecommend(catalogIds: readonly string[]): boolean {
  const have = new Set(catalogIds);
  const answered = (intended: string) => have.has(CATALOG_ALIAS[intended] ?? intended);

  return GOALS.every((primaryGoal) =>
    EXPERIENCES.every((experience) =>
      ACCESS_ANSWERS.every((equipment) => answered(intendedProgramId({ primaryGoal, experience, equipment }))),
    ),
  );
}
