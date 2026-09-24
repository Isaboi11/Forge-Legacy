import type { LogEntry, MealSlot, Targets } from '@/domain/nutrition/day';
import { localToday } from '@/domain/nutrition/day';
import type { DayTotals } from '@/domain/nutrition/week';
import type { CatalogFood, PortionMacros, Serving } from '@/domain/nutrition/serving';
import { opsFor, overlayDay, type OutboxOp } from '@/domain/nutrition/outbox';
import { isFirstRun } from '@/domain/nutrition/first-run';
import type { SavedItemRow } from '@/domain/nutrition/my-foods';
import type { MealPlanPrefs } from '@/domain/nutrition/meal-plan-setup';
import type { GroceryState } from '@/domain/nutrition/grocery';
import { registerAll, type UserRecipe } from '@/domain/nutrition/user-recipes';
import { RECIPE_BY_ID, itemTotals, logKey, portionLabel, type Locks, type MealPlanWeek, type PlanDay } from '@/domain/nutrition/meal-planner';
import { isTransportFailure } from '@/domain/workout/pending-save';
import {
  heldItems,
  holdOp,
  readCache,
  readLastAthlete,
  retire,
  writeCache,
  writeLastAthlete,
} from '@/data/nutrition-outbox-live';
import { reportError } from '@/lib/diagnostics';
// The app's own id minter (Hermes has no `crypto.randomUUID` everywhere) — no new dependency.
import { uuid } from '@/lib/app-session';
import { supabase } from '@/lib/supabase';

/**
 * Nutrition data (0205) — the ONE read/write path for the food diary and its targets.
 *
 * ⚠ **THE DEVICE MINTS THE ID.** A food log is written in a kitchen on bad signal, so every write is an
 * upsert on a client-generated uuid: a retry can never double-log. (`pending-save.ts` has no such key and
 * needs `findCommittedWorkout` before every replay — this does not repeat that.)
 *
 * ⚠ **A WRITE WITH NO SIGNAL IS HELD, NOT LOST** (§12 Phase 1, "offline-safe log"). A write that fails
 * in transport goes to the outbox (`domain/nutrition/outbox.ts`), every day read overlays what is held,
 * and `drainFoodOutbox` replays it on the next foreground. While anything is held, NEW writes queue
 * behind it too — otherwise a delete made online could land before the offline add it was deleting, and
 * the drain would bring the food back.
 *
 * ⚠ **PRIVATE BY SCHEMA** (P6-A2-D1). Every query here is implicitly `athlete_id = auth.uid()` via RLS;
 * there is no visibility column to read, and nothing here is ever fetched for another athlete.
 *
 * Every read degrades to empty when the migration has not been pasted yet — the same rule the rest of
 * `src/data` follows, so the tab renders its empty state instead of an error on a stale database.
 */

export interface DayLog {
  entries: LogEntry[];
  targets: Targets | null;
}

interface EntryRow {
  id: string;
  meal: MealSlot;
  name: string;
  brand: string | null;
  serving_label: string | null;
  quantity: number;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  source: LogEntry['source'];
  source_key: string | null;
  grams: number | null;
  micros: Record<string, number> | null;
}

/** The columns every read of the diary asks for — one list, so no screen sees a narrower row. */
const ENTRY_COLUMNS =
  'id, meal, name, brand, serving_label, quantity, kcal, protein, carb, fat, source, source_key, grams, micros';

const toEntry = (r: EntryRow): LogEntry => ({
  id: r.id,
  meal: r.meal,
  name: r.name,
  brand: r.brand,
  servingLabel: r.serving_label,
  quantity: Number(r.quantity),
  kcal: Number(r.kcal),
  protein: Number(r.protein),
  carb: Number(r.carb),
  fat: Number(r.fat),
  source: r.source,
  sourceKey: r.source_key,
  grams: r.grams != null ? Number(r.grams) : null,
  micros: r.micros ?? null,
});

/**
 * Who is signed in, from the CACHED session. `getUser()` asks the server, so with no signal it answered
 * null and every write here silently did nothing — the exact moment the outbox exists for. RLS still
 * decides every row on the server; this id only scopes queries and tags held writes.
 *
 * ⚠ **AN HOUR OFFLINE EXPIRES THE ACCESS TOKEN**, and `getSession()` then tries a refresh, fails for want
 * of signal, and answers `session: null` WITH an error. That is not a sign-out, so the last athlete seen
 * signed in is used — only on a transport failure. A real sign-out answers null with NO error, and gets
 * null here: a queue must never be written in the name of someone who has left.
 */
async function athleteId(): Promise<string | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  const id = session?.user?.id ?? null;
  if (id) {
    if (id !== lastAthlete) {
      lastAthlete = id;
      void writeLastAthlete(id);
    }
    return id;
  }
  if (error && isTransportFailure(error)) return lastAthlete ?? (lastAthlete = await readLastAthlete());
  if (!error && lastAthlete) {
    lastAthlete = null;
    void writeLastAthlete(null);
  }
  return null;
}

let lastAthlete: string | null = null;

/** This athlete's held writes, oldest first. */
async function heldOps(id: string): Promise<OutboxOp[]> {
  return opsFor(await heldItems(), id);
}

/**
 * The offline half of a list read: on success remember it, on a transport failure answer with what was
 * remembered. Any other error stays the empty list it always was. This is what lets Log Food offer
 * recents, favourites, saved meals and your own foods with no signal — the foods a kitchen logs.
 */
async function remembered<T>(id: string, key: string, error: unknown, fresh: () => T, empty: T): Promise<T> {
  if (error) return isTransportFailure(error) ? ((await readCache<T>(id, key)) ?? empty) : empty;
  const value = fresh();
  void writeCache(id, key, value);
  return value;
}

/**
 * Send a write, or hold it. Held when (a) earlier writes are still held — so order is kept — or (b) this
 * one failed before the server ruled on it. A write the server REJECTED still throws, so a screen shows
 * the refusal instead of a success the drain can never make true.
 */
async function sendOrHold(id: string, op: OutboxOp): Promise<void> {
  if ((await heldOps(id)).length > 0 && (await holdOp(id, op))) {
    void drainFoodOutbox();
    return;
  }
  const error = await apply(id, op);
  if (!error) return;
  if (isTransportFailure(error) && (await holdOp(id, op))) return;
  throw error;
}

const entryRow = (athlete: string, iso: string, e: LogEntry) => ({
  id: e.id,
  athlete_id: athlete,
  logged_on: iso,
  meal: e.meal,
  source: e.source,
  source_key: e.sourceKey ?? null,
  name: e.name,
  brand: e.brand ?? null,
  serving_label: e.servingLabel ?? null,
  grams: e.grams ?? null,
  quantity: e.quantity,
  kcal: e.kcal,
  protein: e.protein,
  carb: e.carb,
  fat: e.fat,
  micros: e.micros ?? null,
});

