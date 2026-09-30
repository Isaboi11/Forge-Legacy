/**
 * The invite code's font size, fitted to the phone (visualB-02, QA 09-26).
 *
 * `adjustsFontSizeToFit` is native-only; on web an iPhone SE cut the code to "QASQ-56…", which is a code
 * nobody can type. The hero is drawn in a monospace face, so its width is predictable: every glyph advances
 * ~0.602em, plus letter-spacing that scales with the size (8 at 38, also used as left padding so the
 * spaced-out code stays centred). The row is the window less the scroll gutters (2×20), the card's
 * padding (2×20) and its 1pt border.
 */
export const INVITE_CODE_MAX = 38;
export const INVITE_CODE_MIN = 16;
/** Letter-spacing per point of font size — 8 at the design's 38. */
export const INVITE_CODE_SPACING = 8 / INVITE_CODE_MAX;

const MONO_ADVANCE = 0.602;
const CHROME = 20 * 2 + 20 * 2 + 2;

export function inviteCodeFontSize(windowWidth: number, length: number): number {
  const avail = windowWidth - CHROME;
  if (!(length > 0) || !(avail > 0)) return INVITE_CODE_MAX;
  // `length` glyphs each advancing (0.602 + spacing)em, plus the left padding of one spacing.
  const fit = Math.floor(avail / (length * (MONO_ADVANCE + INVITE_CODE_SPACING) + INVITE_CODE_SPACING));
  return Math.max(INVITE_CODE_MIN, Math.min(INVITE_CODE_MAX, fit));
}

/** The full width the code will draw at a given size — what the test checks against the row. */
export function inviteCodeWidth(fontSize: number, length: number): number {
  return length * fontSize * (MONO_ADVANCE + INVITE_CODE_SPACING) + fontSize * INVITE_CODE_SPACING;
}

export const INVITE_CODE_ROW_CHROME = CHROME;
