# Global Search Architecture v1.0

**Status:** LOCKED — V1 Architecture Freeze

This document is the governing architecture for app-wide ("Global") Search in Forge Legacy. It defines which entities are searchable, how results are filtered for privacy, how they are ranked, where they navigate, and what is permanently out of scope. It is the single source of truth implementation must satisfy — no entity, screen, or feature may introduce its own parallel search logic.

## Relationship to existing search

`Community-Discovery-and-Search-v1.0.md` (LOCKED) already governs search **within** the Communities feature — its query model, ranking tiers, and Official/User filter are the working, shipped pattern for that one entity. This document does not duplicate or re-derive that work. Wherever Communities appear as a Global Search result, this document **delegates** to Community-Discovery-and-Search-v1.0 for ranking and query behavior. Community-Discovery-and-Search-v1.0 §6 has been updated to reference this document as the now-LOCKED Global Search authority (see §15).

## Lock status

This document is **LOCKED** for the V1 Architecture Freeze. Two items were resolved by explicit PO direction during the lock pass; three items are carried forward as open, non-blocking items — the same convention other LOCKED architecture documents in this repository use (e.g., `Backend-Data-Model-Architecture-v1.0.1` §20 carries forward open questions without blocking its own lock).

| # | Item | Status |
|---|---|---|
| 1 | Entry-point affordance (how an athlete opens Global Search) | Carried forward, non-blocking — owned by a future Search wireframe spec (§14.1) |
| 2 | Program and HonorType indexable fields in `Backend-Data-Model-Architecture-v1.0.1` §14 | **Resolved** — Backend §14 amended to add `ProgramDefinition` and `HonorType` indexing requirements (§7, §14.2, §15) |
| 3 | HonorType catalog becoming browsable for the first time | **PO-confirmed at LOCK** — accepted as a net-new product surface (§14.3) |
| 4 | Program private-by-default-unless-shared assumption | Carried forward, non-blocking, low risk — confirm against `Program-Ecosystem-Architecture-v1.0.md` in a future pass (§14.4) |
| 5 | No app-wide block-user primitive | Carried forward, non-blocking — inherited gap, not introduced by this doc and not closable by it (§14.5) |
| 6 | Cross-entity sectioned-results UX | **PO-confirmed at LOCK** — accepted as the V1 display pattern (§14.6) |

---

## 0. Search-category framing

Global Search has **two logical search categories**. They share one screen and one query box, but are governed independently end-to-end — separate ranking, separate indexing strategy, separate permissions model, separate moderation posture.

- **Catalog Search** — catalogs and owned content: Exercises (FORGE + the athlete's own CUSTOM), Programs (FORGE + the athlete's own ATHLETE_CREATED/IMPORTED), and the HonorType catalog. Mostly static/cacheable. The only privacy surface is simple ownership (an athlete's own private data vs. everyone's shared FORGE catalog) — there is no cross-athlete visibility question to resolve.
- **Discovery Search** — profiles and communities: Profiles (Limited/Public view) and Communities (delegated to the existing engine). Cross-athlete by nature, requires server-side indexing, and is governed by Identity-Amendment-001's discoverability flag (surfaced and edited via P-6 Settings, but owned by Identity) and Community privacy/moderation rules.

**Governing exclusivity rule:** every searchable entity belongs to exactly one search category. An entity may never exist in both Catalog Search and Discovery Search. This is a hard architectural constraint, not a guideline — it is what keeps each category's independently-defined ranking, indexing, permissions, and moderation rules from ever needing to reconcile against each other for the same piece of data. If a future entity seems to need both categories' rules, that is a signal the entity has been mis-scoped, not a case to special-case.

Every section below is organized by category, not as one flat list, so the two categories' rules can never silently bleed into each other.

---

## 1. Search Scope

### In scope

