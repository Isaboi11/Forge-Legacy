# Forge Legacy — Tester Presentation · Claude Design Brief

**What this is:** a self-contained build brief for an animated, presenter-driven slide deck used to recruit
beta testers for Forge Legacy. Paste this whole document into Claude Design.

**Status:** brief locked 2026-08-02. Working plan lives at
`C:\Users\isaia\.claude\plans\i-need-to-make-proud-swan.md`.

---

## 0 · Build parameters

Build a **single self-contained HTML slide deck**. No external assets, no CDN links — inline all CSS and JS,
embed images as data URIs.

- **Canvas:** 1920 × 1080, scaled to fit viewport, letterboxed on `#09090C`.
- **Navigation:** `→` / `Space` advance · `←` back · `f` fullscreen · `s` toggle speaker-notes drawer ·
  `1`–`5` jump to act · `Esc` grid overview.
- **Speaker notes:** bottom drawer, hidden by default. This deck is spoken over, not read.
- **Dark only.** There is no light mode. Do not add one.
- **Reduced motion:** honour `prefers-reduced-motion` — every animation collapses to its end state instantly.
- **Reflow:** build slide content inside a max-width column so the deck can later be flattened into a
  scrollable landing page without a rewrite.

**22 slides in 5 acts, plus 6 hidden appendix slides.** Target 16 minutes spoken.

---

## 1 · Design system — bind exactly to these values

These are the shipped app tokens (`src/constants/tokens.ts`). The deck must be indistinguishable from the
product.

```
BACKGROUND    #0E0E12   canvas
SURFACE       #111118   cards
ELEVATED      #18181F   sheets
MODAL         #1F1F28   ceremony modals
BORDER        #222229   dividers, hairlines
BASE          #09090C   letterbox, inverse text

TEXT          #F0EDE8   primary (warm near-white, never pure white)
              #9E9890   secondary
              #666060   tertiary

ACCENT        #C8A97E   bronze — THE brand colour
              #DFC49A   bronze highlight / pressed
              #765B44   bronze muted
              rgba(200,169,126,0.10)  ambient glow, sparingly

SUCCESS       #5A9E68     DANGER  #A85252
```

**Typography.** System stack (`-apple-system, "SF Pro Text", Inter, Roboto, sans-serif`).
**Never heavier than Semibold 600** — the design system calls this "strength through restraint."
Base sizes are app tokens; multiply by `--scale: 2.2` for projection.

| Role | Size / weight | Tracking |
|---|---|---|
| Ceremony headline | 28 / 600 | −0.3 |
| Section heading | 24 / 600 | −0.2 |
| Screen title | 20 / 600 | −0.2 |
| Card title | 18 / 600 | −0.1 |
| Body | 15 / 400 | 0 |
| Meta / caption | 13 / 400 | 0 |
| Section label | 11 / 400 UPPERCASE | +0.8 |

ALL-CAPS is permitted on **exactly one** token: the 11sp section label. Nowhere else.

**Spacing** 4 · 8 · 12 · 16 · 24 · 32   **Radius** card 8 · pill 99 · image 4 · avatar full

**Motion tokens** — inherit the app's:
`toggle 50ms · section 150 · image 200 · sheet 250 · toast 300 · ceremonyReveal 500 (hard ceiling)`
Easing: `spring` / `ease-out` (entrances) / `ease-in` (exits). **`linear` is never used.**
**Fill direction only** — nothing drains, depletes, or counts down visually. Progress fills.

### The hard "never" list
A deck that breaks any of these reads as off-brand immediately.

- Never pure `#000000` — "it reads as a void, not a canvas."
- No neon, no bright gold, no vivid orange, no electric blue, no candy colours, no esports palettes.
- No blue-purple sci-fi gradients.
- **No glassmorphism. No frosted panels.** Cards are opaque slabs of dark material.
- Glow is reserved for hero and identity surfaces only.
- Absence is never red or orange — it is muted gray.
- **One primary call-to-action per slide.**
- **No competitor logos, ever.** The competitive frame is categorical ("dashboards"), never nominal.

### Phone frame — one reusable component
390 × 844 logical · 40px corner radius · 8px bezel in `#1F1F28` · 1px top inner highlight
`rgba(255,255,255,0.07)` · shadow `0 8px 24px rgba(0,0,0,0.65)`.

