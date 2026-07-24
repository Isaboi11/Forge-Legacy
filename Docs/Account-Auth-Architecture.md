# Account/Auth Architecture
## Architecture Specification — Session Lifecycle, Logged-Out Destination, and Account Deletion Contract
### June 2026

**Status:** LOCKED

**Type:** Cross-Cutting Architecture Specification (not a screen wireframe — this document defines behavior and contracts consumed by existing and future screens, most of which already exist)

**Date:** June 2026

**Authority Chain:**
- Account-Creation-Wireframe-Spec-O1.md v1.0 (LOCKED) — owns Welcome (O-1a), Create Account (O-1b), Display Name (O-1c), Sign In (O-1d), and the Forgot Password flow. This document cites O-1 throughout and redesigns none of it.
- P-4-Settings-Root-Architecture.md v1.0 (LOCKED) / P-4-Settings-Root-Wireframe-Spec.md v1.0 (LOCKED) — owns the locked Sign Out behavior (confirmation copy, session termination, modal/tab exit) and explicitly defers the logged-out destination to this document.
- P-4-Settings-Root-Architecture.md Section 2.2 — owns the naming and two-row scope of P-9 Account (Export My Data, Delete Account). This document supplies the Delete Account contract P-9's eventual wireframe spec will implement against.
- Settings-Ecosystem-Audit.md (LOCKED) — confirmed Account/Auth Architecture as the sole cross-cutting dependency and scoped it to exactly two things: session termination behavior and the logged-out destination.
- Identity-Amendment-001 (LOCKED) — confirms email is the account's authentication identifier; username is a separate, optional, later-collected search identifier. Not redesigned here.

**Downstream Dependents:**
- P-9 Account wireframe spec (not yet authored — this document supplies its Delete Account Contract, Section 6)
- P-4's Sign Out (already locked — this document resolves its one open dependency, the logged-out destination)
- Backend/auth-service implementation (token mechanics, session storage — explicitly out of scope here; see Section 8)

**Amendment Log:** Initial. v1.0 LOCKED.

> **Consuming-authority pointer — `Backend-Data-Model-Architecture-v1.0.md` (LOCK-CANDIDATE, June 2026).** Section 8's deferral of "backend authentication service (token issuance, validation, refresh, revocation)" and "session storage mechanism" — explicitly left to "whichever document designs the backend auth service" — is now addressed there: Section 1 recommends a stack (Firebase, pending PO ratification), Section 3.1/3.2 define the canonical `Account`/`Athlete` split and rename the auth-token construct to `AuthSession` to avoid colliding with the unrelated `WorkoutSession` entity, and Section 2 assigns token lifecycle ownership to the Authentication Service. This document's product-behavior contracts (session lifecycle, logged-out destination, Delete Account contract) are unchanged and remain this document's own authority — only the implementation-layer gap it deliberately left open is now filled. Open Question 1 (grace-period vs. immediate deletion) remains unresolved by either document.

---

## Section 1 — Account/Auth Architecture Review

A dependency audit was performed before any screen or flow was proposed, per this workstream's explicit instruction. The result changes the shape of this document significantly: **most of what "Account/Auth Architecture" might be expected to cover already exists, fully wireframed and locked, in O-1.**

### 1.1 What O-1 Already Owns (Cited, Not Redesigned)

