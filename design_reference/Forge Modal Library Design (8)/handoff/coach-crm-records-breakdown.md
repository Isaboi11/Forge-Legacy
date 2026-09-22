# Forge Coach — CRM & Records
## Line-by-line breakdown of what is designed

Scope: the coach-facing product — a coach with paying clients, weekly check-ins, programs,
messages, and a longitudinal record per client. This is **not** Coach Holt (the in-app AI
coach for the athlete). Different product, different user.

### Files

| File | Lines | What it is |
|---|---|---|
| `Forge Coach Check-in Review.dc.html` | 2,980 | The desktop app. 1440×900. Seven screens, all states. Canonical. |
| `Forge Coach Mobile.dc.html` | 697 | The phone app. Same feature set, navigation-stack model. |
| `Forge Coach Wireframes.dc.html` | 516 | Four low-fi frames that preceded the above (roster, review, photos, program editor). |
| `Forge Client Messages.dc.html` | 174 | The **client's** side of the same thread. 402×874. |
| `forge-coach.js` | 257 | Walkthrough/annotation harness. Not product code. |

The desktop file is the source of truth. Mobile is a port; where they disagree, desktop wins.

---

# 1 · Data model

Nine constants in `Forge Coach Check-in Review.dc.html`. They mirror the app's real schema
where one exists — `LIBRARY` is annotated as mirroring `src/domain/training/schema.ts`
`ProgramDefinition`.

## `CLIENTS` — the review queue (5)

The people who have submitted a check-in and are waiting on a reply. Per client:

- `id`, `name`, `initials`, `program`, `week`, `weeks`, `day` (the weekday they checked in)
- `weight`, `wDelta` ("down 2 lb this week"), `wDir` (`up` | `down` | `flat` | `watch`)
- `sessions` ("4 of 4"), `sDelta`, `sDir`
- `lifts[2]` — `{label, value, delta, dir}`, the two lifts worth showing this week
- `then` / `thenAlt` / `thenLast` — three photo-comparison anchors (Week 1, a mid week, last week)
- `answers[]` — `{q, a}`, the client's own words, verbatim
- `draft` — a pre-written reply the coach can accept, edit, or dismiss

Seeded: Sarah Vance, Marcus Hale, Dana Okafor, Rosa Delgado, Kai Whitmore.

## `ROSTER` — everyone else (15)

`id, name, initials, program, week, weeks, last, days, status, joined`.
`days` is days since last check-in and drives every "quiet" calculation.
`status` ∈ `replied` `asked` `quiet` `notstarted`.
Total active roster = 5 + 15 = **20**, against a `PLAN_CAP` of 30.

## `PROFILE` — the longitudinal record (Sarah)

The deep record behind the client profile. Weekly rows are the spine everything derives from.

- `weeks[7]` — `{w, date, weight, done, of, focus, blurb, answers[], reply}`.
  Week 7's `reply` is `null` — that is what makes her "needs you".
- `measures[5]` — chest/waist/hips/arm/thigh, `then` → `now` in inches
- `lifts[9]` — per lift: `top[7]` (heaviest set per week), `reps[7]`,
  `atLoad: {load, reps[7]}` (reps at a fixed load — the second metric), optional `flag`
  ("Stalled 3w" on bench)
- `log[6]` — the coaching log. `{what, when, state, outcome}`,
  `state` ∈ `done` `partial` `open` `missed`
- `payments[6]` — date, amount, state. $199 then $249 × 5.
- `pastBlocks[3]` — program history with spans

## `LIBRARY` — programs (6)

`id, name, family, difficulty, theme, art, durationWeeks, frequencyPerWeek, structure,
assigned, description, goals[], blocks[]`.

Only **Powerbuilding II** is authored in full: three blocks (Weeks 1–4, 5–8, 9–12), each with
four workouts coded A/B/C/D, each workout carrying `warmup[]` and `main[]`.
`main[]` rows are `PRESET(displayName, sets, reps, restSec, load, substitution)` —
`load` is the one field added beyond the app schema, and `substitution` is the pre-approved
swap (Bench Press → Dumbbell Bench Press 4×8 in Weeks 5–8).

