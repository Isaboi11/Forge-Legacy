/**
 * The executors behind Holt's action cards. AI Road to 10 Sprint 4a §1.2. STUB from the integrator — lane C fills the
 * training ones (swap_exercise_today, start_workout, schedule_session, set_targets, remember_note); lane B's meal
 * executors (`src/data/holt-meal-live.ts`) and lane A's program ones are registered here at merge.
 */
import type { HoltActionExecutor, HoltActionName } from '@/domain/coach/holt-actions';

export function executorFor(name: HoltActionName): HoltActionExecutor | null {
  void name;
  return null;
}
