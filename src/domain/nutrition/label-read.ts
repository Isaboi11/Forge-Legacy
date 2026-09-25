/**
 * Label reading — turning the lines Vision found on a Nutrition Facts photo into Create Food's fields.
 *
 * Built for `Scan Nutrition Label v2.dc.html`. The native half (`modules/label-reader`) returns text
 * lines with a confidence and a position and decides nothing; every rule about WHICH number is
 * calories lives here, where `node --test` can hold it. Pure, relative-imported, NUT-D4.
 *
 * ⚠ **A BRONZE DOT MEANS ONE THING: FORGE ISN'T CONFIDENT ABOUT THIS VALUE** (the `.dc`'s own words).
 * So `sure` is false for exactly these reasons and no others:
 *   1. Vision was unsure of the line (`confidence` under `SURE_AT`);
 *   2. a character had to be repaired to make a number (`O` → `0`, `l` → `1`);
 *   3. the label contradicts itself — a %DV that does not match the amount beside it, sugar above
 *      carbs, saturated fat above total fat, or calories that the macros cannot explain;
 *   4. the value is outside what one serving of any food plausibly holds.
 * A MISSING value is a blank, never a dot — "Misses are plain blanks, so there's nothing to decode."
 *
 * ⚠ **THE LABEL IS US-FORMAT, AND THE %DV CHECK IS THE STRONGEST SIGNAL WE HAVE.** Every nutrient row
 * except sugar prints its amount AND its percent of the FDA Daily Value, so a misread 8 → 3 on Total Fat
 * shows up as "3 g is 4%, but the label says 10%". That is why a line Vision was unsure of is still
 * marked sure when its %DV agrees: two independent reads of the same fact.
 */

import type { FoodUnitKey } from './create-food.ts';

/** One line Vision found. Box normalised 0–1 with the origin at the TOP-left (the Swift side flips it). */
export interface LabelLine {
  text: string;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Create Food's own field keys — `cal`/`protein`/`carb`/`fat` plus `MORE_NUTRIENTS`' keys. */
export type LabelFieldKey =
  | 'cal'
  | 'protein'
  | 'carb'
  | 'fat'
  | 'fiber'
  | 'sugar'
  | 'satFat'
  | 'sodium'
  | 'cholesterol'
  | 'addedSugar'
  | 'potassium'
  | 'calcium'
  | 'iron'
  | 'vitaminD';

export const LABEL_FIELDS: readonly LabelFieldKey[] = [
  'cal',
  'protein',
  'carb',
  'fat',
  'fiber',
  'sugar',
  'satFat',
  'sodium',
  'cholesterol',
  'addedSugar',
  'potassium',
  'calcium',
  'iron',
  'vitaminD',
];

export interface ReadValue {
  /** Exactly what goes in the field — a plain decimal string, no unit. */
  value: string;
  sure: boolean;
}

export interface ReadServing {
  /** What goes in "1 serving = [amount]". May be a fraction ("2/3"); `create-food` parses those. */
  amount: string;
  unitKey: FoodUnitKey;
  /** Grams in ONE of the unit, for cup/tbsp/piece. Empty when the label did not print a weight. */
  unitWeight: string;
  sure: boolean;
}

export interface LabelRead {
  fields: Partial<Record<LabelFieldKey, ReadValue>>;
  serving: ReadServing | null;
  /** Found and confident. */
  filled: number;
  /** Found, but gets a dot. */
  unsure: number;
  /** Not found — a blank. Out of `LABEL_FIELDS` plus the serving. */
  missing: number;
  /** `unreadable` is C2; `partial` is A4; `scanned` is A3. */
  outcome: 'scanned' | 'partial' | 'unreadable';
}

/** Below this, Vision itself is hedging. Its `.accurate` level reports 1.0 for clean print. */
export const SURE_AT = 0.75;

/* ── FDA Daily Values (2016 rule, the label every US package now carries) ──── */

const DAILY_VALUE: Partial<Record<LabelFieldKey, number>> = {
  fat: 78,
  satFat: 20,
  cholesterol: 300,
  sodium: 2300,
  carb: 275,
  fiber: 28,
  addedSugar: 50,
  protein: 50,
  vitaminD: 20,
  calcium: 1300,
  iron: 18,
  potassium: 4700,
};

/** Past this for one serving the read is suspect, not the food. */
const CEILING: Record<LabelFieldKey, number> = {
  cal: 1500,
  protein: 100,
  carb: 200,
  fat: 100,
  fiber: 60,
  sugar: 150,
  satFat: 60,
  sodium: 5000,
  cholesterol: 1000,
  addedSugar: 150,
  potassium: 5000,
  calcium: 2000,
  iron: 60,
  vitaminD: 100,
};

/* ── rows ─────────────────────────────────────────────────────────────────── */

interface Row {
  text: string;
  confidence: number;
}

/**
 * Lines → label rows. Vision usually returns "Total Fat 8g" as one observation but the "10%" at the
 * far right as another, so lines whose vertical centres sit within most of a line-height of each
 * other are one row, joined left to right.
 */
export function toRows(lines: readonly LabelLine[]): Row[] {
  const sorted = lines
    .filter((l) => l.text.trim())
    .map((l) => ({ ...l, cy: l.y + l.h / 2 }))
    .sort((a, b) => a.cy - b.cy);
  const rows: { cy: number; h: number; parts: typeof sorted }[] = [];
  for (const line of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(line.cy - last.cy) < 0.6 * Math.max(line.h, last.h)) {
      last.parts.push(line);
      continue;
    }
    rows.push({ cy: line.cy, h: line.h, parts: [line] });
  }
  return rows.map((r) => {
    const parts = [...r.parts].sort((a, b) => a.x - b.x);
    return {
      text: parts.map((p) => p.text.trim()).join(' '),
      confidence: Math.min(...parts.map((p) => p.confidence)),
    };
  });
}

