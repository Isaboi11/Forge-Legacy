import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  FeaturedMomentCard,
  HonorInsignia,
  MyStandard,
  SealedChapterCard,
  TimelineRow,
} from '@/components/forge/profile-sections';
import {
  sectionVisible,
  VISIBILITY_DEFAULTS,
  type Audience,
  type VisibilitySection,
  type ViewerRelationship,
} from '@/domain/visibility/profile-visibility';
import { fetchPublicProfile } from '@/domain/profile/live';
import { useProfile } from '@/lib/profile';
import { fetchLegacyData } from '@/data/legacy-live';
import { useQuery } from '@/lib/useQuery';
import { flColor, flFont, flRadius } from '@/constants/foundation';

/**
 * Public Athlete Profile (/athlete/[id]) — ONE renderer, driven by data, for every subject.
 * Source of truth: Forge Public Profile.dc.html (sections + gating) + domain/visibility.
 *
 * TWO-GATE section visibility: a gated section renders only if (a) the owner's per-section audience ×
 * the viewer's relationship clears it (`sectionVisible`), AND (b) real data for it exists. Self bypasses
 * gate (a) for its owned sections but still needs data. Core identity (rank, My Standard, Featured
 * Moment, Honors) is always-shown, data permitting.
 *
 * DATA REALITY (honest, no fabrication): the app has a per-athlete dataset for exactly ONE subject —
 * the signed-in athlete (live `fetchLegacyData`). So SELF renders rich; every OTHER athlete has no
 * dataset and renders sparse (identity + inert actions only) — Path 2 (per-athlete data) is deferred.
 * Never invents sections. Reuses the SAME section components as the Legacy hub (profile-sections) — no
 * fork. Squad-scoped accolades/since are stripped upstream (getPublicProfile), so nothing squad-internal
 * leaks onto this cross-context surface.
 *
 * Prototype demo hooks (query params, no settings backend yet): `?as=<stranger|squadmate|friend|self>`
 * overrides the viewer relationship (preview "how others see me"); `?<section>=<audience>` overrides one
 * section's audience (e.g. `?chapter=private`) to demonstrate gating end-to-end.
 */

const AUDIENCE_VALUES: readonly Audience[] = ['everyone', 'squads', 'friends', 'private'];
const VIEWER_VALUES: readonly ViewerRelationship[] = ['self', 'friend', 'squadmate', 'stranger', 'following'];

