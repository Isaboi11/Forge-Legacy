import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ChevronRightIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { NutritionTabIcon } from '@/components/forge/primitives/icons/NavIcons';
import { flColor, flRadius } from '@/constants/foundation';
import { fetchDay } from '@/data/nutrition-live';
import { localToday, totals } from '@/domain/nutrition/day';
import { homeNutritionView, type MacroKey } from '@/domain/nutrition/home-card';
import { useNutritionAccess } from '@/lib/entitlement';
import { useQuery } from '@/lib/useQuery';

/**
 * NUTRITION ON HOME: TWO LINES, option A (PO, 2026-09-24).
 *
 * The first cut (the PO's own mockup, built at full size) took half a screen and its 40pt "190" competed
 * with the workout card, which is Home's lead. PO: *"pretty minimal … a quick look and not taking over the
 * page."* Two options were drawn; A was chosen, and the bars were kept on purpose: they are the half-second
 * read, which is the whole reason for a card on Home; the rings on Nutrition are the long look.
 *
 *   line 1 — flame · "190 / 2,610 cal" · "2,420 left" · chevron
 *   line 2 — ● Protein 16 /175g · ● Carbs 14 /300g · ● Fat 8 /80g, each over a 4pt bar
 *
 * Colours are Nutrition Home's rings (protein green, carbs PLUM, fat blue), so one key is learned once. The
 * words and every state (nothing logged, no target, past a target) are `homeNutritionView`'s, and tested.
 * One button, one screen-reader sentence. Hidden without Nutrition access, and until the day has loaded,
 * so it never flashes zeros. It re-reads on focus.
 */
const MACRO_COLOR: Record<MacroKey, string> = {
  protein: flColor.greenMuted,
  carb: flColor.plumMuted,
  fat: flColor.blueMuted,
};

export function HomeNutritionCard({ onOpen }: { onOpen: () => void }) {
  const mayUseNutrition = useNutritionAccess();
  const [reloads, setReloads] = useState(0);
  useFocusEffect(useCallback(() => setReloads((n) => n + 1), []));
  const { data } = useQuery(async () => (mayUseNutrition ? fetchDay(localToday()) : null), [mayUseNutrition, reloads]);
  if (!mayUseNutrition || !data) return null;

  const v = homeNutritionView(totals(data.entries), data.entries.length > 0, data.targets);
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={v.a11y}
      accessibilityHint="Opens Nutrition"
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.line}>
        <NutritionTabIcon color={flColor.bronze400} size={18} />
        <Text style={styles.kcal} numberOfLines={1}>
          {v.kcal}
          <Text style={styles.kcalOf}>{` ${v.kcalOf}`}</Text>
        </Text>
        <Text style={styles.right} numberOfLines={1}>
          {v.right}
        </Text>
        <ChevronRightIcon size={16} color={flColor.bronze400} />
      </View>

      <View style={styles.macros}>
        {v.macros.map((m) => (
          <View key={m.key} style={styles.macro}>
            <View style={styles.macroText}>
              <View style={[styles.dot, { backgroundColor: MACRO_COLOR[m.key] }]} />
              <Text style={styles.macroLine} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {`${m.label} `}
                <Text style={styles.macroValue}>{m.value}</Text>
                {` ${m.of}`}
              </Text>
            </View>
            {v.bars ? (
              <View style={styles.track}>
                {m.fraction > 0 ? (
                  /* A width PERCENTAGE of a track that has a real width (a flex child of the macro column).
                     A sliver (min 4%) so "some" never reads as "none". */
                  <View style={[styles.fill, { width: `${Math.max(4, Math.round(m.fraction * 100))}%`, backgroundColor: MACRO_COLOR[m.key] }]} />
                ) : null}
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  cardPressed: { opacity: 0.88 },

  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kcal: { flexShrink: 1, fontSize: 19, fontWeight: '700', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  kcalOf: { fontSize: 14, fontWeight: '500', color: flColor.gray400 },
  right: { marginLeft: 'auto', fontSize: 13, color: flColor.gray400, fontVariant: ['tabular-nums'] },

  macros: { flexDirection: 'row', gap: 14 },
  macro: { flex: 1, minWidth: 0, gap: 7 },
  macroText: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: flRadius.round },
  macroLine: { flexShrink: 1, fontSize: 12, color: flColor.gray400, fontVariant: ['tabular-nums'] },
  macroValue: { fontWeight: '600', color: flColor.cream100 },

  track: { height: 4, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal700, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: flRadius.pill },
});
