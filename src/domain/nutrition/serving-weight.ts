/**
 * How much one FatSecret serving weighs (AI Road to 10 Sprint 3a, NU-2 / AI audit 11-16 N-D6).
 *
 * About half of FatSecret's restaurant items carry no `metric_serving_amount` — Costa Vida's
 * "Tomatillo Ranch Dressing - 2 oz" is a "1 serving" with calories and no weight — and food-search
 * dropped every one of them, because a serving without a weight cannot become per-100 g. The weight is
 * often written down anyway: in the serving text ("2 oz", "1 cup (240 ml)") or, when the serving is a
 * bare "1 serving", at the end of the food's name. This reads it from there.
 *
 * ⛔ Never invent a weight. No number-and-unit anywhere, or two that disagree, or "each" / "per" /
 * "2 x 4 oz" (a weight of something else) → null, and the food is still dropped.
 *
 * The block between the SERVING WEIGHT markers is a byte-for-byte copy of the one in
 * supabase/functions/food-search/index.ts (that function deploys from its own index.ts, with no
 * bundle builder). serving-weight.test.mjs fails if the two drift. Edit both, or neither.
 */

// ── SERVING WEIGHT: begin ──────────────────────────────────────────────────────────────────────────
const OZ_GRAMS = 28.3495;

/** Grams per unit. A millilitre is taken as a gram, as the metric_serving_amount path always has. */
const WEIGHT_UNITS: readonly { re: RegExp; grams: number; metric: boolean }[] = [
  { re: /^(?:fl\.?\s*oz|fluid\s+ounces?)$/i, grams: 29.5735, metric: false },
  { re: /^(?:oz|ounces?)$/i, grams: OZ_GRAMS, metric: false },
  { re: /^(?:lbs?|pounds?)$/i, grams: 453.592, metric: false },
  { re: /^(?:kg|kilograms?)$/i, grams: 1000, metric: true },
  { re: /^(?:g|grams?)$/i, grams: 1, metric: true },
  { re: /^(?:ml|millilit(?:er|re)s?)$/i, grams: 1, metric: true },
  { re: /^(?:l|lit(?:er|re)s?)$/i, grams: 1000, metric: true },
];

/** "2 oz", "2 fl oz", "85 g", "240 ml", "1 1/2 oz", "12-oz". The unit may not run on into a word ("2 large"). */
const WEIGHT_RE =
  /(?<![\w./])(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|\.\d+)\s*-?\s*(fl\.?\s*oz|fluid\s+ounces?|ounces?|oz|pounds?|lbs?|kilograms?|kg|grams?|g|millilit(?:er|re)s?|ml|lit(?:er|re)s?|l)(?![a-z])/gi;

/** "85 g each", "per 2 oz", "2 x 4 oz" — the number weighs something other than this serving. */
const NOT_THIS_SERVING_RE = /\b(?:each|ea|per)\b|\d\s*[x×]\s*\d/i;

/** A serving that says nothing about itself, so the food's name may say the weight instead. */
const GENERIC_SERVING_RE = /^\s*(?:1\s+)?(?:serving)?\s*$/i;

function weightNumber(raw: string): number {
  const mixed = raw.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const fraction = raw.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  return Number(raw);
}

interface WeightHit {
  grams: number;
  metric: boolean;
  end: number;
}

function weightHits(text: string): WeightHit[] {
  const hits: WeightHit[] = [];
  for (const m of text.matchAll(WEIGHT_RE)) {
    const unit = WEIGHT_UNITS.find((u) => u.re.test(m[2]));
    const n = weightNumber(m[1]);
    if (!unit || !Number.isFinite(n) || n <= 0) continue;
    hits.push({ grams: n * unit.grams, metric: unit.metric, end: (m.index ?? 0) + m[0].length });
  }
  return hits;
}

/** One weight, or null. Metric wins over ounces ("1 cup (8 fl oz / 240 ml)" → 240); two different metric weights → null. */
function oneWeight(hits: WeightHit[]): number | null {
  const metric = hits.filter((h) => h.metric);
  const pool = metric.length ? metric : hits;
  const distinct = [...new Set(pool.map((h) => Math.round(h.grams * 10) / 10))];
  return distinct.length === 1 ? distinct[0] : null;
}

/** The weight written in a serving's own text: "2 oz", "1 cup (240 ml)", "1 serving (85 g)". */
function servingTextGrams(text: string): number | null {
  if (!text || NOT_THIS_SERVING_RE.test(text)) return null;
  return oneWeight(weightHits(text));
}

/**
 * The weight at the END of a food's name: "Tomatillo Ranch Dressing - 2 oz", "Kids Burrito (8 oz)".
 * Exactly one weight, last thing in the name — "Salad with 2 oz Dressing" is the dressing, not the salad.
 */
function foodNameGrams(name: string): number | null {
  if (!name || NOT_THIS_SERVING_RE.test(name)) return null;
  const hits = weightHits(name);
  if (hits.length !== 1) return null;
  if (!/^[\s)\]]*$/.test(name.slice(hits[0].end))) return null;
  return hits[0].grams;
}

/**
 * Grams in one FatSecret serving: the weighed amount first; then the serving's own text; then — only
 * for a bare "1 serving" — the food's name. Null when none of them says a weight.
 */
function fsServingGrams(serving: Record<string, unknown>, foodName: unknown): number | null {
  const amount = Number(serving.metric_serving_amount ?? NaN);
  if (Number.isFinite(amount) && amount > 0) {
    return /^oz$/i.test(String(serving.metric_serving_unit ?? '')) ? amount * OZ_GRAMS : amount;
  }
  const text = String(serving.serving_description ?? '').trim();
  const fromText = servingTextGrams(text);
  if (fromText != null) return fromText;
  if (!GENERIC_SERVING_RE.test(text)) return null;
  return foodNameGrams(String(foodName ?? '').trim());
}
// ── SERVING WEIGHT: end ────────────────────────────────────────────────────────────────────────────

export { foodNameGrams, fsServingGrams, servingTextGrams };
