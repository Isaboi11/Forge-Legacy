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
 * ══ THE POOL IS INJECTED, AND THAT IS THE 733/809 GUARD ══
 *
 * Nothing here reads `exercises.json`. The caller passes the pool, and the caller builds it from
 * `PICKER_DB` — the same source the Exercise Picker renders. The file holds 809 records; the app shows
 * 733. A generator that read the file would prescribe movements the athlete cannot open, search for, or
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
import { learnedRank, type LearnedPreferences } from './learned-preference.ts';
import { leastRecent, type RecentWork } from './recent-work.ts';

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
  /**
   * Exercises admitted even though their PATTERN is excluded — `LIMITATION_KEEP_KEYS`.
   *
   * ⚠ IT LOSES TO `excludeKeys`, ALWAYS. A movement named in both is excluded, so a carve-out can never
   * re-admit something another limitation removed on purpose: someone with a bad back AND no barbell
   * gets the bodyweight glute bridge and not the barbell one.
   */
  keepKeys?: ReadonlySet<string>;
  /** Already used in this day (or block), so a day never prescribes the same movement twice. */
  used: ReadonlySet<string>;
  /**
   * What this athlete has repeatedly chosen INSTEAD of what was prescribed — see `learned-preference`.
   *
   * ⚠ PASSED IN, NEVER FETCHED. `domain/coach/**` reads no database and this does not change that: the
   * caller resolves the swaps and hands the finished map down, so `assemble()` stays a pure function of
   * its inputs and the whole engine stays testable without a network.
   *
   * ⚠ AND IT ONLY RE-RANKS WITHIN A PATTERN. It can never remove one — a knee-dominant slot is still
   * filled by a knee-dominant exercise, just the one they actually do. That is what makes preference
   * safe where a blocklist would not be; see the header of `learned-preference.ts`.
   *
   * Optional, and absent means "no opinion" — the ranking is then exactly what it was before this
   * existed, which is the behaviour every athlete who has never swapped anything should get.
   */
  learned?: LearnedPreferences;
  /**
   * What this athlete has trained in the last few sessions — the variety signal (`recent-work.ts`).
   *
   * ⚠ PASSED IN, NEVER FETCHED, exactly like `learned` above and for the same reason.
   *
   * ⚠ AND IT ONLY REORDERS A SHORTLIST THE RULEBOOK ALREADY APPROVED. It can never remove an exercise,
   * shrink a pattern, or make a slot unfillable — see `fillSlot`. Absent means "no history", which
   * reproduces the ranking exactly as it behaved before variety existed.
   */
  recent?: RecentWork;
}

const DIFFICULTY_ORDER = { Beginner: 0, Intermediate: 1, Advanced: 2 } as const;
const EXPERIENCE_CEILING: Record<Experience, number> = { beginner: 0, intermediate: 1, advanced: 2 };

/**
 * ══ ⚠ THE CEILING A SLOT MAY REACH WHEN NOTHING AT THE ATHLETE'S LEVEL FILLS IT ══
 *
 * Reported by the PO: *"I put in to build me a program, home gym with dumbbells and a mat and a bench,
 * and lower back pain, and he gave me two exercises throughout the whole workout."* (2026-08-17)
 *
 * The engine was doing exactly what it was told. `difficultyRank` barred anything above the athlete's
 * level outright, and **`beginner` is a ceiling of `Beginner` only** — so the question became "how much
 * of the catalogue is tagged `Beginner`?" Measured over the 733 records the app actually shows:
 *
 *   Intermediate  590        Beginner  121        Advanced  22
 *
 * `Intermediate` is not a difficulty tier in this dataset, it is the DEFAULT BUCKET. **Push-Up, Plank,
 * Bodyweight Squat and Dumbbell Biceps Curl are all tagged `Intermediate`.** So a beginner with
 * dumbbells, a mat and a bench — 214 movements within reach — was filtered down to **19**, and those 19
 * held zero horizontal push, zero pull of either kind, zero curls, zero triceps, zero calves and zero
 * shoulder isolation. Every one of those slots was then dropped, and a full-body day came back as
 * *Box Squat to Bench · Seated Dumbbell Shoulder Press · Dead Bug* — the same three, every day, for
 * eight weeks.
 *
 * ⚠ **`Advanced` IS A REAL GATE AND STAYS ONE.** Those 22 records are muscle-ups, front and back levers,
 * one-arm pull-ups and archer work — genuinely selective movements where the original reasoning holds
 * exactly as written: handed to a beginner they are a failed rep at best. This raises the floor of the
 * ceiling to `Intermediate` and nothing more, because that is the only tier the distribution shows to be
 * uninformative.
 *
 * ⚠ **AND IT IS A SECOND PASS, NEVER A WIDER FIRST ONE** — see `fillSlot`. A beginner is still offered
 * every beginner-tagged movement first, and only reaches past their level for a pattern that has nothing
 * at their level at all. `candidatesFor` is strict by default so nothing that asks it a question gets a
 * different answer than it did before.
 */
