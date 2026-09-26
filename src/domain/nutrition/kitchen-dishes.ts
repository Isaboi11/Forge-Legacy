/**
 * HOLT'S KITCHEN — "What can I make?" Holt writes the dish; the app decides what it is worth.
 *
 * `Docs/Holt-Kitchen-Scope-v1.0.md` (LOCKED 2026-09-24) · `Docs/Holt-Kitchen-Mode-v1.0.md` K1 · the live check in
 * `Docs/Chef-Holt-Stress-Test-2026-09-25.md`: from a six-recipe book one dish came back in 29 of 87 replies. The PO,
 * 2026-09-24: *"The coach AI needs to come up with what they can make … robust so it's not saying the same things
 * over and over. Give a couple of options, then ask if they want other options."*
 *
 * ══ ⛔ NUT-D4: THE MODEL NEVER WRITES A NUTRITION NUMBER ══
 *
 * Same wall as `recipe-photo-read.ts`, and the same three layers: the prompt, a schema with no field that can
 * carry a calorie or a macro, and `sanitizeKitchenAnswer()` copying only whitelisted fields (in the function
 * and again on the device). Each dish comes back as ingredient lines in the SAME shape a photographed recipe
 * does (`ReadIngredient`), so the app matches them to its USDA catalogue with the code that already does that
 * (`recipe-import.ts` `draftFromRead`) and computes every number itself. An unmatched line is shown as
 * unmatched; its number is never guessed.
 *
 * ⚠ NO IMPORTS. The Edge Function inlines this file into its dashboard paste copy.
 */

/** The meter's name for this call. Its weight lives in `coach_ai_config.action_credits` (0222), never here. */
export const KITCHEN_ACTION = 'kitchen';
/** Kitchen Scope §6: ~1,000 output tokens for three dishes. Headroom for long ingredient lists. */
export const KITCHEN_OUTPUT_CAP = 2600;
/** A day's ceiling well above any real kitchen, below a runaway loop. */
export const KITCHEN_PER_DAY = 40;
/** Kitchen Scope §9 (LOCKED): three options per answer. */
export const KITCHEN_OPTIONS = 3;
/** Kitchen Scope §9 (LOCKED): a suggested dish is remembered for 30 days so it isn't offered again unasked. */
export const KITCHEN_MEMORY_DAYS = 30;

const MAX_HAVE = 30;
const MAX_EXCLUDE = 40;
const MAX_INGREDIENTS = 18;
const MAX_STEPS = 10;
const ASK_CHARS = 300;
const ITEM_CHARS = 40;
const NAME_CHARS = 48;
const WHY_CHARS = 90;
const TEXT_CHARS = 120;
const FOOD_CHARS = 60;
const UNIT_CHARS = 24;
const STEP_CHARS = 220;

export type KitchenNudge = 'more' | 'quicker' | 'protein' | 'style';
export const KITCHEN_METHODS = ['pan', 'oven', 'no-cook', 'bowl', 'pot', 'grill', 'air-fryer', 'microwave'] as const;
export type KitchenMethod = (typeof KITCHEN_METHODS)[number];
export const KITCHEN_CUISINES = ['Mediterranean', 'Mexican', 'Asian', 'American', 'Italian', 'Middle Eastern', 'Indian', 'Latin', 'Korean', 'Greek'] as const;

/** What the app sends. Every field is narrowed again by the function (`narrowKitchenRequest`). */
export interface KitchenRequest {
  /** What they have: their words first, then this week's grocery list (Kitchen Scope §1b). */
  have: string[];
  /** Their own sentence, if they typed one ("something spicy, no rice"). */
  ask: string;
  /** Allergens and diet as hard rules (NUT-D6) — also enforced after the answer, on the device. */
  avoid: string[];
  /** Dishes already suggested (30-day memory) or on screen — never offered again. */
  exclude: string[];
  nudge: KitchenNudge | null;
  /** The rotation seed (Kitchen Scope §2): a cuisine and a method to lean toward, varied per ask. */
  lean: { cuisine: string; method: string } | null;
  /** "Left today" from the app's own totals, quoted to steer the options, never to lecture (§5). */
  left: string | null;
  /** Under 18: recipes yes, target steering no (NUT-D5). */
  minor: boolean;
}

