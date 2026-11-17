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
 *   · the text must contain training written the way training is written (`LIFTY`, below): sets and reps, a count
 *     of a movement, a time or distance on a movement, a Sets/Reps column header, a load as a % of a max. A
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

/*
 * IS THERE TRAINING WRITTEN HERE? (AI audit 2026-11-16, V-D1.) The first rule was "a digit, then x, sets, reps or %".
 * It turned away real programs and kept their credits: "Bench Press 4×6-8" (the × program graphics use), "Plank
 * 3 × 30s", "15 Push-ups", "Run 5 km", and every column sheet whose numbers sit under a Sets / Reps header (12 of
 * the 21 real photo sheets in `program/__tests__/fixtures`). And it let a menu through on "18% gratuity" and a till
 * receipt on "2% MILK".
 *
 * Any ONE of these says yes:
 *   · sets × reps with x, X or × ("4×6-8", "3 X 10"), but not a till's "2 x 1.25";
 *   · a time or distance done N times ("400m x 6");
 *   · "5 sets", "8 reps", "Sets: 3";
 *   · a load as a % of a max: "@ 75%", "80% of 1RM", or two %s on one line ("60%, 65%, 70%");
 *   · a Sets / Reps (or Reps / Weight) header with numbers below it;
 *   · a line that starts with a count and a movement ("15 Push-ups", "- 20 air squats");
 *   · a movement with a time or distance beside it ("Run 5 km", "Plank 30s", "400m row", "Wall sit 1:30");
 *   · EMOM, AMRAP or Tabata.
 * What it still refuses (`card-rule.test.mjs`): a menu, a receipt, a text message, a recipe, a caption, prose.
 *
 * ⚠ THE SAME RULE, CHARACTER FOR CHARACTER, IS IN `supabase/functions/workout-card-read/index.ts` (a dashboard paste,
 * so it imports nothing). `workout-ai-gate.ts` imports this one. `card-rule.test.mjs` fails the moment they differ.
 */
// ── LIFTY: begin ──
const LIFT_MOVE = String.raw`\b(?:push[ -]?ups?|pull[ -]?ups?|chin[ -]?ups?|sit[ -]?ups?|squats?|lunges?|burpees?|planks?|rows?|rowing|run|jog|sprints?|jumps?|jumping|crunch(?:es)?|swim|bike|swings?|wall[ -]?sits?|dead[ -]?hangs?|mountain[ -]?climbers?)\b`;
const LIFT_TIME = String.raw`(?:\d+(?:\.\d+)?[ \t]*(?:s|secs?|seconds?|mins?|minutes?)\b|\b\d{1,2}:\d{2}\b)`;
const LIFT_DISTANCE = String.raw`\d+(?:\.\d+)?[ \t]*(?:m|km|k|mi|miles?|meters?|metres?|yds?|yards?|cals?)\b`;
const LIFT_AMOUNT = `(?:${LIFT_TIME}|${LIFT_DISTANCE})`;
const LIFTY = new RegExp(
  [
    String.raw`\d[ \t]*[x×][ \t]*(?!\d*[.,]\d\d(?!\d))\d`,
    String.raw`${LIFT_AMOUNT}[ \t]*[x×][ \t]*\d`,
    String.raw`\d[ \t]*(?:sets?|reps?)\b`,
    String.raw`\b(?:sets?|reps?)[ \t]*[:=][ \t]*\d`,
    String.raw`@[ \t]*\d{1,3}(?:\.\d+)?[ \t]*%`,
    String.raw`\d[ \t]*%[ \t]*(?:of[ \t]+)?(?:your[ \t]+)?(?:e?1[ \t]*rm|rm|max|tm)\b`,
    String.raw`\d[ \t]*%[^\n]*\d[ \t]*%`,
    String.raw`\b(?:sets?\b[^\n]*\breps?|reps?\b[^\n]*\b(?:sets?|weight|load|lbs?|kgs?)|(?:weight|load)\b[^\n]*\breps?)\b[^\n]*\n[\s\S]*?\d`,
    String.raw`^[ \t]*(?:[-*•·]|\d{1,2}[.)])?[ \t]*\d{1,3}[ \t]+(?:[a-z]+[ \t]+)?${LIFT_MOVE}`,
    String.raw`${LIFT_MOVE}(?:[ \t]+[a-z]+)?[ \t]*[:\-–—]?[ \t]*(?:for[ \t]+)?${LIFT_AMOUNT}`,
    String.raw`${LIFT_AMOUNT}[ \t]+(?:of[ \t]+)?(?:[a-z]+[ \t]+)?${LIFT_MOVE}`,
    String.raw`\b(?:emom|amrap|tabata)\b`,
  ].join('|'),
  'im',
);
// ── LIFTY: end ──

/** The one rule: `cleanCardTranscript` below, `workout-ai-gate.ts` ("is there a workout here"), and the function's copy. */
export { LIFTY };

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
