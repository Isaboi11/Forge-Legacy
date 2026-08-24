# GO-LIVE — the short list

**v1.11 · 2026-08-24. Detail lives in `Docs/Launch-Checklist-Free-And-Premium.md` (v1.5) and `Forge-Legacy-Master-Status.md`. If they disagree, the checklist wins and this file is stale.**

> **⛔ v1.11 — TWO SUBMISSION BLOCKERS FOUND IN THE CONSOLE THAT WERE ON NO DOCUMENT, AND THE DEMO
> ACCOUNT WOULD HAVE FAILED TO SIGN IN (2026-08-24).** All three were invisible from the repo and were
> found only by opening App Store Connect and reading it. **This file has never had a "go look at the
> console" step; it does now.**
>
> **(a) ✅ CLOSED — the Apple Developer Program License Agreement had been updated and was UNACCEPTED.**
> The banner said it plainly: *"In order to update your existing apps and submit new apps, the Account
> Holder must review and accept the updated agreement."* **Submission was blocked and nothing in the repo,
> the checklist or this file could have told us.** Accepted by the PO the same day. ⚠ **Apple revises this
> agreement without notice and it silently re-blocks submission — check the banner before every submit.**
>
> **(b) ⛔ OPEN — THE APP IS DECLARED A `NON-TRADER` UNDER THE EU DIGITAL SERVICES ACT, AND IT IS A
> TRADER.** App Information reads *"This developer has identified itself as a non-trader for this app."*
> Forge Legacy LLC is an LLC about to sell subscriptions, which is a trader by definition. **Apple removes
> apps from the entire EU storefront over an unresolved trader declaration**, and the fix is not instant —
> Apple *verifies* the details, and **the business name and address it verifies are published on the
> public App Store listing.** ⚠ **THE ADDRESS ON FILE IS THE PO'S HOME** (`3832 E Cunninghill Dr, Eagle
> Mountain` — visible on the Agreements page, which still reads *Isaiah Altamirano* because the
> conversion has not landed). **Decide the address BEFORE filling the form** — a mailbox or the registered
> agent, not the house. Fix it with, or before, the paywall; it is a legal declaration, so it belongs in
> the §5 counsel review rather than being answered from a settings screen.
>
> **(c) ✅ CLOSED — the demo account in App Review Information was `review@forgelegacy.app`, AN ADDRESS
> THAT DOES NOT EXIST.** `site/README.md` records that only `support@` and `isaiah@` route in Cloudflare
> Email Routing; `review@` and `demo.sam@` appear in exactly one file — the reviewer notes — and were
> never created. The seed was actually run with Gmail plus-addresses. **The console had the wrong one
> typed in, so the reviewer would have failed to sign in — a "could not sign in" rejection, invisible from
> our side.** Corrected to `isaiahaltamirano11+review@gmail.com` and **verified by actually signing in on
> forgelegacy.expo.app**, which is the only test that proves it. The password was already in the field —
> the *"demo-account password still open"* item on item 4 was stale. ✅ **The seeded content was checked in
> the same session and is intact**: program on Home, a chapter in Legacy, a squad with a second member and
> a feed post, a live challenge — Guideline 2.1 completeness is satisfied, observed rather than assumed.
>
> ⚠ **THE PATTERN, SINCE IT IS THE THIRD TIME:** every one of these was a fact about a *console* that no
> file in this repo mirrors. `review@forgelegacy.app` was written down as an intention and then never
> created, and every document downstream repeated it as fact for five days. **A value this project has
> only ever written down is not a value it has verified.**

> **✅ v1.10 — `0172` AND `0173` ARE APPLIED, AND `0169` IS NOW FULLY LIVE (2026-08-20).** Pasted as one
> bundle (`supabase/apply/pending-0172-0173.sql`). §3 returned **every one of the six predicted numbers**:
> total 46 · both 13 · handle 33 · name 0 · added_here 37 · **existing_profiles_now_failing 0**. Because the
> editor runs the file in one implicit transaction, a result row at all proves both halves' assertions
> passed. **The deploy blocker is gone.**
>
> ⚠ **AND THE 0169 CLIENT HALF HAD ALREADY SHIPPED — IT WENT OUT IN THE 08-20 PODIUM DEPLOY, BEFORE `0172`
> WAS APPLIED.** `expo export` bundles the WORKING TREE, and `src/data/coach-profile-live.ts` (selecting
> `experience, training_goals, environment, home_gym_equipment`) was already committed in it. So the web
> deploy `entry-83197669…` and OTA `01a02139…` carried the read that `0172` exists to make legal, into a
> database where it was still illegal. **The window is closed** — `0172` is applied and the client is
> deployed, so `0169` is now applied AND deployed, which is further along than any row here claimed.
> **Impact during the window was degradation, not breakage:** `fetchCoachProfile` resolves a `42501` to
> `EMPTY_COACH_PROFILE` by design ("fails to *ask everything*, never to a default"), so Holt re-asked the
> experience question — the pre-0169 behaviour. **The lesson is the deploy, not the code:** this file said
> *"Apply this BEFORE deploying"* and the deploy happened anyway, because the pass being shipped was about
> a different screen entirely. **A tree-wide publish ships every undeployed client half in the tree**, so
> check for pending migrations before publishing ANYTHING, not just before publishing their own feature.
>
> ⏳ **Still unseen in the app.** Neither the blocklist nor Holt's skipped questions has been observed by a
> human. Applied + deployed is two of the three.

> **✅ v1.9 — TWO LISTING ITEMS CLOSE, AND THIS FILE WAS STALE IN THE *PESSIMISTIC* DIRECTION FOR ONCE (2026-08-20).**
> **(a) ✅ The age rating is answered AND ENTERED IN APP STORE CONNECT: `13+`, `16+` in Australia.** ⚠ **The
> Step 1 trap, hit on the first attempt: "Social Media Disabled for Users Under 13" is its own row, it sits
> BELOW THE FOLD, and it must be `No`** — it declares that the app calls Apple's **Declared Age Range API**,
> which Forge does not. Setting it to Yes makes Step 7 refuse to save and demands Age Assurance = Yes, which
> would be a second false declaration. Step 1 in full is written out in §6b's click-path.
> ⚠ **The questionnaire had changed** — Apple
> replaced it in 2025, **12+ and 17+ no longer exist**, and it is now split into In-App Controls ·
> Capabilities · Content Descriptors. Question-by-question sheet in `Docs/App-Store-Listing-Copy.md` **§6b**.
> ⚠ **From September 2026 the Social Media questions are required to submit at all**, and we submit inside
> that window. **(b) `0173` seeds the filter word list `0171` left owed** — 37 patterns plus eighteen
> documented exclusions (the match is a *substring*: `rapist` is inside `therapist`, `pedo` is inside
> `pedometer`). ⏳ **Authored, NOT applied — paste `supabase/apply/pending-0173.sql`.** No deploy needed.
>
> **Two rows below were wrong and are corrected here:** item 4b said the Guideline 1.2 client half was **not
> deployed** — it went out 08-19 (web `entry-69d5be42…`, OTA `01a01bda…` on build 6's runtime) — and the
> checklist's §10.4 Support URL is still unticked though `forgelegacy.app/support` has returned 200 since
> 08-18. **Being stale in the safe direction is still stale**; re-verify before trusting any mark here.
>
> ⛔ **NEW AND UNRECORDED: `0172` IS IN THE TREE, HAS A PASTE BUNDLE, AND APPEARS ON NO DOCUMENT.** It
> shipped inside commit `731e2dd` with the moderation work and is presumed **unapplied**. It re-applies the
> per-column grants `0169` skipped; until it runs, deploying `0169`'s client half raises **42501 on every
> read of `profiles`** — and the symptom is *"Holt still asks me my experience"*, indistinguishable from the
> bug `0169` was written to fix. **Paste `pending-0172.sql` before `pending-0173.sql`.**

> **▶ v1.8 — THE CONVERSION REQUEST IS FILED (2026-08-19).** Apple's D-U-N-S lookup resolved
> `FORGE LEGACY LLC` and mailed the number, so the gate on item 2 opened and the request went in the
> same day: **Apple Developer Support case `20000141921728`**, Contact Us → Membership and Account →
> Program Enrollment, asking to convert `G722GV8H8C` Individual → Organization and to confirm in
> advance that the bundle ID, app `6798436104`, TestFlight and its testers, signing certificates and
> the APNs key all survive. ⏳ **FILED, NOT GRANTED — days, not hours.** Expect Apple to ask for proof
> of authority to bind the LLC; the stamped certificate and the operating agreement's **Exhibit B** are
> staged for it. ⛔ **If a rep proposes release-and-re-register or a new bundle ID, do not agree on the
> call** — those are the fallbacks in item 2's footnote and both cost TestFlight and the existing
> testers. Two items remain inside item 2 after the conversion lands: verifying the five carry-overs in
> writing, and **enrolling in the App Store Small Business Program (30% → 15%), which is a separate
> opt-in and does not happen automatically.**

> **✅ v1.7 — THE BANK ACCOUNT IS OPEN (PO, 2026-08-18).** The 08-17 document answer cleared Zions'
> verification; the anticipated second round on Altimealix never came, and the 08-31 auto-close is moot.
> **The only external party left on the critical path is Apple** — and the D-U-N-S it needs is already
> issued. ⚠ **"No word from D&B" is the expected state**: D&B sends no completion email, so the only
> test is Apple's own D-U-N-S lookup tool. Check the lookup, don't wait for a message.
>
> ⚠ **This does not make 9b actionable yet.** Agreements, Tax & Banking is entered inside an
> *organization* App Store Connect account, which does not exist until the membership conversion
> (item 2) goes through. What the open account unblocks *today* is the CPA question on the W-9 and
> having the routing numbers ready, so Apple's multi-day bank verification is not the last thing.

> **⛔ v1.6 corrected the headline claim of v1.5: the bank account is NOT open, and "nothing external
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
| **Database** | ✅ **176 migration files, and the ONLY unapplied one is `0174`, which is unapplied ON PURPOSE (2026-08-21).** `0175` (running-program edit guard) and `0176` (client error reports) were both applied and **verified by data, not by this ledger**: `0175` → `guard_installed 1 · active_programs 8 · active_without_schedule 0` (that last zero matters — a non-zero would have been a pre-existing bug where a running program can never graduate at all), `0176` → `prune_job 1 · writer 1 · tbl 1`, which is how we know the 90-day retention the privacy policy now promises **in writing** is actually scheduled. ⛔ **`0174` stays unapplied while AI spend is out of scope** — it is the credit weight for `photo_import`, and its feature's button is now hidden behind `PHOTO_IMPORT_ENABLED` rather than left failing on every tap. Apply it only together with deploying `program-photo-read`. *(This row read "173 files, TWO unapplied: `0172` and `0173`" — both were applied 2026-08-20, so it was stale in the "still to do" direction, which is this file's documented failure mode in BOTH directions now.)* *(Count corrected 2026-08-20; the row below said 167 and named the wrong high-water mark.)*<br>**`0163` AND `0164` both applied**, confirmed against the live catalog 2026-08-17 by `preflight-0163-0165.sql`. **`0165` is unnecessary** — its four objects were verified already friends-aware, which is the only question it exists to answer. ⚠ *Two documents said `0164` was outstanding and both were stale in the "still to do" direction — the third time this project has paid for trusting a hand-written ledger.* `0144` absent by decision.<br>⚠ **This row's "`0166` and `0167` are AUTHORED, NOT APPLIED" was stale within a day and is corrected here: the tree now carries `0166`–`0169`, and the Master Status records `0166`/`0167` applied and verified 08-18, `0168` applied 08-19 and `0169` applied 08-19.** Recorded from the board, **not** re-verified against the live catalog in this pass — run `supabase/apply/preflight-*.sql` before trusting it, which is the standing rule this row keeps proving |
| **Support** | ✅ **LIVE 08-18** — `https://forgelegacy.app/support` returns **200**, verified from outside. Apple requires a Support URL and rejects a bare `mailto:`. ⏳ The in-app half (`/feedback`) still needs `0167` applied |
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
| 11 | **Business checking OPEN** — Zions Business Launch, exact legal name `FORGE LEGACY LLC`. The 08-17 document request (CP 575 + stamped certificate + operating agreement) satisfied verification; **no second round on Altimealix was needed**, and the 08-31 auto-close no longer applies. ⏳ Routing + account numbers still to come with the welcome packet | 08-18 |
| 12 | **Apple Developer Program License Agreement accepted** — it had been silently updated and was **blocking all new submissions** (*"the Account Holder must review and accept"*). Found only by opening the console. ⚠ **Apple revises it without notice; check the banner before every submit** | 08-24 |
| 13 | **Demo account fixed and PROVEN** — App Review Information held `review@forgelegacy.app`, an address that never existed, which would have been a "could not sign in" rejection. Now `isaiahaltamirano11+review@gmail.com`, **verified by signing in on forgelegacy.expo.app**. Password was already in the field. Seeded content re-checked live: program · chapter · squad with a 2nd member and a feed post · live challenge — Guideline 2.1 satisfied by observation | 08-24 |

