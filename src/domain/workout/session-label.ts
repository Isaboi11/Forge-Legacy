/**
 * What a day of training is CALLED, derived from what is in it — "Chest & Back", "Legs", "Full Body".
 *
 * ══ WHY THIS IS ITS OWN MODULE ══
 *
 * The rule already existed, as `inferLabel` inside `program-builder.tsx`, where it names a day row in
 * the builder ("Chest & Arms · 6 exercises"). It is now also the answer to a second question — what a
 * finished session is saved as when the athlete never named it (see `sessionWorkoutName`) — and a rule
 * that answers two questions from two copies is the shape of thing this repo has watched drift before.
 * One copy, imported by both.
 *
 * ⚠ PURE, AND RELATIVE `.ts` IMPORTS ONLY. `save-core.ts` is loaded by `node --test`, which cannot
 * resolve the `@/` alias at runtime.
 */

/**
 * Muscle display name → coarse group. Keyed off `PickerItem.muscles`, which is display names.
 *
 * ══ EVERY KEY HERE MUST BE A NAME FROM `muscles.json`, AND NINE OF THEM WERE NOT ══
 *
 * PO: *a treadmill walk, two chest presses, a row and a fifth lift — saved as **"Chest"**.*
 *
 * The rule was never wrong; the vocabulary was. `buildPickerDb` builds `muscles` as
 * `muscleById.get(id).name` — the raw `muscles.json` display name, unshortened — so what actually
 * arrives here is `Latissimus Dorsi`, `Quadriceps`, `Upper Back`, `Rectus Abdominis`. The old map was
 * keyed on gym shorthand nobody produces: `Lats`, `Quads`, `Abs`, `Back`, `Shoulders`, `Side Delts`,
 * `Rear Delts`, `Upper Chest`, `Core`. Nine of fifteen keys matched nothing at all, and the six that
 * happened to line up were Chest, Biceps, Triceps, Forearms, Glutes and Hamstrings.
 *
 * The damage: **521 of 809 exercises (64%) could not contribute to a name.** Every quad movement
 * (111), every ab movement (65), every upper-back movement (53), every lat (32) and every deltoid
 * (59) was invisible. A leg day named itself after whatever glute or hamstring accessory it happened
 * to contain; a back day named itself after the curls. The PO's session was called "Chest" because
 * the row's primary is `Upper Back`, which this table could not see, so only the two presses counted.
 *
 * ⚠ THE OLD UNIT TESTS PASSED THROUGHOUT. They asserted `groupLabel([['Quads']]) === 'Legs'` — the
 *   fixture spoke the same invented dialect as the map, so the two agreed with each other and neither
 *   was ever checked against the catalogue. `session-label.test.mjs` now reads `muscles.json` and
 *   `exercise_muscles.json` directly and fails if any real primary muscle is unmapped. That test, not
 *   this comment, is what stops this returning.
 *
 * ⚠ SYSTEM DESCRIPTORS ARE DELIBERATELY ABSENT. `muscles.json` marks `Full Body`,
 *   `Cardiovascular System`, `Grip`, `Mobility` and `Balance / Stability` as `region: 'System'`, and
 *   `exercise_schema.ts` calls them "descriptors, not anatomical muscles". They are not body parts and
 *   cannot name a body part — cardio and mobility are answered by {@link sessionLabel} instead.
 */
export const MUSCLE_GROUP: Record<string, string> = {
  // ── Upper body ──────────────────────────────────────────────────────────
  Chest: 'Chest',
  'Upper Back': 'Back', 'Latissimus Dorsi': 'Back', Trapezius: 'Back',
  /* Neck sits with the shrug-and-delt work it is trained beside; there is no "Neck" group and three
     exercises do not earn one. */
  'Front Deltoids': 'Shoulders', 'Lateral Deltoids': 'Shoulders', 'Rear Deltoids': 'Shoulders',
  'Rotator Cuff': 'Shoulders', Neck: 'Shoulders',
  Biceps: 'Arms', Triceps: 'Arms', Forearms: 'Arms',
  // ── Core ────────────────────────────────────────────────────────────────
  /* Erector Spinae is `region: 'Core'` in the taxonomy and is followed here rather than filed under
     Back, so that a hyperextension does not turn an ab session into "Back & Core". */
  'Rectus Abdominis': 'Core', Obliques: 'Core', 'Transverse Abdominis': 'Core',
  'Erector Spinae': 'Core', 'Hip Flexors': 'Core',
  // ── Lower body ──────────────────────────────────────────────────────────
  Quadriceps: 'Legs', Hamstrings: 'Legs', Glutes: 'Legs',
  Adductors: 'Legs', Abductors: 'Legs', Calves: 'Legs', 'Tibialis Anterior': 'Legs',
};

