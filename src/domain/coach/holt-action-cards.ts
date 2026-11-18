/**
 * Action → card model (pure). AI Road to 10 Sprint 4a §1.2 — lane C. Lane B's meal cards are wired in at merge.
 *
 * ══ THE MODEL GIVES WORDS; THE APP WORKS EVERYTHING OUT ══
 *
 * Holt's action carries what the athlete said — "bench" → "dumbbell bench", "Thursday", "lose a pound a week".
 * This module turns those words into a card whose every name, date and number is the APP's: the exercises come
 * from today's session and the catalogue, the day from the athlete's local calendar (B14), the targets from
 * `recommend()` (`nutrition/targets.ts`, NUT-D4). The card shows what WILL change before Confirm (§1.2 b) and
 * carries the resolved `plan`, which is what the executor writes — so Confirm writes exactly what was shown.
 *
 * A card that cannot be worked out says why and has no Confirm (§1.2 c): under-18 targets, an exercise that is not
 * in today's session, a day that has passed. Nothing is written without a tap (§1.2 e).
 *
 * Anything the card needs from the database comes through `CardContext` loaders, so this file stays pure and
 * `node --test` reaches every rule (`__tests__/holt-action-cards.test.mjs`). The live loaders are in
 * `src/data/holt-actions-live.ts` (`liveCardContext`).
 *
 * ⚠ `@/` IS TYPE-ONLY HERE. Runtime imports are relative with the extension (`feedback_ts_only_alias_imports`).
 */
import type { ActionCardModel, ApplyResult, Door, HoltAction, HoltActionName, HoltActionOutcome } from './holt-actions';
import { DOORS, cardsMayShow, isHoltAction } from './holt-actions.ts';
import { matchExercise, type CatalogEntry } from '../program/exercise-match.ts';
import { basisLine, blockerFor, burnFor, heldLine, maxPace, recommend, sameAsCurrent, type AthleteFacts, type Goal } from '../nutrition/targets.ts';
import { grouped, type Targets } from '../nutrition/day.ts';
import { CARE_LINE_COPY } from '../nutrition/care-line.ts';
import { cleanNoteText } from './holt-notes.ts';
import { shiftYmd, toLocalDate } from '../dates/local-date.ts';
import { isCardioKey } from '../workout/conditioning.ts';

/* ── what a card is told ──────────────────────────────────────────────────────────────────────────────────── */

/** One exercise of today's session, as the swap card reads it. */
export interface TodayExercise {
  name: string;
  catalogKey: string | null;
  section: 'warmup' | 'main' | 'cooldown';
  kind: 'strength' | 'cardio';
  /** A set of it is already logged (open workout only). */
  logged: boolean;
  /** Its index in the program day's `main` list (program source only) — what `edit-ops` addresses. */
  mainIndex?: number;
}

/**
 * Today's session: the workout that is OPEN on this phone (the autosave), else the running program's next session.
 * `exercises` holds, for an open workout, every exercise in order; for a program day, its main lifts.
 */
export interface TodaySession {
  source: 'open' | 'program';
  name: string;
  exercises: TodayExercise[];
  /** open: when it started — the executor checks it is still the same workout. */
  startedAt?: string;
  /** program: which session. */
  programId?: string;
  programName?: string;
  weekIndex?: number;
  dayIndex?: number;
}

/** What "start my workout" can open. */
export interface StartChoices {
  /** The running program and its sessions not yet trained, in order (the first is today's). */
  program: { id: string; name: string; open: { weekIndex: number; dayIndex: number; name: string; exerciseCount: number }[] } | null;
  /** The one-off built for later (Home's hero). */
  planned: { name: string; exerciseCount: number } | null;
  templates: { id: string; name: string; exerciseCount: number }[];
  /** A workout already open on this phone — the logger asks about it first. */
  open: { name: string; logged: boolean } | null;
}

/** The athlete's facts for `recommend()`, read the way the Targets screen reads them. */
export interface TargetFactsRead {
  facts: AthleteFacts;
  /** The target in force today, or null when they have never set one. */
  current: Targets | null;
  /** The care line's rule (`care-line.ts`) says most of the last week was well under a body's needs. */
  lowWeek: boolean;
}

