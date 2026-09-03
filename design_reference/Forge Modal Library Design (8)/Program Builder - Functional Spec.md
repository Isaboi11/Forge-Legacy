# Forge Program Builder — Complete Functional Specification

This documents **every** function of the Program Builder screen (`Forge Program Builder.dc.html`) as built. It is a build-to spec for reimplementation. Nothing here is aspirational — it all exists in the current build.

---

## 0. Purpose & mental model

The Program Builder lets a user create, edit, or duplicate a multi-week training program. A program is:

- **N weeks** (4–52) × **M training days/week** (2–6).
- Each **day** has three ordered sections: **Warm-up** (optional), **Main** (required), **Cool-down** (optional).
- Each **exercise** in a section has a **name, equipment, muscles, type, sets (1–8), reps (1–60)**.
- Structure is either **Repeat** (one weekly template repeated every week) or **Customize** (every week built individually).

The whole thing operates on a single in-progress **draft** object persisted to `localStorage`. There is no server. Exercises are chosen on a separate **Exercise Picker** screen; the builder hands off and receives the result via a localStorage "inbox".

---

## 1. Data model

### 1.1 Draft object (`forge_program_draft_v1`)
The live editing state. Shape:

```
{
  name: string,                    // program name, ≤40 chars
  weeks: number,                   // 4–52
  daysPerWeek: number,             // 2–6
  vary: boolean,                   // false=Repeat, true=Customize
  openWeek: number | null,         // which week is open (customize mode only)
  openDay: number | null,          // which day is open in the day builder
  days: Day[],                     // the REPEAT template (used when !vary)
  weekPlans: { days: Day[] }[] | null,  // per-week plans (used when vary)
  _mode: 'new' | 'edit' | 'dup' | null,
  _editId: string | null,          // id being edited (edit mode)
  _srcId: string | null            // source id we hydrated from (edit/dup)
}
```

### 1.2 Day object
```
{ letter: 'A'..'F', name: string, warmup: Exercise[], main: Exercise[], cooldown: Exercise[] }
```
- `letter` is auto-assigned A–F by position; used as a fallback label.
- `name` is user-facing; ≤30 chars. Empty name displays as `Day {letter}`.

### 1.3 Exercise object
```
{ id: string, name: string, equip: string, muscles: string[], type: string, sets: number, reps: number }
```
- `id` is a generated unique string (`'x'+Date.now()+random`, or `'imp'`/`'h'` prefixes by origin).

