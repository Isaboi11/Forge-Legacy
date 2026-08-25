/**
 * The Paper palette agrees with the design that authored it.
 *
 * ══ WHY THIS TEST EXISTS ══
 *
 * `foundation.paper.ts` is ~60 colour values TYPED BY HAND out of `forge-paper-theme.js`. A single
 * transposed hex digit there is invisible: it compiles, it renders, it looks approximately right, and
 * nothing in the app ever contradicts it. That is the failure mode this repo keeps meeting from other
 * directions — a value that is only ever slightly wrong renders a confident, specific, false claim.
 *
 * So the design file is COMMITTED (`design_reference/Forge Paper Design/forge-paper-theme.js`) and this
 * test parses it. There is one source of truth for the palette and a machine checks the transcription.
 *
 * ⚠ It asserts the RN palette against the DESIGN, not against itself. Editing `foundation.paper.ts` to
 *   make this pass is backwards — if the palette genuinely changed, re-export the design file first.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { flColor, flIcon, flGradient, flShadow } from '../foundation.paper.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME_JS = join(HERE, '..', '..', '..', 'design_reference', 'Forge Paper Design', 'forge-paper-theme.js');

/** Pull every `'--fl-x': 'value'` pair out of the design file's VARS object. */
function designVars() {
  const src = readFileSync(THEME_JS, 'utf8');
  const vars = {};
  const re = /'(--fl-[a-z0-9-]+)':\s*'([^']*)'/g;
  let m;
  while ((m = re.exec(src)) !== null) vars[m[1]] = m[2];
  return vars;
}

const V = designVars();

/** Whitespace after a comma is not a colour. Compare shadow/gradient strings on their content. */
const norm = (s) => String(s).replace(/,\s+/g, ',').replace(/\s+/g, ' ').trim().toLowerCase();

