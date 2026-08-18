/**
 * What each limitation actually removes.
 *
 * ══ ⚠ THIS FILE IS THE CLOSEST THING IN THE APP TO HEALTH GUIDANCE, AND IT IS NOT REVIEWED YET ══
 *
 * Everything below is a MECHANICAL rule — "this pattern loads that joint in that direction" — chosen to
 * be conservative and defensible, not a clinical recommendation. It has not been through the human
 * approve/publish pass that the exercise coaching content went through, and it should before this ships
 * to anyone who is actually hurt. The decisions are stated inline rather than buried so a reviewer can
 * disagree with each one individually.
 *
 * The bar held throughout: **remove the movements that most directly load the complaint, and nothing
 * else.** Over-excluding produces a thin, demoralising program and teaches athletes to stop declaring
 * their limitations — which is a worse safety outcome than the exclusion was ever worth.
 *
 * ══ THREE KINDS OF LIMITATION, THREE MECHANISMS ══
 *
 * Not every limitation is a pattern. `no_barbell` is about equipment and `no_running` is about a cardio
 * activity; forcing all three through one map would mean either a pattern that means "barbell" (there
 * isn't one — barbells appear across every pattern) or silently ignoring two of the seven.
 */

import { EQUIP_UNLOCK } from '../../home-gym/equipment.ts';
import type { Limitation } from '../constraints.ts';

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// 1. MOVEMENT PATTERNS
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Patterns removed outright, keyed by limitation. Vocabulary is the catalogue's own `movementPattern`.
 *
 * Per-entry reasoning, because each is arguable:
 *
 *  · **shoulders** → `Vertical Push`, `Shoulder Isolation`. Overhead pressing takes the joint to end-range
 *    under load, and direct deltoid work is the other thing that reliably aggravates it. Horizontal
 *    pressing is KEPT: it is the most useful upper-body movement there is, most people with a cranky
 *    shoulder press fine at or below flat, and removing it as well leaves an upper day with almost
 *    nothing in it.
 *
 *  · **knees** → `Power / Plyometric` only. This is the one that will surprise a reviewer, so: loaded
 *    knee flexion — squats, presses, leg curls — is generally well tolerated and is often the thing that
 *    helps, whereas landing impact is what people mean when they say their knees hurt. Excluding
 *    `Squat / Knee Dominant` would delete leg training entirely to solve a problem it usually isn't.
 *
 *  · **lower_back** → `Hinge / Hip Dominant`, `Carry`. Loaded hip hinging and axial loading are the two
 *    that put the most shear and compression through a lumbar spine. `Squat / Knee Dominant` is kept for
 *    the same reason as above, and because a supported or machine-based squat pattern usually remains
 *    available once the equipment filter has had its say.
 *
 *  · **no_jumping** → `Power / Plyometric`. Direct and uncontroversial.
 *
 *  · **no_overhead** → `Vertical Push`. Also direct. Distinct from `shoulders` because plenty of people
 *    avoid overhead work for reasons that have nothing to do with a shoulder — a low ceiling, a healing
 *    rib, a neck.
 */
export const LIMITATION_PATTERNS: Record<Limitation, readonly string[]> = {
  shoulders: ['Vertical Push', 'Shoulder Isolation'],
  knees: ['Power / Plyometric'],
  lower_back: ['Hinge / Hip Dominant', 'Carry'],
  no_jumping: ['Power / Plyometric'],
  no_overhead: ['Vertical Push'],
  no_barbell: [],
  no_running: [],
};

export const limitationPatterns = (l: Limitation): readonly string[] => LIMITATION_PATTERNS[l] ?? [];

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// 1a. THE EXCEPTIONS TO A BANNED PATTERN  (PO decision, 2026-08-17)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Supine hip extension: shoulders on the floor or a bench, load across the hips, spine neutral throughout.
 *
 * ⚠ **A BANNED PATTERN IS TOO BLUNT AN INSTRUMENT HERE, AND THE MEASUREMENT SAID SO.** `lower_back` bans
 * `Hinge / Hip Dominant` whole, which is right for a deadlift and wrong for a glute bridge — and the ban
 * took **all thirteen** of these along with it. The result was an eight-week block for someone with a bad
 * back containing *zero* posterior-chain hip extension, which is close to the opposite of what the
 * complaint calls for.
 *
 * The family is admitted rather than four hand-picked keys because it is genuinely one movement on
 * thirteen implements: the bar, the band and the machine change what loads the hips, not what the spine
 * does. The equipment gate already decides which of them an athlete can reach.
 *
 * ⚠ WHAT IS **NOT** HERE, AND WHY THE BAN IS STILL DOING WORK: deadlifts of every kind, Romanian and
 * stiff-leg variants, sumo, swings, good mornings, back extensions and supermans all stay excluded. Those
 * load a hinging or extending lumbar spine, which is the thing being worked around. So do all four
 * carries — considered and left out, because a loaded carry is axial compression however good the
 * suitcase variant is for anti-lateral-flexion.
 */