/* ── numbers ──────────────────────────────────────────────────────────────── */

/** A number as printed, allowing the characters Vision confuses with digits. */
const NUM = '(<\\s*)?([0-9oil|]+(?:[.,][0-9oil|]+)?)';

/** "8" → 8; "O.5" → 0.5 with `repaired`; "abc" → null. */
export function readNumber(raw: string): { n: number; repaired: boolean } | null {
  const fixed = raw.replace(/[o]/g, '0').replace(/[il|]/g, '1').replace(',', '.');
  if (!/\d/.test(raw)) return null; // letters alone are a word, not a misread number
  const n = Number(fixed);
  if (!Number.isFinite(n)) return null;
  return { n, repaired: fixed !== raw.replace(',', '.') };
}

const show = (n: number): string => String(Math.round(n * 100) / 100);

interface Rule {
  key: LabelFieldKey;
  pattern: RegExp;
  /** The unit the label must print. A sodium row reading "0.1g" is a misread, not 100 mg. */
  unit: 'g' | 'mg' | 'mcg' | null;
  /** Rows this rule must not read — "Total Fat" is not the Saturated Fat row. */
  unless?: RegExp;
}

const RULES: Rule[] = [
  { key: 'satFat', pattern: new RegExp(`sat(?:urated|\\.)?\\s*fat\\s*${NUM}\\s*(m?g|rng)\\b`), unit: 'g', unless: /poly|mono/ },
  { key: 'fat', pattern: new RegExp(`(?:total\\s*)?fat\\s*${NUM}\\s*(m?g|rng)\\b`), unit: 'g', unless: /sat|trans|from/ },
  { key: 'cholesterol', pattern: new RegExp(`cholest\\w*\\.?\\s*${NUM}\\s*(m?g|rng)\\b`), unit: 'mg' },
  { key: 'sodium', pattern: new RegExp(`sodium\\s*${NUM}\\s*(m?g|rng)\\b`), unit: 'mg' },
  { key: 'carb', pattern: new RegExp(`carb\\w*\\.?\\s*${NUM}\\s*(m?g|rng)\\b`), unit: 'g' },
  { key: 'fiber', pattern: new RegExp(`fib(?:er|re)\\s*${NUM}\\s*(m?g|rng)\\b`), unit: 'g' },
  { key: 'addedSugar', pattern: new RegExp(`incl\\w*\\.?\\s*${NUM}\\s*(m?g|rng)\\s*(?:of\\s*)?added`), unit: 'g' },
  { key: 'addedSugar', pattern: new RegExp(`added\\s*sugars?\\s*${NUM}\\s*(m?g|rng)\\b`), unit: 'g' },
  { key: 'sugar', pattern: new RegExp(`sugars?\\s*${NUM}\\s*(m?g|rng)\\b`), unit: 'g', unless: /added|alcohol/ },
  { key: 'protein', pattern: new RegExp(`protein\\s*${NUM}\\s*(m?g|rng)\\b`), unit: 'g' },
  { key: 'vitaminD', pattern: new RegExp(`vit(?:amin|\\.)?\\s*d\\s*${NUM}\\s*(mcg|µg|ug|iu)\\b`), unit: 'mcg' },
  { key: 'calcium', pattern: new RegExp(`calcium\\s*${NUM}\\s*(m?g|rng)\\b`), unit: 'mg' },
  { key: 'iron', pattern: new RegExp(`iron\\s*${NUM}\\s*(m?g|rng)\\b`), unit: 'mg' },
  { key: 'potassium', pattern: new RegExp(`potas\\w*\\s*${NUM}\\s*(m?g|rng)\\b`), unit: 'mg' },
];

