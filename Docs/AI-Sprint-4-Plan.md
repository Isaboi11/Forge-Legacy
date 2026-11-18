# AI Road to 10 — Sprint 4 "one brain + memory": the map (DRAFT — nothing started)

**Status:** 📝 DRAFT 2026-11-18 · PO: *"Is sprint 4 going to be heavy? map it out"*. Nothing is branched, built,
applied, deployed or spent.
**Plan:** `Docs/AI-Road-To-10-Plan-v1.0.md` §9 Sprints 4–5 (CH-3, CH-4, NU-3, FC-3, FC-4, UX-3).
**Base when it starts:** `feat/build11` = GitHub `main` = `e1abd8ef` (Sprint 3b shipped; re-check the head first).
**Builds on:** `Docs/AI-Sprint-3b-Build-Notes.md` on `ai/s3b` — same lanes, gate ("no worse than live" for import +
Kitchen, absolute for safety), byte-exact deploys, one release ask.

**Short answer: yes, it's the heaviest sprint so far.** Sprints 0–3 fixed and measured what exists. Sprint 4 changes
how Holt works: one chat that can DO things (log food, swap a lift, start a workout) and remembers you. So it runs in
two halves, like 3a/3b, each shipped on its own.

---

## 1. What's in it

### 4a — Holt can do things (≈ 2 days of agent work)

| Unit | What changes | What a user notices |
|---|---|---|
| **CH-3 One brain** | Every typed line goes to Holt's chat (`coach-ask`). `coach-interpret` retires — it is still called from ~15 app files (chat sheet, program photo, edit intent, typed equipment, Kitchen…), so each caller moves over and is tested. | Holt answers the same way everywhere; no "different Holt" depending on where you typed. |
| **CH-3 Action tools** | New tools, each shown as a card on the phone with **Confirm + Undo** (nothing happens silently): log food · propose a meal · swap today's exercise · start a workout · schedule a session · build/edit a program · set targets (numbers from the app's own maths, never the model). The program writer (`coach-author`) becomes a tool Holt calls, so one ask = one credit. | "Swap bench for dumbbells today" or "log 2 eggs and toast" just works from chat. |
| **CH-3 Status lines** | While a tool runs: "Reading your last 6 bench sessions…". | You see what Holt is doing instead of a spinner. |
| **NU-3 Describe a meal** | Type or say what you ate → a cheap model names the foods and amounts → the food database gives every number → you review, then log. Merges the unshipped `feat/holt-food-lookup` branch (8 commits, Amendment 006 locked). Plus a labelled "Snap a plate" button in Nutrition's Add sheet. | Logging a meal in one sentence. |
| **UX-3 Holt's toolbox** | Long-press Holt's coin → Ask · Snap a plate · Describe a meal · Check my form · Import a photo · What can I make. | Every AI tool is two taps away. |

### 4b — Holt remembers you (≈ 1–1½ days)

| Unit | What changes | What a user notices |
|---|---|---|
| **CH-4 Memory in a chat** | Older turns are summarised instead of dropped (no 8-turn cliff). | Long chats don't "forget" the start. |
| **CH-4 Long-term facts** | Holt keeps facts you mention (schedule, gym, likes/dislikes, injuries said in passing → stored as "avoid X", never a diagnosis). Shown and editable in `/holt-memory` (the screen exists). Nothing medical is stored — same filter as notes. | Holt stops asking things you already told him; you can see and delete what he knows. |
| **CH-4 Past chats** | Browse and search old chats; reopen and continue. | Find "that thing Holt said about my knee warm-up". |

### Form check (FC-3, FC-4) — NOT in this sprint's lanes
Another session owns form check ("see it in your video", steps 2–5): step 2 = getting the fix right, step 3 = ask more,
step 4 = more ways in (= FC-4's "Check my form" on the set row). FC-3's measured reps/depth/tempo overlap step 1–2.
Sprint 4 leaves them to that session and only links the toolbox's "Check my form" to whatever exists.
⬜ Still open from Sprint 3: FC-2 needs the PO to film sets with body tracking.

## 2. How it runs
- 4a: three lanes in parallel — **A** one brain + tools (server + chat), **B** describe-a-meal + food lookup merge,
  **C** toolbox + action cards (UI). Then the integrator, ONE release ask.
- 4b: two lanes — **A** memory (summaries + facts + migration), **B** past chats. One release ask.
- Migrations (numbers checked when it starts; next free today is `0276`): Holt's long-term facts + chat history/search;
  maybe one for describe-a-meal metering.
- Old phones: interpret can't be switched off on the server until phones have the new app (client first; it stays
  live for old builds).

## 3. How long
| Step | Estimate |
|---|---|
| 4a | ~2 days of agent work + 1 integration/release sitting |
| 4b | ~1–1½ days + 1 release sitting |
| **Total** | **~4 working days**, in 3–4 sittings (Sprint 3 took ~1 long day for 3b) |

PO touch-points: approve the decisions below (5 min) · try the action cards on the phone after 4a · paste 1–2 SQL
files per half · two release "yes"es.

## 4. Will it be too many credits?
**A. Testing money (Anthropic API).** Holt's chat is the expensive suite (it's Sonnet 5.5, 700+ cases).

| Live run | Estimate |
|---|---|
| New tool-use suite (does Holt pick the right action, never act without a card) | ~$4–6 |
| Re-record chat safety + answers after the one-brain prompt change (once, maybe twice) | ~$8–15 |
| Describe-a-meal suite on Haiku 5.5 | ~$0.50–1 |
| Memory suite (does he remember the right things, never anything medical) | ~$2–4 |
| **Total** | **~$15–25 → ask for a $30 cap** |

Sprint 3 came in at $9.87 of $25, so these estimates lean high.

**B. Running cost per user.** Mostly flat or down: one ask = one credit (today a typed program can cost a chat + a
build), describe-a-meal runs on Haiku 5.5. Tool rounds add a little per chat; memory summaries are Haiku 5.5. Watch
it on `/admin` AI health for a week after 4a.

**C. Claude Code usage.** Bigger than 3b. Two halves keeps each run to three agents.

## 5. Decisions for the PO before it starts

✅ **PO 2026-11-18: yes to all five, and run it as two halves (4a in a new chat, then 4b).**

1. **Testing cap: $30**, each run quoted first.
2. **Retire `coach-interpret`** — everything typed goes to Holt's one chat (old phones keep working).
3. **Holt can act, always with a card + Undo** — never silently. Which actions are in: log food · swap today's
   exercise · start a workout · schedule · build/edit a program · set targets. (Any to leave out?)
4. **Holt remembers by default**, everything visible + deletable in Holt's memory, a switch to turn it off, nothing
   medical ever kept. (Or: off until the athlete turns it on.)
5. **Merge the food-lookup branch** (unshipped since 10-01) as part of describe-a-meal.

## 6. Known risks
- **CH-3 is the biggest change to Holt since he shipped.** The safety stop must still run before every tool and every
  model call — the ask-safety and chat-safety suites gate it, absolute bars.
- Retiring interpret touches program photo import and Kitchen paths — the import corpus (57/61) and Kitchen (36/36)
  gates must not drop.
- An action that edits a program or logs food is a real write: every card needs Undo and a test that a refused or
  cut-off reply writes nothing.
- Memory is personal data: export + delete must include it (Settings → Export My Data, account wipe).
- The main tree is still dirty (another session's `destination.ts`), so trunk keeps lagging until that's committed.
