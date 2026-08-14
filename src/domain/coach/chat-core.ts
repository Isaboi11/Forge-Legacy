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
import { RACE_SPEC, weeklyVolumePlan } from './rulebook/endurance.ts';
import { pick, pickNamed } from './rulebook/voice.ts';
import { BODY_PART_LABEL, SPLIT_LABEL, type DayFocus } from './day.ts';

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE THREAD
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Which of the three voices a line is in. Text is conversation; a card is an object. Never both. */
export type Turn =
  | { kind: 'me'; text: string }
  /** `live` types itself out, character by character. Exactly one turn at a time may be live. */
  | { kind: 'holt'; text: string; live?: boolean }
  /** `ctl` is how they are DRAWN (v2 layer 2). Absent → the 2-col chip grid, which is what every
   *  answer used to be. The openers and the help menu carry none, and correctly render as chips. */
  | { kind: 'chips'; chips: Chip[]; ctl?: QuestionControl }
  | { kind: 'program'; card: ProgramCard }
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
  stats: { value: string; label: string }[];
  /** Weekly volume, one entry per week. Empty for a block whose shape is not volume. */
  ribbon: number[];
  ribbonCaption: string;
  reasoning: string;
  /** §11.1.12 — what the card shows when its body is tapped: the block, week by week. */
  weeks: { label: string; detail: string }[];
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
export type QuestionControl = 'chips' | 'segmented' | 'cards' | 'grid' | 'imports';

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
  // Everything else — goal, day_focus, race_distance, limits — is a set of unlike things.
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
export function nextQuestion(c: ChatState, mode: 'program' | 'day' = 'program'): Question | null {
  return withControl(mode === 'day' ? nextDayQuestion(c) : askProgram(c));
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
        ...STRENGTH_GOALS.filter((g) => AUTHORED_GOALS.includes(g)).map((g) => chip(GOAL_LABEL[g], { goal: g })),
        { label: 'Run a race', patch: {}, picksRace: true },
      ],
    };
  }

  if (c.goal == null) {
    return {
      id: 'race_distance',
      ask: pick('ask_race_distance'),
      chips: ENDURANCE_GOALS.filter((g) => AUTHORED_GOALS.includes(g)).map((g) => chip(GOAL_LABEL[g], { goal: g })),
    };
  }

  const endurance = isEnduranceGoal(c.goal);

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
      // The PO's own words, kept verbatim — this line already ships in the wizard.
      ask: endurance ? pick('ask_days_run') : pick('ask_days'),
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
const FOCUS_CHIPS: [string, DayFocus][] = [
  [SPLIT_LABEL.full_body, { kind: 'split', split: 'full_body' }],
  [SPLIT_LABEL.push, { kind: 'split', split: 'push' }],
  [SPLIT_LABEL.pull, { kind: 'split', split: 'pull' }],
  [SPLIT_LABEL.legs, { kind: 'split', split: 'legs' }],
  [SPLIT_LABEL.upper, { kind: 'split', split: 'upper' }],
  [SPLIT_LABEL.lower, { kind: 'split', split: 'lower' }],
  [`${BODY_PART_LABEL.chest} & ${BODY_PART_LABEL.triceps}`, { kind: 'body_parts', parts: ['chest', 'triceps'] }],
  [`${BODY_PART_LABEL.back} & ${BODY_PART_LABEL.biceps}`, { kind: 'body_parts', parts: ['back', 'biceps'] }],
  /*
   * ⚠ SHOULDERS STANDS ALONE AS WELL AS PAIRED, AND IT DID NOT.
   *
   * PO: *"shoulders need to be its own muscle for Holt to do a just shoulder day."* The engine had this
   * the whole time — `day.ts` carries `shoulders` as a standalone `BodyPart` over four deltoid/cuff
   * muscles, the catalogue has 63 exercises with one of them as a PRIMARY mover, and the `/coach` wizard
   * offers all eight parts individually. The only thing missing was a chip here, so an athlete talking to
   * Holt could ask for "shoulders and arms" but never for shoulders.
   *
   * Both stay. They are different days, not two names for one: a delt-only session and a delts-plus-arms
   * session divide a fixed exercise budget very differently.
   */
  [BODY_PART_LABEL.shoulders, { kind: 'body_parts', parts: ['shoulders'] }],
  [`${BODY_PART_LABEL.shoulders} & arms`, { kind: 'body_parts', parts: ['shoulders', 'biceps', 'triceps'] }],
  [BODY_PART_LABEL.core, { kind: 'body_parts', parts: ['core'] }],
];

function nextDayQuestion(c: ChatState): Question | null {
  if (c.dayFocus == null) {
    return {
      id: 'day_focus',
      ask: pick('ask_day_focus'),
      chips: FOCUS_CHIPS.map(([label, dayFocus]) => ({ label, patch: { dayFocus } })),
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
      chips: STRENGTH_GOALS.filter((g) => AUTHORED_GOALS.includes(g)).map((g) => chip(GOAL_LABEL[g], { goal: g })),
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
  'Build me a program',
  'What should I train today?',
  'Change my program',
  "I've got a program already",
  'How do I…?',
];

/** An opener either starts the questionnaire or leaves the conversation entirely. */
export type OpenerAction =
  | { kind: 'build'; mode: 'program' | 'day'; patch: Partial<CoachConstraints> }
  | { kind: 'import' }
  | { kind: 'edit' }
  | { kind: 'help' };

export function fromOpener(label: string): OpenerAction | null {
  switch (label) {
    case 'Build me a program':
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
    case 'How do I…?':
      return { kind: 'help' };
    default:
      return null;
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
    title: 'Build a program',
    sub: 'Training built around your goals and schedule.',
    opener: 'Build me a program',
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
  /** Which glyph the 26×26 outlined container holds — a rounded square, or a circle. */
  icon: 'document' | 'question';
  label: string;
  opener: string;
}

export const HOME_ROWS: readonly HomeRow[] = [
  { icon: 'document', label: 'I already have a program', opener: "I've got a program already" },
  { icon: 'question', label: 'Ask Holt something', opener: 'How do I…?' },
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
export const readyToBuild = (c: ChatState, mode: 'program' | 'day' = 'program'): boolean => nextQuestion(c, mode) == null;

/** The goal keys the chat can actually offer, so a chip can never name a dead end. */
export const OFFERABLE_GOALS: readonly Goal[] = AUTHORED_GOALS;

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
export function programCardFor(
  c: CoachConstraints,
  structure: { name: string; weeks: number; daysPerWeek: number },
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

  return {
    kicker: endurance && spec ? `${spec.label.toUpperCase()} · RACE BUILD` : `${GOAL_LABEL[c.goal].toUpperCase()} · BLOCK`,
    title: structure.name,
    stats,
    ribbon: volume.map((v) => v.mileage),
    weeks: volume.length
      ? volume.map((v, i) => ({
          label: 'Week ' + (i + 1),
          detail: Math.round(v.mileage) + ' mi · long run ' + v.longRunMi + ' mi',
        }))
      : Array.from({ length: structure.weeks }, (_, i) => ({
          label: 'Week ' + (i + 1),
          detail: structure.daysPerWeek + ' sessions',
        })),
    ribbonCaption: peakAt >= 0
      ? `Weekly volume · peak at week ${peakAt + 1}, then it comes down. Tap to walk the weeks.`
      : '',
    reasoning: rationale,
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
