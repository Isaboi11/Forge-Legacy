/**
 * Program progress, schedule and log derivation — the model behind Program Detail (`Forge Program.dc`).
 * Pure (no JSON, no Supabase) so every rule here is unit-testable under `node --test`.
 *
 * The core idea: a program prescribes `weeks × daysPerWeek` sessions. Saved workouts carrying this
 * program's id ARE the progress — ordered by when they were started, the Nth saved workout is week
 * `floor(N / daysPerWeek)`, day `N % daysPerWeek`. Nothing is stored twice; there is no separate
 * progress cursor to drift out of sync with the workouts the athlete actually logged.
 */

import type { ProgramDay, ProgramExercise, ProgramStructure } from '@/data/programs-live';
import { blockRoundsText, deriveBlocks, isAmrap, schemeText, supersetBlockLetters, type PrescriptionBlock } from './prescription.ts';
import { contextMaxFor, loadText, type LoadContext } from './percent-max.ts';
// Relative + extensioned: `@/` is TYPE-ONLY in domain code, and this is a runtime read.
import { STRUCTURED_DEVELOPMENT_MIN_WEEKS } from '../rank/thresholds.ts';

export type { LoadContext };

/**
 * ⚠ `'finished'`, NOT `'completed'` — and the distinction is load-bearing in this very file.
 *
 * `SessionState` below is `'completed' | 'skipped'` and describes ONE session's mark. Both types are in
 * scope simultaneously in `src/app/program/[id].tsx`, and `x === 'completed'` compiles against either, so
 * a mix-up would be invisible to the compiler. The user-facing copy is still "Week complete"; only the
 * wire value differs. Same choice as migration 0155's enum label.
 *
 * `finished` = the program reached its last session but was designed for fewer than
 * `STRUCTURED_DEVELOPMENT_MIN_WEEKS` weeks, so it earns no rank credit and no Programs honors (D-RCM-30).
 * It is otherwise a sealed record exactly like `graduated`: permanent, undeletable, never reactivated.
 */
export type ProgramState = 'future' | 'active' | 'graduated' | 'finished' | 'ended_early';

/** The three terminal states. A program here is history and nothing may be added to it (PA2-D7). */
export const SEALED_STATES: readonly ProgramState[] = ['graduated', 'finished', 'ended_early'];

export const isSealed = (s: ProgramState): boolean => SEALED_STATES.includes(s);

