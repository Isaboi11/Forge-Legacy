# Nutrition Architecture Amendment 006 — Holt looks up a food, and makes an order one meal

**Status:** BUILT 2026-10-01 on PO direction (HF-D1…HF-D6), branch `feat/holt-food-lookup` (one commit, `095d8bf6`,
never merged). **RE-APPLIED 2026-11-18** onto today's tree in AI Road to 10 Sprint 4a (branch `ai/s4a-meal`, lane B;
PO decision 5: merge it into describe-a-meal). NOT DEPLOYED until `coach-ask` is redeployed and the app is published.
**Date:** 2026-10-01 · port 2026-11-18
**Owner:** Product
**Amends:** `Coach-AI-Amendment-002` (Holt's recipe rule *"the only numbers you quote are the recipe book's"*) and
the `coach-ask` prompt line that told him to refuse a restaurant item's numbers. **NUT-D4 is unchanged:** every
number still comes from the app's food data or the app's own multiplication, never from the model.
**Governs (since the port):** `src/domain/coach/ask-food-tools.ts` (`get_foods`, `log_food`, `propose_meal`,
`checkFoodAction`, `FOOD_PROMPT` — import-free, registered by `supabase/functions/coach-ask` only for an app that sends
caps `actions_v1`), `src/domain/nutrition/holt-meal.ts` (the card's numbers, `mealCard` → the shared action card),
`src/data/holt-meal-live.ts` (Log / Save and Undo), `src/components/forge/HoltActionCard.tsx` (the card's look — it
replaces 095d8bf6's `MealCardView`), `src/domain/coach/kitchen.ts` (`FOOD_MACROS`).

## The port (2026-11-18, Sprint 4a) — what changed from 095d8bf6

- The tools moved out of `ask-tools.ts` into `ask-food-tools.ts`, offered only behind the caps flag (contract §1.1), so
  an old phone never hears "tap Log on the card" with no card under it. `get_foods` calls `food-search` itself, as the
  athlete (HF-D1 unchanged).
- **New action `log_food(meal?, items)`** — "log 2 eggs and toast": each food its OWN diary row, at the slot the athlete
  named or the one for the hour. Same HF-D4 key check, same HF-D5 block, numbers from `portionMacros`.
- `propose_meal`'s card is the shared action card: **Log it** (one diary row under its name, HF-D3) is the Confirm,
  **Save as a meal** the second write. Every write has an Undo that removes exactly what it wrote (holtai-08's rule).
- The chat's own `meal` turn and its end-of-chat summary note were not ported: the card is Sprint 4a's shared
  `HoltActionCard` (lane C) and its holding rule (contract §1.3).

---

## Why

PO, 2026-10-01, in the kitchen chat: *"I got a Costa Vida salad with chicken. It will have 4oz of red sauce and 4 oz
of their ranch. Find the macros for me and make it a meal or recipe to log just as one whole thing called 'costa
Vida chicken salad'."* Holt answered that he couldn't pull a restaurant's macros and told the athlete to build it
themselves. A "Set my macros" door (their daily targets) went under the answer. PO: *"Why not? I thought he could
look it up."*

He couldn't. Holt had no tool that reached the food database. The logger's search (USDA plus FatSecret
restaurants, live since 09-24) was the athlete's only way in.

## Decisions

### HF-D1 — Holt searches the same database the athlete logs from.

`get_foods(query)` calls `food-search` as the athlete (their JWT), so it runs behind the same `has_nutrition_access()`
gate and spends the same vendor quota as typing in Log Food. It is a read, named `get_*` like his other reads.

### HF-D2 — He may quote what it returns, as returned.

A result's calories and macros for its named serving are the app's numbers, the same standing as the recipe book's.
He never adds foods up, scales a serving to the athlete's amount, or estimates a total.

### HF-D3 — An order becomes one meal through a card, not through his words.

`propose_meal(name, items[{key, amount?, unit?}])` is an action. The app shows a card with each food, its amount,
and the app's totals, made by `portionMacros`. **Save as a meal** writes the meal editor's own rows to My foods &
meals. **Log it** writes the order as ONE diary row under its name (the PO asked for "one whole thing"). Nothing
is written until the athlete taps.

### HF-D4 — Only foods he actually found, sent whole.

Every key on a meal must be one that `get_foods` returned in the same message. Otherwise `coach-ask` refuses the
action and the model is told to search first. A key from the model's memory could open a real but different food.
The foods go to the device as `food-search` returned them. The model sends only the athlete's amount (oz, g or a
count of the food's own servings).

### HF-D5 — A food nobody weighed blocks the card.

If a food's only serving has no weight, it can't be counted. It is named on the card and Save / Log stay off. A
meal missing its dressing would otherwise log light without saying so. The FatSecret credit line shows whenever a
FatSecret food is on the card (licence term).

### HF-D6 — The macros OF a food are not the athlete's macro targets.

"Find the macros", "how many calories are in", and "macros for a burrito" no longer put the "Set my macros" door
under the answer. "Set my macros", "macros for a cut" and "how many calories should I eat" still do.

## Not decided here

Reading a restaurant's own nutrition web page when the database lacks the item. That would mean the model copying
numbers off a page, which NUT-D4 does not allow today. It is the PO's call.
