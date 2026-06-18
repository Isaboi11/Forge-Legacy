# S-10 Train Together Partner Selection
## Wireframe Specification v1.0 | June 2026

**Status:** LOCKED
**Authority:** Workout-With-Friend-Spec-WwF.md v1.1, Squad-Detail-Wireframe-Spec-S2.md v1.3, Amendments/Identity-Amendment-001-Username.md, Master PRD §14

---

## 1. Purpose

S-10 is the partner selection screen for the Train Together initiation path. It answers one question: **"Who are you training with today?"**

S-10 is where an athlete names their training partner before a workout begins. It is reached from S-2 via the "Train Together" Primary CTA. It leads to W-1 (and then into an active workout).

S-10 does not start a workout. It does not notify the partner. It creates a pre-association — an intention — that is carried into the active session and resolved when the athlete taps "Done" on W-17. All consent mechanics (M-8 and M-9) fire at W-17 "Done" time, not here.

**What S-10 is:**
- A selection surface: the place to name who you are training with
- Efficient: one question, a list, a search field, and a single CTA
- Honest about approval requirements: non-squad selections show "Requires approval" so the tagger understands the M-9 flow will follow

**What S-10 is not:**
- A workout initiation screen (workout starts from W-1)
- A notification surface (no notification fires at S-10)
- A presence surface (no live data about whether a partner is training now)
- A social graph (no follow/friend mechanics)

**Emotional tone:** Purposeful. Simple. Ready.

---

## 2. Entry Point

| Source | Trigger | Data Passed | Return Destination |
|--------|---------|-------------|-------------------|
| S-2 Squad Detail | Tap "Train Together" Primary CTA | Squad context (originating squad) | S-2 (via back arrow) |

S-10 is only reachable from S-2. Any athlete who reaches S-10 belongs to at least one squad (the squad they navigated through on S-2). The "MY SQUAD" section will always have a originating squad context, though it may have no other members if the squad has only the athlete.

---

## 3. Presentation Style

**Container:** Full-screen navigation stack screen.

- Standard Forge Legacy Top App Bar
- Bottom Tab Bar hidden while S-10 is active (full-screen recruitment mode — the athlete is committing to a training intent, not browsing)
- Primary CTA fixed at bottom of screen above safe area
- Content area scrolls between Top App Bar and fixed CTA

**Navigation:**
- Back arrow [←] in Top App Bar → returns to S-2 (no pre-association created)
- System back gesture → same as back arrow

---

## 4. Screen Anatomy

```
┌────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                 │
├────────────────────────────────────────────────────┤
│  [←]  Train Together                               │  ← Top App Bar
├────────────────────────────────────────────────────┤
│                                                    │
│  Who are you training with today?                  │  ← 18sp, primary weight, left-aligned
│                                                    │
│  [ 🔍  Search athletes...             ]            │  ← Search field, always visible
│                                                    │
│  MY SQUAD                                          │  ← Section label (see § 6.1)
│                                                    │
│  [●]  Chris Santos       ·  Iron Circle            │  ← Squad member row
│  [●]  Alex Torres        ·  Iron Circle            │
│  [●]  Morgan Lee         ·  Iron Circle  ✓         │  ← Selected state
│  [●]  Sam Okafor         ·  Forge Friday           │
│                                                    │
│  [bottom of list]                                  │
│                                                    │
└────────────────────────────────────────────────────┤
│  [  Start Training Together  ]                     │  ← Primary CTA, disabled until ≥1 selection
└────────────────────────────────────────────────────┘
```

**With non-squad search results active:**

```
│  MY SQUAD                                          │
│  [●]  Morgan Lee  ·  Iron Circle              ✓    │  ← Selected (persists during search)
│                                                    │
│  ────────────────────────────────────────────      │  ← Divider between sections
│                                                    │
│  OTHER ATHLETES                                    │  ← Section label, 12sp, secondary
│  [●]  Jordan Kim                  Requires approval│
│  [●]  Taylor Reyes                Requires approval│
└────────────────────────────────────────────────────┤
│  [  Start Training Together  ]                     │  ← Active (Morgan Lee selected)
└────────────────────────────────────────────────────┘
```

---

## 5. Top App Bar

| Element | Value |
|---------|-------|
| Leading icon | Back arrow [←] |
| Title | "Train Together" |
| Trailing actions | None |

