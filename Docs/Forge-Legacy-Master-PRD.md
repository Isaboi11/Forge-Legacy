# FORGE LEGACY
## Master Product Requirements Document
### Version 1.0 | June 2026 | Phase 2A Final

> **This is the single source of truth for Forge Legacy.**
> All future Claude chats, designers, engineers, contractors, and AI tools should reference this document first.
> Do not plan, design, or build features that contradict or extend beyond this document without a documented revision.

---

---

# SECTION 1 — EXECUTIVE SUMMARY

## What Is Forge Legacy?

Forge Legacy is a fitness legacy app. It is not a workout tracker.

The tracker is the engine. The Legacy is the product.

Users log workouts, programs, and goals — but the purpose of every log entry is to build something larger: a permanent, structured record of their athletic journey organized into chapters, honored with milestones, and preserved for life.

## What Problem Does It Solve?

Most fitness apps are dashboards: streaks, macros, weekly totals. The moment you stop using them, all context is lost. Fitness journeys have no memory, no narrative, no permanence.

Athletes who have trained for five, ten, or twenty years have no way to look back at who they were when they started, how far they have come, or what it cost them to get there.

Forge Legacy solves the preservation problem. Every workout becomes a chapter. Every chapter becomes a legacy.

## Why Does It Exist?

Because transformation is the point — not activity.

Because an athlete who has been training for twenty years deserves a record that reflects what they built, not just what they logged last week.

Because most fitness apps treat the athlete as a user. Forge Legacy treats the athlete as the protagonist of an ongoing story.

## What Makes It Different?

- **Legacy architecture, not dashboard architecture.** The product is structured around chapters (distinct periods of athletic life), not streaks or daily rings.
- **Permanent, structured history.** Archived chapters are sealed and immutable. History cannot be rewritten. Memories can be added. Outcomes cannot change.
- **Emotional product design.** 70% luxury legacy / 30% performance tool. Dark charcoal. Bronze accents. Photography over illustration. Feels like a trophy, not a spreadsheet.
- **Accountability without shame.** Squads provide community and accountability. They never surface failure data, missed workouts, or negative comparisons.
- **Never charges for history.** Premium unlocks future capability. It never locks past work.

---

---

# SECTION 2 — PRODUCT VISION

## Mission

Build the app that lets athletes preserve, reflect on, and share the full story of their fitness journey.

## Core Philosophy

The workout tracker is the engine. The Legacy is the product.

Every log entry, every completed goal, every earned honor is raw material. The product's job is to transform that raw material into something that matters — a legacy the athlete is proud of.

## Long-Term Vision

Ten years from now, an athlete opens Forge Legacy and sees every chapter of their athletic life, organized, honored, and preserved. They can show it to their children. They can reflect on who they were when they started. They can see the exact moment they became someone different.

That is the product.

## Guiding Principles

1. The app rewards transformation, not activity.
2. History is permanent. Memories can be added. Outcomes cannot change.
3. Every Legacy starts with a foundation.
4. Accountability without shame.
5. Never charge for history.
6. The athlete is the protagonist. The app is the chronicler.
7. Elegance over complexity. Less is more. Depth over breadth.
8. Chapters are the organizing unit of a life, not just a fitness period.

---

---

# SECTION 3 — TARGET USER

## Primary Users

### New Lifters
People beginning their fitness journey for the first time. They need structure, encouragement, and a sense that what they are building matters beyond this week. Onboarding Path A.

### Experienced Athletes
People who have been training for years — strength athletes, bodybuilders, hybrid athletes, runners, cyclists, combat sports athletes, general fitness athletes. They have a history that deserves to be honored and a future that deserves to be structured. Onboarding Path B.

### Returning Athletes
People returning after a gap — injury, life circumstances, loss of motivation. They need a clean start that still honors what they built before. The Chapter system is built for this. A new chapter can begin while the old record is preserved.

## Who The Product Is For

- Athletes who care about their journey, not just their metrics.
- People who want their fitness life to mean something beyond their last workout.
- Athletes who want accountability without shame or public performance pressure.
- People at any experience level who want structure, not just logging.

## Who The Product Is NOT For

- People who want a pure performance analytics dashboard.
- Athletes looking for social media-style public feeds and follower counts.
- Users who want community forums, public comments, or content creation tools.
- People who want coach or trainer account management tools (Future Roadmap).
- Anyone seeking a calorie/macro/nutrition tracker (not in scope).

---

---

# SECTION 4 — BRAND POSITIONING

## Brand Personality

Forge Legacy is:

- **Premium** — feels like something worth paying for before you see the price.
- **Serious** — respects the athlete's effort. No gamification gimmicks. No confetti for mediocrity.
- **Warm** — not cold and clinical. A coach who believes in you, not a spreadsheet.
- **Permanent** — built to last. Not another app you abandon in three months.
- **Proud** — celebrates what the athlete has built. Not shy about it.

## Emotional Goals

When a user opens Forge Legacy, they should feel:

- **Proud** of what they have built.
- **Motivated** to keep building.
- **Held** — like the app cares about their journey.
- **Capable** — like they are exactly the kind of person who finishes things.

When a user completes a chapter, they should feel:

- **The weight of what they achieved.**
- **The anticipation of what comes next.**

## Product Feel

70% Luxury Legacy / 30% Performance Tool.

The product should feel like it belongs in the same drawer as a journal you keep for years — not the same folder as a habit-tracking app.

## Visual Design Direction

- **Color palette:** Dark charcoal base, warm undertones, bronze accents.
- **Typography:** Strong, clean, readable at size. No playful fonts.
- **Imagery:** Photography over illustration. Real athletes. Real environments. Not stock icons.
- **Animation:** Purposeful. Celebration moments (Rank Up, Honor Earned, Chapter Complete) deserve ceremony. Utility screens are clean and fast.
- **Hero component (D-Lite):** Full-width, top-dominant, story-first. The most important surface in the app.

## Luxury Positioning

Forge Legacy is not the cheapest fitness app. It is the most meaningful one. The product should visually and functionally justify premium pricing. Every design decision should reinforce that users are working with something worth keeping.

## Transformation Positioning

The product does not reward daily usage. It rewards completion. Chapters completed. Goals achieved. Programs graduated. The app celebrates transformation, not streaks.

## Accountability Positioning

Squads provide accountability through visibility, not shame. The Squad Activity Feed shows what members have done — it never shows what members have missed. No streak breaks. No failure data. Presence over performance pressure.

---

---

