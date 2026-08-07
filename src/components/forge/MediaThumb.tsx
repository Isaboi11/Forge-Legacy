import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
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
 * ⚠ THE OBVIOUS FIX IS UNAVAILABLE, and that is worth writing down. The right answer long-term is a
 * POSTER — extract one frame at upload, store it in `pins.poster_url` (0005 reserved the column for
 * exactly this), and let every surface render a cheap static image. That needs
 * `expo-video-thumbnails`, which is not installed — and adding a native dependency changes the project
 * fingerprint, which would make the fix undeliverable to the TestFlight build over the air. So a paused
 * `expo-video` player is what ships today: it is already a dependency, and it is the same component the
 * accomplishment editor already previews a clip with.
 *
 * The player is created paused and never told to play. `nativeControls` is off — this is a thumbnail in
 * a browsing strip, not a video the athlete is watching, and controls over a 184pt card would cover the
 * frame they exist to reveal. Tapping the card still opens the real destination.
 */
export function MediaThumb({ url, kind }: { url: string; kind: 'image' | 'video' | null | undefined }) {
  if (kind === 'video') return <VideoThumb url={url} />;
  return <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" />;
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
  return <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls={false} contentFit="cover" />;
}
