# Forge Legacy — Squad Detail Wireframe Specification
## S-2 | Phase 2B | Version 1.3 — June 2026

---

## Preamble: What S-2 Is For

S-1 told the athlete that their squad exists and whether it is active. S-2 answers a different question: **"What is happening inside this squad?"**

That question has three parts. Who belongs here — the specific people, by name, with faces. Who is showing up — not how much, not how hard, but whether they have trained in the current window. And what can be done from here — the primary action that connects squad membership to the act of training together.

S-2 is the accountability surface. Accountability requires visibility. The question is always: visibility of what?

Forge Legacy's answer is presence. The athlete who opens S-2 sees their squadmates — not their programs, not their progress percentages, not their chapter goals. They see whether each person has trained recently. That is the signal accountability requires. That is the only signal S-2 provides.

S-2 is not a feed. Nothing posts here. No athlete generates content by logging a workout. The member list is a snapshot of training presence, updated silently. There is no notification that Alex logged a workout. There is no announcement. Alex either trained this week or did not. S-2 reflects that state. Nothing more.

**S-2 must never become:**
- An activity stream of what squadmates logged
- A comparison surface where members are ranked by training frequency
- A record of how long anyone has been absent
- A place where training history beyond the current week is visible

**S-2 should leave the athlete feeling:** "I know who is showing up, and I know where to go to train alongside them."

Not inspired by teammates' volume. Not pressured by visible absence. Anchored. Connected. Ready.

---

## Section 1 — S-2 Goals

S-2 exists to accomplish four things:

1. **Identify the squad** — confirm which squad the athlete is viewing, its name, its purpose, and its composition at a glance
2. **Surface individual member presence** — show which members have trained recently and which have not, framed as presence (who showed up) rather than absence (who failed to show up), without any performance data
3. **Provide access to Train Together** — the primary action that pre-associates a training partner before a workout begins
4. **Provide squad management access** — invitation and settings, accessible without dominating the screen

**What S-2 answers:**
- Which squad is this?
- What is this squad about?
- Who are the members?
- Has each member trained this week?
- How do I start a Train Together session?
- How do I invite someone to this squad?
- How do I access squad settings?

**What S-2 does NOT answer:**
- What did each member train?
- How much did each member lift, run, or cycle?
- How does my training volume compare to my squadmates?
- What chapter is each member working on?
- How long has any member been absent?
- Who is the "best" performer in this squad?

**Why this scope:**
S-2 is the individual-level expression of the collective signal S-1 already established. S-1 said "3 of 5 trained this week." S-2 says which 3 and which 2. That depth serves accountability — members can see who is showing up — without crossing into performance monitoring, which would convert the squad from a support structure into a comparison engine.

**Supporting the Forge Legacy mission:**
Squads exist to support consistency. Consistency is built by showing up, not by optimizing volume. S-2 shows showing up. Nothing else. The athlete who opens S-2 and sees their squadmates' presence status gets the accountability signal without the shame signal. "Alex trained today" is encouraging. "Alex has missed 12 days" is not accountability — it is surveillance. S-2 shows the former and will never show the latter.

---

## Section 2 — Information Hierarchy

**TIER 1 — Squad Header**
The squad's identity. Name, purpose, and member count. This is the first thing the athlete sees and it grounds the rest of the screen. The athlete should immediately confirm they are in the right squad and understand its focus.

**TIER 2 — Train Together CTA**
The primary action available from S-2. Positioned immediately after the Squad Header so the athlete who came to S-2 specifically to initiate a Train Together session can act without scrolling through the member list.

**TIER 3 — Member List with Presence**
The accountability heart of S-2. Every member, name, avatar, and presence state. This is the deepest S-2 gets into squad member data. Visibility is member-level presence. Nothing else.

**TIER 4 — Invite to Squad**
A Secondary CTA at the bottom of the member list. Squad growth is encouraged but not the primary purpose of S-2. Invite access is always available but positioned as a secondary action.

**Tier 5 — Squad Options (⋯)**
Squad settings, leave squad, and management actions accessible via the Top App Bar [⋯] action. Present but compact — management is not the primary purpose of a visit to S-2.

**Hierarchy principle:**
Squad identity comes first because the athlete needs confirmation of context. Train Together comes second because it is the only outbound action on S-2. Members come third because the accountability check — the reason most athletes visit S-2 — is served here. Invite and settings are last because they are maintenance actions, not daily-use actions.

---

## Section 3 — Full Scroll Order

