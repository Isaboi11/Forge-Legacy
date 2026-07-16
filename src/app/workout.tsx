import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { Card } from '@/components/forge/composites/Surface';
import { ScreenBackground } from '@/components/screen-background';
import { SCREEN_BG } from '@/constants/backgrounds';
import { flColor, flFont, flRadius, flType } from '@/constants/foundation';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { useMutation } from '@/lib/useMutation';
import { logWorkout, type LogWorkoutResult } from '@/domain/training/log-workout';

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
 * Workout tab — the active session + the Finish LOG (Phase 3, the first real write).
 *
 * INTERIM surface: the full active-workout flow (W-9–W-16) isn't locked, so this is a lean top-set
 * logger built on the forged design system (ScreenBackground · AppBar · Card · Button · foundation
 * tokens), NOT the final designed logger. The program prescribes only sets×reps (no load), so an honest
 * load PR needs the athlete's real entered weight. Finish persists workout → exercises → performed sets
 * → derived PRs → an ACCOMPLISHMENT timeline row via `logWorkout`, through the reusable `useMutation`
 * write pattern (optimistic confirmation, rollback to editing on error).
 */
export default function WorkoutScreen() {
  const router = useRouter();
  const { session, finishWorkout, abandonWorkout } = useWorkoutSession();
  const { mutate, pending, error } = useMutation(logWorkout);
  const [entries, setEntries] = useState<Record<number, { weight: string; reps: string }>>({});
  const [focused, setFocused] = useState<string | null>(null);
  const [phase, setPhase] = useState<'editing' | 'done'>('editing');
  const [result, setResult] = useState<LogWorkoutResult | null>(null);

  if (!session) {
    return (
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.32)' }} />
        <AppBar title="Workout" serif onClose={() => router.back()} />
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>No active session.</Text>
        </View>
      </View>
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
      <View style={styles.root}>
        <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.32)' }} />
        <AppBar title="" serif />
        <View style={styles.centerFill}>
          {pending || !result ? (
            <View style={styles.savingWrap}>
              <ActivityIndicator color={flColor.bronze400} />
              <Text style={styles.savingText}>Logging your session…</Text>
            </View>
          ) : (
            <Card variant="hero" style={styles.doneCard}>
              <Text style={styles.kicker}>Workout Logged</Text>
              <Text style={styles.doneName}>{session.workoutName}</Text>
              {result.prs.length > 0 ? (
                <View style={styles.prBlock}>
                  <Text style={styles.prHeading}>New personal record{result.prs.length > 1 ? 's' : ''}</Text>
                  {result.prs.map((pr) => (
                    <View key={pr.exercise} style={styles.prRow}>
                      <View style={styles.prDot} />
                      <Text style={styles.prLine}>
                        {pr.exercise} · {pr.weight} {pr.unit}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.doneSub}>Saved to your history.</Text>
              )}
              <View style={styles.doneAction}>
                <Button variant="primary" fullWidth onPress={onDone} accessibilityLabel="View in Legacy">
                  View in Legacy
                </Button>
              </View>
            </Card>
          )}
        </View>
      </View>
    );
  }

  // ── Editing (the log sheet) ──
  return (
    <View style={styles.root}>
      <ScreenBackground image={SCREEN_BG.slate} overlay={{ flat: 'rgba(5,5,5,0.32)' }} />
      <AppBar title="Log Workout" serif onClose={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>Live · Training Now</Text>
          </View>
          <Text style={styles.sessionName}>{session.workoutName}</Text>
          <Text style={styles.startedText}>Started {minutesAgo(session.startedAt)} min ago</Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>Couldn’t save — {error}. Try again.</Text>
          </View>
        ) : null}

        {lifts.length > 0 ? (
          <Card variant="default" style={styles.sheetCard}>
            <View style={styles.sheetHeadRow}>
              <Text style={styles.sheetTitle}>Top set</Text>
              <Text style={styles.sheetHint}>Leave a lift blank to skip</Text>
            </View>
            {lifts.map((l, i) => (
              <View key={`${l.name}-${i}`} style={[styles.liftRow, i > 0 && styles.liftRowDivider]}>
                <View style={styles.liftNameWrap}>
                  <Text style={styles.liftName} numberOfLines={1}>
                    {l.name}
                  </Text>
                  <Text style={styles.liftSets}>{l.workingSets} working sets</Text>
                </View>
                <TextInput
                  style={[styles.input, focused === `${i}w` && styles.inputFocused]}
                  placeholder="lb"
                  placeholderTextColor={flColor.gray600}
                  keyboardType="numeric"
                  value={entries[i]?.weight ?? ''}
                  onFocus={() => setFocused(`${i}w`)}
                  onBlur={() => setFocused(null)}
                  onChangeText={(v) => setField(i, 'weight', v)}
                  accessibilityLabel={`${l.name} weight in pounds`}
                />
                <Text style={styles.times}>×</Text>
                <TextInput
                  style={[styles.input, focused === `${i}r` && styles.inputFocused]}
                  placeholder="reps"
                  placeholderTextColor={flColor.gray600}
                  keyboardType="numeric"
                  value={entries[i]?.reps ?? ''}
                  onFocus={() => setFocused(`${i}r`)}
                  onBlur={() => setFocused(null)}
                  onChangeText={(v) => setField(i, 'reps', v)}
                  accessibilityLabel={`${l.name} reps`}
                />
              </View>
            ))}
          </Card>
        ) : (
          <Card variant="default" style={styles.sheetCard}>
            <Text style={styles.sheetHint}>No prescribed lifts — this logs the session to your history.</Text>
          </Card>
        )}

        <View style={styles.actions}>
          <Button variant="primary" fullWidth disabled={pending} onPress={onFinish} accessibilityLabel="Finish workout">
            Finish Workout
          </Button>
          <Button variant="text" fullWidth onPress={onAbandon} accessibilityLabel="Abandon workout">
            Abandon
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  emptyText: { color: flColor.gray400, fontFamily: flFont.sans, fontSize: 15 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },

  header: { paddingHorizontal: 4, paddingBottom: 18 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: flColor.greenMuted },
  liveLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: flColor.greenMuted },
  sessionName: { ...flType.displayTitle, color: flColor.cream100 },
  startedText: { ...flType.bodySecondary, color: flColor.gray400, marginTop: 2 },

  errorBanner: {
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.redMuted,
    backgroundColor: 'rgba(190,90,76,0.10)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  errorText: { color: flColor.redMuted, fontFamily: flFont.sans, fontSize: 13 },

  sheetCard: { gap: 2 },
  sheetHeadRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  sheetTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  sheetHint: { color: flColor.gray600, fontFamily: flFont.sans, fontSize: 12 },
  liftRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  liftRowDivider: { borderTopWidth: 1, borderTopColor: flColor.charcoal700 },
  liftNameWrap: { flex: 1, minWidth: 0 },
  liftName: { color: flColor.cream100, fontFamily: flFont.sans, fontSize: 15, fontWeight: '600' },
  liftSets: { color: flColor.gray600, fontFamily: flFont.sans, fontSize: 11, marginTop: 2 },
  input: {
    width: 60,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
    color: flColor.cream100,
    fontFamily: flFont.sans,
    fontSize: 15,
    textAlign: 'center',
  },
  inputFocused: { borderColor: flColor.bronze400 },
  times: { color: flColor.gray600, fontSize: 14 },

  actions: { width: '100%', gap: 6, marginTop: 26 },

  savingWrap: { alignItems: 'center', gap: 14 },
  savingText: { color: flColor.gray400, fontFamily: flFont.sans, fontSize: 15 },
  doneCard: { width: '100%', alignItems: 'flex-start' },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: flColor.bronze400 },
  doneName: { ...flType.displayTitle, color: flColor.cream100, marginTop: 6 },
  doneSub: { color: flColor.gray400, fontFamily: flFont.sans, fontSize: 14, marginTop: 10 },
  prBlock: { marginTop: 16, gap: 8, alignSelf: 'stretch' },
  prHeading: { fontSize: 10.5, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: flColor.gray400 },
  prRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  prDot: { width: 5, height: 5, transform: [{ rotate: '45deg' }], borderWidth: 1, borderColor: flColor.bronze400 },
  prLine: { color: flColor.bronze400, fontFamily: flFont.sans, fontSize: 16, fontWeight: '600' },
  doneAction: { width: '100%', marginTop: 24 },
});
