/**
 * Which exercises are done one side at a time, and what to call that side.
 *
 * ══ WHY THIS HAS TO BE DERIVED, NOT JUST AUTHORED ══
 *
 * `per` already exists on a prescription and the logger already renders it — "3 × 10 **per leg**" shows
 * in three places on the active workout screen. It is blank for most athletes because **only a program
 * can set it**: `build-session.ts` copies `per` through when a program prescribed one, and a session you
 * built yourself has no program, so nothing ever fills it in.
 *
 * That is the reported gap (PO, 2026-08-09): "if you're doing dumbbell curls it should say per arm". The
 * field was there, the display was there, and the only missing piece was that nobody was answering the
 * question for a freestyle lift.
 *
 * ══ WHY IT IS NOT COSMETIC ══
 *
 * `ProgramExercise.per`'s own schema comment puts it best: an athlete reading "Bulgarian Split Squat
 * 3 × 10" does thirty reps when the author prescribed sixty. It is the one field whose absence does not
 * leave a gap on screen — it leaves a *different, complete-looking* prescription, and no way to tell.
 *
 * ══ THE LINE THIS DRAWS ══
 *
 * Conservative on purpose. A false positive is worse than a miss: telling someone a barbell squat is "per
 * leg" would double a number that should not move, and they would have no reason to doubt it. So this
 * matches only phrasing that is unambiguous about being one side at a time, and everything else — every
 * bilateral lift, and every name it simply does not recognise — returns `null`, which means "say nothing".
 */

/** The side a rep count refers to. `'side'` is the fallback when the limb is not obvious from the name. */
export type PerSide = 'arm' | 'leg' | 'side';

/**
 * Unambiguously one arm at a time.
 *
 * A suitcase carry and a renegade row are single-sided by definition even though neither says so, which
 * is why they are named rather than inferred.
 */
const ARM = [
  /\bsingle[- ]arm\b/i,
  /\bone[- ]arm\b/i,
  /\bsingle[- ]handed\b/i,
  /\bsuitcase\b/i,
  /\brenegade\b/i,
];

/**
 * Unambiguously one leg at a time.
 *
 * A lunge, a split squat and a step-up all put one leg under the load per rep and are counted per leg by
 * every coach who has ever written one down — but none of them contains the word "single".
 */
const LEG = [
  /\bsingle[- ]leg\b/i,
  /\bone[- ]leg\b/i,
  /\bbulgarian\b/i,
  /\bsplit squat\b/i,
  /\blunge\b/i,
  /\bstep[- ]up\b/i,
  /\bpistol\b/i,
  /\bskater\b/i,
  /\bcossack\b/i,
  /\bsingle[- ]sided\b/i,
];

/**
 * Alternating — one side, then the other, within the set.
 *
 * ⚠ THE GENUINELY AMBIGUOUS CASE, and it is resolved toward "per side" deliberately. "Alternating
 * Dumbbell Curl, 10 reps" is written by some coaches as ten total and by others as ten each. Reading it
 * as per-side is the interpretation that makes the label appear and the athlete decide; reading it as
 * total makes the app silently pick the smaller number and say nothing. Between a visible claim they can
 * correct and an invisible one they cannot, the visible one is the honest default.
 */
const ALTERNATING = /\balternating\b|\balternate\b/i;

/**
 * What side this lift is counted on, or `null` for a bilateral lift and anything unrecognised.
 *
 * Matched on the NAME rather than the catalogue id, because a freestyle session may carry a name with no
 * catalogue row behind it at all — the case this exists to serve.
 */
export function perSideFor(name: string): PerSide | null {
  if (!name) return null;

  // A bilateral lift that merely mentions a limb must not be caught. "Barbell Bench Press" has neither,
  // but "Dumbbell Bench Press" would trip a naive `arm` match if the patterns were looser than they are.
  for (const re of ARM) if (re.test(name)) return 'arm';
  for (const re of LEG) if (re.test(name)) return 'leg';
  if (ALTERNATING.test(name)) return 'side';
  return null;
}

/**
 * How many times a rep count is performed — 2 for anything done one side at a time.
 *
 * ══ THIS IS FOR VOLUME, AND ONLY FOR VOLUME ══
 *
 * ⚠ **IT MUST NEVER BE APPLIED TO `reps`.** The schema is explicit and correct about why: doubling the
 * rep count for a per-side item would put twenty in the reps column for a set of ten-a-side and corrupt
 * every e1RM, personal record and history row downstream. `reps` stays exactly as the athlete logged it.
 *
 * Volume is a different question with a different answer. Curling 30 lb for 8 reps *per arm* moves
 * 30 × 8 × 2 = 480 lb, and counting it as 240 understates the session by half — which is what this app
 * did until now (PO, 2026-08-09). The load is what they are holding; the sides are how many times they
 * lifted it. Both numbers can be right at once, and only one of them belongs in the reps column.
 */
export const sidesFor = (per: PerSide | null | undefined): number => (per ? 2 : 1);
