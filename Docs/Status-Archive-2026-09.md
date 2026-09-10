# Status Archive — September 2026

Overflow from `Forge-Legacy-Master-Status.md` § Recently Completed, moved **verbatim** under maintenance rule 6. Nothing here was deleted — several of these entries are the only surviving record of why something was built the way it was.

---

### 0. ⛔ A rolled-back migration left its client half on the OTA branch, and a squad photo expired an hour after it was posted (2026-09-06, Photos / squad feed — **repair SQL applied**, ✅ **DEPLOYED BOTH SURFACES** — web `index-faac21764dfc0352d2b730bdf8caa374.js`, iOS OTA `01a073b6-40c4-7113-80f9-4a7a4a151349` on runtime `47944f2e…`, commit `ce65aa6` on `ota/build8-js`. ✅ **CONFIRMED BY THE PO IN THE APP** — *"I can see it now."*)

PO: *"Why is this picture in the squad not showing up… He can see it on his side but I can't see it on my side."*

`squad_posts.media` on Brady's recap held a **signed URL with a 60-minute TTL** — issued 19:22:52Z, expired 20:22:52Z, and returning `400 InvalidJWT: "exp" claim timestamp check failed` by the time anyone else looked. The same object via `/object/public/` returned **200 and 507 KB**. ⭐ **A PERMANENT ROW WAS HOLDING A ONE-HOUR URL.**

⭐ **THE ASYMMETRY WAS THE WHOLE DIAGNOSIS AND IT POINTED AT THE WRONG THING FOR AN HOUR.** "He sees it, I don't" reads as permissions, and it is not: the author sees it because **his own client cached the image inside the hour the token was valid**. Nobody else ever had it cached. ⚠ When one person can see media and another cannot, check the URL's LIFETIME before checking anyone's access.

⛔ **THE CAUSE: `fd09f99` EXISTS ON EXACTLY ONE BRANCH.**

```
$ git branch --contains fd09f99
  ota/build8-js
```

It is the client half of `0188` — `signMedia`, written for a PRIVATE `chapter-photos` bucket. **`0188` was rolled back the same hour** (the bucket is public by PO decision, `project_photo_buckets_public_by_decision`) **but only the DATABASE half was undone.** The signing code stayed on the branch that feeds every OTA, and no other branch — `feat/route-map` never had it and needed no change.

⚠ **SIGNING A PUBLIC BUCKET IS INVISIBLE WHILE RENDERING.** That is why it survived four days and three deploys unnoticed: every photo still drew correctly. It is fatal only when a URL is **PERSISTED**, and `workout-complete.tsx:257` attaches today's chapter photo to a squad recap — a straight path from a signed read into a permanent row. ⭐ **The lesson generalises past photos: a rollback is not complete until the client half is reverted too, and "the app still looks right" does not prove it was.** The existing rule (`feedback_migration_can_break_the_deployed_client`) covered applying a migration ahead of client code; this is the mirror image and was not covered.

⚠ **I SHIPPED THIS LINEAGE TWICE ON 09-05 WITHOUT NOTICING IT CARRIED A ROLLED-BACK MIGRATION'S CLIENT HALF**, and the web deploy spread it to the preview for the first time. The OTA branch is NOT merely "route-map's JS-only commits cherry-picked" — it carries commits of its own, and `git branch --contains` is the check that says so.

**The fix, in two halves and in this order.** ① `ce65aa6` reverts the client half — `signed-media.ts` deleted, `photos-live.ts` / `legacy-archive-live.ts` / `auth.tsx` restored. ⚠ `0188_private_chapter_photos.sql` and `pending-0188.sql` are **KEPT**: the migration was applied and rolled back, and that belongs in the ledger. ② `supabase/apply/repair-signed-media-urls.sql` rewrote the stored URLs `/object/sign/…?token=` → `/object/public/…`, preserving photo ORDER (a transformation post carries two and reversing them would silently invert a before/after). **1 row affected, verified 0 remaining.**

⭐ **THE REPAIR DID NOT NEED TO WAIT FOR THE OTHER DEVICE, AND THAT WAS CHECKED RATHER THAN ASSUMED.** PO: *"should I just wait until I know for sure that he has opened it?"* No — on the stale build `signMedia` is applied in only `legacy-archive-live.ts:73` and `photos-live.ts:102,117,141,248`. **The squad feed read does not sign at all**, so an un-updated client renders a repaired public URL correctly and can only write a bad one by COMPOSING a new post. The repair is idempotent; the standing check is:

```sql
select count(*) from public.squad_posts where media::text like '%/object/sign/%';
```

⚠ **Non-zero at any later date means somebody posted from a stale build — re-run the repair, do not re-investigate.**

⚠ **`sheet-drag-wiring.test.mjs` FAILS ON `ota/build8-js` AND DID BEFORE THIS PASS** — proven by re-running it with the revert stashed. 3156 pass / 1 fail. **The OTA branch does not have a green suite**; the main tree does (3239). Do not read a green gate off this branch.

### 0. ⭐ A weight somebody lifted is shown exactly — 37.5 stops rendering as 38 (2026-09-05, Units / set cards / watch / lift chart / Body — **no migration**, ✅ **DEPLOYED BOTH SURFACES** — web `index-cd0b3482b525ac6703ed70acb1e0af66.js`, iOS OTA `01a0721b-ef68-710c-b5cf-5d0b9716c600` on runtime `47944f2e…`, commit `8343d1c` on `feat/route-map`, cherry-picked as `a76ed53` on `ota/build8-js`. ⏳ **NOT YET CONFIRMED ON A DEVICE**)

PO: *"On each set card during an active workout it shows what was done last time. For some reason we're rounding numbers up. For example, instead of 37.5 we're putting 38 for the weight. We want the exact for all of them."*

`displayWeight` rounded to a whole number on the reasoning that **gyms don't count grams**. Gyms do, however, count **half pounds**: 37.5 is a real dumbbell, 2.5 is a real plate, and a 1.25 kg micro-plate is the entire point of owning one.

⚠ **NOTHING WAS WRONG WITH THE DATA, AND THAT IS THE DIAGNOSTIC WORTH KEEPING.** `workout_sets.weight` is `numeric` and `readDraft` writes the weight with `round: false`, so the exact figure was typed and stored intact — it was destroyed at the last step, on the way back **out**. Today's live sets go through `setWeightLabel`, which never rounded, so **one lift read 37.5 while you trained and 38 a week later**. A number that changes depending on when you look at it is a display bug, not a storage bug; the round trip is where to look.

New `exactWeight` converts and quantises to two decimals. ⚠ **Quantising is not rounding.** 17 kg stores as 37.4785… lb and converts back to `17.000000000000004`, which rendered verbatim would be a **worse** lie than the rounding was. Two decimals holds every increment anybody loads — a 0.25 lb micro-plate included — and nothing else. A metric athlete's own kilos round-trip clean, and there is a test that walks six of them.

⭐ **THE RULE IS BY KIND, NOT BY PREFERENCE — a weight somebody actually LIFTED is exact; a total computed from many of them rounds.** So `displayWeight` survives and keeps every one of its remaining callers, all of which are summed **volume** (weekly review, workout total, ledger post, home circle). ⚠ A tonnage of `43,250.5 lb` is noise, not precision: the half pound is real on one plate and meaningless across four hundred of them. **Do not "finish the job" by pointing volume at `exactWeight`.**

Moved to exact: the set card's "last time" (the report), Last/Best, the live-workout viewer, the watch's set line, the lift chart's points/headline/delta, the per-exercise delta on Workout Complete, and **`formatLoad`** — which carries heaviest set, week's top lift, PR values and body weight.

⭐ **TWO DOUBLE-ROUNDING BUGS FELL OUT OF THE SAME PASS, NEITHER REPORTED.** `BodySection` subtracted two already-rounded body weights — drifting by up to a whole unit against the change the athlete would compute themselves, and **erasing any change under half a pound entirely**, which on that screen is most real weeks. And `changeLabel` rounded a lift delta, so a 2.5 lb gain reported "+3". Both now convert the DELTA, never the endpoints — the rule `changeLabel`'s own comment had already documented and its code did not follow.

⚠ **CONSEQUENCES, STATED SO NOBODY FILES THEM AS REGRESSIONS.** A metric athlete reading an *imperial-logged* lift now sees `183.7 kg × 3` rather than `184`, and the Preferences preview shows the true `142.88 kg` for its fixed 315 lb. Both are the honest conversion; the old figures named lifts nobody did.

⚠ **THE WATCH CHANGE IS NOT IN THIS OTA.** `watch-projection.ts` **does not exist on `ota/build8-js`** — the watch postdates build 8's base and was never cherry-picked, so build 8 has no watch projection to fix. The change is on `feat/route-map` and ships whenever the watch does. The cherry-pick conflicted as `DU` on three files and was resolved by keeping them absent, which is the correct resolution and not a dropped change.

✅ **VERIFIED, NOT MERELY PUBLISHED.** `fingerprint:compare --build-id 3f67281b…` matched build 8 exactly BEFORE publishing. Dry-run payload healthy (20,899-byte tarball, `assets.json` 63,305 bytes). ⚠ **The production alias served the PREVIOUS hash for ~5.3 minutes** while the deployment's own URL was already 200-and-matching — textbook propagation, and the deployment-URL probe is what told it apart from an empty worker. **It was not re-deployed.** The live bundle was then fetched from `forgelegacy.expo.app` and the minified quantiser `Math.round(100*o(t,n))/100` found in it. ⚠ **A source-level grep for `*100)/100` returned ZERO** — the minifier had reordered it to `100*o(...)`; a check written against the un-minified shape would have reported the fix missing. tsc clean · 3239 tests pass · lint at baseline.


### 0. A set leaves the table from its own row — the Remove Set pill is gone (2026-08-27, Active Workout — **no migration**, ✅ **WEB DEPLOYED** `index-167b1ae51fc074a35304675302b311ed` · ✅ **OTA PUBLISHED TO BUILD 7** iOS `01a0461c-7e9a-7a30-ac3c-51e6eb4a77dd`, runtime `4d728d16…` — commit `49a97ab`)

**PO:** *"take out the 'remove set' button during an active workout and put a small subtle red trash can symbol on the right of the set."* Each set row now ends in a 14pt trash glyph (`redMuted`, half opacity, full on press) in a fixed 22pt trailing column that the header carries too, so the three data cells keep their widths; `hitSlop` gives it a 44pt target without drawing one. It is **absent, not greyed, at one set** — a disabled trash beside the only set reads as "this one is stuck". Add Set is full width again. ⚠ `removeSet` now removes the TAPPED set rather than the tail, and **re-indexes `setIndex` after the splice** — `save-core` writes it as `set_index` and matches saved rows to fresh ones by that number, so a hole would save a session numbered 1, 2, 4.

**Gates:** tsc 0 · **2,908/2,908** · lint at baseline. Shipped later the same evening with the import pass below — both surfaces, the OTA from the worktree route that entry describes. ⏳ Not seen rendered.

### 0. Every grabber drags — Holt's sheet too — and the ⋮ menu stops repeating Holt (2026-08-28, BottomSheet / SessionCoachSheet / Active Workout — **no migration**, ✅ **WEB DEPLOYED** `index-d797721b8f4c7213bdbe27ccb4b8f4ff` · ✅ **OTA PUBLISHED TO BUILD 7** iOS `01a04898-1949-7507-bc18-4fc22fb5891f`, runtime `4d728d16…` — commit `f1bd582`)

**PO:** *"The line at the top in the middle is an indicator that you can drag that page down and gone. But the only way to get out right now is with the x. This is happening everywhere in the app."* And, on the ⋮ menu: *"things that we should just have coach holt have. Let's make sure we're not repeating and we keep it simple."*

⭐ **DRAG.** `useSheetDrag` shipped on the composite on 2026-08-25 and two things were still true three days later: **Holt's session sheet rolls its own overlay and was never wired** (it drew the handle with nothing behind it), and the composite's grab area was a **22px strip above the title** — present, unfindable. Holt's sheet now uses the same hook on the grabber AND the whole header (the × still taps; a responder only claims a move); the composite's target is the handle **plus the title**, with hit-slop, so the row a thumb lands on is the one that dismisses. Nothing below the title is claimed — bodies scroll as before. The sweep for other unwired grabbers found none: `styles.handle` elsewhere is the @handle text, and the Holt chat has its own pan. ⭐ **THE ⋮ MENU** keeps to the SESSION (name, note, who is here, playlist, end); Add an exercise · Swap · Superset with next · Break the superset · Skip are gone from it because Holt's CHANGE THE PLAN carries every one. `sheet-drag-wiring.test.mjs` holds the menu never repeats those rows and Holt never loses them.

**Gates:** sheet-drag-wiring **3/3** · full suite **2,951/2,951** · tsc 0 · lint at baseline. ⏳ Not dragged on a device.


### 0. ⭐ See what a friend has logged and has planned while they train — and the share confirmation stays until Done (2026-08-27, Live Workout / Privacy / Share sheet — ✅ **MIGRATION `0181` APPLIED AND VERIFIED 2026-08-27** (§3 matched the prediction exactly: `live_rows 0 · athletes_opted_in 0 · reader_is_definer true · policies 1`), ✅ **WEB DEPLOYED** `index-fabbdade2704478e0bbfaf5e90dffa0d` · ✅ **OTA PUBLISHED TO BUILD 7** iOS `01a0469c-b9f0-7a86-ab02-520e326ddbb7`, runtime `4d728d16…` — commits `462a287` `fbeceb0`)

**PO:** *"I see a friend working out rn I should be able to see what they've logged and have planned."* And: *"the confirmation for sharing the workout at the end. Something popping up confirming that I shared it."*

⭐ **LIVE WORKOUT.** Until now the only live fact was a label and a start time on `profiles` (0086); the session never left the phone. Now the athlete's own phone publishes a small snapshot of the plan and the log (`domain/workout/live-session.ts` — a set is five numbers and a flag; **no notes, no cues, no history**) to ONE ROW per athlete (`live_sessions`), debounced 4 s behind every change and only while they have opted in; the row is cleared where every session ending passes and ignored after 4 hours — the "log of every session anyone ever began" that 0086 refuses to keep is still not kept. A friend or squad-mate opens **`/live-workout/[id]`** from the Live Now row, the Training Now sheet, or the profile's "Training now" row, and sees progress, every exercise with its logged sets (weight × reps in their units) and the planned ones, the one they are on marked NOW, and Ask to join.

⚠ **OPT-IN, DEFAULT PRIVATE, ON BOTH SIDES OF THE WIRE.** A new Privacy row **"Live Workout Detail"** (`visibility.live_session`, default `private`) gates the DEFINER reader `live_session_of` BEHIND the existing `training` gate, so the detail can never be more visible than the fact. CC-D2 / WSR-D6 forbid live performance on always-on surfaces; an athlete choosing to publish it is the same door 0117 opens for a posted workout. The screen keeps the model honest with four states: session ended · not sharing (Join still offered) · sharing but nothing published yet (an older build) · the plan and the log. `live-workout-wiring.test.mjs` holds the route, the entry points, the throttle, the clear, and the private default in BOTH the client and the SQL.

✅ **`0181` APPLIED AND VERIFIED** — the PO pasted `supabase/apply/pending-0181.sql` the same evening and §3 came back exactly as predicted (`live_rows 0 · athletes_opted_in 0 · reader_is_definer true · policies 1`). SQL applied ✅ · client deployed ✅ (web + build-7 OTA) · **seen working ⏳** — the remaining proof is one athlete flipping Live Workout Detail on, training, and a friend opening the row.

⭐ **THE SHARE CONFIRMATION.** A successful share turns the sheet into the confirmation — a check, *"Shared with your friends and Da Bois"*, and Done — and it stays until dismissed. The toast is gone from that path.

**Gates:** live-session **4/4** · live-workout-wiring **6/6** · ecosystem updated (9 visibility sections) · full suite **2,948/2,948** · tsc 0 (typed routes regenerated with `npx expo customize tsconfig.json` — a web export does NOT regenerate them) · lint at baseline. ⏳ **Never seen on a device**, and cannot be until 0181 is applied.


### 0. ⭐ The video plays (both feeds), the caption reaches the post, "Shared" stays said, and the clip has a frame (2026-08-27, Squad feed / Friends feed / Share sheet / Workout Complete — **no migration**, ✅ **WEB DEPLOYED** `index-609fbc3850cf0f1b8918e99aba7dcad0` · ✅ **OTAs PUBLISHED TO BUILD 7** iOS `01a0462e-939f-7ca3…` + `01a04647-5563-76d6…`, runtime `4d728d16…` — commits `1f10bd6` `9184d88`)

