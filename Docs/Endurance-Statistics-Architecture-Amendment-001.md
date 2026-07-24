# Forge Legacy — Endurance Statistics Architecture Amendment 001
## Lifetime Endurance Statistics
### Status: Approved | Locked | June 2026

**Amendment Authority:** Product decision, locked. Supersedes `Endurance-Statistics-Architecture-Evaluation.md`'s "future workstream" recommendation specifically on timing — that evaluation's findings on value, complexity, and risk are adopted in full and are not revisited here; only the decision of *when* to build has changed.

**PRD Integration:** This amendment extends the Athlete Statistics Record already named in `Honor-Evaluation-Service-Architecture-v1.0.md` §9.1. It does not modify Rank, Goals, Progress, or Activity History — each gains, at most, a new and entirely optional read-only data source.

---

## Section 1 — Decision Summary

Forge Legacy will track three lifetime statistics, **per activity type**, for each of the six endurance activities — `RUN`, `WALK`, `HIKE`, `BIKE`, `SWIM`, `ROW`:

- **`lifetimeDistance`** — total distance accumulated across every qualifying session of that activity type, for the life of the account.
- **`lifetimeSessionCount`** — total number of qualifying sessions of that activity type, for the life of the account.
- **`lifetimeDuration`** — total elapsed time accumulated across every qualifying session of that activity type, for the life of the account.

This adopts all three statistics named in the predecessor evaluation, not distance alone — the evaluation ranked distance highest in standalone value, but found session count and duration low-cost to maintain alongside it once the same Session Save trigger is already being read. That cost/value tradeoff, not a change in architecture, is what this amendment resolves in favor of building all three now.

**Calibration carried forward:** `RUN`, `WALK`, `BIKE`, and `SWIM` are live in the locked `ActivityType` enum. `HIKE` and `ROW` remain dependent on `ActivityType-Expansion-Evaluation-Hiking-Rowing.md`'s still-pending enum amendment, exactly as every predecessor document in this workstream has flagged. This amendment's model applies identically to all six the moment each is live — no part of this design is specific to four types versus six.

---

## Section 2 — Statistics Model

Kept to the smallest model that satisfies Section 1, in the same conceptual style `Honor-Evaluation-Service-Architecture-v1.0.md` already uses for the Athlete Statistics Record — named fields and semantics, no database schema or migration design.

**Endurance Statistics Entry** — one entry per `(athleteId, activityType)` pair, created the first time an athlete logs a qualifying session of that type (sparse — no entry exists for a type the athlete has never logged, the same minimalism principle `Honors-Spec-L10.md` already applies to categories: absent until earned, not pre-populated empty):

| Field | Type | Semantics |
|---|---|---|
| `athleteId` | reference | Owning athlete. |
| `activityType` | enum value | One of `RUN, WALK, HIKE, BIKE, SWIM, ROW`. |
| `lifetimeDistance` | numeric | Cumulative distance, stored in the canonical internal unit (Section 3.1). |
| `lifetimeSessionCount` | integer | Cumulative count of qualifying sessions. |
| `lifetimeDuration` | numeric | Cumulative elapsed time, stored in seconds. |

This is the same shape as the existing Athlete Statistics Record's `workoutCount`/`hoursForged` pair, multiplied by activity type instead of left type-blind — not a new kind of record, an extension of an existing one's data inventory (Section 10).

---

## Section 3 — Unit Normalization

### 3.1 Internal distance standard

`lifetimeDistance` is stored internally in **meters**, the same canonical base unit `Pace-Speed-Definition-Architecture-Note.md` §4.3 already recommends for pace/speed computation: "compute internally against a single canonical base unit (e.g., meters and seconds), then format for display using the same `distanceUnit`... This requires no new unit-conversion system." This amendment reuses that exact precedent rather than inventing a second convention. Canonical internal storage is also the only correct choice for a *lifetime* total specifically: a single athlete's running history may contain sessions logged in miles and sessions logged in kilometers, and a lifetime sum must be computed in one consistent unit regardless of which unit each contributing session happened to use.

