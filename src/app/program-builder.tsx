import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/forge/composites/Button';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { createProgram, type ProgramDay, type ProgramStructure } from '@/data/programs-live';
import { listExercises, type CatalogExercise } from '@/domain/training/exercise-names';

/**
 * Program Builder (B1 — the "build my own" path, BU-1 first slice). A minimal-real slice of
 * `Forge Program Builder.dc`: program name + days/week + each day's `main` exercises (added via an inline
 * picker over the 794-exercise catalog) → saved to the `programs` table (0013). It's stored in the FULL
 * `.dc` shape (warmup/cooldown empty, weeks/vary/weekPlans defaulted) so the full builder (C) grows it
 * with no schema change. DEFERRED (flagged, not faked): weeks, per-week variation, warmup/cooldown,
 * import, and the standalone `Forge Exercise Picker` screen (B1 uses the inline picker instead).
 */
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const makeDays = (n: number, existing: ProgramDay[]): ProgramDay[] =>
  Array.from({ length: n }, (_, i) => existing[i] ?? { letter: LETTERS[i], name: '', warmup: [], main: [], cooldown: [] });

export default function ProgramBuilderScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [days, setDays] = useState<ProgramDay[]>(() => makeDays(3, []));
  const [activeDay, setActiveDay] = useState(0);
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setDayCount = (n: number) => {
    setDaysPerWeek(n);
    setDays((prev) => makeDays(n, prev));
    setActiveDay((a) => Math.min(a, n - 1));
  };
  const patchDay = (fn: (d: ProgramDay) => ProgramDay) => setDays((prev) => prev.map((d, i) => (i === activeDay ? fn(d) : d)));
  const addExercise = (ex: CatalogExercise) => {
    patchDay((d) => ({ ...d, main: [...d.main, { catalogKey: ex.id, name: ex.name }] }));
    setPicker(false);
  };
  const removeExercise = (idx: number) => patchDay((d) => ({ ...d, main: d.main.filter((_, i) => i !== idx) }));

  const canSave = name.trim().length > 0 && days.some((d) => d.main.length > 0);
  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const structure: ProgramStructure = { name: name.trim(), weeks: 8, daysPerWeek, vary: false, days, weekPlans: null };
      await createProgram(structure);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const day = days[activeDay];

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.15)' }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} style={styles.headerBtn}>
          <Text style={styles.headerClose}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New Program</Text>
        <Pressable
          onPress={canSave && !saving ? onSave : undefined}
          disabled={!canSave || saving}
          accessibilityRole="button"
          accessibilityLabel="Save program"
          hitSlop={10}
          style={styles.headerBtn}
        >
          <Text style={[styles.headerSave, (!canSave || saving) && styles.headerSaveOff]}>{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.field}>
          <Text style={styles.label}>Program name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. My Push / Pull / Legs"
            placeholderTextColor={flColor.gray600}
            value={name}
            onChangeText={setName}
            maxLength={40}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Days per week</Text>
          <View style={styles.chipRow}>
            {[2, 3, 4, 5, 6].map((n) => (
              <Pressable key={n} onPress={() => setDayCount(n)} accessibilityRole="button" accessibilityLabel={`${n} days per week`} style={[styles.chip, daysPerWeek === n && styles.chipOn]}>
                <Text style={[styles.chipText, daysPerWeek === n && styles.chipTextOn]}>{n}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.dayTabs}>
          {days.map((d, i) => (
            <Pressable key={d.letter} onPress={() => setActiveDay(i)} accessibilityRole="button" accessibilityLabel={`Day ${d.letter}`} style={[styles.dayTab, i === activeDay && styles.dayTabOn]}>
              <Text style={[styles.dayTabText, i === activeDay && styles.dayTabTextOn]}>{d.letter}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Day {day.letter} name (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Push"
            placeholderTextColor={flColor.gray600}
            value={day.name}
            onChangeText={(t) => patchDay((d) => ({ ...d, name: t }))}
            maxLength={24}
          />
        </View>

        <Text style={styles.exHeading}>Exercises</Text>
        {day.main.length === 0 ? (
          <Text style={styles.emptyEx}>No exercises yet — add your first below.</Text>
        ) : (
          day.main.map((ex, idx) => (
            <View key={`${ex.catalogKey}-${idx}`} style={styles.exRow}>
              <Text style={styles.exName} numberOfLines={1}>
                {ex.name}
              </Text>
              <Pressable onPress={() => removeExercise(idx)} accessibilityRole="button" accessibilityLabel={`Remove ${ex.name}`} hitSlop={8}>
                <Text style={styles.exRemove}>Remove</Text>
              </Pressable>
            </View>
          ))
        )}

        <View style={styles.addWrap}>
          <Button variant="secondary" fullWidth onPress={() => setPicker(true)} accessibilityLabel="Add exercise">
            + Add exercise
          </Button>
        </View>

        {error ? <Text style={styles.err}>{error}</Text> : null}
      </ScrollView>

      {picker ? <ExercisePicker onPick={addExercise} onClose={() => setPicker(false)} /> : null}
    </View>
  );
}

function ExercisePicker({ onPick, onClose }: { onPick: (ex: CatalogExercise) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const all = useMemo(() => listExercises(), []);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all.slice(0, 60);
    return all.filter((e) => e.name.toLowerCase().includes(s) || e.aliases.some((a) => a.toLowerCase().includes(s))).slice(0, 80);
  }, [q, all]);

  return (
    <View style={styles.pickerOverlay}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close exercise picker" />
      <View style={styles.pickerCard}>
        <View style={styles.pickerHead}>
          <Text style={styles.pickerTitle}>Add exercise</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
            <Text style={styles.headerClose}>✕</Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Search 794 exercises…"
          placeholderTextColor={flColor.gray600}
          value={q}
          onChangeText={setQ}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
        />
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          keyboardShouldPersistTaps="handled"
          style={styles.pickerList}
          renderItem={({ item }) => (
            <Pressable onPress={() => onPick(item)} accessibilityRole="button" accessibilityLabel={`Add ${item.name}`} style={styles.pickerItem}>
              <Text style={styles.pickerItemName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.pickerItemFamily}>{item.family}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.emptyEx}>No matches.</Text>}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14 },
  headerBtn: { minWidth: 52 },
  headerClose: { fontSize: 20, color: flColor.gray400 },
  headerTitle: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', color: flColor.cream100 },
  headerSave: { fontFamily: flFont.sans, fontSize: 15, fontWeight: '600', color: flColor.bronze300, textAlign: 'right' },
  headerSaveOff: { color: flColor.gray600 },

  scroll: { paddingHorizontal: 20, paddingBottom: 60, gap: 20 },
  field: { gap: 8 },
  label: { fontFamily: flFont.sans, fontSize: 13, color: flColor.gray400 },
  input: {
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
    borderRadius: flRadius.md,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontFamily: flFont.sans,
    fontSize: 15,
    color: flColor.cream100,
  },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800 },
  chipOn: { borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint },
  chipText: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.gray400 },
  chipTextOn: { color: flColor.cream100 },

  dayTabs: { flexDirection: 'row', gap: 8 },
  dayTab: { width: 46, height: 46, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800, alignItems: 'center', justifyContent: 'center' },
  dayTabOn: { borderColor: flColor.bronze400, backgroundColor: flColor.bronzeTint },
  dayTabText: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.gray400 },
  dayTabTextOn: { color: flColor.cream100 },

  exHeading: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  emptyEx: { fontFamily: flFont.sans, fontSize: 13, fontStyle: 'italic', color: flColor.gray600 },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
  },
  exName: { flex: 1, fontFamily: flFont.sans, fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  exRemove: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', color: flColor.redMuted },
  addWrap: { marginTop: 2 },
  err: { fontFamily: flFont.sans, fontSize: 13, color: flColor.redMuted },

  pickerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  pickerBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,5,5,0.55)' },
  pickerCard: {
    maxHeight: '78%',
    backgroundColor: flColor.charcoal900,
    borderTopLeftRadius: flRadius.xl,
    borderTopRightRadius: flRadius.xl,
    borderTopWidth: 1,
    borderColor: flColor.charcoal600,
    padding: 20,
    gap: 14,
  },
  pickerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerTitle: { fontFamily: flFont.display, fontSize: 18, fontWeight: '600', color: flColor.cream100 },
  pickerList: { maxHeight: 420 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: flColor.charcoal700 },
  pickerItemName: { flex: 1, fontFamily: flFont.sans, fontSize: 15, color: flColor.cream100 },
  pickerItemFamily: { fontFamily: flFont.sans, fontSize: 11, textTransform: 'capitalize', color: flColor.gray600 },
});
