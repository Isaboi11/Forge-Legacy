# Forge Legacy — Workout With Friend Architecture & UX Specification
## WwF System | Phase 2B | Version 1.1 — June 2026

---

## Preamble: What Workout With Friend Is Not

Workout With Friend is not a social network feature.

There are no feeds. No follower counts. No visibility of who trains with whom. No public presence records. No engagement loops built around tagging others. No rankings for most social athletes.

WwF is an attribution system. It answers a single question: "Was someone else present for this training effort?" And it answers that question with radical humility. Being present for a workout is not the same as completing a workout. The reference entry — the only artifact WwF creates in a partner's history — records presence. It records nothing about performance.

This distinction drives every decision in the WwF system. The tagger's workout belongs to the tagger. The tagged athlete is offered an acknowledgment of presence, not a copy of someone else's record. The claim is optional. The absence of a claim is never flagged as a gap.

"The workout tracker is the engine. The Legacy is the product." WwF is a footnote in the engine room. It creates no legacy — it acknowledges that two people built their legacies alongside each other.

---

## Section 1 — WwF Goals

WwF exists to accomplish three things:

1. **Honor shared training** — give athletes a way to acknowledge that they were not alone in their effort. Training with others is meaningful. The product respects that meaning without amplifying it into a social mechanic.

2. **Build honest history** — allow reference entries in an athlete's history that say "I was present for this" without fabricating a performance record. An athlete who trains alongside a friend accumulates a different kind of history than an athlete who trains solo. WwF makes that difference visible, accurately.

3. **Require explicit consent** — no association appears in any athlete's history without their explicit action. Squad members get to claim or dismiss. Non-squad athletes get to approve or decline before claiming. The tagged athlete is always in control of their own record.

**What WwF does NOT accomplish:**
- Building social graphs or follower relationships
- Sharing performance data between athletes
- Creating accountability or pressure to train together consistently
- Surfacing partner training frequency or patterns
- Enabling any form of partner comparison

---

## Section 2 — Core Principles

**Principle 1: Presence is not performance.**
The reference entry created by claiming a partner tag contains: activity type, date, "Trained with [Name]." No sets. No reps. No weights. No distance. No duration from the tagger's session. Being present for someone else's squat session does not mean you squatted.

**Principle 2: Consent is explicit at every step.**
Squad members do not automatically receive a history entry when tagged — they receive an offer to claim one. Non-squad athletes must approve before even receiving the claim/dismiss option. No history entry exists without deliberate athlete action.

**Principle 3: Absence is correct.**
An athlete who never uses WwF has not failed to do anything. An athlete who dismisses every incoming tag has made valid choices about their history. An athlete who declines a non-squad approval request has exercised their right to their own record. The system never signals that non-participation is a gap.

**Principle 4: Decline is silent.**
When an athlete declines a non-squad tag request, the requester receives no notification of the decline. Decline is private. The requester tagged someone; that person chose not to include it in their record. The system does not deliver that information back to the tagger.

**Principle 5: The record belongs to the person who holds it.**
The tagger's workout is the tagger's workout. The tagged athlete's reference entry (if claimed) is the tagged athlete's record. These records are independent. If the tagger deletes their workout, the claimed reference entry persists in the tagged athlete's history. If the tagged athlete deletes their reference entry, the tagger's workout remains. Records are owned by their holders.

**Principle 6: WwF is optional throughout.**
No athlete is prompted more than once per workout to tag a partner. No "You haven't tagged anyone recently" nudges. No WwF section on W-1 when there is nothing pending. The system creates the opportunity; the athlete uses it or doesn't.

---

## Section 3 — Complete Lifecycle Overview

Two paths initiate a WwF association. Both paths converge at the same claim/dismiss decision for the tagged athlete.

```
PATH 1 — PRE-WORKOUT (TRAIN TOGETHER)
──────────────────────────────────────────────────────────────────

Athlete A opens Squads tab (S-2)
        ↓
Initiates Train Together → S-10 partner selection
        ↓
A selects B (any athlete — squad member or non-squad)
        ↓
A begins workout → B indicator shown on workout screen (read-only, no live data)
        ↓
A completes workout → W-17 loads

  IF B IS A SQUAD MEMBER:
  B shown as pre-confirmed in W-17 Tier 4 section
  IF B IS NOT A SQUAD MEMBER:
  B shown as pending tag ("Requires approval") in W-17 Tier 4 section
        ↓
A taps "Done"
        ↓

  ┌────── IF B IS A SQUAD MEMBER ──────┐
  │  M-8 fires to B                    │
  │  B sees Unclaimed Workout card in  │
  │  W-1 WwF section                   │
  │           ↓                        │
  │  B claims → Reference entry in W-18│
  │  OR                                │
  │  B dismisses → No entry created    │
  └────────────────────────────────────┘

  ┌────── IF B IS NOT A SQUAD MEMBER ──┐
  │  M-9 fires to B                    │
  │  B sees Pending Approval card in   │
  │  W-1 WwF section                   │
  │           ↓                        │
  │  B approves → M-8 equivalent fires │
  │  B now sees Unclaimed Workout card  │
  │           ↓                        │
  │  B claims → Reference entry in W-18│
  │  OR                                │
  │  B dismisses → No entry created    │
  │                                    │
  │  OR                                │
  │  B declines → Silent rejection;    │
  │  no entry created anywhere         │
  └────────────────────────────────────┘


PATH 2 — POST-WORKOUT (TAGGING FROM W-17)
──────────────────────────────────────────────────────────────────

A completes workout → W-17 loads
        ↓
A taps "+ Tag a training partner" → partner selection sheet
        ↓
A selects B (from squad list or search)
        ↓
A taps "Done"
        ↓

  ┌────── IF B IS A SQUAD MEMBER ──────┐
  │  M-8 fires to B                    │
  │  B sees Unclaimed Workout card in  │
  │  W-1 WwF section                   │
  │           ↓                        │
  │  B claims → Reference entry in W-18│
  │  OR                                │
  │  B dismisses → No entry created    │
  └────────────────────────────────────┘

  ┌────── IF B IS NOT A SQUAD MEMBER ──┐
  │  M-9 fires to B                    │
  │  B sees Pending Approval card in   │
  │  W-1 WwF section                   │
  │           ↓                        │
  │  B approves → M-8 equivalent fires │
  │  B now sees Unclaimed Workout card  │
  │           ↓                        │
  │  B claims → Reference entry in W-18│
  │  OR                                │
  │  B dismisses → No entry created    │
  │                                    │
  │  OR                                │
  │  B declines → Silent rejection;    │
  │  no entry created anywhere         │
  └────────────────────────────────────┘
```

**What appears in history after a successful claim:**

