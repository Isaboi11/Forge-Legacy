/**
 * THE CHECKER — "AI rewrites, the app checks" (Holt Listens, PO D12, 2026-11-19).
 *
 * Holt is handed the running program and returns the weeks from the athlete's next session on, rewritten however they
 * asked — movements, order, supersets, sets, reps, run distance or time. Nothing he returns reaches the athlete until
 * this has gone through it. The rules are code, not examples:
 *
 *   · A trained or skipped session is never changed — whatever came back for it is ignored.
 *   · A started program keeps its session count (migration 0123 refuses anything else): a week that came back with a
 *     different number of sessions is kept as it was, and SAID. Fewer runs a week is `rest` (skip marks), not deletion.
 *   · Every movement is checked by `validateAuthored` — the visible catalogue, the athlete's kit, level, limitations and
 *     exclusions, the set cap, the session volume envelope. What fails is dropped and said, never swapped.
 *   · Running: a week may not rise more than ~10% over the ENGINE'S OWN PLAN for that week (its build, cutbacks and
 *     taper are the envelope), nor the long run, never past 22 mi, no run under a mile — over the line is pulled back
 *     and SAID. Cutting is always allowed. On a race program the final week is never rewritten.
 *   · No load: a row carries no weight field the model could fill. Loads come from the athlete's logged lifts (PO D13).
 *
 * Pure: relative imports only, `import type` from `@/…`.
 */

import type { ProgramDay, ProgramExercise, ProgramStructure } from '@/data/programs-live';
import { plannedDays, trainingDays, type SessionMark } from '../../program/progress-core.ts';
import { cardioKey } from '../../workout/conditioning.ts';
import type { AuthoredExercise } from '../author.ts';
import { validateAuthored, type AuthorAthlete, type Dropped } from '../author-validate.ts';
import type { CatalogExercise, EquipmentGate } from '../candidates.ts';
import { editableSessions } from '../edit-chat.ts';
import { canEdit, commit, materialise } from '../edit-ops.ts';

/** One row as Holt writes it. `key` is a catalogue key, or `cardio-run` / `cardio-bike` / … for a bout. */
export interface RewriteRow {
  key: string;
  part?: 'warmup' | 'main' | 'cooldown';
  sets?: number;
  reps?: number;
  repsTo?: number;
  /** A timed hold or a bout's length. */
  seconds?: number;
  /** A run's distance. */
  miles?: number;
  /** Superset letter — rows sharing one are done back to back. */
  group?: string;
  note?: string;
}
export interface RewriteDay {
  name: string;
  rows: RewriteRow[];
}
export interface Rewrite {
  /** 1-based weeks, from the athlete's next session on. Days in schedule order (training days only); `null` = unchanged. */
  weeks: { week: number; days: (RewriteDay | null)[] }[];
  /** Sessions to rest instead (skip marks), 1-based week and day. */
  rest?: { week: number; day: number }[];
}

export type CheckResult =
  | { ok: true; structure: ProgramStructure; rest: { weekIndex: number; dayIndex: number }[]; dropped: Dropped[]; said: string[] }
  | { ok: false; reason: string };

export interface CheckContext {
  athlete: AuthorAthlete;
  catalog: readonly CatalogExercise[];
  canDo: EquipmentGate;
  /** A race program: the final week is never rewritten. */
  race?: boolean;
}

const RUN_KEY = 'cardio-run';
const MAX_LONG_RUN_MI = 22;
const isRunRow = (e: ProgramExercise) => e.kind === 'cardio' && e.activity === 'run';
const round1 = (n: number) => Math.round(n * 10) / 10;
const runMiles = (d: ProgramDay) => d.main.filter(isRunRow).reduce((t, e) => t + (e.targetMi ?? 0), 0);

/** A run as the logger knows it. */
function runRow(r: RewriteRow, name: string): ProgramExercise {
  return {
    catalogKey: cardioKey('run'),
    name,
    kind: 'cardio',
    activity: 'run',
    modality: 'outdoor',
    sets: 1,
    ...(r.miles != null && r.miles > 0 ? { targetMi: Math.max(1, round1(r.miles)) } : { targetSec: Math.max(600, Math.min(4 * 3600, Math.round(r.seconds ?? 1800))) }),
  };
}

const authored = (r: RewriteRow): AuthoredExercise => ({
  key: r.key,
  part: r.part ?? 'main',
  sets: r.sets ?? 3,
  reps: r.reps ?? 10,
  repsTo: r.repsTo ?? 0,
  seconds: r.seconds ?? 0,
  group: r.group ?? '',
  note: r.note ?? '',
});

