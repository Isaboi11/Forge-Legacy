# App Store Submission Checklist

**This is THE checklist for submitting Forge Legacy to Apple.** Every chat works from this file.
When an item moves, update it here, in the same session, with the date. Keep it simple: one line per item.
Detail lives in `Docs/GO-LIVE.md`, `Docs/Launch-Checklist-Free-And-Premium.md` and the amendments named below.

✅ done · 🔨 in progress · ⏳ waiting on someone else · ⬜ not started

**Last updated:** 2026-09-30

## Where we are
- **Waiting on others:** Apple (Small Business Program — no word as of 09-28)
- **PO to-do:** ~~find a lawyer~~ (09-26: legal review good) · ~~decide if Nutrition ships~~ (09-25: yes, opens on approval) · write the recipes · new store screenshots (09-28) ·
  ~~RevenueCat tidy-up~~ (done 09-25)
- **Claude to-do:** build 9 (paywall, mic, form check, barcode) → sandbox purchase test
- **💻 PO laptop work (from the 09-26 QA fixes; ask Claude to put each on the clipboard):**
  - ✅ `pending-0200.sql` applied 09-27 (squad goals close; 10/10 rows green). First paste stopped on the grant check — revokes from PUBLIC alone left the new functions callable; fixed to also revoke from anon + authenticated, re-pasted clean. Moch 1 closes as **met, silent** (deadline >7 days gone)
  - ✅ Re-pasted 4 coach functions 09-27 (stronger food/diet safety stops, `2738fdc4`): coach-ask, coach-interpret, coach-form-check, coach-kitchen
  - ✅ Premium AI turned back off for claudetest — 09-27
  - ✅ `pending-0230.sql` applied 09-28 (pin + edit squad posts): 248 posts · 0 pinned · 0 edited, as predicted
  - ✅ `pending-0232.sql` applied 09-28 ("Fix it with AI" = 1 credit): workout_tidy 1 · tidies 0 ✓. ⚠ It showed **meal_photo = 1**, not the 3 that 0223 set — changed by hand at some point; ✅ PO 09-28: 1 credit is intentional
  - ✅ Edge Function `workout-tidy` deployed 09-28 (Verify JWT on; probe: OPTIONS 200, no-auth POST 401)
  - ✅ Published 09-28: web `index-825813ed…` + build 9 iOS `01a0e80d` (Squatober posts, pin/edit, Fix it with AI)
  - ✅ `pending-0233.sql` applied 09-28 (weekly summary as a story): 4 of 4 recent summaries `has_story = true` (2 squads × 2 weeks, 4–7 members each), as predicted
  - ✅ Published 09-28: web `index-30621b29…` + build 9 iOS `01a0e8a3` (squad story summary, 24 h pin, recipe barcode scan) · ⚠ both then rolled back by the barcode-only publish · ✅ restored 09-28: web `index-3c1a683c…` + build 9 iOS `01a0e8b3` (also: set-logged fuse)
  - ✅ `diagnose-po-chapter-photos.sql` run 09-30 — nothing is lost. Chapter I: 0 album photos, 1 progress entry with 5 photos (08-10). Chapter II: 10 album photos, 3 progress entries with 15 photos. Storage matches exactly (10 album files, 20 progress files). The first album file ever saved is 08-26, after Chapter I ended 08-14 — no album photo was ever added to Chapter I. ✅ PO decided 09-30: a chapter's album shows its progress photos. Built `20b9d5b3` (`Photos-Architecture-Amendment-002`, no SQL needed)
  - ⬜ Tell Claude "deploy" — the album change goes to the web preview and the phone (build 11). Then open Legacy → Photos: Chapter I should be listed with 5 photos (added 09-30)
  - ✅ `pending-0245.sql` applied 09-30 (plain-English bug summaries): `0 · 284 · true`, as predicted
  - ⬜ Deploy the `bug-plain` Edge Function (`supabase/functions/bug-plain/index.ts`), then the web deploy — until then the CRM bug board shows "Summary unavailable" (added 09-30)
  - **CRM Social section (added 09-30; built on `feat/crm-social` `f94e8216`, not a submission blocker). Do these in order:**
    - ✅ `pending-0247.sql` pasted 09-30 (PO said "Yes"; the result row itself was not sent — expected `13 · 17 · 13 · 2 · 1 · 1 · 0 · 0`)
    - ⬜ Tell Claude "deploy" — the web CRM gets Social → Numbers, Content, Playbook. Ideas, the pipeline, the calendar and the Playbook work from here
    - ⬜ Follow `Docs/Social-Accounts-Setup.md` (about 45 minutes, once): make the TikTok and Meta developer apps, set 4 secrets in Supabase, paste the `social-sync` function with Verify JWT **off**, press Connect in the CRM. Numbers then arrive on their own
    - ⬜ Approve the one-line privacy policy addition ("How you found us", in `Admin-Analytics-Amendment-003-Social.md` §5), then tell Claude to deploy the site
    - ⬜ Put `forgelegacy.app/go/tiktok` in the TikTok bio and `forgelegacy.app/go/instagram` in the Instagram bio

