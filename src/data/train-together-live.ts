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

/**
 * Which way the ask points (0121).
 *
 * `INVITE` — I am asking you to train. `JOIN_REQUEST` — I am asking to join the session you are ALREADY
 * in. Same row, same policies, because both already say "the recipient decides"; on a JOIN_REQUEST the
 * `from_*` fields are the ASKER and the `to_*` fields are the HOST.
 */
export type WorkoutInviteKind = 'INVITE' | 'JOIN_REQUEST';

export interface WorkoutInvite {
  id: string;
  kind: WorkoutInviteKind;
  fromId: string;
  fromName: string;
  fromAvatarUrl: string | null;
  /** The recipient — the HOST on a join request, which is who the asker is waiting on. */
  toId: string;
  toName: string;
  toAvatarUrl: string | null;
  workoutName: string;
  /** Provenance only — the guest reads `exercises`, which is the snapshot (0093). */
  templateId: string | null;
  exercises: TemplateExercise[];
  /** Where the guest opens: 0 for an invitation, the host's live position for an accepted join. */
  startIndex: number;
  templateSummary: { lifts: number; sets: number } | null;
  note: string | null;
  status: 'PENDING' | 'ACCEPTED';
  createdAt: string;
  acceptedAt: string | null;
}

/** A join request waiting on the host, as the in-workout banner needs it. */
export interface PendingJoinRequest {
  id: string;
  fromId: string;
  fromName: string;
  fromAvatarUrl: string | null;
  note: string | null;
  createdAt: string;
}

const MISSING = 'Training together isn’t available yet — migration 0092 hasn’t been applied.';
const JOIN_MISSING = 'Joining a workout in progress isn’t available yet — migration 0121 hasn’t been applied.';

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
    // Pre-0121 rows have no `kind` and are all invitations, which is what the column defaults to.
    kind: d.kind === 'JOIN_REQUEST' ? 'JOIN_REQUEST' : 'INVITE',
    fromId: String(d.from_id),
    fromName: String(d.from_name ?? 'Athlete'),
    fromAvatarUrl: (d.from_avatar_url as string) ?? null,
    toId: String(d.to_id ?? ''),
    toName: String(d.to_name ?? 'Athlete'),
    toAvatarUrl: (d.to_avatar_url as string) ?? null,
    workoutName: String(d.workout_name),
    templateId: (d.template_id as string) ?? null,
    exercises: ((d.exercises ?? []) as Record<string, unknown>[]).map((e) => ({
      catalogKey: (e.catalogKey as string) ?? null,
      name: String(e.name ?? 'Exercise'),
      sets: Number(e.sets ?? 0),
      targetReps: Number(e.targetReps ?? 0),
    })),
    startIndex: Number(d.start_index ?? 0),
    templateSummary: t ? { lifts: Number(t.lifts ?? 0), sets: Number(t.sets ?? 0) } : null,
    note: (d.note as string) ?? null,
    status: d.status === 'ACCEPTED' ? 'ACCEPTED' : 'PENDING',
    createdAt: String(d.created_at),
    acceptedAt: (d.accepted_at as string) ?? null,
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
      /*
       * `kind` is deliberately NOT sent, even though every row here is an INVITE. The column defaults to
       * it, and naming it would make this insert fail with 42703 on any database where 0121 has not been
       * applied yet — breaking a feature that works today, for a label that the default already supplies.
       * The client ships over the air; migrations are applied by hand. The two are not simultaneous.
       */
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

// ── Joining a session already under way (0121) ───────────────────────────────

/** How long a workout name may be — the column's own check constraint, mirrored so it fails here first. */
const WORKOUT_NAME_MAX = 60;

/**
 * Ask to join a session someone is already in.
 *
 * The asker inserts, which the existing `workout_invites_insert` policy already permits and already
 * restricts to friends and squad-mates. NO SHAPE IS CARRIED: the asker cannot know what the host is
 * doing, and inventing one would produce an invitation to a workout nobody is running. The host writes
 * the shape when they accept.
 *
 * `workoutName` is seeded from the host's presence label ("Pull Day B"), which is all the app knows
 * about their session from outside it — and enough for the ask to name the thing.
 */
export async function requestToJoinWorkout(input: { hostId: string; workoutName: string; note?: string | null }): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const name = (input.workoutName.trim() || 'their workout').slice(0, WORKOUT_NAME_MAX);
  const { data, error } = await supabase
    .from('workout_invites')
    .insert({
      from_id: user.id,
      to_id: input.hostId,
      kind: 'JOIN_REQUEST',
      workout_name: name,
      exercises: [],
      note: input.note?.trim() || null,
    })
    .select('id')
    .single();
  if (error) {
    if ((error as { code?: string }).code === '42P01') throw new Error(MISSING);
    // 42703 = the `kind` column is missing, i.e. 0121 has not been applied on this database.
    if ((error as { code?: string }).code === '42703') throw new Error(JOIN_MISSING);
    throw error;
  }
  return (data as { id: string }).id;
}

/**
 * The host answers yes — and THE SNAPSHOT IS TAKEN HERE.
 *
 * Not at request time, because the asker could not know the shape; and this is also the moment
 * `startIndex` means anything, since it is read off the host's live session. Together they are the whole
 * difference between "do this workout too" and "join me": the guest opens the same shape, on the
 * movement the host is actually on.
 *
 * The `workout_invites_update` policy is `using (to_id = auth.uid())`, so the host writing the snapshot
 * is already permitted — the accept and the snapshot are one statement.
 */
