/*
 * ⚠️ SHELVED (not deleted) — Community is hidden from the app until launch. This screen is NOT
 * routed (it lives outside `app/`); the tab is removed from `@/components/app-tabs` and
 * `/community` soft-redirects to Home via `app/community.tsx`. It is kept here, compiling, so the
 * feature can be restored by moving it back to `app/(tabs)/community.tsx` + re-adding the tab.
 * It still renders through the SHARED FeedPostCard / FeedPost model / getCommunityFeed(), which
 * remain live for Friends + Squad and the community golden tests — nothing shared was removed.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { Avatar } from '@/components/forge/composites/Avatar';
import { SectionHeader } from '@/components/forge/composites/SectionHeader';
import { Pill } from '@/components/forge/composites/Pill';
import { ProgressBar } from '@/components/forge/composites/ProgressBar';
import { FeedPostCard } from '@/components/forge/compositions/FeedPostCard';
import { ChevronRightIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';
import { getSelfProfile } from '@/domain/profile/placeholder-data';
import { useShareSheet } from '@/hooks/useShareSheet';
import { COMMUNITY_DATA } from '@/data/community-placeholder';
import { getCommunityFeed, type FeedPost } from '@/data/post-placeholder';
import type {
  AboutInfo,
  ActiveChallenge,
  Community,
  CommunityAction,
  CommunityEvent,
  CommunityMetaItem,
  Competition,
  ComposerShortcut,
  Contributor,
  MemberRole,
  PinnedAnnouncement,
} from '@/data/community-placeholder';

/**
 * Community tab root — the 5th tab (Community Home).
 * Source of truth: the design handoff "Community Home.dc.html" (new foundation system).
 *
 * Rebuilt on the foundation tokens + committed composites to match Home/Workouts/
 * Legacy. Structure, top to bottom: a pending-asset community cover banner, the
 * identity block (crest + name switcher + categories + members + tagline + metadata
 * + 4 action buttons), a 4-tab segmented control (Feed / Events / Challenges /
 * About) with real local switching, and each tab's content — Feed (composer entry,
 * pinned announcement, a mixed post feed, an Active Challenges strip, Top
 * Contributors), Events, Challenges (Firewall-safe), and About.
 *
 * The dc opens on a full-bleed banner with floating Discover/Notifications/Overflow
 * buttons and no top bar; to keep the tab-root convention (Home/Workouts/Legacy all
 * carry an AppBar) this uses AppBar title "Community" + Discover/Notifications
 * actions + the self Avatar (Profile entry). "Overflow" is covered by the identity
 * block's "More" action button, so it is not duplicated in the header.
 *
 * ALL content is PLACEHOLDER (`COMMUNITY_DATA`) — there is NO community/social
 * backend; nothing here is real. "Iron Collective", its members, posts,
 * contributors, events, and challenges are fabricated demo data. Author/member/
 * contributor/leader avatars use the Avatar composite with a display name (real
 * initials) — that is fine and NOT a pending asset. The current user's name for the
 * header avatar comes from the placeholder profile (`getSelfProfile`).
 *
 * Pending-asset (NOT fabricated — rendered as graceful bronze/charcoal geometry):
 * the community cover banner, the community crest, and the form-check post video.
 * Each is flagged inline where it renders.
 *
 * Deferred to follow-up sub-phases (noted here, not faked): the Community Switcher
 * sheet, the Notifications/Overflow sheet + notification prefs, the Toast, the post
 * Composer, Post Detail, Discover Communities, Edit Community, the member directory,
 * Program Detail / external creator pages, the scroll-driven banner parallax, and
 * the coach marks. Every engagement control (respect / comment / save / share /
 * RSVP / interested / join) and every tap to an unbuilt destination is inert
 * (`() => {}` with a comment naming the destination), consistent with Home/Workouts/
 * Legacy.
 */

type TabId = 'feed' | 'events' | 'comps' | 'about';

const TABS: { id: TabId; label: string }[] = [
  { id: 'feed', label: 'Feed' },
  { id: 'events', label: 'Events' },
  { id: 'comps', label: 'Challenges' },
  { id: 'about', label: 'About' },
];

