import { supabase } from '@/lib/supabase';
import { CHALLENGE_TYPES, formatScore, metricLabel, type ChallengeContext, type ChallengeType } from './challenges-live';

/**
 * Trophy Case — one athlete's competitive legacy (migration 0084).
 *
 * The personal counterpart to the squad's Hall of Champions: every championship and podium finish this
 * athlete has earned, across every squad they compete in.
 *
 * `withheld > 0` means the viewer is cleared for this athlete's record but not for some of the
 * competitions in it. The totals are still true; the detail behind those finishes is not theirs to read.
 */

export type TrophyTier = 'gold' | 'silver' | 'bronze';

export interface TrophyFinish {
  challengeId: string;
  name: string;
  type: ChallengeType;
  metricKey: string | null;
  context: ChallengeContext;
  squadName: string | null;
  endAt: string;
  place: number;
  score: number;
  isWinner: boolean;
  field: number;
  /** > 1 when the title was shared (CS-D15) — the tile says Co-Champion, not Champion. */
  coWinners: number;
  /** Gap to the next place down. Null when nobody finished below them. */
  margin: number | null;
}

export interface TrophyCase {
  athleteId: string;
  name: string;
  handle: string | null;
  initials: string | null;
  avatarUrl: string | null;
  isSelf: boolean;
  entered: number;
  /** True per-tier totals — counted server-side so the tally can never disagree with the career grid. */
  championships: number;
  silvers: number;
  bronzes: number;
  podiums: number;
  /** Podium finishes the viewer isn't cleared to see. Always 0 for the owner. */
  withheld: number;
  titleStreak: number;
  bestType: ChallengeType | null;
  firstYear: number | null;
  lastYear: number | null;
  finishes: TrophyFinish[];
}

const TYPES = Object.keys(CHALLENGE_TYPES) as ChallengeType[];
const asType = (v: string): ChallengeType => ((TYPES as string[]).includes(v) ? (v as ChallengeType) : 'MOST_WORKOUTS');
const asContext = (v: string): ChallengeContext => (v === 'FRIENDS' || v === 'COMMUNITY' ? v : 'SQUAD');

/** Gold for a title, silver for 2nd, bronze for 3rd. Nothing below 3rd reaches this screen. */
export function tierOf(f: TrophyFinish): TrophyTier {
  if (f.isWinner) return 'gold';
  return f.place === 2 ? 'silver' : 'bronze';
}

/**
 * Everything the Trophy Case renders, in one read. Advances due lifecycle transitions first — there is
 * no scheduler, so a season that ended this morning becomes a trophy the moment someone opens a screen
 * that would show it.
 */
export async function fetchTrophyCase(athleteId?: string | null): Promise<TrophyCase | null> {
  await supabase.rpc('advance_challenges', { p_squad: null });

  const { data, error } = await supabase.rpc('athlete_trophy_case', { p_athlete: athleteId ?? null });
  if (error) {
    if ((error as { code?: string }).code === 'PGRST202') {
      throw new Error('The Trophy Case isn’t available yet — migration 0084 hasn’t been applied.');
    }
    throw error;
  }
  if (!data) return null;
  const d = data as Record<string, unknown>;

  return {
    athleteId: String(d.athlete_id),
    name: String(d.name ?? 'Athlete'),
    handle: (d.handle as string) ?? null,
    initials: (d.initials as string) ?? null,
    avatarUrl: (d.avatar_url as string) ?? null,
    isSelf: !!d.is_self,
    entered: Number(d.entered ?? 0),
    championships: Number(d.championships ?? 0),
    silvers: Number(d.silvers ?? 0),
    bronzes: Number(d.bronzes ?? 0),
    podiums: Number(d.podiums ?? 0),
    withheld: Number(d.withheld ?? 0),
    titleStreak: Number(d.title_streak ?? 0),
    bestType: d.best_type ? asType(String(d.best_type)) : null,
    firstYear: d.first_year == null ? null : Number(d.first_year),
    lastYear: d.last_year == null ? null : Number(d.last_year),
    finishes: ((d.finishes ?? []) as Record<string, unknown>[]).map((r) => ({
      challengeId: String(r.challenge_id),
      name: String(r.name),
      type: asType(String(r.type)),
      metricKey: (r.metric_key as string) ?? null,
      context: asContext(String(r.context)),
      squadName: (r.squad_name as string) ?? null,
      endAt: String(r.end_at),
      place: Number(r.place ?? 1),
      score: Number(r.score ?? 0),
      isWinner: !!r.is_winner,
      field: Number(r.field ?? 0),
      coWinners: Number(r.co_winners ?? 1),
      margin: r.margin == null ? null : Number(r.margin),
    })),
  };
}

/**
 * Championship tiles are half a phone wide and carry score, margin and unit on one line, so a six-figure
 * volume is abbreviated the way the design writes it: 86,400 lb → 86.4k lb. Small numbers are never
 * abbreviated — "5.0k reps" would be a worse read than "5,000 reps", and durations and lifts stay exact.
 */
export function compactScore(type: ChallengeType, score: number): string {
  if (Math.abs(score) >= 10000) {
    const k = score / 1000;
    return `${k >= 100 ? Math.round(k) : Number(k.toFixed(1))}k`;
  }
  return formatScore(type, score);
}

/** "86.4k lb", "9 PRs" — the finish's own score with its unit. */
export function scoreLine(f: TrophyFinish): string {
  return `${compactScore(f.type, f.score)} ${CHALLENGE_TYPES[f.type].unit}`;
}

/**
 * The champion's winning margin, or null when there is nothing honest to say.
 *
 * Absent for a shared title — a co-champion did not win by anything over the athlete they tied with, and
 * printing a margin over 3rd place would read as a gap they opened alone.
 */
export function marginLine(f: TrophyFinish): string | null {
  if (!f.isWinner || f.coWinners > 1) return null;
  if (f.margin == null || f.margin <= 0) return null;
  return `+${compactScore(f.type, f.margin)} ${CHALLENGE_TYPES[f.type].unit}`;
}

/** "Champion", "Co-Champion", "2nd Place", "3rd Place" — a placement, never a deficit (CC-D3). */
export function tierLabel(f: TrophyFinish): string {
  if (f.isWinner) return f.coWinners > 1 ? 'Co-Champion' : 'Champion';
  return f.place === 2 ? '2nd Place' : '3rd Place';
}

/** "1st of 6". Omits the field when a roster somehow didn't record. */
export function fieldLine(f: TrophyFinish): string {
  const place = f.place === 1 ? '1st' : f.place === 2 ? '2nd' : '3rd';
  return f.field > 0 ? `${place} of ${f.field}` : place;
}

/** "Most Volume · 2nd of 9 · Oct 2025" — the chip's one-line story. */
export function chipMeta(f: TrophyFinish): string {
  return [metricLabel(f.type, f.metricKey), fieldLine(f), monthYear(f.endAt)].join(' · ');
}

export function monthYear(iso: string): string {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
}

/**
 * The metric as a noun for the "Best event" footnote: "Most Volume" → "Volume", "Biggest Lift Gain" →
 * "Lift Gain". Names that are already nouns ("Max Lift", "Early Bird") are left alone.
 */
export function eventLabel(type: ChallengeType): string {
  const label = CHALLENGE_TYPES[type].label;
  return label.replace(/^(Most|Biggest)\s+/, '');
}

/** "2024–2026", "2026" — how long they have been competing. Null before their first finish. */
export function yearSpan(first: number | null, last: number | null): string | null {
  if (first == null || last == null) return null;
  return first === last ? String(first) : `${first}–${last}`;
}
