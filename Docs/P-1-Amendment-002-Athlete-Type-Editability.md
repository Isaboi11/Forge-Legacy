# P-1 Amendment 002 — Athlete Type Editability
## Amendment to Profile Wireframe Spec (P-1)
### June 2026

**Status:** LOCKED v1.0

**Type:** Screen Specification Amendment

**Date:** June 2026

**Amends:** Profile-Wireframe-Spec-P1.md v1.0 (LOCKED)

**Amendment Triggers:**
- O-2-Amendment-001-Athlete-Type-Declaration.md v1.0 (LOCKED) — Section 9: "P-1 requires a follow-up amendment to add the athlete type field (editable)."
- Rank-Calibration-Decisions.md v1.0 Q8 (LOCKED) — "P-1 Profile screen: Add athlete type field, editable. Show current type. On change: trigger improvement re-evaluation job."

**Authority Chain:**
- O-2-Amendment-001-Athlete-Type-Declaration.md v1.0 (LOCKED — athlete type taxonomy, behavioral decisions, type change policy)
- Rank-Calibration-Decisions.md v1.0 Q8 (LOCKED — re-attribution policy, data model)
- Rank-Computation-Model.md Sessions 1–5 (LOCKED — Personal Improvement evaluation model)
- Profile-Wireframe-Spec-P1.md v1.0 (LOCKED — amended by this document)
- P-2-Progress-Hub-Spec.md v1.0 (LOCKED — P-2.2 downstream surface for Personal Improvement signal)

**Downstream Dependents:**
- Rank Evaluation Service (re-evaluation job trigger on type change)
- P-2.2 Rank Journey Detail (Personal Improvement signal parenthetical updates to reflect new type; evaluation result updates after re-attribution completes)

**Amendment Log:** v1.0 June 2026. Locked. OQ-A002-1: Option A — P-2.2 Updating state confirmed. OQ-A002-2: Option B — Edit Profile screen assigned canonical code P-1.1 Edit Profile. OQ-A002-3: Option A — no notification on re-evaluation completion.

---

## Section 1 — Amendment Summary

Q8 (Rank-Calibration-Decisions.md, LOCKED) establishes that athlete type is editable via P-1 Profile at any time. O-2-Amendment-001 (LOCKED) formalizes this requirement and defines the type change policy: non-destructive, async re-attribution, `typeHistory` log. This amendment implements that editability within the P-1.1 Edit Profile surface.

P-1 v1.0 contains three pre-existing issues resolved by this amendment:

1. **Stale type list.** P-1 v1.0 Sections 4.4 and 6.2 list seven athlete types (Strength, Bodybuilding, Hybrid, Running, Cycling, Combat, General). O-2-Amendment-001 locks four types: Strength, Bodybuilding, Endurance, Hybrid. This amendment updates all P-1 references to the locked four-type set.

2. **Edit surface naming inconsistency.** P-1 v1.0 refers to the edit surface as "P-2 Edit Profile." P-2 is the Progress Hub — not the edit surface. O-2-Amendment-001 corrected this to "P-1 Edit Profile." This amendment assigns the canonical screen code P-1.1 Edit Profile (per A002-D9) and updates all affected P-1 references accordingly.

3. **No defined edit flow for athlete type.** P-1 v1.0 states athlete type is editable via Edit Profile but does not define the interaction, selection UI, confirmation, re-evaluation trigger, or resulting states. This amendment defines all of these.

**This amendment establishes:**
- Athlete type field placement within P-1.1 Edit Profile
- Type picker interaction and UI
- Confirmation behavior
- Immediate P-1 Identity Header update
- Re-evaluation trigger and async handling
- Loading, completion, and failure states
- Corrections to stale P-1 v1.0 references

---

## Section 2 — What This Amendment Changes

| P-1 Section | Change |
|---|---|
| Section 4.4 — Athlete Type (Identity Header) | Correct type list from seven to four (Strength, Bodybuilding, Endurance, Hybrid); correct "Editable in P-2 Edit Profile" → "Editable via P-1.1 Edit Profile" |
| Section 6.2 — Available Types table | Replace seven-row table with four-row table reflecting locked types |
| Section 6.4 — Editing Athlete Type | Replace "Via P-2 Edit Profile" with full edit flow description referencing this amendment |
| Section 10.1 — Editable Fields table | Correct athlete type row: edit path from "P-2 Edit Profile" to "P-1.1 Edit Profile"; update notes to reference O-2 Amendment 001 |
| Section 10.5 — Editable vs. Earned Distinction | Correct "Running" type example to "Endurance" |
| Section 13.2 — Navigation Stack | Correct "P-2 Edit Profile" → "P-1.1 Edit Profile" |
| Section 14 — Validation Checklist | Correct athlete type editability checklist item; add type change flow checklist items |
| New: P-1.1 Edit Profile — Athlete Type Section | Full specification of the edit interaction, selection UI, confirmation, re-evaluation states |

