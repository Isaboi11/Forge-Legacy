import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { SquadCrest } from '@/components/forge/SquadCrest';
import { fetchNotifications, markNotificationsSeen, type ForgeNotification } from '@/data/notifications-live';
import { destinationFor } from '@/domain/notifications/destination';
import { useQuery } from '@/lib/useQuery';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';

/**
 * Notifications — what has happened to you, newest first.
 *
 * NO `.dc` EXISTS FOR THIS SCREEN. `Forge Notifications.dc.html` is the P-5 push-preference set
 * (`/notifications`), not an inbox. This was authored to the app's established language rather than
 * invented: the slate ground and AppBar of every pushed screen; the bronze uppercase section labels
 * (11px / 1.6 tracking) used on Discover, Preview and Join Requests; the divided card those screens
 * use for lists; the 46px leading identity slot from the Join Requests row; and the 76px ringed disc +
 * Playfair 21 empty state, copied in proportion from Join Requests so the two read as siblings.
 *
 * Two things it does NOT borrow: no badges or counts on rows (the count belongs on the bell that got
 * you here), and no per-item dismiss — read state is one line in time (`notifications_seen_at`), so
 * "unread" is a bronze wash and a dot, and opening the screen moves the line.
 *
 * Every row is a real fact — a pending request, a membership, a decision — read at query time rather
 * than a stored notification, so nothing here can survive the thing it describes. See migration 0054.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Relative time, terse — this sits at the end of a row and must never wrap. */
function shortAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < MINUTE) return 'now';
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)}m`;
  if (ms < DAY) return `${Math.floor(ms / HOUR)}h`;
  if (ms < 7 * DAY) return `${Math.floor(ms / DAY)}d`;
  return `${Math.floor(ms / (7 * DAY))}w`;
}

/** Today · This Week · Earlier — the app groups by chapter elsewhere; time is this screen's chapter. */
function bucketOf(iso: string): 'Today' | 'This Week' | 'Earlier' {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < DAY) return 'Today';
  if (ms < 7 * DAY) return 'This Week';
  return 'Earlier';
}

const BUCKETS = ['Today', 'This Week', 'Earlier'] as const;

export default function InboxScreen() {
  const router = useRouter();
  const { data, loading, error, refetch } = useQuery(() => fetchNotifications(), []);

  // Mark seen only AFTER the items have resolved, so the rows you're looking at keep the bronze wash
  // that tells you what was new. The line moves for next time, not for this visit. A ref, not state —
  // this guards a one-shot side effect and nothing re-renders because of it.
  const seenMarked = useRef(false);
  useEffect(() => {
    if (!data || seenMarked.current) return;
    seenMarked.current = true;
    void markNotificationsSeen();
  }, [data]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const grouped = useMemo(() => {
    const items = data ?? [];
    return BUCKETS.map((label) => ({ label, items: items.filter((n) => bucketOf(n.at) === label) })).filter((g) => g.items.length > 0);
  }, [data]);

  // Shared with push tap-through (0120) so a notification and the feed row that mirrors it cannot land
  // in different places. The per-kind reasoning moved with it into `destinationFor`.
  const open = (n: ForgeNotification) => router.push(destinationFor(n));

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Notifications" serif onBack={goBack} />

      {loading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.missingTitle}>Couldn’t load notifications.</Text>
          <Text style={styles.missingBody}>{error}</Text>
          <Pressable onPress={refetch} accessibilityRole="button" accessibilityLabel="Try again" style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>Try Again</Text>
          </Pressable>
        </View>
      ) : grouped.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyDisc}>
            <BellGlyph size={30} color={flColor.bronze300} />
          </View>
          <Text style={styles.emptyTitle}>Nothing New</Text>
          {/* Kept general rather than enumerated — it named squad join requests alone while the union
              grew to eleven kinds, and a list that has to be maintained will not be. */}
          <Text style={styles.emptyText}>Requests, invitations and what your squads are doing all land here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {grouped.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text style={styles.sectionLabel}>{group.label}</Text>
              <View style={styles.card}>
                {group.items.map((n, i) => (
                  <NotificationRow key={`${n.kind}-${n.squadId}-${n.actorId ?? 'squad'}-${n.shareId ?? n.inviteId ?? ''}-${n.at}`} notification={n} divided={i > 0} onPress={() => open(n)} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function NotificationRow({ notification: n, divided, onPress }: { notification: ForgeNotification; divided: boolean; onPress: () => void }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.timing(v, { toValue: 1, duration: 380, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [v]);

  const actor = n.actorName ?? 'An athlete';
  // The leading slot answers "who or what is this about" — the athlete when there is one, the squad
  // itself when the squad is the one who acted.
  const aboutAthlete =
    n.kind === 'join_request' ||
    n.kind === 'member_joined' ||
    n.kind === 'friend_request' ||
    n.kind === 'friend_accepted' ||
    n.kind === 'challenge_invite' ||
    n.kind === 'workout_invite' ||
    n.kind === 'workout_join_request' ||
    n.kind === 'squad_post' ||
    n.kind === 'squad_checkin' ||
    n.kind === 'program_shared' ||
    // A person commented or reacted, even when the post they answered lives in a squad (0135).
    n.kind === 'post_comment' ||
    n.kind === 'post_reaction' ||
    // 0153. A squad-mate trained. The squad is only the reason we are told — the row is about them.
    n.kind === 'squad_training_started' ||
    n.kind === 'squad_training_finished';

  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabelFor(n, actor)}
        style={({ pressed }) => [styles.row, divided ? styles.rowDivided : null, n.unread ? styles.rowUnread : null, pressed ? styles.rowPressed : null]}
      >
        <View style={styles.lead}>
          {aboutAthlete ? (
            <Avatar src={n.actorAvatarUrl ?? undefined} name={actor} size={46} />
          ) : (
            <View style={styles.crest}>
              {n.squadPhotoUrl ? <Image source={{ uri: n.squadPhotoUrl }} style={styles.crestPhoto} contentFit="cover" /> : <SquadCrest crest={n.squadCrest} size={22} color={flColor.bronze300} />}
            </View>
          )}
          <View style={styles.kindDisc}>{glyphFor(n.kind)}</View>
        </View>

        <View style={styles.body}>
          <Text style={styles.line}>{bodyFor(n, actor)}</Text>
          <Text style={styles.sub}>{subFor(n)}</Text>
        </View>

        <View style={styles.trail}>
          <Text style={styles.time}>{shortAgo(n.at)}</Text>
          {n.unread ? <View style={styles.unreadDot} /> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** The sentence, with the proper nouns carrying the weight. */
function bodyFor(n: ForgeNotification, actor: string) {
  switch (n.kind) {
    case 'join_request':
      return (
        <>
          <Text style={styles.strong}>{actor}</Text> asked to join <Text style={styles.strong}>{n.squadName}</Text>
        </>
      );
    case 'member_joined':
      return (
        <>
          <Text style={styles.strong}>{actor}</Text> joined <Text style={styles.strong}>{n.squadName}</Text>
        </>
      );
    case 'request_approved':
      return (
        <>
          You joined <Text style={styles.strong}>{n.squadName}</Text>
        </>
      );
    case 'request_declined':
      // Anti-shame: state the outcome, never the judgement.
      return (
        <>
          Your request to <Text style={styles.strong}>{n.squadName}</Text> wasn’t accepted
        </>
      );
    case 'friend_request':
      return (
        <>
          <Text style={styles.strong}>{actor}</Text> wants to be friends
        </>
      );
    case 'friend_accepted':
      return (
        <>
          <Text style={styles.strong}>{actor}</Text> accepted your request
        </>
      );
    case 'challenge_invite':
      return (
        <>
          <Text style={styles.strong}>{actor}</Text> challenged you to <Text style={styles.strong}>{n.challengeName ?? 'a competition'}</Text>
        </>
      );
    case 'workout_invite':
      return (
        <>
          <Text style={styles.strong}>{actor}</Text> wants to train <Text style={styles.strong}>{n.inviteName ?? 'together'}</Text> with you
        </>
      );
    case 'workout_join_request':
      return (
        <>
          <Text style={styles.strong}>{actor}</Text> wants to join your workout
        </>
      );
    case 'program_shared':
      return (
        <>
          <Text style={styles.strong}>{actor}</Text> sent you <Text style={styles.strong}>{n.shareName ?? 'a program'}</Text>
        </>
      );
    case 'squad_post':
      return (
        <>
          <Text style={styles.strong}>{actor}</Text> posted in <Text style={styles.strong}>{n.squadName}</Text>
        </>
      );
    case 'squad_checkin':
      return (
        <>
          <Text style={styles.strong}>{actor}</Text> checked in to <Text style={styles.strong}>{n.squadName}</Text>
        </>
      );
    /* No actor, so no name to lead with — this is the one kind the SQUAD is the author of. Naming an
       athlete here would invent a person who wrote a summary nobody wrote. */
    case 'squad_recap':
      return (
        <>
          The weekly review for <Text style={styles.strong}>{n.squadName}</Text> is in
        </>
      );
    /* "your post", not the post's name — a post has no title, and quoting its opening words would put
       somebody else's half-sentence in a row that is supposed to be about what THEY did. */
    case 'post_comment':
      return (
        <>
          <Text style={styles.strong}>{actor}</Text> commented on your post
        </>
      );
    case 'post_reaction':
      return (
        <>
          <Text style={styles.strong}>{actor}</Text> reacted to your post
        </>
      );
    /* Present tense, and the squad named, because both are load-bearing. "is training" is the only
       sentence in this list describing something still happening — the row is an invitation, and the
       tense is what says so. And an athlete in three squads is told which one this came from, since
       that is the setting they would go and change. */
    case 'squad_training_started':
      return (
        <>
          <Text style={styles.strong}>{actor}</Text> is training in <Text style={styles.strong}>{n.squadName}</Text>
        </>
      );
    case 'squad_training_finished':
      return (
        <>
          <Text style={styles.strong}>{actor}</Text> finished a workout in <Text style={styles.strong}>{n.squadName}</Text>
        </>
      );
  }
}

function subFor(n: ForgeNotification): string {
  switch (n.kind) {
    case 'join_request':
      return 'Review the request';
    case 'member_joined':
      return 'Say hello in the squad';
    case 'request_approved':
      return 'Open your new squad';
    case 'request_declined':
      return 'Find another squad';
    case 'friend_request':
      return 'Open their profile to accept';
    case 'friend_accepted':
      return 'You’re now friends';
    case 'challenge_invite':
      return 'Opt in to compete';
    case 'workout_invite':
      return 'Accept and start';
    case 'workout_join_request':
      return 'They’re training now — answer while they are';
    case 'program_shared':
      return 'Read it before you take it';
    case 'squad_post':
      return 'Open the squad';
    case 'squad_checkin':
      // Check-ins expire after 24 hours (`checkinCutoff`), so the call to action is the deadline.
      return 'Watch it before it’s gone';
    case 'squad_recap':
      return 'See how the squad’s week went';
    case 'post_comment':
      return 'Read it and reply';
    case 'post_reaction':
      return 'Open your post';
    // The only sub-line in this list that is an offer rather than a description of where the tap goes.
    case 'squad_training_started':
      return 'Ask to join them';
    case 'squad_training_finished':
      return 'See what they did';
  }
}

function accessibilityLabelFor(n: ForgeNotification, actor: string): string {
  const when = shortAgo(n.at);
  switch (n.kind) {
    case 'join_request':
      return `${actor} asked to join ${n.squadName}, ${when} ago. Review the request.`;
    case 'member_joined':
      return `${actor} joined ${n.squadName}, ${when} ago.`;
    case 'request_approved':
      return `You joined ${n.squadName}, ${when} ago.`;
    case 'request_declined':
      return `Your request to ${n.squadName} wasn’t accepted, ${when} ago.`;
    case 'friend_request':
      return `${actor} wants to be friends, ${when} ago. Open their profile to accept.`;
    case 'friend_accepted':
      return `${actor} accepted your friend request, ${when} ago.`;
    case 'challenge_invite':
      return `${actor} challenged you to ${n.challengeName ?? 'a competition'}, ${when} ago. Opt in to compete.`;
    case 'workout_invite':
      return `${actor} wants to train ${n.inviteName ?? 'together'} with you, ${when} ago. Accept and start.`;
    case 'workout_join_request':
      return `${actor} wants to join your workout, ${when} ago. They are training now.`;
    case 'program_shared':
      return `${actor} sent you the program ${n.shareName ?? 'a program'}, ${when} ago. Read it before you take it.`;
    case 'squad_post':
      return `${actor} posted in ${n.squadName}, ${when} ago. Open the squad.`;
    case 'squad_checkin':
      return `${actor} checked in to ${n.squadName}, ${when} ago. Watch it before it expires.`;
    case 'squad_recap':
      return `The weekly review for ${n.squadName} is in, ${when} ago. See how the squad's week went.`;
    case 'post_comment':
      return `${actor} commented on your post, ${when} ago. Read it and reply.`;
    case 'post_reaction':
      return `${actor} reacted to your post, ${when} ago. Open your post.`;
    case 'squad_training_started':
      return `${actor} is training in ${n.squadName}, started ${when} ago. Ask to join them.`;
    case 'squad_training_finished':
      return `${actor} finished a workout in ${n.squadName}, ${when} ago. See what they did.`;
  }
}

