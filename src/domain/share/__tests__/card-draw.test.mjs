import test from 'node:test';
import assert from 'node:assert/strict';
import { BRAND_H, cardInnerWidth, composeCard, textExtent } from '../card-draw.ts';
import { CARD_PAD, CARD_W } from '../card-layout.ts';

/**
 * The card is composed twice — Canvas 2D on web, react-native-svg on device — from one geometry module and
 * one draw list. These tests hold the properties that a visual diff would otherwise be the only way to
 * catch, and that only show up after somebody has already posted the image.
 */

const shot = (w = 1200, h = 1600) => ({ w, h });

const compare = (over = {}) => ({
  photoUrls: ['then.jpg', 'now.jpg'],
  template: 'sidebyside',
  pairCount: 1,
  poseLabels: ['Front'],
  thenLabel: 'Then',
  nowLabel: 'Now',
  elapsed: '6 months',
  lines: [{ text: 'Showed up when it would have been easier not to.', emph: 'body' }],
  athlete: 'Isaiah',
  ...over,
});

const capture = (over = {}) => ({
  photoUrls: ['a.jpg'],
  template: null,
  entryTemplate: 'single',
  pairCount: 0,
  poseLabels: ['Front'],
  eyebrow: 'Transformation',
  title: 'March 2026',
  lines: [{ text: 'Down thirty pounds.', emph: 'bronze' }],
  athlete: 'Isaiah',
  ...over,
});

const texts = (d) => d.ops.filter((o) => o.kind === 'text');
const photos = (d) => d.ops.filter((o) => o.kind === 'photo');

test('the card is always CARD_W wide and taller than its own padding', () => {
  const d = composeCard(compare(), [shot(), shot()]);
  assert.equal(d.width, CARD_W);
  assert.ok(d.height > CARD_PAD * 2 + BRAND_H);
});

test('the ground is painted first and covers the whole card — paint order is the list order', () => {
  const d = composeCard(compare(), [shot(), shot()]);
  const first = d.ops[0];
  assert.equal(first.kind, 'rect');
  assert.equal(first.x, 0);
  assert.equal(first.y, 0);
  assert.equal(first.w, CARD_W);
  assert.equal(first.h, d.height, 'a short ground would leave a transparent strip at the foot');
});

test('⚠ nothing drawn escapes the card — the failure nobody sees until it is posted', () => {
  const cases = [
    composeCard(compare(), [shot(), shot()]),
    composeCard(compare({ template: 'stacked' }), [shot(), shot()]),
    composeCard(compare({ template: 'slider' }), [shot(), shot()]),
    composeCard(compare({ template: 'grid', pairCount: 3, photoUrls: ['a', 'b', 'c', 'd', 'e', 'f'], poseLabels: ['Front', 'Back', 'Side'] }), Array(6).fill(shot())),
    composeCard(capture()),
    composeCard(capture({ entryTemplate: 'gallery', photoUrls: ['a', 'b', 'c'], poseLabels: ['Front', 'Back', 'Side'] }), Array(3).fill(shot())),
    composeCard(capture({ entryTemplate: 'column', photoUrls: ['a', 'b'], poseLabels: ['Front', 'Back'] }), Array(2).fill(shot())),
  ];
  for (const d of cases) {
    for (const op of d.ops) {
      if (op.kind === 'text') {
        const { left, right } = textExtent(op);
        assert.ok(left >= -1, `text "${op.text}" starts at ${Math.round(left)}`);
        assert.ok(right <= CARD_W + 1, `text "${op.text}" reaches ${Math.round(right)} > ${CARD_W}`);
        assert.ok(op.y <= d.height, `text "${op.text}" sits below the card at y=${op.y}`);
      }
      if (op.kind === 'photo') {
        assert.ok(op.frame.x >= 0 && op.frame.x + op.frame.w <= CARD_W, 'photo frame escapes horizontally');
        assert.ok(op.frame.y + op.frame.h <= d.height, 'photo frame escapes the foot');
      }
      if (op.kind === 'chip') {
        assert.ok(op.x + op.w <= CARD_W, 'chip escapes horizontally');
      }
    }
  }
});

test('every photo it is given gets placed, exactly once', () => {
  const d = composeCard(
    compare({ template: 'grid', pairCount: 3, photoUrls: ['a', 'b', 'c', 'd', 'e', 'f'], poseLabels: ['F', 'B', 'S'] }),
    Array(6).fill(shot()),
  );
  const idx = photos(d).map((p) => p.index).sort((a, b) => a - b);
  assert.deepEqual(idx, [0, 1, 2, 3, 4, 5]);
});

test('a photo with no loaded size renders as an empty recess rather than a broken image', () => {
  const d = composeCard(compare(), [shot(), undefined]);
  const p = photos(d);
  assert.ok(p[0].image, 'the loaded one places');
  assert.equal(p[1].image, null, 'the unloaded one has nothing to place');
});

test('the athlete’s pan and zoom survives into the placed image — it is the point of a comparison', () => {
  const plain = composeCard(compare(), [shot(), shot()]);
  const moved = composeCard(compare({ transforms: [{ tx: 0.2, ty: 0, scale: 1.5 }, undefined] }), [shot(), shot()]);
  const a = photos(plain)[0].image;
  const b = photos(moved)[0].image;
  assert.notEqual(a.x, b.x, 'tx was ignored');
  assert.ok(b.w > a.w, 'scale was ignored');
});

