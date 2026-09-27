/**
 * READING A PASTED RECIPE — a link, or the recipe's text. PO 2026-09-27: *"build the 'paste link here' part
 * of the add recipe."*
 *
 * Pure and deterministic: **no model, no credit, every tier.** The answer is the same `RecipeRead` shape a
 * photographed recipe produces (`recipe-photo-read.ts`), so it becomes a draft through the SAME
 * `draftFromRead` — same catalogue matching, same "Not matched" list, nothing guessed, nothing saved until
 * the athlete saves.
 *
 * ══ A LINK ══
 *
 * Nearly every recipe site publishes the recipe as schema.org `Recipe` JSON-LD for search engines: name,
 * yield, times, `recipeIngredient` (one line each) and `recipeInstructions`. That block is read; the page's
 * prose is not. Microdata (`itemprop="recipeIngredient"`) is the fallback. Instagram, TikTok, YouTube and
 * Facebook keep a recipe inside their app, so they are refused up front with "paste the caption instead".
 *
 * ══ TEXT ══
 *
 * A pasted caption or note: "Ingredients" / "Instructions" headings when present; otherwise a line that
 * starts with an amount is an ingredient and a sentence is a step.
 *
 * ══ ⛔ NUT-D4 ══
 *
 * A page's `nutrition` block (and any "Calories: 450" line) is never read. Calories come from the app's own
 * catalogue, from the ingredients, exactly as for a photo.
 *
 * ⚠ The steps are the athlete's personal copy: `user_recipes` is owner-only (0213) and nothing publishes it
 * — the same footing as a screenshot of the page (`project_third_party_program_provenance`).
 *
 * ⚠ NO IMPORTS. The `recipe-link-read` Edge Function inlines this file into its dashboard paste copy
 * (`scripts/build-recipe-link-read-deploy.mjs`), and the generator refuses a module that imports.
 */

/** The `RecipeRead` shape (`recipe-photo-read.ts`), restated here because this file may import nothing. */
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

/** Longest paste read — a long recipe page's text is well under this. */
export const MAX_PASTE_CHARS = 20_000;
/** Most HTML read from a page. Recipe JSON-LD sits in the head or near it; this is generous. */
export const MAX_PAGE_BYTES = 3_000_000;

/* ── the link ───────────────────────────────────────────────────────────── */

/** Sites that keep a recipe inside their app — no page to read, so say "paste the caption". */
const SOCIAL = ['instagram.com', 'tiktok.com', 'facebook.com', 'fb.watch', 'youtube.com', 'youtu.be', 'threads.net', 'x.com', 'twitter.com'];

export type LinkTarget = { kind: 'ok'; url: string } | { kind: 'social'; site: string } | { kind: 'bad_url' };

/** Is this paste a link rather than a recipe's text? One token that looks like a web address. */
export function looksLikeLink(raw: string): boolean {
  const t = raw.trim();
  return !/\s/.test(t) && /^(https?:\/\/|www\.)[^\s/]+\.[^\s]+/i.test(t);
}

/**
 * A link Forge will open, or why not. ⚠ The server fetches it, so anything that could reach inside a
 * network is refused: http(s) only, default ports, no IP literals, no `localhost` / `.local` / `.internal`.
 */
export function linkTarget(raw: string): LinkTarget {
  let t = raw.trim();
  if (/^www\./i.test(t)) t = `https://${t}`;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return { kind: 'bad_url' };
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { kind: 'bad_url' };
  if (u.port || u.username || u.password) return { kind: 'bad_url' };
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (!host.includes('.') || host.startsWith('[') || /^[\d.]+$/.test(host) || /:/.test(host)) return { kind: 'bad_url' };
  if (/(^|\.)(localhost|local|internal|localdomain|home|lan|arpa)$/.test(host)) return { kind: 'bad_url' };
  const social = SOCIAL.find((s) => host === s || host.endsWith(`.${s}`));
  if (social) return { kind: 'social', site: social };
  return { kind: 'ok', url: u.toString() };
}

/* ── small text helpers ─────────────────────────────────────────────────── */

const FRACTIONS: Record<string, number> = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75, '⅕': 0.2, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
const FRACTION_CHARS = Object.keys(FRACTIONS).join('');

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', frac12: '½', frac14: '¼', frac34: '¾', frac13: '⅓', frac23: '⅔',
  frac18: '⅛', deg: '°', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', eacute: 'é', egrave: 'è',
};

/** `&amp;` `&#189;` `&#x2153;` `&frac12;` → text. */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

