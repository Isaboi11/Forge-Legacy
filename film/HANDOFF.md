# Hero film — handoff (2026-10-02, end of day)

Continue producing the forgelegacy.app homepage hero film. Read AGENTS.md, then this file, then `film/PLAN.md`
(§3 production route, §6 deliverables). Work only in the worktree `C:\Users\isaia\forge-film-wt` (branch
`feat/hero-film`, outside OneDrive). Commit with explicit paths. Keep chat answers short and plain.

## Where it stands — the CUT IS LOCKED
- Approved rough cut: `film/out/rough-v12.mp4` (~41 s, 1920×1080, 30 fps). PO: "sounds and feels good". Content —
  shots, timing, captions, music, background — is final. Do not re-time or re-word anything without the PO.
- Shots: 1 grey "other app" (held +1 s) → the turn · 2 one tap → NEW PERSONAL RECORD (lifted) · 3 Holt BUILDS a program:
  Jordan's message → dissolve → Holt's reply over his "Bench Strength Builder" card (lifted 1.35×), caption "Your AI
  coach helps you move forward." · 4 calendar → Welcome back (lifted) · 5 Legacy scroll + 2 chapter cards + 5 real medals
  + 3 accomplishment cards, "Numbers nobody looks at." → "A year that tells your story." · 6 end card.
- Phone: generic (never an iPhone — Apple rule), slow drift on real time (8° turn / 2° tilt / 8 px float, `drift` in
  Film.tsx) — PO: "perfect". Background: soft warm pool + overhead wash + few faint embers; the diagonal beams were
  removed (PO: "cheesy").
- Music: "Moments (Instrumental Version)" by Ayoub, Epidemic Sound, LICENSED by the PO (business plan). Source WAV and
  the cut live in `film/public/music/` (git-ignored — never commit or publish the raw track). `python
  capture/score-moments.py` rebuilds the cut on bar lines: drop on the turn (3.40 s), breakdown for the missed week
  (20.68), second drop on the pull-back (26.44), final hit on the end card (37.96); −14 LUFS / −1 dBTP. If ANY timing
  changes, re-derive those film times from `realAt()` and rebuild the score.
- Engine: Remotion in `film/` — `src/timeline.ts` (film clock, HOLDS, captions), `src/Film.tsx`, `src/Phone.tsx`
  (CSS 3D phone today), `src/Screens.tsx` (recordings: pauses/skips/slow/dissolves/lifts), `src/recordings.json`,
  `src/story.ts`. Two compositions exist: HeroDesktop (1920×1080) and HeroPhone (1080×1920).
- Recordings: `film/public/rec/*` (git-ignored), captured at 2× by `capture/shot-12.mjs`, `shot-3.mjs` (live AI ~5¢),
  `shot-4.mjs`, `shot-5.mjs` (+ 4× stills in `public/rec/story-lift/`).

## THE WEB LOOP — 2026-10-03 (PO: "that would be best")
A simulated 1,000-visitor panel (5 AI personas — NOT real people) scored the 47.5 s film a wash vs a static screenshot
(~29 vs ~29 sign-ups): the best line (Miss a week / Welcome back) came at 22 s, after most visitors left; runners and
macro trackers never saw a run or food; the App Store badge contradicted TestFlight. Its "dead dark phone at 2.5 s" was
a sampling artefact (stills every 2.5 s caught the 0.5 s spin) — the spin stays.
- **WebPhone** (cut `web`, `WEB` in `src/timeline.ts`, 31.56 s): film 0–11.08 → missed week (20.75–26.51) → ONE-APP shot
  (real 27.97–33.73, the squad shot's slot/pose/light) → Legacy pull-back (34.07–39.83) → end card (44.27–47.47). Score: `python capture/score-moments.py web`.
- **One-app shot**: `capture/shot-oneapp.mjs` (Sep 27 19:30): run detail (tiles lifted ×1.55) → dissolve → Nutrition
  (ring + macros lifted ×1.15). Caption "Three apps." → "Lifting, running and food. *One app.*" Counter SEP 27 ·
  DAY 270 · STILL HERE. Food data: `capture/seed-food-sep27.mjs` logged Jordan's Sep 27 THROUGH THE APP (manual targets
  2,800 / P180 C330 F85 effective Sep 27; 8 foods = 2,061 kcal). It writes to production as Jordan — run once.
- **PO 10-03 — zoom during the logging**: the web loop lifts the logger's set rows WHILE they are logged (`webLifts` on
  the `tap` take, `onAt` = on-screen start so it can rise during a held frame) and the record card pops up inside the
  lifted piece; taps landing on a lifted piece are drawn on it. The full film still lifts only the record card.
