/**
 * Activity Detail (W-19) — the view-model for one logged session. Pure, so every rule is unit-testable.
 *
 * The `.dc` computes this in `ForgeActivityLog.detail(id)` over a seeded demo module; this computes the
 * same shape from the athlete's real workout, its exercises and its sets. Both screens (History and
 * Detail) read one source — here that's the `workouts` table, so a tapped row always resolves.
 */

import { ACTIVITY_LABEL, fmtDuration, type Modality } from './history-core.ts';
/**
 * ⚠ `durText`, NOT `fmtDuration`. They answer different questions and only one of them is right here.
 *
 * `fmtDuration` measures a SESSION — it floors at "< 1 min", because a workout that reads "45s" is a
 * mis-timed workout. A SET of forty-five seconds is an ordinary plank, and "< 1 min" would erase the
 * only number on the row. `durText` is the prescription's own vocabulary ("45s", "1m 30s"), which is
 * also what the Active Workout draws in the Target column — so the ask and the answer read alike.
 */
import { durText } from '../program/prescription.ts';
import type { WorkoutPlaylistLink } from '../workout/playlist.ts';

export interface DetailSet {
  setIndex: number;
  weight: number | null;
  weightUnit: string | null;
  reps: number | null;
  /**
   * Floors climbed, for a stair-climber bout (0151). Never a distance and never converted — see
   * `TRACKS_FLOORS`. Null on everything else, which is every other set in the app.
   */
  floors?: number | null;
  /**
   * Seconds held, for a set measured by the clock rather than by repetitions — a Plank, a Dead Hang,
   * a loaded carry. Null on an ordinary strength set, which is most of them.
   *
   * `workout_sets.duration_sec` has existed since 0096 and only conditioning legs ever wrote it. A timed
   * STRENGTH set now writes it too, because the alternative was the fabricated rep count that shipped
   * before it: a 60s Plank was stored as "10 reps" and read back here as one.
   */
  durationSec: number | null;
}
export interface DetailExercise {
  name: string;
  section: 'warmup' | 'main' | 'cooldown';
  catalogKey: string | null;
  equip: string | null;
  sets: DetailSet[];
  /** What they said about this lift that day. `workout_exercises.notes` — written since 0124. */
  note: string | null;
}
export interface ActivityDetail {
  id: string;
  type: Modality;
  title: string;
  startedAt: string;
  durationSec: number | null;
  distance: number | null;
  distanceUnit: string | null;
  /**
   * The session's stored route (encoded polyline) and climb, when an outdoor bout carried them (0162).
   *
   * ⚠ OWN SESSIONS ONLY in this pass. The shared read path deliberately does not select them yet:
   * D-RS-3 makes the map on a shared surface a per-post choice, and that consent is plumbed with the
   * run-card composer work — a shared detail that always drew the map would hollow the opt-out.
   * Null on every session saved before 0162, every indoor bout, and every shared view.
   */
  route: string | null;
  climbM: number | null;
  exercises: DetailExercise[];
  /** How the session went, in the athlete's words. Distinct from the chapter-facing reflection. */
  note: string | null;
  chapterName: string | null;
  programId: string | null;
  programName: string | null;
  partners: string[];
  /**
   * The playlist attached to this session, or null — W-19 §9A, read-only here.
   *
   * The `.dc` has always drawn this row (`hasPlaylist` / `playlistName` in Forge Activity Detail.dc.html);
   * the screen carried a comment saying "Playlist — no such data", which was true until migration 0105.
   */
  playlist: WorkoutPlaylistLink | null;
  /** PRs set in this session, e.g. "315 lb Back Squat". */
  milestones: string[];
  /**
   * 1-based position in the athlete's history — strength counted separately from all sessions.
   *
   * `null` on a SHARED session (see `viewer`): the ordinal is a running count of the author's entire
   * training life, and the post shared one workout, not a lifetime total. The screen renders its
   * absence as absence rather than as "Workout #0".
   */
  ordinal: number | null;
  /**
   * ══ WHOSE SESSION THIS IS ══
   *
   * `'own'` — the athlete's, read from `workouts` under their own RLS. Everything below is present and
   * the screen is fully interactive: rename, open the program, re-open the summary.
   *
   * `'shared'` — somebody else's, reached by tapping a workout-recap post they wrote and resolved
   * through `shared_workout_detail` (migration 0117). The session is all there — every exercise, every
   * set, the records set in it — but `ordinal`, `chapterName`, `partners` and `programId` are withheld
   * by the RPC, and the screen must not offer an action that would write to a row that is not theirs.
   *
   * ONE SCREEN, TWO SOURCES, and that is the point: `Social-Architecture-Amendment-002` §3 says a recap
   * taps through to *"the session on Activity Detail"*, and building a second, lesser screen for the
   * shared case is what the app was doing before — a snapshot rebuild on `/squad-post/[id]` that could
   * not show a single set.
   */
  viewer: 'own' | 'shared';
  /** Who trained it — rendered only when `viewer` is `'shared'`, where it is the first thing to say. */
  authorName: string | null;
}

