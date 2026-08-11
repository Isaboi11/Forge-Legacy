import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { flColor, flRadius } from '@/constants/foundation';
import { fetchHomeGym } from '@/data/home-gym-live';
import { candidatesFor, contextFrom } from '@/domain/coach/candidates';
import { LIMITATIONS, LIMITATION_LABEL, type Limitation } from '@/domain/coach/constraints';
import { rebuildDay, setPrescription, swapExercise, type EditScope } from '@/domain/coach/edit-ops';
import { limitationPatterns } from '@/domain/coach/rulebook/limitations';
import { itemByKey, PICKER_DB } from '@/domain/exercise-picker/data';
import { canDoExercise } from '@/domain/home-gym/equipment';
import type { ProgramStructure } from '@/data/programs-live';
import type { SessionMark } from '@/domain/program/progress-core';
import { useQuery } from '@/lib/useQuery';

/**
 * "Ask Holt" — changing one session of a program you are already running.
 *
 * ══ WHY THIS SHEET IS NOW THE ONLY WAY ══
 *
 * The Edit button was removed from active programs, because it opened the full Program Builder and the
 * Builder can resize a block — which re-points progress records and can force an irrevocable graduation
 * (migration 0123, W-5 Decision 1). This is the replacement, and it is deliberately narrower: every
 * operation here provably keeps the session count and never touches a session already trained.
 *
 * ══ THE SHEET IS THE GUARD'S FRONT DOOR, NOT THE GUARD ══
 *
 * It only offers sessions and operations that `edit-ops` will accept — the same reasoning that keeps
 * touched days out of the swap sheet rather than showing them greyed. A row you can tap and then be told
 * no is worse than a row that was never there. The refusals still exist underneath; nobody should ever
 * see one.
 *
 * ⚠ ONE SHEET, SEVERAL FACES. The steps replace each other inside this sheet rather than opening a second
 * one — iOS refuses to present a view controller while another is on screen, which is how "Choose from
 * library" silently did nothing until it was fixed. A modal opened from inside a modal is that bug waiting.
 */