/** One write against the server. Returns the error rather than throwing — the caller decides hold vs. surface. */
async function apply(athlete: string, op: OutboxOp): Promise<unknown> {
  switch (op.kind) {
    case 'add':
      return (
        await supabase
          .from('food_log_entries')
          .upsert(op.entries.map((e) => entryRow(athlete, op.iso, e)), { onConflict: 'id' })
      ).error;
    case 'remove':
      return (await supabase.from('food_log_entries').delete().eq('id', op.id)).error;
    case 'update':
      return (
        await supabase
          .from('food_log_entries')
          .update({
            quantity: op.patch.quantity,
            serving_label: op.patch.servingLabel,
            grams: op.patch.grams,
            kcal: op.patch.kcal,
            protein: op.patch.protein,
            carb: op.patch.carb,
            fat: op.patch.fat,
          })
          .eq('id', op.id)
      ).error;
    case 'move':
      return (
        await supabase.from('food_log_entries').update({ logged_on: op.iso, meal: op.meal }).eq('id', op.id)
      ).error;
  }
}

let draining = false;

/**
 * Replay held writes, oldest first. Fire-and-forget: mounted with the workout drain (foreground = the
 * proxy for "signal came back"), and kicked after any write that queued behind others.
 *
 * Stops at the first transport failure — still offline, try next foreground. An op the server REJECTS
 * is retired and reported: it will never succeed, and leaving it would block every write behind it.
 */
export async function drainFoodOutbox(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    const id = await athleteId();
    if (!id) return;
    for (;;) {
      const next = (await heldItems()).find((i) => i.athleteId === id);
      if (!next) return;
      const error = await apply(id, next.op);
      if (error && isTransportFailure(error)) return;
      if (error) reportError(error);
      await retire(next.key);
    }
  } catch (e) {
    reportError(e);
  } finally {
    draining = false;
  }
}

/** One day: its entries in the order they were logged, plus the target in force on that date. */
export async function fetchDay(iso: string): Promise<DayLog> {
  const id = await athleteId();
  if (!id) return { entries: [], targets: null };

  const [entries, targets, held] = await Promise.all([
    supabase
      .from('food_log_entries')
      .select(ENTRY_COLUMNS)
      .eq('athlete_id', id)
      .eq('logged_on', iso)
      .order('created_at', { ascending: true }),
    fetchTargetsOn(iso),
    heldOps(id),
  ]);

  /* No signal: the last read of this day, with what is held drawn on top — never an empty diary for a
     day the athlete can see they logged. */
  if (entries.error) {
    if (!isTransportFailure(entries.error)) return { entries: [], targets: null };
    const cached = await readCache<DayLog>(id, `day:${iso}`);
    return { entries: overlayDay(iso, cached?.entries ?? [], held), targets: cached?.targets ?? null };
  }

  const server: DayLog = { entries: ((entries.data ?? []) as EntryRow[]).map(toEntry), targets };
  void writeCache(id, `day:${iso}`, server);
  return { entries: overlayDay(iso, server.entries, held), targets };
}

export interface TargetHistoryRow {
  from: string;
  targets: Targets;
  /** What they weighed when it was written (0209). Null before the migration, or before any weigh-in. */
  weightLb: number | null;
}

/** Is `nutrition_targets.weight_lb` there yet (0209)? Latched per session, like `microsColumn`. */
let targetWeightColumn: boolean | null = null;

/**
 * Every day in a range, already summed — Nutrition Details reads a week with one query.
 *
 * ⚠ **A DAY WITH NO ROW IS ABSENT FROM THE RESULT, NOT A ZERO.** The caller fills the gaps and draws
 * them as unlogged; handing back `kcal: 0` here would make "ate nothing" and "logged nothing"
 * indistinguishable one layer too early to tell them apart again.
 */
export async function fetchRangeTotals(fromIso: string, toIso: string): Promise<DayTotals[]> {
  const id = await athleteId();
  if (!id) return [];

  const { data, error } = await supabase
    .from('food_log_entries')
    .select('logged_on, kcal, protein, carb, fat')
    .eq('athlete_id', id)
    .gte('logged_on', fromIso)
    .lte('logged_on', toIso);
  const cacheKey = `range:${fromIso}:${toIso}`;
  if (error) return isTransportFailure(error) ? ((await readCache<DayTotals[]>(id, cacheKey)) ?? []) : [];

  const byDay = new Map<string, DayTotals>();
  for (const r of (data ?? []) as Record<string, any>[]) {
    const iso = r.logged_on as string;
    const acc = byDay.get(iso) ?? { iso, kcal: 0, protein: 0, carb: 0, fat: 0, logged: true };
    acc.kcal += Number(r.kcal);
    acc.protein += Number(r.protein);
    acc.carb += Number(r.carb);
    acc.fat += Number(r.fat);
    byDay.set(iso, acc);
  }
  /* Rounded ONCE, at the end — the same rule `totals()` follows, so a week of twelve-food days
     does not drift a calorie per row. */
  const out = [...byDay.values()].map((d) => ({
    ...d,
    kcal: Math.round(d.kcal),
    protein: Math.round(d.protein),
    carb: Math.round(d.carb),
    fat: Math.round(d.fat),
  }));
  void writeCache(id, cacheKey, out);
  return out;
}

/**
 * Every target ever set at or before a date, newest last.
 *
 * One query instead of seven: the week resolves each day's target from this list (`targetOn`), which is
 * what keeps an old day readable against what was true THEN rather than against today's number.
 */
export async function fetchTargetHistory(uptoIso: string): Promise<TargetHistoryRow[]> {
  const id = await athleteId();
  if (!id) return [];

  const columns = 'effective_from, kcal, protein_g, carb_g, fat_g';
  const read = (withWeight: boolean) =>
    supabase
      .from('nutrition_targets')
      .select(withWeight ? `${columns}, weight_lb` : columns)
      .eq('athlete_id', id)
      .lte('effective_from', uptoIso)
      .order('effective_from', { ascending: true });

  let { data, error } = await read(targetWeightColumn !== false);
  if (error && targetWeightColumn !== false && isMissingColumn(error)) {
    targetWeightColumn = false;
    ({ data, error } = await read(false));
  } else if (!error && targetWeightColumn == null) {
    targetWeightColumn = true;
  }
  if (error) return [];

  return ((data ?? []) as Record<string, any>[]).map((r) => ({
    from: r.effective_from as string,
    targets: { kcal: Number(r.kcal), protein: Number(r.protein_g), carb: Number(r.carb_g), fat: Number(r.fat_g) },
    weightLb: r.weight_lb != null ? Number(r.weight_lb) : null,
  }));
}

