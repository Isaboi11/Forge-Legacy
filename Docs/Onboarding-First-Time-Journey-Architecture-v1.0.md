# Forge Legacy — Onboarding / First-Time User Journey Architecture
## v1.0 | June 2026

**Status:** **LOCKED** (June 2026) — foundational orchestration architecture; defines the net-new first-time-journey layer. Product-owner-approved; the §27 reconciliation decisions are confirmed. Ready for the Architecture Freeze. Downstream specs in §26 inherit from this document and are reconciled to it.

**Type:** Foundational System Architecture — the **governing authority for the first-time user journey in Forge Legacy.** Onboarding is an **orchestration layer, not a domain.** It owns **no canonical product data** except first-time-journey state and completion flags. It sequences, personalizes, and lightly hands off to systems that already exist (Account/Auth, Profile, Goals, Programs, Chapters, Honors, Home, Workout); it never duplicates or replaces their logic.

**Authority (this document inherits from and may not exceed):**
- `FORGE_LEGACY_PRODUCT_DNA.md` (LOCKED) — §1 (Who am I becoming?, not How do I compare?), §2 (Transformation Over Activity; Accountability Without Shame; Story Before Data), §4 (Forge is **not a streak app**, not a productivity app), §8 (Progress Without Pressure; Simplicity Wins; Deliberate Interaction), §9 (Never Charge For History; History Cannot Be Rewritten), §10 (Explicitly Prohibited Patterns — no fake progress, no streak pressure, no shame mechanics, no welcome-XP/artificial badges), §11 (Product Decision Test), §12 (North Star).
- `Forge-Legacy-Master-PRD.md` (LOCKED v1.0) — §3 (Target User — dual-path), §5 (MVP Scope), §6 (5-tab Navigation System as of 2026-07-07, **unaffected by onboarding**), §8 (Workout System), §9 (Goals), §11 (Program System), §12 (Chapter / Legacy System), §17 (Profile), §19 (Information Architecture).
- `Account-Creation-Wireframe-Spec-O1.md` (LOCKED v1.0) — authentication model (Email + Apple + Google, no guest mode), Welcome (O-1a), Display Name (O-1c).
- `First-Time-Setup-Wireframe-Spec-O2.md` (LOCKED v1.1) — identity declaration (path, athlete type, username, photo, prior accomplishments, completion). **Reconciled / partly superseded here (§8–§9, §27).**
- `First-Chapter-First-Goal-Wireframe-Spec-O3.md` (LOCKED v1.0) — explicit first-chapter/first-goal creation. **Superseded by ONB-D14 silent Chapter I creation (§15, §27).**
- `Home-Screen-Wireframe-Spec-H1.md` (Lock-Ready v1.0) — Daily Focus Surface, Chapter Card hero, Workout CTA. Onboarding adds the "Chapter awaiting first workout" hero sub-state (§18).
- `MVP-Amendment-Environment-Tags-v1.0.md` (LOCKED) — canonical environment enum (`commercial_gym`, `home_gym`, `bodyweight`); explicitly **deferred** onboarding equipment collection, equipment inventory, and recommendation to V1.1/Post-MVP. **This architecture pulls those forward on PO approval (§12–§14, §27).**
- `Rank-Computation-Model.md` / `Rank-System-Architecture.md` (LOCKED) — Athlete Type governs the Personal-Improvement evaluation context; the Legacy Score rewards breadth/depth, **not daily streaks**. Onboarding writes no progression signal (§23).
- `Goal-Hub-Wireframe-Spec-G1.md`, `Goal-Create-Edit-Wireframe-Spec-G3.md` (LOCKED) — Goal records are owned by the Goal system; onboarding goal **preferences** are a distinct personalization signal, not Goal records (§10).
- `Program-Ecosystem-Architecture-v1.0.md`, `Program-Catalog-Architecture-v1.0.md` (LOCKED) — the recommendation in ONB-D13 selects from the existing catalog; it owns no program logic.
- `Honor-Catalog-v1.0-LOCKED.md`, `Honor-Earned-Modal-Spec-M2.md` (LOCKED) — the first-honor moment reuses M-2; onboarding never evaluates or awards.
- `L-5-Chapter-Creation-Spec.md` (LOCKED) — post-onboarding chapter creation; the rename/management path for the auto-created Chapter I.
- `Workout-Summary-Spec-W17.md`, `Active-Workout-Flow-Spec-W9-W16.md` (LOCKED) — the first-workout payoff layers a first-run-only ceremony on the existing W-17 completion; it owns no logging logic.
- `P-5-Notifications-Wireframe-Spec.md`, `P-6-Privacy-Architecture.md` (LOCKED) — permissions are requested on-demand, never front-loaded; defaults are set silently.

**Supersedes:** `First-Chapter-First-Goal-Wireframe-Spec-O3.md` (the explicit "name your first chapter" gate is replaced by ONB-D14 silent Chapter I creation; renaming moves to L-5). **Partly reconciles / amends:** O-1 (adds the Your Next Chapter vision screen; expands the collection boundary), O-2 (Sex field; Goals/Experience/Equipment/Schedule steps; Athlete Type now derived; path subsumed by Experience), the Environment Tags deferral (equipment + recommendation pulled into V1), and H-1 (new hero sub-state). All such amendments are enumerated in §26 and PO-confirmed in §27.

**Amendment Log:** Initial. v1.0.

**Downstream dependents (reconciled in this pass / flagged for the Architecture Freeze):** O-1 Account Creation; O-2 First-Time Setup; O-3 First Chapter/Goal (superseded); H-1 Home; Environment-Tags Amendment; Rank-Computation-Model / Rank-System (Athlete-Type derivation); Goal-Hub G-1 / G-3; Program Catalog / Ecosystem (recommendation source); Honor Catalog / M-2; L-5 Chapter Creation; W-17 Workout Summary; P-5 Notifications / P-6 Privacy; Master PRD §3/§5/§17/§19; Product DNA §10 (fake-progress/streak/shame reaffirmed, not narrowed).

---

## Section 1 — Purpose & Scope

