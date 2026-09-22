/**
 * "Change my program by typing" — the athlete's words, resolved against the program they are running.
 *
 * ══ WHERE THIS SITS ══
 *
 * `coach-interpret` reads *"swap bench for dumbbell press on Monday"* into an `EditIntent` — the athlete's
 * own words, field by field, with no index and no catalogue key in it. This module finds those words in
 * the real program: which session "Monday" is, which row "bench" is, which catalogue entry "dumbbell
 * press" is. It then hands the change to `edit-ops.ts`, which is the only thing that ever writes. So the
 * three invariants in that file's header hold here by construction: a trained or skipped session is never
 * touched, `totalSessions` never moves, and the scope is the smallest one that makes sense.
 *
 * ══ ⚠ IT NEVER GUESSES BETWEEN TWO PLAUSIBLE ANSWERS ══
 *
 * Two bench presses in the day, two leg days in the week, a program whose sessions carry no weekday —
 * each of those comes back as a question with the real options on it, never a pick. A wrong edit is
 * invisible until the athlete is standing at the wrong bar, and a question costs one tap.
 *
 * ══ ⚠ DAYS ARE SCHEDULE INDICES ══
 *
 * `dayIndex` counts TRAINING days, the way the marks and `edit-ops` count them — never the raw array slot,
 * which keeps rest days. Every lookup below goes through `rawIndexOf` / `trainingDays` for that reason
 * (Decision Queue #23: Friday's pull-ups asked for, Wednesday's squats changed).
 *
 * ══ WHAT "MONDAY" MEANS IN A PROGRAM WITH NO CALENDAR ══
 *
 * A `ProgramDay` has no weekday. One is known only when the week says so: day names that carry one
 * ("Mon", "Wednesday — Lower"), or a seven-slot week, which reads Monday first. Otherwise a weekday is
 * asked about rather than mapped onto "the first session", and "tomorrow" / "today" mean the next session
 * the athlete owes.
 *
 * ══ THE OPS (2026-09-22) ══
 *
 * Row edits (swap · sets · reps · distance · duration · remove), whole-day (rebuild · add), and three that
 * reach across a week: `move` (a reorder through `schedule-edit.reorderWeek`, pinned sessions fixed exactly
 * as the Reorder sheet fixes them), `volume` (one set up or down on a muscle group's rows, inside
 * `validateProgram`'s caps, or one accessory in or out), and `skip` — which is NOT a structure edit: its plan
 * (`kind: 'skip'`) returns the positions for `skipProgramSession`, and the structure is never touched.
 *
 * Pure: type-only `@/` imports, relative value imports, injected catalogue.
 */

import type { ProgramDay, ProgramExercise, ProgramStructure } from '@/data/programs-live';
import type { SessionMark } from '../program/progress-core.ts';
import { plannedDays, trainingDays } from '../program/progress-core.ts';
import { moveInOrder, rawIndexOf, reorderWeek, transposition, weekSessionCount } from '../program/schedule-edit.ts';
import { matchExercise, tokenize } from '../program/exercise-match.ts';
import { resolveAgainstCatalog } from '../exercise-picker/aliases.ts';

import { candidatesFor, fillSlot, isCompound, type CandidateContext, type CatalogExercise } from './candidates.ts';
import { describe, editableSessions, replacementsFor, valuesFor } from './edit-chat.ts';
import {
  addExercise,
  canEdit,
  MIN_EXERCISES_AFTER_REMOVE,
  rebuildDay,
  removeExercise,
  setCardioTarget,
  setPrescription,
  setSetsMany,
  swapExercise,
  type EditRefusal,
  type EditResult,
  type EditScope,
} from './edit-ops.ts';
import type { EditIntent } from './interpret-narrow.ts';
import { prescribeReps, roleFor, type PrescribeContext } from './prescribe.ts';
import { FOCUS_SPEC } from './rulebook/focus.ts';
import { bandFor, type PasCategory } from './rulebook/volume.ts';

export type { EditIntent };

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// RESULT
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * What the athlete is asked. The chat answers each by re-sending the intent with one field filled from the
 * chip: `which_day` → `day`, `which_exercise` → `exercise`, `which_replacement` → `to`, `which_value` → the
 * number, `which_position` (a `move` destination) → `to`, `which_week` (a `skip` week) → `week`.
 * `not_editable` is terminal — a refusal in Holt's words, with at most an alternative offered.
 */
export type EditAsk =
  | 'which_day'
  | 'which_exercise'
  | 'which_replacement'
  | 'which_value'
  | 'which_position'
  | 'which_week'
  | 'not_editable';

/** A session's place: SCHEDULE indices, exactly what `program_sessions` rows and `skipProgramSession` take. */
export interface SessionPosition {
  weekIndex: number;
  dayIndex: number;
}

/** A plan that changes the program's structure. `apply` returns the structure to save (`updateProgram`). */
export interface EditPlan {
  kind: 'structure';
  at: { weekIndex: number; dayIndex: number; exerciseIndex?: number };
  op: EditIntent['op'];
  /** "Week 3, Monday — Barbell Bench Press → Dumbbell Bench Press". What the athlete confirms. */
  label: string;
  /** The reach the athlete SAID, or null when they said nothing — ask with `SCOPE_CHOICES`. */
  scope: EditScope | null;
  /** Performs the edit through `edit-ops`. Defaults to what they said, else just this week. */
  apply(scope?: EditScope): EditResult;
}

/**
 * ⚠ A SKIP IS A SESSION MARK, NOT A STRUCTURE EDIT. The structure never changes; each position gets a
 * `skipped` row through the existing `skipProgramSession(programId, weekIndex, dayIndex)` RPC wrapper
 * (`data/programs-live.ts`), which ignores a session already touched. `structure` is the input, unchanged,
 * so a caller that still saves it writes nothing new — but the skip only happens when the positions are sent.
 */
export type SkipResult =
  | { ok: true; skip: SessionPosition[]; structure: ProgramStructure }
  | { ok: false; refusal: EditRefusal };

export interface SkipPlan {
  kind: 'skip';
  op: 'skip';
  /** The first session skipped. */
  at: { weekIndex: number; dayIndex: number };
  /** "Skip all 4 sessions of week 5". */
  label: string;
  /** Always set: a skip has no reach to choose, so the chat confirms rather than asking for a scope. */
  scope: EditScope;
  /** Every position to mark, soonest first — all untouched. */
  sessions: SessionPosition[];
  /** The positions to mark skipped. The argument is ignored; it exists so every plan applies the same way. */
  apply(scope?: EditScope): SkipResult;
}

export type TypedEditPlan = EditPlan | SkipPlan;

export type EditIntentResolution =
  | { ok: true; plan: TypedEditPlan }
  | { ok: false; ask: EditAsk; options: string[]; message: string };

export interface ResolveEditOptions {
  /** The athlete's candidate context (equipment, limitations). Absent = no gates beyond the catalogue. */
  ctx?: CandidateContext;
  /** For `rebuild` only — how a rebuilt slot with no prescription of its own is dosed. */
  prescribe?: Omit<PrescribeContext, 'weekIndex' | 'isDeload'>;
  /**
   * The program's PAS category, for the per-session caps a `volume` edit stays inside (`validateProgram`'s
   * ceiling). Absent: `prescribe.category`, else STRENGTH — the tightest lifting band.
   */
  category?: PasCategory;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// WORDS
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const WEEKDAY: Record<string, number> = {
  mon: 0, monday: 0, tue: 1, tues: 1, tuesday: 1, wed: 2, weds: 2, wednesday: 2,
  thu: 3, thur: 3, thurs: 3, thursday: 3, fri: 4, friday: 4, sat: 5, saturday: 5, sun: 6, sunday: 6,
};
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ORDINAL: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7,
  '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5, '6th': 6, '7th': 7,
};

