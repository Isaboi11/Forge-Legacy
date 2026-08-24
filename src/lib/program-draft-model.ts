import type { ProgramDay, ProgramExercise, ProgramStructure, ProgramWeekPlan } from '@/data/programs-live';
import type { BuilderInbox, BuilderSection } from '@/lib/builder-inbox';
// ⚠ RELATIVE AND EXTENSIONED, NOT `@/`. This is a RUNTIME import and `node --test` loads this file
// directly, where the alias does not resolve — the type-only imports above survive only because they are
// stripped before anything tries. The same rule `domain/program/prescription` states about its own.
import { supersetLabelAt } from '../domain/program/prescription.ts';
import { totalSessions } from '../domain/program/progress-core.ts';

/**
 * The Program Builder's in-progress draft — the device-local editing state (the RN analogue of the
 * design's `forge_program_draft_v1` localStorage draft). Autosaved on every mutation; cleared on Save or
 * Cancel. The *saved* program goes to the real `programs` table via `createProgram`; only this working
 * copy is device-local so an interrupted build survives a reload.
 *
 * The mutation helpers below are pure (draft in → new draft out) so the screen stays presentational and
 * the clamps / resize rules / picker hand-off are unit-testable. They mirror `Forge Program Builder.dc`'s
 * `_makeDays` / `_days` / `_ensureWeeks` / inbox-absorption logic.
 */
export interface ProgramDraft {
  name: string;
  weeks: number;
  daysPerWeek: number;
  vary: boolean; // false = Repeat template · true = Customize per week
  openWeek: number | null;
  openDay: number | null;
  days: ProgramDay[]; // the Repeat template (used when !vary)
  weekPlans: ProgramWeekPlan[] | null; // per-week plans (used when vary)
  mode: 'new' | 'edit' | 'dup';
  editId: string | null; // program id being edited
  srcId: string | null; // source id hydrated from (edit/dup)
  live: LiveEditGuard | null; // set only when editing a program that is already RUNNING
}

/**
 * Editing a program the athlete is part-way through — W-5 Amendment-001.
 *
 * The locked spec said no modification of an Active program of any kind. The PO overruled the product
 * half of that on 2026-08-20; this type is what carries the half that was never negotiable.
 *
 * ══ WHY A COUNT IS THE THING GUARDED ══
 *
 * Graduation is decided server-side as `completed >= program_total_sessions(structure)`, recomputed LIVE
 * from whatever structure the row currently holds. So the finish line is not stored — it is derived, every
 * save. Shrink a running program and the next logged session clears a bar that just moved down to meet it:
 * `save_workout` fires the graduation branch, writing a `PROGRAM_GRADUATED` timeline event and five
 * honors. Amendment-001 §170 — "These facts are immutable. The product does not provide a mechanism to
 * alter them." There is no un-graduate path, so this cannot be a thing we apologise for afterwards.
 *
 * ⚠ AND NOT ONLY THE WEEK/DAY COUNTS. `program_total_sessions` counts a day that PRESCRIBES SOMETHING —
 * emptying a day's exercises removes a session the athlete owed just as surely as deleting the day. That
 * is why the guard holds `totalSessions()` rather than `weeks × daysPerWeek`.
 */
export interface LiveEditGuard {
  /** Schedule-space slots already trained or skipped. Their content is frozen. */
  trained: readonly { weekIndex: number; dayIndex: number }[];
  /** `totalSessions()` when editing began. The save is refused if the edit moves it. */
  sessions: number;
}

export const DAY_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

// Clamps — design §14 / `setWeeks`,`setDays`,`bumpSets`,`bumpReps`.
/**
 * ⚠ THIS WAS 4, AND IT WAS THE ONLY THING ENFORCING A RANK RULE.
 *
 * The design HTML says "4–52 weeks" and this clamp copied it, which made four weeks the shortest program
 * anyone could build. Nothing downstream ever checked length: graduation is `logged >= prescribed`, rank
 * counts graduated rows, and `honor_metrics` counts the same rows. So "only 4-week programs count toward
 * rank" was true only because no shorter program could exist — a product rule held up by a stepper's
 * lower bound (Program-Architecture-Amendment-002 §0).
 *
 * Athletes asked for a single week they could build and run — a deload, a travel week, a test week — so
 * the floor is now 1. The rule that used to be an accident is now written down and enforced where it
 * belongs: `earnsStructuredDevelopmentCredit` in `domain/program/progress-core.ts`, keyed to
 * `STRUCTURED_DEVELOPMENT_MIN_WEEKS` (D-RCM-30), with a SQL twin so the server never trusts the client
 * about something that buys five permanent honors.
 *
 * Do not restore 4 here to "protect rank". It never did.
 */
