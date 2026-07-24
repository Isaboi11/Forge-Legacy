# P-9 Account — Wireframe Specification
## Screen Specification: Account Management
### June 2026

**Status:** LOCKED

**Type:** Screen Wireframe Specification

**Date:** June 2026

**Implements:** Account-Auth-Architecture.md v1.0 (LOCKED) — specifically the Delete Account Contract (Section 6) and Logged-Out Destination Contract (Section 7)

**Authority Chain:**
- Account-Auth-Architecture.md v1.0 (LOCKED) — Delete Account Contract, re-authentication requirement, deletion contract shape, logged-out destination
- P-4-Settings-Root-Architecture.md v1.0 (LOCKED) — Section 2.2 (P-9 naming and two-row scope: Export My Data, Delete Account)
- P-4-Settings-Root-Wireframe-Spec.md v1.0 (LOCKED) — entry point, modal stack behavior, pushed-screen header convention, Sign Out precedent for in-flow confirmation styling
- Account-Creation-Wireframe-Spec-O1.md v1.0 (LOCKED) — O-1a (Welcome) as the reused logged-out destination; O-1b's Apple/Google vs. email+password account-type distinction

**Downstream Dependents:** None. P-9 has no child screens.

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Section 1 — Screen Purpose

P-9 Account contains exactly two actions: **Export My Data** and **Delete Account**. Nothing else. It is the smallest possible screen that satisfies basic data-export and account-deletion requirements — it does not become a general account-management surface. Email, password, and username changes are explicitly out of scope; they do not exist anywhere on this screen or anywhere else in the locked Settings ecosystem.

Delete Account implements the Delete Account Contract from Account-Auth-Architecture.md exactly: re-authentication, a destructive confirmation, immediate session termination, and a deletion process whose timing (immediate vs. a recoverable window) is intentionally left undefined by this spec — that decision belongs to the architecture document, not this screen, and this screen's copy is written to remain correct regardless of which branch is eventually chosen.

---

## Section 2 — Navigation Entry & Modal Context

P-9 is entered exclusively via: **P-4 Settings Root → Account row → P-9.**

- Pushes onto the same Profile modal navigation stack P-4 itself is on, identical to P-5, P-6, and P-8's entry behavior.
- Header: "‹ Account" — the same pushed-screen convention used by every other P-4 child screen. Tapping ‹ pops P-9 off the stack, returning to P-4.
- Handle bar drag / dimmed-area tap dismisses the entire Profile modal at any point, unchanged from existing behavior.
- **Exception:** if Delete Account is confirmed and completes, navigation breaks out of this pattern entirely — see Section 5.4.

---

## Section 3 — Layout Structure

```
┌─────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                               │
├─────────────────────────────────────────────────┤
│  ‹ Account                                       │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  DATA                                            │
│                                                   │
│  Export My Data                                  │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  ACCOUNT                                         │
│                                                   │
│  Delete Account                                  │  ← destructive (red) text
│                                                   │
└─────────────────────────────────────────────────┘
```

**Section headers** ("DATA," "ACCOUNT") render as 11sp, muted, all-caps labels — the same section-label convention used on P-5 and elsewhere. Non-interactive.

**Row structure:** label only (15sp), no chevron on either row. Neither row navigates to a child screen — both trigger in-place actions (a toast for Export, a sheet/alert sequence for Delete Account) — so neither uses the navigational chevron affordance reserved for rows that push a screen.

**Visual separation (explicit requirement):** Export My Data and Delete Account are separated into two distinct sections with a hairline divider between them, mirroring the gap treatment used between Settings Categories and Sign Out on P-4. This is a deliberate visual break, not just a label change — the two actions have entirely different risk profiles and must not read as a single list.

**Delete Account styling:** rendered in destructive (red/error) text color — the only destructive-styled row in the entire Settings ecosystem. This is intentional: every other action across P-4–P-8 (including Sign Out) uses standard text color because it's reversible or low-risk. Delete Account is neither, and the visual treatment reflects that.

**Scroll behavior:** not applicable in practice — two rows fit any viewport without scrolling. The handle bar, [×] dismiss button, and "‹ Account" header remain fixed regardless.

---

## Section 4 — Export My Data Behavior

This section defines athlete-facing behavior only. Export implementation (file format, delivery mechanism, generation pipeline) is explicitly out of scope.

