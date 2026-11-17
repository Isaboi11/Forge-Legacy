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
 * (QA F11, 2026-09-26: the catalogue now files those twelve under `Hinge / Hip Dominant`. This rule stays —
 * it is what catches the NEXT misfiled row, which is why it was written as a rule.)
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

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE MUSCLE TAGS THEMSELVES — the data the weekly volume model counts (AI Road to 10, PB-2)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * ══ WHY THE SECONDARY TAGS NOW MATTER ══
 *
 * Until the weekly volume model, a secondary muscle was a line on the exercise page. Now it is half a set
 * (PAS-A4-D1), summed across a week and held against a band — so a wrong tag is a wrong dose. Measured over
 * the visible catalogue on 2026-11-17, before the fix: every barbell, dumbbell, kettlebell and Smith
 * deadlift, Romanian deadlift, stiff-leg deadlift, good morning and swing credited the glutes and NOT the
 * hamstrings (32 rows) — a whole block of RDLs counted zero hamstring work; seven presses credited only the
 * chest, so a Spoto or Larsen press did no triceps work; seven overhead presses had no triceps; and ten
 * chest flies credited the triceps, a muscle a fly never shortens.
 *
 * These are rules, not a list, for the reason the primary check above is: the next import adds a row
 * nobody re-reads. `catalogueTagProblems` runs over every visible row in `muscle-tags.test.mjs`, and the
 * fixes are logged in `SOURCE-CORRECTIONS.csv` like every other correction to the source catalogue.
 *
 * ⚠ A PRIMARY OR A PATTERN IS WHAT `author-catalogue.ts` PRINTS INTO COACH-AUTHOR'S SYSTEM PROMPT, so the
 * first pass changed only secondary links. The PO then approved the primary fixes (2026-11-17): every Romanian,
 * stiff-leg and good-morning row is HAMSTRINGS-primary, glutes secondary; the head-down push-ups (pike, handstand)
 * are overhead presses, front-delt primary; the machine triceps dip is an elbow extension, not a chest slot. Those
 * changed the prompt on purpose (the author suite hashes the catalogue) and the rules below now hold them.
 */

/** Muscles no row of a pattern may credit in ANY role — "a press tagged with a pull muscle". */
export const IMPLAUSIBLE_ANY_ROLE: Readonly<Record<string, readonly string[]>> = {
  'Horizontal Push': ['lats', 'upper_back', 'biceps', 'rear_deltoids', 'quadriceps', 'hamstrings', 'glutes', 'calves'],
  // Thrusters are filed here and squat on the way up, so the legs are allowed; a pull muscle never is.
  'Vertical Push': ['lats', 'upper_back', 'biceps', 'rear_deltoids', 'hamstrings', 'calves'],
  'Elbow Extension': ['lats', 'upper_back', 'biceps', 'rear_deltoids', 'quadriceps', 'hamstrings', 'glutes', 'calves'],
  'Horizontal Pull': ['chest', 'triceps', 'front_deltoids', 'quadriceps', 'hamstrings', 'glutes', 'calves'],
  // A pullover and a straight-arm pulldown really do use the chest and the long head of the triceps (QA F11).
  'Vertical Pull': ['front_deltoids', 'quadriceps', 'hamstrings', 'glutes', 'calves'],
  'Elbow Flexion': ['chest', 'triceps', 'front_deltoids', 'quadriceps', 'hamstrings', 'glutes', 'calves'],
  'Shoulder Isolation': ['chest', 'triceps', 'quadriceps', 'hamstrings', 'glutes', 'calves'],
  'Squat / Knee Dominant': ['lats', 'upper_back', 'biceps', 'rear_deltoids', 'chest'],
  'Hinge / Hip Dominant': ['chest', 'triceps', 'front_deltoids', 'lats', 'biceps', 'rear_deltoids'],
  'Hip Isolation': ['chest', 'triceps', 'front_deltoids', 'lats', 'upper_back', 'biceps', 'rear_deltoids'],
};

/** A movement family that must credit these muscles, in some role — "a deadlift that never names the hamstrings". */
export interface RequiredCredit {
  pattern: string;
  /** Matched against the catalogue's `family` (or the name, when a row has no family). */
  family: RegExp;
  unless?: RegExp;
  muscles: readonly string[];
  why: string;
}

