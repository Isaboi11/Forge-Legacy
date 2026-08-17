# GO-LIVE — the short list

**v1.2 · 2026-08-17 · every claim below re-verified against the repo on this date.**
**STAGE 1 IS CLOSED.** The testers have the build (PO, 08-17) and the website is live, so **D-U-N-S is the
only thing gating the public release** — everything else in Stage 2 is work that can be done during the wait.

> **v1.2 corrected four things this file asserted and the repo contradicted.** Recorded because the pattern
> is the point: *every one was stale in the "still to do" direction* — the same failure as the migration
> ledger that once listed eleven applied files as pending. **This file is written by hand and the repo is
> not. Re-verify before trusting any ⛔ in it.**
> 1. **Stage 1 step 1** said the testers had no build. They have had one for a while.
> 2. **The paywall row** said `subscription.tsx` did not exist. It shipped 2026-08-16 — 50 minutes after
>    this file was last written.
> 3. **Phase F step 10** named the landing page as the only home of the "free while testing" claim. There
>    are three, and one of them is a *test that asserts it*.
> 4. **The privacy-copy fix** (checklist §10.2) was listed as blocking the App Privacy labels. It was
>    closed by `cc2b5de` on 08-15; the in-app summary and `site/privacy.html` are complete and agree.

⚠ **This is a VIEW, not a fork.** The detail — every phase, every number, every reason — lives in
`Docs/Launch-Checklist-Free-And-Premium.md` (v1.2) and `Forge-Legacy-Master-Status.md`. This file exists
so a fresh session can pick up the thread in one read. **If the two disagree, the checklist wins and this
file is stale — fix it.**

---

## Where we actually are

| | |
|---|---|
| **App** | iOS only. Zero Android builds. Live at `forgelegacy.expo.app` (a *testing* surface, not the product) |
| **Database** | 162 migration files. **Applied through 0162** — `0155`–`0158` preflighted 15/15 on 08-13, `0159` applied 08-15, `0160`/`0161` verified by working squad create+transfer, `0162` confirmed by a route drawn on device 08-16. `0144` absent by decision. ⚠ *This line has been wrong in both directions before — run `supabase/apply/preflight-*.sql` rather than trusting it* |
| **Entitlement** | `default_tier = PREMIUM`, so **every cap is built and nothing gates**. Phase F is one UPDATE |
| **Entity** | Forge Legacy LLC · Utah · EIN 42-4433633 · parent Altimealix Holdings LLC |
| **Domain** | `forgelegacy.app` registered, Cloudflare nameservers. Email live (`isaiah@`, `support@`). ✅ **Apex + `www` resolve, HTTP 301s to HTTPS, MX untouched** |
| **Website** | ✅ **LIVE at `forgelegacy.app`** — deployed 2026-08-16 as a **Cloudflare Worker with static assets** named `forgelegacy` (*not* Pages; the dashboard steers new projects to Workers now). Root / `/privacy` / `/terms` all 200. Redeploy = drag `site/`'s deployable files into the project's upload flow, minus `_exported-bundle.html` |
| **D-U-N-S** | Requested 2026-08-13 · D&B case **10803372** · documents answered 2026-08-15 · **pending** |
| **Apple** | App `6798436104` on team `G722GV8H8C` (qest4). The public release ships under a **new Forge Legacy LLC org account** |
| **Paywall** | 🟡 **Screen built, store not.** `src/app/subscription.tsx` shipped 2026-08-16 (37 KB, 23 tests, written against `BillingAdapter`; `UNAVAILABLE_BILLING` in force so it states the truth rather than faking a price). **`react-native-purchases` is deliberately NOT installed** — it is a native module, and the moment it lands every OTA to the build in testers' hands stops being deliverable. Still owed: the adapter, 6 SKUs, referrals, the Founder counter, StoreKit sandbox (§4.2–4.6). ⚠ *This row read "Not built · no `subscription.tsx`" in v1.1 — written 50 minutes before the file landed* |

---

## STAGE 1 — testers ✅ CLOSED

**1. ✅ DONE — the testers have the build, and have had it for a while (PO, 2026-08-17).** This item read
⛔ through v1.1 and was **wrong**; distribution had already happened. Corrected rather than deleted,
because the board being wrong in the "still to do" direction is the same failure as the migration ledger.

✅ **And they are on build 6** (PO, 2026-08-17) — the runtime every OTA since 08-15 has been published
against (`411fd2b6…`, commit `aaee846c`). **So the testers are current**: the units fix, the white screen,
the squads outage, the chapter dead end and both cardio fixes have all reached them. This was worth
asking rather than assuming — an OTA only lands on a device whose runtime matches, so had they been on
build 4 or 5 they would have received *nothing* since, and no OTA could have repaired it.

**What this buys, and it is the useful part: the tester cohort is OTA-reachable.** Any JS-only fix ships
to them in minutes. That holds until a native module is added — which is exactly why §4.2's RevenueCat
install is now a decision with a cost rather than a routine step.

**2. ✅ DONE 2026-08-16 — the website is live.** Cloudflare **Worker + static assets**, project `forgelegacy`,
custom domains `forgelegacy.app` (apex) and `www.forgelegacy.app`, **Always Use HTTPS** on.
Verified from outside: root **200** · `/privacy` **200** · `/terms` **200** · `www` **200** · HTTP **301 → HTTPS** ·
MX records intact, so `isaiah@` and `support@` are unaffected.
⚠ **`_exported-bundle.html` (4 MB) was deliberately excluded** and returns **404** — do not let a future
redeploy sweep the whole `site/` directory in, or that file becomes a public, indexable page.
⚠ **SSL/TLS mode is `Full`, and that is correct here** — the origin *is* the Worker, so there is no
Cloudflare-to-origin hop for `Full (strict)` to protect. Do not "fix" it.

