/**
 * A PHOTOGRAPHED WORKOUT CARD, AS TEXT — the guard on what `workout-card-read` hands back (PO 2026-09-30).
 *
 * `program-photo-read` reads a TABLE, and its guard is structural: a line with no tab in it is dropped, so that
 * function has no channel that can carry a sentence. A handwritten card is not a table. Read as one, its title has
 * no row to sit in, and its warm-up, rests and margin notes land in whichever cell the model picks that day (the
 * same photo came back in two different shapes on 2026-09-30). So a card is read line by line instead, and a line
 * IS a sentence — the tab rule cannot be the guard here.
 *
 * What stands in its place, in code, on the device:
 *
 *   · the text must contain sets and reps written as sets and reps ("3 sets", "5 reps", "4x10", "75%"). A
 *     description of a photograph, or of a person in one, has none, and is refused as "not a workout";
 *   · it is capped in lines and characters, so nothing long rides along;
 *   · and it is never posted as it stands. It goes in the poster's own box, through the AI layout, through
 *     `checkAiRewrite`, and through the code reader — only lifts, numbers and the card's own words reach a squad.
 *
 * Pure: no React, no Supabase. The function carries a copy of the same rule (it is a dashboard paste and imports
 * nothing); this is the one that decides what the app accepts.
 */

/** Same ceiling as one AI read (`MAX_AI_CHARS`). A day's card is 300–1,200 characters. */
export const MAX_CARD_CHARS = 6000;
export const MAX_CARD_LINES = 120;

/** Sets and reps written as sets and reps. The same test `workout-ai-gate.ts` uses for "is there a workout here". */
const LIFTY = /\d\s*(?:x\s*\d|sets?\b|reps?\b|%)/i;

export type CardTranscript = { ok: true; text: string } | { ok: false; reason: 'not_a_program' | 'unreadable' };

export function cleanCardTranscript(raw: unknown): CardTranscript {
  if (typeof raw !== 'string') return { ok: false, reason: 'unreadable' };
  const text = raw
    .replace(/\r/g, '')
    .replace(/^\s*```[a-z]*\s*\n?|\n?\s*```\s*$/g, '')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .slice(0, MAX_CARD_LINES)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_CARD_CHARS);
  if (!text) return { ok: false, reason: 'unreadable' };
  if (/^NOT_A_WORKOUT\b/.test(text)) return { ok: false, reason: 'not_a_program' };
  if (!LIFTY.test(text)) return { ok: false, reason: 'not_a_program' };
  return { ok: true, text };
}
