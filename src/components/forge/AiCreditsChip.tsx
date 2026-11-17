import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { flColor, flRadius, flText } from '@/constants/foundation';
import { useAiCredits } from '@/data/ai-credits-live';
import { aiCreditsChip, type AiChipKind } from '@/domain/ai/credits';
import { useAuth } from '@/lib/auth';
import { usePremiumAi } from '@/lib/entitlement';

/**
 * ══ WHAT IS LEFT, ON EVERY AI SCREEN (AI Road to 10, Sprint 2 — UX-2; migration 0272; Monetization Amendment 012) ══
 *
 * A small pill: "112 credits" · "12 left · resets December 1" · "5 a day until December 1" · "Today's 5 used · back
 * tomorrow". The words are `aiCreditsChip`'s (domain/ai/credits.ts); the numbers are the server's.
 *
 * ⚠ PREMIUM AI ONLY, AND IT DECIDES THAT ITSELF — so every placement is one line. Without Premium AI, or before the
 *   first read lands, or when a read failed, it draws nothing (never a "0").
 * ⚠ BRONZE IS EARNED (Alabaster, PO 09-26). A balance is information: the normal and floor states are neutral ink on
 *   the divider edge in both themes. Only the two warnings take the functional red role — an edge at "low", the
 *   muted fill at "out".
 *
 * `busy` — Holt's chat passes whether a turn is in progress; the chip reads the meter again when it ends.
 * `short` — Holt's header, ~150pt wide on a 320pt phone: the month abbreviated ("resets Dec 1"). VoiceOver still
 *   hears the whole sentence.
 */
export function AiCreditsChip({ busy = false, short = false, style }: { busy?: boolean; short?: boolean; style?: StyleProp<ViewStyle> }) {
  const premiumAi = usePremiumAi();
  const { session } = useAuth();
  const read = useAiCredits(premiumAi ? (session?.user.id ?? null) : null, premiumAi, busy);
  const chip = premiumAi ? aiCreditsChip(read) : null;
  if (!chip) return null;
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={chip.a11y} style={[styles.chip, EDGE[chip.kind], style]}>
      <Text style={[styles.label, short && styles.labelShort, INK[chip.kind]]} numberOfLines={1}>
        {short ? chip.short : chip.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexShrink: 1,
    minWidth: 0,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.divider,
  },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2, color: flText.secondary },
  labelShort: { fontSize: 10.5 },
  normal: {},
  low: { borderColor: flColor.dangerBorder },
  floor: {},
  out: { borderColor: flColor.dangerBorder, backgroundColor: flColor.dangerBg },
  inkNormal: {},
  inkLow: { color: flText.primary },
  inkFloor: { color: flText.primary },
  inkOut: { color: flColor.dangerText },
});

const EDGE: Record<AiChipKind, object> = { normal: styles.normal, low: styles.low, floor: styles.floor, out: styles.out };
const INK: Record<AiChipKind, object> = { normal: styles.inkNormal, low: styles.inkLow, floor: styles.inkFloor, out: styles.inkOut };
