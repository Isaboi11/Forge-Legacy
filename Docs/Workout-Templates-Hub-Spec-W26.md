# Forge Legacy — W-26 Workout Templates Hub
## Version 1.0 | June 2026

**Status:** LOCKED
**Authority:** Exercise-Library-Architecture-v1.0.md, ExercisePrescription-Amendment-001.md, Free-Workout-Builder-Spec-W25.md, Activity-Type-Picker-Spec-W8.md
**Downstream impact:** Workouts-Hub-Wireframe-Spec-W1.md (amendment required), Activity-Type-Picker-Spec-W8.md (amendment required), W-27 (forthcoming spec, downstream recipient)

---

## Section 1 — Screen Purpose

W-26 is the athlete's personal library of reusable workout templates. It serves as:

- The central discovery surface for `WorkoutTemplate` records
- The primary launch point for template-based `WorkoutSession` creation
- The entry point for creating new templates via W-25

**W-26 is NOT:**
- A program browser — W-2 owns that
- An active workout screen — W-9 through W-16 own that
- The primary workouts dispatch — W-1 owns that
- A template editor — W-25 owns that
- A template detail or management surface — W-27 owns that

### Relationship to W-25

W-26 initiates W-25 in CREATE_NEW mode via the header [+] button and the empty state CTA. W-25 (CREATE_NEW) dismisses back to W-26 on save. W-25 (EDIT mode, reached via W-27) navigates directly to W-26 on template delete, bypassing W-27 — because the template no longer exists and W-27 has no subject to display.

### Relationship to W-27

W-26 navigates to W-27 on card-body tap. W-27 owns template editing, duplication, deletion confirmation, and session history. W-26 does not expose any of these actions. The card ▶ Start affordance is the only action W-26 takes on a template directly.

---

## Section 2 — Entry Points

### 2.1 W-1 Workouts Hub — Always Present

"My Templates →" appears in the Log Activity section of W-1 at all times, regardless of template count. (R1-1 — adopted)

| State | Behavior |
|-------|---------|
| Athlete has ≥ 1 template | Routes to W-26 template list |
| Athlete has 0 templates | Routes to W-26 empty state |

The entry point is never hidden. A new athlete tapping "My Templates →" for the first time reaches the W-26 empty state, which is designed to introduce the feature and prompt the first template creation.

**W-1 amendment required.** The current W-1 spec does not include this entry point. A downstream amendment to Workouts-Hub-Wireframe-Spec-W1.md is required to add "My Templates →" as a persistent tertiary link in the Log Activity section.

### 2.2 Post-Save from W-25 (CREATE_NEW Mode)

When the athlete saves a new template from W-25 CREATE_NEW mode, W-25 dismisses and the athlete lands back in W-26. The newly created template appears at the top of the sorted list (lastUsedAt is null; createdAt is newest → sorts last among never-used, but the athlete will see the list has grown).

### 2.3 Post-Delete from W-25 (via W-27 → W-25 EDIT)

Defined in Free-Workout-Builder-Spec-W25.md: delete template → navigate to W-26. W-26 reflects the updated list with the deleted template absent. W-27 is bypassed because the template no longer exists.

### 2.4 Not Entry Points

The following flows do NOT route to W-26:

| Flow | Why |
|------|-----|
| W-17 → SAVE_AS_TEMPLATE → W-25 → save | W-25 dismisses back to W-17. Post-workout flow preserves the achievement moment. (W26-D9) |
| W-27 → DUPLICATE → W-25 → save | W-25 (DUPLICATE mode) is called from W-27 and dismisses back to W-27, not W-26. (W26-D9) |

---

## Section 3 — Template List Architecture

### 3.1 Card Structure

```
┌──────────────────────────────────────────────────────────┐
│  Template Name                                [▶ Start]  │
│  Strength  ·  8 exercises  ·  Used 3 days ago            │
└──────────────────────────────────────────────────────────┘
```

**Line 1 (primary):**
- Template name — 16sp, primary weight, left-aligned
- ▶ Start button — secondary style, right-aligned, minimum 44×44dp tap target

**Line 2 (secondary, muted):**
- Activity type display name (if non-null) · Exercise count · Usage timestamp
- If activityType is null: exercise count · usage timestamp (type label omitted entirely — no "General", "Untyped", or placeholder)

