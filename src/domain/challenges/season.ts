/**
 * The season clock — how far into a competition we are, and what the screen should say about it.
 *
 * Pure, and extracted out of `app/challenge/[id].tsx` on 2026-08-19 because the arithmetic that lived
 * inline there was wrong in three ways at once and none of them could be tested where it sat.
 *
 * ══ WHAT WAS WRONG, AND WHY IT SURVIVED ══
 *
 * The C-3 hero draws a season timeline. `Forge Challenge.dc.html` draws it as a row of WEEK segments,
 * and the screen was built to that literally. It is correct for the durations the design was drawn
 * against — the 4-week and 8-week presets — and it is wrong for everything shorter, because Create
 * Challenge accepts a custom run of as few as **three days**:
 *
 *   `Yiiiiiiip`, a 3-day duel, Aug 17 → Aug 20. `ceil(3 / 7)` is ONE segment, filled by
 *   `elapsed / 7 days`. The bar could never pass 43% however far the season ran, and the caption read
 *   **"Week 1 of 1"** from the first hour to the last. On its final day the screen showed a
 *   barely-moved sliver and a line that had not changed since the competition was created.
 *
 * PO, 2026-08-19: *"it doesn't look like the days have progressed."* It hadn't. The season was fine —
 * `state = ACTIVE`, dates exactly as created — and the picture of it was the defect.
 *
 * And underneath that, a branch that had never once run: "final day" was tested as
 * `ceil((end - now) / DAY) === 0`, which is true only in the instant the season expires — by which point
 * the state flips to COMPLETED and this line is not drawn at all. So every competition's last day said
 * "1 days remaining", plural included.
 *
 * ══ THE RULE ══
 *
 * A short season is measured in days, so it is drawn in days: one segment per day, and the current one
 * creeps across as the day does. Fourteen is the cutoff because it is the longest run that stays legible
 * as segments on a phone — a 56-day "Season" preset would be 56 hairlines.
 *
 * ⚠ `now` IS A PARAMETER, NOT `Date.now()`. The caller pins it once at mount: the maths must not shift
 *   between re-renders, and `Date.now()` in a render body is impure (react-compiler errors on it).
 */

const DAY = 24 * 60 * 60 * 1000;

/** The longest run still drawn as one segment per day. Beyond this the segments become weeks. */
export const DAY_SEGMENT_MAX = 14;

export type SeasonState = 'DRAFT' | 'ENROLLMENT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | 'CANCELLED' | string;

export interface SeasonClock {
  /** Whole days from start to end. At least 1, even for a malformed window. */
  totalDays: number;
  /** True when the timeline is segmented per day rather than per week. */
  byDay: boolean;
  /** How many segments the timeline draws. */
  totalUnits: number;
  /** Which segment is in progress, 1-based. */
  currentUnit: number;
  /** How far through the current segment, 0–1. */
  unitFill: number;
  /** Which day of the run we are on, 1-based and clamped to `totalDays`. */
  dayIndex: number;
  /** Whole days AFTER today. 0 on the final day. */
  daysRemaining: number;
  finalDay: boolean;
  /** Still ENROLLMENT although the start time has passed — the lifecycle has not been advanced yet. */
  overdueStart: boolean;
  /** Still ACTIVE although the end time has passed — same. */
  overdueEnd: boolean;
  /** The one line under the timeline. */
  label: string;
}

export function seasonClock(startAt: string, endAt: string, state: SeasonState, now: number): SeasonClock {
  const startRaw = new Date(startAt).getTime();
  const endRaw = new Date(endAt).getTime();

  // A window we cannot read must not produce NaN segments or a `Array.from({length: NaN})`. One day,
  // ending now, is the honest degenerate answer — it renders as a finished single segment.
  const ok = Number.isFinite(startRaw) && Number.isFinite(endRaw) && endRaw > startRaw;
  const start = ok ? startRaw : now;
  const end = ok ? endRaw : now;

  const totalDays = Math.max(1, Math.round((end - start) / DAY));
  const span = Math.max(1, end - start);
  const elapsed = Math.max(0, Math.min(span, now - start));

  const byDay = totalDays <= DAY_SEGMENT_MAX;
  const unitMs = byDay ? DAY : 7 * DAY;
  const totalUnits = Math.max(1, byDay ? totalDays : Math.ceil(totalDays / 7));
  const elapsedUnits = elapsed / unitMs;
  const currentUnit = Math.min(totalUnits, Math.floor(elapsedUnits) + 1);
  const unitFill = Math.max(0, Math.min(1, elapsedUnits - Math.floor(elapsedUnits)));

  const dayIndex = Math.min(totalDays, Math.floor(elapsed / DAY) + 1);
  const daysRemaining = Math.max(0, totalDays - dayIndex);
  const finalDay = dayIndex >= totalDays;

  const overdueStart = state === 'ENROLLMENT' && start <= now;
  const overdueEnd = state === 'ACTIVE' && end <= now;

  const startsIn = Math.max(0, Math.ceil((start - now) / DAY));
  const remaining = finalDay ? 'final day' : `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`;

  /*
   * The overdue states are named rather than papered over. The lifecycle has no scheduler — it advances
   * when a screen calls `advance_challenges()` — so there is a real window where the dates have passed
   * and `state` has not caught up, and the old line described that window as though nothing were wrong:
   * an ENROLLMENT whose start was days ago read "Starts in 0 days" indefinitely. Seeing either of these
   * should now be brief, because C-3 advances on the way in; if one persists, the advance FAILED, and
   * the screen says so separately.
   */
  const label = overdueStart
    ? `Starting now · ${totalDays} day run`
    : overdueEnd
      ? 'The season is over — settling the final standings'
      : state === 'ENROLLMENT' || state === 'DRAFT'
        ? `Starts in ${startsIn} ${startsIn === 1 ? 'day' : 'days'} · ${totalDays} day run`
        : state === 'COMPLETED' || state === 'ARCHIVED'
          ? `Season complete · ${totalDays} days`
          : `${byDay ? 'Day' : 'Week'} ${currentUnit} of ${totalUnits} • ${remaining}`;

  return { totalDays, byDay, totalUnits, currentUnit, unitFill, dayIndex, daysRemaining, finalDay, overdueStart, overdueEnd, label };
}
