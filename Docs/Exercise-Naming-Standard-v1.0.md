# Forge Legacy Exercise Naming Standard

## v1.0 | 2026-06-30

**Status:** LOCKED.

**Purpose:** Lock the naming principles that govern every `ExerciseDefinition.name` in the catalog, and record the precedent set by the 2026-06-30 reconciliation that resolved the five naming-duplicate pairs flagged in `Exercise-Library-Launch-Catalog-Blueprint-v1.0.md` §3.

**Authority:** `Exercise-Library-Architecture-v1.0.md` (schema), `Exercise-Library-Launch-Catalog-Blueprint-v1.0.md` (canonical catalog), `Anchor-Exercise-Authoring-Framework-v1.0.md` (content voice/field standards — this doc supplies the naming rule that framework cross-references, since naming applies to every tier of the catalog, not just Tier-1 anchors).

---

## 1. Naming principles (locked)

1. **Prefer specific names over generic names.** A name should identify the exact movement, not a category placeholder. ("Box Step-Up," not "Step-Up.")
2. **Include the implement when multiple common implement variants exist.** If a movement is commonly performed with more than one piece of equipment (barbell, dumbbell, machine, etc.), the canonical name states which one. ("Barbell Bench Press," not "Bench Press," because Dumbbell Bench Press also exists in the catalog.)
3. **Include the movement variation when multiple recognized variants exist.** If a base movement has more than one recognized variant in the catalog (front/back, incline/decline, single-leg/bilateral, etc.), the canonical name states which variant. ("Front Plank," not "Plank," because Side Plank also exists.)
4. **Each `ExerciseDefinition` has exactly one canonical name.** No catalog row may share its canonical name with another row. This is enforced at content-authoring time by checking new names against the full catalog before adding a row.
5. **Retired or generic names become aliases/search terms only — never canonical names.** When a duplicate is resolved, the losing name does not disappear from user-facing search; it should resolve to the canonical row. **This is currently aspirational, not implemented:** `ExerciseDefinition` has no `aliases`/`searchTerms` field today (`Exercise-Library-Architecture-v1.0.md` §2.1 schema reviewed, none found). Adding one is a deferred schema follow-up, not a blocker to this naming reconciliation.

## 2. Governance rule: canonical names are immutable after publication

Once a canonical name is recorded as canonical in `Exercise-Library-Launch-Catalog-Blueprint-v1.0.md` (i.e., published), it **may not be changed casually**. Changing a published canonical name requires a formal reconciliation/amendment pass of the same kind as this one: a deliberate, documented sweep that updates the Blueprint, every authored-content row, every relationship-array reference, and every downstream document that names the exercise.

Display names, search aliases, and localized strings are not subject to this rule — they may evolve independently of the canonical identifier without triggering an amendment, once the aliasing mechanism in principle 5 above exists.

All 195 V1 catalog rows are still pre-`isActive`/pre-publication as of this reconciliation. This pass is itself the formal one-time correction that establishes the five canonical names below — it is not a precedent for casual future renaming once exercises go live.

## 3. Identifier stability

`ExerciseDefinition` has an `id: uuid` field (`Exercise-Library-Architecture-v1.0.md` schema) distinct from `name`. No population-pass document in this repository assigns literal UUID values yet — content is authored narratively, keyed by name only, ahead of the data-entry pass that will assign real identifiers. When that pass runs: **the surviving row in each resolved pair keeps its own identity** (it does not adopt the identifier of the row whose name it replaced, nor generate a new one), and the retired row's identifier — once one exists — must not persist in any relationship array, media-asset naming convention, or downstream reference. This is a forward-looking instruction for the data-entry pass, not a gap in this reconciliation.

## 4. Resolved precedent: the five 2026-06-30 naming-duplicate pairs

| # | Canonical name (locked) | Retired name | Why |
|---|---|---|---|
| 1 | Box Step-Up | Step-Up | Principle 1 — generic name retired in favor of the equipment-specific one already used by the Strength Foundation I package. |
| 2 | Back Squat | Squat | Principle 2 — "Squat" was ambiguous between the barbell and bodyweight movements; "Back Squat" names the implement and rack setup. The bodyweight movement keeps its own row, "Bodyweight Squat." |
| 3 | Front Plank | Plank | Principle 3 — "Plank" was ambiguous against "Side Plank"; "Front Plank" names the variant. |
| 4 | Barbell Romanian Deadlift | Romanian Deadlift | Principle 2 — ambiguous against the catalog's Dumbbell and Single-Leg Romanian Deadlift rows; "Barbell" names the implement. |
| 5 | Barbell Bench Press | Bench Press | Principle 2 — ambiguous against Dumbbell Bench Press, Incline Dumbbell Press, and Decline Bench Press; "Barbell" names the implement. |

Full resolution mechanics (which row's authored content survived, which relationship-array references were retargeted, anchor-count impact) are recorded in `Exercise-Library-Launch-Catalog-Blueprint-v1.0.md` §3.

## 5. Validation performed

A repo-wide grep for each retired name (word-boundary, excluding legitimate distinct exercises that share a word, e.g. "Bodyweight Squat") confirmed zero remaining references outside: historical Change Log / addendum prose describing the reconciliation itself; `Honor-Catalog-v1.0-LOCKED.md`'s "Bench Press Family"/"Squat Family"/"Deadlift Family" honor-type labels (confirmed out of scope — these are enum/display labels tied to a lift category, not `ExerciseDefinition.name` references); and the one flagged open follow-up, the Strength Foundation II (4-Day) `.docx` package's "Step-Up" occurrences, which require a separate binary-file content correction outside this Markdown-only reconciliation pass.

---

*Forge Legacy Exercise Naming Standard — v1.0*
*Forge Legacy | 2026-06-30*