A first-time athlete must, in one uninterrupted arc, (1) understand **why** Forge Legacy is worth their commitment, (2) hand the product enough about themselves that the experience is personal from minute one, and (3) leave onboarding **curious to complete their first workout** rather than overwhelmed by features. Today the locked O-1→O-2→O-3 arc establishes identity and an explicitly-named first chapter, but it does not sell the vision, does not personalize around goals/experience/equipment/schedule, does not recommend a starting point, and front-loads chapter naming as a gate. This architecture defines the complete, premium first-time journey that fills those gaps **without redesigning any locked system it touches.**

The journey is a **read/light-write orchestration layer:** it **reads** from and **hands off into** the systems that own the truth (Account, Profile, Goals, Programs, Chapters, Honors, Workout), and it **writes** only (a) first-time-journey state and completion flags, (b) personalization preferences that drive a recommendation, (c) the values an existing system's own write-path accepts (name, username, photo, sex, athlete type, the silent Chapter I record via the Chapter system's API). It is **not a domain**, owns **no canonical product data**, and **never duplicates** Program, Chapter, Honor, Goal, Social, Squad, Challenge, Calendar, or Legacy logic.

**Core principle (ONB-D1):** Onboarding **sells the vision, personalizes the starting point, and creates curiosity to train** — it does not teach every feature. Onboarding answers *"Why should I use Forge?"* Progressive Discovery (§21) answers *"How does Forge work?"* The first real emotional payoff is **earned through Workout #1**, never manufactured during setup.

**In scope:** the onboarding philosophy and the awareness-vs-education split; the orchestration-only data rule; the full journey map; Welcome; Your Next Chapter; Account Creation; About You (name, username, photo, sex); Athlete-Type derivation; Goals (preference); Experience; Equipment; Training Schedule; Recommended Starting Point; silent Chapter I creation; on-demand Permissions; the Transition ceremony; the First Home experience; the First Workout payoff; the First Honor; Progressive Discovery; the no-fake-progress / separation-from-progression rule; the Home Gym Builder future-enhancement concept; and the reconciliation ledger against all locked architecture.

**Out of scope (explicitly — see Non-Behaviors):** any new pixel/wireframe layout (future O-series wireframe specs render these screens); backend field names, enums, and schema beyond concept level; the recommendation **algorithm internals** beyond the deterministic input→output contract; physical-stats / health-metric collection (weight, height, age, birthdate — still excluded); AI program generation; any redesign of Account, Profile, Goal, Program, Chapter, Honor, Workout, Social, or Rank entities — this document **orchestrates and integrates**; it does not rebuild.

**House rule for this document:** field names are architecture-level (concept). Backend may rename. Types are indicative. Copy strings are locked as written where quoted.

---

## Section 2 — ONB-D1 — Onboarding Philosophy

**Locked.** Onboarding exists to **convert a stranger into a committed athlete in one arc** — to sell the Forge vision, personalize the start, and end on curiosity, without becoming a feature tour or a setup wizard.

Every onboarding decision reinforces:
- **Vision before features.** The athlete learns *why* Forge matters before *how* it works (§21–§22).
- **Personalize, don't interrogate.** Each question must visibly improve the athlete's start (it drives the recommendation, the badge artwork, or the silent first chapter). No question is collected "for data."
- **Curiosity over completion.** The arc ends pointed at Workout #1, not at a 100%-complete profile meter.
- **The payoff is earned.** No fake progress, no welcome XP, no artificial badges, no streak, no shame. The first emotional reward arrives only when the athlete completes a real workout (§19, §23).
- **Premium restraint.** Benefit cards, not cheesy icons; vision, not comparisons to other apps; ceremony, not confetti.

> When an onboarding mechanic and a fitness/legacy value conflict, the fitness/legacy value wins (DNA §11). Onboarding is the **doorway to the product, not a product of its own.**

---

## Section 3 — ONB-D2 — Orchestration-Only Data Rule (primary governing rule)

**Locked, binding. This is the load-bearing rule from which every other onboarding decision inherits. It mirrors the Calendar's CAL-D3 and the Social SOC-D13 precedents.**

Onboarding **owns no canonical product data** except **first-time-journey state and completion flags.** Everything else it touches is **written through the owning system's own API** and thereafter belongs to that system, not to onboarding.

| Data | Owner | Onboarding may |
|---|---|---|
| Account / credentials | Account-Auth (O-1) | **invoke** O-1's create-account flow; never store credentials itself |
| Display name, username, photo, **sex** | Profile (P-1) | **write through** the profile model; never hold a second copy |
| **Athlete Type** | Profile / Rank | **derive a default** from the primary goal and write it via the profile model (§9); never re-implement Rank evaluation |
| **Goal preferences** (the 8-option taxonomy) | Onboarding (journey state) | **own** these as personalization signal that drives the recommendation — they are **not** Goal records (§10) |
| Goal **records** | Goal system (G-series) | **read** the taxonomy; never auto-create a Goal record during onboarding |
| **Equipment selection** | Profile environment field (V1) | **write** the athlete's environment; feeds recommendation + library/catalog filtering (§12) |
| **Schedule preference** | Onboarding (journey state) → recommendation | **own** as personalization signal (§13) |
| Program recommendation | Program Catalog | **read & rank** existing catalog entries; never own program logic (§14) |
| **Chapter I** record | Chapter system | **create** "Chapter I — Building Your Foundation" via the Chapter API (§15); never re-implement chapter logic |
| Honors | Honor system | **read** an earned `HonorInstance` to show M-2 (§20); never evaluate or award |
| Permissions | OS / P-5 / P-6 | **request** on-demand; defaults set silently (§16) |
| Rank / Legacy Score | RCM | **nothing** — onboarding writes no progression signal (§23) |

**The correctness test (binding):** *If onboarding were deleted, every record it created would still be valid and fully owned by its system* — the account, profile, athlete type, equipment field, and Chapter I are all first-class records of their own domains. Journey state and completion flags are the **only** records that die with onboarding. Any design in which onboarding becomes the system of record for a goal, a program, a chapter's lifecycle, an honor, or a rank signal is a violation of ONB-D2.

---

## Section 4 — ONB-D3 — The Journey Map

**Locked (sequence; per-screen layout is wireframe-level).** The first-time journey is one ordered arc in four parts. Each screen is reachable, resumable (progressive save, account-level), and — except where noted — skippable without penalty.

**First Launch (pre-account vision):**
1. **Welcome** (ONB-D4 / O-1a) — logo animation; "Begin Your Legacy."
2. **Your Next Chapter** (ONB-D5) — five premium benefit cards.

