import { supabase } from '@/lib/supabase';
import { cap, dateRangeCompact, dateRangeFull, daysSince, fmtDate, fmtShort, roman } from '@/lib/format';
import { CHAPTER_GOALS_PENDING, LEGACY_FIXTURE_PENDING } from './legacy-fixture-pending';
import type { Chapter, FeaturedMoment, Goal as LegacyGoal, LegacyData, Pin, PinKind, TimelineEntry } from '@/types/legacy';
import type { RankFamily, RankLevel } from '@/domain/rank-artwork/resolver';
import { isAchieved, isQuantifiable, progressLabel, progressPct } from '@/domain/goals/goals';

/**
 * Live Legacy read (Phase 2) — builds the exact `LegacyData` shape the Legacy components already
 * consume, from the spine (`profiles` · `chapters` · `timeline_events`). The four schema-only sections
 * (photos/accomplishments/honors + chapter goals) come from `LEGACY_FIXTURE_PENDING`. Components
 * unchanged; only the data source swaps.
 */

interface ChapterRow {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  sealed_at: string | null;
  is_active: boolean;
  reflection: string | null;
  workout_count: number;
  honor_count: number;
}
interface TimelineRow {
  id: string;
  event_type: string;
  object_name: string;
  occurred_at: string;
  chapter_id: string | null;
}
interface PinRow {
  id: string;
  kind: PinKind;
  title: string;
  subtitle: string | null;
  media_url: string | null;
  poster_url: string | null;
  is_video: boolean;
  ref_id: string | null;
}

const EVENT_LABEL: Record<string, string> = {
  CHAPTER_SEALED: 'Chapter Sealed',
  GOAL_ACHIEVED: 'Goal Achieved',
  RANK_UP: 'Rank Up',
  PROGRAM_GRADUATED: 'Program Graduated',
  ACCOMPLISHMENT: 'Accomplishment',
  HONOR_EARNED: 'Honor Earned',
  REFLECTION_ADDED: 'Reflection Added',
  MEMORY_ADDED: 'Memory Added',
  PHOTO_ADDED: 'Photo Added',
};

interface GoalRow {
  chapter_id: string;
  name: string;
  target: number | null;
  unit: string | null;
  current: number;
  achieved_at: string | null;
}

/** A real primary goal row → the Legacy chapter card's display Goal (single-sourced via domain/goals). */
function toDisplayGoal(g: GoalRow | undefined): LegacyGoal {
  if (!g) return { kind: 'none' };
  const dom = { target: g.target, current: g.current, unit: g.unit, achievedAt: g.achieved_at };
  const achieved = isAchieved(dom);
  return isQuantifiable(dom)
    ? { kind: 'quantifiable', name: g.name, progress: progressPct(dom), achieved, valueLabel: progressLabel(dom) }
    : { kind: 'narrative', name: g.name, achieved };
}

function toChapter(r: ChapterRow): Chapter {
  return {
    id: r.id,
    name: r.name,
    startDate: fmtDate(r.start_date),
    endDate: r.end_date ? fmtDate(r.end_date) : undefined,
    sealedAt: r.sealed_at ? fmtDate(r.sealed_at) : undefined,
    dateRangeFull: r.end_date ? dateRangeFull(r.start_date, r.end_date) : undefined,
    dateRangeCompact: r.end_date ? dateRangeCompact(r.start_date, r.end_date) : undefined,
    goal: CHAPTER_GOALS_PENDING[r.name] ?? { kind: 'none' }, // FIXTURE until goals table lands
    workoutCount: r.workout_count,
    honorCount: r.honor_count,
    reflection: r.reflection ?? undefined,
    isActive: r.is_active,
  };
}

/** Featured moment = most-recent CHAPTER_SEALED event + that chapter's reflection (all spine). */
function deriveFeatured(timeline: TimelineRow[], chapters: ChapterRow[]): FeaturedMoment | null {
  const sealed = timeline.find((e) => e.event_type === 'CHAPTER_SEALED'); // timeline is occurred_at desc
  if (!sealed) return null;
  const chapter = chapters.find((c) => c.id === sealed.chapter_id || c.name === sealed.object_name);
  return {
    eventType: 'CHAPTER_SEALED',
    primaryText: sealed.object_name,
    secondaryText: chapter?.reflection ? `"${chapter.reflection}"` : undefined,
    dateLabel: fmtShort(sealed.occurred_at),
    chapterId: chapter?.id,
  };
}

