/**
 * ⚠️ PLACEHOLDER demo data for the Community tab root (Community Home) — NOT real
 * content and NOT backed by any social/community backend. There is no Communities
 * API, no feed store, no membership graph. Nothing here is live: "Iron Collective",
 * its members, posts, contributors, events, and challenges are all fabricated seed
 * data ported from the design handoff (`Community Home.dc.html`) purely to render
 * the screen. Do NOT treat any of it as authoritative or as a real person's data.
 *
 * When the real Community system lands, this file is replaced wholesale by
 * live-data hooks. Author/member avatars intentionally carry only a display `name`
 * (the Avatar composite renders initials) — no fabricated photos.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types (local to the placeholder layer — no shared schema exists yet)
// ─────────────────────────────────────────────────────────────────────────────

import type { ProgramStructure } from '@/domain/training/schema';
import type { PersonalRecord } from '@/domain/records/schema';

export type MemberRole = 'owner' | 'mod';

/** A category tag shown under the community name (icon chosen by the screen). */
export interface CommunityCategory {
  id: string;
  label: string;
  /** Which inline glyph the screen renders for this category. */
  icon: 'barbell' | 'flame';
}

/** A metadata chip row item (privacy / founded / cadence / activity). */
export interface CommunityMetaItem {
  id: string;
  label: string;
  icon: 'globe' | 'clock' | 'calendar' | 'spark';
}

/** One of the four secondary action buttons under the identity block. */
export interface CommunityAction {
  id: 'invite' | 'share' | 'rules' | 'more';
  label: string;
}

/** A composer shortcut chip (Photo / Video / Training / Achievement / Event). */
export interface ComposerShortcut {
  id: 'photo' | 'video' | 'training' | 'achievement' | 'event';
  label: string;
}

/** The active community whose home this screen renders. */
export interface Community {
  id: string;
  name: string;
  tagline: string;
  memberCountLabel: string;
  privacyLabel: string;
  categories: CommunityCategory[];
  metaItems: CommunityMetaItem[];
}

/** The pinned owner/mod announcement at the top of the feed. */
export interface PinnedAnnouncement {
  author: string;
  role: MemberRole;
  time: string;
  body: string;
  respectCount: number;
  commentCount: number;
}

/** Discriminated feed post. `kind` selects the body treatment. */
export type CommunityPost =
  | DiscussionPost
  | EventPost
  | FormCheckPost
  | AchievementPost
  | ProgramPost
  | PaidProgramPost;

interface PostBase {
  id: string;
  author: string;
  role?: MemberRole;
  time: string;
  typeLabel: string;
  body?: string;
  respectCount: number;
  commentCount: number;
}

export interface DiscussionPost extends PostBase {
  kind: 'discussion';
}

export interface EventPost extends PostBase {
  kind: 'event';
  eventMonth: string;
  eventDay: string;
  eventTitle: string;
  eventWhen: string;
  eventGoing: number;
}

export interface FormCheckPost extends PostBase {
  kind: 'formcheck';
  /** Display duration only — the video itself is a pending-asset placeholder. */
  videoDuration: string;
}

export interface AchievementPost extends PostBase {
  kind: 'achievement';
  // Structured PR mark (renderer derives the display via formatRecordValue) + the post's framing.
  record: PersonalRecord;
  label: string;
}

// Program posts carry the real Phase-0 structured shape (durationWeeks / frequencyPerWeek /
// structure enum), not a free meta string — the shared `formatProgramMeta` renders the line.
// frequencyPerWeek is optional: omitted where the source program doesn't state a days/week.
export interface ProgramPost extends PostBase {
  kind: 'program';
  programKindLabel: string;
  programTitle: string;
  durationWeeks: number;
  frequencyPerWeek?: number;
  structure: ProgramStructure;
  savedNote: string;
}

export interface PaidProgramPost extends PostBase {
  kind: 'programPaid';
  programKindLabel: string;
  programTitle: string;
  durationWeeks: number;
  frequencyPerWeek?: number;
  structure: ProgramStructure;
  footNote: string;
  price: string;
}

/** Feed "Active Challenges" strip item (Firewall-safe: no per-member standings). */
export interface ActiveChallenge {
  id: string;
  title: string;
  timeLeft: string;
  participants: number;
  pct: number;
}

