# App Store Submission Checklist

**This is THE checklist for submitting Forge Legacy to Apple.** Every chat works from this file.
When an item moves, update it here, in the same session, with the date. Keep it simple: one line per item.
Detail lives in `Docs/GO-LIVE.md`, `Docs/Launch-Checklist-Free-And-Premium.md` and the amendments named below.

✅ done · 🔨 in progress · ⏳ waiting on someone else · ⬜ not started

**Last updated:** 2026-09-25

## Where we are
- **Waiting on others:** Apple (bank verification) · Apple (Small Business Program)
- **PO to-do:** find a lawyer · ~~decide if Nutrition ships~~ (09-25: yes, opens on approval) · write the recipes ·
  RevenueCat tidy-up (rename the project, delete `$rc_*` packages, delete `REVENUE_WEBHOOK_AUTH`) — PO running it with Claude in Chrome 09-25
- **Claude to-do:** build 9 (paywall, mic, form check, barcode) → sandbox purchase test

## Pricing (Monetization Amendment 007, locked 2026-09-23)
| Who | Premium | Premium AI |
|---|---|---|
| Everyone | $14.99/mo · $119.99/yr | $19.99/mo · $169.99/yr |
| First 100 subscribers (Early Bird, while subscribed) | $12.99/mo · $99.99/yr | $16.99/mo · $144.99/yr |
| The comped testers (11 + review account `alex.review`) | Free forever | Add AI: $7.99/mo · $69.99/yr |

Free plan stays $0. 7-day free trial on **yearly plans only**; cancel within 7 days = never charged.
No lifetime plan. United States only at launch.

---

## 1. Apple account
- ✅ Account is Forge Legacy LLC (Organization) — 09-23
- 🔨 Agreements, Tax & Banking
  - ✅ Paid Apps agreement accepted — 09-23 (reads "Pending User Info" until bank + tax are in)
  - ✅ Bank account entered — 09-24 (Zions business account; holder `FORGE LEGACY LLC`, Business type).
    Apple verifies it over a few days
  - ✅ Tax form (W-9) submitted — 09-24 (line 1 "Forge Legacy LLC"; LLC – Disregarded Entity; Non-Exempt Payee).
    Worth a one-line CPA confirmation of the TIN choice (two-tier chain via Altimealix)
  - ⬜ Agreement reads **Active** (if still "Pending User Info" after bank + tax, ask Apple on the existing thread)
- ✅ EU trader declaration — Trader, on the account and the app — 09-23
- ⏳ Small Business Program (30% → 15%) — applied 09-23, waiting on Apple
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
    (⬜ delete the misspelled leftover secret `REVENUE_WEBHOOK_AUTH`; nothing uses it)
  - ✅ RevenueCat webhook "Supabase entitlement" → that function — 09-24; test event returned 200 `{"outcome":"ignored"}`
  - ✅ PO 09-24: `alex.review` also sees Tester AI, so Apple can review that product (12 comped accounts: 11 testers + alex.review; `poop` was deleted)
- ✅ RevenueCat set up — 09-24 (tidy-up items below still open)
  - ✅ Project + iOS app (bundle ID `com.qest4.forgelegacy`) — 09-24
  - ✅ In-App Purchase key (.p8) uploaded to RevenueCat — 09-24 (Key ID `A8T8CTT9TS`).
    ✅ .p8 moved to `OneDrive\Desktop\Forge Legacy Documents` (personal OneDrive) — 09-24. NEVER in the repo
  - ⬜ Enter the Small Business Program start date in RevenueCat (App settings) once Apple approves
  - ✅ RevenueCat email confirmed — 09-24 · ⬜ rename the project to "Forge Legacy" (it reads "Create an app called Forge Legacy LLC")
  - ✅ 10 products added by hand · entitlements `premium` (8) + `coach_ai` (6) · offerings `default` (Current) / `early_bird` / `tester_ai` — 09-24 (Claude in Chrome)
  - ⬜ Delete the leftover `$rc_monthly` / `$rc_annual` packages in `default` (Test Store only; the app ignores them)
  - ⬜ Optional: App Store Connect API key in RevenueCat, so it can check the product IDs against Apple
  - ✅ Public iOS SDK key (`appl_…`) given to Claude — 09-24 (in `src/lib/billing-store.native.ts`)
  - ✅ Code: adapter over `react-native-purchases` 10.10.2 — 09-24 (`src/lib/billing-store.native.ts`; native → build 9 only)
