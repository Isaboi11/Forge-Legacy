import { supabase } from '@/lib/supabase';

/**
 * Challenge System (C-series) — the competition backend (migration 0059).
 *
 * SQUAD context only for now. `Challenge-System-Architecture` CS-D1 defines three roster sources —
 * SQUAD, FRIENDS, COMMUNITY — but FRIENDS needs a friends graph and COMMUNITY needs communities,
 * neither of which exists. CA3-D10 explicitly supports the squad-filtered view of C-1 as its own
 * surface, so this is a scope boundary rather than a divergence.
 *
 * Anti-shame (CS-D3) is why some things are missing here and should stay missing: there is no
 * "declined" state, because non-participation must be invisible; leaving deletes the roster row rather
 * than flagging it; and nothing in this file surfaces a loser, a deficit, or a last place.
 */

export type ChallengeType =
  | 'MOST_WORKOUTS'
  | 'MOST_VOLUME'
  | 'MAX_LIFT'
  | 'MOST_DURATION'
  | 'MOST_PRS'
  | 'DISTANCE_TOTAL'
  | 'MOST_DAYS'
  | 'MOST_REPS'
  | 'EARLY_BIRD'
  | 'MOST_VARIETY'
  | 'GAIN_MAX_LIFT'
  | 'GAIN_VOLUME'
  | 'GAIN_REPS'
  | 'GAIN_DISTANCE';

/**
 * What a `metric_key` narrows a metric to (0061) — an exercise for lift-based metrics, an activity for
 * session-based ones. Null means unscoped. Same shape squad goals already use for `goal_metric_key`.
 */
export type MetricScope = 'exercise' | 'activity' | null;

export const SCOPE_OF: Record<ChallengeType, MetricScope> = {
  MAX_LIFT: 'exercise',
  MOST_VOLUME: 'exercise',
  MOST_WORKOUTS: 'activity',
  MOST_DURATION: 'activity',
  DISTANCE_TOTAL: 'activity',
  MOST_DAYS: 'activity',
  MOST_REPS: 'exercise',
  EARLY_BIRD: null,
  MOST_VARIETY: null,
  MOST_PRS: null,
  GAIN_MAX_LIFT: 'exercise',
  GAIN_VOLUME: 'exercise',
  GAIN_REPS: 'exercise',
  GAIN_DISTANCE: 'activity',
};

/** The design's own "Which Lift" chips — now backed, since a metric can be scoped to one exercise. */
export const LIFT_KEYS: { key: string; label: string }[] = [
  { key: 'barbell-deadlift', label: 'Deadlift' },
  { key: 'barbell-back-squat', label: 'Back Squat' },
  { key: 'barbell-bench-press', label: 'Bench Press' },
  { key: 'barbell-overhead-press', label: 'Overhead Press' },
];

export const ACTIVITY_KEYS: { key: string; label: string }[] = [
  { key: 'running', label: 'Run' },
  { key: 'walking', label: 'Walk' },
  { key: 'cycling', label: 'Bike' },
  { key: 'rowing', label: 'Row' },
  { key: 'swimming', label: 'Swim' },
];

const KEY_LABEL: Record<string, string> = Object.fromEntries(
  [...LIFT_KEYS, ...ACTIVITY_KEYS].map((k) => [k.key, k.label]),
);

/**
 * What the challenge is actually called on a card: "Max Deadlift", "Most Miles Run" — the scoped name,
 * not the bare metric. Falls back to the metric label when unscoped.
 */
export function metricLabel(type: ChallengeType, metricKey: string | null): string {
  const base = CHALLENGE_TYPES[type].label;
  const key = metricKey?.trim();
  if (!key) return base;
  const scoped = KEY_LABEL[key] ?? key;
  switch (type) {
    case 'MAX_LIFT':
      return `Max ${scoped}`;
    case 'MOST_VOLUME':
      return `Most ${scoped} Volume`;
    case 'DISTANCE_TOTAL':
      return `Most ${scoped === 'Run' ? 'Miles Run' : `${scoped} Distance`}`;
    case 'MOST_WORKOUTS':
      return `Most ${scoped}s`;
    case 'MOST_DURATION':
      return `Most ${scoped} Time`;
    case 'MOST_DAYS':
      return `Most ${scoped} Days`;
    case 'MOST_REPS':
      return `Most ${scoped} Reps`;
    case 'GAIN_MAX_LIFT':
      return `Biggest ${scoped} Gain`;
    case 'GAIN_VOLUME':
      return `Biggest ${scoped} Volume Gain`;
    case 'GAIN_REPS':
      return `Biggest ${scoped} Rep Gain`;
    case 'GAIN_DISTANCE':
      return `Biggest ${scoped} Gain`;
    default:
      return base;
  }
}
export type ChallengeContext = 'SQUAD' | 'FRIENDS' | 'COMMUNITY';

