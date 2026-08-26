import { useEffect, useMemo, useState } from 'react';
import { Animated, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { useSheetDrag } from '@/hooks/useSheetDrag';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { useTour } from '@/hooks/useTour';
import { claimEarnedHonors, fetchHonorsHub, type HubHonor } from '@/data/honors-live';
import { HonorMedallion } from '@/components/honor/HonorMedallion';
import { HonorGlyph } from '@/components/honor/HonorGlyph';

/**
 * L-10 Honors Hub + L-11 Honor Detail Sheet — built to `Forge Honors Hub.dc.html` (Design b029488a).
 * A pushed full-screen surface: app bar (back · "Honors" · count), a Recent strip of the newest honors,
 * then earned honors grouped by their canonical category (map order), each a forged medallion. Tapping one
 * opens the L-11 bottom sheet (medallion · category · name · earned date · trigger · Share).
 *
 * Data is LIVE. Earned rows come from `honor_instances`; category, ladder position and the earn condition
 * are joined from `honor_catalog` (migration 0077) — which replaced a 14-entry hardcoded code catalog that
 * had gone stale against a database holding 131. Anything the app can grant now renders here, without a
 * second list to keep in step.
 *
 * THE EARN CONDITION IS DERIVED, NOT STORED. The design ships a hand-written `trigger` sentence per honor.
 * Prose drifts from the rule it describes — a threshold moves, the sentence doesn't — and across 131 honors
 * nobody would catch it. `triggerText()` builds the sentence from the same metric and threshold the
 * evaluator tests, so a description can only be wrong if the rule is.
 *
 * TWO DESIGN GAPS CLOSED:
 *   · The detail sheet's one info row was "Category" — the same word already printed as the eyebrow
 *     directly above it. It now carries the earn condition and the honor's position in its own ladder
 *     ("Tier 2 of 4"), which is what an athlete looking at a bench milestone actually wants to know.
 *   · The Recent strip dropped the year, so honors three years apart both read "Jan 20". It keeps the year
 *     whenever the visible honors span more than one.
 *
 * Reached from the ceremony's "View Honor" and Legacy → Honors → "View all". Share is a "coming soon"
 * toast, matching the design.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
/** Compact tile date — month + day, no year (the design's `shortDate`); the sheet keeps the full date. */
function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return !y || !m || !d ? iso : `${MONTHS[m - 1]} ${d}`;
}