/** What a card needs to know about the athlete. Lane C may add fields (append only). */
export interface CardContext {
  units: 'imperial' | 'metric';
  /** The athlete's local day, YYYY-MM-DD. */
  today: string;
  /** Lane C (append): nutrition is open to this athlete (`useNutritionAccess`). Absent reads as no. */
  nutritionAccess?: boolean;
  /** Lane C (append): the exercise catalogue (`PICKER_DB`) — the only source of a swap's new exercise. */
  catalog?: readonly CatalogEntry[];
  /** Lane C (append): today's session, or null when nothing is open and no program is running. */
  loadToday?: () => Promise<TodaySession | null>;
  /** Lane C (append): what `start_workout` can open. */
  loadStartChoices?: () => Promise<StartChoices>;
  /** Lane C (append): the facts behind `set_targets`. Null = they did not load (nothing is computed). */
  loadTargetFacts?: () => Promise<TargetFactsRead | null>;
  /** Lane C (append): sessions can be put on a date. False in 4a — there is no store for one (lane C report). */
  canSchedule?: boolean;
}

/** Every write card's button. `Coach-AI-Amendment-002` (LOCKED): nothing changes until the athlete taps Do it. */
export const CONFIRM_LABEL = 'Do it';

const str = (v: unknown): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

const blocked = (action: HoltActionName, title: string, why: string, rows: ActionCardModel['rows'] = []): ActionCardModel => ({
  action,
  title,
  rows,
  confirmLabel: null,
  blocked: `${why} Nothing was changed.`,
});

/* ── swap an exercise, today only ─────────────────────────────────────────────────────────────────────────── */

/** Which exercise of today's session the words mean — by its name in the session, then by catalogue key. */
function findInSession(words: string, today: TodaySession, catalog: readonly CatalogEntry[]): number {
  const named = matchExercise(
    words,
    today.exercises.map((e, i) => ({ key: String(i), name: e.name })),
  );
  if (named) return Number(named.key);
  const key = matchExercise(words, catalog)?.key;
  const byKey = key ? today.exercises.findIndex((e) => e.catalogKey === key) : -1;
  if (byKey >= 0) return byKey;
  /* "bench" is too little for the whole catalogue (`matchExercise` abstains on one generic word), but inside ONE
     session it is plenty when exactly one exercise there carries every word. */
  const hit = pickByName(words, today.exercises.map((e, i) => ({ name: e.name, i })));
  return hit && 'one' in hit ? hit.one.i : -1;
}

async function swapCard(input: Record<string, unknown>, ctx: CardContext): Promise<ActionCardModel> {
  const title = "Swap today's exercise";
  const from = str(input.from);
  const to = str(input.to);
  if (!from || !to) return blocked('swap_exercise_today', title, "I didn't catch which exercise to swap for which.");
  const today = (await ctx.loadToday?.().catch(() => null)) ?? null;
  if (!today || today.exercises.length === 0) {
    return blocked('swap_exercise_today', title, "There's no workout open and no program session up next, so there's nothing to swap.");
  }
  const catalog = ctx.catalog ?? [];
  const at = findInSession(from, today, catalog);
  if (at < 0) return blocked('swap_exercise_today', title, `I couldn't find that exercise in ${today.name}.`);
  const was = today.exercises[at];
  const next = matchExercise(to, catalog);
  if (!next) return blocked('swap_exercise_today', title, "I couldn't match the new exercise to one in the library.");
  if (next.key === was.catalogKey) return blocked('swap_exercise_today', title, `${was.name} is already the exercise.`);
  if (isCardioKey(next.key) !== (was.kind === 'cardio')) {
    return blocked('swap_exercise_today', title, 'Swapping between a run and a lift changes the whole block, so do that one in the workout.');
  }
  if (today.source === 'open' && was.logged) {
    return blocked('swap_exercise_today', title, `You've logged sets on ${was.name}. Swap it in the workout, so you choose what happens to them.`);
  }
  if (today.source === 'program' && (was.mainIndex == null || was.section !== 'main')) {
    return blocked('swap_exercise_today', title, `${was.name} isn't one I can swap from here. Swap it in the workout.`);
  }
  return {
    action: 'swap_exercise_today',
    title,
    rows: [
      { label: `${was.name} → ${next.name}` },
      today.source === 'open'
        ? { label: 'Today only', note: `In ${today.name}, the workout you have open. Same sets and reps.` }
        : { label: 'Today only', note: `${today.name}, your next session${today.programName ? ` of ${today.programName}` : ''}. The rest of the program stays as it is.` },
    ],
    confirmLabel: CONFIRM_LABEL,
    plan: {
      source: today.source,
      at: today.source === 'open' ? at : was.mainIndex,
      fromName: was.name,
      fromKey: was.catalogKey,
      toKey: next.key,
      toName: next.name,
      ...(today.source === 'open'
        ? { startedAt: today.startedAt ?? null }
        : { programId: today.programId ?? null, weekIndex: today.weekIndex ?? null, dayIndex: today.dayIndex ?? null }),
    },
  };
}

