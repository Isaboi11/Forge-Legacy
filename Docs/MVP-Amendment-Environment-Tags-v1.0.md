# Forge Legacy — MVP Amendment
## Environment Tags v1.0
### Status: Approved | MVP | Locked | June 2026

**Amendment Authority:** Product decision, locked.
**Scope:** Program-level environment tags only. This amendment does not constitute implementation of the full Training Environment Classification Architecture, which remains deferred to V1.1.
**Affected Specs:** W-2 Program Browse, W-3 Program Detail, W-4 Program Create.
**Deferred:** Full Training Environment Architecture — deferred to V1.1 alongside Exercise Library Architecture.

---

## Section 1 — Purpose

Forge Legacy's program library serves athletes who train in different environments: commercial gyms, home gyms, and bodyweight / minimal equipment contexts. Without any environment signal, the program library risks appearing exclusively oriented toward commercial gym athletes — a first impression problem for an important long-term segment.

This amendment adds a lightweight, informational environment tag to programs. The tag is a compatibility signal: it tells the athlete what training context a program was designed for before they commit to reading the full program description.

**What this amendment solves:**
- Home gym and bodyweight athletes can scan the program library and immediately identify programs designed for their context
- First impression for non-commercial gym athletes is addressed at the point of highest impact: program discovery
- A correctly structured data field is seeded for the V1.1 full architecture to build on

**What this amendment does not solve:**
- It does not filter or restrict which programs an athlete sees
- It does not evaluate compatibility with an athlete's equipment
- It does not modify the athlete profile or onboarding
- It does not define an exercise library or equipment requirements at the exercise level

---

## Section 2 — Environment Values

Three environment values are defined. These are the canonical values for all future use, including V1.1.

| Value | Label | Meaning |
|-------|-------|---------|
| `commercial_gym` | Commercial Gym | Full equipment access — barbells, dumbbells, machines, cables, racks, platforms |
| `home_gym` | Home Gym | Limited setup — barbell + rack, adjustable dumbbells; rack-dependent exercises; no machines or cables assumed |
| `bodyweight` | Bodyweight | Minimal or no equipment — bodyweight-focused, travel-friendly; pull-up bar and resistance bands optional |

**These values are an enum, not freeform text.** All program records store environment tags using these exact values. This ensures V1.1 filtering and compatibility systems can query against a clean, consistent data set without migration.

---

## Section 3 — Program-Level Field Behavior

### 3.1 Data Model

Every program record has an optional `environment_tags` field.

- Type: multi-select enum (one or more values from the defined set)
- Required: No — the field is optional at program creation
- Default: empty (no tag) — programs without environment tags display no badge

**Why multi-select:** Some programs are genuinely compatible with multiple environments. A barbell-only strength program without machine exercises works equally well in a commercial gym and a home gym. Forcing single-select would either misclassify these programs or require arbitrary choices. Multi-select allows accurate labeling.

**Why optional:** Forcing every program to carry an environment tag before it is accurate would populate the field with low-quality or arbitrary data. Programs should only carry tags the creator is confident in. Untagged programs are shown without a badge — not hidden, not penalized.

### 3.2 Programs With No Tag

Programs without an environment tag display no badge on W-2 or W-3. There is no "Unspecified" label. No placeholder. The program card and detail look clean. The absence of a tag is not a signal — it simply means the program's environment has not been classified.

### 3.3 Programs With Multiple Tags

If a program carries both `commercial_gym` and `home_gym` tags, both badges are displayed. Tag order in the display follows the canonical order: Commercial Gym → Home Gym → Bodyweight.

---

## Section 4 — W-2 Program Browse Amendment

### 4.1 Environment Badge on Program Cards

Program browse cards (W-2) display environment tag badges for tagged programs.

**Badge placement:** Below the program name, above or inline with secondary metadata (version, workout count).

**Badge appearance:**
```
┌──────────────────────────────────────────────────────────┐
│  [Program Name]                            v[Version]    │
│  [Commercial Gym]  [Home Gym]                            │  ← Environment badges (if tagged)
│  [N] workouts  ·  [Activity Type]                        │
│  ▓▓▓▓▓▓▓░░░░░░░░░░░░  X of Y                            │  ← Progress (if enrolled)
└──────────────────────────────────────────────────────────┘
```

**Badge styling:**
- Compact pill/chip label
- 11–12sp, secondary weight
- Muted border or subtle background — environment badges are informational, not promotional. They should not compete visually with the program name or the athlete's progress bar.
- Each environment value is a distinct chip (not comma-separated text)

**Programs without a tag:** Card renders identically to pre-amendment card. No empty badge area. No change to layout.

### 4.2 No Filter Changes

W-2 does not gain an environment filter in this amendment. The badge is display-only. Filtering is a V1.1 feature.

---

## Section 5 — W-3 Program Detail Amendment

### 5.1 Environment Tags in Program Detail

W-3 Program Detail displays environment tags in the program metadata section — alongside version number, workout count, and other program-level attributes.