---

## 2 · The spine

> **The tracker is the engine. The Legacy is the product.**

Cold open → the problem → the idea (chapters, sealed) → the product underneath → four promises → the ask.

**Continuity rule: from S6 onward, a phone frame is always on screen.** The left column carries the argument;
the phone on the right always shows something real.

---

## 3 · Slides

### ACT 0 — COLD OPEN

**S1 · Black**
`You've been training for years.` — 2s beat — `Show me.`
Text fades up 500ms ease-out. A 1px bronze hairline draws left→right beneath, 800ms. No phone.
> *Speaker: Ask the room. Someone will pull out a phone. They'll show you last Tuesday's bench press. Not the years.*

**S2 · Wordmark**
`FORGE LEGACY` · sub `A permanent record of what you built.`
Wordmark fades up over an expanding bronze radial glow, 500ms.
Asset: `assets/welcome-logo-carved.png`

### ACT I — THE PROBLEM

**S3 · Fitness has no memory**
`Most fitness apps are dashboards. Stop using one, and everything you built disappears with it.`
Three **unbranded** grey app cards — a streak ring, a macro donut, a weekly bar chart — animate in staggered
150ms. At 1.5s each fades to 8% opacity, leaving empty outlines.
> *Speaker: Not because the data got deleted. Because it never meant anything. A number without a story is just a number.*

**S4 · Two entry points** — equal visual weight, side by side
Left: `Ten years of training. What do you have to show for it?`
Right: `Or you're starting now — and this is the only chance you'll ever get to record chapter one.`
Behind both: an infinitely scrolling ledger of raw log lines (`Bench 185 × 5` / `Bench 190 × 5` /
`Bench 185 × 5` …) fading at top and bottom. It never resolves into anything.

**S5 · The turn**
`Who am I becoming?` — bronze, fades in
`Not: How do I compare?` — gray, with a hairline strikethrough drawing across it, 400ms
> *Speaker: That's the founding question. It's in the first paragraph of the product document, written before a line of code.*

### ACT II — THE IDEA

**S6 · Chapters** — *phone enters here and never leaves*
Copy: `A chapter is a real season of your life. It has a beginning, a purpose, and an end.`
Phone animation — six beats, each resolving before the next starts:
1. `Chapter I` rises — translateY 12→0, opacity 0→1, 400ms ease-out
2. diamond divider draws — 200ms, delay 400
3. `Building Your Foundation` settles beneath — 300ms, delay 600
4. athlete name appears — delay 900
5. date appears — delay 1100
6. bronze ambient glow blooms behind the whole block — 500ms, delay 1300
> *Speaker: This is the organizing unit. Not a week. Not a streak. A chapter.*

**S7 · Everything lands in the chapter**
`Every workout. Every honor. Every photo. Every goal. They don't go into a feed. They go into the chapter you're writing.`
Five cards fly up from the bottom edge and stack under the chapter block — workout, honor, PR, photo, goal —
180ms apart, each landing with a soft bronze pulse.

**S8 · Sealing — the emotional peak**
Phone shows the app's real sealing modal, copy verbatim:
> **Seal Chapter I?**
> Your goals, honors, and progress will be permanently locked.
> `Seal This Chapter`  ·  *Not yet*

On presenter click: CTA presses (scale 0.98, 50ms) → modal fades → **the wax seal presses down**:
seal artwork scales 1.4→1.0 with a slight overshoot, opacity 0→1, 500ms ease-out, over an expanding-then-
settling bronze radial. Then `Sealed · March 14, 2027` types in beneath in muted meta type.
Slide copy resolves after: `Sealed. History can be added to. It cannot be rewritten.`
Asset: `assets/artwork/ranks/seal-flame.png`
> *Speaker: The spec's own direction for this moment — grave, intentional, worthy of a moment, not ominous. Then stop talking. Let it sit. This is the slide people remember.*

**S9 · The Legacy**
Phone pulls back — scale 1 → 0.45 — and the sealed chapter becomes one card in a vertical timeline of five,
newest at top. Slow auto-scroll downward: *scrolling down is scrolling into the past.*
`Ten years from now you open this and see every chapter of your athletic life. Organized. Honored. Preserved.`
Then, after a beat: `You can show it to your children.`
> *Speaker: Every month someone stays, the cost of leaving goes up. That's not a growth hack. That's the whole retention thesis.*

