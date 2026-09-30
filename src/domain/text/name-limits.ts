// ONE length cap per KIND of name (QA 09-26 library-23 / programs-28 / visualA-28).
// The builders cut names silently at 30, 40 or 60 characters depending on which door you came through: a
// program day's "Workout name" stopped at 30 while the very same "Workout name" in the template builder ran
// to 60, and a day turned into a template (or back) could not be typed the same way twice. The numbers
// below are the ones the rest of the app already stored against — nothing in the database caps these.

/** A program, or a saved week — the Program Builder, the guided builder, a week's own name. */
export const PROGRAM_NAME_MAX = 40;

/** A workout: a template, a program day, a logged session (`workout-complete-live`'s cap is the same 60). */
export const WORKOUT_NAME_MAX = 60;

/** How close to the cap before the field shows its count — so the cut is never silent, and never nagging. */
export const NAME_COUNT_WINDOW = 10;

/** Show the "37/40" counter? Only once the name is within `NAME_COUNT_WINDOW` of its cap. */
export function nameNearLimit(length: number, max: number): boolean {
  return length >= max - NAME_COUNT_WINDOW;
}
