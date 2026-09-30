// A font size at which the LONGEST WORD of a short value fits its box — words never break mid-word
// (QA 09-26 holtai-17, social2-20). react-native-web wraps an over-long word anywhere: "Intermediate" in a
// three-across stat cell broke as "Intermediat / e", and "Alternating Dumbbell Bench Press" in the workout
// hero's ~117pt name column as "Alternatin / g". Wrapping BETWEEN words is fine, so only the longest single
// word decides the size, and only when it would not fit. Pure and dependency-free.

/**
 * The largest size, from `base` down to `min`, at which every word of `value` fits `width` points.
 * `em` is the average advance of one character as a share of the font size — generous by default, so a
 * fit is a fit (Playfair Display semibold measures about 0.45 on real names). `width <= 0` (not measured
 * yet) returns `base`.
 */
export function fitWordSize(value: string, width: number, base: number, min = 12, em = 0.55): number {
  if (!(width > 0)) return base;
  const longest = value.split(/\s+/).reduce((n, w) => Math.max(n, w.length), 0);
  if (longest === 0) return base;
  const fits = Math.floor(width / (longest * em));
  return Math.max(min, Math.min(base, fits));
}

/** The same rule with the workout hero's argument order and its 0.5 em (social2-20). */
export function fitWordFontSize(text: string, availablePt: number, max: number, min: number, em = 0.5): number {
  return fitWordSize(text, availablePt, max, min, em);
}
