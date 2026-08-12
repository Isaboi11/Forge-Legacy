import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';

/**
 * HOW MANY WORKOUTS THIS ATHLETE HAS LOGGED — the only input the tutorial's phases need.
 *
 * ══ WHY IT IS CACHED AT ALL ══
 *
 * The phase decides whether a walkthrough fires, and that decision happens the instant a screen mounts.
 * A network read there would mean either a tutorial that appears a beat late over a screen the athlete
 * has started using, or a gate that guesses while the read is in flight. The count changes a handful of
 * times a week; a mirror is the honest shape.
 *
 * ══ ⚠ SEEDED FROM THE SERVER, AND THIS IS THE BUG IT EXISTS TO PREVENT ══
 *
 * A device-local counter starting at zero means **a reinstall, a new phone, or a cleared cache demotes a
 * two-year athlete to phase 1 and replays the entire tutorial at them** — 105 steps, on somebody who
 * needs none of it. That is a worse experience than the one being fixed, and it would look like the
 * phasing feature failing rather than like a missing backfill.
 *
 * So an absent cache reads the real count once, from `workouts`, and stores it. `bumpWorkoutsLogged`
 * keeps it current after that without another round trip.
 *
 * ⚠ AND A FAILED READ RETURNS `null`, NOT ZERO. Zero is a real answer meaning "brand new", and
 * `planTour`/`stepsFor` treat an absent count as "unlocked" precisely so that a dead network cannot
 * silently under-teach. Never coerce this to 0.
 */

const KEY = 'forge_tour_workouts_v1';

/** In-memory, so the common path costs nothing after the first read of a session. */
let cached: number | null = null;

const parse = (raw: string | null): number | null => {
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
};

/**
 * The count, seeding from the server the first time.
 *
 * Null means "not known yet" — the caller must treat that as no restriction, never as zero.
 */
export async function getWorkoutsLogged(): Promise<number | null> {
  if (cached != null) return cached;
  try {
    const stored = parse(await AsyncStorage.getItem(KEY));
    if (stored != null) {
      cached = stored;
      return stored;
    }
  } catch {
    // An unreadable cache is the same as an absent one — fall through to the server.
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    /* `head: true` — the count is the whole answer and none of the rows are wanted. Saved workouts only:
       a draft in progress has not taught anybody anything yet. */
    const { count, error } = await supabase
      .from('workouts')
      .select('id', { count: 'exact', head: true })
      .eq('athlete_id', user.id)
      .eq('state', 'saved');
    if (error || count == null) return null;
    cached = count;
    void AsyncStorage.setItem(KEY, String(count)).catch(() => {});
    return count;
  } catch {
    return null;
  }
}

/**
 * One more workout is in the book.
 *
 * ⚠ A NO-OP UNTIL THE COUNT IS KNOWN. Writing `1` over an unseeded cache would tell the app a veteran
 * has trained exactly once and hand them the beginner tutorial — the same failure the seed exists to
 * prevent, arrived at from the other side.
 */
export async function bumpWorkoutsLogged(): Promise<void> {
  try {
    const current = cached ?? parse(await AsyncStorage.getItem(KEY));
    if (current == null) return;
    cached = current + 1;
    await AsyncStorage.setItem(KEY, String(cached));
  } catch {
    // Best-effort: the next cold start re-seeds from the server anyway.
  }
}

/**
 * ⚠ CLEARS THE CACHE, NOT THE ATHLETE'S PROGRESS. Used on account switch, beside the other first-run
 * flags — the next read seeds from whoever is signed in now.
 *
 * **"Replay all tips" must NOT call this.** Replaying is a request to be shown what you are owed again;
 * resetting the counter would additionally take away the phases you had earned, so a veteran tapping it
 * would get the beginner tutorial. The label is a contract.
 */
export async function forgetWorkoutsLogged(): Promise<void> {
  cached = null;
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
