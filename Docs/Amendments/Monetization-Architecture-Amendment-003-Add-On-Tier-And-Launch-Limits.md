# Forge Legacy — Monetization Architecture Amendment 003
## The Add-On Tier, the Launch Limits, and the Coach as a Service
### Status: LOCKED | 2026-08-12

**Authority:** Pricing Structure & Monetization Build Plan (locked 2026-08-12) — the governing source for every
number in this amendment
**Amends:** `Monetization-Architecture-Amendment-001.md` (LOCKED) §3, §4, §5, §7, §9, §11, §13
**Supersedes:** `Critical-Decisions-Amendment-001.md` Decision 4 (squad limit) — see Section 4
**Downstream:** `M-7-Premium-Upsell-Spec.md`, `P-8-Subscription-Wireframe-Spec.md`,
`P-8-Subscription-Architecture.md`, `Docs/Marketing/Landing-Page-Design-Brief.md`,
`Forge-Legacy-Master-Status.md`

> **Why this amendment exists.** Amendment 001 §4 states that a premium athlete who reaches a ceiling is
> *"blocked with a plain explanation, **not** an upsell — there is no higher tier to sell."* That sentence
> is load-bearing and it forbids the Coach AI add-on outright. Amendment 001 was written before Coach Holt,
> Challenges, Squads, the Transformation Gallery, the 81-template library and the 179-honor catalogue
> existed; its tier assumptions no longer describe the product. This amendment authorizes a second thing to
> buy, and sets the launch numbers for the first one.
>
> ⚠ **This project's recurring failure is an amendment that is locked and never applied.** Section 10 is the
> application checklist. It is not decoration.

---

## Section 1 — The Organising Principle (Locked)

> **Your legacy is yours forever. The coach is a service.**

This is the same principle as **Never Charge For History** (Amendment 001 §2) pointed the other way, and it
is what makes a lifetime purchase safe to sell.

Everything the athlete *builds* — workouts, chapters, photos, programs, honors, rank, the timeline — costs
roughly **$0.35 per athlete per year** to keep. A fixed cost can honestly be sold once and kept forever.

Conversational AI costs real money on **every single use**, without bound, forever. A variable cost cannot
be sold once. Selling it once anyway is how a lifetime tier becomes a liability that grows fastest against
the most committed customers you have.

**Therefore the product has exactly two things to buy, and they are separated on that line and no other.**

| | What it is | How it is sold | Why |
|---|---|---|---|
| **Premium** | Everything you build, with no limits | Monthly, annual, **or once** | Fixed cost. Safe to own forever. |
| **Coach AI** | A conversation that costs money every time it happens | **Monthly or annual only** | Variable cost. Never sold as a lifetime. |

**Locked corollary — MA3-D1:** **No AI-inclusive lifetime SKU may be created at any price.** Not as a
promotion, not as a founder perk, not as a bundle. A $299 lifetime with unlimited AI breaks even in roughly
five years against a heavy user and loses money indefinitely after — and lifetime buyers are, by selection,
the heaviest users. This is the single rule that keeps the lifetime option honest.

---

## Section 2 — The Add-On Model (Authorized)

### 2.1 Amendment 001 §4 and §5, superseded in one respect only

Amendment 001 §5 states, of a premium athlete at a ceiling:

> *"Blocked with a plain explanation, **not** an upsell — there is no higher tier to sell."*

**MA3-D2 — This is superseded in scope, not in behaviour.** There *is* now a second thing to sell, but it
is **not a higher tier**, and the §5 behaviour is therefore unchanged wherever it applies:

- **A premium athlete who reaches a storage or creation ceiling still sees a plain explanation, never an
  upsell.** Coach AI does not raise a single one of those ceilings, so there is nothing to offer them. The
  §5 rule stands verbatim.
- **Coach AI is a concurrent entitlement, not a rank above Premium.** An athlete holds Premium, or Coach AI,
  or both. There is no ordering between them and no "tier" language anywhere in the product.
