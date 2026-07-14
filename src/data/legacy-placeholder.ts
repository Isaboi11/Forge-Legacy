import type { LegacyData, TimelineGroup } from '@/types/legacy'

/**
 * Static placeholder data for L-1 Legacy Hub prototype.
 * Scenario: "veteran" athlete — active chapter in progress, 1 recently-sealed
 * chapter (State A), 2 older sealed chapters (State B), rich history.
 */
export const LEGACY_DATA: LegacyData = {
  rankName:  'Apprentice',
  rankSubTier: 'II',

  // Section 1 — Active Chapter
  activeChapter: {
    id: 'ch_4',
    name: 'Into the Iron',
    startDate: 'Apr 6, 2026',
    goal: {
      kind: 'quantifiable',
      name: 'Squat 315 lbs',
      progress: 73,
      achieved: false,
    },
    workoutCount: 47,
    honorCount: 5,
    isActive: true,
  },
  dayCount: 85,

  // Section 2 — Featured Legacy Moment
  // Chapter Sealed = Tier 1 Priority 1, within 30-day window (sealed Jun 27)
  featuredMoment: {
    eventType: 'CHAPTER_SEALED',
    primaryText: 'Road to 405',
    secondaryText:
      '"I proved to myself that consistency over six weeks beats intensity over one."',
    dateLabel: 'Jun 27',
  },

  // Section 3 — Chapter History
  // Index 0 = State A (sealed Jun 27 = 3 days ago, within 7-day window)
  // Index 1+ = State B
  sealedChapters: [
    {
      id: 'ch_3',
      name: 'Road to 405',
      startDate: 'Jan 15, 2026',
      endDate: 'Apr 4, 2026',
      sealedAt: 'Jun 27, 2026',
      dateRangeFull: 'Jan 15 – Apr 4, 2026 · 79 days',
      dateRangeCompact: 'Jan – Apr 2026 · 79d',
      goal: { kind: 'quantifiable', name: 'Squat 405 lbs', progress: 100, achieved: true },
      workoutCount: 47,
      honorCount: 3,
      reflection:
        'I proved to myself that consistency over six weeks beats intensity over one.',
      isActive: false,
    },
    {
      id: 'ch_2',
      name: 'Power Block',
      startDate: 'Nov 2025',
      endDate: 'Feb 2026',
      sealedAt: 'Feb 28, 2026',
      dateRangeCompact: 'Nov 2025 – Feb 2026 · 110d',
      goal: { kind: 'quantifiable', name: 'Deadlift 4 plates', progress: 100, achieved: true },
      workoutCount: 62,
      honorCount: 7,
      isActive: false,
    },
    {
      id: 'ch_1',
      name: 'Foundations',
      startDate: 'Jul 2025',
      endDate: 'Sep 2025',
      sealedAt: 'Sep 10, 2025',
      dateRangeCompact: 'Jul – Sep 2025 · 71d',
      goal: { kind: 'narrative', name: 'Build the habit', achieved: true },
      workoutCount: 38,
      honorCount: 4,
      isActive: false,
    },
  ],

  // Section 4 — Photos (colored placeholder squares)
  photos: [
    { id: 'p1', placeholderColor: '#2A2A32', chapterName: 'Into the Iron',  addedDate: 'Jun 28, 2026' },
    { id: 'p2', placeholderColor: '#20293A', chapterName: 'Road to 405',    addedDate: 'Jun 15, 2026' },
    { id: 'p3', placeholderColor: '#2E2022', chapterName: 'Road to 405',    addedDate: 'Mar 30, 2026' },
    { id: 'p4', placeholderColor: '#1E2822', chapterName: 'Power Block',    addedDate: 'Feb 10, 2026' },
    { id: 'p5', placeholderColor: '#2A2035', chapterName: 'Power Block',    addedDate: 'Jan 22, 2026' },
  ],
  totalPhotoCount: 12,

  // Section 5 — Timeline Teaser (2–3 most recent)
  timelineEntries: [
    { id: 'tl1', eventType: 'Chapter Sealed',    objectName: 'Road to 405',              dateLabel: 'Jun 27' },
    { id: 'tl2', eventType: 'Honor Earned',       objectName: '10 Workouts in Chapter',   dateLabel: 'Jun 20' },
    { id: 'tl3', eventType: 'Program Graduated',  objectName: 'Strength Foundation II',   dateLabel: 'Jun 14' },
  ],

  // Section 6 — Accomplishments (3 most recent)
  accomplishments: [
    { id: 'a1', text: 'Completed first powerlifting meet',        monthYear: 'Jun 2026' },
    { id: 'a2', text: 'Squatted 315 lbs without a spotter',      monthYear: 'May 2026' },
    { id: 'a3', text: 'Ran a sub-25 minute 5K',                  monthYear: 'Mar 2026' },
  ],
  totalAccomplishmentCount: 3,

  // Section 7 — Honors (3 most recently earned)
  honors: [
    { id: 'h1', name: '10 Workouts in Chapter',  dateEarned: 'Jun 20, 2026' },
    { id: 'h2', name: 'Program Graduated',        dateEarned: 'Jun 14, 2026' },
    { id: 'h3', name: 'Goal Achieved',            dateEarned: 'Apr 4, 2026' },
  ],
  totalHonorCount: 12,
}

