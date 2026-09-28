import { readWrittenWorkout, writtenToTemplate, type WrittenTemplateRow, type WrittenWorkout } from './written-workout.ts';

/**
 * WHEN AI READS A WORKOUT, AND WHEN IT DOES NOT (PO 2026-09-28: "use AI when needed. For simple workouts it shouldn't
 * be hard, but for workouts like this where it's more complicated it might be difficult. Make sure to build a fool
 * proof plan of when to use ai and when not to"). Import Amendment 002 is the governing text.
 *
 * The code reader (`written-workout.ts`) is always first. It is free, instant and the same every time, and it reads
 * every card the PO has sent. AI is the fallback for a card written a way the reader has never seen, and even then
 * it only REWRITES THE WORDS into the one layout the reader knows (`rowsToWrittenText`'s layout). The reader still
 * turns those words into sets, weights and rest. AI never sets a number.
 *
 *   1. Nothing to read (empty, or a rest day with no sets or reps)          → no AI.
 *   2. The reader read everything                                           → no AI.
 *   3. The only doubt is a name the exercise library doesn't know           → no AI. That is spelling; the poster fixes it.
 *   4. The card is too long for one read                                    → no AI; post it in parts.
 *   5. Otherwise (a line not read, a lift with no reps, a name with numbers
 *      caught in it, a % on the card that went nowhere, lifts written but
 *      none found)                                                          → AI, and only then.
 *
 * And AI's answer is thrown away, keeping the poster's own words, unless `checkAiRewrite` passes: every number AI
 * wrote is on the card, every % on the card is still there, every lift name comes from the card. The poster then
 * sees the rewrite in the box, marked, with Undo, and nothing is posted until they press Use.
 */

/** Past this, one read is too long to trust (and to pay for). A day's card is 300–1,200 characters. */
export const MAX_AI_CHARS = 6000;

export type AiCall =
  | { kind: 'none' }
  | { kind: 'rules' }
  | { kind: 'too_long' }
  | { kind: 'ai'; reasons: string[] };

/** Sets and reps written as sets and reps: "5 sets", "4x10", "8 reps", "@ 75%". A rest day has none of these. */
const LIFTY = /\d\s*(?:x\s*\d|sets?\b|reps?\b|%)/i;

/** "70%", "70-75%", "70 to 75%" — every percentage on the card, both ends of a range. */
function percentsIn(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)(?:\s*%)?\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*%|(\d+(?:\.\d+)?)\s*%/gi)) {
    for (const g of [m[1], m[2], m[3]]) if (g != null) out.push(Number(g));
  }
  return out;
}

/** Every number that made it into the reading: the prescriptions, and every number left in its words. */
function numbersRead(w: WrittenWorkout, rows: readonly WrittenTemplateRow[]): Set<number> {
  const out = new Set<number>();
  const words = [w.name, w.how ?? '', w.after ?? ''];
  for (const r of rows) {
    if (r.percentOfMax != null) out.add(r.percentOfMax);
    for (const p of r.percentScheme ?? []) if (p != null) out.add(p);
    words.push(r.name, r.coachNote ?? '');
  }
  for (const t of words) for (const m of t.matchAll(/\d+(?:\.\d+)?/g)) out.add(Number(m[0]));
  return out;
}

/** A lift the reader found no count for: not a carry for yards, not "100 reps total", not a warm-up. */
function noCount(r: WrittenTemplateRow): boolean {
  return r.section !== 'warmup' && !r.targetReps && !r.repScheme?.length && !/yds|reps total|option|discretion|seconds|each way/i.test(r.coachNote ?? '');
}

/**
 * The line between the rules and AI. `w` and `rows` are the code reader's result for `text`, which the screen has
 * already worked out; reusing them keeps this decision exactly in step with the preview the poster is looking at.
 */
