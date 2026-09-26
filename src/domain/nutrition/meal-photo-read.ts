/**
 * READING A MEAL FROM A PHOTO — the guard, the shape, and the app's words for every outcome.
 *
 * PO, 2026-09-25: *"let's build the photo food logging."* Nutrition Architecture §2 places "Log a meal from
 * a photo" in Premium AI (credits); §5 names the meter weight `meal_photo` and Sonnet for photos. The
 * `meal-photo-read` Edge Function looks at the plate; this module decides what of its answer may exist.
 *
 * ══ ⛔ NUT-D4: THE MODEL NEVER WRITES A NUTRITION NUMBER ══
 *
 * The model NAMES the foods and ESTIMATES how much of each is on the plate. That is all. Every calorie and
 * macro the athlete sees comes from a food-database match (`food-search`: USDA · FatSecret · Open Food
 * Facts), multiplied by the one multiplication in Nutrition (`serving.ts`, `portionMacros`). Three walls,
 * each enough on its own:
 *
 *   1. The prompt forbids calories, macros and any nutrition figure.
 *   2. `MEAL_READ_SCHEMA` (structured output, `additionalProperties: false`) has **no field that can carry
 *      one** — no calories, protein, carbs, fat, sugar, sodium.
 *   3. `sanitizeMealRead()` copies ONLY the whitelisted fields, in the function AND again on the device.
 *
 * ⚠ THE ONE NUMBER THE MODEL DOES WRITE IS A PORTION ESTIMATE (`amount` + `unit`, and `grams`). It is a
 * guess about the plate, not a nutrition figure, and it is treated as one: shown as "estimated", editable on
 * every row, and multiplied only against the MATCHED food's per-100 g numbers. Nothing is logged until the
 * athlete taps Log.
 *
 * ⚠ THE PHOTO IS NEVER STORED (NUT-D7). It travels to the Edge Function once, is read, and is gone —
 * no bucket, no row. There is nothing about a meal photo that needs keeping: the diary keeps the foods.
 *
 * ⚠ NO IMPORTS. The Edge Function inlines this file into its dashboard paste copy
 * (`scripts/build-meal-photo-read-deploy.mjs`), and the generator refuses a module that imports.
 */

/** The meter's name for this call. Its weight lives in `coach_ai_config.action_credits` (0223), never here. */
export const MEAL_PHOTO_ACTION = 'meal_photo';

/** 5 MB of image in base64 — the Messages API's own per-image limit, as `recipe-photo-read`. */
export const MEAL_PHOTO_MAX_BASE64 = 6_990_000;

/** What the function accepts. Same list as `recipe-photo-read`. */
export const MEAL_PHOTO_MEDIA = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** A day's ceiling — six meals a day photographed four times over is still under it. */
export const MEAL_PHOTO_PER_DAY = 25;

/** The output ceiling. Twelve short items is ~600 tokens; this leaves room and still bounds a runaway. */
export const MEAL_PHOTO_OUTPUT_CAP = 1500;

export const MAX_MEAL_ITEMS = 12;
const NAME_CHARS = 60;
const SEARCH_CHARS = 60;
const UNIT_CHARS = 20;
/** A plate item above 2 kg is a misread (a whole pot, a family tray), not a serving. */
const MAX_GRAMS = 2000;
const MAX_AMOUNT = 100;

export type MealItemConfidence = 'high' | 'medium' | 'low';

/** One food the model saw on the plate. ⚠ Deliberately NO calories or macros — NUT-D4. */
export interface MealItem {
  /** What it is, in plain words, as the athlete would say it: "grilled chicken breast". Shown on the row. */
  name: string;
  /** A short food-database search phrase: "chicken breast grilled", "big mac". What the app searches. */
  search: string;
  /** The model's estimate of how many `unit`s are on the plate, or null when it gave only grams. */
  amount: number | null;
  /** The household unit the amount is in ("cup", "slice", "piece", "medium", "tbsp"), or "". */
  unit: string;
  /** The model's estimate of the portion's weight, in grams — a guess, shown as one. Null when it could not say. */
  grams: number | null;
  /** How sure it is of what the food IS (not of the portion). "low" rows are flagged for a check. */
  confidence: MealItemConfidence;
}

export interface MealRead {
  items: MealItem[];
}

const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] };

/**
 * The structured-output schema the model must answer in. ⛔ No nutrition field, on purpose — the source
 * test fails if one is ever added.
 */
export const MEAL_READ_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['isFood', 'items'],
  properties: {
    isFood: { type: 'boolean' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'search', 'amount', 'unit', 'grams', 'confidence'],
        properties: {
          name: { type: 'string' },
          search: { type: 'string' },
          amount: nullableNumber,
          unit: { type: 'string' },
          grams: nullableNumber,
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
  },
} as const;

const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

