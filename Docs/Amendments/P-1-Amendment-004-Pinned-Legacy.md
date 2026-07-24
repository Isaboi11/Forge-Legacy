# P-1 Amendment 004 — Pinned Legacy Surface

## Amendment to Profile Wireframe Spec (P-1)

### June 2026

**Status:** LOCKED (product-owner approved, June 2026; the open decisions in Section 12 are resolved — see Section 12 and the Amendment Log). **Merged into `Profile-Wireframe-Spec-P1.md` v1.3 (June 2026)** — Tier 1B and Section 4A in the base document are now normative; this file is retained for historical record. The merge also closed the §11 ledger row for `Profile-Wireframe-Spec-P1.md` and explicitly confirmed Honors (including Strength Clubs) as a first-class Pinned Legacy eligible type, with no separate "Featured Honors" or "Recognition Clubs" system introduced.

**Type:** Surface-Defining Amendment. Fulfills the surface deferred by `Profile-Wireframe-Spec-P1.md` §31 ("This is a pointer only; no Posts/Pinned-Posts surface is added to P-1 here. Surface design is a future P-1 amendment governed by SOC-D6."). Introduces one new P-1 tier and its interaction model; reuses existing owned entities; adds no new domain.

**Date:** June 2026

**Amends:** `Profile-Wireframe-Spec-P1.md` v1.2 → v1.3

**Origin:** `Social-System-Architecture-v1.0.md` SOC-D6 generalized "Pinned Posts" and left **pin count / ordering / surface design** as a wireframe-level detail to be "reconciled with the P-1 profile spec and L-12 accomplishments downstream." SOC-D6 §150 also lists **"Pinned accomplishments"** and **"Pinned Posts"** as two separate identity-first profile elements. This amendment unifies them into one surface — **Pinned Legacy** — and specifies its rules.

**Authority Chain (all LOCKED, none reopened by this amendment):**
- `Social-System-Architecture-v1.0.md` — SOC-D2 (relationships grant interaction, not visibility); SOC-D3 (identity before content); SOC-D5/SOC-D11 (no popularity surface); SOC-D6 (Profiles / Pinned Posts generalized); SOC-D7 (Post entity + `media` + `milestoneType`); SOC-D13 (separation of progression and social).
- `Profile-Wireframe-Spec-P1.md` v1.2 — §2 Information Hierarchy; §15 Privacy Architecture Review (§15.3 "No per-accomplishment privacy control currently exists").
- `L-12-Accomplishments-Management-Architecture.md` v1.0.1 — §7 "Featured" flag (max 3); §9 Visibility Rules; §12A Relationship to Social / Pinned Posts; §8 / AD-52 snapshot philosophy.
- `HonorInstance-Architecture-v1.0.md` — §5 Snapshot Philosophy (AD-52).
- `Squad-Detail-Wireframe-Spec-S2.md` — §5.5.4 Limited Athlete Profile (top-3 featured).
- `FORGE_LEGACY_PRODUCT_DNA.md` — §4 (not a streak/productivity app); §10 (no fake progress / no popularity / no shame mechanics); §11 (Product Decision Test).

