import * as Clipboard from 'expo-clipboard';
import { Image } from 'react-native';

import type { ProgressPostCard } from '@/data/squad-feed-live';
import { progressHostReady, rasterizeProgressFrame } from './progress-card-host';

/**
 * Export the Progress Photo Post card — the native path.
 *
 * ══ WHAT THIS WAS, AND WHY IT CHANGED ══
 *
 * A stub. It told the athlete *"Saving the card needs the installed app — it works in the browser
 * today"*, on the reasoning that composing a PNG needed a canvas and writing one to the camera roll
 * needed `expo-media-library`, and that this project had no way to produce or verify an iOS build.
 *
 * The first half of that stopped being true: `react-native-svg` is already a dependency, it rasterises,
 * and `domain/share/progress-card` resolves every rect the card needs. **The second half is still true**
 * and is dealt with below.
 *
 * What actually forced this is a monetization decision: **MA3-D12 moved share-card export to the FREE
 * tier**, because every card that reaches Instagram carries the brand to somebody who has never heard of
 * Forge Legacy. That makes export an acquisition surface rather than a feature, and an acquisition
 * surface that only works in a browser is not one.
 *
 * ══ ⚠ COMPOSED, NOT CAPTURED — AND OTA-SAFE ══
 *
 * Route (a) of the two the launch checklist names: `react-native-svg` + `toDataURL`. **No new native
 * module, so no fingerprint change, so this reaches phones over the air** — which matters because
 * everything else queued behind a build would be held up by choosing otherwise.
 *
 * Route (b) — `react-native-view-shot` on the preview — was rejected twice over: it needs a new iOS
 * build, and it contradicts the "compose, don't capture" reasoning both existing exporters are built on.
 * A capture exports whatever the device happened to render, at whatever density, with any UI that
 * strayed into frame.
 *
 * ══ ⚠ IT COPIES. IT DOES NOT SAVE, AND IT MUST NOT SAY IT DOES ══
 *
 * Writing to the camera roll needs `expo-media-library`; a system share sheet carrying a file needs
 * `expo-sharing` and `expo-file-system`. **None of the three is installed, and adding any of them changes
 * the native fingerprint.** So the card goes to the CLIPBOARD via `expo-clipboard` — the same trade
 * `share-image.ts` already ships, for the same reason.
 *
 * "Copied" is a worse verb than "Saved" and it is a true one. A button that says it saved and did not is
 * the exact failure this codebase treats as unshippable, and `progress-photo-post.tsx` therefore reads
 * `via` and phrases its toast from it rather than assuming.
 *
 * ⚠ **The clipboard holds ONE image**, which is the honest limit of this approach: a hero carousel is N
 * separate files by design (Instagram cannot un-flatten a strip), and only one of them can be copied per
 * tap. `slides` reports how many the card actually has so the caller can say so. When Phase E cuts a new
 * iOS build for RevenueCat — which it must — `expo-media-library` turns this into a true multi-file save
 * and nothing above this line changes.
 */

export interface ProgressExportSpec {
  card: ProgressPostCard;
  /** Filename stem. Unused on native — the clipboard has no filename — kept so both paths share a spec. */
  fileName: string;
  /** Hero only: which slide to export. Grid ignores it. Defaults to the first. */
  slide?: number;
}

export type ProgressExportResult =
  | {
      ok: true;
      /** How many images were produced. Always 1 on native — the clipboard holds one. */
      count: number;
      /** ⚠ The caller MUST phrase its toast from this. Native copies; web downloads. */
      via: 'clipboard' | 'download';
      /** How many slides the card has in total, so the caller can be honest about the rest. */
      slides: number;
    }
  | { ok: false; reason: string };

export const canExportProgressCard = true;

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

/** Natural pixel size, which cover-fit needs to crop the way the preview did. */
function measure(uri: string): Promise<{ w: number; h: number } | undefined> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (w, h) => resolve({ w, h }),
      // A photo that will not measure draws as an empty recess rather than being stretched from a
      // guessed size — the same call `share-image.ts` makes.
      () => resolve(undefined),
    );
  });
}

export async function saveProgressCard(spec: ProgressExportSpec): Promise<ProgressExportResult> {
  const { card } = spec;
  if (!card.photos.length) return { ok: false, reason: 'There are no photos on this card yet.' };

  if (!progressHostReady()) {
    // Refused honestly rather than waited out. Without a mounted `ProgressCardHost` the rasterise would
    // sit on its six-second timeout and then fail anyway — this says the true thing immediately.
    return { ok: false, reason: 'Couldn’t build the image just now. Try again in a moment.' };
  }

  // Every photo, fetched and measured BEFORE anything is drawn. Same rule as both other exporters: a
  // progress card with the progress missing is not a lesser version of the thing, it is a different and
  // dishonest one, and it would export silently.
  let uris: string[];
  try {
    uris = await Promise.all(card.photos.map((p) => (p.url ? toDataUri(p.url) : Promise.resolve(''))));
  } catch {
    return { ok: false, reason: 'Couldn’t read the photos to build the image. Try again in a moment.' };
  }
  const natural = await Promise.all(uris.map((u) => (u ? measure(u) : Promise.resolve(undefined))));

  const slides = card.style === 'hero' ? card.photos.length : 1;
  const slide = Math.max(0, Math.min(spec.slide ?? 0, slides - 1));

  const base64 = await rasterizeProgressFrame({ card, photoUris: uris, natural, slide });
  if (!base64) return { ok: false, reason: 'Couldn’t build the image just now. Try again in a moment.' };

  // `toDataURL` returns bare base64 and `setImageAsync` wants the same; a data-uri prefix is silently
  // accepted on one platform and rejected on the other, so it is stripped either way.
  const payload = base64.replace(/^data:image\/\w+;base64,/, '');
  try {
    await Clipboard.setImageAsync(payload);
  } catch {
    return { ok: false, reason: 'Couldn’t copy the card. Try again in a moment.' };
  }

  return { ok: true, count: 1, via: 'clipboard', slides };
}