## Pricing (Monetization Amendment 007, locked 2026-09-23)
| Who | Premium | Premium AI |
|---|---|---|
| Everyone | $14.99/mo · $119.99/yr | $19.99/mo · $169.99/yr |
| First 100 subscribers (Early Bird, while subscribed) | $12.99/mo · $99.99/yr | $16.99/mo · $144.99/yr |
| The comped testers (11 + review account `alex.review`) | Free forever | Add AI: $7.99/mo · $69.99/yr |

Free plan stays $0. 7-day free trial on **yearly plans only**; cancel within 7 days = never charged.
No lifetime plan. United States only at launch.

**What's in Premium AI (Amendment 008, locked 09-28):** talking to Holt · Holt changing your program for you ·
photo import · form check · meal photos · Holt AI check-ins, food patterns and typed reminders (not built yet).
Holt's safety responses stay on every plan. Changing your program yourself
stays free on every plan; Holt building programs stays Premium.
- ⬜ Gate Holt's "Change my program" flow on Premium AI (JS only → OTA; not a submission blocker) — MA8 work owed #1

---

## 1. Apple account
- ✅ Account is Forge Legacy LLC (Organization) — 09-23
- ✅ Agreements, Tax & Banking — all Active 09-25
  - ✅ Paid Apps agreement accepted — 09-23 (reads "Pending User Info" until bank + tax are in)
  - ✅ Bank account entered — 09-24 (Zions business account; holder `FORGE LEGACY LLC`, Business type).
    Apple verifies it over a few days
  - ✅ Tax form (W-9) submitted — 09-24 (line 1 "Forge Legacy LLC"; LLC – Disregarded Entity; Non-Exempt Payee).
    Worth a one-line CPA confirmation of the TIN choice (two-tier chain via Altimealix)
  - ✅ Agreement reads **Active** — 09-25 (Paid Apps effective Sep 23 2026 – Aug 4 2027; bank, W-9, DSA also Active)
- ✅ EU trader declaration — Trader, on the account and the app — 09-23
- ⏳ Small Business Program (30% → 15%) — applied 09-23, waiting on Apple (no word 09-28)
- ✅ App set to United States only, price Free — 09-23

## 2. Subscriptions & paywall
- ✅ 10 subscriptions created in 3 groups — 09-23 (Product IDs in Amendment 007)
  - Forge Legacy Membership (4 regular) · Early Bird (4) · Tester AI (2)
  - ⛔ Never click "Add for Review" on them — they go in WITH build 9
  - ⛔ Never turn on "App Store Promotion" for Early Bird or Tester AI (shows them to everyone)
