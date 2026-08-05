# Forge Legacy — Monetization Architecture Amendment 001
## MVP Monetization Framework
### Status: Locked — MVP Approved Assumption | June 2026 (Amendment 002 merged) | **Storage-economics revision 2026-08-05**

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
| Custom programs | 3 | One Active program maximum applies to all tiers per Program Amendment 001 |
| Photos | **100** *(revised 2026-08-05, was 50)* | Account-wide (not per-chapter). Counter shown on L-15: "X of 100 photos". Raised because downscaling made a photo ~8× cheaper to keep; the free tier got the saving rather than the margin |
| Videos | **5** *(new 2026-08-05)* | Account-wide. Video is the one medium that can cost more than a subscription, so it is the one counted separately from photos rather than folded in |
| Video length | **30 seconds** *(new 2026-08-05)* | All tiers — a product rule, not a paywall. A form check is fifteen seconds and a working set is twenty; 30 is sufficiency, not restriction. Enforced centrally in `useMediaPicker` |
| Day templates | **5** *(new 2026-08-05)* | Athlete-authored templates (W-26/W-27). Forge's own shipped templates are catalogue content and never count |
| Squads | 2 | Athlete may belong to or create up to 2 squads. Account-wide. |
| Imports | 1 lifetime import | One completed import flow (one W-IM-4 confirmation). See Section 8. |
| **Community memberships** *(Amendment 002)* | **1** | Athlete may **join** 1 community. No limit on the size of any community at any tier. Community **ownership** is capped at 1 for **all** tiers — a non-monetized product constraint, not a paywall. See Section 15. |

**All numerical limits are flagged as Initial MVP Assumptions — Subject to Future Revision.**

The 3-program limit, **100-photo limit** *(revised 2026-08-05, was 50)*, 5-video limit, 5-template limit, 2-squad limit, 1-import model, and 1-community-membership limit reflect initial MVP monetization assumptions. They may change based on user feedback, retention data, conversion data, storage costs, and business needs. The principles in Section 2 and Section 9 do not change.

---

## Section 4 — Premium Tier Definition (MVP)

Premium raises every creation and storage limit and unlocks unlimited import capability.

**Revised 2026-08-05: Premium no longer says "unlimited" for anything that costs storage.** The numbers below are set so that no legitimate athlete reaches them — they are a ceiling on the product's downside, not a wall the customer is meant to feel. See Section 4A.

Premium includes everything in Free, plus:

| Feature | Premium Limit | Was |
|---|---|---|
| Custom programs | **50** | Unlimited |
| Photos | **1,000** | Unlimited |
| Videos | **100** | *(not previously counted)* |
| Day templates | **Unlimited** | *(new — costs no storage, so it stays uncapped)* |
| Squads | **10** | Unlimited |

- Unlimited imports (W-IM-1 through W-IM-4)
- **Unlimited community memberships** *(Amendment 002)* — community **ownership** remains capped at 1 for all tiers; this is not unlocked by Premium (Section 15)
- Future: AI features (deferred to post-MVP)
- Future: Advanced analytics (deferred to post-MVP)
- Future: Premium legacy tools (deferred to post-MVP)

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

*(Numbers revised 2026-08-05: free 50 → 100; premium unlimited → 1,000. Behaviour unchanged.)*

| Scenario | Behavior |
|----------|---------|
| Free user attempts photo 101 | M-7 Premium Upsell Sheet fires |
| Free user upgrades then downgrades | All photos remain. No deletion. Cannot add new photos while over 100. |
| Premium user adds photos up to 1,000, then downgrades | All photos remain permanently — visible forever. Cannot add new photos while at or above 100. |
| Premium user attempts photo 1,001 | Blocked with a plain explanation, **not** an upsell — there is no higher tier to sell. Copy must not imply the athlete did something wrong. |
| Photo counter display | "X of 100 photos" (free) / "X of 1,000 photos" (premium) — shown on L-15 |
| Video counter | Counted and displayed separately from photos at both tiers (5 free / 100 premium) |

---

## Section 6 — Program Limit Behavior

| Scenario | Behavior |
|----------|---------|
| Free user has 3 custom programs, attempts to create a 4th in W-4 | M-7 Premium Upsell Sheet fires. W-4 creation is blocked. |
| Free user's 4th program would be created via import | Import flow counts toward the import model (Section 8). A resulting program counts toward the 3-program custom limit after creation. Free user who has used their one free import and has 3 programs cannot import another program. |
| Free user upgrades, creates programs, then downgrades | All programs remain. No deletion. Cannot create new custom programs while at or above 3. |
| Saving a Forge Program to Upcoming (W-3 Preview → "Save to Upcoming") | Creates an athlete-owned copy in Future state. Counts toward the 3-program custom limit. |
| Starting a Forge Program directly (W-3 Preview → "Start Program") | Creates an athlete-owned copy in Active state. Counts toward the 3-program custom limit. |
| One Active program maximum | Applies to all tiers. This is a product rule (Program Amendment 001), not a monetization limit. |

**Flagged as Initial MVP Assumption — Subject to Future Revision.**

---

## Section 7 — Squad Limit Behavior

| Scenario | Behavior |
|----------|---------|
| Free user in 2 squads attempts to create or join a third | M-7 Premium Upsell Sheet fires |
| Free user upgrades, joins more squads, then downgrades | Remains in all squads. Cannot join or create new squads while at or above 2. No squad deletion on downgrade. |
| Premium user attempts an 11th squad *(cap added 2026-08-05)* | Blocked with a plain explanation, not an upsell. A squad is a row and costs nothing to store; the cap exists because an account in fifty squads is an automation, not an athlete |
| Squad invitation received by free user already in 2 squads | Invitation visible but cannot be accepted until user upgrades or leaves a current squad |
| Free user who leaves a squad | Free slot restored. May join or create until reaching 2-squad limit. |

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

| Document | Impact | Action Required |
|----------|--------|----------------|
| Master PRD Section 18 | Photo limit (50) already correct. Program limit (3), squad limit (now 2 — revised by Critical Decisions Amendment 001), and import model (1 free / unlimited premium) are new. | PRD Section 18 updated — references this amendment with summary table. |
| Master PRD Section 5 (MVP) | L-15 "50 stored free / unlimited premium" is correct and unchanged. | No change required. |
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

**Free Tier**
- [ ] Unlimited workout logging, history, chapters, goals, accomplishments, honors, ranks, timeline
- [ ] Custom programs: capped at 3 — flagged as provisional
- [ ] Photos: capped at 50 — flagged as provisional
- [ ] Squads: capped at 2 — locked by Critical Decisions Amendment 001 (June 2026)
- [ ] Imports: 1 lifetime completed import — flagged as provisional
- [ ] Community memberships: capped at 1 — flagged as provisional (Amendment 002); community ownership capped at 1 for all tiers, non-monetized; no community member-count cap at any tier
- [ ] M-7 fires at program 4 attempt, photo 51 attempt, squad 3 attempt, and second import attempt
- [ ] First import attempt: full W-IM flow accessible to free user
- [ ] Abandoned/failed imports do not consume the free import

**Premium Tier**
- [ ] All free tier features
- [ ] Unlimited custom programs
- [ ] Unlimited photos
- [ ] Unlimited squads
- [ ] Unlimited imports (W-IM-1 through W-IM-4)

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
