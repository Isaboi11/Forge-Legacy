# Forge Legacy — Workout Share Result Architecture
## WSR-001 | Version 1.0 | June 2026

**Status:** LOCKED
**Authority:** This document governs all workout sharing, squad check-in, external share card, and share reaction architecture for Forge Legacy MVP.
**Downstream impact:** W-17 (Share CTA), W-19 (Share in overflow), M-1 / M-2 / M-3 / M-4 (Share action in ceremony modals), L-11 (Share honor), S-2 (Check-ins section), AthleteShareSettings (new entity), P-settings (future: share preference surface)

---

## Section 1 — Purpose

### 1.1 What Workout Sharing Is

Workout sharing is a deliberate, athlete-initiated system for celebrating achievements within and beyond Forge Legacy. It exists to close the gap between a moment of accomplishment and the ability to mark, recognize, and express that moment — to a trusted squad, to a friend via text, to the athlete's own social platforms, or to no one at all.

Every share in Forge Legacy is an intentional act. The athlete decides to share. The athlete decides what to include. The athlete decides where it goes. The product provides the tools; it never broadcasts on the athlete's behalf.

### 1.2 What Workout Sharing Is Not

Workout sharing in Forge Legacy is not a social network. It is not a feed. It is not an engagement system. It does not create audiences, follower counts, popularity signals, or comparison metrics.

Specifically, this architecture does not create:

- A public activity feed of what athletes are doing
- A popularity ranking of workouts, athletes, or squads
- Automatic notifications to others when an athlete logs a workout
- Comment sections or threaded discussions
- Public like counts or reaction totals
- Algorithmic content ranking
- Streak pressure ("you haven't shared in 7 days")
- Performance comparison between athletes

### 1.3 Why It Exists

Athletes who complete a program, earn a strength milestone honor, seal a chapter, or log their 100th workout have accomplished something real. The existing architecture records these moments permanently in the athlete's legacy — but does not give the athlete a way to express them outward.

This creates gaps in four areas:

**Motivation:** Accomplishments feel more real when shared with someone who cares. A text to a training partner — "I finally hit 225 on bench" — reinforces the identity the athlete is building. Forge Legacy should support that expression without requiring the athlete to leave the app and screenshot a mediocre-looking data screen.

**Accountability:** Squad accountability is currently presence-based (S-2 shows trained / not trained). A squad member who completes a significant milestone — graduates a program, earns a rank-up — has no way to signal that to their squad beyond passive presence. A lightweight, opt-in check-in surface closes this gap.

**Celebration:** Ceremony modals (M-1 through M-4) mark achievements with dignity. Adding an optional share action at the moment of ceremony allows the athlete to carry that moment outward if they choose — without making sharing the point of the ceremony.

**Organic growth:** When an athlete shares a branded achievement card to Instagram or WhatsApp, they introduce Forge Legacy to people who may never have heard of it. Athlete-initiated sharing is the most authentic form of product marketing because it is not advertising — it is proof.

### 1.4 Core Principle

> **Performance data should never be exposed without athlete intent.**

This replaces a more restrictive interpretation that performance data should never be shared. The distinction is load-bearing:

- Automatic exposure of athlete data to others is prohibited.
- Athlete-controlled export of their own data is permitted.
- Squad accountability surfaces remain presence-focused.
- External sharing is fully athlete-controlled.

The guiding phrase for the share experience:

> **"Share the proof, not the ego."**

---

## Section 2 — Shareable Content

### 2.1 Content Availability by Detail Level

Shareable content is organized into three detail levels that govern external share cards. Squad check-in cards are locked to Achievement level regardless of the athlete's selection (see Section 6 and WSR-D16).

| Content | Achievement | Summary | Detailed | Squad Card |
|---------|-------------|---------|----------|------------|
| Achievement type headline | ✓ | ✓ | ✓ | ✓ |
| Chapter name ("Building → X") | ✓ opt-out | ✓ opt-out | ✓ opt-out | ✓ opt-out |
| Date | ✓ | ✓ | ✓ | ✓ |
| App attribution ("Forge Legacy") | ✓ | ✓ | ✓ | ✓ |
| Athlete display name | ✓ opt-out | ✓ opt-out | ✓ opt-out | ✓ opt-out |
| Workout type label ("Strength", "Run") | — | ✓ | ✓ | — |
| Duration | — | ✓ | ✓ | ✓ (WSR-D6) |
| Program name + session position | — | ✓ | ✓ | — |
| Honor name | — | ✓ | ✓ | ✓ (HONOR_EARNED) |
| Goal name | — | ✓ | ✓ | ✓ (GOAL_ACHIEVED) |
| Rank name (new rank) | — | ✓ | ✓ | ✓ (RANK_UP) |
| "Forging since [Month Year]" | opt-in | opt-in | opt-in | — |
| Full exercise list (sets/reps/weights) | — | — | ✓ | — |

**opt-out:** Included by default; athlete unchecks in share configuration step.
**opt-in:** Not included by default; athlete checks in share configuration step.
**—:** Not available at this level.

### 2.2 Duration in Squad Context

Duration is permitted in squad check-in cards (e.g., "Jordan completed a workout · 1h 15m"). Duration is a presence-quality signal — it communicates showing up and sustaining effort, not strength, speed, or output. It does not create a comparison vector in the way exercise weights do. This is the single exception to the presence-only rule on squad cards and is consistent with how training partners naturally speak about workouts ("I trained for over an hour today").

### 2.3 Content That Is Never Shareable

The following is excluded from all share contexts in MVP:

| Content | Reason |
|---------|--------|
| Progress percentages (goal %, chapter %, program %) | Comparison vector; reveals quantitative gap to others |
| Chapter notes | Always private; authored for the athlete's own reflection |
| Photos | Post-MVP consideration; consent model for tagged subjects needed |
| Other athletes' data | No consent mechanism exists |
| Workout streaks | No streak system in Forge Legacy product DNA |
| Total volume calculations | Analytics infrastructure not built; not surfaced in app |
| Session-level PR comparisons ("beat last session by 5 lbs") | Not surfaced in app; requires analytics infrastructure not in MVP |

### 2.4 Personal Records and the Honor System

Session-level PR comparisons ("you beat your last bench press by 5 lbs") are not surfaced in Forge Legacy's existing architecture (W-17 and W-19 have no PR indicators by design). The share architecture does not introduce PR tracking that the core product does not surface.

Strength milestone honors (bench press 225 lbs, squat 315 lbs, club totals, etc.) serve as the canonical PR recognition mechanism. These are stored in `HonorInstance.metadata` with the achieved weight. An HONOR_EARNED share for a strength milestone provides authentic PR celebration — "I earned the Bench Press: 225 lbs honor" — without requiring a separate PR comparison engine.

At the Detailed external share level, athletes may include their full logged exercise data from the session. This allows an athlete to share "Squat: 225×5, 245×5, 265×3" without the app needing to compute whether these were PRs. The athlete knows; the share is their expression of that.

---

