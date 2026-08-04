import type { CardioActivity } from '@/domain/workout/conditioning';
import { supabase } from '@/lib/supabase';
import type { LoggedWorkout, ProgramState } from '@/domain/program/progress-core';
import type { LiftMaxes } from '@/domain/program/percent-max';

/**
 * The Forge Program Builder `.dc` model, persisted to the `programs` table (0013), plus the lifecycle
 * (0017) and the workout attribution (0018) that Program Detail reads.
 */
/**
 * One prescribed rep count.
 *
 * `'F'` is to failure — a real prescription ("Dips: F-F-F"), and NOT the same as an absent target. A
 * number would be a lie about what was asked for, and 0 would read as a set with nothing in it.
 */
export type RepTarget = number | 'F';

export type ProgramExercise = {
  id?: string;
  catalogKey?: string;
  name: string;
  equip?: string;
  muscles?: string[];
  type?: string;
  sets?: number;
  reps?: number;
  /**
   * A PER-SET ladder — "6-6-4-4" is `[6, 6, 4, 4]`, "10-10-10-F" is `[10, 10, 10, 'F']`.
   *
   * When present this is authoritative and its LENGTH is the set count, so `sets`/`reps` are ignored.
   * Absent means the flat case, and every program authored before this reads unchanged.
   *
   * ══ WHY THIS IS NOT `sets` × `reps` ══
   *
   * A wave like 6-6-4-4 is four different sets at four different loads; flattening it to 4×6 prescribes
   * eight reps nobody asked for and erases the intensity curve that IS the program. The session model
   * has always held `targetReps` per set — only the program layer was collapsing it.
   */
  repScheme?: RepTarget[];
  /**
   * Performed for TIME rather than reps — "30s Banded Pull Aparts", "1m Assault Bike".
   *
   * Mutually exclusive with reps in practice, and checked first when rendering a prescription: an item
   * with both is read as timed, because that is the stricter reading of what the author wrote.
   */
  durationSec?: number | null;
  /** "(Optional) Stairmaster" — prescribed, but the athlete owes nothing by skipping it. */
  optional?: boolean;
  /**
   * ══ LOAD AS A PERCENTAGE OF A TESTED MAX ══
   *
   * "Back Squat 5 × 5 @ 75%". The percentage IS the prescription in a peaking block — strip it and you
   * have not simplified the session, you have deleted the training and kept the shape.
   *
   * This is the one load field in the model, and it is deliberately NOT an absolute weight. The import
   * path still discards loads it reads off somebody else's spreadsheet (`import-scheme.ts`), and that
   * remains right: those percentages refer to a max this app has never seen. An AUTHORED percentage is
   * different — the athlete tells us their max at adoption, and the number on the bar is derived.
   *
   * A RANGE ("70–75%") is authored as its floor, matching how the rep parser already reads "6–8 reps".
   *
   * Absent means no percentage, which is every program authored before this — the field is optional and
   * `programs.structure` is jsonb, so none of them needed migrating.
   */
  percentOfMax?: number;
  /**
   * PER-SET percentages, parallel to `repScheme` — a ramp like `5@65, 4@75, 3@80, 2@87, 1@92` is
   * `repScheme: [5,4,3,2,1]` and `percentScheme: [65,75,80,87,92]`.
   *
   * Flattening this to one percentage would erase the intensity curve that IS the session, exactly as
   * flattening a ladder to `sets × reps` erases the rep curve. `null` at a position means that set
   * prescribes no percentage; a short array leaves the remaining sets unprescribed rather than
   * repeating the last value, because repeating it would invent a load nobody wrote.
   */
  percentScheme?: (number | null)[];
  /**
   * WHICH LIFT's max these percentages refer to. Absent means this exercise's own.
   *
   * Load-bearing, and the reason it is not inferred: real programs prescribe "Front Squat 3 × 4 @ 45%
   * **of back squat max**" and "Close-Grip Bench, 100 reps @ 33% **of bench max**". A model that
   * assumed "percentage of this exercise's own max" would resolve 45% against a front-squat max the
   * athlete has never tested — putting a materially wrong weight on the bar, with full confidence.
   */
  percentOf?: string;
  /**
   * ══ CIRCUIT GROUPING ══
   *
   * Adjacent items sharing a `groupId` are ONE block — a warm-up circuit, a HIIT finisher, an AMRAP.
   * The array stays FLAT on purpose: every existing reader (`equipmentOf`, the log's planned line, the
   * builder's day rows) walks `[...warmup, ...main, ...cooldown]` and keeps working untouched, because
   * a circuit member is still an ordinary exercise. The grouping is a view, derived by adjacency.
   *
   * The metadata repeats on each member rather than living on the first. Redundant, and deliberately so:
   * an item that is dragged, copied or filtered out of its block still says what it belonged to, instead
   * of silently becoming a loose exercise or orphaning the rest of the round.
   */
  groupId?: string;
  /** "HIIT Finisher", "Warm up muscle group" — the block's name, not the exercise's. */
  groupName?: string;
  /**
   * WHICH KIND OF BLOCK — and therefore how the logger draws it.
   *
   * A SUPERSET is two to four lifts alternated set for set, resting only after the last of them; the
   * logger fuses them into one card with A/B rows. A CIRCUIT is the same grouping performed as rounds
   * with its own banner and (for an AMRAP) its own clock.
   *
   * ABSENT MEANS 'circuit', which is what every block authored before this was — so the shipped programs
   * and every AMRAP render exactly as they did. Nothing needed a migration because the whole prescription
   * lives in `programs.structure`, which is jsonb.
   */
  groupKind?: 'superset' | 'circuit';
  /** How many times through — the `⟳3` on the card. For a superset, the number of sets each lift gets. */
  groupRounds?: number;
  /**
   * An AMRAP's time cap in seconds ("8m" → 480). When set, `groupRounds` is not a prescription but a
   * ceiling nobody claims: you go as many rounds as you get, and the clock ends it.
   */
  groupCapSec?: number | null;
  /**
   * 'cardio' prescribes a run, walk or ride at any position in the day. Absent means 'strength', so
   * every program authored before this reads unchanged. The structure is jsonb, so these cost no
   * migration.
   *
   * `modality` is the AUTHOR'S DEFAULT, not a rule: the athlete can switch it on the day, because
   * nobody knows the weather when they write a training block.
   *
   * Every target is nullable and `null` is MEANINGFUL — it prescribes nothing, an open session. It must
   * survive persistence uncoerced: a 0 would read as a target that is permanently, absurdly met.
   */
  kind?: 'strength' | 'cardio';
  activity?: CardioActivity;
  modality?: 'outdoor' | 'indoor';
  targetMi?: number | null;
  targetPaceSec?: number | null;
  targetSpdMph?: number | null;
  /**
   * A cardio bout prescribed by DURATION — "Treadmill Run 15 min", "Easy Row 5 min".
   *
   * The commonest way a lifting program prescribes cardio, and the one target the model had no field
   * for: it held miles, pace and speed, so "row for 10 minutes" could only be stored as a distance the
   * author never wrote.
   */
  targetSec?: number | null;
};
export type ProgramDay = {
  letter: string;
  name: string;
  warmup: ProgramExercise[];
  main: ProgramExercise[];
  cooldown: ProgramExercise[];
};
export type ProgramWeekPlan = { days: ProgramDay[] };
export type ProgramStructure = {
  name: string;
  weeks: number;
  daysPerWeek: number;
  vary: boolean;
  days: ProgramDay[];
  weekPlans: ProgramWeekPlan[] | null;
};

