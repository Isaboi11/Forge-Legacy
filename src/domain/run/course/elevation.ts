/**
 * Climb and descent of a planned course, from the router's 3D coordinates (§4.7).
 *
 * The same ignore-small-wiggles rule the tracker uses for a measured run (`CLIMB_THRESHOLD_M` in
 * `run-core.ts`): a change only counts once it has moved 3 m from the last counted altitude. A DEM
 * sampled every few metres is smoother than a phone's altimeter, but it still steps by a metre here and
 * there, and summing those steps is how a flat park loop acquires 40 m of "climb". Using the tracker's
 * number also means the course card and the finished run's record measure climb the same way.
 */

import { CLIMB_THRESHOLD_M } from '../run-core.ts';

export interface GainLoss {
  gainM: number;
  lossM: number;
}

/** Gain and loss over a sequence of altitudes. Nulls (no elevation for that point) are skipped. */
export function gainLoss(alts: readonly (number | null | undefined)[]): GainLoss {
  let gainM = 0;
  let lossM = 0;
  let ref: number | null = null;
  for (const a of alts) {
    if (a == null || !Number.isFinite(a)) continue;
    if (ref == null) {
      ref = a;
      continue;
    }
    const delta = a - ref;
    if (delta >= CLIMB_THRESHOLD_M) {
      gainM += delta;
      ref = a;
    } else if (delta <= -CLIMB_THRESHOLD_M) {
      lossM -= delta;
      ref = a;
    }
  }
  return { gainM, lossM };
}

/** Gain and loss of a course's points (`alt` in metres, as ORS returns with `elevation: true`). */
export const courseGainLoss = (points: readonly { alt?: number | null }[]): GainLoss =>
  gainLoss(points.map((p) => p.alt));
