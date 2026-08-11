import { itemByKey } from '@/domain/exercise-picker/data';
import { supabase } from '@/lib/supabase';

/**
 * The operator dashboard's read path (migrations 0129 + 0130).
 *
 * Seven RPCs, one per section of `/admin`, each wrapped by the screen in `useQuery` so a slow cohort
 * query never blocks the headline tiles. Everything here is a boundary concern: call the function,
 * name the two failures worth naming, and shape snake_case jsonb into the types the components read.
 * All the maths lives in `domain/admin/*`, pure and tested.
 *
 * ══ AUTHORIZATION IS NOT IN THIS FILE ══
 *
 * `isAppAdmin()` decides what the SCREEN renders. It does not decide what the DATABASE returns — every
 * `admin_*` function calls `admin_guard()` as its first statement and raises 42501 for anyone not in
 * `app_admins`. If this file were deleted and the RPCs called by hand, the answer would be the same.
 * That ordering matters: `/admin` is compiled into the web bundle and exists as a public URL on
 * forgelegacy.expo.app whatever the client does, so the URL was never the boundary.
 *
 * ══ THE TWO ERRORS WITH NAMES ══
 *
 * There is no Supabase CLI and no service key here — migrations are pasted into the dashboard by hand,
 * so "the code shipped and the migration has not been run yet" is a real state that lasts hours.
 * PostgREST answers an unknown function with `PGRST202`, and that gets a sentence saying exactly that
 * rather than "[object Object]". `42501` gets "Not authorized" — it should be unreachable, because
 * `isAppAdmin()` redirects first; if it ever surfaces, the gate and the screen disagree and that is
 * worth seeing rather than swallowing.
 */

const MISSING_FN = 'PGRST202';
const NOT_AUTHORIZED = '42501';

function rpcError(e: unknown, fn: string): Error {
  const err = e as { code?: string; message?: string } | null;
  if (err?.code === MISSING_FN) {
    return new Error(`Migration 0130 has not been applied yet — ${fn} does not exist in the database.`);
  }
  if (err?.code === NOT_AUTHORIZED || /not authorized/i.test(err?.message ?? '')) {
    return new Error('Not authorized.');
  }
  return new Error(err?.message ?? 'Unknown error');
}

async function callRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw rpcError(error, fn);
  return data as T;
}

/** The dashboard timezone — ONE clock for every bucket, per 0130's header. Never a per-athlete tz. */
export function dashboardTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Whether the signed-in athlete is an operator.
 *
 * ⚠ FAILS CLOSED. A thrown error resolves to `false`, not to a rethrow — the caller redirects on
 *   false, and a guard that surfaces an error state the screen might render through is not a guard.
 *   `is_app_admin()` is granted to `authenticated`, so a normal athlete gets an honest `false`; a
 *   signed-out visitor never reaches the call because `<Stack.Protected>` sends them to sign-in.
 */
