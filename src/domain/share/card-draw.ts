/**
 * The share card as an ordered list of primitives — the drawing half, made checkable.
 *
 * ══ WHY THIS IS DATA AND NOT DRAWING CODE ══
 *
 * `card-layout.ts` already carries the geometry and says so honestly: "the drawing half is unavoidably
 * visual." It was, while the only implementation was 130 lines of Canvas 2D calls in a web-only file. The
 * native port cannot use canvas, so the card had to be described a second time — and describing it twice
 * in two renderers is exactly how the two drift.
 *
 * So the drawing is described ONCE, here, as an ordered list of primitives with every number resolved.
 * `share-image.web.ts` keeps its canvas calls (it works, it ships, and rewriting it risks a regression on
 * the one platform where saving already succeeds); the native renderer maps this list to react-native-svg
 * elements and does no arithmetic of its own. The list is the thing tests can hold: that nothing escapes
 * the card, that the height covers the content, that a spec with photos actually places them.
 *
 * ══ ORDER IS PAINT ORDER ══
 *
 * The list is emitted back-to-front exactly as the canvas draws: ground, border, brand, photos, seam, pose
 * names, then the text column. A renderer must not sort it.
 */

import {
  CARD_PAD,
  CARD_W,
  drawRect,
  photoBlock,
  poseBlock,
  type PlacedPhoto,
  type Rect,
} from './card-layout.ts';
import { chipWidth, measureText, wrapText, type CardFace } from './text-measure.ts';

// Verbatim from `share-image.web.ts`. Duplicated rather than imported because that module is web-only —
// importing it into a native path would pull `document` into a bundle that has none.
const INK = '#F0EDE8';
const MUTED = '#9E9890';
const FAINT = '#666060';
const BRONZE = '#C99767';
const BRONZE_D = '#BA8654';
const CARD_BG = '#0d0b09';
const RECESS = '#09090B';
const BORDER = 'rgba(181,138,97,0.40)';
const CHIP_BG = 'rgba(9,9,11,0.78)';
const RULE = '#1A1A1E';

/** Height the brand row reserves above the first photo. */
const BRAND_H = 96;

export type DrawOp =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; radius?: number; fill?: string; stroke?: string; strokeWidth?: number }
  /** A photo in its frame. `image` is null when the frame should render as an empty recess. */
  | { kind: 'photo'; index: number; frame: Rect; radius: number; image: Rect | null }
  | { kind: 'chip'; x: number; y: number; w: number; h: number; radius: number; label: string; textX: number; textY: number }
  | {
      kind: 'text';
      x: number;
      y: number;
      text: string;
      size: number;
      face: CardFace;
      weight: '600' | '700';
      italic?: boolean;
      fill: string;
      anchor: 'start' | 'middle';
      letterSpacing?: number;
      /** `middle` means the canvas used textBaseline='middle' — the renderer must shift for it. */
      baseline?: 'alphabetic' | 'middle';
    }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; strokeWidth: number };

export interface CardDrawing {
  width: number;
  height: number;
  ops: DrawOp[];
}

export interface DrawSpec {
  photoUrls: string[];
  transforms?: ({ tx: number; ty: number; scale: number } | undefined)[];
  template: import('./card-layout.ts').ShareTemplate | null;
  entryTemplate?: import('./card-layout.ts').EntryTemplate;
  pairCount: number;
  poseLabels?: string[];
  thenLabel?: string;
  nowLabel?: string;
  elapsed?: string;
  eyebrow?: string;
  title?: string;
  lines: { text: string; emph: 'bronze' | 'body' | 'muted' }[];
  athlete?: string;
}

/** Pixel size of each loaded photo, index-aligned with `photoUrls`. Absent entries render as a recess. */
export type NaturalSizes = ({ w: number; h: number } | undefined)[];

/** The card's text column width — every wrap measures against this. */
export const cardInnerWidth = (): number => CARD_W - CARD_PAD * 2;

/**
 * Resolve the vertical flow once, so height and paint agree by construction.
 *
 * The canvas version walks the layout twice — once to learn the height, once to draw — and the two walks
 * have to stay in step by hand. Here the measure pass produces the ops, so they cannot disagree.
 */
