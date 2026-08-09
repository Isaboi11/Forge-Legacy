/**
 * Which exercise fills a slot.
 *
 * ══ THE SLOT NAMES A MOVEMENT, NOT AN EXERCISE ══
 *
 * A skeleton says "this day opens with a horizontal push", never "this day opens with a barbell bench
 * press". That indirection is what makes one set of tables serve a full gym, a garage with two dumbbells,
 * and a hotel room: the day's SHAPE is the coaching decision, and which exercise expresses it is a
 * lookup against what the athlete can actually reach.
 *
 * ══ THE POOL IS INJECTED, AND THAT IS THE 721/797 GUARD ══
 *
 * Nothing here reads `exercises.json`. The caller passes the pool, and the caller builds it from
 * `PICKER_DB` — the same source the Exercise Picker renders. The file holds 797 records; the app shows
 * 721. A generator that read the file would prescribe movements the athlete cannot open, search for, or
 * swap, and every one of those is a dead row in a program they trusted. Structurally impossible here:
 * the coach can only choose from what it was handed.
 *
 * It also keeps this module pure — no JSON, no app imports — so the whole goal × equipment × limitation
 * matrix runs in milliseconds under `node --test`.
 *
 * ══ WHAT THIS DELIBERATELY DOES NOT DO ══
 *
 * It does not walk the exercise-relationship graph. That graph answers "given THIS exercise, what else
 * would do?", which is the shape of an edit ("swap this for something else") and not the shape of a
 * fill ("give me a horizontal push"). Filling starts from a pattern with no incumbent to substitute for,
 * so the honest fallback is to relax the pattern (below), not to consult a graph about an exercise
 * nobody has chosen yet. The graph belongs to `edit-ops`, where there is a real incumbent.
 */

import type { Experience, Limitation } from './constraints.ts';
import { isCoherent } from './rulebook/coherence.ts';
import { preferenceRank } from './rulebook/preferences.ts';

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE POOL
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The subset of `PickerItem` this module needs. Structural, so a caller passes `PICKER_DB` straight in
 * with no mapping step — and a test passes four hand-written rows.
 */
export interface CatalogExercise {
  key: string;
  name: string;
  equipId: string;
  pattern: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  primaryMuscleIds: readonly string[];
  muscleIds: readonly string[];
  /** `'Strength' | 'Cardio' | 'Mobility'`. Keeps stretches out of strength slots — see `coherence.ts`. */
  modality?: string;
}

/**
 * Can this be trained with what the athlete has?
 *
 * Injected rather than imported so this module stays free of the home-gym tables — callers pass
 * `canDoExercise` from `home-gym/equipment.ts`, which already composes the per-exercise override, the
 * equipment unlock, and the bench/elevation requirements an exercise needs to lie on or step onto.
 */
export type EquipmentGate = (ex: { key: string; equipId: string }, owned: readonly string[]) => boolean;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// MOVEMENT VOCABULARY
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Patterns that move more than one joint under load, taken from the catalogue's own `movementPattern`
 * vocabulary rather than invented. Compounds go first in a day — the one ordering rule that holds across
 * every goal in the rulebook, which is why it lives here and not in a table.
 */
export const COMPOUND_PATTERNS: ReadonlySet<string> = new Set([
  'Horizontal Push',
  'Vertical Push',
  'Horizontal Pull',
  'Vertical Pull',
  'Squat / Knee Dominant',
  'Hinge / Hip Dominant',
  'Carry',
  'Power / Plyometric',
]);

export const isCompound = (pattern: string): boolean => COMPOUND_PATTERNS.has(pattern);

/**
 * Where a slot goes when its own pattern yields nothing trainable.
 *
 * ⚠ RELAXATION IS A DEMOTION, NOT AN EQUIVALENCE. A vertical push is not a horizontal push; it is the
 * nearest thing that still trains the same tissue in the same direction, and the ladder is ordered so the
 * first fallback is the smallest lie. An empty ladder (`Mobility`, `Core`) means the pattern has no honest
 * neighbour and the slot is dropped instead — a day with one fewer exercise beats a day with a movement
 * that answers a different question.
 */
