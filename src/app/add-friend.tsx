import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Avatar } from '@/components/forge/composites/Avatar';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTour } from '@/components/tour/ScreenTour';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { useTourScroller, useTourScrollTracker } from '@/hooks/useTourAnchors';
import { SCREEN_BG } from '@/constants/backgrounds';
import {
  acceptFriendRequest,
  fetchFriendLists,
  findAthleteByHandle,
  removeFriendship,
  requestFriend,
  type FriendSummary,
} from '@/data/friends-live';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flRadius, flShadow } from '@/constants/foundation';

/**
 * Add Friend by Handle — built to `Add Friend by Handle.dc.html`.
 *
 * The only way to reach an athlete you don't already share a squad with, and by SOC-D15 the only sanctioned
 * one: "Friend discovery is intentional. Discovery is always an act the athlete chooses, never a surface
 * the system populates."
 *
 * ── "PEOPLE YOU MAY KNOW" IS NOT BUILT ────────────────────────────────────────────────────────────────
 * The design has a suggestions section with four athletes under that heading. It is not a design call to
 * overrule — SOC-D15's never-list names it directly: "**Suggested Friends**, **'People You May Know,'**
 * mutual-friend recommendations, or any **discovery algorithm.**" §143 and DNA §10 bar the same thing, and
 * FR-D2/FR-D3 bar the social graph it would need to compute.
 *
 * This is the same category as the Follow button, not the same category as C-5's runner-up strip: a named
 * prohibition rather than a placement preference. And the design's own notes concede the four are
 * "decorative (no shared source, no mutual-friend logic behind it)" — so what it draws isn't the feature,
 * it's a picture of the feature. Building it for real would require exactly the graph traversal FR-D3's
 * privacy rule exists to prevent.
 *
 * Nothing stands in its place. An empty "no suggestions" panel would still assert that suggestions are a
 * thing this app does.
 *
 * ── WHAT ELSE CHANGED ─────────────────────────────────────────────────────────────────────────────────
 *
 * 1. REQUESTS CAN BE WITHDRAWN. The design's "Pending" chip is a `<span>` — inert, no cancel, no undo, and
 *    its store never moves a request into `added`, so no request is ever accepted and the list only grows.
 *    Withdrawing is the same erasure as declining (0073), so the chip is a real button.
 *
 * 2. INCOMING REQUESTS ARE HERE TOO — an addition, flagged. The design shows only what you have sent, which
 *    makes it half a mailbox: with our graph, requests arrive, and the only place to answer one was a
 *    notification you might already have marked seen. Both directions of the same list belong together.
 *
 * 3. HANDLES ARE BOUNDED. The design validates `/^[a-z0-9._]{2,}$/` — no upper limit, so a 200-character
 *    handle passes, and a 2-character one passes despite onboarding minting nothing shorter than 3. Matched
 *    to what a handle can actually be: 3–20 characters.
 *
 * 4. THE ERROR TOAST NO LONGER SHOWS AN INVITE ICON. The design uses `invite` for every outcome including
 *    failures, tinting it sage or bronze but never changing the glyph.
 *
 * THE INPUT IS PINNED, not scrolled. The design is a single scrolling column, which is fine at four
 * decorative suggestions and three fake requests — but with real lists of any length the Add field
 * scrolls away, and it is the only thing on the screen you came to use.
 *
 * Faithful: the `@` prefix as a live affordance that lights bronze exactly when the button arms, leading
 * `@`s stripped so `@@ada` normalizes, lowercase coercion, the four-way status cascade with its own icon
 * and colour per state, the armed/disarmed Add button, the bronze count badge on the requests header, and
 * the 220ms rise on rows.
 */

/** 3–20, letters/digits/dots/underscores — what `profiles.handle` can actually hold. */
const HANDLE_RE = /^[a-z0-9._]{3,20}$/;

