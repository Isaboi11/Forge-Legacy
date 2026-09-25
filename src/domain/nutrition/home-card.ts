import { grouped, type Macros, type Targets } from './day.ts';

/**
 * The Nutrition card on Home (Nutrition-Architecture-Amendment-003 NUT-A3-D1, redrawn to the PO's mockup
 * 2026-09-24). Pure, so every state is tested rather than eyeballed:
 *
 *   · logged, with a target — what was eaten, big, and what is LEFT under it ("2,420 left").
 *   · nothing logged yet   — the day's targets, never a row of zeros; a zero reads as a failure at breakfast.
 *   · no target at all     — what was eaten, and an invitation to set one. No bars: there is nothing to fill.
 *
 * ⚠ FACTS, NEVER A VERDICT. Past a target it says "Target reached", never "over" or a red number. The same
 * rule as the rings on Nutrition Home and the "never pushes anyone to eat less" line in the Holt check-ins.
 */
export type MacroKey = 'protein' | 'carb' | 'fat';

export interface HomeNutritionCell {
  value: string;
  label: string;
  sub: string;
  /** 0–1, how full the bar is. Always 0 with no target. */
  fraction: number;
}

export interface HomeNutritionView {
  calories: HomeNutritionCell;
  macros: (HomeNutritionCell & { key: MacroKey; unit: 'g' })[];
  /** One sentence for a screen reader: the card is a single button. */
  a11y: string;
}

const MACROS: { key: MacroKey; label: string }[] = [
  { key: 'protein', label: 'Protein' },
  { key: 'carb', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
];

const fill = (eaten: number, target: number): number => (target > 0 ? Math.max(0, Math.min(1, eaten / target)) : 0);

export function homeNutritionView(eaten: Macros, logged: boolean, target: Targets | null): HomeNutritionView {
  if (!target) {
    const macros = MACROS.map((m) => ({ ...m, unit: 'g' as const, value: String(Math.round(eaten[m.key])), sub: '', fraction: 0 }));
    return {
      calories: { value: grouped(Math.round(eaten.kcal)), label: 'Calories', sub: 'Set a daily target', fraction: 0 },
      macros,
      a11y: `Nutrition. ${grouped(Math.round(eaten.kcal))} calories eaten today. No daily target set yet.`,
    };
  }

  if (!logged) {
    const macros = MACROS.map((m) => ({ ...m, unit: 'g' as const, value: String(Math.round(target[m.key])), sub: 'to aim for', fraction: 0 }));
    return {
      calories: { value: grouped(target.kcal), label: 'Calories today', sub: 'Tap to log a meal', fraction: 0 },
      macros,
      a11y: `Nutrition. Today's target is ${grouped(target.kcal)} calories and ${Math.round(target.protein)} grams of protein. Nothing logged yet.`,
    };
  }

  const kcalLeft = Math.round(target.kcal - eaten.kcal);
  const macros = MACROS.map((m) => {
    const left = Math.round(target[m.key] - eaten[m.key]);
    return {
      ...m,
      unit: 'g' as const,
      value: String(Math.round(eaten[m.key])),
      sub: left > 0 ? `${left}g left` : 'Target reached',
      fraction: fill(eaten[m.key], target[m.key]),
    };
  });
  return {
    calories: {
      value: grouped(Math.round(eaten.kcal)),
      label: 'Calories',
      sub: kcalLeft > 0 ? `${grouped(kcalLeft)} left` : 'Target reached',
      fraction: fill(eaten.kcal, target.kcal),
    },
    macros,
    a11y:
      `Nutrition. ${grouped(Math.round(eaten.kcal))} of ${grouped(target.kcal)} calories. ` +
      macros.map((m) => `${m.label} ${m.value} grams, ${m.sub}`).join('. ') +
      '.',
  };
}
