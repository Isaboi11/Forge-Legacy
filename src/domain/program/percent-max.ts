/**
 * Resolving a percentage-of-max prescription into the number that goes on the bar.
 *
 * Pure (no JSON, no Supabase, no React) so every rule is unit-testable under `node --test`, the same
 * shape as `prescription.ts` — which this module deliberately mirrors, because the two are read
 * together everywhere a prescription renders.
 *
 * ══ WHY THIS EXISTS ══
 *
 * A peaking block prescribes load as a fraction of a tested one-rep max. The model had no load field at
 * all, so "5 × 5 @ 75%" could only be stored as "5 × 5" — the same shape as the session, with the
 * training removed. See `Docs/Percent-Of-Max-Loading-Architecture-v1.0.md`.
 *
 * ══ WHAT THIS MODULE REFUSES TO DO ══
 *
 * It never invents a number. No max means no resolved weight — the caller shows the bare percentage,
 * not a `0 lb` and not a guess. That follows the standing lesson from the 2026-08-01 audit: a value
 * that is only ever its default is worse than an absent one, because absent renders nothing while a
 * default renders a confident, specific, false claim about the athlete.
 */

import type { ProgramDay, ProgramExercise, ProgramStructure } from '@/data/programs-live';
// Relative, not `@/…`: this is a VALUE import, and the alias only survives type erasure — under
// `node --test` an aliased value import fails to resolve at load time.
import { e1rm } from '../workout/metrics.ts';
import { setCount } from './prescription.ts';

/**
 * HOW a max came to be known. Shown to the athlete, never laundered.
 *
 * `metrics.ts` refuses to let an estimate become a RECORD, and nothing here changes that. This
 * distinction exists so an estimate can be LABELLED wherever it appears — a training anchor the athlete
 * corrects by feel in week one is a different object from a claim about what they have lifted.
 */
export type MaxSource = 'entered' | 'estimated' | 'tested';

export interface LiftMax {
  /** Pounds — canonical, like every stored weight in this app. Display converts. */
  lb: number;
  source: MaxSource;
  /** When the max was established. Null for a figure typed from memory: we do not know, so we do not say. */
  setAt: string | null;
}

/** Catalog key → the max its percentages resolve against. `{}` means the gate is unanswered. */
export type LiftMaxes = Record<string, LiftMax>;

/** The pounds figure for a lift, or null when nothing has been set for it. */
export function maxLbFor(maxes: LiftMaxes | null | undefined, key: string | null): number | null {
  if (!maxes || !key) return null;
  const m = maxes[key];
  return m && Number.isFinite(m.lb) && m.lb > 0 ? m.lb : null;
}

/** Which of a program's required lifts still have no max — what the entry gate must ask for. */
export function missingMaxKeys(structure: ProgramStructure, maxes: LiftMaxes | null | undefined): string[] {
  return requiredMaxKeys(structure).filter((k) => maxLbFor(maxes, k) == null);
}

/**
 * The most reps an estimate may be taken from.
 *
 * Wider than `PR_MAX_REPS` (5), and deliberately, because the two are doing different jobs. A record is
 * a FACT and must be conservative. A training max is a STARTING ANCHOR the athlete corrects by feel in
 * week one — and most people who have never tested a single know a set like "185 for 8", so refusing
 * anything above five would send the majority of athletes away from the gate with nothing.
 *
 * Ten is where Epley's error stops being a rounding difference: `60 × 25` computes to 110, which
 * `metrics.ts` cites as the reason estimates are barred from records entirely.
 */
export const ESTIMATE_MAX_REPS = 10;

/**
 * A hard set the athlete remembers → an estimated one-rep max.
 *
 * This is the answer for the athlete who does not know their max, which is MOST of them — and it is the
 * only one that works with no logged history at all, so it cannot be replaced by estimating from
 * workouts the app has recorded.
 *
 * Null when the set cannot support an estimate. The caller offers a different route rather than
 * resolving a number from something that does not justify one.
 */