const clean = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const list = (v: unknown, max: number, chars: number): string[] =>
  (Array.isArray(v) ? v : []).map((x) => clean(x, chars)).filter(Boolean).slice(0, max);

export function narrowKitchenRequest(raw: unknown): KitchenRequest {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const nudge = typeof d.nudge === 'string' && ['more', 'quicker', 'protein', 'style'].includes(d.nudge) ? (d.nudge as KitchenNudge) : null;
  const l = d.lean as Record<string, unknown> | null | undefined;
  const lean = l && typeof l === 'object' ? { cuisine: clean(l.cuisine, 30), method: clean(l.method, 20) } : null;
  return {
    have: list(d.have, MAX_HAVE, ITEM_CHARS),
    ask: clean(d.ask, ASK_CHARS),
    avoid: list(d.avoid, 12, 30),
    exclude: list(d.exclude, MAX_EXCLUDE, NAME_CHARS),
    nudge,
    lean: lean && (lean.cuisine || lean.method) ? lean : null,
    left: clean(d.left, 160) || null,
    minor: d.minor === true,
  };
}

/** The final user turn. The system block stays byte-stable (cache); everything per-request goes here. */
export function kitchenUserTurn(r: KitchenRequest): string {
  const lines: string[] = [];
  if (r.ask) lines.push(`What the athlete said: "${r.ask}"`);
  /*
   * Live check 2026-09-26: with shrimp on hand and a shellfish allergy, Holt still wrote a shrimp salad (the app
   * dropped it, leaving two cards; four allergies left ONE). So an avoided food never reaches him as "on hand",
   * and each allergy is spelled out as the foods it covers.
   */
  const keys = r.avoid.map((a) => a.toLowerCase().replace(/\s+/g, '_')).filter((k) => ALLERGEN_WORDS[k] || DIET_WORDS[k]);
  const have = r.have.filter((h) => !keys.some((k) => (ALLERGEN_WORDS[k] ?? DIET_WORDS[k]).test(h)));
  lines.push(have.length ? `On hand: ${have.join(', ')}.` : 'On hand: not given — assume a normal pantry and ask nothing.');
  if (r.avoid.length) {
    const spelled = r.avoid.map((a) => {
      const k = a.toLowerCase().replace(/\s+/g, '_');
      return ALLERGEN_COVERS[k] ? `${a} (${ALLERGEN_COVERS[k]})` : a;
    });
    lines.push(`Hard rules — never use, in any form: ${spelled.join('; ')}.`);
  }
  if (r.exclude.length) lines.push(`Already suggested, do not repeat or lightly rename: ${r.exclude.join('; ')}.`);
  if (r.lean) lines.push(`Lean toward, if it fits: ${[r.lean.cuisine, r.lean.method].filter(Boolean).join(', ')}.`);
  const nudge: Record<KitchenNudge, string> = {
    more: 'They want different ideas from the ones above.',
    quicker: 'They want quicker dishes — 15 minutes or less where possible.',
    protein: 'They want more protein — build each dish around a bigger protein portion.',
    style: 'They want a different style — new cuisines and methods from the ones above.',
  };
  if (r.nudge) lines.push(nudge[r.nudge]);
  if (r.left && !r.minor) lines.push(`App's numbers for today: ${r.left} Lean the options toward it; never mention a number.`);
  lines.push(`Write ${KITCHEN_OPTIONS} options.`);
  return lines.join('\n');
}

/* ── the answer ────────────────────────────────────────────────────────────── */

export interface KitchenIngredient {
  text: string;
  quantity: number | null;
  unit: string;
  food: string;
}

/** One dish. ⚠ Deliberately NO calories or macros — NUT-D4. Same ingredient shape as a photographed recipe. */
export interface KitchenDish {
  name: string;
  /** One line: why this one ("uses the most of what you have", "fastest"). No numbers. */
  why: string;
  cuisine: string;
  method: KitchenMethod;
  minutes: number | null;
  servings: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks' | null;
  ingredients: KitchenIngredient[];
  steps: string[];
}

const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] };

