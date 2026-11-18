import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { SectionCard } from '@/components/forge/admin/charts';
import { flColor, flRadius, flText } from '@/constants/foundation';
import { fetchImportMisses, importMissPhotoUrl, resolveImportMiss, settleImportMissPhotos } from '@/data/import-miss-live';
import { importMissForClaude, weeksLines, type ImportMiss } from '@/domain/program/import-miss';
import { useQuery } from '@/lib/useQuery';

/**
 * /admin → "IMPORT MISSES" (AI Road to 10 Sprint 3b, IM-5; migration 0275 `admin_import_misses`).
 *
 * The queue of reads athletes chose to send ("Send this to Forge so we learn this format?"): newest first, each with
 * what the reader saw (the paste, or the card reader's words — and the photo when they ticked it) beside what the app
 * read and what they changed by hand. "Copy for Claude" puts everything Claude needs on the clipboard — the job is a
 * reader rule plus a corpus case, never a prompt guess. "Mark handled" takes it off the queue.
 *
 * Opening the card also settles the photo bytes SQL cannot delete (0275 §2: purged at 90 days or the account gone) —
 * through the Storage API, with this operator's session. A failed load says it failed; it is never drawn as an empty
 * queue. Operators only: `admin_guard()` in every function is the boundary.
 */
export function ImportMissesCard() {
  const [showResolved, setShowResolved] = useState(false);
  const q = useQuery(async () => {
    /* Settling is housekeeping: its failure never hides the queue. */
    await settleImportMissPhotos().catch(() => 0);
    return fetchImportMisses(showResolved);
  }, [showResolved]);

  return (
    <SectionCard title="Import misses" subtitle="Reads athletes sent because we weren’t sure. Kept 90 days. Work each into a reader rule and a corpus case.">
      <Pressable
        onPress={() => setShowResolved((v) => !v)}
        accessibilityRole="switch"
        accessibilityState={{ checked: showResolved }}
        accessibilityLabel="Show handled misses too"
        style={({ pressed }) => [styles.toggle, showResolved && styles.toggleOn, pressed && styles.pressed]}
      >
        <Text style={[styles.toggleText, showResolved && styles.toggleTextOn]}>{showResolved ? 'Showing handled too' : 'Show handled too'}</Text>
      </Pressable>
      {q.loading && !q.data ? (
        <ActivityIndicator color={flColor.bronze400} style={styles.loading} />
      ) : q.error || !q.data ? (
        <View style={styles.gap}>
          <Text style={styles.fail}>{q.error ?? 'Nothing came back.'}</Text>
          <Text style={styles.quiet}>The queue is unknown until it loads — this is not an empty queue.</Text>
          <Action label="Try again" onPress={q.refetch} />
        </View>
      ) : q.data.length === 0 ? (
        <Text style={styles.quiet}>{showResolved ? 'Nothing sent in the last 90 days.' : 'Nothing waiting. Every miss is handled.'}</Text>
      ) : (
        q.data.map((m) => <MissRow key={m.id} m={m} onChanged={q.refetch} />)
      )}
    </SectionCard>
  );
}

