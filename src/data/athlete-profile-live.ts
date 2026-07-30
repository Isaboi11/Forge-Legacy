import { supabase } from '@/lib/supabase';
import type { Clearance } from '@/domain/settings/visibility';
import type { FriendState } from './friends-live';

/**
 * The athlete profile read (migration 0069) — what one athlete may see of another.
 *
 * A NULL SECTION MEANS "NOT CLEARED", NOT "EMPTY". The gate runs in the database, so a section the
 * viewer cannot see never leaves the server; the client is told nothing about it beyond its absence.
 * `history: []` means they have no sealed chapters. `history: null` means it isn't yours to read. The two
 * render differently on purpose and must never be collapsed into one falsy check.
 */

export interface ProfileGoal {
  name: string;
  current: number;
  target: number | null;
  unit: string | null;
}

export interface ProfileChapter {
  id: string;
  name: string;
  startDate: string;
  workoutCount: number;
  honorCount: number;
  goal: ProfileGoal | null;
}

export interface SealedChapter {
  id: string;
  name: string;
  startDate: string;
  sealedAt: string | null;
  workoutCount: number;
}

export interface ProfileAccomplishment {
  id: string;
  name: string;
  date: string | null;
  note: string | null;
  featured: boolean;
}

export interface ProfileStats {
  workouts: number;
  prs: number;
  chapters: number;
}

export interface TimelineEvent {
  kind: 'chapter' | 'accomplishment';
  label: string;
  at: string;
}

export interface AthleteProfile {
  id: string;
  name: string;
  firstName: string;
  handle: string | null;
  initials: string | null;
  avatarUrl: string | null;
  athleteType: string | null;
  standard: string | null;
  rankFamily: string | null;
  rankLevel: number | null;
  joinedAt: string;
  clearance: Clearance;
  isSelf: boolean;
  /** Where the viewer stands with this athlete (0073). Drives the Add Friend / Accept / Friends button. */
  friendship: FriendState;
  sharedSquads: string[];
  /** null = the viewer isn't cleared for this section. */
  chapter: ProfileChapter | null;
  history: SealedChapter[] | null;
  accomplishments: ProfileAccomplishment[] | null;
  stats: ProfileStats | null;
  timeline: TimelineEvent[] | null;
  /** Reachable only at friend clearance — the `transformation` section defaults to the friends audience. */
  transformation: { entries: number } | null;
}

const asClearance = (v: string): Clearance =>
  v === 'owner' || v === 'friend' || v === 'squad' ? v : 'stranger';

export async function fetchAthleteProfile(athleteId: string): Promise<AthleteProfile | null> {
  const { data, error } = await supabase.rpc('athlete_profile', { p_athlete: athleteId });
  if (error) {
    if ((error as { code?: string }).code === 'PGRST202') throw new Error('Profiles aren’t available yet — migration 0069 hasn’t been applied.');
    throw error;
  }
  if (!data) return null;
  const d = data as Record<string, unknown>;

  const chapterRaw = d.chapter as Record<string, unknown> | null;
  const goalRaw = chapterRaw?.goal as Record<string, unknown> | null | undefined;
  const statsRaw = d.stats as Record<string, unknown> | null;

  return {
    id: String(d.id),
    name: String(d.name),
    firstName: String(d.first_name ?? d.name),
    handle: (d.handle as string) ?? null,
    initials: (d.initials as string) ?? null,
    avatarUrl: (d.avatar_url as string) ?? null,
    athleteType: (d.athlete_type as string) ?? null,
    standard: (d.standard as string) ?? null,
    rankFamily: (d.rank_family as string) ?? null,
    rankLevel: d.rank_level == null ? null : Number(d.rank_level),
    joinedAt: String(d.joined_at),
    clearance: asClearance(String(d.clearance)),
    isSelf: !!d.is_self,
    friendship: (['self', 'friends', 'outgoing', 'incoming', 'none'] as const).includes(d.friendship as never)
      ? (d.friendship as FriendState)
      : 'none',
    sharedSquads: ((d.shared_squads ?? []) as unknown[]).map((s) => String(s)),

    chapter: chapterRaw
      ? {
          id: String(chapterRaw.id),
          name: String(chapterRaw.name),
          startDate: String(chapterRaw.start_date),
          workoutCount: Number(chapterRaw.workout_count ?? 0),
          honorCount: Number(chapterRaw.honor_count ?? 0),
          goal: goalRaw
            ? {
                name: String(goalRaw.name),
                current: Number(goalRaw.current ?? 0),
                target: goalRaw.target == null ? null : Number(goalRaw.target),
                unit: (goalRaw.unit as string) ?? null,
              }
            : null,
        }
      : null,

    // `?? null` NOT `?? []` — absent means not cleared, and that distinction is the point.
    history:
      d.history == null
        ? null
        : (d.history as Record<string, unknown>[]).map((c) => ({
            id: String(c.id),
            name: String(c.name),
            startDate: String(c.start_date),
            sealedAt: (c.sealed_at as string) ?? null,
            workoutCount: Number(c.workout_count ?? 0),
          })),

    accomplishments:
      d.accomplishments == null
        ? null
        : (d.accomplishments as Record<string, unknown>[]).map((a) => ({
            id: String(a.id),
            name: String(a.name),
            date: (a.date as string) ?? null,
            note: (a.note as string) ?? null,
            featured: !!a.featured,
          })),

    stats: statsRaw
      ? { workouts: Number(statsRaw.workouts ?? 0), prs: Number(statsRaw.prs ?? 0), chapters: Number(statsRaw.chapters ?? 0) }
      : null,

    timeline:
      d.timeline == null
        ? null
        : (d.timeline as Record<string, unknown>[]).map((t) => ({
            kind: t.kind === 'chapter' ? 'chapter' : 'accomplishment',
            label: String(t.label),
            at: String(t.at),
          })),

    transformation: d.transformation ? { entries: Number((d.transformation as Record<string, unknown>).entries ?? 0) } : null,
  };
}

/** "Craftsman IV" from the stored family + level. The design renders Foundation IV for everybody. */
export function rankLabel(family: string | null, level: number | null): string | null {
  if (!family) return null;
  const roman = ['', 'I', 'II', 'III', 'IV'][level ?? 0] ?? '';
  const pretty = family.charAt(0).toUpperCase() + family.slice(1).toLowerCase();
  return roman ? `${pretty} ${roman}` : pretty;
}