**Personalization (account + setup):**
3. **Account Creation** (ONB-D6 / O-1) — Apple · Google · Email.
4. **About You** (ONB-D7) — Name · Username (optional) · Profile photo (optional) · Sex.
5. *(derived)* **Athlete Type** (ONB-D8) — derived from primary goal; never a manual step.
6. **Goals** (ONB-D9) — up to three; one required primary.
7. **Experience** (ONB-D10) — Beginner · Intermediate · Advanced.
8. **Equipment** (ONB-D11) — Commercial Gym · Home Gym · Dumbbells Only · Bodyweight.
9. **Training Schedule** (ONB-D12) — days/week · preferred days · preferred duration.
10. **Recommended Starting Point** (ONB-D13) — "You're Ready"; recommend + explain; Start / Browse / Skip.

**Enter Forge (silent prep, ceremony, and the earned payoff):**
11. **Silent Chapter I creation** (ONB-D14) — "Chapter I: Building Your Foundation," prepared in the background. No manual creation, no full animation yet.
12. **Permissions** (ONB-D15) — requested only when valuable.
13. **Transition Into Forge** (ONB-D16) — short emotional transition; "Enter Forge."
14. **First Home Experience** (ONB-D17 / H-1) — Chapter I present, its first page waiting to be written.
15. **First Workout Completion** (ONB-D18) — the Chapter comes alive after Workout #1.
16. **First Honor** (ONB-D19) — brief, if one was earned.

**Progressive Discovery (later, in context):**
17. **Progressive Discovery** (ONB-D20) — feature education delivered when each system is first met.

> First Launch and Personalization are *setup*. Enter Forge *prepares* the payoff at steps 11–14, then *delivers* it at steps 15–16 — and that payoff lives **in the real product, earned by real training** (ONB-D22). Progressive Discovery unfolds across the athlete's return visits.

---

## Section 5 — ONB-D4 — Welcome

**Locked.** The first surface is `O-1a Welcome`, preserved and lightly extended:
- **Forge logo animation** (premium, restrained — not a splash gimmick).
- **Headline:** "Every Legacy Starts With a Foundation."
- **Body:** "Every workout, every milestone, and every accomplishment becomes part of your story. Today is where your next chapter begins."
- **Primary button:** "Begin Your Legacy." → Your Next Chapter (ONB-D5).
- A **"Sign In"** affordance for returning athletes (→ O-1d) remains, per O-1.

This honors O-1a's locked "single significant image, wordmark, quiet invitation" philosophy. Welcome is **not** a feature carousel and **never** compares Forge to other apps.

---

## Section 6 — ONB-D5 — Your Next Chapter

**Locked. Narrows O-1's "no benefits carousel" stance (see §27-A).** Before account creation, the athlete sees the **Your Next Chapter** vision screen — **five premium benefit cards** that create excitement and curiosity and introduce the Chapter philosophy **without explaining any mechanics.** Premium typographic/illustrative cards — **no cheesy icons, no app comparisons, no social proof.**

| Card | Headline | Body |
|---|---|---|
| 1 | **Your Journey** | Turn months of training into meaningful Chapters you'll remember for years. |
| 2 | **Earn Recognition** | Unlock Honors for accomplishments worth remembering. |
| 3 | **Always Know What's Next** | Follow programs built around your goals and experience. |
| 4 | **Build Together** | Train with friends and your squad. |
| 5 | **Leave a Legacy** | Everything you accomplish becomes part of your permanent story. |

The five cards create **awareness** that Chapters, Honors, Programs, Friends/Squads, and Legacy exist (§21–§22) without teaching any of them — and they frame the whole product around the Chapter the athlete is about to begin. Your Next Chapter is reconciled to O-1 as a **vision screen**, not a productivity-app feature tour: it is the legitimate, restrained expression of "this is not another fitness app." Continue → Account Creation.

---

## Section 7 — ONB-D6 — Account Creation

**Locked. Inherits O-1 unchanged.** Three entry points: **Apple** (first on iOS, per App Store), **Google**, **Email**. No guest mode (a legacy cannot be built anonymously; the account moment sets the immutable "Forging Since" date). Onboarding **invokes** O-1's flow and reads back the account + display-name handoff; it stores no credentials (ONB-D2).

---

## Section 8 — ONB-D7 — About You

**Locked.** A single personalization phase establishing identity. Fields:
- **Name** — the display name (from O-1c if already set; surfaced here for confirmation/edit).
- **Username** — optional, per Identity Amendment 001; "Skip for now" always present.
- **Profile photo** — optional; initials avatar is the complete default (no incomplete-profile framing).
- **Sex** — selection. **Sex determines badge artwork and character silhouettes only. Nothing else.** It is not a health metric, drives no Rank/Honor/Goal logic, and is never used for comparison. It selects an artwork variant for the athlete's badge and rank silhouette (owned by the Rank/Honor artwork layer); onboarding only records the selection.

**Reconciliation:** these are O-1c (name) + O-2c (username) + O-2d (photo) plus the **new Sex field**. The locked O-2 "Path Selection" (Path A/B) and the **manual Athlete-Type tile step are removed** from About You — Experience subsumes the path (§11) and Athlete Type is derived (§9). See §26 / §27.

---

## Section 9 — ONB-D8 — Athlete Type (Derived, never a manual step)

**Locked, binding — load-bearing reconciliation.** The Rank Computation Model requires an **Athlete Type** (Strength · Bodybuilding · Endurance · Hybrid) to choose each athlete's Personal-Improvement evaluation context. The requested journey does **not** include a manual Athlete-Type step. To preserve the locked Rank contract **without** redesigning Rank and **without** adding a step the vision omits, onboarding **derives a default Athlete Type from the athlete's required primary goal** and writes it through the profile model:

| Primary goal (ONB-D9) | Derived default Athlete Type |
|---|---|
| Increase Strength | Strength |
| Build Muscle | Bodybuilding |
| Improve Endurance | Endurance |
| Athletic Performance | Hybrid *(multi-modal; PO-confirmed at lock)* |
| Lose Weight | Hybrid |
| General Health | Hybrid |
| Improve Mobility | Hybrid |
| Build Consistency | Hybrid |