### 1.4 Other localStorage keys
- **`forge_program_draft_v1`** — the working draft (this screen's autosave). Cleared on Save or Cancel.
- **`forge_builder_inbox_v1`** — handoff FROM the Exercise Picker: the exercise(s) to insert, plus `{vary, week, day, section}` target. Consumed and removed on boot.
- **`forge_created_programs_v1`** — the persisted array of user-created/edited programs. This is the builder's OUTPUT.

---

## 2. Entry & boot sequence

### 2.1 Readiness gate
- On mount, poll every 40ms until both `React.createElement` and `window.ForgeLegacyVisualFoundation_5368b2` exist, then `_boot()` and set `ready:true`.
- Until ready, render the **loading splash** (centered bronze logo mark on a solid background). This is a **preview-runtime stability shim** (per project notes) — in production, mount normally; keep the gate only if a real hydration race exists.
- `componentWillUnmount` clears the poll timeout.

### 2.2 URL parameters (`_params()`)
Parsed from **both** `location.search` and `location.hash` (key=value, `&`-joined). Recognized:
- **`o`** — origin/intent: `edit`, `dup`, `builder`, or absent.
- **`id`** — the program id to edit or duplicate.

### 2.3 Boot logic (`_boot()`) — precedence order
1. Read `o` param and whether an **inbox** exists.
2. Read any existing saved **draft** from localStorage.
3. **If `o=edit` or `o=dup` with an `id`, and NO inbox:**
   - Determine mode (`edit`/`dup`).
   - If the current draft is already this same session (`_mode===mode && _srcId===id`), keep it (don't re-hydrate over in-progress edits).
   - Otherwise find the source program (`_findSource`) and **hydrate** a fresh draft from it. Set `_mode`, `_srcId`, and `_editId` (edit only).
4. **Else if no inbox and `o` is not `builder`:** a fresh "build your own" entry — if the stored draft is a stale edit/dup session (`_mode` set and not `new`), discard it so we start clean.
5. If still no draft, create a `_newDraft()`.
6. **Normalize days:** assign missing `letter`s; blank out any legacy auto-name matching `/^Day [A-E]$/`.
7. If `vary`, run `_ensureWeeks()`.
8. **Absorb the inbox** if present (see §7.3), then remove it.
9. Persist (`_save()`).

### 2.4 `_findSource(id)`
- First checks `forge_created_programs_v1` for a matching `id` → `{kind:'created', program}`.
- Else asks `window.ForgePrograms.byId(id)` → `{kind:'forge', program}`.
- Else `null`.

### 2.5 Hydration (`_hydrateFrom(p, forDup)`)
Two paths:
- **Draft-shaped source** (`_isDraftShape`: has numeric `daysPerWeek` and an array `days` or `weekPlans`) — a program previously saved by *this* builder. Deep-clone it directly. Clear `_mode/_editId/_srcId`. If duplicating, append `" (Copy)"` to the name and re-id every exercise (`_reidDraft`).
- **Catalog/planned source** (no exercise tree) — synthesize an editable week:
  - `name` = source name (+ " (Copy)" if dup).
  - `weeks` = clamp(`durationWeeks`, 4, 52), default 8.
  - `daysPerWeek` = clamp(`workoutsPerWeek` or schedule length, 2, 6), default 3.
  - `vary` = false.
  - Build each day from the program's `schedule[i]` name, filling `main` with **family staples** from `_familyEx(family)` (Strength / Muscle Building / Running / Conditioning / Full Body & Home / Mobility → curated `[name, sets, reps]` lists; default Strength).

### 2.6 `_newDraft()`
`{ name:'', weeks:8, daysPerWeek:4, vary:false, openWeek:null, openDay:null, days: 4 empty days, weekPlans:null, _mode:'new', _editId:null, _srcId:null }`.

### 2.7 `_makeDays(n, existing)`
Returns `n` day objects, reusing `existing[i]` where present, else a fresh empty day with letter from `['A'..'F']`.

---

## 3. Views (single screen, 3 internal views + sheets)

Derived each render:
- **`dayView`** = `openDay != null` → the Day Builder.
- **`weekDaysView`** = not dayView AND `vary` AND `openWeek != null` → a week's day list.
- **`setupView`** = neither of the above → the main setup screen.

`_days(d)` returns the **active day array**: the open week's days (customize + week open), else the repeat template `d.days`.

---

## 4. SETUP VIEW

### 4.1 App bar
- Title: **New Program** / **Edit Program** / **Duplicate Program** (by `_mode`).
- Close (×) → `onCancel`.

### 4.2 Edit/dup context banner
Shown when `_mode` is edit or dup. Pencil icon + context text:
- edit → "Editing your planned program"
- dup → "New copy — the original stays unchanged"

### 4.3 Program details card
- **Program name** — InputField, placeholder "e.g. Winter Powerbuilding", **max 40 chars**, char count shown, `onChange` → `onName`.
- **Length stepper** — `− {weeks} weeks +`. Buttons call `setWeeks(weeks∓1)`. Helper: "4–52 weeks — supports multi-month blocks".
- **Training days/week** — 5 segmented chips **[2][3][4][5][6]**; active chip is bronze; tap → `setDays(n)`.

### 4.4 Import affordance
- "Import from a spreadsheet" text button → `onOpenImport` (opens Import sheet, §7).

### 4.5 Program structure (radio pair)
- **Repeat the same week** — "Build one week and repeat it for the whole program." → `setRepeat`.
- **Customize each week** — "Build every week individually — copy a week forward and tweak." → `setVary`.
- Selected option gets bronze border/tint/filled dot; the other is neutral.

### 4.6 Program progress (customize mode only, `showProgress = vary`)
- Tappable → opens Jump sheet (`onOpenJump`).
- Label "{n} of {weeks} weeks built" and a ProgressBar (value = weeks with ≥1 main exercise, max = weeks).

### 4.7 List section
Header switches: **"Weeks"** (customize) or **"Workouts"** (repeat). Right side shows `setupSummary`:
- Repeat: `"{daysPerWeek} days · {N} exercises"` (total across the template).
- Customize: `"{weeks} weeks · {N} exercises"` (total across all weeks).

**Repeat mode → day rows** (`dayRows`), one per template day:
- Letter chip, day name (or `Day {letter}`), subtitle.
- Subtitle: `"No exercises yet · Tap to build"` if empty, else `"{inferredLabel} · {n} exercises"`.
- `inferLabel` derives a muscle-group label from the main exercises' muscles (mapped via MGROUP → Chest/Back/Shoulders/Arms/Legs/Core): 1 group→that group, 2→"A & B", 3+→"Full Body".
- Bronze checkmark badge if the day has ≥1 main exercise (`built`). Border turns bronze when built.
- Row body tap → `openDay(i)`. Kebab (⋮) → `openDayMenu(i)`.

**Customize mode → week rows** (`weekRows`), one per week:
- Number chip "1"…, label "Week N", subtitle "Empty" or "{n} exercises".
- Built (≥1 main anywhere in week) → bronze check; not built → hollow ring. Border bronze if built.
- Row body tap → `openWeek(i)`. Kebab → `openWeekMenu(i)`.

### 4.8 Footer — validity checklist + Save
- When invalid (`saveDisabled`), a two-item checklist above the button:
  - "Program name" — check/✕ by `nameOk`.
  - "At least one main exercise" — check/✕ by `mainOk`.
- **Save button** label: "Save Program" / "Save Changes" / "Create Copy" (by mode). Disabled until valid — disabled styling (muted fill, no shadow, default cursor). → `onSave`.

### 4.9 Validity (`_isValid`)
Valid iff `name.trim()` non-empty **AND** at least one **main** exercise exists (in any week if customize, else in the template).

---

## 5. WEEK DAY-LIST VIEW (customize mode, a week open)

### 5.1 App bar
- Title "Week N". Back → `onCloseWeek` (clears openWeek/openDay). Action: hamburger-with-marker icon → `onOpenJump` (Jump sheet).

### 5.2 Progress bar (tappable → Jump sheet)
Same "{n} of {weeks} weeks built" + ProgressBar as §4.6.

### 5.3 Empty-week prompt (`showWeekPrompt`)
Shown when: this view, week open, the week is **not built**, **another** week **is** built, and the prompt hasn't been dismissed (`hidePrompt`). Dashed bronze card:
- "This week is empty. Copy a week you've already built, or start from scratch."
- **Copy another week** → `onCopyAnother` (opens week sheet in "entering" mode).
- **Start building** → `onStartBuilding` (sets `hidePrompt`, dismisses prompt).

### 5.4 Workouts header + day rows
Same day-row component as repeat mode, but operating on the open week's days.

### 5.5 Footer
- **Save & continue** → `onAdvanceWeek` (see §6.4).

---

## 6. Week & structure operations

### 6.1 Structure toggles
- `setRepeat` — `vary=false`, clears openWeek/openDay.
- `setVary` — `vary=true`, clears openDay, `_ensureWeeks`, opens week 0.

### 6.2 `_ensureWeeks(d)`
Grows/trims `weekPlans` to exactly `weeks` entries (**new weeks start EMPTY**), re-normalizes each week's days to `daysPerWeek`, and nulls `openWeek` if it's now out of range.

### 6.3 Open/close week
- `openWeek(i)` — set openWeek=i, openDay=null, reset `hidePrompt=false`.
- `closeWeek()` — clear openWeek & openDay.
- `openJump/closeJump/jumpTo(i)` — Jump sheet controls; `jumpTo` closes the sheet and opens that week.

### 6.4 `advanceWeek()` ("Save & continue")
Find the **next incomplete** week after the current one (a week is complete when any day has ≥1 main exercise, `_weekComplete`). If none after, wrap and search from week 0. If **all** weeks complete → close to the review (setup) list. Else open that week.

### 6.5 Week sheet (unified: seed OR overflow menu)
State `weekSheet = { i, entering }`.
- `openCopyFrom()` — open in **entering** mode for the current open week.
- `openWeekMenu(i)` — open in **menu** (overflow) mode for week i.
- `weekCopyFrom(src)` — replace week i's days with a deep clone (`_cloneDays`, fresh ids) of week `src`'s days; close sheet; set `hidePrompt`.
- `weekStartEmpty()` — close sheet, set `hidePrompt` (build from empty).
- `weekClear()` — reset week i to empty days; close sheet.
- **Sheet contents:** prompt text (entering vs menu variants), a "Copy from" chip row of **other built weeks** (`wsSources`), a "Start empty" button (entering mode), and a red "Clear week" button (menu mode).

### 6.6 Jump sheet
Lists every week with a status glyph + label:
- Current week → filled-ring + "Current" (bronze).
- Built (not current) → bronze check + "Built".
- Otherwise → hollow ring + "Not started".
- Current row has bronze tint background. Tap → `jumpTo(i)`.

---

## 7. Spreadsheet / file import

### 7.1 Sheet states
- `openImport` — opens sheet, resets error/preview/importWeeks.
- `closeImport` — closes and clears all import state.
- Two panes: **paste pane** (`pasteOn`, when no preview) and **preview pane** (`previewOn`, when `importPreview` exists).

### 7.2 Paste pane
- Optional multi-week hint ("Week N — paste the next week…") when weeks already accumulated.
- Instructions: paste rows from Excel/Sheets, header row required, columns any order, looks for **Week, Day, Exercise, Sets, Reps**; one week or whole program.
- **Textarea** (monospace) with a worked placeholder. Ref captured via `setImportEl`.
- Import error text (red) when parsing fails.
- **Preview import** button → `doImport` (parses textarea).
- Hidden **file input** (`.csv,.tsv,.txt`) + "Or upload a .csv file" button → `pickFile` → opens native file picker → `onFilePicked` reads via FileReader and parses.

### 7.3 Inbox absorption (from Exercise Picker) — in `_boot`
If `forge_builder_inbox_v1` present:
- If `inbox.vary`, force customize mode, ensure weeks, open `inbox.week`.
- Target array = the open week's days (customize) or `d.days`.
- Push one exercise per `inbox.items` (or a single synthesized one from `inbox.name/equip/muscles/type`) into `days[inbox.day][inbox.section]`, with **default sets/reps by section**: Main 3×10, Warm-up 2×12, Cool-down 1×30.
- Set `openDay = inbox.day`. Remove the inbox key.

### 7.4 Parser (`_buildFromImport`) — three layouts, tried in order
Delimiter auto-detected (tab if any tab in line 1, else comma). CSV split is **quote-aware** (`"a, b"` stays one field). Helpers: `parseSR` reads "3x8"/"3×8"; `clamp`; `firstRep` grabs first integer; regexes for day names (`dayRe`), week labels (`weekRe`), and section bucketing (`bucket`: warm-up/mobility/activation/primer/prep/explosive→warmup; cool-down/conditioning/cardio/zone 2/stretch/recovery/finisher→cooldown; else main).

**Header detection:** scans first 14 rows, scores by keyword count, requires a **short** (`≤20 char`) exercise-column cell so prose titles aren't mistaken for a header.

- **Layout A — days as COLUMNS** (only when no columnar exercise header found): finds a header row where weekday names dominate (≥2 and ≥nonEmpty−1). First non-day column is the label/section column; section headers switch the current section; each day column's first numeric cell → reps (sets default 3).
- **Layout B — ROWS (columnar table):** maps columns Week / Day / Section / Exercise / combined "Sets×Reps" / Sets / Reps from the header (or assumes `week=0,day=1,ex=2,sets=3,reps=4` when ≥40% of rows have ≥3 columns and no header). Forward-fills Week/Day; rows with no exercise are treated as week/day/section headers; parses sets (clamp 1–8) & reps (clamp 1–60), defaulting 3×10.
- **Layout C — single-column list (PDF/notes paste):** weekday lines start a day; a repeated weekday bumps to the next week; "Rest day" skipped; ALL-CAPS lines skipped (FOCUS/TARGET headers); "Category: Exercise" split (category → section bucket; metadata labels focus/target/goal/notes/day/week ignored); bare lines are exercise names; trailing "— note" dropped; default 3×10.

**Assembly:** group parsed rows by week then day. `daysPerWeek` = clamp(max distinct days in any week, 2, 6). `niceName` derives a display day name (blank for generic "Day A"/"1"). >1 week → customize (`vary`, weekPlans, capped 52 weeks); 1 week → repeat template. Returns a draft or `null` if nothing parsed.

### 7.5 Preview pane (`_importPreviewVals`)
- Summary card ("Here's what we read"): "{1 week imported | N custom weeks | Week K} · {d} days · {t} exercises".
- Note: tap −/+ to fix sets×reps now; rename/reorder/add after creating.
- Per-day cards grouped under week headers (customize), each listing sections and exercises with inline **sets** and **reps** steppers → `_editSR` (sets clamp 1–12, reps clamp 1–60, `forceUpdate`).
- **Add another week** → `addAnotherWeek` (stashes current preview's week arrays into `importWeeks`, clears preview to paste the next week).
- **Back** → `backToPaste`. **Create program** → `confirmImport`.

### 7.6 `confirmImport`
Concatenate accumulated `importWeeks` + current preview's weeks. If none, just close. Else compute `daysPerWeek` = clamp(max used days across weeks, 2, 6); build a fresh draft: >1 week → customize with weekPlans (cap 52); 1 week → repeat template. Replace draft, save, close sheet.

---

## 8. Resize confirmation (destructive guard)

### 8.1 `setWeeks(n)`
Clamp 4–52. No-op if unchanged. If **decreasing** and `_weeksLoseContent(n)` (any week beyond n is built), open the **resize sheet** with message "Weeks {n+1}–{cur} will be removed…". Else apply immediately.

### 8.2 `setDays(n)`
No-op if unchanged. If **decreasing** and `_daysLoseContent(n)` (any day beyond n has content, checked across all weeks in customize), open resize sheet "Day {letter} onward will be removed from every week…". Else apply.

### 8.3 `_applyResize(kind, n)`
- weeks: set `weeks=n`, `_ensureWeeks` if vary.
- days: set `daysPerWeek=n`, rebuild `days` (preserving existing), `_ensureWeeks` if vary.

### 8.4 Sheet
- Title "Remove content?", message, **Cancel** (→`cancelResize`, clears pending) / **Remove** (red, →`confirmResize`, applies pending then clears).

---

## 9. DAY BUILDER VIEW (`dayView`)

### 9.1 App bar
- Title = day name (or `Day {letter}`). Back → `onCloseDay`.

### 9.2 Header block
- Week context label ("Week N") when in customize with a week open.
- **Workout name** InputField (≤30 chars) → `onDayName`.
- Day summary line when the day has content: "{n} exercises • ~{est} min" where est = round((main×9 + warmup×4 + cooldown×4)/5)×5.

### 9.3 Three sections (Warm-up / Main / Cool-down)
Rendered from `SECS` with distinct styling:
- Warm-up: "Optional", grey label, top of card.
- Main: "Required", bronze label, top border separator.
- Cool-down: "Optional", grey label, top border separator.
Each section header shows label · requirement · right-aligned count.

**Empty section** shows an empty label ("No warm-up yet" / "No main exercises yet" / "No cool-down yet").

**Each exercise card:**
- Equipment icon (`eqIcon` maps equip → SVG: Barbell/Dumbbell/Cable/Machine/Bodyweight; default Barbell; Bodyweight adds a head circle), name, equip subtitle.
- **Move up** (disabled at top) → `moveEx(section, idx, -1)`.
- **Move down** (disabled at bottom) → `moveEx(section, idx, +1)`.
- **Remove** (red trash) → `removeEx(section, idx)`.
- Bottom row: **sets stepper** (`− {sets} sets +` → `bumpSets ±1`, clamp 1–8) and **reps stepper** (`− {reps} reps +` → `bumpReps ±1`, clamp 1–60).

**Add button** per section: "Add {warm-up|exercise|cool-down}" → `addExercise(section)`.

### 9.4 `addExercise(section)` — round-trip to Exercise Picker
Persists the draft first (lossless), then navigates to `Forge Exercise Picker.dc.html#o=builder&vary={0|1}&week={openWeek||0}&day={openDay}&section={section}`. The picker returns the selection via the inbox (§7.3).

### 9.5 Footer
- **Save Workout** → `onCloseDay` (closes day; draft already autosaved).
- If there's a next day (`hasNextDay`), a secondary link "Save & go to {next day name}" → `advanceDay` (opens next day, or closes to list if past the end).

---

## 10. Day-options menu (bottom sheet)

Opened from a day row kebab (`openDayMenu(i)`), available in both setup (repeat) and week day-list views. Operates on the active day array's day `i`.
- **Workout name** InputField (≤30) → `onDayMenuRename` → `renameDay(i, v)`.
- **Duplicate exercises to** — chip row of the **other** days (`dupTargets`); tapping → `duplicateTo(src, tgt)` clones src's warmup/main/cooldown into the target with fresh ids; closes sheet. Hidden if no other days.
- **Clear all exercises** (red) → `onClearDay` → `clearDay(i)` empties all three sections; closes sheet.

---

## 11. Exercise mutation functions (day builder scope, act on `_days(d)[openDay]`)
- `removeEx(section, idx)` — splice out.
- `moveEx(section, idx, dir)` — swap with neighbor; no-op past ends.
- `bumpSets(section, idx, ±1)` — clamp 1–8.
- `bumpReps(section, idx, ±1)` — clamp 1–60.
- `openDay(i)` / `closeDay()` / `advanceDay()` — day navigation.
- `onDayName(e)` — rename the open day.

---

## 12. Persistence & exit

### 12.1 Autosave
Every mutation goes through `_mutate(fn)` → `_save()`, which writes the draft to `forge_program_draft_v1` and updates state. `_val(e)` normalizes DS InputField event vs raw value.

### 12.2 `onCancel`
Remove the draft key; navigate to `Forge Programs Catalog.dc.html`. (No confirm dialog.)

### 12.3 `onSave`
Guarded by `_isValid()`. Then:
- Read `forge_created_programs_v1` (array).
- Strip `_mode/_editId/_srcId` from the draft (`clean`).
- **Edit mode with editId:** find the record by id; merge existing + clean, force `id=editId`, set `updatedAt`. Replace in place (or push if not found). `savedId = editId`.
- **New/dup:** `savedId = 'usr-'+Date.now()`; push `{ id, savedAt, state:'future', source:'custom', ...clean }`.
- Write the array back; remove the draft key.
- Navigate to `Forge Program.dc.html#{savedId}` (or the catalog if no id).

New/duplicated programs are saved in **`future` (planned)** state with `source:'custom'`.

---

## 13. Complete function index (logic class)

**Lifecycle/boot:** `componentDidMount`, `componentWillUnmount`, `_boot`, `_params`, `_findSource`, `_hydrateFrom`, `_newDraft`, `_makeDays`, `_days`, `_cloneDays`, `_reidDraft`, `_isDraftShape`, `_familyEx`, `_ensureWeeks`, `_weekBuilt`, `_save`, `_mutate`, `_val`.

**Details/size:** `onName`, `setWeeks`, `setDays`, `_applyResize`, `_weeksLoseContent`, `_daysLoseContent`, `confirmResize`, `cancelResize`.

**Structure/weeks:** `setRepeat`, `setVary`, `_weekComplete`, `_anyOtherBuilt`, `openWeek`, `openCopyFrom`, `startBuilding`, `closeWeek`, `advanceWeek`, `openWeekMenu`, `closeWeekSheet`, `weekCopyFrom`, `weekStartEmpty`, `weekClear`, `openJump`, `closeJump`, `jumpTo`.

**Days/exercises:** `openDay`, `closeDay`, `onDayName`, `advanceDay`, `openDayMenu`, `closeDayMenu`, `renameDay`, `clearDay`, `duplicateTo`, `addExercise`, `removeEx`, `moveEx`, `bumpSets`, `bumpReps`.

**Import:** `openImport`, `closeImport`, `_dayCount`, `_weeksFromBuilt`, `addAnotherWeek`, `confirmImport`, `backToPaste`, `_editSR`, `_importPreviewVals`, `setImportEl`, `doImport`, `setFileInput`, `pickFile`, `onFilePicked`, `_buildFromImport`.

**Exit/save:** `onCancel`, `onSave`, `_isValid`.

**Render:** `renderVals` (builds all view-model values, plus `eqIcon`, `inferLabel`, `checkNode`, `seg` helpers).

---

## 14. Validation & clamp reference (single source of truth)
- Program name: ≤40 chars; required for save.
- Day/workout name: ≤30 chars.
- Weeks: 4–52.
- Days/week: 2–6.
- Sets: 1–8 (builder), 1–12 (import preview).
- Reps: 1–60.
- Main section: ≥1 exercise required for a valid program.
- Import: weeks capped at 52; days/week clamped 2–6.
- Default new exercise: Main 3×10, Warm-up 2×12, Cool-down 1×30.
