import type { ProgramDay, ProgramExercise, ProgramStructure, ProgramWeekPlan } from '@/data/programs-live';
import type { BuilderInbox, BuilderSection } from '@/lib/builder-inbox';

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
}

export const DAY_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

// Clamps — design §14 / `setWeeks`,`setDays`,`bumpSets`,`bumpReps`.
export const WEEKS_MIN = 4;
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

/** Which superset a row belongs to within its section: its position and the block's size. */
export function pairingAt(list: ProgramExercise[], index: number): { pos: number; count: number } | null {
  const gid = list[index]?.groupId;
  if (!gid || list[index].groupKind !== 'superset') return null;
  let a = index;
  while (a > 0 && list[a - 1].groupId === gid) a -= 1;
  let b = index;
  while (b < list.length - 1 && list[b + 1].groupId === gid) b += 1;
  if (b - a + 1 < 2) return null;
  return { pos: index - a + 1, count: b - a + 1 };
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

  const draft: ProgramDraft = {
    name: dup ? `${s.name || source.name} (Copy)` : s.name || source.name,
    weeks: clampWeeks(s.weeks || 8),
    daysPerWeek: clampDays(s.daysPerWeek || 4),
    vary: !!s.vary,
    openWeek: null,
    openDay: null,
    days: makeDays(clampDays(s.daysPerWeek || 4), copyDays(s.days ?? [])),
    weekPlans: s.weekPlans ? s.weekPlans.map((w) => ({ days: copyDays(w.days) })) : null,
    mode,
    // A duplicate is a NEW program — it must never write back over the source.
    editId: mode === 'edit' ? source.id : null,
    srcId: source.id,
  };
  return draft.vary ? ensureWeeks(draft) : draft;
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
  const next: ProgramDraft = { ...d, days: fix(d.days ?? []) };
  return next.vary ? ensureWeeks(next) : next;
}
