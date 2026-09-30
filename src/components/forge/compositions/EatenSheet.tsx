import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { grouped } from '@/domain/nutrition/day';
import { EAT_STEP, clampEaten, eatenTotals, servingsEatenLabel, type UserRecipe } from '@/domain/nutrition/user-recipes';

/**
 * "How much did you eat?" — logging one of the athlete's own recipes (PO 2026-09-26). One sheet for
 * every door into it: the Recipe screen, Log Food's My Recipes, and My Foods' Recipes tab.
 *
 * Half-serving steps with ½ · 1 · 2 · "All of it" shortcuts; the numbers are a share of the whole
 * recipe's exact totals (`eatenTotals`), never the rounded per-serving card × n.
 *
 * The parent owns WHAT is being logged (`recipe`, null = closed) and HOW it is logged (`onLog` — the
 * meal and day differ by door); this owns only the amount, which starts at 1 serving each time it opens.
 */
export function EatenSheet({
  recipe,
  busy,
  onClose,
  onLog,
}: {
  recipe: UserRecipe | null;
  busy: boolean;
  onClose: () => void;
  onLog: (servings: number) => void;
}) {
  return (
    <BottomSheet open={recipe != null} onClose={onClose} title="How much did you eat?">
      {recipe ? <Body key={recipe.id} recipe={recipe} busy={busy} onLog={onLog} /> : null}
    </BottomSheet>
  );
}

function Body({ recipe, busy, onLog }: { recipe: UserRecipe; busy: boolean; onLog: (servings: number) => void }) {
  const [eat, setEat] = useState(1);
  const makes = Math.max(1, recipe.yield);
  const t = eatenTotals(recipe, eat);
  const shortcuts = [...new Set([0.5, 1, 2, ...(makes > 2 ? [makes] : [])])];

  return (
    <View style={styles.body}>
      <Text style={styles.lead}>{`${recipe.name} makes ${makes} ${makes === 1 ? 'serving' : 'servings'}.`}</Text>
      <View style={styles.qty}>
        <Pressable accessibilityRole="button" accessibilityLabel="Less" style={styles.step} onPress={() => setEat(clampEaten(eat - EAT_STEP))}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.qtyText}>{servingsEatenLabel(eat)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="More" style={styles.step} onPress={() => setEat(clampEaten(eat + EAT_STEP))}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
      <View style={styles.chips}>
        {shortcuts.map((v) => {
          const on = eat === v;
          return (
            <Pressable
              key={v}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => setEat(v)}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{v === makes && makes > 2 ? 'All of it' : servingsEatenLabel(v)}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.totals}>
        <Text style={styles.cal}>
          {grouped(t.kcal)}
          <Text style={styles.calUnit}> cal</Text>
        </Text>
        <Text style={styles.macros}>{`${Math.round(t.protein)}g protein · ${Math.round(t.carb)}g carbs · ${Math.round(t.fat)}g fat`}</Text>
      </View>
      <Button variant="primary" fullWidth disabled={busy} onPress={() => onLog(eat)}>
        Add to diary
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16, paddingBottom: 12 },
  lead: { marginTop: -8, fontSize: 13, color: flColor.gray400 },
  qty: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
  },
  step: { width: 56, height: '100%', alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 22, color: flColor.gray400 },
  qtyText: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: flColor.cream100, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { height: 36, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: flRadius.pill, borderWidth: 1, borderColor: flColor.charcoal600 },
  chipOn: { backgroundColor: flColor.selectedFill, borderColor: flColor.accentBorder },
  chipText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  chipTextOn: { color: flColor.bronzeInk },
  totals: { gap: 4 },
  cal: { fontFamily: flFont.display, fontSize: 30, color: flColor.cream100, fontVariant: ['tabular-nums'] },
  calUnit: { fontSize: 15, fontWeight: '600', color: flColor.gray400 },
  macros: { fontSize: 13, color: flColor.gray400 },
});
