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
import { useToast } from '@/hooks/useCeremony';
import { useQuery } from '@/lib/useQuery';

/**
 * What Holt Remembers (`/holt-memory`) — Settings → Training.
 *
 * Coach-AI-Amendment-001 CA-D2: *"Notes are visible, editable and deletable by the athlete."* Anything
 * Holt acts on about a person must be something that person can see and undo — a hidden memory is where
 * a wrong fact would live forever. So every note Holt keeps (`holt_notes`, 0204) is listed here, each
 * with Edit and Delete, and nothing about them is hidden anywhere else.
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

  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [confirm, setConfirm] = useState<HoltNote | null>(null);
  const [busy, setBusy] = useState(false);
  const primeKeyboard = useKeyboardPrimer();

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

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.30)' }} />
      <AppBar title="What Holt Remembers" onBack={back} />

      <ScrollView
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
              When you tell Holt something worth keeping — a lift you hate, the days you can train, a knee that
              doesn’t like deep squats — it shows up here.
            </Text>
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
  count: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.bronze400,
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
  rowActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 },
  edit: { fontSize: 13, fontWeight: '600', color: flColor.bronze400 },
  delete: { fontSize: 13, fontWeight: '600', color: flColor.redMuted },
  pressed: { opacity: 0.6 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
});
