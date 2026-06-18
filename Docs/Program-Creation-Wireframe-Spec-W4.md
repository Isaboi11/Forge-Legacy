# Forge Legacy — Program Creation Wireframe Specification
## W-4 | Phase 2B | Version 1.1 — June 2026

**Authority:** Program-Architecture-Amendment-001-Active-Program-Rule.md
**PRD Authority:** Section 11 (Program System), Section 5 (MVP — W-4), Section 8 (Workout System)

---

## Preamble: What W-4 Is For

W-4 is the athlete-owned program creation surface. It gives an athlete the ability to design a structured training path from scratch — naming it, describing it, and building an ordered sequence of workouts that will become the program's record as the athlete progresses through it.

W-4 is not a scheduling tool, a periodization engine, or an exercise prescription builder. It is a naming and sequencing surface. The athlete decides what to call each workout and in what order to do them. Execution details are filled in live during each logging session.

**What W-4 creates:**
Every program created in W-4 is athlete-owned and begins in Future state. It appears immediately in W-2 Upcoming Programs and is accessible from W-3 Program Detail.

**What W-4 does not create:**
- Forge Programs — those are system-created and managed outside the product interface
- Imported programs — those arrive via W-IM-4 Import Confirm
- Forked programs — those are created from W-5 Fork/Edit on an existing program

**W-4 is entered from:**
- W-2 Program Browse — "+ Create" action in Top App Bar
- W-2 Empty invitation card — "+ Create" CTA (when no active program exists)
- M-4 Program Graduation Modal — "Create New Program" option

**W-4 navigates to:**
- W-3 Future state — upon successful program creation
- W-2 — on cancel/discard (with confirmation if data was entered)

---

## Section 1 — W-4 Goals

W-4 exists to accomplish four things:

1. **Enable intentional program design** — give the athlete a clear, focused surface to design their training path without friction or cognitive overload
2. **Produce a complete Future program record** — the output of W-4 is a valid, well-formed Future state program ready to be started from W-3
3. **Enforce minimum viable structure** — prevent incomplete program shells (name-only stubs without any workouts) from entering the system
4. **Respect the complexity guardrail** — program creation must remain accessible on a phone in a few focused minutes; it must not feel like building a spreadsheet

**What W-4 does NOT do:**
- Schedule workouts on specific calendar days
- Prescribe exercises, sets, reps, or weights
- Set rest days or recovery intervals within the program structure
- Allow selection from Forge Program templates
- Import structured training data (that is W-IM-1 through W-IM-4)
- Create programs in any state other than Future

---

## Section 2 — Architecture Decision Record

The following five decisions are resolved in this specification and are locked upon approval.

### Decision 1 — Program Creation Model

**Resolved: Blank program from scratch only (MVP).**

Athletes create programs by naming them and adding workout entries. There is no "start from a Forge template" path in W-4. Forge Programs are system-curated and displayed in W-2 for browsing; athletes interact with them via W-3 (Preview state → Save or Start). Template-based creation is Post-MVP.

**Why:** Template selection adds a secondary navigation layer to an already form-heavy screen. For MVP, the creation model is: the athlete brings their own program design. Forge Programs serve the discovery/browse use case. These are two distinct flows and should not be merged.

**Post-MVP:** Allow "Start from Forge Program" path in W-4 or W-5 that pre-populates the workout list from a selected Forge Program.

---

### Decision 2 — Workout Population and Slot Data Model

**Resolved: Inline creation in W-4 (MVP). Copy-semantics with origin tracking as the permanent slot architecture.**

**Workout Slot Data Model**

Every program workout slot has the following structure:

```
{
  name: string            // required
  type: ActivityType?     // optional — maps to W-9–W-16 activity types
  originTemplateId: string?  // optional — null for all W-4 MVP slots
  sections: WorkoutSection[]  // added by W-24; initialized with one MAIN section on creation
}
```

`sections[]` is the section-first exercise container, defined by Workout Structure Amendment 001 (WS-A5). Each slot is initialized at creation with `sections: [{ type: 'MAIN', exercises: [] }]` — one required Main Workout section with no exercises. The athlete populates section content via W-24 Workout Builder after program creation.

```
WorkoutSection {
  type:      'WARM_UP' | 'MAIN' | 'COOL_DOWN'
  exercises: ExercisePrescription[]
}
```

The `ExercisePrescription` entity is defined in W-24 § 7.6 (LOCKED + WS-A1 amendment applied).

`originTemplateId` is lineage metadata, not a live reference. It records which Workout Template (W-6/W-7) a slot was composed from. The program slot owns its own data from the moment of creation. This field is present in the schema from day one — no migration required when Post-MVP template selection is added.

**W-4 MVP: Inline creation only**

Workout entries are created directly in the program creation form. Each entry requires a name and optionally a type tag. Athletes cannot select from saved Workout Templates (W-6/W-7) during program creation in MVP. All slots created in W-4 have `originTemplateId: null`.

**Why inline only for MVP:**
Template selection requires a picker/list sheet (pulling from W-6 Workout Template library), adding a navigation layer and a secondary data dependency. The inline creation approach keeps the form self-contained and fast. The complexity guardrail prohibits building a spreadsheet — prescriptive template selection is a step toward that anti-pattern.

**Copy-semantics rule — permanent, applies to all creation surfaces:**
When a Workout Template is used to populate a program slot (Post-MVP), the template's data is copied into the slot at composition time. The slot is independent from that moment. Editing the source template after composition never modifies the existing slot. There are no live template references in the program data model. This rule protects "History Cannot Be Rewritten" at the data layer.

**`originTemplateId` is lineage metadata only:**
Its purpose is to enable future features — environment variant swapping, template-to-slot sync options — by recording which template a slot was composed from. It does not create a dependency. The slot can exist, be edited, and be executed without any reference to the origin template. If the origin template is deleted, the slot is unaffected.

**Import behavior:**
Slots created via the import pipeline (W-IM-4) have `originTemplateId: null` unless the athlete explicitly links them to a template in a future workflow. Import creates self-contained slots — no template lookup or matching occurs automatically.

**Fork behavior:**
When a program is forked in W-5, all slots are copied into the new program. `originTemplateId` values are preserved as-is on each copied slot — they record original template lineage, not lineage from the fork source program.

