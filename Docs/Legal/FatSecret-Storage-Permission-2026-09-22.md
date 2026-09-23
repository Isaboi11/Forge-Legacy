# FatSecret — Written Permission to Store Diary Nutrition

**Received:** 2026-09-22, by email to Isaiah Altamirano (PO), in reply to a question sent through
https://platform.fatsecret.com/contact on 2026-09-21.
**From:** James, fatsecret Platform
**Tier:** ⚠ **Basic (free), confirmed 2026-09-23 at key signup — NOT Premier Free.** The question below
said "we're a startup using Premier Free" and James answered in those terms, so this file previously
recorded Premier Free as fact. It was the PO's own framing, never a confirmation: Premier Free is a
separate application with revenue verification, and we have not filed one. The key we hold is Basic —
5,000 calls/day, attribution required. **The permission itself is unaffected** — attribution is a
condition of both tiers, and nothing below turns on which one we are on.
**Governs:** `Nutrition-Architecture-v1.0.md` §4 (FatSecret row) and §13 row 7

## The question (as sent)

> Hi, we're a startup using Premier Free. When a user logs a food, can we permanently store its calories
> and macros in their food diary? Thanks.

## The reply (verbatim)

> Hi Isaiah,
>
> Thank you for reaching out.
>
> Yes, you are permitted to store the calorie and macro information for items from our database in your
> user's personal food diary.
>
> Please ensure that you continue to comply with the attribution requirements associated with the Premier
> Free tier as you build out your application.
>
> Let us know if you have any further questions as you continue your development!
>
> Kind regards,
> James

## What it permits, and what it does not

- ✅ A `food_log_entries` row sourced from FatSecret may keep its **calories and macros** permanently.
- ⚠ The permission names **calories and macros only**. Micronutrients (fiber, sugar, sodium, vitamins)
  are not named, so they are stored under the standard 24-hour rule: re-read by `food_id` when shown.
  If we want them kept too, ask James first.
- ⚠ The permission covers the **athlete's personal diary** only. Search results, food detail, and any
  shared or catalogue-wide copy still follow the storable-data guide (IDs only past 24h).
- ⚠ **Attribution is a condition.** "Powered by fatsecret" must appear wherever FatSecret data is shown
  (https://platform.fatsecret.com/attribution).
- Keep the original email in the PO's inbox. This file is the project's record of it.