test('the slider exports as a hard split with a seam between the two photos', () => {
  const d = composeCard(compare({ template: 'slider' }), [shot(), shot()]);
  const p = photos(d);
  assert.equal(p[0].radius, 0, 'a split frame is not rounded on the inside edge');
  const seam = d.ops.find((o) => o.kind === 'rect' && o.w === 4);
  assert.ok(seam, 'no seam drawn');
  assert.equal(seam.x, p[1].frame.x - 2, 'the seam must sit on the join');
});

test('side-by-side draws no seam — only the slider does', () => {
  const d = composeCard(compare({ template: 'sidebyside' }), [shot(), shot()]);
  assert.ok(!d.ops.some((o) => o.kind === 'rect' && o.w === 4));
});

test('the Then/Now chips carry the athlete’s own labels', () => {
  const d = composeCard(compare({ thenLabel: 'Jan 2025', nowLabel: 'Today' }), [shot(), shot()]);
  const chips = d.ops.filter((o) => o.kind === 'chip').map((c) => c.label);
  assert.deepEqual(chips, ['JAN 2025', 'TODAY']);
});

test('a longer chip label makes a wider chip, so the text is never clipped by its own pill', () => {
  const short = composeCard(compare({ thenLabel: 'Then' }), [shot(), shot()]);
  const long = composeCard(compare({ thenLabel: 'Eighteen months ago' }), [shot(), shot()]);
  const w = (d) => d.ops.find((o) => o.kind === 'chip').w;
  assert.ok(w(long) > w(short));
});

test('long copy wraps to several centred rows, each inside the text column', () => {
  const text =
    'I stopped counting the days and started counting the chapters instead, and somewhere in there the person doing the work changed.';
  const d = composeCard(compare({ lines: [{ text, emph: 'body' }] }), [shot(), shot()]);
  const rows = texts(d).filter((t) => t.anchor === 'middle' && t.italic);
  assert.ok(rows.length > 1, 'this should have wrapped');
  for (const r of rows) {
    const { left, right } = textExtent(r);
    assert.ok(left >= CARD_PAD - 1 && right <= CARD_W - CARD_PAD + 1, `"${r.text}" broke the column`);
  }
});

test('the card grows for content rather than clipping it', () => {
  const one = composeCard(compare({ lines: [{ text: 'Short.', emph: 'muted' }] }), [shot(), shot()]);
  const many = composeCard(
    compare({
      lines: [
        { text: 'Short.', emph: 'muted' },
        { text: 'A second line that has considerably more to say than the first one did.', emph: 'body' },
        { text: 'And a third.', emph: 'bronze' },
      ],
    }),
    [shot(), shot()],
  );
  assert.ok(many.height > one.height);
});

test('a photoless card still composes — ground, brand and the text column', () => {
  const d = composeCard({ photoUrls: [], template: null, pairCount: 0, lines: [{ text: 'Sealed.', emph: 'bronze' }] });
  assert.equal(photos(d).length, 0);
  assert.ok(d.height > CARD_PAD * 2);
  assert.ok(texts(d).some((t) => t.text === 'FORGE LEGACY'));
  assert.ok(texts(d).some((t) => t.text === 'Sealed.'));
});

test('optional sections appear only when the spec carries them', () => {
  const bare = composeCard({ photoUrls: [], template: null, pairCount: 0, lines: [] });
  const t = texts(bare).map((x) => x.text);
  assert.deepEqual(t, ['FORGE LEGACY'], 'a bare spec draws the brand and nothing else');
  assert.ok(!bare.ops.some((o) => o.kind === 'line'), 'no rule without an athlete name');

  const full = composeCard(capture(), [shot()]);
  const ft = texts(full).map((x) => x.text);
  assert.ok(ft.includes('TRANSFORMATION'), 'eyebrow is uppercased');
  assert.ok(ft.includes('March 2026'), 'title keeps its own case');
  assert.ok(ft.includes('Isaiah'));
  assert.ok(full.ops.some((o) => o.kind === 'line'), 'the athlete gets a rule above their name');
});

test('uppercase labels are tracked — losing letterSpacing is how a label overflows quietly', () => {
  const d = composeCard(capture(), [shot()]);
  const brand = texts(d).find((t) => t.text === 'FORGE LEGACY');
  const eyebrow = texts(d).find((t) => t.text === 'TRANSFORMATION');
  assert.equal(brand.letterSpacing, 5);
  assert.equal(eyebrow.letterSpacing, 3);
});

test('the brand row uses a middle baseline, which a renderer has to shift for', () => {
  const d = composeCard(capture(), [shot()]);
  assert.equal(texts(d).find((t) => t.text === 'FORGE LEGACY').baseline, 'middle');
});

test('pose names are drawn above their own photo, never below it', () => {
  const d = composeCard(
    capture({ entryTemplate: 'column', photoUrls: ['a', 'b'], poseLabels: ['Front', 'Back'] }),
    Array(2).fill(shot()),
  );
  const p = photos(d);
  for (const name of ['FRONT', 'BACK']) {
    const label = texts(d).find((t) => t.text === name);
    assert.ok(label, `${name} was not drawn`);
    const own = p.find((x) => Math.abs(x.frame.y - 18 - label.y) < 0.5);
    assert.ok(own, `${name} does not sit above any photo`);
  }
});

test('the text column is the card minus its padding on both sides', () => {
  assert.equal(cardInnerWidth(), CARD_W - CARD_PAD * 2);
});