| Search category | Entity |
|---|---|
| Catalog Search | Exercises (FORGE catalog + the searching athlete's own CUSTOM exercises) |
| Catalog Search | Programs (FORGE catalog + the searching athlete's own ATHLETE_CREATED/IMPORTED programs) |
| Catalog Search | HonorType catalog (167 types, reference data — **not** per-athlete earned instances) |
| Discovery Search | Communities (delegated to `Community-Discovery-and-Search-v1.0.md`) |
| Discovery Search | Profiles (Limited/Public view only) |

### Out of scope (V1)

| Excluded | Rationale |
|---|---|
| Squads | No public directory exists — squads are private, invite-only, with "no public directory and no join-without-invite path" (`Squads-Hub-Wireframe-Spec-S1.md`). Surfacing squads in a global index would create a discovery path the architecture deliberately does not provide. |
| Posts | Audience-gated enum `{FRIENDS, SQUAD, BOTH, COMMUNITY}` with explicitly "no public option" (SOC-D8/D9). This is not a gap to fill later — it is structurally incompatible with an always-on, cross-context search surface. |
| Legacy/Chapter items (cross-athlete) | No sharing/visibility model exists for Chapters, Memories, or Accomplishments today. Indexing private-by-default data with no permission model to filter against is unsafe by default. |
| HonorInstance records (per-athlete earned honors) | See §1A and §14.3 — excluded specifically to keep Honors out of Performance-Firewall territory. |

### Explicitly deferred, not this document's scope

In-screen search/filter **within** an athlete's own Legacy timeline (e.g., filtering one's own Accomplishments by keyword) is a smaller, local UI feature — the same shape as a `Ctrl+F` over data already on screen, not a cross-entity index. It does not belong in this architecture and should not be silently folded into Global Search's scope. If built, it is its own small spec.

---

## 1A. Never Searchable

This list exists so that no future entity is added to Global Search by omission. Each item below must **never** appear in any Global Search index or result row, regardless of search category:

| Never searchable | Rationale |
|---|---|
| Posts | Audience-gated, "no public option" (SOC-D8/D9) — see §1 |
| WorkoutSessions | Per-athlete training logs; not catalog data, not identity data |
| Challenge standings/results | Performance comparison data — confined to dedicated Consenting Competition Context surfaces only (CC-D2) |
| Performance metrics (of any kind) | Performance Firewall principle (CC-D2) — CC-D2 itself binds always-on **squad** surfaces explicitly; this document extends that same principle by architectural analogy to Global Search, since Search is likewise always-on. This is this document's own governing decision, not a literal requirement of CC-D2. |
| HonorInstances (per-athlete earned honors) | See §14.3 — open-ended cross-athlete honor lookup is structurally comparison-shaped |
| Private Chapters | No sharing model exists (§1) |
| Memories | Chapter-scoped, private by default, no sharing model exists |
| Private Accomplishments | Athlete-owned, no sharing model exists |
| Rest timer history | Per-session training data, not identity or catalog data |
| Anything else prohibited by the Performance Firewall (CC-D2) not otherwise enumerated above | Catch-all — the Firewall's binding rule governs even where this list is silent |

---

## 2. Searchable Entities & Privacy Filter Per Entity

### Catalog Search

| Entity | Privacy filter |
|---|---|
| Exercise (FORGE) | None — globally visible to every athlete. FORGE exercises are never soft-deleted. |
| Exercise (CUSTOM) | `WHERE authorId = :searchingAthleteId`. Hard rule, no exceptions, no opt-in override. Sourced from `Exercise-001-Custom-Exercise-Architecture.md`. This is an ownership filter, not a privacy *setting*. |
| Program (FORGE) | `WHERE publishedAt != null` (drafts never surfaced). Otherwise globally visible. |
| Program (ATHLETE_CREATED / IMPORTED) | `WHERE authorId = :searchingAthleteId`, pending PO confirmation against `Program-Ecosystem-Architecture-v1.0.md` (§14.4) that these are private-unless-explicitly-shared by default. Same ownership-filter shape as CUSTOM Exercise. |
| HonorType catalog | None — globally visible reference data, same posture as the FORGE Exercise/Program catalogs. |

### Discovery Search

| Entity | Privacy filter |
|---|---|
| Community | Delegated entirely to `Community-Discovery-and-Search-v1.0.md` (COM-D5): both Public and Private communities are discoverable; Private communities require approval to access the feed post-discovery. This document adds no additional filter layer. |
| Profile (Limited/Public view) | `WHERE discoverabilityFlag = true OR sharesSquadWith(:searchingAthleteId, targetAthleteId)`. The discoverability flag ("Let non-squad athletes find me in search") is owned by `Identity-Amendment-001-Username.md` §7.1 — P-6 Settings only surfaces and edits it, it does not own it. The squad-membership-always-visible rule is Identity-Amendment-001 §7.2 (explicitly not configurable). No new flag is introduced. |

---

## 3. Result Types & Display Rules

**Hard rule, applies to every entity in every category:** no field that exposes performance, comparison, or ranking data may render in a Global Search result row. CC-D2 itself binds always-on squad surfaces explicitly; this document adopts the same Performance Firewall principle by architectural extension to Global Search, another always-on surface, rather than treating CC-D2 as literally naming Search. This extension is the single most important constraint on this section.

| Entity | Fields rendered | Notes |
|---|---|---|
| Exercise | name, category, equipment tag(s), environment tag(s), difficulty (prescriptive label, not comparative — see note) | |
| Program | name, category, level, environment, duration (weeks), FORGE/Official badge if applicable, workoutsPerWeek, goalAlignment tags | Structural/descriptive fields only — never enrollment count or any popularity signal |
| HonorType | name, category, icon/badge art | Reference-data fields only — no "earned by N athletes" count, no rarity stat |
| Community | name, category, Official/User badge (per `Community-Discovery-and-Search-v1.0.md` §4.3 row format) | `memberCount` is **not** shown in the Global Search result row, even though it is an in-tier sort signal inside the native Community Hub — suppressed here to avoid the global surface reading as leaderboard-adjacent |
| Profile (Limited) | photo, display name, athlete type, rank name **without sub-tier**, forging since, top 3 accomplishments | Exact field set from `Squad-Detail-Wireframe-Spec-S2.md` §5.5 — nothing more. No rank sub-tier, no workout/performance metric, no squad-internal data. |

**Difficulty field note:** Exercise `difficulty` (Beginner/Intermediate/Advanced) is a prescriptive label describing the exercise, not a comparison between athletes — it is kept, but is flagged as a judgment call the PO should confirm doesn't read as "performance" in this context.

**Grouped, not intermixed, display pattern:** within Catalog Search, results render under separate sub-headers rather than blending FORGE and athlete-owned results into one undifferentiated list:
- **"Forge Exercises"** / **"My Custom Exercises"**
- **"Forge Programs"** / **"My Programs"**

This is a display grouping only — it changes no ownership or privacy rule defined in §2. The same grouped-not-intermixed pattern should be applied anywhere else it improves clarity as the doc is implemented, without altering any underlying rule.

---

## 4. Query Behavior

The Community search query model (Name / Category / Keywords / Description, per `Community-Discovery-and-Search-v1.0.md` CDS-D3) is reused as the canonical app-wide query pattern for **Catalog Search**:

| Entity | Query maps to |
|---|---|
| Exercise | Name, Category, equipment (as keyword-equivalent) |
| Program | Name, Category, goalAlignment (as keyword-equivalent) |
| HonorType | Name, Category |

**Discovery Search** does not force every entity into that same shape — it reuses each entity's own existing, working query model instead:
- **Profile** reuses `Identity-Amendment-001-Username.md`'s Display Name + `@username` model verbatim (including the `@` prefix power-user convention) — a person is a fundamentally different kind of entity than a catalog item.
- **Community** reuses CDS-D3's own query model unchanged.

**Match types** (consistent across all entities):
- Partial/substring match on Name is the baseline.
- **Fuzzy matching is explicitly out of V1.** No locked precedent anywhere in the repo uses fuzzy/typo-tolerant matching — both Community and Identity search are exact/substring. This document excludes it explicitly rather than leaving it ambiguous.

**Empty-query behavior — a deliberate category-level asymmetry, stated explicitly rather than left implicit:**
- **Discovery Search** (Communities, Profiles): empty query → no results. This matches the existing "no recommendation/discovery system" posture (Identity-Amendment-001 §4.4) — these are cross-athlete entities and the architecture deliberately does not surface a passive browse/recommend list of other athletes or communities.
- **Catalog Search** (Exercise, Program, HonorType): empty query → may show a default alphabetical listing. This is local, athlete-owned or shared-static data the athlete already has full visibility into elsewhere in the app (Exercise Library, Program Catalog) — the "no recommendations" constraint that governs Discovery Search does not apply the same way here.

**No-results state:** model on the existing `Identity-Amendment-001` §4.5 / `Community-Discovery-and-Search-v1.0` CDS-D3 §4.4 pattern — calm, non-error copy, offering a relevant next action only where one exists (e.g., "Create a Community" for Communities; no equivalent CTA for Exercises/Programs/HonorType, since athletes don't author the FORGE catalogs).

---

## 5. Ranking Rules

No entity type, in either search category, uses a performance, engagement, or popularity-of-athlete metric. This follows the Performance Firewall principle (CC-D2) — extended here to Global Search by architectural analogy, since CC-D2 itself governs always-on squad surfaces, not Search — and the existing CDS-D3 objective-sort precedent.

### Catalog Search

Tiered relevance for Exercise, Program, and HonorType: 1) exact name match → 2) name prefix/substring → 3) category/tag match. Alphabetical within each tier. Programs are **not** ranked by enrollment count or any popularity signal — no such signal exists or should be introduced.