Back arrow → S-2. No other Top App Bar actions.

---

## 6. MY SQUAD Section

### 6.1 Section Label

**When athlete belongs to one squad:**
```
MY SQUAD
```
Section label at 12sp, secondary color, left-aligned. Always shown when the athlete belongs to at least one squad — even if that squad has no other members (see § 6.3 for empty member list behavior).

**When athlete belongs to multiple squads:**
```
MY SQUAD

  IRON CIRCLE                                    ← Squad sub-label, 12sp, secondary, caps
  [●]  Chris Santos
  [●]  Alex Torres

  FORGE FRIDAY                                   ← Squad sub-label, 12sp, secondary, caps
  [●]  Sam Okafor
  [●]  Dana Park
```

Squad sub-labels are 12sp, secondary color, uppercase. Squads are ordered alphabetically by squad name. Members within each squad are ordered alphabetically by Display Name.

### 6.2 Member Row

```
[Avatar 32dp]  [Display Name]  ·  [Squad Name]    [✓ when selected]
```

| Element | Behavior |
|---------|---------|
| Avatar | 32dp circle; initials fallback when no photo |
| Display Name | Primary text, 15sp |
| Squad Name | Secondary text, 13sp, muted (shown always — serves as context in multi-squad scenarios) |
| Squad Name (single squad) | Still shown — consistent row format regardless of squad count |
| Selection checkmark | Trailing; appears on selection; disappears on deselection |
| Row tap | Toggles selection (see § 8) |
| Minimum tap height | 48pt |

### 6.3 Empty Member List (Single-Member Squad)

If the athlete belongs to only one squad and is the sole member of that squad (no other members have joined):

- MY SQUAD section header is entirely omitted
- Supporting copy is displayed below the search field:

  > Your squad has no other members yet. Search for an athlete below.

- Search field remains active and functional
- OTHER ATHLETES section appears when an active search returns non-squad results
- The "Start Training Together" CTA remains disabled until a selection is made via search

### 6.4 Member Not Shown

Squad members who are the athlete themselves are not shown. S-10 is for selecting a training partner — selecting oneself is not a valid action.

---

## 7. Search Field

### 7.1 Placement and Persistence

The search field is always visible between the invitation question and the MY SQUAD section. It does not replace the MY SQUAD list — both coexist. When the athlete types in the search field:
- MY SQUAD member list filters to matching members (if any)
- Non-squad results appear below a divider under "OTHER ATHLETES" label

When the search field is cleared, MY SQUAD returns to its full list and the OTHER ATHLETES section disappears.

### 7.2 Search Query Behavior

Search queries match on both **Display Name** and **Username** simultaneously, consistent with the search behavior established in Identity Amendment 001 Section 4.1.

| Input | Behavior |
|-------|---------|
| Plain text (no `@` prefix) | Searches Display Name and Username simultaneously; returns any matching athletes |
| `@` prefix (e.g., `@ironalex`) | Forces username-only search; Display Name not queried |
| Empty field | Full squad member list shown; no OTHER ATHLETES section |
| No matches | Search results empty; "No athletes found." muted text in search results area |

### 7.3 Search Result Ordering

Results always appear in this order:
1. Squad members matching the query (under MY SQUAD, filtered)
2. Non-squad athletes matching the query (under OTHER ATHLETES, with "Requires approval")

Squad members are always prioritized. Non-squad results appear only when the search field has content.

### 7.4 Search Field Behavior

- Keyboard appears automatically when the athlete taps the search field
- Search is live — results update on each keystroke (no minimum character count, no debounce required)
- Clearing the field (× icon in field) restores the full MY SQUAD list and hides OTHER ATHLETES
- The search field retains content if the athlete selects a result and then continues typing (multi-selection flow)

---

## 8. OTHER ATHLETES Section

Appears only when the search field has content and non-squad results are returned.

### 8.1 Section Header

```
────────────────────────────────────────────  ← Visual divider
OTHER ATHLETES                                ← 12sp, secondary color, uppercase
```

The divider visually separates squad results from non-squad results. The "OTHER ATHLETES" label makes the consent distinction clear before the athlete selects.

### 8.2 Non-Squad Row

```
[Avatar 32dp]  [Display Name]     Requires approval
```

