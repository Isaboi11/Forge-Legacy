# M-6 Destructive Action Confirmation
## Modal Specification v1.0 | June 2026

**Status:** LOCKED
**Authority:** Forge-Legacy-Master-PRD.md §9, MVP-Architecture-Audit-v1.0.md, Chapter-Detail-Wireframe-Spec-L3-L4.md, Squad-Detail-Wireframe-Spec-S2.md, Squad-Management-Permissions-Spec-S3.md

---

## 1. Purpose

M-6 is the reusable destructive-action confirmation modal for Forge Legacy. It is a confirmation gate — not an execution engine. M-6 presents the consequence of an irreversible action to the athlete and collects an explicit confirmation or cancellation. The calling surface owns the deletion transaction entirely.

**What M-6 does:**
- Presents a consequence statement for an irreversible action
- Requires explicit confirmation before the caller may proceed
- Returns either a confirmed or cancelled outcome to the caller
- Surfaces connection errors when a network-dependent action is attempted offline

**What M-6 does not do:**
- Execute any deletion or removal (see § 11 Non-Behaviors)
- Own or manage any transaction
- Navigate the athlete away from the calling surface
- Fire notifications or write any data

**Design intent:** M-6 is a gate, not a punishment. The language is calm and factual — not alarming. The athlete made a deliberate choice to initiate a destructive action; M-6 confirms they understand the consequence before the caller proceeds.

---

## 2. Supported Use Cases

### 2.1 MVP Use Cases

| ID | Action | Caller | Headline | Body | CTA Label | Requires Network |
|----|--------|--------|----------|------|-----------|-----------------|
| M6-UC1 | Memory entry deletion | L-3 / L-4 | "Delete this memory?" | "This memory will be permanently removed from [Chapter Name]." | "Delete Memory" | No |
| M6-UC2 | Squad deletion | S-2 / S-3 | "Delete [Squad Name]?" | "This will permanently remove the squad for all [N] members. This cannot be undone." | "Delete Squad" | Yes |
| M6-UC3 | Leave Squad — last member | S-3 | "Leave and delete [Squad Name]?" | "You are the last member. Leaving will permanently delete this squad. This cannot be undone." | "Leave and Delete" | Yes |
| M6-UC4 | Squad member removal | S-3 | "Remove [Member Display Name]?" | "[Member Display Name] will be removed from [Squad Name]. They can only rejoin by invitation." | "Remove Member" | Yes |

**Copy authority:** The body copy for M6-UC1, M6-UC2, and M6-UC3 is locked in the caller specs (L-3/L-4 and S-2/S-3). Those specs are authoritative. M-6 defines the copy for M6-UC4 (squad member removal), which S-3 left as "confirmation req." without body copy.

### 2.2 Future Use Cases

The following actions have not yet been specified but must route to M-6 when they are:

| Future Action | Notes |
|---------------|-------|
| Account deletion | Referenced in PRD profile screens (P-2 onward); not yet spec'd |
| Accomplishment deletion | Flagged as undefined lifecycle in Architecture Audit |
| Program ended early | W-5 references "consequential irreversible action with its own dedicated path" — M-6 is the vehicle if no separate spec supersedes |

Any future irreversible deletion or removal must adopt M-6. No new modal may be invented for this purpose.

### 2.3 Actions That Do Not Use M-6

| Action | Why Not M-6 |
|--------|------------|
| Chapter sealing | M-5 (separate locked spec) |
| Reflection discard (L-6) | Inline confirmation sheet; not a global modal |
| Goal discard (G-3) | Inline confirmation; not a global modal |
| Workout discard (W-9–W-16) | Own double-confirmation defined in that spec |
| Reflection deletion | No delete path exists — reflections are permanently locked on submission |
| Goal deletion | No delete path on G-1; locked |
| Honor removal | Honors sealed in chapters cannot be removed |
| Program (graduated/ended) deletion | Permanent legacy records; cannot be deleted by design |

---

## 3. Dependencies

| File | Relationship |
|------|-------------|
| Chapter-Detail-Wireframe-Spec-L3-L4.md | Defines M6-UC1 (memory deletion); authoritative for body copy |
| Squad-Detail-Wireframe-Spec-S2.md | Defines M6-UC2 trigger path; authoritative for squad deletion body copy |
| Squad-Management-Permissions-Spec-S3.md | Defines M6-UC2, UC3, UC4 trigger paths; authoritative for UC2/UC3 body copy |
| Forge-Legacy-Master-PRD.md §9 | Names M-6 in the global modal inventory |
| MVP-Architecture-Audit-v1.0.md | Identifies M-6 in the modal workstream backlog |

