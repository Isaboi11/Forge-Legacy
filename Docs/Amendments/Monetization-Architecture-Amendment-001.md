# Forge Legacy — Monetization Architecture Amendment 001
## MVP Monetization Framework
### Status: Locked — MVP Approved Assumption | June 2026 (Amendment 002 merged) | **Storage-economics revision 2026-08-05** | **Amendment 003 applied 2026-08-12**

> ## ⚠ PARTIALLY SUPERSEDED BY AMENDMENT 003 (2026-08-12)
>
> `Monetization-Architecture-Amendment-003-Add-On-Tier-And-Launch-Limits.md` (LOCKED) changes the following
> and has been **applied into the tables below** rather than left as a pointer:
>
> | | Was | Now | Authority |
> |---|---|---|---|
> | Free photos | 100 | **75** | MA3-D8 |
> | Free squads | 2 | **1** | MA3-D7 |
> | Paid squads | 10 | **5** | MA3-D7 |
> | Premium programs | 50 | **500** (abuse guard) | Amdt 003 §5 |
> | Programs count *received* programs | not addressed | **yes** | MA3-D10 |
> | §4/§5 "there is no higher tier to sell" | absolute | **scope-narrowed** — a second concurrent entitlement (Coach AI) exists, but it raises no ceiling, so the no-upsell-at-a-ceiling behaviour is unchanged | MA3-D2 |
>
> Amendment 003 also adds the Coach Holt free/paid split, the referral program, the Founder seat rules, and
> the rule that **no cap value may exist as a constant in `src/`** (MA3-D16). Section 2 (Never Charge For
> History) and Section 9 (Monetization Philosophy) are **untouched and permanent**.

**Authority:** Forge Legacy Master PRD Section 18 | Forge Legacy Product DNA | **Amendment 002 (June 2026):** `Community-System-Architecture-v1.0.md` COM-D4

> **Revision 2026-08-05 — the word "unlimited" is gone from every storage-bearing row, and the numbers moved.** Section 3's limits were always flagged provisional; this is the first revision to exercise that. Two things forced it. (1) **Photos were uploading at full camera resolution** — the picker's `quality` re-encodes the JPEG and never touches the pixel count, so a 4032 × 3024 iPhone photo was being stored forever to render something no surface displays above ~1200 px. Capping the long edge at 1600 px cut a stored photo from roughly 3 MB to roughly 350 KB, which is what made a generous free tier affordable: 100 photos an athlete is now ~35 MB, and a thousand free athletes is a rounding error rather than the bill. (2) **"Unlimited photos" and "unlimited squads" were an uncapped liability against a fixed subscription price.** One athlete uploading 4K video can cost more per month than they pay, every month, and there is no lever to stop them — an unfunded promise is worse than a generous number. Every limit below is now finite. See Section 4A.
**Supersedes:** PRD Section 18 monetization prose where they conflict
**Scope:** All screens where premium limits apply — W-4 (program creation), S-1/S-3 (squad creation/join), W-1/W-2/L-5 (import entry points), L-15 (photo counter), M-7 (upsell sheet), **Community Hub / Community Page join CTA (Amendment 002)**

This amendment is the authoritative monetization reference for Forge Legacy MVP. All numerical limits are initial assumptions — subject to future revision. All principles are locked.

---

## Section 1 — Purpose

This amendment establishes the MVP monetization framework. It defines:
- What is permanently free (Never Charge For History principle)
- What is included in the free tier
- What requires premium
- How future monetization decisions should be evaluated
- Which limits are provisional vs which principles are permanent

---

## Section 2 — Never Charge For History (Locked Principle)

**History belongs to the athlete. Forever. Unconditionally.**

The following are permanently free, regardless of subscription tier, account age, or business condition:

- Historical workout records
- Historical chapters (active and archived)
- Historical goals
- Historical accomplishments
- Historical honors
- Historical ranks and rank progression
- Historical legacy timeline entries
- Historical program records (all states: Active, Graduated, Ended Early, Future)
- Historical squad history and participation records
- **Content created by completed imports** — imported programs and chapters are historical records once created; they follow the same rules as manually created records

This principle is locked. It cannot be overridden by numerical limit changes, downgrade behavior, or future monetization amendments. It is the foundational contract between Forge Legacy and the athlete.

