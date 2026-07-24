# Forge Legacy — Share Configuration Step Wireframe Specification
## SH-1 | Share Ecosystem | Version 1.0 — June 2026

**Status:** LOCKED
**Authority:** WSR-001-Workout-Share-Result-Architecture.md v1.0 (LOCKED) — Sections 4.2, 5.2, 6.5, 8.1–8.5, 9.1–9.3; Specification-Planning Report (June 2026) — approved decisions 1–7
**Implements:** Share configuration control surface named in WSR-001 § 8.3 and § 14 (Downstream Impact)
**Navigated from:** W-17 (Workout Summary), W-19 (Activity Detail), M-1 (Rank Up), M-2 (Honor Earned), M-3 (Goal Achieved), M-4 (Program Graduated), L-11 (Honor Detail)
**Navigates to:** Native OS share sheet (external); S-2 Check-ins section (internal, via WorkoutShare creation); returns to whichever screen or ceremony-sequence position triggered it

---

## Preamble: What SH-1 Is For

SH-1 is the control surface an athlete uses to review and adjust what will be shared and where, before anything leaves the app. It is not a new sharing capability — every behavior in this document is WSR-001's existing architecture, given a screen.

SH-1 answers: "What exactly am I about to share, and who will see it?"

It does not decide whether to share — the athlete already made that decision by tapping a "Share" action elsewhere. SH-1 exists so that decision is never blind: the athlete sees the actual card before it leaves the app, and controls every variable WSR-001 makes controllable (detail level, name, chapter context, "Forging since," squad destination, message).

---

## Section 1 — Goals

SH-1 exists to:
1. Show the athlete a live preview of what will be shared, at the detail level they choose
2. Let the athlete adjust the four WSR-001-defined content variables before sharing
3. Let the athlete choose squad destinations, if eligible
4. Hand off to the native OS share sheet and/or create squad check-in card(s) on a single explicit action
5. Never create a record, notify anyone, or leave the app until that explicit action

**What SH-1 does NOT do:**
- Decide what content is available at each detail level (governed by WSR-001 § 2.1, § 7.2 — fixed)
- Decide squad check-in card content or formatting (governed by WSR-001 § 6.3 — fixed, always Achievement level)
- Render the final share card image (delegated to the Share Card Renderer)
- Introduce any visibility tier, share type, or destination not already defined in WSR-001

---

## Section 2 — Entry Points

| Entry Point | Context | Pre-Selected `shareType` | Multi-Selection Required? |
|---|---|---|---|
| W-17 (Workout Summary) — "Share" CTA | Primary; athlete just finished a workout | `WORKOUT_COMPLETE` (default); does not duplicate a ceremony's specific type if one already fired | No |
| M-1 (Rank Up) — "Share this advancement" | Subordinate action below "Continue" | `RANK_UP` | No |
| M-2 (Honor Earned) — "Share this honor" | Subordinate action below "Continue" | `HONOR_EARNED` | Yes, if the session awarded more than one HonorInstance (§ 4.2 below) |
| M-3 (Goal Achieved) — "Share this achievement" | Subordinate action below "Continue" | `GOAL_ACHIEVED` | No |
| M-4 (Program Graduated) — "Share this graduation" | Subordinate action below "Continue" | `PROGRAM_GRADUATED` | No |
| W-19 (Activity Detail) — overflow (⋯) "Share" | Retrospective; any past session, no time limit | `WORKOUT_COMPLETE` (default); additional types available if that session also produced graduation/honors | No — additional type selection happens in W-19's overflow menu before SH-1 opens, not within SH-1 |
| L-11 (Honor Detail) — "Share this honor" | Retrospective; one specific honor | `HONOR_EARNED` for that specific HonorInstance | No — already scoped to one HonorInstance |

Per WSR-001 § 8.1.

---

## Section 3 — Inputs

