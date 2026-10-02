# Homepage hero film — production plan

**Status (2026-10-01):** all PO decisions made (D1 generic phone · D2 web capture · D3 seed approved · D4 nutrition line kept · D5 script changes approved). Seed written and reviewed (`supabase/apply/seed-demo-jordan-*.sql`, notes in `film/SEED-NOTES.md`); waiting for the PO to paste stage 0 + 1. Engine, capture kit and placeholder score built. Music (D6) still open.
**Source of truth for story and timing:** artifact `CYw5vmuyKNaJi6iVEPvS3d` (plan + playable mock-up, 2026-10-01).
**Branch / worktree:** `feat/hero-film` at `C:\Users\isaia\forge-film-wt` (outside OneDrive). The render
project lives in `film/`; recordings and renders are git-ignored.

---

## 1. Decisions for the PO

| # | Decision | Recommendation | Why |
|---|---|---|---|
| D1 | The phone | **A generic, unbranded premium phone built in code** (our FL mark on the back, no Apple camera layout, no Dynamic Island) | Apple's App Store marketing guidelines prohibit *"Rendering in 3D or creating any simulation of an Apple product"* and *"animating, flipping, or spinning"* iPhone images. The film's turn and pull-back are exactly that. A licensed iPhone model does not fix it; the licence covers the modeller's copyright, not Apple's rules. A generic phone keeps every camera move. |
| D2 | How the screens are captured | **From the web build at an iPhone viewport, scripted with Playwright and a frozen browser clock** | We can set the app's "today" to any date (Jan 5, Feb 10, Mar 16…), so every screen shows the right day. Frame-exact, re-shootable, and nobody has to perform taps by hand. Fallback per screen: an iPhone recording from you with a shot list, for anything that renders differently on web. |
| D3 | Seed the demo athlete "Jordan" in production | Yes, as specified in §4, through SQL you paste | Real screens need real data. One dedicated account plus five squadmate profiles that never sign in. |
| D4 | End-card line "Lifting, running and nutrition. One app." | **Keep it, because it is already true.** | The brief says Nutrition is hidden from most accounts. That is out of date: `0244` (applied 09-29) made `has_nutrition_access()` true for every signed-in account. Food logging, foods, meals, barcode and targets are free; planner, grocery list and recipe building are Premium. |
| D5 | Script changes so the film matches the real app | Approve the list in §2 | The brief's rule: change the film, never fake a screen. |
| D6 | Music | Pick one of the three in §5 by ear | I can't audition or license tracks. You license it on a **commercial** plan (a personal plan doesn't cover company ads). |

Costs to know about: Remotion is free for a company with ≤3 employees. One live Holt message is about
2¢ (Sonnet 5, cached prompt); budget **~10¢** for 3–5 takes. Check the Anthropic balance first.

## 2. Where the mock-up and the app disagree, and what changes

