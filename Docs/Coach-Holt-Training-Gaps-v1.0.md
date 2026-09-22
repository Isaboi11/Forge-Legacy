# Coach Holt — Training Gaps v1.0

**Status:** 🔒 **LOCKED 2026-09-22** — TG-D1, TG-D2, TG-D3 decided by the PO. TG-D4 deferred to ship (see below).
**Drafted:** 2026-09-22
**Governs:** what Holt says when an athlete asks *"what do I need to work on?"*
**Supersedes nothing.** Extends `AI-Coach-Capability-Scope-v0.1` tier C and `Coach-AI-Preflight-Gates-v0.1` §2.2.

---

## Why this document exists

The PO asked whether Holt could read a **photo** of an athlete and say what needs work and which workouts
would help — framed explicitly as observation rather than advice, to stay clear of legal trouble.

**The answer to the photo version is no, and the app already enforces that.** `domain/coach/form-check.ts`
carries a filter that DROPS any sentence mentioning physique, body fat, weight, build or appearance, and
`coach-form-check/index.ts` tells the model *"You are looking at a movement, not at a person."* Both landed
2026-09-22 on the PO's own legal-caution direction. `Coach-AI-Preflight-Gates-v0.1` §2.3 puts the athlete's
body at **AMBER** — readable only on an explicit per-request ask, **never volunteered**.

The observation/advice distinction does not rescue it, for three reasons that sit outside that line:

1. **Minors use the app.** Soliciting a body photo from an under-18 athlete is a different and worse problem
   than any disclaimer addresses. `P-6` and the nutrition under-18 rules already treat this cohort as
   requiring separate handling.
2. **"Here is what is wrong with your body" is the body-image harm**, not a side effect of it, however
   carefully the sentence is built.
3. **Photo-derived body composition is unreliable**, and a confident wrong answer is worse than silence.

**But the outcome the PO wants is legitimate and reachable without a photo.** "What needs work" is
answerable from the athlete's own logged training, which Preflight Gates §2.2 places at **GREEN — read
freely**, and which §2.2 already names as the data behind tier C (*"why has my bench stalled"*). That is
what this document specifies.

---

## 1. The shape of it

> **Athlete:** "what do I need to work on?"
>
> **Holt:** "Two things stand out over the last eight weeks. You have not trained calves at all — no primary
> sets in 24 sessions. And your bench e1RM has been flat since early August while your squat and row both
> moved. Want me to put a calf focus in your next block?"

Nothing about the body. Every clause traceable to a row the athlete logged themselves.

---

## 2. The four signals

All four read the window `summarizeTraining` already uses (8 weeks), and all four are computed against the
**12 focus muscles** `rulebook/focus.ts` already defines and has already measured against the catalogue:
*glutes, arms, biceps, triceps, shoulders, chest, back, legs, quads, hamstrings, calves, core*.

| # | Signal | Definition | Why it is safe |
|---|---|---|---|
| **G1** | **Never trained** | A focus muscle with **zero** sets whose PRIMARY mover it is, across the window | A count of the athlete's own rows |
| **G2** | **Underworked** | Trained, but its set count sits far below the athlete's own other groups | Relative to themselves |
| **G3** | **Stalled** | e1RM flat or down across the window on a lift still being trained, while others moved | Already how `training-summary.ts` reports trends |
| **G4** | **Dropped** | Trained regularly in the first half of the window, absent from the second | A change in their own behaviour |

⚠ **G3 must keep the `training-summary.ts` discipline:** e1RM is Epley, only over sets of 1–10 reps, and is
always written "e1RM" — never spoken as a lift the athlete actually performed.

---

## 3. TG-D1 — the yardstick. **The central decision.**

There is **no per-muscle weekly volume table in this codebase.** `rulebook/volume.ts` transcribes PAS §10.1,
which bands *exercises and sets in MAIN per session* — not sets per muscle per week. So G2 needs a yardstick
that does not exist yet, and there are two ways to get one:

**Option A — author an absolute standard.** A new PAS-style table: "this group wants N sets a week." Lets
Holt say *"your back is under-trained."* ⚠ Requires a defensible source, a human reviewer, and it makes a
**claim about what the athlete should be doing** — which is the exact register the legal caution is trying
to stay out of. `rulebook/limitations.ts` is already flagged in its own file as the closest thing to health
guidance in the app and *not yet reviewed by anyone*; Option A adds a second such file.

**Option B — relative only. RECOMMENDED.** Holt compares the athlete against **themselves** and never
against a standard. *"You have trained chest 34 times and calves twice"* is a fact about their log.
*"Your calves are under-trained"* is a claim about training science. Option B says only the first.

Recommendation: **B for v1.** No new authored standard, it cannot be wrong about a number it never claims,
and it delivers the whole outcome the PO asked for. A is a later amendment if the product ever wants it.

