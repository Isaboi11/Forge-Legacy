# Forge Legacy — Profile Wireframe Specification
## P-1 | Phase 2B | Version 1.0 — June 2026

---

## Preamble: What the Profile Is For

The Profile is not a dashboard. It is not a statistics page. It is not a social profile.

The Profile answers one question: **"Who am I becoming?"**

That question has two parts. "Who am I" speaks to identity — the name, the rank, the athlete type, the time on this journey. "Becoming" speaks to story in motion — the chapter being built right now, the honors earned along the way, the accomplishments declared as milestones.

The athlete who opens their Profile should feel the weight of what they have built and the pull of what they are still building. Not the pressure of numbers they need to improve. Not a dashboard reminding them of metrics. The feeling of being in the middle of something worth finishing.

**The Profile must never become:**
- A workout statistics page
- A performance optimization surface
- A social page with followers, likes, or comparison mechanics
- A trophy room where honors are the primary product

**The Profile should leave the athlete feeling:** "I am building something meaningful."

Not: "I need better numbers."

---

## Section 1 — P-1 Goals

P-1 exists to accomplish six things:

1. **Establish identity** — show the athlete who they are in this product: their name, their athlete type, their rank, and when their journey began
2. **Surface the active story** — show the chapter the athlete is currently building, with its primary goal, so the athlete always knows what they are working toward
3. **Acknowledge earned depth** — show the athlete's rank (name and sub-tier) as a recognition of how far they have come, without turning it into a gamification surface
4. **Display recognition** — show the honors the system has earned on the athlete's behalf, and the accomplishments the athlete has declared, as a record of what has been built
5. **Provide access to editing** — make it easy to update the parts of the profile that belong to the athlete to manage
6. **Provide access to settings** — a single, clean entry point to the full settings system without making settings feel like the purpose of this screen

**What P-1 answers:**
- Who am I as an athlete in this product?
- What am I building right now?
- What rank and recognition have I earned?
- What achievements have I declared?
- How do I edit my profile?
- How do I access settings?

**What P-1 does NOT answer:**
- How many workouts have I logged total?
- How much volume did I train last week?
- What are my one-rep maxes?
- Am I ahead or behind on my training consistency?
- How do I compare to other athletes?
- What should I do next?

**Why this scope:**
P-1 is an identity screen, not a performance screen. The data that answers "how am I doing?" belongs in the Workouts tab (W-1, W-18, W-19). The chapter goals and progress belong in the Legacy tab (L-3, L-7). P-1 is the surface where the athlete sees the whole shape of who they are — not the detail of what they did last Tuesday.

**Supporting the Forge Legacy mission:**
Forge Legacy treats the athlete as the protagonist of an ongoing story. The Profile is the protagonist's card — not their stats sheet. Rank reflects the depth of a legacy built over time, not a score to chase. Honors represent the system's recognition of what has been achieved. Accomplishments are the athlete's own declaration of what matters to them. Together, they tell a story. Not a dashboard.

---

## Section 2 — Information Hierarchy

**TIER 1 — Identity Header**
The athlete's core identity. Photo, name, athlete type, rank, and the date their journey began. This is the first thing the athlete sees when they open the Profile. It is the anchor. Everything else on the screen is in service of the story this header begins.

**TIER 2 — Current Chapter Card**
The active chapter — what the athlete is building right now. Displayed as a visual card with elevated treatment, not a flat section row. Chapters are the primary storytelling unit of Forge Legacy. On L-1, the current chapter gets featured card treatment at Tier 1. On P-1, it gets elevated card treatment at Tier 2. The card communicates: this chapter has weight. It matters.

**TIER 3 — Rank**
The athlete's rank name and sub-tier. This is identity, not a metric. "Architect IV" tells the athlete who they have become through the depth of their legacy. It does not show a progress bar. It does not show a percentage to the next tier. Those mechanics live one tap away on P-3 Rank Detail — for athletes who want them. P-1 shows the identity signal, not the optimization mechanic.

**TIER 4 — Honors**
System-awarded recognition. Honors are what Forge Legacy has acknowledged the athlete has earned. Three most recent honors shown with a total count. This is a record, not a leaderboard. "View all →" goes to L-10.

**TIER 5 — Accomplishments**
User-declared real-world achievements. Things the athlete is proud of that the app cannot detect. Top 3 shown with a total count. An Add Accomplishment CTA is visible here — this is the natural surface to remember to add something new. "View all →" goes to L-12.

**TIER 6 — Settings**
A single utility row. Settings is the entry point to the full settings system (P-4 through P-8). It is at the bottom because it is maintenance, not identity. The athlete who came to P-1 to see their story does not need settings at the top. The athlete who came to change a notification preference will scroll.

**Hierarchy principle:**
The Identity Header establishes who the athlete is. The Chapter Card shows what they are building. Rank acknowledges how deep the legacy has grown. Honors and Accomplishments are the record of what has been earned and declared. Settings is infrastructure. This order reflects the product's values: identity before data, story before settings, legacy before tools.

---

## Section 3 — Full Scroll Order

