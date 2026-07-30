import type { ReactNode } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { SectionHeader } from '@/components/forge/composites/SectionHeader';
import {
  AccomplishmentCard,
  CompactChapterRow,
  CurrentChapter,
  MyStandard,
  SealedChapterCard,
  TimelineRow,
} from '@/components/forge/profile-sections';
import { fetchAthleteProfile, rankLabel, type AthleteProfile } from '@/data/athlete-profile-live';
import type { Accomplishment, Chapter, Goal, TimelineEntry } from '@/types/legacy';
import { useQuery } from '@/lib/useQuery';
import { flColor, flFont, flRadius } from '@/constants/foundation';

/**
 * Athlete Profile (`/athlete/[id]`) — the specs' "Limited Athlete Profile", built to
 * `Forge Public Profile.dc.html`. One renderer for every subject, self included.
 *
 * WHAT CHANGED, AND WHY IT MATTERED. The screen and its section components already existed and were
 * already built to this design. What it said about itself was the problem:
 *
 *     "the app has a per-athlete dataset for exactly ONE subject — the signed-in athlete. So SELF renders
 *      rich; every OTHER athlete has no dataset and renders sparse (identity + inert actions only)"
 *
 * Which meant every avatar in the competition standings, the record book and the join-request queue
 * opened a near-empty page. Migration 0069 is that missing dataset.
 *
 * THE GATE MOVED TO THE SERVER, and that is the substantive change. The old version fetched what it could
 * and decided client-side whether to draw each section, with `?chapter=private`-style query overrides to
 * demonstrate it. That is not privacy — it ships an athlete's training stats to a stranger's device and
 * trusts the UI to look away, and anyone with a network tab has them. `athlete_profile()` evaluates the
 * subject's own visibility map against the viewer's clearance and does not SELECT a section the viewer
 * cannot see, so a hidden section is ABSENT from the payload.
 *
 * `null` MEANS "NOT CLEARED"; `[]` MEANS "NOTHING THERE". Never collapsed into one falsy check — an
 * athlete with no sealed chapters and an athlete who keeps them private are different facts, and only one
 * of them is the viewer's business.
 *
 * A HIDDEN SECTION IS SILENT. There is no "this athlete's stats are private" placeholder, because that
 * sentence is itself a disclosure: it reveals both what they have and that they chose to withhold it. A
 * gated section is indistinguishable from one that was never filled in.
 *
 * IDENTITY IS ALWAYS VISIBLE — rank, Standard and Athlete Type are core identity, deliberately absent
 * from `visibility.ts`'s controllable list. Rank is the subject's REAL stored family and level; the
 * design renders Foundation IV for every athlete from a literal.
 *
 * THE FIREWALL NEEDED NOTHING EXTRA. The specs ask for a "performance-free" profile, and `stats` defaults
 * to the `squads` audience — so a stranger never receives training numbers while a squad-mate does, which
 * is exactly what SQ-D2 lifts the Performance Firewall for inside a squad. The visibility ladder was
 * already the correct mechanism.
 *
 * ROUTED BY ID, NOT NAME. It used to take a display name and look the subject up by it, which cannot
 * identify anybody reliably — and `squad-post` was already passing a real uuid into that name lookup, so
 * the two callers disagreed. Every real caller passes an id now.
 *
 * NOT ON THIS SURFACE: Featured Legacy Moment (needs FLM event data this read doesn't carry) and Honors
 * (no HonorInstance backend). The Legacy tab remains the rich self surface for both.
 *
 * STILL INERT, HONESTLY: Add Friend, Follow, a one-on-one Challenge, Train With, Invite to Squad, Report
 * and Block. Each needs a system that doesn't exist — a friends graph, a follow graph, duel-context
 * challenges (ours are squad-wide), Train Together, or a moderation policy. They render visibly disabled
 * with one line saying so, rather than as buttons that toast. The design's own logic layer is the same
 * shape: local state and toast stubs.
 */

const SCROLL_RANGE = 220;