---

## Section 3 — What This Amendment Does Not Change

- P-1 modal presentation and navigation model — unaffected
- Identity Header layout and information hierarchy — athlete type display is unchanged; only the edit path and type set change
- P-1.1 Edit Profile fields for display name, profile photo, username — unaffected
- Rank display, honors, accomplishments, chapter card — unaffected
- Settings entry point — unaffected
- P-1 emotional arc — unchanged; identity screen framing unaffected
- Rank promotion logic — no rank architecture is modified
- Personal Improvement evaluation rules — the architecture is unchanged; this amendment wires the trigger, not the evaluation logic
- Athlete type taxonomy — four locked types are unchanged from O-2-Amendment-001

---

## Section 4 — P-1.1 Edit Profile: Athlete Type Field

### 4.1 Context: The P-1.1 Edit Profile Surface

P-1.1 Edit Profile is the canonical screen code (per A002-D9) for the edit surface accessible from P-1 via the "Edit Profile" CTA in the Identity Header and via the profile photo tap. It is not a separate tab root or a new modal — it is a navigation push within the existing Profile modal context. Back navigation from P-1.1 returns to P-1 within the same modal session.

The navigation title visible to athletes is "Edit Profile." P-1.1 is the spec reference code; it does not appear in the athlete-facing UI.

P-1 v1.0 refers to this screen as "P-2 Edit Profile." This amendment corrects all references. All corrected P-1 sections use "P-1.1 Edit Profile" for spec references.

### 4.2 Field Placement

The athlete type field appears in P-1.1 Edit Profile as a labeled row, positioned in the profile identity field group. The field order within P-1.1 Edit Profile is:

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  ‹ Edit Profile                    [P-1.1 Edit Profile] │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  PHOTO                                                  │
│  [Profile photo — 60dp circle]  [Change Photo]   →      │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Display Name                    [13sp, muted label]    │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Isaiah Altamirano                               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Athlete Type                    [13sp, muted label]    │
│  Strength                                         →     │  ← tappable row
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  (Username — per Identity Amendment 001)                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Athlete Type row:**
- Section label: "Athlete Type" — 13sp, muted, above the row (matches Display Name label treatment)
- Current type displayed as the row value — 15sp, primary text (e.g., "Strength")
- [→] arrow affordance — the full row is tappable
- Row minimum height: 52dp

**Placement rationale:** Athlete type is an identity declaration, not a utility setting. It belongs in the profile identity field group alongside display name — not in a settings section or an advanced options area. Placing it directly below display name communicates that it is in the same class as the athlete's name: who they are, not how they configure the app.

### 4.3 Edit Interaction: Type Picker Bottom Sheet

Tapping the Athlete Type row opens the Type Picker as a bottom sheet within the Profile modal context. The bottom sheet overlays the P-1.1 Edit Profile screen without dismissing it.

```
──────────────────────────────── (handle bar)

  Change Athlete Type    [14sp, primary weight, centered]

  ─────────────────────────────────────────────────────

  ┌────────────────────┐   ┌────────────────────┐
  │                    │   │                    │
  │     Strength       │   │   Bodybuilding     │  ← current selection: ring/filled state
  │                    │   │                    │
  └────────────────────┘   └────────────────────┘

  ┌────────────────────┐   ┌────────────────────┐
  │                    │   │                    │
  │    Endurance       │   │     Hybrid         │
  │                    │   │                    │
  └────────────────────┘   └────────────────────┘

  [  Save  ]                   ← Primary CTA, 52dp — enabled when selection differs from current
  [  Cancel  ]                 ← Tertiary text link

──────────────────────────────────────────────────
```

**Type Picker behavior:**

