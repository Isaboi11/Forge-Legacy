/**
 * ExercisePoster — the still-frame thumbnail for a list row or small slot that names an exercise.
 *
 * One frame of the exercise's demonstration clip (bronze figure on transparent), shown where the row
 * used to carry only an equipment glyph. It FILLS its parent slot: give it a sized, rounded, recessed
 * container (the surfaces already have one) and it drops in.
 *
 * ── FALLBACK IS THE OLD SYMBOL ───────────────────────────────────────────────────────────────────
 *
 * The library doesn't cover every catalog entry (strongman, most mobility) and a catalog id can land
 * before its clip. When there is no poster — or the fetch 404s — the row shows exactly what it showed
 * before: the `fallback` the caller passes (its `EquipIcon`/glyph). The glyph and the poster are
 * mutually exclusive, never layered: because the poster is transparent, a glyph left mounted behind it
 * would show THROUGH the figure, so the fallback is REMOVED the moment the still has painted (or, on web
 * where the load event is unreliable, after a short hold) — never left mounted behind it.
 *
 * Derive-don't-ask, same as the demo loop: `exercisePosterUrl` is pure string-building, the image load
 * answers "does it exist?" for free, and `onError` collapses back to the glyph.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { exercisePosterUrl, type AthleteSex } from '@/domain/exercise-detail/media';
import { useProfile } from '@/lib/profile';

export function ExercisePoster({
  exerciseId,
  fallback,
  radius = 0,
  contentFit = 'contain',
  sex,
}: {
  /** Catalog id / slug (`barbell-bench-press`) — the same key the row already has. */
  exerciseId: string | null | undefined;
  /** What the slot shows with no clip: the caller's existing equipment glyph. */
  fallback: React.ReactNode;
  /** Match the parent slot's corner so the still clips cleanly. */
  radius?: number;
  contentFit?: 'contain' | 'cover';
  /** Override the athlete's own sex where a surface has a reason to (defaults to the profile's). */
  sex?: AthleteSex;
}) {
  const { profile } = useProfile();
  // A conditioning row (`cardio:run`) has no clip in the bucket — asking would only ever 404.
  const url = exercisePosterUrl(exerciseId?.startsWith('cardio:') ? null : exerciseId, sex ?? (profile?.sex as AthleteSex | undefined));
  const [failed, setFailed] = useState(false);
  /* WHICH url has painted. Until it has, the glyph holds the slot (QA 09-26 library-25: "thumbnails blank while
     loading"). onLoad is unreliable for these on web (see below), so a short timer retires the glyph anyway —
     it must never be left behind a transparent figure. Keyed by url so a recycled row starts over. */
  const [paintedUrl, setPaintedUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!url || failed || paintedUrl === url) return;
    const t = setTimeout(() => setPaintedUrl(url), GLYPH_HOLD_MS);
    return () => clearTimeout(t);
  }, [url, failed, paintedUrl]);

  /* The poster is transparent, so the fallback must be REMOVED once a clip is up, not merely covered —
     anything left mounted shows THROUGH the figure. Gate on "have a URL and it hasn't errored", never
     on onLoad: expo-image's load event is unreliable for these on web, and waiting for it stranded the
     glyph behind the image. A missing/404 poster flips `failed` and the glyph returns. */
  const hasClip = !!url && !failed;
  const painted = hasClip && paintedUrl === url;

  return (
    <View style={[StyleSheet.absoluteFill, styles.center, { borderRadius: radius }]}>
      {painted ? null : fallback}
      {hasClip ? (
        <Image
          source={{ uri: url }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          transition={150}
          cachePolicy="memory-disk"
          onError={() => setFailed(true)}
          onLoad={() => setPaintedUrl(url)}
          onDisplay={() => setPaintedUrl(url)}
          accessibilityLabel=""
        />
      ) : null}
    </View>
  );
}

/** The longest the glyph waits for a still that never says it loaded (web). */
const GLYPH_HOLD_MS = 1500;

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
