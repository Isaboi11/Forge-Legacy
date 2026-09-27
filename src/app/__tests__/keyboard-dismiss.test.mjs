// PO 2026-09-26: "I need to be able to swipe down on the keyboard to make it disappear. Nowhere does it
// do that now." Every scrolling surface dismisses the keyboard on drag, so a new screen can't quietly
// ship without it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '..', '..');
const TAG = /(?<![\w.])<(ScrollView|FlatList|SectionList|Animated\.ScrollView|Animated\.FlatList|BottomSheetScrollView)(?=[\s>/])/g;

function tsxFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : tsxFiles(p);
    return p.endsWith('.tsx') ? [p] : [];
  });
}

test('every scroll container dismisses the keyboard on drag', () => {
  const missing = [];
  for (const file of tsxFiles(SRC)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(TAG)) {
      const openTag = text.slice(m.index, text.indexOf('>', m.index) + 1);
      if (!openTag.includes('keyboardDismissMode')) {
        const line = text.slice(0, m.index).split('\n').length;
        missing.push(`${path.relative(SRC, file)}:${line} <${m[1]}>`);
      }
    }
  }
  assert.deepEqual(missing, [], 'add keyboardDismissMode="on-drag" to these scroll containers');
});
