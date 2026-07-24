# P-8 Subscription — Wireframe Specification
## Screen Specification: Subscription Management
### June 2026

**Status:** LOCKED

**Type:** Screen Wireframe Specification

**Date:** June 2026

**Implements:** P-8-Subscription-Architecture.md v1.0 (LOCKED)

**Authority Chain:**
- P-8-Subscription-Architecture.md v1.0 (LOCKED) — resolved decisions, information architecture, state matrix
- Monetization-Architecture-Amendment-001 (LOCKED) — free/premium limits and benefits, downgrade behavior, Never Charge For History
- Critical-Decisions-Amendment-001 (LOCKED) — squad limit is 2, not 1
- M-7-Premium-Upsell-Spec.md (LOCKED) — "Upgrade" CTA hand-off contract, the second of P-8's two entry contexts
- P-4-Settings-Root-Architecture.md v1.0 (LOCKED) / P-4-Settings-Root-Wireframe-Spec.md v1.0 (LOCKED) — entry point, modal stack behavior, pushed-screen header convention, the first of P-8's two entry contexts

**Downstream Dependents:** None. P-8 has no child screens.

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Section 1 — Screen Purpose

P-8 Subscription is a **management surface, not a checkout**. It displays the athlete's current plan, the Free/Premium comparison (reusing Monetization Amendment 001's exact locked limits and benefits), current usage against free-tier limits, and the actions available to change plan state: Upgrade, Manage Subscription, and Restore Purchases. It does not execute a transaction itself — the actual purchase happens in the native platform purchase sheet, and plan changes/cancellation happen in native OS subscription settings. P-8 is the screen those native flows return to.

P-8 has exactly one job beyond display: routing the athlete to the correct native system at the correct moment. It never builds a substitute for what the platform already provides.

---

## Section 2 — Navigation Entry & Modal Context

P-8 has **two distinct, locked entry contexts**, both already established by other documents — this is not new scope, it is the dual-entry requirement P-8-Subscription-Architecture.md §2 and §5 already specified.

### 2.1 Entry via P-4 Settings Root

**P-4 Settings Root → Subscription row → P-8.**

- Pushes onto the same Profile modal navigation stack P-4 itself is on.
- Header: "‹ Subscription" — the same pushed-screen convention used by P-6 and P-1.1 Edit Profile. Tapping ‹ pops P-8 off the stack, returning to P-4.
- Handle bar drag / dimmed-area tap dismisses the entire Profile modal at any point, unchanged from existing behavior.

### 2.2 Entry via M-7 Premium Upsell

**M-7 (any trigger: W-4, S-1, L-15, W-1, etc.) → "Upgrade" tap → P-8.**

- Per M-7-Premium-Upsell-Spec.md §7.1: M-7 dismisses, and P-8 presents directly over the triggering surface. P-8 is **not** pushed onto the Profile modal stack in this context — the athlete never opened P-1 or P-4 to get here.
- Header: "Subscription" with a **[×] dismiss control** (top-right), not a back chevron — there is no "P-4" to return to in this context. Tapping [×] dismisses P-8 and returns to the original triggering surface (W-4, S-1, L-15, W-1, etc.), which then re-evaluates the relevant limit per M-7's own contract.
- P-8 presents as a standalone modal/full-screen sheet in this context, consistent with how M-7 itself presents.

### 2.3 Why Two Header Treatments

The dismiss affordance must match what's actually true about how the athlete arrived: a back chevron implies "there's a previous screen in this stack to return to" (true only via P-4); a close button implies "this is a self-contained surface, dismiss it" (true via M-7). Using the wrong affordance in either context would misrepresent the navigation state. This is the only visual difference between the two entry contexts — all content below (Section 3 onward) is identical regardless of entry point.

---

## Section 3 — Layout Structure

### 3.1 Loading / Checking Entitlement State