The other five (Base Build, Hypertrophy A, Strength Foundation I, Athletic Prep, Lean Block)
have metadata and empty `blocks[]` — they render in the library, not the detail editor.
Strength Foundation I carries `forge: true` — a Forge-authored program, copy-to-edit.

## `OVERRIDES` — per-client program edits

Keyed `clientId → 'W<week>|<workoutCode>|<exerciseName>' → {sets?, reps?, load?, restSec?, note?, at}`.
Sarah has three: a Week 8 bench load drop to 195 with a pause note, Week 8 incline at 4 sets,
Week 9 squat pushed to 325. **Overrides ride on top of the template; the client stays on
Powerbuilding II and every other client on it is untouched.**

## `THREADS` — one continuous thread per client (8)

`{unread, last, messages[]}`. Messages are `{from: 'client'|'coach', kind, at, text, meta?, week?}`,
`kind` ∈ `text` `video` `photo` `checkin`. Check-in replies land in the same thread as a
marked entry, so **the coach never has two places to look for what was said**.

## `SAVED_REPLIES` (6), `FILTERS` (6), `TABS` (7), `POSES` (6)

Canned responses (machine swap, missed a session, sore vs hurt, eating around training,
deload explained, ask for a form check); roster filters; profile tabs; the six photo poses
(front, side, back, front flexed, arms up, back flexed).

---

# 2 · Navigation & state

One `screen` value routes the whole app: `today` · `roster` · `client` · `programs` ·
`messages` · `form`. `today` has a sub-view (`todayView`: `landing` | `review`).
`programs` has three (`progView`: `library` | `detail` | `new`).

Left rail, 208px, four items with live counts:

| Item | Count | Routes to |
|---|---|---|
| Today | check-ins pending | `today/landing` |
| Roster | 20 active | `roster` (stays lit on `client` too) |
| Programs | — | `programs/library` |
| Messages | threads whose last message is from the client | `messages` |

The rail **collapses to 64px** in check-in review — the one screen that wants the width.
`backTo` remembers where a profile was opened from (roster · programs · messages) so back
returns there.

State keys: `idx` (queue position), `drafts{}`, `replied{}`, `dismissed{}`, `compare{}`,
`filter`, `query`, `picked{}` (roster selection), `threadId`, `msgFilter`, `msgDrafts{}`,
`sent{}`, `bcFilter`, `bcBody`, `progId`, `weekIdx`, `overrideOf`, `insKey`, `edits{}`,
`assignPick{}`, `clientId`, `tab`, `liftMetric`, `pose`, `openWeek`, `openBlockWeek`,
`historyDepth`, `notes{}`, `cmpThen`, `formCfg{}`, `newForm{}`.

**Drafts persist across navigation.** Leave a half-written reply, go to the roster, come
back — it is still there. Same for message drafts, per thread.

---

# 3 · Today (landing)

The screen a coach opens on. Line 275.

- **Date line** — "Sunday, March 6", plus a right-side link to the check-in form builder,
  plus the coach's own name and avatar
- **Hero** — "N check-ins waiting" and an honest time estimate ("about 25 minutes",
  computed at 5 min each). At zero: "Nothing waiting / Everyone has heard from you."
- **Primary action** — "Start review" (or "Open the queue" when clear)
- **Three figures**, only ones that would send a coach somewhere:
  sessions-logged % across the roster (bronze if under 80), quiet 7+ days count
  (bronze if non-zero), active clients vs plan cap
- **The roster as twenty dots** — one mark per person, 10 across, lit if they checked in
  this week, `title` on hover gives name and status. People, not a chart.
  Caption: "17 of 20 checked in".
- **Needs you** — questions first, then flags. Client questions in their own words
  (bronze dot, routes to the thread); then flagged patterns ("Bench stalled three weeks",
  "No check-in in nine days" — dim dot, routes to the profile). Never a countable link.
- **This week** — sessions logged per weekday as monochrome bars, no axis, tallest in bronze.

---

# 4 · Check-in review

Line 341. The core loop. Rail collapsed, queue column on the left, review in the middle.

