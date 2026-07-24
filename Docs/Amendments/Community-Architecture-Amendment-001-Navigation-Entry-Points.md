# Forge Legacy — Community System Architecture Amendment 001
## Navigation Entry Points — Home + Squads
### 2026-07-02

**Status:** LOCKED (stakeholder-directed; formalizes a finalized product decision)

**Type:** Architecture Amendment — names and locks the concrete navigation entry points into Communities that COM-D18 left generic; also formally confirms the 4-tab bottom-navigation model and corrects downstream documents that had drifted from it.

**Authority:** Direct stakeholder direction, 2026-07-02, previously recorded only in `Docs/Forge-Design-Blueprint-v1.0.md`. This amendment moves that decision into the official architecture.

**Amends:** `Community-System-Architecture-v1.0.md` COM-D18 (Navigation); `Home-Screen-Wireframe-Spec-H1.md` (adds Tier 6); `Squads-Hub-Wireframe-Spec-S1.md` (adds Tier 3); `Global-Search-Architecture-v1.0.md` (corrects a stray "5-tab" reference).

**Supersedes:** Nothing at the decision level — COM-D18's "not a 5th bottom-navigation tab... reached via an entry point from Home" is reaffirmed, not reversed. This amendment adds specificity (the entry point is named "Explore Communities"; a second, secondary entry point on Squads is added) and fixes two downstream documents that had drifted into implying a 5-tab / Profile-as-tab model.

---

## Purpose

`Community-System-Architecture-v1.0.md` COM-D18 locked that Communities are not a 5th bottom-navigation tab and are reached via "an entry point from Home (a 'Communities' hub card/section...)". It did not name that section, did not specify a secondary entry point, and was authored before `Home-Screen-Wireframe-Spec-H1.md` and `Squads-Hub-Wireframe-Spec-S1.md` needed to implement it concretely. Separately, an internal drift was discovered in `Home-Screen-Wireframe-Spec-H1.md` (a stray 5-tab Tab Bar table that included Profile) and in `Global-Search-Architecture-v1.0.md` (a "5-tab hierarchy" reference), both of which contradicted the 4-tab model already locked by `Forge-Legacy-Master-PRD.md` §6 and `Onboarding-First-Time-Journey-Architecture-v1.0.md`. This amendment resolves both: it names the Communities entry points concretely, and it corrects the tab-count drift.

---

## Decision 1 — Bottom navigation is confirmed as exactly 4 tabs

**Locked.** Bottom navigation is: **Home, Workouts, Legacy, Squads.** Profile is reached only via the App Bar avatar (established already at O-1/P-1/H-1 Section 4) — never a bottom-navigation tab. This was already the locked position of `Forge-Legacy-Master-PRD.md` §6 and `Onboarding-First-Time-Journey-Architecture-v1.0.md`'s explicit Non-Behavior ("No 5th nav tab"); this amendment confirms it as binding and directs the correction of any downstream document that had drifted from it (see Edit 1, Edit 3).

## Decision 2 — Home is the primary Communities discovery surface: "Explore Communities"

**Locked.** COM-D18's generic "Communities hub card/section" on Home is named: **"Explore Communities."** It is a permanent, unconditionally-present module (not gated on the athlete's own chapter/program/squad data) surfacing 2–3 recommended/trending community tiles plus a "View All →" link, both routing to the Community Hub. See Edit 1 (`Home-Screen-Wireframe-Spec-H1.md`) for the full screen-level specification.

## Decision 3 — Squads carries a secondary "Explore Communities" entry point

**Locked (new).** `Squads-Hub-Wireframe-Spec-S1.md` (S-1) gains a secondary, lower-emphasis "Explore Communities →" entry point — a single tertiary text row, not a tile row — for athletes already inside the social area of the app. It routes to the same Community Hub as Home's module. This is additive to COM-D18, which named only the Home entry point; it does not reduce Home's status as the primary discovery surface. See Edit 1b (`Squads-Hub-Wireframe-Spec-S1.md`).

## Decision 4 — The Community Hub remains a single, non-duplicated destination

**Locked.** Both entry points (Home, Squads) route to the identical Community Hub — there is no separate "Home version" or "Squads version" of it. The Community Hub itself remains architecture-only in this pass; no pixel-level wireframe is authored by this amendment (tracked as an open item, see Non-Behaviors).

---

## Edit 1 — `Home-Screen-Wireframe-Spec-H1.md`

