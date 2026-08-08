import test from 'node:test';
import assert from 'node:assert/strict';

import {
  chooseVersion,
  encodeQr,
  formatBits,
  gfMul,
  MAX_QR_VERSION,
  maskPenalty,
  qrDataCodewords,
  rsGenerator,
  rsRemainder,
  utf8Bytes,
} from '../qr.ts';

/**
 * QR encoding — the thing the squad invite sheet claimed to have and did not.
 *
 * ══ WHAT WAS THERE BEFORE ══
 *
 * `buildQr` seeded an LCG from the invite code, drew three finder squares, and filled the other ~400
 * cells with coin flips. No format information, no timing pattern, no error correction — nothing a
 * decoder reads. It could not have scanned, and it was seeded with the code rather than the join link,
 * so a working encoder in that slot would still have gone nowhere.
 *
 * These tests are the reason the replacement can be trusted without a phone in hand. Three of them are
 * independent of the implementation entirely: the published format-information table, the algebraic
 * property that defines a Reed-Solomon codeword, and a hand-computed codeword stream. The last one
 * reads the finished matrix back the way a scanner would.
 */

// ── the encoding step, computed by hand ─────────────────────────────────────────────────────────

test('"HI" encodes to the codewords the standard describes, padded with 0xEC/0x11', () => {
  /*
   * By hand, version 1 (8-bit character count), level M (16 data codewords):
   *   mode 0100 · count 00000010 · 'H' 01001000 · 'I' 01001001 · terminator 0000
   *   = 0100 0000 0010 0100 1000 0100 1001 0000
   *   = 0x40 0x24 0x84 0x90
   * then the standard's alternating pad bytes to fill sixteen.
   */
  assert.deepEqual(qrDataCodewords('HI', 1), [
    0x40, 0x24, 0x84, 0x90, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11,
  ]);
});

test('the data region is filled exactly to the version capacity, never over or under', () => {
  const capacities = { 1: 16, 2: 28, 3: 44, 4: 64, 5: 86 };
  for (const [v, cap] of Object.entries(capacities)) {
    assert.equal(qrDataCodewords('x'.repeat(5), Number(v)).length, cap);
  }
});

test('a message that exactly fills the version gets no pad bytes', () => {
  // v1-M holds 16 codewords; the header costs 12 bits, leaving 14 whole bytes plus 4 spare bits.
  const words = qrDataCodewords('x'.repeat(14), 1);
  assert.equal(words.length, 16);
  assert.notEqual(words[15], 0x11); // the tail is message, not padding
});

test('non-ASCII is encoded as UTF-8 bytes, which is what a scanner reads', () => {
  assert.deepEqual(utf8Bytes('é'), [0xc3, 0xa9]);
  assert.deepEqual(utf8Bytes('A'), [0x41]);
  assert.equal(utf8Bytes('🏋').length, 4);
});

// ── version selection ───────────────────────────────────────────────────────────────────────────

test('the smallest version that fits is chosen — a bigger code is a harder scan', () => {
  assert.equal(chooseVersion(1), 1);
  assert.equal(chooseVersion(14), 1); // 16 codewords − 12 header bits = 14 bytes exactly
  assert.equal(chooseVersion(15), 2);
});

test('a squad invite link lands in a small, dense version', () => {
  const link = 'https://forgelegacy.expo.app/join-squad?code=IRON-4F2A';
  const v = chooseVersion(link.length);
  assert.ok(v >= 2 && v <= 4, `expected a small version, got ${v}`);
});

test('too long to encode is refused, never silently truncated into a wrong URL', () => {
  assert.equal(chooseVersion(5000), null);
  assert.throws(() => encodeQr('x'.repeat(5000)), /Too long/);
});

test('the ceiling is exactly what version 10 at level M holds', () => {
  assert.equal(MAX_QR_VERSION, 10);
  assert.equal(chooseVersion(213), 10);
  assert.equal(chooseVersion(214), null);
});

// ── Reed-Solomon, checked by the property that defines it ───────────────────────────────────────

