# W-20 Partner Selection Sheet
## Wireframe Specification v1.0 | June 2026

**Status:** LOCKED
**Authority:** Workout-With-Friend-Spec-WwF.md v1.1, Workout-Summary-Spec-W17.md, Train-Together-Screen-S10.md, Amendments/Identity-Amendment-001-Username.md, Master PRD §14

---

## 1. Purpose

W-20 is the partner selection surface for the post-workout tagging path. The athlete has already completed their workout and is reviewing the summary on W-17. If they trained alongside someone and want to acknowledge that, they tap "+ Tag a training partner" and W-20 opens.

W-20 answers the same question as S-10 — "Who trained with you?" — but at a different moment in the athlete's flow. The workout is done. The record is saved. W-20 is where the athlete adds the human acknowledgment: who was present for this effort.

**What W-20 is:**
- A bottom sheet over W-17 (non-disruptive — the workout summary remains visible behind it)
- A retrospective partner attribution surface
- Optional — the athlete may dismiss without tagging anyone
- Consistent with S-10 in UI pattern (MY SQUAD + search + multi-select)

**What W-20 is not:**
- A separate screen (it is a sheet, not a navigation stack push)
- A pre-association surface (the workout is already complete)
- A notification surface (notifications fire when the athlete taps "Done" on W-17, not when they make a selection in W-20)
- A Train Together equivalent (Train Together is S-10; W-20 is post-workout tagging)

**Emotional tone:** Reflective. Optional. Human.

---

## 2. Entry Point

| Source | Trigger | Data Passed | Return Destination |
|--------|---------|-------------|-------------------|
| W-17 Workout Summary | Tap "+ Tag a training partner" | Session context (used for partner attribution on save) | W-17 — sheet dismisses; W-17 unchanged if no selection made; W-17 shows selected partner(s) if confirmed |

W-20 is only accessible from W-17. It opens as a sheet over W-17 and returns to W-17 on all exit paths. W-17 is always beneath it, dimmed.

---

## 3. Presentation Style

**Container:** Standard Forge Legacy bottom sheet.

- Approximately 60% of screen height
- Not expandable to full height (W-17 content should remain partially visible as context)
- Drag handle at top center
- Dimmed background overlay; W-17 content visible and dimmed beneath
- Content scrolls within the sheet if member list exceeds visible area

**Dismissal:**
- Drag handle pulled down → dismiss sheet, return to W-17 unchanged
- Tap outside the sheet on the dimmed background → dismiss sheet, return to W-17 unchanged

**On dismissal without confirming a selection:** W-17 "+ Tag a training partner" CTA is restored to its default state (no partner shown). If the athlete had previously confirmed a partner in this session, dismissing W-20 without a new selection does NOT remove the previously confirmed partner — only the current W-20 interaction is cancelled.

**On dismissal after confirming a selection (via "Done"):** W-17 shows the selected partner(s). Athlete may re-open W-20 to modify the selection by tapping the partner row [×] or a future "+ Add partner" affordance.

---

## 4. Sheet Anatomy

```
┌────────────────────────────────────────────────┐
│  ─────────────  (drag handle)                  │
│                                                │
│  Tag a training partner                        │  ← 16sp, primary weight, left-aligned
│                                                │
│  [ 🔍  Search athletes...        ]             │  ← Search field, always visible
│                                                │
│  MY SQUAD                                      │  ← Section label (see § 6)
│                                                │
│  [●]  Chris Santos       ·  Iron Circle        │
│  [●]  Alex Torres        ·  Iron Circle    ✓   │  ← Selected state
│  [●]  Morgan Lee         ·  Iron Circle        │
│  [●]  Sam Okafor         ·  Forge Friday       │
│                                                │
│  [scrollable if more members]                  │
│                                                │
└────────────────────────────────────────────────┘
```

**Confirm zone:** "Done" button appears when ≥1 selection is made. In scrolling sheets, "Done" may be implemented as a top-right action button in the sheet header area, or as a sticky button at the bottom of the sheet — whichever fits the Forge Legacy sheet convention. It is not part of the drag handle area.

**With non-squad search results:**