# SECTION 5 — MVP DEFINITION

## MVP — Approved Final Scope

### Onboarding
- Full dual-path onboarding: New to Fitness and Experienced Athlete
- Chapters encouraged, not required — users can proceed without creating a chapter
- Experienced path includes optional prior accomplishment entry
- 11 total onboarding screens

### Home
- Home Dashboard (H-1) with D-Lite hero system
- All 5 hero states: Goal Achieved, Program Graduation, Major Accomplishment, No Active Chapter, Default Current Chapter
- Start Workout CTA inside the hero — large, obvious, always present
- Hero priority system (highest priority wins): Goal Achieved → Program Graduation → Major Accomplishment → No Active Chapter → Default

### Workouts
- Workouts Hub (W-1)
- Programs: Browse, Detail, Create, Fork/Edit (W-2 through W-5)
- Templates: List, Detail (W-6, W-7)
- Activity Logging: 8 types — Strength, Run, Walk, Bike, Swim, Mobility, Yoga, Other (W-8 through W-16)
- Workout Summary with honors, partner, rank progress (W-17)
- Activity History and Detail (W-18, W-19)
- Add Workout Partner — squad auto-accept, non-squad requires approval (W-20)
- Import: Upload, Review & Destination, Chapter Setup, Confirm (W-IM-1 through W-IM-4)
- 3-tap rule: Home → first input logged = 3 taps

### Legacy
- Legacy Hub with full hierarchy (L-1)
- Chapters: List, Detail (Active + Archived), Create, Reflection (L-2 through L-6)
- Goals: Detail, Create/Edit (L-7, L-8)
- Timeline: Newest First, Grouped by Chapter (L-9)
- Honors: List, Detail (L-10, L-11)
- Accomplishments: List, Detail, Add (L-12 through L-14)
- Photos: Gallery (50 stored free / unlimited premium), Detail (L-15, L-16)

### Squads
- Squads Hub, Squad Detail, Create Squad (S-1 through S-3)
- Invite: QR Code (primary), Squad Search (secondary), Squad Code (tertiary) — no contact sync (S-4 through S-6)
- Member Card, Check-In, Squad Goals, Train Together (S-7 through S-10)
- Squad Activity Feed within Squad Detail

### Profile
- Full profile sheet: Athlete Card, Rank, Current Chapter, Highlights (P-1)
- Edit Profile, Rank Detail (P-2, P-3)
- Settings: Root, Notifications, Privacy, Connected Apps (P-4 through P-7)
- Subscription screen, Delete Account / Data Export (P-8, P-9)

### Global Modals
- M-1: Rank Up
- M-2: Honor Earned
- M-3: Goal Achieved
- M-4: Program Graduation
- M-5: Chapter Complete Confirmation
- M-6: Destructive Action Confirmation
- M-7: Premium Upsell Sheet
- M-8: Workout Partner Notification — Squad (Claim / Dismiss)
- M-9: Workout Partner Request — Non-Squad (Accept / Decline)

**MVP Total: ~76 screens and states**

---

## Post-MVP — Deferred, Planned

| Feature | Screens | Reason Deferred |
|---------|---------|-----------------|
| WODs (Workout of the Day) | W-PM-1, W-PM-2, W-PM-3 | Custom WOD scoring complexity |
| Events | W-PM-4, W-PM-5, W-PM-6 | Race/event integration complexity |
| Clubs | W-PM-7, W-PM-8 | Threshold tracking logic |
| Import History | OB-4B import path | Third-party API complexity |
| AI Features | TBD | Explicitly post-MVP |
| Video Check-ins | Squads extension | Storage and infrastructure |
| Advanced Analytics | — | Premium tier feature |
| Data Export (full) | P-9 partial | Basic export is MVP; analysis is post-MVP |

---

## Future Roadmap — Not Scheduled

- Home Gym (equipment inventory management)
- Gym Discovery (find gyms near user)
- Spotify Integration (playback during workouts)
- Apple Music Integration (playback during workouts)
- Chapter Cover Photos (each chapter can have a featured cover image)
- Wearable Integrations (Apple Watch, Garmin)
- Coach / Trainer Accounts
- Program Marketplace
- Public Profiles
- Journey Sharing (shareable Legacy link)
- Communities (explicitly excluded from MVP and Post-MVP)

---

---

# SECTION 6 — NAVIGATION SYSTEM

## Architecture

```
App Shell
├── Bottom Navigation (4 tabs — always visible except during active workout)
│   ├── Tab 1: Home
│   ├── Tab 2: Workouts
│   ├── Tab 3: Legacy
│   └── Tab 4: Squads
└── Top-Right Avatar → Profile Sheet (modal overlay, accessible from any tab)
```

## Tab: Home

**Purpose:** The emotional anchor and daily entry point. Surfaces the athlete's current story and provides the primary workout CTA.

**Why it exists:** Athletes need one place that shows them where they are in their journey and lets them start a workout in one tap. The D-Lite hero system makes this screen dynamic — it tells the athlete's story differently depending on what they've just achieved.

## Tab: Workouts

**Purpose:** Performance engine. Logging, programs, templates, history.

**Why it exists:** Workouts are the raw material that feeds the Legacy. This tab is purpose-built for the act of training — fast, focused, distraction-free.

## Tab: Legacy

**Purpose:** The story. Chapters, timeline, honors, accomplishments, photos.

**Why it exists:** This is the reason the workout tracker exists. The Legacy tab is where every logged workout becomes part of something permanent. It is the most emotionally valuable tab in the app.

## Tab: Squads

**Purpose:** Accountability and connection. Shared workouts, check-ins, squad activity.

**Why it exists:** Athletes don't train alone. Squads give athletes a small, trusted group for accountability. No public feeds. No follower counts. Just the people you actually train with.

## Profile (Modal Sheet via Avatar)

**Purpose:** Identity and settings. Who you are, your rank, your subscription, your privacy.

**Why it exists:** Profile is not a destination tab. It is a utility sheet. Accessible from anywhere via the top-right avatar. This keeps all four tabs focused on the athlete's journey rather than their settings.

## Navigation Rules

- Tab root screens replace on tap (do not push).
- Each tab maintains its own independent navigation stack.
- Profile is a modal sheet — dismissible, does not replace tab context.
- Global Modals appear over any screen — auto-dismissed or user-dismissed.
- Active Workout screens (W-9 through W-16) are full-screen: top bar and bottom nav are hidden. Back gesture triggers pause/exit confirmation.
- Train Together (S-10) initiates from Squads and crosses into the Workouts stack with partner pre-tagged.