/**
 * Static placeholder data for L-2 Legacy Timeline prototype.
 * Groups are ordered: active chapter first, then archived newest-sealed-first.
 * Standalone athlete-level events are interspersed at their chronological position.
 */
export const TIMELINE_GROUPS: TimelineGroup[] = [
  {
    kind: 'chapter',
    chapterId: 'ch_4',
    chapterName: 'Into the Iron',
    isActive: true,
    events: [
      { id: 'e0', eventType: 'Chapter Started', objectName: 'Into the Iron', dateLabel: 'Apr 6' },
    ],
  },
  {
    kind: 'standalone',
    entry: { id: 'sa1', eventType: 'Rank Up', objectName: 'Apprentice · II', dateLabel: 'May 15' },
  },
  {
    kind: 'chapter',
    chapterId: 'ch_3',
    chapterName: 'Road to 405',
    isActive: false,
    events: [
      { id: 'e6', eventType: 'Chapter Sealed',   objectName: 'Road to 405',            dateLabel: 'Apr 4' },
      { id: 'e5', eventType: 'Goal Achieved',    objectName: 'Squat 405 lbs',           dateLabel: 'Apr 4' },
      { id: 'e4', eventType: 'Honor Earned',     objectName: '10 Workouts in Chapter',  dateLabel: 'Mar 28' },
      { id: 'e3', eventType: 'Program Graduated',objectName: 'Strength Foundation II',  dateLabel: 'Mar 20' },
      { id: 'e2', eventType: 'Memory Added',     objectName: 'Road to 405',             dateLabel: 'Mar 10' },
      { id: 'e1', eventType: 'Chapter Started',  objectName: 'Road to 405',             dateLabel: 'Jan 15' },
    ],
  },
  {
    kind: 'chapter',
    chapterId: 'ch_2',
    chapterName: 'Power Block',
    isActive: false,
    events: [
      { id: 'e11', eventType: 'Chapter Sealed',    objectName: 'Power Block',             dateLabel: 'Feb 28' },
      { id: 'e10', eventType: 'Goal Achieved',     objectName: 'Deadlift 4 plates',       dateLabel: 'Feb 20' },
      { id: 'e9',  eventType: 'Program Graduated', objectName: 'Strength Foundation I',   dateLabel: 'Feb 10' },
      { id: 'e8',  eventType: 'Honor Earned',      objectName: '25 Workouts Logged',      dateLabel: 'Jan 15' },
      { id: 'e7',  eventType: 'Chapter Started',   objectName: 'Power Block',             dateLabel: 'Nov 10' },
    ],
  },
  {
    kind: 'chapter',
    chapterId: 'ch_1',
    chapterName: 'Foundations',
    isActive: false,
    events: [
      { id: 'e14', eventType: 'Chapter Sealed', objectName: 'Foundations', dateLabel: 'Sep 10, 2025' },
      { id: 'e13', eventType: 'Honor Earned',   objectName: 'First Step',  dateLabel: 'Jul 5, 2025' },
      { id: 'e12', eventType: 'Chapter Started',objectName: 'Foundations', dateLabel: 'Jul 1, 2025' },
    ],
  },
]
