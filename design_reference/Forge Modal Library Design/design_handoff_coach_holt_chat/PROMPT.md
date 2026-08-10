# Claude Code prompt — Coach Holt chat surface

> Paste this whole file into Claude Code as the task. `README.md` in this folder is the
> exhaustive spec; this file is the ordered instruction set. Where the two disagree, the
> README's numbers win.

---

## 0 — Read before writing any code

0.1 Read `README.md` in this folder end to end.
0.2 Open `Coach Holt Chat.dc.html` in a browser. It is a **design reference**, not production
    code. Do not copy its markup, its `x-dc`/`sc-for` runtime, or its state switcher.
0.3 The switcher chips across the top of that file are a review device only. Each chip is one
    state of the real surface. There is no switcher in the app.
0.4 The right-hand notes column in that file is documentation. It does not ship.
0.5 Find the existing token source in the app — `src/constants/tokens.ts` — and use the names
    already defined there. Do not introduce a new hex value anywhere in this feature.
0.6 Find the existing wizard at `/coach` and read it. The chat asks **the same locked
    questions in the same order** and calls **the same `assemble()`**. If you find yourself
    writing new question logic, stop: you are meant to be reusing it.
0.7 Confirm before you build: this feature is **not an LLM**. There is no free-form
    understanding in v1. Holt asks the locked questions, the athlete answers, `assemble()`
    runs. Design the components so a model could later drive the same message list.

---

## 1 — Scope of this task

1.1 Build one new surface: **the Coach Holt chat sheet**.
1.2 Build the **bubble** that opens it, on the four tab surfaces only.
1.3 Do **not** touch: the wizard, the Ask Holt sheet, the Program Builder, the live workout.
1.4 The chat **hands off** to those. It never duplicates them.
1.5 Nothing in this feature writes a program to the database. The Program Builder is still
    the only save path. This is an invariant — assert it in code if you can.

---

## 2 — The container (do this first, it dictates everything else)

2.1 The chat is **not a route**. It is a sheet that rises over whatever screen is showing.
2.2 The screen underneath stays mounted and stays visible. Do not unmount it, do not navigate.
2.3 Scrim over that screen: `rgba(3, 5, 7, 0.66)` plus a 2px backdrop blur. Tapping the scrim
    shrinks the sheet back to the bubble.
2.4 Sheet geometry: pinned left / right / bottom, top inset **64px** from the top of the
    screen (so a sliver of the app is always visible above it — this is the whole point).
2.5 Sheet corners: `24px` top-left and top-right, square at the bottom.
2.6 Sheet material: `--fl-surface-modal`, `border-top: 1px solid var(--fl-bronze-border-subtle)`,
    `box-shadow: 0 -18px 44px rgba(0,0,0,0.7), inset 0 1px 0 rgba(198,156,100,0.22)`.
2.7 Grab handle at the top: 38 × 4, radius 2, `--fl-charcoal-500`, 9px above it, 4px below.
2.8 The handle is draggable. Drag down past ~120px or with velocity → collapse to the bubble.
    Drag up → nothing, the sheet has one open height.
2.9 Open transition: translateY from 100% to 0 over `--fl-duration-standard` (250ms) with
    `--fl-ease-out`. Close: the same, reversed, 200ms.
2.10 The bubble should read as the origin of the sheet — scale/fade the bubble out as the
     sheet rises. Do not cross-fade two unrelated surfaces.
2.11 The sheet is a column: handle → header → thread (scrolls) → composer (fixed). Only the
     thread scrolls.

---

## 3 — The bubble

3.1 52 × 52 circle, `right: 20px`, sitting 18px above the tab bar (bottom ≈ 96px).
3.2 Contents: `coach-holt-mark.png`, `object-fit: cover`, filling the circle.
3.3 Border `1px solid var(--fl-bronze-border)`. Shadow:
    `0 0 0 1px rgba(0,0,0,0.5), var(--fl-glow-badge), var(--fl-shadow-float)`.
3.4 Optional teaser bubble above it, right-aligned, max-width 200px, padding 9px 13px,
    radius `14px 14px 4px 14px`, `--fl-surface-elevated`, border `--fl-bronze-border-subtle`,
    12.5px `--fl-text-secondary`.
