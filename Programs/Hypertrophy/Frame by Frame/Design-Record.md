# Frame by Frame (5-Day) — Design Record

**Status:** AUTHORED — original program. PO Lock Approval outstanding.
**Authored:** 2026-08-06, directly against `src/domain/training/schema.ts`. No `.docx` behind it.
**Definition:** `src/domain/training/programs/frame-by-frame-5day.json`
**Family:** Muscle Building · **Theme:** bodybuilding · **Difficulty:** Intermediate
**Catalog position:** **outside the locked 24** — see §2.

---

## 1. Provenance — read this first

The **idea** came from a third-party PDF the athlete brought in: *M-F Workout Routine: 5 Day Body Part
Split*, published free on muscleandstrength.com, by Josh England. The **program is original.** Nothing of
that document is reproduced here.

What was taken is one structural observation, and it is not anyone's property: **a ten-week, five-day,
one-body-part-per-day split is a coherent way to train an intermediate lifter for size.** That is a
training method with fifty years of gym history behind it, not a piece of authorship.

What was deliberately **not** taken:

- its name, and any name resembling it
- its day titles (*Monday: Back Workout*, *Tuesday: Chest & Abs Workout*, …)
- its exercise selection and the order it authored them in
- its prescriptions — its set counts, its 8–12 default, its rest table
- its written copy, its editorial voice, its author's byline

Same posture as [`scripts/bridger-logan/`](../../../scripts/bridger-logan/README.md), Squat Ascent §1 and
Body Recomposition Foundation §1.

### The calendar had to go, and that is a locked rule not a preference

The source's entire hook is *Monday to Friday, weekends off*. **Forge cannot express that.** PAS §2.2:

> **Critical locked rule:** `dayOfWeek` is always `null` for Forge programs. Programs are sequential, not
> calendar-based. Do not author programs assuming specific days of the week.

So the five days are A–E, not Mon–Fri, and an athlete who trains Tue/Wed/Fri/Sat/Sun runs it identically.
This is the single largest divergence from the source and it was not a choice.

### Three other things the source does that this does not

**No deload.** "Follow the program as written for 10 weeks." PAS-D7 requires one deload at the
penultimate week for any 7–10 week program. Week 9 is now a deload; week 10 is the peak.

**Rest of 30–45 s between sets.** That is prescribed against a 4 × 6 deadlift and a 5 × 6 back squat,
where it is not a hypertrophy cue but a way to fail the second set. This program uses PAS §10.3
INTERMEDIATE ranges — 150 s on the primary, 120 s on secondary compounds, 60–90 s on isolation.

**Progression in prose.** "Moving up in weight when possible" is sound advice that the app cannot render
— see §5, which is the most important section in this document.

---

## 2. Why this is NOT "Muscle Building Intermediate", and what it collides with

**The obvious slot was checked first and does not fit.** `Muscle-Building-Intermediate-Blueprint-v1.0.md`
is LOCKED and fixes **Sort 6 at 10 weeks × 4 sessions / 40 workouts.** The duration matches this source
exactly; the frequency does not. Authoring a 5-day program under that name would break a locked Blueprint
to match a PDF, and a locked Blueprint outranks a PDF. **Sort 6 remains unbuilt.**

So this ships **outside the locked 24**, like Iron & Engine, Full Frame and the three specialization
blocks. `successorName` is `null`: it is a standalone block, not a rung.

### ⚠ It overlaps Full Frame, and the product owner accepted that knowingly

`full-frame-5day.json` is **Muscle Building / Intermediate / 5 days**. So is this. The overlap was put to
the product owner before authoring began, with the options of building the 4-day locked slot instead or
not building at all; the instruction was to build the five-day. Recorded here rather than discovered
later by a reviewer.

**What actually differs**, and it is a real training distinction rather than a rationalisation:

| | Full Frame | Frame by Frame |
|---|---|---|
| Split logic | movement pattern — Push / Pull / Legs / Upper / Lower | **body part** — Back / Chest / Legs / Shoulders / Arms |
| Weekly frequency per muscle | roughly **twice** | **once**, at much higher per-session volume |
| Duration | 6 weeks | **10 weeks** |
| Deload | none (PAS-D7 exempts 4–6 weeks) | **week 9** |

That is the genuine argument between the two approaches, and the source's own copy makes it: *"with all
the hoopla about making sure to hit each body part twice a week… today we're going back to our roots."*
An athlete choosing between these is choosing frequency against per-session volume, which is a real
choice a catalog is allowed to offer.

**The honest counter, recorded because a Design Record that only argues one side is worth nothing:** two
programs at the same family, level and frequency compete for the same athlete, and nothing in the app
explains the difference above at the point of choosing. The Program Catalog shows name, duration and
frequency. On that surface these read as "the 6-week one" and "the 10-week one". **If only one survives
review, this is the newer and less proven of the two.**

---

## 3. What it is

Ten weeks, five days a week, 50 sessions, six blocks.

| | | |
|---|---|---|
| **A — Back** | `pull` | deadlift · vertical pull · two horizontal rows · lat isolation · shrug |
| **B — Chest & Core** | `push` | incline · flat dumbbell · machine press · fly · push-ups to failure · two core |
| **C — Legs** | `legs` | back squat · RDL · leg press · curl · walking lunge · calf · extension |
| **D — Shoulders & Core** | `push` | overhead press · lateral · rear delt · machine press · shrug · rollout · cable lateral |
| **E — Arms** | `upper` | curl · dip · spider curl · overhead extension · hammer · pushdown · concentration |

`structure` is **omitted**, not guessed. The controlled vocabulary is `upper_lower | ppl | full_body` and
a body-part split is none of them; claiming one would misdescribe the program to the artwork resolver.
Per-workout `split` carries the real signal.

