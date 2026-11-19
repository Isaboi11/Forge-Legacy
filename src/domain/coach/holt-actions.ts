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

/**
 * Holt Listens (PO D12, 2026-11-19): "AI rewrites, the app checks". An app that sends this beside `actions_v1` is offered
 * `propose_program_change` — one tool for ANY change to the program they run. Old apps never see it.
 */
export const CHANGE_CAPS = 'change_v1';
export const CHANGE_ACTIONS = ['propose_program_change', 'undo_last_change'] as const;

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

export type HoltActionName = (typeof LEGACY_ACTIONS)[number] | (typeof NEW_ACTIONS)[number] | (typeof CHANGE_ACTIONS)[number];

export const isHoltAction = (name: unknown): name is HoltActionName =>
  typeof name === 'string' &&
  ((LEGACY_ACTIONS as readonly string[]).includes(name) ||
    (NEW_ACTIONS as readonly string[]).includes(name) ||
    (CHANGE_ACTIONS as readonly string[]).includes(name));

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
  /**
   * Lane C (append): what the APP resolved for this card — ids, catalogue keys, the date, the numbers on it. The
   * executor is handed THIS, not the model's input, so Confirm writes exactly what the card showed. Absent = the
   * executor takes `action.input` (B's meal cards).
   */
  plan?: Record<string, unknown>;
}

/** Opaque: whatever the executor needs to put things back exactly as they were. */
export type UndoToken = { action: HoltActionName; [k: string]: unknown };

export type ApplyResult =
  | {
      ok: true;
      undo: UndoToken;
      said: string;
      /** Lane C (append): a route the sheet hands off to after the write (start_workout → '/workout', open_door). */
      go?: string;
      /** Lane C (append): set when there is nothing to undo, saying why in plain words. The card then shows no Undo. */
      noUndo?: string;
    }
  | { ok: false; reason: 'offline' | 'not_allowed' | 'gone' | 'failed' };

/** Each action's executor. A failed `apply` leaves nothing behind (each executor has a test that says so). */
export interface HoltActionExecutor<I = Record<string, unknown>> {
  apply(input: I, opts?: { key?: string }): Promise<ApplyResult>;
  undo(token: UndoToken): Promise<boolean>;
}

/** §1.9 — the app's `holt_action` event. Names only. */
export type HoltActionOutcome = 'confirmed' | 'undone' | 'dismissed' | 'failed';

/*
 * ══ LANE C (append) — the inputs the app reads for the training actions ══
 *
 * Lane A's tool definitions send these field names; the app narrows each one and resolves every id, key, date and
 * number itself (`holt-action-cards.ts`). Words only from the model — the one number it may pass is a pace the
 * athlete said ("a pound a week"), which `recommend()` then clamps.
 */
/** "Swap bench for dumbbell bench today": the athlete's words for both exercises. */
export interface SwapExerciseTodayInput {
  from: string;
  to: string;
}
/** "Start my workout" (no name = today's session) or "start push day" / "start my Upper A template". */
export interface StartWorkoutInput {
  name?: string;
}
/** "Put legs on Thursday": the day in words ("thursday", "tomorrow", "next monday", "the 24th") and what. */
export interface ScheduleSessionInput {
  when: string;
  what?: string;
}
/** "Set my targets to lose a pound a week": goal and pace as said. Never calories or macros. */
export interface SetTargetsInput {
  goal: 'lose' | 'maintain' | 'gain';
  /** Pounds a week, as the athlete said it. Optional: the Targets screen's default is used without it. */
  pace?: number;
}
/** "Remember I train at 6am": the athlete's own words, one line. */
export interface RememberNoteInput {
  text: string;
}
/** "Take me to my targets". */
export interface OpenDoorInput {
  door: Door;
}
