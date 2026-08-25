import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { __setBootTheme, loadStoredTheme, THEME_IS_SYNC } from '@/constants/theme-choice';

/**
 * The boot gate — resolve the athlete's theme BEFORE a single route module evaluates.
 *
 * ══ WHY THE APP NEEDS A GATE AT ALL ══
 *
 * PO: *"I clicked on Paper in my preferences and it didn't change anything."* Correct, and the reason
 * is structural rather than a missed wire. This app's 277 `StyleSheet.create` calls are at MODULE
 * SCOPE: they freeze their colours the instant a module is first required, so the palette has to be
 * known before that happens. On WEB `localStorage` is synchronous and `theme-choice.web.ts` simply
 * reads it at import. On NATIVE the only storage available is AsyncStorage, which is a promise — there
 * is nothing to read synchronously, so the theme could not be known in time and native was pinned to
 * Forge no matter what the setting said.
 *
 * ⚠ THE ROUTE TREE IS LAZY, AND THAT IS WHAT MAKES THIS POSSIBLE. `expo-router` builds its route map
 *   from a `require.context`, but the individual route modules — `_layout.tsx` and every screen — are
 *   only evaluated when a route actually RENDERS. So holding the render for one AsyncStorage read
 *   holds the entire token layer with it. The existing boot hold inside `_layout.tsx` could never do
 *   this job: by the time it runs, `_layout` has already imported `foundation`.
 *
 * ⚠ THIS FILE MUST NOT IMPORT A TOKEN, DIRECTLY OR THROUGH ANYTHING ELSE. It renders before the theme
 *   is known; touching `@/constants/foundation` here would evaluate the palette at exactly the moment
 *   this exists to postpone, and pin it to the default again. That is why the hold below is a bare
 *   `View` with a literal colour and not `ForgeSplash`, which is the natural thing to reach for and
 *   would silently defeat the whole mechanism.
 *
 * ⚠ THE HOLD IS THE SPLASH'S OWN COLOUR (`app.json` → `expo-splash-screen.backgroundColor`), so the
 *   frame the OS is already showing does not change while we wait. An Alabaster athlete sees this dark
 *   frame for the length of one AsyncStorage read before the app draws light — the same hand-off the
 *   native splash already makes, and it cannot be avoided: the native splash is build config and
 *   cannot know a per-athlete preference.
 *
 * ⚠ IT FAILS OPEN. Any throw, and the app mounts on the default theme rather than not mounting. A
 *   launch path that can hang is worse than a theme that did not apply, and this repo has shipped a
 *   launch crash with every gate green before.
 */
export default function Boot() {
  /*
   * ⚠ NO HOLD ON WEB. `localStorage` is synchronous, so `theme-choice.web.ts` has already resolved the
   * palette at import and there is nothing to wait for — holding a frame there would add a dark flash
   * to the one surface that never needed this gate, on the platform the PO reviews.
   */
  const [ready, setReady] = useState(THEME_IS_SYNC);

  useEffect(() => {
    if (THEME_IS_SYNC) return;
    let live = true;
    const done = () => {
      if (live) setReady(true);
    };
    loadStoredTheme()
      .then((theme) => __setBootTheme(theme))
      .catch(() => {
        /* an unreadable preference is the default theme, never a blocked launch */
      })
      .finally(done);

    /* A belt-and-braces release: if the read never settles at all, the app still opens. */
    const bail = setTimeout(done, 2000);
    return () => {
      live = false;
      clearTimeout(bail);
    };
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#0E0E12' }} />;

  /*
   * Required HERE rather than imported at the top, and the distinction is the whole point: a top-level
   * import evaluates `expo-router`'s entry — and with it the route context — before the effect above
   * has run. Metro caches the module, so this costs one lookup per render after the first.
   */
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { App } = require('expo-router/build/qualified-entry') as { App: () => React.ReactNode };
  return <App />;
}
