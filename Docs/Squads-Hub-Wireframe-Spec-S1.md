# Forge Legacy — Squads Hub Wireframe Specification
## S-1 | Phase 2B | Version 1.2 — June 2026

---

## Preamble: What Squads Are For

A squad is not a social group. It is not a community. It is not a feed.

A squad is a small, private, high-trust circle of people who have chosen to hold each other accountable to the act of training. Not to the quality of training. Not to the volume. Not to the results. To the act. To showing up.

S-1 answers one question: **"What are we building together?"**

That question has two parts. "What are we building" speaks to purpose — each squad has a reason it exists, whether that reason is stated explicitly or simply understood. "Together" speaks to membership — these specific people, not the world, are your training circle.

S-1 should feel like walking into a room where your people are. You know who's here. You know why you're all here. You don't need to perform for each other. You just need to train.

**S-1 must never become:**
- A feed of what teammates did and didn't do
- A leaderboard where members are compared
- A pressure surface where absence is visible and felt
- An engagement system where activity generates notifications or reactions

**S-1 should leave the athlete feeling:** "I know where I belong and who I train alongside."

Not inspired by comparison. Not pressured by others' activity. Anchored. Connected. Focused.

---

## Section 1 — S-1 Goals

S-1 exists to accomplish four things:

1. **Surface squad membership** — show the athlete every squad they belong to in a single view, each with enough context to understand its purpose and people without navigating deeper
2. **Communicate collective presence** — let athletes see whether their squad has been active recently, expressed as group presence, never as individual performance
3. **Provide access to squad depth** — serve as the entry point into each squad's full context (S-2 Squad Detail), where Train Together and individual member activity are available
4. **Invite the athlete to create connection** — for athletes with no squad, offer a clear and non-pressured invitation to form one

**What S-1 answers:**
- Which squads do I belong to?
- What is each squad about?
- Who is in each squad with me?
- Has my squad been training recently?
- How do I get to a specific squad's details?
- How do I create a new squad?

**What S-1 does NOT answer:**
- How much has each member trained this week?
- Who specifically has or hasn't trained?
- How do my teammates' performance compare to mine?
- What did any teammate log in their last session?
- What are my teammates' chapters or goals?

**Why this scope:**
S-1 is a membership and context screen. It orients the athlete within their training communities without putting any member under scrutiny. The deeper context — individual member presence, squad activity, Train Together initiation — lives in S-2. S-1 shows the athlete enough to choose which squad they want to engage with and opens the door.

**Supporting the Forge Legacy mission:**
Squads exist to support the consistency that builds legacies. S-1 reinforces that the squad is a shared endeavor — not a monitoring system, not a comparison engine — by surfacing collective presence alongside shared purpose. "What are we building together?" is answered at the squad card level. The training itself is still private, personal, and owned by each athlete.

---

## Section 2 — Information Hierarchy

**TIER 1 — Squad Cards**
The athlete's squads. Each card is a complete picture of one squad: its name, its optional purpose, its members, and its collective presence. These are the primary content of S-1. Everything else is secondary to knowing where you belong and whether your people have been training.

**TIER 2 — Create a Squad CTA**
A single Secondary CTA at the bottom of the content area. Available at all times — even when the athlete is in squads, they can always form a new one. Present but unobtrusive.

**Tier 3 — Empty State / First Experience**
Appears only when the athlete has no squads. Replaces Tiers 1 and 2 with an invitation. Not a gate; not a requirement. An explanation of what squads are and a clear path to forming one.

**Hierarchy principle:**
The squad cards carry all the meaningful content. The Create CTA is always available but never competes with the cards. S-1 has no persistent Top App Bar actions that distract — the screen is the list of squads and the invitation to add more.

---

## Section 3 — Full Scroll Order