export default function AddFriendScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data, loading, refetch } = useQuery(fetchFriendLists, []);

  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();
  const [found, setFound] = useState<Awaited<ReturnType<typeof findAthleteByHandle>> | null>(null);
  const [checked, setChecked] = useState<string | null>(null);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/friends'));

  // Strip any number of leading @ and lowercase, as the design does.
  const raw = query.trim().replace(/^@+/, '').toLowerCase();
  const valid = HANDLE_RE.test(raw);

  const lists = data ?? { friends: [], incoming: [], outgoing: [] };
  const existingFriend = lists.friends.find((f) => f.handle?.toLowerCase() === raw);
  const pendingOut = lists.outgoing.find((f) => f.handle?.toLowerCase() === raw);
  const pendingIn = lists.incoming.find((f) => f.handle?.toLowerCase() === raw);
  const armed = valid && !existingFriend && !pendingOut && !busy;

  // Look the handle up once it's well-formed, so the status line can name a real athlete rather than
  // promising a request to a handle that doesn't exist.
  useEffect(() => {
    // No clearing on the way out: every consumer gates on `checked === raw`, so a result from a previous
    // handle can never be read. Clearing here would also be a synchronous setState in an effect body,
    // which this project's react-compiler lint rejects — the guard is both cheaper and stricter.
    if (!valid) return undefined;
    let alive = true;
    const t = setTimeout(() => {
      findAthleteByHandle(raw).then(
        (r) => {
          if (!alive) return;
          setFound(r);
          setChecked(raw);
        },
        () => alive && setChecked(raw),
      );
    }, 320);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [raw, valid]);

  const send = (handle: string, athleteId?: string) => {
    if (busy) return;
    const target = athleteId ?? (checked === handle ? found?.id : undefined);
    if (!target) {
      showToast('No athlete has that handle');
      return;
    }
    setBusy(true);
    requestFriend(target).then(
      (state) => {
        setBusy(false);
        setQuery('');
        setFound(null);
        setChecked(null);
        showToast(state === 'friends' ? 'You’re now friends' : `Request sent to @${handle}`);
        refetch();
      },
      (e: unknown) => {
        setBusy(false);
        showToast(errorMessage(e));
      },
    );
  };

  const withdraw = (f: FriendSummary) => {
    if (busy) return;
    setBusy(true);
    removeFriendship(f.id).then(
      () => {
        setBusy(false);
        showToast('Request withdrawn');
        refetch();
      },
      (e: unknown) => {
        setBusy(false);
        showToast(errorMessage(e));
      },
    );
  };

  const accept = (f: FriendSummary) => {
    if (busy) return;
    setBusy(true);
    acceptFriendRequest(f.id).then(
      () => {
        setBusy(false);
        showToast(`You and ${f.name.split(' ')[0]} are friends`);
        refetch();
      },
      (e: unknown) => {
        setBusy(false);
        showToast(errorMessage(e));
      },
    );
  };

  const status = statusFor({ raw, valid, existingFriend, pendingOut, pendingIn, found, checked });

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.32)' }} />
      <AppBar title={<Text style={styles.barTitle}>Add Friend</Text>} onBack={goBack} />

      {/* ── FIXED. The one control on this screen must never scroll out from under you: the lists below can
              run to any length, and an Add field that disappears as you read them is the field you came for.
              Same pattern as Competition History's header. ── */}
      <View style={styles.pinned}>
        <Text style={styles.lede}>Friends are added by handle, one at a time. You’ll need to know theirs.</Text>

        {/* The @ prefix lights exactly when the button arms. */}
        <TourAnchor id="addfriend-search" style={[styles.inputRow, armed ? styles.inputRowArmed : null]}>
          <Text style={[styles.prefix, armed ? styles.prefixArmed : null]}>@</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => armed && send(raw)}
            placeholder="handle"
            placeholderTextColor={flColor.gray600}
            style={styles.input}
            accessibilityLabel="Athlete handle"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            maxLength={21}
            returnKeyType="send"
          />
          <Pressable
            onPress={() => send(raw)}
            disabled={!armed}
            accessibilityRole="button"
            accessibilityLabel="Send friend request"
            accessibilityState={{ disabled: !armed }}
            style={({ pressed }) => [styles.addBtn, armed ? styles.addBtnArmed : null, pressed && armed ? styles.pressed : null]}
          >
            {busy ? <ActivityIndicator size="small" color={flColor.bronze300} /> : <Text style={[styles.addBtnLabel, armed ? styles.addBtnLabelArmed : null]}>Add</Text>}
          </Pressable>
        </TourAnchor>

        <View style={styles.statusRow}>
          {status.icon}
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>
      </View>

      <ScrollView
        ref={tourScroller}
        onScroll={onTourScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Awaiting your answer. Not in the design; without it there is no surface to accept from. ── */}
        {lists.incoming.length > 0 ? (
          <Section label="Awaiting Your Answer" count={lists.incoming.length}>
            {lists.incoming.map((f, i) => (
              <PersonRow
                key={f.id}
                person={f}
                index={i}
                onOpen={() => router.push({ pathname: '/athlete/[id]', params: { id: f.id } })}
                action={
                  <Pressable onPress={() => accept(f)} disabled={busy} accessibilityRole="button" accessibilityLabel={`Accept ${f.name}`} style={({ pressed }) => [styles.rowBtn, styles.rowBtnArmed, pressed ? styles.pressed : null]}>
                    <Text style={styles.rowBtnLabelArmed}>Accept</Text>
                  </Pressable>
                }
              />
            ))}
          </Section>
        ) : null}

        {/* ── Requests sent. The design's chip is inert; this one withdraws. ── */}
        {lists.outgoing.length > 0 ? (
          <Section label="Requests Sent" count={lists.outgoing.length}>
            {lists.outgoing.map((f, i) => (
              <PersonRow
                key={f.id}
                person={f}
                index={i}
                onOpen={() => router.push({ pathname: '/athlete/[id]', params: { id: f.id } })}
                action={
                  <Pressable onPress={() => withdraw(f)} disabled={busy} accessibilityRole="button" accessibilityLabel={`Withdraw request to ${f.name}`} style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}>
                    <Text style={styles.rowBtnLabel}>Withdraw</Text>
                  </Pressable>
                }
              />
            ))}
          </Section>
        ) : null}

        {/* ── Your friends. ── */}
        {lists.friends.length > 0 ? (
          <Section label="Friends" count={lists.friends.length}>
            {lists.friends.map((f, i) => (
              <PersonRow key={f.id} person={f} index={i} onOpen={() => router.push({ pathname: '/athlete/[id]', params: { id: f.id } })} action={<FriendsMark />} />
            ))}
          </Section>
        ) : null}

        {loading && !data ? (
          <View style={styles.loading}>
            <ActivityIndicator color={flColor.bronze400} />
          </View>
        ) : null}

        {!loading && lists.friends.length === 0 && lists.incoming.length === 0 && lists.outgoing.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No friends yet. Add someone by their handle above.</Text>
          </View>
        ) : null}

        {/* Says why there are no suggestions, without implying they're coming. */}
        <Text style={styles.footnote}>
          Forge Legacy never suggests people. There are no recommendations, no mutual-friend lists, and your
          friends are never shown to anyone else.
        </Text>
      </ScrollView>

      <ScreenTour screenKey="add-friend" />
    </View>
  );
}

