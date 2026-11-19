/**
 * HOLT LISTENS — step 1 (HL-1c/d/e, tester report 2026-11-18; plan `Docs/Holt-Listens-Plan-v1.2.md`).
 *
 * A paying tester told Holt his equipment, asked for core, rear delts and cardio across his whole 5-day block, then
 * typed "I want to edit the entire workout" and "I want to replace the entire program". Every one of those came back
 * as "Which session should change?" — the per-session edit flow asked the same question forever, because nothing in
 * it understood "the whole program" and nothing stopped a question repeating.
 *
 * This module is the small, pure part of the fix:
 *   · {@link wholeProgramAsk} — "the whole program" and "replace it / start over" in their words, so the edit flow stops
 *     asking for a session and says plainly what Holt can do (a whole-block rewrite is step 3 of the plan).
 *   · {@link sameAskAgain} — the loop breaker: the same question is never put to them twice in a row.
 *   · {@link splitSessionPicker} — the picker that showed 22 chips: this week and next as chips, later weeks one tap
 *     further (QA holt-09 still holds — a session in week 6 is reachable, just not as a wall).
 *
 * Pure: no imports, so `node --test` can walk it.
 */

/** What a sentence asks for, at program scale. `null` = nothing program-wide (let the edit flow run as it does). */
export type WholeAsk = 'replace' | 'whole' | null;

const ONE_SESSION = /\b(today|tonight|tomorrow|this session|this workout|today'?s|right now)\b/;
const PROGRAMISH = '(?:program|programme|plan|block|workout|workouts|routine|split|schedule|thing|whole thing)';

const REPLACE: RegExp[] = [
  new RegExp(`\\b(?:replace|scrap|ditch|redo|throw out|trash|swap out|get rid of)\\b[^.?!]{0,40}\\b${PROGRAMISH}\\b`),
  /\b(?:start (?:over|fresh|again|from scratch)|from scratch)\b/,
  new RegExp(`\\b(?:a |an |the )?(?:brand[- ])?new (?:${PROGRAMISH})\\b(?! (?:day|session))`),
];

const WHOLE: RegExp[] = [
  new RegExp(`\\b(?:entire|whole|full|complete)\\s+(?:${PROGRAMISH}|block|weeks?|sessions?)\\b`),
  /\ball (?:of )?(?:the |my )?(?:sessions|days|workouts|weeks)\b/,
  /\ball of (?:it|them)\b/,
  /\bevery (?:session|day|workout|week|single (?:session|day|workout))\b/,
  /\bevery (?:push|pull|leg|legs|upper|lower|chest|back|arm|arms|shoulder|full[- ]body) (?:day|session|workout)s?\b/,
  new RegExp(`\\bacross (?:the |my )?(?:${PROGRAMISH}|board|week|weeks)\\b`),
  /\b(?:overall|everywhere|throughout)\b/,
];

/**
 * "Replace the entire program" → `replace`. "Edit the entire workout to include what I mentioned" → `whole`.
 * Anything pinned to one session ("today", "tomorrow") → `null`, even when it says "whole" ("the whole workout today").
 */
export function wholeProgramAsk(text: string | null | undefined): WholeAsk {
  if (!text) return null;
  const t = text.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
  if (ONE_SESSION.test(t)) return null;
  if (REPLACE.some((r) => r.test(t))) return 'replace';
  if (WHOLE.some((r) => r.test(t))) return 'whole';
  return null;
}

/** One question Holt put to them, as the edit flow keeps it. */
export interface AskShown {
  ask: string;
  message: string;
}

/**
 * True when Holt is about to ask exactly what he asked last time — the same kind of question with the same words.
 * The second time, he says something different (`LOOP_LINE`) instead of the same chips again.
 */
export function sameAskAgain(prev: AskShown | null | undefined, next: AskShown): boolean {
  if (!prev) return false;
  return prev.ask === next.ask && prev.message.trim() === next.message.trim();
}

export interface SessionAt {
  weekIndex: number;
  dayIndex: number;
}

/**
 * The session picker, split: chips for the open sessions in the next two weeks that have any, and the weeks after
 * that as "Week 6", "Week 7"… (one more tap opens that week). Short lists stay whole — `max` or fewer shows them all.
 */
export function splitSessionPicker<T extends { at: SessionAt }>(sessions: readonly T[], max = 8): { now: T[]; laterWeeks: number[] } {
  if (sessions.length <= max) return { now: [...sessions], laterWeeks: [] };
  const weeks = [...new Set(sessions.map((s) => s.at.weekIndex))].sort((a, b) => a - b);
  const shown = new Set(weeks.slice(0, 2));
  return {
    now: sessions.filter((s) => shown.has(s.at.weekIndex)),
    laterWeeks: weeks.filter((w) => !shown.has(w)),
  };
}

/** What Holt says when the change they asked for covers the whole block — honest about today's limit. */
export function wholeProgramLine(programName: string): string {
  return (
    `Reworking every session of ${programName} in one go isn't something I can do yet — that's coming soon. ` +
    `What I can do right now: build you a new program with everything you've told me, to replace it, ` +
    `or change ${programName} one session at a time.`
  );
}

/** "Replace it", said in words — he goes straight to building, no second question. */
export const REPLACE_LINE = "Okay — building you a new one with everything you've told me.";

/** The loop breaker's line: never the same question twice. */
export const LOOP_LINE =
  "I still need to know which session that's for — tap one, or name it, like “Week 5 Pull”. " +
  "If you'd rather rework the whole thing, I can build a new program with everything you've said.";

/** "Keep it and change it" with a typed request waiting: this flow goes a session at a time, and he says so. */
export const ONE_SESSION_FIRST_LINE =
  "Right now I change a program one session at a time — reworking the whole block at once is coming soon. Which session first?";

/** The active-program question, when they TYPED what they want: their words are carried, and he says so. */
export function typedGuardLine(programName: string): string {
  return (
    `You're already running ${programName}. I can build a new program with everything you just told me ` +
    `to replace it, or keep ${programName} and change it.`
  );
}

/** Chip labels this step adds. Compared by value in the sheet, so they live in one place. */
export const BUILD_THE_NEW_ONE = 'Build the new one';
export const KEEP_AND_CHANGE = 'Keep it and change it';
export const ONE_AT_A_TIME = 'One session at a time';
export const laterWeekLabel = (weekIndex: number): string => `Week ${weekIndex + 1}`;
