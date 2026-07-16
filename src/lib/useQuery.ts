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
        if (alive) setState({ data: null, loading: false, error: e instanceof Error ? e.message : String(e) });
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
