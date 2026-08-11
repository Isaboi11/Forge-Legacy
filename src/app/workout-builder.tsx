import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet/ConfirmSheet';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation';
import { fetchTemplateDetail, saveTemplate, type TemplateExercise } from '@/data/templates-live';
import type { ProgramExercise } from '@/data/programs-live';
import {
  CARDIO_ACTIVITIES,
  bumpDistance,
  bumpDuration,
  bumpPace,
  fmtDuration,
  bumpSpeed,
  distanceLabel,
  effortLabel,
  hasRateTarget,
  newCardioBlock,
  activitySymbol,
  activityFromKey,
  cardioKey,
  usesSpeed,
  type CardioActivity,
} from '@/domain/workout/conditioning';
import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { useToast } from '@/hooks/useCeremony';
import { clearBuilderInbox, readBuilderInbox, type BuilderSection } from '@/lib/builder-inbox';
import {
  clampReps,
  clampSets,
  defaultReps,
  defaultSets,
  newExerciseId,
  pairWithNext,
  pairingAt,
  unpairAt,
} from '@/lib/program-draft';
import {
  clearWorkoutDraft,
  emptyWorkoutDraft,
  loadWorkoutDraft,
  saveWorkoutDraft,
  workoutDraftHasContent,
  workoutDraftTotal,
  type WorkoutDraft,
} from '@/lib/workout-builder-draft';
import { errorMessage } from '@/lib/useQuery';
import { writeWorkoutLaunch } from '@/lib/workout-launch';

/**
 * W-25 Free Workout Builder — plan a session, then keep it (and start it).
 *
 * ══ WHY THIS EXISTS NOW ══
 *
 * Templates were built from the CAPTURE end only (0091): you trained, and The Record offered to keep the
 * shape. That is still the better loop for most sessions — a workout you already did is one you know you
 * can do, where a workout you author is a guess at your own capacity — but it left no answer at all to
 * "I want to plan Thursday before Thursday". `Forge Strength Start.dc.html` names three ways to begin,
 * and this is the middle one: **Build it first · Plan every exercise, then start the session.**
 *
 * ══ WHY IT IS NOT THE PROGRAM BUILDER ══
 *
 * A template is ONE DAY. It has no weeks, no per-week variation, no day letters, and no "Save & go to Day
 * B" — all of which the Program Builder's day view carries because a program day is a day *of something*.
 * Lifting that view over here would drag program semantics into a thing that is not a program. What IS
 * shared is everything with a rule in it: the pure draft helpers (`clampSets`, `defaultReps`,
 * `pairWithNext`, `unpairAt`, `pairingAt`) and the Exercise Picker round-trip, so a superset authored
 * here and one authored in a program mean exactly the same thing.
 *
 * ══ THE DRAFT IS DURABLE ══
 *
 * Adding an exercise leaves the screen — the Picker is a route — so the draft autosaves to AsyncStorage
 * on every mutation and is drained back on focus. Same shape as the Program Builder, same reason.
 */

const SECTIONS: { key: BuilderSection; label: string; req: string; empty: string; addLabel: string }[] = [
  { key: 'warmup', label: 'Warm-up', req: 'Optional', empty: 'No warm-up yet', addLabel: 'warm-up' },
  { key: 'main', label: 'Main', req: 'Required', empty: 'Add the lifts you plan to do', addLabel: 'exercise' },
  { key: 'cooldown', label: 'Cool-down', req: 'Optional', empty: 'No cool-down yet', addLabel: 'cool-down' },
];

