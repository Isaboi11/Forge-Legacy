import { mealPhotoResultFrom, type MealPhotoResult } from './meal-photo-read.ts';
import { stopRouteOf, type MealDescribeStop } from './meal-describe.ts';

/**
 * DESCRIBE A MEAL — the app's side of `meal-describe`'s wire, and its words for every outcome (AI Road to 10 Sprint 4a
 * §1.6). The read itself is the meal photo's (`mealPhotoResultFrom` re-guards it on arrival: only the whitelisted fields,
 * no number but a portion). What a description adds is a STOP (the athlete's words met the medical guard — in the app
 * before anything is sent, or in the function before any credit) and TOO LONG. Pure, so `node --test` runs it.
 */

export type MealDescribeResult =
  | Exclude<MealPhotoResult, { kind: 'too_large' } | { kind: 'unsupported_format' }>
  | { kind: 'stop'; route: MealDescribeStop }
  | { kind: 'too_long' }
  | { kind: 'empty' };

/** The function's JSON body — from a 200 or a non-2xx alike — as a result. */
export function mealDescribeResultFrom(body: unknown): MealDescribeResult {
  const d = (body && typeof body === 'object' ? body : {}) as { ok?: boolean; reason?: unknown; route?: unknown };
  if (!d.ok && d.reason === 'stop') return { kind: 'stop', route: stopRouteOf(String(d.route ?? '')) };
  if (!d.ok && d.reason === 'too_long') return { kind: 'too_long' };
  if (!d.ok && d.reason === 'bad_request') return { kind: 'empty' };
  const r = mealPhotoResultFrom(body);
  // A photo's own refusals cannot come from a text read; if one ever does, it is the server failing.
  return r.kind === 'too_large' || r.kind === 'unsupported_format' ? { kind: 'unavailable' } : r;
}

/** Every failure but a stop, in words. An outage never reads as a verdict on the words, and every one has a way out. */
export function mealDescribeError(r: Exclude<MealDescribeResult, { kind: 'ok' } | { kind: 'stop' }>): string {
  switch (r.kind) {
    case 'not_food':
      return 'No food in that one. Name what you ate — “2 eggs and toast”, “a Chipotle chicken bowl”.';
    case 'unreadable':
      return 'Couldn’t make out the foods in that. Try naming each one, with how much.';
    case 'too_long':
      return 'That’s more than one meal’s worth of words. Describe one meal at a time.';
    case 'empty':
      return 'Write what you ate first.';
    case 'daily_limit':
      return 'That’s a lot of meals read for one day. Search for the food instead, or try again tomorrow.';
    case 'out_of_credits':
      return 'You’re out of Premium AI credits for this month. You can still search for the food.';
    case 'not_entitled':
      return 'Describing a meal is part of Premium AI. You can still search for the food.';
    case 'no_nutrition':
      return 'Nutrition isn’t turned on for your account yet.';
    case 'unavailable':
      return 'Describing a meal isn’t working right now. Try again in a bit, or search for the food.';
    case 'offline':
    default:
      return 'Couldn’t reach Forge. Check your connection and try again.';
  }
}
