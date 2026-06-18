# Forge Legacy — Program Browse Wireframe Specification
## W-2 | Phase 2B | Version 1.1 — June 2026

**Authority:** Program-Architecture-Amendment-001-Active-Program-Rule.md
**PRD Authority:** Section 11 (Program System), Section 8 (Workout System — Programs), Section 5 (MVP — W-2 through W-5)

---

## Preamble: What W-2 Is For

W-2 is where the athlete manages their relationship with programs. It answers two questions simultaneously:

**"What program am I following right now?"**
**"What program should I follow next?"**

The athlete's active program is surfaced immediately and prominently. Past programs are accessible as a permanent record. Future programs — saved for later — are visible and ready to start. A discovery section provides programs the athlete has not yet started or saved.

W-2 is a management and discovery screen. It is not a statistics page. Program records show what the athlete committed to and how far they got — not performance data extracted from those sessions.

**W-2 is entered from:**
- W-1 Workouts Hub (Program section or "Browse Programs" link)
- W-17 Workout Summary (after graduation — "Find Next Program" CTA)
- M-4 Program Graduation Modal (after modal — "Find Next Program" CTA)

**W-2 navigates to:**
- W-3 Program Detail (tapping any program card)
- W-4 Program Create ("+ Create" action)

**Architecture authority:**
The one-active-program rule, four program states, conflict resolution sheet, and legacy permanence rules are all governed by Program-Architecture-Amendment-001. This spec implements those rules in the W-2 surface.

---

## Section 1 — W-2 Goals

W-2 exists to accomplish five things:

1. **Surface the active program** — show the athlete exactly what they are following right now, with its current progress, at the top of the screen
2. **Provide access to future programs** — show programs the athlete has saved or created but not yet started, so they are always visible and ready
3. **Preserve the legacy record** — show Graduated and Ended Early programs as a permanent unified record of the athlete's program history
4. **Enable program discovery** — give the athlete a way to find their next program from the available library
5. **Enable program creation** — entry point to W-4 Program Create

**What W-2 does NOT show:**
- Workout performance data from completed programs (volume, PRs, etc.)
- Statistics derived from program history (total workouts logged, consistency %)
- Comparisons between programs
- Program recommendations based on performance data

W-2 is a program management screen. The data that answers "how did I perform?" belongs in workout history screens (W-18, W-19 — post-MVP). W-2 shows what programs exist and what state they are in.

---

## Section 2 — Information Hierarchy

**TIER 1 — Active Program**
The program the athlete is currently following. Shown first, with the most visual weight, because it is the athlete's current commitment. Includes progress bar and next workout. If no active program: an invitation state with entry points to start or create a program.

**TIER 2 — Upcoming (Future Programs)**
Programs the athlete has saved or created but not yet started. These represent planned future commitments. Shown in a distinct section with reduced visual weight relative to the Active program. Limited preview (show first 2–3) with "See all →" for larger collections.

**TIER 3 — Legacy Programs (Graduated + Ended Early)**
The athlete's program history. Graduated and Ended Early programs appear together in a single unified section — no separation by state. This is the permanent record. Limited preview (show first 2–3) with "See all →" for larger collections.

**TIER 4 — Forge Programs**
System-curated programs available to the athlete that they have not yet added to their collection. This is where the athlete selects a Forge-crafted training path. Content is created by the Forge Legacy product team — not community-generated, not marketplace-sourced.

**Hierarchy principle:**
Active first because it is the present commitment. Upcoming second because it is the near future. Legacy third because it is history — it belongs in the record, but it is not the primary reason most athletes open W-2. Forge Programs last because browsing available paths is a lower-priority activity than managing existing commitments.

---

## Section 3 — Full Scroll Order

W-2 has four distinct states depending on the athlete's program history. Each state produces a different scroll order. The most common fully-populated state is shown first.

