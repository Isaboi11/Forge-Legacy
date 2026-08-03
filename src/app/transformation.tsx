import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourAnchor, useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { SCREEN_BG } from '@/constants/backgrounds';
import {
  deleteTransformationEntry,
  fetchTransformationEntries,
  getRemind,
  setRemind,
  XFORM_POSES,
  type Remind,
  type RemindFreq,
  type TransformationEntry,
} from '@/data/transformation-live';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';

/**
 * Transformation Gallery (L-17) — built to `Forge Transformation.dc.html`, wired to real storage. A
 * documentary progress-photo archive: intro thesis, a device-local capture reminder, chapter-grouped entry
 * cards in the design's 3-tier hierarchy (newest / emphasized / plain — the accent bar never stacks with the
 * newest gradient), the always-six-poses strip as a capture checklist, and long-press actions
 * (Compare-from-here / Edit / Delete, with a confirm the design omits). The dead in-file Share overlay is not
 * reproduced. Add / Edit / Compare / Entry Detail are their own routes.
 */

const FREQ_LABEL: Record<RemindFreq, string> = { weekly: 'weekly', biweekly: 'every two weeks', monthly: 'monthly' };
const FREQ_OPTS: [RemindFreq, string][] = [
  ['weekly', 'Weekly'],
  ['biweekly', 'Every 2 wks'],
  ['monthly', 'Monthly'],
];

