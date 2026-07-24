# Forge Legacy — Community System Architecture Amendment 002
## Communities Promoted to the 5th Bottom-Navigation Tab
### 2026-07-07

**Status:** LOCKED (stakeholder-directed)

**Type:** Architecture Amendment — reverses COM-D18's "not a 5th bottom-navigation tab" position and the navigation model formalized by `Community-Architecture-Amendment-001-Navigation-Entry-Points.md`.

**Authority:** Direct stakeholder direction, 2026-07-07.

**Amends:** `Community-System-Architecture-v1.0.md` COM-D18 (Navigation, §15.5); `Home-Screen-Wireframe-Spec-H1.md` (retires Tier 6 / Section 9a, restores the 5-tier model, corrects the Tab Bar to 5 tabs); `Squads-Hub-Wireframe-Spec-S1.md` (retires Tier 3 / Section 9a); `Component-Library-Architecture-v1.0.md` (CLA-C19 TabBar → five tabs); `Forge-Legacy-Master-PRD.md` (§6 Navigation System, §19 Information Architecture, Amendment Log); `FORGE_LEGACY_PRD.md` (equivalent sections); `Onboarding-First-Time-Journey-Architecture-v1.0.md` (Non-Behaviors); `Calendar-System-Architecture-v1.0.md` (CAL-D2 cross-references); `Legacy-Hub-Wireframe-Spec-L1.md` (tab-position line); `Global-Search-Architecture-v1.0.md` (§14 Open Question 1); `Forge-Design-Blueprint-v1.0.md` (Navigation Map, screen inventory).

**Supersedes:** `Docs/Amendments/Community-Architecture-Amendment-001-Navigation-Entry-Points.md` Decisions 1–3 (the 4-tab confirmation and the Home/Squads discovery entry points), and `Community-System-Architecture-v1.0.md` COM-D18 in full. Decision 4 of Amendment 001 (a single, non-duplicated Community Hub) is preserved in spirit — there is still exactly one Community Hub destination, now reached via its own tab instead of two discovery entry points.

---

## Purpose

`Community-Architecture-Amendment-001-Navigation-Entry-Points.md` (2026-07-02) treated Communities as an occasional discovery surface: reachable via a module on Home (primary) and a secondary row on Squads, never a bottom-navigation tab. That assumption is revised. Communities is intended to function as a **high-frequency, checked-daily surface** — a large-scale, interest-based feed carrying announcements and member posts, conceptually closer to a Facebook Group than a directory a user dips into occasionally. A discovery-module pattern under-serves a feature meant to be opened every session; a dedicated tab is the correct navigational weight for that usage pattern.

This amendment promotes Communities to the 5th bottom-navigation tab and retires the two discovery entry points introduced by Amendment 001, which become redundant once Communities has its own tab.

---

## Decision 1 — Bottom navigation is now exactly 5 tabs

**Locked.** Bottom navigation is: **Home, Workouts, Legacy, Squads, Communities** (in that order — Communities appended last, preserving the existing order of the first four). Profile remains reached only via the App Bar avatar — never a tab. This reverses Amendment 001's Decision 1 ("Bottom navigation is confirmed as exactly 4 tabs").

## Decision 2 — Communities qualifies for a tab on frequency-of-use grounds, not domain size alone

**Locked.** The original non-tab reasoning (COM-D18, mirroring `Calendar-System-Architecture-v1.0` CAL-D2 and `Social-System-Architecture-v1.0` SOC-D14) was that a bottom-nav tab is a *domain*, and Communities was not expected to be a domain the athlete lives inside day-to-day. That expectation is revised: Communities is now understood to be a habit-loop destination on par with Home, Workouts, Legacy, and Squads. This does **not** reopen Calendar's or Friends'/Social's own non-tab status — neither is being redefined as a comparably high-frequency destination; this amendment is scoped to Communities only.

## Decision 3 — Home's "Explore Communities" module (Tier 6) is retired

**Locked.** `Home-Screen-Wireframe-Spec-H1.md`'s Tier 6 (Decision 13, Section 9a — added by Amendment 001) is retired. Home reverts to its original five-tier model (Chapter Card, Active Program Card, Workout CTA, Recent Legacy Activity, Squad Card). The retired module's content is preserved in the document, marked superseded, rather than deleted outright.

