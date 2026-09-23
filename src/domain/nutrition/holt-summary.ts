/**
 * What Holt is allowed to know about what the athlete ate — and it is only ever FACTS.
 *
 * `Nutrition-Architecture-Amendment-001` (2026-09-23, PO: *"Holt can say facts and reviews. Totally
 * fine to do that."*) settles the scope the architecture had owed since §13 row 9. This module is the
 * whole of the reading half: a short, deterministic line built on the device from the diary, attached
 * to a question only when the question is about food.
 *
 * ══ WHAT IT SAYS ══
 *
 *   Nutrition, last 7 days: 2,320 cal/day over 6 logged days (1 unlogged). Target 2,500 — in range on
 *   2 of 6. Avg protein 165 g, carbs 240 g, fat 78 g. Today so far: 1,180 cal.
 *
 * ⚠ **NO JUDGEMENT LIVES HERE.** Not "you are under-eating", not "protein is low" — counted values and
 * nothing else. `Coach-AI-Amendment-001` CA-D10 already puts general nutrition inside Holt's scope while
 * forbidding him to **diagnose** or **prescribe diets**; giving him a pre-formed verdict would be
 * handing him the prescription and calling it context. He reads the numbers and answers as a coach.
 *
 * ⚠ **THE SAME TWO RULES THE REST OF NUTRITION OBEYS.** Today is excluded from the average (an
 * unfinished day is not a light one) and an unlogged day is never a zero — both are stated in the line
 * so the model cannot misread a short week as a starving one.
 *
 * ⚠ **IT RIDES ONLY ON A NUTRITION QUESTION** (CA-D5, "only what the job needs"), exactly as the
 * training summary rides only on a training question. An ordinary question pays neither the read nor
 * the tokens.
 *
 * Pure, relative-imported, tested. NUT-D4.
 */

import type { Macros, Targets } from './day.ts';
import { grouped } from './day.ts';
import type { WeekDay } from './week.ts';

/** The wire ceiling. The builder aims well under it. */
export const NUTRITION_SUMMARY_CHARS = 420;

/* ── is this a food question ──────────────────────────────────────────────── */

const NUTRITION = [
  /\b(calories?|kcal|macros?|protein|carb(s|ohydrates?)?|fats?|fibre|fiber|sugars?|sodium)\b/i,
  /\b(eat|eating|ate|diet|meal|meals|food|nutrition|bulk|bulking|cut|cutting|deficit|surplus|maintenance)\b/i,
  /\b(breakfast|lunch|dinner|snack|snacks)\b/i,
];

/**
 * ⚠ Narrowed deliberately. "cut" and "fat" are also training words — *"should I cut my rest times"*,
 * *"fat grip bar"*, *"cut the last set"* — so a bare match is not enough: the question also has to be
 * about the athlete THEMSELVES, which is the same test `isTrainingQuestion` applies for the same reason.
 */
const NOT_NUTRITION = /\b(cut (the|my|a) (last|final|rest|set|sets|time|times|warm)|fat (grip|gripz|bar|pad)|body ?fat (test|scan|caliper))\b/i;

export function isNutritionQuestion(text: string): boolean {
  const t = (text ?? '').trim();
  if (!t) return false;
  if (NOT_NUTRITION.test(t)) return false;
  return NUTRITION.some((re) => re.test(t));
}

/* ── the line ─────────────────────────────────────────────────────────────── */

export interface NutritionSummaryInput {
  /** The seven days on screen in Nutrition Details, already assembled by `buildWeek`. */
  week: readonly WeekDay[];
  /** The target in force today, or null when none is set. */
  target: Targets | null;
  /** Today's running total, which is stated separately and never averaged in. */
  todaySoFar: number | null;
  average: Macros;
  counted: number;
  missed: number;
  inRange: number;
}

/**
 * The whole of what Holt sees about food. Null when there is nothing to say — a week with no logged
 * day gives him nothing rather than a line of zeroes, because "you ate nothing" is a claim the diary
 * cannot support.
 */
export function summariseNutrition(input: NutritionSummaryInput): string | null {
  const { average, counted, missed, inRange, target, todaySoFar } = input;
  if (counted === 0 && !todaySoFar) return null;

  const parts: string[] = [];

  if (counted > 0) {
    const unlogged = missed > 0 ? ` (${missed} unlogged)` : '';
    parts.push(
      `Nutrition, last 7 days: ${grouped(average.kcal)} cal/day over ${counted} logged ${counted === 1 ? 'day' : 'days'}${unlogged}, today excluded.`,
    );
    if (target && target.kcal > 0) {
      parts.push(`Target ${grouped(target.kcal)} — in range on ${inRange} of ${counted}.`);
    } else {
      parts.push('No daily target set.');
    }
    parts.push(
      `Avg protein ${Math.round(average.protein)} g, carbs ${Math.round(average.carb)} g, fat ${Math.round(average.fat)} g.`,
    );
  } else {
    parts.push('Nutrition: nothing logged in the last 7 days before today.');
  }

  /* Stated as "so far" precisely so the model cannot read a half-eaten day as a finished one. */
  if (todaySoFar && todaySoFar > 0) parts.push(`Today so far: ${grouped(todaySoFar)} cal.`);

  const line = parts.join(' ');
  return line.length > NUTRITION_SUMMARY_CHARS ? `${line.slice(0, NUTRITION_SUMMARY_CHARS - 1)}…` : line;
}