/** Label + unit per type, so the hub, the card and any future detail screen read identically. */
export const CHALLENGE_TYPES: Record<ChallengeType, { label: string; unit: string }> = {
  MOST_WORKOUTS: { label: 'Most Workouts', unit: 'workouts' },
  MOST_VOLUME: { label: 'Most Volume', unit: 'lb' },
  MAX_LIFT: { label: 'Max Lift', unit: 'lb' },
  MOST_DURATION: { label: 'Most Duration', unit: 'hrs' },
  MOST_PRS: { label: 'Most PRs', unit: 'PRs' },
  DISTANCE_TOTAL: { label: 'Most Distance', unit: 'mi' },
  MOST_DAYS: { label: 'Most Days Trained', unit: 'days' },
  MOST_REPS: { label: 'Most Reps', unit: 'reps' },
  EARLY_BIRD: { label: 'Early Bird', unit: 'before 7am' },
  MOST_VARIETY: { label: 'Most Variety', unit: 'exercises' },
  GAIN_MAX_LIFT: { label: 'Biggest Lift Gain', unit: 'lb gained' },
  GAIN_VOLUME: { label: 'Biggest Volume Gain', unit: 'lb gained' },
  GAIN_REPS: { label: 'Biggest Rep Gain', unit: 'reps gained' },
  GAIN_DISTANCE: { label: 'Biggest Distance Gain', unit: 'mi gained' },
};

/** Progression metrics score the CHANGE in a metric, measured against the window before the challenge. */
export const GAIN_TYPES: ChallengeType[] = ['GAIN_MAX_LIFT', 'GAIN_VOLUME', 'GAIN_REPS', 'GAIN_DISTANCE'];
export const isGainType = (t: ChallengeType): boolean => GAIN_TYPES.includes(t);

export interface OpenChallenge {
  id: string;
  name: string;
  type: ChallengeType;
  metricKey: string | null;
  context: ChallengeContext;
  squadId: string | null;
  squadName: string | null;
  creatorName: string;
  startAt: string;
  endAt: string;
  roster: number;
}

export interface ActiveChallenge {
  id: string;
  name: string;
  type: ChallengeType;
  metricKey: string | null;
  context: ChallengeContext;
  squadId: string | null;
  squadName: string | null;
  startAt: string;
  endAt: string;
  roster: number;
  myScore: number;
  myPlace: number;
  leaderScore: number;
}

export interface PastChallenge {
  id: string;
  name: string;
  type: ChallengeType;
  metricKey: string | null;
  context: ChallengeContext;
  squadName: string | null;
  endAt: string;
  place: number;
  score: number;
  isWinner: boolean;
  roster: number;
}

export interface ChallengeStats {
  entered: number;
  wins: number;
  podiums: number;
  favType: ChallengeType | null;
}

export interface ChallengeHub {
  open: OpenChallenge[];
  active: ActiveChallenge[];
  history: PastChallenge[];
  stats: ChallengeStats;
}

const TYPES = Object.keys(CHALLENGE_TYPES) as ChallengeType[];
const asType = (v: string): ChallengeType => ((TYPES as string[]).includes(v) ? (v as ChallengeType) : 'MOST_WORKOUTS');
const asContext = (v: string): ChallengeContext => (v === 'FRIENDS' || v === 'COMMUNITY' ? v : 'SQUAD');

/** Days left, floored at 0. The hub never counts down past the end. */
export function daysLeft(endAt: string): number {
  const ms = new Date(endAt).getTime() - Date.now();
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000))) : 0;
}

/** Progress toward the leader, 0–1. A solo or scoreless challenge reads full rather than empty. */
export function shareOfLeader(myScore: number, leaderScore: number): number {
  if (leaderScore <= 0) return myScore > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, myScore / leaderScore));
}

/** Positive-framed placement (CS-D3) — a place, never a deficit. */
export function placeLabel(place: number): string {
  if (place === 1) return 'Leading';
  if (place === 2) return '2nd';
  if (place === 3) return '3rd';
  return `${place}th`;
}

export function formatScore(type: ChallengeType, score: number): string {
  const n = type === 'MOST_DURATION' ? Number(score.toFixed(1)) : Math.round(score);
  return n.toLocaleString('en-US');
}

export function pastPlaceLabel(p: PastChallenge): string {
  if (p.isWinner) return 'Champion';
  if (p.place === 2) return 'Runner-up';
  if (p.place === 3) return 'Podium';
  return 'Completed';
}

/**
 * Everything C-1 renders, in one read. Advances any due lifecycle transitions first — there is no
 * scheduler, so opening the hub is what starts an enrolled challenge and completes a finished one.
 */