---

## 4. TG-D2 — pull, not push

**Recommendation: answer-on-ask only for v1.** Holt says this when asked, and never volunteers it.

⚠ The reasoning is the same one that rules out the photo. An unprompted *"here is what is wrong with your
training"* is the same **shape** as an unprompted comment about someone's body: it arrives uninvited and it
is about the athlete's inadequacy. Preflight Gates §2.3 already establishes *"only when asked, never
volunteered"* as this product's pattern for anything sensitive, and §2.5 repeats it for legacy data.

`rulebook/nudges.ts` (built, `0179`) is the existing push channel and is **state-only, no moments**. Gaps
should NOT go down it in v1. Revisit once the pull version has been seen by real athletes.

---

## 5. The payoff is already built

**This is why the feature is small.** The output of the analysis is already an input the engine accepts:
`rulebook/focus.ts` takes exactly these 12 muscles and turns one into an extra slot plus an extra set, on
the days that already train it, inside the caps `validate-program.ts` enforces.

So "what workouts would help" is not a new engine. It is:

```
detect gap  →  offer a focus  →  focus.ts does what it already does
```

No new exercise selection, no new program shape, no new validation.

⚠ **G3 (stalled) is the exception and must not route to a focus.** A stalled lift is a progression question,
not a volume one — `progression.ts` and `intensity-learning.ts` own it. Offering "more chest volume" for a
flat bench is the wrong answer confidently delivered. **TG-D3: for v1, G3 reports the observation and offers
no action.**

---

## 6. What it may never say

Reuse the existing filter. `form-check.ts:292` is already the regex that drops physique, body fat, weight,
build and appearance language, and `__tests__/form-check.test.mjs` already asserts on strings like *"Your
physique is coming along."* and *"Your body fat is hiding the bar position."*

⚠ **Reuse it; do not retype it.** Extract it to a shared module and have both callers import it. A second
hand-copied regex that drifts from the first is precisely the failure `0190`/`0187` produced in SQL.

Also forbidden, beyond the regex:

- Any comparison against **another athlete**. Preflight Gates §2.4 makes other people's data RED, and the
  Performance Firewall holds everywhere except Squad-internal surfaces.
- Any statement about **health, recovery capacity, injury risk or symptoms** — `medical-routing.ts` already
  stops these and its jurisdiction is unchanged here.

---

## 7. Age

**No age gate is required, and that is worth stating explicitly**, because it is the clearest evidence this
design is the safe version of the PO's question. Set counts and dates are not body data. A 15-year-old being
told they have not trained calves in eight weeks is an ordinary training observation. The same athlete being
asked for a physique photo is not. That distinction is the entire point of this document.

---

## 8. Tests required

Pure domain, `node --test`, in `src/domain/coach/__tests__/training-gaps.test.mjs`:

1. G1 fires on a muscle with zero primary sets; does NOT fire on one with a single set (absence ≠ scarcity).
2. G2 is purely relative — the same log scaled by a constant produces identical gaps.
3. G3 does not fire on a lift with fewer than the minimum sets to trend, and never on sets above 10 reps.
4. G4 distinguishes "dropped" from "never trained" — they are different sentences.
5. A cold-start athlete with **no logged sessions** reports NO gaps and says so. ⚠ This is the case that
   crashed the first cut of `recommend.ts`; a gap engine with no data must refuse, not invent.
6. The shared appearance filter drops every string in the existing form-check corpus.
7. Every gap that offers an action offers a valid `FocusMuscle`, asserted against `FOCUS_SPEC`'s own keys.
8. G3 offers no action (TG-D3).

---

## Decisions required

| # | Decision | Resolution |
|---|---|---|
| **TG-D1** | Absolute volume standard, or relative-to-self only? | 🔒 **B — RELATIVE ONLY** (PO, 2026-09-22). No new authored health-adjacent standard. Holt compares the athlete only against themselves |
| **TG-D2** | Answer-on-ask only, or also a nudge? | 🔒 **ASK ONLY** (PO, 2026-09-22). Never volunteered. `nudges.ts` is explicitly not a delivery channel for v1 |
| **TG-D3** | Does a stalled lift (G3) offer an action? | 🔒 **NO** (PO, 2026-09-22). G3 reports the observation and stops |
| **TG-D4** | Premium AI, or free? | ⏳ **DEFERRED TO SHIP.** Build it UNGATED — the engine makes no model call, so nothing forces a tier. Gating it later is one condition at the call site, not a rewrite. The pricing answer is not needed to implement |

---

## What this document does NOT authorise

Reading a photograph of an athlete's body, for any purpose, under any framing. That remains blocked in code,
and this document is the alternative to it rather than a step toward it.