**Queue column** — every pending client, `Week 7 · Sun` subline, thumbnail slot.
Status is **fill and weight, never hue**: current = bronze rule + tint + "Reviewing";
replied = lighter ink, weight 500; draft saved = hollow dot; untouched = filled dot.

**Header** — initials disc, name, "Powerbuilding II · Week 7 of 12 · checked in Sun",
status pill (Unreviewed / Draft saved / Replied), `3 of 5` position, prev/next.

**Photo compare** — then / now side by side. One control cycles the anchor:
Last week → Week 4 → Week 1. Default is **this week against the one before it** —
anything further back is behind that control.

**Four metrics** — weight, sessions, and the week's two lifts. Normal readings go quiet
(tertiary label, 500 weight); only `dir: 'watch'` anomalies get bronze ink, weight 700,
and the alert glyph. Arrows: up · down · flat · watch.

**Their answers** — the client's verbatim text under each question. Never summarized.

**Program line** — "Powerbuilding II · Week 8 is next", with "Editing here changes
Sarah's copy only" and a button into the override editor at her live week.

**Composer**
- An assist draft appears above the field, previewed, with **Use** and **Dismiss**.
  Dismissing is per client and sticky. Behind the `showAssist` prop.
- The field itself. "Drafts save as you type."
- Attach a clip or photo.
- **Send & next** — sends, toasts "Sent to Sarah", advances after 700ms.
  Once replied, the button becomes "Next client" and the note reads
  "Sent. Her reply threads onto this check-in."

---

# 5 · Check-in form builder

Line 163. What the client is asked each week. Reached from the Today header.

- **Fixed blocks**, toggles: progress photos (six poses, batch or fresh — same format),
  body weight (one number with last week shown underneath)
- **Measurements** — seven chips (chest, waist, hips, arm, thigh, calf, neck), five on by default
- **Weekly metrics** — eight checkboxes, each with a sub-line and a kind
  (Scale / Number / Choice): days you hit your plan, water, nutrition, sleep, steps,
  stress, soreness, cardio minutes. Four on by default.
- **Reflection questions** — free text rows, add and remove. Defaults:
  "How did the week feel?", "Anything hurting?", "What do you want more of next week?"
- **Audience** — everyone, or a private version for one client
  ("Her form stops following the default")
- **Due day** — seven day chips, Sunday default.
  "The form unlocks Sunday morning and nudges once that evening if it is still open."
- **Preview** — the client's numbered step flow, derived live from the config, ending in
  "Summary before sending". Plus honest length: "About 13 fields. Most people finish in
  three or four minutes."

---

# 6 · Roster

Line 467. The CRM table proper.

**Header** — "Roster", "20 active · 6 archived", search box, Invite button.

**Plan meter** — 20 of 30, percentage bar, "10 before the next bracket.
Archiving keeps everything."

**Six filters** with live counts: All · Needs response · No check-in this week ·
Program ending soon · New this month · Archived.

**Columns** — checkbox · Client · Program · Sessions · Ends · Last · Status · overflow.
Grid is `26px 1.4fr 1.15fr 88px 84px 92px 122px 30px`.

Per row: initials, name, an "asked you" mark if they have an open question, program +
`Week 7 of 12` (or `Week 12 · final`), **adherence as sessions done / prescribed** with a
mini bar (bronze at ≥85%, grey below), program end date (bronze inside the last week),
last check-in (brighter if ≥7 days), and a status label with a dot.

Adherence is deliberately **sessions done vs prescribed — no streaks, and no shaming a
single bad week.**

**Status vocabulary** — Needs you (filled dot, 700) · Draft saved (hollow dot) ·
Asked you (filled, 700) · Quiet + day count · Not started · Replied (no dot, tertiary).

**Selection** — per-row checkboxes, select-all with an indeterminate dash state, and a
selection bar offering assign a program · message · archive.

**Footer** — "20 clients" or "6 of 20", plus a three-item legend
(needs you · draft in progress · quiet).

---

# 7 · Client profile

Line 1084. Seven tabs. The records half of the feature.

Header: back, initials, name, "Powerbuilding II · Week 7 of 12 · coached since Sep 2025",
an "asked you" affordance, Message, Edit program.

