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

**Amendment Log:** v1.0 LOCKED (June 2026). **v1.1 — 2026-08-12: Open Issue #2 resolved.** Section 11 added (plan picker: annual pre-selected, monthly, Founder while seats remain, lifetime; the *"Coach AI is a separate subscription"* disclosure above the buy button; RevenueCat). §8's single-SKU non-behaviour superseded by P8W-D1. Free-tier numbers reconciled to **Monetization Architecture Amendment 003**: photos 50 → **75**, squads 2 → **1**, Premium squads → **5**, Coach Holt rows added. All figures now read from server-side cap configuration (MA3-D16).

**Additional authority (v1.1):** `Monetization-Architecture-Amendment-003-Add-On-Tier-And-Launch-Limits.md` (LOCKED 2026-08-12) — governs every number on this screen; supersedes Critical-Decisions-Amendment-001 Decision 4.

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
│  │ 75 photos            │ Unlimited photos    │    │
│  │ 1 squad              │ 5 squads            │    │
│  │ 1 lifetime import    │ Unlimited imports   │    │
│  │ 1 Holt program       │ Unlimited Holt      │    │
│  │ 2 Holt days / month  │ Holt in your workout│    │
│  └────────────────────┴────────────────────┘    │
│                                                   │
│  Everything you've already built is yours        │
│  — forever.                                      │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  Your Usage                                      │
│  Programs                          2 of 3        │
│  Photos                           38 of 75       │
│  Squads                            1 of 1        │
│  Import                              Used        │
│  Coach Holt programs                 Used        │
│  Coach Holt days                   1 of 2        │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│         [ PLAN PICKER — see Section 11 ]         │
│                                                   │
│  The app and your legacy, forever.               │
│  Coach AI is a separate subscription.            │
│                                                   │
│  ┌─────────────────────────────────────────┐    │
│  │  Continue                                 │    │
│  └─────────────────────────────────────────┘    │
│                                                   │
│  Restore Purchases                                │
│                                                   │
└─────────────────────────────────────────────────┘
```

> **Every number in the comparison table and the usage rows is read from the server-side cap configuration**
> (MA3-D16). None of them may be a literal in `src/`. The figures shown here are the launch values.

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
│  ✓ 5 squads                                      │
│  ✓ Unlimited imports                             │
│  ✓ Coach Holt, unlimited — including in your     │
│    workout                                       │
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
- ~~P-8 invents **no monthly/annual plan choice** — a single SKU/cadence is assumed at MVP; this screen does not present a plan picker.~~ **⛔ SUPERSEDED 2026-08-12 by P8W-D1 — see Section 11.** P-8 now presents a four-option plan picker (annual pre-selected, monthly, Founder while seats remain, lifetime). The other non-behaviours in this list are untouched: there is still no custom checkout, and the platform still owns the transaction.
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
- [ ] Plan comparison table shows exact locked limits **read from server config**: 3 programs, **75 photos**, **1 squad**, 1 lifetime import, 1 Holt program, 2 Holt days/month (Free) vs. **unlimited programs/photos/imports/Holt and 5 squads** (Premium)
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

**None blocking.** All decisions required to fully specify P-8 are resolved by P-8-Subscription-Architecture.md (LOCKED), this document, and **Monetization Architecture Amendment 003 (LOCKED 2026-08-12)**.

Carried forward, not blocking P-8:
- **Native billing integration approach** — ✅ **RESOLVED 2026-08-12: RevenueCat.** See §11.4.
- ~~**Single SKU/cadence vs. monthly+annual**~~ — ✅ **RESOLVED 2026-08-12.** See **Section 11**.
- **Exact pricing copy** — remains platform-sourced and dynamic; no literal price text exists in this spec. **Reinforced, not relaxed, by Section 11** — six SKUs make a hardcoded price six times as likely to be wrong.
- **Final naming/storage of the subscription entitlement state** — owned by backend/data architecture. Migration `0145` lands the schema; `src/lib/entitlement.ts` remains the single client-side answer to "is this athlete entitled?"

---

## Section 11 — Plan Selection *(new 2026-08-12 — resolves Open Issue #2)*

### 11.1 The decision

**P8W-D1 — P-8 presents a plan picker. The single-SKU assumption in §8 is superseded.**

Section 8 previously stated that P-8 *"invents no monthly/annual plan choice — a single SKU/cadence is
assumed at MVP; this screen does not present a plan picker."* That was the correct call **when no pricing
decision existed**. One does now: the Pricing Structure & Monetization Build Plan (locked 2026-08-12) and
Amendment 003 authorize **six SKUs**, of which **four can be presented on P-8 at launch** and two belong to
a product that is not shipping yet.

| SKU | Presented on P-8 at launch? |
|---|---|
| `premium_annual_9999` | ✅ **Pre-selected and visually dominant** |
| `premium_monthly_1299` | ✅ Secondary, beneath annual |
| `premium_lifetime_299` | ✅ Third |
| `founder_lifetime_149` | ✅ **Only while seats remain** (< 100 sold), then the row disappears with the SKU |
| `coach_ai_monthly_999` | ❌ Not at launch — Coach AI is excluded from this release |
| `coach_ai_annual_8999` | ❌ Not at launch — may be configured in App Store Connect and left unreleased |

### 11.2 Layout — Free state, revised

The plan picker sits between the reassurance line and the usage review. Everything else in §3.2 is unchanged.

```
│  ─────────────────────────────────────────────   │
│                                                   │
│  ┌───────────────────────────────────────────┐   │
│  │ ●  Annual          [price from platform]  │   │  ← PRE-SELECTED, dominant
│  │    Save [saving from platform]            │   │  ← computed, never typed
│  └───────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────┐   │
│  │ ○  Monthly         [price from platform]  │   │
│  └───────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────┐   │
│  │ ○  Founder         [price from platform]  │   │  ← only while seats remain
│  │    68 of 100 left                         │   │  ← live count, never a guess
│  └───────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────┐   │
│  │ ○  Lifetime        [price from platform]  │   │
│  └───────────────────────────────────────────┘   │
│                                                   │
│  The app and your legacy, forever.               │  ← ⚠ REQUIRED, above the button
│  Coach AI is a separate subscription.            │
│                                                   │
│  ┌─────────────────────────────────────────┐    │
│  │  Continue                                 │    │
│  └─────────────────────────────────────────┘    │
│                                                   │
│  Restore Purchases                                │
```

### 11.3 Rules

**P8W-D2 — Annual is pre-selected.** It is the plan the product is built to sell: the best value for the
athlete and the only cadence whose economics are stated in the plan as healthy at every level of use.

**P8W-D3 — The saving is computed from platform prices, never typed.** "Save 36%" written as a literal is a
price string in disguise, and it goes stale the moment a currency or a tier moves. Derive it from the two
localized prices the SDK returns, and render nothing if either is missing.

**P8W-D4 — The disclosure line is REQUIRED, and it sits above the buy button.**

> **"The app and your legacy, forever. Coach AI is a separate subscription."**

**This is a legal requirement, not copy.** A buyer who pays $299 for "lifetime" and later discovers a
feature needs another subscription is the classic deceptive-practices fact pattern. Placing the disclosure
in the terms instead of above the button is exactly the failure the requirement exists to prevent. It renders
in **every** Free state, not only when Lifetime is selected — the athlete comparing plans is the one who
needs it.

**P8W-D5 — The Founder row renders only while seats remain, and the counter must be live.** *"68 of 100
left"* read from the server. When the count reaches 100 the row disappears and the SKU delists. **Selling
the 101st seat is a deceptive practice** (MA3-D24), and a stale or optimistic counter is how that happens.
If the count cannot be read, **the row does not render** — an unverifiable scarcity claim is worse than no
claim.

**P8W-D6 — The 20 OG testers occupy no Founder seats** (MA3-D25). Their grant is separate and must not
decrement the counter.

**P8W-D7 — Still no custom checkout.** §8's other non-behaviours are untouched: tapping **Continue** hands
the selected SKU to the native platform purchase sheet. P-8 chooses *what* to buy; the platform handles
*buying it*.

**P8W-D8 — Lifetime is presented last and never pre-selected.** It is the largest single commitment on the
screen, and a pre-selected $299 charge is a dark pattern. It is offered, not steered toward.

**P8W-D9 — When Coach AI ships, it is a separate concurrent purchase, never a plan-picker row.** Adding it
to this list would present it as an alternative to Premium when it *requires* Premium (MA3-D3). It gets its
own surface and its own purchase, and the athlete may hold both.

### 11.4 Billing integration — RevenueCat

**P8W-D10 — RevenueCat**, resolving P-8-Subscription-Architecture open question #1.

- **Multiple concurrent entitlements** (Premium + Coach AI) is exactly the case it handles well, and it is
  the case direct StoreKit makes most awkward.
- Entitlement, **Restore Purchases** (§5.3) and receipt validation arrive in one dependency. No billing
  dependency exists in `package.json` today.
- Free under $2.5k monthly tracked revenue — the entire Founder round clears it.

> ⚠ **A new native dependency changes the fingerprint.** This is a **new iOS build, not an OTA**. Run
> `fingerprint:compare` against the live build before publishing.

### 11.5 Accessibility additions to §7

| Element | accessibilityLabel | Notes |
|---|---|---|
| Plan option (each) | "[Plan name], [price], [selected / not selected]" | Announced as a radio group; exactly one selected at all times |
| Annual saving line | "Save [computed saving] compared to monthly" | Announced with its plan row, not separately |
| Founder seat counter | "[n] of 100 seats remaining" | Announced with the Founder row |
| Disclosure line | "The app and your legacy, forever. Coach AI is a separate subscription." | **Must be in the reading order before the Continue button**, matching its visual position |
| Continue button | "Continue" | `accessibilityHint`: "Opens the purchase sheet for the selected plan" |

### 11.6 Validation additions to §9

- [ ] Four plan options render in the Free state: Annual, Monthly, Founder *(while seats remain)*, Lifetime
- [ ] **Annual is pre-selected on every mount** (P8W-D2)
- [ ] Lifetime is never pre-selected (P8W-D8)
- [ ] The annual saving is **computed** from platform prices, and renders nothing if either is unavailable (P8W-D3)
- [ ] **The disclosure line renders above the Continue button in every Free state** (P8W-D4)
- [ ] The Founder row renders only while seats remain, with a **live** count, and **not at all** if the count cannot be read (P8W-D5)
- [ ] The Founder counter stops at 100 and the SKU delists (MA3-D24)
- [ ] OG tester grants do not decrement the seat counter (P8W-D6)
- [ ] **No price string is hardcoded anywhere in `src/`** — grep for every launch price and expect zero hits
- [ ] Restore Purchases returns **both** entitlements when both are held
- [ ] Coach AI never appears as a plan-picker row (P8W-D9)

---

## Change Log

*No entries. v1.0 LOCKED.*

---

*P-8 Subscription — Wireframe Specification*
*Screen Specification: Subscription Management*
*June 2026*
*Authority: P-8-Subscription-Architecture.md (LOCKED), Monetization-Architecture-Amendment-001 (LOCKED), Critical-Decisions-Amendment-001 (LOCKED), M-7-Premium-Upsell-Spec.md (LOCKED), P-4-Settings-Root-Architecture.md (LOCKED), P-4-Settings-Root-Wireframe-Spec.md (LOCKED)*
*Status: LOCKED*
