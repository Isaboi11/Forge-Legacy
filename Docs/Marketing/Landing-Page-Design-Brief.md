# Forge Legacy — Landing Page · Claude Design Brief

**What this is:** a self-contained build brief for the public marketing landing page for Forge Legacy.
Paste this whole document into Claude Design.

**Sibling document:** `Docs/Marketing/Tester-Presentation-Design-Brief.md` (the presenter-driven deck).
Same design system, same spine, different job. The deck is *spoken over* by a founder in a room.
**This page has no presenter.** Every emotional beat the speaker carried must now be carried by the page itself.

**Status:** brief authored 2026-08-03.

---

## 0 · Build parameters

Build a **single self-contained HTML page**. No external assets, no CDN links, no web fonts — inline all
CSS and JS, embed images as data URIs.

- **Responsive, mobile-first.** The majority of visitors arrive on a phone, from a link someone texted
  them. Design the 390px view *first*, then let it breathe up to a 1280px max content width.
- **Dark only.** There is no light mode. Do not add one. Do not add a theme toggle.
- **Reduced motion:** honour `prefers-reduced-motion` — every animation collapses to its end state
  instantly, including scroll-driven sequences. Nothing may be *only* legible in motion.
- **Scroll-driven, not click-driven.** No carousels the user must operate, no tabs hiding content, no
  accordions above the FAQ. A visitor who scrolls once, top to bottom, must receive the entire argument.
- **Performance budget:** first meaningful paint under 1.5s on a mid-tier phone over 4G. Total page weight
  **≤ 900 KB**. Defer every screenshot below the fold with `loading="lazy"` and a bronze-tinted blur-up
  placeholder.
- **No layout shift.** Every image slot has explicit `width`/`height` or `aspect-ratio`.
- **Works with JS disabled** down to: all copy readable, all CTAs functional as plain links. Animation is
  enhancement, never load-bearing.

---

## 1 · Design system — bind exactly to these values

These are the shipped app tokens (`src/constants/tokens.ts`). **The page must be indistinguishable from
the product.** A visitor who taps the CTA should feel they never changed surfaces.

```
BACKGROUND    #0E0E12   page canvas
SURFACE       #111118   cards
ELEVATED      #18181F   sheets, raised panels
MODAL         #1F1F28   ceremony modals, phone bezel
BORDER        #222229   dividers, hairlines
BASE          #09090C   footer, inverse text, letterbox

TEXT          #F0EDE8   primary (warm near-white, NEVER pure white)
              #9E9890   secondary
              #666060   tertiary

ACCENT        #C8A97E   bronze — THE brand colour
              #DFC49A   bronze highlight / pressed
              #765B44   bronze muted
              rgba(200,169,126,0.10)  ambient glow, sparingly

SUCCESS       #5A9E68     DANGER  #A85252
INNER EDGE    rgba(255,255,255,0.04) card top highlight · 0.07 for modals
```

**Typography.** System stack only: `-apple-system, "SF Pro Text", "SF Pro Display", Inter, Roboto, sans-serif`.
**Never heavier than Semibold 600.** The design system calls this *"strength through restraint."* A 900-weight
display headline is the single fastest way to make this page look like a different product.

| Role | Mobile | Desktop | Weight | Tracking |
|---|---|---|---|---|
| Hero headline | 34 | 60 | 600 | −0.5 |
| Section headline | 26 | 40 | 600 | −0.3 |
| Sub-headline / lede | 17 | 20 | 400 | 0 |
| Card title | 18 | 18 | 600 | −0.1 |
| Body | 16 | 17 | 400 | 0 |
| Meta / caption | 13 | 13 | 400 | 0 |
| Section label | 11 | 11 | 400 UPPERCASE | +0.8 |

ALL-CAPS is permitted on **exactly one** token: the 11px section label. Nowhere else — not on buttons,
not on the wordmark lockup, not on nav.

**Line length:** body copy caps at **68 characters**. Hero and section headlines cap at **20 words**, and
should be far shorter.

**Spacing scale** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 80 · 120 (the last three are section rhythm, page-only).
**Radius** card 8 · pill 99 · image 4 · avatar full · phone frame 40.

