/**
 * A CONFIRMED IMPORT → A BUILDER DRAFT, and the one line that says what did not fit.
 *
 * Moved out of `program-builder.tsx`'s `confirmImport` (2026-09-21) so the Build a Program paste and
 * photo SCREENS, which confirm an import before the builder is even open, produce exactly the draft the
 * builder's own import does. Two copies of these clamps would drift, and the drift would be a program
 * that imports one way from one door and another way from the other.
 *
 * The logic is unchanged from the builder's; only its home moved.
 */
import {
  toProgramStructure,
  unmatchedNames,
  type ParsedWeek,
} from '@/domain/program/import-parse';
import {
  DAYS_MAX,
  clampDays,
  clampReps,
  clampSets,
  clampWeeks,
  type ProgramDraft,
} from '@/lib/program-draft-model';

export interface ImportedDraft {
  draft: ProgramDraft;
  /** The toast: "Imported — review and save", or what was lost, leading with it. */
  toast: string;
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
   * The draft has hard bounds (WEEKS 1–52, DAYS 2–6, SETS 1–8, REPS 1–60) and the import wrote
   * straight past them: a seven-day program would have produced a seventh day the builder has no letter
   * for and no chip to select. Every one of those is a draft that cannot be edited or trusted.
   *
   * Clamping silently would be the worse fix. An athlete whose seventh day vanished must be told which
   * day went, not left to discover it on a Thursday.
   */
  const days = imported.days.slice(0, DAYS_MAX);
  const droppedDays = imported.days.slice(DAYS_MAX).map((d) => d.name);
  const fit = (list: typeof days) =>
    list.map((d) => ({
      ...d,
      main: d.main.map((x) => ({ ...x, sets: clampSets(x.sets), reps: clampReps(x.reps) })),
    }));

  // A WEEK TEMPLATE IS ONE WEEK. The sheet has already cut the read to one (`scope="week"`) and said
  // so in its preview; this is the same rule written where the draft is built, so the two cannot drift.
  const weekCount = isWeek ? 1 : clampWeeks(imported.weeks);
  // Only the CEILING can move a number (the floor is 1, PA2-D1), so the copy names that direction.
  const clamped = !isWeek && weekCount !== imported.weeks;

  const draft: ProgramDraft = {
    ...base,
    name: base.name?.trim() ? base.name : imported.name,
    weeks: weekCount,
    daysPerWeek: clampDays(days.length),
    vary: isWeek ? false : imported.vary,
    days: fit(days),
    weekPlans: !isWeek && imported.weekPlans ? imported.weekPlans.map((w) => ({ days: fit(w.days.slice(0, DAYS_MAX)) })) : null,
    openWeek: null,
    openDay: null,
  };

  // One line, and it leads with whatever was LOST — the part an athlete needs to know about.
  const unmatched = unmatchedNames(weeks, resolveKey);
  const notes: string[] = [];
  if (droppedDays.length) notes.push(`${droppedDays.length} day${droppedDays.length === 1 ? '' : 's'} over the ${DAYS_MAX}-day limit dropped (${droppedDays.join(', ')})`);
  if (clamped) notes.push(`set to ${weekCount} weeks — the longest a program can be`);
  if (unmatched.length) notes.push(`${unmatched.length} name${unmatched.length === 1 ? '' : 's'} weren’t in the library and kept yours`);
  return { draft, toast: notes.length ? `Imported · ${notes.join(' · ')}` : 'Imported — review and save' };
}