---

## ⛔ LEFT

**Ordered by who has to move. Start 1–2 first: they're the ones waiting on someone else.**

| | Item | Waiting on | Notes |
|---|---|---|---|
| 1 | ~~**D-U-N-S propagates**~~ ✅ **RESOLVED 08-19** | ✅ nothing | Apple's own D-U-N-S lookup found `FORGE LEGACY LLC` at the Eagle Mountain address and mailed the number, which is the only test that was ever available — **D&B sends no completion notice, so "no word from D&B" was the expected state throughout and never indicated a stall.** Requested 08-17 18:14 UTC, queryable inside 48 h. This is what unblocked item 2, filed the same day |
| 2 | **Convert Apple membership** — ⏳ **FILED 08-19, case `20000141921728`** | Apple Support | `G722GV8H8C` **Individual → Organization**. ⚠ **One request, not two** — the filed message confirms bundle ID `com.qest4.forgelegacy`, app `6798436104`, TestFlight, EAS creds and **the APNs key** all survive. ⚠ **Follow up on the case, never re-file** — a duplicate case slows it down. Proof of authority to bind the LLC will be asked for: stamped certificate + operating agreement **Exhibit B**. **Still open after the conversion lands: enroll in the Small Business Program (15%) — a separate opt-in.** ⛔ Do NOT create a second Apple ID |
| 3 | **Paywall (Phase E)** | us | ⚠ **FURTHER ALONG THAN THIS ROW READ.** ✅ 4.1 paywall screen · ✅ 4.5 Founder counter (`founder_seats_remaining()` + the seat line) · ✅ **4.4 referrals — client half built, `0170` applied 08-19**, the grant itself waiting on the webhook. **Left: the RevenueCat adapter (4.2) · 6 SKUs in App Store Connect (4.3) · StoreKit sandbox (4.6)** — buy, force-quit, reinstall, Restore. ⚠ Native dep ⇒ **new build, not OTA**, and it ends OTA reach to testers' build 6 the moment it lands in the working tree — so add it *after* the conversion, which is also when sandbox testing first becomes possible. `fingerprint:compare` first |
| 4 | **Store listing** — ✅ **ENTERED 2026-08-21** | us (App Privacy still pending) | ~~screenshots~~ · ~~description~~ · ~~keywords~~ · ~~age rating~~ · ~~subtitle~~ · ~~category~~ · ~~support/marketing URL~~ · ~~copyright~~ · ~~reviewer notes + demo account~~ — **all typed into App Store Connect on 2026-08-21.** ⚠ **THE APP STORE NAME IS `Forge Legacy Training`, NOT `Forge Legacy` — the bare name was ALREADY TAKEN.** The home-screen name is unaffected (`app.json` still says `Forge Legacy`), and `Training` was chosen over `Fitness` because the Health & Fitness category already supplies `fitness` to search while `training` was unindexed. ⚠ **The listing had auto-generated as `Forge Legacy (567da6)`** — that suffix would have been the public name. ⚠ **SCREENSHOTS: TWO SEPARATE THINGS BLOCKED THE UPLOAD, AND THE FIRST DIAGNOSIS WAS WRONG.** (a) All eight were **RGBA**, and Apple rejects any alpha channel — real, but not what the error meant; every pixel was fully opaque, so flattening to RGB was **verified lossless byte-for-byte** and the RGBA originals are kept in `final-RGBA-backup/`. (b) The actual cause: they were being dropped into the **6.5" box** (max 1284 × 2778) when 1320 × 2868 is a **6.9"** size — the 6.9" box is reached via **View All Sizes in Media Manager**. Fill 6.9" only; Apple scales the rest. ⏳ **STILL OPEN ON THIS ROW:** the **App Privacy labels** (deliberately — see §10.3, they cannot be signed until the paywall build is decided), the **demo-account password**, switching release to **Manually release this version**, and ⛔ **confirming `review@forgelegacy.app` is a CONFIRMED address** — a reviewer cannot click a confirmation link, and this fails invisibly from our side.<br>✅ **AGE RATING ANSWERED AND ENTERED IN APP STORE CONNECT 2026-08-20 — `13+`, `16+` in Australia.** Sheet in `Docs/App-Store-Listing-Copy.md` **§6b**, question by question with Apple's definitions quoted. ⚠ **The questionnaire is not the one this project was written against** — Apple replaced it in 2025 (**12+ and 17+ are gone**; it is now In-App Controls · Capabilities · Content Descriptors), so **do not answer it from memory or from an older draft.** The rating is driven twice over — *Social Media = Present* and *Contests = Frequent* — so it survives a reviewer disagreeing with either. ⛔ **One answer is conditional: *Medical or Treatment Information = None* holds only while `limitations.ts` stays a mechanical exclusion map.** If coaching copy ever advises on an injury, the rating becomes 16+. ⚠ **From September 2026 the Social Media questions are required to submit at all.**<br>✅ **SCREENSHOTS DONE 2026-08-19 — eight at 6.9" (1320 × 2868)**, shot on an iPhone 16 Pro Max (its native size **is** an accepted 6.9", so nothing was scaled) and framed onto caption bands. Raws in `…/OneDrive/ForgeLegacy-AppStore/raw`, finals in `…/final/01–08.png`. Running order, captions and rationale live in **`Docs/App-Store-Listing-Copy.md` §8**. Every frame is cropped below the status bar, which is what removes a third-party media pill on four captures and 02's pinned red **Delete Program**. The two social frames are the **reviewer demo account by decision** — real testers' handles in a store screenshot are public forever. ✅ **05 (rank) — RECAPTIONED 2026-08-20, file replaced, all eight frames are final.** The old band *"Earned once. Yours for good."* was a rank pillar illustrated by a rank that had not moved, and **PO: *"I don't have enough to screenshot the other ranks"*** — so a reshoot was never available. The band now reads **"Everyone starts at zero."**: same capture, empty rank becomes the point. Old file kept as `05-SUPERSEDED-earned-once.png` **one folder above `final/`**, so the upload set stays exactly eight. ⭐ **If you ever re-cut a band: the frames are set in GEORGIA, not Playfair** — the framing machine had no Playfair and fell to the CSS fallback, and rendering a replacement in Playfair would have made 05 the odd frame out. Proven by pixel-diffing a re-render of the old caption (Playfair 61–68% overlap, **Georgia 78 px 86.4%**). Constants in `Docs/App-Store-Listing-Copy.md` §8.<br>⚠ **SCREENSHOTS: ONE iPhone size, not two.** Apple requires a single set at **6.5" OR 6.9"** and scales the rest itself — earlier versions of this row said "6.9"+6.5"" and that is double the work for nothing. Verified against Apple's own screenshot specifications 2026-08-18. ⚠ **They must be REAL captures of the app.** The landing page's phone mocks are HTML recreations, not the app in use — reuse its *art direction* (bronze, `#0C1013`, the wordmark) as the frame, never its mock UI as the screenshot. ⚠ **Seeded reviewer account** (program, history, squad with a 2nd member, a challenge) or the social pillar reads as Guideline 2.1 incomplete.<br>✅ **Support URL LIVE 2026-08-18** — `https://forgelegacy.app/support` is **200** and ready to paste into App Store Connect. The 25-file set was re-uploaded to the `forgelegacy` Worker; `/`, `/privacy`, `/terms`, `www` all 200 and `/_exported-bundle.html` still 404s |
| 4b | ✅ **DONE — Guideline 1.2 UGC controls, built + applied + DEPLOYED 08-19** | us | **`0171` APPLIED AND VERIFIED** — blocks (symmetric, severs the friendship), reports on post/comment/check-in/person/squad, an `/admin` queue with an **oldest-still-open** line, `/blocked` in Settings, and a handle/name filter. Enforcement is **entirely server-side**: four `AS RESTRICTIVE` policies for the RLS-reachable paths plus **four explicit predicates in `friends_feed`**, which is `security definer` and out of RLS's reach — `verify-0171.sql` asserts both counts are 4. ✅ **The client half DEPLOYED 08-19** — web `entry-69d5be42…`, OTA `01a01bda…` on build 6's runtime, `fingerprint:compare` matched **before** publishing, and the live bundle was searched for strings only this pass contains. Testers have the block. *(This cell read "not deployed" until 08-20.)* ✅ **And the slur/profanity list is seeded — `0173`, 37 patterns + eighteen documented exclusions;** ⏳ **authored, NOT applied — paste `pending-0173.sql`, no deploy needed.** ⚠ Still open **by decision**: blocked athletes show in competition standings (a scoreboard of numbers is not authored content), and the filter covers **handles and names only**, not post bodies. Original finding below.<br><br>⛔ **AS FOUND 08-19** | **A SUBMISSION BLOCKER THAT WAS ON NO LAUNCH DOCUMENT.** The app has user-generated content — squad posts, comments, reactions, check-in photos and video, handles — and **the entire binary contains one Report control, which shows a toast saying *"Reporting a squad is coming soon"*** (`squad-settings.tsx:688`). No report on a post, **no block**, no backing table; `grep "create table.*(block\|report)"` over all 170 migrations returns nothing. Guideline 1.2 requires filtering · reporting **with timely response** · **blocking abusive users** · published contact info — only the last is done (`/support`, 08-18). ⚠ **"It's only a private squad" does not exempt it**: Discover + request-to-join means a stranger can enter a squad and post into a feed you read. ⚠ **The "coming soon" toast is worse than no button** — it proves inside the binary that the need was known and unmet. Closest prior record is `project_communities_architecture`'s *"no platform-level moderation escalation"*, filed against a deferred subsystem and so read as a future problem — **Squads shipped and brought the same gap.** Blocks the age rating too. See `Docs/App-Store-Listing-Copy.md` §7 |
| 4c | ⛔ **EU trader status (Digital Services Act) — NEW 2026-08-24, ON NO PRIOR DOCUMENT** | ⏳ **Apple (item 2) first**, then us | App Information reads **"This developer has identified itself as a non-trader for this app."** ⚠ **That is wrong and it is a legal declaration, not a setting.** An LLC selling subscriptions is a trader; **Apple removes apps from the ENTIRE EU storefront over an unresolved trader declaration.** Apple *verifies* the details and then **publishes the business name and address on the public listing** — and the address on file is the PO's home (`3832 E Cunninghill Dr`), so **decide on a mailbox or the registered agent BEFORE filling the form.** Not instant: verification takes days. Fix with or before the paywall, and put it in front of counsel (§5) rather than answering it from a settings screen.<br><br>✅ **ADDRESS DECIDED 2026-08-24 — PO: *"Just keep the home address."*** The trade-off was put in full (home address published on the EU listing · a ~$15/month virtual business address · or dropping the 27 EU countries entirely) and the PO chose the house. **This is a settled decision, not an oversight — do not reopen it or "fix" it in a later pass.** What remains is mechanical: open App Information → Digital Services Act → Get Started, declare **trader**, and submit `FORGE LEGACY LLC` / `3832 E Cunninghill Dr, Eagle Mountain, UT 84005-6156` / `support@forgelegacy.app`. ⚠ **Apple verifies this over days and then publishes it** — so it is still not a submission-day task.<br><br>⛔ **AND IT IS GATED ON ITEM 2, WHICH WAS NOT OBVIOUS AND WAS INITIALLY GOT WRONG (corrected same day).** The declaration is made in **Business → the red DSA banner → "Complete Compliance Requirements"**, and that page still reads **`Isaiah Altamirano`, individual** — the conversion has not landed. **The trader record identifies the legal seller and Apple VERIFIES AND PUBLISHES it**, so declaring now would publish the PO as an individual and have to be redone *and re-verified* the moment the account becomes `Forge Legacy LLC`. **So the DSA form joins the bank account and the W-9 as the third item waiting on the membership conversion** — the launch documents had listed only two. ⚠ **Do not "get ahead" on this one; doing it early means doing it twice** |
| 5 | **Counsel review** | lawyer | Terms + privacy, before money moves |
| 6 | **9b — Agreements, Tax & Banking** | Apple + CPA | ⚠ **A SUBMISSION GATE, not a payout chore.** IAPs cannot ship while the Paid Applications Agreement is not *in effect*. **(a)** accept it (signer must bind the entity) · **(b)** bank account — ✅ **open as of 08-18**, holder exactly `FORGE LEGACY LLC`; needs the routing + account numbers, and **Apple verifies over days** · **(c)** W-9 — ⚠ **a two-tier disregarded chain is a CPA question. Wrong here is a federal filing, not a rejected form.** ⚠ Gated on item 2: the *organization* App Store Connect account has to exist before any of (a)/(b)/(c) can be entered |
| 7 | **`42501` on Join — CLOSED 08-18** | ✅ nothing to build | **Policy AND data both cleared.** `diagnose-challenge-join-who.sql` returned every clause `true` for every athlete on both live competitions: Wes Price passes the policy on *Biiiiiig lifters* and simply has not joined; Moses Ruiz is already in *Yiiiiiiip*; the creator is already a participant everywhere, so a Join tap by him would raise **23505, not 42501**. §5 separately ruled out the clock. **The only remaining cause is a stale session** — `auth.uid()` NULL server-side while the client still believes it is signed in; sign out and back in clears it. ⚠ **If it recurs after a fresh sign-in, the bug is token refresh, not this policy** — do not go back to the RLS. ⛔ **Never re-paste `0059`** — it silently reverts every friends competition to unjoinable |
| 8 | **Phase F — flip to Free** | us | Strict order or the free tier is given away twice. See below |
| 9 | **Ship** | us | Gates green · `git status` clean · `fingerprint:compare` · new build · submit. ⚠ 9b must be green first |

