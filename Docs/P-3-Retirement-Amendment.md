# P-3 Retirement Amendment
## Retirement of Rank Detail Screen and Navigation Rerouting
### June 2026

**Status:** LOCKED

**Type:** Screen Retirement Amendment

**Date:** June 2026

**Retires:** P-3 Rank Detail (never authored; perpetually blocked on TBD-12)

**Authority Chain:**
- P-3 Dependency Audit (June 2026) — confirmed no unique content responsibility remaining
- P-3 Navigation Verification (June 2026) — confirmed all entry points reroutable to P-2 with Option B
- P-2-Progress-Hub-Spec.md v1.0 (LOCKED — P-2.2 is the authoritative rank-depth surface)
- Profile-Wireframe-Spec-P1.md v1.0 (LOCKED — amended by this document)
- P-1-Amendment-001-Progress-Entry-Point.md v1.0 (LOCKED — amended by this document)
- Rank-Up-Modal-Spec-M1.md v1.0 (LOCKED — amended by this document)
- Legacy-Hub-Wireframe-Spec-L1.md v1.0 (LOCKED — amended by this document)

**Downstream Effects:**
- P-2-Progress-Hub-Spec.md — addendum for `openRankJourney` route param
- P-2-Progress-Hub-Architecture.md — P-3 dependency reference removed
- Rank-Implementation-Readiness-Review.md — P-3 workstream entry retired
- Rank-System-Architecture.md — P-3 downstream dependent note updated
- Rank-Calibration-Decisions.md — P-3 reference updated
- Forge-Legacy-Master-PRD.md / FORGE_LEGACY_PRD.md — screen inventory updated

**Amendment Log:** Initial. v1.0 LOCKED.

---

## Section 1 — Retirement Decision

### 1.1 Basis

P-3 Rank Detail was never authored. It was blocked pending TBD-12 (rank data model). TBD-12 is now resolved. However, in the window between TBD-12 resolution and P-3 initiation, P-2.2 Rank Journey Detail was authored and locked — absorbing the complete intended P-3 content scope.

A post-architecture dependency audit (June 2026) confirmed:

| P-3 Intended Content | Now Owned By |
|---|---|
| Current rank family + sub-tier | P-2.2 Current Rank Card |
| Sub-tier progress bar | P-2.2 Dual Progress Component |
| Family progress bar | P-2.2 Dual Progress Component |
| Rank ladder (full 25-rank structure) | P-2.2 Rank Ladder |
| Rank promotion history | P-2.2 Rank History |
| Optional methodology explainer | P-2 (rank explanation) + P-2.2 identity statements (RSA §2.2) |
| Recent engagement gate transparency | P-2.2 prestige-rank contextual note |

P-2.2 is a superset of every content item P-3 was specified to contain. There is no content gap created by retirement.

### 1.2 Decision

**P-3 Rank Detail is formally retired.** No wireframe spec will be authored. The P-3 screen code is vacated. P-2.2 Rank Journey Detail is the sole rank-depth destination in Forge Legacy.

### 1.3 What Retirement Does Not Change

- P-2 and P-2.2 content, structure, architecture, or ownership — unaffected
- Rank architecture, evaluation logic, or data model — unaffected
- All other P-series screen codes — unaffected
- The principle that rank progress mechanics belong one tap away from P-1 — upheld; the destination changes from P-3 to P-2.2, accessible via P-2

---

## Section 2 — Navigation Rerouting

Three entry points previously routed to P-3. All three are rerouted to P-2 with the `openRankJourney` route param (Option B — see Section 3).

### 2.1 Rerouting Table

| Entry Point | Prior Destination | New Destination |
|---|---|---|
| P-1 Rank row | P-3 Rank Detail (Profile modal stack push) | P-2 with `openRankJourney: true` |
| M-1 "View Your Rank" CTA | P-3 Rank Detail (M-1 dismissed, then navigate) | P-2 with `openRankJourney: true` (M-1 dismissed, then navigate) |
| L-1 FLM Rank Up tap | P-1 (declared fallback pending P-3) | P-2 with `openRankJourney: true` |

### 2.2 Navigation Behavior (All Three Entry Points)

When any rerouted entry point is activated:

1. The entry point navigates to P-2 Progress Hub with the `openRankJourney: true` param set.
2. P-2 mounts and programmatically pushes P-2.2 Rank Journey Detail onto the modal navigation stack before the athlete sees P-2's Overview.
3. The athlete lands directly on P-2.2 — functionally equivalent to the one-tap experience P-3 would have provided.