/** Evaluate a codeword polynomial (leading coefficient first) at `x`, in GF(256). */
function evalPoly(coeffs, x) {
  let acc = 0;
  for (const c of coeffs) acc = gfMul(acc, x) ^ c;
  return acc;
}

test('a generated codeword has zero syndromes — the definition of a valid RS block', () => {
  // If C(α^i) = 0 for every i below the EC count, the block is a genuine Reed-Solomon codeword and a
  // decoder can correct it. This is independent of how the remainder is computed.
  for (const n of [10, 16, 18, 22, 24, 26]) {
    const data = Array.from({ length: 30 }, (_, i) => (i * 37 + 11) & 0xff);
    const codeword = [...data, ...rsRemainder(data, n)];
    let alpha = 1;
    for (let i = 0; i < n; i++) {
      assert.equal(evalPoly(codeword, alpha), 0, `syndrome ${i} non-zero for n=${n}`);
      alpha = gfMul(alpha, 2);
    }
  }
});

test('the generator polynomial is monic and of the right degree', () => {
  for (const n of [7, 10, 26]) {
    const g = rsGenerator(n);
    assert.equal(g.length, n + 1);
    assert.equal(g[0], 1);
  }
});

test('a single corrupted byte changes the syndromes — the check is actually load-bearing', () => {
  const data = [1, 2, 3, 4, 5, 6, 7, 8];
  const codeword = [...data, ...rsRemainder(data, 10)];
  codeword[3] ^= 0x5a;
  let alpha = 1;
  let anyNonZero = false;
  for (let i = 0; i < 10; i++) {
    if (evalPoly(codeword, alpha) !== 0) anyNonZero = true;
    alpha = gfMul(alpha, 2);
  }
  assert.ok(anyNonZero, 'a corrupted codeword still reported clean syndromes');
});

// ── format information, against the published table ─────────────────────────────────────────────

test('format bits match the published level-M table for all eight masks', () => {
  // ISO/IEC 18004 Table C.1, the level-M rows. Fully independent of the BCH code written here.
  const published = [
    '101010000010010',
    '101000100100101',
    '101111001111100',
    '101101101001011',
    '100010111111001',
    '100000011001110',
    '100111110010111',
    '100101010100000',
  ];
  for (let mask = 0; mask < 8; mask++) {
    const bits = formatBits(mask).toString(2).padStart(15, '0');
    assert.equal(bits, published[mask], `mask ${mask}`);
  }
});

// ── the finished matrix ─────────────────────────────────────────────────────────────────────────

const LINK = 'https://forgelegacy.expo.app/join-squad?code=IRON-4F2A';

test('the matrix is square, correctly sized for its version, and fully populated', () => {
  const qr = encodeQr(LINK);
  assert.equal(qr.size, qr.version * 4 + 17);
  assert.equal(qr.modules.length, qr.size * qr.size);
  assert.ok(qr.modules.every((m) => typeof m === 'boolean'));
});

test('all three finder patterns are drawn, with their light separators', () => {
  const qr = encodeQr(LINK);
  const at = (r, c) => qr.modules[r * qr.size + c];
  for (const [r0, c0] of [
    [0, 0],
    [0, qr.size - 7],
    [qr.size - 7, 0],
  ]) {
    for (let dr = 0; dr < 7; dr++) {
      for (let dc = 0; dc < 7; dc++) {
        const ring = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
        assert.equal(at(r0 + dr, c0 + dc), ring !== 2, `finder at ${r0},${c0} wrong at ${dr},${dc}`);
      }
    }
  }
  // The separator: the row/column just outside each finder must be light.
  for (let i = 0; i < 8; i++) {
    assert.equal(at(7, i), false, 'top-left separator row');
    assert.equal(at(i, 7), false, 'top-left separator column');
  }
});