```
│  MY SQUAD                                      │
│  [●]  Alex Torres  ·  Iron Circle          ✓   │  ← Selected
│                                                │
│  ────────────────────────────────────────      │  ← Divider
│                                                │
│  OTHER ATHLETES                                │  ← 12sp, secondary, uppercase
│  [●]  Jordan Kim          Requires approval    │
│  [●]  Taylor Reyes        Requires approval    │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 5. Sheet Header

| Element | Value |
|---------|-------|
| Drag handle | At top center; accessible label "Dismiss" |
| Title | "Tag a training partner" — 16sp, primary weight |
| Done action | Always visible and enabled; positioned at trailing edge of header row or as sticky bottom button |

There is no explicit "Cancel" or "Close" button. Dismissal is drag-down or tap-outside only — consistent with Forge Legacy bottom sheet conventions.

---

## 6. MY SQUAD Section

### 6.1 Section Label

```
MY SQUAD
```

Section label at 12sp, secondary color, left-aligned. Shown when the athlete belongs to at least one squad.

**When athlete belongs to multiple squads:**
```
MY SQUAD

  IRON CIRCLE                               ← Squad sub-label, 12sp, secondary, caps
  [●]  Chris Santos
  [●]  Alex Torres

  FORGE FRIDAY                              ← Squad sub-label
  [●]  Sam Okafor
