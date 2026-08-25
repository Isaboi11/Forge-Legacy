/**
 * Which theme the token modules resolve to — `forge` (dark) or `paper` (light).
 *
 * ══ WHY THIS IS READ ONCE, AT MODULE INIT, AND NEVER AGAIN ══
 *
 * 277 of the app's 277 `StyleSheet.create` calls are at MODULE SCOPE, holding ~5,700 colour lines.
 * A module-scope stylesheet is evaluated once, when the module is first `require`d, and can never
 * react to a value that changes later. Making the theme live would mean rewriting every one of those
 * 240 files into a `useMemo(() => makeStyles(t), [t])` factory — a mechanical change across the whole
 * app with a visual-regression risk on every screen.
 *
 * So the theme is resolved BEFORE those modules evaluate, and switching it reloads the JS. Every
 * stylesheet then picks up the correct value on the way back up, with no edits at all. The cost is a
 * ~1s restart when an athlete flips the setting, which is why the setting says so before it does it.
 *
 * ⚠ THE READ MUST BE SYNCHRONOUS, and that is the whole difficulty on native.
 *
 *   · WEB — `localStorage` is synchronous, so `theme-choice.web.ts` resolves at module init and this
 *     problem does not exist. That is the platform the PO reviews, and it is complete.
 *
 *   · NATIVE — AsyncStorage has no synchronous API, and there is no sync storage in this dependency
 *     set (no MMKV, no expo-sqlite; adding one is a NATIVE MODULE, which would strand every OTA to
 *     the build the testers are holding). So the value is late-bound: `activeTheme()` is a function,
 *     not a `const`, and the boot gate calls `__setBootTheme` before the router mounts a single route.
 *     Route modules load lazily through `expo-router/_ctx`'s `require.context`, so nothing that
 *     consumes a token has evaluated by then.
 *
 * ⚠ UNTIL THE BOOT GATE IS WIRED AND MEASURED ON A DEVICE, NATIVE RESOLVES TO `forge` — today's
 *   behaviour exactly, and zero risk to the testers on build 6. A launch crash has shipped from this
 *   repo with every gate green; the boot path is not a place to guess.
 */

import { DEFAULT_THEME, isThemeName, THEME_STORAGE_KEY, type ThemeName } from './theme-choice-shared.ts';

export { DEFAULT_THEME, isThemeName, THEME_STORAGE_KEY, THEME_OPTIONS, type ThemeName } from './theme-choice-shared.ts';

/**
 * Whether `activeTheme()` is already correct at import time.
 *
 * FALSE here: AsyncStorage is a promise, so native cannot know the theme until `Boot` has awaited it.
 * TRUE on web, where `localStorage` is synchronous — which is why the boot gate holds a frame on one
 * platform and not the other.
 */
export const THEME_IS_SYNC = false;

let active: ThemeName = DEFAULT_THEME;

/**
 * The resolved theme. A FUNCTION, not a `const` — `foundation.ts` calls it at ITS module scope, which
 * runs after the boot gate. Exporting a const here would capture the default before the gate ran.
 */
export function activeTheme(): ThemeName {
  return active;
}

/**
 * Set by the boot gate only, before any route module evaluates. Not a runtime theme switch — calling
 * this after a screen has mounted changes nothing already rendered, because the stylesheets are frozen.
 */
export function __setBootTheme(name: ThemeName): void {
  active = isThemeName(name) ? name : DEFAULT_THEME;
}

/**
 * Read the stored choice. Native: AsyncStorage, imported lazily so this module stays free of
 * react-native at import time. Never rejects — an unreadable preference is `forge`, not a crash.
 */
export async function loadStoredTheme(): Promise<ThemeName> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const raw = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    return isThemeName(raw) ? raw : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** Mirror the server-side `AppPrefs.theme` down to local storage so the next boot can read it. */
export async function persistTheme(name: ThemeName): Promise<void> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(THEME_STORAGE_KEY, name);
  } catch {
    /* a preference that fails to mirror costs one reload, never a crash */
  }
}

/**
 * Save the choice and restart into it. The ONLY supported way to change theme at runtime.
 *
 * ⚠ THE RELOAD IS THE MECHANISM, NOT A WORKAROUND. Module-scope stylesheets have already frozen their
 *   colours; without a restart the athlete would get a half-themed app, which is worse than either
 *   theme. Tell them it will restart BEFORE calling this.
 */
export async function applyThemeAndReload(name: ThemeName): Promise<void> {
  await persistTheme(name);
  try {
    const Updates = await import('expo-updates');
    await Updates.reloadAsync();
  } catch {
    // Reload is unavailable in Expo Go and in a dev client without updates. The preference is already
    // saved, so the next cold start lands on it — never leave the athlete with nothing having happened.
    __setBootTheme(name);
  }
}
