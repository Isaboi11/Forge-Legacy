import type { ProgressCardPhoto, ProgressPostCard } from '@/data/squad-feed-live';
import { EXPORT_SCALE, formatSpec, gridGeometry, heroGeometry, type Rect } from '@/domain/share/progress-card';
import type { ProgressExportResult, ProgressExportSpec } from './progress-image';

export type { ProgressExportResult, ProgressExportSpec } from './progress-image';

/**
 * Compose the Progress Photo Post card at 1080px and hand it to the browser as a download.
 *
 * ══ COMPOSED, NOT SCREENSHOTTED ══
 *
 * The obvious implementation captures the preview view; it is also the worse one, for the reasons
 * `share-image.web.ts` sets out — a capture exports whatever the device happened to render, at whatever
 * density, with any UI that strayed into frame. Drawing deliberately from `domain/share/progress-card.ts`
 * gives an exact 1080×1080 or 1080×1350 with no new dependency, and the geometry it draws from is the
 * same module the tests check.
 *
 * ══ A CAROUSEL IS N FILES, NOT ONE ══
 *
 * Hero exports one image per slide, in slide order. A six-slide carousel flattened into a single strip
 * would be a different post from the one the athlete composed, and Instagram has no way to un-flatten it.
 *
 * ══ THE DOTS ARE NOT EXPORTED ══
 *
 * They indicate where you are in a carousel that only exists inside Forge. Instagram draws its own, and
 * an image saved alone has no carousel to be third-of. Everything else on a slide — mark, wordmark, pose
 * chip, counter, date block — IS exported, because the design's rule is that a single slide saved on its
 * own still has to read as a complete Forge card.
 *
 * ══ A PHOTO THAT WILL NOT DRAW IS A FAILURE ══
 *
 * Canvas refuses to export once a cross-origin image is drawn without CORS headers. Supabase storage
 * sends them, so `crossOrigin` normally succeeds; when it does not, this returns a reason rather than
 * quietly skipping the photo. A progress card with the progress missing is not a lesser version of the
 * thing — it is a different and dishonest one.
 */

const INK = '#F0EDE8';
const MUTED = '#9E9890';
const FAINT = '#666060';
const BRONZE = '#C99767';
const BRONZE_D = '#BA8654';
const CARD_BG = '#0A0A0B';
const RECESS = '#09090B';
const CHARCOAL_700 = '#1A1A1E';

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
/** Playfair is loaded by expo-font; fall back to a serif rather than silently rendering the sans. */
const SERIF = '"PlayfairDisplay_600SemiBold", "Iowan Old Style", Palatino, Georgia, serif';

/** The anvil, in the same 24×24 viewBox the app's mark uses. */
const ANVIL = 'M10.9 3.2H13.1V15H10.9ZM7.6 7.1L9.6 5.8V15H7.6ZM16.4 7.1L14.4 5.8V15H16.4ZM6.8 15.4H17.2V16.2H6.8ZM5.6 16.6H18.4V17.4H5.6ZM4.4 17.8H19.6V18.6H4.4Z';

export const canExportProgressCard = true;

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
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** `object-fit: cover`, centred — the crop the preview showed. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, f: Rect) {
  const scale = Math.max(f.w / img.naturalWidth, f.h / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, f.x + (f.w - w) / 2, f.y + (f.h - h) / 2, w, h);
}

function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function setShadow(ctx: CanvasRenderingContext2D, blur: number, dy: number, color = 'rgba(0,0,0,0.7)') {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = dy;
}

/** The bronze-tiled anvil mark. */
function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.fillStyle = BRONZE_D;
  roundRect(ctx, x, y, size, size, size * 0.235);
  ctx.fill();
  const glyph = size * 0.62;
  ctx.translate(x + (size - glyph) / 2, y + (size - glyph) / 2);
  ctx.scale(glyph / 24, glyph / 24);
  ctx.fillStyle = '#1A1206';
  ctx.fill(new Path2D(ANVIL));
  ctx.restore();
}

