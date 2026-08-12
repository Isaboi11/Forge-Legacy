# M-7 Premium Upsell Sheet
## Modal Specification v1.1 | June 2026 · **revised 2026-08-12 (Amendment 003)**

**Status:** LOCKED
**Authority:** **Monetization Architecture Amendment 003 (LOCKED 2026-08-12 — governs every number here)**, Monetization Architecture Amendment 001, ~~Critical Decisions Amendment 001~~ *(Decision 4 superseded)*, Master PRD §18, MVP Architecture Audit [H-18]
**Closes:** Architecture Audit issue [H-18] — M-7 referenced but not specced
**Component contracts:** CLA-C20 (Modal), CLA-C08 (Button) — see [`Component-Library-Architecture-v1.0.md`](Component-Library-Architecture-v1.0.md)

> ## v1.1 — what changed on 2026-08-12
>
> | | v1.0 | **v1.1** |
> |---|---|---|
> | Photo cap | 50 | **75** (MA3-D8) |
> | Squad cap | 2 | **1** (MA3-D7 supersedes Critical Decisions Amdt 001 D4) |
> | Trigger count | 4 | **9** — adds Coach Holt programs, Holt single days, Holt in-workout, day templates, and persistent video |
> | Program cap scope | created | created, **generated, or received** (MA3-D10) |
> | Benefits list | 4 fixed rows | **4 rows selected from a canonical 6** — see §6.2 |
>
> **§10 (subscription-status failure) and §12 (non-behaviours) are unchanged and remain the hard rules.**
> The one addition to §12 is that M-7 **never offers Coach AI as the answer to a storage or creation
> limit** (MA3-D2).

---

## 1. Purpose

M-7 is the universal monetization gate for Forge Legacy. It fires when a free-tier athlete attempts an action that exceeds a free-tier limit. It is the single, consistent upgrade surface for all monetization gates — not a collection of feature-specific upsell screens.

M-7 appears at the natural conversion moment: the athlete has built something real, hit a creation or storage limit, and is shown what premium unlocks. At that moment, the athlete already understands the product's value. M-7 does not explain the product. It removes the ceiling.

**What M-7 is:**
- A centered modal overlay, consistent with the M-series modal family
- The single reusable upgrade surface for all free-tier limits
- Aspirational in tone — premium as expansion, not restriction
- Contextual — it names the specific limit reached via dynamic content injection
- Dismissible at any time via explicit "Not Now" action

**What M-7 is not:**
- A ceremony (it is not queued with M-1, M-3, or M-4)
- A bottom sheet
- A punishment or access restriction surface
- A pricing screen
- A checkout or subscription transaction surface
- Evidence that existing history or content is at risk

**Emotional tone:** Aspirational. The athlete has done enough to outgrow the free tier. That is a signal of real engagement, not a wall.

**Governing principle:** Forge Legacy monetizes creation beyond the free tier. It does not monetize history, identity, or access to what the athlete has already built. M-7 must reinforce this at every appearance.

---

## 2. Entry Points

M-7 fires at **nine** limit types *(four in v1.0; five added 2026-08-12)*. Each has one or more trigger screens. The action that triggers M-7 is blocked; the triggering surface is preserved behind the modal.

**Every check is a PRE-ACTION check.** M-7 fires *before* the flow opens — never as a dead end halfway through one. An athlete must never choose a photo, fill in a squad name, or build half a template and only then be told they cannot finish.

| Limit | Free Cap | Trigger Condition | Trigger Screen(s) | Action Blocked |
|-------|----------|-------------------|-------------------|----------------|
| Custom programs | **3 lifetime** | Athlete with 3 programs attempts to create, duplicate, generate, **or receive** a 4th | W-4 (Program Creation), W-5 (Fork/Duplicate), `program-builder`, `send-program` (**receipt side**), Coach Holt program generation | Program creation, fork, generation, or acceptance of a received program |
| Photos | **75** (account-wide) | Athlete with 75 stored photos attempts to add a 76th | Any photo upload surface (chapter detail, L-15, `add-photo`, Transformation Gallery) | Photo addition; **the picker does not open** |
| Squads | **1** | Athlete in 1 squad attempts to create or join a 2nd | S-1 (Squads Hub), S-3 (Squad Management — creation flow), `create-squad`, `join-squad`, squad invite acceptance | Squad creation, join, or invite acceptance |
| Import | 1 lifetime | Athlete with `hasUsedFreeImport: true` attempts a second import | W-2 (Programs Browse), L-5 (Chapter Creation), the import BottomSheet | Import flow; W-IM-1 does not open |
| **Holt — four-week programs** *(new)* | **1 lifetime** | Athlete who has used their lifetime Holt program requests another | `coach.tsx`, `src/domain/coach/` generation entry | Program generation; the goal/experience flow does not open |
| **Holt — single days** *(new)* | **2 per month** | Athlete with 0 days remaining this month requests another | `coach.tsx` single-day entry | Day generation |
| **Holt — in-workout help** *(new)* | **None on Free** | Free athlete opens Holt from inside an active workout | In-session Holt entry from `workout.tsx` | ⚠ **See §2.1 — this trigger is SUPPRESSED, not fired** |
| **Day templates** *(new)* | **5** | Athlete with 5 athlete-authored templates attempts a 6th | `templates.tsx`, W-26/W-27 | Template creation; the builder does not open |
| **Persistent video** *(new)* | **5** | Athlete with 5 stored persistent videos attempts a 6th | `useMediaPicker` (gallery, pinned, feed video) | Video selection; **the picker does not open** |

