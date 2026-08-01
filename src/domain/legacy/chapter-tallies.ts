/**
 * How many honors belong to each chapter.
 *
 * This exists because `chapters.honor_count` never did. The column has been on the table since 0001
 * with `not null default 0`, is written exactly once — as a literal 0 at chapter creation — and is
 * incremented by nothing, anywhere, in any migration. Every surface that read it therefore displayed
 * "0 honors" for every chapter of every athlete, forever: the Chapter Detail stat tile, the Legacy
 * Timeline, the public profile, and the seal ceremony's own closing line. 0098 makes the tally derived
 * and marks the column dead.
 *
 * The count is taken from `honor_instances.chapter_id`, which has been the real record since 0012.
 * Pure and shared so the two readers that need it cannot drift apart, and so the rule is testable
 * without a database.
 */

/** The only field of an honor row this cares about. Anything with a nullable chapter id will do. */
export interface ChapterScopedHonor {
  chapter_id: string | null;
}

/**
 * Count honors per chapter id.
 *
 * A null `chapter_id` counts toward NO chapter, deliberately. 0012 splits the unique indexes on
 * exactly that line: `chapter_id is null` marks the one-time honors, which are earned once across a
 * whole legacy rather than inside any one chapter. Folding them into a chapter would inflate that
 * chapter and double-count the honor every time another chapter was opened.
 */
export function countHonorsByChapter(rows: readonly ChapterScopedHonor[]): Map<string, number> {
  const byChapter = new Map<string, number>();
  for (const row of rows) {
    if (!row.chapter_id) continue;
    byChapter.set(row.chapter_id, (byChapter.get(row.chapter_id) ?? 0) + 1);
  }
  return byChapter;
}

/**
 * Reader for the map above. A chapter with no honors is 0 — a real answer, not a missing one, which is
 * why this never returns undefined and callers never need a fallback of their own.
 */
export function honorsInChapter(byChapter: ReadonlyMap<string, number>, chapterId: string): number {
  return byChapter.get(chapterId) ?? 0;
}
