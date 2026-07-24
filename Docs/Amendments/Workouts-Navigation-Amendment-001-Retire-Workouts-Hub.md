# Forge Legacy — Workouts Navigation Amendment 001
## Retire the W-1 Workouts Hub — Workouts Tab Root Becomes W-2 Program Browse
### 2026-07-08

**Status:** LOCKED (stakeholder-directed)

**Type:** Architecture Amendment (retires one wireframe spec as a navigational dispatch screen; retargets the Workouts tab's root destination; no change to tab count, tab order, or any other tab's root screen)

**Authority:** Direct stakeholder direction, 2026-07-08.

**Amends:** `Workouts-Hub-Wireframe-Spec-W1.md` (retired in full); `Program-Browse-Wireframe-Spec-W2.md` (becomes the Workouts tab root); `Home-Screen-Wireframe-Spec-H1.md` (cross-references corrected, Risk 1 resolved); `Forge-Legacy-Master-PRD.md` §5/§6/§8/§17/§19 + Amendment Log; `Global-Search-Architecture-v1.0.md` §14; `Calendar-System-Architecture-v1.0.md` CAL-D2; `Architecture-Amendment-001-Import.md` (pointer note); `Forge-Design-Blueprint-v1.0.md` §3/§4/§5/§6/§9/§13/§18 + Revision Log; `Forge-Legacy-Master-Status.md`.

**Supersedes:** `Workouts-Hub-Wireframe-Spec-W1.md` in its entirety as a navigational destination. No other locked decision (tab count, tab order, Program-Architecture-Amendment-001's active-program rule, Calendar-System-Architecture's aggregation-only model) is reopened.

---

## Purpose

Home (H-1) already carries the primary daily "what should I train today?" launchpad: a Chapter Card for context, an Active Program Card that surfaces the next prescribed workout, and a Workout CTA that launches logging directly (H-1 §7, routing straight to W-8 Activity Type Picker — not through W-1). Given that, a separate Workouts-tab dispatch screen whose entire job was to re-surface the same chapter context, the same next-session prompt, and a quick-start shortcut is redundant. The Workouts tab root now opens directly to W-2 Program Browse. Workout logging is launched from Home's CTA and from a program's next-session action — not from a dedicated landing screen in between.

---

## WNA-D1 — W-1 Workouts Hub is retired

**Locked.** `Workouts-Hub-Wireframe-Spec-W1.md` is retired in full. It is no longer a live navigational destination anywhere in the product. The document itself is marked SUPERSEDED/RETIRED and preserved in place (not deleted) as historical record, pointing to this amendment.

## WNA-D2 — Workouts tab root becomes W-2 Program Browse

**Locked.** Tapping the Workouts tab now opens `Program-Browse-Wireframe-Spec-W2.md` directly. This is a like-for-like swap of the tab's root screen only:

| | Before | After |
|---|---|---|
| Tab 2 root | W-1 Workouts Hub | W-2 Program Browse |
| Tab count | 5 | 5 (unchanged) |
| Tab order | Home, Workouts, Legacy, Squads, Communities | Home, Workouts, Legacy, Squads, Communities (unchanged) |
| Other tab roots | H-1, L-1, S-1, Community Hub | H-1, L-1, S-1, Community Hub (unchanged) |

