/**
 * holt-markdown.test.mjs — Holt's bold, bullets and headings show as formatting, never as raw `**` (Holt Listens HL-1a).
 *
 * Run (from the repo root):  node --test --experimental-strip-types src/domain/coach/__tests__/holt-markdown.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { holtMarkdown, holtPlainText } from '../holt-markdown.ts';

const joined = (s) => holtMarkdown(s).map((r) => r.text).join('');

test('⭐ the tester report 2026-11-18: the gap list renders as bullets with bold labels, no asterisks', () => {
  const said =
    'The thin spots are:\n\n- **Rear delts:** only the face pull really covers them.\n- **Core:** nothing direct, no abs or trunk work.';
  const runs = holtMarkdown(said);
  assert.equal(joined(said), 'The thin spots are:\n\n•  Rear delts: only the face pull really covers them.\n•  Core: nothing direct, no abs or trunk work.');
  assert.ok(!joined(said).includes('*'));
  assert.deepEqual(runs.filter((r) => r.bold).map((r) => r.text), ['Rear delts:', 'Core:']);
});

test('plain words are one run, untouched', () => {
  assert.deepEqual(holtMarkdown('Three sets of eight, then rest.'), [{ text: 'Three sets of eight, then rest.' }]);
  assert.deepEqual(holtMarkdown(''), []);
});

test('multiplication and sets-by-reps are never read as italics', () => {
  for (const s of ['Do 3*8 today.', '5 * 5 at 225.', 'Bench 4x8*, then rows.', 'Hit 3*10 and 2*12.']) {
    assert.equal(joined(s), s, s);
    assert.ok(holtMarkdown(s).every((r) => !r.italic), s);
  }
});

test('*italic* around words is italic', () => {
  const runs = holtMarkdown('Keep it *easy* today.');
  assert.deepEqual(runs, [{ text: 'Keep it ' }, { text: 'easy', italic: true }, { text: ' today.' }]);
});

test('⚠ streaming: an unclosed ** is dropped, not drawn, and bolds once the pair arrives', () => {
  assert.equal(joined('- **Rear del'), '•  Rear del');
  const done = holtMarkdown('- **Rear delts:** fine');
  assert.ok(done.some((r) => r.bold && r.text === 'Rear delts:'));
});

test('headings become a bold line; rules disappear', () => {
  const runs = holtMarkdown('### Your week\nPush, pull, legs.\n---\nDone.');
  assert.equal(runs.map((r) => r.text).join(''), 'Your week\nPush, pull, legs.\nDone.');
  assert.deepEqual(runs[0], { text: 'Your week', bold: true });
});

test('nested bullets indent; numbered lists stay as written', () => {
  assert.equal(joined('- Pull\n  - face pull\n1. First\n2. Second'), '•  Pull\n   •  face pull\n1. First\n2. Second');
});

test('`code` shows as its words; snake_case and URLs with underscores stay intact', () => {
  assert.equal(joined('Use `cable-face-pull` here.'), 'Use cable-face-pull here.');
  assert.equal(joined('home_gym_equipment is set'), 'home_gym_equipment is set');
  const runs = holtMarkdown('See https://example.com/a_b_c for more.');
  assert.ok(runs.some((r) => r.url === 'https://example.com/a_b_c'));
});

test('links still work inside formatting, and only http(s)', () => {
  const runs = holtMarkdown('**Try [BBC Good Food](https://www.bbcgoodfood.com/x)** tonight.');
  assert.ok(runs.some((r) => r.url === 'https://www.bbcgoodfood.com/x' && r.text === 'BBC Good Food' && r.bold));
  assert.ok(holtMarkdown('[call](tel:123)').every((r) => !r.url));
});

test('Copy gets the words as read', () => {
  assert.equal(holtPlainText('- **Core:** add [this](https://x.com/a)'), '•  Core: add this (https://x.com/a)');
});
