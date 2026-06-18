# Forge Legacy — Monetization Architecture Amendment 001
## MVP Monetization Framework
### Status: Locked — MVP Approved Assumption | June 2026

**Authority:** Forge Legacy Master PRD Section 18 | Forge Legacy Product DNA
**Supersedes:** PRD Section 18 monetization prose where they conflict
**Scope:** All screens where premium limits apply — W-4 (program creation), S-1/S-3 (squad creation/join), W-1/W-2/L-5 (import entry points), L-15 (photo counter), M-7 (upsell sheet)

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
| Photos | 50 | Account-wide (not per-chapter). Counter shown on L-15: "X of 50 photos" |
| Squads | 2 | Athlete may belong to or create up to 2 squads. Account-wide. |
| Imports | 1 lifetime import | One completed import flow (one W-IM-4 confirmation). See Section 8. |

**All numerical limits are flagged as Initial MVP Assumptions — Subject to Future Revision.**

The 3-program limit, 50-photo limit, 2-squad limit, and 1-import model reflect initial MVP monetization assumptions. They may change based on user feedback, retention data, conversion data, storage costs, and business needs. The principles in Section 2 and Section 9 do not change.

---

## Section 4 — Premium Tier Definition (MVP)

Premium removes creation and storage limits and unlocks unlimited import capability.

Premium includes everything in Free, plus:
- Unlimited custom programs
- Unlimited photos
- Unlimited squads
- Unlimited imports (W-IM-1 through W-IM-4)
- Future: AI features (deferred to post-MVP)
- Future: Advanced analytics (deferred to post-MVP)
- Future: Premium legacy tools (deferred to post-MVP)

---

## Section 5 — Photo Limit Behavior

| Scenario | Behavior |
|----------|---------|
| Free user attempts photo 51 | M-7 Premium Upsell Sheet fires |
| Free user upgrades then downgrades | All photos remain. No deletion. Cannot add new photos while over 50. |
| Premium user adds unlimited photos, then downgrades | All photos remain permanently — visible forever. Cannot add new photos while at or above 50. |
| Photo counter display | "X of 50 photos" (free) / "X photos" (premium) — shown on L-15 |

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

## Section 9 — Monetization Philosophy (Locked)

**Forge Legacy monetizes:**
- Creation beyond the free tier (programs, squads)
- Storage beyond the free tier (photos)
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