**Back navigation from P-2.2 (all three entry points):**

| From | Back Chain |
|---|---|
| P-1 Rank row | P-2.2 → P-2 → P-1 → dismiss modal → originating tab |
| M-1 "View Your Rank" | P-2.2 → P-2 → P-1 → dismiss modal → Workouts tab (W-17) |
| L-1 FLM Rank Up | P-2.2 → P-2 → P-1 → dismiss modal → Legacy tab (L-1) |

P-2 is always on the back stack between P-2.2 and P-1. The athlete who navigates back from P-2.2 lands on P-2 Overview before returning to P-1. This is a one-step deeper back chain than P-3 would have provided (P-3 → P-1 directly). This is accepted: P-2 is the natural parent of P-2.2, and the back chain correctly reflects that relationship.

### 2.3 No Navigation Conflicts

The Profile modal's navigation stack cleanly supports all three rerouted paths. No back-stack loops exist. No orphaned states. All originating surfaces are restored on final dismissal.

---

## Section 3 — P-2 Route Param Addendum

### 3.1 Route Param Definition

P-2 Progress Hub accepts the following optional route param:

```
openRankJourney: boolean (optional, default: false)
```

When `openRankJourney: true` is passed on P-2 mount:
- P-2 pushes P-2.2 Rank Journey Detail onto the modal navigation stack immediately on mount, before rendering P-2's Overview to the athlete.
- P-2 itself is placed on the back stack and is visible when the athlete navigates back from P-2.2.
- P-2 renders in its standard state — no visual differences from a standard P-2 open. The param only affects the initial navigation behavior.

When `openRankJourney` is absent or `false`:
- P-2 opens normally, showing the Overview. The athlete reaches P-2.2 by tapping the Rank Journey Preview — the standard path.

### 3.2 Cleared On Back Navigation

The `openRankJourney` param is consumed on mount and does not persist. If the athlete navigates back to P-2 from P-2.2 and then re-enters P-2.2 via the Rank Journey Preview tap, this is normal P-2 → P-2.2 navigation — no param is involved.

### 3.3 Authority

This addendum is the authoritative specification for `openRankJourney`. P-2-Progress-Hub-Spec.md and P-2-Progress-Hub-Architecture.md are not re-opened; the param is defined here and referenced from those documents per Section 5 below.

---

## Section 4 — Progress Bar Rationale Correction

P-1 v1.0 (and P-1-Amendment-001) contain language stating that the rank progress bar is excluded from P-1 because "it belongs on P-3, one tap away." P-3 is retired. The underlying principle is unchanged: the progress bar answers a different question than P-1's identity surface does. The destination changes.

**Updated rationale (replaces all P-1 references to "belongs on P-3"):**

> The progress bar belongs on P-2.2 Rank Journey Detail, accessible in one tap via the Rank row → P-2 → P-2.2. P-1 answers "who am I?" — the rank name answers that. The progress bar answers "how far am I from the next tier?" — that is a progression mechanics question, available one tap away for athletes who want it.

This rationale correction is reflected in the affected document updates in Section 5.

---

## Section 5 — Affected Document Updates

### 5.1 Profile-Wireframe-Spec-P1.md (LOCKED — amended by this document)

The following P-1 v1.0 sections are superseded by this amendment:

**Section 5.3 — Navigating to P-3:**
Retired. The Rank row on P-1 navigates to P-2 with `openRankJourney: true`, which auto-opens P-2.2 Rank Journey Detail. The athlete lands on P-2.2 in one tap.

**Section 5.5 — Why the Progress Bar Lives on P-3, Not P-1:**
Heading and all references to P-3 corrected to P-2.2 per Section 4 of this amendment. The principle — progress bar belongs at rank depth, not on the identity surface — is unchanged.

**Section 10.1 — Navigation Map (Rank row entry):**
`Rank row → P-3 Rank Detail` corrected to `Rank row → P-2 (openRankJourney: true) → P-2.2 Rank Journey Detail`.

**Section 10 — Expo Router navigation stack reference (line 670):**
`"It has its own navigation stack for navigating to P-2, P-3, P-4..."` corrected to `"It has its own navigation stack for navigating to P-2, P-4, and other Profile-internal screens."` P-3 removed.

