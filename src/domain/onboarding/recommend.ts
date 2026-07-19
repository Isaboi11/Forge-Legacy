import { getProgramDefinitions } from '@/domain/training/programs';
import type { ProgramDefinition } from '@/domain/training/schema';
import { FALLBACK_ID, resolveRecommendationId, type RecommendInput } from './recommend-core';

/**
 * Program recommendation for the Home starting-point on-ramp. The goal × experience × equipment mechanism
 * lives (pure + tested) in `recommend-core.ts`; this layer resolves the chosen id against the real catalog
 * and shapes a `ProgramView`. With a 2-program catalog every input still resolves to Strength Foundation
 * I or II — real mechanism, thin catalog.
 */
export interface ProgramView {
  id: string;
  name: string;
  family: string;
  difficulty: string;
  weeks: number;
  perWeek: number;
  workouts: number;
  description: string;
}

function toView(d: ProgramDefinition): ProgramView {
  const weeks = d.durationWeeks ?? 0;
  const perWeek = d.frequencyPerWeek ?? 0;
  return {
    id: d.id,
    name: d.name,
    family: d.family,
    difficulty: d.difficulty ?? '',
    weeks,
    perWeek,
    workouts: weeks * perWeek,
    description: d.description ?? '',
  };
}

/** Recommend a real catalog program from the athlete's intake (experience + primary goal + equipment). */
export function recommendProgram(input: RecommendInput): ProgramView {
  const defs = getProgramDefinitions();
  const byId = (id: string) => defs.find((d) => d.id === id);
  const def = byId(resolveRecommendationId(input)) ?? byId(FALLBACK_ID) ?? defs[0];
  return toView(def);
}

/** All catalog programs for the "browse other compatible programs" reveal. */
export function programViews(): ProgramView[] {
  return getProgramDefinitions().map(toView);
}

export function programViewById(id: string): ProgramView | undefined {
  const d = getProgramDefinitions().find((x) => x.id === id);
  return d ? toView(d) : undefined;
}
