import { useState } from 'react';

import { ConfirmSheet } from '@/components/forge/composites/ConfirmSheet/ConfirmSheet';
import { fetchPlannedWorkout, savePlannedWorkout } from '@/data/planned-workout-live';
import type { TemplateExercise } from '@/data/templates-live';
import { useToast } from '@/hooks/useCeremony';
import { errorMessage } from '@/lib/useQuery';

type Plan = { name: string; exercises: TemplateExercise[] };

/**
 * "Plan next" on a template (PO 2026-09-29): put it on Home's hero, ready to start, without training it now.
 *
 * It writes the SAME one-slot `planned_workouts` row that Home's "Build for later" writes (0136) — a
 * template is already a finished shape, so it skips the builder. Home's composition puts a planned slot
 * ahead of the program day ("a deliberate choice beats a passively-rendered default"), so it shows up there.
 *
 * ⚠ ONE SLOT, SO IT ASKS BEFORE IT REPLACES. The upsert overwrites whatever is waiting — a workout a
 * squad-mate posted, or one built for later — and that is the same confirmation SQ-A5-D3.2 puts in front
 * of taking a squad workout. Nothing waiting, nothing to ask.
 */
export function usePlanNext() {
  const { showToast } = useToast();
  const [ask, setAsk] = useState<{ plan: Plan; current: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const commit = async (p: Plan) => {
    setBusy(true);
    try {
      await savePlannedWorkout(p.name, p.exercises);
      showToast(`${p.name} is on Home — start it when you’re ready.`);
    } catch (e) {
      showToast(`Couldn’t plan it — ${errorMessage(e)}`);
    } finally {
      setBusy(false);
      setAsk(null);
    }
  };

  const planNext = async (p: Plan) => {
    if (busy) return;
    const current = await fetchPlannedWorkout().catch(() => null);
    if (current && current.name === p.name.trim()) {
      showToast(`${p.name} is already on Home.`);
      return;
    }
    if (current) {
      setAsk({ plan: p, current: current.name });
      return;
    }
    await commit(p);
  };

  const planSheet = (
    <ConfirmSheet
      open={ask != null}
      headline={ask ? `Replace ${ask.current}?` : ''}
      body={ask ? `Only one workout waits on Home. ${ask.current} comes off it and ${ask.plan.name} takes its place.` : ''}
      confirmLabel={`Plan ${ask?.plan.name ?? 'this'}`}
      tone="primary"
      onConfirm={() => ask && void commit(ask.plan)}
      onClose={() => setAsk(null)}
    />
  );

  return { planNext, planSheet, planning: busy };
}
