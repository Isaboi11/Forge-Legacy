/**
 * s4a-build-state.test.mjs — the build's state has ONE write path, so the engine's copy and the sheet's can never drift
 * (Holt Listens HL-10, slice S4a).
 *
 * Run (from the repo root):  node --test --experimental-strip-types src/domain/coach/engine/__tests__/s4a-build-state.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { freshRefs } from '../types.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const sheet = readFileSync(path.join(here, '../../../../components/forge/CoachChatSheet.tsx'), 'utf8').replace(/\r\n/g, '\n');

test('a fresh engine starts with no build in flight', () => {
  const r = freshRefs();
  assert.equal(r.mode, null);
  assert.deepEqual(r.constraints, {});
  assert.equal(r.built, null);
});

test('⚠ the React copies are written ONLY inside the paired setters (one call each)', () => {
  for (const raw of ['setModeState(', 'setConstraintsState(', 'setBuiltState(']) {
    assert.equal(sheet.split(raw).length - 1, 1, `${raw} must appear once — inside its setter`);
  }
  assert.match(sheet, /engine\.current\.mode = v;\n\s+setModeState\(v\);/);
  assert.match(sheet, /engine\.current\.constraints = v;\n\s+setConstraintsState\(v\);/);
  assert.match(sheet, /engine\.current\.built = v;\n\s+setBuiltState\(v\);/);
});

test('functional updates read the engine copy (the newest), not a render-time value', () => {
  assert.match(sheet, /typeof next === 'function' \? next\(engine\.current\.constraints\) : next/);
});
