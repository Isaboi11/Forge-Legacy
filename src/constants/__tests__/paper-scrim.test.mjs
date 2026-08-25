/**
 * The darkening→lightening scrim flip, which decides how all 205 screens look in Paper Mode.
 *
 * ⚠ THE POSITIVES HERE ARE NOT INVENTED. They are the complete set of 18 distinct `overlay` values
 *   actually passed to `<ScreenBackground>` across `src/`, enumerated from the source before the
 *   function was written. A fixture that is the real input is the only kind worth having — a tidy
 *   made-up one would have passed against a rule that misses `rgba(8,6,5,0.62)`.
 *
 *   Regenerate the list by grepping `src` for `overlay={{ flat: '...' }}` and taking the distinct
 *   values (the sed to strip the wrapper contains a comment terminator, so it is described rather
 *   than pasted here — writing it out closed this block comment early and the file stopped parsing).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { paperScrim, DARK_SCRIM_MAX_CHANNEL, PAPER_SCRIM_RGB } from '../paper-scrim.ts';

/** Every darkening overlay in the app, verbatim. */
const REAL_OVERLAYS = [
  'rgba(0,0,0,0.5)',
  'rgba(5,5,5,0.15)',
  'rgba(5,5,5,0.3)',
  'rgba(5,5,5,0.30)',
  'rgba(5,5,5,0.32)',
  'rgba(5,5,5,0.34)',
  'rgba(5,5,5,0.4)',
  'rgba(5,5,5,0.42)',
  'rgba(5,5,5,0.5)',
  'rgba(5,5,5,0.55)',
  'rgba(5,5,5,0.62)',
  'rgba(5,5,5,0.72)',
  'rgba(6,7,8,0.3)',
  'rgba(6,7,8,0.30)',
  'rgba(6,7,8,0.32)',
  'rgba(6,7,8,0.34)',
  'rgba(6,7,8,0.36)',
  'rgba(8,6,5,0.62)',
  // the two graduated overlays' stops
  'rgba(5,5,5,0.12)',
  'rgba(5,5,5,0.26)',
  'rgba(5,5,5,0.38)',
  'rgba(6,7,8,0.42)',
  'rgba(4,5,6,0.60)',
];

/** Colours that must NOT be swallowed — real washes, brand colours and the Paper palette itself. */
const MUST_PASS_THROUGH = [
  'rgba(186, 134, 84,0.05)', // the bronze screen radial
  'rgba(150,110,60,0.06)',
  'rgba(164,122,61,0.52)', // paper bronze border
  'rgba(88,124,160,0.06)', // the Forge atmospheric apex
  'rgba(35,31,26,0.42)', // paper --fl-overlay-dark: dark, but a real ink colour, not a scrim
  'rgba(255,255,255,0.75)', // the paper apex radial
  '#050505',
  '#F4F0E6',
  'transparent',
  '',
];

test('every real darkening overlay flips to cream and keeps its alpha exactly', () => {
  for (const c of REAL_OVERLAYS) {
    const out = paperScrim(c);
    const alphaIn = /,\s*([\d.]+)\s*\)$/.exec(c)?.[1];
    assert.equal(out, `rgba(${PAPER_SCRIM_RGB},${Number(alphaIn)})`, `${c} did not flip correctly`);
  }
});

test('the alpha is preserved to the digit — it is a composition decision, not a darkness', () => {
  assert.equal(paperScrim('rgba(5,5,5,0.15)'), 'rgba(247,243,234,0.15)');
  assert.equal(paperScrim('rgba(5,5,5,0.72)'), 'rgba(247,243,234,0.72)');
  // `0.3` and `0.30` are the same number and must not become different strings downstream.
  assert.equal(paperScrim('rgba(5,5,5,0.3)'), paperScrim('rgba(5,5,5,0.30)'));
});

test('real colours pass through untouched', () => {
  for (const c of MUST_PASS_THROUGH) {
    assert.equal(paperScrim(c), c, `${c} was wrongly treated as a darkening scrim`);
  }
});

test('the classifier separates the two sets with real margin on both sides', () => {
  // A guard that only just works is a guard that breaks on the next value someone adds. Prove the gap.
  const chan = (c) => {
    const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(c);
    return m ? Math.max(Number(m[1]), Number(m[2]), Number(m[3])) : null;
  };
  const brightestScrim = Math.max(...REAL_OVERLAYS.map(chan));
  const darkestRealColour = Math.min(...MUST_PASS_THROUGH.map(chan).filter((n) => n !== null));

  assert.ok(brightestScrim <= DARK_SCRIM_MAX_CHANNEL, `a real overlay (${brightestScrim}) sits above the threshold`);
  assert.ok(darkestRealColour > DARK_SCRIM_MAX_CHANNEL, `a real colour (${darkestRealColour}) sits below the threshold`);

  // Margin, not just correctness. This assertion is why the threshold is 20 and not 40: at 40 the
  // nearest real colour (paper's own --fl-overlay-dark, max channel 35) was on the WRONG side of the
  // line, and every modal backdrop in Paper Mode would have flipped to cream.
  const marginBelow = DARK_SCRIM_MAX_CHANNEL - brightestScrim;
  const marginAbove = darkestRealColour - DARK_SCRIM_MAX_CHANNEL;
  assert.ok(marginBelow >= 10, `only ${marginBelow} of margin under the line (brightest scrim ${brightestScrim})`);
  assert.ok(marginAbove >= 10, `only ${marginAbove} of margin over the line (darkest colour ${darkestRealColour})`);
});

test('malformed or unrecognised input is returned rather than mangled', () => {
  // A background is not the place to throw. Anything unparseable must render as authored.
  for (const c of ['rgb(5,5,5)', 'not a colour', 'rgba(5,5)', 'hsl(20 50% 10%)']) {
    assert.doesNotThrow(() => paperScrim(c));
  }
  // A 3-channel rgb() with no alpha IS a darkening scrim and should still flip, opaque.
  assert.equal(paperScrim('rgb(5,5,5)'), `rgba(${PAPER_SCRIM_RGB},1)`);
  assert.equal(paperScrim('not a colour'), 'not a colour');
});
