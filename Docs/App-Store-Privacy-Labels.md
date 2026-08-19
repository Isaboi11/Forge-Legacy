# App Privacy labels — the answer sheet

**v1.0 · 2026-08-19 · Launch Checklist §10.3**

Every answer below is derived from **`site/privacy.html`**, which §10.2 names as the governing document —
*"declare 10.3 from `site/privacy.html`, not from memory and not from the in-app summary."* The section of
the policy each answer comes from is cited so the two can be re-checked against each other.

> ⚠ **THESE THREE MOVE TOGETHER.** `site/privacy.html` · `src/domain/settings/content.ts` · this sheet.
> Change any one and re-check the other two. §10.2 records that rule; this file is the third leg of it.

> ⛔ **DO NOT SIGN THESE UNTIL THE SUBMISSION BUILD IS DECIDED.** One answer changes the moment
> `react-native-purchases` lands — see **§4, The one that flips**. Signing now and shipping the paywall
> later means a signed declaration that is false about the build in review.

---

## 1 · The question that governs the rest

**"Do you or your third-party partners use data for tracking purposes?"** → **NO.**

Apple defines tracking as linking user data with third-party data for advertising, or sharing it with a
data broker. Neither happens, and it is verifiable rather than asserted:

- `site/privacy.html` §2 (*Usage analytics*): *"never sold, never shared with advertisers, and are not used
  to build a profile about you. We do not use third-party advertising or tracking SDKs, and the app does
  not track you across other apps or websites."*
- Confirmed against `package.json` on 2026-08-19: **no Sentry, Bugsnag, Firebase, Amplitude, Mixpanel,
  Segment, Facebook SDK, AdMob, AppsFlyer, Adjust or Branch.** There is no SDK present that *could* track.

**Consequences, both worth knowing:**
- **"Used for Tracking" is NO for every data type below.** No exceptions, no judgement calls.
- **No App Tracking Transparency prompt is required**, and none should be added. `NSUserTrackingUsageDescription`
  is absent from `app.json` and must stay absent — an ATT prompt with nothing behind it is its own problem.

---

## 2 · Declare these — data collected

Every row is **Linked to the user** (the app is an account-based training record; nothing is anonymous)
and **Not used for tracking**. So the only column that varies is the purpose.

### Contact Info

| Data type | Purposes | Source |
|---|---|---|
| **Email Address** | App Functionality | §2 *Account and profile* — *"Email address and password credentials, used to sign you in."* |
| **Name** | App Functionality | §2 — display name and handle |

*Not collected: Phone Number · Physical Address · Other User Contact Info.*

### Health & Fitness

| Data type | Purposes | Source |
|---|---|---|
| **Fitness** | App Functionality, **Product Personalization** | §2 *Training and health-related data* — workouts, sets, reps, weights, durations, distances, PRs, goals, rank |
| **Health** | App Functionality, **Product Personalization** | §2 — *"Body measurements you choose to log, where a goal requires one"* |

⚠ **Product Personalization is not optional here and is the answer most likely to be under-declared.** Apple
defines it as *"customizing what the user sees, such as a list of recommended products, posts, or
suggestions."* **Coach Holt builds a program from the athlete's training data, experience and goals** — that
is the product. Declaring only App Functionality would understate the single most important thing the app
does with health data.

### Location

| Data type | Purposes | Source |
|---|---|---|
| **Precise Location** | App Functionality | §2 *Precise location — runs, walks and rides only* |

⚠ **Background location is enabled** (`app.json`: `isIosBackgroundLocationEnabled: true`), and the policy
says why in the athlete's own terms. The 200 m route trim is a **storage** guarantee, not a display setting —
it does not reduce what is *collected*, so it does not change this answer. Do not let it.

*Not collected: Coarse Location.*

### User Content

| Data type | Purposes | Source |
|---|---|---|
| **Photos or Videos** | App Functionality | §2 *Photos and video* — progress/transformation photos, posing video, chapter and accomplishment images, squad check-in video |
| **Customer Support** | App Functionality | §2 *Support messages and feedback* — the message, plus screen, app version and platform |
| **Other User Content** | App Functionality | §2 — notes and reflections; *Social activity* — posts, comments, reactions |

*Not collected: Emails or Text Messages · Audio Data · Gameplay Content.*

### Identifiers