**Corollary:** Downgrade from premium to free never deletes history. It restricts creation of new items beyond the free tier limit. It never removes what has already been built.

---

## Section 3 — Free Tier Definition (MVP)

All core Forge Legacy features are available on the free tier.

Free tier includes:
- Unlimited workout logging
- Unlimited workout history
- Unlimited chapters
- Unlimited goals
- Unlimited accomplishments
- Unlimited honors
- Unlimited rank progression
- Unlimited legacy timeline entries

**MVP Free Tier Limits:**

| Feature | Free Tier Limit | Notes |
|---------|----------------|-------|
| Custom programs | 3 | **Lifetime, and counts programs built, generated by Holt, *or received* from another athlete** *(scope widened by MA3-D10, 2026-08-12)*. **Slots do not reopen on delete** (MA3-D9) — otherwise the cap never fires for an athlete running one block at a time. **Workouts logged against a deleted program are kept forever** (MA3-D11). One Active program maximum applies to all tiers per Program Amendment 001 |
| Photos | **75** *(revised 2026-08-12 by MA3-D8, was 100)* | Account-wide (not per-chapter), and **Transformation Gallery entries share this one counter**. Counter shown on L-15: "X of 75 photos". 6 poses × 12 monthly entries = 72, plus 3 spare — *"a full year of progress photos, free."* Storage is not why this moved; 75 lands on a meaningful boundary where 100 did not |
| Videos | **5** *(new 2026-08-05)* | Account-wide, **persistent video only**. **Squad check-ins never count and are uncapped on every tier** (MA3-D14) — migration `0141` prunes their media at 24 hours, so they are not persistent storage. Video is the one medium that can cost more than a subscription, so it is the one counted separately from photos rather than folded in |
| Video length | **30 seconds** *(new 2026-08-05)* | All tiers — a product rule, not a paywall. A form check is fifteen seconds and a working set is twenty; 30 is sufficiency, not restriction. Enforced centrally in `useMediaPicker` |
| Day templates | **5** *(new 2026-08-05)* | Athlete-authored templates (W-26/W-27). Forge's own **81 shipped templates are catalogue content and never count** |
| Squads | **1** *(revised 2026-08-12 by MA3-D7, was 2)* | Athlete may belong to or create up to 1 squad. Account-wide. **A free athlete must still be able to CREATE one, not only join** — otherwise the acquisition engine only runs downhill from paying users. Leaving restores the slot |
| Imports | 1 lifetime import | One completed import flow (one W-IM-4 confirmation). See Section 8. |
| **Coach Holt — four-week programs** *(new, MA3-D4)* | **1 lifetime** | The allowance does not reopen on delete (MA3-D6). Holt is a rules engine, not AI, and costs nothing to run — which is why a bounded quantity is given away rather than withheld |
| **Coach Holt — single days** *(new, MA3-D4)* | **2 per month, refilling** | A program is a commitment; a day is a whim. The refill is what keeps the free tier alive rather than dead-ended |
| **Coach Holt — in-workout help** *(new, MA3-D4)* | **None** | The moment of highest value, recurring every session — the felt weekly benefit of paying. **Manual exercise substitution stays free** (MA3-D5); no athlete is stranded mid-session |
| **Community memberships** *(Amendment 002)* | **1** | Athlete may **join** 1 community. No limit on the size of any community at any tier. Community **ownership** is capped at 1 for **all** tiers — a non-monetized product constraint, not a paywall. See Section 15. |

**All numerical limits are flagged as Initial MVP Assumptions — Subject to Future Revision.**

The 3-program limit, **75-photo limit** *(revised 2026-08-12, was 100, was 50)*, 5-video limit, 5-template limit, **1-squad limit** *(revised 2026-08-12, was 2)*, 1-import model, the Coach Holt allowances, and the 1-community-membership limit reflect initial MVP monetization assumptions. They may change based on user feedback, retention data, conversion data, storage costs, and business needs. The principles in Section 2 and Section 9 do not change.

**Every number above is server-side configuration, never a constant in `src/` (MA3-D16).** Being wrong should cost a `UPDATE` statement, not a release and an App Store review. The client reads these values; **the enforcing gate belongs in Postgres RLS** — a client that draws a cap and a server that permits one are two different mechanisms, and only the second is enforcement.

---

## Section 4 — Premium Tier Definition (MVP)