export function estimateMaxFromSet(weight: number, reps: number): number | null {
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return null;
  if (weight <= 0 || reps < 1 || reps > ESTIMATE_MAX_REPS) return null;
  /**
   * A SINGLE IS NOT AN ESTIMATE — it is the answer, and it is returned verbatim.
   *
   * Epley is `w × (1 + r/30)`, so at one rep it returns `w × 31/30` — it inflates a true single by 3.3%.
   * An athlete who tells us "315 for 1" would have 326 written down, a number they have never lifted,
   * and every percentage all block would be computed from it. The formula describes what a max PROBABLY
   * is given a set that was not a max; asked about a max it has nothing to add.
   */
  if (reps === 1) return Math.round(weight);
  return Math.round(e1rm(weight, reps));
}

/** An empty olympic barbell, per unit. Nothing resolves below it — there is no lighter bar to load. */
export const BAR_LB = 45;
export const BAR_KG = 20;

/** The smallest change the plates allow, per unit. 5 lb = a pair of 2.5s; 2.5 kg = a pair of 1.25s. */
export const INCREMENT_LB = 5;
export const INCREMENT_KG = 2.5;

export interface LoadUnitRules {
  /** Round every resolved weight to a multiple of this. */
  increment: number;
  /** The empty bar, below which a resolved weight is not loadable. */
  bar: number;
}

export const LB_RULES: LoadUnitRules = { increment: INCREMENT_LB, bar: BAR_LB };
export const KG_RULES: LoadUnitRules = { increment: INCREMENT_KG, bar: BAR_KG };

/**
 * Everything a prescription needs to turn a percentage into a number on a card.
 *
 * `maxes` are ALREADY IN THE DISPLAY UNIT. Storage is pounds everywhere, but rounding has to happen in
 * the unit the athlete actually loads — 5 lb and 2.5 kg are different plates — so the conversion is done
 * once, here, at the point the context is built, and never again downstream.
 */
export interface LoadContext {
  maxes: Record<string, number>;
  /** The unit's short name — "lb", "kg". */
  unit: string;
  rules: LoadUnitRules;
}

/**
 * Stored (pounds) maxes → a render-ready context in the athlete's unit.
 *
 * The conversion is EXACT and unrounded. Rounding to whole kg here and again to a loadable plate
 * downstream would compound two errors; `resolveLoad` rounds once, at the end.
 */
export function loadContextFor(
  stored: LiftMaxes | null | undefined,
  metric: boolean,
  toDisplay: (lb: number) => number,
): LoadContext {
  const maxes: Record<string, number> = {};
  for (const [key, m] of Object.entries(stored ?? {})) {
    if (m && Number.isFinite(m.lb) && m.lb > 0) maxes[key] = toDisplay(m.lb);
  }
  return { maxes, unit: metric ? 'kg' : 'lb', rules: metric ? KG_RULES : LB_RULES };
}

/** The display-unit max for an exercise's reference lift, or null when none is set. */
export function contextMaxFor(ctx: LoadContext | undefined, ex: ProgramExercise): number | null {
  const key = maxKeyFor(ex);
  if (!ctx || !key) return null;
  const v = ctx.maxes[key];
  return Number.isFinite(v) && v > 0 ? v : null;
}

export interface ResolvedLoad {
  /** The rounded, loadable weight, in whatever unit the max was given in. */
  weight: number;
  /**
   * True when the true percentage landed BELOW an empty bar and this is the bar instead.
   *
   * Surfaced rather than hidden: a program that asks for 35% of a 135 lb max wants 47 lb, and an
   * athlete told "45 lb" without being told why would reasonably think the app had miscalculated.
   */
  atBar: boolean;
}

