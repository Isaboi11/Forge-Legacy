# Monetization Architecture Amendment 011 — The Testers' Holt AI Offer

**Status:** LOCKED · SHIPPED 2026-11-13 (OTA #16 `01a1d6c2` to build 11, PO "I approve the publish")
**Date:** 2026-11-13
**Owner:** Product (PO, in chat)
**Amends:** MA10-D2 (three paywall moments → four; the fourth reaches comped testers only, once)
**Leaves unchanged:** MA7-D6 (comped testers keep Premium free forever) · MA7-D7 (Tester AI add-on, $7.99/month or
$69.99/year, its own subscription group, offered only to comped testers, checked server-side) · MA6-D10 (yearly
pre-selected, billed amount largest) · MA6-D11 (trial wording beside the button) · M-7 §10 (no upsell on an
unknown tier) · Apple 3.1.2 (renewal terms + Terms + Privacy beside the button) · the nudge catalogue (still one
seller, `upgrade`)
**Implemented by:** `src/app/holt-ai-offer.tsx` · `src/hooks/useHoltAiOfferOnce.ts` · `src/lib/holt-ai-offer.ts` ·
`src/domain/billing/holt-ai-offer.ts` · tests `src/domain/billing/__tests__/holt-ai-offer.test.mjs`

---

## 1. The request

> *"We need to notify the people that have the free premium that they have the option to upgrade to the AI for a
> discounted price. So we need to make a notification to either send out or open for the next time they go into
> the app, and then design the page that opens in the app to show what they get and the discounted price."*
> — PO, 2026-11-13.

## 2. Decisions

**MA11-D1 — In the app, on the next open. Never a push.** App Store Review Guideline 4.5.4 forbids push
notifications for promotions unless the person explicitly opted in to marketing pushes, and Forge never asks for
that. So the offer is a page that opens once, the next time Home mounts. Of the PO's two options ("send out" or
"open for the next time they go into the app"), this is the second.

**MA11-D2 — The server decides who sees it.** The page opens only when `my_paywall_offer()` (0214) answers
`tester_ai`, which it does for a comped tester (`athlete_entitlement.comped_tester`) who does not hold AI. A
local pre-filter (`holtAiOfferCandidate`: iOS store present, tier PREMIUM, no AI) only spares everyone else the
server call. Nobody else can reach the purchase: a direct visit without the offer says "This offer isn't on your
account."

**MA11-D3 — Once per account per device.** The page is marked seen immediately before it opens, keyed by user id
(two testers can share a phone). A tester the server doesn't offer it to yet is NOT marked, so they get it once
the server starts offering it (pricing sweep P8: 8 free-Premium testers lack `comped_tester`).

**MA11-D4 — What the page says.** Eyebrow "For our testers"; "Add Holt AI for less."; "You helped build Forge, so
your Premium stays free for life. As a thank-you, you can add Holt AI at a price only testers get." Then the
Yearly (pre-selected) and Monthly cards. Each card shows the store's price, the per-month figure on the yearly,
"N% off", and "Premium AI is $X / year for everyone else." Below them: the button ("Start 7-day free trial" when
the store says this Apple ID is eligible, otherwise "Add Holt AI"), "Your Premium stays free either way.", the
renewal terms, Terms · Privacy, "Not now", and "What Holt AI adds" (the same `AI_BENEFITS` P-8 lists).

**MA11-D5 — Every price and every percentage comes from the store.** The "everyone else" price is the regular
`premium_ai` row of the store's `default` offering, read for display only. The percentage is computed from the
two store amounts, same currency only. If the store doesn't return the regular row, the comparison and the
percentage disappear. Nothing is typed.

**MA11-D6 — An admin preview.** `/holt-ai-offer?preview=1` shows an admin the page with the real tester prices,
button disabled ("Preview. Only comped testers can buy this."). The PO holds AI and isn't a comped tester, so
without this they could never see it.

## 3. Known limits

- **TestFlight testers buy in the sandbox.** 0214 lets sandbox purchases grant access (App Review needs it), so a
  tester still running the TestFlight build would get AI free until the sandbox subscription lapses. Testers
  should be on the App Store build before this ships.
- **Unreadable storage counts as seen.** A missed offer costs nothing; an offer on every launch is a nag.

## 4. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-13 | Shipped in OTA #16 (lane `34ec6754`); G1 migration renumbered 0263 → 0264. Built on `feat/holt-ai-offer` (off `fix/pricing-sweep`, which carries P1 trial eligibility, the C4 benefit list and the P8 SQL this depends on). |
