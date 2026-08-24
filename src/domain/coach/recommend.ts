/**
 * Holt reading the shelf.
 *
 * ══ WHY THIS EXISTS AT ALL, GIVEN `assemble()` ══
 *
 * Holt writes programs. That is the product, and the Master Status says so in as many words — *"Coach
 * Holt is the product; the catalogue is a shelf."* So a second module that PICKS one off the shelf needs
 * to justify itself, and the justification is a question the app could not answer:
 *
 *   > I am stood in front of fourteen named programs and I do not know which one to take.
 *
 * Before this, the only help on that screen was a door out of it — *let me write you a different one*.
 * That is a fine answer to "what should I train" and a poor answer to "which of THESE". It replaces the
 * athlete's question rather than answering it, and the shelf is real, authored, locked work; a coach who
 * cannot say a word about it is not much of a guide to it.
 *
 * ══ WHAT IT IS NOT ══
 *
 * ⚠ **IT IS NOT A SECOND ENGINE.** Nothing here builds, prescribes, loads or orders a single set. It
 * ranks programs that already exist against answers the athlete already gives the questionnaire, and
 * hands back an id. Every program it can name was authored, reviewed and shipped by somebody else.
 *
 * ⚠ **AND IT IS NOT A SEARCH.** It returns ONE recommendation and one runner-up, because the athlete's
 * problem was too many options and a ranked list of fourteen is the same problem in a new order.
 *
 * ══ THE PART THAT MATTERS MOST: IT REFUSES ══
 *
 * The shelf has **no Running programs at all** — `ProgramFamily` has the value, nothing populates it —
 * so every endurance goal must come back empty, and a scorer with no floor would cheerfully answer "Run
 * a 5K" with a six-day barbell block because it was the least-bad row in the table. That is the exact
 * failure `rulebook/endurance.ts` already refuses to commit, in its own words: **refuse rather than
 * guess**. Same rule here, same reason.
 *
 * A refusal is not a dead end. It is the honest half of the answer, and the caller pairs it with the door
 * that CAN help — Holt writing one.
 *
 * ══ AND IT NAMES WHAT IT GOT WRONG ══
 *
 * `caveats` is not a hedge, it is the point. A shelf program is FIXED: it cannot drop a movement for a
 * bad shoulder, cannot become four days because that is what the athlete has, cannot move down a rung.
 * Every one of those is a real mismatch between what they said and what they are being handed, and a
 * recommendation that quietly swallows them is the app claiming a fit it did not achieve. `Forge Legacy`
 * has a standing lesson about exactly this shape of thing — *"a stale default renders a confident,
 * specific, false claim about the athlete"*. So the card says the misses out loud.
 *
 * No app imports and no I/O: the caller passes the shelf in, the whole matrix runs under `node --test`.
 */

import {
  isEnduranceGoal,
  GOAL_LABEL,
  type Environment,
  type Experience,
  type Goal,
} from './constraints.ts';

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE SHELF, AS THIS MODULE NEEDS IT
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * One catalogue program, reduced to the fields a recommendation can honestly reason about.
 *
 * ⚠ **DELIBERATELY NOT `ProgramDefinition`.** That type carries `blocks` — every week, every session,
 * every prescription — and importing it would drag the whole training schema into a module that ranks
 * metadata. The caller projects; this stays a pure function of small values.
 *
 * ⚠ **AND `goals` IS FOR READING, NEVER FOR MATCHING.** It is authored prose — *"Add weight to a tested
 * bench press"*, *"Build a mobility practice you actually keep"* — one sentence per aim, written for a
 * human. It makes the best copy on the card and the worst possible match key, and keyword-matching a
 * goal enum against English is how a recommendation starts being confidently wrong.
 */