/** A pill with uppercase text in it. Returns its width so a caller can right-align a row of them. */
function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, s: number, opts: { bg: string; ink: string; font: string; border?: string }): number {
  ctx.font = opts.font;
  const padX = 6 * s;
  const w = ctx.measureText(text).width + padX * 2;
  const h = 13 * s;
  ctx.fillStyle = opts.bg;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (opts.border) {
    ctx.strokeStyle = opts.border;
    ctx.lineWidth = Math.max(1, s * 0.4);
    ctx.stroke();
  }
  ctx.fillStyle = opts.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + h / 2);
  return w;
}

function pillWidth(ctx: CanvasRenderingContext2D, text: string, s: number, font: string): number {
  ctx.font = font;
  return ctx.measureText(text).width + 12 * s;
}

// ── Grid ──────────────────────────────────────────────────────────────────────

function drawGrid(ctx: CanvasRenderingContext2D, card: ProgressPostCard, images: (HTMLImageElement | null)[], s: number) {
  const g = gridGeometry(card.format, card.photos.length, card.incl, s);
  drawCardShell(ctx, g.w, g.h, s);

  // header
  const markSize = 17 * s;
  drawMark(ctx, g.pad, g.pad, markSize);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = MUTED;
  ctx.font = `700 ${8.5 * s}px ${SANS}`;
  ctx.letterSpacing = `${2.2 * s}px`;
  ctx.fillText('FORGE LEGACY', g.pad + markSize + 7 * s, g.pad + markSize / 2);
  if (card.incl.date) {
    ctx.fillStyle = BRONZE;
    ctx.font = `700 ${9 * s}px ${SANS}`;
    ctx.letterSpacing = `${0.9 * s}px`;
    ctx.textAlign = 'right';
    ctx.fillText(card.date.toUpperCase(), g.w - g.pad, g.pad + markSize / 2);
  }
  ctx.letterSpacing = '0px';

  // tiles
  g.tiles.forEach((t, i) => {
    ctx.save();
    roundRect(ctx, t.x, t.y, t.w, t.h, g.tileRadius);
    ctx.clip();
    ctx.fillStyle = RECESS;
    ctx.fillRect(t.x, t.y, t.w, t.h);
    const img = images[i];
    if (img) drawCover(ctx, img, t);
    ctx.restore();
    ctx.strokeStyle = CHARCOAL_700;
    ctx.lineWidth = Math.max(1, s * 0.3);
    roundRect(ctx, t.x, t.y, t.w, t.h, g.tileRadius);
    ctx.stroke();

    const short = card.photos[i]?.short;
    if (card.incl.pose && short) {
      pill(ctx, short.toUpperCase(), t.x + 6 * s, t.y + t.h - 5 * s - 13 * s, s, {
        bg: 'rgba(6,6,7,0.72)',
        ink: MUTED,
        font: `700 ${7.5 * s}px ${SANS}`,
      });
    }
  });

  // footer
  if (g.footer) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let y = g.footer.y;
    if (card.incl.name) {
      ctx.fillStyle = INK;
      ctx.font = `700 ${14 * s}px ${SERIF}`;
      ctx.fillText(card.athlete, g.pad, y);
      y += 19 * s + 3 * s;
    }
    if (card.incl.meta && card.meta) {
      ctx.fillStyle = FAINT;
      ctx.font = `400 ${9.5 * s}px ${SANS}`;
      ctx.fillText(card.meta, g.pad, y);
    }
    if (card.incl.chapter && card.chapter) {
      ctx.fillStyle = BRONZE_D;
      ctx.font = `700 ${8.5 * s}px ${SANS}`;
      ctx.letterSpacing = `${1.2 * s}px`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(card.chapter.toUpperCase(), g.w - g.pad, g.footer.y + g.footer.h);
      ctx.letterSpacing = '0px';
    }
  }
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function drawHeroSlide(ctx: CanvasRenderingContext2D, card: ProgressPostCard, photo: ProgressCardPhoto, img: HTMLImageElement | null, counter: string | null, s: number) {
  const g = heroGeometry(card.format, s);

  ctx.fillStyle = RECESS;
  ctx.fillRect(0, 0, g.w, g.h);
  if (img) {
    ctx.save();
    roundRect(ctx, 0, 0, g.w, g.h, 0);
    ctx.clip();
    drawCover(ctx, img, g.photo);
    ctx.restore();
  }

  const scrim = ctx.createLinearGradient(0, 0, 0, g.h);
  scrim.addColorStop(0, 'rgba(6,6,7,0.62)');
  scrim.addColorStop(0.3, 'rgba(6,6,7,0)');
  scrim.addColorStop(0.52, 'rgba(6,6,7,0.18)');
  scrim.addColorStop(1, 'rgba(6,6,7,0.9)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, g.w, g.h);

  // top chrome
  drawMark(ctx, g.top.x, g.top.y, g.markSize);
  setShadow(ctx, 4 * s, 1 * s, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = 'rgba(240,238,234,0.82)';
  ctx.font = `700 ${8.5 * s}px ${SANS}`;
  ctx.letterSpacing = `${2.2 * s}px`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('FORGE LEGACY', g.top.x + g.markSize + 7 * s, g.top.y + g.markSize / 2);
  ctx.letterSpacing = '0px';
  clearShadow(ctx);

  // Laid out right to left so the counter always sits on the edge and the pose chip stacks inside it.
  let right = g.top.x + g.top.w;
  const chipY = g.top.y + (g.markSize - 13 * s) / 2;
  if (counter) {
    const font = `600 ${8 * s}px ${SANS}`;
    const w = pillWidth(ctx, counter, s, font);
    pill(ctx, counter, right - w, chipY, s, { bg: 'rgba(6,6,7,0.62)', ink: 'rgba(240,238,234,0.92)', font });
    right -= w + 7 * s;
  }
  if (card.incl.pose && photo.short) {
    const text = photo.short.toUpperCase();
    const font = `700 ${7.5 * s}px ${SANS}`;
    const w = pillWidth(ctx, text, s, font);
    pill(ctx, text, right - w, chipY, s, { bg: 'rgba(6,6,7,0.6)', ink: 'rgba(240,238,234,0.9)', font, border: 'rgba(255,255,255,0.14)' });
  }

  // bottom block — measured upward from the baseline so the date always lands in the same place
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  let y = g.h - g.bottom.offset;

  const nameOn = card.incl.name;
  const chapterOn = card.incl.chapter && !!card.chapter;
  if (nameOn || chapterOn) {
    setShadow(ctx, 6 * s, 1 * s);
    let x = g.bottom.x;
    if (nameOn) {
      ctx.fillStyle = '#F0EEEA';
      ctx.font = `600 ${11 * s}px ${SANS}`;
      ctx.fillText(card.athlete, x, y);
      x += ctx.measureText(card.athlete).width + 7 * s;
    }
    if (chapterOn) {
      if (nameOn) {
        clearShadow(ctx);
        ctx.fillStyle = 'rgba(240,238,234,0.45)';
        ctx.beginPath();
        ctx.arc(x + 1.5 * s, y - 4 * s, 1.5 * s, 0, Math.PI * 2);
        ctx.fill();
        x += 3 * s + 7 * s;
        setShadow(ctx, 6 * s, 1 * s);
      }
      ctx.fillStyle = BRONZE;
      ctx.font = `700 ${8.5 * s}px ${SANS}`;
      ctx.letterSpacing = `${1.2 * s}px`;
      ctx.fillText(card.chapter!.toUpperCase(), x, y);
      ctx.letterSpacing = '0px';
    }
    clearShadow(ctx);
    y -= 15 * s + 4 * s;
  }

  if (card.incl.meta && card.meta) {
    setShadow(ctx, 6 * s, 1 * s);
    ctx.fillStyle = 'rgba(240,238,234,0.72)';
    ctx.font = `400 ${10 * s}px ${SANS}`;
    ctx.fillText(card.meta, g.bottom.x, y);
    clearShadow(ctx);
    y -= 14 * s + 4 * s;
  }

  if (card.incl.date) {
    setShadow(ctx, 14 * s, 2 * s);
    ctx.fillStyle = '#F7F5F1';
    ctx.font = `700 ${27 * s}px ${SERIF}`;
    ctx.letterSpacing = `${-0.6 * s}px`;
    ctx.fillText(card.date, g.bottom.x, y);
    ctx.letterSpacing = '0px';
    clearShadow(ctx);
  }
}

/** Card shell shared by every grid render: bronze rim, near-black ground, top-left sheen. */
function drawCardShell(ctx: CanvasRenderingContext2D, w: number, h: number, s: number) {
  const radius = 12 * s;
  ctx.fillStyle = CARD_BG;
  roundRect(ctx, 0, 0, w, h, radius);
  ctx.fill();
  const sheen = ctx.createLinearGradient(0, 0, w * 0.35, h);
  sheen.addColorStop(0, 'rgba(181,138,97,0.09)');
  sheen.addColorStop(0.46, 'rgba(181,138,97,0)');
  ctx.fillStyle = sheen;
  ctx.fill();
  ctx.strokeStyle = 'rgba(181,138,97,0.40)';
  ctx.lineWidth = Math.max(1, s);
  roundRect(ctx, s / 2, s / 2, w - s, h - s, radius);
  ctx.stroke();
}

// ── Entry point ───────────────────────────────────────────────────────────────

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked on a later tick: revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const toBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
  new Promise((resolve) => {
    try {
      canvas.toBlob(resolve, 'image/png');
    } catch {
      resolve(null); // tainted canvas — a photo loaded without CORS headers
    }
  });

export async function saveProgressCard(spec: ProgressExportSpec): Promise<ProgressExportResult> {
  if (typeof document === 'undefined') return { ok: false, reason: 'Saving isn’t available here.' };
  const { card } = spec;
  if (!card.photos.length) return { ok: false, reason: 'There are no photos on this card yet.' };

  // Load every photo FIRST. Half a card is not worth producing.
  let images: (HTMLImageElement | null)[];
  try {
    images = await Promise.all(card.photos.map((p) => (p.url ? loadImage(p.url) : Promise.resolve(null))));
  } catch {
    return { ok: false, reason: 'Couldn’t read the photos to build the image. Try again in a moment.' };
  }

  // Fonts must be ready or the first draw silently uses a fallback and every measurement is wrong.
  try {
    await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
  } catch {
    /* a browser without the Font Loading API still draws, just with fallbacks */
  }

  const f = formatSpec(card.format);
  const s = EXPORT_SCALE;
  // One image for a grid; one per slide, in order, for a carousel.
  const frames = card.style === 'hero' ? card.photos.map((_, i) => i) : [0];

  const blobs: Blob[] = [];
  for (const i of frames) {
    const canvas = document.createElement('canvas');
    canvas.width = f.exportW;
    canvas.height = f.exportH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { ok: false, reason: 'Saving isn’t available here.' };

    if (card.style === 'hero') drawHeroSlide(ctx, card, card.photos[i], images[i], card.photos.length > 1 ? `${i + 1}/${card.photos.length}` : null, s);
    else drawGrid(ctx, card, images, s);

    const blob = await toBlob(canvas);
    if (!blob) return { ok: false, reason: 'Couldn’t build the image from those photos. Try again in a moment.' };
    blobs.push(blob);
  }

  blobs.forEach((b, i) => {
    const name = blobs.length > 1 ? `${spec.fileName}-${i + 1}.png` : `${spec.fileName}.png`;
    // Staggered: browsers throttle or block a burst of same-tick downloads.
    setTimeout(() => download(b, name), i * 350);
  });

  // `via: 'download'` is what lets the caller say "Saved" here and "Copied" on native without either
  // path guessing which platform it is on. `slides` is the carousel's real length; the web genuinely
  // delivers all of them, so it equals `count`.
  return { ok: true, count: blobs.length, via: 'download', slides: card.style === 'hero' ? card.photos.length : 1 };
}
