import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont } from '@/constants/foundation';
import { HOLT_LABEL, type HoltNote } from '@/domain/coach/holt-marks';

/**
 * "UPDATED BY HOLT" — the label on a session Holt changed, and the sheet it opens.
 *
 * Rules and storage are in `domain/coach/holt-marks.ts`. The label is a small tappable pill; the sheet says
 * what changed, what the athlete asked, and for how long, and offers Undo and a way back to Holt.
 *
 * Layout is shared by both themes; colours are role tokens (labelInk text, accentBorderSubtle edge), so
 * Alabaster keeps bronze for the edge only and Forge reads exactly as its other small bronze chips do.
 */
export function HoltUpdatedChip({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`${HOLT_LABEL}. See what changed`}
      style={({ pressed }) => [styles.chip, pressed ? styles.pressed : null]}
    >
      <View style={styles.mark}>
        <Text style={styles.markText}>H</Text>
      </View>
      <Text style={styles.chipText}>{HOLT_LABEL}</Text>
    </Pressable>
  );
}

const fmtDay = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export function HoltUpdateSheet({
  note,
  span,
  onClose,
  onUndo,
  onAsk,
}: {
  /** The note to show; the sheet is open while this is non-null. */
  note: HoltNote | null;
  /** "Weeks 3–5" — which weeks the change reaches. */
  span: string | null;
  onClose: () => void;
  /** Put it back. Resolves to an error sentence, or null when it worked (the caller closes the sheet). */
  onUndo?: () => Promise<string | null>;
  onAsk?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const when = note ? fmtDay(note.at) : null;

  const close = () => {
    setError(null);
    onClose();
  };

  return (
    <BottomSheet open={note != null} onClose={close} title={HOLT_LABEL}>
      {note ? (
        <View style={styles.body}>
          {when ? <Text style={styles.lede}>Holt changed this on {when}.</Text> : null}
          <View style={styles.section}>
            <Text style={styles.label}>What changed</Text>
            <Text style={styles.value}>{note.what}</Text>
          </View>
          {note.asked ? (
            <View style={styles.section}>
              <Text style={styles.label}>You asked</Text>
              <Text style={styles.quote}>“{note.asked}”</Text>
            </View>
          ) : null}
          {span ? (
            <View style={styles.section}>
              <Text style={styles.label}>How long</Text>
              <Text style={styles.value}>{span}</Text>
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            {onUndo ? (
              <Button
                variant="secondary"
                fullWidth
                disabled={busy}
                accessibilityLabel="Undo this change"
                onPress={() => {
                  setBusy(true);
                  setError(null);
                  void onUndo()
                    .then((msg) => {
                      if (msg) setError(msg);
                      else onClose();
                    })
                    .finally(() => setBusy(false));
                }}
              >
                {busy ? 'Putting it back…' : 'Undo this change'}
              </Button>
            ) : null}
            {onAsk ? (
              <Button
                variant="text"
                fullWidth
                accessibilityLabel="Ask Holt about it"
                onPress={() => {
                  close();
                  onAsk();
                }}
              >
                Ask Holt about it
              </Button>
            ) : null}
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingLeft: 3,
    paddingRight: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: flColor.accentBorderSubtle,
  },
  pressed: { opacity: 0.7 },
  mark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: flColor.accentBorder,
  },
  markText: { fontFamily: flFont.display, fontSize: 9.5, fontWeight: '700', color: flColor.labelInk },
  chipText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: flColor.labelInk },
  body: { gap: 16, paddingBottom: 8 },
  lede: { fontSize: 14, color: flColor.gray400 },
  section: { gap: 4 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: flColor.labelInk },
  value: { fontSize: 16, lineHeight: 22, color: flColor.cream100 },
  quote: { fontFamily: flFont.display, fontStyle: 'italic', fontSize: 16, lineHeight: 22, color: flColor.cream100 },
  error: { fontSize: 14, lineHeight: 20, color: flColor.dangerText },
  actions: { gap: 8, marginTop: 4 },
});
