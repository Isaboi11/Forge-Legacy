# App Store listing copy

**v1.0 · 2026-08-19 · Launch Checklist §10.5**

Paste-ready text for App Store Connect. Voice taken from **Landing v6** (`site/index.html`), which is
PO-approved copy — the listing and the site should sound like the same product, because a visitor who
reads one and then the other is the normal path.

**Standing constraints, all of them load-bearing:**

- ⛔ **Never state the program-catalogue count.** The catalogue is a DISCOVER shelf; Coach Holt is the
  product. The number reads as a shortfall (PO, 2026-08-12).
- ⛔ **No competitor is named, anywhere.** The landing page holds that line in a comment and this holds it too.
- ⛔ **Do not call Coach Holt "AI".** It is a deterministic rulebook — `domain/coach/rulebook/`. The
  sentence-reading Edge Function is explicitly out of scope before full release. *"An AI coach"* would be a
  claim the binary cannot honour.
- ⛔ **Promise no Android, Apple Watch, Apple Health / Strava sync, or CSV export.** None exists. §10's
  "Known gaps" records them as accepted; the listing must not quietly un-accept them.
- ✅ **"Free to start" survives Phase F** and is safe to write today. *"Free while we're testing"* does not —
  never use it here.

---

## 1 · App Name — 30 characters

```
Forge Legacy
```
*12 / 30.*

---

## 2 · Subtitle — 30 characters

Indexed for search and shown under the name everywhere. **✅ PO CHOSE A, 2026-08-19. This is the one to
paste — the options below are kept only as the record of why.**

```
Workout log & strength tracker
```
*30 / 30 — exactly at the limit, so **any edit is a rewrite**, not a tweak.*

| | Text | Chars | The trade |
|---|---|---|---|
| **A ✅ CHOSEN** | `Workout log & strength tracker` | **30** | Maximum search reach. Every word is a term people actually type. Says nothing distinctive — but the *name* carries the brand and the description carries the soul, and a new app with no awareness cannot afford a subtitle that no one searches. |
| B | `Lift. Log. Keep the record.` | 27 | The voice, exactly. Wins on a store page someone was sent to; loses on a store page someone has to find. |
| C | `Strength log & training squad` | 29 | A compromise. "Squad" is low-volume as a search term, so it buys less reach than it looks like it does. |

✅ **§4 IS THEREFORE CORRECT AS WRITTEN AND NEEDS NO EDIT.** Apple indexes the name and subtitle already,
so keywords must not repeat those words — and the keyword list below was written assuming **A**, which is
why `workout`, `log`, `strength` and `tracker` are deliberately absent from it. ⚠ **If the subtitle is
ever changed, §4 must be rewritten in the same pass**, or the list will either duplicate indexed terms
(wasting characters) or drop terms nothing else covers.

---

## 3 · Promotional Text — 170 characters

Editable **without a review**, unlike everything else here. Use it for launch and seasonal messaging.

```
Log a set in under two seconds, one-handed, at the rack. Name and seal the chapters of your training. Keep a rank that never goes down. Free to start.
```
*149 / 170.*

---

## 4 · Keywords — 100 characters

Comma-separated, **no spaces after commas** (a space costs a character and buys nothing). Singular only —
Apple matches plurals itself. Assumes subtitle **A**, so `workout`, `log`, `strength` and `tracker` are
deliberately absent — they are already indexed.

```
gym,lifting,barbell,powerlifting,routine,program,PR,squat,bench,deadlift,progress,rep,set,coach
```
*94 / 100.*

⚠ **Do not add `fitness` or `health`** — the category already supplies them.
⚠ **Do not add a competitor's name.** It is against Apple's rules and it is the line the landing page holds.

---

## 5 · Description — 4000 characters

