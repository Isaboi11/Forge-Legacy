/**
 * ══ A TEXT BOX THAT SCROLLS INSIDE ITSELF MUST CLIP ══
 *
 * PO, 2026-09-26, Holt's kitchen composer: "The letters are coming out of the text box. Make sure this
 * doesn't happen anywhere in the app." A multiline TextInput with a `maxHeight` (or a fixed `height`)
 * scrolls its own text once it is full — and on iOS, without `overflow: 'hidden'`, the lines scrolled
 * away are drawn OUTSIDE the box, over whatever sits above it. A box with no cap just grows, and cannot
 * do this, so only capped ones are held to the rule.
 *
 * Second half: a multiline box never takes `flRadius.pill`. A full pill radius on a four-line box curves
 * into the first and last letters of every line.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.join(process.cwd(), 'src');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== '__tests__' && e.name !== 'node_modules') walk(p, out);
    } else if (/\.tsx$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

/** The body of `name: { … }` in a StyleSheet, brace-matched. Empty when the name is not a style here. */
function styleBody(src, name) {
  const m = new RegExp(String.raw`^\s+` + name + String.raw`:\s*\{`, 'm').exec(src);
  if (!m) return '';
  let j = m.index + m[0].length;
  const start = j;
  for (let depth = 1; depth && j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') depth--;
  }
  return src.slice(start, j - 1);
}

/** Every multiline <TextInput …/> in the app, with the bodies of the styles it names. */
function multilineInputs() {
  const found = [];
  for (const file of walk(SRC)) {
    const src = fs.readFileSync(file, 'utf8').split('\r').join('');
    for (const m of src.matchAll(/<TextInput\b[\s\S]*?\/>/g)) {
      const tag = m[0];
      if (!/\bmultiline\b/.test(tag) || /multiline=\{false\}/.test(tag)) continue;
      const names = [...new Set([...tag.matchAll(/styles\.(\w+)/g)].map((x) => x[1]))];
      found.push({
        where: `${path.relative(SRC, file)}:${src.slice(0, m.index).split('\n').length}`,
        styles: names.map((n) => styleBody(src, n)).join('\n'),
        scrolls: !/scrollEnabled=\{false\}/.test(tag),
      });
    }
  }
  return found;
}

const INPUTS = multilineInputs();

test('the scan finds the app’s multiline inputs (a scan that finds nothing proves nothing)', () => {
  assert.ok(INPUTS.length >= 20, `found only ${INPUTS.length}`);
  assert.ok(INPUTS.some((i) => i.where.includes('CoachChatSheet')), 'Holt’s composer is the one that broke');
});

test('every multiline input with a height cap clips its text', () => {
  const capped = INPUTS.filter((i) => i.scrolls && /\b(maxHeight|height):/.test(i.styles));
  assert.ok(capped.length >= 5, `expected the five capped boxes, found ${capped.length}`);
  const leaking = capped.filter((i) => !/overflow:\s*'hidden'/.test(i.styles)).map((i) => i.where);
  assert.deepEqual(leaking, [], 'these scroll inside themselves without overflow: hidden — the text draws outside the box');
});

test('no multiline input uses a full pill radius', () => {
  const pills = INPUTS.filter((i) => /borderRadius:\s*flRadius\.pill/.test(i.styles)).map((i) => i.where);
  assert.deepEqual(pills, []);
});
