/**
 * HOLT'S FOOD TOOLS — `get_foods` (a read) and `log_food` / `propose_meal` (actions).
 * Nutrition Architecture Amendment 006 (HF-D1…HF-D6, LOCKED) + AI Road to 10 Sprint 4a §1.2 / §1.6.
 *
 * Ported from `095d8bf6` (feat/holt-food-lookup, PO 2026-10-01 — the Costa Vida salad) onto today's tree. There it
 * lived inside `ask-tools.ts`; here it is its own module so `coach-ask` can offer it only to a new app (caps
 * `actions_v1`, §1.1) and its deploy build can inline it.
 *
 *   get_foods(query)          HF-D1 — `food-search`, the logger's own search, called AS THE ATHLETE (their JWT), so its
 *                             Nutrition gate and its vendor quota apply exactly as in Log Food. HF-D2 — Holt may quote
 *                             what it returns, as returned. Every food it returns is kept in `seen`, by key.
 *   propose_meal(name, items) HF-D3 — an order or a plate as ONE meal: the card's Log writes one diary row under its
 *                             name, its Save as a meal writes the meal editor's rows. Nothing is written until a tap.
 *   log_food(meal?, items)    Sprint 4a — "log 2 eggs and toast": each item its own diary row, at a meal slot.
 *
 * ⛔ HF-D4 — `checkFoodAction` refuses any key `get_foods` did not return in THIS message (a key from the model's memory
 * could open a real but DIFFERENT food), and on ok sends the foods WHOLE to the device. The model sends only the
 * athlete's own amount. The device does every multiplication (`src/domain/nutrition/holt-meal.ts`, NUT-D4).
 *
 * ⚠ NO IMPORTS — bundled into `coach-ask` (its deploy build inlines this file).
 */

export interface FoodToolDef {
  name: string;
  description: string;
  input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[]; additionalProperties: false };
}

// ── The foods ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * One food as `food-search` returns it — the SAME function the logger searches with. Every number on it is the app's
 * food data, never the model's (NUT-D4): Holt quotes them, and a meal he puts together carries these foods whole to the
 * device, which does the multiplying.
 */
export interface FoodHit {
  key: string;
  source: string;
  name: string;
  brand: string | null;
  kcal100: number | null;
  protein100: number | null;
  carb100: number | null;
  fat100: number | null;
  servings: { label: string; grams: number | null }[];
  attribution: string | null;
}

/** How many foods one search keeps, and how many reach the model's text. */
const FOODS_KEPT = 20;
const FOODS_SHOWN = 6;
/** The tool result's ceiling — `ask-tools.ts` `ASK_TOOL_RESULT_CHARS`. */
const RESULT_CHARS = 4000;
/** `nutrition/my-foods.ts` `MEAL_NAME_MAX` — a saved meal's name. */
const MEAL_NAME_CHARS = 40;
/** A meal or a log holds at most this many foods (the meal editor's own ceiling). */
const ITEMS_MAX = 12;
/** An amount above this is a misread, not a portion (2 kg, 2,000 servings). */
const AMOUNT_MAX = 2000;

const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null);
const str = (x: unknown, n: number): string => (typeof x === 'string' ? x.trim().slice(0, n) : '');

/** `food-search`'s `{ foods }`, narrowed: well-formed foods with a known energy, at most 20. */
export function narrowFoods(data: unknown): FoodHit[] {
  const foods = (data as { foods?: unknown })?.foods;
  if (!Array.isArray(foods)) return [];
  const out: FoodHit[] = [];
  for (const f of foods) {
    if (!f || typeof f !== 'object') continue;
    const o = f as Record<string, unknown>;
    const key = str(o.key, 120);
    const name = str(o.name, 120);
    if (!key || !name || num(o.kcal100) == null) continue;
    out.push({
      key,
      source: str(o.source, 20),
      name,
      brand: str(o.brand, 80) || null,
      kcal100: num(o.kcal100),
      protein100: num(o.protein100),
      carb100: num(o.carb100),
      fat100: num(o.fat100),
      servings: (Array.isArray(o.servings) ? o.servings : [])
        .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
        .map((s) => ({ label: str(s.label, 60), grams: (num(s.grams) ?? 0) > 0 ? (s.grams as number) : null }))
        .filter((s) => s.label)
        .slice(0, 8),
      attribution: str(o.attribution, 80) || null,
    });
    if (out.length >= FOODS_KEPT) break;
  }
  return out;
}

