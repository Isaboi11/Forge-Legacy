# Forge Legacy — Calendar System Architecture
## v1.0 | June 2026

**Status:** **LOCKED** v1.0 (foundational system architecture; defines the net-new Calendar timeline layer. Locked and ready for the Architecture Freeze.)

**Type:** Foundational System Architecture — the **governing authority for all calendar/timeline-layer behavior in Forge Legacy.** The Calendar is a **read/write timeline layer, not a domain.** It owns no data; it aggregates and lightly schedules against systems that already exist. Future calendar work inherits from this document; downstream specs are reconciled to reference it.

**Authority (this document inherits from and may not exceed):**
- `FORGE_LEGACY_PRODUCT_DNA.md` (LOCKED) — §1 (Who am I becoming?, not How do I compare?), §2 (Transformation Over Activity; Accountability Without Shame; Story Before Data), §4 (Forge is **not a streak app**), §8 (Progress Without Pressure; Simplicity Wins; Deliberate Interaction), §9 (Never Charge For History; History Cannot Be Rewritten), §10 (Explicitly Prohibited Patterns — **"Streak pressure systems," "Days since workout shame mechanics"** — qualified by "Without a formal architecture review." **§19 of this document is that review**), §11 (Product Decision Test).
- `Forge-Legacy-Master-PRD.md` (LOCKED v1.0) — §6 (5-tab Navigation System as of 2026-07-07, **unaffected by the Calendar**), §8 (Workout System), §9 (Goals), §11 (Program System — defined schedule), §12 (Legacy System), §19 (Information Architecture).
- `Social-System-Architecture-v1.0.md` (LOCKED) — **SOC-D2** (relationships grant interaction, not visibility — binding), **SOC-D13** (Separation of Progression and Social — the precedent this document mirrors for the Calendar).
- `Comparison-Philosophy-Amendment-001.md` v1.1 (LOCKED) — **CC-D2** (Performance Firewall, binding), **CC-D3** (anti-shame guardrails, binding), and the **CC-D1 narrowing precedent** that §19 mirrors.
- `Challenge-System-Architecture-v1.0.md` (v1.5, LOCKED) — **CS-D2** (Performance Firewall enforced in the data layer), **CS-D4** (no Rank impact). Calendar challenge events are read-only and never breach this Firewall.
- `Program-Ecosystem-Architecture-v1.0.md` (LOCKED) — `ProgramSlot.weekNumber` / `ProgramSlot.dayOfWeek` (1=Monday…7=Sunday; null if flexible). The Calendar **projects** these relative slots onto dates; it never owns or rewrites program scheduling.
- `Honor-Catalog-v1.0-LOCKED.md`, `Honor-Evaluation-Service-Architecture-v1.0.md`, `HonorInstance-Architecture-v1.0.md` (LOCKED) — honors are account-based, system-awarded; the Calendar reads `HonorInstance` records as date-anchored markers and never evaluates or awards.
- `Rank-Computation-Model.md` (LOCKED v1.0) — the Legacy Score rewards breadth/depth, **not daily streaks**. The Calendar emits no rank/legacy signal (§21).
- `Activity-History-Wireframe-Spec-W18.md` (LOCKED) — the Calendar **resolves** W-18's V1.1 deferrals ("Jump to date / calendar navigation," "calendar heat map / streak"). W-18 remains the linear list of completed sessions; the Calendar is the date-indexed lens.
- Legacy surfaces `Legacy-Hub-Wireframe-Spec-L1`, `Legacy-Timeline-Wireframe-Spec-L2` (LOCKED) — the Calendar's long-term purpose (§20) is the same Legacy that L-1/L-2 chronicle, viewed through a date index rather than a chapter index.

**Supersedes:** Nothing. This document is purely additive. It introduces no new domain and redefines no existing entity. Two LOCKED **deferrals** in `Activity-History-Wireframe-Spec-W18` ("Provide a 'Jump to date' or calendar navigation control in MVP (V1.1)"; "Show a 'streak' counter, week summary bar, or calendar heat map") are **resolved here** by relocating those capabilities to the Calendar surface — W-18's own screen rules are unchanged.

**Amendment Log:** Initial. v1.0.

**Downstream dependents (reconciled in this pass / flagged for the Architecture Freeze):** Master PRD §6/§19 + `FORGE_LEGACY_PRD` (Calendar as a surface, not a 5th tab; screen inventory); DNA §10 (amendment pointer to the CAL-D19 streak-visualization narrowing); W-2 Program Browse (primary forward-looking entry point — Workouts tab root as of `Docs/Amendments/Workouts-Navigation-Amendment-001-Retire-Workouts-Hub.md`, 2026-07-08, replacing W-1 Workouts Hub); W-3 Program Detail (program-schedule projection source); W-18 Activity History (deferral resolution + heat-map relocation); Goal Hub/Detail G-1/G-2 (milestone target dates); Honors L-10/L-11 (date-anchored markers); Social-System-Architecture (optional Friends layer inherits SOC-D2); Squad S-1/S-2 (optional Squad layer; Firewall); Challenge-System (challenge events read-only; Firewall); Legacy L-1/L-2/L-9 (history lens); Rank-Computation-Model (no streak/calendar signal).

---

## Section 1 — Purpose & Scope

