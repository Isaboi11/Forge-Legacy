# Android — Build Plan

**Type:** Build plan (open accounts → make it build → make it honest → ship)
**Status:** 📝 PROPOSED — awaiting PO scope sign-off. Nothing in Phase 0 has been applied.
**Date:** 2026-08-30
**Evidence basis:** Live repository scan, 2026-08-30 — `app.json`, `eas.json`, `package.json`, 93 screens, 191 components, 119 `.dc.html`, `git log` on the icon assets, and the installed `@expo/config-types` schema. Expo facts verified against the **v56.0.0** docs and the SDK 56 changelog, per `AGENTS.md`.
**Contradicts, deliberately:** `Docs/Business-Operations-Map.md` §118 — *"Android: ⛔ Zero builds"* — and `Docs/GO-LIVE.md` §130 — *"iOS only. Zero Android."* Both remain true of the **binary**. Neither is true of the **code**, and this plan exists because those two statements have been read as the same statement.

---

## 0. The one-paragraph version

**The app is far closer to running on Android than the dashboard says, and much further from *shipping* on Android than a build log would suggest.** The source already branches for Android in 9 places, declares 9 Android permissions, names an Android foreground service for background runs, creates the notification channel Android 13+ requires before asking for a token, and routes Manage Subscription to Google Play. What does not exist is anything **outside the source tree**: no Google Play account, no signing key, no Firebase project, no Google Cloud Maps key, no `google-services.json` — and the Android launcher icon is still, byte for byte, the one Expo's `create-expo-app` template shipped on 2026-06-08. So the plan is not "port the app". It is: **open four accounts, wire five credentials, then prove on a physical device that 93 screens which have only ever been looked at on iOS and the web are not quietly lying.** The engineering is roughly two working weeks. The calendar is longer than the engineering, and that is the reason to start Phase 0 before we intend to apply.

---

## 1. Scope — what "Android" means here, and what it does not

| In scope for V1 Android | Deliberately NOT in V1 |
|---|---|
| **Feature parity with the shipped iOS build.** Same 93 screens, same backend, same entitlement model | **Wear OS.** The Watch plan (`Apple-Watch-Companion-Build-Plan.md` §1) already names Android/Wear OS out of scope; that holds in both directions |
| Phone form factor, portrait, Android 14+ on a mid-range device | **Tablets / foldables / landscape.** `orientation: "portrait"` stays. Play will still list on tablets; we will not design for them |
| Google Play **internal testing** track as the first destination | **Production release.** That is a separate decision, downstream of the iOS public launch |
| Google Maps on the run route, real tiles and gestures | **Health Connect / Google Fit sync.** Same answer the iOS side gave HealthKit: not V1 |
| FCM push, background run tracking, media capture, share cards | **Android widgets, Quick Settings tiles, Material You dynamic colour.** Forge has its own two themes; it does not take the system's |
| **Both themes** — Forge (dark) and Alabaster (light) | **Samsung Galaxy Store / Amazon / any second storefront** |

**Why this line.** Everything on the left is a surface that already exists and already works somewhere else; the work is proving it. Everything on the right is a new product surface, and adding one while the first Android binary has never installed is how a port becomes a rewrite.

---

## 2. What already exists — the part the dashboard undersells

Every claim below was verified by reading the file, not from memory. This section exists so nobody spends Phase 1 rebuilding it.

**Configuration already in place** (`app.json`):

- `android.package` = `com.qest4.forgelegacy`, matching the iOS bundle id; `versionCode: 1`
- Nine permissions declared, including `FOREGROUND_SERVICE_LOCATION`, `ACCESS_BACKGROUND_LOCATION` and `POST_NOTIFICATIONS` — the three that are easy to miss and painful to add late
- `expo-location` plugin has `isAndroidBackgroundLocationEnabled` **and** `isAndroidForegroundServiceEnabled` both `true`
- `predictiveBackGestureEnabled: false` — an explicit choice, not an omission
- `eas.json` `preview` profile already carries `android: { buildType: "apk" }`, so the first internal build has a distribution path

**Code already branching correctly:**