| State | Description |
|---|---|
| Sheet opens | Current athlete type tile is shown in selected state (distinct visual treatment — filled border or background tint). All other tiles in unselected state. |
| Tile tap (different type) | Tapped tile enters selected state. Previously selected tile returns to unselected. "Save" button activates (primary style). One tile is always selected at all times. |
| Tile tap (current type) | No change. The tile is already selected. "Save" remains disabled. |
| "Save" tap | Sheet dismisses. Type change applied. Re-evaluation job fires. See Section 5. |
| "Cancel" tap | Sheet dismisses. No change. Athlete returns to P-1.1 Edit Profile. Current type unchanged. |
| Drag down on handle bar | Sheet dismisses. No change. Treated as cancel. |

**Tile layout and labels:** 2×2 grid. Strength | Bodybuilding | Endurance | Hybrid — identical labels to O-2b. Same 88dp minimum tile height. The tile labels are the primary content; reference descriptors are not included in the Type Picker (no subtitle text below tile labels). The athlete has already been through onboarding — the picker is a change action, not an introduction.

**Why bottom sheet, not full-screen:**
P-1.1 Edit Profile is already within a pushed navigation context inside the P-1 modal. A full-screen push for a four-tile selection would create three levels of navigation depth (P-1 modal → P-1.1 Edit Profile → Type Selection) that is disproportionate for a single-field change. A bottom sheet allows the type change to feel like an in-place action on P-1.1, not a separate screen.

**Why "Save" confirmation:**
A type change triggers an async re-evaluation job that processes the athlete's full session history. An accidental tile tap followed by an accidental sheet dismissal could fire unnecessary re-evaluation. The Save/Cancel structure means only deliberate "Save" actions trigger the job. It also mirrors the standard edit/confirm pattern expected for profile changes.

**Why no confirmation alert ("Are you sure?"):**
The Save button is the confirmation. A secondary "Are you sure?" alert would add an unnecessary layer of friction for a change the athlete has already deliberately navigated to. The type change is non-destructive (O-2-Amendment-001, A001-D9) — there is no risk of data loss that would warrant a warning dialog.

### 4.4 Selected State Indicator

The currently active athlete type tile in the picker renders with a distinct selected state. Recommended implementation: filled accent-color border on the tile container. The selected state must be distinguishable from unselected at a glance — it is not a subtle change.

The tile that was selected when the sheet opened (the current active type) is the only tile that shows the pre-selected state on open. After the athlete taps a different tile, the new tile shows selected. If the athlete taps back to their original tile, the original shows selected again.

**Accessibility:** The selected tile has `accessibilityValue = "selected"`. All other tiles have `accessibilityValue = "not selected"`. The Save button state is communicated: `accessibilityLabel` = "Save athlete type change" when enabled; `accessibilityHint` = "Disabled — select a different type to save" when disabled.

### 4.5 Immediate Profile Update on Save

When the athlete taps "Save":

1. The Type Picker sheet dismisses immediately.
2. The Athlete Type row in P-1.1 Edit Profile updates to show the new type label.
3. The Identity Header on P-1 (visible when the athlete navigates back to P-1) reflects the new type immediately.
4. The async re-evaluation job is queued (see Section 5).
5. A confirmation toast appears (see Section 5.2).

**The athlete does not wait for re-evaluation before seeing the type change reflected.** The update is immediate from the athlete's perspective. The re-evaluation is a background process.

---

## Section 5 — Re-evaluation States

### 5.1 Re-evaluation Job

When "Save" is tapped in the Type Picker, the following occurs:

```
Save tapped
    ↓
athlete.athleteType = [new type]                      (synchronous — immediate)
athlete.typeHistory.append({ type, effectiveDate })   (synchronous — immediate)
    ↓
P-1 Identity Header updates immediately               (synchronous — UI)
P-1.1 Edit Profile athlete type row updates immediately  (synchronous — UI)
    ↓
RankEvaluationService.queueReattribution(athleteId)   (asynchronous — background)
    ↓
Toast notification shown                              (synchronous — UI)
```

The re-attribution job runs against the athlete's full session history using the new type's evaluation logic. Duration varies by session history length. For athletes with extensive imported histories, the job may take several seconds.

### 5.2 Toast Notification (Confirmation)

Immediately after Save, a toast appears:

```
"[New Type] saved. Your development signals are being updated."
```

Examples:
- "Bodybuilding saved. Your development signals are being updated."
- "Endurance saved. Your development signals are being updated."

**Toast behavior:**
- Appears at the bottom of the screen (above the safe area), consistent with app-wide toast positioning
- Auto-dismisses after 4 seconds — no action required from the athlete
- Not an alert, not a modal — fully non-blocking
- Does not repeat or persist