/** Normalise the unit Vision read. `rng` is a very common misread of `mg`. */
const unitOf = (u: string): string => (u === 'µg' || u === 'ug' ? 'mcg' : u === 'rng' ? 'mg' : u);

/* ── serving ──────────────────────────────────────────────────────────────── */

const PIECE_WORDS = /^(pieces?|bars?|cookies?|slices?|eggs?|links?|patt(?:y|ies)|muffins?|pouch(?:es)?|packets?|containers?|bottles?|cans?|crackers?|pretzels?|chips?|nuggets?|sticks?|scoops?)$/;

/** "2/3 cup (55g)" → { amount '2/3', cup, 82.5 }. Null when nothing weighable is there. */
export function readServing(raw: string, confident: boolean): ReadServing | null {
  const t = raw.toLowerCase().replace(/about|approx\.?|serving size/g, ' ').trim();
  const grams = /\(\s*(\d+(?:\.\d+)?)\s*g\s*\)/.exec(t)?.[1];
  const ml = /\(\s*(\d+(?:\.\d+)?)\s*ml\s*\)/.exec(t)?.[1];
  const lead = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*([a-zµ.]+)?/.exec(t);
  if (!lead) return null;
  const amount = lead[1].replace(/\s+/g, ' ');
  const word = (lead[2] ?? '').replace(/\.$/, '');
  const count = fractionValue(amount);
  if (!(count > 0)) return null;
  const perOne = (g: string) => show(Number(g) / count);

  if (word === 'g' || word === 'grams' || word === 'gram') return { amount, unitKey: 'g', unitWeight: '', sure: confident };
  if (word === 'ml' || word === 'milliliters' || word === 'millilitres') return { amount, unitKey: 'ml', unitWeight: '', sure: confident };
  /* A printed weight beats a household measure for everything the app cannot weigh by itself. */
  if (/^cups?$/.test(word)) {
    if (ml && !grams) return { amount: ml, unitKey: 'ml', unitWeight: '', sure: confident };
    return { amount, unitKey: 'cup', unitWeight: grams ? perOne(grams) : '', sure: confident };
  }
  if (/^(tbsp|tbs|tablespoons?)$/.test(word)) return { amount, unitKey: 'tbsp', unitWeight: grams ? perOne(grams) : '', sure: confident };
  if (PIECE_WORDS.test(word) && grams) return { amount, unitKey: 'piece', unitWeight: perOne(grams), sure: confident };
  if (grams) return { amount: show(Number(grams)), unitKey: 'g', unitWeight: '', sure: confident };
  if (ml) return { amount: show(Number(ml)), unitKey: 'ml', unitWeight: '', sure: confident };
  if (/^oz$/.test(word)) return { amount, unitKey: 'oz', unitWeight: '', sure: confident };
  return null;
}

/** "2/3" → 0.667, "1 1/2" → 1.5, "80" → 80. Kept here as well as in `create-food` so this file has one import. */
function fractionValue(s: string): number {
  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(s);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = /^(\d+(?:\.\d+)?)\/(\d+)$/.exec(s);
  if (frac) return Number(frac[2]) > 0 ? Number(frac[1]) / Number(frac[2]) : 0;
  return Number(s);
}

/* ── the read ─────────────────────────────────────────────────────────────── */

