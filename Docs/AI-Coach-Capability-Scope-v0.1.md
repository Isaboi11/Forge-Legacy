# Coach AI — Capability Scope (Phase D)

## v0.1 | August 2026 · DRAFT — NOT LOCKED

**Status:** DRAFT. Scopes *what the Coach AI does*, to be built in **Phase D** of the locked pricing plan.

**This document has no authority over pricing, tiers, metering, or economics.** All of that is settled in
the **Pricing Structure & Monetization Build Plan** (`~/.claude/plans/i-need-to-figure-reflective-hellman.md`,
locked 2026-08-12, summarized in `Forge-Legacy-Master-Status.md` § Recently Completed 0). Where this
document and that plan disagree, **the plan wins**. This one only answers: *given that Coach AI is a
$9.99/mo add-on metered at 150 credits, what exactly does it do?*

**Read first:** the pricing plan above · `Docs/Coach-Chat-Design-Brief-v1.0.md` (the surface) ·
`Docs/Amendments/Monetization-Architecture-Amendment-001.md` (LOCKED, pending Amendment 003).

---

## §0 — Settled elsewhere; not re-litigated here

Recorded so nobody re-opens them from this document:

| Decision | Where |
|---|---|
| Coach AI is a **$9.99/mo · $89.99/yr add-on requiring Premium** | Plan § *The structure* |
| **Model: `claude-sonnet-5`**, rulebook system prompt cached | Plan § Economics, § Phase D |
| **Metered in credits, not per-feature counters** — 150/month | Plan § Coach AI |
| Credit weights: message 1 · program/day 1 · photo read 3 · form check 6 | Plan § Coach AI |
| Photo coaching **ships**, under four binding rules, **18+** | Plan § *Photo reads* |
| Form check = **8–20 sampled frames**, not a video upload | Plan § Coach AI |
| Edge Function holds the key; engine stays client-side | Plan § Phase D · Brief §10 |
| Amendment 003 authorizes the add-on tier | Plan § *Document amendments required* |

---

## §1 — The capability map

Everything below is one credit unless noted. Weights are the plan's, not this document's.

### Tier A — the four capabilities the plan already names

| # | Capability | Credits | Notes |
|---|---|---|---|
| A1 | **Talk to Holt in plain English** | 1 | The unbuilt Edge Function. Replaces `interpret()` at `chat-core.ts:432` |
| A2 | **Programs from a description** | 1 | Model parses intent → `assemble()` builds. *"The engine still builds the program"* |
| A3 | **In-depth single days** | 1 | Same path, day mode |
| A4 | **Photo coaching** | 3 | Four binding rules — plan § *Photo reads* |
| A5 | **Form check from video** | 6 | Three liability rules — plan § Coach AI |

### Tier B — free to add, and it makes A1–A3 much better

Neither costs an extra call; both are content the app already holds, injected into the cached prompt.

| # | Capability | Why it's near-free |
|---|---|---|
| B1 | **Exercise questions and tips** | **735 published coaching records already exist** in `src/domain/exercise-coaching/content/coaching_content.json`. Retrieve, don't generate. Brief §5.8: the card is *"a pointer into the real exercise page, not a re-write of it."* Generating what you already authored is slower, costlier, and less accurate |
| B2 | **"Why does my plan look like this?"** | `rulebook/rationale.ts` already records the reasons. The model narrates authored text — zero hallucination surface |

### Tier C — the differentiator, and it is not chat

**Holt reads no database at all.** `src/domain/coach` is pure functions over a rulebook — this is recorded
in the dashboard as *"Holt learns NOTHING."* Migration **0138 already captures** swaps and intensity
feedback, and the engine ignores every row of it. A coach that can read what you actually did is a
different product from one that can only take instructions — and the data is already there.

