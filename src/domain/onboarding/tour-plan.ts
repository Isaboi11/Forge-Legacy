/**
 * The guided tour's step data and the pure planner that composes a run from it (Onboarding-Amendment-003,
 * realizing the element-spotlight pass that ONB-A3-D2 deferred to v2).
 *
 * THE TOUR IS TWO LEGS, FIRED AT TWO DIFFERENT MOMENTS.
 *
 *   TABS — the athlete's first arrival, before they have a program. Four cards, one per tab, no spotlight:
 *   this leg is the map — here are the four pillars, this is the shape of the app you just walked into.
 *
 *   HOME — once the athlete is settled: they have a program, or they have trained. Seven SPOTLIT steps
 *   over the real cards, handed to from the Initiative honor ceremony's "Keep Building". This is the leg
 *   that teaches the screen the athlete opens every day.
 *
 *   It used to wait for a PROGRAM, on the reasoning that three of its seven steps ring cards a
 *   program-less Home doesn't draw. Two of those three now draw for everyone — Home always has a Workout
 *   CTA, and the Mission tile never depended on a program in the first place — and the athlete who trains
 *   day to day and never builds one had been silently excluded from the walkthrough entirely. Only Current
 *   Program is genuinely program-only, and the anchor filter below has always handled exactly that.
 *
 * NEITHER LEG IS TIED TO A GATE ANY MORE. Home used to be a single-card funnel until the athlete chose a
 * starting point, and these two moments were "before the gate" and "at the un-gate". Home is now full from
 * the first launch (Onboarding-Amendment-002), so the same two moments are described by what is actually on
 * the screen: no program yet, and a program.
 *
 * They were welded together before: the tab tour existed only as the ceremony's continuation, so both fired
 * at the same instant and the dense Home screen was never explained at all (`SCREEN_TOURS.home` was `[]`).
 * Splitting them is the point — orientation while there's nothing to see, depth once there is.
 *
 * This module is pure and node-testable: no React, no RN, no storage. The provider owns *when*; this owns
 * *what*, and the planner below owns the one rule that isn't obvious — a step whose anchor isn't on screen
 * is dropped from the run entirely, so it never counts toward "3 of 7" and never rings an empty rectangle.
 * (`forge-coach.js`, the design's own coach-mark engine, filters its steps the same way at start.)
 */

export type TourLeg = 'tabs' | 'home';

/** The cards a step can ring. One id per real, tappable thing — not per section heading. */
export type TourAnchorId =
  // Home
  | 'chapter'
  | 'todays-workout'
  | 'current-program'
  | 'mission'
  | 'your-circle'
  | 'train-together'
  | 'competitions'
  // Workouts tab
  | 'workouts-segments'
  | 'workouts-active'
  | 'workouts-planned'
  | 'workouts-programs'
  | 'workouts-templates'
  | 'workouts-reference'
  | 'workouts-start'
  // Program Builder — Setup
  | 'builder-details'
  | 'builder-import'
  | 'builder-structure'
  | 'builder-list'
  | 'builder-save'
  // Program Builder — Day Builder
  | 'day-sections'
  | 'day-add'
  | 'day-reps'
  | 'day-cardio'
  // Active workout
  | 'workout-hero'
  | 'workout-sets'
  | 'workout-addset'
  | 'workout-rest'
  | 'workout-options'
  // Program Detail
  | 'program-progress'
  | 'program-schedule'
  | 'program-actions'
  // Exercise Library
  | 'library-hub'
  | 'library-search'
  | 'library-filters'
  // Templates
  | 'templates-list'
  | 'templates-new'
  // Legacy hub
  | 'legacy-rank'
  | 'legacy-standard'
  | 'legacy-pinned'
  | 'legacy-featured'
  | 'legacy-story'
  | 'legacy-endures'
  | 'legacy-collections'
  // Chapter Detail
  | 'chapter-summary'
  | 'chapter-goals'
  | 'chapter-programs'
  | 'chapter-archive'
  | 'chapter-seal'
  // Goals
  | 'goals-chapter'
  | 'goals-progress'
  | 'goals-add'
  | 'goals-history'
  // Progress Hub
  | 'progress-rank'
  | 'progress-strength'
  | 'progress-consistency'
  | 'progress-next'
  // Photos
  | 'photos-albums'
  | 'photos-count'
  // Transformation
  | 'transformation-grid'
  | 'transformation-add'
  | 'transformation-compare'
  // Accomplishments
  | 'accomplishments-list'
  | 'accomplishments-add'
  | 'accomplishments-featured'
  // Legacy Timeline
  | 'timeline-rail'
  | 'timeline-entry'
  // Honors
  | 'honors-recent'
  | 'honors-categories'
  // Trophy Case
  | 'trophy-medals'
  | 'trophy-record'
  // Squads hub
  | 'squads-card'
  | 'squads-favorites'
  | 'squads-discover'
  | 'squads-create'
  | 'squads-join'
  // Squad Detail
  | 'squad-hero'
  | 'squad-goal'
  | 'squad-checkins'
  | 'squad-feed'
  | 'squad-competitions'
  | 'squad-records'
  // Discover Squads
  | 'discover-list'
  | 'discover-active'
  | 'discover-create'
  // Squad Preview
  | 'preview-identity'
  | 'preview-roster'
  | 'preview-request'
  // Squad Settings
  | 'settings-identity'
  | 'settings-privacy'
  | 'settings-roster'
  // Squad Requests
  | 'requests-list'
  | 'requests-actions'
  // Squad Records
  | 'records-board'
  | 'records-scope'
  // Squad Composer
  | 'composer-body'
  | 'composer-post'
  // Friends
  | 'friends-feed'
  | 'friends-add'
  | 'friends-post'
  // Add Friend
  | 'addfriend-search'
  | 'addfriend-pending';

export interface TourStep {
  /** Stable identity — used by tests and by the overlay's keying, never shown. */
  key: string;
  leg: TourLeg;
  /** Tab this step lives on. The overlay navigates here before drawing. */
  route: string;
  title: string;
  body: string;
  /**
   * The card to spotlight. Absent = a plain centered card over a full dim (the tabs leg), which is exactly
   * what the design does for a step with no target.
   */
  anchor?: TourAnchorId;
  /** Breathing room around the ring, in px. Mirrors `forge-coach.js`'s per-step `pad` (default 8). */
  pad?: number;
  /** Ring corner radius. Should track the card's own radius so the hole doesn't clip its corners. */
  radius?: number;
}