/** "Top Contributors" row — contribution recognition, never performance. */
export interface Contributor {
  rank: number;
  name: string;
  role?: MemberRole;
  respect: number;
  distinction?: string;
}

/** Events tab card. */
export interface CommunityEvent {
  id: string;
  month: string;
  day: string;
  title: string;
  when: string;
  going: number;
  host: string;
}

/** Challenges tab card (shared community goal). */
export interface Competition {
  id: string;
  title: string;
  type: string;
  window: string;
  participating: number;
  state: 'active' | 'open';
}

export interface AboutStat {
  id: string;
  value: string;
  label: string;
}

export interface Leader {
  id: string;
  name: string;
  sub: string;
  role: MemberRole;
}

export interface EarnableHonor {
  id: string;
  name: string;
  desc: string;
  earned: boolean;
}

export interface AboutInfo {
  text: string;
  stats: AboutStat[];
  leaders: Leader[];
  honors: EarnableHonor[];
}

export interface CommunityHomeData {
  community: Community;
  actions: CommunityAction[];
  composerShortcuts: ComposerShortcut[];
  pinned: PinnedAnnouncement;
  posts: CommunityPost[];
  activeChallenges: ActiveChallenge[];
  contributors: Contributor[];
  events: CommunityEvent[];
  competitions: Competition[];
  about: AboutInfo;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed (fabricated — mirrors the design handoff's "Iron Collective" demo)
// ─────────────────────────────────────────────────────────────────────────────

export const COMMUNITY_DATA: CommunityHomeData = {
  community: {
    id: 'ironcollective',
    name: 'Iron Collective',
    tagline: 'Built on discipline. Driven by purpose. Stronger together.',
    memberCountLabel: '2,412',
    privacyLabel: 'Public',
    categories: [
      { id: 'pl', label: 'Powerlifting', icon: 'barbell' },
      { id: 'st', label: 'Strength', icon: 'flame' },
    ],
    metaItems: [
      { id: 'privacy', label: 'Public', icon: 'globe' },
      { id: 'since', label: 'Est. 2024', icon: 'clock' },
      { id: 'events', label: '6 events this month', icon: 'calendar' },
      { id: 'activity', label: 'Highly active', icon: 'spark' },
    ],
  },

  actions: [
    { id: 'invite', label: 'Invite' },
    { id: 'share', label: 'Share' },
    { id: 'rules', label: 'Rules' },
    { id: 'more', label: 'More' },
  ],

  composerShortcuts: [
    { id: 'photo', label: 'Photo' },
    { id: 'video', label: 'Video' },
    { id: 'training', label: 'Training' },
    { id: 'achievement', label: 'Achievement' },
    { id: 'event', label: 'Event' },
  ],

  pinned: {
    author: 'Coach Halden',
    role: 'owner',
    time: '2d ago',
    body:
      'October focus: consistency over intensity. Post one honest training note this week — a win, a miss, a lesson. This is how the Collective gets stronger together.',
    respectCount: 41,
    commentCount: 34,
  },

  posts: [
    {
      kind: 'discussion',
      id: 'p_disc',
      author: 'Marcus Vale',
      role: 'mod',
      time: '4h ago',
      typeLabel: 'Discussion',
      body:
        'Bracing cue that finally clicked for my athletes: breathe into your belt 360°, not just the front. Try it on your next heavy set and report back.',
      respectCount: 28,
      commentCount: 12,
    },
    {
      kind: 'program',
      id: 'p_prog',
      author: 'Coach Halden',
      role: 'owner',
      time: '6h ago',
      typeLabel: 'Coaching',
      body:
        'Sharing the block a lot of you asked for. 8 weeks, upper/lower, built to add to your bench and squat without frying you. Save it and run it when your current program wraps.',
      respectCount: 64,
      commentCount: 19,
      programKindLabel: 'Forge Program',
      programTitle: 'October Strength Block',
      durationWeeks: 8,
      frequencyPerWeek: 4,
      structure: 'upper_lower',
      savedNote: '214 saved',
    },
    {
      kind: 'event',
      id: 'p_ev',
      author: 'Coach Halden',
      role: 'owner',
      time: '1d ago',
      typeLabel: 'Event',
      body: 'Doors open early this Saturday — bring a friend who’s never lifted with a crew before.',
      respectCount: 30,
      commentCount: 5,
      eventMonth: 'OCT',
      eventDay: '12',
      eventTitle: 'Saturday Community Lift',
      eventWhen: 'Sat · 9:00 AM',
      eventGoing: 128,
    },
    {
      kind: 'programPaid',
      id: 'p_progext',
      author: 'Elena Ruiz',
      role: 'mod',
      time: '1d ago',
      typeLabel: 'Coaching',
      body:
        'My full 12-week hypertrophy program is live. It’s the same spreadsheet my in-person clients run — buy once, then import it straight into Forge Legacy and track every session here.',
      respectCount: 88,
      commentCount: 41,
      programKindLabel: 'Paid Program',
      programTitle: 'Hypertrophy Foundations',
      durationWeeks: 12,
      structure: 'ppl',
      footNote: 'Imports into Forge Legacy',
      price: '$29',
    },
    {
      kind: 'formcheck',
      id: 'p_fc',
      author: 'Theo Brandt',
      time: '2d ago',
      typeLabel: 'Form Check',
      body: 'Third set at 180kg. Does my hip rise look early to anyone? Honest eyes welcome.',
      respectCount: 33,
      commentCount: 14,
      videoDuration: '0:27',
    },
    {
      kind: 'achievement',
      id: 'p_pr',
      author: 'Jasmine Rae',
      time: '5h ago',
      typeLabel: 'Achievement',
      body: 'Hit a new PR today. 405 for a single. All glory to the process.',
      respectCount: 52,
      commentCount: 23,
      record: { exercise: 'Bench Press', measure: { kind: 'load', value: 405, unit: 'lb' } },
      label: 'New Personal Record',
    },
  ],

  activeChallenges: [
    { id: 'ch1', title: 'Deadlift Challenge', timeLeft: '3 days left', participants: 125, pct: 68 },
  ],

  contributors: [
    { rank: 1, name: 'Marcus Vale', role: 'mod', respect: 734, distinction: 'Mentor' },
    { rank: 2, name: 'Jasmine Rae', respect: 612, distinction: 'Community Builder' },
    { rank: 3, name: 'Alex Morgan', respect: 521 },
  ],

  events: [
    { id: 'e1', month: 'OCT', day: '12', title: 'Saturday Community Lift-Off', when: 'Sat · 9:00 AM · Main Floor', going: 128, host: 'Coach Halden' },
    { id: 'e2', month: 'OCT', day: '15', title: 'Deadlift Technique AMA', when: 'Tue · 7:00 PM · Live', going: 64, host: 'Marcus Vale' },
    { id: 'e3', month: 'OCT', day: '26', title: 'Monthly PR Meet', when: 'Sat · 10:00 AM · Platform', going: 41, host: 'Iron Collective' },
  ],

  competitions: [
    { id: 'c1', title: 'October Volume Push', type: 'Collective volume goal', window: 'Ends in 8 days', participating: 340, state: 'active' },
    { id: 'c2', title: '100-Rep Squat Challenge', type: 'Shared rep goal', window: 'Enrollment open', participating: 96, state: 'open' },
  ],

  about: {
    text:
      'The Iron Collective is a strength-first community for lifters who value the long game. Share training notes, ask honest questions, join community competitions, and show up for each other — on the platform and off it.',
    stats: [
      { id: 's1', value: '2,412', label: 'Members' },
      { id: 's2', value: '180', label: 'Posts / Week' },
      { id: 's3', value: '2 yr', label: 'Founded' },
    ],
    leaders: [
      { id: 'l1', name: 'Coach Halden', sub: 'Founder · Powerlifting', role: 'owner' },
      { id: 'l2', name: 'Marcus Vale', sub: 'Moderator · Strength', role: 'mod' },
      { id: 'l3', name: 'Elena Ruiz', sub: 'Moderator · Programming', role: 'mod' },
    ],
    honors: [
      { id: 'h1', name: 'First Community Joined', desc: 'Join your first community', earned: true },
      { id: 'h2', name: 'Community Builder', desc: 'Post 25 times in a community', earned: false },
      { id: 'h3', name: 'Helpful Contributor', desc: 'Earn respect on 50 replies', earned: false },
      { id: 'h4', name: 'Mentor', desc: 'Answer 20 member questions', earned: false },
      { id: 'h5', name: 'Event Organizer', desc: 'Host a community event', earned: false },
    ],
  },
};