| # | Capability | Reads |
|---|---|---|
| C1 | **"Why has my bench stalled?"** | `lift-history-live.ts` — ⚠ **stored weights are not unit-normalised**; convert before reasoning or the answer is wrong for kg athletes |
| C2 | **"I missed a week — what now?"** | Workout history. Anti-shame is locked (DNA §10) — never scold, never tally what didn't happen |
| C3 | **"Am I ready to add weight?"** | The intensity feedback 0138 captures and today discards |
| C4 | **"You've swapped barbell rows four weeks running"** | Same. Notices what the athlete never asked about |
| C5 | **The training-log read** | Already in the plan: *"You've done four times more pressing than pulling this chapter."* **Impossible for a competitor to copy — none of them hold the history** |

> C5 is already named in the plan as a companion read. C1–C4 are the same mechanism pointed at different
> questions, and they are the strongest argument for the $9.99 that isn't a photo or a video.

### Tier D — things Holt structurally cannot do

Each needs judgment rather than a table lookup, which is exactly why the rulebook can't reach them:

- **The goal that doesn't fit a slot.** *"Look good at my wedding in September and still deadlift 500."*
  Holt needs one goal from ten; a model can negotiate the tradeoff and pick the block.
- **Interpret an imported program.** The importer reads 52 formats and abstains rather than guessing. A
  model can explain what the program is *trying to do* and flag where it fights the athlete's limitations.
- **Triage the vague complaint.** *"My shoulder feels weird"* → not a diagnosis (§2), but a real branch:
  load problem, movement-selection problem, or stop-and-see-someone.
- **Hold the conversation after a refusal.** Holt refuses correctly and stops. A model can explain the
  tradeoff without folding on it.
- **Translate between disciplines.** *"Marathon training but I don't want to lose my squat."* The
  endurance rulebook refuses rather than guesses — correct — but the athlete deserves the *why*.

---

## §2 — Hard limits

The plan's four photo rules and three form-check rules are binding and are not restated here. These are the
additional ones that fall out of the existing codebase:

1. **Anything medical stops.** Already specified (brief §5.9) and already implemented as `isMedical()` /
   `MEDICAL_STOP` in `chat-core.ts`. **The model runs behind that check, never around it.**
2. **Never diagnose from an image.** *"That knee position could be an injury"* is a medical claim. The
   form-check rules already say it observes and never clears; this extends the same wall to photos.
3. **Never present model prose as a prescription.** Brief §0. The engine writes the training; the model
   writes the sentences.
4. **`limitations.ts` is unreviewed.** The dashboard flags it as *"the closest thing to health guidance in
   the app and still unreviewed."* Coach AI reasoning over limitations raises the stakes on that file — it
   should be reviewed **before** Phase D ships, not after.

---

## §3 — Build order within Phase D

| Step | Contents | Why here |
|---|---|---|
| **D1** | Edge Function + `interpret()` swap. A1–A3. Metering and per-athlete cost logging **from the first call** | The whole seam is one function. The plan requires the 60-day metered tester run, so metering cannot be retrofitted |
| **D2** | B1, B2 — retrieval over the 735 records + rationale into the cached prompt | Near-free, and it is what makes Holt feel like he knows things |
| **D3** | C1–C5 — the history read layer | The differentiator. Needs a read layer `domain/coach` has never had |
| **D4** | A4 photo coaching, to the four rules | Cost is settled (~$0.075); the rules are the work |
| **D5** | A5 form check, 8–20 frames | Highest credit weight, highest liability, built last |

**Verify the cache is actually working before trusting any cost number.** The plan requires checking
`usage.cache_read_input_tokens`; if it is zero across repeated calls a silent invalidator is in the system
prompt, and every projection in the plan's economics table is wrong by roughly 10×.

---

## §4 — Open

1. **`limitations.ts` review** — before D1, per §2.4.
2. **Which history the model may read** is a privacy surface P-6 has never been asked about. The dashboard
   raises exactly this under Decision Queue #21 for the help assistant: *"an explicit decision about what
   app context it may read."* Same question, same answer needed.

---

*Authority: the Pricing Structure & Monetization Build Plan (locked 2026-08-12) governs everything
commercial. This document is DRAFT and locks nothing.*
