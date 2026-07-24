# Honors Catalog Expansion — Pass 5 (Consistency)

## v1.0 | June 2026

**Status:** AUTHORING PASS — no Honor Architecture, Honor Evaluation Service, Rank, Goals, Progress, or Activity History redesign performed. This pass authors a Consistency honor family, the fifth in the catalog series and the first to draw on a statistic this pass identifies as already existing in Rank, not in the Honor Evaluation Service's own counters.

**Type:** Catalog Expansion Pass (fifth in the series — follows `Honors-Catalog-Expansion-Pass-1.md` through `-4.md`)

**Predecessors:** `Honor-Catalog-v1.0-LOCKED.md`, `Honors-Expansion-Plan-v1.0.md`, `Honors-Expansion-Plan-Pre-Authoring-Audit.md`, `Honors-Taxonomy-Reconciliation-v1.0.md`, `Honors-Catalog-Expansion-Pass-3-Endurance.md`, `Honors-Catalog-Expansion-Pass-4-Lifetime-Endurance.md`.

**Read in full for this pass:** all documents above, plus `Rank-Computation-Model.md`, `Honor-Evaluation-Service-Architecture-v1.0.md`, `FORGE_LEGACY_PRODUCT_DNA.md`, `P-2-Progress-Hub-Architecture.md`.

---

## Section 1 — Audit

### 1.1 What the prior Consistency findings established

`Honors-Taxonomy-Reconciliation-v1.0.md` §[Family Verdicts] gave Consistency a **Reserve** verdict: "No existing statistics track streaks/frequency (ES §9.1's six counters don't include one). Directly adjacent to Product DNA's 'not a streak app' identity and the explicitly-prohibited 'streak pressure systems' (§10) — permitted only 'with formal architecture review,' which has not happened." `Honors-Expansion-Plan-Pre-Authoring-Audit.md` §4 sharpened this into a specific design instruction rather than an outright ban: "design them so the underlying counters can only ever produce positive, retrospective honors (e.g., 'Trained in 50 of the last 52 weeks' computed and awarded after the fact) rather than any live-tracked, breakable counter," and explicitly required running the Product DNA decision test before authoring.

| Finding | Status carried into this pass |
|---|---|
| Streak honors (current-streak state, "days since last workout") | **Rejected**, unchanged. Confirmed again by this task's own framing. |
| Consecutive-day or consecutive-week tracking | **Rejected**, unchanged. Any mechanism requiring "unbroken" sequences is out of scope. |
| Cumulative, retrospective consistency honors | **Approved**, per this task's framing — the design path the Pre-Authoring Audit recommended but did not itself execute. |
| Product DNA decision test | **Required before authoring, not yet run.** Run explicitly in Section 1.3 below — the step the Pre-Authoring Audit named but left undone. |

### 1.2 A finding this pass adds: the blocked statistic exists, just not where the prior audit looked

The Taxonomy Reconciliation's "no existing statistics track streaks/frequency" check looked specifically at the Honor Evaluation Service's six counters (`workoutCount`, `hoursForged`, `chaptersSealed`, `goalsAchieved`, `programsGraduated`, `workoutsWithFriend`) and correctly found none of them measures frequency. But `Rank-Computation-Model.md` independently defines and already uses exactly this kind of statistic, for its own Training Consistency category:

- **TBD-6 (locked):** "Active Week = a calendar week (Monday through Sunday) containing at least one session that qualifies as meaningful work." Type-blind, retrospective, and — critically — a week's status, once past, never changes. There is no mechanism by which an already-credited Active Week is later revoked.
- **§13.10 (locked):** RCM names a **"total cumulative active weeks"** counter, explicitly distinct from the separate, family-resetting "active weeks within family" counter used for Rank's own sub-tier progression: "Must track family entry date per athlete and compute active weeks since that date as a specific counter distinct from total cumulative active weeks (which feeds family promotion thresholds in Section 14). These are two different accumulation counters that share the active week definition."

This is the same kind of finding `Honors-Catalog-Expansion-Pass-3-Endurance.md` §1.2 made about the Reserved Categories blocker: the original "no statistics exist" finding was accurate for the system it checked, but a different, already-locked system (here, RCM; there, the session/`ActivityType` layer) had independently built the missing concept for its own reasons. **Unlike Pass 3's finding, this one is not fully resolved by this pass** — RCM's cumulative active-week count lives in RCM's own storage, not in the Honor Evaluation Service's Athlete Statistics Record. This is the same shape of cross-system gap already named, and left open, for Rank's `bestPace` value (`Honors-Catalog-Expansion-Pass-3-Endurance.md` §2/§6). Section 7 names this explicitly as a small, real prerequisite this pass does not build.

