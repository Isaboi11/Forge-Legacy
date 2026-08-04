import { supabase } from '@/lib/supabase';
import type { ActivityRecord, Modality } from '@/domain/activity/history-core';
import type { ActivityDetail } from '@/domain/activity/detail-core';
import { playlistFromRow, type WorkoutPlaylistLink } from '@/domain/workout/playlist';
import { equipmentForCatalogKey } from '@/domain/home-artwork/catalog';

/**
 * The athlete's real training log — every saved workout, newest first, shaped for Activity History (W-18).
 *
 * The design's list is fed by a demo module with 23 seeded sessions; this reads `workouts` with their
 * exercises and sets. Counts are derived from what was actually logged rather than from a stored
 * summary, so the row can never disagree with the session it opens.
 */

const MODALITIES: Modality[] = ['strength', 'running', 'walking', 'cycling', 'swimming', 'rowing', 'mobility', 'other'];
const asModality = (v: string | null): Modality => (MODALITIES.includes(v as Modality) ? (v as Modality) : 'other');

type Row = {
  id: string;
  workout_name: string | null;
  activity_type: string | null;
  started_at: string;
  duration_sec: number | null;
  distance: number | null;
  distance_unit: string | null;
  chapter_id: string | null;
  workout_exercises: { name: string; workout_sets: { id: string }[] | null }[] | null;
};

export async function fetchActivityHistory(limit = 200): Promise<ActivityRecord[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Not "no history" — no session. Saying so out loud beats rendering the friendly empty state over
  // what is actually an auth problem.
  if (!user) throw new Error('Not signed in.');

  // Only columns from 0001 plus the embeds. `chapters(name)` and `partners` are fetched separately
  // below: the chapter name is decoration, and `partners` arrives in migration 0016 — which, like the
  // `0002` this repo references but doesn't contain, is not guaranteed to have been applied. Selecting
  // a column that might not exist fails the WHOLE query, taking the training log down with it.
  const { data, error } = await supabase
    .from('workouts')
    .select(
      'id, workout_name, activity_type, started_at, duration_sec, distance, distance_unit, chapter_id, workout_exercises(name, workout_sets(id))',
    )
    .eq('athlete_id', user.id)
    .eq('state', 'saved')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = (data ?? []) as unknown as Row[];

  // Partner tags, best-effort — absent column or not, the log itself still renders.
  const partnersById = new Map<string, string[]>();
  {
    const { data: pRows } = await supabase
      .from('workouts')
      .select('id, partners')
      .eq('athlete_id', user.id)
      .eq('state', 'saved')
      .limit(limit);
    for (const r of (pRows ?? []) as { id: string; partners: string[] | null }[]) {
      if (r.partners?.length) partnersById.set(r.id, r.partners);
    }
  }

  const chapterIds = [...new Set(rows.map((r) => r.chapter_id).filter((x): x is string => Boolean(x)))];
  const chapterName = new Map<string, string>();
  if (chapterIds.length) {
    const { data: chRows } = await supabase.from('chapters').select('id, name').in('id', chapterIds);
    for (const c of (chRows ?? []) as { id: string; name: string }[]) chapterName.set(c.id, c.name);
  }

  // PRs are dated, not linked to a workout id. A session counts as a PR when one of ITS exercises set a
  // record on the day it was trained — matching on date alone would credit every session that day.
  const { data: prRows } = await supabase
    .from('personal_records')
    .select('exercise, achieved_on')
    .eq('athlete_id', user.id);
  const prKeys = new Set(((prRows ?? []) as { exercise: string; achieved_on: string }[]).map((p) => `${p.achieved_on}|${p.exercise}`));

  return rows.map((w) => {
    const exercises = w.workout_exercises ?? [];
    const day = w.started_at.slice(0, 10);
    return {
      id: w.id,
      type: asModality(w.activity_type),
      title: w.workout_name?.trim() || 'Workout',
      startedAt: w.started_at,
      durationSec: w.duration_sec,
      exerciseCount: exercises.length,
      setCount: exercises.reduce((n, e) => n + (e.workout_sets?.length ?? 0), 0),
      distance: w.distance,
      distanceUnit: w.distance_unit,
      chapterName: w.chapter_id ? (chapterName.get(w.chapter_id) ?? null) : null,
      pr: exercises.some((e) => prKeys.has(`${day}|${e.name}`)),
      partners: partnersById.get(w.id) ?? [],
    };
  });
}

/**
 * One session in full, for Activity Detail (W-19). Same table as the history list, so a tapped row
 * always resolves to the session it described.
 *
 * The ordinal ("Workout #12") is counted from the athlete's own history — strength sessions numbered
 * apart from everything else, matching the design. It's two HEAD counts rather than pulling the whole
 * log back just to find a position.
 */