/** `nutrition/serving.ts` `servingOptions` — twin, pinned by `holt-food-lookup.test.mjs`. */
export function foodServingOptions(food: FoodHit): { label: string; grams: number | null }[] {
  const out: { label: string; grams: number | null }[] = [];
  const seen = new Set<string>();
  for (const s of food.servings ?? []) {
    const label = s.label?.trim();
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    out.push({ label, grams: s.grams != null && s.grams > 0 ? s.grams : null });
  }
  if (!out.some((s) => s.grams === 100 && /^100\s*(g|ml)/i.test(s.label))) out.push({ label: '100 g', grams: 100 });
  return out;
}

/** `nutrition/serving.ts` `defaultServing` — twin. */
export function foodDefaultServing(food: FoodHit): { label: string; grams: number | null } {
  const options = foodServingOptions(food);
  return options.find((s) => s.grams != null && !/^100\s*(g|ml)/i.test(s.label)) ?? options[0];
}

/** `nutrition/serving.ts` `portionMacros` for one serving — twin. Null for a serving nobody weighed. */
export function foodServingMacros(food: FoodHit, grams: number | null): { kcal: number; protein: number; carb: number; fat: number } | null {
  if (grams == null || grams <= 0) return null;
  const f = grams / 100;
  const r = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;
  return { kcal: r((food.kcal100 ?? 0) * f, 0), protein: r((food.protein100 ?? 0) * f, 1), carb: r((food.carb100 ?? 0) * f, 1), fat: r((food.fat100 ?? 0) * f, 1) };
}

const FOOD_SOURCE: Record<string, string> = {
  usda: 'USDA',
  fs: 'FatSecret (restaurants and brands)',
  off: 'packaged food, community data',
  community: 'shared by Forge athletes',
  custom: 'their own food',
};

/** Lower-case words, a long plural made singular — enough to rank "Costa Vida" items above a generic salad. */
function foodWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length >= 5 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
}

/** get_foods' text: the closest few, the ones naming the restaurant or brand asked for first. */
export function formatFoodSearch(query: string, foods: readonly FoodHit[]): string {
  if (foods.length === 0) {
    return `Nothing in the app's food database for "${query}". Try a shorter or more general name — for a part of an order, drop the restaurant ("ranch dressing"). If it is still not there, say plainly the app doesn't have it; never give a number of your own.`;
  }
  const words = foodWords(query).filter((w) => w.length > 2);
  const scored = foods
    .map((f, i) => {
      const hay = foodWords(`${f.brand ?? ''} ${f.name}`);
      return { f, i, hits: words.filter((w) => hay.some((h) => h.startsWith(w))).length };
    })
    .sort((a, b) => b.hits - a.hits || a.i - b.i)
    .slice(0, FOODS_SHOWN);
  const lines = [`Results for "${query}" from the app's food database (the app's numbers: quote them as written, never add them up or scale them):`];
  for (const { f } of scored) {
    const s = foodDefaultServing(f);
    const m = foodServingMacros(f, s.grams);
    const per100 = foodServingMacros(f, 100) as { kcal: number; protein: number; carb: number; fat: number };
    const at = m
      ? `per ${s.label}${/^\d+(\.\d+)?\s*(g|ml)\b/i.test(s.label) ? '' : ` (${s.grams} g)`}: ${m.kcal} kcal, ${m.protein} g protein, ${m.carb} g carbs, ${m.fat} g fat`
      : `per 100 g: ${per100.kcal} kcal, ${per100.protein} g protein, ${per100.carb} g carbs, ${per100.fat} g fat`;
    const other = foodServingOptions(f)
      .filter((x) => x.label !== s.label && x.grams != null)
      .slice(0, 3)
      .map((x) => x.label);
    lines.push(`key ${f.key} — ${f.name}${f.brand ? ` (${f.brand})` : ''}, ${FOOD_SOURCE[f.source] ?? f.source}; ${at}${other.length ? `; other servings: ${other.join(', ')}` : ''}.`);
  }
  return lines.join('\n');
}

