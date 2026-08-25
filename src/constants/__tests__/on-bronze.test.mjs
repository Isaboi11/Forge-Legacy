/**
 * White lettering on bronze stays legible — in BOTH themes.
 *
 * ⚠ PO RULE, 2026-08-25: *"white lettering if there is the bronze button around it."*
 *
 * ══ WHY THIS TEST EXISTS ══
 *
 * The rule is one line and its correct implementation is two tokens, which is exactly the shape of
 * change that gets half-reverted later. White text was applied to 40 files; it is only legible because
 * `bronzeSolid` moved a step darker at the same time. On the OLD chip fill (`bronze400`) white
 * measures 3.17:1 in Forge and 3.87:1 in Paper — below AA for the 8–12px bold labels these actually
 * are. A future "simplification" that points `bronzeSolid` back at `bronze400`, or that nudges either
 * bronze lighter, would look completely reasonable in a diff and would quietly break the rule it was
 * meant to satisfy.
 *
 * So the invariant is asserted rather than remembered, with the reason attached to the failure.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as forge from '../foundation.forge.ts';
import * as paper from '../foundation.paper.ts';

/** WCAG 2.1 relative luminance. */
function L(hex) {
  const h = hex.replace('#', '');
  const ch = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrast(a, b) {
  const [x, y] = [L(a), L(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/**
 * AA for SMALL text. These labels are 8–12px bold; WCAG "large text" begins at 18pt regular or 14pt
 * bold (≈24px / 18.7px), so none of them qualify for the 3.0 allowance.
 */
const AA_SMALL = 4.5;

const THEMES = [
  ['forge', forge],
  ['paper', paper],
];

test('the on-bronze colour is white in both themes', () => {
  for (const [name, t] of THEMES) {
    assert.equal(t.flColor.onBronze.toUpperCase(), '#FFFFFF', `${name}.onBronze must be white (PO rule)`);
  }
});

test('white on the solid bronze fill clears AA for small text', () => {
  for (const [name, t] of THEMES) {
    const r = contrast(t.flColor.onBronze, t.flColor.bronzeSolid);
    assert.ok(
      r >= AA_SMALL,
      `${name}: white on bronzeSolid (${t.flColor.bronzeSolid}) is ${r.toFixed(2)}:1, below AA ${AA_SMALL}. ` +
        'Darken bronzeSolid rather than abandoning the white lettering.',
    );
  }
});

test('bronzeSolid is a step DARKER than bronze400 — the whole reason it is a separate token', () => {
  for (const [name, t] of THEMES) {
    const solid = L(t.flColor.bronzeSolid);
    const accent = L(t.flColor.bronze400);
    assert.ok(
      solid < accent,
      `${name}: bronzeSolid must be darker than bronze400, or white text on it fails contrast`,
    );

    // And prove the token is earning its place: white on bronze400 would NOT have passed.
    const wouldBe = contrast(t.flColor.onBronze, t.flColor.bronze400);
    assert.ok(
      wouldBe < AA_SMALL,
      `${name}: bronze400 now passes with white (${wouldBe.toFixed(2)}:1) — if that is genuinely true, ` +
        'this test and bronzeSolid can both go, but check it deliberately rather than deleting the guard.',
    );
  }
});

test('bronze400 stays the ACCENT, unchanged — it is not the chip fill', () => {
  // bronzeSolid was added beside bronze400, not in place of it. bronze400 still carries borders,
  // icons, progress fills and text on dark/cream surfaces, and those must not have moved.
  assert.equal(forge.flColor.bronze400, '#BA8654');
  assert.equal(paper.flColor.bronze400, '#A47A3D');
});
