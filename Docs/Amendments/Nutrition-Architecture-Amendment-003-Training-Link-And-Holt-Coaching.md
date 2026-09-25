# Nutrition Architecture — Amendment 003: Training link and Holt as a food coach

**Status:** 🔒 LOCKED — PO, 2026-09-24 (in chat, from phone)
**Amends:** `Nutrition-Architecture-v1.0.md` Phase 2 (training-day targets) and Phase 4 (Holt nutrition)
**Related:** `Nutrition-Architecture-Amendment-001-Holt-Nutrition-Scope.md` (Holt reads the diary: facts, not
verdicts) · `Nutrition-Architecture-Amendment-002-Holt-Builds-Meal-Plans.md` (written, NOT locked)

---

## Decisions

**NUT-A3-D1 — Home shows one food line under today's training.** Something like *"1,420 of 2,400 cal ·
60 g protein to go"*. Tapping it opens Nutrition. Only for athletes with Nutrition access and a target. No
line appears otherwise (never a zero, never a nag).

**NUT-A3-D2 — No separate training-day targets. Phase 2's "training-day variant" is withdrawn.** PO: *"we
put in the recommended macros how much I workout so it should calculate in there."* The recommended target
already accounts for training volume through the activity level. The one training-aware exception is a
Holt line: **"carb up" guidance before a race** (D3), not a changed target.

**NUT-A3-D3 — Holt notices patterns and says so.** Facts, never verdicts (Amendment 001). Examples: *"Protein
was under target on 3 of your 4 lift days this week."* and, ahead of a race on the plan, *"Race Saturday: make
Thursday and Friday carb-heavy."* It goes through the existing nudge budget.

**NUT-A3-D4 — Athletes can tell Holt their preferences, and Holt keeps them.** Typed in plain words, for
example *"remind me at 3 every day where I'm at with my numbers and macros so I can keep up."* Holt sets it
up, confirms it back, and sends it at that time as **a coach would**: the numbers plus one human line that
fits the day (a lift day, a light day, a good streak), not a bare readout. Preferences can be listed,
changed and turned off from the same chat.

## Guardrails (not negotiable)

- **Safety comes first.** Holt's four stress-test safety fixes (Decision Queue #36) and the under-eating
  care response ship **before** D3 or D4. A reminder never pushes someone to eat less, never praises a very
  low day, and follows the medical stop rules (conditions, pregnancy, symptoms).
- **Private.** A reminder's push text shows on a lock screen. The default push is *"Your 3 pm check-in from
  Holt"*; numbers appear only inside the app unless the athlete asks for them in the notification.
- **The model never writes a number** (NUT-D4). Totals come from the diary; Holt writes only the words
  around them.
- **Cost:** D4 messages are Premium AI (credits). Typed chat is already Premium-AI-only.

## Build order

1. D1 Home food line (no design needed, no new build)
2. Safety fixes + under-eating response (already required before opening Nutrition)
3. D3 pattern and race notes
4. D4 typed preferences → scheduled coach check-ins (a server job plus the existing push path)
