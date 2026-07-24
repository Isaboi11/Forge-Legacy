# ActivityType Expansion Evaluation — Hiking & Rowing

## v1.0 | June 2026

**Status:** ARCHITECTURE EVALUATION — no amendments drafted, no content authored, no redesign of Activity History, Activity Detail, Progress, Rank, Goals, or Honors performed. This evaluation determines the smallest architecture changes required to add HIKING and ROWING to the locked `ActivityType` enum, per `Endurance-Multi-Activity-Architecture-Evaluation.md`'s Workstream 2 recommendation.

**Type:** Architecture Evaluation

**Predecessors:** `Endurance-Multi-Activity-Architecture-Evaluation.md` v1.0 (Section 10.3, Workstream 2), `Pace-Speed-Definition-Architecture-Note.md` v1.0.

**Read in full for this pass:** `Activity-Type-Picker-Spec-W8.md`, `Active-Workout-Flow-Spec-W9-W16.md`, `Activity-History-Wireframe-Spec-W18.md`, `Activity-Detail-Wireframe-Spec-W19.md`, `P-2-Progress-Hub-Architecture.md`, `Rank-Computation-Model.md`, `Rank-Calibration-Decisions.md`, `O-2-Amendment-001-Athlete-Type-Declaration.md`, `Goal-Hub-Wireframe-Spec-G1.md`, `Amendments/Critical-Decisions-Amendment-001.md`, `Honor-Catalog-v1.0-LOCKED.md`, `Honor-Evaluation-Service-Architecture-v1.0.md`, `Pace-Speed-Definition-Architecture-Note.md`.

---

## Section 1 — ActivityType Expansion

### 1.1 Enum placement

`Activity-Type-Picker-Spec-W8.md` Decision 2 (locked): the `ActivityType` enum "is append-only post-launch. Values may be added in future releases. No existing value may be renamed or removed without a data migration." Adding HIKING and ROWING is exactly the operation this enum was built to support — no enum redesign, no migration of existing values.

### 1.2 Naming convention

Every existing enum value is the uppercased form of its athlete-facing display name exactly: "Run" → `RUN`, "Walk" → `WALK`, "Bike" → `BIKE`, "Swim" → `SWIM` (W-8 §6). None of the four endurance values use a gerund ("Running," "Walking") — they use the plain verb matching the W-8 tile label. Applying this same convention: the new values should be **`HIKE`** and **`ROW`**, with tile labels "Hike" and "Row" — not `HIKING`/`ROWING`. This is a direct pattern-match, not a new convention.

### 1.3 Family classification

Both belong in the existing **Endurance family**, already defined independently in two locked documents:

- `P-2-Progress-Hub-Architecture.md` §7.2 (PH-D8): "Endurance family: RUN, WALK, BIKE, SWIM."
- `Exercise-Library-Architecture-v1.0.md` §10.3: carry-forward does not apply to "RUN, WALK, BIKE, SWIM."

**Hiking belongs in the Endurance family** — it is sustained aerobic activity measured by distance and duration, mechanically and physiologically the same shape as Walking. **Rowing belongs in the Endurance family** — same reasoning, mechanically and physiologically the same shape as Swimming/Cycling. Neither is a Strength-family activity (no sets/reps/weight structure applies to either). This confirms, rather than revises, the predecessor evaluation's finding.

### 1.4 Rationale