const SUPINE_HIP_EXTENSION: readonly string[] = [
  'glute-bridge',
  'glute-bridge-iso-hold',
  'single-leg-glute-bridge',
  'band-glute-bridge',
  'barbell-glute-bridge',
  'dumbbell-glute-bridge',
  'suspension-trainer-glute-bridge',
  'band-hip-thrust',
  'barbell-hip-thrust',
  'cable-hip-thrust',
  'dumbbell-hip-thrust',
  'hip-thrust-machine',
  'smith-machine-hip-thrust',
];

/**
 * Exercises admitted DESPITE their pattern being excluded, keyed by limitation.
 *
 * ⚠ AN EXCEPTION LIST IS ONLY EVER SAFE IN THIS DIRECTION. Adding a key here can only widen what a
 * limited athlete is offered, so a typo produces a movement that was already legal for everyone else
 * rather than a missing safeguard. `LIMITATION_EXCLUDE_KEYS` below is the dangerous direction, and it is
 * the one whose keys are asserted to exist.
 */
export const LIMITATION_KEEP_KEYS: Record<Limitation, readonly string[]> = {
  shoulders: [],
  knees: [],
  lower_back: SUPINE_HIP_EXTENSION,
  no_jumping: [],
  no_overhead: [],
  no_barbell: [],
  no_running: [],
};

export const limitationKeepKeys = (l: Limitation): readonly string[] => LIMITATION_KEEP_KEYS[l] ?? [];

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// 1b. MOVEMENTS A PATTERN BAN DOES NOT CATCH  (PO decision, 2026-08-17)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The upright row family — all six of them, filed under `Horizontal Pull`.
 *
 * ⚠ **FOUND BY MEASUREMENT, NOT BY REVIEW, AND IT HAD BEEN LIVE THE WHOLE TIME.** A shoulders-limited
 * athlete at a full gym asking for a shoulder day was handed *Band Upright Row · Band Rear Delt Fly ·
 * Kettlebell Clean and Press · Barbell Upright Row · Cable Rear Delt Fly*. Banning `Vertical Push` and
 * `Shoulder Isolation` caught the overhead press and the lateral raise and could never have caught these,
 * because an upright row is filed as a pull. Internally rotating and elevating a loaded humerus is the
 * classic impingement position and it is exactly what somebody ticking this box is describing.
 *
 * Rear delt flies are deliberately KEPT. They are the one piece of direct shoulder work that does not
 * take the joint anywhere it complains about, and removing them would leave the day with nothing.
 */
const UPRIGHT_ROWS: readonly string[] = [
  'band-upright-row',
  'barbell-upright-row',
  'cable-upright-row',
  'dumbbell-upright-row',
  'ez-bar-upright-row',
  'machine-upright-row',
];

/**
 * Lifts that finish with the load locked out overhead, all filed under `Power / Plyometric`.
 *
 * The same blind spot as the upright rows: `no_overhead` bans `Vertical Push`, so it caught the press and
 * missed the jerk, the snatch and the clean-and-press — which put a barbell overhead just as thoroughly,
 * faster, and from a worse position.
 *
 * ⚠ THE PLAIN CLEANS ARE NOT HERE, DELIBERATELY. A clean racks the bar on the front delts and stops; it
 * never goes overhead. Excluding it would be over-reaching past the stated complaint, which is the thing
 * the top of this file warns against.
 */
const OVERHEAD_FINISH: readonly string[] = [
  'axle-clean-and-press',
  'kettlebell-clean-and-press',
  'log-clean-and-press',
  'barbell-clean-and-jerk',
  'barbell-push-jerk',
  'barbell-split-jerk',
  'kettlebell-jerk',
  'barbell-snatch',
  'barbell-hang-snatch',
  'barbell-power-snatch',
  'kettlebell-snatch',
  'single-arm-dumbbell-snatch',
  // Same shape as an upright row, done fast — it belongs with them whichever complaint is being worked
  // around, and it is filed under Power rather than Pull, so neither list would catch it alone.
  'kettlebell-high-pull',
];

/**
 * Catalogue keys a limitation removes on top of its patterns.
 *
 * ⚠ EVERY KEY IS ASSERTED TO EXIST (`limitation-keys.test.mjs`). A typo here is a safeguard that silently
 * does nothing, which is the failure mode this whole file is written against — the athlete ticks the box,
 * believes they have been heard, and gets the movement anyway.
 */
