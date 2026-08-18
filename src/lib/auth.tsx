import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { lastAthleteId, rememberAthleteId, resetFirstRunFlags } from './first-run';
import { isDeviceHandover, shouldRecordAthlete } from '@/domain/auth/device-handover';
import { syncAthletePresence } from '@/data/honors-live';
import { stopAnalytics } from './analytics';

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
  /**
   * Arrived from a password-reset link and has not yet chosen a new password.
   *
   * The boot router reads this ahead of `session`, because a recovery link SIGNS YOU IN — without it the
   * athlete lands on Home holding a session they cannot reproduce, still not knowing their password.
   */
  recovering: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  /** Set a new password for the signed-in (or recovering) athlete, then leave recovery. */
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);
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
        if (data.session) void syncAthletePresence();
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
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      /*
       * The one event that must not be treated as an ordinary sign-in. Supabase fires it when the app is
       * opened from a reset link, with a real session attached — so without this flag the boot router
       * sees "signed in, onboarded" and shows Home to somebody who came to change their password.
       * Cleared by `updatePassword` succeeding, or by signing out.
       */
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') setRecovering(false);
      const nextId = next?.user?.id ?? null;
      /*
       * ⚠ THE HANDOVER CHECK IS PERSISTED NOW, AND THE REF ALONE COULD NOT SEE IT.
       *
       * This was `prevUserId.current !== undefined && prevUserId.current !== nextId`. The second half is
       * right; the first half is a guard against wiping your own flags on an ordinary boot, and it has a
       * hole the width of a page reload — the ref starts `undefined` on every mount, so THE FIRST AUTH
       * EVENT A MOUNT SEES CAN NEVER RESET. On web, signing up after a sign-out is very often exactly
       * that event, so the new athlete inherited the previous one's device state: their tour, their
       * draft, and Holt's memory of a training level that was never theirs.
       *
       * Reported as "it never asked me what level I am" on a brand-new account — which is precisely what
       * it would do, because the questionnaire skips a question it believes it already has an answer to.
       *
       * `lastAthleteId` outlives the mount, so the question is answerable whenever it is asked. The rule
       * itself is pure and tested — see `domain/auth/device-handover.ts`, particularly why a device that
       * has never recorded an owner is NOT a handover.
       */
      void (async () => {
        const owner = await lastAthleteId();
        if (isDeviceHandover(owner, nextId)) await resetFirstRunFlags();
        if (shouldRecordAthlete(owner, nextId) && nextId) await rememberAthleteId(nextId);
      })();
      if (nextId && prevUserId.current !== nextId) void syncAthletePresence();
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
  // Forgot-password send. The screen that calls this is the `forgot` step of the auth route.
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message ?? null };
  };
  /**
   * The other half of the reset, and the half that actually gets them back in.
   *
   * Runs against the recovery session the emailed link established, so nothing here needs the old
   * password — proving they can read that inbox is the proof. Leaving `recovering` only on SUCCESS
   * matters: a failed attempt has to keep the athlete on the set-password step rather than releasing
   * them into the app with the password still unchanged.
   */
  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setRecovering(false);
    return { error: error?.message ?? null };
  };
  const signOut = async () => {
    // Last chance to send what this session collected — the insert is `user_id = auth.uid()`, so once
    // the session is gone the queued rows have nobody to belong to and are dropped. Awaited but
    // best-effort: `stopAnalytics` cannot throw, so it can never block signing out.
    await stopAnalytics();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, loading, recovering, signIn, signUp, resetPassword, updatePassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
