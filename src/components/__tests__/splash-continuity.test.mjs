/**
 * splash-continuity.test.mjs — the splash hand-off is invisible, or it is a flash.
 *
 * ══ THE DEFECT THIS CLOSES ══
 *
 * Reported from the tester build: *"I open the app, the first splash screen, then a blue splash, then
 * the home screen."* The middle frame was `AnimatedSplashOverlay` filling the screen with **`#208AEF`**
 * — Expo's brand blue, straight out of the `create-expo-app` template — for 600ms on every launch,
 * while the native splash behind it was `#0E0E12`.
 *
 * The component's whole job is to COVER the gap between the native splash disappearing and the first
 * painted frame. It can only do that in the splash's own colour. Any other value is, by construction, a
 * flash of a different product.
 *
 * ══ WHY NO EXISTING CHECK COULD SEE IT ══
 *
 * `animated-icon.web.tsx` returns `null`. The overlay does not exist on web, and **the web preview is
 * where every review of this app happens** — the product owner is on Windows and an iPhone, so the one
 * surface that renders this is the one that cannot be opened during development. tsc, eslint and a web
 * export are all blind to it for the same reason the SVG-alpha bug was: the browser is where it works.
 *
 * So the rule has to be a source assertion, and it has to compare the two values that must agree.
 *
 * Run:  node --test src/components/__tests__/splash-continuity.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');

const appJson = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8'));
const overlaySrc = readFileSync(join(HERE, '..', 'animated-icon.tsx'), 'utf8');

/** The `expo-splash-screen` plugin entry — the colour the OS paints before any JS runs. */
function splashBackground() {
  const plugins = appJson.expo?.plugins ?? [];
  const entry = plugins.find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen');
  assert.ok(entry, 'the expo-splash-screen plugin is no longer configured in app.json');
  return entry[1]?.backgroundColor;
}

test('the JS splash overlay is painted in the native splash’s own colour', () => {
  const native = splashBackground();
  assert.match(native ?? '', /^#[0-9a-fA-F]{6}$/, `splash backgroundColor is not a hex colour: ${native}`);

  const declared = /SPLASH_BACKGROUND\s*=\s*'(#[0-9a-fA-F]{6})'/.exec(overlaySrc)?.[1];
  assert.ok(declared, 'animated-icon.tsx no longer exports a SPLASH_BACKGROUND literal');

  assert.equal(
    declared.toUpperCase(),
    native.toUpperCase(),
    'The overlay covers the gap between the native splash and the first frame. In any colour but the ' +
      "splash's own it IS the gap — which is how #208AEF (Expo blue) shipped to TestFlight.",
  );
});

test('the overlay fill is the declared constant, not a second hard-coded literal', () => {
  // The failure this prevents: someone edits the style and leaves SPLASH_BACKGROUND behind, so the
  // test above keeps passing while the screen flashes again.
  assert.match(
    overlaySrc,
    /backgroundColor:\s*SPLASH_BACKGROUND/,
    'the overlay style must use SPLASH_BACKGROUND so the assertion above is about the rendered colour',
  );
  /*
   * ⚠ COMMENTS ARE STRIPPED FIRST, and the first draft of this test did not do that — it went red on
   * the correct file, because the doc comment above `SPLASH_BACKGROUND` NAMES the bad colour (`#208AEF`)
   * in order to explain the bug. That is the identical shape `svg-gradient-stops.test.mjs` documents:
   * a source guard that must SAY the pattern it forbids will match itself unless it excludes its own
   * prose. Here the exclusion is per-file rather than per-path, because the explanation lives in the
   * file being checked.
   */
  const code = overlaySrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const hexes = code.match(/#[0-9a-fA-F]{6}/g) ?? [];
  const unique = [...new Set(hexes.map((h) => h.toUpperCase()))];
  assert.deepEqual(
    unique,
    [splashBackground().toUpperCase()],
    `animated-icon.tsx carries a colour that is not the splash background: ${unique.join(', ')}`,
  );
});

/**
 * The Expo starter template also left an `AnimatedIcon` rendering `expo-logo.png` behind a blue
 * gradient. It was imported by nothing, and shipping another company's logo inside this product is a
 * different kind of defect from a flash. Removed with its two assets and its CSS module; asserted so it
 * cannot return with the next template merge.
 */
test('no Expo-template branding survives in the splash path', () => {
  assert.doesNotMatch(overlaySrc, /expo-logo|logo-glow|AnimatedIcon/, 'Expo template code is back');
  assert.doesNotMatch(overlaySrc, /experimental_backgroundImage/, 'unsupported style property');
});
