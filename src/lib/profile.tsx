import React, { createContext, useContext, useEffect } from 'react';
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
  // profile yet" as still loading so routeFor holds on the splash. Every signed-in user
  // has a profile row (the handle_new_user trigger), so a null here is always transient, never "no row".
  // `loading` is a pure derivation — no setState in an effect — to stay clean under the strict react-compiler lint.
  //
  // ⚠ A FAILED READ IS ALSO "NOT KNOWN YET", NEVER "NOT ONBOARDED". The `error == null` that used to sit
  // here let a thrown read through as `profile: null`, which `routeFor` answers with 'onboarding' — so a
  // long-standing athlete who opened the app on a bad signal, or with a token mid-refresh, was walked
  // back through the first-time journey (PO, 2026-09-23: a tester reported exactly that). Only a row that
  // actually says `onboarded_at: null` may send anyone to onboarding; a failure holds the splash and
  // retries below until the read comes back.
  const loading = rawLoading || (uid != null && data == null);
  useEffect(() => {
    if (uid == null || error == null) return;
    const t = setTimeout(refetch, 2000);
    return () => clearTimeout(t);
  }, [uid, error, refetch]);
  return <ProfileContext.Provider value={{ profile: data, loading, refetch }}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileState {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