```
Most training apps are a very good list of workouts.

Forge Legacy is the record of what those workouts made you.

THE TRACKER
Log a set in under two seconds, one-handed, at the rack. Weight and reps in one sheet — type it or spin the wheel. The rest timer keeps running when you leave the app. Autosave survives losing signal mid-workout. Records are caught as you lift, not calculated later.

A COACH THAT BUILDS THE PROGRAM
Answer a few questions — your goal, your experience, how many days you can train, what equipment you can reach — and Coach Holt builds you a full program. Not a template with your name on it: a plan assembled from your answers, for strength, muscle, fat loss, general health, athleticism, or a race from a 5K to a full marathon.

Holt reads your last two sessions on a lift and tells you whether to add weight, add reps, hold, or back off. Mid-set, it will suggest the next weight. You decide. Nothing moves on one session, and nothing changes without telling you why.

Already run a program you like? Bring it. Paste it in from a spreadsheet or build it by hand, and train it inside Forge.

CHAPTERS YOU KEEP
Training happens in seasons. Name yours. "The Year I Got Serious." "Coming Back From Injury." Set a primary goal, train through it, and when it's done, seal it — with a reflection you write at the end, when you actually know what it meant.

A sealed chapter is permanent. Memories can be added. History cannot be rewritten.

A RANK THAT NEVER GOES DOWN
No streak to break. No punishment for a week off. Rank is earned from what you have actually done, and once you have earned it, it is yours. Come back after three months away and it is exactly where you left it.

A SQUAD, NOT AN AUDIENCE
A few real people, by invitation. Shared goals, check-ins, a private feed, and competitions among people who know you. No public feed. No follower count. No strangers.

PRIVATE BY DEFAULT
Nothing posts on its own. Nothing is shared until you share it. There are no ads, no advertising SDKs, and no tracking across other apps or websites — and there never will be. Your training record is yours.

WHAT ELSE IS IN THERE
· A library of exercises with demonstration loops and coaching cues
· Personal records caught automatically, across every lift
· Goals that track themselves from the training you already logged
· Honors for the things worth marking
· Progress photos and a transformation gallery, private unless you choose otherwise
· Runs, walks, rides, rows and swims — with route, pace and elevation
· Accomplishments and a trophy case for the moments that are not a number

WHAT IT IS NOT
Forge Legacy is iPhone only. There is no Android version and no Apple Watch app. It does not sync with Apple Health or Strava. If those are what you need, this is not the app for you yet — and we would rather say so here than have you find out after you have paid.

Free to start.

Build your story. Forge your Legacy.
```
*≈2,470 / 4000 — comfortable, and the room is deliberate: a description that fills the box is one nobody
finishes reading.*

⚠ **"WHAT IT IS NOT" stays in.** It is four lines against conversion and it is the honest half of the
"Known gaps" list — the same section that records *"say it rather than let it be discovered."* An iPhone-only
app that never says so collects one-star reviews from Android and Watch users who feel misled, and those
reviews are permanent in a way the sentence is not.

---

## 6 · Category and rating

| Field | Answer |
|---|---|
| **Primary category** | Health & Fitness |
| **Secondary category** | Leave **empty**, or Social Networking. ⚠ Secondary does not help search — it only adds a browse path. Social Networking invites a heavier UGC read from review; see §7. |
| **Age rating** | ✅ **13+ (16+ in Australia) — ENTERED AND SAVED IN APP STORE CONNECT 2026-08-20.** Unblocked 2026-08-19 when the §7 controls shipped. The full answer sheet is §6b — do not answer the questionnaire from memory, it changed. |

---

## 6b · Age rating — the answer sheet

> ✅ **ENTERED AND SAVED IN APP STORE CONNECT — 2026-08-20 (PO).** Not just answered on paper: the
> questionnaire is filled in and the calculated rating came back **`13+`**. ⚠ **It is editable until the
> version is submitted, and it must be re-checked if the app gains a capability** — the two that would move
> it are a real age gate (Age Assurance) and any coaching copy that starts advising on injuries (Medical or
> Treatment Information → 16+). One trap was hit on the way in; it is written up in the click-path below so
> it costs nobody a second attempt.

### Where to click (do this part in a browser; nothing here can be done from the repo)

