/**
 * Chart math for the operator dashboard — pure, tested, and deliberately separate from the components
 * that draw with it.
 *
 * Modelled on `components/forge/MetricDetail.tsx`, which hand-rolls the same shapes with
 * `react-native-svg` (there is no chart library in this project and this change does not add one).
 * `MetricDetail` is a shipped, design-reviewed screen and is NOT refactored to consume this module —
 * extracting its chart math is a worthwhile follow-up with its own regression surface, not a free
 * side-effect of building a new screen.
 *
 * `tickIndices` is imported from `domain/progress/lift-series` rather than reimplemented. It is the
 * design's own four-tick rule and there is no reason for this dashboard to have a second opinion.
 */

// Relative + explicit `.ts`, not the `@/` alias: `node --experimental-strip-types --test` resolves this
// at RUNTIME, and the alias only survives in `import type` lines (which type-stripping erases).
export { tickIndices } from '../progress/lift-series.ts';

/**
 * The sequential ramp, dark → light, for the cohort grid and the funnel.
 *
 * Validated against the card surface (`flColor.charcoal800` #131517): every adjacent pair clears
 * ΔL ≥ 0.06, the hue spread is 9°, and the light end sits at 2.92:1 against the surface. Step 0 is
 * `flColor.bronze600` exactly; the rest are interpolated toward it rather than invented.
 *
 * ⚠ THIS IS A SEQUENTIAL RAMP, NOT A CATEGORICAL PALETTE. It encodes MAGNITUDE. Using it to colour
 *   nominal categories — the top-exercises bars, the activity mix — double-encodes bar length as hue
 *   and is the reason `BarChart` paints every bar one colour.
 */
export const ADMIN_RAMP = ['#765B44', '#8E6E4E', '#A78159', '#C09564', '#D9A970'] as const;

/**
 * Which ramp step a percentage lands on.
 *
 * Returns **-1 for zero**, which is not a ramp step at all — a 0% cohort cell is a real, known fact
 * ("nobody came back") and gets bare surface plus the printed number. That keeps it visually distinct
 * from a cell beyond the cohort's age, which is UNKNOWN and gets bare surface plus nothing.
 * Collapsing those two into the same rendering is the single most common way a cohort grid lies.
 */
export function rampStep(pct: number): number {
  if (!Number.isFinite(pct) || pct <= 0) return -1;
  const clamped = Math.min(pct, 100);
  return Math.min(ADMIN_RAMP.length - 1, Math.floor((clamped - 0.000001) / (100 / ADMIN_RAMP.length)));
}

export type CellState = 'unknown' | 'known';

/**
 * Whether a cohort cell is a fact or a not-yet.
 *
 * `maxK` is how many whole weeks the cohort has actually aged. A cell past it has not happened yet;
 * rendering it as 0% draws a retention cliff that is really just the calendar.
 */
export function cellState(k: number, maxK: number): CellState {
  return k > maxK ? 'unknown' : 'known';
}

/**
 * 1,284 → "1.3K" · 12,900 → "13K" · 1,200,000 → "1.2M".
 *
 * Hand-rolled rather than `toLocaleString` so the tests are deterministic regardless of the device
 * locale, and so Hermes' Intl support is not on the critical path for a number on a tile.
 */
export function compactNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const neg = n < 0;
  const v = Math.abs(n);

  // One significant-figure rule, applied per unit: under 10 keeps a decimal, 10 and over rounds.
  const scale = (x: number, suffix: string) =>
    `${x < 10 ? (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, '') : Math.round(x)}${suffix}`;

  let out: string;
  if (v < 1000) out = String(Math.round(v));
  // ⚠ The boundary is checked AFTER rounding, not before. 999,999 rounds to 1000K, which is not a
  //   number anybody writes — it has to promote to "1M". Testing `v < 1_000_000` first is the bug.
  else if (Math.round(v / 1000) < 1000) out = scale(v / 1000, 'K');
  else out = scale(v / 1_000_000, 'M');

  return neg ? `−${out}` : out;
}

/** Thousands separators, for the places a tile shows the exact figure rather than a compact one. */
export function groupedNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const neg = n < 0;
  const s = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return neg ? `−${s}` : s;
}

export type DeltaDir = 'up' | 'down' | 'flat';
export interface Delta {
  dir: DeltaDir;
  /** "+12%" · "−4%" · "+7" · "no change". Already carries its own sign. */
  text: string;
}

/**
 * A tile's change against the preceding window of equal length.
 *
 * ⚠ DIRECTION IS NEVER COLOUR-ALONE. `greenMuted` and `redMuted` are ΔE 5.1 apart under deuteranopia,
 *   below the 6.0 floor — for a meaningful share of readers they are the same colour. So this returns
 *   text that already carries its sign, and the tile pairs it with an ▲/▼ glyph. Colour reinforces;
 *   it never carries the meaning by itself.
 *
 * ⚠ PERCENT FROM ZERO IS UNDEFINED, NOT INFINITE. Going 0 → 7 reports "+7", not "+Infinity%" and not
 *   "+700%". A dashboard whose first week always reads as an infinite gain teaches its reader to
 *   ignore the delta column.
 */