export default function AthleteProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const athleteId = String(id ?? '').trim();
  const router = useRouter();
  const { data, loading, error, refetch } = useQuery(() => fetchAthleteProfile(athleteId), [athleteId]);
  const [scrollY] = useState(() => new Animated.Value(0));

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/squads'));

  if (loading && !data) {
    return (
      <Shell onBack={goBack}>
        <ActivityIndicator color={flColor.bronze400} />
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell onBack={goBack}>
        <Text style={styles.missingTitle}>{error ? 'Couldn’t load this profile.' : 'This profile isn’t available.'}</Text>
        {error ? <Text style={styles.missingBody}>{error}</Text> : null}
        <Pressable onPress={error ? refetch : goBack} accessibilityRole="button" accessibilityLabel={error ? 'Try again' : 'Back'} style={styles.outlineBtn}>
          <Text style={styles.outlineBtnLabel}>{error ? 'Try Again' : 'Back'}</Text>
        </Pressable>
      </Shell>
    );
  }

  // p = 0…1 across the first 220px, exactly as the design drives its hero.
  const p = scrollY.interpolate({ inputRange: [0, SCROLL_RANGE], outputRange: [0, 1], extrapolate: 'clamp' });
  const rank = rankLabel(data.rankFamily, data.rankLevel);

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.legacy} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      {/* The plate that dissolves the artwork as you read — the design's `p · 0.52`. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.plate, { opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0, 0.52] }) }]} />

      <AppBar title="" onBack={goBack} />

      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >
        {/* ── Identity hero: fades, parallaxes, and shrinks its portrait toward the corner ── */}
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.1] }),
              transform: [{ translateY: scrollY.interpolate({ inputRange: [0, SCROLL_RANGE], outputRange: [0, -SCROLL_RANGE * 0.12], extrapolate: 'clamp' }) }],
            },
          ]}
        >
          <Animated.View style={[styles.portrait, { transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.76] }) }] }]}>
            <Avatar name={data.name} src={data.avatarUrl ?? undefined} size="profile" ring />
          </Animated.View>

          <View style={styles.heroText}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {data.name}
              </Text>
              {data.isSelf ? (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>You</Text>
                </View>
              ) : null}
            </View>
            {data.handle ? <Text style={styles.handle}>@{data.handle}</Text> : null}

            {rank || data.athleteType ? (
              <View style={styles.markerRow}>
                {rank ? <Text style={styles.rank}>{rank}</Text> : null}
                {rank && data.athleteType ? <View style={styles.dot} /> : null}
                {data.athleteType ? <Text style={styles.athleteType}>{data.athleteType}</Text> : null}
              </View>
            ) : null}

            {/* Real shared squads. The design hardcodes "Iron Vigil". */}
            {data.sharedSquads.length > 0 ? (
              <View style={styles.chipRow}>
                {data.sharedSquads.slice(0, 2).map((s) => (
                  <View key={s} style={styles.chip}>
                    <Text style={styles.chipText} numberOfLines={1}>
                      {s}
                    </Text>
                  </View>
                ))}
                {data.sharedSquads.length > 2 ? <Text style={styles.chipMore}>+{data.sharedSquads.length - 2}</Text> : null}
              </View>
            ) : null}
          </View>
        </Animated.View>

        {!data.isSelf ? <InertActions /> : null}

        {/* My Standard — core identity, always visible (visibility.ts header). */}
        {data.standard ? (
          <View style={styles.standardPad}>
            <MyStandard standard={data.standard} />
          </View>
        ) : null}

        {/* Training stats — `squads` by default, so a stranger is never sent these at all. */}
        {data.stats ? (
          <View style={styles.statsRow}>
            <StatCell value={data.stats.workouts} label="Workouts" />
            <StatCell value={data.stats.prs} label={data.stats.prs === 1 ? 'PR' : 'PRs'} />
            <StatCell value={data.stats.chapters} label={data.stats.chapters === 1 ? 'Chapter' : 'Chapters'} />
          </View>
        ) : null}

        {data.chapter ? <CurrentChapter chapter={toChapter(data.chapter)} dayCount={daysSince(data.chapter.startDate)} /> : null}

        {data.history && data.history.length > 0 ? (
          <View style={[styles.sectionPad, styles.storyStack]}>
            <SealedChapterCard chapter={toSealed(data.history[0])} />
            {data.history.slice(1).map((c) => (
              <CompactChapterRow key={c.id} chapter={toSealed(c)} />
            ))}
          </View>
        ) : null}

        {data.timeline && data.timeline.length > 0 ? (
          <View style={styles.sectionPad}>
            <Text style={styles.overlineTight}>Recent</Text>
            <View>
              {data.timeline.slice(0, 6).map((t, i) => (
                <TimelineRow key={`${t.at}-${i}`} entry={toTimeline(t, i)} />
              ))}
            </View>
          </View>
        ) : null}

        {data.accomplishments && data.accomplishments.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderPad}>
              <SectionHeader label="Accomplishments" />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripPad}>
              {data.accomplishments.map((a) => (
                <AccomplishmentCard key={a.id} item={toAccomplishment(a)} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.rule} />
          <View style={styles.diamond} />
          <View style={styles.rule} />
        </View>
        <Text style={styles.footerHandle}>{data.handle ? `@${data.handle}` : data.name}</Text>
      </Animated.ScrollView>
    </View>
  );
}

