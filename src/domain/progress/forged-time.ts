/**
 * Time forged, printed the way a person would say it (QA 09-26 home-15).
 *
 * Progress Hub showed "0 HOURS FORGED" after a 16-minute workout: the total was rounded to whole hours
 * before anything looked at it, so the first hour of anyone's training read as nothing. Under an hour it
 * is minutes; from an hour on it is whole hours (the stat is a lifetime tally, not a stopwatch).
 *
 * Pure and dependency-free — runtime imports in `domain/**` stay relative.
 */

export interface ForgedTime {
  /** The number to print, e.g. "16" or "12". */
  value: string;
  /** Its unit, for the label: "Minutes" / "Hours" (a "1 Minute" / "1 Hour" singular is kept too). */
  unit: 'Minute' | 'Minutes' | 'Hour' | 'Hours';
}

export function forgedTime(minutes: number): ForgedTime {
  const m = Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
  if (m < 59.5) {
    const n = Math.round(m);
    return { value: String(n), unit: n === 1 ? 'Minute' : 'Minutes' };
  }
  const h = Math.round(m / 60);
  return { value: h.toLocaleString('en-US'), unit: h === 1 ? 'Hour' : 'Hours' };
}
