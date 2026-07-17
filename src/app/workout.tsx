import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { Card } from '@/components/forge/composites/Surface';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius } from '@/constants/foundation';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { buildActiveSession } from '@/domain/workout/build-session';
import { clearSession, loadSession, persistSession } from '@/domain/workout/autosave';
import { doneSetCount, hasLoggedSet } from '@/domain/workout/metrics';
import { saveWorkout } from '@/domain/workout/save';
import type { ActiveSession } from '@/domain/workout/types';

type Phase = 'loading' | 'resume' | 'active' | 'saving';
type Picker = { exIdx: number; setIdx: number; field: 'weight' | 'reps' };

function fmtElapsed(startedAt: string, now: number): string {
  const s = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

/**
 * W-9 Active Workout (Strength) — the real inline set logger, replacing the interim top-set scaffold.
 * Local-first: the session lives in AsyncStorage (autosave on every change, resume after a crash);
 * nothing reaches the cloud until Finish runs the atomic `save_workout` commit. Deferred (ruled): rest
 * timer, substitution/add-exercise, hero media, in-flow PR celebration, W-10..W-16 modalities, the
 * 4-stage completion — this cut is inline logging → atomic finish → minimal summary → timeline/chapter.
 */
export default function WorkoutScreen() {
  const router = useRouter();
  const { finishWorkout, abandonWorkout } = useWorkoutSession();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [resumable, setResumable] = useState<ActiveSession | null>(null);
  const [exIdx, setExIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [picker, setPicker] = useState<Picker | null>(null);
  const [pickerValue, setPickerValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // resume-or-fresh on mount
  useEffect(() => {
    loadSession().then((saved) => {
      if (saved && saved.exercises?.some((e) => e.sets.some((s) => s.done))) {
        setResumable(saved);
        setPhase('resume');
      } else {
        setSession(buildActiveSession());
        setPhase('active');
      }
    });
  }, []);

  // elapsed ticker
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // autosave on every change while active
  useEffect(() => {
    if (phase === 'active' && session) void persistSession(session);
  }, [session, phase]);

  const mutate = useCallback((fn: (s: ActiveSession) => ActiveSession) => setSession((s) => (s ? fn(s) : s)), []);

  const completeSet = (ei: number, si: number) =>
    mutate((s) => patchSet(s, ei, si, (set) => ({ ...set, done: true, actualReps: set.actualReps ?? set.targetReps })));
  const uncompleteSet = (ei: number, si: number) => mutate((s) => patchSet(s, ei, si, (set) => ({ ...set, done: false })));
  const addSet = (ei: number) =>
    mutate((s) => {
      const ex = s.exercises[ei];
      const last = ex.sets[ex.sets.length - 1];
      const next = { setIndex: ex.sets.length, weight: last?.weight ?? null, targetReps: last?.targetReps ?? 8, actualReps: null, done: false };
      return replaceExercise(s, ei, { ...ex, sets: [...ex.sets, next] });
    });
  const removeSet = (ei: number) =>
    mutate((s) => {
      const ex = s.exercises[ei];
      if (ex.sets.length <= 1) return s;
      return replaceExercise(s, ei, { ...ex, sets: ex.sets.slice(0, -1) });
    });

  const openPicker = (exI: number, setI: number, field: 'weight' | 'reps') => {
    const set = session?.exercises[exI]?.sets[setI];
    setPickerValue(field === 'weight' ? (set?.weight != null ? String(set.weight) : '') : String(set?.actualReps ?? set?.targetReps ?? ''));
    setPicker({ exIdx: exI, setIdx: setI, field });
  };
  const confirmPicker = () => {
    if (!picker) return;
    const num = Number(pickerValue);
    const valid = pickerValue !== '' && Number.isFinite(num) && num >= 0;
    mutate((s) =>
      patchSet(s, picker.exIdx, picker.setIdx, (set) =>
        picker.field === 'weight' ? { ...set, weight: valid ? num : null } : { ...set, actualReps: valid ? Math.round(num) : set.actualReps },
      ),
    );
    setPicker(null);
  };

  const onFinish = async () => {
    if (!session) return;
    setPhase('saving');
    setError(null);
    try {
      const r = await saveWorkout(session);
      await clearSession();
      finishWorkout();
      // Workout is durably committed — hand off to W-17 (active screen removed from the stack).
      router.replace({ pathname: '/workout-complete', params: { id: r.workoutId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('active');
    }
  };
  const onAbandon = async () => {
    await clearSession();
    abandonWorkout();
    router.replace('/(tabs)');
  };

  // ── resume prompt ──
  if (phase === 'resume' && resumable) {
    return (
      <Shell>
        <View style={styles.center}>
          <Card variant="hero" style={styles.resumeCard}>
            <Text style={styles.kicker}>Session in progress</Text>
            <Text style={styles.resumeName}>{resumable.workoutName}</Text>
            <Text style={styles.resumeSub}>{doneSetCount(resumable)} sets logged. Resume where you left off?</Text>
            <View style={styles.resumeActions}>
              <Button variant="primary" fullWidth onPress={() => { setSession(resumable); setPhase('active'); }} accessibilityLabel="Resume workout">
                Resume
              </Button>
              <Button variant="text" fullWidth onPress={async () => { await clearSession(); setSession(buildActiveSession()); setPhase('active'); }} accessibilityLabel="Discard and start fresh">
                Discard &amp; start fresh
              </Button>
            </View>
          </Card>
        </View>
      </Shell>
    );
  }

  if (phase === 'loading' || phase === 'saving' || !session) {
    return (
      <Shell>
        <View style={styles.center}>
          <ActivityIndicator color={flColor.bronze400} />
        </View>
      </Shell>
    );
  }

  // ── active (W-9 logging) ──
  const ex = session.exercises[exIdx];
  const totalSets = session.exercises.reduce((n, e) => n + e.sets.length, 0);
  const setsDone = doneSetCount(session);
  const complete = hasLoggedSet(session) && session.exercises.every((e) => e.sets.every((s) => s.done));

  return (
    <Shell>
      <AppBar title="Workout" serif onClose={onAbandon} />
      <View style={styles.progressBand}>
        <Text style={styles.progressText}>
          <Text style={styles.progressAccent}>{setsDone}</Text> / {totalSets} sets · {fmtElapsed(session.startedAt, now)}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${totalSets ? (setsDone / totalSets) * 100 : 0}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.exName}>{ex.name}</Text>
        <Text style={styles.exMeta}>Exercise {exIdx + 1} of {session.exercises.length}</Text>

        <View style={styles.table}>
          <View style={styles.headRow}>
            <Text style={[styles.h, styles.cSet]}>Set</Text>
            <Text style={[styles.h, styles.cTarget]}>Target</Text>
            <Text style={[styles.h, styles.cWeight]}>Weight</Text>
            <Text style={[styles.h, styles.cActual]}>Actual</Text>
          </View>
          {ex.sets.map((set, si) => (
            <View key={si} style={[styles.row, set.done && styles.rowDone]}>
              <View style={styles.cSet}>
                <View style={[styles.setNum, set.done && styles.setNumDone]}>
                  <Text style={[styles.setNumText, set.done && styles.setNumTextDone]}>{si + 1}</Text>
                </View>
              </View>
              <Text style={[styles.cTarget, styles.targetText]}>{set.targetReps}<Text style={styles.repsLabel}> reps</Text></Text>
              <Pressable style={styles.cWeight} onPress={() => openPicker(exIdx, si, 'weight')} accessibilityRole="button" accessibilityLabel={`Edit weight, set ${si + 1}`}>
                <Text style={styles.weightText}>{set.weight != null ? set.weight : '—'}</Text>
              </Pressable>
              <View style={styles.cActual}>
                <Pressable onPress={() => openPicker(exIdx, si, 'reps')} accessibilityRole="button" accessibilityLabel={`Edit actual reps, set ${si + 1}`}>
                  <Text style={styles.actualText}>{set.actualReps ?? '—'}</Text>
                </Pressable>
                <Pressable
                  onPress={() => (set.done ? uncompleteSet(exIdx, si) : completeSet(exIdx, si))}
                  accessibilityRole="button"
                  accessibilityLabel={set.done ? `Mark set ${si + 1} incomplete` : `Complete set ${si + 1}`}
                  style={[styles.check, set.done ? styles.checkDone : styles.checkOpen]}
                >
                  {set.done ? (
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={flColor.base} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M20 6L9 17l-5-5" />
                    </Svg>
                  ) : null}
                </Pressable>
              </View>
            </View>
          ))}

          <View style={styles.setBtns}>
            <Pressable onPress={() => addSet(exIdx)} accessibilityRole="button" accessibilityLabel="Add set" style={styles.addSet}>
              <Text style={styles.addSetText}>+ Add Set</Text>
            </Pressable>
            {ex.sets.length > 1 ? (
              <Pressable onPress={() => removeSet(exIdx)} accessibilityRole="button" accessibilityLabel="Remove last set" style={styles.removeSet}>
                <Text style={styles.removeSetText}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* exercise nav */}
        <View style={styles.nav}>
          <Pressable disabled={exIdx === 0} onPress={() => setExIdx((i) => Math.max(0, i - 1))} accessibilityLabel="Previous exercise" style={styles.navArrow}>
            <Text style={[styles.navArrowText, exIdx === 0 && styles.navDisabled]}>‹</Text>
          </Pressable>
          <View style={styles.dots}>
            {session.exercises.map((e, i) => {
              const eDone = e.sets.every((s) => s.done);
              return <View key={i} style={[styles.dot, i === exIdx && styles.dotCurrent, eDone && styles.dotDone]} />;
            })}
          </View>
          <Pressable disabled={exIdx >= session.exercises.length - 1} onPress={() => setExIdx((i) => Math.min(session.exercises.length - 1, i + 1))} accessibilityLabel="Next exercise" style={styles.navArrow}>
            <Text style={[styles.navArrowText, exIdx >= session.exercises.length - 1 && styles.navDisabled]}>›</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.err}>Couldn’t save — {error}. Try again.</Text> : null}

        <View style={styles.actions}>
          {complete ? <Text style={styles.completeNote}>● All sets complete</Text> : null}
          <Button variant="primary" fullWidth disabled={!hasLoggedSet(session)} onPress={onFinish} accessibilityLabel="Finish workout">
            {hasLoggedSet(session) ? 'Finish Workout' : 'Log a set to finish'}
          </Button>
        </View>
      </ScrollView>

      {/* numeric picker (simple; the wheel is a fidelity fast-follow) */}
      {picker ? (
        <View style={styles.pickerWrap}>
          <View style={styles.picker}>
            <Text style={styles.pickerTitle}>{picker.field === 'weight' ? 'Weight (lb)' : 'Actual reps'}</Text>
            <TextInput
              style={styles.pickerInput}
              value={pickerValue}
              onChangeText={(t) => setPickerValue(t.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              autoFocus
              onSubmitEditing={confirmPicker}
              accessibilityLabel="Value"
            />
            <View style={styles.pickerBtns}>
              <Button variant="primary" fullWidth onPress={confirmPicker} accessibilityLabel="Set value">
                Set
              </Button>
              <Button variant="text" fullWidth onPress={() => setPicker(null)} accessibilityLabel="Cancel">
                Cancel
              </Button>
            </View>
          </View>
        </View>
      ) : null}
    </Shell>
  );
}

// ── helpers ──
function patchSet(s: ActiveSession, ei: number, si: number, fn: (set: ActiveSession['exercises'][0]['sets'][0]) => ActiveSession['exercises'][0]['sets'][0]): ActiveSession {
  const ex = s.exercises[ei];
  const sets = ex.sets.map((set, i) => (i === si ? fn(set) : set));
  return replaceExercise(s, ei, { ...ex, sets });
}
function replaceExercise(s: ActiveSession, ei: number, ex: ActiveSession['exercises'][0]): ActiveSession {
  return { ...s, exercises: s.exercises.map((e, i) => (i === ei ? ex : e)) };
}
function Shell({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.32)' }} />
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  progressBand: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, gap: 8 },
  progressText: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.gray400 },
  progressAccent: { color: flColor.bronze400, fontWeight: '700' },
  track: { height: 5, borderRadius: 3, backgroundColor: flColor.charcoal700, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3, backgroundColor: flColor.bronze400 },

  exName: { fontFamily: flFont.display, fontSize: 24, color: flColor.cream100, marginTop: 6 },
  exMeta: { fontFamily: flFont.sans, fontSize: 12, color: flColor.gray600, marginTop: 2, marginBottom: 14 },

  table: { gap: 2 },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingBottom: 6 },
  h: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: flColor.gray600 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 6, borderRadius: flRadius.md, borderWidth: 1, borderColor: 'transparent' },
  rowDone: { borderColor: 'rgba(90,158,104,0.35)', backgroundColor: 'rgba(90,158,104,0.06)' },
  cSet: { width: 40 },
  cTarget: { flex: 1 },
  cWeight: { flex: 1 },
  cActual: { flex: 1.1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  setNum: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: flColor.charcoal600, alignItems: 'center', justifyContent: 'center' },
  setNumDone: { borderColor: flColor.greenMuted },
  setNumText: { fontFamily: flFont.sans, fontSize: 13, color: flColor.gray400 },
  setNumTextDone: { color: flColor.greenMuted },
  targetText: { fontFamily: flFont.display, fontSize: 18, color: flColor.gray400 },
  repsLabel: { fontFamily: flFont.sans, fontSize: 10, color: flColor.gray600 },
  weightText: { fontFamily: flFont.display, fontSize: 18, color: flColor.cream100 },
  actualText: { fontFamily: flFont.display, fontSize: 18, color: flColor.bronze400 },
  check: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  checkOpen: { borderColor: flColor.bronze400 },
  checkDone: { borderColor: flColor.greenMuted, backgroundColor: flColor.greenMuted },

  setBtns: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 6 },
  addSet: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: flRadius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: flColor.bronze400 },
  addSetText: { fontFamily: flFont.sans, fontSize: 13, fontWeight: '600', color: flColor.bronze400 },
  removeSet: { paddingVertical: 10, paddingHorizontal: 14 },
  removeSetText: { fontFamily: flFont.sans, fontSize: 13, color: flColor.gray600 },

  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 24 },
  navArrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navArrowText: { fontSize: 26, color: flColor.bronze400 },
  navDisabled: { color: flColor.charcoal600 },
  dots: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: flColor.charcoal600 },
  dotCurrent: { width: 20, backgroundColor: flColor.bronze400 },
  dotDone: { backgroundColor: flColor.greenMuted },

  err: { fontFamily: flFont.sans, fontSize: 13, color: flColor.redMuted, marginTop: 16 },
  actions: { marginTop: 24, gap: 8 },
  completeNote: { fontFamily: flFont.sans, fontSize: 12.5, color: flColor.bronze400, textAlign: 'center' },

  // resume + done
  resumeCard: { width: '100%', gap: 10, alignItems: 'flex-start' },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  resumeName: { fontFamily: flFont.display, fontSize: 24, color: flColor.cream100 },
  resumeSub: { fontFamily: flFont.sans, fontSize: 14, color: flColor.gray400 },
  resumeActions: { width: '100%', gap: 6, marginTop: 12 },
  doneCard: { width: '100%', gap: 12, alignItems: 'flex-start' },
  doneTitle: { fontFamily: flFont.display, fontSize: 26, color: flColor.cream100 },
  statRow: { flexDirection: 'row', gap: 26, marginTop: 4 },
  stat: { gap: 2 },
  statN: { fontFamily: flFont.display, fontSize: 22, color: flColor.cream100 },
  statLabel: { fontFamily: flFont.sans, fontSize: 11, color: flColor.gray600 },
  prBlock: { marginTop: 8, gap: 4, alignSelf: 'stretch' },
  prHeading: { fontSize: 10.5, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray400 },
  prLine: { fontFamily: flFont.sans, fontSize: 16, fontWeight: '600', color: flColor.bronze400 },
  doneAction: { width: '100%', marginTop: 20 },

  pickerWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, backgroundColor: 'rgba(5,5,5,0.55)', justifyContent: 'flex-end' },
  picker: { backgroundColor: flColor.charcoal900, borderTopLeftRadius: flRadius.xl, borderTopRightRadius: flRadius.xl, borderTopWidth: 1, borderColor: flColor.charcoal600, padding: 24, gap: 14 },
  pickerTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  pickerInput: { borderWidth: 1, borderColor: flColor.charcoal600, backgroundColor: flColor.charcoal800, borderRadius: flRadius.md, paddingVertical: 14, paddingHorizontal: 16, fontFamily: flFont.display, fontSize: 26, color: flColor.cream100, textAlign: 'center' },
  pickerBtns: { gap: 4 },
});