### 1.3 Product DNA decision test, run explicitly

Applied to a design built entirely on cumulative, never-revocable, retrospective Active Week counts — no current streak, no "days since," no reset, no comparison:

| Question (`FORGE_LEGACY_PRODUCT_DNA.md` §11) | Result |
|---|---|
| 1. Does this strengthen the athlete's story? | **Pass.** "I have shown up consistently for years" is a real part of an athlete's story. |
| 2. Does this strengthen long-term transformation? | **Pass.** Consistency over years is the mechanism of transformation, not a vanity count. |
| 3. Does this strengthen identity? | **Pass.** "Someone who shows up" is an identity claim, not a performance claim. |
| 4. Does this strengthen legacy? | **Pass.** A multi-year cumulative consistency record is exactly Legacy First's subject matter. |
| 5. Does this avoid comparison? | **Pass.** Purely personal, cumulative, never ranked against other athletes. |
| 6. Does this avoid shame? | **Pass — by design, not by accident.** Because the count only ever goes up and a missed week simply never gets credited (it is never "lost," because it was never held), there is no failure state to display, no broken-streak language, and nothing resembling the explicitly prohibited "'Days since workout' shame mechanics" or "Streak pressure systems" (`FORGE_LEGACY_PRODUCT_DNA.md` §10). |
| 7. Does this fit a premium, timeless product? | **Pass.** A quiet, cumulative record of showing up is closer to a keepsake than a scoreboard. |

**This formally clears the gate the Pre-Authoring Audit required before any authoring.** The design that passes is specifically the cumulative, retrospective one — a live-streak design would fail Question 6 outright, which is exactly why it remains rejected (Section 1.1).

### 1.4 Category placement

Per `Honors-Expansion-Plan-v1.0.md`'s own mapping table, Consistency (once cleared) was always slated to land under the existing **Training** category, sharing `TrainingEvaluator`'s pattern — not a new category, and not Endurance. This is also the architecturally correct placement on independent grounds: RCM's Training Consistency is deliberately type-blind (D-RCM-4) — it counts a session of any of the nine canonical activity types equally. A Consistency Honors family must inherit that same type-blindness to remain consistent with the system whose definition it borrows; it does not belong inside the Endurance category Pass 3 created.

---

## Section 2 — Consistency Framework

| Candidate | Verdict | Rationale |
|---|---|---|
| **Active Weeks** | **Belongs — the primary measurement.** | The one genuinely atomic unit. RCM's own TBD-6 defines Active Week directly; Active Month is explicitly derived from it ("a function of Active Week density within the month," not an independent definition). Using the atomic unit as the honor's measurement is the simplest, most defensible choice. |
| **Active Months** | **Rejected as a separate family.** | RCM itself does not treat Active Month as an independent measurement — it is "a function of Active Week density," a derived view over the same underlying weeks. A separate cumulative "Active Months" honor ladder running alongside a cumulative "Active Weeks" ladder would, for almost every athlete, recognize the same underlying consistency twice — the same "two honors, one achievement" redundancy this catalog has already rejected twice (Pass 3's Duration vs. Distance; Pass 4's session-count vs. distance). |
| **Active Years** | **Belongs, but as a framing convention, not a separate statistic.** | There is no locked "Active Year" definition in RCM, and inventing a third derived layer on top of an already-twice-derived concept (Year derived from Month derived from Week) adds complexity for uncertain added meaning. Instead, "years" is used the way `Longevity` already uses it — as the natural, resonant label for a *large* cumulative figure, applied only in this pass's rationale text for its deepest tiers (Section 3), never as a qualification criterion of its own. |

**Resulting model:** one honor family, one underlying statistic (cumulative Active Weeks, type-blind, retrospective, never-decreasing), with the largest tiers described in years-equivalent language for resonance — not a second, third, or fourth parallel ladder.

---

## Section 3 — Honor Authoring

