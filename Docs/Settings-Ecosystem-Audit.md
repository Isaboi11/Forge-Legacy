# Settings Ecosystem Audit
## Architecture Audit — P-4, P-5, P-6, P-8
### June 2026

**Status:** LOCKED

**Type:** Architecture Audit Report (reference document, not a screen specification)

**Date:** June 2026

**Scope:** P-4 Settings Root (Architecture + Wireframe Spec), P-5 Notifications (Architecture + Wireframe Spec), P-6 Privacy (Architecture + Wireframe Spec), P-8 Subscription (Architecture + Wireframe Spec) — 8 documents total, all LOCKED.

**Authority Chain:** This document audits the following locked sources and makes no architectural changes to any of them:
- P-4-Settings-Root-Architecture.md v1.0 (LOCKED) / P-4-Settings-Root-Wireframe-Spec.md v1.0 (LOCKED)
- P-5-Notifications-Architecture.md v1.0 (LOCKED) / P-5-Notifications-Wireframe-Spec.md v1.0 (LOCKED)
- P-6-Privacy-Architecture.md v1.0 (LOCKED) / P-6-Privacy-Wireframe-Spec.md v1.0 (LOCKED)
- P-8-Subscription-Architecture.md v1.0 (LOCKED) / P-8-Subscription-Wireframe-Spec.md v1.0 (LOCKED)

**Constraint compliance:** This audit does not redesign any locked Settings document, introduce new Settings categories, or propose new features. All findings were verified by direct text search against the actual document content, not from memory or summary.

---

## Section 1 — Ecosystem Health Summary

The locked Settings ecosystem (P-4, P-5, P-6, P-8) is in good health. One cosmetic finding was identified — an internal naming inconsistency within a single document's own body text — and zero blocking issues, zero duplicate ownership problems, and zero orphaned workstreams were found. The single cross-cutting dependency in the entire ecosystem (Account/Auth Architecture) is narrowly scoped, consistently described, and shared rather than duplicated across the two places that need it.

| Finding Category | Count | Severity |
|---|---|---|
| Stale references | 1 (internal to P-6 only) | Cosmetic — does not affect behavior |
| Duplicate ownership | 0 | N/A |
| Overlapping responsibilities | 0 | N/A |
| Unresolved cross-cutting dependencies | 1 (Account/Auth Architecture) | Expected, already well-scoped |
| Orphaned workstreams | 0 | N/A |

---

## Section 2 — Stale References Review

### 2.1 P-4 Settings Root — Clean

- Every reference to "P-3" across both P-4 documents is a legitimate historical or explanatory citation — either citing the P-3 Retirement Amendment directly, or comparing P-7's reserved-code status to P-3's pre-retirement profile ("the same profile P-3 Rank Detail had before its retirement"). No reference treats P-3 as active or current. **No correction needed.**
- Every reference to "Connected Apps" consistently marks P-7 as reserved, deferred, and explicitly not part of MVP — across the architecture's resolution section, the wireframe's row inventory, its Non-Behaviors section, and its Validation Checklist. **No correction needed.**
- Every reference to "P-9" calls it "P-9 Account" (Export My Data + Delete Account). Edit Profile is correctly and consistently identified as P-1.1 everywhere it appears — never P-9. **No correction needed.**
- Row inventory matches current architecture exactly: Notifications → P-5, Privacy → P-6, Subscription → P-8, Account → P-9, plus Sign Out / Legal links / App Version. Identical between the architecture document and the wireframe spec.

### 2.2 P-5 Notifications — Clean

No stale references found. All cross-references to P-6 and WSR-001 use current, correct terminology.

### 2.3 P-6 Privacy — One Finding

**Finding S-1:** P-6-Privacy-Architecture.md's own body text refers to Setting 2 by an outdated working name in two places:

- Section 1 ("Guardrail this document establishes..."): *"Sharing default setting ('Share workouts with my squad') — owned by WSR-001."*
- Section 2 ("Privacy Information Architecture"): *"'Share workouts with my squad' — toggle, default OFF..."*

P-6-Privacy-Wireframe-Spec.md — written after the architecture document, within the same workstream — deliberately renamed this setting to **"Allow squad check-in cards,"** with an explicit rationale: *"'Allow squad check-in cards' was chosen over alternatives like 'Share workouts with my squad' because the latter implies automatic, ongoing sharing."* The wireframe spec is the correct, final, locked name. The architecture document was never updated to reflect its own downstream renaming decision.

This is a cosmetic inconsistency between two LOCKED documents, not a behavioral or architectural defect. Every other document in the ecosystem that references this setting — including P-5-Notifications-Wireframe-Spec.md's cross-reference and P-6's own wireframe validation checklist — already uses the correct name "Allow squad check-in cards." The inconsistency is isolated entirely to P-6-Privacy-Architecture.md's own two mentions.

### 2.4 P-8 Subscription — Clean

No stale references found.

---

## Section 3 — Duplicate Ownership Review

**No duplicate controls found anywhere in the audited ecosystem.**

The one pair worth explicitly clearing, because it could plausibly look like duplication on a surface read, is P-6's "Allow squad check-in cards" and P-5's "Squad Check-ins." These are confirmed to be a clean **layered relationship**, not duplicate controls:

- P-6's setting gates whether a squad check-in card is *created at all* (`AthleteShareSettings.globalVisibility`, PRIVATE vs. SQUAD_ONLY).
- P-5's setting gates whether a *push notification accompanies* a check-in card that already exists (`AthleteShareSettings.squadNotificationsEnabled`).