**Motion tokens** — inherit the app's, do not invent new durations:
`toggle 50ms · section 150 · image 200 · sheet 250 · toast 300 · ceremonyReveal 500 (hard ceiling)`
Easing: `spring` / `ease-out` (entrances) / `ease-in` (exits). **`linear` is never used.**
**Fill direction only** — nothing drains, depletes, or counts down visually. Progress fills.

Scroll reveals: `translateY(16px) → 0`, `opacity 0 → 1`, **300ms ease-out**, triggered at 20% viewport
entry, stagger 80ms within a group. Fire once — nothing re-animates on scroll-back.

### The hard "never" list

Breaking any of these reads as off-brand instantly.

- Never pure `#000000` — *"it reads as a void, not a canvas."*
- No neon, no bright gold, no vivid orange, no electric blue, no candy colours, no esports palettes.
- No blue-purple sci-fi gradients. No mesh gradients. No aurora backgrounds.
- **No glassmorphism. No frosted panels.** Cards are opaque slabs of dark material.
- Glow is reserved for hero and identity surfaces only. It is ambient, never a rim-light.
- Absence is never red or orange — it is muted gray.
- **No competitor logos, ever.** The competitive frame is categorical ("dashboards"), never nominal.
- No countdown timers, no "only X spots left", no exit-intent popups, no interstitials, no cookie-wall.
  The product's entire thesis is *progress without pressure* — a page that manufactures urgency
  contradicts the thing it is selling.
- No stock photography of gyms, models, or "fitness people." Ever. The product's imagery is the product.
- No emoji.

### Phone frame — one reusable component

390 × 844 logical · 40px corner radius · 8px bezel in `#1F1F28` · 1px top inner highlight
`rgba(255,255,255,0.07)` · shadow `0 8px 24px rgba(0,0,0,0.65)`.
On mobile it scales to `min(78vw, 340px)`. Never crop it; never tilt it more than 4°.

---

## 2 · The spine

> **The tracker is the engine. The Legacy is the product.**

The page's argument, in order, and each section exists only to earn the next:

`The promise → the ache → the reframe → the idea → the weight of it → the machine that feeds it → proof from people → the promises we're bound by → the ask.`

**The one thing a visitor must leave with:** *Everything I do in this app accumulates into something
permanent that I will still have — and still care about — in ten years.*

**Voice.** Quietly confident. Declarative. Short sentences. It never oversells, never uses exclamation
marks, never says "revolutionary," "game-changing," "unlock," "crush," "beast mode," "grind," or "10x."
It sounds like a well-made object describing itself. When in doubt, cut the adjective.

**Continuity rule:** from the Chapters section onward, **a phone frame showing something real is on screen
in every section**. On mobile it stacks under the copy; on desktop it alternates left/right.

---

## 3 · Page architecture

Fifteen sections. Copy below is **final copy, not placeholder** — build it verbatim unless a line is
bracketed `[LIKE THIS]`, which marks something the founder must supply.

---

### § 1 · HERO — above the fold

**Layout.** Left column copy, right column phone. On mobile: copy, CTA, then phone.

Eyebrow (11px label): `A PERMANENT RECORD OF WHAT YOU BUILT`

**H1:** `Ten years of training.`
`What do you have to show for it?`

Line 2 renders in bronze `#C8A97E`. Line 1 fades up 500ms; line 2 follows at 300ms delay; a 1px bronze
hairline draws left→right beneath, 800ms.

**Lede:** `Forge Legacy is a training app built around one idea: your work should accumulate into something permanent. Not a streak. Not a dashboard you'll abandon. Chapters of your life, sealed and kept.`

**Primary CTA:** `Start Chapter One` — bronze fill, `#09090C` text, 52px tall, radius 99, full-width on
mobile. → `https://forgelegacy.expo.app`
**Under it, 13px tertiary:** `Free. No app store. Opens on your phone in about ten seconds.`
**Secondary CTA:** `See how it works` — text link with bronze underline, scrolls to § 4.

**Phone shows:** Home screen, un-gated, real account. `[SCREENSHOT SLOT: home]`

**Behind everything:** a single bronze radial glow at 10% opacity, centred behind the phone, ~900px wide.
That is the only background treatment on the entire page.

