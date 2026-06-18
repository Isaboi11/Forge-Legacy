# Forge Legacy — W-27 Workout Template Detail
## Version 1.0 | June 2026

**Status:** LOCKED
**Authority:** Exercise-Library-Architecture-v1.0, ExercisePrescription-Amendment-001 (EP-A1), Free-Workout-Builder-Spec-W25.md, Workout-Templates-Hub-Spec-W26.md
**Downstream impact:** W-25 (EDIT/DUPLICATE launch context), W-26 (card-body tap navigation), W-18 (session history link), W-19 (session detail destination)

---

## Context

W-26 (Workout Templates Hub) is the library. W-25 (Free Workout Builder) is the editor. Neither owns the detail view of a single WorkoutTemplate — its full exercise structure, usage history, and management actions. W-27 fills that gap.

W-26 introduced `WorkoutSession.sourceTemplateId` (W26-D8) and defined that card-body tap navigates to "a future W-27-Template-Detail." W-25 locked that EDIT and DUPLICATE both dismiss back to W-27 as caller (W26-D9). This specification fulfills both references and completes the WorkoutTemplate lifecycle architecture.

---

## Section 1 — Screen Purpose

### 1.1 What W-27 Is

W-27 is the detail and management surface for a single `WorkoutTemplate`. It shows the full workout structure (exercises organized by section), template identity (name, activity type), usage context (use count, last-used date), and recent session history. From W-27, the athlete can start the workout, navigate to edit, duplicate, or delete the template.

### 1.2 What W-27 Is Not

- Not a reporting dashboard or analytics screen
- Not an editing surface (editing is delegated to W-25)
- Not a scheduling or planning tool
- Not a sharing or publishing surface
- Not a session-logging screen

The athlete should feel: **"This is one of my workouts."**
Not: "This is a template object I am administering."

### 1.3 Relationship to W-26

W-26 owns template discovery, list display, and the ▶ Start CTA on each card. W-27 is the detail behind each card. W-26 card-body tap (distinct from ▶ Start) navigates to W-27. W-27 provides the full workout structure view and the management actions (edit, duplicate, delete) that are not surfaced on W-26 cards.

### 1.4 Relationship to W-25

W-25 is the builder and editor. W-27 navigates into W-25 EDIT mode for editing and W-25 DUPLICATE mode for duplication. W-27 does not duplicate W-25 functionality — all mutation is delegated.

After EDIT, W-25 dismisses back to W-27 of the edited template (W26-D9). After DUPLICATE, W-25 navigates to W-27 of the newly created copy — not the original (W27-D6).

---

## Section 2 — Entry Paths

### 2.1 Primary Path

**W-26 card-body tap → W-27**

The athlete taps the body of a template card in W-26 (not the ▶ Start button). This is the only standard forward-navigation entry path to W-27 in MVP.

### 2.2 Return Paths (W-27 as Destination After Delegation)

These are not new entry paths; they are the return destinations for W-25 operations launched from W-27:

- **W-25 EDIT save or back → W-27** of the edited template (W26-D9)
- **W-25 DUPLICATE save → W-27** of the **newly created copy** (W27-D6) with toast: `"[Name] (Copy) created"`

### 2.3 No Other Entry Paths (MVP)

W-27 has no deep link, notification entry, or internal cross-navigation entry other than those above. A post-session completion flow that routes back to W-27 is a post-MVP consideration.

---

## Section 3 — Template Overview

The template overview occupies the top of the scroll body, below the navigation bar.

```
[Template Name — 26sp, primary weight]
[Activity Type — chip, 12sp secondary muted — if non-null]
[Usage Line — 13sp, secondary muted]
```

### 3.1 Template Name

26sp, primary weight. Wraps to a second line if necessary. Max 60 chars enforced at creation (W-25).

### 3.2 Activity Type

Displayed as a small chip using the display name mapping from W-26 §3.2:

| Enum | Display |
|------|---------|
| `STRENGTH` | Strength |
| `RUN` | Run |
| `WALK` | Walk |
| `BIKE` | Bike |
| `SWIM` | Swim |
| `HIIT` | HIIT |
| `MOBILITY` | Mobility |
| `YOGA` | Yoga |
| `OTHER` | Other |
| `null` | *(row absent entirely — no placeholder)* |

### 3.3 Usage Line

| State | Display |
|-------|---------|
| `useCount = 0` | "Never used" |
| `useCount = 1, lastUsedAt non-null` | "Used 1 time · Last used [relative]" |
| `useCount ≥ 2, lastUsedAt non-null` | "Used [N] times · Last used [relative]" |

**Relative time format** (matches W-26):
- Same day: "today"
- Previous day: "yesterday"
- 2–6 days: "[N] days ago"
- 1–3 weeks: "[N] weeks ago"
- 1+ months: "[N] months ago"

**What is NOT shown in the overview:**
- Exercise count: visible in the structure display below; redundant here
- `weightUnit`: context-specific to exercises; shown inline per prescription
- `createdAt` / `updatedAt`: internal metadata; not surfaced
- Description: `WorkoutTemplate` has no description field

---

## Section 4 — Workout Structure Display

The workout structure display occupies the scroll body below the overview. It shows the template's exercises organized by section.

### 4.1 Section Behavior

Sections are displayed in fixed order: **WARM-UP → MAIN WORKOUT → COOL-DOWN**

Section headers: 12sp uppercase muted secondary (consistent with W-9, W-19).

**Visibility rule:** A section header is displayed only if the section contains ≥1 exercise. Empty optional sections (WARM_UP or COOL_DOWN with 0 exercises) are not displayed — no header, no placeholder. (W27-D3)

MAIN WORKOUT is always displayed. W-25 requires ≥1 exercise in MAIN for save eligibility.

### 4.2 Empty Section Behavior

| Condition | Display |
|-----------|---------|
| WARM_UP with 0 exercises | Section absent entirely |
| COOL_DOWN with 0 exercises | Section absent entirely |
| MAIN (always ≥1 exercise) | Always displayed |
| Template has MAIN only | Only MAIN WORKOUT header shown |

### 4.3 Exercise Presentation

Each exercise within a section is displayed as a row:

```
[40pt static thumb]  [Exercise Name — 15sp, primary]
                     [Prescription Summary — 13sp, secondary muted]
                     [Note — 13sp, italic, muted — if non-null]
```

**Thumbnail:** 40pt, static image (gifThumbnailUrl — no autoplay, per ED-5 GIF autoplay policy). Placeholder shown if thumbnail unavailable.

**Exercise name:** Display name from `ExerciseDefinition`. If the referenced exercise has been deleted, display `"[Deleted Exercise]"` with a placeholder thumbnail; row is not tappable.

**Prescription Summary** — formatted per `activityType` (null defaults to STRENGTH rules):

| activityType | Prescription Format |
|---|---|
| STRENGTH / HIIT / OTHER / null | `[N] sets × [N] reps` `[· weight value unit]` `[· distance value unit if non-null]` `[· Rest Ns if non-null]` |
| MOBILITY / YOGA | `[N] sets × [N]s` `[· Rest Ns if non-null]` |
| RUN / WALK / BIKE / SWIM | `[N] sets × [N]s` `[or distance value unit]` `[· Rest Ns if non-null]` |

Rules:
- Any null field is omitted from the summary line — no placeholder dashes or zeros
- If all prescription fields are null, the prescription line is absent (exercise name + thumb only)
- Weight displays with `template.weightUnit` (creation-time snapshot, W25-D2 — immutable)
- Distance unit per EPA1-D1: per-exercise `distanceUnit` field (m / km / mi); different exercises in the same template may display different units

**Notes:** If `notes` is non-null, displayed below the prescription summary as 13sp italic muted. Max 200 chars (EP-A1).

### 4.4 Exercise Row Tap Behavior

Exercise rows in W-27 are **not tappable** in MVP. (W27-D7)

