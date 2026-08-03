/**
 * The seen-set's storage mechanics, extracted from `screen-prompts.ts` so they can be tested against a
 * fake store (the `program-draft-model.ts` idiom: pure/injectable core, thin AsyncStorage wrapper beside it).
 *
 * IT EXISTS BECAUSE THE OBVIOUS IMPLEMENTATION LOSES WRITES, and the symptom is the one thing this whole
 * subsystem promises not to do.
 *
 * Marking a surface seen is a read-modify-write over ONE array holding all 28 keys. Two of them running at
 * once — and they do; Program Builder hosts two walkthroughs on one screen, and moving quickly between
 * surfaces overlaps them — interleaves like this:
 *
 *     mark('workouts')          mark('legacy')
 *       read → []
 *                                 read → []              ← both saw the empty set
 *       write ['workouts']
 *                                 write ['legacy']       ← 'workouts' is gone
 *
 * Nothing looks wrong at the time: the provider holds its own in-memory set, so the athlete finishes both
 * walkthroughs and neither reappears. **The loss only surfaces on the next launch, when the tour they
 * completed yesterday fires again** — which reads as "the tutorial keeps coming back" and is impossible to
 * reproduce on demand, because it depends on which write landed last.
 *
 * Every operation is therefore SERIALIZED through one promise chain. Reads join the queue too, so a read
 * that follows a write sees it — `startTour` clears the set and the provider re-reads, and an unqueued
 * read could return the entries the clear was about to remove.
 */

export interface AsyncKeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Parse a stored set, dropping anything that is no longer a known key. Never throws. */
export function parseSeen<T extends string>(raw: string | null, isKey: (x: unknown) => x is T): T[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isKey) : [];
  } catch {
    return [];
  }
}

export interface SeenSet<T extends string> {
  read(): Promise<T[]>;
  /** Add a key. Idempotent, and safe to call concurrently with other marks. */
  mark(key: T): Promise<void>;
  clear(): Promise<void>;
}

export function createSeenSet<T extends string>(opts: {
  store: AsyncKeyValueStore;
  storageKey: string;
  isKey: (x: unknown) => x is T;
}): SeenSet<T> {
  const { store, storageKey, isKey } = opts;

  // The tail of the chain. Each operation appends itself; the `catch` keeps one failed write from
  // poisoning every operation queued behind it (storage is best-effort — a failure means the walkthrough
  // shows again, which is recoverable; a stuck queue would mean nothing is ever recorded again).
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = <R,>(job: () => Promise<R>): Promise<R> => {
    const next = queue.then(job, job);
    queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };

  const readNow = async (): Promise<T[]> => {
    try {
      return parseSeen(await store.getItem(storageKey), isKey);
    } catch {
      return [];
    }
  };

  return {
    read: () => enqueue(readNow),

    mark: (key: T) =>
      enqueue(async () => {
        try {
          const seen = await readNow();
          if (seen.includes(key)) return;
          await store.setItem(storageKey, JSON.stringify([...seen, key]));
        } catch {
          // best-effort; a failed write just shows that walkthrough again next launch
        }
      }),

    clear: () =>
      enqueue(async () => {
        try {
          await store.removeItem(storageKey);
        } catch {
          // best-effort
        }
      }),
  };
}