## Section 3 — Share Destinations

### 3.1 MVP Destinations

| Destination | Type | Mechanism |
|-------------|------|-----------|
| Native Share Sheet | External | OS share sheet → any installed app (iMessage, WhatsApp, Instagram, Facebook, email, etc.) |
| Squad Check-in Card | Internal | 48h card in S-2 Check-ins section for selected squads |
| Squad Notification | Internal | Optional push notification accompanying the check-in card |

The native share sheet is the correct abstraction for all external destinations. Any app the operating system exposes is a valid target. Forge Legacy does not manage platform-specific integrations — it generates the share artifact and hands off to the OS.

### 3.2 Squad Sharing Details

When an athlete shares to a squad:
- A check-in card is created in the Check-ins section of S-2 for each selected squad
- An optional push notification fires to all members of each selected squad
- If the athlete belongs to multiple squads, they select which squads receive the share
- The push notification is controlled by the recipient's notification settings (squad members can mute squad notifications independently)

Squad notification text: **"[Display Name] completed a workout."** (or appropriate share type variant) + athlete's optional message if provided. Squad members tap notification → S-2 Squad Detail for the relevant squad opens.

### 3.3 Post-MVP Destinations

| Destination | Notes |
|-------------|-------|
| Public Recap Link | Unlisted UUID-based URL (`forgelegacy.app/r/[uuid]`); renders public recap page; requires UNLISTED or PUBLIC visibility |
| Copy Link | Same URL as public recap link, copied to clipboard manually |

Public recap links are not part of MVP. The WorkoutShare data model reserves `shareLink` and the UNLISTED visibility tier for this purpose. See Section 7.3.

---

## Section 4 — Privacy Architecture

### 4.1 Three-Tier Athlete Visibility

Athlete visibility is a global setting stored in `AthleteShareSettings.globalVisibility`. It governs what other Forge Legacy athletes can see about an athlete's shares within the product. It does not restrict external sharing (the athlete always controls what they export from the app).

| Tier | Internal Effect | External Effect |
|------|-----------------|-----------------|
| **PRIVATE** (default) | Squad check-in cards disabled. Squad notifications disabled. No profile share surface. | External sharing fully available — athlete exports via native share sheet. |
| **SQUAD_ONLY** | Squad check-in cards and notifications enabled for squads the athlete selects per share. | External sharing fully available. |
| **PUBLIC** (future) | All SQUAD_ONLY effects, plus: share links generate accessible public URLs; public profile page surfaces WorkoutShare records with PUBLIC visibility. | Public recap pages accessible to anyone with the link or URL. |

New athletes default to PRIVATE. This is conservative by design — the athlete must actively opt into squad visibility.

### 4.2 Per-Share Override

Each `WorkoutShare` record has its own `visibility` field that defaults to the athlete's current `globalVisibility` at the time of share creation. The athlete may override this per share.

**Override examples:**
- A PRIVATE athlete can choose to share a specific honor externally without changing their global setting. Their squad still receives nothing; the external share goes to the native share sheet.
- A SQUAD_ONLY athlete can mark a specific achievement PRIVATE and not send it to their squad even though their global setting would permit it.

`WorkoutShare.visibility` is immutable after creation. Changing the global setting later does not retroactively affect existing share records.

### 4.3 Link Behavior (MVP)

MVP generates no public links. External shares produce a share card image and a text snippet only. The native share sheet handles transmission to other platforms.

### 4.4 Link Behavior (Post-MVP)

When UNLISTED links are introduced:
- URL format: `forgelegacy.app/r/[WorkoutShare.id UUID]`
- Not indexed by search engines
- Accessible to anyone who has the URL
- Generated only for WorkoutShare records with `visibility: UNLISTED` or `PUBLIC`
- The athlete must have globalVisibility of SQUAD_ONLY or PUBLIC to generate unlisted links (PRIVATE athletes cannot generate links)

### 4.5 Visibility Inheritance Rules

- Changing `globalVisibility` does not retroactively affect existing `WorkoutShare` records.
- Each `WorkoutShare.visibility` is set at creation and immutable.
- Deleted squads: WorkoutShare records referencing the deleted squad's ID are retained. Squad notification and check-in delivery for that squad stops immediately. The WorkoutShare record remains for the athlete's own history.
- Squad removal: If an athlete is removed from a squad, they can no longer create check-in cards for that squad. Existing check-in cards already created before removal are removed from the squad's Check-ins view immediately.

---

## Section 5 — Share Types

### 5.1 MVP Share Types

| Type | Trigger | Primary Entry Point | Secondary Entry Points |
|------|---------|---------------------|------------------------|
| `WORKOUT_COMPLETE` | Any workout session saved | W-17 "Share" CTA | W-19 overflow menu (⋯) |
| `PROGRAM_GRADUATED` | Final slot of active program logged | M-4 modal "Share" action | W-17 (post M-4 ceremony), W-19 |
| `HONOR_EARNED` | One or more HonorInstances awarded in session | M-2 modal "Share" action | W-17 (post M-2 ceremony), W-19, L-11 |
| `GOAL_ACHIEVED` | Athlete marks goal as achieved | M-3 modal "Share" action | G-2 Goal Detail, W-19 |
| `RANK_UP` | Rank family advancement | M-1 modal "Share" action | P-1 Profile (post-MVP retrospective) |

### 5.2 Share Type Content Mapping

Each share type generates a type-specific `ShareContent` payload:

**WORKOUT_COMPLETE:**
- Headline: "Workout Complete"
- Subheadline (Summary/Detailed): "[Workout Name]" or "[Activity Type]" + duration
- Context: "Building → [Chapter Name]" if chapter active
- Highlights: duration (Summary+), program position if program-launched (Summary+), exercise count (Summary+)
- ExerciseData: full exercise list (Detailed only)

**PROGRAM_GRADUATED:**
- Headline: "Program Graduated"
- Subheadline: "[Program Name]"
- Context: "[X] weeks · [Y] workouts" (always shown; this is achievement data, not comparison data)
- Highlights: duration of program, chapter context if applicable

**HONOR_EARNED:**
- Headline: "Honor Earned" (single) or "Honors Earned" (multiple)
- Subheadline: Honor display name from `HonorInstance.displayName`
- Highlight (if strength honor): achieved weight from `HonorInstance.metadata.weightDisplay`
- If multiple honors in one session, athlete selects one to feature or shares all in a list

**GOAL_ACHIEVED:**
- Headline: "Goal Achieved"
- Subheadline: Goal name
- Context: Chapter name (if chapter active at achievement)

**RANK_UP:**
- Headline: "Rank Advancement"
- Subheadline: New rank family name
- Highlights: "Forging since [Month Year]" (optional)

### 5.3 Non-MVP Share Types

The following types are reserved but not implemented in MVP:

