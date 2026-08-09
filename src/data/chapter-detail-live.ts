import { supabase } from '@/lib/supabase';
import { chapterNameFrom, sanitizeChapterTitle, splitChapterName } from '@/domain/legacy/chapter-name';
import { fetchLegacyData } from './legacy-live';
import { fetchChapterGoals } from './goals-live';
import { fetchMyPrograms, fetchProgramCompletedCount } from './programs-live';
import { nextSession, totalSessions } from '@/domain/program/progress-core';
import { isAchieved, type Goal } from '@/domain/goals/goals';
import type { Chapter, Honor, TimelineEntry } from '@/types/legacy';

/**
 * L-3/L-4 Chapter Detail — the chapter overview. Composes what the app already reads (the Legacy spine
 * for chapter/honors/timeline/reflection, the goals table, saved programs) into one shape, rather than a
 * new set of queries.
 *
 * Goals and Current Programs are inherently CURRENT, so they show for the ACTIVE chapter only — a sealed
 * chapter is a record, not a live workspace. Honors and timeline aren't chapter-scoped in the schema yet,
 * so they show the athlete's recent set (flagged, not fabricated per-chapter).
 */

export interface ChapterProgramView {
  id: string;
  name: string;
  completed: number;
  total: number;
  nextLabel: string | null;
}

export interface OutcomeStat {
  value: string;
  label: string;
}

export interface ChapterDetail {
  id: string;
  number: string; // "Chapter III"
  title: string; // "The Rebuild"
  isActive: boolean;
  statusLabel: string; // "Started Mar 4, 2026" (active) OR the sealed date range
  sealedDateLabel: string | null; // "Sealed Mar 1, 2026" — for the reflection meta
  creed: string;
  reflection: string | null;
  workoutCount: number;
  honorCount: number;
  goals: Goal[];
  programs: ChapterProgramView[]; // active only
  honors: Honor[];
  timeline: TimelineEntry[];
  // ── sealed record (L-4) ──
  outcomeHeadline: string; // "Achieved Squat 405 lb" OR the chapter title
  outcomeStats: OutcomeStat[];
}

/** Split a stored chapter name ("Chapter III — The Rebuild") into its number + title, like Home does. */
function splitName(full: string): { number: string; title: string } {
  const parts = full.split('—');
  if (parts.length >= 2) return { number: parts[0].trim(), title: parts.slice(1).join('—').trim() };
  return { number: 'Chapter', title: full.trim() };
}

export async function fetchChapterDetail(chapterId: string): Promise<ChapterDetail | null> {
  const legacy = await fetchLegacyData();
  const chapter: Chapter | undefined =
    (legacy.activeChapter?.id === chapterId ? legacy.activeChapter : undefined) ??
    legacy.sealedChapters.find((c) => c.id === chapterId);
  if (!chapter) return null;

  const { number, title } = splitName(chapter.name);
  const isActive = chapter.isActive;

  // The chapter's goals load for BOTH states — current commitments while active, sealed OUTCOMES after.
  const goals = await fetchChapterGoals(chapter.id);

  // Current Programs are only meaningful while active (a sealed chapter is a record, not a live workspace).
  let programs: ChapterProgramView[] = [];
  if (isActive) {
    const savedPrograms = (await fetchMyPrograms()).filter((p) => p.state === 'active');
    programs = await Promise.all(
      savedPrograms.map(async (p): Promise<ChapterProgramView> => {
        const completed = await fetchProgramCompletedCount(p.id, p.structure);
        const next = nextSession(p.structure, completed);
        return {
          id: p.id,
          name: p.name,
          completed,
          total: totalSessions(p.structure),
          nextLabel: next ? `Week ${next.weekIndex + 1} · Day ${next.dayIndex + 1} · ${next.day.name}` : null,
        };
      }),
    );
  }

  // Sealed "This Chapter" outcome stats (all real spine data).
  const achievedGoals = goals.filter((g) => isAchieved(g)).length;
  const durationLabel = chapter.dateRangeFull?.split('·')[1]?.trim() ?? null;
  const outcomeStats: OutcomeStat[] = [
    { value: String(chapter.workoutCount), label: chapter.workoutCount === 1 ? 'Workout' : 'Workouts' },
    { value: String(chapter.honorCount), label: chapter.honorCount === 1 ? 'Honor' : 'Honors' },
    ...(goals.length ? [{ value: `${achievedGoals} / ${goals.length}`, label: 'Goals met' }] : []),
    ...(durationLabel ? [{ value: durationLabel, label: 'Duration' }] : []),
  ];
  const primary = goals.find((g) => g.isPrimary);
  const outcomeHeadline = primary && isAchieved(primary) ? `Achieved ${primary.name}` : chapter.name;

  return {
    id: chapter.id,
    number,
    title,
    isActive,
    statusLabel: isActive ? `Started ${chapter.startDate}` : chapter.dateRangeFull ?? chapter.dateRangeCompact ?? `Sealed ${chapter.sealedAt ?? ''}`,
    sealedDateLabel: chapter.sealedAt ? `Sealed ${chapter.sealedAt}` : null,
    creed: isActive ? 'Every workout becomes part of this chapter.' : 'A chapter written, then sealed — its outcomes permanent.',
    reflection: chapter.reflection ?? null,
    workoutCount: chapter.workoutCount,
    honorCount: chapter.honorCount,
    goals,
    programs,
    honors: legacy.honors,
    timeline: legacy.timelineEntries,
    outcomeHeadline,
    outcomeStats,
  };
}

