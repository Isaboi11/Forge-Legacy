/**
 * The tested maxes a percentage-based program loads from (0111).
 *
 * TWO STORES, answering two different questions, and the distinction is the whole feature:
 *
 *   `athlete_lift_maxes`   what the athlete currently believes they can lift. Moves as they get
 *                          stronger. Pre-fills the entry gate.
 *   `programs.lift_maxes`  what ONE RUN of a program was built from. Frozen at the gate, changed only
 *                          by an explicit act, and never by a PR landing mid-block.
 *
 * See `Docs/Percent-Of-Max-Loading-Architecture-v1.0.md` §4.2 for why the second exists.
 */

import { supabase } from '@/lib/supabase';
import type { LiftMax, LiftMaxes, MaxSource } from '@/domain/program/percent-max';

type MaxRow = {
  catalog_key: string;
  weight_lb: number | string;
  source: string;
  tested_at: string | null;
};

const asSource = (v: string | null): MaxSource =>
  v === 'estimated' || v === 'tested' ? v : 'entered';

/** Postgres `numeric` arrives as a string over the wire; a silent NaN here would erase the max. */
const asLb = (v: number | string): number => (typeof v === 'number' ? v : Number(v));

/** The athlete's current maxes, keyed by catalog id. Empty when signed out or none are set. */
export async function fetchMyLiftMaxes(): Promise<LiftMaxes> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from('athlete_lift_maxes')
    .select('catalog_key, weight_lb, source, tested_at')
    .eq('athlete_id', user.id);
  if (error) throw error;

  const out: LiftMaxes = {};
  for (const r of (data ?? []) as MaxRow[]) {
    const lb = asLb(r.weight_lb);
    if (!Number.isFinite(lb) || lb <= 0) continue;
    out[r.catalog_key] = { lb, source: asSource(r.source), setAt: r.tested_at };
  }
  return out;
}

/**
 * Record what the athlete can lift, now.
 *
 * `tested_at` is written ONLY for a real tested single. An entered or estimated figure leaves it null,
 * because we do not know when they hit it and stamping today's date would be a specific false claim
 * about a day's training that never happened.
 */
export async function saveMyLiftMax(
  catalogKey: string,
  weightLb: number,
  source: MaxSource,
  testedAt: string | null = null,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');
  if (!Number.isFinite(weightLb) || weightLb <= 0) throw new Error('A max has to be a real weight.');

  const { error } = await supabase.from('athlete_lift_maxes').upsert(
    {
      athlete_id: user.id,
      catalog_key: catalogKey,
      weight_lb: weightLb,
      source,
      tested_at: source === 'tested' ? (testedAt ?? new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'athlete_id,catalog_key' },
  );
  if (error) throw error;
}

/**
 * Write the maxes a program run resolves against.
 *
 * MERGES rather than replaces, so answering one lift's max does not wipe another's — the entry gate can
 * be answered a row at a time, and the change-max flow touches one lift without disturbing the rest.
 *
 * The read-then-write is not atomic. That is acceptable here and nowhere near the `start_program` class
 * of problem: the loser of a race writes a max the athlete themselves just typed on one of their own
 * devices, and the remedy is to type it again. Making it atomic would want an RPC, which is more
 * machinery than a two-device max-entry collision deserves.
 */
export async function setProgramLiftMaxes(programId: string, patch: LiftMaxes): Promise<LiftMaxes> {
  const { data: existing, error: fe } = await supabase
    .from('programs')
    .select('lift_maxes')
    .eq('id', programId)
    .single();
  if (fe) throw fe;

  const merged: LiftMaxes = { ...((existing?.lift_maxes as LiftMaxes | null) ?? {}), ...patch };

  const { error } = await supabase
    .from('programs')
    .update({ lift_maxes: merged, updated_at: new Date().toISOString() })
    .eq('id', programId);
  if (error) throw error;
  return merged;
}

/** One lift's max on one program run — the change-max flow's write. */
export async function setProgramLiftMax(
  programId: string,
  catalogKey: string,
  max: LiftMax,
): Promise<LiftMaxes> {
  return setProgramLiftMaxes(programId, { [catalogKey]: max });
}
