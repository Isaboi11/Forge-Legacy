import { useEffect, useSyncExternalStore } from 'react';

import { supabase } from '@/lib/supabase';
import { aiCreditsFromBalanceRow, aiCreditsFromRow, remainingFrom, withRemaining, type AiCreditsRead } from '@/domain/ai/credits';

/**
 * ══ THE CREDITS CHIP'S ONE READ (AI Road to 10, Sprint 2 — UX-2; migration 0272) ══
 *
 * One cached read of the meter for the whole app, kept fresh three ways:
 *   · a chip that mounts reads it when the cache is older than `FRESH_MS` (so moving between AI screens costs no
 *     round trip);
 *   · every non-chat AI answer's `remaining` replaces the number at once (`noteAiRemaining`, called by
 *     `lib/ai-invoke.ts`) — and one that lands on 0 reads again, to learn where today's soft floor stands;
 *   · Holt's chat reads it again each time a turn finishes (the chip's `busy` prop).
 *
 * ⚠ KEYED BY athlete id. Two accounts on one phone (the 11-09 boot lesson): a read is only ever shown to the
 *   athlete it was made for — `useAiCredits` derives that in render, no effect, no ref.
 * ⚠ FAILS TO NULL, NEVER TO ZERO (see `domain/ai/credits.ts`). A failed read keeps the last good one for the same
 *   athlete, and no chip is drawn without one.
 * ⚠ A SERVER WITHOUT 0272 has no `coach_ai_credits()`: the old `coach_ai_balance()` stands in, and the chip — which
 *   only renders for Premium AI (`usePremiumAi`) — shows the balance without the floor or the warning.
 */

const FRESH_MS = 60_000;

interface Held {
  uid: string | null;
  read: AiCreditsRead | null;
  at: number;
}

let held: Held = { uid: null, read: null, at: 0 };
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const snapshot = () => held;

let inflight: { uid: string; done: Promise<void> } | null = null;

/** A `returns table` RPC answers rows; the read is its one row. */
const firstRow = (data: unknown): unknown => (Array.isArray(data) ? data[0] : data) ?? null;

/** The meter, read once. Null when it could not be read. `premiumAi` is only used by the pre-0272 stand-in. */
export async function fetchAiCredits(premiumAi: boolean): Promise<AiCreditsRead | null> {
  try {
    const { data, error } = await supabase.rpc('coach_ai_credits');
    const row = error ? null : firstRow(data);
    if (row) return aiCreditsFromRow(row);
    const old = await supabase.rpc('coach_ai_balance');
    const oldRow = old.error ? null : firstRow(old.data);
    return oldRow ? aiCreditsFromBalanceRow(oldRow, premiumAi) : null;
  } catch {
    return null;
  }
}

/**
 * Read it for `uid` unless the cache is fresher than `maxAgeMs`. One read at a time per athlete. Nobody signed in →
 * the cache is emptied.
 */
export function refreshAiCredits(uid: string | null, premiumAi: boolean, maxAgeMs = FRESH_MS): Promise<void> {
  if (!uid) {
    if (held.uid !== null || held.read) {
      held = { uid: null, read: null, at: 0 };
      emit();
    }
    return Promise.resolve();
  }
  if (held.uid === uid && held.read && Date.now() - held.at < maxAgeMs) return Promise.resolve();
  if (inflight && inflight.uid === uid) return inflight.done;
  const done = fetchAiCredits(premiumAi)
    .then((read) => {
      /* A failed read keeps the last good one for this athlete; another athlete's is never kept. */
      if (read || held.uid !== uid) {
        held = { uid, read, at: read ? Date.now() : 0 };
        emit();
      }
    })
    .finally(() => {
      if (inflight?.done === done) inflight = null;
    });
  inflight = { uid, done };
  return done;
}

/**
 * An AI function's reply came back: its `remaining` is the balance now. Called by `lib/ai-invoke.ts` for every
 * non-chat AI call. A reply at 0 reads the meter again — that is where the soft floor's day lives.
 */
export function noteAiRemaining(body: unknown): void {
  const n = remainingFrom(body);
  if (n == null || !held.read) return;
  const next = withRemaining(held.read, n);
  if (next !== held.read) {
    held = { ...held, read: next };
    emit();
  }
  if (n === 0 && held.uid) void refreshAiCredits(held.uid, next.entitled, 0);
}

/** The cached read right now, for a line written once (a refusal) rather than drawn. */
export function aiCreditsNow(uid: string | null): AiCreditsRead | null {
  return uid && held.uid === uid ? held.read : null;
}

/**
 * The read for `uid`, kept fresh. `busy` — a screen whose AI work is in progress (Holt's chat): each time it turns
 * false the meter is read again.
 */
export function useAiCredits(uid: string | null, premiumAi: boolean, busy = false): AiCreditsRead | null {
  const s = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    if (!premiumAi || busy) return;
    void refreshAiCredits(uid, premiumAi, FRESH_MS);
  }, [uid, premiumAi, busy]);
  /* A turn that just finished: read now, not in a minute. */
  useEffect(() => {
    if (!premiumAi || !busy) return;
    return () => {
      void refreshAiCredits(uid, premiumAi, 0);
    };
  }, [uid, premiumAi, busy]);
  return uid && s.uid === uid ? s.read : null;
}
