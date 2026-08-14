/**
 * WHAT THE COACH HAS TO SAY RIGHT NOW — one line, chosen from everything he could say.
 *
 * ══ WHY THIS IS A DECISION AND NOT A LAYOUT ══
 *
 * The Active Workout had three things the coach could tell you and drew two of them as separate cards
 * stacked inside the exercise hero: `THE PLAN SAYS` (the author's written cue) and `HOLT SAYS`
 * (`progressionFor`'s sentence about your last two sessions). **The hero auto-collapses the first time
 * a set resolves**, so both went away after set one and stayed away — while a medallion sat in the
 * corner saying nothing at all.
 *
 * Moving them onto the coin means they can no longer be stacked: a bubble is one line. So something has
 * to choose, and choosing is a rule rather than a style, which is why it lives here and is tested.
 *
 * ══ THE ORDER, AND THE REASON FOR IT ══
 *
 * Most recent wins, because the athlete is standing in front of a bar and the newest fact is the one
 * that changes what they do next:
 *
 *   1. `live` — about the set they just finished. Ten seconds old.
 *   2. `progression` — about their last session on this lift. Days old.
 *   3. `planCue` — what the author wrote about this movement. Timeless.
 *
 * A timeless technique cue is not less valuable, but it is still true in thirty seconds and the other
 * two are not. Nothing is lost by ranking it third; it surfaces whenever the two above are silent,
 * which on a first-time lift or a quiet setting is most of the session.
 *
 * ⚠ NULL IS A REAL ANSWER and the caller must render the mark alone for it. A bubble containing nothing
 * is worse than no bubble: it makes the coach look like he is thinking.
 *
 * Pure and node-testable: no React, no RN, no storage, no runtime `@` imports.
 */

/** Which of the three the line came from. The caller may attribute; it does not have to. */
export type CoachLineSource = 'live' | 'progression' | 'plan';

export interface CoachLineInput {
  /**
   * A line about the set just logged — the mid-set nudge. Null whenever there is nothing to say, which
   * is most sets and every set at the quietest intensity.
   */
  live?: string | null;
  /**
   * The weight `live` is asking them to REACH, in pounds — `intraSetSuggestion().suggestedWeight`.
   * Null when the line names no weight, which makes it exempt from the currency rule below.
   */
  liveUpTo?: number | null;
  /** `progressionFor().message` for the exercise on screen. */
  progression?: string | null;
  /**
   * The weight `progression` is asking them to reach. ⚠ ONLY for `action === 'add_weight'` — see the
   * currency rule below for why `hold`, `back_off` and `add_reps` must NOT set this.
   */
  progressionUpTo?: number | null;
  /** The author's `coachNote` on this exercise — "brace before you unrack", "feel it in your legs". */
  planCue?: string | null;
  /**
   * The heaviest weight already logged on THIS exercise in THIS session, in pounds. Null before the
   * first set. This is what makes the two lines above expire.
   */
  heaviestThisSession?: number | null;
  /**
   * ⚠ **HOW MANY SETS OF THIS EXERCISE ARE ALREADY LOGGED — THE ARRIVAL LINES RETIRE AFTER THE FIRST.**
   *
   * PO, 2026-08-14: *"there are times where I get to an exercise, coach holt says something, and then
   * after I do the first set it doesn't go away. It should be gone after the first set."*
   *
   * This reverses a decision recorded above, and the reversal is right. The old reasoning was that a
   * technique cue "is as true on the fourth set as the first" — true, and beside the point. Both
   * `progression` and `planCue` are things Holt says when you WALK UP to the bar: where to start, and
   * what to watch for on the first rep. Once the athlete has done a set they know both, and a sentence
   * that will not leave stops reading as coaching and starts reading as a stuck screen.
   *
   * `heaviestThisSession` could not carry this job. It is null for every bodyweight lift and for any
   * set logged without a weight, so a plank's cue would have hung there all session — and it answers a
   * different question anyway (*have they passed the number he named*, not *have they started*).
   */
  setsDoneThisExercise?: number;
}

export interface CoachLine {
  text: string;
  source: CoachLineSource;
}

