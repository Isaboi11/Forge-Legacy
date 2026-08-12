/**
 * HOW HOLT SAYS IT IN THE GYM — the same answer, at three volumes.
 *
 * ══ WHY THIS IS A SEPARATE FILE FROM `voice.ts` ══
 *
 * `voice.ts` is the CONVERSATION: greetings, questions, refusals, things said in a sheet with two hands
 * free. These are said between sets, read in about a second, and are the only lines the athlete did not
 * ask for. Different surface, different constraints, so a different table — and keeping them out of
 * `VOICE` also keeps `voice.test.mjs` from walking them under rules written for a chat.
 *
 * It borrows the one thing that must not be duplicated: `pickFrom`'s no-repeat memory. A second
 * `lastSaid` map would let Holt say the same sentence twice running across the file boundary.
 *
 * ══ ⚠ REGISTER IS A THIRD DIMENSION, NOT MORE VARIANTS ══
 *
 * `voice.ts`'s rule: *"if a variant ever reads as a different ANSWER rather than a different WORDING of
 * the same answer, it is a bug."* If `quiet` and `direct` were variants inside one key, nothing would
 * stop a future edit making the loud one say something the quiet one does not. Keyed separately, the
 * three registers are three wordings of a fixed answer by construction — the answer is decided before
 * this file is reached, by `progressionFor` and `intraSuggestion`.
 *
 * ══ ⚠ THE COPY RULE THAT KEEPS AN UNPROMPTED LINE LEGAL ══
 *
 * `Active-Workout-Flow-Spec-W9-W16` §"must never become": *"no timers that shame, no 'you're behind your
 * goal' messaging… Not motivated. Not competitive. Focused."* §6.2 bans mid-workout scoring outright,
 * and W9-Amendment-005 D-3 lifted that for COACHING only — *"a scoreboard tells you how you did, and a
 * coach tells you what to do next."*
 *
 * So, for every line below:
 *
 *   **It names the next action and never characterises the set just logged. Any assessment is handed to
 *   the athlete as a conditional, never asserted by Holt.**
 *
 *   ✅ "If that moved well, take it to 195."   ✅ "Next set, 195."
 *   ❌ "That looked easy — go up."  (a grade)  ❌ "You're behind last week."  (§6.2)
 *
 * Pure and node-testable: no React, no RN, no storage, no runtime `@` imports.
 */

import { pickFrom, type Chooser } from './voice.ts';
import type { IntensityProfile } from './intensity.ts';

export type Register = IntensityProfile['register'];

/** The things Holt says during a session. Each is one ANSWER; the register only changes the wording. */
export type InWorkoutKey =
  | 'set_advance'
  | 'set_hold_confirm'
  | 'set_hold_short'
  | 'set_back_off'
  | 'set_first_time'
  | 'intra_up'
  | 'cue_reminder';

type RegisterTable = Record<Register, readonly string[]>;

/**
 * ⚠ `{lift}`, `{weight}`, `{reps}` and `{cue}` are filled by `say()`. A token with no value removes the
 * line rather than printing a brace at somebody mid-set.
 */