SH-1 receives, at the moment it opens:
- `shareType` (pre-selected per Section 2)
- `sourceEntityType` / `sourceEntityId` — identifying the session, program instance, honor instance, goal, or rank event being shared (WSR-001 § 9.2)
- The athlete's current `AthleteShareSettings` record (§ 9.1): `globalVisibility`, `includeNameByDefault`, `includeChapterByDefault`, `defaultDetailLevel`
- The athlete's squad membership list (for the destination picker)
- For `HONOR_EARNED` with multiple honors: the list of `HonorInstance` records awarded in that session

---

## Section 4 — Wireframe

### 4.1 Standard Layout

```
──────────────────────────────── (handle bar)

  [Sheet title — see title table below]    ← 16sp, primary weight, centered

  ─────────────────────────────────────────────────────

  ┌─────────────────────────────────────────────────┐
  │                                                 │
  │            [ Share Card Preview ]                │  ← Live preview; rendered by
  │                                                 │     Share Card Renderer at
  │                                                 │     current detail level
  └─────────────────────────────────────────────────┘

  Detail Level
  ( Achievement )   ( Summary )   ( Detailed )       ← 3-option selector
                                                         Achievement pre-selected by default
                                                         (per AthleteShareSettings.defaultDetailLevel)

  ─────────────────────────────────────────────────────

  Include your name                            [ ON ]  ← default: includeNameByDefault
  Include chapter context                      [ ON ]  ← default: includeChapterByDefault
  Include "Forging since"                      [OFF ]  ← default: off (WSR-001 § 8.3 item 3)

  ─────────────────────────────────────────────────────

  Share to squad                               [OFF ]  ← row visible only if
                                                            globalVisibility = SQUAD_ONLY
  [ Squad picker — appears if athlete is in
    more than one squad, when toggle is ON ]
  [ Message (optional, ≤140 chars) — appears
    when toggle is ON ]

  Your squad will see the check-in summary.
  Exercise details appear in your external
  share only.                                       ← shown only when squad toggle is ON

  ─────────────────────────────────────────────────────

  [                  Share                  ]        ← Primary CTA

──────────────────────────────────────────────────
```

**Sheet title by `shareType`** — derived directly from each entry point's own copy (WSR-001 § 8.2), not new copy:

| `shareType` | Sheet Title |
|---|---|
| `WORKOUT_COMPLETE` | "Share Your Workout" |
| `RANK_UP` | "Share This Advancement" |
| `HONOR_EARNED` (single) | "Share This Honor" |
| `HONOR_EARNED` (multiple, pending selection) | "Which Honor Would You Like to Share?" (§ 4.2) |
| `GOAL_ACHIEVED` | "Share This Achievement" |
| `PROGRAM_GRADUATED` | "Share This Graduation" |

### 4.2 Multi-Honor Pre-Selection (HONOR_EARNED, Multiple Honors Only)

When the triggering session awarded more than one `HonorInstance` (M-2 entry point only — L-11 always arrives pre-scoped to a single honor), an additional section renders above the Preview, and the Preview itself opens in a placeholder state:

```
  Which honor would you like to share?

  ( ) Bench Press: 225 lbs
  ( ) 50 Workouts Logged
  ( ) Share all 2 honors in a list

  ─────────────────────────────────────────────────────

  ┌─────────────────────────────────────────────────┐
  │     Select an honor above to preview            │  ← Placeholder; replaces the
  │     your share.                                 │     live Preview until a
  │                                                 │     selection is made
  └─────────────────────────────────────────────────┘
```

- Single-select radio behavior: exactly one of the listed honors, or "Share all [N] honors in a list," is selected at any time
- Default selection: none pre-selected
- Only the Preview is gated on this selection. The Detail Level selector, the three content toggles, and the Destination section are interactive immediately and may be set before or after the honor selection — none of their values depend on which honor is chosen
- Selecting a single honor scopes the Preview, headline, and subheadline to that `HonorInstance` only; selecting "Share all" scopes them to a list of all honors from that session, per WSR-001 § 5.2 ("If multiple honors in one session, athlete selects one to feature or shares all in a list")
- The "Share" CTA remains disabled until a selection is made, regardless of how the other controls have been set (§ 8)
- This section does not appear for single-honor sessions, RANK_UP, GOAL_ACHIEVED, PROGRAM_GRADUATED, or WORKOUT_COMPLETE shares

