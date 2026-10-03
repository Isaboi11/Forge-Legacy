/**
 * The hand-off between a fresh "Build as you go" workout and the picker it opens straight onto.
 *
 * Backing out of that picker with nothing chosen means "not this after all": the empty session is
 * discarded and the athlete goes back to the card they tapped. That used to be TWO dismissals — the
 * picker closed, then the workout noticed on focus and closed itself while the first was still
 * animating — and on iPhone the second could be dropped, leaving a black screen (Kim, 10-03).
 *
 * So the workout registers its discard here when it opens the picker, and the picker runs it and closes
 * both screens as one `dismiss(2)`. One slot, taken once: a picker opened later mid-session finds it
 * empty and just goes back.
 */
let pending: (() => void) | null = null;

/** Arm the discard. Returns a disarm, for when the workout drains the return the other way. */
export function setFreestyleAbandon(fn: () => void): () => void {
  pending = fn;
  return () => {
    if (pending === fn) pending = null;
  };
}

/** Run the armed discard, if any. True = the caller should close the workout too. */
export function abandonFreestyle(): boolean {
  const fn = pending;
  pending = null;
  if (!fn) return false;
  fn();
  return true;
}
