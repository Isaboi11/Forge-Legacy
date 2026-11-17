// ===
// DASHBOARD PASTE COPY of supabase/functions/coach-kitchen/index.ts - GENERATED, DO NOT EDIT.
//
// The real function imports src/domain/nutrition/kitchen-dishes.ts and src/domain/coach/medical-routing.ts,
// which the Supabase dashboard editor cannot reach. This copy inlines them in place of their import lines;
// nothing else differs. Regenerate with `node scripts/build-coach-kitchen-deploy.mjs`.
//
// Supabase dashboard -> Edge Functions -> Deploy a new function -> "Via Editor" -> name it
// coach-kitchen -> replace the editor contents with this whole file -> Deploy.
// ANTHROPIC_API_KEY is already set (coach-interpret, coach-ask and program-photo-read use the same secret).
// ! Apply supabase/apply/pending-0222.sql FIRST - it prices `kitchen`; until then every ask answers
// "the kitchen's not working".
// ! Apply supabase/apply/pending-0268.sql FIRST - it creates coach_ai_reserve / coach_ai_settle (the meter
// this copy also inlines, src/domain/ai/meter-server.ts); until then every ask answers "meter unavailable".
// ===

import { createClient } from 'jsr:@supabase/supabase-js@2';
export const KITCHEN_ACTION = 'kitchen';
export const KITCHEN_OUTPUT_CAP = 2600;
export const KITCHEN_PER_DAY = 40;
export const KITCHEN_OPTIONS = 3;
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
export interface KitchenRequest {
    have: string[];
    ask: string;
    avoid: string[];
    exclude: string[];
    nudge: KitchenNudge | null;
    lean: {
        cuisine: string;
        method: string;
    } | null;
    left: string | null;
    minor: boolean;
}
const clean = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const list = (v: unknown, max: number, chars: number): string[] => (Array.isArray(v) ? v : []).map((x) => clean(x, chars)).filter(Boolean).slice(0, max);
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
export function kitchenUserTurn(r: KitchenRequest): string {
    const lines: string[] = [];
    if (r.ask)
        lines.push(`What the athlete said: "${r.ask}"`);
    const keys = r.avoid.map((a) => a.toLowerCase().replace(/\s+/g, '_')).filter((k) => ALLERGEN_WORDS[k] || DIET_WORDS[k]);
    const have = r.have.filter((h) => !keys.some((k) => (ALLERGEN_WORDS[k] ?? DIET_WORDS[k]).test(h)));
    lines.push(have.length ? `On hand: ${have.join(', ')}.` : 'On hand: not given \u2014 assume a normal pantry and ask nothing.');
    if (r.avoid.length) {
        const spelled = r.avoid.map((a) => {
            const k = a.toLowerCase().replace(/\s+/g, '_');
            return ALLERGEN_COVERS[k] ? `${a} (${ALLERGEN_COVERS[k]})` : a;
        });
        lines.push(`Hard rules \u2014 never use, in any form: ${spelled.join('; ')}.`);
    }
    if (r.exclude.length)
        lines.push(`Already suggested, do not repeat or lightly rename: ${r.exclude.join('; ')}.`);
    if (r.lean)
        lines.push(`Lean toward, if it fits: ${[r.lean.cuisine, r.lean.method].filter(Boolean).join(', ')}.`);
    const nudge: Record<KitchenNudge, string> = {
        more: 'They want different ideas from the ones above.',
        quicker: 'They want quicker dishes \u2014 15 minutes or less where possible.',
        protein: 'They want more protein \u2014 build each dish around a bigger protein portion.',
        style: 'They want a different style \u2014 new cuisines and methods from the ones above.',
    };
    if (r.nudge)
        lines.push(nudge[r.nudge]);
    if (r.left && !r.minor)
        lines.push(`App's numbers for today: ${r.left} Lean the options toward it; never mention a number.`);
    lines.push(`Write ${KITCHEN_OPTIONS} options.`);
    return lines.join('\n');
}
export interface KitchenIngredient {
    text: string;
    quantity: number | null;
    unit: string;
    food: string;
}
export interface KitchenDish {
    name: string;
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
const FATS = /\b(oil|butter|ghee|lard|shortening|mayo(nnaise)?)\b/i;
function saneAmount(i: KitchenIngredient, servings: number): boolean {
    if (i.quantity == null)
        return true;
    const per = WEIGHT_TO_G[i.unit.toLowerCase()];
    if (per == null)
        return i.quantity <= 50;
    const g = (i.quantity * per) / Math.max(1, servings);
    return FATS.test(i.food) ? g <= 100 : g <= 1000;
}
function sanitizeDish(raw: unknown): KitchenDish | null {
    if (!raw || typeof raw !== 'object')
        return null;
    const d = raw as Record<string, unknown>;
    const full = clean(d.name, 200);
    const name = full.length <= NAME_CHARS ? full : full.slice(0, NAME_CHARS + 1).replace(/\s+\S*$/, '').replace(/[\s,&-]+$/, '');
    if (!name)
        return null;
    const servings = Math.round(positive(d.servings, 12) ?? 1) || 1;
    const ingredients: KitchenIngredient[] = [];
    for (const item of Array.isArray(d.ingredients) ? d.ingredients : []) {
        if (!item || typeof item !== 'object')
            continue;
        const x = item as Record<string, unknown>;
        const text = clean(x.text, TEXT_CHARS);
        const food = clean(x.food, FOOD_CHARS);
        if (!text && !food)
            continue;
        const ing = { text: text || food, quantity: positive(x.quantity, 100000), unit: clean(x.unit, UNIT_CHARS), food: food || text };
        if (!saneAmount(ing, servings))
            continue;
        ingredients.push(ing);
        if (ingredients.length >= MAX_INGREDIENTS)
            break;
    }
    if (ingredients.length < 2)
        return null;
    const method = typeof d.method === 'string' && (KITCHEN_METHODS as readonly string[]).includes(d.method) ? (d.method as KitchenMethod) : 'pan';
    const meal = typeof d.mealType === 'string' && MEALS.includes(d.mealType) ? (d.mealType as KitchenDish['mealType']) : null;
    const minutes = positive(d.minutes, 24 * 60);
    const dish: KitchenDish = {
        name,
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
export function sanitizeKitchenAnswer(raw: unknown, exclude: readonly string[] = []): KitchenDish[] {
    const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const banned = new Set(exclude.map(norm));
    const out: KitchenDish[] = [];
    const sameMethod: KitchenDish[] = [];
    const methods = new Set<string>();
    for (const o of Array.isArray(d.options) ? d.options : []) {
        const dish = sanitizeDish(o);
        if (!dish || banned.has(norm(dish.name)) || out.some((x) => norm(x.name) === norm(dish.name)))
            continue;
        if (methods.has(dish.method)) {
            sameMethod.push(dish);
            continue;
        }
        methods.add(dish.method);
        out.push(dish);
        if (out.length >= KITCHEN_OPTIONS)
            break;
    }
    for (const dish of sameMethod)
        if (out.length < KITCHEN_OPTIONS)
            out.push(dish);
    return out;
}
export function kitchenFromModelText(text: string, exclude: readonly string[] = []): KitchenDish[] {
    try {
        return sanitizeKitchenAnswer(JSON.parse(text.trim()), exclude);
    }
    catch {
        return [];
    }
}
const SAFE_TEMPS: readonly {
    re: RegExp;
    line: string;
}[] = [
    { re: /\b(chicken|turkey|duck|poultry)\b/i, line: 'Cook the poultry to 165\u00b0F inside (USDA).' },
    { re: /\bground\s+(beef|pork|lamb|veal)|\b(burger|meatballs?|sausage)\b/i, line: 'Cook ground meat to 160\u00b0F inside (USDA).' },
    { re: /\b(beef|steak|pork|lamb|veal|chops?)\b/i, line: 'Cook beef, pork or lamb to 145\u00b0F inside, then rest 3 minutes (USDA).' },
    { re: /\b(salmon|tuna steak|cod|tilapia|fish|shrimp|prawns?|scallops?)\b/i, line: 'Cook fish and shellfish to 145\u00b0F, until opaque and it flakes (USDA).' },
    { re: /\beggs?\b/i, line: 'Cook eggs until the yolk and white are firm; egg dishes to 160\u00b0F (USDA).' },
];
const NO_COOK_SAFE = /\b(canned|tinned|smoked|deli|rotisserie|cooked|leftover|jerky)\b/i;
export function withSafeTemps(d: KitchenDish): KitchenDish {
    if (d.steps.some((s) => /\d\s*\u00b0\s*F/i.test(s)))
        return d;
    const add: string[] = [];
    for (const t of SAFE_TEMPS) {
        if (d.ingredients.some((i) => t.re.test(i.food) && !NO_COOK_SAFE.test(i.food)) && !add.includes(t.line))
            add.push(t.line);
        if (add.length >= 2)
            break;
    }
    return add.length ? { ...d, steps: [...d.steps, ...add].slice(0, MAX_STEPS + 2) } : d;
}
export const ALLERGEN_WORDS: Record<string, RegExp> = {
    peanuts: /\b(peanuts?|groundnuts?|arachis|satay|mixed\s+nuts|trail\s+mix|nut\s+spread)\b/i,
    tree_nuts: /\b(nuts?|almonds?|cashews?|walnuts?|pecans?|pistachios?|hazelnuts?|filberts?|macadamias?|chestnuts?|pignoli|pesto|pralines?|marzipan|frangipane|nougat|gianduja|nutella|amaretti|baklava|romesco|dukkah|granola|trail\s+mix)\b/i,
    dairy: /\b(milk|buttermilk|cheeses?|feta|parmesan|parmigiano|pecorino|mozzarella|cheddar|brie|camembert|gouda|gruyere|provolone|mascarpone|burrata|halloumi|paneer|ricotta|queso|labneh|skyr|kefir|yogh?urts?|butter|cream|creamers?|creme\s+fraiche|half[\s-]+and[\s-]+half|ghee|whey|casein\w*|lactose|custard|gelato|alfredo|bechamel|tzatziki|raita|lassi|ranch|caesar|pesto|naan|brioche|croissants?|doughnuts?|donuts?|chocolate\s+chips?|dulce\s+de\s+leche|eggnog)\b/i,
    eggs: /\b(eggs?|egg\s+(whites?|yolks?|wash|noodles)|yolks?|albumen|mayo|mayonnaise|aioli|remoulade|tartar\s+sauce|meringues?|pavlova|custard|hollandaise|bearnaise|carbonara|frittatas?|omelett?e?s?|quiches?|tiramisu|mousse|eggnog|brioche|challah|naan|doughnuts?|donuts?|marshmallows?|caesar|ranch)\b/i,
    gluten: /\b(wheat|flour|\w*breads?|breadcrumbs?|crumbs|panko|croutons?|pasta|noodles?|spaghetti|penne|linguine|fettuccine|rigatoni|fusilli|farfalle|macaroni|lasagnas?|lasagne|orzo|ravioli|tortellini|gnocchi|ramen|udon|soba|couscous|bulgh?ur|farro|spelt|semolina|durum|freekeh|kamut|barley|rye|malt(ed)?|seitan|tortillas?|pitas?|naan|bagels?|buns?|croissants?|brioche|challah|crackers?|pretzels?|biscuits?|muffins?|pastry|pastries|phyllo|filo|wontons?|dumplings?|gyoza|matzo\w*|tempura|roux|gravy|stuffing|dough|crust|cookies?|brownies?|pancakes?|waffles?|graham|doughnuts?|donuts?|oats?|oatmeal|granola|jerky|wraps?|beer|soy\s+sauce|teriyaki|hoisin|carbonara|tiramisu|quiches?)\b/i,
    soy: /\b(soy\w*|tofu|tempeh|edamame|miso|tamari|shoyu|natto|yuba|okara|tvp|textured\s+vegetable\s+protein|teriyaki|hoisin|ponzu|gochujang|doenjang|lecithin|jerky|chocolate\s+chips?|milk\s+chocolate)\b/i,
    fish: /\b(fish|catfish|swordfish|monkfish|whitefish|bluefish|redfish|stockfish|salmon|lox|gravlax|tuna|ahi|albacore|bonito|cod|haddock|pollock|hake|halibut|tilapia|trout|bass|branzino|snapper|grouper|mahi(\s*-?\s*mahi)?|mackerel|herring|kippers?|sardines?|anchov\w*|sole|flounder|plaice|perch|pike|carp|eel|unagi|barramundi|yellowtail|hamachi|roe|caviar|surimi|dashi|furikake|nam\s+pla|worcester\w*|caesar|sashimi|seafood)\b/i,
    shellfish: /\b(shellfish|shrimps?|prawns?|crabs?|crabmeat|lobsters?|langoustines?|scampi|crayfish|crawfish|krill|scallops?|clams?|mussels?|oysters?|cockles?|whelks?|abalone|squid|calamari|octopus|cuttlefish|bisque|xo\s+sauce|seafood)\b/i,
    sesame: /\b(sesame|tahini|hummus|houmous|halva|halvah|gomasio|furikake|za.?atar|dukkah|benne|baba\s+gh?anoush|bagels?|everything\s+(bagel\s+)?seasoning)\b/i,
};
export const DIET_WORDS: Record<string, RegExp> = {
    meat: /\b(meat|beef|pork|steak|bacon|ham|sausages?|lamb|mutton|veal|venison|bison|brisket|mince|jerky|pepperoni|salami|chorizo|prosciutto|pancetta|guanciale|pastrami|mortadella|kielbasa|bratwurst|andouille|hot\s*dogs?|meatballs?|lard|tallow|suet|gelatine?|bone\s+broth)\b/i,
    poultry: /\b(chicken|turkey|duck|goose|quail|poultry)\b/i,
    honey: /\bhoney\b/i,
};
export const ALLERGEN_COVERS: Record<string, string> = {
    peanuts: 'peanuts, peanut butter, peanut oil, satay, mixed nuts',
    tree_nuts: 'almonds, cashews, walnuts, pecans, pistachios, hazelnuts, pine nuts, pesto, marzipan, nut butters and nut milks',
    dairy: 'milk, buttermilk, kefir, cheese, yogurt, butter, cream, creamer, ghee, whey, casein, pesto',
    eggs: 'eggs, mayonnaise, aioli, meringue, custard, egg noodles',
    gluten: 'wheat, flour, bread, naan, pita, regular pasta and noodles (penne, spaghetti), tortillas, couscous, bulgur, farro, barley, rye, panko and breadcrumbs, seitan, soy sauce (tamari is fine)',
    soy: 'soy sauce, tamari, soybean oil, soy milk, tofu, tempeh, edamame, miso',
    fish: 'salmon, tuna, cod, tilapia, sea bass, anchovies, fish sauce, Worcestershire sauce, Caesar dressing',
    shellfish: 'shrimp, prawns, crab, lobster, scallops, clams, mussels, oysters, squid, calamari, octopus',
    sesame: 'sesame oil, sesame seeds, tahini, hummus',
};
const ACCENTS: Record<string, string> = { \u00e0: 'a', \u00e1: 'a', \u00e2: 'a', \u00e4: 'a', \u00e8: 'e', \u00e9: 'e', \u00ea: 'e', \u00eb: 'e', \u00ec: 'i', \u00ed: 'i', \u00ee: 'i', \u00ef: 'i', \u00f2: 'o', \u00f3: 'o', \u00f4: 'o', \u00f6: 'o', \u00f9: 'u', \u00fa: 'u', \u00fb: 'u', \u00fc: 'u', \u00f1: 'n', \u00e7: 'c' };
export const foldAccents = (s: string): string => s.replace(/[\u00e0\u00e1\u00e2\u00e4\u00e8\u00e9\u00ea\u00eb\u00ec\u00ed\u00ee\u00ef\u00f2\u00f3\u00f4\u00f6\u00f9\u00fa\u00fb\u00fc\u00f1\u00e7]/gi, (c) => ACCENTS[c.toLowerCase()] ?? c);
export function allergensByWord(d: KitchenDish): string[] {
    const text = foldAccents(d.ingredients.map((i) => `${i.food} ${i.text}`).join(' | '))
        .replace(/\b(peanut|almond|cashew|sunflower|seed|nut|apple|pumpkin|soy)\s+butter\b/gi, '$1 spread')
        .replace(/\bwater\s+chestnuts?\b/gi, 'water caltrop')
        .replace(/\bchestnut\s+mushrooms?\b/gi, 'brown mushrooms')
        .replace(/\b(lettuce|collard|cabbage|nori|rice\s+paper)\s+wraps?\b/gi, '$1 cups');
    return Object.entries(ALLERGEN_WORDS)
        .filter(([, re]) => re.test(text))
        .map(([k]) => k);
}
export function rotationLean(dayIndex: number, askIndex: number): {
    cuisine: string;
    method: string;
} {
    const c = KITCHEN_CUISINES[(dayIndex * 3 + askIndex) % KITCHEN_CUISINES.length];
    const m = KITCHEN_METHODS[(dayIndex + askIndex * 5) % KITCHEN_METHODS.length];
    return { cuisine: c, method: m };
}
export function rotationLeanToday(askIndex: number, now: number = Date.now()): {
    cuisine: string;
    method: string;
} {
    return rotationLean(Math.floor(now / 86400000), askIndex);
}
const MAKE_ASK = /\b(what\s+(can|could|should)\s+i\s+(make|cook|have|eat)|what\s+to\s+(make|cook)|(dinner|lunch|breakfast|meal|snack)\s+ideas?|ideas?\s+(for|with)|i\s+(have|got|only\s+have)\b|i'?ve\s+got|in\s+(the|my)\s+(fridge|pantry|freezer)|fridge|pantry|leftovers?|use\s+up|make\s+(me\s+)?(something|a\s+(meal|dinner|lunch|breakfast))|cook\s+(me\s+)?something|something\s+(quick|easy|spicy|healthy|different|light|warm|high\s+protein)|what'?s\s+for\s+(dinner|lunch|breakfast))\b/i;
export function isMakeRequest(text: string): boolean {
    const t = (text ?? '').trim();
    if (!t)
        return false;
    if (MAKE_ASK.test(t))
        return true;
    const lower = t.toLowerCase();
    const words = lower.replace(/[^a-z ,]+/g, ' ').split(/[\s,]+/).filter(Boolean);
    if (words.length < 2 || words.length > 12)
        return false;
    if (/\b(how|why|is|are|does|do|should|can|save|plan|macros?|target|calories?|swap|replace|log|buy|recipe)\b/.test(lower))
        return false;
    return (lower.match(FOODISH_LIST) ?? []).length >= 2;
}
const FOODISH_LIST = /\b(chicken|beef|turkey|pork|steak|salmon|tuna|shrimp|fish|eggs?|tofu|tempeh|beans|lentils|chickpeas|rice|pasta|noodles|potato(es)?|oats|bread|tortillas?|quinoa|cheese|feta|yogurt|spinach|broccoli|peppers?|onions?|garlic|tomato(es)?|avocado|kale|zucchini|mushrooms?|carrots?|cabbage|cauliflower|peas|ground)\b/gi;
export type KitchenResult = {
    kind: 'ok';
    dishes: KitchenDish[];
    remaining: number | null;
} | {
    kind: 'none';
} | {
    kind: 'stop';
    route: 'crisis' | 'urgent' | 'care' | 'medical';
} | {
    kind: 'daily_limit';
} | {
    kind: 'out_of_credits';
} | {
    kind: 'not_entitled';
} | {
    kind: 'no_nutrition';
} | {
    kind: 'unavailable';
} | {
    kind: 'offline';
};
export function kitchenResultFrom(body: unknown, exclude: readonly string[] = []): KitchenResult {
    if (!body || typeof body !== 'object')
        return { kind: 'unavailable' };
    const d = body as {
        ok?: boolean;
        options?: unknown;
        reason?: string;
        remaining?: number;
        allowance?: number;
        route?: string;
    };
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
export function kitchenError(r: Exclude<KitchenResult, {
    kind: 'ok';
} | {
    kind: 'stop';
}>): string {
    switch (r.kind) {
        case 'none':
            return "I couldn't put together anything I'd stand behind from that. Tell me a bit more of what you've got.";
        case 'daily_limit':
            return "That's a lot of ideas for one day. My Recipes is still there \u2014 try again tomorrow.";
        case 'out_of_credits':
            return "You're out of Premium AI credits for this month. My Recipes still works.";
        case 'not_entitled':
            return 'Coming up with dishes is part of Premium AI. My Recipes still works.';
        case 'no_nutrition':
            return "Nutrition isn't turned on for your account yet.";
        case 'unavailable':
            return "The kitchen's not working right now. Try again in a bit.";
        case 'offline':
        default:
            return "Couldn't reach Forge. Check your connection and try again.";
    }
}
export const ACUTE = /\b(ruptur\w*|fractur\w*(?!\s+(my|the|our)\s+(schedule|week|plans?|routine|program|calendar))|surger\w*|operation|operated|post[-\s]?op|sprain\w*|dislocat\w*|physio\w*|physical\s+therap\w*|doctor|surgeon|orthopa?ed\w*|mri|x[-\s]?ray|numb\w*|tingl\w*|pinched|shooting\s+pain|swell\w*|swollen|herniat\w*|bulging\s+disc|sciatic\w*|concussion|whiplash)\b/i;
export const CONDITION = /\b(tendinitis|tendonitis|tendinopathy|tendinosis|bursitis|fasciitis|epicondyl\w*|tennis\s+elbow|golfer'?s\s+elbow|jumper'?s\s+knee|runner'?s\s+knee|shin\s+splints?|it\s?band\s+syndrome|itbs|piriformis\s+syndrome|carpal\s+tunnel|frozen\s+shoulder|adhesive\s+capsulitis|costochondritis|compartment\s+syndrome|osgood[-\s]schlatter\w*|impinge(ment|d|s)?|labral\s+tear\w*|slap\s+tear\w*|(meniscus|meniscal)\s+tear\w*|rotator\s+cuff\s+(tear\w*|injur\w*|tendin\w*)|patellofemoral|chondromalacia|subluxat\w*|spondyl\w*|stenosis|trigger\s+finger|de\s+quervain\w*|achilles\s+tendin\w*)\b/i;
export const CRISIS = /\b(kill(ing)?\s+myself|kms|suicid\w*|end(ing)?\s+(it\s+all|my\s+life|it)\b(?!\s+(early|there|here|with|on|at))|want(ed)?\s+to\s+die|wanna\s+die|rather\s+(not\s+exist|be\s+dead)|(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+alive|exist|be\s+here\s+anymore)|hurt(ing)?\s+myself|harm(ing)?\s+myself|self[-\s]?harm\w*|cut(ting)?\s+myself|(hit|punch|punish)(ing)?\s+myself|no\s+reason\s+to\s+live|(till|until)\s+(they|it|i)\s+bleed|make\s+myself\s+bleed)\b/i;
export const URGENT = /\b(chest\s+(pain|pressure|tightness|is\s+tight|feels\s+tight|hurts)|pain\s+in\s+my\s+chest|(passed|pass(ing)?|blacked|black(ing)?)\s+out|faint(ed|ing)?\b|can'?t\s+(catch\s+my\s+)?breathe?|trouble\s+breathing|struggling\s+to\s+breathe|asthma\s+attack|heart\s+(is\s+|keeps\s+|won'?t\s+stop\s+)?(racing|pounding|skipping|fluttering)|(dark|brown|cola|tea)[-\s]colou?red\s+(pee|urine)|(pee|urine)\s+(is\s+|was\s+|looks\s+)?(dark|brown|cola|tea)\b|rhabdo\w*|worst\s+headache|severe\s+headache|thunderclap|face\s+(is\s+)?droop\w*|slurr\w*|seizure|can'?t\s+feel\s+my\s+(legs|arms|feet)|(low|crashing)\s+blood\s+sugar|blood\s+(sugar|glucose)\s+(is\s+|was\s+|keeps\s+|feels\s+|went\s+|just\s+)*(low|crash\w*|dropp\w*|tank\w*|plummet\w*)|hypoglyc\w*|dolor\s+de\s+pecho|duele\s+el\s+pecho|(lost|losing|lose|can'?t\s+control)\s+(my\s+)?(bladder|bowel)|throat\s+(is\s+)?(swelling|swollen|closing)|short(ness)?\s+of\s+breath|swollen\s+and\s+(hot|red)|(hot|red)\s+and\s+swollen)\b/i;
const AMBIGUOUS_DAMAGE = /\b(broke|broken|tear|tears|tearing|tore|torn|strained|strain|strains|snapped|popped|blew\s+out|went\s+pop)\b/i;
const BODY_PART = /\b(shoulder|shoulders|rotator\s+cuff|labrum|knee|knees|acl|mcl|meniscus|back|spine|disc|neck|hip|hips|ankle|ankles|wrist|wrists|elbow|elbows|arm|arms|leg|legs|foot|feet|hand|hands|rib|ribs|collarbone|clavicle|hamstring|hamstrings|quad|quads|calf|calves|groin|achilles|bicep|biceps|tricep|triceps|pec|pecs|chest|glute|glutes|femur|tibia|fibula|humerus|tendon|ligament|muscle|hammy|hammies|lat|lats|oblique|obliques|adductor|adductors|shin|shins|trap|traps)\b/i;
const WORDS = String.raw `(?:[\w'-]+\s+){0,4}`;
const DAMAGE_NEAR_BODY = new RegExp(String.raw `\b(?:${AMBIGUOUS_DAMAGE.source.slice(3, -3)})\s+${WORDS}(?:${BODY_PART.source.slice(3, -3)})\b` +
    `|` +
    String.raw `\b(?:${BODY_PART.source.slice(3, -3)})\s+${WORDS}(?:${AMBIGUOUS_DAMAGE.source.slice(3, -3)})\b`, 'i');
export const SEEKING_ADVICE = /\b(what('?s| is)\s+wrong|why\s+does\s+(it|my)|should\s+i\s+(see\s+(a|someone|somebody|the|my)|go\s+to\s+(a|the)\s+(doctor|er|hospital|clinic)|worry|rest\s+(it|my|this|that)\b|stop\s+(training|lifting|running)\s+(on|with|because)|ice|stretch\s+(it|my|this|that)\b)|is\s+(it|this|that)\s+(ok|okay|serious|bad|normal|fine)(?!\s+(to|if|for)\b)|do\s+i\s+need\s+(a\s+(brace|scan|doctor|cast|splint|x[-\s]?ray|mri)|to\s+(see|get\s+it\s+(checked|looked\s+at)))|how\s+do\s+i\s+(fix|heal|treat|rehab)\s+(it|this|that|my)\b|diagnos\w*|what\s+(should|do)\s+i\s+do\s+about|will\s+it\s+heal)\b/i;
export const DISORDERED_EATING = /\b(purg(e|es|ed|ing)|(throw(ing|n)?|threw)\s+up\s+after\s+(i\s+eat|eating|meals?|food)|make\s+myself\s+(throw\s+up|sick|puke)|starv(e|ing)\s+myself|laxatives?\s+(to|for)\s+(lose|drop|cut)|(eat|eating)\s+(only\s+)?([1-7]\d{2}|[1-9]\d)\s+cal\w*\b(?!\s+(of|before|pre|after|post|for\s+(breakfast|lunch|dinner|a\s+snack)))|stop(ped)?\s+eating\s+(to|so)\b|(vomit\w*|puk(e|es|ed|ing)|barf\w*|(throw(s|ing|n)?|threw)\s+up)\s+(\w+\s+){0,3}(after|when)\s+(i\s+)?(eat\w*|ate|meals?|food|dinner|lunch|breakfast|snacks?|bing\w*)|(vomit\w*|puk(e|es|ed|ing)|sick|(throw(s|ing|n)?|threw)\s+up)\s+(\w+\s+){0,4}on\s+purpose|self[-\s]induced\s+vomit\w*)/i;
export const EATING_DISORDER_NAMED = /\b(anorexi\w*|anorectic|bulimi\w*|eating\s+disorder\w*|binge[-\s]eating|arfid|orthorexi\w*|ednos)\b/i;
const RECOVERY = /\b(recover(y|ing|ed)|in\s+treatment|my\s+(therapist|treatment\s+team))\b/i;
export const DIET_DRUG = /\b(appetite\s+(suppress\w*|blocker\w*|killer\w*)|fat[-\s]?burners?|diet\s+(pills?|drugs?|tea)|slimming\s+(pills?|tea|drops)|weight[-\s]?loss\s+(pills?|drugs?|meds?|medications?|injections?|shots?|tea|supplements?)|phentermine|adipex|qsymia|contrave|orlistat|xenical|clenbuterol|clen|dnp|ephedrine|ephedra|garcinia|hydroxycut|lipozene|sibutramine)\b/i;
export const MEDICAL_CONTEXT = /\b(pregnan\w*|postpartum|post-partum|breastfeed\w*|breast-feed\w*|c-?section|miscarriage|epilep\w*|diabet\w*|insulin|heart\s+(condition|disease|murmur|attack|problem|issue)s?|arrhythmia|a-?fib|pacemaker|blood\s+pressure|hypertension|asthma|copd|cancer|chemo\w*|osteopor\w*|arthritis|ssris?|antidepressant\w*|medications?|prescription|cortisone|steroid\s+shot|kidney\s+(disease|stones?|failure|function|problems?|issues?|condition|transplant|damage|infection)|ckd|liver\s+(disease|condition)|hernia|cleared\s+(me|by)|got\s+clearance|ibuprofen|advil|motrin|nurofen|aleve|naproxen|tylenol|acetaminophen|paracetamol|panadol|aspirin|nsaids?|pain\s?killers?|pain\s+(meds?|relievers?|pills?)|muscle\s+relaxants?|antihistamines?|benadryl|antibiotics?|anti[-\s]?inflammatories|anti[-\s]?inflammatory\s+(meds?|medications?|pills?|drugs?)|lactating|lactation|breast\s*milk|milk\s+supply|pumping\s+(breast\s*)?milk|(i'?m|i\s+am|im|currently|still|been|while|when|and)\s+(\w+\s+)?nursing\b(?!\s+(a|an|my|the|this|that|his|her|student|school|home|degree|shift|job|injur\w*|hangover))|nursing\s+((a|my|the|our)\s+)?(mom|mother|mum|baby|son|daughter|newborn|infant|twins))\b/i;
export const NUTRITION_MEDICAL = /\b(thyroid|hypothyroid\w*|hyperthyroid\w*|hashimoto\w*|cholesterol|statins?|a1c|pre-?diabet\w*|ibs|irritable\s+bowel|crohn'?s?|colitis|gerd|acid\s+reflux|gout|celiac|coeliac|pcos|polycystic|ozempic|wegovy|mounjaro|zepbound|semaglutide|tirzepatide|glp-?1|metformin|blood\s*work|lab\s+(results?|work)|blood\s+tests?|blood\s+thinners?|warfarin|eliquis|gastric\s+(sleeve|bypass|band)|bariatric|lap[-\s]?band|anemi\w*|anaemi\w*|iron\s+deficien\w*|t[12]d|type\s*[-]?\s*(1|2|one|two|i|ii)\s+diabet\w*|(i\s+have|i'?ve\s+got|i'?m|im|i\s+am|with|living\s+with|as\s+a)\s+(a\s+)?type\s*[-]?\s*(1|2|one|two|i|ii)\b(?!\s*(and\s+type\s*\w+\s+)?(muscle|fib\w*|fibre\w*|fun|personality|error))|blood\s*(sugar|glucose)|glucose\s+(levels?|monitor\w*|spikes?|readings?)|cgm|insulin\s+resist\w*|(am\s+i|could\s+i\s+be|do\s+i\s+have|i\s+think\s+i'?m|i\s+think\s+i\s+(am|have)|think\s+i'?m)\s+(\w+\s+){0,2}(lactose\s+intolerant|gluten\s+intolerant|intolerant|allergic|celiac|an?\s+(food\s+)?allergy))\b/i;
export const RESTRICTION = /\b((water|dry|juice|bone\s+broth)\s+fast\w*|(juice\s+)?cleanse\w*|detox\w*|lowest\s+(calories|cals?|possible)|as\s+(few|little|low)\s+(calories|cals?\s+)?as\s+possible|(?<![\d,.])([1-9]\d{2}|1,?[01]\d{2})\s*(cal\w*|kcals?)\s*((a|per|each)\s+day|\/\s*(day|d)\b|daily)|(?<![\d,.])([1-9]\d{2}|1,?[01]\d{2})\s*(cal\w*|kcals?)\s+(or\s+(less|under|below)\s+)?(a|per|each)\s+day|(target|goal|calories|cals?)\s+(to|at|of)\s+([1-9]\d{2}|1,?[01]\d{2})\b(?!\s*(protein|carbs?|g\b|grams?))|(only|just)\s+(eat(ing)?|consum\w*)\s+(?<![\d,.])([1-9]\d{2}|1,?[01]\d{2}|[1-9]\d)\s*(cal\w*|kcals?)\b(?!\s+(of|before|pre|after|post|for\s+(breakfast|lunch|dinner|a\s+snack)|in\b|more|left|remaining|over|under|to\s+(go|spare|work|spend)))|(eat|eating|ate|consume|consuming)\s+(only|just|under|less\s+than|below)\s+(?<![\d,.])([1-9]\d{2}|1,?[01]\d{2}|[1-9]\d)\s*(cal\w*|kcals?)\b(?!\s+(of|before|pre|after|post|for\s+(breakfast|lunch|dinner|a\s+snack)))|binge\w*\s+(and|then)\s+(then\s+)?(don'?t|not|stop|skip|starve|fast|purge|restrict)|(haven'?t|have\s+not|didn'?t|did\s+not|not)\s+eaten?\s+(anything\s+)?(in|for)\s+(\d+|a\s+few|two|three|four|several)\s+days|(cut|lose|drop)\s+(\d{2,}|[5-9])\s*(lbs?|pounds|kg|kilos?)\s+(in|by|within)\s+(a|one|1|2|two|3|three|a\s+few)\s+(week|days?)|(fasting|fasted|fast\s+for|without\s+(eating|food|any\s+food)|no\s+food|not\s+eat(ing)?|stop\s+eating|skip(ping)?\s+(eating|food|all\s+meals))\s+(for\s+)?((\d+|a|one|two|three|four|five|six|seven|a\s+few|a\s+couple(\s+of)?|several|multiple)[-\s]*(days?|weeks?)|(2[4-9]|[3-9]\d|\d{3})[-\s]*(hours?|hrs?|h)|(a\s+)?(whole|full|entire)\s+(day|week))\b|((\d+|a|one|two|three|four|five|six|seven|a\s+few|a\s+couple(\s+of)?|several|multiple)[-\s]*(days?|weeks?)|(2[4-9]|[3-9]\d|\d{3})[-\s]*(hours?|hrs?|h)|(a\s+)?(whole|full|entire)\s+(day|week))\s+(fast(s|ing)?|without\s+(eating|food|any\s+food)|of\s+(fasting|no\s+food|not\s+eating)|no\s+food)|laxatives?|diuretics?|water\s+pills|(feel|felt|feeling)\s+(so\s+)?(fat|disgusting|gross|ashamed|guilty)(\s+(and|&)\s+\w+)?\s+(after|when)\s+(i\s+)?(eat|eating|ate))\b/i;
const CRASH_CUT = /\b(cut|cutting|lose|losing|drop|dropping|shed|shedding|burn\s+off)\s+(\d+(?:\.\d+)?)\s*(lbs?|pounds?|kgs?|kilos?|kilograms?)\s+(?:of\s+\w+\s+)?(?:in|by|within|over|inside)\s+(?:the\s+next\s+|less\s+than\s+|under\s+)?(a|an|one|two|three|four|five|six|a\s+few|a\s+couple(?:\s+of)?|\d+)\s*(days?|weeks?|wks?|months?)\b/i;
const WORD_N: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
export function isCrashCut(text: string): boolean {
    const m = CRASH_CUT.exec(text);
    if (!m)
        return false;
    const lbs = Number(m[2]) * (/^k/i.test(m[3]) ? 2.2 : 1);
    const n = /^\d/.test(m[4]) ? Number(m[4]) : /few/i.test(m[4]) ? 3 : /couple/i.test(m[4]) ? 2 : (WORD_N[m[4].toLowerCase()] ?? 1);
    const weeks = /^d/i.test(m[5]) ? n / 7 : /^m/i.test(m[5]) ? n * 4.3 : n;
    return lbs >= 5 && lbs / weeks > 2.5;
}
export const MINOR_AGE = /\b((i'?m|i\s+am|im)\s+(only\s+|just\s+)?(1[0-7]|thirteen|fourteen|fifteen|sixteen|seventeen)\b(?!\s*(lbs?|pounds|kg|min|minutes|miles|reps|%|k\b|x\b|sets\b|set\s+of\b|days?|weeks?|hours?))|(my|our|a|an|the)\s+(\w+\s+)?(son|daughter|kid|kids|child|children|boy|girl|teen|teenager|stepson|stepdaughter|nephew|niece|brother|sister)(\s+(is|who'?s|turned|just\s+turned)\s+|'s\s+|\s*,\s*)(only\s+|just\s+)?([4-9]|1[0-7])\b(?!\s*(lbs?|pounds|kg|min|minutes|months?|%))|\b([4-9]|1[0-7])[-\s]?(year|yr)s?[-\s]?olds?\b|\b([4-9]|1[0-7])\s?(yo|y\/o|y\.o\.)(?=\W|$)|\b(teen|teenager|middle\s+schooler|high\s+schooler|freshman\s+in\s+high\s+school))/i;
export const MINOR_TOPIC = /\b(cut(ting)?\b(?!\s+(up|into|the|it|them|this|that|in\s+half|board|a|an|my|some|back|out|off))|(cut|cutting)\s+(\w+\s+){0,2}(weight|lbs?|pounds|kg|fat)|(lose|losing|drop|dropping)\s+(\w+\s+){0,2}(weight|lbs?|pounds|kg|fat)|diet(ing)?\b|calorie\w*|cals?\b|kcals?\b|macros?|deficit|fasting|bulk(s|ing|ed)?\b|meal\s+plan\w*|lean\s+out|shred\w*|weight\s+(loss|gain)|gain\s+(\w+\s+){0,2}(weight|lbs?|pounds|kg)|how\s+much\s+(food\s+|protein\s+)?(should|does|do|can|must)\s+([\w'-]+\s+){1,4}(eat|have)\b)/i;
export const FOOD_URGENT = /\b((lips?|tongue|face|mouth|throat)\s+(is\s+|are\s+|feels?\s+|started\s+|keeps?\s+)?(swell\w*|swollen|closing|tight(ening)?)|anaphyla\w*|epi-?pens?|allergic\s+reaction|(i'?m|i\s+am|he'?s|she'?s|they'?re|someone\s+is|is)\s+choking|chok(ed|ing)\s+on|can'?t\s+swallow|hives\s+(and|with)\s+(trouble|can'?t|hard)|(lips?|tongue|mouth|throat|face)\s+(is\s+|are\s+|feels?\s+|felt\s+|got\s+|getting\s+|started\s+|starting\s+|keeps?\s+|went\s+|gone\s+)?(\w+\s+)?(itch\w*|tingl\w*|numb|prickl\w*|burning)|(itchy|tingly|prickly)\s+(lips?|tongue|mouth|throat)|(broke\s+out\s+in|breaking\s+out\s+in|covered\s+in|got|getting|have)\s+hives)\b/i;
const TYPO_WORDS = [
    'want', 'wanna', 'hurt', 'harm', 'kill', 'killing', 'myself', 'suicide', 'suicidal', 'anymore', 'alive', 'exist', 'reason', 'bleed', 'ending',
    'blood', 'thinners', 'pressure', 'laxative', 'laxatives', 'diuretic', 'diuretics', 'pregnant', 'diabetic', 'diabetes', 'insulin',
    'cholesterol', 'ozempic', 'wegovy', 'metformin', 'thyroid', 'lactose', 'intolerant', 'breastfeeding', 'medication', 'medications',
    'eating', 'eaten', "haven't", 'fast', 'disgusting', 'starve', 'lowest', 'possible', 'days', 'calories',
];
const REAL_WORDS = new Set(['last', 'past', 'cast', 'vast', 'fats', 'feast', 'east', 'fist']);
function oneEdit(a: string, b: string): boolean {
    if (a === b)
        return true;
    if (Math.abs(a.length - b.length) > 1)
        return false;
    if (a.length === b.length) {
        const diff: number[] = [];
        for (let i = 0; i < a.length; i += 1)
            if (a[i] !== b[i])
                diff.push(i);
        if (diff.length === 1)
            return true;
        return diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]];
    }
    const [s, l] = a.length < b.length ? [a, b] : [b, a];
    for (let i = 0; i < l.length; i += 1)
        if (l.slice(0, i) + l.slice(i + 1) === s)
            return true;
    return false;
}
export function correctedForStops(text: string): string | null {
    const lower = text.toLowerCase();
    const fixed = lower.replace(/[a-z']+/g, (w) => (w.length < 4 || REAL_WORDS.has(w) ? w : TYPO_WORDS.find((c) => oneEdit(w, c)) ?? w));
    return fixed === lower ? null : fixed;
}
const SENSATION = String.raw `(crack\w*|pop|pops|popping|click\w*|grind\w*|clunk\w*|crunch\w*)`;
const SYMPTOM_QUESTION_SOURCE = () => String.raw `\b${SENSATION}\s+${WORDS}(?:${BODY_PART.source.slice(3, -3)})\b|\b(?:${BODY_PART.source.slice(3, -3)})\s+${WORDS}${SENSATION}\b|\bis\s+(it|this|that)\s+(bad|normal|ok|okay|safe|dangerous|fine)\b[^.?!]{0,40}\bmy\s+(?:${BODY_PART.source.slice(3, -3)})\b`;
export const DOSE = /(\b\d+(\.\d+)?\s*(mg|mcg|milligrams?|grams?|g|iu|scoops?)\b[^.?!]{0,30}\b(caffeine|creatine|pre-?workout|supplements?|beta-?alanine|melatonin|vitamin|ashwagandha|stims?)\b|\bhow\s+(much|many\s+(mg|milligrams|scoops))\s+(of\s+)?(caffeine|creatine|pre-?workout|melatonin|beta-?alanine|ashwagandha|vitamin\s*d?)\b|\b(caffeine|creatine|pre-?workout|melatonin)\s+(dose|dosage|dosing)\b|\b\d+\s*(pills?|tablets?|capsules?|caplets?|softgels?)\b)/i;
const SYMPTOM_QUESTION = new RegExp(SYMPTOM_QUESTION_SOURCE(), 'i');
export const mentionsDiscomfort = (text: string): boolean => /\b(hurt\w*|pain\w*|ach(e|es|ing|y)|sore\w*|injur\w*|tweak(ed|ing)?|strain\w*|niggl\w*|uncomfortable|discomfort|stiff\w*|flare[-\s]?up|twinge)\b/i.test(text ?? '');
export type MedicalRoute = 'clear' | 'crisis' | 'urgent' | 'care' | 'acute' | 'advice';
export function medicalRoute(text: string): MedicalRoute {
    const t = (text ?? '').replace(/[\u2018\u2019\u02bc]/g, "'").trim();
    if (!t)
        return 'clear';
    const r = routeOnce(t);
    if (r !== 'clear')
        return r;
    const fixed = correctedForStops(t);
    return fixed ? routeOnce(fixed) : 'clear';
}
const FOODISH = /\b(eat|eating|ate|food|meal|breakfast|lunch|dinner|snack\w*|recipe|diet|protein|carbs?|sugar|calorie\w*|fruit|coffee)\b/i;
function routeOnce(t: string): MedicalRoute {
    if (CRISIS.test(t))
        return 'crisis';
    if (URGENT.test(t) || FOOD_URGENT.test(t))
        return 'urgent';
    if (DISORDERED_EATING.test(t) || RESTRICTION.test(t) || isCrashCut(t) || DIET_DRUG.test(t))
        return 'care';
    if (EATING_DISORDER_NAMED.test(t))
        return RECOVERY.test(t) ? 'advice' : 'care';
    if (MINOR_AGE.test(t) && MINOR_TOPIC.test(t))
        return 'care';
    if (DOSE.test(t))
        return 'care';
    if (ACUTE.test(t) || CONDITION.test(t))
        return 'acute';
    if (DAMAGE_NEAR_BODY.test(t))
        return 'acute';
    if (MEDICAL_CONTEXT.test(t) || NUTRITION_MEDICAL.test(t) || SYMPTOM_QUESTION.test(t))
        return 'advice';
    if (SEEKING_ADVICE.test(t) && !(FOODISH.test(t) && !BODY_PART.test(t) && !mentionsDiscomfort(t)))
        return 'advice';
    return 'clear';
}
export const stopsForMedical = (text: string): boolean => medicalRoute(text) !== 'clear';
export function withoutStoppedTurns<T extends {
    role: string;
    text: string;
}>(turns: readonly T[], stops: (text: string) => boolean = stopsForMedical): T[] {
    const kept: T[] = [];
    let answering = false;
    for (const t of turns) {
        if (t.role !== 'holt')
            answering = false;
        if (stops(t.text)) {
            if (t.role !== 'holt')
                answering = true;
            continue;
        }
        if (t.role === 'holt' && answering)
            continue;
        kept.push(t);
    }
    return kept;
}
export type ScanKind = 'dose' | 'reassurance' | 'diagnosis' | 'clinical';
export type ScanResult = {
    hit: false;
} | {
    hit: true;
    kind: ScanKind;
    match: string;
};
const SCAN_CLEAR: ScanResult = { hit: false };
const scanSrc = (re: RegExp): string => re.source;
export const CLINICAL_TERMS = /\b(valgus|varus|kyphos\w*|kyphotic|lordos\w*|lordotic|scolio\w*|hyperlordo\w*|hyperkyphos\w*|impinge\w*|spondyl\w*|stenosis|dyskines\w*|scapular\s+winging|winged\s+scapula\w*|anterior\s+pelvic\s+tilt|pelvic\s+obliquity|trendelenburg|genu\s+(valgum|varum|recurvatum)|pes\s+(planus|cavus)|hypermobil\w*|crossed\s+syndrome)\b/i;
const SCAN_DRUG = /(ibuprofen|advil|motrin|nurofen|aleve|naproxen|tylenol|acetaminophen|paracetamol|panadol|aspirin|excedrin|nsaids?|anti[-\s]?inflammatories|anti[-\s]?inflammatory\s+(pills?|tablets?|meds?|medications?|drugs?)|pain\s?killers?|pain\s+(meds?|medications?|relievers?|pills?)|codeine|tramadol|oxycodone|hydrocodone|opioids?|morphine|gabapentin|muscle\s+relaxants?|cyclobenzaprine|flexeril|prednisone|cortisone|corticosteroids?|steroids?|anabolics?|testosterone|trt|sarms?|ostarine|rad[-\s]?140|ligandrol|cardarine|mk[-\s]?677|trenbolone|tren|anavar|oxandrolone|dianabol|winstrol|deca|hgh|growth\s+hormone|bpc[-\s]?157|tb[-\s]?500|peptide\s+(therapy|injections?|cycles?)|clenbuterol|clen|dnp|ephedrine|ephedra|yohimbine|adderall|ritalin|modafinil|kratom|benadryl|diphenhydramine|zzzquil|nyquil|unisom|antihistamines?|antibiotics?|insulin|metformin|ozempic|wegovy|mounjaro|zepbound|semaglutide|tirzepatide|phentermine|laxatives?|diuretics?|water\s+pills?|sleeping\s+pills?|sleep\s+aids?|melatonin|inhalers?|epi-?pens?)/;
const SCAN_SUPPLEMENT = /(creatine|caffeine|pre[-\s]?workouts?|beta[-\s]?alanine|citrulline|arginine|bcaas?|eaas?|glutamine|hmb|ashwagandha|magnesium|zinc|zma|iron\s+(supplements?|pills?|tablets?)|vitamins?(\s+[a-k]\d{0,2})?|multivitamins?|fish\s+oil|omega[-\s]?3s?|glucosamine|chondroitin|curcumin|tongkat(\s+ali)?|fadogia|shilajit|sodium\s+bicarbonate|carnitine|cla|green\s+tea\s+extract|fat[-\s]?burners?|electrolyte\s+(tablets?|pills?|capsules?)|supplements?|stims?|stimulants?)/;
const SCAN_SUBSTANCE = `(?:${scanSrc(SCAN_DRUG)}|${scanSrc(SCAN_SUPPLEMENT)})`;
const SCAN_NUMBER = String.raw `\d+(?:[.,]\d+)?(?:\s*(?:-|${'\u2013'}|to)\s*\d+(?:[.,]\d+)?)?`;
const SCAN_COUNT = String.raw `(?:\d+|a|an|one|two|three|four|five|six|half\s+an?|a\s+couple(?:\s+of)?|a\s+few|another|some)`;
const SCAN_MEASURE = String.raw `(?:g|grams?|scoops?|servings?|tsp|teaspoons?|tbsp|tablespoons?|ml|milliliters?|millilitres?|cc|units?|doses?)`;
const SCAN_DOSE: readonly RegExp[] = [
    new RegExp(String.raw `\b${SCAN_NUMBER}\s*(?:mg|mcg|${'\u00b5'}g|ug|milligrams?|micrograms?|iu)\b`, 'i'),
    new RegExp(String.raw `\b${SCAN_COUNT}\s+(?:[\w-]+\s+)?(?:pills?|tablets?|capsules?|caplets?|softgels?|gel\s?caps?|lozenges?|puffs?|injections?|suppositor\w*)\b`, 'i'),
    new RegExp(String.raw `\b${SCAN_NUMBER}\s*${SCAN_MEASURE}\s+(?:of\s+)?(?:(?:your|the|pure|plain|a)\s+)?(?:[\w-]+\s+)?${SCAN_SUBSTANCE}\b`, 'i'),
    new RegExp(String.raw `\b${SCAN_SUBSTANCE}(?:\s*[:,(${'\u2014'}${'\u2013'}-]\s*|\s+(?:(?:at|is|of|around|about|roughly|dose|dosage|dosing|usually)\s+)*)${SCAN_NUMBER}\s*${SCAN_MEASURE}\b`, 'i'),
    new RegExp(String.raw `\b(?:a|one|two|three|half\s+a|a\s+couple\s+of)\s+(?:heaping\s+|level\s+|full\s+)?scoops?\s+of\s+${SCAN_SUBSTANCE}\b`, 'i'),
    new RegExp(String.raw `\b${SCAN_COUNT}\s+${scanSrc(SCAN_DRUG)}\b`, 'i'),
    new RegExp(String.raw `\b(?:take|taking|try|trying|pop|popping|use|using|grab|start(?:ing)?\s+(?:on|taking))\s+(?:an?\s+|some\s+|your\s+|the\s+)?${scanSrc(SCAN_DRUG)}\b`, 'i'),
    new RegExp(String.raw `\b${scanSrc(SCAN_DRUG)}\b[^.?!\n]{0,40}\b(?:every\s+\d+(?:\s*(?:-|to)\s*\d+)?\s+hours?|(?:once|twice|three\s+times)\s+(?:a|per)\s+day|daily|per\s+day|a\s+day|before\s+bed|on\s+an\s+empty\s+stomach)\b`, 'i'),
];
const SCAN_BODY = /(shoulders?|rotator\s+cuff|labrum|knees?|kneecaps?|acl|mcl|meniscus|back|lower\s+back|spine|discs?|neck|hips?|ankles?|wrists?|elbows?|arms?|legs?|foot|feet|hands?|fingers?|ribs?|collarbone|hamstrings?|quads?|calf|calves|groin|achilles|biceps?|triceps?|pecs?|chest|glutes?|shins?|traps?|lats?|obliques?|adductors?|joints?|tendons?|ligaments?|muscles?|hammy|hammies)/;
const SCAN_CONDITION = /\b(tendinitis|tendonitis|tendinopathy|tendinosis|bursitis|(osteo)?arthritis|fasciitis|plantar\s+fasci\w*|epicondyl\w*|tennis\s+elbow|golfer'?s\s+elbow|jumper'?s\s+knee|runner'?s\s+knee|shin\s+splints?|it\s?band\s+syndrome|itbs|piriformis\s+syndrome|carpal\s+tunnel|frozen\s+shoulder|adhesive\s+capsulitis|costochondritis|compartment\s+syndrome|osgood[-\s]schlatter\w*|sever'?s\s+disease|si\s+joint\s+dysfunction|sacroiliac\s+\w+|facet\s+(joint\s+)?(syndrome|irritation|arthropathy)|degenerative\s+disc|(herniated|bulging|slipped|ruptured)\s+discs?|herniat\w*|sciatica|stress\s+fractures?|fractur\w*|dislocat\w*|subluxat\w*|labral\s+tears?|slap\s+tears?|(meniscus|meniscal)\s+tears?|(acl|mcl|pcl|lcl)\s+(tears?|sprains?|injur\w*)|rotator\s+cuff\s+(tears?|injur\w*|tendin\w*|strain\w*)|torn\s+(\w+\s+)?(acl|mcl|meniscus|labrum|rotator\s+cuff|ligament|tendon|muscle|hamstring|bicep|pec|achilles|calf|quad|groin)|pulled\s+(a\s+)?(muscle|hamstring|groin|calf|quad|hammy|lat|pec)|pinched\s+nerve|nerve\s+(pain|irritation|impingement|entrapment|damage|compression)|sprain\w*|concussion\w*|whiplash|hernia\w*|rhabdo\w*|muscle\s+(knots?|spasms?|strains?|tears?|pulls?)|trigger\s+points?|overuse\s+injur\w*|repetitive\s+strain|patell\w+\s+(tendin\w*|pain\s+syndrome)|patellofemoral|chondromalacia|achilles\s+(tendin\w*|rupture|tear)|(hamstring|groin|calf|quad|lat|pec|oblique|adductor)\s+(strain|tear|pull)s?)\b/i;
const SCAN_INJURY_NOUN = String.raw `(?:strain|sprain|tear|impingement|inflammation|irritation|injur\w*|knot|spasm|nerve(?:\s+\w+)?|tendon\w*|ligament|cartilage|disc|bruise|contusion)`;
const SCAN_DIAGNOSIS: readonly RegExp[] = [
    SCAN_CONDITION,
    new RegExp(String.raw `\b(?:sounds|looks|seems|feels)\s+like\s+(?:you(?:'ve|\s+have|\s+may\s+have|\s+might\s+have)?\s+)?(?:a|an|some|your|the)?\s*(?:[\w-]+\s+){0,2}${SCAN_INJURY_NOUN}\b`, 'i'),
    new RegExp(String.raw `\b(?:sounds|looks|seems)\s+like\s+(?:you(?:'ve|\s+have)?\s+)(?:strained|pulled|tweaked|tore|torn|sprained|irritated|inflamed|aggravated|injured|bruised|pinched|impinged)\b`, 'i'),
    new RegExp(String.raw `\b(?:you(?:'ve|\s+have)?|it|that|this)\s+(?:probably|likely|might|may|could|must)\s+(?:have\s+|'ve\s+)?(?:just\s+)?(?:strained|pulled|tweaked|tore|sprained|irritated|aggravated|injured|bruised|pinched)\s+(?:it|something|that|this|(?:your|a|the)\s+(?:\w+\s+)?(?:${scanSrc(SCAN_BODY)}|nerve))\b`, 'i'),
    /\b(it|that|this|something)\s+(probably|likely|might|may|could|must)\s+be\s+(just\s+)?(strained|torn|sprained|irritated|inflamed|aggravated|injured|bruised|pinched|impinged)\b/i,
    new RegExp(String.raw `\b(?:probably|likely|possibly|most\s+likely|could\s+be|might\s+be|may\s+be|sounds\s+like)\s+(?:just\s+)?(?:a|an|some)\s+(?:[\w-]+\s+)?${SCAN_INJURY_NOUN}\b`, 'i'),
    new RegExp(String.raw `\byou(?:'ve)?\s+(?:strained|tweaked|tore|sprained|injured|aggravated|irritated)\s+(?:your|a|the)?\s*(?:\w+\s+)?${scanSrc(SCAN_BODY)}\b`, 'i'),
    /\b(classic|tell[-\s]?tale)\s+(sign|symptom)s?\s+of\b/i,
    new RegExp(String.raw `\b(?:signs?|symptoms?)\s+of\s+(?:a|an)?\s*(?:\w+\s+)?(?:${SCAN_INJURY_NOUN}|condition|disorder|infection|syndrome)\b`, 'i'),
    new RegExp(String.raw `\b(?:is\s+)?caused\s+by\s+(?:a|an|your)?\s*(?:\w+\s+)?(?:${SCAN_INJURY_NOUN}|joint)\b`, 'i'),
];
const SCAN_REASSURE_HARD = /\b(red\s+flags?|harmless|benign|(probably|likely|almost\s+certainly|most\s+likely)\s+nothing\b|(it'?s|that'?s|probably|likely|just)\s+(just\s+)?(gas|trapped\s+wind|indigestion|heartburn|a\s+stitch|a\s+side\s+stitch)\b|(go(es)?\s+away|clear(s)?\s+up|settle(s)?\s+down|heal(s)?|resolve(s)?|sort(s)?\s+(it)?self\s+out|fix(es)?\s+itself)\s+(on\s+its\s+own|by\s+itself|itself|with\s+(time|rest))|(no|don'?t|do\s+not|won'?t|wouldn'?t)\s+(really\s+)?need\s+(to\s+(see|go\s+to|call|bother\s+with)\s+)?(an?|the|your)\s+(doctor|physio\w*|gp|physical\s+therapist|specialist|er|emergency\s+room|hospital)|(no\s+need|nothing)\s+to\s+(see|call)\s+(an?|the|your)\s+(doctor|physio\w*|gp)|(it|that|this)\s+shouldn'?t\s+(hurt|be\s+painful|cause\s+(any\s+)?pain)|(that'?s|it'?s|this\s+is|isn'?t|is\s+not)\s+(not\s+)?an\s+injury)\b/i;
const SCAN_REASSURE_SOFT = /\b(((completely|perfectly|totally|pretty|very|quite|super|fairly|entirely)\s+)?normal|common|(to\s+be\s+)?expected|expect\s+(some|a\s+(bit|little)\s+of|to\s+(feel|be))|typical(ly)?|natural|(probably|usually|generally|likely|should\s+be|will\s+be|'ll\s+be|be|is|'s|are|'re|feels?|looks?|seems?|sounds?)\s+(totally\s+|completely\s+|perfectly\s+|probably\s+|usually\s+|just\s+)?(fine|ok|okay|alright|all\s+right|nothing)|nothing\s+(serious|major|to\s+(worry|be\s+(worried|concerned))\s+about)|no\s+(need\s+to\s+)?worr(y|ies)|don'?t\s+worry|not\s+(a\s+|any\s+)?(big\s+deal|concern|worry|problem|issue)|nothing\s+to\s+(fret|stress)\s+about|(not|isn'?t|aren'?t)\s+serious|part\s+of\s+(the\s+process|training|it|lifting|getting\s+(stronger|fitter))|(will|should|'ll|usually|tends\s+to)\s+(pass|fade|ease(\s+off)?|settle(\s+down)?|go\s+away|wear\s+off|calm\s+down|be\s+gone|subside|disappear)|(goes|go|went)\s+away|wears?\s+off|(it'?s|that'?s|this\s+is)\s+(just|only|simply)|just\s+(your\s+)?(body|muscles?)\s+(adapting|adjusting|recovering|getting\s+used))\b/i;
const SCAN_SYMPTOM = new RegExp(String.raw `\b(?:pain(?:s|ful|fully)?|hurt\w*(?!\s+(?:to\b|your\s+(?:progress|gains|chances|numbers)))|ach(?:e|es|ed|ing|y)|sore\w*|doms|stiff(?:ness|er)?\b(?!-leg|\s+leg(?:ged)?\s+(?:dead|rdl|good))|tightness|cramp\w*|spasm\w*|twinge\w*|tweaked|strained|sprain\w*|swell\w*|swollen|bruis\w*|numb(?!er)\w*|tingl\w*|pins\s+and\s+needles|dizz\w*|light[-\s]?headed\w*|faint\w*|wooz\w*|nause\w*|(?:feel|feels|feeling|felt)\s+(?:a\s+bit\s+|kind\s+of\s+|really\s+|so\s+)?(?:sick|ill|unwell|faint)|queas\w*|vomit\w*|throw(?:ing)?\s+up|threw\s+up|puk(?:e|ed|ing)|headaches?|migraines?|palpitations?|heart\s+(?:is\s+)?(?:racing|pounding|skipping|fluttering)|racing\s+heart|chest\s+(?:pain|tightness|pressure)|tight\s+chest|short(?:ness)?\s+of\s+breath|breathless\w*|burning\s+sensation|shooting\s+(?:pain|sensation)|throbb\w*|tenderness|tender\s+to\s+(?:the\s+)?touch|inflam\w*|bleed\w*|blood\s+in|rash\w*|itchy|itchiness|hives|shaky|trembl\w*|tremors?|injur\w*|discomfort|uncomfortable|niggl\w*|flare[-\s]?ups?|symptoms?)\b` +
    '|' +
    String.raw `\b(?:crack\w*|pop(?:s|ping|ped)?|click\w*|grind\w*|clunk\w*|crunch\w*|burn(?:s|ing)?)\s+(?:in|from|of|at|around)\s+(?:the\s+|your\s+|my\s+|their\s+)?(?:[\w'-]+\s+)?${scanSrc(SCAN_BODY)}\b` +
    '|' +
    String.raw `\b(?:tight|weird|funny)\s+(?:[\w'-]+\s+)?${scanSrc(SCAN_BODY)}\b` +
    '|' +
    String.raw `\b${scanSrc(SCAN_BODY)}\s+(?:[\w'-]+\s+){0,3}(?:crack\w*|pop(?:s|ping|ped)?|click\w*|grind\w*|clunk\w*|crunch\w*|tight|weird|funny|burn(?:s|ing)?)\b`, 'i');
const SCAN_POINTS_BACK = /^(that'?s|that\s+is|it'?s|it\s+is|this\s+is|totally|completely|perfectly|very|pretty|quite|nothing|don'?t\s+worry|no\s+worries|normal|common|happens|yep|yeah|yes|sure|fine|all\s+normal)\b/i;
function scanSentences(text: string): string[] {
    return text
        .split(/(?<=[.!?\u2026])\s+|\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
}
const scanWords = (s: string): number => s.split(/\s+/).filter(Boolean).length;
const scanNormal = (text: string): string => text.replace(/[\u2018\u2019\u02bc`\u00b4]/g, "'").replace(/[\u201c\u201d]/g, '"');
const scanIdiomsOut = (text: string): string => text
    .replace(/\b(?:won'?t|wouldn'?t|doesn'?t|didn'?t|can'?t|couldn'?t|never|not)\s+hurt\b/gi, ' ')
    .replace(/\b(?:(?:band|pvc|stick|dowel)[-\s]+)?shoulder[-\s]+dislocates?\b/gi, 'shoulder pass-throughs');
const scanHasSymptom = (s: string): boolean => SCAN_SYMPTOM.test(s);
function scanReassurance(text: string, asked: string): string | null {
    const hard = SCAN_REASSURE_HARD.exec(text);
    if (hard)
        return hard[0];
    const said = scanSentences(text);
    const askedSymptom = !!asked && scanHasSymptom(asked);
    for (let i = 0; i < said.length; i += 1) {
        const soft = SCAN_REASSURE_SOFT.exec(said[i]);
        if (!soft)
            continue;
        if (scanHasSymptom(said[i]))
            return soft[0];
        const pointsBack = SCAN_POINTS_BACK.test(said[i]) || scanWords(said[i]) <= 4;
        if (!pointsBack)
            continue;
        if (askedSymptom)
            return soft[0];
        if ((i > 0 && scanHasSymptom(said[i - 1])) || (i + 1 < said.length && scanHasSymptom(said[i + 1])))
            return soft[0];
    }
    return null;
}
export function scanReply(text: string, asked?: string | null): ScanResult {
    const t = scanIdiomsOut(scanNormal(typeof text === 'string' ? text : '')).trim();
    if (!t)
        return SCAN_CLEAR;
    for (const re of SCAN_DOSE) {
        const m = re.exec(t);
        if (m)
            return { hit: true, kind: 'dose', match: m[0] };
    }
    for (const re of SCAN_DIAGNOSIS) {
        const m = re.exec(t);
        if (m)
            return { hit: true, kind: 'diagnosis', match: m[0] };
    }
    const clinical = CLINICAL_TERMS.exec(t);
    if (clinical)
        return { hit: true, kind: 'clinical', match: clinical[0] };
    const reassured = scanReassurance(t, scanIdiomsOut(scanNormal(typeof asked === 'string' ? asked : '')));
    if (reassured)
        return { hit: true, kind: 'reassurance', match: reassured };
    return SCAN_CLEAR;
}
export function scanTexts(texts: readonly unknown[], asked?: string | null): ScanResult {
    for (const x of texts) {
        if (typeof x !== 'string')
            continue;
        const r = scanReply(x, asked);
        if (r.hit)
            return r;
    }
    return SCAN_CLEAR;
}
export function scanStringsOf(value: unknown, max = 200): string[] {
    const out: string[] = [];
    const walk = (v: unknown, depth: number) => {
        if (out.length >= max || depth > 6)
            return;
        if (typeof v === 'string')
            out.push(v);
        else if (Array.isArray(v))
            for (const x of v)
                walk(x, depth + 1);
        else if (v && typeof v === 'object')
            for (const x of Object.values(v as Record<string, unknown>))
                walk(x, depth + 1);
    };
    walk(value, 0);
    return out;
}
export const KITCHEN_FOODS = "all-purpose flour; almonds; apple; avocado; avocado oil; baby spinach; baking powder; balsamic vinegar; banana; beef jerky; black beans; black pepper; blueberries; bok choy; brioche burger bun; broccoli florets; brown or green lentils; brown rice cakes; brown sugar; bulgur; butter; butternut squash; cabbage; canned tomatoes; capers; carrot; cheddar; chia seeds; chicken breast; chicken thighs; chickpeas; chilli flakes; chilli powder; cider vinegar; coconut milk; cod fillet; cottage cheese; cream cheese; cucumber; cumin; curry powder; dried oregano; dried parsley; dry-roasted peanuts; edamame; egg whites; eggs; extra-lean ground beef; feta; firm tofu; flour tortilla; fresh cilantro; fresh ginger; fresh mint; fresh parsley; garlic; garlic powder; granola; grapes; greek yogurt; green beans; ground cinnamon; ground turkey; halloumi; honey; hot sauce; hummus; italian herbs; kale; kidney beans; lean ground beef; lemon juice; light butter; light cream cheese; light mayonnaise; long-grain white rice; low-carb bagel; low-carb mini wrap; low-carb tortilla; mango; marshmallow creme; milk; milk chocolate; mini chocolate chips; mushrooms; olive oil; onion; onion powder; orange; orzo or pasta; parmesan; part-skim mozzarella; peach; peanut butter; pearl barley; pepperoni; pita; pizza sauce; plain bagel; plain yogurt; pork tenderloin; potatoes; quinoa; raisins; raw prawns; red bell pepper; reduced-calorie barbecue sauce; reduced-fat american cheese; reduced-fat cheddar; reduced-fat peanut butter; rice milk; rocket; rolled oats; salmon fillet; salsa; salt; sesame seeds; sirloin steak; sliced turkey breast; smoked paprika; smoked salmon; sour cream; soy sauce; spaghetti; strawberries; sun-dried tomatoes in oil; sweet potato; tahini; teriyaki sauce; tomato paste; tomatoes; tuna in water; turkey bacon; turkey pepperoni; turkey sausage; unsweetened applesauce; vanilla extract; vegetable broth; wheat noodles; whey protein powder; white beans; whole-wheat bread";
export type SettleOutcome = 'ok' | 'upstream_error' | 'upstream_unreachable' | 'timeout' | 'refusal' | 'truncated' | 'not_a_program' | 'unreadable' | 'bad_output' | 'cancelled' | 'guarded';
export const UPSTREAM_ABORT_MS: Readonly<Record<string, number>> = {
    'meal-photo-read': 75000,
    'recipe-photo-read': 75000,
    'program-photo-read': 75000,
    'workout-card-read': 75000,
    'coach-form-check': 75000,
    'coach-kitchen': 45000,
    'coach-interpret': 45000,
    'workout-tidy': 45000,
    'coach-author': 25000,
};
export interface ModelUsage {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
}
export interface ModelPayload {
    content?: {
        type: string;
        text: string;
    }[];
    stop_reason?: string;
    model?: string;
    usage?: ModelUsage;
}
export type ModelCall = {
    kind: 'ok';
    payload: ModelPayload;
    latencyMs: number;
} | {
    kind: 'upstream_error';
    status: number;
    latencyMs: number;
} | {
    kind: 'upstream_unreachable';
    latencyMs: number;
} | {
    kind: 'timeout';
    latencyMs: number;
};
export type MeterReserve = {
    ok: true;
    id: string;
    credits: number;
    remaining: number;
    allowance: number;
    ageYears: number | null;
    minor: boolean;
} | {
    ok: false;
    reason: 'not_entitled' | 'no_consent' | 'out_of_credits' | 'meter_unavailable';
    remaining: number;
    allowance: number;
};
export interface Settled {
    settled: boolean;
    refunded: boolean;
    remaining: number | null;
}
export interface CallFacts {
    model: string;
    usage?: ModelUsage | null;
    latencyMs?: number | null;
}
const meterInt = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);
export function reserveFrom(data: unknown, error: unknown): MeterReserve {
    if (error || !data || typeof data !== 'object')
        return { ok: false, reason: 'meter_unavailable', remaining: 0, allowance: 0 };
    const d = data as Record<string, unknown>;
    if (d.allowed === true) {
        if (typeof d.reservation_id !== 'string' || !d.reservation_id)
            return { ok: false, reason: 'meter_unavailable', remaining: 0, allowance: 0 };
        return {
            ok: true,
            id: d.reservation_id,
            credits: meterInt(d.credits_spent),
            remaining: meterInt(d.remaining),
            allowance: meterInt(d.allowance),
            ageYears: typeof d.age_years === 'number' && Number.isFinite(d.age_years) ? d.age_years : null,
            minor: d.minor === true,
        };
    }
    const reason = d.reason === 'not_entitled' || d.reason === 'no_consent' ? d.reason : 'out_of_credits';
    return { ok: false, reason, remaining: meterInt(d.remaining), allowance: meterInt(d.allowance) };
}
export async function timedModelCall(send: (signal: AbortSignal) => Promise<Response>, abortMs: number): Promise<ModelCall> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, Math.max(0, abortMs));
    const started = Date.now();
    const took = () => Date.now() - started;
    try {
        const response = await send(controller.signal);
        if (!response.ok) {
            const said = await response.text().catch(() => '');
            console.error('anthropic', response.status, said.slice(0, 800));
            return { kind: 'upstream_error', status: response.status, latencyMs: took() };
        }
        try {
            return { kind: 'ok', payload: (await response.json()) as ModelPayload, latencyMs: took() };
        }
        catch {
            return timedOut ? { kind: 'timeout', latencyMs: took() } : { kind: 'upstream_error', status: response.status, latencyMs: took() };
        }
    }
    catch {
        return timedOut ? { kind: 'timeout', latencyMs: took() } : { kind: 'upstream_unreachable', latencyMs: took() };
    }
    finally {
        clearTimeout(timer);
    }
}
export function failedCallReply(kind: 'upstream_error' | 'upstream_unreachable' | 'timeout'): {
    reason: 'upstream_error' | 'upstream_unreachable';
    upstream?: 'timeout';
} {
    if (kind === 'timeout')
        return { reason: 'upstream_error', upstream: 'timeout' };
    return { reason: kind };
}
export function callFacts(call: ModelCall, fallbackModel: string): CallFacts {
    if (call.kind !== 'ok')
        return { model: fallbackModel, usage: null, latencyMs: call.latencyMs };
    return {
        model: typeof call.payload.model === 'string' && call.payload.model ? call.payload.model : fallbackModel,
        usage: call.payload.usage ?? null,
        latencyMs: call.latencyMs,
    };
}
export function settleArgs(reservation: string, outcome: SettleOutcome, facts: CallFacts): Record<string, unknown> {
    const u = facts.usage ?? {};
    return {
        p_reservation: reservation,
        p_outcome: outcome,
        p_model: facts.model,
        p_input_tokens: meterInt(u.input_tokens),
        p_output_tokens: meterInt(u.output_tokens),
        p_cache_read_input_tokens: meterInt(u.cache_read_input_tokens),
        p_cache_creation_input_tokens: meterInt(u.cache_creation_input_tokens),
        p_latency_ms: facts.latencyMs == null ? null : meterInt(facts.latencyMs),
        p_refund: outcome !== 'ok',
    };
}
export function settledFrom(data: unknown, error: unknown): Settled {
    if (error || !data || typeof data !== 'object')
        return { settled: false, refunded: false, remaining: null };
    const d = data as Record<string, unknown>;
    return {
        settled: d.settled === true,
        refunded: d.settled === true && d.refunded === true,
        remaining: typeof d.remaining === 'number' && Number.isFinite(d.remaining) ? d.remaining : null,
    };
}
export function settledTail(s: Settled, reservedRemaining: number): {
    remaining: number;
    refunded?: true;
} {
    const remaining = s.remaining ?? reservedRemaining;
    return s.refunded ? { remaining, refunded: true } : { remaining };
}
export function ageLine(ageYears: number | null, minor: boolean): string | null {
    if (minor) {
        const age = ageYears != null && ageYears <= 18 ? `${ageYears}, under 18` : 'under 18';
        return `Athlete's age, from their profile: ${age}. Keep every suggestion conservative and right for supervised training: no maximal-effort sets or max attempts, and nothing about losing weight.`;
    }
    return ageYears == null ? null : `Athlete's age, from their profile: ${ageYears}.`;
}
export function withAgeLine(turn: string, ageYears: number | null, minor: boolean): string {
    const line = ageLine(ageYears, minor);
    return line ? `${turn}\n\n${line}` : turn;
}
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const FN = 'coach-kitchen';
const MODEL = 'claude-sonnet-5';
const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const SYSTEM = `You are Coach Holt in the kitchen, in the Forge Legacy training and nutrition app. An athlete has told you what food they have, or asked what to make, and you come up with dishes they can cook. You write the dish; the app does the numbers.

# Your entire job

Write exactly the number of options asked for, as JSON in the fixed shape. Each option is a real, cookable home dish built mostly from what they have on hand, plus ordinary pantry staples (oil, salt, pepper, dried spices, garlic, onion, stock, vinegar, soy sauce or hot sauce) when a dish needs them. Never build a dish around something they did not list and that is not a staple.

# Make the options different on purpose

- Every option uses a different cooking method ("pan", "oven", "no-cook", "bowl", "pot", "grill", "air-fryer", "microwave").
- At least two options are from different cuisines. When the message says what to lean toward, use it for one option if it fits what they have.
- Never repeat, or lightly rename, a dish listed as already suggested. "Greek Chicken Bowl" and "Mediterranean Chicken Rice Bowl" are the same dish.
- Plain, appetizing names a person would say out loud: "Crispy Chicken Fried Rice", "Spinach and Feta Egg Scramble". No brand names. At most 45 characters.

# The fields

- "name": the dish.
- "why": one short line on why this one, in Holt's voice \u2014 "uses the most of what you have", "fastest of the three", "closest to your protein for the day", "no stove needed". Never a number.
- "cuisine": one or two words ("Mexican", "Korean", "American").
- "method": one of the methods above.
- "minutes": realistic total time, prep plus cook.
- "servings": how many servings the amounts make. Usually 1 or 2; the household size only if they said it.
- "mealType": "breakfast", "lunch", "dinner" or "snacks", or "unknown".
- "ingredients": one entry per ingredient, like a printed recipe.
  - "text": the line as a recipe would print it ("6 oz boneless chicken thighs, sliced").
  - "quantity": the amount as a number, or null for "to taste".
  - "unit": "g" (see Amounts); "large" for eggs; "" when the quantity is null.
  - "food": the food, without amount, unit, brand or preparation. **Use one of the app's food names below, written exactly, whenever one fits** \u2014 "rice" is "white rice" or "brown rice", "spinach" is "baby spinach", "oil" is "olive oil", "beans" is "black beans". This is what the app matches to its food database; a name it doesn't know leaves the dish's numbers incomplete. Only when nothing on the list is close, write the plain food in everyday words.
- "steps": 3 to 8 short steps in plain words. Every step a home cook can follow. Include the doneness cue and the safe internal temperature whenever meat, poultry, fish or eggs are cooked (USDA: poultry 165\u00b0F, ground meat 160\u00b0F, whole cuts of beef, pork and lamb 145\u00b0F then rest 3 minutes, fish 145\u00b0F).

# Amounts

**Give every amount by weight: "quantity" in grams and "unit" "g".** The app converts grams exactly; cans, handfuls, pieces and cups often can't be converted. The "text" line can say it the way a cook would ("6 oz chicken thighs"), but "quantity" and "unit" are grams. The only exceptions: eggs are a count (quantity 2, unit "large"), and salt, pepper, dried herbs and spices used "to taste" have quantity null.

**Weigh rice, pasta, noodles, quinoa, couscous, bulgur, barley, lentils and oats DRY (uncooked)** \u2014 that is how the app's food data counts them. A serving of rice or pasta is 50 to 90 g dry; oats 40 to 60 g dry.

Real amounts for the servings you give: a portion of meat or fish is usually 110 to 225 g raw, oil 5 to 30 g for the whole dish. Never an amount no one cooks.

# The app's food names

${KITCHEN_FOODS}

# Hard rules

**Never write a nutrition number** \u2014 no calories, protein, carbs, fat or grams-of-protein, anywhere, including "why" and "steps". There is no field for them. The app calculates every number itself from the ingredients.

**A food on the "never use" line is never in any dish,** not as an ingredient, a garnish, a sauce or an option. That includes foods that contain it: peanut means no peanut butter or satay; dairy means no butter, cheese, yogurt, cream or milk; gluten means no regular pasta, bread, flour, tortillas or soy sauce (tamari is fine); shellfish means no shrimp, crab, lobster or scallops; eggs means no mayonnaise. If you are not sure whether something contains it, leave it out.

**Never mention the athlete's body, weight or intake,** and never tell them to eat less. If today's numbers are given, lean the options toward them (more protein when protein is behind) without saying so.

**No medical or diet advice.** You are a cook here. Nothing about conditions, medications, detoxes, fasting or supplements. Food only.

**Your own recipes, not someone else's.** Write every dish in your own words. Never copy a published recipe or name a recipe site.

If what they listed is too thin to make anything real from, still write the best simple options you can with pantry staples. Never return an empty list.`;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS')
        return new Response('ok', { headers: CORS });
    if (!ANTHROPIC_API_KEY)
        return json({ ok: false, reason: 'unconfigured' }, 503);
    let raw: unknown;
    try {
        raw = await req.json();
    }
    catch {
        return json({ ok: false, reason: 'bad_request' }, 400);
    }
    const request = narrowKitchenRequest(raw);
    if (!request.ask && !request.have.length)
        return json({ ok: false, reason: 'bad_request' }, 400);
    const guard = medicalRoute(`${request.ask} ${request.have.join(', ')}`.trim());
    if (guard !== 'clear') {
        const route = guard === 'crisis' || guard === 'urgent' || guard === 'care' ? guard : 'medical';
        return json({ ok: false, reason: 'stop', route });
    }
    const authorization = req.headers.get('Authorization') ?? '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authorization } } });
    const { data: mayUseNutrition, error: gateError } = await supabase.rpc('has_nutrition_access');
    if (gateError || mayUseNutrition !== true)
        return json({ ok: false, reason: 'no_nutrition' }, 403);
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const { count, error: countError } = await supabase
        .from('coach_ai_spend')
        .select('id', { count: 'exact', head: true })
        .eq('action', KITCHEN_ACTION)
        .gte('occurred_at', since.toISOString());
    if (!countError && (count ?? 0) >= KITCHEN_PER_DAY)
        return json({ ok: false, reason: 'daily_limit', limit: KITCHEN_PER_DAY }, 429);
    const { data: reservedRow, error: reserveError } = await supabase
        .rpc('coach_ai_reserve', { p_action: KITCHEN_ACTION, p_fn: FN })
        .maybeSingle();
    const meter = reserveFrom(reservedRow, reserveError);
    if (!meter.ok) {
        if (meter.reason === 'meter_unavailable')
            return json({ ok: false, reason: 'meter_unavailable' }, 503);
        if (meter.reason === 'no_consent')
            return json({ ok: false, reason: 'no_consent' }, 403);
        return json({ ok: false, reason: 'out_of_credits', remaining: meter.remaining, allowance: meter.allowance });
    }
    const settle = async (outcome: SettleOutcome, call: ModelCall) => {
        const { data, error } = await supabase.rpc('coach_ai_settle', settleArgs(meter.id, outcome, callFacts(call, MODEL))).maybeSingle();
        return settledTail(settledFrom(data, error), meter.remaining);
    };
    const minor = request.minor || meter.minor;
    const call = await timedModelCall((signal) => fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal,
        headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
            model: MODEL,
            max_tokens: KITCHEN_OUTPUT_CAP,
            thinking: { type: 'disabled' },
            output_config: { effort: 'low', format: { type: 'json_schema', schema: KITCHEN_SCHEMA } },
            system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
            messages: [{ role: 'user', content: withAgeLine(kitchenUserTurn({ ...request, minor }), meter.ageYears, minor) }],
        }),
    }), UPSTREAM_ABORT_MS[FN]);
    if (call.kind !== 'ok') {
        return json({ ok: false, ...failedCallReply(call.kind), ...(await settle(call.kind, call)) }, 503);
    }
    const payload = call.payload;
    if (payload?.stop_reason === 'refusal')
        return json({ ok: false, reason: 'none', ...(await settle('refusal', call)) });
    const text: string = (payload?.content ?? [])
        .filter((b: {
        type: string;
    }) => b.type === 'text')
        .map((b: {
        text: string;
    }) => b.text)
        .join('');
    const options = kitchenFromModelText(text, request.exclude);
    if (!options.length) {
        return json({ ok: false, reason: 'none', ...(await settle(payload?.stop_reason === 'max_tokens' ? 'truncated' : 'bad_output', call)) });
    }
    if (scanTexts(scanStringsOf(options, 400), request.ask).hit) {
        return json({ ok: false, reason: 'stop', route: 'medical', ...(await settle('guarded', call)) });
    }
    return json({ ok: true, options, ...(await settle('ok', call)) });
});