```
┌─────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                               │
├─────────────────────────────────────────────────┤
│  ‹ Subscription                      (or [×])    │
│                                                   │
│                                                   │
│                                                   │
│              [ neutral loading indicator ]        │
│                                                   │
│                                                   │
│                                                   │
└─────────────────────────────────────────────────┘
```

No plan comparison, usage, or action rows render until the entitlement check resolves. This is the only screen state where content is intentionally withheld.

### 3.2 Free State

```
┌─────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                               │
├─────────────────────────────────────────────────┤
│  ‹ Subscription                      (or [×])    │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  Current Plan                                    │
│  Free                                            │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  ┌────────────────────┬────────────────────┐    │
│  │       Free          │      Premium        │    │
│  ├────────────────────┼────────────────────┤    │
│  │ 3 programs          │ Unlimited programs  │    │
│  │ 50 photos            │ Unlimited photos    │    │
│  │ 2 squads             │ Unlimited squads    │    │
│  │ 1 lifetime import    │ Unlimited imports   │    │
│  └────────────────────┴────────────────────┘    │
│                                                   │
│  Everything you've already built is yours        │
│  — forever.                                      │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  Your Usage                                      │
│  Programs                          2 of 3        │
│  Photos                           38 of 50       │
│  Squads                            2 of 2        │
│  Import                              Used        │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  ┌─────────────────────────────────────────┐    │
│  │  Upgrade — [price from platform]          │    │
│  └─────────────────────────────────────────┘    │
│                                                   │
│  Restore Purchases                                │
│                                                   │
└─────────────────────────────────────────────────┘
```

### 3.3 Premium State

```
┌─────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                               │
├─────────────────────────────────────────────────┤
│  ‹ Subscription                      (or [×])    │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  Current Plan                                    │
│  Premium                                          │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  ✓ Unlimited programs                            │
│  ✓ Unlimited photos                              │
│  ✓ Unlimited squads                              │
│  ✓ Unlimited imports                             │
│                                                   │
│  Everything you've already built is yours        │
│  — forever.                                      │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  Manage Subscription                        →    │
│                                                   │
│  Restore Purchases                                │
│                                                   │
└─────────────────────────────────────────────────┘
```

### 3.4 Layout Notes

- **No marketing headline.** M-7's aspirational heading ("Build more. Keep everything.") is deliberately not reused here. M-7 is a gate moment; P-8 is a reference/management surface. Porting the gate's emotional framing onto a settings screen would blur that distinction. The reassurance line ("Everything you've already built is yours — forever.") *is* reused verbatim, because it restates a locked principle (Never Charge For History) — for a locked principle, reusing exact copy is correct; paraphrasing it differently in two places would be the error.
- **Plan comparison table appears only in the Free state.** In Premium, there is nothing to compare against — the athlete already has everything, so the screen confirms benefits directly rather than re-showing the Free column.
- **"Your Usage" appears only in the Free state**, per the architecture's transparency rationale (Section 3, Architecture doc) — Premium has no limits to be proximate to.
- **Price is never literal text in this spec.** "[price from platform]" is a placeholder representing a value read live from the platform's product catalog at runtime (e.g., StoreKit/Play Billing's localized price string). The exact format depends on the SDK's output and is not decided here.
- **Future, not-yet-built Premium benefits (AI, advanced analytics, premium legacy tools) never appear anywhere on this screen,** in either state.

---

## Section 4 — State Matrix

| State | Trigger | Content Shown | Available Actions |
|---|---|---|---|
| Loading / checking | Screen mount, before entitlement resolves | Neutral loading indicator only | None |
| Free | Entitlement resolves to no active premium | Plan comparison, reassurance line, usage review, platform-sourced price | Upgrade, Restore Purchases |
| Premium | Entitlement resolves to active premium | Benefits-unlocked list, reassurance line | Manage Subscription, Restore Purchases |
| Restore in progress | Athlete taps Restore Purchases | Brief inline loading indicator near the action, rest of screen unchanged | None until restore call resolves |
| Restore succeeded — entitlement found | Restore call returns an active entitlement | Screen transitions to Premium state; inline confirmation ("Purchase restored.") shown briefly | Manage Subscription, Restore Purchases |
| Restore succeeded — no entitlement found | Restore call returns no active entitlement | Inline message ("No previous purchases found."); screen remains in its current state (Free) | Upgrade, Restore Purchases |
| Restore failed | Network or platform error during restore | Inline error message; screen remains in its current state | Try again, plus whatever actions that state already offers |