**Display:**
```
┌──────────────────────────────────────────────────────────┐
│  [Program Name]                            v[Version]    │
│                                                          │
│  [Commercial Gym]  [Home Gym]                            │  ← Environment badges (if tagged)
│                                                          │
│  [N] workouts  ·  [Workout Type]  ·  [Duration range]   │
│                                                          │
│  [Program description / overview]                        │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

**Styling:** Same badge treatment as W-2. Consistent visual weight across browse and detail contexts.

**Programs without a tag:** No badge section rendered in W-3. The program metadata section is identical to pre-amendment layout.

---

## Section 6 — W-4 Program Create Amendment

### 6.1 Environment Tags Field in Program Creation

W-4 (Create Program) gains an optional Environment Tags field.

**Field behavior:**
- Multi-select — athlete can select one or more values
- Optional — not required to save/publish a program
- Position: after program name and description fields, before workout schedule
- Label: "Training Environment (Optional)"
- Helper text: "Select all environments this program is compatible with."

**Field wireframe:**
```
┌──────────────────────────────────────────────────────────┐
│  Training Environment  (Optional)                        │
│                                                          │
│  ☐  Commercial Gym                                       │
│  ☐  Home Gym                                             │
│  ☐  Bodyweight                                           │
│                                                          │
│  Select all environments this program is compatible      │
│  with. You can leave this blank.                         │
└──────────────────────────────────────────────────────────┘
```

**Checkboxes (not radio buttons):** Multi-select behavior. An athlete creating a Home Gym program can select only "Home Gym." An athlete creating a barbell-only program can select both "Commercial Gym" and "Home Gym."

**Forked programs:** A forked program inherits the environment tags of the parent. The athlete can modify them freely before saving the fork.

---

## Section 7 — Scope Exclusions

The following are explicitly out of scope for this amendment and remain deferred to V1.1:

| Feature | Status |
|---------|--------|
| Athlete profile environment fields | Deferred — V1.1 |
| Onboarding environment collection | Deferred — V1.1 |
| W-2 environment filter | Deferred — V1.1 |
| Import (W-IM-2) environment classification | Deferred — V1.1 |
| Exercise library with per-exercise equipment requirements | Deferred — V1.1 |
| Environment-aware exercise substitution | Deferred — V1.1 |
| Compatibility engine | Deferred — V1.1 |
| AI program generation or recommendation | Post-MVP |
| Equipment inventory management | Post-MVP |

---

## Section 8 — Relationship to V1.1 Full Architecture

This amendment is designed as V1.1 foundation, not throwaway work.

**V1.1 builds on this amendment by adding:**
- Profile environment fields (athlete declares primary + secondary environments)
- Onboarding collection (athlete sets environment during setup)
- W-2 filter (athlete filters program library by environment compatibility)
- W-IM-2 field (imported programs classified by environment)
- Exercise library with equipment tags (validates environment labels at the exercise level)

**No migration required:** The `environment_tags` field defined in this amendment uses the same enum values V1.1 will query. Programs tagged in MVP are immediately compatible with V1.1 filtering. No data model change needed between MVP and V1.1 for the program-level field.

---

## Section 9 — Validation Checklist

### W-2 Program Browse
- [ ] Environment badge(s) displayed for tagged programs
- [ ] Badge uses enum labels: "Commercial Gym," "Home Gym," "Bodyweight"
- [ ] Multiple tags render as distinct chips (not comma-separated text)
- [ ] Programs without tags: no badge area rendered, card layout unchanged
- [ ] Badge visual weight is informational — does not compete with program name or progress bar
- [ ] No environment filter added to W-2 (deferred to V1.1)

### W-3 Program Detail
- [ ] Environment badge(s) displayed in program metadata section for tagged programs
- [ ] Consistent badge styling with W-2 treatment
- [ ] Programs without tags: no badge section rendered, detail layout unchanged

### W-4 Program Create
- [ ] "Training Environment (Optional)" field present in program creation form
- [ ] Field is multi-select (checkboxes, not radio buttons)
- [ ] Three options: Commercial Gym, Home Gym, Bodyweight
- [ ] Field is optional — program can be saved/published with no environment selected
- [ ] Helper text present: "Select all environments this program is compatible with."
- [ ] Forked programs inherit parent environment tags; athlete can modify before saving

### Data Model
- [ ] `environment_tags` field is a multi-select enum with values: `commercial_gym`, `home_gym`, `bodyweight`
- [ ] Empty array is a valid state (untagged program)
- [ ] Field is consistent with V1.1 taxonomy — no migration required at V1.1

### Scope Compliance
- [ ] No onboarding changes in this amendment
- [ ] No profile changes in this amendment
- [ ] No filtering system in this amendment
- [ ] No import flow changes in this amendment
- [ ] No compatibility engine in this amendment
- [ ] No exercise library dependency in this amendment
- [ ] No AI integration in this amendment

---

*Forge Legacy MVP Amendment — Environment Tags v1.0*
*Approved June 2026*
*Full Training Environment Classification Architecture deferred to V1.1 alongside Exercise Library Architecture.*
*This amendment is the authority for all MVP environment tag implementation.*
