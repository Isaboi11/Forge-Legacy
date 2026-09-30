import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet/ConfirmSheet';
import { LiftMaxSheet } from '@/components/forge/LiftMaxSheet';
import { PostedWorkoutView } from '@/components/forge/PostedWorkoutView';
import { flColor, flRadius } from '@/constants/foundation';
import { fetchMyLiftMaxes } from '@/data/lift-maxes-live';
import { fetchPlannedWorkout, takePostedWorkout } from '@/data/planned-workout-live';
import type { PostedWorkoutCard } from '@/data/squad-feed-live';
import { loadContextFor, type LiftMaxes } from '@/domain/program/percent-max';
import { weightInExact } from '@/domain/settings/units';
import { exerciseNameFor } from '@/domain/training/exercise-names';
import { hasPrescription, maxKeyOf, maxKeysNeeded } from '@/domain/workout/template-prescription';
import { useToast } from '@/hooks/useCeremony';
import { useUnits } from '@/lib/settings';
import { useQuery } from '@/lib/useQuery';
import { plainError } from '@/lib/plain-error';

/**
 * A squad's posted workout, opened (PO 2026-09-27): the whole day with the READER's own weights, then Take it.
 *
 * The weights are the member's, from the member's maxes — never the poster's numbers — and when they have none
 * yet the preview says so and offers to add them, right here, before they commit to anything. The take itself is
 * the feed's (`take_posted_workout`, SQ-A5-D3): replacing a workout they built themselves is asked first;
 * replacing last night's take is not.
 */
export function PostedWorkoutPanel({ card, postId }: { card: PostedWorkoutCard; postId: string }) {
  const { units } = useUnits();
  const { showToast } = useToast();
  const maxesQ = useQuery(() => fetchMyLiftMaxes().catch(() => ({}) as LiftMaxes), []);
  const slotQ = useQuery(fetchPlannedWorkout, []);
  const [typed, setTyped] = useState<LiftMaxes | null>(null);
  const [maxesOpen, setMaxesOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  const maxes = typed ?? maxesQ.data ?? {};
  const load = loadContextFor(maxes, units === 'metric', (lb) => weightInExact(lb, units));
  const keys = maxKeysNeeded(card.exercises.map((e) => ({ maxKey: hasPrescription(e) ? maxKeyOf(e) : null })));
  const names = Object.fromEntries(keys.map((k) => [k, card.exercises.find((e) => e.catalogKey === k)?.name ?? exerciseNameFor(k)]));
  const taken = slotQ.data?.source?.postId === postId;

  const take = async () => {
    setConfirm(null);
    setBusy(true);
    try {
      const name = await takePostedWorkout(postId);
      slotQ.refetch();
      showToast(`${name} is on your home screen. Start it when you're ready.`);
    } catch (e) {
      showToast(plainError(e, 'Couldn’t take that workout.'));
    } finally {
      setBusy(false);
    }
  };
  const askTake = () => {
    const slot = slotQ.data;
    if (slot && !slot.source) setConfirm(slot.name);
    else void take();
  };

  return (
    <View style={styles.wrap}>
      <PostedWorkoutView
        rows={card.exercises}
        how={card.how}
        after={card.after}
        load={Object.keys(load.maxes).length ? load : undefined}
        maxNames={names}
        onSetMaxes={keys.length ? () => setMaxesOpen(true) : undefined}
      />
      {keys.length && Object.keys(load.maxes).length ? (
        <Pressable onPress={() => setMaxesOpen(true)} accessibilityRole="button" hitSlop={6}>
          <Text style={styles.maxLink}>Weights from your maxes · change them</Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={askTake}
        disabled={taken || busy}
        accessibilityRole="button"
        accessibilityState={{ disabled: taken || busy }}
        accessibilityLabel={taken ? `${card.name} is already on your home screen` : `Take ${card.name}`}
        style={({ pressed }) => [styles.take, taken && styles.takeDone, pressed && !taken && styles.pressed]}
      >
        {busy ? (
          <ActivityIndicator color={flColor.onBronze} />
        ) : (
          <Text style={[styles.takeText, taken && styles.takeTextDone]}>{taken ? 'On your home screen' : 'Take it'}</Text>
        )}
      </Pressable>
      {!taken ? <Text style={styles.takeHint}>It waits on your home screen. Tap Start workout when you’re at the gym.</Text> : null}

      {maxesOpen ? (
        <LiftMaxSheet
          open
          onClose={() => setMaxesOpen(false)}
          programId={null}
          keys={keys}
          names={names}
          known={maxes}
          units={units}
          title="Your maxes"
          onSaved={setTyped}
        />
      ) : null}
      <ConfirmSheet
        open={confirm != null}
        onClose={() => setConfirm(null)}
        headline="Replace your planned workout?"
        body={`You built “${confirm ?? ''}” for later. Taking this one replaces it.`}
        confirmLabel="Take it"
        onConfirm={() => void take()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, marginTop: 4 },
  maxLink: { fontSize: 12.5, fontWeight: '600', color: flColor.bronzeInk },
  take: {
    height: 50,
    borderRadius: flRadius.pill,
    backgroundColor: flColor.bronze400,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  takeDone: { backgroundColor: 'transparent', borderWidth: 1, borderColor: flColor.charcoal600 },
  takeText: { fontSize: 15.5, fontWeight: '700', letterSpacing: 0.3, color: flColor.onBronze },
  takeTextDone: { color: flColor.gray400 },
  takeHint: { fontSize: 12.5, color: flColor.gray600, textAlign: 'center' },
  pressed: { opacity: 0.85 },
});