**Post-MVP:**
Allow athletes to select from saved Workout Templates when adding workouts to a program in W-4 or W-5. On selection, template data is copied into the slot and `originTemplateId` is set to the selected template's ID. The MVP data model already supports this without schema migration.

---

### Decision 3 — Minimum Program Requirements

**Resolved: Program name + at least one workout entry with a name.**

A program cannot be created with a name alone. At least one workout entry is required. Duration, description, and type/focus are optional.

**Why:** A name-only program is a shell — it has no training path. It cannot be started meaningfully (W-3 Active state shows a workout list; an empty list is incoherent). Requiring at least one workout enforces minimum structural integrity.

---

### Decision 4 — Drafts

**Resolved: No draft programs for MVP.**

W-4 has two outcomes: completed creation (program saved to Future state) or abandoned creation (discarded). If an athlete navigates away after entering any data, a discard confirmation fires. No program is created unless the athlete completes creation.

**Why:** Draft support requires a draft storage model, draft recovery UI, draft status in W-2 (a sixth program state or a separate display), and stale draft handling. This is a meaningful systems investment. For MVP, the cost exceeds the benefit. Most creation sessions complete in one sitting. Athletes who need to stop can complete the minimum requirements (name + one workout), save, and continue in W-5.

**Consequence acknowledged:** If an athlete abandons W-4 with significant work done, that work is lost. The discard confirmation manages this risk.

---

### Decision 5 — Versioning

**Resolved: All athlete-created programs begin at v1.0.**

Version numbers are system-assigned at creation and are not editable by the athlete.

| Action | Version Result |
|--------|---------------|
| W-4 creates new program | v1.0 |
| W-5 edits existing Future program (before first workout logged) | v1.0 — no bump; in-place modification |
| W-5 forks existing program | New independent program, v1.0 |
| Import via W-IM-4 creates program | v1.0 |

**Why in-place edits don't bump version:** W-5 editing only operates on Future programs that have never been started. No history record references v1.0 yet. Version bumping is meaningful only when a history record already references a prior version. At Future state, no such reference exists.

---

## Section 3 — Information Hierarchy

The form hierarchy reflects the athlete's natural design sequence:

**TIER 1 — Program Identity**
Program name (required). The first and most important thing an athlete gives a program. The dominant field.

**TIER 2 — Program Metadata**
Duration (optional), Type/Focus (optional). Supporting context that categorizes the program for display in W-2 and W-3 cards.

**TIER 3 — Program Description**
Narrative description of what the program is and who it is for (optional). Positioned between metadata and the workout list.

**TIER 4 — Workout List**
The ordered sequence of workouts that makes up the program's training path. Required: at least one entry with a name.

**TIER 5 — Create Action**
Enabled only when minimum requirements are met (name + at least one named workout). Positioned at the bottom of the scroll after the workout list.

---

## Section 4 — Screen Layout

W-4 is a navigation stack screen with a single vertical scroll. No tabs, no step indicators, no wizard. The form is presented in full — the athlete sees the entire structure at once and fills it in at their own pace.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  ✕   Create Program                       [  Create  ]  │  ← Top App Bar
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Program Name                                           │  ← Label, 13sp, secondary
│  ┌─────────────────────────────────────────────────┐    │
│  │  e.g., "Push-Pull Legs 6-Day Split"             │    │  ← Name field, placeholder
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Duration (Optional)                                    │  ← Label, 13sp, secondary
│  [4 wks] [6 wks] [8 wks] [10 wks] [12 wks] [16 wks]   │  ← Chip row, none selected by default
│                                                         │
│  Type / Focus (Optional)                                │  ← Label, 13sp, secondary
│  [Strength] [Endurance] [Mobility] [Full Body] [Other]  │  ← Chip row, none selected by default
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Description (Optional)                                 │  ← Label, 13sp, secondary
│  ┌─────────────────────────────────────────────────┐    │
│  │  What is this program for? Who is it designed   │    │  ← Placeholder
│  │  for?                                            │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  WORKOUTS                                               │  ← Section label, 11sp, all caps, muted
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [Before any entry exists — empty state:]               │
│     Add your first workout to build the program's path. │
│                                                         │
│  [After entries exist:]                                 │
│  ≡  1   [Workout Name — 15sp]    [Type — 12sp]   [✕]   │  ← Workout row
│  ≡  2   [Workout Name — 15sp]    [Type — 12sp]   [✕]   │
│  ≡  3   [Workout Name — 15sp]    [Type — 12sp]   [✕]   │
│  ...                                                    │
│                                                         │
│  [  + Add Workout  ]                                    │  ← Always visible
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [  Create Program  ]                                   │  ← Primary CTA (disabled until valid)
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Top App Bar:**
- Left: ✕ (close/discard) — fires discard confirmation if any data has been entered
- Center: "Create Program" — static title
- Right: "Create" text button — disabled until minimum requirements met; triggers same logic as "Create Program" CTA

**Notes:**
- Program Name field auto-focuses on screen entry; keyboard opens immediately
- Duration and Type/Focus chips: single-select, tap to select, tap again to deselect
- Description field: multi-line, expands to 4 lines before scrolling internally
- Workout rows: drag handle (≡) for reorder, ✕ for delete, full row tappable to edit
- "Create Program" CTA and "Create" in top bar are both disabled until name is non-empty and at least one named workout entry exists

---

## Section 5 — Program Metadata

### 5.1 Duration (Optional)

Displayed in W-2 and W-3 cards as part of the program metadata row ("[X] Workouts · [Duration] · [Type/Focus]").

**Options (chip row, single-select):**
- 4 Weeks
- 6 Weeks
- 8 Weeks
- 10 Weeks
- 12 Weeks
- 16 Weeks

**Default:** None selected.

**Display behavior:**
- If none selected: duration is absent from W-2/W-3 metadata row; no placeholder, no "—"
- Duration is a label, not a calendar constraint — the system does not enforce completion within the designed duration

**Why predefined options, not free text:**
Free text invites inconsistent values ("8 weeks," "2 months," "56 days," "~8wks"). Predefined chips produce clean, consistent metadata that displays reliably across cards.

**Post-MVP:** Custom duration option ("Custom: [X] weeks") for programs outside the standard set.

### 5.2 Type / Focus (Optional)

