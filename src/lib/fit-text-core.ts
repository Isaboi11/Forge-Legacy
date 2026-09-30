/**
 * fit-text-core — the sizing rule behind `FitText`, with no React in it, so `node --test` can run it.
 *
 * ══ THE DEFECT ══
 *
 * A word that is wider than the line it is given gets cut THROUGH: "Confide / nce", "Competitio / ns",
 * "Alternatin / g Dumbbell Bench Press", "Intermediat / e" (home-06, firstuser-08, social2-20, holtai-17 —
 * QA 09-26). Nothing in the app asks for that. It is what every text engine does — the browser's
 * `overflow-wrap: break-word`, which react-native-web sets on every `<Text>`, and iOS's own line breaker —
 * when the alternative is drawing outside the box. So it is not one bad style to delete; it is one
 * missing rule: **a heading set in a fixed size does not fit a column narrower than its longest word.**
 *
 * ══ THE RULE ══
 *
 * Shrink the type until the longest word fits the width it was actually given, and no further. Lines
 * then break BETWEEN words, which is the only place a title should break. Below the floor the font stops
 * shrinking — at that point the column is the problem, and a 7px title is not a fix for it.
 */

/** The longest whitespace-delimited word. Hyphens are kept: a break after one is a fair break. */
export function longestWord(text: string): string {
  let best = '';
  for (const w of text.split(/\s+/)) if (w.length > best.length) best = w;
  return best;
}

/**
 * The scale (0–1] to apply to the font so a word `wordWidth` wide fits in `available`.
 *
 * @param available  The width the text was laid out in, in px. 0 = not measured yet.
 * @param wordWidth  The longest word's width at the style's OWN font size, in px. 0 = not measured yet.
 * @param minScale   The floor. The type never gets smaller than this fraction of its designed size.
 *
 * ⚠ 1 UNTIL BOTH ARE KNOWN. The first frame draws at the designed size; guessing a scale from a width
 * that has not been measured would shrink titles that fit.
 *
 * ⚠ A PIXEL OF SLACK. Layout widths are rounded and glyph advances are not, so a word scaled to exactly
 * the column can still measure a fraction over it and break anyway — the one outcome this exists to stop.
 */
export function fitFontScale(available: number, wordWidth: number, minScale: number): number {
  if (!(available > 0) || !(wordWidth > 0)) return 1;
  if (wordWidth <= available) return 1;
  const scale = (available - 1) / wordWidth;
  return Math.max(minScale, Math.min(1, scale));
}

/**
 * Should a newly-reported width replace the one in state?
 *
 * Shrinking the font can move the text's own measured width by a fraction of a pixel, which would
 * change the scale, which would move the width again. Sub-pixel jitter is ignored so the text settles
 * in one pass instead of creeping downwards for as long as the screen is open.
 */
export function widthChanged(prev: number, next: number): boolean {
  return Math.abs(prev - next) > 1;
}