Forge Legacy logs a great deal of dated material — completed workouts (W-18), scheduled program slots (Program Ecosystem), goal target dates (Goals), challenge windows (Challenge System), earned honors (Honors), and personal records — but until now there has been **no single date-indexed view** of any of it, and **no forward-looking "what's coming" surface** beyond a program's "next workout." The Calendar fills that gap.

The Calendar is a **read/write timeline layer**: it **reads** dated events from every existing system and renders them on a unified month/week/day grid, and it **writes** only the three lightweight scheduling primitives the product has agreed an athlete may plan ahead — a scheduled workout, a goal/milestone target date, and a rest day. It is **not a domain**, owns **no canonical data**, and **never duplicates or replaces** Program, Workout, Goal, Challenge, Honor, or Social logic. Its long-term purpose (§20) is to become a **date-indexed view of the athlete's Legacy** — the same permanent record the Legacy tab chronicles by chapter, now also navigable by time.

**In scope:** the Calendar philosophy; the surface-not-a-tab navigation decision; the aggregation-only data rule; the limited write scope (workouts, goals/milestones, rest days only); Calendar Home (Month View); Week and Day views; the Day Detail timeline; workout scheduling; program-schedule projection; goal milestones; challenge events (read-only); honors (read-only); PRs (read-only); the optional Friends layer; the optional Squad layer; filters; navigation into the owning systems; search by date; streak/consistency visualization (with the DNA §10 formal review); Legacy history as the long-term purpose; the progression-separation rule; and integration with every existing system.

**Out of scope (explicitly — see §Non-Behaviors):** **hour-by-hour / time-of-day scheduling**; **meal planning**; **sleep tracking**; **habit tracking outside existing systems**; **daily notes / journaling**; **Google / Apple Calendar sync** (all deferred out of V1); any new pixel/wireframe layout (future C-LDR/calendar wireframe specs); backend field names, enums, and schema (deferred per the P-5/P-8 concept-level precedent); any change to the Workout, Program, Goal, Challenge, Honor, Social, or Rank entities — this document governs and integrates; it does not redesign.

**House rule for this document:** field names are architecture-level (concept). Backend may rename. Types are indicative.

---

## Section 2 — CAL-D1 — Calendar Philosophy (why the Calendar exists)

**Locked.** The Calendar exists to give the athlete **one place to see their training across time** — backward as history, forward as a light plan — without becoming a productivity app, a habit tracker, or a streak machine.

Every Calendar decision reinforces:
- **Timeline over dashboard.** The Calendar is a chronicle indexed by date, not a metrics dashboard.
- **Aggregation over ownership.** It surfaces what other systems already own; it manufactures no new truth.
- **History over pressure.** Its center of gravity is the past (what was built), not a forward counter the athlete must protect.
- **Invitation over obligation.** Forward scheduling is an offer, never a gate, never a shame trigger (DNA §8 Progress Without Pressure).

> The Calendar strengthens the Legacy — it never competes with it. When a calendar mechanic and a fitness/legacy value conflict, the fitness/legacy value wins (DNA §11). The Calendar is a **lens on the product, not a product of its own.**

---

## Section 3 — CAL-D2 — The Calendar is a Surface, not a Tab (navigation)

**Locked.** The Calendar is a **cross-cutting surface reached from existing entry points** — it does **not** become a bottom-navigation tab, and it does **not** alter the LOCKED 5-tab Navigation System (Master PRD §6: Home · Workouts · Legacy · Squads · Communities — Communities promoted to the 5th tab 2026-07-07, `Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md`).

**Why:** A bottom-nav tab is a **domain**. The Calendar is explicitly **not a domain** (CAL-D1/CAL-D3). Giving it a tab would (a) contradict the locked 5-tab architecture echoed across ~95 docs, and (b) misrepresent an aggregation layer as a peer system. Keeping it a surface is the architecturally honest expression of "the Calendar does not own anything." (Communities, by contrast, earned its tab on frequency-of-use grounds, not domain status alone — see COM-D18.)

**Entry points (locked intent; exact placement is wireframe-level):**
- **Workouts tab (W-2 Program Browse — the tab root as of `Docs/Amendments/Workouts-Navigation-Amendment-001-Retire-Workouts-Hub.md`, 2026-07-08; W-1 Workouts Hub carried this affordance before its retirement)** — a calendar affordance in the header is the **primary forward-looking** entry point ("what's scheduled"). This is where the write primitives (§5) naturally originate.
- **Legacy (L-1 / L-2)** — a calendar affordance is the **backward-looking** entry point ("my training across time"), expressing the long-term purpose (§20).
- **Home (H-1)** — the Calendar may be reached contextually but **never displaces the D-Lite hero** or the Start-Workout CTA, and never adds a competing forward-counter to Home.

The Calendar maintains its own navigation state within whichever stack opened it and is dismissible back to that stack. It never appears during an active workout (W-9–W-16 remain full-screen).

---

## Section 4 — CAL-D3 — Aggregation-Only Data Rule (primary governing rule)

**Locked, binding. This is the load-bearing rule from which every other Calendar decision inherits.**

The Calendar **owns no canonical data.** Every event it renders is a **read-through reference** to a record owned by its source system, resolved at render time. The Calendar **never duplicates, caches as truth, mutates, or replaces** the logic of:

