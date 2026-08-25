/**
 * Forge Legacy — Visual Foundation (v2)
 *
 * RN bridge for the `--fl-*` tokens defined in the Claude Design "Forge Legacy Blueprint" project
 * (Visual Foundation, tokens/foundation.css). This is the approved material/atmosphere layer —
 * additive to `@/constants/tokens`, not a replacement. Existing LEGACY components keep consuming
 * `@/constants/tokens`; new compositions consume this file instead.
 *
 * ══ THIS FILE IS NOW A SELECTOR, AND ITS PUBLIC SHAPE HAS NOT CHANGED ══
 *
 * The values moved to `foundation.forge.ts` (dark, verbatim) and `foundation.paper.ts` (light). Every
 * export below is named and shaped exactly as before, so **all 184 consumers are untouched** — nobody
 * imports a theme, they import `flColor` and get the right one.
 *
 * ⚠ THE CHOICE IS RESOLVED AT MODULE INIT AND CANNOT CHANGE AFTERWARDS. `activeTheme()` is called ONCE,
 *   here, on the way in. That is not a limitation to work around — it is the mechanism: 277 module-scope
 *   `StyleSheet.create` calls freeze their colours the moment they are required, so the only honest way
 *   to re-theme all of them is to be correct before they run and to reload when the athlete switches.
 *   `theme-choice.ts` carries the full reasoning and the native caveat.
 *
 * ⚠ DO NOT ADD A COLOUR HERE. Add it to BOTH palette files. The shape types exported by
 *   `foundation.forge.ts` make a one-sided addition a compile error, which is the only thing standing
 *   between this and a screen that is quietly wrong in one theme.
 */

// ⚠ `theme-choice` is imported WITHOUT an extension ON PURPOSE. It has a `.web.ts` twin, and an
//   explicit `.ts` bypasses Metro's platform resolution — which would silently take web off the
//   synchronous localStorage path and leave Paper Mode dead on the one surface the PO reviews.
import { activeTheme } from './theme-choice';
import * as forge from './foundation.forge.ts';
import * as paper from './foundation.paper.ts';

const t = activeTheme() === 'paper' ? paper : forge;

/** Which palette this bundle resolved to. Read it to BRANCH BEHAVIOUR, never to pick a colour. */
export const ACTIVE_THEME = activeTheme();
export const IS_PAPER = ACTIVE_THEME === 'paper';

export const flColor = t.flColor;
export const flText = t.flText;
export const flIcon = t.flIcon;
export const flGradient = t.flGradient;
export const flShadow = t.flShadow;
export const flBorder = t.flBorder;
export const flType = t.flType;

// Theme-independent — radii, the font stack and motion are the same in both palettes.
export { flRadius, flFont, flMotion } from './foundation.shared.ts';

export type { FlGradientStops } from './foundation.forge.ts';
