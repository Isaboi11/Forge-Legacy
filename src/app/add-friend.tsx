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
  findAthletes,
  removeFriendship,
  requestFriend,
  type AthleteSearchResult,
  type FriendState,
} from '@/data/friends-live';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { useToast } from '@/hooks/useCeremony';
import { flColor, flRadius, flShadow } from '@/constants/foundation';

/**
 * Add Friend — built to `Add Friend by Handle.dc.html`, now searching by NAME as well.
 *
 * The only way to reach an athlete you don't already share a squad with. SOC-D15's principle is intact —
 * "Discovery is always an act the athlete chooses, never a surface the system populates" — and what
 * changed is the reading of it. See `Social-Architecture-Amendment-003-Athlete-Search.md`: two locked
 * documents disagreed, because `Identity-Amendment-001` §4 has specified name+handle search with its
 * ranking, row format, empty state and no-results copy since before SOC-D15 narrowed it to one exact
 * handle. A list you typed a query to get is not a surface that populates itself.
 *
 * A LEADING `@` FORCES HANDLE-ONLY (Identity §4.1). Without it both fields are queried, which is what
 * makes the default feel name-based rather than address-based.
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
 * 5. A MATCH RENDERS AS A PERSON, NOT A SENTENCE. Reported by a tester: "it just says send them a request
 *    but doesn't let me view their profile." It was accurate. A resolved handle produced one line of grey
 *    status text and an armed Add button — the athlete's own name appeared only inside that sentence, and
 *    nothing on the screen was tappable. Every row on this screen now opens `/athlete/[id]`.
 *
 * 6. THE ADD BUTTON LEFT THE INPUT, and had to. With one handle there was exactly one person "whatever is
 *    typed" could mean, so a button beside the field could send to them. With a list there is no such
 *    person, and a button that guesses which row you meant is worse than no button. Sending moved onto
 *    each row, where it also gets to be the RIGHT verb — Add, Accept or Withdraw depending on where you
 *    already stand with that athlete, which `friendAction` has always known and this screen never asked.
 *
 * THE INPUT IS PINNED, not scrolled; the RESULTS SCROLL. The field is the one control you came for and
 * must not scroll away — but 25 result rows pinned above the fold would eat the screen and defeat the
 * point, so results are the first section inside the scroller.
 *
 * Faithful: the `@` prefix as a live affordance (now meaning handle-only mode), leading `@`s stripped so
 * `@@ada` normalizes, the status cascade with its own icon and colour per state, the bronze count badge
 * on the requests header, and the 220ms rise on rows.
 */

/** 3–20, letters/digits/dots/underscores — what `profiles.handle` can actually hold. */
const HANDLE_RE = /^[a-z0-9._]{3,20}$/;
/** Identity §4.4 / the RPC's own floor: nothing is searched for under two characters. */
const MIN_QUERY = 2;

