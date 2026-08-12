import test from 'node:test';
import assert from 'node:assert/strict';
import { chipWidth, measureText, wrapText } from '../text-measure.ts';

/**
 * The native share card has no canvas, so every wrap and every chip width comes from an estimate. These
 * tests do not assert exact pixels — the model is explicitly approximate. They assert the properties the
 * card's geometry actually depends on, and the one failure mode that shows up in a posted image: text
 * running off the edge.
 */

test('an empty string measures nothing, and wraps to no lines at all', () => {
  assert.equal(measureText('', 26), 0);
  assert.deepEqual(wrapText('', 500, 26), []);
  assert.deepEqual(wrapText('   ', 500, 26), [], 'whitespace is not a line');
});

test('width scales linearly with font size — the card draws the same string at 20px and 62px', () => {
  const small = measureText('Transformation', 20);
  const large = measureText('Transformation', 60);
  assert.ok(Math.abs(large / small - 3) < 0.001, `expected 3x, got ${large / small}`);
});

test('narrow, wide and capital glyphs are not all one width', () => {
  const size = 40;
  const narrow = measureText('iiii', size);
  const normal = measureText('oooo', size);
  const wide = measureText('mmmm', size);
  assert.ok(narrow < normal, 'iiii must be narrower than oooo');
  assert.ok(normal < wide, 'oooo must be narrower than mmmm');
  // Without this the model degenerates to character-counting, which is what overflows on "MMM" labels.
  assert.ok(wide / narrow > 2, `wide/narrow was only ${wide / narrow}`);
});

test('letter spacing is counted, and only between glyphs', () => {
  const plain = measureText('ABCDE', 20, 'sans', 0);
  const tracked = measureText('ABCDE', 20, 'sans', 5);
  assert.equal(tracked - plain, 20, 'five glyphs = four gaps at 5px');
  assert.equal(measureText('A', 20, 'sans', 5), measureText('A', 20, 'sans', 0), 'one glyph has no gap');
});

test('the serif and sans faces measure differently — one fudge factor would not do', () => {
  const sans = measureText('Chapter One', 40, 'sans');
  const serif = measureText('Chapter One', 40, 'serif');
  assert.notEqual(sans, serif);
});

test('⚠ no wrapped line exceeds the width it was given — this is the whole point', () => {
  const maxW = 900; // the card's inner width at CARD_W 1080 / CARD_PAD 90
  const copy = [
    'Six months of showing up when it would have been easier not to.',
    'I stopped counting the days and started counting the chapters instead.',
    'Down thirty-two pounds, up forty on the bench, and the knee finally stopped talking to me.',
    'Mmmmm Wwwww MMMMM WWWWW mmmmm wwwww',
  ];
  for (const text of copy) {
    for (const size of [26, 28]) {
      for (const face of ['sans', 'serif']) {
        for (const row of wrapText(text, maxW, size, face)) {
          const w = measureText(row, size, face);
          assert.ok(w <= maxW, `"${row}" measured ${Math.round(w)} > ${maxW} at ${size}px ${face}`);
        }
      }
    }
  }
});

test('a single word wider than the line gets its own row rather than being cut mid-glyph', () => {
  const rows = wrapText('Supercalifragilisticexpialidocious', 100, 40);
  assert.equal(rows.length, 1);
  assert.equal(rows[0], 'Supercalifragilisticexpialidocious', 'the athlete’s own word is never hyphenated');
});

test('wrapping keeps every word, in order, exactly once', () => {
  const text = 'I stopped counting the days and started counting the chapters instead';
  const rows = wrapText(text, 300, 26);
  assert.ok(rows.length > 1, 'this should have wrapped');
  assert.equal(rows.join(' '), text, 'no word dropped, duplicated or reordered');
});

test('collapsed whitespace never produces an empty or padded row', () => {
  const rows = wrapText('  double   spaces\tand\ttabs  ', 400, 26);
  assert.ok(rows.every((r) => r === r.trim() && r.length > 0));
  assert.equal(rows.join(' '), 'double spaces and tabs');
});

test('the chip is the label plus the canvas version’s 28px of padding', () => {
  const label = 'Then';
  assert.equal(chipWidth(label), measureText('THEN', 20, 'sans', 0) + 28);
  assert.ok(chipWidth('Now') < chipWidth('Six months ago'), 'a longer label makes a wider chip');
});

test('the estimate is biased to over-shoot, not under-shoot', () => {
  // A lowercase system-sans string at 26px runs ~0.50em/char in the real face. The model must not come in
  // under that, or a line that measured as fitting will overflow when it is actually drawn.
  const s = 'the quick brown fox jumps over the lazy dog';
  const perChar = measureText(s, 26) / s.length / 26;
  assert.ok(perChar >= 0.44, `model averages ${perChar.toFixed(3)} em/char — too narrow to be safe`);
});
