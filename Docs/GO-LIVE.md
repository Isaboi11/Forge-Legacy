# GO-LIVE — the short list

**v1.1 · 2026-08-16 · verified against the repo and the live domain on that date.**
**The website is live** — `forgelegacy.app` deployed this date, which clears the Apple enrollment gate. See Stage 1 step 2.

⚠ **This is a VIEW, not a fork.** The detail — every phase, every number, every reason — lives in
`Docs/Launch-Checklist-Free-And-Premium.md` (v1.1) and `Forge-Legacy-Master-Status.md`. This file exists
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
| **Paywall** | ⛔ **Not built.** No `subscription.tsx`, no billing SDK in `package.json`, no SKUs |

---

## STAGE 1 — testers (nothing blocks this)

**1. ⛔ Send the build to the 20 testers.** *Longest-outstanding item, ~10 minutes, and waiting costs
something every day.* They are on an old build and **cannot receive any OTA** — the units fix, the white
screen, the squads outage and the chapter dead end have all reached nobody.
App Store Connect → TestFlight → **Test Information** (required) → **External Testing** group → add
emails → attach the newest build → Beta App Review (usually < 1 day).

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
Also swap the landing page's "Free while we're testing" and its JSON-LD `offers: price "0"` — both become
false claims at this moment and **nothing on the page will look wrong**.

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
