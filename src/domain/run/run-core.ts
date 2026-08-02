/**
 * Active Run — the pure part. No React, no expo-location, no Supabase, so `node --test` can load it.
 *
 * Everything the design SIMULATED lives here for real. Its `tick` added `1/480` of a mile per second —
 * exactly 8:00/mi — and derived the live pace from `480 + 24·sin(elapsed/5)`. That is a screen that looks
 * right and measures nothing. These are the functions that turn a stream of GPS fixes into the same
 * numbers, and the awkward parts of doing that honestly are all in here.
 */

export type ActivityKind = 'run' | 'walk' | 'bike';
export type UnitSystem = 'imperial' | 'metric';

export interface Fix {
  lat: number;
  lon: number;
  /** Metres of horizontal uncertainty the device reports. Null when it won't say. */
  accuracy: number | null;
  /** Milliseconds. */
  at: number;
}

export interface TrackPoint {
  lat: number;
  lon: number;
  at: number;
  /** Cumulative miles at this point — carried so the route and the readout can never disagree. */
  mi: number;
}

// ── geometry ────────────────────────────────────────────────────────────────

const EARTH_MI = 3958.7613;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in miles. Haversine — accurate enough at these scales and cheap enough per fix. */
export function haversineMi(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_MI * Math.asin(Math.min(1, Math.sqrt(s)));
}

// ── accepting a fix ─────────────────────────────────────────────────────────

/**
 * Worse than this and the fix is noise, not a position.
 *
 * This was 25 m, and that was WRONG in practice. A phone with a clear sky reports 5–20 m, but a browser
 * geolocating from wi-fi routinely reports 30–80 m — so on the web preview, and on a phone indoors or
 * among buildings, EVERY fix was rejected and the distance sat at 0.00 while the athlete walked. Silently:
 * a rejected fix looks exactly like standing still.
 *
 * 65 m keeps genuinely useless fixes out while letting ordinary ones through. The defence against noise
 * is no longer this number alone — see `minStepFor`.
 */
export const ACCURACY_FLOOR_M = 65;

const M_PER_MI = 1609.344;

/**
 * How far you must move before it counts, given how sure the device is of where you are.
 *
 * A fixed 1.5 m threshold is right for a good fix and useless for a ±40 m one, where two consecutive
 * readings can sit 40 m apart with nobody moving. So the bar scales with the uncertainty: you cannot
 * distinguish a movement smaller than your own error bars from noise, and pretending otherwise is how
 * apps invent a mile of "distance" from a phone on a table.
 *
 * Half the reported accuracy, floored at 1.5 m. The cost is slight UNDER-counting on a poor signal —
 * movement accumulates in coarser steps — which is the right direction to be wrong in.
 */
function minStepMi(accuracyM: number | null): number {
  const acc = accuracyM == null ? 8 : accuracyM;
  return Math.max(MIN_STEP_MI, (acc * 0.5) / M_PER_MI);
}
/** No human moves faster than this on foot or a bike; above it the fix jumped, it didn't travel. */
const MAX_MPH: Record<ActivityKind, number> = { run: 20, walk: 12, bike: 60 };
/** The floor under `minStepMi` — a device sitting still and drifting never clears it. */
const MIN_STEP_MI = 0.00093; // ~1.5 m

export interface AcceptResult {
  /** The new track, unchanged when the fix was rejected. */
  track: TrackPoint[];
  /** Why it was rejected, or null when it was kept. Surfaced so the screen can explain a stalled distance. */
  rejected: 'accuracy' | 'jitter' | 'teleport' | null;
}

/**
 * Fold one fix into the track.
 *
 * THE THREE REJECTIONS, and why each one exists rather than trusting the device:
 *
 *   · ACCURACY. A phone reports its own uncertainty. A fix with ±60 m of error can appear 120 m from the
 *     last one without anybody moving, which is a tenth of a mile of invented distance every few seconds.
 *   · JITTER. Standing still, consecutive fixes wander by a few metres. Summed over a traffic light, that
 *     is real distance you did not run. Movement under ~1.5 m is discarded as drift.
 *   · TELEPORT. A recovered signal can place you a block away instantly. Anything implying a speed no
 *     human sustains is a correction to the position, not a journey between two of them — so the point is
 *     kept as the new position but its distance is NOT added.
 *
 * Rejecting a fix keeps the last good position, so the next real step measures from somewhere true.
 */