---

## Section 5 — Behavior

### 5.0 Behavior Table

| Interaction | Behavior |
|---|---|
| Screen load | Entitlement check runs; Loading state shown until resolved, then Free or Premium renders |
| Tap Upgrade (Free state) | Native platform purchase sheet presents (OS-level) |
| Purchase completes successfully | Sheet dismisses; P-8 re-checks entitlement; transitions in place to Premium state; no navigation |
| Purchase cancelled in native sheet | Sheet dismisses; P-8 remains in Free state; no error shown |
| Purchase fails in native sheet | Native sheet owns its own error messaging; P-8 remains in Free state once dismissed |
| Tap Manage Subscription (Premium state) | Deep-links to native OS subscription settings; exits the app |
| Return to app after Manage Subscription | P-8 re-checks entitlement; updates displayed state if it changed |
| Tap Restore Purchases (either state) | Calls platform SDK restore function; brief inline loading indicator |
| Restore finds active entitlement | Transitions to Premium state; brief inline confirmation ("Purchase restored.") |
| Restore finds no entitlement | Inline message ("No previous purchases found."); stays in current state |
| Restore fails (network/platform error) | Inline error message; stays in current state; retry available |
| Tap ‹ (P-4 entry) | Pops P-8 off the modal stack, returns to P-4 |
| Tap [×] (M-7 entry) | Dismisses P-8, returns to the original triggering surface |

### 5.1 Upgrade (Free state only)

1. Tap "Upgrade" → the native platform purchase sheet presents (StoreKit / Play Billing). This is an OS-level presentation, not an in-app screen.
2. Athlete completes the purchase in the native sheet → sheet dismisses → P-8 re-checks entitlement → screen transitions in place to the Premium state. No navigation occurs; the athlete remains on P-8.
3. Athlete cancels the native sheet → sheet dismisses → P-8 remains in the Free state. Cancellation is not an error and produces no message.
4. Purchase fails (declined payment, etc.) → the native sheet owns its own error messaging. P-8 remains in the Free state once the sheet dismisses.

### 5.2 Manage Subscription (Premium state only)

1. Tap "Manage Subscription" → deep-links to the native OS subscription settings (iOS Settings → Subscriptions / Play Store → Subscriptions). This exits the Forge Legacy app.
2. No confirmation alert precedes this — it is navigation, not a destructive action.
3. When the athlete returns to Forge Legacy (app foregrounded again), P-8 re-checks entitlement in case the athlete changed or cancelled their subscription while in OS settings, and updates its displayed state accordingly.

### 5.3 Restore Purchases (always available, both states)

1. Tap "Restore Purchases" → calls the platform SDK's restore function.
2. Brief inline loading indicator appears near the action while the call is in progress.
3. Outcomes per the State Matrix (Section 4): entitlement found → transitions to Premium with confirmation; no entitlement found → inline message, stays Free; failure → inline error, stays in current state.

### 5.4 General

- P-8 never initiates any of the above automatically — every transition requires an explicit athlete tap.
- P-8 never displays or implies a "Downgrade" action. Downgrade happens only through the platform's native cancellation flow (reached via Manage Subscription), and Forge Legacy detects it passively via entitlement refresh — there is nothing for the athlete to tap on P-8 to downgrade directly.

---

## Section 6 — Navigation Table