// ── The tool and the actions ──────────────────────────────────────────────────────────────────────────

/** The model's item: a key from get_foods and only an amount the athlete gave. */
const ITEMS_SCHEMA = {
  type: 'array',
  minItems: 1,
  maxItems: ITEMS_MAX,
  items: {
    type: 'object',
    properties: {
      key: { type: 'string', description: 'A key from get_foods.' },
      amount: { type: 'number', description: 'Only a number the athlete gave.' },
      unit: { type: 'string', enum: ['oz', 'g', 'servings'], description: "The athlete's unit for amount. 'servings' counts the food's own serving." },
    },
    required: ['key'],
    additionalProperties: false,
  },
};

/** The diary's four meal slots (`nutrition/day.ts` `MEAL_SLOTS`). */
export const FOOD_MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;
export type FoodMealSlot = (typeof FOOD_MEAL_SLOTS)[number];

/** Reads — offered only with caps `actions_v1`. */
export const FOOD_TOOLS: FoodToolDef[] = [
  {
    name: 'get_foods',
    description:
      "Search the app's food database — the same one the athlete logs from: USDA foods, packaged foods, and restaurant and chain menu items. Each result has a key, its source, and the APP's calories and macros for its serving and per 100 g. Use for any 'how many calories/macros in X' or restaurant-order question, and before log_food or propose_meal. One food per search: for a restaurant order, search the restaurant's item first ('Costa Vida chicken salad'), then any part they named on its own ('Costa Vida ranch dressing').",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: "One food, with the restaurant or brand when there is one ('Chick-fil-A nuggets', 'ranch dressing', 'grilled chicken breast')." },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
];

/** Actions — offered only with caps `actions_v1`. The function never performs one: it forwards it (§1.2). */
export const FOOD_ACTIONS: FoodToolDef[] = [
  {
    name: 'log_food',
    description:
      "Log foods from get_foods to the athlete's food diary today, each as its own entry. The app shows a card with every food, its amount and the app's numbers, and a Log button; nothing is logged unless they tap. Use when they ask you to log what they ate ('log 2 eggs and toast for breakfast'). Every item must be a key that get_foods returned in THIS message. Give an amount only when the athlete said one; otherwise leave it out and the app uses that food's own serving. Give meal only when they named one or the time of day makes it plain. Never add up or scale numbers yourself — the card does.",
    input_schema: {
      type: 'object',
      properties: {
        meal: { type: 'string', enum: [...FOOD_MEAL_SLOTS], description: "The diary meal they named ('for breakfast'). Leave it out when they didn't." },
        items: ITEMS_SCHEMA,
      },
      required: ['items'],
      additionalProperties: false,
    },
  },
  {
    name: 'propose_meal',
    description:
      "Put foods from get_foods together as one meal the athlete can log or save in one tap. The app shows a card with every item, the app's totals, and Log it / Save as a meal buttons; nothing is written unless they tap. Use when they want an order or a plate made into ONE thing ('make it a meal called …'). Every item must be a key that get_foods returned in THIS message. Give an amount only when the athlete said one ('4 oz of ranch'); otherwise leave it out and the app uses that food's own serving. Never add up or scale numbers yourself — the card does.",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "What to call it, in the athlete's words ('Costa Vida Chicken Salad')." },
        items: ITEMS_SCHEMA,
      },
      required: ['name', 'items'],
      additionalProperties: false,
    },
  },
];

export const FOOD_ACTION_NAMES: readonly string[] = FOOD_ACTIONS.map((a) => a.name);

/**
 * The prompt section for a caps `actions_v1` turn (lane A places it in coach-ask's system block for that prefix — it
 * must stay byte-stable, §1.1). From 095d8bf6's "Looking up a food or a restaurant order", plus log_food.
 */
