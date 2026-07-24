# P-4 Settings Root Architecture
## Architecture Specification — Settings Hub and Information Architecture
### June 2026

**Status:** LOCKED

**Type:** Screen Architecture (architecture-level, not a pixel wireframe — mirrors the role P-2-Progress-Hub-Architecture.md played before P-2-Progress-Hub-Spec.md)

**Date:** June 2026

**Authority Chain:**
- Profile-Wireframe-Spec-P1.md v1.3 (LOCKED) — Section 9 (Settings Entry Point), Section 9.3 (Settings Hierarchy Reminder), Section 13.2 (Navigation Stack)
- P-1-Amendment-001-Progress-Entry-Point.md (LOCKED) — Section 10.2 (Settings range reference)
- Identity-Amendment-001 (LOCKED) — username search opt-out authority for P-6
- Monetization-Architecture-Amendment-001 (LOCKED) — plan limits and downgrade rules authority for P-8
- Critical-Decisions-Amendment-001 (LOCKED) — squad limit authority for P-8
- P-3-Retirement-Amendment.md (LOCKED) — corrected "P-3–P-8" settings range language to "P-4–P-8"
- Profile-Progress-Ecosystem-Audit.md (LOCKED) — confirms P-1/P-2/P-2.2 ecosystem is clean and implementation-ready; this document addresses the separately-flagged Settings gap

**Downstream Dependents:**
- P-4 Settings Root wireframe spec (recommended next deliverable — see Section 7)
- P-8 Subscription, P-6 Privacy, P-5 Notifications, P-9 Account (individually specced in follow-on workstreams)
- Account/Auth Architecture (external prerequisite for Sign Out and Delete Account session termination — not authored by this document)

**Amendment Log:** Initial. v1.0 DRAFT.

---

## Section 1 — P-4 Architecture Review

P-1 v1.0 already establishes a Settings entry point and a reserved screen-code range, but no architecture or wireframe document for P-4 through P-9 has ever been authored. This is a known, previously-flagged gap (an earlier MVP audit identified Settings screens as unspecced).

**What is already locked and reused without modification:**

| Source | Locked Content |
|---|---|
| P-1 §9 | Settings is a single row, TIER 6 (bottom of P-1, below Accomplishments), 56dp minimum height, full-width tappable → P-4 Settings Root. Always visible, no empty states. |
| P-1 §9.2 | No Subscription row on P-1. Subscription is reached only via Settings (P-4 → P-8) or contextually via the M-7 Premium Upsell Sheet. Rationale: a Subscription row on the identity screen sends an unwanted commercial signal. |
| P-1 §13.2 | P-4 pushes onto P-1's modal navigation stack. P-5 through P-9 (via P-4) continue on that same stack. Back navigation from any child returns to P-4; dismissing the modal at any point returns to the originating tab. |
| P-1 §9.3 / Amendment 001 §10.2 | Reserved screen range: P-5 Notifications, P-6 Privacy, P-7 Connected Apps, P-8 Subscription, P-9 (originally "Delete Account / Export"). The "P-3–P-8" phrasing in earlier documents is already corrected to "P-4–P-8" by the P-3 Retirement Amendment. |

**P-4's role, established by this document:** P-4 is a pure navigation hub. It carries zero dynamic content, zero identity content, and zero metrics — consistent with P-1's own framing that "Settings is maintenance, not identity." Unlike L-1 or P-2, which open with an identity/narrative arc (Hero, FLM, rank), P-4 opens directly into a flat list of categories. This is a deliberate simplification, not an oversight: Settings has no story to tell.

This document does not redesign P-1, P-2, monetization, or account architecture. It defines only the structure of P-4 and the boundary between P-4-direct content and content requiring a child screen.

---

## Section 2 — Settings Information Architecture

### 2.1 Resolution — P-7 Connected Apps (Reserved Code, Not MVP)

P-7 is the only item in the P-4–P-9 range with zero supporting architecture anywhere in the documentation. P-5, P-6, P-8, and P-9 each have at least partial authority from a locked amendment (Identity Amendment 001; Monetization/Critical Decisions Amendments). P-7 has only a one-line mention in the Master PRD's settings table ("Health app integrations") with no integration list, no data model, no sync or conflict-resolution model against the already-locked workout logging system.

This is the same profile P-3 Rank Detail had before its retirement: a reserved code with a name and nothing behind it. Health integrations (HealthKit, Google Fit, etc.) are a standalone engineering effort — platform SDK integration, permissions UX, data mapping, conflict resolution — not a settings toggle screen.

**Resolution:** P-7 is a reserved code, not an MVP row. P-4 ships at MVP without a Connected Apps entry. P-7 remains reserved for a future integration architecture workstream; this is a deferral, not a retirement — no amendment is required unless and until P-7 is later built or formally retired.

### 2.2 Resolution — P-9 Renamed to "Account"

The original reference, "P-9 Delete Account / Data Export," leads with the most alarming function. This is poor framing under Product DNA — the same reasoning that kept a Subscription row off P-1 applies here: don't lead with the signal you don't want to dominate the experience.

