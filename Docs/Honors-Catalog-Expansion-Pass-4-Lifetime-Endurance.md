# Honors Catalog Expansion — Pass 4 (Lifetime Endurance)

## v1.1 | June 2026

**Status:** AUTHORING PASS — no Honor Architecture, Honor Evaluation Service, Endurance Statistics model, L-10, L-11, Rank, Goals, Progress, or Activity History redesign performed. This pass authors lifetime-distance honors against the newly locked `lifetimeDistance` statistic, the fourth in the Honors series and the second for Endurance specifically.

**Type:** Catalog Expansion Pass (fourth in the series — follows `Honors-Catalog-Expansion-Pass-1.md`, `Honors-Catalog-Expansion-Pass-2.md`, `Honors-Catalog-Expansion-Pass-3-Endurance.md`)

**Predecessors:** `Honor-Catalog-v1.0-LOCKED.md`, `Honors-Catalog-Expansion-Pass-3-Endurance.md`, `Endurance-Statistics-Architecture-Amendment-001.md`, `Endurance-Statistics-Architecture-Evaluation.md`.

**Read in full for this pass:** all documents above, plus `Honor-Evaluation-Service-Architecture-v1.0.md`, `HonorInstance-Architecture-v1.0.md`, `Honors-Spec-L10.md`, `Pace-Speed-Definition-Architecture-Note.md`.

---

## Section 1 — Audit

### 1.1 What Pass 3 left blocked, and what is now resolved

`Honors-Catalog-Expansion-Pass-3-Endurance.md` §6 named two endurance honor families as architecture-blocked, both for the same reason: "needs a new per-activity-type cumulative counter that does not exist."

| Pass 3 finding | Status after Amendment 001 |
|---|---|
| "Per-activity-type lifetime volume honors — Blocked — same counter gap" | **Unblocked.** `Endurance-Statistics-Architecture-Amendment-001.md` defines `lifetimeDistance` per `(athleteId, activityType)`, precisely the data Pass 3 found missing. This pass authors against it. |
| "Per-activity-type participation/count honors — Blocked — needs a new, per-type session counter" | **Technically unblocked** — Amendment 001 also defines `lifetimeSessionCount` — but deliberately not authored in this pass, per this task's own Section 3 instruction to restrict authoring to `lifetimeDistance` unless strongly justified otherwise (Section 6 below). |
| Pace/speed personal-record honors (Pass 3 §2/§6) | **Still blocked, unchanged.** Amendment 001 defines distance, session count, and duration statistics only — it does not touch the separate, previously-named cross-system integration gap between Rank's `bestPace` storage and the Honor Evaluation Service's PR-record system. Not reopened here. |

### 1.2 Overlap check against the 107-honor catalog

No existing honor — including all 26 from Pass 3 — references a cumulative, multi-session endurance total. Pass 3's 26 honors are exclusively single-session thresholds ("First 5K Run," evaluated against one session's own distance). This pass's honors are exclusively lifetime, cross-session totals. The two families are complementary, not overlapping, in the same relationship Strength's per-lift PR ladders already have to its separate, deeper "Club" honors (combined lifetime PR total) — this pass is Endurance's own equivalent of that second layer.

---

## Section 2 — Lifetime Distance Framework

Each ladder uses **five tiers, uniformly**, explicitly mapped to a progression stage: Beginner → Intermediate → Advanced → Long-Term → Legacy. This differs deliberately from Pass 3's per-activity tier-count variation (4 or 5, driven by how many real race distances each sport happens to have) — lifetime mileage has no external, culturally fixed landmark count to defer to the way single-session race distances do, so internal consistency across all six activities is the more defensible choice here, and it directly serves this task's explicit validation requirement (Section 4: beginner/intermediate/advanced/long-term/avoid-ending-too-early).