const STRETCH_CEILING: Record<Experience, number> = { beginner: 1, intermediate: 1, advanced: 2 };

/**
 * How well an exercise's difficulty fits the athlete — lower is better, `null` means barred.
 *
 * Below their level is merely suboptimal, and rightly so — an advanced lifter still benches, and a plan
 * that refused to prescribe anything a beginner could also do would be absurd.
 */
function difficultyRank(ex: CatalogExercise, experience: Experience, stretch = false): number | null {
  const d = DIFFICULTY_ORDER[ex.difficulty];
  const ceiling = stretch ? STRETCH_CEILING[experience] : EXPERIENCE_CEILING[experience];
  if (d > ceiling) return null;
  return ceiling - d;
}

/** Is there a tier above this athlete worth a second look? `false` means the two passes are identical. */
export const canStretch = (experience: Experience): boolean =>
  STRETCH_CEILING[experience] > EXPERIENCE_CEILING[experience];

/**
 * May this athlete be prescribed this movement?
 *
 * ⚠ EXPORTED SO `day.ts` CANNOT KEEP ITS OWN COPY OF THE TIERS. The body-part path used to carry a
 * second, identical pair of tables; two tables that must agree are one table that will eventually
 * disagree, and the disagreement would be a single workout and a block prescribing different movements
 * to the same person.
 */
export const difficultyAllows = (ex: CatalogExercise, experience: Experience, stretch = false): boolean =>
  difficultyRank(ex, experience, stretch) != null;

/**
 * Every exercise that could legitimately fill this slot, best first.
 *
 * Ordering is total and deterministic — down to a final sort on `key` — because the same answers must
 * produce the same program every time. A wizard that returned a different plan on a second run would
 * make every bug report unreproducible, and would quietly tell the athlete their plan was arbitrary.
 */
