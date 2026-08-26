/**
 * The themed half of `paper-scrim` — the one every SCREEN should call.
 *
 * ══ WHY THIS FILE EXISTS, AND THE BUG THAT CREATED IT ══
 *
 * `paperScrim` is a PURE function with no idea which palette is live. It flips any near-black `rgba`
 * to cream and it does that in BOTH themes, by construction — it cannot import `IS_PAPER`, because it
 * is deliberately free of runtime imports so `node --test` can reach it (`paper-scrim.test.mjs` is the
 * only thing standing between that classifier and a silent app-wide regression).
 *
 * So the gate has to live at the call site. `screen-background.tsx` had it, as a private one-liner:
 *
 *     const themeScrim = (color: string) => (IS_PAPER ? paperScrim(color) : color)
 *
 * and it was the ONLY caller that did. Fifteen other call sites across fourteen screens called
 * `paperScrim` directly, so every one of them painted a CREAM commit bar, footer or sheet backdrop
 * over Forge's near-black — `rgba(9,9,9,0.4)` came back as `rgba(247,243,234,0.4)` whichever theme was
 * running. The Alabaster pass introduced them; nothing on the dark side had been looked at since.
 *
 * The one-liner is now shared and exported, and the screens import THIS instead. A screen that reaches
 * for the pure function directly is now the odd one out rather than the majority.
 *
 * ⚠ THE GATE IS NOT REDUNDANT, WHICH IS THE EASY MISREADING. `paperScrim`'s "is this a darkening
 *   scrim?" check classifies the INPUT — it does not ask which theme is running. Every one of these
 *   inputs is a darkening scrim in both themes; that is exactly why they all flipped.
 */

import { IS_PAPER } from './foundation';
import { paperScrim } from './paper-scrim';

/**
 * Flip a darkening scrim to its lightening twin, but only on Alabaster.
 *
 * Forge gets the string back untouched — identity, not a near-identity — so a screen that adopts this
 * is provably unchanged on the dark side.
 */
export function themeScrim(color: string): string {
  return IS_PAPER ? paperScrim(color) : color;
}
