import { KEYBOARD_DISMISS_MODE } from '@/lib/keyboard-dismiss';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet/ConfirmSheet';
import { InputField } from '@/components/forge/composites/InputField';
import { useKeyboardPrimer } from '@/components/forge/KeyboardPrimer';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flRadius } from '@/constants/foundation';
import {
  cleanNoteText,
  deleteNote,
  fetchNotes,
  HOLT_NOTE_CHARS,
  HOLT_NOTES_MAX,
  updateNote,
  type HoltNote,
} from '@/data/holt-notes-live';
import { deleteChatSummary, fetchChatSummaries, type ChatSummary } from '@/data/holt-chats-live';
import { useToast } from '@/hooks/useCeremony';
import { useCoachDoor } from '@/hooks/useCoachDoor';
import { TYPING_ENABLED } from '@/domain/coach/chat-core';
import { countOf } from '@/domain/text/plural';
import { usePremiumAi } from '@/lib/entitlement';
import { useQuery } from '@/lib/useQuery';

/**
 * What Holt Remembers (`/holt-memory`) — Settings → Training.
 *
 * Coach-AI-Amendment-001 CA-D2: *"Notes are visible, editable and deletable by the athlete."* Anything
 * Holt acts on about a person must be something that person can see and undo — a hidden memory is where
 * a wrong fact would live forever. So every note Holt keeps (`holt_notes`, 0204) is listed here, each
 * with Edit and Delete, and nothing about them is hidden anywhere else.
 *
 * RECENT CONVERSATIONS (Coach-AI-Amendment-002, 0218): the short summary Holt keeps of each of his last ten
 * chats, which he reads back only when a question needs it. Same rule — every one is listed, and Delete
 * makes him forget that chat.
 *
 * ⚠ NO ADD PATH, ON PURPOSE. Notes come from what the athlete tells Holt in a conversation; this screen
 *   is the audit and the undo, not a second place to write them.
 *
 * ⚠ BEFORE 0204 IS APPLIED the read returns [] quietly and this shows the empty state — true, since
 *   Holt remembers nothing until the table exists.
 *
 * Both themes: every colour is a ROLE token from `foundation`, and the background is `ScreenBackground`,
 * which flips its scrim for Alabaster. Nothing here picks a literal colour.
 */
