import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { elapsedBetween, XFORM_POSES, type TransformationEntry } from '@/data/transformation-live';
import type { TransformationLayoutData } from '@/data/squad-feed-live';
import { flColor, flFont, flRadius } from '@/constants/foundation';

/**
 * Pick two of your own progress captures to compare — shared by the squad composer and the friends composer.
 *
 * WHY IT SELECTS ENTRIES RATHER THAN PHOTOS. The Transformation archive (L-17) holds the captures AND their
 * per-pose structure, so comparing two entries produces a genuine before/after against the same pose. Two
 * arbitrary photos from the library would render worse than what the app already knows how to do, which is
 * why neither composer offers that.
 *
 * It assembles the same `TransformationLayoutData` the gallery's own Share flow builds, so a comparison
 * renders identically wherever it was posted from.
 *
 * Extracted rather than duplicated: the squad composer had this inline first, and a second copy in the
 * friends composer would have been two implementations of one rule about what a comparison is.
 */

export interface TransformationPick {
  then: TransformationEntry | null;
  now: TransformationEntry | null;
  /** Poses present in BOTH captures — a comparison needs the same pose on each side. */
  shared: typeof XFORM_POSES;
}

/** Resolve the current selection and the poses the two captures have in common. */
export function useTransformationPick(
  entries: TransformationEntry[] | null,
  thenId: string | null,
  nowId: string | null,
): TransformationPick {
  const then = entries?.find((e) => e.id === thenId) ?? null;
  const now = entries?.find((e) => e.id === nowId) ?? null;
  const shared = useMemo(
    () => (then && now ? XFORM_POSES.filter((pose) => then.photos[pose.key] && now.photos[pose.key]) : []),
    [then, now],
  );
  return { then, now, shared };
}

/** True when the selection is postable: two different captures sharing at least one pose. */
export const canPostPick = (p: TransformationPick): boolean =>
  !!p.then && !!p.now && p.then.id !== p.now.id && p.shared.length > 0;

/**
 * The layout for a post. `transform` is left undefined — per-pose alignment lives in the archive's Compare
 * screen; unaligned pairs still render, they're just not nudged into register.
 */
export function layoutFromPick(p: TransformationPick): TransformationLayoutData | null {
  if (!canPostPick(p) || !p.then || !p.now) return null;
  return {
    template: 'slider',
    thenLabel: p.then.label,
    nowLabel: p.now.label,
    elapsed: elapsedBetween(p.then.label, p.now.label),
    pairs: p.shared.map((pose) => ({
      label: pose.label,
      then: { url: p.then!.photos[pose.key]! },
      now: { url: p.now!.photos[pose.key]! },
    })),
  };
}

/** The first pair, so a feed card has something to show without parsing the layout. */
export function mediaFromPick(p: TransformationPick): { url: string; kind: 'image' }[] {
  const layout = layoutFromPick(p);
  if (!layout || layout.pairs.length === 0) return [];
  return [
    { url: layout.pairs[0].then.url, kind: 'image' },
    { url: layout.pairs[0].now.url, kind: 'image' },
  ];
}

/**
 * One row of captures. The other side's pick is DIMMED rather than removed — a vanishing option makes the
 * two strips look like different lists, and you lose your place scrolling.
 */
export function EntryStrip({
  label,
  entries,
  selectedId,
  otherId,
  onSelect,
}: {
  label: string;
  entries: TransformationEntry[];
  selectedId: string | null;
  otherId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.stripBlock}>
      <Text style={styles.stripLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {entries.map((e) => {
          const on = e.id === selectedId;
          const taken = e.id === otherId;
          const cover = XFORM_POSES.map((pose) => e.photos[pose.key]).find(Boolean);
          return (
            <Pressable
              key={e.id}
              onPress={() => !taken && onSelect(e.id)}
              disabled={taken}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: taken }}
              accessibilityLabel={`${label}: ${e.label}${taken ? ', already chosen on the other side' : ''}`}
              style={({ pressed }) => [styles.chip, on ? styles.chipOn : null, taken ? styles.chipTaken : null, pressed ? styles.pressed : null]}
            >
              {cover ? (
                <Image source={{ uri: cover }} style={styles.chipImg} contentFit="cover" />
              ) : (
                <View style={[styles.chipImg, styles.chipImgEmpty]} />
              )}
              <Text style={[styles.chipLabel, on ? styles.chipLabelOn : null]} numberOfLines={1}>
                {e.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Preview of what will post, or a specific explanation of why it can't. */
export function PickPreview({ pick }: { pick: TransformationPick }) {
  const { then, now, shared } = pick;
  if (!then || !now || then.id === now.id) return null;

  if (shared.length === 0) {
    return (
      <View style={styles.warn}>
        <Text style={styles.warnText}>
          These two captures don’t share a pose, so there’s nothing to compare side by side. Pick a different
          pair, or add a matching pose to one of them.
        </Text>
      </View>
    );
  }

  const gap = elapsedBetween(then.label, now.label);
  return (
    <View style={styles.preview}>
      <Text style={styles.previewLabel}>
        {shared.length} {shared.length === 1 ? 'pose' : 'poses'} in both
        {gap ? ` · ${gap} apart` : ''}
      </Text>
      <View style={styles.pair}>
        <View style={styles.half}>
          <Image source={{ uri: then.photos[shared[0].key] }} style={styles.img} contentFit="cover" />
          <Text style={styles.corner}>{then.label}</Text>
        </View>
        <View style={styles.half}>
          <Image source={{ uri: now.photos[shared[0].key] }} style={styles.img} contentFit="cover" />
          <Text style={styles.corner}>{now.label}</Text>
        </View>
      </View>
      <Text style={styles.hint}>
        Every shared pose is included. To line them up precisely, use Compare in your Transformation archive.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  stripBlock: { gap: 8 },
  stripLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.bronze400 },
  strip: { gap: 9, paddingRight: 4 },
  chip: { width: 76, gap: 5, padding: 5, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  chipOn: { borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint },
  chipTaken: { opacity: 0.35 },
  chipImg: { width: '100%', height: 74, borderRadius: flRadius.sm, backgroundColor: flColor.charcoal800 },
  chipImgEmpty: { borderWidth: 1, borderColor: flColor.charcoal700 },
  chipLabel: { fontSize: 9.5, textAlign: 'center', color: flColor.gray600 },
  chipLabelOn: { color: flColor.bronze300, fontWeight: '600' },

  preview: { gap: 9, padding: 12, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal800 },
  previewLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: flColor.bronze400 },
  pair: { flexDirection: 'row', gap: 3 },
  half: { flex: 1, position: 'relative', overflow: 'hidden', borderRadius: flRadius.sm },
  img: { width: '100%', aspectRatio: 4 / 5, backgroundColor: flColor.charcoal900 },
  corner: { position: 'absolute', bottom: 6, left: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: flRadius.pill, backgroundColor: 'rgba(0,0,0,0.6)', fontFamily: flFont.sans, fontSize: 9, fontWeight: '600', color: flColor.cream100 },
  hint: { fontSize: 11, lineHeight: 16, color: flColor.gray600 },
  warn: { padding: 13, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  warnText: { fontSize: 12, lineHeight: 18, color: flColor.gray400 },
});
