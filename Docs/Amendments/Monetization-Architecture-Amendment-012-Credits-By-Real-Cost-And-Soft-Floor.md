# Monetization Architecture Amendment 012 — Credits By Real Cost, And A Soft Floor

**Status:** PROPOSED — ships with AI Sprint 2 (nothing is live until the PO pastes `supabase/apply/pending-0272.sql`
and approves the Sprint 2 OTA)
**Date:** 2026-11-17
**Owner:** Product (PO) — the plan row is `Docs/AI-Road-To-10-Plan-v1.0.md` §1 "Credit weights (MA3-D16 table)"
**Amends:** the credit-weight table the plan calls "MA3-D16" — the weights set under MA3-D16's server-config rule by
CA-D8 / CA-D9 (`Coach-AI-Amendment-001`), `AI-Coach-Capability-Scope-v0.1.md` §1 (form check 6), 0221, 0223 / 0232,
and `Coach-AI-Amendment-002` ("'web' = 3 credits"). Also the hard wall at 0 credits (0144's `coach_ai_spend_credits`).
**Leaves unchanged:** MA3-D16 itself (every number stays server config — this adds three more: `floor_per_day`,
`floor_actions`, `credits_low_at`) · 150 credits a month · every price (MA7: Premium AI $19.99 / $169.99; MA7-D7 Tester
AI $7.99 / $69.99) · `meal_photo` = 1 (PO 2026-09-28, on purpose) · MA8 (Holt acting for you is Premium AI) · MA11 ·
the medical stop · the daily caps each function already holds (form check 20, photo reads 60, tidy 40)
**Implemented by:** `supabase/migrations/0272_ai_credits_reweight_soft_floor.sql` + `supabase/apply/pending-0272.sql`
· `src/domain/ai/credits.ts` · `src/data/ai-credits-live.ts` · `src/components/forge/AiCreditsChip.tsx` ·
`src/lib/ai-invoke.ts` · tests `src/domain/ai/__tests__/{credits,migration-0272}.test.mjs`,
`src/data/__tests__/ai-credits-live.test.mjs`, `src/app/__tests__/ai-credits-placement.test.mjs`

---

## 1. Why

The weights were set before anything was measured. The ledger (`coach_ai_spend`, 9,307 rows, re-priced per model by
0268) now says what a call costs: a form check averages $0.018 and charged 6; a typed build charged twice (the
coach-interpret turn that opened it AND the coach-author write); a photo import paid a second credit for the AI
layout pass the PO made automatic on 2026-09-30 ("every photo gets AI"). And at 150 the meter is a wall: someone who
photographs every meal and chats daily hits it around day 28–30 (AI audit 2026-11-16), and then nothing works until
the 1st. *Same money, much more use; nobody hits a dead stop* (plan §1).

## 2. Decisions

**MA12-D1 — Weigh by real cost.** `coach_ai_config.action_credits`, every key (live values read 2026-11-17):

| Key | Used by | Old | New | Real cost per call (ledger, Sonnet 5: avg · max) |
|---|---|---:|---:|---|
| `form_check` | coach-form-check | 6 | **3** | $0.018 · $0.028 (14 calls) |
| `recipe_photo` | recipe-photo-read | 3 | **2** | no calls yet — est. ~$0.017 (≤ 3,000 output tokens) |
| `web` | coach-ask, a tapped online search | 3 | **2** | no calls yet — est. ~$0.04–0.06 incl. 2 searches |
| `message` | coach-ask; coach-interpret with a question on the table | 1 | 1 | $0.0020 · $0.028 |
| `day` · `program` | coach-interpret turns · coach-author writes | 1 · 1 | 1 · 1 | turn $0.002; write ~$0.037 · $0.056 |
| `kitchen` | coach-kitchen | 2 | 2 | $0.022 · $0.027 |
| `meal_photo` | meal-photo-read | 1 | 1 | no calls yet — est. ~$0.01 ("~1¢", 09-26) |
| `photo_import` | workout-card-read, program-photo-read | 2 | 2 | $0.0072 · $0.025 |
| `workout_tidy` | workout-tidy | 1 | 1 | $0.0105 · $0.020 |
| `photo_read` | (no function calls it today) | 3 | 3 | — |
| `summary` | coach-ask's chat summary | 0 | 0 | $0.0007 (Haiku 4.5) |

Each key moves only from its old value, so a weight set by hand is never overwritten; 0272's §2 stops and names it.

**MA12-D2 — A typed build is one credit, not two.** The weight of `day` / `program` cannot change: coach-interpret's
turns share them. Instead coach-author's write **rides on** the paid coach-interpret turn that opened it — settled,
not refunded, in the last 30 minutes, not ridden on before — and holds 0 credits (`waiver = 'typed_build'`). A write
with no paid turn before it (a tapped opener, a typed answer the chips matched) pays its own 1. "Ask me again" is a
new build and pays. A typed answer to one of Holt's questions is still a message (1), as today.

**MA12-D3 — The tidy pass every photo gets costs nothing.** Same mechanism: workout-tidy rides on the paid photo
read it tidies (`waiver = 'photo_tidy'`), so a photo is 2 credits, not 3 — the PO's "every photo gets AI" stays. A
**typed** "Fix it with AI" still pays 1. Setting `workout_tidy` to 0 would have made that free up to its 40-a-day cap
(~$0.42 a day of model time per athlete) — a free AI door, which MA12-D5 forbids in spirit and the budget in fact.

**MA12-D4 — The soft floor.** Once the month's credits are used, a **chat** (coach-ask `message`; coach-interpret's
turns, so a typed line that is not a question still works) or a **meal photo** still goes through at 0 credits,
**5 a day in total** (`floor_per_day`), never a dead stop. The day is the athlete's own (`profiles.tz`, else UTC).
Everything else still refuses at 0 with the reset date: a web search (plain chat only — it costs ~20× a message),
Kitchen, form check, photo import and recipe photos, a typed build's write (the rulebook builds it instead, free, and
Holt says so). A floor use is marked on the reservation and the ledger (`waiver = 'floor'`) so the AI health page can
count it; one refunded because the model failed does not count against the day, and — holding 0 credits — can never
create credit. The 6th of the day is the same `out_of_credits` every phone already handles.