---

## Section 5 — States

| State | Description |
|---|---|
| Initial | Pre-populated from `AthleteShareSettings` defaults and the entry point's pre-selected `shareType`; squad toggle hidden unless `globalVisibility = SQUAD_ONLY` |
| Multi-honor pending (M-2, multiple honors only) | Preview shows a placeholder ("Select an honor above to preview your share"); Detail Level selector, content toggles, and Destination section are fully interactive; "Share" CTA disabled (§ 4.2) |
| Live preview | Preview renders (or re-renders) immediately on any change to honor selection, detail level, or the three content toggles |
| Squad destination toggled | Squad picker and message field appear/disappear immediately as the squad toggle changes; squad picker omitted entirely if the athlete belongs to exactly one squad (squad is implied) |
| Submitting | Tapping "Share" creates the `WorkoutShare` record, opens the native OS share sheet, and creates check-in card(s) if a squad destination was selected — all in the same action (WSR-001 § 8.3, § 6.5 steps 6–8) |
| Dismissed | Sheet closes immediately, no confirmation, no record created |

---

## Section 6 — Navigation

### 6.1 Presentation Model

SH-1 presents as a full-height bottom sheet over whatever screen is current at the moment of presentation, with a drag handle, consistent with this project's existing bottom-sheet pattern (e.g., the P-1.1 Type Picker, the W-9 Persistence Choice sheet).

### 6.2 Navigation Model by Entry Point

SH-1 is not owned by, or nested in, any single ecosystem's navigation stack. For all 7 entry points, SH-1 presents on top of wherever the athlete already is, and returns to that same place on close.

**For the 4 ceremony entry points (M-1–M-4):** tapping the "Share this [X]" action is treated identically to tapping "Continue" for ceremony-sequence purposes — the ceremony modal dismisses immediately and the existing ceremony sequence (M-1 → M-3 → M-4 → M-2 priority order, per WSR-001 § 8.2) advances exactly as it would have. SH-1 then presents on top of whatever that advancement reveals (the next ceremony in the queue, or W-17 if the sequence is complete). The ceremony sequence does not pause or wait for SH-1 to close — it has already advanced by the time SH-1 is visible.

**For W-17, W-19, and L-11:** SH-1 presents directly over the current screen; no ceremony sequence is involved.

### 6.3 Dismissal Behavior

On dismissal (Cancel or drag-to-close), SH-1 simply closes and reveals whatever is already underneath:
- For M-1–M-4 origins: the ceremony-sequence position already reached when Share was tapped (§ 6.2) — the next ceremony in the queue, or W-17 if the sequence completed
- For W-17, W-19, L-11 origins: that same screen, unchanged

No additional confirmation or destination logic exists beyond this.

### 6.4 Cancel Behavior

Dismissing SH-1 before tapping "Share" — by drag, by a Cancel/✕ control, or by tapping outside the sheet — closes it immediately with no confirmation dialog. No `WorkoutShare` record exists at this point; there is nothing to discard.

---

## Section 7 — Accessibility

- Sheet announced on open using the title from § 4.1's table
- Multi-honor radio list (§ 4.2, when present): each row `accessibilityLabel` = "[Honor Name] — tap to select"; "Share all" row `accessibilityLabel` = "Share all [N] honors in a list — tap to select"; `accessibilityValue` = "selected" / "not selected"
- Preview placeholder (§ 4.2, pending state): `accessibilityLabel` = "Select an honor above to preview your share"
- Detail level selector: `accessibilityLabel` = "Detail level: [Achievement/Summary/Detailed]. Double-tap to change."
- Each content toggle: `accessibilityLabel` = "[Toggle name]. On." / "[Toggle name]. Off." with `accessibilityHint` = "Double-tap to toggle"
- Squad toggle (when visible): `accessibilityLabel` = "Share to squad. On." / "Off." Squad picker and message field, when visible, are included in the accessibility tree in their rendered order
- Preview (live state): `accessibilityLabel` = "Share card preview"
- "Share" CTA: `accessibilityLabel` = "Share"; when disabled pending honor selection, `accessibilityHint` = "Select an honor above to continue"
- Drag handle / dismiss: `accessibilityLabel` = "Dismiss without sharing"