S-2 is a navigation stack screen. It is entered from S-1 via a squad card tap. It has a Top App Bar with a back arrow and an [⋯] options action.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  [←]  [Squad Name]                          [⋯]        │  ← Top App Bar
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [⛰] [Squad Name — large, 22–24sp]             │   │  ← Squad Header (icon if set)
│  │  [Squad purpose — 14sp, secondary, optional]    │   │
│  │                                                 │   │
│  │  [👤][👤][👤][👤][👤]  5 members               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [  Train Together  →  ]                                │  ← Primary CTA
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  MEMBERS                                                │  ← Section label
│                                                         │
│  [👤]  Alex                  Trained today              │  ← Member row
│  [👤]  Jordan                Not yet this week          │
│  [👤]  Maya                  Trained this week          │
│  [👤]  Riley                 Not yet this week          │
│  [👤]  Sam                   Trained today              │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [  + Invite to Squad  ]                                │  ← Secondary CTA
│                                                         │
├─────────────────────────────────────────────────────────┤
│  BOTTOM TAB BAR                                         │
└─────────────────────────────────────────────────────────┘
```

**Top App Bar:**
- Back arrow [←] — navigates to S-1; restores S-1 scroll position (per S-1 v1.1)
- Squad name in title position — confirms context at a glance, 18sp, truncated with ellipsis if too long
- [⋯] options — opens the Squad Options bottom sheet

**What appears above the fold on 375×812:**
The Squad Header (name, purpose, member count) and the Train Together CTA must be fully visible. The first 2–3 member rows should begin appearing below the fold boundary, signaling scrollability and showing the accountability content is immediately below.

**Scroll behavior:**
Standard vertical scroll. The member list may be long for squads with many members. All members accessible by scrolling. "+ Invite to Squad" at the content bottom scrolls with content — it is not sticky.

**Tab Bar behavior:**
The Bottom Tab Bar is visible and accessible. S-2 is not a full-screen mode screen. Standard navigation is available.

---

## Section 4 — Squad Header Architecture

### 4.1 Header Anatomy

```
┌────────────────────────────────────────────────────────┐
│  [icon] [Squad Name]                                   │  ← Icon (if set, 24dp) + 22–24sp name
│  [Squad purpose / focus — optional]                    │  ← 14sp, secondary color
│                                                        │
│  [👤][👤][👤][👤][👤]  5 members                      │  ← Avatar stack + count
└────────────────────────────────────────────────────────┘
```

When no icon is selected the name appears at the normal left position — layout identical to pre-amendment.

The header is non-tappable. It is identity information, not navigation.

### 4.2 Squad Name in Header vs. Top App Bar

The squad name appears in two places:
- **Top App Bar title:** 18sp, truncated if necessary. Persistent context as the athlete scrolls.
- **Header name:** 22–24sp, full name displayed, wraps to 2 lines maximum. The larger size acknowledges the emotional weight of the squad's identity — this is not a data label, it is a name the members chose.

**Why the squad name appears twice:**
The Top App Bar confirms context while scrolling. The Header name is the larger, more human display — the squad's "cover" — at the moment the athlete arrives. Both are necessary. Neither is redundant.

### 4.3 Squad Purpose

- 14sp, secondary text color
- The same optional field displayed on the S-1 squad card, now with more room to breathe
- Maximum 60 characters — still one brief line
- Absent if not set — no placeholder

**Why purpose appears more prominently on S-2 than S-1:**
On S-1, the squad card is compact — the purpose is a secondary detail below the name. On S-2, the athlete is inside the squad. The purpose deserves slightly more visual space because it answers "why does this group exist?" for anyone who is newly invited or revisiting the squad after time away.

### 4.4 Member Count and Avatar Stack in Header

The header avatar stack mirrors the S-1 card treatment:
- First 4 members shown as circular avatar thumbnails — 28dp diameter, slight overlap
- "+N" overflow label for squads with more than 4 members
- "[X] members" total count

On S-2, the avatar stack is a navigation shorthand — it tells the athlete how many people are in this squad before they reach the member list. The full member list is the definitive roster; the header stack is context.

### 4.6 Squad Icon (Optional)

The squad icon is a small inline element that appears immediately to the left of the squad name in the Squad Header.

**When set:**
- A 24dp icon glyph renders inline before the squad name on the same line
- The name follows immediately to the right, at full header size (22–24sp, primary weight)
- The squad purpose line and avatar stack below are unaffected — no layout shift

**When not set:**
- The squad name appears at the standard left position with no icon prefix
- No placeholder, no empty space. Header layout is identical to the pre-amendment treatment.

**What the icon communicates:**
Squad character and identity — the same value set in Squad Settings (S-3 Section 6.4). The icon reinforces who this squad is without competing with the squad name or the squad purpose. Both retain their typographic primacy. The icon is a visual accent, not a headline.

**What the icon does NOT communicate:**
- Presence or activity state (not a live indicator)
- Achievement or milestone (not a reward badge)
- Performance or tier (not a ranking element)
- Status of any kind

**Cross-spec consistency:** The icon displayed on S-2 is the same value displayed on S-1 — both read from the same squad record. A change made in Squad Settings takes effect in both surfaces.

---

### 4.5 Squad Management via [⋯]

The [⋯] action in the Top App Bar opens the Squad Options bottom sheet:

```
┌────────────────────────────────────────────────────────┐
│  ─────  (handle)                                       │
│                                                        │
│  Squad Settings                                        │  ← Edit name, purpose
│  Invite to Squad                                       │  ← Same as "+ Invite" CTA
│  ────────────────────────────────────────────────────  │
│  Leave Squad                                           │  ← Destructive (confirmation required)
│  ────────────────────────────────────────────────────  │
│  Delete Squad  (creator only)                          │  ← Destructive (confirmation required)
└────────────────────────────────────────────────────────┘
```

**Squad Settings** — opens squad edit screen (S-XX, to be defined): athlete can edit squad name and purpose. Available to all members.

**Invite to Squad** — same action as the "+ Invite to Squad" CTA at the bottom of the member list. Accessible from both locations because inviting is a common action and should not require scrolling to the bottom.

**Leave Squad** — removes the athlete from the squad. Requires confirmation: "Leave [Squad Name]?" with a confirmation Primary and cancel Secondary. Irreversible — no re-join unless re-invited. After leaving, the athlete returns to S-1, where the squad card is no longer present.

**Delete Squad** (creator only) — permanently deletes the squad and removes all members. Requires explicit confirmation: "This cannot be undone. All members will be removed." Available only to the squad creator.

---

## Section 5 — Member Visibility Rules

### 5.1 What Is Visible Per Member

| Element | Visible on S-2 |
|---------|----------------|
| Avatar (photo or initials) | Yes |
| Squad icon (if set) | Yes |
| Member name | Yes |
| Presence state ("Trained today," "Trained this week," "Not yet this week") | Yes |
| Squad join date | No |
| Workout type from most recent session | No |
| Duration of most recent session | No |
| Sets, reps, weights, distance, pace | No |
| Chapter name or progress | No |
| Goal name or progress percentage | No |
| Program name or progress | No |
| Rank or sub-tier | No |
| Total workouts logged | No |
| Any comparison to other members | No |

### 5.2 Member Ordering

Members are ordered alphabetically by display name. This order is fixed and does not change based on presence state, training recency, or any other participation signal.

**Fixed order:** The member list is a stable roster. An athlete's position in the list does not move when they train. An athlete's position does not move when they don't train. The presence state label on the right updates; the position never does.

**Why alphabetical:**
Alphabetical is neutral, predictable, and independent of any athlete behavior, performance, or participation history. It does not reward training by elevating position. It does not penalize absence by lowering it. Every member always knows where to find their own row. The list feels like a roster, not a leaderboard.

**Why not presence-state grouping:**
Grouping by presence state creates spatial hierarchy: trained members at the top, untrained members at the bottom. Even without explicit ranking labels, spatial position communicates rank. An athlete who has not yet trained this week does not need to be at the bottom of the list — they need their presence state label, which is already visible. The accountability signal is in the label. The position is independent of it.

**The athlete's own row:** Appears at their alphabetical position in the roster, the same as any other member. No special treatment. No elevation. No highlighting.

### 5.3 Member Row Anatomy

```
[👤]  [Name]                    [Presence State]
```

- Avatar: 40dp circle, left-aligned. Initials rendered for members without a photo.
- Name: 16sp, primary text. The member's display name.
- Presence state: right-aligned, 13sp, secondary text color.
- Row height: minimum 56dp.
- Row is **tappable** → opens Limited Athlete Profile modal (Section 5.5). Standard chevron [›] affordance at right edge.

**Why member rows are tappable:**
Squads are high-trust relationships. A name and presence state conveys accountability; it does not convey identity. The Limited Athlete Profile modal gives each member a human face — their photo, training identity, legacy depth, and declared accomplishments — without exposing any training data, goals, or performance metrics. The tap is an invitation to know who you are training alongside, not an entry to a surveillance surface.

### 5.4 Member Count Display

The member list shows all members. No pagination. No "show more." All members scroll. The member count in the Squad Header gives the athlete a total before they scroll, so they know how many rows to expect.

---

### 5.5 Limited Athlete Profile Modal

Tapping any member row opens the Limited Athlete Profile as a modal — it slides up from the bottom, layering over S-2 without navigating away from it.

#### 5.5.1 Modal Anatomy

```
┌────────────────────────────────────────────────────────┐
│  ─────  (handle bar)                            [×]    │
│                                                        │
│  [Profile Photo — 80–96dp circle, centered]            │
│                                                        │
│  [Display Name — 20sp, centered, primary]              │
│  [Athlete Type — 14sp, secondary, centered]            │
│  [Rank Name — 14sp, secondary, centered]               │
│  Forging since [Month Year] — 13sp, secondary          │
│                                                        │
│  ─────────────────────────────────────────────────────  │
│                                                        │
│  ACCOMPLISHMENTS                                       │  ← Section label (if any exist)
│  [Accomplishment 1]                                    │
│  [Accomplishment 2]                                    │
│  [Accomplishment 3]                                    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Handle bar:** Standard bottom sheet drag handle, centered at top.
**[×] dismiss button:** Top right, 44×44dp tap target. Dismisses the modal.
**Tap outside:** Tapping the dimmed S-2 content behind the modal dismisses it.
**Drag down:** Standard bottom sheet drag-to-dismiss gesture.