- The derivation is a **default, never a lock.** Athlete Type remains freely editable post-onboarding via **P-1.1 Edit Profile** (per O-2 / P-1 Amendment 002). Hybrid remains the always-valid catch-all.
- Onboarding **never re-implements Rank evaluation** — it only seeds the input the profile already stores.
- **The Strength↔Bodybuilding↔Endurance↔Hybrid contract is locked and load-bearing.** The goal→type mapping above (including Athletic Performance → Hybrid) is **PO-confirmed at lock** (§27-B); because the value is editable and Hybrid is the safe catch-all, no athlete is ever miscategorized irreversibly.

---

## Section 10 — ONB-D9 — Goals (preference, not Goal records)

**Locked.** The athlete may choose **up to three** goals, then must designate **one primary**. The primary goal **drives recommendations** (ONB-D13) and the Athlete-Type derivation (ONB-D8).

**Goal taxonomy (the eight onboarding options):** Build Muscle · Increase Strength · Improve Endurance · Athletic Performance · Lose Weight · General Health · Improve Mobility · Build Consistency.

- These are **personalization preferences owned by onboarding as journey state** (ONB-D2) — a small, fixed taxonomy. They are **not** Goal records and do **not** create anything in the Goal system. The Goal domain (G-series) continues to own freeform, chapter-scoped goal records created later in-product.
- **Up to 3 select; exactly 1 primary required.** Selecting fewer than 3 is fine; the primary is the only required choice in this step.
- The taxonomy may later be offered as a *suggestion* when the athlete creates a real chapter goal — but onboarding never writes a Goal record (avoids duplicating Goal logic; see §27-C for the optional seeding decision).

---

## Section 11 — ONB-D10 — Experience

**Locked.** One choice: **Beginner · Intermediate · Advanced.** Experience personalizes the recommendation (ONB-D13) and the tone of progressive-discovery copy.

**Reconciliation:** Experience **subsumes the locked O-2a two-way path** (Beginner ≈ Path A "just getting started"; Intermediate/Advanced ≈ Path B "training for a while"). Any path-dependent copy downstream reads Experience instead of the retired Path flag (§26). Prior-accomplishment capture (formerly O-2e, Path B only) becomes a **progressive, post-onboarding** affordance on P-1 rather than an onboarding step, keeping the arc lean (§27-D).

---

## Section 12 — ONB-D11 — Equipment (+ Home Gym Builder)

**Locked. Pulls the Environment-Tags V1.1 deferral forward into V1 (see §27-E).** The athlete selects their training environment:
**Commercial Gym · Home Gym · Dumbbells Only · Bodyweight.**

- These map onto the canonical Environment-Tags enum, **extended by one value** for `dumbbells_only`: `commercial_gym`, `home_gym`, `dumbbells_only`, `bodyweight`. The existing three values are unchanged — **no migration** of tagged programs (Environment-Tags §8). The new value is additive.
- The selection is written to the **athlete profile environment field** (the field Environment-Tags §7/§8 reserved for V1.1). It feeds: the Recommended Starting Point (ONB-D13), and **optional** Exercise-Library / Program-Catalog filtering by owned equipment. Filtering is **opt-in and non-restrictive** — the athlete can always browse **all** exercises and programs (nothing is hidden).

**Home Gym Builder (future enhancement concept):** a capability where the athlete defines **owned equipment** at a finer grain than the four environment buckets. Once present:
1. Users can define owned equipment.
2. Exercise Library and Program Catalog can filter by owned equipment.
3. Recommendations can use owned equipment.
4. Users can still browse all exercises and programs.

Home Gym Builder is the equipment-inventory layer that Environment-Tags §7 deferred ("Equipment inventory management — Post-MVP"). The four-bucket Equipment step is the V1 down-payment; Home Gym Builder is its V1.1 refinement. It is **not** required for the V1 onboarding to ship.

---

## Section 13 — ONB-D12 — Training Schedule

**Locked.** Three lightweight inputs that personalize the recommendation:
- **Days per week** (e.g., 3–6).
- **Preferred days** (which weekdays).
- **Preferred workout duration** (e.g., 30 / 45 / 60 / 75+ min).

These are **journey-state preferences** (ONB-D2). They feed ONB-D13 and may seed the Calendar's program projection context later, but onboarding writes no schedule of record (the Program Ecosystem owns `ProgramSlot`). Schedule is **never** turned into a quota, a streak target, or a shame surface (DNA §10; ONB-D22).

---

## Section 14 — ONB-D13 — Recommended Starting Point

**Locked. Pulls the Environment-Tags recommendation deferral forward as a deterministic, rule-based recommendation — not AI (see §27-E).** After personalization the athlete reaches a calm **"You're Ready"** moment:
- **Do not force a program.** The recommendation is an offer, never a gate.
- **Recommend one starting program** by ranking the **existing Program Catalog** against the athlete's **primary goal + experience + equipment + schedule** (deterministic inputs → ranked catalog read; ONB-D2 — onboarding owns no program logic).
- **Explain why** it was recommended (e.g., "Built for Strength, beginner-friendly, fits a home gym and 3 days a week.").
- **Buttons:** **Start Program** (enroll via the Program system) · **Browse Programs** (→ W-2 Program Browse) · **Skip For Now** (proceed with no active program; the Workout CTA still works).

The recommendation is **rule-based and explainable**, not generative AI (which remains Post-MVP per Environment-Tags §7). "Skip For Now" is always first-class: training is never gated on accepting a program (H-1 Decision 6; DNA §8).

---

## Section 15 — ONB-D14 — Silent Chapter I Creation

**Locked, binding — supersedes O-3 (see §27-F).** Forge **silently creates the athlete's first chapter** in the background: **"Chapter I — Building Your Foundation."**

