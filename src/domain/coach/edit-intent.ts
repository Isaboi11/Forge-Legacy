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
 * Pure: type-only `@/` imports, relative value imports, injected catalogue.
 */

import type { ProgramDay, ProgramExercise, ProgramStructure } from '@/data/programs-live';
import type { SessionMark } from '../program/progress-core.ts';
import { plannedDays, trainingDays } from '../program/progress-core.ts';
import { rawIndexOf } from '../program/schedule-edit.ts';
import { matchExercise, tokenize } from '../program/exercise-match.ts';
import { resolveAgainstCatalog } from '../exercise-picker/aliases.ts';

import type { CandidateContext, CatalogExercise } from './candidates.ts';
import { describe, editableSessions, replacementsFor, valuesFor } from './edit-chat.ts';
import { canEdit, rebuildDay, setCardioTarget, setPrescription, swapExercise, type EditResult, type EditScope } from './edit-ops.ts';
import type { EditIntent } from './interpret-narrow.ts';
import type { PrescribeContext } from './prescribe.ts';

export type { EditIntent };

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// RESULT
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export type EditAsk = 'which_day' | 'which_exercise' | 'which_replacement' | 'which_value' | 'not_editable';

export interface EditPlan {
  at: { weekIndex: number; dayIndex: number; exerciseIndex?: number };
  op: EditIntent['op'];
  /** "Week 3, Monday — Barbell Bench Press → Dumbbell Bench Press". What the athlete confirms. */
  label: string;
  /** The reach the athlete SAID, or null when they said nothing — ask with `SCOPE_CHOICES`. */
  scope: EditScope | null;
  /** Performs the edit through `edit-ops`. Defaults to what they said, else just this week. */
  apply(scope?: EditScope): EditResult;
}

export type EditIntentResolution =
  | { ok: true; plan: EditPlan }
  | { ok: false; ask: EditAsk; options: string[]; message: string };

export interface ResolveEditOptions {
  /** The athlete's candidate context (equipment, limitations). Absent = no gates beyond the catalogue. */
  ctx?: CandidateContext;
  /** For `rebuild` only — how a rebuilt slot with no prescription of its own is dosed. */
  prescribe?: Omit<PrescribeContext, 'weekIndex' | 'isDeload'>;
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
  op === 'distance' || op === 'duration' ? isCardio(e) : !isCardio(e);

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
  const needsRow = intent.op !== 'rebuild';

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
    return {
      ok: true,
      plan: {
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
    plan: { at, op: intent.op, label: `${place} — ${label}`, scope: said, apply: (scope) => apply(scope ?? said ?? 'this_week') },
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
    default:
      return ask('which_exercise', [], "I can't make that change by typing yet — use the edit flow.");
  }
}
