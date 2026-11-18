# AI Sprint 4a — Lane C report (UX-3 toolbox + the action cards + training executors)

**Branch:** `ai/s4a-cards` (worktree `C:\Users\isaia\ai-s4a-cards-wt`), off `6b539e15` (the cross-lane stubs).
**Status:** ✅ built 2026-11-18. Nothing deployed, applied, published, pushed or spent ($0, no live model call).

## Commits

| Commit | What the athlete gets |
|---|---|
| `d3297eb8` | While he looks something up, Holt says what — "Reading your last 6 bench sessions…" — from the app's own templates, never the model's words (§1.5) |
| `f5b0d055` | Holt's action cards show what will change, worked out by the app; a refused reply shows none (§1.2, §1.3). Contract appends in `holt-actions.ts` |
| `ce3330c2` | Confirm swaps today's exercise, starts the workout, sets targets or keeps a note; Undo puts back only that, or says why it can't (§1.2) |
| `545b3038` | Every action comes as one card in the chat's own card language (`HoltActionCard`) |
| `48edb608` | Hold Holt's coin for his toolbox; a tap still opens the chat (§1.7) |

## What lane A calls (mount contract)

```ts
import { holdTurnActions } from '@/domain/coach/holt-action-cards';
import { liveCardContext, confirmHoltAction, undoHoltAction, dismissHoltAction } from '@/data/holt-actions-live';
import { HoltActionCard, type ActionCardState } from '@/components/forge/HoltActionCard';
import { HoltStatusLine, holtStatusText } from '@/components/forge/HoltStatusLine';

const hold = holdTurnActions();                       // one per turn
hold.hold(action);                                    // every {action} off the wire
hold.drop();                                          // Stop, timeout, sheet closing
const shown = await hold.release(end, await liveCardContext({ units, nutritionAccess }));  // [] unless cardsMayShow(end)
// draw: <HoltActionCard card={s.card} state={st} said={res.said} noUndo={res.noUndo} reason={res.reason} undoFailed={…}
//        onConfirm={(key) => …} onUndo={…} onDismiss={…} />
const res = await confirmHoltAction(shown[i], key);   // the ONLY road to a write; tracks holt_action
if (res.ok && res.go) { handOff(); router.push(res.go); }   // start_workout → '/workout', open_door → its route
const back = await undoHoltAction(shown[i].action.name, res.undo);   // false → undoFailed
dismissHoltAction(shown[i].action.name);
```

- `HoltStatusLine` is a drop-in for the `typingStatus` `<Text>` inside `TypingBubble`; give the bubble
  `accessibilityLabel={holtStatusText(status, detail)}`.
- `HoltActionCardProps` kept as committed; appended `reason?`, `noUndo?`, `undoFailed?`; `ActionCardState` appended
  `'dismissed'`.
- Lane B's `mealCard(...)` returns `ActionCardModel`; the same `HoltActionCard` draws it (rows, `secondary`, `credit`).
  The integrator adds `log_food`/`propose_meal` to `cardFor` and `executorFor`.

## Contract appends (`src/domain/coach/holt-actions.ts`, append only)

- `ActionCardModel.plan?` — what the APP resolved; executors are handed this, not the model's input.
- `ApplyResult` ok branch: `go?` (hand-off route), `noUndo?` (nothing to undo, with why).
- Input shapes lane A's tool definitions must send: `SwapExerciseTodayInput {from, to}`, `StartWorkoutInput {name?}`,
  `ScheduleSessionInput {when, what?}`, `SetTargetsInput {goal, pace?}`, `RememberNoteInput {text}`,
  `OpenDoorInput {door}`.
- Status `detail` templates exist for: `get_lift_history` (n + lift), `get_personal_records` (lift),
  `get_training_summary` / `get_cardio_history` / `get_nutrition_log` / `get_body_metrics` (days), `get_recent_workouts`
  / `get_past_chats` (n), `get_foods` / `get_recipes` (food). `STATUS_TEMPLATE_TOOLS` lists them.

## The cards (`holt-action-cards.ts`, pure)

- Every write card's button is **Do it** (`Coach-AI-Amendment-002`, LOCKED: "Nothing changes until the athlete taps Do
  it"). `open_door` says **Open**.
- `swap_exercise_today`: the exercise is found in today's session (the open workout if one has logged work, else the
  running program's next session, main lifts) and the new one in the catalogue (`matchExercise`). Blocked: nothing open
  or planned · not in the session · no catalogue match · already that exercise · run ⇄ lift · sets already logged on it.
- `start_workout`: no name = the program's next session, else the workout built for later; a name matches the athlete's
  templates, open program sessions and the built-for-later one (a tie asks which). Notes an open workout with sets.
- `schedule_session`: `resolveDay` reads the day on the athlete's LOCAL calendar (B14) — today/tomorrow, weekdays,
  "next X", "in N days/weeks", "the 24th", "nov 24", ISO; up to 90 days; never a passed day. **Blocked in 4a** (below).