| O-1 Screen/Flow | Content |
|---|---|
| O-1a — Welcome | The single unauthenticated entry point. Two CTAs: "Begin Your Legacy" → O-1b, "Sign In" → O-1d. No feature lists, social proof, or pricing language. |
| O-1b — Create Account | Email + Password (primary) + Apple Sign-In + Google Sign-In. **No guest mode** — an explicit, already-justified decision (a legacy cannot be built anonymously; "Forging Since" requires a real founding moment). Password minimum 8 characters. Handles "email already registered" with a "Sign in instead?" link. |
| O-1c — Display Name | Required, 1–50 characters. Populates P-1's identity block. "Forging Since" is set atomically at O-1b completion and is permanently immutable. |
| O-1d — Sign In | Same two auth options, for returning athletes. Wrong-credentials messaging never reveals which field is incorrect. **Account lock after 5 failed attempts within 15 minutes**, clearing automatically after 15 minutes or upon a successful password reset. |
| Forgot Password flow | Four steps: email entry → confirmation → reset → success. Email-enumeration protection (identical confirmation copy shown whether or not the email exists). Expired-link handling with a path back to step one. |
| Email verification | Soft — the account is fully usable immediately after creation; a non-blocking nudge persists in Profile until the athlete verifies. |
| Handoff | New athletes proceed to O-2 (not Home) after O-1c. Returning athletes who sign in successfully go straight to Home — onboarding is not shown again. |

This document does not modify, restate in detail, or re-derive any of the above. It is cited as authority.

### 1.2 What Was Never Defined Anywhere (The Actual Gap)

1. **Session/token lifecycle.** O-1's own downstream-dependencies list names "Authentication service" mechanics — session creation, validation, refresh, expiration — as a dependency it does not itself resolve.
2. **The logged-out destination.** P-4's Sign Out is fully locked *behaviorally* ("terminates session, exits modal and tab navigator, routes to logged-out entry point") but explicitly states the destination "is owned by Account/Auth Architecture, which does not yet exist." This is the most-cited open dependency across the entire locked Settings ecosystem.
3. **Account deletion requirements.** P-9 (not yet specced) is scoped only to a label and a row — "Delete Account, destructive, in-flow confirmation." No document anywhere defines what "destructive" actually entails: re-authentication, data scope, retention, or recoverability.

This document resolves exactly these three things, and nothing else.

---

## Section 2 — Authentication Flow Map

**Existing flows (cited from O-1, unmodified):**

```
New athlete:    O-1a (Welcome) → O-1b (Create Account) → O-1c (Display Name) → O-2
Returning:      O-1a (Welcome) → O-1d (Sign In) → Home
Recovery:       O-1d → Forgot Password (4 steps) → O-1d
```

**New flows this document defines:**

```
App launch, valid session found:     → Home directly (O-1 is not shown)
App launch, no valid session:        → O-1a (Welcome)
Sign Out confirmed (P-4):            → session terminated → O-1a (Welcome)
Delete Account confirmed (P-9):      → re-authentication → session terminated → account erasure process begins → O-1a (Welcome)
```

**Why O-1a for all logged-out cases:** O-1a is already the single, locked entry point for every unauthenticated state in the app, and it already presents both paths an athlete might need (create a new account, or sign back into an existing one). Inventing a separate "logged out" screen would duplicate O-1a's exact purpose. Reusing it satisfies the smallest-architecture requirement with zero new UI.

---

## Section 3 — Session State Matrix

| State | What's True | What's Accessible |
|---|---|---|
| Logged Out | No valid session exists | O-1a only (Welcome, with paths to Create Account / Sign In / Forgot Password) |
| Logged In | Valid session exists | Full app — Home, all tabs, Settings |
| Session Expired | A previously valid session has lapsed (token expiration, server-side invalidation, etc.) | Routed to O-1a on next app interaction requiring authentication; same as Logged Out from the athlete's perspective |
| Account Locked | 5 failed Sign In attempts within 15 minutes (O-1d, existing) | O-1d remains accessible; Sign In is blocked with the existing locked-account message and a "Reset password" link; clears automatically after 15 minutes or via successful reset |
| Pending Deletion | *Exists only if MVP adopts a grace-period deletion model — see Section 6 and Open Question 1. Not assumed by this document.* | If adopted: signing back in during the window restores the account to Logged In; if not adopted, this state does not exist and deletion is immediate |

---

## Section 4 — Account Creation Requirements

