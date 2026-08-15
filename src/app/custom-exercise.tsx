import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button/Button';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet/ConfirmSheet';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { useToast } from '@/hooks/useCeremony';
import { errorMessage, useQuery } from '@/lib/useQuery';
import {
  createCustomExercise,
  deleteCustomExercise,
  fetchCustomExercise,
  fetchCustomExercises,
  updateCustomExercise,
} from '@/data/custom-exercises-live';
import { EXERCISE_CATEGORIES, MUSCLE_FILTER_GROUPS } from '@/domain/exercise-picker/data';
import { ENVIRONMENTS } from '@/domain/exercise-picker/catalog-core';
import { HOME_GYM_EQUIPMENT, HOME_GYM_GROUPS } from '@/domain/home-gym/equipment';
import {
  canSave,
  capMessage,
  CUSTOM_LIMIT,
  type CustomDraft,
  draftFrom,
  duplicateOf,
  emptyDraft,
  isDirty,
  NAME_MAX,
  NOTES_MAX,
} from '@/domain/exercise-picker/custom-core';
import type { ExerciseCategoryKey } from '@/domain/exercise-picker/catalog-core';

/**
 * W-28 — Create / Edit a Custom Exercise.
 *
 * ══ THE SPEC WAS LOCKED AND THE FEATURE DID NOT EXIST ══
 *
 * `W-28-Create-Edit-Custom-Exercise` and `Exercise-001-Custom-Exercise-Architecture` are both LOCKED.
 * Neither had a line of code behind it: no table (0128 adds it), no screen, and both the Library and the
 * Picker carry standing notes explaining that their Custom sections are omitted because there was
 * nowhere to save. This is that screen.
 *
 * ══ ONE SCREEN, TWO MODES (W28-D1) ══
 *
 * `?id` present → EDIT, fields pre-populated, Delete in the footer. Absent → CREATE, blank, name
 * focused. Splitting them would duplicate every field definition, the validation and the save; the only
 * real differences are the title, the initial state and one destructive action.
 *
 * ══ DELTAS FROM THE SPEC, EACH DELIBERATE ══
 *
 *  · UNIT (reps / hold) IS A FIELD, and the spec has no such thing. It could not have: the shipped
 *    catalogue only grew `unit` in this same release. Without it an athlete's own Copenhagen hold would
 *    be handed a reps box while the catalogue's Plank got a countdown, which is the feature being worse
 *    for the exercises it exists to add.
 *  · EQUIPMENT IS THE HOME-GYM INVENTORY (32 items, 6 groups), not a free list. Those ids are what
 *    `canDoExercise` reads, so choosing from them is what lets a custom exercise participate in Home Gym
 *    filtering at all. A free-text equipment field would look richer and do nothing.
 *  · NO MEDIA. W-28 §7 defers upload post-MVP; nothing here pretends otherwise.
 */

const CATEGORY_CHIPS = EXERCISE_CATEGORIES.filter((c) => c.key !== 'CARDIO');