---

---

# SECTION 7 — HOME SYSTEM

## Purpose

Home is the daily dashboard and emotional compass. It shows the athlete where they are, celebrates what they have just achieved, and provides the primary Start Workout action.

## D-Lite Hero

The D-Lite hero is the top-dominant, full-width component on H-1. It is always present. It is the most important visual surface in the app.

The hero displays the athlete's current narrative context. This is not a notification banner. It is not a summary widget. It is the story of where the athlete is right now.

**The Start Workout CTA always lives inside the hero.** Large. Obvious. Present in every hero state. It is not a floating action button. It is not separate from the hero.

## Hero Priority System

Five possible states. Highest priority wins. Only one hero state shows at a time.

| Priority | State | Trigger |
|----------|-------|---------|
| 1 | Goal Achieved | User just met their primary goal |
| 2 | Program Graduation | User just completed the final workout in a program |
| 3 | Major Accomplishment | User just logged a major accomplishment |
| 4 | Ready For Your Next Chapter? | User has no active chapter |
| 5 | Default: Current Chapter | Normal state — chapter active, no override condition |

**Rule:** Only one hero state shows at a time. Losing states queue and surface on next Home load or via notification center. Two heroes never appear simultaneously.

## Start Workout CTA

- Lives inside the D-Lite hero in every state.
- Large. Obvious. Primary.
- Initiates the 3-tap rule: Home → Activity Type Selected = 2 taps. Home → First input logged = 3 taps.
- This placement is locked. It is not floating. It is not a separate button below the hero.

## No Active Chapter State

When a user has no active chapter, the hero displays:

**"Ready For Your Next Chapter?"**

This is an invitation. It is never a gate. Users can:
- Log workouts without an active chapter.
- Progress goals without an active chapter.
- Participate in squads without an active chapter.
- Add photos without an active chapter.

The "Ready For Your Next Chapter?" state exists to encourage, not to block.

## Progress Philosophy

Home surfaces chapter progress, goal progress, and program progress as supporting context beneath the hero. The hero tells the story. The supporting elements show the numbers.

The goal of the Home screen is not to surface data. It is to make the athlete feel like they are in the middle of something worth finishing.

---

---

# SECTION 8 — WORKOUT SYSTEM

## Activity Types (MVP — 8 Types)

| Screen | Type | Key Fields |
|--------|------|-----------|
| W-9 | Strength | Sets, reps, weight |
| W-10 | Run | Distance, time, pace |
| W-11 | Walk | Distance, time |
| W-12 | Bike | Distance, time, elevation |
| W-13 | Swim | Distance, time, strokes |
| W-14 | Mobility | Duration, notes |
| W-15 | Yoga | Duration, notes |
| W-16 | Other | Custom name, duration, notes |

Post-MVP: Custom activity types with user-defined fields.

## Workout Logging

- Entry point: Start Workout CTA inside home hero (primary) or Log Activity in Workouts Hub (secondary).
- Logging screens (W-9 through W-16) are full-screen. Top bar hidden. Bottom nav hidden. Performance-first. Zero decoration.
- Back gesture triggers pause/exit confirmation — not instant exit.
- 3-tap rule is a hard design constraint: enforced in all wireframes.

## Templates

Templates are saved workout structures. Users can browse (W-6), preview (W-7), and launch from a template. Creating templates is available within the Workouts system.

## Programs

Programs are structured training plans with a defined schedule. Key behaviors:
- Programs are browsable in a library (W-2).
- Program Detail (W-3) shows progress bar, next workout, schedule, and fork action.
- Programs can only be edited before any workouts have been logged against them (W-5).
- Programs can be forked/customized. Fork creates a user-owned copy.
- Program version numbers are visible on the detail screen.
- Completing the final workout in a program triggers: Program Graduation state on W-17 → M-4 Program Graduation Modal → Home hero update.

## Workout With Friend

Workout With Friend is an **MVP feature**. It lives in Squads and operates on an **association model, not a sync model**.

**Two initiation paths:**
- Pre-workout: Train Together CTA in Squad Detail (S-2) → Select Partner (S-10) → workout begins with partner pre-tagged → W-8 onward.
- Post-workout: Add Partner option in Workout Summary (W-17) → W-20 Add Workout Partner.

**Consent model (locked):**
- Same squad → Auto-accept. Squad membership = consent to accountability tags.
- Not in same squad → Partner must approve via M-9 (Accept / Decline) before any tag appears anywhere.

**History boundary (locked):**
- User A's Activity History (W-18): Always. It is their workout.
- Squad Activity Feed (S-2): Yes, for all squad-involved tags.
- Partner's Activity History (W-18): No — unless partner explicitly claims it via M-8.
- Partner's Legacy Timeline: No — only if claimed and falls within an active chapter.

**Claim Workout behavior:**
When a partner receives M-8 and taps "Claim Workout," a reference entry is created in their history. This entry contains: activity type, date, duration, and "Trained with [User A]." It is NOT a copy of User A's performance data (weights, reps, distance). The partner's own numbers are not implied. Being present during a workout is not the same as completing a workout.

**Partner selection rules:**
- S-10 (pre-workout): Squad members only.
- W-20 (post-workout): Squad members AND non-squad username search. Non-squad tags require M-9 approval.

## Activity History

- W-18: All past activities. Tagged workouts are labeled "Trained with [Name]."
- W-19: Single activity detail. Shows partner if associated. Shows workout source if claimed from a friend.

## Performance Philosophy

Workout logging is fast and focused. Three taps to first set. No decoration during logging. Summary (W-17) is where the athlete can pause and reflect. The separation between performance (logging) and reflection (summary) is intentional.

## Import System

Program / Chapter Import is an approved MVP feature (Architecture Amendment 001). It allows athletes to bring existing training from structured external files into Forge Legacy as Programs or Chapters.

**Supported formats:** CSV, XLSX, structured copy/paste tables. PDF and image imports are post-MVP.

**Two import destinations:**
- Create Program: imported structure becomes a user-owned program
- Create Chapter: imported structure becomes the initial program of a new chapter; athlete provides Chapter Name and Primary Goal (never inferred by the system)

**Import pipeline:** Upload (W-IM-1) → Parse → Review & Destination (W-IM-2) → [Chapter Setup (W-IM-3) if Chapter path] → Confirm (W-IM-4) → Create

**Core principle:** Review and confirmation always required. No program or chapter is created automatically from an import.