export const FOOD_PROMPT = `# Looking up, logging or saving a food

- When they ask what is in a food, a dish or a restaurant order, or want one logged or saved, look it up with get_foods. Never say you can't look it up or don't have a restaurant's numbers until get_foods has come back empty.
- Search one food at a time. For a restaurant order, search the restaurant's own item first ("Costa Vida chicken salad"), and each extra they named on its own ("Costa Vida ranch dressing", "Costa Vida red sauce"). If the restaurant's version isn't there, search the plain food ("ranch dressing") and use the closest match.
- Pick the result that is really what they ate — the restaurant's own item over a general one. When you had to use a general food for part of it, say which part in a few words.
- You may quote a result's numbers exactly as the tool gives them, for the serving it names. Never add foods together, scale a serving to their amount, or estimate a total: the app's card shows the totals.
- To log what they ate, call log_food with the keys get_foods returned in this message and only the amounts they gave ("2 eggs" is amount 2, unit servings, when the egg's serving is one egg; "4 oz" is amount 4, unit oz). When they gave no amount, leave it out.
- When they want the whole order as one thing ("make it a meal", "save it as one"), call propose_meal instead, with the name they asked for.
- After log_food or propose_meal, say in one short line what is on the card. Never say it is logged or saved: they tap the card.`;

/** What the model gets back after a food action — the app has it now; he says one line and stops. */
export function foodActionAck(name: string): string {
  return name === 'propose_meal'
    ? "The app is showing the athlete the meal card with its items and the app's totals, and Log it and Save as a meal buttons. Do not say it is saved or logged, and do not state the totals. In one short line, say what is on it — and if any part is a general food standing in for the restaurant's own, say which."
    : "The app is showing the athlete a card with each food, its amount and the app's numbers, and a Log button. Do not say it is logged, and do not state any total. In one short line, say what is on it — and if any food is a general one standing in for what they named, say which.";
}

/** What `coach-ask` hands a food read so it can call `food-search` AS THE ATHLETE (HF-D1). */
export interface FoodToolCtx {
  authorization: string;
  supabaseUrl: string;
  anonKey: string;
  fetch: (url: string, init: Record<string, unknown>) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;
}

/** One search's wait. `food-search` takes 1.7–4.9 s (it asks USDA, FatSecret and Open Food Facts). */
const FOOD_SEARCH_TIMEOUT_MS = 15_000;

const capped = (t: string): string => (t.length > RESULT_CHARS ? `${t.slice(0, RESULT_CHARS - 40)}\n…(cut for length)` : t);

/** Run `get_foods`. `seen` collects the foods returned this turn, by key (HF-D4). Never throws. */
export async function runFoodTool(
  name: string,
  input: Record<string, unknown>,
  ctx: FoodToolCtx,
  seen: Map<string, unknown>,
): Promise<{ text: string; isError?: boolean }> {
  if (name !== 'get_foods') return { text: `Unknown tool: ${name}`, isError: true };
  const query = typeof input?.query === 'string' ? input.query.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
  if (query.length < 2) return { text: 'query is required', isError: true };
  if (!ctx?.fetch || !ctx.supabaseUrl) return { text: "Food search isn't available just now. Tell the athlete you couldn't look it up.", isError: true };
  let found: FoodHit[];
  try {
    const res = await ctx.fetch(`${ctx.supabaseUrl}/functions/v1/food-search`, {
      method: 'POST',
      headers: { Authorization: ctx.authorization, apikey: ctx.anonKey, 'content-type': 'application/json' },
      body: JSON.stringify({ q: query, limit: 12 }),
      signal: AbortSignal.timeout(FOOD_SEARCH_TIMEOUT_MS),
    });
    // food-search's own Nutrition gate (`has_nutrition_access()`, as the athlete): 403.
    if (res.status === 403) {
      return { text: "Nutrition is not on for this account, so the food database can't be searched. Say so in one line; never give a number of your own.", isError: false };
    }
    if (!res.ok) throw new Error(`food search answered ${res.status}`);
    found = narrowFoods(await res.json());
  } catch {
    return { text: "The food search didn't answer, so you couldn't pull it. Tell the athlete you couldn't look it up just now; never give a number of your own.", isError: true };
  }
  for (const f of found) seen.set(f.key, f);
  return { text: capped(formatFoodSearch(query, found)), isError: false };
}

// ── The check before an action is forwarded (HF-D4) ───────────────────────────────────────────────────