**Why this copy:**
"[New Type] saved" confirms the action completed. "Your development signals are being updated" sets the expectation that P-2.2's Personal Improvement signal may reflect a brief recalculation period without explaining the mechanism. The athlete is informed without being given implementation details.

### 5.3 Loading State in P-2.2 (During Re-evaluation)

While re-evaluation is in progress, the Personal Improvement Category Signal in P-2.2 Rank Journey Detail reflects a recalculating state:

```
  Personal Improvement (Bodybuilding)              ⟳ Updating
  Your development signals are being recalculated
```

**Behavior:**
- The `⟳ Updating` indicator replaces the ✓ / ◑ / ○ status indicator
- The type label in parentheses already shows the new type (read from `athlete.athleteType`, which is updated immediately)
- The supporting copy changes to "Your development signals are being recalculated" for the duration of re-evaluation
- When re-evaluation completes, the indicator and copy revert to their normal state (✓ / ◑ / ○ with appropriate copy)
- The re-evaluation state does not affect any other Category Signal rows — only Personal Improvement

**The athlete remains fully functional while re-evaluation runs.** All other P-2 content, workout logging, program participation, and the full app are unaffected. The Updating state is informational only — it does not block any action.

**Implementation note:** The `athlete.reattributionInProgress: boolean` flag drives this state in P-2.2. Set to `true` when the re-evaluation job is queued; set to `false` when the job completes (success or final-retry failure). This flag is separate from `athlete.athleteType` — the type is already updated; only the evaluation result is pending.

### 5.4 Completion State

When the re-evaluation job completes:

- `athlete.reattributionInProgress` is set to `false`
- P-2.2 Personal Improvement signal returns to its normal state (✓ / ◑ / ○) reflecting the re-attributed results
- No notification is sent to the athlete — the updated state is visible on next P-2.2 open
- The type label in parentheses remains unchanged (already showed the new type during re-evaluation)

No banner, toast, or push notification fires on re-evaluation completion. The athlete who returns to P-2.2 sees the updated results without an announcement.

### 5.5 Failure State

If the re-evaluation job fails (network error, service unavailability, or transient infrastructure issue):

- The job retries silently using exponential backoff (engineering implementation detail — not exposed to the athlete)
- `athlete.reattributionInProgress` remains `true` until the retry succeeds
- P-2.2 continues to show the Updating state until a retry completes
- The athlete type change (`athlete.athleteType`) is NOT rolled back — the type is already correct; only the evaluation result is pending
- If all retries are exhausted (engineering-defined threshold): `athlete.reattributionInProgress` is set to `false` and the previous evaluation result is shown until a re-evaluation can be triggered (e.g., on next app open or session save). No error is shown to the athlete.

**Rationale:** A re-evaluation job failure is an infrastructure concern, not a product failure from the athlete's perspective. The athlete's type change is correct and committed. The evaluation result will catch up when the service recovers. Surfacing an error for a background process the athlete is not aware of would introduce confusion and anxiety without providing any actionable resolution.

---

## Section 6 — P-1 Identity Header After Type Change

### 6.1 Immediate Display

After a type change is saved:
- The Athlete Type line in the Identity Header reflects the new type label immediately on next P-1 open
- If the athlete navigates back from P-1.1 Edit Profile to P-1 within the same modal session, the updated type is shown immediately — there is no delay between saving in P-1.1 and seeing the change on P-1
- No visual indicator on P-1 signals that re-evaluation is in progress — the type is updated; P-1 is not a re-evaluation surface

### 6.2 Type Label Display Format

The athlete type is displayed verbatim — using the tile label from the Type Picker:
- "Strength"
- "Bodybuilding"
- "Endurance"
- "Hybrid"

No qualifying copy is added to the header. No indicator that the type was recently changed. The header shows current state, not history.

### 6.3 P-2.2 Parenthetical Update

The Personal Improvement signal in P-2.2 reads `athlete.athleteType` for the type label in parentheses. Since `athlete.athleteType` is updated immediately on Save, the parenthetical reflects the new type immediately on next P-2.2 open — even while re-evaluation is still in progress. The distinction: the type label updates immediately; the evaluation result (✓ / ◑ / ○) updates when re-evaluation completes.

An athlete who changes from Strength to Bodybuilding and then immediately opens P-2.2 sees:
```
Personal Improvement (Bodybuilding)    ⟳ Updating
Your development signals are being recalculated
```

Not:
```
Personal Improvement (Strength)    ◑ Developing
```

The parenthetical is always current. The evaluation status may be stale during re-evaluation.

