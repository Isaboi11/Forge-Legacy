export type Goal =
  | { kind: 'quantifiable'; name: string; progress: number; achieved: boolean }
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
}

export type Honor = {
  id: string
  name: string
  dateEarned: string
}

export type LegacyData = {
  rankName: string
  rankSubTier: string
  /** "My Standard" — the athlete's creed, shown at the top of the Legacy hero. */
  standard: string
  activeChapter: Chapter | null
  dayCount: number
  featuredMoment: FeaturedMoment | null
  sealedChapters: Chapter[]
  photos: LegacyPhoto[]
  totalPhotoCount: number
  timelineEntries: TimelineEntry[]
  accomplishments: Accomplishment[]
  totalAccomplishmentCount: number
  honors: Honor[]
  totalHonorCount: number
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