Card body tap → W-27. ▶ Start tap → launch flow (Section 8). These are distinct tap targets. (W26-D5)

### 3.2 Activity Type Display Names

| activityType enum | Display Name |
|------------------|-------------|
| `STRENGTH` | Strength |
| `RUN` | Run |
| `WALK` | Walk |
| `BIKE` | Bike |
| `SWIM` | Swim |
| `HIIT` | HIIT |
| `MOBILITY` | Mobility |
| `YOGA` | Yoga |
| `OTHER` | Other |
| `null` | (omitted) |

### 3.3 Exercise Count

Total exercises summed across all sections — WARM_UP + MAIN + COOL_DOWN. Displayed as "N exercises" (e.g., "8 exercises"). Computed from `WorkoutTemplate.sections[].exercises[]`.

MAIN is always present. WARM_UP and COOL_DOWN are included in the count when present.

### 3.4 Usage Timestamp — R1-2

| lastUsedAt condition | Display |
|---------------------|---------|
| null (never launched) | "Never used" |
| Today | "Used today" |
| Yesterday | "Used yesterday" |
| 2–6 days ago | "Used N days ago" |
| 1–3 weeks ago | "Used N weeks ago" |
| Older | "Used N months ago" |

**Full line 2 examples:**

| Template state | Line 2 |
|---------------|--------|
| Non-null type, used recently | `Strength · 8 exercises · Used 3 days ago` |
| Non-null type, never used | `Strength · 8 exercises · Never used` |
| Null type, used recently | `8 exercises · Used yesterday` |
| Null type, never used | `8 exercises · Never used` |

### 3.5 Sort Order

Default sort. No user-facing sort controls in MVP. (W26-D1)

1. Templates where `lastUsedAt` is non-null — sorted by `lastUsedAt` descending (most recently used first)
2. Templates where `lastUsedAt` is null — sorted by `createdAt` descending (most recently created first)

Never-used templates always appear below all previously-used templates.

### 3.6 Scrolling

Standard vertical scroll. No pagination. No sticky section headers. No category grouping.

---

## Section 4 — Empty State

Displayed when the athlete has zero templates. This state is the feature's introduction surface — a new athlete reaches it via the always-present W-1 entry point.

```
[Template icon — thematic, not literal]

Save your go-to workouts.
Build a template once, launch it anytime.

[Create Template]

Or finish a workout and save it as a template.
```

**Rules:**
- Primary CTA: "Create Template" → W-25 CREATE_NEW
- Secondary line (14sp, muted): educates about the SAVE_AS_TEMPLATE path from W-17 without prescribing it as required
- No "You have no templates" language
- No shame framing
- No empty rows, skeleton cards, or placeholder content
- No "import" reference — imported templates are not an MVP concept (import creates programs, not templates)

---

## Section 5 — Template Actions

### 5.1 Actions Available from W-26

| Action | Trigger | Destination |
|--------|---------|-------------|
| Launch a session | ▶ Start on card | W-8 or logging screen (Section 8) |
| View template detail / manage | Card body tap | W-27 |
| Create new template | Header [+] button | W-25 CREATE_NEW |
| Create new template | Empty state CTA | W-25 CREATE_NEW |

### 5.2 Actions Not Available from W-26 (Owned by W-27)

| Action | Owner |
|--------|-------|
| Edit template | W-27 → W-25 EDIT |
| Duplicate template | W-27 → W-25 DUPLICATE |
| Delete template | W-27 → W-25 EDIT → confirmation |
| View session history for template | W-27 |

No swipe-to-delete from W-26. No inline editing. No long-press actions. Destructive actions are guarded behind one additional navigation step (W-27). (W26-D7)

---

## Section 6 — Search

No search in MVP. (W26-D6)

MVP template volume (typically under 30 per athlete) is adequately served by the default sort. The most relevant template is always the most recently used, which appears first without any search interaction. Post-MVP consideration if library size grows substantially.

---

## Section 7 — Sorting

Single default sort. No user-facing sort controls in MVP. (W26-D1)

**Sort logic:**
- Primary key: `lastUsedAt` descending (null sorted last)
- Secondary key: `createdAt` descending (applies within the never-used group)

Three templates never used sort among themselves by creation date newest-first. One template used 6 months ago ranks above all never-used templates.

---

## Section 8 — Launch Workout Flow

### 8.1 Routing Decision

