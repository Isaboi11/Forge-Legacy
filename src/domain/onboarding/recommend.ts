import { getProgramDefinitions } from '@/domain/training/programs';
import type { ProgramDefinition } from '@/domain/training/schema';

/**
 * Program recommendation for the Recommended-Program screen. The design `.dc`'s goal×experience×equipment
 * map references a large catalog; ours is the two LOCKED Strength programs, so per the PO ruling we map
 * to real ids and fall back to Strength Foundation I (the design's own fallback) whenever a ranked id has
 * no catalog match — which, with a 2-program catalog, is most inputs.
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

const FALLBACK_ID = 'strength-foundation-i-3day';
const ADVANCED_ID = 'strength-foundation-ii-4day';

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

/** Rank the real catalog; SF II for intermediate/advanced, else SF I — always resolves to a real program. */
export function recommendProgram(input: { experience?: string | null }): ProgramView {
  const defs = getProgramDefinitions();
  const byId = (id: string) => defs.find((d) => d.id === id);
  const wantId = input.experience === 'intermediate' || input.experience === 'advanced' ? ADVANCED_ID : FALLBACK_ID;
  const def = byId(wantId) ?? byId(FALLBACK_ID) ?? defs[0];
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