P-1 is a modal sheet. It is accessed via the top-right avatar button from any tab. It is not a tab root screen.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  ─────  (handle bar)                           [×]      │  ← Modal handle + dismiss
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Profile Photo — 88dp circle, centered]                │  ← TIER 1: Identity Header
│                                                         │
│  [Display Name — 22sp, centered, primary weight]        │
│  [Athlete Type — 14sp, secondary, centered]             │
│  [Rank Name · Sub-tier — 14sp, secondary, centered]     │
│  Forging since [Month Year] — 13sp, secondary, centered │
│                                                         │
│  [  Edit Profile  ]                                     │  ← Secondary CTA
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │  ← TIER 2: Chapter Card
│  │  [Chapter Name — 18–20sp, primary weight]       │   │
│  │  [Primary Goal — 14sp, secondary]               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  RANK                                                   │  ← TIER 3: Rank
│  [Rank Name] · [Sub-tier]                    [  →  ]   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  HONORS  12                              View all  →   │  ← TIER 4: Honors
│  First Chapter Completed                               │
│  50 Workouts Logged                                    │
│  First Goal Achieved                                   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ACCOMPLISHMENTS  7                      View all  →   │  ← TIER 5: Accomplishments
│  Marathon Finisher                                     │
│  315 lb Bench Press                                    │
│  Spartan Race Finisher                                 │
│  [  + Add Accomplishment  ]                             │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Settings                                    [  →  ]   │  ← TIER 6: Settings
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Modal presentation:**
P-1 slides up from the bottom as a bottom sheet modal. It overlays the current tab content. The active tab remains visible beneath the dimmed background. The modal does not replace the tab context.

**Handle bar:**
Standard bottom sheet drag handle, horizontally centered at the top of the modal content area. Dragging down dismisses the modal.

**[×] dismiss button:**
Top right, 44×44dp tap target. Tapping it dismisses the modal and returns the athlete to wherever they were.

**Tapping outside the modal (dimmed area):**
Dismisses the modal.

**Scroll behavior:**
The content within the modal scrolls. The handle bar and [×] button are fixed at the top — they do not scroll with the content.

**What appears above the fold:**
The Identity Header must be fully visible — photo, name, athlete type, rank, forging since, and Edit Profile CTA. On a standard device (375×812), the top of the Chapter Card should be visible, signaling that there is more content below.

---

## Section 4 — Identity Header Architecture

The Identity Header is the athlete's card. It is the most important section on P-1. It answers "Who am I?" before anything else on the screen speaks.

### 4.1 Header Anatomy

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│         [Profile Photo — 88dp circle, centered]        │
│                                                        │
│         [Display Name — 22sp, centered, primary]       │
│         [Athlete Type — 14sp, secondary, centered]     │
│         [Rank Name · Sub-tier — 14sp, secondary]       │
│         Forging since [Month Year] — 13sp, secondary   │
│                                                        │
│         [  Edit Profile  ]                             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

The header is non-tappable as a unit. The profile photo is tappable (→ P-2 Edit Profile, photo section). The "Edit Profile" CTA is tappable (→ P-2 Edit Profile). All other elements are display only.

### 4.2 Profile Photo

- 88dp circle, centered horizontally
- If the athlete has set a profile photo: displayed as their photo
- If no photo set: initials rendered (first initial of display name, or first two initials of first and last name if set) — matching the same pattern used across the app for avatar placeholders
- Tapping the photo → P-2 Edit Profile (photo section)
- No camera icon overlay in the default view — the edit path is via "Edit Profile," not an inline tap-to-edit icon

**Why 88dp:**
Large enough to be human and recognizable — the photo grounds the identity card. Not so large that it becomes a social-profile hero image. At 88dp, the athlete's face or chosen image is clearly legible without dominating the modal.

**Why photo comes first:**
The athlete is a person. A photo says that before any text does. The product's thesis is that the athlete is the protagonist — showing their face at the top of their identity screen reinforces this. The photo makes the screen feel personal, not administrative.

### 4.3 Display Name

- 22sp, centered, primary text weight
- The athlete's chosen name — set during onboarding, editable in P-2
- Full name displayed; no truncation. If the name is unusually long (>2 lines at this size), it wraps — there is no forced single-line truncation for the athlete's own name on their own profile

**Why centered:**
The Identity Header is structured as a vertical stack — photo, name, type, rank — all centered. Centering creates a portrait orientation, a coherent visual unit. This is not a list. It is a card.

### 4.4 Athlete Type

- 14sp, secondary text color, centered
- Self-declared during onboarding: Strength, Bodybuilding, Hybrid, Running, Cycling, Combat, General
- Editable in P-2 Edit Profile
- If not set (should not occur post-onboarding): field is absent. No "Athlete type not set" placeholder.

**Why athlete type appears in the header:**
Athlete type is the athlete's identity declaration. "Strength athlete" and "Runner" are not performance metrics — they are the athlete's answer to "what kind of athlete am I?" This belongs in the identity header alongside name, rank, and photo.

### 4.5 Rank Name and Sub-tier

- Format: "[Rank Name] · [Sub-tier]" — e.g., "Architect · IV" or "Architect IV"
- 14sp, secondary text color, centered
- Rank name and sub-tier displayed together on one line
- This is identity: "I am Architect IV." The rank name is what the athlete has become. The sub-tier communicates depth within that rank.

**Why sub-tier is shown on P-1 (but not in the Limited Athlete Profile on S-2):**
In the Limited Athlete Profile (S-2 Section 5.5), rank sub-tier is hidden because it creates comparison pressure between squad members — seeing that a squadmate is Architect IV and you are Architect II introduces a ranking axis that serves no relational purpose. On the athlete's own Profile, there is no comparison. The athlete is looking at their own identity. "IV" tells the athlete where they stand in their own journey. It is a personal marker, not a competitive one.

**Why no progress bar on P-1:**
A progress bar answers "how far am I from the next tier?" That is a performance optimization question. P-1 answers "who am I?" — and "Architect IV" answers that. The progress bar belongs on P-3 Rank Detail, one tap away, for athletes who want to understand their progression mechanics. Putting it on P-1 would shift the screen toward gamification and optimization anxiety. The athlete who wants the bar goes to P-3 deliberately.

### 4.6 Forging Since

- Format: "Forging since [Month Year]" — e.g., "Forging since March 2024"
- 13sp, secondary text color, centered
- System-set at account creation. Not editable.
- Always visible — even for athletes who just created their account today

