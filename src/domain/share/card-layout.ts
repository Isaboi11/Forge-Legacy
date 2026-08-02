/**
 * Where everything sits on the exported share card — geometry only, no drawing.
 *
 * The card an athlete SEES is React Native views at ~300pt wide. The card they SAVE has to be a real
 * image at a real resolution, so it is composed rather than screenshotted. Composing it is also the more
 * honest of the two: a screen capture exports whatever the device happened to render — the wrong
 * resolution, the wrong pixel density, and any UI that strayed into frame.
 *
 * The cost of composing is that two layouts describe one card and can drift. This module is the half
 * that can be checked: rectangles must sit inside the card, must not overlap, and every template must
 * place every photo it was given. The drawing half is unavoidably visual.
 */

export type ShareTemplate = 'slider' | 'sidebyside' | 'stacked' | 'grid';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One photo, placed, with the label that belongs on it. */
export interface PlacedPhoto extends Rect {
  /** Index into the flattened [then, now, then, now, …] photo list. */
  index: number;
  /** Chip drawn on the photo — 'Then' / 'Now', or nothing on later rows of a grid. */
  chip?: string;
  /** The pose name, drawn above a grid row. Present on the first photo of each row only. */
  poseLabel?: string;
}

export interface PhotoBlock {
  photos: PlacedPhoto[];
  /** Total height the block occupies, so the caller can flow text beneath it. */
  height: number;
  /** True when the template wants a divider drawn down the middle of a single frame. */
  divider: boolean;
}

/** Export width. Everything below is expressed against it, so one number changes the whole card. */
export const CARD_W = 1080;
export const CARD_PAD = 64;
/** Gap between two photos in a pair, and between grid rows. */
const GAP = 16;
/** A photo's shape. Portrait, because progress photos are. */
const ASPECT = 4 / 5;

/**
 * Place the photos for a template inside a box `CARD_W - 2·CARD_PAD` wide, starting at `top`.
 *
 * SLIDER EXPORTS AS A SPLIT, deliberately. On screen it is a draggable divider; a still image cannot be
 * dragged, and exporting the handle's momentary position would save one arbitrary frame of an
 * interaction. An even split shows both photos whole, which is what the slider is for.
 */
export function photoBlock(template: ShareTemplate, pairCount: number, top: number): PhotoBlock {
  const inner = CARD_W - CARD_PAD * 2;
  const pairs = Math.max(1, pairCount);

  if (template === 'stacked') {
    const h = Math.round(inner / ASPECT / 1.6);
    return {
      photos: [
        { index: 0, x: CARD_PAD, y: top, w: inner, h, chip: 'Then' },
        { index: 1, x: CARD_PAD, y: top + h + GAP, w: inner, h, chip: 'Now' },
      ],
      height: h * 2 + GAP,
      divider: false,
    };
  }

  if (template === 'grid') {
    const half = Math.round((inner - GAP) / 2);
    const h = Math.round(half / ASPECT);
    const rowLabel = 34; // room for the pose name above each row
    const photos: PlacedPhoto[] = [];
    let y = top;
    for (let i = 0; i < pairs; i++) {
      y += rowLabel;
      photos.push({ index: i * 2, x: CARD_PAD, y, w: half, h, chip: i === 0 ? 'Then' : undefined, poseLabel: '' });
      photos.push({ index: i * 2 + 1, x: CARD_PAD + half + GAP, y, w: half, h, chip: i === 0 ? 'Now' : undefined });
      y += h + GAP;
    }
    return { photos, height: y - GAP - top, divider: false };
  }

  if (template === 'slider') {
    // One frame, two photos, a hard divider between them.
    const h = Math.round(inner / ASPECT / 1.35);
    const half = Math.round(inner / 2);
    return {
      photos: [
        { index: 0, x: CARD_PAD, y: top, w: half, h, chip: 'Then' },
        { index: 1, x: CARD_PAD + half, y: top, w: inner - half, h, chip: 'Now' },
      ],
      height: h,
      divider: true,
    };
  }

  // side-by-side (default)
  const half = Math.round((inner - GAP) / 2);
  const h = Math.round(half / ASPECT);
  return {
    photos: [
      { index: 0, x: CARD_PAD, y: top, w: half, h, chip: 'Then' },
      { index: 1, x: CARD_PAD + half + GAP, y: top, w: half, h, chip: 'Now' },
    ],
    height: h,
    divider: false,
  };
}

/** A single photo (not a comparison) — one band across the card. */
export function singlePhoto(top: number): PhotoBlock {
  const inner = CARD_W - CARD_PAD * 2;
  const h = Math.round(inner / ASPECT / 1.5);
  return { photos: [{ index: 0, x: CARD_PAD, y: top, w: inner, h }], height: h, divider: false };
}

/**
 * How to draw one photo into its frame, honouring the athlete's own pan/zoom.
 *
 * The alignment they set when building the comparison is the whole point of the feature — two photos
 * framed differently are not a comparison. `cover` first (fill the frame, crop the overflow), then the
 * athlete's transform on top, expressed in the frame's own units rather than the preview's.
 */
export function drawRect(
  frame: Rect,
  natural: { w: number; h: number },
  transform?: { tx: number; ty: number; scale: number },
): Rect {
  const scale = Math.max(frame.w / natural.w, frame.h / natural.h) * (transform?.scale ?? 1);
  const w = natural.w * scale;
  const h = natural.h * scale;
  // tx/ty are fractions of the frame in the preview's model, so they scale with the frame, not the photo.
  const dx = (transform?.tx ?? 0) * frame.w;
  const dy = (transform?.ty ?? 0) * frame.h;
  return {
    x: frame.x + (frame.w - w) / 2 + dx,
    y: frame.y + (frame.h - h) / 2 + dy,
    w,
    h,
  };
}