- End card (web only): "Free on iPhone during the beta." — no App Store badge.
- **PO 10-03 (later) — Legacy back** ("our header is Get stronger. Keep the proof."): segment 4 = the pull-back (real
  34.07–39.83) with ONLY the two chapter cards, 700 px, stacked, IN FRONT of the phone, out on real time; no medals, no
  accomplishments; counter Sep 27 → Dec 31 · DAY 365 · STILL HERE. Score: second drop on the pull-back (22.60), final
  hit on the end card (28.36). Loop 31.56 s; web encode 1100 kbps (MP4 4.8 MB).
- Deliver: `node capture/render.mjs WebPhone` → `WEB_ONLY=1 bash capture/deliver.sh` (1200 kbps, MP4 4.2 MB).
- Panel round 2 on the 31.6 s loop: ~+1.6 sign-ups / 1,000 vs a static shot (round 1: ~0); no segment negative.
  Biggest levers left are the PAGE: visitors scrolled in mid-loop on the dark spin (fixed below); "GET TESTFLIGHT
  INVITE" confuses beginners/laptop/Android visitors (wording = PO); film below the fold on iPhone (PO).
- site.js (10-03): the film plays once ≥50% on screen and from 0 the first time (it used to start at load while only its
  top edge showed). WebKit iPhone 13: paused at 0 at the top, plays from 0 when scrolled to, pauses when away.
- site (10-03, PO: "black screen for about 2 seconds" on his iPhone after the start fix): iPhone ignores preload, so the
  film fetched only when played → black box. Now a poster COVER sits over the video (video stays visible underneath for
  Safari's autoplay rule) until currentTime > 0.4, and the film is WARMED (muted play → pause at 0) the first time any
  of it shows. WebKit + 2.5 s network delay: poster, never black, in both "scroll later" and "scroll at once".
- PO 10-03 (on his iPhone): the end card's phone was small under a big empty gap → in the portrait web loop it settles
  ×1.31 and higher (y 440 → 192; `webEnd` in Film.tsx), clear of the page's "Sound on" button. Film/ad unchanged.
- SITE (10-03, later): hero rewritten ("Other workout apps keep your numbers. Forge keeps your story."), then the whole
  site made ONE scrolling page (PO: "most are going to see it on their phone"): hero → Why I built Forge (PO's quote +
  `assets/landing/founder-isaiah.webp`, him + a friend — PO to confirm the friend's OK) → numbers vs story → log a set →
  beat last time → food → Coach Holt → miss a week → chapters → squads → FAQ → Brady → join. Old #training/#legacy…
  are anchors; #rank → #comeback. Panel: old page ~30 vs one page ~32.5 sign-ups/1,000 (runners preferred old) → reordered
  so the everyday app comes before the deep story; HoltChat prefilled.
- Hero body = the PO's own description (photos, chapters, programs, squads, PRs kept for life; still one fast app for
  lifting, running, food and a coach; miss a week and nothing is lost), under the film, then the form.
- No menu (header = logo + Get access); the hero headline rises in word by word, the bronze line after a beat.
- Progress photos section ("See how far you've come.") with the PO's own Transformation screenshots; Miss a week is text only.
- Testimonials ("From the beta", after Coach Holt): Moses, Nate, Brady, verbatim, 5 stars (PO). Add one = copy a
  `<figure class="tq">`; phones swipe sideways. Once on the App Store, real ratings can replace these.
- Preview: version `77fc47a7` → https://77fc47a7-forgelegacy.isaiahaltamirano.workers.dev. Superseded: `7078cd29` and
  earlier. Production still `64183374`. Go live ONLY on the PO's "go live": `cd site && npx wrangler versions deploy 77fc47a7-426b-47ca-9d31-32debf963f21@100%`
- ⚠ App Store (PO 10-03: "in the next day or so"): when the app is live, the loop's end card line ("Free on iPhone during
  the beta.", `END.web` in story.ts) and the page's TestFlight button/badge copy must change — re-render WebPhone
  (~5 min) + `WEB_ONLY=1 bash capture/deliver.sh`; the App Store badge may come back then (never animated).
  (rollback `64183374-c481-4b3d-9fe0-fb68cdc5f833@100%`).
- Unchanged: the 47.5 s film, the 15 s ad and their social masters (they still carry the badge).

## THE FINAL — done 10-02 (evening session)
- **3D phone** (`src/Phone3D.tsx`, PO approved the still): three.js body over the DOM screen — the screen opening is a
  depth-only mask, the glass adds studio reflections as light (additive). Studio = Poly Haven Studio Small 09 (CC0) as a
  faint fill + strip softboxes behind the camera, PMREM'd; every material gets `envMap` directly (three ignores
  `envMapIntensity` for `scene.environment`). Camera = CSS `perspective: 2400`; CSS→three = flip y, negate rx/rz.
  `flatPhone` prop = the old CSS phone for drafts. Renders ~6 frames/s on this laptop (not 1–3 s/frame).
