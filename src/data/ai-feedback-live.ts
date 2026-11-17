import { supabase } from '@/lib/supabase';
import { isAiRef, type AiFeedbackFeature, type AiRating } from '@/domain/ai/ai-feedback-core';

/**
 * "Was this helpful?" — the write (migration 0269, `ai_feedback`).
 *
 * An UPSERT on (athlete, feature, ref): the first tap adds the vote, a tap on the other control changes it. The
 * athlete is never sent — `athlete_id` defaults to `auth.uid()` and the column grants keep it out of the client's
 * hands — and RLS lets an athlete read, add and change only their own rows. Nothing here goes to Anthropic, so no
 * AI-sharing consent is asked: this is the app's own table.
 *
 * Returns whether it saved. Never throws: the control shows a failed vote as a quiet line and a way to tap again.
 */
export async function rateAiOutput(v: {
  feature: AiFeedbackFeature;
  ref: string;
  rating: AiRating;
  model?: string | null;
  note?: string | null;
}): Promise<boolean> {
  if (!isAiRef(v.ref)) return false;
  try {
    const { error } = await supabase.from('ai_feedback').upsert(
      {
        feature: v.feature,
        ref: v.ref,
        rating: v.rating,
        model: v.model ? v.model.slice(0, 64) : null,
        note: v.note ? v.note.trim().slice(0, 280) || null : null,
      },
      { onConflict: 'athlete_id,feature,ref' },
    );
    return !error;
  } catch {
    return false;
  }
}