| Element | Behavior |
|---------|---------|
| Avatar | 32dp circle; initials fallback |
| Display Name | Primary text, 15sp |
| Squad Name | Not shown (non-squad athlete has no shared squad context) |
| "Requires approval" | Trailing label, 12sp, muted — always shown on non-squad rows |
| Selection checkmark | Appears alongside "Requires approval" on selection |
| Minimum tap height | 48pt |

**Why "Requires approval" is shown:**
When a non-squad athlete is tagged, they receive M-9 (approve/decline) before the standard M-8 (claim/dismiss) flow. "Requires approval" on the S-10 row sets the tagger's expectation: this selection will create an approval request, not an immediate tag notification. It is informational — not a gate. The athlete can select a non-squad partner freely.

### 8.3 "Requires approval" on Selected Non-Squad Row

When a non-squad athlete is selected, "Requires approval" remains visible alongside the selection checkmark:

```
[●]  Jordan Kim    Requires approval  ✓
```

This ensures the tagger does not forget the approval requirement after making their selection.

---

## 9. Selection Behavior

### 9.1 Single Selection

Tapping any row toggles its selection:
- Unselected → selected: checkmark appears; CTA activates
- Selected → deselected: checkmark disappears; if no other selections remain, CTA disables

Selection state persists while the search field is active. A squad member selected before searching remains selected during and after searching.

### 9.2 Multi-Selection (Up to 3)

Up to 3 partners can be selected simultaneously. Squad members, non-squad athletes, and mixed selections are all valid.

When 3 partners are selected:
- Additional rows are visually inactive (muted opacity, not tappable)
- A count indicator appears near the CTA or in the CTA label: "Start Training Together (3)"
- Deselecting a currently selected partner re-enables other rows

**Why 3 maximum:**
Consistent with W-20 (post-workout partner selection). Group training sessions are a legitimate use case; the cap of 3 keeps the WwF attribution system manageable and consistent with WwF Spec v1.1.

### 9.3 Selection Persistence

Selection state is held in-screen. If the athlete navigates away (back to S-2) and returns, selection is reset to empty. Selection state is not persisted across sessions.

**Exception — active pre-association re-entry (see § 11.3):** If the athlete has an active pre-association (created in a prior S-10 visit within the current 24-hour window) and returns to S-10 via S-2, the previously selected partners are shown as selected. The athlete may modify the selection before tapping the CTA again.

---

## 10. "Start Training Together" CTA

| State | Condition | Appearance |
|-------|-----------|-----------|
| Disabled | No partners selected | Grayed, not tappable |
| Active — 1 selection | 1 partner selected | Full Primary color |
| Active — 2+ selections | 2–3 partners selected | Full Primary color |

**Label:** "Start Training Together"

The CTA label does not dynamically change to include a count. The count is implied by the checkmarks on the selected rows. The CTA is a single, consistent label.

**On tap:**
1. Pre-association is written to local storage and synced to server
2. S-10 is replaced on the navigation stack by W-1 (Workouts Hub) — navigation stack becomes `[... → S-2 → W-1]`
3. Back from W-1 returns to S-2 — S-10 is not in the back stack
4. No toast, no confirmation message

**Why S-10 is replaced, not pushed:**
S-10 is an intent-declaration step — it creates the pre-association and leads the athlete into their workout. Once the CTA is tapped, the Train Together intent is complete. The athlete must not be able to navigate back to S-10 from W-1: the selection is made, the pre-association is set. Replacing S-10 rather than pushing W-1 cleanly closes the intent step. Back from W-1 returns to S-2, which remains available for any further squad context the athlete needs.

---

## 11. Pre-Association Lifecycle

The pre-association is a stored intent: "I plan to train with [Partner(s)] in the next workout session I complete."

### 11.1 Creation

Created when the athlete taps "Start Training Together." Stored locally and synced to server. Associates the selected partner(s) with the athlete's next completed workout session.

### 11.2 Consumption

The pre-association is consumed when the athlete completes a workout session and saves it via "Done" on W-17. At W-17 "Done" time:
- M-8/M-9 consent flow is initiated for each partner (squad vs. non-squad split evaluated at this moment, not at S-10 selection time)
- Pre-association is cleared from local storage and server

### 11.3 Re-Entry and Modification