**Why it's not editable:**
"Forging Since" is the start of the journey. It is the foundation. An athlete who has been training with Forge Legacy since March 2024 has a foundation that started in March 2024 — that fact is immutable. Making it editable would undermine the product's core principle: history cannot be rewritten.

**Why it appears in the Identity Header:**
The start of the journey is part of who the athlete is. An athlete who has been forging their legacy for three years is a different athlete than one who started last month — not in terms of performance, but in terms of how deep the story goes. "Forging since March 2024" tells that story at a glance.

### 4.7 Edit Profile CTA

```
[  Edit Profile  ]
```

- Secondary class CTA button
- 44dp minimum height, centered, appropriate width
- Positioned below the identity stack, before the first divider
- Navigates to P-2 Edit Profile
- Always visible — the athlete can always edit their profile

**Why it's Secondary, not Primary:**
The Profile is primarily a view screen — most athletes open it to see their identity and story, not to edit it. Making Edit Profile Primary would send the wrong signal: that the purpose of this screen is modification, not reflection. Secondary class acknowledges that editing is always available without suggesting it is the primary action.

---

## Section 5 — Rank Presentation

### 5.1 What Appears

```
─────────────────────────────────────────────────────────
RANK
[Rank Name] · [Sub-tier]                        [  →  ]
─────────────────────────────────────────────────────────
```

- Section label: "RANK" — 11sp, all caps, secondary, muted
- Rank name and sub-tier on a single line: e.g., "Architect · IV" — 16sp, primary text
- [→] affordance — the entire row is tappable → P-3 Rank Detail
- Row minimum height: 56dp

### 5.2 What Does Not Appear on P-1

- No progress bar
- No percentage to next tier ("67% to Architect V")
- No Legacy Score value
- No "X points needed" copy
- No rank history
- No rank tier explanations

All of these live on P-3 Rank Detail. P-1 shows the identity signal. P-3 shows the progression mechanics, history, and optional methodology explainer.

### 5.3 Navigating to P-3

Tapping the Rank row → P-3 Rank Detail.

P-3 is where the full rank picture lives: current rank and sub-tier, progress bar to the next sub-tier, rank history, and optional explainer for athletes who want to understand how rank is calculated. P-1 is the surface. P-3 is the depth.

### 5.4 Why Rank Appears as a Section (Not Just in the Header)

The Identity Header shows rank inline with name, athlete type, and forging since — because rank is an identity attribute. The Rank section below provides navigational access to P-3. These are two different roles:
- **Header:** rank as identity declaration
- **Section:** rank as navigational entry point

Both are necessary. The header says "this is who I am." The section says "you can explore this further."

### 5.5 Why the Progress Bar Lives on P-3, Not P-1

"The app rewards transformation, not activity." A progress bar creates a metric to fill, which creates checking behavior, which creates optimization anxiety. The athlete who opens their Profile should feel the weight of who they have become — "I am Architect IV" — not the restlessness of how far they are from the next number.

The progress bar is available on P-3 for athletes who want it. It is never removed from the product — it is placed at the appropriate depth. Athletes who are motivated by progression mechanics have full access. Athletes who are motivated by identity have the identity view on P-1.

---

## Section 6 — Athlete Type Presentation

### 6.1 Where Athlete Type Appears

Athlete type appears in the Identity Header (Section 4.4) below the display name. It does not have its own section on P-1 — it is an attribute of the header identity block, not a standalone section.

### 6.2 Available Types

Set during onboarding (P-A, experienced path) or onboarding defaults. Editable in P-2 Edit Profile.

| Type | Meaning |
|------|---------|
| Strength | Resistance training focus — barbells, compound lifts, strength progression |
| Bodybuilding | Hypertrophy and physique focus |
| Hybrid | Multi-discipline — strength + cardio or strength + sport |
| Running | Endurance running, track, trail, road |
| Cycling | Road, mountain, stationary |
| Combat | Martial arts, boxing, wrestling, MMA |
| General | General fitness, cross-training, no primary discipline |

### 6.3 What Athlete Type Is and Is Not

**What it is:** A self-declaration. The athlete chooses the label that best describes their training identity. It is categorical, not hierarchical — "Running" is not better or worse than "Strength."

**What it is not:** A filter for content. Athlete type does not restrict which programs appear, which honors are available, or what goals can be set. It is an identity label, not a system constraint.

### 6.4 Editing Athlete Type

Via P-2 Edit Profile. The athlete can change their type at any time. Changing it does not affect any past records, completed chapters, or earned honors.

---

## Section 7 — Honors Section

### 7.1 What Appears

```
─────────────────────────────────────────────────────────
HONORS  12                                  View all  →
First Chapter Completed
50 Workouts Logged
First Goal Achieved
─────────────────────────────────────────────────────────
```

- Section label: "HONORS" followed by total count — 11sp, all caps, secondary, muted
- Total count: same line as the label, e.g., "HONORS  12"
- "View all →" — right-aligned, 13sp, navigates to L-10 Honors List
- Three most recently earned honors, each on its own row — honor name only, 15sp, primary text
- Row minimum height: 44dp

### 7.2 Which Three Honors Are Shown

The three most recently earned honors, in reverse chronological order (most recent first). This represents what the athlete has most recently accomplished in the system's recognition — it tells the current story, not the earliest history.

**Why most recent, not "most important":**
Importance is subjective and would require a system-defined ranking of honors that competes with the athlete's own sense of what matters. Most recent is objective and reflects the present state of the journey. The athlete who wants to see their full honors record — including early honors — navigates to L-10.

### 7.3 Honor Display Format

Honor name only. No icon. No date. No description.

**Why no icon:** Icons on a list of honors create a trophy shelf aesthetic — honors become visual collectibles rather than story markers. A text list is quieter and more dignified.

**Why no date:** Dates on individual honors make the section feel like a history log. P-1 is an identity screen, not a timeline. Dates belong on L-10 (Honors List) and L-11 (Honor Detail).

