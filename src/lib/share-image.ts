import type { EntryTemplate, ShareTemplate } from '@/domain/share/card-layout';

/**
 * Save the share card as an image.
 *
 * ══ THIS IS THE NATIVE STUB ══
 *
 * The web build resolves `share-image.web.ts` instead. Writing a file to the camera roll needs
 * `expo-media-library` and a permission prompt, both of which require a native build — and this project
 * has no way to produce or verify an iOS one. Shipping an untested native write that silently does
 * nothing would be worse than saying so.
 *
 * It returns a reason rather than throwing, because the caller has to tell the athlete something true.
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
  template: ShareTemplate | null;
  /** How a single capture's poses are laid out. Ignored when `pairCount` > 0. */
  entryTemplate?: EntryTemplate;
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
  /** Filename stem. The athlete sees this in their downloads. */
  fileName: string;
}

export type SaveResult = { ok: true } | { ok: false; reason: string };

export const canSaveImage = false;

export async function saveShareCard(_spec: ShareCardSpec): Promise<SaveResult> {
  return {
    ok: false,
    reason: 'Saving the card needs the installed app — it works in the browser today.',
  };
}