export const WEEKS_MIN = 1;
export const WEEKS_MAX = 52;
export const DAYS_MIN = 2;
export const DAYS_MAX = 6;
export const SETS_MIN = 1;
export const SETS_MAX = 8;
export const REPS_MIN = 1;
export const REPS_MAX = 60;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const clampWeeks = (n: number) => clamp(Math.round(n), WEEKS_MIN, WEEKS_MAX);
export const clampDays = (n: number) => clamp(Math.round(n), DAYS_MIN, DAYS_MAX);
export const clampSets = (n: number) => clamp(Math.round(n), SETS_MIN, SETS_MAX);
export const clampReps = (n: number) => clamp(Math.round(n), REPS_MIN, REPS_MAX);

/** Per-section defaults when the Picker hands an exercise back: Main 3×10, Warm-up 2×12, Cool-down 1×30. */
export const defaultSets = (s: BuilderSection) => (s === 'main' ? 3 : s === 'warmup' ? 2 : 1);
export const defaultReps = (s: BuilderSection) => (s === 'cooldown' ? 30 : s === 'warmup' ? 12 : 10);

let idSeq = 0;
/** Stable-enough local id for a draft exercise row (React keys + move/remove targeting). */
export const newExerciseId = (): string => `x${Date.now().toString(36)}${(idSeq++).toString(36)}`;

export const emptyDay = (i: number): ProgramDay => ({
  letter: DAY_LETTERS[i] ?? String(i + 1),
  name: '',
  warmup: [],
  main: [],
  cooldown: [],
});

/** Resize a day list to `n`, keeping existing days (and their exercises) by position. */
export function makeDays(n: number, existing: ProgramDay[]): ProgramDay[] {
  return Array.from({ length: n }, (_, i) => existing[i] ?? emptyDay(i));
}

export function newDraft(): ProgramDraft {
  return {
    name: '',
    weeks: 8,
    daysPerWeek: 4,
    vary: false,
    openWeek: null,
    openDay: null,
    days: makeDays(4, []),
    weekPlans: null,
    mode: 'new',
    editId: null,
    srcId: null,
    live: null,
  };
}

/** The day list currently being edited: the open week's days in Customize mode, else the repeat template. */
export function activeDays(d: ProgramDraft): ProgramDay[] {
  if (d.vary && d.weekPlans && d.openWeek != null && d.weekPlans[d.openWeek]) return d.weekPlans[d.openWeek].days;
  return d.days;
}

/** Write `days` back to wherever `activeDays` read them from. */
export function withActiveDays(d: ProgramDraft, days: ProgramDay[]): ProgramDraft {
  if (d.vary && d.weekPlans && d.openWeek != null && d.weekPlans[d.openWeek]) {
    const weekPlans = d.weekPlans.map((w, i) => (i === d.openWeek ? { days } : w));
    return { ...d, weekPlans };
  }
  return { ...d, days };
}

/** Size `weekPlans` to weeks × daysPerWeek. New weeks start EMPTY (seeded on demand via Copy). */
export function ensureWeeks(d: ProgramDraft): ProgramDraft {
  const base = d.weekPlans ?? [];
  const weekPlans: ProgramWeekPlan[] = Array.from({ length: d.weeks }, (_, i) => ({
    days: makeDays(d.daysPerWeek, base[i]?.days ?? []),
  }));
  const openWeek = d.openWeek != null && d.openWeek >= d.weeks ? null : d.openWeek;
  return { ...d, weekPlans, openWeek };
}

/**
 * Size `weekPlans` to `weeks` WITHOUT touching a week that already exists.
 *
 * `ensureWeeks` re-runs every week through `makeDays`, which is right when the athlete just moved the
 * days-per-week stepper and wrong on every other occasion — it silently truncates a ragged week. This is
 * the hydrate-time twin: absent weeks get built, present weeks pass through untouched.
 */
export function padWeeks(d: ProgramDraft): ProgramDraft {
  const base = d.weekPlans ?? [];
  const weekPlans: ProgramWeekPlan[] = Array.from(
    { length: Math.max(1, d.weeks) },
    (_, i) => base[i] ?? { days: makeDays(d.daysPerWeek, []) },
  );
  const openWeek = d.openWeek != null && d.openWeek >= weekPlans.length ? null : d.openWeek;
  return { ...d, weekPlans, openWeek };
}

const cloneDay = (day: ProgramDay): ProgramDay => ({
  letter: day.letter,
  name: day.name,
  warmup: day.warmup.map((x) => ({ ...x, id: newExerciseId() })),
  main: day.main.map((x) => ({ ...x, id: newExerciseId() })),
  cooldown: day.cooldown.map((x) => ({ ...x, id: newExerciseId() })),
});