### 7.4 If the Athlete Has Fewer Than Three Honors

Show what exists. If 1 honor: show 1 row. If 2: show 2 rows. No padding to 3. No "and 1 more honor coming soon" placeholder.

### 7.5 Empty State — No Honors

```
HONORS
Honors are earned as you build your legacy.
```

- The count is absent (no "HONORS  0" — the absence of a count is cleaner when there are none)
- "View all →" is absent (there is nothing to view)
- The section remains visible — it is not collapsed. Its presence communicates that honors exist in the system and will be earned.

**What this copy says:**
It orients the athlete toward the future without making the current state feel like a failure. "Earned as you build" is forward-looking. There is no shame in not having honors yet. The athlete just started forging.

### 7.6 Navigating to Full Honors

"View all →" → L-10 Honors List. Opens within the Profile modal's navigation context (see Section 13.7 for navigation stack behavior).

---

## Section 8 — Accomplishments Section

### 8.1 What Appears

```
─────────────────────────────────────────────────────────
ACCOMPLISHMENTS  7                          View all  →
Marathon Finisher
315 lb Bench Press
Spartan Race Finisher
[  + Add Accomplishment  ]
─────────────────────────────────────────────────────────
```

- Section label: "ACCOMPLISHMENTS" followed by total count
- "View all →" — right-aligned, navigates to L-12 Accomplishments List
- Top 3 accomplishments (names only), 15sp, primary text
- "+ Add Accomplishment" Secondary CTA below the list

### 8.2 Which Three Accomplishments Are Shown

The athlete's top 3 accomplishments as defined in their profile. The athlete controls this ordering via their accomplishments settings (L-12 / L-14). By default, the 3 most recently added accomplishments are shown.

**Why the athlete controls the top 3:**
Accomplishments are user-declared — they are things the athlete is proud of. The athlete should control which three represent them on their Profile. Automatic ordering by date would surface the most recent additions, which may not be the most meaningful. The athlete who wants to feature their marathon finish ahead of something they added recently should be able to do that.

This ordering preference is managed in the Accomplishments system (L-12, L-14) — not on P-1 itself.

### 8.3 Accomplishment Display Format

Name only. No date. No description. No photo thumbnail.

**Why no date:** The date is available in L-13 Accomplishment Detail. On P-1, accomplishments are identity markers — "Marathon Finisher" tells a story. The date tells a timeline. P-1 is for story.

