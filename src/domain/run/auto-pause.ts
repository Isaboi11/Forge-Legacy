import { haversineMi, type TrackPoint } from './run-core.ts';

/**
 * Auto-pause — stop the clock at the traffic light, start it again when they run.
 *
 * ══ THE GAP THIS CLOSES ══
 *
 * Strava has auto-paused since forever and we pause only when the athlete presses a button. Forget to
 * press it and the pace for the whole session is wrong — which is worse than it sounds, because pace is
 * the number a runner actually judges the run by.
 *
 * ══ ⚠ THE FAILURE MODE THIS IS DESIGNED AGAINST ══
 *
 * **A false pause, not a missed one.** A runner stopped at a light and un-paused a few seconds late loses
 * a few seconds. A runner paused mid-stride loses their belief in the number. So every threshold here is
 * conservative, and the two directions are deliberately asymmetric: it takes a sustained near-stop to
 * pause and only unambiguous movement to resume.
 *
 * The cost of a false pause is bounded by that asymmetry — `AUTO_RESUME_METERS` is covered in about four
 * seconds at running pace, so the worst case is a few seconds of clock, recovered automatically.
 *
 * ══ ⚠ WHY THERE ARE TWO MECHANISMS AND NOT ONE ══
 *
 * `useRunTracker.onFix` drops every fix while paused — *"paused: the ground still moves, the run does
 * not"* — so **the track is frozen for as long as the pause lasts.** Pausing can therefore be read off the
 * track; resuming cannot, because the track stops being evidence the moment it matters. Resume runs off
 * the raw fix stream instead, against an anchor taken where the pause began.
 */

// ── pausing: read off the track ──────────────────────────────────────────────

/** The trailing wall-clock window the near-stop must hold across. */
export const AUTO_PAUSE_WINDOW_SEC = 10;

/**
 * Below this and the athlete is not travelling. A slow walk is ~2 mph and a shuffle ~1.2, so this sits
 * well under anything a person does on purpose — it is the speed of standing still with GPS noise on top.
 */
export const AUTO_PAUSE_BELOW_MPH = 0.8;

/**
 * No auto-pause in the opening seconds. The athlete presses Start while still standing — reading the
 * screen, finding a podcast, waiting for a light to change — and pausing them before the run has begun
 * would make the feature's first impression a bug.
 */
export const AUTO_PAUSE_GRACE_SEC = 25;

/** Nor before they have gone anywhere. A session that has covered nothing has nothing to pause. */
export const AUTO_PAUSE_MIN_MI = 0.01;

/**
 * Miles gained inside the trailing window, expressed as mph.
 *
 * ⚠ MEASURED AGAINST THE WALL CLOCK, NOT AGAINST THE LAST FIX. That distinction is the whole function.
 * When an athlete stops, `acceptFix` starts rejecting their jitter as drift and **the track stops
 * growing** — so a speed derived from `last.at` would divide a tiny distance by a tiny elapsed and could
 * report any value at all. Dividing by the window instead means a stale track reads as what it is: zero.
 *
 * This is why `currentPaceSec` cannot be reused here. It returns `null` below a distance floor, and null
 * there means both "standing still" and "not enough data yet" — the two states this must tell apart.
 */
export function windowSpeedMph(track: TrackPoint[], nowMs: number, windowSec = AUTO_PAUSE_WINDOW_SEC): number {
  const last = track[track.length - 1];
  if (!last || windowSec <= 0) return 0;
  const cutoff = nowMs - windowSec * 1000;
  /* The whole track predates the window: nothing has been recorded in it, which is a stop. */
  if (last.at <= cutoff) return 0;
  /* The newest point at or before the cutoff is the baseline, so the window is measured end to end
     rather than between whichever fixes happened to land inside it. `currentPaceSec` walks back the
     same way, for the same reason. */
  let base = track[0];
  for (let i = track.length - 1; i >= 0; i--) {
    base = track[i];
    if (track[i].at <= cutoff) break;
  }
  const mi = Math.max(0, last.mi - base.mi);
  return (mi * 3600) / windowSec;
}

/**
 * Has the athlete stopped?
 *
 * ⚠ `receivingFixes` IS NOT OPTIONAL AND IT IS NOT A DETAIL. A frozen track has two causes that look
 * identical from here: the athlete is standing still, or the device has stopped delivering fixes at all
 * (a tunnel, a revoked permission, an OS throttle). Only the first is a pause. The hook knows which,
 * because `onFix` sets `accuracyM` on every delivery whether or not the fix is used — so the answer is
 * passed in rather than guessed at. Silence is never read as stillness.
 */
export function shouldAutoPause(o: {
  track: TrackPoint[];
  nowMs: number;
  elapsedSec: number;
  receivingFixes: boolean;
}): boolean {
  if (!o.receivingFixes) return false;
  if (o.elapsedSec < AUTO_PAUSE_GRACE_SEC) return false;
  const last = o.track[o.track.length - 1];
  if (!last || last.mi < AUTO_PAUSE_MIN_MI) return false;
  return windowSpeedMph(o.track, o.nowMs) < AUTO_PAUSE_BELOW_MPH;
}

// ── resuming: read off the raw fix stream ────────────────────────────────────

/**
 * How far from the pause anchor counts as having left. GPS wander while stationary is a few metres; this
 * is several times that, and about four seconds of running.
 */
export const AUTO_RESUME_METERS = 15;

/** Consecutive far fixes required. One is a jitter spike; two in a row is a person walking away. */
export const AUTO_RESUME_FIXES = 2;

/**
 * Fixes sloppier than this are ignored for the resume decision — not counted, and not held against the
 * run either. Stricter than `ACCURACY_FLOOR_M` (65 m) on purpose: a 60 m-accurate fix can sit 60 m from
 * an anchor without anybody moving, which is exactly the false resume this avoids.
 */
export const AUTO_RESUME_ACCURACY_M = 30;

const METERS_PER_MI = 1609.344;

/** Where the athlete was when auto-pause engaged, plus how many far fixes have arrived since. */
export interface AutoResumeProbe {
  lat: number;
  lon: number;
  /** Consecutive fixes seen beyond `AUTO_RESUME_METERS`. */
  away: number;
}

/** Start watching for movement away from here. */
export function probeAt(lat: number, lon: number): AutoResumeProbe {
  return { lat, lon, away: 0 };
}

/**
 * Fold one raw fix into the resume decision.
 *
 * Returns the next probe and whether the run should start again. A `null` probe means no auto-pause is in
 * effect — a MANUAL pause never auto-resumes, because an athlete who pressed Pause meant it, and taking
 * that decision back for them is the one thing more annoying than not having the feature.
 */
export function autoResumeStep(
  probe: AutoResumeProbe | null,
  fix: { lat: number; lon: number; accuracy?: number | null },
): { probe: AutoResumeProbe | null; resume: boolean } {
  if (!probe) return { probe, resume: false };

  /* Too sloppy to mean anything. Left untouched rather than reset: a single bad fix in the middle of a
     genuine departure must not put the count back to zero and hold the athlete paused while they run. */
  if (fix.accuracy != null && fix.accuracy > AUTO_RESUME_ACCURACY_M) return { probe, resume: false };

  const meters = haversineMi(probe, fix) * METERS_PER_MI;
  if (meters < AUTO_RESUME_METERS) return { probe: { ...probe, away: 0 }, resume: false };

  const away = probe.away + 1;
  if (away >= AUTO_RESUME_FIXES) return { probe: null, resume: true };
  return { probe: { ...probe, away }, resume: false };
}
