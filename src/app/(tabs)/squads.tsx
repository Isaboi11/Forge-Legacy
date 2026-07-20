import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { Avatar } from '@/components/forge/composites/Avatar';
import { SectionHeader } from '@/components/forge/composites/SectionHeader';
import { Button } from '@/components/forge/composites/Button';
import { ChevronRightIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { useProfile } from '@/lib/profile';
import { INITIAL_FAVORITE_IDS, SQUADS_PLACEHOLDER } from '@/data/squads-placeholder';
import type { Squad, SquadMember } from '@/data/squads-placeholder';
import { ScreenTour } from '@/components/tour/ScreenTour';

/**
 * Squads tab root — S-1 Squads Hub.
 * Source of truth: the design handoff "Squads Hub.dc.html" (new foundation system).
 *
 * Rebuilt on the foundation tokens + committed composites to match Home/Workouts/
 * Legacy. Header (title + Discover/Create actions), then the athlete's squads grouped
 * into Favorites / All Squads, each rendered as a card (crest · name · motto · member
 * stack · "trained today" segment row), and a full-width "Create a Squad" CTA. When the
 * list is empty the dc's onboarding pitch (headline + paragraph + CTA) is shown instead.
 *
 * ALL squad content is PLACEHOLDER (`SQUADS_PLACEHOLDER`) — there is NO social backend;
 * no roster, member, motto, count or "trained today" value here is real. The one real
 * datum is the current athlete's name (`getSelfProfile`), used for the self avatar in the
 * owned squad's member stack (the dc header has no avatar, so self surfaces in the row).
 * Favorites is genuine local UI state (`useState`) — a backend-free toggle, not fabricated
 * social data.
 *
 * Pending-asset (NOT fabricated): the squad crest artwork was never imported, so every
 * crest renders as a uniform graceful bronze geometric placeholder — never a made-up
 * per-squad badge design.
 *
 * Deferred to a follow-up sub-phase (noted here, not faked): the Toast, the coach marks,
 * the forged-grain overlay, and the `squads-hub-bg.png` hero image (→ the atmospheric
 * gradient, same as the other tab roots). Taps to unbuilt destinations — S-2 Squad Detail,
 * Discover Squads, Create Squad — are inert, consistent with Home/Workouts/Legacy.
 */

export default function SquadsScreen() {
  const selfName = useProfile().profile?.name ?? '';
  const router = useRouter();
  const [favoriteIds, setFavoriteIds] = useState<string[]>(INITIAL_FAVORITE_IDS);

  const openSquad = (id: string) => router.push({ pathname: '/squad/[id]', params: { id } });

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.concat(id)));
  };

  const { favSquads, otherSquads } = useMemo(() => {
    const favSet = new Set(favoriteIds);
    return {
      favSquads: SQUADS_PLACEHOLDER.filter((s) => favSet.has(s.id)),
      otherSquads: SQUADS_PLACEHOLDER.filter((s) => !favSet.has(s.id)),
    };
  }, [favoriteIds]);

  const isEmpty = SQUADS_PLACEHOLDER.length === 0;

  return (
    <View style={styles.root}>
      <ScreenBackground
        image={SCREEN_BG.squadsHub}
        base="#060708"
        imagePosition="top"
        overlay={{ colors: ['rgba(6,7,8,0.28)', 'rgba(6,7,8,0.5)', 'rgba(6,7,8,0.82)'], locations: [0, 0.42, 1] }}
      />

      <AppBar
        title={<Text style={styles.barTitle}>Squads</Text>}
        actions={
          <>
            <Pressable
              onPress={() => {
                // Discover Squads — not yet implemented.
              }}
              accessibilityRole="button"
              accessibilityLabel="Discover squads"
              style={styles.headerBtn}
              hitSlop={8}
            >
              <SearchIcon color={flColor.bronze300} />
            </Pressable>
            <Pressable
              onPress={() => {
                // Create Squad — not yet implemented.
              }}
              accessibilityRole="button"
              accessibilityLabel="Create a squad"
              style={styles.headerBtn}
              hitSlop={8}
            >
              <PlusIcon color={flColor.bronze300} size={24} />
            </Pressable>
          </>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isEmpty ? (
          <SquadsEmptyState />
        ) : (
          <View style={styles.stack}>
            {favSquads.length > 0 ? (
              <>
                <View>
                  <View style={styles.sectionHeaderPad}>
                    <SectionHeader label="Favorites" />
                  </View>
                  <View style={styles.cardStack}>
                    {favSquads.map((s) => (
                      <SquadCard
                        key={s.id}
                        squad={s}
                        selfName={selfName}
                        isFavorite
                        onToggleFavorite={() => toggleFavorite(s.id)}
                        onOpen={() => openSquad(s.id)}
                      />
                    ))}
                  </View>
                </View>

                {otherSquads.length > 0 ? (
                  <View>
                    <View style={styles.sectionHeaderPad}>
                      <SectionHeader label="All Squads" />
                    </View>
                    <View style={styles.cardStack}>
                      {otherSquads.map((s) => (
                        <SquadCard
                          key={s.id}
                          squad={s}
                          selfName={selfName}
                          isFavorite={false}
                          onToggleFavorite={() => toggleFavorite(s.id)}
                          onOpen={() => openSquad(s.id)}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.cardStack}>
                {otherSquads.map((s) => (
                  <SquadCard
                    key={s.id}
                    squad={s}
                    selfName={selfName}
                    isFavorite={false}
                    onToggleFavorite={() => toggleFavorite(s.id)}
                    onOpen={() => openSquad(s.id)}
                  />
                ))}
              </View>
            )}

            {/* Primary creation CTA */}
            <Button
              variant="primary"
              fullWidth
              icon={<PlusIcon color="#F7F5F1" size={18} />}
              onPress={() => {
                // Create Squad — not yet implemented.
              }}
              accessibilityLabel="Create a squad"
            >
              Create a Squad
            </Button>
          </View>
        )}
      </ScrollView>

      <ScreenTour screenKey="squads" />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Local presentational pieces
// ─────────────────────────────────────────────────────────────────────────────

function SquadCard({
  squad,
  selfName,
  isFavorite,
  onToggleFavorite,
  onOpen,
}: {
  squad: Squad;
  selfName: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
}) {
  const memberCount = squad.members.length;
  const shown = squad.members.slice(0, 4);
  const overflow = memberCount - shown.length;

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Open ${squad.name}`}
      style={[styles.card, isFavorite ? styles.cardFav : null]}
    >
      {isFavorite ? (
        <LinearGradient
          colors={['rgba(191,143,79,0.07)', 'rgba(191,143,79,0)'] as const}
          locations={[0, 0.42] as const}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {/* identity */}
      <View style={styles.identityRow}>
        <SquadCrest />

        <View style={styles.identityBody}>
          {squad.owned ? <Text style={styles.ownedLabel}>Your Squad</Text> : null}

          <View style={styles.nameRow}>
            <Text style={styles.squadName} numberOfLines={2}>
              {squad.name}
            </Text>
            <View style={styles.nameActions}>
              <Pressable
                onPress={onToggleFavorite}
                accessibilityRole="button"
                accessibilityState={{ selected: isFavorite }}
                accessibilityLabel={
                  isFavorite ? `Remove ${squad.name} from favorites` : `Add ${squad.name} to favorites`
                }
                style={styles.starBtn}
                hitSlop={8}
              >
                <StarIcon filled={isFavorite} />
              </Pressable>
              <ChevronRightIcon size={18} color={flColor.bronze400} />
            </View>
          </View>

          <Text style={styles.motto} numberOfLines={1}>
            {squad.motto}
          </Text>

          {/* member row */}
          <View style={styles.memberRow}>
            <View style={styles.avatarStack}>
              {shown.map((m: SquadMember, i: number) => (
                <View key={m.id} style={[styles.stackAvatar, i === 0 ? styles.stackAvatarFirst : null]}>
                  <Avatar name={m.isSelf ? selfName : m.name} size="squadStack" />
                </View>
              ))}
              {overflow > 0 ? (
                <View style={[styles.stackAvatar, styles.overflowChip]}>
                  <Text style={styles.overflowText}>+{overflow}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.memberCountRow}>
              <MembersIcon />
              <Text style={styles.memberCountText}>
                {memberCount === 1 ? '1 member' : `${memberCount} members`}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* divider */}
      <View style={styles.dividerWrap}>
        <LinearGradient
          colors={['rgba(186,146,92,0)', flColor.bronzeBorderSubtle, flColor.bronzeBorderSubtle, 'rgba(186,146,92,0)'] as const}
          locations={[0, 0.2, 0.8, 1] as const}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.divider}
        />
      </View>

      {/* daily "trained today" progress — discrete, one segment per member */}
      <View style={styles.dailyRow}>
        <View style={styles.dailyNumWrap}>
          <Text style={styles.dailyNum}>
            <Text style={squad.trainedToday > 0 ? styles.dailyNumOn : styles.dailyNumOff}>{squad.trainedToday}</Text>
            <Text style={styles.dailyNumTotal}> / {memberCount}</Text>
          </Text>
          <Text style={styles.dailyLabel}>trained today</Text>
        </View>
        <View style={styles.segments}>
          {squad.members.map((m: SquadMember, i: number) => (
            <View key={m.id} style={[styles.segment, i < squad.trainedToday ? styles.segmentOn : styles.segmentOff]} />
          ))}
        </View>
      </View>
    </Pressable>
  );
}

function SquadsEmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyCrest}>
        <SquadCrestGlyph size={40} />
      </View>
      <Text style={styles.emptyHeadline}>Training alongside someone changes how it feels to show up.</Text>
      <Text style={styles.emptyBody}>
        A squad is a small, private group that trains together. Follow each other’s progress, celebrate wins, and take
        on shared challenges. Build lasting friendships, stay accountable, and discover how much easier consistency
        becomes when you’re not training alone.
      </Text>
      <View style={styles.emptyCta}>
        <Button
          variant="primary"
          fullWidth
          icon={<PlusIcon color="#F7F5F1" size={18} />}
          onPress={() => {
            // Create Squad — not yet implemented.
          }}
          accessibilityLabel="Create a squad"
        >
          Create a Squad
        </Button>
      </View>
    </View>
  );
}

/**
 * Squad crest — pending-asset placeholder. A bronze-ringed disc with a faint,
 * uniform geometric mark (same principle as legacy.tsx's SealPortrait / HonorInsignia).
 * NOT a fabricated per-squad emblem; every crest is identical until real art is imported.
 */
function SquadCrest() {
  return (
    <View style={styles.crest}>
      <SquadCrestGlyph size={34} />
    </View>
  );
}

function SquadCrestGlyph({ size }: { size: number }) {
  const c = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={c - 2} stroke={flColor.bronze300} strokeWidth={1.4} opacity={0.5} fill="none" />
      <Circle cx={c} cy={c} r={c - 7} stroke={flColor.bronze400} strokeWidth={1} opacity={0.28} fill="none" />
      <Rect
        x={c - (c - 9)}
        y={c - (c - 9)}
        width={(c - 9) * 2}
        height={(c - 9) * 2}
        stroke={flColor.bronze300}
        strokeWidth={1.2}
        opacity={0.4}
        fill="none"
        transform={`rotate(45 ${c} ${c})`}
      />
    </Svg>
  );
}

// ── inline glyphs (structural bronze marks) ──
function PlusIcon({ color = flColor.bronze400, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function SearchIcon({ color = flColor.bronze300 }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Circle cx={11} cy={11} r={7} />
      <Path d="M16 16l4.5 4.5" />
    </Svg>
  );
}
function StarIcon({ filled }: { filled: boolean }) {
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill={filled ? flColor.bronze300 : 'none'}
      stroke={filled ? flColor.bronze300 : flColor.gray600}
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter" strokeMiterlimit={8}
    >
      <Path d="M12 2.6l2.65 6.02 6.55.55-4.98 4.3 1.5 6.4L12 16.9l-5.72 3.47 1.5-6.4-4.98-4.3 6.55-.55z" />
    </Svg>
  );
}
function MembersIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={8}>
      <Circle cx={9} cy={8} r={3.2} />
      <Path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <Path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18 20a5.5 5.5 0 0 0-2.5-4.6" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  barTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: flColor.cream100,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: flRadius.round,
  },

  // scroll
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  stack: { gap: 20 },
  cardStack: { gap: 16 },
  sectionHeaderPad: { paddingHorizontal: 4, marginBottom: 2 },

  // squad card
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 17,
    gap: 16,
    boxShadow: flShadow.card,
  },
  cardFav: {
    borderColor: flColor.bronzeBorder,
    boxShadow: flShadow.missionCard,
  },

  // identity
  identityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 15 },
  crest: {
    width: 66,
    height: 66,
    flexShrink: 0,
    borderRadius: flRadius.round,
    borderWidth: 1.5,
    borderColor: flColor.bronze400,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: flShadow.glowSubtle,
  },
  identityBody: { flex: 1, minWidth: 0, gap: 5, paddingTop: 1 },
  ownedLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: flColor.bronze400,
  },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  squadName: {
    flex: 1,
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: -0.3,
    color: flColor.cream100,
  },
  nameActions: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0, marginTop: 2 },
  starBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: flRadius.round,
  },
  motto: {
    fontFamily: flFont.display,
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 18,
    color: flColor.bronze300,
  },

  // member row
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 9,
  },
  avatarStack: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8 },
  stackAvatar: {
    marginLeft: -8,
    borderRadius: flRadius.round,
    boxShadow: `0 0 0 2px ${flColor.charcoal800}`,
  },
  stackAvatarFirst: {},
  overflowChip: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.charcoal500,
    backgroundColor: flColor.charcoal800,
  },
  overflowText: { fontSize: 10.5, fontWeight: '700', color: flColor.gray400 },
  memberCountRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  memberCountText: { fontSize: 12.5, color: flColor.gray400 },

  // divider
  dividerWrap: { height: 1 },
  divider: { flex: 1, height: 1 },

  // daily progress
  dailyRow: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingTop: 3, paddingBottom: 2 },
  dailyNumWrap: { flexShrink: 0, minWidth: 56, gap: 5 },
  dailyNum: { fontSize: 23, fontWeight: '700', letterSpacing: 0.2, lineHeight: 24 },
  dailyNumOn: { color: flColor.bronze300 },
  dailyNumOff: { color: flColor.gray600 },
  dailyNumTotal: { color: flColor.gray600, fontWeight: '600' },
  dailyLabel: { fontSize: 11.5, letterSpacing: 0.2, color: flColor.gray400 },
  segments: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  segment: { flex: 1, height: 6, borderRadius: 3 },
  segmentOn: {
    backgroundColor: flColor.bronze400,
    boxShadow: '0 0 6px rgba(191,143,79,0.35)',
  },
  segmentOff: {
    backgroundColor: 'rgba(151,137,113,0.26)',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
  },

  // empty state
  emptyWrap: {
    paddingHorizontal: 10,
    paddingTop: 12,
    alignItems: 'center',
  },
  emptyCrest: {
    width: 78,
    height: 78,
    borderRadius: flRadius.round,
    borderWidth: 1.5,
    borderColor: flColor.bronze400,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: flShadow.glowSubtle,
  },
  emptyHeadline: {
    marginTop: 24,
    textAlign: 'center',
    fontFamily: flFont.display,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: -0.2,
    color: flColor.cream100,
    maxWidth: 300,
  },
  emptyBody: {
    marginTop: 13,
    textAlign: 'center',
    fontSize: 13.5,
    lineHeight: 22,
    color: flColor.gray400,
    maxWidth: 280,
  },
  emptyCta: { marginTop: 28, width: '100%' },
});
