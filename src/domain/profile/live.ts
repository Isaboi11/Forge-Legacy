import { supabase } from '@/lib/supabase';
import { cap } from '@/lib/format';
import type { Sex, UserProfile } from './schema';
import type { PublicProfileView } from '@/data/athlete-profile-placeholder';

/**
 * Live profile reads (Phase 2) — the same shapes the fixture getters returned, so the components that
 * consume them are unchanged; only the data source swaps (fixture → Supabase `profiles`).
 */

/** The signed-in athlete's identity (was `getSelfProfile()`). */
export async function fetchSelfProfile(): Promise<UserProfile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not signed in');
  const { data, error } = await supabase
    .from('profiles')
    .select('name, first_name, handle, initials, sex')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  return { name: data.name, firstName: data.first_name, handle: data.handle, initials: data.initials, sex: data.sex as Sex };
}

/** Derive an '@'-handle from a name — byte-identical to the fixture's stranger fallback. */
function handleFromName(name: string): string {
  return '@' + name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * A public athlete profile (was `getPublicProfile(name)`). The `id` param is the athlete's name.
 * Only the signed-in athlete exists in the DB today (no per-athlete store), so this resolves self with
 * its real rank/type, else a thin derived identity — the same honest fallback the fixture used.
 */
export async function fetchPublicProfile(id: string): Promise<PublicProfileView> {
  const name = id.trim();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: self } = await supabase
      .from('profiles')
      .select('name, handle, rank_family, rank_level, athlete_type')
      .eq('id', user.id)
      .single();
    if (self && self.name === name) {
      return {
        name: self.name,
        handle: '@' + self.handle, // fixture prefixes '@' in getPublicProfile; the raw handle is stored
        isSelf: true,
        rank: self.rank_family ? cap(self.rank_family) : undefined,
        athleteType: self.athlete_type ?? undefined,
      };
    }
  }
  return { name, handle: handleFromName(name), isSelf: false };
}
