import { supabase } from '@/lib/supabase';
import type { ExportWorkout } from '@/domain/settings/export-core';
import type { ExportNutrition, ExportPlanItem } from '@/domain/settings/export-nutrition';

/**
 * Every workout the athlete has saved, with its exercises and sets — the read behind Export My Data
 * (P-9 §4). The shaping into a file is `domain/settings/export-core.ts`; this only fetches.
 *
 * ══ ⚠ COLUMN CHOICE IS A RELIABILITY DECISION HERE, NOT A PREFERENCE ══
 *
 * `activity-live.ts` records the rule this follows: *"Selecting a column that might not exist fails the
 * WHOLE query."* So this takes the `0001` spine (`set_index, weight, weight_unit, reps, notes`) plus
 * `0096`'s conditioning columns (`duration_sec, distance, distance_unit`) and stops there. `modality`
 * (0097), `floors` (0151) and `route`/`climb_m` (0162) are all real and all applied — and all omitted,
 * because the cost of being wrong is that an athlete's entire export fails rather than that it carries
 * one fewer column. An export is a trust feature; a partial one beats a broken one.
 *
 * ⚠ NO `limit()`. Every other history read in this app caps its rows because a screen renders them. This
 * is the one read where a cap would be a defect: an export that silently stopped at 200 workouts would
 * tell the athlete they had less training than they do, and they would have no way to notice.
 */

type SetRow = {
  set_index: number;
  weight: number | null;
  weight_unit: string | null;
  reps: number | null;
  notes: string | null;
  duration_sec: number | null;
  distance: number | null;
  distance_unit: string | null;
};

type Row = {
  id: string;
  workout_name: string | null;
  activity_type: string | null;
  started_at: string;
  duration_sec: number | null;
  distance: number | null;
  distance_unit: string | null;
  notes: string | null;
  workout_exercises:
    | { name: string; position: number | null; workout_sets: SetRow[] | null }[]
    | null;
};

export async function fetchExportWorkouts(): Promise<ExportWorkout[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const { data, error } = await supabase
    .from('workouts')
    .select(
      'id, workout_name, activity_type, started_at, duration_sec, distance, distance_unit, notes, ' +
        'workout_exercises(name, position, workout_sets(set_index, weight, weight_unit, reps, notes, duration_sec, distance, distance_unit))',
    )
    .eq('athlete_id', user.id)
    .eq('state', 'saved')
    /* Oldest first. A training log reads forward — and a spreadsheet opened at row 2 should start at the
       beginning of the story, not the end of it. */
    .order('started_at', { ascending: true });
  if (error) throw error;

  return ((data ?? []) as unknown as Row[]).map((w) => ({
    id: w.id,
    name: w.workout_name,
    activityType: w.activity_type,
    startedAt: w.started_at,
    durationSec: w.duration_sec,
    distance: w.distance,
    distanceUnit: w.distance_unit,
    notes: w.notes,
    exercises: (w.workout_exercises ?? [])
      /* PostgREST does not order embedded rows; without this the exercises come back in whatever order
         the planner produced, and an export whose exercises shuffle between two runs looks untrustworthy
         even when every number in it is right. */
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((ex) => ({
        name: ex.name,
        position: ex.position,
        sets: (ex.workout_sets ?? []).slice().sort((a, b) => a.set_index - b.set_index).map((s) => ({
          setIndex: s.set_index,
          weight: s.weight,
          weightUnit: s.weight_unit,
          reps: s.reps,
          durationSec: s.duration_sec,
          distance: s.distance,
          distanceUnit: s.distance_unit,
          notes: s.notes,
        })),
      })),
  }));
}

/**
 * Every row of the athlete's own nutrition data — the second read behind Export My Data.
 *
 * ⚠ THESE READS THROW, UNLIKE THE SCREEN READS IN `nutrition-live.ts`. Those return `[]` on an error so a
 * screen still draws; here an empty list would become a file that says "no food logged" when the truth
 * was "the read failed". The export fails whole instead, with the connection toast.
 *
 * An athlete outside the `0206` allowlist gets empty lists, not an error: every nutrition policy is
 * `athlete_id = auth.uid() and has_nutrition_access()`, which filters rows rather than refusing the query.
 * So their export stays the plain workout CSV.
 */
