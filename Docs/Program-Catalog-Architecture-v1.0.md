# Forge Legacy — Program Catalog Architecture
## Version 1.2 | June 2026

**Status:** LOCKED
**Authority:** Program-Architecture-Amendment-001-Active-Program-Rule.md, Workout-Structure-Amendment-001 (WS-A5), Architecture-Amendment-001-Import.md, W-2 v1.1, W-3 v1.3, W-4 v1.1
**Downstream impact:** W-2 (Forge Programs section), W-3 (Program Detail), W-4 (Program Create), W-5 (Program Fork/Edit), Architecture-Amendment-001-Import.md

---

## Section 1 — Purpose

This document defines the program catalog architecture for Forge Legacy MVP. It answers:

1. What is a program, at the data model level?
2. What taxonomy describes Forge Programs (categories, levels, environments, goal alignment)?
3. What Forge Programs ship with MVP, and in what order are they displayed?
4. How does the W-2 Forge Programs section select, order, and present programs?
5. How do athlete-created, imported, and forked programs fit the same data model?
6. What content rules govern Forge Programs?

---

## Section 2 — Data Model

### 2.1 ProgramDefinition

A `ProgramDefinition` is the authored specification of a program. It exists independently of any athlete's relationship with it. Forge Programs are single shared definitions; athlete-created programs are definitions authored by one athlete.

```
ProgramDefinition {
  id:               uuid
  name:             string                        // display name, max 60 chars
  version:          string                        // display version, e.g. "v1.0"
  source:           'FORGE' | 'ATHLETE_CREATED' | 'IMPORTED'
  authorId:         uuid | null                   // null for FORGE source
  category:         ProgramCategory | null        // null for IMPORTED
  level:            'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null   // null for IMPORTED
  environment:      ProgramEnvironment | null     // null for IMPORTED
  goalAlignment:    TrainingGoal[]                // empty for IMPORTED
  durationWeeks:    number | null                 // null if schedule is not week-structured
  workoutsPerWeek:  number | null                 // null if not week-structured
  totalWorkouts:    number                        // count of ProgramSlots; always present
  description:      string | null                 // short copy for W-3/W-2 display; Forge only
  slots:            ProgramSlot[]                 // section-first per WS-A5
  isFeatured:       boolean                       // editorial curation; Forge only
  successorProgramId: uuid | null                 // recommended next program after graduation; null if no successor
  sortOrder:        number                        // display order in W-2 Forge Programs section
  publishedAt:      timestamp | null              // null = draft (Forge) or unpublished
  createdAt:        timestamp
  updatedAt:        timestamp
}
```

### 2.2 ProgramSlot

Per Workout Structure Amendment 001 (WS-A5), each slot in a program uses the section-first model:

```
ProgramSlot {
  id:               uuid
  programId:        uuid
  slotIndex:        number                        // 0-based position in program schedule
  name:             string                        // e.g., "Day 1 — Lower Body"
  weekNumber:       number | null                 // 1-based; null if not week-structured
  dayOfWeek:        number | null                 // 1=Monday…7=Sunday; null if flexible
  sections:         WorkoutSection[]              // WARM_UP | MAIN | COOL_DOWN; MAIN always present
}
```

### 2.3 ProgramInstance

A `ProgramInstance` is the athlete's relationship with a program. One instance per athlete per program (though an athlete may have multiple instances of the same definition in different states over time — e.g., graduated once, started again in a new chapter).

```
ProgramInstance {
  id:                    uuid
  athleteId:             uuid
  programDefinitionId:   uuid
  state:                 'ACTIVE' | 'FUTURE' | 'GRADUATED' | 'ENDED_EARLY'
  startedAt:             timestamp | null
  endedAt:               timestamp | null
  workoutsCompleted:     number
  currentSlotIndex:      number                   // 0-based; index of next unlogged slot
  instanceName:          string | null            // if athlete renamed their copy of the program
  createdAt:             timestamp
  updatedAt:             timestamp
}
```

State transition rules, legacy permanence, and conflict resolution are governed by Program-Architecture-Amendment-001. This document does not modify those rules.

