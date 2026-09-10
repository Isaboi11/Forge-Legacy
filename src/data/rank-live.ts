import { supabase } from '@/lib/supabase';
import { assembleSignals, type RawSession } from '@/domain/rank/signals';
import { rawAsOf, replayRungs, type DatedRankInputs, type RungEarned } from '@/domain/rank/history';
import { rankDisplay, rankLevel, resolveRank, resolveSubTier, type RankSignals, type ResolvedRank } from '@/domain/rank/rank';
import { FAMILIES, type AthleteType, type RankFamily } from '@/domain/rank/thresholds';

/**
 * Rank signal aggregation from live Supabase data (Slice 2). Reads the athlete's real activity — saved
 * workouts (consistency · volume · longevity · recent · endurance PBs), load PRs (strength improvement),
 * graduated programs, sealed chapters, and chapter-resolved goals — and hands them to the pure engine.
 *
 * Read-only: this computes what the athlete has EARNED; Slice 3 persists it + fires ceremonies. All
 * sessions are native (no import path exists yet), so import credit is inert.
 */

const ATHLETE_TYPE: Record<string, AthleteType> = {
  Strength: 'strength',
  Bodybuilding: 'bodybuilding',
  Endurance: 'endurance',
  Hybrid: 'hybrid',
};

interface WorkoutRow {
  saved_at: string | null;
  started_at: string;
  duration_sec: number | null;
  activity_type: string;
  distance: number | null;
}
interface PRRow {
  achieved_on: string | null;
  created_at: string;
}
interface GoalRow {
  is_primary: boolean;
  achieved_at: string | null;
  chapter_id: string | null;
}

/** A session as the rank history needs it: the engine's fields, plus what to show and where to go. */
export type HistorySession = RawSession & { id: string; name: string | null };

/**
 * Everything the engine reads, each row with its DATE — so it can be cut at today (the live rank) or at
 * any past day (the rung replay, `history.ts`). One fetch for both, so the replay can never be fed
 * different rows from the ones that promote.
 *
 * ⚠ DATES ARE CLAMPED TO TODAY. A row stamped in the future (clock skew on a device) would otherwise be
 *   cut OUT of today's count by `rawAsOf` — silently lowering the live rank below what this function
 *   counted before it learned about dates. Clamping keeps "today" identical to the old undated count.
 */
async function fetchDatedRankInputs(): Promise<{ dated: DatedRankInputs; sessions: HistorySession[]; today: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not signed in');
  const uid = user.id;
  const today = new Date().toISOString().slice(0, 10);
  const clamp = (iso: string | null | undefined): string => (iso && iso.slice(0, 10) <= today ? iso : today);

  const [prof, workoutsRes, prRes, programsRes, chaptersRes, goalsRes] = await Promise.all([
    supabase.from('profiles').select('athlete_type').eq('id', uid).single(),
    supabase.from('workouts').select('id, workout_name, saved_at, started_at, duration_sec, activity_type, distance').eq('athlete_id', uid).eq('state', 'saved'),
    supabase.from('personal_records').select('achieved_on, created_at').eq('athlete_id', uid).eq('measure_kind', 'load'),
    supabase.from('programs').select('id, source_definition_id, ended_at, updated_at').eq('athlete_id', uid).eq('state', 'graduated'),
    supabase.from('chapters').select('id, sealed_at').eq('athlete_id', uid).not('sealed_at', 'is', null),
    supabase.from('goals').select('is_primary, achieved_at, chapter_id').eq('athlete_id', uid),
  ]);

  const athleteType = ATHLETE_TYPE[(prof.data as { athlete_type: string | null } | null)?.athlete_type ?? ''] ?? 'strength';

  const sessions: HistorySession[] = ((workoutsRes.data ?? []) as (WorkoutRow & { id: string; workout_name: string | null })[]).map((w) => ({
    id: w.id,
    name: w.workout_name,
    date: clamp(w.saved_at ?? w.started_at),
    durationSec: w.duration_sec ?? 0,
    state: 'saved',
    activityType: w.activity_type ?? 'strength',
    distance: w.distance,
  }));

  const loadPRDates = ((prRes.data ?? []) as PRRow[]).map((r) => r.achieved_on ?? r.created_at?.slice(0, 10)).filter((d): d is string => !!d).map((d) => clamp(d));

  // Goal participation = a goal resolved through chapter sealing (RCM §6.6); primary achievements are the
  // subset flagged achieved. Only goals attached to a SEALED chapter count — and each resolved the day its
  // chapter sealed.
  const sealedAt = new Map(((chaptersRes.data ?? []) as { id: string; sealed_at: string }[]).map((c) => [c.id, clamp(c.sealed_at)]));
  const resolvedGoals = ((goalsRes.data ?? []) as GoalRow[])
    .filter((g) => g.chapter_id != null && sealedAt.has(g.chapter_id))
    .map((g) => ({ date: sealedAt.get(g.chapter_id as string) as string, primaryAchieved: g.is_primary && g.achieved_at != null }));

  /*
   * Total graduations is the honest count — it is what `honor_metrics()` counts for the program honors,
   * and it is what the athlete actually did. The DISTINCT count collapses re-runs of one plan to one
   * (CAL Q14); `planKey` is `distinctProgramCount`'s key, so the two cannot disagree.
   *
   * NOTE the two are still equal for most athletes — `programs_one_per_source` prevents a second row for
   * the same catalog program — so this is not expected to move anyone's rank. It closes the gap for
   * athlete-AUTHORED programs, which carry no source id.
   */
  const programRows = (programsRes.data ?? []) as { id: string; source_definition_id: string | null; ended_at: string | null; updated_at: string }[];

  return {
    today,
    sessions,
    dated: {
      athleteType,
      sessions,
      loadPRDates,
      graduations: programRows.map((p) => ({ date: clamp(p.ended_at ?? p.updated_at), planKey: p.source_definition_id ?? `id:${p.id}` })),
      sealedChapterDates: [...sealedAt.values()],
      resolvedGoals,
    },
  };
}

