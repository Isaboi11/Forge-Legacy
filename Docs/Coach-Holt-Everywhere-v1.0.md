# Coach Holt, Everywhere: one chat that can use the whole app. Direction v1.0

**Status:** DIRECTION, from the PO 2026-09-24 (phone). Not built. Premium AI (typing is already Premium-AI-only).
**PO:** *"Coach Holt should be able to do all of that through the typing feature as if I were talking to
Claude and ChatGPT but in his voice. Everything on the app should be able to use AI like that, realistically."*
**Builds on what exists:** `coach-interpret` already turns typed words into program edits (swap, sets,
skip, structure, build a program, race plans) with a confirm step (`edit-intent.ts`, `edit-ops.ts`).
`coach-ask` answers questions with the athlete's training summary; `holt_notes` (0204) remembers facts.
This extends **the same pattern** (words → a checked action → confirm → done) to every area of the app.

---

## 1. The five rules (every Holt action, in every area)

1. **Holt picks from a fixed menu of actions; the app does the action.** The model returns a named action
   with typed fields (for example `plan_week {days: 7, style: "quick lunches"}`). Code validates every field.
   Anything not on the menu gets an answer in words, never an improvised change.
2. **You see it before it happens.** Every change shows as a confirm card in the chat (*"Swap Tuesday's
   dinner for the Greek chicken bowl?"* **Do it · Change · Cancel**), and **Undo** afterwards. Reading
   and answering need no confirm.
3. **The model never writes a number** (NUT-D4, and the same for weights and reps). Calories, macros,
   prices, loads and targets come from the app's own maths; Holt writes the words around them.
4. **Nothing reaches another person without your tap.** Holt can DRAFT a squad post or a message; only
   the athlete sends it. Privacy settings are never changed by Holt without a confirm card.
5. **Safety runs first, in code.** `medicalRoute` before any model call; the four stress-test fixes and the
   under-eating response ship before any new area opens; floors and the under-18 rules can't be
   talked past ("set my target to 1,000" → Holt explains the floor, the app refuses).

## 2. What Holt can do, area by area

| Area | You say | Holt does | Status |
|---|---|---|---|
| **Programs** | "swap squats for leg press on Tuesday", "build me a 4-day split" | edits or builds, with a confirm | ✅ built |
| **Workout** | "what should I lift today?", "why did you say 35?" | answers from your history | ✅ built (asks) |
| **Food logging** | "I had two eggs, toast and a coffee" | matches each food, shows the numbers, **Log it** | new |
| **What can I make** | "I have chicken, rice, spinach" | 3 varied options → log or save | scoped (`Holt-Kitchen-Scope-v1.0`) |
| **Meal plan** | "plan my week, quick lunches, no fish" | sets the planner's options and re-runs it; swaps a meal | Amendment 002 (see §4) |
| **Groceries** | "add milk", "what's left to buy?", "cheapest way to cover this week?" | edits the list; answers from the list and prices | new |
| **Recipes** | "save this", "make it dairy-free" | saves to My Recipes; re-writes with numbers recomputed | new |
| **Targets** | "why is my target 2,610?", "I want to lose a bit faster" | explains; proposes a change inside the floors, with a confirm | new (floors in code) |
| **Reminders** | "remind me at 3 where I'm at" | sets a check-in (push) | scoped (`Coach-Holt-Check-ins-Scope-v1.0`) |
| **Goals** | "set a goal to bench 225 by March" | drafts the goal, with a confirm | new |
| **Progress / Legacy** | "how's my bench trending?", "sum up this chapter" | answers from the record | partly built (training summary) |
| **Squads** | "post today's workout to my squad" | drafts the post; **you** send it | new (rule 4) |
| **Settings** | "turn off squad notifications", "switch to kg" | changes it with a confirm | new |

## 3. How it's built (one engine, not ten)

- **One action catalogue** in `src/domain/coach/`, each action with its fields, its validator, its confirm
  text and its executor (the same functions the screens already call). Adding an area = adding catalogue
  entries, not a new chatbot.
- **One routing step.** `coach-interpret` gains the catalogue as structured tools and picks the action.
  Kitchen (`coach-kitchen`) and plan-building stay separate functions because they produce content, and
  the router calls them.
- **Context on demand.** Each action declares what it needs (today's food, the week's plan, the grocery
  list, recent lifts), so a message carries only that. It keeps cost down and follows P6-A2-D7: only what the
  question needs, never name or photos.
- **One voice.** Every reply goes through Holt's register and wording rules (`rulebook/`), so he sounds
  like him in every area. No area gets a generic assistant voice.
- **Cost:** most actions are one small call (~0.2–0.5¢). Content (recipes, plans) is ~1–2¢. All are metered by
  `coach_ai_spend_credits`.

## 4. Decisions this settles and opens

- **Holt's Kitchen:** the four picks are LOCKED (PO: "Perfect"). Premium AI only · Holt's chat AND a *What can
  I make?* button on Nutrition · 3 options · 30-day memory.
- **Amendment 002 (Holt builds meal plans):** the PO's direction here ("the same with planning a week or
  groceries") matches 002's substance. **⏳ Needs one explicit "lock 002"** before it's marked locked,
  because 002 also narrows CA-D10 ("does not prescribe diets").

## 5. Order

1. The safety prerequisites (the four fixes + under-eating response)
2. The action catalogue + confirm cards + Undo, moving today's program edits onto it with no behaviour change
3. Nutrition: food logging by words → Kitchen → meal plan (after the 002 lock) → groceries → recipes → targets
4. Reminders (the check-ins scope) → goals → settings → squad drafts
