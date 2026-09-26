import type { VideoFrame } from './video-frames';

/**
 * VIDEO FRAMES — the browser's half (see `video-frames.ts` for the device's).
 *
 * ⚠ THIS IS WHAT MAKES FORM CHECK WORK ON THE WEB PREVIEW, WHICH IS WHERE THE PO TESTS
 * (`feedback_deploy_before_they_test`). Neither Expo video package has a browser implementation of frame
 * extraction, so the first version told every web athlete "this one is on your phone". A browser can do
 * it natively: load the clip in a `<video>`, seek, draw the frame to a `<canvas>`, read it back as JPEG.
 *
 * One `<video>` per call, released afterwards. The picker hands back a `blob:` URL for a local file, which
 * is same-origin, so the canvas is never tainted and `toDataURL` works.
 */

export function videoFramesAvailable(): boolean {
  return typeof document !== 'undefined';
}

const SEEK_TIMEOUT_MS = 8000;

function once(el: HTMLVideoElement, event: string): Promise<boolean> {
  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      el.removeEventListener(event, onOk);
      el.removeEventListener('error', onErr);
      clearTimeout(timer);
      resolve(ok);
    };
    const onOk = () => done(true);
    const onErr = () => done(false);
    const timer = setTimeout(() => done(false), SEEK_TIMEOUT_MS);
    el.addEventListener(event, onOk);
    el.addEventListener('error', onErr);
  });
}

async function openVideo(uri: string): Promise<HTMLVideoElement | null> {
  if (typeof document === 'undefined' || !uri) return null;
  const el = document.createElement('video');
  el.muted = true;
  el.playsInline = true;
  el.preload = 'auto';
  el.crossOrigin = 'anonymous';
  el.src = uri;
  const ok = await once(el, 'loadeddata');
  return ok ? el : null;
}

function release(el: HTMLVideoElement): void {
  el.removeAttribute('src');
  el.load();
}

export async function probeDurationMs(uri: string): Promise<number | null> {
  const el = await openVideo(uri);
  if (!el) return null;
  const d = Number.isFinite(el.duration) && el.duration > 0 ? Math.round(el.duration * 1000) : null;
  release(el);
  return d;
}

export async function grabFrame(
  uri: string,
  timeMs: number,
  maxEdge: number,
  compress: number,
  withBase64: boolean,
): Promise<VideoFrame | null> {
  const el = await openVideo(uri);
  if (!el) return null;
  try {
    const dur = Number.isFinite(el.duration) ? el.duration : 0;
    const t = Math.max(0, Math.min(timeMs / 1000, dur > 0.05 ? dur - 0.05 : 0));
    if (Math.abs(el.currentTime - t) > 0.001) {
      el.currentTime = t;
      if (!(await once(el, 'seeked'))) return null;
    }
    const w0 = el.videoWidth;
    const h0 = el.videoHeight;
    if (!w0 || !h0) return null;
    const scale = Math.min(1, maxEdge / Math.max(w0, h0));
    const width = Math.round(w0 * scale);
    const height = Math.round(h0 * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(el, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', compress);
    const comma = dataUrl.indexOf(',');
    if (comma < 0) return null;
    return { base64: withBase64 ? dataUrl.slice(comma + 1) : null, uri: dataUrl, width, height };
  } catch {
    return null;
  } finally {
    release(el);
  }
}
