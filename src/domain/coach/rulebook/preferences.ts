/**
 * Which exercise a pattern should reach for first.
 *
 * ══ WHY THIS FILE HAD TO EXIST ══
 *
 * Without it the coach built programs that passed every gate and no coach would write. A full-gym
 * strength block opened with an *Alternating Dumbbell Bench Press* and put *Band Good Morning* in the
 * hinge slot; the core movement was a *Copenhagen Plank* every single day. Nothing was broken — the
 * ranker sorted by difficulty fit, then by how much musculature a movement trained, then alphabetically,
 * and "Alternating…" and "Band…" and "Copenhagen…" simply sort early.
 *
 * The missing signal was the obvious one: **some exercises are the canonical expression of their pattern
 * and most are variations on it.** A horizontal push at a full gym is a barbell bench press. That is
 * knowledge, it cannot be derived from the catalogue's own fields, and so it belongs here in the rulebook
 * rather than in the sort function.
 *
 * ══ ONE LIST PER PATTERN, SPANNING EVERY ROOM ══
 *
 * Each list runs best-first across equipment tiers — barbell, then dumbbell or machine, then bodyweight —
 * and the ranker takes the first entry the athlete can actually do. So the same list serves a commercial
 * gym, a garage with dumbbells, and a hotel room, and the fallback is a deliberate ordering rather than
 * whatever survived the filter.
 *
 * ⚠ A PREFERENCE IS NOT A RESTRICTION. Anything in the catalogue can still fill a slot; these only decide
 * what gets asked first. An athlete whose room contains none of these still gets a program built from
 * everything else that matches — see `candidatesFor`, where an unlisted exercise ranks after every listed
 * one and before nothing.
 *
 * Every key here is asserted to exist AND to carry the pattern it is filed under (`preferences.test.mjs`).
 * A typo in this file would otherwise do nothing at all, silently, forever.
 */

/**
 * ⚠ ONE CATALOGUE ODDITY WORTH KNOWING ABOUT, since it explains a strange result rather than causing one.
 *
 * `nordic-hamstring-curl` and `sliding-hamstring-curl` are filed under **Elbow Flexion** in the dataset —
 * a hamstring movement under an arm pattern, presumably because "curl" drove the tagging. That is why an
 * early conditioning plan prescribed a *Sliding Hamstring Curl* as its biceps slot. Listing the real curls
 * first fixes the symptom here; the data itself is not this file's to correct, and a catalogue correction
 * would be the honest long-term fix.
 */
export const PATTERN_PREFERENCES: Record<string, readonly string[]> = {
  // ── The six compounds a program is actually built on ────────────────────────────────────────────────
  'Horizontal Push': [
    'barbell-bench-press',
    'dumbbell-bench-press',
    'machine-chest-press',
    'push-up',
    'dumbbell-floor-press',
    'close-grip-push-up',
  ],
  'Vertical Push': [
    'barbell-overhead-press',
    'dumbbell-overhead-press',
    'dumbbell-arnold-press',
    'barbell-push-press',
    'barbell-seated-overhead-press',
  ],
  'Horizontal Pull': [
    'barbell-bent-over-row',
    'dumbbell-bent-over-row',
    'dumbbell-chest-supported-row',
    'inverted-row',
    'bodyweight-row',
  ],
  'Vertical Pull': ['pull-up', 'cable-lat-pulldown', 'chin-up', 'assisted-pull-up', 'negative-pull-up'],
  'Squat / Knee Dominant': [
    'barbell-back-squat',
    'barbell-front-squat',
    'dumbbell-goblet-squat',
    '45-degree-leg-press',
    'dumbbell-forward-lunge',
    'bodyweight-squat',
  ],
  'Hinge / Hip Dominant': [
    'barbell-deadlift',
    'barbell-romanian-deadlift',
    'dumbbell-romanian-deadlift',
    'barbell-hip-thrust',
    'glute-bridge',
    'bodyweight-good-morning',
  ],

  // ── Isolation ───────────────────────────────────────────────────────────────────────────────────────
  'Elbow Flexion': ['barbell-biceps-curl', 'dumbbell-biceps-curl', 'cable-biceps-curl'],
  'Elbow Extension': [
    'cable-triceps-pushdown',
    'dumbbell-skull-crusher',
    'barbell-skull-crusher',
    'dumbbell-triceps-kickback',
  ],
  'Shoulder Isolation': [
    'dumbbell-lateral-raise',
    'cable-lateral-raise',
    'dumbbell-front-raise',
    'barbell-shrug',
  ],
  'Hip Isolation': ['cable-hip-abduction', 'frog-pump', 'adductor-rock-back', 'cable-glute-kickback'],
  'Calf / Ankle': ['barbell-calf-raise', 'dumbbell-calf-raise', 'calf-raise', 'single-leg-calf-raise'],

  // ── Core: braced before flexed, which is the one real ordering opinion in this group ────────────────
  Core: ['plank', 'dead-bug', 'side-plank', 'hanging-leg-raise', 'bird-dog', 'ab-wheel-rollout'],

  // ── Mobility: hips and ankles first, because that is what most lifters actually lack ────────────────
  Mobility: [
    '90-90-hip-stretch',
    'couch-stretch',
    'ankle-dorsiflexion-mobilization',
    'active-hang',
    'cat-cow',
  ],
};

/** Every key named above, for the test that keeps this file honest. */
export const ALL_PREFERRED_KEYS: readonly string[] = Object.values(PATTERN_PREFERENCES).flat();

/**
 * Where an exercise sits in its pattern's preference list. Lower is better; unlisted sorts last.
 *
 * `Infinity` rather than a large number so the ranker's arithmetic cannot accidentally make an unlisted
 * exercise beat a listed one through some other term.
 */
export function preferenceRank(pattern: string, key: string): number {
  const list = PATTERN_PREFERENCES[pattern];
  if (!list) return Number.POSITIVE_INFINITY;
  const i = list.indexOf(key);
  return i === -1 ? Number.POSITIVE_INFINITY : i;
}