All five honors below share a single qualification source: the cumulative count of Active Weeks (RCM's TBD-6 definition: a calendar week containing at least one meaningful-work session, of any activity type), evaluated once for each newly-completed week that qualifies. One-time uniqueness, `(athleteId, honorType)` — no `chapterId`. Metadata: `{}` (empty — no per-type or per-chapter context applies, the same convention the existing Longevity family already uses for its own simple, type-blind, date-based honors).

| honorType | displayName | Qualification | Rationale |
|---|---|---|---|
| `consistency_active_weeks_1` | 10 Active Weeks | Cumulative Active Weeks ≥ 10 | Roughly 2–3 months of showing up consistently — the first real consistency marker, beyond any single good week. |
| `consistency_active_weeks_2` | 50 Active Weeks | Cumulative Active Weeks ≥ 50 | Around a year of consistent presence — the point where "I'm trying to be consistent" becomes "I am consistent." |
| `consistency_active_weeks_3` | 150 Active Weeks | Cumulative Active Weeks ≥ 150 | Multiple years of sustained presence — a genuine step beyond a single strong year, the same multi-year bar this catalog's other Advanced tiers already use. |
| `consistency_active_weeks_4` | 300 Active Weeks | Cumulative Active Weeks ≥ 300 | Roughly six to ten years of consistent presence, depending on cadence — a long-term identity marker. |
| `consistency_active_weeks_5` | 500 Active Weeks | Cumulative Active Weeks ≥ 500 | The ladder's legacy capstone — roughly a decade or more of showing up, week after week, calculated at a realistic sustained cadence (RCM's own §13.7 calibration table uses ~3 active weeks per month as a "normally engaged athlete's pace," which would reach this figure in just under fourteen years). Not a finish line — a recognition of a journey that is still, by design, ongoing. |

**No filler, no duplicates, no streak language check:** every threshold is a genuine progression rung, none was inserted to fill a numeric gap, and no honor's qualification or rationale references a current streak, a consecutive run, days-since-last-session, or any state capable of being lost once earned — consistent with Section 1.1's rejected-concepts list.

---

## Section 4 — Ladder Validation