const RELAXATION: Record<string, readonly string[]> = {
  'Vertical Push': ['Horizontal Push', 'Elbow Extension'],
  'Horizontal Push': ['Vertical Push', 'Elbow Extension'],
  'Vertical Pull': ['Horizontal Pull', 'Elbow Flexion'],
  'Horizontal Pull': ['Vertical Pull', 'Elbow Flexion'],
  'Squat / Knee Dominant': ['Hinge / Hip Dominant', 'Hip Isolation'],
  'Hinge / Hip Dominant': ['Squat / Knee Dominant', 'Hip Isolation'],
  'Elbow Extension': ['Horizontal Push'],
  'Elbow Flexion': ['Horizontal Pull'],
  'Shoulder Isolation': ['Vertical Push'],
  'Hip Isolation': ['Hinge / Hip Dominant'],
  'Calf / Ankle': [],
  Core: [],
  Mobility: [],
  Carry: ['Hinge / Hip Dominant'],
  'Power / Plyometric': ['Squat / Knee Dominant'],
};

/** The patterns to try for a slot, best first: its own, then its documented neighbours. */
export const patternLadder = (pattern: string): readonly string[] => [pattern, ...(RELAXATION[pattern] ?? [])];

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// SELECTION
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface CandidateContext {
  /** `home-gym/equipment.ts` ids, already resolved for the environment. */
  owned: readonly string[];
  canDo: EquipmentGate;
  /** How hard an exercise may be. Gates difficulty; see `difficultyRank`. */
  experience: Experience;
  /** Movement patterns the athlete's limitations rule out. From `rulebook/limitations.ts`. */
  excludePatterns: ReadonlySet<string>;
  /** Catalogue keys to leave out — a limitation's specific exclusions, plus anything the athlete named. */
  excludeKeys: ReadonlySet<string>;
  /** Already used in this day (or block), so a day never prescribes the same movement twice. */
  used: ReadonlySet<string>;
}

const DIFFICULTY_ORDER = { Beginner: 0, Intermediate: 1, Advanced: 2 } as const;
const EXPERIENCE_CEILING: Record<Experience, number> = { beginner: 0, intermediate: 1, advanced: 2 };

/**
 * How well an exercise's difficulty fits the athlete — lower is better.
 *
 * Above their level is barred outright, not penalised: an advanced movement handed to a beginner is a
 * failed rep at best. Below their level is merely suboptimal, and rightly so — an advanced lifter still
 * benches, and a plan that refused to prescribe anything a beginner could also do would be absurd.
 */
function difficultyRank(ex: CatalogExercise, experience: Experience): number | null {
  const d = DIFFICULTY_ORDER[ex.difficulty];
  const ceiling = EXPERIENCE_CEILING[experience];
  if (d > ceiling) return null;
  return ceiling - d;
}

/**
 * Every exercise that could legitimately fill this slot, best first.
 *
 * Ordering is total and deterministic — down to a final sort on `key` — because the same answers must
 * produce the same program every time. A wizard that returned a different plan on a second run would
 * make every bug report unreproducible, and would quietly tell the athlete their plan was arbitrary.
 */
