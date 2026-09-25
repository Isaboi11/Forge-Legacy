import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ChevronRightIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { NutritionTabIcon } from '@/components/forge/primitives/icons/NavIcons';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { fetchDay } from '@/data/nutrition-live';
import { localToday, totals } from '@/domain/nutrition/day';
import { homeNutritionView, type MacroKey } from '@/domain/nutrition/home-card';
import { useNutritionAccess } from '@/lib/entitlement';
import { useQuery } from '@/lib/useQuery';

/**
 * NUTRITION ON HOME: the PO's mockup (2026-09-24), redrawn with the four notes from its review:
 *
 *   1. CARBS ARE PLUM. Calories keep bronze, so no two bars share a colour, and the colours are the ones
 *      Nutrition Home's rings use (protein green, carbs plum, fat blue). One key, learned once.
 *   2. THE NUTRITION TAB'S OWN FLAME, not the Forge mark, so the card reads as a door to that tab.
 *   3. NEVER A ROW OF ZEROS. Nothing logged shows the day's targets; no target shows what was eaten and an
 *      invitation. The words are `homeNutritionView`'s, which is where every state is tested.
 *   4. It is ONE button with one sentence for a screen reader, not seven loose numbers.
 *
 * Shown only to an athlete with Nutrition access, and not until the day has loaded, so it never flashes
 * zeros on the way in. It re-reads on focus, so a meal logged a moment ago is on it when they come back.
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
      <View style={styles.head}>
        <NutritionTabIcon color={flColor.bronze400} />
        <Text style={styles.eyebrow}>Nutrition</Text>
        <View style={styles.headSpacer} />
        <ChevronRightIcon size={18} color={flColor.bronze400} />
      </View>

      <View style={styles.body}>
        <View style={styles.calories}>
          <Text style={styles.bigValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {v.calories.value}
          </Text>
          <Text style={[styles.label, { color: flColor.bronze400 }]} numberOfLines={1}>
            {v.calories.label}
          </Text>
          <Bar fraction={v.calories.fraction} color={flColor.bronze400} />
          <Text style={styles.sub} numberOfLines={1}>
            {v.calories.sub}
          </Text>
        </View>

        <View style={styles.divider} />

        {v.macros.map((m) => (
          <View key={m.key} style={styles.macro}>
            <Text style={styles.macroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {m.value}
              <Text style={styles.macroUnit}>{m.unit}</Text>
            </Text>
            <Text style={[styles.label, { color: MACRO_COLOR[m.key] }]} numberOfLines={1}>
              {m.label}
            </Text>
            <Bar fraction={m.fraction} color={MACRO_COLOR[m.key]} />
            <Text style={styles.sub} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {m.sub || ' '}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

/**
 * A progress bar. The fill is a WIDTH PERCENTAGE of a track with a real width: the track is a flex child
 * of a column that has one, so the percentage resolves. A tiny non-zero day still shows a sliver
 * (min 4%) so "some" never reads as "none".
 */
function Bar({ fraction, color }: { fraction: number; color: string }) {
  const pct = fraction > 0 ? Math.max(4, Math.round(fraction * 100)) : 0;
  return (
    <View style={styles.track}>
      {pct > 0 ? <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 14,
  },
  cardPressed: { opacity: 0.88 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrow: { fontSize: 12.5, fontWeight: '600', letterSpacing: 2.4, textTransform: 'uppercase', color: flColor.gray400 },
  headSpacer: { flex: 1 },

  body: { flexDirection: 'row', alignItems: 'stretch' },
  calories: { flex: 1.25, minWidth: 0, gap: 6 },
  divider: { width: 1, backgroundColor: flColor.charcoal600, marginHorizontal: 14 },
  macro: { flex: 1, minWidth: 0, gap: 6, paddingRight: 8 },

  bigValue: { fontFamily: flFont.display, fontSize: 40, lineHeight: 46, color: flColor.cream100, fontVariant: ['tabular-nums'] },
  macroValue: { fontSize: 21, lineHeight: 26, fontWeight: '700', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  macroUnit: { fontSize: 14, fontWeight: '600', color: flColor.gray400 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  sub: { fontSize: 12.5, color: flColor.gray400, fontVariant: ['tabular-nums'] },

  track: { height: 5, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal700, overflow: 'hidden', marginTop: 2 },
  fill: { height: '100%', borderRadius: flRadius.pill },
});
