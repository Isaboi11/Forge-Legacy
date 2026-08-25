/**
 * Web half of the theme choice. See `theme-choice.ts` for why this is resolved at module init.
 *
 * `localStorage` is SYNCHRONOUS, so the web build has none of the native difficulty: the value is
 * known before a single token module evaluates, and no boot gate is needed. This is the platform the
 * PO reviews at forgelegacy.expo.app, so Paper Mode is fully live here.
 *
 * ⚠ THE READ IS GUARDED, and not defensively-for-the-sake-of-it. `expo export` PRERENDERS every route
 *   in Node during the static web export, where `localStorage` does not exist at all. An unguarded
 *   read throws at build time, not at runtime, and takes the whole export with it.
 */

import { DEFAULT_THEME, isThemeName, THEME_STORAGE_KEY, type ThemeName } from './theme-choice-shared.ts';

export { DEFAULT_THEME, isThemeName, THEME_STORAGE_KEY, THEME_OPTIONS, type ThemeName } from './theme-choice-shared.ts';

/**
 * Build-time override, for producing a whole-app Paper build to review.
 *
 * `EXPO_PUBLIC_FL_THEME=paper npx expo export --platform web` gives a bundle that is Paper everywhere,
 * which is how the theme gets looked at before the Preferences row exists to switch it. It is a
 * FALLBACK, not a lock: a stored choice always wins, so a deployed override build still lets an
 * athlete switch back.
 *
 * ⚠ Unset it before a production deploy. `process.env.EXPO_PUBLIC_*` is inlined by Metro at BUILD
 *   time, so a build made with this set carries Paper as its default forever, on every device that
 *   loads it and has nothing stored.
 */
const BUILD_OVERRIDE: ThemeName | null = isThemeName(process.env.EXPO_PUBLIC_FL_THEME)
  ? process.env.EXPO_PUBLIC_FL_THEME
  : null;

function readSync(): ThemeName {
  try {
    if (typeof localStorage === 'undefined') return BUILD_OVERRIDE ?? DEFAULT_THEME; // Node, during prerender
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeName(raw)) return raw;
    return BUILD_OVERRIDE ?? DEFAULT_THEME;
  } catch {
    return BUILD_OVERRIDE ?? DEFAULT_THEME; // private mode / blocked site data
  }
}

/** TRUE: `localStorage` is synchronous, so the theme is right before a single token module evaluates. */
export const THEME_IS_SYNC = true;

let active: ThemeName = readSync();

export function activeTheme(): ThemeName {
  return active;
}

export function __setBootTheme(name: ThemeName): void {
  active = isThemeName(name) ? name : DEFAULT_THEME;
}

export async function loadStoredTheme(): Promise<ThemeName> {
  return readSync();
}

export async function persistTheme(name: ThemeName): Promise<void> {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(THEME_STORAGE_KEY, name);
  } catch {
    /* a preference that fails to mirror costs one reload, never a crash */
  }
}

/** Save the choice and restart into it. See the native twin for why a reload is the mechanism. */
export async function applyThemeAndReload(name: ThemeName): Promise<void> {
  await persistTheme(name);
  try {
    if (typeof location !== 'undefined') location.reload();
  } catch {
    __setBootTheme(name);
  }
}