```
Athlete taps ▶ Start on template card
        │
        ├─ template.activityType is non-null  (W26-D2)
        │   └── Navigate directly to logging screen, bypassing W-8
        │       W-9  STRENGTH
        │       W-10 RUN
        │       W-11 WALK
        │       W-12 BIKE
        │       W-13 SWIM
        │       W-14 HIIT
        │       W-15 MOBILITY / YOGA
        │       W-16 OTHER
        │       — with template sections pre-loaded —
        │
        └─ template.activityType is null
            └── Navigate to W-8 with sourceTemplateId context parameter
                └── Athlete selects activity type in W-8
                    └── W-8 routes to logging screen
                        — with template sections pre-loaded —
```

W-8 currently handles three entry contexts (H-1, W-1, W-3 untyped program slots). Template-launch with null activityType is a fourth context requiring a W-8 amendment. When W-8 receives a sourceTemplateId context, the selected activity type is passed through to the logging screen along with the template. (Downstream amendment noted in Section 13.)

### 8.2 Session Pre-Population

When the logging screen opens with a template context:

- `WorkoutSession.sections[]` — cloned from `WorkoutTemplate.sections[]`
- Each `ExercisePrescription` initialized from template prescription values: sets, reps, weight, restSeconds, distanceValue, distanceUnit (per EP-A1)
- `WorkoutSession.activityType` = `WorkoutTemplate.activityType` OR athlete-selected type from W-8
- `WorkoutSession.sourceTemplateId` = `WorkoutTemplate.id` (W26-D8)

### 8.3 Carry-Forward: Not Applied

Template launch does not apply the carry-forward rule. (W26-D3)

The carry-forward rule (EL-D8) applies to blank free workouts — sessions started without a template where the athlete's last-logged values for each exercise pre-populate the prescription fields. Template launches are a distinct path: the template prescriptions are the intended starting values. The athlete built the template with specific sets, reps, weights, and rest targets. Silently overriding those values with carry-forward data would diverge from the athlete's intent without their knowledge.

### 8.4 Template Update Timing

After a session derived from a template is saved with ≥ 1 exercise set logged:
- `WorkoutTemplate.useCount` += 1
- `WorkoutTemplate.lastUsedAt` = timestamp of that save

**Not on session start.** An athlete who opens a template session and immediately abandons it with nothing logged does not increment useCount or update lastUsedAt. (W26-D4)

**On partial save.** A partial save with ≥ 1 exercise set logged counts. Full session completion is not required. This is consistent with W-9's partial save behavior.

---

## Section 9 — Navigation

### 9.1 Navigation Map

| Trigger | Behavior |
|---------|---------|
| ← Back (header) | Pop to W-1 (standard back stack) |
| [+] Create (header) | Push W-25 CREATE_NEW |
| Card body tap | Push W-27 |
| ▶ Start (non-null activityType) | Navigate to logging screen with template context |
| ▶ Start (null activityType) | Navigate to W-8 with sourceTemplateId context |
| Empty state [Create Template] | Push W-25 CREATE_NEW |

### 9.2 Screen Position in Stack

W-26 is a push navigation from W-1. It is not a modal. It is not a bottom tab. Back from W-26 returns to W-1.

### 9.3 Return Flows into W-26

| Source | Condition | Lands in W-26 as |
|--------|-----------|-----------------|
| W-25 (CREATE_NEW) | Save | Template list, new template visible |
| W-25 (EDIT via W-27) | Delete | Template list, deleted template absent |
| W-1 | "My Templates →" tap | Template list or empty state |

---

## Section 10 — Non-Behaviors

W-26 does not and will not (MVP):

