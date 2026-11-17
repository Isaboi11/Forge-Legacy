/**
 * WHAT HOLT'S KITCHEN MUST AVOID, AND WHETHER IT MAY SHOW NUMBERS — from two reads, and FAIL CLOSED.
 *
 * AI audit 11-16, N-D2: `kitchenRulesLive` read the athlete's Meal Plan Setup and profile with `.catch(() => null)`,
 * and both reads answered `null` on an error too. So on bad signal an athlete with a peanut allergy was sent to the
 * model, and through the device's own filter, as `allergens: []` — and a minor whose profile didn't load got the
 * calorie numbers and the "left today" lean, because an unknown age reads as an adult (`isUnderAge(null)` is false).
 *
 * The reads are now `strict` (`nutrition-live.ts` `ReadOpts`): null means the server ANSWERED and there is nothing,
 * and a failure throws. This module turns the two outcomes into the rules:
 *
 *   · Setup never saved (the server said so)  → no allergens, no diet. The same as before.
 *   · Setup read FAILED                        → `unreadable`: the ask is refused before consent, credit or model.
 *     Nobody guesses around an allergy.
 *   · Birth year never entered                 → treated as an adult, as Targets and Meal Plan do (the athlete is
 *     asked for it on the screens that need it).
 *   · Profile read FAILED                      → treated as UNDER 18 for this ask: recipes yes, numbers no (NUT-D5).
 *     Not knowing someone's age is never a reason to show them calorie numbers.
 *
 * Pure and relative-imported: tested by `kitchen-rules.test.mjs`.
 */
import { ageFrom, isUnderAge } from './targets.ts';

/** A read that came back (with its answer, which may be "nothing") or one that failed. */
export type ReadOutcome<T> = { ok: true; value: T } | { ok: false };

export type KitchenRules =
  | { kind: 'ok'; allergens: string[]; diet: string | null; minor: boolean }
  | { kind: 'unreadable' };

export function kitchenRules(
  prefs: ReadOutcome<{ allergens?: readonly string[] | null; diet?: string | null } | null>,
  profile: ReadOutcome<{ birthYear: number | null }>,
  todayIso: string,
): KitchenRules {
  if (!prefs.ok) return { kind: 'unreadable' };
  const minor = profile.ok ? isUnderAge(ageFrom(profile.value.birthYear, todayIso)) : true;
  return {
    kind: 'ok',
    allergens: [...(prefs.value?.allergens ?? [])],
    diet: prefs.value?.diet ?? null,
    minor,
  };
}

/** A promise → its outcome, never a throw. */
export function outcome<T>(p: Promise<T>): Promise<ReadOutcome<T>> {
  return p.then(
    (value) => ({ ok: true as const, value }),
    () => ({ ok: false as const }),
  );
}
