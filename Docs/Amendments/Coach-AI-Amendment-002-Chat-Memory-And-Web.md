# Coach AI Amendment 002 — Holt reads your data, remembers your chats, changes your program, and looks online when you tap

**Status:** LOCKED 2026-09-25 on PO direction (CA2-D1…CA2-D5).
**Date:** 2026-09-25
**Owner:** Product
**Amends:** `Coach-AI-Amendment-001` CA-D1 (a job never sees another job's words) and CA-D11 (`training_history`,
`edit_program` become real) · `Docs/Holt-Kitchen-Scope-v1.0.md` :85 ("nothing is fetched from recipe websites") ·
`Docs/App-Store-Listing-Copy.md` :260 (the "Unrestricted Web Access" answer — see CA2-D4).
**Governs:** `supabase/functions/coach-ask`, `src/domain/coach/ask-tools.ts`, `src/lib/coach-thread.ts` (`endThread`),
`src/components/forge/CoachChatSheet.tsx` (`actOn`, `onChip`, Undo), `src/app/holt-memory.tsx`, migration `0218`.

---

## Why

PO, 2026-09-25, after Holt answered a bench-progress question with "I don't have that data": *"We should really be
able to ask him pretty much anything about anything and get answers … the same way talking with Claude or ChatGPT
would work."* Scope stays **training and nutrition** (PO, same day); the far-off-topic redirect is kept.

## Decisions

### CA2-D1 — Holt looks things up with read tools. (Built 2026-09-25, `608a7311`, deployed.)

Twelve read tools in `ask-tools.ts` (lift history, training summary, workouts, one day's detail, records, cardio,
program status, goals, honors/rank, profile, food log, body metrics) plus `get_past_chats` and `get_recipes`.
Preflight Gates Part 2 is enforced **in code**: own-id filter on every read; no squad/friend/feed tool; no chapter
reflection; body metrics only when the athlete's own message asks (`isBodyQuestion`). Up to 4 tool rounds, then he
must answer. Still **1 credit per message**.

### CA2-D2 — Holt remembers past chats as short summaries. (Amends CA-D1.)

PO: *"I thought we made it so he can remember old convos? How can we make it cost efficient?"* and, on hearing the
cost stays flat, *"Yeah let's do it."*

- When a chat **ends** (closed, new chat, or the sheet goes away — `endThread`), a 2–3 line summary is written by
  Haiku (~$0.001) and stored in `holt_chat_summaries` (0218). **The last ten** are kept, by trigger.
- Holt reads them only through `get_past_chats`, only when a question needs them — the transcript is never stored
  and never re-sent. Cost per message does not grow with the account's age.
- Visible and deletable at **What Holt Remembers → Recent conversations** (CA-D2's rule: no hidden memory).
- Nothing about health, pain, injury, medication, the body or weight is stored: the summariser is told so, and
  every sentence `medicalRoute` would stop **or `mentionsDiscomfort` flags** is dropped before storage.
- Premium AI only (the 'summary' action is 0 credits but passes the 0203 gate). A hand-off to the Program Builder
  is not an end; an account switch (`first-run.ts`) clears silently and never summarises.

### CA2-D3 — Holt changes the program himself, from any message. (CA-D11 `edit_program`.)

PO: *"Have him be able to change programs himself."* The `propose_program_edit` action carries the chat's own
`EditIntent`; the **device** resolves it with `resolveEditIntent` and the same confirm chips as a typed command.
Nothing changes until the athlete taps **Do it** (Coach-Holt-Everywhere rule 2), and **Undo** follows every applied
change (structure restored, or skips un-marked). Trained sessions and the session count stay frozen (edit-ops,
0123/0175). The server never writes a program.

### CA2-D4 — Recipes: the app's book first, then online only when the athlete taps. (Amends Kitchen :85.)

PO: *"First search our database and then ask if they want him to find one online?"* → yes.

1. `get_recipes` searches Forge's book and the athlete's own recipes, with the **app's** per-serving numbers
   (computed on the device from USDA ingredient data; sent with the ask, read only if the tool is called).
2. Nothing fits → `offer_online_recipe_search` → a **Find one online** chip. Only the ask that tap sends carries
   Anthropic web search (`max_uses` 2), metered as **'web' = 3 credits** (~$0.02–0.05 a search).
3. Online recipes are described **in Holt's own words** with the site named and linked — never copied, and **never
   with calories or macros**: the athlete adds it to My Recipes and the app computes the numbers (NUT-D4 holds).
4. Nutrition-gated (0206): no recipe book and no chip without nutrition access.

⚠ **App Store:** the "Unrestricted Web Access" answer (`App-Store-Listing-Copy.md` :260) should be re-checked before
submission. The athlete cannot browse — Holt fetches on their tap and summarises — which most likely still reads as
*Not Present*, but it is now a question to answer deliberately, not by default.

### CA2-D5 — Form check reads as praise → fix → cue → encouragement.

PO: *"It was good feedback, but I would love more praise or direction. Encouragement."* The read now always names
what is working first, labels the fix ("One thing to clean up" / "Two things…, First, … Then, …"), gives the cue,
and closes with a line of encouragement (`encourage` field, guarded; a scripted line when the model's is dropped).

## Open

- The squad-announcement line (a separate change, Holt-Voice amendment) is tracked in its own document.
- `coach-ask`'s paste copy is ~115 KB. A 96 KB paste landed on 2026-09-25; if this one is cut off, deploy with the
  CLI (`npx supabase functions deploy coach-ask`), which bundles `src/` itself.