export default function CommunityScreen() {
  const profile = getSelfProfile();
  const data = COMMUNITY_DATA;
  const router = useRouter();
  const { openShare } = useShareSheet();
  const [tab, setTab] = useState<TabId>('feed');

  const feedPosts = getCommunityFeed();
  const openPost = (id: string) => router.push({ pathname: '/post/[id]', params: { id } });
  // Only genuine keepsakes (a PR) carry an SH-1 share kind; the rest show an inert share icon.
  const buildShare = (post: FeedPost) =>
    post.shareType ? () => openShare({ shareType: post.shareType!, overrides: { athlete: post.author } }) : undefined;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} />

      <AppBar
        title="Community"
        avatar={<Avatar name={profile.name} size="appBar" />}
        onAvatar={() => {
          // P-1 Profile / Account — not yet implemented.
        }}
        actions={
          <>
            <Pressable
              onPress={() => {
                // Discover Communities — not yet implemented.
              }}
              accessibilityRole="button"
              accessibilityLabel="Discover communities"
              style={styles.headerBtn}
              hitSlop={8}
            >
              <SearchIcon />
            </Pressable>
            <Pressable
              onPress={() => {
                // Notifications / Overflow sheet — not yet implemented.
              }}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              style={styles.headerBtn}
              hitSlop={8}
            >
              <BellIcon />
              <View style={styles.unreadDot} />
            </Pressable>
          </>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── PENDING-ASSET cover banner — geometric bronze/charcoal placeholder, never a fabricated image ── */}
        <BannerPlaceholder />

        {/* ── IDENTITY BLOCK ── */}
        <IdentityBlock community={data.community} actions={data.actions} />

        {/* ── SEGMENTED TABS ── */}
        <View style={styles.tabsWrap}>
          <View style={styles.tabTrack}>
            {TABS.map((t) => (
              <TabButton key={t.id} label={t.label} active={tab === t.id} onPress={() => setTab(t.id)} />
            ))}
          </View>
        </View>

        {tab === 'feed' ? (
          <FeedTab
            shortcuts={data.composerShortcuts}
            selfName={profile.name}
            pinned={data.pinned}
            feedPosts={feedPosts}
            onOpenPost={openPost}
            buildShare={buildShare}
            challenges={data.activeChallenges}
            contributors={data.contributors}
          />
        ) : null}
        {tab === 'events' ? <EventsTab events={data.events} /> : null}
        {tab === 'comps' ? <ChallengesTab comps={data.competitions} /> : null}
        {tab === 'about' ? <AboutTab about={data.about} /> : null}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Banner + identity
// ─────────────────────────────────────────────────────────────────────────────

/** Community cover art is a per-community image that was never imported — this is a
 *  graceful bronze/charcoal geometric stand-in (pending-asset), not a fake photo. */
