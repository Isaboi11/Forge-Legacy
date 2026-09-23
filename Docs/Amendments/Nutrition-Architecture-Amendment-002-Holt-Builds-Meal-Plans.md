# Nutrition Architecture — Amendment 002: Holt builds meal plans

**Amends:** `Nutrition-Architecture-Amendment-001-Holt-Nutrition-Scope.md` **NUT-A1-D3** (partly superseded
— see NUT-A2-D1) · `Coach-AI-Amendment-001` **CA-D10** ("does not prescribe diets", narrowed for meal plans only).
**Reads with:** `Nutrition-Architecture-v1.0.md` NUT-D4, NUT-D5, NUT-D6, §6 (meal-plan pipeline), §10
(safety), §12 Phase 4 · `domain/coach/medical-routing.ts` · `Coach-Holt-Stress-Test-2026-09-21.md`
(Decision Queue #36).
**Status:** ⏳ **PROPOSED, NOT LOCKED.** Needs the PO's lock. Nothing in it is built.
**Trigger:** PO, 2026-09-23, asked to *"Unlock Holt meal plans"* the same day NUT-A1-D3 was locked.

---

## The one-line version

Holt may **build** you a meal plan from what you tell him. He still never **writes a number**. The
planner (§6 steps 1–6) picks every recipe, portion and total against **your own** target, with the same
floors as today. Holt turns your words into the planner's settings and explains the result in one line.

---

## Why this is smaller than it sounds

The base architecture already planned it. `Nutrition-Architecture-v1.0` §6 step 7 is *"model, Premium AI:
parse 'no fish, quicker lunches' / 'I have chicken, eggs and rice' into a constraint patch → re-run 1–6;
write the one-line explanation."* NUT-A1-D3 closed that door the morning it was locked. This reopens
that one door and no others.

---

## The decisions

### NUT-A2-D1 — Holt may build, change and explain a meal plan

In Holt's chat, *"make me a week of meals"*, *"no fish, quicker lunches"* and *"I've got chicken, eggs and
rice"* are **in scope**. Holt turns them into a **constraint patch**: diet, allergens, dislikes, time
cap, household, pantry items, slots to swap. The planner re-runs. He shows the plan and says what he
changed in one line.

**This supersedes NUT-A1-D3 only for meal plans.** Everything else in D3 stands. Holt still does not set
calorie or macro targets, which remain the Targets screen's job. He still does not prescribe
supplements, and he still does not say *"eat 180 g of protein"*.

### NUT-A2-D2 — ⚠ Every number comes from the planner, never the model (NUT-D4, unchanged)

The patch is **structure only**: tags, ids, booleans, slot references. It carries no kcal, gram, portion
or price. The app **discards** any number the model emits in a patch, as §6 already specifies. Totals
Holt quotes in prose are **rendered by the app from the solved plan**, not typed by the model.

The Phase 4 exit test stands: **zero model-written numbers** across an eval set.

### NUT-A2-D3 — The plan is built against the athlete's OWN target, or not at all

The planner fits the plan to the target in force (`fetchTargetsOn`), which NUT-D5's floors already
bound. **No target set means no plan.** Holt points the athlete at the Targets screen. He never makes
up a calorie number to plan against. So a plan can never go under a floor, because its input can't.

### NUT-A2-D4 — ⛔ Hard stops, enforced in code before the model sees the request

Holt **does not build a plan**, and says so plainly with a pointer to a professional, when:

| Stop | Source |
|---|---|
| The athlete is **under 18** | NUT-D5 — no recommended targets under 18, so no plan built on one |
| Any **medical diet or condition**: diabetes, kidney, heart, blood pressure, pregnancy, postpartum, breastfeeding, an eating disorder, "my doctor/dietitian said…", GLP-1 or other medication | `medical-routing.ts` + the PO's 2026-09-22 legal-caution rule |
| Any `DISORDERED_EATING` match in the conversation | `medical-routing.ts`, unchanged |
| A request for a plan **below the target** or "as low as possible" | NUT-D5; the Targets screen is the only door to a lower number |
| A **supplement, drug or caffeine amount** | legal-caution rule, unchanged |

These are code, not prompt, for the reason the 09-22 rule was written: the live model ignored a prompt
line and reassured about a symptom.

### NUT-A2-D5 — Allergens: the library, never the model (NUT-D6, unchanged)

A plan draws **only** from Forge-tagged recipes and the athlete's own tagged recipes. An allergen the
athlete names is a hard filter at step 1, and **unknown allergen status counts as excluded**. The model
cannot re-admit a recipe. Every plan carries the "check labels" line.

### NUT-A2-D6 — Premium AI only, PO-only until launch

`coach_ai` (0203), like every other Holt AI job, and inside the Nutrition preview allowlist (0206).
Output cap: a build turn's 500 tokens (CA-D6).

---

## ⛔ What must be true BEFORE this is built

This amendment can be locked now, but it **cannot be built yet**:

1. **The planner exists** (§6 steps 1–6, Phase 3). Holt drives it; he doesn't replace it. That needs the
   Meal Plan and Grocery List **screens designed first** (PO 2026-09-23: design before build), and the
   **recipe library**: 150–250 tagged recipes, the long pole.
2. **Decision Queue #36 is closed**: the four live Holt safety defects from the 09-21 stress test. §12
   Phase 4 names this as a precondition, and giving Holt more reach doesn't change that.
3. **The sustained under-eating rule** (`Nutrition-Stress-Test-2026-09-23.md` §3.3) exists in the app.
   Holt planning meals for someone whose diary has read 800 kcal for a fortnight is the failure this
   amendment would otherwise create.

---

## Open for the PO

| # | Question | Default if not answered |
|---|---|---|
| 1 | May Holt **suggest** a snack when a day can't fit (*"Tuesday is 140 short — add yogurt?"*)? | Yes. The planner found the gap, and Holt only names it |
| 2 | A plan Holt builds: saved straight away, or shown as a draft to accept? | **Draft to accept**, like program edits (CA-D12) |

---

## Application (on lock)

| # | Surface | Change |
|---|---|---|
| 1 | `Nutrition-Architecture-Amendment-001` NUT-A1-D3 | Banner: meal plans superseded by NUT-A2-D1 |
| 2 | `Coach-AI-Amendment-001` CA-D10 | Banner: meal plans in scope per this doc |
| 3 | Holt's system prompt | Meal-plan tool described; "does not prescribe diets" narrowed to targets, supplements and medical diets |
| 4 | `medical-routing.ts` | NUT-A2-D4 stops, each with tests + a benign-corpus false-stop count |
| 5 | `Nutrition-Architecture-v1.0` §12 Phase 4 | Row points here |

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-09-23 | Proposed. NUT-A2-D1…D6. Not locked. |