/**
 * Leg 1 — the four pillars, in nav order. Copy unchanged from the shipped tour: the PO likes this leg as
 * it is, and the only thing this pass changes about it is WHEN it runs.
 */
export const TAB_STEPS: readonly TourStep[] = [
  {
    key: 'tab-home',
    leg: 'tabs',
    route: '/',
    title: 'Home',
    body: 'Your daily starting point — today’s workout, the chapter you’re writing, and the people training alongside you.',
  },
  {
    key: 'tab-workouts',
    leg: 'tabs',
    route: '/workouts',
    title: 'Workouts',
    body: 'Browse the program library, build your own, and start today’s session — all from here.',
  },
  {
    key: 'tab-legacy',
    leg: 'tabs',
    route: '/legacy',
    title: 'Legacy',
    body: 'Your permanent record — chapters, honors, and milestones that endure. History can’t be rewritten.',
  },
  {
    key: 'tab-squads',
    leg: 'tabs',
    route: '/squads',
    title: 'Squads',
    body: 'Small, private groups that train together, follow each other’s progress, and keep each other honest.',
  },
];

/**
 * Leg 2 — the full Home, top to bottom, in the order the athlete's eye already travels. Every step rings a
 * real card and names it in the athlete's own words ("Something else today?", "See your circle") so the copy
 * and the screen agree.
 *
 * Train Together and Competitions get a step each rather than sharing the row they're drawn in: they are
 * two unrelated ideas (who is lifting right now vs. a squad competition with a finish line), and one card
 * describing both taught neither.
 */
export const HOME_STEPS: readonly TourStep[] = [
  {
    key: 'home-chapter',
    leg: 'home',
    route: '/',
    title: 'The chapter you’re writing',
    body: 'Everything you log lands in the chapter you’re in now. Seal it when it’s done and it becomes permanent record — that’s the whole idea behind Forge Legacy.',
    anchor: 'chapter',
    pad: 10,
    radius: 18,
  },
  {
    key: 'home-workout',
    leg: 'home',
    route: '/',
    title: 'Today’s workout',
    /*
     * STATE-NEUTRAL ON PURPOSE. This read "Your next session, already built" — true only for an athlete
     * running a program, and this leg now runs for the athlete who never builds one, where it would have
     * described a card that says "Train Today" and holds nothing.
     */
    body: 'Today’s training, and the one button that starts it. Running a program? This is your next session, already built. Not running one? Start Workout asks what you’re training — lifts or cardio — and you fill it in as you go.',
    anchor: 'todays-workout',
    pad: 10,
    radius: 20,
  },
  {
    key: 'home-program',
    leg: 'home',
    route: '/',
    title: 'Current Program',
    body: 'The program you’re running and how far into it you are. Tap it for the full schedule, your progress, and every session you’ve finished.',
    anchor: 'current-program',
    pad: 8,
    radius: 18,
  },
  {
    key: 'home-mission',
    leg: 'home',
    route: '/',
    title: 'Mission',
    body: 'The one target this chapter is aimed at — a number, a distance, a lift. Tap through to set it, and every session has a reason behind it.',
    anchor: 'mission',
    pad: 8,
    radius: 18,
  },
  {
    key: 'home-circle',
    leg: 'home',
    route: '/',
    title: 'Your Circle',
    body: 'Your friends: who’s training right now, and the moments they chose to share. Nothing posts on its own — everything here was put there on purpose.',
    anchor: 'your-circle',
    pad: 10,
    radius: 20,
  },
  {
    key: 'home-train-together',
    leg: 'home',
    route: '/',
    title: 'Train Together',
    body: 'See who from your circle is mid-workout and train alongside them. Same hour, same effort, wherever you each are.',
    anchor: 'train-together',
    pad: 8,
    radius: 14,
  },
  {
    key: 'home-competitions',
    leg: 'home',
    route: '/',
    title: 'Competitions',
    body: 'Private competitions inside a squad — everyone in, a real finish line, and a champion at the end. Start one from the hub whenever you want the push.',
    anchor: 'competitions',
    pad: 8,
    radius: 14,
  },
];

/**
 * ── PER-SURFACE WALKTHROUGHS (ONB-A3-D2) ─────────────────────────────────────────────────────────────
 *
 * One list per surface, fired the first time the athlete lands there and never again. Same spotlight as the
 * Home leg; a different trigger. Kept here, beside the guided run, because they are the same authoring job
 * and the same rule applies to both: **a step whose card isn't mounted is dropped**, so a surface renders
 * only the steps its current state can actually show.
 *
 * WHAT THESE TEACH IS DELIBERATELY NOT "WHERE THE BUTTONS ARE". Every list below leads with the product
 * decisions a competent user cannot infer from the screen — that a template is a session you already did,
 * that Track and Log are different verbs, that the structure radio silently changes what the list beneath
 * it means. Labels explain themselves; decisions don't.
 */
export type ScreenTourKey =
  | 'home'
  | 'workouts'
  | 'legacy'
  | 'squads'
  | 'friends'
  | 'program-builder'
  | 'day-builder'
  | 'workout'
  | 'program-detail'
  | 'exercise-library'
  | 'templates'
  | 'chapter-detail'
  | 'legacy-timeline'
  | 'photos'
  | 'transformation'
  | 'accomplishments'
  | 'honors'
  | 'progress-hub'
  | 'goals'
  | 'trophy-case'
  | 'squad-detail'
  | 'discover-squads'
  | 'squad-preview'
  | 'squad-settings'
  | 'squad-requests'
  | 'squad-records'
  | 'squad-composer'
  | 'add-friend';

export type ScreenTourStep = Omit<TourStep, 'leg' | 'route'>;

