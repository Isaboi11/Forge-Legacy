import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button } from '@/components/forge/composites/Button';
import { flColor, flRadius, flText } from '@/constants/foundation';
import type { SendOutcome } from '@/data/import-miss-live';
import { importMissSendsLine } from '@/domain/program/import-miss';

/**
 * ══ "SEND THIS TO FORGE SO WE LEARN THIS FORMAT?" (AI Road to 10 Sprint 3b, IM-5; PO 2026-11-17; 0275) ══
 *
 * Shown under the import preview only when the read was unsure (`importUnsureReasons`). The athlete's choice EVERY
 * time: nothing is sent without the tap, the photo only when they tick it, and the words say exactly what goes.
 *
 * ⚠ ONE READ, ONE QUESTION. The answer is kept beside the `readId` it was given for; a new read (another photo, an
 *   edited paste) asks again from the start — derived in render, no effect (the strict hooks lint).
 *
 * Text controls, no glyph (the engraved set is the only icon system and has no checkbox). Colour by role, as
 * `AiFeedback`: the card edge + tertiary ink idle, the earned `accentBorder` when ticked.
 */
type Step = 'ask' | 'sending' | 'sent' | 'declined' | Exclude<SendOutcome, 'sent'>;

const OUTCOME_LINE: Record<Exclude<SendOutcome, 'sent'>, string> = {
  not_ready: 'Sending isn’t switched on yet — nothing was sent.',
  offline: 'You’re offline — nothing was sent. Try again when you’re back.',
  limit: 'That’s plenty for today — nothing more was sent.',
  failed: 'That didn’t send. Nothing was kept — try again.',
};

export function ImportMissOffer({
  readId,
  kind,
  reasons,
  canIncludePhoto,
  onSend,
  style,
}: {
  /** The read this question is about — a new one asks again. */
  readId: string;
  kind: 'paste' | 'photo';
  /** Why the read was unsure, in plain words (never empty when this is drawn). */
  reasons: readonly string[];
  /** A photo read (and the photo is still on the device). */
  canIncludePhoto: boolean;
  onSend: (includePhoto: boolean) => Promise<SendOutcome>;
  style?: StyleProp<ViewStyle>;
}) {
  const [held, setHeld] = useState<{ id: string; step: Step; photo: boolean }>({ id: readId, step: 'ask', photo: false });
  const cur = held.id === readId ? held : { id: readId, step: 'ask' as Step, photo: false };

  if (cur.step === 'declined') return null;
  if (cur.step === 'sent') {
    return (
      <View style={[styles.card, style]}>
        <Text style={styles.done} accessibilityLiveRegion="polite">
          Sent — thank you. We’ll use it to read this kind of program right.
        </Text>
      </View>
    );
  }

  const busy = cur.step === 'sending';
  const send = () => {
    if (busy) return;
    const id = readId;
    const photo = canIncludePhoto && cur.photo;
    setHeld({ id, step: 'sending', photo: cur.photo });
    void onSend(photo).then((out) => setHeld((h) => (h.id === id ? { ...h, step: out } : h)));
  };

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.label}>Not sure we read this right</Text>
      <Text style={styles.reasons}>{reasons.join(' ')}</Text>
      <Text style={styles.question}>Send this to Forge so we learn this format?</Text>
      <Text style={styles.sends}>{importMissSendsLine(kind, canIncludePhoto && cur.photo)}</Text>
      {canIncludePhoto ? (
        <Pressable
          onPress={() => setHeld({ ...cur, photo: !cur.photo })}
          disabled={busy}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: cur.photo, disabled: busy }}
          accessibilityLabel="Include the photo"
          hitSlop={6}
          style={({ pressed }) => [styles.pill, cur.photo && styles.pillOn, pressed && styles.pressed]}
        >
          <Text style={[styles.pillText, cur.photo && styles.pillTextOn]}>{cur.photo ? 'Photo included' : 'Include the photo'}</Text>
        </Pressable>
      ) : null}
      {cur.step !== 'ask' && cur.step !== 'sending' ? (
        <Text style={styles.failed} accessibilityLiveRegion="polite">
          {OUTCOME_LINE[cur.step]}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <View style={styles.sendBtn}>
          <Button variant="secondary" fullWidth disabled={busy} onPress={send} accessibilityLabel="Send this to Forge">
            {busy ? 'Sending…' : 'Send to Forge'}
          </Button>
        </View>
        <Pressable
          onPress={() => setHeld({ ...cur, step: 'declined' })}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="No thanks, don’t send it"
          hitSlop={8}
          style={({ pressed }) => [styles.quietBtn, pressed && styles.pressed]}
        >
          <Text style={styles.quiet}>No thanks</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
    padding: 16,
    marginTop: 16,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  label: { fontSize: 13.5, fontWeight: '600', color: flText.primary },
  reasons: { fontSize: 12.5, color: flText.secondary },
  question: { fontSize: 13.5, color: flText.primary, marginTop: 4 },
  sends: { fontSize: 12, lineHeight: 17, color: flText.tertiary },
  pill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: flRadius.sm,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  pillOn: { borderColor: flColor.accentBorder, backgroundColor: flColor.selectedFill },
  pillText: { color: flText.tertiary, fontSize: 12, fontWeight: '600' },
  pillTextOn: { color: flColor.selectedInk },
  failed: { color: flColor.redMuted, fontSize: 12 },
  done: { color: flText.secondary, fontSize: 13 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  sendBtn: { flex: 1 },
  quietBtn: { paddingVertical: 8 },
  quiet: { fontSize: 13.5, color: flText.tertiary },
  pressed: { opacity: 0.7 },
});
