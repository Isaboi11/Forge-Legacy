# M-7 Premium Upsell Sheet
## Modal Specification v1.0 | June 2026

**Status:** LOCKED
**Authority:** Monetization Architecture Amendment 001, Critical Decisions Amendment 001, Master PRD §18, MVP Architecture Audit [H-18]
**Closes:** Architecture Audit issue [H-18] — M-7 referenced but not specced

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

M-7 fires at four limit types. Each has one or more trigger screens. The action that triggers M-7 is blocked; the triggering surface is preserved behind the modal.

| Limit | Free Cap | Trigger Condition | Trigger Screen(s) | Action Blocked |
|-------|----------|-------------------|-------------------|----------------|
| Custom programs | 3 | Athlete with 3 programs attempts to create or duplicate a 4th | W-4 (Program Creation), W-5 (Program Fork/Duplicate) | Program creation or fork; W-4 form does not open; W-5 fork is not initiated |
| Photos | 50 (account-wide) | Athlete with 50 stored photos attempts to add a 51st | Any photo upload surface (chapter detail, L-15, or equivalent) | Photo addition; upload is not initiated |
| Squads | 2 | Athlete in 2 squads attempts to create or join a 3rd | S-1 (Squads Hub), S-3 (Squad Management — creation flow), squad invite acceptance | Squad creation, join, or invite acceptance |
| Import | 1 lifetime | Athlete with `hasUsedFreeImport: true` attempts a second import | W-1 (Workouts Hub), W-2 (Programs Browse), L-5 (Chapter Creation) import entry CTAs | Import flow; W-IM-1 does not open |

**Squad trigger count:** M-7 fires at the 3rd squad attempt (free limit = 2 squads). Critical Decisions Amendment 001 supersedes Monetization Amendment 001's original 1-squad limit.

**Import trigger:** The boolean `hasUsedFreeImport: true` is set only on successful W-IM-4 confirmation. Abandoned or failed imports before W-IM-4 do not set the flag. M-7 fires when `hasUsedFreeImport: true` and any import entry CTA is tapped.

**Photo trigger:** The 50-photo limit is account-wide — not per chapter, not per program. When account total = 50, any subsequent photo addition attempt fires M-7 regardless of which screen or section the attempt originates from.

---

## 3. Dependencies

The following screens must implement pre-action limit checks before proceeding. M-7 fires at the gate; the subsequent flow never opens.

| Screen | Limit to Check | Gate Point |
|--------|---------------|------------|
| W-4 (Program Creation) | Custom program count ≥ 3 | Before opening creation form — athlete taps "Create Program" |
| W-5 (Program Fork/Duplicate) | Custom program count ≥ 3 | Before initiating fork — athlete taps "Duplicate Program" |
| S-1 (Squads Hub) | Squad membership count ≥ 2 | Before opening squad creation flow |
| S-3 (Squad Management) | Squad membership count ≥ 2 | Before completing squad creation or join |
| Squad invite acceptance | Squad membership count ≥ 2 | Before accepting any squad invitation |
| W-1 (Workouts Hub) | `hasUsedFreeImport: true` | Before navigating to W-IM-1 |
| W-2 (Programs Browse) | `hasUsedFreeImport: true` | Before navigating to W-IM-1 |
| L-5 (Chapter Creation) | `hasUsedFreeImport: true` | Before navigating to W-IM-1 |
| Any photo upload surface | Account-wide photo count ≥ 50 | Before initiating photo upload |

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
│    ✓  Unlimited custom programs                 │  ← [trigger_feature] first
│    ✓  Unlimited photos                          │
│    ✓  Unlimited squads                          │
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
| Benefits list | Four rows, each prefixed with ✓. Decorative checkmarks, not interactive. [trigger_feature] appears first; remaining three follow canonical order. See § 6. |
| Reassurance line | "Everything you've already built is yours — forever." — 12sp, secondary weight, centered. Fixed. Always present. |
| Primary CTA | "Upgrade" — full-width button, primary color. Active at all times. |
| Secondary link | "Not Now" — text-link, centered, 44pt minimum touch target. Active at all times. |

---

## 6. Dynamic Content Rules

M-7 is a single reusable modal. Two fields are injected per trigger: `trigger_reason` (a one-sentence explanation of why M-7 appeared) and `trigger_feature` (the first benefit row in the list, corresponding to the limit reached).

### 6.1 Injected Content Table