---

## Phase F — the exact order

The SQL is in `0145`'s footer.

1. **Backfill** `athlete_usage.programs_created` from `programs` — the trigger only counts inserts since 0145, so a populated account reads 0 and gets three more.
2. ✅ **DONE 2026-08-23 — the grants are IN, weeks early, and safely** (a grant is a no-op while
   `default_tier` is still `PREMIUM`; granting LATE is the dangerous direction). ⚠ **"The 20 OG testers"
   was a number in six documents that NAMED NOBODY — the list never existed.** The roster
   (`supabase/apply/roster-who-gets-premium.sql`) found **29 accounts, every one holding no entitlement
   row at all**, so a flip that day would have put the PO himself on Free. **The real answer is 14**,
   decided by the PO one account at a time (record: `Scratch/premium-grant-decisions.md`; SQL:
   `supabase/apply/phase-f-1-grant-premium.sql`). **Run and verified: `granted_premium 14 ·
   of_which_apple_review 2 · will_land_on_free 15 · founder_seats_used 0 · default_tier_still PREMIUM`**
   — 14 + 15 = 29, everyone accounted for. Criterion was *did they actually train*, not *were they
   invited*: 11 of the 29 logged zero workouts. The two Apple review accounts carry a distinct
   `grant_note` so they can be excluded from every paid figure. ⚠ **Matched by handle, not uuid, so a typo
   grants nobody silently — the file asserts exactly 14 and rolls back otherwise. Keep that assertion.**
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

- **⛔ A TARGETED `revoke` IS ONLY TRUE UNTIL THE NEXT BLANKET `grant`, and neither statement fails.** `0145`
  withheld `authenticated` from five internal functions; `0147` §1's `grant execute on all functions in
  schema public to authenticated` handed all five straight back, and its take-back list missed them. Live
  result, found 2026-08-19 by a `0170` self-check written to assert something believed already true:
  **any signed-in athlete could call `claim_founder_seat(<any uuid>)` and mint a free lifetime Founder
  entitlement.** Fixed in `0170` §1b and verified 0/0. **Before revoking anything, check the security mode
  of its CALLERS, not its own — that is `0150`'s lesson and `0147` is what learned it.**
- **⚠ The SQL editor runs a script in ONE transaction, and shows only the LAST statement's result.** A
  failing final `select` rolls back everything that already succeeded, and a bundle ending in several
  `select`s hides all but one. Verification belongs in **one row** — see `supabase/apply/verify-0170.sql`.
- **⚠ No `my_*` function can be run from the SQL editor.** It runs as `postgres` with no auth context, so
  `auth.uid()` is null and every one of them raises `28000`. Verify those from the app, with a real JWT.
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