/** ⛔ No nutrition field, on purpose — the source test fails if one is ever added. */
export const KITCHEN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['options'],
  properties: {
    options: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'why', 'cuisine', 'method', 'minutes', 'servings', 'mealType', 'ingredients', 'steps'],
        properties: {
          name: { type: 'string' },
          why: { type: 'string' },
          cuisine: { type: 'string' },
          method: { type: 'string', enum: [...KITCHEN_METHODS] },
          minutes: nullableNumber,
          servings: { type: 'number' },
          mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snacks', 'unknown'] },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['text', 'quantity', 'unit', 'food'],
              properties: { text: { type: 'string' }, quantity: nullableNumber, unit: { type: 'string' }, food: { type: 'string' } },
            },
          },
          steps: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
} as const;

const positive = (v: unknown, max: number): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= max ? v : null);
const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'];
const WEIGHT_TO_G: Record<string, number> = { g: 1, gram: 1, grams: 1, kg: 1000, oz: 28.35, lb: 453.6, lbs: 453.6 };

/**
 * Kitchen Scope §3.5: "a check rejects amounts no one cooks (2 kg of oil, 0 g of chicken)". A weight line
 * over 2 kg per serving is dropped from the dish rather than shown; the matcher (`gramsFor`) applies its own
 * 0.5–5,000 g window on top.
 */
const FATS = /\b(oil|butter|ghee|lard|shortening|mayo(nnaise)?)\b/i;
function saneAmount(i: KitchenIngredient, servings: number): boolean {
  if (i.quantity == null) return true;
  const per = WEIGHT_TO_G[i.unit.toLowerCase()];
  if (per == null) return i.quantity <= 50;
  const g = (i.quantity * per) / Math.max(1, servings);
  // Nobody cooks more than ~100 g of fat or ~1 kg of anything into one serving.
  return FATS.test(i.food) ? g <= 100 : g <= 1000;
}

function sanitizeDish(raw: unknown): KitchenDish | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  // Cut at a word, never mid-word ("…Blueberri" in the live check).
  const full = clean(d.name, 200);
  const name = full.length <= NAME_CHARS ? full : full.slice(0, NAME_CHARS + 1).replace(/\s+\S*$/, '').replace(/[\s,&-]+$/, '');
  if (!name) return null;
  const servings = Math.round(positive(d.servings, 12) ?? 1) || 1;
  const ingredients: KitchenIngredient[] = [];
  for (const item of Array.isArray(d.ingredients) ? d.ingredients : []) {
    if (!item || typeof item !== 'object') continue;
    const x = item as Record<string, unknown>;
    const text = clean(x.text, TEXT_CHARS);
    const food = clean(x.food, FOOD_CHARS);
    if (!text && !food) continue;
    const ing = { text: text || food, quantity: positive(x.quantity, 100_000), unit: clean(x.unit, UNIT_CHARS), food: food || text };
    if (!saneAmount(ing, servings)) continue;
    ingredients.push(ing);
    if (ingredients.length >= MAX_INGREDIENTS) break;
  }
  if (ingredients.length < 2) return null;
  const method = typeof d.method === 'string' && (KITCHEN_METHODS as readonly string[]).includes(d.method) ? (d.method as KitchenMethod) : 'pan';
  const meal = typeof d.mealType === 'string' && MEALS.includes(d.mealType) ? (d.mealType as KitchenDish['mealType']) : null;
  const minutes = positive(d.minutes, 24 * 60);
  const dish: KitchenDish = {
    name,
    // ⛔ "why" is a sentence, never a number: any digit-with-unit is cut rather than shown (NUT-D4).
    why: clean(d.why, WHY_CHARS).replace(/\b\d[\d,.]*\s*(k?cal\w*|g\b|grams?|%)/gi, '').replace(/\s{2,}/g, ' ').trim(),
    cuisine: clean(d.cuisine, 24),
    method,
    minutes: minutes == null ? null : Math.round(minutes),
    servings,
    mealType: meal,
    ingredients,
    steps: (Array.isArray(d.steps) ? d.steps : []).map((s) => clean(s, STEP_CHARS)).filter(Boolean).slice(0, MAX_STEPS),
  };
  return withSafeTemps(dish);
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * The answer → at most three dishes. ⚠ THE BOUNDARY, run in the function and again on the device.
 *
 * Kitchen Scope §2 "forced spread": the options must differ in method — a second dish with a method already
 * used is dropped rather than shown — and a dish whose name is on the exclusion list (already suggested) is
 * dropped too, because a renamed repeat is what the PO asked never to see.
 */