Premium raises every creation and storage limit and unlocks unlimited import capability.

**Revised 2026-08-05: Premium no longer says "unlimited" for anything that costs storage.** The numbers below are set so that no legitimate athlete reaches them — they are a ceiling on the product's downside, not a wall the customer is meant to feel. See Section 4A.

Premium includes everything in Free, plus:

| Feature | Premium Limit | Was |
|---|---|---|
| Custom programs | **500** *(revised 2026-08-12)* | 50 → mirrors `CUSTOM_LIMIT` in `src/domain/exercise-picker/custom-core.ts:16`, the abuse-guard shape already shipping |
| Photos | **1,000** | Unlimited |
| Videos | **100** | *(not previously counted)* |
| Day templates | **Unlimited** | *(new — costs no storage, so it stays uncapped)* |
| Squads | **5** *(revised 2026-08-12 by MA3-D7)* | 10 → *"nobody needs more than five"*; the ceiling exists because an account in fifty squads is an automation, not an athlete |
| **Coach Holt — everything** *(new, MA3-D4)* | **Unlimited** | Programs, single days, **in-workout help**, and adapting a program already running (safe-edit layer, migration 0123). This is what makes the annual price hold |

- Unlimited imports (W-IM-1 through W-IM-4)
- **Unlimited community memberships** *(Amendment 002)* — community **ownership** remains capped at 1 for all tiers; this is not unlocked by Premium (Section 15). **Dormant: Communities are deferred and unbuilt**
- **Coach AI is NOT included in Premium.** It is a **separate concurrent subscription** (Amendment 003 §2), not a tier above it. See the note below
- Future: Advanced analytics (deferred to post-MVP)
- Future: Premium legacy tools (deferred to post-MVP)

> **Athlete-facing framing vs. the numbers above.** Premium is described to the athlete as *"no limits on
> anything you build."* The finite numbers in this table are **abuse guards, not tier features** — set so
> that no legitimate athlete ever reaches one (Section 4A). Both statements are true simultaneously, and
> the distinction is why the word "unlimited" does not appear in a storage-bearing row.

> **⚠ The one thing Premium does not buy (Amendment 003, MA3-D2 / MA3-D3).** A second thing to buy now
> exists — **Coach AI**, a monthly/annual add-on requiring Premium. It is **not a higher tier**: it raises
> no limit in this table, so the Section 5 rule below (*a premium athlete at a ceiling gets a plain
> explanation, never an upsell*) is **unchanged and still binding**. Coach AI may only be offered at a
> Coach-AI-shaped moment, and **never** as the answer to a photo, squad, program, template, video or import
> limit. **No AI-inclusive lifetime SKU may exist at any price (MA3-D1).**

---

## Section 4A — Storage Economics (Revision 2026-08-05)

**Why "unlimited" was removed, recorded so the next person does not put it back.**

Every other limit in this document caps something that costs the product nothing to allow — a program is
a row, a squad is a row. **Photos and video are different: they cost real money every month, forever,
whether or not the athlete ever opens them again.** A subscription price is fixed. An unlimited storage
promise is not. The gap between them is unbounded, it compounds monthly, and the athlete who opens it is
by definition the one who values the product most — so there is no version of enforcement that is not
punishing your best customer after the fact. A finite number set high enough that nobody reaches it is
kinder than an unlimited promise that has to be withdrawn.

**What made the generous numbers affordable was fixing the upload, not lowering the tier.** Photos were
being stored at full camera resolution — roughly 3 MB each — to render an image no surface in the app
displays above about 1200 px. Capping the long edge at 1600 px brings that to roughly 350 KB with no
visible difference on a phone. That single change is worth more than any limit in this document:

| | Before | After |
|---|---|---|
| One photo | ~3 MB | ~350 KB |
| 100 photos (free tier) | ~300 MB | ~35 MB |
| 1,000 free athletes | ~300 GB | ~35 GB |

Which is why the free photo allowance went **up** (50 → 100) in the same revision that removed the word
unlimited. The saving was spent on the athlete rather than the margin.

**Video is the exception that stays tight.** A 30-second clip is tens of megabytes; a single video can
outweigh an athlete's entire photo album. Duration is capped at 30 seconds for all tiers as a product
rule, and video is counted separately from photos rather than folded into one number, so that the
expensive medium is the one being governed.

