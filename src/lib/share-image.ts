import { Image } from 'react-native';
import { handOffImage } from './save-image-file';
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
 *
 * ⚠ **HANDING THE RESULT OVER NEEDED NO NEW MODULE EITHER, AND THIS FILE CLAIMED FOR WEEKS THAT IT DID.**
 * The card went to the clipboard because a share sheet was believed to cost `expo-sharing` +
 * `expo-file-system` and therefore a new build. `expo-file-system` was already in the binary (it ships
 * with `expo`), and React Native's own `Share` opens the iOS sheet on a `file://` url. The athlete taps
 * **Save Image** and it lands in Photos. See `save-image-file.ts` — it holds that reasoning and the
 * clipboard fallback, and both exporters go through it.
 *
 * The verb still is not this file's to choose: nothing here knows which button the athlete pressed in the
 * sheet, so `via` reports how the image LEFT and the caller phrases from that. A button that says it saved
 * when it copied is the failure this whole path exists to avoid.
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
  /** Filename stem — the name the PNG carries into the share sheet, and into a browser download. */
  fileName: string;
}

/** ⚠ The caller MUST phrase its toast from `via`. `sheet` has no outcome to report; the sheet is the receipt. */
export type SaveResult = { ok: true; via: 'sheet' | 'clipboard' | 'download' } | { ok: false; reason: string };

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

  const via = await handOffImage(base64, spec.fileName);
  if (!via) {
    return { ok: false, reason: 'Couldn’t hand over the image. Try again in a moment.' };
  }
  return { ok: true, via };
}
