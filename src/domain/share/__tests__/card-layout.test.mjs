import test from 'node:test';
import assert from 'node:assert/strict';

import { CARD_PAD, CARD_W, drawRect, photoBlock, singlePhoto } from '../card-layout.ts';

const TEMPLATES = ['slider', 'sidebyside', 'stacked', 'grid'];
const inner = CARD_W - CARD_PAD * 2;
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

test('every template places every photo it was given', () => {
  for (const t of TEMPLATES) {
    const pairs = t === 'grid' ? 3 : 1;
    const { photos } = photoBlock(t, pairs, 100);
    assert.equal(photos.length, pairs * 2, `${t} placed ${photos.length} of ${pairs * 2}`);
    // Indices address the flattened [then, now, then, now, …] list with no gaps or repeats.
    assert.deepEqual(
      photos.map((p) => p.index).sort((a, b) => a - b),
      Array.from({ length: pairs * 2 }, (_, i) => i),
      `${t} indices are wrong`,
    );
  }
});

test('nothing is placed outside the card', () => {
  for (const t of TEMPLATES) {
    for (const p of photoBlock(t, 3, 100).photos) {
      assert.ok(p.x >= CARD_PAD, `${t}: x ${p.x} crosses the left padding`);
      assert.ok(p.x + p.w <= CARD_W - CARD_PAD + 1, `${t}: right edge ${p.x + p.w} exceeds the card`);
      assert.ok(p.w > 0 && p.h > 0, `${t}: zero-sized frame`);
    }
  }
});

test('no two photos overlap — except the slider, where touching IS the layout', () => {
  for (const t of TEMPLATES) {
    const { photos, divider } = photoBlock(t, 3, 100);
    for (let i = 0; i < photos.length; i++) {
      for (let j = i + 1; j < photos.length; j++) {
        assert.equal(overlaps(photos[i], photos[j]), false, `${t}: photo ${i} overlaps ${j}`);
      }
    }
    // The slider is one frame split down the middle: the halves must ABUT, with no seam and no gap.
    if (divider) {
      assert.equal(photos[0].x + photos[0].w, photos[1].x, 'slider halves must meet exactly');
      assert.equal(photos[0].x + photos[0].w + photos[1].w, CARD_PAD + inner, 'slider must span the full width');
    }
  }
});

test('the reported height covers everything placed', () => {
  for (const t of TEMPLATES) {
    const top = 100;
    const { photos, height } = photoBlock(t, 3, top);
    const lowest = Math.max(...photos.map((p) => p.y + p.h));
    assert.ok(lowest <= top + height + 1, `${t}: content reaches ${lowest}, block claims ${top + height}`);
    // And it is not wildly over-reserved either — text flowing beneath should not float.
    assert.ok(lowest >= top + height - 40, `${t}: reserves ${height} for content ending at ${lowest - top}`);
  }
});

test('a grid grows with the number of poses; the others do not', () => {
  assert.ok(photoBlock('grid', 3, 0).height > photoBlock('grid', 1, 0).height);
  for (const t of ['slider', 'sidebyside', 'stacked']) {
    assert.equal(photoBlock(t, 3, 0).height, photoBlock(t, 1, 0).height, `${t} must ignore extra pairs`);
  }
});

test('Then and Now are labelled once, on the first row only', () => {
  const { photos } = photoBlock('grid', 3, 0);
  assert.deepEqual(photos.filter((p) => p.chip).map((p) => p.chip), ['Then', 'Now']);
  for (const t of ['slider', 'sidebyside', 'stacked']) {
    assert.deepEqual(photoBlock(t, 1, 0).photos.map((p) => p.chip), ['Then', 'Now'], `${t} lost its labels`);
  }
});

test('zero pairs still yields a drawable block rather than an empty card', () => {
  for (const t of TEMPLATES) {
    assert.ok(photoBlock(t, 0, 0).photos.length >= 2, `${t} produced nothing`);
  }
});

// ── the athlete's own framing ────────────────────────────────────────────────

test('drawRect covers the frame — a photo never leaves a gap at the edge', () => {
  const frame = { x: 0, y: 0, w: 400, h: 500 };
  for (const natural of [{ w: 1000, h: 1000 }, { w: 3000, h: 1000 }, { w: 800, h: 2400 }]) {
    const r = drawRect(frame, natural);
    assert.ok(r.w >= frame.w - 0.01 && r.h >= frame.h - 0.01, `${natural.w}×${natural.h} left a gap`);
    assert.ok(r.x <= frame.x + 0.01 && r.y <= frame.y + 0.01, 'photo starts inside the frame');
  }
});

test('drawRect honours pan and zoom — the alignment IS the comparison', () => {
  // Two photos framed differently are not a comparison, so a transform that is ignored is a bug that
  // looks like a design choice.
  const frame = { x: 0, y: 0, w: 400, h: 500 };
  const nat = { w: 1000, h: 1000 };
  const plain = drawRect(frame, nat);
  const zoomed = drawRect(frame, nat, { tx: 0, ty: 0, scale: 2 });
  assert.ok(zoomed.w > plain.w * 1.9, 'zoom was ignored');

  const panned = drawRect(frame, nat, { tx: 0.25, ty: -0.1, scale: 1 });
  assert.equal(Math.round(panned.x - plain.x), Math.round(0.25 * frame.w), 'pan x is not in frame units');
  assert.equal(Math.round(panned.y - plain.y), Math.round(-0.1 * frame.h), 'pan y is not in frame units');
});

test('a single photo spans the card', () => {
  const { photos, height } = singlePhoto(50);
  assert.equal(photos.length, 1);
  assert.equal(photos[0].x, CARD_PAD);
  assert.equal(photos[0].w, inner);
  assert.equal(photos[0].y, 50);
  assert.equal(height, photos[0].h);
});
