/**
 * Synthetic geometry for the course tests — a street grid in Provo, UT (the same HOME the route tests
 * use), with ~100–200 m blocks, and a runner who moves along it at a steady pace with seeded GPS noise.
 *
 * ⚠ MADE-UP GEOMETRY. The plan (§13) says so plainly: replace these with a real saved ORS response and a
 * real recorded track before anyone trusts the tuning. Tidy fixtures have fooled this project before.
 */

import { offsetM, prepareCourse, pointAtM } from '../geometry.ts';

export const HOME = { lat: 40.2969, lon: -111.6946 };
export const T0 = 1_700_000_000_000;

const BEARING = { N: 0, E: 90, S: 180, W: 270 };

/** Walk a list of `[dir, metres]` legs from `start`, returning the corner points. */
export function legs(start, moves) {
  const pts = [{ ...start }];
  let p = start;
  for (const [dir, m] of moves) {
    p = offsetM(p, BEARING[dir], m);
    pts.push(p);
  }
  return pts;
}

/** Deterministic PRNG (mulberry32) so a noisy test fails the same way every run. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gaussian noise via Box–Muller. */
export function gauss(r) {
  const u = Math.max(1e-12, r());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

/**
 * A runner moving along `points` at `speed` m/s, one fix every `everyS` seconds, each fix displaced by
 * Gaussian noise of `noiseM` per axis. Every fix carries `trueM` — metres along `points` — for asserting.
 */
export function runAlong(points, { speed = 3, everyS = 1, noiseM = 4, accuracy = 8, t0 = T0, seed = 1 } = {}) {
  const c = prepareCourse(points);
  const r = rng(seed);
  const fixes = [];
  for (let s = 0; ; s += everyS) {
    const m = Math.min(c.lengthM, s * speed);
    const p = pointAtM(c, m);
    const n = offsetM(p, 360 * r(), Math.abs(gauss(r)) * noiseM * Math.SQRT2);
    fixes.push({ lat: n.lat, lon: n.lon, accuracy, at: t0 + s * 1000, trueM: m });
    if (m >= c.lengthM) break;
  }
  return fixes;
}

/** Shift a fix `m` metres on a bearing — a GPS bias, or a runner on the wrong street. */
export const shifted = (fix, bearingDeg, m) => ({ ...fix, ...offsetM(fix, bearingDeg, m) });
