/**
 * A RACE BLOCK THAT LIFTS, WHEN THE ATHLETE TYPED IT — who writes which half.
 *
 * Coach-AI-Amendment-003 CW-D13 (PO, 2026-09-30): *"I want to run twice a week and lift 3 times a week. I'm
 * prepping for a marathon but I want to have weights and strength to help me. Build me a 7 week program."*
 *
 *   · The RUNNING is the race rulebook's: the mileage curve, the long run, the taper and race week are
 *     arithmetic with floors under them (`rulebook/endurance.ts`), and a model guessing marathon mileage is
 *     where somebody gets hurt. The block is built by `assemble()` exactly as before.
 *   · The LIFTING is Holt's to write (`author.ts`), from the athlete's own words and their own room — and
 *     this module puts what he wrote into the block in place of the rulebook's lifting days.
 *
 * Pure. The structure in, a structure out; nothing here calls a model or reads a database.
 */

import type { ProgramDay, ProgramStructure } from '@/data/programs-live';

/** A lifting day is any day with something in it that is not a cardio bout — the assembler's own test. */
export const isLiftDay = (d: ProgramDay): boolean => d.main.some((e) => e.kind !== 'cardio');

const weeksOf = (s: ProgramStructure): ProgramDay[][] => (s.weekPlans?.length ? s.weekPlans.map((w) => w.days) : [s.days]);

/** How the first week divides — what Holt is told, and what the card is checked against. */
export function raceWeekShape(s: ProgramStructure): { runDays: number; liftDays: number } {
  const week = weeksOf(s)[0] ?? [];
  const liftDays = week.filter(isLiftDay).length;
  return { runDays: week.length - liftDays, liftDays };
}

/**
 * Put the lifting days Holt wrote into the block.
 *
 * In each week the Nth lifting day takes the Nth written day, keeping the rulebook's letter and its place
 * in the week — so the arrangement that keeps a leg day off the day before the long run
 * (`INTERFERENCE_RULES`) is untouched.
 *
 * ⚠ RACE WEEK KEEPS THE RULEBOOK'S LIFT, AND ONLY ONE OF THEM. The rulebook trims that week's lifting on
 * purpose (`RACE_WEEK_LIFT`: short, upper body) and a full written lifting day three days before a marathon
 * would undo the taper. But it writes that trimmed session once per lifting day, and with the athlete's own
 * three lifting days that was the same bench session three days running, the last of them the day before
 * the race (live run 2026-09-30). So the first is kept and the others become empty days — which the
 * program model already reads as "nothing owed" (`trainingDays`), and which keeps every week the same length.
 * "Race week" is the block's last week when that week holds the race itself.
 *
 * Returns the structure unchanged when there is nothing to put in, or no lifting day to put it into.
 */
export function spliceLiftDays(s: ProgramStructure, written: readonly ProgramDay[]): ProgramStructure {
  if (written.length === 0 || !s.weekPlans?.length) return s;
  const last = s.weekPlans.length - 1;
  const hasRace = s.weekPlans[last].days.some((d) => d.main.some((e) => e.kind === 'cardio' && /race/i.test(e.name)));
  const weekPlans = s.weekPlans.map((w, wi) => {
    if (hasRace && wi === last) {
      let kept = false;
      return {
        days: w.days.map((d) => {
          if (!isLiftDay(d)) return d;
          if (!kept) {
            kept = true;
            return d;
          }
          return { letter: d.letter, name: 'Rest', warmup: [], main: [], cooldown: [] };
        }),
      };
    }
    let n = 0;
    return {
      days: w.days.map((d) => {
        if (!isLiftDay(d)) return d;
        const mine = written[n % written.length];
        n += 1;
        return { ...mine, letter: d.letter };
      }),
    };
  });
  return { ...s, days: weekPlans[0].days, weekPlans };
}

/**
 * The first `weeks` weeks of a longer race build.
 *
 * "Build me a 7 week program" for a marathon that is sixteen weeks away is the first seven weeks of that
 * build, not a sixteen-week plan and not a seven-week one with a taper and a race in week seven. The
 * weeks are the rulebook's own, untouched; only the count changes. A block already that short is returned
 * as it is.
 */
export function firstWeeksOf(s: ProgramStructure, weeks: number): ProgramStructure {
  if (!s.weekPlans?.length || !Number.isInteger(weeks) || weeks < 1 || weeks >= s.weekPlans.length) return s;
  const weekPlans = s.weekPlans.slice(0, weeks);
  return { ...s, name: s.name.replace(/^\d+-Week/, `${weeks}-Week`), weeks, days: weekPlans[0].days, weekPlans };
}

/** Does the block end on the race? Then its last week was trimmed to one lift, and Holt says so. */
export const endsOnRace = (s: ProgramStructure): boolean =>
  !!s.weekPlans?.length && s.weekPlans[s.weekPlans.length - 1].days.some((d) => d.main.some((e) => e.kind === 'cardio' && /race/i.test(e.name)));

export const RACE_WEEK_LINE = 'Race week keeps one short upper-body lift early on. The rest of that week is for the race.';

/** What Holt says when the program they asked for stops short of the race. */
export const stopsShortLine = (weeks: number, raceInWeeks: number): string =>
  `That's the first ${weeks} weeks of the build. The race is about ${raceInWeeks - weeks} weeks after it ends, so there's no taper in here yet — come back then and I'll write the rest.`;