export const SCREEN_TOURS: Record<ScreenTourKey, readonly ScreenTourStep[]> = {
  /**
   * Home has none and never will: its walkthrough is the guided run's HOME LEG, seven spotlit steps fired
   * the moment Home un-gates. A second card-only tour would arrive right behind it saying the same things
   * worse.
   */
  home: [],

  workouts: [
    {
      key: 'wk-segments',
      title: 'Two ways to look at this',
      body: '“My Workouts” is everything you own and train today. “Discover” is for finding something new. Nothing you build ever hides in Discover — it lands here, on your side.',
      anchor: 'workouts-segments',
      pad: 6,
      radius: 12,
    },
    {
      key: 'wk-active',
      title: 'Active',
      body: 'One program is active at a time — the one Home starts today’s session from. Ending or starting another moves this, and nothing you’ve already logged is affected.',
      anchor: 'workouts-active',
      pad: 8,
      radius: 18,
    },
    {
      key: 'wk-planned',
      title: 'Planned',
      body: 'Programs you’ve queued but haven’t started. When the active one ends you begin the next from here, so there’s no gap in the work. Nothing lands here by being looked at — only by your pressing Start.',
      anchor: 'workouts-planned',
      pad: 8,
      radius: 18,
    },
    {
      key: 'wk-programs',
      title: 'Your Programs',
      body: 'The ones you built yourself. Forge programs live in Discover until you take one on, and go back there once you’ve finished with them — a program you graduated is on the shelf again, not gone. “Build a Program” designs one from scratch, week by week.',
      anchor: 'workouts-programs',
      pad: 8,
      radius: 18,
    },
    {
      key: 'wk-templates',
      title: 'A template is a workout you’ve already done',
      body: 'Not one you plan. You train freely, and afterwards The Record offers to keep the shape — so “Build a Workout” starts a session you log as you go, then save. Authoring a workout you’ve never done is guessing at your own capacity.',
      anchor: 'workouts-templates',
      pad: 8,
      radius: 18,
    },
    {
      key: 'wk-reference',
      title: 'Reference',
      body: 'The Exercise Library is every lift in the app, searchable and bookmarkable. Activity History answers “what did I actually lift on Tuesday” — set by set, month by month.',
      anchor: 'workouts-reference',
      pad: 8,
      radius: 18,
    },
    {
      key: 'wk-start',
      title: 'Start anything from here',
      body: 'Today’s session, a freestyle log, or a program to build. Two of the doors look alike and aren’t: TRACK a run measures it as you go, LOG a run records one you already finished. A treadmill run has nothing for GPS to measure — and a run you forgot to start still counts.',
      anchor: 'workouts-start',
      pad: 6,
      radius: 999,
    },
  ],

  'program-builder': [
    {
      key: 'pb-details',
      title: 'Name it and size it',
      body: 'How many weeks it runs and how many days a week you train. Both are changeable later — this is a shape, not a contract.',
      anchor: 'builder-details',
      pad: 8,
      radius: 18,
    },
    {
      key: 'pb-structure',
      title: 'This choice changes everything below',
      body: '“Repeat the same week” means you build ONE week and it runs the whole program. “Customize each week” means you build every week individually — copy one forward and tweak it. The list underneath becomes your workouts or your weeks accordingly.',
      anchor: 'builder-structure',
      pad: 8,
      radius: 18,
    },
    {
      key: 'pb-import',
      title: 'Already have it written down?',
      body: 'Paste it. Week, Day, Exercise, Sets, Reps — one week or the whole program. Faster than tapping it in twice.',
      anchor: 'builder-import',
      pad: 8,
      radius: 12,
    },
    {
      key: 'pb-list',
      title: 'Build it day by day',
      body: 'Tap a row to fill that day in; the check appears once it holds a main exercise. The ⋮ on each row copies, clears, or reorders it.',
      anchor: 'builder-list',
      pad: 8,
      radius: 16,
    },
    {
      key: 'pb-save',
      title: 'You can leave and come back',
      body: 'Your draft saves itself on every change, so an interrupted build survives closing the app. Saving for real needs two things: a name, and at least one main exercise somewhere.',
      anchor: 'builder-save',
      pad: 8,
      radius: 14,
    },
  ],

  'day-builder': [
    {
      key: 'db-sections',
      title: 'Three sections, one required',
      body: 'Warm-up and Cool-down are optional — plenty of days have neither. Main is the day, and a day with nothing in Main can’t be saved.',
      anchor: 'day-sections',
      pad: 8,
      radius: 16,
    },
    {
      key: 'db-add',
      title: 'Add from the full library',
      body: 'Opens the exercise picker — search or browse, select as many as you want at once, and they all come back into this section in order.',
      anchor: 'day-add',
      pad: 8,
      radius: 14,
    },
    {
      key: 'db-reps',
      title: 'Sets and reps, per exercise',
      body: 'The steppers set the target you’ll see when you train it. They’re a plan, not a promise — what you actually lift is logged in the session and can differ.',
      anchor: 'day-reps',
      pad: 8,
      radius: 14,
    },
    {
      key: 'db-cardio',
      title: 'Cardio works differently',
      body: 'A cardio block is measured in distance, time and pace rather than sets and reps — set any of them, leave the rest open. What appears depends on the activity: a stair climber has no distance to report, a swim has no pace, and a swim is measured in yards.',
      anchor: 'day-cardio',
      pad: 8,
      radius: 14,
    },
  ],

  workout: [
    {
      key: 'w-hero',
      title: 'What to hit, and what you’ve done',
      body: 'Last is what you lifted here last time. Goal is today’s target. Best is your record on this lift. “How To” opens the full coaching for it — form cues, common mistakes, what it’s for.',
      anchor: 'workout-hero',
      pad: 8,
      radius: 18,
    },
    {
      key: 'w-sets',
      title: 'Target is the plan. Actual is the truth.',
      body: 'Log what you really lifted, not what was written down — heavier, lighter, fewer reps, all of it. The record is only worth having if it’s honest, and beating your best here is what earns a personal record.',
      anchor: 'workout-sets',
      pad: 8,
      radius: 14,
    },
    {
      key: 'w-addset',
      title: 'The plan bends',
      body: 'Add a set if you have more in you. Add an exercise mid-session if the rack is taken and you improvise. Nothing here is locked because you started.',
      anchor: 'workout-addset',
      pad: 8,
      radius: 14,
    },
    {
      key: 'w-rest',
      title: 'Rest runs itself',
      body: 'The timer starts when you log a set. Add or take 15 seconds, skip it, or switch it off entirely if you’d rather keep your own time.',
      anchor: 'workout-rest',
      pad: 8,
      radius: 14,
    },
    {
      key: 'w-options',
      title: 'When you’re done',
      body: 'Options holds the rest of it — swap an exercise, add a photo or video, note who you trained with, or end early. Finishing takes you to the seal, where the session becomes part of your record.',
      anchor: 'workout-options',
      pad: 6,
      radius: 999,
    },
  ],

  'program-detail': [
    {
      key: 'pd-progress',
      title: 'Where you are in it',
      body: 'How far through you are, and what the program has actually cost you so far — total volume, sessions, sets, and the heaviest thing you moved.',
      anchor: 'program-progress',
      pad: 8,
      radius: 18,
    },
    {
      key: 'pd-schedule',
      title: 'The Schedule becomes Your Log',
      body: 'Before you train it, this is the plan. Once you’ve logged sessions against it, it turns into the record of what you did — same list, filled in.',
      anchor: 'program-schedule',
      pad: 8,
      radius: 16,
    },
    {
      key: 'pd-actions',
      title: 'Ending is not deleting',
      body: 'End Program stops it and keeps everything you logged — it moves to your finished programs. Delete removes the program itself. Duplicate gives you a fresh copy to change without touching this one.',
      anchor: 'program-actions',
      pad: 8,
      radius: 14,
    },
  ],

  'exercise-library': [
    {
      key: 'el-hub',
      title: 'Start from what you use',
      body: 'Favourites are the ones you’ve bookmarked; Recently Used comes from your own logged sessions. The categories underneath are the whole catalog, split six ways.',
      anchor: 'library-hub',
      pad: 8,
      radius: 16,
    },
    {
      key: 'el-search',
      title: 'Searching flattens it',
      body: 'Type anything and the shortcuts give way to a straight list of matches. Clear the search to come back to this.',
      anchor: 'library-search',
      pad: 8,
      radius: 14,
    },
    {
      key: 'el-filters',
      title: '“Where you train” is about your gear',
      body: 'Category and Difficulty narrow the list the obvious way. “Where you train” checks against the equipment you actually own — set up your Home Gym once and it only shows you lifts you can do.',
      anchor: 'library-filters',
      pad: 8,
      radius: 14,
    },
  ],

  templates: [
    {
      key: 'tp-list',
      title: 'Sessions worth doing again',
      body: 'Each of these is a workout you finished and kept. Open one to see its shape and every time you’ve run it — or start it again as today’s session.',
      anchor: 'templates-list',
      pad: 8,
      radius: 16,
    },
    {
      key: 'tp-new',
      title: 'New ones come from training',
      body: 'There’s no blank template to fill in. Start a freestyle workout, build it as you go, and keep it when you’re done — a shape you’ve proven beats one you guessed at.',
      anchor: 'templates-new',
      pad: 8,
      radius: 14,
    },
  ],

  /**
   * The Legacy hub. Where Workouts is mechanics — which control does what — this is where the product's
   * IDEAS live, so the copy explains concepts rather than buttons: what a chapter is, what sealing does,
   * what you choose versus what is chosen for you, and the difference between a thing you declare and a
   * thing you earn.
   */
  legacy: [
    {
      key: 'lg-rank',
      title: 'Your standing',
      body: 'Rank is earned through consistent training over time — never bought, never skipped, never lost for missing a week. Tap the badge for the full picture of where you are and what’s next.',
      anchor: 'legacy-rank',
      pad: 8,
      radius: 999,
    },
    {
      key: 'lg-standard',
      title: 'My Standard',
      body: 'The line you hold yourself to, in your own words. Tap it to write or change it — it’s yours, it’s private, and nothing in the app judges it.',
      anchor: 'legacy-standard',
      pad: 8,
      radius: 16,
    },
    {
      key: 'lg-pinned',
      title: 'Pinned Legacy — your museum',
      body: 'Up to six things you choose to keep on display, of any kind: a chapter, an honor, an accomplishment, a record, a photo. “Edit” curates it. This is the one place in Legacy where you decide what’s shown.',
      anchor: 'legacy-pinned',
      pad: 8,
      radius: 18,
    },
    {
      key: 'lg-featured',
      /**
       * DESCRIBES THE APP, NOT THE SPEC. `Featured-Legacy-Moment-Standards.md` (LOCKED) defines a five-tier
       * selection across nine event types; `deriveFeatured` currently returns the most recent sealed chapter
       * and nothing else. Copy that promised "the most meaningful thing you've done recently" would be
       * describing a system that isn't built — the exact failure the stale Workouts tour was guilty of.
       * When the spec lands, this step is where the truth changes.
       */
      title: 'This one is chosen for you',
      body: 'Unlike your pins, you don’t pick this. It’s the last chapter you sealed, held up on its own — with the reflection you wrote when you closed it.',
      anchor: 'legacy-featured',
      pad: 8,
      radius: 18,
    },
    {
      key: 'lg-story',
      title: 'My Story',
      body: 'Every chapter you’ve sealed, newest first. A sealed chapter is finished history — its outcomes are fixed and can’t be rewritten, though you can still add memories to it later.',
      anchor: 'legacy-story',
      pad: 8,
      radius: 18,
    },
    {
      key: 'lg-endures',
      title: 'What Endures',
      body: 'Three separate archives. Transformation is your pose-matched progress photos. Photos is every image, grouped by the chapter you were in. Trophy Case is what you won competing.',
      anchor: 'legacy-endures',
      pad: 8,
      radius: 18,
    },
    {
      key: 'lg-collections',
      title: 'One you write, one you earn',
      body: 'Accomplishments are things you did that the app can’t see — a race, a milestone, a first. You add those yourself. Honors are awarded when you cross a line the app measures. You can’t claim one.',
      anchor: 'legacy-collections',
      pad: 8,
      radius: 18,
    },
  ],

  'chapter-detail': [
    {
      key: 'cd-summary',
      title: 'A chapter is a span of work',
      body: 'Not a week or a month — it runs as long as what you’re building takes. Everything you log while it’s open belongs to it.',
      anchor: 'chapter-summary',
      pad: 8,
      radius: 18,
    },
    {
      key: 'cd-goals',
      title: 'One Primary, any number of Supporting',
      body: 'The Primary Goal is what this chapter is for — there’s exactly one, and achieving it is a moment the app marks. Supporting goals are everything else you’re chasing alongside it.',
      anchor: 'chapter-goals',
      pad: 8,
      radius: 18,
    },
    {
      key: 'cd-programs',
      title: 'Programs come and go inside it',
      body: 'A chapter isn’t tied to one program. Start, finish or switch as often as you need — the chapter holds all of it.',
      anchor: 'chapter-programs',
      pad: 8,
      radius: 18,
    },
    {
      key: 'cd-archive',
      title: 'Photos are added here',
      body: 'This is the only place they’re created. The gallery groups them by chapter afterwards, which is why it has no add button of its own. Notes, honors and the chapter’s timeline gather here too.',
      anchor: 'chapter-archive',
      pad: 8,
      radius: 18,
    },
    {
      key: 'cd-seal',
      title: 'Sealing ends it, permanently',
      body: 'You’ll write a reflection, and then the chapter becomes history: outcomes freeze and can’t be edited. Memories can still be added afterwards — enriching the record is allowed, rewriting it isn’t.',
      anchor: 'chapter-seal',
      pad: 10,
      radius: 18,
    },
  ],

  goals: [
    {
      key: 'gl-chapter',
      title: 'Goals belong to a chapter',
      body: 'They’re not a standing to-do list — each one lives inside the chapter you set it in, and closes out with it. No chapter open means no goals to set yet.',
      anchor: 'goals-chapter',
      pad: 8,
      radius: 18,
    },
    {
      key: 'gl-add',
      title: 'One Chapter Goal, then the rest',
      body: 'The Chapter Goal is the headline — one per chapter. Supporting goals sit under it, as many as you want.',
      anchor: 'goals-add',
      pad: 8,
      radius: 16,
    },
    {
      key: 'gl-progress',
      title: 'Two kinds of goal',
      body: 'A quantifiable goal tracks a number and fills as you log — some update themselves from your training. A narrative goal is one you simply decide you’ve met.',
      anchor: 'goals-progress',
      pad: 8,
      radius: 16,
    },
    {
      key: 'gl-history',
      title: 'Achieved goals don’t disappear',
      body: 'They move to History and stay attached to the chapter they were won in. Achieving your Chapter Goal is marked with a moment of its own.',
      anchor: 'goals-history',
      pad: 8,
      radius: 16,
    },
  ],

  'progress-hub': [
    {
      key: 'ph-rank',
      title: 'The whole rank journey',
      body: 'Every rank from the first to the last, with your position on it. Ranks are earned through consistent training — you can’t buy one, skip one, or fall off one.',
      anchor: 'progress-rank',
      pad: 8,
      radius: 18,
    },
    {
      key: 'ph-strength',
      title: 'Pin the lifts that matter to you',
      body: 'Choose which numbers live here — “Edit” lets you pick. Your personal bests update themselves as you log workouts; you never enter them by hand.',
      anchor: 'progress-strength',
      pad: 8,
      radius: 18,
    },
    {
      key: 'ph-consistency',
      title: 'Consistency, not streaks',
      body: 'How much you’ve trained and how regularly. There’s no streak to break and no penalty for a week off — the record simply shows what happened.',
      anchor: 'progress-consistency',
      pad: 8,
      radius: 18,
    },
    {
      key: 'ph-next',
      title: 'What’s next',
      body: 'The nearest thing you’re working toward, and the way straight back into training.',
      anchor: 'progress-next',
      pad: 8,
      radius: 18,
    },
  ],

  photos: [
    {
      key: 'pg-albums',
      title: 'Albums are chapters',
      body: 'Your photos group themselves by the chapter you were in when you took them. There’s no sorting to do and no album to create — the chapter is the album.',
      anchor: 'photos-albums',
      pad: 8,
      radius: 18,
    },
    {
      key: 'pg-count',
      title: 'Photos are added from a chapter',
      body: 'That’s why there’s no add button here. Open the chapter you want the photo to belong to and add it there — it appears in this gallery straight after.',
      anchor: 'photos-count',
      pad: 8,
      radius: 16,
    },
  ],

  transformation: [
    {
      key: 'tf-grid',
      title: 'This isn’t the photo gallery',
      body: 'It’s a progress archive: the same poses, over and over, so the change is visible instead of remembered. Six poses and a video slot, kept apart from your chapter photos on purpose.',
      anchor: 'transformation-grid',
      pad: 8,
      radius: 18,
    },
    {
      key: 'tf-add',
      title: 'Same pose, same light, same spot',
      body: 'Consistency is the whole value — a set matched to the last one shows you something a random photo can’t. Add an entry whenever you like; there’s no schedule to keep.',
      anchor: 'transformation-add',
      pad: 8,
      radius: 16,
    },
    {
      key: 'tf-compare',
      title: 'Compare any two',
      body: 'Put two entries side by side, months apart if you want. This is the payoff for shooting the same pose twice.',
      anchor: 'transformation-compare',
      pad: 8,
      radius: 16,
    },
  ],

  accomplishments: [
    {
      key: 'ac-list',
      title: 'Things the app can’t see',
      body: 'A race you ran, a summit, a first. Honors are awarded automatically; these are the ones only you can record — so you write them yourself.',
      anchor: 'accomplishments-list',
      pad: 8,
      radius: 18,
    },
    {
      key: 'ac-add',
      title: 'Name it and date it',
      body: 'That’s all that’s required. Attach it to a chapter and it becomes part of that chapter’s record too.',
      anchor: 'accomplishments-add',
      pad: 8,
      radius: 16,
    },
    {
      key: 'ac-featured',
      /** The cross-screen collision this deliberately disambiguates: "Featured on Profile" (3, chosen)
       *  is not Pinned Legacy (6, chosen) and not the hub's Featured Legacy Moment (1, derived). */
      title: 'Featured on Profile is its own thing',
      body: 'Up to three accomplishments shown on your public profile — separate from Pinned Legacy, which is your own museum of up to six of anything. At three, adding another asks you which to replace.',
      anchor: 'accomplishments-featured',
      pad: 8,
      radius: 16,
    },
  ],

  'legacy-timeline': [
    {
      key: 'tl-rail',
      title: 'Every mark, in order',
      body: 'One continuous line from where you started to now — brightest at the present, fading toward the beginning. Nothing is ever removed from it.',
      anchor: 'timeline-rail',
      pad: 8,
      radius: 16,
    },
    {
      key: 'tl-entry',
      title: 'Weight is in the material',
      body: 'A sealed chapter, a rank earned and a goal met are drawn heavier than an ordinary entry — you can see significance without anything being labelled “important”. There’s no filter and no search, on purpose: a legacy is read, not queried.',
      anchor: 'timeline-entry',
      pad: 8,
      radius: 16,
    },
  ],

  honors: [
    {
      key: 'hn-recent',
      title: 'Awarded, never claimed',
      body: 'An honor appears the moment you cross the line it measures. There’s nothing to apply for and no way to mark one yourself.',
      anchor: 'honors-recent',
      pad: 8,
      radius: 18,
    },
    {
      key: 'hn-categories',
      title: 'No list of what you haven’t earned',
      body: 'You’ll only ever see the honors you hold, grouped by kind. A catalogue of everything unearned would turn a record of what you’ve built into a checklist of what you haven’t — which is the opposite of the point.',
      anchor: 'honors-categories',
      pad: 8,
      radius: 18,
    },
  ],

  'trophy-case': [
    {
      key: 'tc-medals',
      title: 'What you won competing',
      body: 'Championships and podium finishes from squad competitions. Bronze is the win here — a Forge championship is lit in the app’s own metal.',
      anchor: 'trophy-medals',
      pad: 8,
      radius: 18,
    },
    {
      key: 'tc-record',
      title: 'The full record',
      body: 'Your career figures across every competition you’ve entered, and the way through to all of them — including the ones you didn’t win.',
      anchor: 'trophy-record',
      pad: 8,
      radius: 18,
    },
  ],

  /**
   * The Squads cluster. The recurring idea underneath all of it is CONSENT: a squad is entered by
   * invitation or approval, never by walking in; friendship is mutual and searched for by handle, never
   * browsed; and the training numbers a squad-mate can see are numbers a stranger cannot. Every list below
   * leads with the part of that model the screen doesn't state out loud.
   */
  squads: [
    {
      key: 'sq-card',
      title: 'Small, private, and joined by consent',
      body: 'A squad is a handful of people who train together — not a public group. Nobody walks in: you’re invited, or you ask and the owner says yes. The card shows who’s in it and how many trained today.',
      anchor: 'squads-card',
      pad: 8,
      radius: 18,
    },
    {
      key: 'sq-favorites',
      title: 'Star the ones you live in',
      body: 'Favourites rise to the top of this list. It’s a per-device preference, so starring here doesn’t change anything on your other devices.',
      anchor: 'squads-favorites',
      pad: 8,
      radius: 14,
    },
    {
      key: 'sq-discover',
      title: 'Find one that’s open to you',
      body: 'Public squads are visible to everyone — which is not the same as enterable. You look, then you request, and the owner decides.',
      anchor: 'squads-discover',
      pad: 6,
      radius: 999,
    },
    {
      key: 'sq-create',
      title: 'Or build your own',
      body: 'Name it, give it a motto and a crest, and you own it — you approve who joins, set the squad goal, and can hand it over later.',
      anchor: 'squads-create',
      pad: 8,
      radius: 14,
    },
    {
      key: 'sq-join',
      title: 'Handed a code?',
      body: 'An invite code skips the request entirely — it’s the owner having already said yes.',
      anchor: 'squads-join',
      pad: 8,
      radius: 12,
    },
  ],

  'squad-detail': [
    {
      key: 'sd-hero',
      title: 'Who’s in, and who’s training',
      body: 'Tap the member count for the full roster. “Training today” is live — it’s the quiet signal that you’re not doing this alone.',
      anchor: 'squad-hero',
      pad: 8,
      radius: 18,
    },
    {
      key: 'sd-goal',
      title: 'One goal, everyone’s numbers',
      body: 'A squad goal adds up what every member logs toward it. The owner sets it; everyone moves it.',
      anchor: 'squad-goal',
      pad: 8,
      radius: 16,
    },
    {
      key: 'sd-checkins',
      title: 'Check-ins are presence, not posts',
      body: 'A quick “I’m here, I trained.” They sit apart from the feed on purpose — showing up is its own thing, and it shouldn’t have to be written about.',
      anchor: 'squad-checkins',
      pad: 8,
      radius: 16,
    },
    {
      key: 'sd-feed',
      title: 'The feed is what you choose to say',
      body: 'Posts, photos, form checks to be looked at. Nothing lands here automatically — “New Post” is the only way anything appears.',
      anchor: 'squad-feed',
      pad: 8,
      radius: 16,
    },
    {
      key: 'sd-competitions',
      title: 'Competitions live inside a squad',
      body: 'A private contest with a real finish line and a champion at the end. Everyone in the squad is in it — that’s what makes it worth winning.',
      anchor: 'squad-competitions',
      pad: 8,
      radius: 16,
    },
    {
      key: 'sd-records',
      title: 'What the squad has done',
      body: 'The record book of everyone’s bests, and the Hall of Champions once titles exist. Your squad-mates can see your numbers here — a stranger never can.',
      anchor: 'squad-records',
      pad: 8,
      radius: 16,
    },
  ],

  'discover-squads': [
    {
      key: 'ds-list',
      title: 'Public squads only',
      body: 'These are the squads that chose to be findable. Private ones never appear here — the only way into one of those is a code or an invitation.',
      anchor: 'discover-list',
      pad: 8,
      radius: 16,
    },
    {
      key: 'ds-active',
      title: 'Sorted by who’s actually training',
      body: 'Most active this week, not biggest or newest. A busy squad of four beats a silent squad of forty.',
      anchor: 'discover-active',
      pad: 8,
      radius: 14,
    },
    {
      key: 'ds-create',
      title: 'Nothing fits?',
      body: 'Build your own instead — you can invite the people you actually train with rather than hoping to find them.',
      anchor: 'discover-create',
      pad: 8,
      radius: 14,
    },
  ],

  'squad-preview': [
    {
      key: 'sp-identity',
      title: 'A look before you ask',
      body: 'What the squad is, what it’s working toward, and how big it is — enough to know whether it’s yours.',
      anchor: 'preview-identity',
      pad: 8,
      radius: 18,
    },
    {
      key: 'sp-roster',
      title: 'You’re seeing the outside of it',
      body: 'A few members and the shape of the place. The feed, the check-ins and everyone’s training numbers stay closed until you’re in — which is exactly what you get when it’s your squad.',
      anchor: 'preview-roster',
      pad: 8,
      radius: 16,
    },
    {
      key: 'sp-request',
      title: 'Ask, don’t enter',
      body: 'Your request goes to the owner with an optional note. They approve or decline — public means visible, never automatic.',
      anchor: 'preview-request',
      pad: 8,
      radius: 14,
    },
  ],

  'squad-settings': [
    {
      key: 'ss-identity',
      title: 'The squad’s face',
      body: 'Name, motto and crest. Everyone sees these — on the hub, in Discover, and at the top of the squad itself.',
      anchor: 'settings-identity',
      pad: 8,
      radius: 16,
    },
    {
      key: 'ss-privacy',
      title: 'Public means findable, not open',
      body: 'A public squad shows up in Discover and takes requests. A private one is invite-code only. Either way nobody joins without you saying so.',
      anchor: 'settings-privacy',
      pad: 8,
      radius: 16,
    },
    {
      key: 'ss-roster',
      title: 'The roster is yours to manage',
      body: 'Remove a member, or hand the whole squad to someone else — transferring makes them the owner and steps you down to a member.',
      anchor: 'settings-roster',
      pad: 8,
      radius: 16,
    },
  ],

  'squad-requests': [
    {
      key: 'sr-list',
      title: 'People asking to join',
      body: 'Every athlete who requested your squad, with whatever they wrote to you. This is the gate — nothing gets in past it on its own.',
      anchor: 'requests-list',
      pad: 8,
      radius: 16,
    },
    {
      key: 'sr-actions',
      title: 'Approve or decline',
      body: 'Approving adds them straight away. Declining is quiet — they aren’t told why, and they can ask again later.',
      anchor: 'requests-actions',
      pad: 8,
      radius: 14,
    },
  ],

  'squad-records': [
    {
      key: 'srec-board',
      title: 'The squad’s best, per lift',
      body: 'Whoever has moved the most weight on each movement holds it. Beat a number and the board changes — it comes from logged sessions, so there’s nothing to claim.',
      anchor: 'records-board',
      pad: 8,
      radius: 16,
    },
    {
      key: 'srec-scope',
      title: 'Inside the squad only',
      body: 'These numbers are visible because you train together. They go no further — nobody outside the squad sees them.',
      anchor: 'records-scope',
      pad: 8,
      radius: 14,
    },
  ],

  'squad-composer': [
    {
      key: 'sc-body',
      title: 'Say it however you like',
      body: 'Text, a photo, a video, or a form check you want eyes on. It goes to this squad and nowhere else.',
      anchor: 'composer-body',
      pad: 8,
      radius: 16,
    },
    {
      key: 'sc-post',
      title: 'Nothing posts itself',
      body: 'Your workouts, honors and records never appear in a feed on their own. This button is the only way anything gets shared.',
      anchor: 'composer-post',
      pad: 8,
      radius: 14,
    },
  ],

  friends: [
    {
      key: 'fr-feed',
      title: 'Moments they chose to share',
      body: 'Nothing posts automatically — everything here was put here on purpose, by them. A quiet feed means a quiet week, not a broken one.',
      anchor: 'friends-feed',
      pad: 8,
      radius: 16,
    },
    {
      key: 'fr-post',
      title: 'Open the whole moment',
      body: 'Tap a post to see it in full, or open their profile from the name to see what they’ve built.',
      anchor: 'friends-post',
      pad: 8,
      radius: 16,
    },
    {
      key: 'fr-add',
      title: 'Friendship is mutual, and asked for',
      body: 'You find someone by their handle and send a request; you’re connected only once they accept. There’s no browsing people and no following — this is a circle, not an audience.',
      anchor: 'friends-add',
      pad: 6,
      radius: 999,
    },
  ],

  'add-friend': [
    {
      key: 'af-search',
      title: 'By name, or by handle',
      body: 'Type a name to find an athlete, or start with @ to search handles only. Nothing appears until you ask for it — Forge never suggests people, and there’s no directory to browse.',
      anchor: 'addfriend-search',
      pad: 8,
      radius: 14,
    },
    {
      key: 'af-pending',
      title: 'It takes both of you',
      body: 'A sent request waits until they accept. Until then nothing is shared in either direction, and you can withdraw it.',
      anchor: 'addfriend-pending',
      pad: 8,
      radius: 16,
    },
  ],
};