---

## STAGE 2 — public launch

**3. ⏳ D-U-N-S clears** (waiting on D&B). ⚠ **Answer the phone** — an unreturned call verifying business
type and employee count is what stalls a case.

**4. Enroll Forge Legacy LLC** in the Apple Developer Program.
✅ **Both prerequisites are now met**: a live, functional website on the org's own domain (step 2,
done 2026-08-16) and a work email at that domain. **D-U-N-S is the only thing still gating this.**
Then enroll in the **Small Business Program** (15% not 30%) — per entity, before revenue.

**5. ⚠ Settle the bundle identifier BEFORE building under the new team.** `com.qest4.forgelegacy` belongs
to `G722GV8H8C` and bundle IDs are globally unique. Three shapes, none free — release-and-re-register,
a new ID (a *different app* to iOS; installs sit alongside), or an Apple app transfer (needs a prior
public release). **Confirm with Apple, don't assume.** Whichever wins: re-check the `forgelegacy` scheme
and the Supabase redirect allow-list, and **re-upload the APNs key — push stops silently under a new team**.

**6. Build the paywall (Phase E).** `subscription.tsx` to P-8 · RevenueCat · 6 SKUs · StoreKit sandbox
(buy, force-quit, reinstall, Restore Purchases, confirm both entitlements return).
⚠ **New native dependency ⇒ a new build, not an OTA.** `fingerprint:compare` first.

**7. Store listing.** App Privacy labels **from `site/privacy.html`** — location, health, photos/video and
usage analytics are all declared there and the label must match. Screenshots (6.9" + 6.5"), description,
keywords, age rating, category, support URL.
⚠ **A seeded reviewer account** with a running program, logged history, a squad with a second member and
a challenge — the social pillar is unreviewable from an empty account and reads as Guideline 2.1.

**8. Counsel review** of terms and privacy. Before money changes hands.

**9. Business bank account** — Apple pays into an account in the entity's name.

**10. ⚠ Phase F — flip entitlement to Free, in this order or the free tier is given away twice.**
The SQL is in `0145`'s footer.
&nbsp;&nbsp;**(a)** backfill `athlete_usage.programs_created` from `programs` — the trigger only counts
inserts made since 0145, so a populated account reads 0 and gets three more.
&nbsp;&nbsp;**(b)** grant the 20 OG testers their seat-free PREMIUM row — *before* the flip, not after.
&nbsp;&nbsp;**(c)** then `update entitlement_config set default_tier = 'FREE'`.
&nbsp;&nbsp;**(d) ⚠ Retire the "free while testing" claim in all THREE places it lives.** Every one becomes a
false billing claim the instant (c) runs, and **nothing on any surface will look wrong** — this is a
grep, not a review:
&nbsp;&nbsp;&nbsp;&nbsp;• `site/index.html` — the copy **and** the JSON-LD `offers: price "0"` (3 hits).
&nbsp;&nbsp;&nbsp;&nbsp;• `src/domain/settings/content.ts:30,32` — *"Forge is free while we're testing. There
is no subscription, no billing, and nothing to cancel."* Shown in-app, to the exact cohort being charged.
&nbsp;&nbsp;&nbsp;&nbsp;• `src/domain/settings/__tests__/content.test.mjs:168` — **asserts the claim**
(`assert.match(text, /free while we're testing/i)`). So Phase F **fails the test gate** until this is
updated in the same pass. That is the gate working: the same test file already bans `renews yearly`,
`cancel at any time` and `Founder` because shipped comp copy once made all three claims falsely.
⚠ *v1.1 of this step named the landing page only, and would have shipped an in-app page telling paying
athletes there was nothing to cancel.*

**11. Ship.** Gates green · `git status` clean · `fingerprint:compare` · new build · submit.

---

## Traps this project has actually hit

- **⚠ Publishing bundles the WORKING TREE, not the commit.** `git status` before every publish. Another
  session's uncommitted work has shipped to a phone.
- **⚠ Don't trust any ledger — run `supabase/apply/preflight-*.sql`.** Read-only, one minute. Three
  separate documents once listed migrations as pending that were already applied. **Re-pasting an applied
  migration is not free** (`0141` died on `42P13`).
- **⚠ `fingerprint:compare` before every OTA.** An update against a mismatched runtime uploads fine,
  reports success, and reaches nobody. Testers on an older build get *nothing*.
- **⚠ Green gates ≠ a working app.** Four P0s in one week were invisible to `tsc`, 2,300+ tests and lint,
  because none of them was *in* the code: a runtime the bundler doesn't verify, a database privilege, a
  locked spec nobody built, and a display-unit bug.
- **⚠ A deploy replaces hashed chunks**, so anyone with the app open sees a white screen until they
  reload. Harmless; tell testers.
- Only ever hand out **forgelegacy.expo.app** — a throwaway `--hash` URL wipes localStorage and signs
  people out.
- **Concurrent sessions want separate branches.** Several collisions so far.

---

## Deliberately not in scope

- **Coach AI** — no AI spend before full release. **Do not apply `0144`** or deploy `coach-interpret`.
- **Forge Coach CRM** (the human-trainer desktop product) — designed, approved, **not being built**.
  Decision Queue #23. Keep it off the landing page.
- **Android.** Say so plainly rather than implying it is coming.