export default function CustomExerciseScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = typeof id === 'string' && id.length > 0 ? id : null;
  const isEdit = editId != null;

  const { data: existing, loading, error } = useQuery(
    () => (editId ? fetchCustomExercise(editId) : Promise.resolve(null)),
    [editId],
  );
  // Only for the duplicate warning and the cap banner — never blocks the form loading.
  const { data: mine } = useQuery(fetchCustomExercises, []);

  const [draft, setDraft] = useState<CustomDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<'equipment' | 'primary' | 'secondary' | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  /* The baseline the dirty check compares against — captured the first render that has data, and never
     recomputed. Deriving it instead of storing it would make every keystroke "clean" again. */
  const baseline = useMemo(() => (existing ? draftFrom(existing) : emptyDraft()), [existing]);
  const d = draft ?? baseline;
  const set = <K extends keyof CustomDraft>(k: K, v: CustomDraft[K]) => setDraft({ ...d, [k]: v });

  const activeCount = (mine ?? []).length;
  const capNote = capMessage(isEdit ? 0 : activeCount);
  // EDIT is never blocked by the cap — the exercise already exists and fixing its name must not depend
  // on how many others you have.
  const atLimit = !isEdit && activeCount >= CUSTOM_LIMIT;
  const dup = nameTouched ? duplicateOf(d.name, mine ?? [], editId) : null;
  const saveable = canSave(d) && !busy && !atLimit;

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/exercise-library');
  }, [router]);

  const attemptBack = () => (isDirty(d, baseline) ? setDiscardOpen(true) : goBack());

  const save = async () => {
    if (!saveable) return;
    setBusy(true);
    try {
      if (editId) {
        await updateCustomExercise(editId, d);
        showToast(`${d.name.trim()} updated.`);
        goBack();
      } else {
        const newId = await createCustomExercise(d);
        showToast(`${d.name.trim()} added to your library.`);
        /* `replace`, not push — going "back" from the exercise you just created should reach where you
           started, not the empty form you filled in to get here. */
        router.replace({ pathname: '/custom-exercise', params: { id: newId } });
      }
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!editId) return;
    setDeleteOpen(false);
    try {
      await deleteCustomExercise(editId);
      // Says what SURVIVES. A soft delete that reads like a hard one makes athletes hoard rows.
      showToast('Exercise removed. Sessions you logged with it keep its name.');
      router.replace('/exercise-library');
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  if (isEdit && loading) {
    return (
      <Shell title="Edit Exercise" onBack={goBack}>
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </Shell>
    );
  }
  if (isEdit && (error || !existing)) {
    return (
      <Shell title="Edit Exercise" onBack={goBack}>
        <View style={styles.center}>
          <Text style={styles.missTitle}>Exercise not found</Text>
          <Text style={styles.missBody}>It may have been removed.</Text>
          <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Go back" style={styles.outlineBtn}>
            <Text style={styles.outlineBtnLabel}>Go Back</Text>
          </Pressable>
        </View>
      </Shell>
    );
  }

  return (
    <Shell
      title={isEdit ? 'Edit Exercise' : 'New Exercise'}
      onBack={attemptBack}
      action={
        <Pressable
          onPress={() => void save()}
          disabled={!saveable}
          accessibilityRole="button"
          accessibilityLabel="Save exercise"
          hitSlop={8}
          style={styles.saveBtn}
        >
          <Text style={[styles.saveLabel, saveable ? null : styles.saveDisabled]}>Save</Text>
        </Pressable>
      }
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {capNote ? (
          <View style={[styles.banner, atLimit ? styles.bannerStop : null]}>
            <Text style={styles.bannerText}>{capNote}</Text>
          </View>
        ) : null}

        <Divider label="Required" />
        <Text style={styles.label}>Exercise Name</Text>
        <TextInput
          value={d.name}
          onChangeText={(v) => set('name', v.slice(0, NAME_MAX))}
          onBlur={() => setNameTouched(true)}
          placeholder="e.g. Belt Squat Machine"
          placeholderTextColor={flColor.gray600}
          style={styles.input}
          accessibilityLabel="Exercise name"
          autoCapitalize="words"
          autoFocus={!isEdit}
          maxLength={NAME_MAX}
        />
        <Text style={styles.counter}>
          {d.name.length} / {NAME_MAX}
        </Text>
        {/* EX-001-D4 — a WARNING, never a block. Checked against the athlete's own exercises only: an
            athlete naming their machine "Leg Press" because that is what their gym calls it is not
            making a mistake, and the catalogue is not the authority on their vocabulary. */}
        {dup ? (
          <View style={styles.warn}>
            <Text style={styles.warnText}>You already have an exercise called “{dup.name}”. You can still save this one.</Text>
          </View>
        ) : null}

        <Divider label="Optional Details" />

        {/* HOW IT IS COUNTED — not in the spec, because `unit` did not exist when the spec was written. */}
        <Text style={styles.label}>How it&apos;s measured</Text>
        <View style={styles.chipRow}>
          {([
            { key: 'reps' as const, label: 'Reps' },
            { key: 'time' as const, label: 'Hold / time' },
          ]).map((o) => (
            <Chip key={o.key} label={o.label} on={d.unit === o.key} onPress={() => set('unit', o.key)} />
          ))}
        </View>
        <Text style={styles.hint}>
          {d.unit === 'time'
            ? 'You’ll get a countdown when you log it, like a plank or a carry.'
            : 'You’ll log sets and reps, like most lifts.'}
        </Text>

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORY_CHIPS.map((c) => (
            <Chip
              key={c.key}
              label={c.label}
              on={d.category === c.key}
              // Tapping the chosen one clears it — "didn't say" has to stay reachable after a mis-tap.
              onPress={() => set('category', d.category === c.key ? null : (c.key as ExerciseCategoryKey))}
            />
          ))}
        </View>

        <SelectRow label="Equipment" summary={equipSummary(d.equipment)} onPress={() => setSheet('equipment')} />
        <SelectRow label="Primary Muscles" summary={muscleSummary(d.primaryMuscles)} onPress={() => setSheet('primary')} />
        <SelectRow label="Secondary Muscles" summary={muscleSummary(d.secondaryMuscles)} onPress={() => setSheet('secondary')} />

        <Text style={styles.label}>Where you can train it</Text>
        <View style={styles.chipRow}>
          {ENVIRONMENTS.map((e) => (
            <Chip key={e} label={e} on={d.environments.includes(e)} onPress={() => set('environments', toggle(d.environments, e))} />
          ))}
        </View>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          value={d.notes}
          onChangeText={(v) => set('notes', v.slice(0, NOTES_MAX))}
          placeholder="Form cues, setup notes, coaching reminders…"
          placeholderTextColor={flColor.gray600}
          style={[styles.input, styles.textarea]}
          accessibilityLabel="Notes"
          multiline
          maxLength={NOTES_MAX}
        />
        <Text style={styles.counter}>
          {d.notes.length} / {NOTES_MAX}
        </Text>

        {isEdit ? (
          <>
            <View style={styles.rule} />
            <Pressable
              onPress={() => setDeleteOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Delete this exercise"
              style={({ pressed }) => [styles.deleteBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.deleteLabel}>Delete Exercise</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>

      <MultiSelectSheet
        open={sheet === 'equipment'}
        title="Equipment"
        groups={HOME_GYM_GROUPS.map((g) => ({
          label: g,
          options: HOME_GYM_EQUIPMENT.filter((e) => e.group === g).map((e) => ({ id: e.id, label: e.label })),
        }))}
        selected={d.equipment}
        onToggle={(v) => set('equipment', toggle(d.equipment, v))}
        onClose={() => setSheet(null)}
      />
      <MultiSelectSheet
        open={sheet === 'primary' || sheet === 'secondary'}
        title={sheet === 'secondary' ? 'Secondary Muscles' : 'Primary Muscles'}
        groups={MUSCLE_FILTER_GROUPS.map((g) => ({
          label: g.region,
          options: g.muscles.map((m) => ({ id: m.id, label: m.name })),
        }))}
        selected={sheet === 'secondary' ? d.secondaryMuscles : d.primaryMuscles}
        onToggle={(v) =>
          sheet === 'secondary'
            ? set('secondaryMuscles', toggle(d.secondaryMuscles, v))
            : set('primaryMuscles', toggle(d.primaryMuscles, v))
        }
        onClose={() => setSheet(null)}
      />

      <ConfirmSheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        headline="Delete this exercise?"
        // Names exactly what survives — a soft delete described as a hard one makes athletes hoard rows.
        body={`“${d.name.trim()}” will be removed from your library. Sessions you logged with it keep its name, and any template using it will show it as removed until you restore it.`}
        confirmLabel="Delete"
        tone="destructive"
        onConfirm={() => void doDelete()}
      />
      <ConfirmSheet
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        headline="Discard changes?"
        body="What you've typed here won't be saved."
        confirmLabel="Discard"
        tone="destructive"
        onConfirm={() => {
          setDiscardOpen(false);
          goBack();
        }}
      />
    </Shell>
  );
}

const toggle = (list: readonly string[], v: string): string[] =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

const equipSummary = (ids: readonly string[]): string => {
  if (!ids.length) return 'Tap to select';
  const names = ids.map((id) => HOME_GYM_EQUIPMENT.find((e) => e.id === id)?.label).filter(Boolean);
  return names.length <= 2 ? names.join(', ') : `${names.length} selected`;
};

const MUSCLE_NAME = new Map(MUSCLE_FILTER_GROUPS.flatMap((g) => g.muscles.map((m) => [m.id, m.name] as const)));
const muscleSummary = (ids: readonly string[]): string => {
  if (!ids.length) return 'Tap to select';
  const names = ids.map((id) => MUSCLE_NAME.get(id) ?? id);
  return names.length <= 2 ? names.join(', ') : `${names.length} selected`;
};

// ── pieces ───────────────────────────────────────────────────────────────────

function Shell({ title, onBack, action, children }: { title: string; onBack: () => void; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.34)' }} />
      <AppBar title={title} onBack={onBack} actions={action} />
      {children}
    </View>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <View style={styles.dividerRow}>
      <Text style={styles.dividerLabel}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.chip, on ? styles.chipOn : null, pressed ? styles.pressed : null]}
    >
      <Text style={[styles.chipLabel, on ? styles.chipLabelOn : null]}>{label}</Text>
    </Pressable>
  );
}

function SelectRow({ label, summary, onPress }: { label: string; summary: string; onPress: () => void }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${summary}`}
        style={({ pressed }) => [styles.selectRow, pressed ? styles.pressed : null]}
      >
        <Text style={styles.selectSummary} numberOfLines={1}>
          {summary}
        </Text>
        <Svg width={15} height={15} viewBox="0 0 24 24">
          <Path d="M9 6l6 6-6 6" fill="none" stroke={flColor.gray600} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
    </>
  );
}

/** Grouped multi-select. One component for equipment and both muscle fields — same interaction, same rules. */
function MultiSelectSheet({
  open,
  title,
  groups,
  selected,
  onToggle,
  onClose,
}: {
  open: boolean;
  title: string;
  groups: { label: string; options: { id: string; label: string }[] }[];
  selected: readonly string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
        {groups.map((g) => (
          <View key={g.label} style={styles.sheetGroup}>
            <Text style={styles.sheetGroupLabel}>{g.label.toUpperCase()}</Text>
            <View style={styles.chipRow}>
              {g.options.map((o) => (
                <Chip key={o.id} label={o.label} on={selected.includes(o.id)} onPress={() => onToggle(o.id)} />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.doneWrap}>
        <Button variant="primary" fullWidth onPress={onClose} accessibilityLabel="Done">
          Done
        </Button>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 },
  missTitle: { fontFamily: flFont.display, fontSize: 20, fontWeight: '600', color: flColor.cream100 },
  missBody: { fontSize: 12.5, color: flColor.gray600, textAlign: 'center' },
  outlineBtn: { marginTop: 6, paddingHorizontal: 20, paddingVertical: 11, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600 },
  outlineBtnLabel: { fontSize: 13.5, fontWeight: '600', color: flColor.gray400 },

  scroll: { padding: 20, paddingBottom: 48 },
  saveBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  saveLabel: { fontSize: 15, fontWeight: '700', color: flColor.bronze300 },
  saveDisabled: { color: flColor.gray600 },

  banner: { padding: 13, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: 'rgba(176,124,68,0.10)', marginBottom: 18 },
  bannerStop: { borderColor: flColor.redMuted, backgroundColor: 'rgba(160,72,68,0.10)' },
  bannerText: { fontSize: 12.5, lineHeight: 18, color: flColor.cream100 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, marginBottom: 6 },
  dividerLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, color: flColor.gray600, textTransform: 'uppercase' },
  dividerLine: { flex: 1, height: 1, backgroundColor: flColor.charcoal700 },

  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: flColor.bronze400, marginTop: 18, marginBottom: 8, textTransform: 'uppercase' },
  input: { paddingHorizontal: 13, paddingVertical: 12, minHeight: 46, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.surfaceRecessed, fontSize: 15, color: flColor.cream100 },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  counter: { marginTop: 5, fontSize: 11, color: flColor.gray600, textAlign: 'right' },
  hint: { marginTop: 7, fontSize: 12, lineHeight: 17, color: flColor.gray600 },

  warn: { marginTop: 9, padding: 11, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.bronzeBorderSubtle, backgroundColor: 'rgba(176,124,68,0.08)' },
  warnText: { fontSize: 12, lineHeight: 17, color: flColor.gray400 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  chipOn: { borderColor: flColor.bronze400, backgroundColor: 'rgba(176,124,68,0.16)' },
  chipLabel: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
  chipLabelOn: { color: flColor.cream100 },

  selectRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 13, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900 },
  selectSummary: { flex: 1, fontSize: 14, color: flColor.cream100 },

  rule: { height: 1, backgroundColor: flColor.charcoal700, marginTop: 30, marginBottom: 18 },
  deleteBtn: { paddingVertical: 14, borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, alignItems: 'center' },
  deleteLabel: { fontSize: 14, fontWeight: '600', color: flColor.redMuted },

  sheetScroll: { maxHeight: 380 },
  sheetGroup: { marginBottom: 18 },
  sheetGroupLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: flColor.gray600, marginBottom: 9 },
  doneWrap: { marginTop: 8 },

  pressed: { opacity: 0.85 },
});
