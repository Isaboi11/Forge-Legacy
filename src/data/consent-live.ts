import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { sanitizeConsentRows, type ConsentAction, type ConsentKind, type ConsentRecord } from '@/domain/consent/consent';

/**
 * `health_consents` (0224) — the athlete's own consent answers, append-only.
 *
 * ⚠ CLIENT-FIRST SAFE. Until 0224 is pasted the table does not exist: PostgREST answers `PGRST205` (or
 * `42P01`). Neither function throws for that or for anything else — `fetchConsents` answers null ("could
 * not read", which the gate treats as NOT YET CONSENTED and asks), and `recordConsent` answers false (the
 * answer is then honoured for this session only). A missing table can never crash a screen or let an AI
 * call through.
 */

export async function fetchConsents(): Promise<ConsentRecord[] | null> {
  try {
    const { data: auth } = await supabase.auth.getSession();
    const uid = auth.session?.user?.id;
    if (!uid) return null;
    const { data, error } = await supabase
      .from('health_consents')
      .select('kind, action, policy_version, created_at')
      .eq('athlete_id', uid)
      .order('created_at', { ascending: true })
      .limit(500);
    if (error || !data) return null;
    return sanitizeConsentRows(data);
  } catch {
    return null;
  }
}

/** One answer. `athlete_id` and `created_at` are the server's (column defaults) — the client cannot set them. */
export async function recordConsent(kind: ConsentKind, action: ConsentAction, policyVersion: string): Promise<boolean> {
  try {
    const platform = Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web' ? Platform.OS : null;
    const { error } = await supabase
      .from('health_consents')
      .insert({ kind, action, policy_version: policyVersion, platform });
    return !error;
  } catch {
    return false;
  }
}
