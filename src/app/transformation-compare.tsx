import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BeforeAfterSlider } from '@/components/forge/BeforeAfterSlider';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import {
  elapsedBetween,
  fetchTransformationEntries,
  saveTransformationFrames,
  XFORM_POSES,
  type FrameMap,
  type PhotoFrame,
  type PoseKey,
  type TransformationEntry,
} from '@/data/transformation-live';
import { ADJUST_TOUCH_STYLE, useFrameAdjust } from '@/hooks/useFrameAdjust';
import { useQuery } from '@/lib/useQuery';
import { flColor, flFont, flRadius } from '@/constants/foundation';

/**
 * Compare (Transformation) — built to the Compare overlay of `Forge Transformation.dc.html`. Two entries,
 * A/B defaulting to the maximum span (oldest ↔ newest), the real calendar elapsed-math, and multi-pose
 * before/after rows with per-photo date chips. Nothing is scored — only the two photos and the time between.
 *
 * ══ ⚠ LINING THEM UP HAPPENS HERE NOW, AND IT IS KEPT ══
 *
 * PO, 2026-09-08: *"It would be easier to adjust the photos like this somehow. You see how I can see them
 * lining up?"* — said while looking at the slider, where the two bodies meet at the seam.
 *
 * Two things were wrong, and the second was the worse one.
 *
 * **1. The tool was somewhere else.** `Align photos` opened a full-screen modal with a Before/After
 * segmented control and a zoom slider — three decisions to move one picture, taken away from the
 * comparison that was the whole reason to move it. It is a mode on this screen now: drag the photograph you
 * want to move, pinch to size it, watching the seam. `useFrameAdjust` holds the gesture; the modal is gone.
 *
 * **2. ⚠ THE WORK WAS THROWN AWAY.** The alignment lived in a `useState` on this screen. Line two
 * photographs up, leave, come back — and do it again, every time, forever. It is stored per photo on the
 * entry now (`frames`, migration 0197), so a photograph is lined up ONCE and every comparison it appears in
 * inherits it. `edits` below is only the not-yet-refetched half of that, so the screen does not wait on a
 * round trip to show the drag that just happened.
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
  /** Framings committed this session, keyed by entry id. Layered over what the entry was fetched with. */
  const [edits, setEdits] = useState<Record<string, FrameMap>>({});
  const [adjusting, setAdjusting] = useState(false);
  const [view, setView] = useState<'sidebyside' | 'slider'>('sidebyside');

  const aEff = aId ?? entries[entries.length - 1]?.id ?? null;
  const bEff = bId ?? (b ? String(b) : entries[0]?.id ?? null);
  const aEntry = entries.find((e) => e.id === aEff) ?? null;
  const bEntry = entries.find((e) => e.id === bEff) ?? null;

  const elapsed = aEntry && bEntry && aEff !== bEff ? elapsedBetween(aEntry.label, bEntry.label) : '';

  const framesFor = (e: TransformationEntry | null): FrameMap => (e ? { ...e.frames, ...edits[e.id] } : {});
  const aFrames = framesFor(aEntry);
  const bFrames = framesFor(bEntry);

  /**
   * ⚠ THE WHOLE MAP GOES TO THE SERVER, because `frames` is one jsonb column and a partial write would
   * drop the other five poses. `null` clears one pose rather than storing an identity nobody asked for.
   */
  const putFrame = (entry: TransformationEntry | null, pose: PoseKey, frame: PhotoFrame | null) => {
    if (!entry) return;
    const next: FrameMap = { ...entry.frames, ...edits[entry.id] };
    if (frame) next[pose] = frame;
    else delete next[pose];
    setEdits((cur) => ({ ...cur, [entry.id]: next }));
    void saveTransformationFrames(entry.id, next);
  };

  const resetPose = (pose: PoseKey) => {
    putFrame(aEntry, pose, null);
    putFrame(bEntry, pose, null);
  };

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
      {/* ⚠ THE PAGE MUST NOT SCROLL UNDER AN ADJUSTING FINGER. A drag on a photograph is vertical as often
          as it is horizontal, and the responder claims it — but the scroller is the outer view and would
          still take the gesture on some paths. Off is the honest answer for a mode you leave. */}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} scrollEnabled={!adjusting}>
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

        {/* A mode, not a view — so it sits on its own line rather than beside Side by side / Slider, both
            of which stay live while you adjust. */}
        <Pressable
          onPress={() => setAdjusting((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ selected: adjusting }}
          accessibilityLabel={adjusting ? 'Finish adjusting' : 'Adjust photos'}
          style={[styles.adjustBtn, adjusting ? styles.adjustBtnOn : styles.adjustBtnOff]}
        >
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={adjusting ? flColor.bronze300 : flColor.gray400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 9l-3 3 3 3M19 9l3 3-3 3M9 5l3-3 3 3M9 19l3 3 3-3M12 4v16M4 12h16" />
          </Svg>
          <Text style={[styles.adjustText, adjusting ? styles.adjustTextOn : null]}>{adjusting ? 'Done adjusting' : 'Adjust photos'}</Text>
        </Pressable>
        {adjusting ? (
          <Text style={styles.adjustHint}>
            {view === 'slider' ? 'Drag either side of the line to move that photo. Pinch to resize.' : 'Drag a photo to move it. Pinch to resize.'}
          </Text>
        ) : null}

        <View style={styles.rowStack}>
          {rows.map((p) => {
            const aUrl = aEntry?.photos[p.key];
            const bUrl = bEntry?.photos[p.key];
            const both = !!(aUrl && bUrl);
            return (
              /* ⚠ THE ENTRY IDS ARE IN THE KEY ON PURPOSE. `useFrameAdjust` seeds its shared values once,
                 at mount — it cannot be synced from a prop later without tripping the immutability rule
                 and fighting a live gesture besides. Swapping which capture is being compared therefore
                 has to produce a NEW row, or the framing of the photograph that just left would be applied
                 to the one that replaced it. */
              <View key={`${aEff ?? 'a'}:${bEff ?? 'b'}:${p.key}`}>
                <Text style={styles.rowLabel}>{p.label}</Text>
                {both && view === 'slider' ? (
                  <BeforeAfterSlider
                    before={aUrl!}
                    after={bUrl!}
                    beforeLabel={aEntry?.label}
                    afterLabel={bEntry?.label}
                    beforeT={aFrames[p.key]}
                    afterT={bFrames[p.key]}
                    adjust={adjusting}
                    onAdjust={(side, frame) => putFrame(side === 'before' ? aEntry : bEntry, p.key, frame)}
                  />
                ) : (
                  <View style={styles.pairRow}>
                    <CompareCell url={aUrl} dateLabel={aEntry?.label ?? 'A'} frame={aFrames[p.key]} adjust={adjusting} onAdjust={(f) => putFrame(aEntry, p.key, f)} />
                    <CompareCell url={bUrl} dateLabel={bEntry?.label ?? 'B'} frame={bFrames[p.key]} adjust={adjusting} onAdjust={(f) => putFrame(bEntry, p.key, f)} />
                  </View>
                )}
                {adjusting && both && (aFrames[p.key] || bFrames[p.key]) ? (
                  <Pressable onPress={() => resetPose(p.key)} accessibilityRole="button" accessibilityLabel={`Reset ${p.label}`} style={styles.resetBtn}>
                    <Text style={styles.resetText}>Reset {p.label}</Text>
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
                then: { url: aEntry!.photos[p.key]!, transform: aFrames[p.key] },
                now: { url: bEntry!.photos[p.key]!, transform: bFrames[p.key] },
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

/** One half of the side-by-side view. Adjusting drags this photograph on its own — there is no seam here
 *  to line up against, so the pair of them is the reference. */
function CompareCell({ url, dateLabel, frame, adjust, onAdjust }: { url?: string; dateLabel: string; frame?: PhotoFrame; adjust?: boolean; onAdjust?: (frame: PhotoFrame) => void }) {
  const [w, setW] = useState(0);
  const h = (w * 4) / 3;
  const adjuster = useFrameAdjust({
    frames: [frame],
    width: w,
    height: h,
    enabled: !!adjust && !!url,
    onCommit: (_slot, f) => onAdjust?.(f),
  });
  return (
    <View style={styles.cell}>
      <View
        style={[styles.cellSlot, adjust ? ADJUST_TOUCH_STYLE : null]}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        {...(adjust && url ? adjuster.panHandlers : null)}
      >
        {url ? (
          <Animated.View style={[styles.cellImage, adjuster.styles[0]]}>
            <Image source={{ uri: url }} style={styles.cellImage} contentFit="cover" />
          </Animated.View>
        ) : (
          <Text style={styles.cellEmpty}>No photo</Text>
        )}
      </View>
      <View style={styles.dateChip} pointerEvents="none">
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

  adjustBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10, paddingVertical: 10, borderRadius: flRadius.md, borderWidth: 1 },
  adjustBtnOn: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorder },
  adjustBtnOff: { backgroundColor: flColor.charcoal800, borderColor: flColor.charcoal600 },
  adjustText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  adjustTextOn: { color: flColor.bronze300 },
  adjustHint: { fontSize: 11.5, lineHeight: 17, color: flColor.gray600, textAlign: 'center', marginTop: 8 },

  rowStack: { gap: 16, marginTop: 16 },
  rowLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600, paddingHorizontal: 2, paddingBottom: 7 },
  resetBtn: { alignSelf: 'center', marginTop: 8, paddingVertical: 6, paddingHorizontal: 12 },
  resetText: { fontSize: 12, fontWeight: '600', color: flColor.gray400 },
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
