/**
 * Display formatting for a PersonalRecord's measure — the ONE place a record becomes a string, so
 * feed card and Post Detail (and any future surface) render it identically and a backend swap stays
 * a data change. The measure is the canonical form; this derives the display.
 */
import type { RecordMeasure } from './schema'

/** Seconds → "mm:ss", or "h:mm:ss" once the effort exceeds an hour (long rows/rucks/rides). */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}

/** The record's display value — e.g. "315 lb", "405 lb × 3", "19:48", "18.2 mi", "20 reps". */
export function formatRecordValue(m: RecordMeasure): string {
  switch (m.kind) {
    case 'load':
      return m.reps != null ? `${m.value} ${m.unit} × ${m.reps}` : `${m.value} ${m.unit}`
    case 'time':
      return formatDuration(m.seconds)
    case 'distance':
      return `${m.value} ${m.unit}`
    case 'reps':
      return `${m.reps} reps`
  }
}
