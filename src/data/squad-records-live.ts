import { supabase } from '@/lib/supabase';

/**
 * Squad Records (C-6) — the squad's record book (migration 0058).
 *
 * Each record is a list of REIGNS in descending value: the head is the current holder, the tail is the
 * lineage. That ordering is the data model, not a display choice — "these marks only ever rise", so the
 * highest number IS the standing record and everything under it is history.
 *
 * History accrues FROM 0058 FORWARD. Nobody ever wrote down who held a mark before today, and it can't
 * be reconstructed from raw workouts — those tell you who is best now, not who led in March. A squad
 * that has just opened its book shows a current holder and an empty lineage, and that is the truth.
 *
 * The design's sixth record, Longest Streak, is absent: nothing in the product tracks streaks, and
 * inventing one for a single card would put a number on screen no other surface could corroborate.
 */

export type SquadRecordKind = 'heaviest_lift' | 'biggest_session' | 'most_workouts_month' | 'longest_run' | 'most_prs_month';

export interface SquadRecordReign {
  holderId: string;
  holderName: string;
  holderAvatar: string | null;
  value: number;
  detail: string | null;
  achievedOn: string | null;
  recordedAt: string;
}

export interface SquadRecord {
  kind: SquadRecordKind;
  /** Descending by value — [0] is the current holder, the rest are previous holders. */
  reigns: SquadRecordReign[];
}

/** Label and unit per record, so the list, the sheet and any future share card can't disagree. */
export const RECORD_META: Record<SquadRecordKind, { label: string; unit: string }> = {
  heaviest_lift: { label: 'Heaviest Lift', unit: 'lb' },
  biggest_session: { label: 'Biggest Single Session', unit: 'lb volume' },
  most_workouts_month: { label: 'Most Workouts / Month', unit: 'in a month' },
  longest_run: { label: 'Longest Run', unit: 'miles' },
  most_prs_month: { label: 'Most PRs / Month', unit: 'in a month' },
};

/** A mark taken in the last 30 days still reads as news — the design's `isNew` treatment. */
const NEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const isNewRecord = (r: SquadRecord): boolean => {
  const top = r.reigns[0];
  if (!top || r.reigns.length < 2) return false; // a first-ever mark isn't "broken", it's the start
  const ms = Date.now() - new Date(top.recordedAt).getTime();
  return Number.isFinite(ms) && ms >= 0 && ms < NEW_WINDOW_MS;
};

/** Thousands separators; up to one decimal, and never a trailing ".0". 31200 → "31,200". */
export function formatRecordValue(kind: SquadRecordKind, value: number): string {
  const n = kind === 'longest_run' ? Number(value.toFixed(1)) : Math.round(value);
  return n.toLocaleString('en-US');
}

interface ReignRow {
  holder_id: string;
  holder_name: string;
  holder_avatar: string | null;
  value: number | string;
  detail: string | null;
  achieved_on: string | null;
  recorded_at: string;
}
interface RecordRow {
  kind: string;
  reigns: ReignRow[] | null;
}

const KINDS: SquadRecordKind[] = ['heaviest_lift', 'biggest_session', 'most_workouts_month', 'longest_run', 'most_prs_month'];
const asKind = (v: string): SquadRecordKind | null => ((KINDS as string[]).includes(v) ? (v as SquadRecordKind) : null);

/**
 * Bring the book up to date, then read it. Refresh is lazy — there is no scheduler, so opening the
 * book is what notices a mark has been beaten and writes the new reign. Silent on failure: a stale
 * book is better than no book.
 */
export async function fetchSquadRecords(squadId: string): Promise<SquadRecord[]> {
  await supabase.rpc('refresh_squad_records', { p_squad: squadId });

  const { data, error } = await supabase.rpc('squad_records_book', { p_squad: squadId });
  if (error) {
    if ((error as { code?: string }).code === 'PGRST202') throw new Error('Squad Records aren’t available yet — migration 0058 hasn’t been applied.');
    throw error;
  }

  const out: SquadRecord[] = [];
  for (const r of (data ?? []) as RecordRow[]) {
    const kind = asKind(r.kind);
    if (!kind || !r.reigns?.length) continue;
    out.push({
      kind,
      reigns: r.reigns.map((x) => ({
        holderId: x.holder_id,
        holderName: x.holder_name,
        holderAvatar: x.holder_avatar ?? null,
        value: Number(x.value),
        detail: x.detail ?? null,
        achievedOn: x.achieved_on ?? null,
        recordedAt: x.recorded_at,
      })),
    });
  }
  return out;
}
