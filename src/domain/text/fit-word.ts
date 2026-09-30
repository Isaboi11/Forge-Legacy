// Size a heading so its LONGEST WORD fits the column — words never break mid-word (social2-20, QA 09-26).
//
// "Alternating Dumbbell Bench Press" at 25pt in the workout hero's ~117pt name column broke as
// "Alternatin / g" on an iPhone 14: react-native-web wraps an over-long word anywhere, and a phone clips it.
// Wrapping BETWEEN words is fine — two or three lines is what that heading is designed for — so only the
// longest single word decides the size, and only when it would not fit.
//
// `em` is the average advance of one character as a fraction of the font size. Playfair Display semibold
// measures ≈0.45 on real names; 0.5 leaves room for wide capitals. Pure, so it is testable.

export function fitWordFontSize(text: string, availablePt: number, max: number, min: number, em = 0.5): number {
  const longest = Math.max(1, ...text.split(/\s+/).map((w) => w.length));
  const fit = Math.floor(availablePt / (longest * em));
  return Math.max(min, Math.min(max, fit));
}
