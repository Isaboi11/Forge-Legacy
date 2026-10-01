# Monetization Architecture — Amendment 008: What Premium AI Covers

**Status:** 🔒 LOCKED — PO, 2026-09-28 (in chat)
**Amends:** `Monetization-Architecture-Amendment-006-Three-Plans-And-Nutrition.md` — **the §2 split rule is
extended and two rows of the §4 placement table change** (below). MA6-D1 (three plans), MA6-D2/MA7 prices,
MA6-D3 (entitlements, no schema change), MA6-D4 (fair-use allowance) and MA6-D9 (two paywall moments) stand.
**Related:** `Coach-AI-Amendment-002-Chat-Memory-And-Web.md` (Holt AI already changes a program from a typed
message) · `Coach-Holt-Feature-Discovery-System-v1.0.md` (PROPOSAL — where the check-ins in MA8-D5 get
designed) · `W9-Amendment-006-Coach-Speaks-Unprompted.md` (in-workout coaching, unchanged).

> **Why this amendment exists.** MA6 split the plans by cost: *runs on our own rules → Premium; calls a model
> → Premium AI.* That was honest about our costs but not about what a buyer sees. Some rules-based Holt
> features *look* like AI, which left the Premium AI plan thin and made Premium read as "Holt included."
> The PO wanted Premium AI to carry enough value to be worth the extra $5.

---

## Decisions

**MA8-D1 — The split rule, extended.** MA6's cost rule still applies, and a second rule is added:

| If a feature… | It belongs in |
|---|---|
| is something you do yourself, with your own data | **Free / Premium** (by caps, per MA3/MA6) |
| is Holt *building* something from your answers (rulebook) | **Premium** |
| is Holt *deciding or acting for you* on something you already have, or reading you | **Premium AI** |
| calls a model and costs money on every use (MA6) | **Premium AI** |

**MA8-D2 — Holt changing your program moves to Premium AI.** This covers every path by which Holt changes
a program that already exists, including **Basic Holt's tap-through "Change my program" flow**
(`CoachChatSheet` `beginEdit` / `edit-chat.ts`). Before this amendment that flow was open on every plan,
Free included. Holt AI already makes these changes from a typed message (Coach-AI-A002), and P-8 already
sells them as "Smart program changes" (`AI_BENEFITS`, `plans-core.ts`).