const positive = (v: unknown, max: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= max ? v : null;

const CONFIDENCE: readonly MealItemConfidence[] = ['high', 'medium', 'low'];

/**
 * ⚠ THE BOUNDARY. Whatever came back — the model's JSON, or a body on the device — becomes a `MealRead` by
 * copying ONLY the fields above, or null when there is no food in it.
 *
 * `isFood: false` (the model's abstain) and a read with no usable item both return null. Any other key —
 * `calories`, `protein`, `nutrition`, a per-item kcal — is never read, so it can never reach a screen.
 */
export function sanitizeMealRead(raw: unknown): MealRead | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (d.isFood === false) return null;

  const items: MealItem[] = [];
  for (const entry of Array.isArray(d.items) ? d.items : []) {
    if (!entry || typeof entry !== 'object') continue;
    const x = entry as Record<string, unknown>;
    const name = clean(x.name, NAME_CHARS);
    const search = clean(x.search, SEARCH_CHARS);
    if (!name && !search) continue;
    const grams = positive(x.grams, MAX_GRAMS);
    const amount = positive(x.amount, MAX_AMOUNT);
    const confidence = typeof x.confidence === 'string' && CONFIDENCE.includes(x.confidence as MealItemConfidence)
      ? (x.confidence as MealItemConfidence)
      : 'low';
    items.push({
      name: name || search,
      search: search || name,
      amount: amount == null ? null : Math.round(amount * 100) / 100,
      unit: clean(x.unit, UNIT_CHARS),
      grams: grams == null ? null : Math.round(grams),
      confidence,
    });
    if (items.length >= MAX_MEAL_ITEMS) break;
  }
  return items.length ? { items } : null;
}

/**
 * The model's text → a verdict. `not_food` is the model's own abstain (`isFood: false`); `unreadable` is
 * anything else that did not yield a meal (bad JSON, no items).
 */
export function readFromModelText(text: string): { ok: true; read: MealRead } | { ok: false; reason: 'not_food' | 'unreadable' } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.trim());
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
  if (parsed && typeof parsed === 'object' && (parsed as { isFood?: unknown }).isFood === false) {
    return { ok: false, reason: 'not_food' };
  }
  const read = sanitizeMealRead(parsed);
  return read ? { ok: true, read } : { ok: false, reason: 'unreadable' };
}

/* ── the app's side of the wire ─────────────────────────────────────────── */

export type MealPhotoResult =
  | { kind: 'ok'; read: MealRead; remaining: number | null }
  /** Read fine; there is no food in it. */
  | { kind: 'not_food' }
  /** Looked, and could not get foods out of it. A clearer shot may work. */
  | { kind: 'unreadable' }
  | { kind: 'too_large' }
  | { kind: 'daily_limit' }
  | { kind: 'out_of_credits'; remaining: number; allowance: number }
  /** No Premium AI — 0203's gate answers with an allowance of 0. */
  | { kind: 'not_entitled' }
  /** No nutrition access — the function's 403. */
  | { kind: 'no_nutrition' }
  | { kind: 'unsupported_format' }
  /** We reached the server and IT failed. Not the athlete's connection, not the photo. */
  | { kind: 'unavailable' }
  /** The request never got an answer — no signal, most likely. Never conflated with the two above. */
  | { kind: 'offline' };

/** The function's JSON body — from a 200 or a non-2xx alike — as a result. The read is re-guarded here. */
export function mealPhotoResultFrom(body: unknown): MealPhotoResult {
  if (!body || typeof body !== 'object') return { kind: 'unavailable' };
  const d = body as { ok?: boolean; read?: unknown; reason?: string; remaining?: number; allowance?: number };

  if (d.ok) {
    const read = sanitizeMealRead(d.read);
    if (!read) return { kind: 'unreadable' };
    return { kind: 'ok', read, remaining: typeof d.remaining === 'number' ? d.remaining : null };
  }

  switch (d.reason) {
    case 'not_food':
      return { kind: 'not_food' };
    case 'unreadable':
      return { kind: 'unreadable' };
    case 'too_large':
      return { kind: 'too_large' };
    case 'daily_limit':
      return { kind: 'daily_limit' };
    case 'no_nutrition':
      return { kind: 'no_nutrition' };
    case 'out_of_credits':
      if (!d.allowance) return { kind: 'not_entitled' };
      return { kind: 'out_of_credits', remaining: d.remaining ?? 0, allowance: d.allowance };
    case 'bad_request':
      return { kind: 'unsupported_format' };
    default:
      return { kind: 'unavailable' };
  }
}

/** Every failure, in words. An outage never reads as a verdict on the photo, and every one has a way out. */
export function mealPhotoError(r: Exclude<MealPhotoResult, { kind: 'ok' }>): string {
  switch (r.kind) {
    case 'not_food':
      return 'No food in that one. Take the photo from above, with the whole plate in the frame.';
    case 'unreadable':
      return 'Couldn’t make out the food in that photo. A brighter shot from above usually does it.';
    case 'too_large':
      return 'That image is too big to read. Try taking the photo again.';
    case 'daily_limit':
      return 'That’s a lot of meal photos for one day. Search for the food instead, or try again tomorrow.';
    case 'out_of_credits':
      return 'You’re out of Premium AI credits for this month. You can still search for the food.';
    case 'not_entitled':
      return 'Logging a meal from a photo is part of Premium AI. You can still search for the food.';
    case 'no_nutrition':
      return 'Nutrition isn’t turned on for your account yet.';
    case 'unsupported_format':
      return 'That image type can’t be read. Take the photo with the camera instead.';
    case 'unavailable':
      return 'Photo logging isn’t working right now. Try again in a bit, or search for the food.';
    case 'offline':
    default:
      return 'Couldn’t reach Forge. Check your connection and try again.';
  }
}