export const REQUIRED_CREDIT: readonly RequiredCredit[] = [
  {
    pattern: 'Hinge / Hip Dominant',
    family: /deadlift|good morning|swing|pull-through|block pull|rack pull/i,
    unless: /hamstring curl|nordic|leg curl|bridge|thrust/i,
    muscles: ['hamstrings'],
    why: 'a hip hinge loads the hamstrings through their length',
  },
  {
    pattern: 'Horizontal Push',
    family: /press|push-up/i,
    muscles: ['triceps', 'front_deltoids'],
    why: 'a press extends the elbow and flexes the shoulder',
  },
  {
    pattern: 'Vertical Push',
    family: /press|jerk/i,
    muscles: ['triceps'],
    why: 'an overhead press locks out with the triceps',
  },
  {
    pattern: 'Vertical Pull',
    family: /pull-up|chin-up|pulldown/i,
    unless: /straight-arm/i,
    muscles: ['biceps'],
    why: 'a bent-arm vertical pull flexes the elbow',
  },
  {
    pattern: 'Horizontal Pull',
    family: /row/i,
    muscles: ['biceps'],
    why: 'a row flexes the elbow',
  },
];

/** A single-joint movement credits nothing across a joint it does not move — "a fly that trains the triceps". */
export const FORBIDDEN_CREDIT: readonly { pattern: string; family: RegExp; muscles: readonly string[]; why: string }[] = [
  {
    pattern: 'Horizontal Push',
    family: /\bfly\b|crossover|pec deck/i,
    muscles: ['triceps'],
    why: 'a fly holds the elbow still, so it never trains the triceps',
  },
];

/** A movement family whose primary mover — and, where it says, pattern — is fixed (PO 2026-11-17). */
export const FAMILY_PRIMARY: readonly { family: RegExp; pattern?: string; primary: readonly string[]; why: string }[] = [
  {
    family: /romanian deadlift|stiff-leg deadlift|good morning/i,
    primary: ['hamstrings'],
    why: 'a straight-leg hinge is a hamstring lift first',
  },
  {
    family: /pike push-up|handstand push-up/i,
    pattern: 'Vertical Push',
    primary: ['front_deltoids'],
    why: 'a head-down push-up presses overhead',
  },
];

/** Patterns whose every row names this muscle as a PRIMARY mover — a horizontal push is chest work. */
export const PRIMARY_REQUIRED: Readonly<Record<string, readonly string[]>> = {
  'Horizontal Push': ['chest'],
};

/**
 * Everything wrong with one row's muscle tags, as sentences — empty when it is coherent.
 *
 * ⚠ READ BY THE CATALOGUE TEST, NOT BY THE BUILDER. The builder still trusts the data (and `isCoherent`
 * still keeps a misfiled PRIMARY out of a slot); this is the check that stops a wrong tag reaching the data.
 */
export function catalogueTagProblems(ex: {
  key: string;
  name: string;
  family?: string;
  pattern: string;
  modality?: string;
  primaryMuscleIds: readonly string[];
  muscleIds: readonly string[];
}): string[] {
  if (ex.modality === 'Mobility' || ex.pattern === 'Mobility') return [];
  const out: string[] = [];
  const family = ex.family || ex.name;
  for (const m of IMPLAUSIBLE_ANY_ROLE[ex.pattern] ?? []) {
    if (ex.muscleIds.includes(m)) out.push(`${ex.key}: a ${ex.pattern} row credits ${m}`);
  }
  for (const r of REQUIRED_CREDIT) {
    if (r.pattern !== ex.pattern || !r.family.test(family) || r.unless?.test(family)) continue;
    for (const m of r.muscles) {
      if (!ex.muscleIds.includes(m)) out.push(`${ex.key}: ${r.why} — it does not credit ${m}`);
    }
  }
  for (const r of FORBIDDEN_CREDIT) {
    if (r.pattern !== ex.pattern || !r.family.test(family)) continue;
    for (const m of r.muscles) {
      if (ex.muscleIds.includes(m)) out.push(`${ex.key}: ${r.why} — it credits ${m}`);
    }
  }
  for (const r of FAMILY_PRIMARY) {
    if (!r.family.test(family)) continue;
    if (r.pattern && ex.pattern !== r.pattern) out.push(`${ex.key}: ${r.why} — it is filed under ${ex.pattern}`);
    for (const m of r.primary) {
      if (!ex.primaryMuscleIds.includes(m)) out.push(`${ex.key}: ${r.why} — ${m} is not its primary mover`);
    }
  }
  for (const m of PRIMARY_REQUIRED[ex.pattern] ?? []) {
    if (!ex.primaryMuscleIds.includes(m)) out.push(`${ex.key}: a ${ex.pattern} row must train ${m} first — its primary is ${ex.primaryMuscleIds.join(', ')}`);
  }
  return out;
}
