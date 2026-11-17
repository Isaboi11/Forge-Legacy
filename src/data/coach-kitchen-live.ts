import { supabase } from '@/lib/supabase';
import { ensureConsent, NO_AI_CONSENT, type NoAiConsent } from '@/lib/consent';
import { invokeAi, reportAiCall } from '@/lib/ai-invoke';
import { refundedResult, serverSaysNoConsent, type Refundable } from '@/domain/ai/ai-call';
import { fetchMealPlanPrefs, fetchNutritionProfile } from '@/data/nutrition-live';
import { localToday } from '@/domain/nutrition/day';
import { kitchenRules, outcome, type KitchenRules } from '@/domain/nutrition/kitchen-rules';
import {
  KITCHEN_MEMORY_DAYS,
  kitchenResultFrom,
  type KitchenDish,
  type KitchenRequest,
  type KitchenResult,
} from '@/domain/nutrition/kitchen-dishes';

/**
 * HOLT'S KITCHEN — the client half of `coach-kitchen` (Kitchen Scope §6). Never throws: an outage is a
 * result, and the chat has words for each one (`kitchenError`).
 *
 * ⏱ 60 s (contract §3), aborted when `signal` fires. Failures are reported (P-G1); a refund rides on the result.
 */
export async function askKitchenLive(req: KitchenRequest, signal?: AbortSignal): Promise<Refundable<KitchenResult> | NoAiConsent> {
  /* Consent before sharing (MHMDA / Nevada SB 370): nothing goes to the AI provider without a stored yes. */
  if (!(await ensureConsent('ai_sharing'))) return NO_AI_CONSENT;
  // ⚠ A non-2xx is NOT "offline" — its body is on the error's `context`, which `invokeAi` reads.
  const a = await invokeAi('coach-kitchen', req, { signal });
  if (serverSaysNoConsent(a)) return NO_AI_CONSENT;
  const r = ((): KitchenResult => {
    if (a.offline || a.cancelled) return { kind: 'offline' };
    if (a.timedOut) return { kind: 'unavailable' };
    if (!a.body) return a.status === 200 ? { kind: 'offline' } : { kind: 'unavailable' };
    return kitchenResultFrom(a.body, req.exclude);
  })();
  /* A code-guard stop is the guard working, not a failure. */
  if (r.kind === 'ok' || r.kind === 'stop') return r;
  /* `none`: every dish failed the device's guard — the model's output was unusable. */
  reportAiCall(a, r.kind === 'none' ? 'bad_output' : r.kind);
  return refundedResult(r, a);
}

/** Kitchen memory (§2): the dishes shown in the last 30 days, newest first. Empty on any failure. */
export async function recentKitchenDishesLive(): Promise<string[]> {
  try {
    const since = new Date(Date.now() - KITCHEN_MEMORY_DAYS * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from('kitchen_suggestions')
      .select('name')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(40);
    if (error || !data) return [];
    return [...new Set((data as { name: string }[]).map((r) => r.name))];
  } catch {
    return [];
  }
}

/** Remember what was shown, so it isn't offered again unasked. Fire-and-forget; a failed write costs one repeat. */
export async function rememberKitchenDishesLive(dishes: readonly KitchenDish[]): Promise<void> {
  if (!dishes.length) return;
  try {
    await supabase.from('kitchen_suggestions').insert(dishes.map((d) => ({ name: d.name.slice(0, 60), cuisine: d.cuisine || null, method: d.method })));
  } catch {
    /* the memory is a nicety; the dishes are already on screen */
  }
}

/**
 * What the athlete avoids and whether they are under 18 — from Meal Plan Setup and the nutrition profile.
 *
 * ⛔ FAIL CLOSED (AI audit 11-16, N-D2). Both reads are `strict`, so a failed read is never "no allergies" or
 * "an adult": a setup that didn't load comes back `unreadable` and the ask is refused before anything is sent;
 * a profile that didn't load is treated as under 18 (no numbers). The rules themselves: `kitchenRules`.
 */
export async function kitchenRulesLive(): Promise<KitchenRules> {
  const strict = { strict: true };
  const [prefs, profile] = await Promise.all([outcome(fetchMealPlanPrefs(strict)), outcome(fetchNutritionProfile(strict))]);
  return kitchenRules(prefs, profile, localToday());
}
