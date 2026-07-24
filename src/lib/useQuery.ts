import { useCallback, useEffect, useState } from 'react';

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
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
 * Readable text for anything thrown. Supabase/PostgREST reject with a PLAIN OBJECT
 * (`{ message, details, hint, code }`), not an `Error` — so the old `String(e)` fallback rendered every
 * database failure as a useless "[object Object]", hiding the one piece of information worth having.
 */
function errorMessage(e: unknown): string {
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

export function useQuery<T>(
  fn: () => Promise<T>,
  deps: readonly unknown[] = [],
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [state, setState] = useState<QueryState<T>>({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    fn().then(
      (result) => {
        if (alive) setState({ data: result, loading: false, error: null });
      },
      (e: unknown) => {
        if (alive) setState({ data: null, loading: false, error: errorMessage(e) });
      },
    );
    return () => {
      alive = false;
    };
    // fn is intentionally excluded — callers pass an inline closure; `deps` is the stable key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data: state.data, loading: state.loading, error: state.error, refetch };
}
