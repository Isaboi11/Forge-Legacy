# `site/` — the public website at **forgelegacy.app**

✅ **LIVE since 2026-08-16.** Static files served by a **Cloudflare Worker with static assets**, project
name **`forgelegacy`** (`forgelegacy.isaiahaltamirano.workers.dev`), custom domains `forgelegacy.app`
and `www.forgelegacy.app`. Nothing here is part of the app bundle; the Expo web build is a separate
surface (`forgelegacy.expo.app`) and is a *testing* surface, not the product.

⚠ **It is a Worker, not Pages**, despite what every earlier draft of this file said. Cloudflare's
"Create application" flow now routes static uploads to Workers and leaves Pages behind a
*"Looking to deploy Pages?"* footnote. Both would have worked; the Worker is the non-deprecated path.
⚠ **A Worker cannot be renamed.** The first upload auto-named itself `patient-thunder-a29b` because the
name field was left at its random default; it was deleted and redone as `forgelegacy` before anything
pointed at it. Name it *before* dragging the folder in.

| File | State |
|---|---|
| `privacy.html` | ✅ **DONE** — real page, matches the app's tokens |
| `terms.html` | ✅ **DONE** |
| `support.html` | ✅ **DONE** — the App Store **Support URL**. Apple requires one and rejects a bare `mailto:` |
| `assets/landing/*` | ✅ **DONE** — 328 KB WebP, generated from repo art (see below) |
| `index.html` | ✅ **DONE** — 169 KB, **restructured 2026-08-18 to Landing v6** (was 152 KB / v5) |
| `favicon.png` | ✅ **DONE** — 64 px, from the wordmark mark |
| `_exported-bundle.html` | reference only, **git-ignored**. See "Why not this" |

---

## How `index.html` was built

**Source of truth:** `design_handoff_landing_v6/Forge Legacy Landing v6.dc.html` in the Claude Design
project `b029488a-201b-432f-b04c-b0df5228381e`, readable with the `DesignSync` tool. Its change order
is `design_handoff_landing_v6/README.md`; the v5 file sits beside both for diffing. As with v5, the
README is the better starting point but **the `.dc.html` governs when they disagree** — three copy
cuts are in the design and not in the README (see the v6 section below).

⚠ **v6 was a change order, not a rebuild.** The visual language, the mocks, the imagery and most of
the copy are byte-identical to the v5 build; the page was sliced into blocks by line range,
reassembled in the new order, and 27 asserted string substitutions applied. Nothing was retyped.

It is **plain HTML + CSS**, self-contained apart from Google Fonts and `assets/landing/`. The design
file is already almost entirely inline styles, so the conversion was mostly subtraction:

- `<x-dc>`, `<helmet>`, `<sc-if>`, `support.js`, `image-slot.js` and the `DCLogic` class are gone; the
  head is a real `<head>` and the beat engine is a plain IIFE with the same three concerns.
- `_ds_bundle.js` and `styles.css` are **not** needed — the page carries **zero** CSS classes, so
  nothing in the design system's component stylesheet was ever reachable from it.
- `tokens/foundation.css` is inlined as the **41-token subset the page actually uses**, hex copied
  1:1. `image-slot::part(ring)` and the dead `flSquadScroll` keyframe were dropped.
- The `--gut` / `--shotw` / `--shotml` / `--bz` / `--bzr` responsive contract is carried over exactly.
  **Do not replace it with media-query-per-component CSS** — it is the reason the phone mock goes edge
  to edge at 100vw below 760px instead of scaling app text down to an unreadable ~10px.

### The v6 restructure — 2026-08-18

**Section order.** A stranger now meets the product before the philosophy, and the practical proof
lands in the first two screens instead of two thirds of the way down:

| # | Section | v5 | Background |
|---:|---|---|---|
| 1 | Hook | 1 | page |
| 2 | **What Forge Legacy actually is** | **new** | page |
| 3 | The part you use every morning | ex-8, split | `--fl-base` |
| 4 | Why it exists | 2 | page |
| 5 | Chapters | 3 | `--fl-base` |
| 6 | Sealed | 4 | page |
| 7 | Rank | 6 | `--fl-base` |
| 8 | **Holt** | **new** | page |
| 9 | Squads | 5, demoted | `--fl-base` |
| 10 | What we won't do | 7 | page |
| 11 | The rest of it | ex-8, split | `--fl-base` |
| 12 | FAQ | 9 | page |
| 13 | Final CTA | 10 | `--fl-base` |

