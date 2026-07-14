import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/forge/composites/Button';
import { flColor, flType } from '@/constants/foundation';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

function minutesAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

/**
 * Workout tab — no Workout architecture/wireframe is locked yet (W-9–W-16),
 * so this stays a placeholder for active-set logging. It does own the
 * session's Finish/Abandon controls though: starting a workout only happens
 * from Home's "Start Workout" CTA (no "Go Live" button anywhere), but ending
 * one needs a real screen to trigger from.
 */
export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const { session, finishWorkout, abandonWorkout } = useWorkoutSession();

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {session ? (
        <View style={styles.activeSession}>
          <Text style={styles.liveLabel}>Live · Training Now</Text>
          <Text style={flType.displayTitle}>{session.workoutName}</Text>
          <Text style={flType.bodySecondary}>Started {minutesAgo(session.startedAt)} min ago</Text>

          <View style={styles.actions}>
            <Button variant="secondary" fullWidth onPress={finishWorkout} accessibilityLabel="Finish workout">
              Finish Workout
            </Button>
            <Button variant="destructive" fullWidth onPress={abandonWorkout} accessibilityLabel="Abandon workout">
              Abandon Workout
            </Button>
          </View>
        </View>
      ) : (
        <ThemedText type="subtitle">Workout</ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSession: {
    width: '100%',
    paddingHorizontal: 24,
    gap: 10,
    alignItems: 'flex-start',
  },
  liveLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: flColor.greenMuted,
  },
  actions: {
    width: '100%',
    gap: 12,
    marginTop: 24,
  },
});