---

## Section 8 — Validation

| Rule | Enforcement |
|---|---|
| Squad message field | Optional; max 140 characters; input blocked at 140; consistent with WSR-001 § 6.5 step 4 and § 8.3 |
| Multi-honor selection (M-2, multiple honors only) | "Share" CTA disabled until exactly one honor or "Share all" is selected (§ 4.2); this is the only control gated by the selection — Detail Level, toggles, and Destination remain usable beforehand |
| Detail level | Always exactly one of the three selected; Achievement pre-selected; no "none selected" state |
| Content toggles | No validation — boolean, always in a defined on/off state |
| Squad destination | No validation beyond the 140-char message cap; squad toggle and picker are fully optional |
| "Share" CTA (no multi-honor case) | Always enabled — WSR-001 does not define any condition under which sharing is blocked once SH-1 has opened |

---

## Section 9 — Data Contract

On "Share" tap, SH-1 produces one `WorkoutShare` record with an embedded `ShareContent` snapshot, per WSR-001 § 9.2–§ 9.3 verbatim:

```
WorkoutShare {
  id:                   uuid
  athleteId:            uuid
  shareType:            'WORKOUT_COMPLETE' | 'PROGRAM_GRADUATED' | 'HONOR_EARNED'
                        | 'GOAL_ACHIEVED' | 'RANK_UP'
  sourceEntityType:     'WORKOUT_SESSION' | 'PROGRAM_INSTANCE' | 'HONOR_INSTANCE'
                        | 'GOAL' | 'RANK_EVENT'
  sourceEntityId:       uuid
  destinations:         ShareDestination[]
  visibility:           'PRIVATE' | 'SQUAD_ONLY' | 'UNLISTED' | 'PUBLIC'
  detailLevel:          'ACHIEVEMENT' | 'SUMMARY' | 'DETAILED'
  content:              ShareContent
  squadIds:             uuid[]
  athleteMessage:       string | null
  checkInExpiresAt:     timestamp | null
  externalSharedAt:     timestamp | null
  shareLink:            string | null
  createdAt:            timestamp
}

ShareDestination: 'EXTERNAL' | 'SQUAD_NOTIFICATION' | 'PUBLIC_LINK'
```

**Field-write behavior specific to SH-1:**
- `visibility` is set from `AthleteShareSettings.globalVisibility` at the moment "Share" is tapped. The squad toggle in § 4.1 does NOT write to this field.
- `destinations` is built from the athlete's choices in SH-1: `EXTERNAL` is always included (the native share sheet is always invoked); `SQUAD_NOTIFICATION` is included only if the squad toggle was on and at least one squad was selected. `PUBLIC_LINK` is never included (Post-MVP, WSR-001 § 3.3).
- `detailLevel` is the athlete's selection in § 4.1, defaulting to `AthleteShareSettings.defaultDetailLevel`.
- `squadIds` is the set of squads selected in the destination picker; empty array if the squad toggle was off.
- `checkInExpiresAt` is set to 48 hours from `createdAt` if and only if `squadIds` is non-empty (WSR-001 § 9.2, § 6.2).
- `externalSharedAt` is set when the native OS share sheet opens (WSR-001 § 9.2 field comment).
- `createdAt` is always the moment "Share" is tapped in SH-1 — never backdated to the source session's date. This applies identically to real-time shares and to W-19's no-time-limit retrospective shares (WSR-001 § 8.5, § 9.3: "`ShareContent.date` is the date of the share action, not necessarily the date of the source workout").

`ShareContent` is generated per the type-specific mapping in WSR-001 § 5.2, scoped (for HONOR_EARNED) to the single honor or full list selected in § 4.2:

```
ShareContent {
  detailLevel:      'ACHIEVEMENT' | 'SUMMARY' | 'DETAILED'
  headline:         string
  subheadline:      string | null
  contextLine:      string | null
  highlights:       ShareHighlight[]
  exerciseData:     ShareExercise[] | null
  athleteName:      string | null
  forgingSince:     string | null
  date:             date
  appAttribution:   'Forge Legacy'
}
```

The squad check-in card created alongside (if applicable) is NOT rendered by SH-1 or the Share Card Renderer — it is a native S-2 list row generated from the same `WorkoutShare` record, always at Achievement-level text, per WSR-001 § 6.3's fixed 5-type format table. SH-1's only relationship to the squad card is creating the `WorkoutShare` record that S-2 reads.

---

## Section 10 — Non-Behaviors

This screen does not and will not include the following:
- No draft or save state — nothing persists until "Share" is tapped (§ 6.4)
- No confirmation dialog on cancel or dismissal
- No editing of an already-created `WorkoutShare` record after the fact (WSR-D5 — content is an immutable snapshot)
- No visibility selector beyond what § 9 defines — the athlete does not choose PRIVATE/SQUAD_ONLY/PUBLIC directly in SH-1; only the squad toggle is exposed, consistent with WSR-001 § 8.3's described controls
- No PUBLIC visibility tier handling of any kind — PUBLIC is explicitly Post-MVP (WSR-001 § 4.1); SH-1's squad toggle logic only distinguishes PRIVATE from SQUAD_ONLY
- No public link or recap-page generation (WSR-001 § 3.3, § 7.3 — Post-MVP)
- No arbitrary multi-select of honors — only "one" or "all," per WSR-001 § 5.2 (§ 4.2)
- No comment field, reaction surface, or any squad-side interaction (those belong to S-2, not SH-1)
- No rendering of the final share card image — delegated entirely to the Share Card Renderer
- No new share types, detail levels, or destinations beyond what WSR-001 § 3, § 5, § 9 already define

---

## Section 11 — Architecture Decisions

| Decision ID | Decision |
|---|---|
| **SH1-D1 — Screen code** | This step is assigned the cross-cutting screen code SH-1, not nested under any single ecosystem, per the Specification-Planning Report (June 2026), Section 1. |
| **SH1-D2 — Presentation model** | Full-height bottom sheet with drag handle, consistent with existing in-app configuration-sheet precedent. Per Specification-Planning Report, Section 2, Decision 3, Option A. |
| **SH1-D3 — Navigation model** | SH-1 is not nested in any ecosystem's stack; it presents over the current context and returns to it on close, for all 7 entry points. Per Specification-Planning Report, Section 2, Decision 2, Option A. |
| **SH1-D4 — Cancel behavior** | Direct dismissal, no confirmation; no record created before "Share" is tapped. Per Specification-Planning Report, Section 2, Decision 4, Option A. |
| **SH1-D5 — Dismissal/ceremony-chain behavior** | Opening SH-1 from a ceremony's "Share this [X]" action is equivalent, for ceremony-sequence purposes, to tapping "Continue" — the sequence advances at the moment Share is tapped, and SH-1 presents over whatever the sequence now reveals. Per Specification-Planning Report, Section 2, Decision 5, Option A. |
| **SH1-D6 — Visibility-write behavior** | The squad toggle controls `destinations[]` only; `WorkoutShare.visibility` is always written from `AthleteShareSettings.globalVisibility` at creation time. Per Specification-Planning Report, Section 2, Decision 6, Option A. |
| **SH1-D7 — Multi-honor selection** | Single-select radio list of earned honors plus a "Share all" option; no arbitrary subset selection; only the Preview (not the other controls) is gated on this selection. Per Specification-Planning Report, Section 2, Decision 7, Option A, refined during lock-pass review to scope the gating to the Preview only. |

---

## Section 12 — Validation Checklist

### Entry & Inputs
- [ ] SH-1 reachable from all 7 entry points: W-17, M-1, M-2, M-3, M-4, W-19, L-11
- [ ] Pre-selected `shareType` correct for each entry point (§ 2 table)
- [ ] `AthleteShareSettings` defaults correctly pre-populate detail level and content toggles
- [ ] Sheet title matches § 4.1's title table for each `shareType`

