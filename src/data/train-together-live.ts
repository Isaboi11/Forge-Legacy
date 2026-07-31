import { supabase } from '@/lib/supabase';
import type { TemplateExercise } from './templates-live';

/**
 * Train Together (S-10) — migration 0092.
 *
 * NOT a shared session. The design is explicit: "You'll each do your own copy — log your own sets on your
 * own screen. At the end you'll both be credited for training together." A synchronised session would
 * mean one athlete waiting on another's rest timer, which is two people not training.
 *
 * So there is an INVITE, and two ordinary workouts that each name the other person in
 * `workouts.partners` — the column that has existed since 0016, that Activity History reads, and that
 * 0079's twenty-four partnership honors count. Nothing has ever written a real name into it.
 */

export interface TrainingPartner {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  /** The squad you share, when you share one. Null for a friend you've never lifted alongside. */
  squadName: string | null;
}

export interface WorkoutInvite {
  id: string;
  fromId: string;
  fromName: string;
  fromAvatarUrl: string | null;
  workoutName: string;
  /** Provenance only — the guest reads `exercises`, which is the snapshot (0093). */
  templateId: string | null;
  exercises: TemplateExercise[];
  templateSummary: { lifts: number; sets: number } | null;
  note: string | null;
  status: 'PENDING' | 'ACCEPTED';
  createdAt: string;
}

const MISSING = 'Training together isn’t available yet — migration 0092 hasn’t been applied.';

/** Accepted friends and squad-mates. What the logger's partner tagger should always have read. */
export async function fetchTrainingPartners(): Promise<TrainingPartner[]> {
  const { data, error } = await supabase.rpc('training_partners');
  // An unapplied migration reads as "nobody", which is the safe direction — better an empty tagger than
  // a list of people who don't exist.
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? 'Athlete'),
    handle: (r.handle as string) ?? null,
    avatarUrl: (r.avatar_url as string) ?? null,
    squadName: (r.squad_name as string) ?? null,
  }));
}

export async function fetchWorkoutInvite(inviteId: string): Promise<WorkoutInvite | null> {
  const { data, error } = await supabase.rpc('workout_invite', { p_invite: inviteId });
  if (error) {
    if ((error as { code?: string }).code === 'PGRST202') throw new Error(MISSING);
    throw error;
  }
  if (!data) return null;
  const d = data as Record<string, unknown>;
  const t = d.template_summary as Record<string, unknown> | null;
  return {
    id: String(d.id),
    fromId: String(d.from_id),
    fromName: String(d.from_name ?? 'Athlete'),
    fromAvatarUrl: (d.from_avatar_url as string) ?? null,
    workoutName: String(d.workout_name),
    templateId: (d.template_id as string) ?? null,
    exercises: ((d.exercises ?? []) as Record<string, unknown>[]).map((e) => ({
      catalogKey: (e.catalogKey as string) ?? null,
      name: String(e.name ?? 'Exercise'),
      sets: Number(e.sets ?? 0),
      targetReps: Number(e.targetReps ?? 0),
    })),
    templateSummary: t ? { lifts: Number(t.lifts ?? 0), sets: Number(t.sets ?? 0) } : null,
    note: (d.note as string) ?? null,
    status: d.status === 'ACCEPTED' ? 'ACCEPTED' : 'PENDING',
    createdAt: String(d.created_at),
  };
}

export interface SendInviteInput {
  toId: string;
  workoutName: string;
  /** Provenance, when it came from one. */
  templateId?: string | null;
  /** The shape, snapshotted. Empty = a freestyle session under a shared name. */
  exercises?: TemplateExercise[];
  note?: string | null;
}

export async function sendWorkoutInvite(input: SendInviteInput): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('workout_invites')
    .insert({
      from_id: user.id,
      to_id: input.toId,
      workout_name: input.workoutName.trim(),
      template_id: input.templateId ?? null,
      exercises: input.exercises ?? [],
      note: input.note?.trim() || null,
    })
    .select('id')
    .single();
  if (error) {
    if ((error as { code?: string }).code === '42P01') throw new Error(MISSING);
    throw error;
  }
  return (data as { id: string }).id;
}

export async function acceptWorkoutInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('workout_invites')
    .update({ status: 'ACCEPTED', accepted_at: new Date().toISOString() })
    .eq('id', inviteId);
  if (error) throw error;
}

/**
 * Declining DELETES the row, exactly as a declined friend request does (0073). There is no DECLINED
 * state to find, so nothing records that someone said no — and a second ask later is a fresh invitation
 * rather than a retry against a refusal.
 */
export async function declineWorkoutInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.from('workout_invites').delete().eq('id', inviteId);
  if (error) throw error;
}

/** "Legs · 5 lifts · 18 sets", or just the name when it's a freestyle session under a shared title. */
export function inviteSubtitle(i: WorkoutInvite): string {
  if (!i.templateSummary) return 'Shared session · build it as you go';
  const { lifts, sets } = i.templateSummary;
  return `${lifts} ${lifts === 1 ? 'lift' : 'lifts'} · ${sets} ${sets === 1 ? 'set' : 'sets'}`;
}