**Navigation map table (line 681):**
Row `P-3 Rank Detail | Pushes onto modal navigation stack` is removed. No replacement row — P-2.2 is reached via P-2, which already has its own row.

**Section 14 — Validation Checklist:**
`Rank row → P-3 Rank Detail (within modal stack)` corrected to `Rank row → P-2 (openRankJourney: true) → P-2.2 Rank Journey Detail`.
`P-3 Rank Detail (one tap away) contains progress bar, history, and optional explainer` corrected to `P-2.2 Rank Journey Detail (one tap away via P-2) contains progress bar, history, and rank development context`.

**All other P-1 v1.0 content is unchanged.**

---

### 5.2 P-1-Amendment-001-Progress-Entry-Point.md (LOCKED — amended by this document)

**Section 10 — Relationship to P-2 and P-3 (heading):**
Heading corrected to `Relationship to P-2 and P-2.2`.

**Section 10 — Relationship table:**
`P-3 Rank Detail | Rank section tap` row corrected to `P-2.2 Rank Journey Detail (via P-2) | Rank section tap`.

**Section 10 — Contrast paragraph:**
`"P-3 is the rank-specific depth screen. P-2 is the comprehensive development surface. Athletes who want to investigate their rank journey specifically use the Rank row → P-3."` corrected to: `"P-2.2 is the rank-depth surface. P-2 is the comprehensive development surface. Athletes who want to investigate their rank journey specifically use the Rank row → P-2 (openRankJourney: true) → P-2.2."`

**Decision A001-D3:**
`"RANK → who I have become (identity signal) → P-3 Rank Detail (rank-specific depth)"` corrected to `"RANK → who I have become (identity signal) → P-2.2 Rank Journey Detail (rank-specific depth, via P-2)"`.

**All other P-1-Amendment-001 content is unchanged.**

---

### 5.3 Rank-Up-Modal-Spec-M1.md (LOCKED — amended by this document)

**Navigation table (line 273):**
`"View Your Rank" | P-3 Rank Detail` corrected to `"View Your Rank" | P-2 (openRankJourney: true) → P-2.2 Rank Journey Detail`.

**Behavior table (line 295):**
`"View Your Rank" tap | P-3 Rank Detail (M-1 dismissed)` corrected to `"View Your Rank" tap | P-2 with openRankJourney: true (M-1 dismissed) → P-2.2 Rank Journey Detail`.

**Validation checklist (line 415):**
`"View Your Rank" navigates to P-3` corrected to `"View Your Rank" navigates to P-2 (openRankJourney: true), which auto-opens P-2.2 Rank Journey Detail`.

**All other M-1 content is unchanged.**

---

### 5.4 Legacy-Hub-Wireframe-Spec-L1.md (LOCKED — amended by this document)

**FLM card — Rank Up tap destination (line 424):**
`Tap → P-1 (Profile Modal — fallback until P-3 Rank Detail is specced)` corrected to `Tap → P-2 (openRankJourney: true) → P-2.2 Rank Journey Detail`.

**Navigation destination map (line 837):**
`FLM card — Rank Up | P-1 (Profile Modal — fallback) | Specced fallback` corrected to `FLM card — Rank Up | P-2 (openRankJourney: true) → P-2.2 Rank Journey Detail | Specced`.

**Risk 8 — P-3 Rank Detail Unspecced:**
Risk 8 is **closed**. P-3 is retired. The FLM Rank Up tap destination is P-2 (openRankJourney: true) → P-2.2 Rank Journey Detail. This is the final destination — not a fallback.

**All other L-1 content is unchanged.**

---

### 5.5 Rank-Implementation-Readiness-Review.md (LOCKED — amended by this document)

**P-3 Rank Detail Screen Spec workstream entry:**
Retired. Entry updated to: `P-3 Rank Detail Screen | RETIRED — content absorbed by P-2.2 Rank Journey Detail (June 2026). No spec will be authored.`

**P-3 readiness row in readiness table:**
`P-3 Rank Detail | NOT READY — TBD-12` corrected to `P-3 Rank Detail | RETIRED — see P-3 Retirement Amendment (June 2026)`.

**All other Rank-Implementation-Readiness-Review content is unchanged.**

---

### 5.6 Rank-System-Architecture.md (LOCKED — amended by this document)