Displayed in W-2 and W-3 cards alongside duration.

**Options (chip row, single-select):**
- Strength
- Endurance
- Mobility
- Full Body
- Other

**Default:** None selected.

**Display behavior:**
- If none selected: type/focus absent from W-2/W-3 metadata row
- "Other" displays as-is on cards — no custom text entry in MVP

**Post-MVP:** Custom type/focus text entry.

---

## Section 6 — Program Naming Rules

- **Required.** Form cannot be submitted without a program name.
- **Maximum length:** 60 characters. Input is blocked at 60. Character counter appears when input is 50–60 characters.
- **Minimum length:** 1 non-whitespace character. Whitespace-only names are treated as empty.
- **Character set:** Unrestricted (letters, numbers, punctuation, emoji allowed).
- **Uniqueness:** Not enforced. An athlete may have multiple programs with the same name (e.g., two instances of "Hypertrophy Block" — one Graduated, one Future). This is valid and expected — the same program run twice is the story, not an error.
- **Placeholder text:** e.g., "Push-Pull Legs 6-Day Split" — disappears on focus.

**Display in W-2 and W-3:**
Program name is the primary visual element in all contexts. W-3 defines display at 22sp primary weight, wrapping to 2 lines maximum with ellipsis. W-2 cards display at 16–18sp, 2-line maximum.

---

## Section 7 — Program Description Rules

- **Optional.** Form may be submitted without a description.
- **Maximum length:** 500 characters. Input blocked at 500. Character counter appears at 450–500 characters.
- **Multi-line:** Field expands up to 4 lines before scrolling internally.
- **Placeholder:** "What is this program for? Who is it designed for?"
- **Editing after creation:** Not editable from W-3. Editable from W-5 while program is in Future state before first workout is logged.

**Display in W-3:**
Displayed in full per W-3 Section 9 across all states. No truncation for MVP.

---

## Section 8 — Program Duration Rules

Duration is metadata, not a constraint. Governing rules:

1. Duration does not gate any action. "Start Program" (Future → Active) is available regardless of whether a duration chip is selected.
2. Duration does not affect the progress bar. Progress is always expressed as "X of Y workouts" per Amendment 001 display rules.
3. The duration label shown on W-2/W-3 cards is the chip the athlete selected (e.g., "8 Weeks"). It is never calculated from workout count.
4. **Critical distinction:** The Graduated state on W-3 shows actual elapsed duration (calculated from start date to graduation date). The program metadata row shows designed duration (the chip label). These are different data points from different sources and must not be conflated in implementation.

---

## Section 9 — Workout Assignment Flow

### 9.1 Overview

The athlete builds the program's workout list by adding entries one at a time. Each entry is a named workout slot in the program's ordered sequence.

**A workout slot is:**
- A named position in the ordered sequence
- An independent data record that owns its own content: `{ name, type?, originTemplateId? }`
- Not a logged workout record — not a record of performance
- Not a live reference to a Workout Template — the slot owns its data; the source template is irrelevant after composition

**In W-4 MVP:**
All slots are created inline. `originTemplateId` is `null` on every slot produced by W-4. No Workout Template from W-6/W-7 is linked at creation time. See Decision 2 (Section 2) for the full slot data model and copy-semantics rule.

**At execution time (W-3 Active state "Start Next Workout"):**
If a type tag is set on the slot, the corresponding logging screen (W-9–W-16) is pre-selected. If no type is set, the athlete selects activity type at launch. This behavior must be addressed explicitly in the active workout flow specification (see Risk 1, Section 21).

### 9.2 Adding a Workout Entry

Athlete taps "+ Add Workout" at any point during form completion.

A bottom sheet fires:

```
┌──────────────────────────────────────────────────────┐
│  Add Workout                                         │
│                                                      │
│  Workout Name                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  e.g., "Upper Body Push"                     │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  Type (Optional)                                     │
│  [Strength] [Run] [Walk] [Bike] [Swim]               │
│  [Mobility] [Yoga] [Other]                           │
│                                                      │
│  [  Add  ]                                           │  ← Enabled when name is non-empty
│  [  Cancel  ]                                        │
└──────────────────────────────────────────────────────┘
```

- Name field auto-focuses on sheet open; keyboard opens immediately
- Type chips: optional, single-select, maps to activity types W-9–W-16
- "Add" button: enabled only when name field is non-empty
- On "Add": entry appended to bottom of list; sheet dismisses
- On "Cancel" or swipe down: sheet dismisses; no entry added

### 9.3 Editing a Workout Entry

Athlete taps an existing workout row (anywhere except the drag handle or delete icon).

Same bottom sheet fires, pre-populated with current name and type. Title changes to "Edit Workout." "Add" button label changes to "Save."

- On "Save": entry updated in place; sheet dismisses; position unchanged
- On "Cancel": sheet dismisses; entry unchanged

### 9.4 Deleting a Workout Entry

Athlete taps the ✕ icon on a workout row.

- Entry removed immediately; no confirmation (unless it is the last remaining entry — see 9.5)
- Remaining entries renumber automatically

### 9.5 Deleting the Last Remaining Workout Entry

```
┌──────────────────────────────────────────────────────┐
│  Remove Last Workout?                                │
│                                                      │
│  A program needs at least one workout to be          │
│  created.                                            │
│                                                      │
│  [  Remove  ]                                        │
│  [  Cancel  ]                                        │
└──────────────────────────────────────────────────────┘
```

- "Remove": entry deleted; workout list returns to empty state; Create CTA disables
- "Cancel": sheet dismisses; entry preserved

**Why confirm only on last entry:** Deleting the second-to-last workout leaves one remaining — the requirement is still met and the CTA stays enabled. Deleting the last entry breaks the minimum requirement and disables creation — a more significant and less reversible state change.

### 9.6 Workout Entry Row Anatomy

```
≡  [#]  [Workout Name — 15sp, primary]    [Type — 12sp, secondary, muted]   [✕]
```

- ≡ Drag handle: left edge, 44dp touch area minimum
- Row number: sequential, auto-assigned, 12sp muted
- Workout name: 15sp, primary — truncated with ellipsis if exceeds one line
- Type tag: 12sp, secondary, muted — absent if no type selected
- ✕ Delete: right edge, 44dp touch area minimum
- Full row (except handle and ✕): tappable → opens Edit Workout sheet

