import { supabase } from '@/lib/supabase';

/**
 * Training presence — who from your circle is mid-workout (migration 0086).
 *
 * The app knew who had FINISHED a workout and never who had started one: a session lived in client
 * state, and `workouts` gets its row at save time. `profiles.training_since` is the missing fact.
 *
 * Reads never report a start older than four hours, so an app that died mid-set expires on its own
 * rather than leaving a ghost training forever. Each athlete's own `visibility.training` audience decides
 * who sees them, and `private` is the off switch.
 */

export type PresenceSource = 'squad' | 'friend';

export interface TrainingAthlete {
  userId: string;
  name: string;
  avatarUrl: string | null;
  /** The workout they're on ("Pull Day B"). Null when they didn't name it. */
  label: string | null;
  startedAt: string;
  source: PresenceSource;
  /** The squad you share. Null for a friend you share no squad with. */
  squadName: string | null;
}

/** Tell the backend a workout started or ended. Silent on failure — presence is never worth a blocked UI. */
export async function setTrainingStatus(active: boolean, label?: string): Promise<void> {
  try {
    await supabase.rpc('set_training_status', { p_active: active, p_label: label ?? null });
  } catch {
    // An unapplied 0086, or an offline device. Neither should interrupt a workout.
  }
}

/** Squad-mates and accepted friends training right now — squad first, then most recently started. */
export async function fetchTrainingNow(): Promise<TrainingAthlete[]> {
  const { data, error } = await supabase.rpc('training_now');
  // An unapplied migration reads as "nobody is training", which is the safe direction.
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    userId: String(r.user_id),
    name: String(r.name ?? 'Athlete'),
    avatarUrl: (r.avatar_url as string) ?? null,
    label: (r.label as string) ?? null,
    startedAt: String(r.started_at),
    source: r.source === 'friend' ? 'friend' : 'squad',
    squadName: (r.squad_name as string) ?? null,
  }));
}

export function minutesTraining(startedAt: string): number {
  const ms = Date.now() - new Date(startedAt).getTime();
  return Number.isFinite(ms) ? Math.max(0, Math.round(ms / 60_000)) : 0;
}

/**
 * The line beside "Live Now" when more than one person is training.
 *
 * Names the squad when the extras share one — "2 more from Iron Vigil" says something; "+2 more
 * training" says only that a number exists. Falls back to the bare count for a mixed group, because a
 * line that named one squad while quietly covering someone from another would be worse than plain.
 */
export function othersLine(rest: TrainingAthlete[]): string | null {
  if (rest.length === 0) return null;
  const squads = new Set(rest.map((a) => a.squadName).filter((s): s is string => !!s));
  const noun = rest.length === 1 ? 'more' : 'more';
  if (squads.size === 1 && rest.every((a) => a.squadName)) {
    return `${rest.length} ${noun} from ${[...squads][0]}`;
  }
  return `${rest.length} ${noun} training`;
}

/**
 * The whole-group summary for a surface that doesn't draw individuals — "2 people from Iron Vigil are
 * working out". Null when nobody is.
 */
export function trainingSummary(all: TrainingAthlete[]): string | null {
  if (all.length === 0) return null;
  if (all.length === 1) {
    const a = all[0];
    return a.squadName ? `${a.name} is training · ${a.squadName}` : `${a.name} is training`;
  }
  const squads = new Set(all.map((a) => a.squadName).filter((s): s is string => !!s));
  if (squads.size === 1 && all.every((a) => a.squadName)) {
    return `${all.length} people from ${[...squads][0]} are working out`;
  }
  return `${all.length} people from your circle are working out`;
}