const clean = (s: string | null | undefined): string | null => s?.trim() || null;

/**
 * ══ HAS THE ATHLETE ALREADY DONE THE THING HE IS ASKING FOR? ══
 *
 * PO, from a real session: *"I did one set of 85lbs for ten reps, coach holt said move up the weight to
 * 95lbs for 8 reps. The first was a warmup so the second set I actually did 165lbs for 8 reps. He still
 * said move up to 95lbs. He needs to stay current."*
 *
 * Both lines the coin can carry are written ONCE and neither had any way to expire:
 *
 *   · `progression` is computed from the last two SESSIONS when the exercise loads. It is advice about
 *     where to START today, and after the athlete has started it is a statement about a decision they
 *     have already made.
 *   · `live` is written by `completeSet` on the set that earned it and then simply stays. A later set
 *     that warrants nothing leaves the older sentence standing.
 *
 * ⚠ AND FIXING ONLY ONE OF THEM FIXES NOTHING VISIBLE. They say the same thing in this case — a 10 lb
 * step off 85 is 95 either way — and `live` outranks `progression`, so clearing the nudge alone just
 * uncovers the identical sentence underneath it. The athlete sees no change and concludes the coach is
 * broken, which he was.
 *
 * So the rule is one rule, applied to both: **a line telling you to reach a weight is spent once you
 * have logged a set at or above it.** 165 answers "go to 95" completely — there is nothing left in that
 * sentence for the athlete to act on.
 *
 * ⚠ ONLY LINES THAT ASK THEM TO GO UP. The caller passes `progressionUpTo` for `add_weight` and nothing
 * else, and the reason is that the other verdicts do not mean what this test would read into them:
 * `hold` names the weight they are supposed to stay at, and `back_off` names the one they are supposed
 * to rebuild from — logging a set AT that weight is the advice being followed, not finished, and
 * retiring the line there would silence the coach exactly when he is asking for three more sets of the
 * same. `add_reps` and `no_history` name no weight at all.
 *
 * ⚠ AND ZERO IS NOT A WEIGHT HERE. A bodyweight lift logs `weight: 0` as a real answer, and its
 * progression is measured in reps (`progressionFor`'s `weight === 0` branch). `0 >= 0` would retire
 * every bodyweight line the instant the first push-up was logged.
 */
function spent(upTo: number | null | undefined, heaviest: number | null | undefined): boolean {
  if (upTo == null || upTo <= 0) return false;
  if (heaviest == null) return false;
  return heaviest >= upTo;
}

/**
 * The one thing the coin says, or null for the mark alone.
 *
 * Whitespace-only is nothing, not something — an author who opened the cue field and thought better of
 * it must not put an empty bubble on the athlete's screen for the whole exercise.
 */
export function coachLine(input: CoachLineInput): CoachLine | null {
  const heaviest = input.heaviestThisSession;
  /*
   * ⚠ **THE ARRIVAL LINES ARE FOR THE FIRST SET.** Both `progression` and `planCue` are what Holt says
   * as you walk up to the bar — where to start, and what to watch on the first rep. After a set they
   * have been read, acted on, and are just words that will not leave. See `setsDoneThisExercise`.
   *
   * ⚠ `live` IS EXEMPT AND MUST STAY THAT WAY. It is written BY a completed set, so retiring it on the
   * same signal that created it would mean the mid-set nudge appeared and vanished in one render —
   * every line the coin exists to carry, gone before it could be read.
   */
  const started = (input.setsDoneThisExercise ?? 0) > 0;

  const live = clean(input.live);
  if (live && !spent(input.liveUpTo, heaviest)) return { text: live, source: 'live' };

  const progression = clean(input.progression);
  if (!started && progression && !spent(input.progressionUpTo, heaviest)) return { text: progression, source: 'progression' };

  /*
   * ⚠ A SPENT LINE STILL FALLS THROUGH rather than returning null — that part of the old rule stands.
   * Going quiet because one sentence expired, while another is sitting unread underneath it, is the
   * coach losing his thread rather than finishing a thought.
   */
  const planCue = clean(input.planCue);
  if (!started && planCue) return { text: planCue, source: 'plan' };

  return null;
}
