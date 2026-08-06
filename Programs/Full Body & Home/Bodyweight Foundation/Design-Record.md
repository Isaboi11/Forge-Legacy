# Bodyweight Foundation — Design Record

**Status:** AUTHORED — Stage 2 complete. PO Lock Approval outstanding.
**Authored:** 2026-08-06, directly against `src/domain/training/schema.ts`. No `.docx` behind it.
**Definition:** `src/domain/training/programs/bodyweight-foundation.json`
**Blueprint (LOCKED):** `Docs/Bodyweight-Foundation-Blueprint-v1.0.md`
**Catalog slot:** **Sort 18** — the locked 24, Full Body & Home, BEGINNER rung
**⭐ FEATURED** — one of only two (with Strength Foundation I). The plan calls the pair *the launch front door*.

---

## 1. Provenance

**No third-party source.** The first program in four to be authored from nothing but its own Blueprint —
the previous four each began with a PDF someone brought in.

There was nothing to take. A zero-equipment beginner program is the most-written article in fitness, and
what makes this one worth shipping is not its exercise selection but that it is **wired into an app that
knows what the athlete owns** (§2) and **progresses in the one way bodyweight training can** (§4).

---

## 2. ⚠ The pull — the one thing this program cannot do with nothing

This is the program's single significant design decision, and it deserves the top of the record.

**Every pull in the catalogue needs equipment.** Measured, not assumed: **4 horizontal pulls and 11
vertical pulls, all fifteen gated** on a bar, rings, straps or a rack. There is no bodyweight row, chin
or pulldown an athlete can do owning nothing.

That leaves two bad options and one honest one:

| | |
|---|---|
| **Omit the pull** | Ships a push-dominant beginner program. Six weeks of pressing with no pulling is how beginners build the exact posture problem a general-fitness program should prevent. |
| **Require a bar** | Breaks the featured promise. This program's entire premise (Blueprint §1) is *"the lowest possible barrier to starting: no equipment, train anywhere."* |
| **✅ Prescribe it as `optional`** | The model already defines `optional` as *"prescribed, but the athlete owes nothing by skipping it."* The pattern is named and programmed for anyone with a bar, a set of straps or a sturdy table; the athlete with none of that runs a complete session without it and is not told they failed. |

Both halves are asserted, because either one alone rots: a test requires that **a pull is present in every
session**, and that it is **the only prescription in the program needing gear**. Adding a required
pull-up "because pulling matters" turns three tests red, which is the point.

**This is the same class of problem as Close Quarters' bench**, and it is handled differently on purpose.
There, twelve of forty prescriptions needed a bench and the product owner chose to require it and say so
in `environment`. Here it is one prescription in six, the program is *featured* on the promise of needing
nothing, and `optional` exists precisely for a prescription the athlete may not be equipped for.

---

## 3. What it is

Six weeks, three days a week, 18 sessions, three blocks. Full body every session, rotated emphasis.

| | |
|---|---|
| **A — Squat Focus** | squat · push · *pull* · hinge · brace · calf |
| **B — Push Focus** | push · squat · *pull* · hinge · brace · shoulder |
| **C — Hinge Focus** | hinge · squat · push · *pull* · brace · calf |

Six exercises, 18 sets per session — inside PAS-D11's FULL_BODY envelope of 4–7 and 12–20. Every session
covers **squat, push, hinge and brace**, asserted; the pull is the fifth pattern and is §2's exception.

**No deload.** PAS-D7 mandates one only at 7 weeks and over; inventing one here would cut a six-week
block to five weeks of training. A test fails any block labelled as one.

---

## 4. Progression — reps, then a harder movement

There is no external load, so the two axes every other program in the catalog uses are both unavailable.
Blueprint §4 names the replacement: **linear rep progression, then variation difficulty.**

Each slot is a **three-rung ladder**, one rung per block, and the rep range is the gate between rungs —
the Blueprint's own example is *"master 3 × 15 before progressing to Pike Push-Ups."*

| Slot (day A) | Weeks 1–2 | Weeks 3–4 | Weeks 5–6 |
|---|---|---|---|
| Squat | Bodyweight Squat | Prisoner Squat | Split Squat |
| Push | Knee Push-Up | Push-Up | Close-Grip Push-Up |
| Hinge | Glute Bridge | Single-Leg Glute Bridge | Bodyweight Good Morning |
| Brace | Dead Bug | Plank | Hollow Body Hold |
| Reps | **8–12** | **10–15** | **12–20** |