**Day E is `upper`.** There is no `arms` split in the enum, and `push` would be a lie about a day that is
half biceps. `upper` is the honest superset of what an arm day trains.

---

## 4. Exercise selection

Free-weight and machine work at intermediate difficulty — this athlete has a training base, which is what
separates the selection here from Body Recomposition Foundation's machines-only reading of the same
caution. Barbell compounds open four of the five days.

All 36 catalog keys — including the one substitution — resolve against the **visible** catalogue
(`PICKER_DB`, 721 of 797 rows), not merely against `exercises.json`.

**Push-ups are authored to failure** via `repScheme: ['F', 'F', 'F']`, which is a real schema feature
rather than a note. The source prescribes "Failure" and it is the one prescription of its that translates
directly.

**The one substitution:** `parallel-bar-dip` carries `assisted-dip-machine`. A dip is a bodyweight
movement an intermediate lifter may still not own, and the alternative to naming a substitute is the
athlete inventing one.

---

## 5. Progression — and the mistake this program was built to avoid

**This is the section that matters.** Full Frame's first draft was rejected for exactly one thing, and it
is recorded in its own §1:

> It reproduced those five tables verbatim for all six weeks: 35 prescriptions, of which 25 never changed
> at all […] The design record defended it as double progression — work the range, add weight when you
> top it — which is sound advice and entirely absent from the file. **The app renders sets and reps; the
> load is whatever the athlete decides.** So week 6 rendered identically to week 1, and the progression
> existed only in prose nobody reads mid-set.

The source PDF has the same defect: one table, ten weeks, "move up in weight when possible."

So the progression here lives **entirely in numbers the app draws**:

| Block | Weeks | Exercises | Sets | Primary | Accessories | Rep volume |
|---|---|---:|---:|---|---|---:|
| 1 | 1–2 | 6 | 19 | 4 × 6 | 3 × 10 | 174 |
| 2 | 3–4 | 6 | 19 | 4 × 8 | 3 × 12 | 212 |
| 3 | 5–6 | 7 | 28 | 4 × 8 | 4 × 12 | 320 |
| 4 | 7–8 | 7 | 29 | 5 × 8 | 4 × 12 | 328 |
| 5 | **9 — Deload** | 6 | 18 | 3 × 6 | 3 × 8 | **138** |
| 6 | **10 — Peak** | 7 | 29 | 5 × 10 | 4 × 15 | **410** |

Week 1 and week 10 do not render alike. Every row sits inside PAS-D11 for HYPERTROPHY (5–8 exercises,
18–30 sets) **including the deload**, which drops volume through reps rather than falling out the bottom
of the envelope.

---

## 6. Coaching audit — findings

| # | Finding | Resolution |
|---|---|---|
| 1 | **Once-weekly frequency per muscle is the minority position** in current hypertrophy literature, which favours twice. | Accepted and deliberate — it is the program's identity and the reason it is distinct from Full Frame (§2). The mitigation is per-session volume: 28–29 sets for one body part is a large stimulus, and the week of recovery is what makes it survivable. |
| 2 | **Deadlift and back squat are 48 hours apart** (days A and C). | Accepted. Day B sits between them, the deadlift is 4–5 sets and never beyond 10 reps, and neither is loaded to a tested max. Worth watching in testing; if anything breaks first, this is it. |
| 3 | **Arms get a dedicated day after being trained on three others.** | Accepted — this is what a body-part split is, and it is why day E is last in the rotation. |
| 4 | **Week 10 raises reps AND sets while the athlete is at peak fatigue.** | Deliberate: it is the peak, it follows a deload, and nothing is being tested. Same posture as Body Recomposition Foundation's week 8 and the same thing to reverse first if it proves unrealistic. |
| 5 | **No cool-down.** | **Not a finding as of 2026-08-06** — PAS Amendment 003 makes COOL_DOWN optional for every category, because `ProgramWorkout` cannot express one. Never faked in `main` (PAS-A3-D4). |
| 6 | **`cable-crunch` and `ab-wheel-rollout` are the only core work**, and both are advanced-ish. | Accepted at INTERMEDIATE. `hanging-leg-raise` on day B is the third. |

---

## 7. PAS compliance

| Requirement | Status |
|---|---|
| PAS-D1 name length ≤ 60 | ✅ 22 |
| PAS-D3 RPE permitted (INTERMEDIATE + HYPERTROPHY) | ✅ none used — not required |
| PAS-D7 deload for a 7–10 week program | ✅ week 9, peak week 10 |
| PAS-D8 deload holds frequency | ✅ still 5 sessions |
| PAS-D9 WARM_UP | ✅ 3 items per session, all catalogue-resolvable |
| PAS-D9 COOL_DOWN | ✅ not required — Amendment 003 |
| PAS-D10 warm-up in its own section | ✅ `warmup[]`, never notes on MAIN |
| PAS-D11 5–8 exercises / 18–30 sets (HYPERTROPHY) | ✅ 6–7 / 18–29 |
| PAS §10.3 INTERMEDIATE rest | ✅ 150 / 120 / 90 / 60 s |
| PAS §2.2 `dayOfWeek` always null | ✅ days are A–E, not Mon–Fri |
| QC-2 visible progression | ✅ §5 — the table, not the prose |

---

## 8. Lock recommendation

**Recommend: hold**, on two things that are not a document's to settle:

1. **The Full Frame overlap (§2).** Two Muscle Building / Intermediate / 5-day programs now ship. That is
   a catalog-shape decision, and the Program Catalog surface does not currently explain the difference to
   the athlete choosing between them.
2. **Nobody has trained it.** Findings 2 and 4 are the ones to watch.

`status` is deliberately not `LOCKED`.
