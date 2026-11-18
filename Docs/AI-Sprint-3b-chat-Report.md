# AI Sprint 3b — Lane C report (CH-6 rest + UX-1 + Kitchen)

**Branch:** `ai/s3b-chat` (worktree `C:\Users\isaia\ai-s3b-chat-wt`), off `2a2eaedb` (the contract commit on `c543e3eb`).
**Status:** ✅ done 2026-11-18. Nothing deployed, applied, published, pushed or spent ($0, no `--live`).

## Commits

| Commit | What the athlete gets |
|---|---|
| `d1ef8efa` | fix(kitchen): a dairy-free athlete is never shown "creamed" spinach or chicken. The allergen list read `cream` and stopped at the e (§1.6) |
| `5b982cef` | feat(holt): web search says what it costs before you send it ("Find one online · 2 credits"), and the chat's ended event says which tools an ask used (§1.3 + §1.4) |
| `8baad52f` | feat(ai): one AI state look on workout write (card read + tidy), Holt's chat failure card and the Kitchen (§1.5) |
| `139b52fc` | test(ai): the source pins follow the kit and the quote |

## §1.3: web search cost before the tap. **No 0276 needed.**
- Live check (read-only `pg_get_functiondef` via the Supabase MCP): `coach_ai_credits()` (0272) returns no weights, but
  `coach_ai_quote(p_action)` (0221) is live, `SECURITY DEFINER`, granted to `authenticated` (not anon). It returns
  `cost = (action_credits ->> p_action)::int` for a Premium AI athlete, and 0 when not entitled or the action is unpriced.
  Live `action_credits.web` = 2.
- The app calls `fetchWebSearchCost()` (`src/data/coach-ask-live.ts`), which runs `coach_ai_quote('web')` once per sheet,
  only for Premium AI + Nutrition. The chip is drawn as `withCreditCost('Find one online', cost)`. If the read fails, the
  server is old, or the cost comes back 0, the chip shows no number. The app never types a number of its own (a test checks).
- The chip's `label` (the transcript line, and what the answer is matched by) is unchanged. Only the drawn text and the
  VoiceOver label carry the cost.

## §1.4: telemetry `tools`
- `holt_ask_ended` gains `tools`, built by `askToolsUsed(statusLines, actionNames)` (`chat-basics.ts`). It holds tool
  NAMES only, mapped back from the fixed `ASK_STATUS_PHRASES` table plus `ASK_ACTION_NAMES`. Each name appears once,
  comma-joined, and only whole names fit inside the 64-character cap. It is `'none'` when no tool ran. A line or name that
  is not in those tables is dropped. `tools` was added to `ALLOWED_PROP_KEYS`.
- No server change. An older phone sends no `tools` key.

## §1.5: the UX-1 kit, rolled out
- Kit (`ai-status.ts`, `AiStatus.tsx`):
  - Every state can now carry a `detail` line.
  - A done step shows the engraved `check` icon and a failed step the engraved `close` icon (no ✓/✕ text glyphs).
  - Colours are tokens only, with no bronze.
  - New builders: `cardReadProgress`, `TIDY_WORKING`, `aiProblem` (out of credits is its own state, with no Try again)
    and `chatFailure`.
- Workout write (`src/app/workout-write.tsx`):
  - The photo read shows two steps: Read the card, then Lay it out.
  - "Fix it with AI" shows a single working line.
  - A failure shows the kit with Try again: the same tidy, or another photo. Try again is not offered when Premium AI or
    this month's credits are the reason.
  - Consent "Not now" and a photo that would not open stay plain notes.
- Holt's chat:
  - Every `error` turn is drawn by the kit (`chatFailure`). "Not charged." appears once, whether the turn carries the flag
    or the words. The C-D5 Try again chip under the card stays the retry.
  - When the Kitchen itself fails (`unavailable` / `offline`), that is the same failure card now, not a Holt line.
  - "Nothing I'd stand behind" (Holt deciding) and the commercial lines (out of credits, not entitled, daily limit) stay
    in Holt's voice, the same way the chat's own out-of-credits line does (C-D1).
- Two themes: the layout change is shared by both, and the colours come only from the existing tokens. Form check was not
  touched.

## §1.6: Kitchen allergens. **34/36 before, 34/36 after (offline, prompt `18d37664f223` unchanged).**
- The 2 remaining fails are **the grader, not a leak.**
  - `dairy-1` "Creamy Cashew-Style Mac Bowl" is pasta + tahini + lemon + oil + broth.
  - `dairy-2` "No-Cook Creamy Avocado Pasta" is spaghetti + avocado + lemon + oil.
  - Neither has any dairy. The suite's independent list matches the prefix `\bcream`, so it flags the texture word
    "creamy". I left the grader as it is (never loosened). Recommendation for its owner (lane A, `scripts/evals/**`):
    make it `cream(?!y)`, or read "creamy" only on ingredient lines.