export function sanitizeKitchenAnswer(raw: unknown, exclude: readonly string[] = []): KitchenDish[] {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const banned = new Set(exclude.map(norm));
  const out: KitchenDish[] = [];
  const sameMethod: KitchenDish[] = [];
  const methods = new Set<string>();
  for (const o of Array.isArray(d.options) ? d.options : []) {
    const dish = sanitizeDish(o);
    if (!dish || banned.has(norm(dish.name)) || out.some((x) => norm(x.name) === norm(dish.name))) continue;
    if (methods.has(dish.method)) {
      sameMethod.push(dish);
      continue;
    }
    methods.add(dish.method);
    out.push(dish);
    if (out.length >= KITCHEN_OPTIONS) break;
  }
  // Spread first; but two cards where three were asked for is worse than two pan dishes (live check 09-26).
  for (const dish of sameMethod) if (out.length < KITCHEN_OPTIONS) out.push(dish);
  return out;
}

export function kitchenFromModelText(text: string, exclude: readonly string[] = []): KitchenDish[] {
  try {
    return sanitizeKitchenAnswer(JSON.parse(text.trim()), exclude);
  } catch {
    return [];
  }
}

/* ── food safety (Kitchen Scope §4) ─────────────────────────────────────────── */

/**
 * USDA FSIS safe minimum internal temperatures. "A prompt rule plus a check that inserts the temperature if
 * it's missing." Checked against every ingredient's food; a step that already names a °F is trusted.
 */
const SAFE_TEMPS: readonly { re: RegExp; line: string }[] = [
  { re: /\b(chicken|turkey|duck|poultry)\b/i, line: 'Cook the poultry to 165°F inside (USDA).' },
  { re: /\bground\s+(beef|pork|lamb|veal)|\b(burger|meatballs?|sausage)\b/i, line: 'Cook ground meat to 160°F inside (USDA).' },
  { re: /\b(beef|steak|pork|lamb|veal|chops?)\b/i, line: 'Cook beef, pork or lamb to 145°F inside, then rest 3 minutes (USDA).' },
  { re: /\b(salmon|tuna steak|cod|tilapia|fish|shrimp|prawns?|scallops?)\b/i, line: 'Cook fish and shellfish to 145°F, until opaque and it flakes (USDA).' },
  { re: /\beggs?\b/i, line: 'Cook eggs until the yolk and white are firm; egg dishes to 160°F (USDA).' },
];
const NO_COOK_SAFE = /\b(canned|tinned|smoked|deli|rotisserie|cooked|leftover|jerky)\b/i;

export function withSafeTemps(d: KitchenDish): KitchenDish {
  if (d.steps.some((s) => /\d\s*°\s*F/i.test(s))) return d;
  const add: string[] = [];
  for (const t of SAFE_TEMPS) {
    if (d.ingredients.some((i) => t.re.test(i.food) && !NO_COOK_SAFE.test(i.food)) && !add.includes(t.line)) add.push(t.line);
    if (add.length >= 2) break;
  }
  return add.length ? { ...d, steps: [...d.steps, ...add].slice(0, MAX_STEPS + 2) } : d;
}

/* ── allergens: the app's check, not the model's (NUT-D6) ───────────────────── */

/**
 * The words an ingredient line gives away an allergen by, for lines the catalogue did NOT match (a matched
 * line carries the catalogue's own allergen tags). Kitchen Scope §4: an option containing one is DROPPED,
 * never shown with a warning.
 */
