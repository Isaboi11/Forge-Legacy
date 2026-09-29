import type { RankFamily, RankLevel } from '@/domain/rank-artwork/resolver'
import type { HonorGlyphName } from '@/domain/honor/catalog'

export type Goal =
  | { kind: 'quantifiable'; name: string; progress: number; achieved: boolean; valueLabel?: string }
  | { kind: 'narrative'; name: string; achieved: boolean }
  | { kind: 'none' }

export type Chapter = {
  id: string
  name: string
  startDate: string
  endDate?: string
  sealedAt?: string
  /** Pre-formatted for State A: "Apr 5 – Jun 27, 2026 · 83 days" */
  dateRangeFull?: string
  /** Pre-formatted for State B: "Apr – Jun 2026 · 83d" */
  dateRangeCompact?: string
  goal: Goal
  workoutCount: number
  honorCount: number
  reflection?: string
  isActive: boolean
}

export type FLMEventType =
  | 'CHAPTER_SEALED'
  | 'GOAL_ACHIEVED'
  | 'RANK_UP'
  | 'PROGRAM_GRADUATED'
  /** A program under four weeks reached its last session (M4-A1-D4). Permanent record, no ceremony. */
  | 'PROGRAM_COMPLETED'
  | 'ACCOMPLISHMENT'
  | 'HONOR_EARNED'
  | 'REFLECTION_ADDED'
  | 'MEMORY_ADDED'
  | 'PHOTO_ADDED'

export type FeaturedMoment = {
  eventType: FLMEventType
  primaryText: string
  secondaryText?: string
  dateLabel: string
  /** The sealed chapter this moment belongs to — so the card can open its Chapter Detail. */
  chapterId?: string
  isInert?: boolean
}

export type TimelineEntry = {
  id: string
  eventType: string
  objectName: string
  dateLabel: string
}

export type LegacyPhoto = {
  id: string
  placeholderColor: string
  chapterName: string
  addedDate: string
}

export type Accomplishment = {
  id: string
  text: string
  monthYear: string
  /** "Featured on Profile" — a filled star vs an outline on the Legacy strip. */
  featured?: boolean
  /**
   * The keepsake, when the athlete attached one (0118). Both-or-neither with `mediaKind`, mirroring the
   * database's own constraint, so a consumer can branch on the kind and trust the URL.
   *
   * OPTIONAL because the public profile deliberately does not pass it: whether another athlete may see
   * the photo attached to your accomplishment is a visibility question nobody has answered, and the
   * conservative default is that they may not. Legacy — your own — passes it.
   */
  mediaUrl?: string | null
  mediaKind?: 'image' | 'video' | null
}

export type Honor = {
  id: string
  name: string
  dateEarned: string
  /**
   * Category medallion, resolved at read time so Legacy renders the SAME mark the Honors Hub does.
   * Optional: a caller without it falls back to the generic trophy rather than a wrong category.
   */
  glyph?: HonorGlyphName
  /**
   * The chapter this honor was earned INSIDE (`honor_instances.chapter_id`), or null for a one-time
   * account honor. The same field the per-chapter tally counts (`countHonorsByChapter`), so a screen that
   * lists a chapter's honors and one that counts them read the same rows. Optional: only `fetchLegacyData`
   * supplies it.
   */
  chapterId?: string | null
}

/** A Pinned Legacy item — the "My Museum" strip (Forge Legacy.dc.html §pinned). */
export type PinKind = 'record' | 'chapter' | 'honor' | 'photo' | 'memory' | 'accomplishment'
export type Pin = {
  id: string
  kind: PinKind
  title: string
  subtitle?: string
  /** Image (photo) or video URL; for a video pin this is the clip, `posterUrl` the still frame. */
  mediaUrl?: string
  posterUrl?: string
  isVideo: boolean
  /** Soft reference to the underlying entity (chapter/honor/accomplishment id) so the card can open it. */
  refId?: string
}

export type LegacyData = {
  rankName: string
  rankSubTier: string
  /** The athlete's real rank for the badge art (lowercase family + sub-tier 1–4). */
  rankFamily: RankFamily
  rankLevel: RankLevel
  /** "My Standard" — the athlete's creed, shown at the top of the Legacy hero. */
  standard: string
  activeChapter: Chapter | null
  dayCount: number
  featuredMoment: FeaturedMoment | null
  sealedChapters: Chapter[]
  /** Pinned Legacy strip — real rows (spine), rendered before the "Pin an item" add-tile. */
  pinned: Pin[]
  photos: LegacyPhoto[]
  totalPhotoCount: number
  timelineEntries: TimelineEntry[]
  accomplishments: Accomplishment[]
  totalAccomplishmentCount: number
  honors: Honor[]
  totalHonorCount: number
  /** Saved workouts, all time — what reveals Recent Activity and helps promote the timeline (L-A2). */
  savedWorkoutCount: number
  /** Every `timeline_events` row, not just the three previewed. */
  timelineEventCount: number
  /** The latest saved workouts, newest first — the Recent Activity rows. */
  recentWorkouts: RecentWorkout[]
}

/** A saved workout as Legacy remembers it: "Completed Upper Body · Today · 45 min". */
export type RecentWorkout = {
  id: string
  title: string
  /** ISO — the screen formats the day, so "Today" is computed where "now" is. */
  savedAt: string
  durationSec: number | null
}

export type TimelineGroup =
  | {
      kind: 'chapter'
      chapterId: string
      chapterName: string
      isActive: boolean
      events: TimelineEntry[]
    }
  | {
      kind: 'standalone'
      entry: TimelineEntry
    }