export function acceptFix(track: TrackPoint[], fix: Fix, kind: ActivityKind): AcceptResult {
  if (fix.accuracy != null && fix.accuracy > ACCURACY_FLOOR_M) return { track, rejected: 'accuracy' };

  const last = track[track.length - 1];
  if (!last) return { track: [{ lat: fix.lat, lon: fix.lon, at: fix.at, mi: 0 }], rejected: null };

  const step = haversineMi(last, fix);
  if (step < minStepMi(fix.accuracy)) return { track, rejected: 'jitter' };

  const hours = Math.max(1e-9, (fix.at - last.at) / 3_600_000);
  if (step / hours > MAX_MPH[kind]) {
    // Re-anchor without crediting the jump.
    return { track: [...track, { lat: fix.lat, lon: fix.lon, at: fix.at, mi: last.mi }], rejected: 'teleport' };
  }

  return { track: [...track, { lat: fix.lat, lon: fix.lon, at: fix.at, mi: last.mi + step }], rejected: null };
}

export const totalMiles = (track: TrackPoint[]): number => track[track.length - 1]?.mi ?? 0;

// ── pace ────────────────────────────────────────────────────────────────────

/** Seconds per mile over the whole session. Null until there's enough distance to divide by honestly. */
export function averagePaceSec(mi: number, elapsedSec: number): number | null {
  if (mi < 0.02 || elapsedSec <= 0) return null;
  return elapsedSec / mi;
}

/**
 * Current pace over a TRAILING WINDOW, not the instant between two fixes.
 *
 * The design derived a live pace from a sine wave with a 5-second period, so its on-pace cue flipped
 * label roughly every two seconds. Real GPS is worse: fix-to-fix pace swings wildly, and a readout that
 * jumps between 6:40 and 9:20 while you hold one speed is unreadable. A 30-second window is long enough
 * to be steady and short enough to notice a hill.
 *
 * Null until the window holds enough distance to mean anything.
 */
export const PACE_WINDOW_SEC = 30;

export function currentPaceSec(track: TrackPoint[], windowSec: number = PACE_WINDOW_SEC): number | null {
  const last = track[track.length - 1];
  if (!last) return null;
  const cutoff = last.at - windowSec * 1000;
  let first = track[0];
  for (let i = track.length - 1; i >= 0; i--) {
    first = track[i];
    if (track[i].at <= cutoff) break;
  }
  const mi = last.mi - first.mi;
  const sec = (last.at - first.at) / 1000;
  if (mi < 0.01 || sec < 5) return null;
  return sec / mi;
}

/** Miles per hour over the same trailing window — what a ride shows instead of a pace. */
export function currentSpeedMph(track: TrackPoint[], windowSec: number = PACE_WINDOW_SEC): number | null {
  const p = currentPaceSec(track, windowSec);
  return p == null ? null : 3600 / p;
}

// ── the on-pace cue, with hysteresis ────────────────────────────────────────

export type PaceCue = 'on' | 'ahead' | 'behind' | null;

/**
 * Compare the live pace to the target, but only CHANGE the answer when it's clearly changed.
 *
 * A single threshold makes the pill flicker whenever you sit on the boundary — which is precisely where
 * someone holding a target pace spends their whole run. So the band to ENTER "on pace" is tighter than
 * the band to LEAVE it: once it says on-pace it tolerates more before giving that up, and vice versa.
 * The previous cue is passed in rather than stored, keeping this pure.
 */
export function paceCue(currentSec: number | null, targetSec: number, prev: PaceCue): PaceCue {
  if (currentSec == null) return null;
  const d = currentSec - targetSec;
  /**
   * ±20 s/mi to claim on-pace, ±35 to keep it.
   *
   * These started at 8 and 16 and were WRONG — that is a 1.7% band, tighter than the noise floor of
   * consumer GPS over a 30-second window, so the cue would have spent a real run reading "behind" while
   * the athlete held their pace perfectly. For an 8:00 target this is 7:40–8:20, which is what a coach
   * means by on pace; anything narrower is measuring the receiver, not the runner.
   */
  const enter = 20; // seconds per mile
  const leave = 35;
  const bound = prev === 'on' ? leave : enter;
  if (Math.abs(d) <= bound) return 'on';
  return d < 0 ? 'ahead' : 'behind';
}

