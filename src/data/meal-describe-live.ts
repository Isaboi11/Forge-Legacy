import { ensureConsent, NO_AI_CONSENT, type NoAiConsent } from '@/lib/consent';
import { invokeAi, reportAiCall } from '@/lib/ai-invoke';
import { refundedResult, serverSaysNoConsent, type Refundable } from '@/domain/ai/ai-call';
import { medicalRoute } from '@/domain/coach/medical-routing';
import { cleanDescription, describeProblem, stopRouteOf } from '@/domain/nutrition/meal-describe';
import { mealDescribeResultFrom, type MealDescribeResult } from '@/domain/nutrition/meal-describe-result';

/**
 * DESCRIBE A MEAL — the client half of `meal-describe` (AI Road to 10 Sprint 4a §1.6, NU-3). The words go out once and
 * come back as the meal photo's read (food names, search phrases, amounts — never a calorie, NUT-D4), re-guarded on
 * arrival. The review then matches every item with `matchMealItems` (`meal-photo-live.ts`), so every number is
 * `food-search`'s. Nothing here logs anything.
 *
 * ⛔ THE MEDICAL GUARD RUNS HERE FIRST — `medicalRoute` on the cleaned words, before the consent sheet and before any
 * request: a stop never leaves the phone and costs nothing. The function runs the same guard again.
 *
 * ⚠ NOTHING HERE HOLDS A KEY. The words are not stored anywhere.
 */

export type { MealDescribeResult };

/**
 * Read one description. ⚠ NEVER THROWS — it runs behind a button the athlete is waiting on.
 * ⏱ 45 s (`AI_APP_TIMEOUT_MS`), aborted when `signal` fires. Failures are reported (P-G1); a refund rides on the result.
 */
export async function readMealDescription(raw: string, signal?: AbortSignal): Promise<Refundable<MealDescribeResult> | NoAiConsent> {
  const text = cleanDescription(raw);
  const problem = describeProblem(text);
  if (problem) return { kind: problem };
  const guard = medicalRoute(text);
  if (guard !== 'clear') return { kind: 'stop', route: stopRouteOf(guard) };

  /* Consent before sharing (MHMDA / Nevada SB 370): nothing goes to the AI provider without a stored yes. */
  if (!(await ensureConsent('ai_sharing'))) return NO_AI_CONSENT;
  const a = await invokeAi('meal-describe', { text }, { signal });
  if (serverSaysNoConsent(a)) return NO_AI_CONSENT;
  const result = ((): MealDescribeResult => {
    if (a.offline || a.cancelled) return { kind: 'offline' };
    if (a.timedOut) return { kind: 'unavailable' };
    if (!a.body) return a.status === 200 ? { kind: 'offline' } : { kind: 'unavailable' };
    return mealDescribeResultFrom(a.body);
  })();
  if (result.kind === 'ok') return result;
  // A stop is the guard doing its job, not a failure to report.
  if (result.kind !== 'stop') reportAiCall(a, result.kind);
  return refundedResult(result, a);
}