/**
 * The target in force on a date — the newest row at or before it (0205 §4). A target set today does not
 * rewrite last week, which is what makes an old day still readable against what was true then.
 */
export async function fetchTargetsOn(iso: string): Promise<Targets | null> {
  const id = await athleteId();
  if (!id) return null;
  const { data, error } = await supabase
    .from('nutrition_targets')
    .select('kcal, protein_g, carb_g, fat_g')
    .eq('athlete_id', id)
    .lte('effective_from', iso)
    .order('effective_from', { ascending: false })
    .limit(1);
  if (error || !data?.length) return null;
  const t = data[0] as { kcal: number; protein_g: number; carb_g: number; fat_g: number };
  return { kcal: t.kcal, protein: t.protein_g, carb: t.carb_g, fat: t.fat_g };
}

export interface NewEntry {
  meal: MealSlot;
  source: 'usda' | 'off' | 'fs' | 'custom' | 'quick';
  sourceKey?: string | null;
  name: string;
  brand?: string | null;
  servingLabel?: string | null;
  quantity: number;
  macros: PortionMacros;
  /**
   * The food's per-100 g micronutrients, snapshotted like the macros beside them (0205 `micros jsonb`).
   *
   * ⚠ **PER 100 g, AND ONLY FROM A SOURCE ALLOWED TO KEEP THEM** (`MAY_STORE_MICROS`, §4 — FatSecret's
   * written permission covers calories and macros only). The row keeps `grams` too, so Meal Detail can
   * scale these without re-reading a catalogue that may have moved under it.
   */
  micros?: Record<string, number> | null;
}

/**
 * Write food to a day. Returns the rows as they will appear, so a caller can show them before the server
 * answers. `id` is minted here — resending the same batch is a no-op, not a duplicate.
 */
export async function addEntries(iso: string, entries: NewEntry[]): Promise<LogEntry[]> {
  const id = await athleteId();
  if (!id || !entries.length) return [];

  const logged: LogEntry[] = entries.map((e) => ({
    id: uuid(),
    meal: e.meal,
    source: e.source,
    sourceKey: e.sourceKey ?? null,
    name: e.name,
    brand: e.brand ?? null,
    servingLabel: e.servingLabel ?? null,
    grams: e.macros.grams,
    quantity: e.quantity,
    kcal: e.macros.kcal,
    protein: e.macros.protein,
    carb: e.macros.carb,
    fat: e.macros.fat,
    micros: e.micros ?? null,
  }));

  await sendOrHold(id, { kind: 'add', iso, entries: logged });
  return logged;
}

export async function removeEntry(entryId: string): Promise<void> {
  const id = await athleteId();
  if (!id) return;
  await sendOrHold(id, { kind: 'remove', id: entryId });
}

/** Change a logged portion — Food Detail reopened on an existing row. */
export async function updateEntry(
  entryId: string,
  patch: { quantity: number; servingLabel: string | null; macros: PortionMacros },
): Promise<void> {
  const id = await athleteId();
  if (!id) return;
  await sendOrHold(id, {
    kind: 'update',
    id: entryId,
    patch: {
      quantity: patch.quantity,
      servingLabel: patch.servingLabel,
      grams: patch.macros.grams,
      kcal: patch.macros.kcal,
      protein: patch.macros.protein,
      carb: patch.macros.carb,
      fat: patch.macros.fat,
    },
  });
}

/**
 * Copy one meal onto another day, and optionally into another slot — Meal Detail's "Copy to another day
 * or meal". It copies the stored SNAPSHOTS, so a food whose source has since changed still copies as it
 * was eaten, and `addEntries` mints fresh ids so the original is untouched.
 */
export async function copyMealTo(
  from: { iso: string; meal: MealSlot },
  to: { iso: string; meal: MealSlot },
): Promise<LogEntry[]> {
  /* Read through `fetchDay`, not a query of its own: offline it answers from the cache plus what is
     held, so "copy yesterday's breakfast" works in the same kitchen with no signal. */
  const { entries } = await fetchDay(from.iso);
  const source = entries.filter((e) => e.meal === from.meal);
  if (!source.length) return [];

  return addEntries(
    to.iso,
    source.map((e) => ({
      meal: to.meal,
      source: e.source,
      sourceKey: e.sourceKey ?? null,
      name: e.name,
      brand: e.brand ?? null,
      servingLabel: e.servingLabel ?? null,
      quantity: e.quantity,
      micros: e.micros ?? null,
      macros: { kcal: e.kcal, protein: e.protein, carb: e.carb, fat: e.fat, grams: e.grams ?? null },
    })),
  );
}

/**
 * The `.dc`'s "Copy yesterday" on an empty card — the same meal, a different day. One line on top of
 * `copyMealTo` rather than a second copy of the mapping: two implementations of "copy a meal" is how
 * one of them quietly stops carrying a column the other learned about.
 */
export async function copyMealFrom(fromIso: string, toIso: string, meal: MealSlot): Promise<LogEntry[]> {
  return copyMealTo({ iso: fromIso, meal }, { iso: toIso, meal });
}

/**
 * Move one logged food to another day and/or meal. It re-files the row rather than deleting and
 * re-inserting it, so the id an offline client already minted stays the id — a replayed write after a
 * move is still the same row, not a second helping.
 */
export async function moveEntry(
  entryId: string,
  to: { iso: string; meal: MealSlot },
  /** The row as shown, so a move held offline can still be drawn on a destination day never fetched here. */
  entry: LogEntry | null = null,
): Promise<void> {
  const id = await athleteId();
  if (!id) return;
  await sendOrHold(id, { kind: 'move', id: entryId, iso: to.iso, meal: to.meal, entry });
}

/** Empty one meal of one day. Owner-scoped by RLS; the explicit day and slot keep it to what was asked. */
export async function clearMeal(iso: string, meal: MealSlot): Promise<void> {
  const id = await athleteId();
  if (!id) return;
  /* One remove per row the athlete can see — never a (day, meal) filter, which replayed late would also
     delete food logged into this meal after the clear (see `domain/nutrition/outbox.ts`). */
  const { entries } = await fetchDay(iso);
  for (const e of entries) if (e.meal === meal) await sendOrHold(id, { kind: 'remove', id: e.id });
}

/**
 * Is there food logged on a day after this one? Nutrition Home's ⟩ is otherwise closed at today
 * (`canGoForward`), which was correct until Meal Detail could copy a meal FORWARD — meal prep writes a
 * real row on a real day, and a day you cannot reach is a day the athlete cannot fix.
 */
export async function hasFoodAfter(iso: string): Promise<boolean> {
  const id = await athleteId();
  if (!id) return false;
  const { data, error } = await supabase
    .from('food_log_entries')
    .select('id')
    .eq('athlete_id', id)
    .gt('logged_on', iso)
    .limit(1);
  if (error) return false;
  return !!data?.length;
}