**PO, one post, one message:** *"I clicked the video but it just showed me the workout summary and not the video. And then I put a comment when I was creating the post after the workout and it's not showing the comment. Also, I clicked share to squad and friends after my workout from the share card and it's still not showing me that I shared it in any way. I just need something that says that I actually shared it or else people will double post."* And: *"the video is not centered in the post."* Four defects, all WIRING — a handler sending the tap to the wrong place, a field carried to one table and not the other, a record that existed and was read by nothing, a tile with no frame in it. None visible to tsc or to `node --test`, so `post-share-wiring.test.mjs` holds each as a source guard.

⭐ **THE VIDEO.** The card had ONE handler and a recap's was the workout summary. `LedgerPost` gains `onMedia`: the media band is its own control, and the squad feed sends a video tap to `/pin-video` — the full-screen player a pinned video already uses (S-2 §17.4). The stats still open the session. **The friends feed** had the same handler — and for a plain video post no handler at all — and now plays the clip through the same player (`9184d88`, OTA `01a04647…`, web `index-609fbc38…`). ⭐ **THE CAPTION — TWICE.** The line typed under the video on `/add-photo` reached `chapter_photos.caption` and never the post — `sharePhotos` carried the URL and dropped it; it became the body when no reflection was sealed. PO, after that OTA: *"it's not showing the caption. fix the caption rn."* So the sheet stopped depending on which of three upstream boxes survived: **the share sheet has its own comment box**, seeded from what the caller sends, editable, and the recap posts exactly its contents (`a3cc707`, OTA `01a0466d…`, web `index-d903f51e…`). An unsealed note draft is forwarded too. ⭐ **"SHARED".** The record always existed (every share is a `squad_posts` row with `author_id` + `workout_id`) and nothing read it; the toast said so for three seconds. `fetchWorkoutShares` reads it — no table, no RPC. The sheet reads it on open, records every landed post per target (a halfway failure still marks what exists), says *"Shared with your friends and Da Bois"* above the tiles, and **refuses what is already there** while a squad that does not have it yet stays open. The completion screen reads it on arrival, so the button says **"Shared ✓ · Share again"** with a line saying what a second tap means. ⚠ **BOTH is one row that counts for friends AND its squad** — reading it as squad-only would double-post to friends (`share-state.test.mjs`). ⭐ **THE FRAME.** The tile was a flat black 16:9 rectangle with a comment claiming no frame could exist; `MediaThumb` had drawn a real first frame on the archive and the profile strip for weeks. The band draws that frame at a photo's 4:5, disc centred as an overlay. ⚠ Not built: a server-side unique on `(author_id, workout_id, squad_id)` — WSR-001 §8.4 explicitly allows repeat shares, so the guard is the UI's honesty, not a constraint.

**Gates:** share-state **7/7** · post-share-wiring **7/7** · full suite **2,936/2,936** · tsc 0 · lint at baseline. ⏳ **Not seen rendered** — the poster frame, the play route and the Shared state are device work.

### 0. ⭐ Import from a spreadsheet reaches both template builders — and reads PDFs, because a bought program is one (2026-08-27, Program Builder / Workout Builder / ImportSpreadsheetSheet / pdf-text — **no migration**, ✅ **WEB DEPLOYED** `index-167b1ae51fc074a35304675302b311ed` · ✅ **OTA PUBLISHED TO BUILD 7** iOS `01a0461c-7e9a-7a30-ac3c-51e6eb4a77dd`, runtime `4d728d16…` · ⏳ **phone file picking = BUILD 8** — commits `8cab18a` `79a3258` `c7d37d6`)

**PO:** *"Make sure the import feature for a workout is available in the template builder both the day and both the week."* Then: *"Also make sure it can import files/pdfs. If someone purchases a program it's usually a pdf."*

⭐ **ONE SHEET, THREE SURFACES.** The paste → preview sheet moved out of the Program Builder into `components/forge/ImportSpreadsheetSheet.tsx` with a SCOPE. `program` is unchanged; `week` un-hides the link in week mode — it was hidden because *"a paste of an 8-week block would be clamped to its first week with no honest way to say so"*, and the honest way is the scope, which cuts the read to week 1 and says which BEFORE anything is created; `day` puts the same link under the name in the Workout (template) Builder — no Week/Day columns needed, a multi-day paste keeps its first day and says so, rows are APPENDED to Main, and only the import cap is checked (a template is not a program). `program-photo-wiring.test.mjs` now reads the sheet for every screenshot-reader guard and adds three: both builders mount it with their scope AND expose the door; week mode never re-hides the link; the scope cuts and says so.

⭐ **A PDF IS A THIRD WAY TO FILL THE PASTE BOX** (`src/lib/pdf-text.ts`, `pdfjs-dist`). A PDF has no rows, only runs at positions; `itemsToLines` rebuilds them — one baseline (±2.5pt) is a line, a jump or blank run wider than 12pt is a TAB — so the parser's delimiter detection sees a table. Proven end to end on a generated PDF: bytes → pdf.js → `parseProgramTable` → Bench Press 3×8. ⚠ **The fixture is synthetic; no purchased PDF has been through it yet** — the preview is what makes a wrong read visible. ⚠ **TWO BUNDLER HAZARDS IN pdf.js, BOTH PROVEN HANDLED:** its Node-only branches use `import.meta` — a SYNTAX error in a Hermes bundle, i.e. an app that fails to LOAD — and `require("@napi-rs/canvas")`, native bindings Metro cannot bundle. New `babel.config.js` (the Expo preset plus one plugin) strips `import.meta`; new `metro.config.js` empties the canvas package. Proof: a web export has no `import.meta` in any chunk with pdf.js split into lazy chunks, and **an iOS export compiled to Hermes bytecode**. pdf.js also TRANSFERS the buffer it is given, so the input is copied — found by the test that reads one fixture twice.