### ACT III — THE PRODUCT

**S10 · Divider** — full bleed, one line: `The tracker is the engine. The Legacy is the product.`

**S11 · Log a set**
Phone runs a **6-second loop**: exercise name `Barbell Bench Press` at ceremony size → weight wheel spins to
185, reps wheel to 5 → check tapped → row fills bronze left→right, 200ms, `✓` scales in → rest ring **fills**
toward completion → PR toast slides up: `Personal record — Bench Press 185 × 5`.
Copy: `Set by set. Rest timer. Autosave — close it mid-workout and it's exactly where you left it. Personal records caught as you lift.`
> *Speaker: 772 exercises, over 5,700 substitution links. Swap an exercise and it already knows what the right alternative is.*

**S12 · Bring your own program**
Phone: a pasted block of spreadsheet-looking program text on the left; arrows sweep right; each line resolves
into a matched exercise row with a bronze check, 120ms apart.
Copy: `Already running a program? Paste it in — Forge matches the exercises and builds it. Or build one from scratch, week by week, day by day.`
> *Speaker: You don't have to adopt our programming. Bring yours.*

**S13 · The people**
Phone: squad detail check-in strip; member avatars light bronze one at a time.
`Small. Private. The people you actually train with.`
`Squads surface what members have done — never what they have missed.`
`No followers. No like counts. Nothing posts on its own — everything here, someone chose to put there.`
> *Speaker: Keep the tone generous. This is a promise being made to them, not a critique of the apps they already use.*

**S14 · Competitions**
Phone: podium coronation reveal — three places, champion last, bronze crown settling.
`When you want the push — a private competition inside your squad. A real finish line. A champion at the end.`
Small: `Opt in, always. Not joining leaves no trace.`
> *Speaker: Standings exist only inside the competition you chose to enter. They never appear on any other screen — that's enforced in the architecture, not by policy.*

**S15 · Rank**
Seven badges step up a ladder, each identity statement typing in beneath. **600ms each for the first five,
then slow down hard on the last two.**

| Foundation | I've started. |
|---|---|
| Builder | I'm building habits. |
| Craftsman | I know how to train. |
| Architect | I'm intentionally shaping my development. |
| Established | I've built something real. |
| Legend | My journey has become a meaningful story. |
| Legacy | I repeatedly become the person I intend to become. |

Then three lines, one at a time:
`No XP. No points. No leaderboard.` / `Legacy takes seven years.` / `And it never goes down.`
> *Speaker: Stop for a year, come back — you're still a Craftsman. Identity is not erased by a rough patch.*

Assets: one badge per family from `assets/artwork/ranks/`.

### ACT IV — THE PROMISES

**S16 · Four promises** — four cards, stagger 120ms
1. **Never charge for history.** Everything you log is yours. Forever. No tier locks your past.
2. **No shame mechanics.** Miss a week and the app says nothing. Empty days are simply empty.
3. **Nothing is public.** No followers. No public stats. No feed a stranger can see.
4. **History can't be rewritten.** Sealed is sealed. That's what makes it worth having.

**S17 · Your first ten minutes** — five-step horizontal strip with mini phone thumbnails
`Sign up (name + handle)` → `Three doors: find me a program / build my own / just train today` →
`Your first workout` → `Chapter I comes alive` → `Your first honor`
Copy: `No 30-question intake. No paywall. No tutorial gauntlet.`
> *Speaker: We ask for a name and a handle. We don't collect your weight, your height, your age, or your birthday — they aren't optional fields, there's nowhere to put them.*

**S18 · What it costs**
`Free during testing. And everything you log is free forever — that one isn't a promo.`
Twenty seconds. Move on.

### ACT V — THE ASK

**S19 · Why you, why now**
`You're not testing a demo. You're the first chapters in this thing.`
`The honors you earn now are real and permanent. The chapter you start this week is the first chapter of a record you'll still have in ten years.`

**S20 · What we're asking** — three columns
- **Train like normal. Two weeks.** Log every session in Forge. That's the whole test.
- **Bring one person.** Squads and competitions need a partner — pair up, or join the tester squad.
- **Tell us when it's wrong.** `[FEEDBACK LINK — TO BE SUPPLIED]` Ugly feedback is the useful kind.

