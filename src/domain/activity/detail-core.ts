/**
 * Activity Detail (W-19) — the view-model for one logged session. Pure, so every rule is unit-testable.
 *
 * The `.dc` computes this in `ForgeActivityLog.detail(id)` over a seeded demo module; this computes the
 * same shape from the athlete's real workout, its exercises and its sets. Both screens (History and
 * Detail) read one source — here that's the `workouts` table, so a tapped row always resolves.
 */

import { ACTIVITY_LABEL, fmtDuration, type Modality } from './history-core.ts';

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
  /** PRs set in this session, e.g. "315 lb Back Squat". */
  milestones: string[];
  /** 1-based position in the athlete's history — strength counted separately from all sessions. */
  ordinal: number;
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

/** "Workout #12 · Chapter I" — strength sessions are numbered apart from everything else. */
export function ordinalLine(d: ActivityDetail): string {
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

/** `225 lbs × 5` · `12 reps` · `225 lbs × —` · '' — never invents the half it doesn't have. */
export function setLine(s: DetailSet): string {
  const unit = s.weightUnit ?? 'lbs';
  const hasW = s.weight != null && s.weight > 0;
  if (hasW && s.reps != null) return `${s.weight} ${unit} × ${s.reps}`;
  if (hasW) return `${s.weight} ${unit} × —`;
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