export interface TourPlanInput {
  /** The tabs leg has already been walked (or skipped) on this device. */
  tabsDone: boolean;
  /** The Home leg has already been walked (or skipped) on this device. */
  homeDone: boolean;
  /**
   * Home is drawing its settled face, so the cards the Home leg rings actually exist.
   *
   * ══ THIS NAME HAS BEEN WRONG TWICE, AND THE SECOND TIME COST SOMEBODY THE TOUR ══
   *
   * It was `homeUnlocked` (whether Home was past a gate) until the gate was removed and the name described
   * nothing. It then became `homeHasProgram` — closer, but still an approximation standing in for the real
   * dependency, and the approximation had a victim: the athlete who trains day to day and never builds a
   * program NEVER saw the Home walkthrough, on the screen they open every morning, for as long as they
   * used the app.
   *
   * What this has always actually depended on is whether there are cards on screen to ring. A settled Home
   * draws six of the seven (everything but Current Program), and the anchor filter below already handles
   * the seventh — it needed no gate, just an honest question.
   */
  homeHasCards: boolean;
  /** Anchors registered by mounted components at this instant. Unregistered ids drop their step. */
  anchors: readonly TourAnchorId[];
  /** "Replay all tips" — re-run everything available regardless of what's already been seen. */
  replay?: boolean;
  /**
   * Lifetime workouts logged, for the Home leg's phase.
   *
   * ⚠ OPTIONAL, AND ABSENT MEANS "EVERYTHING". A caller that has not read the count yet must not get a
   * thinner tour by accident — under-teaching on a missing number is the failure that looks like the
   * feature working. Only a real zero thins the run.
   */
  workoutsLogged?: number;
}


// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// PHASES — thinning the first visit (ONB-D20 Progressive Discovery, finally built)
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * WHY THE TUTORIAL IS PHASED.
 *
 * PO: *"It's really heavy and people either skip it or get overwhelmed. So I think we go in phases.
 * Where the first time they download it we just have the basics and need to knows, then phase two is a
 * little more in depth, then phase three is more niche things. And have to spread apart."*
 *
 * They are right about the shape: 105 authored steps, and a new athlete meets about twenty-three of them
 * before finishing a single workout. But the TRIGGER was never the problem — a per-surface walkthrough
 * already fires only when you first reach that screen. **The density is the problem**, so the fix is to
 * thin each first visit rather than to withhold whole screens.
 *
 * That distinction is load-bearing. Gating surfaces would mean somebody who opens Squads on day one is
 * taught nothing at all — taught silence — whereas thinning means every surface still explains itself the
 * first time, in two steps, and the depth arrives when the athlete has earned a reason to care.
 *
 * ⚠ THIS IS AN UNIMPLEMENTED LOCKED SPEC, NOT A NEW IDEA. `Onboarding-First-Time-Journey-Architecture`
 * ONB-D20 has said since it locked: *"Feature education is delivered later, when relevant — never
 * front-loaded."* ONB-D21 names both failure modes this sits between — an overwhelming tour, and a
 * barren start. See `Onboarding-Amendment-004`.
 */
