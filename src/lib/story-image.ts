import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';

import type { StoryDrawing } from '@/domain/share/story-card';
import { reportError } from './diagnostics';
import { handOffImage } from './save-image-file';
import { rasterizeStory, storyHostReady } from './story-card-host';

/**
 * Export the share picture — the phone path. The browser has its own (`story-image.web.ts`).
 *
 * Composed with react-native-svg and handed over through `handOffImage`, exactly as the transformation
 * card is: no new native module, so it ships over the air. The photo is read into a data URI FIRST, so
 * nothing is still loading when the snapshot fires — a picture exported with the athlete's photo missing
 * would go out looking finished, which is the one failure this path must never have.
 */

export interface StoryExportSpec {
  drawing: StoryDrawing;
  /** Any uri the picker or the feed gave us — file://, content://, https:// or data:. */
  photoUri: string | null;
  fileName: string;
  /** `clipboard` for the sticker, which the athlete pastes into their own Instagram story. */
  prefer?: 'sheet' | 'clipboard';
  /** The sentence and link that ride beside the image into Messages and the like. */
  message?: string;
}

export type StoryExportResult = { ok: true; via: 'sheet' | 'clipboard' | 'download' } | { ok: false; reason: string };

/** A finished picture as data, for a caller that uploads it rather than handing it to the share sheet. */
export interface RenderedStory {
  base64: string;
  mime: 'image/png' | 'image/jpeg';
}

async function toDataUri(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  if (/^(file|content|ph|assets-library):/i.test(uri)) {
    const b64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
    const mime = /\.png(\?|$)/i.test(uri) ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${b64}`;
  }
  const res = await fetch(uri);
  if (!res.ok) throw new Error(`photo ${res.status}`);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

/**
 * The picture as image data — the feed post's overlay (PO 2026-10-02). Same path as `exportStory` up to the
 * snapshot, then returned instead of handed off. Null whenever it could not be built WITH its photo: a
 * caller must never post a photo picture that went out without the photo.
 */
export async function renderStoryImage(drawing: StoryDrawing, photoUri: string | null): Promise<RenderedStory | null> {
  /* ⚠ EVERY NULL SAYS WHY (PO 11-08). The post falls back to the photo with its strip either way, but a
     silent null made "never chose it" and "it broke on the phone" look the same, and the picture had never
     been seen working on a device. `reportError` de-duplicates per fingerprint. */
  const fail = (why: string, e?: unknown): null => {
    reportError(e ?? new Error(`Post picture not built: ${why}`), { screen: 'post.picture' });
    return null;
  };
  if (drawing.needsPhoto) return fail('the drawing needs a photo');
  if (!storyHostReady()) return fail('no StoryCardHost mounted');
  let photo: string | null = null;
  if (drawing.ops.some((o) => o.kind === 'photo')) {
    if (!photoUri) return fail('no photo uri');
    try {
      photo = await toDataUri(photoUri);
    } catch (e) {
      return fail('photo unreadable', e);
    }
  }
  const base64 = await rasterizeStory(drawing, photo);
  return base64 ? { base64, mime: 'image/png' } : fail('snapshot empty or timed out');
}

export async function exportStory(spec: StoryExportSpec): Promise<StoryExportResult> {
  if (spec.drawing.needsPhoto) return { ok: false, reason: 'Add a photo first — this style is built on one.' };
  if (!storyHostReady()) return { ok: false, reason: 'Couldn’t build the picture just now. Try again in a moment.' };

  const usesPhoto = spec.drawing.ops.some((o) => o.kind === 'photo');
  let photo: string | null = null;
  if (usesPhoto && spec.photoUri) {
    try {
      photo = await toDataUri(spec.photoUri);
    } catch {
      return { ok: false, reason: 'Couldn’t read your photo to build the picture. Try again, or pick it again.' };
    }
  }

  const base64 = await rasterizeStory(spec.drawing, photo);
  if (!base64) return { ok: false, reason: 'Couldn’t build the picture just now. Try again in a moment.' };

  const via = await handOffImage(base64, spec.fileName, spec.prefer, spec.message);
  if (!via) return { ok: false, reason: 'Couldn’t hand over the picture. Try again in a moment.' };
  return { ok: true, via };
}