/** Words that say "a session" without saying which. */
const FILLER = new Set([
  'the', 'my', 'this', 'that', 'on', 'for', 'in', 'of', 'a', 'an', 'at', 'to', 'day', 'session', 'workout',
  'training', 'week', 'next', 'coming', 'upcoming', 'one', 'it', 'is', 'lift', 'lifting', 'deload',
]);

/** Session-name words that mean the same session. Normalised (singular) on both sides. */
const SYNONYM: Record<string, string[]> = {
  leg: ['lower'], lower: ['leg'], chest: ['push'], push: ['chest'], back: ['pull'], pull: ['back'],
  run: ['running'], running: ['run'],
};

const words = (s: string): string[] =>
  s.toLowerCase().replace(/[’']s\b/g, '').split(/[^a-z0-9]+/).filter(Boolean);
const norm = (w: string): string => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// SESSIONS
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const isTraining = (d: ProgramDay): boolean => d.warmup.length + d.main.length + d.cooldown.length > 0;
const weekCount = (s: ProgramStructure): number => Math.max(1, s.weeks);

/**
 * weekday → raw index, when the week says which day is which; else null.
 *
 * Names first ("Mon", "Friday — Pull"); a week of exactly seven slots reads Monday first. A name that
 * claims two days, or two days claiming one weekday, is not a calendar and returns null.
 */
function weekdayMap(days: readonly ProgramDay[]): Map<number, number> | null {
  const byName = new Map<number, number>();
  for (let i = 0; i < days.length; i += 1) {
    const found = [...new Set(words(days[i].name).map((w) => WEEKDAY[w]).filter((n) => n !== undefined))];
    if (found.length > 1) return null;
    if (found.length === 1) {
      if (byName.has(found[0])) return null;
      byName.set(found[0], i);
    }
  }
  if (byName.size) return byName;
  if (days.length === 7) return new Map(days.map((_, i) => [i, i]));
  return null;
}

/** Schedule index of a raw slot, or -1 when the slot is a rest day. */
function scheduleIndexOf(days: readonly ProgramDay[], raw: number): number {
  if (!days[raw] || !isTraining(days[raw])) return -1;
  let n = -1;
  for (let i = 0; i <= raw; i += 1) if (isTraining(days[i])) n += 1;
  return n;
}

function sessionAt(structure: ProgramStructure, w: number, d: number): ProgramDay | undefined {
  const days = plannedDays(structure, w);
  const raw = rawIndexOf(days, d);
  return raw < 0 ? undefined : days[raw];
}

const cleanName = (d: ProgramDay): string => d.name.replace(/\[DELOAD\]/gi, '').replace(/\s+/g, ' ').trim();

/** "Monday" when the week knows its weekdays, else the session's own name. */
function dayWord(structure: ProgramStructure, w: number, d: number): string {
  const days = plannedDays(structure, w);
  const raw = rawIndexOf(days, d);
  const map = weekdayMap(days);
  if (map) for (const [wd, r] of map) if (r === raw) return WEEKDAY_NAMES[wd];
  const day = days[raw];
  return (day && cleanName(day)) || `Day ${d + 1}`;
}

const sessionLabel = (structure: ProgramStructure, w: number, d: number): string =>
  `Week ${w + 1}, ${dayWord(structure, w, d)}`;

/** The editable sessions of one week, as options. */
function weekOptions(structure: ProgramStructure, marks: readonly SessionMark[], w: number): string[] {
  const n = trainingDays(plannedDays(structure, w)).length;
  const out: string[] = [];
  for (let d = 0; d < n; d += 1) if (canEdit(marks, w, d)) out.push(sessionLabel(structure, w, d));
  return out;
}

/** The next few sessions still owed, as options. */
const upcoming = (structure: ProgramStructure, marks: readonly SessionMark[], n = 4): string[] =>
  editableSessions(structure, marks, n).map((s) => sessionLabel(structure, s.at.weekIndex, s.at.dayIndex));

function weekdayOf(today: Date | string | undefined, offset: number): number | null {
  if (today == null) return null;
  const d = typeof today === 'string' ? new Date(`${today.slice(0, 10)}T12:00:00Z`) : today;
  if (Number.isNaN(d.getTime())) return null;
  const js = typeof today === 'string' ? d.getUTCDay() : d.getDay();
  return (((js + offset + 6) % 7) + 7) % 7;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// RESOLVING THE DAY
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

type Ask = Extract<EditIntentResolution, { ok: false }>;
type Found = { ok: true; weekIndex: number; dayIndex: number };

const ask = (kind: EditAsk, options: string[], message: string): Ask => ({ ok: false, ask: kind, options, message });

const trained = (label: string, options: string[]): Ask =>
  ask(
    'not_editable',
    options,
    `You've already done ${label} — it's part of your record now, and I'm not going to change what it says.${
      options.length ? ` Want ${options[0]} instead?` : ''
    }`,
  );

/**
 * A slot the athlete named, checked. A bare name whose session this week is done offers the same slot
 * next week — the athlete almost certainly means the one coming up, and saying so beats both a silent
 * roll-forward and a flat no.
 */
function settle(
  structure: ProgramStructure,
  marks: readonly SessionMark[],
  w: number,
  d: number,
  explicit: boolean,
): Found | Ask {
  if (canEdit(marks, w, d)) return { ok: true, weekIndex: w, dayIndex: d };
  const label = sessionLabel(structure, w, d);
  if (explicit) return trained(label, upcoming(structure, marks, 3));
  for (let next = w + 1; next < weekCount(structure); next += 1) {
    if (sessionAt(structure, next, d) && canEdit(marks, next, d)) {
      return trained(label, [sessionLabel(structure, next, d)]);
    }
  }
  return trained(label, upcoming(structure, marks, 3));
}

function resolveDay(
  text: string,
  structure: ProgramStructure,
  marks: readonly SessionMark[],
  current: { weekIndex: number; dayIndex: number },
  today: Date | string | undefined,
): Found | Ask {
  const ws = words(text);
  const joined = ws.join(' ');

  // "week 3 Monday" — an explicit week.
  const weekMatch = /\bweek (\d{1,2})\b/.exec(joined);
  const explicitWeek = weekMatch ? Number(weekMatch[1]) - 1 : null;
  if (explicitWeek != null && (explicitWeek < 0 || explicitWeek >= weekCount(structure))) {
    return ask('which_day', upcoming(structure, marks), `This program runs ${weekCount(structure)} weeks — which session did you mean?`);
  }
  const w = explicitWeek ?? current.weekIndex;
  const days = plannedDays(structure, w);
  const count = trainingDays(days).length;
  const map = weekdayMap(days);

  // Behind you — "yesterday", "last Monday", "last session".
  if (ws.includes('yesterday') || /\b(last|previous) (mon|tue|wed|thu|fri|sat|sun|session|workout|one|time)/.test(joined)) {
    return ask(
      'not_editable',
      upcoming(structure, marks, 3),
      "That one's behind you — it's part of your record now, and I'm not going to change what it says. Tell me which one coming up you want different instead.",
    );
  }

  // "tomorrow" / "today" — by the calendar when the week has one, else the next session owed.
  const relative = ws.includes('tomorrow') ? 1 : ws.includes('today') || ws.includes('tonight') ? 0 : null;
  if (relative != null) {
    const wd = weekdayOf(today, relative);
    if (map && wd != null) {
      const raw = map.get(wd);
      const d = raw == null ? -1 : scheduleIndexOf(days, raw);
      if (d < 0) {
        return ask('which_day', weekOptions(structure, marks, w), `${relative ? 'Tomorrow' : 'Today'} is a rest day in your plan — which session do you mean?`);
      }
      // Tomorrow's slot already done this week means the calendar has moved on to next week's.
      if (relative === 1 && !canEdit(marks, w, d) && explicitWeek == null) {
        for (let next = w + 1; next < weekCount(structure); next += 1) {
          if (sessionAt(structure, next, d) && canEdit(marks, next, d)) return { ok: true, weekIndex: next, dayIndex: d };
        }
      }
      return settle(structure, marks, w, d, true);
    }
    return { ok: true, weekIndex: current.weekIndex, dayIndex: current.dayIndex };
  }

  // "next session", "my next workout", "next one".
  if (ws.includes('next') && ws.every((x) => FILLER.has(x))) {
    return { ok: true, weekIndex: current.weekIndex, dayIndex: current.dayIndex };
  }

  // A weekday.
  const named = [...new Set(ws.map((x) => WEEKDAY[x]).filter((n) => n !== undefined))];
  if (named.length > 1) {
    return ask('which_day', weekOptions(structure, marks, w), 'I heard more than one day there — which session should change?');
  }
  if (named.length === 1) {
    const wd = named[0];
    if (!map) {
      return ask(
        'which_day',
        weekOptions(structure, marks, w),
        `Your plan doesn't pin sessions to weekdays, so I don't know which one is your ${WEEKDAY_NAMES[wd]}. Which session is it?`,
      );
    }
    const raw = map.get(wd);
    const d = raw == null ? -1 : scheduleIndexOf(days, raw);
    if (d < 0) {
      return ask('which_day', weekOptions(structure, marks, w), `${WEEKDAY_NAMES[wd]} is a rest day in week ${w + 1} — which session do you mean?`);
    }
    return settle(structure, marks, w, d, explicitWeek != null);
  }

  // "day 2", "session 3", "the second session".
  const numbered = /\b(?:day|session|workout) (\d)\b/.exec(joined);
  const ordinal = ws.map((x) => ORDINAL[x]).find((n) => n !== undefined);
  const n = numbered ? Number(numbered[1]) : ordinal ?? null;
  if (n != null) {
    if (n < 1 || n > count) {
      return ask('which_day', weekOptions(structure, marks, w), `Week ${w + 1} has ${count} sessions — which one?`);
    }
    return settle(structure, marks, w, n - 1, explicitWeek != null);
  }

  // A session's own name — "leg day", "upper", "the long run".
  // A single letter is kept even though "a" is filler: "Upper A" and "Upper B" differ by nothing else.
  const query = ws.filter((x) => (!FILLER.has(x) || x.length === 1) && !/^\d+$/.test(x) && x !== 'week').map(norm);
  const meaningful = query.filter((q) => q.length > 1);
  if (meaningful.length === 0) {
    if (explicitWeek != null) return ask('which_day', weekOptions(structure, marks, w), `Which session in week ${w + 1}?`);
    return ask('which_day', weekOptions(structure, marks, w), 'Which session should change?');
  }
  const answers = (q: string, name: ReadonlySet<string>) => name.has(q) || (SYNONYM[q] ?? []).some((s) => name.has(s));
  const every: number[] = [];
  const some: number[] = [];
  for (let d = 0; d < count; d += 1) {
    const day = sessionAt(structure, w, d);
    if (!day) continue;
    const name = new Set(words(cleanName(day)).map(norm));
    if (query.every((q) => answers(q, name))) every.push(d);
    if (meaningful.some((q) => answers(q, name))) some.push(d);
  }
  // Every word the athlete said beats some of them: "Upper A" is Upper A, not Upper B.
  const hits = every.length ? every : some;
  if (hits.length === 0) {
    return ask('which_day', weekOptions(structure, marks, w), `I can't find "${text}" in week ${w + 1} — which session is it?`);
  }
  if (hits.length === 1) return settle(structure, marks, w, hits[0], explicitWeek != null);
  // Two sessions answer to it. A trained one is not a candidate for an edit; if exactly one is left, it
  // is the one they mean. Otherwise ask — never pick.
  const open = hits.filter((d) => canEdit(marks, w, d));
  if (open.length === 1) return { ok: true, weekIndex: w, dayIndex: open[0] };
  if (open.length === 0) return trained(sessionLabel(structure, w, hits[0]), upcoming(structure, marks, 3));
  return ask(
    'which_day',
    open.map((d) => sessionLabel(structure, w, d)),
    `More than one session this week fits "${text}" — which one?`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// RESOLVING THE EXERCISE
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const isCardio = (e: ProgramExercise): boolean => e.kind === 'cardio';
const eligibleFor = (op: EditIntent['op']) => (e: ProgramExercise): boolean =>
  op === 'remove' ? true : op === 'distance' || op === 'duration' ? isCardio(e) : !isCardio(e);

/** Every token a row answers to — its name, plus a cardio bout's activity ("run", "bike"). */
function rowTokens(e: ProgramExercise): Set<string> {
  const t = tokenize(e.name);
  if (isCardio(e) && e.activity) for (const w of tokenize(String(e.activity))) t.add(w);
  return t;
}

const isSubset = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean => [...a].every((x) => b.has(x));

/**
 * The rows in a day the athlete's words point at — possibly several, possibly none.
 *
 * The catalogue's own resolver goes first ("bench" → Barbell Bench Press is a curated convention, not a
 * guess); then plain word containment. The caller decides what one, many or none means.
 */
function matchRows(
  name: string,
  day: ProgramDay,
  op: EditIntent['op'],
  catalog: readonly { key: string; name: string; aliases?: string[] }[],
): number[] {
  const eligible = day.main.map((e, i) => ({ e, i })).filter(({ e }) => eligibleFor(op)(e));
  if (eligible.length === 0) return [];

  const resolved = resolveAgainstCatalog(name, catalog);
  const byKey = resolved ? eligible.filter(({ e }) => e.catalogKey === resolved.key).map(({ i }) => i) : [];

  const q = tokenize(name);
  if (q.size === 0) return byKey;
  const scored = eligible
    .map(({ e, i }) => ({ i, t: rowTokens(e) }))
    .filter(({ t }) => isSubset(q, t))
    .map(({ i, t }) => ({ i, extra: t.size - q.size }))
    .sort((a, b) => a.extra - b.extra);
  if (scored.length === 0) {
    // Spelled another way ("RDL") — the catalogue's own resolver found it.
    if (byKey.length) return byKey;
    // "the cardio", "my conditioning" on a distance or time change — every bout answers to it.
    const generic = (op === 'distance' || op === 'duration') && [...q].every((w) => ['cardio', 'conditioning', 'bout'].includes(w));
    return generic ? eligible.map(({ i }) => i) : [];
  }
  if (scored.length === 1) return [scored[0].i];
  // An exact name is an exact name.
  const exact = scored.filter((s) => s.extra === 0);
  if (exact.length === 1) return [exact[0].i];
  // Two signals agreeing is not a guess: the closest name AND the catalogue's convention ("deadlift" is the
  // conventional deadlift, not the Romanian one). A tie on closeness — back squat vs front squat for
  // "squat" — is a real question, whatever the convention says.
  const closest = scored.filter((s) => s.extra === scored[0].extra);
  if (closest.length === 1 && byKey.includes(closest[0].i)) return [closest[0].i];
  return scored.map((s) => s.i);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// RESOLVING THE REPLACEMENT
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Anyone could train anything: used when the caller passes no context. The catalogue is the only gate. */
const OPEN_CTX: CandidateContext = {
  owned: [],
  canDo: () => true,
  experience: 'advanced',
  excludePatterns: new Set(),
  excludeKeys: new Set(),
  used: new Set(),
};

const catalogOf = (list: readonly CatalogExercise[]) =>
  list.map((e) => ({ key: e.key, name: e.name, aliases: e.aliases ? [...e.aliases] : undefined }));

/**
 * The words' matches in a list, best first: containment, then the fewest extra words, then the most words
 * shared with the movement being replaced — "dumbbell press" for a BENCH press means the dumbbell BENCH
 * press, not the floor press. Returns every candidate still tied at the top.
 */
function bestMatches(to: string, list: readonly CatalogExercise[], source: ProgramExercise): { top: CatalogExercise[]; all: CatalogExercise[] } {
  const q = tokenize(to);
  const src = tokenize(source.name);
  const scored = list
    .map((e) => {
      const names = [e.name, ...(e.aliases ?? [])].map((n) => tokenize(n)).filter((t) => isSubset(q, t));
      if (!names.length) return null;
      const t = tokenize(e.name);
      return { e, extra: Math.min(...names.map((n) => n.size - q.size)), shared: [...t].filter((x) => src.has(x)).length };
    })
    .filter((x) => x !== null)
    .sort((a, b) => a.extra - b.extra || b.shared - a.shared);
  if (!scored.length) return { top: [], all: [] };
  const best = scored[0];
  return {
    top: scored.filter((s) => s.extra === best.extra && s.shared === best.shared).map((s) => s.e),
    all: scored.map((s) => s.e),
  };
}

const walled = (e: CatalogExercise, ctx: CandidateContext): boolean =>
  ctx.excludeKeys.has(e.key) || (ctx.excludePatterns.has(e.pattern) && !ctx.keepKeys?.has(e.key));

function resolveReplacement(
  to: string | undefined,
  row: ProgramExercise,
  pool: readonly CatalogExercise[],
  ctx: CandidateContext,
): { ok: true; replacement: CatalogExercise } | Ask {
  const same = replacementsFor(row, pool, ctx, 60)
    .map((v) => v.replacement)
    .filter((e): e is CatalogExercise => !!e);
  const offer = same.slice(0, 5).map((e) => e.name);

  if (!to) return ask('which_replacement', offer, `What do you want instead of ${row.name}?`);

  // 1. The same movement pattern, first — what the tap flow would have offered.
  const direct = matchExercise(to, catalogOf(same));
  if (direct) {
    const hit = same.find((e) => e.key === direct.key);
    if (hit) return { ok: true, replacement: hit };
  }
  const inSame = bestMatches(to, same, row);
  if (inSame.top.length === 1) return { ok: true, replacement: inSame.top[0] };
  if (inSame.top.length > 1) {
    return ask('which_replacement', inSame.all.slice(0, 5).map((e) => e.name), `A few things answer to "${to}" — which one?`);
  }

  // 2. The whole catalogue. The athlete named it, so their room is theirs to decide (CA-D12) — but a
  //    limitation they gave is never silently broken.
  const named = resolveAgainstCatalog(to, catalogOf(pool));
  const exact = named ? pool.find((e) => e.key === named.key) : undefined;
  const loose = exact ? { top: [exact], all: [exact] } : bestMatches(to, pool, row);
  if (loose.top.length === 1) {
    const hit = loose.top[0];
    if (hit.key === row.catalogKey) return ask('which_replacement', offer, `${row.name} is already what's there — what do you want instead?`);
    if (walled(hit, ctx)) {
      return ask('which_replacement', offer, `${hit.name} works a movement you told me to keep away from. Any of these instead?`);
    }
    return { ok: true, replacement: hit };
  }
  if (loose.top.length > 1) {
    return ask('which_replacement', loose.all.slice(0, 5).map((e) => e.name), `A few things answer to "${to}" — which one?`);
  }
  return ask(
    'which_replacement',
    offer,
    offer.length ? `I don't have "${to}" in the catalogue. Any of these instead?` : `I don't have "${to}" in the catalogue — what else would you do?`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const round1 = (n: number): number => Math.round(n * 10) / 10;
const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, Math.round(n)));
const repsText = (e: ProgramExercise): string => (e.repsMax ? `${e.reps ?? '?'}–${e.repsMax}` : `${e.reps ?? '?'}`);

/**
 * Resolve an `EditIntent` against the program the athlete is running.
 *
 * `today` makes "tomorrow" a weekday when the plan has weekdays; without it (or without weekdays in the
 * plan) "tomorrow" is the next session owed.
 */
export function resolveEditIntent(
  intent: EditIntent,
  structure: ProgramStructure,
  marks: readonly SessionMark[],
  pool: readonly CatalogExercise[],
  today?: Date | string,
  opts: ResolveEditOptions = {},
): EditIntentResolution {
  const ctx = opts.ctx ?? OPEN_CTX;
  const first = editableSessions(structure, marks, 1)[0];
  if (!first) {
    return ask('not_editable', [], "Every session in this program is done — there's nothing left in it to change.");
  }
  const catalog = catalogOf(pool);

  // Ops that are not "one row in one session" have their own resolvers.
  if (intent.op === 'move') return resolveMove(intent, structure, marks, first.at, today);
  if (intent.op === 'skip') return resolveSkip(intent, structure, marks, first.at, today);
  if (intent.op === 'volume') return resolveVolume(intent, structure, marks, first.at, today, pool, ctx, opts);

  const needsRow = intent.op !== 'rebuild' && intent.op !== 'add';

  // ── The day ──
  let where: Found;
  if (intent.day) {
    const r = resolveDay(intent.day, structure, marks, first.at, today);
    if (!r.ok) return r;
    where = r;
  } else {
    // No day named. The week coming up is searched for the exercise; one session holding it is the one.
    const w = first.at.weekIndex;
    const open = editableSessions(structure, marks, 60).filter((s) => s.at.weekIndex === w);
    const options = open.map((s) => sessionLabel(structure, s.at.weekIndex, s.at.dayIndex));
    if (!needsRow || !intent.exercise) {
      if (open.length === 1) where = { ok: true, ...open[0].at };
      else return ask('which_day', options, 'Which session should change?');
    } else {
      const holding = open.filter((s) => matchRows(intent.exercise!, s.day, intent.op, catalog).length > 0);
      if (holding.length === 1) where = { ok: true, ...holding[0].at };
      else if (holding.length > 1) {
        return ask(
          'which_day',
          holding.map((s) => sessionLabel(structure, s.at.weekIndex, s.at.dayIndex)),
          `${intent.exercise} is in more than one session this week — which day?`,
        );
      } else return ask('which_day', options, `I can't find ${intent.exercise} in this week's sessions — which day?`);
    }
  }

  const { weekIndex, dayIndex } = where;
  const day = sessionAt(structure, weekIndex, dayIndex);
  if (!day) return ask('which_day', upcoming(structure, marks), "I can't find that session in this program — which one?");
  const place = sessionLabel(structure, weekIndex, dayIndex);
  const said = intent.scope ?? null;

  // ── Rebuild: the whole day, no row ──
  if (!needsRow) {
    const prescribe = opts.prescribe ?? { category: 'STRENGTH', experience: ctx.experience };
    if (intent.op === 'add') return resolveAdd(intent, structure, marks, { weekIndex, dayIndex }, day, place, pool, ctx, opts, said);
    return {
      ok: true,
      plan: {
        kind: 'structure',
        at: { weekIndex, dayIndex },
        op: 'rebuild',
        label: `${place} — rebuilt with new exercises`,
        scope: said,
        apply: (scope) => rebuildDay(structure, marks, { weekIndex, dayIndex }, pool, ctx, prescribe, scope ?? said ?? 'this_week'),
      },
    };
  }

  // ── The row ──
  const eligible = day.main.map((e, i) => ({ e, i })).filter(({ e }) => eligibleFor(intent.op)(e));
  const rowLabels = (idx: number[]) => idx.map((i) => describe(day.main[i]));
  if (eligible.length === 0) {
    const what = intent.op === 'distance' || intent.op === 'duration' ? 'no cardio' : 'nothing to lift';
    return ask('which_day', upcoming(structure, marks), `${place} has ${what} in it — which session did you mean?`);
  }
  let exerciseIndex: number;
  if (!intent.exercise) {
    if (eligible.length !== 1) {
      return ask('which_exercise', rowLabels(eligible.map(({ i }) => i)), `Which one in ${place}?`);
    }
    exerciseIndex = eligible[0].i;
  } else {
    const hits = matchRows(intent.exercise, day, intent.op, catalog);
    if (hits.length === 0) {
      return ask('which_exercise', rowLabels(eligible.map(({ i }) => i)), `I can't find ${intent.exercise} in ${place} — which one?`);
    }
    if (hits.length > 1) {
      return ask('which_exercise', rowLabels(hits), `There's more than one "${intent.exercise}" in ${place} — which one?`);
    }
    exerciseIndex = hits[0];
  }
  const row = day.main[exerciseIndex];
  const at = { weekIndex, dayIndex, exerciseIndex };
  const plan = (label: string, apply: (scope: EditScope) => EditResult): EditIntentResolution => ({
    ok: true,
    plan: { kind: 'structure', at, op: intent.op, label: `${place} — ${label}`, scope: said, apply: (scope) => apply(scope ?? said ?? 'this_week') },
  });
  const valueOptions = (change: 'sets' | 'distance' | 'duration') => valuesFor(day, change, exerciseIndex).map((v) => v.label);

  switch (intent.op) {
    case 'swap': {
      const r = resolveReplacement(intent.to, row, pool, ctx);
      if (!r.ok) return r;
      return plan(`${row.name} → ${r.replacement.name}`, (scope) => swapExercise(structure, marks, at, r.replacement, scope));
    }
    case 'sets': {
      if (intent.sets == null) return ask('which_value', valueOptions('sets'), `How many sets of ${row.name}?`);
      const next = clamp(intent.sets, 1, 8);
      if (next === row.sets) return ask('which_value', valueOptions('sets'), `${row.name} is already ${next} sets — how many do you want?`);
      return plan(`${row.name}: ${row.sets ?? '?'} → ${next} sets`, (scope) => setPrescription(structure, marks, at, { sets: next }, scope));
    }
    case 'reps': {
      const current = row.reps ?? 8;
      const offer = [current - 4, current - 2, current + 2, current + 4].filter((n) => n >= 1 && n <= 60).map((n) => `${n} reps`);
      if (intent.reps == null) return ask('which_value', offer, `How many reps of ${row.name}?`);
      const next = clamp(intent.reps, 1, 60);
      if (next === row.reps && !row.repsMax) return ask('which_value', offer, `${row.name} is already ${next} reps — how many do you want?`);
      // A fixed count replaces a range: "make it 10" on an 8–12 is 10, not 10–12.
      return plan(`${row.name}: ${repsText(row)} → ${next} reps`, (scope) =>
        setPrescription(structure, marks, at, { reps: next, repsMax: null }, scope),
      );
    }
    case 'distance': {
      if (intent.miles == null) return ask('which_value', valueOptions('distance'), `How far should ${row.name} be?`);
      const miles = round1(intent.miles);
      const hadTime = !row.targetMi && typeof row.targetSec === 'number' && row.targetSec > 0;
      const from = typeof row.targetMi === 'number' && row.targetMi > 0 ? `${round1(row.targetMi)} → ` : '';
      // Re-prescribed by distance: a time target left beside it would be a second, contradictory goal.
      return plan(`${row.name}: ${from}${miles} mi`, (scope) =>
        setCardioTarget(structure, marks, at, { targetMi: miles, ...(hadTime ? { targetSec: null } : {}) }, scope),
      );
    }
    case 'duration': {
      if (intent.minutes == null) return ask('which_value', valueOptions('duration'), `How long should ${row.name} be?`);
      const minutes = Math.round(intent.minutes);
      const hadMiles = !row.targetSec && typeof row.targetMi === 'number' && row.targetMi > 0;
      const from = typeof row.targetSec === 'number' && row.targetSec > 0 ? `${Math.round(row.targetSec / 60)} → ` : '';
      return plan(`${row.name}: ${from}${minutes} min`, (scope) =>
        setCardioTarget(structure, marks, at, { targetSec: minutes * 60, ...(hadMiles ? { targetMi: null } : {}) }, scope),
      );
    }
    case 'remove': {
      if (day.main.length - 1 < MIN_EXERCISES_AFTER_REMOVE) {
        return ask(
          'not_editable',
          [],
          `Taking ${row.name} out would leave ${place} with fewer than ${MIN_EXERCISES_AFTER_REMOVE} exercises. Want to swap it for something instead?`,
        );
      }
      return plan(`take out ${row.name}`, (scope) => removeExercise(structure, marks, at, scope));
    }
    default:
      return ask('which_exercise', [], "I can't make that change by typing yet — use the edit flow.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// SHARED BY THE WHOLE-SESSION OPS
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const range = (from: number, to: number): number[] => Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i);
const isDeloadDay = (d: ProgramDay): boolean => /\[DELOAD\]/i.test(d.name);
const setsOf = (d: ProgramDay): number => d.main.reduce((n, e) => n + (isCardio(e) ? 0 : (e.sets ?? 0)), 0);

/**
 * The trained-session refusal, in the op's own words. `resolveDay` speaks for edits ("I'm not going to
 * change what it says"); a move or a skip says what it will not do instead.
 */
const reword = (r: Ask, instead: string): Ask =>
  r.ask === 'not_editable' ? { ...r, message: r.message.replace("I'm not going to change what it says", instead) } : r;

const prescribeFor = (opts: ResolveEditOptions, ctx: CandidateContext): Omit<PrescribeContext, 'weekIndex' | 'isDeload'> =>
  opts.prescribe ?? { category: opts.category ?? 'STRENGTH', experience: ctx.experience };

/** A session's own name, with its weekday when the week knows one and the name does not already say it. */
function who(structure: ProgramStructure, w: number, d: number): string {
  const day = sessionAt(structure, w, d);
  const name = day ? cleanName(day) : '';
  const wd = dayWord(structure, w, d);
  if (!name) return wd;
  if (wd === name || words(name).some((x) => WEEKDAY[x] !== undefined)) return name;
  return WEEKDAY_NAMES.includes(wd) ? `${name} (${wd})` : name;
}

const structurePlan = (
  at: EditPlan['at'],
  op: EditIntent['op'],
  label: string,
  said: EditScope | null,
  apply: (scope: EditScope) => EditResult,
): EditIntentResolution => ({
  ok: true,
  plan: { kind: 'structure', at, op, label, scope: said, apply: (scope) => apply(scope ?? said ?? 'this_week') },
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// MOVE — "move leg day to Friday", "swap Tuesday and Thursday", "do Wednesday's session first"
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const POSITION_WORDS: Record<string, 'first' | 'last'> = {
  first: 'first', start: 'first', beginning: 'first', front: 'first', earliest: 'first',
  last: 'last', end: 'last', final: 'last', latest: 'last',
};

/**
 * A reorder of one week, through `schedule-edit.reorderWeek` — the same code the Reorder sheet runs, so a
 * trained or skipped session keeps its place exactly as it does there and the session count cannot move.
 *
 * "to Friday" / "and Thursday" / "to Upper B" names ANOTHER session, and the two trade places (a
 * transposition — the smallest change that puts the session where it was asked for). "first" / "last" is
 * a position, and the session is lifted there with the rest shuffling up (`moveInOrder`, pinned rows
 * fixed). Never across weeks: a session belongs to its week.
 */
function resolveMove(
  intent: EditIntent,
  structure: ProgramStructure,
  marks: readonly SessionMark[],
  current: { weekIndex: number; dayIndex: number },
  today: Date | string | undefined,
): EditIntentResolution {
  if (!intent.day) return ask('which_day', weekOptions(structure, marks, current.weekIndex), 'Which session do you want to move?');
  const from = resolveDay(intent.day, structure, marks, current, today);
  if (!from.ok) return reword(from, 'it stays where it is');

  const w = from.weekIndex;
  const a = from.dayIndex;
  const n = weekSessionCount(structure, w);
  const others = () => weekOptions(structure, marks, w).filter((o) => o !== sessionLabel(structure, w, a));
  const mover = who(structure, w, a);
  if (!intent.to) return ask('which_position', others(), `Where should ${mover} go?`);

  const pinned = new Set(range(0, n).filter((d) => !canEdit(marks, w, d)));
  const identity = range(0, n);
  const position = words(intent.to).map((x) => POSITION_WORDS[x]).find((x) => x !== undefined);

  let order: number[];
  let label: string;
  if (position) {
    const dest = position === 'first' ? 0 : n - 1;
    // The nearest position a done session does not hold — `moveInOrder` snaps in the direction of travel,
    // and "first" with day 1 already trained means first of what is left, not "nowhere".
    const open = identity.filter((p) => !pinned.has(p));
    const reach = open.length ? (position === 'first' ? open[0] : open[open.length - 1]) : dest;
    order = moveInOrder(identity, a, reach, pinned);
    if (order.every((v, i) => v === i)) {
      return ask(
        'not_editable',
        [],
        order.indexOf(a) === dest
          ? `${mover} is already ${position} in week ${w + 1}.`
          : `The sessions ${position === 'first' ? 'before' : 'after'} ${mover} are already done or skipped, so it's as ${position === 'first' ? 'early' : 'late'} as it can go.`,
      );
    }
    const landed = order.indexOf(a);
    label = `Week ${w + 1} — ${mover} ${landed === dest ? `goes ${position}` : `moves as ${position === 'first' ? 'early' : 'late'} as it can`}: ${order
      .map((d) => who(structure, w, d))
      .join(' · ')}`;
  } else {
    const to = resolveDay(intent.to, structure, marks, { weekIndex: w, dayIndex: a }, today);
    if (!to.ok) {
      if (to.ask === 'not_editable') {
        return ask('which_position', others(), `That session is already done or skipped — it keeps its place. Where else should ${mover} go?`);
      }
      if (/rest day/.test(to.message)) {
        return ask('which_position', others(), `${to.message.replace(/ — which session do you mean\?$/, '')}, and I can reorder sessions but not move one onto a rest day. Where should ${mover} go?`);
      }
      return { ...to, ask: 'which_position' };
    }
    if (to.weekIndex !== w) {
      return ask('which_position', others(), `A session stays in its own week — where in week ${w + 1} should ${mover} go?`);
    }
    const b = to.dayIndex;
    if (b === a) return ask('which_position', others(), `${mover} is already there — where should it go?`);
    order = transposition(n, a, b);
    label = `Week ${w + 1} — ${mover} and ${who(structure, w, b)} trade places`;
  }

  const said = intent.scope ?? null;
  return structurePlan({ weekIndex: w, dayIndex: a }, 'move', label, said, (scope) => {
    const next = reorderWeek(structure, marks, w, order, scope);
    if (next === structure) {
      return { ok: false, refusal: { reason: 'nothing_to_change', message: 'That order is what you already have — nothing to move.' } };
    }
    return { ok: true, structure: next };
  });
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// SKIP — "skip today", "I'm on vacation next week"
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A week the athlete named. "next week" is only obvious once the current week has begun: before any
 * session of it is done, the week about to start and the one after are both "next week" to somebody, and
 * that is asked rather than picked.
 */
function resolveWeek(
  text: string,
  structure: ProgramStructure,
  marks: readonly SessionMark[],
  current: { weekIndex: number },
): { ok: true; weekIndex: number } | Ask {
  const ws = words(text);
  const joined = ws.join(' ');
  const cw = current.weekIndex;
  const total = weekCount(structure);
  const weekOpts = (from: number) => range(from, Math.min(total, from + 3)).map((w) => `Week ${w + 1}`);

  const numbered = /\bweek (\d{1,2})\b/.exec(joined);
  if (numbered) {
    const w = Number(numbered[1]) - 1;
    if (w < 0 || w >= total) return ask('which_week', weekOpts(cw), `This program runs ${total} weeks — which week?`);
    return { ok: true, weekIndex: w };
  }
  if (ws.includes('next') || ws.includes('coming') || ws.includes('upcoming')) {
    const begun = range(0, weekSessionCount(structure, cw)).some((d) => !canEdit(marks, cw, d));
    if (!begun) {
      if (cw + 1 >= total) return { ok: true, weekIndex: cw };
      return ask(
        'which_week',
        [`Week ${cw + 1}`, `Week ${cw + 2}`],
        `Do you mean week ${cw + 1}, the one you're about to start, or week ${cw + 2}?`,
      );
    }
    if (cw + 1 >= total) return ask('not_editable', [], `Week ${cw + 1} is the last week of this program — there's no next week in it to skip.`);
    return { ok: true, weekIndex: cw + 1 };
  }
  if (ws.includes('this') || ws.includes('current') || ws.includes('rest')) return { ok: true, weekIndex: cw };
  return ask('which_week', weekOpts(cw), 'Which week do you want to skip?');
}

function skipPlan(structure: ProgramStructure, sessions: SessionPosition[], label: string): EditIntentResolution {
  return {
    ok: true,
    plan: {
      kind: 'skip',
      op: 'skip',
      at: { ...sessions[0] },
      label,
      scope: 'this_week',
      sessions,
      apply: () => ({ ok: true, skip: sessions.map((s) => ({ ...s })), structure }),
    },
  };
}

/**
 * Skipping is a SESSION MARK — `skipProgramSession` per position — never a structure edit. So nothing
 * here writes: the plan hands back the positions, all untouched. A skip counts toward finishing the
 * program (PO decision 2026-08-07), and a skip that finishes it cannot be undone, so the label says so.
 */
function resolveSkip(
  intent: EditIntent,
  structure: ProgramStructure,
  marks: readonly SessionMark[],
  current: { weekIndex: number; dayIndex: number },
  today: Date | string | undefined,
): EditIntentResolution {
  const left = editableSessions(structure, marks, 100_000).length;
  const finishing = (k: number) => (k >= left ? " — that's the last of the program, so it finishes it" : '');

  if (intent.week) {
    const r = resolveWeek(intent.week, structure, marks, current);
    if (!r.ok) return r;
    const w = r.weekIndex;
    const n = weekSessionCount(structure, w);
    const open = range(0, n).filter((d) => canEdit(marks, w, d));
    if (open.length === 0) {
      return ask('not_editable', [], `Every session in week ${w + 1} is already done or skipped — there's nothing left in it to skip.`);
    }
    const s = (k: number) => (k === 1 ? '' : 's');
    const label =
      open.length === n
        ? `Skip all ${n} session${s(n)} of week ${w + 1}`
        : `Skip the ${open.length} session${s(open.length)} left in week ${w + 1}`;
    return skipPlan(structure, open.map((d) => ({ weekIndex: w, dayIndex: d })), label + finishing(open.length));
  }

  if (!intent.day) return ask('which_day', upcoming(structure, marks), 'Which session do you want to skip?');
  const r = resolveDay(intent.day, structure, marks, current, today);
  if (!r.ok) return reword(r, "there's nothing to skip");
  return skipPlan(
    structure,
    [{ weekIndex: r.weekIndex, dayIndex: r.dayIndex }],
    `Skip ${sessionLabel(structure, r.weekIndex, r.dayIndex)}${finishing(1)}`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// ADD — "add hammer curls to Upper A"
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** The athlete's words in the catalogue: the curated resolver first, then the fewest-extra-words match. */
function findInCatalogue(
  name: string,
  pool: readonly CatalogExercise[],
): { ok: true; hit: CatalogExercise } | { ok: false; options: string[] } {
  const named = resolveAgainstCatalog(name, catalogOf(pool));
  const exact = named ? pool.find((e) => e.key === named.key) : undefined;
  if (exact) return { ok: true, hit: exact };
  const q = tokenize(name);
  if (q.size === 0) return { ok: false, options: [] };
  const scored = pool
    .map((e) => {
      const hits = [e.name, ...(e.aliases ?? [])].map((n) => tokenize(n)).filter((t) => isSubset(q, t));
      return hits.length ? { e, extra: Math.min(...hits.map((t) => t.size - q.size)) } : null;
    })
    .filter((x) => x !== null)
    .sort((a, b) => a.extra - b.extra || a.e.name.localeCompare(b.e.name));
  if (scored.length === 0) return { ok: false, options: [] };
  const top = scored.filter((x) => x.extra === scored[0].extra);
  if (top.length === 1) return { ok: true, hit: top[0].e };
  return { ok: false, options: scored.slice(0, 5).map((x) => x.e.name) };
}

/**
 * Add a movement the athlete named. Sets and reps are theirs when they said them, else the rulebook's
 * for that week (`prescribeReps`, the rep climb and a deload's lighter sets included) — never a number
 * of the model's. A movement a stated limitation walls off is refused, not added (CA-D12's second wall).
 */
function resolveAdd(
  intent: EditIntent,
  structure: ProgramStructure,
  marks: readonly SessionMark[],
  at: { weekIndex: number; dayIndex: number },
  day: ProgramDay,
  place: string,
  pool: readonly CatalogExercise[],
  ctx: CandidateContext,
  opts: ResolveEditOptions,
  said: EditScope | null,
): EditIntentResolution {
  if (!intent.exercise) return ask('which_exercise', [], `What do you want to add to ${place}?`);
  const found = findInCatalogue(intent.exercise, pool);
  if (!found.ok) {
    return ask(
      'which_exercise',
      found.options,
      found.options.length
        ? `A few things answer to "${intent.exercise}" — which one?`
        : `I don't have "${intent.exercise}" in the catalogue — what else is it called?`,
    );
  }
  const hit = found.hit;
  if (walled(hit, ctx)) {
    return ask('not_editable', [], `${hit.name} works a movement you told me to keep away from, so I won't add it. Want something else?`);
  }
  if (day.main.some((e) => e.catalogKey === hit.key)) {
    return ask('not_editable', [], `${hit.name} is already in ${place} — want more sets of it instead?`);
  }

  const prescribe = prescribeFor(opts, ctx);
  const rowFor = (w: number, d: ProgramDay): ProgramExercise => {
    const rx = prescribeReps(roleFor(d.main.length, isCompound(hit.pattern)), {
      totalWeeks: weekCount(structure),
      ...prescribe,
      weekIndex: w,
      isDeload: isDeloadDay(d),
    });
    return {
      catalogKey: hit.key,
      name: hit.name,
      sets: intent.sets != null ? clamp(intent.sets, 1, 8) : rx.sets,
      reps: intent.reps != null ? clamp(intent.reps, 1, 60) : rx.reps,
      repsMax: intent.reps != null ? null : rx.repsMax,
    };
  };
  const first = rowFor(at.weekIndex, day);
  return structurePlan(at, 'add', `${place} — add ${hit.name}, ${first.sets} × ${repsText(first)}`, said, (scope) =>
    addExercise(structure, marks, at, rowFor, scope),
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// VOLUME — "more arm work", "less cardio"
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const TARGET_NOUN: Record<NonNullable<EditIntent['target']>, string> = {
  glutes: 'glute work', arms: 'arm work', biceps: 'biceps work', triceps: 'triceps work', shoulders: 'shoulder work',
  chest: 'chest work', back: 'back work', legs: 'leg work', quads: 'quad work', hamstrings: 'hamstring work',
  calves: 'calf work', core: 'core work', cardio: 'cardio',
};

type RowRef = { d: number; i: number; row: ProgramExercise };

/**
 * One set more (or fewer) on every row of the named group in the sessions coming up — the same "+1 set on
 * a primary mover" a focus build uses (`rulebook/focus.ts`) — inside `validateProgram`'s caps: 1–8 sets a
 * row, the category's per-session set ceiling, and never more in a deload week (PAS-D8). When nothing in
 * the week trains the group, one accessory is added to a session the athlete names; when every row is
 * already down to one set, one is taken out. The label lists every row that changes.
 *
 * Cardio has no sets, so "less cardio" takes one cardio piece out of a session that keeps two exercises
 * — never a whole run day, which would change the session count — and "more cardio" asks for the change
 * in the athlete's own numbers rather than inventing a distance.
 */
function resolveVolume(
  intent: EditIntent,
  structure: ProgramStructure,
  marks: readonly SessionMark[],
  current: { weekIndex: number; dayIndex: number },
  today: Date | string | undefined,
  pool: readonly CatalogExercise[],
  ctx: CandidateContext,
  opts: ResolveEditOptions,
): EditIntentResolution {
  const target = intent.target;
  const dir = intent.direction;
  if (!target) return ask('not_editable', [], 'More or less of what? Tell me the muscles — arms, glutes, back — or the cardio.');
  const noun = TARGET_NOUN[target];
  if (!dir) return ask('not_editable', [], `More ${noun}, or less? Tell me which and I'll set it up.`);

  let w: number;
  let days: number[];
  if (intent.day) {
    const r = resolveDay(intent.day, structure, marks, current, today);
    if (!r.ok) return r;
    w = r.weekIndex;
    days = [r.dayIndex];
  } else {
    w = current.weekIndex;
    days = range(0, weekSessionCount(structure, w)).filter((d) => canEdit(marks, w, d));
  }
  const daysIn = (wk: number) => (intent.day ? days : range(0, weekSessionCount(structure, wk)));
  const where = days.length === 1 ? sessionLabel(structure, w, days[0]) : `Week ${w + 1}`;
  const said = intent.scope ?? null;
  const category = opts.category ?? opts.prescribe?.category ?? 'STRENGTH';

  const byKey = new Map(pool.map((e) => [e.key, e]));
  const spec = target === 'cardio' ? null : FOCUS_SPEC[target];
  const named = intent.exercise ? tokenize(intent.exercise) : null;
  const trains = (row: ProgramExercise): boolean => {
    if (named && !isSubset(named, rowTokens(row))) return false;
    if (!spec) return isCardio(row);
    if (isCardio(row) || !row.catalogKey) return false;
    return (byKey.get(row.catalogKey)?.primaryMuscleIds ?? []).some((m) => spec.muscles.includes(m));
  };
  const rowsIn = (wk: number, d: number): RowRef[] => {
    const day = sessionAt(structure, wk, d);
    return day ? day.main.map((row, i) => ({ d, i, row })).filter(({ row }) => trains(row)) : [];
  };
  const found = days.flatMap((d) => rowsIn(w, d));

  /* Taking one movement out — when a set cannot come off, or for cardio. Asks rather than picks. */
  const removeOne = (candidates: RowRef[], none: string): EditIntentResolution => {
    const ok = candidates.filter((c) => (sessionAt(structure, w, c.d)?.main.length ?? 0) - 1 >= MIN_EXERCISES_AFTER_REMOVE);
    if (ok.length === 0) return ask('not_editable', [], none);
    const sessions = [...new Set(ok.map((c) => c.d))];
    if (sessions.length > 1) {
      return ask('which_day', sessions.map((d) => sessionLabel(structure, w, d)), `Which session should lose one?`);
    }
    if (ok.length > 1) return ask('which_exercise', ok.map((c) => c.row.name), `Which one should come out?`);
    const c = ok[0];
    const at = { weekIndex: w, dayIndex: c.d, exerciseIndex: c.i };
    return structurePlan(at, 'volume', `${sessionLabel(structure, w, c.d)} — take out ${c.row.name}`, said, (scope) =>
      removeExercise(structure, marks, at, scope),
    );
  };

  if (!spec) {
    if (dir === 'more') {
      return ask(
        'not_editable',
        [],
        found.length
          ? `Tell me which one and how much — say "make Thursday's run 5 miles" and I'll change it.`
          : `There's no cardio in ${where} to add to, and I won't add a session to a program you've already started.`,
      );
    }
    if (found.length === 0) return ask('not_editable', [], `There's no cardio in ${where} to cut.`);
    return removeOne(
      found,
      `Your cardio is whole sessions, and I won't take a session out of a program you've already started. Tell me a run to shorten — "make Thursday's run 3 miles" — or skip one.`,
    );
  }

  /* One set up or down on every matching row the week's untouched sessions hold, inside the caps. */
  const setChanges = (wk: number) => {
    const out: { at: { weekIndex: number; dayIndex: number; exerciseIndex: number }; sets: number; from: number; catalogKey?: string; name: string }[] = [];
    for (const d of daysIn(wk)) {
      if (!canEdit(marks, wk, d)) continue;
      const day = sessionAt(structure, wk, d);
      if (!day) continue;
      const deload = isDeloadDay(day);
      if (dir === 'more' && deload) continue;
      const band = bandFor(category, deload);
      let total = setsOf(day);
      for (const { i, row } of rowsIn(wk, d)) {
        const from = row.sets;
        if (!from) continue;
        if (dir === 'more') {
          if (from >= 8 || (band.maxSets != null && total + 1 > band.maxSets)) continue;
          total += 1;
          out.push({ at: { weekIndex: wk, dayIndex: d, exerciseIndex: i }, sets: from + 1, from, catalogKey: row.catalogKey, name: row.name });
        } else if (from > 1) {
          out.push({ at: { weekIndex: wk, dayIndex: d, exerciseIndex: i }, sets: from - 1, from, catalogKey: row.catalogKey, name: row.name });
        }
      }
    }
    return out;
  };

  const first = setChanges(w);
  if (first.length) {
    const several = new Set(first.map((c) => c.at.dayIndex)).size > 1;
    const list = first
      .map((c) => `${c.name}${several ? ` (${who(structure, w, c.at.dayIndex)})` : ''} ${c.from} → ${c.sets}`)
      .join(', ');
    const label = `${where} — one ${dir === 'more' ? 'more' : 'fewer'} set each for ${noun}: ${list}`;
    return structurePlan({ weekIndex: w, dayIndex: first[0].at.dayIndex }, 'volume', label, said, (scope) => {
      const weeks = scope === 'rest_of_block' ? range(w, weekCount(structure)) : [w];
      return setSetsMany(
        structure,
        marks,
        weeks.flatMap((wk) => setChanges(wk)).map((c) => ({ at: c.at, sets: c.sets, catalogKey: c.catalogKey })),
      );
    });
  }

  if (dir === 'less') {
    if (found.length === 0) return ask('not_editable', [], `There's no ${noun} in ${where} to cut.`);
    return removeOne(
      found,
      `Every ${noun} exercise in ${where} is already down to one set, and taking one out would leave its session too short. Swap it for something instead?`,
    );
  }

  const deloadOnly = days.every((d) => {
    const day = sessionAt(structure, w, d);
    return !day || isDeloadDay(day);
  });
  if (deloadOnly) return ask('not_editable', [], `${where} is a deload — it's meant to be lighter, so I'll leave it alone.`);
  if (found.length) {
    return ask('not_editable', [], `The ${noun} in ${where} is already at the most sets I'll put in a session. Want me to add an exercise instead? Tell me which one.`);
  }

  // Nothing in the week trains it: one accessory, in ONE session the athlete names.
  if (days.length !== 1) {
    return ask('which_day', days.map((d) => sessionLabel(structure, w, d)), `There's no ${noun} in week ${w + 1} yet — which session should I add some to?`);
  }
  const d = days[0];
  const day = sessionAt(structure, w, d);
  if (!day) return ask('which_day', upcoming(structure, marks), "I can't find that session in this program — which one?");
  const place = sessionLabel(structure, w, d);
  const band = bandFor(category, false);
  if (day.main.length + 1 > band.maxExercises) {
    return ask('not_editable', [], `${place} is already at ${band.maxExercises} exercises, the most I'll put in a session. Want me to swap something for ${noun} instead?`);
  }
  const used = new Set(day.main.map((e) => e.catalogKey).filter((k): k is string => !!k));
  let pick: CatalogExercise | undefined;
  for (const pattern of spec.slots) {
    pick =
      candidatesFor(pattern, pool, { ...ctx, used }).find(
        (e) => !used.has(e.key) && e.primaryMuscleIds.some((m) => spec.muscles.includes(m)),
      ) ?? fillSlot(pattern, pool, { ...ctx, used })?.exercise;
    if (pick && !used.has(pick.key)) break;
    pick = undefined;
  }
  if (!pick) return ask('not_editable', [], `I can't find ${noun} you can do with your setup to add to ${place}.`);
  const chosen = pick;
  const prescribe = prescribeFor(opts, ctx);
  const rowFor = (wk: number, dd: ProgramDay): ProgramExercise => {
    const rx = prescribeReps('accessory', { totalWeeks: weekCount(structure), ...prescribe, weekIndex: wk, isDeload: isDeloadDay(dd) });
    return { catalogKey: chosen.key, name: chosen.name, sets: rx.sets, reps: rx.reps, repsMax: rx.repsMax };
  };
  const row = rowFor(w, day);
  if (band.maxSets != null && setsOf(day) + (row.sets ?? 0) > band.maxSets) {
    return ask('not_editable', [], `${place} is already near the most sets I'll put in a session. Want me to swap something for ${noun} instead?`);
  }
  const at = { weekIndex: w, dayIndex: d };
  return structurePlan(at, 'volume', `${place} — add ${chosen.name}, ${row.sets} × ${repsText(row)}, for more ${noun}`, said, (scope) =>
    addExercise(structure, marks, at, rowFor, scope),
  );
}

