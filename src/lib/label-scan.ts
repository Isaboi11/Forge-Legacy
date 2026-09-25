import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

import { readLabel, type LabelLine, type LabelRead } from '@/domain/nutrition/label-read';

/**
 * Scan label's two native halves, and the hand-off from the camera back to Create Food.
 *
 * ⚠ **BOTH MODULES ARE OPTIONAL, AND THAT IS WHAT KEEPS BUILD 8 ALIVE.** `ForgeLabelReader`
 * (`modules/label-reader`) and `ExpoCamera` exist only in build 9 and later. `requireOptionalNativeModule`
 * returns `null` on an older binary, so `labelScanAvailable()` is false there and the Scan label card
 * simply does not render — the same shape as `useDictation`, `form-check-live` and Log Food's barcode
 * camera. iOS only: the reader is Vision, and the web has neither half.
 */

interface NativeLabelReader {
  read(uri: string): Promise<LabelLine[]>;
}

const reader = Platform.OS === 'ios' ? requireOptionalNativeModule<NativeLabelReader>('ForgeLabelReader') : null;
const camera = Platform.OS === 'ios' ? requireOptionalNativeModule('ExpoCamera') : null;

/** Whether this build can scan a label at all. Decides whether the card renders. */
export function labelScanAvailable(): boolean {
  return reader != null && camera != null;
}

/** Read a photo. Throws only when the photo itself cannot be opened; an empty label is `unreadable`. */
export async function readLabelPhoto(uri: string): Promise<LabelRead> {
  if (!reader) throw new Error('Label reading is not in this build');
  return readLabel(await reader.read(uri));
}

/* ── the hand-off ─────────────────────────────────────────────────────────── */

export interface LabelScan {
  read: LabelRead;
  /** The photo it came from — A5's "Original label" sheet. */
  photoUri: string;
}

/**
 * The camera is its own route, so its result crosses a `router.back()`. Params cannot carry it (fifteen
 * fields and a file path), so the scanner leaves it here and Create Food takes it on focus. Taken, not
 * read: a second focus must not re-apply an old scan over the athlete's edits.
 */
let pending: LabelScan | null = null;

export function leaveLabelScan(scan: LabelScan): void {
  pending = scan;
}

export function takeLabelScan(): LabelScan | null {
  const scan = pending;
  pending = null;
  return scan;
}