**P-3 downstream dependent note:**
`P-3 Rank Detail | Downstream dependent — not yet authored | P-3 will display rank family, sub-tier, promotion history, and development trajectory. Cannot be authored until TBD-12 (rank data model) is resolved.` corrected to: `P-3 Rank Detail | RETIRED — content owned by P-2.2 Rank Journey Detail. See P-3 Retirement Amendment (June 2026).`

**All other Rank-System-Architecture content is unchanged.**

---

### 5.7 Rank-Calibration-Decisions.md (LOCKED — amended by this document)

**P-3 Rank Detail Screen Spec entry in workstream table:**
`P-3 Rank Detail Screen Spec | MEDIUM — can begin now (TBD-12 complete) | Blocked only until after P-2 finalization` corrected to: `P-3 Rank Detail Screen Spec | RETIRED — see P-3 Retirement Amendment (June 2026)`.

**All other Rank-Calibration-Decisions content is unchanged.**

---

### 5.8 Forge-Legacy-Master-PRD.md / FORGE_LEGACY_PRD.md (LOCKED — amended by this document)

**Screen inventory row:**
`Rank Detail (P-3) | Current rank, sub-tier progress, rank history, optional methodology explainer` is removed. A note is added: `P-3 Rank Detail retired June 2026. Content owned by P-2.2 Rank Journey Detail.`

**Rank View section (line 881 / 860):**
The Rank View (P-3) section is retired. All rank depth content is owned by P-2.2 per P-2-Progress-Hub-Spec.md (LOCKED).

**Product philosophy copy (line 762 / 741):**
`"It is a background reward system that surfaces in celebrations (M-1 Rank Up) and is always accessible via P-3 Rank Detail."` corrected to: `"It is a background reward system that surfaces in celebrations (M-1 Rank Up) and is always accessible via P-2.2 Rank Journey Detail."`

**Navigation reference (line 216 / 215):**
`Edit Profile, Rank Detail (P-2, P-3)` corrected to `Edit Profile (P-2 Edit Profile surface)`. P-3 removed.

**All other Master PRD content is unchanged.**

---

### 5.9 P-2-Progress-Hub-Architecture.md (LOCKED — amended by this document)

**P-3–P-8 range reference (line 154):**
`"Candidate: P-9 (after the informal P-3–P-8 settings range)"` corrected to `"Candidate: P-9 (after the P-4–P-8 settings range). Note: P-3 has been retired per P-3 Retirement Amendment (June 2026)."` The settings range is unchanged (P-4–P-8); only the P-3 reference is corrected.

**Line 1003 — P-9 proposed resolution:**
`"The informal P-3–P-8 range covers rank detail and settings screens."` corrected to `"The P-4–P-8 range covers settings screens. P-3 has been retired. P-9 keeps Edit Profile in the P-series without disrupting that range."`

**All other P-2-Progress-Hub-Architecture content is unchanged.**

---

### 5.10 P-2-Progress-Hub-Spec.md — Route Param Addendum

**Addendum (no existing section modified):**

P-2 Progress Hub accepts an optional `openRankJourney: boolean` route param. Full specification in P-3 Retirement Amendment, Section 3. Summary: when `true`, P-2 auto-pushes P-2.2 Rank Journey Detail on mount. When absent or `false`, P-2 opens normally. This param is set by: P-1 Rank row, M-1 "View Your Rank" CTA, and L-1 FLM Rank Up tap.

---

## Section 6 — Architecture Decisions

