import type { LogEntry, MealSlot } from './day.ts';

/**
 * The food diary's offline outbox — the pure half (Nutrition Architecture §12 Phase 1, "offline-safe log").
 *
 * A food log is written in a kitchen, a basement gym, a plane. `nutrition-live.ts` already mints every
 * row's id on the device so a retry cannot double-log; this is the other half — a write that could not
 * reach the server is HELD, drawn on the day as if it had landed, and replayed when the app next comes
 * to the foreground with signal.
 *
 * No AsyncStorage, no Supabase, no React — so `node --test` can prove the overlay, which is the part a
 * wrong answer would show the athlete as a missing breakfast or a meal eaten twice.
 *
 * ══ WHY REPLAY IS SAFE HERE WHEN IT IS NOT FOR A WORKOUT ══
 *
 * `pending-save.ts` must ask the server "did this already land?" before every replay, because
 * `save_workout` has no idempotency key. Every op here is idempotent by construction: an add is an upsert
 * on a device-minted id, and remove / update / move all address one row by id. Replaying an op whose
 * response was lost is a no-op, never a second helping.
 *
 * ══ ⚠ "CLEAR MEAL" IS QUEUED AS IDS, NEVER AS A FILTER ══
 *
 * Online, `clearMeal` deletes by (day, meal). Held for an hour and replayed, that filter would also
 * delete whatever was logged into that meal AFTER the clear — from this phone once signal returned, or
 * from the web. So the caller turns a clear into one `remove` per row the athlete could see.
 */

/** The row fields a portion edit changes — `updateEntry`'s patch, in `LogEntry` terms. */
export interface EntryPatch {
  quantity: number;
  servingLabel: string | null;
  grams: number | null;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

export type OutboxOp =
  | { kind: 'add'; iso: string; entries: LogEntry[] }
  | { kind: 'remove'; id: string }
  | { kind: 'update'; id: string; patch: EntryPatch }
  /**
   * `entry` is the row as the athlete saw it when they moved it. The destination day may never have been
   * fetched on this device, so without the snapshot an offline move would make the food vanish from both
   * days until the drain ran.
   */
  | { kind: 'move'; id: string; iso: string; meal: MealSlot; entry: LogEntry | null };

export interface OutboxItem {
  /** Bumped if the shape changes; an item from an older build is dropped rather than guessed at. */
  v: 1;
  /** Device-minted, so the drain can retire exactly the item it replayed while new ones are appended. */
  key: string;
  /**
   * ⚠ WHOSE DIARY — LOAD-BEARING, for the same reason as `PendingSave.athleteId`: the queue is on the
   * device and sign-in is not. Two testers share phones on this project routinely. The drain and the
   * overlay both match on this and touch nothing else.
   */
  athleteId: string;
  queuedAt: string;
  op: OutboxOp;
}

/**
 * A ceiling, so a phone that stays offline for weeks cannot grow the queue without bound. Five hundred
 * ops is months of logging; past it the OLDEST goes first.
 */
export const MAX_OUTBOX = 500;

export function enqueue(list: OutboxItem[], item: OutboxItem): OutboxItem[] {
  const next = [...list, item];
  return next.length > MAX_OUTBOX ? next.slice(next.length - MAX_OUTBOX) : next;
}

/** Only items that are well-formed, current-version, and owned. Anything else is dropped, never thrown. */
export function readableOutbox(raw: unknown): OutboxItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (i): i is OutboxItem =>
      !!i &&
      typeof i === 'object' &&
      (i as OutboxItem).v === 1 &&
      typeof (i as OutboxItem).key === 'string' &&
      typeof (i as OutboxItem).athleteId === 'string' &&
      (i as OutboxItem).athleteId.length > 0 &&
      !!(i as OutboxItem).op &&
      typeof (i as OutboxItem).op.kind === 'string',
  );
}

/** This athlete's ops, oldest first — the order they were made in, which is the order they replay in. */
export function opsFor(list: OutboxItem[], athleteId: string | null): OutboxOp[] {
  if (!athleteId) return [];
  return list.filter((i) => i.athleteId === athleteId).map((i) => i.op);
}

/**
 * One day as the athlete should see it: what the server (or the last cached read) had, with every held
 * op applied on top, in order.
 *
 * Applying an op the server has ALREADY applied changes nothing — an add re-sets the same row, a remove
 * removes nothing — which is what lets the screen overlay the queue on a fresh server read without
 * knowing how much of it has drained.
 */
export function overlayDay(iso: string, base: LogEntry[], ops: OutboxOp[]): LogEntry[] {
  const rows = new Map<string, LogEntry>();
  for (const e of base) rows.set(e.id, e);

  for (const op of ops) {
    switch (op.kind) {
      case 'add':
        if (op.iso === iso) for (const e of op.entries) rows.set(e.id, e);
        break;
      case 'remove':
        rows.delete(op.id);
        break;
      case 'update': {
        const cur = rows.get(op.id);
        if (cur) rows.set(op.id, { ...cur, ...op.patch });
        break;
      }
      case 'move': {
        if (op.iso !== iso) {
          rows.delete(op.id);
          break;
        }
        const cur = rows.get(op.id) ?? op.entry;
        if (cur) rows.set(op.id, { ...cur, meal: op.meal });
        break;
      }
    }
  }
  return [...rows.values()];
}

