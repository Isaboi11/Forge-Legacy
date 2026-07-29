import React, { createContext, useContext } from 'react';
import { useAuth } from './auth';
import { useQuery } from './useQuery';
import { fetchSelfProfile } from '@/domain/profile/live';
import type { UserProfile } from '@/domain/profile/schema';

/**
 * The signed-in athlete's profile, fetched once and shared (Phase 2). Every AppBar avatar + the Legacy
 * hero read `useProfile().profile` instead of the fixture `getSelfProfile()`, so there's ONE live
 * profile source. Re-fetches when the session identity changes.
 */
interface ProfileState {
  profile: UserProfile | null;
  loading: boolean;
  /** Re-read the profile — e.g. after onboarding sets `onboarded_at`, so the boot router can swap. */
  refetch: () => void;
}

const ProfileContext = createContext<ProfileState | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const { data, loading: rawLoading, error, refetch } = useQuery<UserProfile | null>(
    async () => (uid ? fetchSelfProfile() : null),
    [uid],
  );
  // Boot flash guard: when the session id settles null→uid, useQuery keeps the prior result
  // (data:null, loading:false) until the refetch lands — which the boot router read as "signed in ·
  // not onboarded" and flashed the onboarding screen for a beat before Home. Treat "have a uid but no
  // profile yet (and no error)" as still loading so routeFor holds on the splash. Every signed-in user
  // has a profile row (the handle_new_user trigger), so a null here is always transient, never "no row".
  // Pure derivation — no effect/setState — to stay clean under the strict react-compiler lint.
  const loading = rawLoading || (uid != null && data == null && error == null);
  return <ProfileContext.Provider value={{ profile: data, loading, refetch }}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileState {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