/**
 * Prepare a hydrated draft for editing a program that is ALREADY RUNNING.
 *
 * ══ WHY THIS FORCES CUSTOMIZE MODE ══
 *
 * In Repeat mode ONE template backs every week. So "swap Wednesday's press" on a program you are three
 * weeks into would rewrite the three Wednesdays already trained along with the nine ahead — and those are
 * exactly the records the guard exists to protect. Locking the day instead would be worse: the most
 * ordinary reason to edit a running program ("this exercise hurts, change it going forward") would become
 * the one thing forbidden.
 *
 * Materialising the template into per-week plans resolves it. Every week gets a verbatim copy, so the
 * program means precisely what it meant a moment ago — `totalSessions()` is unchanged BY CONSTRUCTION,
 * since each week now holds the same day list it was already being read as — and the weeks ahead become
 * independently editable while the ones behind stay frozen.
 */
export function forLiveEdit(d: ProgramDraft, live: LiveEditGuard): ProgramDraft {
  if (d.vary) return padWeeks({ ...d, live });
  const weekPlans: ProgramWeekPlan[] = Array.from({ length: Math.max(1, d.weeks) }, () => ({
    days: d.days.map(cloneDay),
  }));
  return { ...d, vary: true, weekPlans, live };
}

/**
 * Builder-space `week:dayIndex` keys that must not be edited — the sessions already trained or skipped.
 *
 * ⚠ THE TWO INDEX SPACES ARE NOT THE SAME. A trained slot's `dayIndex` is its position in
 * `trainingDays(...)` — days that prescribe something — whereas the builder edits the raw `days` array,
 * empties included. Mapping one to the other by equality would lock the wrong row on any week that has a
 * blank day sitting above a built one.
 */
export function lockedCells(d: ProgramDraft): ReadonlySet<string> {
  const out = new Set<string>();
  if (!d.live) return out;
  for (const t of d.live.trained) {
    const days = d.vary && d.weekPlans?.[t.weekIndex] ? d.weekPlans[t.weekIndex].days : d.days;
    let seen = -1;
    for (let i = 0; i < days.length; i += 1) {
      if (dayTotal(days[i]) === 0) continue;
      seen += 1;
      if (seen === t.dayIndex) {
        out.add(`${t.weekIndex}:${i}`);
        break;
      }
    }
  }
  return out;
}

/** Is this builder-space cell frozen because the athlete already trained it? */
export const isLockedCell = (locked: ReadonlySet<string>, weekIndex: number | null, dayIndex: number): boolean =>
  weekIndex != null && locked.has(`${weekIndex}:${dayIndex}`);

/**
 * Why this live edit cannot be saved — or `null` when it can. The message reaches the athlete, so it says
 * what moved and what to do instead, never "invalid".
 */
export function liveEditViolation(d: ProgramDraft): string | null {
  if (!d.live) return null;
  const now = totalSessions(draftToStructure(d));
  const was = d.live.sessions;
  if (now === was) return null;
  const verb = now < was ? 'removes' : 'adds';
  const n = Math.abs(now - was);
  return (
    `This changes the length of a program you have already started — it ${verb} ${n} ` +
    `session${n === 1 ? '' : 's'} (${was} → ${now}). The finish line has to stay where it is, or ` +
    `finishing the program would count wrong. Change what is IN the sessions ahead, or duplicate the ` +
    `program to build a different length.`
  );
}

const dayHasContent = (day: ProgramDay) => day.warmup.length > 0 || day.main.length > 0 || day.cooldown.length > 0;
export const dayTotal = (day: ProgramDay) => day.warmup.length + day.main.length + day.cooldown.length;
export const weekBuilt = (w: ProgramWeekPlan | undefined) => !!w && w.days.some(dayHasContent);
export const weekComplete = (w: ProgramWeekPlan | undefined) => !!w && w.days.some((dd) => dd.main.length > 0);

/** Would shrinking to `n` weeks destroy built weeks? (Customize mode only — the template has no weeks.) */
export function weeksLoseContent(d: ProgramDraft, n: number): boolean {
  return d.vary && (d.weekPlans ?? []).slice(n).some(weekBuilt);
}

/** Would shrinking to `n` training days destroy exercises, in any week? */
export function daysLoseContent(d: ProgramDraft, n: number): boolean {
  if (d.vary) return (d.weekPlans ?? []).some((w) => w.days.slice(n).some(dayHasContent));
  return d.days.slice(n).some(dayHasContent);
}

export function applyWeeks(d: ProgramDraft, n: number): ProgramDraft {
  const next = { ...d, weeks: clampWeeks(n) };
  return next.vary ? ensureWeeks(next) : next;
}

export function applyDaysPerWeek(d: ProgramDraft, n: number): ProgramDraft {
  const daysPerWeek = clampDays(n);
  const next: ProgramDraft = {
    ...d,
    daysPerWeek,
    days: makeDays(daysPerWeek, d.days),
    openDay: d.openDay != null && d.openDay >= daysPerWeek ? null : d.openDay,
  };
  return next.vary ? ensureWeeks(next) : next;
}

