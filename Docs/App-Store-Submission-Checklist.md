# App Store Submission Checklist

**This is THE checklist for submitting Forge Legacy to Apple.** Every chat works from this file.
When an item moves, update it here, in the same session, with the date. Keep it simple: one line per item.
Detail lives in `Docs/GO-LIVE.md`, `Docs/Launch-Checklist-Free-And-Premium.md` and the amendments named below.

✅ done · 🔨 in progress · ⏳ waiting on someone else · ⬜ not started

**Last updated:** 2026-09-24

## Where we are
- **Waiting on others:** Apple (bank verification) · Apple (Small Business Program)
- **PO to-do:** find a lawyer · decide if Nutrition ships in the first release · write the recipes
- **Claude to-do:** paywall code for the new plans → RevenueCat → build 9

## Pricing (Monetization Amendment 007, locked 2026-09-23)
| Who | Premium | Premium AI |
|---|---|---|
| Everyone | $14.99/mo · $119.99/yr | $19.99/mo · $169.99/yr |
| First 100 subscribers (Early Bird, while subscribed) | $12.99/mo · $99.99/yr | $16.99/mo · $144.99/yr |
| The 14 comped testers | Free forever | Add AI: $7.99/mo · $69.99/yr |

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
- ⬜ Paywall code: Early Bird prices while spots last · Tester AI shown ONLY to the 14 testers ·
  never offer a second group to someone already subscribed · remove the old $149 Founder offer
- 🔨 RevenueCat — PO signed up 09-23
  - ✅ Project + iOS app (bundle ID `com.qest4.forgelegacy`) — 09-24
  - ✅ In-App Purchase key (.p8) uploaded to RevenueCat — 09-24 (Key ID `A8T8CTT9TS`).
    ⬜ Move the .p8 from Downloads to `Forge Legacy Documents` (personal OneDrive) — NEVER in the repo
  - ⬜ Enter the Small Business Program start date in RevenueCat (App settings) once Apple approves
  - ✅ RevenueCat email confirmed — 09-24 · ⬜ rename the project to "Forge Legacy" (it reads "Create an app called Forge Legacy LLC")
  - ⬜ 10 products imported · entitlements `premium` + `coach_ai` · offerings for regular / Early Bird / Tester AI
  - ⬜ Public iOS SDK key (`appl_…`) given to Claude — never the secret `sk_…` key or the .p8
  - ⬜ Code: adapter in `src/lib/billing.ts` over `react-native-purchases` (native → build 9 only)
- ⬜ Referral reward: "1 month free" offer for a referrer who is already paying (referrer only)
- ⬜ Review screenshot on each subscription (after the paywall is updated)
- ⬜ Sandbox test: buy, force-quit, reinstall, restore

## 3. Store listing
- ✅ Description, age rating, reviewer account, support URL
- ⬜ Redo screenshots before submitting — 09-24: the current set predates recent changes and has no Nutrition
  (take them after the paywall + Nutrition decision so they show the app as it ships)
- ✅ Release set to "Manually release this version" — 09-23
- ⬜ App Privacy labels (after the paywall; add food data if Nutrition ships)

## 4. Legal
- ⬜ Lawyer reviews Terms + Privacy Policy

## 5. Nutrition (only if it ships in the first release — PO to decide)
Built and on build 8 for the PO + claudetest only (`0206` allowlist). Web preview NOT updated with it.
- ✅ Food log, Log Food, Food Detail, Create Food, Meal Detail, Details, Targets — 09-22/23
- ✅ Meal Plan Setup, Meal Plan (week), Recipe, Grocery List, My Recipes, offline logging — 09-23
  (`0207`–`0213` applied and verified; OTA `01a0d13e`)
- ✅ Food search — 09-24: real servings ("1 item"), fewer/better results + Show more, calories per serving,
  restaurant foods from FatSecret, retries USDA's random failures (OTA `01a0d4a7` + function rev 7+)
- ✅ Confirm `FDC_API_KEY` in production + FatSecret console steps (Premier Free granted 09-23 — barcode + US data unlocked) — **done 2026-09-24**: IP allowlist + secrets set, token scope `basic premier barcode`, PO saw McDonald's Big Mac with real calories as Restaurant data
- ✅ The 40 starter recipes removed — 09-24 (PO: writing their own; OTA `01a0d506`). Meal Plan now points to My Recipes
- 🔨 PO's own recipes — send them to Claude (USDA numbers + allergy tags worked out) or add in My Recipes;
  include 15-minute meals and vegan
- ⬜ Gentle message for sustained under-eating (needs PO's wording) — **must-do before opening**
- ⬜ Holt's 4 safety fixes (Coach Holt stress test, Decision Queue #36) — **must-do before opening**
- ⬜ Privacy policy nutrition section — **must-do before opening**
- 🔨 Search failure message — 09-24: a failed source now falls back to saved foods; the app still says
  "Nothing found" if the phone has no connection (should say "couldn't connect")
- ⬜ First-time welcome screen for the tab (needs a design)
- ⬜ "This looks wrong" report on a food
- ⬜ Data export includes nutrition
- ⬜ Holt meal plans — Amendment 002 written, NOT locked (PO)
- ⬜ Barcode camera + label scan → build 9 (the function side of barcode is live)
- ⬜ Photo food logging (Premium AI) — next to discuss; needs no new build
- ⬜ Open `0206` to more testers, then lift the gate

## 6. Ship day
- ⬜ Phase F: default to Free + remove "free while testing" (4 files, see GO-LIVE)
- ⬜ Build 9 (RevenueCat, mic, form check, barcode)
- ⬜ Add the 10 subscriptions for review together with build 9
- ⬜ Check Apple's agreement banner · clean tree · all gates green · submit