---

## Section 7 — Corrections to P-1 v1.0 References

The following replaces or corrects existing P-1 v1.0 content. All other P-1 v1.0 content is unchanged.

### 7.1 Section 4.4 — Athlete Type (Corrected)

**Replaces P-1 v1.0 Section 4.4:**

- 14sp, secondary text color, centered
- Self-declared during onboarding (O-2b): Strength, Bodybuilding, Endurance, Hybrid
- Editable via P-1.1 Edit Profile at any time
- If not set (should not occur post-onboarding): field is absent. No placeholder.

**Why athlete type appears in the header:** [unchanged from P-1 v1.0]

### 7.2 Section 6.2 — Available Types Table (Corrected)

**Replaces P-1 v1.0 Section 6.2 table:**

| Type | Meaning | Personal Improvement Signal |
|---|---|---|
| Strength | Intensity-focused resistance training — powerlifting, Olympic lifting, max-effort compound work | Intensity personal best (1RM-equivalent weight on primary exercise) |
| Bodybuilding | Volume-focused resistance training — hypertrophy, physique development, progressive overload | Volume personal best (session total load on primary exercise: sets × reps × weight) |
| Endurance | Aerobic output-focused training — running, cycling, rowing, and all cardio-based disciplines | Pace or distance personal best across any endurance activity |
| Hybrid | Multi-modality or general fitness — cross-training, multiple disciplines, or no primary focus | Any personal best in any actively trained modality (OR logic) |

**The Personal Improvement Signal column is informational.** It communicates what the system tracks per type — not a fact surfaced directly to athletes on P-1. It is present here for implementation completeness. Athletes see the resulting status (✓ / ◑ / ○) in P-2.2, not the signal definition.

### 7.3 Section 6.4 — Editing Athlete Type (Replaced)

**Replaces P-1 v1.0 Section 6.4:**

Athlete type is editable via P-1.1 Edit Profile at any time (tap "Edit Profile" on P-1, then tap the Athlete Type row). See P-1-Amendment-002 for the complete edit flow, confirmation behavior, and re-evaluation states.

**Key behaviors (non-destructive per O-2-Amendment-001):**
- Type changes take effect immediately on the athlete's profile
- Historical session data is re-attributed to the new type; no data is deleted
- Rank promotions already earned are not affected
- Re-evaluation runs asynchronously in the background

### 7.4 Section 10.1 — Editable Fields Table (Row Updated)

**Replaces the Athlete Type row in P-1 v1.0 Section 10.1 table:**

| Field | Edit Path | Notes |
|---|---|---|
| Athlete type | P-1.1 Edit Profile — Athlete Type row → Type Picker bottom sheet | Set during onboarding (O-2b); changeable at any time; type change triggers async Personal Improvement re-attribution (O-2-Amendment-001) |

All other rows in Section 10.1 are unchanged.

### 7.5 Section 10.5 — Editable vs. Earned Distinction (Example Updated)

**Replaces one sentence in P-1 v1.0 Section 10.5:**

Original: "The athlete who switches from 'Running' to 'Strength' after a career pivot should be able to update their type."

Corrected: "The athlete who switches from 'Endurance' to 'Strength' after shifting their primary training focus should be able to update their type."

All other content in Section 10.5 is unchanged.

### 7.6 Section 13.2 — Navigation Stack (Corrected)

**Replaces the Edit Profile row in P-1 v1.0 Section 13.2 table:**

| Screen | Navigation |
|---|---|
| P-1.1 Edit Profile | Pushes onto P-1 modal navigation stack |

All other rows in Section 13.2 are unchanged.

---

## Section 8 — Accessibility

### 8.1 P-1.1 Edit Profile — Athlete Type Row

- `accessibilityLabel` = "Athlete Type: [current type]. Double-tap to change."
- `accessibilityHint` = "Opens a type picker."
- Row is a focusable, activatable element — not a display-only row

### 8.2 Type Picker Bottom Sheet

- Sheet title: announced as "Change Athlete Type" when sheet opens
- Each tile: `accessibilityLabel` = "[Type] — [descriptor]"
  - "Strength — intensity-focused resistance training"
  - "Bodybuilding — volume-focused resistance training"
  - "Endurance — running, cycling, and cardio-based sports"
  - "Hybrid — multiple disciplines or general fitness"
