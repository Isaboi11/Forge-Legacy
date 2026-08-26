import React, { createContext, useCallback, useContext, useMemo } from 'react';

import { fetchEntitlement, type EntitlementSnapshot } from '@/data/entitlement-live';
import {
  gateFor,
  remaining,
  usageLabel,
  UNKNOWN,
  type CapKey,
  type Caps,
  type Gate,
  type Tier,
  type Usage,
} from '@/domain/entitlement/caps-core';
import { useAuth } from './auth';
import { useQuery } from './useQuery';

/**
 * IS THIS ATHLETE ENTITLED?
 *
 * ══ THE SEAM IS CLOSED ══
 *
 * This file used to return `{ entitled: true }` for everyone, deliberately, because there was no paid
 * tier to be entitled to. There is one now: migration `0145` lands the signal, the server-side caps and
 * the counters, and this is where the app reads them.
 *
 * **It is still the ONE place that answers the question.** If a second file starts answering it, they
 * will disagree, and the disagreement will be discovered by an athlete.
 *
 * ══ ⚠ PHASE B: NOTHING CHANGES YET, AND THAT IS THE TEST ══
 *
 * `entitlement_config.default_tier` ships as **'PREMIUM'**, so every athlete — existing and new —
 * resolves entitled and every gate below opens. Phase B's whole verification is that no screen behaves
 * differently. Phase F is one UPDATE against one row.
 *
 * ══ ⚠ THIS IS NOT A SECURITY BOUNDARY ══
 *
 * Same rule `admin-live.ts` states about `isAppAdmin()`: this decides what the SCREEN draws. The gate
 * belongs in Postgres — `programs_cap_guard()` refuses an over-cap insert whatever this file believes.
 * The client merely avoids drawing a door it knows is locked.
 *
 * ══ ⚠ THREE STATES, NOT TWO, AND THE THIRD IS WHY M-7 CAN BE TRUSTED ══
 *
 * `unknown` — the entitlement could not be established (offline, 0145 not applied, a 5xx). M-7 §10 is
 * explicit that in this state **M-7 does not fire**; the surface shows *"Unable to verify your
 * subscription. Try again."* and the action stays blocked. Showing an upsell to a Premium athlete whose
 * network dropped is worse than blocking them with an honest error — M7-D10: *trust is higher-priority
 * than conversion at this moment.*
 *
 * So gates FAIL CLOSED on unknown (block, no upsell) while feature DISPLAY fails open — see
 * `useEntitlement` below for why those two directions are both correct.
 */

export type EntitlementStatus = 'loading' | 'ready' | 'unknown';

interface EntitlementState {
  snapshot: EntitlementSnapshot | null;
  status: EntitlementStatus;
  refetch: () => void;
}

/**
 * The last entitlement that read successfully, per athlete.
 *
 * ⚠ MODULE SCOPE, NOT A REF, AND NOT STATE. It is written inside the fetcher — which runs in an effect —
 * and never touched during render: `react-compiler` errors on "Cannot access refs during render", and a
 * `useState` mirror would be a second copy of an answer `useQuery` already holds. Keeping it out of the
 * component sidesteps both.
 *
 * ⚠ KEYED BY athlete id, which is the whole safety of it: one athlete's entitlement can never be read
 * for another. A stale entry is only ever reachable by the same id signing back in, and only as the
 * fallback when a live read has failed — which is the correct answer in that moment anyway.
 */
const LAST_GOOD = new Map<string, EntitlementSnapshot>();

const EntitlementContext = createContext<EntitlementState | undefined>(undefined);

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;

  const { data, loading, refetch } = useQuery<EntitlementSnapshot | null>(
    async () => {
      if (!uid) return null;
      try {
        const snap = await fetchEntitlement();
        if (snap) LAST_GOOD.set(uid, snap);
        return snap;
      } catch (e) {
        /* A refresh that fails leaves the previous answer standing. Only a read that has NEVER
           succeeded for this athlete is allowed to surface as `unknown`. */
        const prev = LAST_GOOD.get(uid);
        if (prev) return prev;
        throw e;
      }
    },
    [uid],
  );


  /**
   * ══ ⚠ AN ENTITLEMENT THAT READ ONCE MUST NOT EVAPORATE ON A LATER FAILURE ══
   *
   * PO: *"I just didn't see him for the second half of my freestyle workout today. Resting or not."*
   *
   * In-workout Holt is hidden by `!inWorkoutHolt.ok`, and `ok` is `outcome === 'allowed'` — so an
   * `unknown` entitlement hides him exactly as a blocked one does. Two ordinary things collapse the
   * snapshot to null and produce `unknown`:
   *
   *   · `useQuery` sets `data: null` on ANY rejection, so one failed read is indistinguishable from
   *     never having read;
   *   · the fetcher resolves `null` whenever `uid` is momentarily absent, which a token refresh can do
   *     without anything being wrong.
   *
   * Nothing then retries — the query re-runs only when `uid` changes — so Holt vanished mid-session and
   * stayed gone, with no message, no retry, and no way to tell it from a downgrade. That is the shape
   * the PO reported: there for the first half, absent for the second, regardless of resting.
   *
   * ⚠ AND THE GATE IS CURRENTLY PROTECTING NOTHING. `0145` ships `entitlement_config.default_tier` as
   * `'PREMIUM'` and says so in its header: *"NOTHING GATES YET, AND THAT IS THE POINT."* Until Phase F
   * flips it, the only thing this gate can do is take a feature away from somebody entitled to it
   * because a network read hiccuped.
   *
   * So the last GOOD snapshot is held per athlete, in `LAST_GOOD` above, and the fetcher falls back to
   * it when a refresh fails. Only a read that has NEVER succeeded for this athlete still surfaces as
   * `unknown`.
   *
   * ⚠ SIGNING OUT DOES NOT CLEAR THE MAP, AND THAT IS DELIBERATE RATHER THAN AN OVERSIGHT. It is keyed
   * by athlete id, so one athlete's entitlement can never be read for another; a stale entry is only
   * reachable by the same id signing back in, and only as the fallback when a live read has failed —
   * which is the right answer in that moment. Clearing it would buy nothing and would put this back to
   * failing closed on the first offline launch after a sign-out.
   *
   * ⚠ THIS DOES NOT WEAKEN THE BOUNDARY. Per the header: the client decides what to DRAW; Postgres
   * decides what is allowed. A cached tier cannot authorise anything — `programs_cap_guard()` and its
   * siblings refuse an over-cap write whatever this file believes.
   */
  const value = useMemo<EntitlementState>(
    () => ({
      snapshot: data,
      status: loading ? 'loading' : data ? 'ready' : 'unknown',
      refetch,
    }),
    [data, loading, refetch],
  );

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

