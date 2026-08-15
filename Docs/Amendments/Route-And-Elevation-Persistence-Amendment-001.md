# Forge Legacy — Route and Elevation Persistence Amendment 001
## Storing the shape of a run
### Status: Approved | Locked | August 2026

**Amendment Authority:** This is the "separate, dedicated architecture review" that `Endurance-Statistics-Architecture-Amendment-001.md` §9 names as the precondition for storing route data. It does not revisit that amendment's lifetime-statistics model, which stands unchanged in every respect.

**Trigger:** A PO test run on 2026-08-14. Forge measured a 3.01-mile outdoor run and reported 0.0 mi (fixed separately, commit `ea0222e`), and the PO asked for a real, zoomable map in place of the drawn SVG sketch. Building that surfaced the fact that **there is nowhere to draw it from**: the route exists only in React state and is discarded the moment the athlete leaves the screen.

---

## Section 1 — Decision Summary

Forge Legacy will persist, per outdoor cardio bout:

- **`route`** — the geometry of where the athlete went, as an encoded polyline, **trimmed at both ends before it is written**.
- **`climb_m`** — total elevation gain for the bout, as a single integer of metres.

Both are already measured today. Neither is stored. This amendment does not create a new capability; it stops discarding one the app has been computing since the climb readout shipped.

**The privacy question is answered by trimming at WRITE time, not by hiding at read time.** See Section 4 — it is the load-bearing decision in this document and the one that makes the rest of it acceptable.

---

## Section 2 — Reconciliation: three non-behaviors, and where each now stands

`Endurance-Statistics-Architecture-Amendment-001.md` §9 lists three non-behaviors relevant here. Two of them describe a product that no longer exists, and saying so plainly is half the purpose of this document — this project has a recurring pattern of amendments locked and never applied, and the reverse (code shipped and never reconciled) is the same failure wearing the other face.

| §9 non-behavior | Status today | Disposition |
|---|---|---|
| "Introduce GPS tracking. Distance remains a manually entered or imported value, never derived from a tracked route." | **Already crossed.** `useRunTracker` + `run-core.ts` derive distance from a tracked route; background location shipped in iOS build 5. | **Superseded.** Distance for an outdoor bout is GPS-derived. The `source: 'tracked' \| 'manual'` field on `CardioResult` already records which, and is the honest record the original bullet was protecting. |
| "Introduce an elevation field — none exists anywhere in the locked active-logging architecture today." | **Half crossed.** `totalGainM`/`displayGain` compute and display climb live; nothing persists it, so the PO's trail-run question is answered by an app that measures the climb and throws it away. | **Superseded** for a stored scalar total. See D-RTE-4. |
| "Store or reference route/GPS track data." | **Not crossed.** The track dies with the screen. Privacy exposure today is genuinely zero. | **This amendment's subject.** Superseded only under the conditions in Sections 3–5. |

**Nothing above weakens the reasoning that produced those bullets.** `External-Activity-Import-Architecture-Evaluation.md` §3 avoided route data on *identity* grounds, not plumbing grounds, and that finding is adopted here in full — Section 5 is what discharges it.

---

## Section 3 — What §3's objection actually was, and why this is a different question

The evaluation's route finding reads:

> **Route / GPS track — Avoid, on identity grounds, not just plumbing grounds.** Beyond having no consuming surface, precise route geometry is meaningfully higher privacy/security surface (home-location inference, training-pattern exposure) than anything any activity type stores today. It also sits adjacent to the "public workout statistics" territory the Prohibited Patterns list is wary of (§10) even when unpublished.

It raises three distinct objections. They do not all survive the change of context, and it matters which is which:

1. **"No consuming surface."** — **No longer true.** That evaluation was scoping an *import* feature with nothing to render a route into. A map on the cardio block and the activity detail is a consuming surface, and it is the thing the PO asked for.
2. **"Adjacent to public workout statistics."** — **Does not apply, and is held not to apply by D-RTE-5.** That concern is about *comparison and publication*. A route stored for its own athlete, never shared, never ranked, never on a leaderboard, is the opposite of the Prohibited Patterns territory. The moment that stops being true, this amendment stops covering it.
3. **"Home-location inference, training-pattern exposure."** — **Fully applies, and is the real one.** A stored route begins and ends at the athlete's front door. This is not hypothetical: it is the single best-documented privacy failure in this product category.

Objection 3 is what Sections 4 and 5 exist to answer. Objections 1 and 2 are resolved by context and by scope respectively.

---

## Section 4 — D-RTE-1: the endpoint trim, and why it happens at write time

**Decision:** Before a route is written, the first and last **200 metres of travelled distance** are removed from the geometry. What reaches the database has never contained them.

**Why 200 m.** It is the established default for this mitigation in the category (Strava's privacy-zone radius is ⅛ mile ≈ 201 m), it is far larger than any GPS accuracy this app accepts (`ACCURACY_FLOOR_M` = 65 m), and it is large enough that a trimmed endpoint identifies a neighbourhood rather than a building.

**Why at write time, and not as a display rule.** This is the whole decision. Storing the full route and hiding its ends in the UI leaves the front door in the database — recoverable by any bug, any export, any future feature that forgets, any breach. Trimming at write means the sensitive geometry never exists at rest, and no later mistake can leak what was never persisted. A display-time rule protects the athlete from the screen; a write-time rule protects them from the system.

**Consequences, accepted deliberately:**

- **A short bout stores no route at all.** If fewer than two points survive the trim, `route` is written `NULL`. A run under ~400 m has no storable shape, and that is correct: at that length the trim and the route are the same thing.
- **A loop that begins and ends at home loses both ends.** The stored shape is the middle of the run. This is the mitigation working, not a defect.
- **The map is not the whole run, and the app must not imply it is.** The route surface says so in words. Distance, duration, pace and climb are unaffected — they are computed from the *full* track before the trim, so the numbers remain exact.

**D-RTE-2 — the trim is not configurable in V1.** No user-facing toggle to disable it. An off switch makes the safe path opt-in, and the default would be doing the protecting for exactly the people least likely to find the setting.

---

## Section 5 — D-RTE-3 through D-RTE-6: scope of the stored data

**D-RTE-3 — Geometry only. No per-point time series.** The stored polyline carries latitude and longitude and nothing else — no per-point timestamps, speeds, or altitudes. A time-stamped track is a movement log; a bare polyline is a shape. Pace and climb are already stored as summary values, which is what every consuming surface actually reads.

**D-RTE-4 — Elevation gain persists as a single integer of metres (`climb_m`).** A scalar total carries none of the inference risk of geometry, and it answers the PO's trail-run question directly. Metres canonical, converted for display by the existing `displayGain`; `NULL` — never `0` — when the device reported no usable altitude, preserving the distinction `hasClimbData` already draws between "flat" and "we could not tell".

**D-RTE-5 — A route is never shared, by any surface, in V1.** Author-only RLS. Not carried into squad posts, the friends feed, challenges, the share card, or any export. This is the condition under which Section 3's objection 2 does not apply, and it is load-bearing rather than a default: a future "share my route" feature is explicitly out of scope here and requires its own decision.

**D-RTE-6 — Routes die with their workout and with their account.** Storage is a column on the existing cardio row, so the existing cascade carries it. This must be re-proven against the account-deletion path rather than assumed, since account deletion was verified against a schema that had no route in it.

---

## Section 6 — Storage model

| Field | Type | Notes |
|---|---|---|
| `route` | `text` | Encoded polyline, precision 5 (~1 m, well under `ACCURACY_FLOOR_M`). `NULL` when the bout was indoors, untracked, or too short to survive the trim. ~2 KB for a 3-mile run against ~16 KB as raw JSON coordinates. |
| `climb_m` | `integer` | Total gain in metres. `NULL` when no usable altitude was reported. |

Both hang off the existing cardio bout row, beside `distance_mi`, `incline_pct` and `modality`. No new table: a route has exactly one bout, a bout has at most one route, and a separate table would buy nothing but a join.

**Encoding is a domain concern.** Polyline encode/decode belongs in `src/domain/run/` as pure, testable functions alongside `run-core.ts`, and the trim is applied there — one place, so it cannot be forgotten by a second caller.

---

## Section 7 — Non-Behaviors

This amendment does not, and will not without a further dedicated review:

- Share, publish, or expose a route to any other athlete, squad, or feed.
- Introduce segments, heatmaps, route matching, course comparison, or any leaderboard derived from geometry. Each is squarely in Prohibited Patterns territory.
- Store heart rate, cadence, or any per-point time series.
- Store a home address or declared privacy-zone centre. The endpoint trim is deliberately chosen because it requires knowing nothing about where the athlete lives.
- Import route data from Strava, Garmin, Apple Health, or any external platform. `External-Activity-Import-Architecture-Evaluation.md` governs that question and is untouched here.
- Alter how distance, pace, duration or lifetime statistics are computed. Those read summary values and are indifferent to whether a shape was kept.
- Design the map surface itself. This amendment makes a map *possible*; the wireframe is a separate piece of work.

---

## Section 8 — Validation

This amendment is correctly implemented when:

1. A tracked outdoor bout stores a route whose first and last 200 m of travel are absent from the stored value — verified against the *stored bytes*, not the rendered map.
2. A bout under ~400 m stores `NULL`, not a stub.
3. An indoor or manually-logged bout stores `NULL`.
4. Distance, pace, duration and `climb_m` are computed from the untrimmed track and are unchanged by the trim.
5. No route is readable by any account other than its author, proven by an RLS test rather than by inspection of the UI.
6. Deleting a workout removes its route; deleting an account removes all of them — re-proven end to end, not assumed from the cascade.
7. A route surface states that the map omits the start and end of the run.

---

## Section 9 — Touchpoints

| Document | Effect |
|---|---|
| `Endurance-Statistics-Architecture-Amendment-001.md` §9 | Three bullets superseded per Section 2. That amendment's statistics model is untouched. |
| `External-Activity-Import-Architecture-Evaluation.md` §3 | Route-import finding stands unrevised. This amendment covers natively-measured routes only. |
| `P-6-Privacy-Architecture.md` | **Gap.** Contains no mention of location, route, or GPS. Needs a section describing what is stored, the trim, and that routes are never shared. |
| `P-9-Account-Wireframe.md` / account deletion | Deletion path must be re-proven against the new column. |
| `Forge-Legacy-Master-Status.md` | Decision Queue entry on approval. |

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-15 | **Approved and locked.** Implemented the same day as `0162_route_and_climb.sql` (columns, both function bodies transformed by script from 0151, a shape constraint refusing raw coordinates) and `src/domain/run/route-privacy.ts` (the trim and the encoder, as one exported step so no caller can reach the encoder with an untrimmed track). D-RTE-1 is mutation-tested end to end: skipping the trim, or shrinking it, fails the suite. The map surface (#4) remains undesigned and unbuilt. |
| Draft | 2026-08-15 | Initial draft. Written as the dedicated architecture review required by `Endurance-Statistics-Architecture-Amendment-001.md` §9 before route data may be stored. Reconciles three §9 non-behaviors against shipped code — GPS tracking and live elevation already crossed, route storage not. Adopts `External-Activity-Import-Architecture-Evaluation.md` §3's home-location-inference finding in full and discharges it with a write-time endpoint trim (D-RTE-1) rather than a display rule. Decides geometry-only storage (D-RTE-3), scalar elevation gain (D-RTE-4), never-shared (D-RTE-5), and cascade deletion (D-RTE-6). Names the P-6 privacy gap. No map surface designed; no import behavior changed; no statistics model altered. |