- Each tile: `accessibilityValue` = "selected" (current selection) or "not selected"
- "Save" button: `accessibilityLabel` = "Save athlete type change" (enabled) / `accessibilityHint` = "Select a different type to save" (disabled)
- "Cancel" link: `accessibilityLabel` = "Cancel, keep current athlete type"
- Handle bar: `accessibilityLabel` = "Dismiss without saving"

### 8.3 Toast Notification

- Toast is announced by screen reader when it appears: "[New Type] saved. Your development signals are being updated."
- Toast does not require interaction — it auto-dismisses after 4 seconds

### 8.4 P-2.2 Updating State

- Personal Improvement row in Updating state: announced as "Personal Improvement ([New Type]): Updating. Your development signals are being recalculated."
- `accessibilityValue` = "Updating" (replaces the ✓ / ◑ / ○ value during re-evaluation)

---

## Section 9 — Architecture Decisions

| Decision ID | Decision |
|---|---|
| **A002-D1 — Bottom sheet picker** | The Type Picker is a bottom sheet overlaying P-1.1 Edit Profile. Not a full-screen push. Proportionate to the action (4-tile selection) and consistent with the Profile modal's navigation depth constraint. |
| **A002-D2 — Save confirmation required** | A "Save" button is required — tile tap does not auto-apply. Rationale: type change triggers an async re-evaluation job; accidental taps should not fire the job. Save/Cancel mirrors the standard edit confirmation pattern. No additional alert dialog is shown on Save. |
| **A002-D3 — Immediate UI update; async evaluation** | `athlete.athleteType` updates synchronously on Save. The Identity Header and Athlete Type row update immediately. The re-evaluation job runs in the background. The athlete never waits at a loading screen for re-evaluation to complete. |
| **A002-D4 — Informational toast, not alert** | Post-Save confirmation is a non-blocking toast. The copy acknowledges both the immediate change ("saved") and the pending evaluation ("being updated"). No push notification, no banner, no follow-up message on re-evaluation completion. |
| **A002-D5 — P-2.2 Updating state during re-evaluation (LOCKED: Option A)** | The Personal Improvement row in P-2.2 shows an Updating indicator while `athlete.reattributionInProgress = true`. The type parenthetical reflects the new type immediately (from `athlete.athleteType`). The evaluation result (✓ / ◑ / ○) reflects the re-attributed values after the job completes. No silent stale display — the athlete always sees their current type, and the Updating state communicates that recalculation is in progress. |
| **A002-D6 — Silent failure retry** | Re-evaluation job failures retry silently. No athlete-facing error is shown. The stale evaluation result persists until the job succeeds. `athlete.reattributionInProgress` remains true through retries, keeping P-2.2 in the Updating state until resolution. |
| **A002-D7 — Type change is non-destructive** | Per O-2-Amendment-001, A001-D9: all historical session data is retained. Rank promotions are not affected. Honors, chapters, and goals are unaffected. The only downstream change is on the Personal Improvement signal evaluation — re-attributed using the new type's signal logic. |
| **A002-D8 — Picker shows descriptors for accessibility, not for display** | The Type Picker tiles show only the type label (Strength, Bodybuilding, Endurance, Hybrid) in their visual state. Descriptors are used only in `accessibilityLabel` to provide context for screen reader users. Experienced athletes changing their type do not need the onboarding-level descriptors on the visual tile. |
| **A002-D9 — P-1.1 Edit Profile screen code (LOCKED: Option B)** | The Edit Profile screen is assigned the canonical code P-1.1 Edit Profile. It is a sub-screen of P-1, pushed onto P-1's modal navigation stack — consistent with the P-2.X sub-screen convention used in the Progress Hub (e.g., P-2.2 Rank Journey Detail). The navigation title visible to athletes remains "Edit Profile." All spec references use "P-1.1 Edit Profile" or "P-1.1." All P-1 v1.0 references to "P-2 Edit Profile" are corrected to "P-1.1 Edit Profile" by this amendment. |
| **A002-D10 — reattributionInProgress flag** | `athlete.reattributionInProgress: boolean` is added to the athlete data model. Set `true` when the re-evaluation job is queued. Set `false` on job completion (success) or final retry exhaustion (failure). This flag drives the P-2.2 Updating state independently of the type change itself. |
| **A002-D11 — No re-evaluation completion notification (LOCKED: Option A)** | No notification of any kind fires when re-evaluation completes. The updated evaluation result is discovered naturally on next P-2.2 open. The toast at Save time ("Your development signals are being updated") sets the expectation; the Updating indicator in P-2.2 communicates pending completion. A completion notification for an athlete-initiated background process would be redundant and unwanted. |