**Entry points:** W-1 Workouts Hub ("Import Training" Secondary CTA), W-2 Programs Browse, L-5 Create Chapter.

**New screens:** W-IM-1 (Import Upload), W-IM-2 (Import Review & Destination), W-IM-3 (Chapter Setup — conditional on Chapter path), W-IM-4 (Import Confirm).

See Architecture Amendment 001 (Docs/Architecture-Amendment-001-Import.md) for complete specification.

---

---

# SECTION 9 — GOALS SYSTEM

## Primary Goals

Every chapter has one primary goal. It is set during chapter creation (or onboarding). It is the central narrative purpose of the chapter.

Primary goal completion triggers:
- M-3 Goal Achieved Modal.
- Home hero updates to "Goal Achieved" state (Priority 1).
- Legacy Timeline entry created.

## Secondary Goals

Chapters can have multiple secondary goals. These support the primary goal. They are tracked in Chapter Detail (L-3) and managed in L-8 Create/Edit Goal.

Secondary goal completion contributes to chapter progress and Legacy Score but does not trigger the Priority 1 home hero state.

## Goal Detail (L-7)

Shows: goal name, progress bar, secondary goals associated with it, and history of progress events.

## Goal Creation / Editing (L-8)

Two-field minimum: goal name and target. Minimal friction. Goal creation during chapter setup is encouraged — not required.

## Goal Completion

Goals can be completed at any time — not only when a chapter is completed. Goal completion is a Legacy moment. It appears in the timeline, surfaces in the hero, and earns recognition in the chapter record.

## Goal Relationships

- Goals belong to chapters. They do not exist independently of a chapter.
- When a chapter is archived, goal outcomes are locked. Achieved or not achieved — the record cannot change.
- A new chapter begins with a fresh set of goals. Past goals remain visible in archived chapter detail but are not editable.

---

---

# SECTION 10 — CHAPTER SYSTEM

## Chapter Philosophy

A chapter is a distinct, intentional period of athletic life. It has a beginning, a purpose, and an end. It is the organizing unit of the Legacy.

Chapters are not mandatory. An athlete who does not create a chapter still has a complete workout history. But the Legacy tab is most powerful when chapters are used — because chapters transform a list of workouts into a story.

## Lifecycle

```
Create Chapter → Active → [Completion Initiated] → Reflection → Archived
```

## Creation

- Minimum 2 fields: chapter name + primary goal.
- Encouraged during onboarding and when the "Ready For Your Next Chapter?" hero is shown.
- Never a gate. Never required to log a workout.
- The creation moment should feel ceremonial — a beginning. Bronze accent, deliberate transition into app.

## Completion

- User initiates from L-3 Chapter Detail (Active) → "Complete Chapter."
- M-5 Confirmation: "This chapter will be sealed. Outcomes cannot be changed."
- User proceeds to L-6 Chapter Reflection: add notes and photos only. Outcomes are not modified here.
- Chapter is then archived. Prompt to start new chapter.

## Archive Rules

- Archived chapters are read-only.
- Outcomes (primary goal achieved/not achieved, secondary goals, programs, honors) are permanently locked.
- Photos and memory notes can be added to an archived chapter even after sealing. These are clearly visually distinct from original content — additions, not edits.
- The "Add a Memory" action in L-4 is for photos and notes only.

## History Protection

Archived outcomes cannot change. This is a feature, not a restriction. Frame it as integrity:
- At chapter creation: "This chapter becomes a permanent part of your legacy."
- At M-5 completion: "This chapter will be sealed. Outcomes cannot be changed."
- In L-4 archived view: "Sealed on [date]" — displayed as a design feature, not a warning.

## Uncategorized Workouts

Users who skip chapter creation will accumulate workouts with no chapter context. These workouts appear normally in W-18 Activity History. In the Legacy tab, they surface in an "Uncategorized" section beneath all chapters, with a contextual prompt: "These workouts don't have a chapter yet. Want to add them to one?" Not an error. Not a wall. A narrative invitation.

*Note: Exact UX for this state to be finalized during wireframe phase.*

---

---

# SECTION 11 — PROGRAM SYSTEM

## Program Philosophy

Programs are structured training plans. They are a tool that serves the chapter — not the other way around. An athlete assigns a program to help achieve a chapter goal. When the program ends, the chapter may continue. When the chapter ends, the program record is sealed with it.

## Structure

- A program has a defined workout schedule (days, workout types, exercise prescriptions).
- Programs show a version number (e.g., v1.0).
- Programs display progress as a bar: X of Y workouts complete.

## Versioning

Programs maintain version numbers. When a user forks a program, the fork creates a new independent version owned by the user. The connection to the original is visible (for context) but not binding.

## Forking

Any program can be forked. Fork creates a user-owned copy. The user can edit the forked version freely. Fork confirmation screen (to be designed in wireframe phase) must make the relationship to the original clear.

## Updates

A program can only be edited before any workouts have been logged against it. Once the first workout is logged, the program structure is locked. This protects history. An edited-in-progress program would mean the record of past sessions refers to a program that no longer exists.

## Graduation

Completing the final workout in a program:
1. W-17 Workout Summary shows "Program Complete" state.
2. M-4 Program Graduation Modal fires.
3. Home hero updates to "Program Graduation" state (Priority 2).
4. Legacy Timeline receives a graduation entry.
5. Prompt to find next program (W-2) or create new program (W-4).

---

---

# SECTION 12 — LEGACY SYSTEM

## Purpose

The Legacy tab is the reason the workout tracker exists. It is where every log entry becomes permanent, where every chapter tells a story, and where the full arc of an athlete's journey is preserved.

The Legacy is the product.

## Legacy Hub Hierarchy (L-1)

Locked order:

1. Current Chapter — featured card (story-first)
2. Featured Legacy Moment — single most recent major milestone
3. Recent Photos — prominent gallery strip (emotional anchor)
4. Timeline Teaser — 2-3 recent chapter entries + "View Full Timeline" CTA
5. Honors — earned count + recent
6. Accomplishments — count + recent

## Timeline (L-9)

- Direction: **Newest First, Grouped by Chapter.**
- Most recent chapter at top. Scrolling down = scrolling into the past.
- Within each chapter group: program graduations, goal achievements, honors earned, photos.
- Tap any moment → detail view.
- Tap chapter header → L-3/L-4 Chapter Detail.
- This is not a social feed. It is a chapter-structured archive.

## Photos (L-15, L-16)