- A **real gap** turned up next to them, and it is fixed: `\bcream\b` missed "creamed" and "creams". "Creamed Spinach
  Chicken" and "1 cup creamed spinach" were SHOWN to a dairy avoider. The dairy word list (`ALLERGEN_WORDS.dairy` in
  `src/domain/nutrition/kitchen-dishes.ts`) now has `creams?|creamed`, so it fails closed. "Creamy" is deliberately not
  dairy: creamy avocado and creamy peanut butter aren't, and a creamy dish made with cream is caught by its ingredient
  lines. This is a PO call if they want it wider.
- coach-kitchen's paste copy was rebuilt with `node scripts/build-coach-kitchen-deploy.mjs`. Its pantry strip inlines
  this list. The dish filter itself (`dishCards`) runs on the device.

## Tests
- New: `src/domain/coach/__tests__/chat-tools-and-web-cost.test.mjs` (8), `src/domain/ai/__tests__/ai-status-rollout.test.mjs` (7),
  +1 in `kitchen-allergen-names.test.mjs`.
- Full `node --test` (src + scripts): **7,018 tests · 7,012 pass · 5 fail**, all in files I did not touch:
  1. consent: `crm-live.ts` calls bug-plain without the AI consent
  2. migration-0234 "SECURITY INVOKER, capped at 200 rows"
  3. migration-0234 "push trigger keeps 0153's arms"
  4. onboarding-missing-profile "complete_onboarding is 0066 unchanged"
  5. `scripts/__tests__/qa-to-ops-bugs` "generated SQL matches" (a scripts test, outside the src count)

  1–4 are the 4 known src failures.
- `npx tsc --noEmit` = 0. This needed the gitignored `expo-env.d.ts` copied into the worktree; it is generated and not
  committed.
- eslint = 0 on every changed file.
- Old client: no wire changed. `coach_ai_quote` is live since 0221, coach-ask is untouched, and an older event without
  `tools` sanitises the same (test).

## Files edited outside the lane row (one-line or pin edits)
- `src/domain/nutrition/kitchen-dishes.ts` (the dairy word list) + `supabase/apply/deploy-coach-kitchen.ts` (regenerated)
  + `src/domain/nutrition/__tests__/kitchen-allergen-names.test.mjs`
- `src/domain/analytics/props-core.ts` (`tools` key; this is the "chat telemetry allowlist" from the lane row)
- `src/app/workout-write.tsx` (the kit's placement on tidy and card read; the lane row names the placement)
- Test pins: `src/app/__tests__/ai-failed-state-surfaces.test.mjs`, `src/app/__tests__/ai-credits-placement.test.mjs`,
  `src/app/__tests__/posted-workout-wiring.test.mjs`, `src/domain/coach/__tests__/ask-outcome.test.mjs`,
  `src/domain/coach/__tests__/chat-hygiene.test.mjs`
- Not edited: `supabase/functions/coach-ask/**`, `supabase/functions/coach-kitchen/index.ts` (model lines untouched),
  anything under form check.

## What ships how
- **Server deploy:** `coach-kitchen` only (its bundle changed: the dairy word list in the pantry strip). No SQL.
- **OTA:** everything else (the chip cost, `tools`, the kit on workout write / chat / Kitchen, and the on-device
  `dishCards` filter that drops "creamed" dishes).

## Open items
- Grader: `kitchen-allergens` flags "creamy" (lane A / PO; see §1.6). Until then the suite stays 34/36. Under
  `floor: 'live'` that is no worse than live (31).
- PO call: should "creamy" in a dish name drop it for a dairy avoider? It is not dropped today, by design.
- Kitchen and chat out-of-credits stay Holt lines, not the kit's out-of-credits state (consistent with C-D1). Say so if
  the kit look is wanted there too.
- Meal plan's "Holt fills the week" and recipe photo are still off the kit (not in this lane's list).
- Every commit printed `failed to delete …/.git/worktrees/<name>: Permission denied` (git's auto-prune of 7 stale
  worktree entries: b11b, forge-care-wt, forge-deploy-wt, forge-s3a-ota-wt, forge-textfix-wt, forge-webpay-wt,
  ota-verify-wt). It is harmless and nothing was deleted, but the integrator may want to look.

## ▶ RESUME HERE
Nothing is pending in this lane. For the integrator:
1. Merge `ai/s3b-chat` after lane A.
2. CoachChatSheet conflicts are likely only around the model lines (lane A).
3. Re-run `node scripts/build-coach-kitchen-deploy.mjs` after lane A's model-line merge, because the bundle must
   carry both changes.