#### 5.5.2 Visible Fields

| Field | Display | Notes |
|-------|---------|-------|
| Profile photo | 80–96dp circle, centered | Initials rendered if no photo set |
| Display name | 20sp, centered, primary weight | The member's display name |
| Athlete type | 14sp, secondary, centered | Self-declared: Strength, Running, Hybrid, etc. |
| Rank name | 14sp, secondary, centered | Name only — see 5.5.3 |
| Forging since | 13sp, secondary | "[Month Year]" — account creation date |
| Accomplishments (top 3) | Listed below divider | User-declared; section absent if none set |

#### 5.5.3 Rank Display Rule

Rank name is shown. Rank sub-tier is hidden.

```
Correct:   Architect
Incorrect: Architect IV
```

**Rationale:** Rank name is identity — it communicates the depth of a legacy-building journey without providing a score. Rank sub-tier is precision within a tier that functions as a comparison point. The limited profile reinforces identity, not measurement. Sub-tier precision serves no relational purpose in this context and introduces a ranking axis between squad members.

#### 5.5.4 Accomplishments Display

Accomplishments are user-declared real-world achievements. They appear below a divider line, under the "ACCOMPLISHMENTS" section label.

- Up to 3 accomplishments shown — the athlete's top 3 as set on their profile
- Each accomplishment shows its name only (e.g., "Marathon Finisher," "315 lb Bench Press," "Spartan Race")
- Date of accomplishment is not shown on the limited profile
- If the member has no accomplishments entered: the accomplishments section (label + content) is entirely absent. No "No accomplishments yet" placeholder.

**Why accomplishments are visible:**
Accomplishments are things the athlete is proud of — they chose to enter them. In a high-trust squad context, knowing that a squadmate finished a marathon or competed in a powerlifting meet makes them a real person with a real history. This is identity, not performance pressure. The accomplishment is theirs; it says nothing about the viewing athlete's performance.

#### 5.5.5 Hidden Fields

The following are explicitly excluded from the Limited Athlete Profile and must never appear in this modal:

- Rank sub-tier (IV, III, etc.)
- Honors (count or list)
- Current chapter name or progress
- Goals of any kind
- Goal progress percentages
- Workout history
- Program name or progress
- Progress photos
- Body metrics (weight, body fat %)
- Legacy score or contribution
- Any training performance data
- Streak data
- Accomplishment dates

#### 5.5.6 The Athlete's Own Row

When the athlete taps their own row, the Limited Athlete Profile modal opens and shows their own data — the same fields shown for any other member. No special treatment. No "Edit Profile" shortcut. The athlete sees exactly what their squadmates see when they tap the athlete's row.

**Why:** Consistency. The athlete should know what information is visible about them. Seeing their own limited profile from S-2 confirms the exact view their squadmates have. If they want to edit their profile, that path is in the Profile tab, not from S-2.

#### 5.5.7 Modal Is Read-Only

The Limited Athlete Profile modal contains no actions. Specifically:
- No "Train Together" CTA (that action lives on S-2)
- No "Send message" action
- No "Invite to another squad" action
- No "View full profile" link in MVP
- No reporting or flagging action

The modal is purely informational. It answers "who is this person?" — nothing more.

#### 5.5.8 Visibility Scope

The Limited Athlete Profile modal is visible only within the squad context to squad members. It is not accessible from outside the squad. Athletes who are not squad members cannot view this modal. Presence state and identity context shown here are scoped to the squad relationship.

#### 5.5.9 Navigation Impact

- Tapping a member row: S-2 scrolls to appropriate position, modal slides up
- Dismissing modal (×, drag down, tap outside): modal closes, S-2 remains at same scroll position
- Back gesture while modal is open: closes modal, returns to S-2 (does not navigate to S-1)
- Tab Bar tap while modal is open: closes modal, navigates to selected tab

---

## Section 6 — Presence vs Performance Rules

### 6.1 The Three Presence States

| State | Label | Condition |
|-------|-------|-----------|
| Active today | "Trained today" | Member logged at least one workout (saved or partial) within the current calendar day |
| Active this week | "Trained this week" | Member logged at least one workout within the rolling 7-day window, but not today |
| Quiet | "Not yet this week" | Member has not logged a workout in the rolling 7-day window |