**Why no photo thumbnail:** Even if an accomplishment has an associated photo, showing thumbnails in the P-1 list creates visual noise and inconsistency (some have photos, some don't). The photo is a detail-screen feature (L-13).

### 8.4 Add Accomplishment CTA

```
[  + Add Accomplishment  ]
```

- Secondary class CTA
- 44dp minimum height
- Positioned below the accomplishment list
- Navigates to L-14 Add Accomplishment

**Why it's on P-1:**
P-1 is where the athlete sees their accomplishments — and the natural moment to add one is when reviewing what you've already declared. "I just finished a race — I should add that here" is a thought that happens while looking at the existing list. The CTA makes that action available without requiring navigation elsewhere.

**Why it stays even when the athlete has 3+ accomplishments:**
There is no cap on accomplishments. The "+ Add Accomplishment" CTA is always visible below the top 3 display. The athlete who has 20 accomplishments and just earned a new belt rank can add it from here.

### 8.5 Empty State — No Accomplishments

```
ACCOMPLISHMENTS
Add your first accomplishment — something you're proud of.
[  + Add Accomplishment  ]
```

- Count absent
- "View all →" absent
- "+ Add Accomplishment" present — the empty state is an invitation with a clear action
- Copy is warm and direct: "something you're proud of" orients the athlete toward meaningful entry, not exhaustive logging

### 8.6 Navigating to Full Accomplishments

"View all →" → L-12 Accomplishments List. Opens within the Profile modal's navigation context.

---

## Section 9 — Settings Entry Point

### 9.1 What Appears

```
─────────────────────────────────────────────────────────
Settings                                        [  →  ]
─────────────────────────────────────────────────────────
```

- Single row: "Settings" — 15sp, primary text
- [→] affordance — full row tappable → P-4 Settings Root
- Row minimum height: 56dp
- This is the last visible item before the bottom safe area

### 9.2 What Does Not Appear

- No Subscription row on P-1
- Subscription is accessible via P-4 Settings Root → P-8 Subscription

**Why Subscription is not a standalone row on P-1:**
P-1 is an identity screen. A Subscription row at the bottom of the identity screen sends a commercial signal — the athlete's profile ends with a reminder of their payment tier. This undermines the "70% Luxury Legacy / 30% Performance Tool" brand positioning. The athlete who wants to manage their subscription navigates to Settings. The athlete who is about to hit the photo limit is shown the M-7 Premium Upsell Sheet contextually — at the moment it matters. Neither path requires a Subscription row on the identity screen.

### 9.3 Settings Hierarchy Reminder

| Screen | Access Path from P-1 |
|--------|---------------------|
| P-2 Edit Profile | "Edit Profile" CTA in Identity Header |
| P-3 Rank Detail | Rank section tap |
| P-4 Settings Root | Settings row at bottom of P-1 |
| P-5 Notifications | P-4 Settings Root → Notifications |
| P-6 Privacy | P-4 Settings Root → Privacy |
| P-7 Connected Apps | P-4 Settings Root → Connected Apps |
| P-8 Subscription | P-4 Settings Root → Subscription |
| P-9 Delete Account / Export | P-4 Settings Root → Account |

---

## Section 10 — Editable vs Earned Information

### 10.1 Editable Fields

Information the athlete controls. They set it, they can change it.

| Field | Edit Path | Notes |
|-------|-----------|-------|
| Profile photo | P-2 Edit Profile | Also tappable via photo on P-1 |
| Display name | P-2 Edit Profile | Set during onboarding |
| Athlete type | P-2 Edit Profile | Set during onboarding; changeable at any time |
| Top 3 accomplishments (ordering) | L-12 Accomplishments List | Which 3 of all accomplishments appear on P-1 |
| Accomplishments (add) | L-14 Add Accomplishment | Via "+ Add Accomplishment" on P-1 |

### 10.2 Earned Fields

Information the system sets based on what the athlete has done. Not editable by the athlete.

| Field | How It Is Set | Notes |
|-------|--------------|-------|
| Rank name | System — Legacy Score calculation | Advances via chapter/goal/honor milestones |
| Rank sub-tier | System — Legacy Score calculation | Advances within each rank tier |
| Honors | System — automatic award triggers | Cannot be created or removed by athlete |

### 10.3 System-Set Fields

Information the system records and the athlete cannot change — because it would constitute rewriting history.

| Field | How It Is Set | Notes |
|-------|--------------|-------|
| Forging Since date | Account creation timestamp | Immutable. History cannot be rewritten. |

### 10.4 Active-State Fields (Managed Elsewhere)

Information that reflects active states. The athlete can change these, but not from P-1.

| Field | Where It Is Managed |
|-------|---------------------|
| Current chapter name | L-3 Chapter Detail (Active) |
| Primary goal name | L-7 Goal Detail / L-8 Goal Create-Edit |

### 10.5 The Distinction Between Earned and Editable

This distinction reflects a core product principle:

**Earned information** (rank, honors) tells the story of what the athlete has done. It is awarded by the system and cannot be edited because the record of what was built must be trusted. An athlete who earned "First Chapter Completed" earned it — the honor cannot be modified.

**Editable information** (name, photo, athlete type) tells the story of who the athlete is. These are identity declarations. Identities can change. The athlete who switches from "Running" to "Strength" after a career pivot should be able to update their type.

**The Forging Since date** is a special case: it is system-set and immutable because it is the foundation of the story. The date the journey began is a fact. It cannot be revised.

---

## Section 11 — Empty States

### 11.1 New Athlete (All Sections Empty)

A brand-new athlete who has just completed onboarding sees:

- **Identity Header:** Profile photo (initials if no photo), Display name (from onboarding), Athlete type (from onboarding), Rank "Apprentice · I" (or lowest rank, sub-tier I), "Forging since [current Month Year]"
- **Chapter Card:** "No active chapter" empty state (see 11.2)
- **Rank:** Shows "Apprentice · I" — rank always has a value. No athlete starts with no rank.
- **Honors:** Empty state invitation copy (see 11.3)
- **Accomplishments:** Empty state invitation copy (see 11.4)
- **Settings:** Always present

**The screen is never empty.** The Identity Header always has content. The athlete always has an identity — a name, a type, a rank (however early), and a start date. The empty states in the sections below the header are forward-looking invitations, not failure indicators.

### 11.2 Chapter Card — No Active Chapter

```
┌────────────────────────────────────────────────────────┐
│  No active chapter.                                    │
│  [  Start a chapter →  ]                               │
└────────────────────────────────────────────────────────┘
```

- "No active chapter." — 16sp, secondary text, within the card container
- "Start a chapter →" — Secondary CTA within the card. Not a Primary CTA — chapters are never a gate. The athlete who is not ready to start a chapter can dismiss and continue.
- The card container remains visible — its presence communicates that chapters exist and belong here

**What this copy says:**
Factual. Not "You haven't started a chapter." Not "Your profile is incomplete." Factual and forward-pointing: there is no active chapter right now. This is the path to start one.

### 11.3 Honors — No Honors Earned

```
HONORS
Honors are earned as you build your legacy.
```

- Section visible but count absent
- "View all →" absent
- No action CTA — honors cannot be created by the athlete
- Copy is forward-looking: "as you build" positions earning honors as something that happens naturally through the journey

### 11.4 Accomplishments — No Accomplishments

```
ACCOMPLISHMENTS
Add your first accomplishment — something you're proud of.
[  + Add Accomplishment  ]
```

- Section visible, count absent
- "+ Add Accomplishment" CTA present — this is the call to action
- Copy is warm and specific: "something you're proud of" invites meaningful entry

---

## Section 12 — Edge Cases

### 12.1 No Profile Photo Set

Initials are rendered in the 88dp circle. Single initial (first letter of display name) or two initials (first letter of first name + first letter of last name) depending on whether the athlete entered a full name. The circle background uses the same muted secondary color used throughout the app for avatar placeholders. The absence of a photo is a valid state — it is not an error, and there is no "Add a photo" prompt overlaid on the placeholder in the header.

### 12.2 Very Long Display Name

Display name wraps to 2 lines maximum at 22sp within the header width. If the name exceeds 2 lines (an extreme edge case), it truncates with an ellipsis. The athlete's own name on their own profile is treated generously — 2 lines before truncation allows for long names that would be truncated elsewhere.

### 12.3 Brand-New Athlete (Rank I, Sub-tier I)

The rank line shows the earliest rank and sub-tier. This is valid and correct. The athlete is at the beginning of their journey. The rank name (whatever Forge Legacy's lowest rank is named) is their current identity. There is no "rank not yet assigned" state — every athlete starts at Rank I, Sub-tier I immediately on account creation.

### 12.4 Very Advanced Athlete (High Rank, Many Honors)

No layout changes. The rank section shows the rank name and sub-tier regardless of how high the rank is. The honors section shows the 3 most recent of however many the athlete has. Honor counts in the hundreds are displayed as numbers ("HONORS  347"). The layout handles large numbers gracefully — no truncation of counts.

### 12.5 Athlete Has Exactly 3 Accomplishments

All 3 are shown. "View all →" still appears (tapping it goes to L-12, which shows the same 3). This is correct — the athlete may want to see the full detail of each accomplishment at L-12. "+ Add Accomplishment" still appears.

### 12.6 Athlete Has 0 or 1 or 2 Honors

Sections do not pad to 3 rows. If the athlete has 1 honor, 1 honor row is shown. The section does not reserve space for 3 rows and leave 2 blank.

### 12.7 Athlete Has No Active Chapter But Has Completed Previous Chapters

The chapter card shows the empty state ("No active chapter. / Start a chapter →"). Previous chapters are not surfaced on P-1 — they belong to the Legacy tab. P-1 shows the current chapter because it answers "what am I building right now?" Completed chapters answer a different question.

### 12.8 Profile Opened from Any Tab

The modal presentation is identical regardless of which tab is active when the athlete taps the avatar. Home, Workouts, Legacy, or Squads — the modal looks the same. The dismissal always returns to whatever tab was active.

### 12.9 Athlete Type Not Set

If an athlete somehow has no athlete type set (should not occur post-onboarding), the athlete type line is absent from the Identity Header. No placeholder. No "Athlete type not set" copy. The header is clean without it.

### 12.10 Very Long Chapter Name or Goal Name

Chapter name in the chapter card wraps to 2 lines maximum at 18–20sp. If it exceeds 2 lines, it truncates with an ellipsis. The primary goal follows the same rule: wraps to 2 lines at 14sp, truncates if longer. The card height adjusts to accommodate wrapped text within these limits.

---

## Section 13 — Mobile UX Considerations

### 13.1 Modal Presentation

P-1 is a modal sheet — not a tab root screen, not a navigation stack screen. It slides up from the bottom. The existing tab content is visible beneath the dimmed overlay.

**In Expo Router terms:** P-1 is a modal route that presents over the existing tab navigator. It has its own navigation stack for navigating to P-2, P-3, P-4, and other Profile-internal screens.

**No Top App Bar.** There is no back arrow. The dismiss mechanism is the handle bar (drag down), the [×] button, or tapping outside the modal.

### 13.2 Navigation Stack Within the Modal

The Profile modal has its own navigation stack. Navigation within the Profile system pushes screens onto this stack:

| Destination | Behavior |
|-------------|---------|
| P-2 Edit Profile | Pushes onto modal navigation stack |
| P-3 Rank Detail | Pushes onto modal navigation stack |
| P-4 Settings Root | Pushes onto modal navigation stack |
| P-5 through P-9 (via P-4) | Continue on modal navigation stack |

When navigating within the Profile system, the handle bar and dimmed overlay remain — the modal context is preserved.

**Navigation to Legacy content (L-3, L-10, L-12, L-14) and Legacy creation (L-5):**
These destinations are outside the Profile system. When the athlete navigates to these from P-1:
- The modal dismisses
- The Legacy tab becomes active
- The destination screen opens in the Legacy tab navigation stack

This keeps the navigation model clean: Profile → Profile screens = within modal. Profile → non-Profile screens = closes modal, opens destination tab.

### 13.3 Scroll Behavior

Content scrolls vertically within the modal. The handle bar and [×] button are fixed at the top — they do not scroll with content.

Overscroll behavior: standard for the platform (iOS: rubber band / bounce; Android: edge glow or overscroll indicator). The modal dismisses on significant downward drag — consistent with all bottom sheet modals in the app.

### 13.4 Tap Targets

| Element | Minimum Size |
|---------|-------------|
| [×] dismiss button | 44×44dp |
| Profile photo (tappable) | 88dp (inherits photo size) |
| "Edit Profile" Secondary CTA | Full width × 44dp |
| Chapter card (tappable) | Full width × card height (min 72dp) |
| Rank row (tappable) | Full width × 56dp |
| "View all →" Honors | 44dp height, right-aligned tap region ≥ 44dp |
| Honor name rows | Full width × 44dp |
| "View all →" Accomplishments | 44dp height, right-aligned tap region ≥ 44dp |
| Accomplishment name rows | Full width × 44dp |
| "+ Add Accomplishment" CTA | Full width × 44dp |
| Settings row | Full width × 56dp |

### 13.5 Chapter Card Sizing

The Chapter Card has:
- Horizontal margin: 16dp from content edge on each side
- Inner padding: 16dp on all sides
- Corner radius: consistent with the card hierarchy established in the UX Framework
- Minimum height: 72dp (single-line chapter name, single-line goal)
- Variable height: increases when chapter name or goal wraps to 2 lines

The card's elevated visual treatment (background fill or border distinct from the section separator) communicates that this is a navigable unit, not a display field.

### 13.6 Above the Fold

On standard device size (375×812), the following must be fully visible without scrolling:
- Full Identity Header: profile photo, name, athlete type, rank, forging since, Edit Profile CTA
- Top of the Chapter Card — partially visible, signaling scrollability

The athlete who opens the Profile sees their complete identity immediately. The chapter and everything below is discoverable by scrolling.

### 13.7 Portrait Orientation

P-1 supports portrait orientation only. Consistent with all other Forge Legacy modal and full screens.

### 13.8 Safe Areas

- Top safe area: the System Status Bar sits above the modal. The handle bar appears at the top of the modal content area, below the safe area.
- Bottom safe area: the bottom content area of the modal respects the device bottom safe area. The Settings row is the last item; adequate padding between it and the bottom edge.

### 13.9 Accessibility

- Profile photo: `accessibilityLabel` = "[Display Name]'s profile photo" (or "Profile photo, initials [initials]" if no photo)
- [×] dismiss button: `accessibilityLabel` = "Close profile"
- "Edit Profile" CTA: `accessibilityLabel` = "Edit profile"
- Chapter card: `accessibilityLabel` = "Chapter: [Chapter Name]. Goal: [Primary Goal]. Double-tap to open chapter."
- Chapter card empty state: `accessibilityLabel` = "No active chapter. Double-tap to start a chapter."
- Rank row: `accessibilityLabel` = "Rank: [Rank Name], Sub-tier [N]. Double-tap to view rank detail."
- "View all" Honors: `accessibilityLabel` = "View all [N] honors"
- "View all" Accomplishments: `accessibilityLabel` = "View all [N] accomplishments"
- "+ Add Accomplishment": `accessibilityLabel` = "Add an accomplishment"
- Settings row: `accessibilityLabel` = "Settings"
- Screen reader summary: "Profile: [Display Name], [Athlete Type], [Rank Name] [Sub-tier]. Forging since [Month Year]."

---

## Section 14 — Validation Checklist

### Modal Presentation
- [ ] P-1 opens as a modal sheet — slides up from bottom, overlays current tab
- [ ] Handle bar present at top of modal content, centered
- [ ] [×] dismiss button present, top right, 44×44dp tap target
- [ ] Dimmed overlay behind modal — tapping outside dismisses modal
- [ ] Drag down on handle bar dismisses modal
- [ ] Dismissing returns to the tab and scroll position the athlete was at before opening

### Identity Header
- [ ] Profile photo displayed at 88dp circle, centered
- [ ] Initials rendered when no photo set — no camera icon overlay
- [ ] Tapping profile photo → P-2 Edit Profile (photo section)
- [ ] Display name at 22sp, centered, primary weight
- [ ] Athlete type at 14sp, secondary color, centered
- [ ] Rank name and sub-tier at 14sp, secondary color, centered (e.g., "Architect · IV")
- [ ] "Forging since [Month Year]" at 13sp, secondary color, centered
- [ ] "Edit Profile" Secondary CTA present, 44dp minimum height
- [ ] Tapping "Edit Profile" → P-2 Edit Profile

### Identity Header Content Rules
- [ ] NO progress bar in Identity Header
- [ ] NO percentage to next rank tier
- [ ] NO workout count or volume
- [ ] NO streak data
- [ ] NO comparison to other athletes
- [ ] Rank sub-tier shown (this is the athlete's own profile — sub-tier is identity, not comparison)
- [ ] "Forging Since" date is not editable

### Current Chapter Card
- [ ] Chapter card uses elevated visual treatment (card container, distinct from section rows)
- [ ] Chapter name at 18–20sp, primary weight
- [ ] Primary goal at 14sp, secondary
- [ ] Entire card tappable → L-3 Chapter Detail (Active)
- [ ] Card minimum height: 72dp
- [ ] Card horizontal margin: 16dp
- [ ] Chapter card empty state: "No active chapter." + "Start a chapter →" Secondary CTA
- [ ] Empty state CTA navigates → L-5 Create Chapter (modal closes, Legacy tab opens)
- [ ] Empty state is NOT a gate — athlete can dismiss and use the app without a chapter

### Rank Section
- [ ] Section label "RANK" present (11sp, all caps, secondary)
- [ ] Rank name and sub-tier on one line
- [ ] Full row tappable → P-3 Rank Detail
- [ ] Row minimum height: 56dp
- [ ] NO progress bar on P-1
- [ ] NO percentage to next tier on P-1
- [ ] NO Legacy Score value shown
- [ ] NO rank history on P-1
- [ ] P-3 Rank Detail (one tap away) contains progress bar, history, and optional explainer

### Honors Section
- [ ] Section label "HONORS" + total count on same line
- [ ] "View all →" right-aligned → L-10 Honors List
- [ ] 3 most recently earned honors shown (honor name only)
- [ ] If fewer than 3 honors: show what exists — no padding to 3
- [ ] If 0 honors: empty state copy — no count, no "View all →", no action CTA
- [ ] Honor rows: minimum 44dp height, full width
- [ ] NO honor icons on P-1
- [ ] NO honor dates on P-1
- [ ] NO description text on P-1

### Accomplishments Section
- [ ] Section label "ACCOMPLISHMENTS" + total count on same line
- [ ] "View all →" right-aligned → L-12 Accomplishments List
- [ ] Top 3 accomplishments shown (name only — no date, no photo)
- [ ] If fewer than 3: show what exists — no padding to 3
- [ ] "+ Add Accomplishment" Secondary CTA present below list — always visible
- [ ] Tapping "+ Add Accomplishment" → L-14 Add Accomplishment (modal closes, Legacy tab opens)
- [ ] If 0 accomplishments: empty state copy + "+ Add Accomplishment" CTA
- [ ] NO accomplishment dates on P-1
- [ ] NO accomplishment photo thumbnails on P-1

### Settings Entry Point
- [ ] Single "Settings" row present at bottom of P-1
- [ ] Row minimum height: 56dp, full width tappable → P-4 Settings Root
- [ ] NO Subscription row directly on P-1
- [ ] Subscription accessible via Settings (P-4 → P-8)

### Editable vs Earned
- [ ] Profile photo is editable (P-2)
- [ ] Display name is editable (P-2)
- [ ] Athlete type is editable (P-2)
- [ ] Accomplishments are user-controlled (L-14)
- [ ] Rank is NOT editable — system-set
- [ ] Honors are NOT editable — system-awarded
- [ ] Forging Since date is NOT editable — immutable account creation date

### Empty States
- [ ] New athlete: Identity Header always has content (name, type, rank I/I, forging since today)
- [ ] No chapter: chapter card shows empty state — card container visible, not collapsed
- [ ] No honors: invitation copy — not "No honors" or "0 honors"
- [ ] No accomplishments: invitation copy + add CTA

### Navigation
- [ ] "Edit Profile" → P-2 Edit Profile (within modal stack)
- [ ] Profile photo tap → P-2 Edit Profile (within modal stack)
- [ ] Rank row → P-3 Rank Detail (within modal stack)
- [ ] Chapter card → L-3 Chapter Detail (modal closes, Legacy tab)
- [ ] "Start a chapter →" → L-5 Create Chapter (modal closes, Legacy tab)
- [ ] "View all →" Honors → L-10 Honors List (modal closes, Legacy tab)
- [ ] "View all →" Accomplishments → L-12 Accomplishments List (modal closes, Legacy tab)
- [ ] "+ Add Accomplishment" → L-14 Add Accomplishment (modal closes, Legacy tab)
- [ ] Settings → P-4 Settings Root (within modal stack)
- [ ] Dismiss (drag, [×], tap outside) → returns to previous tab and scroll position

### What Does NOT Appear on P-1
- [ ] No total workout count
- [ ] No weekly or monthly workout statistics
- [ ] No training volume (sets × reps × weight)
- [ ] No streak or consistency data
- [ ] No "last trained [date]" indicator
- [ ] No personal records or performance metrics
- [ ] No chapter count total
- [ ] No comparison element of any kind
- [ ] No social features (followers, following, likes, reactions)
- [ ] No subscription row
- [ ] No rank progress bar or percentage

### Identity Principles
- [ ] Athlete leaves the screen feeling "I am building something meaningful" — not "I need better numbers"
- [ ] Profile answers "Who am I becoming?" — not "How am I performing?"
- [ ] Rank is shown as identity ("Architect IV") — not as a metric to optimize
- [ ] Honors are a record — not a trophy room or leaderboard
- [ ] Accomplishments are declarations — not performance data
- [ ] Chapter is the active story — given visual weight matching its narrative importance

### Mobile UX
- [ ] Portrait orientation only
- [ ] Identity Header fully visible above fold on 375×812
- [ ] All tap targets ≥ 44dp
- [ ] Chapter card minimum 72dp height
- [ ] Safe areas respected (top and bottom)
- [ ] Screen reader accessibility labels on all interactive elements

---

## Section 15 — Privacy Architecture Review: Flagged Elements

The following elements of P-1 may require future privacy architecture review. This section preserves these questions for future design phases. **No architecture is designed here. No current P-1 behavior is affected.**

### 15.1 Public Profile (Future Roadmap)

If the athlete ever opts into a public profile (PRD Section 20 Future Roadmap), decisions will be required for each P-1 field:
- Which fields are visible to non-squad users?
- Can the athlete control per-field visibility (e.g., show rank but hide accomplishments)?
- What is the public default? (Presumed: private, opt-in required)

### 15.2 Journey Sharing (Future Roadmap)

If the athlete can generate a shareable Legacy link (PRD Section 20 Future Roadmap), decisions will be required about P-1 content:
- Does a shared legacy link include profile identity fields?
- Is rank visible in a shared view?
- Are accomplishments visible in a shared view?
- Can the athlete curate what appears in a shared context?

### 15.3 Accomplishment Visibility

Accomplishments currently appear in the Limited Athlete Profile modal (S-2 Section 5.5) — visible to squad members. No per-accomplishment privacy control currently exists.

Future question: should athletes be able to mark specific accomplishments as private (visible to themselves only, not in squad context)? This may become relevant as accomplishments move into sensitive life territory (health events, personal milestones).

### 15.4 Athlete Type Visibility

Athlete type currently appears in the Limited Athlete Profile (S-2 Section 5.5) — visible to squad members. No privacy control exists for this field.

Future question: should athletes be able to hide their athlete type from squad members? This is low-priority but worth noting before the privacy settings architecture is designed.

### 15.5 Rank Visibility

Rank name appears in the Limited Athlete Profile (S-2 Section 5.5). Rank sub-tier is hidden there (prevents comparison between squad members). No privacy control exists over whether rank name is shared.

Future question: should athletes be able to hide their rank name from squad members? May be relevant for athletes who are uncomfortable with the visible disparity between a Rank I athlete and a Rank VI athlete in the same squad.

### 15.6 Forging Since Visibility

"Forging Since" currently appears in the Limited Athlete Profile (S-2 Section 5.5) — visible to squad members. No privacy control exists.

Future question: should athletes be able to hide their account creation date? Some athletes may be sensitive about how recently they joined versus long-tenured squadmates.

---

*Forge Legacy Profile Wireframe Specification — P-1*
*v1.0 — June 2026*
*All decisions derived from the Phase 2A locked architecture, the Forge Legacy Master PRD (Sections 13–17), the Forge Legacy UX Framework v1.0, and all approved Phase 2B wireframe specifications.*
*Three pre-lock review decisions applied: Chapter Card (elevated visual treatment), Rank (identity only, no progress bar on P-1), Settings (single row, subscription removed from P-1).*
*This document is the authority for all Profile screen implementation in Phase 2B.*

---

## Change Log

### v1.0 — June 2026

Initial specification. P-1 Profile Wireframe Spec created following Phase 2B architecture review.

**Three pre-lock decisions resolved before v1.0 finalization:**

| Decision | Resolution | Rationale |
|----------|-----------|-----------|
| Current Chapter visual emphasis | Elevated card treatment — not a flat section row | Chapter is the primary storytelling unit; card treatment matches its narrative weight. L-1 treats the chapter as Tier 1 featured card; P-1 follows the same principle at Tier 2. |
| Rank progress bar | Removed from P-1. Progress bar lives on P-3 Rank Detail exclusively. | Progress bar answers "how far am I from next tier?" P-1 answers "who am I becoming?" These are different questions. "Architect IV" is the identity answer. The bar is the optimization answer. |
| Subscription row | Removed from P-1. Subscription accessible via Settings (P-4 → P-8). | Commercial signal on the identity screen conflicts with 70% Legacy / 30% Tool brand positioning. Profile purity takes precedence. Contextual upsell (M-7) fires at the natural conversion moment. |
