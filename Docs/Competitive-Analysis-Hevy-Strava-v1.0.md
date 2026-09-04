# Competitive Analysis — Forge Legacy vs. Hevy vs. Strava

**Version:** v1.0 · 2026-09-04
**Type:** App-vs-app teardown (not marketing sites — that was the Aug 2026 four-way site teardown)
**Method:** every Forge Legacy claim below is grounded in this repository. Competitor facts are from the
Aug 2026 teardown and public product surfaces; anything not independently verifiable is marked ≈.

---

## Section 0 — The one-paragraph answer

**Hevy is a better logbook than us. Strava is a better run tracker than us. Neither is a coach, and
neither remembers your life.** Forge Legacy is the only one of the three that (a) writes you a program,
(b) logs lifts *and* runs in one record, and (c) treats training as a story with chapters, honors and a
permanent legacy. Our gaps are almost entirely **plumbing** — Apple Health, Apple Watch, splits, export,
import — not product. Their gaps are **structural**: Hevy would have to become a coach; Strava would have
to become a strength app. Ours are three to six weeks of work. Theirs are a rewrite.

**The uncomfortable number:** we are the most expensive of the three.

| | Free tier | Paid |
|---|---|---|
| **Hevy** | Very generous — unlimited logging | Pro ≈ **$23.99/yr** ($2.99/mo, $74.99 lifetime) |
| **Strava** | Record + basic feed | ≈ **$79.99/yr** |
| **Forge Legacy** | Capped: 3 programs · 75 photos · 1 squad | **$99.99/yr** (Founder $149 lifetime, first 100) |

At **4× Hevy's price**, we cannot win on "logbook plus a map." Coach Holt and Legacy have to carry the
price — and every gap in Sections 2 and 3 is a reason a shopper says *"it doesn't even sync to my watch"*
before they ever meet Holt. That is the real cost of the plumbing gaps: **they kill us at the store page,
not in use.**

---

## Section 1 — Where we win

### 1.1 Coach Holt — neither competitor writes you a program *(decisive)*

Hevy gives you an empty routine builder. Strava gives you a training-plan PDF at best. Forge Legacy
generates a program per athlete, deterministically, across **10 goals**, from the tables in
`src/domain/coach/rulebook/` (skeletons, volume, preferences, limitations, cues, endurance). It adapts a
program already running, answers in-workout, learns *preference* from swaps, and refuses rather than
guesses on endurance.

**Why it is a moat:** it is authored content, not an algorithm. A competitor cannot ship it by adding a
screen — they would have to write the rulebook, and that took months.

### 1.2 One record for lifting AND running

Hevy cannot track a run. Strava treats a lifting session as a checkbox with a duration. We do both, in
one history, one Progress hub, one Rank engine — with real GPS (`src/domain/run/`: background tracking
that survives screen lock, accuracy filtering at 65 m, drift rejection, elevation gain, live pace cues)
and a real Apple Maps route (`src/components/workout/RouteMap.tsx`).

**Who this wins:** the hybrid athlete — lifts four days, runs three — who currently pays for two apps.

### 1.3 Legacy — nobody else has a permanent record

Chapters, sealing ceremonies, **179 awardable honors** across 14 categories, a Rank engine, pinned
accomplishments, the transformation gallery, weekly narrative reviews. Hevy has a workout count. Strava
has a yearly recap.

**Why it is a moat:** it is a *switching cost we build for the athlete*. Three years of Hevy history is a
CSV. Three years of Forge Legacy is a legacy you cannot export and would not want to.

### 1.4 Squads beat both social models

Ours: private, request-only, capped at 50, with challenges, squad records, champions, recaps, and now
**posted workouts** (Squad Amendment 005 — a squadmate posts tomorrow's session, you tap *Take it*, and it
lands on your Home hero). Hevy is a global follow feed of strangers. Strava clubs are billboards.

**Deliberate non-features:** Follow is not being built, and Communities is deferred. Those are decisions,
not gaps.

### 1.5 The exercise catalogue is not close

| | Exercises | Coaching content | Demo media | Relationship graph |
|---|---:|---|---:|---:|
| **Forge Legacy** | **797** (735 published) | Full coaching per exercise | **703 loops + posters** | **5,678 relationships** |
| Hevy | ≈400 | Minimal | Basic images | none |
| Strava | n/a | n/a | n/a | n/a |