---

## Section 10 — Validation Checklist

### P-1.1 Edit Profile — Athlete Type Field
- [ ] Athlete Type row present in P-1.1 Edit Profile, below Display Name field
- [ ] Row label: "Athlete Type" — 13sp, muted
- [ ] Current type value displayed — 15sp, primary text
- [ ] [→] affordance on row — full row tappable
- [ ] Row minimum height: 52dp
- [ ] Tapping row opens Type Picker bottom sheet
- [ ] Back navigation from P-1.1 Edit Profile returns to P-1 with type change reflected (if saved)

### Type Picker Bottom Sheet
- [ ] Bottom sheet opens over P-1.1 Edit Profile (does not dismiss P-1.1)
- [ ] Sheet title: "Change Athlete Type" — 14sp, primary weight, centered
- [ ] Four tiles: Strength, Bodybuilding, Endurance, Hybrid — 2×2 grid, minimum 88dp height
- [ ] Current type rendered in selected state on sheet open
- [ ] Tapping a different tile: updates selected state to tapped tile; prior selected tile returns to unselected
- [ ] Tapping the current type: no state change
- [ ] "Save" button — Primary, 52dp, full width
- [ ] "Save" enabled only when a tile differing from the current type is selected
- [ ] "Save" disabled (not hidden) when current type is selected and no change made
- [ ] "Cancel" tertiary text link — always present and functional
- [ ] Cancel: sheet dismisses, no type change, no toast, returns to P-1.1 Edit Profile
- [ ] Drag down on handle bar: treated as cancel
- [ ] No auto-advance on tile tap — Save tap required to confirm

### Save Behavior
- [ ] Save tap: sheet dismisses immediately
- [ ] `athlete.athleteType` updated synchronously on Save
- [ ] `athlete.typeHistory` appended with new type and effectiveDate on Save
- [ ] `athlete.reattributionInProgress` set to `true` on Save
- [ ] Re-evaluation job queued on Save
- [ ] P-1.1 Edit Profile athlete type row reflects new type immediately after Save
- [ ] Toast shown: "[New Type] saved. Your development signals are being updated."
- [ ] Toast auto-dismisses after 4 seconds — no athlete action required
- [ ] Toast is non-blocking — athlete can continue using P-1.1 Edit Profile while toast is visible

### P-1 Identity Header
- [ ] Identity Header athlete type line reflects new type immediately on P-1 open after Save
- [ ] No re-evaluation loading indicator on P-1 Identity Header
- [ ] "Forging Since" date unchanged — unaffected by type change
- [ ] Rank unchanged — unaffected by type change

### Re-evaluation States (P-2.2)
- [ ] P-2.2 Personal Improvement row shows `⟳ Updating` while `athlete.reattributionInProgress = true`
- [ ] Type label in parentheses reflects new type immediately (not stale type) during Updating state
- [ ] Supporting copy: "Your development signals are being recalculated" — visible during Updating state
- [ ] Updating state clears when `athlete.reattributionInProgress = false` (job complete)
- [ ] No notification sent to athlete on re-evaluation completion
- [ ] On job completion: Personal Improvement row returns to normal state (✓ / ◑ / ○) with re-attributed evaluation result
- [ ] On job failure: silent retry; `reattributionInProgress` remains `true` until retry succeeds or retries exhausted
- [ ] If all retries exhausted: `reattributionInProgress = false`, previous evaluation result shown, no athlete-facing error

### Non-Destructive Behavior
- [ ] Historical session data not deleted on type change
- [ ] Rank promotions not revoked or modified on type change
- [ ] Honors not affected by type change
- [ ] Chapters and goals not affected by type change
- [ ] Only Personal Improvement evaluation is re-attributed

### Accessibility
- [ ] Athlete Type row: `accessibilityLabel` = "Athlete Type: [current type]. Double-tap to change."
- [ ] Sheet tiles: `accessibilityLabel` = "[Type] — [descriptor]" (see Section 8.2 for full labels)
- [ ] Selected tile: `accessibilityValue` = "selected"
- [ ] Unselected tiles: `accessibilityValue` = "not selected"
- [ ] Save button: `accessibilityLabel` = "Save athlete type change" (enabled) / `accessibilityHint` = "Select a different type to save" (disabled)
- [ ] Cancel link: `accessibilityLabel` = "Cancel, keep current athlete type"
- [ ] Toast: announced by screen reader on appearance
- [ ] P-2.2 Updating state: `accessibilityValue` = "Updating"

