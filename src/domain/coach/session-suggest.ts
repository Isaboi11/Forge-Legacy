/**
 * What Holt offers when you tap him mid-workout — a swap for the lift in front of you, or the thing
 * today has not trained yet.
 *
 * ══ WHAT THIS FIXES ══
 *
 * PO: *"when clicking on coach holt during a workout you should be able to swap or add exercises, and
 * then have him suggest based off of what the exercise is that you're doing or what you've already
 * done."*
 *
 * Both actions already existed — `SessionCoachSheet` has carried "Can't do this one" and "Add a
 * movement" since the coin shipped. What neither did was **suggest**: each opened the Exercise Picker
 * cold, at the top of a 721-row catalogue, and left the athlete to work out for themselves what a
 * reasonable substitute for a Bulgarian Split Squat is. Asking the coach a question and being handed a
 * search box is the coach declining to answer.
 *
 * ══ TWO DIFFERENT QUESTIONS, TWO DIFFERENT SOURCES ══
 *
 * A SWAP is about the exercise in front of you, so it comes from the authored relationship graph —
 * 5,678 curated edges, ranked, where a Substitute or an Equipment Alternative is somebody's judgement
 * rather than a similarity score. Where the graph is silent, a same-pattern fallback answers rather
 * than showing nothing.
 *
 * An ADD is about the SESSION, so it comes from what today has not touched. "What you've already done"
 * is the whole signal: if the session has pressed and squatted and never pulled, the useful suggestion
 * is a row, and it is useful precisely because nothing else on the screen knows to say it.
 *
 * ══ ⚠ EVERYTHING IS INJECTED, AND THAT IS NOT STYLE ══
 *
 * `exercise-picker/data.ts` and `exercise-relationships/query-service.ts` both import `.json` without
 * an import attribute, so **neither can be loaded by `node --test`** (`ERR_IMPORT_ATTRIBUTE_MISSING`).
 * A module that reached for them directly would be untestable — and this is selection logic, which is
 * exactly the kind that fails quietly and plausibly. So the catalogue arrives as a pool and the graph
 * as a list of keys, the same shape `candidates.ts` takes for the same reason. The screen wires the
 * real data in; the tests wire a hand-written pool.
 */

import { canDoExercise } from '../home-gym/equipment.ts';

/** The subset of `PickerItem` this needs. `PICKER_DB` satisfies it structurally. */
export interface SuggestItem {
  key: string;
  name: string;
  pattern: string;
  equipId: string;
  primaryMuscleIds: readonly string[];
  muscleIds: readonly string[];
}

export interface SuggestionGroup {
  /** The one line Holt says above the row — short, and about THIS athlete's session. */
  reason: string;
  picks: { key: string; name: string }[];
}

const MAX = 3;

/**
 * ⚠ `null` OWNED IS NOT AN EMPTY GYM. An athlete who has never filled in their home gym has `null`, and
 * treating that as "owns nothing" would filter out every suggestion — the failure that makes a feature
 * look broken rather than empty. Only an actual list filters.
 *
 * An athlete who HAS set one is also frequently standing somewhere else, so this narrows the offer and
 * never closes it: the full picker stays one tap away either way.
 *
 * ⚠ A MACHINE IS NEVER FILTERED OUT. `canDoExercise` reads `EQUIP_UNLOCK`, which maps HOME gear ids
 * — a cable stack or a chest press has none, requires nothing, and passes. That is the correct
 * reading: a home-gym list says what someone owns at home and nothing about the gym they may be
 * standing in. Do not "fix" it here; it is the shared helper's rule and other surfaces depend on it.
 */
function affordable(x: SuggestItem, owned: readonly string[] | null | undefined): boolean {
  if (owned == null) return true;
  return canDoExercise({ key: x.key, equipId: x.equipId }, owned);
}

export interface SwapInput {
  /** The lift in front of them — its catalogue key if it has one, and its display name. */
  currentKey?: string | null;
  currentName: string;
  pool: readonly SuggestItem[];
  /** Authored substitutes for `currentKey`, best first. Keys only — the graph is a separate dataset. */
  alternativeKeys?: readonly string[];
  /** Every catalogue key already in this session. Suggesting one of them is suggesting a duplicate. */
  inSession?: readonly string[];
  owned?: readonly string[] | null;
  limit?: number;
}

/**
 * Up to three movements that stand in for the current lift.
 *
 * Order: the authored graph first, in its own ranking, then same-pattern catalogue entries to fill.
 * Never the exercise itself, and never something already on today's card.
 */