export async function fetchActivityDetail(id: string): Promise<ActivityDetail | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const { data, error } = await supabase
    .from('workouts')
    .select(
      'id, workout_name, activity_type, started_at, duration_sec, distance, distance_unit, chapter_id, program_id, workout_exercises(name, section, position, catalog_key, workout_sets(set_index, weight, weight_unit, reps))',
    )
    .eq('id', id)
    .eq('athlete_id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const w = data as unknown as DetailRow;
  const type = asModality(w.activity_type);

  // Everything below is decoration on a session that already loaded — a failure in any of it must not
  // take the detail screen down, so each piece degrades to absent.
  const [chapterName, programName, partners, playlist, milestones, ordinal] = await Promise.all([
    w.chapter_id
      ? supabase.from('chapters').select('name').eq('id', w.chapter_id).maybeSingle().then((r) => r.data?.name ?? null)
      : Promise.resolve(null),
    w.program_id
      ? supabase.from('programs').select('name').eq('id', w.program_id).maybeSingle().then((r) => r.data?.name ?? null)
      : Promise.resolve(null),
    (async (): Promise<string[]> => {
      const r = await supabase.from('workouts').select('partners').eq('id', id).maybeSingle();
      return (r.data as { partners: string[] | null } | null)?.partners ?? [];
    })(),
    /*
     * The playlist (W-19 §9A). Its own query for the same reason `partners` has one: these columns arrive
     * in migration 0105, and a column PostgREST cannot find fails the whole select with a 42703 rather
     * than returning a null field. Named in the big select above, an unapplied 0105 would take the entire
     * Activity Detail screen down for every session ever logged.
     */
    (async (): Promise<WorkoutPlaylistLink | null> => {
      const r = await supabase
        .from('workouts')
        .select('playlist_url, playlist_service, playlist_name')
        .eq('id', id)
        .maybeSingle();
      return playlistFromRow(r.data as Parameters<typeof playlistFromRow>[0]);
    })(),
    (async (): Promise<string[]> => {
      const r = await supabase
        .from('personal_records')
        .select('exercise, load_value, load_unit')
        .eq('athlete_id', user.id)
        .eq('achieved_on', w.started_at.slice(0, 10));
      return ((r.data ?? []) as { exercise: string; load_value: number | null; load_unit: string | null }[]).map((p) =>
        p.load_value ? `${p.load_value} ${p.load_unit ?? 'lb'} ${p.exercise}` : p.exercise,
      );
    })(),
    countOrdinal(user.id, w.started_at, type === 'strength' ? 'strength' : null),
  ]);

  const exercises = [...(w.workout_exercises ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((ex) => ({
      name: ex.name,
      section: (['warmup', 'main', 'cooldown'].includes(ex.section) ? ex.section : 'main') as
        | 'warmup'
        | 'main'
        | 'cooldown',
      catalogKey: ex.catalog_key,
      equip: ex.catalog_key ? equipmentForCatalogKey(ex.catalog_key) : null,
      sets: [...(ex.workout_sets ?? [])]
        .sort((a, b) => a.set_index - b.set_index)
        .map((s) => ({ setIndex: s.set_index, weight: s.weight, weightUnit: s.weight_unit, reps: s.reps })),
    }));

  // Only the PRs whose exercise is actually in this session — a record set elsewhere the same day
  // belongs to that session, not this one.
  const names = new Set(exercises.map((e) => e.name));
  const mine = milestones.filter((m: string) => [...names].some((n) => m.includes(n)));

  return {
    id: w.id,
    type,
    title: w.workout_name?.trim() || 'Workout',
    startedAt: w.started_at,
    durationSec: w.duration_sec,
    distance: w.distance,
    distanceUnit: w.distance_unit,
    exercises,
    chapterName,
    programId: w.program_id,
    programName,
    partners,
    playlist,
    milestones: mine,
    ordinal,
  };
}

/** 1-based position of this session in the athlete's history (oldest = 1). */
async function countOrdinal(uid: string, startedAt: string, type: string | null): Promise<number> {
  let q = supabase
    .from('workouts')
    .select('id', { count: 'exact', head: true })
    .eq('athlete_id', uid)
    .eq('state', 'saved')
    .lte('started_at', startedAt);
  if (type) q = q.eq('activity_type', type);
  const { count, error } = await q;
  return error ? 1 : Math.max(1, count ?? 1);
}

type DetailRow = {
  id: string;
  workout_name: string | null;
  activity_type: string | null;
  started_at: string;
  duration_sec: number | null;
  distance: number | null;
  distance_unit: string | null;
  chapter_id: string | null;
  program_id: string | null;
  workout_exercises:
    | {
        name: string;
        section: string;
        position: number;
        catalog_key: string | null;
        workout_sets: { set_index: number; weight: number | null; weight_unit: string | null; reps: number | null }[] | null;
      }[]
    | null;
};
