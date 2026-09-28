import type { ProgramExercise } from '@/data/programs-live';
import type { TemplateExercise } from '@/data/templates-live';
import { cardioKey, type CardioActivity } from '@/domain/workout/conditioning';
import type { WorkoutDraft } from '@/lib/workout-builder-draft';

/*
 * The Workout Builder's draft → the stored template rows. Moved out of `workout-builder.tsx` (2026-09-27) so a
 * workout pasted on Home ("Paste a workout", `/program-import?for=today`) starts from EXACTLY the rows the
 * builder would have saved — timed sets, cardio blocks, supersets and cues included. Two copies would drift.
 */

/** Draft rows → the stored template shape, section by section, order preserved. */
export function toTemplateExercises(d: WorkoutDraft): TemplateExercise[] {
  const of = (list: ProgramExercise[], section: TemplateExercise['section']): TemplateExercise[] =>
    list.map((x) => ({
      // ⚠ THE ACTIVITY RIDES IN `catalogKey`. `TemplateExercise` has no activity field and adding one
      // would mean a migration — but `conditioning.ts` already defines this exact round-trip for the
      // purpose: `cardioKey('run')` is `'cardio:run'` and `activityFromKey` reads it back. Using the
      // convention that exists beats inventing a column.
      catalogKey:
        x.kind === 'cardio'
          ? cardioKey((x.activity ?? 'run') as CardioActivity)
          : (x.catalogKey ?? null),
      name: x.name,
      sets: x.sets ?? 1,
      // A TIMED set has no reps — its clock goes in `targetDurationSec`, the column cardio already uses.
      targetReps: x.kind !== 'cardio' && x.durationSec != null ? 0 : (x.reps ?? 0),
      section,
      // ⚠ WAS HARDCODED `'strength'`, WITH BOTH TARGETS NULLED. Every cardio block an athlete authored
      // was silently saved as a strength row with no distance — the exact write-only-field failure the
      // schema's own comments warn about, and the reason W-25 could not hold a run at all.
      kind: x.kind === 'cardio' ? ('cardio' as const) : ('strength' as const),
      groupId: x.groupId ?? null,
      groupName: x.groupName ?? null,
      groupKind: x.groupKind ?? null,
      groupRounds: x.groupRounds ?? null,
      targetMi: x.targetMi ?? null,
      targetDurationSec: x.kind === 'cardio' ? (x.targetSec ?? null) : (x.durationSec ?? null),
      coachNote: x.coachNote ?? null,
    }));
  return [...of(d.warmup, 'warmup'), ...of(d.main, 'main'), ...of(d.cooldown, 'cooldown')];
}