3.5 The teaser only appears when there is a real, specific thing to say. It is never generic
    and never a nag. If you have no line, show no teaser.
3.6 Bubble appears on Home, Workouts, Legacy, Squads. Nowhere else.
3.7 Accessible name: "Open Coach Holt". 44px minimum hit area is already satisfied at 52px.

---

## 4 — The header, and the mark as a live presence

4.1 Row: 36px mark · name + status column · 36px close button. Gap 12px.
    Padding `6px 18px 12px`, `border-bottom: 1px solid var(--fl-charcoal-600)`.
4.2 Name: `COACH HOLT`, 11px, weight 700, letter-spacing 2.4px, `--fl-bronze-primary`.
4.3 Status line under it: 12.5px, `--fl-text-secondary`. Values: `Ready` · `Typing` ·
    `Thinking` · `Building your block` · `Offline`.
4.4 The mark is the **only bronze element in this feature that moves**. Three appearances:
4.5   **Idle** — 36px circle, `border: 1px solid var(--fl-bronze-border-subtle)`, static.
4.6   **Thinking** — same circle, box-shadow animating 1.6s ease-in-out infinite between
      `0 0 0 1px var(--fl-bronze-border-subtle), 0 0 10px rgba(186,146,92,0.10)` and
      `0 0 0 1px var(--fl-bronze-border), 0 0 26px rgba(186,146,92,0.34)`. It warms like
      metal near a fire. It does not spin.
4.7   **Building** — a conic-gradient ring at `inset: -4px` rotating 1.15s linear infinite:
      transparent for 250°, ramping to `--fl-bronze-bright` at 350°, transparent at 360°.
      The mark itself stays still inside it with `border: 1px solid var(--fl-bronze-border)`.
4.8 Under `prefers-reduced-motion`, the sweep becomes a static bronze ring and the heat
    pulse becomes a steady `--fl-glow-subtle`.
4.9 Close button: 36px, transparent, `--fl-text-tertiary` X at 18px, stroke 1.9. It
    **collapses to the bubble**, it does not clear the conversation.

---

## 5 — The thread

5.1 Column, `padding: 20px 18px 8px`, `gap: 18px`, scrolls, scrollbar hidden.
5.2 Each turn is a group with `gap: 10px` inside it (text and its chips belong together).
5.3 New turns enter with: opacity 0 → 1, translateY 10px → 0, 280ms `--fl-ease-out`.
    Entry animation runs once per message. Never re-animate on re-render.
5.4 The thread auto-scrolls to the bottom on every new message. Do **not** use
    `scrollIntoView`; set `scrollTop` on the container.
5.5 The last message must always clear the composer. When the keyboard is up, the composer
    rises with it and the thread's bottom padding grows to match.
5.6 Turn order rule: a Holt turn may be **text then card**. Never card then text. Never two
    cards in one turn. Enforce this in the message model, not by convention.

---

## 6 — Holt speaking (the typed line)

6.1 Left-aligned plain text. **No bubble, no avatar, no container.** Holt is the voice of the
    surface; the athlete is the one who gets a container.
6.2 15.5px, line-height 1.55, `--fl-text-primary`, `max-width: 86%`, `text-wrap: pretty`.
6.3 Text types out character by character at roughly **42ms per character**.
6.4 Caret while typing: an 8 × 17 solid `--fl-bronze-primary` block, 2px to the right of the
    last character, blinking `900ms steps(1) infinite`. It disappears the moment the line ends.
6.5 Multi-line Holt turns type **one paragraph at a time**, with a ~450ms beat between them.
    The first-run introduction is three paragraphs and should feel like three separate beats.
6.6 Typing is skippable: a tap anywhere on the thread completes the current line instantly.
6.7 Accessibility: the typing container is **not** an aria-live region. Announce the finished
    line once, via a visually-hidden live region, after it completes. Never stream characters
    to a screen reader.
6.8 Under `prefers-reduced-motion`, lines appear complete, with the 280ms fade only.

---

## 7 — The athlete's message

