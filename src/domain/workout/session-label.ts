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

/** Muscle display name → coarse group. Keyed off `PickerItem.muscles`, which is display names. */
export const MUSCLE_GROUP: Record<string, string> = {
  Chest: 'Chest', 'Upper Chest': 'Chest',
  Back: 'Back', Lats: 'Back',
  Shoulders: 'Shoulders', 'Side Delts': 'Shoulders', 'Rear Delts': 'Shoulders',
  Biceps: 'Arms', Triceps: 'Arms', Forearms: 'Arms',
  Quads: 'Legs', Glutes: 'Legs', Hamstrings: 'Legs',
  Abs: 'Core', Core: 'Core',
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