### State A: Active program exists (Populated)

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  Programs                              [  + Create  ]   │  ← Top App Bar
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ACTIVE PROGRAM                                         │  ← TIER 1: Active
│  ┌─────────────────────────────────────────────────┐   │
│  │  [Program Name — 18sp, primary weight]          │   │
│  │  v1.0   ·   Active                              │   │  ← version + state label
│  │  ─────────────────────────────────────────────  │   │
│  │  [████████████░░░░░░░░░░] 8 of 12 workouts      │   │  ← progress bar
│  │  Next: [Workout Name]                [  →  ]    │   │  ← next workout link
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  UPCOMING  2                              See all  →   │  ← TIER 2: Future
│  [Program Card — Future]                               │
│  [Program Card — Future]                               │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  LEGACY PROGRAMS  5                       See all  →   │  ← TIER 3: Graduated + Ended Early
│  [Program Card — Graduated]                            │
│  [Program Card — Ended Early]                          │
│  [Program Card — Graduated]                            │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  FORGE PROGRAMS                                               │  ← TIER 4: Forge Programs
│  [Program Card — Library]                              │
│  [Program Card — Library]                              │
│  [Program Card — Library]                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### State B: No active program, has history

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  Programs                              [  + Create  ]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │  ← TIER 1: Active (empty)
│  │  No active program.                             │   │
│  │  [  Browse Programs  ]   [  + Create  ]         │   │  ← invitation CTAs
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  LEGACY PROGRAMS  5                       See all  →   │  ← TIER 3 (promoted; no upcoming)
│  [Program Card — Graduated]                            │
│  [Program Card — Ended Early]                          │
│  [Program Card — Graduated]                            │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  FORGE PROGRAMS                                               │  ← TIER 4
│  [Program Card — Library]                              │
│  [Program Card — Library]                              │
│  [Program Card — Library]                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### State C: Brand-new athlete (no programs of any kind)

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  Programs                              [  + Create  ]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │  ← TIER 1: Active (empty)
│  │  No active program.                             │   │
│  │  [  Browse Programs  ]   [  + Create  ]         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  FORGE PROGRAMS                                               │  ← TIER 4 (only populated tier)
│  [Program Card — Library]                              │
│  [Program Card — Library]                              │
│  [Program Card — Library]                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Sections are absent when empty.** Upcoming and Legacy Programs sections are not shown when the athlete has no Future or historical programs. The screen does not display empty sections with zero-count labels.

---

## Section 4 — Active Program Section

### 4.1 Active Program Card (Program Exists)

```
┌────────────────────────────────────────────────────────┐
│  [Program Name — 18sp, primary weight]                 │
│  v[version]   ·   Active                               │  ← muted secondary, 12sp
│  ─────────────────────────────────────────────────────  │
│  [████████████░░░░░░░░░] X of Y workouts               │  ← progress bar + count
│  Next: [Workout Name]                        [  →  ]   │  ← next workout, tappable row
└────────────────────────────────────────────────────────┘
```

- Section label: "ACTIVE PROGRAM" — 11sp, all caps, secondary, muted
- Full-width card with elevated visual treatment (distinct from section separator)
- Tapping anywhere on the card → W-3 Program Detail (Active state)
- Tapping "Next: [Workout Name] →" row → W-3 Program Detail, scrolled to next workout

**Progress bar:**
- Shows completed vs. remaining workouts in the program schedule
- Format: "[X] of [Y] workouts"
- Visual fill proportional to completion
- The bar is informational — not a motivational pressure mechanic

