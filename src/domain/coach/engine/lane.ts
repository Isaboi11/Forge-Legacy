/**
 * THE TWO LANES (Holt Listens step 2, S7 — PO D10, 2026-11-18: "Holt just talks").
 *
 *   · `ai`  — Premium AI. Holt asks in WORDS; no button-flow questions. The only buttons are Apply/Undo-type
 *             confirms and the actions a card carries. A low-stakes detail is ASSUMED and said once, so the athlete
 *             can correct it in words ("I've gone with about an hour a session…").
 *   · `tap` — free users, and a turn where the AI is down: today's chip flows, unchanged.
 *
 * PO 11-19 (P7): "New: asks the few things it needs in words. Old: uses what it knows, asks nothing it already knows."
 * Pure: relative imports only.
 */

import { nextQuestion, type ChatMode, type ChatState, type Question } from '../chat-core.ts';
import { defaultWeeksFor } from '../rulebook/skeletons.ts';
import type { Lane } from './types.ts';

export const laneFor = (premiumAi: boolean): Lane => (premiumAi ? 'ai' : 'tap');

/** "Change my program" with nothing said about what (AI lane): he asks, in words, instead of a session picker. */
export const CHANGE_WHAT_LINE = 'Sure. What do you want to change — a session, an exercise, how much you run, or the whole week?';

/** Questions a coach would not stop to ask — he assumes the sensible answer and SAYS it. */
const LOW_STAKES: ReadonlySet<string> = new Set(['time', 'limits', 'size']);

/**
 * Fill the low-stakes answers the build would otherwise stop for, in the order it would ask them, and say what was
 * assumed. Never touches anything they said (only `null`/`undefined` fields are filled).
 */
export function assumeForAiLane(c: ChatState, mode: ChatMode): { next: ChatState; assumed: string[] } {
  let next = { ...c };
  const assumed: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const q = nextQuestion(next, mode);
    if (!q || !LOW_STAKES.has(q.id)) break;
    if (q.id === 'time') {
      next = { ...next, sessionMinutes: 60 };
      assumed.push('about an hour a session');
    } else if (q.id === 'limits') {
      next = { ...next, limitations: [] };
      assumed.push('nothing to work around');
    } else if (q.id === 'size') {
      const weeks = next.goal ? defaultWeeksFor(next.goal) : 8;
      next = { ...next, weeks };
      assumed.push(`${weeks} weeks`);
    }
  }
  return { next, assumed };
}

const andList = (xs: readonly string[]): string =>
  xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

/** Said once, before the build: what he assumed, and that a word changes it. */
export function assumedLine(assumed: readonly string[]): string | null {
  if (!assumed.length) return null;
  return `I've gone with ${andList(assumed)} — tell me if any of that's off and I'll change it.`;
}

const orList = (xs: readonly string[]): string =>
  xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`;

/**
 * A build question asked the way a coach asks it — in words, the choices said inline when there are a few — instead of
 * a row of buttons. Long lists (and free numbers like days) are left to the athlete's own words.
 */
/**
 * How a coach asks it out loud (live run 11-19: the chip labels read back as "(i'm new to this, i've been at it a while
 * or i know what I'm doing)" — first person, lower-cased). Questions not here fall back to the choices said inline.
 */
const SPOKEN: Partial<Record<string, string>> = {
  experience: 'How long have you been lifting — just starting out, a year or two, or years?',
  where: 'Where do you train — a full gym, a home setup, or no equipment at all?',
  goal: 'What are we chasing — strength, muscle, losing fat, general fitness, or a race?',
  time: 'How long do you usually have for a session?',
  days: 'How many days a week can you really train?',
  race_base: 'Roughly how many miles are you running a week right now? Zero is a fine answer.',
  race_when: 'When is the race?',
  race_distance: 'Which distance — 5K, 10K, half or full marathon?',
  day_focus: 'What do you want to hit today?',
};

export function askInWords(q: Question): string {
  const spoken = SPOKEN[q.id];
  if (spoken) return spoken;
  const labels = q.chips.map((c) => c.label.replace(/\s+—.*$/, '').trim()).filter(Boolean);
  if (q.id === 'days' || labels.length < 2) return q.ask;
  const shown = labels.length <= 4 ? labels : [...labels.slice(0, 3), 'something else'];
  const hint = orList(shown.map((l) => l.charAt(0).toLowerCase() + l.slice(1)));
  return /\?$/.test(q.ask) ? `${q.ask.slice(0, -1)} — ${hint}?` : `${q.ask} (${hint})`;
}

/** An edit question's options, said in words (the athlete answers by typing; the model or matcher places it). */
export function optionsInWords(message: string, options: readonly string[]): string {
  if (!options.length) return message;
  const shown = options.length <= 4 ? options : [...options.slice(0, 3), 'another one'];
  return `${message} ${orList(shown)}?`;
}

/** The active-program question in words (AI lane) — the three ways forward named, nothing to tap. */
export function guardInWords(programName: string, typed: boolean): string {
  const lead = typed
    ? `You're already running ${programName}. I can build a new program with everything you just told me to replace it`
    : `You've already got ${programName} running. I can replace it with a new one`;
  return `${lead}, build just a week instead, or keep ${programName} and change it. Which do you want?`;
}