/* ── start a workout ──────────────────────────────────────────────────────────────────────────────────────── */

/** Words that say nothing about WHICH workout. */
const FILLER = new Set(['my', 'the', 'a', 'an', 'workout', 'session', 'template', 'start', 'today', 'todays', 'please', 'program', 'routine']);
const wordsOf = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/['’]s\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

/**
 * Which of the athlete's own workouts the words name: every meaningful word must be in the name, and the closest
 * (fewest extra words) wins. A tie is a real question, so it comes back as the tied names.
 */
export function pickByName<T extends { name: string }>(words: string, options: readonly T[]): { one: T } | { tied: T[] } | null {
  const q = wordsOf(words).filter((w) => !FILLER.has(w));
  if (q.length === 0) return null;
  let best: T[] = [];
  let fewest = Infinity;
  for (const o of options) {
    const have = new Set(wordsOf(o.name));
    if (!q.every((w) => have.has(w))) continue;
    const extra = have.size - q.length;
    if (extra < fewest) {
      fewest = extra;
      best = [o];
    } else if (extra === fewest) best.push(o);
  }
  if (best.length === 0) return null;
  return best.length === 1 ? { one: best[0] } : { tied: best };
}

const exercisesLine = (n: number) => `${n} ${n === 1 ? 'exercise' : 'exercises'}`;

async function startCard(input: Record<string, unknown>, ctx: CardContext): Promise<ActionCardModel> {
  const name = str(input.name);
  const choices = await ctx.loadStartChoices?.().catch(() => null);
  if (!choices) return blocked('start_workout', 'Start a workout', "I couldn't load your workouts.");
  const openNote = choices.open?.logged
    ? [{ label: 'You have a workout open', note: `${choices.open.name} has sets logged. You'll be asked what to do with it first.` }]
    : [];

  type Option = { name: string; exerciseCount: number; plan: Record<string, unknown>; where: string };
  const options: Option[] = [];
  const prog = choices.program;
  if (prog) {
    prog.open.forEach((d, i) =>
      options.push({
        name: d.name,
        exerciseCount: d.exerciseCount,
        where: i === 0 ? `Your next session of ${prog.name}` : `A session of ${prog.name}, trained out of order`,
        plan: { kind: 'program', programId: prog.id, weekIndex: d.weekIndex, dayIndex: d.dayIndex, name: d.name, next: i === 0 },
      }),
    );
  }
  if (choices.planned) {
    options.push({ name: choices.planned.name, exerciseCount: choices.planned.exerciseCount, where: 'The workout you built for later', plan: { kind: 'planned', name: choices.planned.name } });
  }
  for (const t of choices.templates) {
    options.push({ name: t.name, exerciseCount: t.exerciseCount, where: 'From your templates', plan: { kind: 'template', templateId: t.id, name: t.name } });
  }

  let chosen: Option | null = null;
  if (name && wordsOf(name).some((w) => !FILLER.has(w))) {
    const hit = pickByName(name, options);
    if (!hit) return blocked('start_workout', 'Start a workout', "I couldn't find a workout of yours by that name.");
    if ('tied' in hit) {
      const names = [...new Set(hit.tied.map((o) => o.name))].slice(0, 3);
      return blocked('start_workout', 'Start a workout', `That could be ${names.join(' or ')} — say which.`);
    }
    chosen = hit.one;
  } else {
    /* Today = the program's next session, else the workout built for later. */
    chosen = (prog?.open.length ? options[0] : null) ?? options.find((o) => o.plan.kind === 'planned') ?? null;
    if (!chosen) return blocked('start_workout', 'Start a workout', "Nothing is planned for today. Tell me which workout, or start one from Workouts.");
  }
  return {
    action: 'start_workout',
    title: `Start ${chosen.name}`,
    rows: [{ label: chosen.name, value: exercisesLine(chosen.exerciseCount), note: chosen.where }, ...openNote],
    confirmLabel: CONFIRM_LABEL,
    plan: chosen.plan,
  };
}

/* ── put a session on a day ───────────────────────────────────────────────────────────────────────────────── */

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAY_SHORT: Record<string, number> = { sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, weds: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6 };
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MON3 = MONTHS.map((m) => m.slice(0, 3));
/** How far ahead a session may be put — a quarter. */
export const SCHEDULE_DAYS_MAX = 90;
const NUMBER_WORDS: Record<string, number> = { a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, ten: 10, fourteen: 14 };

const pad = (n: number) => String(n).padStart(2, '0');
const ymdOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const daysFrom = (a: string, b: string) => Math.round((toLocalDate(b).getTime() - toLocalDate(a).getTime()) / 86_400_000);

/** A real calendar day (rejects Feb 30). */
function realDay(y: number, m: number, d: number): string | null {
  const dt = new Date(y, m, d);
  return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d ? ymdOf(y, m, d) : null;
}

/** "Thursday, Nov 20" — what the card shows. */
export function dayLabel(ymd: string, today: string): string {
  const d = toLocalDate(ymd);
  const cap = (s: string) => `${s[0].toUpperCase()}${s.slice(1)}`;
  const date = `${cap(MON3[d.getMonth()])} ${d.getDate()}`;
  const ahead = daysFrom(today, ymd);
  const head = ahead === 0 ? 'Today' : ahead === 1 ? 'Tomorrow' : cap(WEEKDAYS[d.getDay()]);
  return `${head}, ${date}`;
}

/**
 * The day the words mean, on the athlete's LOCAL calendar (B14: `today` is their local day, never a UTC date).
 * "today" · "tonight" · "tomorrow" · a weekday ("thursday" = the next Thursday, today included; "next thursday" = the
 * one after that) · "in 3 days" / "in a week" · "the 24th" (this month, or next if it has passed) · "nov 24" /
 * "24 november" (this year, or next) · "2026-11-24". Null when it is not a day, has passed, or is over 90 days out.
 */
export function resolveDay(words: string, today: string): string | null {
  const w = words.toLowerCase().replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!w) return null;
  const t = toLocalDate(today);
  const keep = (ymd: string | null): string | null => {
    if (!ymd) return null;
    const ahead = daysFrom(today, ymd);
    return ahead >= 0 && ahead <= SCHEDULE_DAYS_MAX ? ymd : null;
  };
  if (/^(on )?(today|tonight|this (morning|afternoon|evening))$/.test(w)) return today;
  if (/^(on )?tomorrow( (morning|afternoon|evening|night))?$/.test(w)) return shiftYmd(today, 1);
  if (/^(the )?day after tomorrow$/.test(w)) return shiftYmd(today, 2);

  const inN = /^in (a|one|two|three|four|five|six|seven|ten|fourteen|\d{1,2}) (day|days|week|weeks)$/.exec(w);
  if (inN) {
    const n = /^\d+$/.test(inN[1]) ? Number(inN[1]) : NUMBER_WORDS[inN[1]];
    return keep(shiftYmd(today, inN[2].startsWith('week') ? n * 7 : n));
  }

  const wd = /^(on )?(this |next |coming |this coming )?([a-z]+?)(day)?s?$/.exec(w);
  if (wd) {
    const stem = wd[3] + (wd[4] ?? '');
    const idx = WEEKDAYS.indexOf(stem) >= 0 ? WEEKDAYS.indexOf(stem) : (WEEKDAY_SHORT[wd[3]] ?? -1);
    if (idx >= 0) {
      let ahead = (idx - t.getDay() + 7) % 7;
      if ((wd[2] ?? '').trim() === 'next') ahead += 7;
      return shiftYmd(today, ahead);
    }
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(w);
  if (iso) return keep(realDay(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));

  const monthOf = (s: string): number => {
    const i = MONTHS.indexOf(s);
    return i >= 0 ? i : MON3.indexOf(s.slice(0, 3)) >= 0 && s.length <= 4 ? MON3.indexOf(s.slice(0, 3)) : -1;
  };
  const md = /^(on )?([a-z]+)\.? (\d{1,2})(st|nd|rd|th)?$/.exec(w) ?? null;
  const dm = /^(on )?(the )?(\d{1,2})(st|nd|rd|th)? (of )?([a-z]+)$/.exec(w) ?? null;
  const pick = md ? { m: monthOf(md[2]), d: Number(md[3]) } : dm ? { m: monthOf(dm[6]), d: Number(dm[3]) } : null;
  if (pick && pick.m >= 0) {
    const thisYear = realDay(t.getFullYear(), pick.m, pick.d);
    if (thisYear && daysFrom(today, thisYear) >= 0) return keep(thisYear);
    return keep(realDay(t.getFullYear() + 1, pick.m, pick.d));
  }

  const nth = /^(on )?(the )?(\d{1,2})(st|nd|rd|th)$/.exec(w);
  if (nth) {
    const d = Number(nth[3]);
    const here = realDay(t.getFullYear(), t.getMonth(), d);
    if (here && daysFrom(today, here) >= 0) return keep(here);
    const m = t.getMonth() + 1;
    return keep(realDay(t.getFullYear() + Math.floor(m / 12), m % 12, d));
  }
  return null;
}

async function scheduleCard(input: Record<string, unknown>, ctx: CardContext): Promise<ActionCardModel> {
  const title = 'Put a session on a day';
  const what = str(input.what).slice(0, 40);
  const day = resolveDay(str(input.when), ctx.today);
  if (!day) return blocked('schedule_session', title, "I couldn't work out which day you meant, or it has passed.");
  const rows = [{ label: dayLabel(day, ctx.today), ...(what ? { note: what } : {}) }];
  if (!ctx.canSchedule) {
    return blocked('schedule_session', title, "I can't put sessions on dates yet. Your program runs in order, so your next session is always ready on Home.", rows);
  }
  return { action: 'schedule_session', title, rows, confirmLabel: CONFIRM_LABEL, plan: { date: day, what: what || null } };
}

/* ── set nutrition targets ────────────────────────────────────────────────────────────────────────────────── */

/** The Targets screen's starting paces (`nutrition-targets.tsx`): a pound a week to lose, half a pound to gain. */
const DEFAULT_PACE: Record<Goal, number> = { lose: 1, maintain: 0, gain: 0.5 };

/** The pace as said, held to a quarter pound and to the screen's own range. */
export function paceFrom(goal: Goal, said: unknown): number {
  if (goal === 'maintain') return 0;
  const n = typeof said === 'number' && Number.isFinite(said) && said > 0 ? said : DEFAULT_PACE[goal];
  return Math.min(maxPace(goal), Math.max(0.25, Math.round(n * 4) / 4));
}

async function targetsCard(input: Record<string, unknown>, ctx: CardContext): Promise<ActionCardModel> {
  const goal: Goal | null = input.goal === 'lose' || input.goal === 'maintain' || input.goal === 'gain' ? input.goal : null;
  const title = 'Set your targets';
  if (!goal) return blocked('set_targets', title, "I didn't catch whether you want to lose, keep or gain weight.");
  if (!ctx.nutritionAccess) return blocked('set_targets', title, 'Nutrition is not open on your account yet.');
  const read = (await ctx.loadTargetFacts?.().catch(() => null)) ?? null;
  if (!read) return blocked('set_targets', title, "Your details didn't load, so I can't work out a target.");
  const { facts, current } = read;
  const blocker = blockerFor(facts, ctx.today);
  /* ⛔ NUT-D5 — age first, and alone. */
  if (blocker?.kind === 'under-age') return blocked('set_targets', title, 'Recommended targets start at 18.');
  if (blocker) return blocked('set_targets', title, 'Your Targets screen needs a few details first — your weight, height, birth year and how active you are.');
  /*
   * ⛔ N-G2 — the Targets screen asks anyone who isn't male whether they are pregnant or breastfeeding BEFORE any
   * number shows, and never stores the answer. A chat card cannot ask it, so it shows no number and points there.
   */
  if (facts.sex !== 'male') return blocked('set_targets', title, 'Your Targets screen asks one question before it recommends anything, so set this one there.');
  /* The care line (`care-line.ts`): a week logged well under a body's needs gets no loss target from a chat card. */
  if (goal === 'lose' && read.lowWeek) return blocked('set_targets', title, `I won't set a loss target from here this week. ${CARE_LINE_COPY.body}`);
  const burn = burnFor(facts, ctx.today);
  const pace = paceFrom(goal, input.pace);
  const rec = burn ? recommend(facts, burn, goal, pace, ctx.today) : null;
  if (!rec) return blocked('set_targets', title, "I couldn't work out a target from your details.");
  const proposed: Targets = { kcal: rec.kcal, protein: rec.protein, carb: rec.carb, fat: rec.fat };
  if (sameAsCurrent(proposed, current)) return blocked('set_targets', title, 'Those are already your targets.');
  /* "1 lb", "0.25 lb", "1.5 lb" — trailing zeros gone (`paceLabel(1)` reads "1.0 lb / week"). */
  const rate = `${Number((goal === 'lose' ? rec.effectiveRate : rec.requestedRate).toFixed(2))} lb`;
  const held = heldLine(rec, facts.sex);
  return {
    action: 'set_targets',
    title: goal === 'maintain' ? 'New targets: keep your weight' : `New targets: ${goal} ${rate} a week`,
    rows: [
      { label: 'Calories', value: `${grouped(rec.kcal)} a day`, note: held ? `${basisLine(rec)} ${held}` : basisLine(rec) },
      { label: 'Protein', value: `${grouped(rec.protein)} g` },
      { label: 'Carbs', value: `${grouped(rec.carb)} g` },
      { label: 'Fat', value: `${grouped(rec.fat)} g` },
      current
        ? { label: 'Replaces', value: `${grouped(current.kcal)} a day`, note: 'From today. Earlier days keep the target they had.' }
        : { label: 'Your first target', note: 'From today. Change it any time on Targets.' },
    ],
    confirmLabel: CONFIRM_LABEL,
    plan: { ...proposed, weightLb: facts.weightLb, today: ctx.today },
  };
}

/* ── remember a note ──────────────────────────────────────────────────────────────────────────────────────── */

function noteCard(input: Record<string, unknown>): ActionCardModel {
  const text = cleanNoteText(input.text);
  if (!text) return blocked('remember_note', 'Remember this', "That's too long to keep as one note.");
  return {
    action: 'remember_note',
    title: 'Remember this',
    rows: [{ label: text, note: "Kept in Holt's memory. You can see and delete it there." }],
    confirmLabel: CONFIRM_LABEL,
    plan: { text },
  };
}

/* ── open a screen ────────────────────────────────────────────────────────────────────────────────────────── */

/** Where each door goes — routes the app already has. */
export const DOOR_ROUTES: Readonly<Record<Door, string>> = {
  import: '/program-import',
  pick: '/program-catalog',
  meal_plan: '/meal-plan',
  targets: '/nutrition-targets',
  form_check: '/form-check',
};
const DOOR_COPY: Readonly<Record<Door, { title: string; line: string }>> = {
  import: { title: 'Import a program', line: 'Paste it, or bring it in from a photo or a file.' },
  pick: { title: 'Pick a program', line: 'The programs Forge has ready to start.' },
  meal_plan: { title: 'Your meal plan', line: 'The week of meals, and the grocery list.' },
  targets: { title: 'Your targets', line: 'Calories and macros, and how they were worked out.' },
  form_check: { title: 'Check your form', line: 'Film a set, and Holt looks at it.' },
};
const NUTRITION_DOORS = new Set<Door>(['meal_plan', 'targets']);

function doorCard(input: Record<string, unknown>, ctx: CardContext): ActionCardModel | null {
  const door = (DOORS as readonly unknown[]).includes(input.door) ? (input.door as Door) : null;
  if (!door) return null;
  const copy = DOOR_COPY[door];
  if (NUTRITION_DOORS.has(door) && !ctx.nutritionAccess) return blocked('open_door', copy.title, 'Nutrition is not open on your account yet.');
  return { action: 'open_door', title: copy.title, rows: [{ label: copy.line }], confirmLabel: 'Open', plan: { go: DOOR_ROUTES[door] } };
}

/* ── the one entry point ──────────────────────────────────────────────────────────────────────────────────── */

/**
 * null = this module does not draw that action: `log_food` / `propose_meal` (lane B's `mealCard`, wired in by the
 * integrator), the program actions (lane A, as today), or an input that names no door. A null is dropped, and the
 * athlete is told nothing changed.
 */
export async function cardFor(action: HoltAction, ctx: CardContext): Promise<ActionCardModel | null> {
  const input = action && typeof action.input === 'object' && action.input !== null ? action.input : {};
  switch (action?.name) {
    case 'swap_exercise_today':
      return swapCard(input, ctx);
    case 'start_workout':
      return startCard(input, ctx);
    case 'schedule_session':
      return scheduleCard(input, ctx);
    case 'set_targets':
      return targetsCard(input, ctx);
    case 'remember_note':
      return noteCard(input);
    case 'open_door':
      return doorCard(input, ctx);
    default:
      return null;
  }
}

/* ── §1.3: a refused or cut-off reply writes nothing ──────────────────────────────────────────────────────── */

/** How a turn ended — `cardsMayShow`'s argument. */
export type TurnEnd = Parameters<typeof cardsMayShow>[0];

/** One card on screen, and the action it came from. Only these can ever reach an executor. */
export interface ShownCard {
  action: HoltAction;
  card: ActionCardModel;
}

/**
 * The actions of ONE turn, held until it ends. Lane A: `hold` each `{action}` as it arrives; at the end call
 * `release(end)` — it hands back the cards to draw ONLY when `cardsMayShow(end)`, and empties itself either way.
 * `drop()` on Stop, a timeout or the sheet closing. A held action that was never released has no card, so it has
 * nothing to Confirm, so no executor can run for it.
 */
export function holdTurnActions(draw: (a: HoltAction, ctx: CardContext) => Promise<ActionCardModel | null> = cardFor) {
  let held: HoltAction[] = [];
  return {
    hold(a: unknown): void {
      const x = a as HoltAction | null;
      if (x && isHoltAction(x.name)) held.push({ name: x.name, input: x.input && typeof x.input === 'object' ? x.input : {} });
    },
    drop(): void {
      held = [];
    },
    get count(): number {
      return held.length;
    },
    async release(end: TurnEnd, ctx: CardContext): Promise<ShownCard[]> {
      const take = held;
      held = [];
      if (!cardsMayShow(end)) return [];
      const out: ShownCard[] = [];
      for (const action of take) {
        const card = await draw(action, ctx).catch(() => null);
        if (card) out.push({ action, card });
      }
      return out;
    },
  };
}

/**
 * Confirm one SHOWN card — the only road from a card to a write. The executor is handed the card's `plan` (what the
 * athlete saw), not the model's input. A card with no Confirm never writes, nor does its secondary button. Never
 * throws. `src/data/holt-actions-live.ts` `confirmHoltAction` is this with the live executors and telemetry.
 */
export async function applyShown(
  shown: ShownCard,
  key: string | undefined,
  exec: (name: HoltActionName) => { apply: (input: Record<string, unknown>, opts?: { key?: string }) => Promise<ApplyResult> } | null,
): Promise<ApplyResult> {
  const executor = shown?.card?.confirmLabel ? exec(shown.action.name) : null;
  if (!executor) return { ok: false, reason: 'failed' };
  try {
    return await executor.apply(shown.card.plan ?? shown.action.input, key ? { key } : undefined);
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/* ── the card's words after the tap ───────────────────────────────────────────────────────────────────────── */

/** A failed apply, in plain words. The card adds "Not changed." on its own line. */
export function failedLine(reason: Extract<ApplyResult, { ok: false }>['reason'], action?: HoltActionName): string {
  if (reason === 'offline') return "No connection, so that didn't go through.";
  if (reason === 'gone') return 'That changed since I looked, so I left it.';
  if (reason === 'not_allowed') {
    if (action === 'remember_note') return "Holt's memory is full. Delete a note in Holt's memory first.";
    if (action === 'open_door') return 'Nutrition needs your OK first, so nothing was opened.';
    return "That isn't something I can change on your plan.";
  }
  return "That didn't go through.";
}

/** An Undo that could not put it back. */
export function undoFailedLine(action: HoltActionName): string {
  if (action === 'start_workout') return "You've logged sets in it, so it stays. Finish or discard it in the workout.";
  return "That didn't undo. Check it where it lives.";
}

/* ── §1.9 telemetry ───────────────────────────────────────────────────────────────────────────────────────── */

const OUTCOMES: readonly HoltActionOutcome[] = ['confirmed', 'undone', 'dismissed', 'failed'];

/**
 * The `holt_action` event's props: the action's NAME as `kind` and the outcome as `result` — two keys already on
 * the analytics allowlist (`props-core.ts`). Never an input, never a number. Null for anything that isn't both.
 */
export function holtActionEvent(name: unknown, outcome: unknown): { kind: HoltActionName; result: HoltActionOutcome } | null {
  if (!isHoltAction(name) || !(OUTCOMES as readonly unknown[]).includes(outcome)) return null;
  return { kind: name, result: outcome as HoltActionOutcome };
}