export const ALLERGEN_WORDS: Record<string, RegExp> = {
  peanuts: /\bpeanuts?\b|\bsatay\b/i,
  tree_nuts: /\b(almonds?|cashews?|walnuts?|pecans?|pistachios?|hazelnuts?|macadamias?|pine\s+nuts?|nut\s+butter)\b/i,
  dairy: /\b(milk|cheese|feta|parmesan|mozzarella|cheddar|yogh?urt|butter|cream|ghee|whey|ricotta|paneer|queso)\b/i,
  eggs: /\beggs?\b|\bmayo(nnaise)?\b/i,
  gluten: /\b(wheat|flour|bread|pasta|noodles?|tortillas?|couscous|barley|rye|soy\s+sauce|breadcrumbs?|panko|pita|bagels?|seitan)\b/i,
  soy: /\b(soy|tofu|tempeh|edamame|miso|tamari)\b/i,
  fish: /\b(fish|salmon|tuna|cod|tilapia|anchov\w*|sardines?|halibut|trout|fish\s+sauce)\b/i,
  shellfish: /\b(shrimp|prawns?|crab|lobster|scallops?|clams?|mussels?|oysters?|shellfish)\b/i,
  sesame: /\b(sesame|tahini)\b/i,
};

/** A diet's avoided groups (`dietAvoid`), by word — so a vegetarian's chicken is never sent as "on hand". */
export const DIET_WORDS: Record<string, RegExp> = {
  meat: /\b(beef|pork|steak|bacon|ham|sausage|lamb|veal|jerky|pepperoni|salami|chorizo|meatballs?)\b/i,
  poultry: /\b(chicken|turkey|duck)\b/i,
  honey: /\bhoney\b/i,
};

/** What each allergy covers, spelled out for the model (the app's own check is `ALLERGEN_WORDS`). */
export const ALLERGEN_COVERS: Record<string, string> = {
  peanuts: 'peanuts, peanut butter, peanut oil, satay',
  tree_nuts: 'almonds, cashews, walnuts, pecans, pistachios, hazelnuts, nut butters and nut milks',
  dairy: 'milk, cheese, yogurt, butter, cream, ghee, whey',
  eggs: 'eggs, mayonnaise, egg noodles',
  gluten: 'wheat, flour, bread, regular pasta and noodles, tortillas, couscous, barley, soy sauce (tamari is fine)',
  soy: 'soy sauce, tamari, tofu, tempeh, edamame, miso',
  fish: 'salmon, tuna, cod, tilapia, anchovies, fish sauce',
  shellfish: 'shrimp, prawns, crab, lobster, scallops, clams, mussels, oysters',
  sesame: 'sesame oil, sesame seeds, tahini',
};

/** Allergens a dish's own lines name, by word. The catalogue's tags are added on the device. */
export function allergensByWord(d: KitchenDish): string[] {
  // "Peanut butter" is not dairy: a nut or seed butter is renamed before the dairy word can match "butter".
  const text = d.ingredients
    .map((i) => `${i.food} ${i.text}`)
    .join(' | ')
    .replace(/\b(peanut|almond|cashew|sunflower|seed|nut|apple|pumpkin|soy)\s+butter\b/gi, '$1 spread');
  return Object.entries(ALLERGEN_WORDS)
    .filter(([, re]) => re.test(text))
    .map(([k]) => k);
}

/* ── the rotation seed (Kitchen Scope §2) ───────────────────────────────────── */

/** A cuisine and a method to lean toward, varied per day and per ask, so the same pantry doesn't open the same way. */
export function rotationLean(dayIndex: number, askIndex: number): { cuisine: string; method: string } {
  const c = KITCHEN_CUISINES[(dayIndex * 3 + askIndex) % KITCHEN_CUISINES.length];
  const m = KITCHEN_METHODS[(dayIndex + askIndex * 5) % KITCHEN_METHODS.length];
  return { cuisine: c, method: m };
}

/** Today's lean for the Nth ask of this conversation. Reads the clock here, not in a component (react-compiler). */
export function rotationLeanToday(askIndex: number, now: number = Date.now()): { cuisine: string; method: string } {
  return rotationLean(Math.floor(now / 86_400_000), askIndex);
}

/* ── is this line a "what can I make"? ──────────────────────────────────────── */

const MAKE_ASK =
  /\b(what\s+(can|could|should)\s+i\s+(make|cook|have|eat)|what\s+to\s+(make|cook)|(dinner|lunch|breakfast|meal|snack)\s+ideas?|ideas?\s+(for|with)|i\s+(have|got|only\s+have)\b|i'?ve\s+got|in\s+(the|my)\s+(fridge|pantry|freezer)|fridge|pantry|leftovers?|use\s+up|make\s+(me\s+)?(something|a\s+(meal|dinner|lunch|breakfast))|cook\s+(me\s+)?something|something\s+(quick|easy|spicy|healthy|different|light|warm|high\s+protein)|what'?s\s+for\s+(dinner|lunch|breakfast))\b/i;

