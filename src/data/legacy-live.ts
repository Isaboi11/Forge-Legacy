import { supabase } from '@/lib/supabase';
import { cap, dateRangeCompact, dateRangeFull, daysSince, fmtDate, fmtShort, roman } from '@/lib/format';
import { CHAPTER_GOALS_PENDING, LEGACY_FIXTURE_PENDING } from './legacy-fixture-pending';
import type { Chapter, FeaturedMoment, LegacyData, Pin, PinKind, TimelineEntry } from '@/types/legacy';

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
  };
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
  ] = await Promise.all([
    supabase.from('profiles').select('rank_family, rank_level, standard').eq('id', uid).single(),
    supabase.from('chapters').select('*').eq('athlete_id', uid),
    supabase.from('timeline_events').select('*').eq('athlete_id', uid).order('occurred_at', { ascending: false }),
    supabase.from('pins').select('*').eq('athlete_id', uid).order('position', { ascending: true }),
    supabase.from('honor_instances').select('id, display_name, date_earned').eq('athlete_id', uid).order('date_earned', { ascending: false }),
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
  }));
  const active = chapters.find((c) => c.is_active) ?? null;
  const sealed = chapters
    .filter((c) => !c.is_active)
    .sort((a, b) => (b.sealed_at ?? '').localeCompare(a.sealed_at ?? ''));

  return {
    rankName: prof.rank_family ? cap(prof.rank_family) : '',
    rankSubTier: prof.rank_level ? roman(prof.rank_level) : '',
    standard: prof.standard ?? '',
    activeChapter: active ? toChapter(active) : null,
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
