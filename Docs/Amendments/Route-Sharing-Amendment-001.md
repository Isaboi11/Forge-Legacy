# Route Sharing Amendment 001 — the map goes on posts, and the endpoint trim is rescinded

**Status: APPROVED — PO decisions of 2026-08-26.**
**Revises:** `Route-And-Elevation-Persistence-Amendment-001.md` (D-RTE-1, D-RTE-2, D-RTE-5).
**Leaves standing:** D-RTE-3 (geometry only, no per-point time series), D-RTE-4 (climb as a scalar),
D-RTE-6 (routes die with their workout and their account).

---

## Section 1 — What was decided, in the PO's words

Presented with the running-post review (2026-08-26) and its three decisions, the PO ruled:

1. **D1 — share the route map:** *"Yes."*
2. **D2 — mixed sessions:** *"I think you can post both honestly. Be able to choose."*
3. **D3 — per-mile splits:** *"Yes."* (deferred, as recommended).
4. And unprompted, on the write-time endpoint trim: *"And then we veto the 200m remove. Take this
   out completely."*

Decision 4 is the second time the PO has ruled against the trim's visible effect. On 2026-08-26,
earlier, on the finished-run map: *"I want the whole run on the map. The whole cutting off part of the
run I don't want that"* — which that pass honoured by drawing from the in-memory track while leaving
D-RTE-1 intact. This ruling removes the trim itself.

## Section 2 — D-RS-1: the endpoint trim is rescinded

`Route-And-Elevation-Persistence-Amendment-001.md` D-RTE-1 (trim the first and last 200 m of travel
before writing) and D-RTE-2 (the trim is not configurable) are **rescinded**. The full measured track,
endpoints included, is encoded and stored.

**The risk this accepts, recorded so nobody later claims it was unexamined.** D-RTE-1 existed because a
run typically begins and ends at the athlete's front door, and
`External-Activity-Import-Architecture-Evaluation.md` §3 rated home-location inference the highest
privacy surface in this schema. With the trim gone and sharing approved (D-RS-2), a shared route can
show a squadmate exactly where the athlete's run began. The engineering advice was to keep the trim, or
failing that to trim only the shared copy; **the PO considered it and vetoed the trim completely.** The
mitigation that remains is consent: sharing the map is opt-in, per post, default off (D-RS-3).

**What cannot be recovered:** every route stored between 0162 (2026-08-15) and this amendment was
trimmed at write time. Those ~400 m per run are gone; old maps keep their trimmed shape. Only runs
saved after the client ships untrimmed carry their full track.

## Section 3 — D-RS-2: routes are shareable, in these places and no others

D-RTE-5 ("a route is never shared, by any surface, in V1") is revised by its own escape clause — it
named "share my route" as a future feature requiring its own decision, and this is that decision.

A route may appear:
- On the **shared Activity Detail** (the surface a squadmate or friend reaches from a post).
- On a **post**, as part of the run card — map alone, or with a photo (formats per the running-post
  review §4).

A route still may **not** appear on challenges, leaderboards, ranked surfaces of any kind, or any
export the athlete did not individually compose. That half of D-RTE-5's reasoning — routes never
become comparison material — stands.

## Section 4 — D-RS-3: sharing the map is a per-post choice, default off

The map goes on a post only when the athlete includes it while composing that post. Nothing shares
retroactively; the post snapshots what was chosen, as every other snapshot field does. This is the one
mitigation left standing after D-RS-1 and it is load-bearing: **it must not become a global "always
include" preference without a further amendment**, because a sticky default is how a choice made once
in enthusiasm becomes an address published weekly.

## Section 5 — D-RS-4: mixed sessions — both strips are honest; the athlete chooses

A session holding both strength sets and a cardio bout can lead with either summary. The composer
offers the choice; the snapshot records it. Neither is a default forced by rule.

## Section 6 — D-RS-5: splits stay deferred

Per-mile splits remain blocked by D-RTE-3 (no per-point time series) and were deferred by the PO.
A future splits feature requires its own decision and does not inherit anything from this amendment.

## Section 7 — Implementation obligations

1. `src/domain/run/route-privacy.ts` stops trimming; the encoder and the single-entry
   `routeForStorage` step remain (one path to a stored route, unchanged). The module's trim tests are
   **replaced, not deleted silently** — the new suite asserts the stored route begins and ends where
   the run did, so a regression that quietly reintroduces trimming fails loudly.
2. The `workout_sets.route` column comment (0162) claims the column has never held a start point. A
   migration must correct it — a schema that documents a rescinded guarantee is a trap for the next
   reader.
3. Surfaces that explain the trim (`CardioBlockCard`'s "too short to map" copy, save-core's comments)
   are updated in the same pass. `MIN_MAPPABLE_MI` loses its derivation (it was two trims meeting in
   the middle) and is removed; any outdoor tracked bout with two fixes stores its shape.
4. P-6 (privacy settings) gains a line item: when a privacy surface ships, route sharing's per-post
   consent belongs on it. Unbuilt today; recorded so it is not invented ad hoc later.

---

| Version | Date | Note |
|---|---|---|
| v1.0 | 2026-08-26 | Approved. Records PO decisions D1/D2/D3 from the running-post review and the unprompted veto of the endpoint trim, with the accepted risk stated in Section 2. |