function MissRow({ m, onChanged }: { m: ImportMiss; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<{ url: string | null; loading: boolean } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const copy = () => {
    void Clipboard.setStringAsync(importMissForClaude(m)).then(
      () => setNote('Copied for Claude.'),
      () => setNote('Couldn’t copy.'),
    );
  };
  const showPhoto = () => {
    if (!m.photoPath) return;
    setPhoto({ url: null, loading: true });
    void importMissPhotoUrl(m.photoPath).then((url) => setPhoto({ url, loading: false }));
  };
  const handled = () => {
    void resolveImportMiss(m.id, 'handled').then(
      () => onChanged(),
      (e: unknown) => setNote(e instanceof Error ? e.message : 'Couldn’t mark it handled.'),
    );
  };

  const reasons = m.read?.reasons?.join(' ') ?? '';
  return (
    <View style={styles.row}>
      <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={({ pressed }) => pressed && styles.pressed}>
        <View style={styles.head}>
          <Text style={styles.who} numberOfLines={1}>
            {m.athlete}
            {m.handle ? ` @${m.handle}` : ''}
          </Text>
          <Text style={styles.when}>{m.createdAt.slice(0, 10)}</Text>
        </View>
        <Text style={styles.meta}>
          {m.kind === 'photo' ? (m.photoPath ? 'Photo (included)' : 'Photo (words only)') : 'Paste'} · {m.read?.via ?? '?'} · app {m.appVersion ?? 'unknown'}
          {m.resolvedAt ? ` · handled${m.resolution ? `: ${m.resolution}` : ''}` : ''}
        </Text>
        {reasons ? <Text style={styles.reasons}>{reasons}</Text> : null}
      </Pressable>
      {open ? (
        <View style={styles.gap}>
          {/* The input beside what was read: two columns on a wide screen, one under the other on a phone. */}
          <View style={styles.sideBySide}>
            <View style={styles.col}>
              <Text style={styles.colLabel}>{m.kind === 'photo' ? 'Read off the photo' : 'They pasted'}</Text>
              <Text style={styles.mono} selectable>
                {m.inputText ?? '(photo only)'}
              </Text>
              {m.photoPath ? (
                photo?.url ? (
                  <Image source={{ uri: photo.url }} style={styles.photo} resizeMode="contain" accessibilityLabel="The photo they sent" />
                ) : photo?.loading ? (
                  <ActivityIndicator color={flColor.bronze400} />
                ) : (
                  <Action label={photo ? 'Photo unavailable — try again' : 'Show the photo'} onPress={showPhoto} />
                )
              ) : null}
            </View>
            <View style={styles.col}>
              <Text style={styles.colLabel}>What the app read</Text>
              <Text style={styles.mono} selectable>
                {weeksLines(m.read?.weeks).join('\n') || '(nothing)'}
              </Text>
              {m.corrected ? (
                <>
                  <Text style={styles.colLabel}>What they changed it to</Text>
                  <Text style={styles.mono} selectable>
                    {weeksLines(m.corrected).join('\n')}
                  </Text>
                </>
              ) : null}
              {m.read?.skipped?.length ? (
                <>
                  <Text style={styles.colLabel}>Not read as training</Text>
                  <Text style={styles.mono}>{m.read.skipped.join('\n')}</Text>
                </>
              ) : null}
            </View>
          </View>
          <View style={styles.actions}>
            <Action label="Copy for Claude" onPress={copy} />
            {m.resolvedAt ? null : <Action label="Mark handled" onPress={handled} />}
          </View>
          {note ? (
            <Text style={styles.quiet} accessibilityLiveRegion="polite">
              {note}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 20 },
  gap: { gap: 8 },
  fail: { color: flColor.redMuted, fontSize: 13, lineHeight: 19 },
  quiet: { color: flText.tertiary, fontSize: 12, lineHeight: 17 },
  toggle: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
    borderRadius: flRadius.sm,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  toggleOn: { borderColor: flColor.accentBorder, backgroundColor: flColor.selectedFill },
  toggleText: { color: flText.tertiary, fontSize: 11.5, fontWeight: '600' },
  toggleTextOn: { color: flColor.selectedInk },
  row: { paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: flColor.divider, gap: 6 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  who: { flex: 1, minWidth: 0, color: flText.primary, fontSize: 13, fontWeight: '600' },
  when: { flexShrink: 0, color: flText.secondary, fontSize: 12, fontVariant: ['tabular-nums'] },
  meta: { color: flText.secondary, fontSize: 11.5, lineHeight: 16 },
  reasons: { color: flText.tertiary, fontSize: 11.5, lineHeight: 16 },
  sideBySide: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  col: { flexGrow: 1, flexBasis: 280, minWidth: 0, gap: 6 },
  colLabel: { color: flColor.labelInk, fontSize: 10.5, letterSpacing: 1.1, textTransform: 'uppercase', marginTop: 4 },
  mono: { color: flText.primary, fontSize: 11.5, lineHeight: 16, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  photo: { width: '100%', height: 360, borderRadius: flRadius.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: flRadius.sm,
    borderWidth: 1,
    borderColor: flColor.accentBorder,
    backgroundColor: flColor.bronzeTint,
  },
  actionLabel: { fontSize: 11.5, fontWeight: '600', color: flColor.bronzeInk },
  pressed: { opacity: 0.7 },
});