**The honest limit of the video cap, recorded rather than glossed:** `videoMaxDuration` holds on every
platform, but resolution can only be capped on what the app RECORDS, and only on iOS (`videoQuality`).
A video chosen from the library arrives at whatever size the phone saved it. Genuinely bounding that
needs transcoding, which nothing in the stack does today. If video storage becomes a real cost line, that
is the next lever — not a lower count.

**Downgrade behaviour is unchanged and non-negotiable.** Nothing in this revision deletes anything.
Section 2 governs: history stays, at every tier, forever.

---

## Section 5 — Photo Limit Behavior

*(Numbers revised 2026-08-05: free 50 → 100; premium unlimited → 1,000. Revised again 2026-08-12 by MA3-D8: free 100 → **75**. Behaviour unchanged throughout.)*

| Scenario | Behavior |
|----------|---------|
| Free user attempts photo 76 | M-7 Premium Upsell Sheet fires — **before the picker opens**, never halfway through an upload |
| Free user upgrades then downgrades | All photos remain. No deletion. Cannot add new photos while over 75. |
| Premium user adds photos up to 1,000, then downgrades | All photos remain permanently — visible forever. Cannot add new photos while at or above 75. |
| Premium user attempts photo 1,001 | Blocked with a plain explanation, **not** an upsell. Copy must not imply the athlete did something wrong. **Unchanged by Amendment 003:** Coach AI raises no ceiling, so there is still nothing to sell at this moment (MA3-D2) |
| Photo counter display | "X of 75 photos" (free) / "X of 1,000 photos" (premium) — shown on L-15 |
| Video counter | Counted and displayed separately from photos at both tiers (5 free / 100 premium). **Squad check-ins never count** (MA3-D14) |
| Transformation Gallery entries | **Share the one account-wide photo counter** (MA3-D8) — this closes the Gallery architecture's open question, which had left it undecided between a shared cap, a separate cap, and uncapped |

---

## Section 6 — Program Limit Behavior

| Scenario | Behavior |
|----------|---------|
| Free user has 3 custom programs, attempts to create a 4th in W-4 | M-7 Premium Upsell Sheet fires. W-4 creation is blocked. |
| Free user's 4th program would be created via import | Import flow counts toward the import model (Section 8). A resulting program counts toward the 3-program custom limit after creation. Free user who has used their one free import and has 3 programs cannot import another program. |
| Free user upgrades, creates programs, then downgrades | All programs remain. No deletion. Cannot create new custom programs while at or above 3. |
| Saving a Forge Program to Upcoming (W-3 Preview → "Save to Upcoming") | Creates an athlete-owned copy in Future state. Counts toward the 3-program custom limit. |
| Starting a Forge Program directly (W-3 Preview → "Start Program") | Creates an athlete-owned copy in Active state. Counts toward the 3-program custom limit. |
| **Free user RECEIVES a program from a friend or squad-mate** *(new, MA3-D10)* | **Counts toward the 3-program limit.** At the limit, the receipt is blocked and M-7 fires on the recipient's side. **Sending is always free** (MA3-D13) — the sender's slot is never consumed |
| **Holt generates a program for a free user** *(new)* | Counts toward the 3-program limit **and** consumes the 1-lifetime Holt program allowance. Two separate counters; both must have room |
| **Free user deletes a program** *(new, MA3-D9)* | **The slot does NOT reopen.** Without this the cap never fires for an athlete running one four-week block at a time — the most common real behaviour in the product. A cap that never fires is not a cap |
| **Workouts logged against a deleted program** *(new, MA3-D11)* | **Kept forever.** Deleting a program deletes the plan, never the history. Section 2 governs and is absolute. This is the seam where MA3-D9 could have quietly broken Never Charge For History, and it is closed explicitly |
| One Active program maximum | Applies to all tiers. This is a product rule (Program Amendment 001), not a monetization limit. |

**Flagged as Initial MVP Assumption — Subject to Future Revision.**

---

## Section 7 — Squad Limit Behavior

*(Numbers revised 2026-08-12 by MA3-D7: free 2 → **1**; premium 10 → **5**. Behaviour unchanged. See Amendment 003 §4 for the explicit supersession of Critical Decisions Amendment 001 Decision 4.)*

