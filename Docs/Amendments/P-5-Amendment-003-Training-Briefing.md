# P-5 Amendment 003 — Morning Training Briefing

> ✅ **MERGED INTO THE PARENT — `P-5-Notifications-Architecture.md` v1.5, 2026-08-14, the same day this
> locked.** Inventory item 22 (§2), Section F (§3.2e), and the §4 state-matrix rows are all in the parent
> document; this file is retained as the reasoning record, not as pending work. Merged immediately and on
> purpose: *"amendment locked but never applied"* is this project's recurring documentation failure, and
> `Amendment-Reconciliation-Audit` exists because of it.

**Status:** LOCKED (merged)
**Date:** 2026-08-14
**Owner:** Product
**Amends:** `P-5-Notifications-Architecture.md` v1.4 (LOCKED) → v1.5
**Implemented by:** migration `0159_training_briefing.sql`, `src/domain/settings/briefing.ts`,
`src/domain/settings/notifications.ts`, `src/domain/notifications/destination.ts`,
`src/app/notifications.tsx`

---

## 1. The request

> *"A friend said it would be nice to receive a notification in the morning letting him know what his
> workout for the day was, and maybe a 'let's get it' type of message."* — PO, relaying a tester, 2026-08-14

---

## 2. Why this needed an amendment rather than a toggle

P-5 §1's dependency audit produced a finding that this request runs straight into:

> **What this audit confirms is absent from every locked document** (and is therefore not proposed here):
> administrative/account/security notifications …, **any marketing or re-engagement notification**, and any
> centralized in-app notification tray or center.

Every one of the twenty-one categories in P-5's inventory is **caused by another person** — an invitation,
a join, a comment, a reaction, a squad-mate starting a session. This is the first that is caused by a
clock. Three further locked rules bear on it directly:

- **`Calendar-System-Architecture-v1.0` CAL-D19** — the Calendar *"never notifies about inactivity"*, and
  a scheduled workout that is not performed *"simply lapses — never converted into a 'missed workout,'
  never flagged, never counted against the athlete, and never notified as a failure."*
- **DNA §8, Progress Without Pressure** — *"The athlete should always feel invited. Never pushed."*
  And Deliberate Interaction: *"Not addictive. Not compulsive. Not engineered for endless engagement."*
- **`Home-Screen-Wireframe-Spec-H1.md`** — H-1 fails when it *"communicates what the athlete has NOT
  done"*, and is explicitly *"not a notification surface: does not present alerts, reminders, or prompts
  for missed activity."*

**The distinction this amendment turns on, and the only reason it is grantable:**

> **A briefing states what is next. A nudge comments on what you did not do.**

The first is H-1's own job — *"What should I focus on today?"* — delivered to the lock screen so the
decision to train can be made before the app is opened. The second is the pattern every rule above
forbids. Everything in §3 exists to hold the feature on the near side of that line.

---

## 3. Decisions