**MA8-D3 — Manual program changes stay on every plan, Free included.** It is the athlete's program:
swap two days, train one early, skip one (Program Detail) and edit sessions in the Program Builder stay
free forever. For anyone without Premium AI, "Change my program" in Holt's chat stays visible. Holt then
explains how to make the change by hand and where the controls are (as `chat-core.ts` "Change a
program" already does). Because this is an AI-shaped moment, M-7 **may** offer Premium AI there (M7-D16),
but never during a workout (M-7 §12, M7-D13).

**MA8-D4 — Holt building a program or day stays Premium.** Nothing changes: Free keeps its caps (1 Holt
program lifetime, 2 Holt days a month); Premium is unlimited. This, together with the caps, is most of
what Premium is worth, and it does not move.

**MA8-D5 — Nudges split in two.**
- **Discovery nudges stay on every plan.** These are the current `nudges.ts` invitations: eight counts,
  shown on idle screens through `CoachBubble`, never pushed. They help people find the app, and putting
  them behind the paywall would hide features from the people we want to convert.
- **Holt AI check-ins are new, and Premium AI only.** Holt reads your actual training and names something
  specific, for example a stalled lift, missed sessions or a jump in volume, and offers a change. The
  change itself is MA8-D2's Holt AI program change. **Never during an active workout:** check-ins show
  after a session or on Home. Push notifications are not part of this decision; if they come, they come
  under P-5.
- **Not built.** The current nudge system reads eight counts and cannot see a lift. Check-ins get
  designed in the Feature Discovery spec's "moments" work before any code.

**MA8-D6 — Confirmed, unchanged: already Premium AI in code.** Typing to Holt (`CoachChatSheet`,
`usePremiumAi`) · program or day import from a photo (`PHOTO_IMPORT_LIVE && usePremiumAi`) · form check ·
meal photo logging · Holt writing dishes into the meal plan. Import from pasted text stays Premium
(Free: 1), because parsing text is not Holt thinking.

**MA8-D7 — Anything sold as Premium AI must actually use the model.** A rules feature moved up a tier
must not be advertised as AI. MA8-D2's Holt edit flow counts because Holt AI performs the change. P-8
still lists **built features only** (P-8 §8), so check-ins stay off the paywall until they ship.

**MA8-D8 — Nutrition (PO, same day).** The same rule is applied to Holt's food features:
- **Premium AI:** Holt noticing food patterns, including the race carb-up line (`Nutrition-Architecture-Amendment-003`
  NUT-A3-D3). This is the food version of MA8-D5's check-ins. Also Premium AI: the reminders an athlete
  asks Holt for in plain words (NUT-A3-D4), because typing to Holt is already Premium AI.
- **Every plan, never paywalled:** Holt's safety responses, including the under-eating care response and
  the medical stop rules. Safety is never a paid feature.
- **Unchanged:** meal photos, recipe photo scan and Holt writing dishes into the meal plan stay Premium AI.
  The rules-based meal planner and the grocery list stay Premium. Food logging, barcode scanning and the
  Home food line (NUT-A3-D1) are available on every plan that has Nutrition.
- **Stale row fixed:** MA6 §4 listed *"Calorie + macro targets: follow the training day"* as a Premium
  feature. NUT-A3-D2 (2026-09-24) withdrew training-day targets, so Premium's targets are the same
  recommended targets on every plan. Premium's food value is now the meal planner and the grocery list.

---

## §4 placement table — rows changed (supersedes those rows in MA6 §4)

| Area | Free | Premium | Premium AI |
|---|---|---|---|
| Change your program yourself (swap · early · skip · builder edits) | ✓ | ✓ | ✓ |
| Holt changes your program for you | — | — | ✓ (Holt AI) |
| Holt builds a program / day (rulebook) | 1 · 2/mo | Unlimited | Unlimited |
| Discovery nudges | ✓ | ✓ | ✓ |
| Holt AI check-ins on your training | — | — | ✓ *(not built)* |
| Talk to Holt in your own words | — | — | ✓ |
| Program import | 1, from text | From text | + from a photo |
| Calorie + macro targets | Recommended | Recommended (training-day variant withdrawn, NUT-A3-D2) | same |
| Holt food patterns + race carb-up line | — | — | ✓ *(not built)* |
| Holt reminders you set by typing | — | — | ✓ *(not built)* |
| Holt safety responses (under-eating care, medical stops) | ✓ | ✓ | ✓ |

---

## Work owed

| # | Where | Change | Ships by |
|---|---|---|---|
| 1 | `CoachChatSheet.tsx` (`opener.kind === 'edit'`) | Gate `beginEdit` on `usePremiumAi()`; otherwise Holt explains the manual route (MA8-D3). Keep the chip. | OTA (JS only) |
| 2 | `plans-core.ts` P-8 copy | No change: "Smart program changes" is already a Premium AI benefit and Premium's copy does not promise Holt edits. Re-check when #1 lands. | — |
| 3 | Pricing page draft (artifact `G95tKHUJJNB1ggMuyzr8Xe`) | Update to the rows above. | Before the site shows prices |
| 4 | `Coach-Holt-Feature-Discovery-System-v1.0.md` | Design Holt AI check-ins (MA8-D5): which moments, where they show, how many per week. | Design, then build |

---

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-09-28 | MA8-D8 nutrition: Holt food patterns + typed reminders → Premium AI; safety on every plan; stale training-day-targets row fixed. |
| 1.0 | 2026-09-28 | Locked. Holt changing a program → Premium AI; manual changes free on every plan; Holt building stays Premium; discovery nudges free, Holt AI check-ins Premium AI (unbuilt). |