S-1 is a tab root screen. The Top App Bar does not have a back arrow.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  Squads                                    [+]          │  ← Top App Bar
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [⛰] [Squad Name 1]                            │   │  ← Squad Card (icon set)
│  │  [Squad purpose — 13sp, secondary, optional]    │   │
│  │                                                 │   │
│  │  [👤][👤][👤][👤]  4 members                   │   │
│  │                                                 │   │
│  │  3 of 4 trained this week          [  →  ]      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [Squad Name 2]                                 │   │  ← Squad Card (no icon)
│  │                                                 │   │
│  │  [👤][👤][👤]  3 members                        │   │
│  │                                                 │   │
│  │  All 3 trained this week           [  →  ]      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [Squad Name 3]                                 │   │  ← Squad Card (Tier 1)
│  │  [Squad purpose]                                │   │
│  │                                                 │   │
│  │  [👤][👤][👤][👤][👤]  +2  7 members            │   │
│  │                                                 │   │
│  │  No training logged this week      [  →  ]      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [  + Create a Squad  ]                                 │  ← Secondary CTA (Tier 2)
│                                                         │
├─────────────────────────────────────────────────────────┤
│  BOTTOM TAB BAR                                         │
└─────────────────────────────────────────────────────────┘
```

**Top App Bar:**
- Title: "Squads" — 18sp, centered or left-aligned per platform convention
- Right action: [+] — opens the squad creation flow. Secondary class — not a prominent button, a compact icon tap target (44×44dp)
- No back arrow — this is the tab root

**What appears above the fold on 375×812:**
The first squad card must be fully visible. A portion of the second card should be visible to signal scrollability on screens with multiple squads. The athlete arrives on S-1 and immediately sees: their primary squad, its purpose (if set), its members, and its presence indicator.

**Scroll behavior:**
Squads stack vertically. The list scrolls. No pagination, no tabs between squads. All squads accessible by scrolling. "Create a Squad" anchors the bottom of the content, not fixed to the bottom of the screen — it scrolls with the content and is reachable at the end of the list.

**Why this order:**
Squad cards first because squads are the reason this tab exists. Create CTA last because creation is a secondary action — the athlete's primary purpose on this screen is to engage with existing squads, not to create new ones.

---

## Section 4 — Squad Card Architecture

Each squad card is a self-contained unit that answers the question "What are we building together?" for one squad.

### 4.1 Card Anatomy

```
┌────────────────────────────────────────────────────────┐
│  [icon] [Squad Name]                                   │  ← Icon (if set, 20dp) + 16–18sp name
│  [Squad purpose or shared focus]                       │  ← 13sp, secondary color, optional
│                                                        │
│  [👤][👤][👤][👤]  +N more  ·  X members total        │  ← Member row
│                                                        │
│  [Presence indicator]                     [  →  ]      │  ← Footer: presence + navigation
└────────────────────────────────────────────────────────┘
```

When no icon is selected the name appears at the normal left position — layout identical to pre-amendment.

Entire card tappable → S-2 Squad Detail. The [→] is a visual affordance indicating tappability; it is not a separate tap target.

### 4.2 Squad Name

- 16–18sp, primary text color
- The squad's given name — set by the creator, editable by members (settings to be defined in S-2/S-XX)
- Full name displayed; no truncation unless exceeds 2 lines (edge case: long squad names wrap to 2 lines maximum)

**Why it's prominent:**
The squad's name is its identity. Members chose it. It should be readable at a glance without hunting.

### 4.3 Squad Purpose (Optional)

- 13sp, secondary text color
- A short description of the squad's focus — set during squad creation, optional
- Maximum 60 characters — one brief line
- If not set: field is absent. No placeholder. No "No description set." The card looks clean without it.

**Why it's optional:**
Not all squads need a stated purpose — some squads are simply "my training friends." Forcing a description creates friction at creation and produces low-quality filler text. Optional keeps it honest.

**What "purpose" means:**
This is not a goal in the chapter sense. It is not a deadline. It is the human-readable answer to "why does this group train together?" Examples: "Morning lift crew," "Marathon prep," "General accountability," "Lunch runs." It orients new members and reminds existing ones why this squad exists.

### 4.4 Member Row

```
│  [👤][👤][👤][👤]  +3  ·  7 members        │
```

**Member avatars:**
- First 4 members shown as circular avatar thumbnails — 28dp diameter
- Avatars overlap slightly (8dp overlap) to create a compact visual cluster
- Order: squad creator first, then members in join order
- If ≤4 members: all avatars shown, no overflow indicator
- If >4 members: 4 avatars shown + "+N" compact overflow label (e.g., "+3")

**Member count:**
- "[X] members" — always shown, even if ≤4
- 13sp, secondary text color
- Separator "·" between overflow indicator (if present) and member count

**What avatars communicate:**
The presence of real faces (or initials for members who haven't set an avatar) makes membership tangible. These are specific people, not abstract teammates. The limited-to-4 display keeps the card compact without hiding who's involved.

**What avatars do NOT communicate:**
- Activity status (no green presence dot on avatars at S-1 level)
- Performance level
- Any workout data

### 4.5 Presence Indicator

The presence indicator answers: "Has this squad been training?"

```
3 of 5 trained this week
All 3 trained this week
No training logged this week
```

**Three states:**

| State | Copy | Condition |
|-------|------|-----------|
| Full presence | "All [X] trained this week" | Every member logged at least one workout in the last 7 days |
| Partial presence | "[X] of [Y] trained this week" | At least one member trained, not all |
| No presence | "No training logged this week" | No member has logged a workout in the last 7 days |

**"This week" definition:**
Rolling 7-day window ending at the current moment. Not a calendar week reset. An athlete who trained last Thursday will show as "trained this week" for 7 days from that Thursday.

**Typography:**
- 13sp, secondary text color
- "All [X] trained this week" uses the same styling as the partial state — no special celebration styling. The copy speaks; the design stays calm.

**Why aggregate, not individual:**
Showing which specific members have or haven't trained at S-1 level creates visible accountability pressure. An athlete scrolling S-1 who hasn't trained this week would see their name's absence from an "has trained" list. That is monitoring, not accountability. The aggregate count shows whether the squad is active as a unit. It encourages without exposing. Individual presence is visible in S-2 — the athlete who wants to know whether a specific member has trained can navigate deeper.

**Why "No training logged this week" instead of "0 of 4 trained this week":**
"0 of 4" is a mathematical statement that reads as failure. "No training logged this week" is factual and directionless — it describes a state without pronouncing on it. The squad has been quiet. That's all the screen says.

**Why the presence indicator belongs on S-1:**
Without it, S-1 is purely a directory. With it, S-1 answers "is this squad alive?" The athlete who opens S-1 and sees that 3 of 5 people have trained this week gets a quiet signal: their people are active. That signal matters. It creates the low-level social presence that accountability requires — without naming who has or hasn't contributed.

### 4.7 Squad Icon (Optional)

The squad icon is a small inline element that appears immediately to the left of the squad name on the squad card.

**When set:**
- A 20dp icon glyph renders inline before the squad name on the same line
- The name follows immediately to the right of the icon, at normal size and weight (16–18sp)
- The icon and name together occupy the same vertical line — no stacking, no additional card height

**When not set:**
- The squad name appears at the standard left position with no icon prefix
- No placeholder, no empty space, no "add an icon" prompt
- The card layout is identical to the pre-amendment treatment

**What the icon communicates:**
Squad identity and character — the squad's sense of itself. "Mountain" for an outdoor training crew. "Hammer" for a strength-focused group. The icon is decorative in the design sense: it reinforces what the squad name already says.

**What the icon does NOT communicate:**
- Activity state or presence (not a green dot, not an activity indicator)
- Achievement or milestone (not a badge, not a reward)
- Performance or ranking (not a tier marker)
- Squad status (not an "active" or "new" flag)

**Icons are set in Squad Settings (S-3).** The nine available options: Mountain, Shield, Barbell, Wolf, Eagle, Compass, Tree, Hammer, Fire. Selected via S-3 Section 6.4. No icon is the default.

---

### 4.6 Card Height and Spacing

- Card height: variable. Minimum ~96dp (no description) to ~116dp (with description)
- Card corner radius: consistent with the card hierarchy established in the UX Framework
- Card margin: 16dp horizontal padding from screen edge
- Card spacing: 12dp between cards
- Inner card padding: 16dp all sides

---

## Section 5 — Multiple Squad Behavior

### 5.1 Card Ordering

Squad cards are ordered by most recent member activity (most recently active squad first). The squad where any member trained most recently appears at the top. This surfaces the most relevant squad without requiring any manual ordering.

**Why activity-based ordering:**
An athlete who trains with Squad A three times a week and Squad B once a month will almost always want to engage with Squad A first. Alphabetical ordering is predictable but not helpful. Activity ordering is contextually appropriate for an accountability product.

**Tie-breaking:**
If two squads had activity within the same calendar day, order by squad creation date (oldest first). This is a rare edge case and the tiebreaker is invisible to the athlete.

### 5.2 Squad Count Limit

**Free tier:** Maximum 2 squads (belong to or create combined). **Premium:** Unlimited.

When a free-tier athlete in 2 squads attempts to create or join a third, M-7 Premium Upsell Sheet fires. Squad invitations received while at the free-tier limit are visible but cannot be accepted until the athlete upgrades or leaves a current squad.

On downgrade from premium: athlete remains in all squads. Cannot create or join new squads until below the 2-squad limit. No squad deletion on downgrade. Leaving a squad restores a free slot.

**Authority:** Critical Decisions Amendment 001 (June 2026). Supersedes prior "No Limit on Squad Count" language. See also Monetization Architecture Amendment 001 (updated).

### 5.3 No Grouping or Sections

All squads appear in one flat list. No sections for "Active" vs "Inactive" squads. No "suggested" squads. No grouping by creation date or member overlap. One list. All squads. Ordered by activity.

### 5.4 No "Primary Squad" Concept

No squad is designated as primary or featured. The most active squad appears first by default. No pinning mechanism in MVP. Athletes navigate to the squad they want by scrolling.

---

## Section 6 — Empty State

When the athlete belongs to no squads:

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  Squads                                    [+]          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                                                         │
│  [Squad icon — muted, ~48dp]                            │  ← Simple icon, not an illustration
│                                                         │
│  Training alongside someone                             │  ← Primary copy, 18sp
│  changes how it feels to show up.                       │
│                                                         │
│  A squad is a small, private group of people            │  ← Secondary copy, 13sp
│  who hold each other accountable to training.           │
│  Not to results. To showing up.                         │
│                                                         │
│  [  Create a Squad  ]                                   │  ← Primary CTA
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  BOTTOM TAB BAR                                         │
└─────────────────────────────────────────────────────────┘
```

