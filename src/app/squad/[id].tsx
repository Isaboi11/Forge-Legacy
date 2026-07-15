import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { FeedPostCard } from '@/components/forge/compositions/FeedPostCard';
import { useShareSheet } from '@/hooks/useShareSheet';
import { SQUADS_PLACEHOLDER } from '@/data/squads-placeholder';
import { getSquadFeed, type FeedPost } from '@/data/post-placeholder';
import { getSquadCheckins, getSquadCompetition, getSquadMembers, type SquadCheckin, type SquadCompetition, type SquadMember } from '@/data/squad-feed-placeholder';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';

/**
 * Squad Detail (S-2) — feed-focused. Reached from a Squads Hub card; a root-Stack sibling so it
 * presents full-screen without the tab bar (back-chevron → Hub).
 *
 * This unit is the FEED: the squad identity header + the squad's internal training feed, rendered
 * through the ONE shared FeedPostCard (origin="squad"). The Performance Firewall is lifted for a
 * squad's own surface, so check-ins / PRs / form checks / challenge updates / train-together /
 * announcements all render through the same card (via additive PostContent variants — never a
 * squad-only renderer); save / RSVP / program affordances stay off (training-only). Each post
 * taps through to the shared Post Detail.
 *
 * PER-SQUAD ISOLATION: the feed comes from getSquadFeed(squadId) — squad-scoped, no cross-squad
 * leak (a tested contract). ALL content is PLACEHOLDER — no backend.
 *
 * Deferred to follow-up S-2 sub-units (noted, not faked): the member check-in strip, the active-
 * challenge standing banner, squad honors/stats, the member roster, squad records, settings, and
 * the composer. The crest is a pending-asset bronze geometric placeholder — never a fabricated
 * per-squad badge. The options action and taps to those unbuilt surfaces are inert.
 */