export type SavedProgram = {
  id: string;
  name: string;
  structure: ProgramStructure;
  state: ProgramState;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  /** Set when this row was adopted from a built-in catalog program (0019). */
  sourceDefinitionId: string | null;
  /**
   * The maxes THIS RUN's percentages resolve against, frozen when the athlete answered the entry gate
   * (0111). `{}` means unanswered — a real state, in which every percentage renders as a bare
   * percentage rather than as a fabricated weight.
   *
   * Deliberately not the athlete's live figure: a PR in week 2 would otherwise raise every remaining
   * prescription and land the week-4 rehearsal somewhere the program never intended.
   */
  liftMaxes: LiftMaxes;
};

/**
 * `*`, not an explicit column list, on purpose: the lifecycle columns arrive in migration 0017, and
 * naming them explicitly would make every program read (including Home's) fail against a database that
 * hasn't been migrated yet. With `*`, a pre-0017 row simply comes back without them and `asState`
 * defaults it to 'future'.
 */
const SELECT = '*';

type ProgramRow = {
  id: string;
  name: string;
  structure: ProgramStructure;
  state: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  source_definition_id?: string | null;
  /** Absent until 0111 is applied; see `toProgram`. */
  lift_maxes?: unknown;
};

const asState = (v: string | null): ProgramState =>
  v === 'active' || v === 'graduated' || v === 'ended_early' ? v : 'future';

