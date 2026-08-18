# GO-LIVE — the short list

**v1.6 · 2026-08-17 · rewritten for brevity. Detail lives in `Docs/Launch-Checklist-Free-And-Premium.md` (v1.5) and `Forge-Legacy-Master-Status.md`. If they disagree, the checklist wins and this file is stale.**

> **⛔ v1.6 corrects the headline claim of v1.5: the bank account is NOT open, and "nothing external
> gates the public release" was wrong.** Zions emailed on 08-17 asking for the EIN letter and documents
> showing all authorized principals and titles — **the application was in verification the whole time,
> and it auto-closes 2026-08-31 if unanswered.** Answered same day. Apple's step 9b needs a *funded,
> verified* account, so an external party is back on the critical path.
>
> **The recurring failure again: this file was stale in the reassuring direction.** v1.2 caught four such
> errors, v1.5 caught the "qest4 team" that never existed, and v1.6 catches a bank account that was
> applied for rather than opened. **Re-verify before trusting any ✅ here.**

---

## Where we are

| | |
|---|---|
| **App** | iOS only. Zero Android. Testers on **build 6**, OTA-reachable |
| **Entity** | Forge Legacy LLC · Utah `14725906-0160` · EIN `42-4433633` · parent Altimealix Holdings LLC |
| **Ownership** | Isaiah → Altimealix Holdings LLC → Forge Legacy LLC. **Proven only by the operating agreement** — Utah's certificate has no member field |
| **Database** | **167 migration files · `0163` AND `0164` both applied**, confirmed against the live catalog 2026-08-17 by `preflight-0163-0165.sql`. **`0165` is unnecessary** — its four objects were verified already friends-aware, which is the only question it exists to answer. ⚠ *Two documents said `0164` was outstanding and both were stale in the "still to do" direction — the third time this project has paid for trusting a hand-written ledger.* `0144` absent by decision.<br>⛔ **`0166` and `0167` are AUTHORED, NOT APPLIED** (2026-08-17) — paste in order, each carries its own self-check block |
| **Support** | 🟡 **Built, not deployed.** `site/support.html` + in-app `/feedback` (0167). Apple requires a Support URL and rejects a bare `mailto:` — the page is written and the site has not been re-uploaded since |
| **Entitlement** | `default_tier = PREMIUM` — every cap built, nothing gates. Phase F is one UPDATE |
| **Paywall** | 🟡 Screen only. `subscription.tsx` shipped (37 KB, 23 tests). **`react-native-purchases` deliberately NOT installed** — a native module ends OTA reach to testers' build |

---

## ✅ DONE

| | Item | Date |
|---|---|---|
| 1 | **Testers have the build** — build 6, every fix since 08-15 reached them. Stage 1 closed | 08-17 |
| 2 | **Website live** at `forgelegacy.app` — Cloudflare Worker, root/`/privacy`/`/terms` all 200 | 08-16 |
| 3 | **LLC formed** — stamped Certificate of Organization, effective 08-13 02:06 PM | 08-13 |
| 4 | **EIN issued** — CP 575, `42-4433633` | 08-13 |
| 5 | **D-U-N-S issued** — `149910851`, case `10803372`, verified via company spokesperson | 08-17 |
| 6 | **Ownership settled** — CP 575's "SOLE MBR" is the SS-4 responsible party, not a rival claim | 08-17 |
| 7 | **Operating agreement executed** — manager-managed, Altimealix sole member, Isaiah Manager. **Exhibit B is the authorized-principals-and-titles page every institution asks for.** Reusable for Apple 9b and D&B | 08-17 |
| 8 | **Bank documents answered** — CP 575 + stamped certificate + operating agreement sent to Zions | 08-17 |
| 9 | **Privacy copy fixed** — in-app summary and `site/privacy.html` complete and agreeing (`cc2b5de`) | 08-15 |
| 10 | **Paywall screen built** — `subscription.tsx` to P-8, `UNAVAILABLE_BILLING` in force | 08-16 |

---

## ⛔ LEFT

**Ordered by who has to move. Start 1–3 first: they're the ones waiting on someone else.**