/**
 * The raw state.
 *
 * ⚠ RETURNS `unknown` RATHER THAN THROWING WHEN THE PROVIDER IS ABSENT. Unlike `useAppPrefs`, this hook
 * is called from gate checks that run inside modals, sheets and the ceremony queue — surfaces that have
 * been rendered outside the navigator before now, and where a thrown context error is a launch crash
 * rather than a missing preference. `unknown` degrades to "blocked, with a retry", which is a safe
 * answer; a throw is not.
 */
export function useEntitlementState(): EntitlementState {
  const ctx = useContext(EntitlementContext);
  return ctx ?? { snapshot: null, status: 'unknown', refetch: () => {} };
}

// ── feature display ──────────────────────────────────────────────────────────

/** Features gated by tier rather than by a count. Named so the seam stays greppable. */
export type PaidFeature = 'weekly_review';

export interface Entitlement {
  entitled: boolean;
  loading: boolean;
  /** True when entitlement could not be established. Callers that show an upsell MUST check this. */
  unknown: boolean;
}

/**
 * Whether to draw a paid FEATURE.
 *
 * ⚠ FAILS OPEN ON `unknown`, WHICH IS THE OPPOSITE OF THE CAP GATES, AND BOTH ARE RIGHT.
 *
 * A cap gate that fails open lets a Free athlete start a flow the server will refuse partway through —
 * exactly the dead-end M-7 §2 forbids. A feature gate that fails CLOSED shows a paying athlete a locked
 * card because their train went into a tunnel, which is the trust failure M7-D10 was written about.
 *
 * Failing open costs nothing real: every paid feature reads server data, so an athlete who is not
 * entitled gets an empty surface rather than a free one. The client was never the boundary.
 */
export function useEntitlement(_feature: PaidFeature): Entitlement {
  const { snapshot, status } = useEntitlementState();
  return {
    entitled: status === 'ready' ? snapshot?.tier === 'PREMIUM' : true,
    loading: status === 'loading',
    unknown: status === 'unknown',
  };
}

// ── the pre-action cap gates ─────────────────────────────────────────────────

export interface CapGate extends Gate {
  /** True when the action may proceed. */
  ok: boolean;
  /** True when M-7 should fire. Never true on `unknown` — that is the whole point (M-7 §10). */
  showUpsell: boolean;
  /** True when the surface should show "Unable to verify your subscription. Try again." */
  showRetry: boolean;
  /** How many more may be created; `Infinity` when uncapped. */
  left: number;
  /** "38 of 75", or "38" when uncapped. For P-8 and the photos counter. */
  label: string;
}

const VERIFY_FAILED = 'Unable to verify your subscription. Try again.';
export const ENTITLEMENT_RETRY_MESSAGE = VERIFY_FAILED;

function toCapGate(gate: Gate, used: number, cap: number): CapGate {
  return {
    ...gate,
    ok: gate.outcome === 'allowed',
    showUpsell: gate.outcome === 'blocked',
    showRetry: gate.outcome === 'unknown',
    left: gate.outcome === 'unknown' ? 0 : remaining(used, cap),
    label: gate.outcome === 'unknown' ? '' : usageLabel(used, cap),
  };
}

/**
 * The pre-action check for one capped dimension.
 *
 * ⚠ ASK BEFORE OPENING THE FLOW, NOT PARTWAY THROUGH IT (M-7 §2). The athlete must never choose a photo,
 * name a squad, or build half a template and only then be told they cannot finish.
 */
export function useCapGate(key: CapKey): CapGate {
  const { snapshot } = useEntitlementState();
  const caps: Caps | null = snapshot?.caps ?? null;
  const usage: Usage | null = snapshot?.usage ?? null;

  return useMemo(() => {
    const gate = gateFor(key, caps, usage);
    return toCapGate(gate, gate.used ?? 0, gate.cap ?? 0);
  }, [key, caps, usage]);
}

/**
 * The imperative form, for handlers that check several caps or need the answer inside a callback.
 *
 * Returns a stable function so it can sit in a dependency array without re-creating every render.
 */
export function useCapGates(): (key: CapKey) => CapGate {
  const { snapshot } = useEntitlementState();
  const caps = snapshot?.caps ?? null;
  const usage = snapshot?.usage ?? null;

  return useCallback(
    (key: CapKey) => {
      const gate = gateFor(key, caps, usage);
      return toCapGate(gate, gate.used ?? 0, gate.cap ?? 0);
    },
    [caps, usage],
  );
}

/** The athlete's tier, for surfaces that display it (P-8, Account Settings). `null` when unknown. */
export function useTier(): Tier | null {
  const { snapshot, status } = useEntitlementState();
  return status === 'ready' ? (snapshot?.tier ?? null) : null;
}

export { UNKNOWN };
export type { CapKey, Gate };