export async function fetchExportNutrition(): Promise<ExportNutrition> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');
  const me = user.id;

  const [entries, targets, foods, meals, recipes, weeks] = await Promise.all([
    readAll<Record<string, any>>((from, to) =>
      supabase
        .from('food_log_entries')
        .select('logged_on, meal, name, brand, serving_label, quantity, grams, kcal, protein, carb, fat, source, created_at, id')
        .eq('athlete_id', me)
        .order('logged_on', { ascending: true })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
    readAll<Record<string, any>>((from, to) =>
      supabase
        .from('nutrition_targets')
        .select('effective_from, method, kcal, protein_g, carb_g, fat_g, weight_lb, created_at, id')
        .eq('athlete_id', me)
        .order('effective_from', { ascending: true })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
    readAll<Record<string, any>>((from, to) =>
      supabase
        .from('user_foods')
        .select('id, name, brand, gtin, kcal_100, protein_100, carb_100, fat_100, servings')
        .eq('athlete_id', me)
        .order('name', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
    readAll<Record<string, any>>((from, to) =>
      supabase
        .from('saved_meals')
        .select('id, name, saved_meal_items(name, brand, serving_label, quantity, kcal, protein, carb, fat)')
        .eq('athlete_id', me)
        .order('name', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
    readAll<Record<string, any>>((from, to) =>
      supabase
        .from('user_recipes')
        .select('id, name, meal_types, minutes, yield, ingredients, allergens, confirmed, steps, use_plan, created_at')
        .eq('athlete_id', me)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    ),
    readAll<Record<string, any>>((from, to) =>
      supabase
        .from('meal_plan_weeks')
        .select('week_start, days, grocery')
        .eq('athlete_id', me)
        .order('week_start', { ascending: true })
        .range(from, to),
    ),
  ]);

  const num = (v: unknown) => Number(v ?? 0);
  const numOrNull = (v: unknown) => (v == null ? null : Number(v));

  return {
    entries: entries.map((r) => ({
      loggedOn: r.logged_on,
      meal: r.meal,
      name: r.name,
      brand: r.brand ?? null,
      servingLabel: r.serving_label ?? null,
      quantity: num(r.quantity),
      grams: numOrNull(r.grams),
      kcal: num(r.kcal),
      protein: num(r.protein),
      carb: num(r.carb),
      fat: num(r.fat),
      source: r.source,
    })),
    targets: targets.map((r) => ({
      effectiveFrom: r.effective_from,
      method: r.method,
      kcal: num(r.kcal),
      proteinG: num(r.protein_g),
      carbG: num(r.carb_g),
      fatG: num(r.fat_g),
      weightLb: numOrNull(r.weight_lb),
    })),
    foods: foods.map((r) => ({
      name: r.name,
      brand: r.brand ?? null,
      gtin: r.gtin ?? null,
      kcal100: numOrNull(r.kcal_100),
      protein100: numOrNull(r.protein_100),
      carb100: numOrNull(r.carb_100),
      fat100: numOrNull(r.fat_100),
      servings: Array.isArray(r.servings) ? r.servings : [],
    })),
    meals: meals.map((r) => ({
      name: r.name,
      items: ((r.saved_meal_items ?? []) as Record<string, any>[]).map((i) => ({
        name: i.name,
        brand: i.brand ?? null,
        servingLabel: i.serving_label ?? null,
        quantity: num(i.quantity),
        kcal: num(i.kcal),
        protein: num(i.protein),
        carb: num(i.carb),
        fat: num(i.fat),
      })),
    })),
    recipes: recipes.map((r) => ({
      id: `u:${r.id}`,
      name: r.name,
      mealTypes: r.meal_types ?? [],
      minutes: num(r.minutes),
      yield: num(r.yield),
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
      allergens: r.allergens ?? [],
      confirmed: Boolean(r.confirmed),
      steps: r.steps ?? [],
      usePlan: Boolean(r.use_plan),
    })),
    weeks: weeks.map((r) => {
      const g = (r.grocery ?? {}) as { extras?: { key: string; name: string }[]; checked?: Record<string, true> };
      return {
        weekStart: r.week_start,
        days: (Array.isArray(r.days) ? r.days : []) as { items: ExportPlanItem[] }[],
        groceryExtras: (g.extras ?? []).map((x) => ({ name: x.name, inCart: Boolean(g.checked?.[x.key]) })),
      };
    }),
  };
}

/**
 * Every row, a page at a time. PostgREST caps a response (1,000 rows by default), and a year of food
 * logging passes that. It stops on an EMPTY page, not a short one: a server configured with a lower cap
 * would make every page "short", and stopping there would silently truncate the export.
 */
async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  for (;;) {
    const { data, error } = await page(out.length, out.length + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    if (!rows.length) return out;
    out.push(...rows);
  }
}