export type TourPhase = 1 | 2 | 3;

/**
 * Workouts logged before each phase opens.
 *
 * Counted in SESSIONS rather than days because teaching should track use, not the calendar: somebody
 * training four times a week has met far more of the app by Friday than somebody who opened it twice,
 * and a day-based gate teaches the second athlete things they have no context for yet.
 */
export const PHASE_UNLOCK: Record<TourPhase, number> = { 1: 0, 2: 3, 3: 10 };

/** How many of a surface's steps belong to phase 1, then to phase 2. The rest are phase 3. */
export const PHASE_1_STEPS = 2;
export const PHASE_2_STEPS = 2;

/** How much of the Home leg fires on the very first run. The rest waits for phase 2. */
export const HOME_PHASE_1_STEPS = 3;

/** Which phase an athlete is in. Monotonic — it never goes backwards. */
export function phaseFor(workoutsLogged: number): TourPhase {
  const n = Math.max(0, Math.floor(workoutsLogged || 0));
  if (n >= PHASE_UNLOCK[3]) return 3;
  if (n >= PHASE_UNLOCK[2]) return 2;
  return 1;
}

/**
 * Which phase a step belongs to, by its POSITION in its surface's list.
 *
 * ⚠ POSITIONAL, AND DELIBERATELY NOT A PER-STEP TAG. Every walkthrough was authored in reading order —
 * what the screen is, then the decision it asks of you, then the details — so position already encodes
 * depth. Ninety-four hand-applied tags would encode the same thing less reliably and would rot the first
 * time somebody reordered a list.
 */