The 5,678-relationship graph (substitutions, related movements) is what powers Holt's swaps and the
picker. Neither competitor has an equivalent.

### 1.6 Train Together / live sessions

Two athletes in the same session in real time (`0181_live_sessions`, `train-together-live.ts`). Neither
competitor has it. Strava's closest is Beacon, which is a safety feature, not a shared workout.

---

## Section 2 — Where Hevy wins

| # | Gap | What it costs us | Our state |
|---|---|---|---|
| **H1** | **Apple Watch app** — standalone logging on the wrist | The most common "why I left" for a lifting app | Nothing shipped. `targets/watch/` scaffolded; `Apple-Watch-Companion-Build-Plan.md` is PROPOSED — 4–5 weeks, needs a Mac |
| **H2** | **Apple Health sync** | No heart rate, no calories, no rings, no data either direction | **Zero.** `HealthKit` appears once in the repo, in a web stub |
| **H3** | **Import from another app** (Strong / Hevy CSV) | A switcher must abandon their history — the #1 acquisition blocker | Program/plan import exists (CSV/XLSX/PDF). **Completed-workout import does not** |
| **H4** | **Data export** | App Store / GDPR expectation, and a trust signal | None. `src/domain/settings/content.ts:51` literally reads *"If a data export is built…"* |
| **H5** | **Offline-first with a sync queue** | Gym basements have no signal | Half-closed: the active session autosaves to AsyncStorage (`domain/workout/autosave.ts`), but **the final save is a bare insert with no retry queue**, and every history/feed read needs network |
| **H6** | **Plate calculator** | Small feature, disproportionate lifter goodwill | None |
| **H7** | **Web app for building routines** | Desk-planning is real behaviour | We have a web *preview* of the phone app, not a desktop surface |
| **H8** | **Widgets / Siri / quick-log** | Friction at the top of the funnel | None |
| **H9** | **Maturity** — 5+ years, millions of users, thousands of ratings | Store-page credibility | Pre-launch. Gated on shipping, not buildable |

**Where we already match Hevy — these are NOT gaps, they are built:** rest timer with auto and manual
modes, supersets, RPE, warm-up / to-failure / timed set types, per-set and per-exercise notes,
previous-performance history inside the logger, PR detection against real history, 1RM estimates, charts.

---

## Section 3 — Where Strava wins

| # | Gap | What it costs us | Our state |
|---|---|---|---|
| **S1** | **Segments + leaderboards** | The strongest retention mechanic in fitness | Squad records + Champions are the analogue, but only inside a squad |
| **S2** | **Device ecosystem** — Garmin, Wahoo, COROS, Apple Watch auto-import | Serious runners own a watch and will not carry a phone | None. `External-Activity-Import-Architecture-Evaluation.md` recommends **no imports at launch** — deliberate |
| **S3** | **Heart rate** | No effort metric at all | **Zero** — no Health, no BLE |
| **S4** | **Per-mile / per-km splits** | Table stakes for any run tracker | **Not recorded.** `src/app/activity/[id].tsx:45` says so in a comment: the design's splits are *"decorative offsets off the average"* |
| **S5** | **Route planning, discovery, heatmaps** | Finding somewhere to run | We render a route we recorded; we cannot plan one |
| **S6** | **Sport breadth** — swim, ski, hike, outdoor row | Multi-sport athletes | Run / walk / bike + indoor cardio activities |
| **S7** | **Network size** — ≈150M athletes, contact import | Your friends are already there | Squads start empty |
| **S8** | **Photos on the activity itself** | The share loop | Photos go through squad posts, not the activity record |

**Where we already match or beat Strava:** background GPS that survives screen lock, accuracy and drift
filtering, elevation gain, live pace cues with sustained-state hysteresis, and opt-in-per-post route
sharing with consent (`0185`). The **untrimmed** route is a PO decision, not an oversight.

---

## Section 4 — The gap-closing plan, ranked

Ranked by **value ÷ cost**, not by size. Everything in Tier 1 is days, not weeks, and ships by OTA.

### Tier 1 — do these first (≈1.5 weeks total)

