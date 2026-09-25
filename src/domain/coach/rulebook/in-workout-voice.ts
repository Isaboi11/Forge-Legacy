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
 * It borrows the one thing that must not be duplicated: `pickFrom`'s deck. A second memory would let Holt
 * say the same sentence twice running across the file boundary.
 *
 * ══ ⚠ REGISTER IS A THIRD DIMENSION, NOT MORE VARIANTS ══
 *
 * `voice.ts`'s rule: *"if a variant ever reads as a different ANSWER rather than a different WORDING of
 * the same answer, it is a bug."* If `quiet` and `direct` were variants inside one key, nothing would
 * stop a future edit making the loud one say something the quiet one does not. Keyed separately, the
 * three registers are three wordings of a fixed answer by construction — the answer is decided before
 * this file is reached, by `progressionFor` and `intraSuggestion`.
 *
 * The register is the intensity dial's VOLUME (HV-D6): `quiet` is warm and brief, `plain` encouraging,
 * `direct` fired up. Every register is glad when the weight goes up; none of them is ever cold.
 *
 * ══ ⚠ THE COPY RULE — `Holt-Voice-Amendment-001` HV-D4, amending W9-A5 D-3 ══
 *
 * `Active-Workout-Flow-Spec-W9-W16` §"must never become": *"no timers that shame, no 'you're behind your
 * goal' messaging."* That half stands. What changed on 2026-09-21 is that Holt may now be glad about
 * what went RIGHT. So, for every line below:
 *
 *   **It names the next action. It may celebrate what went right. It never characterises what went
 *   wrong.**
 *
 *   ✅ "Every rep, every set. Bench goes to 195."     ✅ "Same 185. Aim for 8 on every set today."
 *   ❌ "That looked slow — stay there."  (a grade)    ❌ "You were short of 8 last time."  (the shortfall, named)
 *
 * **Exclamation marks only on a win** — the weight going up, reps going up, room to go heavier — and at
 * most one per line (HV-D3). `WIN_KEYS` is the list, and the tests hold every other key to none.
 *
 * ══ WHY THE PROGRESSION LINES LIVE HERE ══
 *
 * `progressionFor`'s sentence is the line an athlete reads more than any other Holt says — once per
 * exercise, every session. It used to be ONE template per verdict, so a lifter heard the identical
 * sentence on the same lift every week for a year. The verdict and every number are still decided in
 * `progression.ts`; only the words come from here.
 *
 * Pure and node-testable: no React, no RN, no storage, no runtime `@` imports.
 */

import { pickFrom, pickOnce, type Chooser } from './voice.ts';
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
  | 'cue_reminder'
  // ── `progressionFor`, one per verdict ──
  | 'prog_first'
  | 'prog_back_off'
  | 'prog_bw_up'
  | 'prog_bw_hold'
  | 'prog_add_weight'
  | 'prog_overshoot'
  | 'prog_add_rep'
  | 'prog_hold_top'
  | 'prog_hold_short'
  // ── `effortReply`, after "how did that feel?" on a first-ever set ──
  | 'effort_right'
  | 'effort_easy_next'
  | 'effort_easy_max'
  | 'effort_heavy_next'
  | 'effort_heavy_min';

/** The only keys that may exclaim — each one is a win (HV-D3). */
export const WIN_KEYS: readonly InWorkoutKey[] = ['set_advance', 'prog_add_weight', 'prog_overshoot', 'prog_bw_up', 'intra_up'];

type RegisterTable = Record<Register, readonly string[]>;

/** One wording for every register — for lines whose tone must not move with the dial. */
const same = (lines: readonly string[]): RegisterTable => ({ quiet: lines, plain: lines, direct: lines });

/**
 * ⚠ Tokens are filled by `say()`. A token with no value removes the line rather than printing a brace at
 * somebody mid-set. Weights arrive already written as "185 lb" — see `progression.ts` — because the
 * screen finds numbers to convert by the unit beside them.
 */
