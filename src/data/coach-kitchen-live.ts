import { supabase } from '@/lib/supabase';
import { ensureConsent, NO_AI_CONSENT, type NoAiConsent } from '@/lib/consent';
import { fetchMealPlanPrefs, fetchNutritionProfile } from '@/data/nutrition-live';
import { localToday } from '@/domain/nutrition/day';
import { ageFrom, isUnderAge } from '@/domain/nutrition/targets';
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
 */
export async function askKitchenLive(req: KitchenRequest): Promise<KitchenResult | NoAiConsent> {
  /* Consent before sharing (MHMDA / Nevada SB 370): nothing goes to the AI provider without a stored yes. */
  if (!(await ensureConsent('ai_sharing'))) return NO_AI_CONSENT;
  try {
    const { data, error } = await supabase.functions.invoke('coach-kitchen', { body: req });
    // ⚠ A non-2xx is NOT "offline" — its body is on the error's `context` (see `recipe-photo-live.ts`).
    let body: unknown = data;
    if (error) {
      const ctx = (error as { context?: unknown }).context;
      if (!(ctx instanceof Response)) return { kind: 'offline' };
      body = await ctx.json().catch(() => null);
      if (!body) return { kind: 'unavailable' };
    }
    if (!body) return { kind: 'offline' };
    return kitchenResultFrom(body, req.exclude);
  } catch {
    return { kind: 'offline' };
  }
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

/** What the athlete avoids and whether they are under 18 — from Meal Plan Setup and the nutrition profile. */
export async function kitchenRulesLive(): Promise<{ allergens: string[]; diet: string | null; minor: boolean }> {
  const [prefs, profile] = await Promise.all([fetchMealPlanPrefs().catch(() => null), fetchNutritionProfile().catch(() => null)]);
  /* The same door as Targets and Meal Plan (`isUnderAge`): the year someone turns 18 still reads as under 18. */
  const minor = isUnderAge(ageFrom(profile?.birthYear ?? null, localToday()));
  return { allergens: (prefs?.allergens ?? []) as string[], diet: (prefs?.diet as string | undefined) ?? null, minor };
}