export function candidatesFor(pattern: string, pool: readonly CatalogExercise[], ctx: CandidateContext): CatalogExercise[] {
  if (ctx.excludePatterns.has(pattern)) return [];

  const scored: { ex: CatalogExercise; pref: number; fit: number; breadth: number }[] = [];
  for (const ex of pool) {
    if (ex.pattern !== pattern) continue;
    // The pattern says one thing and the primary mover says another — a leg curl filed under Elbow
    // Flexion is not a biceps exercise, whatever the tag says. See `rulebook/coherence.ts`.
    if (!isCoherent(ex)) continue;
    if (ctx.excludeKeys.has(ex.key) || ctx.used.has(ex.key)) continue;
    if (!ctx.canDo(ex, ctx.owned)) continue;
    const fit = difficultyRank(ex, ctx.experience);
    if (fit == null) continue;
    scored.push({ ex, pref: preferenceRank(pattern, ex.key), fit, breadth: ex.muscleIds.length });
  }

  return scored
    .sort(
      (a, b) =>
        // ⚠ PREFERENCE FIRST, and it outranks everything. Without it the ranker fell through to
        // difficulty-then-breadth-then-alphabetical, which is how a full-gym strength block came to open
        // with an Alternating Dumbbell Bench Press and hinge on a Band Good Morning. Both were valid;
        // neither was what a coach would write. The rulebook names the canonical movement per pattern and
        // that judgement beats any property the catalogue happens to carry.
        // `===` first because both ranks are `Infinity` for two unlisted movements, and `Infinity -
        // Infinity` is NaN. NaN is falsy so `||` would fall through to the next term anyway — by
        // accident, which is not a thing to leave in a comparator.
        (a.pref === b.pref ? 0 : a.pref - b.pref) ||
        a.fit - b.fit ||
        // Among unlisted movements: more musculature per movement. For a compound slot that is the point;
        // for an isolation slot the field is narrow enough that it rarely decides anything.
        b.breadth - a.breadth ||
        a.ex.key.localeCompare(b.ex.key),
    )
    .map((s) => s.ex);
}

/**
 * Fill one slot, relaxing the pattern only if its own yields nothing.
 *
 * Returns `null` rather than reaching further when the ladder is exhausted. A slot that cannot be filled
 * is information — it is what a bodyweight-only athlete's vertical-pull slot looks like without a bar —
 * and the assembler drops it and says so, rather than substituting something that trains a different
 * thing and calling the day complete.
 */
export function fillSlot(
  pattern: string,
  pool: readonly CatalogExercise[],
  ctx: CandidateContext,
): { exercise: CatalogExercise; pattern: string; relaxed: boolean } | null {
  const ladder = patternLadder(pattern);
  for (let i = 0; i < ladder.length; i++) {
    const found = candidatesFor(ladder[i], pool, ctx)[0];
    if (found) return { exercise: found, pattern: ladder[i], relaxed: i > 0 };
  }
  return null;
}

/**
 * Every pattern the athlete can train at all, given their equipment and limitations.
 *
 * The wizard uses this to answer the question BEFORE building — "with what you've got I can give you
 * four of these six movements" — so a bodyweight-only athlete learns what is missing up front instead of
 * finding a thin day in week 3.
 */
export function trainablePatterns(pool: readonly CatalogExercise[], ctx: CandidateContext): Set<string> {
  const out = new Set<string>();
  for (const ex of pool) {
    if (out.has(ex.pattern)) continue;
    if (ctx.excludePatterns.has(ex.pattern)) continue;
    if (!isCoherent(ex)) continue;
    if (ctx.excludeKeys.has(ex.key)) continue;
    if (!ctx.canDo(ex, ctx.owned)) continue;
    if (difficultyRank(ex, ctx.experience) == null) continue;
    out.add(ex.pattern);
  }
  return out;
}

/** Convenience for building a context from a limitation list plus the rulebook's map. */
export function contextFrom(opts: {
  owned: readonly string[];
  canDo: EquipmentGate;
  experience: Experience;
  limitations: readonly Limitation[];
  limitationPatterns: (l: Limitation) => readonly string[];
  limitationKeys?: (l: Limitation) => readonly string[];
  excludeExercises?: readonly string[];
  used?: ReadonlySet<string>;
}): CandidateContext {
  const excludePatterns = new Set<string>();
  const excludeKeys = new Set<string>(opts.excludeExercises ?? []);
  for (const l of opts.limitations) {
    for (const p of opts.limitationPatterns(l)) excludePatterns.add(p);
    for (const k of opts.limitationKeys?.(l) ?? []) excludeKeys.add(k);
  }
  return {
    owned: opts.owned,
    canDo: opts.canDo,
    experience: opts.experience,
    excludePatterns,
    excludeKeys,
    used: opts.used ?? new Set(),
  };
}
