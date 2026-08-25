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
 * ══ WHY THE WEB SHOWED A CEILING, AND WHY `contain` WAS THE WRONG FIX FOR IT ══
 *
 * PO, first report: *"the videos need to be centralized and not zoomed in that much"* — the tiles were
 * showing a crop of a gym ceiling instead of the lift. That was answered by moving video to `contain`,
 * and it was answering the wrong question: the tiles were not badly cropped, they were showing THE
 * WRONG FRAME, and `contain` merely showed more of the wrong frame.
 *
 * ⚠ THE REAL VARIABLE WAS THE PLATFORM, NOT THE FIT. Side-by-side screenshots of the same account
 *   settled it: the native app draws a proper thumbnail, the web preview draws a ceiling or a blank
 *   grey box. Native calls `generateThumbnailsAsync(0.1)` and gets a real frame. Web cannot — the
 *   player throws there — so it falls back to a paused `<video>`, and a `<video>` paints **frame 0**.
 *   Frame 0 of a phone clip is the sensor still settling while the phone is being set down: the
 *   ceiling. And if the element has not buffered at all it paints nothing, which is the grey tile.
 *
 * So the fit goes back to `cover` on both — full-bleed, which is what the native app does and what the
 * PO pointed at as the target — and the WEB path now seeks to the same 0.1s the native path samples.
 * One frame, one composition, both platforms.
 */

/** Both fill the tile. The native app does, and it is the look the PO asked to match. */
const VIDEO_FIT = 'cover' as const;
const PHOTO_FIT = 'cover' as const;

/**
 * Where both platforms sample the poster frame.
 *
 * A tenth of a second in, not zero: the very first frame of a phone clip is often the sensor still
 * settling, and some encoders put a black frame there. Native passes this to
 * `generateThumbnailsAsync`; web seeks the element to it. They must stay the same number or the two
 * platforms show two different pictures of the same keepsake.
 */
const POSTER_AT = 0.1;
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
    /*
     * ⚠ THE SEEK HAPPENS HERE, IN THE CONSTRUCTOR, AND NOT IN AN EFFECT — the react-compiler lint
     * forbids mutating a value returned from a hook (`react-hooks/immutability`) and says so with the
     * fix attached: "consider moving the modification into the hook where the value is constructed."
     * This callback IS that place, and expo-video queues the seek until the source has metadata, so it
     * survives being asked before the video is ready.
     *
     * On WEB this is what makes the tile paint at all: the `<video>` fallback below shows frame 0 —
     * the ceiling, as a phone is set down — or nothing until it buffers. Assigning a time forces the
     * decode and lands on the same frame the native path samples.
     */
    p.currentTime = POSTER_AT;
  });
  const [poster, setPoster] = useState<ImageSource | null>(null);

  useEffect(() => {
    // Web cannot generate a thumbnail — `generateThumbnailsAsync` throws there. Its poster comes from
    // the constructor's seek above, which is what makes the `<video>` fallback paint a real frame.
    if (Platform.OS === 'web') return;
    let live = true;
    player
      .generateThumbnailsAsync(POSTER_AT, { maxWidth: 640 })
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
