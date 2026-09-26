# Nutrition Architecture — Amendment 005: Holt sets up your targets (by filling in the Targets screen)

**Status:** 🔒 LOCKED — PO, 2026-09-25 (*"I agree with you … 3. Yes."*)
**Amends:** `Nutrition-Architecture-Amendment-001-Holt-Nutrition-Scope.md` **NUT-A1-D3** · `…-002` **NUT-A2-D1**
(the line *"Holt still does not set calorie or macro targets, which remain the Targets screen's job"*) ·
`Coach-AI-Amendment-001` **CA-D10**, narrowed for this one path only.
**Reads with:** `Holt-Kitchen-Mode-v1.0.md` §4 (K4, K5) · `Nutrition-Architecture-v1.0` §7 (Targets), NUT-D4, NUT-D5 ·
`Coach-Holt-Everywhere-v1.0.md` rules 1–5 · `src/domain/nutrition/targets.ts` (`recommend`, `blockerFor`, floors).

PO, 2026-09-25: *"you can tell him what your lifestyle is like and what the goal is and he can come up with
macros for you."*

---

## Decisions

### NUT-A5-D1 — Holt may run the target setup in conversation

*"I sit at a desk, lift 4 days a week, want to lose 10 lb by spring"* is **in scope**. Holt asks for whatever
the Targets screen still needs, one or two questions at a time, and ends on a confirm card. He is **a second way
to fill in the Targets screen, not a second source of targets.** Explaining a target (*"why is my target
2,610?"*) and proposing a change (*"lose a bit faster"*) go through the same path.

### NUT-A5-D2 — ⚠ His output is the screen's INPUTS, never its result (NUT-D4, unchanged)

The action is `set_targets_inputs`, and its fields are exactly `AthleteFacts` + goal + rate:
`activity`, `goal` (`lose | maintain | gain`), `rate` (one of the screen's own options), and `birthYear` /
`heightIn` / `weightLb` **only when the athlete said them**.

- **Facts the athlete states are transcribed, not invented.** *"5'10, 182"* becomes `heightIn: 70` and
  `weightLb: 182`. The confirm card shows each one back (*"Height 5 ft 10 · from what you said"*) so a
  misheard number is caught before it counts. Anything the athlete didn't say comes from their profile and
  weigh-ins, or Holt asks for it. He never estimates a height or weight.
- **The app discards** any kcal, gram or percentage the model emits. There are no such fields.

### NUT-A5-D3 — The app computes, with every existing guard

The card's numbers come from `recommend()`, the same code the Targets screen runs: Mifflin-St Jeor,
the NUT-D5 floors, the under-18 gate (`blockerFor`), and the 1%-a-week cap. **Use these targets** writes through
the Targets screen's save path, so a target set by Holt is identical to one set by hand and editable there.
Every clamp is named on the card in the screen's own words (`heldLine`).

### NUT-A5-D4 — Holt explains, and never argues a guard down

Holt writes the words around the card: what he used, why the rate was held, what to expect. *"Set my target
to 1,100"* gets the floor explained and the card showing the floor. It is never a lower number. The athlete can
still set a manual target on the Targets screen, where NUT-D5's plain warning applies. Holt doesn't offer that
route for a number under the floor.

### NUT-A5-D5 — Stops run first (NUT-A2-D4, unchanged)

Under 18, any medical condition or medication, pregnancy or breastfeeding, disordered-eating signals, and
"as low as possible" all stop **before** the interview starts, in code, with the standard response. No card,
no credit spent.

### NUT-A5-D6 — What still stands from NUT-A1-D3

Holt still does **not** tell anyone *"eat 180 g of protein"* in prose, does not prescribe supplements, and does
not prescribe a diet. The only targets he can bring about are the ones this path computes and the athlete
accepts. Totals he quotes are rendered by the app (NUT-A2-D2 pattern).

### NUT-A5-D7 — Premium AI only, inside the Nutrition allowlist

`coach_ai` (0203), metered by `coach_ai_spend_credits`, and inside the Nutrition preview allowlist (0206) like
every Holt nutrition job.

---

## Reconciliation

| # | Document | Change | State |
|---|---|---|---|
| 1 | `Nutrition-Architecture-Amendment-001` NUT-A1-D3 | Banner: target setup via NUT-A5 | ✅ 2026-09-25 |
| 2 | `Nutrition-Architecture-Amendment-002` NUT-A2-D1 | Banner on the "does not set targets" line | ✅ 2026-09-25 |
| 3 | `Coach-AI-Amendment-001` CA-D10 | Banner: target setup in scope per this doc | ⏳ with the build |
| 4 | Holt's system prompt | "does not prescribe calorie targets" → "sets targets only through `set_targets_inputs`" | ⏳ with the build |
| 5 | Eval | Zero model-written numbers on the card across the Kitchen eval; every NUT-A2-D4 stop fires before the interview | ⏳ with the build |

## Revision history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-09-25 | Created and LOCKED. NUT-A5-D1…D7. |
