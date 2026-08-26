import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';
import {
  chapterRange,
  chapterSummary,
  fetchLegacyTimeline,
  isMajor,
  markDate,
  type TimelineChapter,
  type TimelineEvent,
  type TimelineKind,
} from '@/data/legacy-timeline-live';
import { useQuery } from '@/lib/useQuery';

/**
 * Legacy Timeline (L-2) — every mark, in order.
 * Built to `Forge Legacy Timeline.dc.html`.
 *
 * NO MIGRATION. `timeline_events` has existed since 0001 and twelve migrations write to it; chapter
 * openings and PRs are derived from the columns that already hold them. See `legacy-timeline-live`.
 *
 * ── THE RAIL ────────────────────────────────────────────────────────────────
 *
 * One continuous hairline down the left, brightest at the present and fading to nothing at the origin —
 * the past literally dims. Every node marker carries a 4px opaque halo, which punches a hole in the rail
 * behind it so the line reads as passing BEHIND discrete beads rather than through them. That halo is the
 * screen's best material detail and it is why the markers are all one width: change a marker size and the
 * rail stops being centred under it.
 *
 * Significance is carried in material, not labels. Chapter boundaries, goal completions and rank
 * promotions glow and brighten; PRs, honors, programs and photos sit quiet. A year is a diamond rather
 * than a bead, because it is a different class of thing.
 *
 * ── DELTAS VS THE `.dc` ─────────────────────────────────────────────────────
 *
 * DROPPED-FREE:
 *  1. `n.range` was bound to the chapter SUMMARY. The header rendered "22 workouts · 3 honors" in a field
 *     named `range`, so the one screen organised by time never showed a chapter's date span. It shows the
 *     range, with the summary beside it.
 *  2. EVERY EVENT ROW WAS INERT — fifteen marks, none tappable, in an app where the destinations already
 *     exist. An honor opens the Hub, an accomplishment its screen, a goal Goals, a rank the Progress Hub,
 *     a photo the archive, a chapter its detail. A PR has no screen of its own, so it stays quiet rather
 *     than pretending.
 *  3. BACK HAD NO REFERRER GUARD — it hard-navigated to Legacy from wherever you came from. It returns.
 *  4. The chapter header's chevron floated mid-row (`flex:0 1 auto` on the text column) while the event
 *     row one branch away solved the same problem correctly. Pushed to the edge.
 *  5. Focusable but not activatable — `role="button" tabindex="0"` with no key handler, fourth screen in
 *     a row. `Pressable` is activatable everywhere.
 *  6. The video branch was dead: `isVideo` tested for a type that is not one of the canonical ten and
 *     appears in no data. Not carried.
 *  7. Grain at 0.08 where every other screen uses 0.06, and two hand-mixed knockout blacks (#160f06 in
 *     the header marker, `flColor.onBronze` in this same file's loading gate). One value each.
 *
 * DEFERRED-HONEST: no filter, no jump-to-year, no search — matching the design. Worth revisiting when an
 * athlete's rail runs to hundreds of nodes; at that point it is the same problem the honor catalog has.
 *
 * ADDED: an empty state. The design has none, and a new athlete would have reached the closing ornament
 * with nothing above it.
 *
 * Faithful: the fading rail and its halo-punched beads, sticky year diamonds, significance in material,
 * the origin cap, the closing ornament, and all three lines of copy — which frame the whole artifact.
 */

const RAIL_X = 15;
const MARKER = 31;
const GAP = 14;
/** The halo that punches the rail. One value, used by every marker. */
const HALO = '0 0 0 4px rgba(8,11,14,0.7)';

