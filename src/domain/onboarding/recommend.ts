import { getProgramDefinitions } from '@/domain/training/programs';
import type { ProgramDefinition } from '@/domain/training/schema';
import { PICKER_DB } from '@/domain/exercise-picker/data';
import { programCoverage, type GymCoverage } from '@/domain/home-gym/equipment';
import { canRecommend, FALLBACK_ID, resolveRecommendationId, type RecommendInput } from './recommend-core';

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

/**
 * Whether the real catalog can answer the intake's questions, and so whether Home offers the guided
 * on-ramp at all. Mechanism in `canRecommend`; this resolves it against what is actually authored.
 */
export function catalogCanRecommend(): boolean {
  return canRecommend(getProgramDefinitions().map((d) => d.id));
}

/** Recommend a real catalog program from the athlete's intake (experience + primary goal + equipment). */
export function recommendProgram(input: RecommendInput): ProgramView {
  const defs = getProgramDefinitions();
  const byId = (id: string) => defs.find((d) => d.id === id);
  const def = byId(resolveRecommendationId(input)) ?? byId(FALLBACK_ID) ?? defs[0];
  return toView(def);
}

/**
 * The recommendation plus the other catalog programs, so the athlete picks rather than being assigned.
 *
 * Only the FIRST entry is a recommendation. The rest are simply the other programs in the catalog, in
 * catalog order — there is no scoring model behind the intake (it is a lookup table), so presenting them
 * as a ranked "second best" would dress a fixed list up as an opinion the app doesn't have.
 */
export function recommendProgramOptions(input: RecommendInput, limit = 3): ProgramView[] {
  const recommended = recommendProgram(input);
  const rest = getProgramDefinitions()
    .filter((d) => d.id !== recommended.id)
    .map(toView);

  // With a Home Gym profile the alternates stop being catalog order and become "what you can actually
  // train", best-covered first. This is a real ordering, unlike the goal/experience map behind the
  // recommendation itself — so it applies ONLY to the alternates, and the recommendation keeps its
  // place. Offering someone a program they can do a third of, above one they can do all of, is worse
  // than not ordering at all.
  const owned = input.homeGym ?? null;
  const ordered =
    owned == null
      ? rest
      : [...rest].sort((a, b) => coverageRatio(b.id, owned) - coverageRatio(a.id, owned));

  return [recommended, ...ordered].slice(0, Math.max(1, limit));
}

/** Fraction of a program's movements the athlete can train; 0 when there's nothing to judge. */
function coverageRatio(programId: string, owned: readonly string[]): number {
  const c = programGymCoverage(programId, owned);
  return c && c.total > 0 ? c.doable / c.total : 0;
}

/** All catalog programs for the "browse other compatible programs" reveal. */
export function programViews(): ProgramView[] {
  return getProgramDefinitions().map(toView);
}

export function programViewById(id: string): ProgramView | undefined {
  const d = getProgramDefinitions().find((x) => x.id === id);
  return d ? toView(d) : undefined;
}

/**
 * How much of a program the athlete's Home Gym actually covers.
 *
 * Derived from the movements the program really prescribes — our program definitions carry no
 * `equipment` tag (so the design's `PROG_REQ` table has nothing to read), and a derived answer can't
 * drift from the content the way a hand-written tag does.
 *
 * Returns `null` when there is no profile to judge against, so callers show nothing rather than an
 * invented "100%". Warm-ups are included: they're prescribed work, and a warm-up you can't do is a
 * gap the athlete should hear about before starting.
 */
export function programGymCoverage(programId: string, owned: readonly string[] | null): GymCoverage | null {
  if (owned == null) return null;
  const def = getProgramDefinitions().find((d) => d.id === programId);
  if (!def) return null;

  const byKey = new Map(PICKER_DB.map((x) => [x.key, x]));
  const items: { key: string; equipId: string; name: string }[] = [];

  for (const block of def.blocks ?? []) {
    for (const workout of block.workouts ?? []) {
      for (const ex of [...(workout.warmup ?? []), ...(workout.main ?? [])]) {
        const key = 'catalogKey' in ex ? ex.catalogKey : undefined;
        const hit = key ? byKey.get(key) : undefined;
        // An unresolved prescription is skipped, not counted as missing gear — not knowing what a
        // movement is isn't evidence the athlete lacks a rack.
        if (hit) items.push({ key: hit.key, equipId: hit.equipId, name: hit.name });
      }
    }
  }

  return programCoverage(items, owned);
}
