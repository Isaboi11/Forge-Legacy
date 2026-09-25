# Coach Holt Check-ins and Reminders: Scope v1.0

**Status:** SCOPE, decisions LOCKED. PO 2026-09-24, from phone. Not built.
**Builds on:** `Nutrition-Architecture-Amendment-003` NUT-A3-D4 (tell Holt your preferences) ·
`P-5-Notifications-Architecture.md` §3.2e (the five rules for any timed push) ·
`P-5-Amendment-003-Training-Briefing.md` (the one timed push that exists) · `0120` push pipeline ·
`0159` briefing sender · `0179` Holt nudge budget · `0204` Holt notes

PO: *"If you tell him to remind you it should be sent with a push notification… Also Coach Holt saying he
can remind if they want or that he will send a message keeping them updated."*

---

## 1. What the athlete gets

- **Ask Holt in plain words:** *"remind me at 3 every day where I'm at with my numbers and macros."*
- **Holt confirms it back,** the way a coach would: *"Done. Every day at 3 pm I'll send where you're at,
  calories and protein. Say 'stop the 3 pm check-in' any time."*
- **At 3 pm a push arrives** even with the app closed. Tapping it opens Nutrition (or wherever the reminder
  points).
- **Holt offers first, too,** where it fits: after someone sets a target, or after a week of logging,
  Holt can say once *"Want me to check in each afternoon with where you're at?"* Yes sets it up; No is
  remembered and never asked again.
- **See and manage them in one place:** Settings → Notifications → *Holt check-ins* lists every reminder with
  its time, a switch and Delete. The same can be done by typing to Holt.

## 2. Kinds of reminder (v1)

| Kind | Example ask | What the push says |
|---|---|---|
| **Food check-in** | "remind me at 3 where I'm at" | numbers from the diary plus one coach line |
| **Weigh-in** | "remind me to weigh in Monday mornings" | a nudge to weigh in, plus the last trend |
| **Training time** | "remind me at 6 to train" | today's planned session by name |
| **Your own words** | "remind me at 9 pm to stretch" | the athlete's text, as they said it |

Out of v1: location-based reminders, reminders about other people, anything recurring faster than daily.

## 3. How Holt sounds (the "real coach" part)

A check-in is **the numbers plus one human line** that fits the day, for example:

- Lift day, protein behind: *"1,420 of 2,400 cal, 60 g protein to go. Heavy legs today, so a proper dinner
  does the work."*
- Rest day, on track: *"1,650 of 2,400 cal, protein nearly there. Easy day, you're right where you want
  to be."*
- Race in two days: *"Race Saturday: today and tomorrow, lean on carbs: rice, pasta, bread."*
- Nothing logged yet: *"Your day: 2,400 cal and 180 g protein to aim for."* It **never** says *"you
  haven't logged"* (P-5 §3.2e forbids absence-referencing).

**The numbers are never written by a model** (NUT-D4); they come from the diary. **The human line comes
from a written library** of coach lines, picked by rules (training day, rest day, race soon, streak,
protein gap). No AI call per push, so there's no cost per reminder and no chance of an unsafe sentence at
3 pm. An AI-written line can come later as a Premium AI option once the library has proven the tone.

## 4. Safety (non-negotiable)

- **Never pushes anyone to eat less.** No "you're over", no praise for a very low day.
- **Sustained under-eating** (the care response owed before Nutrition opens) takes over the check-in: the
  numbers drop and a care line replaces them. The reminder never cheers the athlete on while they're
  eating too little.
- **Medical stop rules apply** (conditions, pregnancy, symptoms). Holt won't set a reminder that is really a
  medical instruction ("remind me to take my insulin" → a plain reminder in the athlete's own words, with
  no coaching attached).
- **Ships after** Holt's four safety fixes and the under-eating response.

## 5. The P-5 §3.2e test: every timed push must pass all five

| Rule | How check-ins pass |
|---|---|
| Opt-in | Only exists because the athlete asked (or said yes to Holt's offer) |
| Self-directed | The athlete chose the time and the subject |
| Content-bearing | Real numbers or the athlete's own text, never "come back to Forge" |
| Self-silencing | Stops when switched off. A food check-in pauses itself after 7 unopened in a row, and Holt asks once in the app whether to keep it |
| Never absence-referencing | No "you haven't…", no streak-loss warnings |

## 6. Lock-screen privacy

A push shows on the lock screen. Food numbers are private data (P-6 Amendment 002). **Open decision (§8
#2)**: whether numbers show on the lock screen, or only *"Holt · your 3 pm check-in"* until it's opened.

## 7. How it's built

- **One new table,** `holt_reminders`: athlete, kind, days of the week, local time (15-minute steps), the
  athlete's own text (for "your own words"), on/off, last sent. Owner-only access.
- **The existing sender, extended, not a second clock.** The briefing job already runs every 15 minutes
  in each athlete's own time zone (`profiles.tz`). It gains check-ins and writes to the same
  `push_outbox`, and the existing drain sends them within a minute.
- **One new notification kind,** `holt_checkin`, with its own switch in Settings (on by default, because the
  athlete created it). ⚠ Adding it rewrites `push_pref_key`/`push_pref_default`. It must start from their
  **latest** bodies (0202), and must not collide with the coach app's `0195`, which rewrites the same two
  functions on another branch.
- **Typing to Holt** (Premium AI) parses the ask into a reminder through `coach-interpret`, the same way
  typed program edits work, and Holt confirms before saving.
- **Without Premium AI,** the same reminders can be set from Settings → Holt check-ins with a time picker.
  Holt's offer (§1) then opens that screen instead of a chat.
- **If notifications are off** on the phone (iOS asks only once, at sign-in), Holt says so plainly and
  points to Settings. He can't re-ask; iOS doesn't allow it.
- **No new app build is needed.** Push, time pickers and the chat already exist on build 8. This is a
  migration, the sender change and screens (OTA).

## 8. Decisions (PO, 2026-09-24)

**HC-D1: everyone.** Reminders can be set from Settings by every athlete. Setting one by typing to Holt stays Premium AI.
**HC-D2: lock screen.** The athlete chooses when setting a reminder up. Default: numbers hidden (*"Holt · your 3 pm check-in"*).
**HC-D3: Holt's offer, two chances.** Holt offers once (after the first target is set). If the athlete says no or ignores it, he offers **once more about a month later**. That second offer says it can be changed any time in Settings. After that, never again unprompted.

### Original options (kept for the record)

1. **Who gets it:** everyone (set from Settings) plus Premium AI (set by typing to Holt)? Or Premium AI only?
   *Recommendation: everyone, because reminders cost almost nothing. Typing to Holt stays Premium AI.*
2. **Numbers on the lock screen:** show them, or only "Holt · your 3 pm check-in"?
   *Recommendation: the athlete chooses when setting it up; default hidden.*
3. **Holt offering:** when should Holt offer a check-in unprompted? *Recommendation: once after the
   first target is set, once after the first full week of logging, never again after a No.*

## 9. Build order

1. Safety fixes + under-eating response (already required before Nutrition opens)
2. `holt_reminders` + the sender + the Settings list (every kind, time picker)
3. Coach-line library + food check-in content
4. Typing to Holt: parse → confirm → save (Premium AI)
5. Holt's offers (§1), through the existing nudge budget (`0179`)
