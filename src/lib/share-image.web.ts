import { CARD_PAD, CARD_W, drawRect, photoBlock, singlePhoto, type PlacedPhoto } from '@/domain/share/card-layout';
import type { SaveResult, ShareCardSpec } from './share-image';

export type { SaveResult, ShareCardSpec, ShareCardLine } from './share-image';

/**
 * Compose the share card as a real image and hand it to the browser as a download.
 *
 * ══ COMPOSED, NOT SCREENSHOTTED ══
 *
 * The obvious implementation captures the preview view. It is also the worse one: a capture exports
 * whatever the device happened to render — the wrong resolution, the device's pixel density, and any UI
 * that strayed into frame — and on the web it needs a DOM-rasterising dependency that reads computed
 * styles and gets fonts, shadows and gradients approximately right. Drawing the card deliberately at
 * 1080px gives an exact result with no new dependency.
 *
 * ══ THE PHOTO IS THE POINT, SO A PHOTO THAT WILL NOT DRAW IS A FAILURE ══
 *
 * Canvas refuses to export once a cross-origin image is drawn without CORS headers — `toBlob` throws a
 * SecurityError on the tainted canvas. Supabase storage sends the headers, so `crossOrigin` normally
 * succeeds; when it does not, this returns a reason. It does NOT quietly skip the image, because a
 * transformation card with the transformation missing is not a lesser version of the thing, it is a
 * different and dishonest one.
 */

const INK = '#F0EDE8';
const MUTED = '#9E9890';
const FAINT = '#666060';
const BRONZE = '#C99767';
const BRONZE_D = '#BA8654';
const CARD_BG = '#0d0b09';
const RECESS = '#09090B';

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
/** Playfair is loaded by expo-font; fall back to a serif rather than silently rendering the sans. */
const SERIF = '"PlayfairDisplay_600SemiBold", "Iowan Old Style", Palatino, Georgia, serif';

export const canSaveImage = true;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image'));
    img.src = url;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Wrap to the card's inner width, and report the lines so the caller can reserve the height. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function drawChip(ctx: CanvasRenderingContext2D, label: string, x: number, y: number) {
  ctx.font = `700 20px ${SANS}`;
  const w = ctx.measureText(label.toUpperCase()).width + 28;
  ctx.fillStyle = 'rgba(9,9,11,0.78)';
  roundRect(ctx, x, y, w, 36, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(181,138,97,0.40)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = BRONZE;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.toUpperCase(), x + 14, y + 19);
}