| Decision ID | Decision |
|---|---|
| **P3R-D1 — P-3 retired; no spec authored** | P-3 Rank Detail is formally retired. P-2.2 Rank Journey Detail owns the complete rank-depth surface. No wireframe spec will be authored for P-3. The P-3 screen code is vacated. |
| **P3R-D2 — Option B: P-2 auto-opens P-2.2 via route param** | All rerouted entry points navigate to P-2 with `openRankJourney: true`. P-2 programmatically pushes P-2.2 on mount before the athlete sees P-2's Overview. This preserves the one-tap rank-depth experience that P-3 would have provided. |
| **P3R-D3 — P-2 on back stack** | When `openRankJourney: true`, P-2 is placed on the back stack between P-2.2 and P-1. Back from P-2.2 lands on P-2 Overview. This is a one-step deeper back chain than P-3 would have provided. Accepted: P-2 is the natural parent of P-2.2, and the back chain correctly reflects that relationship. |
| **P3R-D4 — Route param consumed on mount; does not persist** | `openRankJourney` is a mount-time param only. Back navigation to P-2 and re-entry to P-2.2 follows the standard Rank Journey Preview tap path. The param is not sticky and does not alter P-2's default open behavior on subsequent entries. |
| **P3R-D5 — Progress bar rationale updated, principle unchanged** | The principle that the rank progress bar belongs at rank depth (not on P-1's identity surface) is unchanged. Only the named destination changes from P-3 to P-2.2. All P-1 rationale language referencing P-3 is corrected to P-2.2 per Section 4. |
| **P3R-D6 — L-1 FLM Risk 8 closed** | Risk 8 in L-1 (FLM Rank Up tap unresolved pending P-3 spec) is formally closed. The final destination is P-2 (openRankJourney: true) → P-2.2. The fallback to P-1 is retired. |

---

## Section 7 — Validation Checklist

### P-3 Retirement
- [ ] P-3 Rank Detail screen code vacated — no wireframe will be authored
- [ ] No engineering work planned or in progress for P-3

### P-1 Rank Row
- [ ] Rank row tap navigates to P-2 with `openRankJourney: true`
- [ ] P-2 auto-opens P-2.2 on mount when param is present
- [ ] Athlete lands on P-2.2 Rank Journey Detail without seeing P-2 Overview
- [ ] Back from P-2.2 → P-2 Overview
- [ ] Back from P-2 → P-1

### M-1 "View Your Rank"
- [ ] "View Your Rank" tap dismisses M-1 and navigates to P-2 with `openRankJourney: true`
- [ ] P-2 auto-opens P-2.2 on mount
- [ ] Athlete lands on P-2.2 Rank Journey Detail
- [ ] Back from P-2.2 → P-2 Overview
- [ ] Back from P-2 → P-1
- [ ] Dismiss P-1 modal → returns to Workouts tab (originating surface)

### L-1 FLM Rank Up Tap
- [ ] FLM Rank Up card tap navigates to P-2 with `openRankJourney: true`
- [ ] P-2 auto-opens P-2.2 on mount
- [ ] Athlete lands on P-2.2 Rank Journey Detail
- [ ] Back from P-2.2 → P-2 Overview
- [ ] Back from P-2 → P-1
- [ ] Dismiss P-1 modal → returns to Legacy tab (L-1)

### Route Param Behavior
- [ ] `openRankJourney: true` causes P-2.2 push before P-2 Overview renders
- [ ] `openRankJourney: false` (or absent) — P-2 opens normally; standard Rank Journey Preview tap path to P-2.2
- [ ] Param does not persist after mount — back navigation to P-2 and re-entry to P-2.2 follows standard tap path
- [ ] No visual difference in P-2 when opened with vs. without the param

### Document Corrections
- [ ] Profile-Wireframe-Spec-P1.md: Rank row destination, Section 5.3, Section 5.5, navigation map, validation checklist — all corrected per Section 5.1
- [ ] P-1-Amendment-001: Section 10 table, contrast paragraph, decision A001-D3 — corrected per Section 5.2
- [ ] Rank-Up-Modal-Spec-M1.md: navigation table, behavior table, validation checklist — corrected per Section 5.3
- [ ] Legacy-Hub-Wireframe-Spec-L1.md: FLM Rank Up tap destination, navigation map, Risk 8 closed — per Section 5.4
- [ ] Rank-Implementation-Readiness-Review.md: P-3 entry retired — per Section 5.5
- [ ] Rank-System-Architecture.md: P-3 downstream dependent note updated — per Section 5.6
- [ ] Rank-Calibration-Decisions.md: P-3 workstream entry updated — per Section 5.7
- [ ] Forge-Legacy-Master-PRD.md / FORGE_LEGACY_PRD.md: screen inventory, Rank View section, philosophy copy, navigation reference — per Section 5.8
- [ ] P-2-Progress-Hub-Architecture.md: P-3–P-8 range references corrected — per Section 5.9
- [ ] P-2-Progress-Hub-Spec.md: `openRankJourney` param addendum noted — per Section 5.10

---

## Change Log

*No entries. v1.0 LOCKED.*

---

*P-3 Retirement Amendment*
*Retirement of Rank Detail Screen and Navigation Rerouting to P-2.2*
*June 2026*
*Authority: P-3 Dependency Audit (June 2026), P-3 Navigation Verification (June 2026)*
*Status: LOCKED*