**What appears:**
- Muted icon representing connection or group (not an empty state illustration — this is not W-1's "no workouts" empty state; it is an invitation)
- Primary copy explaining the human value of squads — one sentence, 18sp
- Secondary copy explaining what a squad is — 2–3 sentences, 13sp, secondary color
- "Create a Squad" Primary CTA

**What does not appear:**
- "No squads found" — this implies a failed search, not a first-time state
- "Join a squad" — squads are private; you cannot browse or join them without invitation
- Suggested squads — there are no public squads to discover
- Any indication that training without a squad is insufficient

**Why this tone:**
The athlete on the empty state is likely new, or has recently left all squads. The screen should make squads feel worth creating — not make the athlete feel they're missing something. "Training alongside someone changes how it feels to show up" is true, warm, and an invitation without being a claim about the athlete's current situation.

**"Create a Squad" as Primary CTA here only:**
The empty state is the one context where "Create a Squad" is Primary class. On the populated S-1 (with cards), it is Secondary class. The elevated state on the empty screen is appropriate — creating a squad IS the primary action when the athlete has none.

---

## Section 7 — First Squad Experience

The athlete has just created their first squad. They return to S-1. The squad exists with one member: themselves.

```
┌─────────────────────────────────────────────────────────┐
│  Squads                                    [+]          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [Squad Name]                                   │   │
│  │  [Purpose if set]                               │   │
│  │                                                 │   │
│  │  [👤]  1 member                                 │   │
│  │                                                 │   │
│  │  Invite someone to train with you  [  →  ]      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [  + Create a Squad  ]                                 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  BOTTOM TAB BAR                                         │
└─────────────────────────────────────────────────────────┘
```

**What changes from the normal card:**
- Single avatar (the athlete's own)
- "1 member"
- Presence indicator replaced by: "Invite someone to train with you" — a gentle, forward-looking prompt

**What this copy says:**
"Invite someone to train with you" acknowledges that the squad is new and currently alone. It is not an error state. The squad exists. The athlete created it. Inviting someone is the natural next step — and the card makes that step visible without making it feel urgent.

**What this copy does NOT say:**
- "Your squad is empty" — not empty, it has 1 member
- "Add members to get started" — no gatekeeping; the athlete can train solo and the squad still functions as their own private context
- "You're the only one here" — this is factual but reads as lonely rather than formative

**The squad is functional immediately:**
A squad with 1 member is a valid squad. The athlete can use Train Together from S-2 with any athlete even before anyone has "joined" in a formal sense. The invitation model for expanding the squad is defined in S-2 and the squad management screens.

---

## Section 8 — Workout With Friend Integration

### 8.1 S-1's Role in the WwF System

S-1 is the starting point for outbound WwF flows. The path from S-1 to a tagged workout is:

```
S-1 (Squad Hub)
        ↓  tap squad card
S-2 (Squad Detail)
        ↓  "Train Together" action
S-10 (Train Together — partner selection)
        ↓  "Start Training Together"
W-1 (Workouts Hub) → workout begins
        ↓  workout completes
W-17 (Workout Summary) → partner tag fires on "Done"
```

S-1 does not expose a Train Together action directly. Train Together requires knowing which squad context you're initiating from, and that context lives in S-2.

### 8.2 Incoming WwF Actions

Incoming WwF actions — pending Unclaimed Workout cards (M-8) and Pending Approval cards (M-9) — are handled at **W-1, not S-1**. The WwF System Spec (WwF v1.1) establishes W-1 as the management surface for all incoming partner activity.

S-1 does not duplicate these cards. An athlete with 3 pending WwF claims sees those claims at W-1, not at S-1.

**Why this separation:**
WwF claims are workout-context actions — they respond to training events and should live in the workout context (W-1). S-1 is about squad membership and collective presence. Mixing incoming WwF actions into S-1 would create a notification hub that competes with the squad identity purpose of the screen.

### 8.3 No WwF Badge or Count on S-1

S-1 does not show a count of pending WwF items on any squad card. Pending items are surfaced at W-1. S-1 remains focused on squad context.

### 8.4 Squad Membership as WwF Consent Signal

The squad cards on S-1 implicitly reflect WwF consent context: members shown on a squad card are squad members. Squad members auto-accept at the WwF claim/dismiss level (M-8 flow). This relationship is established in the WwF spec and does not need to be surfaced on S-1 — it is an architectural truth, not a visible UI element.

---

## Section 9 — Squad Activity Visibility Rules

### 9.1 What Is Visible at S-1

| Element | Visible on S-1 |
|---------|----------------|
| Squad name | Yes |
| Squad icon (if set) | Yes |
| Squad purpose/description | Yes (if set) |
| Member avatars (up to 4) | Yes |
| Total member count | Yes |
| Aggregate presence ("X of Y trained this week") | Yes |
| Individual member names | No |
| Which specific members have or haven't trained | No |
| Any performance metric | No |
| Workout type, duration, sets, reps, distance | No |
| Chapter or goal information for any member | No |
| Partner tag activity | No |

### 9.2 What Is Visible at S-2 (Squad Detail — for future spec reference)

S-2 will surface individual member presence (trained or not trained recently) without performance data. The transition from S-1's aggregate to S-2's individual view is the depth transition. Members who want accountability detail navigate into the squad; members who only want orientation stay at S-1.

### 9.3 "This Week" Window

Presence indicator is based on a rolling 7-day window. A workout logged at any time in the last 7 days counts. Activity type does not matter — any logged workout contributes to the presence signal. Partial sessions (saved via "Save & Exit") count. Abandoned sessions (Discard) do not count.

### 9.4 The Presence Signal Updates in Real Time

When the athlete opens S-1, the presence indicator reflects the current state. If a squad member logs a workout while the athlete is on S-1, the indicator may update (implementation-level pull-to-refresh or background sync — out of scope for this spec). For MVP, the indicator is accurate as of screen load.

---

## Section 10 — Presence vs Performance Rules

This section establishes the philosophical boundary enforced throughout S-1.

### 10.1 Presence

**Presence answers:** "Did this person train?"

Presence is binary. Yes or no. Present or not present. Presence asks nothing about what was trained, how much, how hard, or whether it was a good session.

At S-1, presence is aggregated: "3 of 5 trained this week." This is the only form of activity data S-1 expresses.

**Presence is appropriate for S-1 because:**
- It creates the accountability signal squads exist to provide
- It does so without revealing what any individual did or didn't do
- It answers "is this squad active?" without answering "who is the best performer?"
- It supports encouragement without enabling comparison

### 10.2 Performance

**Performance answers:** "How much did this person do, and how does it compare?"

Performance includes: sets, reps, weight, distance, pace, duration, volume, PRs, goal progress percentages, chapter advancement, and any metric that can be used to rank or compare athletes.

**Performance is absent from S-1 because:**
Performance visibility in a squad context converts the squad from an accountability system into a comparison engine. An athlete who sees that a squad member lifted more, ran further, or advanced their goal faster is now in competition — even if the product didn't intend it. Competition changes the relationship. The athlete who is "behind" begins to feel shame. The athlete who is "ahead" begins to feel superiority. Neither serves training. Neither serves legacy.

Forge Legacy is built on Accountability Without Shame. Presence enables accountability. Performance introduces shame. S-1 shows presence. S-1 never shows performance.

### 10.3 The Line

| Shows on S-1 | Never shows on S-1 |
|-------------|-------------------|
| Trained / Did not train (aggregate) | Sets, reps, weights |
| Member names (in avatars) | Distance, pace, duration |
| Squad name and purpose | Chapter progress % |
| Member count | Goal completion % |
| Collective presence count | PR indicators |
| — | Any rank or comparison |

This line does not move. It is not contextual. It is not overridden for premium users, coaches, or squad admins.

---

## Section 11 — Navigation Paths

### 11.1 From S-1

| Action | Destination |
|--------|-------------|
| Tap squad card (any area) | S-2 Squad Detail for that squad |
| Tap [+] in Top App Bar | Squad creation flow (S-XX) |
| Tap "Create a Squad" Secondary CTA (populated S-1) | Squad creation flow (S-XX) |
| Tap "Create a Squad" Primary CTA (empty state) | Squad creation flow (S-XX) |
| Tab Bar — Home | H-1 Home |
| Tab Bar — Legacy | L-1 Legacy Hub |
| Tab Bar — Workouts | W-1 Workouts Hub |
| Tab Bar — Profile | Profile modal |

### 11.2 S-1 Is Not Reachable from Active Workout

S-1 is a Tab Bar root screen. During an active workout (W-9 through W-16), the Tab Bar is hidden. S-1 is not accessible during an active session. This is consistent with the full-screen workout mode established in the Active Workout Flow spec.

### 11.3 Returning to S-1

S-1 scroll behavior depends on how the athlete returns:

**Back navigation from S-2:** When the athlete navigates from S-1 to S-2 via a squad card tap and returns using the back gesture or system back action, S-1 restores the scroll position from before the navigation. The athlete lands where they left — not at the top.

**Tab Bar entry from another tab:** When the athlete enters S-1 via the Bottom Tab Bar while on a different tab (e.g., returning from W-1, H-1, or L-1), S-1 loads at the top of the list.

**Tab Bar tap while already on S-1:** When the athlete taps the Squads tab while already on S-1, the screen returns to the top of the list. This is the standard mobile "tap to scroll to top" behavior.

**Why the distinction matters:** Back navigation from S-2 is a navigation stack pop — the athlete went deeper and came back. Standard mobile convention restores the position for this case. Tab Bar entry is a fresh arrival at the screen's root — top is the correct anchor.

### 11.4 Deep Link from WwF Notification

M-8 and M-9 push notifications deep-link to W-1, not to S-1. WwF actions live at W-1. S-1 is not a notification destination.

---

## Section 12 — Edge Cases

### 12.1 Athlete in One Squad

S-1 shows a single card centered in the screen with normal spacing. "Create a Squad" CTA follows below. No "you only have one squad" message. The card appears and the screen is shorter than usual — this is correct.

### 12.2 Squad With One Member (Solo Squad)

Valid state. The card shows 1 avatar, "1 member," and the "Invite someone to train with you" prompt replacing the presence indicator. Tapping → S-2 where squad management is available. This is not an error.

### 12.3 All Squad Members Trained This Week

Card shows "All [X] trained this week." Typography and styling are identical to the partial state. No celebration styling, no special color, no confetti. The copy communicates the achievement; the product does not amplify it.

### 12.4 Squad Has Not Been Active in Over 7 Days

"No training logged this week" appears. No secondary copy explaining how long it's been quiet. No "Your squad hasn't been active in 14 days" message. The neutral copy is factual and complete. The athlete who wants context can tap into S-2.

### 12.5 Squad With a Very Long Name

Squad names wrap to 2 lines maximum. If the name exceeds what fits on 2 lines at the card's content width, the name truncates with an ellipsis. Truncation is rare — most squad names are short by nature. This edge case is handled by the card layout, not by a name limit on creation.

### 12.6 Squad With Many Members (7+)

Avatar row shows first 4 avatars + "+[N]" overflow label. "7 members" or "12 members" displayed in the member count. Presence indicator scales correctly: "6 of 12 trained this week." No layout change needed for large squads at S-1 level.

### 12.7 Athlete Receives a Squad Invitation While Viewing S-1

Squad invitations are handled in notification or settings flow (out of scope for this spec). S-1 does not refresh to show a new squad in real time. Accepted invitations appear as a new squad card on next S-1 load.

### 12.8 Athlete Leaves a Squad

The squad card disappears from S-1. If the athlete was in one squad and leaves it, S-1 returns to the empty state. No undo. No "You have left [Squad Name]" persistent message on S-1.

### 12.9 Athlete Is Removed from a Squad by Another Member

Same as Case 12.8 from the S-1 perspective — the card disappears. Notification of removal is handled by the notification system (out of scope for this spec).

### 12.10 Athlete Has More Squads Than Fit in One Screen Height

The list scrolls naturally. No maximum is enforced. Cards continue to stack. The Tab Bar remains visible and accessible because S-1 is not in full-screen mode.

---

## Section 13 — Mobile UX Considerations

### 13.1 Screen Mode

S-1 is a standard Tab Bar screen. The Top App Bar and Bottom Tab Bar are visible and accessible at all times. S-1 does not use full-screen mode.

### 13.2 Scroll Behavior

Vertical scroll only. Content begins below the Top App Bar and extends to the bottom content edge. The "Create a Squad" CTA scrolls with the content — it is not sticky. The Tab Bar is sticky (fixed to the bottom of the screen).

### 13.3 Above the Fold

On standard device size (375×812), the following must be visible without scrolling:
- First squad card, fully visible
- Top portion of the second squad card visible (signals scrollability)

If the athlete belongs to only one squad: the entire card and the "Create a Squad" CTA are visible without scrolling.

### 13.4 Tap Targets

| Element | Minimum Size |
|---------|-------------|
| Full squad card (tappable area) | Full width × card height (minimum 96dp) |
| [+] icon in Top App Bar | 44×44dp |
| "Create a Squad" Secondary CTA | Full width × 44dp |
| "Create a Squad" Primary CTA (empty state) | Full width × 56dp |

### 13.5 Avatar Stack Layout

Avatars within the member row are 28dp circles with 8dp of overlap (20dp spacing between centers). The stack is left-aligned within the card content area. The "+N" overflow label (if present) is 13sp, secondary text, positioned immediately after the last avatar with standard 8dp gap.

### 13.6 Card Width and Padding

Cards span the full content width minus 16dp margins on each side (full-bleed on 375dp = 343dp card width). Card inner padding: 16dp on all sides. Cards do not have separate horizontal margin from the content edge — the 16dp margin serves as both screen edge padding and card outer spacing.

### 13.7 Orientation

S-1 supports portrait orientation only — consistent with all other Forge Legacy tab root screens.

### 13.8 S-1 Accessibility Considerations

- Squad cards must be fully described for screen reader users: "Squad card: [Squad Name]. [X] members. [Presence indicator copy]. Double-tap to open squad."
- Avatar images carry member name as accessibility label
- Overflow "+N" label: "Plus [N] more members" for screen readers
- [+] button: "Create a new squad"

---

## Section 14 — Validation Checklist

### Screen Architecture
- [ ] Top App Bar present with "Squads" title (18sp) and [+] action (44×44dp tap target)
- [ ] No back arrow — this is a tab root screen
- [ ] Bottom Tab Bar visible and functional
- [ ] Full-screen mode is NOT active on S-1
- [ ] Screen scrolls vertically; no horizontal scroll

### Squad Cards (Populated State)
- [ ] Squad name present (16–18sp, primary)
- [ ] Squad icon displayed inline before squad name when icon is set (20dp)
- [ ] Squad icon absent when no icon selected — no placeholder, card layout unchanged from pre-amendment
- [ ] Icon supplements squad name — squad name always visible alongside icon
- [ ] Icon is decorative identity only — not a status, achievement, presence, or performance indicator
- [ ] Squad purpose shown when set; absent when not set — no placeholder
- [ ] Member avatars shown (up to 4); overflow "+N" label when > 4
- [ ] Total member count shown ("X members")
- [ ] Presence indicator shows one of three states: "All X trained," "X of Y trained," "No training logged"
- [ ] Full card is tappable → S-2 for that squad
- [ ] [→] affordance visible at card bottom right
- [ ] Card height minimum 96dp (no description) / ~116dp (with description)
- [ ] Cards ordered by most recent member activity (most active first)
- [ ] Card spacing: 12dp between cards
- [ ] Card horizontal margin: 16dp from screen edge

### Squad Card Content Rules
- [ ] No individual member names shown at S-1 level
- [ ] No indication of which specific members have or haven't trained
- [ ] No performance data of any kind (no sets, reps, weights, distance, pace, duration)
- [ ] No chapter or goal data for any member
- [ ] No WwF pending action cards on S-1 (those live at W-1)
- [ ] No leaderboard, ranking, or comparison element

### Create a Squad CTA
- [ ] "Create a Squad" Secondary CTA present below squad cards on populated S-1
- [ ] CTA scrolls with content — not sticky
- [ ] CTA minimum 44dp height

### Empty State
- [ ] Empty state shown when athlete belongs to no squads
- [ ] Muted squad icon (no illustration)
- [ ] Primary copy (18sp) explains the human value of squads — one sentence
- [ ] Secondary copy (13sp) explains what a squad is — 2–3 sentences
- [ ] "Create a Squad" PRIMARY class CTA (56dp minimum height) on empty state only
- [ ] No "No squads found" copy
- [ ] No "Join a squad" path (squads are private)

### First Squad Experience (1 Member)
- [ ] Squad card shows 1 avatar (athlete's own), "1 member"
- [ ] Presence indicator replaced by "Invite someone to train with you"
- [ ] Card is tappable → S-2
- [ ] No error or incomplete state styling

### Workout With Friend Integration
- [ ] Train Together is NOT accessible directly from S-1 — path is S-1 → S-2 → S-10
- [ ] No WwF pending action cards on S-1
- [ ] No badge or count of pending WwF items on squad cards
- [ ] WwF system (M-8, M-9, claim/dismiss) is handled at W-1

### Activity Visibility
- [ ] Presence indicator is aggregate count only — no individual attribution
- [ ] "All X trained this week" for 100% presence
- [ ] "X of Y trained this week" for partial presence
- [ ] "No training logged this week" for zero presence
- [ ] "This week" = rolling 7-day window
- [ ] Partial sessions count toward presence; discarded sessions do not

### Presence vs Performance
- [ ] Zero performance data visible anywhere on S-1
- [ ] No sets, reps, weights, distance, pace, duration, volume
- [ ] No chapter progress percentages for any member
- [ ] No goal advancement data for any member
- [ ] No PR or milestone indicators for any member
- [ ] No comparison between members of any kind
- [ ] No rank or ordering of members by performance

### Navigation
- [ ] Tap squad card → S-2 Squad Detail for that squad
- [ ] Tap [+] → squad creation flow
- [ ] Tap "Create a Squad" → squad creation flow
- [ ] Tab Bar navigation to W-1, H-1, L-1, Profile modal — all functional
- [ ] S-1 not accessible during active workout (Tab Bar hidden in W-9–W-16)
- [ ] Back navigation from S-2 → S-1: scroll position restored to pre-navigation state
- [ ] Tab Bar entry from another tab → S-1: loads at top of list
- [ ] Tab Bar tap while already on S-1: returns to top of list

### Accountability Without Shame
- [ ] No indication that any member has "failed" to train
- [ ] "No training logged this week" uses neutral framing — not "nobody showed up"
- [ ] No member is individually exposed for non-participation at S-1 level
- [ ] Presence indicator uses positive count framing ("X trained") not negative ("Y didn't train")
- [ ] No reminder or nudge language on squad cards

### Squads Philosophy
- [ ] S-1 answers "What are we building together?" — purpose + membership + presence visible
- [ ] No feed, no likes, no comments, no reactions
- [ ] No public visibility — squads are private and only visible to members
- [ ] No competitive mechanics (leaderboards, rankings, streaks comparisons)
- [ ] Screen feels: supportive, private, focused, trustworthy
- [ ] Screen does NOT feel: competitive, performative, feed-oriented

### Mobile UX
- [ ] Portrait orientation only
- [ ] First squad card fully visible above fold on 375×812
- [ ] Second card partially visible to signal scroll (when multiple squads exist)
- [ ] All tap targets ≥ 44dp
- [ ] Squad cards minimum 96dp height
- [ ] Avatar circles 28dp diameter
- [ ] Screen reader accessibility labels on all interactive elements
- [ ] Top App Bar and Bottom Tab Bar respect safe areas

---

*Forge Legacy Squads Hub Wireframe Specification — S-1*
*v1.2 — June 2026*
*All decisions derived from the Phase 2A locked architecture, the Forge Legacy Master PRD, the Forge Legacy UX Framework v1.0, the WwF System Spec v1.1, and the approved H-1, L-1, L-3/L-4, W-1, W-9–W-16, and W-17 wireframe specifications.*
*This document is the authority for all Squads Hub implementation in Phase 2B.*

---

## Change Log

### v1.2 — June 2026

**Section 4.1 — Card Anatomy + New Section 4.7 — Squad Icon (Display Amendment)**

Squad icon added to squad card architecture. The icon system is defined in S-3 v1.1 (Section 6.4, nine built-in options). This amendment specifies how the selected icon appears on S-1.

| Element | v1.1 | v1.2 |
|---------|------|------|
| Squad card identity display | Squad name only | Icon (if set, 20dp) inline before squad name |
| Card when no icon selected | Squad name only | Identical to v1.1 — no placeholder, no layout change |

**Placement:** Inline on the same line as the squad name. The icon is 20dp, matched to the 16–18sp name height. No additional card height required.

**Icon behavior:** Decorative identity only. Communicates squad character (Mountain, Shield, Hammer, etc.) — not activity, presence, achievement, or status. The icon supplements the name; it does not replace it. Squad name is always visible.

**Absent-when-not-set rule:** Squads without a selected icon render identically to the pre-amendment card. No empty icon space. No "add an icon" affordance on the card. Icon selection lives in Squad Settings (S-3).

**Sections updated:** Section 3 (full scroll order — Squad Name 1 shows icon, Squad Name 2 shows none to demonstrate optional behavior), Section 4.1 (card anatomy wireframe), new Section 4.7 (squad icon spec), Section 9.1 (visibility table), Section 14 (checklist — 4 new items under Squad Cards).

---

### v1.1 — June 2026

**Section 11.3 — Scroll Position Restoration (Architecture Amendment)**

Revised the blanket "reset to top on all returns" rule to reflect standard mobile navigation stack behavior. The original language did not distinguish between back navigation (navigation stack pop) and Tab Bar entry (fresh screen arrival), which incorrectly applied Tab Bar reset behavior to back navigation from S-2.

| Navigation Type | v1.0 Behavior | v1.1 Behavior |
|----------------|---------------|---------------|
| Back from S-2 → S-1 | Reset to top | Restore scroll position |
| Tab Bar entry from another tab | Reset to top | Reset to top (unchanged) |
| Tab Bar tap while on S-1 | Reset to top | Reset to top (unchanged) |

**Rationale:** Back navigation from S-2 is a navigation stack pop — the athlete went deeper and came back. Standard iOS/Android convention restores scroll position for this case. The correction aligns S-1 with platform convention and eliminates friction for athletes navigating sequentially through multiple squads.

**Validation Checklist:** Navigation section updated with three distinct checklist items replacing the single "Returning to S-1 from S-2: S-1 reloads at top of list" item.

**Architecture decision that prompted this change:** Squad Ordering (activity-based) and Scroll Position Restoration were both reviewed following S-1 v1.0 completion. Squad Ordering was confirmed unchanged. Scroll Position Restoration was revised as documented here.