const LINES: Record<InWorkoutKey, RegisterTable> = {
  // Topped the range on every working set: the weight goes up.
  set_advance: {
    quiet: [
      '{lift} is ready for {weight}. Well earned.',
      'You earned {weight} on {lift}.',
      'Time to move {lift} up to {weight}.',
      'Every rep last time. {lift} goes to {weight}.',
      '{weight} on {lift} when you are ready — you earned it.',
      '{lift} moves to {weight}. Nice work.',
    ],
    plain: [
      'Every rep, every set. {lift} goes to {weight} — start back at {reps}.',
      'You earned it. {weight} on {lift}, back to {reps} reps.',
      '{lift} goes up to {weight}! Reset to {reps}.',
      'Look at that — {lift} moves to {weight}. Start at {reps}.',
      'Progress. {weight} on {lift} and {reps} reps to start.',
      'You topped it out. {lift} to {weight}, back to {reps}.',
    ],
    direct: [
      "You earned it. {weight} on {lift}, let's go!",
      'Up to {weight}! {reps} reps. Go get them.',
      '{weight} on {lift}. Back to {reps}. This is how you get strong.',
      'Load {weight}. You owned the last one — {reps} reps.',
      '{lift} goes to {weight}! Start at {reps} and attack it.',
      'New weight: {weight}. {reps} reps. Time to prove it again.',
    ],
  },
  // One topped session, and this profile wants two before moving. Names what would earn it.
  set_hold_confirm: {
    quiet: [
      'Same {weight} on {lift} today.',
      'Hold {weight} on {lift} once more.',
      '{weight} again on {lift}.',
      'One more session at {weight} on {lift}, then we move.',
      '{lift} stays at {weight} today.',
      '{weight} on {lift} again. Nearly there.',
    ],
    plain: [
      'Same {weight} on {lift} — do that again and we go up.',
      'Hold {weight}. Repeat it and {lift} moves.',
      '{weight} once more, then {lift} goes up.',
      'One more like last time on {lift} and the weight goes up.',
      'Repeat {weight} on {lift}. You are one session from a jump.',
      '{weight} again. Show me it was no fluke and {lift} moves.',
    ],
    direct: [
      '{weight} again. Repeat it and we move.',
      'Same weight on {lift}. Do it twice and it goes up.',
      'Hold {weight} — one more like that.',
      'Prove it again at {weight}. Then {lift} climbs.',
      '{weight}. Same again, and next time we load it up.',
      'Back it up at {weight}. The jump is right there.',
    ],
  },
  // Short of the bottom of the range. ⚠ States the target, never the shortfall.
  set_hold_short: {
    quiet: [
      'Same {weight} on {lift}, all {reps}.',
      '{weight} again — {reps} across.',
      'Stay at {weight} for {reps}.',
      '{lift} at {weight}, aiming for {reps}.',
      '{reps} on every set at {weight}.',
      'Same weight on {lift}. {reps} a set.',
    ],
    plain: [
      'Stay at {weight} on {lift} and get all {reps}.',
      'Same {weight} — {reps} on every set.',
      'Hold {weight}, aim for {reps} each set.',
      '{weight} on {lift}. Chase {reps} on every set.',
      '{reps} each set at {weight}. Take your rest — you will get there.',
      'Stay with {weight} and go for {reps} across.',
    ],
    direct: [
      '{weight}. All {reps} this time.',
      'Same weight, {reps} every set.',
      'Stay at {weight} until {reps} is clean.',
      '{weight}. {reps} a set. Go take them.',
      'All {reps}, every set, {weight}. You have it.',
      '{lift} at {weight}. Every set to {reps}.',
    ],
  },
  /*
   * ⚠ ONE REGISTER, DELIBERATELY. Backing off is the rescue, and `progression.ts` is explicit that the
   * asymmetry is the moral core: advancing too fast costs a rep, and the other direction is cheaper.
   * There is no version of "come down in weight" that should be delivered hard, so `direct` and `quiet`
   * read the same and the table says so rather than relying on an author's restraint.
   */
  set_back_off: same([
    'Stay at {weight} on {lift} and rebuild from there.',
    'Hold {weight} — build back up from it.',
    '{weight} on {lift}, and work up again from there.',
    '{weight} on {lift} today. Strength you have had before comes back fast.',
    'Rebuild from {weight}. Clean reps first, then we climb.',
    '{lift} at {weight}. Make it feel good again and we go from there.',
  ]),
  // No history on this lift. The athlete decides; he asks them to record what they land on.
  set_first_time: {
    quiet: [
      'First time on {lift} — note what you land on.',
      'New lift. Keep a couple of reps back.',
      'First go at {lift}. Write down where you finish.',
      'New one: {lift}. Start comfortable and log it.',
      '{lift} for the first time. Find your number.',
      'First {lift}. Two reps in reserve.',
    ],
    /* ⚠ "light enough to have two more in you" was here and the grading guard in `intra-set.test.mjs`
       rejected it. The line instructs rather than grades, so the guard was arguably over-broad — but a
       strict guard is worth more than one phrasing, and the reworded line says the same thing. */
    plain: [
      'First time on {lift} — pick something you could do a couple more with.',
      'New lift: leave two reps in hand and note the weight.',
      'Open {lift} with two reps still in you.',
      'First {lift}. Clean reps today, and the log does the rest.',
      'New one. Start with a weight you could beat by two and write it down.',
      'First go at {lift}. Today we find your starting line.',
    ],
    direct: [
      'First time on {lift}. Two reps in reserve, and note it.',
      'New lift — leave two in the tank.',
      'Pick a weight for {lift} you could beat by two.',
      'First {lift}. Find your number and log it.',
      'New one. Solid weight, two reps left, write it down.',
      'First go at {lift}. Set the number to beat.',
    ],
  },
  /*
   * The mid-exercise bump — the PO's *"in the middle of a set be told, let's go up 10 lbs"*.
   * A win: they beat the top of the range by two. It may say so; it may exclaim at `direct`.
   */
  intra_up: {
    quiet: [
      '{weight} is there for the next one if you want it.',
      'Next set could be {weight}.',
      'There is room to go to {weight}.',
      'If it felt good, {weight} is an option next set.',
      'You could take {weight} on the next one.',
      '{weight} next set, if you like.',
    ],
    plain: [
      'If that moved well, take the next one to {weight}.',
      'Next set at {weight} if it felt right.',
      'You have room — {weight} on the next set.',
      'Plenty left in the tank. Try {weight} next.',
      'More reps than the plan asked for. {weight} next set.',
      'Go up to {weight} for the next one.',
    ],
    direct: [
      'Next set, {weight}!',
      'Put it up to {weight}.',
      '{weight} on the next one. Go.',
      'You have more in you. {weight} next set!',
      "Past the top of the range. {weight}, let's go.",
      'Load {weight}. Make it earn its place.',
    ],
  },
  // Relays the author's cue. ⚠ Adds no training content — `{cue}` is the whole line.
  cue_reminder: {
    quiet: ['{cue}', '{cue}', 'Quick reminder: {cue}'],
    plain: ['{cue}', 'Remember: {cue}', 'Focus: {cue}'],
    direct: ['{cue}', 'Keep it honest: {cue}', 'Every rep: {cue}'],
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // `progressionFor` — the line on the coin, once per exercise, every session
  // ════════════════════════════════════════════════════════════════════════════════════════════════

  // Never done it. The athlete picks; he asks them to log it.
  prog_first: same([
    'First time on {lift} — pick a weight you could do a couple more reps with, and note what you land on.',
    'New one: {lift}. Start with a weight that leaves two reps in the tank. Today we find your number.',
    'First {lift}. Go conservative, own every rep, and log what you use — that becomes the number to beat.',
    '{lift} is new. Pick something you could do two more reps with. We build from whatever you log.',
    'First time on {lift}. No pressure on the weight today — clean reps and a number in the log.',
    'New lift, clean slate. Leave a couple of reps in reserve on {lift} and write down where you land.',
    '{lift} for the first time. Find a weight that feels solid, not a grind. That is our starting line.',
    'First go at {lift}. Start comfortable — there is plenty of time to load it up.',
  ]),
  /*
   * ⚠ BACKING OFF: ONE REGISTER, AND IT NEVER NAMES THE DROP AS A LOSS. The old line led with "came down
   * from 185 to 155", which is the shortfall named. The athlete knows. What they need from a coach is the
   * next step and a reason to believe in it.
   */
  prog_back_off: same([
    'Stay at {weight} on {lift} and rebuild from there.',
    '{lift} at {weight} today. Build it back up — strength you have had before comes back fast.',
    'We are rebuilding {lift} from {weight}. Own it here and the rest follows.',
    '{weight} on {lift}. Solid reps here are how it climbs back past {from}.',
    'Stay at {weight} on {lift}. Make it feel good again, then we climb.',
    '{lift}: {weight} for now. Rebuilding is part of training, and it goes quicker than the first time.',
  ]),
  // Bodyweight, every set in the range: one more rep. A small win — it may exclaim.
  prog_bw_up: {
    quiet: [
      'You got {best} on {lift} last time. Go for {target} today.',
      '{best} last time on {lift}. {target} is next.',
      '{lift}: {target} reps today, one past last time.',
      'Next target on {lift} is {target}. You are ready for it.',
      '{best} last time. Aim for {target} on {lift}.',
      'One more than last time — {target} on {lift}.',
    ],
    plain: [
      'You got {best} on {lift} — go for {target} this time.',
      "{best} last time! Let's see {target} on {lift} today.",
      'Rep goal for {lift}: {target}. One more than you did last time.',
      '{lift} is moving. {best} last time, {target} today.',
      'You are adding reps on {lift}. Go get {target}.',
      '{target} on {lift} today. You have been building to it.',
    ],
    direct: [
      '{best} last time. {target} today. Go take it!',
      '{target} on {lift}. You have it in you.',
      "Beat {best}. {target} reps on {lift} — let's go.",
      '{lift}: {target}. One more rep than last time. Earn it.',
      'You hit {best}. Now {target}. Go get it!',
      '{target} reps on {lift}. Chase it down.',
    ],
  },
  // Bodyweight, below the range. ⚠ The target, never the shortfall.
  prog_bw_hold: same([
    'Same again on {lift} — aim for {reps} on all {sets} sets.',
    '{lift} today: {reps} reps, {sets} sets. Chase every one.',
    'Stay with {lift} at {reps} reps. All {sets} sets is the goal.',
    '{reps} on every set of {lift} today. You are close.',
    'Target on {lift}: {sets} sets of {reps}. Take your rest between them.',
    'Go for all {sets} sets of {reps} on {lift}. That is the next step.',
  ]),
  // ⭐ Topped the range on every set: the weight goes up. The biggest in-workout win there is.
  prog_add_weight: {
    quiet: [
      'You hit {sets} × {top} at {weight} on {lift}. Go to {next} and start back at {reps}.',
      'Every set at {top} last time. {lift} moves to {next} — start at {reps}.',
      '{lift} goes to {next} today. You earned it. Start at {reps} reps.',
      'Nice work on {lift} last time. {next} today, {reps} reps.',
      '{sets} × {top} at {weight}. Time for {next} on {lift}, back to {reps}.',
      '{lift} is ready for {next}. Start back at {reps}.',
    ],
    plain: [
      'You hit {sets} × {top} at {weight} on {lift} — go to {next} and start back at {reps}.',
      'Every rep, every set at {weight}! {lift} goes to {next} — back to {reps}.',
      '{sets} × {top} last time. You earned {next} on {lift}. Start at {reps}.',
      '{lift} is going up! {next} today, {reps} reps to start.',
      'That is progress: {lift} moves from {weight} to {next}. Start at {reps}.',
      'You topped out {weight} on {lift}. {next} today, back to {reps}.',
      'Look at that — {next} on {lift}. {reps} reps to start.',
      '{lift} to {next}. That is what {sets} × {top} buys you. Start at {reps}.',
    ],
    direct: [
      '{sets} × {top} at {weight}. Now {next}! Back to {reps}.',
      'You earned {next} on {lift}. {reps} reps. Go take it!',
      '{lift} goes up to {next}. {reps} reps — make it yours.',
      "Every rep last time. {next} on {lift} today. Let's go!",
      'Time to move: {next} on {lift}, {reps} reps. Attack it.',
      '{next} on the bar. You owned {weight} — now own this. {reps} reps.',
      'Up to {next} on {lift}! Start at {reps} and prove it again.',
      '{lift}: {next}. {reps} reps. This is how you get strong.',
    ],
  },
  // Inside the range: same weight, one more rep. Progress, not yet a win — no exclamation.
  prog_add_rep: {
    quiet: [
      'Stay at {weight} on {lift} and go for {target} — one more than last time.',
      '{weight} on {lift}, aiming for {target} reps.',
      '{lift} at {weight}. One more rep today: {target}.',
      'Same {weight}, one more rep. {target} on {lift}.',
      '{target} reps at {weight} on {lift} today.',
      '{lift}: {weight} for {target}. Small steps add up.',
    ],
    plain: [
      'Stay at {weight} on {lift} and go for {target} — one more than last time.',
      '{weight} on {lift} again. Beat last time with {target}.',
      'One more rep is progress. {target} at {weight} on {lift}.',
      '{lift} at {weight}. Go for {target} — you are building.',
      'Same weight, more reps: {target} at {weight} on {lift}.',
      '{target} on {lift} at {weight}. Get that one extra rep.',
      'Keep {weight} on {lift} and chase {target}. That rep is next.',
    ],
    direct: [
      '{weight} on {lift}. {target} reps. One more than last time — take it.',
      '{lift} at {weight}. Go get {target}.',
      '{target} reps at {weight} on {lift}. Fight for that extra one.',
      'Beat last time: {target} at {weight} on {lift}.',
      '{weight} for {target} on {lift}. You have one more rep in you.',
      'Same weight, one more rep. {target} at {weight}. Go.',
    ],
  },
  // At the top already, holding. Consistency, said warmly.
  /* Last time was a different rep scheme: {best} reps at {weight}, today asks for {reps}. The new weight is
     worked out from what they did, so the line says so, never "stay". (PO, 2026-09-24, 30 lb × 20 → 8 reps.) */
  prog_overshoot: same([
    '{best} reps at {weight} last time is well past {top}. {lift} goes to {next} today for {reps}.',
    'You did {best} at {weight} on {lift}. For {reps} reps, {next} is your weight.',
    '{lift}: {best} reps at {weight} says you are ready. {next} for {reps} today.',
  ]),
  prog_hold_top: same([
    'Stay at {weight} on {lift} and hold {target}.',
    '{weight} on {lift} for {target} again. Make them clean.',
    '{lift} at {weight}, {target} reps. Own it one more time.',
    'Hold {weight} for {target} on {lift}. Consistency builds this.',
    '{target} at {weight} on {lift} again. Solid reps today.',
    'Same again on {lift}: {weight} for {target}.',
  ]),
  // Below the range. ⚠ The target, never the shortfall — the old line opened "was short of 8 last time".
  prog_hold_short: same([
    'Same {weight} on {lift}. Aim for {reps} on all {sets} sets today.',
    '{lift} at {weight} again. Goal: {sets} sets of {reps}.',
    'Stay at {weight} on {lift} and go for all {sets} sets of {reps}.',
    '{weight} on {lift}, {reps} reps a set. Take your rest — you will get there.',
    'Hold {weight} on {lift}. {reps} on every set is the target.',
    'Same weight, same target: {sets} × {reps} at {weight} on {lift}.',
  ]),

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // `effortReply` — "how did that feel?" on a first-ever set. Tone must not move with the dial.
  // ⚠ `{next}` is a bare number and every line writes " lb" after it — see `first-set.ts`.
  // ════════════════════════════════════════════════════════════════════════════════════════════════

  effort_right: same([
    'Good — stay there for the rest of them.',
    'That is your weight. Stay with it.',
    'Right where you want it. Keep it there.',
    'Good spot. Same weight for the rest.',
    'Good call. Hold that for the remaining sets.',
    'That is the one. Stay there.',
  ]),
  effort_easy_next: same([
    'Right, put it up to {next} lb for the next one.',
    "Then let's go up — {next} lb next set.",
    'Room to grow. {next} lb on the next one.',
    'Good sign. Try {next} lb next set.',
    '{next} lb for the next set. See how that feels.',
    'Bump it to {next} lb and keep going.',
  ]),
  effort_easy_max: same([
    "Good. Add a little next time — there's nothing left to put on this one.",
    "Noted — next time we go heavier. This one's maxed out.",
    'Good to know. We add weight next session.',
    'Next time, a step heavier. For today, enjoy the reps.',
  ]),
  effort_heavy_next: same([
    "Take it down to {next} lb and finish the rest there. Nobody's watching.",
    'Drop to {next} lb for the rest. Clean reps build more than heavy ones.',
    "{next} lb for the remaining sets. That's smart training.",
    'Come down to {next} lb. Good reps build more than grinding does.',
    "Let's go {next} lb for the rest. No ego, all progress.",
    '{next} lb for the next sets. That is the right call.',
  ]),
  effort_heavy_min: same([
    "Then that's your set — stay there and let it get easier. Nothing to come off.",
    'Stay with it. This weight gets more comfortable every session.',
    "That's your working weight for now. It won't feel like this for long.",
    'Hold it here. Heavy today is normal in a few weeks.',
  ]),
};

export type SayTokens = Record<string, string | number | null | undefined>;

/**
 * ⚠ A SENTINEL THAT CANNOT OCCUR IN COPY, AND CANNOT BE THE EMPTY STRING. A space or a "?" matches half
 * the lines in the table; `''` is worse still, because `includes('')` is always true and every line Holt
 * has would silence itself. Spelled out in ASCII rather than as an escape so no tool in the chain between
 * here and the file can quietly reinterpret it.
 */
const MISSING = '<<NO_VALUE>>';

function fill(raw: string, tokens: SayTokens): string | null {
  const filled = raw.replace(/\{(\w+)\}/g, (_m, token: string) => {
    const value = tokens[token];
    return value == null || String(value).trim() === '' ? MISSING : String(value);
  });
  return filled.includes(MISSING) ? null : filled;
}

const random: Chooser = (n) => Math.floor(Math.random() * n);

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
  const raw = pickFrom(`iw:${key}:${register}`, table[register] ?? table.plain, choose ?? random);
  return raw ? fill(raw, tokens) : null;
}

/**
 * `say`, pinned to a moment — for lines a screen derives during render.
 *
 * The workout screen recomputes every exercise's progression each time a set is logged. With `say` the
 * sentence would change under the athlete mid-exercise; with this, the same `slot` returns the same line
 * and only a new moment (the next session, a different verdict) deals a fresh one.
 */
export function sayOnce(slot: string, key: InWorkoutKey, register: Register, tokens: SayTokens, choose?: Chooser): string | null {
  const table = LINES[key];
  if (!table) return null;
  const lines = table[register] ?? table.plain;
  const raw = pickOnce(`${slot}|${register}`, `iw:${key}:${register}`, lines, choose ?? random);
  return raw ? fill(raw, tokens) : null;
}

/** Every table, for the tests that walk them all. */
export const IN_WORKOUT_LINES = LINES;
