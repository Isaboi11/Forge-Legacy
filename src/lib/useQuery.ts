import { useCallback, useEffect, useState } from 'react';

import { plainError } from './plain-error.ts';

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  settled: boolean;
}

/**
 * The reusable data-fetch pattern (Phase 2) — `{ data, loading, error, refetch }`. Every screen that
 * reads from Supabase uses this so loading/empty/error are handled one way everywhere. Runs `fn` on
 * mount and whenever `deps` change; `refetch()` re-runs it (and shows loading again). A resolved
 * result is ignored after unmount / once superseded.
 *
 * State is a single object so the effect only ever calls setState inside its async callbacks — never
 * synchronously in the effect body (which cascades renders). The loading reset lives in `refetch`,
 * an event-time callback. `empty` is left to the caller (it's data-shape-specific).
 */
/**
 * The sentence to SHOW for anything thrown — every toast and every screen's `error` string comes through
 * here, so this is the one place a database message could reach the athlete, and it no longer can
 * (QA 09-26 B4: `invalid input syntax for type uuid: "abc" (22P02)` was on screen). The mapping lives in
 * `lib/plain-error`, where `node --test` holds it.
 */
export function errorMessage(e: unknown): string {
  return plainError(e);
}

/**
 * The thrown thing AS IT CAME, for the operator's dashboard and for logs — never for an athlete's screen.
 * Supabase/PostgREST reject with a PLAIN OBJECT (`{ message, details, hint, code }`), not an `Error` — so
 * a `String(e)` fallback renders every database failure as a useless "[object Object]".
 */
export function rawErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    const o = e as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [o.message, o.details, o.hint].filter((x): x is string => typeof x === 'string' && x.length > 0);
    if (parts.length) return o.code ? `${parts.join(' — ')} (${String(o.code)})` : parts.join(' — ');
    try {
      return JSON.stringify(e);
    } catch {
      return 'Unknown error';
    }
  }
  return String(e);
}

/**
 * `settled` — this read has come back AT LEAST ONCE, by either door.
 *
 * ══ WHY IT IS NOT `!loading`, AND WHY IT LATCHES ══
 *
 * It exists for callers that hold a whole screen until every read is in (Home). Two properties make that
 * possible, and `loading` has neither:
 *
 *   IT COUNTS A FAILURE AS AN ANSWER. A read that threw is never going to arrive, and a screen waiting
 *   for `loading` to go false on a query that already rejected is waiting for a frame that has been and
 *   gone. Error IS settled; what the caller draws about it is the caller's business.
 *
 *   IT NEVER GOES BACK. `refetch` deliberately sets `loading` true again — that is what makes a screen's
 *   spinner reappear — so a first-paint gate reading `loading` would BLANK ITSELF every time the athlete
 *   came back to the tab, which is a far worse stutter than the one it was added to fix. Home refetches
 *   five queries on every focus. `settled` answers "has this ever resolved", so it is true from the first
 *   answer to the end of the mount.
 */
export function useQuery<T>(
  fn: () => Promise<T>,
  deps: readonly unknown[] = [],
): { data: T | null; loading: boolean; error: string | null; settled: boolean; refetch: () => void } {
  const [state, setState] = useState<QueryState<T>>({ data: null, loading: true, error: null, settled: false });
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    fn().then(
      (result) => {
        if (alive) setState({ data: result, loading: false, error: null, settled: true });
      },
      (e: unknown) => {
        if (alive) setState({ data: null, loading: false, error: errorMessage(e), settled: true });
      },
    );
    return () => {
      alive = false;
    };
    // fn is intentionally excluded — callers pass an inline closure; `deps` is the stable key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data: state.data, loading: state.loading, error: state.error, settled: state.settled, refetch };
}
