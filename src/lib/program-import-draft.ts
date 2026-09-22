/**
 * A CONFIRMED IMPORT → A BUILDER DRAFT, and the one line that says what did not fit.
 *
 * Moved out of `program-builder.tsx`'s `confirmImport` (2026-09-21) so the Build a Program paste and
 * photo SCREENS, which confirm an import before the builder is even open, produce exactly the draft the
 * builder's own import does. Two copies of these clamps would drift, and the drift would be a program
 * that imports one way from one door and another way from the other.
 *
 * ⚠ RELATIVE, EXTENSIONED IMPORTS so `node --test` can load this file — `program-import-draft.test.mjs`
 * holds the limits below to what they say. `@/` would not resolve there.
 */
import { toProgramStructure, unmatchedNames, type ParsedWeek } from '../domain/program/import-parse.ts';
import {
  DAYS_MAX,
  REPS_MAX,
  SETS_MAX,
  WEEKS_MAX,
  clampDays,
  clampReps,
  clampSets,
  clampWeeks,
  type ProgramDraft,
} from './program-draft-model.ts';

export interface ImportedDraft {
  draft: ProgramDraft;
  /** The toast: "Imported — review and save", or what was lost, leading with it. */
  toast: string;
}

/**
 * ══ WHAT WILL NOT FIT, SAID BEFORE ANYTHING IS CREATED ══
 *
 * The draft has hard bounds (WEEKS 1–52, DAYS 2–6, SETS 1–8, REPS 1–60). This names every place a read
 * goes past them, in the words the preview shows ABOVE the summary — so the athlete learns that Sunday
 * is not coming, or that "Push-ups 5x100" will become 5 × 60, while they can still go back and change
 * the paste, not from a toast after the program exists (stress test, 2026-09-21).
 *
 * Checked across EVERY week. It used to look at week 1 only, so a seventh day in week 2 vanished
 * without a word.
 */
export function importLimitNotes(weeks: readonly ParsedWeek[], opts: { isWeek?: boolean } = {}): string[] {
  const notes: string[] = [];

  const dropped: string[] = [];
  for (const w of weeks) {
    for (const d of w.days.slice(DAYS_MAX)) dropped.push(weeks.length > 1 ? `week ${w.index} ${d.name}` : d.name);
  }
  if (dropped.length) {
    notes.push(
      `${dropped.length} day${dropped.length === 1 ? '' : 's'} over the ${DAYS_MAX}-day limit ${dropped.length === 1 ? 'is' : 'are'} dropped (${dropped.join(', ')})`,
    );
  }

  if (!opts.isWeek && weeks.length > WEEKS_MAX) {
    notes.push(`${weeks.length} weeks read — a program holds ${WEEKS_MAX}, so weeks after ${WEEKS_MAX} are dropped`);
  }

  const capped = new Set<string>();
  for (const w of weeks) {
    for (const d of w.days) {
      for (const i of d.items) {
        if (i.kind === 'cardio') continue;
        if (i.sets > SETS_MAX || i.reps > REPS_MAX) capped.add(`${i.name} ${i.sets}×${i.reps}`);
      }
    }
  }
  if (capped.size) {
    const list = [...capped];
    notes.push(
      `sets and reps are capped at ${SETS_MAX} × ${REPS_MAX} (${list.slice(0, 3).join(', ')}${list.length > 3 ? ` +${list.length - 3} more` : ''})`,
    );
  }
  return notes;
}

export function draftFromImport(
  base: ProgramDraft,
  weeks: ParsedWeek[],
  opts: { isWeek: boolean; resolveKey: (name: string) => string | undefined },
): ImportedDraft | null {
  if (!weeks.length) return null;
  const { isWeek, resolveKey } = opts;
  const imported = toProgramStructure(weeks, base.name?.trim() || 'Imported Program', resolveKey);

  /*
   * FIT WHAT WAS PASTED INTO WHAT THE BUILDER CAN HOLD — and say so when it does not fit.
   *
   * Clamping silently would be the worse fix. An athlete whose seventh day vanished must be told which
   * day went, not left to discover it on a Thursday. `importLimitNotes` is the one list of what is cut.
   */
  // A cardio bout carries 1 × 0 on purpose (see `toProgramStructure`); clamping would invent a rep.
  const fitRow = <T extends { kind?: string; sets: number; reps: number }>(x: T) =>
    x.kind === 'cardio' ? x : { ...x, sets: clampSets(x.sets), reps: clampReps(x.reps) };
  const fit = (list: typeof imported.days) =>
    list.slice(0, DAYS_MAX).map((d) => ({
      ...d,
      // Warm-up and cool-down hold whatever the text FILED there — see `toProgramStructure`.
      warmup: d.warmup.map(fitRow),
      main: d.main.map(fitRow),
      cooldown: d.cooldown.map(fitRow),
    }));

  // A WEEK TEMPLATE IS ONE WEEK. The sheet has already cut the read to one (`scope="week"`) and said
  // so in its preview; this is the same rule written where the draft is built, so the two cannot drift.
  const weekCount = isWeek ? 1 : clampWeeks(imported.weeks);
  const plans = !isWeek && imported.weekPlans ? imported.weekPlans.slice(0, weekCount).map((w) => ({ days: fit(w.days) })) : null;

  const draft: ProgramDraft = {
    ...base,
    name: base.name?.trim() ? base.name : imported.name,
    weeks: weekCount,
    /*
     * THE WIDEST WEEK, not week 1. A program whose week 2 adds days was created with week 1's count, so
     * the builder's day chips stopped short of days the draft actually held.
     */
    daysPerWeek: clampDays(Math.max(imported.days.length, ...(plans ?? []).map((w) => w.days.length))),
    vary: isWeek ? false : imported.vary,
    days: fit(imported.days),
    weekPlans: plans,
    openWeek: null,
    openDay: null,
  };

  // One line, and it leads with whatever was LOST — the part an athlete needs to know about.
  const notes = importLimitNotes(weeks, { isWeek });
  const unmatched = unmatchedNames(weeks, resolveKey);
  if (unmatched.length) {
    notes.push(
      unmatched.length === 1
        ? '1 name wasn’t in the library and kept yours'
        : `${unmatched.length} names weren’t in the library and kept yours`,
    );
  }
  return { draft, toast: notes.length ? `Imported · ${notes.join(' · ')}` : 'Imported — review and save' };
}