Thresholds are scaled to each activity's realistic annual training volume for a genuinely dedicated (not professional or elite) athlete, calibrated against the same 8–20-year career horizon `Honors-Catalog-Expansion-Pass-2.md`'s own threshold-setting discipline already established ("any new honor must be reachable within roughly 8–20 years of active participation... honors requiring 25+ years are automatically rejected"). The capstone "Legacy" tier in every ladder is deliberately the hardest, multi-decade rung — not a token fifth step — to satisfy "avoid ladders that end too early."

| Activity | Annual volume assumption (dedicated, non-elite) | Why this scale |
|---|---|---|
| Running | ~750–1,000 mi/yr | Standard dedicated-runner training volume; supports a 15,000-mile Legacy tier within ~15–20 years. |
| Walking | Same scale as Running | Fitness walking carries no comparable injury ceiling and can sustain equal or greater annual volume — mirrors Pass 3's own decision to give Walking parity with Running rather than a lesser ladder. |
| Hiking | ~200–500 mi/yr (12–25 day-hikes/year at 10–20 mi each) | Hiking's lower session frequency (weekends/seasons, not daily) sets a meaningfully lower scale than Running/Walking. |
| Cycling | ~2,500–3,000 mi/yr | Cycling's much higher per-session distance supports a far larger numeric scale without requiring more sessions than Running. |
| Swimming | ~50–100 km/yr | Swimming's much lower per-session distance (typically 1–3 km) sets the smallest numeric scale of the six, in absolute terms. |
| Rowing | ~150–300 km/yr | Between Swimming and Cycling in scale — moderate per-session distance, moderate frequency. |

---

## Section 3 — Honor Authoring

All 30 honors below qualify against `lifetimeDistance` only, per this task's instruction. `lifetimeSessionCount` and `lifetimeDuration` are deliberately not used in any qualification criterion in this pass — Section 6 evaluates, without authoring, why they remain available for a future pass rather than being folded in here. Every honor is evaluated whenever `lifetimeDistance` for the relevant `activityType` is updated (the same Session Save event Amendment 001 already defines), checked against threshold crossing with the existing one-time uniqueness rule, `(athleteId, honorType)` — no `chapterId`, identical in shape to every other one-time honor in the catalog. Metadata follows the existing precedent exactly: `{ distanceDisplay: string, unitSystem: 'mi' | 'km' }`, snapshotted at the moment of crossing.

### 3.1 Running

| honorType | displayName | Qualification | Rationale |
|---|---|---|---|
| `run_lifetime_distance_1` | 100 Lifetime Running Miles | `lifetimeDistance` (RUN) ≥ 100 mi or ≥ 160 km | The first real lifetime total — roughly a season of consistent running, not a single lucky week. |
| `run_lifetime_distance_2` | 500 Lifetime Running Miles | `lifetimeDistance` (RUN) ≥ 500 mi or ≥ 800 km | A full year of dedicated running, the first genuinely "I am a runner" lifetime marker. |
| `run_lifetime_distance_3` | 1,000 Lifetime Running Miles | `lifetimeDistance` (RUN) ≥ 1,000 mi or ≥ 1,600 km | A widely recognized running-culture milestone in its own right (the informal "1,000-mile club") — and a deliberate echo of the catalog's own existing "1,000 Pound Club" Strength honor, the same signature round number marking serious, sustained commitment. |
| `run_lifetime_distance_4` | 5,000 Lifetime Running Miles | `lifetimeDistance` (RUN) ≥ 5,000 mi or ≥ 8,000 km | A long-term identity marker — years of consistent training, not a phase. |
| `run_lifetime_distance_5` | 15,000 Lifetime Running Miles | `lifetimeDistance` (RUN) ≥ 15,000 mi or ≥ 24,000 km | The ladder's legacy capstone — roughly equivalent to running the circumference of the Earth and more than half again, a genuinely rare, multi-decade lifetime total. |

### 3.2 Walking