- **No manual creation.** The athlete is **not** asked to name or confirm the first chapter (this replaces O-3a's "Name your first chapter" gate and O-3b's goal step). The chapter is prepared via the **Chapter system's own API** (ONB-D2) — onboarding does not re-implement chapter logic.
- **No full Chapter animation yet.** The chapter is *prepared*, not *celebrated*. The celebratory Chapter-comes-alive moment is **withheld until Workout #1** (ONB-D18) so the first emotional payoff is earned (ONB-D22).
- **Renaming and management** happen post-onboarding through **L-5 / chapter edit** — the athlete can rename "Building Your Foundation" to anything at any time (History Cannot Be Rewritten applies only after sealing; an active chapter's name is editable).
- Because every new athlete now has an Active Chapter, the H-1 "No Active Chapter" invitation (H-1 Decision 7) **does not appear at first run** — it remains the correct surface for later between-chapter states.

**Why this supersedes O-3:** O-3 framed first-chapter naming as the athlete's declarative act. The PO has chosen a **silent-default** model: remove setup friction, prepare the foundation invisibly, and let the athlete *earn* the chapter's meaning by training. O-3 is retired into this decision; its skip-without-shame and "chapters encouraged, never required" guarantees are preserved (the chapter exists but pressures nothing).

---

## Section 16 — ONB-D15 — Permissions

**Locked.** Permissions are requested **only when valuable**, never front-loaded (consistent with O-2's on-demand photo permission; DNA §8):
- **Notifications** — requested in the context of value: workout reminders and important updates. Governed by P-5 (ceremonies never push; toggles control push only). Declining is graceful and never re-nagged into shame.
- **Health permissions** — requested **only if useful for logging** (e.g., when an activity that benefits from Health data is first logged), not during setup.
- **Photo library** — only at "Choose Photo" (per O-2d), already on-demand.

No permission is a gate to entering Forge. Defaults (search/visibility/privacy) are set silently per O-2/P-6 with passive disclosure, never a consent wall.

---

## Section 17 — ONB-D16 — Transition Into Forge

**Locked.** A short, emotional transition bridges setup and Home — restraint, not confetti (DNA §10 bans fake celebration; this is *anticipation*, not a fabricated achievement). Sequence copy:
1. "Chapter I Prepared"
2. "Building Your Foundation"
3. "Your first Chapter is ready."
4. "It begins the moment you complete your first workout."
5. "Every great story has a beginning. Today, yours is waiting to be written."
- **Button:** "Enter Forge." → First Home (H-1).

This transition replaces O-2f's "Start Building → O-3" handoff as the onboarding terminus. It celebrates **readiness**, not a completed accomplishment — the accomplishment is still ahead, at Workout #1.

---

## Section 18 — ONB-D17 — First Home Experience

**Locked. Adds a Chapter-Card hero sub-state to H-1 (see §27-G).** Home must feel **alive, not empty** — it should create **curiosity** before the athlete trains, not a holding pattern. Primary focus is the new athlete's chapter:
- **Chapter I · Building Your Foundation**, shown in the H-1 Chapter Card hero.
- **Status copy (anticipation, not a status line):** "The first page of your Chapter is waiting to be written." with the supporting line "Your story begins with one workout." Elegant and minimal.
- **Subtle bronze outline** on the card.
- **No progress bar. No countdown. No shame. No fake accomplishment.** An empty-but-ready chapter is presented as *anticipation*, never as a deficit (DNA §2/§10; ONB-D22).
- **Primary CTA:** "Start Workout" (H-1 Decision 6 — never disabled).

Programs, Calendar, Legacy, Exercise Library, Friends, and Squads may exist on or one tap from Home but are **visually secondary** to the chapter + Start Workout. This is a new H-1 hero sub-state ("Active Chapter · awaiting first workout"), distinct from H-1's existing "No Active Chapter" invitation and its "chapter with history" state.

**Returning before Workout #1 (ONB-D17a):** if the athlete leaves and returns before completing their first workout, the Chapter card softens its copy to a simple acknowledgement of their return: **"Your first workout is ready whenever you are."** This is **not** a reminder, a re-engagement nudge, or a "welcome back" streak hook — it carries **no countdown, no streak, no shame, no pressure** (DNA §4/§10; ONB-D22). It is only a calm acknowledgement that the athlete came back. The anticipation framing and the Start Workout CTA are unchanged.

---

## Section 19 — ONB-D18 — First Workout Completion (the earned payoff)

**Locked. Layers a first-run-only ceremony on the existing W-17 completion (see §27-H).** After **Workout #1** is logged through the normal W-8→W-17 flow, the product delivers the first real emotional payoff. The reveal is **cinematic and premium** — an unhurried sequence, each beat resolving before the next:
1. **Chapter I** — the chapter title rises onto a clean page.
2. **Building Your Foundation** — the chapter name settles beneath it.
3. The athlete's **name** appears.
4. The **date** appears.
5. **Workout #1 slides into the Chapter** — the first entry takes its place on the page.
6. A **bronze animation brings the Chapter to life** (the animation withheld at ONB-D14 is *now* spent).
7. **Narrative copy:**
   - "Your first workout has become part of your story."
   - "Every Chapter represents a meaningful season of your life."
   - "Years from now, you'll be able to look back and remember exactly who you became during this one."

This ceremony is **first-run only** (gated on the journey "first workout completed" flag), **owns no logging or chapter logic** (it reads the just-logged session and the Chapter the Chapter system already holds), and is the **first** moment Forge celebrates the athlete — because it is the first thing they actually *did*. It sits **after** W-17's normal summary and **before** returning to Home.

---

## Section 20 — ONB-D19 — First Honor

**Locked.** Immediately after the Chapter reveal, **if an Honor was earned** by Workout #1, introduce it briefly using the existing **M-2 Honor Earned Modal** — onboarding **reads** the `HonorInstance`, it never evaluates or awards (ONB-D2). Keep it brief; **do not overload** the athlete (one honor moment, then Home). If no honor was earned, this step is silently absent.

---

## Section 21 — ONB-D20 — Progressive Discovery

**Locked.** Feature education is delivered **later, when relevant** — never front-loaded. Each trigger is a single, contextual, dismissible moment (no tour, no coach-mark gauntlet):

| Feature | First taught when… | Framing |
|---|---|---|
| **Calendar** | an early return visit | "See your journey unfold over time." |
| **Friends** | the first friend is added | introduce the Friends layer in context |
| **Squads** | the athlete joins or creates their first Squad | introduce Squad accountability in context |
| **Challenges** | the athlete first opens or joins a Challenge | introduce competition (behind the Firewall) in context |
| **Legacy** | the first Chapter is completed | explain that all Chapters together become the athlete's Legacy |

Progressive Discovery owns no feature logic — it only times an explanatory surface to the moment the athlete first meets each system. It carries **no streak, no nudge-to-engage, no shame** (DNA §8/§10).

---

## Section 22 — ONB-D21 — Awareness vs Education

**Locked.** During onboarding the athlete should **know that** Friends, Squads, Challenges, Honors, Programs, Chapters, and Legacy exist (delivered by Your Next Chapter, §6) — but **deep education happens later, when relevant** (§21).

- **Onboarding answers:** "Why should I use Forge?"
- **Progressive Discovery answers:** "How does Forge work?"

This split is the guardrail against the two failure modes: an overwhelming feature tour (too much, too early) and a barren start with no sense of the product's purpose (too little, too late).

---

## Section 23 — ONB-D22 — No Fake Progress / Separation from Progression

**Locked, binding (mirrors CAL-D21, SOC-D13, CS-D4).** Nothing in onboarding emits a progression-contributing event or manufactures an accomplishment.

- **No fake progress, no welcome XP, no artificial badges, no streak pressure, no shame mechanics, no profile-completion meter, no "days since," no countdown.** (DNA §4/§10; reaffirmed, not narrowed.)
- **Planning is not progress.** Choosing goals, experience, equipment, schedule, or a recommended program contributes **zero** to Rank, Legacy Score, Honor evaluation, or chapter/goal progress. *[NARROWED, bounded, by Onboarding-Amendment-003 / Honor-Catalog-Amendment-003 (2026-07-19): committing to a starting program (built or chosen) earns the single **Initiative** honor — the one permitted planning-time exception; the first-workout trigger for Initiative is fully compliant, and no XP/streak/shame/meter is introduced.]*
- **The silent Chapter I** is *prepared*, not *progressed* — it holds no workouts and no fabricated state until the athlete trains.
- **The first real emotional payoff is earned through Workout #1** (ONB-D18) and only then. The Legacy Engine produces progression; onboarding **arranges the on-ramp** to it and never feeds it. **Progression never depends on onboarding, and onboarding never becomes progression.**

---

## Non-Behaviors

Onboarding deliberately does **not** introduce, in V1 or as part of this architecture:

- **No fake progress / no welcome XP / no artificial badges** — the first reward is earned at Workout #1 (ONB-D22; DNA §10).
- **No streak, no "days since," no countdown, no profile-completion meter, no shame for an empty chapter** (DNA §4/§10; ONB-D17/D22).
- **No feature tour / no coach-mark gauntlet** — awareness in onboarding, education later (ONB-D20/D21). *[NARROWED by Onboarding-Amendment-003 (2026-07-19): a guided 4-tab tour + auto per-tab first-visit walkthroughs are admitted **after the first move** (opt-out, one-time, no progression event) — still no pre-Home tour and no front-loading.]*
- **No manual first-chapter naming gate** — Chapter I is silent (ONB-D14; supersedes O-3).
- **No forced program** — the recommendation is an offer; Skip For Now is first-class (ONB-D13).
- **No front-loaded permissions** — requested only when valuable (ONB-D15).
- **No physical-stats / health-metric collection** (weight, height, age, birthdate) — still excluded (O-1 Decision 2). Sex is artwork-only, not a health metric (ONB-D7).
- **No new domain / no new canonical data** beyond journey state + completion flags (ONB-D2).
- **No new nav tab from onboarding itself** — onboarding is a one-time arc, not a destination; the 5-tab system (Home, Workouts, Legacy, Squads, Communities — Communities promoted to a tab 2026-07-07, `Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md`) is unchanged by onboarding.
- **No AI program generation** — the recommendation is deterministic and rule-based (ONB-D13; AI remains Post-MVP).
- **No progression effect** of any kind (ONB-D22).

---

## Section 24 — Integration Map

**Locked. No existing system is redesigned; each is invoked, read, or written-through.**

| System | Onboarding relationship |
|---|---|
| **Account-Auth** (O-1) | Invokes create-account (Apple/Google/Email); reads the account + display-name handoff; stores no credentials. |
| **Profile** (P-1) | Writes name, username, photo, **sex**, and the **derived Athlete Type** through the profile model; all editable later via P-1.1. |
| **Rank** (RCM) | Reads nothing, writes only the derived Athlete-Type **input**; never re-implements evaluation; emits no progression signal. |
| **Goal** (G-series) | Reads the onboarding goal **taxonomy** as preference; never creates a Goal record; optional later suggestion only. |
| **Program Catalog / Ecosystem** | Ranks existing catalog entries for the recommendation; enrolls via the Program system on "Start Program"; owns no program logic. |
| **Environment / Equipment** | Writes the profile environment field (4 buckets incl. new `dumbbells_only`); seeds optional, non-restrictive filtering; Home Gym Builder deferred as a future enhancement. |
| **Chapter** (L-3/L-5) | Creates "Chapter I — Building Your Foundation" via the Chapter API; rename/manage via L-5; withholds the come-alive animation until Workout #1. |
| **Workout** (W-8–W-17) | First workout flows through the normal logging path; the first-run payoff layers on W-17; onboarding owns no logging logic. |
| **Honor** (Catalog / M-2) | Reads an earned `HonorInstance` to show M-2 once; never evaluates or awards. |
| **Home** (H-1) | Hands off to H-1 with the new "Active Chapter · awaiting first workout" hero sub-state; Start Workout is the primary CTA. |
| **Permissions** (P-5 / P-6 / OS) | Requests notifications/health/photo on-demand; sets privacy defaults silently with passive disclosure. |
| **Calendar / Social / Squads / Challenges** | Awareness only during onboarding (Your Next Chapter); deep education via Progressive Discovery; no logic owned. |
| **Navigation** (Master PRD §6) | A one-time arc, not a tab; the 5-tab architecture (as of 2026-07-07) is unaffected. |

---

## Section 25 — Guiding Principles (governing)

1. **Onboarding is an orchestration layer, not a domain.** It sequences; it never owns.
2. **One source of truth per fact.** Onboarding writes through the owning system; it never duplicates logic.
3. **Sell the vision, then personalize, then point at Workout #1.** Awareness now; education later.
4. **Every question must improve the athlete's start.** No data collected "for data."
5. **The payoff is earned.** No fake progress; the first reward is Workout #1.
6. **Prepare silently; celebrate what's earned.** Chapter I is prepared, not celebrated, until the athlete trains.
7. **Nothing is a gate.** No forced program, no forced chapter name, no front-loaded permission.
8. **Onboarding never becomes progression, and progression never depends on onboarding.**
9. **Premium restraint** — benefit cards, not cheesy icons; vision, not comparisons; ceremony, not confetti.

---

## Section 26 — Reconciliation Ledger (modified / affected documents)

**Authored in this pass:**
- `Docs/Onboarding-First-Time-Journey-Architecture-v1.0.md` (this document) — the governing first-time-journey authority. Home Gym Builder is captured here (ONB-D11) as a future-enhancement concept; it is not tracked in any separate list.

**Require amendment to conform (flagged for the reconciliation pass; several gated on §27):**

| Doc | Required change | Gate |
|---|---|---|
| `First-Chapter-First-Goal-Wireframe-Spec-O3.md` | Mark **superseded** by ONB-D14 (silent Chapter I); chapter naming/renaming moves to L-5. | §27-F |
| `First-Time-Setup-Wireframe-Spec-O2.md` | Remove manual Athlete-Type tile step (now derived, ONB-D8) and Path Selection (subsumed by Experience, ONB-D10); add **Sex** field (ONB-D7); relocate Prior Accomplishments to post-onboarding P-1. | §27-B/D |
| `Account-Creation-Wireframe-Spec-O1.md` | Add **Your Next Chapter** vision screen (ONB-D5); expand Decision 2 "Information Collection Boundaries" to include Sex + the personalization steps (goals/experience/equipment/schedule as journey-state, not profile health data). | §27-A |
| `MVP-Amendment-Environment-Tags-v1.0.md` | Note that onboarding equipment collection + profile environment field + recommendation are **pulled into V1** by this architecture; add `dumbbells_only` to the enum (additive, no migration); equipment inventory (Home Gym Builder) stays deferred. | §27-E |
| `Home-Screen-Wireframe-Spec-H1.md` | Add the "Active Chapter · awaiting first workout" hero sub-state (ONB-D17): bronze outline, anticipation copy ("The first page of your Chapter is waiting to be written." / "Your story begins with one workout."), the returning-before-Workout-#1 line ("Your first workout is ready whenever you are."), no progress bar/countdown/shame. | §27-G |
| `Rank-Computation-Model.md` / `Rank-System-Architecture.md` | Document that Athlete Type may be **derived** from the primary goal at onboarding (default, editable); confirm the goal→type mapping. | §27-B |
| `Workout-Summary-Spec-W17.md` | Note the **first-run-only** Chapter-comes-alive payoff (ONB-D18) that follows the standard summary on Workout #1. | §27-H |
| `Goal-Hub-Wireframe-Spec-G1.md` / `G-3` | Note that onboarding goal **preferences** are not Goal records; optional later suggestion seeding (ONB-D9). | §27-C |
| `Honor-Earned-Modal-Spec-M2.md` | Note reuse for the first-honor onboarding moment (read-only; brief). | — |
| `L-5-Chapter-Creation-Spec.md` | Note it is now also the **rename/manage** path for the auto-created Chapter I. | — |
| `P-5-Notifications` / `P-6-Privacy` | Note on-demand permission timing + silent defaults during onboarding (already consistent). | — |
| `Forge-Legacy-Master-PRD.md` (§3/§5/§17/§19) | Onboarding journey expanded (vision sell + personalization + recommendation + silent first chapter); athlete-type derivation; Sex field; equipment in V1. | §27 (all) |
| `FORGE_LEGACY_PRODUCT_DNA.md` (§10) | **No narrowing.** Add a confirming pointer that onboarding reaffirms the fake-progress/streak/shame prohibitions (ONB-D22). | — |

---

## Section 27 — Conflicts & Resolutions (PO-confirmed at lock)

The journey **changes locked specs and pulls deferred scope forward.** Each item below records the conflict and the **product-owner-confirmed resolution** adopted at lock. Together they constitute the amendment mandate executed by the reconciliation ledger (§26).

- **§27-A — Your Next Chapter vs O-1 "no benefits carousel." Resolved.** O-1's locked philosophy rejected a "features showcase or benefits carousel"; Your Next Chapter is admitted as a *vision* screen (no feature tour, no app comparisons, no social proof) — a narrowing, not a reversal. *Low risk.*
- **§27-B — Athlete Type derivation (load-bearing). Resolved.** Rank requires one of four Athlete Types; the journey omits the manual step. A default is **derived from the primary goal** (ONB-D8 table, with Athletic Performance → Hybrid), editable in P-1.1. The locked Rank contract is preserved; no manual step is added. *Medium risk — accepted; the value is editable and Hybrid is the safe catch-all.*
- **§27-C — Onboarding goals vs Goal records. Resolved.** Onboarding goals stay **preference signal only** — they never auto-create Goal records. The primary goal may later *suggest* (never auto-create) a chapter goal. *Low risk.*
- **§27-D — Experience vs O-2 Path / Prior Accomplishments. Resolved.** Experience (3-level) subsumes the locked 2-way Path; O-2e Prior Accomplishments **relocates to a post-onboarding P-1 affordance**. *Low risk.*
- **§27-E — Equipment + Recommendation vs Environment-Tags deferral. Resolved.** The Environment-Tags V1.1/Post-MVP deferral of onboarding equipment collection, the profile environment field, and recommendation is **pulled into V1 as scoped** (recommendation = deterministic, not AI; AI stays deferred); `dumbbells_only` is added (additive, no migration); equipment inventory (Home Gym Builder) remains a future enhancement. *Medium risk — accepted; expands MVP scope deliberately.*
- **§27-F — Silent Chapter I vs O-3. Resolved.** ONB-D14 **supersedes** O-3's explicit chapter-naming gate; O-3 is retired into ONB-D14; renaming moves to L-5. *Medium risk — accepted; supersession is intentional.*
- **§27-G — H-1 new hero sub-state. Resolved.** H-1 gains the "Active Chapter · awaiting first workout" hero sub-state; it does not disturb the locked tiers or the No-Active-Chapter invitation. *Additive; low risk.*
- **§27-H — First-workout payoff vs W-17. Resolved.** A first-run-only ceremony layers on the standard W-17 summary, reading existing records only. *Additive; low risk.*

**No conflict found with:** DNA §4/§10 (onboarding reaffirms the prohibitions; ONB-D22), the 5-tab Navigation System (as of 2026-07-07), the Performance Firewall (no performance is surfaced during onboarding), Honors (read-only M-2), Calendar (awareness/progressive-discovery only), Squads/Social/Challenges (awareness only), Never-Charge-For-History.

---

## Section 28 — Validation Checklist

- [ ] ONB-D1 — Philosophy: vision-before-features; personalize-don't-interrogate; curiosity-over-completion; payoff earned; premium restraint
- [ ] ONB-D2 — Orchestration-Only Data Rule (binding): owns only journey state + completion flags; correctness test; writes through owning systems
- [ ] ONB-D3 — Journey map: 17-part arc in three movements; resumable; skippable without penalty where noted
- [ ] ONB-D4 — Welcome: logo animation; "Every Legacy Starts With a Foundation."; body copy; "Begin Your Legacy."
- [ ] ONB-D5 — Your Next Chapter: five benefit cards (Your Journey / Earn Recognition / Always Know What's Next / Build Together / Leave a Legacy); no cheesy icons, no app comparisons
- [ ] ONB-D6 — Account Creation: Apple · Google · Email; no guest mode (inherits O-1)
- [ ] ONB-D7 — About You: name · username (optional) · photo (optional) · **Sex** (artwork/silhouette only, nothing else)
- [ ] ONB-D8 — Athlete Type derived from primary goal (default, editable in P-1.1); Rank contract preserved; mapping confirmed (§27-B)
- [ ] ONB-D9 — Goals: up to 3, exactly 1 primary required; eight-option taxonomy; preference not Goal record; drives recommendation
- [ ] ONB-D10 — Experience: Beginner / Intermediate / Advanced; subsumes O-2 Path
- [ ] ONB-D11 — Equipment: Commercial Gym / Home Gym / Dumbbells Only / Bodyweight; `dumbbells_only` additive; non-restrictive filtering; Home Gym Builder noted as a future enhancement
- [ ] ONB-D12 — Training Schedule: days/week · preferred days · duration; preference only; never a quota/streak
- [ ] ONB-D13 — Recommended Starting Point: "You're Ready"; recommend + explain; Start / Browse / Skip; not forced; rule-based not AI
- [ ] ONB-D14 — Silent Chapter I "Building Your Foundation"; no manual creation; no full animation yet; supersedes O-3; rename via L-5
- [ ] ONB-D15 — Permissions on-demand (notifications/health/photo); never front-loaded; declines graceful
- [ ] ONB-D16 — Transition: five copy beats; "Enter Forge."; readiness not accomplishment
- [ ] ONB-D17 — First Home: Chapter I hero; anticipation copy ("The first page of your Chapter is waiting to be written." / "Your story begins with one workout."); returning line ("Your first workout is ready whenever you are."); bronze outline; no progress bar/countdown/shame; Start Workout primary; other areas secondary
- [ ] ONB-D18 — First Workout payoff: fade → chapter opens → name → date → Workout #1 slides in → bronze animation → three copy lines; first-run only; layers on W-17
- [ ] ONB-D19 — First Honor: brief, via M-2, only if earned; no overload
- [ ] ONB-D20 — Progressive Discovery: Calendar / Friends / Squads / Challenges / Legacy taught in context, later
- [ ] ONB-D21 — Awareness vs Education: onboarding answers "why"; discovery answers "how"
- [ ] ONB-D22 — No fake progress / welcome XP / artificial badges / streak / shame; planning is not progress; separation from progression
- [ ] Non-Behaviors honored; Integration Map respected; §27 conflicts PO-confirmed at lock
- [ ] No contradiction with DNA, Master PRD, O-1, Rank, Goals, Program Catalog, Honors, H-1, L-5, W-17, P-5/P-6 (beyond the enumerated, PO-approved amendments)

---

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | June 2026 | Initial. Establishes the Onboarding / First-Time User Journey as Forge Legacy's governing **orchestration layer** — owns no canonical data except journey state + completion flags (ONB-D2). Defines: onboarding philosophy (ONB-D1); the 17-part journey map (ONB-D3); Welcome (ONB-D4); Your Next Chapter five-card vision sell (ONB-D5); Account Creation (ONB-D6); About You incl. the new Sex field (ONB-D7); **Athlete-Type derivation** preserving the Rank contract without a manual step (ONB-D8); Goals as preference taxonomy (ONB-D9); Experience subsuming the O-2 Path (ONB-D10); Equipment with the additive `dumbbells_only` value + Home Gym Builder as a future-enhancement concept (ONB-D11); Training Schedule (ONB-D12); the rule-based Recommended Starting Point (ONB-D13); **silent Chapter I creation superseding O-3** (ONB-D14); on-demand Permissions (ONB-D15); the Transition ceremony (ONB-D16); the First Home "awaiting first workout" hero sub-state with anticipation copy and the returning-before-Workout-#1 acknowledgement (ONB-D17); the **earned, cinematic First Workout payoff** (ONB-D18); the brief First Honor reuse of M-2 (ONB-D19); Progressive Discovery (ONB-D20); the Awareness-vs-Education split (ONB-D21); and the no-fake-progress / separation-from-progression rule (ONB-D22). Pulls the Environment-Tags V1.1 equipment+recommendation deferral into V1 (rule-based, no migration). Reconciliation ledger (§26) and eight §27 reconciliation decisions documented and **PO-confirmed at lock**. The journey map is organized into First Launch · Personalization · Enter Forge · Progressive Discovery. No locked entity redesigned; O-3 superseded; all other touches are enumerated amendments confirmed in §27. **Status: LOCKED — ready for the Architecture Freeze.** |

---

*Forge Legacy — Onboarding / First-Time User Journey Architecture*
*v1.0 — June 2026*
*Authority: FORGE_LEGACY_PRODUCT_DNA.md; Forge-Legacy-Master-PRD.md; O-1; O-2; O-3 (superseded); H-1; Environment-Tags Amendment; Rank-Computation-Model / Rank-System; Goal G-1/G-3; Program Catalog / Ecosystem; Honor Catalog / M-2; L-5; W-17; P-5 / P-6 — all LOCKED/lock-ready*
*Supersedes: First-Chapter-First-Goal-Wireframe-Spec-O3.md (silent Chapter I). Resolves: the missing vision-sell, personalization, recommendation, and silent-first-chapter gaps in the onboarding arc.*
*Status: LOCKED (June 2026) — PO-approved; §27 reconciliation decisions confirmed; ready for the Architecture Freeze.*