/**
 * A RUN day as the plan wrote it keeps its warm-up, cool-down, stretches, each run's name, coach note and pace — Holt
 * sets only the distance or time of its runs (live run 11-19: rebuilding run days from his rows alone dropped all of
 * that, and a tempo day with a warm-up and a walk failed outright). His run rows map onto the plan's main runs in
 * order; any extra he wrote is appended as an easy run.
 */
function runDayFrom(rd: RewriteDay, before: ProgramDay): ProgramDay {
  const wanted = rd.rows.filter((r) => r.key === RUN_KEY && (r.part ?? 'main') === 'main');
  let k = 0;
  const main = before.main.map((e) => {
    if (!isRunRow(e)) return e;
    const r = wanted[k];
    k += 1;
    if (!r) return e;
    if (r.miles != null && r.miles > 0 && e.targetMi != null) return { ...e, targetMi: Math.max(1, round1(r.miles)) };
    if (r.seconds != null && r.seconds > 0 && e.targetSec != null) return { ...e, targetSec: Math.max(600, Math.min(4 * 3600, Math.round(r.seconds / 60) * 60)) };
    if (r.miles != null && r.miles > 0) return { ...e, targetMi: Math.max(1, round1(r.miles)), targetSec: null };
    return e;
  });
  for (const extra of wanted.slice(k)) main.push(runRow(extra, 'Easy Run'));
  return { ...before, main };
}

/** One rewritten session → a `ProgramDay`, or null when nothing usable came back (the session is then kept). */
function buildDay(rd: RewriteDay, before: ProgramDay, cx: CheckContext, dropped: Dropped[]): ProgramDay | null {
  const wasRunDay = before.main.length > 0 && before.main.every(isRunRow);
  const mainRows = rd.rows.filter((r) => (r.part ?? 'main') === 'main');
  const runs = mainRows.filter((r) => r.key === RUN_KEY);
  // A run day stays a run day when he wrote runs for it: only distances/times move.
  if (wasRunDay && runs.length && runs.length === mainRows.length) return runDayFrom(rd, before);
  const rest = rd.rows.filter((r) => r.key !== RUN_KEY);
  if (runs.length && !rest.length) {
    return { ...before, name: rd.name || before.name, warmup: [], main: runs.map((r) => runRow(r, rd.name || 'Run')), cooldown: [] };
  }
  const v = validateAuthored({ say: '', title: rd.name, unmet: [], days: [{ name: rd.name, exercises: rest.map(authored) }] }, cx.athlete, cx.catalog, cx.canDo);
  if (!v) return null;
  for (const d of v.dropped) if (!dropped.some((x) => x.name === d.name)) dropped.push(d);
  const day = v.days[0];
  /* What he did not write stays the session's own: its warm-up and cool-down, and the coach note on a movement kept. */
  const notes = new Map(before.main.filter((e) => e.catalogKey && e.coachNote).map((e) => [e.catalogKey as string, e.coachNote]));
  const main = day.main.map((e) => (!e.coachNote && e.catalogKey && notes.has(e.catalogKey) ? { ...e, coachNote: notes.get(e.catalogKey) } : e));
  return {
    ...before,
    name: rd.name || before.name,
    warmup: rd.rows.some((r) => r.part === 'warmup') ? day.warmup : before.warmup,
    main: [...main, ...runs.map((r) => runRow(r, 'Run'))],
    cooldown: rd.rows.some((r) => r.part === 'cooldown') ? day.cooldown : before.cooldown,
  };
}