| System | Owns | Calendar may |
|---|---|---|
| **Workout / Activity** (W-8–W-19) | completed sessions, their data | **read** completed sessions; **write** a scheduled (future) workout intent only (§8) |
| **Program** (Program Ecosystem) | `ProgramSlot` schedule, graduation | **read & project** slots onto dates (§9); never edit a program's schedule |
| **Goal** (Goals / G-series) | goals, outcomes | **read** goals; **write** a milestone/target **date** only (§10); never change an outcome |
| **Challenge** (Competition; v1.3) | challenges, rosters, scoring, standings | **read** start/end **dates** as events (§11); never read scores/standings/ranks |
| **Honor** (Catalog / Eval / Instance) | `HonorInstance`, evaluation | **read** earned honors as date markers (§12); never evaluate or award |
| **Social** (SOC) | friends, posts, feed | **read**, opt-in only, the existence/date of a friend/squad event (§14/§15) under SOC-D2 + the Firewall; never post, never expose performance |
| **Rank / Legacy Score** (RCM) | rank, score | **nothing** — the Calendar neither reads the formula nor writes any signal (§21) |

**The correctness test (binding):** *If the source record changes or is deleted, the Calendar's rendering changes or disappears with it, because the Calendar held no independent copy.* Any design in which the Calendar becomes the system of record for a workout, a program schedule, a goal outcome, a challenge result, an honor, or a social event is a violation of CAL-D3.

The Calendar **never** re-implements: program day generation, honor evaluation, challenge scoring, goal-progress computation, rank computation, or social audience/visibility rules. It calls into — or simply links to (§17) — the owning system.

---

## Section 5 — CAL-D4 — The Calendar's Write Scope (exactly three primitives)

**Locked.** The Calendar is read/write, but its **write surface is deliberately tiny.** An athlete may schedule, into a future date, **only**:

1. **A workout** — an intent to train on a date (optionally typed/templated). On completion it is reconciled against the real logged session (§8).
2. **A goal milestone / target date** — a date attached to an existing goal (§10). The Calendar writes the *date*, never the goal's outcome.
3. **A rest day** — an intentional planned rest marker (§8). Rest days are **never** absence-detected and **never** shame-framed (CC-D3).

**Everything else the Calendar shows is read-only.** Programs, challenges, honors, and PRs are surfaced but **cannot be created, edited, or scheduled from the Calendar** — those actions belong to their owning systems, which the Calendar links into (§17). The Calendar adds **no** new scheduling concept beyond these three. In particular it introduces **no** hour/time-of-day field, **no** meal/sleep/habit/notes primitive (Non-Behaviors).

---

## Section 6 — CAL-D5 — Calendar Home (Month View)

**Locked (architecture; layout is wireframe-level).** The Calendar's default surface is a **Month View**: a date grid where each day cell carries lightweight **indicators** of what that day holds — completed workouts, scheduled workouts, rest days, program-scheduled sessions, goal milestones, challenge windows, honors, and PRs — drawn entirely from §4 read-throughs.

- Day cells show **presence indicators**, not counts-as-status. A day with training reads as *built*, never as a score.
- **Indicators prioritize readability over quantity.** The Month View is **calm and legible** (DNA §8 Simplicity; visual clutter is the enemy). **Multiple events of the same type on a day collapse into a single indicator** rather than stacking; indicator density is capped, and a busy day shows an aggregate marker that expands in Day Detail (§7), never a cluster of competing dots. A clean, uncluttered month is preferred to an exhaustive one — the full per-event breakdown always lives in Day Detail.
- **No empty-day shaming.** A day with nothing is simply empty — never a red mark, a gap warning, a "missed" flag, or a "days since" counter (CC-D3 / DNA §10; §19).
- Tapping a day → **Day Detail** (§7). Swiping/selecting changes month. A control switches to **Week** or **Day** view (§7).

---

## Section 7 — CAL-D6 / CAL-D7 — Week View, Day View, and the Day Detail Timeline

**Locked.**

**Week View (CAL-D6):** a 7-day window at higher density than the month — the same aggregated read-through events, with room for short labels. Same indicator rules as the Month View (no shame, no time-of-day grid).

**Day View / Day Detail Timeline (CAL-D7):** a single day expanded into a **vertically ordered list of that day's events** — *not* an hour-by-hour calendar grid (Non-Behaviors). Ordering is **sequence/recency-based**, not clock-slotted: completed workouts, then scheduled items, then date-anchored milestones/challenge markers/honors/PRs for that day. Each row is a read-through that **navigates into its owning system** (§17). The Day Detail is where the athlete confirms a planned workout, marks a rest day, or attaches a goal milestone (the three write primitives, §5).

> The Day Detail is a **timeline of meaningful events**, deliberately *not* a time-blocked planner. Forge schedules *what*, never *what-o'clock*.

---

## Section 8 — CAL-D8 — Workout Scheduling

**Locked.** A **scheduled workout** is a future-dated **intent**, owned conceptually by the Workout system and surfaced on the Calendar.

- Scheduling a workout creates a forward marker on a date; it may optionally reference an activity type or a Workout Template (read-through to the Workout/Template system).
- A scheduled workout is **not** a logged session and contributes **nothing** to history, honors, rank, or legacy until it is actually performed and logged through the normal W-8→W-17 flow.
- **Reconciliation:** when the athlete logs a real session, the Calendar reconciles the scheduled intent against the completed record. A scheduled workout that is **not** performed simply **lapses** — it is never converted into a "missed workout," never flagged, never counted against the athlete, and never notified as a failure (DNA §2 Accountability Without Shame; CC-D3).
- **Rest days** are the same primitive in the opposite sense: an intentional "no training planned" marker. Rest is honored as a deliberate choice, never inferred from absence.