| honorType | displayName | Qualification | Rationale |
|---|---|---|---|
| `walk_lifetime_distance_1` | 100 Lifetime Walking Miles | `lifetimeDistance` (WALK) ≥ 100 mi or ≥ 160 km | Establishes walking's own lifetime ladder on equal footing with Running's, consistent with Pass 3's parity precedent. |
| `walk_lifetime_distance_2` | 500 Lifetime Walking Miles | `lifetimeDistance` (WALK) ≥ 500 mi or ≥ 800 km | A full year of dedicated walking — a real, sustained habit. |
| `walk_lifetime_distance_3` | 1,000 Lifetime Walking Miles | `lifetimeDistance` (WALK) ≥ 1,000 mi or ≥ 1,600 km | The same widely recognized "1,000-mile" milestone running culture already uses, carried over on equal footing — consistent with this ladder's parity with Running's. |
| `walk_lifetime_distance_4` | 5,000 Lifetime Walking Miles | `lifetimeDistance` (WALK) ≥ 5,000 mi or ≥ 8,000 km | A long-term identity marker, equal in weight to Running's. |
| `walk_lifetime_distance_5` | 15,000 Lifetime Walking Miles | `lifetimeDistance` (WALK) ≥ 15,000 mi or ≥ 24,000 km | Walking's own legacy capstone — not a lesser achievement than the equivalent running total. |

### 3.3 Hiking

| honorType | displayName | Qualification | Rationale |
|---|---|---|---|
| `hike_lifetime_distance_1` | 50 Lifetime Hiking Miles | `lifetimeDistance` (HIKE) ≥ 50 mi or ≥ 80 km | A handful of real day-hikes — hiking's lower session frequency sets a lower entry bar than Running/Walking. |
| `hike_lifetime_distance_2` | 250 Lifetime Hiking Miles | `lifetimeDistance` (HIKE) ≥ 250 mi or ≥ 400 km | Roughly a full hiking season of regular trail time. |
| `hike_lifetime_distance_3` | 750 Lifetime Hiking Miles | `lifetimeDistance` (HIKE) ≥ 750 mi or ≥ 1,200 km | Multi-season, sustained hiking commitment. |
| `hike_lifetime_distance_4` | 2,000 Lifetime Hiking Miles | `lifetimeDistance` (HIKE) ≥ 2,000 mi or ≥ 3,200 km | A long-term hiking identity marker — years of trail seasons. |
| `hike_lifetime_distance_5` | 5,000 Lifetime Hiking Miles | `lifetimeDistance` (HIKE) ≥ 5,000 mi or ≥ 8,000 km | Hiking's legacy capstone — roughly 250–500 substantial day-hikes over a hiking lifetime, genuinely rare. |

### 3.4 Cycling

| honorType | displayName | Qualification | Rationale |
|---|---|---|---|
| `bike_lifetime_distance_1` | 250 Lifetime Cycling Miles | `lifetimeDistance` (BIKE) ≥ 250 mi or ≥ 400 km | A real cycling habit beyond occasional rides — cycling's higher per-session distance sets a higher entry bar than Running/Walking on the same numeric scale. |
| `bike_lifetime_distance_2` | 1,000 Lifetime Cycling Miles | `lifetimeDistance` (BIKE) ≥ 1,000 mi or ≥ 1,600 km | A genuine season of regular riding. |
| `bike_lifetime_distance_3` | 5,000 Lifetime Cycling Miles | `lifetimeDistance` (BIKE) ≥ 5,000 mi or ≥ 8,000 km | Multi-year sustained cycling commitment. |
| `bike_lifetime_distance_4` | 15,000 Lifetime Cycling Miles | `lifetimeDistance` (BIKE) ≥ 15,000 mi or ≥ 24,000 km | A long-term cycling identity marker. |
| `bike_lifetime_distance_5` | 50,000 Lifetime Cycling Miles | `lifetimeDistance` (BIKE) ≥ 50,000 mi or ≥ 80,000 km | The ladder's legacy capstone — roughly twice the Earth's circumference, a genuinely rare, multi-decade cycling total. |

