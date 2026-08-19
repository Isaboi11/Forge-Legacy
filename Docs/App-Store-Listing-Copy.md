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

Indexed for search and shown under the name everywhere. Three options; **I recommend A.**

| | Text | Chars | The trade |
|---|---|---|---|
| **A ✅** | `Workout log & strength tracker` | **30** | Maximum search reach. Every word is a term people actually type. Says nothing distinctive — but the *name* carries the brand and the description carries the soul, and a new app with no awareness cannot afford a subtitle that no one searches. |
| B | `Lift. Log. Keep the record.` | 27 | The voice, exactly. Wins on a store page someone was sent to; loses on a store page someone has to find. |
| C | `Strength log & training squad` | 29 | A compromise. "Squad" is low-volume as a search term, so it buys less reach than it looks like it does. |

⚠ **Whichever you pick changes §4.** Apple indexes the name and subtitle already, so keywords must not
repeat those words — the keyword list below assumes **A**.

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
| **Age rating** | ⛔ **Blocked — see §7.** Answer the questionnaire honestly *after* the UGC controls exist, not before. |

---

## 7 · ⛔ BLOCKER FOUND WHILE WRITING THIS — Guideline 1.2

**The app has user-generated content and does not have the controls Apple requires for it.**

A repo-wide search on 2026-08-19 found **exactly one Report control in the entire binary**:

> `src/app/squad-settings.tsx:688` — `showToast('Reporting a squad is coming soon')`

There is **no report on a post, comment, photo or check-in video · no block · no mute · and no backing
table.** `grep "create table.*(block|report)"` across all 170 migrations returns nothing.

**App Store Review Guideline 1.2 requires apps with user-generated content to have all four of:**

| | Requirement | State |
|---|---|---|
| 1 | A method for filtering objectionable material | ⛔ none |
| 2 | A mechanism to report offensive content, **and timely responses** | ⛔ a toast saying "coming soon" |
| 3 | The ability to **block abusive users** | ⛔ none |
| 4 | Published contact information | ✅ `forgelegacy.app/support`, live 08-18 |

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

- [ ] **Pick a subtitle** (§2) — everything else is written.
- [ ] **Screenshots** — one iPhone size, **6.5" OR 6.9", not both**. ⚠ Real captures of the running app.
      The landing page's phone mockups are HTML recreations: reuse their art direction (bronze, `#0C1013`,
      the wordmark) as the frame, **never their mock UI as the screenshot**.
- [ ] **Age rating** — blocked on §7.
- [ ] **Guideline 1.2 controls** — §7. Needs a decision before it needs code.