**"This week" definition:** Rolling 7-day window ending at the current moment — matching S-1's definition. Not a calendar week reset.

**Partial sessions count:** A session saved via "Save & Exit" from the abandonment flow counts as a training event for the presence indicator. The athlete showed up. The fact that they saved early does not invalidate their presence.

**Discarded sessions do not count:** A session ended via "Discard" without any saved data does not contribute to the presence signal.

### 6.2 Why "Not Yet This Week" — Not "Hasn't Trained in X Days"

The label "Hasn't trained in 8 days" is a backward-looking accumulation that grows over time, implying increasing failure. "Not yet this week" is a forward-looking observation within a fixed window. It resets when a new 7-day window begins. The distinction is not cosmetic — it is the product's position on shame.

"Not yet this week" says: the window is open, training hasn't happened yet, that's fine. "Hasn't trained in 8 days" says: here is how long the absence has been, and it's been a while. One is neutral. One is a record of failure.

Forge Legacy shows the former. Never the latter.

### 6.3 No Historical Presence Beyond One Week

S-2 does not show any training activity data older than 7 days. There is no "last trained [date]" field. There is no training history. There is no streak counter. The presence indicator resets to "Not yet this week" for all members at the start of each new 7-day window.

**Why:** A streak counter converts presence into a performance metric by assigning value to the length of the streak. A long streak creates pressure to maintain it. A broken streak creates visible failure. Forge Legacy does not do streaks. The window is the accountability unit — not the streak. Each week is a fresh chance to show up.

### 6.4 The Performance Line

**Performance is data that can be used to rank or compare athletes.**

Everything that crosses that line is absent from S-2. A member's workout type, duration, distance, lift amounts, chapter progress, and goal percentages are all absent. These are training details — they belong to the individual athlete's record, not to the squad visibility surface.

**Presence is not performance.**

Knowing that Alex trained today is not performance data. It is presence data. It tells the athlete "Alex showed up." It does not tell them "Alex lifted 250 lbs" or "Alex ran 8 miles." The accountability value is in the showing up. The performance data — what was done while showing up — remains private.

The line drawn: **training occurrence is visible. Training content is not.**

---

## Section 7 — Accountability Visibility Rules

### 7.1 The Purpose of Visibility on S-2

Squads exist to support consistency. Consistency requires knowing whether people are showing up. Without any visibility, squads are just groups of names — there is no accountability, only membership. S-2 provides the minimum visibility required for accountability to function: presence status for every member.

### 7.2 What Makes This Accountability and Not Surveillance

**Accountability:** Knowing whether someone is showing up within a shared, agreed time window.
**Surveillance:** Tracking absence over time and building a record of failure.

The 7-day rolling window is the accountability unit. All members know the window exists. All members know their own presence is visible to squadmates within it. That awareness — the knowledge that showing up is seen — is the accountability mechanism. No one needs to explicitly say "did you train?" because the squad can see the answer.

Surveillance would be: recording how many days since each member's last session, showing a streak/absence counter, emailing when a member goes quiet, or comparing training frequency between members. None of these exist in S-2.

### 7.3 No Comparative Language

S-2 does not rank members by presence. There is no "Most Active" label. There is no indicator that one member has trained more days than another. Member position in the list is alphabetical and fixed — it does not communicate participation rank. Two members with "Trained today" are visually equivalent in position regardless of whether one trained for 15 minutes and another for 90.

### 7.4 The Athlete's Own Visibility

The athlete can see their own presence state on S-2. They appear in the member list like any other member, in the group their current state places them. If they have not trained this week, their own row reads "Not yet this week." This is factual and honest. The product does not hide this from the athlete — seeing your own state in context with your squad is part of the accountability design.

However, the athlete's own state is not highlighted or annotated. They see their row as their squadmates see it: a name and a presence state.

### 7.5 Privacy Boundary: This Squad Only

Presence state on S-2 is scoped to this squad's context. An athlete who belongs to two squads does not have their presence state shared across squads unless they are a member of both. Squad A cannot see whether the athlete trained via Squad B's context. Presence state is squad-agnostic — it reflects whether the athlete trained at all, regardless of which squad context they used.

---

## Section 8 — Workout With Friend Relationship

### 8.1 Train Together CTA on S-2

Train Together is initiated from S-2. The full flow is:

```
S-1 (Squad Hub)
        ↓  tap squad card
S-2 (Squad Detail)
        ↓  "Train Together →" Primary CTA
S-10 (Train Together — partner selection)
        ↓  select partner + "Start Training Together"
W-1 (Workouts Hub) → workout begins
        ↓  workout completes
W-17 (Workout Summary) → partner tag fires on "Done"
```

**Train Together CTA anatomy:**

```
[  Train Together  →  ]
```

- Full-width
- Primary CTA class
- 56dp minimum height
- Positioned: after Squad Header, before Members section
- Label: "Train Together →" — the arrow reinforces forward motion toward training

### 8.2 Squad Context Carried to S-10

When the athlete taps Train Together from S-2, S-10 (Train Together partner selection) receives the squad context: which squad the athlete is operating within. S-10 displays this squad's members first in the partner selection list, before the search field for non-squad athletes.

If the athlete trains with multiple squads, the S-10 screen entered from S-2 (Squad A) shows Squad A's members first. This is contextually correct — the athlete initiated Train Together from Squad A's detail view.

### 8.3 S-2 Does Not Show Pending WwF Actions

Incoming WwF actions — Unclaimed Workout cards (M-8) and Pending Approval cards (M-9) — are managed at W-1. S-2 does not display these cards, does not show WwF notification counts, and does not duplicate W-1's WwF management role.

**Why:** WwF claim and approval actions are workout-context responses. They belong in the workout context (W-1), not in the squad context (S-2). Squad membership determines M-8 vs. M-9 — that is an architectural truth that does not need to be surfaced at S-2.

### 8.4 Train Together Is the Only WwF Action on S-2

S-2 exposes one WwF action: Train Together (outbound, pre-workout initiation). Post-workout tagging (W-17 → W-20) is not accessible from S-2 — it is part of the workout completion flow. S-2 does not provide a "tag a training partner for a past workout" path.

### 8.5 Squad Membership and WwF Consent