- M-7 may offer Coach AI **only** at a Coach-AI-shaped moment (an AI capability the athlete asked for and
  does not hold). It may never appear as the answer to a photo, squad, program, template, video or import
  limit.

### 2.2 Requires Premium

**MA3-D3 — Coach AI requires an active Premium entitlement.** It is an add-on, not a standalone product.
An athlete cannot hold Coach AI without Premium. This is a commercial rule, not a technical one: the AI
parses intent and hands off to the rules engine that ships inside Premium, so Coach AI without Premium
would be a conversation with nothing behind it.

### 2.3 Not in the launch

**Coach AI is deliberately excluded from the Free-and-Premium launch** (PO decision 2026-08-12: no AI spend
before full release, and no AI for testers). This amendment authorizes the **model** so that the add-on is
legitimate when it ships, and so the entitlement schema, P-8 and M-7 are built once rather than retro-fitted.
The Coach AI SKUs may be configured in App Store Connect and left unreleased.

---

## Section 3 — Coach Holt: the Free / Paid split (Locked)

Holt is the rules engine in `src/domain/coach/`. **He is not AI and costs nothing to run** — which is
exactly why he can be given away in a bounded quantity rather than withheld entirely.

| Capability | Free | Premium |
|---|---|---|
| **Four-week program generation** | **1, lifetime** | Unlimited |
| **Single-day workout generation** | **2 per month, refilling forever** | Unlimited |
| **Help during an active workout** | **None** | Unlimited |
| **Adapting a program already running** (safe-edit layer, migration 0123) | None | Unlimited |
| Manual exercise substitution during a workout | ✓ Free | ✓ Free |

**MA3-D4 — The wall goes on the program, not on the day.**

> A program is a commitment; a day is a whim.

Paywalling the program puts the wall on the thing actually worth paying for. The monthly single-day refill
keeps the free tier *alive* rather than dead-ended, because engaged free athletes are who convert and who
bring other people in. **Mid-workout Holt is the moment of highest value and it recurs every session** —
that is the felt, weekly benefit of paying, and it is why $99.99/yr holds against competitors who sell
algorithmic program generation alone.

**MA3-D5 — Manual substitution stays free during a workout.** The Free athlete is never stranded mid-session.
What Premium buys is the coach answering; it is not the ability to change an exercise.

**MA3-D6 — The lifetime program allowance does not reopen.** A generated program that is deleted does not
return the allowance, for the same reason the program slot does not (Section 5). **Workouts logged against
a deleted Holt program are kept forever** — Never Charge For History is absolute here.

**Accepted risk, recorded rather than glossed:** one program lifetime means the free Holt wall lands around
**week five**. The monthly day-refill is what keeps the tier alive past that point. This is the number
most likely to be wrong; it is server-side config precisely so that being wrong costs a SQL update
(Section 7).

---

## Section 4 — Squads: 1 Free / 5 Paid

**MA3-D7 — The Free squad limit is 1. The paid ceiling is 5, on every paid tier.**

### 4.1 Explicit supersession of Critical Decisions Amendment 001, Decision 4

`Critical-Decisions-Amendment-001.md` **Decision 4** locked *"Free-tier athletes may belong to or create a
maximum of **2** squads. Premium tier is unlimited"*, and it explicitly superseded Amendment 001's original
1-squad limit to get there.

**That decision is now superseded in turn, and reverted to 1.** This is stated here rather than quietly
contradicted, because a locked document is only worth anything if the record of what overrode it is
findable. Critical Decisions Amendment 001 Decision 4 carries a superseded banner pointing here
(Section 10, item 2).

| Limit | Amdt 001 (June) | Critical Decisions Amdt 001 (June) | **Amendment 003 (2026-08-12)** |
|---|---|---|---|
| Free squads | 1 | 2 | **1** |
| Paid squads | Unlimited → 10 (2026-08-05) | Unlimited | **5** |

**Why back to 1.** One squad is enough to be recruited into by a friend, which is the acquisition path that
matters — half the product only functions with other people in it. A *second* squad is a real, felt reason
to upgrade, and it arrives at exactly the moment the athlete has proven the social half of the product works
for them. Two free squads gives away that moment for nothing.

