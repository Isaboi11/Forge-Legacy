# Monetization Architecture — Amendment 007: Early Bird Replaces Founder Lifetime

**Status:** 🔒 LOCKED — PO, 2026-09-23 (in chat, while setting up products in App Store Connect)
**Amends:** `Monetization-Architecture-Amendment-006-Three-Plans-And-Nutrition.md` — **MA6-D6, MA6-D7 and §6 row 4
are superseded.** MA6-D1 (three plans), MA6-D2 (regular prices), MA6-D3 (entitlements), MA6-D10 (yearly leads)
and MA6-D11 (7-day yearly trial) stand unchanged.

---

## Decisions

**MA7-D1 — No lifetime purchase of any kind.** `founder_lifetime_149` is withdrawn, joining
`premium_lifetime_299` (MA6-D5). Nobody owns Premium outright.

**MA7-D2 — The Founder AI add-on is withdrawn.** `founder_ai_monthly_349` / `founder_ai_annual_3499` existed
only because a Founder already owned Premium through the lifetime purchase. With no lifetime there is nothing
to add on to. ⚠ The PO remembered this as "$6.99 — the testers' plan": $6.99 was MA3-D26 (30% off the old
$9.99 Coach AI), superseded by MA6-D7, and it was never a tester price.

**MA7-D3 — Early Bird: the first 100 subscribers get about 15% off, for as long as they stay subscribed.**
Same two plans, discounted — not a different product. The price holds through Apple's own rule that an
existing subscriber keeps their price. Lapsing and returning later means the regular price.

| Plan | Regular (MA6-D2, unchanged) | Early Bird |
|---|---|---|
| Premium monthly | $14.99 | **$12.99** |
| Premium yearly | $119.99 | **$99.99** |
| Premium AI monthly | $19.99 | **$16.99** |
| Premium AI yearly | $169.99 | **$144.99** |

**MA7-D4 — The 7-day free trial applies to Early Bird yearly plans too** (both yearly Early Bird products,
as well as both regular yearly products per MA6-D11).

**MA7-D5 — A trial holds a seat; a trial cancelled before the first payment gives it back.** The 100 counts
people who pay, so trial-and-cancel does not use up the offer. The counter stays honest (MA3-D24): never
sell a 101st seat.

**MA7-D6 — The 14 comped testers (Phase F step 2) keep free Premium FOREVER** (PO, same day — supersedes an
earlier answer in the same chat that they would move to Early Bird "when their free period ends"; it never ends).
They do not take Early Bird seats.

**MA7-D7 — Tester AI add-on: the comped testers can add AI for $7.99/month or $69.99/year.** It grants the
`coach_ai` entitlement ONLY (their Premium is already the comp). Shown ONLY to comped testers — the app must
check this server-side, never offer it to anyone else (the MA3-D26 rule: if it cannot be restricted
mechanically, it must not be offered). 7-day trial on the yearly, like every yearly plan. Its own group
("Tester AI") — see the correction below.

## ⛔ Correction, same day — THREE groups, not one

Apple's **Settings → Subscriptions** page lets any subscriber switch to ANY product in their group, and the
app cannot hide one. With all ten in one group, a $19.99 Premium AI subscriber could switch themselves to the
$7.99 Tester AI or a $16.99 Early Bird plan, forever. So:

- **"Forge Legacy Membership"** — the 4 regular plans only.
- **"Early Bird"** — the 4 Early Bird plans. An Early Bird member can move between Early Bird tiers; nobody else sees them.
- **"Tester AI"** — the 2 tester add-ons. Only the comped testers are ever offered them.

⚠ Across groups Apple does NOT stop someone holding two subscriptions — the app must never offer a second
group to someone who already has one. The 10 products below were first created in ONE group (09-23); the 6
misplaced ones must move or be recreated. A deleted product ID can never be reused.

## App Store Connect products (replaces MA6 §6 row 4)

**Three groups** (see the correction above). Within each group, AI ranks above Premium and yearly above monthly.