- ⬜ Referral reward: "1 month free" offer for a referrer who is already paying (referrer only)
- ⬜ Review screenshot on each subscription: one paywall screenshot from build 9 uploaded to each product's
  "Review Information" box (Apple-only, never shown on the store). Premium tab for Premium/Early Bird, AI tab for AI/Tester AI
- ⬜ Sandbox test on build 9: buy, force-quit, reinstall, restore — then check `store_events` shows `applied`

## 3. Store listing
- ✅ Description, age rating, reviewer account, support URL
- ✅ Redo screenshots before submitting — 09-25: PO uploaded the new set
- ✅ Release set to "Manually release this version" — 09-23
- ⬜ App Privacy labels (after the paywall; add food data + "Other User Content" for community foods before Nutrition opens)

## 4. Legal
- 🔨 Mock review done 09-25 (`Docs/Legal/Mock-Legal-Review-2026-09-25.md`): policy + Terms FAIL as is — false 200 m
  route trim, Anthropic gets photos/video frames, missing providers, Terms say "no subscription"; Washington
  My Health My Data Act needs a consent step. ⬜ Claude applies the text fixes · ⬜ Lawyer reviews Terms + Privacy Policy
- ⬜ Terms + Privacy links on the paywall (Apple 3.1.2) and in the App Store description

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
  ✅ web 09-25 `index-583836d8…` (from `deploy/care-line`, before the unapplied Holt work) · ✅ build 9 OTA 09-25, now inside the combined iOS `01a0daaa-8db8…` (lane `ota/build9-js` `97b4344e`; an update from the old `ota/build9` rolled it off for ~25 min) · ⬜ PO sees it — **must-do before opening**
- ✅ Holt's 4 safety fixes (Coach Holt stress test, Decision Queue #36) — fixed 09-21 (`d7ce6dde`), on build 8.
  Re-verified 09-24: 0 limitation breaks in 1,800 programs + 5,760 days + 480 race plans (controls fire);
  edits land on the right day in all 127 rest-day patterns (5,888 edits; the old code fails 6,404)
- 🔨 Privacy policy nutrition section — draft fixed per the mock review 09-25 — **must-do before opening**
- ✅ Search failure message — 09-24: a failed source falls back to saved foods, and with no connection the
  app now says "Couldn't connect to food search" with Try again (Log Food + the meal editor). Not deployed yet
- ✅ First-time welcome screen for the tab — built 09-24 (`eefe43dd`), on web; not yet seen by the PO
- ⬜ "This looks wrong" report on a food
- 🔨 Community foods (Amendment 004) — 09-25: a missed barcode becomes everyone's; `0219` applied, food-search redeployed, on build 9 OTA · ⬜ first share seen on a device
- ✅ Scan a recipe from a screenshot into My Recipes — 09-25 (`487dc325`, `0220`)
- ✅ Data export includes nutrition — 09-24: with food data, Export My Data gives one .zip (workouts.csv +
  food log, targets, my foods, my meals, my recipes, meal plans, grocery items you added); without, the same CSV. Not deployed yet
- ⬜ Holt meal plans — Amendment 002 LOCKED 09-24 (`ce224fac`); not built yet
- ✅ Barcode camera + label scan built — 09-24/25, ship in build 9 (iPhone only; hidden on build 8 + web) · ⬜ test both on a phone
- ⬜ Photo food logging (Premium AI) — next to discuss; needs no new build
- ⏳ Lift the gate — 09-25: PO decided Nutrition opens to everyone **on App Store approval**, not before.
  `supabase/apply/pending-0216.sql` is written (one function; no app update needed) — run it on ship day (§6)

## 6. Ship day
- ⬜ Open Nutrition to everyone: paste `supabase/apply/pending-0216.sql` (09-25). First clear §5's two
  "must-do before opening" items (under-eating message, privacy policy nutrition section)
- ⬜ forgelegacy.app: swap "Get TestFlight invite" for the App Store link (site went live 09-25 as the
  Clean v2 design; TestFlight emails land in `testflight_requests`)
- ⬜ Phase F: default to Free + remove "free while testing" (4 files, see GO-LIVE)
- ✅ Build 9 built + uploaded to TestFlight — 09-25 (EAS `6c59b9c9`, commit `f7704585`). Watch Swift + label reader compiled first try. ⚠ Apple 401 on the stored key: the PO had to run build + submit interactively; the first EAS submit sat IN_QUEUE 1h+ and was cancelled · ⬜ test on device
- ⬜ Add the 10 subscriptions for review together with build 9
- ⬜ Check Apple's agreement banner · clean tree · all gates green · submit