function glyphFor(kind: ForgeNotification['kind']) {
  switch (kind) {
    case 'join_request':
      return <PlusGlyph size={11} color={flColor.bronze300} />;
    case 'member_joined':
      return <PeopleGlyph size={11} color={flColor.bronze300} />;
    case 'request_approved':
      return <CheckGlyph size={11} color="#8FB295" />;
    case 'request_declined':
      return <XGlyph size={11} color={flColor.gray600} />;
    case 'friend_request':
      return <PlusGlyph size={11} color={flColor.bronze300} />;
    case 'friend_accepted':
      return <CheckGlyph size={11} color="#8FB295" />;
    case 'challenge_invite':
      return <SwordsGlyph size={11} color={flColor.bronze300} />;
    case 'workout_invite':
      return <PeopleGlyph size={11} color={flColor.bronze300} />;
    case 'workout_join_request':
      return <PlusGlyph size={11} color={flColor.bronze300} />;
    case 'program_shared':
      return <ProgramGlyph size={11} color={flColor.bronze300} />;
    case 'squad_post':
      return <PeopleGlyph size={11} color={flColor.bronze300} />;
    case 'squad_checkin':
      return <PlayGlyph size={11} color={flColor.bronze300} />;
    /* The page glyph, not the people one: a weekly review is a document about the squad, and the
       people glyph is what `squad_post` uses for a person posting in it. */
    case 'squad_recap':
      return <ProgramGlyph size={11} color={flColor.bronze300} />;
    case 'post_comment':
      return <SpeechGlyph size={11} color={flColor.bronze300} />;
    case 'post_reaction':
      return <HeartGlyph size={11} color={flColor.bronze300} />;
    /* The play glyph for a start — the same mark `squad_checkin` uses for something live and expiring,
       which is exactly what this is. A finish takes the check, because it is done. */
    case 'squad_training_started':
      return <PlayGlyph size={11} color={flColor.bronze300} />;
    case 'squad_training_finished':
      return <CheckGlyph size={11} color="#8FB295" />;
  }
}