export default function LegacyTimelineScreen() {
  const router = useRouter();
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();
  const { data, loading, error, refetch } = useQuery(fetchLegacyTimeline, []);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/legacy'));

  /**
   * The scroll's children are assembled here rather than inlined so `stickyHeaderIndices` can RECORD the
   * year rows' positions instead of guessing them. Inline, the indices depend on how many elements happen
   * to precede the stream — a magic offset that silently breaks the moment anything is added above.
   */
  const children: ReactNode[] = [];
  const sticky: number[] = [];
  let seenEvent = false;
  if (data && data.nodes.length > 0) {
    children.push(
      <TourAnchor key="intro" id="timeline-rail">
        <Text style={styles.intro}>Every mark. In order.</Text>
      </TourAnchor>,
      // Brightest at the present, gone by the origin.
      <LinearGradient
        key="rail"
        colors={[flColor.bronzeBorder, flColor.bronzeBorderSubtle, 'transparent']}
        locations={[0, 0.88, 1]}
        style={styles.rail}
        pointerEvents="none"
      />,
    );

    for (const n of data.nodes) {
      if (n.type === 'year') {
        sticky.push(children.length);
        children.push(
          <View key={n.key} style={styles.yearRow}>
            <LinearGradient colors={['rgba(8,11,14,0.94)', 'rgba(8,11,14,0.94)', 'rgba(8,11,14,0)']} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View style={styles.yearMark} />
            <Text style={styles.yearLabel}>{n.year}</Text>
          </View>,
        );
      } else if (n.type === 'chapter') {
        const id = n.chapter.id;
        children.push(<ChapterHeader key={n.key} chapter={n.chapter} onPress={() => router.push({ pathname: '/chapter/[id]', params: { id } })} />);
      } else {
        const r = n.event.route;
        // The first event carries the "weight is in the material" ring — a row is what that step is about.
        const firstEvent = !seenEvent;
        seenEvent = true;
        children.push(
          <TourAnchor key={n.key} id={firstEvent ? 'timeline-entry' : undefined}>
            <EventRow event={n.event} onPress={r ? () => router.push({ pathname: r.pathname, params: r.params } as Parameters<typeof router.push>[0]) : undefined} />
          </TourAnchor>,
        );
      }
    }

    children.push(
      // Where the rail's fade lands. Deliberately not bronze and not haloed — the origin is quiet.
      <View key="origin" style={styles.originRow}>
        <View style={styles.originDot} />
        <Text style={styles.originText}>Where it began.</Text>
      </View>,
      <View key="close" style={styles.close}>
        <View style={styles.closeRule}>
          <LinearGradient colors={['transparent', flColor.charcoal600]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        </View>
        <View style={styles.closeDiamond} />
        <View style={styles.closeRule}>
          <LinearGradient colors={[flColor.charcoal600, 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        </View>
      </View>,
      <Text key="closeText" style={styles.closeText}>
        History cannot be rewritten.
      </Text>,
    );
  }

  return (
    <View style={styles.root}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.legacy} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Timeline" onBack={goBack} />

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.missingTitle}>Couldn’t load your timeline.</Text>
          <Text style={styles.missingBody}>{error}</Text>
          <Pressable onPress={refetch} accessibilityRole="button" accessibilityLabel="Try again" style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>Try Again</Text>
          </Pressable>
        </View>
      ) : !data || data.nodes.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyBody}>Your first workout opens the first chapter, and the rail starts from there.</Text>
        </View>
      ) : (
        <ScrollView
        ref={tourScroller}
        onScroll={onTourScroll}
        scrollEventThrottle={16}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={sticky}
        >
          {children}
        </ScrollView>
      )}

      <ScreenTour screenKey="legacy-timeline" ready={!!data && data.nodes.length > 0} />
    </View>
  );
}