| Shot | Mock-up | Real app | Change |
|---|---|---|---|
| 1 | Home after the turn: "Good morning, Jordan.", "Today · Week 1 of 12", "This week 0 of 4 sessions" | Home has no name greeting. The card reads **"Today's Workout"**, the button **"Start Workout"**, and the program tile shows "done / total Workouts" | Use the real Home (frozen clock Jan 5). |
| 2 | Columns SET / LB / REPS / DONE and a "Last time · 215 lb × 5" line | **SET · PREV · WEIGHT · REPS**, check button with no header, last time is in the PREV column | Real logger. |
| 2 | "New best" card slides in under the sets | A centred **"NEW PERSONAL RECORD"** card over a backdrop, with "Add Photo / Video" / "Not now" | Record the real pop-up, tap "Not now", then the rest timer. Bronze outline goes on the card. |
| 2 | Rest card says "Up next Romanian Deadlift" | The rest overlay has no "Up next" (✓). The *Exercise Complete* card after an exercise's last set does say "Up Next", so we log sets 2–4 of a 5-set exercise and keep that card out of frame. | Real rest overlay ("REST", ring, −15s / +15s, Skip Rest). |
| 2 | First PR | A first-ever lift never fires a PR. The seed gives Jordan earlier squats (215 × 5), so 225 × 5 fires it. | Seed detail. |
| 3 | Holt header "Holt · Your coach · knows your last 6 weeks" | **"COACH HOLT" · "YOUR COACH · READY"** | Real chat. Typing needs Premium AI (granted to Jordan by SQL). |
| 3 | Holt's reply is scripted | The real reply is written live by the model, then **"In {program}: {change}. Want it?"** with **"Do it"** / "Leave it". It may offer "Just this week / The rest of the block" instead. | We keep whichever take reads best. The reply wording is the app's, not ours. |
| 3 | "Updated by Holt" card: "Paused Bench Press 4 × 4 · 205 lb" | Real pill **"Updated by Holt"** on Home's Today card and the program's schedule rows; tapping it opens "WHAT CHANGED / YOU ASKED / HOW LONG". Programs have no weekdays, so "Thursday" can only be the session's name. | Show the pill on the program schedule, then open the sheet. Name the session so it reads as Thursday's, or drop "Thursday" from the shot description. |
| 4 | Calendar with dashed outlines on missed days | Empty days have **no marks** (✓). Today gets a filled disc, a chapter start gets a diamond, trained days get a dot under the date. | Clock frozen at **Mon Mar 16**: Mar 9–15 bare, 16 is today's disc. |
| 4 | A rank card with a progress bar: "Holds through a missed week. Never goes down." | **No rank card in the app has a progress bar.** But the real Welcome back card carries the proof itself: "WELCOME BACK / Good to see you, Jordan. / Everything you built is right where you left it." plus a built line such as **"Builder II · 31 workouts · 4 honors"** (the real numbers come from the seed). | Drop the invented rank card. Calendar, then Home's Welcome back card with the bronze outline on the rank line. |
| 4 | "Welcome back. Everything you built is here." on Mar 16 | Real wording above; shows when the newest workout is 7+ days old. | Real card. |
| 5 | Floating card "SQUAD · IRONSIDE — The people who noticed" | **Legacy has no squad card, and "The people who noticed" exists nowhere in the app.** "Noticed" isn't app language, and "Acknowledged by" isn't rendered either (the squad control reads "Acknowledge" / "Respect"). | Replace with a real Legacy element: **Accomplishments (Bench Press 235)**. Squads live in the site section under the video, as the brief says. |
| 5 | Medal "HONOR EARNED · STRENGTH" in 3D | Real ceremony: **"HONOR EARNED"**, honor name, citation, "Continue". It fires on the next tab focus, not on Workout Complete. The ceremony draws the honor symbol; the medal art (`medal-art.ts`) is on the Honors screen. | The 3D medal uses the real medal art for the same honor. The phone shows the real ceremony. |
| 5 | Rank-up and medal timing | The seed shows Jordan honestly crosses **Builder IV → Craftsman I in the week of May 12** (by October he'd be Craftsman IV). The same day his bench hits 235 × 3 and earns **"1,000 Pound Club"** (Strength). | Shot 5's two ceremonies are captured with the clock at **Tue May 12**: "RANK ASCENDED · Craftsman I", then "HONOR EARNED · 1,000 Pound Club". The medal art is that honor's. |
| 5 | "Builder III → Craftsman I" | Tiers run **I–IV** (Foundation, Builder, Craftsman, Architect, Established, Legend, Legacy). The real ceremony reads **"RANK ASCENDED"**. | **Builder IV → Craftsman I**, recorded from the real ceremony. |
| 5 | Chapter III "Still Writing · Sep – now" | Chapters are named by the athlete, so any name is real once Jordan names it. | Keep the names "The Return" and "Stronger Than Before". |
| All | — | The app shows streaks ("Best streak", post badges). | The film never says "no streaks", and it doesn't. |
| 1 | The grey "0 day streak" app | Not our app, and it's labelled nowhere. | Built in code as a plain, unbranded illustration that names no competitor. |

## 3. Production route (in-house)

1. **Remotion project** in `film/` (React, TypeScript): the mock-up's timing engine (`HOLDS` → real time) ported as is,
   so captions, strike-throughs, the dimmer and outline, the date counter, the day-100 notch and the end card match the
   artifact frame for frame. Two compositions (1920×1080 and 1080×1920, recomposed) plus the 15 s cut.
2. **3D**: `@remotion/three` (react-three-fiber). Procedural phone with a titanium-like edge, glass with an HDRI reflection
   (Poly Haven, CC0), the recording as a video texture on the screen. Legacy cards and the medal are real app art in 3D space.
3. **Screens**: Playwright drives the web build at 430×932 @3x with `page.clock` frozen per shot and `timezoneId` set.
   Each moment is stepped frame by frame (`clock.runFor(16.67)` + screenshot) for a clean 60 fps PNG sequence, then
   encoded to a ProRes or high-bitrate H.264 intermediate. Touch dots and ripples are added in Remotion, as in the mock-up.
4. **Sound**: the licensed track cut to 29 s on its own beat grid (first drop on the turn, breakdown for the missed week,
   second drop on the pull-back, final hit and an open chord). Foley per the artifact's cue sheet. Mixed to **−14 LUFS**,
   true peak −1 dBTP (ffmpeg `loudnorm`, two-pass).
5. **Rough cut first**: real screens, timing and music with a flat phone and no lighting polish, sent to you before
   any 3D polish.
6. **Site**: `site/index.html` hero gets `<video autoplay muted loop playsinline preload="none" poster>`, inserted after
   the headline renders. The 9:16 source is used under 600 px. A "Sound on" button. The poster replaces the video under
   `prefers-reduced-motion`. A small line under it: "Holt is part of Forge AI". Deploy = `wrangler versions upload` →
   check the preview URL → **go live only when you say "go live"**.

Machine note: this laptop has integrated graphics (Core Ultra 7 155U, 16 GB). 3D renders will be slow
(≈1–3 s a frame, so roughly 1–2 h per version). That's fine for a few versions.

## 4. Seeding Jordan (needs your OK, then you paste the SQL)

`supabase/apply/seed-demo-jordan.sql`, which is not a migration. Rows are written directly, **not** through `save_workout`,
because that stamps everything with today's date (saved_at, PR dates, honor dates, the active chapter).

- **Accounts:** `jordan.demo@forgelegacy.app` plus five squadmates (`*.demo@forgelegacy.app`) as `auth.users` rows. The
  squadmates never sign in and have no push tokens. ⚠ You'll get about six "new athlete" pushes, and the admin metrics
  count six more athletes (there's no exclusion flag).
- **Year:** about 4 workouts a week from Mon Jan 5 2026, **none Mar 9–15**, squat 135/185/205 then 215 × 5 (so 225 × 5 is a real PR on camera), bench
  225 → 235, about 200 mi of runs, `saved_at` backdated everywhere. Two sealed chapters ("The Return" Jan–Apr, "Stronger Than
  Before" May–Aug) plus a current one, PR rows, honors from the real evaluator with backdated dates and
  `celebrated_at` set except the one we film, squad "Ironside" with backdated `joined_at` (workouts inserted *before*
  memberships so no pushes fire), and an active program with the Holt-changed session.
- **Staged by date**, because the app reads "today" from the clock and "newest workout" from the data:
  stage A (Jan 5 → Mar 8) to film shots 1–4; stage B (Mar 16 → Oct 1) before shot 5.
- **Premium AI** for Jordan only: an `athlete_entitlement` grant row (`coach_ai = true`).
- Every step is idempotent and ends with a one-line check query, given to you separately.
- Removing it all later: delete the six `auth.users` rows; the cascade removes everything else. Uploaded photos are
  emptied from the bucket by hand.

## 5. Music: three candidates (Epidemic Sound)

Search terms: *melodic techno*, *driving cinematic electronic*, *tech promo*, *uplifting progressive house*, 120–128 BPM, no vocals.

| Track | Artist | BPM | Tags | Fit |
|---|---|---|---|---|
| Returning Vapour | Aleph One | 124 | Melodic Techno · Dark, Dreamy | Exactly 124. Dark start suits the cold open; check that it lifts enough for the drops. |
| Moments (Instrumental) | Ayoub | 125 | Progressive House · Dreamy, Hopeful | The warmest of the three; best for the end card. |
| Hold On | Hallmore | 125 | Melodic Techno · Dark, Dreamy | A middle ground. Check the breakdown section. |

Any track at 124–126 BPM works. The cut follows the track's own beat grid, not the mock-up's.

## 6. Deliverables

Desktop 1920×1080 and phone 1080×1920, about 29 s, seamless loop, H.264 MP4 under 5 MB plus WebM (VP9), and a poster JPG
(the New Personal Record moment). Social 9:16 with full sound. A 15 s ad cut of shots 1, 4 and 6.