/** A saved workout attributed to a program, with everything the log needs. */
export interface LoggedWorkout {
  id: string;
  name: string;
  startedAt: string; // ISO
  durationSec: number | null;
  exercises: LoggedExercise[];
}
export interface LoggedExercise {
  name: string;
  section: string;
  sets: LoggedSet[];
}
export interface LoggedSet {
  setIndex: number;
  weight: number | null;
  reps: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHAPE
// ─────────────────────────────────────────────────────────────────────────────

/** The prescribed days for a given week — the per-week plan in Customize mode, else the template. */
export function plannedDays(structure: ProgramStructure, weekIndex: number): ProgramDay[] {
  if (structure.vary && structure.weekPlans && structure.weekPlans[weekIndex]) {
    return structure.weekPlans[weekIndex].days;
  }
  return structure.days;
}

/** Days that actually prescribe something — an empty day is not a session the athlete owes. */
export function trainingDays(days: ProgramDay[]): ProgramDay[] {
  return days.filter((d) => d.warmup.length + d.main.length + d.cooldown.length > 0);
}

/** How many weeks the program runs, floored at one. */
const weekCount = (s: ProgramStructure): number => Math.max(1, s.weeks);

/**
 * Sessions in each week, one entry per week.
 *
 * ══ WHY THIS IS AN ARRAY ══
 *
 * Weeks are not all the same size. A real block runs six days for two weeks and then five, or drops a
 * conditioning day in a deload. Deriving ONE number from week 1 and multiplying reported a length the
 * program does not have, and — worse — walked the schedule with a stride that stopped matching it: on
 * the first session past the first short week, `nextSession` asked a five-day week for its sixth day,
 * got nothing, and returned null. The athlete's "Continue Training" button went dead mid-program with
 * every session still unlogged.
 *
 * A week with nothing built falls back to the CONFIGURED count, so a program that is still being
 * authored still reports a sane shape instead of a length of zero.
 */
export function weekSizes(structure: ProgramStructure): number[] {
  return Array.from({ length: weekCount(structure) }, (_, wi) => {
    const built = trainingDays(plannedDays(structure, wi)).length;
    return Math.max(1, built || structure.daysPerWeek);
  });
}

/** One prescribed session's place in the program. `day` is null only for an unbuilt fallback slot. */
export interface ScheduleSlot {
  weekIndex: number;
  dayIndex: number;
  day: ProgramDay | null;
}

/**
 * Every prescribed session, in order — the single spine that progress, the log and "what's next" all
 * read. Walking a real list rather than doing arithmetic with a stride is what makes ragged weeks work.
 */
export function scheduleSlots(structure: ProgramStructure): ScheduleSlot[] {
  const out: ScheduleSlot[] = [];
  weekSizes(structure).forEach((size, weekIndex) => {
    const days = trainingDays(plannedDays(structure, weekIndex));
    for (let dayIndex = 0; dayIndex < size; dayIndex += 1) {
      out.push({ weekIndex, dayIndex, day: days[dayIndex] ?? null });
    }
  });
  return out;
}

/**
 * Sessions in the FIRST week — the headline "3 days a week" figure.
 *
 * Deliberately not used for scheduling any more; `scheduleSlots` is. Kept because a program's summary
 * line still wants a single number, and week 1 is the honest one to show.
 */
export function sessionsPerWeek(structure: ProgramStructure): number {
  return weekSizes(structure)[0];
}

export function totalSessions(structure: ProgramStructure): number {
  return scheduleSlots(structure).length;
}

/**
 * Has the athlete logged every session this program prescribes? — i.e. the program has graduated.
 *
 * ══ THIS RULE IS IMPLEMENTED TWICE, AND THE OTHER COPY IS IN SQL ══
 *
 * `public.program_total_sessions(jsonb)` (migration `0104_program_graduation.sql`) is a transliteration
 * of `weekSizes` + `totalSessions` above. It has to exist because `save_workout` decides graduation
 * server-side — an athlete must not be able to assert their own graduation, since five permanent honors
 * and a rank family hang off the count.
 *
 * **Change this rule and you must change that function.** The golden vectors in
 * `__tests__/progress-core.test.mjs` are duplicated verbatim into a self-check in 0104 that aborts the
 * migration on a mismatch, so the two can only drift through a deliberate edit to both test lists.
 *
 * Extracted from the anonymous `const done = completed >= total` inside `computeProgress` so the rule
 * has a name, one TS implementation, and something for the SQL comment to point at.
 */
export function isFinalSession(structure: ProgramStructure, completedCount: number): boolean {
  return completedCount >= totalSessions(structure);
}

/**
 * Does finishing this program earn a structured-development credit? — D-RCM-30.
 *
 * ══ THIS RULE ALSO EXISTS TWICE, FOR THE SAME REASON AS THE ONE ABOVE ══
 *
 * `public.program_earns_credit(jsonb)` (migration `0156_short_program_credit.sql`) is its SQL twin, with
 * the same golden vectors asserted at apply time. The server must decide credit without trusting the
 * client, because what a graduation buys is a rank family and five never-revocable honors — a
 * client-supplied "this one counts" flag would be the most attractive field in the app.
 *
 * ══ WHAT IT READS, AND WHAT IT DELIBERATELY DOES NOT ══
 *
 * The DECLARED `weeks` — the number the athlete chose before logging anything. Not `weekSizes().length`,
 * which floors each week at 1 and falls back to `daysPerWeek`, and so can differ; not elapsed calendar
 * time, which `Program-Architecture-Amendment-001` §4 forbids judging anyone by. An athlete who takes
 * nine months over an eight-week program has graduated it (PA2-D6).
 *
 * ══ FALSE IS THE SAFE ANSWER ══
 *
 * An unreadable structure earns nothing, mirroring 0104's rule that a null session total means "do not
 * graduate" rather than "graduate at zero". The product never fails open on a claim it cannot revoke.
 *
 * ⚠ IT IS EVALUATED ONCE, AT THE SEAL, and never re-derived — safe only because migration 0123 forbids
 * an active program changing its session count, so `weeks` cannot move afterwards (PA2-D4).
 */
export function earnsStructuredDevelopmentCredit(structure: ProgramStructure | null | undefined): boolean {
  const w = structure?.weeks;
  return typeof w === 'number' && Number.isFinite(w) && Math.floor(w) >= STRUCTURED_DEVELOPMENT_MIN_WEEKS;
}

export const dayLabel = (d: ProgramDay, i: number) => (d.name.trim() ? d.name : `Day ${d.letter || String.fromCharCode(65 + i)}`);

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

export interface ProgramProgress {
  completed: number;
  total: number;
  /** 1-based, clamped to the program length. */
  week: number;
  /** How many of THIS week's sessions are done. */
  completedThisWeek: number;
  perWeek: number;
  pct: number;
  /** Index of the next prescribed session, or null once every session is logged. */
  nextWeekIndex: number | null;
  nextDayIndex: number | null;
}

export function computeProgress(structure: ProgramStructure, completedCount: number): ProgramProgress {
  const slots = scheduleSlots(structure);
  const total = slots.length;
  const completed = Math.max(0, Math.min(total, completedCount));
  const done = isFinalSession(structure, completed);

  // The slot the athlete is standing on — the next one owed, or the last one when the program is done.
  const here = slots[done ? total - 1 : completed];
  const weekIndex = here?.weekIndex ?? 0;
  // Sessions that came before this week; what is left of `completed` is this week's own progress.
  const weekStart = slots.findIndex((s) => s.weekIndex === weekIndex);
  const perWeek = weekSizes(structure)[weekIndex] ?? 1;

  return {
    completed,
    total,
    week: weekIndex + 1,
    completedThisWeek: Math.max(0, completed - Math.max(0, weekStart)),
    perWeek,
    pct: total > 0 ? Math.round((completed / total) * 100) : 0,
    nextWeekIndex: done ? null : here?.weekIndex ?? null,
    nextDayIndex: done ? null : here?.dayIndex ?? null,
  };
}

/** The session "Continue Training" should open — the first one not yet logged. */
export function nextSession(
  structure: ProgramStructure,
  completedCount: number,
): { weekIndex: number; dayIndex: number; day: ProgramDay } | null {
  const slots = scheduleSlots(structure);
  const next = slots[Math.max(0, completedCount)];
  if (!next?.day) return null;
  return { weekIndex: next.weekIndex, dayIndex: next.dayIndex, day: next.day };
}

// ─────────────────────────────────────────────────────────────────────────────
// THE LOG — week → day → exercise → sets, completed rows real, future rows planned
// ─────────────────────────────────────────────────────────────────────────────

export interface LogSet {
  label: string;
  value: string;
}
export interface LogExercise {
  name: string;
  sets: LogSet[];
  /** Prescription shown when the session hasn't been trained yet. */
  planned: string;
  /**
   * "A1" / "A2" — which member of which superset this row is. Absent on everything else.
   *
   * The letter identifies the BLOCK and the number the position inside it, so a day with two supersets
   * reads A1/A2 then B1/B2 rather than two rows called A and two called B. Same rule as the logger and
   * both builders; see `supersetLabels`.
   */
  memberLabel?: string;
  /**
   * The block this row belongs to, stated on its FIRST member only — "Superset · 2 exercises,
   * alternated", "HIIT Finisher · 4 rounds". Empty on a loose exercise and on every later member.
   *
   * Without it the log lists a superset as two unrelated lifts in a suggestive order, which is exactly
   * how a superset gets trained as two ordinary exercises.
   */
  blockLabel?: string;
}
export interface LogDay {
  name: string;
  num: number;
  completed: boolean;
  date: string | null;
  meta: string;
  exercises: LogExercise[];
}
export interface LogWeek {
  week: number; // 1-based
  days: LogDay[];
  complete: boolean;
  completedCount: number;
}

const fmtWeight = (w: number | null) => (w != null && w > 0 ? `${w} lb` : null);

function plannedLine(d: ProgramDay, load?: LoadContext): LogExercise[] {
  // schemeText, not `sets × reps` — a ladder, a timed hold and a cardio bout all have to read as what
  // they are here, or the log describes a different session from the one the athlete is about to train.
  //
  // Blocks are derived with `deriveBlocks` rather than read off each row, because the block a row
  // belongs to is a property of its NEIGHBOURS — grouping by id alone fuses two circuits that happen
  // to share one. The label sits on the first member so it reads as a heading, not a repeated tag.
  const blocks = deriveBlocks([...d.warmup, ...d.main, ...d.cooldown]);
  /* Which superset each block is — "A", then "B". The letter is a fact about the DAY, so it has to be
     resolved over the whole list rather than inside one block's own map. */
  const letters = supersetBlockLetters(blocks);
  return blocks.flatMap((b, bi) =>
    b.items.map((ex, i) => ({
      name: ex.name,
      sets: [],
      planned: [schemeText(ex), plannedLoad(ex, load)].filter(Boolean).join(' '),
      // "A1" / "A2" beside the lift, so the log reads the way the logger and the builder do.
      ...(letters[bi] ? { memberLabel: `${letters[bi]}${i + 1}` } : null),
      ...(i === 0 && b.groupId && b.items.length > 1 ? { blockLabel: blockLabelOf(b, letters[bi]) } : null),
    })),
  );
}

/**
 * The load half of a planned line — "@ 75% — 305 lb".
 *
 * Empty when nothing prescribes a percentage. With no context, or with a lift whose max is unset, it
 * degrades to the bare "@ 75%" rather than resolving a number from nothing.
 */
function plannedLoad(ex: ProgramExercise, load?: LoadContext): string {
  return loadText(ex, contextMaxFor(load, ex), load?.unit ?? '', load?.rules);
}

/** "Superset A · 2 exercises, alternated" · "HIIT Finisher · 4 rounds" · "AMRAP · 8:00 cap". */
function blockLabelOf(b: PrescriptionBlock, letter?: string | null): string {
  /* The letter goes on the DEFAULT name only. A block the author named "Chest Finisher" is already
     distinguishable, and "Chest Finisher A" would be lettering something that has a name. */
  const name = b.name || (b.kind === 'superset' ? `Superset${letter ? ` ${letter}` : ''}` : 'Circuit');
  if (isAmrap(b)) return `${name} · ${blockRoundsText(b)} cap`;
  if (b.kind === 'superset') return `${name} · ${b.items.length} exercises, alternated`;
  const r = blockRoundsText(b);
  return r ? `${name} · ${r} rounds` : name;
}

function loggedLine(w: LoggedWorkout): LogExercise[] {
  return w.exercises.map((ex) => ({
    name: ex.name,
    planned: '',
    sets: ex.sets.map((s) => {
      const weight = fmtWeight(s.weight);
      return {
        label: `Set ${s.setIndex + 1}`,
        value: weight && s.reps != null ? `${weight} × ${s.reps}` : s.reps != null ? `${s.reps} reps` : '—',
      };
    }),
  }));
}

const dateLabel = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Build the full week-by-week log. Sessions are matched to slots by ORDER, not by name — an athlete who
 * swapped or renamed a day still gets a truthful log, and a workout logged off-plan still occupies the
 * slot it was trained in.
 */
export function buildLog(
  structure: ProgramStructure,
  logged: LoggedWorkout[],
  /**
   * Percentage prescriptions resolve HERE, at render, against the run's frozen maxes — which is why
   * changing a max needs no recalculation pass and no migration of past sessions.
   *
   * A completed day renders from `loggedLine` (what the athlete actually lifted) and a future day from
   * `plannedLine` (what the program asks for). Changing the max therefore moves every session not yet
   * trained and cannot move one already trained: the completed branch never reads a percentage at all.
   */
  load?: LoadContext,
): LogWeek[] {
  const sizes = weekSizes(structure);
  const ordered = [...logged].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  // Where each week starts in the flat session list. Ragged weeks mean this is a running total, not a
  // multiplication — week 4 of a 6,6,5,… program starts at session 17, never at 4 × anything.
  const offsets = sizes.reduce<number[]>((acc, size, i) => [...acc, (acc[i - 1] ?? 0) + (sizes[i - 1] ?? 0)], []);

  return sizes.map((size, wi) => {
    const planned = trainingDays(plannedDays(structure, wi));
    const days: LogDay[] = Array.from({ length: size }, (_, di) => {
      const slot = offsets[wi] + di;
      const done = ordered[slot];
      const plan = planned[di];
      const num = slot + 1;

      if (done) {
        const sets = done.exercises.reduce((a, e) => a + e.sets.length, 0);
        const mins = done.durationSec != null ? Math.round(done.durationSec / 60) : null;
        return {
          name: done.name || (plan ? dayLabel(plan, di) : `Day ${di + 1}`),
          num,
          completed: true,
          date: dateLabel(done.startedAt),
          meta: [mins != null ? `${mins} min` : null, `${sets} ${sets === 1 ? 'set' : 'sets'}`]
            .filter(Boolean)
            .join(' · '),
          exercises: loggedLine(done),
        };
      }

      return {
        name: plan ? dayLabel(plan, di) : `Day ${di + 1}`,
        num,
        completed: false,
        date: null,
        meta: plan ? `${plan.main.length + plan.warmup.length + plan.cooldown.length} planned` : 'Rest',
        exercises: plan ? plannedLine(plan, load) : [],
      };
    });

    const completedCount = days.filter((d) => d.completed).length;
    return { week: wi + 1, days, complete: completedCount === days.length && days.length > 0, completedCount };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS — the tiles above the log
// ─────────────────────────────────────────────────────────────────────────────

export interface ProgramStats {
  workouts: number;
  sets: number;
  volume: number; // lb
  heaviest: number; // lb
}

export function computeStats(logged: LoggedWorkout[]): ProgramStats {
  let sets = 0;
  let volume = 0;
  let heaviest = 0;
  for (const w of logged) {
    for (const ex of w.exercises) {
      for (const s of ex.sets) {
        sets += 1;
        if (s.weight != null && s.weight > 0) {
          heaviest = Math.max(heaviest, s.weight);
          if (s.reps != null) volume += s.weight * s.reps;
        }
      }
    }
  }
  return { workouts: logged.length, sets, volume: Math.round(volume), heaviest };
}

/** Compact volume for a stat tile: 850 → "850 lb", 12,450 → "12.5k lb", 120,000 → "120k lb". */
export function fmtVolume(lb: number): string {
  if (lb <= 0) return '—';
  if (lb < 1000) return `${lb} lb`;
  const k = lb / 1000;
  // Keep a decimal until the number is big enough that it stops carrying information.
  const shown = k < 100 ? k.toFixed(1).replace(/\.0$/, '') : String(Math.round(k));
  return `${shown}k lb`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESENTATION — the five states of the CTA bar
// ─────────────────────────────────────────────────────────────────────────────

export interface StateView {
  pill: string;
  cta: string;
  secondary: string | null;
}

export function viewForState(state: ProgramState, owned: boolean): StateView {
  if (!owned) return { pill: 'Preview', cta: 'Start Program', secondary: null };
  switch (state) {
    case 'future':
      return { pill: 'Planned', cta: 'Start Program', secondary: 'Remove from Planned' };
    case 'active':
      return { pill: 'Active', cta: 'Continue Training', secondary: 'End Program' };
    // W-3 §7.2's own words. "Run Again" read like a rewind, which is exactly the thing this must not be
    // and exactly what the button used to do — it creates a NEW program and leaves the record sealed.
    case 'graduated':
      return { pill: 'Graduated', cta: 'Run This Program Again', secondary: null };
    // A week that finished. Sealed exactly like a graduation, and re-run the same way — the same week run
    // four times is four honest records, which is most of the point of a week template (PA2-D8). The word
    // "graduated" is deliberately absent: the ladder did not count this, so the screen does not say it did.
    case 'finished':
      return { pill: 'Week complete', cta: 'Run This Week Again', secondary: null };
    case 'ended_early':
      return { pill: 'Ended early', cta: 'Restart Program', secondary: null };
    default:
      /* ⚠ EXHAUSTIVE ON PURPOSE. This used to be `default:` returning the Planned view, so widening
         `ProgramState` without adding a case compiled cleanly and put a **Start Program** button on a
         sealed record — a silent, plausible-looking failure. Now a new state is a type error here. */
      return assertNever(state);
  }
}

/** Compile-time proof that a switch covered every case; throws only if one is reached at runtime. */
function assertNever(x: never): never {
  throw new Error(`unhandled program state: ${String(x)}`);
}

/**
 * ══ WHERE EACH PROGRAM SITS ON THE WORKOUTS TAB ══
 *
 * Four shelves, not one list (`Forge Programs Catalog.dc`): the one in flight, the ones queued behind
 * it, the ones the athlete WROTE, and the ones they have finished. The screen used to put every row it
 * owned under "Your Programs", which listed the active program twice, filed a plan for next month as
 * something the athlete had authored, and stood a sealed record beside a live one.
 *
 * Generic over the row so this stays a pure derivation the tests can drive with plain objects.
 */
export interface Shelvable {
  state: ProgramState;
  /** The catalog definition this run came from; null for a program the athlete built. */
  sourceDefinitionId: string | null;
}

export interface ProgramShelves<T> {
  active: T | null;
  /** Queued, not started. */
  planned: T[];
  /** Authored by the athlete, and not already shown as active or planned. */
  built: T[];
  /** Sealed runs of Forge programs — permanent records (Amendment-001 §6). */
  past: T[];
}

export function shelvePrograms<T extends Shelvable>(mine: T[]): ProgramShelves<T> {
  const sealed = (p: T) => isSealed(p.state);
  return {
    active: mine.find((p) => p.state === 'active') ?? null,
    planned: mine.filter((p) => p.state === 'future'),
    built: mine.filter((p) => p.sourceDefinitionId == null && p.state !== 'active' && p.state !== 'future'),
    past: mine.filter((p) => p.sourceDefinitionId != null && sealed(p)),
  };
}

/**
 * The catalog definitions the athlete has a LIVE claim on — what Discover leaves out.
 *
 * Deliberately not "everything they have ever adopted". That hid a program from the catalogue the
 * moment it was finished, permanently, though 0104 dropped the one-row-per-source index precisely so a
 * program could be run again. Discover is a shelf, and a finished program goes back on it.
 */
export function liveSourceIds(mine: Shelvable[]): Set<string> {
  return new Set(
    mine
      .filter((p) => p.state === 'future' || p.state === 'active')
      .map((p) => p.sourceDefinitionId)
      .filter((id): id is string => !!id),
  );
}

/** Distinct equipment across the program, for the Equipment pills. */
export function equipmentOf(structure: ProgramStructure): string[] {
  const seen = new Set<string>();
  const scan = (days: ProgramDay[]) => {
    for (const d of days) {
      for (const ex of [...d.warmup, ...d.main, ...d.cooldown]) {
        if (ex.equip) seen.add(ex.equip);
      }
    }
  };
  scan(structure.days);
  for (const w of structure.weekPlans ?? []) scan(w.days);
  return [...seen].sort();
}

// ─────────────────────────────────────────────────────────────────────────────
// WHICH SESSIONS HAVE BEEN TOUCHED — swapping and skipping (0119)
// ─────────────────────────────────────────────────────────────────────────────

/** What an athlete has done with one prescribed session. */
export type SessionState = 'completed' | 'skipped';

/** One row of `program_sessions`, as far as the schedule cares. */
export interface SessionMark {
  weekIndex: number;
  dayIndex: number;
  state: SessionState;
}

/** A slot plus what has happened to it. `state` is null when the session is still outstanding. */
export interface SlotState extends ScheduleSlot {
  ordinal: number;
  state: SessionState | null;
}

const slotKey = (weekIndex: number, dayIndex: number) => `${weekIndex}:${dayIndex}`;

/**
 * The whole schedule, with each session's state attached.
 *
 * ══ WHY THIS REPLACED A COUNT ══
 *
 * Progress used to be `count(workouts with this program_id)`, and "next up" was `slots[count]`. That
 * arithmetic can only describe a program done strictly in order, which is why swapping was impossible:
 * training Day D instead of Day C moved the count to 3, so the app served D again and never offered C,
 * while believing it had watched both happen. Nothing was lying — there was simply nowhere to record
 * which session a workout satisfied.
 *
 * ⚠ A SKIPPED SESSION IS TOUCHED, NOT TRAINED. It counts toward finishing the program (PO decision,
 * 2026-08-07: "if they skip a day it's okay and it will still count towards completing the program") and
 * `state` keeps saying which it was, so nothing downstream can present a skip as a workout. Counting it
 * and claiming it are different things.
 */
export function slotStates(structure: ProgramStructure, marks: readonly SessionMark[]): SlotState[] {
  const byKey = new Map(marks.map((m) => [slotKey(m.weekIndex, m.dayIndex), m.state]));
  return scheduleSlots(structure).map((slot, ordinal) => ({
    ...slot,
    ordinal,
    state: byKey.get(slotKey(slot.weekIndex, slot.dayIndex)) ?? null,
  }));
}

/**
 * The session "Continue Training" should open — the first one NOT yet touched.
 *
 * The SQL twin lives in `save_workout` (0119), which resolves the same slot server-side when the client
 * sends none. They agree by construction: both take the first slot in `scheduleSlots` order with no row
 * against it.
 */
export function nextOpenSlot(structure: ProgramStructure, marks: readonly SessionMark[]): SlotState | null {
  return slotStates(structure, marks).find((s) => s.state === null && s.day != null) ?? null;
}

/**
 * The marks that still land on a real session — the ONLY ones any count may use.
 *
 * ⚠ A MARK CAN OUTLIVE ITS SLOT. Rows are keyed by (week_index, day_index) and nothing deletes them
 * when the structure shrinks, so a program edited from 8 weeks down to 4 keeps every row it ever wrote.
 * Counting those orphans is not a rounding error — graduation is `touched >= totalSessions(structure)`
 * and the total is recomputed from the CURRENT structure, so 21 rows against a 12-session structure
 * reads as finished. That fires a PROGRAM_GRADUATED timeline event and five honors nothing can revoke
 * (Amendment-001 §1: a graduated program cannot be reactivated).
 *
 * The structural edit that creates orphans is now blocked at both ends (W-5 future-state only, plus the
 * server guard), so this is the second line rather than the first. It stays because the first line is a
 * UI rule and this one is arithmetic: any future path that reshapes a live program — the coach's edit
 * layer included — gets a count that cannot over-report, without having to remember to.
 *
 * SQL twin: the `v_done` counts in `save_workout` and `skip_program_session` join `program_slots` for
 * exactly this reason. Change the rule here and change it there.
 */
function liveMarks(structure: ProgramStructure, marks: readonly SessionMark[]): SessionMark[] {
  const live = new Set(scheduleSlots(structure).map((s) => slotKey(s.weekIndex, s.dayIndex)));
  return marks.filter((m) => live.has(slotKey(m.weekIndex, m.dayIndex)));
}

/** How many sessions are accounted for — trained OR skipped. This is what progress and graduation count. */
export function touchedCount(structure: ProgramStructure, marks: readonly SessionMark[]): number {
  return liveMarks(structure, marks).length;
}

/**
 * The honest split behind a finished program: what was trained, and what was passed over.
 *
 * Kept separate from `touchedCount` on purpose. A graduation may be reached with skips in it, and the
 * copy that announces it is entitled to say so — "28 trained, 4 skipped" rather than "32 workouts",
 * which would be a claim about work nobody did.
 */
export function sessionTally(
  structure: ProgramStructure,
  marks: readonly SessionMark[],
): { trained: number; skipped: number; touched: number } {
  const live = liveMarks(structure, marks);
  const trained = live.filter((m) => m.state === 'completed').length;
  return { trained, skipped: live.length - trained, touched: live.length };
}

/** Every session accounted for — the graduation condition, skips included. */
export function isProgramFinished(structure: ProgramStructure, marks: readonly SessionMark[]): boolean {
  return touchedCount(structure, marks) >= totalSessions(structure);
}

/**
 * Swap two sessions' positions within one week — a real reorder of the plan, not a one-off.
 *
 * ══ WHY IT MATERIALISES PER-WEEK PLANS ══
 *
 * A non-varying program stores ONE `days` array that every week repeats. Reordering that array would
 * change the order of every remaining week — so swapping Tuesday and Thursday in week 3 because the rack
 * was busy would silently rewrite weeks 4 through 8 as well. Almost never what anyone means.
 *
 * So the first swap converts the program to per-week plans (`vary: true`, every week materialised as its
 * own copy) and edits only the week asked for. That is the same "Customize" shape the builder already
 * writes, so nothing downstream learns a new structure — `plannedDays` has always preferred `weekPlans`.
 *
 * ⚠ BOTH DAYS MUST BE UNTOUCHED, and the caller is responsible for only offering those.
 * `program_sessions` rows are keyed by (week, dayIndex), so moving a day that has been trained or
 * skipped would silently re-point that record at a different workout — the app would then claim you did
 * a session you never did. Untouched days carry no rows, so swapping them moves nothing but the plan.
 * Days at other positions keep their index and are unaffected.
 */
export function swapSessionOrder(
  structure: ProgramStructure,
  weekIndex: number,
  a: number,
  b: number,
): ProgramStructure {
  if (a === b) return structure;
  const weeks = weekCount(structure);
  if (weekIndex < 0 || weekIndex >= weeks) return structure;

  // Materialise every week from whatever it resolves to today, so the untouched weeks keep the plan they
  // already had rather than inheriting the edit.
  const plans = Array.from({ length: weeks }, (_, wi) => ({ days: [...plannedDays(structure, wi)] }));
  const days = plans[weekIndex]?.days;
  if (!days || a < 0 || b < 0 || a >= days.length || b >= days.length) return structure;

  [days[a], days[b]] = [days[b], days[a]];
  return { ...structure, vary: true, weekPlans: plans };
}