---

## 4. Anatomy

### 4.1 Wireframe

```
┌────────────────────────────────────────────────┐
│                                                │
│  [Modal Headline]                              │  ← 16sp, primary weight, left-aligned
│                                                │
│  [Consequence copy]                            │  ← 14sp, secondary weight, left-aligned
│  [Injected body — entity name + scope]         │
│                                                │
│  [Inline error — visible only on error]        │  ← 13sp, error color, left-aligned
│  [Hidden when no error; takes no space]        │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │  [Destructive CTA Label]                 │  │  ← Full-width button, destructive color
│  └──────────────────────────────────────────┘  │
│                                                │
│                  Cancel                        │  ← Text-link, centered, standard color
│                                                │
└────────────────────────────────────────────────┘
```

**In-flight state (deletion executing):**

```
┌────────────────────────────────────────────────┐
│                                                │
│  [Modal Headline]                              │
│                                                │
│  [Consequence copy]                            │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │              ◌  (spinner)                │  │  ← Spinner replaces CTA label
│  └──────────────────────────────────────────┘  │
│                                                │
│                  Cancel                        │  ← Muted, non-tappable during flight
│                                                │
└────────────────────────────────────────────────┘
```

### 4.2 Element Table

| Element | Spec |
|---------|------|
| Modal type | Centered overlay modal |
| Width | Device-width minus standard horizontal margins |
| Background | Dimmed overlay; calling surface visible and dimmed behind modal |
| Drag handle | Absent (not a bottom sheet) |
| Headline | Injected per use case; 16sp, primary weight, left-aligned |
| Body copy | Injected per use case; 14sp, secondary weight, left-aligned |
| Inline error | Visible only on error; 13sp, error color, left-aligned; takes no layout space when hidden |
| Destructive CTA | Full-width button; destructive color styling; always tappable (see § 6) |
| Cancel | Text-link style; centered; standard color; 16sp |
| Spinner | Replaces CTA label text during in-flight state; centered in CTA button |

---

## 5. Dynamic Copy Rules

M-6 is a template. Each use case provides four values at the time of invocation:

| Slot | Type | Description | Example |
|------|------|-------------|---------|
| `headline` | String | Action question; injected as modal headline | "Delete this memory?" |
| `body` | String | Consequence statement; may include entity name, scope, member count | "This memory will be permanently removed from [Chapter Name]." |
| `ctaLabel` | String | Label for the destructive CTA | "Delete Memory" |
| `requiresNetwork` | Boolean | Whether the action requires a network connection to execute | `false` |

**Cancel label is not configurable.** It is always "Cancel" across all use cases.

### 5.1 Copy Format Rules

- **Headline:** Sentence case. Ends with "?". References the entity being acted on. Examples: "Delete this memory?", "Delete Iron Circle?", "Remove Alex Torres?"
- **Body:** Declarative sentence. Factual, not apologetic. States what will happen and to whom. Ends with ".". For high-consequence actions (multiple members affected), adds "This cannot be undone." as a second sentence.
- **CTA label:** Verb + noun. "Delete Memory," "Delete Squad," "Remove Member," "Leave and Delete." Never just "Delete" or "Confirm."

### 5.2 Registered Use Cases — Full Copy

**M6-UC1 — Memory Entry Deletion**
```
headline:         "Delete this memory?"
body:             "This memory will be permanently removed from [Chapter Name]."
ctaLabel:         "Delete Memory"
requiresNetwork:  false
```

**M6-UC2 — Squad Deletion**
```
headline:         "Delete [Squad Name]?"
body:             "This will permanently remove the squad for all [N] members. This cannot be undone."
ctaLabel:         "Delete Squad"
requiresNetwork:  true
```
[N] is the current member count at time of invocation. "for all 1 member" is valid copy when only the owner remains.

**M6-UC3 — Leave Squad (Last Member)**
```
headline:         "Leave and delete [Squad Name]?"
body:             "You are the last member. Leaving will permanently delete this squad. This cannot be undone."
ctaLabel:         "Leave and Delete"
requiresNetwork:  true
```

**M6-UC4 — Squad Member Removal**
```
headline:         "Remove [Member Display Name]?"
body:             "[Member Display Name] will be removed from [Squad Name]. They can only rejoin by invitation."
ctaLabel:         "Remove Member"
requiresNetwork:  true
```

---

## 6. CTA Behavior

### 6.1 Destructive CTA — All States

