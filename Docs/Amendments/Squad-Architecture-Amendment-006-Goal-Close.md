# Squad Architecture — Amendment 006: When a Squad Goal Ends

**Amends:** `Squad-System-Architecture-v1.0.md` §3 (SQ-D3.1, SQ-D3.5) · §9 (SQ-D9) · §12 (SQ-D12) · `Squad-Architecture-Amendment-004-Goal-Detail-Screen.md` (S-2b) · `P-5-Notifications-Architecture.md` (`squad_goals` default)
**Status:** 🔒 LOCKED — PO answered all three decisions 2026-09-10 (§9: D1 ON by default · D2 extend before the deadline only · D3 no member control)
**Date:** 2026-09-10 (proposed and locked same day)
**Design authority:** none yet — no `.dc` exists for a closed goal card, the close post, or the owner actions
**Migration:** not yet written (Part 2, §8)

---

## Section 1 — The case

PO, 2026-09-10: *"A goal in the squad Moch 1 ended without anyone knowing. It didn't prompt us or post
anything. Didn't send a notification, and it still looks like it's going right now."*

All four parts of that are true, and none of them is a regression. **Nothing was ever built to happen
when a goal ends.**

| What the PO expected | What the code does |
|---|---|
| Something fires at the deadline | Nothing. No status column, no trigger, no cron job. 0103's header chose "expiry is derived at read time" — it only freezes the running total at `goal_ends_at`. |
| A feed post | None. No code inserts a goal post, met or not. SQ-D3.5 specified one for a **met** goal; it was never built. |
| A notification | None. `squad_goals` is a preference key with no event behind it (`notifications.ts:28-31`), and it defaults **OFF** (P-5). |
| The goal to look finished | S-2 still says **Current Goal**, keeps the live bar and the owner's pencil, and adds one small line: *"Goal ended · 412 workouts logged"* (`squad/[id].tsx:663`). Goal Detail (S-2b) never reads `endsAt` at all. It still shows "N to go" and "Projected Close". |
| A record of it | Only if the goal was **met**, and only once the owner sets or clears the next goal (`archive_squad_goal`). An unmet goal leaves no trace anywhere. |

