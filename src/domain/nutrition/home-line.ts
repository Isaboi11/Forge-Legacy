import { grouped, type Macros, type Targets } from './day.ts';

/**
 * The one food line on Home, under today's training (Nutrition-Architecture-Amendment-003 NUT-A3-D1).
 *
 * Facts, never a verdict: "2,600 of 2,400 cal" is stated, not scolded, and there is no "over". With
 * nothing logged it names the day's target instead of showing a zero, because a zero reads as a failure
 * at breakfast. Protein is the second fact because it is the macro training asks for.
 */
export function homeFoodLine(eaten: Macros, logged: boolean, target: Targets): { title: string; sub: string } {
  if (!logged) {
    return { title: `${grouped(target.kcal)} cal today`, sub: `${Math.round(target.protein)} g protein · tap to log` };
  }
  const proteinLeft = Math.round(target.protein - eaten.protein);
  return {
    title: `${grouped(Math.round(eaten.kcal))} of ${grouped(target.kcal)} cal`,
    sub: proteinLeft > 0 ? `${proteinLeft} g protein to go` : 'Protein target reached',
  };
}