// ── mapping onto the shared Legacy view types, so this renders the SAME components as the hub ──

type ProfileChapterT = NonNullable<AthleteProfile['chapter']>;

function goalOf(g: ProfileChapterT['goal']): Goal {
  if (!g) return { kind: 'none' };
  if (g.target == null) return { kind: 'narrative', name: g.name, achieved: false };
  const progress = g.target > 0 ? Math.round(Math.min(1, g.current / g.target) * 100) : 0;
  return {
    kind: 'quantifiable',
    name: g.name,
    progress,
    achieved: progress >= 100,
    valueLabel: `${g.current.toLocaleString('en-US')} / ${g.target.toLocaleString('en-US')}${g.unit ? ` ${g.unit}` : ''}`,
  };
}

function toChapter(c: ProfileChapterT): Chapter {
  return {
    id: c.id,
    name: c.name,
    startDate: c.startDate,
    goal: goalOf(c.goal),
    workoutCount: c.workoutCount,
    honorCount: c.honorCount,
    isActive: true,
  };
}

function toSealed(c: NonNullable<AthleteProfile['history']>[number]): Chapter {
  const start = new Date(c.startDate);
  const end = c.sealedAt ? new Date(c.sealedAt) : null;
  const days = end ? Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000)) : null;
  const mon = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });
  return {
    id: c.id,
    name: c.name,
    startDate: c.startDate,
    sealedAt: c.sealedAt ?? undefined,
    dateRangeFull: end ? `${mon(start)} ${start.getDate()} – ${mon(end)} ${end.getDate()}, ${end.getFullYear()}${days ? ` · ${days} days` : ''}` : undefined,
    dateRangeCompact: end ? `${mon(start)} – ${mon(end)} ${end.getFullYear()}${days ? ` · ${days}d` : ''}` : undefined,
    goal: { kind: 'none' },
    workoutCount: c.workoutCount,
    honorCount: 0,
    isActive: false,
  };
}

function toTimeline(t: NonNullable<AthleteProfile['timeline']>[number], i: number): TimelineEntry {
  return {
    id: `${t.at}-${i}`,
    eventType: t.kind === 'chapter' ? 'CHAPTER_SEALED' : 'ACCOMPLISHMENT',
    objectName: t.label,
    dateLabel: new Date(t.at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
  };
}

function toAccomplishment(a: NonNullable<AthleteProfile['accomplishments']>[number]): Accomplishment {
  return {
    id: a.id,
    text: a.name,
    monthYear: a.date ? new Date(a.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '',
    featured: a.featured,
  };
}

const daysSince = (iso: string): number => Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 86400000));

// ── pieces ──