function ChapterHeader({ chapter: c, onPress }: { chapter: TimelineChapter; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${c.name}, ${c.sealed ? 'sealed' : 'active'}, ${chapterRange(c)}`}
      style={({ pressed }) => [styles.chapterRow, pressed ? styles.pressed : null]}
    >
      <View style={styles.chapterMark}>
        <LinearGradient
          colors={flGradient.bronzeMetallic.colors}
          locations={flGradient.bronzeMetallic.locations}
          start={flGradient.bronzeMetallic.start}
          end={flGradient.bronzeMetallic.end}
          style={[StyleSheet.absoluteFill, styles.chapterMarkFill]}
        />
        {/* THREE STATES, NOT TWO. `sealed` and `isActive` are separate facts and a chapter can be
            neither — closed without being sealed. That case used to take the active branch by default,
            so it got the open-book emblem AND a live green dot claiming it was still being written. */}
        {c.sealed ? <FlameGlyph size={15} color={flColor.onBronze} /> : <BookGlyph size={15} color={flColor.onBronze} />}
      </View>

      <View style={styles.chapterBody}>
        <Text style={styles.chapterName} numberOfLines={1}>
          {c.name}
        </Text>
        <View style={styles.chapterMeta}>
          {c.sealed ? (
            <>
              <FlameGlyph size={10} color={flColor.gray600} />
              <Text style={styles.chapterStatusSealed}>Sealed</Text>
            </>
          ) : c.isActive ? (
            <>
              <View style={styles.liveDot} />
              <Text style={styles.chapterStatusActive}>Active</Text>
            </>
          ) : (
            /* Not sealed, not active. `isActive` was fetched and never read, so this chapter used to
               claim a live green dot — the app asserting someone is still writing a chapter they left. */
            <Text style={styles.chapterStatusSealed}>Not active</Text>
          )}
          <Text style={styles.chapterRange} numberOfLines={1}>
            {chapterRange(c)} · {chapterSummary(c)}
          </Text>
        </View>
      </View>

      <ChevronGlyph />
    </Pressable>
  );
}

function EventRow({ event: e, onPress }: { event: TimelineEvent; onPress?: () => void }) {
  const major = isMajor(e.kind);
  const body = (
    <>
      <View style={[styles.eventMark, major ? styles.eventMarkMajor : styles.eventMarkPlain]}>
        <EventGlyph kind={e.kind} color={major ? flColor.bronze300 : flColor.bronze600} />
      </View>
      <View style={styles.eventBody}>
        <Text style={styles.eventTitle} numberOfLines={1}>
          {e.title}
        </Text>
        {e.sub ? (
          <Text style={styles.eventSub} numberOfLines={1}>
            {e.sub}
          </Text>
        ) : null}
      </View>
      <Text style={styles.eventDate}>{markDate(e.at)}</Text>
    </>
  );

  // A mark with nowhere to go stays a mark. Only what has a real destination becomes a button.
  if (!onPress) return <View style={styles.eventRow}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${e.title}${e.sub ? `, ${e.sub}` : ''}, ${markDate(e.at)}`}
      style={({ pressed }) => [styles.eventRow, pressed ? styles.pressed : null]}
    >
      {body}
    </Pressable>
  );
}

