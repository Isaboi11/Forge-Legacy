import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { BeforeAfterSlider } from '@/components/forge/BeforeAfterSlider';
import type { AlignedPhoto, TransformationLayoutData } from '@/data/squad-feed-live';
import { flColor, flFont, flRadius } from '@/constants/foundation';

/**
 * Renders a shared transformation in the chosen format, from `TransformationLayoutData`. Used in the Share
 * preview and in the post it creates, so both look identical. Per-photo alignment (pan/zoom) is applied
 * everywhere.
 *
 * TWO FAMILIES, ONE COMPONENT. A COMPARISON carries `pairs` and renders then/now — slider (draggable),
 * side-by-side, stacked, or a multi-pose grid. A SINGLE CAPTURE carries `shots` and renders the poses
 * themselves — one photo, a 2-up gallery, or a full-width column. `shots` is checked first because a
 * capture has no then/now: it is not a comparison with a side missing, it is a different thing.
 */
export function TransformationLayout({ data, compact = false }: { data: TransformationLayoutData; compact?: boolean }) {
  /*
   * The athlete's own name for this post (0184), above the art it names.
   *
   * ⚠ WRAPPED HERE RATHER THAN PASSED TO `LedgerPost`'s `title` — that slot is deliberately suppressed on
   * any post carrying `customMedia` (the card renders no marker, no title and no stat row when the art
   * takes over), and a comparison is exactly such a post. Putting it inside the composition means the
   * name travels with it: the feed, the post page and the share preview all show it without three
   * callers having to remember to.
   */
  const title = data.title?.trim();
  if (!title) return <TransformationArt data={data} compact={compact} />;
  return (
    <View style={styles.titled}>
      <Text style={styles.postTitle} numberOfLines={2}>
        {title}
      </Text>
      <TransformationArt data={data} compact={compact} />
    </View>
  );
}

function TransformationArt({ data, compact = false }: { data: TransformationLayoutData; compact?: boolean }) {
  const shots = data.shots ?? [];
  if (shots.length) {
    if (data.template === 'gallery') {
      return (
        <View style={styles.galleryGrid}>
          {shots.map((s, i) => (
            <Shot key={`${s.label}-${i}`} shot={s} style={styles.galleryCell} />
          ))}
        </View>
      );
    }
    if (data.template === 'column') {
      return (
        <View style={styles.gridStack}>
          {shots.map((s, i) => (
            <Shot key={`${s.label}-${i}`} shot={s} />
          ))}
        </View>
      );
    }
    return <Shot shot={shots[0]} />; // single
  }

  const pairs = data.pairs ?? [];
  if (!pairs.length) return null;
  const first = pairs[0];

  if (data.template === 'slider') {
    return (
      <View>
        <BeforeAfterSlider before={first.then.url} after={first.now.url} beforeT={first.then.transform} afterT={first.now.transform} beforeLabel={data.thenLabel} afterLabel={data.nowLabel} />
        {data.elapsed ? <ElapsedHero elapsed={data.elapsed} /> : null}
      </View>
    );
  }

  if (data.template === 'stacked') {
    return (
      <View style={styles.stack}>
        <Labeled label="Then" sub={data.thenLabel} photo={first.then} now={false} />
        <Labeled label="Now" sub={data.nowLabel} photo={first.now} now />
        {data.elapsed ? <ElapsedHero elapsed={data.elapsed} /> : null}
      </View>
    );
  }

  if (data.template === 'grid') {
    return (
      <View style={styles.gridStack}>
        {data.elapsed ? <ElapsedHero elapsed={data.elapsed} top /> : null}
        {pairs.map((p, i) => (
          <View key={`${p.label}-${i}`} style={styles.gridRow}>
            <Text style={styles.gridPose}>{p.label}</Text>
            <View style={styles.pairRow}>
              <AlignedImage photo={p.then} chip={i === 0 ? data.thenLabel ?? 'Then' : undefined} now={false} />
              <AlignedImage photo={p.now} chip={i === 0 ? data.nowLabel ?? 'Now' : undefined} now />
            </View>
          </View>
        ))}
      </View>
    );
  }

  // side-by-side (default)
  return (
    <View>
      <View style={styles.pairRow}>
        <Labeled label="Then" sub={data.thenLabel} photo={first.then} now={false} stacked={false} />
        <Labeled label="Now" sub={data.nowLabel} photo={first.now} now stacked={false} />
      </View>
      {data.elapsed ? <ElapsedHero elapsed={data.elapsed} /> : null}
    </View>
  );
}