- [`src/domain/run/background-task.ts:150`](src/domain/run/background-task.ts#L150) declares the Android `foregroundService` with title, body and `notificationColor: '#BA8654'`. Android will not keep a location service alive without it; it is written and commented.
- [`src/lib/push.tsx:66`](src/lib/push.tsx#L66) calls `setNotificationChannelAsync('default', …)` **before** `getExpoPushTokenAsync`. The v56 docs require exactly that ordering on Android 13+.
- [`src/lib/billing.ts:100`](src/lib/billing.ts#L100) sends Manage Subscription to `play.google.com/store/account/subscriptions`. The store seam was designed platform-neutral and it held.
- [`src/components/forge/inputs/ForgeDateInput.tsx:83`](src/components/forge/inputs/ForgeDateInput.tsx#L83) and `:160` — a real Android date-picker branch, not an iOS picker with a shrug.
- [`src/components/forge/composites/Toast/Toast.tsx:63`](src/components/forge/composites/Toast/Toast.tsx#L63) sets `statusBarTranslucent` on Android.
- Eleven `KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}` sites — the correct Android idiom, applied consistently.
- `Fonts` in [`src/constants/theme.ts:29`](src/constants/theme.ts#L29) is a `Platform.select` with a real `default`; `BottomTabInset` is `{ ios: 50, android: 80 }`.
- Analytics, diagnostics, feedback and honors already record `'android'` as a first-class platform value — the telemetry will not need a schema change.

**Styling posture:**

- 49 `shadowColor` and 44 `elevation` declarations. The only file with a shadow and no elevation is `src/lib/progress-image.web.ts`, which is web. **Android shadow coverage is effectively complete.**
- 94 `useSafeAreaInsets` call sites against only 3 `SafeAreaView`. That is the posture edge-to-edge rewards.

**And one genuine advantage worth naming:** the iOS work has been throttled all year by *"Expo cannot prebuild iOS on Windows"*. **Android has no such constraint.** Android Studio, an emulator and `npx expo run:android` all work on this Windows machine. For the first time on this project there is a real local build-and-run loop, which is why Phase 2 can be measured in days rather than in EAS build-queue round-trips.

---

## 3. The gaps — what is actually missing, with evidence

### ⛔ 3.1 The Android launcher icon is still Expo's starter template

`assets/images/android-icon-foreground.png`, `-background.png` and `-monochrome.png` each have exactly one commit in their history: `689bae8 "Initial Expo setup"` (2026-06-08). Commit `8ac7a8c` — *"feat(brand): the app icon and splash were still Expo's starter defaults"* — fixed `icon.png` and the splash **and did not touch the adaptive set.** `adaptiveIcon.backgroundColor` is `#E6F4FE`, Expo's pale blue, against Forge's `#0E0E12`.

An Android build made today installs with the Expo logo on the home screen. This is not a rendering bug; it is the wrong artwork, and it would survive every gate we currently run.

### ⛔ 3.2 Google Maps has no key, and fails silently

[`src/components/workout/RouteMap.tsx:3`](src/components/workout/RouteMap.tsx#L3) uses `PROVIDER_DEFAULT`. On iOS that is Apple Maps — no key, no billing, no config. **On Android it is Google Maps**, which requires `android.config.googleMaps.apiKey` (confirmed present in the installed `@expo/config-types` schema at line 550). `app.json` has no such key.

The file's own header already says so: *"⚠ ANDROID IS NOT DONE … Without it the map renders as a blank grey rectangle — it does not error, which is the bad kind of missing."* That is precisely the failure class this project has been burned by before — a green gate over a dead surface. It needs a Google Cloud project, Maps SDK for Android enabled, an active billing account, and a key restricted to `com.qest4.forgelegacy` plus the SHA-1 of **both** signing certificates (see 3.4 — there are two, and using only one is the classic mistake).

### ⛔ 3.3 Push is correct in code and has no credentials

`push.tsx` does everything right and will still deliver nothing. Per the v56 credentials guide, Android FCM V1 needs, in order: a Firebase project; `google-services.json` downloaded and placed at the project root; `android.googleServicesFile: "./google-services.json"` in `app.json`; and a **service account private key** generated from Firebase *Project settings → Service accounts* and uploaded to EAS (`eas credentials` → Android → production → Google Service Account, or the expo.dev dashboard). The `google-services.json` is safe to commit — it holds public identifiers only. **The service account key must be gitignored.**

Separately: `"expo-notifications"` is a bare string in `plugins`, so no Android notification icon is configured. Android will draw a **white square**. The plugin takes `icon` (a 96×96 all-white PNG with transparency) and `color`; `#BA8654` is already the project's chosen notification tint in `background-task.ts`.

### ⛔ 3.4 No Google Play account, no keystore, no listing

Zero builds have ever run. This is the longest pole and it is **calendar, not effort**:

- The account must be an **organization** account under **Forge Legacy LLC**, not a personal one. The iOS side already paid for this lesson — the launch plan records *"⛔ INDIVIDUAL Apple membership — CONVERT, don't migrate."* Creating the wrong Play account type and discovering it later is the same trap on a different console. The LLC's D-U-N-S number is already in hand from the Apple work.
- $25 one-time, plus identity/organization verification that can take days to weeks.
- **Personal** Play accounts created since 2023 must run a closed test with **12 testers for 14 continuous days** before production access unlocks. Organization accounts are treated differently. **Which rule applies to us is a Phase 0 question to answer from the console, not from this document** — it is potentially a month of calendar and it is the single biggest schedule risk in this plan.
- Signing: let **EAS manage the upload keystore** and enrol in **Play App Signing**. That produces two certificates with two SHA-1 fingerprints, and 3.2's Maps key must list both or the map goes grey for real users while working perfectly for us.
- `eas.json` `submit.production` currently has an `ios` block only. An `android` block plus a Play service account JSON is needed before `eas submit` works.

### ⚠ 3.5 Edge-to-edge is mandatory and cannot be switched off

SDK 56 / RN 0.85 target Android 16 (API 36), where `windowOptOutEdgeToEdgeEnforcement` is deprecated and disabled. Expo's own changelog is explicit that the `edgeToEdgeEnabled` config property **has no effect** on these targets — and indeed it does not appear in the installed config schema at all.

94 `useSafeAreaInsets` sites is a strong starting posture. It is not a finished one: 3 `SafeAreaView` uses and every hard-coded top/bottom pad across 93 screens is a candidate for content sliding under the status bar or the gesture pill. **This is a per-screen visual pass, not a config flag.** It is the largest single line item in Phase 3.

### ⚠ 3.6 Zero `BackHandler` call sites across 93 screens

Expo Router maps the hardware back button to navigation, which covers the ordinary case. It does not cover the ones that matter: an open modal, an active workout, the M-5 chapter-sealing ceremony, a half-finished form. Android users press back constantly and expect it to mean *cancel this*, not *leave the app*. Every ceremony and destructive-confirm surface needs a stated back-press contract. Right now none has one.

### ⚠ 3.7 Share cards rasterize through `react-native-svg` `toDataURL`

[`src/lib/share-card-host.tsx:86`](src/lib/share-card-host.tsx#L86) calls `toDataURL` on a mounted `Svg` instance to produce share cards and progress posters. This works on Android and behaves differently enough — around off-screen and zero-opacity views, and around output sizing — that it must be re-vetted on a device rather than assumed. Two surfaces depend on it: `share-image.ts` and `progress-image.ts`.

### ⚠ 3.8 Background location is a store-review problem, not a code problem

The foreground service is written. What is not: Android 11+ makes `ACCESS_BACKGROUND_LOCATION` a **separate second prompt routed through system Settings** — it cannot be granted in the same dialog as foreground location, so the iOS "ask for the side effect, trust the start" pattern in `background-task.ts` needs an Android-shaped equivalent. And Google Play requires a **prominent in-app disclosure plus a demonstration video** for any app requesting background location. This is the most likely single cause of a Play rejection, and it is authoring work with a lead time.

### ⚠ 3.9 One iOS-only import, currently unreachable

[`src/components/ui/collapsible.tsx:1`](src/components/ui/collapsible.tsx#L1) imports `SymbolView` from `expo-symbols` (SF Symbols — iOS only). Nothing in the tree imports that component; it is template residue. Retire it in Phase 1 rather than let someone import it in six months. `expo-glass-effect` and `@expo/ui` are likewise installed and unused (0 references each) — harmless, but they are weight in the fingerprint.

### ⚠ 3.10 Every future pass now has two fingerprints, not one

`runtimeVersion.policy` is `fingerprint`, and **Android computes its own**. The status doc already records Android updates published into the void — *"Android also published … No Android build exists"*. Once a binary exists those stop being harmless. `fingerprint:compare` must be run per platform before every `eas update`, and the deploy skill and status-doc rows both need a second column. `versionCode` also needs the same bump discipline `ios.buildNumber` has (currently `1` against iOS's `8`).

### ⚠ 3.11 The 202 test files prove nothing about Android

The suite is `node --test` domain tests — pure TypeScript, platform-agnostic by design. That is the right design and it means **the test count cannot move as a result of this work.** Android correctness has to be proven by a device walkthrough, and the walkthrough script is itself a deliverable of Phase 2. Anyone reporting "all tests green" as Android evidence has reported nothing.

---

## 4. Phases and gates

Each gate is a thing somebody can *see fail*. "It built" is not a gate.

### Phase 0 — Open the accounts *(PO-led; hours of work, weeks of calendar)*

Start this **now**, ahead of any intent to apply, because everything downstream queues behind it.

1. Google Play Console — **organization account, Forge Legacy LLC**. Pay the $25, submit verification.
2. **Answer from the console:** does the 12-testers-for-14-days closed-testing rule apply to this account? Record the answer in the Decision Queue; it moves the ship date by up to a month.
3. Google Cloud project + **billing enabled** → Maps SDK for Android.
4. Firebase project → download `google-services.json`, generate the service account key.
5. Acquire a **physical mid-range Android phone, Android 14 or newer**. An emulator will not prove GPS, camera, push delivery or battery behaviour.

**Gate:** all three consoles exist, are owned by the LLC, and the two credential files are in hand.

### Phase 1 — Make it build *(≈1 day engineering, no design work)*

6. Real adaptive icons drawn from the Forge mark; `adaptiveIcon.backgroundColor` → `#0E0E12`.
7. `google-services.json` at root + `android.googleServicesFile` in `app.json`; service account key uploaded to EAS and **added to `.gitignore` and `.easignore`**.
8. `android.config.googleMaps.apiKey`, restricted to `com.qest4.forgelegacy` + **both** SHA-1s.
9. `expo-notifications` plugin gains `icon` (new 96×96 white/transparent asset) and `color: '#BA8654'`.
10. Retire `src/components/ui/collapsible.tsx` (grep for the symbol *and* the filename first — house rule).
11. `eas build -p android --profile preview` → APK.

**Gate:** **the APK installs on the physical device from step 5 and reaches the sign-in screen with the correct icon on the home screen.** Nothing more is claimed. Green on web is not working on device, and this project has shipped a launch crash with every gate green.

### Phase 2 — Make it not lie *(≈3–4 days)*

A scripted walkthrough on the physical device, each item proven by a screenshot or a log line, each failure written down before anything is fixed:

12. **Maps render actual tiles** on the run route, inline and fullscreen. The failure mode is a silent grey rectangle — look at it, do not infer it.
13. **A real push arrives** end to end from Supabase through FCM to the lock screen, with the right icon and tint.
14. **A run measures real distance with the screen locked**, foreground-service notification visible throughout. Compare against a known route.
15. Camera, photo library, video capture, compression, and Supabase upload — the full `useMediaPicker` round trip.
16. Share card and progress poster rasterize and reach the Android share sheet.
17. Rest-timer ding, haptics, keep-awake, and audio behaviour when the app backgrounds.
18. Sign-in, deep links (`forgelegacy://`), and the notification-tap routing in `push.tsx`.

**Gate:** a written walkthrough document with a pass/fail line per item and a screenshot per pass. Items that fail are enumerated **before** any are fixed.

### Phase 3 — Make it look right *(≈4–6 days)*

19. **Edge-to-edge sweep across all 93 screens** — status bar, gesture pill, keyboard. This is the bulk of the phase.
20. **Back-press contract** for every modal, sheet, ceremony and destructive confirm.
21. **Design-gate pass**: run the `design-gate` agent per screen against the 119 `.dc.html` files on the Android render, classifying every delta **DROPPED-FREE / DEFERRED-HONEST / BLOCKED** — enumerate the whole list before fixing anything.
22. **Both themes.** Layout deltas apply to Forge *and* Alabaster; colour deltas to one. The compiler catches only the colour half, so the layout half is manual.

**Gate:** every `BLOCKED` delta either fixed or accepted by the PO **in writing** in this document. `DEFERRED-HONEST` items listed by name — not summarised as a count.

### Phase 4 — Store readiness *(≈2–3 days engineering + review calendar)*

23. Play listing: description, Android screenshot sizes (they are not the iOS sizes), feature graphic, category, content rating questionnaire.
24. **Data safety form** — the Android counterpart to App Privacy, and stricter about location.
25. **Prominent disclosure + demonstration video for background location** (3.8). Author early; it gates submission.
26. `eas.json` gains `submit.production.android` + Play service account JSON.
27. Internal testing track upload; closed testing if 3.4's answer requires it.

**Gate:** a tester who is not us installs from the Play internal testing track and completes a workout.

### Phase 5 — Parity discipline *(ongoing, no end date)*

28. Every deploy pass publishes and verifies **two** fingerprints. `fingerprint:compare` per platform before `eas update`, every time.
29. Status-doc entries carry both runtimes. `versionCode` bumps beside `buildNumber`.
30. The deploy skill (`deploy-web`) is amended to make the Android leg impossible to forget rather than merely possible to remember.

---

## 5. Effort and calendar, stated separately

| | Engineering | Calendar |
|---|---:|---|
| Phase 0 | ~4 hours (PO) | **1–4 weeks** — verification, possible 14-day closed test |
| Phase 1 | ~1 day | + EAS queue |
| Phase 2 | ~3–4 days | — |
| Phase 3 | ~4–6 days | — |
| Phase 4 | ~2–3 days | + Play review, typically days |
| **Total** | **~11–15 working days** | **potentially 6+ weeks end to end** |

**The two numbers are not the same number, and the gap is the whole reason Phase 0 starts before we intend to apply.** If Phase 0 begins today, the engineering can start whenever we choose without the account being the thing we are waiting on.

---

## 6. Risks, named

| Risk | Why it bites | Mitigation |
|---|---|---|
| **12-testers/14-days closed testing** | Adds a month with no warning, discovered late | Phase 0 step 2 — answer it first, from the console |
| **Background location rejection** | Play's strictest review area; we request it and use it genuinely | Author the disclosure + video in Phase 0, not Phase 4 |
| **Maps grey rectangle** | Silent. Passes every automated check | Phase 2 item 12 is a human looking at tiles |
| **Wrong Play account type** | Same shape as the Apple individual-membership trap | Organization account, LLC, first time |
| **SHA-1 mismatch after Play App Signing** | Map works for us, grey for every real user | Register both certificate fingerprints on the Maps key |
| **Edge-to-edge underestimated** | 93 screens; cannot be disabled; looks like a small config item | Budgeted as the bulk of Phase 3, not a Phase 1 line |
| **"All tests green" read as Android evidence** | 202 test files are platform-agnostic and will not move | §3.11 states this; the walkthrough doc is the only evidence |
| **OTA published to a runtime with no binary** | Already happened twice, harmlessly. Stops being harmless | Phase 5, per-platform `fingerprint:compare` |

---

## 7. What the PO provides

- Forge Legacy LLC details + D-U-N-S for the Play organization account
- A payment method for Google Cloud billing (Maps is billed per load above the free tier)
- **A physical mid-range Android phone, Android 14+** — non-negotiable; the emulator cannot prove GPS, camera, push or battery
- 12 testers, **only if** Phase 0 step 2 says the rule applies
- A decision on Forge-mark artwork for the adaptive icon foreground

---

## 8. Out of scope, so nobody expects it

Wear OS · tablets and foldables · landscape · Health Connect / Google Fit · Android widgets and Quick Settings tiles · Material You dynamic colour · any storefront other than Google Play · a production release (that is a separate decision after the iOS public launch).

---

## 9. For the Decision Queue

1. **Does the 12-testers/14-days closed-testing requirement apply to a Forge Legacy LLC organization account?** — blocks the ship date by up to a month.
2. **Does Android ship before, with, or after the iOS public launch + paywall?** This plan assumes *after*, and reaching the internal testing track early either way.
3. **Adaptive icon artwork** — reuse the iOS mark, or draw a foreground layer for the Android safe zone (Android masks and animates it; a direct reuse will be cropped).
