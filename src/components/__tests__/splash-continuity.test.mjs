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
const splashSrc = readFileSync(join(HERE, '..', 'forge-splash.tsx'), 'utf8');
const layoutSrc = readFileSync(join(ROOT, 'src', 'app', '_layout.tsx'), 'utf8');
const homeSrc = readFileSync(join(ROOT, 'src', 'app', '(tabs)', 'index.tsx'), 'utf8');

/** The `expo-splash-screen` plugin entry — what the OS paints before any JS runs. */
function splashPlugin() {
  const plugins = appJson.expo?.plugins ?? [];
  const entry = plugins.find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen');
  assert.ok(entry, 'the expo-splash-screen plugin is no longer configured in app.json');
  return entry[1] ?? {};
}

const splashBackground = () => splashPlugin().backgroundColor;

/**
 * ⚠ EVERY SOURCE ASSERTION IN THIS FILE RUNS ON THIS, and the reason is worth stating once: the first
 * draft of the test below went red on a CORRECT file, because the doc comment it was checking NAMES the
 * bad value (`#208AEF`) in order to explain the bug. A guard that must say the pattern it forbids will
 * always match itself unless it excludes its own prose.
 */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

test('the JS splash is painted in the native splash’s own colour', () => {
  const native = splashBackground();
  assert.match(native ?? '', /^#[0-9a-fA-F]{6}$/, `splash backgroundColor is not a hex colour: ${native}`);

  const declared = /SPLASH_BACKGROUND\s*=\s*'(#[0-9a-fA-F]{6})'/.exec(splashSrc)?.[1];
  assert.ok(declared, 'forge-splash.tsx no longer exports a SPLASH_BACKGROUND literal');

  assert.equal(
    declared.toUpperCase(),
    native.toUpperCase(),
    'ForgeSplash covers the gap between the native splash and the first frame. In any colour but the ' +
      "splash's own it IS the gap — which is how #208AEF (Expo blue) shipped to TestFlight.",
  );
});

test('the splash fill is the declared constant, not a second hard-coded literal', () => {
  // The failure this prevents: someone edits the style and leaves SPLASH_BACKGROUND behind, so the
  // test above keeps passing while the screen flashes again.
  assert.match(
    splashSrc,
    /backgroundColor:\s*SPLASH_BACKGROUND/,
    'the splash style must use SPLASH_BACKGROUND so the assertion above is about the rendered colour',
  );
  // Comments stripped first — see `stripComments`. The identical shape `svg-gradient-stops.test.mjs`
  // documents, and here the explanation lives inside the very file being checked.
  for (const [name, src] of [
    ['forge-splash.tsx', splashSrc],
    ['animated-icon.tsx', overlaySrc],
  ]) {
    const hexes = stripComments(src).match(/#[0-9a-fA-F]{6}/g) ?? [];
    const unique = [...new Set(hexes.map((h) => h.toUpperCase()))].filter((h) => h !== splashBackground().toUpperCase());
    assert.deepEqual(unique, [], `${name} carries a colour that is not the splash background: ${unique.join(', ')}`);
  }
});

/**
 * The artwork half of the same rule. The colour matched and the PICTURE did not: the OS drew the carved
 * pillars, JS drew a flat rectangle, and the pillars vanished for 600ms on every launch. Both values
 * have to agree with `app.json` or the hand-off is visible.
 */
test('the JS splash draws the same artwork, at the same width, as the native one', () => {
  const { image, imageWidth } = splashPlugin();
  assert.ok(image, 'the expo-splash-screen plugin no longer declares an image');

  const asset = image.replace(/^\.\/assets\//, '');
  assert.match(
    splashSrc,
    new RegExp(`require\\('@/assets/${asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'\\)`),
    `ForgeSplash must render the native splash's own image (${image}), or the hand-off swaps pictures`,
  );

  const declaredWidth = Number(/LOGO_WIDTH\s*=\s*(\d+)/.exec(splashSrc)?.[1]);
  assert.equal(
    declaredWidth,
    imageWidth,
    'ForgeSplash draws the mark at a different width from the native splash, so it jumps size at hand-off',
  );
});

/**
 * ══ NO SPINNER SURVIVES ON THE LAUNCH PATH ══
 *
 * The boot hold was an `ActivityIndicator`, so a cold launch went pillars → flat dark → spinner → Home.
 * Both holds now render the splash instead. This is a source assertion for the same reason everything
 * else here is: the launch sequence is native-only, and the web preview — where this project is
 * reviewed — never renders it.
 */
test('both launch holds render the splash, and neither spins', () => {
  for (const [name, src] of [
    ['_layout.tsx (boot hold)', layoutSrc],
    ['(tabs)/index.tsx (Home first paint)', homeSrc],
  ]) {
    assert.match(src, /<ForgeSplash\s*\/>/, `${name} no longer holds on ForgeSplash`);
    // ⚠ Comments stripped first, for the reason spelled out in the test above — both of these files
    // NAME the spinner they replaced in order to explain why. Prose about a defect is not the defect.
    assert.doesNotMatch(
      stripComments(src),
      /ActivityIndicator/,
      `${name} is back to a spinner — the launch is the app opening, not a task the athlete started`,
    );
  }
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
