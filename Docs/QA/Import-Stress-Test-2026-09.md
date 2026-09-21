# Build a Program import — stress test (2026-09-21)

**Scope:** Paste a program, Upload a PDF, Upload pictures, the preview, and the draft the import creates.
**Method:** Every paste/PDF case was run through the real code (`parseProgramTable`, `extractPdfText`,
`draftFromImport`, the real exercise resolver) under `node`. PDFs and images are real generated files
(PyMuPDF / Pillow). The Edge Function was called directly on its free (pre-model) paths. The web preview
was driven with Playwright for signed-out access.
**Commits:** `4887b48` (parser, draft, photo errors), `2f623b3` (PDFs, function size cap).
**Deployed:** web preview `index-e520f66248bf795434d03717c9ead805.js` (after the PO decisions, `080480c`), hash verified live. No OTA.
**Tests:** 3,577 node tests pass (41 new); tsc and eslint clean.

## Status of this document

Sections A and B are complete. Section C is complete for everything that costs no model read. **The
signed-in UI checks (C paid reads, D, E, F, G) have not been run yet** — they need a signed-in test
account token, which the PO chose to paste (not yet received). They are listed as NOT RUN below, never
as passes.

**Model reads used: 0 of 60.**

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
| Fixtures built: 12MP JPEG, rotated EXIF, iPhone PNG screenshot, dark-mode screenshot, Android WebP, AVIF, tiny 220px, 48MP PNG/JPEG, animated GIF, blank, handwritten at an angle, receipt, person figure | built; **model reads NOT RUN** (token pending) |
| HEIC, Live Photo, ProRAW/DNG, panorama | cannot be produced here (no HEIF encoder) — see §3 |
| Multi-photo (1/3/6/7, duplicates, reorder, remove, back = no re-read, one bad among good) | code-reviewed (see G-11, G-12); **browser NOT RUN** |
| Person photo must never be described | guard is `sanitizeTranscript` (tab-only), covered by existing tests; live read NOT RUN |

### D. Failure & state

| Case | Result |
|---|---|
| Signed-out `/program-import` | PASS — redirects to sign-in at 390 and 1440 (Playwright) |
| Premium AI OFF — no card | PASS by code (`photoOn` gate on the card); server refusal now worded right |
| Out of credits | report-only per PO: mapping unit-tested (`out_of_credits` with allowance > 0) |
| Expired/removed key (`unconfigured`) | now "isn't working right now" (unit-tested) |
| Free user out of imports / at program cap | **cannot be tested in production**: `default_tier = PREMIUM`, so every gate passes — see G-10 |
| Airplane mode / slow 3G / leave mid-read / background mid-read | NOT RUN (token pending) |

### E. After preview · F. From scratch + entry · G. Devices & layout

**NOT RUN** — all need a signed-in session. Code review found G-12 (a Create silently replaces any
unsaved draft). RECOMMENDED = 3/4/5/3 is unit-level in `3f1cbcc` and was not re-run here.

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

---

## 3. Could not test here, and the smallest steps to cover it

| What | Why | Steps for the PO (phone) |
|---|---|---|
| HEIC / Live Photo / ProRAW / panorama | No HEIF encoder in this environment | iPhone: Build a Program → Upload pictures → pick one normal camera photo of a printed program and one Live Photo. Expect a preview, or "That image type can't be read". |
| PDF from Files / iCloud / Google Drive / Android | Needs the device pickers | Paste a program → Upload a PDF → pick a program PDF from Files, then one from Google Drive. Expect the text in the box. |
| 60 MB PDF on a phone | Native reads it as one base64 string; may run out of memory | Same, with the largest PDF you own. Report a crash or hang. |
| Keyboard covering the paste box, screen reader | Needs a device | Paste screen: tap the box with a long paste — can you still reach PREVIEW IMPORT? VoiceOver: swipe through the preview. |
| Every signed-in check (C reads, D, E, F, G) | Waiting on the test-account token | Paste the token in chat; the runs take ~30 minutes and ≤ 60 reads. |

## 4. Budget

Model reads used: **0 / 60**. Every function call made was refused before the model (size, type, auth).