7.1 Right-aligned bubble, `max-width: 78%`, `align-self: flex-end`.
7.2 Padding `11px 15px`. Radius `16px 16px 4px 16px` (the flat corner points at the sender).
7.3 Background `rgba(186, 146, 92, 0.11)`, border `1px solid rgba(186, 146, 92, 0.30)`,
    `box-shadow: inset 0 1px 0 rgba(198,156,100,0.14)`.
7.4 Text 15px / 1.45, `--fl-text-primary`.
7.5 This is bronze-tinted, not bronze-filled. It must never compete with a primary button.
7.6 A 280-character message must wrap cleanly and stay inside 78% width. Test it.

---

## 8 — Quick-reply chips

8.1 Wrapping row, `gap: 8px`, sits directly under the Holt line it answers.
8.2 Padding `9px 14px`, pill radius, `--fl-charcoal-800`, border `1px solid
    var(--fl-bronze-border-subtle)`, 13.5px weight 500, `--fl-text-primary`.
8.3 Pressed/hover: border → `--fl-bronze-border`, background → `--fl-bronze-tint`.
8.4 Tapping a chip does exactly what typing that answer would: the chip row is replaced by an
    athlete bubble containing the chip's label, then Holt's next question begins.
8.5 Chips are a shortcut, never the only path. The composer stays enabled beside them.
8.6 Chips are derived from the locked wizard question's options. Do not hand-author them per
    screen — read them from the same source the wizard reads.
8.7 First-run openers use the same chip component, and vary by app state:
    - no program → `Build me a program` · `What should I train today?` · `45 minutes and dumbbells`
    - mid-program → `Change Thursday's session` · `My shoulder's off this week` · `Should I add a day?`
    - post-graduation → `What's next?`

---

## 9 — Thinking (1–4s)

9.1 Three 6px bronze dots, `gap: 6px`, in the position Holt's next line will occupy.
9.2 Each dot: opacity 0.25 → 1 → 0.25 over 1.1s ease-in-out, staggered 0.18s.
9.3 Header status → `Thinking`. Mark → the heat pulse (4.6).
9.4 Composer goes to its busy state (12.3). Nothing else on the surface moves.

---

## 10 — Building (the engine assembling the block)

10.1 This gets a card, not a spinner. It is the moment the product does the thing it exists for.
10.2 Card: `--fl-surface-recessed`, radius 16, border `1px solid var(--fl-charcoal-600)`,
     `--fl-shadow-card-soft`, padding `18px 18px 16px`, column gap 14.
10.3 Label: `ASSEMBLING · {N} WEEKS`, 10.5px / 700 / ls 2.2px, `--fl-bronze-primary`.
10.4 Named steps, `gap: 11px`, each a 14px icon + label. **The steps are real** — emit them
     from `assemble()` as it works, do not fake a sequence on a timer:
     1. `Reading your last four weeks`
     2. `Setting peak volume`
     3. `Placing the long runs`
     4. `Balancing the taper`
10.5 Step states:
     - done — bronze check (stroke 2.6), 14px label `--fl-text-secondary`
     - active — 14px ring spinner (2px bronze border, transparent top, 700ms linear),
       14.5px weight 600 `--fl-text-primary`
     - pending — 14px empty spacer, 14px label `--fl-text-tertiary`
10.6 Progress rail under the steps: 3px tall, radius 2, track `--fl-charcoal-700`, fill
     `--fl-bronze-metallic`. It fills left to right and **never drains**.
10.7 If the engine finishes in under ~700ms, still show the card for a minimum 700ms. A flash
     is worse than a beat.
10.8 Strength builds get their own four step names. Do not reuse the running ones.
10.9 The card is replaced by the program card when the engine returns — same position, no
     layout jump.

---

## 11 — The cards (the objects)

> Shared: every card is a real object with a real action. If you cannot name the object, it is
> not a card, it is text. Cards never appear in the athlete's column.

### 11.1 Program card ⭐ — the most important object on the surface

11.1.1 Container: `--fl-surface-elevated`, radius 16, border `1px solid var(--fl-charcoal-500)`,
       `--fl-shadow-card-hero`, `overflow: hidden`.