| Non-Behavior | Reason |
|-------------|--------|
| Edit templates inline | W-25 owns editing, accessed via W-27 |
| Delete templates from list | W-27 guards destructive action |
| Swipe-to-delete | List surface must be safe to browse (W26-D7) |
| Create programs from templates | Programs and templates are distinct entities with separate creation flows |
| Share templates | Not in MVP scope; post-MVP consideration |
| AI-generate templates | Out of scope |
| Import templates | Import creates programs (Architecture-Amendment-001-Import.md); templates are athlete-created only |
| Suggest templates based on chapter goals | Matching logic requires behavioral data not available at MVP |
| Show performance history on cards | Belongs in W-27 |
| Apply carry-forward on template launch | Template prescriptions are the intent (W26-D3) |
| Group templates by activity type | Flat sorted list is sufficient at MVP scale |
| Provide sort controls | Single sort is sufficient at MVP scale (W26-D1) |
| Provide search or filter | Not needed at MVP scale (W26-D6) |
| Show undo for deleted templates | Deletion is confirmed in W-25; undo not surfaced in W-26 |
| Badge unused templates | "Never used" timestamp label is sufficient; no visual pressure mechanic |
| Navigate to W-26 after SAVE_AS_TEMPLATE | W-25 returns to W-17 to preserve post-workout flow (W26-D9) |
| Navigate to W-26 after DUPLICATE | W-25 (DUPLICATE) returns to W-27 (W26-D9) |

---

## Section 11 — Architecture Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| W26-D1 | Single default sort (lastUsedAt desc, never-used by createdAt desc), no user controls | A list of under 30 templates does not require a sort UI. The most relevant template is always the most recently used. Adding controls adds administrative weight to a personal library. |
| W26-D2 | Template launch bypasses W-8 when activityType is non-null | The athlete explicitly chose this activity type when building the template. Prompting the type again is friction without value. Consistent with W-8's existing bypass pattern for typed program slots (W-3). |
| W26-D3 | Template prescription values are the starting values; carry-forward is not applied | Carry-forward (EL-D8) is a free-workout behavior. The template IS the prescription. Overriding it silently with prior session data would diverge from the athlete's explicit design choice. |
| W26-D4 | useCount and lastUsedAt update on first save of a derived session with ≥1 set logged | Prevents inflating counts for sessions started and immediately abandoned. "Used" requires at least one logged set. Partial saves count. Full completion is not required. |
| W26-D5 | Card body tap → W-27; ▶ Start is a separate affordance | Two interaction targets on the same card: fast launch (Start) and detail management (W-27). No ambiguity about which gesture does what. Consistent with media library patterns (album tap vs. play button). |
| W26-D6 | No search in MVP | MVP template volume does not require search. Last-used sort surfaces the most relevant templates. Post-MVP consideration as library grows. |
| W26-D7 | No swipe-to-delete | Destructive action guarded behind W-27. The list surface should never feel dangerous to browse or scroll. Mutation actions are owned by W-25 and W-27. |
| W26-D8 | WorkoutSession.sourceTemplateId references the originating template | Enables W-27 to surface session history for a given template without a full session-table scan. A session started from a template carries this reference from creation through its lifecycle. |
| W26-D9 | W-25 SAVE_AS_TEMPLATE and DUPLICATE return to their callers (W-17 and W-27 respectively), not W-26 | SAVE_AS_TEMPLATE: post-workout flow should not redirect the athlete away from the achievement moment. DUPLICATE: called from W-27; returning to W-26 would skip W-27 and strand the athlete outside the template detail context. |

---

## Section 12 — Downstream Impact

| File | Required Change |
|------|----------------|
| `Workouts-Hub-Wireframe-Spec-W1.md` | Add "My Templates →" as a persistent tertiary link in the Log Activity section. Link is always shown regardless of template count. Routes to W-26. |
| `Activity-Type-Picker-Spec-W8.md` | Add template-launch as a fourth entry context. W-8 must accept a `sourceTemplateId` parameter. When present, the athlete-selected type is passed through to the logging screen along with the template pre-load. Add to W-8 entry points table and bypass condition notes. |
| `Workout-Templates-Hub-Spec-W27.md` | Forthcoming spec. W-27 is the downstream recipient of card-body taps from W-26. W-27 must reference W-26 as its caller for standard back-navigation. W-27 owns edit, duplicate, delete, and session history. |

---

## Section 13 — Validation Checklist

### Screen Identity
- [ ] W-26 is a push navigation from W-1 — not a modal, not a tab
- [ ] Header: ← Back | "Templates" title | [+] Create button
- [ ] [+] Create → W-25 CREATE_NEW

### Entry Points
- [ ] "My Templates →" in W-1 is always present regardless of template count (R1-1)
- [ ] "My Templates →" routes to W-26 template list when templates exist
- [ ] "My Templates →" routes to W-26 empty state when no templates exist
- [ ] Post-save from W-25 CREATE_NEW dismisses back to W-26
- [ ] Post-delete from W-25 (EDIT mode) navigates to W-26
- [ ] W-17 SAVE_AS_TEMPLATE does NOT route to W-26 (W26-D9)
- [ ] W-25 DUPLICATE does NOT route to W-26 (W26-D9)