/**
 * Should the tab open on Nutrition First Run? The rule is `isFirstRun` (tested); this only gathers its
 * signals. No athlete answers false — the welcome is never a guess.
 */
export async function isNutritionFirstRun(): Promise<boolean> {
  const id = await athleteId();
  if (!id) return false;
  const [startedBefore, held, entries, targets] = await Promise.all([
    readCache<boolean>(id, 'started'),
    heldOps(id),
    supabase.from('food_log_entries').select('id').eq('athlete_id', id).limit(1),
    supabase.from('nutrition_targets').select('athlete_id').eq('athlete_id', id).limit(1),
  ]);
  const anyEntry = entries.error ? null : !!entries.data?.length;
  const anyTarget = targets.error ? null : !!targets.data?.length;
  if (anyEntry || anyTarget) void writeCache(id, 'started', true);
  return isFirstRun({ startedBefore: !!startedBefore, heldWrites: held.length, anyEntry, anyTarget });
}

/** Which meal "Copy yesterday" would fill — null when yesterday's slot was empty too. */
export async function mealHasFood(iso: string, meal: MealSlot): Promise<boolean> {
  const id = await athleteId();
  if (!id) return false;
  const { data } = await supabase
    .from('food_log_entries')
    .select('id')
    .eq('athlete_id', id)
    .eq('logged_on', iso)
    .eq('meal', meal)
    .limit(1);
  return Boolean(data?.length);
}

export interface RecentFood {
  key: string;
  source: 'usda' | 'off' | 'fs' | 'custom';
  name: string;
  brand: string | null;
  servingLabel: string | null;
  quantity: number;
  kcal: number;
}

/**
 * Recent foods, most recent first and one row per food. Quick Adds are excluded — they have no food
 * behind them, so there is nothing to log again.
 */
export async function fetchRecentFoods(limit = 30): Promise<RecentFood[]> {
  const id = await athleteId();
  if (!id) return [];
  const { data, error } = await supabase
    .from('food_log_entries')
    .select('source, source_key, name, brand, serving_label, quantity, kcal, created_at')
    .eq('athlete_id', id)
    .not('source_key', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit * 4);
  if (error) return remembered<RecentFood[]>(id, `recents:${limit}`, error, () => [], []);

  /* A custom food the athlete deleted in My Foods & Meals must not come back through Recent. Only asked
     when a custom row is there to check; a failed read keeps them all rather than hiding real foods. */
  const rows = (data ?? []) as Record<string, any>[];
  let liveCustom: Set<string> | null = null;
  if (rows.some((r) => r.source === 'custom')) {
    const mine = await supabase.from('user_foods').select('id').eq('athlete_id', id);
    if (!mine.error) liveCustom = new Set(((mine.data ?? []) as { id: string }[]).map((r) => r.id));
  }

  const seen = new Set<string>();
  const out: RecentFood[] = [];
  for (const r of rows) {
    if (seen.has(r.source_key)) continue;
    if (liveCustom && r.source === 'custom' && !liveCustom.has(r.source_key)) continue;
    seen.add(r.source_key);
    out.push({
      key: r.source_key,
      source: r.source,
      name: r.name,
      brand: r.brand,
      servingLabel: r.serving_label,
      quantity: Number(r.quantity),
      kcal: Number(r.kcal),
    });
    if (out.length >= limit) break;
  }
  return remembered(id, `recents:${limit}`, null, () => out, []);
}

/**
 * Search outside Forge. Everything vendor-shaped lives in the `food-search` Edge Function (USDA, Open
 * Food Facts, FatSecret when its keys exist) — the app never learns which source answered beyond the
 * badge and the attribution line it must show.
 */
export async function searchFoods(q: string): Promise<CatalogFood[]> {
  if (q.trim().length < 2) return [];
  const { data, error } = await supabase.functions.invoke('food-search', { body: { q: q.trim() } });
  if (error) return [];
  return normaliseFoods(data);
}

/** Barcode lookup. An empty list means "not found", which is the Create Food path, not an error. */
export async function lookupBarcode(barcode: string): Promise<CatalogFood[]> {
  const { data, error } = await supabase.functions.invoke('food-search', { body: { barcode } });
  if (error) return [];
  return normaliseFoods(data);
}

function normaliseFoods(data: unknown): CatalogFood[] {
  const foods = (data as { foods?: Record<string, any>[] })?.foods ?? [];
  return foods.map((f) => ({
    key: f.key,
    source: f.source,
    name: f.name,
    brand: f.brand ?? null,
    kcal100: f.kcal100 ?? null,
    protein100: f.protein100 ?? null,
    carb100: f.carb100 ?? null,
    fat100: f.fat100 ?? null,
    servings: (f.servings ?? []) as Serving[],
    micros: f.micros ?? null,
    attribution: f.attribution ?? null,
  }));
}

/**
 * One food, by the key a diary row or a search result carries — what Food Detail opens on.
 *
 * Looks in the catalogue first (every searched or scanned food is cached there by `food-search`), then in
 * the athlete's own foods. Returns null when neither has it, which is the "this food is gone" case the
 * screen shows rather than a half-drawn page of zeros.
 *
 * ⚠ **A `fs:` KEY IS NOT IN THE CATALOGUE FOR LONG.** FatSecret's terms let us keep a logged food's
 * calories and macros in the athlete's own diary, but not in `food_catalog`, which every athlete reads —
 * those rows are purged after 24 hours. Reading the table directly would therefore show "this food is
 * gone" for a meal logged last week, so `fs:` goes through the Edge Function, which re-reads it from
 * FatSecret. The diary's own numbers are snapshotted at log time and never depend on this.
 */
export async function fetchFoodByKey(key: string): Promise<CatalogFood | null> {
  if (!key) return null;

  if (key.startsWith('fs:')) {
    const { data, error } = await supabase.functions.invoke('food-search', { body: { key } });
    if (error) return null;
    return normaliseFoods(data)[0] ?? null;
  }

  if (key.includes(':')) {
    const { data } = await supabase
      .from('food_catalog')
      .select('key, source, name, brand, kcal_100, protein_100, carb_100, fat_100, servings, micros')
      .eq('key', key)
      .maybeSingle();
    if (data) {
      const r = data as Record<string, any>;
      return {
        key: r.key,
        source: r.source,
        name: r.name,
        brand: r.brand,
        kcal100: r.kcal_100,
        protein100: r.protein_100,
        carb100: r.carb_100,
        fat100: r.fat_100,
        servings: (r.servings ?? []) as Serving[],
        micros: r.micros ?? null,
        attribution:
          r.source === 'off' ? 'Data from Open Food Facts (ODbL)' : r.source === 'fs' ? 'Powered by fatsecret' : null,
      };
    }
    return null;
  }

  const mine = await fetchMyFoods();
  return mine.find((f) => f.key === key) ?? null;
}

