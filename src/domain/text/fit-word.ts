// A font size at which the LONGEST WORD of a short value fits its box — words never break mid-word
// (QA 09-26 holtai-17, social2-20). react-native-web wraps an over-long word anywhere: "Intermediate" in a
// three-across stat cell broke as "Intermediat / e", and "Alternating Dumbbell Bench Press" in the workout
// hero's ~117pt name column as "Alternatin / g". Wrapping BETWEEN words is fine, so only the longest single
// word decides the size, and only when it would not fit. Pure and dependency-free.
//
// THE ONE RULE FOR THIS BUG. A caller that already knows its box (the stat grid, the workout hero) passes the
// guessed `em`; `components/forge/FitText` — Home's titles, home-06 — measures the word and its own width and
// passes `measuredEm`. Do not add a second sizing rule beside it.

/**
 * The largest size, from `base` down to `min`, at which every word of `value` fits `width` points.
 * `em` is the average advance of one character as a share of the font size — generous by default, so a
 * fit is a fit (Playfair Display semibold measures about 0.45 on real names). `width <= 0` (not measured
 * yet) returns `base`.
 */
export function fitWordSize(value: string, width: number, base: number, min = 12, em = 0.55): number {
  if (!(width > 0)) return base;
  const longest = longestWord(value).length;
  if (longest === 0) return base;
  const fits = Math.floor(width / (longest * em));
  return Math.max(min, Math.min(base, fits));
}

/** The word `fitWordSize` sizes by: the longest by characters (the first, on a tie). Hyphens stay in it. */
export function longestWord(value: string): string {
  let best = '';
  for (const w of value.split(/\s+/)) if (w.length > best.length) best = w;
  return best;
}

/**
 * `em` MEASURED rather than guessed — for `FitText` (home-06), which lays the longest word out once at the
 * designed size and reads its real width. 0 until there is a measurement, which `fitWordSize` must not be
 * given: callers keep the base size until then.
 */
export function measuredEm(word: string, wordWidth: number, fontSize: number): number {
  if (!(wordWidth > 0) || !(fontSize > 0) || word.length === 0) return 0;
  return wordWidth / (word.length * fontSize);
}

/** The same rule with the workout hero's argument order and its 0.5 em (social2-20). */
export function fitWordFontSize(text: string, availablePt: number, max: number, min: number, em = 0.5): number {
  return fitWordSize(text, availablePt, max, min, em);
}