```

Squad sub-labels are 12sp, secondary color, uppercase. Squads ordered alphabetically by squad name. Members within each squad ordered alphabetically by Display Name. This is identical to the S-10 grouping behavior.

### 6.2 Member Row

```
[Avatar 32dp]  [Display Name]  ·  [Squad Name]    [✓ when selected]
```

Identical format to S-10 member rows. Squad name shown on all rows (consistent format). Minimum tap height: 48pt.

### 6.3 No Squad State

If the athlete belongs to no squads:
- "MY SQUAD" section label is absent
- The sheet shows only the search field and the invitation title
- Guidance copy below search field: "Search to find an athlete to tag."
- "Done" appears when a non-squad athlete is found and selected via search

An athlete with no squads can still use W-20 to tag non-squad athletes (M-9 approval flow follows).

### 6.4 Empty MY SQUAD (Sole Squad Member)

If the athlete belongs to a squad with no other visible members:
- MY SQUAD section header is entirely omitted
- Supporting copy: "Your squad has no other members yet. Search for an athlete below."
- Search field remains active; OTHER ATHLETES section appears when search returns non-squad results

---

## 7. Search Behavior

### 7.1 Placement and Persistence

Identical to S-10. Search field is always visible. MY SQUAD list remains visible above search results. Typing filters MY SQUAD and adds OTHER ATHLETES section.

### 7.2 Search Query Behavior

Identical to S-10 (S10-D4):

| Input | Behavior |
|-------|---------|
| Plain text | Searches Display Name and Username simultaneously |
| `@` prefix | Forces username-only search |
| Empty field | Full MY SQUAD list; no OTHER ATHLETES |
| No matches | "No athletes found." muted text |

### 7.3 Search Result Ordering

Squad members matching the query first (under MY SQUAD, filtered). Non-squad athletes second (under OTHER ATHLETES). Squad-first priority is consistent with S-10.

---

## 8. OTHER ATHLETES Section

Appears only when search field has content and non-squad results exist.

### 8.1 Section Header

```
────────────────────────────────────────  ← Visual divider
OTHER ATHLETES
```

### 8.2 Non-Squad Row

```
[Avatar 32dp]  [Display Name]    Requires approval
```

"Requires approval" is shown on all non-squad rows in W-20, consistent with S-10 (S10-D7 resolution). When a non-squad athlete is selected:

```
[●]  Jordan Kim    Requires approval  ✓
```

"Requires approval" persists on selected non-squad rows so the athlete understands the approval flow that follows at W-17 "Done."

**Why W-20 shows "Requires approval":**
The WwF spec (Section 5.2) did not explicitly specify this indicator for W-20. S-10 established the pattern: the tagger should understand at selection time that non-squad partners require M-9 approval. Omitting this in W-20 would create an inconsistency — the pre-workout path informs the athlete, the post-workout path does not. W-20 adopts the S-10 behavior for parity.

---

## 9. Selection Behavior

### 9.1 Toggling

Tapping a row toggles selection. Checkmark appears on selection. Checkmark disappears on deselection. "Done" activates when ≥1 selection exists; deactivates when all are deselected.

### 9.2 Multi-Selection (Up to 3)

Up to 3 partners can be selected. Consistent with S-10 and the WwF 3-partner cap.

When 3 partners are selected, additional rows become visually inactive (muted opacity, not tappable). Deselecting a partner re-enables other rows.

### 9.3 Sheet Stays Open During Selection

The sheet does not close when a row is tapped. The athlete may select multiple partners before tapping "Done." This is unlike standard bottom sheet list patterns — the multi-select intent requires an explicit confirm action.

### 9.4 Selection State on Re-Open

If the athlete has already confirmed partners (via "Done") in the current W-17 session and re-opens W-20 (by tapping the partner row [×] CTA or an "+Add" affordance on W-17):
- Previously confirmed partners are shown as selected
- The athlete may add or remove partners
- Confirming "Done" replaces the prior selection

If all partners are removed in W-20 and "Done" is tapped with no selections: the W-17 Tier 4 section reverts to the "+ Tag a training partner" CTA state (no partners tagged).

---

## 10. "Done" Action

| State | Condition | Result |
|-------|-----------|--------|
| 0 partners selected (initial open) | No selections made and no prior confirmed partners in this W-17 session | Sheet closes; W-17 unchanged |
| 0 partners selected (all cleared) | All previously confirmed partners removed before tapping Done | Sheet closes; W-17 Tier 4 reverts to "+ Tag a training partner" |
| ≥1 partner selected | One or more partners selected | Sheet closes; W-17 Tier 4 updated with selected partners |

"Done" is the intentional confirm action — it applies the current selection state, whatever it is. Dismissal (swipe / tap-outside) is the cancel action — it abandons the current editing session and leaves W-17 in its prior state. This distinction matters when the athlete has already confirmed partners and re-opens W-20 to modify: Done with 0 selections clears them; dismiss preserves them.

**On "Done" tap:**
1. W-20 sheet dismisses
2. W-17 Tier 4 updates per the table above
3. No notification fires at this moment (notification fires on W-17 "Done" tap)

**"Done" does not write the tag.** It confirms the selection back to W-17. The tag is written when the athlete taps "Done" on W-17 itself.

---

## 11. W-17 After Partner Selection

After confirming from W-20, W-17 Tier 4 section changes from the invitation state to the confirmed state.

### 11.1 Single Partner Confirmed

```
┌──────────────────────────────────────────────────────┐
│  [●]  Alex Torres  ·  Iron Circle               [×]  │  ← Partner row + remove
└──────────────────────────────────────────────────────┘
│  + Add a training partner                             │  ← Secondary action (if < 3 confirmed)
```

### 11.2 Multiple Partners Confirmed

```
┌──────────────────────────────────────────────────────┐
│  [●]  Alex Torres  ·  Iron Circle               [×]  │
│  [●]  Jordan Kim   ·  Requires approval         [×]  │
└──────────────────────────────────────────────────────┘
│  + Add a training partner                             │  ← Secondary (if < 3 confirmed)
```

When 3 partners are confirmed, "+ Add a training partner" is absent.

### 11.3 Non-Squad Partner Display in W-17

Non-squad partners show "Requires approval" as a secondary label on their W-17 row (consistent with S-10 and W-20 selection rows). The tagger sees at a glance which tags will require approval when they tap W-17 "Done."

```
│  [●]  Jordan Kim   ·  Requires approval         [×]  │
```

### 11.4 Removing a Partner from W-17

The [×] on each partner row removes that partner from the pending tag list. No sheet opens. No confirmation required — the tag has not been written yet (it writes on W-17 "Done"), so removal is non-destructive.

After removing all partners: W-17 Tier 4 returns to "+ Tag a training partner" state.

---

## 12. Navigation

### 12.1 Entry

W-20 opens as a bottom sheet over W-17. W-17 remains the current screen. W-17 is dimmed but visible.

### 12.2 Dismissal Without Selection

Drag down or tap outside → sheet closes, W-17 unchanged.

### 12.3 Dismissal After "Done"

"Done" in W-20 → sheet closes, W-17 Tier 4 updated with selected partners.

### 12.4 No Other Navigation

W-20 does not navigate anywhere except back to W-17 (via dismiss or "Done"). No tapping of member rows navigates away from W-20.

---

## 13. Empty and Error States

| Scenario | Display |
|----------|---------|
| No squads | Section label absent; search-only view with guidance copy |
| Single-member squad | MY SQUAD label + empty guidance copy |
| Search returns no results | "No athletes found." muted text in results area |
| Search network error | Inline error below search: "Search unavailable. Squad members are shown below." — MY SQUAD functional |

---

## 14. Accessibility

| Element | Accessibility Behavior |
|---------|----------------------|
| Sheet | Announced as modal: "Tag a training partner" |
| Drag handle | Accessible label: "Dismiss" |
| Title | Announced as heading |
| Search field | Standard search accessibility; clear button labeled "Clear search" |
| MY SQUAD section label | Announced as: "My squad section" |
| Member row — unselected | Announced as: "[Name], [Squad Name], double-tap to select" |
| Member row — selected | Announced as: "[Name], [Squad Name], selected, double-tap to deselect" |
| Non-squad row | Announced as: "[Name], requires approval, double-tap to select" |
| Done action — inactive | Not shown or announced as dimmed |
| Done action — active | Announced as: "Done, button" |
| Background dimmed area | Accessible: "Double-tap to dismiss" |
| [×] remove partner (on W-17) | Announced as: "Remove [Name] from training partners" |

**Focus behavior:**
- On open: focus set to sheet title or search field
- Focus is trapped within the sheet while open
- On dismiss: focus returns to W-17 "+ Tag a training partner" CTA (or the partner row if a partner was previously confirmed)

**Minimum touch targets:**
- All rows: 48pt height minimum
- Drag handle: accessible tap area extended beyond visual size

---

## 15. Performance Requirements

| Metric | Target |
|--------|--------|
| Time from "+ Tag a training partner" tap to sheet visible | < 200ms |
| Squad member list render | Immediate (local data) |
| Search results (squad filter) | Immediate |
| Search results (non-squad) | < 300ms from last keystroke |
| Sheet animation | Standard bottom sheet spring animation |

---

## 16. Non-Behaviors

W-20 does not and will never:

| Non-Behavior |
|-------------|
| Fire a notification at W-20 selection time (notifications fire at W-17 "Done") |
| Show whether a partner is currently training or online |
| Show a partner's recent workout history or performance data |
| Suggest who to tag |
| Allow selecting more than 3 partners |
| Allow selecting the same athlete twice |
| Expand to full screen height |
| Replace W-17 (W-17 remains beneath) |
| Write the partner tag — that happens at W-17 "Done" |
| Require an internet connection to show squad member list |
| Show a "Trained X times together" count |
| Show a partner's chapter, goal, program, or rank |
| Allow the athlete to write a message to the tagged partner |
| Appear during an active workout (W-9 through W-16 suppress all WwF notification surfaces) |

---

## 17. Validation Checklist

### Sheet and Presentation
- [ ] W-20 opens as bottom sheet (~60% height) over W-17
- [ ] W-17 content visible and dimmed beneath
- [ ] Drag-down dismisses sheet, W-17 unchanged
- [ ] Tap-outside dismisses sheet, W-17 unchanged
- [ ] Sheet height not expandable to full screen

### MY SQUAD Section
- [ ] MY SQUAD shows all squad members from all athlete squads
- [ ] Multiple squads: grouped by squad name (sub-labels, alphabetical order)
- [ ] Member rows: Avatar · Display Name · Squad Name
- [ ] Athlete's own account not shown
- [ ] No squads: section absent; guidance copy shown
- [ ] Single-member squad: MY SQUAD section header omitted; supporting copy: "Your squad has no other members yet. Search for an athlete below."
- [ ] Members sorted alphabetically by Display Name within squad group

### Search
- [ ] Search field always visible in sheet
- [ ] Search queries Display Name + Username simultaneously
- [ ] `@` prefix forces username-only search
- [ ] Typing filters MY SQUAD and adds OTHER ATHLETES
- [ ] Clearing search restores full MY SQUAD; hides OTHER ATHLETES
- [ ] "No athletes found." shown when search has no results

### OTHER ATHLETES Section
- [ ] Section appears only during active search with non-squad results
- [ ] Non-squad rows: Display Name + "Requires approval" (no squad name)
- [ ] "Requires approval" persists on selected non-squad rows

### Selection
- [ ] Row tap toggles selection
- [ ] Checkmark on selected rows
- [ ] Sheet does not close on selection (explicit "Done" required)
- [ ] Up to 3 partners selectable
- [ ] 4th selection attempt: additional rows inactive
- [ ] Mixed squad + non-squad selections valid
- [ ] Selection persists while search field is active
- [ ] Re-open with prior selection: prior partners pre-selected

### Done Action
- [ ] "Done" always visible and enabled (no disabled state)
- [ ] "Done" with ≥1 selected: sheet closes, W-17 Tier 4 updated with selected partners
- [ ] "Done" with 0 selected, no prior confirmed partners: sheet closes, W-17 unchanged
- [ ] "Done" with 0 selected after clearing all prior confirmed partners: sheet closes, W-17 reverts to "+ Tag a training partner"
- [ ] No notification fires at W-20 "Done" (fires at W-17 "Done")
- [ ] Dismiss (swipe / tap-outside) always preserves W-17 prior state — distinct from Done

### W-17 Integration
- [ ] Single confirmed partner: avatar + name + squad name + [×]
- [ ] Multiple confirmed partners: each as separate row with [×]
- [ ] Non-squad confirmed partner: "Requires approval" label on W-17 row
- [ ] "+ Add a training partner" shown when < 3 partners confirmed
- [ ] "+ Add a training partner" absent when 3 partners confirmed
- [ ] [×] removes partner without confirmation (non-destructive — tag not yet written)
- [ ] All partners removed: W-17 Tier 4 returns to "+ Tag a training partner" state

### Accessibility
- [ ] Sheet announced as "Tag a training partner"
- [ ] Focus trapped in sheet while open
- [ ] Focus returns to W-17 CTA on dismiss
- [ ] Non-squad rows announced with "requires approval"
- [ ] [×] on W-17 announced with partner name

### Non-Behaviors
- [ ] No notification at W-20 selection time
- [ ] No partner performance data shown
- [ ] No full-screen expansion
- [ ] No more than 3 selections

---

## 18. Decisions Record

| Decision | Value |
|----------|-------|
| W20-D1 — "Requires approval" in W-20 | Shown on non-squad rows, consistent with S-10 (parity decision — both selection surfaces should inform the tagger about the approval requirement) |
| W20-D2 — MY SQUAD scope | All squads the athlete belongs to (same as S-10) |
| W20-D3 — Sheet dismissal without selection | W-17 unchanged; prior confirmed partners preserved |
| W20-D4 — "Done" always enabled | Done is always visible and tappable regardless of selection count. Done = intentional confirm (applies current selection state, even if empty). Dismiss = cancel (W-17 prior state preserved). Done with 0 selected after clearing prior partners reverts W-17 to "+ Tag a training partner"; Done with 0 selected and no prior partners leaves W-17 unchanged. |
| W20-D5 — Tag write timing | Tag is written at W-17 "Done", not at W-20 "Done" |
| W20-D6 — Re-open with prior selection | Prior confirmed partners shown as selected in W-20 for modification |
| W20-D7 — Sheet height | ~60% screen height; not full-screen expandable |
| W20-D8 — Search scope | Display Name + Username simultaneously; `@` prefix forces username-only (Identity Amendment 001 parity, matching S-10) |
| W20-D9 — Empty MY SQUAD display | MY SQUAD section header omitted when no visible squad members exist (sole squad member or all members invisible). Supporting copy: "Your squad has no other members yet. Search for an athlete below." When athlete belongs to no squads at all: MY SQUAD header absent, guidance copy: "Search to find an athlete to tag." Both cases: search-only experience. |

---

## 19. Closure Record

### WwF Lifecycle Coverage

W-20 covers the post-workout partner selection flow:

| Phase | Coverage |
|-------|---------|
| Partner selection sheet (W-20) | ✓ This document |
| W-17 Tier 4 partner display after W-20 confirm | ✓ Defined in § 11 |
| Tag write timing (W-17 "Done") | ✓ W20-D5; governed by WwF Spec v1.1 |
| M-8/M-9 split at W-17 "Done" | ✓ Governed by WwF Spec v1.1 |

### Architecture Audit Issues Resolved

| Issue | Resolution |
|-------|----------|
| [H-13] W-20 specified inline only, not as dedicated spec | ✓ Resolved — this document promotes W-20 from WwF Section 5.2 inline definition to a full dedicated spec |

### WwF Selection Surface Consistency

S-10 and W-20 share a common design language:

| Element | S-10 | W-20 |
|---------|------|------|
| MY SQUAD section | ✓ | ✓ |
| Squad grouping (multi-squad) | ✓ | ✓ |
| Search (Display Name + Username) | ✓ | ✓ |
| `@` username-only search | ✓ | ✓ |
| OTHER ATHLETES section | ✓ | ✓ |
| "Requires approval" on non-squad | ✓ | ✓ |
| Multi-select up to 3 | ✓ | ✓ |
| Checkmark on selected rows | ✓ | ✓ |
| Athlete's own account excluded | ✓ | ✓ |
| Partner performance data | Never | Never |

The two screens differ appropriately in presentation (full screen vs. bottom sheet), CTA label ("Start Training Together" vs. "Done"), and context (pre-workout intent vs. post-workout attribution).

---

## 20. Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification — promotes W-20 from WwF Section 5.2 inline definition to full dedicated spec; closes Architecture Audit [H-13] |
| v1.0 lock pass | June 2026 | Done button inconsistency resolved: "Done" is always visible and enabled (Section 5, Section 10, validation checklist, W20-D4 updated). Semantic distinction clarified: Done = intentional confirm; dismiss = cancel. Example wireframe rows corrected: logged-in athlete removed from selectable squad member examples. Empty MY SQUAD (sole squad member) corrected: MY SQUAD section header now omitted per locked decision; updated copy to "Your squad has no other members yet. Search for an athlete below." (W20-D9 added). |

---

*W-20 Partner Selection Sheet — Wireframe Specification v1.0*
*Forge Legacy | June 2026*