const LINES: Record<InWorkoutKey, RegisterTable> = {
  // Topped the range on every working set: the weight goes up.
  set_advance: {
    quiet: ['{lift} is ready for {weight}.', 'You can take {lift} to {weight}.', '{weight} on {lift} when you are.'],
    plain: ['Take {lift} to {weight} and start back at {reps}.', '{weight} on {lift}, back to {reps} reps.', 'Go to {weight} on {lift} — reset to {reps}.'],
    direct: ['{weight} on {lift}. Back to {reps}.', 'Load {weight} on {lift} and start again at {reps}.', 'Up to {weight}. {reps} reps.'],
  },
  // One topped session, and this profile wants two before moving. Names what would earn it.
  set_hold_confirm: {
    quiet: ['Same {weight} on {lift} today.', 'Hold {weight} on {lift} once more.', '{weight} again on {lift}.'],
    plain: ['Same {weight} on {lift} — do that again and we go up.', 'Hold {weight}. Repeat it and {lift} moves.', '{weight} once more, then {lift} goes up.'],
    direct: ['{weight} again. Repeat it and we move.', 'Same weight on {lift}. Do it twice and it goes up.', 'Hold {weight} — one more like that.'],
  },
  // Short of the bottom of the range. ⚠ Never a grade — it states the target, not the shortfall.
  set_hold_short: {
    quiet: ['Same {weight} on {lift}, all {reps}.', '{weight} again — {reps} across.', 'Stay at {weight} for {reps}.'],
    plain: ['Stay at {weight} on {lift} and get all {reps}.', 'Same {weight} — {reps} on every set.', 'Hold {weight}, aim for {reps} each set.'],
    direct: ['{weight}. All {reps} this time.', 'Same weight, {reps} every set.', 'Stay at {weight} until {reps} is clean.'],
  },
  /*
   * ⚠ ONE REGISTER, DELIBERATELY. Backing off is the rescue, and `progression.ts` is explicit that the
   * asymmetry is the moral core: advancing too fast costs a rep, and the other direction is cheaper.
   * There is no version of "come down in weight" that should be delivered hard, so `direct` and `quiet`
   * read the same and the table says so rather than relying on an author's restraint.
   */
  set_back_off: {
    quiet: ['Stay at {weight} on {lift} and rebuild from there.', 'Hold {weight} — build back up from it.', '{weight} on {lift}, and work up again from there.'],
    plain: ['Stay at {weight} on {lift} and rebuild from there.', 'Hold {weight} — build back up from it.', '{weight} on {lift}, and work up again from there.'],
    direct: ['Stay at {weight} on {lift} and rebuild from there.', 'Hold {weight} — build back up from it.', '{weight} on {lift}, and work up again from there.'],
  },
  // No history on this lift. The athlete decides; he asks them to record what they land on.
  set_first_time: {
    quiet: ['First time on {lift} — note what you land on.', 'New lift. Keep a couple of reps back.', 'First go at {lift}. Write down where you finish.'],
    /* ⚠ "light enough to have two more in you" was here and the grading guard in `intra-set.test.mjs`
       rejected it. The line instructs rather than grades, so the guard was arguably over-broad — but a
       strict guard is worth more than one phrasing, and the reworded line says the same thing. */
    plain: ['First time on {lift} — pick something you could do a couple more with.', 'New lift: leave two reps in hand and note the weight.', 'Open {lift} with two reps still in you.'],
    direct: ['First time on {lift}. Two reps in reserve, and note it.', 'New lift — leave two in the tank.', 'Pick a weight for {lift} you could beat by two.'],
  },
  /*
   * The mid-exercise bump — the PO's *"in the middle of a set be told, let's go up 10 lbs"*.
   * ⚠ Every variant is a CONDITIONAL or a bare instruction. None of them says the set looked easy.
   */
  intra_up: {
    quiet: ['{weight} is there for the next one if you want it.', 'Next set could be {weight}.', 'There is room to go to {weight}.'],
    plain: ['If that moved well, take the next one to {weight}.', 'Next set at {weight} if it felt right.', 'You have room — {weight} on the next set.'],
    direct: ['Next set, {weight}.', 'Put it up to {weight}.', '{weight} on the next one.'],
  },
  // Relays the author's cue. ⚠ Adds no training content — `{cue}` is the whole line.
  cue_reminder: {
    quiet: ['{cue}', '{cue}', '{cue}'],
    plain: ['{cue}', 'Remember: {cue}', '{cue}'],
    direct: ['{cue}', '{cue}', 'Keep it honest: {cue}'],
  },
};

export interface SayTokens {
  lift?: string;
  weight?: string;
  reps?: number | string;
  cue?: string;
}

/**
 * One line, filled.
 *
 * ⚠ A LINE WITH AN UNFILLED TOKEN RETURNS NULL rather than printing a brace at somebody between sets.
 * That is a real path: `{cue}` is empty whenever the author wrote none, and a caller may reach for
 * `set_advance` before the weight is known. Silence is always a legal answer here.
 */
export function say(key: InWorkoutKey, register: Register, tokens: SayTokens, choose?: Chooser): string | null {
  const table = LINES[key];
  if (!table) return null;
  const raw = pickFrom(`iw:${key}:${register}`, table[register] ?? table.plain, choose ?? ((n) => Math.floor(Math.random() * n)));
  if (!raw) return null;

  /* ⚠ A SENTINEL THAT CANNOT OCCUR IN COPY, AND CANNOT BE THE EMPTY STRING. A space or a "?" matches
     half the lines in the table; `''` is worse still, because `includes('')` is always true and every
     line Holt has would silence itself. Spelled out in ASCII rather than as an escape so no tool in the
     chain between here and the file can quietly reinterpret it. */
  const MISSING = '<<NO_VALUE>>';
  const filled = raw.replace(/\{(lift|weight|reps|cue)\}/g, (_m, token: keyof SayTokens) => {
    const value = tokens[token];
    return value == null || String(value).trim() === '' ? MISSING : String(value);
  });
  return filled.includes(MISSING) ? null : filled;
}

/** Every table, for the tests that walk them all. */
export const IN_WORKOUT_LINES = LINES;
