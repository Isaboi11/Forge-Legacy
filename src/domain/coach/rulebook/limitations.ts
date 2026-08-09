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
