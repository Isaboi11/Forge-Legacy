import { itemByKey } from '@/domain/exercise-picker/data';
import { templateRowsToDayWith } from '@/domain/program/template-day-core';
import type { TemplateExercise } from '@/data/templates-live';
import type { DaySections } from '@/domain/program/template-day-core';

/**
 * The wired half of the template → program-day conversion: `template-day-core` holds every rule and
 * takes the catalogue as a parameter so `node --test` can load it; this binds the real 794-exercise
 * catalogue to it, and is what screens import.
 */
export { daySectionsSummary } from '@/domain/program/template-day-core';
export type { DaySections } from '@/domain/program/template-day-core';

export function templateRowsToDay(rows: readonly TemplateExercise[]): DaySections {
  return templateRowsToDayWith(rows, itemByKey);
}
