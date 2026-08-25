import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';

/**
 * A keepsake's still preview — a photo, or a video's first frame — filling whatever it is placed in.
 *
 * ══ WHY THIS IS NOT JUST `<Image>` ══
 *
 * It was, and a video rendered as **nothing**. `expo-image` is given an `.mp4` URL, has no idea what to
 * do with it, and draws an empty box. The card came out dark with a play badge floating on it and no
 * picture — reported as "it did not work", and correctly so.
 *
 * The mistake was mine and it was an assumption stated confidently in a comment: that a bare video URL
 * would fall back to its own first frame the way some players do. **Nothing in this stack does that.**
 * An image component renders images.
 *
 * ══ AND WHY IT IS NO LONGER A PAUSED PLAYER EITHER ══
 *
 * The fix after that was a paused `expo-video` player, on the reasoning that a poster needed
 * `expo-video-thumbnails` — a native dependency, undeliverable over the air. That shipped, and the PO
 * reported the sequel: *"the picture for the accomplishments is there as a preview for the video, but
 * not on the pinned legacy."* A player that is created and never told to do anything has no obligation
 * to decode a frame, and on a card that never becomes visible enough to buffer, it does not — so the
 * strip showed a black rectangle while a screen that DID play showed a picture.
 *
 * The dependency turned out to be unnecessary: **`expo-video`'s own player has
 * `generateThumbnailsAsync`**, added by SDK 56 and already in the build. It returns a native image
 * reference that `expo-image` takes as a source directly. So the poster is real now, extracted on the
 * device, with no new package and no fingerprint change.
 *
 * ⚠ IT IS NATIVE-ONLY — the web player throws `'Generating video thumbnails is not supported on Web
 * yet'`. That is fine and is why the paused `VideoView` is kept as the fallback: on the web it renders
 * into a real `<video>` element, which DOES paint its first frame once metadata arrives. Each platform
 * keeps the path that works on it.
 *
 * Still worth doing eventually: extracting the frame once at UPLOAD time and storing it in
 * `pins.poster_url` (0005 reserved the column). That would make the preview free to render everywhere
 * including the web, instead of costing a decode per card.
 *
 * ══ A PHOTO IS CROPPED; A VIDEO FRAME IS NOT ══
 *
 * PO, 2026-08-25: *"the videos need to be centralized and not zoomed in that much."*
 *
 * Everything here used to be `cover`, and for a PHOTO that is right — a photo was framed by the person
 * who took it, so filling the tile and losing the edges keeps their composition. A VIDEO's first frame
 * was never composed for a tile at all: it is whatever the sensor was pointing at, usually portrait,
 * and `cover` in a landscape tile centre-crops it to a strip. That is how a squat rack becomes a
 * picture of a ceiling.
 *
 * ⚠ THE SAME DEFECT WAS ALREADY FIXED ONE SCREEN OVER and this was the other half of it.
 * `accomplishments.tsx` hit it at `height: 220` and moved its player to `contain` for exactly this
 * reason, with the reasoning written above its component — but the two THUMBNAIL surfaces that feed
 * into it (the Legacy hub's Accomplishments row and Pinned Legacy) both come through here and were
 * left on `cover`. Letterboxing a keepsake is not a compromise; showing a fraction of it is.
 */

/** A video frame was never composed for this tile — show all of it. A photo was, so fill the tile. */
const VIDEO_FIT = 'contain' as const;
const PHOTO_FIT = 'cover' as const;
export function MediaThumb({ url, kind }: { url: string; kind: 'image' | 'video' | null | undefined }) {
  if (kind === 'video') return <VideoThumb url={url} />;
  return <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit={PHOTO_FIT} />;
}

/**
 * Separated because `useVideoPlayer` is a hook and must not sit behind the branch above — calling it
 * conditionally is exactly the rules-of-hooks violation the react-compiler lint would reject.
 */
function VideoThumb({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.muted = true; // a strip of silent frames; nothing here should ever make noise
  });
  const [poster, setPoster] = useState<ImageSource | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return; // the web player throws; the VideoView fallback covers it
    let live = true;
    // A tenth of a second in, not zero: the very first frame of a phone clip is often the sensor still
    // settling, and some encoders put a black frame there.
    player
      .generateThumbnailsAsync(0.1, { maxWidth: 640 })
      .then((frames) => {
        if (live && frames[0]) setPoster(frames[0] as unknown as ImageSource);
      })
      .catch(() => {
        // Nothing to do — the paused player below is the fallback, which is what shipped before.
      });
    return () => {
      live = false;
    };
  }, [player]);

  // Both paths take the video fit: the poster IS a video frame, so it crops exactly as badly.
  if (poster) return <Image source={poster} style={StyleSheet.absoluteFill} contentFit={VIDEO_FIT} />;
  return <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls={false} contentFit={VIDEO_FIT} />;
}