Restated from O-1 for completeness — **not redefined here:**

| Field | Required? | Source |
|---|---|---|
| Email | Yes (email+password path); provided automatically by Apple/Google on the social-auth path | O-1b |
| Password | Yes, email+password path only; minimum 8 characters | O-1b |
| Display Name | Yes; 1–50 characters | O-1c |

**No new account fields are introduced by this document.** Username, athlete type, profile photo, and all other identity fields remain owned by O-2 and later screens, per Identity-Amendment-001 and the existing onboarding sequence.

---

## Section 5 — Sign Out Contract

**Already locked (P-4-Settings-Root-Wireframe-Spec.md, cited verbatim):** tapping "Sign Out" presents a confirmation alert ("Sign Out?" / "You'll need to sign back in to access your account."); confirming terminates the session and exits both the Profile modal and the tab navigator.

**This document supplies the one previously-undefined piece:**

| Step | Behavior |
|---|---|
| Session invalidation | The athlete's session is invalidated such that it can no longer be used to access authenticated app state. (The specific mechanism — token revocation, server-side session deletion, etc. — is an implementation choice; see Section 8.) |
| Local state | Any locally cached session credential is cleared from the device. |
| Destination | O-1a (Welcome) — per Section 2. |
| Multi-device | Out of scope for this document — see Open Question 3. Sign Out is defined here at the single-device level only. |

No other behavior changes. Sign Out remains fully reversible — the athlete can sign back in via O-1d at any time, and nothing about their account or history is affected.

---

## Section 6 — Delete Account Contract

This is new — no document previously defined it. P-9 (not yet specced) will implement its UI against this contract.

### 6.1 Trigger

Athlete navigates P-4 → Account (P-9) → taps "Delete Account."

### 6.2 Re-Authentication Required

Before the deletion proceeds, the athlete must re-authenticate: re-enter their password (email+password accounts) or complete native re-authentication via the provider they originally signed in with (Apple/Google). This is a security gate appropriate to an irreversible, destructive action — consistent with this workstream's explicit framing of "secure account deletion," and consistent with requiring re-authentication before other high-consequence actions in comparable systems.

### 6.3 Confirmation