### Discovery Search

- **Community**: fully delegated to `Community-Discovery-and-Search-v1.0.md` CDS-D3's five-tier ranking model, reused verbatim, not reimplemented.
- **Profile**: delegated to `Identity-Amendment-001-Username.md` §4.2 — squad members first, then non-squad (subject to the discoverability flag), exact-before-partial within tier.

### Cross-entity merge (the "Global" part)

When a query returns results across multiple entity types simultaneously, results are **grouped/sectioned by entity type** (and within Catalog Search, further grouped per §3's Forge/Mine pattern) — never interleaved into one cross-entity relevance-ranked list. Interleaving would require inventing a cross-entity relevance score that does not exist today and risks reading as an engagement-optimized feed. Sectioning sidesteps that entirely and is the lower-risk, more honest UI. This is the one genuinely novel UX decision in this document (Community search never needed it — it has only one entity type) and is flagged in §14.6 for explicit PO sign-off.

---

## 6. Permissions / Privacy Filtering

This is the most important section in the document. All filters below are evaluated **server-side**, before any result reaches the client — never as a client-side post-filter over a fully-shipped, unfiltered dataset.

### Catalog Search filters

1. **Exercise (CUSTOM):** `WHERE authorId = :searchingAthleteId`. No exceptions, no opt-in override — sourced from `Exercise-001-Custom-Exercise-Architecture.md`.
2. **Program (ATHLETE_CREATED / IMPORTED):** `WHERE authorId = :searchingAthleteId` (pending the §14.4 confirmation). Same ownership-filter shape as Exercise.
3. **Exercise (FORGE), Program (FORGE), HonorType catalog:** no filter — globally visible by design, identical to today's browse experience.

### Discovery Search filters

4. **Community:** delegate entirely to COM-D5 — this document adds no additional filter layer.
5. **Profile:** `WHERE discoverabilityFlag = true OR sharesSquadWith(:searchingAthleteId, targetAthleteId)`. Direct reuse of the existing rule — the flag is owned by Identity-Amendment-001 §7.1; P-6 Settings is only the surface that displays and edits it.

The two search categories' permission models must never be described as one merged ruleset — keeping them separate is what the §0 exclusivity rule protects.

---

## 7. Indexing Requirements

### Catalog Search — client-filterable

| Entity | Strategy | Why |
|---|---|---|
| Exercise (FORGE) | Cache full catalog locally, filter client-side | Small, static, no per-athlete variance |
| Exercise (CUSTOM) | Client-side, scoped to the athlete's own cached set | Small per-athlete dataset, owned locally |
| Program (FORGE) | Cache full catalog locally, filter client-side | Same posture as Exercise FORGE |
| Program (ATHLETE_CREATED/IMPORTED) | Client-side, athlete's own | Small per-athlete dataset |
| HonorType catalog | Client-side (bounded, ~167 entries, static) | Small, bounded, shared by every athlete |

### Discovery Search — server-side required

| Entity | Strategy | Why |
|---|---|---|
| Community | Server-side index (delegated to `Community-Discovery-and-Search-v1.0.md`'s own indexing needs) | Unbounded, cross-athlete, Trending requires server-side aggregation regardless of this document |
| Profile | Server-side index required | Cross-athlete, privacy-filtered query against a potentially large athlete base — cannot ship every athlete record to every client |

### Reconciliation with Backend-Data-Model-Architecture-v1.0.1 §14

`Backend-Data-Model-Architecture-v1.0.md` (internally versioned v1.0.1, LOCKED 2026-06-30) is the governing **implementation** authority for indexing — it ratifies the Firestore stack, defines a dedicated **Search Service** runtime component, and its §14 ("Search / Indexing Implications") already anticipates this document, flagging required indexable fields. This document is the governing **behavioral** authority (what's searchable, how it's filtered/ranked/displayed/navigated); neither document re-derives the other.

Backend §14 currently confirms indexability for: Athlete `username`/`displayName`; Exercise `name`/`category`/`movementPattern`/`equipment`; Community `name`/`category`. It does **not** yet cover two entities this document requires:

| Entity | Fields this document requires indexable | Status in Backend §14 |
|---|---|---|
| `ProgramDefinition` | `name`, `category`, `goalAlignment` | **Declared** — Backend §14 amended to add this requirement |
| `HonorType` | `name`, `category` | **Declared** — Backend §14 amended to add this requirement |

This gap has been closed via a targeted reconciliation pass on `Backend-Data-Model-Architecture-v1.0.1` §14 (see §15).

**Cross-category fan-out/merge:** a single Global Search query must, for the server-backed cases, fan out to (at minimum) the Community search engine and a Profile search service, while the client-filtered Catalog Search cases resolve locally and merge into the same result view. Catalog Search sections render immediately from local data; Discovery Search sections fill in from the server. This fan-out/merge behavior — which calls happen, in what order, how partial failure is handled — is a logical requirement this document must state even though no concrete service implementation has been built yet (§8).

---

## 8. Backend / Data-Model Dependencies

`Backend-Data-Model-Architecture-v1.0.md` (internally versioned v1.0.1) is **LOCKED** (2026-06-30) and ratifies a Firestore-based stack, 12 runtime services including a dedicated **Search Service**, and canonical entity schemas for every entity this document references (`ExerciseDefinition`, `ProgramDefinition`, `HonorType`, `Community`, `Athlete`/`Profile`). Backend design is not a blocker — it is complete. This document treats it as the governing **implementation** authority, while this document itself remains the governing **behavioral** authority (scope, privacy filters, ranking, display, navigation). What remains at ~0% is application code/runtime implementation, not architecture.

The Search Service component is explicitly scoped in the Backend doc: "Indexes Athlete/Exercise/Community fields per Section 14; does not implement the still-deferred Global Search UX (Freeze row 17)." That UX is what this document defines. The two documents are complementary, not redundant — this document does not re-derive schema, and the Backend doc does not re-derive search behavior.

**Non-goal statement:** This document does not select an index technology, write an API contract, or define a service boundary — that is `Backend-Data-Model-Architecture-v1.0.1` §14 / the Search Service's responsibility. Backend §14 already flags that Global Search may require a Firestore-side Algolia/Typesense sidecar rather than relying on Firestore's native query model alone, without selecting a specific tool — this document does not select one either.

**Reconciliation complete (§7, §15):** Backend §14 has been amended to declare `ProgramDefinition` (`name`, `category`, `goalAlignment`) and `HonorType` (`name`, `category`) indexable, closing the gap this document originally introduced.

---

## 9. Offline Behavior

| Surface | Offline behavior |
|---|---|
| Exercise (FORGE + CUSTOM) | Fully functional offline if the catalog/own-exercises are cached locally — same caching assumption as Exercise Library browse (W-21) |
| Program (FORGE + own) | Fully functional offline if catalog/own-programs are cached locally |
| HonorType catalog | Fully functional offline — small, bounded, reasonable to always cache |
| Community | Degrades to a clear "search unavailable — connect to search communities" message |
| Profile | Same as Community — requires connectivity, degrades with clear messaging |
| Cross-entity merged view | Catalog Search sections (Exercise/Program/HonorType) render immediately from local data even offline; Discovery Search sections show an inline "reconnect to search Communities and Profiles" note rather than blocking the whole results screen |

---

## 10. Navigation Targets

**Governing rule:** Search always navigates to the canonical owner of an entity. It never creates alternate detail screens. Every row below is checked against this rule — search introduces no new screens, only (where necessary) new render modes on existing canonical screens.

| Result type | Destination | Notes |
|---|---|---|
| Exercise | Existing Exercise Detail (W-22) | Canonical — already used by Exercise Library |
| Program | Existing Program Detail (W-3) | Canonical |
| HonorType | Existing Honor Detail Sheet (L-11) | Canonical screen, but must support a **catalog/reference render mode** — i.e., rendering without an earned `HonorInstance` — since this is the first entry path that opens L-11 for an honor the athlete has not earned. This is a rendering-mode requirement on the existing canonical screen, not a new screen (§14.3). |
| Community | Existing Community Hub/page (COM-D7) | Canonical |
| Profile | The athlete's existing canonical Profile screen component, rendered via a routing flag (e.g. `viewMode: 'limited'`), analogous to the existing `openRankJourney: true` pattern (`Profile-Wireframe-Spec-P1.md` §5.3) | Same component, different render mode — never a separate alternate Profile screen. Must render materially different content (Limited/Public view, §3) than the athlete's own P-1. |

---

## 11. Search History / Recent Searches

Local-only, per-device, per-athlete. Stores **query strings only** — no result history, no analytics or telemetry capture, no cross-device sync. Last ~10 queries, simple list, single clear-all action. No server persistence in V1: there is no backend to sync against (§8), and storing only the athlete's own query strings locally introduces no privacy concern since nothing leaves the device.

---

## 12. Moderation / Safety Constraints

### Catalog Search

No moderation surface applies — this category is catalog/owned data, not cross-athlete content, so no ban/block rule is relevant.

### Discovery Search

- **Community bans (CRM-D4):** bans are membership-scoped, not visibility-scoped. A banned athlete can still find a community via search (consistent with COM-D5 — discoverability is independent of feed/membership access), but attempting to join hits the same existing re-join block CRM-D4 already defines. No new rule is introduced.
- **Identity discoverability opt-out (surfaced via P-6 Settings):** already covered in §2/§6 — Global Search's Profile results respect the flag exactly as username search does today. The flag is owned by Identity-Amendment-001 §7.1, not by P-6 itself. No new mechanism.
- **No app-wide block-user primitive exists.** Confirmed: no locked doc defines a general "block another athlete" feature anywhere in the repo. CRM-D4's Ban is community-scoped only; there is no Social-System-level block primitive. This is flagged explicitly rather than silently assumed solved: if/when a block feature ships, §6's Profile filter rule will need an additional `AND NOT isBlockedBy(:searchingAthleteId, targetAthleteId)` clause, but that clause cannot be written today because the underlying primitive does not exist. Global Search's privacy filtering is only as strong as the privacy primitives that exist today — this is an inherited gap, not one this document introduces (§14.5).

---

## 13. Performance Assumptions (Qualitative)

No numeric SLA is specified — no concrete service implementation has been built yet to benchmark against (§8), and inventing placeholder numbers now would only be wrong later.

- **Catalog Search** (client-filtered): should feel instant — sub-100ms perceived, since it's local filtering over a small cached set, the same expectation as any local list filter elsewhere in the app.
- **Discovery Search** (server-backed): a brief loading state is acceptable. Server-backed sections must not block Catalog Search sections from rendering — partial-results-first rendering, not all-or-nothing.

---

## 14. Open Questions / Blockers

Ranked by severity:

1. **Entry-point affordance.** No reserved entry point exists anywhere in the locked IA — every tab-root App Bar (H-1, W-2, S-1, L-1, and now the Community Hub — the 5-tab bottom navigation: Home, Workouts, Legacy, Squads, Communities; Profile is reached via the App Bar avatar, never a tab) is deliberately minimal by locked design principle, with no search icon. **Resolved by PO direction:** Global Search is a dedicated, application-level screen that sits outside the 5-tab bottom-navigation hierarchy — not nested in P-1, not added to any tab-root App Bar. This avoids amending any locked App Bar. *(Corrected 2026-07-02: this item previously read "5-tab hierarchy," which at the time incorrectly implied Profile is a bottom-navigation tab — corrected to reflect the then-confirmed 4-tab model per `Forge-Legacy-Master-PRD.md` §6 and `Onboarding-First-Time-Journey-Architecture-v1.0.md`. Corrected again 2026-07-07: Communities was promoted to a genuine 5th bottom-navigation tab, `Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md` — the hierarchy is once again 5 tabs, this time correctly. Corrected again 2026-07-08: the Workouts tab-root App Bar is now W-2 Program Browse, not W-1 — `Docs/Amendments/Workouts-Navigation-Amendment-001-Retire-Workouts-Hub.md`, which retires W-1.)* The exact tap/gesture affordance that opens this standalone screen is deferred to a future, dedicated Search wireframe spec — that spec is the immediate next downstream doc needed (§15), but its absence is not a blocker for this architecture document, which governs entity/ranking/privacy/navigation logic, not pixel-level entry UI.
2. ~~**Backend §14 did not cover Program or HonorType indexable fields.**~~ **Resolved.** `Backend-Data-Model-Architecture-v1.0.1` §14 has been amended to declare `ProgramDefinition` (`name`, `category`, `goalAlignment`) and `HonorType` (`name`, `category`) indexable, alongside the Athlete/Exercise/Community fields it already covered (§7, §15).
3. **HonorType catalog becoming browsable for the first time via search is a net-new product surface.** No Honor Catalog Browse screen exists anywhere in the locked PRD today. **PO-confirmed at LOCK:** Global Search indexes the HonorType catalog as reference data (like the FORGE Exercise/Program catalogs), explicitly excluding per-athlete `HonorInstance` records — an athlete's earned honors remain visible only via that athlete's profile, governed entirely by existing profile/privacy architecture. Search must never return "athletes who earned X." This keeps Honors out of Performance-Firewall territory while making the catalog discoverable. Genuinely new product surface area (167 types, 13 categories, with no prior existing UX), explicitly accepted as such at LOCK rather than silently introduced.
4. **Program private-by-default-unless-shared assumption.** §2 and §6 assume ATHLETE_CREATED/IMPORTED programs are private to their author unless explicitly shared. Carried forward as an open, low-risk item rather than blocking LOCK — should be confirmed against `Program-Ecosystem-Architecture-v1.0.md` in a future reconciliation pass.
5. **No app-wide block-user primitive exists** (§12). Inherited gap — Global Search's Discovery Search Profile filter is correspondingly incomplete until/unless a block-user feature ships elsewhere in the product. Documented as a known limitation, carried forward as non-blocking — this document cannot close a gap that originates outside its own authority.
6. **Cross-entity sectioned-results UX** (§5) is genuinely novel — no existing precedent in the repo for grouping cross-entity-type results in one view. **PO-confirmed at LOCK:** sectioned-by-entity-type (not interleaved) is accepted as the V1 display pattern.

---

## 15. Downstream Docs Needing Reconciliation

| Doc | Relationship | Action needed |
|---|---|---|
| `Community-Discovery-and-Search-v1.0.md` | Authority for Communities — this document delegates entirely, never duplicates | **Done.** §6 updated to reference this document as the now-LOCKED Global Search authority, rather than calling Global Search "still open" |
| `Honor-Detail-Sheet-Spec-L11.md` | Gains a new entry path from search | Confirm L-11 can render in catalog/reference mode — i.e., without an earned `HonorInstance` — per §10 |
| `Forge-Legacy-Master-Status.md` | Decision Queue tracking | **Done.** Global Search row marked complete; Decision Queue item resolved; Current Sprint, Recently Completed, and Changelog updated to reflect LOCK |
| `Forge-Legacy-Master-PRD.md` | IA section | Update once the future dedicated Search wireframe spec defines the entry-point affordance — not yet, since the entry point is deferred (§14.1) |
| `P-6-Privacy-Architecture.md` | Read-only dependency — P-6 only surfaces/edits the discoverability flag; it does not own it (owned by Identity-Amendment-001 §7.1, see row below) | No change to P-6 itself, but P-6 should get a downstream-dependents note added pointing at this document, the same pattern P-6 already uses for `WSR-001-Workout-Share-Result-Architecture.md` |
| `Exercise-Library-Architecture-v1.0.md`, `Exercise-001-Custom-Exercise-Architecture.md` | Source of truth, read-only | No change — the Exercise filter rule in §2/§6 is fully derivable from these as-is |
| `Program-Catalog-Architecture-v1.0.md`, `Program-Ecosystem-Architecture-v1.0.md` | Source of truth, read-only (pending §14.4) | No change expected, but confirm the private-by-default assumption against these explicitly before LOCK |
| `Honor-Catalog-v1.0-LOCKED.md` | Source of truth, read-only | No change — confirms the HonorType shape used in §1/§2 |
| `Squad-Detail-Wireframe-Spec-S2.md` | Source of truth, read-only | Confirms the Limited Athlete Profile field set reused verbatim in §3 |
| `Comparison-Philosophy-Amendment-001.md` (CC-D2) | Authority, read-only — CC-D2 itself binds always-on **squad** surfaces only and does not name Search | This document extends CC-D2's principle to Global Search by its own architectural decision (§1A, §3, §5, HonorInstance exclusion) — no change to `Comparison-Philosophy-Amendment-001.md` itself, and no implication that CC-D2 was amended or already governs Search |
| `Identity-Amendment-001-Username.md` | Authority — owns the discoverability flag (§7.1, consumed in §2/§6/§12) and the query/ranking precedent reused in §4/§5 | No change |
| `Backend-Data-Model-Architecture-v1.0.md` (v1.0.1, LOCKED) | Governing implementation authority — already anticipates this document via its §14 and Search Service component | **Reconciled.** §14 amended to add `ProgramDefinition` (`name`, `category`, `goalAlignment`) and `HonorType` (`name`, `category`) to its required-indexable fields, alongside the Athlete/Exercise/Community fields already there. Backend §14 still does not name this document by title within its own text — a cosmetic cross-reference, not a behavioral gap, left for a future light-touch pass if desired. |

---

## 16. Future Expansion

This is a governance checklist, not a content list. **Any future searchable entity proposed for Global Search must explicitly define all six of the following before it may participate:**

1. **Search category** — Catalog Search or Discovery Search, per the §0 exclusivity rule. Never both.
2. **Privacy model** — the enforceable filter clause, per the §6 pattern.
3. **Ranking strategy** — per the §5 pattern: no performance/popularity metric, consistent with the Performance Firewall (CC-D2).
4. **Canonical navigation target** — per the §10 rule: must resolve to an existing canonical screen, never a new one created for search.
5. **Offline behavior** — per the §9 pattern.
6. **Indexing strategy** — client-filterable vs. server-side, per the §7 pattern.

This turns §1–§10's per-entity decisions into a reusable bar so future candidates (for example, if Posts or Legacy items ever become shareable in a way that changes their privacy model) are evaluated against the same standard rather than added ad-hoc.
