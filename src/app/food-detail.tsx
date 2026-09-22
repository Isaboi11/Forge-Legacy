import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { ProgressBar } from '@/components/forge/composites/ProgressBar';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flBorder, flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { MEAL_LABELS, MEAL_SLOTS, totals, type MealSlot } from '@/domain/nutrition/day';
import {
  convertAmount,
  extraRows,
  impactLine,
  oneDecimal,
  stepAmount,
  stepFor,
  unitChoices,
  unitWord,
  type UnitChoice,
} from '@/domain/nutrition/detail';
import { portionLabel, portionMacros, SOURCE_LABEL } from '@/domain/nutrition/serving';
import { addEntries, fetchDay, fetchFoodByKey, fetchFavorites, setFavorite } from '@/data/nutrition-live';
import { useToast } from '@/hooks/useCeremony';
import { useQuery } from '@/lib/useQuery';

/**
 * Food Detail — built to `Food Detail.dc.html`, wired to the catalogue and the diary.
 *
 * Faithful to the `.dc`: the bare back bar with a star on the right, the serif name over its source line,
 * the 56px calorie figure with "N left after this" beside it, the serving card (− amount + with unit
 * pills under it), three macro bars against the daily target, the "More nutrients" disclosure, and the
 * footer's "ADDING TO Breakfast ⌄" over a button that names the meal and the calories.
 *
 * ⚠ **IT REPLACED A SHEET, DELIBERATELY.** Log Food used to open a small portion sheet; this screen is
 * what the PO designed, so the row now pushes here and the sheet is gone. The round + in Log Food still
 * logs a default serving in one tap — the two-tap path and the considered path are different actions.
 *
 * ⚠ **EVERY FIGURE COMES FROM `domain/nutrition`** (NUT-D4): `portionMacros` for the portion,
 * `impactLine` for the line beside the calories, `extraRows` for the disclosure. This file lays them out.
 *
 * ⚠ **AN UNKNOWN NUTRIENT IS ABSENT, NOT ZERO.** USDA gives fibre for oats and nothing for many branded
 * rows; printing "0 g" there would be a claim we cannot make. `extraRows` omits it, so the list is short
 * for a poor record and long for a good one.
 */
