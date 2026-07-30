# Challenge Architecture — Amendment 005: Metric Expansion

**Status:** LOCKED · 2026-07-29
**Amends:** `Challenge-System-Architecture-v1.0.md` (v1.5) — **CS-D8** (challenge types & metrics), CS-D10 (scoring computation)
**Governed by:** `Comparison-Philosophy-Amendment-001` — CC-D3 (anti-shame, binding), CC-D5 (no Rank impact)
**Shipped in:** migrations 0061 (`metric_key`, `DISTANCE_TOTAL`), 0062 (`tz`, four fairness metrics), 0063 (`metric_over()`, four progression metrics)

---

## 1 · Why this exists

CS-D8's table lists **five** shipping challenge types. The build ships **fourteen**, plus two columns
the table doesn't describe. That gap was recorded in the Decision Queue while Competitions was being
built and is settled here.

**A correction to the record first.** Earlier commit messages, the Decision Queue entry and the status
board all cite this as owed against **CS-D9**. That is the wrong decision ID — CS-D9 is *qualifying-event
rules* (whose sessions count, and when), and the build conforms to it unchanged. The metric table is
**CS-D8**. The amendment is against CS-D8; the misattribution is corrected wherever it appears.

---

## 2 · CA5-D1 — The metric table is extended from 5 to 14 types

| Type | Status vs CS-D8 | Metric |
|---|---|---|
| `MOST_WORKOUTS` | in table | Count of qualifying sessions in window |
| `MOST_VOLUME` | in table | Σ (reps × weight) across qualifying sessions |
| `MAX_LIFT` | in table | Heaviest single qualifying set in window |
| `MOST_DURATION` | in table | Σ session duration in window |
| `MOST_PRS` | in table | Count of PR events in window |
| `DISTANCE_TOTAL` | **new** | Σ logged distance in window |
| `MOST_DAYS` | **new** | Distinct calendar days trained |
| `MOST_REPS` | **new** | Σ reps, weight ignored entirely |
| `EARLY_BIRD` | **new** | Sessions started before 07:00 local |
| `MOST_VARIETY` | **new** | Distinct exercises used |
| `GAIN_MAX_LIFT` | **new** | Change in heaviest single set vs the preceding equal window |
| `GAIN_VOLUME` | **new** | Change in volume vs the preceding equal window |
| `GAIN_REPS` | **new** | Change in reps vs the preceding equal window |
| `GAIN_DISTANCE` | **new** | Change in distance vs the preceding equal window |
| `RANK_XP` | still deferred | CS-D11 stands — Rank exposes no windowed quantity |

**CS-D11 is untouched.** `RANK_XP` remains unbuildable for exactly the reason CS-D11 gives, and nothing
here invents the windowed XP contract it would need.

### Why the four fairness metrics exist (CC-D3)

Every metric in the original table rewards the biggest, strongest or most available athlete. In a mixed
squad that decides the leaderboard before the challenge starts, which is the outcome CC-D3's anti-shame
rules exist to prevent. `MOST_DAYS`, `MOST_REPS`, `EARLY_BIRD` and `MOST_VARIETY` were chosen because the
winner is usually somebody else — discipline, bodyweight work, identity and curiosity respectively.
`MOST_DAYS` also closes a loophole `MOST_WORKOUTS` has: counting days rather than sessions makes
double-logging worthless.

### Why progression scores absolute gain, not percentage

Percentage improvement is unwinnable-by-design for anyone with a real baseline: an athlete who has never
squatted starts at zero, so their first session is an infinite improvement and they take every
progression challenge by existing. Absolute gain cannot be farmed by starting low. It does quietly favour
stronger athletes — the accepted trade, and precisely why the fairness metrics above ship alongside.

**Gains are floored at zero** (`greatest(0, after − before)`). An athlete whose window went backwards
scores 0, never a negative: CC-D3 bars a leaderboard from displaying "−15 lb", which is the clearest
possible failure marker.

**CS-D10 §2 (monotonicity) is preserved.** A gain is computed from two fixed windows, so within the
live window it is still non-decreasing.

---

## 3 · CA5-D2 — `metric_key` generalizes `targetExerciseId`

CS-D8 already defines optional exercise scoping, but restricts it: *"`targetExerciseId` applies only to
`MAX_LIFT` and is ignored for other types."*

`challenges.metric_key` is that same idea, applied wherever it is meaningful — an exercise
`catalog_key` for lift-based metrics, an `activity_type` for session-based ones, null for unscoped. This
is what turns fourteen metrics into hundreds of real competitions ("Max Deadlift", "Most Squat Volume",
"Most Miles Run") **without inventing a single new scoring rule.**

It deliberately matches the shape squad goals already use — `goal_metric_kind` + `goal_metric_key`
(migrations 0036/0037) — so "a metric, narrowed" has one mental model in the product rather than two.

Null behaves exactly as every pre-0061 challenge did, so nothing is retro-changed.

**AD-28c is preserved:** CUSTOM exercises remain excluded from `MAX_LIFT` scoring.

---

## 4 · CA5-D3 — `challenges.tz` carries the creator's zone

`MOST_DAYS` needs a day boundary and `EARLY_BIRD` needs a wall-clock hour. The database runs in UTC, so
"before 7am" would mean 07:00 UTC — 7am for almost nobody.

Each challenge stores the IANA zone its creator was in, and both metrics resolve against it. A squad
trains in roughly one place; the creator's zone is the closest honest answer available without asking
every participant at join time. Existing rows default to `UTC`, which is what they were already
implicitly using. A malformed zone falls back to UTC rather than failing the whole leaderboard.

**Known limitation, accepted:** a genuinely cross-timezone squad shares one day boundary. The
alternative — per-participant zones — makes "distinct days trained" incomparable between athletes, which
is worse for a competition than a shared boundary that is slightly wrong for some members.

---

## 5 · What did NOT change

- **CS-D9** (qualifying events) — unchanged and conformed to.
- **CS-D11** — `RANK_XP` still deferred, same reason.
- **CS-D4 / CC-D5** — nothing here writes a rank signal.
- **CS-D14 / CS-D15** — immutable results, co-winners on ties.
- **The four CS-D1 gates** — no public, no cross-context, no always-on, no auto-enrollment.

---

## 6 · Documents needing edits

- [ ] `Challenge-System-Architecture-v1.0.md` §7 — CS-D8 table: add the nine new types, note
      `metric_key` generalizing `targetExerciseId`, add `tz`; §17 validation list
- [ ] `Create-Challenge-Wireframe-Spec-C2.md` — the metric picker is specced against five types
- [ ] Decision Queue #18 — close, and correct the CS-D9 → CS-D8 misattribution

---

## 7 · Validation

- [x] 14 types enforced by `challenges_type_check`
- [x] `metric_key` null = unscoped = pre-0061 behaviour
- [x] Gains floored at zero; no negative score reachable
- [x] `tz` defaults to UTC; malformed zone degrades to UTC without failing the read
- [x] `metric_over()` is the single implementation — ten branches stayed one, not twenty
- [x] No rank signal written

---

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-29 | Initial. CA5-D1 (5 → 14 metric types), CA5-D2 (`metric_key` generalizes `targetExerciseId`), CA5-D3 (`challenges.tz`). Corrects the CS-D9 → CS-D8 misattribution carried in prior commits and the status board. |