W-27 is display-only. Navigation to W-22 (Exercise Detail) from template context is a post-MVP consideration.

---

## Section 5 — Primary Actions

### 5.1 Action Layout

W-27 has a **sticky bottom action bar**:

```
┌────────────────────────────────────────────────────────┐
│  [  Edit  ]                    [▶  Start Workout  ]   │
└────────────────────────────────────────────────────────┘
```

- **Start Workout** — right, filled/primary style
- **Edit** — left, outlined/secondary style

The navigation bar (top right) carries a `···` overflow menu:
1. Duplicate Template
2. Delete Template *(destructive label — red/danger)*

### 5.2 Start Workout (Primary CTA)

Launches the active workout flow with this template pre-loaded. Behavior matches W-26 Start behavior:

- If `activityType` is non-null: launch directly into the active workout (W-8 skipped; activity type already set)
- If `activityType` is null: navigate to W-8 (Activity Type Picker) first, then launch

The resulting `WorkoutSession` carries `sourceTemplateId = template.id`, set at session creation. `useCount` and `lastUsedAt` update on first session save with ≥1 set logged (W-26 §8.4).

### 5.3 Edit Template (Secondary)

Navigates to W-25 in EDIT mode:

```
W25LaunchContext {
  mode: 'EDIT',
  sourceTemplateId: template.id,
  sourceSessionId: null
}
```

W-25 loads the existing template. On save or back, W-25 dismisses back to W-27 (W26-D9). Delete is available within W-25 EDIT mode (separate entry point from §7).

### 5.4 Duplicate Template (Overflow)

Navigates to W-25 in DUPLICATE mode:

```
W25LaunchContext {
  mode: 'DUPLICATE',
  sourceTemplateId: template.id,
  sourceSessionId: null
}
```

W-25 creates a new `WorkoutTemplate` with:
- `name`: `"[Source Name] (Copy)"`
- `useCount`: 0
- `lastUsedAt`: null
- All sections and exercises deep-copied

On save, W-25 navigates to **W-27 of the newly created copy** (W27-D6). Toast displayed on arrival: `"[Name] (Copy) created"`.

The back stack after DUPLICATE save: **W-26 → W-27 (new copy)**. W-27 of the original template is not in the stack. Back from W-27 (new copy) → W-26.

### 5.5 Delete Template (Overflow)

See Section 7. Overflow item uses destructive label style (red/danger).

---

## Section 6 — Session History

### 6.1 MVP Inclusion

Session history is included in MVP. (W27-D1)

`WorkoutSession.sourceTemplateId` (W26-D8) was explicitly designed to enable this connection. The value is personal reference — "I've done this workout 7 times, last on June 9" — not analytics. This reinforces the "this is one of my workouts" identity without turning W-27 into a reporting screen.

### 6.2 Data Source

Sessions where `WorkoutSession.sourceTemplateId = template.id`, ordered by `createdAt` descending. Up to 5 most recent sessions are shown. (W27-D5)

### 6.3 Section Absent When Empty

If `useCount = 0`, the PAST SESSIONS section is absent entirely. No "No sessions yet" placeholder. The section simply does not render. (Consistent with W-27 empty state pattern: absent means absent.)

### 6.4 Display Structure

Section header: **"PAST SESSIONS"** — 12sp uppercase muted secondary (matches section header style)

Each session row:

```
[Date — e.g., "Mon, Jun 9"]              [Duration — e.g., "45 min"]
[Primary Stat — e.g., "12 sets · 3 exercises"]    [Partial chip if applicable]
```

**Date format:** "Day, Mon Date" abbreviated (e.g., "Mon, Jun 9") — consistent with W-18.

**Duration format** (consistent with W-18/W-19):
- `< 1 min`: "< 1 min"
- 1–59 min: "[N] min"
- 60–89 min: "1 hr [N] min"
- Exact hour: "[N] hr"
- 90+ min: "[N] hr [M] min"

**Primary stat by activityType:**

