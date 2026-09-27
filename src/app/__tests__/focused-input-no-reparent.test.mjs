/**
 * ══ A CLIPPED TEXT BOX MUST NOT GAIN OR LOSE A SHADOW WHILE SOMEONE IS TYPING IN IT ══
 *
 * PO, 2026-09-26 (iPhone): "when I type the first letter the keyboard goes down."
 *
 * RN 0.85 Fabric, `RCTViewComponentView.mm`: a view with `overflow: 'hidden'` AND a `boxShadow` (or a
 * non-zero `outlineWidth`) gets a private container view so the shadow can draw outside the clip
 * (`styleWouldClipOverflowInk` → `currentContainerView`). Creating — or tearing down — that container
 * MOVES every subview, including the native text view that holds the keyboard, and moves it through a
 * container that is not in the window yet. A first responder that leaves the window resigns: the
 * keyboard closes. Holt's composer added its focus ring on the first non-space character, one day after
 * the box started clipping (a6a1627a).
 *
 * The rule: on a clipped TextInput, a shadow/outline may change COLOUR with state, never presence — the
 * first (base) style must already carry one if any conditional style does. Web is unaffected (no
 * container) — this is native-only, which is why a web check could not see it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '..', '..');

function tsxFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : tsxFiles(p);
    return p.endsWith('.tsx') ? [p] : [];
  });
}

/** The body of the LAST `name: { … }` in the file (the StyleSheet sits at the bottom), brace-matched. */
function styleBody(src, name) {
  let last = '';
  for (const m of src.matchAll(new RegExp(String.raw`^\s+` + name + String.raw`:\s*\{`, 'gm'))) {
    let j = m.index + m[0].length;
    const start = j;
    for (let depth = 1; depth && j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') depth--;
    }
    last = src.slice(start, j - 1);
  }
  return last;
}

const INK = /boxShadow|outlineWidth:\s*[1-9]/;

export function reparentingInputs(files) {
  const bad = [];
  for (const [where, raw] of files) {
    const src = raw.split('\r').join('');
    for (const m of src.matchAll(/<TextInput\b[\s\S]*?\/>/g)) {
      const names = [...new Set([...m[0].matchAll(/styles\.(\w+)/g)].map((x) => x[1]))];
      if (names.length < 2) continue;
      const bodies = names.map((n) => styleBody(src, n));
      if (!bodies.some((b) => /overflow:\s*'hidden'/.test(b))) continue;
      const conditionalInk = names.slice(1).filter((_, i) => INK.test(bodies[i + 1]));
      if (conditionalInk.length && !INK.test(bodies[0])) {
        bad.push(`${where}:${src.slice(0, m.index).split('\n').length} styles.${names[0]} clips but only ${conditionalInk.map((n) => `styles.${n}`).join(', ')} carries a shadow`);
      }
    }
  }
  return bad;
}

test('no clipped TextInput gains or loses a shadow as its state changes (the keyboard would close)', () => {
  const files = tsxFiles(SRC).map((f) => [path.relative(SRC, f), fs.readFileSync(f, 'utf8')]);
  assert.deepEqual(reparentingInputs(files), []);
});

test('the guard catches the exact shape that shipped', () => {
  const shipped = `
    <TextInput style={[styles.input, draft.trim() ? styles.inputTyping : null]} multiline />
    const styles = StyleSheet.create({
      input: {
        maxHeight: 108,
        overflow: 'hidden',
        outlineWidth: 0,
      },
      inputTyping: { borderColor: 'x', boxShadow: '0 0 0 3px red' },
    });`;
  assert.equal(reparentingInputs([['shipped.tsx', shipped]]).length, 1);
  const fixed = shipped.replace('outlineWidth: 0,', "outlineWidth: 0,\n        boxShadow: '0 0 0 3px transparent',");
  assert.equal(reparentingInputs([['fixed.tsx', fixed]]).length, 0);
});