export function swapSuggestions(input: SwapInput): SuggestionGroup | null {
  const { currentKey, currentName, pool, alternativeKeys = [], inSession = [], owned, limit = MAX } = input;
  const byKey = new Map(pool.map((x) => [x.key, x]));
  const current = (currentKey ? byKey.get(currentKey) : undefined) ?? pool.find((x) => x.name === currentName);

  const taken = new Set<string>([...inSession]);
  if (current) taken.add(current.key);
  if (currentKey) taken.add(currentKey);

  const out: SuggestItem[] = [];
  const push = (x: SuggestItem | undefined) => {
    if (!x || taken.has(x.key) || !affordable(x, owned)) return;
    taken.add(x.key);
    out.push(x);
  };

  // 1. The authored graph, in the order it ranked them. An edge pointing outside the visible
  //    catalogue resolves to nothing and is skipped — `byKey` is the app's 721, not the file's 797.
  for (const k of alternativeKeys) {
    if (out.length >= limit) break;
    push(byKey.get(k));
  }

  /*
   * 2. Fill from the same movement pattern. Ranked by shared PRIMARY muscles first, then any shared
   *    muscle, then equipment familiarity — a lift you already know how to set up is a better answer
   *    mid-session than a marginally better match you have never done. Name last, so the list is
   *    deterministic and two athletes on the same lift see the same offer.
   */
  if (current && out.length < limit) {
    const scored = pool
      .filter((x) => !taken.has(x.key) && x.pattern === current.pattern && affordable(x, owned))
      .map((x) => ({
        x,
        score:
          x.primaryMuscleIds.filter((m) => current.primaryMuscleIds.includes(m)).length * 30 +
          x.muscleIds.filter((m) => current.muscleIds.includes(m)).length * 10 +
          (x.equipId === current.equipId ? 15 : 0),
      }))
      .sort((a, b) => b.score - a.score || a.x.name.localeCompare(b.x.name));
    for (const s of scored) {
      if (out.length >= limit) break;
      push(s.x);
    }
  }

  if (out.length === 0) return null;
  return {
    reason: `Instead of ${current?.name ?? currentName}`,
    picks: out.map((x) => ({ key: x.key, name: x.name })),
  };
}

/**
 * The patterns worth noticing the absence of, most-missed first.
 *
 * ⚠ NOT EVERY PATTERN IN THE CATALOGUE, AND THAT IS THE POINT. Nobody's session is incomplete for
 * lacking a Carry or calf work, and a coach who said so every time would be noise inside a week. These
 * are the ones a session is genuinely poorer for missing — vocabulary is the catalogue's own
 * `movementPattern`, the same strings `rulebook/skeletons.ts` builds its days out of.
 */
export const GAP_PATTERNS: readonly string[] = [
  'Horizontal Push',
  'Horizontal Pull',
  'Squat / Knee Dominant',
  'Hinge / Hip Dominant',
  'Vertical Pull',
  'Vertical Push',
  'Core',
];

/** Plain words for a pattern, because "Hinge / Hip Dominant" is a slot name, not a sentence. */
const GAP_WORDS: Record<string, string> = {
  'Horizontal Push': 'pressed anything',
  'Horizontal Pull': 'pulled anything',
  'Squat / Knee Dominant': 'squatted',
  'Hinge / Hip Dominant': 'hinged',
  'Vertical Pull': 'pulled overhead',
  'Vertical Push': 'pressed overhead',
  Core: 'trained your core',
};

export interface AddInput {
  /** Catalogue keys already on today's card — what "already done" means here. */
  sessionKeys: readonly string[];
  /** Display names, for exercises logged with no key (anything added before keys were stamped). */
  sessionNames?: readonly string[];
  pool: readonly SuggestItem[];
  owned?: readonly string[] | null;
  limit?: number;
}

/**
 * Up to three movements filling the biggest gap in today's session.
 *
 * ⚠ ONE PATTERN, NOT THREE. The suggestion is an ANSWER — "you haven't pulled, here are three rows" —
 * and offering one exercise from each of three different gaps is a list of everything the session is
 * not, which is a critique. Holt names the first gap in priority order and stops.
 */
export function addSuggestions(input: AddInput): SuggestionGroup | null {
  const { sessionKeys, sessionNames = [], pool, owned, limit = MAX } = input;
  const byKey = new Map(pool.map((x) => [x.key, x]));
  const byName = new Map(pool.map((x) => [x.name, x]));

  const covered = new Set<string>();
  const taken = new Set<string>();
  for (const k of sessionKeys) {
    const x = byKey.get(k);
    taken.add(k);
    if (x) covered.add(x.pattern);
  }
  /* An exercise logged with no catalogue key still counts as work done. Without this the coach tells
     someone who has just benched that they have not pressed. */
  for (const n of sessionNames) {
    const x = byName.get(n);
    if (x) {
      covered.add(x.pattern);
      taken.add(x.key);
    }
  }

  const gap = GAP_PATTERNS.find(
    (p) => !covered.has(p) && pool.some((x) => x.pattern === p && affordable(x, owned)),
  );
  if (!gap) return null;

  /* Compounds first — a movement that covers more of the gap is a better answer to a gap. Name last,
     for determinism. Difficulty is deliberately not a lever here: it is TECHNIQUE demand, not
     readiness, and ranking a beginner away from a barbell row on it would be the wrong reading. */
  const picks = pool
    .filter((x) => x.pattern === gap && !taken.has(x.key) && affordable(x, owned))
    .sort((a, b) => b.muscleIds.length - a.muscleIds.length || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((x) => ({ key: x.key, name: x.name }));

  if (picks.length === 0) return null;
  return { reason: `You haven't ${GAP_WORDS[gap] ?? `trained ${gap.toLowerCase()}`} today`, picks };
}