- ✅ Paywall code — 09-24: Premium / Premium AI tabs, yearly first with the store's own prices + trial ·
  Early Bird prices + spots left while they last · Tester AI shown ONLY to comped testers · never a second
  group · Founder/Lifetime removed · Premium AI switch now admin-only. Our server picks the offer (`0214`).
  Works on build 9 only; web and build 8 say "Plans aren't available on this device yet."
  - ✅ `pending-0214.sql` applied 09-24 (0 · 0 · 0 · 100 · admins-only, as predicted) · ✅ `set-comped-testers-0214.sql` applied 09-24 (12 rows)
  - ✅ Edge Function `revenuecat-webhook` deployed, Verify JWT OFF, secret `REVENUECAT_WEBHOOK_AUTH` set — 09-24
    (✅ misspelled leftover `REVENUE_WEBHOOK_AUTH` deleted 09-25)
  - ✅ RevenueCat webhook "Supabase entitlement" → that function — 09-24; test event returned 200 `{"outcome":"ignored"}`
  - ✅ PO 09-24: `alex.review` also sees Tester AI, so Apple can review that product (12 comped accounts: 11 testers + alex.review; `poop` was deleted)
- ✅ RevenueCat set up — 09-24 (tidy-up done 09-25)
  - ✅ Project + iOS app (bundle ID `com.qest4.forgelegacy`) — 09-24
  - ✅ In-App Purchase key (.p8) uploaded to RevenueCat — 09-24 (Key ID `A8T8CTT9TS`).
    ✅ .p8 moved to `OneDrive\Desktop\Forge Legacy Documents` (personal OneDrive) — 09-24. NEVER in the repo
  - ⬜ Enter the Small Business Program start date in RevenueCat (App settings) once Apple approves
  - ✅ RevenueCat email confirmed — 09-24 · ✅ project renamed "Forge Legacy" — 09-25
  - ✅ 10 products added by hand · entitlements `premium` (8) + `coach_ai` (6) · offerings `default` (Current) / `early_bird` / `tester_ai` — 09-24 (Claude in Chrome)
  - ✅ Leftover `$rc_monthly` / `$rc_annual` packages deleted from `default` — 09-25 (4 premium packages + all 10 products intact)
  - ⬜ Optional: App Store Connect API key in RevenueCat, so it can check the product IDs against Apple
  - ✅ Public iOS SDK key (`appl_…`) given to Claude — 09-24 (in `src/lib/billing-store.native.ts`)
  - ✅ Code: adapter over `react-native-purchases` 10.10.2 — 09-24 (`src/lib/billing-store.native.ts`; native → build 9 only)
- ⬜ Referral reward: "1 month free" offer for a referrer who is already paying (referrer only)
- ✅ Review screenshot on each subscription (09-28, all 10 verified by Chrome): one paywall screenshot from build 9 uploaded to each product's
  "Review Information" box (Apple-only, never shown on the store). Premium tab for Premium/Early Bird, AI tab for AI/Tester AI
  - ✅ Taken 09-28 on `purchase@test.com` (set to FREE, `supabase/apply/set-free-purchase-test.sql`): `raw/0928-review-paywall-premium-tab.png` + `…-premium-ai-tab.png` in `OneDrive\ForgeLegacy-AppStore` · ✅ uploaded to all 10 products 09-28 (PO drag + Claude in Chrome; AI file on the 6 AI/Tester AI, Premium file on the 4 Premium)
- ✅ Sandbox test on build 9: buy, force-quit, reinstall, restore — then check `store_events` shows `applied` · 09-25: first try showed no plans — every account is Premium while testing, so the test account needs a FREE `athlete_entitlement` row first ·
  ✅ **buy works** 09-25 (webhook landed in 5 s; screen stayed Free until a force-quit → fixed `d284de8c`) · ✅ **09-27 re-test PASSED** on a fresh FREE account (`purchase@test.com`): screen turned Premium by itself · reinstall kept Premium / restore works · the black flashing it showed is fixed (`8467a1e2`, web `index-3d00176c` + build 9 OTA `01a0e5ca`)