1. **appstoreconnect.apple.com** → sign in → **My Apps** → **Forge Legacy**.
2. Left sidebar, under the version you are preparing → **App Information**.
3. Scroll to **Age Rating** → click **Edit** (or **Set Age Rating** if it has never been answered).
4. A questionnaire opens as a series of pages. **Work down the three tables below in order — they are in
   Apple's own order**, so each page's questions appear as you come to them. Anything not listed below is
   answered **None / Not Present**; the tables list every non-default answer this app has.
5. The bottom of the dialog shows the rating it computed. ⚠ **It must read `13+`.** If it reads anything
   else, an answer was mistyped — check *Social Media* and *Contests* first, they are the two that set it.

   ⛔ **HIT ON THE FIRST ATTEMPT, 2026-08-20. STEP 1 HAS A SEPARATE ROW CALLED "SOCIAL MEDIA DISABLED FOR
   USERS UNDER 13", IT SITS BELOW THE FOLD, AND IT MUST BE `NO`.** It is its own Yes/No row directly under
   *Social Media* — not one of that question's answers — and the panel scrolls, so it is easy to leave on
   the wrong setting without ever seeing it. Setting it to Yes makes **Step 7** refuse to save with *"you
   must choose **Yes** for Social Media, User-Generated Content, and **Age Assurance**."*
   ⚠ **Read what the row actually commits to:** *"the **Declared Age Range API** is called to check users'
   age ranges before enabling social media features."* **Forge does not call that API** — there is no age
   gate and no date-of-birth field anywhere in onboarding — so Yes would declare a feature that would then
   have to be built. Age Assurance stays **No** for the same reason. The calculated rating is `13+` either
   way; only the false declaration differs.
   **Step 1 in full, top to bottom:** Parental Controls **No** · Age Assurance **No** · Unrestricted Web
   Access **No** · User-Generated Content **Yes** · Social Media **Yes** · Social Media Disabled for Users
   Under 13 **No** · Messaging and Chat **Yes** · Advertising **No**.
6. **Save.** ⚠ It does not take effect until the version is submitted, and it can be edited until then.

⚠ **Do this in the SAME sitting as the App Privacy labels only if the paywall build is decided** — §10.7's
warning still stands: `Purchases → Purchase History` flips to *Yes* the moment RevenueCat ships.


**Answered 2026-08-20 against Apple's CURRENT questionnaire.** ⚠ **The questionnaire is not the one this
project was written against.** Apple replaced it in 2025: the tiers are now **4+ / 9+ / 13+ / 16+ / 18+**
(12+ and 17+ are gone), and it is split into **In-App Controls · Capabilities · Content Descriptors**
rather than a flat list of content questions. Every developer had to re-answer by **31 January 2026**.
⚠ **A second change lands in September 2026: the Social Media questions become REQUIRED to submit** — a new
app, an update, or a notarisation. We are submitting into that window, so it is not optional for us.