export async function buildRankSignals(): Promise<RankSignals> {
  const { dated, today } = await fetchDatedRankInputs();
  return assembleSignals(rawAsOf(dated, today));
}

export interface RankHistory {
  /** The signals as of today — where the athlete stands against a rung not yet earned. */
  current: RankSignals;
  /** Rung index (0–27) → the day it was first reached and what the engine read that day. */
  earned: Map<number, RungEarned>;
  sessions: HistorySession[];
}

/**
 * The Rank Journey's rung sheets: when each rung was earned and what it took (`replayRungs`).
 *
 * ⚠ YIELDS BEFORE REPLAYING. The replay is synchronous work on the JS thread (≈0.1 s for two years of
 *   training on a desktop, a few times that on a phone), so it is pushed past the frame that renders the
 *   screen rather than run inside it.
 */
export async function fetchRankHistory(): Promise<RankHistory> {
  const { dated, sessions, today } = await fetchDatedRankInputs();
  await new Promise((r) => setTimeout(r, 0));
  return { current: assembleSignals(rawAsOf(dated, today)), earned: replayRungs(dated, today), sessions };
}

/** The rank the athlete has earned right now (signals → convergence). */
export async function computeCurrentRank(): Promise<ResolvedRank> {
  return resolveRank(await buildRankSignals());
}

/** The athlete's persisted rank (cheap read, no recompute) — for the "you are here" marker. */
export async function fetchStoredRank(): Promise<{ family: RankFamily; subTier: number }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { family: 'foundation', subTier: 1 };
  const { data } = await supabase.from('athlete_rank_state').select('family, sub_tier').eq('athlete_id', user.id).maybeSingle();
  const row = data as { family: string; sub_tier: number } | null;
  return { family: (row?.family ?? 'foundation') as RankFamily, subTier: row?.sub_tier ?? 1 };
}

export interface RankRefresh {
  rank: ResolvedRank;
  /** The family newly crossed INTO this run (fire the M-1 ceremony), else null. */
  promotedFamily: RankFamily | null;
  /**
   * The sub-tier newly reached WITHIN the family already held, else null. Fires the same M-1 ceremony.
   *
   * This used to be unreported, and the silence was the bug: `Featured-Legacy-Moment-Standards` §3 defines
   * a Rank Up as the score crossing "a rank OR SUB-TIER threshold", but only the family boundary was ever
   * handed back, so three of every four promotions were persisted and never announced. An athlete reached
   * Foundation II by writing a row in a table and was told nothing.
   *
   * Never both: a family crossing re-resolves the sub-tier at the new family, so reporting that as a
   * sub-tier promotion too would fire two ceremonies for one advancement.
   */
  promotedSubTier: number | null;
  /**
   * The rank held BEFORE this run — what the ascension was FROM.
   *
   * The one fact a rank-up needs to be a story rather than a label, and the one the caller could never
   * have: this function already reads the stored row, decides the promotion against it, and then
   * overwrites it, so by the time anything downstream looks the previous rank is gone. Every surface
   * that wanted to say "Foundation IV → Builder I" had to either not say it or make it up.
   *
   * ⚠ NULL WHEN THERE WAS NO STORED ROW, AND THAT IS NOT THE SAME AS FOUNDATION I. An athlete evaluated
   * for the first time did not hold Foundation I and then leave it — they were simply never ranked.
   * `fetchStoredRank` defaults to Foundation I because a DISPLAY needs something to draw; a permanent
   * record of a transition does not, and printing a rank somebody never held is exactly the class of
   * invention `share/content.ts` deleted its whole `DEMO` table over.
   */
  previous: { family: RankFamily; subTier: number } | null;
}