| State | Condition | CTA Appearance | CTA Tappable | Inline Error |
|-------|-----------|---------------|-------------|-------------|
| Default | Modal just opened | Destructive label, normal | Yes | Hidden |
| In-flight | Action executing | Spinner (no label) | No | Hidden |
| Online failure | Action failed (network/server error) | Destructive label, normal | Yes | Visible (failure message) |
| Offline — requiresNetwork=false | No connection, local action | Destructive label, normal | Yes | Hidden |
| Offline — requiresNetwork=true | No connection, network required | Destructive label, normal | Yes | Appears on tap |
| Post-error recovery | Athlete retries | Destructive label, normal | Yes | Clears on tap |

**The destructive CTA is always tappable.** For network-required actions attempted offline, tapping the CTA surfaces the inline connection error rather than pre-emptively disabling the button.

### 6.2 Offline Error Pattern (requiresNetwork = true)

When the destructive CTA is tapped while offline:
1. No deletion attempt is made
2. Inline error appears below body copy: "A connection is required to [action]. Try again when online."
3. CTA returns to its default active state (ready for retry)
4. Cancel remains active

The inline error clears automatically when the CTA is tapped again.

### 6.3 Failure Error Pattern (online, transaction fails)

When the deletion transaction fails after confirmation:
1. In-flight spinner resolves
2. Inline error appears below body copy: "Something went wrong. Try again."
3. CTA returns to its default active state (ready for retry)
4. Cancel remains active
5. Modal stays open — no data was changed

### 6.4 Cancel CTA

| State | Appearance | Tappable |
|-------|-----------|---------|
| Default | Text-link, standard color | Yes |
| In-flight | Text-link, muted | No |
| Post-error | Text-link, standard color | Yes |

Cancel tap dismisses M-6. No action is taken. No data is changed. Focus returns to the originating element on the calling surface.

---

## 7. Navigation

### 7.1 Entry

M-6 is triggered by the athlete initiating a destructive action on a calling surface. Example triggers:
- Swipe-to-delete on a memory entry (L-3/L-4)
- "Delete Squad" in squad settings (S-2/S-3)
- Tap "Remove" on a member row (S-3)

M-6 is always user-initiated. It is never auto-queued or auto-triggered.

### 7.2 Presentation

Centered modal overlay. The calling surface remains visible and dimmed behind the modal. M-6 appears over the current screen — it does not push a new navigation stack entry.

### 7.3 Dismissal

**M-6 can only be dismissed via explicit CTA tap.** There is no other dismissal path.

| Action | Result |
|--------|--------|
| Destructive CTA tap (success) | M-6 closes; caller executes deletion; calling surface updates |
| Destructive CTA tap (offline / failure) | M-6 stays open; inline error appears |
| Cancel tap | M-6 closes; no action; calling surface unchanged |
| Tap on dimmed background | No action — M-6 stays open |
| Drag gesture | No action — M-6 stays open |
| Hardware back (Android) | No action — M-6 stays open |

### 7.4 After Confirmed Deletion

M-6 closes. The caller executes the deletion transaction. The caller is responsible for:
- Removing the deleted entity from the UI
- Navigating the athlete if the current surface no longer exists (e.g., squad deleted — exit to squads hub)
- Showing any post-deletion feedback (toast, empty state, etc.)

M-6 takes no action after dismissal.

---

## 8. Edge Cases

### 8.1 Entity Already Deleted

If the target entity was deleted by another client or session before M-6 is confirmed:
- The caller's deletion transaction will return an error or no-op
- M-6 surfaces the failure error pattern (§ 6.3)
- The caller resolves the stale state on dismissal

M-6 does not attempt to detect or pre-validate whether the entity still exists.

### 8.2 Concurrent Deletion

If the same entity is being deleted simultaneously by another session (e.g., squad owner deletes squad while another member is also viewing it):
- The first successful transaction wins
- The second caller receives an error, which M-6 surfaces via the failure error pattern
- M-6 does not detect or coordinate concurrent operations

### 8.3 Re-opening M-6

If the athlete cancels M-6 and then initiates the same destructive action again, M-6 opens fresh:
- No state persists from the previous invocation
- Inline error is hidden
- CTA is in its default active state

### 8.4 Multiple Destructive Actions in Sequence

M-6 handles one confirmation at a time. If an athlete needs to confirm two separate deletions (e.g., removing two squad members), each triggers a separate M-6 invocation in sequence. M-6 does not support batching.

### 8.5 Invocation While Offline — requiresNetwork = false

