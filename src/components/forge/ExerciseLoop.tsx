/**
 * ExerciseLoop — the animated demonstration inside a small hero slot (the active-workout media slot).
 *
 * The sibling of `ExercisePoster`: same drop-in contract, same derive-don't-ask fallback — but this
 * one plays the full clip instead of a still. `expo-image` loops an animated WebP on its own, so
 * pointing it at `exerciseDemoUrl` is all it takes. It FILLS its parent slot; give it a sized, rounded,
 * clipping container (the slot already is one) and it drops in.
 *
 * The exercise-DETAIL screen has its own richer player (`ExerciseDemo`: badge, caption, tap-to-pause).
 * This is the quiet in-workout version — no chrome, just the movement in the corner of the hero card,
 * collapsing back to the caller's engraved placeholder when the library doesn't cover the lift.
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { exerciseDemoUrl, type AthleteSex } from '@/domain/exercise-detail/media';
import { useProfile } from '@/lib/profile';

export function ExerciseLoop({
  exerciseId,
  fallback,
  radius = 0,
  contentFit = 'contain',
  sex,
}: {
  /** Catalog id / slug — `SessionExercise.catalogKey`. */
  exerciseId: string | null | undefined;
  /** What the slot shows with no clip: the caller's engraved placeholder. */
  fallback: React.ReactNode;
  radius?: number;
  contentFit?: 'contain' | 'cover';
  sex?: AthleteSex;
}) {
  const { profile } = useProfile();
  const url = exerciseDemoUrl(exerciseId, sex ?? (profile?.sex as AthleteSex | undefined));
  /*
   * ⚠ THE FAILURE IS SCOPED TO A URL, NOT TO THIS MOUNT — and that is the whole fix.
   *
   * This was a bare `failed` boolean. Swap an exercise the library doesn't cover for one it does and
   * the slot stayed empty, because the flag set by the FIRST lift's 404 was still true for the second.
   * Storing WHICH url failed makes the reset automatic: a new `exerciseId` derives a new url, the
   * comparison stops matching, and the clip is tried again. No effect, no ref, nothing to remember to
   * clear — which matters because the sync-setState-in-an-effect version of this is a lint error here.
   */
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  /* The clip is transparent, so the engraved fallback must be REMOVED once it's up, not merely
     covered — anything left mounted shows THROUGH the figure. Gate on "have a URL and it hasn't
     errored", never on onLoad: expo-image's load event is unreliable for animated WebP on web, and
     waiting for it stranded the dumbbell behind the animation. A 404 flips `failedUrl` and it returns. */
  const hasClip = !!url && failedUrl !== url;

  return (
    <View style={[StyleSheet.absoluteFill, styles.center, { borderRadius: radius }]}>
      {hasClip ? null : fallback}
      {hasClip ? (
        <Image
          /*
           * ⚠ KEYED ON THE URL, WHICH REMOUNTS THE PLAYER ON EVERY SWAP.
           *
           * PO: *"when replacing exercise it keeps the old animation and puts it on the new workout
           * card."* Handing a mounted `expo-image` a new `source.uri` leaves the decoded frames of the
           * previous clip on screen until something else forces a repaint — which is why the stale
           * figure survived the swap and then vanished the moment the athlete scrolled. A key makes the
           * new lift a NEW element, so there is no previous frame for it to inherit.
           */
          key={url}
          source={{ uri: url }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          transition={220}
          cachePolicy="memory-disk"
          onError={() => setFailedUrl(url ?? null)}
          accessibilityLabel="Movement demonstration"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