function BannerPlaceholder() {
  return (
    <View style={styles.banner}>
      <LinearGradient
        colors={['#191410', '#0E0B08'] as const}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Line x1="-20" y1="120" x2="180" y2="-40" stroke={flColor.bronze400} strokeWidth={1} opacity={0.1} />
        <Line x1="40" y1="180" x2="260" y2="-20" stroke={flColor.bronze400} strokeWidth={1} opacity={0.08} />
        <Line x1="160" y1="200" x2="420" y2="-40" stroke={flColor.bronze400} strokeWidth={1} opacity={0.06} />
        <Rect x="300" y="44" width="60" height="60" stroke={flColor.bronze400} strokeWidth={1} opacity={0.1} fill="none" transform="rotate(45 330 74)" />
      </Svg>
      {/* bottom scrim so the crest/name read clearly against the placeholder */}
      <LinearGradient
        colors={['rgba(5,5,5,0)', 'rgba(5,5,5,0.7)'] as const}
        locations={[0.4, 1] as const}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function IdentityBlock({ community, actions }: { community: Community; actions: CommunityAction[] }) {
  return (
    <View style={styles.identity}>
      <View style={styles.identityTopRow}>
        <CrestPlaceholder />
        <View style={styles.identityTextCol}>
          <Pressable
            onPress={() => {
              // Community Switcher sheet — not yet implemented.
            }}
            accessibilityRole="button"
            accessibilityLabel={`Switch community, currently ${community.name}`}
            style={styles.nameBtn}
          >
            <Text style={styles.communityName} numberOfLines={1}>
              {community.name}
            </Text>
            <View style={styles.nameChevron}>
              <ChevronDownIcon />
            </View>
          </Pressable>

          <View style={styles.categoryRow}>
            {community.categories.map((c) => (
              <View key={c.id} style={styles.categoryChip}>
                {c.icon === 'barbell' ? <BarbellIcon size={12} /> : <FlameIcon size={12} />}
                <Text style={styles.categoryText}>{c.label}</Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => {
              // Member directory — not yet implemented.
            }}
            accessibilityRole="button"
            accessibilityLabel={`${community.memberCountLabel} members`}
            style={styles.membersBtn}
          >
            <MembersIcon />
            <Text style={styles.membersText}>{community.memberCountLabel} Members</Text>
            <ChevronRightIcon size={13} color={flColor.gray600} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.tagline}>{community.tagline}</Text>

      <View style={styles.metaRow}>
        {community.metaItems.map((m) => (
          <MetaChip key={m.id} item={m} />
        ))}
      </View>

      <View style={styles.actionRow}>
        {actions.map((a) => (
          <ActionButton key={a.id} action={a} />
        ))}
      </View>
    </View>
  );
}

/** Community crest art was never imported — bronze glyph-in-ring placeholder
 *  (pending-asset), with an inert camera "edit" affordance. Not a fake photo. */
function CrestPlaceholder() {
  return (
    <View style={styles.crestWrap}>
      <View style={styles.crest}>
        <Svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />
        </Svg>
      </View>
      <Pressable
        onPress={() => {
          // Edit Community (crest upload) — not yet implemented.
        }}
        accessibilityRole="button"
        accessibilityLabel="Change community crest"
        style={styles.crestCamera}
        hitSlop={6}
      >
        <CameraIcon />
      </Pressable>
    </View>
  );
}

function MetaChip({ item }: { item: CommunityMetaItem }) {
  return (
    <View style={styles.metaChip}>
      {item.icon === 'globe' ? <GlobeIcon /> : null}
      {item.icon === 'clock' ? <ClockIcon size={13} /> : null}
      {item.icon === 'calendar' ? <CalendarGlyph size={13} /> : null}
      {item.icon === 'spark' ? <SparkIcon /> : null}
      <Text style={styles.metaText}>{item.label}</Text>
    </View>
  );
}

function ActionButton({ action }: { action: CommunityAction }) {
  return (
    <Pressable
      onPress={() => {
        // Invite / Share / Rules / More (overflow sheet) — not yet implemented.
      }}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      style={styles.actionBtn}
    >
      <View style={styles.actionIcon}>
        {action.id === 'invite' ? <InviteIcon /> : null}
        {action.id === 'share' ? <ShareIcon /> : null}
        {action.id === 'rules' ? <RulesIcon /> : null}
        {action.id === 'more' ? <MoreIcon /> : null}
      </View>
      <Text style={styles.actionLabel}>{action.label}</Text>
    </Pressable>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.tab, active ? styles.tabActive : null]}
    >
      {active ? (
        <LinearGradient
          colors={flGradient.bronzeMetallic.colors}
          locations={flGradient.bronzeMetallic.locations}
          start={flGradient.bronzeMetallic.start}
          end={flGradient.bronzeMetallic.end}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Text style={[styles.tabText, active ? styles.tabTextActive : styles.tabTextIdle]}>{label}</Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEED tab
// ─────────────────────────────────────────────────────────────────────────────

function FeedTab({
  shortcuts,
  selfName,
  pinned,
  feedPosts,
  onOpenPost,
  buildShare,
  challenges,
  contributors,
}: {
  shortcuts: ComposerShortcut[];
  selfName: string;
  pinned: PinnedAnnouncement;
  feedPosts: FeedPost[];
  onOpenPost: (id: string) => void;
  buildShare: (post: FeedPost) => (() => void) | undefined;
  challenges: ActiveChallenge[];
  contributors: Contributor[];
}) {
  return (
    <View style={styles.tabBody}>
      {/* composer entry — opens the deferred Composer */}
      <View style={styles.composer}>
        <Pressable
          onPress={() => {
            // Community Composer — not yet implemented.
          }}
          accessibilityRole="button"
          accessibilityLabel="Write a post"
          style={styles.composerTop}
        >
          <Avatar name={selfName} size="listRow" />
          <Text style={styles.composerPrompt}>What&apos;s on your mind?</Text>
        </Pressable>
        <View style={styles.composerShortcuts}>
          {shortcuts.map((s, i) => (
            <Pressable
              key={s.id}
              onPress={() => {
                // Community Composer (typed) — not yet implemented.
              }}
              accessibilityRole="button"
              accessibilityLabel={s.label}
              style={[styles.shortcut, i > 0 ? styles.shortcutDivider : null]}
            >
              <ShortcutIcon id={s.id} />
              <Text style={styles.shortcutLabel}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* pinned announcement */}
      <PinnedCard pinned={pinned} />

      {/* mixed post feed — the ONE shared FeedPostCard, community origin (save / RSVP / program
          CTA / presence lit up by its origin config), each tapping through to Post Detail */}
      <View style={styles.postStack}>
        {feedPosts.map((post) => (
          <FeedPostCard key={post.id} post={post} origin="community" onOpen={() => onOpenPost(post.id)} onShare={buildShare(post)} />
        ))}
      </View>

      {/* Active Challenges strip — Firewall-safe: entry only, no standings */}
      <View style={styles.feedSection}>
        <SectionHeader label="Active Challenges" action="View all" onAction={() => {}} />
        <View style={styles.stackTight}>
          {challenges.map((c) => (
            <ActiveChallengeCard key={c.id} challenge={c} />
          ))}
        </View>
      </View>

      {/* Top Contributors — contribution recognition, not performance */}
      <View style={styles.feedSection}>
        <SectionHeader label="Top Contributors" action="This Month" />
        <View style={styles.contribCard}>
          {contributors.map((c, i) => (
            <ContributorRow key={c.name} contributor={c} first={i === 0} />
          ))}
          <Pressable
            onPress={() => {
              // Contributor leaderboard — not yet implemented.
            }}
            accessibilityRole="button"
            accessibilityLabel="View leaderboard"
            style={styles.leaderboardBtn}
          >
            <Text style={styles.leaderboardText}>View Leaderboard</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function RoleBadge({ role }: { role: MemberRole }) {
  const owner = role === 'owner';
  return (
    <View style={[styles.roleBadge, owner ? styles.roleBadgeOwner : styles.roleBadgeMod]}>
      {owner ? <CrownIcon /> : <ShieldIcon size={9} />}
      <Text style={[styles.roleBadgeText, owner ? styles.roleTextOwner : styles.roleTextMod]}>
        {owner ? 'Owner' : 'Mod'}
      </Text>
    </View>
  );
}

/** Engagement controls are inert — reactions/comments are a deferred surface. */
function EngagementRow({ respectCount, commentCount }: { respectCount: number; commentCount: number }) {
  return (
    <View style={styles.engageRow}>
      <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Respect" style={styles.engageBtn}>
        <FlameIcon size={16} />
        <Text style={styles.engageText}>{respectCount}</Text>
      </Pressable>
      <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Comments" style={styles.engageBtn}>
        <CommentIcon />
        <Text style={styles.engageText}>{commentCount}</Text>
      </Pressable>
      <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Save" style={styles.engageBtn}>
        <BookmarkIcon />
      </Pressable>
      <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Share" style={styles.engageShare}>
        <ShareIcon />
      </Pressable>
    </View>
  );
}

function PinnedCard({ pinned }: { pinned: PinnedAnnouncement }) {
  return (
    <View style={styles.pinnedCard}>
      <View style={styles.pinnedHeader}>
        <PinIcon />
        <Text style={styles.pinnedEyebrow}>Pinned · Announcement</Text>
      </View>
      <View style={styles.pinnedBody}>
        <View style={styles.postAuthorRow}>
          <Avatar name={pinned.author} size="listRow" />
          <View style={styles.postAuthorText}>
            <View style={styles.postAuthorNameRow}>
              <Text style={styles.postAuthor} numberOfLines={1}>
                {pinned.author}
              </Text>
              <RoleBadge role={pinned.role} />
            </View>
            <Text style={styles.postTime}>{pinned.time}</Text>
          </View>
        </View>
        <Text style={styles.postText}>{pinned.body}</Text>
        <EngagementRow respectCount={pinned.respectCount} commentCount={pinned.commentCount} />
      </View>
    </View>
  );
}

function ActiveChallengeCard({ challenge }: { challenge: ActiveChallenge }) {
  return (
    <Pressable
      onPress={() => {
        // Challenge Detail (standings live inside the challenge) — not yet implemented.
      }}
      accessibilityRole="button"
      accessibilityLabel={challenge.title}
      style={styles.challengeStripCard}
    >
      <View style={styles.challengeStripTop}>
        <View style={styles.challengeIcon}>
          <BarbellIcon size={22} />
        </View>
        <View style={styles.challengeTextCol}>
          <Text style={styles.challengeTitle} numberOfLines={1}>
            {challenge.title}
          </Text>
          <View style={styles.challengeMetaRow}>
            <ClockIcon size={13} />
            <Text style={styles.challengeMeta}>
              {challenge.timeLeft} · {challenge.participants} participants
            </Text>
          </View>
        </View>
      </View>
      <ProgressBar value={challenge.pct} max={100} height={6} label={`${challenge.pct}% complete`} />
    </Pressable>
  );
}

function ContributorRow({ contributor, first }: { contributor: Contributor; first: boolean }) {
  return (
    <View style={[styles.contribRow, first ? null : styles.contribDivider]}>
      <Text style={[styles.contribRank, contributor.rank === 1 ? styles.contribRankTop : null]}>{contributor.rank}</Text>
      <Avatar name={contributor.name} size="listRow" />
      <View style={styles.contribTextCol}>
        <View style={styles.contribNameRow}>
          <Text style={styles.contribName} numberOfLines={1}>
            {contributor.name}
          </Text>
          {contributor.role ? <RoleBadge role={contributor.role} /> : null}
        </View>
        {contributor.distinction ? (
          <View style={styles.distinctionRow}>
            <LaurelIcon />
            <Text style={styles.distinctionText}>{contributor.distinction}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.contribRespect}>
        <FlameIcon size={14} />
        <Text style={styles.contribRespectText}>{contributor.respect}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS tab
// ─────────────────────────────────────────────────────────────────────────────

function EventsTab({ events }: { events: CommunityEvent[] }) {
  return (
    <View style={styles.tabBody}>
      <Text style={styles.tabEyebrow}>Upcoming</Text>
      <View style={styles.eventsStack}>
        {events.map((e) => (
          <View key={e.id} style={styles.eventListCard}>
            <View style={styles.eventListTop}>
              <DateChip month={e.month} day={e.day} large />
              <View style={styles.eventListText}>
                <Text style={styles.eventListTitle} numberOfLines={1}>
                  {e.title}
                </Text>
                <View style={styles.eventWhenRow}>
                  <ClockIcon size={13} />
                  <Text style={styles.eventListWhen}>{e.when}</Text>
                </View>
                <Text style={styles.eventListMeta}>
                  {e.going} going · hosted by {e.host}
                </Text>
              </View>
            </View>
            <View style={styles.eventBtnRow}>
              <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Going" style={styles.eventGoingBtn}>
                <Text style={styles.eventGoingText}>Going</Text>
              </Pressable>
              <Pressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Interested" style={styles.eventInterestedBtn}>
                <Text style={styles.eventInterestedText}>Interested</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGES tab
// ─────────────────────────────────────────────────────────────────────────────

function ChallengesTab({ comps }: { comps: Competition[] }) {
  return (
    <View style={styles.tabBody}>
      <View style={styles.firewallNote}>
        <ShieldIcon size={15} />
        <Text style={styles.firewallText}>
          Challenges are shared community goals — everyone works toward the same target. Any per-member standings stay
          inside the challenge, never in the feed.
        </Text>
      </View>
      <Text style={styles.tabEyebrow}>Community Challenges</Text>
      <View style={styles.eventsStack}>
        {comps.map((c) => {
          const open = c.state === 'open';
          return (
            <View key={c.id} style={styles.compCard}>
              <View style={styles.compTop}>
                <View style={styles.challengeIcon}>
                  {open ? <TargetIcon /> : <SwordsIcon />}
                </View>
                <View style={styles.compTextCol}>
                  <Text style={styles.compTitle} numberOfLines={1}>
                    {c.title}
                  </Text>
                  <Text style={styles.compType}>{c.type}</Text>
                  <View style={styles.challengeMetaRow}>
                    <ClockIcon size={13} />
                    <Text style={styles.challengeMeta}>
                      {c.window} · {c.participating} participating
                    </Text>
                  </View>
                </View>
                <Pill tone={open ? 'bronze' : 'muted'} size="sm">
                  {open ? 'Open' : 'Active'}
                </Pill>
              </View>
              <Pressable
                onPress={() => {
                  // Join / view challenge — standings live inside the challenge (not yet implemented).
                }}
                accessibilityRole="button"
                accessibilityLabel={open ? `Join ${c.title}` : `View ${c.title}`}
                style={[styles.compBtn, open ? styles.compBtnJoin : styles.compBtnView]}
              >
                {open ? <PlusIcon /> : <ChevronRightIcon size={15} color={flColor.bronze300} />}
                <Text style={styles.compBtnText}>{open ? 'Join Challenge' : 'View Challenge'}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ABOUT tab
// ─────────────────────────────────────────────────────────────────────────────

function AboutTab({ about }: { about: AboutInfo }) {
  return (
    <View style={styles.tabBody}>
      <View style={styles.aboutCard}>
        <Text style={styles.aboutText}>{about.text}</Text>
      </View>

      <View style={styles.statsCard}>
        {about.stats.map((s, i) => (
          <View key={s.id} style={[styles.statCol, i > 0 ? styles.statDivider : null]}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.aboutEyebrow}>Leadership</Text>
      <View style={styles.leaderCard}>
        {about.leaders.map((l, i) => (
          <View key={l.id} style={[styles.leaderRow, i > 0 ? styles.leaderDivider : null]}>
            <Avatar name={l.name} size="listRow" />
            <View style={styles.leaderTextCol}>
              <Text style={styles.leaderName}>{l.name}</Text>
              <Text style={styles.leaderSub}>{l.sub}</Text>
            </View>
            <RoleBadge role={l.role} />
          </View>
        ))}
      </View>

      <Text style={styles.aboutEyebrow}>Honors You Can Earn Here</Text>
      <View style={styles.leaderCard}>
        {about.honors.map((ho, i) => (
          <View key={ho.id} style={[styles.honorRow, i > 0 ? styles.leaderDivider : null, ho.earned ? null : styles.honorLocked]}>
            <View style={[styles.honorIcon, ho.earned ? styles.honorIconEarned : null]}>
              <HonorGlyph earned={ho.earned} />
            </View>
            <View style={styles.leaderTextCol}>
              <Text style={styles.honorName}>{ho.name}</Text>
              <Text style={styles.leaderSub}>{ho.desc}</Text>
            </View>
            {ho.earned ? <CheckIcon /> : null}
          </View>
        ))}
      </View>

      <View style={styles.aboutButtons}>
        <Pressable
          onPress={() => {
            // Report Community — not yet implemented.
          }}
          accessibilityRole="button"
          accessibilityLabel="Report community"
          style={styles.aboutBtn}
        >
          <Text style={styles.aboutBtnText}>Report Community</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            // Leave Community — not yet implemented.
          }}
          accessibilityRole="button"
          accessibilityLabel="Leave community"
          style={styles.aboutBtn}
        >
          <Text style={styles.aboutBtnLeaveText}>Leave Community</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DateChip({ month, day, large = false }: { month: string; day: string; large?: boolean }) {
  return (
    <View style={[styles.dateChip, large ? styles.dateChipLarge : null]}>
      <Text style={styles.dateMonth}>{month}</Text>
      <Text style={[styles.dateDay, large ? styles.dateDayLarge : null]}>{day}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline glyphs (Forged DNA — square/round joins per structural intent)
// ─────────────────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={flColor.cream100} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={10.5} cy={10.5} r={6} />
      <Path d="M15 15l5 5" />
    </Svg>
  );
}
function BellIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={flColor.cream100} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <Path d="M10 20a2 2 0 0 0 4 0" />
    </Svg>
  );
}
function ChevronDownIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}
function BarbellIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />
    </Svg>
  );
}
function FlameIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1 0-1 .5-2 1.5 1.5 2.5 3.5 2.5 5.5a5 5 0 0 1-10 0C7 12 10 9 12 3z" />
    </Svg>
  );
}
function MembersIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={7} r={2.3} />
      <Circle cx={6} cy={10} r={2} />
      <Circle cx={18} cy={10} r={2} />
      <Path d="M8.6 17.5a3.5 3.5 0 0 1 6.8 0M2.8 17a3 3 0 0 1 4.4-2.4M21.2 17a3 3 0 0 0-4.4-2.4" />
    </Svg>
  );
}
function GlobeIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M3.5 12h17M12 3.5c2.4 2.3 3.7 5.3 3.7 8.5S14.4 18.2 12 20.5c-2.4-2.3-3.7-5.3-3.7-8.5S9.6 5.8 12 3.5z" />
    </Svg>
  );
}
function ClockIcon({ size = 13 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 7.5v5l3.2 2" />
    </Svg>
  );
}
function CalendarGlyph({ size = 13 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={6} width={16} height={14} />
      <Path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </Svg>
  );
}
function SparkIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 4l2.2 5.6L20 12l-5.8 2.4L12 20l-2.2-5.6L4 12l5.8-2.4z" />
    </Svg>
  );
}
function CameraIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
      <Circle cx={12} cy={13.5} r={3} />
    </Svg>
  );
}
function InviteIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 11a3.4 3.4 0 1 0 0-6.8A3.4 3.4 0 0 0 9 11zM2.8 19a6.2 6.2 0 0 1 12.4 0M18 8v6M15 11h6" />
    </Svg>
  );
}
function ShareIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray400} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={18} cy={5} r={2.5} />
      <Circle cx={6} cy={12} r={2.5} />
      <Circle cx={18} cy={19} r={2.5} />
      <Path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6" />
    </Svg>
  );
}
function RulesIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 4h11a1.6 1.6 0 0 1 1.6 1.6V20H7.6A1.6 1.6 0 0 0 6 21.6zM6 4v17.6M9.5 8.5h6M9.5 12h6" />
    </Svg>
  );
}
function MoreIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 12h5M15 12h5M12 4l2.4 5.2L20 10l-4 3.6L17 20l-5-2.8L7 20l1-6.4L4 10l5.6-.8z" />
    </Svg>
  );
}
function ShortcutIcon({ id }: { id: ComposerShortcut['id'] }) {
  if (id === 'photo') {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <Rect x={4} y={5} width={16} height={14} />
        <Path d="M4 16l4.5-4.5 3.5 3.5 3-3 5 5" />
        <Circle cx={8.5} cy={8.7} r={1.3} />
      </Svg>
    );
  }
  if (id === 'video') {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
        <Rect x={3.5} y={7} width={11} height={10} />
        <Path d="M14.5 10.2l6-3.2v10l-6-3.2z" />
      </Svg>
    );
  }
  if (id === 'training') return <BarbellIcon size={18} />;
  if (id === 'achievement') {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M7 5h10v3a5 5 0 0 1-10 0zM7 6H4v1.5a3.5 3.5 0 0 0 3.5 3.5M17 6h3v1.5A3.5 3.5 0 0 1 16.5 11M9.5 14h5M12 11v3M8.5 18.5h7" />
      </Svg>
    );
  }
  return <CalendarGlyph size={18} />;
}
function PinIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill={flColor.bronze300}>
      <Path d="M9 3h6l-1 6 3 2.5V14h-4v6l-1 1-1-1v-6H6v-2.5L9 9z" />
    </Svg>
  );
}
function CrownIcon() {
  return (
    <Svg width={9} height={9} viewBox="0 0 24 24" fill={flColor.bronze300}>
      <Path d="M3 8l4 3.5L12 5l5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </Svg>
  );
}
function ShieldIcon({ size = 15 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
    </Svg>
  );
}
function CommentIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.3-4A7.5 7.5 0 1 1 20 11.5z" />
    </Svg>
  );
}
function BookmarkIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.gray600} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 4h12v16l-6-4-6 4z" />
    </Svg>
  );
}
function LaurelIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 4v16M8 6c-3 1-4 4-4 7s2 5 4 5M16 6c3 1 4 4 4 7s-2 5-4 5" />
    </Svg>
  );
}
function TargetIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={8.5} />
      <Circle cx={12} cy={12} r={4.5} />
      <Circle cx={12} cy={12} r={1} />
    </Svg>
  );
}
function SwordsIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 4v6a6 6 0 0 0 12 0V4M12 16v4M8.5 20h7" />
    </Svg>
  );
}
function PlusIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2.2} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function CheckIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.greenMuted} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4 4 10-10" />
    </Svg>
  );
}
function HonorGlyph({ earned }: { earned: boolean }) {
  const color = earned ? flColor.bronze300 : flColor.gray600;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={9} r={5} />
      <Path d="M8.5 13l-1.5 7 5-3 5 3-1.5-7" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // header actions
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: flRadius.round,
  },
  unreadDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: flRadius.round,
    backgroundColor: flColor.bronze300,
  },

  scroll: { paddingBottom: 44 },

  // banner (pending-asset cover)
  banner: {
    height: 150,
    overflow: 'hidden',
    backgroundColor: flColor.charcoal900,
  },

  // identity block
  identity: { paddingHorizontal: 20 },
  identityTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 13,
    marginTop: -32,
  },
  crestWrap: {
    width: 80,
    height: 80,
    borderRadius: flRadius.round,
    borderWidth: 2.5,
    borderColor: flColor.bronze400,
    boxShadow: flShadow.missionCard,
  },
  crest: {
    flex: 1,
    borderRadius: flRadius.round,
    backgroundColor: flColor.charcoal900,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  crestCamera: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 23,
    height: 23,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityTextCol: { flex: 1, minWidth: 0, paddingBottom: 4 },
  nameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingVertical: 5,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: 'rgba(10,10,10,0.34)',
  },
  communityName: {
    flexShrink: 1,
    fontFamily: flFont.display,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: flColor.cream100,
  },
  nameChevron: {
    flexShrink: 0,
    width: 23,
    height: 23,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.bronzeTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  categoryText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2, color: flColor.gray400 },
  membersBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, alignSelf: 'flex-start' },
  membersText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },

  tagline: { fontSize: 13.5, lineHeight: 20, color: flColor.gray400, marginTop: 11 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 9, marginTop: 10, rowGap: 6 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 11.5, color: flColor.gray600 },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal700,
    backgroundColor: flColor.base,
  },
  actionIcon: { height: 20, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 10, fontWeight: '600', color: flColor.gray600 },

  // tabs
  tabsWrap: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 4 },
  tabTrack: {
    flexDirection: 'row',
    gap: 4,
    padding: 3,
    borderRadius: flRadius.pill,
    backgroundColor: flColor.charcoal800,
  },
  tab: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: flRadius.pill,
  },
  tabActive: { boxShadow: '0 1px 8px rgba(186, 134, 84,0.4)' },
  tabText: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.2 },
  tabTextActive: { color: '#1A1206' },
  tabTextIdle: { color: flColor.gray400 },

  // tab body
  tabBody: { paddingHorizontal: 20, paddingTop: 12 },
  tabEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: flColor.bronze400,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  feedSection: { marginTop: 24 },
  stackTight: { gap: 10 },

  // composer
  composer: {
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
    overflow: 'hidden',
    boxShadow: flShadow.card,
  },
  composerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 15 },
  composerPrompt: { flex: 1, minWidth: 0, fontSize: 13.5, color: flColor.gray600 },
  composerShortcuts: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  shortcut: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 11, paddingHorizontal: 2 },
  shortcutDivider: { borderLeftWidth: 1, borderLeftColor: flColor.charcoal700 },
  shortcutLabel: { fontSize: 10, fontWeight: '600', color: flColor.gray600 },

  // post feed stack + pinned-announcement author block (the mixed feed now renders the shared
  // FeedPostCard; these remaining keys are used by PinnedCard)
  postStack: { gap: 12, marginTop: 14 },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  postAuthorText: { flex: 1, minWidth: 0 },
  postAuthorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  postAuthor: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  postTime: { fontSize: 11.5, color: flColor.gray600 },
  postText: { fontSize: 14, lineHeight: 21, color: flColor.cream100, marginTop: 10 },

  // role badge
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: flRadius.pill,
    borderWidth: 1,
  },
  roleBadgeOwner: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  roleBadgeMod: { borderColor: flColor.bronzeBorderSubtle, backgroundColor: 'rgba(186, 134, 84,0.08)' },
  roleBadgeText: { fontSize: 9.5, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  roleTextOwner: { color: flColor.bronze300 },
  roleTextMod: { color: flColor.bronze400 },

  // engagement
  engageRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 12 },
  engageBtn: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  engageText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  engageShare: { marginLeft: 'auto' },

  // pinned
  pinnedCard: {
    marginTop: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    overflow: 'hidden',
    boxShadow: flShadow.card,
  },
  pinnedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: flColor.bronzeBorderSubtle,
    backgroundColor: 'rgba(186, 134, 84,0.06)',
  },
  pinnedEyebrow: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.bronze400,
  },
  pinnedBody: { padding: 15 },

  // event "when" row — shared by the Events tab list cards
  eventWhenRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventWhen: { fontSize: 11.5, color: flColor.gray400 },

  // date chip
  dateChip: {
    width: 48,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: flRadius.sm,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
  },
  dateChipLarge: { width: 52, height: 56 },
  dateMonth: { fontSize: 9, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze300 },
  dateDay: { fontFamily: flFont.display, fontSize: 22, fontWeight: '700', color: flColor.cream100, lineHeight: 24 },
  dateDayLarge: { fontSize: 23 },

  // active challenge strip
  challengeStripCard: {
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
    padding: 15,
    gap: 12,
    boxShadow: flShadow.card,
  },
  challengeStripTop: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  challengeIcon: {
    width: 46,
    height: 46,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeTextCol: { flex: 1, minWidth: 0, gap: 3 },
  challengeTitle: { fontFamily: flFont.display, fontSize: 15.5, fontWeight: '600', color: flColor.cream100 },
  challengeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  challengeMeta: { fontSize: 11.5, color: flColor.gray600 },

  // contributors
  contribCard: {
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
    overflow: 'hidden',
    boxShadow: flShadow.card,
  },
  contribRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 15 },
  contribDivider: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  contribRank: {
    width: 18,
    textAlign: 'center',
    fontFamily: flFont.display,
    fontSize: 15,
    fontWeight: '700',
    color: flColor.gray600,
  },
  contribRankTop: { color: flColor.bronze300 },
  contribTextCol: { flex: 1, minWidth: 0, gap: 2 },
  contribNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  contribName: { flexShrink: 1, fontSize: 14, color: flColor.cream100 },
  distinctionRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  distinctionText: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.2, color: flColor.bronze400 },
  contribRespect: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contribRespectText: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },
  leaderboardBtn: {
    paddingVertical: 13,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
  },
  leaderboardText: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },

  // events tab
  eventsStack: { gap: 12 },
  eventListCard: {
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
    padding: 15,
    boxShadow: flShadow.card,
  },
  eventListTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  eventListText: { flex: 1, minWidth: 0, gap: 3 },
  eventListTitle: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  eventListWhen: { fontSize: 12, color: flColor.gray400 },
  eventListMeta: { fontSize: 11.5, color: flColor.gray600 },
  eventBtnRow: { flexDirection: 'row', gap: 9, marginTop: 13 },
  eventGoingBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.bronzeTint,
  },
  eventGoingText: { fontSize: 13, fontWeight: '600', color: flColor.bronze300 },
  eventInterestedBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: 'transparent',
  },
  eventInterestedText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },

  // challenges tab
  firewallNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    marginBottom: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal700,
    backgroundColor: flColor.base,
  },
  firewallText: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 18, color: flColor.gray400 },
  compCard: {
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
    padding: 15,
    boxShadow: flShadow.card,
  },
  compTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  compTextCol: { flex: 1, minWidth: 0, gap: 3 },
  compTitle: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  compType: { fontSize: 12, color: flColor.gray400 },
  compBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 13,
    paddingVertical: 12,
    borderRadius: flRadius.md,
    borderWidth: 1,
  },
  compBtnJoin: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  compBtnView: { borderColor: flColor.bronzeBorder, backgroundColor: 'transparent' },
  compBtnText: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },

  // about tab
  aboutCard: {
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
    padding: 15,
    boxShadow: flShadow.card,
  },
  aboutText: { fontSize: 13.5, lineHeight: 22, color: flColor.gray400 },
  statsCard: {
    flexDirection: 'row',
    marginTop: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
    overflow: 'hidden',
    boxShadow: flShadow.card,
  },
  statCol: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 15, paddingHorizontal: 6 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: flColor.charcoal700 },
  statValue: { fontFamily: flFont.display, fontSize: 19, fontWeight: '700', color: flColor.cream100, lineHeight: 20 },
  statLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    textAlign: 'center',
    color: flColor.bronze400,
  },
  aboutEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: flColor.bronze400,
    marginTop: 22,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  leaderCard: {
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
    backgroundColor: flColor.charcoal900,
    overflow: 'hidden',
    boxShadow: flShadow.card,
  },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12, paddingHorizontal: 14 },
  leaderDivider: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  leaderTextCol: { flex: 1, minWidth: 0, gap: 2 },
  leaderName: { fontSize: 14.5, color: flColor.cream100 },
  leaderSub: { fontSize: 12, color: flColor.gray600 },
  honorRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12, paddingHorizontal: 14 },
  honorLocked: { opacity: 0.62 },
  honorIcon: {
    width: 38,
    height: 38,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  honorIconEarned: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  honorName: { fontSize: 14, fontWeight: '500', color: flColor.cream100 },
  aboutButtons: { gap: 10, marginTop: 22 },
  aboutBtn: {
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: 'transparent',
  },
  aboutBtnText: { fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },
  aboutBtnLeaveText: { fontSize: 13.5, fontWeight: '600', color: flColor.redMuted },
});