11.1.2 **Draft strip across the top, non-negotiable.** Padding `9px 16px`, background
       `rgba(186,146,92,0.07)`, `border-bottom: 1px dashed var(--fl-bronze-border-subtle)`,
       a 12px padlock glyph, then `DRAFT — NOT SAVED YET` at 10px / 700 / ls 2.2px in
       `--fl-bronze-primary`. The dashed edge is the signal that this object is provisional;
       every other card in the app uses a solid edge.
11.1.3 A card that looks saved and is not is the single worst failure this surface can have.
       If you refactor this component, the draft strip is the last thing you are allowed to
       remove, and the answer is no.
11.1.4 Body padding `18px 16px 16px`, column gap 14.
11.1.5 Eyebrow: goal + kind, e.g. `HALF MARATHON · RACE BUILD`, 10.5 / 700 / ls 2.2px,
       `--fl-text-tertiary`.
11.1.6 Title: `--fl-font-display` 23px weight 600, line-height 1.2. Race plans use the race
       name; non-race builds use the program name from the engine.
11.1.7 Stat grid: 3 columns, gap `14px 10px`. Value = display serif 19px / 600. Label =
       9.5px / 700 / ls 1.6px `--fl-bronze-primary`.
       Race build shows: WEEKS · DAYS / WEEK · RACE DAY · PEAK WEEK · LONGEST RUN · TARGET.
       Non-race build shows: WEEKS · DAYS / WEEK · GOAL · EQUIPMENT · SESSION LENGTH · LEVEL.
       Never render an empty cell — drop the cell and reflow.
11.1.8 Volume ribbon: one bar per week, `flex: 1`, `gap: 3px`, container height 46px, bars
       bottom-aligned, radius 1px. Height is the week's volume as a percentage of peak.
       Colour by role: build weeks `--fl-bronze-mid`, cutback weeks `--fl-bronze-deep`,
       heavy weeks `--fl-bronze-primary`, the peak week `--fl-bronze-bright`.
       **This is real data from the engine, not decoration.** The taper must be visible
       without reading a word.
11.1.9 Ribbon caption: 11.5px `--fl-text-tertiary`, e.g.
       `Weekly volume · peak at week 11, then it comes down. Tap to walk the weeks.`
11.1.10 Reason paragraph: 13.5px / 1.55 `--fl-text-secondary`, `text-wrap: pretty`. Sourced
        from the rulebook's recorded reasons — the engine knows why it did what it did.
        Never write this string by hand.
11.1.11 Actions row, gap 10: primary `Final touches` → Program Builder; text `Not this`.
11.1.12 Tapping the card body opens the week-by-week preview. Tapping an action does not.
11.1.13 A 24-week program must render without the ribbon becoming unreadable — bars go to
        `min-width: 3px` and the container scrolls horizontally before they get thinner.

### 11.2 Day card

11.2.1 Same container, `--fl-shadow-card-soft`. Same draft strip (no padlock glyph needed).
11.2.2 Eyebrow: `SINGLE DAY · 45 MIN · DUMBBELLS`. Title: display serif 22px / 600.
11.2.3 Exercise rows: `justify-content: space-between`, padding `11px 0`, hairline
       `1px solid var(--fl-charcoal-600)` between rows and on the last row's bottom.
11.2.4 Name 14.5px left; prescription 14.5px `--fl-text-secondary`, `font-variant-numeric:
       tabular-nums`, right, `flex: none`.
11.2.5 Per-side prescriptions render as written by the engine: `3 × 10 per side`. Never
       silently drop "per side".
11.2.6 A very long exercise name wraps to two lines; the prescription never wraps.
11.2.7 Actions: primary `Start it` → live workout; text `Send to the builder`.

### 11.3 Edit card

11.3.1 Label `PROPOSED CHANGE · WEEK {n}`, 10px / 700 / ls 2.2px bronze.
11.3.2 Before → after, side by side, equal width, 18px bronze arrow between them.
11.3.3 Before panel: `--fl-surface-recessed`, border `--fl-charcoal-600`, label
       `THURSDAY NOW` 9.5 / 700 / ls 1.6 tertiary, value 15px `--fl-text-secondary` with
       `line-through` in `--fl-bronze-mid`.