**P5B-D1 — One new category, in its own section (Section F), default OFF.**
`training_briefing`, stored on `profiles.notif_prefs` like every other key, gated through the same
`push_prefs_allows()` check. OFF follows P-5 §3.1's ambient-broadcast precedent: this is not a request
awaiting a reply (§3.2's ON class), and nobody is waiting on the athlete's response to it.

⚠ It does **not** follow the `squad_training` exception (P-5 v1.4 §3.1, default ON). That row defaults ON
because two people on two screens must opt in before it can fire at all, so OFF would silently discard a
preference set elsewhere. This one needs nobody's permission but the athlete's, so no such trap exists.

**P5B-D2 — It says "Next up", never "today".**
Forge Legacy has no calendar. `planned_workouts` (0136) carries no date, `ProgramStructure` has no weekday
field (`daysPerWeek` is a count), and progress advances only when a `program_sessions` row is written —
never with the clock, which `Program-Architecture-Amendment-001` §4 forbids as a judgement input. "Today's
workout" is a claim the schema cannot support and would be wrong the first time anyone trained on a
Tuesday instead of a Monday.

**P5B-D3 — THE QUIET RULE. It announces any one open session at most twice, then goes silent.**
Because the answer is a function of what has been *done* and not of the date, a daily job returns the same
session every morning until the athlete trains or skips. Accurate on day one; by day five it is a repeated
tap on the shoulder about something undone — **an inactivity notification arrived at by accident**, which
is precisely CAL-D19.

So after two announcements of the same item the briefing stops, and resumes only when a `program_sessions`
row lands. It **never states that it went quiet, never counts the days, and never refers to the silence
when it resumes.** The app backs off rather than escalating, which is DNA §8 expressed as a mechanism
instead of a copy guideline.

⚠ **Completion is read only in order to STOP SENDING.** Nothing may ever produce a message *about* an
unfinished session. The count gates a `continue`, never a different body — asserted by test.

**P5B-D4 — Silence is the correct answer to an empty schedule.**
No active program and no planned workout ⇒ no notification. "Nothing planned — get after it" would be a
push whose entire content is that the athlete has not done something, which is the one thing this category
may never send. (Same instinct as 0073's rule that a bare rejection is worse than no notification at all.)

**P5B-D5 — Tone binds to `coachIntensity`; no second tone control is created.**
`profiles.app_prefs.coachIntensity` (`reminders | steady | push | drive`, CI-D1) already exists because the
PO had found the range: *"Some people want to be pushed… Some people want just reminders. So it's a very
big range."* The register (CI-D10) selects the closing line; a separate setting could disagree with the
in-session voice and would be a rival answer to a question already answered.

⚠ **`reminders` still receives the briefing — without a line.** CI-D5: *"`reminders` is not 'no coach'; it
is the technique cue and nothing else"*, and the PO's own example of that level was a *daily* helpful
coaching reminder. This notification is that, minus the hype.

⚠ **Experience resolves to `beginner`, per CI-D8.** Experience is device-local (`coach-memory.ts`), so the
server never has it. CI-D8's rule for an absent experience is the safe row, not the middle one — meaning
`push` speaks in `plain` rather than `direct`. The voice is never louder than the dial has earned.

**P5B-D6 — No line may characterise elapsed time, absence, or anything undone.**
The copy lives in `briefing_lines` as rows, and a regex test with its own positive controls asserts the
rule over them. This is CI-D11 (*"no line characterises the set just logged"*) pointed at a lock screen,
and H-1's failure condition applied to a surface outside H-1.

**P5B-D7 — The athlete chooses the days and the hour; those days are NOT a training schedule.**
`briefing_schedule` stores which weekdays the briefing fires and at what local hour (`profiles.tz`). It is
**not** "I train Mon/Wed/Fri" — that concept belongs to `Calendar-System-Architecture-v1.0` (LOCKED,
unbuilt) and would hand the app the ability to decide that a Tuesday was a failure. The athlete is only
choosing when to be told.

The default is **every day**, which the quiet rule makes reasonable rather than noisy: a seven-day
schedule self-limits to roughly two notifications per session whatever the athlete's real rhythm is.

**P5B-D8 — A tapped briefing opens Home, not the workout it named.**
The sender runs in Postgres, where the `resume` face of the hero card is invisible — an unfinished session
lives in the device's local autosave. Home re-runs `composeHome()` against the full picture
(resume > program > planned). Launching the named workout directly would silently discard work in progress.

**P5B-D9 — It is not a branch of `notification_events_for`, and produces no `/inbox` row.**
Nobody caused it, it belongs to no relationship, and it has no actor. It writes `push_outbox` directly —
the shape 0137 established for the operator signup alert — rather than forcing a seventeenth branch into a
union six triggers depend on. **This is the one category in P-5 with no in-app counterpart**, which is a
narrow and deliberate exception to §4's "the in-app surface always shows regardless" principle: the in-app
surface for "what's next" is the Home hero, which is always there and was never gated by this toggle.

---

## 4. Inventory addition (P-5 §2)

| # | Notification | Trigger | Recipient | Default | Authority |
|---|---|---|---|---|---|
| 22 | Morning briefing | The athlete's own chosen weekday + local hour, via `pg_cron` | The athlete | OFF | This amendment (P5B-D1) |

Item 22 is the first row in this table whose **Trigger** column names no person.

---

## 5. Section F — Training (P-5 §3)

| Setting | Type | Default | Maps To |
|---|---|---|---|
| Morning Briefing | Toggle + schedule | **OFF** | `notif_prefs.training_briefing`; days and hour in `briefing_schedule` |

Its own section rather than a row under Squad Activity or Requests, because it is neither: no squad is
involved and nobody is asking the athlete for anything. It is the only self-directed control on the screen.

## 6. State matrix addition (P-5 §4)

| State | Push Fires? | In-App Surface Still Shows? |
|---|---|---|
| Morning Briefing ON | Yes — on the chosen days, at most twice per open session | The Home hero always names the next session regardless (H-1) |
| Morning Briefing OFF | No | Unchanged — the Home hero is not gated by this or any other toggle |

---

## 7. What did not change

| Document | Status |
|---|---|
| P-5 §1 "ceremonies never push" | Unchanged. M-1/M-2/M-4 still fire no notification of any kind. |
| P-5 §1 "no marketing or re-engagement notification" | **Narrowed, not lifted** — see §8. |
| CAL-D19 / DNA §10 anti-streak and "days since" bans | Unchanged and now test-enforced (P5B-D3, P5B-D6). |
| `notification_events_for` | Untouched — sixteen branches, no seventeenth (P5B-D9). |
| Every other toggle and default in P-5 | Unchanged. 0159 restates both preference functions in full precisely so none of them regresses; a test asserts `squad_training` survived. |

## 8. The narrowing, stated as tightly as possible

P-5 §1's finding stands in its general form. The exception this amendment carves is bounded to:

- **opt-in** (default OFF, and the schedule row is only written when the athlete turns it on);
- **self-directed** (it reports the athlete's own plan back to them, and mentions no other person);
- **content-bearing** (it names a specific session, and sends nothing when it has nothing to name);
- **self-silencing** (it stops after two unactioned announcements rather than escalating); and
- **never absence-referencing** (no elapsed time, no missed session, no streak, enforced by test).

A notification failing **any** of these five is the re-engagement pattern P-5 §1 rules out, and is not
authorised by this amendment.

---

## 9. Checklist

- [ ] P5B-D1 — one category, Section F, default OFF, gated by `push_prefs_allows`
- [ ] P5B-D2 — "Next up", never "today"; no calendar claim
- [ ] P5B-D3 — the quiet rule: at most two announcements per open item, then silence, never explained
- [ ] P5B-D4 — nothing to say ⇒ nothing sent
- [ ] P5B-D5 — tone from `coachIntensity`; `reminders` receives facts only; experience → `beginner` (CI-D8)
- [ ] P5B-D6 — no line references elapsed time or anything undone (test with positive controls)
- [ ] P5B-D7 — chosen days are a delivery schedule, never a training schedule
- [ ] P5B-D8 — tap opens Home, so the device-local resume is honoured
- [ ] P5B-D9 — direct `push_outbox` write; no union branch; no `/inbox` row

---

*P-5 Amendment 003 — Morning Training Briefing*
*Authority: `P-5-Notifications-Architecture.md` v1.4 (LOCKED), `Calendar-System-Architecture-v1.0` (LOCKED)
CAL-D19, `FORGE_LEGACY_PRODUCT_DNA.md` §8/§10, `Home-Screen-Wireframe-Spec-H1.md`,
`Coach-Adaptive-Learning-Amendment-002.md` CI-D1/D5/D8/D10/D11*
*Status: LOCKED*