> **Why this headline and not the promise.** A promise headline ("A permanent record of what you built")
> tests worse cold, because the visitor has no ache yet. The question creates the ache in six words and the
> lede answers it immediately. The promise line moves to the eyebrow, where it frames without asking to be
> believed. **If the founder wants an A/B test, the alternate H1 is `A permanent record of what you built.`
> with the question demoted to the lede.** Build the page so this swap is one string change.

---

### § 2 · THE ACHE

Full-bleed, `#09090C`, generous vertical space. Centred, no phone.

`You've been training for years.`
— 2 second beat, then, larger and in bronze —
`Show me.`

Beneath, in secondary, max 60ch:
`Most people can't. They can show you last Tuesday's bench press. They can't show you the five years. Not because the data was deleted — because it never meant anything. A number without a story is just a number.`

**Motion:** behind the text, an infinitely scrolling ledger of raw log lines at 6% opacity —
`Bench 185 × 5` / `Bench 190 × 5` / `Bench 185 × 5` / `Bench 195 × 3` … — fading at top and bottom.
It never resolves into anything. That is the point. Pauses under `prefers-reduced-motion`.

---

### § 3 · THE REFRAME

Short. Centred. One line at a time on scroll.

`Who am I becoming?` — bronze, 40px
`Not: How do I compare?` — gray, with a 1px hairline strikethrough that draws across it over 400ms

Caption, 13px tertiary:
`The founding question. It was written in the first paragraph of the product document, before a line of code.`

---

### § 4 · CHAPTERS — the idea

Section label: `THE ORGANIZING UNIT`
**H2:** `A chapter is a real season of your life.`
**Body:** `It has a beginning, a purpose, and an end. Not a week. Not a streak. A chapter — "Building Your Foundation," "Coming Back From Injury," "The Year I Got Serious." You name it. You decide when it closes.`

**Phone: hand-built in HTML/CSS, genuinely animated** (this is one of five hand-built screens — see § 6).
Scroll-triggered, six beats, each resolving before the next begins:

1. `Chapter I` rises — translateY 12→0, opacity 0→1, 400ms ease-out
2. diamond divider draws — 200ms, delay 400
3. `Building Your Foundation` settles beneath — 300ms, delay 600
4. athlete name appears — delay 900
5. date appears — delay 1100
6. bronze ambient glow blooms behind the whole block — 500ms, delay 1300

**Then, a second beat in the same section — "everything lands in the chapter":**
`Every workout. Every honor. Every personal record. Every photo. Every goal. They don't go into a feed. They go into the chapter you're writing.`
Five small cards fly up from the bottom edge and stack under the chapter block — workout, honor, PR,
photo, goal — 180ms apart, each landing with a soft bronze pulse.

---

### § 5 · SEALING — the emotional peak

**This is the section people will remember. Give it the most vertical space on the page and the least copy.**

Section label: `WHEN A CHAPTER ENDS`
**H2:** `Sealed.`
**Body:** `When a season of your life is over, you close it. You write down what it meant. Then it locks.`

**Phone shows the app's real sealing modal, copy verbatim:**
> **Seal Chapter I?**
> Your goals, honors, and progress will be permanently locked.
> `Seal This Chapter`  ·  *Not yet*

**On scroll into view** (autoplay once, never loops): CTA presses (scale 0.98, 50ms) → modal fades →
**the wax seal presses down**: seal artwork scales 1.4→1.0 with a slight overshoot, opacity 0→1, 500ms
ease-out, over an expanding-then-settling bronze radial. Then `Sealed · March 14, 2027` types in beneath
in muted meta type.
Asset: `assets/artwork/ranks/seal-flame.png`

**Resolving line, appears after the animation completes, centred, 26px:**
`History can be added to. It cannot be rewritten.`

**Tone direction, quoted from the spec:** grave, intentional, worthy of a moment — **not ominous.**
Then let it sit. Do not put a CTA in this section. Do not put anything in this section.

---

### § 6 · THE LEGACY — the ten-year payoff

The phone pulls back — scale 1 → 0.45 — and the sealed chapter becomes one card in a vertical timeline
of five, newest at top. Slow auto-scroll downward: *scrolling down is scrolling into the past.*

