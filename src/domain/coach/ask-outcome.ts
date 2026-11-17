/**
 * WHAT HOLT SAYS WHEN A TYPED ASK DOES NOT END IN AN ANSWER (AI audit 2026-11-16 — C-D1, C-D4, C-D5).
 *
 * Kept out of `CoachChatSheet.tsx` so the routing — which line for which state — is a pure function a test
 * can walk. The sheet decides WHEN; this decides WHAT.
 *
 * ══ OUT OF CREDITS IS THREE STATES, NOT ONE (C-D1) ══
 *
 * The chat used to answer every `out_of_credits` with `allowance_program` — the Free plan's "That's the one
 * block I write for free" — so a Premium AI customer at the monthly cap was told his free block was used.
 * The meter's reply actually says which state it is (`coach_ai_spend_credits`, 0144 / 0203):
 *
 *   · `allowance` 0 — Premium AI is not on for this account at all (0203 refuses with 0 / 0).
 *   · `remaining` 0 — this month's credits are used. They come back on the 1st of next month.
 *   · `remaining` > 0 — some are left, but this ask costs more (an online search, MA3-D16 weights).
 *
 * The month is the SERVER's (`coach_ai_balance().period`, a `date_trunc('month', now())` in UTC), read by
 * `fetchCoachAiBalance`; the device's UTC month stands in only when that read fails.
 *
 * ⚠ Domain code: relative imports only.
 */

import type { Turn } from './chat-core.ts';
import { pick, type Chooser } from './rulebook/voice.ts';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * The day the credits come back: the first of the month after `period` (`YYYY-MM-DD`, the server's month),
 * at UTC midnight. Without a readable period, the month after `now`'s UTC month.
 */
export function aiCreditsBackOn(period: string | null | undefined, now: Date = new Date()): Date {
  const m = /^(\d{4})-(\d{2})-\d{2}/.exec(period ?? '');
  const month = m ? Number(m[2]) - 1 : NaN;
  if (m && month >= 0 && month <= 11) return new Date(Date.UTC(Number(m[1]), month + 1, 1));
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/** "December 1". Read in UTC, because that is the clock the meter keeps. */
export function aiCreditsBackOnLabel(d: Date): string {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** How long the line waits on `fetchCoachAiBalance` for the server's month before using the device's. */
export const AI_BALANCE_LOOKUP_MS = 3_000;

/** What still works with no credits left. Taps build from the rulebook (`authorFallbackLine`), and logging never touched the meter. */
export const WITHOUT_AI_CREDITS = "Until then I'll still build from the taps, and your logging works as normal.";

/**
 * Holt's reply when the meter refused a typed ask (`out_of_credits` from coach-ask or coach-interpret).
 *
 * `web` — the ask was a tapped online search, which costs more than an ordinary question.
 * `period` — `fetchCoachAiBalance().period`, or null when that read failed.
 */
export function outOfAiCreditsLine(
  o: { remaining: number; allowance: number; web?: boolean; period?: string | null },
  now: Date = new Date(),
  choose?: Chooser,
): string {
  if (!(o.allowance > 0)) return `${pick('ai_not_on', choose)} Every tap in here still works.`;
  const back = aiCreditsBackOnLabel(aiCreditsBackOn(o.period, now));
  const left = Math.max(0, Math.floor(o.remaining));
  if (left === 0) return `${pick('out_of_ai_credits', choose)} They come back on ${back}. ${WITHOUT_AI_CREDITS}`;
  const credits = `You have ${left} Premium AI ${left === 1 ? 'credit' : 'credits'} left this month`;
  /* An online search is weighted above an ordinary question (MA3-D16) — so the question still fits. */
  if (o.web) return `${credits}, and an online search takes more than that. An ordinary question still fits, and they all come back on ${back}.`;
  return `${credits}, and that one takes more. They come back on ${back}. ${WITHOUT_AI_CREDITS}`;
}

/** The label on the chip under an outage card. The kitchen's retry chip says the same. */
export const ASK_RETRY_LABEL = 'Try again';

/**
 * The outage card (the one red thing in the chat — the app failing, never Holt deciding).
 *
 * ⚠ THE SUB-LINE SAYS WHAT HAPPENED (C-D5). It always read "The connection dropped before I finished",
 * including when nothing had started — a request that never got through, or a wait that ran out.
 *
 * `refunded` — coach-ask gave the credit back (AI Road to 10 Sprint 1, P-D2). The card then carries
 * `notCharged`, and the sheet says `NOT_CHARGED` ("Not charged.") under it — only when the SERVER said so,
 * never on a guess: an ask that died on the phone's side may well have been charged.
 */
export function askOfflineCard(o: { started: boolean; timedOut: boolean; refunded?: boolean }): {
  text: string;
  sub: string;
  action: string;
  notCharged?: true;
} {
  const action = 'Ask me again in a moment.';
  const charge = o.refunded === true ? { notCharged: true as const } : {};
  if (o.started) return { text: 'I lost the line partway through.', sub: 'The connection dropped before I finished.', action, ...charge };
  return {
    text: "I couldn't reach my notes just then.",
    sub: o.timedOut ? 'Nothing came back in time, so I stopped waiting.' : "Your question didn't get through.",
    action,
    ...charge,
  };
}

/**
 * Take back every word of one streamed reply — for a refusal, where what streamed before it is not an
 * answer (C-D4). `cutOffReply` (chat-core) is the gentler one, for a dropped line: it keeps a reply that
 * already says something.
 */
export const takeBackReply = (t: readonly Turn[], sid: number): Turn[] => t.filter((x) => !(x.kind === 'holt' && x.sid === sid));
