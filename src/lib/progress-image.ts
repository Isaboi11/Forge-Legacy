import type { ProgressPostCard } from '@/data/squad-feed-live';

/**
 * Render the Progress Photo Post card as real image files.
 *
 * ══ THIS IS THE NATIVE STUB ══
 *
 * The web build resolves `progress-image.web.ts` instead. Writing to the camera roll needs
 * `expo-media-library` and a permission prompt, and composing the PNG needs a canvas — neither exists in
 * a bare Expo build, and this project has no way to produce or verify an iOS one. Shipping a native path
 * that quietly did nothing would be worse than saying so, which is the same call `share-image.ts` made.
 *
 * It returns a REASON rather than throwing, because the caller has to tell the athlete something true —
 * and, in particular, must not go on to open Instagram as though an image were waiting there.
 */

export interface ProgressExportSpec {
  card: ProgressPostCard;
  /** Filename stem. A hero carousel appends `-1`, `-2`, … in slide order. */
  fileName: string;
}

export type ProgressExportResult = { ok: true; count: number } | { ok: false; reason: string };

export const canExportProgressCard = false;

export async function saveProgressCard(_spec: ProgressExportSpec): Promise<ProgressExportResult> {
  return {
    ok: false,
    reason: 'Saving the card needs the installed app — it works in the browser today.',
  };
}