/**
 * Is `micros` on `user_foods` / `saved_meal_items` yet (0207)?
 *
 * ⚠ **A MISSING COLUMN IS A REQUEST-TIME ERROR, NOT AN EMPTY RESULT.** PostgREST answers `42703` /
 * `PGRST204` for a column its schema cache has never seen, which fails the WHOLE statement — so a
 * select or an insert naming `micros` before the paste lands takes Create Food down entirely rather
 * than degrading. This latches the answer per session so the fallback costs one failed call, not one
 * per read, and resolves itself the moment the migration is applied and the app is reopened.
 */
let microsColumn: boolean | null = null;
const isMissingColumn = (e: unknown): boolean => {
  const o = e as { code?: string; message?: string } | null;
  const code = o?.code ?? '';
  return code === '42703' || code === 'PGRST204' || /column .* does not exist|could not find the '?micros/i.test(o?.message ?? '');
};

const USER_FOOD_COLUMNS = 'id, name, brand, kcal_100, protein_100, carb_100, fat_100, servings';

/** The athlete's own foods, which search always ranks first. */
export async function fetchMyFoods(): Promise<CatalogFood[]> {
  const id = await athleteId();
  if (!id) return [];

  const read = (withMicros: boolean) =>
    supabase
      .from('user_foods')
      .select(withMicros ? `${USER_FOOD_COLUMNS}, micros` : USER_FOOD_COLUMNS)
      .eq('athlete_id', id)
      .order('name');

  let { data, error } = await read(microsColumn !== false);
  if (error && microsColumn !== false && isMissingColumn(error)) {
    microsColumn = false;
    ({ data, error } = await read(false));
  } else if (!error && microsColumn == null) {
    microsColumn = true;
  }

  return remembered<CatalogFood[]>(id, 'myFoods', error, () => ((data ?? []) as Record<string, any>[]).map((r) => ({
    key: r.id,
    source: 'custom' as const,
    name: r.name,
    brand: r.brand,
    kcal100: r.kcal_100,
    protein100: r.protein_100,
    carb100: r.carb_100,
    fat100: r.fat_100,
    servings: (r.servings ?? []) as Serving[],
    micros: r.micros ?? null,
    attribution: null,
  })), []);
}

export interface FavoriteFood {
  key: string;
  name: string;
  brand: string | null;
}

/** Favourites are pointers (`food_catalog.key` or a `user_foods.id`), never copies of the numbers. */
export async function fetchFavorites(): Promise<FavoriteFood[]> {
  const id = await athleteId();
  if (!id) return [];
  const { data, error } = await supabase
    .from('food_favorites')
    .select('food_key, name, brand')
    .eq('athlete_id', id)
    .order('created_at', { ascending: false });
  return remembered<FavoriteFood[]>(
    id,
    'favorites',
    error,
    () => ((data ?? []) as Record<string, any>[]).map((r) => ({ key: r.food_key, name: r.name, brand: r.brand })),
    [],
  );
}

export async function setFavorite(food: { key: string; name: string; brand?: string | null }, on: boolean): Promise<void> {
  const id = await athleteId();
  if (!id) return;
  if (on) {
    await supabase
      .from('food_favorites')
      .upsert({ athlete_id: id, food_key: food.key, name: food.name, brand: food.brand ?? null }, { onConflict: 'athlete_id,food_key' });
  } else {
    await supabase.from('food_favorites').delete().eq('athlete_id', id).eq('food_key', food.key);
  }
}

export interface SavedMeal {
  id: string;
  name: string;
  kcal: number;
  itemCount: number;
  /** Each food's name, for My Foods & Meals' row line. */
  itemNames: string[];
  createdAt: string;
}

export async function fetchSavedMeals(): Promise<SavedMeal[]> {
  const id = await athleteId();
  if (!id) return [];
  const { data, error } = await supabase
    .from('saved_meals')
    .select('id, name, created_at, saved_meal_items(kcal, name)')
    .eq('athlete_id', id)
    .order('name');
  return remembered<SavedMeal[]>(
    id,
    'savedMeals',
    error,
    () =>
      ((data ?? []) as Record<string, any>[]).map((r) => {
        const items = (r.saved_meal_items ?? []) as { kcal: number; name: string }[];
        return {
          id: r.id,
          name: r.name,
          kcal: Math.round(items.reduce((sum, i) => sum + Number(i.kcal), 0)),
          itemCount: items.length,
          itemNames: items.map((i) => i.name),
          createdAt: r.created_at ?? '',
        };
      }),
    [],
  );
}

/** A saved meal's foods as the table holds them — what logging it writes, and what its editor opens on. */
async function readSavedMealItems(id: string, mealId: string): Promise<Record<string, any>[]> {
  const columns = 'source, source_key, name, brand, serving_label, grams, quantity, kcal, protein, carb, fat';
  const read = (withMicros: boolean) =>
    supabase
      .from('saved_meal_items')
      .select(withMicros ? `${columns}, micros` : columns)
      .eq('meal_id', mealId);

  let { data, error } = await read(microsColumn !== false);
  if (error && microsColumn !== false && isMissingColumn(error)) {
    microsColumn = false;
    ({ data, error } = await read(false));
  }
  return remembered<Record<string, any>[]>(id, `savedMeal:${mealId}`, error, () => (data ?? []) as Record<string, any>[], []);
}

/** Logging a saved meal writes every one of its foods into the day, in one tap. */
export async function logSavedMeal(mealId: string, iso: string, meal: MealSlot): Promise<LogEntry[]> {
  const id = await athleteId();
  if (!id) return [];
  const items = await readSavedMealItems(id, mealId);
  if (!items.length) return [];

  return addEntries(
    iso,
    items.map((r) => ({
      meal,
      source: r.source,
      sourceKey: r.source_key,
      name: r.name,
      brand: r.brand,
      servingLabel: r.serving_label,
      quantity: Number(r.quantity),
      micros: r.micros ?? null,
      macros: {
        kcal: Number(r.kcal),
        protein: Number(r.protein),
        carb: Number(r.carb),
        fat: Number(r.fat),
        grams: r.grams != null ? Number(r.grams) : null,
      },
    })),
  );
}