For actions that do not require a network connection (M6-UC1, memory deletion):
- M-6 opens and operates normally offline
- The caller executes the local deletion on confirmation
- No connection error is surfaced

---

## 9. Accessibility

| Element | Accessibility Behavior |
|---------|----------------------|
| Modal | Announced as modal: "[Headline text]" (e.g., "Delete this memory?") |
| Headline | Announced as heading |
| Body copy | Announced as static text |
| Inline error | Announced as live region when it appears; reads error message aloud |
| Destructive CTA | Announced as: "[CTA Label], button" |
| Cancel | Announced as: "Cancel, button" |
| In-flight spinner | CTA announced as: "Loading" during in-flight state |
| Dimmed background | Not focusable; no accessible action |

**Focus behavior:**
- On open: Focus set to the destructive CTA
- Focus is trapped within the modal while open
- On dismiss (confirm or cancel): Focus returns to the element that triggered M-6 on the calling surface

**Minimum touch targets:**
- Destructive CTA: Full-width button, minimum 48pt height
- Cancel text-link: Accessible tap area extended to minimum 44pt height

**Contrast:** Destructive CTA label must meet minimum contrast ratio on its destructive color background. Inline error text meets minimum contrast ratio on modal background.

---

## 10. Performance Requirements

| Metric | Target |
|--------|--------|
| Time from trigger to modal visible | < 200ms |
| In-flight spinner appearance after CTA tap | Immediate (< 50ms) |
| Inline error appearance after offline tap | < 100ms |
| Modal animation | Standard Forge Legacy modal entrance animation |

---

## 11. Non-Behaviors

M-6 does not and will never:

| Non-Behavior |
|-------------|
| **Perform any deletion or removal** — the caller owns the deletion transaction entirely; M-6 only gathers confirmation and returns a confirmed/cancelled outcome |
| Write any data to any storage layer |
| Navigate the athlete away from the calling surface |
| Fire notifications |
| Dismiss on tap of the dimmed background |
| Dismiss on drag gesture |
| Dismiss on hardware back (Android) |
| Disable the destructive CTA when the athlete is offline — tapping surfaces the inline error instead |
| Show warning icons, alert icons, or decorative imagery |
| Use congratulatory, apologetic, or alarming language |
| Support batch deletions (one confirmation per action) |
| Persist state between invocations |
| Auto-queue alongside ceremony modals (M-1 through M-4) |
| Show secondary navigation links (M-1/M-3/M-4 pattern) — M-6 is not a ceremony modal |
| Allow the cancel label to be configured by the caller |
| Provide undo functionality |
| Show a countdown or delay before confirming |
| Require a second confirmation step within itself |

---

## 12. Decision Record

| Decision | Value | Rationale |
|----------|-------|-----------|
| M6-D1 — Single template | M-6 is one template with dynamic copy injection, not multiple fixed variants | Severity differences expressed through copy weight ("This cannot be undone."), not structural variants. Keeps the modal library simple. |
| M6-D2 — No warning icon | No icon present | Consistent with M-1 through M-5, which use no icons or use aria-hidden decorative elements. Forge Legacy communicates gravity through copy tone and CTA styling, not iconography. A warning icon would introduce a gamification/alert pattern inconsistent with the product's visual language. |
| M6-D3 — Destructive CTA uses destructive color | Full-width button in destructive color | S-2 and S-3 (locked) establish "destructive text color" as an existing Forge Legacy design token for Leave Squad / Delete Squad. M-6's primary CTA adopts this token as a full-width button. This is the appropriate divergence from ceremony modals (M-1–M-4), which use primary positive color. |
| M6-D4 — Cancel label is always "Cancel" | Not configurable | M-5 uses "Not yet" because sealing is a positive but permanent ceremony. For destructive removals, "Cancel" is universally clear and scales across all use cases without per-use-case label variation. |
| M6-D5 — Tap-outside does not dismiss | No tap-outside dismissal | Consistent with all Forge Legacy modals (M-1 through M-5). Accidental dismissal of a destructive confirmation via background tap would be a serious UX failure. Explicit CTA required. |
| M6-D6 — CTA always tappable offline | Tapping while offline surfaces error; no pre-emptive disable | Pre-emptive disabling requires the modal to know the network state at open time and react to network changes while open. Tap-to-reveal is simpler, more consistent with error-pattern conventions, and avoids creating a permanently blocked state if network drops mid-session. |
| M6-D7 — Offline behavior is caller-declared | Caller passes requiresNetwork flag | Some destructive actions (memory deletion) work on local data. Others (squad operations) require server writes. M-6 cannot determine this from context; the caller declares it via requiresNetwork. |
| M6-D8 — Caller owns the deletion transaction | M-6 returns confirmation; caller executes | M-6 is a reusable gate. Tying transaction logic to the modal would require each use case to extend the modal. Returning a simple confirmed/cancelled outcome keeps M-6 stateless and caller-agnostic. |
| M6-D9 — No secondary navigation links | Absent | Secondary links appear on ceremony modals (M-1/M-3/M-4) as post-ceremony navigation affordances. M-6 is a confirmation gate, not a celebration. There is no natural destination to navigate to after a deletion confirmation. |
| M6-D10 — M5 is the structural reference | M-6 follows M-5 anatomy patterns | M-5 (Chapter Sealing) is the closest existing modal — user-initiated, consequence-focused, inline error pattern, no secondary links. M-6 inherits this structure and diverges where deletion differs from sealing (CTA color, copy tone). |
| M6-D11 — Squad member removal copy defined here | "Remove [Member Display Name]?" / "[Member Display Name] will be removed from [Squad Name]. They can only rejoin by invitation." | S-3 (locked) marks member removal as "confirmation req." but does not provide body copy. M-6 defines this as M6-UC4 since it is a new use case, not a redefinition of locked S-3 behavior. |