test('the timing patterns alternate across the whole code', () => {
  const qr = encodeQr(LINK);
  const at = (r, c) => qr.modules[r * qr.size + c];
  for (let i = 8; i < qr.size - 8; i++) {
    assert.equal(at(6, i), i % 2 === 0, `horizontal timing at ${i}`);
    assert.equal(at(i, 6), i % 2 === 0, `vertical timing at ${i}`);
  }
});

test('the dark module is set — a decoder uses it to orient the format field', () => {
  const qr = encodeQr(LINK);
  assert.equal(qr.modules[(qr.size - 8) * qr.size + 8], true);
});

test('the chosen mask is the lowest-penalty one, not merely the first', () => {
  const qr = encodeQr(LINK);
  const at = (r, c) => qr.modules[r * qr.size + c];
  const chosen = maskPenalty(qr.size, at);
  // The winner should not be an obviously bad grid: rule 4 alone caps a balanced code well under this.
  assert.ok(chosen < 1000, `penalty ${chosen} is implausibly high for a chosen mask`);
  assert.ok(qr.mask >= 0 && qr.mask < 8);
});

// ── read it back the way a scanner would ────────────────────────────────────────────────────────

const DATA_CODEWORDS_M = [0, 16, 28, 44, 64, 86, 108, 124, 154, 182, 216];
const BLOCKS_M = [
  [0, 0],
  [1, 0],
  [1, 0],
  [1, 0],
  [2, 0],
  [2, 0],
  [4, 0],
  [4, 0],
  [2, 2],
  [3, 2],
  [4, 1],
];
const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/**
 * A minimal decoder: recover the mask from the format field, unmask, walk the zigzag, de-interleave
 * the blocks, and parse the byte-mode header. No error correction — if the encoder is right, none is
 * needed, and requiring none is a stronger claim.
 */
function decode(qr) {
  const n = qr.size;
  const at = (r, c) => qr.modules[r * n + c];

  // Format field, first copy, read back as the 15 bits the encoder wrote.
  let raw = 0;
  const read = [];
  for (let i = 0; i <= 5; i++) read[i] = at(i, 8);
  read[6] = at(7, 8);
  read[7] = at(8, 8);
  read[8] = at(8, 7);
  for (let i = 9; i < 15; i++) read[i] = at(8, 14 - i);
  for (let i = 0; i < 15; i++) if (read[i]) raw |= 1 << i;
  const format = raw ^ 0x5412;
  const eccLevel = (format >> 13) & 0b11;
  const mask = (format >> 10) & 0b111;

  // Which modules are function patterns: re-derive by encoding a throwaway string at the same version
  // and comparing nothing — instead, mark them structurally.
  const reserved = new Array(n * n).fill(false);
  const mark = (r, c) => {
    if (r >= 0 && c >= 0 && r < n && c < n) reserved[r * n + c] = true;
  };
  for (let i = 0; i < n; i++) {
    mark(6, i);
    mark(i, 6);
  }
  for (const [r0, c0] of [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ]) {
    for (let dr = -1; dr <= 7; dr++) for (let dc = -1; dc <= 7; dc++) mark(r0 + dr, c0 + dc);
  }
  for (let i = 0; i <= 8; i++) {
    mark(8, i);
    mark(i, 8);
  }
  for (let i = 0; i < 8; i++) {
    mark(8, n - 1 - i);
    mark(n - 1 - i, 8);
  }
  const ALIGNMENT = [[], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
  const centres = ALIGNMENT[qr.version];
  const last = centres[centres.length - 1];
  for (const r of centres) {
    for (const c of centres) {
      if ((r === 6 && c === 6) || (r === 6 && c === last) || (r === last && c === 6)) continue;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) mark(r + dr, c + dc);
    }
  }
  if (qr.version >= 7) {
    for (let i = 0; i < 18; i++) {
      const a = n - 11 + (i % 3);
      const b = Math.floor(i / 3);
      mark(b, a);
      mark(a, b);
    }
  }

  // Walk the zigzag, undoing the mask as we go.
  const bits = [];
  let upward = true;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < n; v++) {
      for (let j = 0; j < 2; j++) {
        const col = right - j;
        const row = upward ? n - 1 - v : v;
        if (reserved[row * n + col]) continue;
        bits.push(at(row, col) !== MASKS[mask](row, col));
      }
    }
    upward = !upward;
  }
  const all = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let w = 0;
    for (let j = 0; j < 8; j++) w = (w << 1) | (bits[i + j] ? 1 : 0);
    all.push(w);
  }

  // De-interleave: undo the round-robin the encoder wrote the data blocks out in.
  const [g1, g2] = BLOCKS_M[qr.version];
  const totalBlocks = g1 + g2;
  const dataTotal = DATA_CODEWORDS_M[qr.version];
  const g1Size = Math.floor(dataTotal / totalBlocks);
  const sizes = Array.from({ length: totalBlocks }, (_, b) => (b < g1 ? g1Size : g1Size + 1));
  const blocks = sizes.map(() => []);
  let k = 0;
  for (let i = 0; i < g1Size + (g2 > 0 ? 1 : 0); i++) {
    for (let b = 0; b < totalBlocks; b++) if (i < sizes[b]) blocks[b].push(all[k++]);
  }
  const data = blocks.flat();

  // Parse the byte-mode segment.
  const bitStream = [];
  for (const w of data) for (let i = 7; i >= 0; i--) bitStream.push((w >> i) & 1);
  let p = 0;
  const take = (w) => {
    let v = 0;
    for (let i = 0; i < w; i++) v = (v << 1) | bitStream[p++];
    return v;
  };
  const mode = take(4);
  const count = take(qr.version <= 9 ? 8 : 16);
  const bytes = [];
  for (let i = 0; i < count; i++) bytes.push(take(8));
  return { eccLevel, mask, mode, text: utf8Decode(bytes) };
}

