/**
 * WHAT HOME DRAWS, AND WHY — the one decision Home makes about itself, extracted so it can be argued with.
 *
 * THE ATHLETE WHO NEVER BUILDS A PROGRAM IS NOT AN EMPTY STATE. They are a permanent, first-class kind of
 * athlete, and the data layer has always agreed: `save_workout` bumps `chapters.workout_count` and calls
 * `evaluate_honors` with no program filter, and rank reads every saved workout regardless of `program_id`.
 * Only the screen disagreed. It told them "You don't have a program yet" on every launch, forever — the
 * literal message `Home-Screen-Wireframe-Spec-H1.md` §6 forbids ("No placeholder. No 'no program' message."),
 * on a screen whose own failure list says H-1 fails when it "communicates what the athlete has NOT done" —
 * and it withheld the Tier 3 Workout CTA the same spec marks **Always** present and never disabled.
 *
 * So this module answers one question — what is on Home right now — and the answers are deliberately named
 * after what the athlete sees rather than what they lack. There is no `isEmpty` here and there should never
 * be one.
 *
 * Pure and node-testable: no React, no RN, no storage, no `@` imports.
 */

/**
 * Which face the hero card wears. `'none'` is not "empty" — it is "we do not yet know enough to say
 * anything", which is a different and much shorter-lived thing.
 */
export type HomeHero = 'program' | 'resume' | 'open' | 'none';

/** Which face the first-run starting-point slot wears. `'none'` = the slot is not on screen at all. */
export type HomeStartingPoint = 'none' | 'chooser' | 'intake' | 'suggestion';

export interface HomeStateInput {
  /**
   * The chapter/awaiting query has not resolved. NOTHING that frames the athlete's state may draw yet.
   *
   * `useQuery` starts at `data: null`, and `awaiting == null` used to read as "not awaiting" — so the very
   * first frame of a brand-new athlete's first launch told them they didn't have a program. One frame is
   * still a frame, and it is the worst possible frame to say that on.
   */
  chapterLoading: boolean;
  /** Active chapter with zero saved workouts — they have arrived but not yet trained. */
  awaiting: boolean;
  /**
   * They have already answered "How do you want to start?" — they walked through one of its doors.
   *
   * `awaiting` alone was one beat too late. It comes off the server as "has logged a workout", so an
   * athlete who tapped "Start a freestyle workout" and came back mid-session saw their Continue card AND
   * the question underneath it, asked again over the evidence they had answered it. Choosing is the
   * answer; training is just the first thing they do after.
   */
  startChosen: boolean;
  hasProgram: boolean;
  /** The program actually yielded a session to show. A program with no next day is not a hero. */
  hasProgramSession: boolean;
  /** Logged sets sitting in the local autosave, or null when there is no unfinished work. */
  resumeSets: number | null;
  /** `catalogCanRecommend()` — whether the guided on-ramp is offered at all. */
  guidedOnRamp: boolean;
  /** Intake answered, nothing chosen yet. */
  hasSuggestion: boolean;
  /** They tapped "Help me find one" and are mid-stepper. */
  guidedPathOpen: boolean;
}

export interface HomeComposition {
  hero: HomeHero;
  /** Whether the hero shows its quiet "Something else today?" link. */
  heroOffersFreestyle: boolean;
  startingPoint: HomeStartingPoint;
  /** The quiet "Or just train today" under the starting-point slot. */
  showQuietFreestyle: boolean;
  /** The quiet "Want a plan? Build or browse →" under the hero. */
  showQuietProgramLink: boolean;
  showMissionTile: boolean;
  showProgramTile: boolean;
}

/**
 * Compose Home from what is known about the athlete right now.
 *
 * RESUME OUTRANKS EVERYTHING, INCLUDING A PROGRAM DAY, and that precedence is load-bearing rather than
 * cosmetic. The logger reads a launch intent arriving on top of logged work as a conflict and asks "resume
 * it, or start what you just picked?" — so a Home that offered the program day over unfinished work would
 * walk the athlete straight into a question they did not ask. It is the same reasoning that makes
 * `continueWorkout` deliberately write no launch intent at all.
 */
