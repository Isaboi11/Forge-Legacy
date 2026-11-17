/**
 * The week, held to the weekly volume bands (AI Road to 10 Sprint 2, PB-2 / audit B-G3).
 *
 * ══ WHAT THIS IS FOR ══
 *
 * A skeleton is a priority list of PATTERNS per day, and a session takes as many as its length allows. That
 * shape is the coaching, and it is right far more often than not — but it never looked at the WEEK. A
 * four-day muscle block gave chest 3–7 sets (B-D2); a six-day strength week gave the glutes 31; no
 * hypertrophy block at an hour a session trained a lateral delt at all, because the shoulder raise sat
 * seventh in a six-exercise day. Each session passed PAS-D11. The week did not pass anything, because
 * nothing measured it.
 *
 * This measures it — `rulebook/volume.ts` WEEKLY_SET_BANDS, PAS-A4-D1 counting — and moves the week inside
 * the bands with the smallest change that does it, in this order:
 *
 *   1. a group OVER its ceiling loses a set from the row that feeds it most (never below two sets, never the
 *      day's lead first, never a session under its PAS-D11 floor below five days a week);
 *   2. a group UNDER its floor gains a set on a row that already trains it (up to four sets on an isolation,
 *      five on a compound, never past the session's PAS-D11 ceiling);
 *   3. failing that, a direct exercise for it is ADDED to a day with room in its budget;
 *   4. failing that, it REPLACES the row that costs the week least — a row that feeds no banded group, or
 *      one whose groups keep their floors without it — never the day's lead, never the athlete's own
 *      exercise, never the last row of its pattern in the week, never a compound a strength day needs.
 *
 * Every move is refused if it would push another group over its ceiling or under its floor. A floor is
 * owed only where the group can be trained at all (`trainableGroups`, the same gates every slot fill uses).
 *
 * ══ PURE, AND RUN ONCE PER BUILD ══
 *
 * It works on a working week's rows and returns ADJUSTMENTS by day and row index; `assemble` applies the
 * same adjustments to every week, so every working week is identical in volume and a deload keeps the same
 * exercises as the week before it (PAS-D8 (4)) with its sets cut from the adjusted number. No database,
 * no randomness: the same build in, the same week out.
 */

import type { Experience } from './constraints.ts';
import { canStretch, candidatesFor, isCompound, type CandidateContext, type CatalogExercise } from './candidates.ts';
import { learnedRank } from './learned-preference.ts';
import { GROUP_PREFERENCES } from './rulebook/preferences.ts';
import { creditOf, GROUP_PATTERNS, VOLUME_GROUPS, type VolumeGroup, type WeeklyBand } from './rulebook/volume.ts';

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE LIMITS ON A SINGLE ROW
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** No row is cut below this: one set is a warm-up with a number on it. */
export const ROW_MIN_SETS = 2;

/**
 * How far a row may be raised. Four on an isolation is the Muscle Building Intermediate audit's own cap ("six
 * sets of lateral raises a session, which no coach would prescribe"); five on a compound is the top of
 * `SET_COUNTS`. A row already above its cap (an advanced lifter's five-set primary) keeps what it had.
 */
const ROW_MAX_SETS: Record<Experience, { compound: number; isolation: number }> = {
  // A beginner's compound stays at four: `SET_COUNTS` starts them at three, and five is an advanced dose.
  beginner: { compound: 4, isolation: 4 },
  intermediate: { compound: 5, isolation: 4 },
  advanced: { compound: 5, isolation: 4 },
};

const rowCap = (ex: CatalogExercise, base: number, experience: Experience): number =>
  Math.max(base, isCompound(ex.pattern) ? ROW_MAX_SETS[experience].compound : ROW_MAX_SETS[experience].isolation);

/** At five days a week and up, PAS §10.1 itself calls the per-session floor an open question (`volume.ts`). */
const HIGH_FREQUENCY_DAYS = 5;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// SHAPES
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface BalanceRow {
  /** `null` for a row the model does not count — a cardio bout. */
  ex: CatalogExercise | null;
  sets: number;
  /** The athlete's own exercise, or a cardio bout: never touched. */
  locked: boolean;
}