| Data type | Purposes | Source |
|---|---|---|
| **User ID** | App Functionality, **Analytics** | §2 *Usage analytics* — *"stored against your account identifier so we can count people rather than taps"* |
| **Device ID** | App Functionality | §2 *Notifications* — *"we store a device push token so messages can reach your phone"* |

⚠ **Device ID is declared deliberately.** A push token is a device-level identifier under Apple's
definition (*"any identifier that relates to an individual device"*), even though it is not an advertising
ID and is deleted when notifications are turned off. Declaring it costs nothing; omitting it is a false
declaration about a real stored value.

### Usage Data

| Data type | Purposes | Source |
|---|---|---|
| **Product Interaction** | Analytics | §2 *Usage analytics* — *"which screens are opened and which features are used"* |

*Not collected: Advertising Data · Other Usage Data.*

---

## 3 · Do NOT declare these — and why each was considered

Recorded so they read as decisions rather than omissions, and so the next person does not re-litigate them.

| Data type | Answer | Why |
|---|---|---|
| **Sensitive Info** | No | Apple's category is racial/ethnic origin, sexual orientation, pregnancy, disability, religious or philosophical belief, trade union membership, political opinion, genetic or biometric data. **Sex and training background are collected** (§2) to calibrate strength standards and rank — neither is in Apple's list. ⚠ A close call, recorded as one. |
| **Search History** | No | The app has in-app search, but `sanitizeProps()` forbids athlete-authored text in any analytics event (P6-A1-D3), so **queries are never stored**. |
| **Browsing History** | No | Not a browser and no web-content history. |
| **Contacts** | No | No address-book access anywhere. Invites are handled in-app and by share sheet — the share sheet is the OS's, and Forge never reads the contact list. |
| **Crash Data / Performance Data** | No | **No crash-reporting SDK is installed.** Verified against `package.json` 2026-08-19. |
| **Other Diagnostic Data** | No | Screen, app version and platform *are* collected with feedback — declared under **Customer Support**, where they belong, rather than twice. |
| **Payment Info / Credit Info** | No | The app never sees a card. Apple processes every transaction. |
| **Purchase History** | **No — TODAY.** | ⛔ **See §4.** |
| **Environment Scanning · Hands · Head · Other Data** | No | Nothing in the app touches these. |

---

## 4 · ⛔ The one that flips

**`Purchases → Purchase History` is NO today and becomes YES the moment `react-native-purchases` ships**
(Launch Checklist §4.2). RevenueCat receives and stores purchase and subscription state keyed to the
athlete, which is Purchase History, Linked, purpose **App Functionality**.

⚠ **THE ORDERING TRAP, WHICH IS WHY THIS SECTION EXISTS.** §10.7 requires the Stage-2 build to carry the
paywall, and Phase E's native dependency arrives *after* the Apple membership conversion. So the sequence
that looks natural — fill the labels in now while there is time, ship the paywall later — **signs a
declaration that is false about the build actually under review.**

Two further changes land in the same pass:
- **`site/privacy.html` gains a subscription/purchase paragraph.** §2 currently has seven collection
  categories and none of them is purchases. The policy must say it before the label declares it.
- **RevenueCat joins the §4 service-provider list** beside Supabase, Expo and Apple.

**Do all three together, in that order: policy → in-app summary → labels.** That is the same ordering §10.2
was built to enforce, and the reason 10.2 closed cleanly.

---

## 5 · The rest of §10, for context

| | Item | State |
|---|---|---|
| 10.1 | Privacy + terms URLs | ✅ `forgelegacy.app/privacy` · `/terms`, both 200 |
| 10.2 | Policy copy corrected before any label signed | ✅ `cc2b5de`, 2026-08-15 |
| **10.3** | **App Privacy labels** | **This document. Ready to enter — see the §4 gate.** |
| 10.4 | Support URL | ✅ `forgelegacy.app/support`, 200, verified 08-18 |
| 10.5 | Screenshots, description, keywords, age rating | ⛔ Not started. ⚠ **One iPhone size (6.5" **or** 6.9"), not two.** ⚠ **Never state the program-catalogue count.** |
| 10.6 | Seeded reviewer account | ⛔ Not started. The social pillar is unreviewable from an empty account. |
| 10.7 | Paywall present + §5 + §6 done before submission | ⛔ Gated on §9.7 |

---

*Derived from `site/privacy.html` (governing) and verified against `package.json` and `app.json`
on 2026-08-19. Re-verify all three before signing.*