export default function TransformationRoute() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data, refetch } = useQuery(fetchTransformationEntries, []);
  const { data: remind, refetch: refetchRemind } = useQuery(getRemind, []);

  const [actionEntry, setActionEntry] = useState<TransformationEntry | null>(null);
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();
  const compareRef = useTourAnchor('transformation-compare');
  const addRef = useTourAnchor('transformation-add');
  const [confirmDelete, setConfirmDelete] = useState<TransformationEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const entries = data ?? [];
  const newestId = entries[0]?.id ?? null;

  // Group by chapter in encounter order (chapters sort by their newest entry; entries stay newest-first).
  const groups: { name: string; entries: TransformationEntry[] }[] = [];
  const gi: Record<string, number> = {};
  for (const e of entries) {
    const key = e.chapterId ?? e.chapterName;
    if (gi[key] == null) {
      gi[key] = groups.length;
      groups.push({ name: e.chapterName, entries: [] });
    }
    groups[gi[key]].entries.push(e);
  }
  const summaryLine = `${entries.length} progress ${entries.length === 1 ? 'entry' : 'entries'} across ${groups.length} ${groups.length === 1 ? 'chapter' : 'chapters'}`;

  const r: Remind = remind ?? { enabled: false, freq: 'monthly' };
  const toggleRemind = () => {
    void setRemind({ ...r, enabled: !r.enabled }).then(refetchRemind);
  };
  const pickFreq = (f: RemindFreq) => {
    void setRemind({ ...r, freq: f }).then(refetchRemind);
  };

  const doDelete = () => {
    if (!confirmDelete || deleting) return;
    setDeleting(true);
    deleteTransformationEntry(confirmDelete.id).then(
      () => {
        setDeleting(false);
        setConfirmDelete(null);
        refetch();
      },
      (e: unknown) => {
        setDeleting(false);
        showToast(errorMessage(e));
      },
    );
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.34)' }} />
      <AppBar
        title={<Text style={styles.barTitle}>Transformation</Text>}
        onBack={() => router.back()}
        actions={
          <>
            <Pressable ref={compareRef} onPress={() => router.push('/transformation-compare')} accessibilityRole="button" accessibilityLabel="Compare" style={styles.barBtn} hitSlop={6}>
              <CompareGlyph />
            </Pressable>
            <Pressable ref={addRef} onPress={() => router.push('/transformation-add')} accessibilityRole="button" accessibilityLabel="Add progress set" style={styles.barBtn} hitSlop={6}>
              <PlusGlyph />
            </Pressable>
          </>
        }
      />

      <ScrollView
        ref={tourScroller}
        onScroll={onTourScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* intro */}
        <TourAnchor id="transformation-grid">
          <Text style={styles.introQ}>How have I changed?</Text>
        <Text style={styles.introThesis}>A documentary record, chapter by chapter. Not a comparison — a chronicle.</Text>
          <Text style={styles.introSummary}>{summaryLine}</Text>
        </TourAnchor>

        {/* reminder */}
        <View style={styles.remindRow}>
          <BellGlyph />
          <View style={styles.remindText}>
            <Text style={styles.remindTitle}>Capture reminder</Text>
            <Text style={styles.remindSub}>{r.enabled ? `On · ${FREQ_LABEL[r.freq]}` : 'Off'}</Text>
          </View>
          <Pressable onPress={toggleRemind} accessibilityRole="switch" accessibilityState={{ checked: r.enabled }} accessibilityLabel="Toggle capture reminder" style={[styles.switch, r.enabled ? styles.switchOn : styles.switchOff]}>
            <View style={[styles.knob, r.enabled ? styles.knobOn : styles.knobOff]} />
          </Pressable>
        </View>
        {r.enabled ? (
          <View style={styles.freqRow}>
            {FREQ_OPTS.map(([f, lbl]) => {
              const on = r.freq === f;
              return (
                <Pressable key={f} onPress={() => pickFreq(f)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.freqSeg, on ? styles.freqSegOn : styles.freqSegOff]}>
                  <Text style={[styles.freqSegText, on ? styles.freqSegTextOn : null]}>{lbl}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={{ height: 8 }} />

        {entries.length === 0 ? (
          <EmptyState onAdd={() => router.push('/transformation-add')} />
        ) : (
          <>
            {groups.map((g) => {
              const es = g.entries;
              const sub = es.length === 1 ? `Started ${es[0].label} · 1 entry` : `${es[es.length - 1].label} – ${es[0].label} · ${es.length} entries`;
              return (
                <View key={g.name} style={styles.chapterGroup}>
                  <View style={styles.chapterHead}>
                    <View style={styles.rivet} />
                    <View style={styles.chapterHeadText}>
                      <Text style={styles.chapterName}>{g.name}</Text>
                      <Text style={styles.chapterSub}>{sub}</Text>
                    </View>
                  </View>
                  <View style={styles.cardStack}>
                    {es.map((e) => (
                      <EntryCard
                        key={e.id}
                        entry={e}
                        isNewest={e.id === newestId}
                        onOpen={() => router.push({ pathname: '/transformation/[id]', params: { id: e.id } })}
                        onLongPress={() => setActionEntry(e)}
                      />
                    ))}
                  </View>
                </View>
              );
            })}

            <Pressable onPress={() => router.push('/transformation-add')} accessibilityRole="button" accessibilityLabel="Take progress pics" style={styles.cta}>
              <PlusGlyph size={16} />
              <Text style={styles.ctaText}>Take progress pics</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <ScreenTour screenKey="transformation" ready={entries.length > 0} />

      {/* long-press actions */}
      <BottomSheet open={!!actionEntry} onClose={() => setActionEntry(null)} title={actionEntry ? `${actionEntry.label} · ${actionEntry.chapterName}` : undefined}>
        <View style={styles.actionList}>
          <ActionRow
            icon={<CompareGlyph size={20} />}
            label="Compare from here"
            onPress={() => {
              const id = actionEntry?.id;
              setActionEntry(null);
              if (id) router.push({ pathname: '/transformation-compare', params: { b: id } });
            }}
          />
          <ActionRow
            icon={<PencilGlyph />}
            label="Edit entry"
            divided
            onPress={() => {
              const id = actionEntry?.id;
              setActionEntry(null);
              if (id) router.push({ pathname: '/transformation-add', params: { editId: id } });
            }}
          />
          <ActionRow
            icon={<TrashGlyph />}
            label="Delete"
            divided
            danger
            onPress={() => {
              const e = actionEntry;
              setActionEntry(null);
              setConfirmDelete(e);
            }}
          />
        </View>
      </BottomSheet>

      {/* delete confirm */}
      <Modal visible={!!confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Delete this entry?</Text>
            <Text style={styles.confirmBody}>Its photos and saved details will be permanently removed. It will no longer be available for comparisons. This can’t be undone.</Text>
            <View style={styles.confirmActions}>
              <Button variant="destructive" fullWidth disabled={deleting} onPress={doDelete} accessibilityLabel="Delete entry">
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
              <Button variant="secondary" fullWidth onPress={() => setConfirmDelete(null)} accessibilityLabel="Cancel">
                Cancel
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function EntryCard({ entry, isNewest, onOpen, onLongPress }: { entry: TransformationEntry; isNewest: boolean; onOpen: () => void; onLongPress: () => void }) {
  const isMilestone = entry.tags.includes('Milestone');
  const emph = !!entry.caption || !!entry.videoUrl || isMilestone;
  const accent = emph && !isNewest;
  return (
    <Pressable
      onPress={onOpen}
      onLongPress={onLongPress}
      delayLongPress={420}
      accessibilityRole="button"
      accessibilityLabel={`Open ${entry.label} entry`}
      style={[styles.card, isNewest ? styles.cardNewest : emph ? styles.cardEmph : styles.cardPlain]}
    >
      {isNewest ? (
        <View style={styles.newestWash} pointerEvents="none">
          <View style={styles.newestWashInner} />
        </View>
      ) : null}
      {accent ? <View style={styles.accentBar} pointerEvents="none" /> : null}

      <View style={styles.cardHead}>
        <Text style={styles.cardDate}>{entry.label}</Text>
        {entry.videoUrl ? (
          <View style={styles.videoPill}>
            <PlayGlyph size={9} color={flColor.gray400} />
            <Text style={styles.videoPillText}>Video</Text>
          </View>
        ) : null}
        {entry.tags.map((t) => {
          const em = t === 'Milestone';
          return (
            <View key={t} style={[styles.tagPill, em ? styles.tagPillEmph : null]}>
              <Text style={[styles.tagPillText, em ? styles.tagPillTextEmph : null]}>{em ? `◇ ${t}` : t}</Text>
            </View>
          );
        })}
      </View>

      {entry.meta ? (
        <View style={styles.metaWrap}>
          <Text style={styles.metaLine}>{entry.meta}</Text>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.poseStrip}>
        {XFORM_POSES.map((p) => (
          <View key={p.key} style={styles.poseSlotWrap}>
            <View style={styles.poseSlot}>{entry.photos[p.key] ? <Image source={{ uri: entry.photos[p.key] }} style={styles.poseSlotImage} contentFit="cover" /> : <CameraGlyph />}</View>
            <Text style={styles.poseSlotLabel}>{p.label}</Text>
          </View>
        ))}
      </ScrollView>

      {entry.caption ? (
        <View style={styles.captionWrap}>
          <Text style={styles.captionQuote}>“</Text>
          <Text style={styles.captionText}>{entry.caption}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyDisc}>
        <CameraGlyph size={34} />
      </View>
      <Text style={styles.emptyHeadline}>Start your record.</Text>
      <Text style={styles.emptyBody}>Progress photos, chapter by chapter — a documentary of how you change. Not a comparison, a chronicle.</Text>
      <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel="Take progress pics" style={styles.emptyCta}>
        <PlusGlyph size={16} />
        <Text style={styles.ctaText}>Take progress pics</Text>
      </Pressable>
    </View>
  );
}

function ActionRow({ icon, label, onPress, divided = false, danger = false }: { icon: React.ReactNode; label: string; onPress: () => void; divided?: boolean; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[styles.actionRow, divided ? styles.actionRowDivided : null]}>
      <View style={styles.actionIcon}>{icon}</View>
      <Text style={[styles.actionLabel, danger ? styles.actionLabelDanger : null]}>{label}</Text>
    </Pressable>
  );
}

// ── glyphs ──
function PlusGlyph({ size = 22, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function CompareGlyph({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 5h6v14H4zM14 5h6v14h-6z" />
    </Svg>
  );
}
function PlayGlyph({ size = 12, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5v14l11-7z" />
    </Svg>
  );
}
function BellGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </Svg>
  );
}
function CameraGlyph({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.5}>
      <Path d="M4 7h3.4l1.2-2h6.8L16.6 7H20v12H4z" />
      <Circle cx={12} cy={13} r={3.1} />
    </Svg>
  );
}
function PencilGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L5 17.2z" />
      <Path d="M13.5 6.5l4 4" />
    </Svg>
  );
}
function TrashGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={flColor.redMuted} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 7h16" />
      <Path d="M9 7V5h6v2" />
      <Path d="M6.5 7l1 13h9l1-13" />
      <Path d="M10 11v6M14 11v6" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  barTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: flColor.cream100 },
  barBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round },
  scroll: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 36 },

  introQ: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 16, lineHeight: 24, color: flColor.bronze300, marginBottom: 6 },
  introThesis: { fontSize: 12.5, lineHeight: 19, color: flColor.gray600, marginBottom: 8 },
  introSummary: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, color: flColor.bronze400, marginBottom: 18 },

  remindRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal700 },
  remindText: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  remindTitle: { fontSize: 12, fontWeight: '600', color: flColor.gray400 },
  remindSub: { fontSize: 10.5, color: flColor.gray600 },
  switch: { width: 38, height: 22, borderRadius: flRadius.pill, borderWidth: 1, justifyContent: 'center' },
  switchOn: { backgroundColor: flColor.bronze400, borderColor: flColor.bronzeBorder },
  switchOff: { backgroundColor: flColor.charcoal800, borderColor: flColor.charcoal600 },
  knob: { position: 'absolute', width: 16, height: 16, borderRadius: 8 },
  knobOn: { left: 18, backgroundColor: '#1A1206' },
  knobOff: { left: 2, backgroundColor: flColor.charcoal500 },
  freqRow: { flexDirection: 'row', gap: 6, paddingVertical: 8, paddingHorizontal: 2 },
  freqSeg: { flex: 1, paddingVertical: 8, borderRadius: flRadius.md, borderWidth: 1, borderColor: 'transparent', alignItems: 'center' },
  freqSegOn: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorder },
  freqSegOff: { backgroundColor: flColor.charcoal800 },
  freqSegText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: flColor.gray600 },
  freqSegTextOn: { color: flColor.bronze300 },

  chapterGroup: { marginBottom: 28 },
  chapterHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingHorizontal: 2, paddingBottom: 14 },
  rivet: { width: 7, height: 7, marginTop: 6, transform: [{ rotate: '45deg' }], borderWidth: 1, borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint },
  chapterHeadText: { flex: 1, minWidth: 0, gap: 3 },
  chapterName: { fontFamily: flFont.display, fontSize: 17, fontWeight: '600', letterSpacing: -0.1, color: flColor.cream100, lineHeight: 18 },
  chapterSub: { fontSize: 10.5, fontWeight: '500', letterSpacing: 0.4, color: flColor.gray600 },
  cardStack: { gap: 14 },

  card: { position: 'relative', borderRadius: flRadius.xl, overflow: 'hidden', boxShadow: flShadow.borderInset },
  cardNewest: { borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.charcoal800 },
  cardEmph: { borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.charcoal800 },
  cardPlain: { borderWidth: 1, borderColor: flColor.charcoal700, backgroundColor: flColor.charcoal800 },
  newestWash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  newestWashInner: { position: 'absolute', top: 0, left: 0, right: 0, height: '42%', backgroundColor: 'rgba(186, 134, 84,0.06)' },
  accentBar: { position: 'absolute', left: 0, top: 14, bottom: 14, width: 2, borderRadius: 2, backgroundColor: flColor.bronze400 },

  cardHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingTop: 13, paddingHorizontal: 15, paddingBottom: 10 },
  cardDate: { fontFamily: flFont.display, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  videoPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 7, borderRadius: flRadius.sm, borderWidth: 1, borderColor: flColor.charcoal600 },
  videoPillText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray400 },
  tagPill: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: flRadius.sm, borderWidth: 1, borderColor: flColor.charcoal600 },
  tagPillEmph: { borderColor: flColor.bronzeBorderSubtle },
  tagPillText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600 },
  tagPillTextEmph: { color: flColor.bronze300 },

  metaWrap: { paddingHorizontal: 15, paddingBottom: 10 },
  metaLine: { fontSize: 10.5, letterSpacing: 0.2, color: flColor.gray600 },

  poseStrip: { gap: 8, paddingHorizontal: 15, paddingBottom: 14, paddingTop: 2 },
  poseSlotWrap: { alignItems: 'center', gap: 6 },
  poseSlot: { width: 76, height: 100, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.surfaceRecessed, alignItems: 'center', justifyContent: 'center' },
  poseSlotImage: { width: '100%', height: '100%' },
  poseSlotLabel: { fontSize: 8.5, fontWeight: '600', letterSpacing: 0.4, color: flColor.gray600 },

  captionWrap: { flexDirection: 'row', gap: 9, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 22 },
  captionQuote: { fontFamily: flFont.display, fontSize: 26, fontWeight: '700', lineHeight: 18, color: flColor.bronze400 },
  captionText: { flex: 1, fontFamily: flFont.display, fontStyle: 'italic', fontSize: 13.5, lineHeight: 21, color: flColor.gray400, paddingTop: 2 },

  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 16, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorder, borderStyle: 'dashed', backgroundColor: flColor.bronzeTint },
  ctaText: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },

  emptyWrap: { alignItems: 'center', paddingTop: 24, paddingHorizontal: 10 },
  emptyDisc: {
    width: 78,
    height: 78,
    borderRadius: flRadius.round,
    overflow: 'hidden',
    backgroundColor: '#1b130b',
    borderWidth: 1.5,
    borderColor: flColor.bronze400,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 0 1px rgba(201, 151, 103,0.25), 0 0 22px rgba(186, 134, 84,0.42), inset 0 0 28px rgba(0,0,0,0.6)',
  },
  emptyHeadline: { marginTop: 22, fontFamily: flFont.display, fontSize: 22, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { marginTop: 12, textAlign: 'center', fontSize: 13.5, lineHeight: 21, color: flColor.gray400, maxWidth: 280 },
  emptyCta: { marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 15, paddingHorizontal: 26, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.bronzeBorder, borderStyle: 'dashed', backgroundColor: flColor.bronzeTint },

  actionList: { marginHorizontal: -6 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 8 },
  actionRowDivided: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  actionIcon: { flexShrink: 0 },
  actionLabel: { fontSize: 15, color: flColor.cream100 },
  actionLabelDanger: { color: flColor.redMuted },

  confirmBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: flColor.overlayDark },
  confirmCard: { width: '100%', maxWidth: 320, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal500, borderRadius: flRadius.xl, padding: 24, boxShadow: flShadow.ambient },
  confirmTitle: { fontFamily: flFont.display, fontSize: 20, fontWeight: '700', color: flColor.cream100 },
  confirmBody: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, marginTop: 10 },
  confirmActions: { gap: 10, marginTop: 22 },
});
