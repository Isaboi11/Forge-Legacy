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

import { placeRaceLifts, type RaceSlot } from './assemble.ts';
import { nameForWeek } from './prescribe.ts';
import { liftLoadOf, type RunDemand } from './rulebook/hybrid.ts';
import { DELOAD_MARKER, deloadSets } from './rulebook/volume.ts';

/** A lifting day is any day with something in it that is not a cardio bout — the assembler's own test. */
export const isLiftDay = (d: ProgramDay): boolean => d.main.some((e) => e.kind !== 'cardio');

const weeksOf = (s: ProgramStructure): ProgramDay[][] => (s.weekPlans?.length ? s.weekPlans.map((w) => w.days) : [s.days]);

/** How the first week divides — what Holt is told, and what the card is checked against. */
export function raceWeekShape(s: ProgramStructure): { runDays: number; liftDays: number } {
  const week = weeksOf(s)[0] ?? [];
  const liftDays = week.filter(isLiftDay).length;
  return { runDays: week.length - liftDays, liftDays };
}

/** What a written lifting day has to respect where it lands — the assembly's `weekShape` and `racePlacing`. */
export interface LiftPlacing {
  /** The seven days as the rulebook laid them out, rest days included. */
  shape: readonly RaceSlot[];
  /** What each running day asks of the legs, in run order. */
  demands: readonly RunDemand[];
  /** The seven days are the athlete's own order — kept, and a rule it breaks is named (CA-D12). */
  asGiven: boolean;
  /** A catalogue key's movement pattern, to read a written day's leg load (`liftLoadOf`). */
  patternOf: (key: string) => string | undefined;
}

/** A written day as the deload week has it: PAS-D8's marker and its sets cut, exactly as the rulebook cuts its own. */
const asDeload = (d: ProgramDay): ProgramDay => ({
  ...d,
  name: nameForWeek(d.name, true),
  main: d.main.map((e) => (e.kind === 'cardio' || typeof e.sets !== 'number' ? e : { ...e, sets: deloadSets(e.sets) })),
});

/**
 * Put the lifting days Holt wrote into the block — placed by what they ask of the legs, not by position.
 *
 * ⚠ BY POSITION, THIS BROKE THE LONG-RUN RULE (AI audit 11-16, B-D3). The Nth written day used to drop into the
 * Nth lift slot, so a squat day he wrote first went wherever the rulebook had put an UPPER day — the day after
 * the long run included — and the arrangement `INTERFERENCE_RULES` protects held only on the rulebook path. Now
 * each written day's load is read (`liftLoadOf`, off its own movements) and the written days are put into the
 * rulebook's lift slots in whichever order the same cost table scores best (`placeRaceLifts`). The week keeps the
 * rulebook's shape — its runs, its letters, its place for every session. A rule no order can keep (every written
 * day trains legs, and a lift slot sits beside the long run) comes back as `clash`, to be said once.
 *
 * ⚠ AND IT OVERWROTE THE DELOADS. A week the rulebook deloads (its lift days carry `[DELOAD]`, PAS-D7) now gets
 * the written days deloaded the same way — the marker and `deloadSets` — rather than a full week of lifting in the
 * one week the block is meant to back off. Taper weeks the rulebook lifts in normally are lifted in normally.
 *
 * `placing` null keeps the positional splice (the Nth slot takes the Nth day) — `spliceLiftDays`.
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
export function placeWrittenLifts(
  s: ProgramStructure,
  written: readonly ProgramDay[],
  placing: LiftPlacing | null,
): { structure: ProgramStructure; clash: string | null } {
  if (written.length === 0 || !s.weekPlans?.length) return { structure: s, clash: null };
  const placed = placing
    ? placeRaceLifts({
        shape: placing.shape,
        demands: placing.demands,
        loads: written.map((d) =>
          liftLoadOf({
            name: d.name,
            slots: d.main.filter((e) => e.kind !== 'cardio').map((e) => (e.catalogKey ? placing.patternOf(e.catalogKey) : undefined) ?? ''),
          }),
        ),
        names: written.map((d) => d.name),
        asGiven: placing.asGiven,
      })
    : null;
  /* The j-th lift slot's written day: the placement's choice, else the j-th day round again. */
  const writtenFor = (j: number): ProgramDay => written[placed?.order.length ? placed.order[j % placed.order.length] : j % written.length];

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
    const deload = w.days.some((d) => isLiftDay(d) && d.name.includes(DELOAD_MARKER));
    const lift = (j: number): ProgramDay => (deload ? asDeload(writtenFor(j)) : writtenFor(j));
    let n = 0;
    return {
      days: w.days.map((d) => {
        if (!isLiftDay(d)) return d;
        const mine = lift(n);
        n += 1;
        return { ...mine, letter: d.letter };
      }),
    };
  });
  return { structure: { ...s, days: weekPlans[0].days, weekPlans }, clash: placed?.clash ?? null };
}

/** The positional splice — the Nth lift slot takes the Nth written day (deloads still applied). */
export const spliceLiftDays = (s: ProgramStructure, written: readonly ProgramDay[]): ProgramStructure =>
  placeWrittenLifts(s, written, null).structure;

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
