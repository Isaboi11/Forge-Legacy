import type { TemplateExercise } from '@/data/templates-live';

/**
 * The workout written on `/workout-write`, waiting for the squad composer that opened it (PO 2026-09-27).
 *
 * The same one-slot hand-off as `lib/meal-plan-intent.ts`, but PEEKED rather than taken: the composer re-reads it
 * on every focus (a keyboard, a sheet, a photo picker all blur it) and it must still be there. The composer clears
 * it when the athlete chooses Workout afresh, picks a saved one instead, or posts.
 */
export interface WrittenDraft {
  name: string;
  exercises: TemplateExercise[];
  how: string | null;
  after: string | null;
}

let pending: WrittenDraft | null = null;

export function putWrittenDraft(d: WrittenDraft): void {
  pending = d;
}

export async function peekWrittenDraft(): Promise<WrittenDraft | null> {
  return pending;
}

export function clearWrittenDraft(): void {
  pending = null;
}