const toProgram = (r: ProgramRow): SavedProgram => ({
  id: r.id,
  name: r.name,
  structure: r.structure,
  state: asState(r.state),
  startedAt: r.started_at,
  endedAt: r.ended_at,
  createdAt: r.created_at,
  sourceDefinitionId: r.source_definition_id ?? null,
  // `?? {}` for the same reason `SELECT` is `*`: a row read from a database that has not had 0111
  // applied yet simply comes back without the column, and an unanswered gate is the correct reading.
  liftMaxes: (r.lift_maxes as LiftMaxes | null) ?? {},
});

/** Persist a user-authored program (owner RLS). Returns the new id. */
export async function createProgram(structure: ProgramStructure): Promise<{ id: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');
  const { data, error } = await supabase
    .from('programs')
    .insert({ athlete_id: user.id, name: structure.name, structure })
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id };
}

/**
 * Adopt a built-in catalog program: write it out as a real `programs` row so it can hold a lifecycle
 * and collect workouts.
 *
 * Idempotent for a LIVE copy — starting the same catalog program again resumes the row already in
 * flight rather than forking a second one with separate progress (0019's intent, now enforced by
 * `programs_one_live_per_source`).
 *
 * ══ IT MUST NOT RESUME A SEALED COPY, AND THE `.in(...)` IS WHY ══
 *
 * This used to match ANY row with the same source, in any state. Once a program could actually graduate
 * (0104) that meant adopting Strength Foundation I again handed back the GRADUATED row — a finished
 * record with a Start button on it, and no way ever to run the program a second time. Sealed copies
 * accumulate as permanent history (Amendment-001 §6); only a live one is the same run.
 *
 * `.limit(1)` is load-bearing too: 0104 lets sealed duplicates exist, and `.maybeSingle()` THROWS on
 * more than one row.
 */
export async function adoptCatalogProgram(
  sourceDefinitionId: string,
  structure: ProgramStructure,
): Promise<SavedProgram> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const { data: existing, error: fe } = await supabase
    .from('programs')
    .select(SELECT)
    .eq('athlete_id', user.id)
    .eq('source_definition_id', sourceDefinitionId)
    .in('state', ['future', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fe) throw fe;
  if (existing) return toProgram(existing as ProgramRow);

  const { data, error } = await supabase
    .from('programs')
    .insert({
      athlete_id: user.id,
      name: structure.name,
      structure,
      source_definition_id: sourceDefinitionId,
    })
    .select(SELECT)
    .single();
  if (error) throw error;
  return toProgram(data as ProgramRow);
}