/** The design's four-way cascade, in its priority order, extended for "no such handle". */
function statusFor(o: {
  raw: string;
  valid: boolean;
  existingFriend?: FriendSummary;
  pendingOut?: FriendSummary;
  pendingIn?: FriendSummary;
  found: Awaited<ReturnType<typeof findAthleteByHandle>> | null;
  checked: string | null;
}): { text: string; color: string; icon: React.ReactNode } {
  const info = <InfoGlyph />;
  if (!o.raw) return { text: 'Enter a handle to send a friend request.', color: flColor.gray600, icon: info };
  if (!o.valid) return { text: 'Handles are 3–20 letters, numbers, dots and underscores.', color: '#A97E68', icon: <WarnGlyph /> };
  if (o.existingFriend) return { text: `${o.existingFriend.name} is already your friend.`, color: flColor.gray600, icon: info };
  if (o.pendingOut) return { text: `A request to @${o.raw} is already pending.`, color: flColor.gray600, icon: info };
  if (o.pendingIn) return { text: `${o.pendingIn.name} already asked you — accepting is below.`, color: '#8FB295', icon: <CheckGlyph /> };
  // Only claim a request is sendable once we know somebody holds the handle.
  if (o.checked === o.raw && !o.found) return { text: `No athlete has the handle @${o.raw}.`, color: '#A97E68', icon: <WarnGlyph /> };
  if (o.checked === o.raw && o.found) return { text: `Send a friend request to ${o.found.name}.`, color: '#8FB295', icon: <CheckGlyph /> };
  return { text: `Checking @${o.raw}…`, color: flColor.gray600, icon: info };
}

