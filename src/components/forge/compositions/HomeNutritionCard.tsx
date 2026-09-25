import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ChevronRightIcon } from '@/components/forge/primitives/icons/HomeIcons';
import { NutritionTabIcon } from '@/components/forge/primitives/icons/NavIcons';
import { flColor, flRadius } from '@/constants/foundation';
import { fetchDay, fetchGroceryState, fetchMealPlanPrefs, fetchMealPlanWeek, fetchUserRecipes } from '@/data/nutrition-live';
import { localToday, totals } from '@/domain/nutrition/day';
import { GAP_LINE_FROM_HOUR, gapLine, pantryFrom, type PantryItem } from '@/domain/nutrition/gap-line';
import { groceryList, planSignature, stateFor } from '@/domain/nutrition/grocery';
import { mondayOf, planIsReadable } from '@/domain/nutrition/meal-planner';
import { homeNutritionView, type MacroKey } from '@/domain/nutrition/home-card';
import { useNutritionAccess } from '@/lib/entitlement';
import { useAppPrefs } from '@/lib/settings';
import { saveAppPrefs } from '@/data/settings-live';
import type { HoltTips } from '@/domain/settings/preferences';
import { useQuery } from '@/lib/useQuery';

/**
 * This week's Grocery List as a pantry: bought, have-it and still to buy (`pantryFrom`). Built the same way
 * the Grocery List screen builds it. `fetchUserRecipes` registers the athlete's own recipes into the book
 * before `groceryList` reads it, and a stored week naming a recipe that no longer exists is skipped, never
 * half-read.
 */
async function loadPantry(todayIso: string): Promise<PantryItem[]> {
  const monday = mondayOf(todayIso);
  const [, week, prefs, saved] = await Promise.all([fetchUserRecipes(), fetchMealPlanWeek(monday), fetchMealPlanPrefs(), fetchGroceryState(monday)]);
  if (!week || !planIsReadable(week.days)) return [];
  const household = prefs?.household ?? 1;
  const list = groceryList(week.days, household);
  const state = stateFor(saved, list, planSignature(week.days, household));
  return pantryFrom(list.items.map((i) => i.key), state);
}

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
  /* Preferences → Coaching → "Tips from Holt". Off means the gap line never loads, not merely hides.
     `ask` (nobody has answered) shows the tip WITH the question, once, per the PO: "have him suggest one
     time and ask if it's helpful and if they want that for the future." The answer is saved to prefs, so
     it holds on every device, and Preferences shows the same switch. */
  const { prefs, loaded, refetch } = useAppPrefs();
  const [answered, setAnswered] = useState<HoltTips | null>(null);
  const tips = answered ?? prefs.holtTips;
  const answer = (choice: 'on' | 'off') => {
    setAnswered(choice); // the card answers at once; the write follows
    void saveAppPrefs({ ...prefs, holtTips: choice })
      .then(() => refetch())
      .catch(() => setAnswered(null));
  };
  const [reloads, setReloads] = useState(0);
  useFocusEffect(useCallback(() => setReloads((n) => n + 1), []));
  const { data } = useQuery(async () => (mayUseNutrition ? fetchDay(localToday()) : null), [mayUseNutrition, reloads]);
  /* The gap line (Check-ins scope §3, LOCKED): only asked for in the afternoon, with a target and something
     logged, so the grocery list is not read on every morning open. */
  const hour = new Date().getHours();
  const wantGap = loaded && tips !== 'off' && !!data?.targets && (data?.entries.length ?? 0) > 0 && hour >= GAP_LINE_FROM_HOUR;
  const { data: pantry } = useQuery(async () => (wantGap ? loadPantry(localToday()) : null), [wantGap, reloads]);
  if (!mayUseNutrition || !data) return null;

  const eaten = totals(data.entries);
  const v = homeNutritionView(eaten, data.entries.length > 0, data.targets);
  const gap = pantry ? gapLine({ eaten, logged: data.entries.length > 0, target: data.targets, hour, pantry }) : null;
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={gap ? `${v.a11y} Holt: ${gap}` : v.a11y}
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

      {gap ? (
        <Text style={styles.gap}>
          <Text style={styles.gapWho}>Holt · </Text>
          {gap}
        </Text>
      ) : null}
      {gap && tips === 'ask' ? (
        <View style={styles.ask}>
          <Text style={styles.askText}>Helpful? You can change this any time in Preferences.</Text>
          <View style={styles.askRow}>
            <Pressable onPress={() => answer('on')} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.askBtn, pressed && styles.cardPressed]}>
              <Text style={styles.askYes}>Keep these</Text>
            </Pressable>
            <Pressable onPress={() => answer('off')} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.askBtn, pressed && styles.cardPressed]}>
              <Text style={styles.askNo}>No thanks</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
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

  gap: { fontSize: 12.5, lineHeight: 18, color: flColor.gray400 },
  gapWho: { fontWeight: '600', color: flColor.bronze400 },
  ask: { gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  askText: { fontSize: 12, color: flColor.gray600 },
  askRow: { flexDirection: 'row', gap: 18 },
  askBtn: { paddingVertical: 4 },
  askYes: { fontSize: 13, fontWeight: '600', color: flColor.bronze400 },
  askNo: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },

  track: { height: 4, borderRadius: flRadius.pill, backgroundColor: flColor.charcoal700, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: flRadius.pill },
});
