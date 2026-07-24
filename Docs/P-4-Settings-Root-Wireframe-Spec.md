# P-4 Settings Root — Wireframe Specification
## Screen Specification: Settings Root
### June 2026

**Status:** LOCKED

**Type:** Screen Wireframe Specification

**Date:** June 2026

**Implements:** P-4-Settings-Root-Architecture.md v1.0 (LOCKED)

**Authority Chain:**
- P-4-Settings-Root-Architecture.md v1.0 (LOCKED) — information architecture, row order, P-7 deferral, P-9 naming
- Profile-Wireframe-Spec-P1.md v1.3 (LOCKED) — Section 9 (Settings entry point), Section 13.2 (modal navigation stack)
- P-1-Amendment-002-Athlete-Type-Editability.md (LOCKED) — establishes the "‹ [Screen Name]" pushed-screen header convention reused here (Edit Profile precedent)

**Downstream Dependents:**
- P-5 Notifications, P-6 Privacy, P-8 Subscription, P-9 Account (each receives a navigation row from this screen; none are specced here)
- P-7 Connected Apps (reserved code; not referenced by this screen at MVP)

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Section 1 — Screen Purpose

P-4 Settings Root is the single navigation hub for all account configuration and app-utility functions. It is reached deliberately — an athlete navigates here to change something, not to be shown something. Per the Architecture document, P-4 carries zero identity content, zero progress content, zero rank content, zero athlete type content, and zero metrics. It is infrastructure, not narrative.

Unlike L-1 or P-2, which open with an identity arc, P-4 opens directly into a flat list of categories. There is no Hero, no header card, no personalization. This is intentional: Settings has no story to tell, and dressing it up as one would misrepresent its role.

---

## Section 2 — Navigation Entry & Modal Context

P-4 is entered exclusively from the Settings row at the bottom of P-1 (TIER 6, per P-1 §9 — unmodified, reused). There is no other entry point into P-4 anywhere in the app.

**Modal context (per P-1 §13.2, unmodified, reused):**
- P-4 pushes onto P-1's existing modal navigation stack. It is not a new modal, not a tab, not a separate route — it is a screen within the Profile modal's internal stack.
- The modal's handle bar and dimmed background persist behind P-4, exactly as they do for any other screen pushed within the Profile modal.
- P-5, P-6, P-8, and P-9 each push further onto this same stack when reached from P-4.

**Header treatment:**
P-4 uses the "‹ [Screen Name]" pushed-screen header convention established for P-1.1 Edit Profile (P-1-Amendment-002): a back chevron (‹) followed by the screen title "Settings," left-aligned at the top of the content area, below the system status bar and below the modal's handle bar.

- Tapping ‹ pops P-4 off the stack, returning to P-1 (the modal remains open).
- This is a stack pop, not a modal dismiss. The handle bar, [×] dismiss button, and dimmed overlay remain available throughout — dragging the handle bar down or tapping the dimmed area at any point dismisses the entire modal and returns to the originating tab, per P-1's existing modal-dismissal behavior.

---

## Section 3 — Layout Structure

```
┌─────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                               │
├─────────────────────────────────────────────────┤
│  ‹ Settings                                      │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  Notifications                              →    │
│  ─────────────────────────────────────────────   │
│  Privacy                                    →    │
│  ─────────────────────────────────────────────   │
│  Subscription                               →    │
│  ─────────────────────────────────────────────   │
│  Account                                    →    │
│                                                   │
│                                                   │
│  Sign Out                                        │
│                                                   │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│        Terms of Service · Privacy Policy         │
│                                                   │
│              Version 1.0.0 (Build 1)             │
│                                                   │
└─────────────────────────────────────────────────┘
```

**Visual grouping (three distinct zones, top to bottom):**