This boundary is already explicitly documented at the exact point of potential confusion — P-5-Notifications-Wireframe-Spec.md's Non-behavior row for Squad Check-ins states: *"Does not control whether the check-in card itself is created — that is governed by P-6-Privacy-Wireframe-Spec.md's 'Allow squad check-in cards' setting."* No amendment is needed here; the cross-reference is correct and current (it uses the wireframe's correct name, not the stale architecture-doc name identified in Section 2.3).

No other setting in P-4, P-5, P-6, or P-8 duplicates, restates, or re-derives a control owned elsewhere.

---

## Section 4 — Overlapping Responsibilities Review

No overlapping responsibilities were found between any two audited documents.

- **P-5 / P-6 boundary:** confirmed clean in both directions (Section 3 above).
- **P-6 / P-1 (Profile) boundary:** P-6 never touches P-1 identity content — it hosts only visibility and sharing-default settings, never identity fields, rank display, or accomplishments themselves.
- **P-8 / M-7 boundary:** P-8's architecture explicitly reuses M-7's limits, benefits, and trigger logic *by reference* rather than restating or re-deriving any of it, and explicitly preserves M-7's "gate, not a checkout" boundary verbatim — M-7 never gained pricing logic, and P-8 never gained gate-trigger logic.
- **P-4 / its children (P-5, P-6, P-8, future P-9):** P-4 remains a pure navigation hub with zero duplicated content from any child screen — confirmed by its own Non-Behaviors section, which explicitly states no row displays a value, badge, or preview of its destination's content.

---

## Section 5 — Dependency Review

**The only cross-cutting dependency in the entire locked Settings ecosystem is Account/Auth Architecture**, and it is narrowly and consistently scoped:

| Consumer | What It Needs |
|---|---|
| P-4's Sign Out (locked, already specced) | Session termination behavior + a logged-out destination to route to |
| P-9 Account's Delete Account (not yet specced) | The identical two things: session termination + a logged-out destination |

These are not two separate or competing dependencies — they are the *same* dependency, needed by two different actions in two different documents. P-4-Settings-Root-Wireframe-Spec.md already states this connection explicitly in its own Open Issues section: *"P-9's session-termination dependency on Account/Auth Architecture — owned by the P-9 Account workstream (and, transitively, by this screen's own Sign Out behavior... which shares the same unresolved logged-out-destination dependency)."*

Confirmed by direct search: **zero mentions** of "Account/Auth," "logged out," or "session" exist anywhere in the P-5 or P-8 document sets. P-6 mentions Account/Auth exactly once, and only to note by contrast that *it* has no such dependency (*"Unlike P-9 (gated on a non-existent Account/Auth Architecture), P-6 has no external blocking dependency"*). No document outside P-4/P-9 has any stake in this dependency.

**Other open items, none cross-cutting or blocking:**

| Item | Owner | Status |
|---|---|---|
| Billing SDK choice (direct StoreKit/Play Billing vs. third-party) | P-8 | Self-contained engineering decision; doesn't block P-8's own lock |
| Field naming for Workout Tags / Squad Invitations preferences | P-5 | Deferred to backend/data architecture; doesn't block P-5's own lock |
| Field naming for subscription entitlement state | P-8 | Same pattern, same non-blocking status |
| WSR-001 header cross-reference cleanup ("P-settings (future)" → resolved) | P-6 | Cosmetic, optional, doesn't block anything |

---

## Section 6 — Orphaned Workstreams Review

**None found.** P-7 Connected Apps is *reserved*, not *orphaned* — there is a meaningful difference. An orphaned workstream would be something that was started and then abandoned mid-stream. P-7 was never started: it appears only as a one-line mention in the original Master PRD inventory, with zero supporting architecture (no integration list, no data model, no sync model) ever authored for it. Every document that mentions P-7 marks it consistently and deliberately as deferred, with stated rationale. This is intentional scoping, not abandonment.

No other workstream in the audited ecosystem shows signs of being started and left incomplete.

---

## Section 7 — Recommended Amendments

**One recommended amendment, cosmetic only:**

**P-6-Privacy-Architecture.md** — rename Setting 2 from "Share workouts with my squad" to "Allow squad check-in cards" in its two body-text mentions (Section 1's guardrail bullet, and Section 2's numbered content list), to match the name already locked in P-6-Privacy-Wireframe-Spec.md. This is a find-and-replace-level correction, not a redesign — it does not change behavior, ownership, defaults, or any architectural decision. Per this audit's constraints, the correction is recommended here, not performed.

No other amendments are recommended. No retirements are recommended — nothing in this ecosystem is obsolete.

---

## Section 8 — Readiness Assessment for Account/Auth Architecture

**Account/Auth Architecture can begin immediately.**

The audit found:
- Exactly one cross-cutting dependency exists in the entire locked Settings ecosystem, and it is already narrowly and consistently scoped across the two documents that need it (Section 5).
- No conflicting requirements between P-4's Sign Out and the future P-9's Delete Account — they need identical things from Account/Auth Architecture, not competing things.
- No other audited document (P-5, P-6, P-8) has any stake in Account/Auth Architecture.
- No unresolved architectural questions, duplicate controls, or orphaned workstreams stand in the way.

Account/Auth Architecture's scope, once it begins, should explicitly resolve: (1) session termination behavior, and (2) the logged-out destination screen/state that Sign Out and Delete Account both route to. Both requirements are already documented precisely in P-4's own locked specs — Account/Auth Architecture does not need to rediscover them, only resolve them.

---

## Change Log

*No entries. v1.0 LOCKED.*

---

*Settings Ecosystem Audit*
*Architecture Audit — P-4, P-5, P-6, P-8*
*June 2026*
*Status: LOCKED*
