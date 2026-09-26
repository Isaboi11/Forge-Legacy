/**
 * A question for Holt, started on another screen and finished in his chat.
 *
 * Form Check's "Ask Holt about this" (`Coach Holt Form Check.dc.html` 04) sets it, then opens the chat
 * with the `ask` intent; `CoachChatSheet` takes it once and puts it in the composer UNSENT. Module state
 * rather than a route param because the chat is a sheet over whatever Home surface is showing, not a
 * route — the same reason `program-intent.ts` exists.
 */
let seed: string | null = null;

export function setCoachAskSeed(text: string): void {
  seed = text.trim() || null;
}

/** Returns the seed and clears it, so reopening the chat later does not refill the composer. */
export function takeCoachAskSeed(): string | null {
  const s = seed;
  seed = null;
  return s;
}