**Squad trigger count:** M-7 fires at the **2nd** squad attempt (free limit = **1** squad). **MA3-D7 supersedes Critical Decisions Amendment 001 Decision 4**, which had itself superseded Monetization Amendment 001's original 1-squad limit. The number has returned to where it started; the supersession chain is recorded in Critical Decisions Amendment 001 §Decision 4.

**Import trigger:** The boolean `hasUsedFreeImport: true` is set only on successful W-IM-4 confirmation. Abandoned or failed imports before W-IM-4 do not set the flag. M-7 fires when `hasUsedFreeImport: true` and any import entry CTA is tapped. *(W-1 is retired — `Workouts-Navigation-Amendment-001`. The import entry point's reassigned home is Master Status Decision Queue row 15, still open.)*

**Photo trigger:** The 75-photo limit is account-wide — not per chapter, not per program — and **Transformation Gallery entries share the same counter** (MA3-D8). When the account total reaches 75, any subsequent photo addition attempt fires M-7 regardless of which screen or section it originates from.

**Program trigger — three ways to consume a slot.** Built, generated by Holt, or **received from another athlete** (MA3-D10). **Slots do not reopen on delete** (MA3-D9), or the cap never fires for an athlete running one four-week block at a time. **Sending** a program is always free (MA3-D13) — the gate is on the recipient, and it fires on *their* device when they try to accept.

**Video trigger:** Persistent video only — gallery, pinned, and feed. **Squad check-ins never count and are uncapped on every tier** (MA3-D14); their media is pruned at 24 hours by migration `0141`, so they are not persistent storage. The 30-second duration cap is a product rule at every tier and is not a monetization gate.

### 2.1 ⚠ The in-workout Holt trigger does NOT fire M-7

**§12 forbids M-7 during an active workout (W-9 through W-16), and that rule is older, locked, and wins.**
The Holt in-workout limit is therefore enforced by **suppression, not by upsell**: on Free, the in-session
Holt entry point is **not rendered at all**. There is no tap that produces a modal, because there is no
control to tap.

**This is deliberate and it is the correct reading of both rules.** An upsell that interrupts a working set
is the single worst place in the product to ask for money, and it would break the concentration the whole
active-workout surface is designed to protect. The athlete discovers Holt-in-workout as a Premium benefit
on P-8 and in the Premium comparison — not by being stopped mid-set.

**Manual exercise substitution remains available to Free athletes during a workout** (MA3-D5). No athlete is
ever stranded mid-session by this rule.

---

## 3. Dependencies

The following screens must implement pre-action limit checks before proceeding. M-7 fires at the gate; the subsequent flow never opens.

| Screen | Limit to Check | Gate Point |
|--------|---------------|------------|
| W-4 (Program Creation) / `program-builder` | Program count ≥ 3 | Before opening creation form — athlete taps "Create Program" |
| W-5 (Program Fork/Duplicate) | Program count ≥ 3 | Before initiating fork — athlete taps "Duplicate Program" |
| **`send-program` — receipt side** *(new)* | Program count ≥ 3 | Before accepting a received program. **Fires on the recipient's device**, never the sender's |
| S-1 (Squads Hub) / `create-squad` | Squad membership count ≥ **1** | Before opening squad creation flow |
| S-3 (Squad Management) / `join-squad` | Squad membership count ≥ **1** | Before completing squad creation or join |
| Squad invite acceptance | Squad membership count ≥ **1** | Before accepting any squad invitation |
| W-2 (Programs Browse) | `hasUsedFreeImport: true` | Before navigating to W-IM-1 |
| L-5 (Chapter Creation) | `hasUsedFreeImport: true` | Before navigating to W-IM-1 |
| The import BottomSheet | `hasUsedFreeImport: true` | Before the sheet opens |
| Any photo upload surface / `add-photo` | Account-wide photo count ≥ **75** | **Before the picker opens** — not after a photo is chosen |
| **`coach.tsx` — program generation** *(new)* | Holt program allowance exhausted (1 lifetime) | Before the goal/experience flow opens |
| **`coach.tsx` — single day** *(new)* | Holt day allowance exhausted (0 of 2 left this month) | Before the day flow opens |
| **`templates.tsx`** *(new)* | Athlete-authored template count ≥ **5** | Before the template builder opens. **The 81 Forge templates are excluded from the count** |
| **`useMediaPicker`** *(new)* | Persistent video count ≥ **5** | Before the picker opens. **Squad check-ins are excluded from the count** |
| **In-workout Holt entry** *(new)* | Free tier | ⚠ **Not a gate — the control is not rendered.** See §2.1 |

**Counting rules that the gate implementations must honour, or the caps are wrong:**

| Counter | Includes | **Excludes** |
|---|---|---|
| Programs | Built · generated by Holt · **received from another athlete** | Nothing. **Deleted programs still count** (MA3-D9) |
| Photos | Chapter photos · **Transformation Gallery entries** · any other account photo | — |
| Videos | Gallery · pinned · feed | **Squad check-ins** (MA3-D14) |
| Day templates | Athlete-authored (W-26/W-27) | **The 81 Forge starter templates** |
| Squads | Created · joined | — |

**W-4 gap note:** W-4 (Program Creation Wireframe Spec v1.1) does not currently document the program-count limit gate. M-7 specification is the authoritative source for this behavior. W-4 must implement the pre-entry check: if `customProgramCount >= 3`, fire M-7 instead of opening the creation form. (Flagged as follow-up in Monetization Amendment 001 Section 11.)

**M-7 does not fire for premium-tier athletes.** Limit checks are bypassed when the athlete's subscription status is confirmed as premium.

---

## 4. Presentation Style

**Container:** Centered modal overlay.

- Fixed width (approximately 80% of screen width, subject to design implementation)
- Intrinsic height based on content; vertically centered on screen
- Dimmed background overlay; triggering surface visible and dimmed beneath
- Not a bottom sheet; not full-screen
- No drag handle
- No scrolling content (content fits within modal height)

**Dismissal:**
- "Not Now" text-link (always visible) → modal closes, triggering surface restored
- Tap-outside: **blocked** (consistent with all Forge Legacy modals)
- Drag gesture: **blocked** (no drag handle)
- Back button / gesture: **blocked**

Only the explicit "Not Now" text-link and the "Upgrade" primary CTA dismiss M-7. This is deliberate: the athlete must make a conscious choice — upgrade or not now.

---

## 5. Sheet Anatomy

```
┌─────────────────────────────────────────────────┐
│                                                 │
│           [ ◇  64dp premium mark ]              │  ← decorative, aria-hidden
│                                                 │
│           Build more. Keep everything.          │  ← 20sp, primary weight, centered
│                                                 │
│    You've reached your 3-program limit.         │  ← [trigger_reason], 14sp, secondary, centered
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│    ✓  Unlimited programs                        │  ← [trigger_feature] first
│    ✓  Unlimited photos                          │
│    ✓  5 squads                                  │  ← not "unlimited" — Premium's ceiling is 5
│    ✓  Unlimited imports                         │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│    Everything you've already built              │  ← reassurance line, 12sp, secondary, centered
│    is yours — forever.                          │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │                Upgrade                  │    │  ← primary CTA, full-width
│  └─────────────────────────────────────────┘    │
│                                                 │
│                  Not Now                        │  ← text-link, centered
│                                                 │
└─────────────────────────────────────────────────┘
```

### Element Descriptions

| Element | Specification |
|---------|--------------|
| Premium mark | 64dp decorative element, centered, aria-hidden. Visual design is an implementation decision; its role is to signal premium aspiration, not reward or ceremony. |
| Primary heading | "Build more. Keep everything." — 20sp, primary weight, centered. Fixed across all trigger contexts. |
| Trigger reason | [trigger_reason] — 14sp, secondary weight, centered. Dynamically injected per trigger. See § 6. |
| Horizontal dividers | Two dividers: one between trigger reason and benefits list, one between benefits list and reassurance line. |
| Benefits list | **Exactly four rows**, each prefixed with ✓. Decorative checkmarks, not interactive. [trigger_feature] appears first; the next three follow canonical order out of a canonical six. Every row must name something Premium actually delivers — **never Coach AI** (§6.4). See § 6. |
| Reassurance line | "Everything you've already built is yours — forever." — 12sp, secondary weight, centered. Fixed. Always present. |
| Primary CTA | "Upgrade" — full-width button, primary color. Active at all times. |
| Secondary link | "Not Now" — text-link, centered, 44pt minimum touch target. Active at all times. |

---

## 6. Dynamic Content Rules

M-7 is a single reusable modal. Two fields are injected per trigger: `trigger_reason` (a one-sentence explanation of why M-7 appeared) and `trigger_feature` (the first benefit row in the list, corresponding to the limit reached).

### 6.1 Injected Content Table

**⚠ No number in this table may be hardcoded in `src/` (MA3-D16).** Each `trigger_reason` is a template filled from the server-side cap configuration. The strings below show the value at launch; the copy must render whatever the config says, so that changing a cap costs a SQL update and not a release.

| Limit Trigger | `trigger_reason` | `trigger_feature` |
|---------------|-----------------|-------------------|
| Programs (4th attempt) | "You've reached your {n}-program limit." → *"You've reached your 3-program limit."* | "Unlimited programs" |
| Programs (4th, **received**) | "This program would be your {n+1}st — your limit is {n}." → *"This program would be your 4th — your limit is 3."* | "Unlimited programs" |
| Photos (76th attempt) | "You've reached your {n}-photo limit." → *"You've reached your 75-photo limit."* | "Unlimited photos" |
| Squads (2nd attempt) | "You've reached your {n}-squad limit." → *"You've reached your 1-squad limit."* | "5 squads" |
| Import (2nd attempt) | "You've used your one free import." | "Unlimited imports" |
| **Holt program** | "You've used your free Coach Holt program." | "Unlimited Coach Holt programs" |
| **Holt single day** | "You've used both Coach Holt days this month." | "Unlimited Coach Holt workouts" |
| **Day templates (6th)** | "You've reached your {n}-template limit." → *"You've reached your 5-template limit."* | "Unlimited day templates" |
| **Video (6th)** | "You've reached your {n}-video limit." → *"You've reached your 5-video limit."* | "Unlimited video" |

**Copy notes.** The squad `trigger_feature` reads **"5 squads"**, not "Unlimited squads" — Premium's squad ceiling is 5 (MA3-D7), and a benefits row promising something the tier does not deliver is a false claim on a purchase surface. The Holt rows say **"Coach Holt"**, never "AI" — Holt is a rules engine, and conflating him with the paid AI add-on is exactly the confusion MA3-D2 exists to prevent.

**A "You've reached your 1-squad limit" string reads awkwardly, and that is acceptable** — the alternative is a hand-written special case that stops tracking the configured value the first time the cap changes.

### 6.2 Benefits List Ordering

[trigger_feature] always occupies the first position. **Exactly four rows render.** The canonical order is now six entries long: **programs · photos · squads · imports · Coach Holt · day templates**. The triggered feature is removed from its canonical position and placed first; **the next three in canonical order follow**, and the remainder are not shown.

| Trigger | Benefits List (4 rows) |
|---------|---------------------|
| Programs | Unlimited programs · Unlimited photos · 5 squads · Unlimited imports |
| Photos | Unlimited photos · Unlimited programs · 5 squads · Unlimited imports |
| Squads | 5 squads · Unlimited programs · Unlimited photos · Unlimited imports |
| Imports | Unlimited imports · Unlimited programs · Unlimited photos · 5 squads |
| **Holt program / Holt day** | Unlimited Coach Holt programs *(or workouts)* · Unlimited programs · Unlimited photos · 5 squads |
| **Day templates** | Unlimited day templates · Unlimited programs · Unlimited photos · 5 squads |
| **Video** | Unlimited video · Unlimited programs · Unlimited photos · 5 squads |

**Four rows, not six.** M7-D5 chose four to show the complete premium picture without turning the modal into a feature list; six rows would need scrolling, which §4 forbids ("no scrolling content"). The triggered feature plus the three strongest benefits is the same shape v1.0 locked.

### 6.3 Future Triggers

M-7 is designed to be the universal premium gate. Future trigger types require only:
- A defined `trigger_reason` string, rendered from server-side config
- A defined `trigger_feature` label (or "Unlock premium features" if the feature does not map to a benefit row)

No structural change to M-7 is required for future triggers.

### 6.4 ⚠ Coach AI is NOT a benefit row, and never an answer to a limit

**MA3-D2 is binding on this modal.** Coach AI is a **separate concurrent subscription**, not a tier above Premium, and it raises **no limit in this specification**. Therefore:

- **Coach AI never appears in the benefits list.** Not as a fifth row, not as a teaser, not in small type. Every row in §6.2 is a thing Premium actually delivers.
- **Coach AI is never the `trigger_feature` for a storage or creation limit.** An athlete blocked on photos, squads, programs, templates, video or imports is offered Premium and nothing else.
- **A Premium athlete who reaches a Premium ceiling still sees a plain explanation, not an upsell** — Amendment 001 §5, unchanged. Coach AI does not raise that ceiling, so there is nothing to sell them.
- When Coach AI ships, it may be offered **only** at a Coach-AI-shaped moment (an AI capability the athlete asked for and does not hold), and P-8 must carry *"Coach AI is a separate subscription"* **above the buy button**, not in the terms.

---

## 7. CTA Behavior

### 7.1 "Upgrade"

| Condition | Behavior |
|-----------|---------|
| Online | M-7 dismisses; navigation proceeds to subscription management surface (P-8 or equivalent, defined in the P-series). The triggering surface is not navigated; it remains in its prior state. |
| Offline | Inline error appears below the reassurance line: "A connection is required to upgrade. Try again when online." M-7 stays open. "Not Now" remains available. |

**"Upgrade" does not execute a transaction.** It routes to the subscription management surface where the athlete completes the purchase. M-7 is a gate, not a checkout.

**Triggering surface after "Upgrade":** The triggering surface (W-4, S-1, etc.) is not navigated when the athlete taps "Upgrade." If the athlete upgrades and returns, the triggering surface should re-evaluate the limit — the athlete is now premium and the blocked action is now available.

### 7.2 "Not Now"

| Condition | Behavior |
|-----------|---------|
| Any | M-7 dismisses. The triggering surface is restored in its prior state, unchanged. The blocked action remains blocked (the athlete is still at the free-tier limit). |

"Not Now" always works — online or offline.

---

## 8. Navigation

### 8.1 Entry

M-7 opens as a centered modal over the triggering surface. The triggering surface is dimmed but visible. No navigation transition away from the triggering surface occurs.

### 8.2 Complete Navigation Map

| Trigger Source | Triggering Action | M-7 Opens Over | "Upgrade" → | "Not Now" → |
|---------------|------------------|----------------|-------------|-------------|
| W-4 / `program-builder` | "Create Program" with 3 existing programs | W-4 | Subscription management (P-8) | W-4, unchanged |
| W-5 (Program Fork) | "Duplicate Program" with 3 existing programs | W-5 origin surface | Subscription management (P-8) | W-5 origin surface, unchanged |
| **`send-program` (receipt)** | Accepting a received program with 3 existing programs | The receipt surface, **on the recipient's device** | Subscription management (P-8) | Receipt surface, unchanged; the program remains offered but unacceptable |
| S-1 (Squads Hub) / `create-squad` | "+ Create a Squad" with **1** squad membership | S-1 | Subscription management (P-8) | S-1, unchanged |
| S-3 / `join-squad` | Squad creation or join action with **1** squad membership | S-3 context | Subscription management (P-8) | S-3 context, unchanged |
| Squad invite accept | Accept invitation with **1** squad membership | Invite surface | Subscription management (P-8) | Invite surface, unchanged; invitation remains visible but unacceptable |
| W-2 (Programs Browse) | Import CTA with `hasUsedFreeImport: true` | W-2 | Subscription management (P-8) | W-2, unchanged |
| The import BottomSheet | Import entry with `hasUsedFreeImport: true` | The surface the sheet would have opened over | Subscription management (P-8) | That surface, unchanged; **the sheet never opens** |
| L-5 (Chapter Creation) | Import CTA with `hasUsedFreeImport: true` | L-5 | Subscription management (P-8) | L-5 restored in prior state (L-5 spec authority: "M-7 dismisses, L-5 restored") |
| Any photo surface / `add-photo` | Photo attempt with **75** stored photos | Triggering photo surface | Subscription management (P-8) | Triggering photo surface, unchanged; **the picker never opened** |
| **`coach.tsx`** | Program request with the lifetime allowance used, **or** day request with 0 of 2 left | `coach.tsx` | Subscription management (P-8) | `coach.tsx`, unchanged |
| **`templates.tsx`** | Template creation with 5 athlete-authored templates | `templates.tsx` | Subscription management (P-8) | `templates.tsx`, unchanged |
| **`useMediaPicker`** | Video selection with 5 persistent videos | The surface that invoked the picker | Subscription management (P-8) | That surface, unchanged; **the picker never opened** |
| ~~W-1 (Workouts Hub)~~ | — | — | — | **Removed — W-1 is retired** (`Workouts-Navigation-Amendment-001`). The import entry point's reassigned home is Master Status Decision Queue row 15, still open |
| **In-workout Holt** | — | — | — | **No row. The control is not rendered on Free** (M7-D13); M-7 never fires during W-9–W-16 |

### 8.3 No Other Navigation

M-7 does not navigate to any surface other than subscription management (on "Upgrade"). It does not navigate to a feature preview, a benefits landing page, or any other screen. "Not Now" always returns to the triggering surface.

---

## 9. Offline Behavior

| Scenario | Behavior |
|----------|---------|
| Athlete is offline when limit-triggering action is taken | M-7 opens normally. All content renders (static; no network required). |
| Athlete taps "Upgrade" while offline | Inline error below reassurance line: "A connection is required to upgrade. Try again when online." M-7 stays open. |
| Athlete taps "Not Now" while offline | M-7 dismisses; triggering surface restored. No error. |
| Athlete goes offline after M-7 is already open | "Upgrade" tap shows inline error. "Not Now" remains available. |
| Connectivity restores while M-7 is open | No automatic action. "Upgrade" becomes functional. Inline error clears if previously shown. |

---

## 10. Subscription Status Failure

If the system cannot verify subscription status (network failure, service error) when a limit-triggering action is attempted:

M-7 does **not** fire. The triggering surface shows an inline error at the gate point: "Unable to verify your subscription. Try again." The blocked action remains blocked until subscription status can be confirmed. The athlete may retry immediately.

This prevents incorrectly displaying an upsell to a premium athlete who happens to be offline or encountering a service error.

---

## 11. Accessibility

| Element | Accessibility Behavior |
|---------|----------------------|
| Modal | Announced as: "Premium upgrade available" |
| Overlay background | Not focusable; tap-outside blocked |
| Premium mark | `aria-hidden="true"` — decorative |
| Primary heading | Announced as heading: "Build more. Keep everything." |
| Trigger reason | Announced immediately after heading: "[trigger_reason text]" |
| Benefits list | Announced as list; each item: "Unlimited [feature]" |
| Reassurance line | Announced: "Everything you've already built is yours — forever." |
| "Upgrade" button | Announced as: "Upgrade, button" |
| "Not Now" link | Announced as: "Not Now" (minimum 44pt touch target) |
| Inline error (offline) | Announced as live region when it appears: "A connection is required to upgrade. Try again when online." |

**Focus behavior:**
- On open: focus set to primary heading or "Upgrade" button
- Focus is trapped within the modal while open
- On "Not Now": focus returns to the triggering CTA on the originating surface
- On "Upgrade": focus follows navigation to subscription management surface

**Minimum touch targets:**
- "Upgrade" button: full-width, 48pt minimum height
- "Not Now" link: 44pt minimum touch target area (may extend beyond visual text)

---

## 12. Non-Behaviors

M-7 does not and will never:

| Non-Behavior |
|-------------|
| Display pricing, subscription cost, or billing information |
| Display trial language, "Try free," or limited-time offer copy |
| Remove, hide, restrict, or reference any existing history, workout, chapter, photo, or program |
| Imply that existing content is at risk or will be affected by the athlete's choice |
| Execute or initiate a subscription transaction |
| Navigate to a feature preview or benefits landing page |
| Fire for premium-tier athletes |
| Fire during an active workout (W-9 through W-16) |
| Fire on W-17 load |
| Appear as a bottom sheet, full-screen view, or toast notification |
| Suppress "Not Now" under any condition |
| Block tap-outside in any way that prevents the "Not Now" path — "Not Now" is always available, even if tap-outside itself is blocked |
| Automatically re-open after dismissal. Each trigger event independently evaluates whether M-7 should appear. |
| Navigate the triggering surface while M-7 is open |
| Show "Upgrade" as disabled or inactive (it is always tappable; offline state produces inline error on tap) |
| Show a countdown, urgency indicator, or promotional language |
| Show squad, photo, chapter, goal, or program counts as pressure indicators |
| Navigate to subscription management without an explicit "Upgrade" tap |

---

## 13. Decision Record

| Decision | Value | Rationale |
|----------|-------|-----------|
| M7-D1 — Presentation style | Centered modal overlay | Consistent with M-1 through M-6. PRD §19 lists M-7 among the 9 global modals. Not a bottom sheet (which would signal a lower-weight interaction) and not full-screen (which would break the originating surface context). |
| M7-D2 — Dismissal model | "Not Now" text-link is the only dismissal path; tap-outside and back blocked | Consistent with all other Forge Legacy modals. The athlete must make a deliberate choice. "Not Now" is never suppressed — M-7 is not a trap. |
| M7-D3 — Dynamic content injection | Single reusable modal with injected `trigger_reason` and `trigger_feature` | Mirrors M-6's injection model. One component is less fragile and easier to extend for future premium gates. All four trigger types differ only in these two strings. |
| M7-D4 — Primary heading | "Build more. Keep everything." (fixed, not dynamic) | Aspirational without being promotional. "Build more" frames premium as expansion. "Keep everything" directly reinforces Never Charge For History. Works across all four trigger types without modification. |
| M7-D5 — Benefits display | All four premium benefits shown; triggered feature appears first | Showing the complete premium picture increases upgrade motivation beyond the single blocked action. Canonical order: custom programs, photos, squads, imports. Triggered feature moves to position 1. |
| M7-D6 — Reassurance line | "Everything you've already built is yours — forever." (fixed, always visible) | Never Charge For History is the foundational product guarantee. M-7 must state it explicitly — the athlete should never fear loss of their legacy when presented with an upgrade prompt. |
| M7-D7 — No pricing in MVP | No subscription cost, billing details, or trial language | Pricing is managed in Settings (P-series, not yet specced). Embedding pricing in M-7 creates a maintenance coupling and places commercial pressure on a moment that should feel aspirational. |
| M7-D8 — "Upgrade" destination | Subscription management surface (P-8 or equivalent, defined in P-series) | M-7 is a gate, not a checkout. The transaction belongs to a dedicated subscription management screen. This keeps M-7 reusable and independent of pricing logic. |
| M7-D9 — Offline behavior | Modal always displays; "Upgrade" produces inline error offline | Modal content is static and requires no network. Blocking display when offline would be incorrect. Only the upgrade navigation requires connectivity. |
| M7-D10 — Subscription status failure | M-7 does not fire; inline error at triggering surface | Displaying an upsell to a premium athlete with a service error is worse than blocking the action with an error. Trust is higher-priority than conversion at this moment. |
| ~~M7-D11~~ — Squad trigger count | ~~3rd squad attempt (free limit = 2 squads)~~ **SUPERSEDED 2026-08-12 → 2nd attempt, free limit = 1** | ~~Critical Decisions Amendment 001~~ **Monetization Amendment 003, MA3-D7**, which supersedes Critical Decisions Amendment 001 Decision 4 and returns the limit to its original value. |
| M7-D12 — "Upgrade" always tappable | "Upgrade" is never shown as disabled; offline produces inline error on tap | Consistent with M-5 and M-6 pattern: the action is tappable; connectivity failure surfaces as inline error. Greyed-out CTAs create confusion about whether premium is available. |
| **M7-D13** *(new 2026-08-12)* — In-workout Holt is suppressed, not gated | The Free in-session Holt entry point is **not rendered**; no tap produces M-7 | §12's ban on M-7 during an active workout is older and locked, and it wins. An upsell interrupting a working set is the worst possible place in the product to ask for money. The athlete learns Holt-in-workout is Premium from P-8, not from being stopped mid-set. Manual substitution stays free (MA3-D5). |
| **M7-D14** *(new 2026-08-12)* — Every cap number is injected from server config | `trigger_reason` is a template, not a literal | MA3-D16. A hardcoded "75" in copy makes the cap a release-blocking constant in a second place, and the two will drift. |
| **M7-D15** *(new 2026-08-12)* — Squad benefit row reads "5 squads", not "Unlimited squads" | Premium's squad ceiling is genuinely 5 | A benefits row on a purchase surface promising something the tier does not deliver is a false claim, not a rounding of copy. |
| **M7-D16** *(new 2026-08-12)* — Coach AI never appears on M-7 | Not a benefit row, never a `trigger_feature` for a storage or creation limit | MA3-D2. Coach AI is a concurrent subscription that raises no limit in this spec; offering it as the answer to a photo cap would be selling the wrong thing to solve the athlete's actual problem. |
| **M7-D17** *(new 2026-08-12)* — Received programs gate on the recipient | The block fires on the recipient's device at acceptance | MA3-D10 and MA3-D13 together: a program consumes the *recipient's* slot, and sending stays free. Gating the sender would tax the distribution surface. |

---

## 14. Validation Checklist

### Presentation and Container
- [ ] M-7 opens as a centered modal overlay (not bottom sheet, not full-screen)
- [ ] Triggering surface visible and dimmed beneath
- [ ] Tap-outside does not dismiss M-7
- [ ] Back button / back gesture does not dismiss M-7
- [ ] No drag handle present

### Dynamic Content
- [ ] `trigger_reason` matches the active trigger (programs / photos / squads / imports)
- [ ] `trigger_feature` matches the active trigger and appears first in benefits list
- [ ] Remaining three benefits appear in canonical order after [trigger_feature]
- [ ] All four benefits use "Unlimited" as specified in Monetization Amendment 001 Section 4

### Fixed Content
- [ ] Primary heading: "Build more. Keep everything." — present on all trigger types
- [ ] Reassurance line: "Everything you've already built is yours — forever." — always visible
- [ ] No pricing, billing details, or trial language present
- [ ] No urgency indicators, countdowns, or promotional copy present

### CTA Behavior
- [ ] "Upgrade" always active (never greyed; offline produces inline error on tap)
- [ ] "Upgrade" (online): M-7 dismisses; subscription management opens; triggering surface preserved
- [ ] "Upgrade" (offline): Inline error below reassurance line; M-7 stays open; "Not Now" available
- [ ] "Not Now" always visible and tappable on all trigger types
- [ ] "Not Now": M-7 dismisses; triggering surface restored unchanged
- [ ] No transaction or subscription action initiated from within M-7

### Navigation
- [ ] W-4 trigger: "Create Program" at 3-program limit fires M-7; W-4 does not open
- [ ] W-5 trigger: "Duplicate Program" at 3-program limit fires M-7; fork is not initiated
- [ ] S-1 trigger: Squad creation CTA at 2-squad limit fires M-7
- [ ] S-3 / squad invite trigger: Join or accept at 2-squad limit fires M-7
- [ ] W-1 / W-2 / L-5 import trigger: Import CTA with `hasUsedFreeImport: true` fires M-7
- [ ] Photo upload trigger: 51st photo attempt fires M-7; upload not initiated
- [ ] L-5 "Not Now" behavior: L-5 restored in prior state per L-5 spec authority
- [ ] Squad invite "Not Now": Invitation remains visible but unacceptable

### Limit Checks *(numbers revised 2026-08-12 — Amendment 003)*
- [ ] M-7 does not fire for premium-tier athletes
- [ ] **Every check is pre-action** — M-7 fires before the flow opens, never halfway through one
- [ ] Squad limit is **1** (2nd attempt triggers M-7) — **MA3-D7**, superseding Critical Decisions Amendment 001
- [ ] Photo limit is **75**, account-wide (not per-chapter), **Gallery entries included**; 76th attempt fires M-7 from any surface, **before the picker opens**
- [ ] Program limit is **3 lifetime**, counting built + generated + **received**; **deleted programs still count** (MA3-D9)
- [ ] A received program fires M-7 on the **recipient's** device; **sending is never blocked** (M7-D17)
- [ ] Day template limit is **5**; **the 81 Forge templates are excluded from the count**
- [ ] Persistent video limit is **5**; **squad check-ins are excluded from the count**
- [ ] Holt program allowance: **1 lifetime**, does not reopen on delete
- [ ] Holt day allowance: **2 per month**, refilling
- [ ] **In-workout Holt: the Free entry point is not rendered; no M-7 fires during a workout** (M7-D13)
- [ ] Import trigger: `hasUsedFreeImport: true` required; abandoned imports before W-IM-4 do not trigger
- [ ] **No cap number is hardcoded in `src/`** — every `trigger_reason` renders from server config (M7-D14)
- [ ] **Coach AI appears nowhere on M-7** — not a benefit row, not a `trigger_feature` (M7-D16)
- [ ] Squad benefit row reads **"5 squads"**, not "Unlimited squads" (M7-D15)

### Subscription Status Failure
- [ ] If subscription status cannot be verified: M-7 does not fire; inline error on triggering surface

### Offline
- [ ] M-7 displays fully when offline (no network required for rendering)
- [ ] "Upgrade" offline: inline error below reassurance line; modal stays open
- [ ] "Not Now" works offline without error

### Accessibility
- [ ] Modal announced as: "Premium upgrade available"
- [ ] Focus trapped within modal while open
- [ ] Focus set to heading or "Upgrade" on open
- [ ] Focus returns to triggering CTA on "Not Now"
- [ ] Premium mark is aria-hidden
- [ ] Benefits announced as list items
- [ ] Inline error announced as live region
- [ ] "Not Now" minimum 44pt touch target
- [ ] "Upgrade" minimum 48pt height

### Non-Behaviors
- [ ] No pricing or billing information displayed
- [ ] No existing history, photos, workouts, or chapters referenced as at risk
- [ ] M-7 does not fire during W-9 through W-16 (active workout)
- [ ] M-7 does not fire on W-17 load
- [ ] M-7 does not re-open automatically after dismissal
- [ ] Each subsequent trigger action independently evaluates whether M-7 fires

---

## 15. Closure Record

### Architecture Audit Issues Resolved

| Issue | Resolution |
|-------|----------|
| [H-18] M-7 (Premium Upsell Sheet) referenced but not specced | ✓ Resolved — this document is the full M-7 specification, closing the gap identified in the MVP Architecture Audit v1.0 |

### Monetization Gate Coverage

| Limit | M-7 Trigger | Specced |
|-------|------------|---------|
| Programs (4th attempt — built, generated, or received) | ✓ | ✓ |
| Photos (**76th** attempt) | ✓ | ✓ |
| Squads (**2nd** attempt) | ✓ | ✓ |
| Import (2nd attempt) | ✓ | ✓ |
| **Coach Holt program (2nd, lifetime)** *(v1.1)* | ✓ | ✓ |
| **Coach Holt single day (3rd this month)** *(v1.1)* | ✓ | ✓ |
| **Coach Holt in-workout** *(v1.1)* | **✗ — suppressed by design** | ✓ §2.1 / M7-D13 |
| **Day templates (6th)** *(v1.1)* | ✓ | ✓ |
| **Persistent video (6th)** *(v1.1)* | ✓ | ✓ |

### W-4 Gap Acknowledgment

W-4 (Program Creation Wireframe Spec v1.1) does not document the program-count limit gate. M-7 v1.0 is the authoritative source for this behavior. A follow-up amendment to W-4 is recommended before engineering implementation of the program creation gate.

---

## 16. Change Log

| Version | Date | Change |
|---------|------|--------|
| **v1.1** | **2026-08-12** | **Reconciled to Monetization Architecture Amendment 003.** Photo cap 50 → **75** (MA3-D8); squad cap 2 → **1** (MA3-D7, superseding Critical Decisions Amdt 001 D4 — M7-D11 struck). Five triggers added: Coach Holt programs, Holt single days, Holt in-workout, day templates, persistent video (4 → 9). Program cap now counts **generated and received** programs and does **not** reopen on delete. New §2.1: **in-workout Holt is suppressed, not gated** — §12's ban on M-7 during a workout wins (M7-D13). New §6.4: **Coach AI never appears on M-7** (M7-D16). Benefits list drawn from a canonical **six**, still rendering four; squad row reads "5 squads", not "unlimited" (M7-D15). All cap numbers now injected from server-side config rather than written as literals (M7-D14). Counting-exclusion table added: Forge templates and squad check-ins never count. W-1 references removed (retired by `Workouts-Navigation-Amendment-001`). |
| v1.0 | June 2026 | Initial specification. Closes Architecture Audit [H-18]. Defines universal premium gate for all four free-tier limits (programs, photos, squads, imports). Establishes dynamic content injection model, single reusable modal pattern, and Never Charge For History reassurance line. |

---

*M-7 Premium Upsell Sheet — Modal Specification v1.0*
*Forge Legacy | June 2026*
