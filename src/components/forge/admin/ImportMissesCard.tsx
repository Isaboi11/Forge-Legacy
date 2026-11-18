import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { useCrm } from '@/components/forge/admin/crm-theme';
import { Block, Btn, Chip, Row } from '@/components/forge/admin/crm-ui';
import { fetchImportMisses, importMissPhotoUrl, resolveImportMiss, settleImportMissPhotos } from '@/data/import-miss-live';
import { importMissForClaude, weeksLines, type ImportMiss } from '@/domain/program/import-miss';
import { useQuery } from '@/lib/useQuery';

/**
 * /admin → Business → AI health → "IMPORT MISSES" (AI Road to 10 Sprint 3b, IM-5; migration 0275 `admin_import_misses`),
 * the web line's version. Build 11 draws this as a Forge `SectionCard` under its own /admin-ai page; the web's /admin
 * is the Business CRM, so here it is a CRM block (`crm-ui` kit, colours only from `useCrm().c`) at the foot of
 * `AiHealthPage` — the same page `/admin-ai` opens, wide or narrow. Same reads, same copy, same rules:
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
  const { c } = useCrm();
  const [showResolved, setShowResolved] = useState(false);
  const q = useQuery(async () => {
    /* Settling is housekeeping: its failure never hides the queue. */
    await settleImportMissPhotos().catch(() => 0);
    return fetchImportMisses(showResolved);
  }, [showResolved]);

  return (
    <Block
      label="Import misses"
      sub="Reads athletes sent because we weren’t sure. Kept 90 days. Work each into a reader rule and a corpus case."
      state={
        q.loading && !q.data
          ? { loading: true }
          : q.error || !q.data
            ? { error: `${q.error ?? 'Nothing came back.'} The queue is unknown until it loads — this is not an empty queue.`, onRetry: q.refetch }
            : undefined
      }
    >
      <Row style={{ paddingTop: 14, paddingBottom: 6 }}>
        <Chip label={showResolved ? 'Showing handled too' : 'Show handled too'} on={showResolved} onPress={() => setShowResolved((v) => !v)} size="sm" />
      </Row>
      {q.data && q.data.length === 0 ? (
        <Text style={{ marginTop: 12, fontSize: 14, lineHeight: 21, color: c.ink2 }}>
          {showResolved ? 'Nothing sent in the last 90 days.' : 'Nothing waiting. Every miss is handled.'}
        </Text>
      ) : (
        (q.data ?? []).map((m) => <MissRow key={m.id} m={m} onChanged={q.refetch} />)
      )}
    </Block>
  );
}

function MissRow({ m, onChanged }: { m: ImportMiss; onChanged: () => void }) {
  const { c } = useCrm();
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
  const colLabel = { fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' as const, color: c.ink3, marginTop: 4 };
  const mono = { fontSize: 12.5, lineHeight: 18, color: c.ink, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) };
  return (
    <View style={{ paddingVertical: 12, gap: 6, borderBottomWidth: 1, borderBottomColor: c.line }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, gap: 3 })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: '600', color: c.ink }} numberOfLines={1}>
            {m.athlete}
            {m.handle ? ` @${m.handle}` : ''}
          </Text>
          <Text style={{ flexShrink: 0, fontSize: 13, color: c.ink2, fontVariant: ['tabular-nums'] }}>{m.createdAt.slice(0, 10)}</Text>
        </View>
        <Text style={{ fontSize: 12.5, lineHeight: 18, color: c.ink2 }}>
          {m.kind === 'photo' ? (m.photoPath ? 'Photo (included)' : 'Photo (words only)') : 'Paste'} · {m.read?.via ?? '?'} · app {m.appVersion ?? 'unknown'}
          {m.resolvedAt ? ` · handled${m.resolution ? `: ${m.resolution}` : ''}` : ''}
        </Text>
        {reasons ? <Text style={{ fontSize: 12.5, lineHeight: 18, color: c.ink3 }}>{reasons}</Text> : null}
      </Pressable>
      {open ? (
        <View style={{ gap: 10 }}>
          {/* The input beside what was read: two columns on a wide screen, one under the other on a phone. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            <View style={{ flexGrow: 1, flexBasis: 280, minWidth: 0, gap: 6 }}>
              <Text style={colLabel}>{m.kind === 'photo' ? 'Read off the photo' : 'They pasted'}</Text>
              <Text style={mono} selectable>
                {m.inputText ?? '(photo only)'}
              </Text>
              {m.photoPath ? (
                photo?.url ? (
                  <Image source={{ uri: photo.url }} style={{ width: '100%', height: 360, borderRadius: 8 }} resizeMode="contain" accessibilityLabel="The photo they sent" />
                ) : photo?.loading ? (
                  <ActivityIndicator color={c.brz} />
                ) : (
                  <View style={{ alignSelf: 'flex-start' }}>
                    <Btn label={photo ? 'Photo unavailable — try again' : 'Show the photo'} onPress={showPhoto} size="sm" />
                  </View>
                )
              ) : null}
            </View>
            <View style={{ flexGrow: 1, flexBasis: 280, minWidth: 0, gap: 6 }}>
              <Text style={colLabel}>What the app read</Text>
              <Text style={mono} selectable>
                {weeksLines(m.read?.weeks).join('\n') || '(nothing)'}
              </Text>
              {m.corrected ? (
                <>
                  <Text style={colLabel}>What they changed it to</Text>
                  <Text style={mono} selectable>
                    {weeksLines(m.corrected).join('\n')}
                  </Text>
                </>
              ) : null}
              {m.read?.skipped?.length ? (
                <>
                  <Text style={colLabel}>Not read as training</Text>
                  <Text style={mono}>{m.read.skipped.join('\n')}</Text>
                </>
              ) : null}
            </View>
          </View>
          <Row>
            <Btn label="Copy for Claude" onPress={copy} size="sm" />
            {m.resolvedAt ? null : <Btn label="Mark handled" onPress={handled} size="sm" />}
          </Row>
          {note ? (
            <Text style={{ fontSize: 12.5, lineHeight: 18, color: c.ink3 }} accessibilityLiveRegion="polite">
              {note}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
