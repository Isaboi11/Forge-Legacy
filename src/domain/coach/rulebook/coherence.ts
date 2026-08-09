/**
 * Does this exercise actually train what its pattern claims?
 *
 * ══ THE BUG THIS EXISTS FOR ══
 *
 * A bodyweight athlete asked for a Back & Biceps day and Holt prescribed a **Sliding Hamstring Curl** as
 * the biceps movement. Nothing was broken: the catalogue files twelve leg curls under `Elbow Flexion` —
 * `nordic-hamstring-curl`, `lying-leg-curl-machine`, `band-leg-curl` and the rest — almost certainly
 * because the word "curl" drove the tagging. Every one of them lists `hamstrings` as the primary mover.
 *
 * So the pattern said arms and the muscle said legs, and the fill step believed the pattern.
 *
 * ══ A RULE, NOT A BLOCKLIST ══
 *
 * The first instinct was to name those twelve keys and skip them. That fixes today and rots immediately:
 * the next catalogue import adds a thirteenth and nobody notices, because a missing exercise is invisible.
 *
 * Instead: every pattern declares the muscles a primary mover may plausibly be, and anything whose primary
 * movers fall entirely outside that set is treated as misfiled — for the coach's purposes only. It scales
 * to entries nobody has written yet, and it is checked by a test that reports how much of each pattern it
 * rejects, so a wrong table shows up as a pattern losing half its exercises rather than as silence.
 *
 * ⚠ THIS DOES NOT EDIT THE CATALOGUE, and must not. `exercises.json` is append/annotate-only under the
 * project's data-protection rule, and the record is not *wrong* in the athlete's Exercise Library — a
 * Nordic curl really is called a curl and really does live where it lives. This is the coach declining to
 * read a leg movement as an arm movement, which is a coaching judgement and belongs here.
 *
 * Patterns whose membership is genuinely heterogeneous — Mobility, Carry, Power, Other — declare nothing
 * and are never filtered. Guessing there would cost real exercises to fix an imaginary problem.
 */

/** Muscles a primary mover may be, per pattern. Absent means "no coherent set — never filter". */
const PLAUSIBLE_PRIMARY: Record<string, readonly string[]> = {
  'Horizontal Push': ['chest', 'front_deltoids', 'lateral_deltoids', 'triceps'],
  'Vertical Push': ['front_deltoids', 'lateral_deltoids', 'chest', 'triceps', 'traps'],
  'Horizontal Pull': ['lats', 'upper_back', 'traps', 'rear_deltoids', 'biceps'],
  'Vertical Pull': ['lats', 'upper_back', 'traps', 'rear_deltoids', 'biceps'],
  'Elbow Flexion': ['biceps', 'forearms'],
  'Elbow Extension': ['triceps'],
  'Shoulder Isolation': ['front_deltoids', 'lateral_deltoids', 'rear_deltoids', 'traps', 'rotator_cuff'],
  'Squat / Knee Dominant': ['quadriceps', 'glutes', 'adductors', 'hamstrings'],
  'Hinge / Hip Dominant': ['hamstrings', 'glutes', 'erector_spinae', 'adductors'],
  'Hip Isolation': ['glutes', 'abductors', 'adductors', 'hip_flexors'],
  'Calf / Ankle': ['calves', 'tibialis_anterior'],
  Core: [
    'rectus_abdominis',
    'obliques',
    'transverse_abdominis',
    'erector_spinae',
    'hip_flexors',
    'neck',
  ],
};

/** Patterns this file deliberately declines to police. */
export const UNPOLICED_PATTERNS: readonly string[] = ['Mobility', 'Carry', 'Power / Plyometric', 'Other'];

/**
 * Is this a coherent member of its pattern?
 *
 * `full_body` and the other System descriptors count as plausible everywhere — they are labels rather
 * than anatomy, and an exercise carrying one has told us nothing to disagree with.
 */
export function isCoherent(ex: {
  pattern: string;
  primaryMuscleIds: readonly string[];
  modality?: string;
}): boolean {
  /*
   * ⚠ A STRETCH IS NOT A SET. `triceps-stretch` carries `movementPattern: 'Elbow Extension'` and
   * `primaryMuscleIds: ['triceps']`, so every muscle-based check passes it — and a bodyweight athlete got
   * "Triceps Stretch · 3 × 12–15" as their triceps work. The catalogue already answers this properly:
   * `modality` is `'Strength' | 'Cardio' | 'Mobility'`, and that record is `Mobility`.
   *
   * So a strength slot takes strength movements, and mobility movements are reserved for Mobility days,
   * where 3 × 30 seconds is the right prescription for them. Two records today; a rule rather than two
   * names, because the next import will add more.
   */
  if (ex.modality === 'Mobility' && ex.pattern !== 'Mobility') return false;

  const plausible = PLAUSIBLE_PRIMARY[ex.pattern];
  if (!plausible) return true;
  if (ex.primaryMuscleIds.length === 0) return true;
  if (ex.primaryMuscleIds.some((m) => SYSTEM_DESCRIPTORS.has(m))) return true;
  return ex.primaryMuscleIds.some((m) => plausible.includes(m));
}

/** `muscles.json` marks these `region: 'System'` — descriptors, not anatomy. */
const SYSTEM_DESCRIPTORS = new Set(['full_body', 'cardiovascular', 'grip', 'mobility', 'balance']);

/** Exposed so the test can report per-pattern rejection rates rather than just pass or fail. */
export const POLICED_PATTERNS: readonly string[] = Object.keys(PLAUSIBLE_PRIMARY);
