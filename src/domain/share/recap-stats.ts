/**
 * The stat strip a shared session leads with — and the run's half of the snapshot.
 *
 * PO, 2026-08-26, on a friend's 3-mile run rendered as "0 Volume (lb) · 32:06 Time · 1 Lifts":
 * *"Evaluate this and tell me if this is what we want for a running post summary. Reps?"* It was not.
 * The card judged a run by a lifting scorecard, and the "1" was the run itself — a cardio bout is an
 * exercise, so every pure run read "1 Lifts" forever.
 *
 * ══ WHY THE FIX IS A SNAPSHOT FIELD AND NOT A LOOKUP ══
 *
 * Posts render from the `WorkoutSummary` snapshot stored on the row, deliberately — a post keeps what
 * the session looked like when it was shared. The completion the snapshot is built from ALREADY held
 * `distanceMi` and `paceSecPerMi`; `recapSummaryFrom` simply dropped them. So the run's numbers ride
 * the same snapshot every other field rides: optional, absent on every post written before today, no
 * migration, no backfill — the `name`/`playlist` pattern, third time around.
 *
 * ══ D-RS-4 — WHICH STRIP LEADS ══
 *
 * PO: *"I think you can post both honestly. Be able to choose."* A session holding both strength sets
 * and a cardio bout can lead with either summary; the composer offers the choice and `lead` records
 * it. `deriveLead` is the default when nobody chose: pure cardio leads cardio, anything with strength
 * leads strength — a leg day with a cool-down walk is a lifting post unless its athlete says otherwise.
 *
 * ⚠ PURE, AND RELATIVE `.ts` IMPORTS ONLY — `node --test` cannot resolve `@/`.
 */

import { distanceLabel, fmtPace, toDistance, toPace } from '../run/run-core.ts';
import type { UnitSystem } from '../settings/units.ts';

/** One conditioning bout's share of the snapshot. Miles and seconds canonical, converted at draw. */
export interface RecapCardio {
  distanceMi: number | null;
  /** Stair climber only — floors off the machine. Never a distance, never converted. */
  floors: number | null;
  /** Seconds per mile. Null when there isn't enough distance to divide by honestly. */
  paceSecPerMi: number | null;
  /** The session's activity type as saved — 'running', 'stair_climber', … — for the glyph and label. */
  activityType: string | null;
}

export type RecapLead = 'strength' | 'cardio';

/** The slice of a completion this module reads. Structural, so the real Completion satisfies it. */
export interface CardioLike {
  cardio?: { distanceMi: number | null; floors: number | null; paceSecPerMi: number | null; durationSec: number | null } | null;
}

/**
 * The session's cardio, aggregated for the snapshot — or null when there was none.
 *
 * One bout is the common case and its numbers pass through untouched. Multiple bouts sum their
 * distances and floors; pace is recomputed from the summed distance and time rather than averaged,
 * because an average of paces weights a short jog equally with a long run. When any distance is
 * missing the pace is withheld entirely — a pace over a partial distance is a made-up number.
 */
export function recapCardioFrom(exercises: readonly CardioLike[], activityType: string | null): RecapCardio | null {
  const bouts = exercises.map((e) => e.cardio).filter((c): c is NonNullable<CardioLike['cardio']> => c != null);
  if (!bouts.length) return null;
  if (bouts.length === 1) {
    const b = bouts[0];
    return { distanceMi: b.distanceMi, floors: b.floors, paceSecPerMi: b.paceSecPerMi, activityType };
  }
  const allMeasured = bouts.every((b) => b.distanceMi != null && b.durationSec != null);
  const distanceMi = bouts.some((b) => b.distanceMi != null)
    ? bouts.reduce((n, b) => n + (b.distanceMi ?? 0), 0)
    : null;
  const floors = bouts.some((b) => b.floors != null) ? bouts.reduce((n, b) => n + (b.floors ?? 0), 0) : null;
  const timeSec = bouts.reduce((n, b) => n + (b.durationSec ?? 0), 0);
  const paceSecPerMi = allMeasured && distanceMi != null && distanceMi > 0 ? timeSec / distanceMi : null;
  return { distanceMi, floors, paceSecPerMi, activityType };
}

/** The default lead when the athlete did not choose — see the header. */
export function deriveLead(hasStrength: boolean, cardio: RecapCardio | null): RecapLead {
  return cardio && !hasStrength ? 'cardio' : 'strength';
}

export interface RecapStat {
  value: string;
  label: string;
}

const fmtShareDuration = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * The cardio strip: Distance · Pace · Time — the same three tiles the Activity Detail already chose,
 * so the card and the screen it opens describe the run in the same terms.
 *
 * A stair bout has no distance and shows Floors instead; a pace the data cannot honestly support is
 * dropped, not zero-filled. Never more than three — §2.6's cap is the card's, whatever the sport.
 */
export function cardioStats(cardio: RecapCardio, durationSec: number, units: UnitSystem): RecapStat[] {
  const unit = distanceLabel(units);
  const out: RecapStat[] = [];
  if (cardio.distanceMi != null) {
    out.push({ value: toDistance(cardio.distanceMi, units).toFixed(2).replace(/\.?0+$/, ''), label: `Distance (${unit})` });
  } else if (cardio.floors != null) {
    out.push({ value: String(cardio.floors), label: 'Floors' });
  }
  if (cardio.paceSecPerMi != null) {
    out.push({ value: fmtPace(toPace(cardio.paceSecPerMi, units)), label: `Pace /${unit}` });
  }
  out.push({ value: fmtShareDuration(durationSec), label: 'Time' });
  return out.slice(0, 3);
}

/**
 * "1 Lift", not "1 Lifts" — the label agrees with its number.
 *
 * Small on a strength post; on a run it was the tell that the whole strip was wrong, because a pure
 * run always counted exactly one "exercise": itself.
 */
export const liftsLabel = (n: number): string => (n === 1 ? 'Lift' : 'Lifts');

/** The card marker's face for a cardio-lead post: a label from the saved activity type. */
export function cardioMarkerLabel(activityType: string | null): string {
  const LABEL: Record<string, string> = {
    running: 'Run',
    walking: 'Walk',
    cycling: 'Ride',
    swimming: 'Swim',
    rowing: 'Row',
    stair_climber: 'Climb',
    elliptical: 'Cardio',
  };
  return LABEL[String(activityType ?? '')] ?? 'Cardio';
}
