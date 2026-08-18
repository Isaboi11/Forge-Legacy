# Within Reach (3-Day) — Design Record

**Family:** Full Body & Home · **Difficulty:** Intermediate · **Theme:** strength · **Structure:** full_body
**Length:** 8 weeks × 3 days · **Environment:** Home — two adjustable dumbbells and a bench
**Id:** `within-reach-dumbbell-3day`
**Status:** AUTHORED — original program, PO Lock Approval outstanding

---

## §1 · Provenance

**Original, authored in-repo against the program schema.** No third-party program was consulted, analysed
or extrapolated from. The structure, prescriptions, session names and copy are the app's own.

This matters because the project's provenance rule has exactly three honest positions — *personal-only*,
*method-taken-and-authored*, or *nothing* — and this is the third. There is no source to credit because
there is no source.

---

## §2 · The gap this was written to close

Measured from the recommender before authoring: of the 18 goal × experience combinations an athlete can
reach by answering **"dumbbells"**, **15 resolved to Bodyweight Foundation** — a program that needs no
equipment at all.

So somebody told the app they owned dumbbells and was handed a plan that ignored them. Only the muscle
goal had a real answer (*Close Quarters*); strength, fat loss and athletic had none, and fell through to
the no-equipment program because that was the safe direction rather than the right one.

That fallback was correct while nothing better existed. This is the something better.

---

## §3 · The problem dumbbell training actually has

Not variety — **the load runs out.** A fixed pair of adjustable dumbbells has a ceiling, and a novice
reaches it on the hinge and the squat long before they reach it on the press. A program that ignores this
works for six weeks and then quietly stops progressing, which is worse than one that never worked.

Three decisions follow from it, and they are the whole design:

**§3.1 · The load moves onto one limb as the athlete gets stronger.**
Session C is built around unilateral work — Bulgarian split squat, single-arm row, single-leg Romanian
deadlift. One leg under the same bells is double the load on that leg, which is how a capped pair keeps
being enough. The coaching note on the split squat says this out loud rather than leaving the athlete to
work out why the program keeps sending them there.

**§3.2 · Reps climb before load does.**
Every main prescription carries a range (`reps` → `repsMax`). The athlete adds reps to the top of the
range, then adds weight and returns to the bottom. On fixed bells this is not a preference, it is the only
progression available for most of the block.

**§3.3 · Blocks shorten the range rather than adding days.**
Weeks 1–3 at 3×10–12, weeks 4–6 at 4×8–10, weeks 7–8 at 4×6–8, with rest climbing 90 → 120 → 150s. Three
days a week is held for all eight weeks. A fourth day would be the obvious way to add volume and the wrong
one: this athlete trains at home, and the constraint that ends home programs is the calendar, not the
stimulus.

---

## §4 · What the catalogue could not give it, stated plainly

**There is one dumbbell vertical pull in the entire visible catalogue** (`dumbbell-pullover`). A home
athlete with no bar to hang from cannot train the vertical pulling pattern properly, and no honest
programming hides that.

So the program does not pretend. It leans on horizontal pulling — chest-supported row, bent-over row,
single-arm row — which the catalogue supports well, and accepts the gap rather than filling it with a
movement that would be a vertical pull in name only. An athlete who later adds a pull-up bar has the
obvious next thing to do, and it is not in this program's gift to give them.

---

## §5 · Session design

| Code | Name | Emphasis | Main movements |
|---|---|---|---|
| A | Squat & Press | Squat-led full body | Goblet squat, DB bench, chest-supported row, RDL, hammer curl, dead bug |
| B | Hinge & Pull | Hinge-led full body | Sumo deadlift, seated press, bent-over row, reverse lunge, overhead triceps, farmer carry |
| C | One Side at a Time | Unilateral full body | Bulgarian split squat, incline press, single-arm row, single-leg RDL, lateral raise, calf raise |

Every session is `full_body`. All five patterns — squat, hinge, push, pull, carry — appear across the week,
and each session carries at least one of squat/hinge and one of push/pull, so a missed day never costs a
pattern for the week.

**Carries are prescribed as seconds, not reps** (`dumbbell-farmer-carry`, 40s). A carry is a time under
load, and writing it as reps would be the schema being obeyed against the movement's meaning.

---

## §6 · Why Intermediate, for a program a beginner can run

The `difficulty` field describes **technical demand, not required fitness** — the distinction this project
has already had to correct once, and the reason 590 of 733 catalogue exercises carry `Intermediate`
including the push-up and the bodyweight squat.

Tagging it Intermediate is therefore honest about the movements and does not exclude beginners:
`catalogServesLevel` only ever looks DOWNWARD, so a beginner is served an Intermediate program and only an
*advanced* athlete is refused. Which is correct — an advanced lifter with dumbbells alone needs something
this program does not claim to be.

---

## §7 · Successor

**None named, deliberately.** The honest next step depends on what changed: an athlete who now has access
to a barbell should go to Strength Foundation I, and one who wants size with the same bells should go to
Close Quarters. Naming one would be guessing at which, and `nextAfter` hands an unnamed successor to Holt,
who can ask.

---

## §8 · Verification

- All 54 prescriptions resolve to real, **visible** catalogue ids (not merely present in `exercises.json`
  — the visible catalogue is smaller, and a program may only prescribe what the app can actually show).
- Every warm-up item resolves by name to a visible exercise, carries no `catalogKey`, and contains no ramp
  sets — the rule that retired 244 of 405 authored warm-up items.
- 9 sessions, 3 blocks, weeks 1–8 covered with no gap or overlap.
- Dumbbell answers resolving to Bodyweight Foundation: **15 of 18 → 3 of 18**. The remaining three are the
  endurance goal, which dumbbells do not answer and Holt builds instead.

---

## §9 · Lock Approval

**Outstanding.** Phases 1–8 of the Production Standard are complete and written down above; Lock Approval
is the product owner's alone, and claiming it here would be forging a signature.
