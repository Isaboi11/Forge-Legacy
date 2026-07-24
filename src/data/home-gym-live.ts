import { supabase } from '@/lib/supabase';
import { sanitize } from '@/domain/home-gym/equipment';

/**
 * The athlete's Home Gym profile (`profiles.home_gym_equipment`, 0021).
 *
 * `null` and `[]` mean genuinely different things and both survive the round trip:
 *   null — never set up. Callers offer the editor rather than filtering the catalog down to nothing.
 *   []   — set up and deliberately empty: "I own nothing." Bodyweight only, and that's a real answer.
 *
 * Everything read from the row is sanitized against the current inventory, so an id retired from
 * `equipment.ts` simply stops counting instead of lingering as an unfilterable ghost.
 */

export async function fetchHomeGym(): Promise<string[] | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('home_gym_equipment')
    .eq('id', user.id)
    .maybeSingle();

  // A missing column (pre-0021) reads as "never set up" rather than breaking every filter that asks.
  if (error || !data) return null;

  const raw = (data as { home_gym_equipment: string[] | null }).home_gym_equipment;
  return raw == null ? null : sanitize(raw);
}

/** The editor's Save. Sanitizing here too means a stale client can never write an unknown id. */
export async function saveHomeGym(ids: readonly string[]): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { error } = await supabase
    .from('profiles')
    .update({ home_gym_equipment: sanitize(ids) })
    .eq('id', user.id);

  if (error) throw error;
}
