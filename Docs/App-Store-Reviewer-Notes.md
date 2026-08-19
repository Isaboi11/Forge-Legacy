# App Store reviewer notes

**v1.0 · 2026-08-19 · Launch Checklist §10.6**

Two things go into App Store Connect → **App Review Information**: the demo account credentials, and the
notes box. The notes text is in §3 below, ready to paste.

---

## 1 · The demo account

Seeded by **`supabase/seed/reviewer-seed.mjs`**. It writes through the anon key as the signed-in athlete,
so every row it creates goes through the same RLS the app uses — which is what proves the content is
actually reachable by the account Apple signs in to. A service-key seed can write rows the reviewer's own
session then cannot read, and that fails in the one way nobody catches before submission.

```
SB_EMAIL=review@forgelegacy.app  SB_PASS=…  \
SB2_EMAIL=demo.sam@forgelegacy.app SB2_PASS=… \
node supabase/seed/reviewer-seed.mjs
```

**⚠ TWO ACCOUNTS, AND THE SECOND IS NOT OPTIONAL.** Half of what a reviewer must see requires somebody
else to exist: a squad with a second member, a feed with a post the reviewer did not write, a competition
with more than one entrant, a friendship. One account cannot produce any of them, and a squad whose only
member is the reviewer is the empty screen this whole exercise exists to avoid.

**⚠ THE ADDRESS MUST BE CONFIRMED BEFORE SUBMISSION.** If email confirmation is on for the project, the
seed stops and says so. **Apple's reviewer cannot confirm an email** — an unconfirmed account is a rejection
for "could not sign in", and it is invisible from our side because we confirmed ours months ago.

### What it seeds

| | |
|---|---|
| **Identity** | Both profiles named, handled, and **`onboarded_at` set** |
| **Program** | `Strength Foundation I (3-Day)`, adopted and **started** — without it Home is the cold-start screen |
| **Chapters** | One active, one sealed **with a reflection** — without a chapter the Legacy tab is blank |
| **Onboarding answers** | `experience` + `training_goals` (0169) so Coach Holt opens with a program, not a questionnaire |
| **History** | 5 reviewer sessions over 18 days, saved through `save_workout` — so PRs, honors and rank are real, not decoration |
| **Friendship** | Mutual and accepted |
| **Squad** | *Iron Circle*, private, with the second account as a real member |
| **Squad feed** | 3 posts from **both** authors (one marked `BOTH` so the Friends feed is not empty either) |
| **Competition** | *February Volume*, both entrants, advanced to `ACTIVE` by the real state machine |

⚠ **`onboarded_at` IS THE LOAD-BEARING FIELD.** A null one sends the reviewer into the first-time journey
on sign-in, and every screen they were sent to check sits behind it.

⚠ **HISTORY IS SAVED THROUGH `save_workout`, NEVER INSERTED.** The RPC is what detects personal records,
advances the program and fires honor evaluation. Hand-inserted `workouts` rows render as sessions with no
PRs, no honors and no rank behind them — which looks broken rather than new.

### After Phase F

⛔ **The reviewer account needs a seat-free PREMIUM grant** the moment `default_tier` flips to `FREE`, or
the reviewer hits the Free caps mid-review. That is **step 2 of Phase F** in `Docs/GO-LIVE.md`, and it is
deliberately not in the seed script: it is a billing decision, not seed data.

---

## 1b · ⚠ What the first walkthrough actually found

Recorded because every one of these passed `tsc`, the tests and the seed's own output, and was only
visible by signing in and looking. **Walking the checklist is not a formality.**

| Found | Why it happened |
|---|---|
| **Home read "Train Today"** — the cold-start state, on the first screen Apple opens | The seed wrote history but never a **program**. §10.6 says "a running program" and I read past it. Now adopts `Strength Foundation I (3-Day)` from a shipped definition and calls `start_program`. |
| **Legacy tab entirely blank** despite 5 real personal records | **No chapter.** Records render inside a chapter's context, so with none the whole tab is empty — data correct, screen blank, nothing reporting a problem. Now seeds one active + one sealed. |
| **Personal records read 0, then 20** | `save_workout` does not detect records; the client passes them in. Then `personal_records` and `timeline_events` do not cascade from `workouts`, so four re-runs stacked four copies of every PR. |
| **Friends feed empty** | Posts default to `audience: 'SQUAD'` (0074) and `friends_feed` selects `FRIENDS`/`BOTH` only. One post is now `BOTH`. |
| **Squad check-ins impossible** | `0049` dropped and recreated `squad_checkins` as **video-only**. Not seeded — a check-in whose video will not play is worse than none. |
| **Two re-run failures** | Friendship and competition-join both relied on error-text matching and `upsert`. Both now ask what is already true first. |

