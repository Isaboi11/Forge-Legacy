// ===============================================================================================
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
// ===============================================================================================

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
const NAME_CHARS = 40;
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
    lines.push(r.have.length ? `On hand: ${r.have.join(', ')}.` : 'On hand: not given — assume a normal pantry and ask nothing.');
    if (r.avoid.length)
        lines.push(`Hard rules — never use: ${r.avoid.join(', ')}.`);
    if (r.exclude.length)
        lines.push(`Already suggested, do not repeat or lightly rename: ${r.exclude.join('; ')}.`);
    if (r.lean)
        lines.push(`Lean toward, if it fits: ${[r.lean.cuisine, r.lean.method].filter(Boolean).join(', ')}.`);
    const nudge: Record<KitchenNudge, string> = {
        more: 'They want different ideas from the ones above.',
        quicker: 'They want quicker dishes — 15 minutes or less where possible.',
        protein: 'They want more protein — build each dish around a bigger protein portion.',
        style: 'They want a different style — new cuisines and methods from the ones above.',
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
    const name = clean(d.name, NAME_CHARS);
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
    const methods = new Set<string>();
    for (const o of Array.isArray(d.options) ? d.options : []) {
        const dish = sanitizeDish(o);
        if (!dish || banned.has(norm(dish.name)) || out.some((x) => norm(x.name) === norm(dish.name)))
            continue;
        if (methods.has(dish.method) && out.length < KITCHEN_OPTIONS)
            continue;
        methods.add(dish.method);
        out.push(dish);
        if (out.length >= KITCHEN_OPTIONS)
            break;
    }
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
    { re: /\b(chicken|turkey|duck|poultry)\b/i, line: 'Cook the poultry to 165°F inside (USDA).' },
    { re: /\bground\s+(beef|pork|lamb|veal)|\b(burger|meatballs?|sausage)\b/i, line: 'Cook ground meat to 160°F inside (USDA).' },
    { re: /\b(beef|steak|pork|lamb|veal|chops?)\b/i, line: 'Cook beef, pork or lamb to 145°F inside, then rest 3 minutes (USDA).' },
    { re: /\b(salmon|tuna steak|cod|tilapia|fish|shrimp|prawns?|scallops?)\b/i, line: 'Cook fish and shellfish to 145°F, until opaque and it flakes (USDA).' },
    { re: /\beggs?\b/i, line: 'Cook eggs until the yolk and white are firm; egg dishes to 160°F (USDA).' },
];
const NO_COOK_SAFE = /\b(canned|tinned|smoked|deli|rotisserie|cooked|leftover|jerky)\b/i;
export function withSafeTemps(d: KitchenDish): KitchenDish {
    if (d.steps.some((s) => /\d\s*°\s*F/i.test(s)))
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
export function allergensByWord(d: KitchenDish): string[] {
    const text = d.ingredients
        .map((i) => `${i.food} ${i.text}`)
        .join(' | ')
        .replace(/\b(peanut|almond|cashew|sunflower|seed|nut|apple|pumpkin|soy)\s+butter\b/gi, '$1 spread');
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
export const ACUTE = /\b(ruptur\w*|fractur\w*(?!\s+(my|the|our)\s+(schedule|week|plans?|routine|program|calendar))|surger\w*|operation|operated|post[-\s]?op|sprain\w*|dislocat\w*|physio\w*|physical\s+therap\w*|doctor|surgeon|orthopa?ed\w*|mri|x[-\s]?ray|numb\w*|tingl\w*|pinched|shooting\s+pain|swell\w*|swollen|herniat\w*|bulging\s+disc|sciatic\w*|concussion|whiplash)\b/i;
export const CRISIS = /\b(kill(ing)?\s+myself|kms|suicid\w*|end(ing)?\s+(it\s+all|my\s+life|it)\b(?!\s+(early|there|here|with|on|at))|want(ed)?\s+to\s+die|wanna\s+die|rather\s+(not\s+exist|be\s+dead)|(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+alive|exist|be\s+here\s+anymore)|hurt(ing)?\s+myself|harm(ing)?\s+myself|self[-\s]?harm\w*|cut(ting)?\s+myself|(hit|punch|punish)(ing)?\s+myself|no\s+reason\s+to\s+live|(till|until)\s+(they|it|i)\s+bleed|make\s+myself\s+bleed)\b/i;
export const URGENT = /\b(chest\s+(pain|pressure|tightness|is\s+tight|feels\s+tight|hurts)|pain\s+in\s+my\s+chest|(passed|pass(ing)?|blacked|black(ing)?)\s+out|faint(ed|ing)?\b|can'?t\s+(catch\s+my\s+)?breathe?|trouble\s+breathing|struggling\s+to\s+breathe|asthma\s+attack|heart\s+(is\s+|keeps\s+|won'?t\s+stop\s+)?(racing|pounding|skipping|fluttering)|(dark|brown|cola|tea)[-\s]colou?red\s+(pee|urine)|(pee|urine)\s+(is\s+|was\s+|looks\s+)?(dark|brown|cola|tea)\b|rhabdo\w*|worst\s+headache|severe\s+headache|thunderclap|face\s+(is\s+)?droop\w*|slurr\w*|seizure|can'?t\s+feel\s+my\s+(legs|arms|feet)|(low|crashing)\s+blood\s+sugar|hypoglyc\w*|dolor\s+de\s+pecho|duele\s+el\s+pecho|(lost|losing|lose|can'?t\s+control)\s+(my\s+)?(bladder|bowel)|throat\s+(is\s+)?(swelling|swollen|closing)|short(ness)?\s+of\s+breath|swollen\s+and\s+(hot|red)|(hot|red)\s+and\s+swollen)\b/i;
const AMBIGUOUS_DAMAGE = /\b(broke|broken|tear|tears|tearing|tore|torn|strained|strain|strains|snapped|popped|blew\s+out|went\s+pop)\b/i;
const BODY_PART = /\b(shoulder|shoulders|rotator\s+cuff|labrum|knee|knees|acl|mcl|meniscus|back|spine|disc|neck|hip|hips|ankle|ankles|wrist|wrists|elbow|elbows|arm|arms|leg|legs|foot|feet|hand|hands|rib|ribs|collarbone|clavicle|hamstring|hamstrings|quad|quads|calf|calves|groin|achilles|bicep|biceps|tricep|triceps|pec|pecs|chest|glute|glutes|femur|tibia|fibula|humerus|tendon|ligament|muscle|hammy|hammies|lat|lats|oblique|obliques|adductor|adductors|shin|shins|trap|traps)\b/i;
const WORDS = String.raw `(?:[\w'-]+\s+){0,4}`;
const DAMAGE_NEAR_BODY = new RegExp(String.raw `\b(?:${AMBIGUOUS_DAMAGE.source.slice(3, -3)})\s+${WORDS}(?:${BODY_PART.source.slice(3, -3)})\b` +
    `|` +
    String.raw `\b(?:${BODY_PART.source.slice(3, -3)})\s+${WORDS}(?:${AMBIGUOUS_DAMAGE.source.slice(3, -3)})\b`, 'i');
