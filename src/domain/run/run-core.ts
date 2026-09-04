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
  /** Metres above sea level, or null when the device won't say. Optional — a fix without one still counts. */
  alt?: number | null;
  /** Metres of VERTICAL uncertainty. Far worse than horizontal on a phone; see `CLIMB_THRESHOLD_M`. */
  altAccuracy?: number | null;
}

export interface TrackPoint {
  /**
   * The SMOOTHED position, not the raw fix — see `acceptFix`.
   *
   * ⚠ This changed, and it is why the route stopped looking like a scribble. A raw 1 Hz fix stream from a
   * phone wanders several metres a second around the truth; drawn point-for-point it is a zigzag, and
   * measured point-for-point it is a mile of distance the athlete never covered.
   */
  lat: number;
  lon: number;
  at: number;
  /** Cumulative miles at this point — carried so the route and the readout can never disagree. */
  mi: number;
  /**
   * The filter's uncertainty about this position, in square metres. Carried rather than held in a
   * closure so `acceptFix` stays pure and one call can be replayed from any track.
   */
  varM2?: number;
  /**
   * The ANCHOR the next step is measured from — the last position that was far enough from its own
   * predecessor to be movement rather than noise.
   *
   * It is deliberately NOT the previous point. Distance accumulates anchor-to-here, so the metre of
   * wander between two fixes taken half a second apart never becomes a metre of running.
   */
  aLat?: number;
  aLon?: number;
  aAt?: number;
  /**
   * True while this is the provisional head: a fix that refined where the athlete is without clearing
   * the movement gate. The NEXT fix replaces it rather than appending after it, so a 30-minute run holds
   * one point per few metres covered instead of one per second.
   */
  provisional?: boolean;
  /**
   * Metres above sea level as reported, or null. Kept raw; the SMOOTHED reference lives in `climbRef`.
   *
   * ⚠ OPTIONAL, AND EVERY TRACK WRITTEN BEFORE THIS EXISTED HAS NONE. A track is client-side state
   * rebuilt on every run, so there is nothing to migrate — but a resumed session's stored track can
   * predate it, and reading `alt` off one of those must be `undefined`, not a crash.
   */
  alt?: number | null;
  /** Cumulative metres CLIMBED at this point, carried for the same reason `mi` is. */
  gainM?: number;
  /**
   * The altitude the next climb is measured against — see `acceptFix`.
   *
   * It is NOT the last reading. It only moves once a reading clears the threshold, which is what stops
   * a noisy altimeter accumulating gain while an athlete stands still.
   */
  climbRef?: number | null;
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

/** No human moves faster than this on foot or a bike; above it the fix jumped, it didn't travel. */
const MAX_MPH: Record<ActivityKind, number> = { run: 20, walk: 12, bike: 60 };

/**
 * ══ ⚠ WHY THERE IS A FILTER HERE AT ALL, AND WHAT IT REPLACED ══
 *
 * PO, on a real 3.01-mile run measured against a watch: *"It didn't track any of his miles or log them."*
 * Forge reported **0.0 mi over 34:37** and drew a route while doing it. That combination is the tell —
 * the points were arriving and being kept as POSITIONS while every one of them was refused as DISTANCE.
 *
 * The old pipeline judged each fix against the one before it, one second earlier, on three raw tests:
 * a step under half the reported accuracy was jitter, and a step implying more than `MAX_MPH` was a
 * "teleport" that kept the point and credited nothing. At 1 Hz that is not a filter, it is a coin toss.
 * GPS noise alone moves a stationary phone 5–10 m between consecutive fixes, which reads as 11–22 mph
 * before the athlete has taken a step. Replaying that run through it:
 *
 *     reported accuracy    old pipeline      truth
 *     ±10 m                3.76 mi           3.01
 *     ±16 m                2.33 mi           3.01
 *     ±20 m                1.56 mi           3.01
 *     ±30 m                0.86 mi           3.01
 *     ±65 m                0.10 mi           3.01
 *
 * and — the same defect pointing the other way — a phone STANDING STILL for ten minutes at ±10 m
 * accumulated **1.23 miles**, because drift that happened to clear the jitter floor was credited in full.
 * Over- and under-counting were never two bugs. They were one: distance computed from raw fixes.
 *
 * ══ WHAT REPLACES IT ══
 *
 * Two ideas, and neither is novel — this is what every watch does.
 *
 *   1. SMOOTH THE POSITION. A one-dimensional Kalman filter over latitude and longitude, using the
 *      device's own reported accuracy as the measurement variance. A fix the phone is confident about
 *      moves the estimate a long way; a ±60 m fix nudges it. Uncertainty grows with elapsed time at
 *      `DRIFT_MPS`, so after a gap the next fix is trusted almost completely — which is exactly right,
 *      because after twenty seconds the filter genuinely has no idea where you are.
 *
 *   2. MEASURE FROM AN ANCHOR, NOT FROM THE LAST POINT. Distance accumulates from the last position far
 *      enough away to be movement rather than noise. Fixes inside that radius refine where you are
 *      without adding anything, so a traffic light contributes nothing however long you stand at it.
 *
 * `MAX_MPH` survives, but it now judges the SMOOTHED step over the anchor's baseline — seconds of
 * evidence rather than one sample — so it fires on a genuine signal jump and not on ordinary noise.
 *
 * Same run through this: **3.00–3.11 mi across ±3 m to ±40 m of reported accuracy**, and 0.035 mi for
 * the ten minutes standing still.
 */

/**
 * Metres per second of movement the filter does not model, as a standard deviation.
 *
 * This is what makes uncertainty grow between fixes. Too low and the filter stops believing a real
 * sprint; too high and it stops smoothing at all and we are back to raw fixes. 3 m/s is a shade above
 * a fast run, which is the honest ceiling for "how far could they have got since I last heard".
 */
export const DRIFT_MPS = 3;

/** What to assume when a device won't say how accurate a fix is. Mid-range: neither trusted nor binned. */
const ASSUMED_ACCURACY_M = 12;

/**
 * How far the estimate must sit from the anchor before it counts as having gone somewhere.
 *
 * Scaled to the fix's own uncertainty, because you cannot distinguish a movement smaller than your error
 * bars from noise. CAPPED at 25 m so a poor fix cannot set the bar so high that a real run never reaches
 * it — the failure that left the ±65 m column above reading 0.10 mi.
 *
 * ⚠ THE FLOOR IS 10 m AND IT WAS TUNED, NOT CHOSEN. Smoothing alone does not stop a parked phone: the
 * estimate still wanders, just slowly, and every excursion past the gate is credited. Ten minutes
 * stationary at ±10 m, by floor:
 *
 *     5 m → 0.134 mi        8 m → 0.027 mi        10 m → 0.021 mi        12 m → 0.016 mi
 *
 * and the measured 3.01-mile run over the same range reads 3.15 / 3.08 / 3.05 / 3.05. Ten is where the
 * drift stops mattering and the route still has the detail to be a route; past it the return collapses
 * and only the shape gets coarser.
 */
const GATE_MIN_M = 10;
const GATE_MAX_M = 25;
const GATE_FRACTION = 0.5;

const gateM = (accuracyM: number): number =>
  Math.min(GATE_MAX_M, Math.max(GATE_MIN_M, accuracyM * GATE_FRACTION));

export interface AcceptResult {
  /**
   * The new track.
   *
   * ⚠ NOT "unchanged when rejected" any more. A fix that is refused DISTANCE may still refine the
   * position estimate — that is the point of smoothing — so `jitter` and `teleport` both return a track
   * whose head has moved. Only `accuracy` and `stale` return the array untouched.
   */
  track: TrackPoint[];
  /** Why no distance was credited, or null when it was. Surfaced so the screen can explain a stalled distance. */
  rejected: 'accuracy' | 'jitter' | 'teleport' | 'stale' | null;
}

/**
 * Fold one fix into the track. THE one distance rule — the foreground watcher and the drained background
 * buffer both come through here, so the watched and unwatched halves of a run can never disagree.
 *
 * THE FOUR REFUSALS:
 *
 *   · ACCURACY. Worse than `ACCURACY_FLOOR_M` and the device is telling us it does not know; the fix is
 *     dropped whole rather than fed to a filter that would have to believe it a little.
 *   · STALE. A fix at or before the head's timestamp. This is what stops the background buffer being
 *     counted twice — see the note on it below.
 *   · JITTER. Inside the gate: a refinement of where you are, not a journey. Kept as the provisional
 *     head, credited nothing.
 *   · TELEPORT. A recovered signal can place you a block away instantly. The estimate restarts from the
 *     RAW fix — the filter's belief has just been proven wrong, so smoothing towards it would leave the
 *     anchor stranded half way across the jump and hand that half to the next step as distance.
 */
export function acceptFix(track: TrackPoint[], fix: Fix, kind: ActivityKind): AcceptResult {
  if (fix.accuracy != null && fix.accuracy > ACCURACY_FLOOR_M) return { track, rejected: 'accuracy' };

  const last = track[track.length - 1];
  const acc = fix.accuracy ?? ASSUMED_ACCURACY_M;

  if (!last) {
    return {
      track: [{ lat: fix.lat, lon: fix.lon, at: fix.at, mi: 0, varM2: acc * acc, aLat: fix.lat, aLon: fix.lon, aAt: fix.at, ...climbSeed(fix) }],
      rejected: null,
    };
  }

  /*
   * ⚠ THE FIX THAT ARRIVES TWICE.
   *
   * A run has two location streams: the foreground `watchPositionAsync` and the background task, and on
   * iOS the task keeps delivering while the app is on screen. So the durable buffer accumulates fixes the
   * foreground watcher has ALREADY folded into this track, and draining it replays them.
   *
   * Replayed, they are older than the head. `Math.max(1e-9, …)` on a negative interval used to turn every
   * one of them into an implied speed of millions of miles an hour — a teleport, which re-anchored the
   * track back to where the athlete had been minutes earlier and threw away the distance in between.
   *
   * Time only moves one way. A fix that does not advance it has nothing to add.
   */
  if (fix.at <= last.at) return { track, rejected: 'stale' };

  // ── 1 · smooth ────────────────────────────────────────────────────────────
  const dtSec = (fix.at - last.at) / 1000;
  const varPrior = (last.varM2 ?? acc * acc) + dtSec * DRIFT_MPS * DRIFT_MPS;
  // The Kalman gain: how much of the way to this measurement the estimate should move. Near 1 when we
  // are lost (a long gap, or a very precise fix), near 0 when we are confident and the fix is vague.
  const gain = varPrior / (varPrior + acc * acc);
  const sLat = last.lat + gain * (fix.lat - last.lat);
  const sLon = last.lon + gain * (fix.lon - last.lon);
  const varM2 = varPrior * (1 - gain);

  /*
   * A provisional head is superseded, never built on: the next fix takes its place in the array. Without
   * this the track would grow a point a second — 1,800 of them on a half-hour run, every one of them
   * re-rendered into an SVG path string on every tick.
   */
  const base = last.provisional ? track.slice(0, -1) : track;
  const anchor = { lat: last.aLat ?? last.lat, lon: last.aLon ?? last.lon, at: last.aAt ?? last.at };

  // ── 2 · measure from the anchor ───────────────────────────────────────────
  const stepMi = haversineMi(anchor, { lat: sLat, lon: sLon });

  if (stepMi * M_PER_MI < gateM(acc)) {
    /* Inside the gate. The position is better known than it was; nothing has been travelled. Climb is
       carried forward untouched for the same reason — it accrues only where distance does. */
    return {
      track: [
        ...base,
        { lat: sLat, lon: sLon, at: fix.at, mi: last.mi, alt: last.alt ?? null, gainM: last.gainM ?? 0, climbRef: last.climbRef ?? null, varM2, aLat: anchor.lat, aLon: anchor.lon, aAt: anchor.at, provisional: true },
      ],
      rejected: 'jitter',
    };
  }

  // ── 3 · is it possible? ───────────────────────────────────────────────────
  const hours = Math.max(1e-9, (fix.at - anchor.at) / 3_600_000);
  if (stepMi / hours > MAX_MPH[kind]) {
    // Re-anchor without crediting the jump — horizontally OR vertically. A signal that jumped a block
    // also jumped a floor, and crediting that rise would put a staircase in the middle of a flat road.
    return {
      track: [
        ...base,
        { lat: fix.lat, lon: fix.lon, at: fix.at, mi: last.mi, alt: fix.alt ?? null, gainM: last.gainM ?? 0, climbRef: last.climbRef ?? null, varM2: acc * acc, aLat: fix.lat, aLon: fix.lon, aAt: fix.at },
      ],
      rejected: 'teleport',
    };
  }

  // ── 4 · it happened ───────────────────────────────────────────────────────
  return {
    track: [
      ...base,
      { lat: sLat, lon: sLon, at: fix.at, mi: last.mi + stepMi, ...climbFrom(last, fix), varM2, aLat: sLat, aLon: sLon, aAt: fix.at },
    ],
    rejected: null,
  };
}

/**
 * ══ CLIMB — AND WHY IT IS NOT "ADD UP EVERY RISE" ══
 *
 * A phone's altimeter is far noisier vertically than horizontally: consecutive fixes standing still
 * wander by several metres, and a naive `max(0, alt - lastAlt)` summed over an hour reports hundreds of
 * feet of climb on a flat track. It is the altitude version of the jitter the horizontal path already
 * guards against, and it is worse, because the error is larger and it only ever adds.
 *
 * So gain accumulates against a REFERENCE rather than against the previous reading. The reference only
 * moves once a reading clears it by `CLIMB_THRESHOLD_M`; a descent moves it straight down, because the
 * bottom of a hill is where the next climb starts. Noise inside the threshold band moves nothing.
 *
 * The threshold is the standard grade for consumer GPS. It undercounts a series of very small rollers,
 * which is the right way to be wrong: an athlete would rather see a climb figure they can trust than one
 * flattered by standing at a traffic light.
 */
export const CLIMB_THRESHOLD_M = 3;

/**
 * A fix's vertical accuracy has to be believable before its altitude is used at all.
 *
 * A reading the device itself says is ±40 m cannot resolve a 3 m step, and taking it anyway is how a
 * flat run acquires a mountain. Null is ACCEPTED — plenty of devices simply do not report it, and
 * refusing those would mean no climb data on hardware that measures altitude perfectly well.
 */
export const ALT_ACCURACY_FLOOR_M = 15;

const usableAlt = (fix: Fix): number | null => {
  if (fix.alt == null || !Number.isFinite(fix.alt)) return null;
  if (fix.altAccuracy != null && fix.altAccuracy > ALT_ACCURACY_FLOOR_M) return null;
  return fix.alt;
};

/** The first point's climb state: no gain yet, and this altitude is what the first climb measures from. */
function climbSeed(fix: Fix): { alt: number | null; gainM: number; climbRef: number | null } {
  const a = usableAlt(fix);
  return { alt: a, gainM: 0, climbRef: a };
}

/** Carry the climb forward one fix. */
function climbFrom(last: TrackPoint, fix: Fix): { alt: number | null; gainM: number; climbRef: number | null } {
  const a = usableAlt(fix);
  const gain = last.gainM ?? 0;
  const ref = last.climbRef ?? null;

  if (a == null) return { alt: null, gainM: gain, climbRef: ref };
  // No reference yet — the altimeter only just became usable, so this reading becomes the datum.
  if (ref == null) return { alt: a, gainM: gain, climbRef: a };

  const delta = a - ref;
  if (delta >= CLIMB_THRESHOLD_M) return { alt: a, gainM: gain + delta, climbRef: a };
  // A descent past the threshold resets the datum without subtracting: gain is climb, not net change.
  if (delta <= -CLIMB_THRESHOLD_M) return { alt: a, gainM: gain, climbRef: a };
  return { alt: a, gainM: gain, climbRef: ref };
}

export const totalMiles = (track: TrackPoint[]): number => track[track.length - 1]?.mi ?? 0;

/** Cumulative metres climbed over the whole track. */
export const totalGainM = (track: TrackPoint[]): number => track[track.length - 1]?.gainM ?? 0;

/** Whether this track measured altitude at all — the difference between "0 ft" and "we could not tell". */
export const hasClimbData = (track: TrackPoint[]): boolean => track.some((p) => p.alt != null);

const FT_PER_M = 3.280839895;

/** Metres of climb → the athlete's unit, rounded to something a person reads off a watch. */
export function displayGain(gainM: number, metric: boolean): { value: number; unit: string } {
  return metric ? { value: Math.round(gainM), unit: 'm' } : { value: Math.round(gainM * FT_PER_M), unit: 'ft' };
}

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
  /**
   * `false` running · `true` the athlete pressed Pause · `'auto'` the app stopped the clock itself.
   *
   * ⚠ A UNION RATHER THAN A SECOND BOOLEAN, and rather than a changed parameter order — every existing
   * caller and every existing test passes a boolean and still means exactly what it meant. `'auto'` is
   * truthy, so even a caller that only knows the old shape falls into the paused branch correctly.
   */
  paused: boolean | 'auto',
  weak: boolean,
  accuracyM: number | null,
  gps: GpsReport = 'tracking',
): string {
  /* Named differently because it BEHAVES differently: this one ends by itself. An athlete who reads
     plain "Paused" stands there waiting to press something that is not going to matter. */
  if (paused === 'auto') return 'Auto-paused · it starts again when you do';
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
 * The most points worth drawing into a card-sized box.
 *
 * A long ride can hold thousands, and past a few hundred they land sub-pixel: the path string gets
 * longer, the shape does not get truer. Decimation is by STRIDE with the last point always kept, so the
 * head marker still sits where the athlete is.
 */
const ROUTE_MAX_POINTS = 400;

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

  const stride = Math.ceil(track.length / ROUTE_MAX_POINTS);
  const pts0 =
    stride <= 1
      ? track
      : (() => {
          const out = track.filter((_, i) => i % stride === 0);
          if (out[out.length - 1] !== track[track.length - 1]) out.push(track[track.length - 1]);
          return out;
        })();

  const latMid = pts0.reduce((n, p) => n + p.lat, 0) / pts0.length;
  const kx = Math.cos(rad(latMid)) || 1;
  const xs = pts0.map((p) => p.lon * kx);
  const ys = pts0.map((p) => -p.lat); // north is up, so latitude inverts

  /* ⚠ NOT `Math.min(...xs)`. Spreading an array into a call passes one ARGUMENT per element, and a long
     enough track blows the engine's argument limit — a crash that only ever happens on somebody's
     longest run. `reduce` has no such ceiling. */
  const minX = xs.reduce((a, b) => (b < a ? b : a), Infinity);
  const maxX = xs.reduce((a, b) => (b > a ? b : a), -Infinity);
  const minY = ys.reduce((a, b) => (b < a ? b : a), Infinity);
  const maxY = ys.reduce((a, b) => (b > a ? b : a), -Infinity);
  const spanX = maxX - minX || 1e-9;
  const spanY = maxY - minY || 1e-9;
  const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY);
  // Centre whatever the scale leaves over.
  const offX = (w - spanX * scale) / 2;
  const offY = (h - spanY * scale) / 2;

  const pts = pts0.map((_, i) => ({
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