export default function AddFriendScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data, loading, refetch } = useQuery(fetchFriendLists, []);

  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const tourScroller = useTourScroller();
  const onTourScroll = useTourScrollTracker();
  const [results, setResults] = useState<AthleteSearchResult[]>([]);
  const [checked, setChecked] = useState<string | null>(null);
  /* A FAILED SEARCH IS NOT AN EMPTY ONE. Without this, an unapplied 0114 — or any network error —
     renders "No athletes found. Check the spelling", which blames the athlete for the app's problem
     and is exactly the class of silent falsehood the honors guard was rewritten to stop telling. */
  const [searchError, setSearchError] = useState<string | null>(null);
  /** Rows we've just acted on, so the button flips without waiting for a round trip. */
  const [optimistic, setOptimistic] = useState<Record<string, FriendState>>({});

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/friends'));

  /*
   * TWO MODES OFF ONE FIELD (Identity §4.1).
   *
   * A leading `@` means "I know their handle" and keeps the old strict validation. Anything else is a
   * NAME, and names are not `[a-z0-9._]` — they have spaces, apostrophes and accents — so the only
   * gate on that side is a length floor. The query is NOT lowercased for display any more either:
   * lowercasing somebody's name in the box they typed it into is wrong, and the server lowercases for
   * matching anyway.
   */
  const typed = query.trim();
  const handleMode = typed.startsWith('@');
  const raw = typed.replace(/^@+/, '');
  const searchable = handleMode ? HANDLE_RE.test(raw.toLowerCase()) : raw.length >= MIN_QUERY;
  const lists = data ?? { friends: [], incoming: [], outgoing: [] };

  // Debounced search. `checked === raw` is the stale-response guard and does the same job it always
  // did: a result from a previous keystroke can never render, so nothing needs clearing on the way out
  // (a synchronous setState in an effect body is also what this project's react-compiler lint rejects).
  useEffect(() => {
    if (!searchable) return undefined;
    let alive = true;
    const t = setTimeout(() => {
      findAthletes(raw).then(
        (r) => {
          if (!alive) return;
          setResults(r);
          setSearchError(null);
          setChecked(raw);
        },
        (e: unknown) => {
          if (!alive) return;
          setResults([]);
          setSearchError(errorMessage(e));
          setChecked(raw);
        },
      );
    }, 320);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [raw, searchable]);

  const showing = checked === raw && searchable ? results : [];
  const stateOf = (r: AthleteSearchResult): FriendState => optimistic[r.id] ?? r.state;

  /*
   * Send to a specific athlete. The id comes from the ROW, always — there is no "whoever is typed"
   * to resolve any more, which is what deleted the old id-resolution fallback and its
   * "No athlete has that handle" toast along with it.
   *
   * The query is deliberately NOT cleared afterwards. With one result, consuming it made sense; with a
   * list, an athlete adding two people from one search should not have to type it again.
   */
  const send = (r: AthleteSearchResult) => {
    if (busy) return;
    setBusy(true);
    setOptimistic((o) => ({ ...o, [r.id]: 'outgoing' }));
    requestFriend(r.id).then(
      (state) => {
        setBusy(false);
        setOptimistic((o) => ({ ...o, [r.id]: state }));
        showToast(state === 'friends' ? 'You’re now friends' : `Request sent to ${r.name}`);
        refetch();
      },
      (e: unknown) => {
        setBusy(false);
        setOptimistic((o) => {
          const { [r.id]: _undo, ...rest } = o;
          return rest;
        });
        showToast(errorMessage(e));
      },
    );
  };

  /* `{ id, name }` rather than `FriendSummary`: the same three actions now fire from a search result
     as well as from a list row, and `id` is the athlete id in both. */
  const withdraw = (f: { id: string; name: string }) => {
    if (busy) return;
    setBusy(true);
    setOptimistic((o) => ({ ...o, [f.id]: 'none' }));
    removeFriendship(f.id).then(
      () => {
        setBusy(false);
        showToast('Request withdrawn');
        refetch();
      },
      (e: unknown) => {
        setBusy(false);
        setOptimistic((o) => ({ ...o, [f.id]: 'outgoing' }));
        showToast(errorMessage(e));
      },
    );
  };

  const accept = (f: { id: string; name: string }) => {
    if (busy) return;
    setBusy(true);
    setOptimistic((o) => ({ ...o, [f.id]: 'friends' }));
    acceptFriendRequest(f.id).then(
      () => {
        setBusy(false);
        showToast(`You and ${f.name.split(' ')[0]} are friends`);
        refetch();
      },
      (e: unknown) => {
        setBusy(false);
        setOptimistic((o) => ({ ...o, [f.id]: 'incoming' }));
        showToast(errorMessage(e));
      },
    );
  };

  const status = statusFor({ raw, handleMode, searchable, checked, count: showing.length, searchError });

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate2} base="#050505" overlay={{ flat: 'rgba(5,5,5,0.32)' }} />
      <AppBar title={<Text style={styles.barTitle}>Add Friend</Text>} onBack={goBack} />

      {/* ── FIXED. The one control on this screen must never scroll out from under you: the lists below can
              run to any length, and an Add field that disappears as you read them is the field you came for.
              Same pattern as Competition History's header. ── */}
      <View style={styles.pinned}>
        <Text style={styles.lede}>Search by name, or type @ and their handle.</Text>

        {/* The @ prefix lights when the field is in handle-only mode — the same affordance, now saying
            which of the two searches is running rather than whether a button is armed. */}
        <TourAnchor id="addfriend-search" style={[styles.inputRow, searchable ? styles.inputRowArmed : null]}>
          <Text style={[styles.prefix, handleMode ? styles.prefixArmed : null]}>@</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="name or handle"
            placeholderTextColor={flColor.gray600}
            style={styles.input}
            accessibilityLabel="Search athletes by name or handle"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            maxLength={40}
            returnKeyType="search"
          />
          {checked !== raw && searchable ? <ActivityIndicator size="small" color={flColor.bronze300} /> : null}
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

        {/* ── RESULTS. Inside the scroller, not pinned: at 25 rows a pinned block would swallow the
                screen and defeat the reason the input is pinned in the first place. The action is the
                one `friendAction` already computes from where you stand — Add · Accept · Withdraw ·
                already Friends — so a row you're mid-conversation with offers the right verb. ── */}
        {showing.length > 0 ? (
          <Section label="Results" count={showing.length}>
            {showing.map((r, i) => {
              const state = stateOf(r);
              return (
                <PersonRow
                  key={r.id}
                  person={r}
                  index={i}
                  sub={r.sharedSquad}
                  onOpen={() => router.push({ pathname: '/athlete/[id]', params: { id: r.id } })}
                  action={
                    state === 'friends' ? (
                      <FriendsMark />
                    ) : state === 'incoming' ? (
                      <Pressable onPress={() => accept(r)} disabled={busy} accessibilityRole="button" accessibilityLabel={`Accept ${r.name}`} style={({ pressed }) => [styles.rowBtn, styles.rowBtnArmed, pressed ? styles.pressed : null]}>
                        <Text style={styles.rowBtnLabelArmed}>Accept</Text>
                      </Pressable>
                    ) : state === 'outgoing' ? (
                      <Pressable onPress={() => withdraw(r)} disabled={busy} accessibilityRole="button" accessibilityLabel={`Withdraw request to ${r.name}`} style={({ pressed }) => [styles.rowBtn, pressed ? styles.pressed : null]}>
                        <Text style={styles.rowBtnLabel}>Withdraw</Text>
                      </Pressable>
                    ) : (
                      <Pressable onPress={() => send(r)} disabled={busy} accessibilityRole="button" accessibilityLabel={`Send ${r.name} a friend request`} style={({ pressed }) => [styles.rowBtn, styles.rowBtnArmed, pressed ? styles.pressed : null]}>
                        <Text style={styles.rowBtnLabelArmed}>Add</Text>
                      </Pressable>
                    )
                  }
                />
              );
            })}
          </Section>
        ) : null}

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