**H2:** `Ten years from now, you open this.`
**Body:** `Every chapter of your athletic life. Organized. Honored. Preserved. The programs you ran, the goals you hit, the ones you didn't, the person you were in each of them.`

**Then, after a beat, alone, 26px bronze:**
`You can show it to your children.`

`[SCREENSHOT SLOT: legacy-timeline]`

---

### § 7 · DIVIDER

Full bleed, `#09090C`, 160px tall, one line, centred, 32px:
`The tracker is the engine. The Legacy is the product.`
A 1px bronze hairline above and below, each drawing outward from centre on scroll.

---

### § 8 · THE ENGINE — features

Section label: `WHAT YOU ACTUALLY USE EVERY DAY`
**H2:** `None of it matters if the training app isn't good.`
**Body:** `So it's good. This is a serious training tool that happens to be building something underneath.`

**Layout.** Four **feature blocks** (large, alternating phone left/right, scroll-revealed), then a
**capability grid** of eight small cards for everything else. Do not make all twelve equal — a flat grid
of twelve features reads as a spec sheet and converts like one.

#### Feature block 1 — Logging

**Title:** `Log a set in under two seconds.`
**Body:** `Weight, reps, done. A rest timer that keeps running when you leave the app. Autosave — close it mid-workout, drop your phone, lose signal, and it's exactly where you left it. Personal records caught as you lift, not calculated later.`

**Phone: hand-built, genuinely animated, 6-second loop.** Exercise name `Barbell Bench Press` at ceremony
size → weight wheel spins to 185, reps wheel to 5 → check tapped → row fills bronze left→right, 200ms,
`✓` scales in → rest ring **fills** toward completion → PR toast slides up:
`Personal record — Bench Press 185 × 5`.

#### Feature block 2 — Bring your own program

**Title:** `Already running a program? Paste it in.`
**Body:** `Forge reads it, matches the exercises, and builds it into a real program you can run. Or build one from scratch — week by week, day by day, exercise by exercise. You don't have to adopt our programming to use this.`

**Phone: hand-built, genuinely animated.** A pasted block of spreadsheet-looking program text on the left;
arrows sweep right; each line resolves into a matched exercise row with a bronze check, 120ms apart.

#### Feature block 3 — The people

**Title:** `Small. Private. The people you actually train with.`
**Body:** `A squad is a handful of people, not an audience. It surfaces what members have done — never what they have missed. No followers. No like counts. Nothing posts on its own: everything on that screen, someone chose to put there.`

`[SCREENSHOT SLOT: squad-detail]`

> Tone note for the writer: this is a **promise being made**, not a critique of the apps they already use.
> Keep it generous. No sneering at social media.

#### Feature block 4 — Rank

**Title:** `Rank is not a leaderboard. It's a description of who you've become.`
**Body:** `Seven families. It measures years, not weeks — and it never goes down. Stop for a year, come back, and you are still exactly what you earned.`

**Hand-built, genuinely animated:** seven badges step up a ladder, each identity statement typing in
beneath. 600ms each for the first five, **then slow down hard on the last two.**

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

Assets: one badge per family from `assets/artwork/ranks/`.

#### Capability grid — eight cards, 2-up mobile / 4-up desktop

Each card: 24px bronze line-icon (Phosphor style, drawn as inline SVG — **no icon font**), 18px title,
two-line body. Hairline border `#222229`, surface `#111118`, 1px top inner highlight.

| Title | Body |
|---|---|
| **Honors** | Recognition you didn't ask for and can't buy. Awarded by the system when you've actually done the thing. |
| **Goals** | One primary goal per chapter. Quantifiable or narrative. It resolves when the chapter closes. |
| **Progress** | Strength over time, body metrics if you want them, and a calendar of what you actually did. |
| **Transformation gallery** | Your own progress photos, grouped by chapter. Private by default. Nobody sees these but you. |
| **Exercise library** | Coaching notes, form cues, and substitutions on every movement. Swap an exercise and it already knows the right alternative. |
| **Competitions** | A real finish line inside your squad, when you want the push. Opt in, always — not joining leaves no trace. |
| **Cardio & conditioning** | Runs, rides, rows, swims. Logged the same way, landing in the same chapter. |
| **Home gym** | Tell it what you own. It stops recommending exercises you can't do. |