The Calendar **does not** define how a workout is logged, scored, or attributed — it only places the *intent* on a date and links into the real logging flow (W-8).

---

## Section 9 — CAL-D9 — Program Schedule Integration (read-only projection)

**Locked.** Programs already carry a **relative** schedule — `ProgramSlot.weekNumber` + `ProgramSlot.dayOfWeek` (1=Monday…7=Sunday; null if flexible) — owned by the Program Ecosystem. The Calendar **projects** that relative schedule onto **absolute dates** for an active/assigned program, so the athlete sees "today is Week 3, Day 2 — Lower Body" in calendar context.

- Projection is a **pure read**: the Calendar computes dates from the program's start and its slots; it **stores no schedule of its own** and **edits no slot** (CAL-D3). A `dayOfWeek = null` (flexible) slot is shown as *available this week*, not pinned to a clock-date.
- The Calendar **never** re-implements program day generation, **never** alters program progress, and **never** triggers graduation — completing a program's final workout still flows through W-17 → M-4 exactly as today.
- If the program changes (forked, advanced, completed) the projection changes with it (CAL-D3 correctness test). Editing the program is done in the Program system (W-3/W-5), reached via §17 — never on the Calendar.

This is the bridge that makes "Program schedule integration" real **without** the Calendar owning any scheduling logic.

---

## Section 10 — CAL-D10 — Goal Milestones