| Stage | Tier | Validation |
|---|---|---|
| Beginner | 10 AW | Reachable within a season — recognizes genuine early consistency without requiring years of history first. |
| Intermediate | 50 AW | Roughly a full year — the threshold where a habit becomes identifiable as a habit. |
| Advanced | 150 AW | Multiple years — a real step beyond Intermediate, not a marginal increment. |
| Long-Term | 300 AW | Six-plus years at a realistic cadence — squarely inside this catalog's established 8–20-year design horizon, not a token "long" label. |
| Legacy | 500 AW | Approaches the upper end of the horizon at a sustainable, non-extreme pace (~13–14 years at RCM's own "normally engaged" calibration) — genuinely difficult, never a finish line, and **does not end the journey**: an athlete can keep accumulating Active Weeks indefinitely after earning it, exactly as Longevity's own top tier does not stop an athlete's account from aging further. |

**Avoiding ladders that end too early:** confirmed by design — the underlying statistic (cumulative Active Weeks) has no ceiling, and this pass's top tier is deliberately set below any hard maximum, not at one. An athlete who reaches 500 Active Weeks continues accumulating exactly as before; nothing about the catalog or the underlying counter changes at that point.

---

## Section 5 — Catalog Impact

| Metric | Before this pass | After this pass |
|---|---|---|
| Total honors | 137 | **142** |
| Total categories | 8 | **8 — unchanged** |
| Training honors | 18 | **23** |
| Training honor families | 2 (Workout Count, Hours Forged) | **3** (+ Consistency) |

**No new category and no L-10 touchpoint at all** — this pass adds a third family within the already-existing Training category, an even smaller footprint than Pass 4's (which added a second family within Endurance). Consistency honors are visible to every athlete regardless of activity-type mix, by design (Section 1.4) — they are the first honors in the entire catalog that recognize *frequency of presence* directly, rather than volume, magnitude, or a single best performance.

---

## Section 6 — Future Capacity

Per the objective's instruction, evaluated but not authored:

- **Comebacks & Resilience** (the Pre-Authoring Audit's Family 11) — explicitly named there as sharing Consistency's root issue but "possibly the right kind of risk": a positively-framed honor for resuming training after an extended break, since "starting over" is something Product DNA says the app should never shame, which "cuts both ways" — a real future candidate sharing this pass's exact retrospective-only, no-failure-state design philosophy.
- **Per-activity-type consistency** (e.g., a dedicated "consistent runner" honor) — not a natural extension of this family. RCM's Training Consistency is deliberately type-blind; a type-specific version would be a new, separate design question, not a logical next tier of this pass's work.
- **Active-Months-based honors** — formally rejected as their own family in Section 2, not merely deferred; revisit only if a future evaluation finds a genuinely distinct meaning in month-level density beyond what cumulative Active Weeks already captures.

---

## Section 7 — Final Recommendation

### 7.1 Approved honors

All five honors in Section 3, under the existing Training category, qualifying against cumulative Active Weeks.

### 7.2 Rejected honors

Any live-streak, current-streak, or consecutive-tracking design (Section 1.1); a separate Active Months family (Section 2); per-activity-type consistency (Section 6).

### 7.3 Risks

- **The named cross-system dependency (Section 1.2) is real and unresolved.** RCM already defines and computes the cumulative Active Week concept this pass relies on, but for Rank's own internal purposes, in Rank's own storage — not in the Honor Evaluation Service's Athlete Statistics Record. This pass authors against the *concept*, not against an already-wired data path, exactly as Pass 3 authored nothing against `bestPace` for the same reason but flagged it. The honest difference here is that this task explicitly asked for these honors to be authored regardless — so this pass proceeds, but names the gap plainly rather than implying it is already closed.
- **Resolution shape, recommended but not designed here:** either the Honor Evaluation Service gains read access to RCM's existing "total cumulative active weeks" counter, or it independently computes and stores its own equivalent counter, reusing RCM's already-locked TBD-6 Active Week definition without needing to read RCM's storage directly. Choosing between these is a small, future architecture decision — in the same shape and scale as `Endurance-Statistics-Architecture-Amendment-001.md`, not a redesign of anything locked, but a real piece of work this pass does not perform (per this task's "No architecture redesign" rule).

### 7.4 Open questions

- Which of the two resolution shapes in 7.3 is preferable — a cross-system read or an independently-computed parallel counter — is not decided here.
- Should a future Comebacks & Resilience pass (Section 6) reuse this same cumulative, never-failing design philosophy, or does it require a genuinely new mechanism (since "resuming after a break" implies detecting an absence, which this pass's design deliberately avoids needing to do)? Named, not resolved.
- L-11 description templates for these five honors are not authored in this pass, consistent with this task's Section 3 scope — the same standing follow-up every prior pass has deferred identically.

### 7.5 Readiness assessment

**Ready at the design level; blocked at the implementation level on one named, small statistics prerequisite (Section 7.3) — the same maturity level as Pass 4's honors were on the HIKE/ROW enum amendment, and as Pass 3's still-unauthored pace honors are on the `bestPace` integration gap.** This is now a familiar, well-understood pattern in this catalog's expansion history, not a new kind of risk: design and content can run ahead of a small, explicitly-named architecture dependency without either blocking the other.

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial Honors Catalog Expansion — Pass 5 (Consistency). Reviewed prior findings: streaks and consecutive-day tracking rejected (unchanged); cumulative, retrospective consistency honors approved. Ran the Product DNA 7-question decision test explicitly — the step the Pre-Authoring Audit required but had not itself performed — and confirmed a clean pass specifically for a cumulative, never-revocable, retrospective design. Found that RCM already defines (TBD-6, Active Week) and computes (§13.10, "total cumulative active weeks") the exact frequency statistic the original Taxonomy Reconciliation said did not exist anywhere — true only for the Honor Evaluation Service's own six counters, not for RCM independently. Evaluated Active Weeks/Months/Years: Weeks adopted as the sole underlying statistic; Months rejected as a redundant derived family; Years adopted only as rationale-text framing for the deepest tiers, not a separate measurement. Authored five honors (10/50/150/300/500 cumulative Active Weeks) under the existing Training category — no new category, no L-10 touchpoint. Named, but did not resolve, a small cross-system dependency: this concept currently lives in RCM's storage, not the Honor Evaluation Service's, and wiring it (or computing an independent parallel counter from the same locked definition) is real, deferred follow-up work, in the same shape as Pass 3's still-open `bestPace` gap and Pass 4's HIKE/ROW enum dependency. No Honor Architecture, Honor Evaluation Service, Rank, Goals, Progress, or Activity History redesign performed. |

---

*Honors Catalog Expansion — Pass 5 (Consistency) — v1.0*
*Forge Legacy | June 2026*