⚠ **The alternating background is load-bearing and four sections had to flip.** Moving a section
moves its parity. `--fl-base` must land on 3, 5, 7, 9, 11, 13 — the verifier checks this by
*computed* `background-color`, not by reading the attribute.

⚠ **`#chapters`, `#squads` and `#final` all still resolve.** They moved from sections 3/5/10 to
5/9/13 but the ids travelled with them.

⚠ **The "Difference N" series is now three, not four, and it is not the section order.** Chapters =
one, Rank = two, **Holt = three**. Squads and the principles section were both removed from the
series — Squads because it was reading as a load-bearing pillar, which makes someone who trains
alone wonder whether the app is for them.

**Two behaviour fixes.**

- **The decorative phone-scroll loops were never gated** (`flLegacyScroll` 44 s, `flFeedScroll`
  46 s). They ran from page load, so a visitor arriving at § 9 saw the squad feed mid-loop at an
  arbitrary frame. Both now declare `animation-play-state: paused` and the scene engine sets
  `animationPlayState = 'running'` when it first plays the containing scene. `prefers-reduced-motion`
  still kills them outright — verified as computed `animation-name: none`.
- **The hero CTA stack was pinned `align-items: flex-start`** on a phone-first page. It is now a
  `[data-cta]` selector with one `min-width: 760px` query — centred below 760, left-aligned above.
  Do **not** centre it on desktop: the headline is left-aligned there and a centred button under
  left-aligned copy reads as a mistake.