## Decision 4 — Squads' secondary "Explore Communities →" entry point is retired

**Locked.** `Squads-Hub-Wireframe-Spec-S1.md`'s Tier 3 (Section 9a — added by Amendment 001) is retired for the same reason: a secondary discovery door is redundant once Communities has its own tab. S-1 reverts to its pre-Amendment-001 tier model (Squad Cards, Create a Squad CTA, Empty State). The retired row's content is preserved, marked superseded.

## Decision 5 — The Community Hub remains the single destination, now reached via its own tab

**Locked.** There is still exactly one Community Hub — no "Home version" or "Squads version" ever existed, and no per-tab duplication is introduced now. The Community Hub itself remains architecture-only in this pass; no pixel-level wireframe is authored by this amendment (same open item Amendment 001 left tracked).

---

## Edits Applied

| # | Document | Change |
|---|---|---|
| 1 | `Community-System-Architecture-v1.0.md` | COM-D18 (§15.5) rewritten: "not a 5th tab" → "is the 5th tab"; version bumped to v1.1; Change Log entry added |
| 2 | `Home-Screen-Wireframe-Spec-H1.md` | Tier 6 / Decision 13 / Section 9a marked retired (content preserved, struck through); Information Hierarchy reverts to 5 tiers; Tab Bar (§12.3), Section 10 mockup, Mobile UX spacing/tap targets (§13.3/13.4), Accessibility (§15), Navigation table (§12.2), Validation Checklist (§18), and Downstream Dependencies (§19) all updated; version bumped to v1.4 |
| 3 | `Squads-Hub-Wireframe-Spec-S1.md` | Tier 3 / Section 9a marked retired (content preserved, struck through); Information Hierarchy reverts to pre-amendment tiers; Section 3 and Section 6 mockups, Navigation Paths (§11.1), Tap Targets (§13.4), and Validation Checklist (§14) updated; version bumped to v1.6 |
| 4 | `Component-Library-Architecture-v1.0.md` | CLA-C19 TabBar: "Four tabs" → "Five tabs"; tab list gains Communities |
| 5 | `Forge-Legacy-Master-PRD.md` | §6 Navigation System: App Shell diagram, new "Tab: Communities" section, old "Communities (Cross-Cutting Entry Point)" section marked superseded, Navigation Rules updated; §19 Information Architecture: screen inventory and prose updated; new Amendment Log row (005) |
| 6 | `FORGE_LEGACY_PRD.md` | Equivalent App Shell/tab/Navigation Structure updates (this document predates the Communities subsystem entirely and was not previously reconciled — only the navigation/tab-count references were brought current in this pass; a full reconciliation against `Forge-Legacy-Master-PRD.md` remains a separate, tracked cleanup item) |
| 7 | `Onboarding-First-Time-Journey-Architecture-v1.0.md` | Non-Behaviors: "No 5th nav tab" line updated to reflect the 5-tab system |
| 8 | `Calendar-System-Architecture-v1.0.md` | CAL-D2 section, a Non-Behaviors line, and the Validation Checklist line updated from "4-tab" to "5-tab" cross-references; Calendar's own conclusion (still a surface, not a tab) is unchanged; Change Log v1.0.1 entry added |
| 9 | `Legacy-Hub-Wireframe-Spec-L1.md` | Tab-position line updated from "3rd of 4" to "3rd of 5" bottom-navigation tabs |
| 10 | `Global-Search-Architecture-v1.0.md` | §14 Open Question 1: "4-tab bottom-navigation hierarchy" → "5-tab bottom-navigation hierarchy" (correct this time, not drift) |
| 11 | `Forge-Design-Blueprint-v1.0.md` | Revision Log v1.4 entry; Primary product pillars, Navigation Map (§3), screen inventory tables (§4) updated; new "Formalized 2026-07-07" section added |

---

## Non-Behaviors