export interface BalanceDay {
  rows: readonly BalanceRow[];
  /** The day's exercise budget — session length clamped to PAS-D11. */
  maxExercises: number;
  /** PAS-D11's session ceiling and floor for this category, `null` where it states none. */
  maxSets: number | null;
  minSets: number | null;
  /** PAS-D11's STRENGTH rule: at least this many compounds in a session. */
  minCompounds?: number;
  /** PAS-D11's exercise floor — a row is only ever dropped down to it. */
  minExercises?: number;
}

export interface DayAdjustment {
  /** Row index → the working-week set count it should carry. */
  sets: Map<number, number>;
  /** Row index → the exercise that takes that row instead. */
  replace: Map<number, CatalogExercise>;
  /** Rows to add after the day's own (before any cardio finisher). */
  add: { ex: CatalogExercise; sets: number }[];
  /** Row indexes to remove — the last resort for a group over its ceiling with nothing to swap in. */
  drop: Set<number>;
}

export interface BalanceOptions {
  /** The band each group is held to this week (already scaled for frequency). */
  bands: ReadonlyMap<VolumeGroup, WeeklyBand>;
  /** Groups the room and the limitations allow training directly — only these are owed a floor. */
  trainable: ReadonlySet<VolumeGroup>;
  daysPerWeek: number;
  experience: Experience;
  /** The best exercise for a group on a day, given what the day already uses — or null. */
  pick: (group: VolumeGroup, dayIndex: number, used: ReadonlySet<string>) => CatalogExercise | null;
  /** Sets a newly added row starts at — the category's accessory dose. */
  newRowSets: number;
  /** Muscle ids the athlete asked to emphasise — their rows are the last to lose a set. */
  protect?: ReadonlySet<string>;
}

