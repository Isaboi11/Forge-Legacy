import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/forge/composites/Button';
import { InputField } from '@/components/forge/composites/InputField';
import { flBorder, flColor, flFont, flRadius } from '@/constants/foundation';
import { checkQuickEntry, largeEntryLine, type QuickFields } from '@/domain/nutrition/amount';
import { grouped, type LogEntry } from '@/domain/nutrition/day';
import { oneDecimal } from '@/domain/nutrition/detail';
import { rescaleServings, servingsOf } from '@/domain/nutrition/meal';
import type { EntryPatch } from '@/domain/nutrition/outbox';
import type { PortionMacros } from '@/domain/nutrition/serving';
import { EAT_STEP, clampEaten, servingsEatenLabel } from '@/domain/nutrition/user-recipes';

/**
 * The two bodies a sheet shows to type or correct a row that has NO food behind it (QA 09-26):
 *
 *  · `QuickEntryForm` — a name and four numbers. Log Food's Quick Add and Meal Detail's "Edit entry" are
 *    the same form, so both read their fields through `checkQuickEntry`: "20g" is 20, "-500" and "abc"
 *    are refused in words under the field, and a very large entry is asked about once before it is
 *    written (R2-B1). It used to send whatever `Number()` made of the text and fail without a word.
 *  · `ServingsForm` — a dish logged in servings (a recipe, one of Holt's), re-counted (N-17).
 *
 * Bodies, not sheets: Meal Detail already has ONE sheet up, and iOS will not present a second over it.
 */

export interface QuickEntryInput {
  name: string;
  macros: PortionMacros;
}

export function QuickEntryForm({
  initial,
  note,
  action,
  verb,
  busy,
  onSubmit,
}: {
  /** The row being corrected; absent for a new Quick Add. */
  initial?: Pick<LogEntry, 'name' | 'kcal' | 'protein' | 'carb' | 'fat'>;
  note?: string;
  /** What the button says: "Add to Lunch", "Save". */
  action: string;
  /** The word in the confirm step: "Yes, add 6,200 cal". */
  verb: 'add' | 'save';
  busy: boolean;
  onSubmit: (input: QuickEntryInput) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [fields, setFields] = useState<QuickFields>({
    kcal: initial ? String(Math.round(initial.kcal)) : '',
    protein: initial ? oneDecimal(initial.protein) : '',
    carb: initial ? oneDecimal(initial.carb) : '',
    fat: initial ? oneDecimal(initial.fat) : '',
  });
  /* The calorie text the athlete has already said yes to. Typing anything else un-says it. */
  const [agreed, setAgreed] = useState<string | null>(null);

  const check = checkQuickEntry(fields);
  const asking = check.ask && agreed === fields.kcal;
  const set = (key: keyof QuickFields) => (v: string) => setFields({ ...fields, [key]: v });

  const submit = () => {
    if (!check.macros || busy) return;
    if (check.ask && !asking) {
      setAgreed(fields.kcal);
      return;
    }
    onSubmit({ name: name.trim(), macros: check.macros });
  };

  return (
    <View style={styles.body}>
      {note ? <Text style={styles.note}>{note}</Text> : null}
      <InputField label="What was it (optional)" value={name} onChange={setName} placeholder="Restaurant lunch" maxLength={60} />
      <View style={styles.macroInputs}>
        <NumberField label="Calories" value={fields.kcal} bad={check.bad.includes('kcal')} onChange={set('kcal')} />
        <NumberField label="Protein" value={fields.protein} bad={check.bad.includes('protein')} onChange={set('protein')} />
        <NumberField label="Carbs" value={fields.carb} bad={check.bad.includes('carb')} onChange={set('carb')} />
        <NumberField label="Fat" value={fields.fat} bad={check.bad.includes('fat')} onChange={set('fat')} />
      </View>
      {check.message ? <Text style={styles.problem}>{check.message}</Text> : null}
      {asking && check.macros ? <Text style={styles.note}>{largeEntryLine(check.macros.kcal)}</Text> : null}
      <Button variant="primary" fullWidth disabled={!check.macros || busy} onPress={submit}>
        {asking && check.macros ? `Yes, ${verb} ${grouped(check.macros.kcal)} cal` : action}
      </Button>
    </View>
  );
}

function NumberField({ label, value, bad, onChange }: { label: string; value: string; bad: boolean; onChange: (v: string) => void }) {
  return (
    <View style={styles.numberField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        returnKeyType="done"
        value={value}
        onChangeText={(t) => onChange(t.slice(0, 12))}
        keyboardType="decimal-pad"
        style={[styles.numberInput, bad && styles.numberInputBad]}
        accessibilityLabel={label}
        selectTextOnFocus
      />
    </View>
  );
}

export function ServingsForm({
  entry,
  busy,
  onSubmit,
}: {
  entry: LogEntry;
  busy: boolean;
  onSubmit: (patch: EntryPatch) => void;
}) {
  const [eat, setEat] = useState(() => servingsOf(entry));
  const next = rescaleServings(entry, eat);

  return (
    <View style={styles.body}>
      <View style={styles.qty}>
        <Pressable accessibilityRole="button" accessibilityLabel="Less" style={styles.step} onPress={() => setEat(clampEaten(eat - EAT_STEP))}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.qtyText}>{servingsEatenLabel(eat)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="More" style={styles.step} onPress={() => setEat(clampEaten(eat + EAT_STEP))}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
      <View style={styles.totals}>
        <Text style={styles.cal}>
          {grouped(next.kcal)}
          <Text style={styles.calUnit}> cal</Text>
        </Text>
        <Text style={styles.macros}>{`${Math.round(next.protein)}g protein · ${Math.round(next.carb)}g carbs · ${Math.round(next.fat)}g fat`}</Text>
      </View>
      <Button variant="primary" fullWidth disabled={busy} onPress={() => onSubmit(next)}>
        Save
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 8 },
  note: { fontSize: 13, color: flColor.gray400, lineHeight: 19 },
  problem: { fontSize: 13, color: flColor.redMuted, lineHeight: 19 },
  fieldLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.gray600 },
  numberInput: {
    fontSize: 16,
    fontWeight: '600',
    color: flColor.cream100,
    backgroundColor: flColor.charcoal800,
    borderRadius: flRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...flBorder.subtle,
  },
  numberInputBad: { borderColor: flColor.redMuted },
  numberField: { flexGrow: 1, flexBasis: '30%', gap: 6 },
  macroInputs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

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
  totals: { gap: 4 },
  cal: { fontFamily: flFont.display, fontSize: 30, color: flColor.cream100, fontVariant: ['tabular-nums'] },
  calUnit: { fontSize: 15, fontWeight: '600', color: flColor.gray400 },
  macros: { fontSize: 13, color: flColor.gray400 },
});