| Scenario | Behavior |
|----------|---------|
| Free user in 1 squad attempts to create or join a second | M-7 Premium Upsell Sheet fires — **before the create/join flow opens** |
| **Free user with 0 squads attempts to CREATE one** | **Allowed.** A free athlete must be able to create a squad, not only join one, or the acquisition engine only runs downhill from paying users |
| Free user upgrades, joins more squads, then downgrades | Remains in all squads. Cannot join or create new squads while at or above 1. No squad deletion on downgrade. |
| Premium user attempts a 6th squad *(cap added 2026-08-05 at 10, narrowed to 5 on 2026-08-12)* | Blocked with a plain explanation, not an upsell. A squad is a row and costs nothing to store; the cap exists because an account in fifty squads is an automation, not an athlete |
| Squad invitation received by free user already in 1 squad | Invitation visible but cannot be accepted until user upgrades or leaves a current squad |
| Free user who leaves a squad | Free slot restored. May join or create until reaching the 1-squad limit. |

**Flagged as Initial MVP Assumption — Subject to Future Revision.**

---

## Section 8 — Import Model: One Free Lifetime Import

**The import system serves two distinct use cases:**

1. **Historical migration** — an athlete brings their prior training legacy into Forge Legacy. This is a one-time act of recording history, not a power-user workflow.
2. **Ongoing import pipeline** — an athlete regularly imports structured training from external tools. This is a workflow preference and a premium capability.

The free import covers use case 1. Premium covers both.

**Free tier import model: One completed import, lifetime per account.**

"Completed" is defined precisely: the athlete taps "Confirm Import" at W-IM-4. That is the moment content is created. Prior to that moment, no import has been consumed.

**Import counter:** A boolean per account — `hasUsedFreeImport: false | true`
- `false` on account creation
- Set to `true` on successful W-IM-4 confirmation
- Failed imports (parse error, abandoned at any step before W-IM-4 confirmation) do not set it to `true`
- A free user with `hasUsedFreeImport: false` has full access to the W-IM-1 through W-IM-4 flow
- A free user with `hasUsedFreeImport: true` sees M-7 at any import entry point (W-1, W-2, L-5)

| Scenario | Behavior |
|----------|---------|
| Free user on first import attempt | Full W-IM flow accessible |
| Free user completes W-IM-4 confirmation | Import created; `hasUsedFreeImport` set to `true` |
| Free user abandons import before W-IM-4 confirmation | No import consumed; `hasUsedFreeImport` remains `false` |
| Free user with `hasUsedFreeImport: true` attempts another import | M-7 fires at W-1, W-2, or L-5 import entry |
| Free user upgrades, imports multiple programs/chapters, then downgrades | All imported content remains permanently. `hasUsedFreeImport` remains `true`. Cannot import again without upgrading. |
| Premium user | Unlimited import flows; `hasUsedFreeImport` not evaluated |

**Imported content is history. Never Charge For History applies.**

Content created by a completed import (programs, chapters) follows the same rules as manually created content. It is the athlete's historical record. It is accessible forever, regardless of subscription tier, downgrade behavior, or account status.

**Why one free import, not zero:**
Charging for the first import creates a gap in the "Never Charge For History" principle. An athlete migrating three years of prior training into Forge Legacy is not accessing a power-user workflow — they are recording history that predates the app. Blocking that act without payment contradicts the spirit of the principle, even if it does not technically violate the letter of it. One free import closes this gap. Unlimited imports require premium because repeated import is a workflow preference, not a migration act.

**Flagged as Initial MVP Assumption — Subject to Future Revision.**

---

## Section 8A — Community Limit Behavior *(Amendment 002, June 2026 — `Community-System-Architecture-v1.0` COM-D4)*

| Scenario | Behavior |
|---|---|
| Free user in 1 community attempts to join a second | M-7 Premium Upsell Sheet fires |
| Free user upgrades, joins more communities, then downgrades | Remains a member of all of them. Cannot join an additional community while at or above 1. No removal on downgrade (Section 2). |
| Community invitation/approval received by a free user already in 1 community | Visible but cannot be completed until the athlete upgrades or leaves their current community |
| Free user who leaves their one community | Free slot restored. May join another until reaching the 1-community limit again. |
| Community ownership (max 1, **all tiers**) | **Not a monetization gate.** Capped at 1 for every tier including Premium — a product-design constraint (same category as "one Active program"), not a paywall. |
| Member count within any community | **No limit at any tier**, regardless of ownership or membership tier. |

