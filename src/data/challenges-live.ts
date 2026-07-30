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
  /** SQUAD context. Mutually exclusive with `invitedIds`. */
  squadId?: string | null;
  /** FRIENDS context (0087): the accepted friends this is opened to. Mutually exclusive with `squadId`. */
  invitedIds?: string[] | null;
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
 * Create a competition and enroll the creator (C-2). SQUAD or FRIENDS (CS-D1's first two contexts).
 *
 * The creator joins as a participant, which is NOT auto-enrollment (CS-D1) — creating IS the act of
 * opting in, and CS-D6 makes the creator a challenge-scoped commissioner, not an outside organiser.
 * Everyone else opts in themselves from the hub.
 *
 * FRIENDS names its roster, because friends are not a group — there is no "my friends" object to point
 * at, only a graph of pairs. Being named puts the competition in front of you; it does not enter you,
 * and an invited athlete who never joins leaves no row anywhere (CS-D3).
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
  const friends = (input.invitedIds ?? []).filter((id) => id && id !== user.id);
  const isFriends = !input.squadId;
  if (isFriends && friends.length === 0) throw new Error('Pick at least one friend to compete against.');

  const { data, error } = await supabase
    .from('challenges')
    .insert({
      context: isFriends ? 'FRIENDS' : 'SQUAD',
      squad_id: isFriends ? null : input.squadId,
      invited_ids: isFriends ? friends : [],
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
  if (error) {
    if ((error as { code?: string }).code === '42703') {
      throw new Error('Competitions between friends aren’t available yet — migration 0087 hasn’t been applied.');
    }
    throw error;
  }

  const id = (data as { id: string }).id;
  const { error: joinError } = await supabase.from('challenge_participants').insert({ challenge_id: id, user_id: user.id });
  if (joinError) throw joinError;
  return id;
}

export interface Standing {
  userId: string;
  name: string;
  avatarUrl: string | null;
  score: number;
  place: number;
  /** True when another athlete shares this place — the screen shows "T-3" rather than picking a winner. */
  tied: boolean;
  isSelf: boolean;
  loggedToday: boolean;
  /** Added in the last 7 days. Shown only when above zero — CS-D3 never annotates absence. */
  recent: number;
}

export interface ChallengeDetail {
  id: string;
  name: string;
  description: string | null;
  type: ChallengeType;
  metricKey: string | null;
  context: ChallengeContext;
  state: string;
  startAt: string;
  endAt: string;
  squadId: string | null;
  squadName: string | null;
  isCreator: boolean;
  iJoined: boolean;
  standings: Standing[];
}

/** One challenge and its full roster, ranked. Null when it isn't visible to you. */
export async function fetchChallengeDetail(challengeId: string): Promise<ChallengeDetail | null> {
  const { data, error } = await supabase.rpc('challenge_detail', { p_challenge: challengeId });
  if (error) {
    if ((error as { code?: string }).code === 'PGRST202') throw new Error('Challenge detail isn’t available yet — migration 0064 hasn’t been applied.');
    throw error;
  }
  if (!data) return null;
  const d = data as Record<string, unknown>;
  return {
    id: String(d.id),
    name: String(d.name),
    description: (d.description as string) ?? null,
    type: asType(String(d.type)),
    metricKey: (d.metric_key as string) ?? null,
    context: asContext(String(d.context)),
    state: String(d.state),
    startAt: String(d.start_at),
    endAt: String(d.end_at),
    squadId: (d.squad_id as string) ?? null,
    squadName: (d.squad_name as string) ?? null,
    isCreator: !!d.is_creator,
    iJoined: !!d.i_joined,
    standings: ((d.standings ?? []) as Record<string, unknown>[]).map((r) => ({
      userId: String(r.user_id),
      name: String(r.name),
      avatarUrl: (r.avatar_url as string) ?? null,
      score: Number(r.score ?? 0),
      place: Number(r.place ?? 1),
      tied: !!r.tied,
      isSelf: !!r.is_self,
      loggedToday: !!r.logged_today,
      recent: Number(r.recent ?? 0),
    })),
  };
}

/** "2nd", "T-3" — ordinal, and honest about ties. */
export function ordinal(place: number, tied = false): string {
  const suffix = place % 100 >= 11 && place % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][place % 10] ?? 'th';
  return `${tied ? 'T-' : ''}${place}${suffix}`;
}

// ── C-4 Challenge Results ────────────────────────────────────────────────────

export interface FinalStanding {
  userId: string;
  name: string;
  avatarUrl: string | null;
  score: number;
  place: number;
  isWinner: boolean;
  tied: boolean;
  isSelf: boolean;
}

export interface Champion {
  userId: string;
  name: string;
  avatarUrl: string | null;
  score: number;
}

/**
 * A distinction computed at read time from the season's training data (C-4 §6.1 / CC-D4). Never
 * stored, never negative — a badge is only ever returned when someone genuinely earned it.
 */
export interface ChallengeBadge {
  kind: 'MOST_CONSISTENT' | 'BIGGEST_CLIMB' | 'LONGEST_STREAK';
  userId: string;
  name: string;
  value: number;
}

export interface ChallengeResultsDetail {
  id: string;
  name: string;
  description: string | null;
  type: ChallengeType;
  metricKey: string | null;
  context: ChallengeContext;
  state: string;
  startAt: string;
  endAt: string;
  squadId: string | null;
  squadName: string | null;
  field: number;
  standings: FinalStanding[];
  /** Plural by design — CS-D15 gives every athlete tied at the top a full share of the win. */
  winners: Champion[];
  summary: { total: number; athletes: number; prs: number; athleteDays: number };
  badges: ChallengeBadge[];
}

/**
 * The frozen result of a finished season. Null when the challenge isn't visible to you, or when it
 * never reached COMPLETED — a cancelled challenge has no final standings and C-4 is never shown for
 * one (spec §8), which the RPC enforces rather than trusting this caller.
 */
export async function fetchChallengeResults(challengeId: string): Promise<ChallengeResultsDetail | null> {
  const { data, error } = await supabase.rpc('challenge_results_detail', { p_challenge: challengeId });
  if (error) {
    if ((error as { code?: string }).code === 'PGRST202') throw new Error('Final results aren’t available yet — migration 0065 hasn’t been applied.');
    throw error;
  }
  if (!data) return null;
  const d = data as Record<string, unknown>;
  const s = (d.summary ?? {}) as Record<string, unknown>;
  return {
    id: String(d.id),
    name: String(d.name),
    description: (d.description as string) ?? null,
    type: asType(String(d.type)),
    metricKey: (d.metric_key as string) ?? null,
    context: asContext(String(d.context)),
    state: String(d.state),
    startAt: String(d.start_at),
    endAt: String(d.end_at),
    squadId: (d.squad_id as string) ?? null,
    squadName: (d.squad_name as string) ?? null,
    field: Number(d.field ?? 0),
    standings: ((d.standings ?? []) as Record<string, unknown>[]).map((r) => ({
      userId: String(r.user_id),
      name: String(r.name),
      avatarUrl: (r.avatar_url as string) ?? null,
      score: Number(r.score ?? 0),
      place: Number(r.place ?? 1),
      isWinner: !!r.is_winner,
      tied: !!r.tied,
      isSelf: !!r.is_self,
    })),
    winners: ((d.winners ?? []) as Record<string, unknown>[]).map((r) => ({
      userId: String(r.user_id),
      name: String(r.name),
      avatarUrl: (r.avatar_url as string) ?? null,
      score: Number(r.score ?? 0),
    })),
    summary: {
      total: Number(s.total ?? 0),
      athletes: Number(s.athletes ?? 0),
      prs: Number(s.prs ?? 0),
      athleteDays: Number(s.athlete_days ?? 0),
    },
    badges: ((d.badges ?? []) as Record<string, unknown>[]).map((r) => ({
      kind: r.kind === 'BIGGEST_CLIMB' ? 'BIGGEST_CLIMB' : r.kind === 'LONGEST_STREAK' ? 'LONGEST_STREAK' : 'MOST_CONSISTENT',
      userId: String(r.user_id),
      name: String(r.name),
      value: Number(r.value ?? 0),
    })),
  };
}

/**
 * How a finish is named. Positive by construction (CC-D3 / spec §5): every placement is stated as a
 * placement. There is no "last", and a two-athlete result does not read "Lost the duel" — the design's
 * phrasing, and the one line on that screen that manufactures a loser.
 */
export function finishLabel(place: number, isWinner: boolean, coWinners: number): string {
  if (isWinner) return coWinners > 1 ? 'Co-Champion' : 'Champion';
  if (place === 2) return 'Silver Finish';
  if (place === 3) return 'Bronze Finish';
  return `${ordinal(place)} Place`;
}

/** Season length in whole days, floored at 1 so a same-day challenge never reads "0-day season". */
export function seasonDays(startAt: string, endAt: string): number {
  const ms = new Date(endAt).getTime() - new Date(startAt).getTime();
  return Number.isFinite(ms) ? Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000))) : 1;
}