export interface BalanceResult {
  days: DayAdjustment[];
  /** The week as balanced, per group — what the bands were checked against. */
  totals: Record<VolumeGroup, number>;
  /** Groups still outside their band after every move was tried, for the test to report. */
  unmet: { group: VolumeGroup; sets: number; band: WeeklyBand }[];
  moves: number;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// WHERE A GROUP MAY GO
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const UPPER_GROUPS: ReadonlySet<VolumeGroup> = new Set([
  'chest', 'lats', 'upper_back', 'front_deltoids', 'lateral_deltoids', 'rear_deltoids', 'biceps', 'triceps',
]);
const UPPER_PATTERNS: ReadonlySet<string> = new Set([
  'Horizontal Push', 'Vertical Push', 'Horizontal Pull', 'Vertical Pull', 'Elbow Flexion', 'Elbow Extension', 'Shoulder Isolation',
]);
const LOWER_PATTERNS: ReadonlySet<string> = new Set(['Squat / Knee Dominant', 'Hinge / Hip Dominant', 'Hip Isolation', 'Calf / Ankle']);

/** Does this day train the half of the body the group lives in? A day of neither (all core) takes anything. */
function dayTakes(day: { rows: readonly { ex: CatalogExercise | null }[] }, group: VolumeGroup): boolean {
  const patterns = day.rows.map((r) => r.ex?.pattern).filter((p): p is string => p != null);
  const upper = patterns.some((p) => UPPER_PATTERNS.has(p));
  const lower = patterns.some((p) => LOWER_PATTERNS.has(p));
  if (!upper && !lower) return true;
  return UPPER_GROUPS.has(group) ? upper : lower;
}

/**
 * Which groups this athlete can train DIRECTLY — a primary mover for the group, in one of its patterns, that
 * passes the same gates as every slot fill (equipment, limitations, coherence, difficulty with the stretch).
 *
 * ⚠ THE WAIVER IS THIS NARROW ON PURPOSE. A group the room cannot reach is not owed a floor — a bodyweight
 * room with no bar has no vertical pull, a shoulders limitation removes the raises — but "could not be
 * bothered" is never a reason: a full gym with no limitation can train all twelve, and the matrix asserts it.
 */
export function trainableGroups(pool: readonly CatalogExercise[], ctx: CandidateContext): Set<VolumeGroup> {
  const out = new Set<VolumeGroup>();
  const passes = canStretch(ctx.experience) ? [false, true] : [false];
  for (const g of VOLUME_GROUPS) {
    const movers = pool.filter((e) => e.primaryMuscleIds.includes(g));
    const found = GROUP_PATTERNS[g].some((pattern) =>
      passes.some((stretch) => candidatesFor(pattern, movers, { ...ctx, used: new Set() }, stretch).length > 0),
    );
    if (found) out.add(g);
  }
  return out;
}

/**
 * The exercise a group gets when the week needs more of it: a primary mover, in the group's own patterns,
 * through `candidatesFor` (so the gates and the athlete's own swaps apply), ordered by `GROUP_PREFERENCES`
 * where the pattern's own list does not speak for this group — the pattern list for Shoulder Isolation
 * names lateral raises, which is no answer for a rear delt.
 */
export function pickForGroup(
  group: VolumeGroup,
  pool: readonly CatalogExercise[],
  ctx: CandidateContext,
  used: ReadonlySet<string>,
  experience: Experience,
): CatalogExercise | null {
  const movers = pool.filter((e) => e.primaryMuscleIds.includes(group));
  const prefs = GROUP_PREFERENCES[group] ?? [];
  const rankOf = (key: string) => {
    const i = prefs.indexOf(key);
    return i === -1 ? Number.POSITIVE_INFINITY : i;
  };
  const passes = canStretch(experience) ? [false, true] : [false];
  for (const pattern of GROUP_PATTERNS[group]) {
    for (const stretch of passes) {
      const ranked = candidatesFor(pattern, movers, { ...ctx, used }, stretch);
      if (ranked.length === 0) continue;
      const scored = ranked.map((ex, i) => ({
        ex,
        own: ctx.learned && learnedRank(ctx.learned, pattern, ex.key) != null ? 0 : 1,
        pref: rankOf(ex.key),
        i,
      }));
      scored.sort((a, b) => a.own - b.own || (a.pref === b.pref ? 0 : a.pref - b.pref) || a.i - b.i);
      return scored[0].ex;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE BALANCER
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

interface WorkRow {
  ex: CatalogExercise | null;
  sets: number;
  base: number;
  locked: boolean;
  /** Index in the day as built, or null for a row this balancer added. */
  at: number | null;
  /** The exercise was swapped in by this balancer. */
  swapped: boolean;
}

export function balanceWeek(input: readonly BalanceDay[], opts: BalanceOptions): BalanceResult {
  const days = input.map((d) => ({
    ...d,
    rows: d.rows.map((r, i): WorkRow => ({ ex: r.ex, sets: r.sets, base: r.sets, locked: r.locked, at: i, swapped: false })),
  }));
  const groups = VOLUME_GROUPS.filter((g) => opts.bands.has(g));
  const band = (g: VolumeGroup) => opts.bands.get(g) as WeeklyBand;
  const floorOf = (g: VolumeGroup) => (opts.trainable.has(g) ? band(g).min : 0);
  const protect = opts.protect ?? new Set<string>();
  const isProtected = (ex: CatalogExercise | null) => ex != null && ex.primaryMuscleIds.some((m) => protect.has(m));
  const highFrequency = opts.daysPerWeek >= HIGH_FREQUENCY_DAYS;

  const totals = (): Record<VolumeGroup, number> => {
    const t = Object.fromEntries(VOLUME_GROUPS.map((g) => [g, 0])) as Record<VolumeGroup, number>;
    for (const d of days) for (const r of d.rows) if (r.ex) for (const g of groups) t[g] += r.sets * creditOf(r.ex, g);
    return t;
  };
  const daySets = (d: (typeof days)[number]) => d.rows.reduce((n, r) => n + (r.ex ? r.sets : 0), 0);
  const credit = (ex: CatalogExercise | null, g: VolumeGroup) => (ex ? creditOf(ex, g) : 0);

  /** Would this change of per-group totals break a band that the week currently keeps? */
  const safe = (t: Record<VolumeGroup, number>, delta: (g: VolumeGroup) => number, except?: VolumeGroup): boolean =>
    groups.every((g) => {
      if (g === except) return true;
      const d = delta(g);
      if (d < 0 && t[g] + d < floorOf(g) - 1e-9) return false;
      if (d > 0 && t[g] + d > band(g).max + 1e-9) return false;
      return true;
    });

  /**
   * How many rows of each pattern the week holds. A row that feeds no banded group (a core movement, a
   * carry) is only a donor while another of its pattern stays in the week — the bands must not quietly
   * delete the only plank. A row that does feed a group is guarded by that group's floor instead (`safe`).
   */
  const patternCount = () => {
    const n = new Map<string, number>();
    for (const d of days) for (const r of d.rows) if (r.ex) n.set(r.ex.pattern, (n.get(r.ex.pattern) ?? 0) + 1);
    return n;
  };
  const feedsNothing = (ex: CatalogExercise) => groups.every((h) => creditOf(ex, h) === 0);

  let moves = 0;

  const trimOne = (g: VolumeGroup, t: Record<VolumeGroup, number>): boolean => {
    const cands: { di: number; ri: number; score: number[] }[] = [];
    days.forEach((d, di) => {
      const sets = daySets(d);
      const floorHolds = d.minSets == null || highFrequency || sets - 1 >= d.minSets;
      if (!floorHolds) return;
      d.rows.forEach((r, ri) => {
        if (r.locked || !r.ex || r.sets <= ROW_MIN_SETS || credit(r.ex, g) === 0) return;
        cands.push({ di, ri, score: [isProtected(r.ex) ? 1 : 0, -credit(r.ex, g), ri === 0 ? 1 : 0, -r.sets, -di, -ri] });
      });
    });
    cands.sort((a, b) => compare(a.score, b.score));
    for (const c of cands) {
      const r = days[c.di].rows[c.ri];
      if (!safe(t, (h) => -credit(r.ex, h), g)) continue;
      r.sets -= 1;
      moves++;
      return true;
    }
    return false;
  };

  const raiseOne = (g: VolumeGroup, t: Record<VolumeGroup, number>): boolean => {
    const cands: { di: number; ri: number; score: number[] }[] = [];
    days.forEach((d, di) => {
      if (d.maxSets != null && daySets(d) + 1 > d.maxSets) return;
      d.rows.forEach((r, ri) => {
        if (r.locked || !r.ex || credit(r.ex, g) === 0 || r.sets >= rowCap(r.ex, r.base, opts.experience)) return;
        cands.push({ di, ri, score: [-credit(r.ex, g), r.sets, ri === 0 ? 1 : 0, di, ri] });
      });
    });
    cands.sort((a, b) => compare(a.score, b.score));
    for (const c of cands) {
      const r = days[c.di].rows[c.ri];
      if (!safe(t, (h) => credit(r.ex, h), g)) continue;
      r.sets += 1;
      moves++;
      return true;
    }
    return false;
  };

  /**
   * The days a group may be put on, best first. PAS §11.2: "distribute across sessions; do not concentrate
   * all sets for one muscle group into a single session" — so a day that does not yet train the group
   * DIRECTLY comes first, then the one with the least of it; only days on the right half of the body.
   * `anyDay` is the second pass, when no such day had room: a hamstring curl on a pull day beats a week that
   * never trains the hamstrings enough (a PPL week has one leg day, and one dumbbell room one curl).
   */
  const targetDays = (g: VolumeGroup, anyDay = false): number[] =>
    days
      .map((d, di) => ({ d, di }))
      .filter(({ d }) => anyDay || dayTakes(d, g))
      .map(({ d, di }) => ({
        di,
        score: [d.rows.some((r) => r.ex?.primaryMuscleIds.includes(g)) ? 1 : 0, d.rows.reduce((n, r) => n + r.sets * credit(r.ex, g), 0), di],
      }))
      .sort((a, b) => compare(a.score, b.score))
      .map((x) => x.di);

  const usedOn = (di: number, except?: WorkRow) =>
    new Set(days[di].rows.filter((r) => r !== except && r.ex).map((r) => (r.ex as CatalogExercise).key));

  const addOne = (g: VolumeGroup, t: Record<VolumeGroup, number>, anyDay = false): boolean => {
    for (const di of targetDays(g, anyDay)) {
      const d = days[di];
      if (d.rows.length >= d.maxExercises) continue;
      const room = d.maxSets == null ? opts.newRowSets : d.maxSets - daySets(d);
      const sets = Math.min(opts.newRowSets, room);
      if (sets < ROW_MIN_SETS) continue;
      const ex = opts.pick(g, di, usedOn(di));
      if (!ex) continue;
      if (!safe(t, (h) => sets * creditOf(ex, h), g)) continue;
      d.rows.push({ ex, sets, base: sets, locked: false, at: null, swapped: true });
      moves++;
      return true;
    }
    return false;
  };

  /** May this row be given away at all? Never the lead, the athlete's own, or the week's only core movement. */
  const donatable = (d: (typeof days)[number], ri: number, counts: Map<string, number>): boolean => {
    const r = d.rows[ri];
    if (ri === 0 || r.locked || !r.ex || isProtected(r.ex)) return false;
    if (feedsNothing(r.ex) && r.ex.pattern === 'Core' && (counts.get(r.ex.pattern) ?? 0) <= 1) return false;
    return true;
  };

  /** Put `group`'s best exercise in row `ri` of day `di`, if every band the week keeps survives it. */
  const swapIn = (di: number, ri: number, group: VolumeGroup, t: Record<VolumeGroup, number>, except?: VolumeGroup, mustCut?: VolumeGroup): boolean => {
    const d = days[di];
    const r = d.rows[ri];
    const ex = opts.pick(group, di, usedOn(di, r));
    if (!ex) return false;
    const old = r.ex;
    if (mustCut && creditOf(ex, mustCut) >= credit(old, mustCut)) return false;
    // A strength day keeps its compounds: a compound may only give way to another compound below the minimum.
    if (d.minCompounds != null && old && isCompound(old.pattern) && !isCompound(ex.pattern)) {
      const compounds = d.rows.filter((x) => x.ex && isCompound(x.ex.pattern)).length;
      if (compounds - 1 < d.minCompounds) return false;
    }
    const others = daySets(d) - r.sets;
    const limit = d.maxSets == null ? r.sets : d.maxSets - others;
    const sets = Math.min(rowCap(ex, opts.newRowSets, opts.experience), r.sets, limit);
    if (sets < ROW_MIN_SETS) return false;
    const delta = (h: VolumeGroup) => sets * creditOf(ex, h) - r.sets * credit(old, h);
    let raises: WorkRow[] = [];
    if (!safe(t, delta, except)) {
      const plan = compensate(t, delta, r, d, sets - r.sets, except);
      if (!plan) return false;
      raises = plan;
    }
    r.ex = ex;
    r.sets = sets;
    r.base = sets;
    r.swapped = true;
    for (const x of raises) x.sets += 1;
    moves++;
    return true;
  };

  /**
   * ══ A SWAP THAT PAYS FOR ITSELF ══
   *
   * Sometimes the only row a group can take feeds another group that sits right at its floor — on a two-day,
   * five-exercise home week, swapping the frog pump for a rear-delt fly leaves the glutes half a set short,
   * though one more set of the Romanian deadlift (glutes secondary) would cover it. A coach makes both moves at
   * once; this finds those extra sets: +1 at a time on rows that feed the short group, never the row being
   * swapped, never past a row's cap or a session's ceiling, never pushing a group over ITS ceiling. All of it
   * or none of it — the swap is refused when the shortfall cannot be covered.
   */
  const compensate = (
    t: Record<VolumeGroup, number>,
    delta: (h: VolumeGroup) => number,
    swapped: WorkRow,
    swapDay: (typeof days)[number],
    swapDaySetChange: number,
    except?: VolumeGroup,
  ): WorkRow[] | null => {
    const after = Object.fromEntries(groups.map((h) => [h, t[h] + delta(h)])) as Record<VolumeGroup, number>;
    // A swap that breaks a CEILING cannot be paid for with more sets.
    if (groups.some((h) => h !== except && delta(h) > 0 && after[h] > band(h).max + 1e-9)) return null;
    const extra = new Map<WorkRow, number>();
    const daySetsAfter = (d: (typeof days)[number]) =>
      daySets(d) + (d === swapDay ? swapDaySetChange : 0) + d.rows.reduce((n, x) => n + (extra.get(x) ?? 0), 0);
    for (let guard = 0; guard < 12; guard++) {
      const short = groups.find((h) => h !== except && delta(h) < 0 && after[h] < floorOf(h) - 1e-9);
      if (!short) return [...extra.entries()].flatMap(([x, n]) => Array.from({ length: n }, () => x));
      let best: { x: WorkRow; c: number } | null = null;
      for (const d of days) {
        if (d.maxSets != null && daySetsAfter(d) + 1 > d.maxSets) continue;
        for (const x of d.rows) {
          if (x === swapped || x.locked || !x.ex) continue;
          const c = creditOf(x.ex, short);
          if (c === 0 || x.sets + (extra.get(x) ?? 0) >= rowCap(x.ex, x.base, opts.experience)) continue;
          if (groups.some((h) => after[h] + creditOf(x.ex as CatalogExercise, h) > band(h).max + 1e-9 && creditOf(x.ex as CatalogExercise, h) > 0)) continue;
          if (!best || c > best.c) best = { x, c };
        }
      }
      if (!best) return null;
      extra.set(best.x, (extra.get(best.x) ?? 0) + 1);
      for (const h of groups) after[h] += creditOf(best.x.ex as CatalogExercise, h);
    }
    return null;
  };

  /** A group under its floor takes the row that costs the week least. */
  const replaceOne = (g: VolumeGroup, t: Record<VolumeGroup, number>, anyDay = false): boolean => {
    const counts = patternCount();
    const cands: { di: number; ri: number; score: number[] }[] = [];
    for (const di of targetDays(g, anyDay)) {
      const d = days[di];
      d.rows.forEach((r, ri) => {
        if (!donatable(d, ri, counts) || !r.ex || credit(r.ex, g) > 0) return;
        // The donor's slack: the least any group it feeds keeps above its floor without it.
        const slack = groups.filter((h) => credit(r.ex, h) > 0).map((h) => t[h] - r.sets * credit(r.ex, h) - floorOf(h));
        cands.push({ di, ri, score: [slack.length === 0 ? 0 : 1, -Math.min(...slack, Number.POSITIVE_INFINITY), -ri] });
      });
    }
    cands.sort((a, b) => compare(a.score, b.score));
    return cands.some((c) => swapIn(c.di, c.ri, g, t, g));
  };

  /**
   * A group over its ceiling that no set can come off (every row at two sets, or a session already under
   * its PAS-D11 floor): the row feeding it most is swapped for direct work for a group with room — the
   * leg curl a lower day lacked instead of its third glute movement.
   */
  const swapOut = (g: VolumeGroup, t: Record<VolumeGroup, number>): boolean => {
    const counts = patternCount();
    const cands: { di: number; ri: number; score: number[] }[] = [];
    days.forEach((d, di) => {
      d.rows.forEach((r, ri) => {
        if (!donatable(d, ri, counts) || !r.ex || credit(r.ex, g) === 0) return;
        cands.push({ di, ri, score: [-credit(r.ex, g), isCompound(r.ex.pattern) ? 1 : 0, -r.sets, -di, -ri] });
      });
    });
    cands.sort((a, b) => compare(a.score, b.score));
    for (const c of cands) {
      const d = days[c.di];
      const takers = groups
        .filter((h) => h !== g && opts.trainable.has(h) && dayTakes(d, h) && t[h] < band(h).max)
        .sort((a, b) => t[a] - floorOf(a) - (t[b] - floorOf(b)) || VOLUME_GROUPS.indexOf(a) - VOLUME_GROUPS.indexOf(b));
      if (takers.some((h) => swapIn(c.di, c.ri, h, t, undefined, g))) return true;
    }
    return false;
  };

  /**
   * The last resort for a ceiling: a surplus row is removed outright, down to the day's PAS-D11 exercise
   * floor and never below four. A bodyweight week can hit it — every row already at two sets and nothing in
   * the room to trade a third push-up variant for.
   */
  const dropOne = (g: VolumeGroup, t: Record<VolumeGroup, number>): boolean => {
    const counts = patternCount();
    const cands: { di: number; ri: number; score: number[] }[] = [];
    days.forEach((d, di) => {
      if (d.rows.length - 1 < Math.max(4, d.minExercises ?? 0)) return;
      d.rows.forEach((r, ri) => {
        if (!donatable(d, ri, counts) || !r.ex || credit(r.ex, g) === 0) return;
        if (d.minCompounds != null && isCompound(r.ex.pattern)) {
          const compounds = d.rows.filter((x) => x.ex && isCompound(x.ex.pattern)).length;
          if (compounds - 1 < d.minCompounds) return;
        }
        cands.push({ di, ri, score: [-credit(r.ex, g), isCompound(r.ex.pattern) ? 1 : 0, -di, -ri] });
      });
    });
    cands.sort((a, b) => compare(a.score, b.score));
    for (const c of cands) {
      const r = days[c.di].rows[c.ri];
      if (!safe(t, (h) => -r.sets * credit(r.ex, h))) continue;
      days[c.di].rows.splice(c.ri, 1);
      moves++;
      return true;
    }
    return false;
  };

  for (let iter = 0; iter < 400; iter++) {
    const t = totals();
    const over = groups.filter((g) => t[g] > band(g).max + 1e-9).sort((a, b) => t[b] - band(b).max - (t[a] - band(a).max));
    let moved = over.some((g) => trimOne(g, t)) || over.some((g) => swapOut(g, t)) || over.some((g) => dropOne(g, t));
    if (!moved) {
      const short = groups
        .filter((g) => t[g] < floorOf(g) - 1e-9)
        .sort((a, b) => floorOf(b) - t[b] - (floorOf(a) - t[a]) || VOLUME_GROUPS.indexOf(a) - VOLUME_GROUPS.indexOf(b));
      moved =
        short.some((g) => raiseOne(g, t) || addOne(g, t) || replaceOne(g, t)) ||
        short.some((g) => addOne(g, t, true) || replaceOne(g, t, true));
    }
    if (!moved) break;
  }

  const t = totals();
  const unmet = groups
    .filter((g) => t[g] > band(g).max + 1e-9 || t[g] < floorOf(g) - 1e-9)
    .map((g) => ({ group: g, sets: t[g], band: { min: floorOf(g), max: band(g).max } }));

  const out: DayAdjustment[] = days.map((d, di) => {
    const adj: DayAdjustment = { sets: new Map(), replace: new Map(), add: [], drop: new Set() };
    const kept = new Set(d.rows.map((r) => r.at).filter((at): at is number => at != null));
    input[di].rows.forEach((_, i) => {
      if (!kept.has(i)) adj.drop.add(i);
    });
    for (const r of d.rows) {
      if (r.at == null) {
        if (r.ex) adj.add.push({ ex: r.ex, sets: r.sets });
        continue;
      }
      const was = input[di].rows[r.at];
      if (r.swapped && r.ex) adj.replace.set(r.at, r.ex);
      if (r.swapped || r.sets !== was.sets) adj.sets.set(r.at, r.sets);
    }
    return adj;
  });

  return { days: out, totals: t, unmet, moves };
}

/** Lexicographic compare of two score tuples, lower first. */
function compare(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