**Flagged as Initial MVP Assumption — Subject to Future Revision** (the "1" figure only; the behaviors are locked). Full detail: `Monetization-Architecture-Amendment-002-Communities.md`.

---

## Section 9 — Monetization Philosophy (Locked)

**Forge Legacy monetizes:**
- Creation beyond the free tier (programs, squads, **day templates** *(added 2026-08-05)*)
- Storage beyond the free tier (photos, **video** *(added 2026-08-05)*)
- Repeated import workflows (import sessions beyond the first)
- Power-user workflows and convenience
- Future advanced tools (AI, analytics, premium legacy features)

**Forge Legacy does NOT monetize:**
- History — in Forge Legacy or migrating into Forge Legacy
- Legacy
- Identity
- Personal records
- Historical achievements
- Access to what the athlete has already built
- The first act of bringing prior training history home

This distinction is permanent. Future monetization features must be evaluated against it.

---

## Section 10 — Future Monetization Decision Framework

Before any monetization change is approved, evaluate against:

1. Does this limit access to history?
2. Does this preserve Never Charge For History — including migrating history into the product?
3. Does this align with Legacy First?
4. Does this avoid holding the athlete's story hostage?
5. Does this feel premium (adding capability) rather than restrictive (removing access)?
6. Does this remain aligned with Product DNA: timeless, premium, intentional?

A proposed monetization change that fails Questions 1, 2, or 3 should not be approved. A change that fails multiple questions should be formally challenged before approval.

---

## Section 11 — Downstream Impact on Existing Documents

> ⚠ **This section and Section 13 were stale from 2026-08-05 to 2026-08-12** — they still asserted "photo
> limit (50) already correct" and "unlimited premium" after the same-day revision had replaced both. That
> is this project's documented failure mode appearing inside the document that defines it. Rewritten
> 2026-08-12; the corrections are marked.

| Document | Impact | Action Required |
|----------|--------|----------------|
| Master PRD Section 18 | ⚠ **Was wrong:** claimed "photo limit (50) already correct". The free photo limit went 50 → 100 (2026-08-05) → **75** (2026-08-12, MA3-D8). Squad limit went 2 → **1** (MA3-D7). Program limit 3 now includes **received** programs (MA3-D10). | **Open** — PRD Section 18 must be updated to 75 photos / 1 squad / 3 programs incl. received, and to reference Amendment 003. |
| Master PRD Section 5 (MVP) | ⚠ **Was wrong:** "L-15 '50 stored free / unlimited premium' is correct and unchanged." Neither half is true — free is **75**, premium is **1,000** (finite since 2026-08-05). | **Open** — correct both figures in PRD Section 5. |
| Architecture-Amendment-001-Import.md | Import specified as universal MVP feature with no tier distinction. This amendment introduces a tier model: 1 free import / unlimited premium. | Import Amendment 001 must be revised to add tier restriction note. **Status: follow-up required.** |
| S-1 Squads Hub Wireframe Spec v1.2 | Notes "MVP does not cap the number of squads an athlete can belong to." Conflicts with prior 1-squad free limit. | S-1 updated to reflect 2-squad free limit. **Status: complete — see Critical Decisions Amendment 001.** |
| W-4 Program Creation Wireframe Spec v1.1 | No mention of program count limits. M-7 must fire when free user at 3 programs attempts W-4. | W-4 edge case addition: M-7 fires if athlete has reached free-tier program limit. **Status: follow-up recommended.** |

---

## Section 12 — Product DNA Alignment

| Amendment Element | DNA Principle |
|------------------|---------------|
| Never Charge For History | Legacy First — the athlete's legacy belongs to them |
| One free import (historical migration) | Story Before Data — the story predating the app is still the story |
| History always accessible regardless of tier | Identity Over Performance — identity records are never walled |
| Downgrade preserves all content | Accountability Without Shame — no punishment mechanics |
| Monetize creation/workflow, not legacy | Transformation Over Activity — long-term commitment is rewarded |
| Provisional numbers, locked principles | Simplicity Wins — clear guardrails, flexible execution |

---

## Section 13 — Validation Checklist

