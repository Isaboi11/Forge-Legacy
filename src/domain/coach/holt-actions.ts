/**
 * HOLT'S ACTIONS — the shared contract for AI Road to 10 Sprint 4a "Holt can do things".
 * `Docs/AI-Sprint-4a-Build-Notes.md` §1.2–§1.3 (PO 2026-11-18: always a card with Confirm, then Undo; nothing silent).
 *
 * The model calls an action tool; `coach-ask` never performs it — it forwards `{action:{name,input}}` to the app.
 * The app holds every action of a turn until the turn ends cleanly (`cardsMayShow`), draws one card per action
 * (`HoltActionCard`), and writes only when the athlete taps Confirm. Every write returns an Undo token.
 *
 * ⚠ NO IMPORTS — `coach-ask` bundles this file. Append only; never rename a name (old phones match by name).
 */

/** What a new app sends in `coach-ask`'s body. Without it, the function offers only the v28 tools (§1.1). */
export const HOLT_ACTION_CAPS = 'actions_v1';

/** Actions every shipped app already understands. */
export const LEGACY_ACTIONS = ['propose_program_edit', 'offer_online_recipe_search'] as const;

/** Actions offered only to an app that sent `HOLT_ACTION_CAPS`. */
export const NEW_ACTIONS = [
  'propose_program',
  'propose_day',
  'remember_note',
  'open_door',
  'log_food',
  'propose_meal',
  'swap_exercise_today',
  'start_workout',
  'schedule_session',
  'set_targets',
] as const;

export type HoltActionName = (typeof LEGACY_ACTIONS)[number] | (typeof NEW_ACTIONS)[number];

export const isHoltAction = (name: unknown): name is HoltActionName =>
  typeof name === 'string' && ((LEGACY_ACTIONS as readonly string[]).includes(name) || (NEW_ACTIONS as readonly string[]).includes(name));

/** Where `open_door` may go. Navigation only — no write. */
export const DOORS = ['import', 'pick', 'meal_plan', 'targets', 'form_check'] as const;
export type Door = (typeof DOORS)[number];

/**
 * §1.3 — may the held actions of a turn become cards? Only after a `done` that ended cleanly. A retract, an error,
 * a refusal, a length cut, a timeout, Stop or a closed sheet drops them all: a refused or cut-off reply writes nothing.
 */
export function cardsMayShow(end: { done: boolean; stop?: unknown; retracted?: boolean; error?: unknown; aborted?: boolean }): boolean {
  if (!end.done || end.retracted || end.error || end.aborted) return false;
  return end.stop === 'end_turn' || end.stop === 'tool_use';
}

/** One forwarded action, as the app reads it off the wire. `input` is narrowed by the action's owner. */
export interface HoltAction {
  name: HoltActionName;
  input: Record<string, unknown>;
}

/** What a card shows. Every number on it is the APP's (computed before Confirm), never the model's. */
export interface ActionCardModel {
  action: HoltActionName;
  title: string;
  /** What will change, one line each ("Bench Press → Dumbbell Bench Press, today only"). */
  rows: { label: string; value?: string; note?: string }[];
  /** null = this card cannot be confirmed; `blocked` says why in plain words (under-18 targets, an unweighed food…). */
  confirmLabel: string | null;
  blocked?: string;
  /** A second write the card offers (propose_meal: "Save as a meal" beside "Log it"). */
  secondary?: { label: string; key: string };
  /** A credit line the licence needs (FatSecret, HF-D5). */
  credit?: string;
}

/** Opaque: whatever the executor needs to put things back exactly as they were. */
export type UndoToken = { action: HoltActionName; [k: string]: unknown };

export type ApplyResult = { ok: true; undo: UndoToken; said: string } | { ok: false; reason: 'offline' | 'not_allowed' | 'gone' | 'failed' };

/** Each action's executor. A failed `apply` leaves nothing behind (each executor has a test that says so). */
export interface HoltActionExecutor<I = Record<string, unknown>> {
  apply(input: I, opts?: { key?: string }): Promise<ApplyResult>;
  undo(token: UndoToken): Promise<boolean>;
}

/** §1.9 — the app's `holt_action` event. Names only. */
export type HoltActionOutcome = 'confirmed' | 'undone' | 'dismissed' | 'failed';
