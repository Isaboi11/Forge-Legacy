/**
 * The countdown behind a timed set — a plank, a dead hang, a farmer carry.
 *
 * Pure (no React, no timers of its own) so the RULES are testable under `node --test`. The component
 * owns the `setInterval` and the sound; everything that decides what gets WRITTEN DOWN lives here.
 *
 * ══ WHY A HOLD NEEDS RULES AND A REST TIMER DOES NOT ══
 *
 * The rest timer counts down and then says so. Nothing is recorded either way — resting for eighty
 * seconds instead of ninety is not a fact about the athlete's training, it is a fact about their phone.
 *
 * A hold is the set. However long the clock ran IS what they did, and it goes into their history, so
 * every edge the rest timer can shrug off this one has to answer: stopping early, overshooting the
 * target by a tick of timer jitter, and the fat-thumbed start-then-immediately-stop that is not a set
 * at all.
 */

/**
 * A hold shorter than this is a MIS-TAP, not a set.
 *
 * Starting a timer and stopping it instantly is what happens when a thumb catches the button on the way
 * past, and recording "Plank — 0s" as a completed set puts a thing that did not happen into the
 * athlete's log. One second is comfortably below any real hold and comfortably above a double-tap.
 */
export const MIN_HOLD_SEC = 1;

/** Seconds left on the clock. Rounded UP, so a running timer shows "1s" until the second is spent. */
export function holdRemaining(endsAt: number | null, now: number): number {
  if (endsAt == null) return 0;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

/**
 * What to record when a hold ends, or null when it should be discarded.
 *
 * `elapsedMs` is measured from the START, never derived by subtracting the remaining seconds from the
 * target — those two disagree the moment the athlete extends the set, and the elapsed clock is the one
 * that watched them do it.
 *
 * ══ THE OVERSHOOT, AND WHY IT IS CLAMPED ══
 *
 * The ticker fires every 500ms, so a countdown that "finishes" is discovered between 0 and 500ms LATE.
 * Reporting the raw elapsed time would write 60s holds as 60 and 61 at random, and an athlete comparing
 * this week's plank to last week's would be reading timer jitter as progress. So a hold that RAN OUT
 * records the target exactly. A hold the athlete stopped records what the clock actually said, because
 * there the difference is theirs and not the interval's.
 */
export function holdResult(opts: {
  targetSec: number;
  elapsedMs: number;
  /** True when the countdown reached zero on its own; false when the athlete stopped it. */
  expired: boolean;
}): number | null {
  const { targetSec, elapsedMs, expired } = opts;
  if (expired) return Math.max(MIN_HOLD_SEC, Math.round(targetSec));
  const held = Math.round(elapsedMs / 1000);
  return held >= MIN_HOLD_SEC ? held : null;
}

/**
 * `1:30` / `0:45` — the big face on a running clock.
 *
 * Deliberately NOT `durText`'s "1m 30s". That vocabulary is for reading a prescription in a sentence;
 * this is a clock being watched, where the eye wants a fixed shape it can read without parsing. The two
 * appear together on the row — the ask in words, the countdown in digits — and telling them apart at a
 * glance is the point.
 */
export function clockText(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Fraction of the hold already spent, 0→1. Drives the ring; clamped so jitter can't overfill it. */
export function holdProgress(targetSec: number, remaining: number): number {
  if (!(targetSec > 0)) return 0;
  return Math.min(1, Math.max(0, (targetSec - remaining) / targetSec));
}