| Type | Reason Deferred |
|------|-----------------|
| `CHAPTER_SEALED` | Sealing ceremony is intentionally private by design. Chapter sealing is a personal culmination, not a public announcement. Post-MVP evaluation required. |
| `PARTNER_WORKOUT` | Including a WwF partner's identity in a share broadcast requires a new consent model beyond existing M-8/M-9. Post-MVP. |
| `WORKOUT_MILESTONE` | Milestone-based sharing ("50th workout!") requires analytics infrastructure not in MVP scope. Milestone honors (Training family: 50 Workouts, 100 Workouts, etc.) are shareable via HONOR_EARNED instead. |
| `PROGRAM_STARTED` | Starting a program is a commitment, not an achievement. No share type warranted. |

---

## Section 6 — Internal Share Architecture

### 6.1 Squad Check-in Surface

A **Check-ins** section is added to S-2 Squad Detail. This section provides the accountability visibility that notification-only sharing cannot reliably deliver — squad members who are offline when a notification fires would otherwise miss the signal entirely.

**Placement in S-2:** Check-ins appears at the top of S-2 Squad Detail, above the member presence list. When no active check-in cards exist, the section is absent entirely — no empty state, no placeholder.

### 6.2 Check-in Card Rules

| Rule | Value |
|------|-------|
| TTL | 48 hours from `WorkoutShare.createdAt` |
| Maximum cards per squad | 5 visible at any time |
| Overflow behavior | If a 6th card arrives while 5 exist, the oldest is removed from the visible list (the WorkoutShare record is retained) |
| Order | Most-recent-first (chronological, no algorithm) |
| Expiry behavior | Card disappears at TTL. Section disappears when all cards expire. |
| "Load more" | Does not exist. No infinite scroll. No pagination. |

### 6.3 Check-in Card Content

Check-in cards contain presence and achievement signals only. Performance data is never present in squad check-in cards (WSR-D6).

**Card content by share type:**

| Share Type | Card Text |
|------------|-----------|
| `WORKOUT_COMPLETE` | "[Name] completed a workout · [duration if logged]" |
| `PROGRAM_GRADUATED` | "[Name] graduated from [Program Name]" |
| `HONOR_EARNED` | "[Name] earned [Honor Name]" |
| `GOAL_ACHIEVED` | "[Name] achieved their goal: [Goal Name]" |
| `RANK_UP` | "[Name] advanced to [Rank Name]" |

Below the primary line:
- Athlete's optional message (if provided, ≤140 chars)
- Time elapsed ("2 hours ago", "Yesterday")
- Reactions: shown only if reactions exist; displays "[Name], [Name2] reacted 🔥💪" — never an aggregate count

**Tapping the card:** Opens the athlete's Limited Athlete Profile modal (same modal as S-2 member row tap). No deep link into the athlete's workout history, chapter, or legacy data.

**Content that never appears on a check-in card:**
- Exercise names, sets, reps, weights
- Total volume or session statistics
- Progress percentages
- Goal progress or chapter progress
- Photos
- Detail above what the card type specifies

### 6.4 Reactions

Squad members may react to check-in cards with a fixed emoji set. Reactions are private to the squad.

**Fixed reaction set:** 🔥 💪 🎯 ❤️

**Behavior rules:**
- One reaction per squad member per card (selecting a new emoji replaces the previous one)
- Reactions are visible to all squad members on the card — shown as individual names: "Maya, Jordan reacted 🔥💪"
- Aggregate reaction counts are never displayed (no "4 reactions" label)
- No push notification fires to the sharing athlete per individual reaction
- Optional bundled notification available to the sharing athlete: "Your squad showed up for you." — off by default in `AthleteShareSettings.reactionsNotificationEnabled`; fires at most once per 24h per WorkoutShare regardless of how many squad members react
- Reactions are cascade-deleted when the check-in card's 48h TTL expires
- Reactions are private to the squad — they are not visible on any external share, public profile, or other surface

**Why reactions are permitted (see WSR-D14):** The Product DNA prohibition on "like systems" targets public approval mechanics — visible counts from strangers, algorithmic amplification, social proof for external audiences. A private reaction from a known, trusted squad member in a group of max 10 is categorically different. It is encouragement, not vanity. The constraints above (no counts, no notification loop, private context, expires in 48h) maintain that distinction.

### 6.5 Squad Notification Flow

When an athlete creates a squad share:

1. Athlete completes workout or triggers ceremony (M-1/M-2/M-3/M-4)
2. Share configuration step opens (see Section 8.3)
3. Athlete selects which squads to include
4. Athlete adds optional message (≤140 chars)
5. Athlete selects detail level (for external share — does not affect squad card)
6. WorkoutShare record created; `checkInExpiresAt` set to 48h from now
7. Check-in card appears in Check-ins section of S-2 for each selected squad
8. Push notification fires to all members of each selected squad (subject to their notification settings)
9. Squad members who open S-2 see the check-in card with no notification required

### 6.6 Profile Integration

`P-1 (Profile)` already surfaces Top 3 accomplishments and Top 3 recent honors. These update automatically from the `Accomplishment` and `HonorInstance` records — no `WorkoutShare` entity involvement required. Profile is not a share destination in MVP; it reflects the athlete's permanent record, not their sharing activity.

### 6.7 Post-MVP Squad Feed (Architecture Reserved)

If a persistent squad activity feed is added to S-2 post-MVP, the `WorkoutShare` data model fully supports it. `squadIds`, `content.headline`, `athleteMessage`, and the `ShareReaction` sub-entity provide all necessary data for rendering persistent feed cards. Adding a persistent feed would require an explicit product decision and a formal DNA review — it is not authorized by WSR-001.

---

## Section 7 — External Share Architecture

### 7.1 Output Formats

External sharing produces one or more of the following outputs, which are handed to the native OS share sheet:

**1. Share Card (image) — Primary format**

A rendered image generated client-side from the `ShareContent` payload. Three visual templates:

| Template | Used For |
|----------|----------|
| WorkoutComplete Card | `WORKOUT_COMPLETE` shares |
| Achievement Card | `PROGRAM_GRADUATED`, `HONOR_EARNED`, `GOAL_ACHIEVED`, `RANK_UP` |
| Rank Card | `RANK_UP` (alternative high-emphasis template) |

Card design principles (visual spec deferred to future share card design system — see Section 11.5):
- Dark background, typographic-first, minimal visual elements
- Achievement headline is the largest typographic element
- Context line ("Building → [Chapter Name]") is secondary
- Forge Legacy app attribution is always present and legible
- At Detailed level, exercise data renders as a clean typographic list — not a database table, not a grid
- The card should feel earned and substantial — not a screenshot of a data screen

**2. Text Snippet — Plain text fallback**

Auto-generated from `ShareContent`. Used by platforms that display text alongside images or when the athlete prefers to share text-only.

Examples:
- WORKOUT_COMPLETE (Achievement): "Completed a workout building toward Iron Era. Forging with Forge Legacy."
- PROGRAM_GRADUATED (Achievement): "Graduated from Strength Foundation I. 8 weeks · 24 workouts. A permanent mark in my legacy. | Forge Legacy"
- HONOR_EARNED: "Earned the Bench Press: 225 lbs honor. A permanent part of my legacy. | Forge Legacy"

