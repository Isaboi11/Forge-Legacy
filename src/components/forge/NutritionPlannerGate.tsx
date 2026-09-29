import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont } from '@/constants/foundation';
import { useEntitlementState, useNutritionPlanner } from '@/lib/entitlement';

/**
 * The door on the PREMIUM part of Nutrition (0244, PO decision "B" 2026-09-29): the meal planner, the grocery
 * list and creating or editing recipes. Logging food, barcode scans and targets stay free on every plan.
 *
 * Wraps a whole route rather than sitting inside it, so a screen's hooks never run behind a conditional
 * return and a typed URL, a Holt chip or an old deep link all meet the same door. The server gate is
 * `has_nutrition_planner()` in RLS — this is what a Free athlete SEES instead of a screen whose writes fail.
 *
 * Loading reads as "not yet" (blank), never as "yes": the planner must not flash open and then close.
 */
export function NutritionPlannerGate({ children, what }: { children: ReactNode; what: string }) {
  const router = useRouter();
  const planner = useNutritionPlanner();
  const { status } = useEntitlementState();

  if (planner) return <>{children}</>;

  return (
    <View style={styles.root}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.46)' }} />
      <AppBar title="" transparent onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/nutrition'))} />
      {status === 'ready' ? (
        <View style={styles.body}>
          <Text style={styles.eyebrow}>Premium</Text>
          <Text style={styles.title}>{what} is part of Premium.</Text>
          <Text style={styles.copy}>
            Logging food, scanning barcodes and your calorie and macro targets are free. The meal planner, the
            grocery list and building recipes come with Premium.
          </Text>
          <Button variant="primary" fullWidth onPress={() => router.push('/subscription')} accessibilityLabel="See Premium">
            See Premium
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 14, paddingBottom: 80 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.labelInk },
  title: { fontFamily: flFont.display, fontSize: 28, lineHeight: 33, fontWeight: '600', color: flColor.cream100 },
  copy: { fontSize: 15, lineHeight: 22, color: flColor.gray400, marginBottom: 10 },
});