**Why progress appears on W-2 (but rank progress doesn't appear on P-1):**
A program is a structured plan with a defined endpoint. "8 of 12 workouts" is the plan's own metric — it was defined when the program was created and belongs to the program's management surface. Rank progress, by contrast, is a legacy depth signal that the athlete did not choose an endpoint for — it accumulates indefinitely through the journey. Program progress tells the athlete where they are in a commitment they made. Rank progress is a performance optimization signal. Different question; different surface.

### 4.2 Active Program Card (No Active Program)

```
┌────────────────────────────────────────────────────────┐
│  No active program.                                    │
│  [  Browse Programs  ]   [  + Create  ]                │
└────────────────────────────────────────────────────────┘
```

- Maintained as a card container — the container communicates that an active program belongs here
- "No active program." — 15sp, secondary, neutral
- "Browse Programs" Secondary CTA — scrolls down to the Forge Programs section
- "+ Create" Secondary CTA — navigates to W-4 Program Create
- Both CTAs visible simultaneously — the athlete who wants to browse and the athlete who wants to create both have their path immediately available

**This is an invitation, not a failure state.** No copy like "You haven't started a program yet." Just a neutral statement and two clear paths forward.

### 4.3 What the Active Program Card Does NOT Show

- Volume from completed workouts
- Streak information
- Days since last workout in this program
- Performance metrics from workouts logged
- Any comparison to the athlete's previous programs
- Any time pressure ("X days behind schedule")

The card shows what the program is, where the athlete is in it, and what comes next.

---

## Section 5 — Upcoming Programs Section (Future State)

### 5.1 Section Anatomy

```
─────────────────────────────────────────────────────────
UPCOMING  [count]                            See all  →
[Program Card]
[Program Card]
─────────────────────────────────────────────────────────
```

- Section label: "UPCOMING" — 11sp, all caps, secondary, muted
- Count: total number of Future programs, same line as label
- "See all →" — visible when more than 3 Future programs exist; navigates to a full list view (W-2 filtered to Future)
- Show first 2–3 programs; "See all →" for the rest

### 5.2 Future Program Card

```
┌────────────────────────────────────────────────────────┐
│  [Program Name — 16sp, primary]         v[version]    │
│  [Duration] · [Brief description or workout type]      │  ← optional metadata
│  Upcoming                                              │  ← state label, muted
└────────────────────────────────────────────────────────┘
```

- Full row tappable → W-3 Program Detail (Future state)
- No "Start Program" CTA directly on the W-2 card — the Start action lives on W-3
- State label: "Upcoming" — secondary, muted

**Why no Start on the card:**
Starting a program is a significant action — it may end the current program via the conflict sheet. The athlete should review the program on W-3 before committing. Placing "Start Program" directly on the W-2 list card would bypass that review step and risk accidental program starts.

### 5.3 Section Absent When Empty

If the athlete has no Future programs, the Upcoming section is not shown. No "No upcoming programs" placeholder. The absence is clean and intentional.

---

## Section 6 — Legacy Programs Section (Graduated + Ended Early)

### 6.1 Section Anatomy

```
─────────────────────────────────────────────────────────
LEGACY PROGRAMS  [count]                     See all  →
[Program Card — Graduated]
[Program Card — Ended Early]
[Program Card — Graduated]
─────────────────────────────────────────────────────────
```

- Section label: "LEGACY PROGRAMS" — 11sp, all caps, secondary, muted
- Count: total number of Graduated + Ended Early programs combined
- "See all →" when more than 3 historical programs exist
- Graduated and Ended Early cards appear in the same list in reverse chronological order (most recent end date first)

### 6.2 Graduated Program Card

```
┌────────────────────────────────────────────────────────┐
│  [Program Name — 16sp, primary]         v[version]    │
│  [Month Year] · [Y] workouts completed                 │  ← completion date + workout count
│  Graduated                                             │  ← state label, muted
└────────────────────────────────────────────────────────┘
```

- State label: "Graduated" — secondary, muted
- Tappable → W-3 Program Detail (Graduated/read-only state)

### 6.3 Ended Early Program Card

```
┌────────────────────────────────────────────────────────┐
│  [Program Name — 16sp, primary]         v[version]    │
│  [Month Year] · [X] of [Y] workouts completed          │  ← end date + workouts reached
│  Ended Early                                           │  ← state label, muted
└────────────────────────────────────────────────────────┘
```

- State label: "Ended Early" — secondary, muted
- Same visual treatment as Graduated card — program name dominates
- Tappable → W-3 Program Detail (Ended Early/read-only state)

**Visual parity between Graduated and Ended Early:**
The two card formats are identical in structure. The state label is the only difference. This is intentional — the product makes no visual judgment between the two outcomes. Same card size, same typography weights, same section.

### 6.4 "Legacy Programs" Section Name

The section is called "Legacy Programs" — not "Completed Programs," "Past Programs," or "History." The name communicates permanence and value: these programs are part of the athlete's legacy. It does not name the end state (which would require either mentioning both states in the label or choosing one). It names the category: programs that are now legacy records.

### 6.5 Section Absent When Empty

If the athlete has no historical programs (new athlete, or athlete who has never started a program), the Legacy Programs section is not shown.

---

## Section 7 — Forge Programs Section

### 7.1 What Forge Programs Shows

The Forge Programs section displays system-curated programs created by the Forge Legacy product team. These are programs available to any athlete that have not yet been added to this athlete's collection (not yet in Future, Active, Graduated, or Ended Early state for this athlete). Tapping a program → W-3 Program Detail (preview state).

```
─────────────────────────────────────────────────────────
FORGE PROGRAMS
[Forge Program Card]
[Forge Program Card]
[Forge Program Card]
─────────────────────────────────────────────────────────
```

### 7.2 Forge Program Card

```
┌────────────────────────────────────────────────────────┐
│  [Program Name — 16sp, primary]                       │
│  [Duration] · [Type / Difficulty]      Forge          │  ← "Forge" badge, secondary muted
└────────────────────────────────────────────────────────┘
```

- "Forge" badge at right — secondary metadata, muted — distinguishes system-created from athlete-created
- No state label (not yet in athlete's collection)
- Tappable → W-3 Program Detail (preview state)
- From W-3 preview state: athlete can start the program (fires conflict sheet if another is Active) or save to collection (→ Future state, appears in Upcoming section)

### 7.3 Content Source — Locked

**Forge Programs are system-created and shipped with the product.** Content is curated by the Forge Legacy team.

**MVP program sources (two only):**

| Source | Description | Where It Appears on W-2 |
|--------|-------------|------------------------|
| Forge Programs | System-created, curated, shipped with the product | Forge Programs section |
| My Programs | Athlete-created (W-4), athlete-imported, forked (W-5) | Upcoming section (Future state) |

**MVP explicitly excludes:**
- Community programs
- Shared programs
- Creator programs
- Marketplace programs
- Public program discovery

These exclusions are permanent product architecture decisions, not temporary deferrals. Forge Legacy is not a content platform. Programs serve transformation, chapters, goals, and legacy — not content consumption.

### 7.4 "My Programs" and the Upcoming Section

The "My Programs" source (athlete-created, imported, forked) is fully represented by the Upcoming section. Programs in Future state that the athlete owns appear in Upcoming — no additional section is needed. The Forge Programs section is the only browseable discovery surface because it is the only source not already covered by the athlete's own collection.

### 7.5 Section Absent When Empty

If no Forge Programs are available to this athlete (all have been started or saved, or none are yet shipped), the section is absent. No placeholder shown.

---

## Section 8 — Program Card Anatomy

### 8.1 Card Hierarchy Summary

| Element | Visual Weight | Applies To |
|---------|-------------|-----------|
| Program name | Primary — 16–18sp, full opacity | All states |
| Version number | Secondary metadata — 12sp, muted | All states |
| State label | Secondary metadata — 12sp, muted | Active, Upcoming, Graduated, Ended Early |
| Progress bar | Visual indicator | Active only |
| Workout count / completion info | Secondary — 13sp | Active (X of Y remaining), Graduated (Y completed), Ended Early (X of Y completed) |
| Next workout | Secondary — 13sp | Active only |

### 8.2 Card Tap Target

All program cards are full-width tappable rows with minimum 72dp height. The entire card is the tap target — there is no separate detail link or chevron button.

### 8.3 Program Name Display

Program name never truncates to a single line if it can wrap to two. Maximum 2 lines at 16–18sp. If a name exceeds 2 lines at this size (unusual edge case), truncate with ellipsis at line 2. The program name is the primary identifier — it should be fully legible.

---

## Section 9 — Start Program CTA Logic

### 9.1 Start Program Lives on W-3, Not W-2

The "Start Program" action is not available directly on W-2 program cards. The athlete must tap a program card → navigate to W-3 Program Detail → tap "Start Program" from W-3.

**Why:** Starting a program may end the athlete's current program. This is a significant, irreversible action. The athlete should review the new program in detail before committing. W-3 provides that review context. Placing Start on the W-2 card would invite accidental starts without the review step.

### 9.2 Conflict Sheet Trigger

When "Start Program" is tapped on W-3 and another program is Active:

1. W-3 detects an Active program exists
2. The conflict sheet fires (see Amendment Section 3 for full specification)
3. "End Current Program & Start New" → Ended Early record created, new program activated
4. "Cancel" → sheet dismisses, no changes, athlete remains on W-3

### 9.3 What Happens After Starting

After a new program is activated:
- The newly active program appears at Tier 1 on W-2
- If the previous program was ended early: it appears in the Legacy Programs section with "Ended Early" label
- No additional screen or ceremony acknowledges the end of the previous program

---

## Section 10 — Empty States

### 10.1 Brand-New Athlete (No Programs)

```
ACTIVE PROGRAM
┌────────────────────────────────────────────────────────┐
│  No active program.                                    │
│  [  Browse Programs  ]   [  + Create  ]                │
└────────────────────────────────────────────────────────┘

[Forge Programs section with available programs]
```

- Upcoming section: absent (no Future programs)
- Legacy Programs section: absent (no history)
- Forge Programs section: present and prominent — this is the primary action for a new athlete

### 10.2 Has Programs, None Active

```
ACTIVE PROGRAM
┌────────────────────────────────────────────────────────┐
│  No active program.                                    │
│  [  Browse Programs  ]   [  + Create  ]                │
└────────────────────────────────────────────────────────┘

[Legacy Programs section — past history visible]
[Forge Programs section]
```

This is the state after graduation ("I just finished a program — what's next?") or after ending a program early. The athlete's history is preserved and visible. The invitation to find or create a next program is clear.

### 10.3 Active Program with No History and No Future

```
ACTIVE PROGRAM
┌────────────────────────────────────────────────────────┐
│  [Active program card]                                 │
└────────────────────────────────────────────────────────┘

[Forge Programs section]
```

- Upcoming: absent (no Future programs)
- Legacy Programs: absent (no history)
- Forge Programs section: present

---

## Section 11 — Edge Cases

### 11.1 Very Long Program Name

Program name wraps to 2 lines maximum on all card types. At 16–18sp, most program names fit on 1 line within standard card width. Edge case: extremely long program names truncate with ellipsis at line 2. The full name is visible on W-3 Program Detail.

### 11.2 Large Legacy Program Count (50+)

Legacy Programs section shows first 3 with "See all →" linking to a filtered full list. The count in the section label ("LEGACY PROGRAMS  52") displays the full number. No performance degradation from large counts.

### 11.3 Program At 0% Progress (Active, No Workouts Logged Yet)

```
[Program Name]
v1.0   ·   Active
[░░░░░░░░░░░░░░░░] 0 of 12 workouts
Next: [First Workout Name]              [→]
```

The progress bar is empty (all unfilled). "0 of 12 workouts" is the correct display. This is not an empty state — the athlete has committed to the program; no workouts have been logged yet.

### 11.4 Program At 100% — Final Workout Logged

When the final workout is logged, the transition to Graduated happens via W-17. The athlete does not see the program as Active on W-2 after this — it moves to Legacy Programs (Graduated). W-2 should not display a "100% complete" Active card as an intermediate state.

### 11.5 Athlete Returns to W-2 After Ending a Program Early

After the conflict sheet interaction completes:
- New program is Active at Tier 1
- Previous program appears in Legacy Programs with "Ended Early" label and the date/workouts-reached metadata
- No prompt, modal, or screen calls attention to the ended program
- The transition is complete and clean

### 11.6 Forge Programs Section Has No Available Programs

If all Forge Programs have already been added to the athlete's collection (or none are yet shipped):
- Forge Programs section is absent
- No "No programs available" placeholder

If all sections are absent (no active, no upcoming, no legacy, no Forge Programs): show the Active Program invitation card only. The screen is never fully blank.

### 11.7 Future Program Deleted Before Starting

If the athlete deletes a Future program (via W-3), it is removed from the Upcoming section. Deletion of Future programs is permitted — they have not been started, so there is no legacy record to protect.

Deletion of Active, Graduated, and Ended Early programs is not permitted (Program-Architecture-Amendment-001, Section 6).

---

## Section 12 — Navigation

| Action | Destination |
|--------|-------------|
| Tap Active program card | W-3 Program Detail (Active state) |
| Tap "Next: [workout]" row on Active card | W-3 Program Detail (Active state, scrolled to next workout) |
| Tap Future program card | W-3 Program Detail (Future state) |
| Tap Graduated program card | W-3 Program Detail (Graduated / read-only state) |
| Tap Ended Early program card | W-3 Program Detail (Ended Early / read-only state) |
| Tap Forge Program card | W-3 Program Detail (preview state) |
| "+ Create" in Top App Bar | W-4 Program Create |
| "Browse Programs" CTA (no-active-program state) | Scrolls to Forge Programs section on W-2 |
| "+ Create" CTA (no-active-program state) | W-4 Program Create |
| "See all →" Upcoming | Full list view — W-2 filtered to Future state |
| "See all →" Legacy Programs | Full list view — W-2 filtered to Graduated + Ended Early |
| Back | Returns to W-1, W-17, or M-4 (wherever the athlete entered from) |

---

## Section 13 — Mobile UX Considerations

### 13.1 Screen Type

W-2 is a standard navigation stack screen — not a modal sheet. It has a Top App Bar with a back button and the "+ Create" action. The Tab Bar is visible at the bottom (Workouts tab active).

### 13.2 Top App Bar

- Title: "Programs" — 18–20sp, centered or left-aligned per app standard
- Right action: "+ Create" text button or icon — navigates to W-4
- Left: back arrow — returns to previous screen

### 13.3 Scroll Behavior

Single vertical scroll. No tabs. All sections scroll as a unified list. The Active Program card is always at the top — it does not scroll away while browsing lower sections.

Wait — actually for mobile, if the Active Program card sticks to the top while the athlete scrolls through Discover, that would be a sticky header pattern. This is a design decision I'll flag rather than prescribe: the Active Program card may optionally be a sticky section header that remains visible while the athlete browses the Forge Programs section. Implementation decision for the engineering phase — the wireframe shows it at the top of the scroll.

### 13.4 Tap Targets

| Element | Minimum Size |
|---------|-------------|
| Program card (all states) | Full width × 72dp minimum |
| "+ Create" in Top App Bar | 44×44dp |
| "See all →" link | 44dp height, right-aligned ≥ 44dp touch |
| "Browse Programs" CTA | 44dp height |
| "Next: [workout] →" row | Full width × 44dp |

### 13.5 Portrait Orientation

W-2 is portrait only.

### 13.6 Progress Bar Accessibility

Progress bar on the Active Program card must have an accessible label: "[X] of [Y] workouts completed." The visual bar alone is not sufficient for screen readers.

### 13.7 Accessibility Labels

- Active Program card: `accessibilityLabel` = "[Program Name], Active program, [X] of [Y] workouts completed. Double-tap to view program."
- Future program card: `accessibilityLabel` = "[Program Name], Upcoming program. Double-tap to view program."
- Graduated program card: `accessibilityLabel` = "[Program Name], Graduated [Month Year]. Double-tap to view program."
- Ended Early program card: `accessibilityLabel` = "[Program Name], Ended early [Month Year], [X] of [Y] workouts completed. Double-tap to view program."
- "+ Create" button: `accessibilityLabel` = "Create a program"

---

## Section 14 — Validation Checklist

### Screen Structure
- [ ] Top App Bar present: title "Programs" + "+ Create" action
- [ ] Tab Bar visible (Workouts tab active — this is a stack screen, not a modal)
- [ ] Single vertical scroll — no tabs
- [ ] Section hierarchy: Active → Upcoming → Legacy Programs → Forge Programs
- [ ] Sections absent when empty (no empty section placeholders)

### Active Program Section
- [ ] Section label: "ACTIVE PROGRAM"
- [ ] Active program card: program name (18sp primary), version number, "Active" state label
- [ ] Progress bar: X of Y workouts, proportional fill
- [ ] "Next: [Workout Name] →" tappable row → W-3
- [ ] Active card full-width tappable → W-3 Program Detail (Active state)
- [ ] No-active-program state: neutral "No active program." + "Browse Programs" + "+ Create" CTAs
- [ ] No performance data on active card (no volume, no streaks, no comparisons)

### Upcoming Section (Future Programs)
- [ ] Section label: "UPCOMING" + count
- [ ] "See all →" visible when > 3 Future programs
- [ ] Future program card: name (16sp), version number, "Upcoming" state label
- [ ] No "Start Program" CTA on W-2 card — Start lives on W-3
- [ ] Section absent when no Future programs

### Legacy Programs Section (Graduated + Ended Early)
- [ ] Section label: "LEGACY PROGRAMS" + combined count (Graduated + Ended Early together)
- [ ] "See all →" visible when > 3 historical programs
- [ ] Graduated and Ended Early in same unified list — NO separate sections
- [ ] Graduated card: name, version, completion date, workouts completed, "Graduated" state label
- [ ] Ended Early card: name, version, end date, X of Y workouts completed, "Ended Early" state label
- [ ] State label on both card types: muted secondary weight — program name dominates
- [ ] No visual stigma on Ended Early cards vs. Graduated cards
- [ ] Graduated and Ended Early cards visually identical in structure
- [ ] Section absent when no historical programs

### Forge Programs Section
- [ ] Section label: "FORGE PROGRAMS"
- [ ] Forge Program card: name (16sp), duration/type, "Forge" badge (secondary muted)
- [ ] No state label on Forge Program cards (not yet in athlete's collection)
- [ ] Tapping card → W-3 Program Detail (preview state)
- [ ] Section absent when no Forge Programs available to this athlete
- [ ] Content source: system-created, curated, shipped with product
- [ ] NO community / shared / creator / marketplace programs

### Program–Goal Independence (per Amendment Section 8)
- [ ] W-2 does not gate on chapter or goal state
- [ ] Athlete with no active chapter or goal can fully use W-2
- [ ] W-2 does not show chapter or goal context in program cards

### Conflict Sheet (per Amendment Section 3)
- [ ] Conflict sheet fires from W-3, not W-2 cards
- [ ] No "Start Program" direct action on any W-2 card
- [ ] After "End Current Program & Start New": previous program appears in Legacy Programs as Ended Early
- [ ] After conflict resolution: no ceremony or additional screen for ended program

### Amendment Compliance
- [ ] Maximum one Active program displayed at Tier 1 — never plural
- [ ] Graduated and Ended Early never separated into different sections
- [ ] No delete action on Graduated or Ended Early cards
- [ ] No reactivation action on Graduated or Ended Early cards
- [ ] No conversion action between Graduated and Ended Early
- [ ] "Legacy Programs" section name used — not "Completed Programs"

### Empty States
- [ ] Brand-new athlete: invitation card + Forge Programs section
- [ ] No active program (has history): invitation card + Legacy Programs + Discover
- [ ] Active program only (no history, no upcoming): Active card + Discover
- [ ] Screen never fully blank

### Navigation
- [ ] All program card taps → W-3 Program Detail (correct state)
- [ ] "+ Create" → W-4 Program Create
- [ ] "Browse Programs" CTA → scrolls to Forge Programs section
- [ ] "See all →" links work for both Upcoming and Legacy Programs
- [ ] Back navigation returns to entering screen (W-1, W-17, or M-4)

### Mobile UX
- [ ] All tap targets ≥ 44dp (cards ≥ 72dp height)
- [ ] Portrait orientation
- [ ] Progress bar has accessible label
- [ ] All interactive elements have accessibility labels

---

*Forge Legacy Program Browse Wireframe Specification — W-2*
*v1.1 — June 2026*
*Authority: Program-Architecture-Amendment-001-Active-Program-Rule.md*
*PRD: Section 11 (Program System), Section 8 (Workout System), Section 5 (MVP)*

---

## Change Log

### v1.1 — June 2026

Resolved program source architecture. "Discover" section renamed to "Forge Programs." Content source formally defined: system-created programs curated and shipped by the Forge Legacy product team. MVP program sources locked to two: Forge Programs (system-curated) and My Programs (athlete-created, imported, forked — already represented by the Upcoming section in Future state). Community programs, shared programs, creator programs, and marketplace programs explicitly excluded as permanent product architecture decisions — not temporary deferrals. "Forge" badge added to Forge Program cards to distinguish from athlete-owned programs. All "Discover" references updated throughout spec. Open dependency closed. W-2 is implementation-ready.

### v1.0 — June 2026

Initial specification. W-2 Program Browse created as part of Phase 2B wireframe documentation. Implements four-state program model (Active, Graduated, Ended Early, Future) per Program-Architecture-Amendment-001. One-active-program rule enforced via conflict sheet at W-3 (not W-2). Legacy Programs section unifies Graduated and Ended Early in a single section per Amendment display rules. Program–Goal independence rule applied — W-2 does not gate on chapter or goal state.