### Overview
- **Four signals** — Sessions 27 of 28 with a bar ("One missed week in seven"),
  body weight with rate ("Steady 1.7 lb a week"), her fastest-moving lift,
  weekly volume ("Up 9% in the last four weeks")
- **Weight chart** — 7 weeks, line + dots, last point enlarged and lit.
  Baseline sits **just under the lightest week** so a 12 lb drop reads as a drop, not a flat wall.
- **Measurements** — then / now / delta per site
- **Private note** — free text, per client, never shown to them.
  Placeholder: "Shoulder history, what motivates her, what to avoid bringing up…"

### Lifts
Every logged lift, nothing hidden — nine cards. Metric switch: **top set** or
**reps at a fixed load** (the second is how you see progress when the load is not moving).
Per card: name, tag, headline value, delta ("+90 lb" / "held"), sparkline with the last
point lit, weekly ticks, and a footer line. Bench carries a "Stalled 3w" flag.
Baseline is set under the lowest real week so a 40% gain reads as a climb.

### Photos
Pose filter (all / front / side / back). Weeks 7, 4, 3, 1 as rows, each with date and
weight, one tile per pose. Tap an older week to set it as the compare anchor.
Then/Now pair below with delta, weeks elapsed, and sessions logged between them.
Send to client.

### Check-ins
Newest first, 8 deep, "Load everything since she joined". Each row: week, date, blurb,
sessions, weight, and Replied / Needs you. Expanded: her verbatim answers and the coach's
reply, or "Not answered yet. She checked in Mar 6. / Open it from Today to reply."

### Coaching log
The distinguishing record. Six instructions the coach gave, each with **what happened**:

| State | Mark | Meaning |
|---|---|---|
| Followed | check | did it |
| Partly | half circle | "Filmed four of the last five weeks. Missing Week 6." |
| Standing | dot | still live, e.g. "Report if the shoulder goes from tight to sharp" |
| Not yet | dash | "Still logging once a week. Worth asking why before pushing again." |

Ratio + percentage at the top. Note: **"Counted from instructions you gave in check-in
replies, not from her self-report."**

### Program
Her copy of the 12-week block, every week expandable to per-day prescriptions
(Mon lower / Tue upper / Wed rest / Thu lower / Fri upper) with loads that follow the same
weekly series the lift charts plot. Future weeks show `~` projected loads.
States: Done · **Live now** · Ahead. End date with "Five weeks out. Worth deciding the
next block around Week 10." Past blocks listed underneath.

### Billing
$249/mo "Full coaching", Active, next charge, six payments, "$1,494 lifetime · Six
payments since October 2025. No failed charges." The action toasts
**"Billing is not built yet"** — deliberately marked unbuilt.

---

# 8 · Programs

### Library (line 729)
Cards with theme art, name, description, difficulty (dot: hollow / bronze / bright),
`12 wk · 4/wk · Strength`, and assignment count ("6 clients" or "Unassigned").
Forge-authored programs are marked. Header: "6 programs · 20 assignments". New program button.

### Detail / editor
Week list down the left (blocks expanded to individual weeks, since the coach works week by
week). Workout columns A/B/C/D, each with warm-up lines and prescription rows
(`4 × 5 · 245 lb · 3m rest`). Pre-approved substitutions show inline.

**"On this program"** panel — who is running it, their week, and whether they carry
overrides. Clicking goes to that client's program tab.

**Assign sheet** — pick clients, see what each is currently on,
"Anyone already running a program will be asked to confirm the switch."

### Override mode (`overrideOf` set)
Entered from a check-in or a profile. Banner: "Editing Sarah's copy of Powerbuilding II /
Changes ride on top of the template and reach Sarah only. Weeks she has already logged
stay sealed." Toggle to view the template. Save reads "Save 3 changes".

**Sealing**: any week at or before her live week is locked —
*"Week 7 is under way. Change the weeks ahead."* / *"Week 6 is logged. Sealed."*
This is the app's own rule (a program locks after its first logged workout) enforced in the
coach tool.

Overridden rows get a bronze rule, tint, bright prescription ink, and a **"was 200 lb"**
trace of the template value.

