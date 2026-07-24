# Forge Legacy — Community Discovery and Search
## v1.0 | June 2026

**Status:** **LOCKED** (June 2026) — subordinate architecture under `Community-System-Architecture-v1.0`. Product-owner-approved; ready for the Architecture Freeze.

**Type:** System Architecture (discovery/search/ranking layer). **This is the first dedicated search-architecture document in the repository.** It establishes a community-scoped search. The project-wide Global Search gap this document originally left open (`Forge-Legacy-Master-Status.md` Decision Queue #3) is now closed by `Global-Search-Architecture-v1.0.md` (LOCKED), which delegates to this document for Community ranking and query behavior — see §6.

**Authority:**
- `Community-System-Architecture-v1.0.md` (LOCKED) — COM-D5 (Public/Private visibility — discoverability is independent of feed access), COM-D15 (the fixed category taxonomy, owned here in full), COM-D17 (naming uniqueness, owned by the System Architecture, consumed here at search-index time).
- `Identity-Amendment-001-Username.md` (LOCKED) — §4 (Search Architecture) — the precedent for query behavior, result ranking, and empty/no-results states this document follows.
- `FORGE_LEGACY_PRODUCT_DNA.md` (LOCKED) — §10 (no recommendation algorithms / no engagement-driven distribution) — the constraint this document's §5 explicitly reconciles against the product owner's locked requirement for a "Trending" sort.

**Downstream dependents:** none yet (no Community wireframe workstream exists). A future Community Hub wireframe consumes this document directly for layout.

---

## Section 1 — Purpose & Scope

This document defines the **Community Hub** — the discovery surface where an athlete finds communities to join — and the **search architecture** beneath it: query behavior, the fixed category taxonomy, and the four browse rails (Categories, Featured, Trending, Newest).

**In scope:** the Community Hub's structure; search query/ranking behavior; the category taxonomy; Featured/Trending/Newest definitions, including the explicit reconciliation between the locked "Trending" requirement and the locked "no recommendation algorithms" exclusion.

**Out of scope:** pixel layout; the Community Page itself (`Community-System-Architecture-v1.0` COM-D7); feed content (`Community-Feed-Specification-v1.0`); cross-entity Global Search, now governed by `Global-Search-Architecture-v1.0.md` (LOCKED) — see §6.

---

## Section 2 — CDS-D1 — Community Hub Structure

**Locked.** The Community Hub contains, in this order:

1. **Search** — a query field (§4), always visible, the primary entry point for athletes who already know what they're looking for.
2. **Categories** — the fixed taxonomy (§3), browsable as a filter/grid.
3. **Featured** — Forge-curated communities (§5.1).
4. **Trending** — objectively-ranked by growth, not engagement (§5.2).
5. **Newest** — `createdAt` descending (§5.3).

Each rail (Featured/Trending/Newest) is a **bounded, horizontally-scrollable preview** with a "View All" expansion — the same preview-row pattern already locked for the Exercise Library (`Exercise-Library-Wireframe-Spec-W21` — "preview-row + View All, not tile-drill-down"), reused here rather than re-derived.

---

## Section 3 — CDS-D2 — Category Taxonomy

**Locked.** Exactly these eleven categories, owned at the data level by `Community-System-Architecture-v1.0` COM-D15 and exposed for browse/filter here:

**Strength, Hypertrophy, Cardio, Running, Combat Sports, Nutrition, Recovery, Mobility, Lifestyle, Outdoor, General.**

A community holds exactly one category. The Categories rail shows every category with a non-zero community count, sorted alphabetically (not by member count — alphabetical sort avoids accidentally building a popularity ranking into the taxonomy's own presentation).

---

## Section 4 — CDS-D3 — Search

**Locked.** Search behavior follows the existing precedent set by `Identity-Amendment-001-Username.md` §4 (athlete search) rather than inventing a new query model:

### 4.1 Query fields
A single query box matches against: **Name, Category, Keywords, Description.** ("Keywords" = an optional, athlete-authored tag list at creation time, distinct from Category — a community may be tagged `powerlifting`, `beginner-friendly`, etc., in addition to its one required Category.)

### 4.2 Filters
**Official / User** — a binary filter, applied independently of the text query, narrowing results to Official Communities only, User Communities only, or both (default: both).

### 4.3 Result ranking
1. Exact name match.
2. Name prefix/substring match.
3. Category match.
4. Keyword match.
5. Description match.

Within a tier, results are ordered by `memberCount` descending — this is the **one** place membership size acts as a sort signal, and it is a transparent, identical-for-every-viewer relevance heuristic (a community with more members is more likely to be the one the searcher meant), not a personalized or engagement-driven ranking. The Official badge is shown as metadata on the result row; it is **not** a ranking boost — Official status helps a searcher evaluate a result, it does not push User Communities down.

### 4.4 Empty / no-results states
Mirrors the existing Identity-Amendment-001 pattern: an empty query shows the Hub's default rails (§2); a query with no matches shows a no-results state offering "Create a Community" (subject to the `Community-System-Architecture-v1.0` COM-D2 creation gate) rather than a dead end.

---

## Section 5 — CDS-D4 — Featured, Trending, Newest

### 5.1 Featured
**Locked.** Forge-curated (editorial). A `featured: boolean` flag, settable only by Forge staff (the same operators who own Official Communities), with no automatic qualification rule. This is intentionally the same shape as `Featured-Legacy-Moment-Standards.md`'s editorial curation model — a human decision, not a formula.

### 5.2 Trending — reconciling "Trending" with "no recommendation algorithms"
**Locked, binding.** The product owner's locked decisions require both a **Trending** rail (§ "Discovery") and the **explicit exclusion of recommendation algorithms** (§ "Explicit V1 Exclusions"). These are not in tension once "algorithm" is defined precisely — which this section does, following the same category distinction `Calendar-System-Architecture-v1.0` CAL-D19 and `Social-System-Architecture-v1.0` SOC-D10 already draw between a **personalized, engagement-optimizing algorithm** (banned) and an **objective, identical-for-everyone sort** (permitted).

**Definition (locked):** Trending ranks communities by **net new members over the trailing 7 days**, computed identically for every viewer. This is:
- **Objective** — a single, transparent metric (membership growth), not a black-box engagement score.
- **Non-personalized** — every athlete sees the same Trending order; nothing about the *viewer* feeds the ranking.
- **Not content-engagement-based** — it never reads post likes, comments, views, or any feed-engagement signal (`Community-Feed-Specification-v1.0` CF-D4's per-feed no-algorithm rule is untouched; Trending operates only on `Community.memberCount` deltas, a structural fact, not engagement data).
- **Not algorithmic feed distribution** — Trending affects only the Hub's Trending rail order; it never reorders any individual community's feed, never decides what content an athlete sees inside a community, and never personalizes any other surface.

**Why this is the correct line:** the DNA §10 concern with "recommendation algorithms" is the same concern as with "Like systems" and "Workout feeds" — content selected *for* a specific person to maximize their engagement. A growth-rate sort answers a factual question ("which communities are gaining members right now") identically for everyone, the same way a "Newest" sort answers "which communities were created most recently." Neither is a recommendation; both are objective sorts over factual data.

### 5.3 Newest
**Locked.** `createdAt` descending. No qualification beyond existing (and, for Private communities, still publicly listed per COM-D5 — discoverability is independent of feed access).

---

## Section 6 — Relationship to Global Search

`Forge-Legacy-Master-Status.md` previously flagged **Global Search** (cross-entity: exercises, programs, honors, communities, profiles) as an open architecture gap (Decision Queue #3; Freeze row 17). That gap is now **closed**: `Global-Search-Architecture-v1.0.md` is **LOCKED** and is the governing cross-entity authority. This document remains the **community-scoped** search authority only — the two are related but distinct, and this document is not superseded:

- `Global-Search-Architecture-v1.0.md` **delegates** to this document entirely for Community ranking, query behavior, and result display whenever a Community appears in a Global Search result — it does not duplicate or re-derive this document's query-field model, ranking-tier structure, or the objective-sort/algorithm distinction in §5.2.
- This document's own scope is unchanged: it still defines only the Community Hub's in-feature search (Search + Categories + Featured + Trending + Newest). It does not implement cross-entity indexing or a unified result UI — that responsibility belongs entirely to `Global-Search-Architecture-v1.0.md`.
- The Master Status dashboard reflects this resolution: Global Search is marked complete, with this document recorded as the search/ranking precedent it reused.

---

## Non-Behaviors

- **No recommendation algorithm** — Trending is an objective growth-rate sort, not a personalized or engagement-driven ranking (§5.2).
- **No personalized search results** — ranking (§4.3) is identical for every athlete issuing the same query.
- **No ranking boost for Official status** — shown as metadata only (§4.3).
- **No category-count popularity display beyond the alphabetical Categories rail** (§3).
- **No cross-entity search implemented by this document directly** — that is `Global-Search-Architecture-v1.0.md`'s (LOCKED) responsibility; this document is consumed by it, not the reverse (§6).

---

## Validation Checklist

- [ ] CDS-D1 — Community Hub order: Search, Categories, Featured, Trending, Newest; preview-row + View All pattern (W21 precedent)
- [ ] CDS-D2 — exactly eleven categories; one per community; alphabetical Categories rail (no popularity sort)
- [ ] CDS-D3 — query fields (Name/Category/Keywords/Description); Official/User filter; five-tier ranking with `memberCount` as in-tier tiebreak only; Official badge is metadata, not a ranking boost; empty/no-results states follow Identity-Amendment-001 precedent
- [ ] CDS-D4 — Featured is editorial/human-curated; Trending is the trailing-7-day net-new-member growth rate, objective and non-personalized, explicitly distinguished from a banned recommendation algorithm; Newest is `createdAt` descending
- [ ] §6 — Global Search gap now closed by `Global-Search-Architecture-v1.0.md` (LOCKED), which delegates Community ranking/query to this document; Master Status updated to reflect the resolution
- [ ] No contradiction with Community-System-Architecture-v1.0, Identity-Amendment-001-Username, Calendar-System-Architecture-v1.0 CAL-D19, Social-System-Architecture-v1.0 SOC-D10, or Product DNA §10

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Defines the Community Hub structure (Search/Categories/Featured/Trending/Newest, CDS-D1); the eleven-category taxonomy (CDS-D2); the search query/ranking model reusing the Identity-Amendment-001 precedent (CDS-D3); Featured as editorial curation and Trending as an objective trailing-7-day membership-growth sort, with an explicit, binding reconciliation between the locked Trending requirement and the locked no-recommendation-algorithm exclusion (CDS-D4); and the explicit boundary against the project's separate, still-open Global Search gap (§6). |

---

*Forge Legacy — Community Discovery and Search*
*v1.0 — June 2026*
*Authority: Community-System-Architecture-v1.0 (LOCKED); Identity-Amendment-001-Username (LOCKED); FORGE_LEGACY_PRODUCT_DNA.md*
*Status: LOCKED (June 2026) — PO-approved; ready for the Architecture Freeze.*