/** Append the exercises the Picker handed back to the addressed week/day/section. */
export function absorbBuilderInbox(draft: ProgramDraft, inbox: BuilderInbox): ProgramDraft {
  let d = draft;
  if (inbox.vary) d = ensureWeeks({ ...d, vary: true, openWeek: inbox.week });

  const days = activeDays(d);
  const day = days[inbox.day];
  if (!day) return d;

  const added: ProgramExercise[] = inbox.items.map((it) => ({
    id: newExerciseId(),
    catalogKey: it.catalogKey,
    name: it.name,
    equip: it.equip,
    muscles: it.muscles ?? [],
    type: it.type ?? '',
    sets: defaultSets(inbox.section),
    reps: defaultReps(inbox.section),
  }));

  const nextDay: ProgramDay = { ...day, [inbox.section]: [...day[inbox.section], ...added] };
  return { ...withActiveDays(d, days.map((x, i) => (i === inbox.day ? nextDay : x))), openDay: inbox.day };
}

/**
 * ══ DROP A WHOLE TEMPLATE INTO THE DAY BEING BUILT ══
 *
 * The Day Builder could add one exercise at a time and nothing else, so an athlete who had already
 * captured "Push Day" as a template — or who was looking at one of the 81 Forge ships — had to rebuild
 * it lift by lift to use it as a program day. Reported by the PO: *"you should be able to add a
 * template day while building a program, putting that template as the day you're working on."*
 *
 * The rows arrive ALREADY CONVERTED (`templateRowsToDay`, called where the exercise catalogue is
 * reachable) so this stays pure and testable. What it owns is what happens to the day:
 *
 *  · **replace** — the template BECOMES the day, which is what "putting that template as the day"
 *    means. Offered only behind a confirmation when the day already has content.
 *  · **append** — its rows land after what is already there, for building a day out of two shapes.
 *
 * THE DAY'S NAME is taken only when the day has none. An athlete who typed "Heavy Push" and then
 * pulled in a template called "Push Day A" meant to fill the day, not to rename it.
 *
 * GROUP IDS ARE REMAPPED on every application. They are the template's own, and grouping in this model
 * is derived by ADJACENCY within a section — so appending the same template twice would put two blocks
 * carrying one id next to each other, and they would fuse into a single superset nobody authored.
 */
export function templateIntoDay(
  d: ProgramDraft,
  dayIndex: number,
  rows: { warmup: ProgramExercise[]; main: ProgramExercise[]; cooldown: ProgramExercise[] },
  opts: { mode: 'replace' | 'append'; name?: string } = { mode: 'replace' },
): ProgramDraft {
  const days = activeDays(d);
  const day = days[dayIndex];
  if (!day) return d;

  // One remap table per application, shared across the three sections — a block that spans a section
  // boundary is not a thing the model builds, but if one ever arrives it must stay one block.
  const remap = new Map<string, string>();
  const fresh = (list: ProgramExercise[]): ProgramExercise[] =>
    list.map((x) => {
      let groupId = x.groupId;
      if (groupId) {
        const seen = remap.get(groupId);
        if (seen) groupId = seen;
        else {
          const next = newExerciseId();
          remap.set(groupId, next);
          groupId = next;
        }
      }
      return {
        ...x,
        id: newExerciseId(),
        ...(groupId ? { groupId } : null),
        // The builder's steppers reach 1–8 sets and 1–60 reps. A template row outside that would sit in
        // the day at a value no control on the screen can express or correct.
        ...(x.kind === 'cardio' ? null : { sets: clampSets(x.sets ?? 1), reps: clampReps(x.reps ?? 1) }),
      };
    });

  const merge = (existing: ProgramExercise[], incoming: ProgramExercise[]): ProgramExercise[] =>
    opts.mode === 'replace' ? fresh(incoming) : [...existing, ...fresh(incoming)];

  const nextDay: ProgramDay = {
    ...day,
    name: day.name.trim() ? day.name : (opts.name ?? day.name),
    warmup: merge(day.warmup, rows.warmup),
    main: merge(day.main, rows.main),
    cooldown: merge(day.cooldown, rows.cooldown),
  };
  return { ...withActiveDays(d, days.map((x, i) => (i === dayIndex ? nextDay : x))), openDay: dayIndex };
}

/** Switch to the repeating-template mode, closing any open week. */
export function setRepeatMode(d: ProgramDraft): ProgramDraft {
  return { ...d, vary: false, openWeek: null, openDay: null };
}

/**
 * Switch to per-week mode. Week 1 is SEEDED from the repeating template rather than starting empty —
 * an athlete who has already built their week and then chooses "customize" means "…and now let me vary
 * it", not "throw that away and start over".
 */
export function setVaryMode(d: ProgramDraft): ProgramDraft {
  const seeded = ensureWeeks({ ...d, vary: true, openDay: null, openWeek: 0 });
  const plans = seeded.weekPlans ?? [];
  const templateHasContent = d.days.some((day) => dayTotal(day) > 0);
  if (!templateHasContent || weekBuilt(plans[0])) return seeded;
  return { ...seeded, weekPlans: plans.map((w, i) => (i === 0 ? { days: cloneDays(d.days) } : w)) };
}