1. **Settings Categories** — Notifications, Privacy, Subscription, Account. Grouped together with hairline dividers between rows, no divider above Notifications or below Account (the group reads as one continuous block, separated from the rest of the screen by surrounding whitespace).
2. **Sign Out** — A single standalone row, visually separated from the Settings Categories group above by whitespace (not a hairline divider — a clear gap signals "this is a different kind of action," not just the next item in the list).
3. **Footer** — Legal links and version string, separated from Sign Out by a hairline divider, rendered in smaller, more muted text than the rest of the screen. This is the least visually prominent zone on the screen, consistent with its informational (non-action) role for the version string, and low-frequency-use role for the legal links.

**Scroll behavior:** The handle bar, [×] dismiss button, and "‹ Settings" header are fixed; the content area below scrolls if needed. At eight total elements (4 category rows + Sign Out + 2 legal links + version line), the screen fits within a single viewport on all supported device sizes without scrolling under normal conditions. Scroll is supported as a fallback for accessibility text-scaling, not as an expected interaction.

---

## Section 4 — Row Ordering & Content Detail

### 4.1 Settings Categories (rows 1–4)

Each row follows the same component pattern already established for the Settings row on P-1 itself (P-1 §9): label text (15sp, primary text color) + [→] chevron affordance, full row tappable, 56dp minimum height, hairline divider below (except the last row in the group).

| # | Label | Destination | Content Summary |
|---|---|---|---|
| 1 | Notifications | P-5 | Push notification preferences per event type |
| 2 | Privacy | P-6 | Search/squad visibility controls |
| 3 | Subscription | P-8 | Plan comparison, upgrade, management |
| 4 | Account | P-9 | Export My Data, Delete Account |

No row displays a value, badge, count, or preview of its destination's content (e.g., no "3 notifications enabled" subtitle, no plan-tier badge next to Subscription, no photo-count next to Account). Each row is a pure navigation trigger — label and chevron only. This is a deliberate simplification consistent with "no metrics, no subscription marketing content" (Architecture Section 2, Locked Decisions).

### 4.2 Sign Out (row 5)

A standalone row, same 56dp minimum height and tappable-row pattern as the Settings Categories rows, but with no chevron — it does not navigate to a child screen, it triggers an in-place confirmation (Section 6).

Rendered in standard primary text color, not a destructive/warning color. Sign Out is fully reversible (the athlete can sign back in at any time) and is not framed as risky — consistent with Product DNA's "Accountability Without Shame" principle, which extends here to not over-dramatizing a routine, non-destructive action.

### 4.3 Footer (rows 6–8)

| Element | Treatment |
|---|---|
| Terms of Service | Small text link, muted color, inline with Privacy Policy, separated by a middle-dot (·) |
| Privacy Policy | Small text link, muted color, inline with Terms of Service |
| App Version | Static text below the legal links, smallest text size on the screen, most muted color, centered, non-interactive |

Terms of Service and Privacy Policy render side-by-side on one line, centered. App Version renders on its own line beneath them, also centered.

**Version string format:** `Version [X.X.X] (Build [N])` — e.g., "Version 1.0.0 (Build 1)". The values are read from the app's build configuration at runtime; this screen does not hardcode or maintain the version number.

---

## Section 5 — Empty States

**Not applicable.** P-4 has no conditional content. All eight elements (4 category rows, Sign Out, 2 legal links, version string) render unconditionally for every athlete, every time, regardless of account state, subscription tier, or any other variable. There is no loading state (nothing on this screen depends on a network call to render), no empty state, and no placeholder content. This is consistent with P-4's role as a pure, static navigation hub.

---

## Section 6 — Sign Out Behavior

### 6.1 Trigger

Tapping the Sign Out row presents a confirmation alert. It does not navigate anywhere and does not push a screen onto the modal stack.

### 6.2 Confirmation Alert

```
┌─────────────────────────────────┐
│           Sign Out?              │
│                                   │
│  You'll need to sign back in to  │
│  access your account.            │
│                                   │
│  ┌───────────┐  ┌──────────────┐│
│  │  Cancel   │  │   Sign Out   ││
│  └───────────┘  └──────────────┘│
└─────────────────────────────────┘
```