export async function isAppAdmin(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_app_admin');
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

// ── Shapes ───────────────────────────────────────────────────────────────────

export interface DaySeriesRow {
  d: string;
  signups?: number;
  active?: number;
  workouts?: number;
  activated?: number;
  cumulative?: number;
  dau?: number;
  wau?: number;
  mau?: number;
}

export interface AdminOverview {
  days: number;
  tz: string;
  /** 'saved_workout' in Phase 1. Rendered on screen so the charts never quietly change meaning. */
  activeDef: string;
  tiles: {
    athletesTotal: number;
    onboardedTotal: number;
    workoutsAllTime: number;
    hoursAllTime: number;
    signups: number;
    signupsPrev: number;
    activated: number;
    activatedPrev: number;
    active: number;
    activePrev: number;
    workouts: number;
    workoutsPrev: number;
    medianWorkoutsPerActive: number;
  };
  series: DaySeriesRow[];
}

export interface AdminFunnel {
  signedUp: number;
  onboarded: number;
  firstWorkout: number;
  secondWorkout: number;
  /** The week-2 stage's OWN denominator — see 0130. Somebody who signed up yesterday is not in it. */
  week2Eligible: number;
  week2Return: number;
}

export interface AdminGrowth {
  days: number;
  series: DaySeriesRow[];
  funnel: AdminFunnel;
}

export interface CohortCell {
  k: number;
  n: number;
  pct: number;
}
export interface Cohort {
  week: string;
  size: number;
  /** How many whole weeks this cohort has aged. A cell past it is UNKNOWN, not 0%. */
  maxK: number;
  cells: CohortCell[];
}
export interface AdminCohorts {
  weeks: number;
  /** Partial by definition — the grid greys it, because it always dips. */
  currentWeek: string;
  cohorts: Cohort[];
}

export interface Bucket {
  label: string;
  n: number;
}

export interface AdminEngagement {
  days: number;
  activeDef: string;
  series: DaySeriesRow[];
  medianDaysBetween: number;
  churnRisk: Bucket[];
}

export interface FeatureRow {
  key: string;
  label: string;
  ever: number;
  inWindow: number;
}
export interface AdminAdoption {
  days: number;
  totalAthletes: number;
  activeAthletes: number;
  features: FeatureRow[];
  programs: {
    adherencePct: number | null;
    sessionsCompleted: number;
    sessionsSkipped: number;
    graduated: number;
    endedEarly: number;
    active: number;
    dropoffByWeek: { week: number; programs: number }[];
  };
}

export interface ExerciseRow {
  key: string;
  /** Resolved against the bundled catalogue; falls back to the logged name for a custom lift. */
  label: string;
  isCustom: boolean;
  athletes: number;
  workouts: number;
  entries: number;
}
export interface KeyCount {
  key: string;
  n: number;
}
export interface AdminContent {
  days: number;
  exercises: ExerciseRow[];
  activityMix: { key: string; workouts: number; athletes: number }[];
  cardioModalityMix: { key: string; sets: number }[];
  sessionSource: { program: number; template: number; freestyle: number };
  topHonors: { honorType: string; label: string; athletes: number; awards: number }[];
}

export interface AdminEvents {
  days: number;
  /** 'app_open' once 0132 is live — 0130's series still says 'saved_workout'. Rendered, not assumed. */
  activeDef: string;
  totalEvents: number;
  reportingAthletes: number;
  /** Coverage. These athletes contribute nothing, and the screen says so. */
  optedOut: number;
  athletesTotal: number;
  screens: { screen: string; views: number; athletes: number }[];
  actions: { kind: string; events: number; athletes: number }[];
  sessions: { count: number; medianSec: number; p90Sec: number; medianScreensPerSession: number };
  presence: { dau: number; wau: number; mau: number; byPlatform: KeyCount[] };
  byPlatform: { key: string; events: number; athletes: number }[];
}

export interface AdminSocial {
  days: number;
  squads: {
    total: number;
    created: number;
    public: number;
    active: number;
    posts: number;
    checkins: number;
    medianSize: number;
    sizeHistogram: Bucket[];
    joinRequests: number;
    requestsDecided: number;
  };
  friends: {
    acceptedTotal: number;
    accepted: number;
    pending: number;
    requested: number;
    medianFriends: number;
  };
  challenges: {
    created: number;
    completed: number;
    cancelled: number;
    live: number;
    byType: KeyCount[];
    medianParticipants: number;
  };
  push: { sent: number; failed: number; byKind: KeyCount[]; devices: KeyCount[] };
}

// ── Mapping helpers ──────────────────────────────────────────────────────────

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const numOrNull = (v: unknown): number | null =>
  v == null ? null : typeof v === 'number' && Number.isFinite(v) ? v : Number.isFinite(Number(v)) ? Number(v) : null;
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

/**
 * Resolve an exercise key to something a human recognises.
 *
 * ⚠ THERE IS NO EXERCISES TABLE. The catalogue is bundled client-side, so Postgres can only group on
 *   the stored `catalog_key` and hand back a sample of the logged name. The join happens here.
 *   `custom:` keys are minted by 0130 for rows whose catalog_key is null.
 */
function exerciseLabel(key: string, sampleName: string | null, isCustom: boolean): string {
  if (!isCustom) {
    const item = itemByKey(key);
    if (item?.name) return item.name;
  }
  if (sampleName && sampleName.trim()) return sampleName.trim();
  return key.startsWith('custom:') ? key.slice('custom:'.length) : key;
}

// ── The seven reads ──────────────────────────────────────────────────────────

export async function fetchAdminOverview(days: number, tz = dashboardTz()): Promise<AdminOverview> {
  const raw = obj(await callRpc('admin_overview', { p_days: days, p_tz: tz }));
  const t = obj(raw.tiles);
  return {
    days: num(raw.days),
    tz: String(raw.tz ?? tz),
    activeDef: String(raw.active_def ?? 'saved_workout'),
    tiles: {
      athletesTotal: num(t.athletes_total),
      onboardedTotal: num(t.onboarded_total),
      workoutsAllTime: num(t.workouts_all_time),
      hoursAllTime: num(t.hours_all_time),
      signups: num(t.signups),
      signupsPrev: num(t.signups_prev),
      activated: num(t.activated),
      activatedPrev: num(t.activated_prev),
      active: num(t.active),
      activePrev: num(t.active_prev),
      workouts: num(t.workouts),
      workoutsPrev: num(t.workouts_prev),
      medianWorkoutsPerActive: num(t.median_workouts_per_active),
    },
    series: arr<DaySeriesRow>(raw.series),
  };
}

export async function fetchAdminGrowth(days: number, tz = dashboardTz()): Promise<AdminGrowth> {
  const raw = obj(await callRpc('admin_growth', { p_days: days, p_tz: tz }));
  const f = obj(raw.funnel);
  return {
    days: num(raw.days),
    series: arr<DaySeriesRow>(raw.series),
    funnel: {
      signedUp: num(f.signed_up),
      onboarded: num(f.onboarded),
      firstWorkout: num(f.first_workout),
      secondWorkout: num(f.second_workout),
      week2Eligible: num(f.week2_eligible),
      week2Return: num(f.week2_return),
    },
  };
}

export async function fetchAdminCohorts(weeks: number, tz = dashboardTz()): Promise<AdminCohorts> {
  const raw = obj(await callRpc('admin_retention_cohorts', { p_weeks: weeks, p_tz: tz }));
  return {
    weeks: num(raw.weeks),
    currentWeek: String(raw.current_week ?? ''),
    cohorts: arr<Record<string, unknown>>(raw.cohorts).map((c) => ({
      week: String(c.week ?? ''),
      size: num(c.size),
      maxK: num(c.max_k),
      cells: arr<Record<string, unknown>>(c.cells).map((x) => ({ k: num(x.k), n: num(x.n), pct: num(x.pct) })),
    })),
  };
}

export async function fetchAdminEngagement(days: number, tz = dashboardTz()): Promise<AdminEngagement> {
  const raw = obj(await callRpc('admin_engagement', { p_days: days, p_tz: tz }));
  return {
    days: num(raw.days),
    activeDef: String(raw.active_def ?? 'saved_workout'),
    series: arr<DaySeriesRow>(raw.series),
    medianDaysBetween: num(raw.median_days_between),
    churnRisk: arr<Record<string, unknown>>(raw.churn_risk).map((b) => ({ label: String(b.label ?? ''), n: num(b.n) })),
  };
}

export async function fetchAdminAdoption(days: number, tz = dashboardTz()): Promise<AdminAdoption> {
  const raw = obj(await callRpc('admin_feature_adoption', { p_days: days, p_tz: tz }));
  const p = obj(raw.programs);
  return {
    days: num(raw.days),
    totalAthletes: num(raw.total_athletes),
    activeAthletes: num(raw.active_athletes),
    features: arr<Record<string, unknown>>(raw.features).map((f) => ({
      key: String(f.key ?? ''),
      label: String(f.label ?? ''),
      ever: num(f.ever),
      inWindow: num(f.in_window),
    })),
    programs: {
      // Null when nothing has been logged: "no data" and "0% adherence" are different claims.
      adherencePct: numOrNull(p.adherence_pct),
      sessionsCompleted: num(p.sessions_completed),
      sessionsSkipped: num(p.sessions_skipped),
      graduated: num(p.graduated),
      endedEarly: num(p.ended_early),
      active: num(p.active),
      dropoffByWeek: arr<Record<string, unknown>>(p.dropoff_by_week).map((d) => ({
        week: num(d.week),
        programs: num(d.programs),
      })),
    },
  };
}

export async function fetchAdminContent(days: number, limit = 20, tz = dashboardTz()): Promise<AdminContent> {
  const raw = obj(await callRpc('admin_content_popularity', { p_days: days, p_limit: limit, p_tz: tz }));
  return {
    days: num(raw.days),
    exercises: arr<Record<string, unknown>>(raw.exercises).map((e) => {
      const key = String(e.key ?? '');
      const isCustom = e.is_custom === true;
      return {
        key,
        label: exerciseLabel(key, e.sample_name == null ? null : String(e.sample_name), isCustom),
        isCustom,
        athletes: num(e.athletes),
        workouts: num(e.workouts),
        entries: num(e.entries),
      };
    }),
    activityMix: arr<Record<string, unknown>>(raw.activity_mix).map((a) => ({
      key: String(a.key ?? ''),
      workouts: num(a.workouts),
      athletes: num(a.athletes),
    })),
    cardioModalityMix: arr<Record<string, unknown>>(raw.cardio_modality_mix).map((m) => ({
      key: String(m.key ?? ''),
      sets: num(m.sets),
    })),
    sessionSource: {
      program: num(obj(raw.session_source).program),
      template: num(obj(raw.session_source).template),
      freestyle: num(obj(raw.session_source).freestyle),
    },
    topHonors: arr<Record<string, unknown>>(raw.top_honors).map((h) => ({
      honorType: String(h.honor_type ?? ''),
      label: String(h.label ?? h.honor_type ?? ''),
      athletes: num(h.athletes),
      awards: num(h.awards),
    })),
  };
}

/**
 * Phase 2 (0133). What people actually open and tap.
 *
 * Distinct from every other read model here in one way worth stating: it reports its own COVERAGE
 * (`optedOut` / `athletesTotal`). Athletes who turned "Help improve Forge" off contribute nothing, so a
 * screen-view count is a count of the athletes who left it on. A dashboard that hides that invites the
 * reader to treat a partial sample as the population.
 */
export async function fetchAdminEvents(days: number, limit = 15, tz = dashboardTz()): Promise<AdminEvents> {
  const raw = obj(await callRpc('admin_events', { p_days: days, p_limit: limit, p_tz: tz }));
  const s = obj(raw.sessions);
  const p = obj(raw.presence);
  const counts = (v: unknown): KeyCount[] =>
    arr<Record<string, unknown>>(v).map((x) => ({ key: String(x.key ?? ''), n: num(x.n) }));
  return {
    days: num(raw.days),
    activeDef: String(raw.active_def ?? 'app_open'),
    totalEvents: num(raw.total_events),
    reportingAthletes: num(raw.reporting_athletes),
    optedOut: num(raw.opted_out),
    athletesTotal: num(raw.athletes_total),
    screens: arr<Record<string, unknown>>(raw.screens).map((x) => ({
      screen: String(x.screen ?? ''),
      views: num(x.views),
      athletes: num(x.athletes),
    })),
    actions: arr<Record<string, unknown>>(raw.actions).map((x) => ({
      kind: String(x.kind ?? ''),
      events: num(x.events),
      athletes: num(x.athletes),
    })),
    sessions: {
      count: num(s.count),
      medianSec: num(s.median_sec),
      p90Sec: num(s.p90_sec),
      medianScreensPerSession: num(s.median_screens_per_session),
    },
    presence: {
      dau: num(p.dau),
      wau: num(p.wau),
      mau: num(p.mau),
      byPlatform: counts(p.by_platform),
    },
    byPlatform: arr<Record<string, unknown>>(raw.by_platform).map((x) => ({
      key: String(x.key ?? ''),
      events: num(x.events),
      athletes: num(x.athletes),
    })),
  };
}

export async function fetchAdminSocial(days: number, tz = dashboardTz()): Promise<AdminSocial> {
  const raw = obj(await callRpc('admin_social_health', { p_days: days, p_tz: tz }));
  const s = obj(raw.squads);
  const f = obj(raw.friends);
  const c = obj(raw.challenges);
  const p = obj(raw.push);
  const counts = (v: unknown): KeyCount[] =>
    arr<Record<string, unknown>>(v).map((x) => ({ key: String(x.key ?? ''), n: num(x.n) }));
  return {
    days: num(raw.days),
    squads: {
      total: num(s.total),
      created: num(s.created),
      public: num(s.public),
      active: num(s.active),
      posts: num(s.posts),
      checkins: num(s.checkins),
      medianSize: num(s.median_size),
      sizeHistogram: arr<Record<string, unknown>>(s.size_histogram).map((b) => ({
        label: String(b.label ?? ''),
        n: num(b.n),
      })),
      joinRequests: num(s.join_requests),
      requestsDecided: num(s.requests_decided),
    },
    friends: {
      acceptedTotal: num(f.accepted_total),
      accepted: num(f.accepted),
      pending: num(f.pending),
      requested: num(f.requested),
      medianFriends: num(f.median_friends),
    },
    challenges: {
      created: num(c.created),
      completed: num(c.completed),
      cancelled: num(c.cancelled),
      live: num(c.live),
      byType: counts(c.by_type),
      medianParticipants: num(c.median_participants),
    },
    push: {
      sent: num(p.sent),
      failed: num(p.failed),
      byKind: counts(p.by_kind),
      devices: counts(p.devices),
    },
  };
}
