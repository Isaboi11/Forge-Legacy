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
const geometrySrc = readFileSync(join(HERE, '..', 'splash-geometry.ts'), 'utf8');
const bootSrc = readFileSync(join(ROOT, 'src', 'boot.tsx'), 'utf8');
const htmlSrc = readFileSync(join(ROOT, 'src', 'app', '+html.tsx'), 'utf8');

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

  // The FORGE value is the one that has to match app.json: the native splash is build config, so the
  // hand-off it guards only exists on native, and native resolves to Forge (see theme-choice.ts).
  const declared = /SPLASH_BACKGROUND_FORGE\s*=\s*'(#[0-9a-fA-F]{6})'/.exec(splashSrc)?.[1];
  assert.ok(declared, 'forge-splash.tsx no longer exports a SPLASH_BACKGROUND_FORGE literal');

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
    // ⚠ TWO colours are legitimate here now, not one: the splash follows the theme, so Forge's ground
    // (which must equal app.json — asserted above) and Paper's are both expected. A THIRD is still the
    // defect this catches, and that is what keeps the guard meaningful rather than merely widened.
    const allowed = new Set(
      [splashBackground(), /SPLASH_BACKGROUND_PAPER\s*=\s*'(#[0-9a-fA-F]{6})'/.exec(splashSrc)?.[1]]
        .filter(Boolean)
        .map((h) => h.toUpperCase()),
    );
    const hexes = stripComments(src).match(/#[0-9a-fA-F]{6}/g) ?? [];
    const unique = [...new Set(hexes.map((h) => h.toUpperCase()))].filter((h) => !allowed.has(h));
    assert.deepEqual(unique, [], `${name} carries a colour that is neither splash ground: ${unique.join(', ')}`);
  }
});

/**
 * The artwork half of the same rule. The colour matched and the PICTURE did not: the OS drew the carved
 * pillars, JS drew a flat rectangle, and the pillars vanished for 600ms on every launch. Both values
 * have to agree with `app.json` or the hand-off is visible.
 */
