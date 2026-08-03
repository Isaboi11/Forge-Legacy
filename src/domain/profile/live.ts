import { supabase } from '@/lib/supabase';
import { cap } from '@/lib/format';
import { uploadAvatar } from '@/lib/avatar';
import { firstNameOf, initialsOf, type AthleteType } from '@/domain/onboarding/derive';
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
  /** Drives badge artwork and silhouettes only — never a health metric (schema.ts). Carried so P-1.1
   *  Edit Profile seeds its whole form from ONE read; two sources could disagree mid-edit. */
  sex: Sex;
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
    .select('name, initials, handle, rank_family, rank_level, athlete_type, avatar_url, created_at, sex')
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
    sex: (data.sex as Sex) ?? 'unspecified',
  };
}

/** Normalize a typed handle to the stored form. Identical to `isHandleAvailable`'s cleaner — if the two
 *  ever diverged, the availability check would answer for a different string than the one written. */
export function normalizeHandle(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
}

export interface ProfileEdits {
  name: string;
  /** Empty → cleared to null. `handle` has been nullable since 0009 (the skip path). */
  handle: string;
  sex: Sex;
  athleteType: AthleteType;
  /** A newly-picked local image to upload; null → leave the stored avatar untouched. */
  photoUri: string | null;
}

/** Raised when the handle was taken between the availability check and the write. */
export class HandleTakenError extends Error {
  constructor(handle: string) {
    super(`@${handle} is already taken.`);
    this.name = 'HandleTakenError';
  }
}

/**
 * P-1.1 Edit Profile — the write half of the identity `fetchAccountIdentity` has been reading all along.
 *
 * A plain table update, not an RPC: `profiles_self` (0001) is `for all ... with check (id = auth.uid())`,
 * so the row is already writable by exactly one person and a SECURITY DEFINER function would add a
 * caller check the database is doing anyway.
 *
 * `first_name` and `initials` are DERIVED here rather than accepted, for the same reason
 * `complete_onboarding` derives them: they are functions of the name, and a screen that let them drift
 * would put one athlete's initials on another athlete's avatar. Same helpers as onboarding, so a name
 * edited here resolves identically to one typed there.
 *
 * Nothing denormalizes these fields — the squad feed and friends feed join `profiles` at query time
 * (0041 §fn) — so an edit propagates to every surface without a backfill.
 *
 * The handle's unique index is the real authority, not the debounced availability check the screen runs:
 * between that check and this write, someone else can claim it. A 23505 here is that race, and it is
 * reported as the specific thing that happened rather than a generic failure.
 */
export async function updateSelfProfile(edits: ProfileEdits): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not signed in');

  const name = edits.name.trim();
  if (!name) throw new Error('A name is required.');

  const handle = normalizeHandle(edits.handle);
  if (handle && handle.length < 3) throw new Error('A handle needs at least 3 characters.');

  const avatarUrl = edits.photoUri ? await uploadAvatar(user.id, edits.photoUri) : null;

  const patch: Record<string, string | null> = {
    name,
    first_name: firstNameOf(name),
    initials: initialsOf(name),
    handle: handle || null,
    sex: edits.sex,
    athlete_type: edits.athleteType,
    updated_at: new Date().toISOString(),
  };
  // Omitted, not nulled: no new photo must leave the existing one alone. Writing `avatar_url: null`
  // whenever the picker wasn't touched would silently delete the athlete's photo on every other edit.
  if (avatarUrl) patch.avatar_url = avatarUrl;

  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
  if (error) {
    if (error.code === '23505') throw new HandleTakenError(handle);
    throw error;
  }
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
