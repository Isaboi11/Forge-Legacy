# Forge Legacy — Program Ecosystem Architecture
## Version 1.2 | June 2026

**Status:** LOCKED
**Authority:** Program-Catalog-Architecture-v1.0.md (v1.1), Program-Architecture-Amendment-001-Active-Program-Rule.md
**Downstream impact:** Program-Detail-Wireframe-Spec-W3.md (What's Next section, Share to Squad action), Program-Browse-Wireframe-Spec-W2.md (catalog display), Program-Catalog-Architecture-v1.0.md (schema + catalog table), Squad-Detail-Wireframe-Spec-S2.md (PROGRAM_RECOMMENDATION feed card)

---

## Section 1 — Purpose

This document defines the program ecosystem for Forge Legacy MVP — the programs themselves as a connected network of training paths rather than a flat list. It answers:

1. How are Forge Programs organized into families and ladders?
2. What is the succession architecture, and how does it surface in the product?
3. What is the complete launch catalog, and how does it serve every athlete type, goal, and environment?
4. How are programs authored and published internally (Forge Content Import Architecture)?
5. What is the long-term roadmap and governance model for the catalog?

This document does not repeat the data model or taxonomy (those are in Program-Catalog-Architecture-v1.0.md). It governs the ecosystem view.

---

## Section 2 — Program Families

A program family is a group of related programs that share a training methodology and form a coherent progression ladder. Athletes move through a family by following succession links.

### 2.1 Family Structure

Each family has:
- A shared training methodology (the "what" of the training)
- A coherent progression (Beginner → Intermediate → Advanced, or a branching structure)
- A minimum of 2 programs; maximum of 5 before governance review

**8 families at MVP launch:**

| Family | Primary Athlete Type | Environment(s) | Programs |
|--------|---------------------|----------------|---------|
| Strength | Strength, Hybrid | GYM | Strength Foundation I/II/III + Powerbuilding Foundation/Intermediate |
| Hypertrophy | Bodybuilding, Strength | GYM | Hypertrophy Foundation/Intermediate/Advanced + Lower Body Foundation/Intermediate |
| Running | Running | OUTDOOR | Running Base I/II |
| Conditioning | Hybrid, General | GYM + MIXED | Athletic Conditioning Foundation, Body Recomposition Foundation/Intermediate, Conditioning Intermediate, Hybrid Foundation/Intermediate |
| Full Body & Home | General | HOME | Bodyweight Foundation/Strength/Performance + Home Conditioning + Home Strength Foundation |
| Mobility | All | HOME | Mobility Foundation + Mobility Intermediate |

### 2.2 Family Cap Governance

When a family reaches 5 programs, adding another program requires a governance review before entering the pipeline. The review asks:
- Does this program fill a demonstrably different athlete gap than existing programs?
- Does it avoid overlapping the existing program's category + level + environment combination?
- Is the methodology sufficiently distinct from sibling programs?

The Conditioning family currently has 6 programs (exceeds the raw cap). This exception is approved: the 6 programs span 3 distinct sub-goals (athletic conditioning, recomposition, hybrid) with distinct goal alignments, environments, and athlete types. No Conditioning sub-goal duplicates another. This exception is recorded; future Conditioning additions still require governance review.

The Hypertrophy family currently has 5 programs (at the governance cap). The addition of Lower Body Foundation and Lower Body Intermediate alongside the general Hypertrophy ladder is approved: the lower-body-focused programs serve a distinct athlete goal (lower body / glute development) with different structural emphasis and distinct naming. Any further additions to the Hypertrophy family require governance review.

The Full Body & Home family currently has 5 programs (at the governance cap). Future additions require governance review.

---

## Section 3 — Succession Architecture

### 3.1 successorProgramId

Every `ProgramDefinition` has a `successorProgramId: uuid | null` field (added in Program-Catalog-Architecture-v1.0.md v1.1). This field references the program that Forge recommends an athlete pursue after graduating the current program.

**Rules:**
- `successorProgramId` is set only for Forge-sourced programs. Athlete-created and imported programs have `null`.
- The successor must be a published Forge program (`publishedAt` non-null).
- A program may have only one successor. Branching progressions (e.g., from Powerbuilding Foundation, athlete could go to either Powerbuilding Intermediate or Strength Foundation II) are resolved by choosing the most logical direct successor. The athlete can always browse W-2 for alternatives.
- Successor links are directional. Strength Foundation II pointing to Strength Foundation III does not imply III points back to II.
- Terminal programs (no logical successor) have `successorProgramId: null`.

### 3.2 Product Surface — W-3 "What's Next" Section

The succession link surfaces on W-3 Program Detail in the **Graduated state only**. It appears as a "What's Next" section between the workout schedule and the "Run This Program Again" CTA.

Displaying the successor only at graduation (not at program preview or during active training) is intentional:
- During active training, the athlete's focus is the current program — surfacing "next" would introduce distraction
- At graduation, the athlete is actively seeking a direction — surfacing the next program serves this natural moment

The "What's Next" section is absent if the graduated program has `successorProgramId: null` or if the successor is not published. No placeholder.

See W-3 v1.5 §7.1 for full display specification.

### 3.3 Succession Chains at Launch

**Strength Foundation Ladder:**
Strength Foundation I → Strength Foundation II → Strength Foundation III

**Powerbuilding Ladder:**
Powerbuilding Foundation → Powerbuilding Intermediate

**Hypertrophy Ladder:**
Hypertrophy Foundation → Hypertrophy Intermediate → Hypertrophy Advanced

**Lower Body Ladder:**
Lower Body Foundation → Lower Body Intermediate

**Running Ladder:**
Running Base I → Running Base II

**Conditioning Ladder:**
Athletic Conditioning Foundation → Conditioning Intermediate

**Recomposition Ladder:**
Body Recomposition Foundation → Body Recomposition Intermediate

**Hybrid Ladder:**
Hybrid Foundation → Hybrid Intermediate

**Bodyweight Ladder:**
Bodyweight Foundation → Bodyweight Strength → Bodyweight Performance

**Mobility Ladder:**
Mobility Foundation → Mobility Intermediate

**Terminal programs (no successor):**
Strength Foundation III, Powerbuilding Intermediate, Hypertrophy Advanced, Lower Body Intermediate, Running Base II, Conditioning Intermediate, Body Recomposition Intermediate, Hybrid Intermediate, Bodyweight Performance, Home Conditioning, Home Strength Foundation, Mobility Intermediate

---

## Section 4 — Content Rules

### 4.1 Gender-Neutral, Athlete-Centered Descriptions

All Forge Program descriptions must use athlete-centered, gender-neutral language. Full rule is defined in Program-Catalog-Architecture-v1.0.md §4.4.

Summary:
- Describe what the program trains, how, and what the athlete develops
- No gendered pronouns. No appearance-focused language.
- Goals are described in training terms, not appearance terms.
- Applies to all `FORGE`-sourced ProgramDefinitions. Athlete-created and imported programs are exempt.

### 4.2 Description Format

60–120 characters. One sentence. Leads with the primary training goal. Does not name specific equipment brands. Does not promise specific physical outcomes.

See Program-Catalog-Architecture-v1.0.md §4.3 for full description guidelines and examples.

### 4.3 Methodology Requirement

All Forge Programs must be built on established, evidence-based training methodologies. No proprietary or branded program names may appear in descriptions or program names. Periodization structure, training frequency, and progression logic must be documentable by the product team before publishing.

---

## Section 5 — Launch Catalog

### 5.1 Summary

25 Forge Programs across 8 families, covering all 7 athlete types, all 10 goal alignments, and all 4 environments.

| Metric | Value |
|--------|-------|
| Total programs | 25 |
| Families | 6 |
| Athlete types with Forge programs | 5 of 7 (Cycling and Combat deferred to creator marketplace) |
| Goal alignments covered by Forge | 8 of 10 (IMPROVE_CYCLING and SPORT_PERFORMANCE deferred) |
| Environments covered | 4 of 4 |
| Programs with successors | 13 |
| Terminal programs | 12 |
| Featured programs | 2 |

### 5.2 Catalog Table

| Sort | Name | Category | Level | Env | Wks | /Wk | Goal Alignment | Successor |
|------|------|----------|-------|-----|-----|-----|----------------|-----------|
| 1 | Strength Foundation I | STRENGTH | BEGINNER | GYM | 8 | 3 | BUILD_STRENGTH | → Sort 2 |
| 2 | Strength Foundation II | STRENGTH | INTERMEDIATE | GYM | 10 | 4 | BUILD_STRENGTH, BUILD_MUSCLE | → Sort 3 |
| 3 | Strength Foundation III | STRENGTH | ADVANCED | GYM | 12 | 4 | BUILD_STRENGTH | — |
| 4 | Powerbuilding Foundation | STRENGTH | BEGINNER | GYM | 10 | 4 | BUILD_STRENGTH, BUILD_MUSCLE | → Sort 5 |
| 5 | Powerbuilding Intermediate | STRENGTH | INTERMEDIATE | GYM | 12 | 4 | BUILD_STRENGTH, BUILD_MUSCLE | — |
| 6 | Hypertrophy Foundation | HYPERTROPHY | BEGINNER | GYM | 8 | 4 | BUILD_MUSCLE | → Sort 7 |
| 7 | Hypertrophy Intermediate | HYPERTROPHY | INTERMEDIATE | GYM | 10 | 4 | BUILD_MUSCLE | → Sort 8 |
| 8 | Hypertrophy Advanced | HYPERTROPHY | ADVANCED | GYM | 12 | 5 | BUILD_MUSCLE | — |
| 9 | Lower Body Foundation | HYPERTROPHY | BEGINNER | GYM | 8 | 3 | BUILD_MUSCLE | → Sort 10 |
| 10 | Lower Body Intermediate | HYPERTROPHY | INTERMEDIATE | GYM | 10 | 4 | BUILD_MUSCLE | — |
| 11 | Running Base I | RUNNING | BEGINNER | OUTDOOR | 8 | 4 | IMPROVE_RUNNING, IMPROVE_ENDURANCE | → Sort 12 |
| 12 | Running Base II | RUNNING | INTERMEDIATE | OUTDOOR | 10 | 5 | IMPROVE_RUNNING, IMPROVE_ENDURANCE | — |
| 13 | Athletic Conditioning Foundation | CONDITIONING | BEGINNER | GYM | 8 | 3 | IMPROVE_CONDITIONING, GENERAL_FITNESS | → Sort 15 |
| 14 | Body Recomposition Foundation | CONDITIONING | BEGINNER | GYM | 8 | 4 | LOSE_FAT, BUILD_MUSCLE | → Sort 16 |
| 15 | Conditioning Intermediate | CONDITIONING | INTERMEDIATE | GYM | 10 | 4 | IMPROVE_CONDITIONING | — |
| 16 | Body Recomposition Intermediate | CONDITIONING | INTERMEDIATE | GYM | 10 | 4 | LOSE_FAT, BUILD_MUSCLE | — |
| 17 | Hybrid Foundation | CONDITIONING | BEGINNER | MIXED | 8 | 4 | BUILD_STRENGTH, IMPROVE_CONDITIONING | → Sort 18 |
| 18 | Hybrid Intermediate | CONDITIONING | INTERMEDIATE | MIXED | 10 | 4 | BUILD_STRENGTH, IMPROVE_CONDITIONING | — |
| 19 | Bodyweight Foundation | FULL_BODY | BEGINNER | HOME | 6 | 3 | GENERAL_FITNESS | → Sort 20 |
| 20 | Bodyweight Strength | FULL_BODY | INTERMEDIATE | HOME | 8 | 4 | BUILD_STRENGTH, GENERAL_FITNESS | → Sort 21 |
| 21 | Bodyweight Performance | FULL_BODY | ADVANCED | HOME | 10 | 4 | BUILD_STRENGTH, GENERAL_FITNESS | — |
| 22 | Home Conditioning | FULL_BODY | BEGINNER | HOME | 6 | 3 | LOSE_FAT, IMPROVE_CONDITIONING | — |
| 23 | Home Strength Foundation | FULL_BODY | BEGINNER | HOME | 8 | 3 | BUILD_STRENGTH, GENERAL_FITNESS | — |
| 24 | Mobility Foundation | MOBILITY | BEGINNER | HOME | 4 | 5 | IMPROVE_MOBILITY | → Sort 25 |
| 25 | Mobility Intermediate | MOBILITY | INTERMEDIATE | HOME | 6 | 5 | IMPROVE_MOBILITY | — |

### 5.3 Featured Programs

| Sort | Name | isFeatured | Rationale |
|------|------|-----------|-----------|
| 1 | Strength Foundation I | true | Most broadly applicable starting point for Strength and Hybrid athletes; largest athlete type segment at launch |
| 19 | Bodyweight Foundation | true | Zero equipment barrier; entry point for General and home-gym athletes with no access or cost constraints |

Featured flag has no visible effect in W-2 MVP. It is reserved for post-MVP editorial surfaces (featured carousel, etc.). Featured programs sort first within their sort tier.

### 5.4 Coverage Verification

**Athlete Type Coverage:**

| Athlete Type | Primary Programs |
|-------------|-----------------|
| Strength | Strength Foundation I/II/III, Powerbuilding Foundation/Intermediate |
| Bodybuilding | Hypertrophy Foundation/Intermediate/Advanced, Powerbuilding Foundation/Intermediate |
| Running | Running Base I/II |
| Cycling | *(no Forge programs — deferred to creator marketplace; CYCLING category enum retained for athlete-created and imported programs)* |
| Combat | *(no Forge programs — deferred to creator marketplace; COMBAT_SPORTS category enum retained for athlete-created and imported programs)* |
| General | Athletic Conditioning Foundation, Bodyweight Foundation, Home Conditioning, Home Strength Foundation, Mobility Foundation/Intermediate |
| Hybrid | Hybrid Foundation/Intermediate, Body Recomposition Foundation/Intermediate |

**Lower Body / Glute Development** (goal-differentiated, not a distinct athlete type): Lower Body Foundation, Lower Body Intermediate — serves athletes across Bodybuilding, Strength, and General types whose primary training goal is lower body and glute development.

**Environment Coverage:**

| Environment | Program Count | Programs |
|------------|-------------|---------|
| GYM | 14 | Sorts 1–10, 13–16 |
| HOME | 7 | Sorts 19–25 |
| OUTDOOR | 2 | Sorts 11–12 |
| MIXED | 2 | Sorts 17–18 |

---

## Section 6 — Forge Content Import Architecture

### 6.1 Overview

Forge Programs are authored through an internal toolchain, not directly in the production database. This preserves content quality control, enables review before publishing, and separates authoring from shipping.

**Pipeline:**

```
Google Sheets Template
        ↓
   CSV Export
        ↓
Forge Admin Import Tool
        ↓
   Validation Pass
        ↓
Draft ProgramDefinition
        ↓
   Product Review
        ↓
Publish (publishedAt set)
```

### 6.2 Google Sheets Template

The canonical authoring surface for Forge Program content. One sheet per program. Fields map directly to `ProgramDefinition` columns.

**Program Header sheet — one row per program:**

| Column | Maps To | Notes |
|--------|---------|-------|
| name | ProgramDefinition.name | Max 60 chars |
| version | ProgramDefinition.version | "v1.0" default |
| category | ProgramDefinition.category | Enum value: STRENGTH, HYPERTROPHY, etc. |
| level | ProgramDefinition.level | BEGINNER, INTERMEDIATE, ADVANCED |
| environment | ProgramDefinition.environment | GYM, HOME, OUTDOOR, MIXED |
| goalAlignment | ProgramDefinition.goalAlignment | Comma-separated enum values |
| durationWeeks | ProgramDefinition.durationWeeks | Integer |
| workoutsPerWeek | ProgramDefinition.workoutsPerWeek | Integer |
| description | ProgramDefinition.description | 60–120 chars; must pass content rule review |
| isFeatured | ProgramDefinition.isFeatured | TRUE/FALSE |
| sortOrder | ProgramDefinition.sortOrder | Integer ≥ 1 |
| successorProgramName | — | Human-readable lookup; resolved to UUID during import |

**successorProgramName resolution:** The import tool resolves `successorProgramName` to `successorProgramId` by matching the value to an existing published `ProgramDefinition.name`. If no match is found, import fails validation with an explicit error. This requires all predecessor programs to be imported before successors that reference them by name — OR for the successor to already exist in the database before import.

**Program Slots sheet — one row per workout slot:**

| Column | Maps To | Notes |
|--------|---------|-------|
| programName | ProgramSlot.programId (resolved) | Lookup to ProgramDefinition |
| slotIndex | ProgramSlot.slotIndex | 0-based |
| name | ProgramSlot.name | e.g., "Day 1 — Lower Body" |
| weekNumber | ProgramSlot.weekNumber | 1-based |
| dayOfWeek | ProgramSlot.dayOfWeek | 1=Monday…7=Sunday; null if flexible |

**Exercise rows** within each slot are authored in a separate tab and follow the section-first model (WS-A5): WARM_UP exercises, then MAIN, then COOL_DOWN.

### 6.3 Validation Pass

The Forge Admin Import Tool runs validation before creating any draft records:

| Check | Failure Behavior |
|-------|-----------------|
| All required fields present | Import rejected; error report generated |
| description length 60–120 chars | Import rejected |
| description content rule pass | Flagged for human review; not auto-rejected |
| totalWorkouts = durationWeeks × workoutsPerWeek | Import rejected |
| No duplicate name in published programs | Import rejected |
| successorProgramName resolves to a published program | Import rejected if no match |
| sortOrder unique across published programs | Warning; not rejected (allows authoring to assign sort before publishing) |

### 6.4 Draft State

A `ProgramDefinition` created by the import tool has `publishedAt: null`. It exists in the database but does not appear in W-2 Forge Programs (the discovery query requires `publishedAt` non-null). This allows:
- Content review before athlete-facing publication
- Succession link verification
- QA of workout structure before ship

Publishing sets `publishedAt` to the current timestamp.

### 6.5 CSV Template Name Values

The following name column values reflect the current launch catalog (post-Final Lock Pass):

Programs with renamed values (from initial draft to final locked names):
- `General Physical Preparedness` → **`Athletic Conditioning Foundation`**
- `Full Body Foundation` → **`Bodyweight Foundation`**

All successor resolution must use the final locked names.

---

## Section 7 — Long-Term Roadmap

### 7.1 Year 1 Candidate Additions

Not committed. Each requires athlete demand signal validation before entering the catalog pipeline. Each must pass the standard expansion gate.

Note: Lower Body Foundation, Lower Body Intermediate, Home Strength Foundation, and Bodyweight Performance were promoted to the launch catalog by Catalog Revision Amendment (v1.2). They are no longer Year 1 candidates.

| Program | Category | Level | Env | Gap It Fills |
|---------|----------|-------|-----|-------------|
| Lower Body Advanced | HYPERTROPHY | ADVANCED | GYM | Athletes graduating Lower Body Intermediate who want continued dedicated lower-body progression before transitioning to a broader hypertrophy or strength program |
| Home Strength Intermediate | FULL_BODY | INTERMEDIATE | HOME | Home gym athletes who have completed Home Strength Foundation and need a structured intermediate resistance progression |
| Running Advanced | RUNNING | ADVANCED | OUTDOOR | Athletes graduating Running Base II who are ready for structured threshold, tempo, and race-pace training |
| 5K Starter | RUNNING | BEGINNER | OUTDOOR | Race-goal beginners who want a structured path to completing their first 5K; narrower scope than Running Base I's general base-building |

### 7.2 Long-Term Governance

**Long-term cap: 50–60 programs** before a structural UI review is required. Beyond this threshold, a flat ordered list in W-2 becomes unwieldy. A post-MVP W-2 redesign with editorial grouping (featured collection carousels, family-based sections) is required before the catalog can expand past this threshold.

**Expansion principles:**
- Every addition must fill a named, validated athlete gap
- No duplicate category + level + environment combination without explicit governance approval
- Family cap: 5 programs per family before governance review
- Catalog is not a content platform. Quantity growth is not a success metric.

**Projected trajectory:**
- Launch: 25 programs
- Year 1 (with demand validation): ~28–30 programs
- Year 2: ~35–40 programs
- Year 3: ~45–55 programs
- Long-term cap: 50–60 programs

### 7.3 Program Sharing

Program sharing for Forge Programs was introduced in MVP via Amendment PS-A1. See Section 11 for the full Program Sharing Architecture, including the `ProgramShare` entity, squad-scoped sharing, context capture rules, and future compatibility for athlete-created programs.

---

## Section 8 — Architecture Decisions

| Decision | Value |
|----------|-------|
| PE-D1 — 25-program launch catalog | 25 programs is the right balance: enough to serve all athlete types with progression ladders; not so many that the catalog feels like a content platform. Covers all 7 athlete types, all 10 goal alignments, all 4 environments. |
| PE-D2 — Succession at graduation only | "What's Next" is shown only in the Graduated state, not during Preview or Active. Displaying it earlier creates distraction (active training) or premature commitment (preview). Graduation is the natural moment to surface the next step. |
| PE-D3 — Single successor per program | Programs have one recommended successor. Branching progression would require the product to choose between paths on the athlete's behalf, which conflicts with athlete autonomy. Alternative paths are discoverable via W-2. |
| PE-D4 — No Women's program category | Women are served within existing families. Gendered programs create implicit exclusions and conflict with Product DNA's evidence-based methodology principle. The gender-neutral content rule (§4.1) ensures descriptions serve all athletes without assumption. |
| PE-D5 — Home gym gap addressed at launch | Home Strength Foundation (FULL_BODY, BEGINNER, HOME) added to launch catalog. Athletes with home equipment (adjustable dumbbells, barbell) have a dedicated Forge path. Previously identified as a Year 1 item; elevated to launch by Catalog Revision Amendment. |
| PE-D6 — Bodyweight 3-rung ladder at launch | Bodyweight Foundation → Bodyweight Strength → Bodyweight Performance covers the full beginner-to-advanced bodyweight progression. All three rungs are included at launch. The Advanced rung (Bodyweight Performance) was previously identified as a Year 1 item; elevated to launch by Catalog Revision Amendment. |
| PE-D7 — Conditioning family exception to family cap | 6 programs in the Conditioning family exceeds the governance cap. Exception approved: the 6 programs span 3 distinct sub-goals (conditioning, recomposition, hybrid) with no overlapping goals, environments, or athlete types. |
| PE-D8 — successorProgramId on ProgramDefinition, not ProgramInstance | Succession is a property of the program structure, not the athlete's relationship with it. All athletes who graduate a given program see the same recommended successor. Athlete-specific successor overrides are not supported. |
| PE-D9 — Forge Content Import Architecture via CSV pipeline | Internal toolchain ensures quality control before any program reaches athletes. Description content review, workout structure validation, and succession link resolution all happen at import time. Direct database authoring is not permitted for Forge Programs. |
| PE-D10 — Program sharing is squad-scoped and reference-based | Forge Programs are shared as references to existing ProgramDefinitions — no duplication, no new instances. Sharing creates a ProgramShare record pointing to the shared program and a destination squad. The recommendation is visible only to squad members. Public sharing and direct athlete-to-athlete sharing are post-MVP. User-created program sharing is a separate future workstream. |
| PE-D11 — shareContext captured at creation, not derived dynamically | The sharer's ProgramInstance state at the moment of sharing is captured as `shareContext` on the ProgramShare record. It is immutable. Dynamic derivation would allow the context to change retroactively (e.g., Active → Ended Early), which violates historical accuracy. |

---

## Section 9 — Validation Checklist

### Catalog
- [ ] 25 programs defined across 6 families
- [ ] 5 of 7 athlete types covered by Forge programs (Cycling and Combat deferred to creator marketplace)
- [ ] 8 of 10 goal alignments covered (IMPROVE_CYCLING and SPORT_PERFORMANCE deferred)
- [ ] All 4 environments covered
- [ ] 13 programs have `successorProgramId` set; 12 have `null`
- [ ] Succession chains are consistent: Sort 2 references Sort 1's UUID; Sort 3 references Sort 2's UUID; etc.
- [ ] Duplicate category + level + environment combinations carry approved governance exceptions: CONDITIONING family, HYPERTROPHY family (general vs. lower-body-focused), STRENGTH BEGINNER GYM pair
- [ ] 2 programs flagged `isFeatured: true` (Sorts 1 and 19)
- [ ] All names use final locked values (Athletic Conditioning Foundation, Bodyweight Foundation, Lower Body Foundation, Lower Body Intermediate, Bodyweight Performance, Home Strength Foundation)

### Content
- [ ] All FORGE program descriptions are 60–120 characters
- [ ] All descriptions pass gender-neutral content rule (§4.1)
- [ ] No gendered pronouns, no appearance-focused language
- [ ] No outcome promises in any description
- [ ] No brand or certification names in any program name or description

### Succession
- [ ] W-3 "What's Next" section renders only in Graduated state
- [ ] "What's Next" absent when `successorProgramId` is null
- [ ] "What's Next" absent when successor is unpublished
- [ ] "View Program" navigates to successor W-3 in appropriate state
- [ ] "View Program" does not create instances or fire conflict checks

### Import Architecture
- [ ] CSV template uses final locked program names for `successorProgramName` resolution
- [ ] Import tool validates: required fields, description length, totalWorkouts calculation, no duplicate names, successorProgramName resolution
- [ ] Draft programs are invisible in W-2 until `publishedAt` is set
- [ ] `source` field is immutable post-creation

### Program Sharing
- [ ] ProgramShare entity exists with all required fields
- [ ] `programDefinitionId` must reference a `source: 'FORGE'` + `publishedAt` non-null program at creation time — enforced at API level
- [ ] `sharedByAthleteId` must be a member of the squad referenced by `destinationId` — enforced at creation
- [ ] `shareContext` is auto-populated at creation from sharer's current ProgramInstance state; null if no instance (Preview state share)
- [ ] `shareContext` is immutable after creation
- [ ] ProgramShare record is immutable after creation (no edits, no deletes)
- [ ] Sharing never creates a ProgramInstance
- [ ] Sharing never duplicates a ProgramDefinition
- [ ] Sharing never modifies any ProgramInstance or ProgramInstance.state
- [ ] Share action suppressed for `ATHLETE_CREATED` and `IMPORTED` programs
- [ ] Share action suppressed when athlete belongs to 0 squads

---

## Section 10 — Non-Behaviors

| Non-Behavior | Reason |
|-------------|--------|
| No personalized program recommendations | Requires behavioral data that won't exist at MVP. Algorithmic recommendations before sufficient data erode trust. |
| No algorithm-driven succession | Succession is editorially curated, not computed. The product team owns the "what comes next" decision, not a recommendation model. |
| No athlete ability to set successor | `successorProgramId` is a Forge editorial field. Athletes do not set successors on their own programs — their programs operate independently of the Forge catalog. |
| No branching progression paths | One recommended successor per program. Complexity of multi-path progression (user choice, algorithm-driven) is post-MVP. |
| No "currently popular" or "trending" catalog sort | Social proof mechanics conflict with the curation model. The catalog is sorted editorially, not by usage signal. |
| No program ratings or reviews | An athlete's training choices are their own; anonymous ratings don't improve them. |
| No public program sharing | Sharing is squad-scoped only. No public program pages, no share links visible outside the app, no social media integration in MVP. |
| No user-created program sharing in MVP | Athlete-created and imported programs cannot be shared. The share action is gated to `source: 'FORGE'` + published programs only. User-created sharing requires a separate privacy and copy-semantics architecture. |
| No "how many athletes are running this" display | Popularity and follower counts would create social proof mechanics that conflict with the curation model. Program cards never show usage data. |

---

## Section 11 — Program Sharing Architecture

### 11.1 Overview

Program sharing allows athletes to recommend Forge Programs within their squads. Sharing is a deliberate social action — the athlete explicitly chooses to share a specific program with one or more squads. Sharing is recommendation-only: it never creates a ProgramInstance, never auto-enrolls anyone, and never modifies any existing athlete program state.

**Sharing is available only for Forge Programs** (`source: 'FORGE'`) that are published (`publishedAt` non-null). Athlete-created and imported programs cannot be shared.

### 11.2 ProgramShare Entity

```
ProgramShare {
  id:                    uuid
  sharedByAthleteId:     uuid                            // must be squad member at creation time
  programDefinitionId:   uuid                            // must reference source:FORGE + publishedAt non-null
  destinationType:       'SQUAD'                         // MVP only; future: 'ATHLETE' | 'EXTERNAL'
  destinationId:         uuid                            // squadId; sharer must be member
  message:               string | null                   // athlete-authored, max 280 chars
  shareContext:          'FUTURE' | 'ACTIVE' | 'GRADUATED' | null  // system-derived at creation; immutable
  sharedAt:              timestamp
}
```

`ProgramShare` is an immutable reference record. It is never edited or deleted after creation. It does not contain any content from `ProgramDefinition` — it points to it.

### 11.3 Share Eligibility

The "Share to Squad" action is available when ALL of the following are true:

1. `ProgramDefinition.source = 'FORGE'`
2. `ProgramDefinition.publishedAt` is non-null
3. The athlete belongs to at least one squad

The action is suppressed (overflow option not shown) when any condition is unmet.

**States from which sharing is available:** Preview, Future, Active, Graduated.
**State from which sharing is unavailable:** Ended Early. (An athlete who ended a program early should not have a social action encouraging others to start it.)

### 11.4 shareContext Capture

At `ProgramShare` creation time, the API auto-populates `shareContext` by reading the sharer's current relationship with the program:

| Sharer's State at Share Time | shareContext |
|-----------------------------|-------------|
| No ProgramInstance (Preview) | `null` |
| ProgramInstance.state = `FUTURE` | `'FUTURE'` |
| ProgramInstance.state = `ACTIVE` | `'ACTIVE'` |
| ProgramInstance.state = `GRADUATED` | `'GRADUATED'` |
| ProgramInstance.state = `ENDED_EARLY` | N/A — share action unavailable |

`shareContext` is immutable after creation. If the sharer's relationship with the program changes after sharing (e.g., they graduate it after sharing from Active state), the `ProgramShare` record retains the original context. This preserves historical accuracy and prevents retroactive context changes.

If the athlete has run the same program more than once (graduated, re-enrolled), the API reads the most recent ProgramInstance state at share creation time.

### 11.5 Share Picker — UI Summary

The share flow lives on W-3 Program Detail (full specification in W-3 v1.5). Summary:

- Access: overflow (⋯) → "Share to Squad" — visible only when share-eligible (§11.3)
- Share picker: bottom sheet with squad selector (multi-select checkboxes), optional message field (max 280 chars), Share / Cancel actions
- On confirm: creates one `ProgramShare` per selected squad, `shareContext` auto-populated by API
- On success: "Program shared with squad." toast; W-3 remains on current state
- `shareContext` is never shown in the share picker — it is a backend operation invisible to the sharing athlete

### 11.6 PROGRAM_RECOMMENDATION Feed Card — Summary

Shares surface in squad members' S-2 Squad Detail in a bounded "SQUAD PROGRAMS" section (full specification in S-2 v1.4). Summary:

- Card header: "[Athlete Name] recommended a program · [Timestamp]"
- Program embed: program name, metadata row (Forge · Category · Level · X wks), context label, athlete message (if any)
- Context label text mapping:

| shareContext | Context Label |
|-------------|--------------|
| `null` | No label. No line. Card height unchanged. |
| `'FUTURE'` | Has this program planned |
| `'ACTIVE'` | Currently running this program |
| `'GRADUATED'` | Graduated this program |

- Context label: 12sp, secondary muted. No icon, no badge. Absent entirely when `shareContext` is null.
- "View Program" → W-3 in appropriate state for the tapping athlete
- SQUAD PROGRAMS section is absent entirely when no ProgramShare records exist for the squad

### 11.7 Future Compatibility

| Future Scope | Notes |
|-------------|-------|
| Direct athlete-to-athlete sharing | `destinationType: 'ATHLETE'` is reserved. Requires privacy architecture. Post-MVP. |
| External sharing | `destinationType: 'EXTERNAL'` is reserved. Requires deep-link and onboarding architecture. Post-MVP. |
| Athlete-created program sharing | Separate workstream. Requires copy-semantics and privacy decisions for user-generated content. `source` gate at MVP prevents premature scope expansion. |
| Multiple squads in one action | The share picker multi-select creates one ProgramShare per squad. Schema already supports this. |

---

## Section 12 — Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.2 | June 2026 | Catalog Revision Amendment applied. Families reduced from 8 to 6: Cycling and Combat families removed (programs removed from launch catalog; CYCLING and COMBAT_SPORTS enums retained for athlete-created/imported programs). Removed programs: Cycling Base (old Sort 11), Cycling Development (old Sort 12), Combat Foundation (old Sort 19), Combat Conditioning (old Sort 20). Added programs: Lower Body Foundation (HYPERTROPHY, BEGINNER, GYM, Sort 9), Lower Body Intermediate (HYPERTROPHY, INTERMEDIATE, GYM, Sort 10), Bodyweight Performance (FULL_BODY, ADVANCED, HOME, Sort 21), Home Strength Foundation (FULL_BODY, BEGINNER, HOME, Sort 23). Renumbered: Running Base I → Sort 11, Running Base II → Sort 12; Bodyweight Foundation → Sort 19 (successor updated from Sort 22 to Sort 20); Bodyweight Strength → Sort 20 (successor updated from null to Sort 21). Programs with successors: 14 → 13. Terminal programs: 11 → 12. Updated §2.1 family table, §2.2 governance notes (Hypertrophy and Full Body & Home now at cap), §3.3 succession chains, §5.1 summary, §5.2 catalog table, §5.3 featured sortOrder, §5.4 athlete/environment coverage, §7.1 Year 1 candidates, §8 PE-D5 and PE-D6, §9 validation checklist. Status: LOCKED. |
| v1.0 | June 2026 | Initial specification. Defines 8 program families, succession architecture via `successorProgramId`, 25-program launch catalog with all succession chains, athlete/goal/environment coverage verification, Forge Content Import Architecture (CSV pipeline), long-term roadmap (Year 1 candidates, 50–60 program cap, projected trajectory), 9 architecture decisions, and governance rules. Created following Program Ecosystem Architecture Planning (PE-1 through PE-9) and Review Pass 002 (PE-R002) — final catalog revisions: "General Physical Preparedness" renamed to "Athletic Conditioning Foundation" (Sort 13); "Full Body Foundation" renamed to "Bodyweight Foundation" (Sort 21); gender-neutral content rule added (PE-FR3); future catalog candidates documented (PE-FR4). |
| v1.1 | June 2026 | PS-A1 amendment applied. Added Section 11: Program Sharing Architecture — ProgramShare entity definition, share eligibility rules, shareContext capture logic, UI summary (W-3 share picker), feed card summary (S-2 PROGRAM_RECOMMENDATION), and future compatibility notes. Added PE-D10 and PE-D11 to architecture decisions. Added Program Sharing validation checklist (§9). Updated §7.3 to forward-reference Section 11. Updated Non-Behaviors (§10) to include squad-scoped-only and no user-created-sharing rules. Downstream impact updated to include W-3 v1.5 share action and S-2 v1.4 feed card. |

---

*Forge Legacy Program Ecosystem Architecture — v1.2*
*June 2026*
*Authority for program family structure, succession architecture, long-term catalog roadmap, Forge Content Import Architecture, and program sharing architecture.*