- **3× screens: SKIPPED** (PO) — no visible gain at 1080p.
- **60 fps master** (`Root.tsx`); motion blur = the existing speed blur. **Grade** = one ffmpeg chain in
  `capture/deliver.sh` (warmer shadows, deeper blacks, +4% saturation), applied to every deliverable.
- **9:16**: portrait captions moved to top 330 (they touched the counter's quit label).
- **15 s ad** (PO: "whatever converts best" → shots 1, 4, 6): `AD15` in `timeline.ts`, own score
  `python capture/score-moments.py ad15`; compositions Ad15Desktop / Ad15Phone.
- Scripts: `node capture/stills.mjs <comp> out/x 2.0 9.3` (stills at real seconds, one bundle),
  `node capture/render.mjs HeroDesktop HeroPhone Ad15Desktop Ad15Phone` (masters), `bash capture/deliver.sh` (grade,
  social masters in `out/final/`, web loops + posters in `site/assets/film/`).
- **PO round 2 (10-02):** (a) the film REPLACES the hero's animated reel (`data-anim="heroDay"`) — 9:16 everywhere,
  sized to the viewport beside the headline; the 16:9 web loop is no longer on the page (social 16:9 stays in
  `out/final/`). (b) Music "loses momentum" at the missed week — it cut to the BREAKDOWN (no kick). Now drop 1 runs on
  through the missed week's line, the build's last 5 beats + the pickup start at Welcome back (24.52), and the second
  drop lands ON the pull-back (27.40 — it had drifted ~1 s early when the Welcome back hold grew); final hit 37.00.
  Ad: same build + pickup into the final hit. Track map in `capture/score-moments.py`. New music was muxed into the
  masters (video unchanged, `-c:v copy`), then `deliver.sh` again.
- **PO round 3 (10-02): the squad shot.** Squads tab, Ironside card "6 / 6 trained today", lifted ×1.35; captions
  "Training alone." → "Your squad *keeps you showing up.*". It sits in the mock-up's old squad slot, film 11.45–13.95
  (after the missed week, before the pull-back), now 6.72 s real — sized so the pull-back lands on the beat grid.
  Film is 47.47 s. Data: `supabase/apply/seed-demo-jordan-5-squad-today.sql` (all six members train TODAY in Chicago —
  re-paste on the day of any re-take, after 13:30; `capture/shot-squad.mjs` refuses unless the card reads 6 / 6).
  The ad keeps shots 1, 4, 6 (its end-card segment just moved with the timeline).
- **Site**: the film in the hero column of `site/index.html` + the "Hero film" block in `site/assets/site.js`.
  Preview: version `5e3ebaa5` → https://5e3ebaa5-forgelegacy.isaiahaltamirano.workers.dev (production stays
  `64183374` until the PO says "go live"; then `wrangler versions deploy 5e3ebaa5-1bfa-42ef-a16c-229dee67d6d0@100%`,
  rollback = `64183374-c481-4b3d-9fe0-fb68cdc5f833@100%`). ⚠ The assets layer ignores byte ranges (200 to a Range
  request) and iPhone Safari won't play video without 206 — so `site/worker/film-range.js` runs for
  `/assets/film/*` ONLY (`run_worker_first`), everything else stays assets-only.
- ⚠ The end card carries the App Store badge while the site says "In TestFlight now" — PO decides before go-live.

## (previous plan) NEXT SESSION: THE FINAL (PO 10-02: "all the needed and all the optional")
Optional polish first — show the PO ONE still before any full render:
1. **3D phone** (`@remotion/three` + react-three-fiber, already in package.json): procedural generic phone, metal edge,
   glass with an HDRI reflection (Poly Haven, CC0), the recording as the screen texture; same pose/drift as today.
   Keep lifts, taps and the end card working. Laptop is integrated graphics: ~1–3 s/frame → plan renders.
2. **3× screens**: re-capture at `dsf: 3` (lib.mjs `newPhone({ dsf })`). Shots 2, 4, 5 cost nothing; shot 3 spends ~5¢
   and needs the 2-REDO paste then RESTORE-YEAR after (see Seed). Shot 2 needs stage 1 state — NOT available without
   REMOVE → 0 → 1; ask the PO before rewinding that far, or keep shot 2 at 2×.