11.3.4 After panel: `rgba(186,146,92,0.09)`, border `1px solid var(--fl-bronze-border)`,
       label `INSTEAD` in bronze, value 15px weight 600 cream.
11.3.5 Scope selector below, labelled `SCOPE`: two equal buttons, `Just this week` /
       `Rest of the block`. Selected = bronze tint + bronze border. It is an explicit
       choice made **before** applying, never a default the athlete discovers afterwards.
11.3.6 Actions: primary `Apply`, text `Not that`.
11.3.7 The card may only ever propose a change the safe-mutation layer has already approved.
       Validate before render, not on tap.

### 11.4 Refusal ⭐ — design this as carefully as the program card

11.4.1 **A refusal is not an error.** No red, no warning triangle, no alert styling, no
       apology in the copy. If it looks like an error you have got it wrong.
11.4.2 The refusal itself is **Holt's plain text** (§6) — the same voice as everything else.
       It says no, and it says why, in one or two short paragraphs.
11.4.3 Then a counter-offer card: `--fl-surface-recessed`, radius 16, border `1px solid
       var(--fl-bronze-border-subtle)`, `box-shadow: inset 0 1px 0 rgba(198,156,100,0.16)`,
       padding 16, gap 12.
11.4.4 Label `WHAT I'D BUILD INSTEAD`, 10px / 700 / ls 2.4px bronze.
11.4.5 Then the alternative's name in display serif 21px / 600, with its shape beside it at
       13.5px secondary (`7 weeks · 4 days · race day intact`).
11.4.6 Then one paragraph, 13.5 / 1.55 secondary, framing the alternative as the **better**
       plan, not a consolation prize.
11.4.7 Actions: primary `Build the half` (the alternative, named), text `Pick another race`.
11.4.8 Every refusal path carries an alternative. If a refusal has no alternative to offer,
       it is a §11.6 stop, not a refusal.
11.4.9 Refusals to design for: a marathon in too few weeks · changing a session already
       trained · adding or removing weeks from a live program · a running goal for someone
       who cannot run · a second program while one is live.
11.4.10 When the engine rejects a constraint set the model produced, Holt owns it. He never
        says "the system won't let me."

### 11.5 Exercise pointer

11.5.1 A row, not a card body: 42px engraved icon tile · name + subtitle · 18px chevron.
11.5.2 Tile: `--fl-surface-recessed`, radius 10, border `--fl-bronze-border-subtle`, bronze glyph.
11.5.3 Name 15px / 600. Subtitle `Setup · cues · common mistakes`, 12.5px tertiary.
11.5.4 Container `--fl-surface-card`, radius 12, border `--fl-charcoal-600`, padding `14px 16px`.
11.5.5 Whole row taps through to `/exercise/[id]`.
11.5.6 Holt gives **one** line of coaching in his text above it. The card is a pointer into
       the 735 published records — it never restates the page.

### 11.6 The stop (out of scope / medical)

11.6.1 `--fl-surface-recessed`, radius 12, border `1px solid var(--fl-charcoal-500)`,
       padding `15px 16px`.
11.6.2 Label `OUT OF MY LANE`, 10px / 700 / ls 2.2px `--fl-text-tertiary`. **No bronze** —
       this is the one moment Holt is not deciding anything.
11.6.3 Body 14.5px / 1.5 `--fl-text-secondary`. Short. No action button.
11.6.4 Anything medical stops flat: no hedge, no caveat paragraph, no "but generally".
11.6.5 Documented edges: cycling as a goal, heart-rate zones, ultra distances, nutrition,
       injury diagnosis.

### 11.7 App failure (offline / model error) — the only red in the feature

11.7.1 `--fl-charcoal-800`, radius 12, border `1px solid rgba(190, 90, 76, 0.42)`,
       padding `14px 16px`, row, gap 13.
11.7.2 18px `--fl-red-muted` alert glyph · title 14px / 600 cream + subtitle 12.5px tertiary ·
       a pill retry button on the right.