**S21 · How to get it**
Large QR code → **forgelegacy.expo.app**
`Open the link on your phone` → `Share` → `Add to Home Screen` → `it opens like an app`
Reassurance line: `iPhone or Android. Nothing to download. No App Store.`

**S22 · Close**
Black. Bronze hairline.
`Forge Legacy is not helping you win today.`
`It's helping you become someone you're proud of ten years from now.`
Wordmark. End.

### APPENDIX — hidden, reachable by key
- **A1 — Is my data private?** Per-section visibility controls, no public profiles, row-level security on every table.
- **A2 — Which phone?** Web app, works on both, add to home screen. Native builds later.
- **A3 — I already use another app.** Run both. The builder takes your existing program today.
- **A4 — How is this built?** 101 database migrations, security policies on every table, 655 automated tests, live backend.
- **A5 — Why no calorie tracking?** Explicitly out of scope. One thing done properly.
- **A6 — Isn't "no comparison" anti-engagement?** Comparison is rented engagement. Identity is owned. We're not optimising day-one DAU; we're optimising year-five retention.

---

## 4 · Screen construction

**Hand-build these five in HTML/CSS with the tokens** — they must genuinely animate, so screenshots won't do:
S6 chapter assembly · S8 seal ceremony · S11 set logger · S12 import matcher · S15 rank ladder.

**Everything else uses real screenshots** inside the phone frame, with slow parallax only.

Raster budget: **≤ 6 images**, WebP, ~40–60 KB each, inlined as data URIs. Everything else is CSS or SVG.

---

## 5 · Numbers cleared for use

Only these figures may appear on a slide.

| Claim | Value |
|---|---|
| Exercises | **772** |
| Substitution links | **over 5,700** |
| Coaching entries serving | **735** |
| Honors | **179** across **14 categories** |
| Rank ladder | **7 families, 25 levels** — *not 28; that's the badge-art file count* |
| Legacy rank | **7 years** (2,555 days) |
| Cardio activities **7** · Challenge metrics **14** · Squad post types **7** · Goal metrics **9** | |
| Migrations **101** · tests **655** | appendix A4 only |

**Never state the program-catalogue count.** S12 replaces breadth with depth — the builder and the text
importer are the stronger and equally true claim.

---

## 6 · Prerequisites before this deck is presented

1. **Seed a demo account** with a *sealed* chapter, ~15 logged workouts, a rank above Foundation, and a squad
   with 3 members. The story requires a chapter that has actually been sealed.
2. **Capture fresh screenshots** from that account — Home (un-gated), active workout mid-session, program
   detail, squad detail, friends feed, honors hub, legacy timeline, progress hub, podium.
3. **Export assets** — 7 rank badges (512px, transparent, WebP), `seal-flame.png`, `welcome-logo-carved.png`.
4. **Decide the feedback channel** for S20. There is no in-app feedback surface today.
5. **Create the tester squad**; have its invite code on hand at S21.
6. **Confirm the ask window** — currently two weeks.

⚠️ **Distribution landmine:** hand out **only** `forgelegacy.expo.app`. Never a per-deploy `--hash` URL —
those are throwaway origins that wipe local storage and sign testers out every time they close the tab.

---

## 7 · Source authorities

| Content | File |
|---|---|
| Mission, principles, IS/IS-NOT, North Star | `Docs/FORGE_LEGACY_PRODUCT_DNA.md` |
| Positioning, personas, brand voice, monetization | `Docs/Forge-Legacy-Master-PRD.md` |
| Visual tone, do/don't | `Docs/Forge-Legacy-Design-System-v1.0.md` |
| Hex / type / spacing / motion values | `src/constants/tokens.ts` |
| Sealing ceremony copy | `Docs/M-5-Chapter-Sealing-Confirmation-Spec.md` |
| Rank ladder + identity statements | `Docs/Rank-System-Architecture.md`, `src/domain/rank/thresholds.ts` |
| Performance Firewall | `Docs/Amendments/Comparison-Philosophy-Amendment-001.md` |
| Anti-social-media stance | `Docs/Social-System-Architecture-v1.0.md` |
| First-run experience | `Docs/Onboarding-First-Time-Journey-Architecture-v1.0.md` |
| In-app tour copy (the app's own voice) | `src/domain/onboarding/tour-plan.ts` |