/** Deep-copy a day list, re-iding every exercise so the copy and its source never alias. */
export function cloneDays(days: ProgramDay[]): ProgramDay[] {
  const copy = (list: ProgramExercise[]) => list.map((x) => ({ ...x, id: newExerciseId() }));
  return days.map((d) => ({
    letter: d.letter,
    name: d.name,
    warmup: copy(d.warmup),
    main: copy(d.main),
    cooldown: copy(d.cooldown),
  }));
}

/** Copy week `from` over week `to` (the Week sheet's "Copy from"). */
export function copyWeek(d: ProgramDraft, from: number, to: number): ProgramDraft {
  const plans = d.weekPlans;
  if (!plans || !plans[from] || !plans[to] || from === to) return d;
  return { ...d, weekPlans: plans.map((w, i) => (i === to ? { days: cloneDays(plans[from].days) } : w)) };
}

/**
 * How a saved week template lands in a program week — everything the sheet has to say before it applies.
 *
 * Computed rather than described, because the two facts that matter are both arithmetic: a week template
 * carries its own number of days, the program carries `daysPerWeek`, and they are under no obligation to
 * agree. Getting that wrong in either direction is silent data loss, so the numbers are produced here and
 * the screen states them BEFORE the athlete commits.
 */
export interface WeekFit {
  /** Days that will actually be written. */
  taken: number;
  /** Days on the END of the template that cannot fit, because the program has fewer training days. */
  dropped: number;
  /** Program day slots left with nothing in them, because the template is shorter than the week. */
  emptied: number;
}

export function weekFit(d: ProgramDraft, sourceDays: number): WeekFit {
  const taken = Math.min(sourceDays, d.daysPerWeek);
  return { taken, dropped: Math.max(0, sourceDays - d.daysPerWeek), emptied: Math.max(0, d.daysPerWeek - sourceDays) };
}

/**
 * A SAVED WEEK TEMPLATE, written into one week of a program.
 *
 * The week-level counterpart of `templateIntoDay`, and the thing whose absence made the two libraries
 * feel inconsistent: a day template could fill a program day, and a week template could only ever be run
 * on its own.
 *
 * ══ IT REPLACES THE WEEK. THERE IS NO APPEND ══
 *
 * `templateIntoDay` offers append because a day can honestly be built from two shapes stacked together.
 * A week cannot: appending would have to mean "add these days to the end", and the end is fixed by
 * `daysPerWeek`. So this is always a replacement, the sheet says so, and `weekFit` above tells the athlete
 * exactly what that costs before they agree to it.
 *
 * ══ POSITION OWNS THE LETTER, THE TEMPLATE OWNS EVERYTHING ELSE ══
 *
 * Day letters are the program's own coordinate system — `lockedCells` and the schedule both address days
 * by position — so slot 0 stays `A` no matter what the template called it. The NAME travels, because
 * "Push" is the template's content rather than its address.
 *
 * ══ SHORTER TEMPLATE ⇒ THE REMAINING DAYS ARE EMPTIED, NOT LEFT ══
 *
 * A 3-day week dropped into a 4-day program leaves day D blank rather than keeping whatever was there.
 * Keeping it would produce a hybrid week the athlete never authored and cannot see the seam in — the
 * worse of the two failures, and the one they would find weeks later. `weekFit().emptied` is what the
 * confirmation names.
 *
 * Ids are regenerated so the copy never aliases the template; group ids ride along unchanged, exactly as
 * `copyWeek` carries them, because the whole week moves as a unit and adjacency is what makes a superset.
 */
export function weekTemplateIntoWeek(d: ProgramDraft, weekIndex: number, source: ProgramDay[]): ProgramDraft {
  if (!source.length) return d;

  const filled = Array.from({ length: d.daysPerWeek }, (_, i) => {
    const slot = emptyDay(i);
    const from = source[i];
    if (!from) return slot;
    const [copy] = cloneDays([from]);
    return { ...copy, letter: slot.letter, ...clampDayRows(copy) };
  });

  // Repeat mode has one week and it is `days`; the index is meaningless there and is ignored.
  if (!d.vary) return { ...d, days: filled, openDay: null };

  const plans = d.weekPlans;
  if (!plans || !plans[weekIndex]) return d;
  return {
    ...d,
    weekPlans: plans.map((w, i) => (i === weekIndex ? { days: filled } : w)),
    openWeek: weekIndex,
    openDay: null,
  };
}

/**
 * Pull every row back inside what the builder's own steppers can express (1–8 sets, 1–60 reps).
 *
 * A week template can only have been authored by this builder, so in practice nothing is ever out of
 * range — this defends against a `structure` that was edited by something else, where the alternative is
 * a value sitting in a program that no control on the screen can reach or correct. Same guard, same
 * reason, as `templateIntoDay`.
 */