| | Item | Waiting on | Notes |
|---|---|---|---|
| 1 | **Bank account actually open** | Zions review | ⚠ **Closes 08-31 if they need more.** Expect a second ask for **Altimealix's** certificate + EIN letter, since an entity is the member |
| 2 | **D-U-N-S propagates** | D&B, ~24–48 h from 08-17 18:14 UTC | ⚠ **Do not enroll until it resolves in Apple's own lookup tool.** Enrolling against a missing record restarts the clock — this project has already paid that once |
| 3 | **Convert Apple membership** | Apple Support | `G722GV8H8C` **Individual → Organization**. ⚠ **One request, not two** — in the same message confirm bundle ID `com.qest4.forgelegacy`, app `6798436104`, TestFlight, EAS creds and **the APNs key** all survive. Then enroll in **Small Business Program** (15%). ⛔ Do NOT create a second Apple ID |
| 4 | **Paywall (Phase E)** | us | RevenueCat adapter · 6 SKUs · referrals · Founder counter · StoreKit sandbox (buy, force-quit, reinstall, Restore). ⚠ Native dep ⇒ **new build, not OTA**. `fingerprint:compare` first |
| 5 | **Store listing** | us | App Privacy labels **from `site/privacy.html`** · screenshots 6.9"+6.5" · description · keywords · age rating. ⚠ **Seeded reviewer account** (program, history, squad with a 2nd member, a challenge) or the social pillar reads as Guideline 2.1 incomplete.<br>**Support URL — page WRITTEN, not yet DEPLOYED.** `site/support.html` exists in the repo with the in-app half (`/feedback`, 0167) built alongside it. ⚠ **It is not live until the site is re-uploaded** — stage the now-**25** files per `site/README.md` and confirm `curl -I https://forgelegacy.app/support` → **200** before pasting the URL into App Store Connect. A 404 there is a rejection |
| 6 | **Counsel review** | lawyer | Terms + privacy, before money moves |
| 7 | **9b — Agreements, Tax & Banking** | Apple + CPA | ⚠ **A SUBMISSION GATE, not a payout chore.** IAPs cannot ship while the Paid Applications Agreement is not *in effect*. **(a)** accept it (signer must bind the entity) · **(b)** bank account, holder exactly `FORGE LEGACY LLC`, Apple verifies over days · **(c)** W-9 — ⚠ **a two-tier disregarded chain is a CPA question. Wrong here is a federal filing, not a rejected form** |
| 8 | **Diagnose the `42501` on Join** | PO (dashboard) | ✅ `0163`+`0164` applied, `0165` unnecessary — **the migrations are done.** All that remains is `diagnose-challenge-join-42501.sql` (read-only). Policy is already ruled out, so the live candidate is **data** — a device signed in as an account not named in `invited_ids`. ⛔ **Never re-paste `0059`** — it silently reverts every friends competition to unjoinable |
| 9 | **Phase F — flip to Free** | us | Strict order or the free tier is given away twice. See below |
| 10 | **Ship** | us | Gates green · `git status` clean · `fingerprint:compare` · new build · submit. ⚠ 9b must be green first |

---

## Phase F — the exact order

The SQL is in `0145`'s footer.

1. **Backfill** `athlete_usage.programs_created` from `programs` — the trigger only counts inserts since 0145, so a populated account reads 0 and gets three more.
2. **Grant the 20 OG testers** their seat-free PREMIUM row — *before* the flip.
3. `update entitlement_config set default_tier = 'FREE'`.
4. **Retire the "free while testing" claim.** Every instance becomes a false billing claim the moment step 3 runs, and **nothing on any surface will look wrong.**

⚠ **v1.5 said THREE places. It is FOUR files — `site/terms.html` was missing from the list, and it is the one making a billing promise inside a legal document.**

| File | Line | What |
|---|---|---|
| `site/terms.html` | 89 | *"free while we are testing. There is no subscription and nothing to…"* ⚠ **newly found, not in prior versions** |
| `src/domain/settings/content.ts` | 32 | *"Forge is free while we're testing… nothing to cancel."* Shown in-app to the cohort being charged |
| `src/domain/settings/__tests__/content.test.mjs` | 168 | **Asserts the claim** → Phase F **fails the test gate** until updated in the same pass |
| `site/index.html` | 172, 1205 | JSON-LD `offers.price "0"` and the "Free while we're testing" beat |

*"Free to start" (index 208, 1212) and "History is free forever" (492) stay true after Phase F — leave them.*

---

## Traps this project has actually hit

- **⚠ Publishing bundles the WORKING TREE, not the commit.** `git status` before every publish.
- **⚠ Don't trust any ledger — run `supabase/apply/preflight-*.sql`.** Re-pasting an applied migration is not free (`0141` died on `42P13`).
- **⚠ `fingerprint:compare` before every OTA.** A mismatched runtime uploads fine, reports success, reaches nobody.
- **⚠ Green gates ≠ a working app.** Four P0s in one week were invisible to `tsc`, 2,300+ tests and lint — none was *in* the code.
- **⚠ A deploy replaces hashed chunks** — anyone with the app open sees a white screen until reload. Harmless; warn testers.
- Only ever hand out **forgelegacy.expo.app** — a `--hash` URL wipes localStorage and signs people out.
- **Concurrent sessions want separate branches.**

---

## Deliberately not in scope

- **Coach AI** — no AI spend before full release. Do not apply `0144` or deploy `coach-interpret`.
- **Forge Coach CRM** — designed, approved, **not being built** (Decision Queue #23). Keep it off the landing page.
- **Android.** Say so plainly rather than implying it is coming.
