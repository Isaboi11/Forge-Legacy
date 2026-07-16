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
}

const ProfileContext = createContext<ProfileState | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const { data, loading } = useQuery<UserProfile | null>(
    async () => (uid ? fetchSelfProfile() : null),
    [uid],
  );
  return <ProfileContext.Provider value={{ profile: data, loading }}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileState {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