### 4.1 Trigger

Tapping "Export My Data" immediately initiates an export request. There is no confirmation step beforehand — this is a non-destructive, low-consequence action, unlike Delete Account.

### 4.2 Confirmation

A brief inline toast or confirmation message appears immediately after tapping:

> "We'll email your data export to [athlete's email]."

This is the only feedback the athlete receives in-app. No progress indicator, no in-app delivery status, no export-history list.

### 4.3 What This Screen Does Not Define

- Export file format or contents
- Delivery timing or mechanism (email attachment, download link, etc.)
- Rate limiting on repeated requests
- Any export configuration (date range, data-type selection, etc.)

All of the above are implementation/backend concerns. This screen defines only: tap → request initiated → inline confirmation shown.

---

## Section 5 — Delete Account Behavior

Implements Account-Auth-Architecture.md Section 6 (Delete Account Contract) exactly.

### 5.1 Trigger

Tapping "Delete Account" begins the re-authentication step. No confirmation precedes re-authentication — re-authentication itself is the first gate.

### 5.2 Re-Authentication

Behavior branches based on how the athlete's account was created (per O-1's existing email+password vs. Apple/Google distinction):

**Email + password accounts:**

```
──────────────────────────────── (handle bar)

  Confirm Your Password

  To delete your account, enter your
  password to continue.

  ┌─────────────────────────────────────┐
  │  Password                            │
  └─────────────────────────────────────┘

  [           Continue           ]
  [            Cancel             ]

──────────────────────────────────────────
```

- Presented as a bottom sheet over P-9 — not a screen push.
- "Continue" submits the password for verification.
- Incorrect password: inline error "Incorrect password." below the field, consistent with O-1d's existing wrong-credentials pattern. The sheet remains open; the athlete may retry.
- "Cancel" or dismissing the sheet: returns to P-9 unchanged, no error, no state change.

**Apple / Google accounts:**

