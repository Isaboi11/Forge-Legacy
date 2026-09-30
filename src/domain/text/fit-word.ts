// A font size at which the LONGEST WORD of a short value fits a fixed-width cell (QA holtai-17).
// "Intermediate" in a three-across stat cell broke as "Intermediat / e": a single word wider than its box is
// split mid-word on web, and the only honest fixes are a smaller size or a wider box. Words still wrap at
// spaces ("Get stronger" is two lines, never "Get stro / nger"). Pure and dependency-free.

/** Average glyph width as a share of the font size — deliberately generous, so a fit is a fit. */
const GLYPH_EM = 0.55;

/**
 * The largest size, from `base` down to `min`, at which every word of `value` fits `width` points.
 * `width <= 0` (not measured yet) returns `base`.
 */
export function fitWordSize(value: string, width: number, base: number, min = 12): number {
  if (!(width > 0)) return base;
  const longest = value.split(/\s+/).reduce((n, w) => Math.max(n, w.length), 0);
  if (longest === 0) return base;
  const fits = Math.floor(width / (longest * GLYPH_EM));
  return Math.max(min, Math.min(base, fits));
}
