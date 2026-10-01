import { ANVIL_PATH, ON_BRONZE, STORY_BRONZE, type StoryDrawing, type StoryOp } from '@/domain/share/story-card';
import type { StoryExportResult, StoryExportSpec } from './story-image';

export type { StoryExportResult, StoryExportSpec } from './story-image';

/**
 * Export the share picture — the browser path. Paints the SAME draw list the phone snapshots
 * (`domain/share/story-card`) onto a 1080×1920 canvas and downloads it.
 *
 * Composed, not screenshotted, for the reasons `share-image.web.ts` gives: a capture exports whatever the
 * device happened to render at whatever density. Painting the list gives the exact story size.
 *
 * A photo that will not draw is a failure, not a skip: canvas refuses to export once an image without CORS
 * headers is drawn, and a photo picture without the photo is a different, dishonest picture.
 */

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const SERIF = '"PlayfairDisplay_600SemiBold", "Iowan Old Style", Palatino, Georgia, serif';

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Data and blob urls are same-origin already; only a remote photo needs CORS.
    if (/^https?:/i.test(url)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image'));
    img.src = url;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

const rgba = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string };

function paint(ctx: Ctx, op: StoryOp, img: HTMLImageElement | null) {
  switch (op.kind) {
    case 'rect': {
      roundRect(ctx, op.x, op.y, op.w, op.h, op.radius ?? 0);
      if (op.fill) {
        ctx.globalAlpha = op.fillOpacity ?? 1;
        ctx.fillStyle = op.fill;
        ctx.fill();
      }
      if (op.stroke && op.strokeWidth) {
        ctx.globalAlpha = op.strokeOpacity ?? 1;
        ctx.strokeStyle = op.stroke;
        ctx.lineWidth = op.strokeWidth;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return;
    }
    case 'vgrad': {
      const g = ctx.createLinearGradient(0, op.y, 0, op.y + op.h);
      for (const s of op.stops) g.addColorStop(s.at, rgba(s.color, s.opacity));
      ctx.fillStyle = g;
      ctx.fillRect(op.x, op.y, op.w, op.h);
      return;
    }
    case 'photo': {
      if (!img) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(op.frame.x, op.frame.y, op.frame.w, op.frame.h);
      ctx.clip();
      ctx.globalAlpha = op.opacity;
      ctx.drawImage(img, op.image.x, op.image.y, op.image.w, op.image.h);
      ctx.restore();
      return;
    }
    case 'path': {
      const p = new Path2D(op.d);
      if (op.fill) {
        ctx.fillStyle = op.fill;
        ctx.fill(p);
      }
      if (op.stroke && op.strokeWidth) {
        ctx.globalAlpha = op.strokeOpacity ?? 1;
        ctx.strokeStyle = op.stroke;
        ctx.lineWidth = op.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke(p);
        ctx.globalAlpha = 1;
      }
      return;
    }
    case 'circle': {
      ctx.beginPath();
      ctx.arc(op.cx, op.cy, op.r, 0, Math.PI * 2);
      ctx.fillStyle = op.fill;
      ctx.fill();
      if (op.stroke && op.strokeWidth) {
        ctx.strokeStyle = op.stroke;
        ctx.lineWidth = op.strokeWidth;
        ctx.stroke();
      }
      return;
    }
    case 'mark': {
      ctx.save();
      ctx.fillStyle = STORY_BRONZE;
      roundRect(ctx, op.x, op.y, op.size, op.size, op.size * 0.235);
      ctx.fill();
      const glyph = op.size * 0.62;
      ctx.translate(op.x + (op.size - glyph) / 2, op.y + (op.size - glyph) / 2);
      ctx.scale(glyph / 24, glyph / 24);
      ctx.fillStyle = ON_BRONZE;
      ctx.fill(new Path2D(ANVIL_PATH));
      ctx.restore();
      return;
    }
    case 'text': {
      const font = (r: (typeof op.runs)[number]) => `${r.italic ? 'italic ' : ''}${r.weight} ${r.size}px ${r.face === 'serif' ? SERIF : SANS}`;
      const widths = op.runs.map((r) => {
        ctx.font = font(r);
        ctx.letterSpacing = `${r.letterSpacing ?? 0}px`;
        return ctx.measureText(r.text).width;
      });
      const total = widths.reduce((a, b) => a + b, 0);
      let x = op.anchor === 'start' ? op.x : op.anchor === 'middle' ? op.x - total / 2 : op.x - total;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      op.runs.forEach((r, i) => {
        ctx.font = font(r);
        ctx.letterSpacing = `${r.letterSpacing ?? 0}px`;
        ctx.globalAlpha = r.opacity ?? 1;
        ctx.fillStyle = r.fill;
        ctx.fillText(r.text, x, op.y);
        x += widths[i];
      });
      ctx.globalAlpha = 1;
      ctx.letterSpacing = '0px';
      return;
    }
  }
}

/** Paint a drawing onto a fresh canvas. Exported for the screen's tests and nothing else. */
export function paintStory(drawing: StoryDrawing, img: HTMLImageElement | null): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = drawing.width;
  canvas.height = drawing.height;
  const ctx = canvas.getContext('2d') as Ctx | null;
  if (!ctx) return null;
  for (const op of drawing.ops) paint(ctx, op, img);
  return canvas;
}

export async function exportStory(spec: StoryExportSpec): Promise<StoryExportResult> {
  if (typeof document === 'undefined') return { ok: false, reason: 'Saving isn’t available here.' };
  if (spec.drawing.needsPhoto) return { ok: false, reason: 'Add a photo first — this style is built on one.' };

  const usesPhoto = spec.drawing.ops.some((o) => o.kind === 'photo');
  let img: HTMLImageElement | null = null;
  if (usesPhoto && spec.photoUri) {
    try {
      img = await loadImage(spec.photoUri);
    } catch {
      return { ok: false, reason: 'Couldn’t read your photo to build the picture. Try picking it again.' };
    }
  }

  // Fonts first, or the first draw silently uses a fallback face.
  try {
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown>; load: (f: string) => Promise<unknown> } }).fonts;
    await fonts?.load(`600 100px ${SERIF}`);
    await fonts?.ready;
  } catch {
    /* no Font Loading API — still draws, with fallbacks */
  }

  const canvas = paintStory(spec.drawing, img);
  if (!canvas) return { ok: false, reason: 'Saving isn’t available here.' };
  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob(resolve, 'image/png');
    } catch {
      resolve(null); // tainted by a photo served without CORS headers
    }
  });
  if (!blob) return { ok: false, reason: 'Couldn’t build the picture from that photo. Try picking it again.' };

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${spec.fileName}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return { ok: true, via: 'download' };
}