- Free tier: 50 total stored photos.
- Premium: Unlimited.
- Counter always shown on L-15: "X of 50 photos" (free) or "X photos" (premium).
- At photo 51 attempt for free users: M-7 Premium Upsell Sheet fires.
- Downgrade: No photos are deleted. User cannot add new photos while over the free limit. All existing photos remain visible forever.
- Photos can be added to archived chapters as memories.

## Honors

System-awarded achievements triggered by the Forge Legacy honor engine. Earned through workout milestones, consistency markers, and performance achievements. Detailed in Section 13.

## Accomplishments

User-declared real-world achievements. Not system-awarded. Entered manually. Detailed in Section 14.

## Legacy Moments

"Featured Legacy Moment" in the Legacy Hub hierarchy refers to the single most recent major milestone — the most significant honor, accomplishment, or chapter event. This is curated by the system based on recency and significance weight.

## Timeline Rules

- Chapters are the organizing unit. All timeline entries are grouped under the chapter they belong to.
- Workouts logged without a chapter appear in "Uncategorized" in the timeline — not suppressed.
- Adding a memory to an archived chapter adds it to that chapter's section of the timeline, visually marked as a memory addition (not an original entry).

---

---

# SECTION 13 — HONORS SYSTEM

## Definition

Honors are system-awarded achievements. The system grants honors automatically based on what the athlete does. Athletes cannot create honors manually.

Honors are different from Accomplishments: Honors are earned. Accomplishments are declared.

## Examples (illustrative — final honor list to be defined)

- First workout logged
- First program completed
- First chapter completed
- 10 workouts in a single chapter
- 50 total workouts logged
- First goal achieved
- First Workout With Friend completed

## How Honors Are Awarded

When an athlete's activity triggers an honor condition, the system fires:
1. M-2 Honor Earned Modal — interrupts the flow at the appropriate moment (typically W-17 Workout Summary or chapter completion).
2. Honor is added to L-10 Honors List.
3. Honor appears in the chapter record (L-3).
4. Honor appears in the Legacy Timeline (L-9).

## Relationship To Rank

Honors contribute to the athlete's Legacy Score, which drives rank progression. Earning more honors = faster rank progression. However, rank is never the primary goal communicated to the user — the honor itself is the reward.

## Relationship To Legacy

Honors are part of the permanent record. When a chapter is archived, all honors earned within it are sealed in that chapter's record. They cannot be removed.

---

---

# SECTION 14 — ACCOMPLISHMENTS SYSTEM

## Definition

Accomplishments are user-declared real-world achievements. The athlete enters them manually. They are not awarded by the system.

Examples: finishing a marathon, hitting a 315-pound bench press, completing a Spartan Race, earning a belt rank in martial arts, finishing a 100-mile bike ride.

These are things the athlete is proud of that the app cannot automatically detect.

## How Accomplishments Work

- Added via L-14 Add Accomplishment: name + date + optional photo.
- Displayed in L-12 Accomplishments List and L-13 Accomplishment Detail.
- Can be added during onboarding (Experienced Athlete path, OB-5B).
- Prior accomplishments entered during onboarding are added to the Legacy immediately — they represent who the athlete was before Forge Legacy.

## Difference From Honors

| Dimension | Honors | Accomplishments |
|-----------|--------|-----------------|
| Source | System-awarded | User-declared |
| Trigger | App detects milestone | User chooses to add |
| Examples | 10 workouts logged | Marathon finisher |
| Editability | Locked once earned | User can manage |
| Verification | Automatic | User-attested |

## Relationship To Legacy

Accomplishments appear in:
- L-12 Accomplishments List (all accomplishments, all time)
- L-1 Legacy Hub (count + recent)
- The athlete's Profile (P-1, top 3 highlights)
- L-9 Timeline (if associated with a chapter period)

---

---

# SECTION 15 — RANK SYSTEM

## Ranks

The rank system recognizes the depth of an athlete's legacy over time. Rank progression is tied to the Legacy Score — a composite of workouts logged, chapters completed, goals achieved, honors earned, and programs graduated.

Rank tier structure: each rank contains five sub-tiers (I through V). Sub-tiers allow granular progression within a rank without rank-up frequency being too low or too high.

*Final rank names and thresholds to be defined during design phase. The system exists and is locked; the labels are to be named.*

## Sub-Ranks

Each rank is divided into five levels: I, II, III, IV, V. The athlete progresses through sub-ranks before advancing to the next rank. This creates more frequent progression moments without inflating rank names.

## Progression Philosophy

Rank should feel earned. It is not gamification. An athlete who trains consistently for one year should reach a meaningfully different rank than someone who has been training for one month. The pacing is deliberately slow enough to make high ranks feel significant.

Rank is never shown as a primary motivator in the daily flow. It is a background reward system that surfaces in celebrations (M-1 Rank Up) and is always accessible via P-3 Rank Detail.

## Progression Speed

Calibrated so that early progression feels fast (encourages new users) and later progression slows (creates aspirational distance for experienced users). Exact scoring weights to be defined during system design.

## Legacy Score Philosophy

The Legacy Score is the formula behind rank. The athlete never sees the formula. They see their rank name, sub-tier, and progress bar to the next tier.

Legacy Score inputs (approximate, final weights TBD):
- Workouts logged
- Chapters completed
- Primary goals achieved
- Programs graduated
- Honors earned
- Workout With Friend associations

The score rewards breadth and depth of legacy, not daily streaks or raw volume.

---

---

# SECTION 16 — SQUADS SYSTEM

## Purpose

Squads are small, trusted accountability groups. They are not a social network. They are not a public feed. They are the people the athlete actually trains with, or wants to be held accountable to.

## Accountability Philosophy

Squads surface what members have done — never what they have missed.

The Squad Activity Feed shows check-ins, shared accomplishments, and Workout With Friend entries. It does not show missed workouts, broken streaks, inactive periods, or comparison metrics. Accountability through visibility, not shame.

## Privacy Philosophy

No public squad data. Squad members see each other's activity status (Active This Week, Checked In Recently, Due For Check-In) but not private goals, workout details, or personal data beyond what the member has chosen to share.

Non-squad users cannot see squad activity. Squad discovery does not expose squad membership.

## Squad Discovery (Locked)

Three methods — priority order:
1. **QR Code (primary)** — full-screen QR displayed in S-4. Squad creator shares it. Friend scans it.
2. **Squad Search (secondary)** — search by squad name or handle in S-5.
3. **Squad Code (tertiary)** — alphanumeric code entry in S-6.