**3. Link — Post-MVP only**

Unlisted UUID URL to the public recap page. Not generated in MVP.

### 7.2 Detail Level and Card Rendering

The share card renders differently based on `WorkoutShare.detailLevel`:

**Achievement level:** Identity-focused. The headline and chapter context are the entire message. No stats, no numbers (except program graduation stats which are achievement data, not performance data). This is the default — Forge Legacy leads with who the athlete is.

**Summary level:** Adds workout type label, duration, and one notable contextual stat (program position, honor name, exercise count). The card remains clean and readable. Stats are supporting context, not the headline.

**Detailed level:** Adds the full exercise list from `ShareContent.exerciseData`. Each exercise renders as "[Exercise Name] — [sets × reps] at [weight]" or similar typographic treatment. This is the most data-rich output but remains under the Forge Legacy visual identity. The card may be longer to accommodate the exercise list.

### 7.3 Public Recap Page (Post-MVP)

When public recap pages are introduced:
- URL: `forgelegacy.app/r/[WorkoutShare.id]`
- Privacy gate: `WorkoutShare.visibility` must be UNLISTED or PUBLIC
- No authentication required to view
- Renders `WorkoutShare.content` as a branded, public-facing page
- Page shows: achievement headline, context, highlights, exercise data (if Detailed), app download CTA
- No social engagement mechanics on the recap page (no comments, no reactions, no sharing from the page)
- Indexed by search engines only if `visibility: PUBLIC` and athlete has opted into public indexing (future setting)

---

## Section 8 — Workout Completion Integration

### 8.1 Entry Points

Sharing is available from six locations. All are opt-in — the athlete must take an explicit action to initiate sharing at each point.

| Entry Point | Context | Share Types Available |
|-------------|---------|----------------------|
| W-17 (post-workout summary) | Primary — athlete has just finished a workout | WORKOUT_COMPLETE (default), plus any types from ceremonies that fired |
| M-1 modal (Rank Up) | Fires before W-17 loads; athlete just advanced rank | RANK_UP |
| M-2 modal (Honor Earned) | Fires at W-17 load; athlete just earned honors | HONOR_EARNED |
| M-3 modal (Goal Achieved) | Fires at G-2 when athlete marks goal achieved | GOAL_ACHIEVED |
| M-4 modal (Program Graduated) | Fires at W-17 load; athlete just finished a program | PROGRAM_GRADUATED |
| W-19 (Activity Detail) | Retrospective — athlete revisits any past session | WORKOUT_COMPLETE + any types from that session |
| L-11 (Honor Detail) | Retrospective — athlete taps a specific honor | HONOR_EARNED (for that HonorInstance) |

### 8.2 Ceremony Modal Integration (M-1 through M-4)

The existing ceremony sequence fires in priority order: M-1 → M-3 → M-4 → M-2. Each ceremony modal adds a subtle "Share" action as a secondary action below the primary "Continue" button.

The share action is visually subordinate — it does not compete with the ceremony. The ceremony is the point; sharing is an optional extension of that moment. Tapping "Continue" closes the modal and proceeds to the next ceremony or to W-17 without penalty.

**M-1 (Rank Up):** "Share this advancement" → opens share configuration with RANK_UP type pre-selected.
**M-2 (Honor Earned):** "Share this honor" → opens share configuration with HONOR_EARNED type pre-selected. If multiple honors, athlete selects which to share (or shares all).
**M-3 (Goal Achieved):** "Share this achievement" → opens share configuration with GOAL_ACHIEVED type pre-selected.
**M-4 (Program Graduated):** "Share this graduation" → opens share configuration with PROGRAM_GRADUATED type pre-selected.

### 8.3 Share Configuration Step

When an athlete taps any Share action, a share configuration step opens within the app before the OS share sheet. This step is the control surface for the share — the athlete reviews and adjusts what will be shared and where.

**Share configuration step contains:**
1. **Preview** — A visual preview of the share card at the selected detail level (updates in real time as options change)
2. **Detail level selector** — Achievement / Summary / Detailed (Achievement is pre-selected based on `AthleteShareSettings.defaultDetailLevel`)
3. **Content toggles:**
   - Include name (on by default per `AthleteShareSettings.includeNameByDefault`)
   - Include chapter context (on by default per `AthleteShareSettings.includeChapterByDefault`)
   - Include "Forging since" (off by default)
4. **Destination section:**
   - Share to squad toggle (visible only if `globalVisibility` is SQUAD_ONLY) — shows squad picker if athlete is in multiple squads
   - Optional squad message field (≤140 chars; appears when squad share is enabled)
5. **Primary action:** "Share" → opens native OS share sheet (external) and simultaneously creates check-in card(s) (internal, if squad selected)

The squad card is always created at Achievement level, regardless of what detail level the athlete selects for the external card. The athlete is shown a note: "Your squad will see the check-in summary. Exercise details appear in your external share only."

### 8.4 W-17 Share CTA Placement

On W-17 (Workout Summary), the "Share" CTA is placed as a secondary action below the "Done" primary button. It is always visible regardless of `AthleteShareSettings.globalVisibility` — external sharing is available to all athletes. Squad sharing options within the configuration step are conditional on settings.

If ceremonies fired during the W-17 load (M-1, M-2, M-4), those ceremonies present their own share actions. The W-17 Share CTA defaults to WORKOUT_COMPLETE and does not duplicate the ceremony's specific share type. An athlete who shares from M-4 and then again from W-17 creates two WorkoutShare records — one PROGRAM_GRADUATED, one WORKOUT_COMPLETE.

### 8.5 W-19 Retrospective Sharing

Athletes may share any past session from W-19 (Activity Detail) via the overflow menu (⋯). There is no time limit on retrospective sharing — an athlete may share a session from six months ago. The WorkoutShare record is created at the time of the share action, not at the time of the session.

Retrospective shares from W-19 offer WORKOUT_COMPLETE by default. If the session also resulted in program graduation or honors, those share types are additionally available from the overflow menu.

---

## Section 9 — Data Model

### 9.1 AthleteShareSettings

One record per athlete, created with default values when the athlete's account is created.

```
AthleteShareSettings {
  athleteId:                      uuid                                       // PK; 1:1 with Athlete
  globalVisibility:               'PRIVATE' | 'SQUAD_ONLY' | 'PUBLIC'       // default: PRIVATE
  includeNameByDefault:           boolean                                    // default: true
  includeChapterByDefault:        boolean                                    // default: true
  defaultDetailLevel:             'ACHIEVEMENT' | 'SUMMARY' | 'DETAILED'    // default: ACHIEVEMENT
  squadNotificationsEnabled:      boolean                                    // default: false
  reactionsNotificationEnabled:   boolean                                    // default: false
  updatedAt:                      timestamp
}
```

`squadNotificationsEnabled` controls whether squad members receive a push notification when the athlete creates a squad share. (This is distinct from whether squad members can *see* the check-in card — they always see it if they open S-2.)