// ── C-7 Current Champions ────────────────────────────────────────────────────

export interface ChampionTitle {
  type: ChallengeType;
  metricKey: string | null;
  challengeId: string;
  challengeName: string;
  wonAt: string;
  field: number;
  /** The winning score. Shown on the tile per the design (PD-7 ruling, Amendment 006). */
  score: number;
  champions: HallChampion[];
  /** The full field for the season that awarded this title — the design's standings sheet. */
  standings: FinalStanding[];
}

export interface CurrentChampions {
  squadId: string;
  squadName: string | null;
  titles: ChampionTitle[];
}

/**
 * Who currently holds each title, with the winning score and the full standings of the season that
 * awarded it.
 *
 * C-7's spec said recognition-only (§7/§9/§12) and the design does the opposite. Under PD-7 the design
 * governs and the docs are corrected: the product owner ruled for the design, and
 * `Challenge-Architecture-Amendment-006` amends the spec accordingly. These numbers are not new
 * disclosures — the same viewer can already read them on C-3 and C-4 behind the same roster gate — so
 * this changes where a squad member sees standings, not who may see them.
 */
export async function fetchCurrentChampions(squadId: string): Promise<CurrentChampions | null> {
  const { data, error } = await supabase.rpc('squad_current_champions', { p_squad: squadId });
  if (error) {
    if ((error as { code?: string }).code === 'PGRST202') throw new Error('Current Champions isn’t available yet — migration 0070 hasn’t been applied.');
    throw error;
  }
  if (!data) return null;
  const d = data as Record<string, unknown>;
  return {
    squadId: String(d.squad_id),
    squadName: (d.squad_name as string) ?? null,
    titles: ((d.titles ?? []) as Record<string, unknown>[]).map((t) => ({
      type: asType(String(t.type)),
      metricKey: (t.metric_key as string) ?? null,
      challengeId: String(t.challenge_id),
      challengeName: String(t.challenge_name),
      wonAt: String(t.won_at),
      field: Number(t.field ?? 0),
      score: Number(t.score ?? 0),
      champions: ((t.champions ?? []) as Record<string, unknown>[]).map((c) => ({
        userId: String(c.user_id),
        name: String(c.name),
        avatarUrl: (c.avatar_url as string) ?? null,
        isSelf: !!c.is_self,
      })),
      standings: ((t.standings ?? []) as Record<string, unknown>[]).map((r) => ({
        userId: String(r.user_id),
        name: String(r.name),
        avatarUrl: (r.avatar_url as string) ?? null,
        score: Number(r.score ?? 0),
        place: Number(r.place ?? 1),
        isWinner: !!r.is_winner,
        tied: !!r.tied,
        isSelf: !!r.is_self,
      })),
    })),
  };
}

