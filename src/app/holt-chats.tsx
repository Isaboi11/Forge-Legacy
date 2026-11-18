import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet/ConfirmSheet';
import { InputField } from '@/components/forge/composites/InputField';
import { EngravedIcon } from '@/components/forge/primitives/icons/EngravedIcon';
import { continuePastChat, trackPastChat } from '@/components/forge/usePastChatSync';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flRadius } from '@/constants/foundation';
import { deletePastChat, getPastChat, listPastChats, type ListResult, type PastChat, type PastChatItem } from '@/data/holt-past-chats-live';
import { getRemembers } from '@/data/holt-memory-live';
import { noteForDisplay } from '@/domain/coach/past-chats';
import { countOf } from '@/domain/text/plural';
import { useToast } from '@/hooks/useCeremony';
import { useCoachDoor } from '@/hooks/useCoachDoor';
import { usePremiumAi } from '@/lib/entitlement';
import { useQuery } from '@/lib/useQuery';

/**
 * Past Chats (`/holt-chats`, AI Road to 10 Sprint 4b §1.5, CH-4) — every conversation Holt has kept (0279), from
 * What Holt Remembers and the "Past chats" button in the chat sheet's header.
 *
 *   /holt-chats          the list: search box, newest first, 30 a page — title, date, the summary (or Holt's first
 *                        answer), how many lines — and Delete on each, behind a confirm.
 *   /holt-chats?id=…     one chat, read-only, with **Continue this chat**: the chat on the phone ends as usual,
 *                        this one becomes the thread, and the sheet opens on it over Home.
 *
 * ⚠ A FAILED LOAD IS NEVER DRAWN AS EMPTY (Brady 11-11, "my squad is gone"): the store answers `{ ok: false }` and
 *   this says it could not load, with Try again — never "No past chats yet" to someone who has thirty.
 * ⚠ BEFORE 0279 IS APPLIED the store answers an honest empty, quietly — Holt has kept nothing until the table exists.
 * ⚠ Everything shown has been read back through TODAY's medical guard (`readBack`) — a stopped line never shows.
 *
 * One route with a param rather than two files, so `_layout.tsx` gains one line. Works on web: nothing here is
 * native-only. Both themes: every colour is a role token from `foundation`, the background is `ScreenBackground`.
 */
export default function HoltChatsRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return typeof id === 'string' && id ? <ChatTranscript id={id} /> : <ChatList />;
}

const shortDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const thisYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, thisYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
};

/* ── the list ────────────────────────────────────────────────────────────────────────────────────────── */