function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default function AthleteProfileRoute() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const router = useRouter();
  const name = String(firstParam(params.id) ?? '').trim();
  const goBack = () => router.back();

  // Live (Phase 2): the shared self identity, the subject's public profile, and — for self only — the
  // rich Legacy dataset. Non-self subjects have no per-athlete store (Path 2 deferred) → sparse.
  const { profile: self, loading: selfLoading } = useProfile();
  const { data: profile, loading: pLoading, error: pError } = useQuery(() => fetchPublicProfile(name), [name]);
  const isSelfSubject = !!self && name === self.name;
  const { data: legacy, loading: lLoading } = useQuery(
    () => (isSelfSubject ? fetchLegacyData() : Promise.resolve(null)),
    [isSelfSubject],
  );

  if (!name || pError) {
    return (
      <ProfileShell onBack={goBack}>
        <Text style={styles.emptyText}>Profile unavailable.</Text>
      </ProfileShell>
    );
  }
  // Wait for the subject profile and — once we know it's self — the Legacy read, so the rich sections
  // don't pop in after the identity hero.
  if (!profile || selfLoading || pLoading) {
    return (
      <ProfileShell onBack={goBack}>
        <ActivityIndicator color={flColor.bronze400} />
      </ProfileShell>
    );
  }
  if (isSelfSubject && (lLoading || !legacy)) {
    return (
      <ProfileShell onBack={goBack}>
        <ActivityIndicator color={flColor.bronze400} />
      </ProfileShell>
    );
  }

  // The one subject with an authored per-athlete dataset is self. Others are sparse (Path 2 deferred).
  const data = isSelfSubject ? legacy : null;

  // Viewer relationship (self → sees all owned; `?as=` previews another viewer). Non-self subjects are
  // sparse regardless of relationship, so the derived value only matters for the self-as-other preview.
  const asOverride = firstParam(params.as);
  const viewer: ViewerRelationship =
    asOverride && VIEWER_VALUES.includes(asOverride as ViewerRelationship)
      ? (asOverride as ViewerRelationship)
      : isSelfSubject
        ? 'self'
        : 'stranger';
  const viewerIsSelf = viewer === 'self';

  // Per-section audiences: launch defaults, with optional query overrides for the gating demo.
  const audienceOf = (section: VisibilitySection): Audience => {
    const override = firstParam(params[section]);
    return override && AUDIENCE_VALUES.includes(override as Audience) ? (override as Audience) : VISIBILITY_DEFAULTS[section];
  };
  const show = (section: VisibilitySection, hasData: boolean) =>
    sectionVisible({ audience: audienceOf(section), viewer, hasData, isSelf: viewerIsSelf });

  const rankLabel =
    isSelfSubject && data ? [data.rankName, data.rankSubTier].filter(Boolean).join(' · ') : profile.rank;
  const hasMarkers = Boolean(rankLabel || profile.athleteType);
  const [recentSeal, ...olderSeals] = data ? data.sealedChapters : [];

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.legacy} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Identity hero — the only universally-public content. Initials Avatar (no photo store). ── */}
        <View style={styles.hero}>
          <Avatar name={profile.name} src={profile.avatarUrl ?? undefined} size="profile" ring />
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
                {rankLabel ? <Text style={styles.rank}>{rankLabel}</Text> : null}
                {rankLabel && profile.athleteType ? <View style={styles.dot} /> : null}
                {profile.athleteType ? <Text style={styles.athleteType}>{profile.athleteType}</Text> : null}
              </View>
            ) : null}
          </View>
        </View>

        {/* Relationship actions — WRITE paths, so visibly-disabled inert shells (never fake). Self hidden. */}
        {!isSelfSubject ? (
          <View style={styles.actionsSection}>
            <View style={styles.actionRow}>
              <InertAction glyph={<SwordsGlyph />} label="Challenge" />
              <InertAction glyph={<AddFriendGlyph />} label="Add Friend" />
              <InertAction glyph={<FollowGlyph />} label="Follow" />
            </View>
            <Text style={styles.actionNote}>Connecting with other athletes is coming soon — these actions aren’t active yet.</Text>
          </View>
        ) : null}

        {data ? (
          <>
            {/* My Standard — always-shown core identity, read-only on the public surface */}
            {data.standard ? (
              <View style={styles.standardPad}>
                <MyStandard standard={data.standard} />
              </View>
            ) : null}

            {/* Current Chapter — gated (chapter) */}
            {show('chapter', Boolean(data.activeChapter)) && data.activeChapter ? (
              <CurrentChapter chapter={data.activeChapter} dayCount={data.dayCount} />
            ) : null}

            {/* Featured Legacy Moment — always-shown */}
            {data.featuredMoment ? (
              <View style={styles.sectionPad}>
                <Text style={styles.overline}>Featured Legacy Moment</Text>
                <FeaturedMomentCard moment={data.featuredMoment} />
              </View>
            ) : null}

            {/* Chapter History — gated (history) */}
            {show('history', Boolean(recentSeal)) && recentSeal ? (
              <View style={[styles.sectionPad, styles.storyStack]}>
                <SealedChapterCard chapter={recentSeal} />
                {olderSeals.map((c) => (
                  <CompactChapterRow key={c.id} chapter={c} />
                ))}
              </View>
            ) : null}

            {/* Timeline — gated (timeline) */}
            {show('timeline', data.timelineEntries.length > 0) ? (
              <View style={styles.sectionPad}>
                <Text style={styles.overlineTight}>Recent</Text>
                <View>
                  {data.timelineEntries.map((it) => (
                    <TimelineRow key={it.id} entry={it} />
                  ))}
                </View>
              </View>
            ) : null}

            {/* Accomplishments — gated (accomplishments) */}
            {show('accomplishments', data.accomplishments.length > 0) ? (
              <View style={styles.section}>
                <View style={styles.sectionHeaderPad}>
                  <SectionHeader label="Accomplishments" />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripPad}>
                  {data.accomplishments.map((a) => (
                    <AccomplishmentCard key={a.id} item={a} />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Honors — always-shown */}
            {data.honors.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeaderPad}>
                  <SectionHeader label="Honors" />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.honorStripPad}>
                  {data.honors.map((h) => (
                    <HonorInsignia key={h.id} honor={h} />
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </>
        ) : null}

        {/* Footer flourish */}
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

/** The profile chrome (background + back bar) with a centered slot — reused for empty/loading/error. */
function ProfileShell({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.legacy} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="" onBack={onBack} />
      <View style={styles.empty}>{children}</View>
    </View>
  );
}

/** A relationship action rendered visibly disabled — an honest inert shell, no write path. */
function InertAction({ glyph, label }: { glyph: ReactNode; label: string }) {
  return (
    <View accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityLabel={`${label} — coming soon`} style={styles.action}>
      {glyph}
      <Text style={styles.actionLabel}>{label}</Text>
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

  // section scaffolding (matches the Legacy hub spacing)
  standardPad: { paddingTop: 20 },
  section: { marginTop: 40 },
  sectionPad: { marginTop: 40, paddingHorizontal: 24 },
  sectionHeaderPad: { paddingHorizontal: 24 },
  stripPad: { gap: 12, paddingHorizontal: 24, paddingTop: 8 },
  honorStripPad: { gap: 18, paddingHorizontal: 24, paddingTop: 10 },
  storyStack: { gap: 12 },
  overline: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: flColor.gray600,
    paddingBottom: 12,
    paddingHorizontal: 2,
  },
  overlineTight: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: flColor.gray600,
    paddingHorizontal: 2,
    paddingBottom: 4,
  },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 40 },
  rule: { flex: 1, maxWidth: 90, height: 1, backgroundColor: flColor.bronzeBorderSubtle },
  diamond: { width: 6, height: 6, transform: [{ rotate: '45deg' }], borderWidth: 1, borderColor: flColor.bronze400 },
  footerHandle: { textAlign: 'center', fontSize: 11, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray600, marginTop: 15 },
});