Being a member of a squad is the athlete's implicit consent to receive M-8 notifications (Unclaimed Workout claim/dismiss). S-2 does not surface this consent relationship visually — it is an architectural truth behind the scenes. The member list shows members. The fact that those members auto-receive M-8 when tagged by a squadmate is not disclosed on S-2.

---

## Section 9 — Squad Focus / Purpose Display

### 9.1 Purpose in the Squad Header

The squad's purpose (60 characters maximum, optional) appears in the Squad Header below the squad name. This is the same field displayed on the S-1 squad card — more visible and with slightly more typographic weight on S-2 because the athlete is now inside the squad context.

**When purpose is set:**
It appears at 14sp, secondary color, immediately below the squad name. No label ("Purpose:", "About:", etc.) — the text speaks for itself.

**When purpose is not set:**
The line is absent. No placeholder. No "Add a purpose" prompt from within the header. The squad header is clean.

### 9.2 Editing Purpose

Squad purpose is editable from Squad Settings, accessible via the [⋯] options menu. It is not editable inline from S-2. The athlete who wants to change the purpose navigates to Squad Settings.

### 9.3 What "Purpose" Is Not

The squad purpose is not:
- A goal statement (no "reach 225 lb bench press by December")
- A shared chapter (each member has their own chapters)
- A program enrollment ("we're all doing 5×5")
- A group commitment tracker

It is a short, human-readable description of why this group trains together. "Morning lift crew." "Marathon 2027." "General accountability." Nothing more is required, and the field does not allow for more.

**Why no squad-level goals:**
Goals belong to individual chapters. A squad might share a general focus, but each member's training goals are their own. A squad-level goal would create a shared target that not all members may be aligned to, and would introduce comparison between members' progress toward that target. Forge Legacy does not create that dynamic. The squad's purpose is descriptive, not prescriptive.

---

## Section 10 — Navigation Paths

### 10.1 From S-2

| Action | Destination |
|--------|-------------|
| Tap [←] back arrow | S-1 (scroll position restored, per S-1 v1.1) |
| Tap [⋯] | Squad Options bottom sheet |
| Squad Options → Squad Settings | Squad edit screen (S-XX) |
| Squad Options → Invite to Squad | Squad invite flow (S-XX) |
| Squad Options → Leave Squad | Confirmation sheet → Leave → S-1 (squad card absent) |
| Squad Options → Delete Squad (creator) | Confirmation sheet → Delete → S-1 (squad card absent) |
| Tap "Train Together →" | S-10 Train Together with this squad's context |
| Tap "+ Invite to Squad" | Squad invite flow (S-XX) |
| Tab Bar — Home | H-1 Home |
| Tab Bar — Legacy | L-1 Legacy Hub |
| Tab Bar — Workouts | W-1 Workouts Hub |
| Tab Bar — Profile | Profile modal |

### 10.2 To S-2

| Origin | Path |
|--------|------|
| S-1 | Squad card tap |
| S-10 | Back navigation (S-10 back → S-2 → S-1) |

### 10.3 S-2 Is Not Directly Accessible from W-1

S-2 is a squad context screen. It is entered via the Squads tab, not from the Workouts tab. W-1 does not link to S-2. The workout context and squad context are separate navigational domains.

### 10.4 S-2 Is Not a WwF Notification Destination

M-8 and M-9 push notifications deep-link to W-1, not to S-2. The squad connection to WwF is architectural — it determines consent flows — but incoming WwF activity does not surface at S-2.

### 10.5 Returning to S-2 from S-10

