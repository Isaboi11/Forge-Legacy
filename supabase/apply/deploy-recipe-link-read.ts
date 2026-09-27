// ===============================================================================================
// DASHBOARD PASTE COPY of supabase/functions/recipe-link-read/index.ts - GENERATED, DO NOT EDIT.
//
// The real function imports src/domain/nutrition/recipe-text-read.ts, which the Supabase dashboard
// editor cannot reach. This copy inlines that module in place of its import line; nothing else differs.
// Regenerate with `node scripts/build-recipe-link-read-deploy.mjs`.
//
// Supabase dashboard -> Edge Functions -> Deploy a new function -> "Via Editor" -> name it
// recipe-link-read -> replace the editor contents with this whole file -> Deploy.
// No secrets and no migration: no model, no credit. It reads a recipe page's schema.org Recipe block.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

import { createClient } from 'jsr:@supabase/supabase-js@2';
export interface PastedIngredient {
    text: string;
    quantity: number | null;
    unit: string;
    food: string;
}
export interface PastedRecipe {
    name: string;
    servings: number | null;
    minutes: number | null;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks' | null;
    ingredients: PastedIngredient[];
    steps: string[];
}
export const MAX_PASTE_CHARS = 20000;
export const MAX_PAGE_BYTES = 3000000;
const SOCIAL = ['instagram.com', 'tiktok.com', 'facebook.com', 'fb.watch', 'youtube.com', 'youtu.be', 'threads.net', 'x.com', 'twitter.com'];
export type LinkTarget = {
    kind: 'ok';
    url: string;
} | {
    kind: 'social';
    site: string;
} | {
    kind: 'bad_url';
};
export function looksLikeLink(raw: string): boolean {
    const t = raw.trim();
    return !/\s/.test(t) && /^(https?:\/\/|www\.)[^\s/]+\.[^\s]+/i.test(t);
}
export function linkTarget(raw: string): LinkTarget {
    let t = raw.trim();
    if (/^www\./i.test(t))
        t = `https://${t}`;
    let u: URL;
    try {
        u = new URL(t);
    }
    catch {
        return { kind: 'bad_url' };
    }
    if (u.protocol !== 'https:' && u.protocol !== 'http:')
        return { kind: 'bad_url' };
    if (u.port || u.username || u.password)
        return { kind: 'bad_url' };
    const host = u.hostname.toLowerCase().replace(/\.$/, '');
    if (!host.includes('.') || host.startsWith('[') || /^[\d.]+$/.test(host) || /:/.test(host))
        return { kind: 'bad_url' };
    if (/(^|\.)(localhost|local|internal|localdomain|home|lan|arpa)$/.test(host))
        return { kind: 'bad_url' };
    const social = SOCIAL.find((s) => host === s || host.endsWith(`.${s}`));
    if (social)
        return { kind: 'social', site: social };
    return { kind: 'ok', url: u.toString() };
}
const FRACTIONS: Record<string, number> = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅕': 0.2, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
const FRACTION_CHARS = Object.keys(FRACTIONS).join('');
const NAMED: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', frac12: '½', frac14: '¼', frac34: '¾', frac13: '⅓', frac23: '⅔',
    frac18: '⅛', deg: '°', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', eacute: 'é', egrave: 'è',
};
export function decodeEntities(s: string): string {
    return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e: string) => {
        if (e[0] === '#') {
            const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
            return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
        }
        return NAMED[e.toLowerCase()] ?? m;
    });
}
function clean(s: unknown): string {
    if (typeof s !== 'string')
        return '';
    return decodeEntities(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}
const UNITS = new Set([
    'cup', 'cups', 'c', 'tablespoon', 'tablespoons', 'tbsp', 'tbs', 'tbl', 'teaspoon', 'teaspoons', 'tsp',
    'ounce', 'ounces', 'oz', 'pound', 'pounds', 'lb', 'lbs', 'gram', 'grams', 'g', 'gr', 'kilogram', 'kilograms', 'kg',
    'ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres', 'l', 'liter', 'liters', 'litre', 'litres',
    'clove', 'cloves', 'slice', 'slices', 'can', 'cans', 'package', 'packages', 'pkg', 'stick', 'sticks', 'pinch', 'dash',
    'handful', 'bunch', 'head', 'heads', 'large', 'medium', 'small', 'piece', 'pieces', 'whole', 'sprig', 'sprigs', 'scoop', 'scoops',
]);
export function leadingAmount(line: string): {
    quantity: number | null;
    rest: string;
} {
    const s = line.replace(/^\s+/, '');
    const f = `[${FRACTION_CHARS}]`;
    let m: RegExpMatchArray | null;
    let q: number | null = null;
    let used = 0;
    if ((m = s.match(/^(\d+)\s+(\d+)\/(\d+)(?!\d)/)) && Number(m[3]) > 0) {
        q = Number(m[1]) + Number(m[2]) / Number(m[3]);
        used = m[0].length;
    }
    else if ((m = s.match(/^(\d+)\/(\d+)(?!\d)/)) && Number(m[2]) > 0) {
        q = Number(m[1]) / Number(m[2]);
        used = m[0].length;
    }
    else if ((m = s.match(new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*(${f})`)))) {
        q = Number(m[1]) + FRACTIONS[m[2]];
        used = m[0].length;
    }
    else if ((m = s.match(new RegExp(`^(${f})`)))) {
        q = FRACTIONS[m[1]];
        used = m[0].length;
    }
    else if ((m = s.match(/^(\d+(?:[.,]\d+)?)/))) {
        q = Number(m[1].replace(',', '.'));
        used = m[0].length;
    }
    let rest = s.slice(used);
    if (q != null)
        rest = rest.replace(new RegExp(`^\\s*(?:-|–|to)\\s*[\\d${FRACTION_CHARS}./]+`), '');
    return { quantity: q != null && Number.isFinite(q) && q > 0 ? Math.round(q * 1000) / 1000 : null, rest: rest.trim() };
}
export function parseIngredientLine(raw: string): PastedIngredient | null {
    const text = clean(raw).replace(/^[-–•*·▪►✓✔☐□]+\s*/, '');
    if (!text || text.length > 160 || /:$/.test(text))
        return null;
    let { quantity, rest } = leadingAmount(text);
    let unit = '';
    const pack = rest.match(/^\((\d+(?:\.\d+)?)\s*-?\s*(oz|ounces?|g|grams?|ml|lb|pounds?)\.?\)\s*/i);
    if (pack) {
        quantity = (quantity ?? 1) * Number(pack[1]);
        unit = pack[2];
        rest = rest.slice(pack[0].length).replace(/^(cans?|packages?|pkgs?|jars?|bags?|boxes?|containers?|bottles?)\b\s*/i, '');
    }
    else {
        const fl = rest.match(/^(fl\.?\s*oz\.?|fluid\s+ounces?)\b\s*/i);
        if (fl) {
            unit = 'fl oz';
            rest = rest.slice(fl[0].length);
        }
        else {
            const w = rest.match(/^([A-Za-z]+)\.?(?=\s|$)/);
            if (w && (UNITS.has(w[1].toLowerCase()) && (w[1].length > 1 || /^[Ttcgl]$/.test(w[1])))) {
                unit = w[1];
                rest = rest.slice(w[0].length).trim();
            }
        }
    }
    const food = unbracket(rest)
        .replace(/^of\s+/i, '')
        .replace(/\b(boneless|skinless|bone-in|skin-on)\b\s*,?\s*/gi, '')
        .split(/,|;|\s[-–—]\s/)[0]
        .replace(/\b(to taste|as needed|optional|for serving|for garnish|divided)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!food)
        return null;
    return { text: text.slice(0, 120), quantity, unit, food: food.slice(0, 60) };
}
function unbracket(s: string): string {
    let out = s;
    for (let i = 0; i < 4 && /\([^()]*\)/.test(out); i++)
        out = out.replace(/\([^()]*\)/g, ' ');
    return out.replace(/[()]/g, ' ');
}
export function isoMinutes(v: unknown): number | null {
    if (typeof v !== 'string')
        return null;
    const m = v.match(/^P(?:(\d+)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:\d+(?:\.\d+)?S)?)?$/i);
    if (!m)
        return null;
    const mins = Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
    return mins > 0 ? Math.round(mins) : null;
}
function firstNumber(v: unknown): number | null {
    if (typeof v === 'number')
        return Number.isFinite(v) && v > 0 ? v : null;
    if (Array.isArray(v)) {
        for (const x of v) {
            const n = firstNumber(x);
            if (n != null)
                return n;
        }
        return null;
    }
    if (typeof v === 'string') {
        const m = v.match(/\d+/);
        return m ? Number(m[0]) || null : null;
    }
    return null;
}
function mealOf(category: unknown): PastedRecipe['mealType'] {
    const s = (Array.isArray(category) ? category.join(' ') : typeof category === 'string' ? category : '').toLowerCase();
    if (/breakfast|brunch/.test(s))
        return 'breakfast';
    if (/lunch|salad|sandwich/.test(s))
        return 'lunch';
    if (/dinner|main|entr[eé]e|supper/.test(s))
        return 'dinner';
    if (/snack|appetizer|dessert/.test(s))
        return 'snacks';
    return null;
}
const isRecipeType = (t: unknown): boolean => typeof t === 'string' ? /(^|\/)Recipe$/i.test(t) : Array.isArray(t) && t.some(isRecipeType);
function findRecipe(node: unknown, depth = 0): Record<string, unknown> | null {
    if (!node || typeof node !== 'object' || depth > 6)
        return null;
    if (Array.isArray(node)) {
        for (const x of node) {
            const r = findRecipe(x, depth + 1);
            if (r)
                return r;
        }
        return null;
    }
    const o = node as Record<string, unknown>;
    if (isRecipeType(o['@type']))
        return o;
    for (const k of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item']) {
        const r = findRecipe(o[k], depth + 1);
        if (r)
            return r;
    }
    return null;
}
function stepsOf(v: unknown, out: string[] = [], depth = 0): string[] {
    if (depth > 4 || out.length >= 30)
        return out;
    if (typeof v === 'string') {
        const parts = v.includes('<li') ? v.split(/<\/li>/i) : v.split(/\n+|<br\s*\/?>|<\/p>/i);
        for (const p of parts) {
            const t = clean(p).replace(/^(step\s*)?\d+[.):]\s*/i, '');
            if (t)
                out.push(t);
        }
    }
    else if (Array.isArray(v)) {
        for (const x of v)
            stepsOf(x, out, depth + 1);
    }
    else if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        if (o.itemListElement)
            stepsOf(o.itemListElement, out, depth + 1);
        else
            stepsOf(o.text ?? o.name, out, depth + 1);
    }
    return out;
}
function fromJsonLd(o: Record<string, unknown>): PastedRecipe | null {
    const lines = Array.isArray(o.recipeIngredient) ? o.recipeIngredient : Array.isArray(o.ingredients) ? o.ingredients : [];
    const ingredients = lines.map((l) => parseIngredientLine(String(l ?? ''))).filter((x): x is PastedIngredient => x != null);
    if (!ingredients.length)
        return null;
    const prep = isoMinutes(o.prepTime);
    const cook = isoMinutes(o.cookTime);
    return {
        name: clean(o.name).replace(/\s+recipe(\s+by\b.*)?$/i, '').slice(0, 40),
        servings: firstNumber(o.recipeYield ?? o.yield),
        minutes: isoMinutes(o.totalTime) ?? (prep != null || cook != null ? (prep ?? 0) + (cook ?? 0) : null),
        mealType: mealOf(o.recipeCategory),
        ingredients: ingredients.slice(0, 40),
        steps: stepsOf(o.recipeInstructions).slice(0, 20),
    };
}
export function recipeFromHtml(html: string): PastedRecipe | null {
    const page = html.length > MAX_PAGE_BYTES ? html.slice(0, MAX_PAGE_BYTES) : html;
    const blocks = page.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi);
    for (const b of blocks) {
        const raw = b[1].replace(/^\s*<!--|-->\s*$/g, '').replace(/^\s*\/\/<!\[CDATA\[|\/\/\]\]>\s*$/g, '').trim();
        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            continue;
        }
        const node = findRecipe(parsed);
        const read = node ? fromJsonLd(node) : null;
        if (read)
            return read;
    }
    const lines = [...page.matchAll(/itemprop\s*=\s*["'](?:recipeIngredient|ingredients)["'][^>]*?(?:content\s*=\s*["']([^"']*)["'][^>]*>|>([\s\S]*?)<\/(?:li|span|p|div)>)/gi)].map((m) => m[1] ?? m[2] ?? '');
    const ingredients = lines.map(parseIngredientLine).filter((x): x is PastedIngredient => x != null);
    if (!ingredients.length)
        return null;
    const title = page.match(/<meta[^>]+property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']*)["']/i)?.[1] ?? page.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
    const steps = [...page.matchAll(/itemprop\s*=\s*["']recipeInstructions["'][^>]*>([\s\S]*?)<\/(?:li|p|div|ol)>/gi)].flatMap((m) => stepsOf(m[1]));
    return { name: clean(title).slice(0, 40), servings: null, minutes: null, mealType: null, ingredients: ingredients.slice(0, 40), steps: steps.slice(0, 20) };
}
const ING_HEAD = /^(ingredients?|what you('|’)?ll need|you('|’)?ll need|shopping list)\b[\s:]*$/i;
const STEP_HEAD = /^(instructions?|directions?|method|steps?|preparation|how to make( it)?|to make)\b[\s:]*$/i;
const META = /^(serves|servings?|yield|makes|prep|cook|total|ready in|calories|nutrition|protein|carbs?|fat)\b/i;
const LEAD = new RegExp(`^[^\\p{L}\\p{N}${FRACTION_CHARS}]+`, 'u');
function servingsIn(text: string): number | null {
    const m = text.match(/\b(?:serves|servings?|yield|makes)\b\s*:?\s*(\d+)/i);
    return m ? Number(m[1]) || null : null;
}
function minutesIn(lines: string[]): number | null {
    const timed = lines.filter((l) => /\b(time|ready in|takes)\b/i.test(l));
    const line = timed.find((l) => /total|ready/i.test(l)) ?? timed[0];
    if (!line)
        return null;
    const h = line.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
    const m = line.match(/(\d+)\s*(?:minutes?|mins?|m)\b/i);
    const total = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
    return total > 0 ? Math.round(total) : null;
}
export function recipeFromText(raw: string): PastedRecipe | null {
    const text = raw.slice(0, MAX_PASTE_CHARS);
    const lines = text.split(/\r?\n/).map((l) => l.trim());
    const ingAt = lines.findIndex((l) => ING_HEAD.test(l.replace(LEAD, '')));
    const stepAt = lines.findIndex((l, i) => i > ingAt && STEP_HEAD.test(l.replace(LEAD, '')));
    let ingLines: string[];
    let stepLines: string[];
    if (ingAt >= 0) {
        ingLines = lines.slice(ingAt + 1, stepAt > ingAt ? stepAt : undefined);
        stepLines = stepAt > ingAt ? lines.slice(stepAt + 1) : [];
    }
    else {
        ingLines = [];
        stepLines = [];
        for (const l of lines) {
            const body = l.replace(LEAD, '');
            if (!body || META.test(body))
                continue;
            if (leadingAmount(body).quantity != null && body.length < 90 && !/[.!]$/.test(body))
                ingLines.push(body);
            else if (body.length >= 25)
                stepLines.push(body);
        }
    }
    const ingredients = ingLines
        .map((l) => l.replace(LEAD, ''))
        .filter((l) => l && !META.test(l) && !STEP_HEAD.test(l))
        .map(parseIngredientLine)
        .filter((x): x is PastedIngredient => x != null);
    if (!ingredients.length)
        return null;
    const steps = stepLines
        .map((l) => l.replace(LEAD, '').replace(/^(step\s*)?\d+[.):]\s*/i, '').trim())
        .filter((l) => l && !META.test(l))
        .slice(0, 20);
    const top = lines
        .slice(0, ingAt >= 0 ? ingAt : Math.min(lines.length, 3))
        .map((l) => l.replace(LEAD, '').split(/[\p{Extended_Pictographic}!|•]/u)[0].trim());
    const name = top.find((l) => l && l.length <= 60 && !META.test(l) && !ING_HEAD.test(l) && leadingAmount(l).quantity == null) ?? '';
    return {
        name: name.slice(0, 40),
        servings: servingsIn(text),
        minutes: minutesIn(lines),
        mealType: null,
        ingredients: ingredients.slice(0, 40),
        steps,
    };
}
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const FETCH_MS = 8000;
const MAX_HOPS = 4;
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
async function fetchPage(start: string): Promise<{
    ok: true;
    html: string;
} | {
    ok: false;
    reason: 'unreachable' | 'bad_url' | 'social';
}> {
    let url = start;
    for (let hop = 0; hop <= MAX_HOPS; hop++) {
        let res: Response;
        try {
            res = await fetch(url, {
                redirect: 'manual',
                headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
                signal: AbortSignal.timeout(FETCH_MS),
            });
        }
        catch {
            return { ok: false, reason: 'unreachable' };
        }
        if (res.status >= 300 && res.status < 400) {
            const next = res.headers.get('location');
            await res.body?.cancel();
            if (!next)
                return { ok: false, reason: 'unreachable' };
            const t = linkTarget(new URL(next, url).toString());
            if (t.kind !== 'ok')
                return { ok: false, reason: t.kind };
            url = t.url;
            continue;
        }
        const type = res.headers.get('content-type') ?? '';
        if (!res.ok || !/html|xml/i.test(type) || !res.body) {
            await res.body?.cancel();
            return { ok: false, reason: 'unreachable' };
        }
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (size < MAX_PAGE_BYTES) {
            const { done, value } = await reader.read();
            if (done || !value)
                break;
            chunks.push(value);
            size += value.length;
        }
        await reader.cancel().catch(() => undefined);
        const bytes = new Uint8Array(Math.min(size, MAX_PAGE_BYTES));
        let at = 0;
        for (const c of chunks) {
            const part = c.subarray(0, Math.max(0, bytes.length - at));
            bytes.set(part, at);
            at += part.length;
            if (at >= bytes.length)
                break;
        }
        return { ok: true, html: new TextDecoder().decode(bytes) };
    }
    return { ok: false, reason: 'unreachable' };
}
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS')
        return new Response('ok', { headers: CORS });
    let body: {
        url?: unknown;
    };
    try {
        body = await req.json();
    }
    catch {
        return json({ ok: false, reason: 'bad_request' }, 400);
    }
    const target = linkTarget(typeof body.url === 'string' ? body.url.slice(0, 2000) : '');
    if (target.kind !== 'ok')
        return json({ ok: false, reason: target.kind });
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: mayUseNutrition, error: gateError } = await supabase.rpc('has_nutrition_access');
    if (gateError || mayUseNutrition !== true)
        return json({ ok: false, reason: 'no_nutrition' }, 403);
    const page = await fetchPage(target.url);
    if (!page.ok)
        return json({ ok: false, reason: page.reason });
    const read = recipeFromHtml(page.html);
    if (!read)
        return json({ ok: false, reason: 'no_recipe' });
    return json({ ok: true, read });
});