/** Save a day's meal as a reusable one — "Usual Breakfast" from what is already logged. */
export async function saveMealFromDay(name: string, iso: string, meal: MealSlot): Promise<void> {
  const id = await athleteId();
  if (!id) return;
  /* Through `fetchDay`, so a meal logged offline and not yet drained is saved whole. The insert below
     still needs signal — and throws without it, rather than the old silent "saved" on an empty read. */
  const rows = (await fetchDay(iso)).entries
    .filter((e) => e.meal === meal)
    .map((e) => ({
      source: e.source,
      source_key: e.sourceKey ?? null,
      name: e.name,
      brand: e.brand ?? null,
      serving_label: e.servingLabel ?? null,
      grams: e.grams ?? null,
      quantity: e.quantity,
      kcal: e.kcal,
      protein: e.protein,
      carb: e.carb,
      fat: e.fat,
      micros: e.micros ?? null,
    }));
  if (!rows.length) return;

  const { data: created, error } = await supabase
    .from('saved_meals')
    .insert({ athlete_id: id, name })
    .select('id')
    .single();
  if (error || !created) throw error;

  /* ⚠ The micronutrients ride along (0207), or the saved meal comes back SHORTER than the plate it was
     saved from — and `mealBreakdown` then drops a nutrient for the whole meal because one row cannot
     account for it. Falls back to the macro-only insert while the migration is unpasted. */
  const item = (r: Record<string, any>, withMicros: boolean) => ({
    meal_id: (created as { id: string }).id,
    source: r.source,
    source_key: r.source_key,
    name: r.name,
    brand: r.brand,
    serving_label: r.serving_label,
    grams: r.grams,
    quantity: r.quantity,
    kcal: r.kcal,
    protein: r.protein,
    carb: r.carb,
    fat: r.fat,
    ...(withMicros ? { micros: r.micros ?? null } : {}),
  });

  const list = rows as Record<string, any>[];
  const wanted = microsColumn !== false;
  let { error: itemsError } = await supabase.from('saved_meal_items').insert(list.map((r) => item(r, wanted)));
  if (itemsError && wanted && isMissingColumn(itemsError)) {
    microsColumn = false;
    ({ error: itemsError } = await supabase.from('saved_meal_items').insert(list.map((r) => item(r, false))));
  }
  if (itemsError) throw itemsError;
}

/** One saved meal's foods, for the editor in My Foods & Meals. */
export async function fetchSavedMealItems(mealId: string): Promise<SavedItemRow[]> {
  const id = await athleteId();
  if (!id) return [];
  return (await readSavedMealItems(id, mealId)) as SavedItemRow[];
}

/**
 * Create or rewrite a saved meal from the editor.
 *
 * ⚠ **NEW ITEMS GO IN BEFORE OLD ONES COME OUT.** There is no transaction from the client, so a rewrite
 * that deleted first and then failed to insert would leave the athlete's "Usual breakfast" EMPTY. This
 * order can only fail toward a meal that briefly holds both lists, and the retry cleans that up.
 *
 * Days already logged are untouched: a diary row is a snapshot, not a pointer to the meal.
 */