export function phaseOfStep(index: number): TourPhase {
  if (index < PHASE_1_STEPS) return 1;
  if (index < PHASE_1_STEPS + PHASE_2_STEPS) return 2;
  return 3;
}

/**
 * The steps of one surface that are unlocked at this many workouts.
 *
 * ⚠ ALWAYS RETURNS THE FIRST STEPS, never a later slice. A surface teaches itself from the top every
 * time it is owed — an athlete reaching phase 2 does not resume mid-explanation on a screen they last
 * saw eight sessions ago. The seen-set is what stops a phase being re-shown, not this function.
 */
export function stepsFor(key: ScreenTourKey, workoutsLogged: number): readonly ScreenTourStep[] {
  const phase = phaseFor(workoutsLogged);
  return SCREEN_TOURS[key].filter((_s, i) => phaseOfStep(i) <= phase);
}

/**
 * Compose ONE run — never both legs at once, even when both are owed.
 *
 * THIS IS THE CORRECTION TO A REAL DEFECT, and the reasoning matters because the combined run looked
 * perfectly reasonable. A run is planned once, against a snapshot of the anchors mounted at that instant.
 * The tabs leg then NAVIGATES: Home → Workouts → Legacy → Squads. Home unmounts on the way and releases
 * every anchor it registered, so a combined run walks back to a Home whose cards were measured out of a
 * screen that no longer existed when it was planned — and the steps that had been counted quietly failed
 * to find anything to ring. The observed symptom was a run that "ended early".
 *
 * Splitting them removes the class of bug rather than patching it. Each leg is planned at the moment it
 * runs, against the screen it is about, and its counter describes only itself ("4 of 4", then "1 of 7").
 * The tabs leg finishes, records itself, and the provider's arm effect fires the Home leg a beat later —
 * which is also, exactly, the two-moments design this tour was split into in the first place.
 */