11.7.3 Offline: `That didn't reach me` / `Your message is saved — it sends when you are back.`
11.7.4 Model error: distinct copy that says it was the app, not a decision.
11.7.5 **The athlete's message is never lost.** Hold it, show it, resend it on reconnect.
11.7.6 This must be visually unmistakable from a refusal. A reader glancing at the screen
       should know instantly whether Holt decided or the app broke.

### 11.8 Saved confirmation

11.8.1 `rgba(186,146,92,0.08)`, radius 12, border `--fl-bronze-border-subtle`, padding
       `13px 16px`, 16px bronze check + 14px cream line.
11.8.2 Written into the thread when the athlete returns from the Program Builder having saved.
11.8.3 Holt then continues in the same thread: `Saved. That's your block. Monday is an easy
       four — start there.`

---

## 12 — The composer

12.1 `padding: 12px 16px 22px`, `border-top: 1px solid var(--fl-charcoal-600)`,
     background `--fl-surface-panel`, row, gap 10.
12.2 Field: pill, `--fl-surface-recessed`, border `1px solid var(--fl-charcoal-600)`,
     padding `12px 16px`, 14.5px. Empty placeholder: `Tap an answer, or type it`
     in `--fl-text-tertiary`.
12.3 Four states:
     - **ready** — as above; send button 44px round, `--fl-charcoal-800`, tertiary glyph, disabled
     - **typing** — field border `--fl-bronze-border` + `box-shadow: 0 0 0 3px
       rgba(186,146,92,0.07)`; send becomes `--fl-bronze-fill` with
       `--fl-bronze-metal-border`, `--fl-bronze-metal-top-rim`, `--fl-glow-forge`, glyph
       `--fl-bronze-bright`
     - **busy** — whole bar at `opacity: 0.55`, placeholder `Holt is working`, send uses
       `--fl-bronze-fill-disabled` / `--fl-bronze-border-disabled`
     - **offline** — an 11.5px `--fl-red-muted` line above the field: `No connection — your
       message is held, nothing is lost.` The typed text stays in the field.
12.4 Send is disabled while the field is empty. It never submits whitespace.
12.5 **The composer must never be covered by the keyboard**, and the last message must remain
     visible above it. This is the single most likely bug in the feature — test it on a small
     device with the keyboard up before you call it done.
12.6 Multi-line input grows the field up to 4 lines, then scrolls internally.
12.7 Messages sent while Holt is working are queued and delivered in order after his turn
     completes. They are never dropped and never interleaved.
12.8 No voice input, no stop-generation control in v1. Leave room in the layout for a mic to
     the left of send later; do not build it.

---

## 13 — State machine

13.1 `collapsed` → bubble only.
13.2 `firstRun` → introduction + openers, no history.
13.3 `idle` → conversation on screen, nothing pending.
13.4 `composing` → athlete typing; send enabled.
13.5 `thinking` → §9.
13.6 `building` → §10.
13.7 `streaming` → §6 typing out.
13.8 `refusal`, `stopped` → terminal for that turn; the composer returns to ready.
13.9 `offline`, `modelError` → §11.7; retry returns to the previous state.
13.10 `rateLimited` → the wall (§14).
13.11 Guard: a second `assemble()` cannot start while one is running.
13.12 Guard: if a program is already live and the athlete asks for a new one, Holt **asks
      whether to replace or edit**. One active program is an invariant — never start a
      second silently.

---

## 14 — The upgrade wall

14.1 Reached only after **10 exchanges**, never before. The athlete must have felt it work.
14.2 Full-width card in the thread (not a modal, not a takeover): `--fl-surface-card`,
     radius 16, border `--fl-bronze-border-subtle`, `--fl-shadow-card-hero`, padding
     `26px 20px 22px`, centred, gap 14.
14.3 62px mark with `--fl-glow-badge`; title display serif 24px / 600; body 14 / 1.55
     secondary, max-width 290px.
14.4 Two full-width buttons stacked: primary `Unlock Coach Holt`, text `Use the wizard instead`.
14.5 The free wizard is named as a real option, not hidden. It is the same engine and the
     same programs — what is being sold is not having to tap through it.
