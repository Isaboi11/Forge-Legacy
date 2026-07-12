/**
 * integration.ts — the ONLY bridge between coaching content and the app UI.
 *
 * It projects a full coaching record onto {@link ExerciseCoachingView}, which
 * omits every internal editorial field (confidenceScore, reviewFlags,
 * contentStatus, riskTier, coachNotes, mistakeCorrections, history, ...).
 * The W-22 Exercise Detail screen must consume ONLY this view — never a raw
 * record — so internal signals can never leak to end users.
 *
 * ── W-22 mapping (LOCKED content order, Exercise-Detail-Wireframe-Spec-W22) ──
 *   HOW TO DO IT   ← view.instructions   (setupInstructions + executionSteps)
 *   COACHING CUES  ← view.tips           (cueHierarchy-ordered coaching tips)
 *   WATCH OUT FOR  ← view.commonMistakes
 *   (additive, optional) Safety Notes    ← view.safetyNotes
 *   (additive, optional) Advanced Notes  ← view.advancedNotes
 *
 * `WHY IT MATTERS` and `ABOUT` are NOT produced here — they are
 * `ExerciseDefinition.whyItMatters` / `.description` education fields owned by
 * Architecture Amendment 001, deliberately kept separate from coaching content
 * (README.md § "Modularity"). The two optional sections (Safety / Advanced) are
 * additive projections available to the screen; they do not reorder the locked
 * six W-22 sections.
 *
 * Serving policy: only Published content reaches the UI. Non-published exercises
 * return null and the screen falls back to its section-visibility rules (W-22
 * §4.2 — absent sections are simply hidden).
 */

import type { ExerciseCoachingContent, ExerciseCoachingView } from './schema';
import { coachingContent, CoachingContentService } from './query-service';

export interface ProjectionOptions {
  /**
   * The minimum workflow status to serve. Defaults to 'Published' — the only
   * user-visible status. Editorial previews may pass a lower gate explicitly.
   */
  requireStatus?: ExerciseCoachingContent['contentStatus'] | null;
}

/**
 * Strict projection: full record → UI-safe view. Returns null when the record
 * does not meet the required status. NEVER returns internal editorial fields.
 */
export function toCoachingView(
  record: ExerciseCoachingContent,
  { requireStatus = 'Published' }: ProjectionOptions = {},
): ExerciseCoachingView | null {
  if (requireStatus && record.contentStatus !== requireStatus) return null;
  const tips = record.cueHierarchy.length ? record.cueHierarchy : record.coachingTips;
  return {
    exerciseId: record.exerciseId,
    instructions: [...record.setupInstructions, ...record.executionSteps],
    tips: [...tips],
    commonMistakes: [...record.commonMistakes],
    safetyNotes: [...record.safetyNotes],
    advancedNotes: [...record.advancedCoachingNotes],
  };
}

/**
 * The single call W-22 makes. Resolves the coaching record for an exercise and
 * returns the UI-safe view (Published only), or null if there is nothing to show.
 */
export function getExerciseDetailCoaching(
  exerciseId: string,
  options: ProjectionOptions = {},
  service: CoachingContentService = coachingContent,
): ExerciseCoachingView | null {
  const record = service.get(exerciseId);
  return record ? toCoachingView(record, options) : null;
}