If the athlete has an active pre-association and opens S-10 again (via S-2 → "Train Together"):
- S-10 opens with the previously selected partners shown as selected
- The athlete may deselect existing partners, add new partners, or cancel entirely
- Tapping "Start Training Together" again replaces the prior pre-association with the new selection
- Back arrow with no changes preserves the prior pre-association unchanged

### 11.4 Survival and Expiry

| Event | Pre-association behavior |
|-------|------------------------|
| Workout discarded (Abandon Confirmation → Discard) | Persists — abandoned session does not consume the tag |
| App force-quit during workout | Persists — survives app restart |
| 24 hours pass without starting a workout | Expires silently — no notification to tagger or partner |
| Workout started, completed, saved (W-17 "Done") | Consumed — M-8/M-9 fired per partner |

**Why 24 hours:** Train Together expresses an intention in the moment — "I'm about to train with you." An indefinite pre-association would produce stale or accidental tags when the athlete initiates Train Together but never trains that day. 24 hours bounds the intent to the expected training window.

### 11.5 Partner Indicator During Workout

Once a workout is active (W-9 through W-16), the pre-tagged partners are shown in a compact indicator below the Chapter Context Strip:

```
│  Building →  The Rebuild                  │  ← Chapter Context Strip
│  [●] Training with Morgan Lee             │  ← Partner indicator, 12sp, secondary, non-tappable
```

For multiple pre-tagged partners:
```
│  [●] Training with Morgan Lee +2          │  ← First name + overflow count
```

The indicator is read-only. It cannot be tapped. Partners cannot be added or removed during an active workout. The indicator is suppressed on W-20 during that workout (post-workout tagging from W-17 is the removal path).

---

## 12. Navigation

### 12.1 Entry Navigation

S-10 is pushed onto the Squads tab navigation stack from S-2. The Top App Bar back arrow and system back gesture return to S-2.

### 12.2 Exit Navigation (CTA)

"Start Training Together" → S-10 is replaced on the navigation stack by W-1. Stack becomes `[... → S-2 → W-1]`. Back from W-1 returns to S-2. S-10 is not reachable by back-gesture after the CTA is tapped.

### 12.3 No Other Navigation

S-10 does not navigate anywhere except back to S-2 (back arrow) or to W-1 (CTA). No tapping of member rows navigates away — all taps on rows are selection toggles only.

---

## 13. Empty States

| Scenario | Display |
|----------|---------|
| Single-member squad (athlete is only member), search field empty | MY SQUAD label + empty guidance copy: "Search above to find an athlete to train with." |
| Search field has content, no matching squad members, no non-squad results | MY SQUAD section absent or filtered to empty; "No athletes found." muted text in results area |
| Search field has content, no matching squad members, non-squad results exist | MY SQUAD filtered to empty; OTHER ATHLETES section with results shown |

---

## 14. Error States

| Scenario | Display |
|----------|---------|
| Search fails (network error, server timeout) | Inline error below search field: "Search unavailable. Squad members are shown below." — MY SQUAD section remains fully functional |
| Pre-association write fails (network unavailable) | Retry from local storage — pre-association stored locally, synced when connectivity restored. Athlete proceeds to W-1 without interruption. |

S-10 never blocks the athlete from proceeding to W-1. If the pre-association cannot be immediately synced to the server, it is retained locally and synced as soon as connectivity is available.

---

## 15. Accessibility

| Element | Accessibility Behavior |
|---------|----------------------|
| Screen | Announced as: "Train Together" |
| Invitation question | Announced as heading |
| Search field | Standard search field accessibility; clear button labeled "Clear search" |
| MY SQUAD section label | Announced as: "My squad section" |
| Squad sub-labels (multi-squad) | Announced as section headers within MY SQUAD |
| Member row — unselected | Announced as: "[Name], [Squad Name], double-tap to select" |
| Member row — selected | Announced as: "[Name], [Squad Name], selected, double-tap to deselect" |
| Non-squad row — unselected | Announced as: "[Name], requires approval, double-tap to select" |
| Non-squad row — selected | Announced as: "[Name], requires approval, selected, double-tap to deselect" |
| CTA — disabled | Announced as: "Start Training Together, dimmed" |
| CTA — active | Announced as: "Start Training Together, button" |
| OTHER ATHLETES section | Announced as: "Other athletes section" |

