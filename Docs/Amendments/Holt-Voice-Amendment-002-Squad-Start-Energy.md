# Holt Voice Amendment 002 — Squad Start Energy

**Status:** LOCKED 2026-09-25 on PO direction.
**Date:** 2026-09-25
**Owner:** Product
**Amends:** `Holt-Voice-Amendment-001` HV-D2 (encouraging, not cheesy) and HV-D3 (exclamation marks), for
**one moment only**: the start of a session, when the squad was just notified.

---

## 1. The request

> *"When an athlete starts a workout and the app notifies their squad, Coach Holt tells them — 'Your squad
> just got a notification that you started Upper A. Let's get after it.' … Let's get after it today. Make
> your squad proud. Let's kill it today. That vibe should be part of Coach Holt."* — PO, 2026-09-25

The athlete had no way to know that pressing Start told their squad. Holt now says so, and says it with the
energy of a coach sending you out the door.

---

## 2. Decisions

### HV-A2-D1 — The line is a receipt first. Every variant names what was sent.

Each line says the **squad** was **notified / told / pinged / got word**, and names the session when there
is one (*"…that you started Upper A"*). An athlete must never have to guess why Holt spoke up.

It appears **only when the server confirms** this start notified at least one squad-mate (`0217`
`set_training_status` → `announced: true`): a fresh start, a training visibility that clears squads, a
squad with training alerts on, and a teammate who asked for starts. A resume, a re-assert after the app was
killed, a private athlete, or a database without `0217` gets no line.

"Got a notification" is true in the inbox sense for every eligible teammate. The line never promises that a
phone buzzed — that depends on the recipient's own settings, which Holt does not know.

### HV-A2-D2 — Start-of-session energy is allowed here, and only here.

In the squad-announcement lines (`SQUAD_ANNOUNCED_LINES`, `src/domain/coach/rulebook/in-workout-voice.ts`)
Holt may say:

- *"Let's get after it."* / *"Let's get after it today."*
- *"Make them proud."* / *"Make them proud today."*
- *"Let's kill it today."*
- *"Let's go get it."* / *"Let's make this one count."* / *"Now give them something to talk about."*

This is **scoped to this line set**. Everywhere else HV-D2 stands unchanged, and a test holds these phrases
out of every other table.

**Still banned, here as everywhere:** *"beast mode"*, *"no days off"*, *"let's gooo"*, *"crush it"*,
*"killing it"* (as praise), *"champ"*/*"buddy"*/*"king"*, emoji.

### HV-A2-D3 — At most one "!" per line.

Starting a session counts as a moment worth one exclamation. Never two.

### HV-A2-D4 — The dial sets the volume (HV-D6 still applies).

| Level | Sounds like |
|---|---|
| `reminders` (quiet) | A warm receipt: *"Your squad just got a notification that you started Upper A. Have a good one."* |
| `steady` (plain) | The PO's line: *"…Let's get after it."* / *"Make them proud."* |
| `push` / `drive` (direct) | The most energy: *"Your squad just got pinged that you started Upper A. Let's kill it today."* |

### HV-A2-D5 — It says its piece and gets out of the way.

It is the first thing Holt says in the session and outranks every other line. It goes away at the first
logged set or when the athlete closes it, and the normal lines take over.

---

## 3. Where it lives

| File | What |
|---|---|
| `supabase/migrations/0217_training_status_reports_announcement.sql` | `set_training_status` returns `{announced, squads, teammates}` |
| `src/domain/coach/squad-announce.ts` | Parses the answer; picks the line (non-repeating deck, pinned to the start) |
| `src/domain/coach/rulebook/in-workout-voice.ts` | `SQUAD_ANNOUNCED_LINES` — the copy |
| `src/domain/coach/coach-says.ts` | `announce` — first priority until the first set |
| `src/hooks/useWorkoutSession.tsx` · `src/app/workout.tsx` | Carry the answer from Start to the coin |
| `src/domain/coach/__tests__/squad-announce.test.mjs` | Every variant names the squad and what was sent; ≤ 1 "!"; no cheese; scope held |

*Locked on PO direction, 2026-09-25.*
