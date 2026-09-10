import * as Clipboard from 'expo-clipboard';
import { EncodingType, cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import { Platform, Share } from 'react-native';

/**
 * Hand a composed card to the athlete as an actual image — the one place both exporters do it.
 *
 * ══ ⚠ "SAVE IMAGE" DID NOT SAVE, AND ON A PHONE IT LOOKED LIKE NOTHING HAPPENED ══
 *
 * PO, 2026-09-08, from the Compare screen: *"I tried saving this with the save photo button and it didn't
 * work."* It worked exactly as written — it composed the card and put it on the CLIPBOARD, and the toast
 * said so. But the athlete had tapped a button called Save, gone to Photos, and found nothing. A verb
 * nobody reads a toast to correct is still the wrong verb.
 *
 * Both exporters carried the same note: a real save needs `expo-media-library`, a share sheet carrying a
 * file needs `expo-sharing` + `expo-file-system`, all three change the native fingerprint, so the
 * clipboard was the honest trade until the next build. **Two thirds of that was wrong.**
 *
 *   · `expo-file-system` is ALREADY IN THE BINARY — it ships as a dependency of `expo` itself, so
 *     autolinking put it in the last build whether or not this project named it. Declaring a version we
 *     already resolve adds no native code.
 *   · The share sheet does not need `expo-sharing`. React Native's own `Share` takes a `url` on iOS, and
 *     a `file://` PNG handed to it opens the system sheet with **Save Image** at the front of it.
 *
 * So there is a real save today, over the air, and the fingerprint does not move. ⚠ `@expo/fingerprint`
 * hashes `packageJson:scripts` and the autolinking result — not `dependencies` — which is WHY declaring
 * the package is free; `fingerprint:compare --build-id` still has to say MATCH before publishing, because
 * that reasoning is worth exactly as much as the check that proves it.
 *
 * ══ WHAT THIS STILL CANNOT DO ══
 *
 * It cannot write to the camera roll by itself — the athlete taps Save Image in the sheet, and iOS asks
 * them. So the caller must not say "Saved": the sheet is the receipt, and nothing here knows which button
 * they pressed in it. `handOffImage` reports HOW the image left, and every caller phrases from that.
 *
 * Android gets the clipboard as before — `Share`'s `url` is iOS-only, and a `file://` uri handed to an
 * Android intent without a FileProvider is a crash, not a share.
 */

export type HandOff = 'sheet' | 'clipboard';

/** `toDataURL` returns bare base64; a data-uri prefix is accepted by one sink and rejected by the other. */
const bare = (base64: string) => base64.replace(/^data:image\/\w+;base64,/, '');

const fileNameFor = (stem: string) => `${stem.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'forge-legacy'}.png`;

/**
 * Write the PNG somewhere real and offer it to the system, falling back to the clipboard. Returns null
 * only when BOTH failed — the caller then has something true to say.
 *
 * ⚠ `prefer: 'clipboard'` is not a downgrade, it is a different destination. A caller that is about to
 * deep-link into Instagram needs the image on the PASTEBOARD, because that is what the athlete will do
 * next; opening a share sheet and then jumping to another app would be two hand-offs for one tap.
 */
export async function handOffImage(base64: string, fileStem: string, prefer: HandOff = 'sheet'): Promise<HandOff | null> {
  const payload = bare(base64);

  if (prefer === 'sheet' && Platform.OS === 'ios' && cacheDirectory) {
    try {
      const uri = `${cacheDirectory}${fileNameFor(fileStem)}`;
      await writeAsStringAsync(uri, payload, { encoding: EncodingType.Base64 });
      // Resolves with `dismissedAction` when the sheet is cancelled — a dismissal is not a failure, and
      // must not fall through to the clipboard behind the athlete's back.
      await Share.share({ url: uri });
      return 'sheet';
    } catch {
      /* cache write refused, or the sheet would not open — the clipboard still works */
    }
  }

  try {
    await Clipboard.setImageAsync(payload);
    return 'clipboard';
  } catch {
    return null;
  }
}