| From | Action | To | Behavior |
|---|---|---|---|
| P-4 | Tap Subscription row | P-8 | Push onto Profile modal stack |
| M-7 | Tap "Upgrade" | P-8 | M-7 dismisses; P-8 presents over the triggering surface (not via P-4) |
| P-8 (via P-4 entry) | Tap ‹ | P-4 | Pop off the modal stack |
| P-8 (via M-7 entry) | Tap [×] | Triggering surface | Dismiss; triggering surface re-evaluates its limit per M-7's contract |
| P-8 | Tap Upgrade | — | Native platform purchase sheet (OS-level, not in-app) |
| P-8 | Tap Manage Subscription | — | Native OS subscription settings (external deep link, exits app) |
| P-8 | Tap Restore Purchases | — | No navigation; in-place state update only |
| P-8 (via P-4 entry) | Drag handle bar / tap dimmed area | — | Dismisses entire Profile modal, returns to originating tab |

P-8 has no child screens at any point in either entry context.

---

## Section 7 — Accessibility Requirements

| Element | accessibilityLabel | Notes |
|---|---|---|
| Back chevron (P-4 entry) | "Back" | "Returns to Settings" |
| Close button (M-7 entry) | "Close" | "Returns to your previous screen" |
| Current Plan value | "Current plan: Free" / "Current plan: Premium" | Read as static text |
| Plan comparison table | Each row read as "[Limit/benefit], Free: [value], Premium: [value]" | Table semantics preserved for screen readers |
| Usage rows | "[Category]: [used] of [limit]" | e.g., "Photos: 38 of 50" |
| Upgrade button | "Upgrade" | `accessibilityHint`: "Opens purchase options" |
| Manage Subscription row | "Manage Subscription" | `accessibilityHint`: "Opens subscription settings" |
| Restore Purchases | "Restore Purchases" | `accessibilityHint`: "Checks for previous purchases on this account" |
| Loading state | Announced as "Loading subscription status" | Standard loading-state accessibility |
| Inline confirmation/error messages | Announced automatically on appearance | Standard live-region behavior |

**Focus order:** Top to bottom, matching visual order in each state.

**Minimum tap targets:** Upgrade button, Manage Subscription row, and Restore Purchases all meet platform-standard minimum touch target size.

---

## Section 8 — Non-Behaviors

- P-8 has **no child screens**, in either entry context.
- P-8 builds **no custom checkout UI** — purchases happen exclusively in the native platform purchase sheet.
- P-8 builds **no custom cancel-flow or plan-change UI** — Manage Subscription deep-links to native OS settings; nothing is built in-app for this.
- P-8 invents **no monthly/annual plan choice** — a single SKU/cadence is assumed at MVP; this screen does not present a plan picker.
- P-8 contains **no hardcoded pricing** anywhere — every price shown is read live from the platform's product catalog.
- P-8 displays **no not-yet-built Premium benefits** (AI, advanced analytics, premium legacy tools) in either state.
- P-8 never gates, hides, or conditions access to any historical content (workouts, chapters, goals, honors, ranks, timeline, imported content) on subscription state — Never Charge For History is absolute and applies regardless of what P-8 displays.
- P-8 never shows a "Downgrade" action or implies the athlete can downgrade from within the app.
- P-8 never models or displays a separate "Premium — cancelling" state; the displayed state is binary (Free / Premium) and updates only when the entitlement actually changes.
- P-8 has **no empty states** beyond the Loading/checking state — Free and Premium states are always fully populated once entitlement resolves.
- P-8 does not reuse M-7's aspirational headline copy ("Build more. Keep everything.") — only the Never Charge For History reassurance line is shared verbatim.

---

## Section 9 — Validation Checklist

### Navigation Entry
- [ ] P-8 reachable via P-4 Settings Root → Subscription row (push onto modal stack, "‹ Subscription" header)
- [ ] P-8 reachable via M-7 "Upgrade" tap (presented over triggering surface, "Subscription" header with [×] dismiss)
- [ ] Back chevron used only in the P-4 entry context; close button used only in the M-7 entry context
- [ ] Dismissing P-8 always returns to wherever it was opened from

