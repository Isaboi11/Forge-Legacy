import { useState } from 'react';

import { BottomSheet } from '@/components/forge/composites/BottomSheet';
import { Button } from '@/components/forge/composites/Button';
import { LiftMaxSheet } from '@/components/forge/LiftMaxSheet';
import { PostedWorkoutView } from '@/components/forge/PostedWorkoutView';
import { fetchMyLiftMaxes } from '@/data/lift-maxes-live';
import type { PlannedWorkout } from '@/data/planned-workout-live';
import { loadContextFor, type LiftMaxes } from '@/domain/program/percent-max';
import { weightInExact } from '@/domain/settings/units';
import { exerciseNameFor } from '@/domain/training/exercise-names';
import { hasPrescription, maxKeyOf, maxKeysNeeded } from '@/domain/workout/template-prescription';
import { useUnits } from '@/lib/settings';
import { useQuery } from '@/lib/useQuery';

/**
 * The workout waiting on Home's hero — a squad post they took, or one they built for later — read before it is
 * started (PO 2026-09-30: "make sure we're able to preview the workout somehow").
 *
 * The program day already had `WorkoutPreviewSheet`; the one-off slot had nothing, so the only way to see what
 * "Day 1: Deep End Diving" asked for was to start it. This draws the SAME `PostedWorkoutView` the squad post
 * drew when they took it — the reader's own weights, a superset as one block, the poster's "how it works" —
 * so the day reads identically on the post and on Home.
 *
 * ⚠ MOUNT IT ONLY WHILE OPEN. The maxes read lives here, not on Home: `home-first-paint.test.mjs` gates Home's
 * first paint on every `useQuery` in the screen, and a read nobody needs until they tap Preview does not belong
 * in that list.
 */
export function PlannedWorkoutPreviewSheet({
  open,
  onClose,
  workout,
  onStart,
}: {
  open: boolean;
  onClose: () => void;
  workout: PlannedWorkout;
  onStart: () => void;
}) {
  const { units } = useUnits();
  const maxesQ = useQuery(() => fetchMyLiftMaxes().catch(() => ({}) as LiftMaxes), []);
  const [typed, setTyped] = useState<LiftMaxes | null>(null);
  const [maxesOpen, setMaxesOpen] = useState(false);

  const maxes = typed ?? maxesQ.data ?? {};
  const load = loadContextFor(maxes, units === 'metric', (lb) => weightInExact(lb, units));
  const keys = maxKeysNeeded(workout.exercises.map((e) => ({ maxKey: hasPrescription(e) ? maxKeyOf(e) : null })));
  const names = Object.fromEntries(keys.map((k) => [k, workout.exercises.find((e) => e.catalogKey === k)?.name ?? exerciseNameFor(k)]));

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={workout.name}
        scroll
        footer={
          <Button variant="primary" fullWidth onPress={onStart} accessibilityLabel={`Start ${workout.name}`}>
            Start Workout
          </Button>
        }
      >
        <PostedWorkoutView
          rows={workout.exercises}
          how={workout.brief?.how}
          after={workout.brief?.after}
          load={Object.keys(load.maxes).length ? load : undefined}
          maxNames={names}
          onSetMaxes={keys.length ? () => setMaxesOpen(true) : undefined}
        />
      </BottomSheet>

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
    </>
  );
}
