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
  isEnduranceGoal,
  GOAL_LABEL,
  type CoachConstraints,
  type Experience,
  type Goal,
  type Limitation,
} from './constraints.ts';
import { AUTHORED_GOALS } from './rulebook/skeletons.ts';
import { RACE_SPEC, weeklyVolumePlan } from './rulebook/endurance.ts';

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE THREAD
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Which of the three voices a line is in. Text is conversation; a card is an object. Never both. */
export type Turn =
  | { kind: 'me'; text: string }
  /** `live` types itself out, character by character. Exactly one turn at a time may be live. */
  | { kind: 'holt'; text: string; live?: boolean }
  | { kind: 'chips'; chips: Chip[] }
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

export interface Chip {
  label: string;
  /** What tapping it fills in. The typed path resolves to the same thing — see `interpret`. */
  patch: Partial<CoachConstraints>;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE QUESTIONS
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

export type QuestionId =
  | 'goal'
  | 'race_when'
  | 'race_base'
  | 'days'
  | 'where'
  | 'time'
  | 'experience'
  | 'limits';

export interface Question {
  id: QuestionId;
  /** Holt's line. Spoken, not labelled — the wizard's heading rewritten as something a person says. */
  ask: string;
  chips: Chip[];
  /** A question the athlete may pass on. `limits` is the only one, because "none" is a real answer. */
  skippable?: boolean;
}

const chip = (label: string, patch: Partial<CoachConstraints>): Chip => ({ label, patch });

/**
 * The next thing worth asking, or `null` when there is enough to build.
 *
 * ⚠ ORDER IS NOT COSMETIC. Goal comes first because it decides which questions even exist — a race asks
 * for a date and a starting mileage, a strength block asks for a split and a room, and asking a marathon
 * runner what equipment they own would be the coach not listening.
 */
export function nextQuestion(c: Partial<CoachConstraints>): Question | null {
  if (c.goal == null) {
    return {
      id: 'goal',
      ask: "Good. What are you training for?",
      chips: AUTHORED_GOALS.map((g) => chip(GOAL_LABEL[g], { goal: g })),
    };
  }

  const endurance = isEnduranceGoal(c.goal);

  if (endurance && c.raceDate == null) {
    return {
      id: 'race_when',
      ask: "When's the race? Roughly is fine — I build the block backwards from it.",
      chips: [6, 8, 12, 16, 20, 26].map((w) => chip(w === 26 ? 'Six months or more' : `About ${w} weeks`, { raceDate: isoInWeeks(w) })),
    };
  }

  if (endurance && c.currentWeeklyMi == null) {
    return {
      id: 'race_base',
      ask: "What are you running in a normal week right now? Be honest — I'd rather start you lower and get you there.",
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
      ask: endurance
        ? "How many days a week can you run? Be honest — I'd rather build three you'll hit than five you won't."
        : "How many days a week can you train? Be honest — I'd rather build three you'll hit than five you won't.",
      chips: [2, 3, 4, 5, 6].map((n) => chip(`${n} days`, { daysPerWeek: n })),
    };
  }

  // A race is run wherever they run. Asking about equipment would be answering a question nobody asked.
  if (!endurance && c.environment == null) {
    return {
      id: 'where',
      ask: 'Where are you training?',
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
      ask: 'How long have you got in there?',
      chips: ([30, 45, 60, 75] as const).map((m) => chip(m === 75 ? '75+ minutes' : `${m} minutes`, { sessionMinutes: m })),
    };
  }

  if (c.experience == null) {
    return {
      id: 'experience',
      ask: 'How experienced are you?',
      chips: (['beginner', 'intermediate', 'advanced'] as Experience[]).map((e) =>
        chip(EXPERIENCE_LABEL[e], { experience: { lifting: e, running: e } }),
      ),
    };
  }

  if (c.limitations == null) {
    return {
      id: 'limits',
      ask: "Anything I should work around?",
      skippable: true,
      chips: [
        chip('Nothing — build it', { limitations: [] }),
        ...LIMIT_CHIPS.map(([label, l]) => chip(label, { limitations: [l] })),
      ],
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

export const OPENERS: string[] = ['Build me a program', 'What should I train today?', '45 minutes and dumbbells'];

/**
 * What an opener means. The three the design ships are the three real entry points, so each maps to a
 * starting constraint set rather than being parsed.
 */
export function fromOpener(label: string): { mode: 'program' | 'day'; patch: Partial<CoachConstraints> } | null {
  switch (label) {
    case 'Build me a program':
      return { mode: 'program', patch: {} };
    case 'What should I train today?':
      return { mode: 'day', patch: {} };
    case '45 minutes and dumbbells':
      return { mode: 'day', patch: { sessionMinutes: 45, environment: 'home', ownedEquipment: ['dumbbells'] } };
    default:
      return null;
  }
}

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
  if (isEnduranceGoal(c.goal)) {
    const spec = RACE_SPEC[c.goal];
    const base = c.currentWeeklyMi ?? 0;
    return base > 0
      ? `Here's the block. ${weeks} weeks, ${c.daysPerWeek} days, and it's built around the ${base} miles you already run.`
      : `Here's the block. ${weeks} weeks to the ${spec.label}, starting from where you actually are rather than where you'd like to be.`;
  }
  return `Here's the block. ${weeks} weeks, ${c.daysPerWeek} days a week, built for what you've got.`;
}

/** The line above a single day. */
export const DAY_PREAMBLE = 'Here it is. Everything in it is something you can do with what you told me.';

/**
 * Whether the constraints are complete enough to build.
 *
 * Not `isComplete` from `constraints.ts`: that one requires `sessionMinutes`, which a race plan never
 * asks for — a long run is as long as it is, so a stated session budget would be a question whose answer
 * changes nothing.
 */
export const readyToBuild = (c: Partial<CoachConstraints>): boolean => nextQuestion(c) == null;

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

/** Fill the fields the chat never asks, so `assemble` gets the shape it expects. */
export function completeFor(c: Partial<CoachConstraints>, mode: 'program' | 'day'): CoachConstraints {
  return {
    goal: c.goal ?? 'strength',
    experience: c.experience ?? { lifting: 'intermediate', running: 'intermediate' },
    daysPerWeek: c.daysPerWeek ?? 4,
    // A race never asks this — a long run is as long as it is. 60 keeps the validator honest.
    sessionMinutes: c.sessionMinutes ?? 60,
    environment: c.environment ?? (mode === 'program' && c.goal && isEnduranceGoal(c.goal) ? 'outdoor' : 'full_gym'),
    ownedEquipment: c.ownedEquipment ?? [],
    limitations: c.limitations ?? [],
    excludeExercises: [],
    raceDate: c.raceDate ?? null,
    currentWeeklyMi: c.currentWeeklyMi ?? null,
    canRunContinuously: c.canRunContinuously ?? null,
  };
}