export default function HoltMemoryRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { data, loading, refetch } = useQuery(fetchNotes, []);
  const chats = useQuery(fetchChatSummaries, []);
  const [confirmChat, setConfirmChat] = useState<ChatSummary | null>(null);

  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [confirm, setConfirm] = useState<HoltNote | null>(null);
  const [busy, setBusy] = useState(false);
  const primeKeyboard = useKeyboardPrimer();
  /* QA holt-29: notes and chat summaries are only ever written from TYPED conversations, and typing to Holt
     is Premium AI. Without it this page can never fill, so it must not promise that it will. */
  const premiumAi = usePremiumAi();
  const canType = TYPING_ENABLED || premiumAi;
  const { openCoach } = useCoachDoor();
  /* settings-26: the empty page's next step. The sheet lives on the tab screens, so Holt opens over Home. */
  const talkToHolt = () => {
    openCoach();
    router.navigate('/');
  };

  /* ⚠ PRIME FIRST, SYNCHRONOUSLY — the edit field mounts one commit after this tap, and on iOS Safari
     its `autoFocus` would then focus with no keyboard. See `KeyboardPrimer`. */
  const startEdit = (n: HoltNote) => {
    primeKeyboard();
    setEditing({ id: n.id, text: n.text });
  };

  const notes = data ?? [];
  const draft = editing ? cleanNoteText(editing.text) : null;

  const back = () => (router.canGoBack() ? router.back() : router.replace('/account-settings'));

  const save = async () => {
    if (!editing || !draft || busy) return;
    setBusy(true);
    const ok = await updateNote(editing.id, draft);
    setBusy(false);
    if (!ok) {
      showToast('That didn’t save. Try again.');
      return;
    }
    setEditing(null);
    await refetch();
  };

  const remove = async (note: HoltNote) => {
    setConfirm(null);
    setBusy(true);
    const ok = await deleteNote(note.id);
    setBusy(false);
    if (!ok) {
      showToast('That didn’t delete. Try again.');
      return;
    }
    if (editing?.id === note.id) setEditing(null);
    showToast('Holt has forgotten that.');
    await refetch();
  };

  const forgetChat = async (c: ChatSummary) => {
    setConfirmChat(null);
    setBusy(true);
    const ok = await deleteChatSummary(c.id);
    setBusy(false);
    if (!ok) {
      showToast('That didn’t delete. Try again.');
      return;
    }
    showToast('Holt has forgotten that conversation.');
    await chats.refetch();
  };

  const pastChats = chats.data ?? [];

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="What Holt Remembers" onBack={back} />

      <ScrollView keyboardDismissMode={KEYBOARD_DISMISS_MODE} automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.scroll, { paddingBottom: 44 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          Holt only remembers what you’ve told him — never guesses about you. You can edit or delete anything here, and
          he’ll forget it straight away.
        </Text>

        {loading && notes.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={flColor.bronze400} />
          </View>
        ) : notes.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing yet.</Text>
            <Text style={styles.emptyText}>
              {canType
                ? 'When you type something worth keeping to Holt — a lift you hate, the days you can train — it shows up here.'
                : 'Holt keeps notes from what you type to him, and typing to Holt comes with Premium AI. When you tap through with him, he works from your answers each time instead.'}
            </Text>
            <View style={styles.emptyAction}>
              <Button variant="secondary" size="md" onPress={talkToHolt} accessibilityLabel="Talk to Holt">
                Talk to Holt
              </Button>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.count}>
              {notes.length} of {HOLT_NOTES_MAX}
            </Text>
            <View style={styles.list}>
              {notes.map((n) =>
                editing?.id === n.id ? (
                  <View key={n.id} style={styles.row}>
                    <InputField
                      value={editing.text}
                      onChange={(text) => setEditing({ id: n.id, text })}
                      maxLength={HOLT_NOTE_CHARS}
                      showCount
                      autoFocus
                      error={draft ? undefined : 'Between 2 and 80 characters.'}
                      accessibilityLabel="Edit note"
                      onSubmitEditing={() => void save()}
                    />
                    <View style={styles.editActions}>
                      <Button variant="secondary" size="md" onPress={() => setEditing(null)} accessibilityLabel="Cancel editing">
                        Cancel
                      </Button>
                      <Button disabled={!draft || busy} onPress={() => void save()} accessibilityLabel="Save note">
                        {busy ? 'Saving…' : 'Save'}
                      </Button>
                    </View>
                  </View>
                ) : (
                  <View key={n.id} style={styles.row}>
                    <Text style={styles.note}>{n.text}</Text>
                    <View style={styles.rowActions}>
                      <Pressable
                        onPress={() => startEdit(n)}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit: ${n.text}`}
                        hitSlop={8}
                        style={({ pressed }) => (pressed || busy ? styles.pressed : null)}
                      >
                        <Text style={styles.edit}>Edit</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setConfirm(n)}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete: ${n.text}`}
                        hitSlop={8}
                        style={({ pressed }) => (pressed || busy ? styles.pressed : null)}
                      >
                        <Text style={styles.delete}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                ),
              )}
            </View>
          </>
        )}

        {pastChats.length > 0 ? (
          <>
            <Text style={styles.count}>Recent conversations</Text>
            <Text style={styles.lead}>
              {/* holtai-14: "each of your last chat" — one chat is just "your last chat". */}
              {pastChats.length === 1 ? 'A short note from your last chat' : `A short note from each of your last ${countOf(pastChats.length, 'chat')}`}, so
              Holt can pick up where you left off.
            </Text>
            <View style={styles.list}>
              {pastChats.map((c) => (
                <View key={c.id} style={styles.row}>
                  <Text style={styles.date}>{new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
                  <Text style={styles.note}>{c.summary}</Text>
                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => setConfirmChat(c)}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel="Delete this conversation"
                      hitSlop={8}
                      style={({ pressed }) => (pressed || busy ? styles.pressed : null)}
                    >
                      <Text style={styles.delete}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      <ConfirmSheet
        open={confirm != null}
        onClose={() => setConfirm(null)}
        headline="Delete this note?"
        body={confirm ? `Holt will forget “${confirm.text}”.` : ''}
        confirmLabel="Delete"
        cancelLabel="Keep it"
        onConfirm={() => {
          if (confirm) void remove(confirm);
        }}
      />
      <ConfirmSheet
        open={confirmChat != null}
        onClose={() => setConfirmChat(null)}
        headline="Forget this conversation?"
        body="Holt won’t be able to look back on it."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        onConfirm={() => {
          if (confirmChat) void forgetChat(confirmChat);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  scroll: { paddingHorizontal: 18, paddingTop: 12, gap: 16 },
  lead: { fontSize: 13, lineHeight: 19, color: flColor.gray400 },
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
  count: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.labelInk,
  },
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
  note: { fontSize: 15, lineHeight: 21, color: flColor.cream100 },
  date: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, color: flColor.gray400 },
  rowActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 },
  edit: { fontSize: 13, fontWeight: '600', color: flColor.bronzeInk },
  delete: { fontSize: 13, fontWeight: '600', color: flColor.redMuted },
  pressed: { opacity: 0.6 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
});