**Focus behavior:**
- On screen open: focus set to invitation question or search field
- Tab order: invitation question → search field → squad member rows → OTHER ATHLETES rows → CTA

**Minimum touch targets:**
- All rows: 48pt height minimum
- CTA: full-width, standard Primary CTA height

---

## 16. Performance Requirements

| Metric | Target |
|--------|--------|
| Time from S-2 CTA tap to S-10 visible | < 200ms |
| Squad member list render | Immediate (local data — squad membership is cached) |
| Search results (squad member filter) | Immediate (local filter) |
| Search results (non-squad athletes) | < 300ms from last keystroke |
| Pre-association write (local) | < 50ms |
| Pre-association sync (server) | Background — does not block W-1 navigation |

Squad member data is loaded from local cache. S-10 does not perform a network request to render the MY SQUAD list.

---

## 17. Non-Behaviors

S-10 does not and will never:

| Non-Behavior |
|-------------|
| Show whether a partner is currently training |
| Show a partner's recent workout history or performance data |
| Suggest who to train with |
| Send any notification at S-10 selection time (notifications fire at W-17 "Done") |
| Start a workout session |
| Limit selection to squad members only (non-squad athletes discoverable via search) |
| Allow selecting the same athlete twice |
| Allow selecting more than 3 partners |
| Show a partner's chapter, goal, program, or rank |
| Show a "Trained X times together" count |
| Require the pre-association to succeed before navigating to W-1 |
| Warn the athlete when the 24-hour pre-association window is approaching expiry |
| Allow the athlete to name or label the Train Together session |
| Confirm to the tagger that the partner has been notified (notification fires at W-17 "Done") |

---

## 18. Validation Checklist

### Screen and Presentation
- [ ] S-10 opens as full-screen navigation screen (not bottom sheet)
- [ ] Bottom Tab Bar hidden on S-10
- [ ] Back arrow returns to S-2 without creating a pre-association
- [ ] "Start Training Together" CTA fixed at bottom of screen

### MY SQUAD Section
- [ ] MY SQUAD shows all squad members from all athlete squads
- [ ] Members from multiple squads grouped by squad name (sub-labels, alphabetical squad order)
- [ ] Member rows: Avatar · Display Name · Squad Name
- [ ] Single-squad: squad name shown on rows (consistent format)
- [ ] Athlete's own account not shown in MY SQUAD
- [ ] Empty MY SQUAD (sole squad member): MY SQUAD section header omitted; supporting copy: "Your squad has no other members yet. Search for an athlete below."
- [ ] Members sorted alphabetically by Display Name within each squad group

### Search
- [ ] Search field always visible (not hidden until tapped)
- [ ] Search queries Display Name and Username simultaneously
- [ ] `@` prefix forces username-only search
- [ ] Typing filters MY SQUAD in real-time
- [ ] Non-squad results appear under OTHER ATHLETES only when search field has content
- [ ] Clearing search restores full MY SQUAD list and hides OTHER ATHLETES
- [ ] "No athletes found." shown when search returns no results

### OTHER ATHLETES Section
- [ ] "OTHER ATHLETES" section label with divider appears only during active search with non-squad results
- [ ] Non-squad rows show Display Name + "Requires approval" (no squad name)
- [ ] "Requires approval" persists on selected non-squad rows

### Selection
- [ ] Row tap toggles selection
- [ ] Checkmark appears on selected rows
- [ ] CTA disabled until ≥1 selection
- [ ] Up to 3 partners selectable
- [ ] 4th selection attempt: additional rows inactive
- [ ] Mixed squad + non-squad selections valid
- [ ] Selection persists during active search
- [ ] Selection resets on back navigation to S-2 (except when re-entering with active pre-association)
- [ ] Re-entry with active pre-association: prior selection restored; CTA active

### "Start Training Together" CTA
- [ ] Disabled state: grayed, not tappable
- [ ] Active state: Primary CTA color
- [ ] On tap: pre-association created, S-10 replaced by W-1 on stack, back from W-1 returns to S-2
- [ ] No toast or confirmation on success