/** A page with lines on it — the plan, as distinct from the people glyphs the invites use. */
function ProgramGlyph({ size = 11, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 3h9l4 4v14H6z" />
      <Path d="M9 11h7M9 15h7" />
    </Svg>
  );
}

function SwordsGlyph({ size = 11, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14.5 14.5L21 21M19 3l-9 9M5 3l9 9M9.5 14.5L3 21" />
    </Svg>
  );
}

// ── glyphs ──
function BellGlyph({ size = 20, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3a6 6 0 0 0-6 6c0 4-1.5 5.5-2 6h16c-.5-.5-2-2-2-6a6 6 0 0 0-6-6z" />
      <Path d="M10 19a2 2 0 0 0 4 0" />
    </Svg>
  );
}
function PlusGlyph({ size = 11, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function CheckGlyph({ size = 11, color = '#8FB295' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4 4 10-10" />
    </Svg>
  );
}
function XGlyph({ size = 11, color = flColor.gray600 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 6l12 12" />
      <Path d="M18 6L6 18" />
    </Svg>
  );
}
function PeopleGlyph({ size = 11, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={8} r={3.2} />
      <Path d="M3.4 19a5.6 5.6 0 0 1 11.2 0" />
      <Path d="M16 5.3a3.2 3.2 0 0 1 0 5.4" />
      <Path d="M18.2 19a5.6 5.6 0 0 0-3-4.9" />
    </Svg>
  );
}
/** A check-in is a clip; the disc says so before the sentence does. */
function PlayGlyph({ size = 11, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <Path d="M8 5.5v13l11-6.5z" />
    </Svg>
  );
}
/** Somebody wrote something back (0135). */
function SpeechGlyph({ size = 11, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 14.5a2.5 2.5 0 0 1-2.5 2.5H9l-5 4V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5z" />
    </Svg>
  );
}
/** Filled, not outlined: a reaction is given, not pending. */
function HeartGlyph({ size = 11, color = flColor.bronze300 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <Path d="M12 20.5l-1.5-1.35C5.2 14.4 2 11.5 2 7.95 2 5.06 4.24 2.9 7 2.9c1.56 0 3.06.72 4 1.86.94-1.14 2.44-1.86 4-1.86 2.76 0 5 2.16 5 5.05 0 3.55-3.2 6.45-8.5 11.2z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  missingTitle: { fontFamily: flFont.display, fontSize: 19, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  missingBody: { marginTop: 9, fontSize: 13, lineHeight: 19, textAlign: 'center', color: flColor.gray400 },

  group: { marginBottom: 22 },
  sectionLabel: { marginBottom: 12, marginHorizontal: 4, fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  card: { overflow: 'hidden', backgroundColor: flColor.charcoal800, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, borderRadius: flRadius.lg, boxShadow: flShadow.card },

  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 14, paddingVertical: 13 },
  rowDivided: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  rowUnread: { backgroundColor: flColor.bronzeTint },
  rowPressed: { backgroundColor: flColor.charcoal700 },

  // leading identity — the athlete, or the squad when the squad is who acted
  lead: { position: 'relative', width: 46, height: 46, flexShrink: 0 },
  crest: {
    width: 46,
    height: 46,
    borderRadius: flRadius.round,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.surfaceRecessed,
    boxShadow: `0 0 0 1.5px ${flColor.bronze400}`,
  },
  crestPhoto: { width: '100%', height: '100%', borderRadius: flRadius.round },
  /** The event mark, riding the identity the way the design system rides presence dots. */
  kindDisc: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: flRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: flColor.charcoal900,
    borderWidth: 1.5,
    borderColor: flColor.charcoal800,
  },

  body: { flex: 1, minWidth: 0, gap: 3 },
  line: { fontSize: 13.5, lineHeight: 19, color: flColor.gray400 },
  strong: { color: flColor.cream100, fontWeight: '600' },
  sub: { fontSize: 11.5, color: flColor.gray600 },

  trail: { flexShrink: 0, alignItems: 'flex-end', gap: 7 },
  time: { fontSize: 11, color: flColor.gray600, fontVariant: ['tabular-nums'] },
  unreadDot: { width: 7, height: 7, borderRadius: flRadius.round, backgroundColor: flColor.bronze400, boxShadow: flShadow.glowSubtle },

  // empty
  emptyWrap: { flex: 1, alignItems: 'center', paddingTop: 104, paddingHorizontal: 26 },
  emptyDisc: {
    width: 76,
    height: 76,
    borderRadius: flRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: 'rgba(186, 134, 84,0.07)',
    boxShadow: flShadow.glowSubtle,
  },
  emptyTitle: { marginTop: 20, fontFamily: flFont.display, fontSize: 21, fontWeight: '600', letterSpacing: -0.2, textAlign: 'center', color: flColor.cream100 },
  emptyText: { marginTop: 9, fontSize: 13.5, lineHeight: 21, textAlign: 'center', color: flColor.gray400, maxWidth: 260 },

  outlineBtn: { marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorder },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.bronze300 },
});