**Resolution:** P-9 is renamed **"Account."** It is a small two-row screen:
- **Export My Data** — basic export, MVP scope (advanced export analysis is post-MVP per Master PRD)
- **Delete Account** — destructive, multi-step in-flow confirmation (alerts/sheets, not its own screen code — same treatment as Sign Out, Section 2.3)

No new account fields are introduced (email/password management, security settings, etc. remain out of scope — this document does not redesign account architecture).

### 2.3 P-4 Content at MVP

In order:

```
┌─────────────────────────────────────────────────┐
│  ‹ Settings                                      │
│                                                   │
│  Notifications                              →    │
│  ─────────────────────────────────────────────   │
│  Privacy                                    →    │
│  ─────────────────────────────────────────────   │
│  Subscription                               →    │
│  ─────────────────────────────────────────────   │
│  Account                                    →    │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  Sign Out                                        │
│                                                   │
│  ─────────────────────────────────────────────   │
│                                                   │
│  Terms of Service                                │
│  Privacy Policy                                  │
│                                                   │
│  Version 1.0.0 (Build 1)                         │
└─────────────────────────────────────────────────┘
```

1. **Notifications** → P-5
2. **Privacy** → P-6
3. **Subscription** → P-8
4. **Account** → P-9 (Export My Data + Delete Account)
— divider —
5. **Sign Out** — direct action, confirmation alert, not a child screen
— footer, visually de-emphasized —
6. **Terms of Service** / **Privacy Policy** — external links, not child screens
7. **App Version** — static, non-interactive text

P-7 Connected Apps does not appear (Section 2.1).

Items 5–7 are gaps identified during this audit: no locked document specifies sign-out, legal links, or version display, yet every settings root needs them. They are proposed as P-4-direct content rather than child screens because each is a single action or static line, not a category with multiple controls — consistent with the smallest-architecture principle.

### 2.4 Content Summary by Screen

**P-5 Notifications** — Push notification preferences, broken out per event type (specific event types to be enumerated in the P-5 spec; see Open Question 5). Authority: Master PRD mention only; no detailed spec exists.

**P-6 Privacy** — Username search opt-out (Identity Amendment 001) and squad visibility controls. Future expansion (public profile visibility, journey sharing, per-field accomplishment/type/rank/forging-since visibility — all flagged in P-1 §15) is explicitly deferred and not part of MVP P-6.

**P-8 Subscription** — Free vs. Premium feature comparison, upgrade CTA, subscription management, and a review of current limit usage (photos, squads, imports) against plan limits. Authority: Monetization Architecture Amendment 001, Critical Decisions Amendment 001. Open question on billing UI model (Section 6, Item 3).

**P-9 Account** — Export My Data (basic) and Delete Account (destructive). See Section 2.2.

**P-7 Connected Apps** — Reserved, not specced, not MVP. See Section 2.1.

---

## Section 3 — Navigation Map

| From | Action | To | Stack Behavior |
|---|---|---|---|
| P-1 | Tap Settings row | P-4 | Push onto P-1's modal navigation stack (existing, locked) |
| P-4 | Tap Notifications | P-5 | Push onto same modal stack |
| P-4 | Tap Privacy | P-6 | Push onto same modal stack |
| P-4 | Tap Subscription | P-8 | Push onto same modal stack |
| P-4 | Tap Account | P-9 | Push onto same modal stack |
| P-4 | Tap Sign Out | — | In-place confirmation alert. On confirm: terminates session, exits the modal and tab navigator entirely — not a standard stack push. |
| P-4 | Tap Terms of Service / Privacy Policy | — | External webview or system browser. Does not push onto the modal stack. |
| P-5 / P-6 / P-8 / P-9 | Back | P-4 | Standard back-stack pop |
| P-9 | Tap Delete Account | — | In-flow confirmation sequence (alerts/sheets), not a separate screen push. On final confirm: terminates session, exits modal and tab navigator. Dependency on Account Architecture (Section 5). |
| M-7 Premium Upsell Sheet | Tap Upgrade | P-8 | Existing, locked, unmodified contextual entry point. |
| (any) | — | P-7 | No entry point at MVP. Reserved code only. |

---

## Section 4 — Child Screen Inventory

| Screen | Content | Complexity | MVP? | Authority | Spec Status |
|---|---|---|---|---|---|
| P-5 Notifications | Push prefs per event type | Simple | Yes | Master PRD mention only | Unspecced |
| P-6 Privacy | Search/squad visibility toggles; future per-field expansion deferred | Simple–Moderate | Yes | Identity Amendment 001 | Unspecced |
| P-7 Connected Apps | Health app integrations | Moderate | **No — reserved, deferred** | None | N/A |
| P-8 Subscription | Plan comparison, upgrade CTA, manage, limit review | Moderate–Complex | Yes | Monetization Amendment 001, Critical Decisions Amendment 001 | Unspecced |
| P-9 Account | Export My Data (basic) + Delete Account (destructive, in-flow) | Complex | Yes — pre-launch legal requirement | Master PRD line only | Unspecced |

