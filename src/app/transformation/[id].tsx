import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { ScreenBackground } from '@/components/screen-background';
import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { SCREEN_BG } from '@/constants/backgrounds';
import { deleteTransformationEntry, fetchTransformationEntries, filledPoses, type PoseKey } from '@/data/transformation-live';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { themeScrim } from '@/constants/theme-scrim';

/**
 * Transformation Entry Detail — built to `Forge Transformation Entry Detail.dc.html`, wired to real data.
 * Identity (date · capture type · chapter · context · tags), a media viewer (hero 3:4 + thumbnail strip of
 * the filled poses + video), the reflection, Earlier/Later sibling nav, Compare/Share actions, and an
 * overflow Edit/Delete with a confirm. Share opens Progress Photo Post; Compare opens the comparison
 * builder, which still ends at Share Configuration.
 */

type Sel = PoseKey | 'video';

export default function TransformationEntryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const entryId = String(id ?? '');
  const { data, loading, refetch } = useQuery(fetchTransformationEntries, []);

  const [sel, setSel] = useState<Sel | null>(null);
  /**
   * How the entry's media is laid out.
   *
   * PO, 2026-09-01: *"when I click on a transformation card I should be able to just view it in
   * different ways. Like a grid style if I want too."*
   *
   * The screen only ever had ONE answer: a 3:4 hero with a thumbnail strip to choose what goes in it.
   * That is the right default — a progress photo is worth looking at large — and it is the wrong thing
   * when the question is *"what did I capture that day?"*, because answering it means tapping through
   * six thumbnails one at a time and holding the last one in your head. `grid` puts the whole capture
   * on screen at once. Tapping any tile drops back into `single` on that pose, so the grid is also the
   * fastest way to reach a particular one.
   *
   * Not persisted: it is a way of looking at THIS entry, not a setting. Compare's own Side-by-side /
   * Slider toggle behaves the same way, and this reuses its shape so the two read as one control.
   */
  const [layout, setLayout] = useState<'single' | 'grid'>('single');
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const entries = data ?? [];
  const idx = entries.findIndex((e) => e.id === entryId);
  const entry = idx >= 0 ? entries[idx] : null;

  if (loading && !data) {
    return (
      <View style={styles.root}>
        <DetailBg />
        <TopBar onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </View>
    );
  }
  if (!entry) {
    return (
      <View style={styles.root}>
        <DetailBg />
        <TopBar onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.missingBody}>This entry is no longer available.</Text>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back to gallery" style={styles.backBtn}>
            <Text style={styles.backText}>Back to gallery</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const photoPoses = filledPoses(entry);
  const options: { key: Sel; label: string; short: string; isVideo?: boolean }[] = [...photoPoses.map((p) => ({ key: p.key as Sel, label: p.label, short: p.short }))];
  if (entry.videoUrl) options.push({ key: 'video', label: 'Video', short: 'Video', isVideo: true });
  const hasMedia = options.length > 0;
  const active: Sel | null = sel && options.some((o) => o.key === sel) ? sel : options[0]?.key ?? null;
  const activeOpt = options.find((o) => o.key === active) ?? null;

  let captureType = photoPoses.length >= 2 ? `${photoPoses.length}-pose check-in` : photoPoses.length === 1 ? photoPoses[0].label : entry.videoUrl ? 'Video capture' : '';
  if (photoPoses.length >= 1 && entry.videoUrl) captureType += ' · video';

  const older = idx >= 0 && idx < entries.length - 1 ? entries[idx + 1] : null;
  const newer = idx > 0 ? entries[idx - 1] : null;

  const doDelete = () => {
    if (deleting) return;
    setDeleting(true);
    deleteTransformationEntry(entry.id).then(
      () => router.back(),
      (e: unknown) => {
        setDeleting(false);
        showToast(errorMessage(e));
      },
    );
  };

  return (
    <View style={styles.root}>
      <DetailBg />
      <TopBar onBack={() => router.back()} onOverflow={() => setOverflowOpen(true)} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* identity */}
        <Text style={styles.eyebrow}>Captured</Text>
        <Text style={styles.date}>{entry.label}</Text>
        {captureType ? <Text style={styles.captureType}>{captureType}</Text> : null}
        <Text style={styles.chapterLabel}>Chapter · {entry.chapterName}</Text>
        {entry.meta ? <Text style={styles.metaLine}>{entry.meta}</Text> : null}
        {entry.tags.length ? (
          <View style={styles.tagRow}>
            {entry.tags.map((t) => (
              <View key={t} style={styles.tagPill}>
                <Text style={styles.tagPillText}>{t}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* ⚠ OFFERED ONLY WHERE IT MEANS SOMETHING. A grid of one tile is the hero with extra steps, so
            a single-pose entry keeps the layout it has and never draws a chooser that changes nothing. */}
        {hasMedia && options.length > 1 ? (
          <View style={styles.layoutToggle}>
            {(['single', 'grid'] as const).map((v) => (
              <Pressable
                key={v}
                onPress={() => setLayout(v)}
                accessibilityRole="button"
                accessibilityState={{ selected: layout === v }}
                accessibilityLabel={v === 'single' ? 'View one pose at a time' : 'View every pose at once'}
                style={[styles.layoutSeg, layout === v ? styles.layoutSegOn : styles.layoutSegOff]}
              >
                <Text style={[styles.layoutSegText, layout === v ? styles.layoutSegTextOn : null]}>
                  {v === 'single' ? 'One at a time' : 'Grid'}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* media viewer */}
        <View style={styles.mediaWrap}>
          {hasMedia ? (
            layout === 'grid' ? (
              /* Every pose in the capture, at once. Tapping one is the fastest way back to the hero. */
              <View style={styles.grid}>
                {options.map((o) => (
                  <Pressable
                    key={o.key}
                    onPress={() => {
                      setSel(o.key);
                      setLayout('single');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${o.label} — open large`}
                    style={styles.gridCell}
                  >
                    <View style={styles.gridTile}>
                      {o.isVideo ? <PlayGlyph size={22} /> : o.key !== 'video' && entry.photos[o.key] ? <Image source={{ uri: entry.photos[o.key] }} style={styles.gridImage} contentFit="cover" /> : null}
                    </View>
                    <Text style={styles.gridLabel} numberOfLines={1}>
                      {o.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <>
                <View style={styles.hero}>
                  {activeOpt?.isVideo && entry.videoUrl ? <VideoBlock uri={entry.videoUrl} /> : active && active !== 'video' && entry.photos[active] ? <Image source={{ uri: entry.photos[active] }} style={styles.heroImage} contentFit="cover" /> : null}
                </View>
                {options.length > 1 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbStrip}>
                    {options.map((o) => {
                      const on = o.key === active;
                      return (
                        <Pressable key={o.key} onPress={() => setSel(o.key)} accessibilityRole="button" accessibilityLabel={o.label} style={styles.thumbBtn}>
                          <View style={[styles.thumb, { borderColor: on ? flColor.bronze400 : flColor.charcoal600 }]}>
                            {o.isVideo ? <PlayGlyph size={16} /> : o.key !== 'video' && entry.photos[o.key] ? <Image source={{ uri: entry.photos[o.key] }} style={styles.thumbImage} contentFit="cover" /> : null}
                          </View>
                          <Text style={[styles.thumbLabel, on ? styles.thumbLabelOn : null]}>{o.short}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : null}
              </>
            )
          ) : (
            <View style={styles.noMedia}>
              <CameraGlyph />
              <Text style={styles.noMediaText}>No photos saved for this entry</Text>
            </View>
          )}
        </View>

        {/* Names what is in the hero. In the grid every tile carries its own label, so this row would be
            saying which pose is "selected" while six of them are on screen. */}
        {activeOpt && layout === 'single' ? (
          <View style={styles.viewRow}>
            <Text style={styles.viewLabel}>View</Text>
            <Text style={styles.viewValue}>{activeOpt.label}</Text>
          </View>
        ) : null}

        {entry.caption ? (
          <View style={styles.reflSection}>
            <Text style={styles.reflLabel}>Reflection</Text>
            <Text style={styles.reflText}>“{entry.caption}”</Text>
          </View>
        ) : null}

        {older || newer ? (
          <View style={styles.siblings}>
            {older ? (
              <Pressable onPress={() => router.push({ pathname: '/transformation/[id]', params: { id: older.id } })} accessibilityRole="button" accessibilityLabel={`Earlier · ${older.label}`} style={styles.sibBtn}>
                <EngravedIcon name="chevron-left" size={15} color={flColor.gray400} />
                <Text style={styles.sibText}>Earlier · {older.label}</Text>
              </Pressable>
            ) : (
              <View />
            )}
            {newer ? (
              <Pressable onPress={() => router.push({ pathname: '/transformation/[id]', params: { id: newer.id } })} accessibilityRole="button" accessibilityLabel={`Later · ${newer.label}`} style={styles.sibBtn}>
                <Text style={styles.sibText}>Later · {newer.label}</Text>
                <EngravedIcon name="chevron-right" size={15} color={flColor.gray400} />
              </Pressable>
            ) : (
              <View />
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* actions */}
      <View style={styles.footer}>
        <Pressable onPress={() => router.push({ pathname: '/transformation-compare', params: { b: entry.id } })} accessibilityRole="button" accessibilityLabel="Compare" style={styles.compareBtn}>
          <EngravedIcon name="compare" size={16} color="#F7F5F1" />
          <Text style={styles.compareText}>Compare</Text>
        </Pressable>
        {/*
          SHARE OPENS THE PROGRESS PHOTO COMPOSER, not Share Configuration (handoff §19). A capture goes
          out as a card the athlete laid out — format, style, which poses, what is printed on it — rather
          than as one long vertical strip with no say in it.

          COMPARE IS UNCHANGED and still reaches Share Configuration through `/transformation-compare`.
          The two flows merge in a later pass; until then a then/now has a screen that understands it and
          a single capture has one that understands the capture.
        */}
        <Pressable
          onPress={() => router.push({ pathname: '/progress-photo-post', params: { origin: 'transformation', entryId: entry.id } })}
          accessibilityRole="button"
          accessibilityLabel="Share"
          style={styles.shareBtn}
        >
          <EngravedIcon name="share" size={18} color={flColor.gray400} />
        </Pressable>
      </View>

      {/* overflow */}
      <BottomSheet open={overflowOpen} onClose={() => setOverflowOpen(false)}>
        <View style={styles.actionList}>
          <Pressable
            onPress={() => {
              setOverflowOpen(false);
              router.push({ pathname: '/transformation-add', params: { editId: entry.id } });
            }}
            accessibilityRole="button"
            accessibilityLabel="Edit entry"
            style={styles.actionRow}
          >
            <EngravedIcon name="edit" size={18} />
            <Text style={styles.actionLabel}>Edit entry</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setOverflowOpen(false);
              setConfirmDelete(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Delete entry"
            style={[styles.actionRow, styles.actionRowDivided]}
          >
            <EngravedIcon name="trash" size={18} color={flColor.redMuted} />
            <Text style={[styles.actionLabel, styles.actionLabelDanger]}>Delete entry</Text>
          </Pressable>
        </View>
      </BottomSheet>

      {/* delete confirm */}
      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Delete this entry?</Text>
            <Text style={styles.confirmBody}>Its photos and saved details will be permanently removed. It will no longer be available for comparisons. This can’t be undone.</Text>
            <View style={styles.confirmActions}>
              <Button variant="destructive" fullWidth disabled={deleting} onPress={doDelete} accessibilityLabel="Delete entry">
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
              <Button variant="secondary" fullWidth onPress={() => setConfirmDelete(false)} accessibilityLabel="Cancel">
                Cancel
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailBg() {
  return <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(6,7,8,0.34)' }} />;
}

function VideoBlock({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return <VideoView player={player} style={styles.heroVideo} nativeControls contentFit="contain" />;
}

/* ⚠ NO SAFE-AREA INSET — see the note on `transformation-compare`'s TopBar. All three Transformation
   screens hand-roll this bar and all three put it under the Dynamic Island. Same fix, same numbers as
   the shared `AppBar`. */
function TopBar({ onBack, onOverflow }: { onBack: () => void; onOverflow?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.topBtn} hitSlop={6}>
        <EngravedIcon name="chevron-left" size={22} color={flColor.gray400} />
      </Pressable>
      <Text style={styles.topTitle}>Transformation Entry</Text>
      {onOverflow ? (
        <Pressable onPress={onOverflow} accessibilityRole="button" accessibilityLabel="Entry options" style={styles.topBtn} hitSlop={6}>
          <EngravedIcon name="more" size={20} color={flColor.gray400} />
        </Pressable>
      ) : (
        <View style={styles.topBtn} />
      )}
    </View>
  );
}

function PlayGlyph({ size = 16 }: { size?: number }) {
  return <EngravedIcon name="play" size={size} />;
}
function CameraGlyph() {
  return <EngravedIcon name="camera" size={26} color={flColor.gray600} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 40 },
  missingBody: { fontSize: 14.5, lineHeight: 22, color: flColor.gray400, textAlign: 'center' },
  backBtn: { paddingVertical: 12, paddingHorizontal: 22, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  backText: { fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },
  scroll: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 24 },

  topBar: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  topBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, fontSize: 11, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: flColor.gray400 },

  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: flColor.bronze400 },
  date: { marginTop: 6, fontFamily: flFont.display, fontSize: 30, fontWeight: '700', letterSpacing: -0.3, lineHeight: 32, color: flColor.cream100 },
  captureType: { marginTop: 8, fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },
  chapterLabel: { marginTop: 5, fontSize: 13, fontWeight: '600', color: flColor.bronze400 },
  metaLine: { marginTop: 6, fontSize: 12.5, color: flColor.gray600 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 11 },
  tagPill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.bronzeTint },
  tagPillText: { fontSize: 10.5, fontWeight: '600', color: flColor.bronze400 },

  /* The same segmented shape Compare uses for Side by side / Slider, so the two read as one control. */
  layoutToggle: { flexDirection: 'row', gap: 8, marginTop: 22 },
  layoutSeg: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: flRadius.pill, borderWidth: 1 },
  layoutSegOn: { backgroundColor: flColor.bronzeTint, borderColor: flColor.bronzeBorder },
  layoutSegOff: { backgroundColor: 'transparent', borderColor: flColor.charcoal600 },
  layoutSegText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  layoutSegTextOn: { color: flColor.bronze300 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  /* Two columns. `flexBasis` rather than a measured width — the screen's gutter is the only thing that
     decides this, and a percentage follows it without the component knowing the number. */
  gridCell: { flexBasis: '48.5%', gap: 6 },
  gridTile: { width: '100%', aspectRatio: 3 / 4, borderRadius: flRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.surfaceRecessed, alignItems: 'center', justifyContent: 'center' },
  gridImage: { width: '100%', height: '100%' },
  gridLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.4, color: flColor.gray400, textAlign: 'center' },

  mediaWrap: { marginTop: 20 },
  hero: { width: '100%', aspectRatio: 3 / 4, borderRadius: flRadius.xl, overflow: 'hidden', borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: flColor.surfaceRecessed, boxShadow: `${flShadow.borderInset}, ${flShadow.card}` },
  heroImage: { width: '100%', height: '100%' },
  heroVideo: { width: '100%', height: '100%', backgroundColor: '#000' },
  thumbStrip: { gap: 8, paddingTop: 12, paddingBottom: 2 },
  thumbBtn: { width: 60, alignItems: 'center', gap: 5 },
  thumb: { width: 60, height: 76, borderRadius: flRadius.md, overflow: 'hidden', borderWidth: 1.5, backgroundColor: flColor.surfaceRecessed, alignItems: 'center', justifyContent: 'center' },
  thumbImage: { width: '100%', height: '100%' },
  thumbLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.4, color: flColor.gray600 },
  thumbLabelOn: { color: flColor.bronze300 },
  noMedia: { width: '100%', height: 172, borderRadius: flRadius.xl, borderWidth: 1, borderColor: flColor.charcoal500, borderStyle: 'dashed', backgroundColor: flColor.surfaceRecessed, alignItems: 'center', justifyContent: 'center', gap: 10 },
  noMediaText: { fontSize: 12.5, color: flColor.gray600 },

  viewRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginTop: 22 },
  viewLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600 },
  viewValue: { fontSize: 13.5, fontWeight: '600', color: flColor.cream100 },

  reflSection: { marginTop: 22, paddingTop: 20, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  reflLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400, marginBottom: 10 },
  reflText: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 17.5, lineHeight: 28, color: flColor.gray400 },

  siblings: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 24, paddingTop: 18, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  sibBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 6 },
  sibText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },

  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 16, borderTopWidth: 1, borderTopColor: flColor.charcoal700, backgroundColor: themeScrim('rgba(6,7,8,0.6)') },
  compareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 15, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: '#3D2F1A', boxShadow: flShadow.card },
  compareText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5, color: '#F7F5F1' },
  shareBtn: { width: 66, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },

  actionList: { marginHorizontal: -6 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 8 },
  actionRowDivided: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  actionLabel: { fontSize: 15, color: flColor.cream100 },
  actionLabelDanger: { color: flColor.redMuted },

  confirmBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: flColor.overlayDark },
  confirmCard: { width: '100%', maxWidth: 320, backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.charcoal500, borderRadius: flRadius.xl, padding: 24, boxShadow: flShadow.ambient },
  confirmTitle: { fontFamily: flFont.display, fontSize: 20, fontWeight: '700', color: flColor.cream100 },
  confirmBody: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, marginTop: 10 },
  confirmActions: { gap: 10, marginTop: 22 },
});