### 9.7 Workout List Empty State

```
WORKOUTS
─────────────────────────────────────────────────────────
  Add your first workout to build the program's path.
─────────────────────────────────────────────────────────
[  + Add Workout  ]
```

Informational, not decorative. Disappears once first entry is added.

---

## Section 10 — Workout Ordering Rules

1. Workouts are displayed and executed in strict sequential order (1, 2, ... N).
2. Order is changed during creation in W-4 by drag-reorder.
3. Order is changeable in W-5 before first workout is logged.
4. After first workout is logged, program structure is locked permanently — the workout list is immutable.
5. **Programs are sequential, not calendar-based.** No days of the week are assigned. The athlete completes workouts in order at their own pace.
6. **No rest days are scheduled.** Rest is the athlete's decision — it is the gap between execution sessions, not a program entry.
7. Workout numbers auto-assign by position. Reordering updates all numbers automatically.

**Drag reorder behavior:**
- Long-press or touch on ≡ handle initiates reorder
- Row elevates visually (shadow) during drag; other rows shift to show drop target
- Row numbers update live during drag
- Drop completes the reorder; haptic feedback on lift and drop (implementation decision)

**Why sequential, not calendar:**
Calendar-based scheduling requires date management, missed-day logic, and potential "you're behind" pressure states. These conflict with "Accountability Without Shame" and "Simplicity Wins." The sequential model is simpler, more flexible, and does not produce shame states.

---

## Section 11 — Save Draft vs Create Program

**There are no drafts in W-4.**

W-4 has two and only two outcomes:

| Outcome | How |
|---------|-----|
| Program created (Future state) | Athlete taps "Create Program" or "Create" when form is valid |
| Work discarded | Athlete taps ✕ with data entered → Discard confirmation → "Discard" |

### 11.1 Discard Confirmation

Fires when the athlete taps ✕ and any data has been entered (name field non-empty, any chip selected, any description text entered, or any workout entry added).

```
┌──────────────────────────────────────────────────────┐
│  Discard Program?                                    │
│                                                      │
│  You'll lose the program you've been building.       │
│                                                      │
│  [  Discard  ]                                       │  ← Destructive action
│  [  Keep Editing  ]                                  │
└──────────────────────────────────────────────────────┘
```

- "Discard": all entered data lost; navigate back to W-2
- "Keep Editing": sheet dismisses; W-4 form preserved with all data intact

### 11.2 Clean Exit (No Data Entered)

If ✕ is tapped and no data has been entered, the discard confirmation does not fire. W-4 dismisses directly to W-2.

### 11.3 Escape Hatch for Mid-Creation Stops

An athlete who needs to stop before adding all their workouts should: complete the name and at least one workout entry, tap "Create Program," and finish building the program later via W-5 (which operates on Future state programs before first workout is logged). This is the intended draft-equivalent workflow.

---

## Section 12 — Future State Creation Rules

1. All programs created in W-4 enter Future state immediately upon creation. No intermediate state exists.
2. A Future program does not require an active chapter or goal — it exists independently (Amendment 001 Section 8).
3. Upon creation:
   - Program immediately accessible in W-2 Upcoming section
   - W-3 renders the new program in Future state
   - Program immediately startable from W-3 (subject to Active program conflict check per Amendment 001 Section 3)
4. Version set to v1.0 at creation. Not displayed during creation (system-assigned).
5. Created date set to creation timestamp (not displayed in Future state on W-3).

### 12.1 Navigation After Successful Creation

1. Program created in Future state
2. Navigate directly to W-3 — Future state of the newly created program
3. Back from that W-3 → W-2

W-4 is not in the back stack after creation. The athlete cannot return to W-4 by tapping back from W-3 — the creation screen is gone; the result exists.

### 12.2 No Celebration After Creation

No modal or celebration fires after program creation. The program exists; the athlete sees it on W-3 and can review, start, or return to W-2.

**Why:** Creation is not the moment of commitment. The moment of commitment is "Start Program" (Future → Active). Graduation — completing the full program — is the meaningful celebration event (M-4 fires there). Celebrating program creation would misplace the emotional weight.

---

## Section 13 — Relationship to Imports (W-IM-4)

W-4 and the import pipeline (W-IM-1 through W-IM-4) produce identical output: athlete-owned programs in Future state. They are parallel creation paths that converge at the same state model.

| | W-4 (Manual Creation) | Import Pipeline (W-IM-4) |
|-|-----------------------|--------------------------|
| Source | Athlete builds from scratch | Structured external file (CSV, XLSX, structured paste) |
| Workout entries | Added manually in W-4 | Parsed from imported data |
| Name | Athlete sets in W-4 | Athlete confirms/edits in W-IM-4 |
| Description | Athlete sets in W-4 | Set in W-IM-4 or absent |
| Duration | Athlete selects chip | May be inferred from import (confirm required) |
| Type/Focus | Athlete selects chip | May be inferred (confirm required) |
| Slot `originTemplateId` | `null` — all W-4 inline slots | `null` — all import slots, unless athlete explicitly links later |
| Version | v1.0 | v1.0 |
| Output state | Future | Future |
| Editable via W-5? | Yes (before first workout logged) | Yes (before first workout logged) |

**W-4 does not handle imports.** Athletes with structured training files in CSV/XLSX use the import pipeline. W-4 is for athletes designing a program from their own knowledge and intention.

**Architecture note:** Both W-4 and W-IM-4 require explicit athlete action to complete creation ("Create Program" / "Confirm Import"). No program enters Future state automatically from any path.

**Slot ownership note:** Both paths produce programs whose slots own their own data — `originTemplateId: null` in both cases for MVP. No template lookup, matching, or linking occurs during import. If an athlete later wants to associate an imported slot with a Workout Template, that is a deliberate future workflow, not an automatic side effect of import.

---

## Section 14 — Relationship to W-5 Fork/Edit

W-4 and W-5 are complementary but distinct screens.

