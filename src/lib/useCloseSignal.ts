import { useCallback, useEffect, useRef } from 'react';

/**
 * A fresh `AbortSignal` for one AI call, aborted when this screen goes away (AI Road to 10 Sprint 1, PL-3 / P-G3).
 *
 *     const closeSignal = useCloseSignal();
 *     …in a handler: const r = await readMealPhoto(uri, closeSignal());
 *
 * Nobody is left to read an answer to a closed screen, so the request stops there and is reported as a cancel,
 * never as a failure. Call the getter in a handler, never during render.
 *
 * The same pattern the chat sheet keeps for its asks (`asking`): one controller per call, every live one aborted
 * on unmount. React's development double-mount runs the cleanup before any call has been made, so it aborts
 * nothing.
 */
export function useCloseSignal(): () => AbortSignal {
  const live = useRef(new Set<AbortController>());
  useEffect(() => {
    const calls = live.current;
    return () => {
      for (const c of calls) c.abort();
      calls.clear();
    };
  }, []);
  return useCallback(() => {
    /* One per call; aborting one that already answered does nothing. A screen makes a handful in its life. */
    const c = new AbortController();
    live.current.add(c);
    return c.signal;
  }, []);
}