- `set_targets`: every number from `recommend()` with the athlete's facts read as the Targets screen reads them; pace
  as said, held to ¼ lb and the screen's range. Blocked: under 18 (NUT-D5, first and alone) · missing facts · **anyone
  not male** (the screen's pregnancy/breastfeeding question, N-G2, cannot be asked on a card — it points there) · a
  loss target in a care-line week · no nutrition access · same as now.
- `remember_note`: one clean line (`cleanNoteText`). `open_door`: import → `/program-import`, pick →
  `/program-catalog`, meal_plan → `/meal-plan`, targets → `/nutrition-targets`, form_check → `/form-check`.
- `null` for `log_food`, `propose_meal`, program actions, and an unknown door.

## The executors (`holt-action-exec.ts` rules, `holt-actions-live.ts` wiring)

- `swap_exercise_today` (open workout): the logger's same-kind swap on the autosave, read back; Undo only while the
  workout and the swapped exercise are unchanged and nothing is logged on it. (program): `edit-ops.swapExercise`
  with `this_week` on that one session + "Updated by Holt"; Undo only while the structure is still what it wrote.
- `start_workout`: writes the launch the way the app's own buttons do, read back, `go: '/workout'`. Undo: the launch
  if not yet consumed; else discards the workout it started only if nothing is logged (an older resumed workout is
  never touched).
- `set_targets`: `saveTargets(…, 'recommended', weight)`. Undo: today's earlier row exactly; if there was none, the
  earlier target's numbers written for today (in force exactly as before); a first-ever target has `noUndo`.
- `remember_note`: `addNotes([text], 'ask')`; Undo deletes that id only. Full → `not_allowed`.
- `open_door`: navigation only, after `consentForRoute`.
- `schedule_session`: **no executor**.

## Tests

- `src/domain/coach/__tests__/holt-status.test.mjs` 6 · `holt-action-cards.test.mjs` 23 · `holt-action-exec.test.mjs`
  20 · `holt-toolbox.test.mjs` 9 — all pass.
- Full `src` run (`node --experimental-strip-types --test "src/**/__tests__/*.test.mjs"`): **7023 tests, 7019 pass,
  4 fail — the 4 known**: `consent.test.mjs` (crm-live calls bug-plain without the AI consent),
  `migration-0234.test.mjs` ×2 (SECURITY INVOKER / push trigger, CRLF checkout), `onboarding-missing-profile.test.mjs`
  (complete_onboarding body, CRLF). None touches this lane's files.
- `npx tsc --noEmit` = 0. eslint 0 on every changed file.

## Shared-file edits

- `src/domain/coach/holt-actions.ts` — appends only (above).
- `src/components/forge/CoachSays.tsx` — optional `onLongPress` / `holdHint` / `holdLabel` on the mark (not in the
  lane table; the long-press cannot reach the coin otherwise). `/workout` passes none, so it is unchanged there.
- New files in this lane: `src/domain/coach/holt-action-exec.ts`, `src/domain/coach/holt-toolbox.ts` (+ tests).

## Open items / could not build

1. ⛔ **`schedule_session` STOPPED — needs SQL.** The app has no store for a dated session: programs are sequential
   (Program-Authoring §2.2, CAL-D3/D9) and Calendar's scheduled-workout primitive (CAL-D8) was never built
   (`planned_workouts` is one undated slot). The card resolves and shows the day, then says "I can't put sessions on
   dates yet" with no Confirm. Recommend lane A does NOT offer `schedule_session` in 4a (or the PO decides a table).
2. **`set_targets` Undo is not exact when today had no row**: `nutrition_targets` has no DELETE policy (0205/0206),
   so Undo writes the earlier numbers as today's row (in force identical; history gains a same-numbers row). A first
   target cannot be undone (`noUndo` says so). Exact undo needs a delete policy — a migration, not this lane's.
3. **Women and unspecified athletes get no target card** (N-G2 question can't be asked on a card). PO may prefer the
   card ask the question; that is a design call.
4. `/describe-meal` is not in `NUTRITION_ROUTES` (`domain/consent/consent.ts`) — lane B should add it so the toolbox
   and every door ask the Nutrition consent first.
5. `paceLabel(1)` in `targets.ts` reads "1.0 lb / week" (toFixed(2) then one zero trimmed) — the card formats its own;
   the screen may want the same fix (not this lane's file).
6. The open-workout swap edits the autosave; it is safe because the coin (and so the chat) is hidden while the logger
   holds a live session. If the logger is ever mounted under the chat, its next autosave would overwrite the swap.
7. Live check of RLS by the Supabase MCP was refused by the session's permission classifier; the RLS facts above are
   from the repo's migrations.

## ▶ RESUME HERE

- [x] status line · cards · executors · card component · toolbox · §1.3 helper · telemetry · report
- [ ] (integrator) wire B's `mealCard` + executors into `cardFor` / `executorFor`; A mounts per the contract above
