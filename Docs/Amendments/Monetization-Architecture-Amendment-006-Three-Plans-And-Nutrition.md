# Monetization Architecture Amendment 006 — Three Plans, One Ladder
## Forge Legacy | Version 1.0 — September 2026

**Amendment ID:** Monetization-Architecture-Amendment-006
**Status:** 🔒 LOCKED
**Date:** 2026-09-21
**Decided by:** PO, 2026-09-21 (*"Yes I agree with all of this"* — on the three-plan ladder, the prices,
yearly-first, the annual trial and the capture sequence; lifetime removed on the PO's own suggestion)
**Amends:** `Monetization-Architecture-Amendment-003-Add-On-Tier-And-Launch-Limits.md` §1 (the two-things
table), §2 (MA3-D2 "no tier language", MA3-D3), §9 (MA3-D22 / MA3-D26 Founder AI discount) ·
`P-8-Subscription-Wireframe-Spec.md` §11 (plan picker, P8W-D8) · `M-7-Premium-Upsell-Spec.md` M7-D16
(scope only — see MA6-D9)
**Related:** `[[project-premium-ai-owner-only]]` — the `coach_ai` entitlement this amendment prices ·
the draft pricing page, claude.ai artifact `G95tKHUJJNB1ggMuyzr8Xe`
**Supersedes:** Nothing wholesale. **MA3-D1 (no AI in any lifetime SKU) is honoured and strengthened.**
**MA3-D16 is honoured** — every cap stays server-side config; prices stay in the store, never in `src/`.

> **Why this amendment exists.** Amendment 003 sold two concurrent things — Premium, and Coach AI as an
> add-on — and banned "tier" language between them. The PO has since decided the product is an all-in-one
> (training, nutrition, grocery budget, squads) and wants the ladder a buyer actually reads:
> **Free → Premium → Premium AI**, each plan containing the one below it. The organising principle of
> Amendment 003 survives untouched; only the packaging changes.

---

## Section 1 — The Principle (unchanged, restated)

> **Your legacy is yours forever. The coach is a service.**

The split rule, which decides every feature placement below and every future one:

| If a feature… | It goes in |
|---|---|
| is the daily habit (logging, seeing your own data) | **Free** |
| runs on our own rules and costs ~nothing per use (Holt, meal planner, shopping list) | **Premium** |
| calls a model and costs money every single use | **Premium AI** |

---

## Section 2 — The Ladder (Locked)

**MA6-D1 — Three plans, each containing the one below it: Free, Premium, Premium AI.**
Premium AI **is** Premium plus AI. There is no standalone AI product and no separate "bundle" plan.
This supersedes MA3-D2's *"no tier language anywhere"* — "Premium AI" is now a tier a buyer sees.
It does **not** supersede MA3-D2's behaviour at a ceiling: a Premium athlete who hits a storage or creation
limit still gets a plain explanation, never an AI upsell (AI raises no limit — see MA6-D9).

**MA6-D2 — Prices.**

| Plan | Monthly | Yearly | Yearly works out to |
|---|---|---|---|
| Free | $0 | $0 | — |
| Premium | **$14.99** | **$119.99** | $10.00/mo (33% off monthly) |
| Premium AI | **$19.99** | **$169.99** | $14.17/mo (29% off monthly) |

Premium moves up from $12.99 / $99.99 (MA3). Justification: nutrition, meal planning and grocery budget
join Premium, and no single competitor covers training + nutrition + community at that price.
**Existing subscribers keep the price they signed up at** (store-level grandfathering; nobody is migrated
upward). No one is paying yet as of this date — `default_tier` is still `PREMIUM` — so in practice this
binds only the post-launch cohort.

**MA6-D3 — Entitlements: no schema change.** Premium AI grants **both** existing entitlements
(`premium` + `coach_ai`, migration 0145). In RevenueCat, the Premium AI products attach to both
entitlements. `usePremiumAi()` and `coach_ai_spend_credits` (0203) are unchanged and remain the gate.

**MA6-D4 — Premium AI carries a fair-use monthly AI allowance**, as server-side config (MA3-D16). The number
is not set here; it is set from measured per-call cost before public release. The page says
*"a generous monthly AI allowance"*, never "unlimited".

---

## Section 3 — Lifetime Removed; Founder Kept (Locked)

**MA6-D5 — `premium_lifetime_299` is withdrawn. There is no public lifetime purchase.**
Reasons, in order: (1) $299 is ~2.5 years of yearly Premium, and lifetime buyers are by selection the
longest-staying customers — it sells them their future renewals at a discount; (2) the structural risk
Amendment 003 named — *"lifetime" plus a separate AI subscription* (Launch Checklist 5.2) — disappears with
it; (3) nutrition and grocery data sources may carry per-lookup costs that a one-time price cannot absorb.
**Code impact: none.** `PLAN_ORDER` in `src/domain/billing/plans-core.ts` renders only the packages the
offering actually contains; a lifetime package that is never configured is never drawn.

**MA6-D6 — Founder (`founder_lifetime_149`) stays, launch-only.** Premium forever, first 100, visible
counter, hard stop at 100 — MA3-D22 through MA3-D25 unchanged. This is now the *only* way to own Premium,
which is what makes the scarcity true.

**MA6-D7 — The Founder AI promise (MA3-D26) is re-expressed against the new ladder.** Coach AI had its own
price ($9.99 / $89.99); it no longer does. A Founder already owns Premium, so they buy **only the AI
difference**, at 30% off, for life:

| | Monthly | Yearly |
|---|---|---|
| AI difference (Premium AI − Premium) | $5.00 | $50.00 |
| **Founder price, 30% off** | **$3.49** | **$34.99** |

Sold as a Founder-only AI product (`coach_ai` entitlement only). If the billing platform cannot restrict it
to Founder holders mechanically, MA3-D26 applies: it must not be offered.

---

## Section 4 — Where Every Feature Sits (Locked placement)

Nutrition is **designed, not built**. This section fixes *placement* so the nutrition architecture is
written against it; it does not specify the features.

| Area | Free | Premium | Premium AI |
|---|---|---|---|
| Workout + run logging, full history, chapters, honors, rank | ✓ forever | ✓ | ✓ |
| Programs · Holt programs · Holt days | 3 · 1 · 2/mo (MA3/MA4 caps) | Unlimited | Unlimited |
| Help during a workout | Manual swaps (MA3-D5) | Basic Holt | Basic Holt + Holt AI |
| Program import | 1, from text | From text | + from a photo |
| Photos · squads | 75 · 1 | 1,000 · 5 | 1,000 · 5 |
| Food logging + barcode scan | ✓ | ✓ | ✓ |
| Calorie + macro targets | Fixed | **Follow the training day** | same |
| Meal planner + recipes (rules-based) | — | ✓ | + AI-built plans |
| Shopping list + grocery budget | — | ✓ | + pantry-aware |
| Log a meal from a photo | — | — | ✓ |

**MA6-D7a — Naming (PO, same day): the rules-engine Holt in Free and Premium is "Basic Holt"; the AI coach in Premium AI is "Holt AI"** — so Premium is never read as buying the AI. Applied in P-8 copy and the pricing page (`Onboarding-Amendment-007` ONB-A7-D4).

**MA6-D8 — Barcode scanning is free** *provided* the food database is a free source (USDA FoodData
Central / Open Food Facts). If the nutrition build chooses a per-lookup licensed database, barcode moves
to Premium by amendment, not by default.

> ⚠ **RESOLVED 2026-09-21 — grocery V1 is estimates only** (`Nutrition-Architecture-v1.0.md` NUT-D3, PO: *"just estimates for now"*). No Kroger, no Instacart in V1; the paragraph below is now the *later* path (Nutrition Architecture §9.3), not Phase 1.

**Grocery (open, for the nutrition architecture):** no API gives live prices across every local grocer.
Phase 1 = Kroger's public API (store-level prices, Kroger chains only) + shopping-list → cart handoff via
Instacart's developer platform (which pays an affiliate commission — a revenue line, not a cost);
everything else is estimated from USDA food-price data and labelled as an estimate.

---

## Section 5 — Capture (Locked)

**MA6-D9 — Two paywall moments, and only two.**
1. **Once, at the end of onboarding** — the P-8 plan screen, dismissible, never blocking the app. This is a
   P-8 presentation, **not** an M-7: M-7's rules (no pricing, no trial language, M7-D7) are unchanged.
2. **At a limit** — the existing nine M-7 gates. Unchanged. M7-D16 stands in scope: **AI is never the
   answer to a storage or creation limit**; M-7 offers Premium AI only at an AI-shaped moment.
Never during a workout (M-7 §12, M7-D13).

**MA6-D10 — Yearly leads.** Yearly is pre-selected and shown first on P-8 and the website, with its saving
(computed, P8W-D3) and its monthly equivalent in small type. **The billed amount is always the largest
price on screen** — Apple requires it, and "$10/mo" as the headline over a $119.99 charge is a rejection.

**MA6-D11 — 7-day free trial on yearly plans only** (App Store introductory offer). Trial language is
permitted on P-8 and the website; still banned on M-7. The trial terms sit beside the buy button.

**MA6-D12 — Referral credit (MA3 §8) and the Founder counter (MA3-D23) are launch-day capture tools** and
ship with the paywall, not after it.

---

## Section 6 — Application Checklist

| # | Document / surface | Change | Status |
|---|---|---|---|
| 1 | `Monetization-Architecture-Amendment-003-…md` | Banner at §1, §2, §9 → this amendment. | ✅ applied 2026-09-21 |
| 2 | `P-8-Subscription-Wireframe-Spec.md` | Banner at §11: SKU table → MA6-D2/D5; lifetime row withdrawn; P8W-D8 moot; trial line (MA6-D11). **The §11 diagram and §13 checklist still show four options — rewrite owed with the P-8 re-render.** | ◐ banner applied, rewrite owed |
| 3 | `Launch-Checklist-Free-And-Premium.md` | Banner on the SKU list (§4.3): new product IDs below. | ✅ applied 2026-09-21 |
| 4 | App Store Connect / RevenueCat | Products: `premium_monthly_1499` · `premium_annual_11999` · `premium_ai_monthly_1999` · `premium_ai_annual_16999` · `founder_lifetime_149` · `founder_ai_monthly_349` · `founder_ai_annual_3499`. **Do not create** `premium_lifetime_299`, `coach_ai_*`. 7-day intro offer on both annuals. Map by *package*, never SKU id. | ☐ with Stage 2 |
| 5 | `src/app/subscription.tsx` (P-8) | Render Premium and Premium AI as two plan groups; post-onboarding entry point (MA6-D9 ①). | ☐ with 4.2 / 4.3 |
| 6 | Website pricing page | Draft built (artifact above); goes on forgelegacy.app at Phase E with the landing brief §12. | ◐ draft |
| 7 | Nutrition architecture | Must place every feature per §4 and the split rule in §1. | ✅ `Nutrition-Architecture-v1.0.md` 2026-09-21 (§2 restates this placement) |
| 8 | `Forge-Legacy-Master-Status.md` | Recently Completed + Decision Queue row 22 note. | ✅ applied 2026-09-21 |

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-09-21 | Locked. Three-plan ladder, new prices, lifetime withdrawn, Founder AI re-expressed, nutrition placement, capture rules. |