### 3.2 Display unit behavior

Display always converts from the canonical internal meters value to whichever unit the athlete's existing distance-display convention already specifies (the same convention governing every other `distanceValue`/`distanceUnit` display today) — at render time, not at storage time. No pre-formatted display string is stored on the Endurance Statistics Entry itself; this is the same "derive on demand" preference `Pace-Speed-Definition-Architecture-Note.md` §4.4 already establishes for per-session pace/speed, applied here to display formatting rather than to the underlying computation.

### 3.3 Swim and Row handling

Swimming and Rowing's existing display convention — split pace per fixed sub-distance (`/100m`, `/500m`, per `Pace-Speed-Definition-Architecture-Note.md` §3) — governs how a *single session's* pace is displayed. It has no bearing on how lifetime distance is *stored*: `lifetimeDistance` for SWIM and ROW accumulates in the same canonical meters as every other activity type, with no special-cased denominator. Split-pace formatting and lifetime-distance storage are two independent concerns that happen to both involve distance; this amendment touches only the latter.

---

## Section 4 — Update Rules

Every rule below exists to preserve one governing principle, stated once and never restated: **one effort, one count** (`External-Activity-Import-Ownership-Deduplication-Note.md` §3).

| Event | Behavior |
|---|---|
| **Create** (new session saved, of a qualifying endurance type) | Increment `lifetimeDistance` by the session's distance (converted to canonical meters), increment `lifetimeSessionCount` by 1, increment `lifetimeDuration` by the session's duration. Same trigger as today's `workoutCount`/`hoursForged` update (Session Save). |
| **Edit** (an existing, already-counted session's distance or duration is changed) | Apply the **delta** — subtract the session's previously-counted value, add its new value. Never re-add the new value on top of the old; that would double-count the session's prior contribution. `lifetimeSessionCount` does not change on edit — it is still the same one session, not a new one. |
| **Delete** (an already-counted session is removed) | Subtract exactly what that session most recently contributed (reflecting any prior edits, not its original value if it was edited since creation), and decrement `lifetimeSessionCount` by 1. The symmetric inverse of Create. |
| **Import** (a new session arrives via External Activity Import, not yet a recognized duplicate) | Treated identically to Create, the moment the import is confirmed and owned (`External-Activity-Import-Ownership-Deduplication-Note.md` §1) — no different trigger, no different math. |
| **De-duplication** (a session is recognized as describing a real-world effort already counted from another record) | Contributes **zero net change**. Whichever record is determined to be the one true record for that effort (per that note's §5 precedence principles) is the only one whose values are ever reflected in the counters — the other record's values are never separately added. |

---

## Section 5 — System Integration

No system below is redesigned. Each gains, at most, a new optional data source it may choose to read.

- **Progress:** gains a defined, named answer to the gap Section 6 resolves below. Progress's own §7.2 classification logic, profile algorithm, and every other locked decision are untouched.
- **Honors:** gains a precomputed-state data source shaped exactly like the PR records and counters evaluators already read (`Honor-Evaluation-Service-Architecture-v1.0.md` §9, ES-11's invariant) — a future Honors pass could read `lifetimeDistance` the same way Strength evaluators already read PR values. No honor is authored by this amendment.
- **Rank:** unaffected. Training Volume and Consistency remain deliberately type-blind (D-RCM-4); `bestPace` remains its own separate, already-locked signal. This amendment feeds Rank nothing and changes nothing about it.
- **Goals:** unaffected. The auto-update model (`Critical-Decisions-Amendment-001.md` Decision 1) already accumulates against a goal's own target independently of any account-wide statistic; it requires no read or write access to this amendment's new fields to keep working exactly as it does today.
- **Activity History:** unaffected. W-18 remains a per-session log; this amendment introduces no new History surface.

---

## Section 6 — Progress Gap Resolution

`P-2-Progress-Hub-Architecture.md` §7.3 names "cumulative distance by rolling period" as Endurance Profile display content without ever defining it — the gap `Endurance-Statistics-Architecture-Evaluation.md` §1.2 found and flagged. This amendment resolves it by naming two distinct concepts that were previously conflated under one undefined phrase:

- **Rolling distance** — a bounded, recent-window computation (e.g., trailing 30 or 90 days), derived on demand from recent session history at read time. This is what P-2's existing phrase actually refers to. It is **not** introduced or changed by this amendment — it remains exactly what it already was, now simply named precisely.
- **Lifetime distance** — the new, persistent, full-account-history total this amendment defines (`lifetimeDistance`, Section 2). Unbounded by any window; accumulated since the athlete's first qualifying session of that type.

**Relationship:** these are two different views over related but distinct data — rolling distance is a derived, time-windowed read; lifetime distance is a stored, ever-growing total. P-2 is not required to change anything to remain correct: its existing "rolling" concept now has a precise name and a clear boundary against the new "lifetime" concept, and may optionally surface `lifetimeDistance` alongside it in a future revision — but no such revision is mandated or performed here (Section 10).

---

## Section 7 — Import Compatibility

- **Imported activities** contribute to lifetime statistics identically to manually-logged ones, the moment they are owned (`External-Activity-Import-Ownership-Deduplication-Note.md` §1) and confirmed not to be a duplicate of an already-counted effort (§3–§5 of that note).
- **Source attribution** is informational only and must never gate or alter counting — a manually-logged run and an imported run of equal distance affect `lifetimeDistance` identically. This is the concrete, first system to actually inherit the source-blindness guarantee that note's §6 already promised in the abstract.
- **De-duplication** is enforced at the level Section 4 already states: a recognized duplicate contributes nothing beyond what the one true record for that effort already contributed. This amendment does not design the detection mechanism — that remains explicitly deferred by the Ownership & De-Duplication Note — it only specifies that whatever mechanism exists must feed these specific counters a single, agreed-upon value per real-world session.

---

## Section 8 — Integrity Rules

Four guarantees this amendment makes, stated once as locked invariants (the same role `Honor-Evaluation-Service-Architecture-v1.0.md` §9.5's invariant already plays for the existing counters):

1. **Edits recalculate.** A change to a counted session's distance or duration always applies as a delta against the lifetime totals — never as a fresh addition of the new value.
2. **Deletes subtract.** Removing a counted session always subtracts exactly its most recent contribution and decrements session count by one.
3. **Duplicates never double count.** A real-world effort represented by more than one record contributes to the lifetime totals exactly once, regardless of how many records describe it or which sources they came from.
4. **Source does not affect counting.** Whether a session was manually logged or imported from any external platform has zero bearing on how, or how much, it contributes to lifetime statistics.

---

## Section 9 — Non-Behaviors

This amendment explicitly does not, and will not without a separate, dedicated architecture review:

- Introduce GPS tracking. Distance remains a manually entered or imported value, never derived from a tracked route.
- Store or reference route/GPS track data, consistent with `External-Activity-Import-Architecture-Evaluation.md` §3's existing recommendation to avoid it.
- Introduce heart rate as a tracked or imported field, same rationale.
- Introduce an elevation field — none exists anywhere in the locked active-logging architecture today (`ActivityType-Expansion-Evaluation-Hiking-Rowing.md` §2.1), and this amendment does not create one.
- Author, define, or imply any new Honor. Section 6 of `Honors-Catalog-Expansion-Pass-3-Endurance.md` and Section 6 of the predecessor evaluation both name real future Honors opportunities this amendment unlocks — none is created here.
- Define, design, or touch any API, endpoint, or third-party integration. This is a statistics-storage concept only.
- Redesign Rank. Training Volume, Training Consistency, and the Personal Improvement `bestPace` signal are unchanged in every respect.
- Redesign Progress, Goals, or Activity History. Each is, at most, newly able to read data that did not previously exist — none has its own internal logic altered.

---

## Section 10 — Touchpoints

| Document | Impact |
|---|---|
| `Honor-Evaluation-Service-Architecture-v1.0.md` | Conceptual extension only — the Athlete Statistics Record's data inventory (§9.1) gains the Endurance Statistics Entries defined in Section 2. No existing invariant, trigger, or evaluator logic changes. |
| `P-2-Progress-Hub-Architecture.md` | No required edit. A small, optional clarifying footnote distinguishing "rolling" from "lifetime" (Section 6) is recommended but deferred, in the same spirit `Pace-Speed-Definition-Architecture-Note.md` §7.2 already deferred its own optional footnote-references. |
| `External-Activity-Import-Ownership-Deduplication-Note.md` | No edit required. This amendment is a direct, faithful application of that note's existing principles to a concrete set of counters — it neither contradicts nor extends that note's own content. |
| `Endurance-Statistics-Architecture-Evaluation.md` | Superseded on timing only (Section 1) — its findings on value, complexity, and risk stand as written and are not revised. |
| `Honors-Catalog-Expansion-Pass-3-Endurance.md` | Not edited. Its Section 6 "blocked, needs new counter" framing for Lifetime Mileage and Participation honors is now technically unblocked by this amendment's data — but no honor is authored here, and that document's own content remains accurate as written until a future Honors pass acts on the unlock. |

---

## Section 11 — Validation

- [ ] An Endurance Statistics Entry exists, conceptually, for each `(athleteId, activityType)` pair the athlete has actually logged — sparse, not pre-created for unused types.
- [ ] Edit behavior is delta-based: old value subtracted, new value added, session count unchanged.
- [ ] Delete behavior is subtractive: most-recent contribution removed, session count decremented by one.
- [ ] Import behavior is source-blind: an owned, non-duplicate imported session counts exactly as a manual one would.
- [ ] De-duplication behavior: a recognized duplicate never contributes a second time, regardless of source.
- [ ] Progress compatibility: "rolling distance" and "lifetime distance" are now two distinctly named concepts; P-2's existing logic requires no change to remain correct under this distinction.
- [ ] Future Honors compatibility: `lifetimeDistance`, `lifetimeSessionCount`, and `lifetimeDuration` are precomputed state, readable by a future evaluator under the exact same invariant (ES-11) existing evaluators already operate under — no raw history aggregation required to use them.
- [ ] Rank, Goals, and Activity History remain entirely unmodified in behavior, per Section 5/9.

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial Endurance Statistics Architecture Amendment. Defined the Endurance Statistics Entry model (`lifetimeDistance`, `lifetimeSessionCount`, `lifetimeDuration`, per `(athleteId, activityType)`) as an extension of the existing Athlete Statistics Record. Adopted canonical meters as the internal distance standard, reusing `Pace-Speed-Definition-Architecture-Note.md`'s existing precedent rather than inventing a new one. Defined create/edit/delete/import/de-duplication update rules, all governed by the single "one effort, one count" principle already established by `External-Activity-Import-Ownership-Deduplication-Note.md`. Resolved the previously-flagged "cumulative distance by rolling period" gap in `P-2-Progress-Hub-Architecture.md` by distinguishing "rolling" (existing, derived, unbounded-window) from "lifetime" (this amendment's new, stored, full-history total) — no edit to P-2 required. Stated four integrity guarantees (edits recalculate, deletes subtract, duplicates never double count, source-blindness) as locked invariants. Confirmed explicit non-behaviors: no GPS, no routes, no heart rate, no elevation, no honors, no API work, no Rank/Goals/Progress/Activity-History redesign. Supersedes the predecessor evaluation on timing only — its value, complexity, and risk findings stand unrevised. |

---

*Forge Legacy Endurance Statistics Architecture Amendment 001 — Lifetime Endurance Statistics*
*Status: Approved | Locked | June 2026*
*This amendment is incorporated by reference wherever the Athlete Statistics Record is cited. All wireframe and implementation work should treat this feature as locked MVP scope, pending the HIKE/ROW `ActivityType` enum amendment for those two activity types specifically.*