---

### § 9 · TESTIMONIALS

Section label: `FROM THE FIRST CHAPTERS`
**H2:** `[HEADLINE — pick after real quotes exist]`

**Structure: 3 primary cards + 1 wide feature quote.** See § 5 for the full testimonial system, the slot
contract, and the honesty rule. **Do not invent quotes.** Build the slots empty and visibly marked.

**Placement rationale:** testimonials sit *after* the product proof and *before* the promises. A visitor
who has already seen the thing work reads a quote as confirmation; a visitor who hasn't reads it as sales.

---

### § 10 · THE PROMISES

Section label: `WHAT WE'RE BOUND BY`
**H2:** `Four promises, and they're in the architecture — not the marketing.`

Four cards, stagger 120ms:

1. **Never charge for history.**
   `Everything you log is yours. Forever. No tier locks your past, and no subscription lapse takes it away.`
2. **No shame mechanics.**
   `Miss a week and the app says nothing. No "days since your last workout." No red. Empty days are simply empty.`
3. **Nothing is public.**
   `No followers. No public stats. No feed a stranger can see. Your performance data doesn't leave your account unless you personally put it somewhere.`
4. **History can't be rewritten.**
   `Sealed is sealed. You can add to your legacy; you cannot revise it. That's what makes it worth having.`

Closing line under the four, 13px tertiary:
`These aren't policies we could quietly change. They're constraints the app is built on.`

---

### § 11 · YOUR FIRST TEN MINUTES

Section label: `GETTING IN`
**H2:** `No 30-question intake. No paywall. No tutorial gauntlet.`

Five-step horizontal strip (vertical on mobile), each step with a small phone thumbnail:

`Sign up — name and a handle` → `Three doors: find me a program · build my own · just train today`
→ `Your first workout` → `Chapter I comes alive` → `Your first honor`

Body beneath:
`We ask for a name and a handle. We don't collect your weight, your height, your age, or your birthday — those aren't optional fields, there's nowhere to put them.`

---

### § 12 · WHAT IT COSTS

Do **not** build a pricing table. There is no pricing table yet, and a three-column
Free/Pro/Elite grid with empty cells is worse than a sentence.

One centred block:
**H2:** `Free while we're testing.`
**Body:** `And everything you log is free forever — that one isn't a promotion, it's the first promise on the list above.`

---

### § 13 · OBJECTIONS / FAQ

Section label: `THE OBVIOUS QUESTIONS`
Accordion, all collapsed, keyboard-operable, `<details>`-based so it works without JS.

| Question | Answer |
|---|---|
| **Is my data private?** | Yes, by default. Per-section visibility controls, no public profiles, and row-level security on every table in the database. Nothing about you is discoverable by a stranger. |
| **Which phone do I need?** | Either. It's a web app — open the link, add it to your home screen, and it opens like an app. iPhone or Android. Nothing to download, no App Store. |
| **I already use another app.** | Run both for a couple of weeks. The program builder takes your existing program today, so you're not starting over to try it. |
| **Does it track calories?** | No, and it isn't going to. Nutrition is a different product. This one does training and what training builds. |
| **What if I stop for a while?** | Nothing happens. Your rank doesn't fall, your chapter doesn't fail, and the app doesn't send you a guilt notification. Come back and keep going. |
| **Isn't "no comparison" bad for engagement?** | Comparison is rented engagement. Identity is owned. We're not optimising for day-one usage; we're optimising for whether you still want this in year five. |
| **How is it built?** | [MIGRATION COUNT] database migrations, security policies on every table, [TEST COUNT] automated tests, a live backend. It is a real application, not a prototype. |

---

### § 14 · FINAL CTA

Full-bleed `#09090C`. Bronze hairline above. Centred, generous.

`Forge Legacy is not helping you win today.`
`It's helping you become someone you're proud of ten years from now.`

**CTA:** `Start Chapter One` — same bronze pill, 56px.
Under it: `Free. Opens on your phone. Nothing to install.`

Then the wordmark. Asset: `assets/welcome-logo-carved.png`

---

