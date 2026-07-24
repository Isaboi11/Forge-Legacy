# Pace & Speed Definition Architecture Note

## v1.0 | June 2026

**Status:** ARCHITECTURE NOTE — no schemas authored, no amendments drafted, no honors authored, no Programs authored, no redesign of Progress, Activity History, Activity Detail, or Rank. This note resolves exactly one dependency named by `Endurance-Multi-Activity-Architecture-Evaluation.md` §2.5/§6.4: a formal definition of Pace and Speed, referenced by name in three locked-or-lock-candidate documents but never defined in any of them.

**Type:** Small Architecture Note

**Predecessor:** `Endurance-Multi-Activity-Architecture-Evaluation.md` v1.0 — Workstream 1 of its Section 10.3 recommendation.

**Read in full for this pass:** `P-2-Progress-Hub-Architecture.md`, `Activity-History-Wireframe-Spec-W18.md`, `Activity-Detail-Wireframe-Spec-W19.md`, `Rank-Computation-Model.md`, `Rank-Calibration-Decisions.md`, `Rank-System-Architecture.md`, `O-2-Amendment-001-Athlete-Type-Declaration.md`, `Program-Authoring-Standard-v1.0.md`, `WSR-001-Workout-Share-Result-Architecture.md`, `Program-Creation-Wireframe-Spec-W4.md`, plus a repository-wide search for every reference to Pace/Average Pace/Speed/Average Speed.

---

## Section 1 — Current State Audit

### 1.1 Where the terms actually appear

A full-repository search for "pace" and "speed" found four documents with architecturally meaningful usage (others — `Squad-Detail-Wireframe-Spec-S2.md`, `Squads-Hub-Wireframe-Spec-S1.md`, `Program-Creation-Wireframe-Spec-W4.md` — use the words colloquially, e.g. "at their own pace," "not strength, speed, or output," and are not part of this audit):

| Document | What it says | Defines a formula? | Defines a unit? |
|---|---|---|---|
| `Activity-Detail-Wireframe-Spec-W19.md` §5.2/§7.2 | Stat row shows `Avg Pace` for RUN (example: "10:00 /mi"), `Avg Speed` for BIKE. No mention for WALK or SWIM. | No | No |
| `P-2-Progress-Hub-Architecture.md` §7.3 | `ENDURANCE_PROFILE` lists "most recent pace" as display content (RUN/WALK/BIKE/SWIM family, undifferentiated). | No | No |
| `Rank-Computation-Model.md` §9 ("Running") + §23 (`ImprovementSignalState` schema) | Defines pace conceptually — "fastest pace (time per unit distance)" — and stores it: `bestPace: { value: Float // min/km, achievedDate }`, explicitly "lower is better." This is the only place in the architecture with a concrete formula and unit. | Yes (conceptually: time ÷ distance) | Yes — **min/km**, hardcoded |
| `O-2-Amendment-001-Athlete-Type-Declaration.md` §7.1 | "Endurance: Pace or distance personal best across any endurance activity type (running, cycling, rowing, etc.)." Uses "pace" as the umbrella term for **all** endurance types, including cycling. Never uses "speed." | No (defers to RCM) | No |

### 1.2 A correction to the predecessor evaluation

`Endurance-Multi-Activity-Architecture-Evaluation.md` §2.5/§6.4 stated that `Activity-History-Wireframe-Spec-W18.md` already names "Avg Pace"/"Avg Speed" as expected fields. **Direct re-read of W-18 found this to be inaccurate.** W-18's §5.3 "Key Stat by Activity Type" table shows only `[distance] [unit]` for RUN/WALK/BIKE and distance-or-laps for SWIM — no pace or speed field anywhere in W-18. The "Avg Pace"/"Avg Speed" fields exist only in **W-19** (Activity Detail), not W-18 (Activity History). This note treats W-18 as out of scope for any field addition — it has no placeholder to fill — and flags the predecessor document's line for a future one-line correction (not performed here, per Rule 4: minimize scope).