export function planTour(input: TourPlanInput): TourStep[] {
  const { tabsDone, homeDone, homeHasCards, anchors, replay = false, workoutsLogged } = input;

  // Tabs first whenever it's owed — it is the shorter, more general orientation, and Home is still there
  // afterwards. Home's own moment comes next, on its own.
  if (replay || !tabsDone) return [...TAB_STEPS];

  if (homeHasCards && (replay || !homeDone)) {
    /*
     * Phase thins the HOME leg only, and only by CONTENT — never by routing. `planTour`'s one-leg-per-run
     * rule is a bug fix (see the header above), so a phase may drop steps from a leg but may never make a
     * run span two of them.
     *
     * The tabs leg is untouched at every phase: four one-sentence steps naming what each tab is for is
     * the orientation everything else assumes, and thinning it would leave an athlete who has trained
     * three times being introduced to a tab bar they have used all week.
     */
    const homeLimit = workoutsLogged == null || phaseFor(workoutsLogged) > 1 ? HOME_STEPS.length : HOME_PHASE_1_STEPS;
    return HOME_STEPS.slice(0, homeLimit).filter((s) => !s.anchor || anchors.includes(s.anchor));
  }

  return [];
}

/** Which legs a planned run actually contains — the provider records terminal state per leg from this. */
export function legsIn(steps: readonly TourStep[]): TourLeg[] {
  const legs: TourLeg[] = [];
  for (const step of steps) if (!legs.includes(step.leg)) legs.push(step.leg);
  return legs;
}