/**
 * Seal (archive) a chapter — M-5. Sets it inactive, stamps the seal time, and (from the reflection
 * ceremony) writes the closing reflection in the same transaction. `reflection` is optional: "Skip for
 * now" seals without one, and it can be added later via `saveReflection` (the post path).
 */
export async function sealChapter(chapterId: string, reflection?: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const patch: { is_active: false; sealed_at: string; reflection?: string } = {
    is_active: false,
    sealed_at: new Date().toISOString(),
  };
  const trimmed = reflection?.trim();
  if (trimmed) patch.reflection = trimmed;
  const { error } = await supabase.from('chapters').update(patch).eq('id', chapterId).eq('athlete_id', user.id);
  if (error) throw error;
}

/**
 * Rename a chapter.
 *
 * ══ THERE WAS NO WAY TO DO THIS ══
 *
 * Not for the first chapter, not for any of them. The only `insert into chapters` in the repo is the
 * onboarding RPC, and the only two writers on this table set `is_active`, `sealed_at` and `reflection`.
 * So the name an athlete was given in their first minute — or now, chooses in it — was permanent.
 * That is the other half of the PO's ask: naming it up front is only personal if it can also be
 * reconsidered.
 *
 * `title` is the TITLE HALF only; the `Chapter N — ` prefix is preserved from the existing name, never
 * retyped. See `@/domain/legacy/chapter-name` for why that boundary exists (two parsers, two different
 * delimiter rules, no database constraint behind either).
 *
 * A SEALED chapter can still be renamed, deliberately. Sealing closes what happened, and the reflection
 * is the part that is meant to be permanent; a title is how the athlete refers to that time, and people
 * name a season properly only after living it.
 */
export async function renameChapter(chapterId: string, title: string): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const clean = sanitizeChapterTitle(title);
  if (clean.length < 2) throw new Error('Give the chapter a name.');

  // Read the current name for its prefix rather than recomputing an ordinal: the ordinal is a client
  // convention with no column behind it, and guessing it would renumber a chapter on rename.
  const { data: row, error: readErr } = await supabase.from('chapters').select('name').eq('id', chapterId).eq('athlete_id', user.id).single();
  if (readErr) throw readErr;

  const { prefix } = splitChapterName(String((row as { name?: string } | null)?.name ?? ''));
  const name = chapterNameFrom(clean, prefix);
  const { error } = await supabase.from('chapters').update({ name }).eq('id', chapterId).eq('athlete_id', user.id);
  if (error) throw error;
  return name;
}

/**
 * Add a reflection to an ALREADY-sealed chapter (the reflection ceremony's `post` path). Writes the
 * reflection only — the chapter stays sealed. Once written it's meant to be permanent (the screen locks
 * to read-only), so this is only reached when the chapter has no reflection yet.
 */
export async function saveReflection(chapterId: string, text: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('chapters').update({ reflection: text.trim() }).eq('id', chapterId).eq('athlete_id', user.id);
  if (error) throw error;
}