14.6 ⚠ **Confirm the limit with the PO before shipping.** The count is a design assumption.
     If v1 is only locked questions and not free-form conversation, the wall may need to
     count *program builds* rather than messages, or not exist at all.

---

## 15 — Persistence and navigation

15.1 One rolling thread per athlete. No separate conversations, no history screen in v1.
15.2 The thread survives leaving the app and coming back.
15.3 Leaving for the Program Builder / live workout / exercise page and returning restores
     the thread at the position it was left, with the outcome written into it (§11.8).
15.4 The engine runs client-side. Do not build UI that assumes the program arrives over the
     network.
15.5 Rate limiting is server-side and per athlete. The client displays it, never enforces it.
15.6 Trim or virtualise the thread past ~100 messages. Scroll performance must not degrade.

---

## 16 — Voice (copy rules — these are as binding as the colours)

16.1 Short sentences. Direct. A coach, not an assistant.
16.2 Specific over vague: `Thursday's run drops to 4 miles`, never `I've adjusted your week`.
16.3 Willing to say no, and never apologetic about it.
16.4 **Never**: exclamation marks as enthusiasm · `Great question!` · emoji · `champ` ·
     motivational filler · any shame about a missed session (anti-shame is a locked
     product principle).
16.5 Reference lines already shipped, for calibration:
     - `Be honest — I'd rather build three you'll hit than five you won't.`
     - `Easy means easy. This is where the base is built.`
     - `Run 60s / walk 90s × 8 · the walk is the session.`
     - `You already did Tuesday — that's part of your record now. Want me to change next
       Tuesday instead?`
16.6 All strings in this feature go through the existing copy layer. No literals in JSX.

---

## 17 — Non-negotiables (check every one before you open a PR)

17.1 Dark only. No light theme in v1.
17.2 Tokens only — `--fl-*` / `flColor` / `flFont` / `flRadius` / `flShadow`. **Zero new hex.**
17.3 Bronze is Holt: white = information, muted grey = explanation, bronze = Holt, decision,
     selection. Bronze is not a highlight colour to be spent freely.
17.4 The only large bronze fill permitted is `--fl-bronze-fill` on a primary button.
17.5 Chips, cards and buttons reuse the wizard's components. The two surfaces are the same
     coach — if they diverge visually, the illusion breaks.
17.6 Every card action reachable by label. Streamed text never spams a screen reader (§6.7).
17.7 44px minimum hit target everywhere.
17.8 Survives: a 280-character message · a 24-week program card · a one-word reply · a very
     long exercise name · the keyboard up on the smallest supported device.
17.9 Conversational text must never be mistakable for a prescription. If Holt is describing
     training in prose, it is explanation; if it is a plan, it is a card.
17.10 Nothing this surface produces is saved without passing through the Program Builder.

---

## 18 — Build order

18.1 Sheet container + bubble + open/collapse transition (§2, §3).
18.2 Header with the three mark states (§4).
18.3 Message list, Holt text with the typewriter, athlete bubble, chips (§5–§8).
18.4 Composer with all four states, including keyboard handling (§12).
18.5 Wire the locked wizard questions through the message list. **Stop here and demo it** —
     if the conversation does not already feel like a person at this point, the cards will
     not save it.
18.6 Thinking + building (§9, §10).
18.7 Program card, then day card (§11.1, §11.2).
18.8 Refusal, then stop, then failure states (§11.4, §11.6, §11.7).
18.9 Edit card, exercise pointer (§11.3, §11.5).
18.10 Persistence, return-from-builder, the wall (§15, §14).

---

## 19 — Definition of done

19.1 A new athlete can open the bubble, be asked the locked questions one at a time, and get
     a real program card — without the surface ever leaving the screen they started on.
19.2 A refusal and an offline error are visually unmistakable from each other.
19.3 No card in the feature can be confused for a saved program.
19.4 No new hex value has entered the codebase.
19.5 The keyboard never covers the composer or the last message.
19.6 Every string reads like the reference lines in §16.5. If a line sounds like an
     assistant, rewrite it.