```
A's history (the tagger):
  Workout record with "[Activity Type] · [Date] · Trained with [Name]" annotation

B's history (the tagged, after claiming):
  Reference entry: "[Activity Type] · [Date] · Trained with [Name]"
  No performance data. No sets. No weight. No distance.
```

---

## Section 4 — Train Together Flow (Pre-Workout, S-2 → S-10)

Train Together is initiated before the workout begins. The athlete who wants to pre-associate a partner opens the Squads tab, not the Workouts tab.

**Entry point:** S-2 Squad Activity Feed — "Train Together" action within the squad context.

### 4.1 S-10 Train Together Screen

Train Together supports any athlete — squad member or non-squad. Squad members are surfaced first. Non-squad athletes are reachable via search. The M-8/M-9 consent split is applied at tag time (when "Done" is tapped on W-17), not at selection time in S-10.

```
┌────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                 │
├────────────────────────────────────────────────────┤
│  [←]  Train Together                               │  ← Top App Bar
├────────────────────────────────────────────────────┤
│                                                    │
│  Who are you training with today?                  │  ← Invitation question, 18sp
│                                                    │
│  [ 🔍 Search athletes... ]                         │  ← Search field (always visible)
│                                                    │
│  MY SQUAD                                          │  ← Section label, 12sp, secondary
│  [Avatar]  [Name]  ·  [Squad Name]                 │  ← Squad member row
│  [Avatar]  [Name]  ·  [Squad Name]                 │
│  [Avatar]  [Name]  ·  [Squad Name]                 │
│                                                    │
└────────────────────────────────────────────────────┤
│  [  Start Training Together  ]                     │  ← Primary CTA (disabled until selection)
└────────────────────────────────────────────────────┘
```

**Non-squad search results** (after typing in the search field):
```
│  MY SQUAD (filtered results or full list above)    │
│  ──────────────────────────────                    │
│  OTHER ATHLETES                                    │  ← Section label, 12sp, secondary
│  [Avatar]  [Name]  ·  Requires approval            │  ← Non-squad row with approval indicator
```

**Selection state — single partner selected:**
The selected row shows a checkmark. "Start Training Together" becomes active. For non-squad selections, the "Requires approval" indicator remains visible on the selected row — the tagger sees at a glance which partners will require M-9 approval.

**Multiple partner support:**
Up to 3 partners can be pre-tagged from S-10 in a single Train Together session. Squad and non-squad partners can be mixed in a single selection. "Start Training Together" fires when the athlete is ready.

**What appears:**
- Search field (always visible at top — squad members discoverable via search; non-squad athletes discoverable via search)
- Squad member list under "MY SQUAD" section label, grouped by squad if the athlete belongs to multiple squads
- Each squad row: avatar, name, squad name
- Non-squad search results under "OTHER ATHLETES" section label with "Requires approval" indicator
- Selection checkmarks (multi-select supported, up to 3)
- "Start Training Together" Primary CTA (disabled until ≥1 selection)
- Back arrow → returns to S-2

**What does not appear:**
- Any status about whether the partner is "currently training" — no live presence
- The partner's recent workout history
- Suggestions for who to train with
- Any confirmation that the pre-association has been received by the partner — no notification fires until "Done" on W-17

**Why the "Requires approval" indicator:**
The tagger selecting a non-squad athlete is initiating an M-9 flow — the partner will need to approve before they receive the claim/dismiss option. Surfacing this in S-10 sets the tagger's expectation correctly: this partner will receive a request, not a notification that they've been tagged. The indicator is informational, not a gate — the tagger can still select any non-squad athlete freely.

### 4.2 After "Start Training Together"

After tapping "Start Training Together":
1. Selected partner(s) are pre-associated with the next workout session started
2. The athlete is navigated to W-1 Workouts Hub
3. No confirmation toast. No "Ready to train!" message. The athlete is returned to the dispatch screen and begins their session.

**M-8/M-9 determination for Train Together pre-tags:**
Squad membership is evaluated when "Done" is tapped on W-17 — not at S-10 selection time. A squad member pre-tagged at S-10 receives M-8 on W-17 "Done." A non-squad athlete pre-tagged at S-10 receives M-9 on W-17 "Done." If an athlete's squad status changes between S-10 selection and W-17 "Done," the status at "Done" time governs.

**Pre-association lifecycle:**
- The pre-association is consumed when the athlete completes a workout session and saves it via W-17
- If the athlete starts a workout and discards it (Discard path from the Abandonment Confirmation Sheet), the pre-association persists — the discarded session does not consume the tag
- If the athlete does not begin a workout within 24 hours of initiating Train Together, the pre-association expires silently — no notification to either party
- If the app is force-quit after Train Together but before the workout begins, the pre-association persists until the 24-hour expiry

**Why 24 hours:**
Train Together is an intention expressed in the moment — "I'm about to train with you." A pre-association that persists indefinitely would produce stale or accidental tags when an athlete initiates Train Together but doesn't actually train that day. 24 hours bounds the intent to the reasonable training window.

### 4.3 Partner Indicator During Workout (W-9 Through W-16)

Pre-tagged partners are indicated in the Workout Action Bar or Chapter Context Strip during the active session. The indicator is compact and read-only:

```
┌───────────────────────────────────────────────┐
│  [←]  Upper Body A            [⋯]             │  ← Workout Action Bar
├───────────────────────────────────────────────┤
│  Building →  Chapter 3: The Rebuild            │  ← Chapter Context Strip
│  Training with [Name]                          │  ← Partner indicator (compact)
└───────────────────────────────────────────────┘
```

Or as a compact chip below the Chapter Context Strip:

```
│  [👤] Training with [Name]                     │  ← 12sp, secondary, non-tappable
```

**What the indicator shows:**
- "Training with [Name]" — the partner's display name
- If multiple pre-tagged partners: "Training with [Name] +2" — the first name and count

**What the indicator does NOT show:**
- Partner's current activity
- Whether the partner is currently training
- Any live data from the partner
- A way to communicate with the partner
- A way to remove the partner during the session (removal is only via W-17 before "Done")

**WwF notifications suppressed during session:**
No M-8 or M-9 notifications appear while the athlete is in an active workout screen (W-9 through W-16). Incoming tag requests from others are queued and surface in W-1 after the workout ends.

---

## Section 5 — Post-Workout Tagging Flow (W-17 → Partner Selection Sheet)

Post-workout tagging is initiated from W-17 Workout Summary. This is the correct moment — the execution is complete, the session has been saved, and the athlete is in reflection mode.

### 5.1 Entry from W-17

The Tier 4 section on W-17 contains the tagging invitation:

```
┌───────────────────────────────────────────────────────┐
│  Who trained with you today?                          │  ← Invitation question
│                                                       │
│  [  + Tag a training partner  ]                       │  ← Secondary CTA
└───────────────────────────────────────────────────────┘
```

Tapping "+ Tag a training partner" opens the partner selection bottom sheet.