`reactionsNotificationEnabled` controls whether the athlete receives a bundled notification when squad members react. Bundled = at most once per 24h per WorkoutShare; not per individual reaction.

### 9.2 WorkoutShare

The central entity for all share events. One record per share action.

```
WorkoutShare {
  id:                   uuid
  athleteId:            uuid
  shareType:            'WORKOUT_COMPLETE' | 'PROGRAM_GRADUATED' | 'HONOR_EARNED'
                        | 'GOAL_ACHIEVED' | 'RANK_UP'
  sourceEntityType:     'WORKOUT_SESSION' | 'PROGRAM_INSTANCE' | 'HONOR_INSTANCE'
                        | 'GOAL' | 'RANK_EVENT'
  sourceEntityId:       uuid                    // ID of the source record
  destinations:         ShareDestination[]      // all destinations for this share
  visibility:           'PRIVATE' | 'SQUAD_ONLY' | 'UNLISTED' | 'PUBLIC'
  detailLevel:          'ACHIEVEMENT' | 'SUMMARY' | 'DETAILED'
  content:              ShareContent            // snapshot at creation time; immutable
  squadIds:             uuid[]                  // squads that received the check-in card
  athleteMessage:       string | null           // ≤140 chars; athlete-written
  checkInExpiresAt:     timestamp | null        // 48h from createdAt if squad destination included
  externalSharedAt:     timestamp | null        // when OS share sheet was opened; null if external was not selected
  shareLink:            string | null           // post-MVP: public recap URL
  createdAt:            timestamp
}

ShareDestination: 'EXTERNAL' | 'SQUAD_NOTIFICATION' | 'PUBLIC_LINK'
```

A WorkoutShare record with `destinations: ['EXTERNAL', 'SQUAD_NOTIFICATION']` represents a share that was sent both to the OS share sheet and to one or more squads. The `squadIds` field specifies which squads.

### 9.3 ShareContent

Snapshot of the content at share creation time. Immutable. Stored embedded in WorkoutShare.

```
ShareContent {
  detailLevel:      'ACHIEVEMENT' | 'SUMMARY' | 'DETAILED'
  headline:         string               // "Workout Complete" / "Program Graduated" / etc.
  subheadline:      string | null        // "Strength Foundation I · Session 12 of 24"
  contextLine:      string | null        // "Building → Iron Era"
  highlights:       ShareHighlight[]     // ordered list of notable facts
  exerciseData:     ShareExercise[] | null  // DETAILED level only; null at other levels
  athleteName:      string | null        // null if athlete opted out of name inclusion
  forgingSince:     string | null        // "January 2025" if opted in; null otherwise
  date:             date                 // calendar date of the share (not the source event)
  appAttribution:   'Forge Legacy'       // always present; literal string
}

ShareHighlight {
  label:   string          // "Duration" / "Honor Earned" / "8 weeks · 24 workouts"
  value:   string | null   // "1h 04m" / "Bench Press: 225 lbs" / null
}

ShareExercise {
  name:   string               // Exercise display name, snapshotted at share time
  sets:   ShareExerciseSet[]
}

ShareExerciseSet {
  weight:   string | null      // "225 lbs" or "100 kg" — formatted display string
  reps:     number | null
  notes:    string | null      // per-set notes if present
}
```

`ShareContent.date` is the date of the share action, not necessarily the date of the source workout. An athlete sharing a session from W-19 retrospectively on a different day: `date` reflects the share date; the source session date is available via `sourceEntityId` if needed for display.

**Why content is snapshotted:** If the athlete later renames their chapter, the share card continues to show the chapter name at time of sharing. If an exercise is deleted from the exercise library, the shared exercise name is preserved. Consistent with "History Cannot Be Rewritten."

### 9.4 ShareReaction

Tracks individual reactions from squad members to check-in cards.

```
ShareReaction {
  id:                   uuid
  workoutShareId:       uuid              // FK to WorkoutShare
  reactorAthleteId:     uuid              // FK to Athlete (the reactor)
  squadId:              uuid              // the squad in which the reaction was made
  emoji:                '🔥' | '💪' | '🎯' | '❤️'
  createdAt:            timestamp
}
```

Uniqueness constraint: `(workoutShareId, reactorAthleteId, squadId)` — one reaction per member per squad per share card. Changing emoji is an upsert on this key.

Lifecycle: ShareReaction records are cascade-deleted when the parent WorkoutShare's `checkInExpiresAt` passes. Reactions have no permanence beyond the check-in card's 48h window.

### 9.5 Entity Relationships

```
Athlete
  └── AthleteShareSettings (1:1)
  └── WorkoutShare[] (1:many)
        └── ShareReaction[] (1:many)

WorkoutShare
  ├── sourceEntityId → WorkoutSession | ProgramInstance | HonorInstance | Goal | RankEvent
  ├── squadIds[] → Squad[]
  └── content: ShareContent (embedded)
```

WorkoutShare does not create foreign keys into WorkoutSession, ProgramInstance, etc. — `sourceEntityId` is a reference for navigation, not a referential integrity constraint. This preserves the ability to delete or archive source records without affecting share history.

---

## Section 10 — Non-Behaviors

This architecture does not and will not include the following:

| Non-Behavior | Reason |
|-------------|--------|
| Comments on any share | Comments create social pressure, trolling risk, and engagement loops. Shares in Forge Legacy are one-directional expressions, not conversation starters. |
| Aggregate reaction counts ("3 🔥") | A reaction count is a social proof metric. Displaying a count turns encouragement into popularity measurement. Individual names shown; counts never. |
| Per-reaction push notifications to the sharer | Per-notification dopamine loops are the engine of social media addiction. A single bundled notification (opt-in, off by default) breaks the loop while preserving awareness. |
| Reactions on external shares or public content | Reactions are bounded to the private squad context. They do not exist on the native share sheet output, on external platforms, or on future public recap pages. |
| Follower or following mechanics | No audience systems. Athletes share to squads they chose, or externally to platforms they control. |
| Automatic sharing on any trigger | Nothing is ever shared without an explicit athlete action. Completing a workout, earning a honor, or advancing a rank does not automatically notify any other athlete. |
| Streak-based share types | No streak system exists in Forge Legacy product DNA. Streak pressure is explicitly prohibited. |
| Performance data in squad check-in cards | Squad members never see sets, reps, weights, or volume. Presence-signal only. Duration is the single permitted exception (WSR-D6). |
| Progress percentages in any share | Goal %, chapter %, and program % are comparison vectors. They reveal the gap between where the athlete is and where they want to be — information that belongs to the athlete alone. |
| WwF partner identities in shares | Existing WwF consent (M-8/M-9) covers the tagger's own workout record. It does not extend to including a partner's name in a share broadcast to others. |
| Cross-squad share visibility | A check-in card created for Squad A is not visible in Squad B. Each squad is a separate accountability context. |
| Push notifications to non-squad contacts | Forge Legacy only notifies members of squads the athlete explicitly selected for the share. |
| "Share to unlock" gamification | Sharing is never a prerequisite for earning an honor, accessing a feature, or advancing in any system. |
| Algorithm-driven share prompts | No "you haven't shared in 7 days" or "share your streak to keep it alive" mechanics. |
| Public leaderboards from share data | WorkoutShare data does not feed any ranking or comparison system. |
| Infinite-scroll check-in history | Max 5 check-in cards per squad. No "load more." No feed mechanics. |
| Permanent check-in cards | All check-in cards expire at 48h. No share accumulates permanently in the squad view. |
| Reactions from non-squad members | Reactions are available only to members of the squad where the check-in card was created. |