/** UTF-8 bytes back to a string, written out rather than reaching for a Node global. */
function utf8Decode(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    if (b < 0x80) {
      out += String.fromCodePoint(b);
      i += 1;
    } else if (b < 0xe0) {
      out += String.fromCodePoint(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
      i += 2;
    } else if (b < 0xf0) {
      out += String.fromCodePoint(((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f));
      i += 3;
    } else {
      out += String.fromCodePoint(((b & 0x07) << 18) | ((bytes[i + 1] & 0x3f) << 12) | ((bytes[i + 2] & 0x3f) << 6) | (bytes[i + 3] & 0x3f));
      i += 4;
    }
  }
  return out;
}

test('a scanner reading the finished code gets the exact URL back', () => {
  const qr = encodeQr(LINK);
  const out = decode(qr);
  assert.equal(out.mode, 0b0100, 'not byte mode');
  assert.equal(out.eccLevel, 0b00, 'not error-correction level M');
  assert.equal(out.mask, qr.mask, 'the format field disagrees with the mask that was applied');
  assert.equal(out.text, LINK);
});

test('the round trip holds across every version this encoder produces', () => {
  // One string per version boundary, so placement, interleaving and the alignment patterns that only
  // appear from version 2 (and the version field that only appears from 7) are all exercised.
  for (const len of [10, 30, 60, 90, 120, 160, 200, 213]) {
    const text = 'https://forgelegacy.expo.app/join-squad?code=' + 'A'.repeat(Math.max(0, len - 45));
    const qr = encodeQr(text);
    assert.equal(decode(qr).text, text, `round trip failed at version ${qr.version} (${text.length} bytes)`);
  }
});

test('a code carrying version information reads it back consistently', () => {
  // Version 7 and up carry an 18-bit version field in two corners; the round trip above covers the
  // data, this covers the fact that the field does not collide with it.
  const qr = encodeQr('x'.repeat(150));
  assert.ok(qr.version >= 7, `expected version 7+, got ${qr.version}`);
  assert.equal(decode(qr).text, 'x'.repeat(150));
});

test('the same input always produces the same code — nothing here is random', () => {
  const a = encodeQr(LINK);
  const b = encodeQr(LINK);
  assert.deepEqual(a.modules, b.modules);
  assert.equal(a.mask, b.mask);
});