### 5.2 W-20 Partner Selection Sheet (Bottom Sheet from W-17)

W-20 is the partner selection surface accessed from W-17. It appears as a bottom sheet (approximately 60% screen height) over W-17. W-17 content dims behind it but remains visible.

```
┌────────────────────────────────────────────────┐
│  ─────────────────────────  (drag handle)      │
│  Tag a training partner                         │  ← Sheet title, 16sp
│                                                 │
│  [ 🔍 Search athletes... ]                     │  ← Search field
│                                                 │
│  MY SQUAD                                       │  ← Section label, 12sp, secondary
│  [Avatar]  [Name]  ·  [Squad Name]              │  ← Squad member row
│  [Avatar]  [Name]  ·  [Squad Name]              │
│  [Avatar]  [Name]  ·  [Squad Name]              │
│                                                 │
└────────────────────────────────────────────────┘
```

**Squad section:**
Lists all squad members across all squads the athlete belongs to. Sorted alphabetically. Grouped by squad if multiple squads.

**Search:**
The search field queries athletes by name. Returns squad members first, then non-squad athletes. Non-squad results appear below a visual separator. Search is available immediately — no minimum character count.

**Non-squad search results:**
```
│  MY SQUAD (above)                               │
│  ──────────────────────────────                 │
│  OTHER ATHLETES                                 │  ← Section label, 12sp, secondary
│  [Avatar]  [Name]                               │  ← Non-squad result (no squad name shown)
```

**Selection:**
Tapping a row selects the partner. Multiple selections are supported (up to 3 partners per workout, consistent with Train Together). Selected rows show a checkmark. The sheet does not close on selection — the athlete can add more partners. Tapping "Done" on the sheet confirms the selection and returns to W-17 with the selected partner(s) shown.

**Sheet dismiss without selection:**
Swiping down or tapping the background closes the sheet. No partner is tagged. W-17 shows the unchanged "+ Tag a training partner" CTA.

### 5.3 W-17 After Partner Selection

Once partners are selected and confirmed via the sheet:

**Single partner:**
```
┌───────────────────────────────────────────────────────┐
│  [Avatar]  [Name]  ·  [Squad Name]             [×]    │  ← Tagged partner + remove
└───────────────────────────────────────────────────────┘
```

**Multiple partners:**
```
┌───────────────────────────────────────────────────────┐
│  [Avatar]  [Name 1]  ·  [Squad Name]           [×]    │
│  [Avatar]  [Name 2]  ·  [Squad Name]           [×]    │
└───────────────────────────────────────────────────────┘
```

The [×] control removes the partner from the pending tag. Tapping it removes the row and restores the "+ Tag a training partner" CTA (or removes that partner only if others remain).

**Tags do not fire until "Done" is tapped.** The athlete can freely add and remove partners while on W-17. The tag fires — and M-8 or M-9 sends — when the athlete taps "Done" and exits W-17.

### 5.4 Pre-Tagged Partner State on W-17

Pre-tagged partners (from Train Together via S-10) appear in W-17's Tier 4 section without the invitation copy — the athlete already answered "Who trained with you today?" in S-10. The display state differs based on squad membership evaluated at this moment.

**5.4.1 Squad Pre-Tag — Pre-Confirmed State**

If the pre-tagged partner is a squad member:

```
┌───────────────────────────────────────────────────────┐
│  [Avatar]  [Name]  ·  [Squad Name]                    │  ← Pre-confirmed, no action needed
│                                                       │
│                                                  [×]  │  ← Remove
└───────────────────────────────────────────────────────┘
```

No "Confirm" CTA. No approval required. M-8 fires when "Done" is tapped. The [×] remove is available if the athlete wants to remove the association before completing W-17.

**5.4.2 Non-Squad Pre-Tag — Pending Tag State**

If the pre-tagged partner is not a squad member:

```
┌───────────────────────────────────────────────────────┐
│  [Avatar]  [Name]                                     │  ← Name only (no squad name)
│  Requires approval                                    │  ← 12sp, secondary — M-9 will fire
│                                                  [×]  │  ← Remove
└───────────────────────────────────────────────────────┘
```

Displayed identically to a post-workout non-squad selection from W-20. M-9 fires when "Done" is tapped. The partner must approve before receiving claim/dismiss. The "Requires approval" label persists so the tagger is not surprised when the partner doesn't immediately appear as claimed in W-1.

**Mixed pre-tag state** (squad and non-squad partners selected in S-10):
Both rows appear. Squad partner shows pre-confirmed style. Non-squad partner shows pending tag style with "Requires approval." The [×] is available on each row independently.

---

## Section 6 — Squad Auto-Accept Flow

When an athlete tags a squad member (either via Train Together or via post-workout tagging on W-17), the flow is:

1. Tagger taps "Done" on W-17
2. System identifies each tagged partner as squad member or non-squad
3. For squad members: M-8 notification fires immediately
4. Tagged partner receives M-8 in their notification system and as an action card in W-1

**Squad determination:** A partner is a squad member if both athletes belong to at least one common squad at the time the tagger taps "Done." Squad membership is evaluated at tag time, not at claim time.

### 6.1 Unclaimed Workout Card in W-1

The tagged squad member sees this card in the WwF section of W-1:

```
┌────────────────────────────────────────────────┐
│  Workout With Friend                           │  ← Section label
├────────────────────────────────────────────────┤
│  [Avatar]  [Name] tagged you in a workout      │  ← 14sp, primary text
│  [Activity Type]  ·  [Date]                    │  ← 12sp, secondary text
│                                                │
│  [  Claim Workout  ]      [  Dismiss  ]        │  ← Secondary CTA + Tertiary CTA
└────────────────────────────────────────────────┘
```

**What the card shows:**
- Tagger's avatar and display name
- "[Name] tagged you in a workout" — present tense, factual
- Activity type and date of the tagger's session
- "Claim Workout" (Secondary class) — creates the reference entry
- "Dismiss" (Tertiary class) — removes the card, creates nothing

**What the card does NOT show:**
- Any of the tagger's workout data (exercises, sets, reps, weight, duration, distance)
- The tagger's chapter or program context
- Any implication about what the tagged athlete should do

### 6.2 "Claim Workout" Action

Tapping "Claim Workout" creates a reference entry in the tagged athlete's W-18 Activity History:

```
Reference Entry Created:
  Activity type: [same as tagger's session]
  Date: [date of tagger's session]
  Description: "Trained with [Tagger's Name]"
  Performance data: none
  Chapter attribution: tagged athlete's active chapter at time of claim (if any)
```

After claiming: the card is removed from W-1. No confirmation toast needed — the card's disappearance is the confirmation. The reference entry is now accessible in W-18.

### 6.3 "Dismiss" Action

Tapping "Dismiss":
- Removes the card from W-1
- Creates no reference entry in the tagged athlete's history
- Creates no record that the claim was dismissed
- Does not notify the tagger