No contact sync. No phone book access.

## Workout With Friend

Covered in full in Section 8. Summary:
- Lives in Squads. Train Together CTA in S-2 → S-10 Select Partner.
- Association model, not sync model.
- Squad members: auto-accept. Non-squad: requires approval.
- Claiming a workout creates a reference entry, not a data copy.

## Invites

Invites are issued via QR, search, or code. Invited members receive a notification. Joining a squad does not automatically share any personal data beyond name and avatar.

## Activity Feed

"Squad Activity" is the locked name for the feed within S-2 Squad Detail.

Contains:
- Weekly check-ins
- Shared accomplishments
- Workout With Friend entries ("Isaiah + Mike trained together")

Does NOT contain:
- Missed workouts
- Private goals
- Performance numbers (unless explicitly shared by the member)
- Failure data of any kind

---

---

# SECTION 17 — PROFILE SYSTEM

## Athlete Card (P-1)

The athlete's identity in the app. Contains:
- Avatar
- Name
- Athlete type (set during onboarding: Strength / Bodybuilding / Hybrid / Running / Cycling / Combat / General)
- Rank badge with current rank name and sub-tier
- Current chapter + primary goal (or "No active chapter" if none)
- Top 3 accomplishments as highlights

## Settings (P-2 through P-7)

| Screen | Content |
|--------|---------|
| Edit Profile (P-2) | Name, avatar, bio, athlete type |
| Rank Detail (P-3) | Current rank, sub-tier progress, rank history, optional methodology explainer |
| Settings Root (P-4) | Notifications, Privacy, Connected Apps, Account |
| Notifications (P-5) | Push notification preferences per event type |
| Privacy (P-6) | Who can find me, squad visibility, username search opt-out |
| Connected Apps (P-7) | Health app integrations |

## Privacy

Privacy settings live in P-6. Default: usernames are searchable (required for Workout With Friend non-squad tagging). Athletes can opt out of username search.

Squad visibility settings also live in P-6.

## Subscription (P-8)

Free vs Premium feature comparison. Upgrade CTA. Subscription management. Subscription details:
- Free: 50 stored photos, core features
- Premium: Unlimited photos, advanced features (defined at launch)

See Section 18 for full monetization details.

## Rank View (P-3)

Full rank detail — current rank name, sub-tier, progress bar to next sub-tier, full rank history. Optional methodology explainer available here (user chooses to read it — rank formula is never pushed on users). Avatar rank badge is always visible at the top-right of the app. Subtle animation when rank progress crosses 80%.

## Delete Account / Data Export (P-9)

Required pre-launch. Trust and legal compliance. Basic data export is MVP. Advanced export analysis is post-MVP.

---

---

# SECTION 18 — MONETIZATION

**Authority: Monetization Architecture Amendment 001 — MVP Monetization Framework (June 2026)**

The authoritative monetization specification is in `Docs/Amendments/Monetization-Architecture-Amendment-001.md`. This section provides a summary. Refer to the amendment for full behavioral specifications, downgrade rules, and the Future Monetization Decision Framework.

## Core Principle (Locked): Never Charge For History

Historical workout records, chapters, goals, accomplishments, honors, ranks, timeline entries, program records, squad history, and content created by completed imports are always accessible — regardless of subscription tier, downgrade behavior, or account status.

## Free Tier

- Unlimited workout logging, history, chapters, goals, accomplishments, honors, ranks, timeline
- 3 custom programs *(Initial MVP Assumption — Subject to Future Revision)*
- 50 stored photos *(Initial MVP Assumption — Subject to Future Revision)*
- 1 squad *(Initial MVP Assumption — Subject to Future Revision)*
- 1 lifetime import — one successful W-IM-4 confirmation *(Initial MVP Assumption — Subject to Future Revision)*

## Premium Tier

- All free tier features
- Unlimited custom programs
- Unlimited photos
- Unlimited squads
- Unlimited imports
- Future: AI features, advanced analytics, premium legacy tools

## Downgrade Behavior

Downgrade never deletes history or previously created content. Athletes retain everything built. Creation of new items beyond the free tier limit is restricted until upgrade.

## M-7 Premium Upsell Sheet Triggers

- 4th custom program creation attempt (W-4)
- Photo 51 upload attempt (L-15)
- 2nd squad creation/join attempt (S-1, S-3)
- 2nd import attempt (W-1, W-2, L-5 import entry points)

---

---

# SECTION 19 — INFORMATION ARCHITECTURE

## Screen Inventory Summary

| Area | MVP Screens | Post-MVP Screens |
|------|------------|-----------------|
| Onboarding | 11 | — |
| Home | 1 (5 hero states) | — |
| Workouts | 24 | 8 |
| Legacy | 16 | — |
| Squads | 10 | — |
| Profile | 9 | — |
| Global Modals | 9 | — |
| **Total** | **~80** | **8** |

## Navigation Structure

- 4-tab bottom navigation: Home, Workouts, Legacy, Squads.
- Profile as modal sheet via top-right avatar.
- Each tab has independent navigation stack.
- Active workout is full-screen (no top bar, no bottom nav).
- Global modals overlay any screen.

## Expo Router File Structure

```
src/app/
├── _layout.tsx
├── (tabs)/
│   ├── index.tsx                          # H-1 Home
│   ├── workouts/
│   │   ├── index.tsx                      # W-1 Workouts Hub
│   │   ├── programs/[id].tsx              # W-3 Program Detail
│   │   ├── log/[type].tsx                 # W-9 through W-16
│   │   ├── summary.tsx                    # W-17
│   │   ├── history/[id].tsx               # W-19
│   │   └── import/
│   │       ├── upload.tsx                 # W-IM-1 Import Upload
│   │       ├── review.tsx                 # W-IM-2 Import Review & Destination
│   │       ├── chapter-setup.tsx          # W-IM-3 Import Chapter Setup
│   │       └── confirm.tsx                # W-IM-4 Import Confirm
│   ├── legacy/
│   │   ├── index.tsx                      # L-1 Legacy Hub
│   │   ├── chapters/[id].tsx              # L-3 / L-4
│   │   ├── timeline.tsx                   # L-9
│   │   └── photos/index.tsx               # L-15
│   └── squads/
│       ├── index.tsx                      # S-1 Squads Hub
│       ├── [id].tsx                       # S-2 Squad Detail
│       └── [id]/train-together.tsx        # S-10
├── profile/
│   ├── index.tsx                          # P-1 Profile Overview
│   └── settings/[screen].tsx
└── onboarding/
    ├── new/[step].tsx
    └── experienced/[step].tsx
```

