/**
 * Forge Legacy — `revenuecat-webhook`: the ONLY way an App Store purchase reaches our database.
 *
 * RevenueCat → Project settings → Integrations → Webhooks posts every subscription event here (purchase,
 * trial start, renewal, cancellation, expiration, refund, transfer). This function checks the shared
 * secret and hands the event to `apply_store_event()` (migration 0214), which does all the work in one
 * transaction: records the event, updates `store_subscriptions`, re-derives `athlete_entitlement`, and
 * claims or releases an Early Bird seat.
 *
 * ══ ⚠ DEPLOY WITH "VERIFY JWT" OFF ══
 *
 * RevenueCat does not send a Supabase JWT, so the platform's JWT check would refuse every delivery with a
 * 401 before this code runs. The shared secret below is the authentication instead.
 *
 * ══ THE SECRET ══
 *
 * `REVENUECAT_WEBHOOK_AUTH` (Supabase → Edge Functions → Secrets) must equal, character for character,
 * the "Authorization header value" typed into the RevenueCat webhook. Unset = every call refused: an
 * unauthenticated endpoint that writes entitlement would let anyone grant themselves Premium.
 *
 * ══ STATUS CODES ARE INSTRUCTIONS TO REVENUECAT ══
 *
 *   200 — applied, a duplicate, or an event we deliberately ignore. Do not retry.
 *   401 — wrong secret. RevenueCat retries, which is right: fixing the secret should heal the backlog.
 *   500 — the database failed. RevenueCat retries with backoff, and `store_events` makes the retry safe.
 *
 * No CORS block: this is called server-to-server, never from a browser.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_AUTH = Deno.env.get('REVENUECAT_WEBHOOK_AUTH')?.trim() ?? '';

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Constant-time compare, so the secret cannot be guessed a character at a time from response timing. */
function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });

  if (!WEBHOOK_AUTH) {
    console.error('REVENUECAT_WEBHOOK_AUTH is not set — refusing every delivery until it is.');
    return json(401, { error: 'not configured' });
  }
  const given = (req.headers.get('authorization') ?? '').trim();
  // RevenueCat sends the value exactly as typed; accept it with or without a "Bearer " prefix.
  if (!sameSecret(given, WEBHOOK_AUTH) && !sameSecret(given, `Bearer ${WEBHOOK_AUTH}`)) {
    return json(401, { error: 'unauthorized' });
  }

  let event: Record<string, unknown> | null = null;
  try {
    const body = await req.json();
    event = body && typeof body === 'object' ? ((body as { event?: Record<string, unknown> }).event ?? null) : null;
  } catch {
    return json(400, { error: 'not JSON' });
  }
  if (!event || typeof event.id !== 'string') return json(400, { error: 'no event' });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc('apply_store_event', { p_event: event });

  if (error) {
    console.error(`apply_store_event failed for ${event.type} ${event.id}: ${error.message}`);
    return json(500, { error: 'database' });
  }

  console.log(`${event.type} ${event.product_id ?? '-'} ${event.environment ?? '-'} → ${data}`);
  return json(200, { outcome: data });
});
