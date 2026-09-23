import AsyncStorage from '@react-native-async-storage/async-storage';

import { enqueue, readableOutbox, type OutboxItem, type OutboxOp } from '@/domain/nutrition/outbox';
import { uuid } from '@/lib/app-session';

/**
 * The food diary's offline storage — the held-write queue and the last-read cache. Storage only: the
 * replay lives in `nutrition-live.ts` beside the writes it repeats, so there is one place that knows how a
 * row is shaped. The pure half, and the rationale, is `domain/nutrition/outbox.ts`.
 *
 * ⚠ **EVERY QUEUE MUTATION GOES THROUGH `mutate`.** AsyncStorage has no transactions, and a hold and a
 * drain's retire are both read-modify-write. Two of them interleaved would lose one — a held breakfast
 * gone, or a replayed one replayed again. Chaining them makes that impossible rather than unlikely.
 *
 * Silent by spec, like the workout queue (W-9 §13.4): nothing here renders, and every storage failure is
 * swallowed into "nothing held" / "nothing cached" rather than thrown at a screen.
 */

const QUEUE_KEY = 'forge.nutritionOutbox.v1';
const CACHE_PREFIX = 'forge.nutritionCache.v1:';
const LAST_ATHLETE_KEY = 'forge.nutritionLastAthlete.v1';

let chain: Promise<unknown> = Promise.resolve();

function mutate<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

async function readQueue(): Promise<OutboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? readableOutbox(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

async function writeQueue(list: OutboxItem[]): Promise<void> {
  if (list.length === 0) await AsyncStorage.removeItem(QUEUE_KEY);
  else await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(list));
}

/**
 * Hold one write. Returns `false` when it could not be recorded, so the caller surfaces the original
 * error rather than telling the athlete a meal is logged when nothing kept it.
 */
export function holdOp(athleteId: string, op: OutboxOp): Promise<boolean> {
  if (!athleteId) return Promise.resolve(false);
  const item: OutboxItem = { v: 1, key: uuid(), athleteId, queuedAt: new Date().toISOString(), op };
  return mutate(async () => {
    try {
      await writeQueue(enqueue(await readQueue(), item));
      return (await readQueue()).some((i) => i.key === item.key);
    } catch {
      return false;
    }
  });
}

/** Every held item — all athletes. Callers filter with `opsFor`, which is where ownership is enforced. */
export function heldItems(): Promise<OutboxItem[]> {
  return readQueue();
}

/** Retire one replayed (or permanently rejected) item, leaving anything appended meanwhile in place. */
export function retire(key: string): Promise<void> {
  return mutate(async () => {
    try {
      await writeQueue((await readQueue()).filter((i) => i.key !== key));
    } catch {
      /* A retire that did not stick means the op replays once more — idempotent, so harmless. */
    }
  });
}

/**
 * The last successful read of something, per athlete, so a screen opened with no signal shows what it
 * showed last time instead of an empty diary. Keyed by athlete for the same shared-phone reason the
 * queue is.
 */
export async function readCache<T>(athleteId: string, key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${athleteId}:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function writeCache(athleteId: string, key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(`${CACHE_PREFIX}${athleteId}:${key}`, JSON.stringify(value));
  } catch {
    /* best-effort — a cache that cannot be written is only a slower offline open */
  }
}

/**
 * The last athlete seen signed in — for the one case `nutrition-live.ts` `athleteId` documents: a token
 * that expired while offline. Null clears it (a real sign-out).
 */
export async function readLastAthlete(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_ATHLETE_KEY);
  } catch {
    return null;
  }
}

export async function writeLastAthlete(id: string | null): Promise<void> {
  try {
    if (id) await AsyncStorage.setItem(LAST_ATHLETE_KEY, id);
    else await AsyncStorage.removeItem(LAST_ATHLETE_KEY);
  } catch {
    /* best-effort */
  }
}
