import { supabase } from '@/lib/supabase';

/**
 * Body-metrics data (P-2 · Slice C) — weigh-ins + optional measurements from `body_entries` (0028).
 * Weight is canonical pounds; measurements are inches. Read ascending by date so the chart runs oldest →
 * newest. Insert/delete only (no edit — matches the "quiet record" intent; a real `logged_on` date fixes
 * the .dc's always-"Now").
 */

export interface BodyEntry {
  id: string;
  loggedOn: string; // YYYY-MM-DD
  weightLb: number;
  waist: number | null; // inches
  chest: number | null;
  arm: number | null;
}

interface Row {
  id: string;
  logged_on: string;
  weight_lb: number;
  waist_in: number | null;
  chest_in: number | null;
  arm_in: number | null;
}

export async function fetchBodyEntries(): Promise<BodyEntry[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('body_entries')
    .select('id, logged_on, weight_lb, waist_in, chest_in, arm_in')
    .eq('athlete_id', user.id)
    .order('logged_on', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) return []; // degrade gracefully pre-migration
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    loggedOn: r.logged_on,
    weightLb: Number(r.weight_lb),
    waist: r.waist_in != null ? Number(r.waist_in) : null,
    chest: r.chest_in != null ? Number(r.chest_in) : null,
    arm: r.arm_in != null ? Number(r.arm_in) : null,
  }));
}

export async function addBodyEntry(e: { weightLb: number; waist?: number | null; chest?: number | null; arm?: number | null }): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not signed in');
  const { error } = await supabase.from('body_entries').insert({
    athlete_id: user.id,
    weight_lb: e.weightLb,
    waist_in: e.waist ?? null,
    chest_in: e.chest ?? null,
    arm_in: e.arm ?? null,
  });
  if (error) throw error;
}

export async function removeBodyEntry(id: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not signed in');
  const { error } = await supabase.from('body_entries').delete().eq('id', id).eq('athlete_id', user.id);
  if (error) throw error;
}