W-2 was previously reached only by push (from W-1's Program section, from W-17 after graduation, or from M-4). It now has two entry contexts — see WNA-D4.

## WNA-D3 — Responsibility reassignment: no new sections are built

**Locked, binding.** W-1's four stated goals (confirm chapter context, start a workout, continue a program, manage partner activity) and its five content tiers (Chapter Context Card, Log Activity Entry Point, Programs Section, Workout With Friend Section, Recent Workouts Section) are not recreated as a group anywhere else. Two of the four goals were already fully served elsewhere before this amendment and simply lose their duplicate surface:

| W-1 responsibility | Already covered by | Notes |
|---|---|---|
| Confirm chapter context | H-1 Chapter Card (Tier 1) | H-1's Chapter Card already shows chapter name, primary goal, and progress — the same information W-1's Chapter Context Card showed. |
| Quick-start a workout | H-1 Workout CTA (Tier 3) | H-1's "Start Workout" / "Continue Program" CTA already routes directly to W-8 Activity Type Picker — it never routed through W-1. No routing change was required here. |
| See the next prescribed session | H-1 Active Program Card (Tier 2); W-2 Active Program section; W-3 Program Detail | H-1's Active Program Card and W-2's Active Program section both already surface "Next: [Workout Name]." Tapping either routes to W-3, where "Start Next Workout" lives. |
| Recent workouts at a glance | H-1 Recent Legacy Activity (Tier 4) | Covers qualifying milestone events within a 7-day window. This is a narrower signal than W-1's plain "last 2–3 workouts" list — see WNA-D5 for the one acknowledged gap this leaves. |

**Binding rule:** no downstream edit made by this amendment adds a new chapter-context card, quick-select chip row, or recent-workouts list to W-2. W-2's own existing Active Program section (Tier 1) already covers the program-following flow; it is not expanded to imitate W-1's layout.

## WNA-D4 — W-2 is now a dual-entry screen: tab root and pushed destination

**Locked.** W-2 is reached two ways, each with different chrome:

| Entry context | Top App Bar | Tab Bar |
|---|---|---|
| Workouts tab tap (root) | No back button — same convention as H-1, L-1, S-1 | Visible, Workouts tab active |
| Pushed from W-17 (post-graduation) or M-4 (Program Graduation Modal) | Back button present, returns to the entering screen | Visible, Workouts tab active |

This is the same conditional-chrome pattern already implied by the Master PRD's Navigation Rules ("Tab root screens replace on tap; each tab maintains its own independent navigation stack") — a screen that is sometimes a tab root and sometimes a pushed stack screen is not a new pattern this amendment invents, it is the direct consequence of W-2 taking over W-1's root position while keeping its existing push entry points from W-17 and M-4.

## WNA-D5 — Two W-1 features have no reassigned home (acknowledged, not silently dropped)

**Acknowledged gap.** Two pieces of W-1 content are not named in WNA-D3's reassignment table and are not given a new home by this amendment:

1. **Workout With Friend management queue** (W-1 §7 — Claim/Dismiss/Approve/Decline for pending M-8/M-9 partner-tag items). W-1 was the only specced surface where an athlete resolved these. Retiring W-1 removes that surface without replacing it.
2. **"Import Training" Secondary CTA** (W-1 §5.4, added by `Architecture-Amendment-001-Import.md`) — the entry point into W-IM-1 Import Upload from the Workouts tab.

Neither is dropped as a product capability — both need a new surface, and this amendment deliberately does not invent one, consistent with this project's standing practice of naming a gap rather than silently resolving it by improvisation. Candidate homes (H-1, W-2, or a notification-only surface for item 1; W-2 or H-1 for item 2) are noted for a future amendment, not decided here. See `Forge-Legacy-Master-Status.md` Decision Queue for tracking.

## WNA-D6 — Calendar's forward-looking entry point retargets to W-2

**Locked.** `Calendar-System-Architecture-v1.0` CAL-D2 names "a calendar affordance in the Workouts Hub (W-1) header" as the Calendar's primary forward-looking entry point. Since W-1 no longer exists, this affordance moves to the Workouts tab's new root screen — W-2's header. This is a mechanical substitution of which screen's header carries the affordance; it changes nothing about the Calendar's own architecture (CAL-D1/D3/D4 unaffected), and nothing about what the affordance does once tapped.

---

## Edits Applied

| # | Document | Change | Version |
|---|---|---|---|
| 1 | `Workouts-Hub-Wireframe-Spec-W1.md` | Marked SUPERSEDED/RETIRED at the top of the document; content preserved as historical record, not deleted | v1.1 → **RETIRED** (content unchanged) |
| 2 | `Program-Browse-Wireframe-Spec-W2.md` | "Entered from" list updated (Workouts tab root replaces W-1); §12 Navigation "Back" row made conditional; §13.1 Screen Type updated for dual entry context (WNA-D4) | v1.1 → **v1.2** |
| 3 | `Home-Screen-Wireframe-Spec-H1.md` | Authority list, §9/§12.2/§12.3/§12.4 tab and nav references corrected from W-1 to W-2; Risk 1 (H-1/W-1 CTA redundancy) marked resolved | v1.4 → **v1.5** |
| 4 | `Forge-Legacy-Master-PRD.md` | §5 Workouts bullet; §6 Tab: Workouts (new tab-root note) + Calendar pointer (W-1 → W-2 header); §8 Import entry points; §17 M-7 trigger list; §19 screen inventory count + Expo Router file-tree comment; new Amendment Log row 006 | No document-level version field (tracked via Amendment Log) |
| 5 | `Global-Search-Architecture-v1.0.md` | §14 Open Question 1 tab-root App Bar list corrected (W-1 → W-2) | Inline correction, no version field in this document |
| 6 | `Calendar-System-Architecture-v1.0.md` | CAL-D2 entry-points list and Validation Checklist line corrected (W-1 header → W-2 header) per WNA-D6 | v1.0.1 → **v1.0.2** |
| 7 | `Architecture-Amendment-001-Import.md` | Pointer note added at the top: W-1's "Import Training" entry point is retired with W-1; its replacement surface is WNA-D5's acknowledged open item, not resolved here. Flow/architecture-impact sections describing W-1 are left intact as historical record. | Pointer note added, no version bump (historical amendment record) |
| 8 | `Forge-Design-Blueprint-v1.0.md` | §3 Navigation Map (Calendar entry point), §4 Screen Inventory (W-1 row dropped), §5 User Flows (program discovery flow), §6 Component Usage Rules (Smart Omission example), §9 Workout System (Smart Omission example), §13 Charts table (Program progress bar row), §18 Source Document Index; new Revision Log entry | v1.4 → **v1.5** |
| 9 | `Forge-Legacy-Master-Status.md` | Recently Completed entry added; two WNA-D5 open items added to Decision Queue / Unresolved Documentation Gaps | Inline update, no version field |

---

## Non-Behaviors

- **No change to tab count or tab order** — still 5 tabs: Home, Workouts, Legacy, Squads, Communities.
- **No change to any other tab's root screen** — H-1, L-1, S-1, and Community Hub are unaffected.
- **No new content tier built on H-1 or W-2** — WNA-D3 is a binding reassignment-without-recreation rule, not an invitation to expand either screen.
- **No change to W-2's existing content, tiers, or program-management rules** (`Program-Architecture-Amendment-001`) beyond the entry-context and back-button edits in WNA-D4.
- **No resolution of the Workout With Friend management queue or Import Training entry-point relocation** — both are explicitly named open items (WNA-D5), not silently dropped and not silently invented a home.
- **No change to the Calendar's aggregation-only data model or write-primitive scope** — WNA-D6 only moves which screen's header carries the entry affordance.

---

## Validation Checklist

- [ ] WNA-D1 — W-1 marked SUPERSEDED/RETIRED, content preserved, points to this amendment
- [ ] WNA-D2 — Workouts tab root is W-2; tab count (5) and order unchanged; no other tab root changed
- [ ] WNA-D3 — reassignment table complete; binding no-recreation rule stated for H-1 and W-2
- [ ] WNA-D4 — W-2's dual entry context (tab root vs. pushed) and conditional back button specified
- [ ] WNA-D5 — Workout With Friend management queue and Import Training entry point both named as open items, not silently resolved or dropped
- [ ] WNA-D6 — Calendar CAL-D2 entry point retargeted from W-1 header to W-2 header; no other Calendar decision touched
- [ ] All 9 downstream documents in "Edits Applied" updated and version-bumped where applicable
- [ ] No contradiction with Program-Architecture-Amendment-001, Calendar-System-Architecture-v1.0, or the 5-tab navigation model

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-08 | Initial. Retires W-1 Workouts Hub as a navigational destination; the Workouts tab root becomes W-2 Program Browse (WNA-D1/D2). W-1's chapter-context, quick-start, and next-session responsibilities are confirmed already covered by H-1's existing tiers and W-2's existing Active Program section — no new section is built to imitate W-1 (WNA-D3). W-2 gains a dual entry context (tab root vs. pushed from W-17/M-4) with conditional back-button chrome (WNA-D4). Two W-1 features — the Workout With Friend management queue and the Import Training entry point — are explicitly acknowledged as not having a reassigned home; this is named as an open item, not silently resolved (WNA-D5). The Calendar's forward-looking entry-point affordance moves from W-1's header to W-2's header, a mechanical substitution with no change to Calendar's own architecture (WNA-D6). |

---

*Forge Legacy — Workouts Navigation Amendment 001 (Retire the W-1 Workouts Hub)*
*2026-07-08*
*Authority: Direct stakeholder direction. Amends `Workouts-Hub-Wireframe-Spec-W1.md` (retired), `Program-Browse-Wireframe-Spec-W2.md`, `Home-Screen-Wireframe-Spec-H1.md`, `Forge-Legacy-Master-PRD.md`, `Global-Search-Architecture-v1.0.md`, `Calendar-System-Architecture-v1.0.md`, `Architecture-Amendment-001-Import.md`, `Forge-Design-Blueprint-v1.0.md`, `Forge-Legacy-Master-Status.md`.*
