# Strength Builder I (4-Day) — Design Record

**Family:** Strength · **Difficulty:** Advanced · **Theme:** strength · **Structure:** none declared (4-way split)
**Length:** 10 weeks × 4 days · **Environment:** Commercial Gym
**Id:** `strength-builder-i-4day`
**Status:** AUTHORED — original program, PO Lock Approval outstanding

---

## §1 · Provenance

**Original, authored in-repo.** No third-party program was consulted, analysed or extrapolated from. Its
shape — a weekly top set per lift, carried into back-offs, waved across three rep brackets with deloads
between — is common property in strength training and is not any one author's method.

The name is not new either: **Strength Foundation II has named "Strength Builder I (4-Day)" as its
successor since it was written.** This program is that promise kept, not a new idea.

---

## §2 · The two gaps this closes

**§2.1 · One of fourteen programs was tagged Advanced, and it was conditioning.**

So the catalogue had nothing written for an experienced lifter, and the recommender's answer for
*strength / advanced / full gym* collapsed onto **Strength Foundation II** — an Intermediate block whose
own stated goals include *"improve gym confidence"*. To somebody who has coached other people, that is the
app announcing it cannot tell them apart from a novice, in the first ninety seconds.

`catalogServesLevel` was written to refuse to say that, and to show an honest *"you're past what the
library holds"* card instead. That card was the right stopgap. This is the actual answer, and the honest
card correctly remains for muscle and general health, which still have nothing at that level.

**§2.2 · Six of seven named successors did not exist.**

Graduating Strength Foundation II named a program nobody had written, so the hand-off fell through to
Holt. Authoring it chains the ladder end to end for the first time:

> Strength Foundation I → Strength Foundation II → **Strength Builder I** → Squat Ascent

---

## §3 · What makes it Advanced, specifically

Not more exercises, and not more days. Three things:

**§3.1 · A real top set, then back-offs.**
Each day opens with one barbell lift marked `intensity`, carried from a top set into two back-offs at
roughly 90%. The athlete is expected to judge a top set and stop it with one clean rep left — a judgement
a novice has not yet earned the reps to make, which is precisely why this is not a beginner block.

**§3.2 · The week waves, and the block is paid for.**
Weeks 1–3 at eights, 5–7 at fives, 9–10 at triples — with **week 4 and week 8 as real deloads** at roughly
60% of the previous week. The deload notes say so in as many words. A ten-week block without them is not
an advanced program, it is an optimistic one.

**§3.3 · Accessories exist to move the main lift, not to fill the session.**
Close-grip bench and pushdowns for the bench. Pendlay rows and pulldowns for the deadlift and the pull-up.
Front squat on the deadlift day is explicitly prescribed light — its coaching note calls it *"a position
day for the squat, not a second heavy session"* — because an advanced lifter will otherwise turn it into
one, and that is how a squat day and a deadlift day start eating each other.

**§3.4 · Every pressing week ends on a face pull.**
Stated in its coaching note: *"the shoulders that survive a five-day press schedule are the ones that get
pulled on."* At this frequency it is not an accessory, it is maintenance.

---

## §4 · The split, and why no `structure` is declared

Four days: **Squat · Bench · Deadlift · Press.** One barbell lift each, once a week, at a real top set.

`structure` is deliberately omitted. It is not upper/lower, not PPL, and not full body — it is a lift-per-day
split, and asserting a program-level structure that is not true is exactly the failure the schema's own
note warns about. Per-workout `split` carries it instead: `legs` · `push` · `pull` · `push`.

⚠ **`lower` is not used, and that is a rule rather than a preference.** `lower` is only correct inside a
declared `upper_lower` structure; outside one, a lower-body session is `legs`. Squat Ascent shipped with
`lower` and no structure, which is why there is now a test for it — and why the squat day here is `legs`.

The Press day is `push` despite carrying pull-ups and face pulls. It is a press day; the pulling is
balance, and calling it `upper` would require a structure this program does not have.

---

## §5 · Session design

| Code | Name | Split | Main lift | Accessories |
|---|---|---|---|---|
| A | Squat | legs | Back Squat | Romanian deadlift, hip thrust, hanging leg raise |
| B | Bench | push | Bench Press | Close-grip bench, DB bench, triceps pushdown |
| C | Deadlift | pull | Deadlift | Pendlay row, front squat (light), lat pulldown |
| D | Press | push | Overhead Press | Pull-up, incline bench, face pull |

No primary lift appears twice in a week. The deadlift is pulled heavy once and once only — five heavy
pulls a week is how people get hurt, and the same reasoning already governs Deadlift Measure.

---

## §6 · Successor

**Squat Ascent Intermediate.** A four-week specialisation on one lift is the honest next step after a
general block: the athlete now has a tested top set on all four lifts, which is exactly the entry
requirement Squat Ascent has and cannot check for itself.

That successor is real and resolves — verified, not assumed.

---

## §7 · Verification

- All 80 prescriptions resolve to real, **visible** catalogue ids.
- Every warm-up resolves by name to a visible exercise, carries no `catalogKey`, and contains **no ramp
  sets** — the first draft opened with *"Barbell Squat — empty bar, 2×5"* on three days and was rejected by
  the project's own guard, which is what that guard is for.
- 20 sessions across 5 blocks; weeks 1–10 covered with no gap or overlap.
- `strength / advanced / full gym` now resolves here, and `catalogServesLevel('advanced', 'Advanced')` is
  true — the refusal path remains reachable for muscle and health, which still have no Advanced block.

---

## §8 · Lock Approval

**Outstanding.** Phases 1–8 are complete and written down above. Lock Approval is the product owner's
alone. ⚠ Note also that this program's prescriptions are **percentage-free** — unlike the specialisation
blocks it leads into, it does not require a tested max to be readable, so it can be started the week it is
chosen.