### 2.4 Model Rationale

**Definition / Instance separation:** Forge Programs are shared definitions. If 1,000 athletes start "Strength Foundation I," one `ProgramDefinition` exists; 1,000 `ProgramInstance` records exist. This is the correct model for a curated catalog.

**Athlete-created programs:** The same separation applies. An athlete who creates a program in W-4 is the sole author of a `ProgramDefinition` with `source: 'ATHLETE_CREATED'`. Their own use of that program is one `ProgramInstance`. If program sharing is introduced post-MVP, the definition is already shareable without schema changes.

**Imported programs:** `source: 'IMPORTED'` with `category`, `level`, `environment`, and `goalAlignment` all null. Import does not infer taxonomy. The athlete may populate these fields post-import via W-5 (edit). All exercises are in the MAIN section per WS-A6.

---

## Section 3 — Program Taxonomy

### 3.1 Categories

Program categories describe what a program trains. They are distinct from Athlete Types (which describe the athlete's identity). A Strength athlete may run a Conditioning program for a phase; an athlete who identifies as General may follow a Running-focused block.

| Category | Training Focus | Primary Athlete Types |
|----------|---------------|----------------------|
| `STRENGTH` | Compound lifts, progressive overload, 1RM development | Strength, Hybrid |
| `HYPERTROPHY` | Volume-driven, muscle growth, hypertrophic adaptation | Bodybuilding, Strength |
| `CONDITIONING` | Cardiovascular base, metabolic output, work capacity | Hybrid, Combat, General |
| `RUNNING` | Structured mileage, aerobic development, running economy | Running |
| `CYCLING` | Ride volume, FTP development, cycling base | Cycling |
| `COMBAT_SPORTS` | Striking, grappling, sport-specific conditioning | Combat |
| `FULL_BODY` | Multi-modal, general physical preparedness, beginner-friendly | General, Hybrid |
| `MOBILITY` | Flexibility, injury prevention, joint health, recovery | All types |

**Rule:** A `ProgramDefinition` has exactly one `category`. Programs that genuinely span two categories should be assigned to the category that best describes the primary training stimulus.

**Athlete Type ↔ Category is not a filter rule.** Athletes see all Forge Programs regardless of their declared Athlete Type. The category is metadata for comprehension, not an access gate.

### 3.2 Levels

| Level | Target Athlete |
|-------|---------------|
| `BEGINNER` | 0–1 year of experience with this type of training. No assumed technique or strength baseline. |
| `INTERMEDIATE` | 1–3 years of experience. Familiar with the primary movement patterns. |
| `ADVANCED` | 3+ years. Understands periodization, can self-regulate intensity, advanced technique assumed. |

**Rule:** Level describes experience with the specific training style of the program — not the athlete's overall fitness history. A veteran distance runner picking up a strength program for the first time should choose a BEGINNER strength program.

### 3.3 Environments

| Environment | What It Assumes |
|-------------|----------------|
| `GYM` | Full commercial gym access: barbells, squat rack, cables, machines |
| `HOME` | No equipment or minimal equipment (dumbbells, bands, pull-up bar) |
| `OUTDOOR` | No equipment; space for running, drills, bodyweight |
| `MIXED` | Combination — some sessions require gym, others can be done anywhere |

**Rule:** A program that primarily requires a gym and has 1–2 optional outdoor sessions is still `GYM`. `MIXED` is reserved for programs that explicitly structure gym and non-gym sessions across the week.

### 3.4 Goal Alignment

Goal alignment describes the training goal the program serves. This is a soft, display-level taxonomy — it does not create a hard link to the athlete's chapter goal.

| Goal | Description |
|------|-------------|
| `BUILD_STRENGTH` | Increase maximal strength; 1RM, compound lift focus |
| `BUILD_MUSCLE` | Increase muscle mass; hypertrophic volume, progressive overload |
| `IMPROVE_ENDURANCE` | Cardiovascular and aerobic base development |
| `LOSE_FAT` | Caloric output, metabolic conditioning, body composition |
| `IMPROVE_CONDITIONING` | Work capacity, anaerobic threshold, general fitness |
| `IMPROVE_RUNNING` | Running-specific aerobic base and mileage |
| `IMPROVE_CYCLING` | Cycling-specific aerobic base and FTP |
| `IMPROVE_MOBILITY` | Flexibility, joint health, movement quality |
| `SPORT_PERFORMANCE` | Sport-specific conditioning and skill-adjacent training |
| `GENERAL_FITNESS` | Well-rounded physical capability, beginner baseline |

**Rule:** A `ProgramDefinition` may have 1–2 goal alignments. Strength programs often align to both `BUILD_STRENGTH` and `BUILD_MUSCLE`. A program with more than 2 goal alignments is probably miscategorized — it should pick a primary.

---

## Section 4 — Forge Program Content Rules

### 4.1 What Makes a Forge Program

A Forge Program is a `ProgramDefinition` with `source: 'FORGE'`. All Forge Programs are:

- Authored by the Forge Legacy product team
- Reviewed for correctness before publishing (`publishedAt` is set)
- Built on established, evidence-based training methodologies
- Named to communicate the program's core training stimulus and progression logic — not clever or branded names
- Assigned a version number starting at `v1.0`

**Forge Programs do not:**
- Require the athlete to have any other program state
- Reference specific equipment brands
- Promise specific physical outcomes (no "Lose 10lbs in 6 weeks")
- Use fitness influencer or certification brand names

### 4.2 Required Fields for Forge Programs

All `FORGE` source programs must have:

| Field | Requirement |
|-------|------------|
| `name` | Required. Clear, descriptive, non-branded. |
| `version` | Required. Starts at "v1.0". |
| `category` | Required. Exactly one category. |
| `level` | Required. Exactly one level. |
| `environment` | Required. Exactly one environment. |
| `goalAlignment` | Required. 1–2 goal alignments. |
| `durationWeeks` | Required. |
| `workoutsPerWeek` | Required. |
| `totalWorkouts` | Required. Must equal `durationWeeks × workoutsPerWeek`. |
| `description` | Required. 60–120 characters. One sentence. What the program trains and for whom. |
| `slots` | Required. All slots must have at least a MAIN section. |
| `isFeatured` | Required. Default `false`; editorial flag set by product team. |
| `sortOrder` | Required. Integer ≥ 1. Lower number = displayed first in W-2. |
| `publishedAt` | Required at ship time. Null during authoring draft phase. |

### 4.3 Description Guidelines

The program description appears in W-2 (Forge Program card subtitle) and W-3 (Program Detail header). It should:

- Lead with the primary training goal
- Name the experience level the program targets
- Fit in 60–120 characters
- Not include special formatting or lists

**Good examples:**
> "A beginner strength program built around the five fundamental barbell movements."
> "An 8-week hypertrophy block for intermediate lifters using undulating volume periodization."
> "A 12-week base-building plan for new runners building to consistent 5k mileage."

**Bad examples:**
> "Get strong!" (too vague)
> "Transform your physique in just 8 weeks with our proven system." (marketing copy, outcome promise)
> "Advanced, Intermediate or Beginner — this program works for anyone!" (no level signal)

### 4.4 Description Content Rule — Gender-Neutral, Athlete-Centered Language

Forge Program descriptions must use athlete-centered, gender-neutral language. Descriptions must avoid assumptions regarding sex, gender, body type, appearance goals, or training motivation.

Descriptions should explain:
- What the program trains (movement patterns, energy systems, muscle groups)
- How the athlete trains (frequency, structure, methods)
- What the athlete develops (strength, conditioning capacity, endurance, mobility)

Descriptions must not define who the athlete is. Goals are described in training terms, not appearance terms. No gendered pronouns. No appearance-focused language ("lean," "toned," "bulk").

This rule applies to all `FORGE`-sourced `ProgramDefinition` records. Athlete-created and imported programs are exempt.

### 4.5 Versioning

Forge Programs are versioned. Version updates require a new `ProgramDefinition` record with a new version string (e.g., `v1.1`, `v2.0`).

Athletes with an active or future `ProgramInstance` referencing the previous version are NOT automatically migrated. Their instance continues against the version they started. The new version appears in the Forge Programs section as a distinct program for athletes who have not yet started it.

This preserves the integrity of the athlete's historical record — the program they ran is the program they ran, not a retrospectively updated version.

---

## Section 5 — MVP Forge Program Catalog

### 5.1 Catalog Scope

The MVP catalog ships with **25 Forge Programs** across 6 families, covering all 4 Environments. Cycling and Combat Sports athlete types are intentionally deferred to the creator marketplace — Forge does not author programs in these categories at launch. The goal alignments IMPROVE_CYCLING and SPORT_PERFORMANCE are uncovered at launch; they are reserved for creator-supplied programs. The catalog provides a starting point and progression path for the highest-demand Forge-owned training goals, not an exhaustive library.

### 5.2 Launch Catalog

| Sort | Program Name | Category | Level | Env | Wks | /Wk | Goal Alignment | Successor |
|------|-------------|----------|-------|-----|-----|-----|----------------|-----------|
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

**Succession links** are implemented via `successorProgramId` on each `ProgramDefinition`. The "Successor" column shows the sortOrder of the recommended next program in W-3's "What's Next" section (Graduated state only). "—" indicates a terminal program with no successor.

### 5.3 Featured Programs (MVP)

Two programs carry `isFeatured: true` in the MVP launch catalog. Featured programs are not rendered differently in W-2 (no visual badge) for MVP — the `isFeatured` flag is reserved for future editorial surfaces (e.g., a "Featured" carousel in a post-MVP W-2 redesign). Featured status informs sort order: featured programs sort first within their tier.

**Featured at launch:**
- **Strength Foundation I** (sortOrder: 1) — most broadly applicable strength program for new athletes
- **Bodyweight Foundation** (sortOrder: 19) — broadest appeal; no equipment barrier

### 5.4 Catalog Expansion Policy

Post-MVP additions must pass a content gate:

| Requirement | Rule |
|-------------|------|
| Fills a catalog gap | Does not duplicate an existing program's category + level + environment combination |
| Evidence-based methodology | Methodology must be cited or established |
| Fits the schema | All required fields completable |
| Description reviewable | Description meets content guidelines (§4.3) |
| Reviewed by product team | Not community-submitted or user-generated |

The catalog has no maximum size, but each addition must justify its presence against the "curated starting point" principle. At 50–60 programs, a structural UI review is required before further expansion (editorial grouping architecture becomes necessary).

**Future catalog candidates** (post-launch; each requires athlete demand signal validation):

| Program | Family | Gap Addressed |
|---------|--------|---------------|
| Lower Body Advanced | HYPERTROPHY | Athletes graduating Lower Body Intermediate who want continued dedicated lower-body progression before transitioning to a broader hypertrophy program |
| Home Strength Intermediate | FULL_BODY | Home gym athletes with dumbbells or barbell who have completed Home Strength Foundation and need an intermediate strength progression |
| Running Advanced | RUNNING | Athletes graduating Running Base II who are ready for structured threshold, tempo, and race-pace training |
| 5K Starter | RUNNING | Race-goal beginners wanting a structured path to their first 5K; narrower scope than Running Base I's general base-building |

Note: Lower Body Foundation and Lower Body Intermediate, Home Strength Foundation, and Bodyweight Performance were promoted from earlier Year 1 candidate lists to the launch catalog by Catalog Revision Amendment (v1.2).

---

## Section 6 — Discovery Model (W-2 Forge Programs Section)

### 6.1 What Appears in the Section

The Forge Programs section in W-2 displays all `FORGE` source programs where:

1. `publishedAt` is not null (published)
2. The athlete does not have an existing `ProgramInstance` for this `programDefinitionId` in any state (Active, Future, Graduated, or Ended Early)

**A program is absent from the section once the athlete has any instance of it.** "Already started" (including saved to Future) removes the program from the discovery surface. The athlete finds their own programs in the Upcoming and Legacy sections.

### 6.2 Display Order

Programs appear in ascending `sortOrder`. Within the same `sortOrder` value (which should not occur in a maintained catalog), alphabetical by name.

**Featured programs do not receive a separate visual treatment in W-2 MVP.** Their `isFeatured: true` is expressed only through their `sortOrder` (they sort first).

### 6.3 Section Absent When Empty

If all Forge Programs have been added to the athlete's collection (or none are published), the Forge Programs section is absent from W-2. No placeholder. Per W-2 §7.5.

### 6.4 Filtering — Not in MVP

W-2 does not provide filter or search controls for the Forge Programs section in MVP. The section shows all available programs in order. With a 10-program catalog, a flat ordered list is sufficient. Filtering architecture is deferred to post-MVP.

**Post-MVP consideration:** Filter by category, level, environment. These fields are designed into the schema now so the discovery layer can adopt them without a migration.

### 6.5 Forge Program Card Display

The W-2 Forge Program card (defined in W-2 §7.2) displays:

```
┌────────────────────────────────────────────────────────┐
│  [Program Name — 16sp, primary]                       │
│  [Duration] · [Category/Level]          Forge         │  ← "Forge" badge, secondary muted
└────────────────────────────────────────────────────────┘
```

**Duration format:** "[X] weeks · [Y] workouts/wk" — e.g., "8 weeks · 3 workouts/wk"
**Category/Level format:** "[Category display name] · [Level display name]" — e.g., "Strength · Beginner"

The program description is NOT shown on the W-2 card. It appears only on W-3 Program Detail (preview state).

### 6.6 Display Name Mapping

| Enum Value | Display Name |
|-----------|-------------|
| `STRENGTH` | Strength |
| `HYPERTROPHY` | Hypertrophy |
| `CONDITIONING` | Conditioning |
| `RUNNING` | Running |
| `CYCLING` | Cycling |
| `COMBAT_SPORTS` | Combat Sports |
| `FULL_BODY` | Full Body |
| `MOBILITY` | Mobility |
| `BEGINNER` | Beginner |
| `INTERMEDIATE` | Intermediate |
| `ADVANCED` | Advanced |
| `GYM` | Gym |
| `HOME` | Home |
| `OUTDOOR` | Outdoor |
| `MIXED` | Mixed |

---

## Section 7 — Athlete-Created Programs

### 7.1 Schema Application

Programs created via W-4 (Program Create) are `ProgramDefinition` records with `source: 'ATHLETE_CREATED'`. The fields that differ:

| Field | Value for ATHLETE_CREATED |
|-------|--------------------------|
| `source` | `'ATHLETE_CREATED'` |
| `authorId` | The creating athlete's ID |
| `category` | Optional — athlete may or may not set this |
| `level` | Optional — athlete may or may not set this |
| `environment` | Optional |
| `goalAlignment` | Optional |
| `description` | Null — athletes do not write descriptions for W-2 display |
| `isFeatured` | Always `false` — editorial flag never set for athlete-created programs |
| `sortOrder` | Null — not relevant; athlete-created programs don't appear in Forge Programs section |
| `publishedAt` | Null — not a published catalog program; `createdAt` is the relevant timestamp |

### 7.2 W-2 Display

Athlete-created programs appear in the Upcoming section (Future state), Active section, or Legacy Programs section per their `ProgramInstance.state`. They do NOT appear in the Forge Programs section.

**Card display:** Name, version, state label. Category/Level/Environment are not shown on the card even if the athlete populated them (these are metadata fields for the athlete's own organization, not display fields for W-2).

### 7.3 Forked Programs

A program forked via W-5 creates a new `ProgramDefinition` with `source: 'ATHLETE_CREATED'` and the athlete as author. The fork is distinct from its source definition — changes to the fork do not affect the source. The fork starts in `Future` state for the athlete who forked it.

---

## Section 8 — Imported Programs

### 8.1 Schema Application

Programs created via the import flow (Architecture-Amendment-001-Import.md) are `ProgramDefinition` records with `source: 'IMPORTED'`. The fields that differ:

| Field | Value for IMPORTED |
|-------|-------------------|
| `source` | `'IMPORTED'` |
| `authorId` | The importing athlete's ID |
| `category` | `null` — not inferred at import time |
| `level` | `null` |
| `environment` | `null` |
| `goalAlignment` | `[]` (empty) |
| `description` | `null` |
| `slots` | All exercises in MAIN section only (WS-A6) |
| `isFeatured` | `false` |
| `sortOrder` | `null` |
| `publishedAt` | `null` |

### 8.2 Post-Import Enrichment

After import, the athlete may edit the imported program via W-5. Editing may populate `category`, `level`, `environment`, and `goalAlignment`. The `source` field remains `'IMPORTED'` even after editing — it records the origin of the program, not its current classification state.

### 8.3 W-2 Display

Same as athlete-created: imported programs appear in Upcoming, Active, or Legacy Programs per their instance state. Not in Forge Programs section.

---

## Section 9 — W-3 Program Detail — Catalog-Relevant Additions

W-3 (Program-Detail-Wireframe-Spec-W3.md) displays the program detail for any program the athlete taps. The Program Catalog Architecture adds the following display rules for W-3:

### 9.1 Program Metadata Block (Forge Programs — Preview State)

When the athlete views a Forge Program in preview state (from W-2 Forge Programs section), W-3 displays a metadata block below the program name:

```
┌────────────────────────────────────────────────────────┐
│  [Program Name — 22sp, primary weight]                 │
│  Forge Program   ·   v1.0                              │  ← source badge + version
│  [Category] · [Level] · [Environment]                  │  ← taxonomy metadata
│  [Duration] weeks · [Workouts/wk] sessions/wk          │  ← duration metadata
│                                                        │
│  [Description — 15sp, secondary, up to 2 lines]        │
└────────────────────────────────────────────────────────┘
```

- "Forge Program" label — secondary, muted — distinguishes source
- Category / Level / Environment — secondary, muted — all on one line if space allows; wrap if not
- Description — present only for Forge Programs with a non-null description

### 9.2 Program Metadata Block (Athlete-Created / Imported — All States)

For athlete-created or imported programs, the metadata block is simplified:

```
[Program Name — 22sp, primary weight]
[version]
```

- No source label (unnecessary — the athlete knows it's their program)
- Category / Level / Environment shown only if athlete populated them
- No description

### 9.3 Goal Alignment Display

Goal alignments are not displayed on W-2 or W-3 for MVP. They are stored in the schema and reserved for post-MVP features (program search/filter, recommendation logic, chapter-goal matching).

---

## Section 10 — Architecture Decisions

| Decision | Value |
|----------|-------|
| PC-D1 — Definition/Instance separation | `ProgramDefinition` (the spec) and `ProgramInstance` (the athlete's relationship) are distinct entities. This allows Forge Programs to be shared definitions rather than per-athlete copies. Post-MVP sharing is additive without a schema migration. |
| PC-D2 — Source field | `source: 'FORGE' \| 'ATHLETE_CREATED' \| 'IMPORTED'` tracks program origin permanently. This field is immutable after creation — editing a program does not change its source. |
| PC-D3 — No taxonomy for imported programs | Import does not infer category, level, environment, or goal alignment. Inference would be unreliable and could surface incorrect metadata in discovery. Athletes who want taxonomy on imported programs edit via W-5. |
| PC-D4 — 25-program MVP catalog | The launch catalog is intentionally curated. The product is not a content platform. 25 programs cover 5 of 7 Athlete Types with Forge-owned paths, all 4 Environments, and include full progression ladders for Strength, Hypertrophy, Lower Body, Running, Bodyweight, and Mobility. Cycling and Combat Sports are deferred to the creator marketplace. Quality over quantity. |
| PC-D5 — No filtering in W-2 MVP | 25 programs do not require filter controls for MVP. The catalog is discoverable in a short ordered list. Filtering architecture is reserved for post-MVP when catalog expands toward 30+. The taxonomy fields (category, level, environment) are designed into the schema now so the discovery layer can adopt them without a migration. |
| PC-D6 — isFeatured is reserved | The `isFeatured` flag is designed into the schema now but has no visible effect in MVP display. It enables editorial surfaces (featured carousel, etc.) to be added post-MVP without a data migration. |
| PC-D7 — Description is display copy, not a field athletes write | Athletes creating programs in W-4 do not write descriptions. The description field is for Forge Programs in the discovery surface. Athlete-created programs are already known to their author. |
| PC-D8 — Goal alignment not displayed MVP | Goal alignment is stored but not surfaced in the W-2 or W-3 UI for MVP. It's designed for future matching between chapter goals and suggested programs. Displaying it now without a matching layer would add noise without function. |
| PC-D9 — Version integrity | When a Forge Program is updated, existing athlete instances reference the original version. Forced migration would rewrite the athlete's historical record — a violation of "History Cannot Be Rewritten." Athletes who want the updated version must start a new instance. |

---

## Section 11 — Non-Behaviors

This architecture does not and will never include:

| Non-Behavior | Reason |
|-------------|--------|
| Community-submitted programs | Forge Legacy is not a content platform. Programs serve the athlete's transformation, not a creator economy. |
| Marketplace or paid programs | Content monetization conflicts with the product's trust model — the athlete should never wonder if a program exists because someone paid to be there. |
| Program search | Not needed for MVP catalog; post-MVP consideration if catalog grows beyond 30 programs. |
| Personalized program recommendations | Recommendation engines require behavioral data that won't exist at MVP. Algorithmic recommendations before sufficient data produces low-quality matches that erode trust. |
| Program rating or reviews | Social proof mechanics conflict with the program's role as a personal tool. An athlete's decision about which program to follow is not meaningfully informed by a stranger's rating. |
| Program duration "streaks" or pressure copy | No "You've missed N sessions" or "Only X days to complete" language. The athlete's relationship with their program is their own. |
| Automatic program suggestions at chapter creation | Chapters and programs are independent. The chapter system does not prescribe programs. |

---

## Section 12 — Validation Checklist

### Data Model
- [ ] `ProgramDefinition` entity distinct from `ProgramInstance`
- [ ] `source` field: `FORGE`, `ATHLETE_CREATED`, or `IMPORTED` — immutable
- [ ] `slots: ProgramSlot[]` with section-first model per WS-A5
- [ ] `successorProgramId: uuid | null` present on all `ProgramDefinition` records
- [ ] Imported programs: `category`, `level`, `environment`, `goalAlignment` all null
- [ ] `isFeatured` only ever `true` for FORGE source programs

### Taxonomy
- [ ] 8 categories defined; each program has exactly one
- [ ] 3 levels: BEGINNER, INTERMEDIATE, ADVANCED
- [ ] 4 environments: GYM, HOME, OUTDOOR, MIXED
- [ ] 10 goal alignments; programs have 1–2

### Forge Programs
- [ ] All required fields present and non-null
- [ ] Description: 60–120 characters, one sentence
- [ ] `totalWorkouts` = `durationWeeks × workoutsPerWeek`
- [ ] `publishedAt` set before ship; null during draft
- [ ] `sortOrder` unique and ascending

### MVP Launch Catalog
- [ ] 25 Forge Programs defined across 6 families
- [ ] 5 of 7 Athlete Types covered by Forge programs (Cycling and Combat deferred to creator marketplace)
- [ ] 8 of 10 Goal Alignments covered (IMPROVE_CYCLING and SPORT_PERFORMANCE deferred to creator marketplace)
- [ ] All 4 Environments covered
- [ ] 2 programs flagged `isFeatured: true` (Strength Foundation I, Bodyweight Foundation — now at sortOrder 19)
- [ ] Succession links: 13 programs have `successorProgramId` set; 12 terminal programs have `null`
- [ ] Duplicate category + level + environment combinations carry governance exceptions: CONDITIONING family (3 sub-goals approved), HYPERTROPHY family (general vs. lower-body-focused approved), existing STRENGTH BEGINNER GYM pair carried forward

### W-2 Discovery
- [ ] Forge Programs section shows only programs where athlete has no existing instance
- [ ] Sort by `sortOrder` ascending
- [ ] Card: name, duration, category/level display, "Forge" badge
- [ ] Section absent when no available Forge Programs
- [ ] No filtering UI in MVP

### W-3 Metadata Block
- [ ] Forge Programs: "Forge Program" label, version, category, level, environment, description
- [ ] Athlete-created: version only; optional category/level/environment if populated
- [ ] Goal alignments not displayed MVP

### Content Rules
- [ ] No outcome promises in descriptions
- [ ] No brand or certification names
- [ ] Level is specific to training type, not overall fitness history
- [ ] Methodology is established or evidence-cited
- [ ] Descriptions use gender-neutral, athlete-centered language per §4.4
- [ ] No gendered pronouns, no appearance-focused language in any Forge Program description

---

## Section 13 — Downstream Impact

| File | Impact |
|------|--------|
| `Program-Browse-Wireframe-Spec-W2.md` | §7.2 Forge Program card: add duration + category/level display to card subtitle format. §7.3 Source lock unchanged. |
| `Program-Detail-Wireframe-Spec-W3.md` | §4 (or new section): add Forge Program metadata block for preview state. Add category/level/environment/description display rules. |
| `Program-Creation-Wireframe-Spec-W4.md` | Schema update: W-4 creates a `ProgramDefinition` with `source: 'ATHLETE_CREATED'`. Optional fields: category, level, environment. No description field for athlete-created programs. |
| `Program-Fork-Edit-Wireframe-Spec-W5.md` | Post-import and post-fork editing may populate category/level/environment/goalAlignment fields. |
| `Architecture-Amendment-001-Import.md` | Imported programs: `source: 'IMPORTED'`; all taxonomy fields null. Already documented in WS-A6 (MAIN section mapping). Schema clarification only. |

---

## Section 14 — Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.2 | June 2026 | Catalog Revision Amendment applied. Removed Cycling Base (Sort 11), Cycling Development (Sort 12), Combat Foundation (Sort 19), Combat Conditioning (Sort 20) — deferred to creator marketplace. Added Lower Body Foundation (HYPERTROPHY, BEGINNER, GYM, Sort 9), Lower Body Intermediate (HYPERTROPHY, INTERMEDIATE, GYM, Sort 10), Bodyweight Performance (FULL_BODY, ADVANCED, HOME, Sort 21), Home Strength Foundation (FULL_BODY, BEGINNER, HOME, Sort 23). Renumbered: Running Base I → Sort 11, Running Base II → Sort 12; Bodyweight Foundation → Sort 19; Bodyweight Strength → Sort 20 (successor updated to Bodyweight Performance). Programs with successors reduced from 14 to 13; terminal programs increased from 11 to 12. CYCLING and COMBAT_SPORTS category enums retained for athlete-created and imported programs. Updated §5.1 scope description, §5.3 featured sortOrder, §5.4 future candidates, §10 PC-D4, §12 validation checklist. Status: LOCKED. |
| v1.1 | June 2026 | Final lock pass. Added `successorProgramId: uuid \| null` to `ProgramDefinition` schema — implements progression architecture for W-3 "What's Next" section. Expanded launch catalog from 10 to 25 programs across 8 families, with succession links for 14 programs. Two program renames: "General Physical Preparedness" → "Athletic Conditioning Foundation" (Sort 13), "Full Body Foundation" → "Bodyweight Foundation" (Sort 21). Added §4.4 gender-neutral description content rule. Updated §5.3 featured programs. Updated §5.4 catalog expansion policy with future candidate list. Updated PC-D4 and PC-D5. Status: LOCKED. |
| v1.0 | June 2026 | Initial specification. Defines `ProgramDefinition` and `ProgramInstance` data model. Establishes 8-category, 3-level, 4-environment, 10-goal-alignment taxonomy. Specifies 10-program MVP launch catalog with sort order and featured flags. Defines W-2 Forge Programs discovery rules. Defines W-3 metadata block for Forge Programs. Defines content rules, description guidelines, versioning policy, and catalog expansion policy. Aligns imported and athlete-created programs to same schema. Establishes 9 architecture decisions. |

---

*Forge Legacy Program Catalog Architecture — v1.2*
*June 2026*
*Authority for all Forge Program catalog, discovery, and taxonomy decisions.*