| | W-4 Create | W-5 Fork/Edit |
|-|------------|---------------|
| Entry point | W-2, M-4 | W-3 Future state overflow ("Edit Program") |
| Creates new record? | Yes — always | Fork: yes. Edit: no (modifies existing) |
| Operates on | New program (doesn't exist yet) | Existing Future program (before first workout) |
| All form fields? | Name, description, duration, type/focus, workout list | Same fields — must be fully supported |
| Slot data model | `{ name, type?, originTemplateId: null }` for all MVP slots | Edit: slots modified in place, `originTemplateId` preserved. Fork: slots copied, `originTemplateId` values preserved as lineage |
| Live template references? | No — slots own their data | No — copy-semantics rule applies equally |
| Version | v1.0 (system-assigned) | Edit: v1.0 unchanged. Fork: new program, v1.0 |
| Output | Future state program | Edit: same Future program, modified. Fork: new Future program |

**W-5 is the edit surface; W-4 is the creation surface.** An athlete who creates a program in W-4 and immediately wants to modify it uses W-5 (via W-3 Future state overflow). This is by design — they are different operations.

**Downstream dependency:** W-5's form must support all fields and interactions defined in Sections 5–10 of this specification. The add/edit/delete/reorder workout entry model (Section 9), chip selectors (Section 5), and validation rules (Section 16) apply equally to W-5. See Section 20 for full W-5 dependency list.

---

## Section 15 — Empty States

### 15.1 Program Form Empty State (Screen Entry)

All fields empty at screen entry:

- Program Name field: visible with placeholder text, auto-focused, keyboard open
- Duration chips: none selected
- Type/Focus chips: none selected
- Description field: visible with placeholder text
- Workout list: empty state (Section 9.7) displayed
- "Create Program" CTA: disabled
- "Create" in Top App Bar: disabled

The form is immediately actionable — the keyboard is open and the athlete can begin typing the program name without any additional tap.

### 15.2 Workout List Empty State

See Section 9.7. Displayed when no workout entries exist. Replaced by the ordered list of entries as soon as the first entry is added.

---

## Section 16 — Validation Rules

### 16.1 Form-Level Validation (Enabling Create)

Both "Create Program" CTA and "Create" in Top App Bar enable only when:
- Program name: non-empty and non-whitespace-only
- Workout list: at least 1 entry with a non-empty, non-whitespace-only name

All other fields are optional. The CTA does not show an error state — it remains disabled until requirements are met.

### 16.2 Field-Level Validation

| Field | Rule | Enforcement |
|-------|------|-------------|
| Program Name | Required | CTA disabled if empty/whitespace-only |
| Program Name | Max 60 characters | Input blocked at 60; counter shown at 50–60 chars used |
| Program Name | Min 1 non-whitespace character | Whitespace-only treated as empty |
| Description | Optional, max 500 characters | Input blocked at 500; counter shown at 450–500 chars used |
| Workout Name (per entry) | Required | "Add"/"Save" button disabled if empty/whitespace-only |
| Workout Name (per entry) | Max 60 characters | Input blocked at 60; counter shown at 50–60 chars used |
| Workout Name (per entry) | Min 1 non-whitespace character | Whitespace-only treated as empty |
| Workout Type (per entry) | Optional | No validation |
| Duration | Optional | No validation (chip selection only) |
| Type/Focus | Optional | No validation (chip selection only) |

### 16.3 No Uniqueness Enforcement

Program names are not required to be unique within an athlete's collection. Multiple records with the same name are valid. No server-side uniqueness check runs before creation.

### 16.4 No Error States

W-4 has no reactive error states for MVP. Validation is handled preventively (disabled CTAs, blocked input at max length). No red error messages, no inline error text, no shake animations. The athlete should never reach a failed creation attempt — the CTA is only enabled when requirements are already met.

---

## Section 17 — Mobile UX

### 17.1 Screen Type

Navigation stack screen (not a modal sheet). Top App Bar has ✕ close icon — not back arrow ← — to communicate that this is a creation flow that can be abandoned, not a detail screen to navigate back from.

**Why ✕ instead of ←:** ✕ communicates "You are creating something. Closing abandons it." ← communicates "Navigate back." These are different concepts. Creation contexts use ✕.

### 17.2 Keyboard Behavior

- Program Name field auto-focuses on screen entry; keyboard opens immediately
- Tapping outside any text field dismisses keyboard (standard scroll behavior)
- Tapping a text field opens keyboard for that field
- Page scrolls to keep active field above keyboard

### 17.3 Scroll Behavior

Single vertical scroll. Top App Bar is sticky (standard behavior). Form body scrolls: name, metadata chips, description, workout list, Create CTA. No sticky elements within the form body.

### 17.4 Add/Edit Workout Bottom Sheet

- Appears from bottom edge; 50% screen height minimum
- Draggable to dismiss (swipe down)
- Name field auto-focuses on sheet open; keyboard opens immediately
- Sheet content scrolls internally if keyboard causes overflow
- Dismissal via swipe-down or "Cancel" — no data persisted on cancel

### 17.5 Drag Reorder

- Initiated by long-press or touch on ≡ drag handle
- Row elevates visually (shadow) during drag; other rows shift to show drop target
- Row numbers update live during drag
- Haptic feedback on lift and drop (implementation decision)

### 17.6 Orientation

Portrait only.

### 17.7 Tap Targets

| Element | Minimum Size |
|---------|-------------|
| ✕ Close icon (top bar) | 44×44dp |
| "Create" top bar text button | 44dp touch height |
| Duration chip | 36dp height, 44dp horizontal padding |
| Type/Focus chip | 36dp height, 44dp horizontal padding |
| Workout entry row | Full width × 56dp minimum |
| Drag handle (≡) | 44×44dp touch area |
| Delete icon (✕) on workout row | 44×44dp touch area |
| "+ Add Workout" button | Full width × 48dp |
| "Create Program" CTA | Full width × 48dp |
| Sheet action buttons (Add, Save, Cancel, Discard, etc.) | Full width × 52dp |

### 17.8 Accessibility Labels

- Program Name field: `accessibilityLabel` = "Program name, required"
- Duration chips: `accessibilityLabel` = "[X] weeks, [selected / not selected]"
- Type/Focus chips: `accessibilityLabel` = "[Type], [selected / not selected]"
- Description field: `accessibilityLabel` = "Program description, optional"
- Workout entry row: `accessibilityLabel` = "Workout [#]: [Workout Name][, type: [Type] if set]. Double-tap to edit."
- Drag handle: `accessibilityLabel` = "Reorder workout [#]: [Workout Name]"
- Delete icon on row: `accessibilityLabel` = "Remove workout [#]: [Workout Name]"
- "+ Add Workout": `accessibilityLabel` = "Add a workout to this program"
- "Create Program" (enabled): `accessibilityLabel` = "Create program"
- "Create Program" (disabled): `accessibilityLabel` = "Create program — add a name and at least one workout to continue"

---

## Section 18 — Navigation

### 18.1 Entry Points

| Entering From | Context |
|--------------|---------|
| W-2 Top App Bar — "+ Create" | Standard program creation entry |
| W-2 Empty invitation card — "+ Create" CTA | No active program; invitation to create |
| M-4 Program Graduation Modal — "Create New Program" | Post-graduation; invitation to build next program |

### 18.2 Exit Points

| Action | Destination |
|--------|------------|
| "Create Program" / "Create" (success) | W-3 — Future state of newly created program |
| ✕ tapped, no data entered | W-2 (direct; no confirmation) |
| ✕ tapped, data entered → "Discard" | W-2 |
| ✕ tapped, data entered → "Keep Editing" | W-4 remains; form fully preserved |

### 18.3 Back Navigation After Successful Creation

W-3 Future state (new program) → back arrow → W-2.

W-4 is removed from the back stack after successful creation. The athlete cannot navigate back to W-4 from W-3. The creation surface is gone; the result persists.

---

## Section 19 — Edge Cases

### 19.1 Whitespace-Only Program Name

Trimmed before validation. Treated as empty. "Create" remains disabled.

### 19.2 Whitespace-Only Workout Name

Trimmed before validation. "Add"/"Save" button in the bottom sheet remains disabled.

### 19.3 Single-Workout Program

Valid. A program with exactly one workout entry meets minimum requirements. W-3 Active state: "0 of 1 workouts," Workout 1 highlighted as "NEXT." Ended Early at 0 workouts completed: "0 of 1 workouts completed."

### 19.4 Very Long Program Name (Approaching 60 Characters)

Character counter visible at 50+ characters. Input blocked at 60. No truncation in the field — the athlete sees the full name during creation.

### 19.5 Duplicate Program Names

Allowed. No uniqueness check. Two programs named "Hypertrophy Block" in different states is a valid and expected pattern (same program, run twice).

### 19.6 Large Workout Count (30+ Entries)

All entries display in a single scrollable list. No pagination for MVP. "+ Add Workout" and "Create Program" CTA remain at the bottom of the scroll below the list.

### 19.7 App Interruption Mid-Creation (Phone Call, Background)

Platform-standard lifecycle behavior. iOS and Android preserve form state for backgrounded apps. If the OS terminates the app, entered data is lost — expected behavior. No explicit draft recovery exists.

### 19.8 Gesture-Based Navigation Away from W-4

If the athlete navigates away via gesture (swipe back, home button) without tapping ✕, the platform may or may not allow interception of the gesture for the discard confirmation. This is an implementation-layer decision. The minimum acceptable behavior: any gesture navigation that exits W-4 with data entered should trigger the discard confirmation. If the platform makes this technically infeasible for all gesture types, engineering must document the limitation.

### 19.9 Workout Entry With No Type Set

Valid. Type tag absent from the row. Implications at execution time: the active workout flow must present type selection when "Start Next Workout" is tapped on a slot with no type. See Section 21, Risk 1.

### 19.10 Very Long Workout Name (Approaching 60 Characters)

Counter visible at 50+ characters in the bottom sheet. Input blocked at 60. In the workout entry row on the main form, the name truncates with ellipsis if it exceeds one line. Full name visible in the Edit Workout sheet.

---

## Section 20 — Downstream Dependencies on W-5

The following W-5 requirements flow directly from W-4 decisions and must be honored in the W-5 specification:

1. **W-5 must support all W-4 form fields:** program name, description, duration chip selector, type/focus chip selector, workout list with add/edit/delete/reorder. Behavior must be identical to W-4 in the editing context.

2. **W-5 must distinguish Fork from Edit clearly:** Fork creates a new program record; Edit modifies the existing one in place. The fork path must communicate "this creates a new program" before the action completes.

3. **W-5 operates on Future state programs only:** A program that has received its first workout log is locked. W-5 must not be accessible from W-3 overflow on Active, Graduated, or Ended Early programs.

4. **W-5 in-place edit must not bump version:** An athlete editing their Future program in W-5 before first workout logged stays at v1.0. Version increments are not defined for MVP.

5. **W-5 fork creates v1.0:** The forked program is a new athlete-owned program at v1.0. Source attribution may be shown (for context) but is not binding.

6. **W-5 does not support import:** Merging import data into an existing program is Post-MVP.

7. **W-5 must enforce W-4 minimum requirements on save:** The resulting program (after edit or fork) must have a non-empty name and at least one named workout entry. W-5 save must be disabled if these minimums are not met — identical logic to W-4.

8. **W-5 fork must copy all slot data including `originTemplateId`:** When forking a program, every workout slot is copied into the new program. The `originTemplateId` value on each slot is preserved in the copy — it records original template lineage, not lineage from the fork source program. The forked program's slots are independent after creation; no slot in the fork shares state with the original program's slots.

9. **W-5 must never create live template references in slot data:** All slots in W-5-edited or W-5-forked programs must own their own data under the copy-semantics rule (Decision 2). W-5 may not introduce a slot architecture where a slot stores a live reference to a template record. `originTemplateId` is lineage metadata only. Editing a Workout Template in W-6/W-7 must never propagate to existing program slots through W-5 or any other path.

---

## Section 21 — Architecture Risks

### Risk 1 — Untyped Workout Slot at Execution

**Risk:** If a workout slot has no type tag, the execution layer (active workout flow, entered from W-3 Active state "Start Next Workout") must handle type selection at launch time. If the execution flow assumes all program workout slots have a pre-set type, untyped slots will cause an undefined behavior.

**Impact:** Medium. A large portion of MVP athlete-created programs may have untyped workouts (type is optional). This path must be tested and specified in the active workout flow.

**Mitigation:** The active workout flow specification and W-3 specification must explicitly address the "no type set" case for program-linked workout execution. W-4 defines type as optional; the execution layer must honor that decision without breakage.

---

### Risk 2 — Workout Entry vs. Template Expectation Mismatch

**Risk:** Athletes accustomed to TrainingPeaks or similar tools may expect their program workout entries to link to their saved templates (W-6/W-7). In MVP, the template selection UI does not exist — all slots are created inline.

**Impact:** Low–Medium for MVP. The expectation mismatch is real. The workaround — all execution details are filled in during the live logging session — is how the system works anyway.

**Mitigation:** The slot data model is defined with `originTemplateId?` from day one (Decision 2). Post-MVP template selection in the creation UI requires no schema migration — the architecture already supports it. For MVP, product copy and onboarding must not imply a template linkage that the UI does not yet expose.

---

### Risk 3 — No-Draft Policy and Long Creation Sessions

**Risk:** An athlete building a 24-workout program (3x/week, 8 weeks) who is interrupted mid-creation loses all work if they do not first save a minimum viable version.

**Impact:** Low. Most MVP programs will have fewer than 20 entries. The escape hatch (complete minimum requirements, save, edit in W-5) is viable.

**Mitigation:** Product copy near the workout list could reference the "you can always add more workouts after creating" pattern. This is a product copy decision, not a spec change.

---

### Risk 4 — W-5 Specification Dependency

**Risk:** W-4 is locked but W-5 is not yet specified. The full creation-to-editing flow is unvalidated end-to-end until W-5 is written.

**Impact:** Medium. W-4 can be implemented independently. W-5 cannot contradict or ignore W-4's decisions.

**Mitigation:** W-5 must be drafted and reviewed before editing flow implementation begins. Section 20 of this spec is the requirements brief for W-5.

---

## Section 22 — Validation Checklist

### Screen Structure
- [ ] Navigation stack screen (not modal sheet)
- [ ] Top App Bar: ✕ icon (not ←) + "Create Program" title + "Create" text button
- [ ] "Create" text button: disabled until minimum requirements met
- [ ] Single vertical scroll — no tabs, no step indicators
- [ ] Tab Bar visible at bottom (Workouts tab active)
- [ ] Program Name field auto-focuses on screen entry; keyboard opens immediately

### Program Name
- [ ] Required field — Create disabled if empty or whitespace-only
- [ ] Maximum 60 characters — input blocked at 60; counter shown at 50+
- [ ] Whitespace-only treated as empty
- [ ] Placeholder text present
- [ ] Uniqueness NOT enforced

### Program Metadata
- [ ] Duration chip row: 6 options (4/6/8/10/12/16 wks) + default (none selected)
- [ ] Duration chips: single-select, tap to deselect
- [ ] Duration absent from W-2/W-3 cards if none selected (no placeholder)
- [ ] Type/Focus chip row: 5 options + default (none selected)
- [ ] Type/Focus chips: single-select, tap to deselect
- [ ] Type/Focus absent from W-2/W-3 cards if none selected

### Program Description
- [ ] Optional — Create not gated on description
- [ ] Maximum 500 characters — input blocked at 500; counter shown at 450+
- [ ] Multi-line, placeholder text present
- [ ] NOT editable from W-3 (editable via W-5 only, while Future)

### Workout List
- [ ] Empty state: "Add your first workout..." prompt + "+ Add Workout" button
- [ ] "+ Add Workout" always visible (below empty state, below list)
- [ ] Add Workout bottom sheet: name field (required) + type chips (optional) + Add + Cancel
- [ ] Bottom sheet: name field auto-focuses on open
- [ ] "Add" button disabled when workout name is empty/whitespace-only
- [ ] On Add: entry appended to list; sheet dismisses
- [ ] On Cancel or swipe-down: sheet dismisses; no entry added
- [ ] Workout row: drag handle + row number + name + type tag (if set) + ✕
- [ ] Tapping row (not handle or ✕): opens Edit Workout sheet, pre-populated
- [ ] Edit Workout sheet: button labeled "Save" (not "Add")
- [ ] On Save: entry updated in place; sheet dismisses
- [ ] Delete ✕: removes entry immediately (no confirmation unless last)
- [ ] Last entry deletion: "Remove Last Workout?" confirmation fires

### Create Action
- [ ] "Create Program" CTA and "Create" top bar button: enabled only when name is valid AND at least one named workout entry exists
- [ ] Both buttons trigger identical creation logic
- [ ] On success: navigate to W-3 — Future state of new program
- [ ] W-4 removed from back stack after creation

### Discard Logic
- [ ] ✕ tapped, no data entered: dismiss directly to W-2 (no confirmation)
- [ ] ✕ tapped, any data entered: Discard confirmation fires
- [ ] "Discard": data lost; navigate to W-2
- [ ] "Keep Editing": sheet dismisses; W-4 form fully preserved

### Future State Creation
- [ ] All programs created in W-4 enter Future state immediately
- [ ] Version set to v1.0 (system-assigned; not shown during creation)
- [ ] Program appears in W-2 Upcoming section immediately after creation
- [ ] No celebration modal or sheet fires after creation
- [ ] Program immediately startable from W-3 (subject to Active program conflict check)
- [ ] No chapter or goal required to create a program

### Drafts
- [ ] No draft program state exists
- [ ] No draft recovery UI
- [ ] No draft indicator in W-2
- [ ] Abandoned creation = discarded (with confirmation if data entered)

### Versioning
- [ ] W-4 creates at v1.0 — no other version possible
- [ ] Version not displayed during creation
- [ ] Version not editable by athlete

### Workout Slot Data Model (Model C — Copy-Semantics with Origin Tracking)
- [ ] Slot data model is `{ name, type?, originTemplateId? }` — schema includes `originTemplateId` from day one
- [ ] All W-4 inline slots have `originTemplateId: null`
- [ ] All import pipeline slots (W-IM-4) have `originTemplateId: null` unless athlete explicitly links later
- [ ] Program slots own their own data — copy-semantics, not live references
- [ ] Editing a Workout Template in W-6/W-7 never mutates any existing program slot
- [ ] `originTemplateId` is lineage metadata only — deleting the origin template does not affect the slot
- [ ] No live template references exist anywhere in the program data model
- [ ] W-5 fork copies all slots including `originTemplateId` values (lineage preserved, not re-pointed to fork source)
- [ ] W-5 must not introduce live template references in edited or forked programs

### Relationship to Imports
- [ ] W-4 does not handle imported data
- [ ] Import path is W-IM-1 through W-IM-4 exclusively
- [ ] Import slots carry `originTemplateId: null`

### Relationship to W-5
- [ ] W-5 supports all W-4 form fields and interactions
- [ ] W-5 in-place edit: v1.0 unchanged
- [ ] W-5 fork: new program at v1.0
- [ ] W-5 fork copies all slot data including `originTemplateId` (lineage preserved)
- [ ] W-5 enforces W-4 minimum requirements on save
- [ ] W-5 must not create live template references in any slot

### Navigation
- [ ] Entry from W-2 "+ Create" (top bar)
- [ ] Entry from W-2 invitation card "+ Create" CTA
- [ ] Entry from M-4 "Create New Program"
- [ ] Success: navigate to W-3 Future state (new program)
- [ ] Discard: navigate to W-2
- [ ] Back from W-3 post-creation: W-2 (not W-4)

### Mobile UX
- [ ] ✕ close icon in top bar (not ← back arrow)
- [ ] All tap targets meet minimums (Section 17.7)
- [ ] Portrait orientation only
- [ ] Bottom sheet for Add/Edit Workout
- [ ] Drag reorder functional via ≡ handle
- [ ] Keyboard opens immediately on screen entry (name field auto-focus)
- [ ] Discard confirmation on gesture navigation (behavior per Section 19.8)
- [ ] All interactive elements have accessibility labels per Section 17.8

### Architecture Decisions (Locked)
- [ ] Creation model: blank from scratch only — no template selection for MVP
- [ ] Workout population: inline creation only — no W-6/W-7 template selection for MVP
- [ ] Slot data model: `{ name, type?, originTemplateId? }` — copy-semantics, `originTemplateId: null` for all MVP slots
- [ ] Minimum requirements: name + at least one named workout entry
- [ ] No drafts
- [ ] All new programs: v1.0

---

## Section 23 — Lock Recommendation

**W-4 Program Creation Wireframe Specification v1.1 is ready for lock.**

All required decisions are resolved, documented, and justified. The specification:

- Is internally consistent with Amendment 001, W-2, W-3, and the PRD
- Resolves all five required architecture decisions
- Defines the workout slot data model (`{ name, type?, originTemplateId? }`) under copy-semantics with origin tracking — protects "History Cannot Be Rewritten" at the data layer and enables Post-MVP template selection without schema migration
- Produces a well-formed Future state program that integrates cleanly with the existing program state model
- Enforces the complexity guardrail: an athlete can create a useful program in a few focused minutes on their phone
- Defers Post-MVP concerns (template selection UI, custom duration, environment swapping) without blocking MVP implementation
- Identifies W-5 as the immediate downstream dependency and defines its requirements in Section 20 (including copy-semantics and no-live-reference rules)
- Documents four architecture risks with mitigations

**Prerequisites before implementation can begin:**
1. W-4 specification lock (this document)
2. W-5 Fork/Edit specification — must honor Section 20 of this spec, including copy-semantics and `originTemplateId` handling on fork
3. Active workout flow specification — must address untyped workout slot execution (Risk 1)
4. Engineering review of gesture-based navigation discard behavior on target platforms (Section 19.8)
5. Engineering confirmation that the slot schema (`originTemplateId?` as nullable field) is reflected in the data model from initial implementation

---

*Forge Legacy Program Creation Wireframe Specification — W-4*
*v1.1 — June 2026*
*Authority: Program-Architecture-Amendment-001-Active-Program-Rule.md*
*PRD: Section 11 (Program System), Section 5 (MVP), Section 8 (Workout System)*

---

## Change Log

### v1.2 — June 2026 (WS-A5)

Workout Structure Amendment 001 applied. Decision 2 (Workout Slot Data Model) updated to reflect section-first architecture. `ProgramSlot` now includes `sections: WorkoutSection[]` alongside the existing fields. New slot initialization creates `sections: [{ type: 'MAIN', exercises: [] }]` — one required Main Workout section with no exercises. Optional Warm-Up and Cool-Down sections are created by the athlete in W-24 Workout Builder. `WorkoutSection` entity and `ExercisePrescription` entity defined in W-24 § 7.6 (LOCKED, WS-A1 applied). Data model schema is additive — the `name`, `type`, and `originTemplateId` fields are unchanged.

### v1.1 — June 2026

Architecture amendment before lock. Decision 2 (Workout Population) revised to adopt Model C: Copy-Semantics with Origin Tracking. Workout slot data model formally defined as `{ name, type?, originTemplateId? }`. Copy-semantics rule established as permanent architecture: template data is copied into slots at composition time; slots own their own data; editing a Workout Template never mutates existing program slots; no live template references are permitted in the program data model. `originTemplateId` is lineage metadata only — present in schema from day one to enable Post-MVP template selection and environment swapping without schema migration. W-4 MVP UI unchanged: all W-4 slots have `originTemplateId: null` (inline creation only). Section 9.1 updated to reference slot data model. Section 13 (Imports) updated: import slots carry `originTemplateId: null`. Section 14 (W-5) updated: fork copies all slot data including `originTemplateId`. Section 20 (W-5 dependencies) updated: two new requirements — fork must preserve `originTemplateId`; no live template references permitted. Section 21 Risk 2 updated: expectation mismatch risk reduced; slot model already supports Post-MVP template selection. Section 22 new checklist subsection added: "Workout Slot Data Model (Model C)." Section 23 lock recommendation updated to v1.1 with schema confirmation prerequisite added. History Cannot Be Rewritten guardrail enforced at data layer.

### v1.0 — June 2026

Initial specification. W-4 Program Creation created as part of Phase 2B wireframe documentation. Five required architecture decisions resolved: blank-from-scratch creation model (no template selection for MVP), inline workout entry population (no W-6/W-7 template linkage for MVP), name + one workout minimum requirements, no drafts, v1.0 versioning for all created programs. Sequential workout ordering model established (not calendar-based). Entry points: W-2 (standard and invitation), M-4 (post-graduation). Output: Future state program in all cases. Downstream W-5 dependencies defined in Section 20. Four architecture risks documented with mitigations. Lock recommendation: ready.