**Why 5 and not 10 or unlimited.** Nobody needs more than five. A squad is a row and costs nothing to store;
the ceiling exists because an account in fifty squads is an automation, not an athlete. This narrows
Amendment 001's 2026-08-05 figure of 10 for the same stated reason it was introduced.

### 4.2 Behaviour (unchanged from Amendment 001 §7, renumbered)

| Scenario | Behaviour |
|---|---|
| Free athlete in 1 squad attempts to create or join a 2nd | M-7 fires. Action blocked **before** the flow opens. |
| Free athlete receives a squad invitation while at the limit | Invitation visible; cannot be accepted until they upgrade or leave a squad |
| Free athlete leaves a squad | **Slot restored.** May create or join again. |
| Paid athlete attempts a 6th squad | Blocked with a plain explanation, **not** an upsell (Amdt 001 §5 rule, unchanged) |
| Downgrade | Remains in every squad. No removals, ever. Cannot create or join while at or above 1. |

**A free athlete must be able to CREATE a squad, not only join one** — otherwise the acquisition engine only
ever runs downhill from paying users. This is a distribution requirement, not a courtesy.

---

## Section 5 — The Launch Limits (Free Tier)

Amendment 001 §3's table is replaced by this one. **Every number here is server-side configuration
(Section 7), not a constant in `src/`.**

| Cap | Free | Changed from | Why this number |
|---|---|---|---|
| **Holt four-week programs** | **1 lifetime** | *(new)* | Section 3 |
| **Holt single days** | **2 / month, refilling** | *(new)* | Section 3 |
| **Holt in-workout help** | **None** | *(new)* | Section 3 |
| **Programs** | **3 lifetime — built, generated, *or received*** | 3 (scope widened) | One sentence: *three programs, free.* |
| **Photos** | **75**, one account-wide counter | **100** *(2026-08-05)* | 12 monthly transformation entries × 6 poses = 72, plus 3 spare. *"A full year of progress photos, free."* Fires around month 12. |
| **Videos** | **5 persistent** | 5 | Gallery, pinned and feed video only. **Squad check-ins never count** and are uncapped on every tier. |
| **Custom day templates** | **5** | 5 | The **81 Forge templates never count** — they are catalogue content. |
| **Squads** | **1** | 2 | Section 4 |
| **Spreadsheet imports** | **1 lifetime** | 1 | Amendment 001 §8 unchanged. Failed or abandoned attempts never consume it. |
| **Community memberships** | 1 *(dormant)* | 1 | Amendment 002 stands, but **Communities are deferred and unbuilt**; this cap enforces nothing today. |

### 5.1 Photos: 100 → 75, and why a locked number went *down*

Amendment 001's 2026-08-05 revision raised free photos 50 → 100 on the strength of the downscaling fix
(~3 MB → ~350 KB per photo). That reasoning was sound and is not disturbed — **storage is not why this
number moved.**

75 is the number the Transformation Gallery actually produces: **six poses per entry, one entry a month,
twelve months = 72.** The cap now lands on a meaningful boundary — a full year of documented progress —
instead of an arbitrary round number 28 photos past it. The paid moment it creates is **Transformation
Compare**, which is at its most valuable precisely when a year of entries exists.

**MA3-D8 — Free photos are 75.** This closes **Master Status Decision Queue row 14, item (1)** — the
Transformation Gallery's open question of whether gallery entries share the photo cap, get their own, or
are uncapped. **They share the one account-wide counter.** Rows 14(2) and 14(3) remain open.

### 5.2 Programs: the slot rules that make the cap real

**MA3-D9 — Program slots do not reopen on delete.** Without this, the cap never fires for the most common
real behaviour in the product: running one four-week block at a time and deleting the last one. A cap that
never fires is not a cap.

**MA3-D10 — A program someone sends you consumes a slot.** Built, generated by Holt, or received from a
friend or squad-mate — all three are programs, and all three count. **Sending** a program remains free
(it is distribution, Section 6).

