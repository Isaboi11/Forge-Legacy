/**
 * ══ HOLT REMEMBERS YOU — the Sprint 4b contract module (Docs/AI-Sprint-4b-Build-Notes.md) ══
 *
 * Names and numbers both lanes build against. Append only, never rename. Lane A fills `keepFact`;
 * lane B's stored-chat rules live in `past-chats.ts` against `StoredTurn` below.
 *
 * Pure and import-free so `node --test` and the bundled function code can both use it.
 */

/** §1.1 — sent beside `actions_v1` by an app that understands memory. Without it coach-ask is 4a's, byte for byte. */
export const HOLT_MEMORY_CAPS = 'memory_v1';

/** §1.3 — what kind of thing a kept fact is (`holt_notes.kind`, 0278). Null on notes kept before 0278. */
export const FACT_KINDS = ['schedule', 'gym', 'like', 'dislike', 'avoid', 'goal', 'other'] as const;
export type FactKind = (typeof FACT_KINDS)[number];

export interface KeptFact {
  kind: FactKind;
  text: string;
}

/** §1.2 — the rolling recap of a chat's older turns. */
export const RECAP_MAX_CHARS = 600;
/** The recap's ceiling on the wire (`earlier`); the server trims again. */
export const RECAP_WIRE_CHARS = 800;
/** Recap once at least this many spoken turns have fallen out of the window and are not yet in it. */
export const RECAP_BATCH = 4;

export interface ChatRecap {
  text: string;
  /** How many spoken turns, counted from the start of the chat, the recap covers. */
  through: number;
}

/** §1.5 — the past chats screen. */
export const PAST_CHATS_ROUTE = '/holt-chats';

/** §1.5 — one line of a stored chat. `note` = the app's bracketed card note (as `summaryHistory` writes them). */
export interface StoredTurn {
  role: 'athlete' | 'holt' | 'note';
  text: string;
}

/**
 * §1.3 — the memory filter: may this fact be KEPT? ⛔ STUB (lane A replaces the body): keeps nothing, so nothing
 * can be stored until the real filter exists.
 */
export function keepFact(_fact: { kind?: unknown; text?: unknown }): KeptFact | null {
  return null;
}