### § 15 · FOOTER

`#09090C`, 13px tertiary, single row on desktop:
Wordmark · `Privacy` · `Terms` · `[CONTACT EMAIL]` · `© 2026 Forge Legacy`

No newsletter signup. No social icons — the product's position is that it isn't a social platform, and a
row of social badges in the footer undercuts § 10 promise 3 for anyone paying attention.

---

### Sticky CTA bar

Appears **only after the visitor has scrolled past § 6** (the ten-year payoff) — never before. Bottom-anchored
on mobile, top-anchored on desktop. 56px, `#18181F` with a hairline top border, wordmark left, bronze
`Start Chapter One` pill right. Hides again inside § 14 so it never sits on top of the final CTA.

Rationale: a sticky CTA shown before the argument lands is a nag. Shown after the payoff, it's a door.

---

## 4 · Screenshot & asset manifest

**Five screens are hand-built in HTML/CSS with the tokens** — they must genuinely animate, so screenshots
won't do:

| ID | Section | What it does |
|---|---|---|
| `build:chapter-assembly` | § 4 | six-beat chapter block assembly |
| `build:seal-ceremony` | § 5 | wax seal press + date type-in |
| `build:set-logger` | § 8.1 | weight/reps wheels → row fill → PR toast |
| `build:import-matcher` | § 8.2 | pasted text → matched exercise rows |
| `build:rank-ladder` | § 8.4 | seven badges + identity statements |

**Everything else uses real screenshots** inside the phone frame, with slow parallax only (max 20px
travel). Each gets a numbered slot so the founder can drop files in without touching layout:

| Slot ID | Screen | Route | Notes |
|---|---|---|---|
| `home` | Home | `(tabs)/index` | Un-gated, real account, active program showing |
| `workout-active` | Active workout | `workout` | Mid-session, a few sets checked |
| `program-detail` | Program detail | `program/[id]` | Real program with progress |
| `squad-detail` | Squad detail | `squad/[id]` | Check-in strip visible, 3+ members |
| `legacy-timeline` | Legacy timeline | `legacy-timeline` | At least one **sealed** chapter |
| `honors` | Honors hub | `honors` | Several earned |
| `progress-hub` | Progress Hub | `progress-hub` | Real strength history |
| `podium` | Podium reveal | `podium/[id]` | Champion state |
| `first-run-1..5` | § 11 thumbnails | various | Small, 120px wide |

**Raster budget: ≤ 12 images total, WebP, ~40–70 KB each**, inlined as data URIs, except the four largest
which may be separate lazy-loaded files if inlining pushes the page past 900 KB. Everything else is CSS or SVG.

**Brand assets:** `assets/welcome-logo-carved.png` (wordmark), `assets/artwork/ranks/seal-flame.png` (seal),
7 rank badges from `assets/artwork/ranks/` (512px, transparent, WebP).

**Screenshot rules.** Real account, real data, **no fabricated athletes**. Status bar cleaned or cropped.
No test data, no placeholder names, no "Ada Ridge." Same account across every shot — an observant visitor
notices when the athlete's name changes between screens, and it reads as fake.

---

## 5 · The testimonial system

The founder asked for testimonial spots. Here is the contract for them.

### The honesty rule — non-negotiable

**Claude Design must not write, invent, or imply testimonials.** Not as "sample content," not as
lorem-ipsum-with-a-name, not with a plausible-sounding name and city. A fabricated testimonial that ships
by accident is a false statement about a real person's experience, and this section is the single easiest
place on a landing page for that to happen.

Build the slots **empty and visibly marked**:

```html
<blockquote class="testimonial is-placeholder" data-slot="t1">
  <p class="quote">[TESTIMONIAL 1 — QUOTE, 25–40 WORDS]</p>
  <footer>
    <span class="avatar" aria-hidden="true"></span>
    <cite>[FIRST NAME + LAST INITIAL]</cite>
    <span class="meta">[ONE-LINE CONTEXT — e.g. "Training 11 years · Chapter III"]</span>
  </footer>
</blockquote>
```

`.is-placeholder` renders with a dashed bronze-muted border and a small `PLACEHOLDER` label in the corner.
**A single CSS variable `--testimonials: off` hides the entire § 9 section**, so the page can ship today
with no testimonials at all and gain them later without a rebuild. Ship it **off** by default.