**MA3-D11 — Workouts logged against a deleted program are kept forever.** Deleting a program deletes the
plan, never the history. Amendment 001 §2 governs and is absolute. This is the seam where the two rules
above could have quietly broken Never Charge For History, and it is closed explicitly.

> This is the only line in the free tier that ever bills the athlete who builds their own programs and never
> touches Holt. It is deliberate: creation beyond the free tier is what Forge monetizes (Amdt 001 §9).

---

## Section 6 — Moved to Free: distribution is not a feature to sell

**MA3-D12 — Share-card export is free, at full 3.6× resolution, on every tier.**

Every card that reaches Instagram carries the brand to somebody who has never heard of Forge Legacy. Charging
for it taxes the only acquisition surface that costs nothing to run. This reverses its earlier classification
as a Premium benefit.

> ⚠ **It is currently broken on device** — Save, Instagram and Facebook all tell the athlete to use a
> browser (`src/lib/share-image.ts` is a native stub). It is now load-bearing for acquisition, so this is a
> launch blocker rather than a polish item.

**MA3-D13 — Sending a program to a friend or squad-mate is free.** An invitation with real value attached is
worth more than the slot it costs. (The **recipient's** slot is consumed per MA3-D10; the sender's is not.)

**MA3-D14 — Squad video check-ins are uncapped on every tier**, and never count against the 5-video
persistent limit. They are pruned at 24 hours by migration `0141`, so they are not persistent storage.

**MA3-D15 — No ads. Ever. On any tier.** Stated here as a permanent commitment so that it is a locked
product rule and not merely a current absence.

---

## Section 7 — Every Cap Is Server-Side Configuration (Locked)

**MA3-D16 — No cap, allowance, or limit value may exist as a hardcoded constant in `src/`.** Every number in
this amendment is read from a server-side configuration table.

**Why this is a locked rule and not an implementation preference.** Every number here is a guess. They were
set from product reasoning and competitor comparison, not from usage data, because no usage data exists yet.
Being wrong is not the risk — being wrong *expensively* is. With server-side config, a wrong number costs a
`UPDATE` statement. With a constant in `src/`, it costs a release, an App Store review, and a week.

**The measurement plan:** apply the analytics migrations, run the 20 testers **uncapped** for 60–90 days,
then set each free cap at roughly the **p50–p60** of engaged behaviour. Until that data exists, the numbers
in Section 5 are the defaults.

**This does not make the client a security boundary.** The configuration table tells the client what to
draw; **the enforcing gate belongs in Postgres RLS** — the same rule `admin-live.ts` states about
`isAppAdmin()`. A client that reads a cap of 75 and a server that permits 75 are two different mechanisms,
and only the second one is enforcement.

---

## Section 8 — Referrals (Authorized)

**MA3-D17 — Two-sided, credit-based, and capped.**

| Party | Reward | Granted when |
|---|---|---|
| **Referee** (the new athlete) | 1 month free | On their **first successful payment** |
| **Referrer** | 1 month of account credit | On the referee's **first successful payment** |

**MA3-D18 — Held as account credit, never as a free month.** Credit behaves identically on monthly, annual
and lifetime plans; a "free month" is meaningless to a lifetime holder and awkward on an annual one.

**MA3-D19 — The referrer is capped at 12 months of credit per rolling year.** The cap is financial *and*
legal: an uncapped recruitment reward starts to resemble a chain-referral scheme. It is not negotiable
upward without counsel.

**MA3-D20 — Credit is granted on first payment, never on install or signup.** Nothing accrues from an
account that never converts.

**MA3-D21 — Attach referral credit to squad and challenge invites, not only to a generic code.** The invite
is the moment an athlete is already reaching out, and it is the only acquisition surface in the product that
costs nothing to run. A generic code that lives in Settings is one nobody opens.

**Invites stay in-app and via push.** No email or SMS blasting — that keeps CAN-SPAM and TCPA out of scope
entirely.

---

## Section 9 — Founder (Authorized)

**MA3-D22 — `founder_lifetime_149`: Premium forever, plus Coach AI at 30% off for life. First 100 new
signups, then the SKU is delisted.** Holders keep it forever.