/**
 * One pose from a single capture. The image is wrapped in a ROW so `AlignedImage`'s `flex: 1` resolves
 * against the width — in a column it would resolve against a height nothing has set, and collapse.
 */
function Shot({ shot, style }: { shot: { label: string; photo: AlignedPhoto }; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.gridRow, style]}>
      {shot.label ? <Text style={styles.gridPose}>{shot.label}</Text> : null}
      <View style={styles.pairRow}>
        <AlignedImage photo={shot.photo} />
      </View>
    </View>
  );
}

function Labeled({ label, sub, photo, now, stacked = true }: { label: string; sub?: string; photo: AlignedPhoto; now: boolean; stacked?: boolean }) {
  return (
    <View style={stacked ? undefined : styles.col}>
      <Text style={[styles.overLabel, now ? styles.overLabelNow : null]}>
        {label}
        {sub ? ` · ${sub}` : ''}
      </Text>
      <AlignedImage photo={photo} />
    </View>
  );
}

function AlignedImage({ photo, chip, now }: { photo: AlignedPhoto; chip?: string; now?: boolean }) {
  const [w, setW] = useState(0);
  const h = (w * 4) / 3;
  const t = photo.transform;
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  return (
    <View style={styles.cell} onLayout={onLayout}>
      <Image source={{ uri: photo.url }} style={[styles.cellImg, t ? { transform: [{ translateX: t.tx * w }, { translateY: t.ty * h }, { scale: t.scale }] } : null]} contentFit="cover" />
      {chip ? (
        <View style={[styles.chip, now ? styles.chipNow : null]}>
          <Text style={[styles.chipText, now ? styles.chipTextNow : null]}>{chip}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ElapsedHero({ elapsed, top }: { elapsed: string; top?: boolean }) {
  return (
    <View style={[styles.elapsedHero, top ? styles.elapsedTop : styles.elapsedBottom]}>
      <Text style={styles.elapsedBig}>{elapsed}</Text>
      <Text style={styles.transformed}>Transformed</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titled: { gap: 9 },
  postTitle: { fontFamily: flFont.display, fontSize: 17, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  stack: { gap: 10 },
  gridStack: { gap: 16 },
  gridRow: { gap: 7 },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  /* Two per row, computed off the gap so the pair always fits — `48%` leaves a stray column on narrow cards. */
  galleryCell: { width: '48.5%', flexGrow: 1, flexBasis: '48.5%' },
  gridPose: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },
  pairRow: { flexDirection: 'row', gap: 8 },
  col: { flex: 1, minWidth: 0, gap: 5 },
  overLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray400, marginBottom: 5 },
  overLabelNow: { color: flColor.bronze300 },

  cell: { flex: 1, minWidth: 0, aspectRatio: 3 / 4, borderRadius: flRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.surfaceRecessed, position: 'relative' },
  cellImg: { width: '100%', height: '100%' },
  chip: { position: 'absolute', top: 8, left: 8, paddingVertical: 3, paddingHorizontal: 8, borderRadius: flRadius.sm, backgroundColor: 'rgba(8,11,14,0.72)', borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  chipNow: {},
  chipText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: flColor.gray400 },
  chipTextNow: { color: flColor.bronze300 },

  elapsedHero: { alignItems: 'center' },
  elapsedTop: { marginBottom: 6 },
  elapsedBottom: { marginTop: 14 },
  elapsedBig: { fontFamily: flFont.display, fontSize: 28, fontWeight: '700', letterSpacing: -0.5, color: flColor.bronze300 },
  transformed: { marginTop: 4, fontSize: 9, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.gray600 },
});