/**
 * The label for a set of exercises, given each one's muscle display names.
 *
 * One group is that group. Two is "A & B", most-worked first. Three or more is `Full Body` — deliberately
 * not "Chest, Back & Legs", which is a list rather than a name and does not fit anywhere it is shown.
 *
 * ⚠ RANKED BY HOW OFTEN A GROUP APPEARS, not by the order the exercises sit in. A session that opens
 * with one curl and then does five back movements is a back session, and naming it "Arms & Back" because
 * the curl came first would describe the warm-up.
 *
 * ⚠ ONLY A GROUP SOMETHING WAS PRIMARILY TRAINING CAN NAME THE DAY, AND THAT IS THE LOAD-BEARING RULE.
 * `muscles` is primary-first and lists assistance work too, so ONE bench press touches Chest, Triceps
 * and Shoulders — three groups. Counting every entry alike therefore called a single bench press
 * **"Full Body"**, and weighting the primary without gating on it called it "Chest & Arms". Neither is a
 * name a person would give it. A group qualifies by being the PRIMARY of at least one exercise; the
 * secondaries then only order the groups that qualified. You name a session after what you trained, not
 * after everything that got worked on the way.
 *
 * Returns `''` when nothing maps — a session of movements the catalogue has no muscles for. The caller
 * decides what to do with that; inventing a name here would be worse than admitting there isn't one.
 */
const PRIMARY_WEIGHT = 4;

export function groupLabel(muscleLists: readonly (readonly string[] | undefined)[]): string {
  const count = new Map<string, number>();
  /** Groups that were the point of at least one exercise, rather than along for the ride. */
  const primary = new Set<string>();
  for (const list of muscleLists) {
    (list ?? []).forEach((m, i) => {
      const g = MUSCLE_GROUP[m];
      if (!g) return;
      count.set(g, (count.get(g) ?? 0) + (i === 0 ? PRIMARY_WEIGHT : 1));
      if (i === 0) primary.add(g);
    });
  }
  /* ⚠ TIES BROKEN BY NAME, NOT BY INSERTION ORDER. `Map` iterates in insertion order, so without this a
     session with equal counts would be named by whichever exercise happened to be logged first — and the
     same session, logged in a different order, would save under a different name. */
  const groups = [...count.entries()]
    .filter(([g]) => primary.has(g))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([g]) => g);
  if (groups.length === 0) return '';
  if (groups.length === 1) return groups[0];
  if (groups.length === 2) return `${groups[0]} & ${groups[1]}`;
  return 'Full Body';
}

/** The primary-muscle descriptor a stretching movement carries — `region: 'System'`, not a body part. */
const MOBILITY_MUSCLE = 'Mobility';

/**
 * The whole name for a finished session — the lifting, plus the modality it was mixed with.
 *
 * ══ THE CARDIO USED TO VANISH ══
 *
 * PO: *"Someone did a treadmill first and then other workouts and it named it this."*
 *
 * `sessionWorkoutName` splits the session and names it after `strength` alone, which is right — you do
 * not call a chest day "Treadmill Walk" because the walk came first. But the walk then disappeared
 * from the name entirely, so twenty minutes of work the athlete actually did left no trace in what the
 * session was called. A session that was both says both.
 *
 * `Chest & Back + Cardio` rather than treating Cardio as a third group, because a third group triggers
 * `Full Body` — and a chest-and-back day with a warm-up walk on it is not a full-body day. Cardio is a
 * different axis from which muscles were trained, so it is appended rather than counted.
 *
 * Mobility is answered here for the same reason: 48 movements carry `Mobility` as their primary and no
 * anatomical muscle at all, so a stretching session produced `''` and fell back to the literal
 * "Freestyle Workout". It only claims the name when nothing anatomical outranks it — one hip-opener at
 * the end of a squat session must not rename it.
 *
 * Returns `''` when there is nothing honest to say, exactly as {@link groupLabel} does. The caller
 * decides what to do with that.
 */
export function sessionLabel(
  muscleLists: readonly (readonly string[] | undefined)[],
  opts: { cardio?: boolean } = {},
): string {
  const label = groupLabel(muscleLists);
  if (label) return opts.cardio ? `${label} + Cardio` : label;

  /* Nothing anatomical was trained. A session of stretches is a Mobility session and should say so
     rather than falling through to the launch-path literal. */
  const mobility = muscleLists.some((list) => (list ?? [])[0] === MOBILITY_MUSCLE);
  if (mobility) return opts.cardio ? 'Mobility + Cardio' : 'Mobility';

  return opts.cardio ? 'Cardio' : '';
}
