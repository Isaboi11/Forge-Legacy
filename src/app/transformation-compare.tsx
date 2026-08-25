import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlignEditor } from '@/components/forge/AlignEditor';
import { BeforeAfterSlider, type PhotoTransform } from '@/components/forge/BeforeAfterSlider';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { elapsedBetween, fetchTransformationEntries, XFORM_POSES, type PoseKey } from '@/data/transformation-live';
import { useQuery } from '@/lib/useQuery';
import { flColor, flFont, flRadius } from '@/constants/foundation';

/**
 * Compare (Transformation) — built to the Compare overlay of `Forge Transformation.dc.html`. Two entries,
 * A/B defaulting to the maximum span (oldest ↔ newest), the real calendar elapsed-math, and multi-pose
 * before/after rows with per-photo date chips. Nothing is scored — only the two photos and the time between.
 */

export default function TransformationCompareRoute() {
  const { b } = useLocalSearchParams<{ b?: string }>();
  const router = useRouter();
  const { data } = useQuery(fetchTransformationEntries, []);
  const entries = data ?? [];

  const [aId, setAId] = useState<string | null>(null);
  const [bId, setBId] = useState<string | null>(null);
  const [poses, setPoses] = useState<PoseKey[]>(['ff']);
  const [pickerFor, setPickerFor] = useState<'a' | 'b' | null>(null);
  const [align, setAlign] = useState<Record<string, { before: PhotoTransform; after: PhotoTransform }>>({});
  const [aligning, setAligning] = useState<PoseKey | null>(null);
  const [view, setView] = useState<'sidebyside' | 'slider'>('sidebyside');

  const aEff = aId ?? entries[entries.length - 1]?.id ?? null;
  const bEff = bId ?? (b ? String(b) : entries[0]?.id ?? null);
  const aEntry = entries.find((e) => e.id === aEff) ?? null;
  const bEntry = entries.find((e) => e.id === bEff) ?? null;

  const elapsed = aEntry && bEntry && aEff !== bEff ? elapsedBetween(aEntry.label, bEntry.label) : '';

  const togglePose = (k: PoseKey) =>
    setPoses((cur) => {
      const next = cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k];
      return next.length ? next : [k];
    });

  const selectEntry = (id: string) => {
    if (pickerFor === 'a') setAId(id);
    else if (pickerFor === 'b') setBId(id);
    setPickerFor(null);
  };

  const rows = XFORM_POSES.filter((p) => poses.includes(p.key));

  if (entries.length < 2) {
    return (
      <View style={styles.root}>
        <TopBar onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Need two entries to compare</Text>
          <Text style={styles.emptyBody}>Capture at least two progress sets, then line them up side by side.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TopBar onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.framing}>Side by side, only when you choose to look.</Text>

        <View style={styles.selectRow}>
          <SelectBox label={aEntry?.label ?? 'Select'} onPress={() => setPickerFor('a')} />
          <SelectBox label={bEntry?.label ?? 'Select'} onPress={() => setPickerFor('b')} />
        </View>

        {elapsed ? (
          <View style={styles.elapsedRow}>
            <View style={styles.hair} />
            <Text style={styles.elapsedText}>{elapsed} apart</Text>
            <View style={styles.hair} />
          </View>
        ) : null}

        <View style={styles.posesHead}>
          <Text style={styles.posesLabel}>Poses</Text>
          <Text style={styles.posesHint}>
            {poses.length} {poses.length === 1 ? 'pose' : 'poses'} · tap to add
          </Text>
        </View>
        <View style={styles.poseChips}>
          {XFORM_POSES.map((p) => {
            const on = poses.includes(p.key);
            return (
              <Pressable key={p.key} onPress={() => togglePose(p.key)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.poseChip, on ? styles.poseChipOn : styles.poseChipOff]}>
                <Text style={[styles.poseChipText, on ? styles.poseChipTextOn : null]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.viewToggle}>
          {(['sidebyside', 'slider'] as const).map((v) => (
            <Pressable key={v} onPress={() => setView(v)} accessibilityRole="button" accessibilityState={{ selected: view === v }} style={[styles.viewSeg, view === v ? styles.viewSegOn : styles.viewSegOff]}>
              <Text style={[styles.viewSegText, view === v ? styles.viewSegTextOn : null]}>{v === 'sidebyside' ? 'Side by side' : 'Slider'}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.rowStack}>
          {rows.map((p) => {
            const aUrl = aEntry?.photos[p.key];
            const bUrl = bEntry?.photos[p.key];
            const both = !!(aUrl && bUrl);
            return (
              <View key={p.key}>
                <Text style={styles.rowLabel}>{p.label}</Text>
                {both && view === 'slider' ? (
                  <BeforeAfterSlider before={aUrl!} after={bUrl!} beforeLabel={aEntry?.label} afterLabel={bEntry?.label} beforeT={align[p.key]?.before} afterT={align[p.key]?.after} />
                ) : (
                  <View style={styles.pairRow}>
                    <CompareCell url={aUrl} dateLabel={aEntry?.label ?? 'A'} transform={align[p.key]?.before} />
                    <CompareCell url={bUrl} dateLabel={bEntry?.label ?? 'B'} transform={align[p.key]?.after} />
                  </View>
                )}
                {both ? (
                  <Pressable onPress={() => setAligning(p.key)} accessibilityRole="button" accessibilityLabel="Align photos" style={styles.alignBtn}>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M4 12h16M12 4v16M7 7l10 10M17 7L7 17" />
                    </Svg>
                    <Text style={styles.alignText}>Align photos</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>

        <Pressable
          onPress={() => {
            const chosen = rows.filter((p) => aEntry?.photos[p.key] && bEntry?.photos[p.key]);
            if (!chosen.length) return;
            const payload = {
              thenLabel: aEntry?.label ?? 'Then',
              nowLabel: bEntry?.label ?? 'Now',
              elapsed,
              chapter: bEntry?.chapterName ?? '',
              reflection: bEntry?.caption ?? '',
              pairs: chosen.map((p) => ({
                label: p.label,
                then: { url: aEntry!.photos[p.key]!, transform: align[p.key]?.before },
                now: { url: bEntry!.photos[p.key]!, transform: align[p.key]?.after },
              })),
            };
            router.push({ pathname: '/share-config', params: { kind: 'transformation', mode: 'compare', payload: JSON.stringify(payload) } });
          }}
          accessibilityRole="button"
          accessibilityLabel="Share this comparison"
          style={styles.shareBtn}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
            <Path d="M16 6l-4-4-4 4" />
            <Path d="M12 2v14" />
          </Svg>
          <Text style={styles.shareText}>Share this comparison</Text>
        </Pressable>
      </ScrollView>

      {aligning && aEntry?.photos[aligning] && bEntry?.photos[aligning] ? (
        <AlignEditor
          before={aEntry.photos[aligning]!}
          after={bEntry.photos[aligning]!}
          initialBefore={align[aligning]?.before}
          initialAfter={align[aligning]?.after}
          onSave={(bt, at) => {
            const key = aligning;
            setAlign((a) => ({ ...a, [key]: { before: bt, after: at } }));
            setAligning(null);
          }}
          onClose={() => setAligning(null)}
        />
      ) : null}

      <BottomSheet open={!!pickerFor} onClose={() => setPickerFor(null)} title={pickerFor === 'a' ? 'Earlier entry' : 'Later entry'}>
        <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
          {entries.map((e, i) => (
            <Pressable key={e.id} onPress={() => selectEntry(e.id)} accessibilityRole="button" accessibilityLabel={`Select ${e.label}`} style={[styles.pickerRow, i > 0 ? styles.pickerRowDiv : null]}>
              <Text style={styles.pickerName}>{e.label}</Text>
              <Text style={styles.pickerSub}>{e.chapterName}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

/*
 * ⚠ THIS BAR HAD NO SAFE-AREA INSET, AND THAT IS WHY THERE WAS NO WAY OUT OF THIS SCREEN.
 *
 * PO: *"When I went into my transformation photos and comparing there was no back button so I couldn't
 * get out of it."* The button was always here — `topBar` is 56pt tall and started at y=0, so on a phone
 * with a Dynamic Island the entire bar, chevron included, sat UNDERNEATH the island: invisible, and no
 * tap could reach it. The screen was a dead end on exactly the hardware the testers hold.
 *
 * ⚠ ALL THREE TRANSFORMATION SCREENS HAD IT, and nothing else in the app did. They are the only screens
 * that hand-roll a `TopBar` instead of using the shared `AppBar`, which has done `8 + insets.top` since
 * it was written — so the fault was not a missed edge case but a component built beside the one that
 * already solved this. Matching `AppBar`'s value rather than inventing a third number.
 */
function TopBar({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.topBtn} hitSlop={6}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M15 5l-7 7 7 7" />
        </Svg>
      </Pressable>
      <Text style={styles.topTitle}>Compare</Text>
      <View style={styles.topBtn} />
    </View>
  );
}

function SelectBox({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Change entry (${label})`} style={styles.selectBox}>
      <Text style={styles.selectText} numberOfLines={1}>
        {label}
      </Text>
      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M6 9l6 6 6-6" />
      </Svg>
    </Pressable>
  );
}

function CompareCell({ url, dateLabel, transform }: { url?: string; dateLabel: string; transform?: PhotoTransform }) {
  const [w, setW] = useState(0);
  const h = (w * 4) / 3;
  return (
    <View style={styles.cell}>
      <View style={styles.cellSlot} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {url ? (
          <Image source={{ uri: url }} style={[styles.cellImage, transform ? { transform: [{ translateX: transform.tx * w }, { translateY: transform.ty * h }, { scale: transform.scale }] } : null]} contentFit="cover" />
        ) : (
          <Text style={styles.cellEmpty}>No photo</Text>
        )}
      </View>
      <View style={styles.dateChip}>
        <Text style={styles.dateChipText} numberOfLines={1}>
          {dateLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070707' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100, textAlign: 'center' },
  emptyBody: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, textAlign: 'center' },
  scroll: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 34 },

  topBar: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  topBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: flColor.cream100 },

  framing: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 14.5, lineHeight: 22, color: flColor.bronze300, textAlign: 'center' },
  selectRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  selectBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 11, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  selectText: { flex: 1, minWidth: 0, fontSize: 12, color: flColor.cream100 },

  elapsedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  hair: { flex: 1, height: 1, backgroundColor: flColor.charcoal700 },
  elapsedText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze300 },

  posesHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 9, paddingHorizontal: 2 },
  posesLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  posesHint: { fontSize: 10, color: flColor.gray600 },
  poseChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  poseChip: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: flRadius.pill, borderWidth: 1 },
  poseChipOn: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorder },
  poseChipOff: { backgroundColor: 'transparent', borderColor: flColor.charcoal600 },
  poseChipText: { fontSize: 11.5, fontWeight: '600', color: flColor.gray400 },
  poseChipTextOn: { color: flColor.bronze300 },

  viewToggle: { flexDirection: 'row', gap: 8, marginTop: 18 },
  viewSeg: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: flRadius.pill, borderWidth: 1 },
  viewSegOn: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorder },
  viewSegOff: { backgroundColor: 'transparent', borderColor: flColor.charcoal600 },
  viewSegText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  viewSegTextOn: { color: flColor.bronze300 },
  rowStack: { gap: 16, marginTop: 16 },
  rowLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600, paddingHorizontal: 2, paddingBottom: 7 },
  alignBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 8, paddingVertical: 9, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  alignText: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze300 },
  pairRow: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1, minWidth: 0, position: 'relative' },
  cellSlot: { width: '100%', aspectRatio: 3 / 4, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.surfaceRecessed, alignItems: 'center', justifyContent: 'center' },
  cellImage: { width: '100%', height: '100%' },
  cellEmpty: { fontSize: 11, color: flColor.gray600 },
  dateChip: { position: 'absolute', top: 8, left: 8, paddingVertical: 3, paddingHorizontal: 8, borderRadius: flRadius.sm, backgroundColor: 'rgba(8,11,14,0.72)', borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, maxWidth: '80%' },
  dateChipText: { fontSize: 9.5, fontWeight: '600', color: flColor.bronze300 },

  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 22, paddingVertical: 14, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: '#3D2F1A' },
  shareText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3, color: flColor.bronze300 },

  pickerScroll: { maxHeight: 340 },
  pickerRow: { paddingVertical: 14, paddingHorizontal: 4 },
  pickerRowDiv: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  pickerName: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  pickerSub: { fontSize: 11.5, color: flColor.gray600, marginTop: 2 },
});