export function AskHoltSheet({
  open,
  onClose,
  structure,
  marks,
  weekIndex,
  dayIndex,
  dayName,
  busy,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  structure: ProgramStructure;
  marks: readonly SessionMark[];
  weekIndex: number;
  dayIndex: number;
  dayName: string;
  busy?: boolean;
  onApply: (next: ProgramStructure) => void;
}) {
  const gym = useQuery(fetchHomeGym, [open]);
  const [face, setFace] = useState<'menu' | 'pick_swap' | 'alternatives' | 'pick_reps' | 'reps' | 'avoid'>('menu');
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [avoid, setAvoid] = useState<Limitation[]>([]);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(8);

  const day = useMemo(() => {
    const days = structure.vary && structure.weekPlans?.[weekIndex]?.days ? structure.weekPlans[weekIndex].days : structure.days;
    return days?.[dayIndex] ?? null;
  }, [structure, weekIndex, dayIndex]);

  // Memoised because `?? []` is a fresh array every render, which would re-run the alternatives search
  // on every keystroke-equivalent — and the search walks all 733 exercises.
  const owned = useMemo(() => gym.data ?? [], [gym.data]);

  const close = () => {
    setFace('menu');
    setAvoid([]);
    onClose();
  };

  /** Everything else that trains the same movement and that the athlete can actually do. */
  const alternatives = useMemo(() => {
    const row = day?.main[exerciseIndex];
    if (!row?.catalogKey) return [];
    const pattern = itemByKey(row.catalogKey)?.pattern;
    if (!pattern) return [];
    const used = new Set(day.main.map((e) => e.catalogKey).filter(Boolean) as string[]);
    const ctx = contextFrom({
      owned,
      canDo: canDoExercise,
      experience: 'advanced', // the athlete chose this program; do not re-gate their own plan by level
      limitations: [],
      limitationPatterns,
      used,
    });
    return candidatesFor(pattern, PICKER_DB, ctx).slice(0, 12);
  }, [day, exerciseIndex, owned]);

  const apply = (result: ReturnType<typeof swapExercise>) => {
    // A refusal here means the sheet offered something it should not have. Close rather than argue —
    // and the underlying guard has already prevented the damage.
    if (result.ok) onApply(result.structure);
    close();
  };

  const scopeButtons = (run: (scope: EditScope) => void) => (
    <View style={styles.scopeRow}>
      <Button variant="primary" fullWidth disabled={busy} onPress={() => run('this_week')}>
        Just this week
      </Button>
      <Button variant="secondary" fullWidth disabled={busy} onPress={() => run('rest_of_block')}>
        Rest of the block
      </Button>
    </View>
  );

  const title =
    face === 'menu'
      ? dayName
      : face === 'pick_swap' || face === 'pick_reps'
        ? 'Which movement?'
        : face === 'alternatives'
          ? 'Swap it for'
          : face === 'reps'
            ? 'Sets and reps'
            : 'What should I work around?';

  return (
    <BottomSheet open={open} onClose={close} title={title} scroll>
      {face === 'menu' ? (
        <View style={styles.list}>
          <Choice
            label="Swap a movement"
            sub="Same sets and reps — you're changing the lift, not the dose."
            onPress={() => setFace('pick_swap')}
          />
          <Choice
            label="Change the sets or reps"
            sub="Keep the movement, change what it asks for."
            onPress={() => setFace('pick_reps')}
          />
          <Choice
            label="Rebuild this one"
            sub="Same shape, different exercises — tell me what to avoid."
            onPress={() => setFace('avoid')}
          />
        </View>
      ) : null}

      {face === 'pick_swap' || face === 'pick_reps' ? (
        <View style={styles.list}>
          {(day?.main ?? []).map((e, i) =>
            e.kind === 'cardio' ? null : (
              <Choice
                key={`${e.catalogKey}-${i}`}
                label={e.name}
                sub={e.sets != null ? `${e.sets} × ${e.repsMax ? `${e.reps}–${e.repsMax}` : e.reps}` : undefined}
                onPress={() => {
                  setExerciseIndex(i);
                  setSets(e.sets ?? 3);
                  setReps(e.reps ?? 8);
                  setFace(face === 'pick_swap' ? 'alternatives' : 'reps');
                }}
              />
            ),
          )}
        </View>
      ) : null}

      {face === 'alternatives' ? (
        <View style={styles.list}>
          {alternatives.length === 0 ? (
            <Text style={styles.empty}>
              Nothing else you&apos;ve got trains that the same way. Try rebuilding the day instead.
            </Text>
          ) : (
            alternatives.map((alt) => (
              <Choice
                key={alt.key}
                label={alt.name}
                onPress={() => {
                  setExerciseIndex(exerciseIndex);
                  setFace('menu');
                  apply(
                    swapExercise(
                      structure,
                      marks,
                      { weekIndex, dayIndex, exerciseIndex },
                      alt,
                      'this_week',
                    ),
                  );
                }}
              />
            ))
          )}
        </View>
      ) : null}

      {face === 'reps' ? (
        <View style={styles.list}>
          <Stepper label="Sets" value={sets} min={1} max={8} onChange={setSets} />
          <Stepper label="Reps" value={reps} min={1} max={60} onChange={setReps} />
          {scopeButtons((scope) =>
            apply(
              setPrescription(
                structure,
                marks,
                { weekIndex, dayIndex, exerciseIndex },
                // The range collapses to a single number: the athlete just named one, and showing
                // "5 × 3–5" after they asked for 3 would be answering a question they did not ask.
                { sets, reps, repsMax: null },
                scope,
              ),
            ),
          )}
        </View>
      ) : null}

      {face === 'avoid' ? (
        <View style={styles.list}>
          <View style={styles.chips}>
            {LIMITATIONS.map((l) => {
              const on = avoid.includes(l);
              return (
                <Pressable
                  key={l}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setAvoid((x) => (x.includes(l) ? x.filter((y) => y !== l) : [...x, l]))}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{LIMITATION_LABEL[l]}</Text>
                </Pressable>
              );
            })}
          </View>
          {scopeButtons((scope) =>
            apply(
              rebuildDay(
                structure,
                marks,
                { weekIndex, dayIndex },
                PICKER_DB,
                contextFrom({
                  owned,
                  canDo: canDoExercise,
                  experience: 'advanced',
                  limitations: avoid,
                  limitationPatterns,
                }),
                { category: 'HYPERTROPHY', experience: 'intermediate' },
                scope,
              ),
            ),
          )}
        </View>
      ) : null}
    </BottomSheet>
  );
}

function Choice({ label, sub, onPress }: { label: string; sub?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
    >
      <Text style={styles.choiceLabel}>{label}</Text>
      {sub ? <Text style={styles.choiceSub}>{sub}</Text> : null}
    </Pressable>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Fewer ${label.toLowerCase()}`}
          onPress={() => onChange(Math.max(min, value - 1))}
          style={styles.stepperBtn}
        >
          <Text style={styles.stepperGlyph}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`More ${label.toLowerCase()}`}
          onPress={() => onChange(Math.min(max, value + 1))}
          style={styles.stepperBtn}
        >
          <Text style={styles.stepperGlyph}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8, paddingBottom: 4 },
  pressed: { opacity: 0.86 },

  choice: {
    padding: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
    gap: 4,
  },
  choiceLabel: { fontSize: 15.5, fontWeight: '600', color: flColor.cream100 },
  choiceSub: { fontSize: 12.5, lineHeight: 18, color: flColor.gray600 },

  empty: { fontSize: 13.5, lineHeight: 20, color: flColor.gray600, paddingVertical: 8 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: flRadius.pill,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
  },
  chipOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  chipText: { fontSize: 13, fontWeight: '600', color: flColor.gray400 },
  chipTextOn: { color: flColor.bronze300 },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
  },
  stepperLabel: { fontSize: 15, color: flColor.cream100 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepperGlyph: { fontSize: 20, color: flColor.bronze300 },
  stepperValue: { fontSize: 16, fontWeight: '700', minWidth: 26, textAlign: 'center', color: flColor.cream100 },

  scopeRow: { gap: 8, marginTop: 14 },
});