/**
 * Round to the nearest loadable increment.
 *
 * Half rounds UP, deliberately and consistently. `Math.round` on a negative would round toward zero,
 * but a weight is never negative here, and picking a rule rather than inheriting one means the same
 * percentage of the same max is the same bar on every screen and every platform.
 */
export function roundToIncrement(weight: number, increment: number): number {
  if (!Number.isFinite(weight) || !Number.isFinite(increment) || increment <= 0) return 0;
  return Math.round(weight / increment) * increment;
}

/**
 * A percentage of a max → the weight on the bar.
 *
 * Null when there is nothing to resolve: no max, no percentage, or a nonsense value. The caller is
 * expected to render the bare percentage in that case (PCT-D10) — never a fabricated number.
 *
 * ══ ALWAYS COMPUTED FROM THE TRUE MAX ══
 *
 * Never off a previously-rounded figure. Compounding rounding across a ten-set ramp drifts the top
 * sets by more than a plate, which on a 95% single is the difference between a rehearsal and a miss.
 */
export function resolveLoad(
  max: number | null | undefined,
  percent: number | null | undefined,
  rules: LoadUnitRules = LB_RULES,
): ResolvedLoad | null {
  if (max == null || percent == null) return null;
  if (!Number.isFinite(max) || !Number.isFinite(percent)) return null;
  if (max <= 0 || percent <= 0) return null;

  const exact = max * (percent / 100);
  const rounded = roundToIncrement(exact, rules.increment);

  if (rounded < rules.bar) return { weight: rules.bar, atBar: true };
  return { weight: rounded, atBar: false };
}

/**
 * What each set asks for as a percentage — one entry per set, parallel to `repTargets`.
 *
 * `null` at a position means that set prescribes no percentage. A `percentScheme` SHORTER than the set
 * count leaves the remaining sets null rather than repeating its last value: repeating would invent a
 * load the author never wrote, and the whole point of a per-set scheme is that the sets differ.
 */
export function percentTargets(ex: ProgramExercise): (number | null)[] {
  const n = setCount(ex);
  if (ex.percentScheme?.length) {
    return Array.from({ length: n }, (_, i) => normalize(ex.percentScheme?.[i]));
  }
  const flat = normalize(ex.percentOfMax);
  return Array.from({ length: n }, () => flat);
}

/** A percentage is a positive number; anything else prescribes nothing. */
function normalize(v: number | null | undefined): number | null {
  if (v == null || !Number.isFinite(v) || v <= 0) return null;
  return v;
}

/** True when this item prescribes load as a percentage at all. */
export function hasPercent(ex: ProgramExercise): boolean {
  return normalize(ex.percentOfMax) != null || (ex.percentScheme?.some((p) => normalize(p) != null) ?? false);
}

/**
 * WHICH max this item's percentages refer to — the explicit reference lift, else the exercise itself.
 *
 * Null when the item carries a percentage but nothing to key a max by (a hand-typed exercise with no
 * catalog id). That is reported rather than papered over: see `unresolvablePercentages`.
 */
export function maxKeyFor(ex: ProgramExercise): string | null {
  if (!hasPercent(ex)) return null;
  return ex.percentOf ?? ex.catalogKey ?? null;
}

const sections = (d: ProgramDay): ProgramExercise[] => [...d.warmup, ...d.main, ...d.cooldown];

/** Every exercise in a structure, including per-week plans, in program order. */
function allExercises(structure: ProgramStructure): ProgramExercise[] {
  const out: ProgramExercise[] = [];
  for (const d of structure.days ?? []) out.push(...sections(d));
  for (const wp of structure.weekPlans ?? []) {
    for (const d of wp.days ?? []) out.push(...sections(d));
  }
  return out;
}

/**
 * The maxes this program needs, in first-appearance order.
 *
 * DERIVED from the prescriptions rather than declared alongside them. A declared list is one more thing
 * that can drift from the program it describes — and the failure would be silent: an undeclared lift
 * would simply never be asked for, and every percentage against it would render unresolved with no
 * indication that anything was missing. Walking the structure cannot disagree with the structure.
 *
 * First-appearance order so the entry gate lists the program's own priority first — a squat block asks
 * for the squat max at the top, not whatever sorts alphabetically.
 */
