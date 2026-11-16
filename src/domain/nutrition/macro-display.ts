/**
 * Which macros the athlete sees (Nutrition-Architecture-Amendment-007, PO 2026-11-16: *"should we give the
 * option to just show the macros you want?"* → yes). Calories always show. Protein, carbs and fat can each be
 * turned off on Daily targets.
 *
 * ⚠ THIS IS A DISPLAY CHOICE, NEVER A DATA ONE. Every food still logs all three, targets still hold all three,
 *   and Holt still reads all three. Turning carbs back on shows a full history, because nothing was dropped.
 *   It changes three surfaces only: the Nutrition tab's rings, the Home card's macro line, and the macro rows
 *   on Details. A food's own facts (Food detail) and the Meal Plan still show all three: those describe the
 *   food or the plan, not what the athlete tracks.
 *
 * ⚠ STORED AS THE **HIDDEN** LIST, so absence means "all three shown". Every `app_prefs` blob written before
 *   this key existed lands on today's screen, unchanged, and nobody loses a ring on an update.
 *
 * Pure and dependency-free so `domain/settings/preferences.ts` can import it relatively (`node --test`).
 */

export type MacroKey = 'protein' | 'carb' | 'fat';

/** The one order every surface draws them in. */
export const MACRO_KEYS: readonly MacroKey[] = ['protein', 'carb', 'fat'];

export const MACRO_LABEL: Record<MacroKey, string> = { protein: 'Protein', carb: 'Carbs', fat: 'Fat' };

/** Only known keys survive, once each, in the canonical order. Anything malformed means "none hidden". */
export function sanitizeHiddenMacros(raw: unknown): MacroKey[] {
  if (!Array.isArray(raw)) return [];
  return MACRO_KEYS.filter((k) => raw.includes(k));
}

/** The macros to draw, in order. May be empty: then the athlete tracks calories only. */
export function shownMacros(hidden: readonly MacroKey[]): MacroKey[] {
  return MACRO_KEYS.filter((k) => !hidden.includes(k));
}

export function isMacroShown(hidden: readonly MacroKey[], key: MacroKey): boolean {
  return !hidden.includes(key);
}

/** The hidden list after one switch flips — canonical order, no duplicates. */
export function setMacroShown(hidden: readonly MacroKey[], key: MacroKey, show: boolean): MacroKey[] {
  const next = new Set(hidden);
  if (show) next.delete(key);
  else next.add(key);
  return MACRO_KEYS.filter((k) => next.has(k));
}

/**
 * The side inset that keeps one or two macro rings at the width they have three-up, centred under the
 * calorie ring. A percentage of the row's own width (which is definite: it stretches across the screen).
 * Three rings → 0; two → a sixth each side; one → a third each side.
 */
export function macroRowInset(count: number): `${number}%` {
  const n = Math.max(1, Math.min(3, Math.round(count)));
  return `${Math.round(((3 - n) / 6) * 100000) / 1000}%`;
}

/** The short line under the switches on Daily targets. */
export const MACRO_DISPLAY_NOTE = 'Calories always show. A hidden macro is still logged, so turning it back on shows its full history.';