/** Overwrite an existing program in place (the builder's edit mode). */
export async function updateProgram(id: string, structure: ProgramStructure): Promise<void> {
  const { error } = await supabase
    .from('programs')
    .update({ name: structure.name, structure, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** The athlete's authored programs, newest first. */
export async function fetchMyPrograms(): Promise<SavedProgram[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('programs')
    .select(SELECT)
    .eq('athlete_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => toProgram(r as ProgramRow));
}

/** One program by id, or null when it doesn't exist / isn't the athlete's. */
export async function fetchProgram(id: string): Promise<SavedProgram | null> {
  const { data, error } = await supabase.from('programs').select(SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toProgram(data as ProgramRow) : null;
}

/** The athlete's currently-active program, if any. */
export async function fetchActiveProgram(): Promise<SavedProgram | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('programs')
    .select(SELECT)
    .eq('athlete_id', user.id)
    .eq('state', 'active')
    .maybeSingle();
  if (error) throw error;
  return data ? toProgram(data as ProgramRow) : null;
}

/**
 * Start `id`, ending whatever was active. Atomic in the DB (0017) so the "one active program" rule
 * can't be broken by a race between two devices.
 *
 * RAISES on a graduated or ended program since 0104 — a sealed record is never reactivated
 * (Amendment-001 §1). Use `runProgramAgain` for that; it is a new program, not a rewind.
 */
export async function startProgram(id: string): Promise<void> {
  const { error } = await supabase.rpc('start_program', { p_program_id: id });
  if (error) throw error;
}

/**
 * Run a finished program again — W-3 §7.2 "Run This Program Again" / §14.6 "Restart Program", one path
 * behind two labels.
 *
 * A NEW Future row: same name, same structure, fresh progress, **and the same `source_definition_id`**.
 * The original is not touched, not linked to, and not readable from it (§7.2: "No visible link to the
 * original"). Keeping the source id is what lets `distinctProgramCount` (src/domain/rank/signals.ts)
 * read two graduations of one plan as two completions of one distinct plan — nulling it would hand out
 * a second "different program" credit for repeating yourself.
 */
export async function runProgramAgain(id: string): Promise<SavedProgram> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const src = await fetchProgram(id);
  if (!src) throw new Error('Program not found.');

  const { data, error } = await supabase
    .from('programs')
    .insert({
      athlete_id: user.id,
      name: src.name,
      structure: src.structure,
      source_definition_id: src.sourceDefinitionId,
    })
    .select(SELECT)
    .single();

  // 23505 = they already have a LIVE copy of this plan (planned it again before finishing this one).
  // Opening the one they have beats refusing: two live copies is the single thing the index exists to
  // prevent, and the athlete's intent — "I want to run this" — is already satisfied by that row.
  if (error) {
    if (error.code === '23505' && src.sourceDefinitionId) {
      const { data: live } = await supabase
        .from('programs')
        .select(SELECT)
        .eq('athlete_id', user.id)
        .eq('source_definition_id', src.sourceDefinitionId)
        .in('state', ['future', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (live) return toProgram(live as ProgramRow);
    }
    throw error;
  }
  return toProgram(data as ProgramRow);
}

/**
 * End an ACTIVE program early. Deliberately not parameterised over 'graduated': graduation is automatic
 * and server-side (Amendment-001 §4, and `save_workout` since 0104), so no client path may hand one out
 * — what a graduation buys is five permanent honors and a rank family.
 */
export async function endProgram(id: string, outcome: Extract<ProgramState, 'ended_early'>): Promise<void> {
  const { error } = await supabase
    .from('programs')
    .update({ state: outcome, ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Delete a planned program. The workouts logged against it survive (0018 uses `on delete set null`) —
 * removing a plan must never erase training the athlete actually did.
 *
 * A sealed program cannot be deleted at all: the RLS policy refuses it (0104) and W-3 hides the action.
 * Amendment-001 §6 — graduated and ended programs are permanent legacy records.
 */
export async function deleteProgram(id: string): Promise<void> {
  const { error } = await supabase.from('programs').delete().eq('id', id);
  if (error) throw error;
}

/**
 * How many sessions of this program are logged — the single number every progress read reduces to.
 * A HEAD count, so Home can pick the right next workout without pulling the whole log.
 * Returns 0 (rather than throwing) pre-0018, so Home keeps working on an un-migrated database.
 */
export async function fetchProgramCompletedCount(programId: string): Promise<number> {
  const { count, error } = await supabase
    .from('workouts')
    .select('id', { count: 'exact', head: true })
    .eq('program_id', programId)
    .eq('state', 'saved');
  if (error) return 0;
  return count ?? 0;
}

type WorkoutRow = {
  id: string;
  workout_name: string | null;
  started_at: string;
  duration_sec: number | null;
  workout_exercises:
    | {
        name: string;
        section: string;
        position: number;
        workout_sets: { set_index: number; weight: number | null; reps: number | null }[] | null;
      }[]
    | null;
};

/**
 * Every saved workout attributed to this program, oldest first, with exercises and sets — the raw
 * material for the progress count, "Your Log" and the stat tiles.
 */
export async function fetchProgramWorkouts(programId: string): Promise<LoggedWorkout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, workout_name, started_at, duration_sec, workout_exercises(name, section, position, workout_sets(set_index, weight, reps))')
    .eq('program_id', programId)
    .eq('state', 'saved')
    .order('started_at', { ascending: true });
  if (error) throw error;

  return ((data ?? []) as WorkoutRow[]).map((w) => ({
    id: w.id,
    name: w.workout_name ?? 'Workout',
    startedAt: w.started_at,
    durationSec: w.duration_sec,
    exercises: [...(w.workout_exercises ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((ex) => ({
        name: ex.name,
        section: ex.section,
        sets: [...(ex.workout_sets ?? [])]
          .sort((a, b) => a.set_index - b.set_index)
          .map((s) => ({ setIndex: s.set_index, weight: s.weight, reps: s.reps })),
      })),
  }));
}