function StatCell({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value.toLocaleString('en-US')}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** Visibly disabled, with the reason stated once. Never a button that only toasts. */
function InertActions() {
  return (
    <View style={styles.actionsSection}>
      <View style={styles.actionRow}>
        <InertAction glyph={<SwordsGlyph />} label="Challenge" />
        <InertAction glyph={<AddFriendGlyph />} label="Add Friend" />
        <InertAction glyph={<FollowGlyph />} label="Follow" />
      </View>
      <Text style={styles.actionNote}>Friends, following and one-on-one challenges aren’t built yet — competitions run squad-wide for now.</Text>
    </View>
  );
}

function InertAction({ glyph, label }: { glyph: ReactNode; label: string }) {
  return (
    <View accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityLabel={`${label} — not available yet`} style={styles.action}>
      {glyph}
      <Text style={styles.actionLabel}>{label}</Text>
    </View>
  );
}

function Shell({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.legacy} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="" onBack={onBack} />
      <View style={styles.center}>{children}</View>
    </View>
  );
}

function SwordsGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M5 4.5L18 17.5M19 4.5L6 17.5M12.7 15.8L16.3 12.2M7.7 12.2L11.3 15.8" />
    </Svg>
  );
}
function AddFriendGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Circle cx={9} cy={8} r={3.4} />
      <Path d="M3.5 20a5.5 5.5 0 0 1 11 0M18 8v6M15 11h6" />
    </Svg>
  );
}
function FollowGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  plate: { backgroundColor: '#000' },
  scroll: { paddingBottom: 44 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  missingTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  missingBody: { marginTop: 9, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray400 },
  outlineBtn: { marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },

  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  portrait: { transformOrigin: 'left center' },
  heroText: { flex: 1, minWidth: 0, gap: 7 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  name: { flexShrink: 1, fontFamily: flFont.display, fontSize: 24, fontWeight: '700', letterSpacing: -0.3, color: flColor.cream100 },
  handle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, color: flColor.gray600 },
  markerRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 1 },
  rank: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.bronze400 },
  athleteType: { fontSize: 11.5, fontWeight: '500', letterSpacing: 0.3, color: flColor.gray400 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: flColor.bronze400 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  chip: { flexShrink: 1, paddingVertical: 2, paddingHorizontal: 7, borderRadius: flRadius.sm, backgroundColor: flColor.bronzeTint, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle },
  chipText: { fontSize: 8.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.bronze400 },
  chipMore: { fontSize: 10, color: flColor.gray600 },

  statsRow: { flexDirection: 'row', marginTop: 26, marginHorizontal: 24, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800, overflow: 'hidden' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 15, gap: 4 },
  statValue: { fontFamily: flFont.display, fontSize: 22, fontWeight: '700', letterSpacing: -0.4, color: flColor.cream100 },
  statLabel: { fontSize: 9.5, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray600 },

  actionsSection: { paddingHorizontal: 24, paddingTop: 26, gap: 12 },
  actionRow: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800, opacity: 0.55 },
  actionLabel: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  actionNote: { fontSize: 11.5, lineHeight: 17, color: flColor.gray600 },

  standardPad: { paddingTop: 20 },
  section: { marginTop: 40 },
  sectionPad: { marginTop: 40, paddingHorizontal: 24 },
  sectionHeaderPad: { paddingHorizontal: 24 },
  stripPad: { gap: 12, paddingHorizontal: 24, paddingTop: 8 },
  storyStack: { gap: 12 },
  overlineTight: { fontSize: 10, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase', color: flColor.gray600, paddingHorizontal: 2, paddingBottom: 4 },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 40 },
  rule: { flex: 1, maxWidth: 90, height: 1, backgroundColor: flColor.bronzeBorderSubtle },
  diamond: { width: 6, height: 6, transform: [{ rotate: '45deg' }], borderWidth: 1, borderColor: flColor.bronze400 },
  footerHandle: { textAlign: 'center', fontSize: 11, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600, marginTop: 15 },
});