### Template List
- [ ] Card line 1: name (left) | ▶ Start button (right, ≥44×44dp)
- [ ] Card line 2: activity type display name (if non-null) · exercise count · usage timestamp
- [ ] Activity type label omitted entirely when activityType is null (no placeholder text)
- [ ] Exercise count = total across WARM_UP + MAIN + COOL_DOWN
- [ ] Usage label: "Used N [time] ago" when lastUsedAt non-null (R1-2)
- [ ] Usage label: "Never used" when lastUsedAt is null (R1-2)
- [ ] "Used today" / "Used yesterday" cases handled
- [ ] Card body tap → W-27 (distinct from ▶ Start tap)
- [ ] Sort: lastUsedAt desc → null-lastUsedAt by createdAt desc
- [ ] No sort controls visible to athlete
- [ ] No search, no filter controls
- [ ] No section grouping, no sticky headers
- [ ] Standard vertical scroll

### Empty State
- [ ] Shown when athlete has zero templates
- [ ] Reachable via W-1 "My Templates →" (R1-1)
- [ ] Primary CTA: "Create Template" → W-25 CREATE_NEW
- [ ] Secondary muted line references SAVE_AS_TEMPLATE path from W-17
- [ ] No shame language, no empty row placeholders
- [ ] No "You have no templates" phrasing

### Template Actions
- [ ] ▶ Start → launch flow (Section 8)
- [ ] Card body → W-27
- [ ] Header [+] → W-25 CREATE_NEW
- [ ] No edit action from W-26
- [ ] No delete action from W-26
- [ ] No swipe-to-delete (W26-D7)
- [ ] No duplicate action from W-26

### Launch Workout Flow
- [ ] activityType non-null → bypasses W-8, navigates directly to logging screen (W26-D2)
- [ ] activityType null → navigates to W-8 with sourceTemplateId context
- [ ] WorkoutSession.sections[] cloned from template sections
- [ ] ExercisePrescription initialized from template values (including EP-A1 fields: restSeconds, distanceValue, distanceUnit)
- [ ] WorkoutSession.sourceTemplateId = WorkoutTemplate.id (W26-D8)
- [ ] WorkoutSession.activityType = template activityType OR W-8-selected type
- [ ] Carry-forward NOT applied on template launch (W26-D3)
- [ ] useCount and lastUsedAt update on session save with ≥1 set logged (W26-D4)
- [ ] useCount and lastUsedAt do NOT update on session start
- [ ] EP-A1 prescription fields (restSeconds, distanceValue, distanceUnit) NOT displayed on W-26 cards

### Schema Consistency
- [ ] All WorkoutTemplate fields match Exercise-Library-Architecture-v1.0.md: id, athleteId, name (max 60 chars), activityType, weightUnit, sections[], createdAt, updatedAt, lastUsedAt, useCount
- [ ] No WorkoutTemplate fields referenced in W-26 that do not exist in the locked schema
- [ ] weightUnit not displayed on W-26 cards (display-time rendering detail for W-25/W-9)
- [ ] EP-A1 fields live in ExercisePrescription within sections[], not on WorkoutTemplate root — W-26 does not reference EP-A1 fields directly

### Non-Behaviors
- [ ] No inline editing
- [ ] No program creation from templates
- [ ] No template sharing
- [ ] No AI generation
- [ ] No template import path
- [ ] No chapter goal matching or suggestion surface
- [ ] No carry-forward on template launch
- [ ] No undo for deletion

---

## Section 14 — Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification. Defines W-26 as the WorkoutTemplate discovery, launch, and navigation hub. Specifies card structure, sort order, empty state, launch workout flow, session pre-population, carry-forward exclusion, template update timing, and 9 architecture decisions. R1-1: W-1 entry point always present. R1-2: card metadata uses "Used N ago" / "Never used" labels. Consistency audit resolves DUPLICATE return path (W-27, not W-26). Downstream amendments to W-1 and W-8 documented. |

---

*Forge Legacy Workout Templates Hub — W-26 v1.0*
*June 2026*
*Authority for all WorkoutTemplate discovery, launch, and navigation behavior.*
