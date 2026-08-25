import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Give a video pin a real still frame, once, and store it — so the museum has a picture everywhere.
 *
 * ══ THE DEFECT ══
 *
 * `pins.poster_url` has existed since migration `0005` and **nothing has ever written it**. The comment
 * in `legacy-pins-live.ts` states it plainly: *"a video pin wants a still frame, and nothing in the app
 * extracts one yet."* So `PinnedCard` falls back to `posterUrl ?? mediaUrl`, and for a video that is a
 * bare `.mp4`.
 *
 * ⚠ AND A BARE `.mp4` CANNOT BE DRAWN BY A BROWSER ON iOS. The native app pulls a frame with
 *   `generateThumbnailsAsync`, which is why Legacy looks right in TestFlight. Safari on iPhone refuses
 *   to download video data at all until a user gesture — a deliberate iOS data-saving rule — so the
 *   `<video>` fallback paints frame zero if it has anything, and a blank grey box if it does not. No
 *   amount of seeking, preloading or fitting gets around it; the browser simply has no pixels yet.
 *   That is the whole reason the web preview showed grey tiles and a picture of a gym ceiling while the
 *   same account on the phone showed the lift.
 *
 * ⭐ SO THE FRAME IS EXTRACTED ONCE, ON A DEVICE THAT CAN, AND SAVED AS AN IMAGE. After that every
 *   surface renders an `<Image>` — web, native, a share card, anything — and none of them need to know
 *   a video was involved. That is what the column was reserved for.
 *
 * ⚠ NATIVE-ONLY BY CONSTRUCTION, and that is not a limitation to fix later: the web cannot produce the
 *   frame it is missing, which is the entire problem. The first time an athlete opens Legacy on their
 *   phone, their pins acquire posters and the web preview is correct from then on. A pin created and
 *   only ever viewed on the web stays as it is today — no worse, and no crash.
 *
 * ⚠ FAILURE IS ALWAYS SILENT. This runs while a card is rendering; a keepsake tile must never turn into
 *   an error because a thumbnail could not be uploaded. Every path resolves.
 */
export async function ensurePinPoster(pin: { id: string; mediaUrl?: string; posterUrl?: string; isVideo?: boolean }): Promise<string | null> {
  if (Platform.OS === 'web') return null; // the web is the surface that needs this, not the one that can do it
  if (!pin.isVideo || !pin.mediaUrl || pin.posterUrl) return null;

  try {
    const { createVideoPlayer } = await import('expo-video');
    const { uploadToBucket } = await import('@/lib/storage-upload');

    const player = createVideoPlayer(pin.mediaUrl);
    try {
      player.muted = true;
      // The same 0.1s `MediaThumb` samples — frame zero is often the sensor still settling.
      const frames = await player.generateThumbnailsAsync(0.1, { maxWidth: 640 });
      const frame = frames?.[0] as unknown as { uri?: string } | undefined;
      if (!frame?.uri) return null;

      const url = await uploadToBucket('media', `pin-posters/${pin.id}.jpg`, frame.uri, {
        contentType: 'image/jpeg',
      });

      /* ⚠ The write is scoped to the athlete's own row by RLS; a failure here (an offline device, a
         revoked session) leaves the pin exactly as it was and the next open tries again. */
      await supabase.from('pins').update({ poster_url: url }).eq('id', pin.id);
      return url;
    } finally {
      /* Release the decoder even when the upload throws — these run one per visible tile and a leaked
         player holds a hardware decode session on iOS. */
      player.release?.();
    }
  } catch {
    return null; // a missing thumbnail is the status quo, never an error on screen
  }
}