/**
 * In the kitchen, does this line ask Holt to come up with dishes? Then it goes to `coach-kitchen`, which writes
 * new ones, rather than `coach-ask`, which can only suggest from the book (the repetition in the live check).
 */
export function isMakeRequest(text: string): boolean {
  const t = (text ?? '').trim();
  if (!t) return false;
  if (MAKE_ASK.test(t)) return true;
  // A bare list of foods: "chicken rice spinach", "eggs, feta and some onions".
  const lower = t.toLowerCase();
  const words = lower.replace(/[^a-z ,]+/g, ' ').split(/[\s,]+/).filter(Boolean);
  if (words.length < 2 || words.length > 12) return false;
  if (/\b(how|why|is|are|does|do|should|can|save|plan|macros?|target|calories?|swap|replace|log|buy|recipe)\b/.test(lower)) return false;
  return (lower.match(FOODISH_LIST) ?? []).length >= 2;
}
const FOODISH_LIST =
  /\b(chicken|beef|turkey|pork|steak|salmon|tuna|shrimp|fish|eggs?|tofu|tempeh|beans|lentils|chickpeas|rice|pasta|noodles|potato(es)?|oats|bread|tortillas?|quinoa|cheese|feta|yogurt|spinach|broccoli|peppers?|onions?|garlic|tomato(es)?|avocado|kale|zucchini|mushrooms?|carrots?|cabbage|cauliflower|peas|ground)\b/gi;

/* ── the app's side of the wire ─────────────────────────────────────────────── */

export type KitchenResult =
  | { kind: 'ok'; dishes: KitchenDish[]; remaining: number | null }
  | { kind: 'none' }
  | { kind: 'stop'; route: 'crisis' | 'urgent' | 'care' | 'medical' }
  | { kind: 'daily_limit' }
  | { kind: 'out_of_credits' }
  | { kind: 'not_entitled' }
  | { kind: 'no_nutrition' }
  | { kind: 'unavailable' }
  | { kind: 'offline' };

export function kitchenResultFrom(body: unknown, exclude: readonly string[] = []): KitchenResult {
  if (!body || typeof body !== 'object') return { kind: 'unavailable' };
  const d = body as { ok?: boolean; options?: unknown; reason?: string; remaining?: number; allowance?: number; route?: string };
  if (d.ok) {
    const dishes = sanitizeKitchenAnswer({ options: d.options }, exclude);
    return dishes.length ? { kind: 'ok', dishes, remaining: typeof d.remaining === 'number' ? d.remaining : null } : { kind: 'none' };
  }
  switch (d.reason) {
    case 'stop':
      return { kind: 'stop', route: d.route === 'crisis' || d.route === 'urgent' || d.route === 'care' ? d.route : 'medical' };
    case 'none':
      return { kind: 'none' };
    case 'daily_limit':
      return { kind: 'daily_limit' };
    case 'no_nutrition':
      return { kind: 'no_nutrition' };
    case 'out_of_credits':
      return d.allowance ? { kind: 'out_of_credits' } : { kind: 'not_entitled' };
    default:
      return { kind: 'unavailable' };
  }
}

export function kitchenError(r: Exclude<KitchenResult, { kind: 'ok' } | { kind: 'stop' }>): string {
  switch (r.kind) {
    case 'none':
      return "I couldn't put together anything I'd stand behind from that. Tell me a bit more of what you've got.";
    case 'daily_limit':
      return "That's a lot of ideas for one day. Your recipe book is still there — try again tomorrow.";
    case 'out_of_credits':
      return "You're out of Premium AI credits for this month. Your recipe book still works.";
    case 'not_entitled':
      return 'Coming up with dishes is part of Premium AI. Your recipe book still works.';
    case 'no_nutrition':
      return "Nutrition isn't turned on for your account yet.";
    case 'unavailable':
      return "The kitchen's not working right now. Try again in a bit.";
    case 'offline':
    default:
      return "Couldn't reach Forge. Check your connection and try again.";
  }
}