export const LIMITATION_EXCLUDE_KEYS: Record<Limitation, readonly string[]> = {
  shoulders: [...UPRIGHT_ROWS, ...OVERHEAD_FINISH],
  knees: [],
  lower_back: [],
  no_jumping: [],
  // Not the upright rows: this is a statement about where the load goes, not about the shoulder joint.
  no_overhead: OVERHEAD_FINISH,
  no_barbell: [],
  no_running: [],
};

export const limitationExcludeKeys = (l: Limitation): readonly string[] => LIMITATION_EXCLUDE_KEYS[l] ?? [];

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// 2. EQUIPMENT
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Equipment ids withdrawn from the athlete's available set, in `home-gym/equipment.ts` vocabulary.
 *
 * Withdrawing equipment rather than excluding patterns is what makes this compose correctly: the existing
 * `canDoExercise` gate then does the work — including the bench and rack requirements it already knows
 * about — and every barbell variant across every pattern disappears at once, without a list to maintain.
 *
 * ══ ⚠ IT MUST BE THE WHOLE UNLOCK GROUP, AND THIS WAS FOUND THE HARD WAY ══
 *
 * `EQUIP_UNLOCK.barbell` is `['barbell', 'plates', 'rack', 'ezbar', 'trapbar', 'smith']` and it is an OR:
 * **any one** of those unlocks **every** barbell exercise in the catalogue. The first version of this
 * removed `barbell`, `trapbar` and `smith` and deliberately kept `ezbar`, reasoning that a curl bar is
 * kinder on the wrists and that someone avoiding a back squat has no reason to give up a curl.
 *
 * That reasoning was fine and the result was wrong: `plates` and `rack` were still there, so the group
 * stayed unlocked and a `no_barbell` athlete at a full gym was prescribed a snatch-grip deadlift. The
 * matrix test caught it in week 4 of a program that looked correct in week 1.
 *
 * So the group is removed whole, and losing the EZ-bar is the honest price of `EQUIP_UNLOCK` being
 * all-or-nothing. Derived from that constant rather than copied out of it — if the unlock group ever
 * changes, this follows instead of silently drifting back into the same bug.
 */
export const LIMITATION_EQUIPMENT: Record<Limitation, readonly string[]> = {
  shoulders: [],
  knees: [],
  lower_back: [],
  no_jumping: [],
  no_overhead: [],
  no_barbell: EQUIP_UNLOCK.barbell ?? ['barbell', 'plates', 'rack', 'ezbar', 'trapbar', 'smith'],
  no_running: [],
};

/** The athlete's equipment with anything their limitations rule out removed. */
export function equipmentAfterLimitations(
  owned: readonly string[],
  limitations: readonly Limitation[],
): readonly string[] {
  const banned = new Set(limitations.flatMap((l) => LIMITATION_EQUIPMENT[l] ?? []));
  return banned.size === 0 ? owned : owned.filter((id) => !banned.has(id));
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// 3. CARDIO ACTIVITIES
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Cardio activities removed, in `workout/conditioning.ts` vocabulary
 * (`run · walk · bike · row · elliptical · swim · stair`).
 *
 * `no_running` takes the run and leaves everything else — that is the whole point of it, and bike, row
 * and swim carry a conditioning block perfectly well without impact. `knees` also drops the run: it is
 * the one place where the knee complaint and repeated impact genuinely coincide, and walking remains.
 *
 * ⚠ A `no_running` athlete cannot be given a running goal. That is not this file's job to enforce — the
 * assembler refuses it, in terms, rather than silently building a marathon plan out of bike intervals.
 */
export const LIMITATION_ACTIVITIES: Record<Limitation, readonly string[]> = {
  shoulders: [],
  knees: ['run'],
  lower_back: [],
  no_jumping: ['run'],
  no_overhead: [],
  no_barbell: [],
  no_running: ['run'],
};

export function activitiesAfterLimitations(
  activities: readonly string[],
  limitations: readonly Limitation[],
): readonly string[] {
  const banned = new Set(limitations.flatMap((l) => LIMITATION_ACTIVITIES[l] ?? []));
  return banned.size === 0 ? activities : activities.filter((a) => !banned.has(a));
}

/** Does this limitation set make a running goal impossible? Checked by the assembler before it builds. */
export const forbidsRunning = (limitations: readonly Limitation[]): boolean =>
  limitations.some((l) => (LIMITATION_ACTIVITIES[l] ?? []).includes('run'));
