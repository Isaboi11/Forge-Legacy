import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';

import { Button } from '@/components/forge/composites/Button';
import { flColor, flRadius } from '@/constants/foundation';

/**
 * The barcode viewfinder inside Log Food's Barcode sheet — a lens on the same `lookupBarcode` call the
 * typed box makes (Nutrition Architecture §5, Phase 1: "barcode (new binary)").
 *
 * ⚠ **THIS FILE IMPORTS `expo-camera` AT THE TOP, SO NOTHING MAY IMPORT IT AT THE TOP.** The package calls
 * `requireNativeModule('ExpoCamera')` on load, which THROWS on a binary built before the module was added
 * (build 8 and older) — an OTA to one of those would crash Log Food on open. `log-food.tsx` checks
 * `requireOptionalNativeModule('ExpoCamera')` first and only then `require`s this file, the same shape as
 * `useDictation` and `form-check-live`. On the web the typed box stays the only path.
 *
 * Only the four retail symbologies are asked for — a QR on the same box would otherwise win the race.
 * The server pads whatever arrives to a GTIN-14, so a UPC-A read as EAN-13 (iOS adds the leading 0)
 * finds the same food.
 */
export function BarcodeCamera({ paused, onScan }: { paused: boolean; onScan: (digits: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  /* One read per open. The camera reports the same code many times a second; without this lock one
     can of beans would fire a lookup per frame until the sheet closed. */
  const [locked, setLocked] = useState(false);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={styles.ask}>
        <Text style={styles.note}>
          {permission.canAskAgain
            ? 'Point the camera at the barcode and it finds the food.'
            : 'The camera is off for Forge Legacy. Turn it on in Settings, or type the number below.'}
        </Text>
        <Button
          variant="secondary"
          fullWidth
          onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
        >
          {permission.canAskAgain ? 'Use the camera' : 'Open Settings'}
        </Button>
      </View>
    );
  }

  const handle = (result: BarcodeScanningResult) => {
    const digits = result.data.replace(/\D/g, '');
    if (digits.length < 8) return;
    setLocked(true);
    onScan(digits);
  };

  return (
    <View style={styles.frame}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={paused || locked ? undefined : handle}
      />
      <View pointerEvents="none" style={styles.guide} />
    </View>
  );
}

const styles = StyleSheet.create({
  ask: { gap: 10 },
  note: { fontSize: 13, color: flColor.gray400, lineHeight: 19 },
  frame: {
    height: 220,
    borderRadius: flRadius.md,
    overflow: 'hidden',
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* The band a barcode sits in — a quiet cream outline, not a bronze one (bronze is not a border colour). */
  guide: {
    width: '78%',
    height: 96,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(244, 238, 226, 0.55)',
  },
});