/**
 * Slice 3 — evaluate the earned rank against the stored one and persist any promotion. Rank never
 * decreases (RSA §3.3): a lower computed rank is ignored and the stored rank kept. Writes both the engine
 * record (`athlete_rank_state`) and the denormalized display fields (`profiles.rank_family/rank_level`).
 * Returns the current rank + whether a FAMILY boundary was crossed so the caller can fire M-1.
 *
 * Idempotent per promotion: once persisted, a re-run sees earned == stored and reports no promotion.
 */
export async function refreshRank(): Promise<RankRefresh | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const uid = user.id;

  const signals = await buildRankSignals();
  const earned = resolveRank(signals);

  const { data: stored } = await supabase.from('athlete_rank_state').select('family, sub_tier, rank_level').eq('athlete_id', uid).maybeSingle();
  const storedRow = stored as { family: string; sub_tier: number; rank_level: number } | null;
  const storedFamily = (storedRow?.family ?? 'foundation') as RankFamily;
  const storedLevel = storedRow?.rank_level ?? 1;
  // Captured BEFORE the upsert below overwrites it. Null on a first-ever evaluation — see `previous`.
  const previous = storedRow ? { family: storedFamily, subTier: storedRow.sub_tier } : null;

  /**
   * ONE FAMILY PER REFRESH — every promotion is individually experienced (RS-D12, RSA §12).
   *
   * Only one M-1 ceremony fires per run, for the family newly entered. So an athlete who crosses two or
   * three families in a single evaluation is silently carried past the ones in between: they are never
   * told they made Architect, and the badge they'd have worn for it never existed for them. That was
   * always possible in principle (a large import would do it); it became LIKELY the day self-directed
   * blocks shipped, because a whole cohort of athletes held at Craftsman by the program gate can clear
   * two families at once on their first Legacy visit after the update.
   *
   * Capping the advance to one family per refresh walks them up the ladder over consecutive visits, with
   * a ceremony each time. Nothing is lost — `resolveRank` is pure and re-runs on the next focus — and the
   * never-decreases rule below is untouched. The proper fix is the promotion queue (D-RCM-24), which is
   * its own architecture slice.
   */
  const cappedIdx = Math.min(FAMILIES.indexOf(earned.family), FAMILIES.indexOf(storedFamily) + 1);
  const family = FAMILIES[cappedIdx] as RankFamily;
  // Re-resolve the sub-tier AT the capped family — an athlete's within-family active weeks are measured
  // from that family's entry threshold, so carrying the earned sub-tier down would overstate it.
  const subTier = family === earned.family ? earned.subTier : resolveSubTier(family, signals);
  const rank: ResolvedRank = { family, subTier, rankLevel: rankLevel(family, subTier), display: rankDisplay(family, subTier) };

  // Nothing to do — the stored rank already meets or exceeds this step (and the row exists).
  if (storedRow != null && rank.rankLevel <= storedLevel) {
    return {
      rank: { family: storedFamily, subTier: storedRow.sub_tier, rankLevel: storedLevel, display: rankDisplay(storedFamily, storedRow.sub_tier) },
      promotedFamily: null,
      promotedSubTier: null,
      // Nothing was promoted, so nothing was left behind — `previous` is meaningful only beside a promotion.
      previous: null,
    };
  }

  const familyChanged = cappedIdx > FAMILIES.indexOf(storedFamily);
  const nowIso = new Date().toISOString();

  await supabase.from('athlete_rank_state').upsert(
    {
      athlete_id: uid,
      family: rank.family,
      sub_tier: rank.subTier,
      rank_level: rank.rankLevel,
      ...(familyChanged ? { family_entry_date: nowIso.slice(0, 10) } : {}),
      updated_at: nowIso,
    },
    { onConflict: 'athlete_id' },
  );
  await supabase.from('profiles').update({ rank_family: rank.family, rank_level: rank.subTier }).eq('id', uid);

  // Past the early return above, `rank.rankLevel > storedLevel` is established — this IS a promotion.
  // So the only question left is which kind, and the two are mutually exclusive.
  return {
    rank,
    promotedFamily: familyChanged ? rank.family : null,
    promotedSubTier: familyChanged ? null : rank.subTier,
    previous,
  };
}
