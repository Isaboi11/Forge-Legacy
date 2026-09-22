import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flBorder, flColor, flFont, flRadius } from '@/constants/foundation';
import { fetchTargetsOn, saveTargets } from '@/data/nutrition-live';
import { useToast } from '@/hooks/useCeremony';
import { useQuery } from '@/lib/useQuery';
import { SCREEN_BOTTOM_GAP } from '@/lib/screen-insets';

/**
 * Nutrition targets — the calories and macros Nutrition Home measures a day against.
 *
 * ⚠ **PHASE 1 IS MANUAL ONLY, AND THAT IS A SAFETY DECISION, NOT A SHORTCUT.** A *recommended* target
 * needs birth year, height and activity (0205 §5) and must obey NUT-D5's floors — no recommendation
 * below 1,500 kcal (male) / 1,200 kcal (female), no deficit steeper than ~1% of bodyweight a week, and
 * **nothing recommended at all to anyone under 18**. That machinery is Phase 2; shipping a recommender
 * without it is precisely the failure the architecture's §10 exists to prevent.
 *
 * The athlete's own number is still their own (NUT-D5: "the athlete always owns their targets"), so a
 * low manual figure is accepted — with a plain, non-alarming line, never a block and never a warning
 * colour.
 *
 * ⚠ **SAVING WRITES A NEW ROW**, it never edits an old one (`saveTargets`), so last week still reads
 * against the target that was true last week.
 */

/** NUT-D5. Stated per day, in kcal. Sex-specific because the clinical floors are. */
const FLOOR = { female: 1200, male: 1500 } as const;

export default function NutritionTargetsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { data: current } = useQuery(() => fetchTargetsOn(today), [today]);

  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carb, setCarb] = useState('');
  const [fat, setFat] = useState('');
  const [touched, setTouched] = useState(false);

  /* The saved target is the starting point; typing takes over from it. */
  const value = (typed: string, saved: number | undefined) => (touched || typed !== '' ? typed : saved != null ? String(saved) : '');
  const kcalValue = value(kcal, current?.kcal);
  const proteinValue = value(protein, current?.protein);
  const carbValue = value(carb, current?.carb);
  const fatValue = value(fat, current?.fat);

  const kcalNumber = Number(kcalValue);
  const macroKcal = Number(proteinValue || 0) * 4 + Number(carbValue || 0) * 4 + Number(fatValue || 0) * 9;
  /* The macros are the same calories, counted a second way — 50 kcal of slack absorbs honest rounding. */
  const mismatch = kcalNumber > 0 && macroKcal > 0 && Math.abs(macroKcal - kcalNumber) > 50;
  const low = kcalNumber > 0 && kcalNumber < FLOOR.female;
  const valid = kcalNumber > 0 && Number(proteinValue) >= 0;

  const save = async () => {
    await saveTargets({
      kcal: kcalNumber,
      protein: Number(proteinValue || 0),
      carb: Number(carbValue || 0),
      fat: Number(fatValue || 0),
    });
    showToast('Target saved');
    router.back();
  };

  return (
    <View style={styles.screen}>
      <ScreenBackground paperTexture="atmospheric" image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.22)' }} />
      <AppBar title="Daily Target" transparent onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: SCREEN_BOTTOM_GAP }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.lede}>
          What you are aiming for each day. Change it whenever you like — every day keeps the target it was
          logged against.
        </Text>

        <Field label="Calories" value={kcalValue} onChange={(v) => { setTouched(true); setKcal(v); }} big />
        <View style={styles.macroRow}>
          <Field label="Protein (g)" value={proteinValue} onChange={(v) => { setTouched(true); setProtein(v); }} />
          <Field label="Carbs (g)" value={carbValue} onChange={(v) => { setTouched(true); setCarb(v); }} />
          <Field label="Fat (g)" value={fatValue} onChange={(v) => { setTouched(true); setFat(v); }} />
        </View>

        {mismatch ? (
          <Text style={styles.note}>
            {`Your macros come to ${Math.round(macroKcal)} calories. That is fine if you meant it — they don't have to match.`}
          </Text>
        ) : null}

        {low ? (
          <Text style={styles.note}>
            That is a low daily target. It is yours to set, and Forge will keep it — but if you are cutting,
            a smaller gap usually holds longer.
          </Text>
        ) : null}

        <Text style={styles.footnote}>
          Forge can work a target out for you once it knows your age, height and how active you are. That
          arrives with the next nutrition pass.
        </Text>

        <Button variant="primary" fullWidth disabled={!valid} onPress={save}>
          Save target
        </Button>
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChange, big = false }: { label: string; value: string; onChange: (v: string) => void; big?: boolean }) {
  return (
    <View style={[styles.field, big && styles.fieldBig]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        style={[styles.input, big && styles.inputBig]}
        accessibilityLabel={label}
        selectTextOnFocus
        placeholder="—"
        placeholderTextColor={flColor.gray600}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: flColor.base },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },
  lede: { fontSize: 14, lineHeight: 20, color: flColor.gray400 },
  field: { gap: 6 },
  fieldBig: { paddingBottom: 4 },
  fieldLabel: { fontSize: 10.5, fontWeight: '600', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.gray600 },
  input: {
    fontSize: 16,
    fontWeight: '600',
    color: flColor.cream100,
    backgroundColor: flColor.charcoal800,
    borderRadius: flRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...flBorder.subtle,
  },
  inputBig: { fontFamily: flFont.display, fontSize: 30, paddingVertical: 14 },
  macroRow: { flexDirection: 'row', gap: 10 },
  note: { fontSize: 13, lineHeight: 19, color: flColor.gray400 },
  footnote: { fontSize: 12.5, lineHeight: 18, color: flColor.gray600 },
});
