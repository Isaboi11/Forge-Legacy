import { fetchRecentTraining } from '@/data/lift-history-live';
import { fetchNotes } from '@/data/holt-notes-live';
import { isTrainingQuestion, summarizeTraining } from '@/domain/coach/training-summary';
import type { UnitSystem } from '@/domain/settings/units';

export { isTrainingQuestion } from '@/domain/coach/training-summary';

/**
 * WHAT HOLT KNOWS WHEN YOU ASK HIM SOMETHING — the live half of the athlete brief (CA-D2).
 *
 *   fetchTrainingSummary(units, weeks?) → the athlete's own training in ≤ ~400 characters, or null
 *                                        (no history in the window, signed out, or any failure).
 *   askBriefLive(question, units)       → { notes, training } to spread into `buildAskContext`'s input.
 *                                        Notes always (they are small and they are the point of CA-D2);
 *                                        the training summary ONLY when `isTrainingQuestion(question)`,
 *                                        so an ordinary question costs neither the read nor the tokens.
 *
 * Both fail soft: nothing here is worth failing a question over. `units` is the athlete's preference
 * (`useUnits().units`); weights are stored in pounds and converted once, inside the summary.
 */
export async function fetchTrainingSummary(units: UnitSystem, weeks = 8): Promise<string | null> {
  try {
    const sessions = await fetchRecentTraining(weeks);
    return summarizeTraining(sessions, { units, today: new Date().toISOString(), weeks });
  } catch {
    return null;
  }
}

export async function askBriefLive(
  question: string,
  units: UnitSystem,
): Promise<{ notes: string[]; training: string | null }> {
  const [notes, training] = await Promise.all([
    fetchNotes().catch(() => []),
    isTrainingQuestion(question) ? fetchTrainingSummary(units) : Promise.resolve(null),
  ]);
  return { notes: notes.map((n) => n.text), training };
}