3. **60 fps master + motion blur** on the turn/pull-back (`@remotion/motion-blur` or the existing speed blur).
4. **Light colour grade** so bronze and blacks match shot to shot.
Then the needed deliverables (PLAN §6):
5. HeroPhone 9:16 render — check every shot's layout (lifts, Legacy pieces, captions) in portrait.
6. Web encodes: H.264 MP4 < 5 MB and WebM (VP9) for both 16:9 and 9:16; muted-autoplay-friendly; check quality.
7. Poster JPG (the NEW PERSONAL RECORD moment) for both ratios.
8. 15 s ad cut (shots 1, 4, 6 per PLAN — confirm with the PO), with its own score edit on bar lines.
9. Site embed in `site/` per PLAN §3 step 6 (video autoplay muted loop playsinline, poster, 9:16 under 600 px,
   reduced-motion → poster, "Sound on" button, "Holt is part of Forge AI" line). Deploy = `wrangler versions upload`
   → preview URL to the PO → **go live only when the PO says "go live"**. Never publish anything without that.
10. Update `Forge-Legacy-Master-Status.md` + memory `project_hero_film.md` when shipped.

## Known app bug found while filming (not fixed — report to the PO, separate work)
Onboarding environment 'commercial_gym' isn't a Room to Holt's chat (`isRoom` = full_gym/home/bodyweight,
CoachChatSheet.tsx:683), so Holt assumes an EMPTY HOME GYM and builds bodyweight programs. Real users who chose
commercial gym are affected. The film works around it ("…at the gym").

## Seed (demo athlete Jordan, production DB, PO pastes SQL)
- Files: `supabase/apply/seed-demo-jordan-{0..4}*.sql`, `-1-REDO.sql`, `-REMOVE.sql`; notes `film/SEED-NOTES.md`.
- Applied now: RESTORE-YEAR (stage 4 + 4b: 7 accomplishments, 6 pins). Ceremonies already dismissed. Shot 3 needs
  `seed-demo-jordan-2-REDO.sql` first (Feb 9); after it, `seed-demo-jordan-RESTORE-YEAR.sql` (one paste). Older note:
  stage 4 (whole year). The May 12 ceremonies (RANK ASCENDED Craftsman I, HONOR EARNED 1,000 Pound Club)
  were already dismissed in a look-around; they won't replay unless reset.
- To re-film an earlier date, rewind: stage 1 REDO works only before stage 4. After stage 4 you need a new "stage 2
  REDO" that also undoes stage 4 (delete chapters 2/3, unseal chapter 1, un-graduate the program — copy stage 4's
  rewind block) — OR REMOVE → 0 → 1 → 2. Put each paste on the PO's clipboard (PowerShell `Get-Content -Raw -Encoding
  UTF8 … | Set-Clipboard`) and wait for their result table.

## PO decisions to respect (all 10-01)
Simplify: one idea + one action per shot, held to read. No dimming. Phone motion stays as is. Captions:
"Most people quit their workout app within 100 days." → "Let's change that." / "One tap per set." /
"Your AI coach gets you unstuck." / "Miss a week. Keep your progress." / "A year that tells your story."
Real app wording only; change the film, never fake a screen. Never publish without the PO's explicit OK.

## Gotchas learned
- Run `node capture/signin.mjs` before EVERY take. Never freeze the capture clock LATER than real time + ~1 h: the app
  refreshes the token and burns the saved sign-in (shot 5 uses Oct 2 05:30 for this).
- After a RESTORE the app owes Jordan RANK ASCENDED + HONOR EARNED ceremonies; shot-5.mjs dismisses them off camera.
- Holt only builds for a full gym if told ("…at the gym"); his chips are answered inside a cut (shot-3.mjs).
- Capture runs the rest countdown ~2× fast (fake clock) — play it slowed (`slow` in recordings.json).
- `quietHolt()` must match Holt's bubble exactly — a prefix match closed "Close welcome back".
- Recording outlines are gated to their own shot's caption; caption `spot`s are removed (they were mock positions).
- A frozen-clock wait must still tick the clock (`until()` in shot-3) or the app's handlers never run.
- Holt has no "paused bench" in the catalogue (pause squat/deadlift exist); his reply to a bare "I'm stuck" rebuilt
  Upper B with almost no change; one reply started lowercase ("bench shows up in more than one session…"). Reported, not fixed.
- Shipped this session: ramp-prefill fix (web `index-52b8a28d`, build 11 OTA `bfd32e9e`, trunk `94b37f61`).

## iPhone playback (10-02, PO: "never moved")
Three causes, all fixed: (1) WebM was offered first; WebKit said it "probably" plays VP9 WebM, committed to it, failed to
decode (MEDIA_ERR_DECODE) and never fell back — MP4 (H.264) is first now. (2) The video was `opacity:0` until `playing`;
iPhone Safari won't autoplay a video it can't see — it's visible from the start and shows its own poster. (3) The
encodes were full-range BT.601, H.264 level 5.0 / 16 refs — now limited-range BT.709, level 4.0 (web) / 4.2 (social).
Test with Playwright WebKit + `devices['iPhone 13']` (out/webkit-check.mjs), not only Chromium — Chromium played the
broken page fine.