Full file structure with all paths is documented in the Phase 2A IA document (2026-06-08).

## Key User Flows

| Flow | Entry | End |
|------|-------|-----|
| New User Onboarding | OB-1 Welcome | H-1 Home |
| Experienced User Onboarding | OB-1 Welcome | H-1 Home |
| Core Workout Loop | H-1 Start Workout (in hero) | H-1 Home after summary |
| Goal Completion | During workout | M-3 → Hero update → Legacy |
| Program Graduation | Final program workout | M-4 → Hero update → Find next |
| Chapter Completion | L-3 "Complete Chapter" | L-6 Reflection → L-4 Archived |
| Squad Creation + Invite | S-1 → Create | S-2 Squad Detail (live) |
| Workout With Friend (pre) | S-2 Train Together | W-17 Summary with partner |
| Workout With Friend (post) | W-17 Add Partner | Tag sent / auto-accepted |
| Program Import | W-IM-1 Import Upload | W-3 Program Detail |
| Chapter Import | W-IM-1 Import Upload | L-3 Chapter Detail (Active) |

## Architecture Decisions (Locked)

| Decision | Resolution |
|----------|-----------|
| Chapters mandatory | NOT mandatory. Invitation only. |
| No Active Chapter hero text | "Ready For Your Next Chapter?" |
| Photo storage model | 50 stored free / unlimited premium / no deletion |
| Timeline direction | Newest First, Grouped by Chapter |
| Legacy Hub hierarchy | Chapter → Moment → Photos → Timeline → Honors → Accomplishments |
| Workout With Friend scope | MVP. Association model. |
| WwF consent model | Squad = auto-accept. Non-squad = M-9 approval required |
| WwF history boundary | Partner claims via M-8. Reference entry only. Not data copy. |
| Squad discovery | QR → Search → Code. No contact sync. |
| Start Workout CTA | Inside the D-Lite hero. Not floating. |
| Active workout UI | Full-screen. No top bar. No bottom nav. |
| Squad Activity Feed name | "Squad Activity" — locked |
| Program / Chapter Import | MVP. CSV, XLSX, structured paste. Program or Chapter destination. |
| Import — file formats | CSV, XLSX, structured copy/paste. PDF and image: post-MVP. |
| Import — automation | None. Review + confirmation always required. |
| Import — Chapter Name/Goal | Always athlete-entered in W-IM-3. Never inferred by the system. |

---

---

# SECTION 20 — FUTURE ROADMAP

All items below are approved future directions. None are MVP or Post-MVP. None should be designed or built without a separate, documented scope decision.

## Home Gym

Equipment inventory management. Track what equipment the athlete owns or has access to. Programs and workouts can be filtered by equipment availability.

## Gym Discovery

Find gyms near the user. Integration with gym directories or maps. Useful for traveling athletes and members looking to train while away from their home gym.

## Spotify Integration

Playback control during active workout sessions (W-9 through W-16). Playlist browsing and playback without leaving the logging screen.

## Apple Music Integration

Same as Spotify Integration — playback during active workouts. Platform choice left to the athlete.

## Chapter Cover Photos

Each chapter can optionally have a featured cover image selected by the athlete. This cover photo appears in the Legacy Hub chapter card, the Chapters List, and archived chapter detail. Creates visual identity for major life periods. Increases emotional attachment to chapters. Improves Legacy browsing experience.

*Status: Future, not MVP, not Phase 2.*

## Video Check-ins

Short video entries within Squads. Replaces or supplements photo check-ins with short-form video. Requires storage and infrastructure work.

## AI Features

Not defined. Explicitly post-MVP. Potential applications include: workout recommendations, program pacing analysis, legacy narrative generation. No scope has been approved.

## Import History (Third-Party)

Import historical workout data from third-party apps (Strava, Apple Health, MyFitnessPal, etc.) during onboarding or post-install. Deferred due to third-party API complexity.

*Note: Program / Chapter Import from CSV/XLSX is an approved MVP feature. See Architecture Amendment 001 and PRD Section 8 — Import System. This Future Roadmap item refers specifically to third-party app API integrations.*

## Events

Race events, competitions, fitness challenges. Browse, register, track, and add to Legacy. Integration with race timing APIs.

## WODs (Workouts of the Day)

Daily structured workouts from a curated library. Custom WOD creator. WOD scoring and history.

## Clubs

Organized groups around a specific discipline (e.g., a local running club, a CrossFit affiliate). Distinct from Squads — larger, more structured, with threshold tracking.

## Additional Future Features

- Wearable integrations (Apple Watch, Garmin)
- Coach / trainer accounts
- Program marketplace (buy/sell/share programs)
- Public profiles (athlete opts in)
- Journey sharing (shareable Legacy link — public or private)

---

---

# SECTION 21 — FORGE LEGACY PRODUCT PRINCIPLES

These are the governing principles behind every product decision. When in doubt, return to these.

---

**The workout tracker is the engine. The Legacy is the product.**
Every feature decision must pass this test: does it make the Legacy more meaningful?

---

**Memories can be added. History cannot be rewritten.**
Archived chapter outcomes are immutable. Adding photos and notes to an archived chapter is allowed. Changing goal outcomes, honor records, or activity data is not.

---

**Never charge for history.**
Premium unlocks future capability. It never restricts, hides, or degrades what the athlete has already built. History is always free. Photos already stored are always visible.

---

**The app rewards transformation, not activity.**
Forge Legacy does not reward streaks, daily check-ins, or raw volume. It rewards chapters completed, goals achieved, programs graduated. The athlete who trains deeply for one year is more honored than the athlete who logs casually every day.

---

**Accountability without shame.**
Squads surface presence, not failure. The activity feed shows what members have done. It never shows what they have missed. No missed workout counts. No broken streaks. No comparison metrics.

---

**Every Legacy starts with a foundation.**
New users are not starting from zero. They are beginning the first chapter of something that will last for decades. The product frames starting — even the first workout — as a meaningful act.

---

**Chapters are optional. Legacy is not.**
Users may skip chapter creation. They will still accumulate a legacy of workouts, honors, and accomplishments. The chapter system is the richest expression of the product — but it cannot be a gate.

---

**Chapters are sealed to protect integrity.**
A chapter that cannot be revised is a chapter that can be trusted. The immutability of archived chapters is not a technical limitation — it is a product principle. The "Sealed on [date]" label is a feature.