**MA12-D5 — AI stays paid-only (PO 2026-11-16).** The floor is for people who PAY and used up their month, never a
free taste. It is reached only after the Premium AI gate and the AI-sharing consent, and only on a refusal with an
allowance above 0. An account without `coach_ai` gets `not_entitled` and nothing written, at any balance.

**MA12-D6 — Credits you can see.** A chip on Holt's header and every AI screen (meal photo, meal plan / Kitchen,
photo import, Write a workout, My Recipes, form check): "112 credits" · "12 left · resets December 1" (at
`credits_low_at`, 20) · "5 a day until December 1" · "Today's 5 used · back tomorrow". The reset date is the first of
the month after the server's period, in UTC — the meter's clock. Premium AI only; a failed read draws nothing, never
"0". One read (`coach_ai_credits()`), refreshed from the `remaining` every AI answer already carries. Neutral ink on
the divider edge: a balance is information, and on Alabaster bronze is earned.

**MA12-D7 — Old phones lose nothing, and nothing they show becomes false.** The reweight, the waivers and the floor
are server-only (0272): every installed build is charged the new weights the moment it is pasted. No shipped copy
states a weight — form check's "Uses N of your … AI credits" is the server's quote, so it simply says 3. The reserve
keeps its shape and its reason names; an old phone on the floor just finds that a chat or a meal photo still works.

## 3. What it costs — the worst case per AI user

From the ledger's real per-call costs (§2 table), a month at the limit:

| Shape of the month | Credits | Floor (30 × 5) | Total |
|---|---|---|---|
| The plan's heavy user: every meal photographed (90) + 2 chats a day (60), then meal photos on the floor | $1.02 | $1.50 | **≈ $2.50** |
| The most expensive per credit: 150 typed program builds (interpret turn + a full-week write ≈ $0.039 each) | $5.88 | $1.50 | **≈ $7.40** |
| The same at every call's ledger maximum | ≈ $11 | $3.00 | ≈ $14 (not a real month) |
| For comparison — the old weights' worst (75 typed builds at 2 credits, no floor) | $2.94 | — | $2.94 |

The plan's "~$2 worst case" holds for chats and photos. It does not hold for a typed-program-heavy athlete, because a
write costs ~20× a chat and MA12-D2 halves its price. Against ~$17 net from Premium AI ($19.99 less Apple's 15%) every
row is covered; against ~$6.80 net from the $7.99 Tester AI plan the typed-build month is not. **✅ PO decision
2026-11-17: ACCEPTED ("Yeah keep it")** — a typed build stays 1 credit, no daily cap. Nobody realistic comes close;
the AI health page shows it if someone does. The alternatives (a full-week write at 2, or a daily cap on coach-author
writes) remain one SQL update each if the ledger ever says otherwise.

## 4. Known limits

- **The ledger does not price web search.** `cost_usd` is tokens only; Anthropic's $10 per 1,000 searches (≤ 2 per
  ask) is not on it. The monthly invoice reconcile (PL-2) is where it shows.
- **Holt's own out-of-credits line in the chat** (`ask-outcome.ts`, ai/s2-safety's file) still says "They come back on
  December 1" when it is TODAY's floor that is used. `aiFloorUsedLine` (credits.ts) has the words; meal photos use it.
- **The AI health page** counts floor uses only once `admin_ai_health` reads `coach_ai_spend.waiver` — a few lines,
  left to the integrator so they land on top of 0271's version of that function.
- **The typed-build cover** is "the newest paid interpret turn in the last 30 minutes" — an unrelated turn in the same
  half hour can cover a build. It is still one credit per build; never zero for an athlete who has not paid a turn.
- **The coach-author cost** comes from 2 ledger rows (the function is new): re-read it after a month of real use.

## 5. Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-17 | Proposed with AI Sprint 2 (`ai/s2-credits`): 0272 + the credits chip + thumbs on the last three AI results (UX-4). Behaviour proven in PGlite against prod's live function sources (bundle twice, 20/20 rows; 14 edge cases). |