function clampDayRows(day: ProgramDay): Pick<ProgramDay, 'warmup' | 'main' | 'cooldown'> {
  const fix = (list: ProgramExercise[]): ProgramExercise[] =>
    list.map((x) => (x.kind === 'cardio' ? x : { ...x, sets: clampSets(x.sets ?? 1), reps: clampReps(x.reps ?? 1) }));
  return { warmup: fix(day.warmup), main: fix(day.main), cooldown: fix(day.cooldown) };
}

/** Empty a week back to its day skeleton. */
export function clearWeek(d: ProgramDraft, index: number): ProgramDraft {
  const plans = d.weekPlans;
  if (!plans || !plans[index]) return d;
  return { ...d, weekPlans: plans.map((w, i) => (i === index ? { days: makeDays(d.daysPerWeek, []) } : w)) };
}

/**
 * The next week worth opening after finishing this one: the first incomplete week AFTER the current one,
 * wrapping to any earlier gap, and null once every week is built (which closes back to the review list).
 */
export function nextIncompleteWeek(d: ProgramDraft, from: number): number | null {
  const plans = d.weekPlans ?? [];
  for (let i = from + 1; i < d.weeks; i++) if (!weekComplete(plans[i])) return i;
  for (let i = 0; i < d.weeks; i++) if (!weekComplete(plans[i])) return i;
  return null;
}

/** How many weeks are built out — drives the program-progress bar. */
export function completedWeeks(d: ProgramDraft): number {
  return (d.weekPlans ?? []).filter(weekComplete).length;
}

/** Where the Day Builder's forward button goes next. `week` is null when the move stays inside this one. */
export interface NextDayStop {
  /** The week to open, or null to stay in the current one. */
  week: number | null;
  /** The day index within that week. */
  day: number;
}

/**
 * BUILDING IS A SEQUENCE, SO THE BUILDER HAS TO KNOW WHAT COMES NEXT.
 *
 * PO: *"It needs to be more obvious that I can save that day and move on to the next… all the way until
 * the last day and week."* The Day Builder only ever knew about the day after this one **within the open
 * week**, so the forward path died at Day D of Week 1 in a twelve-week program — the athlete was dropped
 * back to a list and had to find their own way into Week 2. Forward now means the next day, and when
 * there isn't one, **the first day of the next week**.
 *
 * ⚠ ONLY IN CUSTOMIZE-PER-WEEK MODE. A repeating template has no week dimension at all — `d.days` IS
 * every week — so its last day is genuinely the end and returning null there is the correct answer, not
 * a missing case. `d.weeks` can be 12 while `vary` is false; reading it anyway would invent eleven
 * weeks' worth of days that do not exist.
 *
 * Returns null at the true end of the build, which is what turns the footer back into a plain Save.
 */
export function nextDayStop(d: ProgramDraft): NextDayStop | null {
  if (d.openDay == null) return null;

  const days = activeDays(d);
  if (d.openDay + 1 < days.length) return { week: null, day: d.openDay + 1 };

  // Past the last day of the week: step into the next week if this draft HAS weeks to step into.
  if (!d.vary || !d.weekPlans || d.openWeek == null) return null;
  const nextWeek = d.openWeek + 1;
  if (nextWeek >= d.weeks || !d.weekPlans[nextWeek]) return null;
  return { week: nextWeek, day: 0 };
}

/** The day a `NextDayStop` points at, so a caller can name it without re-deriving where it lives. */
export function dayAtStop(d: ProgramDraft, stop: NextDayStop): ProgramDay | undefined {
  const days = stop.week == null ? activeDays(d) : d.weekPlans?.[stop.week]?.days ?? [];
  return days[stop.day];
}

/**
 * Is there anything in this draft worth not losing? Drives the leave-the-builder confirmation: a
 * never-touched draft closes silently, anything the athlete actually typed or added asks first.
 */
export function draftHasContent(d: ProgramDraft): boolean {
  if (d.name.trim().length > 0) return true;
  const touched = (days: ProgramDay[]) => days.some((day) => day.name.trim().length > 0 || dayTotal(day) > 0);
  if (touched(d.days)) return true;
  return (d.weekPlans ?? []).some((w) => touched(w.days));
}

/** Save gate: a name and at least one main exercise somewhere (design `_isValid`). */
export function isDraftValid(d: ProgramDraft): boolean {
  return hasName(d) && hasMainExercise(d);
}
export const hasName = (d: ProgramDraft) => d.name.trim().length > 0;
export const hasMainExercise = (d: ProgramDraft) =>
  d.vary && d.weekPlans
    ? d.weekPlans.some((w) => w.days.some((day) => day.main.length > 0))
    : d.days.some((day) => day.main.length > 0);