---

**70% Luxury Legacy. 30% Performance Tool.**
The product must feel worth keeping. Not worth abandoning after three months. Every design decision should reinforce that the athlete is working with something durable, premium, and meaningful.

---

**Photography over illustration. Story over data.**
When in doubt, show a photo. When in doubt, tell a story. The product is not a dashboard. It is a chronicle.

---

**Three taps. No excuses.**
The workout logging path from Home to first input must never exceed 3 taps. Friction in the daily loop kills retention. Make the hard part easy.

---

**Being present during a workout is not the same as completing a workout.**
Claimed workouts in Workout With Friend are reference entries only. They contain activity type, date, and partner name. They do not copy performance data. The integrity of each athlete's performance record is non-negotiable.

---

**Squad membership is consent to accountability tags.**
Athletes in the same squad have implicitly agreed to be part of each other's accountability record. Pre-workout partner tags are auto-accepted within a squad. Non-squad athletes always require explicit approval.

---

**Never show the formula.**
Rank progression, Legacy Score, honor thresholds — these are internal systems. The athlete sees their rank name, their sub-tier, and a progress bar. The methodology is available in P-3 Rank Detail for those who want it. It is never pushed.

---

**Design empty states as brand moments.**
The first time a user opens Home, Legacy, Workouts, or Squads is a product opportunity. Empty states should express the brand voice, not fill space with placeholder text. "Ready For Your Next Chapter?" is the most important empty state in the app.

---

---

# QUICK CONTEXT FOR FUTURE AI CHATS

> Paste this section into any future Claude or ChatGPT conversation to instantly restore full Forge Legacy context.

---

## What Is Forge Legacy?

Forge Legacy is a fitness legacy app for iOS and Android. It is NOT a workout tracker. The workout tracker is the engine — the Legacy is the product.

Athletes log workouts, complete programs, and achieve goals. All of that raw material builds a permanent, structured record of their athletic journey organized into **Chapters** — distinct, titled, and archivable periods of athletic life (e.g., "The Comeback," "First Marathon Year," "The Cut"). Archived chapters are immutable. History cannot be rewritten.

**Tech stack:** Expo v56, React Native, TypeScript, Expo Router (file-based routing).

**Current phase:** Phase 2A Information Architecture is complete and locked. Phase 2B (wireframes) is next.

---

## Core Navigation

4-tab bottom navigation: **Home | Workouts | Legacy | Squads**

Profile is a modal sheet accessed via top-right avatar — not a tab.

---

## Key Locked Decisions

| Decision | Resolution |
|----------|-----------|
| Chapters mandatory? | No. Optional. Invitation only. Never a gate. |
| No chapter hero text | "Ready For Your Next Chapter?" |
| Start Workout CTA | Lives inside D-Lite hero. Not floating. Always present. |
| 3-tap rule | Home → first input logged = 3 taps max |
| Photo storage (free) | 50 total stored photos |
| Photo storage (premium) | Unlimited |
| Downgrade behavior | No photos deleted. All history visible forever. |
| Timeline direction | Newest First, Grouped by Chapter |
| Legacy Hub order | Chapter → Featured Moment → Photos → Timeline → Honors → Accomplishments |
| Workout With Friend | MVP. Lives in Squads. Association model (not sync). |
| WwF — same squad | Auto-accept. Partner chooses to Claim or Dismiss (M-8). |
| WwF — non-squad | Requires partner approval first (M-9). |
| Claimed workout | Reference entry only: type, date, "Trained with [name]." NOT a data copy. |
| Squad discovery | QR → Search → Code. No contact sync. |
| Squad Activity feed name | "Squad Activity" — locked everywhere |
| Active workout UI | Full-screen. No top bar. No bottom nav. |
| Honors | System-awarded. Not user-created. |
| Accomplishments | User-declared. Not system-awarded. |
| Never charge for history | Principle. Never negotiable. |
| Program / Chapter Import | MVP. CSV, XLSX, structured paste. Program or Chapter destination. |
| Import — automation | None. Review + confirm always required. Name/goal never inferred. |

---

## Brand

- **Feel:** 70% Luxury Legacy / 30% Performance Tool
- **Visual:** Dark charcoal base, warm undertones, bronze accents. Photography over illustration.
- **Voice:** Serious, warm, proud. Not gamified. Not clinical.
- **Rewards:** Transformation, not activity. Chapters completed, goals achieved, programs graduated.

---

## MVP Scope Summary

- 11 onboarding screens (two paths: New to Fitness / Experienced Athlete)
- 1 Home screen (5 D-Lite hero states)
- 24 Workouts screens (8 activity types, programs, templates, logging, history, Workout With Friend, import)
- 16 Legacy screens (chapters, goals, timeline, honors, accomplishments, photos)
- 10 Squads screens (create, invite, activity feed, train together)
- 9 Profile screens (athlete card, rank, settings, subscription, delete account)
- 9 Global modals (rank up, honor earned, goal achieved, program graduation, chapter complete, destructive confirm, premium upsell, WwF squad notification, WwF non-squad request)

**Total: ~80 MVP screens and states**

*(+4 screens from Architecture Amendment 001 — Program / Chapter Import)*

---

## Core Principles (Quick Reference)

1. The workout tracker is the engine. The Legacy is the product.
2. Memories can be added. History cannot be rewritten.
3. Never charge for history.
4. The app rewards transformation, not activity.
5. Accountability without shame.
6. Every Legacy starts with a foundation.
7. Chapters are optional. Legacy is not.
8. Three taps. No excuses.
9. Photography over illustration. Story over data.
10. Being present during a workout is not the same as completing a workout.

---

## What To Ask If Unsure

Before designing, engineering, or planning any Forge Legacy feature, ask:
1. Is this in the MVP scope or is it Post-MVP / Future Roadmap?
2. Does this feature serve the Legacy or just the workout tracker?
3. Does this principle apply: "Never charge for history"?
4. Does this reveal or exploit failure data in any squad or social context?
5. Is the 3-tap rule maintained for the core workout logging path?

---

*Forge Legacy Master PRD — Version 1.0 | June 2026*
*Phase 2A IA: Complete and Locked | Phase 2B: Wireframes*

---

## Amendment Log

| Amendment | Feature | Status | Date |
|-----------|---------|--------|------|
| 001 | Program / Chapter Import (CSV, XLSX, structured paste) | Approved / MVP / Locked | June 2026 |

*Full amendment documents are in Docs/Architecture-Amendment-[N]-[Name].md*