After re-authentication succeeds, a final destructive confirmation is presented (in-flow alert/sheet, per P-4-Settings-Root-Architecture.md's existing characterization of this action — "in-flow confirmation sequence, not a separate screen push"). This document does not design that confirmation's exact copy; that belongs to P-9's wireframe spec.

### 6.4 Deletion Contract Shape (Branch Left Open)

**Whether deletion is immediate or enters a recoverable grace period before permanent erasure is a policy-dependent decision this document does not resolve.** Both patterns are common and legitimate (immediate hard-delete vs. a recovery window), and the correct choice depends on legal/data-retention policy outside this document's authority. What this document defines is the *shape* of the contract, valid under either branch:

```
Re-authentication succeeds
    ↓
Final confirmation accepted
    ↓
Session terminated immediately (the athlete is logged out regardless of which branch is chosen)
    ↓
Branch A — Immediate erasure:              Branch B — Grace period:
Account and associated data are            Account enters Pending Deletion state.
permanently deleted per data                Signing back in within the window
retention policy.                           restores the account to Logged In.
                                             After the window elapses, data is
                                             permanently deleted per policy.
    ↓                                            ↓
Destination: O-1a (Welcome)                 Destination: O-1a (Welcome)
```

Regardless of branch, the destination is O-1a — identical to Sign Out, per Section 2.

### 6.5 Erasure Scope

Out of scope for this document to enumerate exhaustively (a data-architecture concern), but the principle is stated: deletion is the athlete's own request to remove their account and the data tied to it. This is unrelated to and does not conflict with "Never Charge For History" (Monetization Architecture Amendment 001) — that principle governs what a *retained* account can access regardless of subscription tier; it says nothing about an athlete's right to delete their own account entirely.

---

## Section 7 — Logged-Out Destination Contract

**Formally resolved: O-1a (Welcome), reused without modification, for every logged-out case:**

| Trigger | Destination |
|---|---|
| App launch with no valid session | O-1a |
| Sign Out confirmed (P-4) | O-1a |
| Delete Account confirmed (P-9), either branch | O-1a |
| Session expires while app is in use | O-1a (on next interaction requiring authentication) |

No new screen is created. This is the single most direct resolution available given O-1a's existing, locked scope as the universal unauthenticated entry point.

---

## Section 8 — Dependencies and Open Questions

### 8.1 Required External Dependencies

| Dependency | Status |
|---|---|
| Backend authentication service (token issuance, validation, refresh, revocation) | Not designed here — implementation-layer, per this workstream's instruction to separate product behavior from provider choice |
| Session storage mechanism (secure on-device storage for the session credential) | Implementation-layer; not designed here |
| Account deletion backend process (data erasure execution, regardless of which branch Open Question 1 resolves to) | Implementation-layer; this document defines the contract shape, not the execution |

### 8.2 Open Questions

1. **Does MVP adopt a grace-period deletion model, or immediate hard-delete?** Explicitly unresolved — a policy/legal decision outside this document's authority. Section 6.4 defines the contract shape under either branch so that resolving this later does not require revisiting this architecture.
2. **Token refresh strategy** (silent refresh vs. forced re-login on expiration) — implementation-layer, does not affect the product behavior already defined (expired session → O-1a either way).
3. **Multi-device session handling** (does Sign Out on one device affect sessions on other devices?) — not resolved here; flagged for whichever document designs the backend auth service.
4. **Exact backend auth provider/mechanism** (custom JWT, a managed auth service, etc.) — explicitly out of scope per this workstream's separation-of-concerns instruction. Apple/Google Sign-In integration is the one provider-adjacent decision that *does* affect UX, and it is already locked in O-1 — not revisited here.

**Status of this architecture: fully resolved at the product-behavior level.** All four open items are implementation-layer or policy decisions that do not block this document or the P-9 wireframe spec that follows it.

---

## Section 9 — Recommendation for Next Specs/Screens

**Author the P-9 Account wireframe spec next**, using this document's Delete Account Contract (Section 6) as its authority for the re-authentication step, confirmation behavior, and destination. P-9's spec should design the actual in-app screen content (the two rows — Export My Data, Delete Account — and their exact copy/layout), not redecide anything resolved here.

**No other new screens are required.** O-1 already covers Welcome, Create Account, Display Name, Sign In, and Forgot Password in full. This architecture closes the remaining gap without introducing any new wireframe beyond what P-9 will eventually need.

---

## Section 10 — Lock Recommendation

**LOCKED.** The three gaps this document was scoped to close — session lifecycle (product-behavior level), the logged-out destination, and the account deletion contract — are each resolved. Open Questions 1–4 (Section 8.2) are implementation-layer or policy decisions that do not block this architecture or its immediate downstream consumer, the P-9 wireframe spec.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Dependency audit found O-1 already fully specifies sign-up/login/forgot-password — cited, not redesigned. Resolved logged-out destination as O-1a (reused, no new screen). Defined Sign Out's session-invalidation mechanics and Delete Account's re-authentication requirement and contract shape. Left the immediate-vs-grace-period deletion branch explicitly open as a policy-dependent decision. |

---

*Account/Auth Architecture*
*Architecture Specification — Session Lifecycle, Logged-Out Destination, and Account Deletion Contract*
*June 2026*
*Authority: Account-Creation-Wireframe-Spec-O1.md (LOCKED), P-4-Settings-Root-Architecture.md (LOCKED), P-4-Settings-Root-Wireframe-Spec.md (LOCKED), Settings-Ecosystem-Audit.md (LOCKED), Identity-Amendment-001 (LOCKED)*
*Status: LOCKED*