### 1.3 Inconsistencies found

1. **Pace vs. Speed as the umbrella term.** O-2 Amendment 001 uses "pace" to describe the Personal Improvement signal for *every* endurance type, including cycling ("pace or distance personal best across any endurance activity type"). W-19 uses "speed," not "pace," for BIKE specifically. These are not necessarily in conflict (see §2.3), but the two documents use different words for what may be the same underlying concept, and neither says so explicitly.
2. **WALK has no pace/speed field at all.** W-19's expected-fields table lists `WALK | Distance, Duration` — no pace field — even though Walking is mechanically identical to Running (continuous-timer, manual distance) and P-2's `ENDURANCE_PROFILE` treats RUN/WALK/BIKE/SWIM as one undifferentiated family for "most recent pace."
3. **SWIM has no pace/speed field in W-19 either**, despite being part of the same Endurance family in P-2.
4. **No unit-conversion rule exists anywhere.** RCM's `bestPace` is hardcoded to min/km for internal Rank comparison. Nothing connects this to the unit the athlete actually logged distance in (`distanceUnit: m | km | mi`, per `Program-Authoring-Standard-v1.0.md` §2.3) or to what should be displayed in W-19/P-2.
5. **A separate, non-conflicting usage exists in Program Authoring.** `Program-Authoring-Standard-v1.0.md` §11.4 uses "pace" as prescriptive coaching language ("easy conversational pace," "tempo pace") and explicitly instructs authors *not* to encode it as a schema value: "Avoid: Prescribing pace in minutes-per-mile in the schema — use descriptive guidance in `notes`." This is a different register entirely (forward-looking training guidance text, not a logged-performance metric) and is unaffected by this note.

**Finding:** three documents assume a pace/speed concept exists; one document (RCM) actually defines it, but only for Running, only for Rank's historical-best comparison, and only internally (min/km, not display-formatted). No document defines a *per-session* pace or speed value, which is what P-2 ("most recent pace") and W-19 ("Avg Pace"/"Avg Speed" for a specific logged session) both actually need.

---

## Section 2 — Concept Definitions

### 2.1 Pace

**Pace = time per unit distance** (e.g., minutes per mile, minutes per kilometer). Lower is faster. This matches RCM's existing conceptual definition exactly ("time per unit distance," §9) and its existing stored convention ("lower is better," §23).

### 2.2 Speed

**Speed = distance per unit time** (e.g., miles per hour, kilometers per hour). Higher is faster. No document currently defines this term, but it is the mathematical reciprocal of pace (`speed = distance ÷ duration`; `pace = duration ÷ distance`) — the same underlying relationship, expressed in the convention each sport actually uses.

### 2.3 Are both required, or is this one concept with two labels?

**One concept, two display conventions.** Pace and speed are reciprocals of the same computation (`distance` and `duration`, both of which already exist on every endurance session today — distance via the existing `distanceValue` field, duration via the always-present session timer per `Active-Workout-Flow-Spec-W9-W16.md`). Nothing requires two separately maintained metrics. This resolves the Section 1.3 inconsistency directly: O-2 Amendment 001's use of "pace" as the umbrella Rank-evaluation term is correct and needs no change — it describes the underlying time/distance relationship in the abstract, the same relationship speed expresses inverted. It is not a mandate that every activity *display* its value in pace format. The choice of which label and format to *show the athlete* is a per-activity-type display decision (Section 3), layered on top of one shared computation, not two parallel architectures.

### 2.4 Rationale

Treating this as one derived computation with a per-activity display projection is the simplest model that satisfies all four consuming documents (P-2, W-19, RCM, O-2A1) without requiring any of them to change their existing language. RCM keeps "pace," computed in min/km, used internally for comparison. W-19 keeps "Avg Pace" and "Avg Speed" as separate labels, now backed by the same underlying value, just formatted two different ways for two different activity types.

---