// ── C-5 Hall of Champions ────────────────────────────────────────────────────

export interface HallChampion {
  userId: string;
  name: string;
  avatarUrl: string | null;
  isSelf: boolean;
}

export interface HallRunner {
  userId: string;
  name: string;
  place: number;
  isSelf: boolean;
}

export interface HallEntry {
  id: string;
  name: string;
  type: ChallengeType;
  metricKey: string | null;
  endAt: string;
  field: number;
  score: number;
  champions: HallChampion[];
  /**
   * 2nd and 3rd, named — the design's podium strip. C-5 §6 said winners only; struck by CA7-D1 under
   * PD-7. Still bounded: top three only, no "last", no deficit.
   */
  runners: HallRunner[];
  /** Consecutive titles this champion had won, inclusive, at this point in the squad's history. */
  streak: number;
}

export interface SquadHall {
  squadId: string;
  squadName: string | null;
  foundedAt: string | null;
  entries: HallEntry[];
}

/**
 * Consecutive-title runs, computed from the ordered history rather than stored.
 *
 * Walked oldest → newest so a run counts titles already held; co-won seasons continue every co-champion's
 * run. Only ever reported as a positive streak on a winner (CC-D4), never as anyone's drought.
 */
function withStreaks(entries: HallEntry[]): HallEntry[] {
  const run = new Map<string, number>();
  const oldestFirst = [...entries].reverse();
  const streaks = oldestFirst.map((e) => {
    const ids = e.champions.map((c) => c.userId);
    const next = new Map<string, number>();
    for (const id of ids) next.set(id, (run.get(id) ?? 0) + 1);
    run.clear();
    for (const [id, n] of next) run.set(id, n);
    return Math.max(1, ...ids.map((id) => next.get(id) ?? 1));
  });
  return oldestFirst.map((e, i) => ({ ...e, streak: streaks[i] })).reverse();
}