export function composeHome(s: HomeStateInput): HomeComposition {
  const hasResume = s.resumeSets != null;

  /*
   * THE LOADING FRAME CLAIMS NOTHING — with exactly one exception.
   *
   * Unfinished work lives in local storage, so it is knowable before any query returns and is the one true
   * thing Home can say on the first frame. Everything else waits. A hero that says "Train Today" and then
   * swaps to a program day is worse than a beat of nothing.
   */
  if (s.chapterLoading) {
    return {
      hero: hasResume ? 'resume' : 'none',
      heroOffersFreestyle: hasResume,
      startingPoint: 'none',
      showQuietFreestyle: false,
      showQuietProgramLink: false,
      showMissionTile: false,
      showProgramTile: false,
    };
  }

  /*
   * SETTLED — past the starting-point question, by either of the two things that close it.
   *
   * Training closes it (`!awaiting`), and so does ANSWERING it (`startChosen`). Only the first used to
   * count, which made the question outlive its own answer: tap "Start a freestyle workout", train, come
   * back before saving, and Home showed the Continue card with "How do you want to start?" underneath —
   * asked again, directly over the proof it had been answered.
   */
  const settled = !s.awaiting || s.startChosen;

  const hero: HomeHero = hasResume
    ? 'resume'
    : s.hasProgramSession
      ? 'program'
      : // Settled and program-less: the Tier 3 CTA the spec marks Always. Only an athlete who has neither
        // trained nor chosen gets the chooser instead — the question is worth asking exactly once.
        settled
        ? 'open'
        : 'none';

  /*
   * The open hero's button IS the freestyle choice — it opens "What are you training?" (the spec's W-8
   * Activity Type Picker). A "Something else today?" link beneath it would be the same tap twice, which is
   * the rule the starting-point slot already encodes for its own freestyle card.
   */
  const heroOffersFreestyle = hero === 'program' || hero === 'resume';

  /* "Help me find one" deliberately does NOT settle anything — it is a stepper that lives ON this slot and
   * ends in a program. Only the three doors that LEAVE the chooser (freestyle, build, browse) record a
   * choice, which is why `StartChoice` has exactly those three values. */
  const startingPoint: HomeStartingPoint =
    s.hasProgram || settled
      ? 'none'
      : s.hasSuggestion
        ? 'suggestion'
        : s.guidedPathOpen
          ? 'intake'
          : 'chooser';

  return {
    hero,
    heroOffersFreestyle,
    startingPoint,
    // Only under the chooser, and only when the chooser's first card is the guided one — otherwise that
    // card is already "Start a freestyle workout" and this link repeats it.
    showQuietFreestyle: startingPoint === 'chooser' && s.guidedOnRamp,
    // Subordinate on purpose. Training is the primary action; a program is an option, not a prerequisite.
    // It appears the moment they settle, so the athlete who chose freestyle always has a route to one.
    showQuietProgramLink: !s.hasProgram && settled,
    /*
     * The Mission tile was never program-dependent. It reads live chapter goals, and it disappeared for
     * program-less athletes only because ONE guard (`home.name &&`) covered a two-tile grid. Restoring it
     * is the whole fix; the tile itself needs no change.
     */
    showMissionTile: s.hasProgram || settled,
    showProgramTile: s.hasProgram,
  };
}

/** The minimum a Home program row has to expose for the selection below. */
export interface HomeProgramRow {
  id: string;
  state: 'future' | 'active' | 'graduated' | 'ended_early';
}

export interface HomePrograms<T> {
  /** The one Home may offer a session from. Null unless a program is genuinely underway. */
  active: T | null;
  /** The one the Current Program tile names and links to — a planned program still belongs here. */
  anchor: T | null;
}

/**
 * Which of the athlete's programs Home is allowed to speak for.
 *
 * ══ THE DISTINCTION IS THE WHOLE POINT ══
 *
 * `active` is a program the athlete pressed Start on. `anchor` is merely the one worth NAMING. Home's
 * hero may only ever read `active`: the moment a planned program could hand it a session, Home rendered
 * the enrolled experience — a Day A hero, "Continue Training" — for somebody who had never started
 * anything, and there is no visual difference between that and enrolment because it IS the enrolled
 * layout. A program you have not begun is not a program you are on.
 *
 * A SEALED PROGRAM ANCHORS NOTHING. Graduated and ended-early are history; offering to continue one is
 * offering a workout that cannot advance anything.
 *
 * This lives here, tested, because the same mistake has now been made three times in Home's program
 * precedence — first `[0]` (newest, including sealed), then the `future` fallback.
 */
export function selectHomePrograms<T extends HomeProgramRow>(programs: readonly T[] | null | undefined): HomePrograms<T> {
  const rows = programs ?? [];
  const active = rows.find((p) => p.state === 'active') ?? null;
  return { active, anchor: active ?? rows.find((p) => p.state === 'future') ?? null };
}
