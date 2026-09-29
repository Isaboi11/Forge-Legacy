/**
 * The Usage page's note — the one line under the title (Forge CRM.dc.html, `pageData('usage').note`).
 *
 * Pure and dependency-free so `node --test` can load it directly. Facts only: it says what the numbers
 * are, never why. "Active" here is the page's first definition — SAVED A WORKOUT in the window — because
 * that is the figure the sentence sits over.
 */

export interface UsageNoteInput {
  /** "30 days" / "year" — RANGE_INFO[range].label. */
  windowLabel: string;
  /** "prior 30 days" — RANGE_INFO[range].prior. */
  priorLabel: string;
  active: number;
  activePrev: number;
  signups: number;
  /** New signups in the window who have saved a first workout. */
  firstWorkouts: number;
  workouts: number;
  /** Ever — the empty test is "nothing has EVER been saved", not "a quiet week". */
  workoutsAllTime: number;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const inLast = (w: string) => (w === 'year' ? 'in the last year' : `in the last ${w}`);

export function usageNote(i: UsageNoteInput): string {
  if (i.workoutsAllTime <= 0) return 'Nothing to report yet. This starts filling in once athletes save their first workouts.';

  let first: string;
  if (i.active <= 0) {
    first = `Nobody saved a workout ${inLast(i.windowLabel)}.`;
  } else {
    const who = `${fmt(i.active)} ${plural(i.active, 'athlete', 'athletes')} saved ${fmt(i.workouts)} ${plural(i.workouts, 'workout', 'workouts')} ${inLast(i.windowLabel)}`;
    if (i.activePrev > 0) {
      const pct = Math.round(((i.active - i.activePrev) / i.activePrev) * 100);
      first =
        pct === 0
          ? `${who}, the same number of athletes as the ${i.priorLabel}.`
          : `${who}, ${Math.abs(pct)}% ${pct > 0 ? 'more' : 'fewer'} athletes than the ${i.priorLabel}.`;
    } else {
      first = `${who}.`;
    }
  }

  const second =
    i.signups > 0
      ? `${fmt(i.firstWorkouts)} of ${fmt(i.signups)} new ${plural(i.signups, 'signup has', 'signups have')} logged a first workout.`
      : `No new signups ${inLast(i.windowLabel)}.`;

  return `${first} ${second}`;
}
