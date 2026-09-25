import { grouped, type Macros, type Targets } from './day.ts';

/**
 * The Nutrition card on Home: TWO LINES (Nutrition-Architecture-Amendment-003 NUT-A3-D1). PO, 2026-09-24:
 * *"pretty minimal … a quick look and not taking over the page"*. It was redrawn from the first, half-screen
 * card to option A of the two shown: calories against the target with what is left, then each macro against
 * its target with a thin bar. The bars stay because they are the half-second read, the whole reason the card
 * is on Home. Pure, so every state is tested rather than eyeballed:
 *
 *   · logged, with a target — "190 / 2,610 cal · 2,420 left"; "Protein 16 /175g".
 *   · nothing logged yet   — the day's targets, never a row of zeros.
 *   · no target at all     — what was eaten, an invitation to set one, and no bars (nothing to fill).
 *
 * ⚠ FACTS, NEVER A VERDICT. Past a target it says "Target reached", never "over".
 */
export type MacroKey = 'protein' | 'carb' | 'fat';

export interface HomeNutritionView {
  /** Line one, bold: "190". */
  kcal: string;
  /** Line one, quiet, after it: "/ 2,610 cal" · "cal today" · "cal". */
  kcalOf: string;
  /** Line one, right: "2,420 left" · "Target reached" · "Tap to log" · "Set a target". */
  right: string;
  macros: { key: MacroKey; label: string; value: string; of: string; fraction: number }[];
  /** False with no target: nothing to fill, so no bars are drawn. */
  bars: boolean;
  /** The card is one button; this is its one sentence for a screen reader. */
  a11y: string;
}

const MACROS: { key: MacroKey; label: string }[] = [
  { key: 'protein', label: 'Protein' },
  { key: 'carb', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
];

const fill = (eaten: number, target: number): number => (target > 0 ? Math.max(0, Math.min(1, eaten / target)) : 0);
const r = Math.round;

export function homeNutritionView(eaten: Macros, logged: boolean, target: Targets | null): HomeNutritionView {
  if (!target) {
    return {
      kcal: grouped(r(eaten.kcal)),
      kcalOf: 'cal',
      right: 'Set a target',
      macros: MACROS.map((m) => ({ ...m, value: String(r(eaten[m.key])), of: 'g', fraction: 0 })),
      bars: false,
      a11y: `Nutrition. ${grouped(r(eaten.kcal))} calories eaten today. No daily target set yet.`,
    };
  }

  if (!logged) {
    return {
      kcal: grouped(target.kcal),
      kcalOf: 'cal today',
      right: 'Tap to log',
      macros: MACROS.map((m) => ({ ...m, value: String(r(target[m.key])), of: 'g', fraction: 0 })),
      bars: true,
      a11y: `Nutrition. Today's target is ${grouped(target.kcal)} calories and ${r(target.protein)} grams of protein. Nothing logged yet.`,
    };
  }

  const left = r(target.kcal - eaten.kcal);
  const macros = MACROS.map((m) => ({
    ...m,
    value: String(r(eaten[m.key])),
    of: `/${r(target[m.key])}g`,
    fraction: fill(eaten[m.key], target[m.key]),
  }));
  return {
    kcal: grouped(r(eaten.kcal)),
    kcalOf: `/ ${grouped(target.kcal)} cal`,
    right: left > 0 ? `${grouped(left)} left` : 'Target reached',
    macros,
    bars: true,
    a11y:
      `Nutrition. ${grouped(r(eaten.kcal))} of ${grouped(target.kcal)} calories, ${left > 0 ? `${grouped(left)} left` : 'target reached'}. ` +
      macros.map((m) => `${m.label} ${m.value} of ${r(target[m.key])} grams`).join(', ') +
      '.',
  };
}
