import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { updateStandard } from '@/data/legacy-live';
import { useToast } from '@/hooks/useCeremony';

/**
 * L-12 · My Standard editor (`Forge Legacy.dc.html` §"My Standard editor") — the bottom sheet that edits
 * the athlete's creed. Title "My Standard", a helper line, a forged multiline well (≤180 chars), and a
 * [Cancel] · [Save Standard] footer (Save disabled while empty). Writes straight to `profiles.standard`
 * and, on success, toasts "Your Standard is set." then hands the new text back so Legacy refetches.
 */

const MAX = 180;
const WELL_INSET = 'inset 0 2px 6px rgba(0,0,0,0.45)';

export function StandardEditorSheet({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: string;
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const { showToast } = useToast();
  // Seeded from the current standard at mount. The parent remounts this sheet on each open (via a `key`
  // keyed to `open`), so the draft always re-seeds to the latest saved standard — no setState-in-effect.
  const [draft, setDraft] = useState(initial);
  const [focus, setFocus] = useState(false);
  const [busy, setBusy] = useState(false);

  const trimmed = draft.trim();
  const empty = trimmed.length === 0;

  const save = () => {
    if (empty || busy) return;
    setBusy(true);
    void updateStandard(trimmed)
      .then(() => {
        onSaved(trimmed);
        onClose();
        showToast('Your Standard is set.');
      })
      .finally(() => setBusy(false));
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="My Standard">
      <View style={styles.wrap}>
        <Text style={styles.helper}>
          The words you train by — the promise your training holds you to. Written in your own voice; it appears at the top of your Legacy.
        </Text>

        <View style={[styles.well, { borderColor: focus ? flColor.bronze400 : flColor.charcoal500, boxShadow: focus ? `${WELL_INSET}, ${flShadow.glowSubtle}` : WELL_INSET }]}>
          <TextInput
            value={draft}
            onChangeText={(t) => setDraft(t.slice(0, MAX))}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            placeholder="Write your standard…"
            placeholderTextColor={flColor.gray600}
            multiline
            maxLength={MAX}
            style={styles.input}
            accessibilityLabel="My standard"
          />
        </View>
        <Text style={styles.count}>
          {draft.length} / {MAX}
        </Text>

        <View style={styles.footer}>
          <Button variant="secondary" onPress={onClose}>
            Cancel
          </Button>
          <Button variant="primary" fullWidth disabled={empty || busy} onPress={save}>
            Save Standard
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  helper: { fontFamily: flFont.sans, fontSize: 13, lineHeight: 20, color: flColor.gray400 },
  well: {
    minHeight: 132,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    backgroundColor: flColor.surfaceRecessed,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontFamily: flFont.display,
    fontStyle: 'italic',
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '500',
    color: flColor.cream100,
    textAlignVertical: 'top',
  },
  count: { fontFamily: flFont.sans, fontSize: 11, color: flColor.gray600, textAlign: 'right', marginTop: -6 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
