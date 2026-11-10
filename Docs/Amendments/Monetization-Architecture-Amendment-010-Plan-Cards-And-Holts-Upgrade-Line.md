# Monetization Architecture Amendment 010 — Plan Cards, and Holt's One Upgrade Line

**Status:** LOCKED
**Date:** 2026-11-09 (release day)
**Owner:** Product (PO, in chat)
**Amends:** MA6-D9 (two paywall moments → three) · MA9 §5 (answered: yes) · the nudge catalogue's
"never sold anything" rule (one named exception) · P-8's 09-25 layout (plan cards replace the tier switch;
the "no artwork in the hero" delta is reversed)
**Leaves unchanged:** MA6-D10 (yearly leads, billed amount largest) · MA6-D11 (trial wording only on the plan
screen and the website) · M-7 and its nine gates · M7-D13 (nothing mid-workout) · P8W-D4 (what Premium does
not include sits above the buy button) · Apple 3.1.2 (Terms + Privacy beside the renewal terms)
**Implemented by:** `src/app/subscription.tsx`, `src/domain/billing/plans-core.ts` (`tierCardLines`,
`zeroPriceLabel`, `rowForCadence`, `cadencesOn`, `TIER_CARD_COPY`, `RECOMMENDED_BADGE`),
`src/domain/coach/nudges.ts` (`upgrade`, `ONCE_ONLY`), `src/components/forge/CoachBubble.tsx` (`holtUsedUp`)

---

## 1. The request

> *"I think it's not good to only be notified of upgrades when they reach a limit."* — PO, 2026-11-09.
> Picked from the options: Premium tags on locked features, and Holt speaking up once when the free coaching
> runs out. Then: *"This is the screen that I'm wanting us to change to… make sure we have it in both colors."*
> (mockup: Yearly / Monthly, then Free · Premium · Premium AI as cards, mountains behind the hero.)

## 2. Decisions

**MA10-D1 — P-8 reads cadence first, then one card per plan.** Mountains behind the hero (the Legacy plate,
recoloured for Alabaster, so both themes have it) · ruled eyebrow "Forge Premium" · "Everything you build,
kept for life." · Yearly / Monthly switch (yearly pre-selected) · cards for Free, Premium, Premium AI (a
Premium subscriber sees only the AI step) · the button · renewal terms + Terms · Privacy · "Continue with
Free" · a five-icon "What's included" row that scrolls to the details. Free is a card: choosing it makes the
button "Continue with Free" and buys nothing. Every price is the store's string; the Free card's "0" is
formatted in the store's currency, never typed.

Deliberate deltas from the PO's mockup:
- **"Recommended", not "Most popular."** On release day nobody has bought; a popularity claim nobody can back
  is the unverifiable social proof the 09-25 redesign already dropped.
- **The Premium card keeps "Holt AI, the AI coach, is in Premium AI."** in small type — P8W-D4.
- **The button names the trial only when the store says the selected plan has one.** Monthly has none
  (MA6-D11), so there it reads "Subscribe".
- **"Founding price · Keep it for as long as you stay subscribed."** stays, one line, on the Early Bird
  offering only (MA7-D3).

**MA10-D2 — Three paywall moments: onboarding, a limit, and Holt's one upgrade line.** A ninth→tenth nudge,
`upgrade`, fires for a **Free** athlete who has used the free Holt program **or** this month's Holt days.
Holt says it **once, ever** — shown once, it never returns, whatever the answer (`ONCE_ONLY`; not the usual
"ask twice, rest 21 days"). Its button reads **"See plans"** and opens P-8 (`?from=nudge`, closes like a
gate). The line names no price and no trial. The normal cadence still applies: nothing before three
sessions, one nudge a week, only on the five home tabs, never during a workout, a ceremony or the tour.
This answers MA9 §5 *yes*. Every other nudge still never routes to a plan screen — the guard test now
allows exactly one route to `/subscription`, by id.

**MA10-D3 — "Continue with Free" on every Free visit to P-8**, not only the one after onboarding. Leaving
an offer is always a named, full-contrast choice.

**MA10-D4 — Premium tags: already in place for Premium features; Premium AI features stay hidden for now.**
Checked 11-09: Nutrition Home already shows Meal Plan with a PREMIUM tag and the Recipe door says
"Premium" (09-22 amendment of NUT-D8). What is still hidden from athletes without Premium AI: photo food
log, photo program import, typing to Holt, the mic. Whether to show those with a "Premium AI" tag is open
for the PO (§4).

## 3. What did not change

| Rule | Status |
|---|---|
| MA6-D10 yearly leads; billed amount is the largest price | Unchanged — per-month is small type, store-supplied only |
| MA6-D11 trial wording | Unchanged — only on P-8 and the website; the Holt line has none |
| M-7, its nine gates, M7-D16 (AI never answers a storage limit) | Unchanged |
| M7-D13 / M-7 §12 nothing mid-workout | Unchanged — the coin never shows in a workout |
| P8W-D4 | Unchanged — on the Premium card and in the sticky bar |
| ONB-A7-D2 plans once after onboarding | Unchanged |

## 4. Open for the PO

- Show the hidden Premium AI features (photo food log, photo import, typing to Holt) to everyone, with a
  "Premium AI" tag that opens the plan screen?
- Read the nudge counts (`nudge_shown/accepted/dismissed` with id `upgrade`) after two weeks.

## 5. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-09 | Locked and implemented on `feat/paywall-v2` (from build 11's lane). |