---

## Section 11 — Future Expansion Compatibility

### 11.1 Public Athlete Profiles

`AthleteShareSettings.globalVisibility = 'PUBLIC'` is designed in. A public athlete profile page can read `WorkoutShare` records where `visibility: PUBLIC` and display them in a curated format without requiring a schema migration. The athlete's declared public visibility preference is the single gate.

### 11.2 Public Workout Recap Pages

`WorkoutShare.shareLink` (currently null in MVP) is reserved for the public recap URL. The URL scheme `forgelegacy.app/r/[WorkoutShare.id]` is architecturally reserved. The UNLISTED visibility tier is designed into the schema. Introducing public recap pages post-MVP requires only: server-side route rendering, CDN caching, and the UI for the page — the data model requires no migration.

### 11.3 Community Challenges

`WorkoutShare.shareType` is an enum. Adding `CHALLENGE_COMPLETED` as a new value introduces challenge sharing without altering existing records or queries. Challenge-related share logic is isolated to the new enum value.

### 11.4 Coach Sharing

The squad notification model is role-agnostic at MVP (all squad members receive notifications equally). A COACH role in the squad permission model (post-MVP, if added to S-3) can receive richer content than member peers — for example, a coach could receive exercise-level detail in their notification even if the athlete's global setting is SQUAD_ONLY. This extension is a notification delivery policy change, not a schema change.

### 11.5 Share Card Visual System (Future)

The `WorkoutShare` and `ShareContent` architecture is designed to remain compatible with a future branded share-card visual system without requiring schema redesign.

Future share card types may include:
- Workout Complete Card
- Honor Earned Card
- Goal Achieved Card
- Program Graduated Card
- Rank Up Card
- Detailed Workout Card
- Chapter Milestone Card

These visual systems are not part of WSR-001 MVP and are not designed in this document.

`ShareContent` provides all data needed to render any of these card types: `headline`, `subheadline`, `contextLine`, `highlights`, `exerciseData`, `athleteName`, `forgingSince`, `date`, and `appAttribution`. A future visual card system reads from `ShareContent` and applies visual templates — no content schema changes required.

Any future visual card system must continue to follow Forge Legacy principles:
- Identity before performance
- Achievement before comparison
- Celebration before vanity

### 11.6 Transformation Journeys

`CHAPTER_SEALED` is reserved as a share type. The `WorkoutShare` data model supports it with `sourceEntityType: 'CHAPTER'`. Chapter-level sharing — "I sealed my Iron Era chapter, 8 months and 127 workouts" — is architecturally compatible. It requires a product decision and explicit DNA review before implementation, because the sealing ceremony (M-5 / L-6) is intentionally private by design in MVP.

### 11.7 Partner Workout Shares

`WorkoutShare.sourceEntityType` can accommodate `'WwF_SESSION'` when a WwF-specific share type is introduced. The WwF consent model (M-8/M-9) must be extended to cover broadcast sharing before this is implemented. No schema migration required; the enum is extensible.

### 11.8 Photo Shares

`ShareContent.highlights` can include a photo reference (e.g., `{ label: 'Photo', value: 'chapter_photo_uuid' }`) post-MVP. The share card renderer would resolve the photo ID to an image at render time. Photo consent (tagged athletes in chapter photos) must be addressed before enabling this.

---

## Section 12 — Architecture Decisions

### WSR-D1 — Sharing is always opt-in

Every share in Forge Legacy is an explicit athlete action. The product never broadcasts workout activity, achievement status, or presence to other athletes on the athlete's behalf. Completing a workout, earning an honor, advancing a rank, or graduating a program generates no automatic notification to any other user.

This decision is non-negotiable. Automatic broadcasting is the entry point for the engagement loops that define social media — once the product sends unrequested notifications about athlete activity, it has begun building an attention economy. Forge Legacy does not.

### WSR-D2 — External and internal sharing are architecturally separate

External sharing (native share sheet) and internal sharing (squad check-in cards) operate independently. They have different content rules, different privacy implications, and different mechanics. An athlete may external-share only, squad-share only, both, or neither, in any combination.

This separation is necessary because the rules that govern what squad members may see (presence-only, WSR-D6) are categorically different from the rules that govern what the athlete may share externally (athlete-controlled, WSR-D15). Conflating the two would either over-restrict external sharing (bad) or under-protect squad members from comparison data (worse).

### WSR-D3 — External sharing uses the native share sheet only

Forge Legacy does not maintain custom integrations with Instagram, WhatsApp, Facebook, iMessage, or any other platform. The native iOS/Android share sheet handles all external transmission. Any app the operating system exposes is a valid target.

This is the correct abstraction at MVP. Custom platform integrations create maintenance burden, API dependency, and platform-specific behavior. The native share sheet provides feature parity with any custom integration at zero integration cost.

### WSR-D4 — Squad sharing at MVP includes check-in cards and optional notification

A squad share creates a 48h check-in card in S-2's Check-ins section for each selected squad, and fires an optional push notification to squad members. The check-in card is the primary accountability surface; the notification is the real-time signal for members who are currently active.

Notification-only was the original design. It was revised because notification-only has a fundamental accountability gap: if squad members are not online within a reasonable window of the notification, the signal is gone. The athlete's presence is already recorded in the general S-2 presence indicator — but a significant achievement (honor earned, program graduated) deserves a more legible acknowledgment than a passive presence state update.

### WSR-D5 — Share content is always a snapshot at creation time

`WorkoutShare.content` (the `ShareContent` embedded record) is written at share creation and never modified. Renaming a chapter, editing a goal name, updating a program version, or deleting an exercise does not change any existing `WorkoutShare` record.

Consistent with "History Cannot Be Rewritten." A share is a record of a moment — it documents what was true when the athlete chose to share it.

### WSR-D6 — No performance data in squad-visible content

Squad check-in cards never contain exercise names, set counts, reps, weights, total volume, progress percentages, or any performance-derived metric. The only performance-adjacent datum permitted is duration, which is a presence-quality signal ("Jordan trained for 1h 15m today") and does not create a performance comparison vector.

This rule is maintained from the original architecture despite the R1 refinement that permits performance data in external shares. The distinction is: external audiences are whoever the athlete chooses. Squad members are known, trusted people within a bounded accountability group who have not opted into seeing each other's performance data. The existing WwF architecture establishes this precedent — reference entries share presence, not performance. Squad check-in cards follow the same principle.

