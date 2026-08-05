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
  const [failed, setFailed] = useState(false);

  /* The clip is transparent, so the engraved fallback must be REMOVED once it's up, not merely
     covered — anything left mounted shows THROUGH the figure. Gate on "have a URL and it hasn't
     errored", never on onLoad: expo-image's load event is unreliable for animated WebP on web, and
     waiting for it stranded the dumbbell behind the animation. A 404 flips `failed` and it returns. */
  const hasClip = !!url && !failed;

  return (
    <View style={[StyleSheet.absoluteFill, styles.center, { borderRadius: radius }]}>
      {hasClip ? null : fallback}
      {hasClip ? (
        <Image
          source={{ uri: url }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          transition={220}
          cachePolicy="memory-disk"
          onError={() => setFailed(true)}
          accessibilityLabel="Movement demonstration"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