export async function acceptJoinRequest(
  requestId: string,
  session: { workoutName: string; exercises: TemplateExercise[]; startIndex: number },
): Promise<void> {
  const { error } = await supabase
    .from('workout_invites')
    .update({
      status: 'ACCEPTED',
      accepted_at: new Date().toISOString(),
      workout_name: (session.workoutName.trim() || 'Shared Workout').slice(0, WORKOUT_NAME_MAX),
      exercises: session.exercises,
      start_index: Math.max(0, Math.min(session.startIndex, Math.max(0, session.exercises.length - 1))),
    })
    .eq('id', requestId);
  if (error) throw error;
}

/**
 * Invite someone INTO the session you are already in — the "⋯ Options" row.
 *
 * An ordinary `INVITE`, except that it carries `start_index`, so the person you asked walks in where you
 * are rather than at the top of a workout you are two-thirds through. That is the only difference, which
 * is why it is this table and not another one.
 */
export async function inviteToLiveSession(input: {
  toId: string;
  workoutName: string;
  exercises: TemplateExercise[];
  startIndex: number;
  note?: string | null;
}): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('workout_invites')
    .insert({
      from_id: user.id,
      to_id: input.toId,
      kind: 'INVITE',
      workout_name: (input.workoutName.trim() || 'Shared Workout').slice(0, WORKOUT_NAME_MAX),
      exercises: input.exercises,
      start_index: Math.max(0, Math.min(input.startIndex, Math.max(0, input.exercises.length - 1))),
      note: input.note?.trim() || null,
    })
    .select('id')
    .single();
  if (error) {
    if ((error as { code?: string }).code === '42P01') throw new Error(MISSING);
    if ((error as { code?: string }).code === '42703') throw new Error(JOIN_MISSING);
    throw error;
  }
  return (data as { id: string }).id;
}

/**
 * Join requests waiting on me right now, for the in-workout banner.
 *
 * Polled while a session is active, so it fails QUIETLY: an unapplied 0121 reads as "nobody is asking",
 * which is the safe direction. A banner that cannot appear is a missing feature; an error toast every
 * twenty seconds during a workout is a broken app.
 */
export async function fetchPendingJoinRequests(): Promise<PendingJoinRequest[]> {
  const { data, error } = await supabase.rpc('pending_join_requests');
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    fromId: String(r.from_id),
    fromName: String(r.from_name ?? 'Athlete'),
    fromAvatarUrl: (r.from_avatar_url as string) ?? null,
    note: (r.note as string) ?? null,
    createdAt: String(r.created_at),
  }));
}

// ── Being credited for it, on BOTH sides (0092's other half) ────────────────

/**
 * Everyone who agreed to train with you recently — whichever end of the ask you were on.
 *
 * ══ WHY THIS READ HAD TO EXIST ══
 *
 * Every path that wrote a partner name ran on the device that RECEIVED something: the guest accepting an
 * invite, the host accepting a join request, the host inviting from inside a live session. The ordinary
 * case — send an invite from `/train-invite`, put the phone away, go and train — wrote nothing at all,
 * because the sender was not in a session at the moment they asked and had no way to remember they had.
 * So one athlete's history said "with Selene" and Selene's said nothing, for the same hour in the same
 * gym. See `domain/workout/partner-credit.ts` for the whole shape of the fix.
 *
 * Both directions in one query, because both athletes must derive the SAME answer from the SAME row —
 * that is the only thing either of them agreed to, and RLS (rightly) forbids each writing the other's
 * workout. The `or` mirrors `workout_invites_select` exactly.
 *
 * ⚠ FAILS QUIETLY, and that is the safe direction: no credits reads as "nobody", which is the behaviour
 * that shipped. An error here must never cost the athlete the workout they are trying to save.
 *
 * Names come from `profiles` in a second read rather than an embed — `profiles_read` is
 * `using (true)` (0001), so this is a plain lookup, and it does not depend on guessing the auto-generated
 * name of a foreign key.
 */
export interface AcceptedTrainingCredit {
  athleteId: string;
  athleteName: string;
  acceptedAt: string;
}

export async function fetchAcceptedTrainingCredits(sinceISO: string): Promise<AcceptedTrainingCredit[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('workout_invites')
      .select('from_id, to_id, accepted_at')
      .eq('status', 'ACCEPTED')
      .gte('accepted_at', sinceISO)
      .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
      .order('accepted_at', { ascending: false })
      .limit(20);
    if (error || !data) return [];

    const rows = data as { from_id: string; to_id: string; accepted_at: string | null }[];
    /* The other end of each ask. Deduplicated on the way through, keeping the MOST RECENT accept per
       athlete — the rows are ordered newest first, and asking the same person twice in a day must not
       produce the same name twice on one workout. */
    const seen = new Set<string>();
    const others: { id: string; acceptedAt: string }[] = [];
    for (const r of rows) {
      if (!r.accepted_at) continue;
      const other = r.from_id === user.id ? r.to_id : r.from_id;
      if (other === user.id || seen.has(other)) continue;
      seen.add(other);
      others.push({ id: other, acceptedAt: r.accepted_at });
    }
    if (!others.length) return [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', others.map((o) => o.id));
    const nameById = new Map(((profiles ?? []) as { id: string; name: string | null }[]).map((p) => [p.id, p.name ?? '']));

    return others.map((o) => ({
      athleteId: o.id,
      athleteName: nameById.get(o.id)?.trim() || 'Athlete',
      acceptedAt: o.acceptedAt,
    }));
  } catch {
    return [];
  }
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