**⚠ Sets stay at 3 for all six weeks, deliberately.** The Blueprint prescribes Linear rep progression,
**not** Volume Accumulation — that is Muscle Building Intermediate's model, one family over and authored
the same day. Raising sets here would run a second progression model nobody asked for, and it is the
obvious-looking edit for anyone who has just read that program. A test pins the set count at 3.

The rep range is authored as a real range (`reps` + `repsMax`), which **only became possible on
2026-08-06** — before that the ceiling was dropped between the catalog and the athlete, and "master 15
before progressing" would have reached them as a flat 8.

---

## 5. Movement selection

All bodyweight, all zero-equipment except §2's pull. Chosen for **ladders that go somewhere**: every
required slot has an easier rung behind it and a harder rung ahead, which is what makes rep progression
into variation progression possible at all.

**Deliberately excluded** per Blueprint §5's caution against advanced technique with no on-ramp: no
handstand push-ups, no pistol squats, no dragon flags, no L-sits. All are in the catalogue, all are
bodyweight, and all are wrong for an absolute beginner's first six weeks.

**Timed holds carry `durationSec`, never a high rep count.** A 45-second plank written as `reps: 45`
reaches the athlete as *forty-five planks* — `workout.tsx` renders `targetReps` flat, and only the
preview surfaces read a high count as seconds. The starter-template library was corrected for exactly
this; a test now holds this program to it.

---

## 6. Coaching audit — findings

| # | Finding | Resolution |
|---|---|---|
| 1 | **A beginner who owns nothing gets no pulling at all.** | §2. The honest answer is the optional pull plus posterior-chain work (superman, back extension, good morning) in every session, which is not a substitute for a row and is not claimed to be. **The strongest argument for shipping a cheap door-frame bar recommendation alongside this program** — a product decision, not a program one. |
| 2 | **Three sessions a week is the floor of useful frequency.** | The Blueprint fixes it. It is also the right floor for the athlete this targets: someone who has not trained before and needs the habit more than the dose. |
| 3 | **Week 5–6's split squat and single-leg work is a real jump** from bilateral. | Accepted — it is the ladder working. The rung behind it is available if they are not ready, which is the mechanic rather than a workaround. |
| 4 | **No conditioning.** | Deliberate, and the crux of the Blueprint's convergence test against Home Conditioning (Sort 21): conditioning here is an incidental byproduct, never the organizing principle. |
| 5 | No cool-down. | Not a finding as of 2026-08-06 — PAS Amendment 003. |

---

## 7. PAS compliance

| Requirement | Status |
|---|---|
| PAS-D1 name length ≤ 60 | ✅ 20 |
| PAS-D3 no RPE at BEGINNER | ✅ none |
| PAS-D7 no deload under 7 weeks | ✅ none, asserted |
| PAS-D9 WARM_UP | ✅ 3 items per session, catalogue-resolvable |
| PAS-D9 COOL_DOWN | ✅ not required — Amendment 003 |
| PAS-D11 4–7 exercises / 12–20 sets (FULL_BODY) | ✅ 6 / 18 |
| PAS §7.2 permitted progression model | ✅ Linear rep progression |
| PAS §10.3 BEGINNER rest | ✅ 60 s |
| PAS §11.7 bodyweight equipment ceiling | ✅ bodyweight only; the one gear-needing item is `optional` |
| QC-2 visible progression | ✅ §4 — ladder and rep range, both asserted |

---

## 8. Lock recommendation

**Recommend: hold**, on two things:

1. **Finding 1 — the pull.** The program is honest about it and the tests hold the line, but *"buy a
   £20 door-frame bar"* is advice this program cannot give and probably should. That is a product
   decision about what a featured program is allowed to recommend, and it should be made before the
   launch front door is locked.
2. **Nobody has trained it.** Finding 3 is the one to watch.

`successorName` is `Bodyweight Strength` (Sort 19), **blueprinted and unbuilt** — the successor link
resolves to nothing today.

`status` is deliberately not `LOCKED`.