**Locked.** Goals are owned by the Goals system (every chapter's primary goal + secondary goals). The Calendar surfaces goals on two date anchors and may write **one** of them:

- **Read:** a goal's relevant dates (e.g., a target date, an achieved date once completed) render as date markers.
- **Write (the only goal write):** an athlete may attach a **milestone / target date** to an existing goal from the Calendar (§5). This writes a *date* onto a goal that already exists; it **never** creates a goal's outcome, **never** marks a goal achieved (achievement still flows through the goal/workout systems → M-3), and **never** edits a sealed/archived goal (DNA §9 History Cannot Be Rewritten).
- Goal **completion** remains a Legacy moment owned elsewhere (Master PRD §9); the Calendar shows the achieved date as a marker and links into Goal Detail (§17).

The Calendar is a place to *see milestones approaching and passing*, not a second goal-management system.

---

## Section 11 — CAL-D11 — Challenge Events (read-only; Firewall preserved)

**Locked.** Competition in Forge Legacy is the **Challenge System** (v1.3) — private, opt-in, roster-scoped contests behind the Performance Firewall (CS-D2). The Calendar renders **only the date envelope** of a challenge the athlete is enrolled in:

- **Shown:** a challenge's **start date** and **end date** as read-only event markers, so the athlete sees a challenge window on their timeline.
- **Never shown on the Calendar:** scores, standings, ranks, leaderboards, win/loss, badges, or any other participant's performance. Those live **only** on the C-series Challenge surfaces (CS-D2 — the Firewall is enforced in the data layer; the Calendar is **not** an always-on exception to it).
- Tapping a challenge marker **navigates into the Challenge surface** (§17), where the locked Challenge rules govern everything. The Calendar never scores, never ranks, never crowns.
- Anti-shame is preserved (CS-D3): non-participation is invisible on the Calendar; a withdrawn/finished challenge simply stops appearing; there is no "you placed last" marker anywhere on the timeline.

---

## Section 12 — CAL-D12 — Honors on the Calendar (read-only)

**Locked.** Honors are account-based, system-awarded, and owned by the Honor system (Catalog / Evaluation Service / `HonorInstance`). The Calendar reads each earned `HonorInstance` as a **date-anchored marker** on the day it was earned.

- The Calendar **never** evaluates honor conditions, **never** awards, **never** un-awards, and **never** alters a `HonorInstance` (CAL-D3). Earning still flows through the honor engine → M-2 exactly as today.
- An honor marker links into **Honor Detail (L-11)** (§17). Honors sealed within an archived chapter remain immutable (DNA §9); the Calendar shows them, it cannot touch them.

---

## Section 13 — CAL-D13 — PRs on the Calendar (read-only)

**Locked.** A **personal record (PR)** is a performance fact derived by the Workout/performance system at log time. The Calendar surfaces PRs as **read-only date markers** ("PR set on this day") to make the timeline feel like a record of breakthroughs.

- The Calendar **does not detect, compute, validate, or define** a PR — it reads PR facts the owning system has already established (CAL-D3). If the source recomputes or removes a PR, the marker follows.
- A PR marker links into the session/Activity Detail (W-19) that produced it (§17). PRs on the Calendar carry **no comparison to any other athlete** (DNA §1/§10; the Firewall) — they are the athlete's own milestones only.

---

## Section 14 — CAL-D14 — Optional Friends Layer (off by default; opt-in)

**Locked, governed by `Social-System-Architecture-v1.0` (SOC-D2) and the Performance Firewall (CC-D2).** The Calendar may **optionally** overlay a lightweight Friends layer — and it is **off by default.**

- The Friends layer, when enabled, shows **only** what the social architecture already permits a friend to see — at most the **existence/date** of an intentional, friend-audience moment the friend chose to share (a Post/milestone date), per SOC-D2 ("relationships grant interaction, not visibility").
- It **never** exposes a friend's workout history, performance, scores, goal progress, body metrics, or any protected data — **friendship grants interaction, not visibility**, and the Firewall is unchanged (CC-D2). The Calendar adds **no** new visibility a friend did not already grant through the Social layer.
- The layer is a **read-through to the Social system** (CAL-D3): it renders nothing the Friends Feed/Profile would not already render, and it links into the Social surface (§17). It is **never** a comparison view and **never** a "who trained more" surface (DNA §10).

---

## Section 15 — CAL-D15 — Optional Squad Layer (off by default; opt-in)

**Locked, governed by the Squad specs (S-1/S-2/S-3) and the Performance Firewall.** The Calendar may **optionally** overlay a Squad layer — also **off by default.**

- When enabled, it surfaces **only** the presence/accountability signals squads already expose (e.g., the date of a squad check-in or a shared WwF/accomplishment event), exactly as the Squad Activity surface defines them.
- It **never** surfaces failure data of any kind — **no missed workouts, no broken streaks, no inactivity, no comparison metrics** (Master PRD §16; DNA §2). It shows what members **did**, never what they **missed**.
- Challenge performance is **never** routed through the Squad layer (CS-D2 Firewall). The Squad layer is a read-through that links into the Squad surface (§17); it manufactures no new squad data.

---

## Section 16 — CAL-D16 — Filters

**Locked.** The Calendar supports **filters** so the athlete can focus the timeline by event class: Workouts, Scheduled, Rest, Program, Goals/Milestones, Challenges, Honors, PRs, and (when enabled) the Friends and Squad layers.

- Filters are a **pure view transform** over already-aggregated read-throughs (CAL-D3) — they change what is shown, never what exists, and never write anything.
- The Friends and Squad layers are **filters that are off by default** (CAL-D14/D15) — enabling them is an explicit, reversible choice.
- Filtering is **personal and private**; it produces no signal to any other system and is never used for comparison or ranking.

---

## Section 17 — CAL-D17 — Navigation Into Existing Systems

**Locked, binding.** **Every Calendar event is a doorway, not a destination.** Tapping any rendered event navigates into the **owning system's** real surface, where that system's locked rules govern:

| Calendar event | Navigates into |
|---|---|
| Completed workout | Activity Detail (W-19) |
| Scheduled workout | the logging flow (W-8 →) / the scheduled-intent editor |
| Program-scheduled session | Program Detail (W-3) |
| Goal milestone | Goal Detail (G-2 / L-7) |
| Challenge window | the Challenge surface (C-series) |
| Honor marker | Honor Detail (L-11) |
| PR marker | the session that set it (W-19) |
| Friend / Squad event (if enabled) | the Social / Squad surface |

The Calendar **never** forks behavior into a parallel implementation. There is exactly **one** Program Detail, **one** Goal Detail, **one** Challenge surface, **one** Honor Detail — the Calendar links to them (CAL-D3). This is what guarantees the Calendar can never "duplicate or replace" another system's logic: it has nowhere to put a duplicate.

---

## Section 18 — CAL-D18 — Search by Date

**Locked.** The Calendar provides **search/jump by date** — pick or enter a date and the timeline scrolls/opens there. This **resolves** the `Activity-History-Wireframe-Spec-W18` V1.1 deferral ("Provide a 'Jump to date' or calendar navigation control"): date navigation now lives on the Calendar surface, not inside W-18's linear list.

- Search by date is a **navigation/read action only** — it writes nothing and reveals nothing the athlete could not already see on their own timeline.
- It scales to the long view (§20): a ten-year Legacy is navigable by jumping to any month/day.
- This is **date** search, not full-text search, not a notes search (there are no daily notes — Non-Behaviors).

---

## Section 19 — CAL-D19 — Streak / Consistency Visualization — DNA §10 Formal Architecture Review (binding narrowing)

DNA §4 states Forge Legacy is **not "a streak app,"** and DNA §10 prohibits **"Streak pressure systems"** and **"'Days since workout' shame mechanics"** — qualified, like the rest of §10, by **"Without a formal architecture review."** **This section is that review,** scoped as narrowly as possible, mirroring the precedent set when `Comparison-Philosophy-Amendment-001` (CC-D1) narrowed the leaderboard prohibition and `Social-System-Architecture` (SOC-D4) narrowed the reactions/comments/feed prohibitions.

### Statement (Locked, binding)
A **backward-looking, private, non-pressure consistency visualization** of training history — a calendar heat-map / "days you trained" view — is permitted. Every **pressure / shame / public** form of streaks remains prohibited.

### Narrowing table (what changes, what does not)
| DNA §10 pattern | Before | After (narrowed) |
|---|---|---|
| "Streak pressure systems" | Read as: all streak mechanics prohibited | A **historical consistency visualization** (which past days were trained, rendered as a calm heat-map/pattern) is permitted **as memory of what was built.** A streak as a **forward counter the athlete must protect**, a number whose loss is penalized, anything that **pressures** continuation, generates "keep your streak" nudges, or is surfaced as status — **remains prohibited.** |
| "'Days since workout' shame mechanics" | Prohibited | **Unchanged — still prohibited in full.** The Calendar **never** shows "days since last workout," **never** marks gaps in red, **never** warns about a broken streak, and **never** notifies about inactivity. Empty days are simply empty (§6). |
| "Public leaderboards," "Rank comparisons," "Public workout statistics," everything else in §10 | Prohibited | **Untouched — still prohibited.** This review does not extend to them. The consistency view is **private to the athlete** and never compared to anyone. |

### Binding guardrails on the permitted visualization
1. **Backward-only.** It visualizes the **past**. It is never a forward target, quota, or counter-to-defend.
2. **No shame surface.** No red/empty-day penalty, no "broken streak," no "days since," no gap alarm, no failure notification (CC-D3; DNA §2).
3. **No pressure mechanics.** No streak-protection prompts, no "don't lose it" nudges, no countdowns, no engagement loops (DNA §8 Deliberate Interaction — not addictive, not compulsive).
4. **Not a status number.** Consistency is shown as **pattern/history**, never aggregated into a score, badge, rank input, or profile metric.
5. **No progression effect.** It feeds **nothing** — not Rank, not Legacy Score, not Honors (§21; RCM rewards depth/breadth, **not daily streaks**).
6. **Private.** It is the athlete's own view of their own history; it is never public, never squad-compared, never friend-compared (the Firewall; SOC-D2).

### Why no violation
The protected property in §4/§10 was never "a record of which days you trained" — it was **the pressure, shame, and addiction mechanics that streak counters weaponize**: protect-the-number anxiety, "you broke it" punishment, "days since" shaming, and engagement farming. A calm, private, backward-looking heat-map of training history carries **none** of those properties — it is **memory, not pressure**; it celebrates **transformation/consistency as part of the Legacy** (DNA §1, §2 Transformation Over Activity reads consistency-over-time as legacy, not as a daily-activity reward), and it touches no progression. This is the same move CC-D1 and SOC-D4 made: keep the protected property intact, permit the narrowly-scoped, non-pressuring form. Outside this narrow visualization, every streak/shame prohibition in §4 and §10 stands in full.

---

## Section 20 — CAL-D20 — Legacy History as the Long-Term Purpose

**Locked.** The **long-term purpose of the Calendar is Legacy.** In month-1 it is a convenient schedule-and-history view; over years it becomes a **date-indexed view of the athlete's entire Legacy** — every chapter, program, goal, honor, PR, and challenge, navigable by time.

- This is the **same permanent record** the Legacy tab chronicles by **chapter** (L-1/L-2/L-9); the Calendar is the **by-date** lens on it. The two are complementary views of one Legacy, never two competing stores (CAL-D3).
- **The Calendar is the chronological view of a Legacy; the Legacy Timeline is the narrative view of a Legacy. Both reference the same underlying history.** The chronological view answers "what happened, and when"; the narrative view answers "what did it mean, and which chapter does it belong to." Neither owns the history — they are two readings of one record.
- It inherits the Legacy guarantees: **Never Charge For History** (a ten-year-old day is always viewable, free, forever — DNA §9) and **History Cannot Be Rewritten** (the Calendar can show a sealed past day; it can never edit its outcomes — DNA §9; Master PRD §10/§12).
- The far-horizon framing — "see every day of your athletic life, organized and preserved" — is exactly the North Star (DNA §12: *who you are proud to have become ten years from now*). The Calendar is the temporal expression of that promise.

> The Calendar's reason to exist, ultimately, is the same as the product's: **the workout tracker is the engine; the Legacy is the product.** The Calendar is the Legacy, read along the axis of time.

---

## Section 21 — CAL-D21 — Separation of Calendar and Progression

**Locked, binding (mirrors SOC-D13 and CS-D4).** The Calendar emits **no** progression-contributing event and writes **no** progression signal. Scheduling a workout, marking a rest day, attaching a milestone date, viewing the consistency visualization, jumping to a date, or toggling any layer/filter has **zero** effect on Rank computation, Legacy Score, Honor evaluation, goal/chapter progress, or challenge scoring.

- A **scheduled** workout contributes nothing until it is actually performed and logged through the real flow (§8). Planning is not progress.
- The consistency visualization (§19) is **read-only history** and feeds nothing (RCM rewards depth/breadth, not daily streaks).
- The Legacy Engine produces progression; the Calendar **reflects and arranges** it along a date axis — it never feeds it. **Progression never depends on the Calendar, and the Calendar never becomes progression.**

---

## Non-Behaviors

The Calendar deliberately does **not** introduce, in V1 or as part of this architecture:

- **No hour-by-hour / time-of-day scheduling** — the Calendar schedules *what* (date), never *what-o'clock*. Day Detail is a sequence timeline, not a clock grid (§7).
- **No meal planning** — out of product scope (DNA §4; Master PRD: not a nutrition tracker).
- **No sleep tracking** — out of scope.
- **No habit tracking outside existing systems** — the Calendar adds no new habit/streak primitive; the only writes are workout / milestone / rest (§5). Consistency is *visualized as history*, never enforced as a habit loop (§19).
- **No daily notes / journaling** — reflection lives in the Legacy/Chapter systems (L-6), not in calendar day cells. Search is by date, not by note (§18).
- **No Google / Apple Calendar sync** — explicitly deferred out of V1 (a future, separately-scoped decision; consistent with the existing Wearable/third-party-integration roadmap posture).
- **No new data ownership** — owns no canonical workout, program, goal, challenge, honor, PR, or social record (CAL-D3).
- **No bottom-nav tab for the Calendar** — it remains a cross-cutting surface, not a domain (CAL-D2); the 5-tab Navigation System (Home, Workouts, Legacy, Squads, Communities) is otherwise unrelated to the Calendar.
- **No streak pressure, no "days since," no broken-streak shame, no inactivity alarm, no public/compared consistency** (CAL-D19; DNA §4/§10; CC-D3).
- **No progression effect** of any kind (CAL-D21).
- **No Firewall exception** — the Calendar is never an always-on surface that leaks challenge or friend/squad performance (CS-D2 / CC-D2 / SOC-D2).

---

## Section 22 — Integration Map

**Locked.** How the Calendar integrates with each existing system. **No existing system is redesigned; no Firewall is changed.**

| System | Calendar relationship |
|---|---|
| **Workout / Activity** (W-8–W-19) | Reads completed sessions as history; writes future workout/rest intents (§8); reconciles on log; links to W-19. |
| **Program** (Program Ecosystem) | Projects `ProgramSlot` (weekNumber/dayOfWeek) onto dates, read-only (§9); links to W-3; never edits the schedule or triggers graduation. |
| **Goal** (Goals / G-series) | Reads goals; writes milestone/target **dates** only (§10); links to Goal Detail; never alters outcomes. |
| **Challenge** (Competition; v1.3) | Reads start/end **dates** only (§11); **never** scores/standings; links to C-series; Firewall (CS-D2) intact; anti-shame (CS-D3) intact. |
| **Honor** (Catalog / Eval / Instance) | Reads `HonorInstance` as date markers (§12); links to L-11; never evaluates or awards. |
| **PRs** (performance/Workout) | Reads PR facts as date markers (§13); links to W-19; never detects or computes a PR. |
| **Social — Friends** (SOC) | Optional, off-by-default layer (§14); SOC-D2 (interaction-not-visibility); links to Social; exposes no protected data. |
| **Squads** (S-1/S-2/S-3) | Optional, off-by-default layer (§15); presence only, never failure data; Firewall intact; links to Squad surface. |
| **Legacy** (L-1/L-2/L-9) | The by-date lens on the same Legacy (§20); complementary to the by-chapter timeline; Never-Charge-For-History + immutability inherited. |
| **Rank / Legacy Score** (RCM) | **No integration** (§21) — reads no formula, writes no signal; the consistency view feeds nothing. |
| **Home** (H-1) | Reachable contextually; never displaces the D-Lite hero or Start-Workout CTA; adds no forward counter to Home (§3). |
| **Navigation** (Master PRD §6) | A surface, not a tab; 5-tab architecture (as of 2026-07-07) unaffected (§3). |

---

## Section 23 — Guiding Principles (governing)

These are governing principles; future calendar work is tested against them.

1. **The Calendar is a lens, not a domain.** It aggregates; it never owns.
2. **One source of truth per fact.** The Calendar links to the owning system; it never duplicates logic.
3. **Schedule *what*, never *what-o'clock*.** Dates, not clock grids.
4. **History over pressure.** The center of gravity is the built past, not a counter to protect.
5. **Empty days are not failures.** No shame, no "days since," no broken-streak alarm.
6. **Forward planning is an invitation.** A lapsed plan is never a missed-workout penalty.
7. **The Firewall is never opened by a date view.** No performance leaks through any layer.
8. **The Calendar never becomes progression, and progression never depends on the Calendar.**
9. **Its long-term purpose is the Legacy** — the product, read along the axis of time.
10. **The Calendar always reflects the product; it never competes with it.**

---

## Non-Behaviors recap / Validation Checklist

- [ ] CAL-D1 — Calendar philosophy: timeline-over-dashboard, aggregation-over-ownership, history-over-pressure, invitation-over-obligation
- [ ] CAL-D2 — surface, **not** a bottom-nav tab; 5-tab nav (Home/Workouts/Legacy/Squads/Communities) unchanged by the Calendar; entry points (W-2 forward, Legacy backward, never displacing the Home hero)
- [ ] CAL-D3 — Aggregation-Only Data Rule (binding); owns no canonical data; correctness test; never duplicates/replaces Program/Workout/Goal/Challenge/Honor/Social logic
- [ ] CAL-D4 — write scope = exactly three primitives (workout, goal milestone/date, rest day); everything else read-only
- [ ] CAL-D5 — Calendar Home (Month View): presence indicators, calm/legible, no empty-day shaming
- [ ] CAL-D6 / CAL-D7 — Week view; Day Detail is a sequence timeline, **not** an hour grid
- [ ] CAL-D8 — workout scheduling = future intent; reconciled on log; lapses without shame; rest days intentional
- [ ] CAL-D9 — program schedule = read-only projection of `ProgramSlot`; no schedule ownership, no graduation trigger
- [ ] CAL-D10 — goal milestones: reads goals, writes only a date; never changes outcomes; never edits sealed goals
- [ ] CAL-D11 — challenge events: read-only start/end dates; **no** scores/standings; Firewall (CS-D2) + anti-shame (CS-D3) intact
- [ ] CAL-D12 — honors: read-only `HonorInstance` date markers; never evaluates/awards
- [ ] CAL-D13 — PRs: read-only date markers; never detects/computes; no cross-athlete comparison
- [ ] CAL-D14 — optional Friends layer, **off by default**; SOC-D2; exposes no protected data
- [ ] CAL-D15 — optional Squad layer, **off by default**; presence only, never failure data; Firewall intact
- [ ] CAL-D16 — filters = pure view transform; write nothing; Friends/Squad layers are off-by-default filters
- [ ] CAL-D17 — every event navigates into its owning system; exactly one implementation per system
- [ ] CAL-D18 — search by date; resolves W-18 V1.1 deferral; navigation/read only
- [ ] CAL-D19 — DNA §10 formal review: backward-looking private consistency visualization permitted; streak-pressure / "days since" / public-comparison **still prohibited**; six guardrails; no progression effect
- [ ] CAL-D20 — Legacy history as the long-term purpose; by-date lens on the by-chapter Legacy; Never-Charge-For-History + immutability inherited
- [ ] CAL-D21 — separation of Calendar and progression (mirrors SOC-D13 / CS-D4); planning is not progress
- [ ] Non-Behaviors — no hour-by-hour, meal, sleep, habit-outside-systems, daily notes, or Google/Apple sync in V1
- [ ] No contradiction with DNA, Master PRD, Social-System-Architecture, Comparison-Philosophy, Challenge-System v1.3, Program Ecosystem, Honors, Rank-Computation-Model, W-18, Legacy specs

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0.2 | 2026-07-08 | Cross-reference update only, no new decision: CAL-D2's primary forward-looking entry point retargeted from "Workouts Hub (W-1)" to "Workouts tab (W-2 Program Browse)," following `Docs/Amendments/Workouts-Navigation-Amendment-001-Retire-Workouts-Hub.md` (W-1 retired; the Workouts tab root is now W-2). The affordance itself, its placement in the tab's header, and everything else about CAL-D2 (surface, not a tab) are unchanged. |
| 1.0.1 | 2026-07-07 | Cross-reference update only, no new decision: CAL-D2's "4-tab Navigation System" references updated to "5-tab" following `Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md` (Communities promoted to a bottom-navigation tab). The Calendar's own conclusion — it remains a surface, not a tab — is unchanged. |
| 1.0 | June 2026 | Initial. Establishes the Calendar as Forge Legacy's governing **timeline-layer** authority — a read/write aggregation surface that owns no data. Defines: Calendar philosophy (CAL-D1); surface-not-a-tab navigation, 4-tab architecture preserved (CAL-D2); the binding **Aggregation-Only Data Rule** with its correctness test (CAL-D3); the three-primitive write scope — workout / goal-milestone-date / rest day (CAL-D4); Calendar Home Month View (CAL-D5); Week + Day Detail sequence timeline, not an hour grid (CAL-D6/D7); workout scheduling as future intent reconciled on log, lapsing without shame (CAL-D8); program-schedule **projection** of `ProgramSlot`, read-only (CAL-D9); goal milestones — date-only writes (CAL-D10); challenge events — read-only date envelope, Firewall intact (CAL-D11); honors as read-only date markers (CAL-D12); PRs as read-only markers (CAL-D13); optional off-by-default Friends (CAL-D14) and Squad (CAL-D15) layers under SOC-D2 + the Firewall; filters as pure view transforms (CAL-D16); navigation into owning systems (CAL-D17); search by date, resolving W-18's V1.1 deferral (CAL-D18); the **DNA §10 formal architecture review** narrowing in a private backward-looking consistency visualization while keeping streak-pressure / "days since" / public-comparison prohibited (CAL-D19); Legacy history as the long-term purpose (CAL-D20); and the Calendar↔progression separation (CAL-D21). Explicitly excludes hour-by-hour scheduling, meal planning, sleep tracking, habit tracking outside existing systems, daily notes, and Google/Apple Calendar sync from V1. No existing entity redesigned; no Firewall changed. **Pre-lock refinements (folded into v1.0):** standardized architecture terminology from "Competition" to **Challenge** for the governing Challenge System (user-facing naming unchanged); strengthened CAL-D5 (indicators prioritize readability over quantity — same-type events collapse into a single indicator, keeping the month view uncluttered); strengthened CAL-D20 (the Calendar is the *chronological* view of a Legacy, the Legacy Timeline is the *narrative* view — both reference the same underlying history); added Guiding Principle #10 ("The Calendar always reflects the product; it never competes with it"). **LOCKED for the Architecture Freeze.** |

---

*Forge Legacy — Calendar System Architecture*
*v1.0 — June 2026*
*Authority: FORGE_LEGACY_PRODUCT_DNA.md; Forge-Legacy-Master-PRD.md; Social-System-Architecture-v1.0; Comparison-Philosophy-Amendment-001 v1.1; Challenge-System-Architecture-v1.0.md (v1.5); Program-Ecosystem-Architecture-v1.0; Honor Catalog v1.5 / Honor-Evaluation-Service / HonorInstance; Rank-Computation-Model; Activity-History-Wireframe-Spec-W18; Legacy L-1/L-2/L-9 — all LOCKED*
*Supersedes: nothing (additive); resolves the W-18 V1.1 "Jump to date" and "calendar heat map / streak" deferrals*
*Status: LOCKED v1.0 — ready for Architecture Freeze*