export default function WorkoutBuilderScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const entryId = params.id ?? null;

  const [draft, setDraft] = useState<WorkoutDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [cardioSheet, setCardioSheet] = useState<BuilderSection | null>(null);

  /*
   * Boot and the picker round-trip in one pass, on every focus — read the stored draft, absorb anything
   * the Picker handed back, persist, render. An inbox in hand always means a Picker round-trip, so an
   * edit entry must NOT re-hydrate from the server then: that would throw away the work in progress and
   * reload the original. Same rule the Program Builder learned.
   */
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const stored = await loadWorkoutDraft();
        const raw = await readBuilderInbox();
        const inbox = raw && raw.dest === 'workout' ? raw : null;

        let d = stored;
        if (entryId && !inbox && (!d || d.editId !== entryId)) {
          const src = await fetchTemplateDetail(entryId).catch(() => null);
          d = src ? hydrate(src.name, src.exercises, entryId) : d;
        } else if (!entryId && !inbox && d && d.editId) {
          d = null; // a fresh "build it first" must not reopen someone's edit session
        }

        d = d ?? emptyWorkoutDraft();
        if (inbox) {
          await clearBuilderInbox();
          d = {
            ...d,
            [inbox.section]: [
              ...d[inbox.section],
              ...inbox.items.map((it) => ({
                id: newExerciseId(),
                catalogKey: it.catalogKey,
                name: it.name,
                equip: it.equip,
                muscles: it.muscles ?? [],
                type: it.type ?? '',
                sets: defaultSets(inbox.section),
                reps: defaultReps(inbox.section),
              })),
            ],
          };
        }
        await saveWorkoutDraft(d);
        if (active) setDraft(d);
      })();
      return () => {
        active = false;
      };
    }, [entryId]),
  );

  /** Every mutation is a pure step plus an autosave; nothing writes state during render. */
  const mutate = (fn: (d: WorkoutDraft) => WorkoutDraft) => {
    if (!draft) return;
    const next = fn(draft);
    setDraft(next);
    void saveWorkoutDraft(next);
  };

  const patch = (section: BuilderSection, fn: (list: ProgramExercise[]) => ProgramExercise[]) =>
    mutate((d) => ({ ...d, [section]: fn(d[section]) }));

  /**
   * Add a cardio block.
   *
   * W-25 had no cardio path at all — a one-off workout could not contain a run, while a program day
   * could, so "build it first" and "build a program" disagreed about what a workout is. Same sheet
   * and same `newCardioBlock` seed as the Program Builder, so a run means one thing in both.
   */
  const addCardio = (section: BuilderSection, activity: CardioActivity) => {
    setCardioSheet(null);
    patch(section, (l) => [
      ...l,
      { id: newExerciseId(), kind: 'cardio' as const, ...newCardioBlock(activity) },
    ]);
  };

  const addExercise = (section: BuilderSection) => {
    router.push({ pathname: '/exercise-picker', params: { mode: 'builder', dest: 'workout', vary: '0', week: '0', day: '0', section } });
  };

  const leave = () => {
    void clearWorkoutDraft();
    if (router.canGoBack()) router.back();
    else router.replace('/templates');
  };

  const onBack = () => {
    if (draft && workoutDraftHasContent(draft)) setConfirmLeave(true);
    else leave();
  };

  const save = async (thenStart: boolean) => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const name = draft.name.trim() || 'Saved Workout';
      const id = await saveTemplate(name, toTemplateExercises(draft), draft.editId);
      await clearWorkoutDraft();
      if (thenStart) {
        await writeWorkoutLaunch({ templateId: id, workoutName: name });
        router.replace('/workout');
      } else {
        showToast(`“${name}” saved to your templates.`);
        router.replace({ pathname: '/template/[id]', params: { id } });
      }
    } catch (e) {
      showToast(errorMessage(e));
      setSaving(false);
    }
  };

  if (!draft) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.bg2} base="#060708" overlay={{ flat: 'rgba(6,7,8,0.32)' }} />
        <AppBar title="Build a Workout" onBack={onBack} />
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </View>
    );
  }

  const total = workoutDraftTotal(draft);
  // The same rule The Record's save uses: a shape with nothing in its Main section is not a workout.
  const canSave = draft.main.length > 0;
  const est = Math.round((draft.main.length * 9 + draft.warmup.length * 4 + draft.cooldown.length * 4) / 5) * 5;

  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.bg2} base="#060708" overlay={{ flat: 'rgba(6,7,8,0.32)' }} />
      <AppBar title={draft.editId ? 'Edit Workout' : 'Build a Workout'} onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={styles.fieldLabel}>Workout name</Text>
          <TextInput
            value={draft.name}
            onChangeText={(v) => mutate((d) => ({ ...d, name: v }))}
            placeholder="e.g. Push Day A"
            placeholderTextColor={flColor.gray600}
            style={styles.nameInput}
            maxLength={60}
            accessibilityLabel="Workout name"
          />
          <Text style={styles.headMeta}>
            {total > 0 ? `${total} ${total === 1 ? 'exercise' : 'exercises'}${est > 0 ? ` · ~${est} min` : ''}` : 'Plan it here, then start it whenever you like.'}
          </Text>
        </View>

        {SECTIONS.map((sec, si) => {
          const items = draft[sec.key];
          return (
            <View key={sec.key} style={[styles.section, si > 0 && styles.sectionRuled]}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionLabel, sec.key === 'main' && styles.sectionLabelMain]}>{sec.label}</Text>
                <Text style={styles.sectionReq}>{sec.req}</Text>
                <View style={styles.spacer} />
                {items.length ? <Text style={styles.sectionCount}>{items.length}</Text> : null}
              </View>

              {items.length === 0 ? <Text style={styles.sectionEmpty}>{sec.empty}</Text> : null}

              {items.map((it, i) => (
                <Row
                  key={it.id ?? `${sec.key}-${i}`}
                  item={it}
                  first={i === 0}
                  last={i === items.length - 1}
                  pairing={pairingAt(items, i)}
                  onUp={() => patch(sec.key, (l) => swap(l, i, i - 1))}
                  onDown={() => patch(sec.key, (l) => swap(l, i, i + 1))}
                  onRemove={() => patch(sec.key, (l) => l.filter((_, k) => k !== i))}
                  onSets={(dir) =>
                    patch(sec.key, (l) =>
                      l.map((x, k) =>
                        k !== i
                          ? x
                          : x.kind === 'cardio'
                            ? { ...x, targetMi: bumpDistance(x.targetMi ?? null, dir) }
                            : { ...x, sets: clampSets((x.sets ?? 1) + dir) },
                      ),
                    )
                  }
                  onReps={(dir) =>
                    patch(sec.key, (l) =>
                      l.map((x, k) => {
                        if (k !== i) return x;
                        if (x.kind !== 'cardio') return { ...x, reps: clampReps((x.reps ?? 1) + dir) };
                        // Row B counts pace for a run and speed for a bike. The machines offer neither,
                        // and the stepper is hidden for them rather than stepping a value nothing renders.
                        return usesSpeed((x.activity ?? 'run') as CardioActivity)
                          ? { ...x, targetSpdMph: bumpSpeed(x.targetSpdMph ?? null, dir) }
                          : { ...x, targetPaceSec: bumpPace(x.targetPaceSec ?? null, dir) };
                      }),
                    )
                  }
                  /* THE CLOCK. Same gap the Program Builder had: `targetDurationSec` was saved and
                     read back faithfully with no control anywhere to set it. */
                  onTime={(dir) =>
                    patch(sec.key, (l) =>
                      l.map((x, k) => (k !== i ? x : { ...x, targetSec: bumpDuration(x.targetSec ?? null, dir) })),
                    )
                  }
                  onPair={() => patch(sec.key, (l) => pairWithNext(l, i))}
                  onUnpair={() => patch(sec.key, (l) => unpairAt(l, i))}
                />
              ))}

              <Pressable onPress={() => addExercise(sec.key)} accessibilityRole="button" accessibilityLabel={`Add ${sec.addLabel}`} style={styles.addBtn}>
                <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="round">
                  <Path d="M12 5v14M5 12h14" />
                </Svg>
                <Text style={styles.addText}>Add {sec.addLabel}</Text>
              </Pressable>

              <Pressable
                onPress={() => setCardioSheet(sec.key)}
                accessibilityRole="button"
                accessibilityLabel={`Add a cardio block to ${sec.label.toLowerCase()}`}
                style={styles.addBtn}
              >
                <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={flColor.bronze300} strokeWidth={2} strokeLinecap="round">
                  <Path d="M12 5v14M5 12h14" />
                </Svg>
                <Text style={styles.addText}>Add a cardio block</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      <LinearGradient colors={['rgba(6,7,8,0.35)', 'rgba(6,7,8,0.82)']} style={styles.footer}>
        <Button variant="primary" fullWidth disabled={!canSave || saving} onPress={() => void save(true)} accessibilityLabel="Save and start this workout">
          {saving ? 'Saving…' : 'Save & Start'}
        </Button>
        <Pressable
          onPress={() => void save(false)}
          disabled={!canSave || saving}
          accessibilityRole="button"
          accessibilityLabel="Save for later"
          style={styles.laterBtn}
        >
          <Text style={[styles.laterText, (!canSave || saving) && styles.laterTextOff]}>Save for later</Text>
        </Pressable>
        {!canSave ? <Text style={styles.gate}>Add at least one Main exercise to save.</Text> : null}
      </LinearGradient>

      {/* Same rows and the same `newCardioBlock` seed as the Program Builder, so a run authored here and
          a run authored there are the same thing. Targets are set on the card afterwards, because either
          one can legitimately be left open. */}
      <BottomSheet open={cardioSheet != null} onClose={() => setCardioSheet(null)} title="Add a cardio block">
        <Text style={styles.cardioIntro}>
          Set the distance and pace on the card. Leave either one open and you decide on the day.
        </Text>
        <View style={styles.cardioList}>
          {CARDIO_ACTIVITIES.map((a) => (
            <Pressable
              key={a.key}
              onPress={() => cardioSheet && addCardio(cardioSheet, a.key)}
              accessibilityRole="button"
              accessibilityLabel={`Add a ${a.name.toLowerCase()}`}
              style={styles.cardioRow}
            >
              <Text style={styles.cardioSymbol}>{activitySymbol(a.key)}</Text>
              <View style={styles.cardioRowText}>
                <Text style={styles.cardioRowName}>{a.name}</Text>
                <Text style={styles.cardioRowSub}>{a.sub}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </BottomSheet>

      <ConfirmSheet
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        headline="Discard this workout?"
        body="Nothing has been saved to your templates yet."
        confirmLabel="Discard"
        tone="destructive"
        onConfirm={() => {
          setConfirmLeave(false);
          leave();
        }}
      />
    </View>
  );
}

// ── pieces ──────────────────────────────────────────────────────────────────

function Row({
  item,
  first,
  last,
  pairing,
  onUp,
  onDown,
  onRemove,
  onSets,
  onReps,
  onTime,
  onPair,
  onUnpair,
}: {
  item: ProgramExercise;
  first: boolean;
  last: boolean;
  pairing: { pos: number; count: number } | null;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  onSets: (dir: 1 | -1) => void;
  onReps: (dir: 1 | -1) => void;
  /** Minutes on the clock — cardio only. */
  onTime: (dir: 1 | -1) => void;
  onPair: () => void;
  onUnpair: () => void;
}) {
  const cardio = item.kind === 'cardio';
  const activity = (item.activity ?? 'run') as CardioActivity;
  const speed = cardio && usesSpeed(activity);
  const hasRate = cardio && hasRateTarget(activity);

  return (
    <View style={[styles.card, pairing ? styles.cardPaired : null]}>
      {pairing && pairing.pos === 1 ? (
        <View style={styles.pairHead}>
          <Text style={styles.pairHeadText}>Superset · {pairing.count} exercises, alternated</Text>
          <Pressable onPress={onUnpair} accessibilityRole="button" accessibilityLabel="Break this superset" hitSlop={8}>
            <Text style={styles.pairBreak}>Break</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.cardTop}>
        <View style={styles.cardText}>
          <Text style={styles.exName} numberOfLines={1}>
            {pairing ? `${String.fromCharCode(64 + pairing.pos)}  ` : ''}
            {item.name}
          </Text>
          {item.equip ? (
            <Text style={styles.exEquip} numberOfLines={1}>
              {item.equip}
            </Text>
          ) : null}
        </View>
        <View style={styles.ctrls}>
          <Pressable onPress={first ? undefined : onUp} disabled={first} accessibilityRole="button" accessibilityLabel={`Move ${item.name} up`} style={styles.ctrl}>
            <Glyph d="M18 15l-6-6-6 6" color={first ? flColor.charcoal500 : flColor.gray400} />
          </Pressable>
          <Pressable onPress={last ? undefined : onDown} disabled={last} accessibilityRole="button" accessibilityLabel={`Move ${item.name} down`} style={styles.ctrl}>
            <Glyph d="M6 9l6 6 6-6" color={last ? flColor.charcoal500 : flColor.gray400} />
          </Pressable>
          <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`} style={styles.ctrl}>
            <Glyph d="M5 7h14M9 7V5h6v2M8 7l1 13h6l1-13" color={flColor.redMuted} />
          </Pressable>
        </View>
      </View>

      {/*
       * The SAME card for a lift and a run — only the two steppers count different units. A bespoke
       * cardio card would break the list apart, and the Program Builder made the same call for the same
       * reason.
       *
       * ⚠ ROW B DISAPPEARS FOR A ROWER OR A STAIR CLIMBER. `RATE_KIND` gives them no honest rate — a
       * rower's metric is a 500m split and this app computes none — so the slot is absent rather than
       * stepping a number nothing will ever render.
       */}
      <View style={styles.steppers}>
        {cardio ? (
          <Stepper
            label={item.targetMi == null ? '' : 'mi'}
            value={distanceLabel(item.targetMi ?? null, (m) => m)}
            onDown={() => onSets(-1)}
            onUp={() => onSets(1)}
            name={item.name}
          />
        ) : (
          <Stepper label="sets" value={String(item.sets ?? 1)} onDown={() => onSets(-1)} onUp={() => onSets(1)} name={item.name} />
        )}
        {/* A BOUT CAN BE PRESCRIBED BY THE CLOCK, BY THE DISTANCE, OR BY BOTH — the same three targets
            the Program Builder offers, so a day built here and a day built there mean the same thing. */}
        {cardio ? (
          <Stepper
            label={item.targetSec == null ? '' : 'time'}
            value={item.targetSec == null ? 'Open' : fmtDuration(item.targetSec)}
            onDown={() => onTime(-1)}
            onUp={() => onTime(1)}
            name={item.name}
          />
        ) : null}
        {!cardio ? (
          <Stepper label="reps" value={String(item.reps ?? 1)} onDown={() => onReps(-1)} onUp={() => onReps(1)} name={item.name} />
        ) : hasRate ? (
          <Stepper
            label={speed ? (item.targetSpdMph == null ? 'speed' : 'mph') : item.targetPaceSec == null ? 'pace' : '/mi'}
            value={effortLabel(
              {
                activity,
                name: item.name,
                equip: item.equip ?? '',
                modality: item.modality ?? 'outdoor',
                targetMi: item.targetMi ?? null,
                targetPaceSec: item.targetPaceSec ?? null,
                targetSpdMph: item.targetSpdMph ?? null,
              },
              (n) => n,
              (n) => n,
            )}
            onDown={() => onReps(-1)}
            onUp={() => onReps(1)}
            name={item.name}
          />
        ) : null}
      </View>

      {!last ? (
        <Pressable onPress={onPair} accessibilityRole="button" accessibilityLabel={`Superset ${item.name} with the exercise below`} style={styles.pairLink}>
          <Glyph d="M9 7H6a5 5 0 0 0 0 10h3M15 7h3a5 5 0 0 1 0 10h-3M8 12h8" size={14} color={flColor.bronze400} />
          <Text style={styles.pairLinkText}>{pairing ? 'Add the next one to this superset' : 'Superset with the next exercise'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Stepper({ label, value, onUp, onDown, name }: { label: string; value: string; onUp: () => void; onDown: () => void; name: string }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onDown} accessibilityRole="button" accessibilityLabel={`Fewer ${label} for ${name}`} style={styles.stepBtn}>
        <Glyph d="M5 12h14" size={15} color={flColor.gray400} />
      </Pressable>
      <View style={styles.stepValue}>
        <Text style={styles.stepNum}>{value}</Text>
        <Text style={styles.stepUnit}>{label}</Text>
      </View>
      <Pressable onPress={onUp} accessibilityRole="button" accessibilityLabel={`More ${label} for ${name}`} style={styles.stepBtn}>
        <Glyph d="M12 5v14M5 12h14" size={15} color={flColor.gray400} />
      </Pressable>
    </View>
  );
}

function Glyph({ d, color, size = 17 }: { d: string; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

// ── plumbing ────────────────────────────────────────────────────────────────

const swap = (l: ProgramExercise[], i: number, j: number): ProgramExercise[] => {
  if (j < 0 || j >= l.length) return l;
  const next = [...l];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

/** Draft rows → the stored template shape, section by section, order preserved. */
function toTemplateExercises(d: WorkoutDraft): TemplateExercise[] {
  const of = (list: ProgramExercise[], section: TemplateExercise['section']): TemplateExercise[] =>
    list.map((x) => ({
      // ⚠ THE ACTIVITY RIDES IN `catalogKey`. `TemplateExercise` has no activity field and adding one
      // would mean a migration — but `conditioning.ts` already defines this exact round-trip for the
      // purpose: `cardioKey('run')` is `'cardio:run'` and `activityFromKey` reads it back. Using the
      // convention that exists beats inventing a column.
      catalogKey:
        x.kind === 'cardio'
          ? cardioKey((x.activity ?? 'run') as CardioActivity)
          : (x.catalogKey ?? null),
      name: x.name,
      sets: x.sets ?? 1,
      targetReps: x.reps ?? 0,
      section,
      // ⚠ WAS HARDCODED `'strength'`, WITH BOTH TARGETS NULLED. Every cardio block an athlete authored
      // was silently saved as a strength row with no distance — the exact write-only-field failure the
      // schema's own comments warn about, and the reason W-25 could not hold a run at all.
      kind: x.kind === 'cardio' ? ('cardio' as const) : ('strength' as const),
      groupId: x.groupId ?? null,
      groupName: x.groupName ?? null,
      groupKind: x.groupKind ?? null,
      groupRounds: x.groupRounds ?? null,
      targetMi: x.targetMi ?? null,
      targetDurationSec: x.targetSec ?? null,
      coachNote: x.coachNote ?? null,
    }));
  return [...of(d.warmup, 'warmup'), ...of(d.main, 'main'), ...of(d.cooldown, 'cooldown')];
}

/** An existing template → an editable draft. Re-ids every row so React keys are stable and local. */
function hydrate(name: string, exercises: TemplateExercise[], editId: string): WorkoutDraft {
  const d = emptyWorkoutDraft();
  d.name = name;
  d.editId = editId;
  for (const e of exercises) {
    // A cardio row read back has to come back as a cardio row. The activity comes from the `cardio:<x>`
    // catalogKey written on save; anything unreadable falls back to a run, the only honest default for a
    // distance-and-pace block. Modality is not stored on a template, so it resets to the outdoor default
    // and the athlete flips it on the card — the same place they set it in the first place.
    const isCardio = e.kind === 'cardio';
    const row: ProgramExercise = {
      id: newExerciseId(),
      catalogKey: e.catalogKey ?? undefined,
      name: e.name,
      sets: e.sets,
      reps: e.targetReps || undefined,
      ...(isCardio
        ? {
            kind: 'cardio' as const,
            activity: activityFromKey(e.catalogKey) ?? 'run',
            modality: 'outdoor' as const,
            targetMi: e.targetMi ?? null,
            targetSec: e.targetDurationSec ?? null,
          }
        : null),
      ...(e.coachNote ? { coachNote: e.coachNote } : null),
      ...(e.groupId
        ? { groupId: e.groupId, groupName: e.groupName ?? undefined, groupKind: e.groupKind ?? 'circuit', groupRounds: e.groupRounds ?? undefined }
        : null),
    };
    d[e.section ?? 'main'].push(row);
  }
  return d;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 18, paddingBottom: 190 },

  head: { paddingTop: 6, paddingBottom: 16, gap: 7 },
  fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase', color: flColor.bronze400 },
  nameInput: {
    fontFamily: flFont.display,
    fontSize: 21,
    fontWeight: '600',
    color: flColor.cream100,
    borderBottomWidth: 1,
    borderBottomColor: flColor.charcoal600,
    paddingVertical: 7,
  },
  headMeta: { fontSize: 12, color: flColor.gray400 },

  section: { paddingVertical: 14, gap: 10 },

  cardioIntro: { fontSize: 13, lineHeight: 19, color: flColor.gray400, marginBottom: 12 },
  cardioList: { gap: 8 },
  cardioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: flRadius.lg,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.surfaceRecessed,
  },
  cardioSymbol: { fontSize: 18, color: flColor.bronze400, width: 22, textAlign: 'center' },
  cardioRowText: { flex: 1, gap: 2 },
  cardioRowName: { fontSize: 15, fontWeight: '600', color: flColor.cream100 },
  cardioRowSub: { fontSize: 12, color: flColor.gray600 },
  sectionRuled: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.gray400 },
  sectionLabelMain: { color: flColor.bronze400 },
  sectionReq: { fontSize: 10, color: flColor.gray600 },
  spacer: { flex: 1 },
  sectionCount: { fontSize: 11.5, fontWeight: '600', color: flColor.gray600 },
  sectionEmpty: { fontSize: 12.5, color: flColor.gray600 },

  card: { borderRadius: flRadius.lg, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800, boxShadow: flShadow.borderInset, overflow: 'hidden' },
  cardPaired: { borderColor: flColor.bronzeBorder },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 13 },
  cardText: { flex: 1, minWidth: 0, gap: 2 },
  exName: { fontSize: 14.5, fontWeight: '600', color: flColor.cream100 },
  exEquip: { fontSize: 11.5, color: flColor.gray600 },
  ctrls: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ctrl: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

  steppers: { flexDirection: 'row', gap: 9, paddingHorizontal: 13, paddingBottom: 12 },
  stepper: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: flRadius.md, borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal900, paddingHorizontal: 4 },
  stepBtn: { width: 34, height: 38, alignItems: 'center', justifyContent: 'center' },
  stepValue: { alignItems: 'center' },
  stepNum: { fontFamily: flFont.display, fontSize: 16, fontWeight: '600', color: flColor.cream100 },
  stepUnit: { fontSize: 9, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600 },

  pairHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 7, paddingHorizontal: 13, backgroundColor: flColor.bronzeTint, borderBottomWidth: 1, borderBottomColor: flColor.bronzeBorderSubtle },
  pairHeadText: { flex: 1, fontSize: 10.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: flColor.bronze400 },
  pairBreak: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray400 },
  pairLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 8, borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  pairLinkText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, color: flColor.bronze400 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: flRadius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.bronzeBorderSubtle },
  addText: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze300 },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 26, gap: 8 },
  laterBtn: { alignItems: 'center', paddingVertical: 8 },
  laterText: { fontSize: 12.5, fontWeight: '600', color: flColor.bronze400 },
  laterTextOff: { color: flColor.gray600 },
  gate: { textAlign: 'center', fontSize: 11.5, color: flColor.gray600 },
});