export const SEEKING_ADVICE = /\b(what('?s| is)\s+wrong|why\s+does\s+(it|my)|should\s+i\s+(see\s+(a|someone|somebody|the|my)|go\s+to\s+(a|the)\s+(doctor|er|hospital|clinic)|worry|rest\s+(it|my|this|that)\b|stop\s+(training|lifting|running)\s+(on|with|because)|ice|stretch\s+(it|my|this|that)\b)|is\s+(it|this|that)\s+(ok|okay|serious|bad|normal|fine)(?!\s+(to|if|for)\b)|do\s+i\s+need\s+(a\s+(brace|scan|doctor|cast|splint|x[-\s]?ray|mri)|to\s+(see|get\s+it\s+(checked|looked\s+at)))|how\s+do\s+i\s+(fix|heal|treat|rehab)\s+(it|this|that|my)\b|diagnos\w*|what\s+(should|do)\s+i\s+do\s+about|will\s+it\s+heal)\b/i;
export const DISORDERED_EATING = /\b(purg(e|es|ed|ing)|throw(ing)?\s+up\s+after\s+(i\s+eat|eating|meals?|food)|make\s+myself\s+(throw\s+up|sick|puke)|starv(e|ing)\s+myself|laxatives?\s+(to|for)\s+(lose|drop|cut)|(eat|eating)\s+(only\s+)?([1-7]\d{2}|[1-9]\d)\s+cal\w*\b(?!\s+(of|before|pre|after|post|for\s+(breakfast|lunch|dinner|a\s+snack)))|stop(ped)?\s+eating\s+(to|so)\b)/i;
export const MEDICAL_CONTEXT = /\b(pregnan\w*|postpartum|post-partum|breastfeed\w*|breast-feed\w*|c-?section|miscarriage|epilep\w*|diabet\w*|insulin|heart\s+(condition|disease|murmur|attack|problem|issue)s?|arrhythmia|a-?fib|pacemaker|blood\s+pressure|hypertension|asthma|copd|cancer|chemo\w*|osteopor\w*|arthritis|ssris?|antidepressant\w*|medications?|prescription|cortisone|steroid\s+shot|kidney\s+(disease|stones?|failure|function|problems?|issues?|condition|transplant|damage|infection)|ckd|liver\s+(disease|condition)|hernia|cleared\s+(me|by)|got\s+clearance)\b/i;
export const NUTRITION_MEDICAL = /\b(thyroid|hypothyroid\w*|hyperthyroid\w*|hashimoto\w*|cholesterol|statins?|a1c|pre-?diabet\w*|ibs|irritable\s+bowel|crohn'?s?|colitis|gerd|acid\s+reflux|gout|celiac|coeliac|pcos|polycystic|ozempic|wegovy|mounjaro|zepbound|semaglutide|tirzepatide|glp-?1|metformin|blood\s*work|lab\s+(results?|work)|blood\s+tests?|blood\s+thinners?|warfarin|eliquis|gastric\s+(sleeve|bypass|band)|bariatric|lap[-\s]?band|anemi\w*|anaemi\w*|iron\s+deficien\w*|(am\s+i|could\s+i\s+be|do\s+i\s+have|i\s+think\s+i'?m|i\s+think\s+i\s+(am|have)|think\s+i'?m)\s+(\w+\s+){0,2}(lactose\s+intolerant|gluten\s+intolerant|intolerant|allergic|celiac|an?\s+(food\s+)?allergy))\b/i;
export const RESTRICTION = /\b((water|dry|juice|bone\s+broth)\s+fast\w*|(juice\s+)?cleanse\w*|detox\w*|lowest\s+(calories|cals?|possible)|as\s+(few|little|low)\s+(calories|cals?\s+)?as\s+possible|([1-9]\d{2}|1[01]\d{2})\s*(cal\w*|kcal)\s+(a|per|each)\s+day|(target|goal|calories|cals?)\s+(to|at|of)\s+([1-9]\d{2}|1[01]\d{2})\b(?!\s*(protein|carbs?|g\b|grams?))|binge\w*\s+(and|then)\s+(then\s+)?(don'?t|not|stop|skip|starve|fast|purge|restrict)|(haven'?t|have\s+not|didn'?t|did\s+not|not)\s+eaten?\s+(anything\s+)?(in|for)\s+(\d+|a\s+few|two|three|four|several)\s+days|(cut|lose|drop)\s+(\d{2,}|[5-9])\s*(lbs?|pounds|kg|kilos?)\s+(in|by|within)\s+(a|one|1|2|two|3|three|a\s+few)\s+(week|days?)|laxatives?|diuretics?|water\s+pills|(feel|felt|feeling)\s+(so\s+)?(fat|disgusting|gross|ashamed|guilty)(\s+(and|&)\s+\w+)?\s+(after|when)\s+(i\s+)?(eat|eating|ate))\b/i;
export const MINOR_AGE = /\b(i'?m|i\s+am|im)\s+(1[0-7]|thirteen|fourteen|fifteen|sixteen|seventeen)\b(?!\s*(lbs?|pounds|kg|min|minutes|miles|reps|%))/i;
export const MINOR_TOPIC = /\b(cut(ting)?\s+(to|down|weight|\d)|(lose|losing|drop|dropping)\s+(\w+\s+){0,2}(weight|lbs?|pounds|kg|fat)|diet(ing)?\b|calorie\w*|cals?\b|macros?|deficit|fasting)/i;
export const FOOD_URGENT = /\b((lips?|tongue|face|mouth|throat)\s+(is\s+|are\s+|feels?\s+|started\s+|keeps?\s+)?(swell\w*|swollen|closing|tight(ening)?)|anaphyla\w*|epi-?pens?|allergic\s+reaction|(i'?m|i\s+am|he'?s|she'?s|they'?re|someone\s+is|is)\s+choking|chok(ed|ing)\s+on|can'?t\s+swallow|hives\s+(and|with)\s+(trouble|can'?t|hard))\b/i;
const TYPO_WORDS = [
    'want', 'wanna', 'hurt', 'harm', 'kill', 'killing', 'myself', 'suicide', 'suicidal', 'anymore', 'alive', 'exist', 'reason', 'bleed', 'ending',
    'blood', 'thinners', 'pressure', 'laxative', 'laxatives', 'diuretic', 'diuretics', 'pregnant', 'diabetic', 'diabetes', 'insulin',
    'cholesterol', 'ozempic', 'wegovy', 'metformin', 'thyroid', 'lactose', 'intolerant', 'breastfeeding', 'medication', 'medications',
    'eating', 'eaten', "haven't", 'fast', 'disgusting', 'starve', 'lowest', 'possible', 'days', 'calories',
];
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
    const fixed = lower.replace(/[a-z']+/g, (w) => (w.length < 4 ? w : TYPO_WORDS.find((c) => oneEdit(w, c)) ?? w));
    return fixed === lower ? null : fixed;
}
const SENSATION = String.raw `(crack\w*|pop|pops|popping|click\w*|grind\w*|clunk\w*|crunch\w*)`;
const SYMPTOM_QUESTION_SOURCE = () => String.raw `\b${SENSATION}\s+${WORDS}(?:${BODY_PART.source.slice(3, -3)})\b|\b(?:${BODY_PART.source.slice(3, -3)})\s+${WORDS}${SENSATION}\b|\bis\s+(it|this|that)\s+(bad|normal|ok|okay|safe|dangerous|fine)\b[^.?!]{0,40}\bmy\s+(?:${BODY_PART.source.slice(3, -3)})\b`;
export const DOSE = /(\b\d+(\.\d+)?\s*(mg|mcg|milligrams?|grams?|g|iu|scoops?)\b[^.?!]{0,30}\b(caffeine|creatine|pre-?workout|supplements?|beta-?alanine|melatonin|vitamin|ashwagandha|stims?)\b|\bhow\s+(much|many\s+(mg|milligrams|scoops))\s+(of\s+)?(caffeine|creatine|pre-?workout|melatonin|beta-?alanine|ashwagandha|vitamin\s*d?)\b|\b(caffeine|creatine|pre-?workout|melatonin)\s+(dose|dosage|dosing)\b)/i;
const SYMPTOM_QUESTION = new RegExp(SYMPTOM_QUESTION_SOURCE(), 'i');
export const mentionsDiscomfort = (text: string): boolean => /\b(hurt\w*|pain\w*|ach(e|es|ing|y)|sore\w*|injur\w*|tweak(ed|ing)?|strain\w*|niggl\w*|uncomfortable|discomfort|stiff\w*|flare[-\s]?up|twinge)\b/i.test(text ?? '');
export type MedicalRoute = 'clear' | 'crisis' | 'urgent' | 'care' | 'acute' | 'advice';
export function medicalRoute(text: string): MedicalRoute {
    const t = (text ?? '').trim();
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
    if (DISORDERED_EATING.test(t) || RESTRICTION.test(t))
        return 'care';
    if (MINOR_AGE.test(t) && MINOR_TOPIC.test(t))
        return 'care';
    if (DOSE.test(t))
        return 'care';
    if (ACUTE.test(t))
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
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
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
- Plain, appetizing names a person would say out loud: "Crispy Chicken Fried Rice", "Spinach and Feta Egg Scramble". No brand names. At most 40 characters.

# The fields

- "name": the dish.
- "why": one short line on why this one, in Holt's voice — "uses the most of what you have", "fastest of the three", "closest to your protein for the day", "no stove needed". Never a number.
- "cuisine": one or two words ("Mexican", "Korean", "American").
- "method": one of the methods above.
- "minutes": realistic total time, prep plus cook.
- "servings": how many servings the amounts make. Usually 1 or 2; the household size only if they said it.
- "mealType": "breakfast", "lunch", "dinner" or "snacks", or "unknown".
- "ingredients": one entry per ingredient, like a printed recipe.
  - "text": the line as a recipe would print it ("6 oz boneless chicken thighs, sliced").
  - "quantity": the amount as a number, or null for "to taste".
  - "unit": "g", "oz", "lb", "cup", "tbsp", "tsp", "ml", or the counting word ("large", "cloves", "slices", "can"); "" for a plain count ("2 eggs").
  - "food": the plain food in everyday words, without amount, unit, brand or preparation ("chicken thighs", "long-grain white rice", "feta"). This is what the app matches to its food database, so be plain and specific.
- "steps": 3 to 8 short steps in plain words. Every step a home cook can follow. Include the doneness cue and the safe internal temperature whenever meat, poultry, fish or eggs are cooked (USDA: poultry 165°F, ground meat 160°F, whole cuts of beef, pork and lamb 145°F then rest 3 minutes, fish 145°F).

# Amounts

Real amounts for the servings you give: a portion of protein is usually 4 to 8 oz cooked, rice or pasta about 1/2 to 1 cup cooked, oil a teaspoon to a couple of tablespoons for the whole dish. Never an amount no one cooks.

# Hard rules

**Never write a nutrition number** — no calories, protein, carbs, fat or grams-of-protein, anywhere, including "why" and "steps". There is no field for them. The app calculates every number itself from the ingredients.

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
    const { data: spend, error: spendError } = await supabase.rpc('coach_ai_spend_credits', { p_action: KITCHEN_ACTION }).maybeSingle();
    if (spendError)
        return json({ ok: false, reason: 'meter_unavailable' }, 503);
    const reserved = spend as {
        allowed: boolean;
        credits_spent: number;
        remaining: number;
        allowance: number;
    } | null;
    if (!reserved?.allowed) {
        return json({ ok: false, reason: 'out_of_credits', remaining: reserved?.remaining ?? 0, allowance: reserved?.allowance ?? 0 });
    }
    let response: Response;
    try {
        response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
            body: JSON.stringify({
                model: MODEL,
                max_tokens: KITCHEN_OUTPUT_CAP,
                thinking: { type: 'disabled' },
                output_config: { effort: 'low', format: { type: 'json_schema', schema: KITCHEN_SCHEMA } },
                system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
                messages: [{ role: 'user', content: kitchenUserTurn(request) }],
            }),
        });
    }
    catch {
        return json({ ok: false, reason: 'upstream_unreachable' }, 503);
    }
    if (!response.ok) {
        console.error('anthropic', response.status, (await response.text().catch(() => '')).slice(0, 800));
        await supabase.rpc('coach_ai_record_usage', {
            p_action: KITCHEN_ACTION, p_credits: reserved.credits_spent, p_model: MODEL,
            p_input_tokens: 0, p_output_tokens: 0, p_cache_read_input_tokens: 0, p_cache_creation_input_tokens: 0,
            p_uncharged: true,
        });
        return json({ ok: false, reason: 'upstream_error' }, 503);
    }
    const payload = await response.json();
    const usage = payload?.usage ?? {};
    await supabase.rpc('coach_ai_record_usage', {
        p_action: KITCHEN_ACTION,
        p_credits: reserved.credits_spent,
        p_model: payload?.model ?? MODEL,
        p_input_tokens: usage.input_tokens ?? 0,
        p_output_tokens: usage.output_tokens ?? 0,
        p_cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
        p_cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
        p_uncharged: false,
    });
    if (payload?.stop_reason === 'refusal')
        return json({ ok: false, reason: 'none', remaining: reserved.remaining });
    const text: string = (payload?.content ?? [])
        .filter((b: {
        type: string;
    }) => b.type === 'text')
        .map((b: {
        text: string;
    }) => b.text)
        .join('');
    const options = kitchenFromModelText(text, request.exclude);
    if (!options.length)
        return json({ ok: false, reason: 'none', remaining: reserved.remaining });
    return json({ ok: true, options, remaining: reserved.remaining });
});
