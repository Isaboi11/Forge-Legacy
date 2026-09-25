import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { flColor, flRadius } from '@/constants/foundation';
import { fetchRangeTotals } from '@/data/nutrition-live';
import { saveAppPrefs } from '@/data/settings-live';
import { localToday } from '@/domain/nutrition/day';
import {
  CARE_LINE_COPY,
  careDismissedUntil,
  careLineActive,
  careWindow,
  type CareDismissal,
} from '@/domain/nutrition/care-line';
import type { AthleteSex } from '@/domain/nutrition/targets';
import { useNutritionAccess } from '@/lib/entitlement';
import { useProfile } from '@/lib/profile';
import { useAppPrefs } from '@/lib/settings';
import { useQuery } from '@/lib/useQuery';

export interface CareLineState {
  /** True when the rule in `care-line.ts` says to show the line, and it has not been dismissed. */
  active: boolean;
  /** True once the answer is real (prefs, profile and the week all read). A surface that must stay quiet
      WHILE the line is on waits for this, so it never shows for a beat and then vanishes. */
  known: boolean;
  dismiss: (choice: CareDismissal) => void;
}

/**
 * Whether the Nutrition care line is on. Every surface that shows it (Home, Details, Targets) and every one
 * that must go quiet because of it (the Home card's gap line) asks here, so they can never disagree.
 *
 * The window is the seven completed days before today, read with the same `fetchRangeTotals` the Details
 * screen uses. Sex is `profiles.sex`, the way Targets reads it. The dismissal lives in `app_prefs`
 * (`careLineUntil`), so it holds per account, on every device, with no migration.
 *
 * ⚠ OFF UNTIL EVERYTHING HAS LOADED. Prefs serve defaults while in flight (a null dismissal), and a missing
 * profile reads as `unspecified` (the higher threshold), so answering early could flash the line at someone
 * who dismissed it, or at a woman whose days are not low. Silence is the safe wait.
 *
 * `reloadKey` lets a screen that re-reads on focus re-read this too.
 */
export function useCareLine(reloadKey: unknown = 0): CareLineState {
  const mayUseNutrition = useNutritionAccess();
  const { prefs, loaded, refetch } = useAppPrefs();
  const { profile } = useProfile();
  /* Minted once per mount, like the rest of nutrition. */
  const [todayIso] = useState(() => localToday());
  const span = useMemo(() => careWindow(todayIso), [todayIso]);
  const { data: days } = useQuery(
    async () => (mayUseNutrition ? fetchRangeTotals(span.from, span.to) : null),
    [mayUseNutrition, span.from, span.to, reloadKey],
  );
  /* The line goes at once on a tap; the write follows, and a failed write brings it back. */
  const [dismissedNow, setDismissedNow] = useState<string | null>(null);
  const dismissedUntil = dismissedNow ?? prefs.careLineUntil;

  const known = mayUseNutrition && loaded && profile != null && days != null;
  const active =
    known &&
    careLineActive({ days: days ?? [], sex: (profile?.sex ?? 'unspecified') as AthleteSex, todayIso, dismissedUntil });

  const dismiss = (choice: CareDismissal) => {
    const until = careDismissedUntil(todayIso, choice);
    setDismissedNow(until);
    /* `loaded` is true whenever the line is visible, so this spread is the athlete's real prefs, never the
       defaults (the read-modify-write trap `SettingsState.loaded` documents). */
    if (!loaded) return;
    void saveAppPrefs({ ...prefs, careLineUntil: until })
      .then(() => refetch())
      .catch(() => setDismissedNow(null));
  };

  return { active, known, dismiss };
}

/**
 * THE CARE LINE (`domain/nutrition/care-line.ts`). Calm, like a section note: no number, no warning colour,
 * no alarm icon, no diagnosis. A quiet panel because it holds two buttons (a card is for acting inside of);
 * neutral charcoal edge, never bronze. The words are the PO's, verbatim.
 */
export function NutritionCareLine({ care, style }: { care: CareLineState; style?: StyleProp<ViewStyle> }) {
  if (!care.active) return null;
  return (
    <View style={[styles.panel, style]} accessibilityRole="summary">
      <Text style={styles.title} accessibilityRole="header">
        {CARE_LINE_COPY.title}
      </Text>
      <Text style={styles.body}>{CARE_LINE_COPY.body}</Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Hides this for 30 days"
          hitSlop={6}
          onPress={() => care.dismiss('partialLogging')}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.secondary}>{CARE_LINE_COPY.partialLogging}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Hides this for 7 days"
          hitSlop={6}
          onPress={() => care.dismiss('acknowledged')}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.primary}>{CARE_LINE_COPY.acknowledged}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 6,
  },
  title: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  body: { fontSize: 13, lineHeight: 20, color: flColor.gray400 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', columnGap: 20 },
  action: { minHeight: 44, justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  secondary: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  primary: { fontSize: 13, fontWeight: '600', color: flColor.bronze400 },
});