- **Title:** "Sign Out?"
- **Body:** "You'll need to sign back in to access your account." — reassuring, factual, no warning iconography or alarming language. Consistent with Sign Out being a routine, fully reversible action.
- **Buttons:** "Cancel" and "Sign Out," both rendered in standard (non-destructive) styling. Cancel is the default-focused action, requiring a deliberate tap on "Sign Out" to proceed — this is a confirmation against accidental taps, not a warning against a risky action.
- **Presentation:** Native platform alert (not a custom in-app modal), consistent with using system-native UI for simple confirm/cancel decisions.

### 6.3 Resulting Behavior

| Action | Result |
|---|---|
| Tap "Cancel" | Alert dismisses. Returns to P-4. No state change. |
| Tap "Sign Out" | Alert dismisses. Session terminates. The Profile modal and the tab navigator both close. The athlete is routed to the app's logged-out entry point. |
| Dismiss alert (tap outside, system back) | Treated as Cancel — no state change. |

**Dependency note:** The exact logged-out destination (login screen, splash screen, etc.) is owned by Account/Auth Architecture, which does not yet exist as a locked document (flagged in P-4-Settings-Root-Architecture.md, Section 5). This specification defines the *behavior* — session termination, full exit from the Profile modal and tab navigator — but does not design the destination screen itself. This is intentionally out of scope per this task's constraints (do not redesign account architecture).

---

## Section 7 — Legal Links Behavior

### 7.1 Trigger

Tapping "Terms of Service" or "Privacy Policy" opens the corresponding document.

### 7.2 Presentation