### Loading State
- [ ] No plan comparison, usage, or action content renders before entitlement resolves
- [ ] Neutral loading indicator shown during this state

### Free State
- [ ] Current Plan displays "Free"
- [ ] Plan comparison table shows exact locked limits: 3 programs, 50 photos, 2 squads, 1 lifetime import (Free) vs. unlimited equivalents (Premium)
- [ ] Reassurance line present verbatim: "Everything you've already built is yours — forever."
- [ ] Usage review shows current counts for programs, photos, squads, and import status
- [ ] Upgrade button present, displays platform-sourced price (never hardcoded)
- [ ] Restore Purchases present

### Premium State
- [ ] Current Plan displays "Premium"
- [ ] Benefits-unlocked list shown (unlimited programs/photos/squads/imports only — no future benefits)
- [ ] Reassurance line present verbatim
- [ ] No plan comparison table shown
- [ ] No usage review shown
- [ ] Manage Subscription present, deep-links to native OS subscription settings
- [ ] Restore Purchases present

### Upgrade Behavior
- [ ] Tapping Upgrade opens the native platform purchase sheet, not an in-app checkout
- [ ] Successful purchase transitions P-8 in place to Premium state, no navigation
- [ ] Cancelled purchase returns to Free state silently, no error
- [ ] Failed purchase shows no Forge-authored error — native sheet owns its own error messaging

### Manage Subscription Behavior
- [ ] Tapping Manage Subscription deep-links to native OS subscription settings
- [ ] No confirmation alert precedes this navigation
- [ ] Returning to the app re-checks entitlement and updates displayed state if changed

### Restore Purchases Behavior
- [ ] Available in both Free and Premium states
- [ ] Does not open a child screen
- [ ] Success with entitlement found transitions to Premium with inline confirmation
- [ ] Success with no entitlement found shows inline message, stays in current state
- [ ] Failure shows inline error, stays in current state

### Content Integrity
- [ ] No pricing is hardcoded anywhere in the spec or implied implementation
- [ ] No monthly/annual plan choice is presented
- [ ] No not-yet-built Premium benefit (AI, analytics, legacy tools) appears anywhere
- [ ] No historical content is gated, hidden, or conditioned on subscription state
- [ ] No "Downgrade" action exists anywhere on this screen

### Accessibility
- [ ] All interactive elements have accessibilityLabel and appropriate accessibilityHint per Section 7
- [ ] Focus order matches visual top-to-bottom order in every state
- [ ] Loading and inline confirmation/error messages are announced automatically

---

## Section 10 — Open Issues

**None blocking.** All decisions required to fully specify P-8 are resolved by P-8-Subscription-Architecture.md (LOCKED) and this document.

Carried forward, not blocking P-8:
- **Native billing integration approach** (direct StoreKit/Play Billing vs. third-party SDK) — engineering choice, outside this screen's scope.
- **Single SKU/cadence vs. monthly+annual** — no authorization exists for multi-cadence; this screen assumes a single SKU. A future business pricing decision could require a minor amendment if multi-cadence is ever authorized.
- **Exact pricing copy** — remains platform-sourced and dynamic; no literal price text exists in this spec.
- **Final naming/storage of the subscription entitlement state** — explicitly owned by backend/data architecture, not this screen.

---

## Change Log

*No entries. v1.0 LOCKED.*

---

*P-8 Subscription — Wireframe Specification*
*Screen Specification: Subscription Management*
*June 2026*
*Authority: P-8-Subscription-Architecture.md (LOCKED), Monetization-Architecture-Amendment-001 (LOCKED), Critical-Decisions-Amendment-001 (LOCKED), M-7-Premium-Upsell-Spec.md (LOCKED), P-4-Settings-Root-Architecture.md (LOCKED), P-4-Settings-Root-Wireframe-Spec.md (LOCKED)*
*Status: LOCKED*