### Slot layout

- **3 primary cards** — surface `#111118`, radius 8, 24px padding, hairline border, 1px top inner
  highlight. Quote at 17px/1.6. A 1px bronze hairline, 32px wide, above the quote — **no giant decorative
  quotation mark.**
- **1 wide feature quote** below them, full content width, 24px, bronze, centred, no card. This is the one
  that gets read.
- **Avatars are optional and default to absent.** An initial-in-a-circle in bronze-muted is the fallback.
  Never a stock headshot.

### What to ask testers for (give this to the founder, not to the design tool)

The three questions that produce usable quotes for *this* product:

1. *"What did you have before this, and what happened to it?"* → produces the ache quote.
2. *"What did you notice in week two that you didn't expect?"* → produces the product quote.
3. *"Finish this: in ten years I'll still have ___."* → produces the feature quote.

**Prefer specificity over praise.** "It's great" is worthless. "I closed a chapter I'd been in for
fourteen months and I actually cried" is the entire section.

### Alternate content if testimonials don't exist yet

If § 9 ships hidden, the page needs something in that position or the promises section lands cold.
Substitute one of these — both are true today and neither is a fabricated quote:

- **"Why we built it" block** — three short lines from the founder, attributed to the founder by name.
- **"What's real today" block** — an honest build-status statement: what's live, what's coming, and the
  fact that early users' honors and chapters are permanent, not a demo that gets wiped.

---

## 6 · Conversion mechanics

- **One primary CTA, one destination, everywhere:** `Start Chapter One` → `https://forgelegacy.expo.app`.
  It appears in § 1, the sticky bar, and § 14. Nowhere else. Do not add "Learn more" buttons that go
  nowhere, and do not add a second competing action.
- **No email capture form.** The product is one tap away and free; a gate between the visitor and the app
  costs more conversions than the list is worth. If the founder wants a list later, it belongs in the
  footer as a single field, never as a modal.
- **Add-to-home-screen helper.** After § 14, a 13px tertiary line with a 3-step inline hint:
  `Open on your phone → Share → Add to Home Screen`. iOS visitors get the iOS wording; detect by
  user-agent and fall back to showing both.
- **Analytics hooks:** attach `data-analytics="cta-hero" | "cta-sticky" | "cta-final" | "faq-open" |
  "section-view-{n}"` to the relevant elements and fire nothing. **Do not add a tracking script, a pixel,
  or a third-party tag** — the hooks let the founder wire an analytics provider later in one place.
- **⚠️ Distribution landmine:** the CTA links **only** to `forgelegacy.expo.app`. Never a per-deploy
  `--hash` URL — those are throwaway origins that wipe local storage and sign visitors out every time they
  close the tab.

---

## 7 · Accessibility

Not optional, and cheap to get right at build time.

- Every interactive element reachable by keyboard, in DOM order, with a visible bronze focus ring
  (`outline: 2px solid #C8A97E; outline-offset: 2px`).
- Contrast: `#F0EDE8` on `#0E0E12` = 15.8:1 ✓. `#9E9890` on `#0E0E12` = 7.4:1 ✓.
  **`#666060` on `#0E0E12` = 3.1:1 — body-text fail.** Restrict tertiary to 13px+ non-essential meta, or
  lift it to `#7A736B` where it carries meaning.
- Bronze `#C8A97E` on `#0E0E12` = 9.4:1 ✓ for text. Dark text `#09090C` on bronze fill = 9.4:1 ✓.
- Real semantic landmarks: one `<h1>`, sequential headings, `<section>`, `<nav>`, `<footer>`.
- Every image has meaningful `alt` describing the *screen*, not the file.
- Decorative animation is `aria-hidden`. The scrolling ledger in § 2 must not be read aloud.
- `prefers-reduced-motion` collapses everything to end state — including § 5, where the seal simply
  appears already pressed.

---

## 8 · SEO & sharing

```
<title>Forge Legacy — A permanent record of what you built</title>
<meta name="description" content="A training app built around chapters you seal and keep. Log every
workout, run any program, and build a record of your athletic life you'll still have in ten years.">
```

