/**
 * DESCRIBING A MEAL IN WORDS — the caps, the clean-up and the user turn for `meal-describe` (AI Road to 10 Sprint 4a
 * §1.6, NU-3). The athlete types (or dictates with the keyboard's mic) what they ate; the function reads it into the
 * SAME shape a meal photo gives (`meal-photo-read.ts` `MEAL_READ_SCHEMA`: names, search phrases, amounts — no field can
 * hold a nutrition number), and the app runs the SAME review (`meal-photo-match.ts`: every number from `food-search`).
 *
 * ══ ⛔ THE WORDS ARE THE ATHLETE'S — `medicalRoute` READS THEM FIRST ══
 *
 * Unlike a photo, this request carries a sentence about a person ("I'm diabetic, log my lunch"). The code guard runs on
 * it in the app AND in the function, before the credit is held: a stop is answered with the stop copy, never a model,
 * and nothing is charged. The same guard every typed AI surface uses (`src/domain/coach/medical-routing.ts`).
 *
 * ⚠ NO IMPORTS. The Edge Function inlines this file into its dashboard paste copy (`scripts/build-meal-describe-deploy.mjs`).
 */

/**
 * The meter's name for this call — the meal photo's, on purpose: describing a plate is the same job as photographing
 * it, so it costs the same 1 credit and shares the soft floor and the day's ceiling (PO 09-28: meal_photo = 1).
 */
export const MEAL_DESCRIBE_ACTION = 'meal_photo';

/** The longest description read. A meal, an order, a day's breakfast in detail is far under it. */
export const MEAL_DESCRIBE_MAX_CHARS = 500;

/** Two letters is the least that can name a food ("pb"); anything shorter is refused before anything is spent. */
export const MEAL_DESCRIBE_MIN_CHARS = 2;

/** The output ceiling — the photo read's: twelve short items is ~600 tokens. */
export const MEAL_DESCRIBE_OUTPUT_CAP = 1500;

/**
 * The function's own upstream abort (Sprint 1 contract §3: ≥ 10 s inside the app's 45 s, `ai-call.ts`
 * `AI_APP_TIMEOUT_MS`). Kept HERE, not in `meter-server.ts`'s `UPSTREAM_ABORT_MS`: that table is inlined into nine
 * deployed bundles, and one new row would move every one of their hashes. `meal-describe-source.test` holds the margin.
 */
export const MEAL_DESCRIBE_ABORT_MS = 30_000;

/**
 * The athlete's text as it may travel: control characters out, spaces collapsed (one newline kept between lines), the
 * two angle brackets that frame it in the user turn taken out so the words can never close the frame, and trimmed.
 * The cap is applied by the caller (too long is refused, not cut — a cut meal would log light without saying so).
 */
export function cleanDescription(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, ' ')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ ?\n[\n ]*/g, '\n')
    .trim();
}

/** Too short, too long, or fine. */
export function describeProblem(text: string): 'empty' | 'too_long' | null {
  if (text.replace(/\s/g, '').length < MEAL_DESCRIBE_MIN_CHARS) return 'empty';
  if (text.length > MEAL_DESCRIBE_MAX_CHARS) return 'too_long';
  return null;
}

/** The user turn: the athlete's words inside a frame the system block names. Nothing else varies per request. */
export function describeUserTurn(text: string): string {
  return `List the foods in what the athlete wrote.\n\n<meal>\n${text}\n</meal>`;
}

/** The stop a description can meet, as the wire carries it. */
export type MealDescribeStop = 'crisis' | 'urgent' | 'care' | 'medical';

/** `medicalRoute`'s answer → the wire's route (acute and advice are both the clinician stop). */
export function stopRouteOf(route: string): MealDescribeStop {
  return route === 'crisis' || route === 'urgent' || route === 'care' ? route : 'medical';
}
