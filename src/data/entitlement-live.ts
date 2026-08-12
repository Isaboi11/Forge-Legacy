import { supabase } from '@/lib/supabase';
import type { Caps, Tier, Usage } from '@/domain/entitlement/caps-core';

/**
 * The entitlement read (migration 0145).
 *
 * ONE RPC, not seven. `my_entitlement()` returns the tier, the caps that apply to it, and every current
 * usage figure in a single round trip — because the alternative is seven independent loading states on a
 * screen that has to decide, before it draws anything, whether a button exists at all.
 *
 * ══ ⚠ THIS IS NOT A SECURITY BOUNDARY ══
 *
 * Same rule `admin-live.ts` states about `isAppAdmin()`: this decides what the SCREEN draws. The database
 * decides what the database accepts — `programs_cap_guard()` in 0145 refuses an over-cap insert whatever
 * the client believes. If this file were deleted and the inserts issued by hand, the caps would still
 * hold.
 *
 * ══ ⚠ "NOT APPLIED YET" IS A REAL STATE THAT LASTS HOURS ══
 *
 * There is no Supabase CLI and no service key here; migrations are pasted into the dashboard by hand. So
 * code that calls `my_entitlement()` can ship before 0145 exists, and `PGRST202` is the answer PostgREST
 * gives for an unknown function.
 *
 * **That case resolves to `null`, which every gate reads as `unknown`** — and `unknown` blocks the action
 * and shows a retry rather than firing M-7 (M-7 §10). It deliberately does NOT fall back to "entitled":
 * an app that treats a missing entitlement system as a free pass is an app with no entitlement system.
 */

export interface EntitlementSnapshot {
  tier: Tier;
  premiumKind: 'MONTHLY' | 'ANNUAL' | 'LIFETIME' | 'FOUNDER' | 'GRANT' | null;
  premiumUntil: string | null;
  /** Concurrent with Premium, never implied by it (MA3-D3). */
  coachAi: boolean;
  /** 1–100 while seats remain. Null for a grant — the OG testers occupy none (MA3-D25). */
  founderSeat: number | null;
  caps: Caps;
  usage: Usage;
}

const MISSING = new Set(['PGRST202', 'PGRST205', '42883', '42P01']);
const isMissing = (e: unknown): boolean => MISSING.has((e as { code?: string } | null)?.code ?? '');

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Read the caller's entitlement.
 *
 * Returns `null` when it cannot be established — not applied, signed out, offline, or any other failure.
 * ⚠ `null` is a distinct third state and callers must treat it as such. See the header.
 */
export async function fetchEntitlement(): Promise<EntitlementSnapshot | null> {
  const { data, error } = await supabase.rpc('my_entitlement');
  if (error) {
    if (isMissing(error)) return null;
    // A real failure — offline, 5xx, an auth lapse. Also `null`, and for the same reason: an
    // unverifiable subscription must never resolve to a confident answer in either direction.
    return null;
  }
  if (!data || typeof data !== 'object') return null;

  const d = data as Record<string, unknown>;
  const rawCaps = (d.caps ?? {}) as Record<string, unknown>;
  const rawUsage = (d.usage ?? {}) as Record<string, unknown>;

  return {
    // Anything that is not literally 'PREMIUM' is Free. A typo in the column must not grant a tier.
    tier: d.tier === 'PREMIUM' ? 'PREMIUM' : 'FREE',
    premiumKind: (d.premiumKind as EntitlementSnapshot['premiumKind']) ?? null,
    premiumUntil: (d.premiumUntil as string) ?? null,
    coachAi: d.coachAi === true,
    founderSeat: d.founderSeat == null ? null : num(d.founderSeat),
    caps: {
      programs: num(rawCaps.programs),
      photos: num(rawCaps.photos),
      videos: num(rawCaps.videos),
      squads: num(rawCaps.squads),
      templates: num(rawCaps.templates),
      imports: num(rawCaps.imports),
      holt_programs: num(rawCaps.holt_programs),
      holt_days_per_month: num(rawCaps.holt_days_per_month),
      holt_in_workout: num(rawCaps.holt_in_workout),
    },
    usage: {
      programs: num(rawUsage.programs),
      photos: num(rawUsage.photos),
      videos: num(rawUsage.videos),
      squads: num(rawUsage.squads),
      templates: num(rawUsage.templates),
      imports: num(rawUsage.imports),
      holtPrograms: num(rawUsage.holtPrograms),
      holtDays: num(rawUsage.holtDays),
    },
  };
}

/**
 * Consume one Coach Holt allowance, atomically, server-side.
 *
 * ⚠ CALLED BEFORE GENERATION, NEVER AFTER. An athlete who is out must be told before they answer six
 * questions about their goal and their equipment.
 *
 * The client checks the gate first and shows M-7; this is the authoritative decrement and the backstop
 * against two devices spending the same last allowance. Returns `null` when the RPC is unavailable —
 * which the caller must treat as `unknown`, not as permission.
 */
export async function consumeHoltAllowance(
  kind: 'program' | 'day',
): Promise<{ allowed: boolean; used: number; allowance: number } | null> {
  const { data, error } = await supabase.rpc('consume_holt_allowance', { p_kind: kind });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  return { allowed: r.allowed === true, used: num(r.used), allowance: num(r.allowance) };
}

/**
 * Mark the one free lifetime import as spent.
 *
 * ⚠ CALL THIS ON W-IM-4 CONFIRMATION AND NOWHERE ELSE (Amendment 001 §8). A parse error, a bad file, or
 * an abandoned flow at any earlier step leaves the athlete their free import — a migration that failed is
 * not a migration that happened.
 *
 * Returns true when this call was the one that consumed it; false if it was already spent.
 */
export async function markFreeImportUsed(): Promise<boolean> {
  const { data, error } = await supabase.rpc('mark_free_import_used');
  if (error) return false;
  return data === true;
}

/** How many Founder seats are left. Null when it cannot be read — P8W-D5 hides the row rather than guess. */
export async function fetchFounderSeatsRemaining(): Promise<number | null> {
  const { data, error } = await supabase.rpc('founder_seats_remaining');
  if (error) return null;
  const n = Number(data);
  return Number.isFinite(n) ? n : null;
}