- No change to any Community content, feed, discovery, roles, or moderation rule — this amendment is navigation-only (COM-D1–D17, D19 unaffected).
- No change to Calendar's or Friends'/Social's own non-tab status — CAL-D2 and SOC-D14 are not reopened; only their cross-references to the tab count are updated.
- No change to Squad-internal content, presence rules, or Performance Firewall boundaries on S-1/S-2.
- No pixel-level Community Hub wireframe is authored by this amendment — still tracked as an open item.
- No retroactive deletion of Amendment 001's content — the retired Tier 6 (H-1) and Tier 3 (S-1) sections are preserved in their respective documents, marked superseded, per this project's established convention for revised decisions.

---

## Downstream Reconciliation Ledger

| # | Document | Change | Status |
|---|---|---|---|
| 1 | `Community-System-Architecture-v1.0.md` | COM-D18 reversed; v1.1 | Done, this pass |
| 2 | `Home-Screen-Wireframe-Spec-H1.md` | Tier 6 retired; 5-tier model restored; Tab Bar → 5 tabs; v1.4 | Done, this pass |
| 3 | `Squads-Hub-Wireframe-Spec-S1.md` | Tier 3 retired; v1.6 | Done, this pass |
| 4 | `Component-Library-Architecture-v1.0.md` | CLA-C19 → five tabs | Done, this pass |
| 5 | `Forge-Legacy-Master-PRD.md` | §6/§19 updated; Amendment Log row 005 | Done, this pass |
| 6 | `FORGE_LEGACY_PRD.md` | Navigation references updated (partial reconciliation — see item 6 in Edits table) | Done, this pass |
| 7 | `Onboarding-First-Time-Journey-Architecture-v1.0.md` | Non-Behavior updated | Done, this pass |
| 8 | `Calendar-System-Architecture-v1.0.md` | CAL-D2 cross-references updated; v1.0.1 | Done, this pass |
| 9 | `Legacy-Hub-Wireframe-Spec-L1.md` | Tab-position line updated | Done, this pass |
| 10 | `Global-Search-Architecture-v1.0.md` | §14 Open Question 1 updated | Done, this pass |
| 11 | `Forge-Design-Blueprint-v1.0.md` | Navigation Map, screen inventory updated; v1.4 | Done, this pass |
| 12 | `Forge-Legacy-Master-Status.md` | Dashboard, Architecture Freeze row 11/20 notes, Recently Completed | Done, this pass |
| 13 | Community Hub pixel wireframe | Not yet authored | Open — tracked in `Community-System-Architecture-v1.0.md` §15 |
| 14 | Communities screen count in PRD screen inventories | TBD — no wireframe authored yet, so screen count cannot be finalized | Open |

---

## Validation Checklist

- [ ] Bottom navigation confirmed as exactly 5 tabs (Home, Workouts, Legacy, Squads, Communities); Profile confirmed as avatar-only, never a tab
- [ ] `Community-System-Architecture-v1.0.md` COM-D18 rewritten to lock the 5-tab model
- [ ] `Home-Screen-Wireframe-Spec-H1.md` Tier 6 / Decision 13 / Section 9a retired; document reverts to 5-tier model; Tab Bar shows 5 tabs
- [ ] `Squads-Hub-Wireframe-Spec-S1.md` Tier 3 / Section 9a retired; document reverts to pre-Amendment-001 tier model
- [ ] `Component-Library-Architecture-v1.0.md` CLA-C19 TabBar updated to five tabs
- [ ] Master PRD (`Forge-Legacy-Master-PRD.md` and `FORGE_LEGACY_PRD.md`) navigation sections and screen inventories updated
- [ ] Onboarding, Calendar, Legacy L-1, Global Search, and Design Blueprint cross-references to tab count updated
- [ ] No Community content/feed/discovery/roles/moderation rule altered
- [ ] No Calendar or Social/Friends non-tab decision reopened
- [ ] No Squad-internal content or Firewall boundary altered
- [ ] Retired sections preserved as historical record (struck through / marked superseded), not deleted

---

*Forge Legacy Community System Architecture Amendment 002 — Fifth Tab*
*2026-07-07*
*Authority: Direct stakeholder direction; supersedes `Community-Architecture-Amendment-001-Navigation-Entry-Points.md` Decisions 1–3 and `Community-System-Architecture-v1.0.md` COM-D18 in full.*