**Three copy cuts are in the `.dc.html` and not in the handoff README.** The design governs, so they
shipped: the Rank lede lost *"No XP, no points, no leaderboard."*, the Chapters lede lost
*"— not into a feed."*, and the hero's first bullet stopped being three things we don't have.
All three are the same edit — **stating what we lack describes competitors; stating what we have
describes us** (the handoff's own rationale for item 3c).

### ⚠ Two v6 items are deliberately NOT shipped, and both are the same decision

The design ships live `<a href>` CTAs labelled **Download for iPhone**, plus the sticky bottom bar.
**There is still no App Store listing.** The 2026-08-16 PO decision that made the CTAs
non-interactive `Coming to the App Store` spans has not been superseded by anything, and this
README's own rule applies — *understating is safe; overstating is a false claim on a public page.*

So both CTAs still read **Coming to the App Store**, and the sticky bar is still absent (a bar whose
whole job is to follow the reader with a door to walk through is pure noise when the label cannot be
acted on, and it costs 56 px of phone viewport permanently).

✅ **The v6 labelling is recorded in place** in the § 1 comment, so the launch swap stays mechanical:

| Location | `data-analytics` | At launch |
|---|---|---|
| Hero | `cta-hero` | `<a href>` + **Download for iPhone** |
| Sticky bar | `cta-sticky` | restore from the v6 design, **Download for iPhone** |
| Final CTA | `cta-final` | `<a href>` + **Start Chapter One** — *keep this label* |

The final CTA keeps *Start Chapter One* on purpose: by § 13 the visitor has read Chapters and
Sealed, so it reads as intent rather than jargon. At the top of the page it is jargon.

⚠ **Holt's launch gate (handoff item 10) is CLEAR, and § 8 is written in the present tense because
of it.** Coach Holt ships in the build this page advertises — he leads the Home chooser, reads
logged training and writes week one. If that ever stops being true before a deploy, add a "coming"
qualifier or hold the section. The gate is in a comment above the section.

### Deltas from the `.dc.html`, and why

| Delta | Why |
|---|---|
| CTAs are non-interactive `<span>`s reading **Coming to the App Store** | PO decision 2026-08-16, below |
| Sticky CTA bar dropped, and its JS with it | Same decision |
| `badge-hall.webp` → **`badge-legend.webp`** | `src/domain/rank/thresholds.ts` `FAMILIES` says `legend`. The ladder row was always labelled Legend; only the filename disagreed. **The README's open question is closed.** |
| One wordmark file serves the hero lockup *and* the closing mark | The design pointed the closing mark at `assets/welcome-logo-carved.png` — the same art the wordmark is cut from — and declared it `88×88` when it is `308×452`, which would have shifted layout on load |
| The bench demo stays a **still** | The animated original is 960 KB, larger than this whole page's budget. Subsampled to 14 frames it is still 194 KB against a 17.5 KB still. In the app the loop is resolved live by `domain/exercise-detail/media.ts`; a static page cannot do that, and hotlinking Supabase storage from marketing traffic is a live backend dependency with no upside |
| Every mock frame carries `role="img"` + `aria-label` | Otherwise a screen reader wades through ~200 spans of mock app UI as though it were body copy |
| All `width`/`height` attrs are each file's real intrinsic size | The brief's no-layout-shift rule. Several in the design were wrong |

### Verified by rendering, not by reading

Re-measured after the **v6** restructure (2026-08-18), headless Chromium over `file://`:

| Measure | Budget | v5 build | **v6 build** |
|---|---|---|---|
| Page height at 390px | — | 11,038px | **13,081px** (two new sections) |
| Page height at 1280px | — | — | **11,820px** |
| Hero CTA bottom at 390px | first screen | 367px | **315px** |
| Horizontal overflow at 390 / 1280 | 0 | 0 / 0 | **0 / 0** |
| Broken images | 0 | 0 of 21 | **0 of 22** |
| Unresolved `var(--fl-*)` | 0 | 0 of 41 | **0 of 41** |
| Animated elements, all settled | all | 73 | **98** |
| Page weight | ≤ 900 KB | 394 KB | **438 KB** (169 KB HTML + 269 KB assets) |

Also confirmed by rendering, at 390 / 760 / 1040 / 1280: the mock bezel is **0px** below 760 and
**8px / 40px radius** above it; both `--pcols` grids (§ 2's four promises and § 10's four principles)
render **1 / 2 / 4 / 4** columns and never 3 + 1; `--fl-base` computes onto sections 3, 5, 7, 9, 11,
13; `#chapters` / `#squads` / `#final` resolve; the hero CTA stack computes `center` below 760 and
`flex-start` above. `prefers-reduced-motion` settles all 98 and reduces both loops to computed
`animation-name: none`. With **JavaScript off** the page keeps the same height and 1,472 words
(v5: 1,252), within 0.3 pts of the JS-on ink coverage.

⚠ **`--virtual-time-budget` freezes the CSS transition clock, and it will lie to you.** After the
restructure 94 of 98 elements reported computed `opacity: 0` while their **inline** opacity was `1` —
the engine had settled every one and only the transition never advanced. The tell is that the
computed value is exactly `0` and never a partial like `0.4`. Neutralise the transitions before
sampling (`el.style.transition = 'none'`, force a reflow, re-read) — that took the count to **0**.
⚠ **And `html { scroll-behavior: smooth }` defeats a scripted walk-through**: stepping `scrollTo`
every 120 ms just restarts an animation that never lands, so the page barely moves and every section
below the fold reports unsettled. Set `scrollBehavior = 'auto'` first. Both are harness artifacts,
both look exactly like a real regression, and both cost time on this build.
⚠ `--blink-settings=scriptEnabled=false` **fails silently** in this headless shell — it produces no
screenshot at all. To test JS-off, strip the `<script>` blocks and promote `<noscript>`'s contents to
a live `<style>`; that is precisely what a scripting-disabled browser does.

### ⚠ Why not just deploy the design tool's own export

The PO produced a standalone export (kept at `_exported-bundle.html`). It renders, and it was tempting.
It is **not** a website:

- **The entire page body lives inside a JavaScript string.** Search engines and link previews see an
  empty document. For a page whose stated job is *"someone texts you the link"*, that is the failure.
- **4 MB**, against the brief's own ≤900 KB budget and 1.5 s first-paint target.
- It ships the design tool's runtime, an **origin allowlist** (`claude.ai`, `preview.claude.ai`, the
  project's `claudeusercontent.com` host) and a **dependency manifest that includes React from unpkg**.
- Images are `src="<uuid>"`, resolved at runtime rather than being files.
- Its `<title>` was literally `Bundled Page`.

Its `<head>` has already been given a real title, description and Open Graph tags, so if the Apple
enrollment deadline ever forces it, it *can* go up as a stopgap. It should not be the final artifact.

---

## Assets — done, and where they came from

**Everything is generated from art already in this repo**, except the one frame noted below. Nothing
needs to be exported from the design project. All of it is WebP; the previous PNG/JPG set was 775 KB
for fewer assets, this one is 328 KB for more.

Regenerate with `sharp` (**not** a project dependency — `npm i sharp` in a scratch directory):

| `assets/landing/` | Generated from | Recipe |
|---|---|---|
| `bg-legacy.webp` | `assets/backgrounds/legacy-bg.png` | 700w, q74 |
| `bg-slate.webp` | `assets/backgrounds/forge-slate.png` | 700w, q74 |
| `bg-squad.webp` | `assets/backgrounds/squad-bg-continued.png` | 520w, q68 — the **tall** 853×5532 variant, not the 2:1 crop, because the mock scrolls to −274cqw |
| `wordmark.webp` | `assets/welcome-logo-carved.png` | 160w, q88 |
| `badge-foundation` · `-builder` · `-craftsman` · `-architect` · `-established-m` · `-legend` · `-legacy` | `assets/artwork/ranks/<family>-4.png` | 140w, q82 |
| `honor-strength` · `-consistency` · `-endurance` · `-milestones` · `-completion` · `-community` | `assets/artwork/honors/<name>.png` | 140w, q80 |
| `coach-mark.webp` | `assets/images/coach-holt-mark.png` | 64w, q86 |
| `bench-demo-frame.webp` | frame 34 of `exercise-media/male/barbell-bench-press.webp` | 232×302 cover, q78 |
| `og-card.jpg` | composed: wordmark over the bronze radial on `#0C1013` | 1200×630, q86 |
| `../favicon.png` | `assets/welcome-logo-carved.png` | 64×64 on `#0C1013` |

✅ **`badge-hall` is now `badge-legend`, and the open question is closed.** `src/domain/rank/thresholds.ts`
`FAMILIES` is the authority and it says `legend`; the design's ladder row was always labelled *Legend*, so
only the filename disagreed. The art is still cut from `legend-4.png`.

✅ **`bench-demo-frame` is no longer missing.** It is a still cropped from the shipped render pulled from
the public `exercise-media` bucket. It stays a still deliberately — see the deltas table above.

⚠ **`legacy-bg.png`, `forge-slate.png` and `forge-slate2.png` are BYTE-IDENTICAL in this repo**
(`f8bed839…`). So `bg-legacy.webp` and `bg-slate.webp` are the same picture; the design distinguishes the
two surfaces by opacity and overlay, not by art. They are kept as **two files on purpose** so that real
slate art can drop in later without touching a line of `index.html`. If you ever wonder why the workout
mock's background looks like the Legacy hub's, this is why, and the fix belongs in `assets/backgrounds/`.

⚠ **The honor artwork is opaque, not cut out.** Alpha is 255 everywhere in the source PNGs, so the honors
strip renders as six dark medallion tiles rather than floating glyphs. That matches the design, which uses
the same files — it is not a conversion artifact.

---

## Wiring checklist (handoff §10), with current answers

- ✅ **CTAs — DECIDED 2026-08-16 by the PO: hold them until launch.** There is no App Store listing, and
  the page ships before there is one, because it is an Apple **enrollment gate** (see Deploying).
  Build it this way:
  - **Hero and final CTA become a non-interactive state**, not a dead link. Same bronze forged-metal
    treatment, same 54px height and 340px max-width, label **`Coming to the App Store`**, with the
    existing free-to-start line beneath it. No `<a href>` at all — a button that looks tappable and is
    not is worse than one that never invited the tap.
  - **⚠ DROP the sticky CTA bar for this version.** Its whole purpose is to follow the reader with a
    door to walk through; a sticky bar carrying a label you cannot act on is pure noise, and it occupies
    56px of a phone viewport permanently. Restore it at launch with the rest.
  - **NO email capture / newsletter / waitlist.** §15 of the brief forbids a newsletter signup outright,
    and the "hard never" list bans manufactured urgency. Holding the CTA honestly is the point; turning
    it into a lead-gen form is the thing the page argues against.
  - Keep the three `data-analytics` hooks on whatever element carries the label, so the swap at launch is
    one string in three known places — exactly as the handoff intends.
  - ✅ **BUILT THIS WAY.** ⚠ One correction to the instruction above: dropping the sticky bar also drops
    the element that carried `cta-sticky`, so **two** hooks survive, not three — `cta-hero` in § 1 and
    `cta-final` in **§ 13** (§ 10 before the v6 restructure). Both are `<span>`s, both are commented in
    place. **At launch: turn those two spans back into `<a href="…">`, restore the sticky bar from the
    `.dc.html` along with its show/hide logic, and `cta-sticky` comes back with it.**
  - ⚠ **v6 re-raised this and the answer did not change.** The v6 design ships all three CTAs live and
    relabels two of them *Download for iPhone*. There is still no App Store listing, so the held state
    stands — see **"Two v6 items are deliberately NOT shipped"** above for the per-CTA launch labels,
    which now differ between the hero and the final CTA.
- ✅ **Contact email** — `support@forgelegacy.app`, live on the domain (Cloudflare Email Routing,
  forwarding, verified by test 2026-08-15). `isaiah@forgelegacy.app` also routes.
- ✅ **`/privacy` and `/terms`** — real pages, in this directory, at stable URLs.
- ⚠ **Re-measure the FAQ's claim on publish day.** Re-measured **2026-08-18 on `feat/route-map`** and the
  page now reads **"167 database migrations … 2,552 automated tests"** (was 162 / 2,426 on 2026-08-16, and
  161 / 2,362 on 2026-08-14). Both move weekly, so do it again on the day.
  - `ls supabase/migrations/*.sql | wc -l` → **167**. Note the numbering is not the count: `0002` was
    never used and `0152` is used twice (`0152_discover_trained_today`, `0152_weekly_review_created_at`),
    so there are 167 files across 166 distinct numbers up to `0167`.
    ✅ `0166` and `0167` were **applied and verified against the live database on 2026-08-18** (six
    read-only checks, all true), so 167 is now a claim about a *running* backend rather than a repo.
    ⚠ **Keep the rule that produced the brief 165:** this sentence describes what is **DEPLOYED**, so
    whenever a migration is authored but unapplied, the page carries the smaller number. Understating is
    safe; overstating is a false claim on a public page. *(The earlier rule — "the page says migrations,
    so the file count is the honest figure" — held only while every file was applied.)*
  - `node --test --experimental-strip-types "src/**/*.test.mjs"` → **2,552 passing, 0 failing**
    (~42s). Note the bare `node --test … src` form in `.claude/settings.json` treats `src` as a
    *file* and reports a single phantom failure — use the glob.
- ⚠ **"Free while we're testing"** is true only until **Phase F** of
  `Docs/Launch-Checklist-Free-And-Premium.md`. That block and any JSON-LD `offers: price "0"` both become
  false claims the moment the paywall flips, and nothing on the page will look wrong.
- ⚠ **No exercise-count figure anywhere** until 721 / 794 / 797 is reconciled.
- ⚠ **No Apple Watch claim.** We do not have it.
- **iOS only.** There are zero Android builds — the page says so deliberately (handoff §11-9).

---

## Checking `index.html` after a change

The page has no build step and no test suite, so the checks are a script you write once and throw away.
Two passes were used for this build and both are worth repeating after any edit to the hero or the mocks:

1. **Static** — every `src`/`href` resolves on disk · every `<img>` `width`/`height` equals the file's
   real intrinsic size · every `var(--fl-*)` resolves in the inlined `:root` · no design-tool residue
   (`x-dc`, `helmet`, `sc-if`, `image-slot`, `_ds_bundle`, `styles.css`, `support.js`, `DCLogic`) ·
   one `<h1>` · `<main>`/`<footer>` landmarks · **no banned claim** ("iPhone or Android", Apple Watch,
   "nothing to install", `forgelegacy.expo.app` as a destination, any exercise count).
2. **Rendered** (headless Chromium, `file://` is enough) — the measurements in the table above. Load the
   page, **step down a screen at a time** so lazy images enter the viewport and each scene plays, then
   wait out the longest beat (3,900 ms in § 6) before sampling. Sampling earlier reports phantom broken
   images and phantom unsettled elements; both were false alarms during this build.

⚠ **`prefers-reduced-motion` and JS-off are not optional extras here.** The page's whole argument is
carried by scroll-revealed copy, so a regression in the settle logic makes sections permanently
invisible rather than merely unanimated. The `<noscript>` block is what covers the JS-off case; the
`data-settle` attributes are what stop the sealing modal and the forge glow from settling to the wrong
state. Check all **98** animated elements, not a sample — and check them by *inline* opacity or with
transitions neutralised, per the virtual-time warning above.

⚠ **`og:image`, `og:url` and `canonical` are absolute `https://forgelegacy.app/…` URLs.** They are
correct but inert until the apex resolves — link previews will stay blank until then, which is expected,
not a bug in the page.

---

## Deploying — done, and how to redo it

**Live 2026-08-16.** Cloudflare → Workers & Pages → project **`forgelegacy`** → *Upload assets*. Custom
domains were added from the project's **Domains** tab; because the zone is on Cloudflare nameservers in
the same account, **Cloudflare wrote the DNS records itself** — the DNS tab was never touched, and the
MX records that run `isaiah@`/`support@` were unaffected.

⚠ **NEVER upload this directory as-is.** `_exported-bundle.html` is 4 MB, is git-ignored, and would
become a public indexable page at `/_exported-bundle.html`. Stage a folder with exactly these **25
files** and upload that:

```
index.html  privacy.html  terms.html  support.html  favicon.png  assets/landing/*   (20 files)
```

⚠ **`support.html` is the App Store Support URL.** App Store Connect requires one and Apple rejects a
bare `mailto:` as an answer, so this page is a submission dependency, not a nicety — if a re-upload ever
drops it, the listing's Support URL 404s. `/support` must return **200** after every deploy.

The live deployment serves `/_exported-bundle.html` as **404**. Keep it that way.

### ✅ Re-deployed 2026-08-18 — `support.html` shipped, and then linked

The 08-16 deploy predated `support.html`, so **`/support` 404'd for two days** while both this README and
`GO-LIVE.md` described the page as done. It *was* done — it had simply never been uploaded. **"Written" and
"live" are two states and this directory now says which one it means.** Re-uploaded the full 25-file set
(Cloudflare replaces the whole asset manifest per deploy; a one-file upload is not a thing here) with the
corrected FAQ figures.

⚠ **It took TWO deploys, and the second one is the lesson.** After the first upload `/support` returned 200
and every check passed — but **nothing on the site linked to it.** The footer was written before the page
existed, so the only way to reach it was to type the URL. Apple hits the Support URL directly and would
never have caught it; the PO caught it by looking at the page. **A URL returning 200 is not the same as a
page being reachable — check the footer, not just the status code.** Second deploy added the footer link
and raised the FAQ to 167 once `0166`/`0167` were verified applied.

Verified from outside after the final deploy: `/` · `/support` · `/privacy` · `/terms` · `www` all **200**,
`/_exported-bundle.html` still **404**, footer reads **Privacy · Terms · Support · support@forgelegacy.app**.

### Verified from outside on deploy day

| | |
|---|---|
| `forgelegacy.app` | **200**, 155,105 b — byte-for-byte `index.html` |
| `/privacy` · `/terms` | **200** · **200** — extension-less routing is automatic, no `_redirects` needed |
| `www.forgelegacy.app` | **200** |
| `http://` (both hosts) | **301 → https** (*Always Use HTTPS*, SSL/TLS → Edge Certificates) |
| `/_exported-bundle.html` | **404** ✅ |
| MX | all three `route*.mx.cloudflare.net` intact |

⚠ **SSL/TLS mode is `Full`, not `Full (strict)`, and that is correct.** The origin *is* the Worker,
running at the edge — there is no Cloudflare-to-origin hop for strict mode to protect. Do not change it.

⚠ **A stale negative DNS cache will lie to you.** Right after `www` was added, `curl` returned
`000`/exit-6 while `nslookup 8.8.8.8` resolved it fine — a local router holding an old NXDOMAIN.
`curl --resolve www.forgelegacy.app:443:104.21.69.62` proved the edge was serving 200 all along.
Test against the edge before believing a local failure.

⚠ **This is an Apple enrollment gate, not just marketing.** An organization Developer account requires a
public, functional website on a domain associated with the organization; parking pages and thin sites are
explicitly rejected. ✅ **That gate is now cleared.** The D-U-N-S was requested 2026-08-13 (D&B case
10803372, documents answered 2026-08-15) and remains the sole blocker on enrollment.