export function requiredMaxKeys(structure: ProgramStructure): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ex of allExercises(structure)) {
    const key = maxKeyFor(ex);
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

/**
 * Items that prescribe a percentage but name no lift to take it from.
 *
 * An authoring check, not a runtime one. Such an item can never resolve, and without this it would
 * fail silently — rendering a bare "@ 80%" forever while the entry gate, which only knows about keys,
 * never asks for the max that would fix it.
 */
export function unresolvablePercentages(structure: ProgramStructure): ProgramExercise[] {
  return allExercises(structure).filter((ex) => hasPercent(ex) && maxKeyFor(ex) == null);
}

/** True when any prescription in the program is a percentage — i.e. the entry gate has work to do. */
export function usesPercentages(structure: ProgramStructure): boolean {
  return allExercises(structure).some(hasPercent);
}

/**
 * A readable name for each required max — what the entry gate puts on its rows.
 *
 * Prefers the name of an exercise whose OWN `catalogKey` is the key, because that is the lift being
 * asked about. Taking the first exercise that merely REFERENCES the key would label the back-squat row
 * "Front Squat" in a program where the front squat borrows the squat's max — asking the athlete for a
 * number under the wrong lift's name, which is how a wrong max gets entered confidently.
 *
 * Falls back to the key itself. A key with no exercise of its own is possible (every reference to it is
 * a borrow), and showing the raw key is honest where inventing a title would not be.
 */
export function maxLiftNames(structure: ProgramStructure): Record<string, string> {
  const out: Record<string, string> = {};
  const all = allExercises(structure);
  for (const key of requiredMaxKeys(structure)) {
    out[key] = all.find((ex) => ex.catalogKey === key)?.name ?? key;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPLAY
// ─────────────────────────────────────────────────────────────────────────────

/** How a weight reads on a card — no trailing `.0`, because nobody writes "245.0 lb". */
export function weightText(weight: number, unit: string): string {
  const n = Number.isInteger(weight) ? String(weight) : String(Number(weight.toFixed(1)));
  return `${n} ${unit}`;
}

/**
 * The load half of a prescription line — what follows the sets and reps.
 *
 *   @ 75% — 245 lb                 one percentage, resolved
 *   @ 75%                          no max set yet: the prescription, and no invented number
 *   @ 65-75-80% — 265-305-325 lb   a ramp, shown IN FULL
 *   (empty)                        no percentage at all
 *
 * A ramp is never collapsed to its first or highest value, for the same reason `schemeText` refuses to
 * collapse a rep ladder: the curve is the prescription.
 */
export function loadText(
  ex: ProgramExercise,
  max: number | null | undefined,
  unit: string,
  rules: LoadUnitRules = LB_RULES,
): string {
  const targets = percentTargets(ex);
  const present = targets.filter((p): p is number => p != null);
  if (!present.length) return '';

  const uniform = present.length === targets.length && present.every((p) => p === present[0]);
  const pctText = uniform ? `${present[0]}%` : `${targets.map((p) => (p == null ? '—' : p)).join('-')}%`;

  if (max == null) return `@ ${pctText}`;

  const loads = targets.map((p) => resolveLoad(max, p, rules));
  const resolved = loads.filter((l): l is ResolvedLoad => l != null);
  if (!resolved.length) return `@ ${pctText}`;

  if (uniform) {
    const l = resolved[0];
    return `@ ${pctText} — ${weightText(l.weight, unit)}${l.atBar ? ' (bar)' : ''}`;
  }

  const body = loads.map((l) => (l == null ? '—' : String(l.weight))).join('-');
  return `@ ${pctText} — ${body} ${unit}`;
}