export interface ShelfProgram {
  id: string;
  name: string;
  /** `ProgramFamily` as authored: Strength · Muscle Building · Running · Conditioning · Full Body & Home · Mobility. */
  family: string;
  /** `ProgramDifficulty` as authored, or null when the definition omitted it. */
  difficulty: string | null;
  durationWeeks: number;
  frequencyPerWeek: number;
  /** Authored free text — `'Commercial Gym'`, `'Home — dumbbells and an adjustable bench'`. Read via `roomOf`. */
  environment: string | null;
  description: string | null;
  /** `ProgramTheme` as authored. */
  theme: string | null;
  /** The program's own authored aims, in its author's words. Card copy — see the warning above. */
  goals: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// WHICH ROOM A PROGRAM WANTS
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The authored `environment` string, resolved to the same vocabulary the athlete answers in.
 *
 * ⚠ **MATCHED ON THE PREFIX, NEVER ON THE WHOLE STRING, AND NEVER ON THE DASH.** The values carry an
 * EM-dash and a description of the kit — `'Home — dumbbells and an adjustable bench'`, `'Anywhere — no
 * equipment required'` — so an equality test would miss every one of them, and a test that matched the
 * separator would be one authoring pass away from breaking. The first word is the part that is a fact
 * about the room; everything after the dash is a fact about the equipment, and equipment is the Home Gym
 * profile's job, not this function's.
 *
 * `null` for anything unrecognised, which `fits` then treats as "cannot promise" rather than "anywhere".
 */
export function roomOf(environment: string | null | undefined): Environment | null {
  if (!environment) return null;
  const first = environment.trim().toLowerCase();
  if (first.startsWith('commercial gym') || first.startsWith('full gym') || first.startsWith('gym')) return 'full_gym';
  if (first.startsWith('home')) return 'home';
  if (first.startsWith('anywhere') || first.startsWith('bodyweight')) return 'bodyweight';
  if (first.startsWith('outdoor')) return 'outdoor';
  return null;
}

/**
 * Can this athlete actually TRAIN this program, at all?
 *
 * A hard gate rather than a score, because the failure is not "a worse fit" — it is an athlete adopting
 * a twelve-week block on Monday and discovering on Tuesday that every session opens on a barbell they do
 * not have. There is no amount of goal alignment that survives that.
 *
 * The rule is containment, in one direction only:
 *   · a full gym has dumbbells and a floor, so it can run anything;
 *   · a home gym can run home and bodyweight work, never a commercial-gym block;
 *   · bodyweight-only and outdoors can run bodyweight work and nothing else.
 *
 * ⚠ **`home` DOES NOT SATISFY `home` FOR FREE, AND THE CAVEAT SAYS SO.** *"Home — two adjustable
 * dumbbells and a bench"* is a claim about kit this module cannot check; only the Home Gym profile knows.
 * It is allowed through and then named on the card, because refusing every home program to every home
 * athlete would empty the shelf for the people it was written for.
 */
function fits(athlete: Environment, program: Environment | null): boolean {
  if (program == null) return false;
  switch (athlete) {
    case 'full_gym':
      return true;
    case 'home':
      return program === 'home' || program === 'bodyweight';
    case 'bodyweight':
    case 'outdoor':
    default:
      return program === 'bodyweight';
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// WHICH FAMILY SERVES WHICH GOAL
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The goal → family table. **PRIMARY is what the goal is actually asking for; SECONDARY is a real answer
 * that is not the obvious one.**
 *
 * ⚠ **SECONDARY IS NOT A CONSOLATION PRIZE**, and the beginner case is why it earns its keep. Every
 * Muscle Building program on the shelf is INTERMEDIATE. Without a secondary family, a beginner who wants
 * to build muscle gets handed a block whose own authored goal reads *"Arrive ready for the block
 * periodization of Muscle Building Advanced"* — because it was the only row in its family. With one,
 * Strength Foundation I is in the running, and the rung penalty below is what lets it win.
 *
 * ⚠ **`Running` APPEARS NOWHERE, AND THAT IS NOT AN OVERSIGHT.** The endurance goals refuse outright
 * (see `recommendFromShelf`), because the family is empty. Listing it would make the refusal look like a
 * scoring accident rather than the deliberate thing it is.
 */
const FAMILIES_FOR: Record<string, { primary: readonly string[]; secondary: readonly string[] }> = {
  strength: { primary: ['Strength'], secondary: ['Full Body & Home', 'Muscle Building'] },
  muscle: { primary: ['Muscle Building'], secondary: ['Strength', 'Full Body & Home'] },
  weight_loss: { primary: ['Conditioning'], secondary: ['Full Body & Home', 'Muscle Building'] },
  conditioning: { primary: ['Conditioning'], secondary: ['Full Body & Home'] },
  mobility: { primary: ['Mobility'], secondary: ['Full Body & Home'] },
  health: { primary: ['Full Body & Home'], secondary: ['Conditioning', 'Strength'] },
};

/**
 * A theme that says the program was written for this exact goal.
 *
 * The strongest single signal the catalogue carries, and the reason it is worth a bonus of its own:
 * `cutting` on Body Recomposition Foundation is an EDITORIAL declaration that the block is for losing
 * fat, which no amount of family matching reproduces — its family is Conditioning, same as a program
 * about work capacity.
 *
 * ⚠ `beginner` IS ABSENT FROM EVERY LIST, deliberately. It is a difficulty signal wearing a theme's
 * clothes; scoring it here would pay a program twice for the same fact, once through the rung match and
 * once through the goal.
 */
const THEMES_FOR: Record<string, readonly string[]> = {
  strength: ['strength', 'powerbuilding'],
  muscle: ['hypertrophy', 'bodybuilding', 'offseason'],
  weight_loss: ['cutting'],
  conditioning: ['athletic_performance'],
  mobility: [],
  health: ['athletic_performance'],
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// SCORING
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

const RANK: Record<Experience, number> = { beginner: 0, intermediate: 1, advanced: 2 };

/** The authored `ProgramDifficulty`, in the athlete's own vocabulary. `null` when the definition omits it. */
function rungOf(difficulty: string | null): Experience | null {
  switch ((difficulty ?? '').trim().toLowerCase()) {
    case 'beginner':
      return 'beginner';
    case 'intermediate':
      return 'intermediate';
    case 'advanced':
      return 'advanced';
    default:
      return null;
  }
}

/**
 * ⚠ **THE RUNG PENALTY IS ASYMMETRIC, AND THAT ASYMMETRY IS THE WHOLE POINT.**
 *
 * `chat-core`'s `runningExperienceFor` already argues this for mileage and the argument is the same here:
 * *"the downside of the two mistakes is not symmetric"*. A program pitched BELOW the athlete is
 * unexciting — they will find it easy and finish it. A program pitched ABOVE them is a block they cannot
 * complete, and for a beginner it is a block they can get hurt in.
 *
 * So: an exact rung is worth most, a rung DOWN costs a little, and a rung UP costs a lot — with an extra
 * penalty when the athlete is a beginner, because a beginner has no basis for judging whether the step
 * is one they can take. Beginner → Advanced is not scored at all; it is vetoed in `recommendFromShelf`.
 *
 * ⚠ **AND `difficulty` IS TECHNIQUE DEMAND, NOT READINESS** — the catalogue's own recorded lesson, from
 * the pass where a hard ceiling cut a beginner's home gym from 214 movements to 19. It is scored, never
 * used to exclude, with the single beginner→advanced exception above.
 */
function rungScore(athlete: Experience, program: Experience | null): number {
  if (program == null) return 6; // unstated: neither rewarded nor punished
  const gap = RANK[program] - RANK[athlete];
  if (gap === 0) return 25;
  if (gap === -1) return 14; // one rung easy
  if (gap <= -2) return 4; // an advanced athlete on a beginner block
  // Above the athlete.
  return athlete === 'beginner' ? -6 : 4;
}

/** Sessions a week. Exact is worth a lot: it is the one answer the athlete gave about their actual diary. */
function frequencyScore(want: number, program: number): number {
  const gap = Math.abs(program - want);
  if (gap === 0) return 15;
  if (gap === 1) return 8;
  if (gap === 2) return 2;
  return 0;
}

/**
 * ⚠ **`fits` IS NOT ENOUGH ON ITS OWN, AND A TIE IS WHERE THAT SHOWED.**
 *
 * A full gym can run a bodyweight program, so the hard gate lets it through — and on a straight tie it
 * won: a beginner who had just said *full gym* was recommended Bodyweight Foundation over Strength
 * Foundation I, because the two scored identically and the id sorted first. Trainable, and still the
 * wrong answer. They told us which room they are stood in; a program written for that room uses what is
 * in it.
 *
 * Small on purpose. It breaks ties and nudges; it never outweighs the goal or the rung. And a bodyweight
 * program keeps a partial credit for a home athlete, because "works anywhere" is a genuine virtue there
 * rather than a wasted gym membership.
 */
function roomScore(athlete: Environment, program: Environment | null): number {
  if (program === athlete) return 6;
  if (athlete === 'home' && program === 'bodyweight') return 3;
  return 0;
}

/**
 * Below this, Holt says he has nothing rather than naming his least-bad row.
 *
 * ⚠ **THE FLOOR IS THE FEATURE.** A pure ranker always has a winner — the question "which of these
 * fourteen" has an answer even when the honest answer is "none of them". 45 is roughly a secondary-family
 * program at the right rung with the wrong week: a real, defensible stretch. Anything under it is the
 * app filling silence.
 */
export const MATCH_FLOOR = 45;

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE ANSWER
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** What the athlete told the questionnaire, reduced to what a shelf lookup can use. */
export interface ShelfRequest {
  goal: Goal;
  experience: Experience;
  daysPerWeek: number;
  environment: Environment;
}

export interface Recommendation {
  program: ShelfProgram;
  /** Internal ordering only. **Never shown** — a fit is an argument, not a percentage. */
  score: number;
  /** Why this one, in Holt's voice. Only ever things that actually matched. */
  because: string[];
  /** Where it does NOT match what they said. Shown, always — see the module header. */
  caveats: string[];
}

export type ShelfAnswer =
  | { ok: true; best: Recommendation; runnerUp: Recommendation | null }
  /** `reason` is Holt's line, spoken. The caller pairs it with the door that can help. */
  | { ok: false; reason: string };

/** Sentence-cased family, for a line like "It's the strength shelf's beginner rung". */
const familyPhrase = (family: string): string => family.toLowerCase();

function reasonsFor(req: ShelfRequest, p: ShelfProgram): { because: string[]; caveats: string[] } {
  const because: string[] = [];
  const caveats: string[] = [];
  const table = FAMILIES_FOR[req.goal];
  const rung = rungOf(p.difficulty);
  const room = roomOf(p.environment);

  if (table?.primary.includes(p.family)) {
    because.push(`It's written for exactly what you're after — ${GOAL_LABEL[req.goal].toLowerCase()}.`);
  } else {
    caveats.push(
      `It's a ${familyPhrase(p.family)} block rather than a dedicated one for ${GOAL_LABEL[req.goal].toLowerCase()} — the shelf hasn't got one that fits you better.`,
    );
  }

  if (p.frequencyPerWeek === req.daysPerWeek) {
    because.push(`${p.frequencyPerWeek} days a week, which is what you've got.`);
  } else {
    caveats.push(
      `It runs ${p.frequencyPerWeek} days a week and you said ${req.daysPerWeek}. That's the one thing you can't trim out of it.`,
    );
  }

  if (rung === req.experience) {
    because.push(`It's pitched at ${req.experience}, same as you.`);
  } else if (rung != null && RANK[rung] > RANK[req.experience]) {
    caveats.push(`It's pitched at ${rung} — you'd be stepping up into it.`);
  } else if (rung != null) {
    caveats.push(`It's pitched at ${rung}, so it'll be inside what you can already do.`);
  }

  /* ⚠ ONLY SOLD TO SOMEBODY IT ACTUALLY HELPS. "No equipment at all" is a real virtue to an athlete with
     none and an irrelevance to one stood in a commercial gym — pitching it there would be Holt praising
     a program for not using the room they had just told him about. */
  if (room === 'bodyweight' && req.environment !== 'full_gym') {
    because.push('No equipment at all, so nothing can stop you starting it.');
  } else if (room === 'home' && req.environment === 'home') {
    /* ⚠ THE ONE THING THIS MODULE CANNOT CHECK. See `fits`. */
    caveats.push(`It assumes ${p.environment?.replace(/^[^—-]*[—-]\s*/, '') ?? 'a home setup'} — check that's what you've got.`);
  }

  because.push(`${p.durationWeeks} weeks, start to finish.`);
  return { because, caveats };
}

/**
 * The one recommendation, or an honest no.
 *
 * ⚠ **THE ENDURANCE REFUSAL COMES FIRST, BEFORE A SINGLE PROGRAM IS SCORED.** Not as an optimisation —
 * as a statement about what this function is allowed to do. `ProgramFamily` carries `'Running'` and
 * nothing populates it, so the five race goals have an empty shelf, and the only scores available are
 * from families that answer a different question. Reaching the scorer at all would mean a marathon
 * question could be answered by a barbell block if the numbers happened to line up.
 */
export function recommendFromShelf(req: ShelfRequest, shelf: readonly ShelfProgram[]): ShelfAnswer {
  if (isEnduranceGoal(req.goal)) {
    return {
      ok: false,
      reason:
        "I'll be straight with you — there isn't a running program on that shelf. Every one of them is a lifting or conditioning block, and handing you one because it was the closest thing on the page would be me guessing. A race is built backwards from the date, so let me write you one properly.",
    };
  }

  const table = FAMILIES_FOR[req.goal];
  if (!table) {
    return {
      ok: false,
      reason: "I haven't got anything on the shelf for that one. Let me write you something instead.",
    };
  }

  const ranked: Recommendation[] = [];
  for (const p of shelf) {
    const room = roomOf(p.environment);
    // Cannot be trained in the room they said they're in — not a worse fit, an impossible one.
    if (!fits(req.environment, room)) continue;
    const rung = rungOf(p.difficulty);
    // The one hard rung veto. Two steps up is not a stretch, it is a different sport.
    if (req.experience === 'beginner' && rung === 'advanced') continue;

    const primary = table.primary.includes(p.family);
    const secondary = table.secondary.includes(p.family);
    if (!primary && !secondary) continue;

    let score = primary ? 50 : 30;
    if ((THEMES_FOR[req.goal] ?? []).includes(p.theme ?? '')) score += 12;
    score += rungScore(req.experience, rung);
    score += frequencyScore(req.daysPerWeek, p.frequencyPerWeek);
    score += roomScore(req.environment, room);

    const { because, caveats } = reasonsFor(req, p);
    ranked.push({ program: p, score, because, caveats });
  }

  /* ⚠ TIE-BROKEN BY ID, NOT LEFT TO THE INPUT ORDER. Two programs on the same score would otherwise be
     ranked by whichever the caller happened to project first, so the same athlete could get a different
     answer from the same shelf. Deterministic beats arbitrary, and it makes the tests mean something. */
  ranked.sort((a, b) => b.score - a.score || a.program.id.localeCompare(b.program.id));

  const best = ranked[0];
  if (!best || best.score < MATCH_FLOOR) {
    return {
      ok: false,
      reason:
        "I've looked, and there's nothing on that shelf I'd put you on with a straight face — not for what you've told me about your goal, your week and the room you train in. Rather than talk you into the closest one, let me write you something that actually fits.",
    };
  }

  /* The runner-up exists to make the recommendation a CHOICE rather than an instruction — but only when
     it is genuinely in contention. A second program 20 points back is not an alternative, it is filler. */
  const second = ranked[1];
  const runnerUp = second && second.score >= MATCH_FLOOR && best.score - second.score <= 20 ? second : null;
  return { ok: true, best, runnerUp };
}

/**
 * The sentence that has to be said whatever the answer is: **a shelf program cannot be adapted.**
 *
 * ⚠ **THE LIMITATIONS QUESTION IS NEVER ASKED IN THIS FLOW, AND THIS IS WHY.** `rulebook/limitations.ts`
 * calls itself the closest thing in the app to health guidance; `assemble()` unions the excluded patterns
 * and writes around them. A catalogue program is a fixed set of authored sessions and can do none of
 * that. Asking someone about their shoulder and then handing them an unmodified block would be the
 * `wrists` failure this codebase already refused to ship — *"a checkbox that changes nothing is worse
 * than an absent one: the athlete ticks it, believes they have been heard, and gets the same program."*
 *
 * So the question is not asked, and the limit is stated instead.
 */
export const SHELF_CANNOT_ADAPT =
  "One thing before you take it: I didn't write these, so I can't bend one around you. If something needs working around — a shoulder, a knee, kit you haven't got — say the word and I'll write you a block that does.";
