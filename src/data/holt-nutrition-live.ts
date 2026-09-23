import { localToday, totals } from '@/domain/nutrition/day';
import { summariseNutrition } from '@/domain/nutrition/holt-summary';
import { buildWeek, summarise, weekDays, type DayTotals } from '@/domain/nutrition/week';
import { fetchDay, fetchRangeTotals, fetchTargetHistory } from './nutrition-live';

/**
 * The athlete's food, in the ≤ ~420 characters Holt is allowed to see.
 *
 * `Nutrition-Architecture-Amendment-001` (PO, 2026-09-23): Holt may state and review the FACTS of a
 * logged diary. He may not prescribe a diet — `Coach-AI-Amendment-001` CA-D10 still holds — so nothing
 * here carries a verdict. The judgement is his to make out loud, from numbers, like a coach.
 *
 * ⚠ **THE SAME SEVEN DAYS NUTRITION DETAILS DRAWS**, assembled by the same `buildWeek` / `summarise`
 * the screen uses. If the two ever disagreed, one of them would be lying to the athlete and the other
 * to the coach — so there is one assembler and both read it.
 *
 * ⚠ **RLS IS THE GATE, NOT THIS FILE.** `0206` puts the nutrition allowlist inside the policies of all
 * seven tables, so an athlete without access reads nothing here and the summary comes back null. The
 * caller does not have to remember to check.
 *
 * Fails soft in every direction: a question is never worth failing over a summary.
 */
export async function fetchNutritionSummary(): Promise<string | null> {
  try {
    const today = localToday();
    const days = weekDays(today, 0);

    const [range, history, day] = await Promise.all([
      fetchRangeTotals(days[0], days[6]).catch(() => [] as DayTotals[]),
      fetchTargetHistory(today).catch(() => []),
      fetchDay(today).catch(() => ({ entries: [], targets: null })),
    ]);

    const week = buildWeek(days, new Map(range.map((d) => [d.iso, d])), history, today);
    const summary = summarise(week);
    const todaySoFar = totals(day.entries).kcal;

    return summariseNutrition({
      week,
      target: day.targets ?? summary.band?.target ?? null,
      todaySoFar,
      average: summary.average,
      counted: summary.counted,
      missed: summary.missed,
      inRange: summary.inRange,
    });
  } catch {
    return null;
  }
}
