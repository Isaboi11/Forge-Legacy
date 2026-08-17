# `site/` — the public website at **forgelegacy.app**

Static files, deployed to **Cloudflare Pages**. Nothing here is part of the app bundle; the Expo web
build is a separate surface (`forgelegacy.expo.app`) and is a *testing* surface, not the product.

| File | State |
|---|---|
| `privacy.html` | ✅ **DONE** — real page, matches the app's tokens |
| `terms.html` | ✅ **DONE** |
| `assets/landing/*` | ✅ **DONE** — 775 KB, generated from repo art (see below) |
| `index.html` | ⛔ **NOT BUILT** — the landing page. This is the remaining work |
| `_exported-bundle.html` | reference only, **git-ignored**. See "Why not this" |

---

## The remaining task: build `index.html`

**Source of truth:** `Forge Legacy Landing v5.dc.html` in the Claude Design project
`b029488a-201b-432f-b04c-b0df5228381e`, readable with the `DesignSync` tool
(`get_file`, ~147 KB). The line-region-by-line-region description is
`handoff/landing-v5-implementation.md` in that same project — the PO has pasted it into chat before and
it is the better starting point, but **the `.dc.html` is what governs when they disagree.**

Rebuild it as **plain HTML + CSS**, self-contained apart from Google Fonts and `assets/landing/`.

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

## Assets — already done, and where they came from

**Everything was generated from art already in this repo.** Nothing needs to be exported from the design
project, and the design's `.webp` files are not required.

| `assets/landing/` | Generated from |
|---|---|
| `bg-legacy.jpg` (700w, q78) | `assets/backgrounds/legacy-bg.png` |
| `bg-slate.jpg` (700w, q78) | `assets/backgrounds/forge-slate.png` |
| `bg-squad.jpg` (560w, q72) | `assets/backgrounds/squad-bg-continued.png` |
| `wordmark.png` (240w) | `assets/welcome-logo-carved.png` |
| `badge-foundation` · `-builder` · `-craftsman` · `-architect` · `-established-m` · `-hall` · `-legacy` (140w) | `assets/artwork/ranks/<family>-4.png` |

⚠ **`badge-hall.png` is generated from `legend-4.png`.** The design calls that rank "hall", the repo calls
it "legend". Confirm the mapping against `src/domain/rank/thresholds.ts` before shipping — a landing page
that shows the wrong badge beside a rank name is the kind of error a tester spots instantly.

⚠ **`bench-demo-frame.jpg` is NOT here and is the one genuinely missing asset.** The design crops it from
the shipped exercise render `exercise-media/male/barbell-bench-press.webp`, which lives in **Supabase
storage**, not the repo. Options: pull one frame from that bucket, or resolve the live animated WebP at
runtime through `domain/exercise-detail/media.ts` (the handoff recommends the latter — *"the figure
presses while the screen sequence runs around it"* — and says to resolve the URL from the catalog id,
never to hardcode it).

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
- ✅ **Contact email** — `support@forgelegacy.app`, live on the domain (Cloudflare Email Routing,
  forwarding, verified by test 2026-08-15). `isaiah@forgelegacy.app` also routes.
- ✅ **`/privacy` and `/terms`** — real pages, in this directory, at stable URLs.
- ⚠ **Re-measure the FAQ's claim on publish day.** It reads "161 database migrations … 2,362 automated
  tests", measured 2026-08-14. Both move weekly. `ls supabase/migrations | wc -l` and the `node --test`
  total.
- ⚠ **"Free while we're testing"** is true only until **Phase F** of
  `Docs/Launch-Checklist-Free-And-Premium.md`. That block and any JSON-LD `offers: price "0"` both become
  false claims the moment the paywall flips, and nothing on the page will look wrong.
- ⚠ **No exercise-count figure anywhere** until 721 / 794 / 797 is reconciled.
- ⚠ **No Apple Watch claim.** We do not have it.
- **iOS only.** There are zero Android builds — the page says so deliberately (handoff §11-9).

---

## Deploying

Cloudflare Pages, connected to this directory. Then point `forgelegacy.app` at it.

⚠ **The domain currently has MX records only** — email resolves, the website does not. There is no A or
CNAME for the apex yet, which is why `forgelegacy.app` does not load.

⚠ **This is an Apple enrollment gate, not just marketing.** An organization Developer account requires a
public, functional website on a domain associated with the organization; parking pages and thin sites are
explicitly rejected. The D-U-N-S was requested 2026-08-13 (D&B case 10803372, documents answered
2026-08-15). **The site must be live before enrollment.**
