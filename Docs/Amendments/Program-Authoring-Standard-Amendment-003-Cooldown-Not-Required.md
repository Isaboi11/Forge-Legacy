# Program Authoring Standard — Amendment 003: Cool-Down Not Required

**Amends:** `Program-Authoring-Standard-v1.0.md` §9.1 (PAS-D9), §9.4, §20 (PAS-D9 row), §19 Group B checklist
**Status:** 🔒 LOCKED
**Date:** 2026-08-06
**Decided by:** Product Owner — "We don't need a cool down. Change the rule."
**Related:** `Programs/Conditioning/Iron and Engine/Iron-and-Engine-Design-Record.md` §5 finding 7 · `Programs/Conditioning/Body Recomposition Foundation/Lock-Record.md`

---

## What §9.1 said

| Category | COOL_DOWN Section |
|----------|------------------|
| CONDITIONING | **Required** |
| RUNNING | **Required** (post-run static stretch) |
| CYCLING | **Required** (cooldown spin + stretch) |
| COMBAT_SPORTS | **Required** |

## Why it is now false

**No Forge program can author a cool-down, in any category.** `ProgramWorkout` — the catalog model in
`src/domain/training/schema.ts` — carries exactly two sections:

```ts
export interface ProgramWorkout {
  warmup: WarmupItem[];
  main:   ExercisePrescription[];
  //  ← there is no third field, and there never has been
}
```

`WorkoutSection` on the *runtime* model has all three (`'warmup' | 'main' | 'cooldown'`), which is what
made this easy to miss: the vocabulary exists, the storage does not. §9.1 was written against the import
pipeline's `ExercisePrescription.section` enum, and the in-repo authored programs — which are now most of
the catalog — never went through that pipeline.

**The rule had already failed twice, silently.** Iron & Engine recorded it as finding 7 and shipped
anyway. Body Recomposition Foundation hit it again and was **locked with the violation open**, which is
the moment it stopped being a draft's problem and became a contradiction between the Standard and the
locked catalog.

A requirement that no author can satisfy is not a standard. It is a permanent red mark that teaches
authors to ignore the compliance table, which is the real cost — the next genuine violation reads like
this one.

## What replaces it

**PAS-A3-D1 — COOL_DOWN is not required for any Forge-authored program.**

§9.1's COOL_DOWN column reads **Optional** for every category. Not *prohibited* — optional. Nothing about
this says a cool-down is bad training; it says the catalog cannot express one, so it cannot be demanded.

**PAS-A3-D2 — WARM_UP is unchanged and still required.** `ProgramWorkout.warmup` exists, is authored on
every shipped program, and is enforced by `programs.test.mjs` (every item must resolve to a real, visible
exercise). PAS-D10 stands untouched.

**PAS-A3-D3 — The requirement returns only with a field AND a surface.** If `ProgramWorkout` later grows
a `cooldown` field, that alone does not revive PAS-D9. A written-and-never-rendered field is what
`ExercisePrescription`'s missing `notes` field already taught this repo to avoid:

> NO per-exercise coaching note field, deliberately. […] a `notes` here would be dropped on the way
> across and rendered by nothing.
> — `schema.ts`

So the condition is a field **and** a screen that shows it. Until both exist, re-adding the requirement
just recreates today's contradiction.

**PAS-A3-D4 — Do not fake it in `main`.** A stretch appended to `main` is counted by `setCount` as
working volume, rendered by W-9 as a working set, and logged as one. That is worse than the omission: it
inflates every volume figure the program reports and asks the athlete to log a hamstring stretch as
training. Both affected programs explicitly refused this and were right to.

## What this changes in the catalog, today

| Program | Before | After |
|---|---|---|
| **Body Recomposition Foundation** | LOCKED with a live PAS-D9 violation | **compliant — 11 of 11** |
| **Iron & Engine** | finding 7 open; §7 read 8 of 9 | **finding 7 closed by rule change; 9 of 9** |

No program content changes. No JSON is re-authored. Nothing an athlete sees is different. This amendment
moves a line in a document to match what the software has always done.

## What it does not change

- **Warm-ups.** Still required, still enforced, still authored on all 8 shipped definitions.
- **§9.4 Cooldown Content Guidance** is retained as *guidance for the day a cool-down is authorable*, and
  is now explicitly non-binding rather than deleted. Deleting it would throw away the thinking.
- **MOBILITY** already used MAIN only. Unaffected.
- **The import pipeline.** A `.docx`-imported program going through `ExercisePrescription.section` can
  still carry `COOL_DOWN` rows; this amendment removes the *requirement*, not the capability. That path
  is how the two Strength Foundation programs were built.

## Traceability

- §9.1 table — COOL_DOWN column set to Optional across all categories, with a banner citing this file
- §9.4 — banner marking the section non-binding guidance
- §20 PAS-D9 row — rewritten
- §19 Group B checklist — the COOL_DOWN line removed
- `Program-Catalog-Production-Standard-v1.0.md` — no edit needed; it defers to PAS for section rules
- `Programs/Forge-Program-Production-Standard.docx` — **not edited.** Data-protected (append/annotate
  only, never without confirmation). If it restates PAS-D9, it needs the product owner's annotation.

---

*Forge Legacy — Program Authoring Standard Amendment 003 — 2026-08-06*