export default function HonorsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { resumeTour } = useTour();
  /**
   * Claim anything already earned before reading. Honors evaluate on workout save, so a threshold added to
   * the catalog after this athlete passed it would sit unawarded until they happened to train again —
   * you'd earn "100 Workouts Logged" by logging your 101st. Silent and idempotent, so opening this screen
   * is safe to repeat and never back-dates a timeline event.
   */
  const { data: hub, error, refetch } = useQuery(
    () => claimEarnedHonors().catch(() => 0).then(fetchHonorsHub),
    [],
  );
  const [selected, setSelected] = useState<HubHonor | null>(null);
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();

  // The "view honor → then tutorial" hand-off: if the tour was deferred by "View Honor", resume it as the
  // athlete leaves this hub (unmount covers back button, swipe, and hardware back). No-op otherwise.
  useEffect(() => {
    return () => {
      resumeTour();
    };
  }, [resumeTour]);

  // Memoized: `?? []` mints a fresh array every render, which would defeat the memo below.
  const recent = useMemo(() => hub?.recent ?? [], [hub]);
  const categories = hub?.categories ?? [];
  const total = hub?.earnedCount ?? 0;

  /**
   * Whether the Recent strip needs years. The design always drops them, so a three-year athlete sees two
   * honors both reading "Jan 20" with nothing to tell them apart.
   */
  const recentNeedsYear = useMemo(() => {
    const years = new Set(recent.map((h) => (h.date ?? '').slice(0, 4)).filter(Boolean));
    return years.size > 1;
  }, [recent]);

  return (
    <View style={styles.root}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.legacyMountains} imageOpacity={0.375} overlay={{ flat: 'rgba(5,5,5,0.42)' }} />

      <AppBar
        onBack={() => router.back()}
        title={
          <View>
            <Text style={styles.barTitle}>Honors</Text>
            <Text style={styles.barSub}>
              {total} {total === 1 ? 'Honor' : 'Honors'}
            </Text>
          </View>
        }
      />

      {!hub ? (
        <View style={styles.status}>
          {error ? (
            <>
              {/* The REASON, not just the fact. This said only "Couldn't load your honors." when the
                  actual error was `42703: column honor_catalog.display_amount does not exist` — an
                  unapplied 0083, diagnosable in seconds and invisible for want of one line. Every other
                  screen in the app surfaces `errorMessage`; this one swallowed it. */}
              <Text style={styles.statusText}>Couldn&apos;t load your honors.</Text>
              <Text style={styles.statusDetail}>{errorMessage(error)}</Text>
              <Pressable onPress={refetch} accessibilityRole="button" accessibilityLabel="Retry" style={styles.retryBtn}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </>
          ) : (
            <ActivityIndicator color={flColor.bronze400} />
          )}
        </View>
      ) : total === 0 ? (
        <EmptyHonors />
      ) : (
        <ScrollView
        ref={tourScroller}
        onScroll={onTourScroll}
        scrollEventThrottle={16}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <TourAnchor id="honors-recent">
            <Text style={styles.sectionLabel}>Recent</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
              {recent.map((h) => (
                <HonorTile key={h.slug} honor={h} size={72} showYear={recentNeedsYear} onPress={() => setSelected(h)} />
              ))}
            </ScrollView>
          </TourAnchor>

          {categories.map((group, gi) => (
            <TourAnchor key={group.id} id={gi === 0 ? 'honors-categories' : undefined} style={styles.catBlock}>
              <View style={styles.divider} />
              <View style={styles.catHeader}>
                <View style={styles.catHeaderLeft}>
                  <HonorGlyph glyph={group.glyph} size={15} color={flColor.bronze400} strokeWidth={1.9} />
                  <Text style={styles.catName}>{group.name}</Text>
                </View>
                <Text style={styles.catCount}>{group.honors.length}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
                {group.honors.map((h) => (
                  <HonorTile key={h.slug} honor={h} size={56} onPress={() => setSelected(h)} />
                ))}
              </ScrollView>
            </TourAnchor>
          ))}
        </ScrollView>
      )}

      {/* Only once they hold something — the empty state already explains that honors are awarded. */}
      <ScreenTour screenKey="honors" ready={total > 0} />

      {selected ? (
        <HonorDetailSheet
          honor={selected}
          onClose={() => setSelected(null)}
          onShare={() => {
            setSelected(null);
            showToast('Share · coming soon');
          }}
        />
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function HonorTile({
  honor,
  size,
  showYear = false,
  onPress,
}: {
  honor: HubHonor;
  size: number;
  showYear?: boolean;
  onPress: () => void;
}) {
  const date = honor.date ?? '';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${honor.name}${date ? `, earned ${fmtDate(date)}` : ''}`}
      style={[styles.tile, { width: size + 16 }]}
    >
      <HonorMedallion glyph={honor.glyph} size={size} />
      <Text style={styles.tileName} numberOfLines={2}>
        {honor.name}
      </Text>
      {date ? <Text style={styles.tileDate}>{showYear ? fmtDate(date) : shortDate(date)}</Text> : null}
    </Pressable>
  );
}

/** L-11 Honor Detail Sheet — a bottom sheet over the hub. */
function HonorDetailSheet({ honor, onClose, onShare }: { honor: HubHonor; onClose: () => void; onShare: () => void }) {
  const drag = useSheetDrag({ onClose });
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.sheetScrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      <Animated.View onLayout={drag.onLayout} style={[styles.sheet, drag.style]} accessibilityViewIsModal>
        {/* The grabber grabs — see `useSheetDrag`. */}
        <View style={styles.sheetHandleRow} {...drag.panHandlers}>
          <View style={styles.sheetHandle} />
        </View>
        <View style={styles.sheetHead}>
          <HonorMedallion glyph={honor.glyph} size={96} />
          <Text style={styles.sheetEyebrow}>{honor.categoryName}</Text>
          <Text style={styles.sheetName}>{honor.name}</Text>
          {honor.date ? <Text style={styles.sheetDate}>Earned {fmtDate(honor.date)}</Text> : null}
        </View>

        <View style={styles.sheetCard}>
          {/* The earn condition, generated from the rule the evaluator actually tests. */}
          <Text style={styles.sheetDesc}>{honor.trigger}</Text>

          {/* Where this sits in its own ladder. The design's only row was "Category", which is the word
              already printed as the eyebrow six pixels above — this says something the athlete can't see. */}
          {honor.tier ? (
            <>
              <View style={styles.sheetRowDivider} />
              <View style={styles.sheetRow}>
                <View style={styles.sheetRowLeft}>
                  <HonorGlyph glyph={honor.glyph} size={13} color={flColor.bronze400} strokeWidth={1.9} />
                  <Text style={styles.sheetRowLabel}>Tier</Text>
                </View>
                <Text style={styles.sheetRowValue}>
                  {honor.tier.step} of {honor.tier.of}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        <Pressable onPress={onShare} accessibilityRole="button" accessibilityLabel="Share honor" style={styles.shareBtn}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
            <Path d="M16 6l-4-4-4 4" />
            <Path d="M12 2v13" />
          </Svg>
          <Text style={styles.shareText}>Share Honor</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function EmptyHonors() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyMark}>
        <Svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M8 4h8v3.5a4 4 0 0 1-8 0z" />
          <Path d="M8 5.5H5.3c0 2.4 1 3.6 2.9 3.9" />
          <Path d="M16 5.5h2.7c0 2.4-1 3.6-2.9 3.9" />
          <Path d="M12 12v4" />
          <Path d="M9 20h6l-.5-4h-5z" />
        </Svg>
      </View>
      <Text style={styles.emptyTitle}>No honors yet</Text>
      <Text style={styles.emptyBody}>
        Every honor is struck for something you do — a first workout, a chapter sealed, a plate added. Train, and your first mark is close.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  barTitle: { fontFamily: flFont.sans, fontSize: 15, fontWeight: '600', letterSpacing: 0.2, color: flColor.cream100 },
  barSub: { fontFamily: flFont.sans, fontSize: 11, color: flColor.gray600, marginTop: 1 },

  status: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
  statusText: { color: flColor.gray400, fontFamily: flFont.sans, fontSize: 15, textAlign: 'center' },
  statusDetail: { marginTop: 6, color: flColor.gray600, fontFamily: flFont.sans, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 22, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronze400 },
  retryText: { color: flColor.bronze400, fontFamily: flFont.sans, fontSize: 14, fontWeight: '600' },

  scroll: { paddingTop: 18, paddingBottom: 40 },
  sectionLabel: {
    paddingHorizontal: 24,
    fontFamily: flFont.sans,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: flColor.bronze400,
  },
  strip: { gap: 16, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 4 },
  tile: { alignItems: 'center', gap: 8 },
  tileName: { fontFamily: flFont.sans, fontSize: 11.5, fontWeight: '600', lineHeight: 15, color: flColor.gray400, textAlign: 'center' },
  tileDate: { fontFamily: flFont.sans, fontSize: 10, color: flColor.gray600 },

  catBlock: { marginTop: 30 },
  divider: { height: 1, backgroundColor: flColor.charcoal700, marginHorizontal: 24, marginBottom: 16 },
  catHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  catHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  catName: { fontFamily: flFont.sans, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.gray400 },
  catCount: { fontFamily: flFont.sans, fontSize: 11, fontWeight: '600', color: flColor.gray600, fontVariant: ['tabular-nums'] },

  // detail sheet (L-11)
  sheetScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 34,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#17130D',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: flColor.bronzeBorderSubtle,
    boxShadow: flShadow.ambient,
  },
  /** ~22px of grabbable height around the 4px bar the design draws — see `useSheetDrag`. */
  sheetHandleRow: { alignItems: 'center', paddingTop: 4, paddingBottom: 8 },
  sheetHandle: { width: 38, height: 4, borderRadius: 999, backgroundColor: flColor.charcoal600, alignSelf: 'center', marginBottom: 22 },
  sheetHead: { alignItems: 'center', gap: 8 },
  sheetEyebrow: {
    marginTop: 10,
    fontFamily: flFont.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: flColor.bronze400,
  },
  sheetName: {
    fontFamily: flFont.display,
    fontSize: 27,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 30,
    textAlign: 'center',
    color: flColor.cream100,
  },
  sheetDate: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.gray600 },
  sheetCard: {
    marginTop: 22,
    padding: 16,
    borderRadius: flRadius.lg,
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1,
    borderColor: flColor.charcoal700,
  },
  sheetDesc: { fontFamily: flFont.sans, fontSize: 13.5, lineHeight: 21, color: flColor.gray400 },
  sheetRowDivider: { height: 1, backgroundColor: flColor.charcoal700, marginTop: 14, marginBottom: 8 },
  sheetRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 14, paddingVertical: 6 },
  sheetRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetRowLabel: { fontFamily: flFont.sans, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: flColor.gray600 },
  sheetRowValue: { flex: 1, minWidth: 0, fontFamily: flFont.sans, fontSize: 13, fontWeight: '500', color: flColor.gray400, textAlign: 'right' },
  shareBtn: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 15,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: 'rgba(196,142,74,0.06)',
  },
  shareText: { fontFamily: flFont.sans, fontSize: 14, fontWeight: '600', letterSpacing: 0.2, color: flColor.bronze300 },

  // empty
  empty: { flex: 1, alignItems: 'center', paddingTop: 96, paddingHorizontal: 40 },
  emptyMark: {
    width: 76,
    height: 76,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.surfaceRecessed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { marginTop: 22, fontFamily: flFont.display, fontSize: 23, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  emptyBody: { marginTop: 10, maxWidth: 260, fontFamily: flFont.sans, fontSize: 13.5, lineHeight: 21, color: flColor.gray400, textAlign: 'center' },
});