**MA3-D23 — The counter must be visible** ("68 of 100 left") or the scarcity does no work.

**MA3-D24 — The counter must actually stop at 100.** Selling the 101st seat is a deceptive practice, not a
rounding error. *"First 100"* is a factual claim about a transaction.

**MA3-D25 — The 20 OG testers do not occupy Founder seats.** They receive the same entitlement, free and
forever, on a **separate grant**. All 100 paid seats remain available. Stated once and not walked back.

**MA3-D26 — 30% off for life is a durable promise.** It survives price changes, SKU retirement, and the
discontinuation of any promotion. If it cannot be honored mechanically by the billing platform, it must not
be offered.

---

## Section 10 — Application Checklist (the part that gets skipped)

> ⚠ Amendment 001 §11 and §13 have been stale since the 2026-08-05 revision — §11 still says "Photo limit
> (50) already correct" and §13 still checks for "Unlimited custom programs / photos / squads" that §4
> replaced with finite numbers on the same day. **That is this project's failure mode, in the very document
> this amendment amends.** Every row below is a file edit, not an intention.

| # | Document | Change | Status |
|---|---|---|---|
| 1 | `Monetization-Architecture-Amendment-001.md` | Superseded banner → this amendment. §3 table: photos 100 → **75**, squads 2 → **1**. §4 table: squads 10 → **5**, programs 50 → **500** (abuse guard). §5/§6/§7 behaviour tables: renumber to 75 / 1, add the delete-does-not-reopen and received-program rows. **§11 and §13: rewrite the stale rows** — §13's "Unlimited" premium checkboxes and the "Photos: capped at 50" free row were both wrong. | ✅ **applied 2026-08-12** |
| 2 | `Critical-Decisions-Amendment-001.md` | Decision 4: superseded banner citing MA3-D7. Free squads 2 → 1, paid unlimited → 5. Decision 3 photo figure 50 → 75. Summary table, validation checklist, change log → v1.1. | ✅ **applied 2026-08-12** |
| 3 | `M-7-Premium-Upsell-Spec.md` → **v1.1** | Photo cap 50 → **75**; squad cap 2 → **1**; 4 triggers → **9**; **M7-D13: in-workout Holt is suppressed, not gated**; **§6.4: Coach AI never appears on M-7**; cap numbers injected from config; counting-exclusion table; W-1 removed. | ✅ **applied 2026-08-12** |
| 4 | `P-8-Subscription-Wireframe-Spec.md` → **v1.1** | Open Issue #2 resolved — **§11 plan picker** (annual pre-selected / monthly / Founder while seats remain / lifetime), the disclosure line above the buy button, **RevenueCat**. §8's single-SKU non-behaviour superseded. Free-column numbers. | ✅ **applied 2026-08-12** |
| 5 | `Forge-Legacy-Master-Status.md` | Decision Queue **row 22** added (pricing / SKU / billing SDK / entitlement schema). **Row 14 item (1) closed** by MA3-D8; items (2) and (3) remain, so the row stands. Recently Completed entry added. | ✅ **applied 2026-08-12** |
| 6 | `Docs/Marketing/Landing-Page-Design-Brief.md` | §12 and the JSON-LD `offers: { price: "0" }` stay correct **until Phase E**, then need the real ladder with **Never Charge For History as the headline**. | ☐ deferred to Phase E |
| 7 | `Monetization-Architecture-Amendment-002-Communities.md` | No change. The 1-community cap stands and is dormant — Communities are deferred and unbuilt. | ✓ n/a |
| 8 | `FORGE_LEGACY_PRODUCT_DNA.md` | **Only** if photo coaching ships: a formal §10/§2 amendment, per the CC-D1 / SOC-D4 / CAL-D19 precedent. Not required for this launch. | ☐ deferred with Coach AI |

---

## Section 11 — Decision Framework Check (Amendment 001 §10)

Every monetization change must pass Amendment 001 §10. This amendment, evaluated against it:

| # | Question | Answer |
|---|---|---|
| 1 | Does this limit access to history? | **No.** Nothing here touches a workout, chapter, goal, honor, rank, timeline entry or logged set. Deleting a program keeps its workouts (MA3-D11). |
| 2 | Does it preserve Never Charge For History, including migrating history in? | **Yes.** The one free lifetime import is untouched (Amdt 001 §8). Imported content remains permanently accessible at every tier. |
| 3 | Does it align with Legacy First? | **Yes** — Section 1 is Legacy First stated as a pricing structure. The legacy is sold once; only the service recurs. |
| 4 | Does it avoid holding the athlete's story hostage? | **Yes.** Downgrade deletes nothing, hides nothing, and restricts only *new* creation. |
| 5 | Does it feel premium (adding capability) rather than restrictive? | **Yes for Holt, and this is the honest answer for the caps: partly.** Lowering free squads 2 → 1 and photos 100 → 75 removes headroom that a locked document had granted. It is defensible — no athlete has yet reached either number, and nothing already created is affected — but it is a reduction, and calling it anything else would be dishonest. |
| 6 | Timeless, premium, intentional? | **Yes.** Two things to buy, split on one comprehensible line, with the reason stated to the athlete before they pay. |

**Question 5 is the one that required a judgment call, so it is recorded rather than buried.** Both
reductions land on numbers no current athlete has reached, both are server-side config and reversible by
SQL, and both are stated in a locked document rather than shipped quietly. Amendment 001 §3 flags every
numerical limit as *"an Initial MVP Assumption — Subject to Future Revision"*, which is the clause this
amendment exercises.

---

## Section 12 — Validation Checklist

**The principle**
- [ ] No AI-inclusive lifetime SKU exists at any price (MA3-D1)
- [ ] Coach AI requires an active Premium entitlement (MA3-D3)
- [ ] Coach AI is never offered as the answer to a storage or creation limit (MA3-D2)
- [ ] A paid athlete at a ceiling sees a plain explanation, never an upsell (Amdt 001 §5, unchanged)

**Holt**
- [ ] Free: 1 four-week program, lifetime; allowance does not reopen on delete (MA3-D6)
- [ ] Free: 2 single days per month, refilling
- [ ] Free: no Holt during an active workout; manual substitution still works (MA3-D5)
- [ ] Workouts logged against a deleted Holt program are kept forever

**Caps**
- [ ] Photos 75, one account-wide counter, gallery entries included (MA3-D8)
- [ ] Programs 3 lifetime, including received; slots do not reopen on delete (MA3-D9, MA3-D10)
- [ ] Squads 1 free / 5 paid; leaving restores a slot (MA3-D7)
- [ ] Videos 5 persistent; squad check-ins never count (MA3-D14)
- [ ] Day templates 5; the 81 Forge templates never count
- [ ] Imports 1 lifetime; abandoned imports do not consume it
- [ ] **No cap value appears as a constant in `src/`** (MA3-D16)
- [ ] Enforcement exists in Postgres, not only in the client

**Distribution**
- [ ] Share-card export works on device, free, at full 3.6× (MA3-D12)
- [ ] Sending a program is free; receiving one consumes a slot (MA3-D13, MA3-D10)
- [ ] No ads on any tier (MA3-D15)

**Referral and Founder**
- [ ] Credit granted only on the referee's first successful payment (MA3-D20)
- [ ] Referrer capped at 12 months per rolling year (MA3-D19)
- [ ] Referral attached to squad and challenge invites (MA3-D21)
- [ ] Founder counter visible and stops at 100 (MA3-D23, MA3-D24)
- [ ] The 20 OG testers hold a separate grant and occupy no seat (MA3-D25)

---

## Section 13 — Decision Record

