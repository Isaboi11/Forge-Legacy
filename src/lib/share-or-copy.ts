import { Platform, Share } from 'react-native';

export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'failed';

/**
 * Hand some text to the system share sheet — and on a browser with no Web Share, copy it instead.
 *
 * ⚠ react-native-web's `Share.share` REJECTS when `navigator.share` is missing (desktop Chrome and
 * Firefox), and every caller caught that as "the athlete dismissed the sheet". So "Share…" did nothing,
 * silently (QA 09-26 settings-13). The caller shows a toast for `copied` so the tap visibly did something.
 */
export async function shareOrCopy(text: string, title = 'Forge Legacy'): Promise<ShareOutcome> {
  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav && typeof nav.share === 'function') {
      try {
        await nav.share({ title, text });
        return 'shared';
      } catch {
        return 'dismissed';
      }
    }
    try {
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(text);
        return 'copied';
      }
    } catch {
      /* clipboard refused (insecure context, permissions) — fall through */
    }
    return 'failed';
  }
  try {
    await Share.share({ message: text });
    return 'shared';
  } catch {
    return 'dismissed';
  }
}