### 3.5 Swimming

| honorType | displayName | Qualification | Rationale |
|---|---|---|---|
| `swim_lifetime_distance_1` | 25 Lifetime Swimming Kilometers | `lifetimeDistance` (SWIM) ≥ 25 km or ≥ 15.5 mi | Swimming's much smaller per-session distance sets the smallest absolute scale of the six — still a real, sustained early commitment. |
| `swim_lifetime_distance_2` | 100 Lifetime Swimming Kilometers | `lifetimeDistance` (SWIM) ≥ 100 km or ≥ 62 mi | A genuine season of regular swim training. |
| `swim_lifetime_distance_3` | 250 Lifetime Swimming Kilometers | `lifetimeDistance` (SWIM) ≥ 250 km or ≥ 155 mi | Multi-year sustained swimming commitment. |
| `swim_lifetime_distance_4` | 500 Lifetime Swimming Kilometers | `lifetimeDistance` (SWIM) ≥ 500 km or ≥ 310 mi | A long-term swimming identity marker. |
| `swim_lifetime_distance_5` | 1,000 Lifetime Swimming Kilometers | `lifetimeDistance` (SWIM) ≥ 1,000 km or ≥ 621 mi | The ladder's legacy capstone — roughly equivalent to swimming the English Channel's ~34 km crossing distance nearly thirty times over a swimming lifetime. |

### 3.6 Rowing

| honorType | displayName | Qualification | Rationale |
|---|---|---|---|
| `row_lifetime_distance_1` | 50 Lifetime Rowing Kilometers | `lifetimeDistance` (ROW) ≥ 50 km or ≥ 31 mi | A real, sustained early rowing commitment. |
| `row_lifetime_distance_2` | 250 Lifetime Rowing Kilometers | `lifetimeDistance` (ROW) ≥ 250 km or ≥ 155 mi | A genuine season of regular rowing. |
| `row_lifetime_distance_3` | 750 Lifetime Rowing Kilometers | `lifetimeDistance` (ROW) ≥ 750 km or ≥ 466 mi | Multi-year sustained rowing commitment. |
| `row_lifetime_distance_4` | 2,000 Lifetime Rowing Kilometers | `lifetimeDistance` (ROW) ≥ 2,000 km or ≥ 1,243 mi | A long-term rowing identity marker. |
| `row_lifetime_distance_5` | 5,000 Lifetime Rowing Kilometers | `lifetimeDistance` (ROW) ≥ 5,000 km or ≥ 3,107 mi | Rowing's legacy capstone — a genuinely rare, multi-decade rowing total. |

**No filler, no duplicates check:** every threshold is a deliberately chosen progression rung, scaled to its activity's own realistic training volume — none was inserted simply to fill a numeric sequence. No honor here overlaps with any of Pass 3's 26 single-session honors or any of the 81 pre-existing honors; this pass measures a fundamentally different thing (cumulative history) than Pass 3 (a single best session).

---

## Section 4 — Ladder Validation

| Stage | Validation |
|---|---|
| **Beginner recognition** | Every ladder's tier 1 is reachable within roughly a season to a year of regular, non-extreme training — not an accidental first session, but not an elite barrier either. Confirmed individually per activity in Section 2's volume table. |
| **Intermediate recognition** | Tier 2 in every ladder represents a genuine full year (or full season, for Hiking) of sustained commitment — the point where "I tried this" becomes "I do this." |
| **Advanced recognition** | Tier 3 in every ladder requires multi-year (2–4 season) sustained training — a real step beyond a single strong year, never a marginal increment over tier 2. |
| **Long-term recognition** | Tier 4 in every ladder is a multi-year identity marker, deliberately requiring the kind of sustained, years-long dedication this evaluation's framing asks for explicitly. |
| **Avoid ladders that end too early** | Tier 5 (Legacy) in every ladder is calibrated to the upper bound of the locked 8–20-year career horizon for a dedicated, non-professional athlete — never a numerically convenient stopping point reachable in a year or two. Running's and Walking's 15,000-mile capstones, Cycling's 50,000-mile capstone, and the equivalent metric capstones for Hiking/Swimming/Rowing are all deliberately the hardest rung in their respective ladders, not a token fifth tier appended for symmetry. |

