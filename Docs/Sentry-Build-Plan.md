# Sentry — Build Plan (Build 10)

**v1.1 · 2026-09-28** · Queued PO 09-27 · Status: **CODE BUILT on `feat/build10` (09-28), inert until the DSN is set** · policy text edited, NOT published
**PO decisions 09-28:** "integrate all of the free Sentry" — account id ON (feeds the PO's planned CRM) · web ON · performance tracing ON (adds the **Performance Data** privacy label) · Session Replay: ⏳ asked, Claude recommends OFF (screens show body photos, meals, health numbers). Stay on the free plan: over the monthly cap Sentry drops events, it never bills.
> **As built (09-28) — where it differs from the plan below, this block wins:**
> - **DSN from `EXPO_PUBLIC_SENTRY_DSN`**, not hard-coded (overrides §3). Unset → `Sentry.init` never runs:
>   no client, no native start, no network. Also off whenever `__DEV__`.
> - **Web ON** (overrides §5 `enabled` + Decision 2): environment `web-preview` on web, `production` on the phone.
> - **Tracing ON** (overrides §5 + Decision 3): `tracesSampler` 0.2, and 0 when "Help improve Forge" is off
>   (re-checked at send time). Profiling off. `tracePropagationTargets: []` — no `sentry-trace`/`baggage` header
>   on any request (the native default is every URL; on web it would break Edge Function CORS).
>   Navigation spans named by route via `reactNavigationIntegration` + expo-router's `useNavigationContainerRef`.
> - **Scrubber:** `src/domain/diagnostics/sentry-scrub.ts` (+ tests) on `beforeSend`, `beforeSendTransaction`,
>   `beforeSendSpan`: drops request/extra/breadcrumbs/server_name/device name, user = UUID only, cuts URL
>   queries, emails, tokens, Postgres value echoes, quoted prose. `maxBreadcrumbs: 0` + `beforeBreadcrumb → null`.
> - **Alongside `0176`:** `reportError` forwards only `boundary`/`overlay`/`query`/`manual` to Sentry (Sentry's own
>   handlers already catch `global`/`rejection`), tagged `fl_session`, `update_id`, `fl_source`, `fl_screen`.
> - **Files:** `src/lib/sentry.ts` (new), `src/app/_layout.tsx` (`startSentry()` above `startDiagnostics()`,
>   `wrapRoot`, user + navigation hooks), `src/lib/diagnostics.ts`, `src/app/admin.tsx` (Errors → "Sentry"
>   status line + *Test JS error* / *Test native crash*), `metro.config.js` (`getSentryExpoConfig`),
>   `eas.json` (`SENTRY_ALLOW_FAILURE=true` in every build profile so a missing/bad token can never fail a
>   build — the upload errors in the log instead), deploy-web skill §4b (OTA source maps).
> - **PO setup** is §6 plus: add **`EXPO_PUBLIC_SENTRY_DSN`** (Plain text or Sensitive — not secret) to EAS
>   env **production + preview**, and to the local `.env` for web exports.

**What:** `@sentry/react-native` + its Expo config plugin. Sentry org `forge-legacy-llc`, project `forge-legacy`.
**Why:** native crash traces (the app quitting to the home screen) and source-mapped JS stacks. The
in-app reporter (`0176`, /admin → Errors) cannot see a hard native crash (`Docs/Error-Reporting.md` §4).
**Blocker:** the privacy policy currently promises *no* third-party crash reporting. §4 below changes it.

---

## 1 · Decision: alongside, not replace

Keep `0176`. Sentry runs next to it. This matches `Docs/Error-Reporting.md` §7.

- `0176` owns the **step trail** under a privacy rule we wrote and tested (route shapes + action names,
  never typed text), joins to `app_events`, and is free per event. Sentry can't do that for us.
- Sentry owns **native crashes, dSYM-symbolicated native stacks, and source-mapped JS stacks.**
- Both catch uncaught JS errors. That duplication is fine: two views of one bug, joined by a shared tag.

## 2 · Versions (checked, not guessed)

- Expo SDK 56 pins **`@sentry/react-native ~7.11.0`** (`node_modules/expo/bundledNativeModules.json`).
  npm latest is 8.28.0 — **do not take it.** Install with `npx expo install`, which picks the pin.
- Needs Expo SDK 50+ (we are 56, RN 0.85.3). The old `sentry-expo` package is deprecated — not that one.

## 3 · Files touched

| File | Change |
|---|---|
| `package.json` / lock | `npx expo install @sentry/react-native` |
| `app.json` → `plugins` | add `["@sentry/react-native/expo", { "url": "https://sentry.io/", "organization": "forge-legacy-llc", "project": "forge-legacy" }]` — **no token here, ever** |
| `metro.config.js` | `getDefaultConfig` → `getSentryExpoConfig` from `@sentry/react-native/metro`. **Keep the `@napi-rs/canvas` resolver rule exactly as is** — only the first call changes. This injects debug IDs so OTA source maps match. |
| `src/lib/sentry.ts` (new) | `Sentry.init(...)` with the settings in §5. Sync, cannot throw, imports nothing from `lib/supabase` (same cycle rule as `diagnostics.ts`). |
| `src/app/_layout.tsx` | import `@/lib/sentry` and call its start **at module level, just above `startDiagnostics()`** (line ~72) — so `diagnostics.ts` chains to Sentry's handler, which chains to RN's. Wrap the export: `export default Sentry.wrap(RootLayout)`. |
| `src/lib/diagnostics.ts` | one optional second sink: `reportError()` also forwards to Sentry, so errors caught by `ScreenBoundary`/`OverlayBoundary` (which never reach the global handler) show up too. Tag each Sentry event `fl_session = currentAppSession()` so a Sentry event can be matched to its `0176` trail. |
| `src/app/admin.tsx` | admin-only "Send test crash" row: one JS throw, one `Sentry.nativeCrash()`. For §8. |
| `.claude/skills/deploy-web/SKILL.md` | add the OTA source-map step (§7) after `eas update`. |
| `site/privacy.html`, `Docs/Legal/Privacy-Policy.md`, `Docs/App-Store-Privacy-Labels.md` | §4 below. |

`eas.json` needs no change. The DSN is **not a secret** (Sentry says so; it only allows sending events) —
hard-code it in `src/lib/sentry.ts` rather than adding an `EXPO_PUBLIC_` variable every build and OTA must carry.

## 4 · Privacy policy + labels — must be LIVE before build 10 reaches a tester

Rule from P6-A1-D8: publish the policy before the thing it describes collects anything. `site/` is its own
Cloudflare deploy — editing the file is not publishing it.

**4.1 Sentences that must change (exact current text):**

- `site/privacy.html` §2 *Usage analytics* (lines 187–189):
  > *"We also use no third-party crash or error reporting (no Sentry, Bugsnag or Crashlytics). The diagnostic
  > reports described below go to our own database and nowhere else."*
- `Docs/Legal/Privacy-Policy.md` §3 (line 161):
  > *"No third-party crash or error reporting. No Sentry, Bugsnag, Crashlytics or similar. Diagnostic
  > reports, described under "Diagnostics" above, go to our own database and nowhere else."*

**4.2 Draft replacements:**

- `site/privacy.html` §2, replace the two sentences with:
  > *"Error reports are covered separately below, under Diagnostics."*
- Add a paragraph at the end of §2 *Diagnostics: when something goes wrong*:
  > *"If the app itself crashes, a crash report is also sent to Sentry, a crash-reporting service we use.
  > It contains the technical trace of the crash, your app version, phone model and operating system, and
  > your account identifier so we can tell how many people a crash affects. It never contains your name,
  > email, training figures, photos, location, or anything you typed. Sentry stores it for us, uses it only
  > to provide the report to us, and it is kept for up to 90 days."*
- §4 *Who we share it with*, add after Anthropic:
  > *"**Sentry**: crash reporting. It receives the crash reports described under Diagnostics, and never
  > your name, email, or anything you typed."*
- `Docs/Legal/Privacy-Policy.md` §3: replace the bullet with *"No third-party analytics or advertising
  SDKs. Crash reports go to Sentry, a crash-reporting service, as described under Diagnostics."* and mirror
  the Diagnostics + service-provider wording above.
- `src/domain/settings/content.ts` (in-app summary) does not mention crash reporting today — re-read it in
  the same pass anyway; the three move together (Labels doc, "THESE THREE MOVE TOGETHER").

**4.3 App Store labels — no new data type, if §5 is followed.**
- *Crash Data* and *Other Diagnostic Data* are already declared: **Linked · App Functionality · not
  tracking** (v1.2). Sentry is a processor for us, not a tracker, so "Used for tracking" stays **No** and
  there is still no ATT prompt.
- **Linked stays correct either way:** `0176` already links reports to the account. Setting the Sentry
  user id (Decision 1) does not change the label; not setting it wouldn't make it "Not linked" either.
- ⚠ **Performance Data stays No only if tracing/profiling stay OFF** (Decision 3). Turn them on and add
  *Performance Data · Linked · App Functionality*.
- ⚠ **Session Replay or screenshots would add Photos/Other User Content-type exposure.** Off, permanently.
- Edit the Labels doc: §1 line 37 (*"no Sentry…"*, a 08-19 fact) gets a dated note; §2 Diagnostics source
  cells add "and Sentry (native crashes)"; bump to v1.3. In App Store Connect the answers do not change.

## 5 · Sentry settings (in `src/lib/sentry.ts`)

| Setting | Value | Why |
|---|---|---|
| `enabled` | `!__DEV__ && Platform.OS !== 'web'` | No dev noise; web preview skipped (Decision 2) — `0176` already covers web, and web has no native crash to catch |
| `sendDefaultPii` | `false` | Sentry's sample sets `true` (IP, user, cookies). We don't. |
| `tracesSampleRate` / `profilesSampleRate` | not set (0) | Keeps *Performance Data* at No (Decision 3) |
| Replay / `mobileReplayIntegration` | **not added** | Records the screen. Never. |
| `attachScreenshot` / `attachViewHierarchy` | `false` | Same reason |
| `beforeBreadcrumb` | return `null` | Sentry's auto-breadcrumbs capture console text and Supabase URLs with query strings (food searches, ids). `0176` owns the trail under ER-D1. |
| `beforeSend` | delete `event.request`, `event.user.email/ip_address` | Belt-and-braces scrub |
| `environment` | `'production'` | |
| user | `Sentry.setUser({ id })` on sign-in, `null` on sign-out — **UUID only** | Decision 1 |
| tags | `fl_session`, `update_id` (`Updates.updateId`) | Match to the `0176` row; know which OTA crashed |

**In the Sentry dashboard (project → Settings → Security & Privacy):** turn ON *Prevent Storing of IP
Addresses*, *Data Scrubber*, *Use Default Scrubbers*. **Data region** is fixed when the org was made —
check Settings → Organization; US is fine (Supabase is US too). The plugin `url` stays `https://sentry.io/`.

## 6 · Setup the PO does (about 10 minutes)

**In Sentry (sentry.io):**
1. Settings → Developer Settings → **Organization Tokens** → *Create New Token*, name it `eas-build`.
   Copy it once — Sentry won't show it again.
2. Project `forge-legacy` → Settings → **Client Keys (DSN)** → copy the DSN, paste it to Claude (not secret).
3. Project → Settings → Security & Privacy → the three switches in §5.

**In Expo (expo.dev → ForgeLegacy → Environment variables):**
4. *Add variable* → Name `SENTRY_AUTH_TOKEN` → value = the token → Visibility **Secret** →
   environments **production** and **preview**. Save. (Never in `app.json`, `.env`, chat or a commit.)

**On this PC, for OTA source maps:**
5. Put `SENTRY_AUTH_TOKEN=<token>` in `.env.local` (gitignored by `.env*.local`). Claude reads it when uploading.

## 7 · Source maps — builds AND OTAs

- **EAS Build:** automatic. The plugin's Xcode build phase uploads the JS source map and the dSYMs using
  `SENTRY_AUTH_TOKEN` from step 4.
- **EAS Update (how this app ships most fixes):** NOT automatic. Right after every `eas update`:
  `npx sentry-expo-upload-sourcemaps dist`. Maps match by debug ID (from `getSentryExpoConfig`); Sentry notes
  they "have no associated releases… expected". ⚠ **Run it before anything else touches `dist`** — the web
  export (`deploy-web` §2) wipes and rewrites the same folder. Skip it and that OTA's JS stacks come back
  minified (the crash still arrives; it's just harder to read).

## 8 · How to verify (TestFlight build 10)

1. Install build 10 from TestFlight. /admin → *Send test crash* → **JS error**. Within ~1 min it appears in
   Sentry **with `src/…` file names and line numbers**, AND in /admin → Errors (proves alongside works).
2. *Send test crash* → **native crash**. App closes. Reopen it (Sentry sends on next launch). The event shows
   a symbolicated native stack (dSYM worked).
3. Publish a trivial OTA, upload its maps, repeat step 1. Stack must be readable and tagged with the new
   `update_id`. This is the one people skip — it's the one that matters most here.
4. Event check: no email, no IP, no breadcrumbs, `user.id` only if Decision 1 = yes.
5. Web preview: confirm no request to `sentry.io` in the network tab.

## 9 · Risks

- ⛔ **Fingerprint changes → new runtime.** A native module + plugin means build 9 can't take any OTA made from
  a tree with Sentry in it. Do this work on the build-10 branch only; build-9 OTAs keep coming from
  `ota/build9-js` (ONE OTA branch per build). Run `fingerprint:compare` before any OTA as usual.
- ⚠ **Missing token can fail the iOS build** at the Sentry upload phase (verify on the first build). If step 4 is
  wrong, fix the variable; `SENTRY_DISABLE_AUTO_UPLOAD=true` is the escape hatch, but then native stacks are unsymbolicated.
- ⚠ **Handler order.** Sentry must init before `startDiagnostics()` so both chain; the reverse order can
  leave `0176` blind to uncaught errors. Verify step 1 covers it.
- ⚠ **Green on web ≠ working on device** — nothing here can be proven on the web preview (it's disabled
  there). Only step 8 on a real phone counts.
- Free plan quota (5k errors/month) is plenty now; a crash loop could burn it — Sentry's spike protection is on by default.
- Pin `eas-cli@22.3.0` for the build (22.4.0 uploads nothing).

## 10 · Order

1. **Policy first:** edit §4 text → PO approves wording → publish `site/` (Cloudflare) → update the Labels doc.
2. **PO setup** (§6).
3. **Code** on the build-10 branch (§3, §5). Lint + `node --test` green.
4. **Build 10** (bundled with Live Activities etc.). Watch the build log for the Sentry upload lines.
5. **Verify** (§8), including the OTA source-map step. Add the upload step to `deploy-web`.
6. Update `Forge-Legacy-Master-Status.md` and the Submission Checklist.

## 11 · Decisions for the PO

1. **Send the account id to Sentry?** → **Recommend YES, the UUID only** (no name/email). Lets Sentry rank
   crashes by *people affected*, like /admin does. Labels don't change either way.
2. **Sentry on the web preview?** → **Recommend NO.** Only testers use it, `0176` already covers it, and
   there are no native crashes on the web.
3. **Performance monitoring (tracing)?** → **Recommend OFF.** It adds a new App Store label (Performance
   Data), uses quota, and isn't the problem we're solving. Revisit after launch.