/** L-12 My Standard editor — persist the athlete's creed (`profiles.standard`). */
export async function updateStandard(text: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not signed in');
  const { error } = await supabase.from('profiles').update({ standard: text }).eq('id', user.id);
  if (error) throw error;
}

export async function fetchLegacyData(): Promise<LegacyData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not signed in');
  const uid = user.id;

  const [
    { data: prof, error: pe },
    { data: chRows, error: ce },
    { data: tlRows, error: te },
    { data: pinRows, error: pne },
    { data: honorRows, error: he },
    { data: goalRows },
  ] = await Promise.all([
    supabase.from('profiles').select('rank_family, rank_level, standard').eq('id', uid).single(),
    supabase.from('chapters').select('*').eq('athlete_id', uid),
    supabase.from('timeline_events').select('*').eq('athlete_id', uid).order('occurred_at', { ascending: false }),
    supabase.from('pins').select('*').eq('athlete_id', uid).order('position', { ascending: true }),
    supabase.from('honor_instances').select('id, display_name, date_earned').eq('athlete_id', uid).order('date_earned', { ascending: false }),
    // Real primary goals (0025). NOT thrown on error — degrades to the fixture-free 'none' pre-migration.
    supabase.from('goals').select('chapter_id, name, target, unit, current, achieved_at').eq('athlete_id', uid).eq('is_primary', true),
  ]);
  if (pe) throw pe;
  if (ce) throw ce;
  if (te) throw te;
  if (pne) throw pne;
  if (he) throw he;

  // Honors are LIVE now (honor_instances) — retires LEGACY_FIXTURE_PENDING.honors.
  const honors = ((honorRows ?? []) as { id: string; display_name: string; date_earned: string }[]).map((h) => ({
    id: h.id,
    name: h.display_name,
    dateEarned: fmtDate(h.date_earned),
  }));

  const chapters = (chRows ?? []) as ChapterRow[];
  const timeline = (tlRows ?? []) as TimelineRow[];
  const pinned: Pin[] = ((pinRows ?? []) as PinRow[]).map((p) => ({
    id: p.id,
    kind: p.kind,
    title: p.title,
    subtitle: p.subtitle ?? undefined,
    mediaUrl: p.media_url ?? undefined,
    posterUrl: p.poster_url ?? undefined,
    isVideo: p.is_video,
    refId: p.ref_id ?? undefined,
  }));
  const active = chapters.find((c) => c.is_active) ?? null;
  const sealed = chapters
    .filter((c) => !c.is_active)
    .sort((a, b) => (b.sealed_at ?? '').localeCompare(a.sealed_at ?? ''));

  // The active chapter's card shows the REAL primary goal (0025), not the fixture. No primary → 'none'
  // (a fresh chapter shows no goal, never a placeholder one).
  const primaryGoalRow = ((goalRows ?? []) as GoalRow[]).find((g) => active && g.chapter_id === active.id);
  const activeChapter = active ? toChapter(active) : null;
  if (activeChapter) activeChapter.goal = toDisplayGoal(primaryGoalRow);

  return {
    rankName: prof.rank_family ? cap(prof.rank_family) : '',
    rankSubTier: prof.rank_level ? roman(prof.rank_level) : '',
    // The real rank drives the badge art (Slice 4). Foundation I is the floor for a fresh/unranked athlete.
    rankFamily: ((prof.rank_family as RankFamily | null) ?? 'foundation') as RankFamily,
    rankLevel: (Math.min(4, Math.max(1, prof.rank_level ?? 1))) as RankLevel,
    standard: prof.standard ?? '',
    activeChapter,
    dayCount: active ? daysSince(active.start_date) : 0,
    featuredMoment: deriveFeatured(timeline, chapters),
    pinned,
    sealedChapters: sealed.map(toChapter),
    timelineEntries: timeline.slice(0, 3).map(
      (e): TimelineEntry => ({
        id: e.id,
        eventType: EVENT_LABEL[e.event_type] ?? e.event_type,
        objectName: e.object_name,
        dateLabel: fmtShort(e.occurred_at),
      }),
    ),
    // honors are LIVE (from honor_instances); override any fixture default
    honors,
    totalHonorCount: honors.length,
    // ── transitional half — see legacy-fixture-pending ──
    ...LEGACY_FIXTURE_PENDING,
  };
}