export default function SquadDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { openShare } = useShareSheet();

  const squadId = String(id ?? '');
  const squad = SQUADS_PLACEHOLDER.find((s) => s.id === squadId);
  const posts = getSquadFeed(squadId);
  const checkins = getSquadCheckins(squadId);
  const competition = getSquadCompetition(squadId);
  const members = getSquadMembers(squadId); // single source: roster + check-in strip + "N members"
  const [rosterOpen, setRosterOpen] = useState(false);

  const openPost = (pid: string) => router.push({ pathname: '/post/[id]', params: { id: pid } });
  const buildShare = (post: FeedPost) =>
    post.shareType ? () => openShare({ shareType: post.shareType!, overrides: { athlete: post.author } }) : undefined;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={flGradient.bgAtmospheric.colors}
        locations={flGradient.bgAtmospheric.locations}
        start={flGradient.bgAtmospheric.start}
        end={flGradient.bgAtmospheric.end}
        style={StyleSheet.absoluteFill}
      />
      <AppBar
        title={squad?.name ?? 'Squad'}
        serif
        onBack={() => router.back()}
        actions={
          <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Squad options" style={styles.iconBtn} hitSlop={8}>
            <OverflowIcon />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* identity header — crest is a pending-asset bronze placeholder */}
        <View style={styles.identity}>
          <View style={styles.crest}>
            <CrestGlyph />
          </View>
          <Text style={styles.squadName}>{squad?.name ?? 'Squad'}</Text>
          {squad?.motto ? <Text style={styles.motto}>{squad.motto}</Text> : null}
          <View style={styles.metaRow}>
            {/* "N members" derives from the single member source and taps through to the roster */}
            <Pressable
              onPress={() => members.length > 0 && setRosterOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`${members.length} members, view roster`}
              hitSlop={6}
            >
              <Text style={[styles.metaText, members.length > 0 ? styles.metaLink : null]}>{members.length} members</Text>
            </Pressable>
            {squad ? (
              <>
                <View style={styles.dot} />
                <Text style={styles.metaText}>{squad.trainedToday} trained today</Text>
              </>
            ) : null}
          </View>
        </View>

        {/* Today's Check-ins — who trained today (squad-scoped) */}
        {checkins.length > 0 ? <CheckInStrip checkins={checkins} /> : null}

        {/* Active Competition — the squad's standing (squad-scoped) */}
        {competition ? <CompetitionBanner competition={competition} /> : null}

        {/* the squad feed — shared FeedPostCard, squad origin */}
        {posts.length > 0 ? (
          <View style={styles.feed}>
            {posts.map((post) => (
              <FeedPostCard key={post.id} post={post} origin="squad" onOpen={() => openPost(post.id)} onShare={buildShare(post)} />
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyBody}>When the squad trains, their check-ins and milestones show up here.</Text>
          </View>
        )}
      </ScrollView>

      {/* Roster — read-only member list (single source). Tapping a member is inert (public
          profile is a deferred surface). */}
      <BottomSheet open={rosterOpen} onClose={() => setRosterOpen(false)} title={`Members · ${members.length}`}>
        <View style={styles.rosterList}>
          {members.map((m) => (
            <MemberRow key={m.id} member={m} />
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

function MemberRow({ member }: { member: SquadMember }) {
  const detail = [member.athleteType, member.rank].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={() => {}}
      accessibilityRole="button"
      accessibilityLabel={`${member.name}${member.isSelf ? ', you' : ''}`}
      style={styles.memberRow}
    >
      <Avatar name={member.name} size="listRow" presence={member.checkin?.status === 'trained'} />
      <View style={styles.memberText}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName} numberOfLines={1}>
            {member.name}
          </Text>
          {member.isSelf ? <Text style={styles.memberYou}>You</Text> : null}
        </View>
        {/* rich detail only where the squad has it (iron); others show name only — never invented */}
        {detail ? <Text style={styles.memberDetail}>{detail}</Text> : null}
        {member.accolades && member.accolades.length > 0 ? (
          <View style={styles.accoladeRow}>
            {member.accolades.map((a) => (
              <View key={a} style={styles.accolade}>
                <Text style={styles.accoladeText}>{a}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      {member.since ? <Text style={styles.memberSince}>{member.since}</Text> : null}
    </Pressable>
  );
}

function OverflowIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill={flColor.cream100}>
      <Circle cx={12} cy={5} r={1.7} />
      <Circle cx={12} cy={12} r={1.7} />
      <Circle cx={12} cy={19} r={1.7} />
    </Svg>
  );
}
function CrestGlyph() {
  return (
    <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
      <Path d="M9 11l2 2 4-4" />
    </Svg>
  );
}

// ── Today's Check-ins strip — who trained today. Avatars are initials (Avatar composite); the
//    ring + dim encode status (trained = bronze/full, pending = muted/dimmed). Tap is inert
//    (the per-member check-in detail is a deferred S-2 sub-surface).
function CheckInStrip({ checkins }: { checkins: SquadCheckin[] }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionLabel}>Today&apos;s Check-ins</Text>
        <Text style={styles.sectionMeta}>Today</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.checkinRow}>
        {checkins.map((c) => (
          <CheckInPip key={c.id} checkin={c} />
        ))}
      </ScrollView>
    </View>
  );
}

function CheckInPip({ checkin }: { checkin: SquadCheckin }) {
  const trained = checkin.status === 'trained';
  return (
    <Pressable
      onPress={() => {}}
      accessibilityRole="button"
      accessibilityLabel={`${checkin.name} — ${trained ? 'trained today' : 'not checked in'}`}
      style={styles.pip}
    >
      <View style={[styles.pipRing, trained ? styles.pipRingTrained : styles.pipRingPending]}>
        <Avatar name={checkin.name} size="listRow" />
        {checkin.hasVideo ? (
          <View style={styles.pipVideo}>
            <PlayMini />
          </View>
        ) : null}
        {checkin.unread ? <View style={styles.pipUnread} /> : null}
      </View>
      <Text style={styles.pipName} numberOfLines={1}>
        {checkin.first}
      </Text>
    </Pressable>
  );
}

// ── Active Competition banner — the squad's standing. Tap + "View All" are inert (the challenge
//    detail, where per-member standings live, is a deferred surface).
function CompetitionBanner({ competition }: { competition: SquadCompetition }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionLabel}>Active Competition</Text>
        <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="View all competitions" style={styles.viewAll} hitSlop={6}>
          <Text style={styles.viewAllText}>View All</Text>
          <ChevronMini />
        </Pressable>
      </View>
      <Pressable
        onPress={() => {}}
        accessibilityRole="button"
        accessibilityLabel={`${competition.name}, ranked ${competition.place} of ${competition.of}`}
        style={styles.compCard}
      >
        <View style={styles.compTop}>
          <View style={styles.compEmblem}>
            <TrophyGlyph />
          </View>
          <View style={styles.compNameCol}>
            <Text style={styles.compEyebrow}>Current Competition</Text>
            <Text style={styles.compName} numberOfLines={1}>
              {competition.name}
            </Text>
          </View>
          <View style={styles.compStat}>
            <Text style={styles.compStatLabel}>Rank</Text>
            <Text style={styles.compPlace}>{competition.place}</Text>
            <Text style={styles.compStatLabel}>of {competition.of}</Text>
          </View>
          <View style={[styles.compStat, styles.compStatDivider]}>
            <Text style={styles.compWorkouts}>{competition.workouts}</Text>
            <Text style={styles.compStatLabel}>Workouts</Text>
          </View>
        </View>
        <View style={styles.compFoot}>
          <View style={styles.compGap}>
            <TrendUp />
            <Text style={styles.compGapText}>{competition.gap}</Text>
          </View>
          <Text style={styles.compEnds}>{competition.ends}</Text>
        </View>
      </Pressable>
    </View>
  );
}

function PlayMini() {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill={flColor.bronze300}>
      <Path d="M8 5v14l11-7z" />
    </Svg>
  );
}
function ChevronMini() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 5l7 7-7 7" />
    </Svg>
  );
}
function TrophyGlyph() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill={flColor.bronze300}>
      <Path d="M3 8l4 3.5L12 5l5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </Svg>
  );
}
function TrendUp() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 19V5M6 11l6-6 6 6" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.round },
  scroll: { paddingBottom: 44 },

  identity: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20 },
  crest: {
    width: 78,
    height: 78,
    borderRadius: flRadius.round,
    borderWidth: 2,
    borderColor: flColor.bronze400,
    backgroundColor: flColor.charcoal900,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: flShadow.missionCard,
  },
  squadName: {
    fontFamily: flFont.display,
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: flColor.cream100,
    marginTop: 14,
    textAlign: 'center',
  },
  motto: { fontSize: 13.5, color: flColor.gray400, marginTop: 6, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12 },
  metaLink: { color: flColor.bronze400, fontWeight: '600' },

  // roster sheet
  rosterList: { gap: 4 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  memberText: { flex: 1, minWidth: 0, gap: 3 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { flexShrink: 1, fontSize: 15, fontWeight: '500', color: flColor.cream100 },
  memberYou: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: flColor.bronze400,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: flRadius.sm,
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    overflow: 'hidden',
  },
  memberDetail: { fontSize: 12, color: flColor.gray400 },
  accoladeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  accolade: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  accoladeText: { fontSize: 10, fontWeight: '600', color: flColor.gray400 },
  memberSince: { flexShrink: 0, fontSize: 11, color: flColor.gray600 },
  metaText: { fontSize: 12, color: flColor.gray600 },
  dot: { width: 2.5, height: 2.5, borderRadius: 1.25, backgroundColor: flColor.charcoal500 },

  feed: { paddingHorizontal: 16, gap: 12 },

  // section chrome (check-ins + competition)
  section: { paddingHorizontal: 18, marginBottom: 22 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  sectionMeta: { fontSize: 11.5, color: flColor.gray600 },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewAllText: { fontSize: 12, fontWeight: '500', color: flColor.bronze400 },

  // check-in strip
  checkinRow: { flexDirection: 'row', gap: 6, paddingRight: 6 },
  pip: { width: 66, alignItems: 'center', gap: 8 },
  pipRing: {
    width: 58,
    height: 58,
    borderRadius: flRadius.round,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.charcoal900,
  },
  pipRingTrained: { borderColor: flColor.bronze400 },
  pipRingPending: { borderColor: flColor.charcoal600, opacity: 0.5 },
  pipVideo: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: flRadius.round,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipUnread: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: flRadius.round,
    backgroundColor: flColor.bronze300,
    borderWidth: 2,
    borderColor: flColor.charcoal800,
  },
  pipName: { maxWidth: 66, fontSize: 12, color: flColor.gray400 },

  // competition banner
  compCard: {
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    overflow: 'hidden',
    boxShadow: flShadow.card,
  },
  compTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  compEmblem: {
    width: 46,
    height: 46,
    flexShrink: 0,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: flShadow.glowSubtle,
  },
  compNameCol: { flex: 1, minWidth: 0, gap: 4 },
  compEyebrow: { fontSize: 9, fontWeight: '600', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.bronze400 },
  compName: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  compStat: { flexShrink: 0, alignItems: 'center', gap: 2 },
  compStatDivider: { paddingLeft: 13, borderLeftWidth: 1, borderLeftColor: flColor.charcoal600 },
  compStatLabel: { fontSize: 8, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600 },
  compPlace: { fontFamily: flFont.display, fontSize: 20, fontWeight: '700', letterSpacing: -0.3, color: flColor.bronze300, lineHeight: 22 },
  compWorkouts: { fontFamily: flFont.display, fontSize: 20, fontWeight: '700', letterSpacing: -0.3, color: flColor.cream100, lineHeight: 22 },
  compFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: flColor.bronzeBorderSubtle,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  compGap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  compGapText: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.bronze300 },
  compEnds: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600 },

  empty: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 40, gap: 8 },
  emptyTitle: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100 },
  emptyBody: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, textAlign: 'center' },
});