function ChatList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { openCoach } = useCoachDoor();
  const premiumAi = usePremiumAi();

  const [typed, setTyped] = useState('');
  const [query, setQuery] = useState('');
  /* The search runs once typing settles — a query per keystroke is a database round-trip per letter. */
  useEffect(() => {
    const t = setTimeout(() => setQuery(typed.trim()), 350);
    return () => clearTimeout(t);
  }, [typed]);

  /* The answer carries the query it answers, so a search is counted once, against its own results. */
  const first = useQuery<{ q: string; r: ListResult }>(() => listPastChats({ query }).then((r) => ({ q: query, r })), [query]);
  const remembers = useQuery(getRemembers, []);

  /* Pages after the first, kept against the query they belong to — a new search simply stops reading them. */
  const [pages, setPages] = useState<{ query: string; page: number; chats: PastChatItem[]; more: boolean } | null>(null);
  const [paging, setPaging] = useState<{ query: string; state: 'loading' | 'failed' } | null>(null);
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [confirm, setConfirm] = useState<PastChatItem | null>(null);
  const [busy, setBusy] = useState(false);

  const answered = first.data;
  const result = answered?.r ?? null;
  useEffect(() => {
    if (answered && answered.q && answered.r.ok) trackPastChat('searched', answered.r.chats.length);
  }, [answered]);

  /* What is ON SCREEN is the answer to `shown`, which lags `query` while a new search is in flight. */
  const shown = answered?.q ?? query;
  const ownPages = pages && pages.query === shown ? pages : null;
  const chats = result?.ok ? [...result.chats, ...(ownPages?.chats ?? [])].filter((c) => !removed.has(c.id)) : [];
  const more = result?.ok ? (ownPages ? ownPages.more : result.more) : false;
  const pagingState = paging && paging.query === shown ? paging.state : null;

  const back = () => (router.canGoBack() ? router.back() : router.replace('/holt-memory'));

  const loadMore = async () => {
    const q = shown;
    const page = (ownPages?.page ?? 0) + 1;
    setPaging({ query: q, state: 'loading' });
    const r = await listPastChats({ query: q, page });
    if (!r.ok) {
      setPaging({ query: q, state: 'failed' });
      return;
    }
    setPaging(null);
    setPages((p) => ({ query: q, page, chats: [...(p && p.query === q ? p.chats : []), ...r.chats], more: r.more }));
  };

  const remove = async (c: PastChatItem) => {
    setConfirm(null);
    setBusy(true);
    const ok = await deletePastChat(c.id);
    setBusy(false);
    if (!ok) {
      showToast('That didn’t delete. Try again.');
      return;
    }
    trackPastChat('deleted');
    setRemoved((s) => new Set(s).add(c.id));
    showToast('Holt has forgotten that chat.');
  };

  const talkToHolt = () => {
    openCoach();
    router.navigate('/');
  };

  const open = (c: PastChatItem) => router.push({ pathname: '/holt-chats', params: { id: c.id } } as unknown as Parameters<typeof router.push>[0]);

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Past Chats" onBack={back} />

      <ScrollView
        keyboardDismissMode={KEYBOARD_DISMISS_MODE}
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.scroll, { paddingBottom: 44 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          Your conversations with Holt, newest first. Open one to read it back or carry on where you left off. Delete any
          of them and he forgets it.
        </Text>
        {remembers.data === false ? (
          <Text style={styles.notice}>“Holt remembers” is off, so new chats aren’t being kept. What’s here stays until you delete it.</Text>
        ) : null}

        <InputField
          value={typed}
          onChange={setTyped}
          placeholder="Search your chats"
          accessibilityLabel="Search your past chats"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          leadingIcon={<EngravedIcon name="search" size={18} color={flColor.gray600} />}
        />

        {result == null ? (
          <View style={styles.center} accessibilityLabel="Loading your past chats">
            <ActivityIndicator color={flColor.bronze400} />
          </View>
        ) : !result.ok ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Couldn’t load your chats.</Text>
            <Text style={styles.emptyText}>They’re still kept — this was the connection. Try again in a moment.</Text>
            <View style={styles.emptyAction}>
              <Button variant="secondary" size="md" onPress={first.refetch} accessibilityLabel="Try loading your past chats again">
                Try again
              </Button>
            </View>
          </View>
        ) : chats.length === 0 ? (
          shown ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No chats match “{shown}”.</Text>
              <Text style={styles.emptyText}>Try one word you remember saying — a lift, a day, a goal.</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No past chats yet.</Text>
              <Text style={styles.emptyText}>
                {premiumAi
                  ? 'When you talk to Holt, the conversation is kept here so you can read it back or pick it up again.'
                  : 'Holt keeps your conversations with Premium AI. When you tap through with him, each chat starts fresh instead.'}
              </Text>
              <View style={styles.emptyAction}>
                <Button variant="secondary" size="md" onPress={talkToHolt} accessibilityLabel="Talk to Holt">
                  Talk to Holt
                </Button>
              </View>
            </View>
          )
        ) : (
          <>
            {first.loading ? <ActivityIndicator color={flColor.bronze400} accessibilityLabel="Updating" /> : null}
            <View style={styles.list}>
              {chats.map((c) => (
                <View key={c.id} style={styles.row}>
                  <Pressable
                    onPress={() => open(c)}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.title}. ${shortDate(c.updatedAt)}. ${countOf(c.turnCount, 'line')}. Open this chat`}
                    style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
                  >
                    <View style={styles.rowTop}>
                      <Text style={styles.title} numberOfLines={2}>
                        {c.title}
                      </Text>
                      <EngravedIcon name="chevron-right" size={16} color={flColor.gray600} />
                    </View>
                    <Text style={styles.meta}>
                      {shortDate(c.updatedAt)} · {countOf(c.turnCount, 'line')}
                    </Text>
                    {c.line ? (
                      <Text style={styles.line} numberOfLines={2}>
                        {c.line}
                      </Text>
                    ) : null}
                  </Pressable>
                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => setConfirm(c)}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete the chat: ${c.title}`}
                      hitSlop={8}
                      style={({ pressed }) => (pressed || busy ? styles.pressed : null)}
                    >
                      <Text style={styles.delete}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
            {more ? (
              <View style={styles.moreWrap}>
                {pagingState === 'failed' ? <Text style={styles.notice}>Couldn’t load more. Try again.</Text> : null}
                <Button
                  variant="secondary"
                  size="md"
                  disabled={pagingState === 'loading'}
                  onPress={() => void loadMore()}
                  accessibilityLabel="Show older chats"
                >
                  {pagingState === 'loading' ? 'Loading…' : 'Show older chats'}
                </Button>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <ConfirmSheet
        open={confirm != null}
        onClose={() => setConfirm(null)}
        headline="Delete this chat?"
        body={confirm ? `Holt will forget “${confirm.title}” — you won’t be able to read it or continue it.` : ''}
        confirmLabel="Delete"
        cancelLabel="Keep it"
        onConfirm={() => {
          if (confirm) void remove(confirm);
        }}
      />
    </View>
  );
}

/* ── one chat ────────────────────────────────────────────────────────────────────────────────────────── */

function ChatTranscript({ id }: { id: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { openCoach } = useCoachDoor();
  const read = useQuery(() => getPastChat(id), [id]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const result = read.data;
  const chat: PastChat | null = result?.ok ? result.chat : null;
  useEffect(() => {
    if (result?.ok && result.chat) trackPastChat('opened');
  }, [result]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/holt-chats'));

  const carryOn = async () => {
    if (!chat || busy) return;
    setBusy(true);
    const ok = await continuePastChat(chat);
    setBusy(false);
    if (!ok) {
      showToast('That chat couldn’t be opened. Try again.');
      return;
    }
    /* The sheet lives on the tab screens, so Holt opens over Home — the same door What Holt Remembers uses. */
    openCoach();
    router.navigate('/');
  };

  const remove = async () => {
    setConfirm(false);
    setBusy(true);
    const ok = await deletePastChat(id);
    setBusy(false);
    if (!ok) {
      showToast('That didn’t delete. Try again.');
      return;
    }
    trackPastChat('deleted');
    showToast('Holt has forgotten that chat.');
    router.replace('/holt-chats');
  };

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="Past Chat" onBack={back} />

      {result == null ? (
        <View style={styles.center} accessibilityLabel="Loading this chat">
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      ) : !result.ok ? (
        <View style={[styles.scroll, styles.padTop]}>
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Couldn’t load this chat.</Text>
            <Text style={styles.emptyText}>It’s still kept — this was the connection. Try again in a moment.</Text>
            <View style={styles.emptyAction}>
              <Button variant="secondary" size="md" onPress={read.refetch} accessibilityLabel="Try loading this chat again">
                Try again
              </Button>
            </View>
          </View>
        </View>
      ) : !chat ? (
        <View style={[styles.scroll, styles.padTop]}>
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>This chat isn’t here any more.</Text>
            <Text style={styles.emptyText}>It was deleted, or it was older than the 100 chats Holt keeps.</Text>
            <View style={styles.emptyAction}>
              <Button variant="secondary" size="md" onPress={() => router.replace('/holt-chats')} accessibilityLabel="See your past chats">
                See your past chats
              </Button>
            </View>
          </View>
        </View>
      ) : (
        <>
          <ScrollView
            keyboardDismissMode={KEYBOARD_DISMISS_MODE}
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={[styles.scroll, { paddingBottom: 24 }]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.heading} accessibilityRole="header">
              {chat.title}
            </Text>
            <Text style={styles.meta}>
              {shortDate(chat.startedAt)} · {countOf(chat.turnCount, 'line')}
            </Text>
            {chat.summary ? (
              <View style={styles.summary}>
                <Text style={styles.summaryLabel}>What Holt kept from it</Text>
                <Text style={styles.summaryText}>{chat.summary}</Text>
              </View>
            ) : null}
            <View style={styles.transcript}>
              {chat.turns.map((t, i) =>
                t.role === 'note' ? (
                  <Text key={i} style={styles.note} accessibilityLabel={`The app: ${noteForDisplay(t.text)}`}>
                    {noteForDisplay(t.text)}
                  </Text>
                ) : (
                  <View
                    key={i}
                    style={[styles.bubble, t.role === 'athlete' ? styles.mine : styles.his]}
                    accessible
                    accessibilityLabel={`${t.role === 'athlete' ? 'You' : 'Holt'}: ${t.text}`}
                  >
                    <Text style={styles.who}>{t.role === 'athlete' ? 'YOU' : 'HOLT'}</Text>
                    <Text style={styles.said}>{t.text}</Text>
                  </View>
                ),
              )}
            </View>
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
            <Button
              variant="primary"
              fullWidth
              disabled={busy}
              onPress={() => void carryOn()}
              accessibilityLabel="Continue this chat with Holt"
            >
              {busy ? 'Opening…' : 'Continue this chat'}
            </Button>
            <Pressable
              onPress={() => setConfirm(true)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Delete this chat"
              hitSlop={8}
              style={({ pressed }) => [styles.footerDelete, (pressed || busy) && styles.pressed]}
            >
              <EngravedIcon name="trash" size={16} color={flColor.redMuted} />
              <Text style={styles.delete}>Delete this chat</Text>
            </Pressable>
          </View>
        </>
      )}

      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        headline="Delete this chat?"
        body="Holt will forget it — you won’t be able to read it or continue it."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        onConfirm={() => void remove()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  scroll: { paddingHorizontal: 18, paddingTop: 12, gap: 16 },
  padTop: { paddingTop: 16 },
  lead: { fontSize: 13, lineHeight: 19, color: flColor.gray400 },
  notice: { fontSize: 13, lineHeight: 19, color: flColor.gray400, fontStyle: 'italic' },
  center: { paddingVertical: 48, alignItems: 'center' },
  empty: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    borderRadius: flRadius.lg,
    backgroundColor: flColor.charcoal800,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  emptyText: { fontSize: 13, lineHeight: 19, color: flColor.gray400 },
  emptyAction: { marginTop: 10, alignItems: 'flex-start' },
  list: { gap: 8 },
  row: {
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: flRadius.md,
    backgroundColor: flColor.charcoal800,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
  },
  rowMain: { gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { flex: 1, fontSize: 15, lineHeight: 21, fontWeight: '600', color: flColor.cream100 },
  meta: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, color: flColor.gray400 },
  line: { fontSize: 13, lineHeight: 19, color: flColor.gray400 },
  rowActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 },
  delete: { fontSize: 13, fontWeight: '600', color: flColor.redMuted },
  pressed: { opacity: 0.6 },
  moreWrap: { alignItems: 'center', gap: 8 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: flColor.cream100 },
  summary: {
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  summaryLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.labelInk,
  },
  summaryText: { fontSize: 14, lineHeight: 20, color: flColor.cream100 },
  transcript: { gap: 10 },
  bubble: { gap: 4, paddingVertical: 10, paddingHorizontal: 14, borderRadius: flRadius.md, borderWidth: 1, maxWidth: '88%' },
  mine: { alignSelf: 'flex-end', backgroundColor: flColor.charcoal600, borderColor: flColor.charcoal600 },
  his: { alignSelf: 'flex-start', backgroundColor: flColor.charcoal800, borderColor: flColor.charcoal600 },
  who: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: flColor.labelInk },
  said: { fontSize: 15, lineHeight: 21, color: flColor.cream100 },
  note: { fontSize: 12, lineHeight: 17, fontStyle: 'italic', color: flColor.gray400, textAlign: 'center', paddingHorizontal: 12 },
  footer: { paddingHorizontal: 18, paddingTop: 12, gap: 12, alignItems: 'center' },
  footerDelete: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