// ── glyphs ──
function EventGlyph({ kind, color }: { kind: TimelineKind; color: string }) {
  const s = 14;
  switch (kind) {
    case 'chapter-open':
      return <BookGlyph size={s} color={color} />;
    case 'chapter-seal':
      return <FlameGlyph size={s} color={color} />;
    case 'rank':
      return <ShieldGlyph size={s} color={color} />;
    case 'honor':
      return <MedalGlyph size={s} color={color} />;
    case 'goal':
      return <TargetGlyph size={s} color={color} />;
    case 'program-grad':
      return <MedalGlyph size={s} color={color} />;
    case 'accomplishment':
      return <StarGlyph size={s} color={color} />;
    case 'photo':
      return <CameraGlyph size={s} color={color} />;
    case 'reflection':
    case 'memory':
      return <QuoteGlyph size={s} color={color} />;
    default:
      return <SparkGlyph size={s} color={color} />;
  }
}
/*
 * ══ THESE ARE THE LIBRARY'S PATHS, NOT LOOKALIKES ══
 *
 * Each of the three below was hand-drawn here and diverged from `forge-symbols.js` — the same library
 * `ForgeSymbol.tsx` already ports and that the Legacy tab and Chapter Detail already draw from. The
 * chapter emblem was the visible casualty: the old "book" was
 *
 *     M4 5.5A2 2 0 0 1 6 4h5v16H6a2 2 0 0 0-2 1.5zM20 5.5A2 2 0 0 0 18 4h-5v16h5a2 2 0 0 1 2 1.5z
 *
 * — two tall boxy slabs spanning y 4→21.5 in a 24 viewBox, so vertically off-centre by three quarters
 * of a unit and bottom-heavy. Stroked near-black on a solid bronze coin at 15px it read as a dark blob,
 * not an open book. The canonical path is two curves that actually look like facing pages.
 *
 * The same file drew a bespoke flame and a shield missing the design's inner chevron. All three now
 * carry the library's own `d`, so the timeline agrees with every other surface that draws a chapter.
 * (`Legacy-Timeline-Wireframe-Spec-L2.md` specifies no emblem at all — the mark is a `.dc` invention —
 * so the authority here is the symbol library, and it is now being followed.)
 */