Both additions are pure extensions of an enum and a family-grouping convention that already exist and were already designed for this exact kind of growth. No new taxonomy tier is required (per the original Endurance evaluation's Section 1.2 finding that the two-tier model — concrete `ActivityType` + functional family — already exists). The only genuinely new work is naming the two values and slotting them into the family lists that already name their siblings.

---

## Section 2 — Logging Architecture Impact

### 2.1 What the existing logging flows actually do

`Active-Workout-Flow-Spec-W9-W16.md` §4.3 confirms three of the four existing Endurance types share one architecture exactly:

> "W-11: Walking — Identical architecture to W-10. Label reads 'Walk.'" / "W-12: Cycling — Identical architecture to W-10. Label reads 'Cycle.'"

W-10/W-11/W-12 are the same screen architecture (elapsed timer + manual distance entry + notes) with only the title label changed. W-13 (Swimming) is the one structurally distinct Endurance screen: "Timer + Laps field (numeric counter, tap +/−) + Distance field (optional, manual entry) + Notes."

**Correction to an unverified claim carried in `Activity-Type-Picker-Spec-W8.md`'s own routing table:** W-8 §7 lists Bike's screen behavior as "Elapsed timer + manual distance + elevation." `Active-Workout-Flow-Spec-W9-W16.md` §4.3 — the authoritative active-logging architecture — describes W-12 as simply "Identical architecture to W-10," which has no elevation field. No elevation field exists anywhere in the locked active-logging architecture for any activity type. This appears to be a stale or erroneous line in W-8's routing table, not a real field; this evaluation treats W-9-16 as authoritative here (per Rule 1) and does not build any Hiking recommendation on an elevation field, because none currently exists to extend.

### 2.2 Which existing logging flow Hiking should use

**W-11's architecture (the W-10 pattern: timer + manual distance + notes), exactly as Walking, Running, and Cycling already share it.** Hiking has no mechanical difference from Walking at the level this architecture measures (elapsed time, manual distance). This is the same label-only extension already proven three times over (W-11 "Walk," W-12 "Cycle," both reusing W-10 verbatim) — Hiking would be a fourth label on the same pattern, not a new pattern.

### 2.3 Which existing logging flow Rowing should use

**Also the W-10 pattern (timer + manual distance + notes), not W-13's laps mechanic.** W-13's "Laps" field specifically represents pool-length counting, a mechanic that does not map naturally onto rowing (indoor ergometer rowing — the dominant logging context — is conventionally tracked by distance and duration, not discrete lengths; on-water rowing "pieces" are better served by free-text notes than a laps counter). This is a small refinement of the predecessor evaluation's framing, which hedged between "Swimming or Cycling" as Rowing's mechanical analog (§1.5) — direct comparison against W-13's actual field semantics resolves that hedge toward the simpler W-10 pattern. Rowing's *display* convention (split pace per 500m, per `Pace-Speed-Definition-Architecture-Note.md` §3) is unaffected by this — that is a presentation-layer decision over the same `distance`/`duration` fields, not a logging-mechanic decision.

### 2.4 Are new logging screens required?

**No.** Both Hiking and Rowing route to the existing W-10-pattern screen (in practice, most likely the same shared component currently instantiated as W-10/W-11/W-12, with a new label), exactly as Walking and Cycling already do. No new screen number, no new field, no new save-rule branch: the existing cardio save rule ("Run, Walk, Cycle, Swim, Yoga, Other: blocked if elapsed session time is under 60 seconds," §13.2) already covers any activity type that isn't Strength/HIIT and needs no activity-type-specific carve-out for the two new values.

### 2.5 W-8 routing and grid impact

`Activity-Type-Picker-Spec-W8.md` §5.2/§6 specifies a fixed 3×3 grid for the current 9 types. Adding HIKE and ROW grows the canonical list to 11, which no longer fits 3×3. This is the one genuine UI touchpoint this expansion requires — but it is explicitly anticipated, not a redesign: W-8's own Format Amendment 001 states the full-screen modal format was chosen specifically because it "scales cleanly to 15+ types and future additions," as distinct from the rejected partial-height sheet, which "strains at 12+ types." Growing to 11 tiles is within the format's designed headroom; it requires a grid-dimension adjustment (e.g., 4×3 or 3×4) at implementation time, not a new screen format or layout philosophy. Per Decision 2's append-only governance and Section 15's existing amendment pattern (used previously to add HIIT), this would be communicated as a routing-table and grid update to W-8, not a new architecture decision.

Exact tile placement/grid order for HIKE and ROW is a content/visual-design decision (where in the grid they sit relative to existing tiles) and is explicitly left open here, per Rule 7 (do not author content).

---

## Section 3 — Activity History Impact

### 3.1 W-18 Activity History

§5.3's "Key Stat by Activity Type" table and §5.4's filter-chip row are both enum-driven lists with one row per `ActivityType` value. Adding HIKE and ROW means adding two rows to each:

- **Filter chips:** `[All] [Strength] [Run] [Walk] [Hike] [Bike] [Swim] [Row] [HIIT] [Mobility] [Yoga] [Other]` — a mechanical addition to an existing list, not a new filtering mechanism.
- **Key Stat:** HIKE follows WALK's existing row exactly (`"[distance] [unit]"`). ROW follows BIKE's existing row exactly (`"[distance] [unit]"`), consistent with Section 2.3's finding that Rowing uses the distance-based mechanic, not the laps mechanic.
- **Icon:** two new icons are needed (hiking figure, rowing figure/oar) — a content/asset task, not an architecture task.

**No new UI structure.** W-18 already renders any `ActivityType` value through one shared row component with type-keyed stat substitution — this is precisely the "unified timeline, type-aware rendering" pattern the original Endurance evaluation found already built (§3.1–3.2 of that document). Two more rows in an existing lookup table satisfies the objective's "minimize UI impact" instruction directly.

### 3.2 W-19 Activity Detail

§7.2's "Expected Fields" table is the same kind of enum-keyed lookup. Per `Pace-Speed-Definition-Architecture-Note.md` §3:

| Activity Type | Expected Fields |
|---|---|
| HIKE | Distance, Duration, Avg Pace (same row shape as WALK, extended with Pace per the Pace & Speed note's recommendation that Walking adopt Running's pace format) |
| ROW | Distance, Duration, Avg Pace — per-500m split (same row shape as the Pace & Speed note's Swimming recommendation, applied to Rowing per its Endurance-family/split-pace classification) |

This is the same kind of table-row addition as Section 3.1 — no structural change to W-19, no new section, no new layout. The Pace & Speed note's computation (§4.1, `distance ÷ duration`) already covers both new types without modification, since it was explicitly designed in Section 6 of that note to extend to Hiking and Rowing without new computation.

### 3.3 Detail display behavior

Unchanged. W-19's generic "Activity Data" stat-row section already branches by type; HIKE and ROW are two more branches using the exact same row-rendering logic as WALK/BIKE/SWIM. No behavioral change is required beyond the table additions above.

---

## Section 4 — Progress Impact

### 4.1 Profile classification impact

`P-2-Progress-Hub-Architecture.md` §7.2 (PH-D8) classifies sessions into `STRENGTH_PROFILE` / `ENDURANCE_PROFILE` / `HYBRID_PROFILE` / `DEFAULT` based on session-type dominance within two named families. Adding HIKE and ROW to the Endurance family list (Section 1.3) is the only change PH-D8 requires — the classification *algorithm* itself (dominance-ratio based) is already activity-count-agnostic and needs no modification to accommodate two more members of a family it already has.

### 4.2 Pace/speed display impact

§7.3 already names "most recent pace" as `ENDURANCE_PROFILE` display content, generically across the family. Per the Pace & Speed note, this resolves to Pace format for HIKE (matching WALK/RUN) and split-pace-per-500m for ROW (matching SWIM). No new Progress computation is introduced — the Pace & Speed note's §4.4 "derive on demand" model already covers any Endurance-family member, present or future.

### 4.3 Distance tracking impact

None beyond what already exists. `distanceValue`/`distanceUnit` is already a generic, activity-type-agnostic field pair (`Program-Authoring-Standard-v1.0.md` §2.3) used identically across every Endurance type today. HIKE and ROW sessions populate the same field, the same way WALK and BIKE sessions already do.

**Verdict:** Progress requires exactly one change — adding two names to PH-D8's existing Endurance-family list — and no redesign of the profile classification algorithm, the pace/speed display logic, or the distance-tracking model. Rule 10 (do not redesign Progress) is honored: nothing about *how* Progress works changes, only *which activity types* it already recognizes as Endurance.

---

## Section 5 — Rank Impact

### 5.1 Meaningful Work treatment

`Rank-Computation-Model.md` TBD-7 (locked): "Meaningful Work = saved, completed session with any of the 9 canonical activity types, meeting a minimum elapsed duration." `Rank-Calibration-Decisions.md` Q1 locked the universal 10-minute floor specifically *because* it must not create "a de facto hierarchy" between activity types (Section 7.1 of the original Endurance evaluation). This logic is already worded as "any of the 9 canonical activity types" generically — when the canonical count becomes 11, HIKE and ROW sessions qualify as Meaningful Work on the same 10-minute floor as every other type, automatically, with no rule change. **Existing logic remains valid as written; only the type count it refers to changes, and that count is already phrased generically.**

### 5.2 Personal Improvement treatment

`O-2-Amendment-001-Athlete-Type-Declaration.md` §7.1 already defines the Endurance athlete type's Personal Improvement signal generically: "Pace or distance personal best across any endurance activity type (running, cycling, rowing, etc.)" — **rowing is already named explicitly in this locked sentence**, and hiking falls under the same "etc." by the same logic the sentence already uses for walking and cycling. `Rank-Computation-Model.md` §20.11 ("Extensibility Model") confirms this is architecturally trivial even in the most type-specific module: "Adding a new athlete type requires only defining what 'personal best' means for that type... Dispatches to a type-specific evaluator; adding a new type adds a new evaluator." Critically, HIKE and ROW are not new *athlete* types — they are new *activity* types within the already-existing Endurance athlete type's umbrella signal, which already reads pace/distance personal bests "across any endurance activity type." No new evaluator is required; the existing Endurance evaluator's input set simply gains two more qualifying activity types, the same way it already silently covers Walking and Cycling without a dedicated per-type formula.

### 5.3 Endurance signal inclusion

Confirmed included by the same generic language cited in 5.1 and 5.2. No part of RCM or O-2A1 enumerates a closed list of specific endurance activities that would need editing — both documents already speak in terms of "any endurance activity type" / "any of the 9 [becoming 11] canonical activity types."

### 5.4 Does existing logic remain valid?

**Yes, entirely.** This is the cleanest finding in this evaluation: Rank's type-agnostic categories (Training Consistency, Training Volume) and its one type-adaptive category's Endurance signal (Personal Improvement) were both already worded to generalize over an open-ended or already-broader-than-4 set of endurance activities, not a hardcoded list of four. Rule 8 (do not redesign Rank) requires no exception here — there is nothing to redesign, only two new entries in an enum that several already-generic sentences already refer to collectively.

---

## Section 6 — Goals Impact

### 6.1 Auto-update compatibility

`Goal-Hub-Wireframe-Spec-G1.md` Decision 6 (locked): goals carry no type system at all — "Goals are defined by name and target only." `Amendments/Critical-Decisions-Amendment-001.md` Decision 1 already uses a Running mileage goal as a worked auto-update example ("may auto-update by accumulating logged run distances"). The same mapping rule — accumulate logged distance against a numeric target — applies identically to a Hiking mileage goal or a Rowing distance goal once those sessions exist and carry `distanceValue`, with zero new goal architecture.

### 6.2 Distance goal compatibility

Already fully compatible. An athlete can already create "Hike 100 miles this year" or "Row 1,000,000 meters" today by name and target alone (Section 5.3 of the original Endurance evaluation already established this for the broader question; this section confirms it holds specifically for Hiking and Rowing once they are loggable activity types).

### 6.3 Are any architecture changes required?

**No.** Goals has zero independent dependency on the `ActivityType` enum's contents — it depends only on a session carrying a `distanceValue`, which HIKE and ROW sessions will, by virtue of using the W-10 pattern (Section 2.2–2.3). Rule 9 (do not redesign Goals) requires no exception — nothing in Goals changes.

---

## Section 7 — Future Honors Compatibility

### 7.1 Can Hiking and Rowing support future Endurance honors?

Yes, on the same terms any other Endurance activity type would. `Honor-Evaluation-Service-Architecture-v1.0.md` §7.2 (locked): "Adding new honor types to the catalog (catalog expansion in V1.1+) does NOT require incrementing `schemaVersion`." The evaluator-family model (`HonorInstance-Architecture-v1.0.md`) is already generic enough to add a new Endurance family (the largest unbuilt-but-unblocked catalog dimension identified by the original Endurance evaluation, §8.4) keyed to the same `distance`/`duration`/pace values this note and the Pace & Speed note already define. Hiking and Rowing sessions would feed that future family exactly the way Running/Walking/Cycling/Swimming sessions would — no activity-type-specific honor logic is implied by adding these two types now.

### 7.2 Do any blockers exist?

**None found.** `Honor-Catalog-v1.0-LOCKED.md` currently has zero endurance honors of any kind (0 of 53, per the original evaluation's §8.1) — this is a pre-existing content gap that applies equally to Run/Walk/Bike/Swim today and will apply equally to Hike/Row once added. Adding two more Endurance activity types does not deepen this gap or create a new one; it simply means a future Endurance honor family will cover two more activity types on day one, at no extra architectural cost. **No honors are authored here, per Rule 6.**

---

## Section 8 — Final Recommendation

### 8.1 Required changes

The smallest set of changes that safely adds HIKING and ROWING, in the same shape as the precedent W-8 already established for adding HIIT (its own §15 "Required Amendments"):

1. **`ActivityType` enum:** append `HIKE` and `ROW` (Section 1.2). Append-only — no migration of existing values.
2. **W-8 Activity Type Picker:** add two tiles ("Hike," "Row") to the type grid; adjust grid dimensions from 3×3 to accommodate 11 types (already anticipated by W-8's own Format Amendment 001, Section 2.5) — this is a layout adjustment, not a new screen format.
3. **W-9–W-16 Active Workout Flow:** add two lines to §4.3 stating "Hiking — Identical architecture to W-10/W-11. Label reads 'Hike.'" and "Rowing — Identical architecture to W-10. Label reads 'Row.'" — the same one-line pattern already used for Walking and Cycling (Section 2.1–2.3). No new screen, no new field.
4. **W-4 Program Creation:** add `Hike` and `Row` chips to the per-slot Type selector, mirroring the exact amendment already made for HIIT (W-8 §15, Amendment 3).
5. **P-2 Progress Hub Architecture §7.2 (PH-D8):** add `HIKE` and `ROW` to the existing "Endurance family" list (Section 4.1). No change to the classification algorithm.
6. **W-18/W-19:** add table rows for HIKE and ROW to the existing enum-keyed Key Stat / Expected Fields tables (Section 3.1–3.2). No structural change.

### 8.2 What requires no change

Rank-Computation-Model, Rank-Calibration-Decisions, O-2-Amendment-001, and Goal architecture all already generalize over these two new types via language that was already broader than the current 9-type list (Sections 5, 6). None require an edit for correctness — they remain valid as written.

### 8.3 Required document touchpoints

`Activity-Type-Picker-Spec-W8.md` (enum, grid, routing table) → `Active-Workout-Flow-Spec-W9-W16.md` (§4.3 lines) → `Program-Creation-Wireframe-Spec-W4.md` (chip row) → `P-2-Progress-Hub-Architecture.md` (§7.2 family list) → `Activity-History-Wireframe-Spec-W18.md` (§5.3/§5.4 tables) → `Activity-Detail-Wireframe-Spec-W19.md` (§7.2 table). This is the same six-document amendment shape W-8 itself used when HIIT was added (§15) — no new amendment pattern is being invented here.

### 8.4 Risks

- **W-8 grid layout is the one item with real (if small) UI surface area.** It is explicitly within the format's designed headroom (Section 2.5), so the risk is layout/visual-design effort, not architectural risk.
- **A stale or erroneous "elevation" reference in W-8's own routing table** (Section 2.1) should be corrected or removed when W-8 is next amended, independent of this expansion — it does not block adding HIKE/ROW, but it should not be carried forward uncorrected.
- **Icon assets** for Hike and Row tiles are a content/design task, not an architecture risk, but are a real blocking dependency for shipping the W-8 grid change.

### 8.5 Open questions

- Exact grid placement/order for the two new tiles within W-8's expanded grid (content/visual-design decision, not resolved here per Rule 7).
- Whether Hiking should eventually carry an elevation-gain field distinct from Walking — explicitly not recommended here, since no elevation field currently exists anywhere in the locked active-logging architecture to extend (Section 2.1), and inventing one would exceed this evaluation's scope (Rule 5).

### 8.6 Readiness assessment

**Ready.** Every consuming system evaluated (Goals, Rank, the Pace & Speed computation) already generalizes to Hiking and Rowing without modification, because each was already worded generically rather than enumerated against the current 4-member Endurance list. The only real work is mechanical: two enum values, two W-8 tiles plus a grid-dimension adjustment, two one-line additions to the W-9–16 spec, two chips in W-4, and a few rows added to already-existing lookup tables in P-2/W-18/W-19. No system requires redesign; no amendment changes a locked decision's substance, only its enumerated membership.

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial ActivityType Expansion Evaluation for HIKING and ROWING. Confirmed both belong in the existing Endurance family; recommended canonical naming `HIKE`/`ROW` (matching the existing RUN/WALK/BIKE/SWIM verb-form convention). Found both route to the existing W-10 timer+distance pattern (not W-13's laps mechanic, which does not map naturally to rowing) — refining the predecessor evaluation's Swimming/Cycling hedge for Rowing specifically. Found Rank, Goals, and O-2 Amendment 001 already generalize over these two types via pre-existing generic language and require no edits. Identified one real UI touchpoint (W-8's 3×3 grid, already anticipated by its own Format Amendment 001 to scale past 9 types) and one stale cross-reference (an unverified "elevation" field named in W-8's routing table but absent from the authoritative W-9–W-16 spec). No amendments, content, or system redesigns authored — evaluation only, per Rules 5–11. |

---

*ActivityType Expansion Evaluation — Hiking & Rowing — v1.0*
*Forge Legacy | June 2026*