export function whenToUseAi(text: string, w: WrittenWorkout | null, rows: readonly WrittenTemplateRow[]): AiCall {
  if (!text.trim() || !w) return { kind: 'none' };
  const reasons: string[] = [];
  if (!rows.length) {
    if (!LIFTY.test(text)) return { kind: 'none' };
    reasons.push('Sets and reps are written, but no lifts were found.');
  }
  if (w.unread.length) reasons.push(`${w.unread.length === 1 ? 'A line' : `${w.unread.length} lines`} couldn’t be read.`);
  for (const r of rows) {
    if (/[/:"\d]/.test(r.name)) reasons.push(`“${r.name}” has numbers or another lift caught in its name.`);
    else if (noCount(r)) reasons.push(`No reps were read for “${r.name}”.`);
  }
  const read = numbersRead(w, rows);
  const lost = [...new Set(percentsIn(text))].filter((p) => !read.has(p));
  if (lost.length) reasons.push(`${lost.map((p) => `${p}%`).join(', ')} on the card went nowhere.`);
  if (!reasons.length) return { kind: 'rules' };
  if (text.length > MAX_AI_CHARS) return { kind: 'too_long' };
  return { kind: 'ai', reasons };
}

/* ── is AI's rewrite faithful to the card? ─────────────────────────────────── */

/** "2½", "2 1/2", "2.5" → 2.5. */
function num(s: string): number {
  const half = /½|1\/2/.test(s);
  const whole = s.replace(/½|1\/2/g, '').trim();
  return (whole ? Number(whole) : 0) + (half ? 0.5 : 0);
}

const N = String.raw`\d+(?:\.\d+)?(?:\s*(?:½|1\/2))?|½`;

/**
 * The numbers in a text, with durations turned into seconds, so "2½ min", "2:30" and "150 seconds" are the same rest.
 * The dates in a card's heading ("10-16-24") are not numbers anybody lifts, so they are left out on both sides.
 */
function numbersOf(text: string): { plain: Set<number>; secs: Set<number> } {
  const secs = new Set<number>();
  let t = text.replace(/\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g, ' ');
  t = t.replace(/\b(\d{1,2}):(\d{2})\b/g, (_, m, s) => (secs.add(Number(m) * 60 + Number(s)), ' '));
  t = t.replace(new RegExp(String.raw`(${N})\s*(minutes?|mins?|min|m|seconds?|secs?|sec|s)\b`, 'gi'), (_, n, u) => {
    const v = num(n);
    secs.add(Math.round(/^m/i.test(u) ? v * 60 : v));
    return ' ';
  });
  const plain = new Set<number>();
  for (const m of t.matchAll(new RegExp(N, 'g'))) plain.add(num(m[0]));
  return { plain, secs };
}

/** A lift's label at the start of a line ("1.", "4. a.", "super set b.", "3a.") — the layout's, not the card's. */
const LABEL = /^\s*(?:super\s*set\s+[a-z]\s*[.)]|\d{1,2}\s*[.)]\s*(?:[a-z]\s*[.)])?|\d{1,2}[a-z]\s*[.)])/i;

/** Short forms a rewrite may spell out. Either spelling on the card counts for the other. */
const ALIASES: [RegExp, string][] = [
  [/\bdb\b|dumbbells?/, 'dumbbell'],
  [/\bbb\b|barbells?/, 'barbell'],
  [/\bkb\b|kettlebells?/, 'kettlebell'],
  [/\brdl\b|romanian/, 'romanian'],
  [/\bohp\b|overhead/, 'overhead'],
];
const expand = (t: string) => ALIASES.reduce((s, [re, word]) => (re.test(s) ? `${s} ${word}` : s), t.toLowerCase());

/**
 * Why AI's rewrite of `source` must be thrown away, or [] when it is faithful. `tidied` is the rewrite; it is read
 * here with the same code reader the post will use, so what is checked is exactly what the squad would get.
 *
 *   · Every number in the rewrite is on the card. A rest may be written another way (2½ min = 2:30); a lift's
 *     label ("4. a.") and "1 set of" (the layout's word for a single set) are the layout's own.
 *   · Every % on the card is still in the rewrite. Nothing is dropped to make it tidy.
 *   · Every lift's name shares a word with the card. Nothing is invented.
 *   · It found lifts, if the card has sets and reps.
 */
export function checkAiRewrite(source: string, tidied: string, resolveKey: (name: string) => string | undefined): string[] {
  const problems: string[] = [];
  const w = readWrittenWorkout(tidied);
  const rows = writtenToTemplate(w, resolveKey);
  if (!rows.length && LIFTY.test(source)) problems.push('The rewrite has no lifts in it.');

  const src = numbersOf(source);
  const allowedSecs = new Set([...src.secs, ...src.plain, ...[...src.plain].map((p) => p * 60)]);
  const body = tidied
    .split('\n')
    .map((l) => l.replace(LABEL, ' ').replace(/\b1 set\b/gi, ' '))
    .join('\n');
  const out = numbersOf(body);
  const madeUp = [...out.plain].filter((n) => !src.plain.has(n) && !src.secs.has(n));
  const madeUpRest = [...out.secs].filter((s) => !allowedSecs.has(s));
  if (madeUp.length) problems.push(`It wrote ${madeUp.join(', ')}, which isn’t on the card.`);
  if (madeUpRest.length) problems.push(`It wrote a rest of ${madeUpRest.map((s) => `${s}s`).join(', ')}, which isn’t on the card.`);

  const read = numbersRead(w, rows);
  const dropped = [...new Set(percentsIn(source))].filter((p) => !read.has(p));
  if (dropped.length) problems.push(`It dropped ${dropped.map((p) => `${p}%`).join(', ')}.`);

  const card = expand(source);
  for (const r of rows) {
    const words = expand(r.name).split(/[^a-z]+/).filter((x) => x.length >= 3);
    if (words.length && !words.some((x) => card.includes(x))) problems.push(`“${r.name}” isn’t on the card.`);
  }
  return problems;
}