---

## Section 5 — Required Dependencies

| Dependency | Needed For | Status |
|---|---|---|
| Identity-Amendment-001 | P-6 username search toggle | LOCKED — sufficient authority |
| Monetization-Architecture-Amendment-001, Critical-Decisions-Amendment-001 | P-8 plan limits, downgrade rules | LOCKED — sufficient authority |
| P-1 §9, §13.2 | P-4 entry point, modal stack behavior | LOCKED — reused, not modified |
| P-1 §15 | P-6 future per-field privacy expansion | LOCKED — explicitly deferred, not MVP |
| **Account/Auth Architecture** | Sign Out and Delete Account session termination; the logged-out state these actions land on | **Does not exist in any locked document.** Out of scope for this architecture per user constraint. Flagged as an external prerequisite — see Section 6, Item 4. |
| Platform billing (StoreKit / Google Play Billing) | P-8 upgrade flow | Integration model undecided — see Section 6, Item 3. |

---

## Section 6 — Open Questions

1. ~~Confirm Sign Out, Legal links, and App Version as P-4-direct content (not child screens).~~ **RESOLVED — yes.** Locked into the P-4 wireframe spec.
2. ~~Is P-7 Connected Apps MVP-required?~~ **RESOLVED** — reserved code, deferred (Section 2.1).
3. **Does P-8 use native platform billing UI (StoreKit/Play Billing) or an in-app custom paywall?** Carried forward to the P-8 Subscription workstream. Does not block P-4's lock — P-4 only needs a navigation row to P-8, not its internal billing model.
4. **Does Delete Account terminate the session and exit the entire modal/tab navigator? Does an Account Architecture already define the logged-out state it lands on?** Carried forward to the P-9 Account workstream. Does not block P-4's lock — P-4 only needs a navigation row to P-9.
5. **Should P-5's notification event types be enumerated now, or deferred to the P-5 spec itself?** Carried forward to the P-5 Notifications workstream. Does not block P-4's lock.
6. ~~Should a future "Preferences" category get a placeholder row on P-4 now?~~ **RESOLVED — no placeholder.** Units are currently freeform per-goal (G-3) with no global system; no row added.
7. ~~Should P-5/P-6/P-8/P-9 be renumbered under a P-4.X decimal convention?~~ **RESOLVED — no.** Codes are already locked via P-1 and its amendments; renumbering is out of scope. The inconsistency is noted, not corrected.
8. ~~Final naming/scope for P-9?~~ **RESOLVED** — "P-9 Account": Export My Data + Delete Account (Section 2.2).

**Status of P-4 itself: fully resolved.** Items 3, 4, and 5 concern the internal content of P-8, P-9, and P-5 respectively — they are open questions for those future workstreams, not for P-4. P-4's own architecture has no remaining open items.

---

## Section 7 — Recommendation for P-4 Wireframe/Spec Scope

**Author the P-4 Settings Root wireframe spec now.** Scope: the root screen only — rows, ordering, Sign Out, Legal, Version, navigation behavior, four category rows (not five). This is small and unblocked by every open question above except Item 1 (recommended resolution: yes).

**Defer P-5, P-6, P-8, P-9 detailed specs to individual follow-on workstreams, in this sequence:**

1. **P-8 Subscription** — fully authorized by existing locked amendments; no external blockers.
2. **P-6 Privacy** — has partial authority already (Identity Amendment 001); future expansion explicitly deferred.
3. **P-5 Notifications** — simple scope; only needs event-type enumeration (Open Question 5).
4. **P-9 Account — last, gated on Account/Auth Architecture being authored first.** P-9's core function (Delete Account) terminates the session and exits to a logged-out state that no locked document currently defines (Open Question 4). Speccing P-9 before that foundation exists means designing around an undefined dependency. If Account/Auth Architecture is authored before this sequence reaches P-9, it may move earlier in the order; otherwise it remains last and may block on that prerequisite workstream entirely.

**P-7 Connected Apps gets no spec at this time.** The code is reserved; revisit only when integration architecture becomes a planned workstream.

---

## Section 8 — Lock Recommendation

**LOCKED.** All open questions concerning P-4 itself (Items 1, 2, 6, 7, 8) are resolved. Items 3, 4, and 5 are carried forward to the P-8, P-9, and P-5 workstreams respectively — they govern those screens' internal content, not P-4's structure, and do not block this document.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Status DRAFT → LOCKED. Open Questions 1, 6, 7 resolved. Items 3, 4, 5 reclassified as downstream workstream questions, not P-4 blockers. |

---

*P-4 Settings Root Architecture*
*Architecture Specification — Settings Hub and Information Architecture*
*June 2026*
*Authority: Profile-Wireframe-Spec-P1.md (LOCKED), P-1-Amendment-001 (LOCKED), Identity-Amendment-001 (LOCKED), Monetization-Architecture-Amendment-001 (LOCKED), Critical-Decisions-Amendment-001 (LOCKED)*
*Status: LOCKED*
