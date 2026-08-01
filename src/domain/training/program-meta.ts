import type { ProgramStructure } from './schema';

/**
 * How a program's shape reads on a plate: "12 weeks · Push/Pull/Legs · 4 days/week".
 *
 * This lived in `src/data/post-placeholder.ts` until now, and that was the single most expensive
 * import in the app. `PostContent` is a real production component, and it imported this — a VALUE,
 * not a type — out of a fixture module. One value edge is enough: Metro pulls in the whole module,
 * which imports `squad-feed-placeholder` and `community-placeholder` in turn, so every invented
 * athlete, every invented squad record book and every invented community post was compiled into the
 * production web bundle. `__DEV__`-gating the SCREENS that render fixtures did nothing about it,
 * because gating a screen does not tree-shake a module.
 *
 * It belongs here regardless of that: formatting a program's duration and split is a fact about
 * training, not about feed posts.
 */

/** Display labels for the ProgramStructure enum (the renderer never sees the enum directly). */
const STRUCTURE_LABEL: Record<ProgramStructure, string> = {
  upper_lower: 'Upper / Lower',
  ppl: 'Push/Pull/Legs',
  full_body: 'Full Body',
};

/**
 * Format a program plate's meta line from the real structured fields — the ONE place program meta is
 * rendered, so the feed card and Post Detail agree and a backend swap stays a data change.
 * Omits any field the source didn't supply (never fabricated).
 */
export function formatProgramMeta(p: {
  durationWeeks?: number;
  frequencyPerWeek?: number;
  structure?: ProgramStructure;
}): string {
  const parts: string[] = [];
  if (p.durationWeeks != null) parts.push(`${p.durationWeeks} weeks`);
  if (p.structure) parts.push(STRUCTURE_LABEL[p.structure]);
  if (p.frequencyPerWeek != null) parts.push(`${p.frequencyPerWeek} days/week`);
  return parts.join(' · ');
}
