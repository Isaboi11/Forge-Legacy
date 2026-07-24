/**
 * W-22 Exercise Detail — assembling one exercise's page from the three real sources.
 *
 *   identity + muscles  ← the 794-exercise catalog (`exercise-picker/data`)
 *   alternatives        ← the relationship graph (`exercise-relationships`, 5,698 edges)
 *   coaching copy       ← `exercise-coaching/integration`, the ONE sanctioned bridge
 *
 * The coaching bridge serves **Published content only** and returns null otherwise. That is deliberate:
 * the 556 generated records sit behind a human approve/publish gate, and lowering it here would put
 * unreviewed coaching instructions in front of an athlete lifting heavy weight. When it returns null the
 * page simply omits those sections (W-22 §4.2 — absent sections are hidden, never faked).
 */

import { EXERCISE_CATEGORIES, itemByKey, itemByName, type PickerItem } from '@/domain/exercise-picker/data';
import { exerciseRelationships } from '@/domain/exercise-relationships/query-service';
import { getExerciseDetailCoaching } from '@/domain/exercise-coaching/integration';
import type { ExerciseCoachingView } from '@/domain/exercise-coaching/schema';

export interface ExerciseAlternative {
  key: string;
  name: string;
  equip: string;
  equipId: string;
  /** Why it's offered — the relationship type plus what it preserves. */
  note: string;
  /** The top-ranked alternative is the recommended substitute. */
  best: boolean;
}

export interface ExerciseDetailView {
  key: string;
  name: string;
  categoryLabel: string;
  equip: string;
  equipId: string;
  difficulty: string;
  pattern: string;
  modality: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  alternatives: ExerciseAlternative[];
  /** Null whenever nothing is published for this exercise — the common case today. */
  coaching: ExerciseCoachingView | null;
}

const CATEGORY_LABEL = new Map(EXERCISE_CATEGORIES.map((c) => [c.key, c.label]));

/** A short, honest reason a substitute is offered — derived from the edge, not written by hand. */
function noteFor(rel: { type: string; preservesPattern?: boolean; samePrimaryMuscle?: boolean }): string {
  const bits: string[] = [rel.type];
  if (rel.preservesPattern) bits.push('same pattern');
  else if (rel.samePrimaryMuscle) bits.push('same primary muscle');
  return bits.join(' · ');
}

/** Split the item's muscle names back into primary and secondary (the catalog orders primary first). */
function splitMuscles(item: PickerItem): { primary: string[]; secondary: string[] } {
  const n = item.primaryMuscleIds.length;
  return { primary: item.muscles.slice(0, n), secondary: item.muscles.slice(n) };
}

/** Resolve by catalog id, falling back to a display name (callers often only have the name logged). */
export function resolveExercise(idOrName: string): PickerItem | undefined {
  return itemByKey(idOrName) ?? itemByName(idOrName);
}

export function buildExerciseDetail(idOrName: string, altLimit = 8): ExerciseDetailView | null {
  const item = resolveExercise(idOrName);
  if (!item) return null;

  const { primary, secondary } = splitMuscles(item);

  const alternatives: ExerciseAlternative[] = exerciseRelationships
    .getSubstitutionPool(item.key)
    .slice(0, altLimit)
    .map((rel, i) => {
      const target = itemByKey(rel.targetExerciseId);
      return {
        key: rel.targetExerciseId,
        name: target?.name ?? rel.targetExerciseId,
        equip: target?.equip ?? '',
        equipId: target?.equipId ?? '',
        note: noteFor(rel),
        best: i === 0,
      };
    })
    // An edge pointing at something outside the catalog can't be opened, so it isn't offered.
    .filter((a) => a.equipId !== '');

  return {
    key: item.key,
    name: item.name,
    categoryLabel: CATEGORY_LABEL.get(item.cat) ?? '',
    equip: item.equip,
    equipId: item.equipId,
    difficulty: item.difficulty,
    pattern: item.pattern,
    modality: item.modality,
    primaryMuscles: primary,
    secondaryMuscles: secondary,
    alternatives,
    coaching: getExerciseDetailCoaching(item.key),
  };
}