/** Hex stops, in paint order, out of a CSS gradient string. */
const hexes = (s) => (String(s).match(/#[0-9a-fA-F]{6}/g) ?? []).map((h) => h.toUpperCase());

test('the design file parsed, and carries the whole palette', () => {
  // A regex that silently matches nothing would make every assertion below vacuously pass.
  assert.ok(Object.keys(V).length >= 55, `expected the full VARS block, parsed ${Object.keys(V).length}`);
  assert.equal(V['--fl-base'], '#F4F0E6');
});

test('flat colours match the design exactly', () => {
  const MAP = {
    '--fl-base': flColor.base,
    '--fl-charcoal-900': flColor.charcoal900,
    '--fl-charcoal-800': flColor.charcoal800,
    '--fl-charcoal-700': flColor.charcoal700,
    '--fl-charcoal-600': flColor.charcoal600,
    '--fl-charcoal-500': flColor.charcoal500,
    '--fl-cream-100': flColor.cream100,
    '--fl-gray-400': flColor.gray400,
    '--fl-gray-600': flColor.gray600,
    '--fl-bronze-400': flColor.bronze400,
    '--fl-bronze-300': flColor.bronze300,
    '--fl-bronze-600': flColor.bronze600,
    '--fl-bronze-dark': flColor.bronzeDark,
    '--fl-green-muted': flColor.greenMuted,
    '--fl-red-muted': flColor.redMuted,
    '--fl-blue-muted': flColor.blueMuted,
    '--fl-inner-highlight': flColor.innerHighlight,
    '--fl-inner-highlight-md': flColor.innerHighlightMd,
    '--fl-overlay-dark': flColor.overlayDark,
    '--fl-hover-wash': flColor.hoverWash,
    '--fl-bronze-border': flColor.bronzeBorder,
    '--fl-bronze-border-subtle': flColor.bronzeBorderSubtle,
    '--fl-bronze-tint': flColor.bronzeTint,
    '--fl-bronze-metal-border': flColor.bronzeMetalBorder,
    '--fl-status-online': flColor.statusOnline,
    '--fl-icon-container-bg': flColor.iconContainerBg,
    '--fl-icon-inactive': flIcon.inactive,
    '--fl-paper-grain': flColor.paperGrain,
    '--fl-paper-vignette': flColor.paperVignette,
  };
  for (const [cssVar, mine] of Object.entries(MAP)) {
    assert.ok(V[cssVar] !== undefined, `${cssVar} missing from the design file`);
    assert.equal(norm(mine), norm(V[cssVar]), `${cssVar} drifted`);
  }
});

test('gradient stops match the design, in paint order', () => {
  const MAP = {
    // The atmospheric token is a radial + a linear; only the linear half is a stop list here, and the
    // white apex radial is drawn separately by ScreenBackground.
    '--fl-bg-atmospheric': flGradient.bgAtmospheric.colors,
    '--fl-surface-card': flGradient.surfaceCard.colors,
    '--fl-surface-elevated': flGradient.surfaceElevated.colors,
    '--fl-surface-hero': flGradient.surfaceHero.colors,
    '--fl-surface-modal': flGradient.surfaceModal.colors,
    '--fl-bronze-fill': flGradient.bronzeFill.colors,
    '--fl-bronze-fill-hover': flGradient.bronzeFillPressed.colors,
  };
  for (const [cssVar, mine] of Object.entries(MAP)) {
    assert.deepEqual(mine.map((c) => c.toUpperCase()), hexes(V[cssVar]), `${cssVar} stops drifted`);
  }
});

test('the hero tier is really lighter than the card tier — the reason it was added', () => {
  // Paper's whole difficulty is that cream-on-cream has almost no contrast to spend. If these two ever
  // converge the tonal ladder collapses and the screen reads flat, which is precisely what
  // --fl-surface-hero was introduced to prevent. Compare the top stop of each.
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  };
  assert.ok(
    lum(flGradient.surfaceHero.colors[0]) > lum(flGradient.surfaceCard.colors[0]),
    'surfaceHero must be lighter than surfaceCard',
  );
});

test('surfaceRecessed takes the DARKEST stop of the design gradient', () => {
  // A recess sits below the card it is cut into. On paper that means darker, and the solid stand-in
  // must not quietly take the lightest stop and read as a raised panel instead.
  const stops = hexes(V['--fl-surface-recessed']);
  assert.equal(flColor.surfaceRecessed.toUpperCase(), stops[0]);
});

test('shadows match the design, and are warm rather than black', () => {
  const MAP = {
    '--fl-shadow-ambient': flShadow.ambient,
    '--fl-glow-subtle': flShadow.glowSubtle,
    '--fl-glow-badge': flShadow.glowBadge,
    '--fl-shadow-image': flShadow.shadowImage,
    '--fl-border-inset': flShadow.borderInset,
    '--fl-bronze-metal-top-rim': flShadow.bronzeMetalTopRim,
    '--fl-shadow-card-hero': flShadow.cardHero,
    '--fl-shadow-card-soft': flShadow.cardSoft,
    '--fl-status-online-glow': flShadow.presenceDotGlow,
  };
  for (const [cssVar, mine] of Object.entries(MAP)) {
    assert.equal(norm(mine), norm(V[cssVar]), `${cssVar} drifted`);
  }

  // The hero/soft aliases must actually alias, or a card gets one shadow and its hero another.
  assert.equal(norm(flShadow.missionCard), norm(flShadow.cardHero));
  assert.equal(norm(flShadow.trainTogetherCard), norm(flShadow.cardSoft));

  // A neutral-black shadow on cream reads as dirt, not depth. Nothing here may be pure black.
  for (const [name, value] of Object.entries(flShadow)) {
    assert.ok(
      !/rgba\(0,\s*0,\s*0[,)]/i.test(value) && !/#000\b|#000000/i.test(value),
      `flShadow.${name} carries a pure-black shadow, which reads as dirt on paper`,
    );
  }
});

test('the composed shadows are built from the design’s own parts', () => {
  // `card`, `elevated` and `buttonPrimary` have no single design variable — they compose the atomic
  // ones the way the artboards do. Assert the parts, so a composition cannot invent a value.
  assert.ok(flShadow.card.includes(V['--fl-shadow-card'].replace(/,\s+/g, ', ')) || norm(flShadow.card).includes(norm(V['--fl-shadow-card'])));
  assert.ok(norm(flShadow.elevated).includes(norm(V['--fl-shadow-elevated'])));
  assert.ok(norm(flShadow.buttonPrimary).includes(norm(V['--fl-bronze-metal-top-rim'])));
  assert.ok(norm(flShadow.buttonPrimary).includes(norm(V['--fl-bronze-metal-bottom-rim'])));
});

test('the three deliberate non-inversions are still not inverted', () => {
  // Each of these has already been mistaken for an oversight. They are load-bearing decisions taken
  // from `Forge Home - Paper.dc.html`, where all three render on a cream ground on purpose.
  assert.equal(flColor.emberFlame, '#E0913F', 'the Start Workout flame is heat, not a theme colour');
  assert.deepEqual(
    flGradient.bronzeMetallic.colors,
    ['#765B44', '#BA8654', '#C99767', '#BA8654', '#543D2C'],
    'the machined sweep is a struck object and reads as metal on paper too',
  );
  // The design file overrides ~60 variables and pointedly leaves these alone.
  assert.equal(V['--fl-bronze-metallic'], undefined);
  assert.equal(V['--fl-ember-flame'], undefined);
});

test('the primary CTA fill is the dense antique brass, not the dark theme’s forged sweep', () => {
  // Flagged in the handoff as "a specific correction, not a variation to reconsider". Forge's fill
  // dives to #2E2314 mid-gradient; on cream that reads as a black bar.
  assert.equal(flGradient.bronzeFill.colors.length, 3);
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  };
  const ls = flGradient.bronzeFill.colors.map(lum);
  assert.ok(Math.max(...ls) - Math.min(...ls) < 25, 'the Paper CTA must stay in a narrow luminosity range');
  assert.ok(!flGradient.bronzeFill.colors.includes('#2E2314'), 'that is the dark fill');
});
