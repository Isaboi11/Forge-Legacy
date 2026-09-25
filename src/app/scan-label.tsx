import type { ComponentProps, ComponentType } from 'react';
import { View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';

import type { LabelScanner as LabelScannerType } from '@/components/forge/LabelScanner';
import { labelScanAvailable, leaveLabelScan } from '@/lib/label-scan';

/**
 * Scan label — the camera route over Create Food (`Scan Nutrition Label v2.dc.html`, B1–C2).
 *
 * ⚠ **THE SCANNER IS `require`d, NEVER IMPORTED.** `LabelScanner` imports `expo-camera`, which throws on
 * load in a binary without it. Create Food only shows the Scan label card when `labelScanAvailable()`,
 * but a typed URL or a stale link could still land here on build 8 or the web — so this route checks
 * again and sends the athlete back to Create Food rather than evaluating the camera.
 *
 * The result crosses `router.back()` through `leaveLabelScan` (see `lib/label-scan`). "Enter manually"
 * is also just back: Create Food is what is underneath, and it is empty.
 */
const Scanner: ComponentType<ComponentProps<typeof LabelScannerType>> | null = labelScanAvailable()
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('@/components/forge/LabelScanner') as typeof import('@/components/forge/LabelScanner')).LabelScanner
  : null;

export default function ScanLabelScreen() {
  const router = useRouter();
  if (!Scanner) return <Redirect href="/create-food" />;
  const back = () => router.back();
  return (
    <View style={{ flex: 1 }}>
      <Scanner
        onClose={back}
        onManual={back}
        onScanned={(scan) => {
          leaveLabelScan(scan);
          back();
        }}
      />
    </View>
  );
}