The spec gap is real as well. SQ-D3 covers a goal that is **met**. It has no rule for a deadline that
passes unmet. Missions have one (SQ-D4.5: *"simply ends — no 'failed mission' framing, no shame language,
no extension by default"*). Goals never got the equivalent.

---

## Section 2 — SQ-A6-D1: a goal has four ways to end, and the server closes it

| Outcome | When | Stored as |
|---|---|---|
| **Met** | Progress reaches the target, on or before the deadline | `met` |
| **Closed** | The deadline passes with progress under the target | `closed` (never "failed" — see §5) |
| **Removed** | The owner clears it mid-run (existing *Remove goal*) | `removed` |
| **No deadline** | Pre-0103 goals, or ones set without an end date | These close only as *Met* or *Removed* |

**The server closes goals, on a schedule.** A pg_cron job (every 15 minutes, beside the push drain from
0120) finds each squad whose goal has reached its target or passed `goal_ends_at`, and closes it once.

⚠ **Closing lazily is the bug itself.** The Weekly Summary (0057) is generated when someone first opens
the feed. That works for a recap nobody is waiting on. For a goal it would reproduce this exact report:
nothing happens until somebody opens the squad, and the reason nobody opened it is that nothing happened.

**Met closes the moment it's met.** This is SQ-D3.5 as written: *"When the target is reached, the Goal
closes."* A goal met eight days early says so ("8 days early"). The owner sets the next goal from there
(§6).

---

## Section 3 — SQ-A6-D2: what the squad sees on close

### Met

- **Feed post.** An authorless system post, the same authorless shape as the Weekly Summary (0057 made
  `author_id` nullable for this). It carries the goal name, the final total over the target, and the
  timing: "on the final day" or "8 days early". It also says how many members contributed, as a count
  and never as names (SQ-D3.5: *"No member is singled out as having 'carried' or 'missed' the goal"*).
  It is drawn as a `MilestoneBand` — this is a ceremony share, and the band already exists for
  them — and gets Respect and comments like any post.
- **Notification.** Inbox row + push: *"Moch 1 hit its goal — 500 workouts."* Under the `squad_goals`
  preference (default: D1).
- **Honor.** The existing `squad_goal_complete_*` honors, through the existing evaluator. **Never a
  push.** The M-2 modal shows it the next time each member opens the app (SQ-D10.2 — ceremonies never
  push).

### Closed (deadline passed, not met)

- **Feed post.** Same system post, same band, quieter eyebrow: **"Goal closed"**. It leads with what the
  squad did: *"412 workouts logged together, toward 500."* No "missed", "short", "failed" or deficit
  number (see §5).
- **Notification.** Inbox row + push: *"Moch 1's goal closed — 412 workouts logged together."* Same
  preference.
- **No honor.**

### Removed

- No post and no push. The owner took it down on purpose, and a feed entry announcing the removal
  would read as a public correction. It is recorded in the history (§7) as **Removed**.

---

## Section 4 — SQ-A6-D3: the goal card stops pretending

A closed goal keeps its card, in a **closed state**, until the owner sets the next one. The card
clearing the instant it closes would repeat the problem this amendment exists for: a goal that is just
gone.

| | Live (today) | Met | Closed |
|---|---|---|---|
| Section label | Current Goal | **Goal Complete** | **Last Goal** |
| Bar | bronze, filling | full, bronze | stopped where it ended, muted (no bronze) |
| Caption | `412 / 500 workouts · 82% complete` | `500 / 500 workouts · met Sep 22` | `412 workouts logged · closed Sep 30` |
| Deadline line | `8 days left` | `8 days early` / `on the final day` | — |
| Owner's pencil | yes | **no** — you don't edit a finished goal | **no** |
| Owner actions | — | §6 | §6 |
| Members | — | "The owner sets the next goal." | same |

Goal Detail (S-2b) follows the same three states. When the goal is closed it drops "N to go",
"Projected Close" and "When this closes", keeps the final total and the contribution breakdown
(SQ-A4-D3 rules unchanged), and shows the same owner actions.

The weekly recap stops attaching a closed goal (0057 currently attaches it to every week after the
deadline, with a delta of about 0).

---

## Section 5 — Anti-shame, carried from Missions to Goals

SQ-D4.5 is adopted for Goals, word for word where it fits: **a goal that reaches its end date without
reaching its target simply closes — no "failed goal" framing, no shame language, no extension by
default.**

What that permits and forbids, concretely:

- ✅ The final total, and the target it was set against. That is the goal, stated honestly. The card
  already shows both.
- ✅ "Last Goal", "Goal closed", "logged together".
- ❌ "Failed", "missed", "fell short", "88 to go", a red or warning colour, a countdown to nothing.
- ❌ Any per-member line on the close post.

---

## Section 6 — SQ-A6-D4: what the owner can do next

Owner only (SQ-A4-D5). Members see the closed card and no controls.

| Outcome | Primary | Secondary |
|---|---|---|
| **Met** | **Set the next goal** (opens the editor empty) | **Raise the bar** (same metric and length, new dates, target prefilled +20%, editable) |
| **Closed** | **Try again** (same goal, same length, new dates starting today, everything editable) | **Set a new goal** · **Extend** (D2) |

All of these open the goal editor that already exists, prefilled. None of them needs a new write
path: `setSquadGoal` already banks the old goal and writes the new one.

**Closing soon.** Two days before a deadline, if the goal is below target, the **owner alone** gets an
inbox row: *"Moch 1's goal closes in 2 days — 412 / 500."* The row opens the editor, where the end date
can be moved. This is when an extension is actually useful: before the squad has been told the goal is
over. No push, and members never see it.

---

## Section 7 — Past Goals shows every goal, not only the met ones

S-2b's Past Goals reads `squad_goal_completions`, which only ever gets **met** goals. A squad that
closed three goals and met one currently has a history showing one.

A new log (`squad_goal_closures`: squad, title, metric, target, final total, started, ended, outcome,
closed_at) records every close. Past Goals reads it and lists Met and Closed goals, plus Removed goals
in a quieter style.

⚠ **Not by widening `squad_goal_completions`.** The Squad honors count rows in that table
(`squad_goals_completed`, 0099). Adding unmet rows there would mean rewriting the honor metric function,
and rewriting a live SQL function has broken this project before. The completions table stays as it is,
and the new log sits beside it.

---

## Section 8 — Build, in two parts

**Part 1 — the honest card (client only, ships by OTA, no migration)**

1. `goalWindow` in `squad-live.ts` returns a three-way state (`live` · `met` · `closed`), not a boolean.
   It covers met-before-the-deadline, which today only shows as a 100% bar.
2. S-2 goal card and S-2b render the three states in §4.
3. Owner actions from §6, all going into the existing editor prefilled.
4. `clearSquadGoal` also nulls `goal_ends_at`. Today it leaves a stale deadline on the row.
5. Squad Settings' goal row uses the same state.

This fixes "it still looks like it's going" on its own, even before the migration.

**Part 2 — the close event (migration + cron)**

1. `squads.goal_closed_at` + `goal_outcome`; the `squad_goal_closures` log.
2. `close_due_squad_goals()`, idempotent and keyed on `(squad_id, goal_started_at)`, run by pg_cron every
   15 minutes. It freezes the total, writes the log row, and inserts the system post.
3. A new inbox kind, `squad_goal_closed`, fanned out from the system post the way `squad_recap` is
   (0126). Push goes through `push_enqueue_for` under `squad_goals`.
4. The owner-only "closes in 2 days" inbox row (§6).
5. Weekly recap stops attaching a closed goal.
6. **Backfill:** the first run closes every goal already past its deadline. Goals that ended in the last
   7 days — including Moch 1's — get their post and notification. Older ones close silently into the log.
   Nobody gets a push about something that ended in June.

After Part 2, Part 1's card reads `goal_outcome` rather than working it out from the clock.

### As built (2026-09-10) — two departures from the plan above, both forced

1. **The notification union is not touched.** Part 2 steps 3–4 planned a new branch in
   `notification_events_for`, plus preference entries. Those functions, along with `push_pref_key`
   and `push_pref_default`, are also restated by `0195`/`0196` on `feat/forge-coach`, which are
   written but not applied. Whichever lands second erases the other. So instead:
   - `squad_goal_record_close` writes the push to `push_outbox` directly, the shape `briefing_send`
     (0159) already uses. It reads `squad_goals` itself, with its own default of ON (D1).
   - The inbox rows (`squad_goal_met`, `squad_goal_closed`, and the owner's `squad_goal_closing`) come
     from their own function, `squad_goal_notifications()`. The client merges them into `/inbox` and
     into the bell count.
   - `push_pref_default('squad_goals')` still says false, and nothing reads that line.
     `push.test.mjs` pins the toggle to the sender's default and fails if a union kind ever maps to
     `squad_goals`.
2. **The job runs each squad's sum as that squad's owner.** `squad_metric_sum` answers 0 for a
   private squad when there's no signed-in user, which is how a pg_cron job runs.
   `squad_goal_act_as` sets the request's user to the owner, for that one transaction only, and it is
   revoked from PUBLIC. This reuses the exact existing sum instead of copying its five metrics into a
   twin that could drift.

Also found and fixed while building it:
- The goal editor opened **blank** when Squad Goal Detail sent the owner back to edit (`?editGoal=1`).
  Only the pencil filled the fields in, so Save would have overwritten the live goal with a blank one.
  The editor now reads its starting values from `goalDraft` for every entry point.
- The editor reopened start dates with `iso.slice(0, 10)`. East of Greenwich that shows the day
  before the real start.
- A post the squad wrote (the Weekly Summary, and now a goal close) arrived with `authorId: null`
  while the type said `string`. It was headed "Athlete", with a profile link to nobody. It is now
  headed by the squad itself.

Files: `supabase/migrations/0200_squad_goal_close.sql` + `supabase/apply/pending-0200.sql` ·
`src/domain/squad/goal-state.ts` (+ test) · `src/app/squad/[id].tsx` · `src/app/squad/[id]/goal.tsx`
· `src/app/squad-settings.tsx` · `src/app/squad-post/[id].tsx` · `src/app/inbox.tsx` ·
`src/data/{squad-live,squad-feed-live,notifications-live}.ts` · `src/domain/notifications/destination.ts`
· `src/domain/settings/notifications.ts` · tests `src/app/__tests__/squad-goal-close.test.mjs`,
`src/domain/notifications/__tests__/push.test.mjs`.

**Rollout order:** deploy web + OTA **first**, then paste `pending-0200.sql`. The job's first run
comes within 15 minutes of the paste and writes the goal post, which only the new build heads with
the squad's name.

---

## Section 9 — Decisions (all taken, PO 2026-09-10)

**D1 → ON by default. D2 → before the deadline only. D3 → no member control.** The PO took all three
recommendations.

| # | Decision | Recommendation (taken) |
|---|---|---|
| **D1** | Should goal-close pushes be **ON by default**? P-5 locked `squad_goals` default OFF. With OFF, building everything above still leaves most of the squad without a notification — which is half of this report. | **ON.** It fires about once a month per squad, and it is the one squad event every member signed up for. |
| **D2** | Where does **Extend** live? | **Before the deadline only** — through the owner's "closes in 2 days" row and the editor's end date. After the squad has been told the goal closed, reopening it muddles the record and the post. After close, the owner gets Try again / Set a new goal. |
| **D3** | Does a **member** get anything to do on a closed goal? Setting goals is owner-only (SQ-A4-D5). | **No control.** The card says "The owner sets the next goal." A "suggest a goal" feature is a separate idea, not this amendment. |

Settled by the existing spec and not reopened here: a met goal closes when it's met (SQ-D3.5); goals
are owner-only (SQ-A4-D5); ceremonies never push (SQ-D10.2); contribution is never ranked (SQ-A4-D3).

---

## Section 10 — Reconciliation this amendment triggers

- `Squad-System-Architecture-v1.0.md` §3: add SQ-D3.7 (goal expiry, from §5) and point SQ-D3.5 here.
- `Squad-Detail-Wireframe-Spec-S2.md` §15.3: still says *"Any member may set or edit the active Goal"* —
  wrong since Amendment 004. Fix it in the same pass, along with the closed card states from §4.
- `Squad-Management-Permissions-Spec-S3.md:218`: its permission table still reads Goal = Yes/Yes, which
  contradicts its own banner and §6.6.
- `P-5-Notifications-Architecture.md`: `squad_goals` default (D1), and the new `squad_goal_closed` kind.
