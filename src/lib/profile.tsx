import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth';
import { useQuery } from './useQuery';
import { fetchSelfProfileWithId } from '@/domain/profile/live';
import { breadcrumb } from './diagnostics';
import { supabase } from './supabase';
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
  /** The last read's failure, if any — the boot hold's stall report names it (11-09). */
  error: string | null;
  /** One line for the boot-stall report: is there a uid, and what state is the read in. */
  debug: string;
}

const ProfileContext = createContext<ProfileState | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  /*
   * Tagged with the account the SERVER says the row belongs to (11-09). It used to be tagged with this phone's
   * `session.user.id`; on a phone that had held two accounts, the read came back for the account the server knows
   * while the gate compared it against a different id, so every launch threw the answer away and held the splash.
   * A profile is shown only when the server's id and the signed-in id agree — never the other account's row.
   */
  const { data: read, error, refetch } = useQuery<{ uid: string; profile: UserProfile | null } | null>(
    async () => (uid ? await fetchSelfProfileWithId().then((r) => ({ uid: r.id, profile: r.profile })) : null),
    [uid],
  );
  const data = read != null && read.uid === uid ? read.profile : null;
  /* Boot-stall diagnostics (11-09): which of the three ways `data` can be null is it? Enum-shaped so the crumb
     survives the report's sanitiser; one crumb per CHANGE, so a flip-flop shows as a sequence. */
  const readState = read == null ? 'none' : read.uid !== uid ? 'mismatch' : read.profile ? 'loaded' : 'empty';
  /* The two values the comparison sees (last 6 chars only — an account id suffix, nothing personal) and the shape
     of the stored read, so a mismatch report says exactly WHAT disagreed (11-09, read=mismatch on the PO's phone). */
  const tail = (v: unknown) => (typeof v === 'string' ? v.slice(-6) : `<${typeof v}>`);
  const readShape = read == null ? '-' : typeof read === 'object' ? Object.keys(read).join('+') : typeof read;
  const debug = `uid=${uid ? 'yes' : 'no'} read=${readState} cur=${tail(uid)} got=${tail(read?.uid)} shape=${readShape}`;
  useEffect(() => {
    breadcrumb('state', `profile:read:${readState}`);
  }, [readState]);
  /*
   * ⛔ A MISMATCH RESYNCS INSTEAD OF HOLDING FOREVER (11-09). The phone's idea of who is signed in disagrees with the
   * server's. Refreshing the session replaces the phone's stored identity with the server's (auth-js emits
   * TOKEN_REFRESHED; `AuthProvider` takes the new session, so `uid` becomes the server's id and the read matches).
   * Then read again. At most 3 tries; past that the boot hold's rescue and its report take over. If the refresh is
   * refused, auth-js signs the phone out and the athlete simply signs in again — consistent, not stuck.
   */
  const [resyncs, setResyncs] = useState(0);
  useEffect(() => {
    if (readState !== 'mismatch' || uid == null || resyncs >= 3) return;
    const t = setTimeout(() => {
      breadcrumb('state', 'profile:resync');
      void supabase.auth
        .refreshSession()
        .catch(() => undefined)
        .finally(() => {
          setResyncs((n) => n + 1);
          refetch();
        });
    }, 300);
    return () => clearTimeout(t);
  }, [readState, uid, resyncs, refetch]);
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
  /*
   * ⚠ NOT `rawLoading` ANY MORE (PO 11-08 launch QA, H15). `refetch()` sets the query's loading flag back to true, so
   * every profile refresh — Save on Edit Profile, Remove photo — read as "booting": the boot router swapped the whole
   * Stack for the splash and the athlete landed on Home, thrown out of the screen they were on. Only "no profile for
   * the athlete signed in now" holds the splash; a refresh keeps the one in hand until the new one lands.
   */
  const loading = uid != null && data == null;
  useEffect(() => {
    if (uid == null || error == null) return;
    const t = setTimeout(refetch, 2000);
    return () => clearTimeout(t);
  }, [uid, error, refetch]);
  return <ProfileContext.Provider value={{ profile: data, loading, refetch, error, debug }}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileState {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