/** A meal item as it is forwarded to the device: the food whole, and only an amount the athlete gave. */
export interface MealProposalItem {
  food: FoodHit;
  amount: number | null;
  unit: 'oz' | 'g' | 'servings' | null;
}
export interface MealProposal {
  name: string;
  items: MealProposalItem[];
}
/** `log_food` as it is forwarded: the slot the athlete named (or null — the app picks by the hour) and the foods whole. */
export interface FoodLogProposal {
  meal: FoodMealSlot | null;
  items: MealProposalItem[];
}

/** The model's items → foods `seen` this message, or the keys that were not. */
function resolveItems(raw: unknown, seen: ReadonlyMap<string, unknown>): { items: MealProposalItem[]; unknown: string[] } {
  const list = Array.isArray(raw) ? raw.slice(0, ITEMS_MAX) : [];
  const items: MealProposalItem[] = [];
  const unknown: string[] = [];
  for (const r of list) {
    const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    const key = typeof o.key === 'string' ? o.key.trim() : '';
    const food = seen.get(key) as FoodHit | undefined;
    if (!food) {
      unknown.push(key || '(no key)');
      continue;
    }
    const amount = typeof o.amount === 'number' && Number.isFinite(o.amount) && o.amount > 0 && o.amount <= AMOUNT_MAX ? o.amount : null;
    const unit = o.unit === 'oz' || o.unit === 'g' || o.unit === 'servings' ? o.unit : null;
    items.push({ food, amount, unit: amount == null ? null : (unit ?? 'servings') });
  }
  return { items, unknown };
}

const notSeen = (action: string, keys: string[]) =>
  `Not keys get_foods returned in this message: ${keys.join(', ')}. Search for those foods first, then call ${action} again with keys from the results. Nothing was shown to the athlete.`;

/**
 * propose_meal, checked before it reaches the device. ⛔ Every key must be one get_foods returned in THIS message
 * (`seen`). A miss goes back to the model as an error so it searches first; nothing reaches the athlete.
 */
export function resolveMealProposal(input: unknown, seen: ReadonlyMap<string, unknown>): { ok: true; meal: MealProposal } | { ok: false; text: string } {
  const i = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const name = typeof i.name === 'string' ? i.name.replace(/\s+/g, ' ').trim().slice(0, MEAL_NAME_CHARS) : '';
  if (!name) return { ok: false, text: 'propose_meal needs a name.' };
  if (!Array.isArray(i.items) || i.items.length === 0) return { ok: false, text: 'propose_meal needs at least one item.' };
  const { items, unknown } = resolveItems(i.items, seen);
  if (unknown.length) return { ok: false, text: notSeen('propose_meal', unknown) };
  return { ok: true, meal: { name, items } };
}

/** log_food, checked the same way. A slot that is not one of the four is dropped (the app picks by the hour). */
export function resolveFoodLog(input: unknown, seen: ReadonlyMap<string, unknown>): { ok: true; log: FoodLogProposal } | { ok: false; text: string } {
  const i = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  if (!Array.isArray(i.items) || i.items.length === 0) return { ok: false, text: 'log_food needs at least one item.' };
  const { items, unknown } = resolveItems(i.items, seen);
  if (unknown.length) return { ok: false, text: notSeen('log_food', unknown) };
  const meal = (FOOD_MEAL_SLOTS as readonly string[]).includes(i.meal as string) ? (i.meal as FoodMealSlot) : null;
  return { ok: true, log: { meal, items } };
}

/**
 * Before `log_food` / `propose_meal` is forwarded: every key must be one `get_foods` returned this turn (HF-D4).
 * On ok, `input` carries the foods WHOLE (as food-search returned them) for the device.
 */
export function checkFoodAction(
  name: string,
  input: Record<string, unknown>,
  seen: Map<string, unknown>,
): { ok: true; input: Record<string, unknown> } | { ok: false; error: string } {
  if (name === 'propose_meal') {
    const r = resolveMealProposal(input, seen);
    return r.ok ? { ok: true, input: r.meal as unknown as Record<string, unknown> } : { ok: false, error: r.text };
  }
  if (name === 'log_food') {
    const r = resolveFoodLog(input, seen);
    return r.ok ? { ok: true, input: r.log as unknown as Record<string, unknown> } : { ok: false, error: r.text };
  }
  return { ok: false, error: `${name} is not a food action.` };
}