/** Same idea for a ride, in mph — higher is faster, so the direction words invert. */
export function speedCue(currentMph: number | null, targetMph: number, prev: PaceCue): PaceCue {
  if (currentMph == null) return null;
  const d = currentMph - targetMph;
  const bound = prev === 'on' ? 1.2 : 0.6;
  if (Math.abs(d) <= bound) return 'on';
  return d > 0 ? 'ahead' : 'behind';
}

/**
 * The cue the screen actually shows — stable without remembering anything.
 *
 * The `prev`-threading versions above express hysteresis correctly but need the last answer, and reading
 * a ref during render is exactly what this project's react-compiler lint forbids (and it is right to:
 * a value that changes without a render is a value the UI can disagree with).
 *
 * So stability comes from the DATA instead. Two trailing windows are measured — a responsive 30 seconds
 * and a settled 75 — and an off-target verdict is only reported when BOTH agree on it. A brief surge, a
 * GPS wobble, or the ordinary drift of holding a pace moves the short window alone and changes nothing;
 * a hill moves both, and the cue turns. Pure, so it renders the same answer every time from the same
 * track.
 */
export function sustainedCue(track: TrackPoint[], target: number, speed: boolean): PaceCue {
  const short = speed ? currentSpeedMph(track, PACE_WINDOW_SEC) : currentPaceSec(track, PACE_WINDOW_SEC);
  const long = speed ? currentSpeedMph(track, 75) : currentPaceSec(track, 75);
  if (short == null || long == null) return null;
  const a = speed ? speedCue(short, target, null) : paceCue(short, target, null);
  const b = speed ? speedCue(long, target, null) : paceCue(long, target, null);
  return a === b ? a : 'on';
}

export function cueLabel(cue: PaceCue, speed: boolean): string {
  if (cue === 'on') return speed ? 'On target speed' : 'On pace';
  if (cue === 'ahead') return speed ? 'Above target speed' : 'Ahead of pace';
  if (cue === 'behind') return speed ? 'Below target speed' : 'Behind pace';
  return '';
}

// ── units ───────────────────────────────────────────────────────────────────

const KM_PER_MI = 1.609344;

/**
 * What to say about the signal, so a stalled distance is never silent.
 *
 * This exists because both run surfaces failed the same way: a walk around the block reported 0.00 with
 * nothing on screen to explain it. One said "Finding you…" and only while the track was empty; the
 * other said nothing at all. Neither could distinguish "we haven't got a fix" from "we have a fix and
 * it isn't good enough to move you" — which is the state that actually needed words.
 *
 * The `gps` argument arrived later, and with it the case that matters most: a run happening with no
 * measurement at all. That is no longer a dead end — the clock runs regardless — so the line has to
 * account for a bout that is real and simply unmeasured, without implying it is broken.
 */
export type GpsReport = 'off' | 'acquiring' | 'tracking' | 'denied' | 'unavailable';

export function signalNote(
  paused: boolean,
  weak: boolean,
  accuracyM: number | null,
  gps: GpsReport = 'tracking',
): string {
  if (paused) return 'Paused · the ground still moves, the run does not';
  // The run is under way and nothing will measure it. Say what that means for the number, not what
  // went wrong with a radio.
  if (gps === 'denied') return 'Timing only · add the distance when you finish';
  if (gps === 'unavailable') return 'No signal · timing only, add the distance at the end';
  const pm = accuracyM == null ? null : `±${Math.round(accuracyM)} m`;
  if (weak) return pm == null ? 'Looking for satellites…' : `Weak signal · ${pm} — move a little further to start the trace`;
  return pm == null ? 'Tracking' : `Tracking · ${pm}`;
}

export const distanceLabel = (u: UnitSystem) => (u === 'metric' ? 'km' : 'mi');
export const distanceLabelLong = (u: UnitSystem) => (u === 'metric' ? 'Kilometers' : 'Miles');
export const paceLabel = (u: UnitSystem) => (u === 'metric' ? 'min / km' : 'min / mi');
export const speedLabel = (u: UnitSystem) => (u === 'metric' ? 'km/h' : 'mph');