export function candidatesFor(
  pattern: string,
  pool: readonly CatalogExercise[],
  ctx: CandidateContext,
  /**
   * Allow the tier above the athlete — `STRETCH_CEILING`. ⚠ DEFAULTS TO STRICT, deliberately: this is
   * the second half of a two-pass fill and every caller that has not opted in gets exactly the answer it
   * got before the stretch existed.
   */
  stretch = false,
): CatalogExercise[] {
  /* A banned pattern with a carve-out is not a banned pattern — `lower_back` takes the hinge and gives
     back the glute bridge. Bailing out here was what made the carve-out unexpressible. */
  const patternExcluded = ctx.excludePatterns.has(pattern);
  if (patternExcluded && !ctx.keepKeys?.size) return [];

  const scored: { ex: CatalogExercise; pref: number; fit: number; breadth: number }[] = [];
  for (const ex of pool) {
    if (ex.pattern !== pattern) continue;
    if (patternExcluded && !ctx.keepKeys?.has(ex.key)) continue;
    // The pattern says one thing and the primary mover says another — a leg curl filed under Elbow
    // Flexion is not a biceps exercise, whatever the tag says. See `rulebook/coherence.ts`.
    if (!isCoherent(ex)) continue;
    if (ctx.excludeKeys.has(ex.key) || ctx.used.has(ex.key)) continue;
    if (!ctx.canDo(ex, ctx.owned)) continue;
    const fit = difficultyRank(ex, ctx.experience, stretch);
    if (fit == null) continue;
    /* The athlete's own ranking wins when they have one, and it is negative by construction so it
       sorts ahead of the rulebook's canonical order without a second sort key. Nobody with no swaps on
       record is affected in any way. */
    const own = ctx.learned ? learnedRank(ctx.learned, pattern, ex.key) : null;
    scored.push({ ex, pref: own ?? preferenceRank(pattern, ex.key), fit, breadth: ex.muscleIds.length });
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
 * Fill one slot: the athlete's own level first, then the tier above, then the nearest pattern.
 *
 * ══ ⚠ THE ORDER OF THOSE TWO FALLBACKS IS THE COACHING DECISION ══
 *
 * A beginner's `Horizontal Push` slot in a room with dumbbells has nothing tagged `Beginner` in it. The
 * two ways out are a **Push-Up** (right pattern, tagged `Intermediate`) and a **Seated Dumbbell Shoulder
 * Press** (tagged `Beginner`, but a vertical push). Reaching one tier up inside the pattern the day asked
 * for is a far smaller lie than answering a different question at the right tier — so the whole difficulty
 * ladder is walked before the pattern is relaxed at all, and the day gets the push-up.
 *
 * Returns `null` rather than reaching further when both ladders are exhausted. A slot that cannot be
 * filled is information — it is what a bodyweight-only athlete's vertical-pull slot looks like without a
 * bar — and the assembler drops it and says so, rather than substituting something that trains a
 * different thing and calling the day complete.
 */
export function fillSlot(
  pattern: string,
  pool: readonly CatalogExercise[],
  ctx: CandidateContext,
): { exercise: CatalogExercise; pattern: string; relaxed: boolean; stretched: boolean } | null {
  const ladder = patternLadder(pattern);
  const passes: boolean[] = canStretch(ctx.experience) ? [false, true] : [false];
  for (let i = 0; i < ladder.length; i++) {
    for (const stretch of passes) {
      const found = pickWithVariety(candidatesFor(ladder[i], pool, ctx, stretch), ladder[i], ctx);
      if (found) return { exercise: found, pattern: ladder[i], relaxed: i > 0, stretched: stretch };
    }
  }
  return null;
}

/**
 * How many of the ranked candidates count as "the shortlist a coach would accept for this slot".
 *
 * Three. `PATTERN_PREFERENCES` lists five or six per pattern running best-first ACROSS equipment tiers,
 * and `candidatesFor` has already dropped everything the athlete cannot do — so the survivors are that
 * pattern's named movements in the rulebook's own order, and the top three of those are alternatives a
 * coach would actually write. Reaching further down starts trading a barbell bench for a floor press to
 * avoid a repeat, which is variety bought at the cost of the session.
 */
const SHORTLIST = 3;

/**
 * The one place variety enters the engine: take the ranking's shortlist, prefer what was trained least
 * recently, and change nothing else.
 *
 * ══ ⚠ ONLY MOVEMENTS THE RULEBOOK NAMES MAY ROTATE ══
 *
 * This is the whole safety of the feature. `preferenceRank` returns a finite rank for an exercise
 * `PATTERN_PREFERENCES` lists and `Infinity` for everything else; `learnedRank` returns a negative one
 * for something this athlete has repeatedly chosen. Both are judgements about what belongs in the slot.
 * Everything else sorts behind them on difficulty, then muscle breadth, then ALPHABETICALLY — and
 * rotating into that tail is exactly the failure `rulebook/preferences.ts` was written to end: a strength
 * block opening with an *Alternating Dumbbell Bench Press* and hinging on a *Band Good Morning*, because
 * those words sort early. Variety must not reintroduce it. So the shortlist stops at the first unnamed
 * candidate, and a pattern with only one named answer does not rotate at all — it returns that answer,
 * every time, exactly as it did before.
 *
 * ══ IT CAN ONLY REORDER ══
 *
 * Every return value here is an element of `ranked`, which `candidatesFor` already filtered for
 * equipment, limitations, coherence and difficulty. Nothing is added, nothing is removed, and a slot that
 * could be filled before can still be filled. With no history — a new athlete, or a read that failed —
 * every staleness is `Infinity`, ties go to the ranking, and `ranked[0]` comes back untouched.
 */
export function promoteLeastRecent(
  pattern: string,
  ranked: readonly CatalogExercise[],
  ctx: CandidateContext,
): readonly CatalogExercise[] {
  if (ranked.length < 2 || !ctx.recent) return ranked;

  const named: CatalogExercise[] = [];
  for (const ex of ranked) {
    const isLearned = ctx.learned ? learnedRank(ctx.learned, pattern, ex.key) != null : false;
    // The named ones are always the LEADING run: learned ranks are negative and listed ranks are finite,
    // so both sort ahead of every `Infinity`. Breaking on the first unnamed candidate is therefore the
    // same set as filtering, and says out loud that the tail is off limits.
    if (!isLearned && preferenceRank(pattern, ex.key) === Infinity) break;
    named.push(ex);
    if (named.length === SHORTLIST) break;
  }

  // One named answer (or none) is not a choice. Leave the ranking exactly as it is.
  if (named.length < 2) return ranked;
  const pick = leastRecent(named, (ex) => ex.key, ctx.recent);
  if (!pick || pick === ranked[0]) return ranked;
  /* The rest keep their order. Only the head moves, so everything downstream that walks deeper into the
     list — `selectForFocus` filling a thin day — still sees the rulebook's sequence behind it. */
  return [pick, ...ranked.filter((ex) => ex !== pick)];
}

/** `promoteLeastRecent`, for the caller that only wants the winner. */
function pickWithVariety(
  ranked: readonly CatalogExercise[],
  pattern: string,
  ctx: CandidateContext,
): CatalogExercise | null {
  return promoteLeastRecent(pattern, ranked, ctx)[0] ?? null;
}

/**
 * Every pattern the athlete can train at all, given their equipment and limitations.
 *
 * The wizard uses this to answer the question BEFORE building — "with what you've got I can give you
 * four of these six movements" — so a bodyweight-only athlete learns what is missing up front instead of
 * finding a thin day in week 3.
 *
 * ⚠ IT ASKS THE SAME QUESTION `fillSlot` ANSWERS, INCLUDING THE STRETCH. `weekIsViable` reads this to
 * decide whether a split can be built at all, so a stricter answer here than the filler actually uses
 * would restructure a beginner to full body over patterns the filler was about to fill perfectly well.
 */
export function trainablePatterns(pool: readonly CatalogExercise[], ctx: CandidateContext): Set<string> {
  const out = new Set<string>();
  const stretch = canStretch(ctx.experience);
  for (const ex of pool) {
    if (out.has(ex.pattern)) continue;
    if (ctx.excludePatterns.has(ex.pattern) && !ctx.keepKeys?.has(ex.key)) continue;
    if (!isCoherent(ex)) continue;
    if (ctx.excludeKeys.has(ex.key)) continue;
    if (!ctx.canDo(ex, ctx.owned)) continue;
    if (difficultyRank(ex, ctx.experience, stretch) == null) continue;
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
  /** Exercises a limitation admits despite banning their pattern — `limitationKeepKeys`. */
  limitationKeepKeys?: (l: Limitation) => readonly string[];
  excludeExercises?: readonly string[];
  used?: ReadonlySet<string>;
  /** What this athlete keeps choosing instead — resolved by the CALLER, never fetched here. */
  learned?: LearnedPreferences;
  /** What they trained in the last few sessions — resolved by the CALLER. See `recent-work.ts`. */
  recent?: RecentWork;
}): CandidateContext {
  const excludePatterns = new Set<string>();
  const excludeKeys = new Set<string>(opts.excludeExercises ?? []);
  const keepKeys = new Set<string>();
  for (const l of opts.limitations) {
    for (const p of opts.limitationPatterns(l)) excludePatterns.add(p);
    for (const k of opts.limitationKeys?.(l) ?? []) excludeKeys.add(k);
    for (const k of opts.limitationKeepKeys?.(l) ?? []) keepKeys.add(k);
  }
  /* ⚠ EXCLUSION WINS, AND IT IS RESOLVED HERE RATHER THAN AT EVERY READ SITE. A carve-out must never hand
     back something that was removed on purpose — most concretely, `excludeExercises` is the athlete
     naming a movement themselves, and a limitation quietly overruling that would be the worst version of
     this feature. Doing it once means no filter downstream can forget the precedence. */
  for (const k of excludeKeys) keepKeys.delete(k);
  return {
    learned: opts.learned,
    recent: opts.recent,
    owned: opts.owned,
    canDo: opts.canDo,
    experience: opts.experience,
    excludePatterns,
    excludeKeys,
    keepKeys,
    used: opts.used ?? new Set(),
  };
}