- **Open Graph / Twitter card:** 1200 × 630, `#0E0E12`, wordmark centred over the bronze radial glow, and
  the line `A permanent record of what you built.` Generate it as a static image; do not rely on a
  service. `og:image`, `og:title`, `og:description`, `og:url`, `twitter:card=summary_large_image`.
- `<html lang="en">`, canonical URL, favicon from the wordmark mark.
- **JSON-LD:** `SoftwareApplication` with name, description, `applicationCategory: HealthApplication`,
  and `offers: { price: "0" }`. **Do not emit `aggregateRating` or `review` markup** — there are no
  ratings, and fabricating them is both a false claim and a search-penalty risk.

---

## 9 · Numbers cleared for use

Only these figures may appear on the page, and each must be re-verified against the repository on the day
the page is published. A landing-page number that drifts is a number a tester will catch.

| Claim | Value | Status |
|---|---|---|
| Exercises in the catalogue | **797** | ⚠️ The tester deck states **772**. Source file `src/domain/exercise-relationships/source/exercises.json` has 797 rows. **Reconcile before publish** — if the two counts measure different things (catalogue vs. browsable), say which one the page means, or use neither and say "hundreds." |
| Substitution links | **over 5,700** | Cleared |
| Coaching entries published | **735** | Cleared |
| Honors | **179** across **14 categories** | Cleared |
| Rank ladder | **7 families, 25 levels** | Cleared — *not 28; that's the badge-art file count* |
| Legacy rank | **7 years** (2,555 days) | Cleared |
| Cardio activities | **7** | Cleared |
| Migrations · tests | **[VERIFY]** · **[VERIFY]** | FAQ "How is it built?" only. Both change weekly — measure, don't copy from the deck |

**Never state the program-catalogue count.** Standing PO decision. § 8 feature block 2 replaces breadth
with depth — the builder and the text importer are the stronger and equally true claim.

**Claim honesty rules.** No "trusted by thousands." No "join X athletes." No download counts. No press
logos. No "as seen in." If a number can't be pointed at in the repository, it doesn't go on the page.

---

## 10 · Before this page goes live

1. **Seed and freeze a demo account** — a *sealed* chapter, ~15 logged workouts, a rank above Foundation,
   a squad with 3 members, several honors. Every screenshot comes from this one account.
2. **Capture the nine screenshots** in the § 4 manifest at 3× on a 390pt device, then downscale to WebP.
3. **Export brand assets** — 7 rank badges, `seal-flame.png`, `welcome-logo-carved.png`.
4. **Decide the testimonial call** — ship § 9 hidden, or collect three quotes first using the § 5 questions.
5. **Supply:** contact email, Privacy and Terms URLs, migration/test counts for the FAQ.
6. **Re-verify every number** in § 9 against the repo on publish day.
7. **Check the CTA URL is `forgelegacy.expo.app`** and not a deploy hash.

---

## 11 · Source authorities

| Content | File |
|---|---|
| Mission, principles, IS/IS-NOT, North Star | `Docs/FORGE_LEGACY_PRODUCT_DNA.md` |
| Positioning, personas, brand voice, monetization | `Docs/Forge-Legacy-Master-PRD.md` |
| Visual tone, do/don't | `Docs/Forge-Legacy-Design-System-v1.0.md` |
| Hex / type / spacing / motion values | `src/constants/tokens.ts` |
| Sealing ceremony copy | `Docs/M-5-Chapter-Sealing-Confirmation-Spec.md` |
| Rank ladder + identity statements | `Docs/Rank-System-Architecture.md`, `src/domain/rank/thresholds.ts` |
| Performance Firewall (no public comparison) | `Docs/Amendments/Comparison-Philosophy-Amendment-001.md` |
| Anti-social-media stance | `Docs/Social-System-Architecture-v1.0.md` |
| First-run experience | `Docs/Onboarding-First-Time-Journey-Architecture-v1.0.md` |
| In-app tour copy (the app's own voice) | `src/domain/onboarding/tour-plan.ts` |
| Sibling deck (shared spine, shared assets) | `Docs/Marketing/Tester-Presentation-Design-Brief.md` |
