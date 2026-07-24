# P-8 Subscription Architecture
## Architecture Specification — Subscription Management Information Architecture
### June 2026

**Status:** LOCKED

**Type:** Screen Architecture (architecture-level, not a pixel wireframe — mirrors the role P-4-Settings-Root-Architecture.md and P-6-Privacy-Architecture.md played before their wireframe specs)

**Date:** June 2026

**Authority Chain:**
- Monetization-Architecture-Amendment-001 (LOCKED) — free/premium tier definitions, downgrade behavior, Never Charge For History principle, import model
- Critical-Decisions-Amendment-001 (LOCKED) — Decision 4: squad limit revised to 2 free (supersedes Monetization Amendment 001's original 1-squad figure)
- M-7-Premium-Upsell-Spec.md (LOCKED) — upsell trigger conditions, "Upgrade" CTA hand-off contract, explicit no-pricing/no-checkout constraint
- P-4-Settings-Root-Architecture.md v1.0 (LOCKED) / P-4-Settings-Root-Wireframe-Spec.md v1.0 (LOCKED) — entry point, modal stack behavior, pushed-screen header convention, the open question on billing UI model this document resolves

**Downstream Dependents:**
- P-8 Subscription wireframe spec (recommended immediately — see Section 7)
- Backend/data architecture (must define and expose a canonical subscription entitlement state — see Section 5; this document states the requirement, not the implementation)
- M-7 — this document fulfills M-7's own explicit hand-off contract ("the transaction belongs to a dedicated subscription management screen")

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Section 1 — P-8 Architecture Review

A dependency audit was performed before any new control was proposed. The result: P-8's actual job is narrower than "subscription screen" might suggest, because Monetization Amendment 001, Critical Decisions Amendment 001, and M-7 already own almost everything about *what* the limits and benefits are and *when* the upsell fires.

**Fully owned elsewhere — P-8 reuses, does not redefine:**

| Owned By | Content |
|---|---|
| Monetization Amendment 001 §3–4 | Free limits (3 programs, 50 photos account-wide, 1 lifetime import) and Premium benefits (unlimited programs/photos/squads/imports, plus not-yet-built future items explicitly marked "deferred to post-MVP") |
| Critical Decisions Amendment 001, Decision 4 | Squad limit is **2** free, not 1 — this supersedes Monetization Amendment 001's original figure. The Master PRD still contains a stale "1 squad" reference; P-8 must cite the current 2-squad limit, never the stale PRD text. |
| Monetization Amendment 001 §2 | Never Charge For History — all historical content (workouts, chapters, goals, honors, ranks, timeline, imported content) is permanently free and must never be gated by P-8, regardless of subscription state |
| Monetization Amendment 001 §5–8 | Downgrade behavior for every limit type: **never deletes anything, ever** — only blocks *new* creation beyond the limit. This is locked and non-negotiable. |
| M-7-Premium-Upsell-Spec.md | All four upsell trigger conditions and their copy; the "Build more. Keep everything." aspirational messaging; the explicit constraint that M-7 contains no pricing, no billing details, no checkout — *"M-7 is a gate, not a checkout. The transaction belongs to a dedicated subscription management screen."* The "Upgrade" CTA inside M-7 already routes to P-8 and does not execute a transaction itself. M-7 never fires for premium athletes and expects the *triggering surface* (not P-8) to re-evaluate the limit when the athlete returns after upgrading. |

**What this means:** P-8 is the transaction/management surface M-7 already assumes exists. P-8 does not re-litigate limits, benefits, or trigger logic — it displays them (reusing existing copy and values exactly) and provides the upgrade/manage/restore actions that M-7 and the Monetization Amendment already assume are available somewhere.

**Real gaps confirmed absent from every locked document (not speculative):**

1. **No pricing or SKU/cadence decision exists anywhere.** No monthly/annual terminology, no price points. M-7 explicitly punts this to "Settings (P-series, not yet specced)" — this document.
2. **No canonical subscription-entitlement concept exists anywhere.** Every document assumes a binary free/premium state but nothing locks even the concept.
3. **No billing platform integration decision exists.** Carried forward from P-4 Settings Root Architecture's own open question.
4. **No "Restore Purchases" mechanism is mentioned anywhere** — a near-universal App Store/Play Store requirement for any subscription app.
5. **No billing-management (cancel/change plan) flow is specified.**

Each is resolved or scoped below, without inventing pricing or plan structure this document is not authorized to invent.

---

## Section 2 — Resolved Architecture Decisions

**Billing UI model:** P-8 is an in-app informational/management screen. The actual purchase transaction uses the **native platform purchase sheet** (StoreKit / Play Billing), not a custom in-app checkout UI. Building a custom checkout when the OS already provides one is unnecessary complexity, and platform guidelines generally expect the native flow for IAP-billed subscriptions. This resolves the open question carried forward from P-4-Settings-Root-Architecture.md §6, Item 3.

**Billing management:** "Manage Subscription" deep-links to the native OS subscription settings (iOS Settings → Subscriptions / Play Store → Subscriptions). No custom cancel-flow or plan-change UI is built. There is no in-app "Downgrade" button — downgrade happens entirely through the platform's native cancellation, detected by Forge Legacy via entitlement refresh.

**Restore Purchases:** A single action on P-8 that calls the platform SDK's restore function, with minimal inline success/failure feedback. No separate screen.

**Subscription Status Naming:** Forge must expose a canonical subscription entitlement state to the client. This document requires the *concept* — a readable, authoritative signal of whether the athlete currently holds an active premium entitlement — not a specific implementation. **No field name, enum, or schema is locked here** (e.g., this document does not lock anything resembling `subscriptionStatus: FREE | PREMIUM`). Final naming and storage are left entirely to backend/data architecture. P-8 only requires that such a state exists and is readable at runtime.

**Content omission:** P-8's plan comparison shows only currently-functional Premium benefits (unlimited programs/photos/squads/imports). It does not advertise "Future: AI / advanced analytics / premium legacy tools" as available now — those remain part of Premium's long-term definition but aren't built, so showing them as a current benefit would overpromise.

**Entry-point flexibility:** P-8 must support two distinct navigation contexts — pushed onto the Profile modal stack via P-4, *and* presented directly from any M-7 trigger point elsewhere in the app (W-4, S-1, L-15, W-1, etc., per M-7's own navigation map). Dismissing P-8 always returns to wherever it was opened from. This is a real requirement already implied by M-7's locked spec, not a new feature.

---

## Section 3 — Subscription Information Architecture

P-8 content, in order:

1. **Current plan status** (Free or Premium) — prominent, top of screen. Sourced from the canonical entitlement state (Section 2).
2. **Plan comparison** — Free column vs. Premium column, reusing the exact locked limits and benefits from Monetization Amendment 001 / Critical Decisions Amendment 001. No new content is introduced here.
3. **Current usage review** (shown when Free) — programs/photos/squads counts and import status, read from existing counters already owned elsewhere in the product (e.g., the photo counter shown on L-15, the program count, the squad count, `hasUsedFreeImport`). Informational only — never framed as "delete something," consistent with Never Charge For History.

   **Purpose:** Allow athletes to understand proximity to free-tier limits *before* encountering an M-7 trigger. This directly supports Forge's transparency principles — no hidden blockers, clear limit visibility, no surprise upsells. An athlete should be able to check "how close am I to my photo limit?" on their own terms, not only discover it the moment M-7 fires.

4. **Upgrade CTA** (shown when Free) — triggers the native platform purchase sheet. Any price shown near this CTA is read dynamically from the platform's product catalog at runtime; it is never hardcoded in this document or in the wireframe spec that follows it.
5. **Manage Subscription** (shown when Premium) — deep-links to native OS subscription settings.
6. **Restore Purchases** — always visible, regardless of current state.

---

## Section 4 — Subscription State Matrix

| State | P-8 Display | Available Actions |
|---|---|---|
| Loading / checking entitlement | Neutral loading state, no plan comparison shown yet | None until resolved |
| Free | Plan comparison, usage review, platform-sourced pricing near Upgrade CTA | Upgrade, Restore Purchases |
| Premium (active) | Current plan confirmation, benefits unlocked — no limits displayed as constraining | Manage Subscription, Restore Purchases |
| Restore attempted — no purchases found | Inline message; athlete remains on their current displayed state | Try again, or Upgrade (if Free) |

No separate "Premium — cancelling" state is modeled. The platform already manages pending cancellation natively; Forge Legacy's displayed state simply reverts to Free once the entitlement actually lapses, without P-8 needing to track or display an intermediate state.

---

## Section 5 — Navigation Dependencies

- **P-4 → Subscription row → P-8** — push onto the Profile modal stack, reusing the existing P-4 pattern.
- **M-7 → "Upgrade" tap → P-8** — existing locked entry point per M-7-Premium-Upsell-Spec.md §7.1/§8.2; presented over the triggering surface (W-4, S-1, L-15, W-1, etc.), not via P-4.
- **P-8 → native platform purchase sheet** — OS-level presentation, not an in-app screen push.
- **P-8 → native OS subscription settings** — external deep link; exits the app.
- **P-8 has no child screens of its own.**
- **Dismiss/back always returns to wherever P-8 was opened from** — P-4 if entered via Settings, or the original M-7 triggering surface if entered via an upsell gate. This dual-context requirement is not a new feature; it is already implied by M-7's locked navigation map, which names P-8 as its universal "Upgrade" destination regardless of which limit triggered the gate.

---

## Section 6 — Required External Dependencies

| Dependency | Status |
|---|---|
| Platform billing integration (StoreKit / Play Billing, or a unifying SDK) | Engineering decision, not yet made |
| Backend entitlement/receipt validation (renewals, cancellations) | Implied by everything else in this document; never architected; out of scope for a product wireframe but flagged as a build dependency |
| Pricing/SKU configuration in App Store Connect / Google Play Console | A business decision entirely outside product documentation |
| A canonical subscription entitlement state, exposed by Forge to the client | Required at the concept level only (Section 2); field naming and storage are left to backend/data architecture, not decided here |

---

## Section 7 — Open Questions

1. **Native billing integration approach** (direct StoreKit/Play Billing vs. a third-party SDK) — an engineering choice; does not block this architecture.
2. **Single SKU/cadence vs. monthly+annual choice** — no authorization exists for the latter anywhere in the docs. This document assumes a single SKU for MVP as the smallest-architecture default; multi-cadence support is flagged as a future expansion requiring a business pricing decision first.
3. **Exact pricing copy** — pending a business decision outside this workstream's scope. This architecture treats price as platform-sourced and dynamic; it is never hardcoded here or in the wireframe spec.
4. **Final naming/storage of the subscription entitlement state** — explicitly deferred to backend/data architecture. This document states only that the concept must exist and be readable by P-8; it does not propose a field name, enum, or schema.

**Status of P-8 itself: fully resolved.** All four items above are engineering or business decisions outside this document's scope — none block the architecture or the wireframe spec that follows it.

---

## Section 8 — Recommendation for P-8 Wireframe Spec Scope

This architecture is fully locked. **Recommend authoring the full P-8 wireframe spec immediately.** None of the Open Questions above block describing P-8's layout, states, or behavior — the wireframe spec can fully specify the screen using placeholder pricing copy (clearly marked as platform-sourced, not literal) wherever a price would appear. The only thing that remains a placeholder pending a business decision is the literal pricing text itself.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Dependency audit across Monetization Amendment 001, Critical Decisions Amendment 001, and M-7. Confirmed P-8 reuses all existing limits/benefits/downgrade rules without redefinition. Resolved billing UI model (native platform purchase sheet), billing management (native OS deep link), and Restore Purchases (platform SDK call, no new screen). Subscription entitlement state required at concept level only — no field name locked. |

---

*P-8 Subscription Architecture*
*Architecture Specification — Subscription Management Information Architecture*
*June 2026*
*Authority: Monetization-Architecture-Amendment-001 (LOCKED), Critical-Decisions-Amendment-001 (LOCKED), M-7-Premium-Upsell-Spec.md (LOCKED), P-4-Settings-Root-Architecture.md (LOCKED), P-4-Settings-Root-Wireframe-Spec.md (LOCKED)*
*Status: LOCKED*