export async function saveShareCard(spec: ShareCardSpec): Promise<SaveResult> {
  if (typeof document === 'undefined') return { ok: false, reason: 'Saving isn’t available here.' };

  // Load every photo FIRST. Half a card is not worth producing.
  let images: HTMLImageElement[];
  try {
    images = await Promise.all(spec.photoUrls.map(loadImage));
  } catch {
    return { ok: false, reason: 'Couldn’t read the photos to build the image. Try again in a moment.' };
  }

  // Fonts must be ready or the first draw silently uses a fallback and the measurements are wrong.
  try {
    await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
  } catch {
    /* a browser without the Font Loading API still draws, just with fallbacks */
  }

  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) return { ok: false, reason: 'Saving isn’t available here.' };

  const inner = CARD_W - CARD_PAD * 2;
  const BRAND_H = 96;

  // ── measure: lay the card out once to learn its height ──
  const block = spec.template && spec.photoUrls.length >= 2
    ? photoBlock(spec.template, spec.pairCount, CARD_PAD + BRAND_H)
    : spec.photoUrls.length
      ? singlePhoto(CARD_PAD + BRAND_H)
      : { photos: [] as PlacedPhoto[], height: 0, divider: false };

  let y = CARD_PAD + BRAND_H + block.height;
  if (block.height) y += 40;
  if (spec.elapsed) y += 56;
  if (spec.eyebrow) y += 34;
  if (spec.title) y += 74;

  const lineMetrics = spec.lines.map((l) => {
    measure.font = l.emph === 'body' ? `italic 28px ${SERIF}` : `600 26px ${SANS}`;
    const text = l.emph === 'body' ? `“${l.text}”` : l.text;
    const rows = wrap(measure, text, inner);
    const lh = l.emph === 'body' ? 42 : 38;
    return { ...l, rows, lh, h: rows.length * lh + 18 };
  });
  y += lineMetrics.reduce((n, m) => n + m.h, 0);
  if (spec.athlete) y += 96;
  const CARD_H = Math.round(y + CARD_PAD);

  // ── draw ──
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { ok: false, reason: 'Saving isn’t available here.' };

  ctx.fillStyle = CARD_BG;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.strokeStyle = 'rgba(181,138,97,0.40)';
  ctx.lineWidth = 3;
  roundRect(ctx, 2, 2, CARD_W - 4, CARD_H - 4, 40);
  ctx.stroke();

  // brand
  ctx.fillStyle = BRONZE_D;
  roundRect(ctx, CARD_PAD, CARD_PAD, 40, 40, 12);
  ctx.fill();
  ctx.fillStyle = MUTED;
  ctx.font = `700 22px ${SANS}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '5px';
  ctx.fillText('FORGE LEGACY', CARD_PAD + 58, CARD_PAD + 21);
  ctx.letterSpacing = '0px';

  // photos
  for (const p of block.photos) {
    const img = images[p.index];
    ctx.save();
    roundRect(ctx, p.x, p.y, p.w, p.h, block.divider ? 0 : 18);
    ctx.clip();
    ctx.fillStyle = RECESS;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    if (img) {
      const r = drawRect(p, { w: img.naturalWidth, h: img.naturalHeight }, spec.transforms?.[p.index]);
      ctx.drawImage(img, r.x, r.y, r.w, r.h);
    }
    ctx.restore();
    if (p.chip) drawChip(ctx, p.chip === 'Then' ? spec.thenLabel ?? 'Then' : spec.nowLabel ?? 'Now', p.x + 16, p.y + 16);
  }
  if (block.divider && block.photos.length > 1) {
    const seam = block.photos[1].x;
    ctx.fillStyle = BRONZE;
    ctx.fillRect(seam - 2, block.photos[0].y, 4, block.photos[0].h);
  }
  // pose names above each grid row
  if (spec.template === 'grid' && spec.poseLabels?.length) {
    ctx.fillStyle = FAINT;
    ctx.font = `700 20px ${SANS}`;
    ctx.textAlign = 'left';
    ctx.letterSpacing = '2px';
    block.photos.forEach((p) => {
      if (p.poseLabel === undefined) return;
      const pose = spec.poseLabels?.[Math.floor(p.index / 2)];
      if (pose) ctx.fillText(pose.toUpperCase(), p.x, p.y - 18);
    });
    ctx.letterSpacing = '0px';
  }

  let ty = CARD_PAD + BRAND_H + block.height + (block.height ? 40 : 0);
  ctx.textAlign = 'center';
  const mid = CARD_W / 2;

  if (spec.elapsed) {
    ctx.fillStyle = BRONZE;
    ctx.font = `700 30px ${SANS}`;
    ctx.letterSpacing = '3px';
    ctx.fillText(spec.elapsed.toUpperCase(), mid, ty);
    ctx.letterSpacing = '0px';
    ty += 56;
  }
  if (spec.eyebrow) {
    ctx.fillStyle = BRONZE_D;
    ctx.font = `700 20px ${SANS}`;
    ctx.letterSpacing = '3px';
    ctx.fillText(spec.eyebrow.toUpperCase(), mid, ty);
    ctx.letterSpacing = '0px';
    ty += 34;
  }
  if (spec.title) {
    ctx.fillStyle = INK;
    ctx.font = `700 62px ${SERIF}`;
    ctx.fillText(spec.title, mid, ty + 24);
    ty += 74;
  }
  for (const m of lineMetrics) {
    ctx.fillStyle = m.emph === 'bronze' ? BRONZE_D : m.emph === 'body' ? MUTED : FAINT;
    ctx.font = m.emph === 'body' ? `italic 28px ${SERIF}` : `600 26px ${SANS}`;
    ty += 18;
    for (const row of m.rows) {
      ctx.fillText(row, mid, ty);
      ty += m.lh;
    }
  }
  if (spec.athlete) {
    ty += 30;
    ctx.strokeStyle = '#1A1A1E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CARD_PAD, ty);
    ctx.lineTo(CARD_W - CARD_PAD, ty);
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.font = `600 26px ${SANS}`;
    ctx.fillText(spec.athlete, mid, ty + 40);
  }

  // ── hand it over ──
  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob(resolve, 'image/png');
    } catch {
      resolve(null); // tainted canvas — a photo loaded without CORS headers
    }
  });
  if (!blob) {
    return { ok: false, reason: 'Couldn’t build the image from those photos. Try again in a moment.' };
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${spec.fileName}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked on the next tick: revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return { ok: true };
}
