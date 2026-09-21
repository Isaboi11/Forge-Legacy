# Build a Program import — stress test (2026-09-21)

**Scope:** Paste a program, Upload a PDF, Upload pictures, the preview, and the draft the import creates.
**Method:** Every paste/PDF case was run through the real code (`parseProgramTable`, `extractPdfText`,
`draftFromImport`, the real exercise resolver) under `node`. PDFs and images are real generated files
(PyMuPDF / Pillow). The Edge Function was called directly on its free (pre-model) paths. The web preview
was driven with Playwright for signed-out access.
**Commits:** `4887b48` (parser, draft, photo errors), `2f623b3` (PDFs, function size cap), `080480c` (PO decisions: Incline DB, no 8×60 cap, Same as Day 1), `34697c2` (HEIC pick did nothing).
**Deployed:** web preview `index-fd64a031b253673045019e17f34eea7e.js`, hash verified live, all fonts 200. No OTA. (One intermediate deploy, `index-e520f662…`, served two 404 title fonts for ~20 minutes — built from a worktree whose node_modules was a junction; fixed by a real install.)
**Tests:** 3,577 node tests pass (41 new); tsc and eslint clean.

## Status of this document

All sections were run. The signed-in checks used the test account the PO supplied
(`claudetest@test.com`), driven with Playwright on the live web preview in Chromium and in WebKit
(Safari's engine, iPhone 13 profile). What still needs a physical phone is in §3.

**Model reads used: 25 of 60** (logged per read in the run notes; the account's own spend total also
includes Coach Holt messages from a parallel session, which are not import reads).

---

## 1. Results

Legend: **PASS** works as a person would expect · **FIXED** failed, fixed in this pass, now passes ·
**GAP** still wrong, needs a PO decision · **NOT RUN** not tested yet, reason given.

### A. Paste formats

| Case | Before | Now |
|---|---|---|
| TSV with header (Excel/Sheets) | PASS | PASS |
| TSV, columns in any order | PASS | PASS |
| TSV with merged Day cells, Weight/Notes columns | PASS | PASS (extra columns ignored) |
| TSV **without** a header ("Bench Press⇥4⇥8") | 3×10 assumed, name "Bench Press 4 8" | **FIXED** 4×8 |
| CSV with quoted commas | PASS | PASS |
| Semicolon (European Excel) | PASS | PASS |
| Markdown table from a chat | PASS | PASS |
| Notes bullets "•", "-", "1." | PASS | PASS |
| `4x8`, `4 x 8`, `4×8`, `4X8`, `4 sets of 8` | PASS | PASS |
| `3x8-10` | name "Lateral Raise -10", unmatched | **FIXED** |
| `3x AMRAP` | became a DAY heading, split the day | **FIXED** 3 sets, reps assumed |
| `3x30s`, `3 x 45 sec` | name "Plank s" | **FIXED** name clean, "30s" kept as the note |
| `5x5 @ 225`, `@RPE8`, `70% 1RM`, `100kg`, `each side` | debris in the name; "70% 1RM" line became a day | **FIXED** stripped from name, kept as note |
| `3 sets x 12 reps`, `10 reps x 3 sets` | "Squat x" debris | **FIXED** |
| "three sets of eight", "five by five" | not read | **FIXED** |
| `4x8 - 90s rest` | — | PASS (not misread as range 8–90) |
| Supersets `A1/A2` | PASS | PASS |
| Superset on one line (`SS: Curl 3x12 / Pushdown 3x12`) | one lift with both names | **FIXED** two lifts |
| `Warm-up:` / `Main:` / `Cool-down:` labels | became three separate days | **FIXED** one day |
| Rest notes ("90s rest", "(rest 2 min)", "rest 60 sec") | "rest" debris | **FIXED** |
| "Rest 3 min between sets" on its own line | exercise | **FIXED** skipped + listed |
| Days as Monday / Day 1 / Push / Upper A / Push Day / dates | PASS | PASS |
| Abbreviated days `Mon`, `mon - chest n tris` | exercise | **FIXED** ("Sun salutation" stays an exercise) |
| "Mon: Squat 5x5, Bench 5x5, Row 5x5" (days per line) | one junk lift per line, 1 day | **FIXED** 3 days × 3 lifts |
| One line, several lifts ("Bench 4x8, Row 4x8, …") | one lift | **FIXED** |
| Weeks `Week 1` | PASS | PASS |
| Weeks `Wk2`, `W3`, `Week One` | exercises; 3 weeks read as 1 | **FIXED** |
| Weeks `Block 1` | exercise | **FIXED** skipped + listed (see gap G-7) |
| `Weeks 1-4` / `Weeks 5-8` | exercises | **FIXED** read as week 1 / week 5 (see gap G-8) |
| Cardio: "20 min bike", "5k run", "3 mi", "Run 3 miles", "Row 2000m" | 3×10 lifts; "2000m" = 2,000 minutes | **FIXED** cardio bouts with real targets |
| Emojis, smart quotes, en/em dashes, NBSP, CRLF, trailing spaces | quotes kept in name | **FIXED** |
| ChatGPT `**bold**` headings and names | asterisks in names | **FIXED** |
| Non-English names | PASS (kept as written, flagged unmatched) | PASS |
| 1 line | PASS | PASS |
| 0 lines / whitespace | PASS ("Nothing to read") | PASS |
| 12 weeks × 6 days (432 rows) | PASS | PASS |
| 7+ days | dropped, said only in the toast after Create | **FIXED** said in the preview before Create, and in week 2+ too |
| 60+ weeks | clamped, said only after Create | **FIXED** said in the preview |
| Sets/reps over 8 × 60 ("Push-ups 5x100") | **silently cut to 5×60 on Create** | **FIXED** limit raised to 50 × 500 (`080480c`); anything past it is named in the preview |
| Pure prose | imported as ONE exercise with a 150-char name | **FIXED** refused |
| A pasted URL | imported as an exercise | **FIXED** refused |
| Email with greeting + signature | "Hi Jordan", phone number, "Sent from my iPhone" as exercises | **FIXED** skipped + listed |

### A+. The real-world cases the PO named

| Case | Before | Now |
|---|---|---|
| Text message with typos ("ok heres ur workout… lmk if u have questions") | small talk as exercises, "mon - chest" as exercise | **FIXED** |
| Instagram caption (title, ▪️ bullets, "Save this 📌", hashtags) | title/CTA/hashtags as exercises; "3 x AMRAP" split a day | **FIXED** |
| Facebook post ("changed my life!!! 👇") | intro/outro as exercises | **FIXED** |
| PDF text with fluff (title, ©, disclaimer, intro, nutrition, FAQ, URL) | 6 days, 4 of them junk | **FIXED** 2 real days, 8 lines listed |
| Rest days twice a week (Mon–Sun, "Rest" on Wed and Sun) | "Rest" imported as an exercise; Sunday dropped by the 6-day cap | **FIXED** 5 training days, nothing dropped |
| Rest rows in a table | exercises called "Rest" | **FIXED** |
| Running plan by the mile, typed ("Monday: Easy run 3 miles") | **kept 1 of 5 sessions** | **FIXED** all runs, with miles |
| Running plan in a Week/Day/Workout table | **kept 1 of 6 rows**, Week column ignored | **FIXED** 2 weeks × 3 runs |
| "Mon: 3 mi easy" (no word "run") | 3×10 lift | **FIXED** read as a run (PO: miles for running) — see G-4 |
| "Week 1: 15 miles" (weekly volume) | exercise | **FIXED** not a run, not an exercise |
| Workout shared from Hevy/Strong ("Set 1: 135 lbs x 10") | every set an exercise | **FIXED** 3 sets of the lift |
| 5/3/1 ("65% x 5 / 75% x 5 / 85% x 5+") | PASS | PASS |
| Same day name repeated ("Full Body" ×3) | PASS | PASS |
| Couch-to-5K ("Day 2: Same as Day 1") | Day 2 and 3 **silently vanished** | **FIXED** Days 2–3 copy Day 1 (`080480c`) |
| Per-lift progression ("Squat / Week 1: 3x8 / Week 2: 3x6") | exercise called "3x8" | no fake exercise; lines listed — **GAP** G-6 |
| Intervals ("4 x 800m intervals", "6x400m") | lift "m intervals" | lift "intervals" 4×800, note kept — **GAP** G-3 |
| EMOM / AMRAP circuits / "3 rounds:" | junk | still junk — **GAP** G-9 |

Every FIXED row above is held by a test in `import-real-world.test.mjs`, `program-import-draft.test.mjs`,
`photo-read-result.test.mjs` or `pdf-real-files.test.mjs`.

### B. PDF (real files, real extractor)

| Case | Result |
|---|---|
| Google Doc export (headings + bullets) | PASS — title listed as skipped |
| Google Sheet → PDF (gridded table) | PASS — 2 weeks × 2 days, exact |
| Word → PDF (bordered table, Rest/Notes columns) | PASS |
| Canva/designed, two days side by side | was one day of "Bench Press Deadlift"… — **FIXED** |
| Multi-page 12-week program with intro page, header on every page, page numbers | header became an exercise every week — **FIXED** 12 × 4 days exact |
| Scanned / image-only | PASS — "That PDF has no text to read — it's probably a scan." |
| Blank PDF | PASS — same message |
| Password-protected | said "Couldn't read that PDF" — **FIXED** says it's password-protected |
| Non-PDF renamed .pdf | vague — **FIXED** "That file isn't a readable PDF" |
| 60 MB PDF | PASS on web (extracted in 50 ms) — phone NOT RUN (see §3) |
| Cancel the picker | code-reviewed: resolves `reason: ''`, no error shown — browser NOT RUN |
| From iPhone Files / iCloud / Google Drive / Android Files | NOT RUN (see §3) |

### C. Photos

| Case | Result |
|---|---|
| Too big (>limit) | function answers 400 `too_large`; **app said "check your connection"** — **FIXED** says too big |
| HEIC/AVIF reaching the function | function answers 400 `bad_request`; **app said "check your connection"** — **FIXED** "That image type can't be read… take a screenshot" and refused client-side (no credit, no round trip) |
| Server failing (no key / meter down / model error) | **app said "check your connection"** — **FIXED** "Photo reading isn't working right now" |
| Account without Premium AI (0203 gate, allowance 0) | **app said "out of credits for this month"** — **FIXED** "Reading photos is part of Premium AI" |
| `/program-import?m=photo` without Premium AI | opened a dead uploader — **FIXED** opens the paste screen |
| Double-tap Preview | could run two read loops = every photo paid twice — **FIXED** ref guard |
| Image type labelled wrong by a phone (`octet-stream`) | would have been sent/refused on the label — **FIXED** sniffed from bytes |
| 5–7.5 MB image | passed the function's 10M-char check, spent a credit, failed upstream — **FIXED** in code (`MAX_BASE64_CHARS` 6.99M) — **needs function redeploy** |
| Signed-out call | 503 `meter_unavailable` (screen itself is signed-in only) — PASS |
| iPhone PNG screenshot | PASS — 5/5 exercises, 2 days, 3.4 s (sent as a 41 KB JPEG) |
| Dark-mode screenshot | PASS |
| Android WebP | PASS (re-encoded to JPEG before sending) |
| 12 MP photo | PASS (downscaled to 90 KB) |
| Photo stored sideways with rotate-EXIF | PASS |
| 48 MP photo (8000 × 6000) | PASS (downscaled to 93 KB — nowhere near any limit) |
| Tiny 220 px | PASS (sent as-is, read correctly) |
| Animated GIF | PASS |
| AVIF | PASS (Chrome decodes it; re-encoded to JPEG) |
| Handwritten on paper, photographed at an angle | PASS |
| Blank page | PASS — "That doesn't look like a training program" |
| Receipt | PASS — same refusal |
| A person | PASS — same refusal; the function returned nothing about the person |
| HEIC the browser can't open (desktop Chrome) | **was: nothing happened at all** — no thumbnail, no message, and good photos picked alongside it vanished too — **FIXED `34697c2`**, now says so and suggests a screenshot; 0 reads |
| Real iPhone HEIC / Live Photo / ProRAW / panorama | cannot be produced here — see §3 |
| 3 photos | PASS — numbered 1-2-3, "Days run in this order" |
| Back from preview, preview again | PASS — **no re-read** (3 calls stayed 3) |
| Reorder, remove, add one more | PASS — only the new photo read |
| Pick 7 (cap 6) | PASS — keeps 6, "Add more photos" disappears |
| One bad photo among good | PASS — "Photo 2: That doesn't look like…", the good read is reused after removing it |
| Same table photographed 3 times | 6 days, repeated — **GAP** G-11 |
| Chromium and WebKit (Safari engine) | PASS in both |

### D. Failure & state

| Case | Result |
|---|---|
| Signed-out `/program-import` | PASS — redirects to sign-in at 390 and 1440 (Playwright) |
| Premium AI OFF — no card | PASS by code (`photoOn` gate on the card); server refusal now worded right |
| Out of credits | report-only per PO: mapping unit-tested (`out_of_credits` with allowance > 0) |
| Expired/removed key (`unconfigured`) | now "isn't working right now" (unit-tested) |
| Free user out of imports / at program cap | **cannot be tested in production**: `default_tier = PREMIUM`, so every gate passes — see G-10 |
| Premium AI switch (Settings → Subscription) | PASS — turns on and survives a reload. ⚠ it has no on/off state for screen readers (see G-16) |
| Triple-tap Preview | PASS — one read (fix `4887b48`) |
| Offline mid-read | PASS — "Couldn't reach us… Check your connection"; tapping again once online works |
| Slow 3G (50 KB/s, 400 ms) | PASS — 4.1 s |
| Cancel mid-read | PASS — lands on Workouts, no errors. The read still completes and is paid (G-17) |
| Background the app mid-read | NOT RUN — needs a phone (§3) |

### E. After preview · F. From scratch + entry · G. Devices & layout

| Case | Result |
|---|---|
| Preview lists the lines it skipped | PASS — caption title and hashtags listed |
| "Incline DB" → Dumbbell Incline Bench Press | PASS live (≈, the convention mark) |
| − / + edits carry into the draft | PASS — Incline DB 4 → 5 sets, still 5 in the builder and in the workout |
| Add another week | PASS — 2 weeks |
| Create → builder with the draft | PASS — 4 days · 6 exercises, "Same as Day 1" copied |
| Save creates the program | PASS — program page "Imported Program · 2 weeks · 4 days / week" |
| Free import spent only on Save | PASS — `athlete_usage.has_used_free_import = true` after Save, not before |
| The program runs | PASS — Start program → Home "Push · 2 exercises" → workout shows Incline DB 5×8 and Push-ups 5 sets |
| Unmatched names kept and flagged | PASS — "not in the library · kept as written" |
| 3 cards, none highlighted | PASS |
| RECOMMENDED follows experience | PASS — this account is stored as `advanced` → 5 |
| "I'll build my own days" | PASS — blank Day A, "Save & go to Day B" |
| "Want full control?" both buttons | PASS — Continue closes it; Set it up myself opens the builder |
| 360 / 390 / 430 / 768 / 1440 px | PASS — no sideways scroll on Build a Program, Paste, or Preview; Create pinned in the footer; content column capped on desktop |
| Keyboard over the paste box, VoiceOver, Android Chrome, Firefox | NOT RUN — §3 |

---

## 2. Gap list (ranked)

**Fixed in this pass** (crash/data-loss and wrong-data-silently tiers): every FIXED row above. The ones
that mattered most: running plans losing 80–85% of their sessions; rest days displacing real days;
sets/reps over 8×60 cut silently on Create; a 7th day in week 2+ dropped with no word; every photo
server/format error reported as a connection problem; a double tap paying twice.

**Still open — needs a PO decision**

| # | Severity | Gap | Where | Repro | Needs |
|---|---|---|---|---|---|
| G-1 | Done | "Incline DB" now matches Dumbbell Incline Bench Press; naming the movement ("Incline DB Curl") still reaches that movement | — | — | PO decided 2026-09-21 · fixed in `080480c` |
| G-2 | Done | Limit raised from 8 × 60 to 50 sets × 500 reps (500 = what the workout screen carries) | — | — | PO decided 2026-09-21 · fixed in `080480c` |
| G-3 | Wrong data, visible | Interval runs ("4 x 800m", "6x400m") import as a lift "intervals" 4×800 | `import-parse.ts` `workItems` | paste "Wednesday: 4 x 800m intervals" | Should N×distance be a run with the reps as a note? |
| G-4 | Judgement made | A distance with no activity word ("3 mi easy") is read as a run | `import-parse.ts` `cardioItems` | — | Confirm (made on your "miles for running" instruction; easy to revert) |
| G-5 | Done | "Same as Day 1" / "Same as Monday" / "repeat Day 1" copy that day | — | — | PO decided 2026-09-21 · fixed in `080480c` |
| G-6 | Lost work, now visible | Per-lift weekly progression lists aren't supported | same | "Squat / Week 1: 3x8 / Week 2: 3x6" | Support this format? |
| G-7/8 | Dead end, visible | "Block 1" / "Weeks 1-4" don't repeat weeks | same | — | Expand ranges into repeated weeks? |
| G-9 | Wrong data, visible | EMOM / AMRAP / "3 rounds" circuits | same | — | Circuit support is a model change |
| G-10 | Latent | Direct link `/program-import` skips the imports/programs cap check (only the Build a Program cards run it). No effect today (`default_tier=PREMIUM`) | `app/program-import.tsx` | — | Guard the screen before free tiers go live |
| G-11 | Money | Picking the same photo twice on web gives two blob URLs → read and paid twice, days duplicated | `app/program-import.tsx` | select one image twice | Dedupe by content hash? |
| G-12 | Lost work | Create on the paste/photo screen overwrites any unsaved builder draft without asking | `program-import.tsx` `create` → `saveProgramDraft` | half-build a program, then import | Ask first? |
| G-13 | Dead end | Photo misreads can't be edited as text on the new Upload Pictures screen (the old sheet put the transcript in an editable box) | `program-import.tsx` | — | Show the transcript? |
| G-14 | Cosmetic | "Do this 3x per week:" becomes a day name | parser | — | — |
| G-15 | Deploy | `MAX_BASE64_CHARS` change is committed but the function is not redeployed | `supabase/functions/program-photo-read` | — | PO deploys the function |
| G-16 | Accessibility | The Premium AI switch has no on/off state for screen readers (`role=switch` with no checked state) | `app/subscription.tsx` | VoiceOver on Settings → Subscription | Small fix, not import |
| G-17 | Money | Cancelling mid-read still pays for the read that was already sent | `program-import.tsx` | Cancel while "Reading…" | Accept? (cannot be recalled once sent) |
| G-18 | Cosmetic | A sentence typed on the same line as a lift stays in its name ("Barbell Row with a long coaching note…") | parser | — | — |
| G-19 | Privacy, outside import | Any signed-in account can read every other account's experience and training goals from `profiles` | RLS on `profiles` | query `profiles?select=experience,training_goals` | Check the policy is meant to expose these |

---

## 3. Could not test here, and the smallest steps to cover it

| What | Why | Steps for the PO (phone) |
|---|---|---|
| HEIC / Live Photo / ProRAW / panorama | No HEIF encoder in this environment | iPhone: Build a Program → Upload pictures → pick one normal camera photo of a printed program and one Live Photo. Expect a preview, or "That image type can't be read". |
| PDF from Files / iCloud / Google Drive / Android | Needs the device pickers | Paste a program → Upload a PDF → pick a program PDF from Files, then one from Google Drive. Expect the text in the box. |
| 60 MB PDF on a phone | Native reads it as one base64 string; may run out of memory | Same, with the largest PDF you own. Report a crash or hang. |
| Keyboard covering the paste box, screen reader | Needs a device | Paste screen: tap the box with a long paste — can you still reach PREVIEW IMPORT? VoiceOver: swipe through the preview. |
| Backgrounding the app mid-read | Needs a phone | Upload pictures → Preview → switch apps for 10 s → come back. Expect the preview or a clear error, not a frozen "Reading…". |
| Android Chrome, Firefox | Not installed here | Open forgelegacy.expo.app, paste the example, Preview, Create. |

## 4. Budget

Model reads used: **25 / 60** — 13 single-photo formats, 4 multi-photo, 3 bad-among-good, 4 failure cases (the offline attempt never left the browser), 1 WebKit. Every refused probe (size, type,
auth, HEIC) cost nothing.