⚠ **AND ONE FALSE ALARM WORTH RECORDING.** Home appeared empty for a while on both web and TestFlight,
which sent me through the client-version logic, the composition path and a git archaeology of build 6.
**The browser was signed in as the squadmate**, whose account correctly has no program. Nothing was wrong.
**Check the avatar initials before diagnosing an empty screen** — `AR` is the reviewer, `ST` is Sam.

---

## 2 · Check it before you paste it

Sign in as the reviewer on a real device and confirm each of these renders with content. **A tab that
loads empty is the finding.**

- [x] **Home** — a program, a next session, the coach coin
- [x] **Workouts → History** — five sessions, with weights
- [x] **Legacy** — chapter, PRs, honors
- [x] **Squads → Iron Circle** — two members, three posts, check-ins
- [x] **Competition** — *February Volume*, two entrants, a leaderboard
- [x] **Friends** — Sam Torres
- [ ] **⋯ on Sam's profile** — Report and Block both present *(Guideline 1.2 — the controls a reviewer looks for)*
      ⛔ **CONFIRMED ABSENT on build 6 / the web preview as of 2026-08-19** — `0171`'s client half is built
      and not deployed. **This must be re-checked after the deploy; it is a submission blocker, not cosmetic.**
- [ ] **Settings → Privacy & Alerts → Blocked People** — loads, says nobody is blocked
      ⛔ Absent for the same reason, and returns with the same deploy.
- [x] **Settings → Account → Delete Account** — reachable *(Guideline 5.1.1(v))*

---

## 3 · The notes box — paste this

```
Thanks for reviewing Forge Legacy.

SIGNING IN
The demo account is seeded with training history, a squad, a competition and a
friend, so every tab has real content. Please use the credentials provided.

WHAT THE APP IS
A strength-training log built around a long-term record: you name and seal
"chapters" of training, earn a rank that never decreases, and share progress
with a small private squad rather than a public feed.

TWO THINGS THAT NEED EXPLAINING

1. "Train Together" needs two devices.
   Home > Train Together starts a shared live session and invites a friend. With
   only one device the invite can be sent but not accepted, so the feature will
   look inert. Everything else in the app is reviewable on one device.

2. There is no public feed, by design.
   Posts are visible only to a squad or to mutual friends. The demo account is
   already in a squad and has one friend, so both surfaces have content.

REPORTING AND BLOCKING (Guideline 1.2)
- Report: the "..." menu on any athlete's profile, the flag icon on a post, and
  Squad Settings > Report Squad.
- Block: the "..." menu on an athlete's profile. Blocking is mutual - neither
  person sees the other's posts, comments or check-ins afterwards.
- Undo: Settings > Privacy & Alerts > Blocked People.
- Reports reach an internal queue that we monitor and action.

ACCOUNT DELETION (Guideline 5.1.1(v))
Account Settings > Delete Account, inside the app. It removes the account and its
training data.

PERMISSIONS
- Location is requested only when starting a tracked outdoor run, walk or ride,
  and only for that session. Recorded routes have the first and last 200 metres
  removed before they are stored, so a saved map never contains your start point.
- Camera and photo library are requested only at the moment you add a photo.
- Neither is required to use the rest of the app.

PLATFORM
iPhone only. There is no Android or Apple Watch version.

Any questions: support@forgelegacy.app
```

⚠ **Plain ASCII on purpose** — the notes box is a plain-text field and curly quotes, em dashes and arrows
have been known to arrive mangled. Do not "improve" the punctuation on the way in.

⚠ **THE "TRAIN TOGETHER NEEDS TWO DEVICES" PARAGRAPH IS THE ONE THAT EARNS ITS PLACE.** A reviewer who
taps it, sees nothing happen, and is not told why has found a broken feature. Named up front, it is a
documented limitation instead.

⚠ **DO NOT ADD THE PROGRAM-CATALOGUE COUNT** here or anywhere in the listing — the catalogue is a discover
shelf and Coach Holt is the product, so the number reads as a shortfall.

---

## 4 · Still open in §10

- **Screenshots** — one iPhone size, **6.5" OR 6.9", not both**. Real captures; the landing page's phone
  mockups are HTML recreations and must never be used.
- **App Privacy labels** — written (`Docs/App-Store-Privacy-Labels.md`) but ⛔ **not signable until the
  paywall build is decided**; `Purchases → Purchase History` flips to *Yes* when RevenueCat ships.