test('the JS splash draws the same artwork, in the same box, as the native one', () => {
  const { image, imageWidth } = splashPlugin();
  assert.ok(image, 'the expo-splash-screen plugin no longer declares an image');

  // The artwork is declared ONCE, in splash-geometry.ts, and both the splash and the boot gate draw it.
  const asset = image.replace(/^\.\/assets\//, '');
  assert.match(
    geometrySrc,
    new RegExp(`require\\('@/assets/${asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'\\)`),
    `splash-geometry.ts must export the native splash's own image (${image}), or the hand-off swaps pictures`,
  );
  for (const [name, src] of [
    ['forge-splash.tsx', splashSrc],
    ['boot.tsx', bootSrc],
  ]) {
    assert.match(src, /source=\{SPLASH_LOGO\}/, `${name} no longer draws SPLASH_LOGO`);
    assert.match(src, /width:\s*SPLASH_LOGO_BOX,\s*height:\s*SPLASH_LOGO_BOX/, `${name} no longer lays the mark out in the plugin's square box`);
    assert.match(src, /top:\s*SPLASH_LOGO_TOP/, `${name} no longer centres the mark on the window`);
    assert.match(src, /resizeMode="contain"/, `${name} must contain-fit the mark, as the storyboard's scaleAspectFit does`);
  }

  // ⚠ THE BOX, NOT THE WIDTH. `imageWidth` is the side of the SQUARE the plugin rasterises the image
  // into (`withIosSplashAssets.js`: `width: size, height: size`); the mark is aspect-fitted inside it.
  // The previous assertion held the MARK's width equal to it, which is how the OS came to show a
  // 104-wide crop while JS showed a 104-wide mark: two sizes, both "matching".
  const declaredBox = Number(/SPLASH_LOGO_BOX\s*=\s*(\d+)/.exec(geometrySrc)?.[1]);
  assert.equal(
    declaredBox,
    imageWidth,
    'SPLASH_LOGO_BOX must equal app.json imageWidth — it is the plugin’s square box, and the mark jumps size at hand-off otherwise',
  );
});

/**
 * ══ THE SPLASH ASSET MUST BE SQUARE ══
 *
 * The plugin passes the source to sharp as `resize(imageWidth, imageWidth)` with NO `fit`, and sharp's
 * default is `cover`: a non-square source is CROPPED to its centre square. The 308 × 452 carved mark
 * shipped as its middle 104 × 104 — top and bottom of the pillars gone — on every launch of builds 1–7.
 * PO: "a weird two size logo". Nothing in `expo export`, tsc or the web preview can see a storyboard.
 */
test('the native splash asset is square, so the plugin’s square resize cannot crop it', () => {
  const { image, imageWidth } = splashPlugin();
  const png = readFileSync(join(ROOT, image));
  assert.equal(png.toString('ascii', 1, 4), 'PNG', `${image} is not a PNG`);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assert.equal(width, height, `${image} is ${width}×${height}; the plugin resizes into a square and crops whatever does not fit`);
  // And the 3× rasterisation must not upscale it — a soft mark on the OS side is a different picture.
  assert.ok(imageWidth * 3 <= width, `imageWidth ${imageWidth} × 3 = ${imageWidth * 3}px exceeds the ${width}px source`);
});

/**
 * The root view is the frame behind everything React draws — what shows when the layout returns null
 * or a screen has no ground of its own. Unset, it is the platform's own white/black; set to the splash
 * colour it is one more frame of the same picture.
 */
test('the root view behind React is the splash colour', () => {
  assert.equal(
    (appJson.expo?.backgroundColor ?? '').toUpperCase(),
    splashBackground().toUpperCase(),
    'expo.backgroundColor must equal the splash colour, or an unpainted frame is a flash of the platform',
  );
});

/**
 * ══ THE BOOT GATE DRAWS THE SPLASH TOO — WITHOUT A TOKEN ══
 *
 * `boot.tsx` renders before the theme is known and must not import the token layer (see its note), so
 * it cannot use `ForgeSplash`. It draws the same picture from `splash-geometry.ts` on a literal colour;
 * that literal has to be the native splash's, and the geometry module has to stay token-free, or the
 * gate silently pins every athlete to the default theme.
 */
test('the boot hold is the native splash continued, and stays token-free', () => {
  const holdColour = /hold:\s*\{[^}]*backgroundColor:\s*'(#[0-9a-fA-F]{6})'/.exec(bootSrc)?.[1];
  assert.ok(holdColour, 'boot.tsx no longer declares a literal hold colour');
  assert.equal(holdColour.toUpperCase(), splashBackground().toUpperCase(), 'the boot hold is not the native splash colour');
  for (const [name, src] of [
    ['boot.tsx', bootSrc],
    ['splash-geometry.ts', geometrySrc],
  ]) {
    assert.doesNotMatch(
      stripComments(src),
      /@\/constants\/(foundation|tokens)|forge-splash/,
      `${name} imports the token layer — it now evaluates the palette before the theme is known`,
    );
  }
});

/**
 * ══ THE NATIVE HAND-OFF CONTINUES THE NATIVE GROUND ══
 *
 * The OS splash is build config and cannot follow a per-athlete theme. The overlay that covers its
 * disappearance therefore paints the NATIVE ground and fades into the theme's own splash beneath — the
 * difference between an Alabaster launch that dissolves and one that cuts from black to white.
 */
test('the hand-off overlay paints the native ground and dissolves into the theme', () => {
  assert.match(stripComments(overlaySrc), /<ForgeSplash\s+ground="forge"\s*\/>/, 'AnimatedSplashOverlay must render ForgeSplash on the forge ground');
  assert.match(splashSrc, /fillForge:\s*\{\s*backgroundColor:\s*SPLASH_BACKGROUND_FORGE\s*\}/, 'the forge ground must be the declared constant');
  // A launch that cannot resolve its fonts still has to open — on the splash, not on nothing.
  assert.match(stripComments(layoutSrc), /if\s*\(!fontsLoaded\s*&&\s*!fontError\)\s*\{\s*return\s*<ForgeSplash\s*\/>/, '_layout.tsx must hold on the splash while fonts load, and open on a font error');
});

/**
 * ══ THE WEB GROUND IS ONE RULE, KEYED ON THE THEME ══
 *
 * `+html.tsx` used to give `<body>` an inline dark background; with expo-router's `body{height:100%}`
 * that painted over the Paper `<html>` for the whole bundle download. The ground is now a stylesheet
 * rule on `data-theme`, and the body carries no colour of its own.
 */
test('the web shell paints the theme ground on <html> and never on <body>', () => {
  const noComments = stripComments(htmlSrc).replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  assert.doesNotMatch(noComments, /<body[^>]*style=/, '+html.tsx gives <body> an inline style again — it will paint over the themed <html>');
  const forge = splashBackground().toUpperCase();
  const paper = (/SPLASH_BACKGROUND_PAPER\s*=\s*'(#[0-9a-fA-F]{6})'/.exec(splashSrc)?.[1] ?? '').toUpperCase();
  const css = /html\{background-color:(#[0-9a-fA-F]{6})\}html\[data-theme="paper"\]\{background-color:(#[0-9a-fA-F]{6})\}/.exec(noComments);
  assert.ok(css, '+html.tsx must carry the html / html[data-theme="paper"] ground rule');
  assert.equal(css[1].toUpperCase(), forge, 'the no-script web ground must be the Forge splash colour');
  assert.equal(css[2].toUpperCase(), paper, 'the Paper web ground must be the Paper splash colour');
  assert.match(noComments, /setAttribute\('data-theme'/, 'the head script must stamp data-theme, or the rule above never selects');
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

test('the Paper splash exists, is light, and cannot reach the native hand-off', () => {
  // Loading should be the theme the athlete chose. On web there is no native splash to disagree with;
  // on native the hand-off is preserved because the theme is pinned to Forge there.
  const paper = /SPLASH_BACKGROUND_PAPER\s*=\s*'(#[0-9a-fA-F]{6})'/.exec(splashSrc)?.[1];
  assert.ok(paper, 'forge-splash.tsx must declare SPLASH_BACKGROUND_PAPER');

  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  };
  assert.ok(lum(paper) > 200, `the Paper splash must be light, got ${paper}`);

  // And the rendered value must still be the switch, not one branch hardcoded back in.
  assert.match(
    splashSrc,
    /SPLASH_BACKGROUND\s*=\s*IS_PAPER\s*\?\s*SPLASH_BACKGROUND_PAPER\s*:\s*SPLASH_BACKGROUND_FORGE/,
    'SPLASH_BACKGROUND must select between the two, or one theme loads on the other one’s ground',
  );
});