### Multi-Honor (M-2 only)
- [ ] Multi-honor section appears only when the session awarded more than one honor
- [ ] Preview shows the placeholder state until a selection is made; other controls remain interactive
- [ ] Exactly one honor, or "Share all," must be selected before the "Share" CTA enables
- [ ] "Share" CTA disabled until that selection is made, regardless of other control state

### Wireframe & Controls
- [ ] Preview present and updates live on any toggle/selector/honor-selection change
- [ ] Detail level selector: 3 options, Achievement default
- [ ] 3 content toggles present with correct defaults (name ON, chapter ON, Forging since OFF)
- [ ] Squad toggle visible only when `globalVisibility = SQUAD_ONLY`
- [ ] Squad picker appears only when toggle ON and athlete is in more than one squad
- [ ] Message field appears only when squad toggle ON; capped at 140 characters
- [ ] Disclosure copy ("Your squad will see the check-in summary...") shown only when squad toggle ON

### Navigation
- [ ] Presents as full-height bottom sheet over current context for all 7 entry points
- [ ] Ceremony entry points: Share-tap advances the ceremony sequence exactly as Continue would, before SH-1 presents
- [ ] Dismissal returns to the post-advancement ceremony position (M-series origins) or the unchanged originating screen (W-17/W-19/L-11)
- [ ] Cancel/dismiss requires no confirmation and creates no record

### Data Contract
- [ ] `WorkoutShare` record created only on "Share" tap, never on dismissal
- [ ] `visibility` written from `globalVisibility`, never from the squad toggle directly
- [ ] `destinations` includes `EXTERNAL` always; `SQUAD_NOTIFICATION` only if squad toggle ON with ≥1 squad selected
- [ ] `checkInExpiresAt` set only when `squadIds` is non-empty
- [ ] `createdAt`/`ShareContent.date` always reflect the share-action moment, never the source session's date
- [ ] `ShareContent` scoped correctly for multi-honor "one" vs. "all" selection

### Non-Behaviors
- [ ] No draft/save state
- [ ] No confirmation dialog on cancel
- [ ] No editing of a created WorkoutShare
- [ ] No visibility tier selector beyond the squad toggle (no PUBLIC handling)
- [ ] No public link/recap generation
- [ ] No arbitrary multi-select of honors

---

## Section 13 — Lock Recommendation

**LOCKED.**

A lock-pass review verified: (1) every behavior in this document traces to WSR-001 or an approved Specification-Planning Report decision; (2) no new sharing capability was introduced; (3) one omission (the `createdAt`/`ShareContent.date` share-action-time rule) was found and corrected during authoring; (4) navigation is internally consistent across all 7 entry points, with the ceremony-chain sequencing in § 6.2–6.3 resolving cleanly; (5) the data contract reproduces `WorkoutShare`/`ShareContent` verbatim with no field added or altered.

A focused follow-up review additionally narrowed the multi-honor gating (§ 4.2, § 5, § 8) to the Preview only rather than the full control set, and added an explicit PUBLIC-tier exclusion to Non-Behaviors (§ 10) — both wording/UX-level refinements, not architecture changes. No further issues found. Approved for LOCKED status.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | June 2026 | Initial specification. Authored from WSR-001-Workout-Share-Result-Architecture.md (Sections 4.2, 5.2, 6.5, 8.1–8.5, 9.1–9.3) and the approved Specification-Planning Report decisions (1–7). Establishes SH-1 as the cross-cutting Share Configuration Step screen, reachable from all 7 WSR-001 entry points. Lock-pass review narrowed multi-honor gating to the Preview only and added the PUBLIC-tier exclusion to Non-Behaviors. No new sharing capability introduced; no WSR-001 behavior altered. Locked. |

---

*Forge Legacy Share Configuration Step Wireframe Specification — SH-1*
*v1.0 — June 2026*
*Authority: WSR-001-Workout-Share-Result-Architecture.md v1.0 (LOCKED); Specification-Planning Report (June 2026, approved)*
*Status: LOCKED*