const SECTION_LABEL: Record<DetailExercise['section'], string> = {
  warmup: 'Warm-up',
  main: 'Main Workout',
  cooldown: 'Cool-down',
};
const SECTION_ORDER: DetailExercise['section'][] = ['warmup', 'main', 'cooldown'];

// ─────────────────────────────────────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────────────────────────────────────

/** Strength shows its program (or "Free Session"); everything else shows its activity label. */
export function programTag(d: ActivityDetail): string {
  if (d.type !== 'strength') return ACTIVITY_LABEL[d.type];
  return d.programName ?? 'Free Session';
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** The type-specific one-liner under the title. */
export function summaryLine(d: ActivityDetail): string {
  const dur = fmtDuration(d.durationSec);
  if (d.type === 'strength') {
    const sets = d.exercises.reduce((n, e) => n + e.sets.length, 0);
    const parts = [dur];
    if (d.exercises.length) parts.push(plural(d.exercises.length, 'exercise'));
    if (sets) parts.push(plural(sets, 'set'));
    return parts.join(' · ');
  }
  if (d.distance != null && d.distance > 0) {
    return `${dur} · ${Number(d.distance.toFixed(1))} ${d.distanceUnit ?? 'mi'}`;
  }
  return dur;
}

/** "Tuesday, June 10 · 5:12 PM" — the real logged time, never a synthesised one. */
export function whenLine(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  const date = dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const time = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

/**
 * "Workout #12 · Chapter I" — strength sessions are numbered apart from everything else.
 *
 * Empty on a SHARED session. Neither half of that line is the viewer's to see: the ordinal counts the
 * author's whole training life and the chapter is their own Legacy prose, so `shared_workout_detail`
 * returns neither. Rendering "Workout #0" from the missing value is exactly the defect class the
 * 2026-08-01 audit named — a default displayed as a fact — so this returns nothing and the screen
 * draws nothing.
 */
export function ordinalLine(d: ActivityDetail): string {
  if (d.ordinal == null) return '';
  const noun = d.type === 'strength' ? 'Workout' : 'Session';
  const short = d.chapterName ? d.chapterName.split(/[·—]/)[0].trim() : '';
  return short ? `${noun} #${d.ordinal} · ${short}` : `${noun} #${d.ordinal}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// STRENGTH BODY
// ─────────────────────────────────────────────────────────────────────────────

export interface DetailSection {
  key: DetailExercise['section'];
  label: string;
  exercises: DetailExercise[];
}

/** Group the session's exercises into Warm-up / Main / Cool-down, dropping empty sections. */
export function sectionsOf(d: ActivityDetail): DetailSection[] {
  return SECTION_ORDER.map((key) => ({
    key,
    label: SECTION_LABEL[key],
    exercises: d.exercises.filter((e) => e.section === key),
  })).filter((s) => s.exercises.length > 0);
}

/**
 * `225 lbs × 5` · `BW × 12` · `12 reps` · `225 lbs × —` · '' — never invents the half it doesn't have.
 *
 * THREE STATES, not two. A weight of `0` is an ANSWER — the athlete marked the set bodyweight — and
 * reads as "BW". A weight of `null` is the absence of an answer and reads as reps alone, because a
 * warm-up set logged without a weight is not a claim that it carried none.
 */
export function setLine(s: DetailSet): string {
  const unit = s.weightUnit ?? 'lbs';
  const hasW = s.weight != null && s.weight > 0;
  const isBw = s.weight === 0;
  /*
   * A HOLD IS READ IN SECONDS, and it is read FIRST.
   *
   * A timed set carries no reps by construction, so every arm below it would fall through to `''` and
   * the athlete's forty-five second plank would appear in their history as an exercise name with an
   * empty line under it. `40 lbs × 45s` is the loaded-carry shape; `45s` the unloaded one.
   */
  /*
   * FLOORS COME FIRST, ahead of the clock.
   *
   * A stair bout carries both, and the clock arm below would swallow it: "24:10" alone, with the number
   * the athlete actually climbed nowhere in their history. Read as "48 floors · 24:10", which is both
   * halves in the order the machine reports them. No weight arm — nothing loads a stair climber.
   */
  if (s.floors != null && s.floors > 0) {
    const f = `${s.floors} ${s.floors === 1 ? 'floor' : 'floors'}`;
    return s.durationSec != null && s.durationSec > 0 ? `${f} · ${durText(s.durationSec)}` : f;
  }
  if (s.durationSec != null && s.durationSec > 0) {
    const d = durText(s.durationSec);
    return hasW ? `${s.weight} ${unit} × ${d}` : isBw ? `BW × ${d}` : d;
  }
  if (hasW && s.reps != null) return `${s.weight} ${unit} × ${s.reps}`;
  if (hasW) return `${s.weight} ${unit} × —`;
  if (isBw && s.reps != null) return `BW × ${s.reps}`;
  if (s.reps != null) return `${s.reps} reps`;
  return '';
}

// ─────────────────────────────────────────────────────────────────────────────
// NON-STRENGTH BODY
// ─────────────────────────────────────────────────────────────────────────────

export interface StatTile {
  label: string;
  value: string;
}

/** `m:ss` per distance unit — only when both halves are real. */
export function pacePer(distance: number | null, durationSec: number | null, unit: string): string | null {
  if (distance == null || distance <= 0 || durationSec == null || durationSec <= 0) return null;
  const secPer = durationSec / distance;
  const m = Math.floor(secPer / 60);
  const s = Math.round(secPer % 60);
  const ss = s === 60 ? '00' : String(s).padStart(2, '0');
  return `${s === 60 ? m + 1 : m}:${ss} /${unit}`;
}

/**
 * The stat tiles for a non-strength session. Only tiles backed by real data appear — a session logged
 * without a distance shows Duration alone rather than an empty Distance tile.
 */
export function statTiles(d: ActivityDetail): StatTile[] {
  const tiles: StatTile[] = [];
  const unit = d.distanceUnit ?? 'mi';
  if (d.distance != null && d.distance > 0) {
    tiles.push({ label: 'Distance', value: `${Number(d.distance.toFixed(1))} ${unit}` });
    const pace = pacePer(d.distance, d.durationSec, unit);
    if (pace) tiles.push({ label: 'Avg Pace', value: pace });
  }
  tiles.push({ label: 'Duration', value: fmtDuration(d.durationSec) });
  /*
   * The hill, finally shown somewhere. climb_m has been WRITTEN since 0162 and displayed on no
   * surface after the session ended — for a trail run it is the stat that distinguishes the workout.
   * Metres canonical; the mi/km unit the session already displays picks the athlete's system, which
   * is the same inference the rest of this function makes.
   */
  if (d.climbM != null && d.climbM > 0) {
    const metric = unit === 'km';
    tiles.push({ label: 'Climb', value: metric ? `${d.climbM} m` : `${Math.round(d.climbM * 3.28084)} ft` });
  }
  return tiles;
}
