import { fetchRecentTraining } from '@/data/lift-history-live';
import { PICKER_DB } from '@/domain/exercise-picker/data';
import { findGaps, gapAnswer, type GapReport } from '@/domain/coach/training-gaps';

export { isGapQuestion } from '@/domain/coach/training-gaps';

/**
 * WHAT NEEDS WORK — the live half of `Coach-Holt-Training-Gaps-v1.0`.
 *
 *   fetchGaps(weeks?)   → the athlete's own log, read for gaps. Never throws.
 *   gapReplyLive(weeks?) → the finished sentence Holt says, or `null` when he should not say one.
 *
 * ══ ⚠ THIS PATH NEVER CALLS A MODEL, AND THAT IS THE DESIGN ══
 *
 * The whole answer is arithmetic over rows the athlete already owns, so it costs nothing per question,
 * cannot be talked out of its safety rules by a cleverly worded message, and does not require the Premium
 * AI tier to work. TG-D4 (free or paid) is therefore still open and still cheap to decide — gating this
 * later is one condition at the call site in `CoachChatSheet`, not a rewrite.
 *
 * ⚠ THE READ IS `fetchRecentTraining`, THE SAME ONE `training-summary.ts` USES. `lift-history-live.ts` is
 * the ONE history read in this app and this does not become a second one.
 *
 * Fails soft in both directions, and the two failures are deliberately different: a broken read returns a
 * `tooEarly` report (Holt says he cannot tell yet, which is TRUE — he cannot), never an empty gap list
 * (which would say "nothing stands out", a confident claim built on no data). A value that is only ever
 * its default is worse than an absent one; this is that lesson applied to a network error.
 */
export async function fetchGaps(weeks = 8): Promise<GapReport> {
  try {
    const sessions = await fetchRecentTraining(weeks);
    return findGaps(sessions, PICKER_DB, { today: new Date().toISOString(), weeks });
  } catch {
    return { gaps: [], tooEarly: true, sessionsSeen: 0 };
  }
}

/** Holt's answer to "what do I need to work on?", ready to put on screen. */
export async function gapReplyLive(weeks = 8): Promise<string> {
  return gapAnswer(await fetchGaps(weeks));
}