---

## 13. Validation Checklist

### Modal Presentation
- [ ] M-6 opens as a centered overlay modal, not a bottom sheet
- [ ] Calling surface is visible and dimmed behind the modal
- [ ] Drag-down gesture does not dismiss the modal
- [ ] Tap on dimmed background does not dismiss the modal
- [ ] Hardware back (Android) does not dismiss the modal

### Copy Injection
- [ ] Headline text matches the registered use case for the triggering action
- [ ] Body copy matches the registered use case; entity names injected correctly
- [ ] CTA label matches the registered use case
- [ ] Cancel label is always "Cancel" regardless of use case

### Destructive CTA
- [ ] CTA uses destructive color styling
- [ ] CTA is full-width
- [ ] CTA is tappable in all non-in-flight states (including offline)
- [ ] Tapping CTA while online + requiresNetwork=false: action proceeds
- [ ] Tapping CTA while online + requiresNetwork=true: action proceeds
- [ ] Tapping CTA while offline + requiresNetwork=false: action proceeds locally
- [ ] Tapping CTA while offline + requiresNetwork=true: inline error appears; no action taken
- [ ] CTA shows spinner during in-flight state
- [ ] CTA is non-tappable during in-flight state

### Cancel CTA
- [ ] Cancel is always visible
- [ ] Cancel is a text-link style (no button styling)
- [ ] Cancel tap dismisses modal without taking any action
- [ ] Cancel is muted and non-tappable during in-flight state
- [ ] Cancel returns to active state after error

### Inline Error
- [ ] Inline error is hidden when no error exists (takes no layout space)
- [ ] Offline error appears below body copy after CTA tap (requiresNetwork=true, offline)
- [ ] Offline error text: "A connection is required to [action]. Try again when online."
- [ ] Failure error appears below body copy on transaction failure
- [ ] Failure error text: "Something went wrong. Try again."
- [ ] Inline error clears when CTA is tapped again

### In-Flight State
- [ ] Spinner appears in CTA button; label text is hidden
- [ ] Modal stays open during in-flight state
- [ ] Cancel is muted and non-tappable during in-flight state

### Caller Responsibility
- [ ] Deletion transaction is not executed by M-6
- [ ] M-6 returns confirmed/cancelled outcome to caller
- [ ] Caller handles UI update after confirmed deletion
- [ ] Caller handles navigation if calling surface no longer exists

### Accessibility
- [ ] Modal announced with headline text
- [ ] Focus set to destructive CTA on open
- [ ] Focus trapped within modal while open
- [ ] Focus returns to triggering element on dismiss
- [ ] Inline error announced as live region when it appears
- [ ] All interactive elements meet 44pt minimum touch target

### Non-Behaviors
- [ ] M-6 writes no data
- [ ] M-6 fires no notifications
- [ ] M-6 does not navigate the athlete
- [ ] M-6 shows no warning icons
- [ ] M-6 shows no secondary navigation links
- [ ] M-6 does not disable the destructive CTA when offline

---

## 14. Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification — establishes M-6 as the reusable destructive confirmation pattern; defines four MVP use cases; closes Architecture Audit modal workstream |

---

*M-6 Destructive Action Confirmation — Modal Specification v1.0*
*Forge Legacy | June 2026*