| activityType | Stat Format |
|---|---|
| STRENGTH / null | "[N] sets · [M] exercises" |
| RUN / WALK / BIKE / SWIM | "[distance] [unit]" |
| HIIT | "[N] rounds" |
| MOBILITY / YOGA | *(duration already shown — no secondary stat)* |
| OTHER | "[N] sets" *(if available)* |

**Partial indicator:** `"Partial"` chip (11sp, neutral color — not red/alarm) if `session.isPartial: true`. Consistent with W-18.

**Session row tap:** → W-19 Activity Detail for that session. Back from W-19 → W-27 at prior scroll position.

### 6.5 "View in Activity History" Link

If `useCount > 5`, a link is displayed below the 5 session rows:

`"View in Activity History"` — 14sp, accent/link color → W-18

W-18 shows the athlete's full session history (unfiltered). No template-specific filter exists in W-18 (MVP).

### 6.6 Session History Does Not Include

- Chapter attribution (belongs in W-18/W-19, not in template context)
- Program attribution (template-based sessions are not program sessions)
- Exercise-level details (that is W-19's responsibility)
- Performance comparison or trend indicators

---

## Section 7 — Delete Flow

### 7.1 Entry Point

Delete Template is accessed via the `···` overflow menu on W-27 (second item, destructive label). (W27-D4)

The athlete does NOT need to enter W-25 EDIT mode to delete from W-27. W-27 is the management surface and owns this entry point. W-25 EDIT retains its own delete entry point for athletes who arrive at deletion via the editor.

### 7.2 Confirmation Sheet

On tap of "Delete Template," a confirmation sheet is presented:

```
Delete "[Template Name]"?

This cannot be undone. Sessions launched from
this template are not affected.

[Cancel]          [Delete]
                   ↑ red/destructive
```

- Template name is quoted in the title
- "Sessions launched from this template are not affected" — reinforces History Cannot Be Rewritten principle
- Confirmation copy matches W-25 §9.4 semantics exactly
- **Cancel:** dismiss sheet, return to W-27
- **Delete:** execute deletion, navigate to W-26

### 7.3 Post-Delete Navigation

1. Template record is deleted
2. Navigate to W-26 (the hub)
3. W-27 is not in the navigation stack (no subject remains)
4. Toast on W-26: `"[Template Name] deleted"`

### 7.4 W-27 Delete vs W-25 Delete — Comparison

| | W-27 Delete | W-25 Delete |
|---|---|---|
| Entry | `···` overflow on W-27 | Bottom destructive action in W-25 EDIT |
| Confirmation | Sheet on W-27 | Sheet in W-25 |
| Confirmation copy | Identical | Identical |
| Post-delete destination | W-26 | W-26 |
| Semantics | Identical | Identical |

Both paths lead to the same outcome. W-27's path is shorter for athletes who know they want to delete without editing first.

---

## Section 8 — Navigation

| Action | Destination | Notes |
|---|---|---|
| Back (← button) | W-26 | Standard back. W-26 restores prior scroll position. |
| Edit | W-25 EDIT mode | Returns to W-27 on save or back (W26-D9). |
| Duplicate (overflow) | W-27 of new copy | W-25 DUPLICATE creates new template; navigates to its W-27. Toast shown on arrival. Back stack: W-26 → W-27 (new copy). |
| Delete (overflow) | Confirmation → W-26 | See Section 7. Toast on W-26. |
| Start Workout | W-8 (null activityType) or active workout (non-null) | Matches W-26 launch behavior. |
| Session row tap | W-19 Activity Detail | Back from W-19 → W-27 at prior scroll position. |
| "View in Activity History" | W-18 | Shown only when `useCount > 5`. |

### 8.1 Back Stack

- **W-26 → W-27:** Forward push. Back from W-27 → W-26.
- **W-27 → W-25 EDIT:** W-25 presents as a modal-style sheet. On save or back, W-25 dismisses back to W-27 of the edited template (W26-D9). Stack: W-26 → W-27 (unchanged).
- **W-27 → W-25 DUPLICATE → W-27 (new copy):** W-25 presents modally over W-27 (original). On save, W-25 navigates forward to W-27 of the new copy. The original W-27 is not retained in the stack. Result stack: W-26 → W-27 (new copy). (W27-D6)
- **W-27 → W-19:** W-19 pushes onto the navigation stack. Back from W-19 → W-27 at prior scroll position.
- **W-27 → W-26 (after delete):** W-27 is popped from the stack. W-26 is the root.

---

## Section 9 — Empty / Edge States

### 9.1 Never Used Template (useCount: 0, lastUsedAt: null)

- Overview usage line: "Never used"
- PAST SESSIONS section: absent entirely
- All CTAs: active (Start Workout, Edit, Duplicate, Delete all available)
- Workout structure: displayed normally

### 9.2 Template With Only MAIN Section

- Only MAIN WORKOUT header shown
- No WARM-UP or COOL-DOWN headers
- Clean display — no empty indicators

### 9.3 Template With Empty Optional Sections

WARM_UP or COOL_DOWN sections in `template.sections[]` with 0 exercises are not displayed. No header, no placeholder, no "Add exercises in W-25" prompt. (W27-D3)

### 9.4 Template With Null Activity Type

- Activity type chip row is absent from overview
- Prescription display follows STRENGTH rules (default per W-25 §5.2)

### 9.5 Deleted Exercise in Template

If an `ExerciseDefinition` referenced by an `ExercisePrescription` has been deleted:
- Show `"[Deleted Exercise]"` with placeholder thumbnail
- Prescription values (sets, reps, weight, etc.) are displayed as authored — they are stored on `ExercisePrescription`, not the definition
- Row is not tappable
- Not an error state — a valid, displayable condition

### 9.6 All Prescription Fields Null

If an exercise has all `ExercisePrescription` fields null (`sets`, `reps`, `durationSeconds`, `weightValue`, `distanceValue`, `restSeconds` all null):
- Exercise name and thumbnail shown
- No prescription summary line
- Notes shown if `notes` is non-null

Valid state. An athlete may add an exercise to a template as a structural placeholder without specified prescription.

### 9.7 Deleted Template Return Path

After deleting a template from W-27:
- W-27 is removed from the navigation stack
- Destination is W-26
- No "return to W-27" behavior — no subject exists

---

## Section 10 — Non-Behaviors

| Non-Behavior | Reason |
|---|---|
| No inline editing | W-27 is display-only. All editing is delegated to W-25. |
| No tappable exercise rows (MVP) | W-22 (Exercise Detail) navigation from template context is not required for MVP. Back-stack complexity deferred. (W27-D7) |
| No performance analytics | Session history provides personal reference, not analysis. No charts, trends, PR indicators, or progression tracking. |
| No "compare to last time" | Comparison language conflicts with the "this is one of my workouts" identity. Deferred to a potential dedicated progress feature post-MVP. |
| No template sharing or publishing | Templates are personal. Forge Legacy has no content ecosystem. |
| No program linking | Templates are standalone structures. Programs have their own slot model (W-24). A template cannot be "attached" to a program from W-27. |
| No AI suggestions | No AI-generated exercises, no auto-fill prescriptions, no generated workout variants. |
| No scheduling | Templates are launched on demand. Scheduling is post-MVP. |
| No undo for delete | Deletion is confirmed and irreversible. Sessions are not affected (History Cannot Be Rewritten). No undo toast. |
| No template rating or reviews | Templates are personal tools. No social proof mechanics. |
| No export | No defined MVP export format for templates. |
| No rename on duplicate | Duplicate creates `"[Name] (Copy)"`. Renaming is done via W-25 EDIT after duplication — no inline rename prompt on duplicate. |
| No "resume from last position" | Templates are not stateful programs. Each launch starts fresh from the template's exercise structure. |

---

## Section 11 — Architecture Decisions

| ID | Decision | Rationale |
|---|---|---|
| W27-D1 | Session history is included in MVP | `WorkoutSession.sourceTemplateId` (W26-D8) was specifically designed to enable this connection. The value is personal reference, not analytics — reinforcing "this is one of my workouts." Data is free to query; cost is one indexed lookup. |
| W27-D2 | Start Workout CTA is present on W-27 | An athlete previewing the template should not need to navigate back to W-26 to launch. W-26 Start = quick launch without inspection; W-27 Start = post-review launch. Both produce the same session. |
| W27-D3 | Empty optional sections are hidden | Consistent with W-9 and W-19 behavior where empty sections are completely absent. An empty WARM_UP or COOL_DOWN in template detail has no display value. Athletes manage sections in W-25. |
| W27-D4 | Delete has its own entry point on W-27 (overflow) | Requiring athletes to enter W-25 EDIT mode just to delete creates unnecessary navigation friction. W-27 is the management surface and owns this entry point. Confirmation copy and semantics match W-25 exactly — behavior is identical, path is shorter. |
| W27-D5 | Session history is limited to 5 most recent | Full session history exists in W-18. Displaying all sessions in W-27 risks making it feel like a reporting screen. 5 recent sessions provides temporal reference ("when did I last do this?") without analytics overhead. |
| W27-D6 | Duplicate navigates to W-27 of the new copy (R1-1) | W26-D9 established that W-25 returns to W-27 (not W-26). W27-D6 further specifies *which* W-27: the new copy, not the original. The new copy is the result of the duplication action; the athlete's attention should follow the result. This enables immediate rename or edit without requiring the athlete to navigate back to W-26 to locate the copy. Back from the new copy's W-27 returns to W-26. |
| W27-D7 | Exercise rows are not tappable in MVP | W-27 is a display-only screen. W-22 (Exercise Detail) navigation from template context introduces a back-stack case (W-22 → W-27 → W-26) that requires coordination with W-22's own actions. Post-MVP consideration. |
| W27-D8 | Overview omits exercise count | Exercise count is implicitly visible from the structure display (the athlete can see the exercises directly). Repeating it in the header adds noise. Usage stats (count + last-used) provide temporal and frequency context that is not visible in the structure. |

---

## Section 12 — Validation Checklist

### Screen Identity
- [ ] W-27 is display-only; no inline editing of template content
- [ ] Athlete experience reads as "one of my workouts," not as template management

### Entry Paths
- [ ] W-26 card-body tap (distinct from ▶ Start) → W-27
- [ ] W-25 EDIT save/back → W-27 of the edited template
- [ ] W-25 DUPLICATE save → W-27 of the newly created copy with toast (W27-D6)

### Template Overview
- [ ] Name: 26sp, primary weight; wraps if needed
- [ ] Activity type chip: shown if non-null; row absent if null
- [ ] Usage line: "Never used" if `useCount = 0`; "Used N time(s) · Last used X" if `lastUsedAt` non-null
- [ ] Exercise count NOT shown in overview (W27-D8)

### Workout Structure Display
- [ ] Section render order: WARM-UP → MAIN WORKOUT → COOL-DOWN (fixed)
- [ ] Section header shown only if section has ≥1 exercise
- [ ] Empty WARM_UP / COOL_DOWN: header absent, no placeholder (W27-D3)
- [ ] MAIN WORKOUT: always shown (always ≥1 exercise by W-25 save rules)
- [ ] Exercise row: 40pt static thumbnail, name, prescription summary, notes
- [ ] Prescription display follows `activityType` rules (null → STRENGTH default)
- [ ] Deleted exercises: `"[Deleted Exercise]"`, placeholder thumb, prescription still shown, not tappable
- [ ] All-null prescription: exercise shown without prescription line
- [ ] Exercise rows: NOT tappable in MVP (W27-D7)

### Actions
- [ ] Sticky bottom bar: [Edit] secondary left | [▶ Start Workout] primary right
- [ ] `···` overflow: Duplicate Template | Delete Template (destructive style)
- [ ] Start Workout: matches W-26 launch behavior (W-8 if `activityType` null; direct otherwise)
- [ ] Edit → W-25 EDIT, returns to W-27 (W26-D9)
- [ ] Duplicate → W-25 DUPLICATE, navigates to W-27 of new copy with toast (W27-D6); back stack becomes W-26 → W-27 (new copy)

### Session History
- [ ] Section absent if `useCount = 0` (no placeholder)
- [ ] Shows up to 5 most recent sessions by `createdAt` descending
- [ ] "View in Activity History" link shown only if `useCount > 5`
- [ ] Session row: date (abbreviated), duration, primary stat by `activityType`
- [ ] Partial sessions: "Partial" chip, neutral color only
- [ ] Session row tap → W-19; back from W-19 → W-27
- [ ] No chapter or program attribution in session rows (W-27 context; those belong in W-18/W-19)

### Delete Flow
- [ ] Entry: `···` overflow → "Delete Template" (destructive label)
- [ ] Confirmation sheet: quoted template name; "cannot be undone"; "sessions not affected"
- [ ] Confirmation copy matches W-25 §9.4 exactly
- [ ] Cancel: dismiss sheet, remain on W-27
- [ ] Delete: remove template → navigate to W-26 with toast `"[Name] deleted"`
- [ ] W-27 not in navigation stack after delete

### Navigation
- [ ] Back → W-26
- [ ] Session row → W-19; back from W-19 → W-27 at prior scroll position
- [ ] Delete → W-26 (W-27 not in stack)
- [ ] W-25 EDIT presents modally; dismisses back to W-27 of edited template (W26-D9)
- [ ] W-25 DUPLICATE presents modally; on save navigates to W-27 of new copy — original W-27 not retained in stack (W27-D6)

### Edge States
- [ ] Never used: "Never used" in overview; PAST SESSIONS absent
- [ ] Null `activityType`: no chip row; STRENGTH prescription rules applied
- [ ] Deleted exercise: `"[Deleted Exercise]"` label, placeholder thumb, prescription still shown
- [ ] All-null prescription: name + thumb only; no prescription line
- [ ] MAIN-only template: only MAIN WORKOUT header rendered
- [ ] Empty optional sections: hidden in W-27 (not displayed)

---

## Section 13 — Downstream Impact

| File | Impact |
|------|--------|
| `Workout-Templates-Hub-Spec-W26.md` | W-26 card-body tap now has a defined destination (W-27). W26-D5 and W26-D7 fulfilled. |
| `Free-Workout-Builder-Spec-W25.md` | W-25 EDIT and DUPLICATE dismiss back to W-27 caller (W26-D9 fulfilled). Delete from W-25 EDIT navigates to W-26 (unchanged). |
| `Activity-Detail-Wireframe-Spec-W19.md` | W-19 is now a destination from W-27 session history rows. Back from W-19 returns to W-27 (W-19 back behavior unchanged). |
| `Activity-History-Wireframe-Spec-W18.md` | W-18 is a destination for "View in Activity History" link when `useCount > 5`. No W-18 spec changes required. |

---

## Section 14 — Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification. Defines W-27 as the detail and management surface for a single WorkoutTemplate. Establishes template overview, workout structure display, sticky action bar (Edit + Start Workout), session history (up to 5 most recent via sourceTemplateId), delete flow (W-27 overflow entry point with W-26 destination), navigation map, edge states, 8 architecture decisions (W27-D1–D8), and full validation checklist. Fulfills W26-D5, W26-D7, W26-D8, and W26-D9 references. Completes WorkoutTemplate lifecycle architecture. Incorporates R1-1 before lock: W27-D6 updated so DUPLICATE navigates to W-27 of the new copy rather than the original; back stack, Section 5.4, Section 8, and checklist updated accordingly. R1-2 (session history empty state) rejected — no change. |

---

*Forge Legacy W-27 Workout Template Detail — v1.0*
*June 2026*
*Authority for all WorkoutTemplate detail, management action, and session history display decisions.*