When the athlete navigates from S-2 to S-10 and returns via back navigation (e.g., they opened S-10 to review partner options but didn't initiate Train Together), S-2 restores its scroll position. Standard navigation stack behavior.

---

## Section 11 — Empty States

### 11.1 Squad With Only One Member (Creator)

When the athlete has just created a squad and is the only member:

```
┌─────────────────────────────────────────────────────────┐
│  [←]  [Squad Name]                          [⋯]        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Squad Name]                                           │
│  [Purpose if set]                                       │
│  [👤]  1 member                                         │
│                                                         │
│  [  Train Together  →  ]                                │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  MEMBERS                                                │
│                                                         │
│  [👤]  You                    [presence state]          │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [  + Invite to Squad  ]                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**What appears:**
- The athlete's own row in the member list: "You · [presence state]"
- "+ Invite to Squad" CTA at standard position
- Train Together CTA is present and functional — the athlete can initiate Train Together with any athlete even before squad members exist (per WwF v1.1, Train Together supports any athlete)

**What does not appear:**
- "Your squad is empty" message
- "Invite members to get started" gate
- Any indication that a one-person squad is incomplete or invalid

A one-person squad is a valid squad. The athlete created it. They may train alone and invite someone later. The product does not make them feel otherwise.

### 11.2 No Squad Purpose Set

The purpose line is absent from the Squad Header. The header is clean: large squad name, avatar stack, member count. No "Add a purpose" prompt. If the athlete wants to add a purpose, Squad Settings (via [⋯]) is the path.

### 11.3 All Members Have Not Yet Trained This Week

All member rows show "Not yet this week." No special state. No "Your squad hasn't trained yet this week" banner. The member list is correct and complete — it reflects the current state. The athlete sees the squad's current presence snapshot. What they do with that information is their own choice.

### 11.4 No Members Beyond Creator When New Invitation Was Just Sent

After the athlete sends an invitation, the invitee does not appear in the member list until they accept. The member list reflects actual members, not pending invitations. There is no "pending" member row. The invitation is in progress; the member list is unchanged.

---

## Section 12 — Edge Cases

### 12.1 Athlete Is the Only Member Who Has Trained This Week

The member list shows all members in their standard alphabetical positions. The athlete's row shows "Trained today" or "Trained this week." All squadmates' rows show "Not yet this week." Each presence state is accurate. No member is elevated or isolated in position by their training state. No celebratory treatment. No badge.

### 12.2 All Members Have Trained Today

All rows show "Trained today." Members appear in their standard alphabetical positions. This is the squad at full presence. No special design state. The copy "Trained today" on every row communicates this without the product announcing it.

### 12.3 Member Who Joined Today

New members who joined today have no workout history within the squad's context yet. Their presence state is "Not yet this week" — factually correct, as they have not yet trained since joining. No "New member" label. No "(just joined)" annotation. They appear at their alphabetical position in the member list with "Not yet this week" as their label. If they log a workout on their join day, their label updates to "Trained today." Their position in the list does not change.

### 12.4 Very Large Squad (15+ Members)

All members visible in the scrollable list. No pagination, no "show more." The member list is complete. The athlete scrolls to see all members. The header avatar stack still shows 4 + "+N" overflow. The section label "MEMBERS" remains.

### 12.5 Squad Member Who Deleted Their Account

If a member deletes their Forge Legacy account, they are removed from the squad. Their row disappears from the member list. The member count updates. No "former member" placeholder. No notification to remaining members within S-2. Account deletion is handled by the notification system outside S-2.

### 12.6 Squad Name Very Long

The squad name in the Squad Header wraps to 2 lines maximum. If it exceeds 2 lines, it truncates with an ellipsis. The Top App Bar title truncates with an ellipsis on a single line. Long names are handled gracefully in both locations.

### 12.7 Athlete Navigates Away Mid-Squad (Tab Bar Tap)

The athlete can tap any Tab Bar item while on S-2. This is standard navigation. The Back arrow remains available when they return to the Squads tab — they land on S-1 (or S-2 if S-2 was the last active screen and they're returning via the back stack).

### 12.8 Athlete Has Been Removed from This Squad

If another member removes the athlete from the squad while they are viewing S-2 (edge case on a shared network state), the next navigation action or refresh should return them to S-1 with this squad no longer present. The real-time handling of this edge case is an implementation concern; from the spec perspective, the athlete should never see a squad they no longer belong to.

### 12.9 Squad Deleted by Creator While Athlete Is Viewing S-2

Same as Case 12.8. Next interaction should resolve to S-1 with the squad absent.

### 12.10 Two Members Share the Same Display Name

Both appear in the member list with their names as entered. No disambiguation system (like "(1)" or "(2)" suffixes) is defined in MVP. Display name uniqueness within a squad is not enforced. The avatar differentiates them visually.

---

## Section 13 — Mobile UX Considerations

### 13.1 Screen Mode

S-2 is a standard navigation stack screen with Top App Bar and Bottom Tab Bar. It is not full-screen. Standard navigation is always accessible. The athlete can leave S-2 via back, Tab Bar, or completing the Train Together flow.

### 13.2 Scroll Behavior

Standard vertical scroll. All content scrolls between the Top App Bar and the Tab Bar. No sticky elements within the content area — Train Together and Invite CTAs scroll with the content. The Tab Bar is sticky at the bottom.

### 13.3 Above the Fold

On standard device size (375×812), the following must be visible without scrolling:
- Squad Header (name, purpose if set, avatar stack, member count) — fully visible
- Train Together CTA — fully visible
- First 2–3 member rows — partially visible, signaling scrollability

The athlete who opens S-2 sees the squad identity, the primary action, and the beginning of the accountability content in the first glance.

### 13.4 Tap Targets

| Element | Minimum Size |
|---------|-------------|
| [←] back arrow | 44×44dp |
| [⋯] options | 44×44dp |
| Train Together CTA | Full-width × 56dp |
| Member rows (tappable) | Full-width × 56dp |
| "+ Invite to Squad" CTA | Full-width × 44dp |
| Squad Options sheet items | Full-width × 56dp each |

### 13.5 Member Row Height

Member rows are 56dp minimum height. Avatar (40dp) is vertically centered within the row. Name and presence state are vertically centered, name left-aligned, presence state right-aligned. 16dp horizontal padding from content edge.

### 13.6 Presence State Typography and Color

| State | Typography | Color |
|-------|-----------|-------|
| "Trained today" | 13sp, regular | Accent or positive secondary (to be defined in design tokens) |
| "Trained this week" | 13sp, regular | Secondary text color |
| "Not yet this week" | 13sp, regular | Secondary text color, muted |

"Trained today" uses a slightly more positive color treatment because it is the freshest presence signal. "Trained this week" and "Not yet this week" use the same secondary text color with different opacity or weight to indicate the state difference without creating a stark contrast that makes the "Not yet this week" state feel like a warning.

**What "Not yet this week" must not look like:**
- Red or orange text (alarm color)
- Strikethrough or any visual treatment suggesting failure
- Lower opacity to the point of appearing disabled

**What "Not yet this week" should look like:**
- The same visual register as other secondary text
- Readable and neutral
- Not hidden, not alarming

### 13.7 Squad Options Bottom Sheet

The Squad Options sheet follows standard bottom sheet behavior:
- Handle bar at top
- Items are full-width tappable rows, 56dp height
- Separator line between standard actions (Settings, Invite) and destructive actions (Leave, Delete)
- Destructive items ("Leave Squad," "Delete Squad") use destructive text color
- "Delete Squad" only appears for the squad creator
- Tapping outside the sheet or dragging down dismisses it

### 13.8 Orientation

S-2 supports portrait orientation only — consistent with all Forge Legacy screens.

### 13.9 Accessibility

- Squad Header name: not interactive; rendered as text content
- Member rows: `accessibilityLabel` = "[Name], [Presence State]" — screen reader reads member name and state together
- "You" row: `accessibilityLabel` = "You, [Presence State]"
- Train Together CTA: "Train Together, button"
- Invite CTA: "Invite to Squad, button"
- [⋯] options button: "Squad options, button"

---

## Section 14 — Validation Checklist

### Screen Architecture
- [ ] Top App Bar present with back arrow [←], squad name title (18sp, truncated), and [⋯] options button
- [ ] Back arrow navigates to S-1 and restores S-1 scroll position (per S-1 v1.1 Section 11.3)
- [ ] Bottom Tab Bar visible and functional
- [ ] Screen is NOT in full-screen mode
- [ ] Screen scrolls vertically; no horizontal scroll

### Squad Header
- [ ] Squad name displayed at 22–24sp, primary weight
- [ ] Squad icon displayed inline before squad name when icon is set (24dp)
- [ ] Squad icon absent when no icon selected — no placeholder, header layout unchanged from pre-amendment
- [ ] Icon supplements squad name and purpose — name and purpose retain typographic primacy
- [ ] Icon is decorative identity only — not a status, achievement, presence, or performance indicator
- [ ] Icon displayed on S-2 matches icon set in S-3 (same squad record, consistent across S-1 and S-2)
- [ ] Purpose displayed at 14sp, secondary color, when set; absent (no placeholder) when not set
- [ ] Avatar stack shown (up to 4 avatars, "+N" overflow for larger squads)
- [ ] Member count shown: "[X] members"
- [ ] Header is non-tappable — no navigation action on the header
- [ ] Squad name also appears in Top App Bar title (18sp, truncated)

### Squad Options (⋯)
- [ ] Squad Settings option navigates to squad edit screen
- [ ] Invite to Squad option opens invite flow
- [ ] Leave Squad option triggers confirmation sheet
- [ ] Delete Squad option visible only to squad creator; triggers confirmation sheet
- [ ] Destructive options (Leave, Delete) use destructive text color
- [ ] Options sheet dismissed by tap outside or drag down

### Train Together CTA
- [ ] "Train Together →" Primary CTA present between Squad Header and Members section
- [ ] Full-width, 56dp minimum height
- [ ] Navigates to S-10 with this squad's context (squad members shown first in partner list)
- [ ] CTA is accessible regardless of member count (including solo squads)

### Member List
- [ ] Section label "MEMBERS" above the list
- [ ] All squad members shown — no pagination, no "show more"
- [ ] Each row: avatar (40dp), member name (16sp), presence state (13sp, right-aligned)
- [ ] Member ordering: alphabetical by display name — fixed, independent of presence state
- [ ] Athlete's own row shows their name (or "You" treatment) and their own presence state
- [ ] Member rows are tappable — standard chevron [›] affordance at right edge
- [ ] Tapping member row opens Limited Athlete Profile modal (slides up from bottom)
- [ ] Row minimum height: 56dp

### Presence States
- [ ] "Trained today" — member trained within the current calendar day
- [ ] "Trained this week" — member trained within rolling 7-day window, not today
- [ ] "Not yet this week" — member has not trained in rolling 7-day window
- [ ] Only three states used — no other presence language
- [ ] "Not yet this week" does NOT use red, orange, or alarm color treatment
- [ ] "Not yet this week" does NOT show how many days since last training
- [ ] No streak counter visible anywhere on S-2
- [ ] Partial sessions count toward presence; discarded sessions do not

### Member Visibility Rules
- [ ] Avatar and name visible for all members
- [ ] Presence state visible for all members
- [ ] NO workout type visible for any member
- [ ] NO duration visible for any member
- [ ] NO sets, reps, weights, distance, or pace visible for any member
- [ ] NO chapter name or goal progress visible for any member
- [ ] NO program name or progress visible for any member
- [ ] NO rank or sub-tier visible for any member
- [ ] NO "most active" label or ranking of members by training frequency
- [ ] NO comparison between members in any form

### Limited Athlete Profile Modal
- [ ] Tapping any member row opens Limited Athlete Profile modal
- [ ] Modal slides up from bottom (bottom sheet behavior)
- [ ] Handle bar present at top of modal
- [ ] [×] dismiss button present, 44×44dp tap target
- [ ] Tap outside modal (dimmed S-2 content) dismisses modal
- [ ] Drag down gesture dismisses modal
- [ ] Back gesture while modal open closes modal, returns to S-2 (does not navigate to S-1)
- [ ] Dismissing modal returns S-2 to same scroll position
- [ ] Modal is read-only — no actions, no CTAs, no navigation links inside modal
- [ ] Profile photo displayed at 80–96dp circle, centered; initials rendered if no photo set
- [ ] Display name displayed at 20sp, centered
- [ ] Athlete type displayed at 14sp, secondary, centered
- [ ] Rank name displayed — name only, no sub-tier ("Architect" not "Architect IV")
- [ ] "Forging since [Month Year]" displayed at 13sp, secondary
- [ ] Accomplishments section shown when athlete has accomplishments (up to 3)
- [ ] Accomplishments section absent (no placeholder) when athlete has none
- [ ] Athlete's own row opens their own limited profile — same fields, no special treatment
- [ ] Rank sub-tier hidden — must not appear anywhere in modal
- [ ] Honors (count or list) hidden
- [ ] Chapter name or progress hidden
- [ ] Goals, goal progress hidden
- [ ] Workout history hidden
- [ ] Program name or progress hidden
- [ ] Progress photos hidden
- [ ] Body metrics hidden
- [ ] Any training performance data hidden
- [ ] Limited Athlete Profile visible only to squad members — not accessible outside squad context

### Accountability Without Shame
- [ ] Presence states use neutral-to-positive language only
- [ ] "Not yet this week" — forward-looking, window-based framing
- [ ] No "hasn't trained in X days" language anywhere
- [ ] No historical absence record visible
- [ ] No streak tracking or display
- [ ] Athlete's own row shown in same register as all other member rows — no special shame state
- [ ] Member position in list does not change based on presence state — ordering is fixed alphabetical

### Workout With Friend Integration
- [ ] Train Together CTA is the only WwF action on S-2
- [ ] No pending WwF action cards on S-2 (those live at W-1)
- [ ] No WwF badge, count, or notification on S-2
- [ ] Post-workout tagging (W-17 → W-20) not accessible from S-2

### Invite to Squad
- [ ] "+ Invite to Squad" Secondary CTA present below member list
- [ ] Minimum 44dp height
- [ ] Scrolls with content — not sticky
- [ ] Same action accessible from [⋯] → Invite to Squad

### Empty States
- [ ] Solo squad (1 member): athlete's own row shown, Train Together and Invite CTAs present, no error state
- [ ] No purpose: header shows name + member count only, clean layout
- [ ] All members "Not yet this week": standard member list, no special state or banner
- [ ] Pending invitations: not reflected in member list; invitees appear only after accepting

### Navigation
- [ ] Back [←] → S-1 (scroll position restored)
- [ ] Train Together → S-10 with squad context
- [ ] Invite CTA → squad invite flow (S-XX)
- [ ] [⋯] → Squad Options sheet
- [ ] Tab Bar — all tabs functional from S-2
- [ ] S-2 not accessible during active workout (Tab Bar hidden in W-9–W-16)
- [ ] Back from S-10 → S-2 restores S-2 scroll position

### Mobile UX
- [ ] Portrait orientation only
- [ ] Squad Header fully visible above fold on 375×812
- [ ] Train Together CTA fully visible above fold on 375×812
- [ ] First 2–3 member rows visible above fold (signals scrollability)
- [ ] All tap targets ≥ 44dp
- [ ] Train Together CTA 56dp minimum height
- [ ] "Not yet this week" presence state is visually readable — not hidden or faded to illegibility
- [ ] Top App Bar and Bottom Tab Bar respect safe areas
- [ ] Screen reader accessibility labels on all interactive elements

### Squad Philosophy Compliance
- [ ] No feed, no activity stream, no "Alex logged a workout" events
- [ ] No likes, comments, reactions
- [ ] No leaderboard, ranking, or comparison element
- [ ] Squad is private — nothing visible to non-members
- [ ] Screen feels: grounded, trustworthy, accountable, private
- [ ] Screen does NOT feel: competitive, performative, surveillance-oriented

---

*Forge Legacy Squad Detail Wireframe Specification — S-2*
*v1.3 — June 2026*
*All decisions derived from the Phase 2A locked architecture, the Forge Legacy Master PRD, the Forge Legacy UX Framework v1.0, the WwF System Spec v1.1, the S-1 Squads Hub Spec v1.1, and all other approved Phase 2B wireframe specifications.*
*This document is the authority for all Squad Detail implementation in Phase 2B.*

---

## Change Log

### v1.3 — June 2026

**Section 4.1 — Header Anatomy + New Section 4.6 — Squad Icon (Display Amendment)**

Squad icon added to Squad Header architecture. The icon system is defined in S-3 v1.1 (Section 6.4, nine built-in options). This amendment specifies how the selected icon appears on S-2.

| Element | v1.2 | v1.3 |
|---------|------|------|
| Squad Header identity display | Squad name only | Icon (if set, 24dp) inline before squad name |
| Header when no icon selected | Squad name only | Identical to v1.2 — no placeholder, no layout change |

**Placement:** Inline on the same line as the squad name. The icon is 24dp, scaled to balance with the 22–24sp header name. The squad purpose line and avatar stack below are not affected.

**Icon behavior:** Decorative identity only. Reinforces squad character without competing with the squad name or purpose. Both retain typographic primacy. The icon is not an activity indicator, achievement badge, or status signal.

**Absent-when-not-set rule:** Squads without a selected icon render identically to the pre-amendment header. No empty icon space. No "add an icon" affordance in the header.

**Cross-spec consistency:** The icon on S-2 and the icon on the S-1 squad card are the same value — both drawn from the same squad record. A settings change in S-3 propagates to both surfaces.

**Sections updated:** Section 3 (full scroll order — header line updated to show icon), Section 4.1 (header anatomy wireframe), new Section 4.6 (squad icon spec), Section 5.1 (visibility table), Section 14 (checklist — 5 new items under Squad Header).

---

### v1.1 — June 2026

**Section 5.3 — Member Row Anatomy (Architecture Change)**

Member rows are now tappable. The original v1.0 decision to make member rows non-interactive was a safe MVP default, deferred pending definition of inter-member privacy rules. Following a focused architecture and UX review, the Limited Athlete Profile was approved as an MVP component, making tappable member rows the correct behavior.

| Element | v1.0 | v1.1 |
|---------|------|------|
| Member row interaction | Non-tappable, no affordance | Tappable, chevron [›] affordance |
| Tap destination | None | Limited Athlete Profile modal |

**Section 5.5 (New) — Limited Athlete Profile Modal**

New section added defining the Limited Athlete Profile — a read-only bottom sheet modal accessible by tapping any member row on S-2.

**Approved visible fields:**

| Field | Rationale |
|-------|-----------|
| Profile photo (80–96dp) | Human identity; no comparison pressure |
| Display name | Already visible on S-2 |
| Athlete type | Self-declared training identity; categorical, non-hierarchical |
| Rank name (no sub-tier) | Legacy depth context; name is identity, sub-tier is comparison precision |
| Forging since (Month Year) | Journey context; not a performance metric |
| Top 3 accomplishments | User-declared life achievements; represent who the person is |

**Rank visibility rule:** Rank name visible ("Architect"). Rank sub-tier hidden ("Architect IV"). Rank name functions as identity and legacy context. Rank sub-tier functions as precision and comparison. The limited profile reinforces identity, not measurement.

**All other fields excluded:** Rank sub-tier, honors, current chapter, goals, goal progress, workout history, programs, progress photos, body metrics, training performance data, streak data, accomplishment dates.

**Modal behavior:** Bottom sheet, read-only, no actions. Dismissed via [×], drag down, or tap outside. Dismissal returns to S-2 at same scroll position.

**Validation Checklist:** "Member rows are NOT tappable" item replaced with tappability item + tap destination item. New "Limited Athlete Profile Modal" checklist section added with 25 items covering modal behavior, visible fields, hidden fields, and scope.

---

### v1.2 — June 2026

**Section 5.2 — Member Ordering (Architecture Change)**

Member ordering changed from presence-state grouping to fixed alphabetical order.

| Element | v1.1 | v1.2 |
|---------|------|------|
| Member ordering | Grouped: Trained today → Trained this week → Not yet this week | Fixed: alphabetical by display name |
| Position change on training | Member moves to top group when they train | Position never changes |
| Position change on absence | Member moves to bottom group when window expires | Position never changes |

**Rationale:** Presence-state grouping creates spatial hierarchy — trained members at the top, untrained members at the bottom. Spatial position communicates rank even without explicit ranking labels. An athlete alone in "Not yet this week" at the bottom of the list while all squadmates are in "Trained today" above them has been visually isolated by the product — a structural shame signal that no label language can fully counteract.

Fixed alphabetical ordering preserves all accountability visibility. Every member's presence state label ("Trained today," "Trained this week," "Not yet this week") remains fully visible. What is removed is the spatial dramatization of that state. The accountability signal is in the label. The position is independent of it.

**Key principle:** Forge Legacy requires accountability visibility. It does not require spatial emphasis of absence.

**Sections updated:** 3 (scroll order wireframe), 5.2 (member ordering rule), 7.3 (no comparative language rationale), 12.1 (edge case: only member trained), 12.2 (edge case: all trained today), 12.3 (edge case: new member).

**Validation Checklist:** "Member ordering: Trained today → Trained this week → Not yet this week" item replaced with "Member ordering: alphabetical by display name — fixed, independent of presence state." New Accountability Without Shame checklist item added: "Member position in list does not change based on presence state."
