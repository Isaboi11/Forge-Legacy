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

## Second reply, same day — IP whitelisting on a dynamic-IP host

The PO asked a follow-up ("our server runs on Supabase", i.e. rotating egress IPs). James replied:

> To better secure OAuth 2.0, we implemented IP Restrictions, which whitelist IP addresses under "IP
> Whitelisting". Because IP restrictions white-list IP addresses, you can handle dynamic IP environments
> like Supabase by setting up an API proxy server with a static IP address.
>
> This proxy can manage OAuth 2.0 access token renewal and forward requests to the fatsecret API.
> Alternatively, 0.0.0.0/0 is a range that allows any IPv4 address, though not recommended for security
> reasons (See https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing)
>
> For further technical assistance, please consult with our dedicated group forum:
> https://groups.google.com/group/fatsecret-platform-api

**What this settles:** a static-IP relay is **not** required. `0.0.0.0/0` is permitted — they only advise
against it. Our credentials live in Supabase Edge Function secrets and never reach the client bundle, so
the IP binding is not protecting a secret anyone can see; it is the same posture as the USDA key we
already ship. Decision: **allowlist `0.0.0.0/0`** rather than own a relay, for what is the *third*
fallback behind USDA and Open Food Facts.

**To wake FatSecret up (PO, two console steps, no code and no redeploy):**

1. FatSecret console → IP Whitelisting → add `0.0.0.0/0`.
2. Supabase → Edge Functions → Secrets → set `FATSECRET_CLIENT_ID` and `FATSECRET_CLIENT_SECRET`.

`supabase/functions/food-search/index.ts` already no-ops when those secrets are unset and starts calling
FatSecret on the next request once they exist.
