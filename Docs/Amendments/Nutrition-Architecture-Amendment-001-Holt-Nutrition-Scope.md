# Nutrition Architecture — Amendment 001: Holt's nutrition scope

**Amends:** `Nutrition-Architecture-v1.0.md` §13 row 9 ("Coach-AI amendment — Holt's nutrition scope —
☐ before Phase 4") and the *"Still owed"* note at §2.
**Reads with:** `Coach-AI-Amendment-001-Conversations-Memory-And-Cost.md` CA-D10 (Capability Scope),
`Coach-Holt-Stress-Test-2026-09-21.md`, `domain/coach/medical-routing.ts`.
**Status:** 🔒 LOCKED 2026-09-23 by the PO.
**Trigger:** PO, 2026-09-23 — *"Holt can say facts and reviews. Totally fine to do that."*

---

## Why this was owed

`Nutrition-Architecture-v1.0` §13 row 9 has carried an open box since the architecture was written: Holt
had no defined relationship to the food diary, and Phase 4 could not start without one. The architecture
also flagged the tension it had to resolve — `Coach-AI-Amendment-001` CA-D10 says Holt
*"does not prescribe diets or supplements."*

**The tension turned out to be smaller than it looked.** CA-D10 already places **"general nutrition"**
inside Holt's scope. What was never settled was not *what he may say* — it was **what he may read**.

---

## The decisions

### NUT-A1-D1 — Holt may READ the athlete's own diary

A short, deterministic summary of the athlete's logged food is attached to his context: the last seven
days' average, how many days were logged, the target in force, days in range, average macros, and
today's running total.

⚠ **It is built on the DEVICE** (`domain/nutrition/holt-summary.ts` → `data/holt-nutrition-live.ts`),
like the training summary, so no Edge Function changes and no new server capability.

⚠ **`0206` remains the gate.** The allowlist lives inside the RLS of all seven nutrition tables, so an
athlete who cannot reach Nutrition reads nothing and the summary is null. The caller never has to
remember to check.

### NUT-A1-D2 — He may state those facts, and review them

Stating what the diary says, and commenting on it as a coach, is **in scope**. *"You averaged 2,320 a
day and your target is 2,500 — you're under most days"* is a review of a fact, not a prescription.

### NUT-A1-D3 — He still may not prescribe a diet, and CA-D10 is unchanged

No meal plans, no *"eat 180 g of protein"*, no supplement or macro prescriptions, no calorie targets.
**Targets are the Targets screen's job**, where NUT-D5's floors are enforced in code. Holt pointing an
athlete at that screen is the correct move and the only one available to him.

### NUT-A1-D4 — ⚠ The context carries NO judgement

The summary is counted values and nothing else. It never says "low", "under-eating", or "concerning".

**This is a deliberate safety property, not a style choice.** A pre-formed verdict in the context is a
prescription written by the app and voiced by the model — it would launder a judgement nobody reviewed
through a coach the athlete trusts. He reads numbers and answers for himself, which is the only form in
which the existing guards can still catch him.

### NUT-A1-D5 — It rides only on a nutrition question

CA-D5, "only what the job needs". `isNutritionQuestion()` gates it, exactly as `isTrainingQuestion()`
gates the training summary. An ordinary question pays neither the read nor the tokens.

⚠ The matcher is deliberately narrowed: *"cut"* and *"fat"* are training words too (*"cut the last
set"*, *"fat grip bar"*), and a bare keyword match would attach the diary to a question about rest times.

### NUT-A1-D6 — Every existing medical and disordered-eating stop applies UNCHANGED

`medical-routing.ts` — `DISORDERED_EATING`, `SEEKING_ADVICE`, the medical stops, and the PO's
2026-09-22 legal-caution rule — all run **before** any of this. Giving Holt sight of intake **raises**
their importance; it does not soften one of them.

---

## What is NOT in this amendment

| | Why |
|---|---|
| **Holt's line in the WEEKLY REVIEW** | That note is generated **server-side** by `ensure_weekly_review()` and frozen on first read. Changing it means rewriting a SQL function, which this project does not do casually. The weekly review screen **already** carries a deterministic **Food** section (average, days in range, the gap line) built from the diary — facts, no model. Holt's own line mentioning food is a later pass. |
| **Plan patches, pantry-awareness, photo logging** | Phase 4 proper. Unchanged and unstarted. |
| **Any change to Holt's system prompt** | Not needed. It already says he does not prescribe diets or calorie targets, which is exactly NUT-A1-D3. |

---

## ⚠ Open safety item this amendment does NOT close

The nutrition tab still has **no response to sustained under-eating**. `medical-routing.ts` stops the
*sentence* "I eat 800 calories a day" in Holt's chat; nothing reacts to the same thing being **logged**
for a fortnight. Nutrition Details will describe it in neutral analytics language and the Targets screen
will offer a deficit on top of it.

Holt is **not** the fix: he is Premium AI only, and a safety floor that half the athletes cannot afford
is not a floor. This needs a deterministic rule in the app. Recorded in
`Docs/Nutrition-Stress-Test-2026-09-23.md` §3.3 and **still open**.

---

## Application

| # | Surface | Change | Status |
|---|---|---|---|
| 1 | `domain/nutrition/holt-summary.ts` | `isNutritionQuestion` + `summariseNutrition` | ✅ new, 12 tests |
| 2 | `data/holt-nutrition-live.ts` | `fetchNutritionSummary()` | ✅ new |
| 3 | `domain/coach/ask-wire.ts` | `nutrition` on the wire + the user turn | ✅ |
| 4 | `domain/coach/ask-context.ts` | attach on a nutrition question only | ✅ |
| 5 | `data/holt-training-live.ts` | `askBriefLive` returns it | ✅ |
| 6 | `components/forge/CoachChatSheet.tsx` | passes it | ✅ |
| 7 | `Nutrition-Architecture-v1.0.md` §13 row 9 | mark settled → this doc | ☐ |
| 8 | Holt's system prompt | none needed (NUT-A1-D3) | ✅ n/a |

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-09-23 | Created and LOCKED. NUT-A1-D1…D6. |