## Section 3 — Activity Mapping

| Activity | Primary metric | Secondary metric | Recommended display format | Rationale |
|---|---|---|---|---|
| **Running** | Pace | Distance | `M:SS /mi` or `/km` (e.g., "8:30 /mi") | Matches W-19's existing example format exactly; matches universal running convention; matches RCM's existing "time per unit distance" definition. |
| **Walking** | Pace | Distance | Same format as Running | Walking is the same continuous-timer, manual-distance mechanic as Running (Section 1.5 of the predecessor evaluation already treats them as structurally identical). The current absence of a pace field for WALK in W-19 (Section 1.3, Finding 2) is a content gap, not a reason to diverge — recommend Walking adopt the same pace convention as Running. |
| **Hiking** *(future)* | Pace | Distance | Same format as Walking | Mechanically identical to Walking — sustained ambulatory effort over distance. Terrain/elevation texture does not change the time/distance computation. Mirrors the predecessor evaluation's finding that Hiking is structurally a Walking variant. |
| **Cycling** | Speed | Distance | `XX.X mph` or `km/h` (e.g., "14.3 mph") | Matches W-19's existing "Avg Speed" label exactly; matches universal cycling convention (cyclists speak in mph/km/h, not minutes-per-mile). Resolves the Section 1.3 terminology tension: O-2A1's "pace" is Rank-internal umbrella language for the time/distance relationship, not a display mandate — Cycling's user-facing display correctly uses speed. |
| **Swimming** | Pace per fixed sub-distance | Distance or laps | `M:SS /100m` (or `/100yd`) | Swimming's real-world convention is split pace per 100m/100yd, not per-mile pace or speed-in-mph. This is the same underlying computation (time ÷ distance) at a different distance denominator — a display-format variant, not a new metric. Consistent with W-19 already showing "Distance or Laps" for SWIM, since laps map naturally to fixed-distance splits. |
| **Rowing** *(future)* | Pace per fixed sub-distance | Distance | `M:SS /500m` | Rowing's near-universal real-world convention (ergometer training, regattas) is split pace per 500m — mirrors Swimming's approach rather than Cycling's, despite both being plausible candidates. Same underlying computation, different denominator and label. |

**Answers to the example questions posed in the objective:**
- Running displays **pace**. Cycling displays **speed**. Both are correct as currently labeled in W-19 — no change needed to either.
- Swimming displays **pace**, but per-100m, not per-mile — a third format variant, not a third metric.
- Hiking should **match Walking** (pace format), not diverge into its own convention.
- Rowing should **match Swimming's split-pace approach**, not Cycling's speed approach — both reasonable a priori, but rowing's own real-world convention settles it.

---

## Section 4 — Calculation Model

### 4.1 How pace and speed are calculated

A single computation, two presentations:

```
speed = distance / duration
pace  = duration / distance     (the reciprocal of speed)
```

Both `distance` and `duration` already exist on every endurance session today — `distance` via the existing `distanceValue` field (manual entry per `Active-Workout-Flow-Spec-W9-W16.md` §4.3), `duration` via the session timer that is "always present" (RCM §9, regarding Running). No new input field is required for any activity type evaluated here.

### 4.2 Split-pace activities (Swimming, Rowing)

Identical computation, applied per fixed sub-distance (100m for Swim, 500m for Row) instead of per whole-mile/km: `splitPace = (duration / distance) × subDistance`. This is the same formula from §4.1, scaled — not a separate calculation model.

### 4.3 Unit handling and conversion