/** Every finished competition this squad has run, newest first. Null when you can't see this squad. */
export async function fetchSquadHall(squadId: string): Promise<SquadHall | null> {
  const { data, error } = await supabase.rpc('squad_hall_of_champions', { p_squad: squadId });
  if (error) {
    if ((error as { code?: string }).code === 'PGRST202') throw new Error('The Hall of Champions isn’t available yet — migration 0068 hasn’t been applied.');
    throw error;
  }
  if (!data) return null;
  const d = data as Record<string, unknown>;
  const entries = ((d.entries ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    type: asType(String(r.type)),
    metricKey: (r.metric_key as string) ?? null,
    endAt: String(r.end_at),
    field: Number(r.field ?? 0),
    score: Number(r.score ?? 0),
    champions: ((r.champions ?? []) as Record<string, unknown>[]).map((c) => ({
      userId: String(c.user_id),
      name: String(c.name),
      avatarUrl: (c.avatar_url as string) ?? null,
      isSelf: !!c.is_self,
    })),
    runners: ((r.runners ?? []) as Record<string, unknown>[]).map((u) => ({
      userId: String(u.user_id),
      name: String(u.name),
      place: Number(u.place ?? 2),
      isSelf: !!u.is_self,
    })),
    streak: 1,
  }));
  return {
    squadId: String(d.squad_id),
    squadName: (d.squad_name as string) ?? null,
    foundedAt: (d.founded_at as string) ?? null,
    entries: withStreaks(entries),
  };
}

/**
 * The squad's own live competition (S-2's "Active Competition" section).
 *
 * Reuses `challenge_hub` rather than adding a read: the hub already returns every active challenge I'm
 * in with my place and score, so filtering it by squad is free — and calling it here means opening a
 * squad also advances any season that has just ended, the same lazy lifecycle the hub relies on.
 *
 * Returns the one ending soonest, which is the one with something at stake. Null is the ordinary case.
 */
export async function fetchSquadActiveChallenge(squadId: string): Promise<ActiveChallenge | null> {
  const hub = await fetchChallengeHub();
  const mine = hub.active.filter((c) => c.squadId === squadId);
  if (mine.length === 0) return null;
  return mine.reduce((a, b) => (new Date(a.endAt) <= new Date(b.endAt) ? a : b));
}

/**
 * Call off a competition before it closes (CS-D5). Creator or squad owner only.
 *
 * This is NOT an early finish with a winner — CS-D5 r4 gives a cancelled challenge no result, no winner
 * and no honor. Ending early WITH a crown would let whoever is ahead stop the clock, so the only honest
 * early exit is the one where the season didn't happen.
 */
export async function cancelChallenge(challengeId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_challenge', { p_challenge: challengeId });
  if (error) {
    if ((error as { code?: string }).code === 'PGRST202') throw new Error('Calling off a competition isn’t available yet — migration 0067 hasn’t been applied.');
    throw error;
  }
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
