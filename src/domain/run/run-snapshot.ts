import type { TrackPoint } from './run-core.ts';

/**
 * ══ A BOUT UNDER WAY SURVIVES A RELOAD (workout-13, QA 09-26) ══
 *
 * *"An Outdoor Walk in progress is lost on reload."* The treadmill clock never had this problem — it has
 * lived on disk since `useWallClockTimer` — but an outdoor bout is `useRunTracker`'s phase machine, which
 * held everything in memory. Reload the web app mid-walk, or have the OS reclaim it, and the clock, the
 * route and the miles were simply gone; the card offered Start again.
 *
 * So the tracker writes one of these on every change of state and every few seconds while it runs, and
 * reads it back when the card mounts. Pure, so the arithmetic is provable without a device.
 *
 * ⚠ A LIVE BOUT KEEPS COUNTING THROUGH THE GAP. The athlete did not stop walking because the page
 * reloaded; the time between the last write and the read is time they were out there, exactly as the
 * treadmill clock measures `now − startedAt`. A PAUSED bout does not — paused is paused.
 *
 * ⚠ NO DISTANCE IS INVENTED FOR THE GAP. The track resumes where it was written; whatever the OS buffered
 * meanwhile (native, background permission) is folded in by the tracker through the one accept rule, and
 * on the web the stretch walked during a reload is simply not measured. A straight line would be a guess.
 */
export interface RunSnapshot {
  v: 1;
  phase: 'live' | 'paused';
  /** Moving seconds at the moment of writing. */
  elapsedSec: number;
  /** Epoch ms of the write. */
  savedAt: number;
  track: TrackPoint[];
}

export function runSnapshot(phase: 'live' | 'paused', elapsedSec: number, track: readonly TrackPoint[], now: number): RunSnapshot {
  return { v: 1, phase, elapsedSec: Math.max(0, elapsedSec), savedAt: now, track: [...track] };
}

/** What to resume from, or null for anything unreadable — a fresh card is better than a restored lie. */
export function restoreRun(raw: string | null | undefined, now: number): { phase: 'live' | 'paused'; elapsedSec: number; track: TrackPoint[] } | null {
  if (!raw) return null;
  let s: Partial<RunSnapshot>;
  try {
    s = JSON.parse(raw) as Partial<RunSnapshot>;
  } catch {
    return null;
  }
  if (!s || s.v !== 1 || (s.phase !== 'live' && s.phase !== 'paused')) return null;
  const elapsed = Number(s.elapsedSec);
  const savedAt = Number(s.savedAt);
  if (!Number.isFinite(elapsed) || elapsed < 0 || !Number.isFinite(savedAt)) return null;
  const track = Array.isArray(s.track)
    ? s.track.filter((p): p is TrackPoint => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Number.isFinite(p.mi))
    : [];
  // A clock that went backwards (a device time change) adds nothing rather than subtracting.
  const gap = s.phase === 'live' ? Math.max(0, (now - savedAt) / 1000) : 0;
  return { phase: s.phase, elapsedSec: elapsed + gap, track };
}