function Section({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <TourAnchor id={label === 'Sent' ? 'addfriend-pending' : undefined}>
          <Text style={styles.sectionLabel}>{label}</Text>
        </TourAnchor>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{count}</Text>
        </View>
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function PersonRow({ person, index, onOpen, action }: { person: FriendSummary; index: number; onOpen: () => void; action: React.ReactNode }) {
  const [rise] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(Math.min(index, 6) * 40),
      Animated.timing(rise, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [rise, index]);

  return (
    <Animated.View style={[styles.row, { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`View ${person.name}'s profile`} style={({ pressed }) => [styles.rowMain, pressed ? styles.pressed : null]}>
        <Avatar src={person.avatarUrl ?? undefined} name={person.name} size={36} />
        <View style={styles.rowText}>
          <Text style={styles.rowName} numberOfLines={1}>
            {person.name}
          </Text>
          {person.handle ? <Text style={styles.rowHandle} numberOfLines={1}>@{person.handle}</Text> : null}
        </View>
      </Pressable>
      {action}
    </Animated.View>
  );
}

function FriendsMark() {
  return (
    <View style={styles.friendsMark}>
      <CheckGlyph size={12} color={flColor.bronze300} />
      <Text style={styles.friendsMarkText}>Friends</Text>
    </View>
  );
}

// ── glyphs ──
function InfoGlyph({ size = 13, color = flColor.gray600 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 11v5M12 7.6v.6" />
    </Svg>
  );
}
function WarnGlyph({ size = 13, color = '#A97E68' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round">
      <Path d="M12 4.5l8.5 15H3.5z" />
      <Path d="M12 10v4M12 16.6v.6" />
    </Svg>
  );
}
function CheckGlyph({ size = 13, color = '#8FB295' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 13l4.5 4.5L19 7" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pressed: { opacity: 0.85 },
  barTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 2.4, textTransform: 'uppercase', color: flColor.cream100 },
  pinned: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 40 },
  lede: { marginTop: 2, marginBottom: 14, fontSize: 13, lineHeight: 19, color: flColor.gray400 },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 14, paddingRight: 6, height: 52, borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed },
  inputRowArmed: { borderColor: flColor.bronzeBorder, boxShadow: flShadow.glowSubtle },
  prefix: { fontSize: 16, fontWeight: '700', color: flColor.gray600 },
  prefixArmed: { color: flColor.bronze300 },
  input: { flex: 1, minWidth: 0, fontSize: 15, color: flColor.cream100, paddingVertical: 0 },
  addBtn: { minWidth: 66, height: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: 'transparent' },
  addBtnArmed: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  addBtnLabel: { fontSize: 13.5, fontWeight: '700', color: flColor.gray600 },
  addBtnLabelArmed: { color: flColor.bronze300 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 11, paddingHorizontal: 2 },
  statusText: { flex: 1, fontSize: 12, lineHeight: 17 },

  section: { marginTop: 22 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, paddingHorizontal: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  countBadge: { minWidth: 18, paddingHorizontal: 5, paddingVertical: 1, alignItems: 'center', borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  countBadgeText: { fontSize: 9.5, fontWeight: '700', color: flColor.bronze300 },
  card: { borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800, overflow: 'hidden' },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 10, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: flColor.charcoal700 },
  rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  rowHandle: { marginTop: 1, fontSize: 11, color: flColor.gray600 },
  rowBtn: { flexShrink: 0, paddingHorizontal: 12, paddingVertical: 7, borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600 },
  rowBtnArmed: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  rowBtnLabel: { fontSize: 11.5, fontWeight: '600', color: flColor.gray600 },
  rowBtnLabelArmed: { fontSize: 11.5, fontWeight: '700', color: flColor.bronze300 },
  friendsMark: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10 },
  friendsMarkText: { fontSize: 11, fontWeight: '600', color: flColor.bronze400 },

  loading: { paddingVertical: 30, alignItems: 'center' },
  empty: { marginTop: 26, paddingVertical: 26, paddingHorizontal: 18, borderRadius: flRadius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.charcoal600 },
  emptyText: { fontSize: 12.5, lineHeight: 18, textAlign: 'center', color: flColor.gray600 },
  footnote: { marginTop: 28, fontSize: 11, lineHeight: 17, color: flColor.gray600 },
});