| Limit Trigger | `trigger_reason` | `trigger_feature` |
|---------------|-----------------|-------------------|
| Custom programs (4th attempt) | "You've reached your 3-program limit." | "Unlimited custom programs" |
| Photos (51st attempt) | "You've reached your 50-photo limit." | "Unlimited photos" |
| Squads (3rd attempt) | "You've reached your 2-squad limit." | "Unlimited squads" |
| Import (2nd attempt) | "You've used your one free import." | "Unlimited imports" |

### 6.2 Benefits List Ordering

[trigger_feature] always occupies the first position. The remaining three benefits follow canonical order (the full canonical order is: custom programs, photos, squads, imports). The triggered feature is removed from its canonical position and placed first; the remaining three maintain their relative order.

| Trigger | Benefits List Order |
|---------|---------------------|
| Programs | Unlimited custom programs · Unlimited photos · Unlimited squads · Unlimited imports |
| Photos | Unlimited photos · Unlimited custom programs · Unlimited squads · Unlimited imports |
| Squads | Unlimited squads · Unlimited custom programs · Unlimited photos · Unlimited imports |
| Imports | Unlimited imports · Unlimited custom programs · Unlimited photos · Unlimited squads |

### 6.3 Future Triggers

M-7 is designed to be the universal premium gate. Future trigger types (AI features, advanced analytics, premium legacy tools) require only:
- A defined `trigger_reason` string
- A defined `trigger_feature` label (or "Unlock premium features" if the feature does not map to one of the four benefit rows)

No structural change to M-7 is required for future triggers.

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
| W-4 (Program Creation) | "Create Program" with 3 existing programs | W-4 | Subscription management (P-8) | W-4, unchanged |
| W-5 (Program Fork) | "Duplicate Program" with 3 existing programs | W-5 origin surface | Subscription management (P-8) | W-5 origin surface, unchanged |
| S-1 (Squads Hub) | "+ Create a Squad" with 2 squad memberships | S-1 | Subscription management (P-8) | S-1, unchanged |
| S-3 (Squad creation/join) | Squad creation or join action with 2 squad memberships | S-3 context | Subscription management (P-8) | S-3 context, unchanged |
| Squad invite accept | Accept invitation with 2 squad memberships | Invite surface | Subscription management (P-8) | Invite surface, unchanged; invitation remains visible but unacceptable |
| W-1 (Workouts Hub) | Import CTA with `hasUsedFreeImport: true` | W-1 | Subscription management (P-8) | W-1, unchanged |
| W-2 (Programs Browse) | Import CTA with `hasUsedFreeImport: true` | W-2 | Subscription management (P-8) | W-2, unchanged |
| L-5 (Chapter Creation) | Import CTA with `hasUsedFreeImport: true` | L-5 | Subscription management (P-8) | L-5 restored in prior state (L-5 spec authority: "M-7 dismisses, L-5 restored") |
| Any photo upload surface | Photo upload attempt with 50 stored photos | Triggering photo surface | Subscription management (P-8) | Triggering photo surface, unchanged |

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
| M7-D11 — Squad trigger count | 3rd squad attempt (free limit = 2 squads) | Critical Decisions Amendment 001 supersedes Monetization Amendment 001's original 1-squad limit. Authority: Critical Decisions Amendment 001, Decision 4 (June 2026). |
| M7-D12 — "Upgrade" always tappable | "Upgrade" is never shown as disabled; offline produces inline error on tap | Consistent with M-5 and M-6 pattern: the action is tappable; connectivity failure surfaces as inline error. Greyed-out CTAs create confusion about whether premium is available. |

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

### Limit Checks
- [ ] M-7 does not fire for premium-tier athletes
- [ ] Squad limit is 2 (3rd attempt triggers M-7) — Critical Decisions Amendment 001 authority
- [ ] Photo limit is account-wide (not per-chapter); 51st attempt fires M-7 from any surface
- [ ] Import trigger: `hasUsedFreeImport: true` required; abandoned imports before W-IM-4 do not trigger

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
| Custom programs (4th attempt) | ✓ | ✓ |
| Photos (51st attempt) | ✓ | ✓ |
| Squads (3rd attempt) | ✓ | ✓ |
| Import (2nd attempt) | ✓ | ✓ |

### W-4 Gap Acknowledgment

W-4 (Program Creation Wireframe Spec v1.1) does not document the program-count limit gate. M-7 v1.0 is the authoritative source for this behavior. A follow-up amendment to W-4 is recommended before engineering implementation of the program creation gate.

---

## 16. Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification. Closes Architecture Audit [H-18]. Defines universal premium gate for all four free-tier limits (programs, photos, squads, imports). Establishes dynamic content injection model, single reusable modal pattern, and Never Charge For History reassurance line. |

---

*M-7 Premium Upsell Sheet — Modal Specification v1.0*
*Forge Legacy | June 2026*
