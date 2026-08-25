/**
 * The theme NAME and its validator — the parts with no platform behind them.
 *
 * Split from `theme-choice.ts` because that module has a `.web.ts` twin, and a platform-forked module
 * cannot be imported from domain code: `domain/settings/preferences.ts` is loaded directly by
 * `node --test`, where Metro's platform resolution does not exist and an extensionless import does not
 * resolve at all. This file has no imports, no platform fork and no side effects, so both the web and
 * native halves can build on it and `preferences.ts` can validate against it.
 *
 * ⚠ NO RUNTIME IMPORTS, AND NO `@/`. Keep it that way, or `node --test` stops being able to load the
 *   prefs model — the same rule that governs the rest of `domain/`.
 */

export type ThemeName = 'forge' | 'paper';

/** AsyncStorage / localStorage key. Mirrors `AppPrefs.theme`, which is the server-side truth. */
export const THEME_STORAGE_KEY = 'fl_theme_v1';

/**
 * Forge stays the default.
 *
 * ⚠ This is a launch decision, not a placeholder. Twenty testers are mid-launch on build 6; a default
 *   flip would change the app under all of them at once, for a preference none of them expressed.
 *   Paper is opt-in until it has been walked screen by screen.
 */
export const DEFAULT_THEME: ThemeName = 'forge';

export const isThemeName = (x: unknown): x is ThemeName => x === 'forge' || x === 'paper';

/**
 * ⚠ THE LABEL IS "ALABASTER"; THE ID STAYS `paper`, AND THAT IS DELIBERATE.
 *
 * The id is stored in `profiles.app_prefs` and mirrored to device storage, so renaming it would orphan
 * the preference of anyone who had already chosen it — for a string nobody sees. It also matches the
 * DESIGN source this palette was transcribed from (`forge-paper-theme.js`, the `* - Paper.dc.html`
 * artboards), which keeps the code traceable back to the artboards it came from.
 *
 * Alabaster is a soft white stone used for CARVING, which is the app's own vocabulary — engraved,
 * inscription, sealed, "carved in permanent record". It reads as Forge's equal rather than its absence.
 */
export const THEME_OPTIONS: readonly { id: ThemeName; label: string; hint: string }[] = [
  { id: 'forge', label: 'Forge', hint: 'Dark iron and bronze. The original.' },
  { id: 'paper', label: 'Alabaster', hint: 'Carved white stone and aged brass.' },
];