export const toDistance = (mi: number, u: UnitSystem): number => (u === 'metric' ? mi * KM_PER_MI : mi);
export const toSpeed = (mph: number, u: UnitSystem): number => (u === 'metric' ? mph * KM_PER_MI : mph);
/** Seconds per mile → seconds per displayed unit. */
export const toPace = (secPerMi: number, u: UnitSystem): number => (u === 'metric' ? secPerMi / KM_PER_MI : secPerMi);

/** "8:15". Seconds are floored, not rounded, so a pace never displays as ":60". */
export function fmtPace(secPerUnit: number | null): string {
  if (secPerUnit == null || !Number.isFinite(secPerUnit) || secPerUnit <= 0) return '--:--';
  const total = Math.floor(secPerUnit);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** "12:04" under an hour, "1:02:04" over it — a clock that never hides an hour. */
export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return h > 0 ? `${h}:${mm}:${String(ss).padStart(2, '0')}` : `${mm}:${String(ss).padStart(2, '0')}`;
}

// ── goal progress ───────────────────────────────────────────────────────────

/**
 * The ring's fill, 0–1.
 *
 * An OPEN session has no target, so the ring measures the current mile and refills each time one
 * completes — the design's idea, and a good one: progress toward nothing still has to move.
 */
export function goalProgress(mi: number, targetMi: number | null): number {
  if (targetMi == null || targetMi <= 0) return mi - Math.floor(mi);
  return Math.max(0, Math.min(1, mi / targetMi));
}

export const goalMet = (mi: number, targetMi: number | null): boolean => targetMi != null && mi >= targetMi;

// ── the route ───────────────────────────────────────────────────────────────

export interface RoutePath {
  /** SVG path data through every point, fitted to the box. Empty when there's nothing to draw. */
  d: string;
  /** Where the athlete is now, in the same box — so the marker rides the line instead of sitting at its start. */
  head: { x: number; y: number } | null;
  start: { x: number; y: number } | null;
}

/**
 * Fit the recorded track into a viewBox.
 *
 * This is what replaces the design's THREE unrelated hardcoded paths — one on the live map, a duplicate
 * ghost beneath it, and a different, more elaborate one on the completion screen. The run you watched
 * draw itself was not the run you were shown at the end, and neither was the run you took.
 *
 * Longitude is scaled by cos(latitude) so a mile east and a mile north are the same length on screen;
 * without it every route looks stretched, increasingly so away from the equator. Aspect ratio is
 * preserved and the whole thing is centred, so a straight out-and-back doesn't fill the box as a blob.
 */
export function routePath(track: TrackPoint[], w: number, h: number, pad = 10): RoutePath {
  if (track.length === 0) return { d: '', head: null, start: null };

  const latMid = track.reduce((n, p) => n + p.lat, 0) / track.length;
  const kx = Math.cos(rad(latMid)) || 1;
  const xs = track.map((p) => p.lon * kx);
  const ys = track.map((p) => -p.lat); // north is up, so latitude inverts

  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX || 1e-9;
  const spanY = maxY - minY || 1e-9;
  const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY);
  // Centre whatever the scale leaves over.
  const offX = (w - spanX * scale) / 2;
  const offY = (h - spanY * scale) / 2;

  const pts = track.map((_, i) => ({
    x: (xs[i] - minX) * scale + offX,
    y: (ys[i] - minY) * scale + offY,
  }));

  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return { d, head: pts[pts.length - 1], start: pts[0] };
}

// ── personal bests ──────────────────────────────────────────────────────────

export interface PriorSession {
  distanceMi: number;
  durationSec: number;
}

export interface PersonalBest {
  kind: 'distance' | 'pace';
  label: string;
  detail: string;
}