export function checkRewrite(before: ProgramStructure, marks: readonly SessionMark[], rw: Rewrite, cx: CheckContext): CheckResult {
  const first = editableSessions(before, marks, 1)[0];
  if (!first) return { ok: false, reason: "Every session in this program is done — there's nothing left in it to change." };
  const weeks = Math.max(1, before.weeks);
  const lockedWeek = cx.race ? weeks - 1 : -1;
  const plans = materialise(before);
  const dropped: Dropped[] = [];
  const said: string[] = [];
  const keptWeeks: number[] = [];
  let changedFrom = Infinity;

  for (const wk of rw.weeks) {
    const w = wk.week - 1;
    if (w < first.at.weekIndex || w >= weeks || w === lockedWeek) continue;
    const raw = plans[w].days;
    const sessions = trainingDays(raw);
    if (wk.days.length !== sessions.length) {
      keptWeeks.push(w + 1);
      continue;
    }
    let s = 0;
    for (let i = 0; i < raw.length; i += 1) {
      if (!trainingDays([raw[i]]).length) continue; // a rest day in the raw week
      const d = s;
      s += 1;
      if (!canEdit(marks, w, d)) continue;
      const rd = wk.days[d];
      if (!rd) continue;
      const built = buildDay(rd, raw[i], cx, dropped);
      if (!built) {
        said.push(`I kept week ${w + 1}'s ${raw[i].name} as it was — what I wrote for it didn't hold up.`);
        continue;
      }
      raw[i] = built;
      changedFrom = Math.min(changedFrom, w);
    }
  }
  if (keptWeeks.length) {
    said.push(`I kept week${keptWeeks.length > 1 ? 's' : ''} ${keptWeeks.join(', ')} as ${keptWeeks.length > 1 ? 'they were' : 'it was'}: the program you've started keeps its number of sessions. Fewer days is a rest day, not a deleted one.`);
  }

  // ── running safety, week by week from the first changed week ──
  // The envelope is the ENGINE'S OWN PLAN (its build, cutback weeks and taper): a rewrite may cut freely, but a run may
  // not go more than ~10% past the same run in the plan — so the week keeps its shape (the long run stays the long run).
  // Running added where the plan had none starts small and grows ~10% a week. Never past 22 mi, never under a mile.
  let pulled = false;
  if (Number.isFinite(changedFrom)) {
    for (let w = changedFrom; w < weeks; w += 1) {
      if (w === lockedWeek) continue;
      const planned = trainingDays(plannedDays(before, w));
      const cur = trainingDays(plans[w].days);
      for (const [d, day] of cur.entries()) {
        if (!canEdit(marks, w, d)) continue;
        const plannedRuns = (planned[d]?.main ?? []).filter(isRunRow);
        let k = 0;
        for (const e of day.main) {
          if (!isRunRow(e)) continue;
          const slot = plannedRuns[k];
          k += 1;
          if (!slot) continue;
          if (e.targetMi != null && slot.targetMi != null) {
            const cap = Math.min(MAX_LONG_RUN_MI, Math.floor(slot.targetMi * 1.1 * 10) / 10);
            if (e.targetMi > cap) {
              e.targetMi = cap;
              pulled = true;
            }
          }
          if (e.targetSec != null && slot.targetSec != null) {
            const capSec = Math.floor((slot.targetSec * 1.1) / 60) * 60;
            if (e.targetSec > capSec) {
              e.targetSec = capSec;
              pulled = true;
            }
          }
        }
      }
      // Running the plan never had this week: a week-level ceiling instead.
      if (runMilesOf(planned) === 0) {
        const prevAfter = w > 0 ? trainingDays(plans[w - 1].days) : [];
        const capWeek = runMilesOf(prevAfter) * 1.1 + 3;
        const after = runMilesOf(cur);
        if (after > capWeek) {
          const f = capWeek / after;
          for (const [d, day] of cur.entries()) {
            if (!canEdit(marks, w, d)) continue;
            for (const e of day.main) if (isRunRow(e) && e.targetMi != null) e.targetMi = Math.max(1, Math.floor(e.targetMi * f * 10) / 10);
          }
          pulled = true;
        }
      }
      for (const day of cur) for (const e of day.main) if (isRunRow(e) && e.targetMi != null && e.targetMi > MAX_LONG_RUN_MI) e.targetMi = MAX_LONG_RUN_MI;
    }
  }
  if (pulled) said.push('I eased a few runs back: no week goes more than about 10% past what your plan had there, and the long run the same.');

  // ── rest marks: editable sessions only, never the locked week ──
  const rest: { weekIndex: number; dayIndex: number }[] = [];
  for (const r of rw.rest ?? []) {
    const w = r.week - 1;
    const d = r.day - 1;
    if (w < 0 || w >= weeks || w === lockedWeek || !canEdit(marks, w, d)) continue;
    if (d < 0 || d >= trainingDays(plans[w].days).length) continue;
    if (!rest.some((x) => x.weekIndex === w && x.dayIndex === d)) rest.push({ weekIndex: w, dayIndex: d });
  }

  if (!Number.isFinite(changedFrom) && !rest.length) {
    return { ok: false, reason: said[0] ?? "Nothing I wrote could go in — your program is unchanged." };
  }
  const result = commit(before, plans);
  if (!result.ok) return { ok: false, reason: result.refusal.message };
  return { ok: true, structure: result.structure, rest, dropped, said };
}

function runMilesOf(days: readonly ProgramDay[]): number {
  return days.reduce((t, d) => t + runMiles(d), 0);
}
