import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { FeedbackKind } from '@/domain/feedback/content';

/**
 * The write path for in-app feedback (migration 0167).
 *
 * One function. A plain `insert` rather than an RPC, because RLS already says exactly the right thing
 * — `feedback_insert_own` requires `user_id = auth.uid()` — and a definer function would only be a
 * second place for that rule to drift from the first.
 *
 * ══ WHY THIS DOES NOT SWALLOW ERRORS ══
 *
 * `src/lib/analytics.ts` degrades silently by design: a dropped analytics event costs a row in a chart.
 * This is the opposite case. A support form that reports success and loses the message is the single
 * worst failure it can have — the athlete believes they have been heard, waits, and hears nothing. So
 * every failure here is thrown and the screen says so out loud.
 */

const APP_VERSION = Constants.expoConfig?.version ?? null;
const PLATFORM: string | null =
  Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : Platform.OS === 'web' ? 'web' : null;

export type SubmitFeedbackInput = {
  kind: FeedbackKind;
  body: string;
  /** The route the athlete came from, so a bug report names a screen. Null when we could not read it. */
  screen?: string | null;
  contactOk: boolean;
};

/**
 * Files one row. Throws on any failure, including the rate limit (`P0001`) — `feedbackSendError()` in
 * `domain/feedback/content.ts` is what turns those into a sentence.
 *
 * ⚠ `user_id` is set from the live session rather than passed in. It has to satisfy
 *   `with check (user_id = auth.uid())`, so taking it from a caller could only ever produce a policy
 *   violation that reads like a mysterious permission error.
 */
export async function submitFeedback(input: SubmitFeedbackInput): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error('You need to be signed in to send feedback.');

  // Trimmed here as well as validated in the domain, because `length(btrim(body)) between 1 and 2000`
  // is what the column actually enforces — sending the untrimmed string would let a padded body fail
  // server-side after passing client-side.
  const { error } = await supabase.from('feedback').insert({
    user_id: userId,
    kind: input.kind,
    body: input.body.trim(),
    screen: input.screen ?? null,
    app_version: APP_VERSION,
    platform: PLATFORM,
    contact_ok: input.contactOk,
  });

  if (error) throw error;
}