- Tapping "Delete Account" directly invokes the native re-authentication sheet for the provider the athlete originally signed in with (no Forge-authored intermediate sheet — the native sheet's own UI is sufficient).
- Re-authentication cancelled or fails: no error shown, returns to P-9 unchanged — consistent with O-1's existing pattern for cancelled/failed social-auth attempts.

### 5.3 Final Confirmation

On successful re-authentication (either path), a destructive confirmation alert presents:

```
┌─────────────────────────────────┐
│         Delete Account?          │
│                                   │
│  You'll be signed out and your   │
│  account will be deleted.        │
│                                   │
│  ┌───────────┐  ┌──────────────┐│
│  │  Cancel   │  │Delete Account││
│  └───────────┘  └──────────────┘│
└─────────────────────────────────┘
```

- "Delete Account" button: destructive (red) styling.
- "Cancel": standard styling, default-focused — dismisses the alert, returns to P-9, no state change.
- **Copy is deliberately branch-agnostic.** It does not say "immediately" or "cannot be undone," because whether deletion is instant or enters a recoverable window is an open policy decision per Account-Auth-Architecture.md Section 6.4. "You'll be signed out and your account will be deleted" is true under either branch and requires no amendment regardless of which branch is eventually chosen.

### 5.4 On Confirm

Per the Delete Account Contract:

1. Session terminates immediately (true under both branches).
2. The deletion process begins server-side (immediate erasure or entry into a recoverable pending state — branch undefined here, per the architecture).
3. Navigation breaks out of the Profile modal and tab navigator entirely.
4. **Destination: O-1a (Welcome)** — the same reused logged-out destination as Sign Out, per Account-Auth-Architecture.md Section 7. No new screen is presented.

This is identical in shape to P-4's existing Sign Out termination behavior, with one difference: Sign Out requires no re-authentication; Delete Account does.

---

## Section 6 — Empty States

**Not applicable.** Both rows render unconditionally for every athlete, every time, regardless of account state or auth method. The only conditional behavior is which re-authentication path appears (Section 5.2), which is determined by the athlete's existing account type, not a loading or empty state.

---

## Section 7 — Behavior Table

| Interaction | Behavior |
|---|---|
| Screen load | Both rows render immediately — Export My Data, Delete Account. No loading state. |
| Tap Export My Data | Initiates export request; shows inline confirmation toast immediately. No further action. |
| Tap Delete Account | Opens re-authentication step (password sheet for email+password accounts; native re-auth sheet for Apple/Google accounts). |
| Re-authentication succeeds | Presents the destructive final confirmation alert. |
| Re-authentication fails or is cancelled | Returns to P-9 unchanged. Inline error shown only for incorrect password; no error for cancelled native re-auth. |
| Tap "Cancel" on final confirmation | Dismisses the alert, returns to P-9, no state change. |
| Tap "Delete Account" on final confirmation | Session terminates; deletion process begins; navigates out of the Profile modal and tab navigator entirely to O-1a (Welcome). |
| Tap ‹ | Pops P-9 off the modal stack, returns to P-4. |

---

## Section 8 — Navigation Table

| From | Action | To | Stack Behavior |
|---|---|---|---|
| P-4 | Tap Account row | P-9 | Push onto the Profile modal's stack (existing P-4 pattern, unmodified) |
| P-9 | Tap ‹ | P-4 | Pop off the modal stack |
| P-9 | Tap Export My Data | — | No navigation. Inline confirmation only. |
| P-9 | Tap Delete Account | — | Presents re-authentication sheet over P-9 — not a screen push |
| P-9 (re-auth sheet) | Tap Continue / native re-auth succeeds | — | Presents final confirmation alert — not a screen push |
| P-9 (final confirmation) | Tap Delete Account (confirm) | O-1a (Welcome) | Terminates session; exits Profile modal and tab navigator entirely; routes to the reused logged-out destination per Account-Auth-Architecture.md §7 |
| P-9 | Drag handle bar / tap dimmed area | — | Dismisses entire Profile modal; returns to originating tab (existing P-1 behavior, unmodified) |

P-9 has no child screens at any point in this flow. Every step beyond the initial P-4 → P-9 push is a sheet or alert presented over P-9, never a stack push.

---

## Section 9 — Accessibility Requirements

| Element | accessibilityLabel | Notes |
|---|---|---|
| Back chevron (‹) | "Back" | "Returns to Settings" |
| Section headers | "Data", "Account" | Announced as section headers, not interactive |
| Export My Data row | "Export My Data" | `accessibilityHint`: "Requests an export of your data, sent by email" |
| Delete Account row | "Delete Account" | `accessibilityHint`: "Starts the account deletion process" — announced with the same destructive emphasis as its visual styling implies |
| Password field (re-auth sheet) | "Password" | Secure text entry; standard password-field accessibility |
| "Continue" (re-auth sheet) | "Continue" | `accessibilityHint`: "Confirms your password to proceed" |
| "Cancel" (re-auth sheet) | "Cancel" | `accessibilityHint`: "Cancels account deletion" |
| Final confirmation alert | Standard platform alert accessibility | Announced automatically on presentation; title and body read in full before button focus |
| "Cancel" (final confirmation) | "Cancel" | `accessibilityHint`: "Keeps your account" |
| "Delete Account" (final confirmation) | "Delete Account" | `accessibilityHint`: "Permanently starts account deletion. This cannot be cancelled once confirmed." |

**Focus order:** Top to bottom — back chevron, Data header, Export My Data, Account header, Delete Account. Within the re-authentication sheet: password field (if applicable), Continue, Cancel. Within the final confirmation: Cancel (default focus), Delete Account.

**Minimum tap targets:** Both rows and all sheet/alert buttons meet platform-standard minimum touch target size.

---

## Section 10 — Non-Behaviors

- P-9 has **no child screens** — every step beyond the initial push from P-4 is a sheet or alert over P-9.
- **No email-change functionality** anywhere on this screen.
- **No password-change functionality** anywhere on this screen.
- **No username-edit functionality** anywhere on this screen.
- **No billing controls** — Subscription remains exclusively on P-8.
- **No privacy controls** — remain exclusively on P-6.
- **No notification controls** — remain exclusively on P-5.
- **No export configuration** (format, date range, data-type selection) — Export My Data is a single, unconfigurable action.
- **No in-app export history or status tracking.**
- **No type-to-confirm pattern** (e.g., typing "DELETE" or the account email) on the final confirmation — re-authentication already serves as the security gate; a second typed confirmation would be redundant friction.
- **No assumption about deletion timing** anywhere in this screen's copy — the immediate-vs-grace-period branch is never referenced, named, or implied.
- **No Save/Cancel step on Export My Data** — it applies (initiates the request) instantly on tap, consistent with the smallest-architecture pattern used throughout this Settings ecosystem.
- This document does not redesign Account/Auth Architecture or O-1 — it implements their existing contracts exactly.

---

## Section 11 — Validation Checklist

### Navigation Entry
- [ ] P-9 is reachable only via P-4 Settings Root → Account row
- [ ] P-9 pushes onto the same modal stack as P-4
- [ ] "‹ Account" header present, matching the established pushed-screen convention
- [ ] Tapping ‹ pops P-9 off the stack, returning to P-4

### Layout & Content
- [ ] Two sections present, in order: Data, Account
- [ ] Export My Data is the only row in the Data section
- [ ] Delete Account is the only row in the Account section
- [ ] Hairline divider visually separates the two sections
- [ ] Neither row has a chevron
- [ ] Delete Account renders in destructive (red) text color; Export My Data does not

### Export My Data
- [ ] Tapping initiates the export request with no confirmation step beforehand
- [ ] Inline confirmation toast appears immediately: "We'll email your data export to [athlete's email]."
- [ ] No progress indicator, status tracking, or export configuration appears anywhere

### Delete Account — Re-authentication
- [ ] Tapping Delete Account opens re-authentication before any destructive confirmation
- [ ] Email+password accounts: bottom sheet with password field, Continue, Cancel
- [ ] Apple/Google accounts: native re-auth sheet invoked directly, no Forge-authored intermediate sheet
- [ ] Incorrect password shows inline error "Incorrect password."; sheet remains open for retry
- [ ] Cancelled or failed re-authentication returns to P-9 with no error and no state change

### Delete Account — Final Confirmation
- [ ] Presented only after successful re-authentication
- [ ] Alert title: "Delete Account?"
- [ ] Alert body exactly: "You'll be signed out and your account will be deleted."
- [ ] Body copy contains no claim about deletion timing (no "immediately," no "cannot be undone")
- [ ] "Delete Account" button styled destructive; "Cancel" styled standard and default-focused
- [ ] Cancel dismisses with no state change

### Delete Account — On Confirm
- [ ] Session terminates immediately
- [ ] Deletion process begins (timing/branch not asserted by this screen)
- [ ] Navigation exits the Profile modal and tab navigator entirely
- [ ] Destination is O-1a (Welcome) — no new screen presented

### Non-Behaviors
- [ ] No email, password, or username editing anywhere on this screen
- [ ] No billing, privacy, or notification controls anywhere on this screen
- [ ] No type-to-confirm pattern on the final confirmation
- [ ] No child screens at any point

### Accessibility
- [ ] All interactive elements have accessibilityLabel and appropriate accessibilityHint per Section 9
- [ ] Focus order matches visual/flow order in every step
- [ ] Final confirmation alert is announced automatically on presentation

---

## Section 12 — Open Issues

**None blocking.** All decisions required to fully specify P-9 are resolved by Account-Auth-Architecture.md (LOCKED) and this document.

Carried forward, not blocking P-9:
- **Immediate-vs-grace-period deletion branch** — explicitly left open by Account-Auth-Architecture.md Section 6.4. This screen's copy is written to require no amendment regardless of which branch is eventually chosen.
- **Export delivery mechanism and timing** — implementation/backend concern, not specified by this screen by design.
- **Repeated-failure handling on the re-authentication password sheet (Section 5.2)** — Account-Auth-Architecture.md's Delete Account Contract specifies re-authentication but does not define a lockout for repeated incorrect attempts during this specific step (distinct from O-1d's existing 5-attempts/15-minute Sign In lock, which governs the separate sign-in flow, not this in-flow re-auth). This document does not invent a new lockout mechanism without that authority. Flagged for the architecture document to address if repeated-failure abuse becomes a concern; does not block this screen.

---

## Change Log

*No entries. v1.0 LOCKED.*

---

*P-9 Account — Wireframe Specification*
*Screen Specification: Account Management*
*June 2026*
*Authority: Account-Auth-Architecture.md (LOCKED), P-4-Settings-Root-Architecture.md (LOCKED), P-4-Settings-Root-Wireframe-Spec.md (LOCKED), Account-Creation-Wireframe-Spec-O1.md (LOCKED)*
*Status: LOCKED*