export function composeCard(spec: DrawSpec, natural: NaturalSizes = []): CardDrawing {
  const inner = cardInnerWidth();
  const mid = CARD_W / 2;

  const block =
    spec.pairCount > 0 && spec.template && spec.photoUrls.length >= 2
      ? photoBlock(spec.template, spec.pairCount, CARD_PAD + BRAND_H)
      : spec.photoUrls.length
        ? poseBlock(spec.entryTemplate ?? 'single', spec.photoUrls.length, CARD_PAD + BRAND_H)
        : { photos: [] as PlacedPhoto[], height: 0, divider: false };

  // ── measure the text column, using the same faces and sizes the canvas sets ──
  const lineMetrics = spec.lines.map((l) => {
    const face: CardFace = l.emph === 'body' ? 'serif' : 'sans';
    const size = l.emph === 'body' ? 28 : 26;
    const text = l.emph === 'body' ? `“${l.text}”` : l.text;
    const rows = wrapText(text, inner, size, face);
    const lh = l.emph === 'body' ? 42 : 38;
    return { emph: l.emph, face, size, rows, lh, h: rows.length * lh + 18 };
  });

  let y = CARD_PAD + BRAND_H + block.height;
  if (block.height) y += 40;
  if (spec.elapsed) y += 56;
  if (spec.eyebrow) y += 34;
  if (spec.title) y += 74;
  y += lineMetrics.reduce((n, m) => n + m.h, 0);
  if (spec.athlete) y += 96;
  const height = Math.round(y + CARD_PAD);

  const ops: DrawOp[] = [];

  // ── ground and border ──
  ops.push({ kind: 'rect', x: 0, y: 0, w: CARD_W, h: height, fill: CARD_BG });
  ops.push({ kind: 'rect', x: 2, y: 2, w: CARD_W - 4, h: height - 4, radius: 40, stroke: BORDER, strokeWidth: 3 });

  // ── brand ──
  ops.push({ kind: 'rect', x: CARD_PAD, y: CARD_PAD, w: 40, h: 40, radius: 12, fill: BRONZE_D });
  ops.push({
    kind: 'text',
    x: CARD_PAD + 58,
    y: CARD_PAD + 21,
    text: 'FORGE LEGACY',
    size: 22,
    face: 'sans',
    weight: '700',
    fill: MUTED,
    anchor: 'start',
    letterSpacing: 5,
    baseline: 'middle',
  });

  // ── photos ──
  for (const p of block.photos) {
    const nat = natural[p.index];
    ops.push({
      kind: 'photo',
      index: p.index,
      frame: { x: p.x, y: p.y, w: p.w, h: p.h },
      radius: block.divider ? 0 : 18,
      // The athlete's own pan/zoom is the point of a comparison, so it is resolved here rather than left
      // to a renderer's aspect-fit. Without a loaded size there is nothing to place — draw the recess.
      image: nat ? drawRect(p, nat, spec.transforms?.[p.index]) : null,
    });
    if (p.chip) {
      const label = (p.chip === 'Then' ? spec.thenLabel ?? 'Then' : spec.nowLabel ?? 'Now').toUpperCase();
      const w = chipWidth(label, 20);
      ops.push({
        kind: 'chip',
        x: p.x + 16,
        y: p.y + 16,
        w,
        h: 36,
        radius: 18,
        label,
        textX: p.x + 16 + 14,
        textY: p.y + 16 + 19,
      });
    }
  }

  // ── the slider's seam ──
  if (block.divider && block.photos.length > 1) {
    const seam = block.photos[1].x;
    ops.push({ kind: 'rect', x: seam - 2, y: block.photos[0].y, w: 4, h: block.photos[0].h, fill: BRONZE });
  }

  // ── pose names, wherever the geometry asked for one ──
  if (spec.poseLabels?.length) {
    for (const p of block.photos) {
      if (p.labelIndex === undefined) continue;
      const pose = spec.poseLabels[p.labelIndex];
      if (!pose) continue;
      ops.push({
        kind: 'text',
        x: p.x,
        y: p.y - 18,
        text: pose.toUpperCase(),
        size: 20,
        face: 'sans',
        weight: '700',
        fill: FAINT,
        anchor: 'start',
        letterSpacing: 2,
      });
    }
  }

  // ── the text column ──
  let ty = CARD_PAD + BRAND_H + block.height + (block.height ? 40 : 0);

  if (spec.elapsed) {
    ops.push({ kind: 'text', x: mid, y: ty, text: spec.elapsed.toUpperCase(), size: 30, face: 'sans', weight: '700', fill: BRONZE, anchor: 'middle', letterSpacing: 3 });
    ty += 56;
  }
  if (spec.eyebrow) {
    ops.push({ kind: 'text', x: mid, y: ty, text: spec.eyebrow.toUpperCase(), size: 20, face: 'sans', weight: '700', fill: BRONZE_D, anchor: 'middle', letterSpacing: 3 });
    ty += 34;
  }
  if (spec.title) {
    ops.push({ kind: 'text', x: mid, y: ty + 24, text: spec.title, size: 62, face: 'serif', weight: '700', fill: INK, anchor: 'middle' });
    ty += 74;
  }
  for (const m of lineMetrics) {
    const fill = m.emph === 'bronze' ? BRONZE_D : m.emph === 'body' ? MUTED : FAINT;
    ty += 18;
    for (const row of m.rows) {
      ops.push({ kind: 'text', x: mid, y: ty, text: row, size: m.size, face: m.face, weight: '600', italic: m.emph === 'body', fill, anchor: 'middle' });
      ty += m.lh;
    }
  }
  if (spec.athlete) {
    ty += 30;
    ops.push({ kind: 'line', x1: CARD_PAD, y1: ty, x2: CARD_W - CARD_PAD, y2: ty, stroke: RULE, strokeWidth: 2 });
    ops.push({ kind: 'text', x: mid, y: ty + 40, text: spec.athlete, size: 26, face: 'sans', weight: '600', fill: MUTED, anchor: 'middle' });
  }

  return { width: CARD_W, height, ops };
}

/**
 * The widest any text op reaches, as an interval on x.
 *
 * Exists for the tests rather than the renderer: a centred string that overflows is the failure this port
 * is most likely to introduce, and it is invisible until somebody posts the image.
 */
export function textExtent(op: Extract<DrawOp, { kind: 'text' }>): { left: number; right: number } {
  const w = measureText(op.text, op.size, op.face, op.letterSpacing ?? 0);
  return op.anchor === 'middle' ? { left: op.x - w / 2, right: op.x + w / 2 } : { left: op.x, right: op.x + w };
}

export const CARD_COLORS = { INK, MUTED, FAINT, BRONZE, BRONZE_D, CARD_BG, RECESS, BORDER, CHIP_BG, RULE };
export { BRAND_H };