export async function saveSavedMeal(mealId: string | null, name: string, rows: SavedItemRow[]): Promise<string> {
  const id = await athleteId();
  if (!id) throw new Error('Sign in to save a meal');

  let target = mealId;
  if (target) {
    const { error } = await supabase.from('saved_meals').update({ name }).eq('id', target).eq('athlete_id', id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from('saved_meals').insert({ athlete_id: id, name }).select('id').single();
    if (error || !data) throw error ?? new Error('The meal was not saved');
    target = (data as { id: string }).id;
  }

  const item = (r: SavedItemRow, withMicros: boolean) => {
    const { micros, ...rest } = r;
    return { meal_id: target, ...rest, ...(withMicros ? { micros: micros ?? null } : {}) };
  };
  const wanted = microsColumn !== false;
  let { data: added, error: insertError } = await supabase.from('saved_meal_items').insert(rows.map((r) => item(r, wanted))).select('id');
  if (insertError && wanted && isMissingColumn(insertError)) {
    microsColumn = false;
    ({ data: added, error: insertError } = await supabase.from('saved_meal_items').insert(rows.map((r) => item(r, false))).select('id'));
  }
  if (insertError) throw insertError;

  if (mealId) {
    const keep = ((added ?? []) as { id: string }[]).map((r) => r.id);
    let del = supabase.from('saved_meal_items').delete().eq('meal_id', mealId);
    if (keep.length) del = del.not('id', 'in', `(${keep.join(',')})`);
    const { error } = await del;
    if (error) throw error;
  }
  return target as string;
}

/** Items cascade with the meal (0205). Days that logged it keep their rows. */
export async function deleteSavedMeal(mealId: string): Promise<void> {
  const id = await athleteId();
  if (!id) return;
  const { error } = await supabase.from('saved_meals').delete().eq('id', mealId).eq('athlete_id', id);
  if (error) throw error;
}

/**
 * Delete one of the athlete's own foods. It leaves search, My Foods and Favourites (a favourite is a
 * pointer, and a pointer to nothing opens "this food is gone"). Diary rows and saved-meal items that
 * used it are snapshots and keep their numbers.
 */
export async function deleteUserFood(foodId: string): Promise<void> {
  const id = await athleteId();
  if (!id) return;
  const { error } = await supabase.from('user_foods').delete().eq('id', foodId).eq('athlete_id', id);
  if (error) throw error;
  await supabase.from('food_favorites').delete().eq('athlete_id', id).eq('food_key', foodId);
}

export interface UserFoodInput {
  name: string;
  brand?: string | null;
  kcal100: number;
  protein100: number;
  carb100: number;
  fat100: number;
  servings: Serving[];
  /** Per 100 g, from the label (0207). Omitted keys are nutrients the label did not state. */
  micros?: Record<string, number> | null;
}

const userFoodRow = (food: UserFoodInput) => ({
  name: food.name,
  brand: food.brand ?? null,
  kcal_100: food.kcal100,
  protein_100: food.protein100,
  carb_100: food.carb100,
  fat_100: food.fat100,
  servings: food.servings,
});

const asCatalogFood = (key: string, food: UserFoodInput): CatalogFood => ({
  key,
  source: 'custom',
  name: food.name,
  brand: food.brand ?? null,
  kcal100: food.kcal100,
  protein100: food.protein100,
  carb100: food.carb100,
  fat100: food.fat100,
  servings: food.servings,
  micros: food.micros ?? null,
  attribution: null,
});

/**
 * A food the athlete typed in themselves — Create Food, and the fallback when a barcode is unknown.
 *
 * ⚠ **THE FOOD IS CREATED EVEN IF `0207` HAS NOT BEEN PASTED.** A write naming a column PostgREST has
 * never seen fails the whole insert, so a new client against an old database would refuse to create
 * ANY food rather than lose the extra nutrients. It retries without them instead: the label's macros
 * are what the athlete came for, and the micronutrients are the part that can wait.
 */
export async function createUserFood(food: UserFoodInput): Promise<CatalogFood | null> {
  const id = await athleteId();
  if (!id) return null;

  const insert = (withMicros: boolean) =>
    supabase
      .from('user_foods')
      .insert(
        withMicros
          ? { athlete_id: id, ...userFoodRow(food), micros: food.micros ?? null }
          : { athlete_id: id, ...userFoodRow(food) },
      )
      .select('id')
      .single();

  const wanted = microsColumn !== false && food.micros != null;
  let { data, error } = await insert(wanted);
  if (error && wanted && isMissingColumn(error)) {
    microsColumn = false;
    ({ data, error } = await insert(false));
  }
  if (error || !data) throw error;

  return asCatalogFood((data as { id: string }).id, food);
}

/** Edit a food the athlete already made. Same column fallback, same reasoning. */
export async function updateUserFood(foodId: string, food: UserFoodInput): Promise<CatalogFood | null> {
  const id = await athleteId();
  if (!id) return null;

  const write = (withMicros: boolean) =>
    supabase
      .from('user_foods')
      .update(withMicros ? { ...userFoodRow(food), micros: food.micros ?? null } : userFoodRow(food))
      .eq('id', foodId)
      .eq('athlete_id', id);

  const wanted = microsColumn !== false;
  let { error } = await write(wanted);
  if (error && wanted && isMissingColumn(error)) {
    microsColumn = false;
    ({ error } = await write(false));
  }
  if (error) throw error;

  return asCatalogFood(foodId, food);
}

/**
 * The three facts a recommended target needs, which `0205` §5 added to `profiles` and NOTHING has ever
 * written — they were put there for this screen.
 *
 * ⚠ **`null` MEANS NEVER ASKED, AND IS NOT A DEFAULT TO FILL IN.** Onboarding does not collect these
 * (Onboarding-Amendment-007 shipped without them), so every existing athlete reads null here and is
 * asked once, on the screen that needs them. A helpful backfill would be indistinguishable from an
 * answer and would feed the equation numbers nobody gave it.
 */
export interface NutritionProfile {
  birthYear: number | null;
  heightIn: number | null;
  activityLevel: string | null;
}

export async function fetchNutritionProfile(): Promise<NutritionProfile> {
  const id = await athleteId();
  if (!id) return { birthYear: null, heightIn: null, activityLevel: null };
  const { data, error } = await supabase
    .from('profiles')
    .select('birth_year, height_in, activity_level')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return { birthYear: null, heightIn: null, activityLevel: null };
  const r = data as Record<string, any>;
  return {
    birthYear: r.birth_year != null ? Number(r.birth_year) : null,
    heightIn: r.height_in != null ? Number(r.height_in) : null,
    activityLevel: r.activity_level ?? null,
  };
}

/** Saved alongside the target, because the athlete supplied them in order to get one. */
export async function saveNutritionProfile(profile: NutritionProfile): Promise<void> {
  const id = await athleteId();
  if (!id) return;
  const { error } = await supabase
    .from('profiles')
    .update({
      birth_year: profile.birthYear,
      height_in: profile.heightIn,
      activity_level: profile.activityLevel,
    })
    .eq('id', id);
  if (error) throw error;
}

/** Targets are history rows: setting one writes today's row, it never edits an older one (NUT-D5). */
export async function saveTargets(
  t: Targets,
  method: 'manual' | 'recommended' = 'manual',
  /**
   * What the athlete weighs right now (0209) — a SNAPSHOT, so the review prompt can later say what
   * changed. Omitted when they have never logged a weigh-in, and null then means "no comparison to
   * draw", never "0 lb".
   */
  weightLb?: number | null,
): Promise<void> {
  const id = await athleteId();
  if (!id) return;
  const today = localToday();
  /* One type with an OPTIONAL `weight_lb`, rather than two shapes — a union of payloads trips the
     client's excess-property check on the branch that carries the newer column. */
  type TargetRow = {
    athlete_id: string;
    effective_from: string;
    method: 'manual' | 'recommended';
    kcal: number;
    protein_g: number;
    carb_g: number;
    fat_g: number;
    weight_lb?: number | null;
  };
  const base: TargetRow = {
    athlete_id: id,
    effective_from: today,
    method,
    kcal: Math.round(t.kcal),
    protein_g: Math.round(t.protein),
    carb_g: Math.round(t.carb),
    fat_g: Math.round(t.fat),
  };

  const write = (withWeight: boolean) =>
    supabase
      .from('nutrition_targets')
      .upsert(withWeight ? { ...base, weight_lb: weightLb ?? null } : base, {
        onConflict: 'athlete_id,effective_from',
      });

  /* The TARGET still saves if `0209` is unpasted — only its weight snapshot is lost, which costs that
     one target its future review banner and nothing else. Same posture as `micros` (0207). */
  const wanted = targetWeightColumn !== false && weightLb != null;
  let { error } = await write(wanted);
  if (error && wanted && isMissingColumn(error)) {
    targetWeightColumn = false;
    ({ error } = await write(false));
  }
  if (error) throw error;
}

/* ── Meal Plan Setup (0210) ─────────────────────────────────────────────── */

/**
 * The athlete's saved setup, or null when they have never completed it — or when `0210` is not pasted
 * yet, which reads the same way: the screen opens fresh, and saving is what surfaces the missing table.
 */
export async function fetchMealPlanPrefs(): Promise<(MealPlanPrefs & { updatedAt: string | null }) | null> {
  const id = await athleteId();
  if (!id) return null;
  const { data, error } = await supabase
    .from('meal_plan_prefs')
    .select('diet, allergens, dislikes, meals, cook_minutes, household, weekly_budget_usd, updated_at')
    .eq('athlete_id', id)
    .maybeSingle();
  if (error || !data) return null;
  const r = data as Record<string, any>;
  return {
    diet: r.diet,
    allergens: r.allergens ?? [],
    dislikes: r.dislikes ?? [],
    meals: r.meals ?? [],
    cookMinutes: r.cook_minutes ?? null,
    household: Number(r.household ?? 1),
    weeklyBudgetUsd: r.weekly_budget_usd != null ? Number(r.weekly_budget_usd) : null,
    updatedAt: r.updated_at ?? null,
  };
}

/** Save the setup. Throws on any failure — the screen must not say "saved" when nothing was. */
export async function saveMealPlanPrefs(prefs: MealPlanPrefs): Promise<void> {
  const id = await athleteId();
  if (!id) throw new Error('Not signed in');
  const { error } = await supabase.from('meal_plan_prefs').upsert(
    {
      athlete_id: id,
      diet: prefs.diet,
      allergens: prefs.allergens,
      dislikes: prefs.dislikes,
      meals: prefs.meals,
      cook_minutes: prefs.cookMinutes,
      household: prefs.household,
      weekly_budget_usd: prefs.weeklyBudgetUsd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'athlete_id' },
  );
  if (error) throw error;
}

/* ── Meal Plan week (0211) ──────────────────────────────────────────────── */

/** The stored week, or null when none is built yet (or `0211` is not pasted — the screen builds one). */
export async function fetchMealPlanWeek(weekStart: string): Promise<MealPlanWeek | null> {
  const id = await athleteId();
  if (!id) return null;
  const { data, error } = await supabase
    .from('meal_plan_weeks')
    .select('week_start, seed, target_kcal, prefs_updated_at, days, locked, logged')
    .eq('athlete_id', id)
    .eq('week_start', weekStart)
    .maybeSingle();
  if (error || !data) return null;
  const r = data as Record<string, any>;
  return {
    weekStart: r.week_start,
    seed: Number(r.seed),
    targetKcal: Number(r.target_kcal),
    prefsUpdatedAt: r.prefs_updated_at ?? null,
    days: r.days as PlanDay[],
    locked: (r.locked ?? {}) as Locks,
    logged: (r.logged ?? {}) as Record<string, string>,
  };
}

/** Save the week as it stands. Throws — a swap the athlete saw must not silently vanish on reopen. */
export async function saveMealPlanWeek(week: MealPlanWeek): Promise<void> {
  const id = await athleteId();
  if (!id) throw new Error('Not signed in');
  const { error } = await supabase.from('meal_plan_weeks').upsert(
    {
      athlete_id: id,
      week_start: week.weekStart,
      seed: week.seed,
      target_kcal: Math.round(week.targetKcal),
      prefs_updated_at: week.prefsUpdatedAt,
      days: week.days,
      locked: week.locked,
      logged: week.logged,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'athlete_id,week_start' },
  );
  if (error) throw error;
}

/**
 * "Log meal" / "Logged" for one planned meal — shared by Meal Plan and Recipe so both write the same row.
 *
 * Logging writes a real diary row TODAY, in the meal's slot, as a quick-add labelled "Forge recipe"
 * (one serving, the recipe's per-serving numbers — which are USDA-derived, NUT-D4). Unlogging removes
 * exactly that row, by the id the plan remembered. Returns the week with `logged` updated; the caller
 * saves it.
 */
export async function togglePlanLog(
  week: MealPlanWeek,
  d: number,
  i: number,
  todayIso: string,
): Promise<{ week: MealPlanWeek; logged: boolean }> {
  const it = week.days[d]?.items[i];
  const r = it ? RECIPE_BY_ID[it.recipeId] : undefined;
  if (!it || !r) return { week, logged: false };
  const key = logKey(d, it);
  const logged = { ...week.logged };
  const existing = logged[key];
  if (existing) {
    await removeEntry(existing);
    delete logged[key];
    return { week: { ...week, logged }, logged: false };
  }
  const mine = itemTotals(it);
  const [entry] = await addEntries(todayIso, [
    {
      meal: it.slot,
      source: 'quick',
      name: r.name,
      servingLabel: `${portionLabel(it.portion ?? 1)} · Forge recipe`,
      quantity: it.portion ?? 1,
      macros: { kcal: mine.kcal, protein: mine.protein, carb: mine.carb, fat: mine.fat, grams: null },
    },
  ]);
  if (entry) logged[key] = entry.id;
  return { week: { ...week, logged }, logged: true };
}

/* ── Grocery List marks (0212) ──────────────────────────────────────────── */

/**
 * What the athlete ticked, has at home, removed or added for this week — or null before any. The list
 * itself is never stored; it is derived from the week's cooks (`domain/nutrition/grocery.ts`).
 */
export async function fetchGroceryState(weekStart: string): Promise<Partial<GroceryState> | null> {
  const id = await athleteId();
  if (!id) return null;
  const { data, error } = await supabase
    .from('meal_plan_weeks')
    .select('grocery')
    .eq('athlete_id', id)
    .eq('week_start', weekStart)
    .maybeSingle();
  if (error || !data) return null;
  const g = (data as { grocery: Partial<GroceryState> | null }).grocery;
  return g && Object.keys(g).length ? g : null;
}

/** Save the marks onto the week's row. Only this column: a plan save never clobbers it, nor it a plan. */
export async function saveGroceryState(weekStart: string, state: GroceryState): Promise<void> {
  const id = await athleteId();
  if (!id) throw new Error('Not signed in');
  const { error } = await supabase
    .from('meal_plan_weeks')
    .update({ grocery: state })
    .eq('athlete_id', id)
    .eq('week_start', weekStart);
  if (error) throw error;
}

/* ── My Recipes (0213) ──────────────────────────────────────────────────── */

const toUserRecipe = (r: Record<string, any>): UserRecipe => ({
  id: `u:${r.id}`,
  name: r.name,
  mealTypes: r.meal_types ?? [],
  minutes: Number(r.minutes),
  yield: Number(r.yield),
  ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
  allergens: r.allergens ?? [],
  confirmed: !!r.confirmed,
  steps: r.steps ?? [],
  usePlan: !!r.use_plan,
  createdAt: r.created_at,
});

/**
 * The athlete's recipes — and, as it reads them, puts them in the recipe book (`registerAll`), so any
 * week naming one resolves. Empty when there are none or `0213` is not pasted yet.
 */
export async function fetchUserRecipes(): Promise<UserRecipe[]> {
  const id = await athleteId();
  if (!id) return [];
  const { data, error } = await supabase
    .from('user_recipes')
    .select('id, name, meal_types, minutes, yield, ingredients, allergens, confirmed, steps, use_plan, created_at')
    .eq('athlete_id', id)
    .order('created_at', { ascending: false });
  const list = error ? [] : ((data ?? []) as Record<string, any>[]).map(toUserRecipe);
  registerAll(list);
  return list;
}

/** Insert or update one recipe. Returns it as stored. Throws — the form must not say "saved" when it wasn't. */
export async function saveUserRecipe(u: Omit<UserRecipe, 'id' | 'createdAt'> & { id: string | null }): Promise<UserRecipe> {
  const athlete = await athleteId();
  if (!athlete) throw new Error('Not signed in');
  const rowId = u.id ? u.id.replace(/^u:/, '') : uuid();
  const { data, error } = await supabase
    .from('user_recipes')
    .upsert(
      {
        id: rowId,
        athlete_id: athlete,
        name: u.name,
        meal_types: u.mealTypes,
        minutes: u.minutes,
        yield: u.yield,
        ingredients: u.ingredients,
        allergens: u.allergens,
        confirmed: u.confirmed,
        steps: u.steps,
        use_plan: u.usePlan,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select('id, name, meal_types, minutes, yield, ingredients, allergens, confirmed, steps, use_plan, created_at')
    .single();
  if (error || !data) throw error ?? new Error('Could not save the recipe');
  return toUserRecipe(data as Record<string, any>);
}