### Corrected P-1 v1.0 References
- [ ] P-1 Section 4.4 type list updated to: Strength, Bodybuilding, Endurance, Hybrid
- [ ] P-1 Section 4.4 editability reference corrected to "P-1.1 Edit Profile"
- [ ] P-1 Section 6.2 types table updated to four locked types with Personal Improvement signal column
- [ ] P-1 Section 6.4 replaced with edit flow reference to this amendment
- [ ] P-1 Section 10.1 athlete type row corrected (edit path to P-1.1 Edit Profile, notes)
- [ ] P-1 Section 10.5 example updated from "Running" to "Endurance"
- [ ] P-1 Section 13.2 corrected from "P-2 Edit Profile" to "P-1.1 Edit Profile"
- [ ] P-1 Section 14 athlete type editability checklist item corrected

---

## Section 11 — Closure Record

All open questions resolved. No remaining blockers.

| OQ | Decision | Notes |
|---|---|---|
| OQ-A002-1 | **Option A** — P-2.2 displays the Updating state while re-evaluation is in progress | `reattributionInProgress` flag drives P-2.2 Updating state. Type parenthetical updates immediately on Save; evaluation result updates when job completes. No silent stale display. Codified in A002-D5. |
| OQ-A002-2 | **Option B** — Edit Profile screen assigned canonical code P-1.1 Edit Profile | Consistent with P-2.X sub-screen convention. Athlete-facing navigation title remains "Edit Profile." All spec references updated throughout this document. Codified in A002-D9. |
| OQ-A002-3 | **Option A** — No notification sent when re-evaluation completes | Updated state discovered naturally on next P-2.2 open. Toast at Save time sets expectation; Updating indicator communicates pending completion. No redundant completion notification. Codified in A002-D11. |

---

## Section 12 — Lock Record

**Status: LOCKED v1.0**

**Lock date:** June 2026

**Locked by:** User decision — all open questions resolved; all decisions applied.

**What is locked:**
- P-1.1 Edit Profile as the canonical screen code for the Edit Profile surface (A002-D9)
- Athlete type field placement in P-1.1: labeled row below Display Name, tappable, 52dp minimum height
- Type Picker as a bottom sheet with 2×2 tile grid, Save/Cancel, no auto-advance
- Immediate `athlete.athleteType` update on Save; async re-evaluation job
- Toast confirmation: "[New Type] saved. Your development signals are being updated."
- P-2.2 Updating state (`⟳ Updating`) driven by `athlete.reattributionInProgress` flag
- Silent re-evaluation failure retry; no athlete-facing error
- No notification on re-evaluation completion
- All P-1 v1.0 reference corrections (type list, screen codes, edit surface references)

**What lock implies:**
P-1-Amendment-002 is the authoritative specification for athlete type editability via P-1.1 Edit Profile. All corrected P-1 v1.0 references (Sections 4.4, 6.2, 6.4, 10.1, 10.5, 13.2, 14) are superseded by this amendment. Engineering implements the P-1.1 Edit Profile athlete type field, the Type Picker bottom sheet, the async re-evaluation trigger, the P-1 Identity Header immediate update, and the P-2.2 Updating state per this document.

**Remaining engineering deliverables (not spec gaps):**
- `athlete.reattributionInProgress: boolean` data model field
- `athlete.typeHistory: [{ type, effectiveDate }]` data model field
- `RankEvaluationService.queueReattribution(athleteId)` implementation
- P-2.2 Updating state UI implementation (reads `reattributionInProgress`)

---

## Change Log

**v1.0 — June 2026**
Initial version. LOCKED. Applied lock decisions: OQ-A002-1 Option A (P-2.2 Updating state), OQ-A002-2 Option B (P-1.1 Edit Profile screen code), OQ-A002-3 Option A (no completion notification). Propagated P-1.1 Edit Profile screen code throughout all spec references. Added A002-D11 (no completion notification). Updated A002-D5 (Updating state) and A002-D9 (screen code) to locked status. Added Closure Record. Removed open questions.

---

*P-1 Amendment 002 — Athlete Type Editability*
*Amendment to Profile-Wireframe-Spec-P1.md v1.0*
*June 2026*
*Authority: O-2-Amendment-001-Athlete-Type-Declaration.md v1.0 (LOCKED), Rank-Calibration-Decisions.md Q8 (LOCKED)*
*Status: LOCKED v1.0*
