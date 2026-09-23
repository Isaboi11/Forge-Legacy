import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { InputField } from '@/components/forge/composites/InputField';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { localToday, MEAL_LABELS, MEAL_SLOTS, type MealSlot } from '@/domain/nutrition/day';
import {
  checkCalories,
  extrasPerHundred,
  FOOD_UNITS,
  labelServing,
  MORE_NUTRIENTS,
  perHundred,
  servingGrams,
  unitByKey,
  unitNeedsWeight,
  validateFood,
} from '@/domain/nutrition/create-food';
import { portionLabel, portionMacros } from '@/domain/nutrition/serving';
import { addEntries, createUserFood, fetchFoodByKey, updateUserFood } from '@/data/nutrition-live';
import { useToast } from '@/hooks/useCeremony';
import { errorMessage, useQuery } from '@/lib/useQuery';
import { SCREEN_BOTTOM_GAP } from '@/lib/screen-insets';

/**
 * Create Food — built to `Create Food.dc.html`, wired to `user_foods` (0205) and its micronutrients
 * (0207). Also the Edit-food screen: `?food=<id>&mode=edit`.
 *
 * ⚠ **IT REPLACED A SHEET, LIKE FOOD DETAIL DID.** Log Food opened a six-field `CreateFoodSheet`; the
 * PO designed a screen with two entry modes, a unit picker, a calories-versus-macros check and ten more
 * nutrients, and a bottom sheet cannot hold that with a keyboard up. The sheet is retired.
 *
 * ⚠ **EVERY NUMBER IS CONVERTED IN ONE PLACE** (`domain/nutrition/create-food`, NUT-D4). A label states
 * ONE SERVING and the catalogue stores PER 100 g; this file positions fields and never divides.
 *
 * ⚠ **"SCAN LABEL" IS NOT DRAWN YET, AND THAT IS THE HONEST CHOICE.** The `.dc` has a camera frame and a
 * Capture button that fills the form by reading the panel. `expo-camera` is native — it cannot reach
 * build 8 over the air, exactly as the barcode scanner cannot (Log Food's header says so) — and there is
 * no label OCR behind it either. Drawing the frame and a button that only apologises is the defect class
 * this codebase names by hand ("a button whose only behaviour is a coming-soon toast"), so the mode
 * switch is hidden — which is exactly what the `.dc`'s own `showScan: false` renders. Build 9 brings
 * the camera; the mode tabs and the capture pane get built then, against a scanner that exists.
 */

type Fields = Record<string, string>;

const EMPTY: Fields = { name: '', brand: '', amount: '', unitWeight: '', cal: '', protein: '', carb: '', fat: '' };