export function deltaLabel(curr: number | null | undefined, prev: number | null | undefined): Delta | null {
  if (curr == null || prev == null || !Number.isFinite(curr) || !Number.isFinite(prev)) return null;
  const diff = curr - prev;
  if (diff === 0) return { dir: 'flat', text: 'no change' };
  if (prev === 0) return { dir: 'up', text: `+${groupedNumber(diff)}` };
  const pct = (diff / Math.abs(prev)) * 100;
  const rounded = Math.abs(pct) >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10;
  return { dir: diff > 0 ? 'up' : 'down', text: `${diff > 0 ? '+' : '−'}${Math.abs(rounded)}%` };
}

/** Share of a whole, as a rounded percent. Returns null when the denominator cannot support one. */
export function pctOf(part: number | null | undefined, whole: number | null | undefined): number | null {
  if (part == null || whole == null || !Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

export interface ChartBox {
  w: number;
  h: number;
  padX: number;
  padTop: number;
  padBot: number;
}

export const DEFAULT_BOX: ChartBox = { w: 320, h: 140, padX: 6, padTop: 10, padBot: 18 };

export function scaleX(i: number, n: number, box: ChartBox): number {
  if (n <= 1) return box.w / 2;
  return box.padX + (i / (n - 1)) * (box.w - 2 * box.padX);
}

/**
 * `baseline: 'zero'` is the default and is the right answer for every count series on this screen.
 *
 * A signups chart running 3 → 9 drawn against a floor of 3 shows a line that triples in height for a
 * change of six people. Truncating the axis on a count is the classic way to make noise look like a
 * trend, and the operator reading this screen is the person least able to afford that.
 * `'min'` exists for series where the interesting range genuinely does not include zero.
 */
export function scaleY(
  v: number,
  min: number,
  max: number,
  box: ChartBox,
  baseline: 'zero' | 'min' = 'zero',
): number {
  const lo = baseline === 'zero' ? Math.min(0, min) : min;
  // `|| 1` is the divide-by-zero guard MetricDetail relies on: an all-equal series has range 0, and
  // without this every point lands at NaN and the path renders as nothing at all.
  const range = max - lo || 1;
  return box.h - box.padBot - ((v - lo) / range) * (box.h - box.padTop - box.padBot);
}

export function chartPoints(
  values: number[],
  box: ChartBox = DEFAULT_BOX,
  baseline: 'zero' | 'min' = 'zero',
): { x: number; y: number }[] {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  return values.map((v, i) => ({ x: scaleX(i, values.length, box), y: scaleY(v, min, max, box, baseline) }));
}

/** An SVG `d` for the line. Empty string for no data — `<Path d="">` renders nothing and does not throw. */
export function linePath(values: number[], box: ChartBox = DEFAULT_BOX, baseline: 'zero' | 'min' = 'zero'): string {
  const pts = chartPoints(values, box, baseline);
  if (!pts.length) return '';
  // A single point has no line. Draw a short flat segment so the sparkline is not an invisible dot.
  if (pts.length === 1) return `M${(box.padX).toFixed(1)} ${pts[0].y.toFixed(1)} L${(box.w - box.padX).toFixed(1)} ${pts[0].y.toFixed(1)}`;
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

/** The same line closed down to the baseline, for the wash under it. */
export function areaPath(values: number[], box: ChartBox = DEFAULT_BOX, baseline: 'zero' | 'min' = 'zero'): string {
  const line = linePath(values, box, baseline);
  if (!line) return '';
  const pts = chartPoints(values, box, baseline);
  const floor = box.h - box.padBot;
  const firstX = pts.length === 1 ? box.padX : pts[0].x;
  const lastX = pts.length === 1 ? box.w - box.padX : pts[pts.length - 1].x;
  return `${line} L${lastX.toFixed(1)} ${floor.toFixed(1)} L${firstX.toFixed(1)} ${floor.toFixed(1)} Z`;
}

/** Bar length as a fraction of the longest bar. All-zero input gives every bar 0, never NaN. */
export function barFractions(values: number[]): number[] {
  const max = Math.max(0, ...values);
  if (max <= 0) return values.map(() => 0);
  return values.map((v) => Math.max(0, v) / max);
}

/**
 * Three gridline heights and the value each one sits at, for the full LineChart.
 *
 * Solid hairlines, never dashed — a dashed gridline competes with the data line for attention on a
 * chart this small, and `MetricDetail` already settled that question.
 */
export function gridLines(
  values: number[],
  box: ChartBox = DEFAULT_BOX,
  baseline: 'zero' | 'min' = 'zero',
): { f: number; y: number; value: number }[] {
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const lo = baseline === 'zero' ? Math.min(0, min) : min;
  const range = max - lo || 1;
  return [0, 0.5, 1].map((f) => ({
    f,
    y: box.padTop + f * (box.h - box.padTop - box.padBot),
    value: Math.round(max - f * range),
  }));
}