Dismiss is permanent. The card does not reappear. The athlete cannot undo a dismiss from W-1. If they change their mind, no recovery path exists in MVP. (Post-MVP: the tagger's W-19 activity detail could offer a re-tag, but this is not in scope.)

---

## Section 7 — Non-Squad Approval Flow

When an athlete tags a non-squad member from W-17, the flow requires an additional consent step:

1. Tagger taps "Done" on W-17
2. System identifies tagged partner as non-squad
3. M-9 notification fires to tagged athlete
4. Tagged athlete sees Pending Approval card in W-1

### 7.1 Pending Approval Card in W-1

```
┌────────────────────────────────────────────────┐
│  Workout With Friend                           │
├────────────────────────────────────────────────┤
│  [Avatar]  [Name] wants to tag you             │  ← 14sp, primary text
│  in a workout                                  │
│  [Activity Type]  ·  [Date]                    │  ← 12sp, secondary
│                                                │
│  [  Approve  ]            [  Decline  ]        │  ← Secondary + Destructive CTAs
└────────────────────────────────────────────────┘
```

"[Name] wants to tag you in a workout" — the language is a request, not a statement of fact. This athlete is asking permission to create an association.

### 7.2 "Approve" Action

Tapping "Approve":
- Confirms the association
- The Pending Approval card is replaced immediately by an Unclaimed Workout card (the claim/dismiss decision)
- M-8 equivalent fires — the athlete now goes through the standard claim/dismiss flow

The transition is immediate: Approve → Unclaimed Workout card visible in the same W-1 session. The athlete does not need to return to W-1 later; the claim/dismiss card appears in place of the approval card.

### 7.3 "Decline" Action

Tapping "Decline":
- Removes the Pending Approval card from W-1
- Creates no record of the decline
- Creates no association of any kind
- Does NOT send any notification to the tagger

**Why decline is silent:**
The tagger who tags a non-squad athlete has initiated an uncertain association. They know this. They do not have a standing relationship with this athlete (that's what squad membership represents). The tagged athlete's decision about their own record is private. Notifying the tagger of a decline would create social friction, pressure to explain, and a chilling effect on future use of WwF.

Decline is the athlete saying "I choose not to include this in my record." That choice belongs entirely to them and requires no explanation.

---

## Section 8 — Claim Workout Flow

The claim creates the reference entry. This is the moment of record creation for the tagged athlete.

### 8.1 What the Reference Entry Contains

```
┌───────────────────────────────────────────────────────┐
│  [Activity Icon]  [Activity Type]                     │  ← e.g., "Strength"
│  [Date]  ·  Trained with [Tagger's Name]              │  ← e.g., "Jun 9 · Trained with Alex"
│  [Chapter Name]  (if active chapter at time of claim) │  ← Chapter attribution
└───────────────────────────────────────────────────────┘
```

**What the reference entry contains:**
- Activity type — inherited from the tagger's session (the event type: Strength, Run, etc.)
- Date — the date of the tagger's session (not the claim date)
- "Trained with [Tagger's Name]" — this is the entire description
- Chapter attribution: the tagged athlete's active chapter at the time of claim (if any exists)

**What the reference entry does NOT contain:**
- Any exercise from the tagger's session
- Sets, reps, weight, distance, duration from the tagger's session
- The tagger's chapter or program context
- Any performance metric of any kind

### 8.2 W-19 Activity Detail for a Reference Entry

When the tagged athlete taps on a reference entry in W-18, they navigate to W-19 Activity Detail. The detail view for a reference entry is distinct from a full workout detail:

```
┌───────────────────────────────────────────────────────┐
│  [←]  Activity Detail                                 │  ← Top App Bar
├───────────────────────────────────────────────────────┤
│                                                       │
│  Reference Entry                                      │  ← Entry type label, 12sp, muted
│  [Activity Type]  ·  [Date]                           │  ← 20sp, primary
│                                                       │
│  Trained with [Name]                                  │  ← 16sp, primary
│                                                       │
│  ─────────────────────────────────────────────────    │
│                                                       │
│  No workout data recorded for this entry.             │  ← 13sp, secondary
│  This record reflects shared presence,                │
│  not performance.                                     │
│                                                       │
│  ─────────────────────────────────────────────────    │
│                                                       │
│  Chapter 3: The Rebuild  (if attributed)              │  ← Chapter attribution line
│                                                       │
└───────────────────────────────────────────────────────┘
```

**"No workout data recorded for this entry. This record reflects shared presence, not performance."**

This copy exists to address the natural question a reader would have: "Why are there no exercises here?" The explanation is honest and immediate. It does not apologize for the absence of data — it explains the nature of the entry. A reader who understands what a reference entry is will not interpret the absence as a bug or a sync failure.

### 8.3 W-19 Activity Detail for the Tagger's Session

The athlete who did the tagging has their regular full workout detail in W-19. The only WwF-visible element is an annotation line at the bottom of the detail:

```
│  [Exercises with sets/reps/weights ...]              │
│                                                       │
│  ─────────────────────────────────────────────────    │
│  Trained with [Tagged Athlete's Name]                 │  ← Annotation, 13sp, secondary
```

The annotation confirms who was tagged. It does not link to the tagged athlete's profile. The name is not tappable in MVP. It is a record annotation, not a social link.

---

## Section 9 — Decline Flow

The Decline flow is fully described in Section 7.3. Summary for clarity:

**Trigger:** Tagged non-squad athlete taps "Decline" on the Pending Approval card in W-1.

**Outcome:**
- Pending Approval card removed from W-1
- No association created anywhere
- No entry in the decliner's W-18
- No entry in the tagger's W-18 (tagger's workout record already shows "Trained with [Name]" as their annotation — the decline does not retroactively remove this from the tagger's own record)
- No notification sent to the tagger

**The asymmetry:**
The tagger's workout annotation ("Trained with [Name]") persists in the tagger's own record regardless of the decline. The tagger's record is the tagger's own documentation of their training experience. They can annotate their own workout with any partner they believe was present. What they cannot do is create an entry in the declined athlete's record — that requires consent.

This asymmetry is intentional. The tagger is not wrong to have tagged. The decliner is not wrong to have declined. Both records are accurate from their respective perspectives. The athlete who tagged documents their experience. The athlete who declined protects their own record.

---

## Section 10 — Ignored Tag Flow

An athlete may receive M-8 or M-9 and never respond. They may not open the app. They may dismiss the push notification without opening it. The WwF card accumulates in W-1.

### 10.1 Persistence of Pending Cards

WwF cards in W-1 persist indefinitely until acted upon. There is no automatic expiry in MVP. An athlete who ignores a pending claim for 30 days will still see it when they return to W-1.

**Why no expiry:**
Training happens in life, not in apps. An athlete may be injured, traveling, or otherwise away. A tag from a month ago may still be meaningful to claim upon return. Expiring the card would silently remove the option without the athlete's knowledge or consent.

### 10.2 The Card Does Not Repeat

The card does not re-send M-8 or M-9 as reminders. One notification fires. One card appears. If the athlete ignores it, the card remains available but the system does not nudge.

Sending reminder notifications for a WwF tag would convert an optional feature into a social obligation. The athlete who didn't respond once is not required to respond on a second, third, or seventh prompt.

### 10.3 No Expiry State

W-1 does not show "This tag was from 30 days ago" or any staleness indicator. The card presents factually: "[Name] tagged you in a workout · [Activity Type] · [Date]." The date is visible. The athlete can assess relevance for themselves.

---

## Section 11 — History Attribution Rules

### 11.1 The Tagger's Record

When an athlete tags a partner on W-17 and taps "Done":
- The tagger's workout record in W-18 gains a "Trained with [Name]" annotation
- This happens unconditionally — the annotation is added regardless of whether the partner claims, dismisses, declines, or ignores
- The annotation reflects the tagger's experience. The tagger was there. The tagger's record says so.
- The annotation is visible in W-18 (compact — "with [Name]" inline) and in W-19 (full — "Trained with [Name]" as a labeled line)

### 11.2 The Tagged Athlete's Record (After Claiming)

A claimed reference entry in W-18:
- Activity type: inherited from tagger's session
- Date: the date of the tagger's session
- Description: "Trained with [Name]" — this is the complete description
- Chapter attribution: the tagged athlete's active chapter at the time of claim
- The entry appears in W-18 chronologically by the tagger's session date (not by claim date)

If the tagged athlete claimed a session from June 2 but it's currently June 9, the reference entry appears in W-18 at the June 2 position.

### 11.3 No Cross-Performance Data

Performance data from one athlete's record never appears in another athlete's record under any WwF scenario. This rule has no exceptions in MVP.

The reference entry type is designed precisely to prevent this. A reference entry is not a workout record. It is an acknowledgment of presence. No WwF flow — not Train Together, not post-workout tagging, not claim, not squad auto-accept — creates performance data in a partner's history.

### 11.4 Multiple Tags in One Workout

An athlete may tag up to 3 partners in a single workout session. Each tag generates an independent notification and claim/dismiss or approval flow for each tagged athlete. Each tagged athlete who claims receives an independent reference entry. The entries are not linked to each other — three athletes claiming the same session create three independent reference entries, one per claimant.

The tagger's W-19 annotation shows all tagged athletes: "Trained with [Name 1], [Name 2], [Name 3]."

### 11.5 Retroactive Tagging

There is no post-W-17 tagging mechanism in MVP. If the athlete closes the app before tapping "Done" (and thus before the tag fires), or if they simply forget to tag, the window has passed. The session exists in W-18 without a partner annotation. No retroactive path.

Post-MVP consideration: the W-19 Activity Detail for a session could expose a "Add training partner" action for sessions without a partner annotation. This is not in MVP scope.

---

## Section 12 — Chapter Attribution Rules

### 12.1 The Tagger's Chapter

The tagger's workout is attributed to the tagger's active chapter at session start (established in W-17 Section 13 and the Chapter Attribution rules spec). The WwF annotation on the tagger's workout does not affect chapter attribution.

### 12.2 The Tagged Athlete's Chapter Attribution

Chapter attribution for a reference entry is determined at claim time, not at tag time:

- When the tagged athlete taps "Claim Workout," the system checks for an active chapter
- If an active chapter exists: the reference entry is attributed to that chapter
- If no active chapter exists: the reference entry is uncategorized (same as any workout without a chapter)

**Why claim-time attribution:**
A tag may have been sent days or weeks before it is claimed. The tagged athlete's chapter context may have changed. Attributing to the chapter that was active at tag time would attribute to a potentially stale context. The chapter that is active when the athlete consciously decides to include this session in their record is the correct attribution.

### 12.3 Reference Entries in L-3 Chapter Detail

Claimed reference entries appear in L-3 Chapter Detail's timeline section alongside regular workouts. The entry format in L-3 is:

```
[Activity Icon]  [Activity Type]  ·  [Date]            │
Trained with [Name]                                    │  ← Sub-line, secondary text
```

The entry is styled to be visually consistent with regular workout entries but includes the "Trained with [Name]" sub-line as a distinguishing characteristic.

**What does NOT appear in L-3 for a reference entry:**
- Exercise details
- Sets, reps, weights
- Duration
- Goal progress contribution metrics

**Does a reference entry contribute to chapter goal progress?**
No. Goal progress is based on logged workout data — sets, reps, and weight for strength goals; distance or duration for cardio goals. A reference entry contains no performance data and therefore contributes no measurable progress toward the chapter's primary goal.

The reference entry appears in the chapter timeline because it is an attribution. It contributes to the narrative — "I was training with someone during this chapter" — but not to the quantitative goal tracking.

This is correct. The athlete who claimed a reference entry from a partner's session did not complete that session. They were present. Presence is chapter material (it says something about how the athlete was training, who they trained alongside). It is not performance material.

---

## Section 13 — Legacy Attribution Rules

### 13.1 Reference Entries in the Legacy Timeline (L-1)

The L-1 Legacy Hub timeline displays the athlete's training history as the backdrop of their legacy. Reference entries appear in this timeline alongside regular workouts:

```
[Activity Icon]  [Activity Type]  ·  [Date]
Trained with [Name]
```

The entry is factual and minimal. No special WwF visual treatment beyond the "Trained with [Name]" line.

### 13.2 Reference Entries Are Not Legacy Highlights

A reference entry is not eligible to be:
- A Featured Legacy Moment
- An Accomplishment
- An Honor

It contains no performance data, no milestone marker, and no quantitative progression. The Featured Legacy Moment Standards require a clear event type (PR, chapter sealing, program graduation, photo). A reference entry is a presence acknowledgment. It belongs in the timeline — not in the highlights.

### 13.3 The Legacy Value of WwF

The athletes who use WwF consistently will have timelines that say, across months and years: "Trained with [Name] · Trained with [Name] · Trained with [Name]." This pattern has narrative value. It tells the story of an athlete who did not train alone. The timeline tells it. The product does not amplify it.

An athlete who reviews their Legacy and sees dozens of entries tagged with the same person's name has a record of a training relationship. That record has meaning. It does not need Forge Legacy to declare the meaning — the record speaks.

---

## Section 14 — Notification Touchpoints

### 14.1 M-8 — Squad Training Partner Tagged

**Trigger:** An athlete tags a squad member in a workout (either via Train Together → W-17 "Done," or via post-workout tagging on W-17 with a squad member selected).

**Recipient:** The tagged squad member.

**Notification content:**
```
Push notification title: "Workout With Friend"
Push notification body: "[Name] tagged you in a [activity type] · [date]"
```

**In-app surface:** W-1 WwF section — Unclaimed Workout card (see Section 6.1).

**Action from M-8:** Claim or Dismiss.

**No M-8 trigger conditions:**
- The tagger removes the partner before tapping "Done" — no notification
- The workout is discarded (not saved) — no notification
- The partner has blocked notifications at the system level — notification suppressed by OS, card still appears in W-1

### 14.2 M-9 — Non-Squad Athlete Tag Request

**Trigger:** An athlete tags a non-squad member in a workout via post-workout tagging on W-17.

**Recipient:** The tagged non-squad member.

**Notification content:**
```
Push notification title: "Workout With Friend"
Push notification body: "[Name] wants to tag you in a [activity type] · [date]"
```

**In-app surface:** W-1 WwF section — Pending Approval card (see Section 7.1).

**Action from M-9:** Approve (→ Claim/Dismiss) or Decline (silent).

**Note:** M-9 fires for any non-squad tag regardless of whether the tag originated from Train Together (S-10) or post-workout tagging (W-17 → W-20). The tag origin does not affect the notification type — squad membership at tag time is the sole determinant.

### 14.3 Notification Display in W-1

Both M-8 and M-9 surface as action cards in the WwF section of W-1 (see W-1 Spec Sections 7.1 through 7.5). The notification system and the W-1 card are synchronized — if the athlete taps the push notification, they navigate to W-1 with the relevant card visible.

Multiple pending items: all cards stack in the W-1 WwF section. No truncation (see W-1 Spec Section 7.4).

### 14.4 No Additional Notifications in WwF

The following actions do NOT generate notifications:

| Action | No notification because |
|--------|------------------------|
| Tagged athlete claims | The tagger's workflow is complete; a "they claimed it!" notification serves no purpose |
| Tagged athlete dismisses | Same — the tagger's workflow is complete |
| Non-squad athlete declines | Decline is silent; no notification to tagger |
| Tagged athlete ignores card for X days | No reminders; WwF is not an obligation |
| Tagger deletes their workout | No notification to tagged athletes |
| Train Together pre-association expires (24h) | Silent expiry; no notification |

---

## Section 15 — Edge Cases

### 15.1 Tagged Athlete Leaves Squad Before Responding

If an athlete was tagged as a squad member (M-8 fired) but then leaves the squad before responding, the claim/dismiss card remains in W-1. Squad membership was correct at tag time. The subsequent departure does not change the tag type or retroactively convert it to an approval flow. The athlete still gets claim/dismiss.

### 15.2 Tagged Athlete Joins Squad After Being Tagged as Non-Squad

If an athlete received M-9 (non-squad approval request) but joined the tagger's squad before responding, the Pending Approval card remains in W-1 unchanged. Squad status changes after tag time do not retroactively change the notification type or the approval requirement. The athlete still approves or declines.

### 15.3 Tagger Deletes Their Workout After Tag Fires

The tag has already fired (M-8 or M-9). If the tagger navigates to W-19 and deletes their workout (post-MVP action — deletion path not in current scope), the in-flight tag is not retracted in MVP. The pending card may remain in the tagged athlete's W-1. This is an edge case that needs post-MVP handling (deletion should cascade to pending tags).

For MVP: workout deletion is out of scope, so this edge case does not manifest.

### 15.4 Tagged Athlete Claims, Then Their Active Chapter Is Sealed

If the tagged athlete claims a reference entry while Chapter A is active, the reference entry is attributed to Chapter A. If Chapter A is subsequently sealed, the reference entry remains attributed to Chapter A — it belongs to the period when the athlete was building that chapter. Attribution is immutable after creation.

### 15.5 Tagged Athlete Has No Active Chapter When Claiming

The reference entry is created without chapter attribution. It appears in W-18 as an uncategorized entry — identical to any workout logged without an active chapter. If the athlete later creates a chapter, they cannot retroactively attribute the existing reference entry to it. Attribution is set at claim time and immutable.

### 15.6 Two Athletes Tag Each Other for the Same Day

Athlete A tags B in Workout X (A's workout, Jun 9). B also logged their own workout on Jun 9 and tags A from their W-17.

These are two independent events:
- A's workout (Jun 9) annotated "Trained with B"
- B's workout (Jun 9) annotated "Trained with A"
- A receives M-8 or M-9 from B's tag → can claim → reference entry from B's session
- B receives M-8 from A's tag → can claim → reference entry from A's session

Four potential records total. All independent. Both athletes can claim both reference entries if they choose. Their own workout records are their own. The reference entries are separate.

### 15.7 Partner Tagged From Different Activity Type

If A tagged B in a Strength session and B's own workout that day was a Run, the reference entry in B's history records "Strength · Jun 9 · Trained with A." The activity type in the reference entry is the tagger's session type. This is accurate — B was present during A's strength session. B's own Run session is a separate record.

### 15.8 Tagged Athlete Has Never Opened The App

If the tagger tags an athlete who has never opened Forge Legacy (non-squad, found via search by email/phone number at sign-up), M-9 is queued. If the invitee creates an account, M-9 fires upon account creation. The Pending Approval card appears in their W-1 upon first login to the Workouts hub.

If the invitee never creates an account, the queued notification remains in a pending state indefinitely. No UX impact on existing users.

### 15.9 All Partners Removed Before "Done"

The athlete selects a partner in the W-20 sheet, then removes them using [×] before tapping "Done." W-17 shows the "+ Tag a training partner" CTA again. No notification fires. The session saves without a partner annotation. This is correct behavior.

### 15.10 App Force-Quit Between W-17 Load and "Done" Tap

The session was already saved before W-17 loaded. The workout record exists in local storage. The partner tag has not yet fired (it fires on "Done"). On next launch, the athlete sees W-1 (the active workout context was removed from the stack at session save). The partner tag opportunity has passed — no retroactive path in MVP. The session is in W-18 without a partner annotation.

### 15.11 Multiple Pending WwF Cards from the Same Athlete

Athlete A trains regularly and tags B in every session. B may accumulate multiple unclaimed workout cards from A in W-1. All stack. All are individually actionable. There is no "claim all from A" batch action in MVP. B works through each one independently.

### 15.12 Training With Friend Outside Forge Legacy (Not Tagged)

An athlete trains alongside a friend but neither uses WwF. No WwF record is created. This is the most common scenario and it is handled perfectly by doing nothing. WwF records the cases when athletes choose to acknowledge shared presence. It does not require acknowledgment. The athletes who trained together without using WwF have not failed to use a required feature.

---

## Section 16 — Mobile UX Considerations

### 16.1 W-1 WwF Section

The WwF section is a conditional section in W-1. It appears between the Program Section (if present) and the Recent Workouts section when pending items exist. It disappears entirely when the queue is empty. No empty state. No "No partner workouts pending." Silence is the correct empty state.

Action cards are the full width of the content area. "Claim Workout" and "Dismiss" sit side by side at the card bottom — Secondary and Tertiary class CTAs. "Approve" and "Decline" are Secondary and Destructive class. All CTAs are minimum 44dp height.

All card content (avatar, name, activity type, date) is visible without scrolling within the card. Cards do not have inner scroll.

### 16.2 W-20 Partner Selection Sheet

W-20 appears as a bottom sheet — approximately 50–60% screen height. The background (W-17) dims to 40% opacity behind it. The sheet has a drag handle at the top. It can be dismissed by dragging down or tapping the dimmed background.

The search field is the first interactive element. On sheet open, the keyboard does not auto-appear — the squad list is immediately visible without requiring search. Search is available but not mandatory.

Squad member rows: avatar (32dp) + name + squad name. Minimum 44dp row height. Checkmark appears on selected rows. The selected state is clearly distinguishable from unselected.

If the squad has more than 7 members, the list scrolls. The search field remains sticky at the top of the sheet during scroll.

Non-squad search results appear below a visual separator labeled "OTHER ATHLETES" after typing at least 1 character into the search field.

### 16.3 W-10 Partner Indicator During Active Workout

The partner indicator during an active workout (Section 4.3) must not compete with the Workout Action Bar or Chapter Context Strip. It is 12sp secondary text. It does not have a tap target — it is informational only. It occupies no more than one line below the Chapter Context Strip.

### 16.4 Tap Targets

| Element | Minimum Size |
|---------|-------------|
| "Claim Workout" CTA in W-1 card | 44dp height, ~48% card width |
| "Dismiss" CTA in W-1 card | 44dp height, ~48% card width |
| "Approve" CTA in W-1 card | 44dp height, ~48% card width |
| "Decline" CTA in W-1 card | 44dp height, ~48% card width |
| Partner selection row in W-20 sheet | Full width × 44dp |
| [×] remove partner on W-17 | 44×44dp |
| "+ Tag a training partner" on W-17 | Full width × 44dp |
| W-20 drag handle | 44dp height touch target (visual handle can be narrower) |

### 16.5 Notification Deep Links

Tapping M-8 or M-9 push notifications navigates the athlete to W-1 with the WwF section scrolled into view. If the athlete is already on W-1, the screen does not reload — the WwF section is visible in the existing scroll position.

### 16.6 Orientation

All WwF surfaces support portrait orientation only — consistent with the Active Workout Flow and Workout Summary specifications.

### 16.7 Privacy Considerations

Non-squad athlete search results in W-20 should only surface athletes who have Forge Legacy accounts. Search should not allow discovery of athletes who have not enabled any discoverability. The exact discoverability settings are defined in the Profile and Privacy system (out of scope for this spec) — this spec assumes that search returns athletes who are searchable per their own settings.

Squad members are always visible to each other in W-20 by virtue of squad membership.

---

## Section 17 — WwF System Validation Checklist

### Architecture Compliance
- [ ] Squad members receive M-8 (auto-accept notification); non-squad receive M-9 (approval request)
- [ ] Non-squad athletes must approve before receiving the claim/dismiss option
- [ ] Claimed workouts create reference entries — not full workout records — in the tagged athlete's history
- [ ] Reference entries contain: activity type, date, "Trained with [Name]" — no performance data
- [ ] Tags fire on "Done" (W-17), not on partner selection
- [ ] Decline is silent — no notification to requester
- [ ] WwF is optional throughout — no mandatory step in any workout flow requires WwF
- [ ] Absence of tag is never flagged as a gap in any athlete's record
- [ ] Train Together (S-10) supports any athlete; M-8 fires for squad members, M-9 fires for non-squad members
- [ ] Post-workout tagging (W-17 → W-20) supports any athlete with identical M-8/M-9 split

### Consent and Privacy
- [ ] No association appears in any athlete's history without their explicit action (claim/approve → claim)
- [ ] Decline creates no record, sends no notification to the tagger
- [ ] Dismiss creates no record, sends no notification to the tagger
- [ ] Partner indicator during active workout is read-only — no live data, no communication channel
- [ ] Tagged athlete name in reference entries is not tappable (MVP)
- [ ] Non-squad search in W-20 and S-10 respects athlete discoverability settings

### Record Integrity
- [ ] Tagger's workout annotation ("Trained with [Name]") persists regardless of partner's response
- [ ] Tagged athlete's reference entry is independent — tagger deleting their workout does not remove the reference entry
- [ ] Activity type and date in reference entry match the tagger's session (not the claim date)
- [ ] Chapter attribution in reference entry is determined at claim time, not tag time
- [ ] Reference entries are positioned in W-18 by session date (tagger's date), not claim date
- [ ] No cross-performance data — no sets, reps, weight, distance, duration from tagger appears in reference entry

### W-1 WwF Section
- [ ] Section appears only when pending items exist; section omitted entirely when empty
- [ ] Unclaimed Workout card shows: tagger avatar, tagger name, activity type, date, Claim/Dismiss
- [ ] Pending Approval card shows: tagger avatar, tagger name, activity type, date, Approve/Decline
- [ ] All pending items stack; no truncation
- [ ] "Claim Workout" → creates reference entry in W-18; card removed from W-1
- [ ] "Dismiss" → removes card; nothing created; no notification to tagger
- [ ] "Approve" → converts to Unclaimed Workout card immediately in same session
- [ ] "Decline" → removes card; nothing created; no notification to tagger

### W-17 Tagging Section
- [ ] "Who trained with you today?" invitation shown when no pre-tag
- [ ] Squad pre-tagged partner (Train Together) shown as pre-confirmed — no action required, M-8 fires on "Done"
- [ ] Non-squad pre-tagged partner (Train Together) shown as pending tag with "Requires approval" label — M-9 fires on "Done"
- [ ] Mixed pre-tag (squad + non-squad from S-10): squad row shows pre-confirmed, non-squad row shows "Requires approval"
- [ ] "+ Tag a training partner" opens W-20 partner selection bottom sheet
- [ ] Selected partner shown with [×] remove option
- [ ] Partner can be removed via [×] before "Done" — no notification fires
- [ ] Tag fires on "Done" tap, not on partner selection
- [ ] No nudge if athlete taps "Done" without tagging

### W-20 Partner Selection Sheet
- [ ] Opens as bottom sheet over W-17 — W-17 dimmed but visible
- [ ] Squad member list shown immediately (no search required)
- [ ] Search field available for non-squad discovery
- [ ] Non-squad results appear under "OTHER ATHLETES" section separator
- [ ] Multi-select supported (up to 3 partners)
- [ ] "Done" on sheet confirms selection — returns to W-17 with partners shown
- [ ] Dismiss without selection → W-17 unchanged

### S-10 Train Together Screen
- [ ] Search field always visible; squad members surfaced immediately under "MY SQUAD"
- [ ] Non-squad athletes discoverable via search, appearing under "OTHER ATHLETES" section separator
- [ ] Non-squad rows display "Requires approval" indicator (12sp secondary text)
- [ ] Squad and non-squad partners can be mixed in a single Train Together selection
- [ ] Multi-select supported (up to 3 partners, any combination of squad/non-squad)
- [ ] "Start Training Together" disabled until ≥1 selection
- [ ] Post-confirmation: navigate to W-1
- [ ] M-8/M-9 determination evaluated at W-17 "Done" time, not at S-10 selection time
- [ ] Pre-association persists until next workout session saved
- [ ] Pre-association expires after 24 hours if no workout begun
- [ ] Pre-association survives a discarded workout (not yet saved)
- [ ] WwF notifications suppressed during active workout (W-9–W-16)

### Notifications
- [ ] M-8 fires when squad member is tagged and "Done" is tapped on W-17
- [ ] M-9 fires when non-squad member is tagged and "Done" is tapped on W-17
- [ ] Tapping M-8 or M-9 push notification deep-links to W-1 with WwF section visible
- [ ] No notification fires when tagged athlete claims, dismisses, approves, or declines
- [ ] No reminder notifications — one notification per tag event, no follow-ups
- [ ] No notification when Train Together pre-association expires

### Reference Entry Visibility
- [ ] Reference entries appear in W-18 Activity History (chronological by session date)
- [ ] Reference entries appear in W-19 Activity Detail with "Reference Entry" label and explanatory copy
- [ ] Reference entries appear in L-3 Chapter Detail timeline with "Trained with [Name]" sub-line
- [ ] Reference entries appear in L-1 Legacy Hub timeline
- [ ] Reference entries are not eligible for Featured Legacy Moment, Accomplishment, or Honor
- [ ] Reference entries do not contribute to chapter goal progress percentage

### Chapter Attribution
- [ ] Reference entry chapter attribution is set at claim time (not tag time)
- [ ] If no active chapter at claim time: reference entry is uncategorized
- [ ] Chapter attribution is immutable after creation
- [ ] Reference entry appears in L-3 timeline for the attributed chapter

### Legacy Alignment
- [ ] "Presence is not performance" — no performance data in reference entries
- [ ] Optional throughout — absence never penalized
- [ ] Decline is silent — Accountability Without Shame
- [ ] No social metrics, feeds, or comparison visible in any WwF surface
- [ ] Reference entries appear in timeline as narrative elements — not achievement or progress elements
- [ ] Chapter First — reference entries in L-3 appear in chapter context naturally, without special treatment

---

## Appendix — WwF Screen Inventory

| Screen ID | Name | Description |
|-----------|------|-------------|
| W-1 | Workouts Hub | WwF section: pending claims, pending approvals |
| W-17 | Workout Summary | Post-workout tagging (Tier 4); pre-tag confirmation |
| W-20 | Partner Selection Sheet | Bottom sheet from W-17; squad list + non-squad search |
| W-18 | Activity History | Reference entries appear in chronological list |
| W-19 | Activity Detail | Reference entry detail with "Reference Entry" label |
| S-2 | Squad Activity Feed | Train Together entry point |
| S-10 | Train Together | Pre-workout partner selection (any athlete; M-8/M-9 determined at tag time) |
| L-1 | Legacy Hub | Reference entries in timeline |
| L-3 | Chapter Detail | Reference entries in chapter timeline |

---

## Appendix — WwF Notification Reference

| ID | Trigger | Recipient | Action Available |
|----|---------|-----------|-----------------|
| M-8 | Squad member tagged in workout | Tagged squad member | Claim / Dismiss (W-1) |
| M-9 | Non-squad member tagged in workout | Tagged non-squad member | Approve / Decline (W-1) |

---

---

## Architecture Amendment A — Train Together Scope Expansion

**Amendment ID:** WwF-A
**Status:** Approved | June 2026
**Supersedes:** Section 4.1 (v1.0), Section 4.2 (v1.0), Section 5.4 (v1.0), Section 14.2 (v1.0)

### Amendment Summary

Train Together (S-10) is no longer restricted to squad members. Effective v1.1, Train Together supports any athlete. The M-8/M-9 consent architecture is preserved without modification.

### What Changed

| Area | v1.0 Rule | v1.1 Rule |
|------|-----------|-----------|
| S-10 partner list | Squad members only | Any athlete (squad first, non-squad via search) |
| S-10 search field | Not present | Always visible |
| Non-squad in S-10 | Not available | Available with "Requires approval" indicator |
| M-9 trigger | W-17 post-workout tagging only | W-17 post-workout tagging OR Train Together S-10 (for non-squad pre-tags) |
| W-17 pre-tag state | Single state (pre-confirmed) | Two states: pre-confirmed (squad) / pending tag with "Requires approval" (non-squad) |

### What Did Not Change

The following are unchanged from v1.0:

- Squad members continue using the M-8 flow (claim/dismiss)
- Non-squad athletes continue using the M-9 approval flow (approve → claim/dismiss)
- Presence is not performance — reference entries contain no performance data
- Claim/Dismiss behavior
- Record ownership
- History attribution rules
- Chapter attribution rules
- Legacy attribution rules
- No additional notifications introduced
- Accountability Without Shame
- WwF remains optional throughout

### Architectural Rationale

The squad-only restriction at S-10 provided no consent protection for the tagged athlete. The pre-association is invisible to the tagged athlete — no notification fires, no record is created, no action is required of them during the pre-association period. Consent is protected entirely by the M-8/M-9 split at tag time (W-17 "Done"). Restricting S-10 to squad members prevented the tagger from using Train Together's primary feature — the in-workout partner indicator — with legitimate non-squad training partners. The restriction created UX friction without architectural benefit.

---

## Change Log

| Version | Date | Change | Section(s) Affected |
|---------|------|--------|---------------------|
| v1.0 | June 2026 | Initial specification | All |
| v1.1 | June 2026 | Amendment A: Train Together expanded to any athlete | 4.1, 4.2, 5.4, 14.2, 17 (checklist), Appendices |
| v1.1 | June 2026 | Correction: Section 3 lifecycle diagram updated to reflect Amendment A (Path 1 was still referencing squad-only) | 3 |

---

*Forge Legacy Workout With Friend Architecture & UX Specification*
*v1.1 — June 2026*
*All decisions derived from the Phase 2A locked architecture, the Forge Legacy Master PRD, the Forge Legacy UX Framework v1.0, and the approved H-1, L-1, L-3/L-4, W-1, W-9–W-16, and W-17 wireframe specifications.*
*Amendment A (Train Together scope expansion) approved June 2026.*
*This document is the authority for all Workout With Friend implementation in Phase 2B.*
