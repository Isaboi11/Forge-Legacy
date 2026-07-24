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
    .select('name, first_name, handle, initials, sex, avatar_url, onboarded_at')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  return {
    name: data.name,
    firstName: data.first_name,
    handle: data.handle ?? '', // nullable since 0009 (username skippable) — render nothing, not "null"
    initials: data.initials,
    avatarUrl: data.avatar_url ?? null,
    sex: data.sex as Sex,
    onboardedAt: data.onboarded_at ?? null,
  };
}

export interface AccountIdentity {
  name: string;
  initials: string;
  /** The '@' handle without its prefix. Onboarding's "username" step writes this column. */
  handle: string;
  rankFamily: string | null;
  rankLevel: number | null;
  athleteType: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
}

/**
 * The Account Settings identity header.
 *
 * Reads the four fields P-1 Tier 1 owned that nothing else surfaces — @handle, athlete type, rank and
 * `created_at` ("Forging since") — rehomed here by `P-1-Dissolution-Amendment.md` §4. Separate from
 * `fetchSelfProfile` because that shape is shared by every AppBar avatar in the app and doesn't need
 * to carry rank or a join date.
 */
export async function fetchAccountIdentity(): Promise<AccountIdentity | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('name, initials, handle, rank_family, rank_level, athlete_type, avatar_url, created_at')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !data) return null;

  return {
    name: data.name,
    initials: data.initials,
    handle: data.handle ?? '', // nullable since 0009 — an athlete who skipped it has none to show
    rankFamily: data.rank_family ?? null,
    rankLevel: data.rank_level ?? null,
    athleteType: data.athlete_type ?? null,
    avatarUrl: data.avatar_url ?? null,
    createdAt: data.created_at ?? null,
  };
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
      .select('name, handle, rank_family, rank_level, athlete_type, avatar_url')
      .eq('id', user.id)
      .single();
    if (self && self.name === name) {
      return {
        name: self.name,
        handle: self.handle ? '@' + self.handle : '', // fixture prefixes '@'; skip-users (0009) have no handle
        isSelf: true,
        rank: self.rank_family ? cap(self.rank_family) : undefined,
        athleteType: self.athlete_type ?? undefined,
        avatarUrl: self.avatar_url ?? null,
      };
    }
  }
  return { name, handle: handleFromName(name), isSelf: false };
}