function BookGlyph({ size = 14, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 6.5C10 5 7 4.5 4 5v12c3-.5 6 0 8 1.5" />
      <Path d="M12 6.5C14 5 17 4.5 20 5v12c-3-.5-6 0-8 1.5z" />
    </Svg>
  );
}
function FlameGlyph({ size = 14, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3c2.2 3 4 4.6 4 8a4 4 0 0 1-8 0c0-1.6.5-2.7 1.2-3.4.2 1.1 1 1.7 1.6 1.7C10.2 8 11 5.2 12 3z" />
    </Svg>
  );
}
function ShieldGlyph({ size = 14, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3.4l6.8 2.6v5.3c0 4.2-2.8 7-6.8 8.6-4-1.6-6.8-4.4-6.8-8.6V6L12 3.4z" />
      {/* The chevron the hand-drawn copy dropped — without it a rank-up reads as a plain crest. */}
      <Path d="M8.8 11l3.2 2.2 3.2-2.2" />
    </Svg>
  );
}
function MedalGlyph({ size = 14, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={14.5} r={4.8} />
      {/* The library's inner ring, which the hand-drawn copy left out — a medal without it is a coin. */}
      <Circle cx={12} cy={14.5} r={1.8} />
      <Path d="M8.8 10.4L6 4h4l2 3.2L14 4h4l-2.8 6.4" />
    </Svg>
  );
}
function TargetGlyph({ size = 14, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Circle cx={12} cy={12} r={8.5} />
      <Circle cx={12} cy={12} r={4.4} />
      <Circle cx={12} cy={12} r={1} fill={color} />
    </Svg>
  );
}
function StarGlyph({ size = 14, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round">
      <Path d="M12 3l2.6 5.6 6.1.7-4.5 4.1 1.2 6L12 16.9 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" />
    </Svg>
  );
}
function CameraGlyph({ size = 14, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.2-2h8.2l1.2 2h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      <Circle cx={12} cy={13} r={3.2} />
    </Svg>
  );
}
function SparkGlyph({ size = 14, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3.2 3.2M14.8 14.8L18 18M18 6l-3.2 3.2M9.2 14.8L6 18" />
    </Svg>
  );
}
function QuoteGlyph({ size = 14, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 7H5v5h4v-2c0 2.4-1 3.6-3 4M19 7h-4v5h4v-2c0 2.4-1 3.6-3 4" />
    </Svg>
  );
}
function ChevronGlyph({ size = 16, color = flColor.gray600 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pressed: { opacity: 0.82 },

  /* No top padding — the sticky year sits flush under the app bar. */
  scroll: { paddingHorizontal: 24, paddingBottom: 8 },
  intro: { paddingTop: 18, paddingBottom: 14, fontSize: 12, fontWeight: '600', letterSpacing: 2.6, textTransform: 'uppercase', color: flColor.gray600 },

  rail: { position: 'absolute', left: 24 + RAIL_X, top: 56, bottom: 120, width: 1 },

  yearRow: { flexDirection: 'row', alignItems: 'center', gap: GAP, paddingTop: 12, paddingBottom: 8, zIndex: 6 },
  /* A diamond, not a bead — a year is a different class of node. */
  yearMark: { width: 9, height: 9, marginLeft: (MARKER - 9) / 2, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.base, transform: [{ rotate: '45deg' }], boxShadow: HALO },
  yearLabel: { fontFamily: flFont.display, fontSize: 14, fontWeight: '700', letterSpacing: 3, color: flColor.gray400 },

  chapterRow: { flexDirection: 'row', alignItems: 'center', gap: GAP, paddingTop: 16, paddingBottom: 12, paddingHorizontal: 2 },
  /* NO `overflow: 'hidden'` — it clips the halo and the badge glow, which are drawn OUTSIDE the coin.
     The gradient fill is already round because it inherits this view's radius, so the overflow was
     buying nothing and costing the ring the mark is supposed to sit inside. */
  chapterMark: { width: MARKER, height: MARKER, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, boxShadow: `${HALO}, ${flShadow.glowBadge}` },
  chapterMarkFill: { borderRadius: flRadius.round },
  chapterBody: { flex: 1, minWidth: 0, gap: 4 },
  chapterName: { fontFamily: flFont.display, fontSize: 17, fontWeight: '600', letterSpacing: -0.2, color: flColor.cream100 },
  chapterMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chapterStatusActive: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze300 },
  chapterStatusSealed: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },
  chapterRange: { flex: 1, minWidth: 0, fontSize: 11, color: flColor.gray600 },
  liveDot: { width: 6, height: 6, borderRadius: flRadius.round, backgroundColor: flColor.greenMuted, boxShadow: '0 0 6px rgba(90, 158, 104, 0.6)' },

  eventRow: { flexDirection: 'row', alignItems: 'center', gap: GAP, paddingVertical: 7, paddingHorizontal: 2 },
  eventMark: { width: MARKER, height: MARKER, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round, borderWidth: 1, backgroundColor: flColor.surfaceRecessed },
  eventMarkMajor: { borderColor: flColor.bronzeBorder, boxShadow: `${HALO}, ${flShadow.glowSubtle}` },
  eventMarkPlain: { borderColor: flColor.bronzeBorderSubtle, boxShadow: HALO },
  eventBody: { flex: 1, minWidth: 0, gap: 2 },
  eventTitle: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  eventSub: { fontSize: 11.5, color: flColor.gray600 },
  eventDate: { flexShrink: 0, fontSize: 11, color: flColor.gray600 },

  originRow: { flexDirection: 'row', alignItems: 'center', gap: GAP, marginTop: 14, paddingHorizontal: 2 },
  originDot: { width: 7, height: 7, marginLeft: (MARKER - 7) / 2, borderRadius: flRadius.round, backgroundColor: flColor.charcoal500 },
  originText: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 11.5, color: flColor.gray600 },

  close: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, alignSelf: 'center', width: 220, marginTop: 34 },
  closeRule: { flex: 1, height: 1 },
  closeDiamond: { width: 6, height: 6, borderWidth: 1, borderColor: flColor.bronze400, transform: [{ rotate: '45deg' }] },
  closeText: { alignSelf: 'center', maxWidth: 250, marginTop: 14, marginBottom: 30, fontFamily: flFont.display, fontStyle: 'italic', fontSize: 15, lineHeight: 21.8, textAlign: 'center', color: flColor.bronze300 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, gap: 4 },
  emptyTitle: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { marginTop: 6, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray600 },
  missingTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  missingBody: { marginTop: 9, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray400 },
  outlineBtn: { marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
});