export function readLabel(lines: readonly LabelLine[]): LabelRead {
  const rows = toRows(lines);
  const fields: Partial<Record<LabelFieldKey, ReadValue>> = {};
  let serving: ReadServing | null = null;

  rows.forEach((row, i) => {
    const t = row.text.toLowerCase();
    const confident = row.confidence >= SURE_AT;

    if (!serving && /serving\s*size/.test(t)) {
      const after = t.slice(t.search(/serving\s*size/)).replace(/serving\s*size/, '').trim();
      const next = rows[i + 1];
      serving = readServing(after, confident) ?? (next ? readServing(next.text, confident && next.confidence >= SURE_AT) : null);
    }

    if (!fields.cal) {
      const cal = readCalories(t, rows[i + 1]);
      if (cal) fields.cal = { value: show(cal.n), sure: confident && cal.sure };
    }

    for (const rule of RULES) {
      if (fields[rule.key]) continue;
      if (rule.unless?.test(t)) continue;
      const m = rule.pattern.exec(t);
      if (!m) continue;
      const lessThan = m[1] != null;
      const num = readNumber(m[2]);
      if (!num) continue;
      let unit = unitOf(m[3]);
      let n = lessThan && num.n <= 1 ? 0.5 : num.n;
      if (rule.key === 'vitaminD' && unit === 'iu') {
        n = n / 40; // 40 IU = 1 mcg — older labels print IU
        unit = 'mcg';
      }
      const unitOk = rule.unit == null || unit === rule.unit;
      if (!unitOk) continue;
      const pct = percentAfter(t, m.index + m[0].length);
      const pctAgrees = pct == null ? null : dvAgrees(rule.key, n, pct);
      const sure =
        pctAgrees === false ? false : (confident && !num.repaired) || pctAgrees === true;
      fields[rule.key] = { value: show(n), sure };
    }
  });

  crossCheck(fields);

  let found = 0;
  let unsure = 0;
  for (const key of LABEL_FIELDS) {
    const f = fields[key];
    if (!f) continue;
    found += 1;
    if (!f.sure) unsure += 1;
  }
  const s = serving as ReadServing | null;
  if (s) {
    found += 1;
    if (!s.sure) unsure += 1;
  }
  const total = LABEL_FIELDS.length + 1;
  const missing = total - found;
  const core = ['cal', 'protein', 'carb', 'fat'].filter((k) => fields[k as LabelFieldKey]).length;
  const outcome: LabelRead['outcome'] = found < 3 || core === 0 ? 'unreadable' : missing === 0 ? 'scanned' : 'partial';

  return { fields, serving: s, filled: found - unsure, unsure, missing, outcome };
}

/**
 * Calories sit in large type and often on their own line: "Calories" at the left, "230" as a separate
 * observation — sometimes on the same row, sometimes one row down. The footnote ("2,000 calories a
 * day") and the old "Calories from Fat" line are both refused.
 */
function readCalories(t: string, next: Row | undefined): { n: number; sure: boolean } | null {
  if (!/calories/.test(t) || /from\s*fat|a\s*day|diet|2,?000/.test(t)) return null;
  const m = new RegExp(`calories\\s*${NUM}(?!\\s*%)`).exec(t);
  if (m) {
    const num = readNumber(m[2]);
    if (num) return { n: num.n, sure: !num.repaired };
  }
  const alone = next ? /^\s*([0-9oil|]{1,4})\s*$/.exec(next.text.toLowerCase()) : null;
  if (alone && /calories\s*$/.test(t)) {
    const num = readNumber(alone[1]);
    if (num) return { n: num.n, sure: !num.repaired && (next as Row).confidence >= SURE_AT };
  }
  return null;
}

function percentAfter(t: string, from: number): number | null {
  const m = /^\s*(\d{1,3})\s*%/.exec(t.slice(from));
  return m ? Number(m[1]) : null;
}

/**
 * Does the printed %DV match the amount? FDA rounding is coarse (amounts to the nearest 0.5 g or 5 mg,
 * percents to the nearest 1), so the tolerance is a couple of points or a quarter of the value.
 */
export function dvAgrees(key: LabelFieldKey, amount: number, pct: number): boolean | null {
  const dv = DAILY_VALUE[key];
  if (!dv) return null;
  const expected = (amount / dv) * 100;
  return Math.abs(expected - pct) <= Math.max(3, pct * 0.25);
}

/** The label contradicting itself. Marks the value most likely misread, never removes one. */
function crossCheck(fields: Partial<Record<LabelFieldKey, ReadValue>>): void {
  const n = (k: LabelFieldKey) => (fields[k] ? Number(fields[k]!.value) : null);
  const doubt = (k: LabelFieldKey) => {
    if (fields[k]) fields[k] = { ...fields[k]!, sure: false };
  };

  for (const key of LABEL_FIELDS) {
    const v = n(key);
    if (v != null && v > CEILING[key]) doubt(key);
  }
  const fat = n('fat');
  const sat = n('satFat');
  if (fat != null && sat != null && sat > fat) doubt('satFat');
  const carb = n('carb');
  const sugar = n('sugar');
  const fiber = n('fiber');
  const added = n('addedSugar');
  if (carb != null && sugar != null && sugar > carb) doubt('sugar');
  if (carb != null && fiber != null && fiber > carb) doubt('fiber');
  if (sugar != null && added != null && added > sugar) doubt('addedSugar');

  const cal = n('cal');
  const protein = n('protein');
  if (cal != null && protein != null && carb != null && fat != null) {
    const est = 4 * protein + 4 * carb + 9 * fat;
    /* Fibre and sugar alcohols make real labels run under Atwater, so only a wide miss counts. */
    if (Math.abs(cal - est) > Math.max(25, est * 0.25)) doubt('cal');
  }
}