| ID | Decision | Rationale |
|---|---|---|
| MA3-D1 | No AI-inclusive lifetime SKU, at any price | Lifetime buyers are by selection the heaviest users; unlimited variable cost against a one-time payment loses money indefinitely |
| MA3-D2 | Add-on authorized; Amdt 001 §5 "no upsell at a ceiling" behaviour unchanged | Coach AI raises no ceiling, so there is still nothing to sell an athlete who reaches one |
| MA3-D3 | Coach AI requires Premium | The AI parses intent and hands off to the rules engine that ships in Premium |
| MA3-D4 | Free Holt: 1 program lifetime, 2 days/month | A program is a commitment; a day is a whim. The wall belongs on the commitment |
| MA3-D5 | Manual substitution stays free mid-workout | Premium buys the coach answering, not the ability to change an exercise |
| MA3-D6 | Holt program allowance does not reopen on delete | Same reason as the program slot: an allowance that resets is not an allowance |
| MA3-D7 | Squads 1 free / 5 paid | A second squad is a real upgrade reason; five is past what any athlete needs |
| MA3-D8 | Photos 75, account-wide, gallery included | 6 poses × 12 months = 72. A full year of progress photos, free |
| MA3-D9 | Program slots do not reopen on delete | Otherwise the cap never fires for one-block-at-a-time athletes |
| MA3-D10 | A received program consumes a slot | It is a program; the sender's generosity is not the recipient's exemption |
| MA3-D11 | Workouts against a deleted program are kept forever | Never Charge For History is absolute |
| MA3-D12 | Share-card export is free at full resolution | Distribution, not a feature. Taxing it taxes acquisition |
| MA3-D13 | Sending a program is free | An invitation with value attached is worth more than the slot |
| MA3-D14 | Squad check-ins uncapped on every tier | 24-hour media prune (0141) means they are not persistent storage |
| MA3-D15 | No ads, ever, on any tier | Permanent commitment, stated so it is a rule and not an absence |
| MA3-D16 | Every cap is server-side config | Being wrong should cost a SQL update, not a release |
| MA3-D17 | Referral is two-sided | Both sides credited; the referee's reward is what makes the ask askable |
| MA3-D18 | Held as account credit | Behaves identically on monthly, annual and lifetime |
| MA3-D19 | Referrer capped at 12 months / rolling year | Financial and legal — uncapped recruitment rewards resemble a chain-referral scheme |
| MA3-D20 | Credit on first payment only | Nothing accrues from an account that never converts |
| MA3-D21 | Attached to squad and challenge invites | The invite is the moment the athlete is already reaching out |
| MA3-D22 | Founder $149, first 100, then delisted | Treated as a raise: named, dated, capped publicly |
| MA3-D23 | Counter visible | Invisible scarcity does no work |
| MA3-D24 | Counter stops at 100 | *"First 100"* is a factual claim about a transaction |
| MA3-D25 | OG testers occupy no seats | Separate grant; all 100 paid seats remain available |
| MA3-D26 | 30% off for life is durable | If the platform cannot honor it mechanically, do not offer it |

---

## Section 14 — Lock Recommendation

**Monetization Architecture Amendment 003 is locked.**

It authorizes the add-on model that Amendment 001 §4 forbade, sets the launch limits for Free and Premium,
reverses the free squad cap to 1 with an explicit supersession of Critical Decisions Amendment 001, records
the Coach Holt free/paid split, the referral program and the Founder seat rules, and makes every numerical
limit server-side configuration rather than a constant.

**All numerical limits remain Initial Assumptions — Subject to Future Revision**, per Amendment 001 §3.
**All principles in Section 1, Amendment 001 §2 and Amendment 001 §9 are permanent and are not touched by
this amendment.**

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-12 | Initial. Authorizes the Coach AI add-on (closes board finding 09). Sets launch limits: photos 100 → 75, squads 2 → 1 free / 10 → 5 paid, programs 3 lifetime including received. Records the Holt free/paid split, the referral program, and the Founder seat rules. Locks the legacy-is-owned / coach-is-a-service principle and the no-AI-lifetime rule. Explicitly supersedes Critical Decisions Amendment 001 Decision 4. Closes Master Status Decision Queue row 14 item (1). |

---

*Forge Legacy — Monetization Architecture Amendment 003*
*v1.0 — 2026-08-12 — LOCKED*
*Authority: Pricing Structure & Monetization Build Plan (locked 2026-08-12)*