Adds **Tier 6 — Explore Communities Module** (new Decision 13, new Section 9a) to H-1's Information Hierarchy, present unconditionally, positioned last in scroll order after the Squad Card (Tier 5). Also corrects H-1's Tab Bar table (§12.3) and Section 10 ASCII mockup, both of which had drifted to show Profile as a 5th bottom-navigation tab, contradicting Section 4 (App Bar avatar → Profile) and Decision 1 above. Full detail in H-1 v1.3, Decision 13 and Section 9a.

## Edit 1b — `Squads-Hub-Wireframe-Spec-S1.md`

Adds **Tier 3 — Explore Communities** (new Section 9a), a single "Explore Communities →" row present unconditionally in both the populated squad list and the empty state. Full detail in S-1 v1.5, Section 9a.

## Edit 2 — `Community-System-Architecture-v1.0.md` COM-D18

A pointer to this amendment is added inline at COM-D18 (see reconciliation banner in that document). COM-D18's own text is not rewritten — the "not a 5th bottom-navigation tab... reached via a Home entry point" language remains correct and is reaffirmed, with this amendment supplying the concrete naming and the Squads secondary entry point it did not originally specify.

## Edit 3 — `Global-Search-Architecture-v1.0.md`

§14 Open Question 1 corrected: "outside the 5-tab hierarchy" → "outside the 4-tab bottom-navigation hierarchy," with an inline correction note. No other content in that document is affected — Global Search's own entry-point affordance remains a separate, still-open question (unrelated to this amendment).

---

## Non-Behaviors

- No change to Communities' fundamental non-tab status — this was already locked by COM-D18 and is reaffirmed, not reopened.
- No new competition, feed, or moderation behavior — this amendment is navigation-only.
- No pixel-level Community Hub wireframe is authored by this amendment — that remains a tracked, open item (`Community-System-Architecture-v1.0.md` §15, "Community wireframes (pixel layout) — not yet authored").
- No change to any Squad-internal content, presence rule, or Performance Firewall boundary on S-1/S-2.
- No change to H-1 Tiers 1–5 content, decisions, or pixel specs.

---

## Downstream Reconciliation Ledger

| # | Document | Change | Status |
|---|---|---|---|
| 1 | `Community-System-Architecture-v1.0.md` | Pointer added at COM-D18 to this amendment | Done, this pass |
| 2 | `Home-Screen-Wireframe-Spec-H1.md` | New Tier 6 (Explore Communities); Tab Bar corrected to 4 tabs | Done, this pass (→ v1.3) |
| 3 | `Squads-Hub-Wireframe-Spec-S1.md` | New Tier 3 (Explore Communities, secondary) | Done, this pass (→ v1.5) |
| 4 | `Global-Search-Architecture-v1.0.md` | "5-tab hierarchy" corrected to "4-tab bottom-navigation hierarchy" | Done, this pass |
| 5 | `Forge-Legacy-Master-PRD.md` | §6/§19 updated to reference named Explore Communities entry points | Done, this pass |
| 6 | `Forge-Legacy-Master-Status.md` | Recently Completed + Documentation Status updated | Done, this pass |
| 7 | `Docs/Forge-Design-Blueprint-v1.0.md` | "Pending formalization" language removed; citations updated to this amendment | Done, this pass |
| 8 | Community Hub pixel wireframe | Not yet authored | Open — tracked in `Community-System-Architecture-v1.0.md` §15 |

---

## Validation Checklist

- [ ] Bottom navigation confirmed as exactly 4 tabs (Home, Workouts, Legacy, Squads); Profile confirmed as avatar-only, never a tab
- [ ] Home's Communities entry point is named "Explore Communities" and is unconditionally present
- [ ] Squads carries a secondary, lower-emphasis "Explore Communities →" entry point
- [ ] Both entry points route to the same, non-duplicated Community Hub
- [ ] COM-D18's "not a 5th tab" position is reaffirmed, not reversed
- [ ] `Home-Screen-Wireframe-Spec-H1.md` and `Global-Search-Architecture-v1.0.md`'s stray 5-tab/Profile-as-tab references are corrected
- [ ] No Squad-internal content, Performance Firewall boundary, or existing H-1 tier is altered

---

*Forge Legacy Community System Architecture Amendment 001 — Navigation Entry Points*
*2026-07-02*
*Authority: Direct stakeholder direction; supersedes no locked decision; adds specificity to `Community-System-Architecture-v1.0.md` COM-D18 and corrects tab-count drift in two downstream documents.*