| Product ID | Plan | Price | Trial |
|---|---|---|---|
| `premium_monthly_1499` | Premium monthly | $14.99 | — |
| `premium_annual_11999` | Premium yearly | $119.99 | 7 days |
| `premium_ai_monthly_1999` | Premium AI monthly | $19.99 | — |
| `premium_ai_annual_16999` | Premium AI yearly | $169.99 | 7 days |
| `earlybird_premium_monthly_1299` | Early Bird Premium monthly | $12.99 | — |
| `earlybird_premium_annual_9999` | Early Bird Premium yearly | $99.99 | 7 days |
| `earlybird_premium_ai_monthly_1699` | Early Bird Premium AI monthly | $16.99 | — |
| `earlybird_premium_ai_annual_14499` | Early Bird Premium AI yearly | $144.99 | 7 days |
| `testerai_annual_6999` | Tester AI add-on yearly (`coach_ai` only) | $69.99 | 7 days |
| `testerai_monthly_799` | Tester AI add-on monthly (`coach_ai` only) | $7.99 | — |

**Levels, top to bottom, each on its own level** (App Store Connect would not let several share one):
Membership — Premium AI Yearly · Premium AI Monthly · Premium Yearly · Premium Monthly.
Early Bird — same order. Tester AI — Yearly · Monthly. (Higher = a switch takes effect now; lower = at renewal.)

**Never create:** `premium_lifetime_299`, `founder_lifetime_149`, `founder_ai_*`, any `coach_ai_*`.
**Burned, never reuse (created in the wrong group 09-23, then deleted):** `founder_premium_monthly_1299`,
`founder_premium_annual_9999`, `founder_premium_ai_monthly_1699`, `founder_premium_ai_annual_14499`,
`tester_ai_annual_6999`, `tester_ai_monthly_799`. Groups: regular 4 → "Forge Legacy Membership";
`earlybird_*` → "Early Bird"; `testerai_*` → "Tester AI".
The seat machinery keeps its `founder_` names (`claim_founder_seat()`, `founder_seats_remaining()`,
`entitlement_config.founder_seats_total = 100`); only the product IDs say `earlybird_`.
Map plans by RevenueCat **package**, never by product ID (unchanged rule; `plans-core.test.mjs` forbids
product IDs in `src/`).

## RevenueCat layout (set up 2026-09-23)

**Entitlements:** `premium` ← all 8 Premium/Premium AI products (regular + Early Bird) · `coach_ai` ← the 4
Premium AI products (regular + Early Bird) and both Tester AI products. (MA6-D3: Premium AI grants both.)

**Offerings → packages** (the app reads PACKAGE ids, never product IDs):

| Offering | `premium_ai_annual` | `premium_ai_monthly` | `premium_annual` | `premium_monthly` |
|---|---|---|---|---|
| `default` (regular) | premium_ai_annual_16999 | premium_ai_monthly_1999 | premium_annual_11999 | premium_monthly_1499 |
| `early_bird` | earlybird_premium_ai_annual_14499 | earlybird_premium_ai_monthly_1699 | earlybird_premium_annual_9999 | earlybird_premium_monthly_1299 |

`tester_ai` offering: package `ai_addon_annual` → testerai_annual_6999 · `ai_addon_monthly` → testerai_monthly_799.
Which offering a person sees is decided by our server, never by RevenueCat targeting alone.

## Code impact (owed, not done)

- `src/domain/billing/plans-core.ts` — the `'founder'` slot is a one-time lifetime today (`renews` false);
  it becomes a set of renewing Early Bird plans. The `'lifetime'` slot is dead.
- Paywall (`src/app/subscription.tsx`) — shows the $149 Founder offer today; must show Early Bird prices
  while seats remain, and regular prices after.
- Seat claim — today claimed on a lifetime purchase; must claim on Early Bird subscribe/trial start and
  release on a trial cancelled before first payment (MA7-D5). Needs the RevenueCat webhook.
- `plans-core.test.mjs` forbidden-ID patterns — add `earlybird_premium(_ai)?_(monthly|annual)_\d` and `testerai_(monthly|annual)_\d`.
- Update P-8 wireframe, Launch Checklist §4.3, and the landing page's pricing if it names the $149 Founder.

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-09-23 | Locked. Lifetime and Founder AI withdrawn; Early Bird (first 100, ~15% off, trial included, seat released on a cancelled trial). Same day: comped testers keep Premium forever + Tester AI add-on $7.99/$69.99; three groups, not one; 6 IDs burned and replaced. |