Each link opens as an in-app webview, presented as a sheet on top of P-4 (not pushed onto the Profile modal's navigation stack, and not a system browser handoff that would background the app). The webview sheet has its own dismiss control (a close button, top-right) and, when dismissed, returns the athlete to P-4 exactly as they left it.

**Rationale:** Opening a system browser would leave the app context entirely, which is unnecessary friction for a quick reference lookup. Presenting the legal document as a stack push (like P-5–P-9) would imply it's a settings category with controls, which it is not — it's a static reference document. A webview sheet keeps the athlete in-app without overstating the destination's role.

### 7.3 Content

Terms of Service and Privacy Policy each load their respective document content. The content itself (legal copy) is outside the scope of this specification.

---

## Section 8 — Version Display

- **Format:** `Version [X.X.X] (Build [N])`
- **Source:** Read from the app's build configuration at runtime. Not maintained as static copy within this screen's content.
- **Interactivity:** None. Tapping the version string has no effect. It is not a debug-menu trigger or an easter egg in this specification.
- **Visual treatment:** Smallest text size, most muted color on the screen. Centered, below the legal links.

---

## Section 9 — Navigation Table

| From | Action | To | Stack Behavior |
|---|---|---|---|
| P-1 | Tap Settings row | P-4 | Push onto P-1's modal stack (existing, unmodified) |
| P-4 | Tap ‹ | P-1 | Pop off the modal stack |
| P-4 | Tap Notifications | P-5 | Push onto the same modal stack |
| P-4 | Tap Privacy | P-6 | Push onto the same modal stack |
| P-4 | Tap Subscription | P-8 | Push onto the same modal stack |
| P-4 | Tap Account | P-9 | Push onto the same modal stack |
| P-4 | Tap Sign Out | — | Presents confirmation alert (Section 6); not a stack push |
| P-4 | Confirm Sign Out | — | Terminates session; closes modal and tab navigator; routes to logged-out entry point (Account/Auth Architecture, out of scope) |
| P-4 | Tap Terms of Service / Privacy Policy | — | Presents in-app webview sheet on top of P-4 (Section 7); not a stack push |
| P-4 | Dismiss webview sheet | P-4 | Returns to P-4 unchanged |
| P-4 | Drag handle bar / tap dimmed area | — | Dismisses entire Profile modal; returns to originating tab (existing P-1 behavior, unmodified) |

---

## Section 10 — Behavior Table

| Interaction | Behavior |
|---|---|
| Screen load | All 8 elements render immediately and unconditionally. No loading state. |
| Tap a Settings Category row (Notifications/Privacy/Subscription/Account) | Pushes the corresponding child screen onto the modal stack. |
| Tap Sign Out | Presents native confirmation alert. Does not navigate. |
| Confirm Sign Out | Terminates session; exits Profile modal and tab navigator entirely. |
| Cancel Sign Out (or dismiss alert) | No-op. Returns to P-4 unchanged. |
| Tap a legal link | Presents in-app webview sheet over P-4. |
| Dismiss webview sheet | Returns to P-4 unchanged. |
| Tap App Version text | No-op. Not interactive. |
| Rotate device / resize | Layout reflows; no content changes. |
| Text-scaling accessibility setting increased | Content area scrolls if the 8 elements exceed viewport height; header and dismiss controls remain fixed. |

---

## Section 11 — Accessibility Requirements

| Element | accessibilityLabel | accessibilityHint / Notes |
|---|---|---|
| Back chevron (‹) | "Back" | "Returns to Profile" |
| Notifications row | "Notifications" | "Opens notification settings" |
| Privacy row | "Privacy" | "Opens privacy settings" |
| Subscription row | "Subscription" | "Opens subscription settings" |
| Account row | "Account" | "Opens account settings" |
| Sign Out row | "Sign Out" | "Opens a confirmation dialog" |
| Sign Out confirmation alert | Standard platform alert accessibility | Announced automatically by the OS on presentation; title and body read in full before button focus |
| "Cancel" button (in alert) | "Cancel" | "Returns to Settings without signing out" |
| "Sign Out" button (in alert) | "Sign Out" | "Signs out of your account" |
| Terms of Service link | "Terms of Service" | "Opens in a web view" |
| Privacy Policy link | "Privacy Policy" | "Opens in a web view" |
| App Version text | "Version [X.X.X], build [N]" | Read as static text; `accessibilityRole` is text, not button — no hint, not focusable as an action |

**Focus order:** Top to bottom, matching visual order exactly — back chevron, Notifications, Privacy, Subscription, Account, Sign Out, Terms of Service, Privacy Policy, App Version.

**Minimum tap targets:** All four Settings Category rows and the Sign Out row meet the 56dp minimum height established by P-1's own Settings row. Legal links and the version string are text-scale-dependent but maintain adequate spacing to avoid mis-taps between the two legal links.

---

## Section 12 — Non-Behaviors

Explicit confirmation of what P-4 does **not** do, per the Architecture document's locked decisions:

- No identity content (no avatar, athlete name, rank, or athlete type displayed anywhere on this screen)
- No progress or performance metrics of any kind
- No subscription marketing copy, plan badges, or upsell messaging on the Subscription row — P-4 only provides navigation to P-8, which owns that content
- No Connected Apps row — P-7 is a reserved code, not present in this screen at MVP
- No preview content, value subtitles, or badges on any Settings Category row (e.g., no notification count, no plan tier indicator)
- No empty states, loading states, or conditional rendering — all content is static and unconditional
- No avatar or photo anywhere on this screen
- No "Are you sure?" secondary confirmation beyond the single Sign Out alert (no double-confirmation pattern)
- No destructive/warning visual treatment on the Sign Out row itself (only the confirmation alert exists; the row is styled identically to any other row)
- No scrolling content beyond the 8 defined elements — this screen does not grow without an explicit amendment

---

## Section 13 — Future Expansion Notes

- **P-7 Connected Apps** remains a reserved code. When an integration architecture workstream is eventually planned, a row would be inserted into the Settings Categories group (Section 4.1) — no space is pre-allocated for it now, and its eventual position within the existing 4-row order is not decided by this document.
- **No "Preferences" placeholder** (units, theme, language) exists on this screen. Per the Architecture document's resolved Open Question 6, no row is added in anticipation of a future global preferences system; one would be added only when such a system is actually designed.
- **No decimal renumbering** of P-5/P-6/P-8/P-9 is introduced by this document, despite the inconsistency with the P-2.X convention used elsewhere. This is a known, accepted inconsistency (Architecture document, resolved Open Question 7), not an oversight.

---

## Section 14 — Validation Checklist

### Navigation Entry
- [ ] P-4 is reachable only via the Settings row on P-1
- [ ] P-4 pushes onto P-1's existing modal navigation stack
- [ ] "‹ Settings" header present, matching the Edit Profile (P-1.1) pushed-screen convention
- [ ] Tapping ‹ pops P-4 off the stack, returning to P-1 within the same modal session
- [ ] Handle bar drag / dimmed-area tap dismisses the entire modal, returning to the originating tab

### Layout & Content
- [ ] Four Settings Category rows present, in order: Notifications, Privacy, Subscription, Account
- [ ] Each Settings Category row: label + [→] chevron, full row tappable, 56dp minimum height
- [ ] No value, badge, count, or preview content on any Settings Category row
- [ ] Sign Out row present, visually separated from the Settings Categories group, no chevron
- [ ] Footer present: Terms of Service · Privacy Policy (inline), App Version (below, smallest/most muted text)
- [ ] No Connected Apps row present anywhere on the screen
- [ ] No identity, progress, rank, or athlete type content anywhere on the screen
- [ ] No empty states — all content renders unconditionally

### Sign Out
- [ ] Tapping Sign Out presents a native confirmation alert (not a navigation, not a custom modal)
- [ ] Alert title: "Sign Out?"
- [ ] Alert body: "You'll need to sign back in to access your account."
- [ ] Alert buttons: "Cancel" and "Sign Out," both standard (non-destructive) styling
- [ ] Confirming Sign Out terminates the session and exits both the Profile modal and the tab navigator
- [ ] Canceling or dismissing the alert returns to P-4 with no state change
- [ ] Sign Out row itself uses standard (non-destructive) text styling

### Legal Links
- [ ] Tapping Terms of Service opens an in-app webview sheet over P-4
- [ ] Tapping Privacy Policy opens an in-app webview sheet over P-4
- [ ] Webview sheet has its own dismiss control and returns to P-4 unchanged on close
- [ ] Links do not push onto the Profile modal's navigation stack
- [ ] Links do not hand off to a system browser

### Version Display
- [ ] Version string format: "Version [X.X.X] (Build [N])"
- [ ] Value is read from build configuration at runtime, not hardcoded
- [ ] Version text is non-interactive (no tap action, no accessibilityRole of button)

### Accessibility
- [ ] All rows and the back chevron have accessibilityLabel and accessibilityHint per Section 11
- [ ] Focus order matches visual top-to-bottom order
- [ ] Sign Out confirmation alert is announced automatically on presentation
- [ ] App Version text has accessibilityRole of static text, not button
- [ ] All tappable rows meet 56dp minimum tap target

### Non-Behaviors
- [ ] No subscription marketing content on the Subscription row
- [ ] No Connected Apps row at MVP
- [ ] No preview/value content on any Settings Category row
- [ ] No double-confirmation pattern on Sign Out
- [ ] No content grows or changes based on account state

---

## Section 15 — Open Issues

**None for P-4 itself.** All decisions required to fully specify this screen are resolved by P-4-Settings-Root-Architecture.md (LOCKED) and this document.

Items carried forward to other workstreams (not open issues for P-4, listed here for traceability only):
- P-8's native-billing-vs-in-app-paywall decision — owned by the P-8 Subscription workstream
- P-9's session-termination dependency on Account/Auth Architecture — owned by the P-9 Account workstream (and, transitively, by this screen's own Sign Out behavior, Section 6.3, which shares the same unresolved logged-out-destination dependency)
- P-5's notification event-type enumeration — owned by the P-5 Notifications workstream
- P-7 Connected Apps — reserved, no workstream scheduled

---

## Change Log

*No entries. v1.0 LOCKED.*

---

*P-4 Settings Root — Wireframe Specification*
*Screen Specification: Settings Root*
*June 2026*
*Authority: P-4-Settings-Root-Architecture.md (LOCKED), Profile-Wireframe-Spec-P1.md (LOCKED), P-1-Amendment-002 (LOCKED)*
*Status: LOCKED*
