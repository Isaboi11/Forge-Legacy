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
 *
 * ── AND SOMEBODY ELSE'S, WHEN THEY POSTED IT ─────────────────────────────────────────────────────
 *
 * The owner read below is `athlete_id = auth.uid()`, so for years it resolved for exactly one person.
 * `Social-Architecture-Amendment-002` §3 nevertheless says a workout-recap card taps through to *"the
 * session on Activity Detail"* — and the Friends feed did route here, which means every athlete who
 * tapped a friend's recap got "Couldn't load this session". A dead link on the card that promises most.
 *
 * When the owner read finds nothing, `fetchSharedActivityDetail` asks whether a post entitles this
 * viewer to it (migration 0117). The owner path is tried FIRST and unchanged: your own session must
 * never depend on having posted about it, and the fast path stays the common one.
 */
export async function fetchActivityDetail(id: string): Promise<ActivityDetail | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const { data, error } = await supabase
    .from('workouts')
    .select(
      // `workout_sets.duration_sec` — the column a HOLD is recorded in (Plank, Dead Hang, loaded carry).
      // It has existed since 0096 and this select omitted it, so a timed set arrived with `reps: null`
      // and nothing else and rendered as a blank line under its own name.
      'id, workout_name, activity_type, started_at, duration_sec, distance, distance_unit, chapter_id, program_id, notes, workout_exercises(name, section, position, catalog_key, notes, workout_sets(set_index, weight, weight_unit, reps, duration_sec))',
    )
    .eq('id', id)
    .eq('athlete_id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return fetchSharedActivityDetail(id);

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
      note: ex.notes ?? null,
      equip: ex.catalog_key ? equipmentForCatalogKey(ex.catalog_key) : null,
      sets: [...(ex.workout_sets ?? [])]
        .sort((a, b) => a.set_index - b.set_index)
        .map((s) => ({ setIndex: s.set_index, weight: s.weight, weightUnit: s.weight_unit, reps: s.reps, durationSec: s.duration_sec })),
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
    note: w.notes ?? null,
    chapterName,
    programId: w.program_id,
    programName,
    partners,
    playlist,
    milestones: mine,
    ordinal,
    viewer: 'own',
    authorName: null,
  };
}

/** What migration 0117's `shared_workout_detail` returns. */
interface SharedRow {
  id: string;
  author_id: string;
  author_name: string | null;
  workout_name: string | null;
  activity_type: string | null;
  started_at: string;
  duration_sec: number | null;
  distance: number | null;
  distance_unit: string | null;
  program_name: string | null;
  playlist_url: string | null;
  playlist_service: string | null;
  playlist_name: string | null;
  note: string | null;
  exercises: {
    name: string;
    section: string;
    position: number;
    catalog_key: string | null;
    note: string | null;
    /* `duration_sec` is OPTIONAL here, not merely nullable: 0117's `shared_workout_detail` predates
       timed strength sets and 0127 adds the key. An unapplied 0127 leaves it absent, which reads as
       null — a shared hold renders without its clock rather than taking the screen down. */
    sets: { set_index: number; weight: number | null; weight_unit: string | null; reps: number | null; duration_sec?: number | null }[] | null;
  }[];
  milestones: string[];
}

/**
 * A session somebody else posted, resolved through the post that shared it (migration 0117).
 *
 * Returns null for every id that no visible post carries — including one that simply does not exist —
 * which is the right answer either way: the screen's "Couldn't load this session" already covers both,
 * and distinguishing "not shared with you" from "deleted" would tell an athlete that a workout they
 * cannot see exists.
 *
 * A DATABASE WITHOUT 0117 APPLIED degrades to the same null rather than throwing. PostgREST answers an
 * unknown function with `PGRST202`, and the honest consequence is that shared recaps do not open yet —
 * not that Activity Detail is broken for the athlete's own sessions, which is what a thrown error here
 * would look like on a screen reached from four other places.
 */
async function fetchSharedActivityDetail(id: string): Promise<ActivityDetail | null> {
  const { data, error } = await supabase.rpc('shared_workout_detail', { p_workout_id: id });
  if (error || !data) return null;

  const r = data as unknown as SharedRow;
  const type = asModality(r.activity_type);
  const exercises = [...(r.exercises ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((ex) => ({
      name: ex.name,
      section: (['warmup', 'main', 'cooldown'].includes(ex.section) ? ex.section : 'main') as 'warmup' | 'main' | 'cooldown',
      catalogKey: ex.catalog_key,
      // Withheld on a shared session, same as the session note — a remark about your own shoulder is not
      // part of what you posted. The RPC does not return it either, so this is belt and braces.
      note: null,
      equip: ex.catalog_key ? equipmentForCatalogKey(ex.catalog_key) : null,
      sets: [...(ex.sets ?? [])]
        .sort((a, b) => a.set_index - b.set_index)
        .map((s) => ({ setIndex: s.set_index, weight: s.weight, weightUnit: s.weight_unit, reps: s.reps, durationSec: s.duration_sec ?? null })),
    }));

  // Same narrowing the owner path does: a record set elsewhere on the same day belongs to that session.
  const names = new Set(exercises.map((e) => e.name));
  const mine = (r.milestones ?? []).filter((m) => [...names].some((n) => m.includes(n)));

  return {
    id: r.id,
    type,
    title: r.workout_name?.trim() || 'Workout',
    startedAt: r.started_at,
    durationSec: r.duration_sec,
    distance: r.distance,
    distanceUnit: r.distance_unit,
    exercises,
    /* ⚠ WITHHELD ON A SHARED SESSION, deliberately, and for the same reason the chapter is. A note is
       what the athlete told THEMSELVES — "slept badly", "shoulder felt off" — not part of the recap they
       chose to post. Sharing a workout is not consenting to publish your private remarks about it. */
    note: null,
    // Withheld by the RPC, and rendered as absent rather than as an empty-looking fact — see the
    // migration header for why each one is not the viewer's to see.
    chapterName: null,
    programId: null,
    programName: r.program_name,
    partners: [],
    playlist: playlistFromRow({
      playlist_url: r.playlist_url,
      playlist_service: r.playlist_service,
      playlist_name: r.playlist_name,
    } as Parameters<typeof playlistFromRow>[0]),
    milestones: mine,
    ordinal: null,
    viewer: 'shared',
    authorName: r.author_name?.trim() || 'Athlete',
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
  notes: string | null;
  workout_exercises:
    | {
        name: string;
        section: string;
        position: number;
        catalog_key: string | null;
        notes: string | null;
        workout_sets: { set_index: number; weight: number | null; weight_unit: string | null; reps: number | null; duration_sec: number | null }[] | null;
      }[]
    | null;
};