### WSR-D7 — Share types are achievement-anchored, not session-anchored

Athletes share a type of achievement — `WORKOUT_COMPLETE`, `PROGRAM_GRADUATED`, `HONOR_EARNED`, `GOAL_ACHIEVED`, `RANK_UP`. They do not share a "session dump" of raw logged data. Every share has a clear achievement framing.

This keeps shares celebratory rather than analytical. A share of "Workout Complete" communicates effort and commitment. A share of a raw exercise log communicates stats. The achievement framing is the default; Detailed level allows athletes to supplement that framing with stats, but the achievement remains the headline.

### WSR-D8 — PRs are shareable via the Honor system and via Detailed external shares

The primary PR celebration path is `HONOR_EARNED` for strength milestone honors. These honors (bench press 225, squat 315, deadlift 500, club totals, etc.) are already tracked as `HonorInstance` records with `metadata.weightDisplay`. Sharing an HONOR_EARNED for a strength milestone communicates "I hit this milestone" authentically without requiring a separate PR tracking engine.

At the Detailed external share level, athletes may include their actual logged exercise sets, which allows "I deadlifted 315 lbs for 5 reps" to appear in a share card. Session-level PR comparisons ("you beat your last session by 5 lbs") are not surfaced — because that analytics infrastructure does not exist in the MVP app.

### WSR-D9 — Three-tier privacy architecture; PRIVATE is the default

`AthleteShareSettings.globalVisibility` has three tiers: PRIVATE, SQUAD_ONLY, PUBLIC. New athletes default to PRIVATE.

PRIVATE is the default because athletes who are new to Forge Legacy have not yet built the trust context that would make squad sharing meaningful. A new athlete should discover sharing as an opt-in capability, not opt out of broadcasting. The architecture grows into sharing as the athlete chooses — it does not presume sharing as a norm.

External sharing is available at all visibility tiers. The visibility setting governs internal Forge surfaces only.

### WSR-D10 — Share cards support three detail levels; Achievement is the default

Achievement (identity-focused), Summary (moderate stats), Detailed (full exercise data). The default at every entry point is Achievement.

Achievement is the default because Forge Legacy leads with who the athlete is, not what numbers they hit. "I completed a workout building toward Iron Era" is a statement of identity. "Squat 3×5 at 225 lbs, Bench 4×8 at 135 lbs" is a performance table. The former is what Forge Legacy is about; the latter is available for athletes who want to share it, but it requires deliberate opt-up.

Making Detailed the default would invert the product's priority ordering and create pressure to share impressive-looking numbers rather than authentic moments.

### WSR-D11 — Workout streak is a non-behavior

No streak-based share type exists. No streak system exists anywhere in Forge Legacy product DNA. Streak pressure systems are explicitly prohibited by the Product DNA document.

### WSR-D12 — WwF partner identities are not included in shares without separate consent

The existing WwF consent model (M-8 for squad member tags, M-9 for non-squad tags) authorizes the creation of a reference entry in the tagged athlete's own workout history. It does not authorize broadcasting the tagged athlete's identity in a share card that goes to a squad's check-in surface or to an external platform.

If a partner workout share type is introduced post-MVP, a new consent model is required — one that explicitly asks the tagged athlete: "Do you consent to [Name] including you in a share card?" This is a separate consent action from M-8/M-9.

### WSR-D13 — AthleteShareSettings is a new entity; all defaults preserve privacy

A new `AthleteShareSettings` entity is required. It stores: global visibility (PRIVATE default), name inclusion preference (true default), chapter context preference (true default), default detail level (ACHIEVEMENT default), squad notification opt-in (false default), reactions notification opt-in (false default).

All defaults are conservative. The athlete must actively change settings to share more. The product does not nudge athletes toward more sharing — it provides the capability and waits for the athlete to choose it.

### WSR-D14 — Reactions are allowed in squad check-in context only

Squad members may react to check-in cards with a fixed emoji set. Reactions are private to the squad, visible to all squad members on the card as individual names (not aggregate counts), and expire with the check-in card's 48h TTL.

The Product DNA prohibition on "like systems" targets public approval mechanics — visible counts visible to strangers, algorithmic amplification, social proof for external audiences. A private reaction from a known squad member in a group of max 10 people is categorically different. The constraints (no counts, no per-reaction notification, private context, 48h expiry) maintain the distinction between encouragement and vanity.

### WSR-D15 — External shares support three athlete-controlled detail levels

Achievement (default), Summary, Detailed. The athlete selects the detail level in the share configuration step. `AthleteShareSettings.defaultDetailLevel` stores their preferred default, overridable per share. Squad check-in cards are always Achievement level regardless of the external detail level selected.

This decision resolves the R1-2 tension: the original restriction (no performance data in any share) was too broad. An athlete who chooses to share their exercise data is exercising control over their own story. The detail level selector ensures this is always an active choice, not a default behavior.

### WSR-D16 — Squad check-in surface is bounded, ephemeral, and presence-only

A Check-ins section in S-2 Squad Detail shows opt-in check-in cards from squad members. Rules: 48h TTL, max 5 cards per squad, no "load more," most-recent-first, no performance data (WSR-D6), reactions available (WSR-D14). Section disappears entirely when no active cards exist.

This is not a feed. The defining characteristics of a feed — automatic, infinite, algorithmically ranked, performance-visible — are all absent. This is an accountability window: a bounded, ephemeral, opt-in surface that gives the accountability signal from a share a 48-hour window to reach squad members, regardless of when they open the app.

---

## Section 13 — Validation Checklist

### Data Model
- [ ] `AthleteShareSettings` entity defined; 1:1 with Athlete
- [ ] `globalVisibility` defaults to PRIVATE
- [ ] `defaultDetailLevel` defaults to ACHIEVEMENT
- [ ] `squadNotificationsEnabled` defaults to false
- [ ] `reactionsNotificationEnabled` defaults to false
- [ ] `WorkoutShare` entity defined with all required fields
- [ ] `WorkoutShare.checkInExpiresAt` set to 48h from `createdAt` when squad destination included
- [ ] `WorkoutShare.visibility` immutable after creation
- [ ] `ShareContent` is embedded snapshot; not a linked entity
- [ ] `ShareContent.exerciseData` null at Achievement and Summary levels
- [ ] `ShareReaction` entity defined with uniqueness constraint `(workoutShareId, reactorAthleteId, squadId)`
- [ ] `ShareReaction` cascade-deleted at check-in card TTL expiry
- [ ] WorkoutShare does not create referential integrity constraints into source entities

### Share Types
- [ ] Five MVP types defined: WORKOUT_COMPLETE, PROGRAM_GRADUATED, HONOR_EARNED, GOAL_ACHIEVED, RANK_UP
- [ ] Each type has a primary entry point and at least one secondary entry point
- [ ] CHAPTER_SEALED, PARTNER_WORKOUT, WORKOUT_MILESTONE, PROGRAM_STARTED all deferred with rationale
- [ ] Share type content mapping defined for all five types
- [ ] Multiple-honor session handled (athlete selects one to feature or shares all)