**Amendment Log:** v1.0 (June 2026) — Initial, LOCKED. Product owner approved the surface and resolved every Section 12 open decision: §12-A capacity **6**, athlete-reorderable, distinct from L-12 Featured (max 3); §12-B the eligible set extends beyond Posts to PRs, Honors, rank events, program completions, chapter completions, challenge victories, milestone accomplishments, and PR-media Posts (PL-D3); §12-E **live references with cascade-on-delete** — the AD-52 snapshot model is explicitly **not** used here; no new privacy system (a pin can never out-scope its source); no progression / rank / Honor / scoring effect. §12-C (Squad Limited Athlete Profile) left unchanged; §12-D (L-1 parity) remains optional/deferred. The P-1 version drift (header v1.2 vs. Amendment-003's v1.1) is intentionally left for the later single reconciliation pass. No further open questions.

---

## Section 1 — Purpose

P-1 §31 reserves a Pinned content surface as "a future P-1 amendment governed by SOC-D6" but specifies none. SOC-D6 generalizes pinning ("the athlete may pin any intentional post... pinned content exists to reinforce identity — not to maximize engagement") and explicitly leaves **count, ordering, and surface design** to be reconciled here. This amendment defines that surface — **Pinned Legacy** — as a single curated showcase, directly below the Identity Header, of the athlete's most meaningful legacy moments. It introduces the smallest possible model: a lightweight, owner-curated **reference** to entities that already exist and are already owned by their domains. It owns no content of its own.

This amendment makes **no progression change** (SOC-D13), **adds no per-item privacy control** (P-1 §15.3 / L-12 §9 unchanged), and **does not redesign the profile** — it inserts one tier and renumbers the existing ones.

---

## Section 2 — PL-D1 — What Pinned Legacy Is (orchestration, not a domain)

**Pinned Legacy is a curated reference layer, not a content store.** A pinned item is a pointer to an entity the athlete already owns; it holds no copy of that entity's content and re-implements none of its logic. This mirrors the orchestration-only precedent established for Onboarding (ONB-D2), Calendar (CAL-D3), and Social (SOC-D13).

**The correctness test (binding):** *If the Pinned Legacy surface were deleted, every entity it referenced would still exist and remain fully owned by its domain.* A pin is the only record that dies with the surface. Any design in which Pinned Legacy becomes the system of record for a PR, an Honor, a rank event, a completion, a challenge result, a workout, or a Post is a violation of PL-D1.

**This is not a media gallery and not a new posting system.** Pinned Legacy displays existing moments; it never creates Posts, never uploads media, and never aggregates media into a standalone gallery. Where a pinned item carries media, that media already lives on the source entity (a Post's `media`, per SOC-D7).

---

## Section 3 — PL-D2 — Placement (one new tier; profile not redesigned)

Pinned Legacy is inserted as a new tier in the P-1 Information Hierarchy (§2), **directly below the Identity Header and above all chronological legacy content** (the Current Chapter Card and everything beneath it). The existing tiers shift down by one; nothing else about their content or treatment changes.

| Tier | v1.2 | v1.3 (this amendment) |
|---|---|---|
| 1 | Identity Header | Identity Header *(unchanged)* |
| **1B (new)** | — | **Pinned Legacy** |
| 2 | Current Chapter Card | Current Chapter Card |
| 3 | Rank | Rank |
| 3B | Progress | Progress |
| 4 | Honors | Honors |
| 5 | Accomplishments | Accomplishments |
| 6 | Settings | Settings |

- Placement honors the hierarchy principle in P-1 §2: **identity first** (the header answers "Who am I?"), then the athlete's **chosen showcase of who they have become** (Pinned Legacy), then the chronological story (chapter → rank → honors → accomplishments). Pinned Legacy is identity-reinforcing curation, which is why it sits immediately under the header and above the time-ordered surfaces — consistent with the task's "below profile identity, above the Legacy Timeline."
- **L-1 (Legacy Hub) reconciliation:** the same surface principle applies on L-1, where "above the Legacy Timeline" is literal. This amendment specifies the surface on **P-1** (the SOC-D6 / §31 hook). Surfacing the identical curated set above the L-1 timeline preview is an additive L-1 reconciliation note (Section 11, gated) and changes no L-1 or L-2 behavior.
- **No redesign:** this is a single insert + renumber. Identity Header, Chapter Card, Rank/Progress/Honors/Accomplishments/Settings are untouched in content and treatment.

---

## Section 4 — PL-D3 — Eligible Items (reuse existing owned entities)

The athlete may pin any of the following **already-owned** legacy moments. Each maps to an existing entity; none is newly modeled here.

| Pinnable moment | Source entity (owner / authority) |
|---|---|
| **Personal Records (PRs)** | the PR record produced by the Workout/Stats domain |
| **PR photos / videos** | a `Post` whose `media` carries the PR photo/video (SOC-D7) |
| **Honors** | `HonorInstance` (Honor Catalog / HonorInstance-Architecture) |
| **Rank unlocks** | the rank-attainment event produced by the Rank Computation Model |
| **Program completions** | the program-completion event (Program Ecosystem) |
| **Chapter completions** | the sealed-Chapter event (Legacy / L-3) |
| **Challenge victories** | the challenge result/victory record (Challenge Architecture) |
| **Major workout milestones** | a `Post` with `source = MILESTONE_AUTO`, or the milestone event the Workout domain already emits |
| **Accomplishments** *(declared)* | `Accomplishment` (L-12) — unifies SOC-D6 §150's "Pinned accomplishments" bullet into this surface |

**Explicitly not pinnable** (PL-D3 eligibility filter — rejected by the model):
- **Comments** and **reactions** (SOC-D11 engagement is never an identity surface; SOC-D5/D11 no-popularity rule).
- **Generic workout logs without a milestone** and **routine activity** — a logged session is pinnable only when it carries a milestone (a PR, a `MILESTONE_AUTO` post, or a Workout-domain milestone event). A bare log is not.
- **Feed interactions** of any kind (opening, viewing, reacting to, or commenting on feed content).

This eligibility set is the union of (a) SOC-D7's `milestoneType` moments (Honor / Program / Chapter / major milestone), (b) intentional Posts carrying PR media (SOC-D6/SOC-D7), (c) declared Accomplishments (L-12), and (d) the Rank/PR/Challenge events the respective domains already own — all things the athlete *earned or declared*, never things they merely *did* or *touched*.

---

## Section 5 — PL-D4 — Capacity, Pin / Unpin / Reorder

- **Capacity: maximum 6 pinned items.** Selecting a 7th is blocked with a calm prompt to unpin one first; there is no overflow list and no "see more." Six is the showcase ceiling — enough to tell an identity story, few enough that the surface stays a curation, not a feed.
- **Pin** — from a pinnable entity's detail surface (e.g., L-13 Accomplishment Detail, M-2/L-11 Honor, a Post, a completion/PR/challenge detail), the owner may "Pin to Profile" if under the cap.
- **Unpin** — the owner may remove any pinned item; unpinning never deletes or alters the source entity (PL-D1 / SOC-D13).
- **Reorder** — the owner may freely reorder the pinned items (the `order` field, PL-D5). Order is the athlete's editorial choice; there is no engagement-, recency-, or popularity-based auto-sort (SOC-D5/D11; DNA §10).

**Relationship to L-12 "Featured" (max 3) — distinct, unchanged (per L-12 §12A):**
- L-12 **Featured (max 3)** governs *ordering/surfacing within the accomplishments surface* (P-1 Tier 5 / L-1 preview). It is **unchanged**; its no-drag-reorder toggle mechanism (L-12 §15) stands.
- PL **Pinned Legacy (max 6, reorderable)** governs *profile-level pinning of any eligible legacy moment* (PL-D3). The two mechanisms are independent: an accomplishment may be Featured, Pinned, both, or neither. Pinning an accomplishment does not Feature it and vice-versa.

---

## Section 6 — PL-D5 — Data Model (architecture-level; concept)

A single new lightweight record. Field names are concept-level (house rule — backend may rename); types are indicative.

**`PinnedLegacyItem`**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `athleteId` | uuid (FK → Athlete) | The owner. The only athlete who can read/write their pins. |
| `targetType` | enum **{ `PR`, `PR_POST`, `HONOR`, `RANK_UNLOCK`, `PROGRAM_COMPLETION`, `CHAPTER_COMPLETION`, `CHALLENGE_VICTORY`, `WORKOUT_MILESTONE`, `ACCOMPLISHMENT`, `POST` }** | Constrained to the PL-D3 eligible set. Comments, reactions, generic logs, routine activity, and feed interactions are **not representable** — the enum is the eligibility filter. |
| `targetId` | uuid (FK → the owned source entity) | Must reference an entity owned by `athleteId`. |
| `order` | int (0–5) | The athlete's editorial order; unique per `athleteId`. |
| `pinnedAt` | timestamp | |

**Constraints:**
- **At most 6 rows per `athleteId`** (PL-D4 cap).
- `order` is **unique per athlete** and contiguous `0..n-1`.
- `targetType` ∈ the PL-D3 eligible set; the referenced entity must be **owned by** `athleteId`.

**Reference, not snapshot (and why this differs from the L-2 timeline):**
- A pin is a **live reference**. Editing the source entity updates the pinned display; **deleting the source entity removes the pin** (cascade — no orphaned pin, no stale display).
- This is deliberately **opposite** to the L-2 Legacy Timeline, which **snapshots** name/date per AD-52 (HonorInstance §5 / L-12 §8) because the timeline is *immutable history*. Pinned Legacy is a *curated, current showcase* of things the athlete still owns — so it must reflect the present, not a frozen past. A reference (with cascade-on-delete) is the smaller, correct model for a live showcase and introduces no snapshot duplication.

This is the entire schema addition: one table, no new fields on any existing entity, no new domain.

---

## Section 7 — PL-D6 — Display & Media Rules

- **Media-first when media exists.** If a pinned item's source carries a photo or video (a `Post.media`, per SOC-D7 — typically PR photos/videos or progress media), that media is the item's **primary visual**.
- **Text-identity when it does not.** Honors, rank unlocks, program/chapter completions, challenge victories, declared accomplishments, and media-less milestones render with their existing identity treatment (icon/title/date as their source domain already provides). No placeholder media, no empty frame.
- **Opening a pinned item shows full details.** Tapping a pinned item navigates to the **source entity's existing detail surface** — L-13 for an Accomplishment, M-2/L-11 for an Honor, the Post viewer for a Post, the completion/PR/challenge/rank detail for the rest. Pinned Legacy renders no detail view of its own; it routes into the owning domain (PL-D1).
- **No popularity, ever (SOC-D5/SOC-D11).** A pinned item never shows reaction counts, comment counts, view counts, or any comparison/engagement number. It is identity, not a leaderboard.

---

## Section 8 — PL-D7 — Empty State

When the athlete has zero pins, the surface is **a calm invitation, never a deficit** (DNA §10; consistent with P-1 §11 "forward-looking invitations, not failure indicators"):
- Either **available pin slots** (up to 6 quiet placeholder slots inviting curation), **or** the single line **"Pin accomplishments to showcase your legacy."**
- **No progress bar, no completion meter, no "0/6 pinned" pressure, no shame** (DNA §4/§10; mirrors P-1's no-progress-bar identity rules and ONB-D22's no-fake-progress stance).

---

## Section 9 — PL-D8 — Privacy (consistent with existing rules; no new control)

Pinned Legacy introduces **no new privacy mechanism** and inherits the locked model exactly:
- **Friendship grants interaction, not visibility (SOC-D2/SOC-D6).** A friend and a non-friend see the *same* public profile; pinning never widens what anyone can see.
- **A pin never exposes more than its source.** A pinned item is visible to a viewer **only if the source entity is already visible to that viewer** under existing rules (Honor visibility per the owner's public/private settings; Posts bounded to their `audience` per SOC-D8 — pinning a Post never makes it public, the maximum reach remains the source's audience). The pin is a reference; it cannot out-scope its target.
- **No per-item privacy toggle** (P-1 §15.3 / L-12 §9 unchanged) — there is no control to hide an individual pinned item beyond the source entity's own visibility.
- **Squad Limited Athlete Profile unchanged.** S-2 §5.5.4 continues to surface the top-3 **featured** accomplishments; this amendment does **not** add Pinned Legacy to the Limited Athlete Profile. (Whether the Limited Profile should later reflect pins is deferred — Section 12.)

---

## Section 10 — PL-D9 — Separation From Progression (binding; mirrors SOC-D13)

Pinning, unpinning, and reordering emit **no progression signal of any kind.** They contribute **zero** to Rank, Legacy Score, Honor evaluation, Goal progress, or chapter/goal state. Curating a profile is not an accomplishment (DNA §10; SOC-D13). The Legacy Engine produces progression; Pinned Legacy only *displays* what progression and declaration already produced.

---

## Section 11 — Reconciliation Ledger (downstream pointers — flagged for the next reconciliation pass)

Per project convention, this standalone amendment lists the conforming pointer-changes for a later consolidation pass (as P-1-Amendments 001/002 were later merged by 003). **No locked source document is edited by this amendment**; each item below is additive and gated on PO approval (Section 12).

| Doc | Required change | Gate |
|---|---|---|
| `Profile-Wireframe-Spec-P1.md` (v1.2 → v1.3) | Insert Tier 1B "Pinned Legacy" in §2 and the §3 scroll order; add a "Pinned Legacy" section (PL-D2–D8); fulfill the §31 pointer; add validation-checklist items; note in §15 Privacy Review that pins inherit source visibility and add no per-item control. | **Done — merged June 2026.** |
| `Social-System-Architecture-v1.0.md` (SOC-D6) | Note that "Pinned Posts" is realized on P-1 as **Pinned Legacy**, unifying SOC-D6 §150's "Pinned accomplishments" + "Pinned Posts" bullets; set the deferred count (**6**) and ordering (athlete-reorderable); extend the pinnable set beyond Posts to the PL-D3 eligible entities (additive; engagement/popularity exclusions reaffirmed). | §12-A/B |
| `L-12-Accomplishments-Management-Architecture.md` (§12A) | Note that an Accomplishment may now be **Pinned** (Pinned Legacy, max 6) in addition to **Featured** (max 3); the two remain independent; pinning never changes the record (SOC-D13). | §12-A |
| `Squad-Detail-Wireframe-Spec-S2.md` (§5.5.4) | Note that Pinned Legacy is **not** added to the Limited Athlete Profile (top-3 featured unchanged), unless §12-C decides otherwise. | §12-C |
| `Legacy-Hub-Wireframe-Spec-L1.md` | Optional: surface the same curated pinned set above the L-1 timeline preview ("above the Legacy Timeline," literal). Additive; changes no L-1/L-2 behavior. | §12-D |
| `Forge-Legacy-Master-PRD.md` (§17 Profile / §20 social) | Note the Pinned Legacy profile surface (curated reference layer; max 6; no progression effect). | §12 (all) |

---

## Section 12 — Open Decisions (RESOLVED — PO-approved June 2026)

The surface is internally coherent and stays inside every locked rule, but it sets values SOC-D6 deferred and touches locked specs. Each was surfaced with a recommended resolution; the product owner confirmed all of them at lock (June 2026). The recommendations below **are** the locked decisions.

- **§12-A — Capacity = 6 and reorderable.** SOC-D6 left count/ordering open. **Recommendation:** cap at **6**, athlete-reorderable, kept distinct from L-12 Featured (max 3). *Conflict: none; sets a deferred wireframe value.*
- **§12-B — Pinnable set beyond Posts.** SOC-D6 phrased pinning around "any intentional **post**." This amendment pins non-Post legacy entities (Honors, rank unlocks, completions, challenge victories, PRs, accomplishments) too, consistent with SOC-D6 §150's separate "Pinned accomplishments" bullet. **Recommendation:** approve the unified eligible set (PL-D3). *Conflict: expansion of SOC-D6's wording; low risk — consistent with §150.*
- **§12-C — Squad Limited Profile.** **Recommendation:** leave S-2 §5.5.4 unchanged (top-3 featured); do **not** surface pins in the Limited Athlete Profile in V1. **Open:** whether a future squad surface should reflect pins. *Conflict: none if left unchanged.*
- **§12-D — L-1 parity.** **Recommendation:** optionally mirror the curated set above the L-1 timeline preview. **Open:** V1 vs. later. *Conflict: additive; low risk.*
- **§12-E — Reference vs snapshot on source delete.** This amendment chose **live reference + cascade-on-delete** (PL-D6), deliberately unlike the L-2 timeline snapshot. **Recommendation:** confirm cascade-remove (no orphan pin). *Conflict: none; differs from timeline by design, with stated rationale.*

**No conflict found with:** DNA §4/§10 (no fake progress / popularity / shame — reaffirmed); SOC-D2/D5/D11 (no visibility-by-relationship; no popularity surface); SOC-D13 / progression separation; P-1 §15.3 and L-12 §9 (no per-item privacy control added); L-12 Featured mechanism (independent, unchanged); the Performance Firewall (no performance number surfaced); the bottom-navigation model (no new destination — Pinned Legacy is a P-1 tier; tab count is 5 as of 2026-07-07, unrelated to this amendment).

---

## Section 13 — Validation Checklist

- [ ] PL-D1 — Pinned Legacy owns no content; correctness test holds; not a media gallery or posting system
- [ ] PL-D2 — One new tier (1B) directly below Identity Header, above chronological legacy content; existing tiers renumbered only; profile not redesigned
- [ ] PL-D3 — Eligible set = PRs, PR photos/videos, Honors, Rank unlocks, Program completions, Chapter completions, Challenge victories, major workout milestones, declared Accomplishments; comments/reactions/generic logs/routine activity/feed interactions excluded by the enum
- [ ] PL-D4 — Max 6; pin / unpin / reorder by owner; L-12 Featured (max 3) unchanged and independent
- [ ] PL-D5 — `PinnedLegacyItem` only (athleteId, targetType, targetId, order, pinnedAt); ≤6 per athlete; live reference + cascade-on-delete; no new fields on existing entities
- [ ] PL-D6 — Media-first when source has media; opening routes to the source's existing detail; no popularity numbers
- [ ] PL-D7 — Empty state = available slots or "Pin accomplishments to showcase your legacy."; no meter/shame
- [ ] PL-D8 — No new privacy control; a pin never out-scopes its source; Limited Athlete Profile unchanged
- [ ] PL-D9 — No progression effect (Rank/Legacy/Honor/Goal/chapter all zero)
- [ ] §11 reconciliation pointers identified; §12 open decisions resolved with PO before lock
- [ ] No contradiction with DNA, SOC-D2/D5/D6/D11/D13, P-1 §15.3, L-12 §7/§9/§12A, HonorInstance AD-52, S-2 §5.5.4

---

*P-1 Amendment 004 — Pinned Legacy Surface*
*Amendment to Profile-Wireframe-Spec-P1.md v1.2 → v1.3*
*June 2026*
*Authority: Social-System-Architecture-v1.0 (SOC-D2/D3/D5/D6/D7/D11/D13), Profile-Wireframe-Spec-P1 v1.2 (§2/§15/§31), L-12-Accomplishments-Management-Architecture v1.0.1 (§7/§9/§12A), HonorInstance-Architecture-v1.0 (§5 AD-52), Squad-Detail-Wireframe-Spec-S2 (§5.5.4), FORGE_LEGACY_PRODUCT_DNA (§4/§10/§11) — all LOCKED*
*Supersedes: nothing. Fulfills: the Pinned surface deferred by P-1 §31 and the count/ordering/surface detail deferred by SOC-D6.*
*Status: LOCKED (PO-approved, June 2026)*
