import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(here, '../../components/forge/composites/TabBar/TabBar.tsx'), 'utf8');

/*
 * QA home-04 (2026-09-26) dimmed the Legacy tile to an outline off-tab; the PO REVERSED that (2026-09-29):
 * the gold tile is the signature and stays lit on every tab. Its taller tile still must not push the
 * Legacy label below the others (the second test).
 */
test('⚠ PO 09-29 — the Legacy tile is lit (bronze fill) on EVERY tab, not only its own', () => {
  assert.match(src, /const lit = emph\r?\n/, 'lit = emphasized, never gated on focus');
  const fill = src.indexOf('flGradient.bronzeFill.colors');
  const litBranch = src.indexOf('{lit ? (');
  assert.ok(litBranch > 0 && litBranch < fill, 'the bronze fill is drawn in the `lit` branch');
  assert.doesNotMatch(src, /iconWrapResting/, 'no outline-only resting tile');
});

test('⚠ QA home-04 — every tab icon box has one height, so the labels share a line', () => {
  const wrap = src.match(/iconWrap: \{([^}]*)\}/)?.[1] ?? '';
  const tile = src.match(/iconWrapEmphasized: \{([^}]*)\}/)?.[1] ?? '';
  const h = (s) => Number(s.match(/height: (\d+)/)?.[1]);
  assert.ok(h(wrap) > 0, 'iconWrap has an explicit height');
  assert.equal(h(wrap), h(tile), 'plain icon box and Legacy tile are the same height');
});
