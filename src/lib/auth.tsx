import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { resetFirstRunFlags } from './first-run';
import { syncAthleteTimezone } from '@/data/honors-live';

/**
 * Auth session — the real identity the app runs on (Phase 1). `session.user.id` is `auth.uid()`,
 * which every RLS policy keys off; it retires the `?as=` demo override for "self".
 *
 * Wraps `supabase.auth`: restores a persisted session on boot (AsyncStorage), then tracks changes via
 * `onAuthStateChange`. `loading` is true until the first session read resolves, so the app can hold a
 * splash instead of flashing the sign-in screen for an already-logged-in user.
 */
interface AuthState {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Last-seen auth user id. `undefined` = not yet observed (boot); on any real change to a DIFFERENT id
  // (including → null on sign-out) we wipe the device-local first-run flags so a new account starts clean.
  const prevUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(
      ({ data }) => {
        setSession(data.session);
        setLoading(false);
        // Which clock this athlete lives by — the Hidden honors ask what the wall said, and a timestamptz
        // cannot answer that. Fire-and-forget: it must never delay the splash or fail a launch.
        if (data.session) void syncAthleteTimezone();
      },
      /*
       * ⚠ THE REJECTION ARM IS LOAD-BEARING — this used to be a bare `.then(fn)`.
       *
       * `loading` starts true and `routeFor` maps it to 'splash', which renders `BootLoading` and
       * DECLARES NO SCREENS. There is no back button, no retry and no timeout on that screen, so any
       * path that fails to call `setLoading(false)` freezes the app permanently — which is what a
       * rejected session read did, silently, with a bronze spinner as the only symptom.
       *
       * Landing on sign-in is the honest answer to "we could not determine who you are". It is also
       * self-correcting: `onAuthStateChange` below is already subscribed, so if auth-js recovers a
       * session afterwards it swaps the route without another launch.
       */
      (e: unknown) => {
        console.warn('[auth] could not read the stored session on boot', e);
        setSession(null);
        setLoading(false);
      },
    );
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      const nextId = next?.user?.id ?? null;
      if (prevUserId.current !== undefined && prevUserId.current !== nextId) {
        void resetFirstRunFlags();
      }
      if (nextId && prevUserId.current !== nextId) void syncAthleteTimezone();
      prevUserId.current = nextId;
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };
  // Soft verification (O-1 Decision 4): a fresh signup gets a usable session immediately (the project's
  // email-confirmation setting governs this) — the app is never gated on confirming. The `handle_new_user`
  // trigger mints a bare profile with `onboarded_at` null, so the boot router sends them to onboarding.
  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };
  // Forgot-password send (Gate B builds the screen; the function lives here now so it's a trivial wire-up).
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message ?? null };
  };
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, resetPassword, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
