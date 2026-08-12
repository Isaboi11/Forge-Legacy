import * as Clipboard from 'expo-clipboard';
import { Image } from 'react-native';
import { rasterizeCard, setCardPhotos } from './share-card-host';

/**
 * Save the share card as an image — the native path.
 *
 * ══ WHAT CHANGED, AND WHAT STILL CANNOT ══
 *
 * This was a stub. Its reason — "writing to the camera roll needs `expo-media-library`… and this project
 * has no way to produce or verify an iOS build" — stopped being true once builds started shipping, but the
 * conclusion was only half right. Composing the card on device needs no new native module: the layout is
 * shared, `card-draw` resolves every number, and `react-native-svg` (already installed) rasterises it.
 * WRITING the result to the camera roll still does need one, and adding it changes the native fingerprint,
 * which costs a new build and blocks OTA delivery of everything else waiting behind it.
 *
 * So the card goes to the CLIPBOARD, via `expo-clipboard` — also already installed. The athlete pastes it
 * into Instagram, Messages, anywhere. It is a worse verb than "Saved" and it is a real one; a button that
 * says it saved and did not would be worse than either. When a native build is next cut for other reasons,
 * `expo-media-library` turns this into a true save and nothing above this line changes.
 *
 * ══ THE PHOTOS ARE FETCHED FIRST, AND ALL OF THEM ══
 *
 * Same rule the web path states: a transformation card with the transformation missing is not a lesser
 * version of the thing, it is a different and dishonest one. Every photo is pulled to a data URI and
 * measured before anything is drawn, so the rasteriser never races a network load.
 */

export interface ShareCardLine {
  text: string;
  emph: 'bronze' | 'body' | 'muted';
}

export interface ShareCardSpec {
  /** Every photo — flattened [then, now, then, now, …] for a comparison, one per pose for a capture. */
  photoUrls: string[];
  /** Per-photo pan/zoom, index-aligned with `photoUrls`. */
  transforms?: ({ tx: number; ty: number; scale: number } | undefined)[];
  /** The comparison template. Null when this card is a single capture (see `entryTemplate`) or has no photos. */
  template: import('@/domain/share/card-layout').ShareTemplate | null;
  /** How a single capture's poses are laid out. Ignored when `pairCount` > 0. */
  entryTemplate?: import('@/domain/share/card-layout').EntryTemplate;
  pairCount: number;
  /** Pose names — one per pair on a comparison grid, one per photo on a capture. */
  poseLabels?: string[];
  thenLabel?: string;
  nowLabel?: string;
  elapsed?: string;
  eyebrow?: string;
  title?: string;
  lines: ShareCardLine[];
  athlete?: string;
  /** Filename stem. Unused on native — the clipboard has no filename — kept so both paths share a spec. */
  fileName: string;
}

export type SaveResult = { ok: true; via: 'clipboard' | 'download' } | { ok: false; reason: string };

export const canSaveImage = true;

/** Pull a remote image into a data URI so nothing is still loading when the snapshot fires. */
async function toDataUri(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`photo ${res.status}`);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

/** Natural pixel size, which `drawRect` needs to honour the athlete's framing. */
function measure(uri: string): Promise<{ w: number; h: number } | undefined> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (w, h) => resolve({ w, h }),
      // A photo that will not measure still draws — cover-fit from a wrong size is worse than a recess,
      // so `card-draw` renders the frame empty rather than guessing.
      () => resolve(undefined),
    );
  });
}

export async function saveShareCard(spec: ShareCardSpec): Promise<SaveResult> {
  let uris: string[];
  try {
    uris = await Promise.all(spec.photoUrls.map(toDataUri));
  } catch {
    return { ok: false, reason: 'Couldn’t read the photos to build the image. Try again in a moment.' };
  }

  const natural = await Promise.all(uris.map(measure));

  setCardPhotos(uris);
  const base64 = await rasterizeCard(spec, natural);
  if (!base64) {
    return { ok: false, reason: 'Couldn’t build the image just now. Try again in a moment.' };
  }

  // `toDataURL` returns bare base64; `setImageAsync` wants the same. A data-uri prefix here is silently
  // accepted on one platform and rejected on the other, so it is stripped either way.
  const payload = base64.replace(/^data:image\/\w+;base64,/, '');
  try {
    await Clipboard.setImageAsync(payload);
  } catch {
    return { ok: false, reason: 'Couldn’t copy the card. Try again in a moment.' };
  }
  return { ok: true, via: 'clipboard' };
}