| Rank | Fix | Closes | Cost | Why now |
|---:|---|---|---|---|
| **1** | **Per-mile / per-km splits** | S4 | **~0.5 day** | Pure function over data we already store. Every `TrackPoint` carries cumulative miles and a timestamp — splits are a fold over the existing track. No schema, no migration, no native code |
| **2** | **Plate calculator** | H6 | **~1 day** | Pure domain plus one sheet. The highest goodwill-per-hour item in this document |
| **3** | **Data export** (JSON + CSV of workouts, runs, PRs) | H4 | **~1.5 days** | The App Store expects it, `content.ts` already promises it conditionally, and it is a *trust* feature that costs us nothing — nobody leaves because export exists |
| **4** | **Offline save queue** | H5 | **~2 days** | The session already survives locally; what is missing is a failed final save retrying on reconnect instead of surfacing an error. Closes the most damaging review there is: *"it lost my workout"* |
| **5** | **Photos on the activity record** | S8 | **~1.5 days** | We already own the picker, the bucket and the compressor. Wiring, not building |

### Tier 2 — the acquisition unlock (≈1 week)

| Rank | Fix | Closes | Cost | Note |
|---:|---|---|---|---|
| **6** | **Hevy / Strong CSV history import** | H3 | **~4–5 days** | ⚠ **This is NOT the feature `External-Activity-Import-Architecture-Evaluation.md` deferred.** That evaluation deferred *OAuth sync from Strava / Garmin / Health*, on de-duplication and auth grounds. A one-time CSV upload of strength history has **no OAuth, no ongoing sync and no multi-source dedupe** — every blocker it named is absent. We already own `import-parse.ts` and `pick-text-file.ts`. This is the single highest-value acquisition fix in the document |

### Tier 3 — the real infrastructure (weeks, post-launch, needs a Mac)

| Rank | Fix | Closes | Cost | Note |
|---:|---|---|---|---|
| **7** | **Apple Health read + write** | H2, S3, part of S2 | **~1–2 weeks** | The highest-leverage single integration here. It gets us **heart rate, calories and steps without building one device integration** — a Garmin or an Apple Watch already writes to Health, so Health is a *proxy for the whole ecosystem*. Needs a third-party HealthKit module and a dev build; Expo ships no first-party HealthKit |
| **8** | **Apple Watch companion** | H1 | **4–5 weeks + a rented Mac** (~$60) | Already planned and costed. Do **not** start before launch |
| **9** | **"Route repeat"** — the same route run again, compared against your own past | S1, partially | **~3 days** | The cheap 80% of segments without becoming Strava. We already store routes; matching a new route against your own previous ones gives the *"did I beat myself"* payoff without a global leaderboard we cannot populate pre-launch |

### Deliberately NOT closing

- **Global segments and public leaderboards.** They need scale we do not have, and an empty leaderboard is
  worse than none. Squad records are the right shape for our size.
- **A global follow feed of strangers.** Already decided — Follow is not being built.
- **OAuth sync from Strava / Garmin.** The existing evaluation's reasoning holds; revisit post-launch.
- **Competing on price.** We will not reach $23.99. The answer is to be worth $99.99, not to be cheaper.

---

## Section 5 — What to tell a shopper

Honest positioning, in the order it should be said:

1. *"It writes your program."* — the thing neither competitor does.
2. *"Lifts and runs in one place."* — the two-app problem, solved.
3. *"Your squad, not a feed of strangers."*
4. *"Everything you have ever done, kept."*

`Docs/App-Store-Listing-Copy.md:125` already says the quiet part out loud — no Watch, no Health, no Strava
sync, iPhone only. **Keep that paragraph.** It converts worse and retains better, and after Tier 1 and
Tier 2 it gets meaningfully shorter.

---

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-09-04 | Initial app-vs-app teardown. Grounded every Forge Legacy claim in the repository. Found our gaps are plumbing (Health, Watch, splits, export, import) rather than product, and theirs structural. Ranked nine fixes by value ÷ cost. Identified CSV history import as distinct from the deferred OAuth-sync evaluation and therefore available now. Named the $99.99 vs $23.99 price asymmetry as the fact that makes the plumbing gaps expensive at the store page rather than in use. |