/** Tags out, entities decoded, whitespace collapsed. */
function clean(s: unknown): string {
  if (typeof s !== 'string') return '';
  return decodeEntities(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/* ── one ingredient line ────────────────────────────────────────────────── */

/** Unit words as a page writes them. The raw word is kept; `recipe-import.ts` converts it. */
const UNITS = new Set([
  'cup', 'cups', 'c', 'tablespoon', 'tablespoons', 'tbsp', 'tbs', 'tbl', 'teaspoon', 'teaspoons', 'tsp',
  'ounce', 'ounces', 'oz', 'pound', 'pounds', 'lb', 'lbs', 'gram', 'grams', 'g', 'gr', 'kilogram', 'kilograms', 'kg',
  'ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres', 'l', 'liter', 'liters', 'litre', 'litres',
  'clove', 'cloves', 'slice', 'slices', 'can', 'cans', 'package', 'packages', 'pkg', 'stick', 'sticks', 'pinch', 'dash',
  'handful', 'bunch', 'head', 'heads', 'large', 'medium', 'small', 'piece', 'pieces', 'whole', 'sprig', 'sprigs', 'scoop', 'scoops',
]);

/** The amount at the start of a line — "1 ½", "1½", "1 1/2", "3/4", "2.5", "1-2" (the first) — and the rest. */
export function leadingAmount(line: string): { quantity: number | null; rest: string } {
  const s = line.replace(/^\s+/, '');
  const f = `[${FRACTION_CHARS}]`;
  let m: RegExpMatchArray | null;
  let q: number | null = null;
  let used = 0;
  if ((m = s.match(/^(\d+)\s+(\d+)\/(\d+)(?!\d)/)) && Number(m[3]) > 0) {
    q = Number(m[1]) + Number(m[2]) / Number(m[3]);
    used = m[0].length;
  } else if ((m = s.match(/^(\d+)\/(\d+)(?!\d)/)) && Number(m[2]) > 0) {
    q = Number(m[1]) / Number(m[2]);
    used = m[0].length;
  } else if ((m = s.match(new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*(${f})`)))) {
    q = Number(m[1]) + FRACTIONS[m[2]];
    used = m[0].length;
  } else if ((m = s.match(new RegExp(`^(${f})`)))) {
    q = FRACTIONS[m[1]];
    used = m[0].length;
  } else if ((m = s.match(/^(\d+(?:[.,]\d+)?)/))) {
    q = Number(m[1].replace(',', '.'));
    used = m[0].length;
  }
  let rest = s.slice(used);
  // A range ("1-2 cups", "2 to 3") reads as its first number, as the photo read does.
  if (q != null) rest = rest.replace(new RegExp(`^\\s*(?:-|–|to)\\s*[\\d${FRACTION_CHARS}./]+`), '');
  return { quantity: q != null && Number.isFinite(q) && q > 0 ? Math.round(q * 1000) / 1000 : null, rest: rest.trim() };
}

/**
 * "1 (14 oz) can chickpeas, drained" → 14 oz of "chickpeas". "2 large eggs" → 2 "large" "eggs".
 * "Salt and pepper to taste" → no amount, "Salt and pepper". The line as written is always kept in `text`.
 */
export function parseIngredientLine(raw: string): PastedIngredient | null {
  const text = clean(raw).replace(/^[-–•*·▪►✓✔☐□]+\s*/, '');
  if (!text || text.length > 160 || /:$/.test(text)) return null;
  let { quantity, rest } = leadingAmount(text);
  let unit = '';

  // A package size in brackets right after the count is the real amount: "1 (14 oz) can" → 14 oz.
  const pack = rest.match(/^\((\d+(?:\.\d+)?)\s*-?\s*(oz|ounces?|g|grams?|ml|lb|pounds?)\.?\)\s*/i);
  if (pack) {
    quantity = (quantity ?? 1) * Number(pack[1]);
    unit = pack[2];
    rest = rest.slice(pack[0].length).replace(/^(cans?|packages?|pkgs?|jars?|bags?|boxes?|containers?|bottles?)\b\s*/i, '');
  } else {
    const fl = rest.match(/^(fl\.?\s*oz\.?|fluid\s+ounces?)\b\s*/i);
    if (fl) {
      unit = 'fl oz';
      rest = rest.slice(fl[0].length);
    } else {
      const w = rest.match(/^([A-Za-z]+)\.?(?=\s|$)/);
      if (w && (UNITS.has(w[1].toLowerCase()) && (w[1].length > 1 || /^[Ttcgl]$/.test(w[1])))) {
        unit = w[1];
        rest = rest.slice(w[0].length).trim();
      }
    }
  }

  const food = unbracket(rest)
    .replace(/^of\s+/i, '')
    // "boneless, skinless chicken breasts" — cut at the comma and all that is left is "boneless".
    .replace(/\b(boneless|skinless|bone-in|skin-on)\b\s*,?\s*/gi, '')
    .split(/,|;|\s[-–—]\s/)[0]
    .replace(/\b(to taste|as needed|optional|for serving|for garnish|divided)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!food) return null;
  return { text: text.slice(0, 120), quantity, unit, food: food.slice(0, 60) };
}

/** Every bracketed note out, nested ones too ("((optional))"), and any stray bracket left behind. */
function unbracket(s: string): string {
  let out = s;
  for (let i = 0; i < 4 && /\([^()]*\)/.test(out); i++) out = out.replace(/\([^()]*\)/g, ' ');
  return out.replace(/[()]/g, ' ');
}

/* ── times, yields, meal ────────────────────────────────────────────────── */

/** ISO-8601 duration ("PT1H30M", "P0DT0H20M") → minutes. */
export function isoMinutes(v: unknown): number | null {
  if (typeof v !== 'string') return null;
  const m = v.match(/^P(?:(\d+)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:\d+(?:\.\d+)?S)?)?$/i);
  if (!m) return null;
  const mins = Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return mins > 0 ? Math.round(mins) : null;
}

function firstNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : null;
  if (Array.isArray(v)) {
    for (const x of v) {
      const n = firstNumber(x);
      if (n != null) return n;
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
  if (/breakfast|brunch/.test(s)) return 'breakfast';
  if (/lunch|salad|sandwich/.test(s)) return 'lunch';
  if (/dinner|main|entr[eé]e|supper/.test(s)) return 'dinner';
  if (/snack|appetizer|dessert/.test(s)) return 'snacks';
  return null;
}

/* ── a web page ─────────────────────────────────────────────────────────── */

const isRecipeType = (t: unknown): boolean =>
  typeof t === 'string' ? /(^|\/)Recipe$/i.test(t) : Array.isArray(t) && t.some(isRecipeType);

function findRecipe(node: unknown, depth = 0): Record<string, unknown> | null {
  if (!node || typeof node !== 'object' || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const x of node) {
      const r = findRecipe(x, depth + 1);
      if (r) return r;
    }
    return null;
  }
  const o = node as Record<string, unknown>;
  if (isRecipeType(o['@type'])) return o;
  for (const k of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item']) {
    const r = findRecipe(o[k], depth + 1);
    if (r) return r;
  }
  return null;
}

/** `recipeInstructions`: a string, a list of strings / HowToStep, or HowToSections of them. */
function stepsOf(v: unknown, out: string[] = [], depth = 0): string[] {
  if (depth > 4 || out.length >= 30) return out;
  if (typeof v === 'string') {
    const parts = v.includes('<li') ? v.split(/<\/li>/i) : v.split(/\n+|<br\s*\/?>|<\/p>/i);
    for (const p of parts) {
      const t = clean(p).replace(/^(step\s*)?\d+[.):]\s*/i, '');
      if (t) out.push(t);
    }
  } else if (Array.isArray(v)) {
    for (const x of v) stepsOf(x, out, depth + 1);
  } else if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (o.itemListElement) stepsOf(o.itemListElement, out, depth + 1);
    else stepsOf(o.text ?? o.name, out, depth + 1);
  }
  return out;
}

function fromJsonLd(o: Record<string, unknown>): PastedRecipe | null {
  const lines = Array.isArray(o.recipeIngredient) ? o.recipeIngredient : Array.isArray(o.ingredients) ? o.ingredients : [];
  const ingredients = lines.map((l) => parseIngredientLine(String(l ?? ''))).filter((x): x is PastedIngredient => x != null);
  if (!ingredients.length) return null;
  const prep = isoMinutes(o.prepTime);
  const cook = isoMinutes(o.cookTime);
  return {
    // Tasty's name is "One-Pot Pasta Recipe by <author>"; the byline is not the dish.
    name: clean(o.name).replace(/\s+recipe(\s+by\b.*)?$/i, '').slice(0, 40),
    servings: firstNumber(o.recipeYield ?? o.yield),
    minutes: isoMinutes(o.totalTime) ?? (prep != null || cook != null ? (prep ?? 0) + (cook ?? 0) : null),
    mealType: mealOf(o.recipeCategory),
    ingredients: ingredients.slice(0, 40),
    steps: stepsOf(o.recipeInstructions).slice(0, 20),
  };
}

/** A recipe page → the recipe, from its JSON-LD (or microdata), or null when the page has none. */
export function recipeFromHtml(html: string): PastedRecipe | null {
  const page = html.length > MAX_PAGE_BYTES ? html.slice(0, MAX_PAGE_BYTES) : html;
  const blocks = page.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi);
  for (const b of blocks) {
    const raw = b[1].replace(/^\s*<!--|-->\s*$/g, '').replace(/^\s*\/\/<!\[CDATA\[|\/\/\]\]>\s*$/g, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const node = findRecipe(parsed);
    const read = node ? fromJsonLd(node) : null;
    if (read) return read;
  }
  // Microdata — older recipe plugins.
  const lines = [...page.matchAll(/itemprop\s*=\s*["'](?:recipeIngredient|ingredients)["'][^>]*?(?:content\s*=\s*["']([^"']*)["'][^>]*>|>([\s\S]*?)<\/(?:li|span|p|div)>)/gi)].map(
    (m) => m[1] ?? m[2] ?? '',
  );
  const ingredients = lines.map(parseIngredientLine).filter((x): x is PastedIngredient => x != null);
  if (!ingredients.length) return null;
  const title = page.match(/<meta[^>]+property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']*)["']/i)?.[1] ?? page.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
  const steps = [...page.matchAll(/itemprop\s*=\s*["']recipeInstructions["'][^>]*>([\s\S]*?)<\/(?:li|p|div|ol)>/gi)].flatMap((m) => stepsOf(m[1]));
  return { name: clean(title).slice(0, 40), servings: null, minutes: null, mealType: null, ingredients: ingredients.slice(0, 40), steps: steps.slice(0, 20) };
}

/* ── pasted text ────────────────────────────────────────────────────────── */

const ING_HEAD = /^(ingredients?|what you('|’)?ll need|you('|’)?ll need|shopping list)\b[\s:]*$/i;
const STEP_HEAD = /^(instructions?|directions?|method|steps?|preparation|how to make( it)?|to make)\b[\s:]*$/i;
const META = /^(serves|servings?|yield|makes|prep|cook|total|ready in|calories|nutrition|protein|carbs?|fat)\b/i;
/** Leading bullets, emoji and numbering — "🔸 1 cup rice", "• 2 eggs", "3) Stir". Letters, digits and fractions stay. */
const LEAD = new RegExp(`^[^\\p{L}\\p{N}${FRACTION_CHARS}]+`, 'u');

function servingsIn(text: string): number | null {
  const m = text.match(/\b(?:serves|servings?|yield|makes)\b\s*:?\s*(\d+)/i);
  return m ? Number(m[1]) || null : null;
}

function minutesIn(lines: string[]): number | null {
  const timed = lines.filter((l) => /\b(time|ready in|takes)\b/i.test(l));
  const line = timed.find((l) => /total|ready/i.test(l)) ?? timed[0];
  if (!line) return null;
  const h = line.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
  const m = line.match(/(\d+)\s*(?:minutes?|mins?|m)\b/i);
  const total = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
  return total > 0 ? Math.round(total) : null;
}

/** A pasted recipe → the recipe, or null when no ingredient line can be found. */
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
  } else {
    // No headings: an amount-first short line is an ingredient; a sentence is a step.
    ingLines = [];
    stepLines = [];
    for (const l of lines) {
      const body = l.replace(LEAD, '');
      if (!body || META.test(body)) continue;
      if (leadingAmount(body).quantity != null && body.length < 90 && !/[.!]$/.test(body)) ingLines.push(body);
      else if (body.length >= 25) stepLines.push(body);
    }
  }

  const ingredients = ingLines
    .map((l) => l.replace(LEAD, ''))
    .filter((l) => l && !META.test(l) && !STEP_HEAD.test(l))
    .map(parseIngredientLine)
    .filter((x): x is PastedIngredient => x != null);
  if (!ingredients.length) return null;

  const steps = stepLines
    .map((l) => l.replace(LEAD, '').replace(/^(step\s*)?\d+[.):]\s*/i, '').trim())
    .filter((l) => l && !META.test(l))
    .slice(0, 20);

  // The name: the first short line above the ingredients that is not a heading, an amount or a meta line.
  // A caption's first line runs on ("Chicken burrito bowls 🔥 save this!!") — the dish is what comes before
  // the first emoji, "!" or "|".
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