export default function CreateFoodScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ meal?: string; date?: string; food?: string; mode?: string }>();

  const iso = typeof params.date === 'string' && params.date ? params.date : localToday();
  const editId = params.mode === 'edit' && typeof params.food === 'string' && params.food ? params.food : null;
  const editing = editId != null;

  const [meal, setMeal] = useState<MealSlot>(
    (MEAL_SLOTS as readonly string[]).includes(String(params.meal)) ? (params.meal as MealSlot) : 'breakfast',
  );
  const [mealPickerOpen, setMealPickerOpen] = useState(false);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unitKey, setUnitKey] = useState('g');
  const [edited, setEdited] = useState<Fields | null>(null);

  const { data: existing } = useQuery(
    useCallback(() => (editId ? fetchFoodByKey(editId) : Promise.resolve(null)), [editId]),
    [editId],
  );

  /**
   * The form. Derived from the loaded food until the athlete touches it, never seeded by an effect —
   * a `setState` on load is the react-compiler lint error this codebase treats as a build break.
   *
   * ⚠ Editing shows the label BACK as a label. The row is per 100 g, so the fields are re-multiplied by
   * the stored serving's weight; showing the per-100 g figures in a form headed "per serving" is the
   * same three-times-wrong bug the conversion exists to prevent.
   */
  const loaded = useMemo<Fields | null>(() => {
    if (!existing) return null;
    const serving = existing.servings?.[0];
    const grams = serving?.grams ?? 100;
    const per = (v: number | null | undefined) => (v == null ? '' : String(Math.round(((v * grams) / 100) * 10) / 10));
    const out: Fields = {
      ...EMPTY,
      name: existing.name,
      brand: existing.brand ?? '',
      amount: String(Math.round(grams * 100) / 100),
      cal: per(existing.kcal100),
      protein: per(existing.protein100),
      carb: per(existing.carb100),
      fat: per(existing.fat100),
    };
    for (const { key } of MORE_NUTRIENTS) {
      const v = existing.micros?.[key];
      if (typeof v === 'number') out[key] = String(Math.round(((v * grams) / 100) * 10) / 10);
    }
    return out;
  }, [existing]);

  const f = edited ?? loaded ?? EMPTY;
  const set = (key: string) => (v: string) => setEdited({ ...f, [key]: v });
  const setNumber = (key: string) => (v: string) =>
    setEdited({ ...f, [key]: v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 6) });

  const unit = unitByKey(unitKey);
  const needsWeight = unitNeedsWeight(unit);
  const grams = servingGrams(f.amount, unit, f.unitWeight);
  const calories = checkCalories({ cal: f.cal, protein: f.protein, carb: f.carb, fat: f.fat });
  const validity = validateFood({
    name: f.name,
    brand: f.brand,
    amount: f.amount,
    unitKey,
    unitWeight: f.unitWeight,
    cal: f.cal,
    protein: f.protein,
    carb: f.carb,
    fat: f.fat,
  });

  const perLabel = grams != null && f.amount ? `per ${f.amount} ${unit.short}` : '';

  const build = () => {
    const g = grams as number;
    return {
      name: f.name.trim(),
      brand: f.brand.trim() || null,
      kcal100: perHundred(String(calories.calories), g),
      protein100: perHundred(f.protein, g),
      carb100: perHundred(f.carb, g),
      fat100: perHundred(f.fat, g),
      servings: [labelServing(f.amount, unit, g)],
      micros: extrasPerHundred(f, g),
    };
  };

  /** Create (or save), and optionally log one serving of it straight into the chosen meal. */
  const save = async (thenLog: boolean) => {
    if (!validity.ok || saving) return;
    setSaving(true);
    try {
      const input = build();
      const food = editing ? await updateUserFood(editId, input) : await createUserFood(input);
      if (!food) return;

      if (thenLog && !editing) {
        const serving = input.servings[0];
        const macros = portionMacros(food, { serving, quantity: 1 });
        await addEntries(iso, [
          {
            meal,
            source: 'custom',
            sourceKey: food.key,
            name: food.name,
            brand: food.brand,
            servingLabel: portionLabel({ serving, quantity: 1 }),
            quantity: 1,
            micros: input.micros,
            macros,
          },
        ]);
        showToast(`${food.name} added to ${MEAL_LABELS[meal]}`);
        router.dismissAll?.();
        router.replace('/nutrition');
        return;
      }

      showToast(editing ? 'Changes saved' : `${food.name} saved to My Foods`);
      router.back();
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const macroFields = MORE_NUTRIENTS.filter((n) => n.group === 'macro');
  const vitaminFields = MORE_NUTRIENTS.filter((n) => n.group === 'vitamin');

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.22)' }} />
      <AppBar title="" transparent onBack={() => router.back()} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{editing ? 'Edit food' : 'Create food'}</Text>

        {/* identity */}
        <View style={styles.group}>
          <InputField label="Name" placeholder="e.g. Overnight oats" value={f.name} onChange={set('name')} maxLength={60} />
          <InputField label="Brand (optional)" placeholder="e.g. Trader Joe’s" value={f.brand} onChange={set('brand')} maxLength={40} />
        </View>

        {/* serving */}
        <Text style={[styles.sectionLabel, styles.sectionSolo]}>Serving size</Text>
        <View style={styles.servingRow}>
          <Text style={styles.servingLead}>1 serving =</Text>
          <View style={styles.servingAmount}>
            <InputField
              accessibilityLabel="Serving amount"
              placeholder="80"
              keyboardType="decimal-pad"
              value={f.amount}
              onChange={setNumber('amount')}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Serving unit"
            style={styles.unitButton}
            onPress={() => setUnitsOpen(true)}
          >
            <Text style={styles.unitText}>{unit.label}</Text>
            <Chevron />
          </Pressable>
        </View>

        {/*
          ⚠ NOT IN THE `.dc`, AND THE FOOD IS BROKEN WITHOUT IT. `portionMacros` returns ZEROS for a
          serving with no gram weight — on purpose, because inventing one is worse — so a food created
          as "1 serving = 1 piece" would log as 0 calories, every time, silently. A cup of oil and a cup
          of flour do not weigh the same and a "piece" weighs nothing anybody knows, so this asks instead
          of assuming a density. The three weight units never see it.
        */}
        {needsWeight ? (
          <View style={styles.weightRow}>
            <InputField
              label={`One ${unit.short} weighs about`}
              placeholder={unit.weightHint ?? '30'}
              keyboardType="decimal-pad"
              value={f.unitWeight}
              onChange={setNumber('unitWeight')}
              helper="Grams. Forge needs it to scale a portion — a cup of oil and a cup of flour are not the same weight."
            />
          </View>
        ) : null}

        {/* nutrition */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>Nutrition per serving</Text>
          {perLabel ? <Text style={styles.sectionNote}>{perLabel}</Text> : null}
        </View>
        <View style={styles.group}>
          <InputField
            label="Calories"
            placeholder={calories.placeholder}
            keyboardType="number-pad"
            value={f.cal}
            onChange={setNumber('cal')}
          />
          <View style={styles.macroRow}>
            <View style={styles.macroCell}>
              <InputField label="Protein g" placeholder="0" keyboardType="decimal-pad" value={f.protein} onChange={setNumber('protein')} />
            </View>
            <View style={styles.macroCell}>
              <InputField label="Carbs g" placeholder="0" keyboardType="decimal-pad" value={f.carb} onChange={setNumber('carb')} />
            </View>
            <View style={styles.macroCell}>
              <InputField label="Fat g" placeholder="0" keyboardType="decimal-pad" value={f.fat} onChange={setNumber('fat')} />
            </View>
          </View>
          {calories.helper ? (
            <Text style={[styles.calHelper, calories.warn && styles.calWarn]}>{calories.helper}</Text>
          ) : null}
        </View>

        {/* more nutrients */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: moreOpen }}
          style={styles.moreToggle}
          onPress={() => setMoreOpen((v) => !v)}
        >
          <Text style={styles.sectionLabel}>More nutrients</Text>
          <Chevron color={flColor.gray600} rotated={moreOpen} />
        </Pressable>
        {moreOpen ? (
          <View style={styles.moreGrid}>
            {macroFields.map((n) => (
              <View key={n.key} style={styles.moreCell}>
                <InputField label={n.label} placeholder="0" keyboardType="decimal-pad" value={f[n.key] ?? ''} onChange={setNumber(n.key)} />
              </View>
            ))}
            <Text style={styles.vitaminLabel}>Vitamins &amp; minerals</Text>
            {vitaminFields.map((n) => (
              <View key={n.key} style={styles.moreCell}>
                <InputField label={n.label} placeholder="0" keyboardType="decimal-pad" value={f[n.key] ?? ''} onChange={setNumber(n.key)} />
              </View>
            ))}
            {/* An empty box is not a zero — `extrasPerHundred` drops it rather than claiming none. */}
            <Text style={styles.moreNote}>Leave anything the label doesn’t state blank. Blank means unknown, not zero.</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* commit */}
      <View style={styles.footer}>
        {validity.reason ? <Text style={styles.blocker}>{validity.reason}</Text> : null}
        {!editing ? (
          <Pressable accessibilityRole="button" style={styles.mealLine} onPress={() => setMealPickerOpen(true)}>
            <Text style={styles.mealLineLabel}>Adding to</Text>
            <Text style={styles.mealLineValue}>{MEAL_LABELS[meal]}</Text>
            <Chevron />
          </Pressable>
        ) : null}
        <Button variant="primary" fullWidth disabled={!validity.ok || saving} onPress={() => save(!editing)}>
          {editing
            ? 'Save changes'
            : calories.calories > 0
              ? `Create food · ${Math.round(calories.calories).toLocaleString('en-US')} cal`
              : 'Create food'}
        </Button>
        {!editing ? (
          <Pressable accessibilityRole="button" disabled={!validity.ok || saving} onPress={() => save(false)}>
            <Text style={[styles.saveOnly, (!validity.ok || saving) && styles.saveOnlyOff]}>Create without logging</Text>
          </Pressable>
        ) : null}
      </View>

      <BottomSheet open={unitsOpen} onClose={() => setUnitsOpen(false)} title="Unit">
        <View style={styles.sheetBody}>
          {FOOD_UNITS.map((u) => {
            const on = u.key === unitKey;
            return (
              <Pressable
                key={u.key}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={styles.sheetRow}
                onPress={() => {
                  setUnitKey(u.key);
                  setUnitsOpen(false);
                }}
              >
                <Text style={[styles.sheetLabel, on && styles.sheetLabelOn]}>{u.label}</Text>
                {on ? <Check /> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>

      <BottomSheet open={mealPickerOpen} onClose={() => setMealPickerOpen(false)} title="Adding to">
        <View style={styles.sheetBody}>
          {MEAL_SLOTS.map((slot) => {
            const on = slot === meal;
            return (
              <Pressable
                key={slot}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={styles.sheetRow}
                onPress={() => {
                  setMeal(slot);
                  setMealPickerOpen(false);
                }}
              >
                <Text style={[styles.sheetLabel, on && styles.sheetLabelOn]}>{MEAL_LABELS[slot]}</Text>
                {on ? <Check /> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────────── */

function Chevron({ color = flColor.bronze400, rotated = false }: { color?: string; rotated?: boolean }) {
  return (
    <Svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: [{ rotate: rotated ? '180deg' : '0deg' }] }}
    >
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

function Check() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze400} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 28 },

  title: { fontFamily: flFont.display, fontSize: 30, color: flColor.cream100, letterSpacing: -0.3, lineHeight: 34, paddingHorizontal: 2, paddingBottom: 20 },
  group: { gap: 18 },

  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 30, paddingBottom: 12, paddingHorizontal: 2 },
  sectionLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: flColor.gray600 },
  sectionSolo: { paddingTop: 30, paddingBottom: 12, paddingHorizontal: 2 },
  sectionNote: { fontSize: 11.5, color: flColor.gray600 },

  servingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  servingLead: { fontSize: 15, fontWeight: '600', color: flColor.gray400 },
  servingAmount: { flex: 1, minWidth: 0 },
  unitButton: {
    flex: 1.15,
    minWidth: 0,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: flRadius.md,
    borderWidth: 1.5,
    borderColor: flColor.charcoal500,
    backgroundColor: flColor.surfaceRecessed,
  },
  unitText: { flex: 1, fontSize: 15, color: flColor.cream100 },
  weightRow: { paddingTop: 14 },

  macroRow: { flexDirection: 'row', gap: 10 },
  macroCell: { flex: 1, minWidth: 0 },
  calHelper: { paddingHorizontal: 2, fontSize: 12, lineHeight: 17, color: flColor.gray600 },
  calWarn: { color: flColor.redMuted },

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
  moreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 6 },
  moreCell: { width: '47.5%', minWidth: 0 },
  vitaminLabel: { width: '100%', fontSize: 10.5, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', color: flColor.gray600, paddingTop: 10, paddingHorizontal: 2 },
  moreNote: { width: '100%', paddingTop: 6, paddingHorizontal: 2, fontSize: 12, lineHeight: 17, color: flColor.gray600 },

  footer: {
    gap: 10,
    paddingTop: 14,
    paddingBottom: SCREEN_BOTTOM_GAP,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: flColor.charcoal700,
    backgroundColor: flColor.charcoal900,
  },
  blocker: { fontSize: 12, lineHeight: 17, color: flColor.gray400, textAlign: 'center' },
  mealLine: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4, paddingHorizontal: 2 },
  mealLineLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.gray600 },
  mealLineValue: { fontSize: 13.5, fontWeight: '600', letterSpacing: 0.3, color: flColor.bronze400 },
  saveOnly: { alignSelf: 'center', paddingVertical: 6, fontSize: 12.5, fontWeight: '600', color: flColor.gray600, textAlign: 'center' },
  saveOnlyOff: { opacity: 0.4 },

  sheetBody: { paddingBottom: 8 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal700,
  },
  sheetLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  sheetLabelOn: { color: flColor.bronze300 },
});