/**
 * What this session actually beat — computed from prior sessions, never asserted.
 *
 * The design hardcoded "11 sec faster than best" and showed the section on any run at all, including a
 * 0.02-mile one, because a preview flag forced it on. It also gated the real path on a distance goal
 * being MET, so an open run could never earn a best no matter how far or fast it went.
 *
 * Here: an open run counts, a session under a quarter mile never does (too short to be a record of
 * anything), and each claim carries the margin it actually won by. An athlete's first session returns
 * nothing — there is no best to beat yet, and "your longest ever" on a first walk is a hollow thing to
 * be told.
 */
export function personalBests(
  mi: number,
  elapsedSec: number,
  priors: readonly PriorSession[],
  kind: ActivityKind,
  units: UnitSystem,
): PersonalBest[] {
  const out: PersonalBest[] = [];
  if (mi < 0.25 || elapsedSec <= 0 || priors.length === 0) return out;

  const unit = distanceLabel(units);
  const noun = kind === 'bike' ? 'Ride' : kind === 'walk' ? 'Walk' : 'Run';

  const farthest = Math.max(...priors.map((p) => p.distanceMi));
  if (mi > farthest) {
    const by = toDistance(mi - farthest, units);
    out.push({
      kind: 'distance',
      label: `Longest ${noun}`,
      detail: `${toDistance(mi, units).toFixed(2)} ${unit} · ${by.toFixed(2)} ${unit} farther than your best`,
    });
  }

  // Pace bests compare like with like: a 5-mile pace is not a 400-metre pace, so only sessions of at
  // least a comparable distance count as the field. Without that, one short fast interval would
  // permanently make every long run look slow.
  const comparable = priors.filter((p) => p.distanceMi >= mi * 0.8 && p.distanceMi >= 0.25 && p.durationSec > 0);
  const mine = elapsedSec / mi;
  if (comparable.length > 0) {
    const best = Math.min(...comparable.map((p) => p.durationSec / p.distanceMi));
    if (mine < best) {
      const gained = Math.round(toPace(best - mine, units));
      out.push({
        kind: 'pace',
        label: kind === 'bike' ? 'Fastest Average Speed' : 'Fastest Average Pace',
        detail:
          kind === 'bike'
            ? `${toSpeed(3600 / mine, units).toFixed(1)} ${speedLabel(units)} · your quickest at this distance`
            : `${fmtPace(toPace(mine, units))} /${unit} · ${gained} sec faster than your best`,
      });
    }
  }

  return out;
}

// ── per-activity configuration ──────────────────────────────────────────────

export interface ActivityConfig {
  verb: string;
  eyebrow: string;
  complete: string;
  /** A ride shows speed where a run shows pace — this flips every string and both step directions. */
  speed: boolean;
  targetMi: number;
  step: number;
  minMi: number;
  maxMi: number;
  /** Target pace in seconds per mile, or target speed in mph when `speed`. */
  paceDefault: number;
  paceStep: number;
  paceMin: number;
  paceMax: number;
  sub: string;
}

export const ACTIVITY: Record<ActivityKind, ActivityConfig> = {
  run: {
    verb: 'Run', eyebrow: 'Outdoor Run', complete: 'Run Complete', speed: false,
    // 26.2 as the ceiling: the marathon is the natural stop.
    targetMi: 5, step: 0.5, minMi: 1, maxMi: 26.2,
    paceDefault: 495, paceStep: 5, paceMin: 300, paceMax: 900,
    sub: 'Steady, controlled effort. Hold an even pace and finish strong.',
  },
  walk: {
    verb: 'Walk', eyebrow: 'Outdoor Walk', complete: 'Walk Complete', speed: false,
    targetMi: 2, step: 0.5, minMi: 0.5, maxMi: 15,
    paceDefault: 1050, paceStep: 10, paceMin: 600, paceMax: 1500,
    sub: 'An easy, restorative pace. Move, breathe, and let the body recover.',
  },
  bike: {
    verb: 'Ride', eyebrow: 'Outdoor Ride', complete: 'Ride Complete', speed: true,
    targetMi: 10, step: 1, minMi: 2, maxMi: 100,
    paceDefault: 17, paceStep: 0.5, paceMin: 8, paceMax: 30,
    sub: 'Smooth cadence, steady power. Settle in and hold the effort.',
  },
};

/** Clamp a stepper to its bounds without float drift ("5.300000000000001" miles). */
export const clampStep = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, +value.toFixed(2)));
