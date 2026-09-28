import { useCallback, useState } from 'react';
import type { ComponentType } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { flBorder, flColor, flRadius } from '@/constants/foundation';
import { resolveBarcode } from '@/data/nutrition-live';
import type { CatalogFood } from '@/domain/nutrition/serving';

/**
 * THE BARCODE SHEET — one scanner for every place a packaged food comes in: Log Food, and the recipe builder's
 * ingredients (PO 2026-09-28: *"when I'm building a recipe I want to be able to scan the barcode and not just
 * the label"*). Moved here from `log-food.tsx` so both read a barcode the same way.
 *
 * ⚠ **SCANNED ON BUILD 9+, TYPED EVERYWHERE ELSE.** `expo-camera` is a native module, so the viewfinder exists
 * only in a binary built after it was added. `BarcodeCamera` is `require`d only when `ExpoCamera` is present;
 * build 8 and the web preview keep the typed box, which stays under the camera on build 9 too for a code the
 * camera cannot read. Both feed the same `resolveBarcode` call.
 *
 * `onNotFound`'s `empty` — Forge found a record for this code with no nutrition (the protein bar whose numbers
 * were all zero), so its name and brand can travel to Create Food. See `pickBarcodeResult`.
 */

/**
 * The viewfinder, or `null` on a build without the camera module. Never a top-level import:
 * `expo-camera` throws on load when its native half is missing, which would crash the screen on build 8.
 */
const ScanCamera: ComponentType<{ paused: boolean; onScan: (digits: string) => void }> | null =
  Platform.OS !== 'web' && requireOptionalNativeModule('ExpoCamera')
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('@/components/forge/BarcodeCamera') as typeof import('@/components/forge/BarcodeCamera')).BarcodeCamera
    : null;

export function BarcodeSheet({
  open,
  onClose,
  onFound,
  onNotFound,
}: {
  open: boolean;
  onClose: () => void;
  /** `digits` — the code read, for a caller that must carry it on (a found food with no numbers). */
  onFound: (food: CatalogFood, digits: string) => void;
  onNotFound: (digits: string, empty: { name: string; brand: string | null } | null) => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const find = useCallback(
    async (raw: string) => {
      const digits = raw.replace(/\D/g, '');
      if (digits.length < 8) return;
      setBusy(true);
      const result = await resolveBarcode(digits);
      setBusy(false);
      setCode('');
      if (result.kind === 'food') onFound(result.food, digits);
      else onNotFound(digits, result.kind === 'empty' ? { name: result.name, brand: result.brand } : null);
    },
    [onFound, onNotFound],
  );
  const look = useCallback(() => find(code), [code, find]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Barcode">
      <View style={styles.body}>
        {/* Mounted only while the sheet is open, so the camera is off (and its one-read lock reset)
            every time the sheet closes. */}
        {ScanCamera && open ? <ScanCamera paused={busy} onScan={find} /> : null}
        <Text style={styles.note}>
          {ScanCamera
            ? 'Hold the barcode a few inches away until it sharpens. Or type the number under it.'
            : 'Type the number under the barcode.'}
        </Text>
        <TextInput
          returnKeyType="done"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          placeholder="0 12345 67890 5"
          placeholderTextColor={flColor.gray600}
          style={styles.numberInput}
          accessibilityLabel="Barcode number"
          onSubmitEditing={look}
        />
        <Button variant="primary" fullWidth disabled={busy || code.replace(/\D/g, '').length < 8} onPress={look}>
          {busy ? 'Looking…' : 'Find it'}
        </Button>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 8 },
  note: { fontSize: 13, color: flColor.gray400, lineHeight: 19 },
  numberInput: {
    fontSize: 16,
    fontWeight: '600',
    color: flColor.cream100,
    backgroundColor: flColor.charcoal800,
    borderRadius: flRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...flBorder.subtle,
  },
});