Distance is already logged with a paired value/unit (`distanceValue` / `distanceUnit: m | km | mi`, per `Program-Authoring-Standard-v1.0.md` §2.3). Recommend pace/speed reuse this exact existing convention rather than introduce a new one: compute internally against a single canonical base unit (e.g., meters and seconds), then format for display using the same `distanceUnit` the session was logged in (or the athlete's display-unit preference, wherever that preference already lives elsewhere in the app). This requires no new unit-conversion system — only a documented conversion step ahead of the existing display layer.

RCM's existing `bestPace` (min/km, hardcoded) does not need to change. It is an internal comparison value, not a display value — Rank only ever compares an athlete's pace history against itself, never renders it to the athlete in a specific unit. Hardcoding its internal unit is a pre-existing, valid decision (RCM §23) and is orthogonal to the display-facing unit handling this note recommends for P-2/W-19.

### 4.4 Stored, derived, cached, or recomputed?

Two distinct cases, both already implied by existing architecture rather than newly invented here:

| Value | Treatment | Why |
|---|---|---|
| **Per-session pace/speed** (what W-19 shows for one specific logged session; what P-2's "most recent pace" reads) | **Derived on demand.** No new stored field, no cache. | `distance` and `duration` are already stored per session. Computing their ratio at read time is trivial and requires zero schema change — the simplest possible architecture, per the objective's instruction. |
| **Best-ever pace** (Rank's Personal Improvement signal, RCM's `bestPace`) | **Stored**, exactly as RCM already does it. | This is not a new pattern — RCM's `ImprovementSignalState.bestPace` already persists a historical-best value because it must be compared against future sessions over time, not recomputed from full history on every read. This note extends the same existing pattern to other Endurance activity types (Section 6), it does not introduce a new one. |

**Recommendation: the simplest architecture is the correct one.** Per-session display values need no new storage at all — they are a one-line computation over fields that already exist. Only the historical-best comparison value (which RCM already stores, for Running) needs persistence, and that pattern is already built.

---

## Section 5 — UI Integration

### 5.1 P-2 Progress Hub

§7.3's "most recent pace" (or, per Section 3, speed for Bike-dominant `ENDURANCE_PROFILE` athletes) is computed from the athlete's most recent qualifying session using §4.1's formula. No new UI element — this slot already exists in the locked spec; this note supplies the value behind it. **No redesign required (Rule 7 honored).**

### 5.2 W-18 Activity History

No change. Per Section 1.2, W-18 never referenced pace or speed and has no placeholder to fill. This note has no touchpoint here. **No redesign required (Rule 8 honored).**

### 5.3 W-19 Activity Detail

§5.2/§7.2's existing "Avg Pace" (Run) and "Avg Speed" (Bike) fields are computed from that session's own `distanceValue` and duration using §4.1. Per Section 3, Walk and Hike should display the same Pace format Run already does; Swim and Row should display the split-pace format from §4.2. These are content/field additions to an existing per-type table (the same table already lists fields per type for STRENGTH/WALK/BIKE/SWIM/HIIT/MOBILITY) — not a structural or layout change. **No redesign required (Rule 9 honored).**

### 5.4 Formatting consistency

| Format | Pattern | Example |
|---|---|---|
| Pace (Run/Walk/Hike) | `M:SS /unit` | `8:30 /mi` |
| Speed (Bike) | `XX.X unit/h` | `14.3 mph` |
| Split pace (Swim/Row) | `M:SS /subdistance` | `1:45 /100m`, `2:00 /500m` |

All three reuse the identical underlying §4.1 computation — only the presentation differs, consistent with Section 2.3's "one concept, two (or three) display conventions" framing.

---

## Section 6 — Future Compatibility

- **Hiking:** inherits Walking's pace format directly (Section 3) and Section 4's derived-on-demand calculation model. Adding Hiking to the `ActivityType` enum (per the predecessor evaluation's Workstream 2) requires no change to this note's model — it is already accounted for.
- **Rowing:** inherits Swimming's split-pace format directly (Section 3) and the same calculation model. Same conclusion as Hiking.
- **Future endurance Honors** (the predecessor evaluation's Section 8 finding — a currently-empty catalog dimension): a future Endurance honor family (e.g., pace or distance personal-best milestones) can read directly from the same two values this note already defines — the derived per-session value (§4.4) for "did this session set a new mark" checks, and RCM's existing stored-best pattern (already proven for Running, generalizable per O-2A1's "Endurance" umbrella signal) for "is this athlete's all-time best." No new computation is required when that workstream begins.
- **Future endurance Programs:** unaffected. `Program-Authoring-Standard-v1.0.md`'s use of "pace" is prescriptive coaching text, explicitly kept out of the schema (§11.4, "avoid prescribing pace... in the schema"). This note's computation governs logged-performance display, a different concern entirely, and does not interact with program authoring guidance.

**The model scales to both future activity types and future consumers (Honors) without redesign**, because it is built on two values (`distanceValue`, session duration) that already exist for every endurance session logged today, plus one already-proven storage pattern (RCM's `bestPace`) that this note extends rather than replaces.

---

## Section 7 — Architecture Recommendation

### 7.1 Required note

This document. No amendment is required — nothing here changes, contradicts, or supersedes a locked decision. RCM's `bestPace` definition, W-19's "Avg Pace"/"Avg Speed" labels, P-2's "most recent pace" language, and O-2A1's "pace" umbrella term all remain exactly as locked. This note supplies the missing formula and unit-handling rule those four documents already assumed existed, without requiring any of them to be edited to remain correct.

### 7.2 Required document touchpoints

None required immediately. For future reference, optional cosmetic footnote-references (not edits to substance) could eventually point `P-2-Progress-Hub-Architecture.md` §7.3, `Activity-Detail-Wireframe-Spec-W19.md` §7.2, and `Rank-Computation-Model.md` §23 at this note as the formal source for the pace/speed computation they each assume. This is deferred, not performed here, per Rule 4 (minimize scope) and Rule 3 (preserve locked architecture as-is).

### 7.3 Risks

- **Terminology misreading risk:** without this note, a future reader could mistake O-2A1's umbrella use of "pace" as a mandate to display every endurance activity in pace format, including Cycling. Section 2.3/Section 3 close this risk by making the distinction explicit.
- **Documentation-accuracy risk (already identified, not newly introduced):** the predecessor evaluation's claim that W-18 already names Avg Pace/Avg Speed is inaccurate (Section 1.2). This note does not correct that line in the predecessor document, but flags it so the inaccuracy does not propagate further.

### 7.4 Open questions

- Display unit defaults (mi vs. km) for pace/speed are not newly introduced by this note — they follow whatever unit/locale convention already governs `distanceValue`/`distanceUnit` display elsewhere in the app. Not a new open question created here.
- Whether Walking and Swimming should *actually* gain a displayed pace/split-pace field in W-19 (Section 3's recommendation) is a small content decision for whoever next revises W-19 — not an architecture blocker, since the computation already supports it either way.

### 7.5 Readiness assessment

**Ready.** This note requires no schema change (per-session values are derived, not stored), no new UI structure (W-19's fields already exist; W-18 is untouched), and no change to any locked decision in RCM, O-2A1, or P-2. The only remaining work is the same kind of small, additive step the predecessor evaluation already identified throughout: applying an existing, now-fully-defined computation to a couple of currently-blank table cells.

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial Pace & Speed Definition Architecture Note. Resolved the gap identified by `Endurance-Multi-Activity-Architecture-Evaluation.md` §2.5/§6.4. Defined Pace (time/distance) and Speed (distance/time) as one reciprocal computation with per-activity-type display formatting (pace: Run/Walk/Hike; speed: Bike; split-pace: Swim/Row). Recommended derive-on-demand for per-session values and reuse of RCM's existing `bestPace` storage pattern for historical bests — no schema change required. Corrected a factual overstatement in the predecessor evaluation regarding W-18 (Activity History never referenced pace/speed; only W-19 did). No amendment required; no redesign of Progress, Activity History, Activity Detail, Rank, Honors, or Programs performed. |

---

*Pace & Speed Definition Architecture Note — v1.0*
*Forge Legacy | June 2026*