### Inspector
Opens on an exercise. Sets · Reps · Load · Rest, each showing "Template 4" beneath when
changed. A note field — "Note to Sarah" in override mode, "Coaching note" on the template.
Revert. Footnote switches: *"The template and the other clients on it are untouched"* vs
*"Editing the template changes it for every client not overridden."*

### New program
Name (60 char cap), description (500), duration chips (4–16 wk), days per week (2–6),
family, level. One card per training day: name it, pick a split, add exercises.
"One card per training day. Name each one — that is the minimum to save."
Save is disabled until a name and at least one named day exist.
"This week repeats for all 8 weeks. Once it is saved you can open any week and change it
on its own."

---

# 9 · Messages

Line 565. Conversation list · thread · composer.

Filters: All · Needs reply · Unread. A thread "needs reply" when its last message came
from the client. Previews carry a kind prefix (Check-in / Form check / Photos).

Thread: coach bubbles right with bronze tint and a bronze-subtle border, client left on card
surface. **Check-in replies render full-width and labelled** rather than as a bubble —
they are records, not chat. Media entries show a glyph and meta ("Form check · 0:22").

Composer: saved replies (six, appended to the draft rather than replacing it), attach,
send. Drafts persist per thread.

**Broadcast** — a filtered group message. Groups: needs response · quiet 7+ days ·
program ending · new this month · everyone, each with a live count and the recipients
shown as name chips. Delivered as **ordinary 1:1 messages** —
"Arrives as a normal message in each thread." No group thread exists.

The client's side of exactly this thread is `Forge Client Messages.dc.html`: same
messages, mirrored, with the check-in entry rendered as
"Ray on your Week 7 check-in" and a button to open it.

---

# 10 · Mobile app

`Forge Coach Mobile.dc.html`. Four tabs (Today · Roster · Messages · Programs) plus a
navigation stack for depth (review, profile, thread, week, session, notifications).
`push()` / `back()`, tab switch clears the stack. Root screens show the bell with an unread
dot; pushed screens show a back chevron and lose the tab bar.

Covers: today with the dot grid and pending list, check-in review with photo slots and a
reply composer, roster with search and All/Waiting/Quiet filters, profile with stats and
history, threads, program week and session detail, notifications.

Uses the design-system components directly (`CountBadge` etc.) and a
`TONE` map (`up` green-muted, `watch` red-muted, `flat` tertiary) — **note the divergence:
desktop deliberately avoids hue for status and mobile does not.** Worth reconciling.

---

# 11 · Rules the design encodes

These are the opinions in the file, not decoration:

1. **Status is fill and weight, never hue** (desktop). A filled dot and 700 weight mean
   "needs you"; hollow and 500 mean quiet.
2. **Normal goes quiet.** Only anomalies get bronze and weight. A screen of fine numbers
   should look calm.
3. **The client's words are never summarized.** Answers, questions, and asks appear verbatim.
4. **Adherence, not streaks.** Sessions done vs prescribed. No shaming a single bad week.
5. **One thread per client.** Check-in replies land in it, marked. Never two places to look.
6. **Overrides ride on top of templates.** The template and other clients stay untouched.
7. **Logged weeks are sealed.** History can be added to, not rewritten — the same promise
   the consumer app makes.
8. **Chart baselines sit under the real minimum** so a real change reads as a change.
9. **Counts route somewhere.** Landing figures and flags are links to a person, not stats.
10. **The coaching log tracks compliance with coaching**, derived from what the coach
    actually instructed — not from client self-report.
11. **Unbuilt things say so.** Billing toasts "not built yet" rather than faking.

---

# 12 · Gaps

- **Billing is UI only.** Marked unbuilt in the design itself.
- **Only Powerbuilding II is authored.** The other five programs cannot open in the editor.
- **`PROFILE` is Sarah.** Every client profile renders her record.
- **Archived is a stub** — the filter returns nothing; the count (6) is a constant.
- **Exercise catalog count** — a builder toast says "Search the 794-exercise catalog".
  This conflicts with the 721 / 797 figures elsewhere in the project. Reconcile before it
  ships anywhere user-visible.
- **Mobile uses colour for status**, desktop does not.
- **Notifications** exist on mobile only.
- Bulk roster actions, invite, and attach are all toasts.