Sources: [Age ratings values and definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/) ·
[Updated age ratings in App Store Connect](https://developer.apple.com/news/?id=ks775ehf) ·
[Age rating questionnaire now includes social media questions](https://developer.apple.com/news/?id=tlur8uvi)

### In-App Controls

| Question | Answer | Why |
|---|---|---|
| **Parental Controls** | **Not Present** | No parental-control surface exists. P-4→P-9 has no such screen and none is planned for V1. |
| **Age Assurance** | **Not Present** | There is no age gate and no date-of-birth field anywhere in onboarding. |

### Capabilities

| Question | Answer | Why |
|---|---|---|
| **User-Generated Content** | **Present** | Squad posts, comments, reactions, check-in photos and video, handles, display names, shared workout notes. Forces 4+ only. Answering *Not Present* here would contradict §7's whole build. |
| **Messaging and Chat** | **Present** | *"Users can directly communicate with one another through features within the app."* Squad post comments are athlete-to-athlete. Forces 4+ only.<br>⚠ **Coach Holt is NOT this.** It is a deterministic rulebook (`domain/coach/rulebook/`) with no other human on the other end — see §1's standing rule about never calling it AI. **There are no DMs**; `CoachChatSheet` and `chat-core.ts` are the only chat surfaces and both talk to the rulebook. |
| **Social Media** | ⚠ **Present** — **this is the answer that sets the rating** | Apple: *"Redistribution, amplification, or interaction with user-generated content through a social feed or similar discovery method that visibly spreads content to many users."* Forge has a squad feed, a friends feed, comments, reactions and a **Discover** surface that lets a stranger request into a squad of up to 50. **Forces 13+ (16+ in Australia)** and adds a **Social Media descriptor** to the product page. See the judgement call below. |
| **Unrestricted Web Access** | **Not Present** | `components/external-link.tsx` is the only browser path and `openBrowserAsync` opens a fixed set of our own URLs (privacy, terms, support). No address bar, no arbitrary navigation. ⚠ **This one is worth protecting** — answering it wrong forces **16+** on its own. |
| **Advertising** | **Not Present** | `package.json` carries no ad SDK. Same evidence that lets `Docs/App-Store-Privacy-Labels.md` answer *no tracking* and skip the ATT prompt — verifiable rather than asserted. |

### Content descriptors

| Descriptor | Answer | Forces | Why |
|---|---|---|---|
| **Health or Wellness Topics** | **Present** | 9+ | Apple's own definition names *"exercise recommendations"* as the example. That is the product. Answering *None* would be plainly false. |
| **Medical or Treatment Information** | **None** | — | ⚠ **The judgement call. See below.** |
| **Contests** | **Frequent** | 13+ | Apple: *"Events that allow users to compete with one another for rankings, rewards, or the achievement of personal goals."* Competitions, Challenges, Honors and Goals are all four of those, always available, so **Frequent** is the honest frequency. *Infrequent* would be 4+ — and the answer costs us nothing, because Social Media already sets 13+. |
| **Gambling · Simulated Gambling · Loot Boxes** | **None** | — | No wagering, no randomised rewards, no purchasable containers. Honors are earned deterministically from a table (`honor_catalog`). |
| **Cartoon/Fantasy Violence · Realistic Violence · Prolonged Graphic Violence · Guns or Weapons** | **None** | — | Nothing in the catalogue, the artwork or the coaching content depicts conflict. |
| **Mature/Suggestive Themes · Sexual Content or Nudity · Graphic Sexual Content** | **None** | — | Transformation photos (L-17) are a private personal archive, and the check-in/progress photo surfaces are clothed training photos. |
| **Profanity or Crude Humor** | **None** | — | The app ships no profanity of its own — verified by grep over the rulebook, settings copy and catalogue. ⚠ **User-generated language is declared through the Capabilities answers and controlled by `0171`/`0173`, not through this descriptor.** This descriptor is about the app's authored content. |
| **Alcohol, Tobacco, or Drug Use** | **None** | — | Verified 2026-08-20 by grep for alcohol / beer / wine / tobacco / nicotine / steroid / creatine / caffeine / pre-workout / supplement across `domain/coach/rulebook/`, `domain/settings/content.ts` and `exercises.json`. **Zero hits.** ⚠ If supplement guidance is ever authored, this becomes *Infrequent* → **13+**, which we already are. |

### ⚠ Two judgement calls, both recorded so they can be disagreed with

**1 · Social Media = Present, and it is the reason the rating is 13+.**
An argument exists for *Not Present*: squads are capped at 50, joining is request-only, friends are mutual,
and **there is no follower system and never will be** — that is a settled decision, not a gap. So content
does not "visibly spread to many users" the way a public feed does.
**It is answered Present anyway.** A reviewer who opens Discover, joins a squad and sees a feed with
comments and reactions will call that a social feed, and the cost of being wrong is asymmetric: an
understated capability on an app that just failed Guideline 1.2 for the same *kind* of omission is the
worst possible second impression. **13+ costs a strength-training app nothing.** ⚠ The third option,
*"Social Media Disabled for Users Under 13"*, does **not** apply to us — it requires an age gate we do not
have, and choosing it would be a false declaration.

**2 · Medical or Treatment Information = None, and this one has a real trigger attached.**
Apple: *"Content that provides diagnoses or guidance around the management of medical conditions."*
*Infrequent* forces **13+**, *Frequent* forces **16+**.
The closest thing we ship is `domain/coach/rulebook/limitations.ts`, whose own header says it is *"the
closest thing in the app to health guidance"*. It was read for this answer: it contains **no diagnosis, no
treatment, no injury vocabulary at all** — a grep for medical / injur / pain / doctor / physician / diagnos
returns nothing. It is a mechanical exclusion map (*this pattern loads that joint, so remove it*), and its
header states outright that it is *"not a clinical recommendation."*
⛔ **This answer is conditional on that staying true.** If `limitations.ts` — or Coach Holt's copy, or any
coaching content — ever starts telling an athlete what to do about an injury, this becomes **Infrequent at
best and the rating moves to 16+**. Note it in the file review that `limitations.ts` is still owed.

### The result

**13+ · 16+ in Australia.** Driven by Social Media, and independently by Contests–Frequent, so it is a
robust answer rather than one hanging off a single debatable box. Nothing here forces 16+ or 18+, and
**Unrestricted Web Access is the only remaining question that could** — keep answering it *Not Present*.

---

## 7 · ⛔ BLOCKER FOUND WHILE WRITING THIS — Guideline 1.2 · ✅ **CLOSED**

> **✅ RESOLVED 2026-08-19 — BUILT, APPLIED AND DEPLOYED.** `0171` is applied and verified (both
> enforcement counts 4), and the client half went out the same day: web `entry-69d5be42…`, OTA
> `01a01bda-3b69-727c-b0b0-7006e229cf1b` on build 6's runtime, `fingerprint:compare` matched **before**
> publishing. Blocks are symmetric and sever the friendship; reports exist on post, comment, check-in,
> person and squad; `/admin` has a queue with an oldest-still-open line; `/blocked` is in Settings; a
> handle and name filter runs in a `security definer` trigger.
>
> **✅ AND THE FILTER LIST IS NOW SEEDED — `0173`, 2026-08-20.** `0171` shipped the filtering *mechanism*
> with an impersonation-only list and wrote the shortfall into its own header so it could not pass as done.
> `0173` adds 37 patterns and, more importantly, **eighteen documented exclusions** — `rapist` is inside
> `therapist` and `pedo` is inside `pedometer`, both of which are handles a real athlete on a *fitness* app
> would pick. It asserts both directions: 8 known-bad rejected, 20 known-good untouched.
> ⏳ **`0173` is authored, NOT YET APPLIED** — paste `supabase/apply/pending-0173.sql`. It needs no deploy;
> the trigger reading the table has been live since 0171.
>
> ⚠ **Two things are still openly not done, by decision, and are recorded rather than closed:** the filter
> covers **handles and names only**, not post bodies or comments (those rest on report + block + takedown,
> the after-the-fact half of the guideline), and **blocked athletes still appear in competition standings**
> — a scoreboard of numbers is not authored content.
>
> **This unblocked §6b, the age rating**, which could not be answered honestly while the controls were
> missing. The section below is kept **as it was found**, because the finding is the lesson.

**As found 2026-08-19: the app has user-generated content and does not have the controls Apple requires for it.**

A repo-wide search on 2026-08-19 found **exactly one Report control in the entire binary**:

> `src/app/squad-settings.tsx:688` — `showToast('Reporting a squad is coming soon')`

There is **no report on a post, comment, photo or check-in video · no block · no mute · and no backing
table.** `grep "create table.*(block|report)"` across all 170 migrations returns nothing.

**App Store Review Guideline 1.2 requires apps with user-generated content to have all four of:**

| | Requirement | As found 08-19 | Now |
|---|---|---|---|
| 1 | A method for filtering objectionable material | ⛔ none | ✅ `moderation_blocklist` + trigger (`0171`), **46 patterns once `0173` is applied** — handles and names only |
| 2 | A mechanism to report offensive content, **and timely responses** | ⛔ a toast saying "coming soon" | ✅ report on post / comment / check-in / person / squad + an `/admin` queue with an oldest-still-open line |
| 3 | The ability to **block abusive users** | ⛔ none | ✅ symmetric block, severs the friendship, `/blocked` in Settings, enforced server-side |
| 4 | Published contact information | ✅ `forgelegacy.app/support`, live 08-18 | ✅ unchanged |

⚠ **"It is only a private squad" does not exempt it.** Squads have Discover and request-to-join, so a person
you have never met can enter a squad and post into a feed you read. Friends are mutual, but a squad is not.
The content in scope is real: squad posts, comments, reactions, check-in photos and video, display names,
handles, and shared workout notes.

⚠ **The "coming soon" toast is worse than no button.** It demonstrates, inside the binary, that the need was
known and not met. A reviewer who taps it has found the finding for you.

**This is a submission blocker, not a listing detail, and it appears on no launch document** — not GO-LIVE's
⛔ LEFT list, not the checklist's §10, not the Known Gaps section. It is closest to the open item recorded in
`project_communities_architecture` — *"no platform-level moderation escalation"* — which was filed against
Communities, a subsystem that is deferred and unbuilt, and so read as a future problem. **Squads shipped, and
the same gap came with them.**

**Not designed here, because the shape is a product decision:** block-versus-mute, whether a report notifies
the squad owner or the operator, and what `/admin` shows are all real choices. What is not a choice is that
some form of all three must exist before submission.

---

## 8 · What still needs you

- [x] **Subtitle — ✅ CHOSEN 2026-08-19: A, `Workout log & strength tracker`** (§2). Exactly 30/30, so any
      later edit is a rewrite. **§4's keyword list already assumed A and therefore needs no change** — but
      the two move together, and changing one without the other is the failure mode §2 now warns about.
- [x] **Screenshots — ✅ SHOT AND FRAMED 2026-08-19. Eight, at 6.9" (1320 × 2868).**
      Captured on an iPhone 16 Pro Max, whose native resolution **is** an accepted 6.9" size, so nothing
      was scaled. Raw captures in `…/OneDrive/ForgeLegacy-AppStore/raw`, framed finals in
      `…/final/01–08.png`, upload in numeric order.
      Order and captions: **01** active workout *"Log a set in under two seconds."* · **02** a Holt-built
      12-week block *"Coach Holt builds the program."* · **03** a sealed chapter *"Seal a chapter. It's
      permanent."* · **04** Home *"Pick up where you left off."* · **05** rank **"Everyone starts at
      zero."** *(recaptioned 2026-08-20; was "Earned once. Yours for good.")* · **06** squad feed *"A few
      real people. No audience."* · **07** competition standings
      *"Compete with people who know you."* · **08** exercise detail *"Every movement, demonstrated."*
      The order follows §5's pillars, and 01–03 carry the pitch because Apple shows only the first three
      in search results.
      ⚠ **EVERY FRAME IS CROPPED BELOW THE STATUS BAR**, which is what removes a third-party media-player
      pill that was sitting in the Dynamic Island on four of the captures — and, on 02, the pinned
      **Delete Program** button, which is red and cannot be scrolled out of frame in-app. Cropping a real
      capture onto a caption band is the art direction this section always meant; the mock UI is still
      never the screenshot.
      ⚠ **06 AND 07 ARE THE REVIEWER DEMO ACCOUNT, DELIBERATELY.** The PO's own circle is empty, and real
      testers' names and handles in a store screenshot are public forever and would need each person's
      consent. `reviewer-seed.mjs` builds *Iron Circle* with a second member, posts from both authors and
      a two-entrant competition — content that is ours to publish.
      ~~⛔ **05 IS THE WEAK FRAME AND SHOULD BE RESHOT BEFORE SUBMISSION.**~~ ✅ **RESOLVED 2026-08-20 —
      BY RECAPTIONING, NOT RESHOOTING.** The frame reads *"I've started."*, `LIFETIME 5` and *"0 of the path
      walked"*, and the old caption *"Earned once. Yours for good."* was a rank pillar illustrated by a rank
      that had not moved. The PO has no rank history to shoot, so the fix was the caption: it now reads
      **"Everyone starts at zero."** and the empty state becomes the point. Full record and the measured
      typography constants are in the checklist item further down this section. Same weakness, smaller, on
      **01** (`LAST —` / `BEST —`, a lift with no history) and **02** (`Workout 0 of 72`), **accepted** —
      a first-session screen is supposed to look new.
- [x] **Age rating — ✅ ANSWERED AND ENTERED IN APP STORE CONNECT 2026-08-20: `13+` (16+ Australia).** The complete question-by-question
      answer sheet is **§6b**, written against Apple's **current** questionnaire — ⚠ **not the one this
      project was originally written against.** Two answers are judgement calls and both are argued in
      writing there: **Social Media = Present** (what sets 13+) and **Medical or Treatment Information =
      None** (conditional on `limitations.ts` never drifting into injury advice). ⚠ **From September 2026
      the Social Media questions are required to submit at all** — we submit inside that window.
- [x] **Guideline 1.2 controls — ✅ BUILT, APPLIED AND DEPLOYED 2026-08-19 (`0171`).** §7 carries the
      resolution banner. ⏳ **One tail: `0173` seeds the filter word list and is authored but NOT applied**
      — paste `supabase/apply/pending-0173.sql`. No deploy needed.
- [x] ✅ **Screenshot 05 — RECAPTIONED 2026-08-20, and the file is replaced.** **PO: *"I don't have enough
      to screenshot the other ranks."*** The account has no rank history and will not have one before
      submission, so a reshoot could never fix it — the "reshoot before submission" instruction above is
      dead and is superseded by this. **The caption band now reads *"Everyone starts / at zero."*** instead
      of *"Earned once. / Yours for good."* Same frame, same capture, one band redrawn: the empty rank stops
      contradicting the caption and becomes the thing the caption is about.
      `final/05.png` is the new file (1320 × 2868, unchanged). The old one is kept one folder up as
      `05-SUPERSEDED-earned-once.png` — **deliberately outside `final/`, so the upload set stays exactly
      eight files.**
      ⚠ **The same weakness exists smaller on 01** (`LAST —` / `BEST —`) **and 02** (`Workout 0 of 72`)
      **and is accepted there** — a first-session screen is *supposed* to look new; only 05 had a caption
      arguing with its own screenshot.

      ⭐ **IF YOU EVER RE-CUT A CAPTION BAND, READ THIS — THE FRAMES ARE SET IN GEORGIA, NOT PLAYFAIR.**
      `--fl-font-display` is `"Playfair Display", Georgia, …`, and the machine that framed these did not
      have Playfair, so **every caption in the set is the fallback.** Rendering the replacement in Playfair
      would have made 05 the one frame in eight with different letterforms. It was caught by re-rendering
      the *old* caption in each candidate and pixel-diffing it against the real file: Playfair 400/500
      peaked at 61–68% ink overlap, **Georgia at 78 px hit 86.4%** (mean abs difference 4.1/255, the
      residual being antialiasing). The measured constants, all at 1320 × 2868:
      **Georgia 78 px · fill `#F2E9DA` · centred on x = 660 · line-1 baseline y = 249 · line-2 baseline
      y = 345 (96 px apart) · bronze rule `#AA7C44`, 92 × 3 px at y = 398–400.**
      ⚠ **`drawtext`'s `y` is the top of the rendered ink, not the baseline**, so it changes with the
      tallest glyph in the string — at 78 px, ascender `d` = 59, cap `E` = 53, `t` = 49. Position from the
      baseline and subtract, or the line will sit wrong by several pixels.
      The band background is a vertical gradient **plus a centred horizontal glow**; a flat fill leaves a
      visible patch. It was rebuilt by taking a text-free row's horizontal profile and re-levelling it per
      row — verified identical to within 1–2 levels across seven clean rows.
