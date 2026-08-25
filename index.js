// `@expo/metro-runtime` MUST be the first import to ensure Fast Refresh works on web.
// Copied from `expo-router/entry-classic`, which this file replaces.
import '@expo/metro-runtime';

import { renderRootComponent } from 'expo-router/build/renderRootComponent';

import Boot from './src/boot';

/**
 * Custom entry — the app's root is a GATE, not the router.
 *
 * `expo-router/entry` registers `App` directly. `Boot` wraps it and holds the first render until the
 * athlete's theme has been read, because this app's stylesheets are module-scope and freeze their
 * colours the moment a route module is required. See `src/boot.tsx` for the full reasoning.
 *
 * ⚠ `package.json` → `main` points here instead of `expo-router/entry`. Verified BEFORE writing it:
 *   this does NOT move the fingerprint (`411fd2b6…`, identical to build 6), so the change is
 *   deliverable over the air and does not strand the testers on a build that cannot accept it.
 *
 * ⚠ `renderRootComponent`, not `registerRootComponent` — it is what expo-router itself calls, and it
 *   carries the error-overlay and dev-client wiring that a bare registration would drop.
 */
renderRootComponent(Boot);
