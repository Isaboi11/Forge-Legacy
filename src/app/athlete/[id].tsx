import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { getPublicProfile } from '@/data/athlete-profile-placeholder';
import { flColor, flFont, flGradient, flRadius } from '@/constants/foundation';

/**
 * Public Athlete Profile (/athlete/[id]) — the shared destination for the two seams that used to
 * dead-end: the squad roster row and the feed-post author. A root-Stack sibling, so it presents
 * full-screen. The `id` param is the athlete's NAME (the key every seam already carries).
 *
 * DELIBERATELY THIN (honest to the data): the app has no per-athlete profile store, so this renders
 * ONLY what authoritatively exists — identity always, and the public identity markers rank +
 * athleteType when the athlete is a known roster member (see getPublicProfile). Every rich Legacy
 * section in the design (`Forge Public Profile.dc.html` — chapters, honors, stats, accomplishments,
 * transformation) has no data source and is OMITTED, not fabricated; building them means authoring a
 * per-athlete dataset + the visibility/Firewall model — a separate, PO-scoped unit ("Path 2").
 *
 * The relationship actions (Challenge / Add Friend / Follow) are WRITE paths — rendered as
 * visibly-disabled inert shells, never fake mutations. Squad-scoped detail (accolades, join date)
 * never reaches here (findSquadAthlete strips it), so nothing squad-internal leaks onto this
 * cross-context public surface.
 */
export default function AthleteProfileRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const name = String(id ?? '').trim();

  if (!name) {
    return (
      <View style={styles.root}>
        <Bg />
        <AppBar title="" onBack={() => router.back()} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Profile unavailable.</Text>
        </View>
      </View>
    );
  }

  const profile = getPublicProfile(name);
  const hasMarkers = Boolean(profile.rank || profile.athleteType);

  return (
    <View style={styles.root}>
      <Bg />
      <AppBar title="" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Identity hero — the only universally-public content. Avatar is initials (no photo store). */}
        <View style={styles.hero}>
          <Avatar name={profile.name} size="profile" ring />
          <View style={styles.heroText}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {profile.name}
              </Text>
              {profile.isSelf ? (
                <View style={styles.youBadge}>
                  <Text style={styles.youText}>You</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.handle}>{profile.handle}</Text>
            {hasMarkers ? (
              <View style={styles.markerRow}>
                {profile.rank ? <Text style={styles.rank}>{profile.rank}</Text> : null}
                {profile.rank && profile.athleteType ? <View style={styles.dot} /> : null}
                {profile.athleteType ? <Text style={styles.athleteType}>{profile.athleteType}</Text> : null}
              </View>
            ) : null}
          </View>
        </View>

        {/* Relationship actions — WRITE paths, so visibly-disabled inert shells (never fake). Hidden
            for self (you don't friend/challenge yourself). */}
        {!profile.isSelf ? (
          <View style={styles.actionsSection}>
            <View style={styles.actionRow}>
              <InertAction glyph={<SwordsGlyph />} label="Challenge" />
              <InertAction glyph={<AddFriendGlyph />} label="Add Friend" />
              <InertAction glyph={<FollowGlyph />} label="Follow" />
            </View>
            <Text style={styles.actionNote}>Connecting with other athletes is coming soon — these actions aren’t active yet.</Text>
          </View>
        ) : null}

        {/* Footer flourish (design parity) — no fabricated Legacy sections above it. */}
        <View style={styles.footer}>
          <View style={styles.rule} />
          <View style={styles.diamond} />
          <View style={styles.rule} />
        </View>
        <Text style={styles.footerHandle}>{profile.handle}</Text>
      </ScrollView>
    </View>
  );
}

function Bg() {
  return (
    <LinearGradient
      colors={flGradient.bgAtmospheric.colors}
      locations={flGradient.bgAtmospheric.locations}
      start={flGradient.bgAtmospheric.start}
      end={flGradient.bgAtmospheric.end}
      style={StyleSheet.absoluteFill}
    />
  );
}

/** A relationship action rendered visibly disabled — an honest inert shell, no write path. */
function InertAction({ glyph, label }: { glyph: React.ReactNode; label: string }) {
  return (
    <View accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityLabel={`${label} — coming soon`} style={styles.action}>
      {glyph}
      <Text style={styles.actionLabel}>{label}</Text>
    </View>
  );
}

function SwordsGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 4v6a6 6 0 0 0 12 0V4M12 16v4M8.5 20h7" />
    </Svg>
  );
}
function AddFriendGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={8} r={3.4} />
      <Path d="M3.5 20a5.5 5.5 0 0 1 11 0M18 8v6M15 11h6" />
    </Svg>
  );
}
function FollowGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 44 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 14, color: flColor.gray400 },

  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  heroText: { flex: 1, minWidth: 0, gap: 7 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  name: { flexShrink: 1, fontFamily: flFont.display, fontSize: 24, fontWeight: '700', letterSpacing: -0.3, color: flColor.cream100 },
  youBadge: {
    flexShrink: 0,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: flRadius.sm,
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  youText: { fontSize: 8.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.bronze400 },
  handle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, color: flColor.gray600 },
  markerRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 1 },
  rank: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.bronze400 },
  athleteType: { fontSize: 11.5, fontWeight: '500', letterSpacing: 0.3, color: flColor.gray400 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: flColor.bronze400 },

  actionsSection: { paddingHorizontal: 24, paddingTop: 26, gap: 12 },
  actionRow: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    opacity: 0.55,
  },
  actionLabel: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  actionNote: { fontSize: 11.5, lineHeight: 17, color: flColor.gray600 },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 40 },
  rule: { flex: 1, maxWidth: 90, height: 1, backgroundColor: flColor.bronzeBorderSubtle },
  diamond: { width: 6, height: 6, transform: [{ rotate: '45deg' }], borderWidth: 1, borderColor: flColor.bronze400 },
  footerHandle: { textAlign: 'center', fontSize: 11, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600, marginTop: 15 },
});
