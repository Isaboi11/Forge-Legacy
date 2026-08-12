/**
 * Text width estimation and wrapping for the share card, without a canvas.
 *
 * ══ WHY THIS EXISTS ══
 *
 * `share-image.web.ts` composes the card with Canvas 2D and calls `ctx.measureText` to wrap copy and to
 * size the Then/Now chip. React Native has no canvas and no measurement primitive that can be called
 * synchronously while laying out — `react-native-svg` will draw the text but will not tell you how wide it
 * came out. So the native port needs its own estimator, and every geometry decision on the card flows
 * through it.
 *
 * ══ WHAT IT IS, HONESTLY ══
 *
 * An advance-width model, not a font engine. Each character is assigned a width as a fraction of the font
 * size, grouped by class, from the metrics of the two faces the card actually uses. It is deliberately
 * biased to OVER-estimate: a wrap that breaks one word early is a card that still looks composed, while a
 * wrap that breaks one word late is text running off the edge of an image somebody is about to post.
 *
 * Do not reach for per-glyph exactness here. The card's own layout absorbs a few percent — copy is centred
 * with generous side padding — and the failure this guards against is overflow, not raggedness.
 */

/** The two faces the card draws in. Their advance ratios differ enough to matter at 26–62px. */
export type CardFace = 'sans' | 'serif';

/**
 * Advance width as a fraction of font size, by character class.
 *
 * Calibrated against the stacks in `share-image.web.ts` — a system sans (SF Pro / Roboto / Segoe) and
 * Playfair Display for the serif. The serif runs slightly narrower at body sizes and its caps are wider,
 * which is why it gets its own column rather than a single fudge factor.
 */
const ADVANCE: Record<CardFace, { narrow: number; digit: number; wide: number; caps: number; def: number; space: number }> = {
  sans:  { narrow: 0.30, digit: 0.56, wide: 0.86, caps: 0.66, def: 0.53, space: 0.27 },
  serif: { narrow: 0.28, digit: 0.50, wide: 0.88, caps: 0.70, def: 0.50, space: 0.25 },
};

/** `iljt` and friends carry barely a third of a normal advance; punctuation less still. */
const NARROW = new Set(['i', 'j', 'l', 't', 'f', 'r', 'I', '.', ',', ':', ';', '!', "'", '’', '|', '(', ')', '[', ']', ' ']);
const WIDE = new Set(['m', 'w', 'M', 'W', '@', '—', '–']);

/**
 * Estimated width of `text` in pixels.
 *
 * `letterSpacing` matters more than it looks: the card sets 2–5px tracking on every uppercase label, and
 * at 20px/700 across "TRANSFORMATION" that is 28px of width the canvas version measured and this one would
 * otherwise lose.
 */
export function measureText(text: string, fontSize: number, face: CardFace = 'sans', letterSpacing = 0): number {
  if (!text) return 0;
  const a = ADVANCE[face];
  let w = 0;
  for (const ch of text) {
    if (ch === ' ') w += a.space;
    else if (NARROW.has(ch)) w += a.narrow;
    else if (WIDE.has(ch)) w += a.wide;
    else if (ch >= '0' && ch <= '9') w += a.digit;
    else if (ch >= 'A' && ch <= 'Z') w += a.caps;
    else w += a.def;
  }
  // Tracking applies between glyphs, so one fewer gap than characters — the off-by-one is 5px at the
  // card's largest tracking, which is exactly the kind of drift that accumulates into an overflow.
  return w * fontSize + Math.max(0, [...text].length - 1) * letterSpacing;
}

/**
 * Break `text` into lines that each fit `maxWidth`.
 *
 * Mirrors the canvas version's algorithm exactly — greedy, whitespace-collapsing, and never breaking a
 * single over-long word — so that a card composed natively and one composed in the browser wrap at the
 * same points and read as the same artifact.
 */
export function wrapText(text: string, maxWidth: number, fontSize: number, face: CardFace = 'sans', letterSpacing = 0): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && measureText(next, fontSize, face, letterSpacing) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      // A word longer than the whole line still gets its own line rather than being split mid-glyph: the
      // canvas version does the same, and hyphenating an athlete's own words is worse than one long row.
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Width of the Then/Now chip: the label's own width plus the 28px of horizontal padding the canvas
 * version adds. Kept here rather than inline so both implementations round the same way.
 */
export function chipWidth(label: string, fontSize = 20, letterSpacing = 0): number {
  return measureText(label.toUpperCase(), fontSize, 'sans', letterSpacing) + 28;
}