## 3. Store listing
- ✅ Description, age rating, reviewer account, support URL
- ✅ **Screenshots UPLOADED 09-29** — v4 "Hevy pattern" set, 10 of 10 in the iPhone 6.9" set (6.5" mirrors it), order checked after a reload: promise · log · home · AI coach · form check · progress · nutrition · run · squad · legacy. Files: `OneDrive\ForgeLegacy-AppStore\upload-v4-hevy-0929`. Uploaded by Claude in Chrome; App Preview slot empty (0 of 3). History below.
- ~~Redo screenshots AGAIN~~ — 09-28: the app changed since the 09-25 set; PO takes new ones on build 10 (PO 09-28: submitting build 10), Claude checks them before upload
  - 09-28 set: workout record ✅ (website) · Holt builds a day ✅ (PO 09-28: plank row edited to "3 × 30s" — ✅ real bug FIXED 09-29 `795803bf`: holds (82 `unit: 'time'` exercises) now come out in seconds everywhere Holt writes a workout; 2,203 tests pass · ✅ LIVE 09-29: web `index-fe426cab…` + build 10 iOS `01a0ef1d`) · Nutrition ✅ · Honors (⚠ `06-honors.png` shows the OLD plain coins — ✅ medals BUILT + OTA'd 09-28 `035b2492` (build 10 `01a0eaa2`, build 9 `01a0eaad`, web `index-11384d1a`); ✅ PO retook it 09-29 (`raw/0929-honors-medals.png`), Claude reframed 06 09-29; old one kept as `raw/0928-06-honors-OLD-coins-framed.png`) ·
    run map ✅ (street names blurred) · form check ✅ (background people blurred) · squad + competition + bench demo = keep existing ·
    ✅ Nutrition opened for the review account `alex.review` 09-28 (`supabase/apply/nutrition-preview-add-reviewer.sql`, PO ran it) · ✅ Claude framed + captioned 6 new frames 09-28 → `OneDrive\ForgeLegacy-AppStore\final-0928\01–06` (same layout as the August set; profile photo blurred on 03) · ✅ captions rewritten 09-29 so each names its screen (PO: "they should know what the screen is from the caption"): Log every lift / An AI coach builds your workout / Track calories and macros / Film a lift, AI checks your form / GPS-track every run / Earn medals for every PR — old versions in `raw/captions-0928-old` · ✅ kept August squad / compete / demo recaptioned the same way 09-29 (Share workouts with your squad / Compete in challenges with your squad / A demo for every exercise) · ✅ **upload set = `OneDrive\ForgeLegacy-AppStore\upload-0929\01–09`** (09-29), 10 shots (Apple's max), ordered for search results: AI coach · active workout ("Log every set in seconds", August 01, PO: needed) · form check · progress (the record, "See your progress after every workout") · nutrition · run · medals · squad · compete · demos · 🔨 **v2 redesign 09-29** (PO: "copy how the top apps do it"; research on 25 top apps' current sets): bold Playfair captions with a bronze key phrase, framed phone with a clean 9:41 bar, real UI crops zoomed and floating over their own spot → `OneDrive\ForgeLegacy-AppStore\upload-v2-0929\01–10` (script: session scratchpad `v2/build.py`) · 🔨 **v3 09-29** (`upload-v3-0929`, script `v2/build2.py`): slots 1–2 flow into one scene (tilted phones across the join), Forge mark on slot 1, four rotating layouts, 1.5–3.4× pop-outs, Legacy replaces demos at 10 ("Climb the ranks as you train.") · ✅ 09-29 PO captures in: Rank Journey (Builder II) + Rank Ascended card → slot 10 · squad feed → slot 8 · the Outdoor Run card → slot 6 pop-out (PO avatar blurred — shows a child; album art blurred; ✅ Brady Plante consented 09-29, his post stays) · ✅ dark form check 09-29 → slot 3 (video leads, gym members blurred in both rep clips) · 🔨 **v4 "Hevy pattern" 09-29** (`upload-v4-hevy-0929`, script `v2/build3.py`; PO: "follow this pattern but also with the highlighted"): 1–2 one image (stacked promises + tilted logger, highlighted set rows spill across the join, bronze band + Forge mark), 3–10 one template (caption, big upright iPhone 16 Pro Max frame bleeding off the bottom, bronze band, one blown-up real row). Order (09-29, Home added, Medals dropped): promise · log · Home ("Your training day, on one screen.") · AI coach · form · progress · nutrition · run · squad · Legacy — challenges + demos + medals dropped · background stays dark for launch; test an Alabaster set later with Product Page Optimization · ⬜ PO picks v3 or v4 · ⬜ **(v3 only) still to recapture:** challenge leaderboard with more than 2 people (the current one says "1st OUT OF 2", names "Alex Reviewer"/"Sam Torres") · run summary with the map (blur street names only) · form check result in dark · ⬜ then PO uploads: delete the old set in App Store Connect, drag in 01–10 in order, Save · ⬜ Google Play set: 1080×1920, max 8, no "#1/best/free" text (6 new, then squad · competition · bench from the existing set)
- ✅ Release set to "Manually release this version" — 09-23
- ✅ Regulated medical device declaration → **No**, saved 09-27 (banner gone)
- ✅ App Privacy labels — answer sheet v1.1 ready 09-26 (`Docs/App-Store-Privacy-Labels.md`, `6b157bba`: Nutrition, AI, purchases, search log) · ✅ entered in App Store Connect, all 13 types match the sheet (checked by Claude in Chrome 09-27) · ✅ Published 09-27
  · ✅ **Crash Data + Other Diagnostic Data added and re-published 09-27** (Yes · linked · App Functionality · not tracking; 15 types, checked by Claude in Chrome) — sheet v1.2, 09-27: the app's own error reporter (0176) collects them; v1.0 said No before it went live
  · ✅ **Performance Data added and published 09-28** (Linked · App Functionality · not tracking; 16 types, by Claude in Chrome) — sheet v1.3, for Sentry tracing in build 10

- ✅ Crash reporting — 09-27: the app's own reporter (0176) is live; read it at `/admin` → Errors. Sentry account made
  (org `forge-legacy-llc`, project `forge-legacy`) but NOT installed — deferred to after launch (needs a new build
  and a privacy-policy change: the policy promises no third-party crash reporting) · 09-27: queued for build 10 ·
  ✅ 09-28: Sentry is IN build 10 (EAS `f6b72b0c`), DSN + token in EAS, policy updated and live on forgelegacy.app

## 4. Legal
- 🔨 Mock review done 09-25 (`Docs/Legal/Mock-Legal-Review-2026-09-25.md`): policy + Terms FAIL as is — false 200 m
  route trim, Anthropic gets photos/video frames, missing providers, Terms say "no subscription"; Washington
  My Health My Data Act needs a consent step. ✅ text fixes applied (live 09-26) · ✅ PO: legal review of Terms + Privacy Policy is good — 09-26
- ✅ Terms + Privacy links (Apple 3.1.2) · ✅ paywall: beside the buy button's renewal terms + at the foot — 09-27 (not yet on web/OTA) · ✅ App Store description: Terms + Privacy lines added and saved 09-27

## 5. Nutrition (only if it ships in the first release — PO to decide)
Built and on build 8 for the PO + claudetest only (`0206` allowlist). Web preview NOT updated with it.
- ✅ Food log, Log Food, Food Detail, Create Food, Meal Detail, Details, Targets — 09-22/23
- ✅ Meal Plan Setup, Meal Plan (week), Recipe, Grocery List, My Recipes, offline logging — 09-23
  (`0207`–`0213` applied and verified; OTA `01a0d13e`)
- ✅ Food search — 09-24: real servings ("1 item"), fewer/better results + Show more, calories per serving,
  restaurant foods from FatSecret, retries USDA's random failures (OTA `01a0d4a7` + function rev 7+)
- ✅ Confirm `FDC_API_KEY` in production + FatSecret console steps (Premier Free granted 09-23 — barcode + US data unlocked) — **done 2026-09-24**: IP allowlist + secrets set, token scope `basic premier barcode`, PO saw McDonald's Big Mac with real calories as Restaurant data
- ✅ The 40 starter recipes removed — 09-24 (PO: writing their own; OTA `01a0d506`). Meal Plan now points to My Recipes
- 🔨 PO's own recipes — 6 in and on build 8 (09-24, OTA `01a0d585`; review list `Docs/Nutrition-Recipe-Book.md`).
  Send more to Claude (USDA numbers + allergy tags worked out) or add in My Recipes;
  include 15-minute meals and vegan
- 🔨 Gentle message for sustained under-eating — 09-25: PO said "come up with something"; wording in the mock review
  (passes); built `8bd673ca` (Home, Details, Targets; Targets holds Lose at 0.25 lb/wk while it shows) ·
  ✅ web 09-25 `index-583836d8…` (from `deploy/care-line`, before the unapplied Holt work) · ✅ build 9 OTA 09-25, now inside the combined iOS `01a0daaa-8db8…` (lane `ota/build9-js` `97b4344e`; an update from the old `ota/build9` rolled it off for ~25 min) · ✅ PO saw it 09-27
- ✅ Holt's 4 safety fixes (Coach Holt stress test, Decision Queue #36) — fixed 09-21 (`d7ce6dde`), on build 8.
  Re-verified 09-24: 0 limitation breaks in 1,800 programs + 5,760 days + 480 race plans (controls fire);
  edits land on the right day in all 127 rest-day patterns (5,888 edits; the old code fails 6,404)
- ✅ Privacy policy + Terms — LIVE 09-26 on forgelegacy.app (Cloudflare `102ae125`; rollback `88c1c53a`):
  privacy rewrite (nutrition, AI/Anthropic, all providers, route correction, Holt memory) `94010207`, new
  `/health-data` page, subscription terms (auto-renew, trial, Early Bird, refunds, Apple EULA) `f198ea07`.
  In-app legal summaries updated too: web `index-4e10f078…` + build 9 iOS `01a0df09-5476…` (lane `da09e79c`).
  🔨 09-29 (QA F5): in-app Privacy + Terms sheets re-synced to the hosted 28 Sep / 26 Sep pages — Sentry, Apple Health, on-device form check, voice, purchases, shared barcode foods, Export My Data, and the pages' exact dates (the old sheets said Sep 2026); a test now fails if the in-app sheet drifts from `site/` (branch `fix/high-privacy`) · ✅ merged + LIVE (web `index-3e0d9340…`, build 10 `01a0ef36`) · ✅ PO OK on the wording 09-29
  🔨 in-app consent for Washington (Nutrition + AI sharing) — built 09-26 `3414c39d` (all 7 AI functions gated client-side; Settings → Health Data & AI to withdraw) · ✅ 0224 applied 09-26 · ✅ LIVE: build 9 iOS `01a0df2f-a17b…` (lane `f2adcd4f`) + web `index-de14dc70…` · ✅ PO saw both prompts 09-27 · ⬜ server-side refusal in the AI functions (follow-up) · ✅ legal review signed off (PO 09-26)
- ✅ Search failure message — 09-24: a failed source falls back to saved foods, and with no connection the
  app now says "Couldn't connect to food search" with Try again (Log Food + the meal editor). Not deployed yet
- ✅ First-time welcome screen for the tab — built 09-24 (`eefe43dd`), on web; not yet seen by the PO
- ⬜ "This looks wrong" report on a food
- 🔨 Community foods (Amendment 004) — 09-25: a missed barcode becomes everyone's; `0219` applied, food-search redeployed, on build 9 OTA · ⬜ first share seen on a device
- 🔨 Scan a recipe from a screenshot into My Recipes — 09-25 (`487dc325`; `0220` applied, on web + build 9 OTA) · ⚠ 09-29 correction: `recipe-photo-read` is NOT deployed (QA R2-F7: "Requested function was not found") — ✅ PO deployed it 09-29 (probe: OPTIONS 200, no-auth POST 401) · 🔨 09-29 the app now says "isn't available right now" instead of blaming the connection (`fix/high-privacy`)
- ✅ Data export includes nutrition — 09-24: with food data, Export My Data gives one .zip (workouts.csv +
  food log, targets, my foods, my meals, my recipes, meal plans, grocery items you added); without, the same CSV. Not deployed yet
- ⬜ Holt meal plans — Amendment 002 LOCKED 09-24 (`ce224fac`); not built yet
- ✅ Meal plan: Same / A few / Mix per meal, share ingredients, only my recipes, Clear week — 09-27 (`0226` applied; web + build 9 OTA `01a0e496`)
- ✅ Holt's dishes stay out of My Recipes until saved; delete a recipe — 09-27 (`0227` applied; web + build 9 OTA `01a0e4a3`)
- ✅ Barcode camera + label scan built — 09-24/25, ship in build 9 (iPhone only; hidden on build 8 + web) · ✅ PO tested both on a phone — look good 09-26
- 🔨 Photo food logging (Premium AI) — built 09-26 (`728de7fd`): the photo names the foods, the numbers come from
  food search; 1 credit (was 3; PO ran the SQL + verified 09-26), ~1¢/photo, photo not stored · ✅ 0223 applied + `meal-photo-read` deployed 09-26 ·
  ✅ eval on 10 PO photos: AI named every meal; matching fixed (`a64f96a6`, `b607ea08`), 31/35 auto-matched, none wrong ·
  ✅ LIVE 09-26: web `index-3da85f55…` + build 9 iOS `01a0deee-e96a…` (lane `5fc2400d`) · ⬜ PO tries it on a real meal ·
  ✅ PO approved model-estimated portions 09-26 (NUT-D4 exception written) · ⬜ design pass (no .dc)
- ⏳ Lift the gate — 09-25: PO decided Nutrition opens to everyone **on App Store approval**, not before.
  `supabase/apply/pending-0216.sql` is written (one function; no app update needed) — run it on ship day (§6)

## 6. Ship day
- ⬜ Nutrition access on ship day: ⛔ do NOT paste `pending-0216.sql` — `0237` (applied 09-28) replaced it and opens Nutrition to Premium accounts only. ✅ PO DECIDED 09-29 — "B": logging, foods, saved meals, barcode and targets FREE; meal planner, grocery list and building recipes PREMIUM (MA6 §4 as corrected by MA8-D8). Built `930943af`. ✅ `0244` APPLIED 09-29 — §3 `PREMIUM · 40 · 38 · 5 · true · true · true` (38 not 40: the two accounts set explicitly FREE, e.g. `purchase@test.com` — same 38/40 as 0237's §3; they now log food free but have no planner, which is B) · ✅ Edge Function `recipe-link-read` DEPLOYED 09-29 for the first time (it had never been deployed since 09-27; probe OPTIONS 200 + CORS *, no-auth POST 401) · ✅ app LIVE 09-29: web `index-3e0d9340…` + build 10 iOS `01a0ef36` · no visible change until default_tier flips to FREE. §5's two must-dos are
  both done (under-eating message ✅ 09-27, privacy policy nutrition section ✅ 09-26)
- ⬜ forgelegacy.app: swap "Get TestFlight invite" for the App Store link (site went live 09-25 as the
  Clean v2 design; TestFlight emails land in `testflight_requests`)
- ⬜ Phase F: default to Free + remove "free while testing" (4 files, see GO-LIVE)
- ⬜ Turn the AI credit limit ON: `update coach_ai_config set metering_only = false;` (09-26: still off, so nobody is ever cut off; 150 credits/mo)
- ✅ Build 9 built + uploaded to TestFlight — 09-25 (EAS `6c59b9c9`, commit `f7704585`). Watch Swift + label reader compiled first try. ⚠ Apple 401 on the stored key: the PO had to run build + submit interactively; the first EAS submit sat IN_QUEUE 1h+ and was cancelled · 🔨 PO testing on device — looking good 09-26
- 🔨 **New app icon 3a → BUILD 11** (PO 09-29): Design `App Icon.dc.html` option 3a, rendered 1024 from the handoff SVG · committed `e33f79c6` on `feat/build11` (worktree `C:/Users/isaia/forge-build11-wt`, from build 10 HEAD `030a573d`, buildNumber 11, `npm ci` done) · ✅ BUILT 09-29 (EAS `e16d49b7`) · ✅ uploaded to Apple 09-29 (EAS submission `9ddf224e` FINISHED) · ⬜ Apple processing → pick 1.0.0 (11) on the version page · ⬜ submit build 11, not 10
- ⬜ Add the 10 subscriptions for review together with the submitted build (now build 11 — PO 09-29 new icon)
- ⬜ Check Apple's agreement banner · clean tree · all gates green · submit
