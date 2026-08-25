/**
 * Turning a darkening scrim into a lightening one — the pure half of `ScreenBackground`'s Paper Mode.
 *
 * Split out because the interesting part is arithmetic on a colour string and the file it came from
 * imports react-native, where `node --test` cannot reach it. Same reason `weekly-review-seen-model`
 * and `rest-timer-pref-model` exist: a rule that decides how 205 screens look should be provable, and
 * the only thing standing between this and a silent app-wide regression is the assertions in
 * `paper-scrim.test.mjs`.
 *
 * ⚠ NO RUNTIME IMPORTS, AND NO `@/`. Keep it that way — `@/` does not resolve under `node --test`.
 */

/** `--fl-paper` scrim: the cream that replaces the near-black in a darkening overlay. */
export const PAPER_SCRIM_RGB = '247,243,234';

/**
 * The ceiling for "this is a darkening scrim rather than a colour".
 *
 * ⚠ THIS WAS 40 AND 40 WAS WRONG — the margin test caught it, which is the entire reason that test
 *   exists. Paper's own `--fl-overlay-dark` (the modal backdrop) is `rgba(35,31,26,0.42)`: a real ink
 *   colour that sits *below* 40 and would have been silently flipped to cream, turning every modal
 *   backdrop into a white-out. It was under the line by 5, which is exactly the kind of gap that holds
 *   until the day someone darkens a token by a hair.
 *
 * The two populations, measured rather than assumed:
 *   · darkening scrims  — 23 real values, brightest channel **8**  (`rgba(8,6,5,0.62)`)
 *   · real colours      — brightest-channel floor **35** (`rgba(35,31,26,0.42)`)
 *
 * 20 sits between them with 12 of margin below and 15 above, so the classifier is separating two
 * genuinely distinct populations rather than being fitted to today's list. `paper-scrim.test.mjs`
 * asserts that separation on both sides and will fail if either population drifts toward the line.
 */
export const DARK_SCRIM_MAX_CHANNEL = 20;

/**
 * Flip one scrim colour from darkening to lightening, PRESERVING ITS ALPHA EXACTLY.
 *
 * The alpha does not mean "how dark". It means how much of the background plate is suppressed — a
 * composition decision the screen's author took from its `.dc`, and one that is just as true on paper.
 * Rescaling it would re-art-direct all 205 screens; swapping the three colour channels does not.
 *
 * Anything that is not a near-black rgba is returned untouched, so a screen that genuinely wants a
 * coloured wash keeps the colour it asked for.
 */
export function paperScrim(color: string): string {
  const m = /^\s*rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)\s*$/i.exec(color);
  if (!m) return color;
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  if (Math.max(r, g, b) > DARK_SCRIM_MAX_CHANNEL) return color;
  const alpha = m[4] === undefined ? 1 : Number(m[4]);
  return `rgba(${PAPER_SCRIM_RGB},${alpha})`;
}
