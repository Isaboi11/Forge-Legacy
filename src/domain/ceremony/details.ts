import { fmtLongDate, spanLabel } from '../program/graduation.ts';
import type { CeremonyEvent } from './types.ts';

/**
 * The context rows a ceremony shows between its body and its buttons (M-4 §4 anatomy).
 *
 * Only M-4 has them today. The others are deliberately empty rather than absent from the switch: a rank
 * or an honor is a statement, not a record card, and the one that IS a record card says so by being the
 * only one that returns anything.
 *
 * ══ A MISSING DATUM OMITS ITS ROW; IT NEVER FILLS ONE IN ══
 *
 * A program with no `started_at` renders three rows, not four with an invented date. Same rule the share
 * card and W-17 already follow — absent renders nothing, a fake renders a confident false claim.
 *
 * Pure and node-testable. The copy in `copy.ts` is locked by M4-D5 and is NOT touched by this file;
 * these rows are a separate concern that sits below it.
 */
export interface CeremonyDetail {
  label: string;
  value: string;
}

export function ceremonyDetails(event: CeremonyEvent): CeremonyDetail[] {
  if (event.kind !== 'programGraduated') return [];

  const rows: CeremonyDetail[] = [];
  const push = (label: string, value: string | null) => {
    if (value) rows.push({ label, value });
  };

  // The four labels, in M-4's locked order.
  push('Started', fmtLongDate(event.startedAt));
  push('Graduated', fmtLongDate(event.graduatedAt));
  push('Workouts', event.workouts != null && event.workouts >= 0 ? `${event.workouts} completed` : null);
  // Derived, not carried — see `ProgramGraduatedCeremony`.
  push('Duration', spanLabel(event.startedAt, event.graduatedAt));

  return rows;
}