### Pre-Association Lifecycle
- [ ] Pre-association persists through discarded workout
- [ ] Pre-association persists through app force-quit
- [ ] Pre-association expires after 24 hours without a completed workout
- [ ] Pre-association consumed on W-17 "Done"
- [ ] M-8/M-9 split evaluated at W-17 "Done" time, not at S-10 selection time

### Partner Indicator (W-9–W-16)
- [ ] "Training with [Name]" appears below Chapter Context Strip during active session
- [ ] Multiple partners: "Training with [Name] +[N]" format
- [ ] Indicator is non-tappable, read-only

### Empty and Error States
- [ ] Search network error: inline error + MY SQUAD remains functional
- [ ] Pre-association sync failure: local storage fallback, W-1 navigation not blocked

### Accessibility
- [ ] Screen announced as "Train Together"
- [ ] Invitation question announced as heading
- [ ] Selected rows announced as selected
- [ ] "Requires approval" included in non-squad row announcement
- [ ] CTA disabled state announced as dimmed
- [ ] Minimum 48pt touch height on all rows

### Non-Behaviors
- [ ] No live presence data shown
- [ ] No workout initiation on S-10
- [ ] No notification at selection time
- [ ] No partner performance data shown
- [ ] No more than 3 selections allowed

---

## 19. Decisions Record

| Decision | Value |
|----------|-------|
| S10-D1 — Screen type | Full screen (not bottom sheet) — consistent with navigation-stack entry from S-2 |
| S10-D2 — MY SQUAD scope | All squads the athlete belongs to, not limited to originating squad from S-2 |
| S10-D3 — Multi-squad grouping | Sub-labels within MY SQUAD section; alphabetical squad order; alphabetical member order within each group |
| S10-D4 — Search scope | Display Name + Username simultaneously; `@` prefix forces username-only (Identity Amendment 001 parity) |
| S10-D5 — Navigation after CTA | S-10 replaced by W-1 on the navigation stack; stack becomes `[... → S-2 → W-1]`; back from W-1 returns to S-2; S-10 not in back stack — Train Together intent is complete at CTA tap |
| S10-D6 — Re-entry with active pre-association | Prior selection state restored; athlete may modify; re-tapping CTA replaces prior pre-association |
| S10-D7 — "Requires approval" on W-20 | Not applicable to S-10; resolved in W-20 spec |
| S10-D8 — Empty single-member squad | MY SQUAD label shown + empty guidance copy; search-only workflow available |
| S10-D9 — Squad name on rows | Squad name always shown on member rows (consistent format regardless of squad count) |

---

## 20. Closure Record

### WwF Lifecycle Coverage

S-10 covers the full pre-workout partner selection flow:

| Phase | Coverage |
|-------|---------|
| Partner selection (S-10) | ✓ This document |
| Pre-association lifecycle (24h expiry, survival rules) | ✓ This document |
| Partner indicator during workout (W-9–W-16) | ✓ Defined in § 11.5 |
| W-17 Tier 4 pre-confirmed / pending partner display | ✓ Governed by WwF Spec v1.1 Section 5 |
| M-8/M-9 consent split at W-17 "Done" | ✓ Governed by WwF Spec v1.1 |

### Remaining WwF Screens

The following WwF-related screens remain as dedicated specs:
- **W-20 Partner Selection Sheet** — post-workout tagging from W-17 (companion to this document; see `Docs/Partner-Selection-Sheet-W20.md`)
- **M-8 WwF Claim/Dismiss** — squad member consent modal (part of Global Modal Library)
- **M-9 WwF Approve/Decline** — non-squad approval modal (part of Global Modal Library)

### Architecture Audit Issues Resolved

| Issue | Resolution |
|-------|----------|
| [C-06] Missing Spec: S-10 | ✓ Resolved — this document |

---

## 21. Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification — full S-10 Train Together Partner Selection architecture |
| v1.0 lock pass | June 2026 | Navigation model corrected: CTA now replaces S-10 with W-1 on stack (back from W-1 → S-2); prior spec used Workouts tab switch with Squads stack reset. Example wireframe rows updated: logged-in athlete removed from selectable squad member examples. Empty MY SQUAD behavior corrected: MY SQUAD section header now omitted when no members present; updated copy to "Your squad has no other members yet. Search for an athlete below." |

---

*S-10 Train Together Partner Selection — Wireframe Specification v1.0*
*Forge Legacy | June 2026*