---

## Section 5 — Catalog Impact

| Metric | Before this pass | After this pass |
|---|---|---|
| Total honors | 107 | **137** |
| Total categories | 8 (Endurance added by Pass 3) | **8 — unchanged** |
| Endurance honors | 26 (Pass 3, single-session) | **56** (26 single-session + 30 lifetime-distance) |
| Endurance honor families | 1 (per-activity Milestone) | **2** (per-activity Milestone + per-activity Lifetime Distance) |

**No new category and no new L-10 touchpoint are required** — unlike Pass 3, which had to add Endurance as an 8th category, this pass adds a second *family* within an already-existing category, the same relationship Strength already has between its per-lift PR families and its separate Club family. This is a meaningfully smaller touchpoint footprint than Pass 3's.

**Coverage improvement:** every endurance-typed athlete now has both a single-session achievement ladder (Pass 3, "did I just do something remarkable") and a lifetime-journey ladder (this pass, "what have I built over time") — the same two-axis recognition shape Strength athletes have had since the original locked catalog (per-lift PRs plus combined-total Club honors).

---

## Section 6 — Future Capacity

Per the objective's instruction, these are evaluated but not authored.

- **`lifetimeSessionCount`-based participation honors** (e.g., "100th lifetime run") — now architecturally unblocked by Amendment 001, but deliberately out of this pass's scope. Real future value, secondary to distance per `Endurance-Statistics-Architecture-Evaluation.md` §5.3's own finding that session count "rides along on distance's value rather than carrying independent weight."
- **`lifetimeDuration`-based honors** (e.g., "500 lifetime hours running") — also unblocked, also deliberately excluded here. Carries the same redundancy risk this whole workstream has flagged twice already (Pass 3 §2 for single-session Duration vs. Distance; the Statistics Evaluation §2.1/§5.2 for lifetime Duration vs. Distance) — a long lifetime distance total is, for continuous endurance activities, very likely to already correlate tightly with a long lifetime duration total. A future pass should evaluate this redundancy risk explicitly before authoring, not assume duration adds independent value just because the data now exists.
- **Cross-activity combined lifetime distance** — still an open question, not resolved by this pass either (carried forward unchanged from `Endurance-Statistics-Architecture-Evaluation.md` §6: distance across mechanically different activities is not obviously additive in meaning the way Strength's same-effort-type Club honors are).
- **Pace/speed lifetime-best honors** — unaffected by this pass; remains gated on the separate, already-named Rank/Honor-Evaluation-Service integration gap (Section 1.1 above).

---

## Section 7 — Final Recommendation

### 7.1 Approved honors

All 30 honors in Section 3: 5 tiers × 6 activities (Running, Walking, Hiking, Cycling, Swimming, Rowing), qualifying exclusively against `lifetimeDistance`.

### 7.2 Rejected / deferred honors

Not rejected on the merits — deferred, per this task's explicit scope restriction: `lifetimeSessionCount`-based and `lifetimeDuration`-based honors (Section 6), cross-activity combined totals (Section 6), and pace/speed lifetime-best honors (still blocked on a separate, unrelated integration gap, Section 1.1).

### 7.3 Risks

- **Data inflation, now concretely activated.** `Endurance-Statistics-Architecture-Amendment-001.md` §7/§8 already named the risk that lifetime counters make duplicate-import or uncorrected edit/delete errors more visible than today's broader counters — this pass is the first place that risk has a real, athlete-facing honor attached to it. No new risk is introduced beyond what that amendment already named; this pass is simply the first consumer for whom getting it right actually matters.
- **HIKE/ROW dependency, carried forward again.** 10 of the 30 honors (Hiking's 5, Rowing's 5) cannot evaluate against real data until the still-pending `ActivityType` enum amendment lands — the same sequencing risk named in Pass 3, recurring here unchanged.
- **Capstone-tier rarity calibration.** The Legacy tier in each ladder was deliberately set near the upper bound of the 8–20-year horizon using this evaluation's own volume assumptions (Section 2) — these are reasoned estimates, not measured data, and a future pass revisiting actual athlete distribution data might find one or more capstones calibrated slightly too high or too low. Flagged honestly as an estimate, not a measured fact.

### 7.4 Open questions

- Should a future pass author `lifetimeSessionCount` or `lifetimeDuration` honors, and if so, how would it avoid the redundancy-with-distance risk named in Section 6? Not resolved here.
- Should cross-activity combined lifetime distance ever become a Club-style honor? Still open, carried forward unchanged from the predecessor evaluation.
- L-11 description templates for these 30 honors are not authored in this pass, consistent with this task's Section 3 scope (honorType/displayName/qualification/rationale only) — the same standard pre-launch follow-up every prior pass has deferred identically.

### 7.5 Readiness assessment

**Ready, pending the same category of small follow-ups already named by Pass 3 and Amendment 001:** the HIKE/ROW enum amendment landing, and L-11 description templates authored for all 30 honors. No new follow-up category is introduced by this pass — it inherits exactly the two outstanding items already on record, plus none of its own.

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.1 | June 2026 | Post-lock adjustment: Running and Walking tier 3 changed from 1,500 to 1,000 lifetime miles (1,600 km), accepting a proposed revision. Rationale: 1,000 is a widely recognized running-culture milestone (the informal "1,000-mile club") and deliberately echoes the catalog's existing `club_1000` Strength honor ("1,000 Pound Club") — the same signature round number. This trades a slightly smoother ratio progression (5x/3x/3.3x/3x under 1,500) for one with a single dip (5x/2x/5x/3x under 1,000), judged an acceptable tradeoff since the existing, locked Training Workout Count ladder already contains comparably non-monotonic ratios. No other tier, activity, or total changed. |
| v1.0 | June 2026 | Initial Honors Catalog Expansion — Pass 4 (Lifetime Endurance). Audited Pass 3's two architecture-blocked findings and confirmed Lifetime Distance honors are now unblocked by `Endurance-Statistics-Architecture-Amendment-001.md`; confirmed Participation/Count honors are also technically unblocked but deliberately out of this pass's scope, and confirmed pace/speed PR honors remain blocked on an unrelated, unchanged integration gap. Designed a uniform five-tier (Beginner/Intermediate/Advanced/Long-Term/Legacy) lifetime-distance framework across all six endurance activities, scaled to each activity's own realistic annual training volume within the existing 8–20-year career-horizon discipline. Authored 30 honors (5 tiers × 6 activities) qualifying exclusively against `lifetimeDistance`, with no use of `lifetimeSessionCount` or `lifetimeDuration` in this pass. Catalog grows from 107 to 137 honors; Endurance grows from 26 to 56 honors across two families (Milestone, from Pass 3, plus this pass's Lifetime Distance) within its existing category — no new category or L-10 touchpoint required, unlike Pass 3. Evaluated, without authoring, future opportunities unlocked by `lifetimeSessionCount` and `lifetimeDuration`, and flagged duration's likely redundancy with distance as a question for whoever next considers authoring it. No Honor Architecture, Honor Evaluation Service, Endurance Statistics model, L-10, L-11, Rank, Goals, Progress, or Activity History redesign performed. |

---

*Honors Catalog Expansion — Pass 4 (Lifetime Endurance) — v1.0*
*Forge Legacy | June 2026*
