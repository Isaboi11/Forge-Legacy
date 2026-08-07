/**
 * Activity Detail (W-19) — the view-model for one logged session. Pure, so every rule is unit-testable.
 *
 * The `.dc` computes this in `ForgeActivityLog.detail(id)` over a seeded demo module; this computes the
 * same shape from the athlete's real workout, its exercises and its sets. Both screens (History and
 * Detail) read one source — here that's the `workouts` table, so a tapped row always resolves.
 */

import { ACTIVITY_LABEL, fmtDuration, type Modality } from './history-core.ts';
import type { WorkoutPlaylistLink } from '../workout/playlist.ts';

export interface DetailSet {
  setIndex: number;
  weight: number | null;
  weightUnit: string | null;
  reps: number | null;
}
export interface DetailExercise {
  name: string;
  section: 'warmup' | 'main' | 'cooldown';
  catalogKey: string | null;
  equip: string | null;
  sets: DetailSet[];
}
export interface ActivityDetail {
  id: string;
  type: Modality;
  title: string;
  startedAt: string;
  durationSec: number | null;
  distance: number | null;
  distanceUnit: string | null;
  exercises: DetailExercise[];
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
  return tiles;
}