⭐ **THE PHONE PICKS A FILE WITH BUILD 8.** `expo-document-picker` is a native module; `pick-text-file.ts` loads it **inside the tap, inside a try** (a top-level import would throw "Cannot find native module" on build 7's launch — the crash shape this repo has shipped once), takes the bytes back as base64, and sends a PDF through the same reader. Not cherry-picked onto the build-7 OTA branch on purpose.

⛔ **DELIVERY — THE OTA WENT OUT FROM A WORKTREE, AND THAT IS NOW A PROCEDURE.** Main's fingerprint had moved (the splash `app.json`, then `@bacons/apple-targets` from the Watch spike), so an OTA from main would have reached nobody. `C:/Users/isaia/forge-ota-wt` on branch `ota/build7-js` sits at `7b743ed` — the last commit whose fingerprint matched build 7 — with the JS-only commits cherry-picked. ⚠ **A `node_modules` junction does NOT work for this**: `@expo/fingerprint` records autolinking roots relative to the project, and a junction resolves to `../OneDrive - qest4.com/ForgeLegacy/node_modules/…`, so every native module "changes". `npm ci` in the worktree (35 s outside OneDrive) fixed that; the last diff was `eas.json` / `.easignore` — **CRLF on disk in main, LF in the checkout — the fingerprint hashes bytes**, so the exact bytes were copied across. `fingerprint:compare --build-id 39778ce0…` then reported **MATCH**, the update published on runtime `4d728d16…`, and the manifest endpoint queried as a build-7 iOS client returned the new id. Two OTAs went out this way tonight; the second carried the post fixes above.

**Gates:** pdf-text **12/12** · wiring **17/17** · full suite **2,937/2,937** · tsc 0 · lint at baseline. ⏳ **Native PDF reading is unverified on a device** (Hermes polyfills for `Promise.withResolvers` / `structuredClone` are in; anything else surfaces as the sheet's message, never a crash, because the engine loads lazily inside the tap).


### 0. ⭐ The OS was drawing a cropped square of the pillars, and the web painted Alabaster's launch black (2026-08-27, Splash / launch path — **no migration**, ✅ **WEB DEPLOYED** `index-f78f534ddec2f58739d391e884a9f926` · ⛔ **iOS NEEDS BUILD 8 — the fingerprint moved on `app.json`, no OTA reaches build 7**)

**PO, two notes on opening the app:** *"the first load splash screen has a weird two size logo"* and *"when it's the white version the splash screen is black first then it goes to the white."* Both lived in the hand-off between what the platform draws and what JS draws — and both had passed every gate, because a storyboard and a `<body>` are the two things no test here renders.

**⭐ THE TWO SIZES WERE A CROP, NOT A SCALE.** `expo-splash-screen`'s config plugin rasterises the splash image into an **`imageWidth × imageWidth` SQUARE** (`withIosSplashAssets.js`: `width: size, height: size`) and passes **no `fit`**, so sharp's default `cover` cropped the 308 × 452 carved mark to its middle 104 × 104 — pillars with their top and bottom cut off. JS then drew the whole mark at 104 × 153 over it. Every launch of builds 1–7 showed a cropped square, then the full picture. ⚠ **`splash-continuity.test.mjs` was green throughout because it asserted the wrong quantity**: it held the MARK's width equal to `imageWidth`, and `imageWidth` is the side of a box. The fix is a **square source asset** — `assets/splash-logo.png`, the same PNG padded to a transparent 452 × 452 (centred paste, offset 72 × 0, verified pixel-identical) — with `imageWidth: 150` as the box and the mark contain-fitted to ≈102 wide inside it, exactly as the storyboard's `scaleAspectFit` does; 3× = 450px so the source is never upscaled. `src/components/splash-geometry.ts` now owns the asset, the box and the window-centred top, and the test asserts the BOX equals `imageWidth` **and that the asset is square** — proven to fail on the old file.

**⭐ BLACK-THEN-WHITE ON THE WEB WAS A BODY PAINTED OVER A THEMED HTML.** `+html.tsx` stamped the Paper colour on `<html>` and ALSO gave `<body>` an inline dark background "for when scripts are blocked" — and expo-router's `ScrollViewStyleReset` sets `body{height:100%}`, so that body covered the viewport and hid the Paper `<html>` for the entire bundle download and font load. The ground is now **one stylesheet rule keyed on `data-theme`** (`html{…}html[data-theme="paper"]{…}`), the body carries no colour, and the no-script fallback is the rule's default. The live shell was fetched and carries the rule and a bare `<body>`.

**⚠ ON THE PHONE THE DARK FRAME CANNOT BE REMOVED — SO IT STOPPED BEING A CUT.** The native splash is build config: one colour for every athlete on the binary, and it cannot know a per-athlete theme. `AnimatedSplashOverlay` now paints the NATIVE ground (`ground="forge"`) whatever the theme and fades into the theme's own splash beneath it, so an Alabaster launch **dissolves** from dark to light over 180 ms instead of cutting in one frame. Forge is unchanged — dark over dark. Two more frames on the same path were fixed while there: the **boot gate's hold was a flat dark `View`** — the pillars the OS had just painted vanished for the length of one AsyncStorage read (it now draws the same artwork from the token-free geometry module, asserted to stay token-free so it cannot pin the theme early); and **`_layout.tsx` returned `null` while fonts loaded** — a frame of the bare root view between two holds that both show pillars (it holds on `ForgeSplash` now, and a font that FAILS opens the app instead of holding forever — Launch-Audit P0-27). `expo.backgroundColor` is set to the splash colour so an unpainted frame is the splash, not the platform's white.

**⛔ DELIVERY.** The storyboard, the imageset and `expo.backgroundColor` are compiled in — **the native half needs BUILD 8**, and `fingerprint:compare --build-id 39778ce0…` (build 7) reports the fingerprint moved on exactly the `app.json` splash lines, so **no OTA published from here reaches build 7**; the JS half alone would draw the full mark over the OS's crop, which is the same defect from the other side. Not published as an OTA for that reason. ✅ **WEB DEPLOYED** `index-f78f534ddec2f58739d391e884a9f926` — deployment `8fjt23d7zb`, alias **200 and hash-matched on the first probe**, the live bundle references `splash-logo.0ed87b72…png` and the asset serves at 78,186 bytes. Commit `09e7c6b` on `feat/route-map` (plus `72c1d24`, harness config only).

**Gates:** splash-continuity **11/11** (5 new: square asset · box = `imageWidth` · root-view colour · token-free boot hold · themed `<html>` with no body paint) · full suite **2,908/2,908** · tsc 0 · lint at baseline (1 error + 13 warnings, none in the touched files). ⏳ **The native half has never been seen on a device** — it cannot be until build 8 exists.


### 0. ⭐ A treadmill then chest and back saved itself as "Chest" — and 64% of the catalogue could not name a session (2026-08-27, session naming / Design System colour / Active Workout — **no migration**, ✅ **WEB DEPLOYED** `index-f4d37582a36d795dd0704cc93f228330` · ✅ **LANDING SITE DEPLOYED** version `f912d323` · ✅ **OTA PUBLISHED TO BUILD 7** iOS `01a04433-632b-7064-beee-28e83d91b45d`, runtime `4d728d16…`)

PO, on a session containing a treadmill walk, two chest presses, a row and a fifth lift: *"This is not
a good name for it. We need to do better with the names. Even if it was strength and cardio."*

**The naming rule was right; its vocabulary was invented.** `MUSCLE_GROUP` was keyed on gym shorthand —
`Lats`, `Quads`, `Abs`, `Back`, `Shoulders`, `Side Delts`, `Rear Delts`, `Upper Chest`, `Core` — and
`buildPickerDb` emits the raw `muscles.json` display name, so what actually arrives is
`Latissimus Dorsi`, `Quadriceps`, `Upper Back`, `Rectus Abdominis`. **Nine of fifteen keys matched no
muscle at all**, and only six worked: Chest, Biceps, Triceps, Forearms, Glutes, Hamstrings.

**521 of 809 exercises (64%) could not contribute to a name.** Every quad movement (111), every ab
movement (65), every upper-back movement (53), every lat (32), every deltoid (59) was invisible. A leg
day named itself after whatever glute accessory it happened to contain. The PO's session read "Chest"
because the row's primary is `Upper Back`, which the table could not see, so only the two presses
counted.

⚠ **THE UNIT TESTS PASSED THROUGHOUT, AND THAT IS THE LESSON.** They asserted
`groupLabel([['Quads']]) === 'Legs'` — the fixture spoke the same invented dialect as the map, so the
two agreed with each other and neither was ever compared to the catalogue. `session-label.test.mjs` now
reads `muscles.json` and `exercise_muscles.json` **directly** and fails if any real primary muscle is
unmapped. That test, not a comment, is what stops this returning.

**Second fault: the cardio then vanished.** Naming a mixed session for its lifting is correct — you do
not call a chest day "Treadmill Walk" because the walk came first — but twenty minutes of work left no
trace at all. `sessionLabel` **appends** the modality rather than counting it, because counting would
trip the 3-or-more rule and call a chest-and-back day with a warm-up walk "Full Body". A stretching
session is now **Mobility** rather than the launch-path literal (48 movements carry it as their primary
and no anatomical muscle). The PO's session now reads **"Chest & Back + Cardio"**.

**A style pass on both surfaces, run through the `interfaces` skills** (`better-interface` routed
across all six domains for the site; `better-typography` + `better-colors` adapted to RN for the app —
the adaptation is recorded in `Docs/App-Style-Review-2026-08-27.md`).

⭐ **`gray600` `#666060` failed WCAG AA on every ground it renders on** — `charcoal700` **2.81:1**,
`charcoal800` **2.97**, `charcoal900` **3.10**, `base` **3.26**, against the **4.5** normal-size text
requires, and under even the **3.0** non-text floor on two of them. It serves `flText.tertiary` **and**
`flIcon.inactive`. **`#888282`** clears 4.5 on all four (worst **4.60**) and moves **878 usages** — 752
`color`, 69 `placeholderTextColor`, 44 `stroke`, 5 `fill`. Every non-text use was inspected first: a
5px dot, two switch knobs, one border, all of which only become more visible. `gray400` stays clearly
brighter (6.69 vs 5.06), so secondary and tertiary remain distinct steps. The identical value shipped
to `site/index.html`, recorded in that README's deltas table so a regeneration from the `.dc` cannot
put `#666060` back.

⚠ **THE COMPOUNDING WAS THE REAL COST.** This token is where the app's *smallest* type lives —
`rowScoreUnit` 8px, `badgeText` 8.5px, `HoldTimer.hint` 9px — so the tiniest text carried the faintest
colour. Still small; no longer unreadable as well.

⛔ **AND THE TOKEN FIX DOES NOT REACH EIGHT HARD-CODED COPIES.** `#666060` survives as a literal in
`ChallengeCard.expired`, `_cardTokens.TREND_NEUTRAL`, `constants/tokens.ts`, `legacy-theme.textDim`
and four share-image `FAINT` constants. Found by grepping the **live bundle** after deploying, not
before. **Owed to the next pass**; the first two are live app UI.

**Active Workout answers the thumb.** 54 pressables, **3** of which had any pressed state — including
the set-complete circle, the most-tapped control in the app, which acknowledged nothing until the data
round-tripped. 27 controls now respond at `scale: 0.96` with a colour or opacity shift alongside, so
the confirmation survives Reduce Motion. **Haptics is real**: `expo-haptics` + `lib/haptics{,.web}.ts`
as the exact sibling of `lib/ding`, and `useHaptics()` returns **pre-gated callables** rather than a
boolean so a caller cannot forget the `if` and leak a tap the athlete switched off. Fired from inside
`completeSet`, so the hold timer and sheet auto-complete get it too. `EXPERIENCE_TOGGLES.haptics.live`
is finally `true` — the Settings switch had defaulted on and done nothing on native since P-4b.

✅ Web alias 200 and hash-matched **on the first probe**, both the deployment's own URL and production ·
ten pass strings verified in the live 13.5 MB bundle · landing site 200 on both apex and `www`, new
value present and the old token absent · `tsc` 0 · `expo lint` at baseline · **domain suite
2,538/2,538** · `src/constants` 28/28.

### 0. ⭐ Route sharing approved, the trim vetoed, and a run finally posts as a run (2026-08-26, Route-Sharing-Amendment-001 / feeds / Activity Detail — **0180 comment-only NOT APPLIED**, ✅ **WEB DEPLOYED** `index-61963996f59016ba80e20ee58fc20b00` · ⛔ **iOS OTA REACHES NOBODY — the fingerprint moved**)

Four PO decisions on the running-post review, then three build units, then a delivery failure worth more
than the builds.

**⭐ THE DECISIONS (Route-Sharing-Amendment-001).** D1 share the route map: *"Yes."* D2 mixed sessions:
*"post both honestly. Be able to choose."* D3 splits: deferred. And unprompted: *"we veto the 200m
remove. Take this out completely."* ⚠ **The engineering advice to keep the endpoint trim — or trim only
the shared copy — was given and vetoed**; Section 2 of the amendment records the accepted risk (a shared
route can show a squadmate where the run began) so nobody later claims it was unexamined. The one
mitigation standing is consent: **the map on a post is opt-in, per post, default off (D-RS-3), and must
not become a sticky preference without a further amendment.** Routes stored under the old rule are
trimmed forever; nothing marks which era a row is from.

**⭐ THE TRIM IS OUT, AND ITS TESTS ARE INVERTED, NOT DELETED.** `route-privacy.test.mjs` asserted the
doorsteps were ABSENT from the stored shape; it now asserts they are PRESENT, point for point, end to
end through the save builder — a regression that quietly reintroduces trimming fails as loudly as
removing it used to. `MIN_MAPPABLE_MI`, both trim captions and `ROUTE_TRIM_NOTE` retired with it
(→ `ROUTE_STORED_NOTE`, "as it was saved", true of both eras). `routeForStorage` stays the single path
to a stored route so the rule cannot fork. 0162's column comment claimed the column never held a start
point; **0180 corrects it — comment-only, NOT APPLIED, nothing breaks either way.**

**⭐ A RUN POSTS AS A RUN.** *"0 Volume (lb) · 32:06 Time · 1 Lifts"* was the card judging a run by a
lifting scorecard — the "1" was the run itself. `WorkoutSummary` gains optional `cardio` + `lead`
(the name/playlist snapshot pattern, third time: no migration, old posts render unchanged), both feeds
draw **Distance · Pace · Time** through one shared `cardioStats` (converted at draw; stair shows Floors;
an unsupportable pace is dropped, not zero-filled), the marker becomes the running shoe copied from
CardioBlockCard's own glyph, labelled Run/Walk/Ride/Climb, and the squad-post detail's "Under Iron" row
follows. "1 Lift" not "1 Lifts" while in there. **D-RS-4's chooser** — The lifting / The run — appears
in ShareSessionSheet **only for a mixed session**, and the choice rides the snapshot. ⚠ Known gaps,
deliberate: the squad composer's own picker posts the derived default without the chooser, and the
sheet's preview card does not re-render per chip.

**⭐ THE STORED MAP GOT ITS FIRST READER.** Every outdoor run since 0162 wrote its shape; nothing ever
selected it back. Your own Activity Detail now draws it — tappable band above the tiles, RouteSheet
fullscreen — and **climb joins the stat tiles** (written since 0162, shown nowhere until now). ⚠ Shared
views get `route: null` DELIBERATELY: D-RS-3's consent is not plumbed yet, and a shared detail that
always drew the map would hollow the opt-in into decoration.

**⛔ THE OTA REACHES NOBODY, AND NO RE-PUBLISH CAN FIX IT.** The parallel session's polish pass added
`expo-haptics` — a NATIVE module — and the fingerprint moved off build 6 (`411fd2b6…` → `7cc0745f…`).
The update published cleanly onto a runtime no installed binary has. **Fourth stranding, and the first
where the answer is genuinely a new iOS build**: haptics could never ship by OTA. Until that build is
cut, the phone holds everything through the Coach Holt fix and nothing after; **the web preview carries
everything.** ⚠ The empty worker also struck a THIRD time (deployment URL and alias both 404, healthy
payload; identical re-deploy live on probe two).

✅ **BUILD 7 BUILT AND SUBMITTED same evening** — `39778ce0…`, buildNumber 7, runtime `4d728d16…`
(the buildNumber bump moved the fingerprint a second time, so the stranded OTA group is dead forever;
build 7 embeds HEAD `ed527c9` directly). Submission `75305248…` accepted by App Store Connect;
TestFlight availability follows Apple's processing. ⚠ Every future OTA now compares against BUILD 7,
not `078d2838…`. ⏳ NEXT: the run-card composer (photo / map / photo+map formats, D-RS-3 consent
plumbing, shared-detail map), the squad composer's chooser. Gates: tsc 0 · lint clean · **2,877/2,877** (+12).
Commits `25d27db`, `523fe4f`, `9f0f2d6` (+ `80224bc`, the parallel session's haptics pass, committed
separately after a `git add -A` briefly swept it into the rescission commit — caught before push, redone
as two honest commits). Live-bundle verification: three pass-specific strings fetched from production.
⏳ Not device-confirmed (and cannot be, until the new build).


### 0. ⭐ Closing Holt deletes the conversation — deleting it was never the hard part (2026-08-26, Coach Holt chat — **no migration**, ✅ **WEB DEPLOYED** `index-11e7ce19edd156440ecab570fb12784a` · ✅ **OTA PUBLISHED TO BUILD 6** iOS group `bfd6bb37-f36b-44a8-b947-c37144fb7eb5`)

PO: *"with coach holt if I close him then the conversation should delete and restart."*

⛔ **IT ALREADY CALLED `clearThread`, AND HAD SINCE 2026-08-11** (`4919414`). Two holes let the thread come
back anyway, and neither of them is in the deleting.

**1 · THE DELETE HAD NO AUTHORITY OVER THE WRITER.** Half a dozen paths `say()` after an `await pause(…)`
— `advance`, the opener chips, the active-program guard — and the intro beats land on a `setTimeout` of up
to **1400 ms**. The exit animation is **200 ms**. Close him while any of those is in flight and the turn
lands on a sheet that is **still mounted**, the save effect fires, and it writes the conversation straight
back over the `removeItem` that just deleted it. `clearThread` now shuts a write gate as it deletes, so the
two cannot drift apart, and `saveThread` refuses while it is shut.

**2 · ONLY THREE PATHS CLEARED** — the X, the scrim, the drag. The sheet is rendered by `CoachBubble`,
which returns `null` the moment a session, a ceremony or the tour starts, or the route leaves the four home
surfaces. Every one of those unmounted the conversation without going near `collapse` **and left `open`
true in the door**, so he reopened later still holding it — the same "picked up mid-sentence" complaint the
original fix was for. Clearing is now the **default** on unmount; the hand-off is the exception, and §15.3's
Builder paths go through `handOff()` as the only ones that live.

⚠ **WHY THE RULE IS A MODULE.** It was two `if`s inside 2,000 lines of React that `node --test` cannot
mount, which is how it stayed wrong for a fortnight. `domain/coach/thread-lifecycle.ts` owns it, the sheet
and `coach-thread` import it, and the test exercises **the same functions** — so deleting a guard fails the
test instead of leaving it passing over a hole. **All five guards proven by mutation**, and the first run
showed **two NOT caught** because the unmount cleanup masked the resurrection, so the test now asserts
before the unmount as well.

⚠ **THE GATE LIVES IN THE STORAGE LAYER, NOT A REF.** As a `useRef` it tripped react-compiler: `collapse`
is handed to `PanResponder.create`, which runs DURING RENDER, so a `collapse` that writes a ref is *"passing
a ref to a function [that] may read its value during render"*. Routing the drag through a second ref moved
the error rather than fixing it. It is also simply where it belongs.

⚠ **AND THE IMPORT IS RELATIVE WITH THE EXTENSION.** Written as `@/domain/…` it broke `intro.test.mjs` with
`ERR_MODULE_NOT_FOUND` — `node --test` cannot resolve the alias, and that file reaches `coach-thread`
through the chat core. The `@/` above it survives only because it is a **type** import and is erased.

Two comments corrected, both wrong since 2026-08-11: the CLOSE button's *"it does not clear the
conversation"*, and `collapse`'s claim that only the X and the drag land there.

⚠ **THE DEPLOY HIT THE EMPTY WORKER AGAIN.** First `--prod` returned **404 on the deployment's own URL AND
the alias** — the runbook's empty-worker signature, not propagation — with a payload verified healthy
beforehand (13,361 bytes, real `assets.json`). Re-deploying the identical `dist` was live and hash-matched
on the **first** probe. That is now twice in two days; the probe in the runbook is what tells them apart.

Gates: tsc **0** · lint clean · **2,868/2,868** (+6). Verified against the live host: alias 200, hash
matched, and the 13.5 MB bundle searched for the two new exit literals (`hand-off`, `interrupted`) — both
present. `fingerprint:compare --build-id 078d2838…` matched build 6 before publishing. Commit `d4b765b`.
⏳ Not yet confirmed on a device.

### 0. ⭐ Alabaster's last frozen grounds — four surfaces kept Forge's colours under Paper's ink, and a housekeeping line had stranded every OTA (2026-08-26, Design System / Button / Coach Holt / Cardio Block / 14 screens — **no migration**, ✅ **WEB DEPLOYED** `index-4d3adbd886e3bc5a38a9ced52c38dac1` · ✅ **OTA PUBLISHED TO BUILD 6** iOS `01a03e67-50f5-7e57-8bdb-174baa84b6b2`)

**A correction pass on the light theme, from four PO reports in one sitting.** Every defect was the same
shape and the shape is worth naming: **a hard-coded GROUND under role tokens that flipped correctly.**
The compiler cannot see it — a frozen ground is not a missing token, it is a present literal — and
`foundation.paper.ts`'s shape types only catch a one-sided *addition*, never a one-sided *omission*.

**⭐ THE DISABLED FINISH WORKOUT BUTTON.** PO: *"that color I gave you for the finish workout is because I
hadn't completed any set. So it's showing that I can't click it, but it should be a better color than
that still."* `DISABLED_FILL_COLORS` was `['#1C1E22','#15171B']` — the only hard-coded colour left in the
composite — so on cream the button that could NOT be pressed became the highest-contrast object in the
footer, out-ranking ADD EXERCISE, which could. Paper's answer is a **recessed plate**: its top stop is
`surfaceRecessed` exactly, measuring **1.23:1** against the action bar. The label is measured rather than
picked — Forge's composites to **3.67:1** on its own fill, Paper's `#756D60` lands at **3.70**. The same
sweep took the `destructive`, `secondary` and `text` disabled roles, all of which were pale-on-dark.

**⭐ COACH HOLT.** PO: *"evaluate coach holt and his coloring to make him fit more with the light mode."*
The mark is a bronze relief struck on a **near-black field** (measured: median luminance 11/255), so
cover-filled into a 52px circle on cream it read as a hole punched in the page — wearing a hard black ring
and a black drop shadow besides. A second asset was generated rather than a `tintColor`, which would
flatten the relief that makes it read as struck: `scripts/artwork/holt-mark-paper.py` maps the master's
own luminance onto `bronzeMetallic`'s endpoints (#765B44→#C99767), the one gradient Paper deliberately
refuses to invert. **Four ramps were rendered at the real 52px on the real ground and compared** — two
came out pewter, one olive-brass. His in-session sheet was separately dropping a near-black curtain over
a cream app, having hand-rolled `flShadow.sheet` instead of using it.

**⭐ THE CARDIO BLOCK — and it was never running-specific.** PO: *"This is supposed to be the light version
for running, but I'm sure is all the cardio."* Correct: every cardio activity draws this card.
`backgroundColor: '#0D1116'` was frozen while the title, sub-line, segmented control and stat tile all
flipped — so Paper's **dark ink title was written onto Forge's black slab** and "Outdoor Run" was
invisible. The card now joins the ivory card family and the band across its top becomes a recess
(`surfaceRecessed`), which is how Forge's own below-the-card relationship reads on paper. Apple Maps tiles
were pinned `userInterfaceStyle="dark"` under a comment reading *"the app is dark everywhere"* — true when
it was written, false since Alabaster shipped.

**⚠ AND A DARK-THEME REGRESSION NOBODY HAD SEEN, BECAUSE ONLY THE LIGHT THEME WAS BEING REVIEWED.**
`paperScrim` is a PURE function that cannot import `IS_PAPER` — it is deliberately runtime-import-free so
`node --test` can reach its classifier — so it flips any near-black rgba to cream **in either theme**. The
gate lived at exactly one call site, privately, inside `screen-background.tsx`. **Fifteen other call sites
across fourteen screens** therefore painted a cream commit bar, footer or sheet backdrop over Forge's
near-black: Create Squad, Log Activity, Program Builder, Workout Builder, both Chapter screens, Create
Challenge, Squad Preview, Squad Transfer, Template Detail, Transformation Detail, Progress Photo Post and
Holt's chat sheet. Now `@/constants/theme-scrim`, shared, so skipping the gate is the odd case rather than
the majority — which is the actual fix, since a helper nobody could import from is how this happened.

**⭐ THE WHOLE RUN ON THE MAP — without touching D-RTE-1.** PO: *"I want the whole run on the map. The whole
cutting off part of the run I don't want that."* The stored polyline is trimmed 200 m at each end **before
it is written**, which is the condition under which `Route-And-Elevation-Persistence-Amendment-001` lifted
the outright ban on storing routes at all. Nothing about that changed and the mutation-tested suite still
proves it. What changed is that the card stopped discarding what it already had: `useRunTracker.stop()`
leaves the finished track standing, so after a tracked bout the **whole untrimmed run is in memory** — and
the card was drawing the stored shape anyway, showing the athlete less than the app was holding for no
privacy gain. Caption, sheet footer and map pins all now say which of the two shapes they are showing;
`WHOLE_RUN_NOTE` joins `ROUTE_TRIM_NOTE` rather than replacing it. Re-open the workout tomorrow and it
falls back to the stored shape, because the ends were never written down.

**⛔ THE PUBLISH ITSELF FOUND TWO DELIVERY DEFECTS, AND BOTH WOULD HAVE SHIPPED SILENTLY.**

  1. **`fingerprint:compare` refused the OTA.** `9f68311` (this morning, animation tooling) added a
     three-line ignore for `scripts/animation-processing/out/` to `.gitignore`. `@expo/fingerprint` hashes
     `.gitignore` ITSELF, so the runtime version moved off `411fd2b6…` — the runtime every tester's build
     is on — and **every OTA published after that commit would have reported a green publish to nobody.**
     ⚠ **THIS IS THE THIRD TIME** (`eas.json`'s submission block, then `2439b11`'s landing-page lines,
     fixed in `e3eba5e` — whose own message says *"any housekeeping commit can strand the phone, and the
     only way to know is to run the compare"*, eight days before it happened again). Same fix: the rule
     moved to `.git/info/exclude`, which is not hashed. `git check-ignore` confirms it still bites and
     `.gitignore` is byte-identical to build 6's.
  2. **A 22.3.0 deploy landed an EMPTY WORKER and printed success.** 404 for twelve minutes — on the alias,
     on the deployment's own URL, and on a direct asset path — with a `--dry-run` payload verified healthy
     immediately before (20,102 bytes of real `assets.json` entries, not 22.4.0's 295-byte empty object).
     **A good payload is necessary and not sufficient.** The runbook now carries the test that separates
     the two 404s: the alias lags, a deployment's own URL does not — *deployment 200 + alias 404* is
     propagation and must not be re-deployed, *both 404* is an empty worker and waiting cannot fix it. A
     re-deploy of the byte-identical `dist` was live and hash-matched on the first probe.

**Verified, not assumed:** every Forge value asserted byte-identical to the literal it replaced (14 colour
values plus all 10 distinct scrim strings, all OK); `tsc` clean; eslint clean; **2,858 tests pass**. The
live bundle was fetched from production and searched for eight distinct new strings — all found.

**A guard earned its place mid-pass.** `svg-gradient-stops.test.mjs` failed the first `<Stop stopColor={}>`
edit, because `react-native-svg` silently drops the alpha out of an rgba string and paints the stop opaque
on device. The tokens are alpha-free hex, so the fix was to say `stopOpacity={1}` out loud.

**Files:** `src/constants/foundation.forge.ts` + `foundation.paper.ts` (14 new tokens, both sides) ·
`src/constants/theme-scrim.ts` (new) · `Button.tsx` · `HoltMark.tsx` + `assets/images/coach-holt-mark-paper.png`
+ `scripts/artwork/holt-mark-paper.py` (new) · `SessionCoachSheet.tsx` · `CardioBlockCard.tsx` · `RouteMap.tsx`
+ `RouteMap.web.tsx` · `RouteSheet.tsx` · `src/domain/run/route-region.ts` · `screen-background.tsx` +
`CoachChatSheet.tsx` + 12 screens · `.gitignore` · `.claude/skills/deploy-web/SKILL.md` · this board.


### 0. ⭐ Alabaster — the app has a second theme, and the whole colour system had to become one (2026-08-25, Design System / every screen — **no migration**, ✅ **WEB DEPLOYED + ✅ OTA DELIVERABLE ON BUILD 6**)

**Status: SHIPPED, BOTH SURFACES.** Web `index-a2457608…` (200 twice, matching hash, `Alabaster` and
`THEME_IS_SYNC` found in the LIVE bundle) · iOS OTA `01a03b5e-3ea4-76be…` on build 6's runtime,
`fingerprint` an EXACT match before publishing and the manifest endpoint served the new id to an iOS
client afterwards. Pushed to `origin/feat/route-map` (`b312a43`).

⚠ **THE V1 ARCHITECTURE FORBADE THIS AND STILL DOES ON PAPER.** `Component-Library-Architecture`
**CLA-D12**, `Forge-Design-System-Architecture` §5.6 and `Forge-Design-Blueprint` §567 all lock the app
dark-only. ⛔ **The amendment authorising it is NOT written** — the code shipped ahead of the document,
which is this board's recurring failure running in the opposite direction from usual. `Docs/Amendments/
Design-System-Architecture-Amendment-001-Light-Theme.md` with `DSA1-D##` IDs is **owed**.

⭐ **THE MECHANISM IS A RELOAD, AND THAT IS THE DESIGN.** All 277 `StyleSheet.create` calls sit at
MODULE SCOPE — they freeze their colours the moment a module is first required — so a live toggle would
have meant rewriting 240 files into style factories. Instead `foundation.ts` became a SELECTOR over
`foundation.forge.ts` / `foundation.paper.ts` with its public shape unchanged, so **all 184 consumers
compile untouched**. Gate for the split: **all 77 original dark tokens byte-identical**, 0 changed.

⭐ **ONE FILE RE-THEMED 205 SCREENS.** Every caller passes a hardcoded darkening scrim;
`ScreenBackground` flips them centrally, PRESERVING THE ALPHA — that number means *how much of the
plate is suppressed*, which holds in either theme.

⚠ **THE SAME BUG FOUND FIVE TIMES: A ROLE TOKEN FLIPPING UNDER SOMETHING.** `cream100` means "primary
text" — near-white in Forge, DARK INK in Paper. It was used for the Workouts toggle label on a bronze
fill, for titles over a 0.92 black media scrim (the Legacy cards read as blank rectangles — reported as
*"not showing any picture"*), for text over background artwork (a *"weird smear"*), and for a title
with TWO grounds at once. Each needed a fixed-in-both-themes token: `onBronze`, `onMedia`, `textHalo`.
⚠ In Forge every one of those grounds is dark, which is exactly why one value was right for years.

⛔ **AND TWO DEFECTS THE THEME ONLY REVEALED, NEITHER OF THEM A THEME BUG.** (1) The 72 artwork PNGs
were **never actually cut out** — the original pass used luminance directly as alpha, so the dark
background survived at ~40/255 over 87% of every asset. Invisible on black, a warm rectangle on cream.
Re-cut from the opaque masters by `scripts/artwork/alpha.py`. (2) `pins.poster_url` has existed since
`0005` and **nothing ever wrote it**, so video pins fall back to a bare `.mp4` — which native can draw
and **a browser on iOS cannot**, because iOS refuses to fetch video data without a gesture.
`ensurePinPoster` now extracts and stores the frame; ⏳ **native-only and unverified from here.**

⭐ **THE PHONE CAME LAST AND NEEDED A BOOT GATE.** PO: *"I clicked on Paper and it didn't change
anything."* AsyncStorage is a promise, so native could not know the theme before the stylesheets froze.
`expo-router`'s route modules are LAZY, so holding the first render holds the whole token layer:
`package.json` → `main` now points at `src/boot.tsx`. ⚠ **Verified the fingerprint does NOT move before
writing it**, or the fix would have needed a new TestFlight build.

⭐ Also shipped: the wordmark + page title unified across **all 214 AppBar titles** (`serif` removed,
not left inert); **drag-to-dismiss on every sheet that draws a grabber** (the shared composite had none
and 49 files use it); **Squads reordered** to Now → Together → Progress → History, with the guided tour
re-sequenced to match; 15 sticky bottom bars; Coach Holt 48 raw colours → 1.

⚠ **NOT DARK-NEUTRAL, DELIBERATELY.** White-on-bronze and the AppBar change alter Forge too, on the
PO's *"that should be for everything"*. Alabaster itself is **opt-in, Forge stays the default** — no
tester's app changes theme without them choosing it.

⏳ **OPEN:** the amendment above · **~1,130 raw colour literals in 178 files still do not follow the
theme** and the promised `no-raw-color-literals` lint rule is unwritten · the exercise animations need
drive `F:` mounted to re-render (the pipeline is correct and proven on frames, `FL_THEME=paper`) ·
32 rank badges need a light art pass · ceremonies re-theme but have no Paper artboard · bronze-400 as
small text measures **3.74:1** on cream (was 5.78 in Forge) — `--fl-bronze-600` fixes it at 4.74 and is
NOT applied, because it is the PO's accent.

**Gates:** tsc **0** · **2,849/2,849** · lint **at the pre-existing baseline (1 error + 13 warnings)** ·
fingerprint matched build 6 · web export clean, 96 routes prerendering through the new entry.


### 0. ⭐ A coaching cue can finally be written where a workout is built — and three doors were eating the ones Holt already wrote (2026-08-25, W-25 Workout Builder / Active Workout / Coach Holt — **no migration**, ⏳ **NOT DEPLOYED**)

**PO:** *"When I'm either doing final touches on a coach holt program or building a program, I should be
able to leave a note here like 'underhand close grip' that shows up during my active workout either from
coach holt or on the card."*

**The model was already right and had been for a while.** `ProgramExercise.coachNote` /
`TemplateExercise.coachNote` / `SessionExercise.coachNote` exist, are documented at length, and are
emphatic about the one distinction that matters: **the author's cue is not the athlete's log note.** One
is the prescription, written into the plan and shown to whoever trains it every time; the other is
"shoulder felt off", written during a session. Merging them would let a diary entry overwrite a coaching
instruction. Nothing here changes that separation — this pass finishes the field rather than adding one.

⭐ **THE AUTHORING GAP WAS EXACTLY ONE SCREEN.** The Program Builder has had the editor since cues
existed. The **Workout Builder (W-25, "Build a Template")** — the screen in the PO's screenshot — has
**round-tripped `coachNote` through `toTemplateExercises` and `hydrate` the whole time and never had
anywhere to type one.** ⚠ **And it was specified**: `Docs/Free-Workout-Builder-Spec-W25.md` §3.5 draws
`[Notes: Add a note for this exercise...]` in the exercise-card wireframe, §5.3 specifies the interaction,
§5.2 says it is shown for every activity type, and it sits **unticked in the spec's own build checklist**
(§ "Exercise rows", § "Notes: all activity types"). This is the board's recurring pattern — *specified,
locked, never applied* — in its quietest form, because the field round-tripped so nothing looked broken.

⚠ **THE CAP IS 280, NOT THE 200 §5.3 NAMES, AND THAT IS DELIBERATE.** Both builders write the **same
field**, and a program day authored at 280 reaches this screen through a saved template. A shorter cap
here would silently truncate a cue on the way past. §5.3's 200 predates `coachNote` existing.

⛔ **THEN THE READ SIDE, WHERE THE REAL LOSSES WERE — THREE LAUNCH DOORS DROPPED THE CUE ENTIRELY.**
`WorkoutLaunch.exercises` was declared inline as **four fields** (`catalogKey`/`name`/`sets`/`targetReps`)
and its consumer read exactly those and stamped `section: 'main'` on every row. Honest for an **invite**,
which snapshots a workout to its bones. But three other things travel that field:

1. **Home → "Build for later" → Save & Start**, and
2. **Home → the parked hero → start it**, both handing over a whole `TemplateExercise[]`, which arrived
   with **warm-up and cool-down flattened into main, supersets dissolved, cardio blocks turned into sets
   of reps** — and, once cues could be authored, the cue gone too.
3. ⭐ **Coach Holt's chat → "Start it now"**, which is the PO's *"from coach holt"* half. `save-shapes.ts`
   **declared this gap in its own header** — *"The coaching cue does NOT travel… Starting a day Holt built
   loses his cue; saving it as a template keeps it. That is a real gap and it is stated rather than papered
   over."* ⚠ **And `buildDayWorkout` writes cues onto Holt's rows already**, which the rewritten test
   proves — so **every cue he wrote was being thrown away on Start and kept on Save. Same day, same coach,
   two answers, and the athlete got the empty one at the rack.**

⚠ **THE FIX IS A WIDENING, NOT A NEW MECHANISM.** `TemplateExercise` requires precisely the four fields
that were declared inline and makes every other one optional, so **every existing writer type-checks
unchanged** and the four-field invite row is already a valid value. The consumer now runs
`templateToSessionExercises` — the crossing that already existed for this shape — whose set construction
is character-for-character what it replaced (`Math.max(1, e.sets)`, `targetReps || 8`, the same `'main'`
default), so **an invite builds byte-for-byte the session it built before.** `starterId` exists in that
same file specifically to avoid this trap; the planned workout was walking into it anyway.

⭐ **AND ON SCREEN — A LINE, NOT THE CARD THAT WAS DELETED.** `THE PLAN SAYS` used to be a hero card here
and was removed in the 08-24 *"cards are for things you act inside of"* pass — correctly, and its styles
carry a warning against rebuilding it. ⚠ **A cue is information, so it gets a line.** Cream italic under
the exercise name, no border, no background, **no bronze**, in the same voice the ⋯ menu and both builders
already show a cue in. ⚠ **Drawn in BOTH hero faces**, which is the whole point: the hero auto-collapses
on the first resolved set, so from set two onward the collapsed strip is all of the lift the athlete can
see — and *"underhand close grip"* is exactly as true then as it was walking up.

⚠ **HOLT KEEPS HIS ARRIVAL RULE AND CHANGES HIS WORDING — the PO's call.** `coachLine` retires the plan
cue once a set is logged, which is right for *"go up to 95 lb"* (a sentence answered by doing it) and
reads as a broken coach for a grip cue. Rather than exempt it, **he now says it covers the whole
exercise** — `"<cue> — that holds for every set."` — then retires on the first set or the X, as before.
⚠ Added in the **render**, beside `inUnits` and for the same reason: `coachLine` returns the sentence the
plan holds, and stitching presentation into it would put the suffix into the unit tests and the chat
sheet. ⚠ And added **before** the dismiss comparison, which keys on the final text — suffixing after would
mean the athlete closed one string while the next render produced another, and the X would stop working.

⛔ **AND THE ATHLETE'S OWN NOTE HAD THE SAME DISEASE, ONE SCREEN LATER.** PO, on seeing the pass:
*"It doesn't show up anywhere in the active workout though. Like, there's no place to type and leave a
note that's obvious for me."* ⚠ **The field was not missing — it was finished, saved, read back, and
unreachable.** `ex.note` writes to `workout_exercises.notes`, `fetchLastNotes` reads it, and it returns
as the **LAST TIME** block on the hero next session. The only way in was the ⋮ sheet, **eleven rows down
and below the fold**. ⚠ **That is the worst version of the failure**: the OUTPUT was visible and the
INPUT was not, so the app showed the athlete notes with no evident way to have written one.

⭐ **It is now a row on the card**, under Add Set / Remove Set — *"Add a note for next time"*, and the
note itself in cream italic once written. ⚠ **Placed BELOW the three mutually-exclusive bodies, not
inside the set table**, which is the part worth keeping: the table draws for a strength lift, a
`CardioBlockCard` draws for a run, and a superset member draws **neither** — so a row inside the table
would have shipped on exactly one kind of exercise and been missing from every run and every superset.
One instance below all three covers each. ⛔ **The one honest exclusion is the FUSED superset card**,
which merges two exercises, so *"a note about this exercise"* has no referent; tapping a member's name
opens it on its own card, where the row is. ⚠ **And the sheet now says what the note is FOR** — *"How it
went, for next time — you'll see this when this lift comes round again"* — because the note's whole
value is that it comes back, and an athlete who does not know that has no reason to write one.

**Gates:** tsc **0** · **2,328 / 2,328** (2,326 baseline + **2 new**) · eslint **1 error + 13 warnings =
the pre-existing baseline, nothing added** (the error is `use-color-scheme.web.ts`, untouched).

⚠ **ONE TEST NOW ASSERTS THE OPPOSITE OF WHAT IT USED TO, AND THAT IS THE FINDING.** `"the launch shape is
exactly four fields"` guarded the old gap and was correct when written. It had to be **rewritten rather
than relaxed**, because running it against the real `buildDayWorkout` fixture is what proved Holt's cues
were being dropped — the fixture rows carry cues. It now asserts they survive, plus that a row with no cue
grows no key (absent, never `''` — an empty cue would draw an empty italic line for the whole lift).

⏳ **NOT DEPLOYED, AND VISUAL — no test in this repo can see the cue line or the strip.** The authoring
sheet, both hero faces and the coin's new suffix have never been rendered for a human. Needs a web deploy
and an OTA (no native code, so it is OTA-safe on build 6).

### 0. ⭐ Cards are for things you act inside of — Home stops being a stack of rounded rectangles (2026-08-24, Home / ProgramMissionGrid / YourCircleCard — **no migration**, ✅ **WEB DEPLOYED + ✅ OTA DELIVERABLE ON BUILD 6**)

**PO, and it is a RULE rather than a screen fix: *"Cards are reserved for things the user acts inside of. Information doesn't automatically get a card."*** The diagnosis that produced it is worth keeping whole: *"the top of the screen does not feel AI generated"* — the chapter's editorial serif, the diamond rule, the bronze quote line — *"then you get down into the product UI and it gradually becomes more like a premium component library."* Home was running `container → label → content → divider → container` three times, so Today's Workout, Program/Mission and Your Circle all said **"I am a card"** when they are an action, an objective and a group of people.

⚠ **THE FIX IS SUBTRACTION, NOT MORE DESIGN.** PO: *"Don't add more design. Remove some componentization."*

⭐ **PROGRAM + MISSION LOSE THEIR SURFACES IN BOTH STATES.** With a program they are an open two-column region with a single centre hairline — no outer border, no per-column background, no radius, no shadow; without one, Mission stands alone at full width under a section label instead of leaving *"an awkward missing card"*. **Both halves stay independently tappable and keep their chevrons**, so the usability of the tiles survives without their surfaces. ⭐ **The proof it is real is mechanical: `flRadius` and `flShadow` are now unused imports in that file** — nothing left has a corner or an edge to cast one. The `0 / 36` unit label also moved from beside the count to under the bar, because pushing it to the far right was only ever balancing the container.

⭐ **THE HOLT PROMPT BECOMES THE JOINT.** It was a centred 12.5sp line of bold sans reading as a footnote to Mission. It now runs **edge to edge** — `marginHorizontal: -18` cancels the content padding and pays it back inside, so the rules reach the screen edge while the mark stays on Home's left margin — separating the athlete's own material above (chapter · today · objective) from other people below (circle · train together). ⚠ **Its hairlines are NEUTRAL on purpose.** Bronze is Home's "do this now" signal and it was already edging nine separate things; PO: *"if everything receives bronze edging, it starts behaving like a default border colour rather than an accent."*

⭐ **YOUR CIRCLE DROPS THE ROUNDED RECTANGLE INSIDE THE ROUNDED RECTANGLE.** The live session sat in its own bordered, filled, rounded box inside the card's own bordered, filled, rounded box. ⚠ **Nothing is lost by removing it** — the presence dot, the LIVE NOW label, the pulsing avatar ring and the Join button are four signals saying someone is training, and none of them was the border; the card's own edge already warms to bronze (`cardLive`) when the block is present, which is the lighting the box was standing in for.

⚠ **NO COLOUR CHANGED, AND THAT WAS CHECKED MECHANICALLY** — the diff contains **zero new colour literals**, every value being an existing token. **One consequence flagged for veto rather than buried:** the column eyebrows moved `gray600` → `bronze400`, because they are section labels now and that is what `SectionHeader` already uses for every other section on Home (CLA-D14, the one sanctioned all-caps scale).

⛔ **TWO THINGS IN THE MOCKUPS WERE DELIBERATELY NOT BUILT.** A **fifth "Friends" tab** appears in both — it has **never existed in this repo** (four tab files; the layout's own comment says *"the 4-tab bronze shell"*), and bundling an IA change into a layout pass is how one gets approved by accident. And the *"extremely faint gradient behind the whole region"* was offered as a *perhaps* and is a style addition, not layout; the region sits on flat ground below the hero, so it is one line to add if legibility ever suffers against the stone.

⏳ **Visual only — no test in this repo can see it.** tsc **0** · **2,795/2,795** · lint at baseline. ✅ **BOTH SURFACES** — web `entry-3b607e682445b33323b709b2a0ca9166.js` (prod **200** on the first check, live bundle **MD5-identical** to `dist/`, five new style names found in the **LIVE** bundle) + **iOS OTA `01a03706-9c5a-7a69-ad99-d0d92e84dc2c`** on runtime `411fd2b6…`, `fingerprint:compare --build-id 078d2838…` an **exact match before publishing** and the manifest served this update's own id to an iOS client afterwards. Commit `8341f4d`.


### Older entries — `Docs/Status-Archive-2026-08.md`

The **60** entries before this point moved there on 2026-08-18, 2026-08-19, 2026-08-20, 2026-08-22, 2026-08-24 (five times) 2026-08-25 and 2026-08-26 (twice), **verbatim**. Nothing was deleted or
summarised.

This section had grown to 48 entries and 4,378 lines — **81% of a dashboard `AGENTS.md` requires every
session to read first**, all of it written in the single week of 11-18 August. Keeping the 15 most recent
is what "recent" means; the rest is history, and history reads better one file back.

> When the dashboard does not explain why something was built the way it was, the answer is very often in
> the archive. Several of those entries are the only record of a decision.

### 0. ⭐ The coin's rim stopped floating, and Holt stopped repeating himself to an empty history (2026-08-26, Coach Holt medallion / CoachBubble nudges — **no migration**, ✅ **WEB DEPLOYED** `index-3fefea43a5f60eadb8d1d4e555d3abfc` · ✅ **OTA PUBLISHED TO BUILD 6** iOS `01a03fd3-3e7f-7e7c-a06e-f9f86336286e`)

Two PO reports in one sitting, unrelated to each other and both worse than reported.

**⭐ THE SLIVER IS SHADING, NOT AN EDGE.** PO: *"I don't know if I like the 3d look of it. The sliver on
the right side that's outside of the outline."* Measured outward from the coin's fitted centre
(192.5, 207.0 in master pixels): field and figure to R 152, then a **dark ring at R 153–157, median
luminance 4 of 255**, then the rim at R 159–173, then nothing. That trench is the 3D disc's own bevel and
it runs the whole way round — where the light catches it, lower-left, it fills with bronze and the rim
reads as part of the coin; where it does not, upper-right, it stays black and the rim's highlight floats
free as a crescent. **A crop was tried first and did nothing, because there is no stray geometry to
crop.** The trench is filled with the field's own colour and the rim redrawn as one flat ring lit from a
single direction, butted against the field with a 1 px seam.

**⭐ AND ALABASTER HAD COLLAPSED THE FIGURE INTO THE FIELD** — the light-mode complaint from earlier the
same day, which the ramp in **Recently Completed #1** improved but did not measure. Relief against field,
inside the coin:

| | shipped | now |
|---|---|---|
| Forge | 3.89 : 1 | **6.48 : 1** |
| Alabaster | **1.58 : 1** | **4.08 : 1** |

The old ramp squeezed the whole medallion into luminance 95–158. `#745730 → #F7E9D0` lands Paper on
Forge's separation, and the disc measures **5.6:1 against the cream page, up from 4.9** — it gained
presence rather than punching a hole. ⚠ **The light end stops at warm ivory on purpose**: near-white
scores *better* on separation and renders the coach in **pewter**, which `holt-mark-paper.py` had already
recorded once and which was confirmed again by rendering it.

⚠ **NOTHING WAS REDRAWN.** Same coach, same folded arms, same bubble — only the ring around him is new.
Eight vector reconstructions of the folded arms were drawn and rendered at 52/36/24 first and all were
worse than the original (chevron, slash, lectern, nameplate); the master's own artwork wins.

**⚠ THE PRISTINE ARTWORK MOVED to `coach-holt-mark.master.png`.** Both shipped files are now generated
output, so `holt-mark-paper.py`'s *"the Forge master, never written"* premise had quietly become false —
it would re-ramp a ramp. Superseded by `scripts/artwork/holt-mark.py` (both variants, one master) and its
entry point now hard-exits. ⏳ **`site/README.md` derives the landing page's `coach-mark.webp` from the
Forge file and has NOT been regenerated.**

**Home's lead mark 54 → 44.** It was the largest Holt in the app — bigger than the floating coin that is
his actual tap target — while its own comment called it low visual weight, and closing the artwork's 9%
dead margin made the same number read a tenth larger again. The ladder is now hierarchy rather than
drift: **52** floating coin · **44** lead card · **40** chat gutter · **34** session sheet. 52 was already
correct and stays; it simply now draws a coin that fills its box instead of one inset by 9%.

**⭐ AND THE NUDGE WAS SPENT ON THE TAP, NOT THE READ.** PO: *"coach holt as prompted me the same prompt
about honors about three times now… why it's repeating even after I clicked on it, and why other things
haven't come up (is it because I've used everything?)"* `CoachBubble` rendered the invitation on every
arrival at a home surface but only wrote `shown` from `openCoach` — so a line that was **read and not
tapped left no trace**. The effect keys on `pathname` and there are **four** home surfaces, so switching
tabs re-asked the same question.

⚠ **AND IT STARVED THE REST OF THE CATALOGUE**, which is the half that is not obvious and is the answer to
the second question. `honors` is eligible whenever `honors > 0` — **forever, once earned** — and it sits
third in a strictly ordered list. An un-retired nudge at the head is not merely repetitive: **nothing
below it is ever reachable.** `program`, `templates`, `progress`, `squads` and `metrics` were all waiting
behind one row that was never written. **Nothing had been "used up".** The write moves to the display and
is guarded by every suppression that follows it — a session, a ceremony, the tour, or a route off the four
home surfaces — because a nudge recorded while invisible is one the athlete never got, spent.

⛔ **NOT VERIFIED — whether the writes are landing at all.** `markNudge` is best-effort by design and
swallows every failure, so a missing grant or an RLS refusal on `coach_nudge_state` would look **identical
to this bug** from the client. `0179` grants `execute` on `coach_nudge_signals()` but nothing on the table,
relying on Supabase default privileges as every other table migration here does. If `coach_nudge_state` is
empty for an athlete who has tapped through a nudge, there is a second defect and this fix will not hold.
Query recorded in the session; **owed to the next pass.**

Gates: tsc **0** · lint at baseline · nudge domain **12/12** still green (the cadence was always right —
the caller was not doing its part) plus **4 new** in `nudge-repeat.test.mjs` holding both halves.
✅ **Verified against the live host**, not the deploy's own output: alias 200 with a matching bundle hash
on the first probe, and both marks fetched by their content-hashed URLs (`c0c05900d3…`, `d1676d3e77…`) —
the filenames *are* the md5 of the files in the repo, so the served bytes are provably the new artwork.
`fingerprint:compare --build-id 078d2838…` matched build 6 exactly before publishing, and the OTA went out
on runtime `411fd2b6…`. Commit `453d769` on `origin/feat/route-map`.
⏳ Not yet confirmed on a device.


### 0. The weigh-in sheet lays out on a phone, moves the weight goal, the Legacy bar measures from the baseline — and a body goal always asks where it starts (2026-08-28, Progress Hub / Body Metrics / Goals / Legacy — **no migration**, ✅ **WEB DEPLOYED** `index-0dbec1e48dccb889896f67e38ec793b3` · ✅ **OTAs PUBLISHED TO BUILD 7** iOS `01a04914…` + `01a04940…` + `01a04976-04a0-7ac0-b63b-d0351c821f1e`, runtime `4d728d16…` — commits `32ee348` `c4eeba6` `f97db15`)

**PO:** *"Take off the goal part cause some people it is a goal. And then make sure it actually works and that the keyboard doesn't cover and nothing is covering anything."* Then: *"I entered my new weight and it didn't move the goal at all. Why?"*

⭐ **THE SHEET.** The bodyweight field's wrapper carried `flex: 1` — right for the three-up measurement row, and on iOS a **zero-height box** when the same wrapper sits alone in a column with no definite height. The well collapsed, its border landed on the placeholder, and "+ Add measurements" drew through the input (PO screenshot). The web preview lays it out differently, which is how it shipped. Only the measurement fields grow now; the "no goal weight, no pressure" line is gone. Keyboard avoidance was already the composite's.

⭐ **WHY THE GOAL DID NOT MOVE — nothing asked it to.** A bodyweight goal is auto-tracked from `body_entries`, but the ONLY caller of `syncAutoGoals` was the Goals screen's effect, on open; Legacy and the chapter card read the stored `current`. `syncBodyGoals()` (weight/measurement goals only, one RPC each) now runs right after a weigh-in is saved and whenever Legacy comes into focus, through `useBodyGoalSync`, which also fires the M-3 ceremony a goal achieved that way would otherwise lose. ⚠ The goal WAS a **manual** goal ("0 / 190" with no unit is the tell); the PO switched it to Bodyweight · Lose and the sync moved it — **and then the Legacy bar drew FULL at 193 / 190.** The Legacy row selected neither `metric_dir` nor `metric_start_value`, so `progressPct` fell to `current / target` (backwards for a cut) while the chapter screen, reading the full model, said 0%. Both fields are selected and mapped now (`c4eeba6`). And an EXISTING goal switched to bodyweight anchors its baseline at the first reading on/after its creation (`startBodyReading`), not today's weight — which would have erased the pounds already lost. ⭐ **AND THE FORM NOW ASKS** (`f97db15`): PO, *"it looks like it's putting my 193 as the starting weight… we should have an enter starting weight on there… My starting weight was 195."* The starting-weight field used to appear only when the app had NO reading to guess from; every body goal now shows **Starting weight** (or measurement), prefilled with the best guess and editable, and what is in the field is what the goal measures from. A typed weight is still saved as a weigh-in when there is none on file.

**Gates:** weigh-in-moves-the-goal **4/4** · full suite **2,955/2,955** · tsc 0 · lint at baseline. ⏳ Not seen on a device.


> **Older entries moved to `Docs/Status-Archive-2026-09.md`** (maintenance rule 6 — this section holds the 15 most recent). Moving is not deleting.

### 0. A check-in has a way out, a comment bar you can find and type into, a comparison that follows your thumb, and an exercise you can take OUT of a live workout (2026-09-01, Squad detail / Squad post / Friends feed / BottomSheet / Transformation compare / Active Workout — **no migration**, ✅ **WEB DEPLOYED** `index-1d2945ea755677d14eb6c5a9a1b1ec99` · ✅ **OTA PUBLISHED TO BUILD 8** iOS `01a05e39-7476-7ba3-947f-e67aa56b1b9e`, runtime `47944f2e…` — commits `ee1a3eb` `630a2e8`)

**PO, four reports in one message.**

⭐ **1 · "It's not obvious how to leave a check-in… There isn't an obvious x to get out of it."** There *was* an ✕, and three things made it unfindable at once. It was drawn at a hardcoded `paddingTop: 54` — `CheckinViewer` is the only overlay in the app that never read `useSafeAreaInsets`, so on a Dynamic Island phone the top of the 38pt disc sat behind the island. It was a white stroke on `rgba(255,255,255,0.12)` **over video**, which is a contrast ratio of whatever the footage happens to be. And the "tap outside to close" backdrop was covered edge to edge by a `100% × 100%` `VideoView` carrying `nativeControls`, so tapping it toggled AVPlayer's chrome instead. Now: real `insets.top`, a gradient scrim so the name/time/close read over any frame, and the close is a **labelled bronze pill** — the same shape as "Post a new check-in" at the foot, which nobody has ever failed to find. ⚠ **Deliberately ONE exit, not two**: a second Close at the foot would be a third control fighting AVPlayer's scrubber for the same 60pt.

⭐ **2 · "The swipe picture comparison is finicky… I don't know if it's because the whole swipe back to home is a function."** Right diagnosis, and rounds one and two had both fixed the wrong layer. They made the *movement* cheap (shared value, cancelling transforms); what was finicky was **ownership of the touch**. Three defects, now in one shared `useCompareDrag` that both sliders use: (a) `onPanResponderGrant` called `track`, so a thumb landing on a comparison **on its way past** yanked the divider — with a slider per pose on Compare, scrolling the page re-cut every one it went under. A tap still places the divider, on **release**, once the touch has proved it was a tap. (b) `onPanResponderTerminationRequest` re-evaluated `|dy| > |dx|` against cumulative travel **every time it was asked**, so a horizontal drag that curved downward was handed to the scroller mid-stroke and stopped dead under a moving finger. The axis is now latched after 5pt and held for the whole gesture. (c) It tracked `locationX`, which is relative to whatever is under the finger; the frame's origin is measured once on grant and the drag reads page-space `moveX`, so it follows past the photo's edge. ⭐ **And the back-swipe is off on `squad/[id]`** — the feed draws comparisons **full-bleed**, so the divider's left edge is the screen's left edge, and iOS's edge recogniser owns the first ~20pt of that unconditionally. No gesture work can win against it. Scoped to that one screen: every other comparison surface is already a modal presentation, which has no back-swipe. **The app-wide switch is one line if the PO wants it.**

⭐ **3 · "Commenting on a post is difficult. The comment bar is super hard to find… and then the keyboard covers it."** Two surfaces, one mistake each. On **`squad-post/[id]`** the sticky composer carried a flat `paddingBottom: 16` and the screen never read `useSafeAreaInsets`, so its bottom third sat **inside the home-indicator gesture strip** — an upward swipe near it went to the app switcher. It now uses `insets.bottom` with no keyboard and `keyboardInset` with one (**never both**: iOS measures the keyboard from the bottom of the screen, so adding the inset too leaves a 34pt gap). The bar gained a bronze hairline instead of charcoal-on-near-black, and **the comment count is a control now** — it was a `View` beside a `Pressable` flame, so the one thing on the screen that says "comments" did nothing; it focuses the composer. On the **Friends feed** the field was the *last child of the sheet body*, under every comment, in a sheet opened **without `scroll`** — so on a post with a real thread it was clipped past the 88% cap: not hard to find, **unreachable**. It is the pinned `footer` now and the thread scrolls. ⚠ **And `BottomSheet` itself gained the missing half:** its `KeyboardAvoidingView` covers exactly one case (non-scrolling, iOS) and does **nothing on web** (KAV is a no-op in react-native-web — the surface the PO tests from) or for a scrolling sheet's footer. It now lifts by `useKeyboardInset` in both, drops `automaticallyAdjustKeyboardInsets` when it does (or the body shifts twice), and grows its 88% cap by the lift so the padding under the keyboard is not spent on the allowance.

⭐ **4 · "Exercises during an active workout should be able to be removed… If an exercise is a warm up and it is removed, nothing moves into that warm-up spot."** The session could add, swap and **skip** — and skipping is not removing: a skipped lift stays in the plan, stays in the pager, and is written to `workout_exercises` at Finish as *"this was part of the session and I did not get to it"*. Right record for running out of time, wrong one for a lift today does not contain. `removeExerciseAt` (pure, 15 tests) splices it out and **promotes nothing** — the PO's line, enforced: sections are a property of each exercise, not slots waiting to be filled, so a session's warm-up simply ceases to exist. A **superset left with one member is dissolved** rather than left pairing with itself. ⚠ **`position` is never renumbered** — it is the join key `buildSubstitutions` and `buildAppendExercises` use, and a continued session (0125) matches rows that already exist in the database. ⚠ **THE BUG REMOVAL WOULD OTHERWISE HAVE INTRODUCED:** both add paths stamped `exercises.length` as the new position, which is correct only while the list has never had a hole in it — remove #2 of 4 and the next add is stamped `3`, a **duplicate** of the last exercise, silently attributing a substitution (or an appended set) to the wrong lift. Both now use `nextPosition`. Reached from **Holt's CHANGE THE PLAN** ("Take it out", beside "Move past this" — both rows gained sub-lines, because two controls that sound alike and differ in whether they throw away logged work is a choice you get wrong once) **and from the Overview sheet**, which is the ungated path: Holt is behind `holt_in_workout`, so a Holt-only control would have made removal a paid feature by accident. Guards: refused while a cardio bout is running · refused on the last exercise standing (an empty session renders nothing and even End Workout is disabled — a screen with no way out) · **confirmed, with the set count, when work has been logged**; an untouched exercise goes on the tap. Index-keyed overlays (`goalOpen`/`noteOpen`/`ssOpen`) are dropped, since every index after the gap has shifted.

**Gates:** tsc **0** · full suite **3,050/3,050** (36 new: 15 `remove-exercise`, 21 `exit-composer-remove`, plus `transformation-post-controls` re-pointed at the shared drag) · lint **at baseline** (1 pre-existing error in `use-color-scheme.web.ts`, 13 warnings). ✅ **WEB DEPLOYED AND VERIFIED** — `index-1d2945ea755677d14eb6c5a9a1b1ec99`, both the deployment's own URL (`forgelegacy--93p8uzlp12`) and the production alias returned **200** with a matching hash on the FIRST probe, and the live bundle was fetched and searched for eight strings only this pass's code contains (`Close check-in`, `viewerCloseText`, `Take it out`, `Keep it in the session, come back to it`, `Remove it from today’s session`, `only exercise left`, ` from this workout`, `No comments yet. Say the first thing.`) — all **PRESENT**. ⚠ **Published from a clean worktree** (`C:/Users/isaia/forge-deploy-wt` at `ee1a3eb`) because a parallel session's landing-site work was uncommitted here; the export was checked first and `dist`'s 283 files contain nothing from `site/` or `scripts/`. ✅ **OTA PUBLISHED AND PROVED DELIVERABLE TO BUILD 8** — iOS `01a05e39-7476-7ba3-947f-e67aa56b1b9e` on runtime `47944f2eea0b6bc314118d59fe087bcd5a652aca`, group `a8ed5296-48dc-4c3c-b408-776d7d3c61fa`. `fingerprint:compare --build-id 3f67281b…` said **MATCH** before publishing, and the manifest endpoint was then queried as an iOS client on that runtime and returned the new update id — deliverable, not merely published.

⚠ **THIS REACHES BUILD 8 ONLY, AND BUILD 8 DOES NOT CONTAIN THIS PASS.** Build 8 (`3f67281b…`, finished 2026-09-01 10:57) was built from `3311bbb`, the commit BEFORE this work, so its embedded bundle has none of the four fixes — the OTA is what carries them. Anyone still on **build 7** (runtime `4d728d16…`) gets nothing from this update; the two iOS updates published earlier the same day both went to that runtime. Whoever has not taken the TestFlight update to build 8 stays where they are.

⚠ **PUBLISHED FROM A DISPOSABLE CLONE** (`C:/Users/isaia/forge-ota8` at `630a2e8`), because a parallel session's landing-site work is uncommitted in the main checkout and `expo export` bundles the working tree. ⚠ **AND THE LINE ENDINGS ARE PART OF THE FINGERPRINT** — this cost two failed compares. `core.autocrlf=true` means a fresh checkout is CRLF, but main's working tree is a historical MIXTURE: `eas.json` and `targets/watch/expo-target.config.js` are LF, while `.easignore` and `.gitignore` are CRLF. Build 8 was fingerprinted from that mixture, so reproducing it needs main's exact BYTES per file, not one blanket setting. ⛔ **A junctioned `node_modules` is still unusable** — it leaked `../OneDrive - qest4.com/ForgeLegacy/node_modules/…` podspec paths straight into the fingerprint, exactly as the OTA runbook warns; the clone got a real `npm ci`.

⏳ **STILL NOT SEEN RENDERED** — every one of these four is a layout or gesture fix, which is exactly the category tsc and the test suite cannot see. Deployed is not the same as working.

### 0. The grab handle leaves the middle of the photograph, the page holds still while you drag, and an Alabaster launch reaches its own ground first (2026-09-01, Compare / Friends feed / Splash hand-off — **no migration**, ✅ **WEB DEPLOYED** `index-194c05c264e2359eec593c699cb9809c` · ✅ **OTA PUBLISHED TO BUILD 8** iOS `01a05e82-ba38-70f0-b230-0f046570a46e`, runtime `47944f2e…` — commit `1e9d5a1` ⚠ **WAS SUPERSEDED OFF THE DEVICE** — not on `ota/build8-js`. ✅ **RESTORED 2026-09-08** in OTA `01a0814d…`; see that entry)

**PO, three reports in one message.**

⭐ **1 · "The actual slider circle that's in the middle should be at the bottom."** Dead centre is where a handle looks balanced and where it is worst: it sits over the middle of the photograph — the part of a progress shot people are trying to see — so reaching for it means covering the comparison with your hand. It is at the foot of the frame now, under where a thumb already rests. ⚠ `bottom`, not another `top: '50%'` + `marginTop`: a percentage against a parent whose height comes from `aspectRatio` is the RN trap that resolves to no constraint at all, and the two would have fought each other besides.

⭐ **2 · "When we're sliding the screen should just stay in place."** Round three stopped the divider being yanked by a passing thumb and stopped the drag being handed to the scroller mid-stroke. It did **not** stop the scroller *also running*: `PanResponder` defaults `onShouldBlockNativeResponder` to false, so a native `ScrollView` — and, on web, the browser's own compositor — kept scrolling underneath a drag the JS responder had already claimed. The divider tracked the finger correctly and the whole page slid up behind it.

⚠ **THE FIX IS *WHEN* WE CLAIM, NOT JUST WHAT WE RETURN.** `onShouldBlockNativeResponder` is asked **once**, at the moment the responder is granted — so it cannot consult an axis that has not been decided yet. Claiming on touch-DOWN (which is what round three did, to keep tap-to-place) therefore forced a choice between blocking the scroller for *every* touch that lands on a photo and never blocking it at all. The responder is claimed on the first unambiguously horizontal MOVE now: by then the answer is known, blocking is correct, and it holds for the rest of the gesture. A vertical drag never claims, so the page scrolls exactly as if the comparison were a photo. ⚠ **Tap-to-place goes with it, deliberately** — it needed the touch-down claim that costs the above, and the handle is the affordance the design actually draws.

⚠ **WEB NEEDED ITS OWN ANSWER.** There is no native responder to block there; the page is scrolled by the browser's compositor, off the main thread, and it keeps going under a JS drag whatever the responder system decides. `touch-action: pan-y` is the only thing that speaks to it — vertical is the browser's, horizontal is ours, which is the same split the responder implements. `none` would have worked for the drag and made the comparison a dead zone you cannot scroll past, which is the bug round three existed to fix.

⭐ **3 · "When I am on light mode the app opens the dark splash first and then turns to light. Should just go straight to light mode."** The dissolve was already there — **and it ran LAST.** `AnimatedSplashOverlay` painted the native dark ground at full opacity for the first **70% of 600ms** and only then faded, revealing the athlete's cream splash underneath. So an Alabaster launch spent **420ms on a dark screen that JS had already chosen not to be**, and the change, when it came, was the last thing that happened rather than the first. The layers are separated now: the theme's own splash is the FLOOR of the overlay and the native dark ground is a sheet on top of it that dissolves away in the first fifth — the ground reaches the athlete's theme in **~270ms instead of ~600ms**.

⚠ **THE SHORT HOLD BEFORE THE DISSOLVE IS NOT PADDING.** The native splash auto-hides (nothing in this app calls `preventAutoHideAsync`), so for the first frames the OS may still be drawing its own dark screen over ours; starting the dissolve at zero would run it BEHIND that and put the cut back at the moment the OS frame goes away — the exact defect the overlay exists to prevent. ⚠ **A Forge launch renders exactly what it always did**, one layer and no dissolve; stacking two identical dark splashes to animate between them is pure cost on the default theme.

⚠ **WEB WAS ALREADY CORRECT AND WAS CHECKED RATHER THAN ASSUMED.** `+html.tsx` stamps `data-theme` from `localStorage` in the `<head>` before `<body>` is parsed, so `<html>` paints cream on the first frame; `ForgeSplash` resolves to the cream ground; and `AnimatedSplashOverlay` returns `null` on web entirely. There is no dark frame in that sequence — this report is the phone.

⛔ **WHAT NO OTA CAN CLOSE: the OS splash frame itself.** `app.json`'s `backgroundColor` is BUILD config — one value for every athlete on the binary — so the very first frame of a cold launch is dark whatever the theme. A light variant needs a new build AND would follow the **system** appearance rather than the in-app choice, so an Alabaster athlete running iOS in dark mode would still get a dark frame. What shipped here is as close as the platform allows without a binary.

**Gates:** tsc **0** · **3,054/3,054** (+4 guards: the handle's anchor, the move-claim and the native block, `touch-action` on both sliders, and the dissolve's position in the animation) · lint at baseline. ✅ **WEB VERIFIED** — deployment URL and production alias both **200**, hash-matched on the first probe, and `pan-y` / `onShouldBlockNativeResponder` / `bottom:10` all found in the live bundle. ✅ **OTA VERIFIED DELIVERABLE** — `fingerprint:compare --build-id` said MATCH before publishing, and the manifest endpoint, queried as an iOS client on runtime `47944f2e…`, returns the new id and no longer the previous one. ⏳ **Not seen rendered** — a handle position, a gesture and a launch sequence are three things a test suite cannot look at.
### 0. ⭐ The check-in exists in the database — and privatising a bucket took 21 photos off the live app for as long as it took to paste it (2026-09-03, Forge Coach / storage — **migrations `0183` `0193` APPLIED AND VERIFIED · `0188` APPLIED THEN ROLLED BACK**, ⛔ **NOT DEPLOYED — no client code calls any of it** — commits `e310f35` `426db2d` `5826134` on `feat/forge-coach`)

**Phase B's conversation half is now real in Postgres.** `0183` opened what a coach may read of an
athlete's training and `0193` built the check-in itself — the form he builds, the day it lands on, the
answers she writes, the reply he sends. Both verified against a written prediction before being believed.

**`0183` — six read functions**, every one `definer`, every one `guarded`, every one `no photos`. Exactly
the six predicted, exactly the prediction's shape.

**`0193` — four tables** (`trainer_checkin_forms`, `_questions`, `trainer_checkins`, `_answers`), all
RLS-on with one policy each; **five functions**, all `definer`, with `trainer_client_checkins` and
`trainer_checkin_reply` additionally `guarded`; and the **four measurement columns the body log could
never take** — `hips_in`, `thigh_in`, `calf_in`, `neck_in`. Every row count **0**, which is the correct
answer and the point of predicting it: nothing writes this yet.

⛔ **THE RULE THE SCHEMA EXISTS TO HONOUR.** *"Photos file into their Transformation, weight and
measurements into their body log. Nothing here creates a second copy."* — the design, verbatim. A
check-in holds **pointers** (`body_entry_id`, `transformation_entry_id`) and never a copy. That is the
privacy model, not tidiness: **a copied weight survives the revocation meant to take it away, and
survives quietly.** The eight weekly metrics live on the check-in only because they have no home
anywhere else.

⚠ **RENUMBERED BEFORE ANY OF IT WAS PASTED.** The branch was holding a **different** `0189` and a
**different** `0190` from the ones main had already applied (`0189_testing_defaults_open`,
`0190_training_status_definer`). A merge would have produced two files claiming one slot and a ledger
that no longer said what ran. `0189_trainer_checkins` → **`0193`**, and the in-flight private-photo work
→ **`0194`**. **And it happened AGAIN the same afternoon**: main’s own session committed `0191_weekly_review_story_fields`, so the check-in moved a second time — `0189` → `0191` → **`0193`**, with the private-photo work to **`0194`**. Ours was already applied and theirs was not, so the feature branch yielded. The migration now carries a header note recording that it was **applied under the number 0191**, because this project has **no migration history table** — the ledger IS the filenames, and without that line the schema in Postgres has no traceable origin. **Twice in one day is a pattern, not bad luck: a number claimed on a long-running branch is a reservation nobody else can see.**

⛔ **`0188` PRIVATISED `chapter-photos` AND BROKE THE LIVE APP.** It applied perfectly — bucket `private`,
four policies `authenticated` + `owner+chapter`, **0 unreachable objects** — and that was the problem.
The `signed-media.ts` that reads a private bucket exists **only on `feat/forge-coach`**; the deployed app
is built from `main`, where `photos-live.ts` still calls `getPublicUrl`. **All 21 chapter photos went dark
for testers** until `update storage.buckets set public = true where id = 'chapter-photos'` put them back.

**The lesson is a sequencing rule, and it is the inverse of every additive migration.** "Applying is not
working" — a migration that lands while its client sits undeployed — has been the recurring failure here
since `0153`. This is the sharper case: **applying can UNDO working.** Any migration that revokes,
privatises, tightens RLS or drops a grant is a **client-code-FIRST** change: ship and deploy the reader,
see it work, *then* paste the SQL. And the branch to grep for that reader is the **deployed** one
(`git show main:<path>`) — a feature branch having the fix proves nothing. `0188` is back on the shelf
until `signed-media.ts` reaches `main` and is deployed.

⚠ **Two bundle bugs that only running them could find.** `0188`'s §3 declared `with obj as (…)` and then
read `o.total` off `from obj` — the `o` alias belongs to `storage.objects` *inside* the CTE — so the
report raised **42P01** and the editor's single transaction rolled §1 and §2 back with it (nothing partial
landed, which is the one mercy). `0193`'s FC-D16 check was `pg_get_functiondef(…) like '%photo%'`, and
flagged `athlete_checkin_form` and `trainer_checkin_form_save` as **READS PHOTOS** — they carry the column
`photos_on`, the boolean for whether the form *asks* for photos, and touch no photo data at all. Narrowed
to the two table names, which is what `0183`'s report already did. **A guard that fires on the word rather
than the access teaches you to ignore it**, which is worse than not having it. Neither bug was catchable
by the guard tests, which read the bundle as text.

**Where this actually stands: SQL applied ✅ · client code deployed ❌ · observed working ❌.** One of
three. There is no check-in screen, no coach CRM, no messaging table, no due-day scheduling, and
`checkin_due` / `coach_replied` are not registered in `KINDS` in `notifications-live.ts`, which drops
unknown kinds silently. **The athlete-side screen is designed** —
`design_reference/Forge Modal Library Design (8)/Forge Client Check-in.dc.html`, with the coach's
`Forge Coach Check-in Review.dc.html` (seven screens, all states, four themes) beside it — and neither
file is referenced anywhere in `Docs/`. Guard tests: **21/21** for the check-in, **10/10** for the reads,
**15/15** for the buckets.

### 0. ⭐ A squad-mate starting a workout finally reaches you — and it took three separate defects, none of which shared a cause (2026-09-03, Presence / Push / Home — **migrations `0185` `0186` `0187` `0189` `0190` ALL APPLIED AND VERIFIED**, ✅ **OTA PUBLISHED TO BUILD 8** iOS `01a0681d-59ad-7238-9f13-fb2ffda6e1d1`, runtime `47944f2e…` — commits `2734e76` `7a2c25b` `2217ffa`)

⭐ **OBSERVED WORKING, which is the only claim that counts here.** PO: *"Looks like it's showing
rachelle training from our test that we're running, so we are good."* The notification arrived AND the
card showed her — SQL applied, client deployed, seen in the app. All three.

**PO's report was two sentences and three bugs.** *"Brady started a workout and I did not get a
notification. Rachelle is currently working out but she's not showing up in the your circle card."*

**1 · THE NOTIFICATION WAS NEVER GENERATED (`0189`).** Not a defect — the shipped defaults.
`squads.training_alerts` (the leader's) and `squad_members.notify_start` (the recipient's, per squad)
have defaulted **false since 0153**, so two people must say yes before a start notification can exist,
and nobody ever had. Verified before: 2 squads / 13 members / 28 profiles shut. After: **0 / 0 / 0.**

**2 · ⛔ NOBODY COULD ANNOUNCE AT ALL (`0190`) — 0161'S BUG ON A SECOND FUNCTION.**
`set_training_status` is SECURITY INVOKER, so it runs as the athlete. `0086` only ASSIGNED
`training_since` (an UPDATE that assigns needs no SELECT); `0149` revoked their SELECT on that column
on purpose; **`0187` then made the body READ it.** Every call raised **42501** — and `presence-live.ts`
catches and discards that error DELIBERATELY, so presence can never block starting a workout. The
silence was designed; the failure it hid was not. 0161 fixed this exact shape on
`squads_set_invite_code` and left the note *"'Internal' describes where a function is CALLED FROM. It
says nothing about what it may READ."* ⚠ **A fire-and-forget RPC with a swallowing catch has no failure
signal — diagnose it from the DATA it should have written.**

**3 · HOME READ PRESENCE ONCE AND NEVER AGAIN.** With both migrations in, the push arrived and the card
still disagreed with it. `useQuery(fetchTrainingNow, [])` never destructured `refetch`, and the focus
effect refreshed five other queries and not this one — so Home could only ever show people who were
ALREADY training when the app cold-started. Now refetched on focus AND on a 60s interval **while
focused only** (the timer belongs to the screen being looked at, not the app being alive). Presence is
the one read on that screen that changes while nobody touches anything.

⚠ **I GOT THE TIMELINE WRONG AND CORRECTED IT IN `7a2c25b`.** I read the verifier's *"last announced
322 hours ago"* as time-since-the-last-announcement. It is not: `training_since` is set to **NULL when
a workout ENDS**, so a finished session leaves no trace and `max(training_since)` surfaces only the
oldest session never ended. That 2026-08-21 stamp is a ghost, and 0187 was authored eleven days AFTER
it. The mechanism and the fix were unaffected; the blast radius I stated was not.

⚠ **`0190` renumbered off 0188**, which is taken by `0188_private_chapter_photos` on the **unmerged**
branch `ota/build8-js` — a whole feature and its migration sit one commit ahead of main.
**`ls supabase/migrations | tail` is not proof a number is free.** Second collision after `0152`.

Also applied and confirmed client-deployed: `0185` (shared route consent) and `0186` (rename squad
post) — both callers were already on the shipped branch. ⛔ **Neither fix works backwards:** the push
fires on a trigger at the moment a session starts.


### 0. ⭐ Every exercise that could have a demo now has one — in BOTH themes — and a bodyweight set stops being written as zero (2026-09-03, Exercise media / Active Workout / Alabaster / public catalogue — **migration `0189` WRITTEN, NOT APPLIED**, ✅ **WEB DEPLOYED** `index-0cf7d29a2f7b9b5ca314fedb7bf18ef4` · ✅ **OTA PUBLISHED TO BUILD 8** iOS `01a067c6-3d3f-77f6-a4c6-d9eee8b9037c`, runtime `47944f2e…` · ✅ **LANDING SITE DEPLOYED** 1,247 files — commits `9b576ca` `0a2ef28` `3139de4` `399e339` `024a4b9` `559c7ec`)

**The 904-row animation review is finished.** 420 picks, 273 "not needed", 211 "no match", 128 marked
close **and every one of those carries its note**. 264 clips were rendered per theme, 0 errors. Coverage
of the catalogue goes **43% → 70% of slots**, which is the harsh reading; counted the way an athlete
meets it — *does this exercise show me how to do it* — it is **588 of 735 published (80%)**, and **93% of
the 635 the PO did not rule out**. The 43 with nothing left are machines and cardio the 3D library never
rendered (Stair Climber, Row Erg, Jacobs Ladder, Ruck); no further matching finds them.

⭐ **ALABASTER HAD NEVER HAD ITS OWN ANIMATIONS — not in the app, and not in the bucket.** 702 paper
renders were delivered to disk months ago and never uploaded: every `paper/` key returned 400. And
`media.ts` only ever built the Forge URL, so a how-to card in the light theme showed a demo graded to
glow against near-black, on ivory. Both halves are closed — **1,122 paper slots uploaded** (+12 Forge
fallbacks for entries with no source video) and `THEME_PREFIX` added under `IS_PAPER`. ⚠ The prefix went
in **after** the upload and never before: nothing in that file asks whether an object exists, so the
reverse order turns every Alabaster demo into an empty frame with no error to explain it.

⚠ **THE REVIEW SERVER DIED AT 795 OF 904 AND THE CAUSE WAS A LEAKED FILE HANDLE PER ABANDONED CLIP.**
`.pipe(res)` does not close the source when the destination goes away, and a one-at-a-time queue tears
six `<video>` requests off the document every time it advances. They accumulated until node threw
`EMFILE` from an `error` event with no listener — which kills the process rather than failing the
request. Streams are destroyed on response close now; proved against 900 aborted streams.

⭐ **A BODYWEIGHT SET SAYS BW, EVERYWHERE.** PO: *"I don't want 0. I want it to be BW. That's the point
of it. More mental than anything. Seeing 0 can be discouraging."* The rule existed and was **private**
inside `workout.tsx`, so three other surfaces had to remember it and did not: the live-workout view
showed a watching squad-mate `0 lb`, the Last/Best line showed a dip PR as `0 × 12`, and the watch folded
zero in with null and sent the wrist bare reps. `domain/workout/set-load.ts` is the only copy now, keeps
zero and null apart (an empty bar is not a bodyweight set), and names its two unit domains apart because
mixing them halves a metric athlete's lift. **9 tests.**

**The superset row says "superset."** It was in Holt's chat the whole time, named after the reason
("Short on time") rather than the thing, so it read as removed. ⚠ It is absent on the last exercise by
design — a superset forms with the NEXT one.

**The public catalogue shipped**: 735 exercise pages, facets, sitemap, robots — **502 now carry a demo,
up from 283**. That gap was not a thin library; the Aug 31 still-extraction ran short while 108 clips it
needed were already live.

⚠ **`0189` IS WRITTEN AND UNAPPLIED, AND IT IS THE ANSWER TO THE PO'S OTHER REPORT** — no push when a
squad-mate starts, and a training squad-mate absent from Live Now. Neither is a defect:
`squads.training_alerts` and `squad_members.notify_start` have defaulted FALSE since 0153, so two people
must say yes before a start notification can exist. **`0185`–`0189` all appear unapplied**;
`supabase/apply/verify-0185-0189.sql` is one read-only query that says which. ⚠ It **renumbered from
0188**, which was already taken by `0188_private_chapter_photos` on the **unmerged** branch
`ota/build8-js` — a whole feature and its migration live one commit ahead of main and have never been
merged. `ls supabase/migrations | tail` is not proof a number is free.

⚠ **THE OTA COULD NOT SHIP FROM MAIN.** The watch native module (`14402b3`, whose own status commit says
*"nothing has compiled"*) moved main's fingerprint off build 8's `47944f2e…`. Published from the
`forge-ota8-wt` worktree instead, after `fingerprint:compare --build-id` returned an exact match and
with `eas.json`/`.easignore` byte-identical to main; the manifest was then queried as an iOS client on
that runtime and returned the new id. `watch-projection.ts` does not exist at build 8 and was dropped
from the cherry-pick.

Gates: tsc 0 · lint clean on every touched file · web alias 200 and hash-matched with three pass-strings
found in the live bundle · 48 bucket objects fetched anonymously, 0 failures, paper bytes ≠ Forge bytes.
⏳ **Not seen on a device.** ⏳ `Docs/Review-Emotional-Depth-Proposal-v1.0.md` awaits four PO answers.


### 0. A chapter's entries are a shelf, an entry has more than one layout, a playing video can be left — and the feed comparison slides again after I broke it chasing a no-op (2026-09-01, Transformation Gallery / Entry Detail / Accomplishments / Compare drag — **no migration**, ✅ **WEB DEPLOYED** `index-c2e8eb4a893e80ae206ffd2382a28e3b` · ✅ **OTA PUBLISHED TO BUILD 8** iOS `01a05ef3-ac5d-7c32-bc41-33dde8df96b4`, runtime `47944f2e…` — commits `729a944` `d47471e` ⚠ **WAS SUPERSEDED OFF THE DEVICE** — neither commit was on `ota/build8-js`, so every OTA from 09-03 to 09-08 shipped a bundle without them. ✅ **RESTORED 2026-09-08** in OTA `01a0814d…` (`729a944`'s card shelf deliberately reversed by that pass; its entry-detail layouts kept))

**PO, four reports across two messages.**

⭐ **1 · "When I go into my transformation page and I see my three different entries, I should be able to carousel scroll on those cards quickly."** A chapter's entries were a vertical `cardStack`, so moving between two of them meant scrolling the page past a full-height card and back. They are a snapping horizontal shelf now — `snapToInterval` on the card pitch with `decelerationRate="fast"`, so a flick lands ON a card rather than between two, and a `CARD_PEEK` at the right edge says there is more to the side (a carousel whose cards are exactly the content width is indistinguishable from a static card until you happen to drag it).

⚠ **THE CARD'S POSE STRIP HAD TO STOP SCROLLING SIDEWAYS FOR THAT TO EXIST.** It was a horizontal `ScrollView`, which inside a horizontal `ScrollView` means the inner one silently eats every drag beginning on a photograph — most of the card. This repo has already spent two passes on that exact defect class in the comparison slider; building a third on purpose is not a trade. The poses are a fixed 3-column grid now, so the whole card is one drag target and each pose gets **more** room than the strip gave it. Cells size from the card, which sizes from the screen — a hard `76×100` would letterbox on a wide phone and overflow on a narrow one.

⭐ **2 · "When I click on a video in my accomplishment it has to be paused for me to leave it, but I want to be able to leave it at any time."** ⚠ **NOTHING WAS MISSING AND NOTHING THREW — the guard's CONDITION contradicted its own comment.** It read *"guarded on `isPlaying` so returning from fullscreen — which fires the event again on resume — does not immediately shove it back in"*, and then did `if (isPlaying) enterFullscreen()`. Leaving fullscreen does not pause the clip, so on the way out `isPlaying` was still **true**, the listener fired, and the athlete was put straight back in. That is exactly the report: **pause first and the exit works; leave while it is playing and you are pulled back.** The fix is a **latch**, not a better condition — "expand when they press play" is an interpretation of intent at one moment, and any condition re-evaluated on every `playingChange` can be re-entered. ⚠ `onFullscreenExit` latches it too, which is not redundant: the athlete can reach fullscreen without passing through the listener at all, by tapping the native expand button before pressing play.

⭐ **3 · "When I click on a transformation card I should be able to view it in different ways. Like a grid style."** The entry detail had one answer: a 3:4 hero plus a thumbnail strip to choose what went in it. Right default, wrong thing when the question is *"what did I capture that day?"* — answering that meant tapping six thumbnails one at a time and holding the last one in your head. A Compare-shaped segmented toggle adds a grid of the whole capture; tapping a tile drops back into the hero on that pose, so the grid is also the fastest way to reach one. Offered only where there is more than one pose — a grid of one tile is the hero with extra steps.

⛔ **4 · "The slider went to the bottom like we wanted on the post, but now the sliding doesn't work on the feed." — I BROKE THIS, CHASING A NO-OP.** The previous round moved the responder claim from touch-DOWN to the first horizontal MOVE, reasoning that `onShouldBlockNativeResponder` is asked only at grant and so could not consult an axis decided later. The premise was right; the conclusion was wrong, because of one line in `PanResponder.js`'s `onResponderGrant`:

`return config.onShouldBlockNativeResponder == null ? true : config.onShouldBlockNativeResponder(...)`

⚠ **IT DEFAULTS TO `true`.** Every version of this drag has blocked the native scroller from the moment it was granted, so setting it to `true` changed **nothing** — and the only thing that actually changed was giving up the touch-down claim. A comparison in the FEED sits inside a vertical scroller and a ledger card's own press targets, and this view only reliably wins the gesture by claiming on down, where it is the deepest node on the path. The post kept working because less competes for the touch there.

⚠ **AND THE MOVE-CLAIM READ STALE DATA BESIDES.** `_updateGestureStateOnMove` is called from `onMoveShouldSetResponderCapture` and from `onResponderMove` — **not** from the bubble-phase `onMoveShouldSetResponder` the predicate lived in, where `g.dx` is whatever the capture pass last left behind (guarded by `_accountsForMovesUpTo`). A claim resting on that works on one screen and not the next, which is precisely what shipped.

⭐ **WHAT ACTUALLY KEEPS THE PAGE STILL, AND IS KEPT:** `touch-action: pan-y` on **web**, where there is no native responder to block and the page is scrolled by the browser's compositor off the main thread. On native it was never not held. Restored with the down-claim: tap-to-place on release, and the axis latch — whose **vertical arm is load-bearing**, because grant blocks the scroller by default and the termination request is the only thing that hands it back; without it a comparison is a dead zone in the middle of the feed. **A guard now fails the build if anyone sets `onShouldBlockNativeResponder` again**, with the reason beside it.

**Gates:** tsc **0** · **3,066/3,066** (+11 in `gallery-video-grid`, plus the compare guards re-pointed) · lint at baseline. ✅ **WEB VERIFIED** — deployment URL and production alias both **200**, hash-matched on the first probe, and seven strings only this pass's code contains found in the live bundle (`snapToInterval`, `poseGrid`, `cardShelf`, `One at a time`, `gridTile`, `onFullscreenExit`, `pan-y`). ⚠ **`escalated` and `CARD_PEEK` are NOT searchable in a bundle** — a local `const` and a module const are renamed and inlined by the minifier; a probe on either would have reported MISSING on correct code. ✅ **OTA VERIFIED DELIVERABLE** — fingerprint MATCHED before publishing, and the manifest queried as an iOS client on runtime `47944f2e…` returns the new id and no longer the previous one. ⏳ **Not seen rendered.**


### 0. ⭐ The catalogue answers to what people say, and the seal screen composes as one thing (2026-09-04, Exercise search / Workout Complete — **no migration**, ✅ **OTA PUBLISHED TO BUILD 8** iOS `01a06c8a-e5fa-7af7-b3f7-e6a86f84bde6`, runtime `47944f2e…` — commits `a9ba4e4` `2035270` on `feat/route-map`, cherry-picked as `381b9b0` `214ea88` on `ota/build8-js`. ⛔ **WEB NOT DEPLOYED · NOT SEEN ON A DEVICE**)

**Search.** PO: *"Romanian deadlift does not come up when you search RDL."* ⚠ **`rdl` was already in the codebase** — in `ABBREVIATIONS`, reachable only from `tokenize()`, which serves PROGRAM IMPORT. The Picker's search box runs a different function and had never heard of it. Same for `singular()`. **Two matchers, one vocabulary — check both when touching either.** Measured on the real 733 visible rows: `rdl` returned three HURDLE drills and none of the eight Romanian Deadlifts (`includes()` matched hu·RDL·e); `bb` returned 92 rows, nearly all DUMBBELL; and ⭐ **every plural returned ZERO** — squats · curls · rows · presses · deadlifts · lunges · dips · shrugs · crunches · planks. That last one is almost certainly a bigger daily failure than the report that found it, and nobody had raised it. Four rules in `search-core.ts` (shared by the Picker, the Library hub and the cardio rows): abbreviation expansion, word-PREFIX instead of substring, `singular()` folded on BOTH sides, and adjacent-token joins with backtracking. Plus `matchesFuzzy` — Damerau, budget by token length, **run only when the strict pass found nothing**. ⚠ Ordering trap: `singular('ohs')` = `'oh'`, so the fold destroyed any abbreviation ending in s. **⭐ Of 102 hand-written vernacular candidates, 64 needed NO alias** once the matcher was fixed — validate against the live catalogue before writing data. Auto-generating initialisms is a trap (477 "rescues" like `bfr` → Band Front Raise).

⚠ **7 CATALOGUE GAPS surfaced and were NOT invented** (`exercises.json` is append-only): handstand push-up · trap-bar/hex-bar deadlift · landmine press · viking press · reverse hyperextension · jumping jack · Jefferson deadlift. **Open content task.**

**Workout Complete.** PO design review scored it 8.5/10 — *"my main criticism is not the styling, it's hierarchy and vertical composition."* ~120pt of slack removed. The identity block (SESSION COMPLETE / name / date) became ONE wrapped child — ⚠ the gap was never in their margins, `styles.center` has `gap: 12` and each of the three paid it on top of its own. Emblem 132→116 (first-run keeps 132: no stats or milestone there, so it IS the subject). Stats 24→27 and labels `gray600`→`gray400` — contrast bought more hierarchy than size. **The milestone stopped being a card** — nothing to act inside, so glyph + "MILESTONE · 20TH SESSION" as a caption; the `featured` honor/PR variant stays a card. Quote spacing rebalanced so it reads as the pre-seal statement. "See the details" → **VIEW DETAILS** in the screen's own label voice. ⚠ **Hold-to-Seal untouched by PO instruction**, which overrides item 6 of the review (it asked for a progress ring). Items 8 and 9 untouched.

### 0. ⭐ A workout saves with no signal, a run stops at the light, your training log leaves as a file, and last week's numbers sit under every set you haven't done (2026-09-04, Active Workout / Run tracking / Account Settings — **no migration**, ✅ **OTA PUBLISHED TO BUILD 8** iOS `01a06c82-886d-7789-b469-e78ff816e49a`, runtime `47944f2e…` — commit `3b88146` on `feat/route-map`, cherry-picked as `dbae58d` on `ota/build8-js`. ⛔ **WEB NOT DEPLOYED · NOT SEEN ON A DEVICE**)

Four units from a competitive gap-close pass against Hevy and Strava (`Docs/Competitive-Analysis-Hevy-Strava-v1.0.md`,
`Docs/Competitive-Gap-Close-Build-Plan-v1.0.md`). ⚠ **Three of the six planned items collided with LOCKED
documents, and the spec pass found all three before any code was written** — which is the whole reason that
plan exists.

**1 — The offline save queue (W-9 §13.4, a locked clause finished).** Finish a workout with no signal and it
now saves: the session is held on the device and replayed silently when the connection returns. The old
behaviour was **stuck, not lost** — the autosave held the session and Home still offered Continue Workout,
but the athlete stood in the gym tapping Finish at a screen that would not let them out. ⚠ **`save_workout`
has no idempotency key and `workouts` has no unique index**, so a blind retry writes a second workout, a
second chapter bump, a second record set and a second honors pass; the drain asks the existing
`findCommittedWorkout(athlete, startedAt)` before **every** replay. The transport-failure guard errs toward
SURFACING — queueing a real rejection would tell the athlete it saved and retry forever against an answer
that never changes. The discriminator was read out of the installed `postgrest-js`: its fetch-rejection path
is the only one producing `code: ""`. ⚠ **A bug caught in self-review before it shipped:** the queue was
keyed on `startedAt` alone with no owner, so two testers on one device would have drained one person's
workout into the other's account, invisibly. Entries now carry `athleteId`.

**2 — Auto-pause on runs.** No governing spec; greenfield. Pause below 0.8 mph over a trailing 10 s window
after a 25 s grace; resume on two consecutive fixes ≥ 15 m away. Asymmetric on purpose — a false pause
self-corrects in ~4 s of running. ⚠ Speed is measured against the **wall clock, not the last fix**: when an
athlete stops, `acceptFix` rejects their jitter as drift and the track stops growing, so a fix-derived speed
divides a tiny distance by a tiny elapsed and reports anything. **Three holes found while wiring it:**
(a) silence is not stillness — a frozen track means a stop only while fixes are still arriving, so a tunnel
must never pause the clock; (b) **auto-pause had to become FOREGROUND-ONLY** — auto-resume reads the raw fix
stream, which does not run while suspended, so a run auto-paused with the phone pocketed would have had no
mechanism able to restart it and would have sat paused for the rest of the session; (c) **a pre-existing
defect of MANUAL pause** — the OS keeps buffering through a pause and the drain bypasses `reanchor`, so the
walk to the water fountain was credited on the next foreground. All three resume paths now clear the buffer.

**3 — Export My Data (P-9 §2 + §4, another locked row never built).** ⚠ Found late: P-9 gives Account exactly
two rows and only Delete was ever built, and `settings/content.ts` records the Terms being amended DOWN from
"export or delete" because the control did not exist. One tap now hands over a CSV — share sheet on device,
download on web. §4.2's copy said the export is **emailed**, which is undeployable from here (no Supabase CLI,
no service key, no email provider), so `P9-Amendment-001-Local-Data-Export.md` moves that sentence and leaves
§2, §3, §4.1 and §4.3 untouched. ⚠ **The read is deliberately uncapped** — an export that stopped at 200
workouts would tell an athlete they had trained less than they have. Columns are restricted to the `0001`
spine + `0096`, per `activity-live.ts`'s rule that selecting a column that might not exist fails the WHOLE
query. **P9-A1-D6 is owed:** the Terms sentence may have "export" back, and that belongs with a Terms review.

**4 — Per-set `Prev` (PO override of W9-A5 §A5).** PO: *"We do not want to have to tap to see it. Should be
there always."* A5 had declined it on phone-width grounds and deferred to the `.dc` under **PD-7** — and A5's
own arithmetic was out of date, describing a four-column table that has had **five** since `cTrash` was added.
So: no sixth column. `styles.row` became a column, the cells moved into `rowCells`, and `PREV 185 × 10` sits
underneath, indexed to the same set position last session. ⚠ **Not on a DONE row** — the athlete's own number
is already there and the table gets quieter as the session goes on; flipping `!isDone` is the one-line change
if that reads wrong. ⚠ **`gray400`, not `gray600`** — `foundation.paper.ts` measures `gray600` at 3.15:1,
under the 4.5 needed for text in Alabaster. `W9-Amendment-007-Per-Set-Prev.md` records the override **and the
`.dc` divergence**: the design file has no per-set `Prev`, so a `design-gate` run on W-9 will report it as a
delta. **That is DEFERRED-HONEST, not a regression.** PO approved the layout from a faithful render at 390 pt
in both themes (artifact `eb07e1cb-8121-486e-8e44-b315d1b3898e`) — **not from a device.**

**⛔ SKIPPED — Hevy/Strong CSV history import**, PO decision 2026-09-04. ⚠ The analysis still rates it the
single highest-value **acquisition** fix in the document (a switcher must abandon their history), and that
assessment stands — this is a sequencing call, not a finding that the gap closed.

**⛔ BLOCKED — the rest-timer alert.** `Rest-Timer-Architecture-v1.0.md` §8.1: *"No rest-timer notifications
fire in V1."* The PO chose "sound only, no banner" and **it cannot be built**: `UIBackgroundModes: audio` keeps
an app alive only while audio is playing, the rest timer is a `setInterval`, and iOS suspends the JS so the
timer never fires and nothing ever requests a ding. iOS offers no programmatic "sound but no banner". Real
options are a **local notification with sound** (reliable, and OTA-able — `expo-notifications` is already in
the binary; needs an amendment resolving **RT-OQ-1**) or dropping it. **Awaiting PO.**

**Gates:** `tsc --noEmit` clean · `expo lint` at baseline (1 pre-existing error, 14 pre-existing warnings) ·
**3224 tests pass, 0 fail** (+50 new). ✅ **Published from a CLEAN WORKTREE, not from main** — `fingerprint:compare --build-id 3f67281b…` printed MATCH on `47944f2e…` before publishing, and the manifest endpoint returns `01a06c82…` for that runtime. ⚠ **Option B was chosen deliberately:** the main tree held 35 uncommitted files of a parallel session's work — an onboarding/intake rework, `usePremiumGate`, and Posted Workouts whose migration `0192` is WRITTEN-NOT-APPLIED — and `expo export` bundles the WORKING TREE, so publishing from main would have shipped all of it. ⏳ **Build 7 was NOT fed this pass** (`ota/build7-js` exists; build 8 is the tester build). ⚠ **NOTHING HERE HAS BEEN OBSERVED WORKING.** Auto-pause's thresholds
in particular are a road test, not a unit test. ⚠ A second session was editing this tree throughout the pass
(commit `3e84fdf` landed mid-way, and a transient typecheck failure in `workout-complete.tsx` was theirs,
mid-edit); nothing here is staged, so these changes are still loose in the working tree.

---

### 0. ⭐ The white flashes behind the exercise animations are gone — 612 of 2,268 loops re-cut without the sources (2026-09-07, Exercise media / both themes — **no migration** (a temporary bucket write window was prepared but not needed — the service key ran the upload), ✅ **819 OBJECTS UPLOADED** to `exercise-media`, ✅ **DEPLOYED BOTH SURFACES** — web `index-ddea8798eb317b900159ba9645d0a8ce.js`, iOS OTA `01a07e46-7cd8-7c32-80d3-c01f09c181e5` on runtime `47944f2e…`, commit `c7a312d` on `feat/route-map`, cherry-picked as `bc46151` on `ota/build8-js`. ⏳ **NOT YET CONFIRMED ON A DEVICE**)

PO: *"There are a lot that have flashes of white from the background before. We want everything extremely smooth."*

Every one of the 2,268 live loops (forge + paper × male + female) was pulled from the bucket and audited frame by frame. **612 carried a background glitch** (forge 125 ♀ / 159 ♂, paper 164 ♀ / 164 ♂): 19.8M px of white background the matte had kept, over 16,646 frames; 499k px of body it had punched out, over 795 frames; and on **five forge/male loops the entire white sheet was still behind the figure** (hanging-knee-raise, lying-leg-curl-machine, dumbbell-front-squat, dumbbell-bulgarian-split-squat, and decline-push-up where it came and went for 11 of 151 frames). 1–2-frame pops across the changed set drop from 8.06M px to 6.87M; the fixer itself added 38.9k px of new edge pops, every one ≥ 150 px inspected and accepted (figure edges against a now-transparent background). Bytes 753 → 801 MB (+6%).

⭐ **THE SOURCE MP4s ARE ON A DRIVE THAT IS NOT HERE, SO THE REPAIR WORKS ON THE DELIVERED LOOP.** `scripts/animation-processing/fix_flicker.py` classifies each flat near-white blob by the 2px **ring** around it — skin means body (a hole, filled from the nearest opaque neighbour frames), steel/outline means background — and clears a dark-ringed blob on one of four grounds: it **blinks** (transparent in the neighbour frame), it is **static** and bounded by machine not skin, it is **transient** (a wedge between a band and the body that exists while the arm rises — band-lateral-raise, machine-biceps-curl's smith panel, 35 loops), or it is **open** to the transparent edge. Every verdict is voted along time (±3 frames) before anything is written, so the fixer is not a second source of pops. ⚠ **A pixel that is opaque in every frame is scene and is never cleared** — a white bench leg and a white gap panel are graded to the same ivory with the same ring, and only whole-loop opacity separates them. The cost, by decision: a gap panel that is opaque all loop (kneeling-cable-crunch, assisted-pull-up, lat-pulldown, cable-crossover) stays — static ivory, not a flicker. Also not fixable: holes longer than 4 frames (faces), gaps bounded by skin on both sides, the pale cable-crossover panels.

⚠ **THE OBJECTS ARE CACHED FOR A YEAR AT EVERY HOP**, so a re-upload under the same key reaches nobody who has already watched the clip. `media.ts` now appends `?v=<MEDIA_REV>` (`MEDIA_REV = '2'`) to every loop and poster URL, and the deploy went out **after** the upload finished — the other order would have cached the OLD loops under the new key for a year. Posters were re-cut only for the 207 loops whose poster frame (`len//10`) was among the changed frames; the rest keep their 720h masters. The algorithm, its thresholds and their empirical margins are in `scripts/animation-processing/README.md` (Flicker section); the ring/size/opacity distributions behind every constant were measured on the live set, not guessed.

### 0. ⭐ The indoor ride ends when the workout does (2026-09-05, Active Workout / cardio — **no migration**, ✅ **DEPLOYED BOTH SURFACES** — web `index-b60341ce2ed31de87709cc21588d332a.js`, iOS OTA `01a071fc-024f-7e80-b5f5-c80c1608d8bc` on runtime `47944f2e…`, commit `2e61c45` on `feat/route-map`, cherry-picked as `9e67b1f` on `ota/build8-js`. ⏳ **NOT YET CONFIRMED ON A DEVICE**)

PO: *"the indoor ride is just one continuous ride even when you end the workout, it just picks up on the next."* It was, and it was **two failures lining up** — either alone would have been survivable.

**1 — The clock was keyed on the block's POSITION and nothing else** (`forge_cardio_timer_v1:2`). Position is not identity: Tuesday's ride and Thursday's ride are both the third exercise, so they were one row on disk.

**2 — Nothing ever deleted that row.** `timer.reset()` runs on the card's own Save, so a bout logged the intended way cleaned up after itself; **every other ending did not** — Finish after a reload, Discard, "End workout" from the resume prompt, a force-quit, a save handed to the offline queue. `clearSession` wiped the session draft and left the clocks standing. ⚠ **`useWallClockTimer` measures `now − startedAt` BY DESIGN** (so a sleeping screen cannot cheat it), which means a stale row is not merely restored — **it keeps counting**. The next ride opened at two days and rising, offering Resume where it should have offered Start.

⚠ **THE OUTDOOR RUN WAS NEVER AFFECTED, AND THAT IS WHY IT LOOKED LIKE A RIDE BUG.** GPS runs through `useRunTracker`'s phase machine, which holds nothing on disk. An indoor **run** had the identical defect — nobody had trained one. The comparison the PO drew ("like the run") was pointing at a different mechanism, not a working version of the same one.

`cardio-timer-store.ts` now owns the key format, scoped by the session's `startedAt` — the one field on `ActiveSession` that is unique per session AND survives a resume unchanged, which the block index is neither. A new session cannot construct an old one's key. `clearSession` sweeps every `forge_cardio_timer_v1:*` row: it is the **one call all endings share**, so hanging the sweep off Finish alone would have left every other ending leaking exactly as before. ⚠ **The sweep is deliberately blind to scope** — matching only the ending session would strand the rows from sessions that ended some other way, which is the bug, kept. It also collects the legacy position-only keys, so rows already sitting on athletes' phones go with the first workout ended after this ships.

⚠ **THE `boutLive` LOCK IS NOT A SECOND LINE OF DEFENCE.** `workout.tsx` blocks Finish while a bout is open, but `liveBoutIdx` is `useState` — pure memory. Navigate away and the lock is gone; the row on disk is not.

⛔ **THE TREE COULD NOT BE PUBLISHED AND THE GUARD IS WHAT CAUGHT IT.** ~1,150 lines of a parallel session's in-progress work sat in the working tree, and `planned-workout-live.ts:152` calls `take_posted_workout` — **an RPC `0192` creates, and `0192` is still pending** (`supabase/apply/pending-0192.sql`). A tree-wide publish would have put a client in front of the testers calling a function the database does not have. Published from `C:/Users/isaia/forge-ota8-wt` at the cherry-picked commit instead. ⚠ **This is the third time a pending migration has nearly ridden out on an unrelated publish** — check for pending migrations before publishing ANYTHING, not just before publishing the feature that needs them.

✅ **VERIFIED, NOT MERELY PUBLISHED.** `fingerprint:compare --build-id 3f67281b-48b3-4048-adf2-a16b20ad0aa8` returned an **exact match** on runtime `47944f2eea0b…` BEFORE publishing. Dry-run payload checked first (20,901-byte tarball, `assets.json` **63,305 bytes** of real entries — not the 295-byte `{}` of the 22.4.0 bug). Deployment URL **and** the production alias both returned **200** with a hash matching `dist/index.html` on the first probe, and the **live** bundle fetched from `forgelegacy.expo.app` was searched for `unscoped`, a literal only the new code contains — **PRESENT**, with the old `forge_cardio_timer_v1:${index}` template **absent**. tsc clean · 3231 tests pass · lint at baseline.

⚠ **A BOUT IN PROGRESS WHEN THIS LANDS LOSES ITS CLOCK** — the key format changed. That clock is the broken one.

⏳ **UNCHECKED: STALE ROWS ALREADY IN THE DATABASE.** Nothing clamps the seeded duration on save, so any ride the PO ended on an inflated clock wrote a multi-day `timeSec` into `workouts` and is skewing totals. The Supabase MCP server was down this session (`AUTH_HEADER_REJECTED — JWT could not be decoded`), so **Nate Witt's profile was never looked at**. This fix stops new ones; it cleans up nothing. **Open task.**