/**
 * The screen's state machine, in priority order.
 *
 * The old cascade's middle three branches — already-friends, request-pending, they-asked-you — are
 * gone from here and now live on the ROW. They only ever made sense when one handle meant one person;
 * with a list, "a request to @x is already pending" is a statement about one of twenty rows and
 * belongs beside that row's button.
 */
function statusFor(o: {
  raw: string;
  handleMode: boolean;
  searchable: boolean;
  checked: string | null;
  count: number;
  searchError: string | null;
}): { text: string; color: string; icon: React.ReactNode } {
  const info = <InfoGlyph />;
  if (!o.raw) return { text: 'Search by name, or type @ and their handle.', color: flColor.gray600, icon: info };
  if (!o.searchable) {
    return o.handleMode
      ? { text: 'Handles are 3–20 letters, numbers, dots and underscores.', color: '#A97E68', icon: <WarnGlyph /> }
      : { text: 'Keep typing — at least two characters.', color: flColor.gray600, icon: info };
  }
  if (o.checked !== o.raw) return { text: 'Searching…', color: flColor.gray600, icon: info };
  // The search FAILED — say so. "No athletes found" here would blame the athlete's spelling for the
  // app's problem, and would look identical to a genuine miss.
  if (o.searchError) return { text: o.searchError, color: '#A97E68', icon: <WarnGlyph /> };
  // Identity §4.5, verbatim — the copy is specified, and it says what to do next rather than only
  // reporting a miss.
  if (o.count === 0) return { text: 'No athletes found. Check the spelling or ask them to share their username.', color: '#A97E68', icon: <WarnGlyph /> };
  return { text: 'Tap a name to open their profile, or Add to send a request.', color: '#8FB295', icon: <CheckGlyph /> };
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

/**
 * `person` is structural rather than `FriendSummary` so a search result fits it unchanged — the two
 * types agree on the four fields this row draws, and widening it beat converting one into the other.
 * `sub` is Identity §4.3's tertiary line (a shared squad), shown only when there is one.
 */
function PersonRow({
  person,
  index,
  onOpen,
  action,
  sub,
}: {
  person: { id: string; name: string; handle: string | null; avatarUrl: string | null };
  index: number;
  onOpen: () => void;
  action: React.ReactNode;
  sub?: string | null;
}) {
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
          {sub ? <Text style={styles.rowSquad} numberOfLines={1}>{sub}</Text> : null}
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

  // (the single pinned result card is gone — a search returns a LIST now, and it renders as a
  //  `Results` Section of ordinary `PersonRow`s inside the scroller. See 0114 / SOC-A3-D1.)

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
  rowSquad: { marginTop: 1, fontSize: 10.5, color: flColor.bronze400 },
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