// ─────────────────────────────────────────────────────────────────────────────
// SUPERSETS — authored in the builder, performed as one card in the logger
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pair the exercise at `index` with the one after it, inside one section of one day.
 *
 * ADJACENT WITHIN A SECTION, always. Both the logger and the program layer resolve a block by walking
 * adjacent items with the same `groupId`, so a pairing whose members are apart — or split across
 * Warm-up and Main — would silently read as two separate one-member blocks. Pairing the LAST row is a
 * no-op rather than an error: there is nothing after it to pair with.
 *
 * Joining an existing superset EXTENDS it (the whole run takes the same id and round count) rather than
 * starting a rival block beside it.
 *
 * `groupRounds` is the longest member's set count, matching the logger's own rule, so a 3-set press
 * paired with a 4-set row gives four rounds and the fourth simply has one lift in it.
 */
export function pairWithNext(list: ProgramExercise[], index: number): ProgramExercise[] {
  if (index < 0 || index >= list.length - 1) return list;
  const cur = list[index];
  const gid = cur.groupKind === 'superset' && cur.groupId ? cur.groupId : `ss${newExerciseId()}`;
  let start = index;
  if (cur.groupKind === 'superset' && cur.groupId) {
    while (start > 0 && list[start - 1].groupId === cur.groupId) start -= 1;
  }
  const end = index + 1;
  let rounds = 1;
  for (let i = start; i <= end; i += 1) rounds = Math.max(rounds, list[i].sets ?? 1);
  return list.map((x, i) =>
    i >= start && i <= end ? { ...x, groupId: gid, groupKind: 'superset' as const, groupName: 'Superset', groupRounds: rounds, groupCapSec: null } : x,
  );
}

/** Dissolve the block containing `index` back into ordinary rows. Prescriptions are untouched. */
export function unpairAt(list: ProgramExercise[], index: number): ProgramExercise[] {
  const gid = list[index]?.groupId;
  if (!gid) return list;
  let a = index;
  while (a > 0 && list[a - 1].groupId === gid) a -= 1;
  let b = index;
  while (b < list.length - 1 && list[b + 1].groupId === gid) b += 1;
  return list.map((x, i) => {
    if (i < a || i > b) return x;
    const { groupId: _g, groupName: _n, groupKind: _k, groupRounds: _r, groupCapSec: _c, ...rest } = x;
    return rest;
  });
}

/**
 * Which superset a row belongs to within its section: its position, the block's size, and what the row
 * is CALLED.
 *
 * `label` is "A1" / "A2", and the letter identifies the BLOCK — a second superset in the same day is
 * B1/B2. Both builders drew `String.fromCharCode(64 + pos)` before, which restarted at A for every
 * block, so a day with two supersets had two exercises called A and two called B and "do A next" named
 * four different lifts. The rule lives in `domain/program/prescription` because the live logger needs
 * the identical answer; see `supersetLabels`.
 */
export function pairingAt(
  list: ProgramExercise[],
  index: number,
): { pos: number; count: number; label: string; letter: string } | null {
  const gid = list[index]?.groupId;
  if (!gid || list[index].groupKind !== 'superset') return null;
  let a = index;
  while (a > 0 && list[a - 1].groupId === gid) a -= 1;
  let b = index;
  while (b < list.length - 1 && list[b + 1].groupId === gid) b += 1;
  if (b - a + 1 < 2) return null;
  const label = supersetLabelAt(list, index);
  // `supersetLabels` uses the same adjacency rule as the walk above, so this cannot be null here — the
  // fallback exists so a future divergence degrades to the old numbering rather than rendering "null1".
  return { pos: index - a + 1, count: b - a + 1, label: label ?? `A${index - a + 1}`, letter: (label ?? 'A').replace(/\d+$/, '') };
}

/** The persisted shape — the draft minus its editing-session bookkeeping. */
export function draftToStructure(d: ProgramDraft): ProgramStructure {
  return {
    name: d.name.trim(),
    weeks: d.weeks,
    daysPerWeek: d.daysPerWeek,
    vary: d.vary,
    days: d.days,
    weekPlans: d.vary ? d.weekPlans : null,
  };
}

/**
 * Seed a draft from an existing program — the builder's edit / duplicate entry. A program saved by this
 * builder is already in draft shape, so it loads directly; duplicating re-ids every exercise and renames
 * the copy so the original is never mutated by editing the fork.
 */