export default function FoodDetailScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ key?: string; date?: string; meal?: string }>();

  const foodKey = typeof params.key === 'string' ? params.key : '';
  const iso = typeof params.date === 'string' ? params.date : new Date().toISOString().slice(0, 10);

  const { data: food, loading } = useQuery(useCallback(() => fetchFoodByKey(foodKey), [foodKey]), [foodKey]);
  const { data: day } = useQuery(useCallback(() => fetchDay(iso), [iso]), [iso]);
  const { data: favorites, refetch: refetchFavorites } = useQuery(fetchFavorites, []);

  const [meal, setMeal] = useState<MealSlot>(
    (MEAL_SLOTS as readonly string[]).includes(String(params.meal)) ? (params.meal as MealSlot) : 'breakfast',
  );
  const [mealPickerOpen, setMealPickerOpen] = useState(false);
  const [unitIndex, setUnitIndex] = useState(0);
  const [amountText, setAmountText] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const units = useMemo<UnitChoice[]>(() => (food ? unitChoices(food) : []), [food]);
  const unit = units[unitIndex] ?? units[0];
  /* Until the athlete types, the amount is the unit's natural one: a whole cup, or 100 g. */
  const amount = amountText != null ? Number(amountText.replace(',', '.')) || 0 : unit?.serving.grams === 1 ? 100 : 1;

  const macros = useMemo(
    () => (food && unit ? portionMacros(food, { serving: unit.serving, quantity: amount }) : null),
    [food, unit, amount],
  );

  const eaten = useMemo(() => totals(day?.entries ?? []), [day]);
  const targets = day?.targets ?? null;
  const impact = macros ? impactLine(eaten.kcal, macros.kcal, targets?.kcal ?? null) : null;
  const extras = useMemo(() => extraRows(food?.micros, macros?.grams ?? null), [food, macros]);
  const isFavorite = (favorites ?? []).some((f) => f.key === foodKey);

  const setAmount = (next: number) => setAmountText(String(next));

  const add = async () => {
    if (!food || !unit || !macros || macros.kcal <= 0 || saving) return;
    setSaving(true);
    await addEntries(iso, [
      {
        meal,
        source: food.source,
        sourceKey: food.key,
        name: food.name,
        brand: food.brand,
        servingLabel: portionLabel({ serving: unit.serving, quantity: amount }),
        quantity: amount,
        macros,
      },
    ]);
    showToast(`${food.name} added to ${MEAL_LABELS[meal]}`);
    /* Back to the diary, not to the search: the athlete came here to log one thing and has logged it. */
    router.dismissAll?.();
    router.replace('/nutrition');
  };

  if (!food) {
    return (
      <View style={styles.screen}>
        <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.22)' }} />
        <AppBar title="" transparent onBack={() => router.back()} />
        <Text style={styles.missing}>
          {loading ? 'Loading…' : "This food isn't in the catalogue any more. Search for it again."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.22)' }} />

      <AppBar
        title=""
        transparent
        onBack={() => router.back()}
        actions={
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isFavorite }}
            accessibilityLabel={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
            hitSlop={8}
            style={styles.starButton}
            onPress={async () => {
              await setFavorite({ key: food.key, name: food.name, brand: food.brand }, !isFavorite);
              refetchFavorites();
            }}
          >
            <Svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill={isFavorite ? flColor.bronze400 : 'none'}
              stroke={isFavorite ? flColor.bronze400 : flColor.gray400}
              strokeWidth={1.7}
              strokeLinejoin="round"
            >
              <Path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
            </Svg>
          </Pressable>
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* identity */}
        <View style={styles.identity}>
          <Text style={styles.name}>{food.name}</Text>
          <Text style={styles.source}>
            {[food.brand, SOURCE_LABEL[food.source]].filter(Boolean).join(' · ')}
          </Text>
        </View>

        {/* calories */}
        <View style={styles.calorieRow}>
          <View>
            <Text style={styles.calorieValue}>{(macros?.kcal ?? 0).toLocaleString('en-US')}</Text>
            <Text style={styles.calorieLabel}>Calories</Text>
          </View>
          {impact ? <Text style={styles.impact}>{impact}</Text> : null}
        </View>

        {/* serving */}
        <View style={styles.servingCard}>
          <View style={styles.stepperRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decrease amount"
              style={styles.roundButton}
              onPress={() => setAmount(stepAmount(amount, -stepFor(unit)))}
            >
              <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.9} strokeLinecap="round">
                <Path d="M5 12h14" />
              </Svg>
            </Pressable>

            <View style={styles.amountWrap}>
              <TextInput
                value={amountText ?? String(amount)}
                onChangeText={(t) => setAmountText(t.replace(/[^0-9.]/g, '').slice(0, 6))}
                keyboardType="decimal-pad"
                accessibilityLabel="Amount"
                selectTextOnFocus
                style={styles.amountInput}
              />
              <Text style={styles.unitWord}>{unitWord(unit, amount)}</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase amount"
              style={styles.roundButton}
              onPress={() => setAmount(stepAmount(amount, stepFor(unit)))}
            >
              <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={1.9} strokeLinecap="round">
                <Path d="M12 5v14M5 12h14" />
              </Svg>
            </Pressable>
          </View>

          <View style={styles.unitPills}>
            {units.map((u, i) => (
              <Pressable
                key={u.label}
                accessibilityRole="button"
                accessibilityState={{ selected: i === unitIndex }}
                style={[styles.pill, i === unitIndex && styles.pillOn]}
                onPress={() => {
                  if (i === unitIndex) return;
                  /* Convert, never reset: 1 cup becomes 80 g, not 1 g. */
                  setAmount(convertAmount(amount, unit, u));
                  setUnitIndex(i);
                }}
              >
                <Text style={[styles.pillText, i === unitIndex && styles.pillTextOn]}>{u.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* macros */}
        <View style={styles.macroHeader}>
          <Text style={styles.sectionLabel}>Macros</Text>
          <Text style={styles.sectionNote}>{targets ? 'of daily target' : 'no target set'}</Text>
        </View>
        <View style={styles.macroList}>
          <MacroBar label="Protein" value={macros?.protein ?? 0} max={targets?.protein ?? null} />
          <MacroBar label="Carbs" value={macros?.carb ?? 0} max={targets?.carb ?? null} />
          <MacroBar label="Fat" value={macros?.fat ?? 0} max={targets?.fat ?? null} />
        </View>

        {/* more nutrients — only when the source actually gave us some */}
        {extras.length ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: moreOpen }}
              style={styles.moreToggle}
              onPress={() => setMoreOpen((v) => !v)}
            >
              <Text style={styles.sectionLabel}>More nutrients</Text>
              <Svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke={flColor.gray600}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: [{ rotate: moreOpen ? '180deg' : '0deg' }] }}
              >
                <Path d="M6 9l6 6 6-6" />
              </Svg>
            </Pressable>
            {moreOpen ? (
              <View>
                {extras.map((row) => (
                  <View key={row.label} style={styles.extraRow}>
                    <Text style={styles.extraLabel}>{row.label}</Text>
                    <Text style={styles.extraValue}>{row.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        {food.attribution ? <Text style={styles.attribution}>{food.attribution}</Text> : null}
      </ScrollView>

      {/* commit */}
      <View style={styles.footer}>
        <Pressable accessibilityRole="button" style={styles.mealLine} onPress={() => setMealPickerOpen(true)}>
          <Text style={styles.mealLineLabel}>Adding to</Text>
          <Text style={styles.mealLineValue}>{MEAL_LABELS[meal]}</Text>
          <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M6 9l6 6 6-6" />
          </Svg>
        </Pressable>
        <Button variant="primary" fullWidth disabled={!macros || macros.kcal <= 0 || saving} onPress={add}>
          {`Add to ${MEAL_LABELS[meal]} · ${(macros?.kcal ?? 0).toLocaleString('en-US')} cal`}
        </Button>
      </View>

      <BottomSheet open={mealPickerOpen} onClose={() => setMealPickerOpen(false)} title="Adding to">
        <View style={styles.sheetBody}>
          {MEAL_SLOTS.map((slot) => (
            <Pressable
              key={slot}
              accessibilityRole="button"
              style={[styles.choice, slot === meal && styles.choiceOn]}
              onPress={() => {
                setMeal(slot);
                setMealPickerOpen(false);
              }}
            >
              <Text style={[styles.choiceText, slot === meal && styles.choiceTextOn]}>{MEAL_LABELS[slot]}</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

/**
 * One macro against the daily target: the name and the grams on a line, the bar under it.
 *
 * ⚠ The `.dc` hands `label` and `trailing` to the design system's ProgressBar, but the app's
 * `ProgressBar` (CLA-C12) is the bar alone — its `label` is the accessibility name, not drawn text. The
 * row is composed here rather than by growing a component thirty other screens already lay out around.
 *
 * With no target there is nothing to fill, so the bar stays at its track and only the grams are stated —
 * a bar that silently means nothing is worse than no bar.
 */
function MacroBar({ label, value, max }: { label: string; value: number; max: number | null }) {
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroRowHead}>
        <Text style={styles.macroName}>{label}</Text>
        <Text style={styles.macroGrams}>{`${oneDecimal(value)} g`}</Text>
      </View>
      <ProgressBar value={max ? Math.min(value, max) : 0} max={max ?? 100} label={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  starButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  missing: { paddingHorizontal: 24, paddingTop: 40, fontSize: 14, lineHeight: 20, color: flColor.gray400 },

  identity: { gap: 6, paddingHorizontal: 2, paddingBottom: 26 },
  name: { fontFamily: flFont.display, fontSize: 30, color: flColor.cream100, letterSpacing: -0.3, lineHeight: 34 },
  source: { fontSize: 13, color: flColor.gray600 },

  calorieRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, paddingHorizontal: 2, paddingBottom: 22 },
  calorieValue: { fontFamily: flFont.display, fontSize: 56, color: flColor.cream100, letterSpacing: -1, lineHeight: 56 },
  calorieLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.bronze400, marginTop: 8 },
  impact: { flex: 1, textAlign: 'right', fontSize: 13, color: flColor.gray400, paddingBottom: 2 },

  servingCard: {
    gap: 16,
    padding: 20,
    borderRadius: flRadius.xl,
    backgroundColor: flColor.charcoal800,
    borderWidth: 1,
    borderColor: flColor.charcoal700,
    boxShadow: flShadow.cardSoft,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  roundButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: flRadius.round,
    backgroundColor: flColor.surfaceRecessed,
    ...flBorder.bronzeSubtle,
  },
  amountWrap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8 },
  amountInput: {
    minWidth: 60,
    textAlign: 'right',
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: flColor.cream100,
    padding: 0,
  },
  unitWord: { fontSize: 15, fontWeight: '600', color: flColor.gray400 },
  unitPills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 },
  pill: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: flRadius.pill },
  pillOn: { backgroundColor: flColor.bronzeDark },
  pillText: { fontSize: 11.5, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase', color: flColor.gray600 },
  pillTextOn: { color: flColor.bronze300 },

  macroHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 2, paddingTop: 28, paddingBottom: 14 },
  sectionLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: flColor.gray600 },
  sectionNote: { fontSize: 11.5, color: flColor.gray600 },
  macroList: { gap: 18, paddingHorizontal: 2 },
  macroRow: { gap: 7 },
  macroRowHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  macroName: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  macroGrams: { fontSize: 13, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },

  moreToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    paddingVertical: 14,
    paddingHorizontal: 2,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
  },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal700,
  },
  extraLabel: { fontSize: 14, color: flColor.gray400 },
  extraValue: { fontSize: 14, fontWeight: '600', color: flColor.cream100 },
  attribution: { paddingTop: 18, paddingHorizontal: 2, fontSize: 11, color: flColor.gray600 },

  footer: {
    gap: 10,
    paddingTop: 14,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
    backgroundColor: flColor.charcoal900,
  },
  mealLine: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4, paddingHorizontal: 2 },
  mealLineLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.gray600 },
  mealLineValue: { fontSize: 13.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.bronze400 },

  sheetBody: { gap: 10, paddingBottom: 8 },
  choice: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: flRadius.md, backgroundColor: flColor.charcoal800, ...flBorder.subtle },
  choiceOn: { backgroundColor: flColor.bronzeDark, borderColor: flColor.bronzeBorder },
  choiceText: { fontSize: 14, fontWeight: '600', color: flColor.gray400 },
  choiceTextOn: { color: flColor.bronze300 },
});