**Never Charge For History (Locked)**
- [ ] Historical workout records: always accessible, always free
- [ ] Historical chapters: always accessible, always free
- [ ] Historical goals, accomplishments, honors, ranks, timeline: always accessible, always free
- [ ] Historical program records (all states): always accessible, always free
- [ ] Historical squad history: always accessible, always free
- [ ] Content created by completed imports: always accessible, always free
- [ ] Downgrade: no history deleted, no history hidden, no history restricted

**Free Tier** *(numbers corrected 2026-08-12 — this block had been stale since 2026-08-05)*
- [ ] Unlimited workout logging, history, chapters, goals, accomplishments, honors, ranks, timeline
- [ ] Custom programs: capped at **3 lifetime, including received** (MA3-D10); slots do not reopen on delete (MA3-D9)
- [ ] Photos: capped at **75** *(was 50, then 100)* — account-wide, Gallery entries included
- [ ] Videos: capped at **5 persistent**; squad check-ins never count (MA3-D14)
- [ ] Day templates: capped at **5**; the 81 Forge templates never count
- [ ] Squads: capped at **1** *(was 2)* — MA3-D7 supersedes Critical Decisions Amendment 001 Decision 4
- [ ] Coach Holt: **1 four-week program lifetime**, **2 single days per month**, **no in-workout help**; manual substitution still free (MA3-D4, MA3-D5)
- [ ] Imports: 1 lifetime completed import — flagged as provisional
- [ ] Community memberships: capped at 1 — flagged as provisional (Amendment 002), **dormant: Communities unbuilt**
- [ ] M-7 fires at program 4, **photo 76**, **squad 2**, template 6, video 6, and second import attempt — **each as a pre-action check, before the flow opens**
- [ ] First import attempt: full W-IM flow accessible to free user
- [ ] Abandoned/failed imports do not consume the free import

**Premium Tier** *(⚠ these four rows said "Unlimited" from 2026-08-05 to 2026-08-12, contradicting Section 4 on the same day it was written)*
- [ ] All free tier features
- [ ] Custom programs: **500** *(abuse guard, was "unlimited", then 50)*
- [ ] Photos: **1,000** *(abuse guard, was "unlimited")*
- [ ] Videos: **100** *(abuse guard)*
- [ ] Day templates: **Unlimited** — costs no storage, genuinely uncapped
- [ ] Squads: **5** *(was "unlimited", then 10)* — MA3-D7
- [ ] Coach Holt: **unlimited**, including in-workout help and program adaptation
- [ ] Unlimited imports (W-IM-1 through W-IM-4)
- [ ] **Coach AI is NOT included** — separate concurrent subscription, never bundled, never sold as a lifetime (MA3-D1, MA3-D3)

**Downgrade Behavior**
- [ ] Programs over limit: remain; no new creation allowed while at/above limit
- [ ] Photos over limit: remain; no new photos allowed while at/above limit
- [ ] Squads over limit: remain; no new squads allowed while at/above limit
- [ ] Imported content: remains permanently accessible; `hasUsedFreeImport` stays `true`; no re-import on free tier
- [ ] Zero deletions on downgrade

**Import Model**
- [ ] `hasUsedFreeImport` boolean tracked per account
- [ ] Set to `true` only on successful W-IM-4 confirmation
- [ ] Abandoned imports before W-IM-4: `false` preserved
- [ ] Free user on first import: full W-IM flow available
- [ ] Free user after first import: M-7 at W-1, W-2, L-5 import entry points
- [ ] Premium user: `hasUsedFreeImport` not evaluated; unlimited access

**Documents Requiring Follow-Up (post-lock)**
- [ ] Import Amendment 001 updated with tier restriction note
- [x] S-1 Squads Hub spec updated to reflect 2-squad free limit — completed, Critical Decisions Amendment 001

---

## Section 14 — Lock Recommendation

**Monetization Architecture Amendment 001 is locked.**

The amendment:
- Establishes Never Charge For History as the permanent foundational principle
- Defines the free tier with four provisional numerical limits
- Adopts Option B for imports: one free lifetime import (historical migration use case) / unlimited premium
- Closes the philosophical gap between "Never Charge For History in Forge Legacy" and "Never Charge For History migrating into Forge Legacy"
- Flags all numerical limits as provisional assumptions
- Documents two follow-up amendments required before implementation of limit-gating logic (Import Amendment 001, S-1)
