import { supabase } from '@/lib/supabase';
import { reviewNote, type WeeklyReviewData } from '@/domain/coach/rulebook/review';

/**
 * THE ATHLETE'S OWN WEEK (migration 0140).
 *
 * ══ LAZY, LIKE THE SQUAD RECAP IT COPIES ══
 *
 * There is no scheduler. `ensure_weekly_review()` writes the row the first time the athlete opens the
 * app in a new week and is a no-op thereafter — 0057's posture, and the reason this feature needs no
 * cron, no edge function and no infrastructure at all.
 *
 * ⚠ THE CONSEQUENCE IS THAT A PUSH CANNOT ANNOUNCE IT. By the time the row exists the athlete is
 * already in the app, so there is nothing to bring them back with. That is exactly why the PO asked for
 * a HOME CARD — *"the review should appear on the Home screen the next time they open it and the review
 * is ready"* — and the card is a better answer than a notification would have been: it needs no
 * permission, no token, and no scheduler.
 *
 * ══ THE TWO-STEP SENTENCE ══
 *
 * SQL snapshots the numbers; the client composes Holt's line once and writes it back. Voice lives in
 * one file (`rulebook/review.ts`) — generating prose in Postgres would put a second voice in the
 * database — and composing it on every read would let a stored summary re-word itself, which is not
 * what a snapshot means.
 */

export interface WeeklyReview {
  weekStart: string;
  weekEnd: string;
  data: WeeklyReviewData;
  /** Holt's line. Composed on first read and stored; never regenerated after that. */
  note: string | null;
}

const MISSING = 'PGRST202';

/**
 * The review for the week that just closed, generating it if this is the first look.
 *
 * ⚠ NULL IS THE COMMON, CORRECT ANSWER. A week with no workouts writes no row, because "0 sessions,
 * keep going" is the nudge-to-engage DNA §8/§10 forbids. The caller must render nothing, not an empty
 * state — an empty state is a claim about the week.
 *
 * Fails quietly on an unapplied migration: this is called on app open, and a modal about SQL is not
 * what somebody opening a training app needs.
 */
export async function fetchWeeklyReview(): Promise<WeeklyReview | null> {
  try {
    const { data, error } = await supabase.rpc('ensure_weekly_review');
    if (error) {
      if ((error as { code?: string }).code === MISSING) return null; // 0140 not applied yet
      return null;
    }
    if (!data) return null;

    const d = data as { week_start: string; week_end: string; review: WeeklyReviewData; note: string | null };
    const review: WeeklyReview = { weekStart: d.week_start, weekEnd: d.week_end, data: d.review, note: d.note };

    /* Compose once, then keep. `set_weekly_review_note` only accepts a note while one is absent, so a
       race between two devices settles on whichever landed first rather than fighting over wording. */
    if (!review.note) {
      const note = reviewNote(d.review);
      review.note = note;
      void supabase.rpc('set_weekly_review_note', { p_week_start: d.week_start, p_note: note }).then(
        () => {},
        () => {}, // best-effort: the athlete reads the line either way, it just gets composed again
      );
    }
    return review;
  } catch {
    return null;
  }
}
