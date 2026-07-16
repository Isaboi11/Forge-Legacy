import { useCallback, useRef, useState } from 'react';

/**
 * The reusable WRITE pattern (Phase 3) — the mutation counterpart to `useQuery`. Every screen that
 * writes to Supabase uses this so pending/error/rollback are handled one way everywhere.
 *
 * `mutate(input, { onSuccess, onError })` runs `fn`, tracks `pending`, and captures a thrown error as
 * a message (never throws to the caller — it resolves to `null` on failure). OPTIMISTIC updates are the
 * caller's to apply: mutate the UI before calling, and undo it in `onError`. The hook guarantees `fn`
 * runs at most once concurrently (a second `mutate` while pending is ignored) so a double-tap can't
 * double-write.
 */
export function useMutation<Input, Result>(
  fn: (input: Input) => Promise<Result>,
): {
  mutate: (input: Input, opts?: { onSuccess?: (r: Result) => void; onError?: (e: string) => void }) => Promise<Result | null>;
  pending: boolean;
  error: string | null;
  reset: () => void;
} {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const reset = useCallback(() => setError(null), []);

  const mutate = useCallback(
    async (input: Input, opts?: { onSuccess?: (r: Result) => void; onError?: (e: string) => void }) => {
      if (inFlight.current) return null; // guard against double-submit
      inFlight.current = true;
      setPending(true);
      setError(null);
      try {
        const result = await fn(input);
        opts?.onSuccess?.(result);
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        opts?.onError?.(message);
        return null;
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    },
    [fn],
  );

  return { mutate, pending, error, reset };
}
