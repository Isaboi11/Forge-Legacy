/**
 * The coach, as a conversation.
 *
 * ══ THE CHAT IS THE WIZARD, RE-CLOTHED ══
 *
 * `Coach Holt Chat.dc.html` is explicit about this and it is the reason the surface can ship before any
 * model exists: *"The locked wizard questions, one per turn, arriving character by character."* Every
 * question below is a question `/coach` already asks, every chip is an option it already offers, and the
 * program at the end comes out of `assemble()` — the same deterministic rulebook, unchanged.
 *
 * So this module is not a chatbot. It is a **state machine over `CoachConstraints`** that decides which
 * single question is still worth asking, and phrases it the way Holt would say it out loud.
 *
 * ══ WHERE THE MODEL GOES LATER ══
 *
 * Exactly one function changes: `interpret()`. Today it matches a typed answer against the chips for the
 * question actually on the table, which is honest and covers the wizard's whole surface. The paid tier
 * replaces its body with a model call that maps free text onto the same `Partial<CoachConstraints>` —
 * and **nothing else in the app moves**, because the model never gains a way to author training. It
 * fills in the same fields a tap fills in.
 *
 * That is the seam the whole plan rests on: the AI cannot emit an invalid program because it is not
 * writing one.
 */

import {
  ENDURANCE_GOALS,
  STRENGTH_GOALS,
  isEnduranceGoal,
  GOAL_LABEL,
  type CoachConstraints,
  type Experience,
  type Goal,
  type Limitation,
} from './constraints.ts';
import { AUTHORED_GOALS } from './rulebook/skeletons.ts';
/* Type-only — the shelf is passed IN by the caller, exactly like `learned`. `domain/coach/**` reads no
   database and this does not change that. */
import type { Recommendation as ShelfRecommendation } from './recommend.ts';
import { RACE_SPEC, weeklyVolumePlan } from './rulebook/endurance.ts';
import { pick, pickNamed } from './rulebook/voice.ts';
import { BODY_PART_LABEL, BODY_PARTS, SPLIT_LABEL, type BodyPart, type DayFocus, type SplitName } from './day.ts';
import { plannedDays, trainingDays } from '../program/progress-core.ts';
/* The canonical prescription renderer — the one Program Detail and the logger read. A second one here
   would drift, and the local `prescriptionText` below is already the shape that drift takes. */
import { schemeText } from '../program/prescription.ts';
import type { ProgramStructure } from '@/data/programs-live';

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE THREAD
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Which of the three voices a line is in. Text is conversation; a card is an object. Never both. */
export type Turn =
  /** `at` is epoch ms, stamped when the turn is appended. Absent on threads stored before v2. */
  | { kind: 'me'; text: string; at?: number }
  /** `live` types itself out, character by character. Exactly one turn at a time may be live. */
  | { kind: 'holt'; text: string; live?: boolean; at?: number }
  /** `ctl` is how they are DRAWN (v2 layer 2). Absent → the 2-col chip grid, which is what every
   *  answer used to be. The openers and the help menu carry none, and correctly render as chips. */
  | { kind: 'chips'; chips: Chip[]; ctl?: QuestionControl }
  | { kind: 'program'; card: ProgramCard }
  /** A program off the shelf — somebody else's work, offered with reasons AND reservations. */
  | { kind: 'pick'; card: PickCard }
  | { kind: 'day'; card: DayCard }
  | { kind: 'edit'; card: EditCard }
  | { kind: 'refusal'; card: RefusalCard }
  | { kind: 'explain'; name: string; catalogKey: string | null }
  | { kind: 'stop'; text: string }
  | { kind: 'error'; text: string; sub: string; action: string }
  | { kind: 'saved'; text: string }
  | { kind: 'wall' };

/** Everything on the program card, all of it out of the engine. */
export interface ProgramCard {
  kicker: string;
  title: string;
  /** v2 §7's title block — `4 days · 8 weeks · Strength`. The shape of the block in one line. */
  subtitle: string;
  stats: { value: string; label: string }[];
  /** Weekly volume, one entry per week. Empty for a block whose shape is not volume. */
  ribbon: number[];
  ribbonCaption: string;
  reasoning: string;
  /**
   * The block, week by week. v2 §7 draws these as rows with bronze markers.
   *
   * ⚠ `days` IS WHY THE DRILL-DOWN COULD NOT WORK BEFORE. PO, 2026-08-14: *"be sure that we can see each
   * individual day in a drop down from the week. It won't show them right now."* The card carried
   * `"4 sessions"` — a COUNT, composed here — and nothing else, so there was nothing for a row to open
   * onto. The sessions are read off the structure the engine actually built, per week, so a block that
   * varies (six days for two weeks, then five) shows the week it really is rather than week one repeated.
   */
  /**
   * ⚠ `items` IS WHY THE PREVIEW COULD SHOW WEEKS AND NOTHING UNDER THEM. PO, 2026-08-16: *"It shows
   * the weeks, but I need to be able to see the days and what's within the days."* `days` carried a
   * marker and a title — enough to name a session, not enough to describe one — so `PlanPreview` had
   * nothing to draw even though its own doc comment promised "every week, every day, every movement".
   *
   * `scheme` is `schemeText`, the same renderer Program Detail and the logger use, so a ladder reads as
   * `6-6-4-4` here exactly as it does there rather than being flattened to its first number.
   */
  weeks: {
    label: string;
    detail: string;
    days: { marker: string; title: string; items: { name: string; scheme: string }[] }[];
  }[];
  /** v2 §7's closing row, under its own rule: what every session in the block costs. */
  closing: string;
}

export interface DayCard {
  kicker: string;
  title: string;
  rows: { name: string; prescription: string }[];
}

export interface EditCard {
  kicker: string;
  fromLabel: string;
  fromValue: string;
  toLabel: string;
  toValue: string;
}

/** A refusal always carries the counter-offer. That is the whole point of it. */
export interface RefusalCard {
  title: string;
  meta: string;
  body: string;
  primary: string;
  secondary: string;
  /**
   * ⚠ THE GOAL THE PRIMARY BUTTON ACTUALLY BUILDS, and its absence is why that button did nothing.
   *
   * The card was rendered with two `Button`s and no `onPress` on either, because nothing on it said
   * which race "Build the half marathon" meant — the label was a sentence, not a key. A refusal whose
   * whole purpose is that the alternative is a THING WITH A BUTTON, shipped with a button that was a
   * picture of one.
   */
  altGoal: Goal;
}

/**
 * A single tap in the edit flow.
 *
 * ⚠ SERIALISABLE ON PURPOSE. Chips live in the thread and the thread is written to storage between
 * visits, so nothing here may be a function, a class or a live object graph.
 */
export type EditPick =
  | { step: 'session'; weekIndex: number; dayIndex: number }
  | { step: 'change'; change: string }
  | { step: 'row'; index: number }
  | { step: 'value'; sets?: number; targetMi?: number; targetSec?: number; replacementKey?: string; replacementName?: string }
  | { step: 'scope'; scope: 'this_week' | 'rest_of_block' };

