/**
 * What Holt Remembers (`/holt-memory`) — the screen's pure rules (AI Road to 10 Sprint 4b §1.3, §1.4). The screen draws;
 * this decides: how kept facts are grouped by kind, which are marked "New · from a chat on <date>", when the list is
 * full, and the words for the switch and the one-line "Holt kept N things" nudge. Import-clean for `node --test`.
 */

import { FACT_KINDS, type FactKind } from './holt-memory.ts';

/** A note as the screen has it (`HoltNote` from holt-notes.ts, structurally). */
export interface ScreenNote {
  id: string;
  text: string;
  createdAt: string;
  source: string | null;
  kind: string | null;
}

/** The heading each kind is listed under, in FACT_KINDS order. A note with no kind (kept before 0278) is "Other". */
export const KIND_HEADINGS: Record<FactKind, string> = {
  schedule: 'When you train',
  gym: 'Where you train',
  like: 'What you like',
  dislike: 'What you don’t',
  avoid: 'What to avoid',
  goal: 'Your goals',
  other: 'Other things',
};

export const kindOf = (n: Pick<ScreenNote, 'kind'>): FactKind => ((FACT_KINDS as readonly string[]).includes(n.kind ?? '') ? (n.kind as FactKind) : 'other');

/** The notes grouped by kind, in FACT_KINDS order, empty groups left out; each group keeps the notes' own order. */
export function groupNotes<N extends ScreenNote>(notes: readonly N[]): { kind: FactKind; heading: string; notes: N[] }[] {
  return FACT_KINDS.map((kind) => ({ kind, heading: KIND_HEADINGS[kind], notes: notes.filter((n) => kindOf(n) === kind) })).filter((g) => g.notes.length > 0);
}

/**
 * How a note says where it came from: a fact kept from a chat (`source: 'chat'`) reads "From a chat on Nov 18", and
 * "New · from a chat on Nov 18" when it was kept after the athlete last looked at this screen (`seenAt`, ISO, or null
 * for never). Anything else (a note the athlete confirmed on a card, one from the builder) has no line.
 */
export function noteOrigin(n: Pick<ScreenNote, 'source' | 'createdAt'>, seenAt: string | null, dateText: (iso: string) => string): { isNew: boolean; line: string } | null {
  if (n.source !== 'chat') return null;
  const when = dateText(n.createdAt);
  const isNew = !seenAt || Date.parse(n.createdAt) > Date.parse(seenAt);
  return { isNew, line: isNew ? `New · from a chat on ${when}` : `From a chat on ${when}` };
}

/** At the cap (0204's 20), Holt cannot keep anything new until one goes. */
export const isFull = (count: number, cap: number): boolean => count >= cap;
export const FULL_LINE = 'Full — delete one to let Holt keep new things.';

/** The one line on the next sheet open after a chat kept facts. */
export const keptLine = (n: number): string => `Holt kept ${n} ${n === 1 ? 'thing' : 'things'} from your last chat`;

/** The switch's words — honest about both halves (§1.4): what off stops, and that what is kept stays until deleted. */
export const SWITCH_COPY = {
  label: 'Holt remembers',
  on: 'Holt keeps the facts you tell him and a short note of each chat, and reads them back when they help.',
  off: 'Off: Holt keeps nothing new and reads nothing old. What he already kept stays here until you delete it.',
} as const;

export const FORGET_COPY = {
  row: 'Forget everything',
  headline: 'Forget everything?',
  body: 'Holt deletes every fact he kept, every chat note and every past chat. This can’t be undone.',
  confirm: 'Forget everything',
  done: 'Holt has forgotten everything.',
  failed: 'Some of that didn’t delete. Try again.',
} as const;