### Share Detail Levels
- [ ] Three levels: ACHIEVEMENT, SUMMARY, DETAILED
- [ ] ACHIEVEMENT is the default at all entry points
- [ ] DETAILED level includes `ShareContent.exerciseData`
- [ ] Squad check-in cards locked to ACHIEVEMENT regardless of athlete selection
- [ ] Detail level recorded on `WorkoutShare.detailLevel` and in `ShareContent.detailLevel`
- [ ] Progress percentages excluded from all levels

### Privacy Architecture
- [ ] Three tiers: PRIVATE (default), SQUAD_ONLY, PUBLIC (future)
- [ ] External sharing available at all visibility tiers
- [ ] Per-share override available (defaults to global setting)
- [ ] `WorkoutShare.visibility` immutable after creation
- [ ] Changing global visibility does not affect existing records
- [ ] Squad removal removes athlete's cards from that squad's view immediately
- [ ] No public links in MVP (shareLink = null)

### Squad Check-in Surface
- [ ] Check-ins section appears in S-2 Squad Detail
- [ ] Section absent when no active cards
- [ ] 48h TTL enforced
- [ ] Max 5 cards per squad
- [ ] No "load more" or pagination
- [ ] Most-recent-first ordering
- [ ] No performance data on cards (WSR-D6)
- [ ] Duration permitted on cards (WSR-D6 exception)
- [ ] Card text varies by share type (5 type-specific formats)
- [ ] Tapping card opens Limited Athlete Profile modal (no deep link to workout data)
- [ ] Athlete's optional message shown on card (≤140 chars)

### Reactions
- [ ] Fixed set: 🔥 💪 🎯 ❤️ only
- [ ] One reaction per squad member per card (upsert on change)
- [ ] Visible to all squad members as individual names ("Maya, Jordan reacted 🔥💪")
- [ ] No aggregate count ever displayed
- [ ] No per-reaction push notification to sharer
- [ ] Optional bundled notification (off by default): at most once per 24h per WorkoutShare
- [ ] Reactions expire at check-in card TTL
- [ ] Not available on external shares
- [ ] Not available on public content

### External Share Architecture
- [ ] Native share sheet is the only external delivery mechanism
- [ ] Three output formats: image card, text snippet, link (post-MVP)
- [ ] Three card templates: WorkoutComplete, Achievement, Rank
- [ ] Achievement level: identity-focused, no performance data
- [ ] Summary level: adds type, duration, notable stat
- [ ] Detailed level: adds full exercise list
- [ ] Athlete name and chapter context are opt-out (on by default)
- [ ] App attribution ("Forge Legacy") always present on all cards
- [ ] Public recap page reserved for post-MVP (URL scheme defined)

### Workout Completion Integration
- [ ] Share CTA present on W-17 (secondary action below "Done")
- [ ] Share action present in M-1, M-2, M-3, M-4 modals (subordinate to "Continue")
- [ ] Share action present in W-19 overflow menu (⋯)
- [ ] Share action present in L-11 (Honor Detail)
- [ ] Share configuration step defined (preview, level selector, content toggles, destination section)
- [ ] Squad card always Achievement level regardless of external detail level selected
- [ ] No time limit on retrospective sharing from W-19
- [ ] Share date in ShareContent reflects share action date, not source session date

### Non-Behaviors
- [ ] No comments
- [ ] No aggregate reaction counts
- [ ] No per-reaction push notifications to sharer
- [ ] No reactions outside squad check-in context
- [ ] No follower mechanics
- [ ] No automatic sharing
- [ ] No streak share type
- [ ] No performance data in squad check-in cards (WSR-D6 maintained)
- [ ] No progress percentages in any share context
- [ ] No WwF partner identities without consent
- [ ] No infinite-scroll check-in feed
- [ ] No persistent check-in cards beyond 48h
- [ ] No algorithm-driven share prompts

### Future Compatibility
- [ ] globalVisibility = PUBLIC tier designed in
- [ ] shareLink field reserved for post-MVP public recap URL
- [ ] shareType enum extensible without migration
- [ ] sourceEntityType extensible (WwF_SESSION accommodation noted)
- [ ] ShareContent supports photo reference addition post-MVP
- [ ] Share Card Visual System compatibility confirmed (Section 11.5)

---

## Section 14 — Downstream Impact

| File / Component | Required Change |
|-----------------|----------------|
| `W-17` (Workout Summary) | Add "Share" CTA as secondary action below "Done" button. Share opens share configuration step, generates WorkoutShare. |
| `W-19` (Activity Detail) | Add "Share" action to overflow menu (⋯). Available for all past sessions. Defaults to WORKOUT_COMPLETE. |
| `M-1` (Rank Up modal) | Add "Share this advancement" subordinate action below "Continue." Generates RANK_UP WorkoutShare on tap. |
| `M-2` (Honor Earned modal) | Add "Share this honor" subordinate action below "Continue." Generates HONOR_EARNED WorkoutShare. Multiple honors: athlete selects which to share. |
| `M-3` (Goal Achieved modal) | Add "Share this achievement" subordinate action below "Continue." Generates GOAL_ACHIEVED WorkoutShare. |
| `M-4` (Program Graduated modal) | Add "Share this graduation" subordinate action below "Continue." Generates PROGRAM_GRADUATED WorkoutShare. |
| `L-11` (Honor Detail sheet) | Add "Share this honor" action. Generates HONOR_EARNED WorkoutShare for that specific HonorInstance. |
| `S-2` (Squad Detail) | Add Check-ins section at top of view. Displays active WorkoutShare check-in cards for this squad. Section absent when no active cards. |
| `AthleteShareSettings` | New entity. Created with default values on account creation. Settings surface needed (deferred to post-MVP settings spec). |
| Share configuration step | New in-app screen/sheet between "Share" tap and OS share sheet. Preview, detail level selector, content toggles, destination picker. |
| Share card renderer | New client-side component. Renders ShareContent to image at specified detail level. Three card templates. |

---

## Section 15 — Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification. Defines WorkoutShare, AthleteShareSettings, ShareContent, ShareReaction data model. Establishes five MVP share types (WORKOUT_COMPLETE, PROGRAM_GRADUATED, HONOR_EARNED, GOAL_ACHIEVED, RANK_UP). Defines three-tier privacy architecture. Defines three external detail levels (Achievement/Summary/Detailed). Defines squad check-in surface (48h TTL, max 5 cards, presence-only). Defines squad reactions (fixed set, individual names, no counts, 48h TTL). Specifies entry points at W-17, W-19, M-1–M-4, L-11. Records WSR-D1 through WSR-D16. Includes R1 refinement pass (reactions, detail levels, squad check-in surface, performance data philosophy revision). |

---

*Forge Legacy Workout Share Result Architecture — WSR-001 v1.0*
*June 2026*
*Authority for all workout sharing, squad check-in, external share card, and share reaction decisions.*