export interface Chip {
  /** Narrows the goal question to the distances instead of answering it. Only "Run a race" carries it. */
  picksRace?: boolean;
  /** A help question, answered from HELP_TOPICS. Never touches training. */
  helpTopic?: string;
  /** A route this chip leaves for. The only chips that close the sheet. */
  goTo?: string;
  /** One step of changing a live program. Must stay JSON-serialisable — the thread is persisted. */
  edit?: EditPick;
  /**
   * One tap of the multi-select focus question. The patch is NOT computed per chip, because what the
   * day ends up being depends on every other tap — see `mergeFocus`.
   */
  focus?: FocusPick;
  /**
   * Records the athlete's training level and STOPS. Nothing is built.
   *
   * ⚠ IT NEEDS ITS OWN FLAG BECAUSE THE LABELS COLLIDE. These chips carry the same three labels the
   * build questionnaire uses, so matching on the text — the trick the one-off chips above use — would
   * make correcting your level indistinguishable from answering the question mid-build, and one of the
   * two must not kick off an assembly.
   */
  /**
   * Leaves the shelf and puts Holt to work — the escape hatch on every recommendation and every refusal.
   *
   * ⚠ **IT NEEDS ITS OWN FLAG BECAUSE THE MODE HAS TO CHANGE, AND A PATCH CANNOT CHANGE IT.** A chip's
   * `patch` fills in constraints; the conversation's MODE is not one. Without this, "write me one
   * instead" fell straight back into `advance(..., 'pick')` — the same four answers, the same shelf, the
   * same card — so the one door out of a recommendation quietly returned you to it.
   *
   * ⚠ **AND IT IS NOT AN `OPENERS` LABEL, DELIBERATELY.** Routing it through `fromOpener` would work and
   * would put "Build me something" in the transcript directly under a card the athlete had just turned
   * down, which reads as the app not having heard them. The request is the same; the sentence is not.
   *
   * ⚠ Whatever has already been answered is KEPT. Goal, level, days and room are the same facts a build
   * needs, so he asks for the two the shelf never needed — session length, and anything to work around —
   * rather than starting the conversation again.
   */
  startsBuild?: boolean;
  levelOnly?: boolean;
  label: string;
  /** What tapping it fills in. The typed path resolves to the same thing — see `interpret`. */
  /* Widened to ChatState so a chip can carry `dayFocus`, which describes one WORKOUT rather than the
     athlete. `interpret()` still returns `Partial<CoachConstraints>` — the AI seam stays exactly as
     narrow as it was, and a model still cannot reach anything a tap could not. */
  patch: Partial<ChatState>;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE QUESTIONS
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * What the CHAT knows, which is the athlete's constraints plus the one thing only the conversation cares
 * about.
 *
 * ⚠ `pickingRace` IS NOT A CONSTRAINT AND MUST NEVER BECOME ONE. "Run a race" is a tap that narrows the
 * question without answering it — there is no such goal, and inventing one (defaulting to a 5k, say)
 * would have the engine build a plan for a distance nobody chose. It lives here, out of
 * `CoachConstraints`, so it cannot reach `assemble()` even by accident.
 */
export type ChatState = Partial<CoachConstraints> & {
  pickingRace?: boolean;
  /**
   * What today's session is FOR — the question the day flow never asked.
   *
   * ⚠ NOT A CONSTRAINT. A `CoachConstraints` describes an ATHLETE; this describes one workout, and only
   * in day mode. Keeping it out of the constraint shape is what stops it leaking into a program build.
   */
  dayFocus?: DayFocus;
};

export type QuestionId =
  | 'size'
  | 'goal'
  | 'day_focus'
  | 'race_distance'
  | 'race_when'
  | 'race_base'
  | 'days'
  | 'where'
  | 'time'
  | 'experience'
  | 'limits';

/**
 * How a question's answers are drawn — Coach Holt Chat v2, layer 2: **the question picks the control.**
 *
 * Every question rendered as the same wrap of pills, which is why the screen read as a form rather than
 * as a conversation. The shape now carries meaning:
 *
 *   · `chips`     — 2-col grid, 48pt, a leading icon and a check when chosen. A SET of unlike things.
 *   · `segmented` — one equal-width row. A scale WITH AN ORDER TO IT: 2·3·4·5·6 days, 30·45·60·75 min.
 *                   Laid out in a row precisely because the order is the information.
 *   · `cards`     — full-width, title + sub + radio. A choice that needs a SENTENCE to be fair, where a
 *                   two-word pill would make the athlete guess what they were picking.
 *   · `grid`      — 2-col, 52pt. Like `chips`, for options that are places or equipment rather than
 *                   intentions.
 *   · `imports`   — action rows with chevrons. NOT a selection: bringing something in is an ACT, and it
 *                   leaves the conversation. The control type is the answer type.
 *
 * ⚠ OPTIONAL, AND ABSENT MEANS `chips`. A question that forgets to declare one still renders exactly as
 * it does today, so adding this could not regress a flow — and a future question is never blocked on
 * someone remembering to pick a shape.
 */
export type QuestionControl = 'chips' | 'segmented' | 'cards' | 'grid' | 'imports' | 'multi' | 'multi_limits';

/** The shape each question is drawn in. Absent → `chips`. */
export const CONTROL_FOR: Partial<Record<QuestionId, QuestionControl>> = {
  // Ordered scales. A row, left to right, because "more" is a direction.
  days: 'segmented',
  time: 'segmented',
  race_when: 'segmented',
  // Needs a sentence: "a year or two, on and off" is not a pill.
  experience: 'cards',
  race_base: 'cards',
  // Places and kit.
  where: 'grid',
  /* ⚠ THE ONLY QUESTION YOU MAY ANSWER MORE THAN ONCE. Every other one advances on the tap; this one
     collects and waits, because "chest and triceps and a bit of conditioning" is one answer. */
  day_focus: 'multi',
  /*
   * ⚠ THE SECOND QUESTION YOU MAY ANSWER MORE THAN ONCE — AND IT ALWAYS SHOULD HAVE BEEN.
   *
   * PO: *"this is when I'm having coach holt build me a program or a day workout or template. I should
   * be able to choose multiple things."*
   *
   * A body has more than one complaint. The wizard at `/coach` has always let you tap Shoulders AND
   * Lower back — `LIMITATIONS` is an array everywhere downstream, `assemble()` unions the excluded
   * patterns, and `constraints.ts` de-duplicates the list. **Only the CHAT could not say it.** Each chip
   * carried `{ limitations: [one] }` and answering advanced the question, so a shoulder and a knee were
   * a choice between two true things, and whichever the athlete tapped second was never heard.
   *
   * That is the worst place in the app to lose an answer: `rulebook/limitations.ts` names itself the
   * closest thing here to health guidance, and this is the question that feeds it.
   *
   * Its own control type rather than `multi`, because the commit is different — the focus question
   * merges splits and body parts through `mergeFocus`, and a list of limitations is just a list.
   */
  limits: 'multi_limits',
  // Everything else — goal, race_distance — is a set of unlike things, answered once.
};

export interface Question {
  id: QuestionId;
  /** Holt's line. Spoken, not labelled — the wizard's heading rewritten as something a person says. */
  ask: string;
  chips: Chip[];
  /** A question the athlete may pass on. `limits` is the only one, because "none" is a real answer. */
  skippable?: boolean;
  /** v2 layer 2. Omitted → `chips`, so nothing regresses by being forgotten. */
  ctl?: QuestionControl;
}

const chip = (label: string, patch: Partial<CoachConstraints>): Chip => ({ label, patch });

/**
 * ⚠ **NOT OFFERED IS NOT THE SAME AS NOT AUTHORED** (PO, 2026-08-14: *"Take out Get Fitter"*).
 *
 * `conditioning` keeps its skeletons, its default length and its place in `AUTHORED_GOALS`, because
 * programs already running under it must keep building — deleting the goal would break a block somebody
 * is six weeks into. What changes is that Holt stops putting it on the table: it sat between "Build
 * muscle" and "Lose weight" answering neither question well, and an athlete who wants to be fitter is
 * better served by one of the two either side of it.
 *
 * The filter is here, in the CHAT, rather than in the rulebook, for exactly that reason.
 */
const NOT_OFFERED: readonly Goal[] = ['conditioning'];

const offerable = (g: Goal): boolean => AUTHORED_GOALS.includes(g) && !NOT_OFFERED.includes(g);

/**
 * The next thing worth asking, or `null` when there is enough to build.
 *
 * ⚠ ORDER IS NOT COSMETIC. Goal comes first because it decides which questions even exist — a race asks
 * for a date and a starting mileage, a strength block asks for a split and a room, and asking a marathon
 * runner what equipment they own would be the coach not listening.
 */
/**
 * ⚠ **A SINGLE DAY IS NOT A ONE-WEEK PROGRAM, AND ASKING IT PROGRAM QUESTIONS IS THE BUG THE PO HIT.**
 *
 * "What should I train today?" was walking the whole block questionnaire: what are you training FOR, how
 * many days a week can you train — neither of which has anything to do with one session — and then never
 * asking the only question that mattered, which is what they wanted to train. It handed back a full-body
 * workout to somebody who came in wanting back and biceps.
 *
 * So the mode decides which questions exist. A day asks: what, how long, where, how experienced, anything
 * to avoid. Nothing else.
 */
/**
 * Which conversation is being had.
 *
 * ⚠ **`pick` IS NOT A THIRD THING HOLT BUILDS.** `program` and `day` both end in `assemble()` or
 * `buildDayWorkout()` — Holt writing training. `pick` ends in an ID off the shelf and writes nothing.
 * It is a mode because it asks a DIFFERENT, SHORTER set of questions, and because everything downstream
 * needs to know that the artifact at the end is somebody else's work rather than his.
 */
export type ChatMode = 'program' | 'day' | 'pick';

export function nextQuestion(c: ChatState, mode: ChatMode = 'program'): Question | null {
  return withControl(mode === 'day' ? nextDayQuestion(c) : mode === 'pick' ? askShelf(c) : askProgram(c));
}

/**
 * ══ THE SHELF'S OWN QUESTIONNAIRE — SHORTER THAN THE BUILD'S, AND SHORTER ON PURPOSE ══
 *
 * PO, 2026-08-24: *"should we have a button in the program that says (and it would be a subtle button)
 * don't know which to choose? Let us help"* — and then, of the two ways to answer it, *"I say build
 * both"*. This is the half that answers the question as asked, with a program off the shelf.
 *
 * Four questions, and every one of them is a fact the athlete owns about themselves. What is dropped
 * from `askProgram`, and why each one had to go:
 *
 *   · **`size`** — a catalogue program is however many weeks its author wrote. Asking would be taking an
 *     answer that is about to be overruled by a JSON file, which is the exact defect `sizeQuestion`'s own
 *     note records against asking a race how long it should be.
 *   · **`time`** — likewise. The sessions are already written; their length is a fact about them.
 *   · **`limits`** — ⚠ **THE ONE THAT MATTERS.** `assemble()` unions the excluded patterns and writes
 *     around a bad shoulder. A fixed set of authored sessions cannot, and asking anyway would collect an
 *     answer nothing could act on. `constraints.ts` already refused to ship that shape once, for the
 *     absent `wrists` flag: *"a checkbox that changes nothing is worse than an absent one — the athlete
 *     ticks it, believes they have been heard, and gets the same program."* So the limit is STATED on the
 *     card instead (`SHELF_CANNOT_ADAPT`), where it doubles as the honest reason to have him write one.
 *
 * ⚠ **A RACE IS LET STRAIGHT THROUGH, unanswered.** There is not one Running program on the shelf, so
 * asking a marathon runner about their room and their days would be four questions collected in order to
 * say no. `recommendFromShelf` refuses on the goal alone; this returns `null` immediately so it can.
 */
function askShelf(c: ChatState): Question | null {
  const goalQuestion = askProgram({});
  if (c.goal == null && !c.pickingRace) return goalQuestion;
  if (c.goal == null) return askProgram({ pickingRace: true });

  // Nothing on the shelf answers a race. Let the recommender say so rather than interrogating them first.
  if (isEnduranceGoal(c.goal)) return null;

  if (c.experience == null) return experienceQuestion(c);

  if (c.daysPerWeek == null) {
    return {
      id: 'days',
      /* The build flow's own line. It is the same question about the same diary, and two phrasings of it
         would be the app sounding like two people. */
      ask: pick('ask_days'),
      chips: [2, 3, 4, 5, 6].map((n) => chip(`${n} days`, { daysPerWeek: n })),
    };
  }

  if (c.environment == null) {
    return {
      id: 'where',
      ask: pick('ask_where'),
      chips: [
        chip('Full gym', { environment: 'full_gym' }),
        chip('My home gym', { environment: 'home' }),
        chip('Bodyweight only', { environment: 'bodyweight' }),
      ],
    };
  }

  return null;
}

/**
 * Stamp each question with its control shape, in ONE place.
 *
 * The alternative was a `ctl:` line on each of the ten return sites, which is ten chances to forget and
 * no way to see the vocabulary as a whole. Here the mapping is a table you can read (`CONTROL_FOR`), and
 * a question that is not in it gets `chips` — the shape everything used before this existed.
 */
function withControl(q: Question | null): Question | null {
  return q && !q.ctl ? { ...q, ctl: CONTROL_FOR[q.id] ?? 'chips' } : q;
}

/**
 * ══ HOW LONG IS THE BLOCK? — PO, 2026-08-13 and 2026-08-14 ══
 *
 * First: *Holt should be able to build a week or a single day, not only a multi-week program.* Then:
 * *"when building a program I think we should be able to choose how long the program should be."*
 * Those are one question, so it is one question — a scale from a single week to twelve.
 *
 * ⚠ **IT MOVED FROM THE OPENER INTO THE QUESTIONNAIRE, AFTER THE GOAL, AND THAT FIXED A REAL PROBLEM.**
 *
 * The first cut asked it at the BUILD door, before anything else, offering *A program* or *One week*.
 * Adding real lengths to that made an existing awkwardness impossible to keep: `assembleEnduranceGoal`
 * derives a race block's length from `raceDate` and enforces per-race floors of six to twelve weeks, so
 * an athlete who picked "12 weeks" and then picked "Run a marathon" would have had their answer
 * silently overruled by the calendar. The first cut worked around that by REMOVING the race door once
 * "One week" was chosen — a fix that only covered one of the four answers.
 *
 * Asked after the goal, it is simply **skipped for a race**, and the two can no longer disagree at all.
 *
 * ⚠ **`missingFor()` STILL GAINS NOTHING.** It is the constraint VALIDATOR, and putting `weeks` in it
 * would make every other build path in the app — the wizard, an import, a rebuild from a refusal —
 * start demanding a length it already knows or does not need. The question is the CHAT's; `undefined`
 * means nobody asked, and `assemble` falls back to `defaultWeeksFor` exactly as it always has.
 */
export const BLOCK_LENGTHS: readonly number[] = [1, 4, 8, 12];

export function sizeQuestion(): Question {
  return {
    id: 'size',
    ask: pick('ask_size'),
    ctl: 'segmented',
    chips: BLOCK_LENGTHS.map((w) => chip(w === 1 ? 'One week' : `${w} weeks`, { weeks: w })),
  };
}

/** A single week. Decides the goal chips, the days wording, and what the artifact's buttons save. */
export const isOneWeek = (c: ChatState): boolean => c.weeks === 1;

/**
 * Running experience, which is NOT the same answer as lifting experience.
 *
 * ⚠ ONE CHIP USED TO SET BOTH. `{ lifting: e, running: e }` meant a fifteen-year lifter who has never
 * run a step tapped "Advanced" and was advanced at running too. The volume rail catches the dangerous
 * half of that — answering "I don't run at the moment" forces the beginner day-floor whatever they said,
 * because more days before the tissue is ready is how a new runner gets hurt (EPS-D7) — but the HARD/EASY
 * MIX is composed from `experience.running`, so they would have got a beginner's mileage arranged in an
 * advanced athlete's intensity distribution.
 *
 * Weekly mileage is simply the better signal, and the race questionnaire already collects it one question
 * earlier (`race_base`). So this needs no new question: where a real mileage answer exists it decides,
 * and where it does not — every non-race build — the athlete's own word stands exactly as before.
 *
 * The bands follow `race_base`'s own chips: 0 and "under 5" are somebody who does not currently run,
 * 5–20 is a runner, and 20+ a seasoned one. Deliberately never rounds UP past what they claimed: an
 * athlete who says beginner and runs 30 miles a week is still coached as a beginner, because the
 * downside of the two mistakes is not symmetric.
 */
export function runningExperienceFor(stated: Experience, weeklyMi: number | null | undefined): Experience {
  if (weeklyMi == null) return stated;
  const fromMileage: Experience = weeklyMi < 5 ? 'beginner' : weeklyMi < 20 ? 'intermediate' : 'advanced';
  const rank: Record<Experience, number> = { beginner: 0, intermediate: 1, advanced: 2 };
  return rank[fromMileage] < rank[stated] ? fromMileage : stated;
}

/** Has the athlete told us they are new to this? Read from the answer OR from what he remembers. */
const isNewToTraining = (c: ChatState): boolean => c.experience?.lifting === 'beginner';

/**
 * The level question, asked from two places — before the length question on a lifting block, and after
 * the mileage answer on a race. One definition, so the two cannot drift into asking it differently.
 */
function experienceQuestion(c: ChatState): Question {
  return {
    id: 'experience',
    ask: pick('ask_experience'),
    chips: (['beginner', 'intermediate', 'advanced'] as Experience[]).map((e) =>
      // Running is read off the mileage they already gave, never off this tap alone — see
      // `runningExperienceFor`. On a lifting build `currentWeeklyMi` is undefined and this is `e`.
      chip(EXPERIENCE_LABEL[e], { experience: { lifting: e, running: runningExperienceFor(e, c.currentWeeklyMi) } }),
    ),
  };
}

function askProgram(c: ChatState): Question | null {

  if (c.goal == null && !c.pickingRace) {
    /*
     * ⚠ **THE FIVE RACES ARE ONE CHIP.** Listing 5k, 10k, half, marathon and triathlon alongside "get
     * stronger" made the endurance half of the catalogue shout over the other half, and the PO read the
     * screen the way an athlete would: too many doors for one question. "Run a race" is the decision
     * most people are actually making; the distance is a second, easier tap once they have made it.
     */
    return {
      id: 'goal',
      ask: pick('ask_goal'),
      chips: [
        ...STRENGTH_GOALS.filter(offerable).map((g) => chip(GOAL_LABEL[g], { goal: g })),
        { label: 'Run a race', patch: {}, picksRace: true },
      ],
    };
  }

  if (c.goal == null) {
    return {
      id: 'race_distance',
      ask: pick('ask_race_distance'),
      chips: ENDURANCE_GOALS.filter(offerable).map((g) => chip(GOAL_LABEL[g], { goal: g })),
    };
  }

  const endurance = isEnduranceGoal(c.goal);

  /*
   * ⚠ EXPERIENCE COMES BEFORE THE LENGTH QUESTION ON A LIFTING BLOCK, BECAUSE IT DECIDES IT.
   *
   * On a race it stays where it always was — below `race_base` — because the mileage answer REFINES it
   * (see `runningExperienceFor`), and a race skips the length question anyway. So it is only the lifting
   * path that gains anything by asking earlier, and only the lifting path that moves.
   *
   * Costs a returning athlete nothing either way: the level is remembered between conversations, so this
   * branch is skipped entirely for anyone who has answered it once.
   */
  if (!endurance && c.experience == null) return experienceQuestion(c);

  /* ⚠ SKIPPED FOR A RACE, WHICH IS THE WHOLE REASON IT SITS HERE RATHER THAN AT THE DOOR. A race block's
     length is counted back from `raceDate` against per-race floors, so asking would be taking an answer
     Holt is about to overrule. See the note on `sizeQuestion`.
     *
     * ⚠ AND SKIPPED FOR A BEGINNER, WHO IS BEING ASKED TO GUESS.
     *
     * "A block, or one week?" is a question about training STRUCTURE, and somebody who has never trained
     * has no basis for preferring four weeks to twelve — they pick one and hope. Everything else in this
     * questionnaire is a fact they own: their goal, their days, their room, their session length (which
     * is a diary question, not a training one, and stays). This is the only rung that asks them to have
     * an opinion about programming.
     *
     * `weeks` is deliberately left UNDEFINED rather than defaulted here — `missingFor` does not require
     * it, and `assemble` falls back to `defaultWeeksFor`, which is the engine's own answer and a better
     * one than a number picked in the chat. */
  if (!endurance && !isNewToTraining(c) && c.weeks === undefined) return sizeQuestion();

  if (endurance && c.raceDate == null) {
    return {
      id: 'race_when',
      ask: pick('ask_race_when'),
      chips: [6, 8, 12, 16, 20, 26].map((w) => chip(w === 26 ? 'Six months or more' : `About ${w} weeks`, { raceDate: isoInWeeks(w) })),
    };
  }

  if (endurance && c.currentWeeklyMi == null) {
    return {
      id: 'race_base',
      ask: pick('ask_race_base'),
      chips: [
        chip("I don't run at the moment", { currentWeeklyMi: 0, canRunContinuously: false }),
        chip('Under 5 miles', { currentWeeklyMi: 3 }),
        chip('5 to 10 miles', { currentWeeklyMi: 8 }),
        chip('10 to 20 miles', { currentWeeklyMi: 15 }),
        chip('20 to 30 miles', { currentWeeklyMi: 25 }),
        chip('More than 30', { currentWeeklyMi: 35 }),
      ],
    };
  }

  if (c.daysPerWeek == null) {
    return {
      id: 'days',
      /* The PO's own words, kept verbatim — this line already ships in the wizard. A one-week build gets
         its own: "how many days A WEEK can you train" asks what you can SUSTAIN, and there is nothing to
         sustain in a week that ends on Sunday. */
      ask: endurance ? pick('ask_days_run') : isOneWeek(c) ? pick('ask_days_week') : pick('ask_days'),
      chips: [2, 3, 4, 5, 6].map((n) => chip(`${n} days`, { daysPerWeek: n })),
    };
  }

  // A race is run wherever they run. Asking about equipment would be answering a question nobody asked.
  if (!endurance && c.environment == null) {
    return {
      id: 'where',
      ask: pick('ask_where'),
      chips: [
        chip('Full gym', { environment: 'full_gym' }),
        chip('My home gym', { environment: 'home' }),
        chip('Bodyweight only', { environment: 'bodyweight' }),
      ],
    };
  }

  if (!endurance && c.sessionMinutes == null) {
    return {
      id: 'time',
      ask: pick('ask_time'),
      chips: ([30, 45, 60, 75] as const).map((m) => chip(m === 75 ? '75+ minutes' : `${m} minutes`, { sessionMinutes: m })),
    };
  }

  // Only a race reaches this — the lifting path answered it above, before the length question.
  if (c.experience == null) return experienceQuestion(c);

  if (c.limitations == null) {
    return {
      id: 'limits',
      ask: pick('ask_limits'),
      skippable: true,
      chips: [
        chip('Nothing — build it', { limitations: [] }),
        ...LIMIT_CHIPS.map(([label, l]) => chip(label, { limitations: [l] })),
      ],
    };
  }

  return null;
}

/**
 * The day's own questionnaire.
 *
 * ⚠ THE FOCUS CHIPS OFFER SPLITS *AND* MUSCLE PAIRS, and the pairs are not redundant. "Pull" and "Back &
 * biceps" build differently — one is a movement-pattern split, the other names the muscles — and an
 * athlete who came in thinking "back and biceps day" should not have to work out that we call it Pull.
 * `day.ts` already supported both; nothing here was asking.
 */
/**
 * ══ WHAT TODAY IS FOR — twelve doors, and you may open more than one (PO, 2026-08-14) ══
 *
 * The old list shipped the COMBINATIONS: "Chest & Triceps", "Back & Biceps", "Shoulders & arms". Every
 * one of those is a pairing somebody at the gym made up, and the list could only ever hold the handful
 * we thought of — an athlete who trains chest and back on the same day had no way to say so, and the
 * three pairs we did ship crowded out the parts themselves.
 *
 * So the pills are the ATOMS and the athlete does the combining. Twelve of them, and picking Chest and
 * Triceps is now something they did rather than something we anticipated.
 *
 * ⚠ **A SPLIT IS EXCLUSIVE; PARTS COMBINE.** "Push" already names a whole day — it IS a list of patterns
 * — so "Push and Legs" is not a session, it is two. Selecting a split clears the parts and selecting a
 * part clears the split. That rule lives in `mergeFocus` so the sheet cannot hold a different opinion.
 *
 * ⚠ **AND CARDIO IS NOT A MUSCLE.** It rides as a flag on the focus rather than a ninth `BodyPart` —
 * see the note on `DayFocus.cardio`. It combines with anything, including nothing.
 */
export type FocusPick =
  | { kind: 'split'; split: SplitName }
  | { kind: 'part'; part: BodyPart }
  | { kind: 'cardio' };

export const FOCUS_PICKS: readonly { label: string; pick: FocusPick }[] = [
  { label: SPLIT_LABEL.full_body, pick: { kind: 'split', split: 'full_body' } },
  { label: SPLIT_LABEL.push, pick: { kind: 'split', split: 'push' } },
  { label: SPLIT_LABEL.pull, pick: { kind: 'split', split: 'pull' } },
  { label: SPLIT_LABEL.legs, pick: { kind: 'split', split: 'legs' } },
  { label: SPLIT_LABEL.upper, pick: { kind: 'split', split: 'upper' } },
  { label: BODY_PART_LABEL.chest, pick: { kind: 'part', part: 'chest' } },
  { label: BODY_PART_LABEL.back, pick: { kind: 'part', part: 'back' } },
  { label: BODY_PART_LABEL.shoulders, pick: { kind: 'part', part: 'shoulders' } },
  { label: BODY_PART_LABEL.biceps, pick: { kind: 'part', part: 'biceps' } },
  { label: BODY_PART_LABEL.triceps, pick: { kind: 'part', part: 'triceps' } },
  { label: BODY_PART_LABEL.core, pick: { kind: 'part', part: 'core' } },
  { label: 'Cardio', pick: { kind: 'cardio' } },
];

/**
 * Fold the taps into one focus, keeping the split/parts rule.
 *
 * ⚠ THE LAST SPLIT WINS AND IT WINS OUTRIGHT. Tapping Push after Chest means the athlete changed their
 * mind about the shape of the day, not that they want a push session that also does chest — "Push"
 * already contains a chest movement. Silently merging them would double the pressing and quietly spend
 * a third of the session's budget on it.
 */
export function mergeFocus(picks: readonly FocusPick[]): DayFocus | null {
  const lastSplit = [...picks].reverse().find((p) => p.kind === 'split');
  if (lastSplit && lastSplit.kind === 'split') return { kind: 'split', split: lastSplit.split };

  const parts = picks.filter((p): p is Extract<FocusPick, { kind: 'part' }> => p.kind === 'part').map((p) => p.part);
  const cardio = picks.some((p) => p.kind === 'cardio');
  if (parts.length === 0 && !cardio) return null;
  // De-duplicated, and in the order the catalogue names them rather than the order they were tapped, so
  // the same three taps always produce the same day.
  const ordered = BODY_PARTS.filter((b) => parts.includes(b));
  return cardio ? { kind: 'body_parts', parts: ordered, cardio: true } : { kind: 'body_parts', parts: ordered };
}

const sameFocus = (a: FocusPick, b: FocusPick): boolean =>
  a.kind === b.kind &&
  (a.kind !== 'split' || (b.kind === 'split' && a.split === b.split)) &&
  (a.kind !== 'part' || (b.kind === 'part' && a.part === b.part));

/**
 * Is this pill lit?
 *
 * ⚠ **ASKED DIRECTLY, BECAUSE INFERRING IT FROM `toggleFocus` IS WRONG FOR SPLITS.** The obvious
 * shortcut — "toggling it would make the list shorter, so it must be on" — holds for a part and fails
 * for a split: toggling an UNSELECTED split returns a list of one, which is shorter than two selected
 * parts, so Push and Pull would both draw as chosen while neither was.
 */
export const hasFocus = (picks: readonly FocusPick[], p: FocusPick): boolean => picks.some((x) => sameFocus(x, p));

/** Selecting a split replaces everything; selecting anything else drops the split. Used by the control. */
export function toggleFocus(picks: readonly FocusPick[], next: FocusPick): FocusPick[] {
  if (hasFocus(picks, next)) return picks.filter((p) => !sameFocus(p, next));
  if (next.kind === 'split') return [next];
  return [...picks.filter((p) => p.kind !== 'split'), next];
}

function nextDayQuestion(c: ChatState): Question | null {
  if (c.dayFocus == null) {
    /*
     * ⚠ **THE PAIRINGS ARE GONE AND THE PAIRED DAYS ARE NOT** (PO, 2026-08-14).
     *
     * This question used to ship "Chest & Triceps", "Back & Biceps" and "Shoulders & arms" as single
     * chips. Every one of those was a combination we happened to think of, and the athlete who trains
     * chest and back together had no way to say so at all. Now the pills are the parts and the athlete
     * combines them — three taps still produce the shoulders-and-arms day, and eleven others besides.
     *
     * ⚠ `patch` IS EMPTY ON PURPOSE. What the day becomes depends on every tap, not on this one, so the
     * focus is folded by `mergeFocus` when they say they are done. A per-chip patch here would make the
     * last tap silently win.
     */
    return {
      id: 'day_focus',
      ask: pick('ask_day_focus'),
      chips: FOCUS_PICKS.map(({ label, pick: p }) => ({ label, patch: {}, focus: p })),
    };
  }
  /*
   * ⚠ **ASKED FOR A SINGLE DAY TOO, AND IT WAS NOT.** The same back-and-biceps session is 5 × 5 heavy
   * under a strength goal and 3 × 12 under a hypertrophy one — a different workout, not a variation of
   * one. It also decides the coaching cue, which is why a one-off session used to carry none.
   *
   * ⚠ NO RACES HERE. A marathon is a block, not a Tuesday, and the focus chips above are all lifting —
   * offering "run a race" as the purpose of one back-and-biceps session would be nonsense.
   */
  if (c.goal == null) {
    return {
      id: 'goal',
      ask: pick('ask_day_goal'),
      chips: STRENGTH_GOALS.filter(offerable).map((g) => chip(GOAL_LABEL[g], { goal: g })),
    };
  }
  if (c.sessionMinutes == null) {
    return {
      id: 'time',
      ask: pick('ask_time'),
      chips: ([30, 45, 60, 75] as const).map((m) => chip(m === 75 ? '75+ minutes' : `${m} minutes`, { sessionMinutes: m })),
    };
  }
  if (c.environment == null) {
    return {
      id: 'where',
      ask: pick('ask_where'),
      chips: [
        chip('Full gym', { environment: 'full_gym' }),
        chip('My home gym', { environment: 'home' }),
        chip('Bodyweight only', { environment: 'bodyweight' }),
      ],
    };
  }
  if (c.experience == null) {
    return {
      id: 'experience',
      ask: pick('ask_experience'),
      chips: (['beginner', 'intermediate', 'advanced'] as Experience[]).map((e) =>
        chip(EXPERIENCE_LABEL[e], { experience: { lifting: e, running: e } }),
      ),
    };
  }
  if (c.limitations == null) {
    return {
      id: 'limits',
      ask: pick('ask_limits'),
      skippable: true,
      chips: [chip('Nothing — build it', { limitations: [] }), ...LIMIT_CHIPS.map(([label, l]) => chip(label, { limitations: [l] }))],
    };
  }
  return null;
}

const EXPERIENCE_LABEL: Record<Experience, string> = {
  beginner: "I'm new to this",
  intermediate: "I've been at it a while",
  advanced: "I know what I'm doing",
};

/**
 * The three level chips, on their own, outside any build.
 *
 * ⚠ THIS EXISTS BECAUSE "ASKED ONCE, EVER" HAD NO SECOND HALF.
 *
 * `loadExperience` seeds the answer on every mount and `askProgram` skips the question whenever it is
 * already set — which is exactly what was asked for, and correct. But `forgetExperience()` was written to
 * undo it and NOTHING EVER CALLED IT, so a level set once could not be changed by any means: not in the
 * coach, not in settings, not by starting a new conversation (which deliberately keeps it). An athlete
 * who answered "I know what I'm doing" on their first day owned that answer permanently, and a beginner
 * who had grown out of it had no way to say so.
 *
 * `levelOnly` keeps these apart from the identical labels in the questionnaire — see `Chip`.
 */
export const LEVEL_CHIPS: readonly Chip[] = (['beginner', 'intermediate', 'advanced'] as Experience[]).map((e) => ({
  label: EXPERIENCE_LABEL[e],
  levelOnly: true,
  patch: { experience: { lifting: e, running: e } },
}));

const LIMIT_CHIPS: [string, Limitation][] = [
  ['Shoulders', 'shoulders'],
  ['Knees', 'knees'],
  ['Lower back', 'lower_back'],
  ['No jumping', 'no_jumping'],
  ['Nothing overhead', 'no_overhead'],
  ['No barbell', 'no_barbell'],
];

function isoInWeeks(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// UNDERSTANDING WHAT THEY TYPED
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Map a typed line onto the question on the table.
 *
 * ⚠ **THIS IS THE ONE FUNCTION THE PAID TIER REPLACES**, and its shape is the whole architecture: text in,
 * `Partial<CoachConstraints>` out. A model doing this job gains no power the keyboard did not already
 * have — it fills the same fields, which are then validated by the same rules and assembled by the same
 * engine. That is why the AI tier cannot emit an invalid program: it is not writing one.
 *
 * Today it is deliberately literal. It matches the chips for the current question, plus the numbers and
 * words that answer them unambiguously. Anything it cannot place returns `null`, and the caller says so
 * plainly rather than guessing — a coach who mishears and proceeds is worse than one who asks again.
 */
export function interpret(text: string, q: Question): Partial<CoachConstraints> | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;

  /*
   * ⚠ **BEFORE THE CHIP LOOP, BECAUSE "1" IS A SUBSTRING OF "12 weeks".**
   *
   * The loop below matches a typed line against chip labels by containment, which is right for words and
   * catastrophic for a bare number on this particular question: someone typing `1`, meaning one week,
   * would fall through "One week" (no digit in it), past "4 weeks" and "8 weeks", and land on "12 weeks"
   * — a twelve-week block from an athlete who asked for one. Snapped to the nearest rung instead.
   */
  if (q.id === 'size') {
    const w = Number(t.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(w) && w > 0) {
      return { weeks: BLOCK_LENGTHS.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a)) };
    }
  }

  // An exact or contained chip label is the common case: people type what they see.
  for (const c of q.chips) {
    const label = c.label.toLowerCase();
    if (t === label || label.includes(t) || t.includes(label)) return c.patch;
  }

  // A bare number answers the two questions that are counts, and nothing else. Scoped to the question on
  // the table so "4" cannot mean four days on one turn and four miles on the next.
  const n = Number(t.replace(/[^0-9.]/g, ''));
  if (Number.isFinite(n) && n > 0) {
    if (q.id === 'days' && n >= 2 && n <= 6) return { daysPerWeek: Math.round(n) };
    if (q.id === 'time') {
      const nearest = [30, 45, 60, 75].reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a));
      return { sessionMinutes: nearest as CoachConstraints['sessionMinutes'] };
    }
    if (q.id === 'race_base') return { currentWeeklyMi: n };
    if (q.id === 'race_when') return { raceDate: isoInWeeks(Math.round(n)) };
  }

  if (q.id === 'limits' && /^(no|none|nothing|nope|all good|i'm fine)/.test(t)) return { limitations: [] };

  return null;
}

/** Holt's line when he could not place an answer. Asks again; never guesses. */
export const NOT_UNDERSTOOD = "I didn't catch that one. Tap it, or say it another way.";

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE OPENING
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** The first-run introduction, verbatim from the design. Shown once. */
export const INTRO: string[] = [
  "I'm Holt.",
  "I don't pick a program off a shelf and put your name on it. You tell me what you're chasing and what your week actually looks like, and I build the block around that.",
  "Nothing gets saved until you've seen every week of it. Start wherever you like.",
];

/**
 * The front door.
 *
 * ⚠ **"45 MINUTES AND DUMBBELLS" IS GONE, AND IT DESERVED TO BE.** It was a demonstration of what typing
 * could do, dressed as an option — it read to the PO as a sentence with no obvious meaning, which is
 * exactly what it was: an example prompt, not a thing anybody wants. An opener has to name something the
 * athlete already wants to do.
 *
 * The four that replace it are the four real reasons to open Holt: build one, train today, bring a plan
 * you already have, or ask how the app works.
 */
export const OPENERS: string[] = [
  /* ⚠ NOT "Build me a program" ANY MORE (PO, 2026-08-14: *"should we have it called 'build a program'
     if it goes into 'program or week'?"*). It should not, and it was the transcript that gave it away:
     the athlete's own line read "Build me a program" and Holt's very next question was "a program, or
     one week?" — the app contradicting the athlete about what they had just asked for. */
  'Build me something',
  'What should I train today?',
  'Change my program',
  "I've got a program already",
  /*
   * ⚠ **THE ONE DOOR THAT DOES NOT END IN HOLT WRITING ANYTHING**, and it was added because the app had
   * no answer to a question athletes were actually asking (PO, 2026-08-24). Stood in front of fourteen
   * named programs, the only help on offer was a door OUT of the catalogue — *let me write you a
   * different one* — which replaces the question rather than answering it.
   *
   * Phrased as the athlete's sentence, not as a capability. "Recommend a program" is a description of
   * what the app does; this is the thing somebody is about to say.
   */
  'Which one should I pick?',
  'How do I…?',
];

/** An opener either starts the questionnaire or leaves the conversation entirely. */
export type OpenerAction =
  | { kind: 'build'; mode: 'program' | 'day'; patch: Partial<CoachConstraints> }
  | { kind: 'import' }
  | { kind: 'edit' }
  /** Read the shelf. Ends in somebody else's program, or in an honest no — never in a build. */
  | { kind: 'pick' }
  | { kind: 'help' };

export function fromOpener(label: string): OpenerAction | null {
  switch (label) {
    case 'Build me something':
      return { kind: 'build', mode: 'program', patch: {} };
    case 'What should I train today?':
      return { kind: 'build', mode: 'day', patch: {} };
    /* ⚠ OFFERED WHETHER OR NOT A PROGRAM IS RUNNING, deliberately. Hiding it would mean fetching the
       athlete's program before he can say hello, and a greeting that waits on the network is the silent
       stall this sheet has already been fixed for once. "You haven't got one running, want me to build
       you one?" is a better answer than a chip that quietly is not there. */
    case 'Change my program':
      return { kind: 'edit' };
    case "I've got a program already":
      return { kind: 'import' };
    case 'Which one should I pick?':
      return { kind: 'pick' };
    case 'How do I…?':
      return { kind: 'help' };
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// WHEN THERE IS NOT ENOUGH TO BUILD A SESSION OUT OF
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * ⚠ **HE SAYS WHY, AND HE OFFERS THE THING THAT WOULD FIX IT.**
 *
 * The PO asked for a bodyweight session and got one movement. The engine was not wrong about the
 * catalogue — there is **not a single vertical or horizontal pull in 733 exercises that needs no
 * equipment at all** — it was wrong to hand back the remainder as though it were a workout. A Plank is
 * not a pull day.
 *
 * So: a refusal, in his voice, carrying the specific reason and a real way out. This is the same shape
 * the endurance rulebook already keeps — *refuse rather than guess* — applied to the one place a lifting
 * day can be impossible.
 *
 * ⚠ **AND NEVER "IGNORE YOUR SHOULDER FOR TODAY".** When the limitation is what makes the session
 * impossible, the offer is a different session, never the same session with the limitation dropped.
 * Anything medical stops flat on this surface and an invitation to train through it would be the one
 * failure here with a cost outside the app.
 */
export interface ThinDay {
  text: string;
  chips: Chip[];
}

/** Re-ask what today is for. `undefined` rather than a delete, because the patch is spread over state. */
const ANOTHER_FOCUS: Chip = { label: 'Train something else', patch: { dayFocus: undefined } };
/** He does not describe the Home Gym screen. He takes them to it. */
const TELL_ME_GEAR: Chip = { label: "Tell you what I've got", patch: {}, goTo: '/home-gym' };

export function thinDayFor(reason: 'gear' | 'limits' | 'both' | 'unknown'): ThinDay {
  switch (reason) {
    case 'gear':
      return {
        text: "That's not a session, it's a warm-up. There's nothing in there I'd have you train — pulling needs something to pull on, and you've told me you've got none of it. A bar, a set of bands or a pair of dumbbells changes the whole day.",
        chips: [TELL_ME_GEAR, ANOTHER_FOCUS],
      };
    case 'limits':
      return {
        text: "You've asked me for that, and you've also told me it's the thing to work around. I'm not going to write you a session that spends its whole time avoiding its own point. Pick something else and I'll build it properly.",
        chips: [ANOTHER_FOCUS],
      };
    case 'both':
      return {
        text: "Between what you've got to hand and what we're working around, there isn't a session in this one. Either would fix it on its own.",
        chips: [TELL_ME_GEAR, ANOTHER_FOCUS],
      };
    default:
      return {
        text: "I can't put a session together for that. Rather than hand you two movements and call it a workout, pick something else and let me do it properly.",
        chips: [ANOTHER_FOCUS],
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// COACH HOME
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The front door, as `Coach Holt Chat v2.dc.html` §3 draws it: three capability cards over two quiet rows.
 *
 * ══ WHY THIS IS A TABLE AND NOT FIVE PILLS ══
 *
 * The openers were a wrap of identical chips, so the five doors read as five equal options — and they are
 * not. Building a block is the thing Holt exists for; asking how the app works is a footnote. The design
 * gives the first three a card with a tag, a sentence of explanation and an arrow, and demotes the other
 * two to rows under a rule. The hierarchy IS the information.
 *
 * ⚠ **EVERY TILE FIRES AN `OPENERS` LABEL, NOT ITS OWN ACTION.** `opener` is the exact string
 * `fromOpener()` resolves, so Home gains no second way into the questionnaire — it is a new way of
 * DRAWING the same five doors. A tile whose `opener` stops resolving is caught by `chat-core.test.mjs`
 * rather than by an athlete tapping a card that does nothing.
 *
 * The card copy is the design's, and it deliberately differs from the opener it fires ("Build a program"
 * vs "Build me a program"). The tile is a capability; the transcript records the request.
 */
export interface HomeCard {
  tag: 'BUILD' | 'TODAY' | 'ADJUST';
  title: string;
  sub: string;
  /** ⚠ Must be a member of `OPENERS`. */
  opener: string;
}

export const HOME_CARDS: readonly HomeCard[] = [
  {
    tag: 'BUILD',
    /* ⚠ IT NO LONGER SAYS "a program", BECAUSE THE NEXT QUESTION ASKS WHICH (PO, 2026-08-14). The tag
       already says BUILD; the title's job is to name what comes out, and two things come out of this
       door. The transcript is what gave it away — the athlete's own line read "Build me a program" and
       Holt's very next question was "a program, or one week?" */
    title: 'A program or a week',
    sub: 'Training built around your goals and schedule.',
    opener: 'Build me something',
  },
  {
    tag: 'TODAY',
    title: 'What should I train?',
    sub: "I'll work around your program and recent training.",
    opener: 'What should I train today?',
  },
  {
    tag: 'ADJUST',
    title: 'Change my program',
    sub: 'Modify your split, volume, exercises or schedule.',
    opener: 'Change my program',
  },
];

/** The two quiet rows under the cards. Same contract: `opener` must be an `OPENERS` member. */
export interface HomeRow {
  /** Which glyph the 26×26 outlined container holds — a rounded square, a circle, or the shelf. */
  icon: 'document' | 'question' | 'shelf';
  label: string;
  opener: string;
}

export const HOME_ROWS: readonly HomeRow[] = [
  { icon: 'document', label: 'I already have a program', opener: "I've got a program already" },
  /*
   * ⚠ **A THIRD ROW, WHICH IS A DELTA FROM `Coach Holt Chat v2.dc.html` §3 — RECORDED, NOT SLIPPED IN.**
   * The design fixes three capability cards over TWO quiet rows. This is a third, and the reason it goes
   * here rather than staying a Discover-only link is the test one file over: *"Five doors in, five doors
   * drawn. A missing one is a capability with no way to reach it from Home."* A door reachable from
   * exactly one screen in the app is the same defect the Discover link was added to fix, one level up.
   *
   * It stays a ROW rather than becoming a fourth card, deliberately. Picking off the shelf is not what
   * Holt is for — the hierarchy the design argues for is still true, and this belongs under the rule with
   * the other two footnotes.
   */
  { icon: 'shelf', label: "I don't know which to choose", opener: 'Which one should I pick?' },
  /* ⚠ IT SAYS THE QUESTION, NOT A DESCRIPTION OF THE QUESTION (PO, 2026-08-14). "Ask Holt something"
     is a category; "How do I…" is the sentence somebody is actually about to finish, and it is the same
     words the topics themselves answer. */
  { icon: 'question', label: 'How do I…', opener: 'How do I…?' },
];

/**
 * Is this the turn Coach Home is drawn in place of?
 *
 * ⚠ **THE THREAD'S SHAPE IS UNCHANGED, AND THAT IS DELIBERATE.** The introduction still ends in an
 * opener chips turn and `greetReturning` still emits one — `intro.test.mjs` and `voice.test.mjs` both
 * assert exactly that, and they are the spec. Home is a RENDERING of that turn, so a thread stored by
 * the previous build restores into the new surface without a migration.
 *
 * Matched on the labels rather than a flag for the same reason: a thread already on a device carries no
 * flag, and a Home that only appears for new conversations would be worse than no Home at all.
 */
export function isHomeTurn(turn: Turn): boolean {
  return (
    turn.kind === 'chips' &&
    turn.chips.length === OPENERS.length &&
    turn.chips.every((c) => OPENERS.includes(c.label))
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// HELP, WITHOUT A MODEL
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * ⚠ **HOLT ANSWERS "HOW DO I…" FROM A WRITTEN LIST, NOT BY UNDERSTANDING THE QUESTION.**
 *
 * This is the honest version of the PO's ask, and the distinction is the whole point. Answering an
 * arbitrary question in the athlete's own words needs a model — that is the paid tier's real pitch, and
 * §12 of the plan says so. What does NOT need a model is the twenty things people actually ask, each
 * written once, properly, by a human. Decision Queue #21 already landed on "static help centre first".
 *
 * So help is a MENU, not a search box. Every answer is a sentence and a destination, and Holt takes you
 * there rather than describing a route and leaving you to find it.
 *
 * ⚠ EVERY `route` BELOW IS A REAL SCREEN. A help topic that lands nowhere is worse than no help topic —
 * `help.test.mjs` walks the app directory and fails if one of these stops existing.
 */
export interface HelpTopic {
  q: string;
  a: string;
  /** Where the answer lives. Holt offers to take them; he does not just point. */
  route: string;
  cta: string;
}

export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    q: 'Start a workout',
    a: "Workouts tab. Pick one off your program, choose any session from the week, or build one from scratch. If a program's running, the next session is already waiting at the top.",
    route: '/(tabs)/workouts',
    cta: 'Take me there',
  },
  {
    q: 'Swap an exercise',
    a: "Tap the exercise while you're training and choose Replace. I'll offer movements that train the same thing with the kit you've got — your sets, reps and weight carry across.",
    route: '/(tabs)/workouts',
    cta: 'Open Workouts',
  },
  {
    q: 'Change a program',
    a: "Open the program and pick the session. You can swap two days around, train one early, or skip it — anything you've already trained stays exactly as it happened.",
    route: '/(tabs)',
    cta: 'Open Home',
  },
  {
    q: 'Import a program',
    a: "Paste it into the Program Builder — a table, a spreadsheet, a plan somebody wrote out. I'll read the weeks out of it and show you what I found before anything is saved.",
    route: '/program-builder?o=import',
    cta: 'Import one',
  },
  /*
   * ⚠ ADDED WITH THE ARTIFACT'S SAVE BUTTONS, because they opened the gap. Holt can now hand back a week
   * or a single day that goes straight into the athlete's own library — and until this topic existed,
   * nothing in the app told them where that library is. A "Save for later" whose result is unfindable is
   * a worse button than one that does nothing.
   */
  {
    q: 'Find something I saved',
    a: "Templates. Anything I've saved for you is there — single sessions under Your Templates, whole weeks under Your Weeks — and you can start one straight from it or edit it first.",
    route: '/templates',
    cta: 'Open Templates',
  },
  {
    q: 'See my history',
    a: 'Activity History has every session you have logged, oldest to newest. Nothing in there can be edited or deleted — that is deliberate.',
    route: '/activity-history',
    cta: 'Show me',
  },
  {
    q: 'Set a goal',
    a: 'Goals live on your chapter. One primary goal at a time, and lifts you log update it on their own — you do not have to come back and tick anything off.',
    route: '/goals',
    cta: 'Open Goals',
  },
  {
    q: 'Add a friend',
    a: 'Search their handle and send a request. Friendship is mutual here — nobody follows anybody.',
    route: '/add-friend',
    cta: 'Add someone',
  },
  {
    q: 'Join a squad',
    a: 'Discover Squads to find one, or take an invite from someone in it. Most squads approve requests rather than opening the door to everyone.',
    route: '/discover-squads',
    cta: 'Find a squad',
  },
  {
    q: 'Tell you my equipment',
    a: "Home Gym. Tick what you actually own and I'll stop prescribing things you can't do — it changes what I build from then on.",
    route: '/home-gym',
    cta: 'Set it up',
  },
  {
    q: 'Understand my rank',
    a: 'Rank comes off what you have actually done — sessions logged, honors earned, chapters closed. It moves slowly on purpose.',
    route: '/honors',
    cta: 'Show me',
  },
];

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// COMING BACK
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * What he says on every visit after the first.
 *
 * ⚠ **THE INTRODUCTION IS FOR STRANGERS.** Replaying "I'm Holt. I don't pick a program off a shelf…" to
 * somebody who has already had that conversation is the single most obvious way for a character to
 * announce that nobody is home. He knows your name by the second visit, and he opens the way a person
 * does — greeting, then the actual question.
 */
export function greetReturning(firstName: string | null | undefined): Turn[] {
  return [
    { kind: 'holt', text: firstName?.trim() ? pickNamed('greet_return', firstName) : pick('greet_return_anon') },
    { kind: 'holt', text: pick('greet_return_second') },
    { kind: 'chips', chips: OPENERS.map((label) => ({ label, patch: {} })) },
  ];
}

/**
 * ⚠ **TYPING IS OFF UNTIL THE MODEL LANDS, BY PO DECISION, AND THAT IS THE HONEST CALL.**
 *
 * `interpret()` matches a typed line against the chips for the question on the table. That is a real
 * capability and it is a narrow one — anything phrased differently comes back "I didn't catch that". A
 * text box that mostly fails is worse than no text box: it advertises an understanding the app does not
 * have, and every failure is the athlete being told they were unclear when the app was.
 *
 * So the composer is hidden and Holt is fully tappable. Nothing underneath it is removed — `send`,
 * `interpret`, the hold-and-drain queue and their tests all stay live, because this flips back to `true`
 * the day the Edge Function answers, and that should be one line rather than a rebuild.
 */
export const TYPING_ENABLED = false;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// WHAT HOLT SAYS ABOUT WHAT HE BUILT
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The line above the program card.
 *
 * Written from the constraints rather than the structure, because it is the *reasoning* that makes it a
 * coach's answer — "built around the three you already run" is the sentence that proves he listened.
 */
export function preamble(c: CoachConstraints, weeks: number): string {
  // A block can be one week since PA2-D1, and "1 weeks" in the coach's own voice reads as a bug in him.
  const wk = `${weeks} week${weeks === 1 ? '' : 's'}`;
  if (isEnduranceGoal(c.goal)) {
    const spec = RACE_SPEC[c.goal];
    const base = c.currentWeeklyMi ?? 0;
    return base > 0
      ? `${pick('lead_block')} ${wk}, ${c.daysPerWeek} days, and it's built around the ${base} miles you already run.`
      : `${pick('lead_block')} ${wk} to the ${spec.label}, starting from where you actually are rather than where you'd like to be.`;
  }
  return `${pick('lead_block')} ${wk}, ${c.daysPerWeek} days a week, built for what you've got.`;
}

/**
 * HOW TO LOAD WEEK ONE — the one thing a first-timer needs and nothing in the app was saying.
 *
 * ══ THE PROBLEM THIS ANSWERS ══
 *
 * No prescription anywhere in Forge carries a weight. `{ sets, reps, unit, restSec }` is the whole shape,
 * and that is right: the logger prefills from what the athlete lifted last time, which is a better answer
 * than any number a program could guess. But somebody who has never trained has no last time. They reach
 * their first set, the weight field is empty, their history reads `—`, and they are stood in front of a
 * rack that runs from 5 to 100 lb with no opinion offered. That is where a new athlete quits.
 *
 * ══ ⚠ A METHOD, NEVER A NUMBER ══
 *
 * Holt knows their goal, their room, their days and their level. He does NOT know their bodyweight, their
 * history, or what they did in a PE lesson fifteen years ago. "Squat 135" is a guess wearing a coach's
 * voice, and it is also unrenderable — weights are stored canonically and converted per athlete, so a
 * literal here would be wrong for everybody training in kilos.
 *
 * What a good coach actually says out loud carries no number at all: start with the empty bar, pick one
 * you could do fifteen with, use the lightest plate that moves. That is safe for every bodyweight, in
 * every unit, and it answers the question completely.
 *
 * ══ WHY IT IS SAID WITH THE PROGRAM, NOT IN THE SESSION ══
 *
 * In-workout coaching is capped at ZERO on the free tier — so delivered as mid-set conversation, the
 * athletes who need this most could never receive it. Said as Holt hands the block over, it ships as part
 * of the build and no cap touches it.
 *
 * ⚠ DELIBERATELY NOT DRAWN FROM THE VOICE POOL. Every other line Holt speaks varies so he does not read
 * as a machine; this one is an instruction about load for somebody who does not yet know what is safe,
 * and instructions do not get to be different on a Tuesday.
 *
 * Returns null for anyone who is not new to this, and for a race — a running block is paced, not loaded,
 * and `race_base` has already asked what they run today.
 */
export function startingLoadLine(c: CoachConstraints): string | null {
  if (c.experience?.lifting !== 'beginner') return null;
  if (isEnduranceGoal(c.goal)) return null;
  switch (c.environment) {
    case 'bodyweight':
      return 'Week one is just you — nothing added anywhere. If ten reps is too many, stop at six and call it the set.';
    case 'home':
      return 'Week one, take the lightest pair you could still get fifteen reps with, and do ten. If it felt easy, go up next week — not this one.';
    default:
      // Full gym, and the outdoor case, which reaches a gym's equipment through the same skeletons.
      return 'Week one, put nothing on the bar. An empty bar is the right answer while you are learning the movement, and anything on a stack starts at the lightest plate that moves.';
  }
}

/** The line above a single day. */
/** The line above a single day, one of several. */
export const dayPreamble = (): string => pick('preamble_day');

/**
 * Whether the constraints are complete enough to build.
 *
 * Not `isComplete` from `constraints.ts`: that one requires `sessionMinutes`, which a race plan never
 * asks for — a long run is as long as it is, so a stated session budget would be a question whose answer
 * changes nothing.
 */
export const readyToBuild = (c: ChatState, mode: ChatMode = 'program'): boolean => nextQuestion(c, mode) == null;

/** The goal keys the chat can actually offer, so a chip can never name a dead end. */
export const OFFERABLE_GOALS: readonly Goal[] = AUTHORED_GOALS.filter(offerable);

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// TURNING WHAT THE ENGINE BUILT INTO WHAT THE CARD SHOWS
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The program card, filled from the engine's own output.
 *
 * ⚠ EVERY FIGURE IS READ, NEVER COMPOSED. The design's stat grid names six things — weeks, days, race
 * day, peak week, longest run, target — and each is looked up from the volume curve `weeklyVolumePlan`
 * actually produced. A stat the engine cannot answer is OMITTED rather than filled with a plausible
 * number, which is why the grid is a list and not a fixed six.
 */
/**
 * The sessions in one week, as the drill-down lists them.
 *
 * ⚠ READ FROM THE STRUCTURE, PER WEEK, NEVER FROM WEEK ONE REPEATED. `plannedDays` is the same function
 * the progress bar and the scheduler read, and it is per-week for a reason: a real block runs six days
 * for two weeks and then five. Deriving the list once and reusing it would show the athlete a week that
 * is not in their program — the exact class of mistake that broke Continue Training at session 18.
 *
 * ⚠ AND THE FALLBACK IS EMPTY, NOT INVENTED. A caller that hands over a bare `{name, weeks, daysPerWeek}`
 * — several tests do — gets no days rather than `daysPerWeek` rows of "Session 1", which would be the
 * card describing a shape nobody built.
 *
 * ⚠ `main` IS THE WHOLE SESSION HERE, NOT A SLICE OF IT. `assemble.ts` writes `warmup: []` and
 * `cooldown: []` on every day it builds, so listing the main work omits nothing — this is the session
 * entire. If Holt ever authors a warm-up, this function is where the preview would start lying by
 * omission, and the test below pins that.
 */
function daysOfWeek(structure: Partial<ProgramStructure> & { daysPerWeek: number }, weekIndex: number) {
  if (!structure.days) return [];
  const days = trainingDays(plannedDays(structure as ProgramStructure, weekIndex));
  return days.map((d, i) => ({
    marker: d.letter?.trim() || String(i + 1),
    title: d.name,
    /* An item the author left blank gets an empty scheme rather than an invented "3 × 10" — `schemeText`
       refuses on purpose, and the row renders as a name with nothing after it. */
    items: d.main.map((ex) => ({ name: ex.name, scheme: schemeText(ex) })),
  }));
}

export function programCardFor(
  c: CoachConstraints,
  structure: Partial<ProgramStructure> & { name: string; weeks: number; daysPerWeek: number },
  volume: { mileage: number; longRunMi: number }[],
  rationale: string,
): ProgramCard {
  const endurance = isEnduranceGoal(c.goal);
  const spec = endurance ? RACE_SPEC[c.goal as keyof typeof RACE_SPEC] : null;

  const stats: { value: string; label: string }[] = [
    { value: String(structure.weeks), label: 'WEEKS' },
    { value: String(structure.daysPerWeek), label: endurance ? 'DAYS / WEEK' : 'DAYS / WEEK' },
  ];

  if (endurance && c.raceDate) stats.push({ value: shortDate(c.raceDate), label: 'RACE DAY' });
  if (volume.length) {
    stats.push({ value: `${Math.round(Math.max(...volume.map((v) => v.mileage)))} mi`, label: 'PEAK WEEK' });
    stats.push({ value: `${Math.max(...volume.map((v) => v.longRunMi))} mi`, label: 'LONGEST RUN' });
  }
  /* Non-race builds get their own six (§11.1.7): the things that actually shaped the block. A cell the
     engine cannot answer is DROPPED and the grid reflows — never rendered empty. */
  if (!endurance) {
    stats.push({ value: GOAL_LABEL[c.goal], label: 'GOAL' });
    stats.push({ value: ENVIRONMENT_LABEL[c.environment], label: 'EQUIPMENT' });
    stats.push({ value: c.sessionMinutes + ' min', label: 'SESSION' });
    stats.push({ value: LEVEL_LABEL[c.experience.lifting], label: 'LEVEL' });
  }

  const peakAt = volume.length ? volume.reduce((b, v, i) => (v.mileage > volume[b].mileage ? i : b), 0) : -1;

  const wk = `${structure.weeks} week${structure.weeks === 1 ? '' : 's'}`;

  return {
    kicker: endurance && spec ? `${spec.label.toUpperCase()} · RACE BUILD` : `${GOAL_LABEL[c.goal].toUpperCase()} · BLOCK`,
    title: structure.name,
    /* ⚠ READ, LIKE EVERY OTHER FIGURE ON THE CARD. `structure.weeks` rather than what the athlete asked
       for: the engine clamps and restructures, and a subtitle quoting the request would describe a block
       that was not built. */
    subtitle: `${structure.daysPerWeek} days · ${wk} · ${endurance && spec ? capitalise(spec.label) : GOAL_LABEL[c.goal]}`,
    stats,
    ribbon: volume.map((v) => v.mileage),
    weeks: volume.length
      ? volume.map((v, i) => ({
          label: 'Week ' + (i + 1),
          detail: Math.round(v.mileage) + ' mi · long run ' + v.longRunMi + ' mi',
          days: daysOfWeek(structure, i),
        }))
      : Array.from({ length: structure.weeks }, (_, i) => {
          const days = daysOfWeek(structure, i);
          return {
            label: 'Week ' + (i + 1),
            /* ⚠ THE REAL COUNT FOR THAT WEEK, not `daysPerWeek` restated. They differ in any block with
               a short week in it, and the row saying "5 sessions" over a list of four is the card
               disagreeing with itself in the space of one tap. */
            detail: `${days.length || structure.daysPerWeek} session${(days.length || structure.daysPerWeek) === 1 ? '' : 's'}`,
            days,
          };
        }),
    ribbonCaption: peakAt >= 0
      ? `Weekly volume · peak at week ${peakAt + 1}, then it comes down.`
      : '',
    reasoning: rationale,
    /* §7's closing row. A race has no session budget — a long run is as long as it is — so it states the
       shape of the week instead of a length nobody chose. */
    closing: endurance
      ? `${structure.daysPerWeek} runs a week`
      : `${c.sessionMinutes} min sessions`,
  };
}

/** A single session, as the design lists it: name on the left, prescription on the right. */
export function dayCardFor(
  c: Partial<CoachConstraints>,
  day: { name: string; main: { name: string; sets?: number; reps?: number | null; per?: string | null; targetSec?: number | null; targetMi?: number | null }[] },
): DayCard {
  const bits: string[] = ['SINGLE DAY'];
  if (c.sessionMinutes) bits.push(`${c.sessionMinutes} MIN`);
  if (c.ownedEquipment?.length) bits.push(c.ownedEquipment[0].toUpperCase());
  else if (c.environment === 'bodyweight') bits.push('BODYWEIGHT');

  return {
    kicker: bits.join(' · '),
    title: day.name,
    rows: day.main.map((e) => ({ name: e.name, prescription: prescriptionText(e) })),
  };
}

/** "4 × 8", "3 × 10 per side", "20 min", "6 mi" — whatever the row actually prescribes. */
function prescriptionText(e: { sets?: number; reps?: number | null; per?: string | null; targetSec?: number | null; targetMi?: number | null }): string {
  if (e.targetMi != null) return `${e.targetMi} mi`;
  if (e.targetSec != null) return `${Math.round(e.targetSec / 60)} min`;
  if (e.sets && e.reps) return `${e.sets} × ${e.reps}${e.per ? ` per ${e.per}` : ''}`;
  if (e.sets) return `${e.sets} sets`;
  return '';
}

/**
 * The counter-offer.
 *
 * The engine's refusal already carries the alternative in words — it is written that way on purpose —
 * and this lifts it onto a card so the alternative is a THING with a button rather than a sentence the
 * athlete has to act on themselves.
 */
export function refusalCardFor(goal: Goal, weeksAvailable: number, daysPerWeek: number, message: string): RefusalCard | null {
  if (!isEnduranceGoal(goal)) return null;
  const spec = RACE_SPEC[goal];
  if (!spec.fallback) return null;
  const alt = RACE_SPEC[spec.fallback];
  return {
    title: capitalise(alt.label),
    meta: `${weeksAvailable} weeks · ${daysPerWeek} days · race day intact`,
    body: message,
    primary: `Build the ${alt.label}`,
    secondary: 'Pick another race',
    altGoal: spec.fallback,
  };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE SHELF CARD
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A program Holt did not write, offered with his reasons and his reservations.
 *
 * ⚠ **`kicker` SAYS WHOSE WORK IT IS**, and that is not decoration. Every other card in this thread is
 * something Holt built out of the athlete's answers; this one is a named, authored, locked program that
 * existed before the conversation started. A card that looked identical to a `ProgramCard` would be him
 * quietly taking the credit — and, worse, would imply the block had been shaped around the answers when
 * it was only matched against them.
 *
 * ⚠ **AND THERE IS NO SCORE ON IT.** `Recommendation.score` orders the shelf and stops there. A
 * percentage would invite exactly the comparison this whole flow exists to spare somebody, and it would
 * claim a precision a hand-tuned table does not have.
 */
export interface PickCard {
  kicker: string;
  title: string;
  /** `6 weeks · 3 days a week · Strength` — the shape of the block in one line. */
  subtitle: string;
  /** Why this one. Only ever things that actually matched. */
  because: string[];
  /** Where it does not match what they said. ⚠ Rendered ALWAYS — see `recommend.ts`. */
  caveats: string[];
  /** The program's own authored aims, in its author's words. Two, at most — it is a card, not the page. */
  aims: string[];
  /** Where "See the program" goes. */
  programId: string;
  /** The one genuine alternative, when there is one. Absent is the common case and is not a failure. */
  runnerUpName: string | null;
  runnerUpId: string | null;
}

/**
 * Build the card from a recommendation.
 *
 * Pure and total: everything on it comes off the `ShelfProgram`, so the card can never name a week count
 * or a session frequency the catalogue does not actually carry.
 */
export function pickCardFor(rec: ShelfRecommendation, runnerUp: ShelfRecommendation | null): PickCard {
  const p = rec.program;
  return {
    kicker: 'FROM THE FORGE SHELF',
    title: p.name,
    subtitle: [`${p.durationWeeks} weeks`, `${p.frequencyPerWeek} days a week`, p.family].join(' · '),
    because: rec.because,
    caveats: rec.caveats,
    /* ⚠ THE PROGRAM'S OWN GOALS, VERBATIM AND UNTRIMMED — "Add weight to a tested bench press", not a
       summary of it. They are the best copy the catalogue owns and they were written by the person who
       wrote the training. Two, because a card with five bullets is a page. */
    aims: p.goals.slice(0, 2),
    programId: p.id,
    runnerUpName: runnerUp?.program.name ?? null,
    runnerUpId: runnerUp?.program.id ?? null,
  };
}

/**
 * ⚠ ANYTHING MEDICAL STOPS FLAT. No hedging, no caveat paragraph, no improvised advice.
 *
 * Deliberately broad and deliberately eager to trigger. A false positive costs one unnecessary "see
 * someone" and the athlete simply carries on; a false negative is a training app improvising about an
 * injury, which is the one failure here with a cost outside the app. When those are the two errors
 * available, you pick the cheap one every time.
 */
/** The words that stop him. Broad on purpose — see the note above. */
const MEDICAL =
  /\b(hurt\w*|pain\w*|ach(e|es|ing)|injur\w*|sore|swell\w*|swollen|sprain\w*|strain\w*|tear|tore|torn|tweak(ed)?|tendon\w*|physio\w*|doctor|surgery|fractur\w*|numb\w*|tingl\w*|pinched)\b/i;

export function isMedical(text: string): boolean {
  return MEDICAL.test(text);
}

/** ⚠ Anything medical stops flat. No hedging, no caveat paragraph, no improvised advice. */
export const STOP_KICKER = 'OUT OF MY LANE';
export const MEDICAL_STOP =
  "That's a physio's job, not mine. Get it looked at — I'll still be here after.";

/**
 * ⛔ THE CHAT IS UNLIMITED. PO decision, 2026-08-09.
 *
 * ══ THE REASONING, BECAUSE THE NUMBER WILL COME BACK LATER ══
 *
 * `PROMPT.md` §14 designs a wall at ten exchanges and §14.6 flags the count as an assumption to confirm
 * before shipping. The confirmation was **no wall**, and the argument is the one that actually decides
 * it: **v1 makes no model call, so a conversation costs nothing to serve.** There is no marginal cost to
 * recover and nothing to meter. Metering it would only be charging for a nicer way to answer the same
 * questions the free wizard asks two screens away — a toll booth on a free road.
 *
 * ⚠ THIS CHANGES THE DAY THE AI LAYER LANDS. Once `interpret()` calls a model, every exchange costs real
 * money, and the question stops being philosophical. When that happens the wall below is what gets turned
 * on — and §14.6's other suggestion is worth revisiting then: metering **programs built** rather than
 * messages sent may be the fairer unit, because it charges for the outcome rather than for thinking out
 * loud.
 *
 * `null` rather than a large number: an unlimited thing should say so, not pretend to a ceiling nobody
 * will reach.
 */
export const FREE_EXCHANGES: number | null = null;

/**
 * The wall's copy, kept and unused.
 *
 * Deliberately not deleted — it is a decided piece of writing that will be needed the moment the paid
 * tier is real, and rewriting it from memory later would lose the one line that matters: that the free
 * wizard is the same engine and the same programs, named as a real option rather than hidden.
 */
export const WALL = {
  title: "That's your ten for the month",
  body: 'The wizard is free and stays free — same engine, same programs, one question per card. What you pay for is not having to tap through it.',
  primary: 'Unlock Coach Holt',
  secondary: 'Use the wizard instead',
};

const ENVIRONMENT_LABEL: Record<string, string> = {
  full_gym: 'Full gym',
  home: 'Home gym',
  bodyweight: 'Bodyweight',
  outdoor: 'Outdoors',
};
const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const shortDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`;
};
const capitalise = (t: string) => t.replace(/^./, (ch) => ch.toUpperCase());

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE BUILD PATH
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/*
 * ⚠ **THESE THREE LIVED INSIDE `CoachChatSheet.tsx` AND SO WERE NEVER TESTED.**
 *
 * They are pure functions doing real work — filling constraint gaps, computing a volume curve, counting
 * weeks to a race — and every one of them sits on the path between "athlete taps a chip" and "a program
 * appears". Being defined in a component file meant no test could reach them, and a throw in any of them
 * froze the sheet outright rather than surfacing.
 *
 * A component may render the build path. It should not BE the build path.
 */

/** The weekly mileage curve behind an endurance card. Empty for everything else, which is not a failure. */
export function volumeFor(c: CoachConstraints, weeks: number): { mileage: number; longRunMi: number }[] {
  if (!isEnduranceGoal(c.goal)) return [];
  return weeklyVolumePlan({ goal: c.goal, weeks, startMi: c.currentWeeklyMi ?? 0 }).map((v) => ({
    mileage: v.mileage,
    longRunMi: v.longRunMi,
  }));
}

/**
 * Whole weeks between `now` and the race, for the counter-offer's meta line.
 *
 * `now` is injected rather than read, so a test can assert the arithmetic instead of asserting against
 * whatever today happens to be.
 */
export function weeksBetween(raceDate?: string | null, now: number = Date.now()): number {
  if (!raceDate) return 0;
  const ms = Date.parse(raceDate) - now;
  return Number.isNaN(ms) ? 0 : Math.max(0, Math.floor(ms / (7 * 24 * 3600 * 1000)));
}

/**
 * Fill the fields the chat never asks, so `assemble` gets the shape it expects.
 *
 * ══ ⚠ THIS IS A COPY, NOT A MERGE, AND THAT HAS BITTEN TWICE ══
 *
 * It rebuilds the constraint object field by field. Anything not named here is DROPPED — silently,
 * with no type error, because `CoachConstraints`'s optional fields are satisfied by omission.
 *
 * Two live consequences, both invisible until someone traced them:
 *
 *   · `splitStyle` — `CoachChatSheet` reads `c.splitStyle ?? null` after this runs and has therefore
 *     ALWAYS got `null`, whatever the athlete chose.
 *   · `weeks` — `assemble()` reads `c.weeks ?? defaultWeeksFor(c.goal)`. A one-week block would have
 *     set the state, shown "One week" back in the transcript, passed every test — and built eight.
 *
 * ⚠ SO: A NEW CONSTRAINT THE CHAT CAN SET MUST BE ADDED HERE TOO. The failure mode is not an error,
 * it is the engine quietly using its default while the conversation says otherwise. The spread below
 * (`...c`) now carries anything future work adds; the explicit fields after it are the DEFAULTS, and
 * they must stay explicit because `?? ` on an absent key is what supplies them.
 */
export function completeFor(c: Partial<CoachConstraints>, mode: 'program' | 'day'): CoachConstraints {
  return {
    // Everything the athlete actually answered, including fields this function does not know about.
    ...c,
    goal: c.goal ?? 'strength',
    experience: c.experience ?? { lifting: 'intermediate', running: 'intermediate' },
    daysPerWeek: c.daysPerWeek ?? 4,
    // A race never asks this — a long run is as long as it is. 60 keeps the validator honest.
    sessionMinutes: c.sessionMinutes ?? 60,
    environment: c.environment ?? (mode === 'program' && c.goal && isEnduranceGoal(c.goal) ? 'outdoor' : 'full_gym'),
    ownedEquipment: c.ownedEquipment ?? [],
    limitations: c.limitations ?? [],
    excludeExercises: c.excludeExercises ?? [],
    raceDate: c.raceDate ?? null,
    currentWeeklyMi: c.currentWeeklyMi ?? null,
    canRunContinuously: c.canRunContinuously ?? null,
    /* Explicit rather than left to the spread, so the two that were being dropped are visible here and
       a reader can see they are carried on purpose. `null` and `undefined` behave identically
       downstream (`c.weeks ?? defaultWeeksFor(...)`), so this changes nothing for a program that never
       sets them — which is what makes the fix safe to land on its own. */
    weeks: c.weeks ?? null,
    splitStyle: c.splitStyle ?? null,
  };
}
