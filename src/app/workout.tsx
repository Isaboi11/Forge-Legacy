import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont, flRadius, flType } from '@/constants/foundation';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { useMutation } from '@/lib/useMutation';
import { logWorkout, type LogWorkoutResult } from '@/domain/training/log-workout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

function minutesAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}
/** Positive number or null — an empty/invalid field logs no weight (and so never fabricates a PR). */
function numOrNull(s: string | undefined): number | null {
  const n = Number(s);
  return s && Number.isFinite(n) && n > 0 ? n : null;
}
function intOrNull(s: string | undefined): number | null {
  const n = parseInt(s ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Workout tab — the active session + the Finish LOG (Phase 3, the first real write). The full active
 * workout flow (W-9–W-16) isn't locked, so this is a lean top-set logger: the program prescribes only
 * sets×reps (no load), so an honest load PR needs the athlete's real entered weight. Finish persists
 * workout → exercises → performed sets → derived PRs → an ACCOMPLISHMENT timeline row, via `logWorkout`
 * through the reusable `useMutation` write pattern (optimistic "done", rollback to editing on error).
 */
export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, finishWorkout, abandonWorkout } = useWorkoutSession();
  const { mutate, pending, error } = useMutation(logWorkout);
  const [entries, setEntries] = useState<Record<number, { weight: string; reps: string }>>({});
  const [phase, setPhase] = useState<'editing' | 'done'>('editing');
  const [result, setResult] = useState<LogWorkoutResult | null>(null);

  if (!session) {
    return (
      <ThemedView style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ThemedText type="subtitle">Workout</ThemedText>
      </ThemedView>
    );
  }

  const lifts = session.lifts;
  const setField = (i: number, field: 'weight' | 'reps', val: string) =>
    setEntries((prev) => {
      const cur = prev[i] ?? { weight: '', reps: '' };
      return { ...prev, [i]: { ...cur, [field]: val.replace(/[^0-9.]/g, '') } };
    });

  const onFinish = () => {
    const input = {
      workoutName: session.workoutName,
      startedAt: session.startedAt,
      modality: 'strength',
      lifts: lifts.map((l, i) => ({
        catalogKey: l.catalogKey,
        name: l.name,
        weight: numOrNull(entries[i]?.weight),
        reps: intOrNull(entries[i]?.reps),
      })),
    };
    setPhase('done'); // optimistic — flip to the confirmation immediately…
    mutate(input, {
      onSuccess: (r) => setResult(r),
      onError: () => setPhase('editing'), // …and roll back if the write fails
    });
  };

  const onDone = () => {
    finishWorkout(); // end the session only after a confirmed write
    router.replace('/(tabs)/legacy');
  };

  const onAbandon = () => {
    abandonWorkout();
    router.replace('/(tabs)');
  };

  // ── Confirmation (optimistic → reconciled with the server result) ──
  if (phase === 'done') {
    return (
      <ThemedView style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <View style={styles.doneWrap}>
          {pending || !result ? (
            <>
              <ActivityIndicator color={flColor.bronze400} />
              <Text style={styles.doneTitle}>Logging your session…</Text>
            </>
          ) : (
            <>
              <Text style={styles.doneKicker}>Workout Logged</Text>
              <Text style={flType.displayTitle}>{session.workoutName}</Text>
              {result.prs.length > 0 ? (
                <View style={styles.prBlock}>
                  <Text style={styles.prHeading}>New personal record{result.prs.length > 1 ? 's' : ''}</Text>
                  {result.prs.map((pr) => (
                    <Text key={pr.exercise} style={styles.prLine}>
                      {pr.exercise} · {pr.weight} {pr.unit}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text style={styles.doneSub}>Saved to your history.</Text>
              )}
              <View style={styles.doneActions}>
                <Button variant="primary" fullWidth onPress={onDone} accessibilityLabel="View in Legacy">
                  View in Legacy
                </Button>
              </View>
            </>
          )}
        </View>
      </ThemedView>
    );
  }

  // ── Editing (the log sheet) ──
  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.liveLabel}>Live · Training Now</Text>
        <Text style={flType.displayTitle}>{session.workoutName}</Text>
        <Text style={flType.bodySecondary}>Started {minutesAgo(session.startedAt)} min ago</Text>

        {error ? <Text style={styles.errorBanner}>Couldn’t save — {error}. Try again.</Text> : null}

        {lifts.length > 0 ? (
          <View style={styles.sheet}>
            <Text style={styles.sheetHint}>Log your top set — leave a lift blank to skip it.</Text>
            {lifts.map((l, i) => (
              <View key={`${l.name}-${i}`} style={styles.liftRow}>
                <View style={styles.liftNameWrap}>
                  <Text style={styles.liftName} numberOfLines={1}>
                    {l.name}
                  </Text>
                  <Text style={styles.liftSets}>{l.workingSets} sets</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="lb"
                  placeholderTextColor={flColor.gray600}
                  keyboardType="numeric"
                  value={entries[i]?.weight ?? ''}
                  onChangeText={(v) => setField(i, 'weight', v)}
                  accessibilityLabel={`${l.name} weight in pounds`}
                />
                <Text style={styles.times}>×</Text>
                <TextInput
                  style={styles.input}
                  placeholder="reps"
                  placeholderTextColor={flColor.gray600}
                  keyboardType="numeric"
                  value={entries[i]?.reps ?? ''}
                  onChangeText={(v) => setField(i, 'reps', v)}
                  accessibilityLabel={`${l.name} reps`}
                />
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.sheetHint}>No prescribed lifts — this will log the session to your history.</Text>
        )}

        <View style={styles.actions}>
          <Button variant="secondary" fullWidth disabled={pending} onPress={onFinish} accessibilityLabel="Finish workout">
            Finish Workout
          </Button>
          <Button variant="destructive" fullWidth onPress={onAbandon} accessibilityLabel="Abandon workout">
            Abandon Workout
          </Button>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48, gap: 6 },

  liveLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.greenMuted },
  errorBanner: { marginTop: 12, color: flColor.redMuted, fontFamily: flFont.sans, fontSize: 13 },

  sheet: { marginTop: 22, gap: 12 },
  sheetHint: { color: flColor.gray400, fontFamily: flFont.sans, fontSize: 13, marginTop: 18 },
  liftRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liftNameWrap: { flex: 1, minWidth: 0 },
  liftName: { color: flColor.cream100, fontFamily: flFont.sans, fontSize: 15, fontWeight: '600' },
  liftSets: { color: flColor.gray600, fontFamily: flFont.sans, fontSize: 11, marginTop: 1 },
  input: {
    width: 62,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal800,
    color: flColor.cream100,
    fontFamily: flFont.sans,
    fontSize: 15,
    textAlign: 'center',
  },
  times: { color: flColor.gray600, fontSize: 14 },

  actions: { width: '100%', gap: 12, marginTop: 30 },

  doneWrap: { width: '100%', paddingHorizontal: 24, gap: 10, alignItems: 'flex-start' },
  doneKicker: { fontSize: 11, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.bronze400 },
  doneTitle: { color: flColor.cream100, fontFamily: flFont.sans, fontSize: 16, marginTop: 4 },
  doneSub: { color: flColor.gray400, fontFamily: flFont.sans, fontSize: 14, marginTop: 4 },
  prBlock: { marginTop: 10, gap: 4 },
  prHeading: { fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray400 },
  prLine: { color: flColor.bronze400, fontFamily: flFont.sans, fontSize: 16, fontWeight: '600' },
  doneActions: { width: '100%', marginTop: 26 },
});