export function hydrateDraft(
  source: { id: string; name: string; structure: ProgramStructure },
  mode: 'edit' | 'dup',
  live: LiveEditGuard | null = null,
): ProgramDraft {
  const s = source.structure;
  const dup = mode === 'dup';
  const copyDays = (days: ProgramDay[]): ProgramDay[] =>
    days.map((d) => ({
      letter: d.letter,
      name: d.name,
      warmup: copyExercises(d.warmup, dup),
      main: copyExercises(d.main, dup),
      cooldown: copyExercises(d.cooldown, dup),
    }));

  const srcDays = copyDays(s.days ?? []);

  const draft: ProgramDraft = {
    name: dup ? `${s.name || source.name} (Copy)` : s.name || source.name,
    weeks: clampWeeks(s.weeks || 8),
    daysPerWeek: clampDays(s.daysPerWeek || 4),
    vary: !!s.vary,
    openWeek: null,
    openDay: null,
    // ⚠ NOT `makeDays`. That helper pads OR TRUNCATES to `daysPerWeek`, which is the silent
    // day-deletion migration `0123` documents: a ragged program — and every Coach Holt program is
    // ragged — loses its tail merely by being OPENED here. The source's own day list is authoritative;
    // the fallback only covers a structure that has no days at all.
    days: srcDays.length > 0 ? srcDays : makeDays(clampDays(s.daysPerWeek || 4), []),
    weekPlans: s.weekPlans ? s.weekPlans.map((w) => ({ days: copyDays(w.days) })) : null,
    mode,
    // A duplicate is a NEW program — it must never write back over the source.
    editId: mode === 'edit' ? source.id : null,
    srcId: source.id,
    live,
  };
  // `padWeeks`, not `ensureWeeks` — same reason as the day list above: an existing week must come
  // through exactly as it was written, and only ABSENT weeks get built.
  return draft.vary ? padWeeks(draft) : draft;
}

function copyExercises(list: ProgramExercise[], reId: boolean): ProgramExercise[] {
  return (list ?? []).map((x) => ({ ...x, id: reId || !x.id ? newExerciseId() : x.id }));
}

/**
 * A draft from a structure the coach just built — the handoff that makes the Builder its review screen.
 *
 * ══ WHY NOT `hydrateDraft` ══
 *
 * That one takes `'edit' | 'dup'`, and neither is true here: there is no source row to write back to and
 * nothing to copy. Passing `'dup'` would work by accident and then name the program "(Copy)".
 *
 * ⚠ AND IT MUST NOT GO THROUGH `makeDays`. That helper pads or TRUNCATES to `daysPerWeek`, which is the
 * mechanism behind the silent day-deletion documented in migration 0123 — a ragged week loses its tail
 * just by being opened. A coach structure already has exactly `daysPerWeek` days in every week (the
 * assembler builds it from a skeleton of that length and the matrix test asserts the counts agree), so
 * there is nothing to normalise and everything to lose by trying.
 *
 * Every exercise gets a fresh id because these rows have never existed anywhere before.
 */
export function draftFromStructure(structure: ProgramStructure): ProgramDraft {
  const copyDays = (days: ProgramDay[]): ProgramDay[] =>
    (days ?? []).map((d) => ({
      letter: d.letter,
      name: d.name,
      warmup: copyExercises(d.warmup ?? [], true),
      main: copyExercises(d.main ?? [], true),
      cooldown: copyExercises(d.cooldown ?? [], true),
    }));

  return {
    name: structure.name,
    weeks: clampWeeks(structure.weeks),
    daysPerWeek: clampDays(structure.daysPerWeek),
    vary: !!structure.vary,
    openWeek: null,
    // Opens on the first day of week one. The athlete arrives to see a workout, not a settings form —
    // the whole point of the handoff is that they read what was built before they accept it.
    openDay: 0,
    days: copyDays(structure.days ?? []),
    weekPlans: structure.weekPlans ? structure.weekPlans.map((w) => ({ days: copyDays(w.days) })) : null,
    // NEW, with no `editId`: saving creates a program. It is the athlete's from the moment they accept it,
    // which is also what makes it `ATHLETE_CREATED` rather than needing a source enum it has no claim to.
    mode: 'new',
    editId: null,
    srcId: null,
    live: null,
  };
}

/** Repair a draft read back from storage (older shapes, missing letters, legacy "Day A" names). */
export function normalizeDraft(d: ProgramDraft): ProgramDraft {
  const fix = (days: ProgramDay[]): ProgramDay[] =>
    days.map((day, i) => ({
      ...day,
      letter: day.letter || DAY_LETTERS[i] || String(i + 1),
      name: /^Day [A-F]$/.test(day.name ?? '') ? '' : (day.name ?? ''),
      warmup: day.warmup ?? [],
      main: day.main ?? [],
      cooldown: day.cooldown ?? [],
    }));
  const next: ProgramDraft = { ...d, days: fix(d.days ?? []), live: d.live ?? null };
  // ⚠ `padWeeks`, NOT `ensureWeeks`. This runs on EVERY focus — every return trip from the Picker — and
  // `ensureWeeks` truncates each week to `daysPerWeek`. For a draft the builder itself made the two always
  // agree, so it never showed; a ragged program opened for a live edit would have lost its tail on the
  // first exercise the athlete added. Padding an absent week is the only repair this needs.
  return next.vary ? padWeeks(next) : next;
}