export async function fetchChallengeHub(): Promise<ChallengeHub> {
  await supabase.rpc('advance_challenges', { p_squad: null });

  const { data, error } = await supabase.rpc('challenge_hub');
  if (error) {
    if ((error as { code?: string }).code === 'PGRST202') throw new Error('Competitions aren’t available yet — migration 0059 hasn’t been applied.');
    throw error;
  }

  const d = (data ?? {}) as {
    open?: Record<string, unknown>[];
    active?: Record<string, unknown>[];
    history?: Record<string, unknown>[];
    stats?: { entered?: number; wins?: number; podiums?: number; fav_type?: string | null } | null;
  };

  return {
    open: (d.open ?? []).map((r) => ({
      id: String(r.id),
      name: String(r.name),
      type: asType(String(r.type)),
      metricKey: (r.metric_key as string) ?? null,
      context: asContext(String(r.context)),
      squadId: (r.squad_id as string) ?? null,
      squadName: (r.squad_name as string) ?? null,
      creatorName: String(r.creator_name ?? 'Athlete'),
      startAt: String(r.start_at),
      endAt: String(r.end_at),
      roster: Number(r.roster ?? 0),
    })),
    active: (d.active ?? []).map((r) => ({
      id: String(r.id),
      name: String(r.name),
      type: asType(String(r.type)),
      metricKey: (r.metric_key as string) ?? null,
      context: asContext(String(r.context)),
      squadId: (r.squad_id as string) ?? null,
      squadName: (r.squad_name as string) ?? null,
      startAt: String(r.start_at),
      endAt: String(r.end_at),
      roster: Number(r.roster ?? 0),
      myScore: Number(r.my_score ?? 0),
      myPlace: Number(r.my_place ?? 1),
      leaderScore: Number(r.leader_score ?? 0),
    })),
    history: (d.history ?? []).map((r) => ({
      id: String(r.id),
      name: String(r.name),
      type: asType(String(r.type)),
      metricKey: (r.metric_key as string) ?? null,
      context: asContext(String(r.context)),
      squadName: (r.squad_name as string) ?? null,
      endAt: String(r.end_at),
      place: Number(r.place ?? 0),
      score: Number(r.score ?? 0),
      isWinner: !!r.is_winner,
      roster: Number(r.roster ?? 0),
    })),
    stats: {
      entered: Number(d.stats?.entered ?? 0),
      wins: Number(d.stats?.wins ?? 0),
      podiums: Number(d.stats?.podiums ?? 0),
      favType: d.stats?.fav_type ? asType(d.stats.fav_type) : null,
    },
  };
}

export interface CreateChallengeInput {
  squadId: string;
  name: string;
  description: string;
  type: ChallengeType;
  metricKey: string | null;
  durationDays: number;
  startAt: Date;
}

/**
 * The creator's IANA zone, stamped onto the challenge (0062). MOST_DAYS and EARLY_BIRD resolve their
 * day boundary and wall-clock hour here — in UTC, "before 7am" is 7am for almost nobody.
 */
function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Create a SQUAD challenge and enroll the creator (C-2).
 *
 * The creator joins as a participant, which is NOT auto-enrollment (CS-D1) — creating IS the act of
 * opting in, and CS-D6 makes the creator a challenge-scoped commissioner, not an outside organiser.
 * Everyone else in the squad opts in themselves from the hub.
 *
 * State is ENROLLMENT rather than ACTIVE even when it starts today: CS-D5 has no path that skips
 * enrollment, and `advance_challenges()` promotes it the moment the start time passes.
 */
export async function createChallenge(input: CreateChallengeInput): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const end = new Date(input.startAt.getTime() + input.durationDays * 24 * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from('challenges')
    .insert({
      context: 'SQUAD',
      squad_id: input.squadId,
      creator_id: user.id,
      name: input.name.trim(),
      description: input.description.trim() || null,
      type: input.type,
      metric_key: input.metricKey,
      tz: deviceTimeZone(),
      duration_type: 'CUSTOM',
      start_at: input.startAt.toISOString(),
      end_at: end.toISOString(),
      state: 'ENROLLMENT',
    })
    .select('id')
    .single();
  if (error) throw error;

  const id = (data as { id: string }).id;
  const { error: joinError } = await supabase.from('challenge_participants').insert({ challenge_id: id, user_id: user.id });
  if (joinError) throw joinError;
  return id;
}

/** Opt in. No auto-enrollment (CS-D1) — this is only ever the athlete adding themselves. */
export async function joinChallenge(challengeId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('challenge_participants').insert({ challenge_id: challengeId, user_id: user.id });
  if (error) throw error;
}

/** Withdraw. CS-D3: the row is deleted, not flagged — leaving leaves no trace. */
export async function leaveChallenge(challengeId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('challenge_participants').delete().eq('challenge_id', challengeId).eq('user_id', user.id);
  if (error) throw error;
}
