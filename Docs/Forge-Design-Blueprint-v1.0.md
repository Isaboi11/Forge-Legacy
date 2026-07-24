# Forge Design Blueprint v1.0

**Purpose of this document:** This is a design-facing synthesis of Forge Legacy's product structure, screen system, reusable patterns, and UI requirements, built for **Claude Design** so it can understand the product without reading the full repository. It is derived entirely from existing LOCKED (or explicitly noted as lock-candidate/draft) architecture, wireframe specs, and design-system documents in `Docs/`. **No new features, screens, flows, components, ranks, honors, charts, or interactions have been invented.** Every section cites its source document(s). Where the source material is silent, ambiguous, or internally contradictory, this document says so explicitly under **"Unresolved / needs confirmation."**

**Status of the underlying product (for calibration):** Architecture is ~100% frozen (V1 Architecture Freeze declared 2026-06-30). Wireframes are ~95% complete. Content authoring (programs, exercises, honors) is ~12%. Code implementation is effectively 0% for product screens (a handful of foundational component libraries — Buttons/Inputs/Cards/Navigation/Modals/Progress — were committed early and have since been reclassified LEGACY/REFERENCE while the visual system is rebuilt in Claude Design). *(Source: Forge-Legacy-Master-Status.md)*

## Revision Log
- **v1.0 (2026-07-02):** Initial synthesis from locked repository documentation.
- **v1.1 (2026-07-02):** Two design decisions incorporated per direct stakeholder direction, at the time not yet reflected in any locked `Docs/*.md` architecture or wireframe file: (1) **Communities navigation finalized** — Home and Squads are the discovery entry points into Communities; there is no bottom-navigation tab for it. (2) **Transformation Gallery** — a new Legacy feature, added as a sibling to the existing Photos gallery.
- **v1.2 (2026-07-02):** Both v1.1 decisions are now **formalized in official architecture** — this blueprint is reconciled to cite the resulting locked documents rather than describing them as pending. Communities navigation: `Docs/Amendments/Community-Architecture-Amendment-001-Navigation-Entry-Points.md` (new, LOCKED); `Home-Screen-Wireframe-Spec-H1.md` → v1.3 (new Tier 6); `Squads-Hub-Wireframe-Spec-S1.md` → v1.5 (new Tier 3); `Community-System-Architecture-v1.0.md` COM-D18 pointer added; `Global-Search-Architecture-v1.0.md`'s stray "5-tab hierarchy" reference corrected. Transformation Gallery: `Transformation-Gallery-Architecture-v1.0.md` and `Transformation-Gallery-Wireframe-Spec-L17-L18.md` (both new, LOCKED); `Legacy-Hub-Wireframe-Spec-L1.md` → v1.1 (new §8a entry point); `Photos-Wireframe-Spec-L15-L16.md` gets a differentiation cross-reference. See §18 for the complete, updated source list.
- **v1.3 (2026-07-02):** Documentation-consistency audit reconciliation. This blueprint had one remaining internal self-contradiction that v1.2 did not touch: §3 (Navigation Map), §6 (Component Usage Rules), and the Self-Audit section still described the 4-tab-vs-5-tab Profile conflict as **unresolved**, citing `Home-Screen-Wireframe-Spec-H1.md` at the superseded v1.2 and `Global-Search-Architecture-v1.0.md`'s pre-correction wording — even though both had already been corrected, and even though this same document's own §4/§5/§7 already treated the 4-tab model as settled fact. §3, §6, and the Self-Audit "Unresolved items" list are now rewritten to state the single, resolved navigation model throughout: 4 tabs (Home, Workouts, Legacy, Squads); Profile via App Bar avatar only, never a tab; Communities via Home (primary "Explore Communities") and Squads (secondary entry point) only, never a tab. No other content changed.
- **v1.4 (2026-07-07):** Communities promoted to a 5th bottom-navigation tab, reversing v1.1–v1.3's "not a tab" position — `Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md` (new, LOCKED); `Community-System-Architecture-v1.0.md` COM-D18 revised; Home's "Explore Communities" module (Tier 6) and Squads' secondary entry point (Tier 3) both retired as redundant. Navigation model is now: 5 tabs (Home, Workouts, Legacy, Squads, Communities); Profile via App Bar avatar only, never a tab. §3, §4, §5, §6, §7, and the Self-Audit section updated accordingly.
- **v1.5 (2026-07-08):** W-1 Workouts Hub retired as the Workouts tab's dispatch screen — `Docs/Amendments/Workouts-Navigation-Amendment-001-Retire-Workouts-Hub.md` (new, LOCKED). The Workouts tab now opens directly to W-2 Program Browse. W-1's chapter-context, quick-start, and next-session responsibilities are already covered by H-1's existing tiers and W-2's own Active Program section — no replacement screen was built to imitate W-1. Two W-1 features (the Workout With Friend management queue; the Import Training entry point) are explicitly acknowledged as not yet given a new home, per the amendment's own open-items list — this blueprint does not invent one either. §3 (Calendar entry point), §4 (W-1 row dropped from Screen Inventory), §5 (program discovery flow), §6 and §9 (Smart Omission examples), §13 (Program progress bar component table), and §18 (Source Document Index) updated accordingly.

---

## 1. Product Overview

### What Forge Legacy is
"Forge Legacy is a fitness legacy app. It is not a workout tracker. The tracker is the engine. The Legacy is the product." Its mission: help people build a meaningful fitness legacy over years and decades, not chase short-term performance metrics — it answers "Who am I becoming?" not "How do I compare?" The athlete is building a life story, not accumulating workout statistics. *(Source: FORGE_LEGACY_PRODUCT_DNA.md §1; Forge-Legacy-Master-PRD.md / FORGE_LEGACY_PRD.md §2)*

Tech context: Expo v56, React Native, TypeScript, Expo Router (file-based routing), targeting iOS and Android. *(Source: Forge-Legacy-Master-PRD.md "Quick Context")*

### Core user promise
"Build the app that lets athletes preserve, reflect on, and share the full story of their fitness journey." Eight guiding principles govern every product decision:
1. The app rewards transformation, not activity.
2. History is permanent. Memories can be added. Outcomes cannot change.
3. Every Legacy starts with a foundation.
4. Accountability without shame.
5. Never charge for history.
6. The athlete is the protagonist. The app is the chronicler.
7. Elegance over complexity. Less is more. Depth over breadth.
8. Chapters are the organizing unit of a life, not just a fitness period.
*(Source: Forge-Legacy-Master-PRD.md §2 / FORGE_LEGACY_PRD.md §2)*

### Primary product pillars
Four relationship/structural pillars organize the product: **Legacy** ("what have I built?"), **Friends** ("who do I know?"), **Squads** ("who do I train with?"), and **Communities** ("who shares my interests?"). *(Source: Community-System-Architecture-v1.0.md)* Communities is its own bottom-navigation tab as of 2026-07-07 — designed as a high-frequency, checked-daily feed (announcements, member posts), a different usage pattern than the occasional-discovery model assumed by the original Home/Squads entry points, which are now retired; see §3 and §4. *(Source: Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md; Community-System-Architecture-v1.0.md COM-D18, revised)*

Within Legacy, the organizing unit is the **Chapter** — a named, athlete-declared period of training/life, holding Goals, Programs, Honors, Photos, and a closing Reflection. *(Source: Goal-Hub-Wireframe-Spec-G1.md; Chapter-Detail-Wireframe-Spec-L3-L4.md)* Legacy also includes a dedicated **Transformation Gallery** — a chronological, chapter-tied visual record of the athlete's physical transformation, distinct from the general Photos gallery (L-15/16); see §4 and §18. *(Source: Transformation-Gallery-Architecture-v1.0.md; Legacy-Hub-Wireframe-Spec-L1.md §8a)*

Architecture guardrails that function as pillars in practice: Never Charge For History; History Cannot Be Rewritten; Chapters Are Sacred; Rank Represents Legacy (not competition/status); Accomplishments Are Identity (not performance stats); Honors Are Recognition (not trophies/collectibles); Squads Are Private (small, high-trust, accountability-focused). *(Source: FORGE_LEGACY_PRODUCT_DNA.md §9)*

The **Performance Firewall** is the single most important cross-cutting design constraint: comparison/ranking/standings data is never shown on an always-on surface (Friends Feed, Communities, Calendar). It is deliberately and narrowly **lifted only** for Squad-internal surfaces (S-2 Squad Detail, not S-1 Squads Hub) and for a squad's own Challenge/Competition standings — see §11 and §13 for the exact scope. *(Source: Squad-System-Architecture-v1.0.md; Comparison-Philosophy-Amendment-001.md as referenced; Challenge-System-Architecture-v1.0.md)*

### What the app is NOT
Explicitly, by name, in the Product DNA: a social network; a leaderboard platform; a streak app; an influencer platform; a content creation platform; a challenge app; a workout feed; a public performance platform; a productivity gamification system. *(Source: FORGE_LEGACY_PRODUCT_DNA.md §4)*

Explicitly prohibited interaction patterns: public leaderboards, workout feeds, like systems, follower systems, comment systems, public workout statistics, streak pressure systems, "days since workout" shame mechanics, rank comparisons, public goal progress, public body metrics. *(Source: FORGE_LEGACY_PRODUCT_DNA.md §10)*

Who it is not for: people wanting a pure performance-analytics dashboard; athletes seeking social-media-style public feeds/follower counts; users wanting community forums, public comments, or content-creation tools; people wanting coach/trainer account management; anyone wanting a calorie/macro/nutrition tracker. *(Source: Forge-Legacy-Master-PRD.md §3)*

**Product feel target: "70% Luxury Legacy / 30% Performance Tool."** "The product should feel like it belongs in the same drawer as a journal you keep for years — not the same folder as a habit-tracking app." *(Source: Forge-Legacy-Master-PRD.md §4)*

---

## 2. Design Principles

### Visual tone
Five words that must describe the product: **"Forged. Grounded. Earned. Cinematic. Permanent."** Five words that must never describe it: **"Playful. Neon. Flat. Generic. Urgent."** General tone: "premium, dark, disciplined, cinematic, athletic, and legacy-driven." *(Source: Forge-Legacy-Design-System-v1.0.md §1)*

Product DNA keywords for the design language: Legacy, Craftsmanship, Heritage, Depth, Simplicity, Strength, Permanence, Purpose. Interface style: mobile-first, clean, spacious, premium, purposeful. "Every element should justify its existence. Visual clutter is the enemy." *(Source: FORGE_LEGACY_PRODUCT_DNA.md §6)*

Brand personality: should feel timeless, premium, intentional, crafted, mature, strong, quietly confident, meaningful; should never feel loud, flashy, juvenile, hyper-competitive, trend-driven, or social-media inspired. *(Source: FORGE_LEGACY_PRODUCT_DNA.md §5; Forge-Legacy-Master-PRD.md §4 adds: Premium, Serious ["no confetti for mediocrity"], Warm ["a coach who believes in you, not a spreadsheet"], Permanent, Proud)*

Imagery direction: photography over illustration, real athletes, real environments, not stock icons. *(Source: Forge-Legacy-Master-PRD.md §4)*

### Interaction tone
Four UX-philosophy principles govern interaction design:
- **Recognition Before Gamification** — "Recognition is meaningful. Gamification is temporary."
- **Progress Without Pressure** — "The athlete should always feel invited. Never pushed."
- **Simplicity Wins** — if two solutions accomplish the same goal, choose the simpler one.
- **Deliberate Interaction** — "The app should feel intentional. Not addictive. Not compulsive. Not engineered for endless engagement."
*(Source: FORGE_LEGACY_PRODUCT_DNA.md §8)*

Anti-shame is a binding, component-level rule: no drain-direction animations, no red states for "nothing logged," no "days since" counters, no streak-pressure patterns anywhere in the product. *(Source: Component-Library-Architecture-v1.0.md §2, CLA-P2)*

### Reuse rules
- "Application screens consume the design system. Screens do not implement custom UI." Any UI pattern used on 2+ screens, or complex enough to need state management, must be a named library component — never re-implemented inline. *(Source: Forge-Design-System-Architecture-v1.0.md §1.2; Component-Library-Architecture-v1.0.md §14.2)*
- Forking a component (copying its file and modifying it) is never permitted. *(Source: Forge-Design-System-Architecture-v1.0.md §10.6; Component-Library-Architecture-v1.0.md §14.4)*
- Screen-level code may never override a canonical component's internal behavior (layout, state rendering, accessibility declarations, animation curves, token assignments, sizing) — this is "The Override Prohibition" (CLA-D16). If a screen needs a behavior the library doesn't support, the behavior is added to the library via a formal amendment first. *(Source: Component-Library-Architecture-v1.0.md §14.5, §2 CLA-P6)*

### What must remain consistent across screens
The six governing component-library principles apply everywhere without exception:
1. **CLA-P1 — Earned Visual Weight:** the bronze accent marks progress/achievement/legacy, never excitement or engagement bait. Test: "does this surface communicate something the athlete built?"
2. **CLA-P2 — Accountability Without Shame:** no urgency/failure/absence signaling anywhere.
3. **CLA-P3 — Performance Firewall at the Component Layer:** no ranking/standings/cross-athlete comparison component may render outside a squad-scoped or challenge-scoped surface.
4. **CLA-P4 — Every Element Earns Its Place:** a variant/state/property that can't be justified by a named screen requirement doesn't exist.
5. **CLA-P5 — Reduce Motion Is First-Class:** every animated component ships with its Reduce Motion alternative from the start, not as a later pass.
6. **CLA-P6 — Components Own Behavior; Screens Own Composition.**
*(Source: Component-Library-Architecture-v1.0.md §2)*

Dark-mode only for V1 — no conditional light/dark logic unless a future Architecture Amendment introduces light mode explicitly. Typography is the platform system font (SF Pro / Roboto) at all times — no custom typeface. Maximum font weight is Semibold (no Bold/Black); ALL-CAPS is restricted to the 11sp `sectionHeader` scale only. Phosphor Icons is the sole icon library for UI icons (no SF Symbols/Material/Ionicons); bespoke brand assets (logo, rank insignia, honor badge artwork) are separate and not governed by icon rules. *(Source: Component-Library-Architecture-v1.0.md §5.6, §10, §11, §12.1; Forge-Legacy-Design-System-v1.0.md §1, §3.1, §10)*

**Unresolved / needs confirmation:** The Component Library Architecture doc (§16, CLA-OQ-5) itself still calls color hex values "DEFERRED... provided by a future Branding Assets document," while the peer `Forge-Legacy-Design-System-v1.0.md` already states specific hex values (see below). This blueprint treats `Forge-Legacy-Design-System-v1.0.md`'s hex values as the operative visual source of truth per the Master Status Dashboard's own designation of that document, but flags that the CLA doc has not been reconciled to match.

---

## 3. Navigation Map

**Navigation model — finalized, single model, no open conflict:** Bottom navigation is exactly **5 tabs — Home, Workouts, Legacy, Squads, Communities** (Communities promoted from a Home/Squads discovery entry point 2026-07-07). Profile is never a tab; it is reached only via the top-right App Bar avatar, opening as a modal sheet. This is confirmed consistently across every governing source: `Forge-Legacy-Master-PRD.md` (§6, §19, LOCKED), `Community-System-Architecture-v1.0.md` (COM-D18, revised 2026-07-07), `Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md` (LOCKED), `Onboarding-First-Time-Journey-Architecture-v1.0.md`, `Component-Library-Architecture-v1.0.md` (CLA-C19, now "five tabs"), and `Global-Search-Architecture-v1.0.md`. The documentation conflict this section previously described (the 4-tab-vs-5-tab-Profile drift) was resolved at the source in 2026-07-02; the tab count changed again, correctly, on 2026-07-07 when Communities was promoted — there is no remaining ambiguity for Claude Design to account for.

### Top-level tabs (5, per Master PRD / Community-Architecture-Amendment-002)
1. **Home** — "the emotional anchor and daily entry point... surfaces the athlete's current story and provides the primary workout CTA."
2. **Workouts** — "Performance engine. Logging, programs, templates, history."
3. **Legacy** — "The story. Chapters, timeline, honors, accomplishments, photos... the most emotionally valuable tab in the app."
4. **Squads** — "Accountability and connection. Shared workouts, check-ins, squad activity. No public feeds. No follower counts."
5. **Communities** *(added 2026-07-07)* — "The large-scale, interest-based social layer. Announcements, member posts, discussion — a feed people are expected to check daily," distinct from Squads' small private circle.
Navigation rules: tab-root screens **replace** on tap (never push); each tab keeps its own independent navigation stack; Active Workout screens (W-9–W-16) hide both the top bar and bottom nav entirely. *(Source: Forge-Legacy-Master-PRD.md §6)*

**Profile** is reached via the top-right avatar from any tab, opening as a modal sheet that does not replace tab context. It is never a bottom-navigation tab. Settings (P-4) is reached only from a Settings row inside Profile — never directly from any tab. *(Source: Forge-Legacy-Master-PRD.md §6; Home-Screen-Wireframe-Spec-H1.md §12.3; P-4-Settings-Root-Architecture.md)*

### Cross-cutting surfaces (not tabs)
- **Calendar** — a read/write timeline layer that owns no data of its own; entry points are the Workouts tab header (W-2 Program Browse — the tab root as of 2026-07-08, W-1 retired) and L-1/L-2. Shows completed workouts, scheduled intent, rest days, program-projected sessions, goal milestones, challenge date envelopes (no scores), honors as date markers, and an opt-in backward-looking consistency heat-map ("memory, not pressure"). *(Source: Calendar-System-Architecture-v1.0.md; Docs/Amendments/Workouts-Navigation-Amendment-001-Retire-Workouts-Hub.md)*
- **Global Search** — "a dedicated, application-level screen that sits outside the tab hierarchy — not nested in P-1, not added to any tab-root App Bar." Exact entry gesture is deferred to a not-yet-authored Search wireframe spec. *(Source: Global-Search-Architecture-v1.0.md — Unresolved: entry-point affordance)*

**Superseded (2026-07-07):** Communities was previously listed here as a cross-cutting surface reached only via a Home "Explore Communities" module (primary) and a Squads secondary entry point (navigation finalized 2026-07-02). Both are retired — Communities is now its own tab (see "Top-level tabs" above and §4/§7 for what changes downstream). *(Source: Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md)*

### Secondary flows
Program discovery (W-2→W-3), Workout Builder (W-24 for program slots, W-25 for free templates), Exercise Library (W-21→W-22, W-23 picker), Goal management (G-1→G-2→G-3), Legacy/Chapter management (L-1→L-2/L-3/L-4/L-5/L-6/L-11/L-12–14/L-15–16), Squad management (S-1→S-2→S-3), Challenges (C-1→C-2/C-3/C-4, plus C-5/C-6/C-7 squad legacy screens), Settings (P-4→P-5/P-6/P-8/P-9).

### Modal / bottom-sheet flows
- **Full navigator exit (native alert → route to O-1a):** Sign Out, Delete Account confirmations.
- **Nested modal-stack push (not a new modal):** P-4→P-5/P-6/P-8/P-9 all push onto Profile's existing stack.
- **Bottom sheet:** Set Input Sheet (W-9–W-16), Persistence Choice sheet (exercise replace), P-9 re-authentication, Share Configuration (SH-1), Partner Selection (W-20), Filter sheet (W-23), Squad Options / Transfer Ownership sheets (S-2/S-3).
- **Full-screen, no chrome:** O-1a Welcome; Active Workout W-9–W-16.
- **Ceremony modal (centered, no tap-outside dismiss):** M-1 through M-7 (see §8, §15).
- **In-app webview sheet:** Terms of Service / Privacy Policy links from P-4.
- **Toast (transient, non-modal):** e.g., "[Chapter Name] has started." after chapter creation; "3s auto-dismiss."
*(Source: Account-Auth-Architecture.md; P-4/5/6/8/9 specs; Active-Workout-Flow-Spec-W9-W16.md; Share-Configuration-Step-Wireframe-Spec-SH1.md; L-5-Chapter-Creation-Spec.md; Component-Library-Architecture-v1.0.md CLA-C22 Toast)*

### Authentication / onboarding flows
Two coexisting "truths" exist in the repo and Claude Design should be aware of both:

**A) The original, screen-level flow (O-1, O-2, O-3), each independently LOCKED:**
- **O-1 Account Creation** (4 sub-screens: Welcome, Create Account, Display Name, Sign In + Forgot Password): email+password or Apple/Google Sign-In, no guest mode, sets the immutable "Forging Since" date.
- **O-2 First-Time Setup** (6 sub-screens): Path Selection, Athlete Type (4 tiles: Strength/Bodybuilding/Endurance/Hybrid), Username, Profile Photo, Prior Accomplishments (experienced path only), Completion.
- **O-3 First Chapter/First Goal** (2 sub-screens): Chapter name (skippable), optional Goal.
*(Source: Account-Creation-Wireframe-Spec-O1.md; First-Time-Setup-Wireframe-Spec-O2.md v1.1; First-Chapter-First-Goal-Wireframe-Spec-O3.md)*

**B) The superseding governing architecture — `Onboarding-First-Time-Journey-Architecture-v1.0.md` (LOCKED)** — a 17-step orchestration layer that expands and reorders the above: Welcome → **Your Next Chapter** (new vision-sell screen) → Account Creation → **About You** (name/username/photo/sex-as-artwork-only) → **Athlete Type now derived** from primary goal, never a manual tile tap → **Goals** (up to 3 from an 8-option taxonomy) → **Experience** (replaces Path Selection) → **Equipment** → **Training Schedule** → **Recommended Starting Point** → **silent Chapter I creation** (no manual naming step — supersedes O-3 entirely) → Permissions (on-demand only) → Transition → First Home → First Workout Completion ceremony → First Honor → Progressive Discovery.

**Unresolved / needs confirmation:** This architecture's own §26 reconciliation ledger states that O-1, O-2, O-3, H-1, W-17, and the Rank Computation Model have **not yet been edited** to reflect these changes — the original wireframe specs and this superseding architecture coexist un-merged in the repo as of this writing. Claude Design should treat the 17-step journey as the current intended behavior, but should not be surprised if visual specs for steps like "Your Next Chapter," "Goals," "Experience," "Equipment," or "Training Schedule" don't yet exist as pixel-level wireframes.

The logged-out destination for every case (fresh launch, sign out, delete account, session expiry) is always **O-1a Welcome**. *(Source: Account-Auth-Architecture.md)*

---

## 4. Screen Inventory

Each entry: Screen name/ID · Purpose · Primary action · Key content · Reusable components/patterns · Source. Lock status is noted where the source doc states one.

### Onboarding / Auth
| Screen | Purpose | Primary action | Key content | Components | Source |
|---|---|---|---|---|---|
| **O-1a Welcome** | First screen, no chrome | Tap "Begin Your Legacy" or "Sign In" | Full-bleed hero photography | Full-bleed hero | Account-Creation-Wireframe-Spec-O1.md (LOCKED) |
| **O-1b Create Account** | Establish identity | Email+password or Apple/Google | Email, password | Standard form + social-auth buttons | same (LOCKED) |
| **O-1c Display Name** | Name the athlete | Enter name (skippable) | Display name field | Text entry | same (LOCKED) |
| **O-1d Sign In** | Returning athlete auth | Enter credentials | Email/password or social | Standard form | same (LOCKED) |
| **O-2a–f First-Time Setup** | Declare athlete identity | Path→Type→Username→Photo→(Accomplishments)→Done | 4 Athlete Type tiles, username, photo | 2×2 tile grid, inline text field | First-Time-Setup-Wireframe-Spec-O2.md (LOCKED v1.1) |
| **O-3a/b First Chapter/Goal** | Name first chapter + goal | Type chapter name, optional goal | Chapter name, Goal name/target/unit | Push-nav text entry | First-Chapter-First-Goal-Wireframe-Spec-O3.md (LOCKED, **superseded** by Onboarding Architecture §7/ONB-D14) |

### Home
| **H-1 Home** | "What should I focus on today?" — Daily Focus Surface | One-tap Workout CTA | 5 ordered tiers (Chapter Card, Active Program Card, Workout CTA, Recent Legacy Activity, Squad Card) + non-tiered Homepage Principle inscription | ChapterCard (CLA-C25), ProgramCard (CLA-C26), HomepagePrinciple (CLA-C37) | Home-Screen-Wireframe-Spec-H1.md (Lock-Ready — Tier 6 "Explore Communities" module added 2026-07-02, retired 2026-07-07 when Communities became its own tab) |

### Workouts / Active Session
| Screen | Purpose | Primary action | Key content | Components | Source |
|---|---|---|---|---|---|
| **W-8 Activity Type Picker** | Pure routing | Tap 1 of 9 activity-type tiles | 3×3 icon+label grid | Tile grid | Activity-Type-Picker-Spec-W8.md (Lock-Ready) |
| **W-9–W-16 Active Workout Flow** | "What am I doing right now?" execution | Log Set, Add Exercise, End Workout | Exercise cards (Active/Completed/Upcoming), rest overlay, notes | Set Input Sheet, ExerciseRow (CLA-C31), Rest overlay + ProgressRing | Active-Workout-Flow-Spec-W9-W16.md (LOCKED v1.5) |
| **W-17 Workout Summary** | "What happened? Where does this go?" | Done / Share / View in Chapter | Chapter Attribution Card, Session Summary, Program Progress | WorkoutSessionCard (CLA-C30) | Workout-Summary-Spec-W17.md |
| **W-18 Activity History** | "What have I done?" complete log | Filter by type, tap row | Month-grouped session rows | ListItem (CLA-C16) | Activity-History-Wireframe-Spec-W18.md (LOCK CANDIDATE) |
| **W-19 Activity Detail** | Read-only historical record | View; tap Chapter/Program/Trained-With rows | Session hero, exercise list, attribution rows | — | Activity-Detail-Wireframe-Spec-W19.md (LOCK CANDIDATE, v1.4) |
| **Rest Timer (cross-cutting)** | Governs rest state during W-9–16 | Ready tap / next-set tap | Count-up timer, optional ProgressRing | ProgressRing (owned exclusively here, not in CLA catalog) | Rest-Timer-Architecture-v1.0.md (LOCK-CANDIDATE) |
| **W-20 Partner Selection Sheet** | Post-workout partner tagging | Select up to 3 partners | Squad/Other Athletes lists | Bottom sheet | Partner-Selection-Sheet-W20.md (LOCKED) |
| **S-10 Train Together** | Pre-workout partner selection | Select partners, Start Training Together | Squad/Other Athletes lists | Same list pattern as W-20 | Train-Together-Screen-S10.md (LOCKED) |

### Programs / Builder
| Screen | Purpose | Primary action | Key content | Components | Source |
|---|---|---|---|---|---|
| **W-2 Program Browse** | "What program am I following/next?" — also the Workouts tab **root** (2026-07-08, W-1 Workouts Hub retired) | Browse tiers | Active, Upcoming, Legacy Programs, Forge Programs | ProgramCard (CLA-C26) | Program-Browse-Wireframe-Spec-W2.md; Docs/Amendments/Workouts-Navigation-Amendment-001-Retire-Workouts-Hub.md |
| **W-3 Program Detail** | Full program review (5 states) | Start / Save to Upcoming / Restart / Run Again | Metadata, full workout schedule, successor ("What's Next") | State-dependent CTA | Program-Detail-Wireframe-Spec-W3.md (LOCKED v1.6) |
| **W-4 Program Creation** | Build a program from scratch | Name + ≥1 workout slot, Save | Duration/type chips, workout list | Form | Program-Creation-Wireframe-Spec-W4.md |
| **W-5 Program Fork/Edit** | Edit or duplicate a Future program | Edit in place / Duplicate | Same fields as W-4 | Form | Program-Fork-Edit-Wireframe-Spec-W5.md (LOCKED) |
| **W-24 Workout Builder (program slot)** | Pre-session planning for a program slot | Add exercises per section | Warm-up/Main/Cool-down sections | ExerciseRow (CLA-C31) | Workout-Builder-Wireframe-Spec-W24.md (LOCKED v1.2) |
| **W-25 Free Workout Builder** | Build/edit a reusable WorkoutTemplate | Name + ≥1 MAIN exercise, Save | Section-based exercise list | Same as W-24 | Free-Workout-Builder-Spec-W25.md (LOCKED) |
| **W-26 Workout Templates Hub** | Personal template library | Tap "▶ Start" | Template cards, sorted by last used | Card + Start button | Workout-Templates-Hub-Spec-W26.md (LOCKED) |
| **W-27 Workout Template Detail** | Manage a single template | Start / Edit / Duplicate / Delete | Structure display, usage stats, session history | Sticky action bar | Workout-Template-Detail-Spec-W27.md (LOCKED) |

### Exercise Library
| Screen | Purpose | Primary action | Key content | Components | Source |
|---|---|---|---|---|---|
| **W-21 Exercise Library Hub** | Browsing/discovery | Browse categories, favorite | 6 fixed categories, Favorites, Recently Used, Custom Exercises | Preview row + "View All" | Exercise-Library-Wireframe-Spec-W21.md (LOCKED) |
| **W-22 Exercise Detail** | Educational destination | Read; favorite; view alternatives | Hero media (GIF), muscles, why-it-matters, how-to, cues, mistakes, alternatives | Media hero, sectioned detail | Exercise-Detail-Wireframe-Spec-W22.md (LOCKED v1.0 R2) |
| **W-23 Exercise Picker** | Task-completion selection (modal) | Filter, select, confirm | My Exercises, All Exercises (6 categories) | Filter bottom sheet | Exercise-Picker-Wireframe-Spec-W23.md (LOCKED v1.0 R3) |
| **W-28 Create/Edit Custom Exercise** | CRUD for CUSTOM exercises | Fill name/category/equipment/muscles, Save | Name, category, equipment, muscles, environment, notes | Form | W-28-Create-Edit-Custom-Exercise.md (LOCKED) |

### Legacy / Chapters
| Screen | Purpose | Primary action | Key content | Components | Source |
|---|---|---|---|---|---|
| **L-1 Legacy Hub** | "What have I built?" summary surface | Browse, tap into sub-screens | Identity strip, Active Chapter, FLM card, Chapter History, Photos, Timeline teaser, Accomplishments/Honors previews | ChapterCard (CLA-C25) | Legacy-Hub-Wireframe-Spec-L1.md (Lock-Ready) |
| **L-2 Legacy Timeline** | Complete transformation arc | Scroll, tap chapter header | 10 canonical event types, chapter-grouped | TimelineEventRow (CLA-C33) | Legacy-Timeline-Wireframe-Spec-L2.md (LOCKED) |
| **L-3/L-4 Chapter Detail (Active/Archived)** | "What is this chapter about?" | Seal Chapter (L-3) / Add a Memory (L-4) | Header, goals, programs, honors, photos, notes, timeline | Memory card pattern | Chapter-Detail-Wireframe-Spec-L3-L4.md (v1.1, treated as LOCKED) |
| **L-5 Chapter Creation** | Name a new chapter | Two-step modal, Done/Skip | Chapter name, optional goal | Modal form | L-5-Chapter-Creation-Spec.md (LOCKED) |
| **L-6 Chapter Reflection** | Closing voice of the chapter | Write or skip reflection | Chapter summary, reflection field, prompts | Text field | Chapter-Reflection-Wireframe-Spec-L6.md (Lock-Ready) |
| **L-11 Honor Detail Sheet** | "Museum plaque" record | View; share | Badge, name, earned date, attribution, description | Bottom sheet | Honor-Detail-Sheet-Spec-L11.md (LOCKED v1.1) |
| **L-10 Honors Hub** | Recognition + history + identity | Browse recent + 13 categories | Recent Honors (5), category sections | HonorCard (CLA-C28) | Honors-Spec-L10.md (LOCKED v1.1) |
| **L-12/13/14 Accomplishments** | CRUD for athlete-declared accomplishments | Add/edit/delete, toggle Featured (max 3) | Flat list, name+date+chapter link | AccomplishmentRow (CLA-C35) | Accomplishments-Wireframe-Spec-L12-L14.md (LOCKED) |
| **L-15/16 Photos Gallery/Detail** | Browse-only photo gallery | Browse grid, tap photo | 3-column grid, "X of 50 photos" counter | PhotoThumbnail (CLA-C36) | Photos-Wireframe-Spec-L15-L16.md (LOCKED) |
| **L-17 Transformation Gallery** | "How have I changed?" — a permanent, chapter-grouped, chronological visual archive of physical transformation; a documentary record, not a photo-album or social artifact | Browse chapter-grouped gallery (oldest→newest within each chapter); "+" opens the Add Entry sheet; tap an entry → L-18 | Photo **and video** entries; optional title/caption-reflection; optional tags (Front/Side/Back/Posing/Competition/Milestone); chapter attribution; date | PhotoThumbnail (CLA-C36), ChapterCard (CLA-C25) tie-in | Transformation-Gallery-Wireframe-Spec-L17-L18.md (Lock-Ready, v1.0), Transformation-Gallery-Architecture-v1.0.md (LOCKED) — both new, 2026-07-02 |
| **L-18 Transformation Entry Detail** | Documentary, reflective single-entry view of one transformation record | View media (photo or video); Edit (title/caption/tags, pre-seal only) / Delete (memory entries only) via overflow menu | Media (largest element), title, chapter+date attribution, tags, caption — each absent if not set | Detail-page composition pattern (read-only, sectioned, absent-when-empty) | Transformation-Gallery-Wireframe-Spec-L17-L18.md (Lock-Ready, v1.0) |

Transformation Gallery entries are documentary photo/video groupings, not a chart, score, or comparison metric — no measurement, ranking, or engagement mechanic (like/share/comment/feed) is computed or displayed anywhere in this feature. Mutability (edit/delete) mirrors the Photos (L-15/16) original-vs-memory rule exactly: entries lock permanently once their chapter seals, except memory (post-seal) entries, which remain deletable. *(Source: Transformation-Gallery-Architecture-v1.0.md TG-D7, TG-D9)*

### Profile / Progress / Goals
| Screen | Purpose | Primary action | Key content | Components | Source |
|---|---|---|---|---|---|
| **P-1 Profile** | "Who am I becoming?" identity screen | View, Edit Profile, navigate | Identity header, Pinned Legacy (max 6), Chapter, Rank, Progress, Honors, Accomplishments, Settings | Modal bottom-sheet | Profile-Wireframe-Spec-P1.md (v1.3) |
| **P-2 Progress Hub (+P-2.2 Rank Journey Detail)** | Story of athlete growth | Browse Overview/Timeline tabs | Hero, Strength Preview, Goals Preview, Rank Journey Preview, Program Journey, Honors, Consistency, Body Metrics, What's Next | See §13 for chart detail | P-2-Progress-Hub-Architecture.md (LOCKED v1.1) / Spec.md (LOCKED v1.0) |
| **G-1 Goal Hub** | "What am I building toward?" | View primary/secondary goals | Primary Goal card, Supporting Goals, Achieved | GoalCard (CLA-C27) | Goal-Hub-Wireframe-Spec-G1.md (LOCKED v1.1) |
| **G-2 Goal Detail** | Update progress / mark achieved | Update Progress, Mark as Achieved | Progress bar/percentage, history log | GoalCard detail | Goal-Detail-Wireframe-Spec-G2.md (LOCKED v1.0) |
| **G-3 Goal Create/Edit** | Create or edit a goal | Name + optional target/unit, Save | Progressive-disclosure form | Form | Goal-Create-Edit-Wireframe-Spec-G3.md (LOCKED v1.1) |

### Modals / Ceremonies
| Screen | Purpose | Primary action | Key content | Source |
|---|---|---|---|---|
| **M-1 Rank Up** | Rank-family advancement ceremony | Continue / Share | Badge, rank name, journey context | Rank-Up-Modal-Spec-M1.md (LOCKED v1.1) |
| **M-2 Honor Earned** | Honor ceremony (post-workout) | Continue / Share | Honor name(s), fixed copy | Honor-Earned-Modal-Spec-M2.md (LOCKED v1.2) |
| **M-3 Goal Achieved** | Primary goal ceremony | Continue / Share | Achievement mark, goal name, chapter | M-3-Goal-Achieved-Spec.md (LOCKED v1.1) |
| **M-4 Program Graduated** | Program completion ceremony | Continue / Share | Completion ring, program name | M-4-Program-Graduated-Spec.md (LOCKED v1.1) |
| **M-5 Chapter Sealing Confirmation** | Gate before archiving a chapter | Seal / Not yet | Headline + body copy | M-5-Chapter-Sealing-Confirmation-Spec.md (LOCKED v1.0) |
| **M-6 Destructive Action Confirmation** | Reusable delete gate | Confirm destructive action / Cancel | Dynamic headline/body per use case | M-6-Destructive-Action-Confirmation-Spec.md (LOCKED) |
| **M-7 Premium Upsell** | Monetization gate at free-tier limits | Upgrade / Not Now | Fixed headline + reassurance line | M-7-Premium-Upsell-Spec.md (LOCKED) |
| **SH-1 Share Configuration** | Configure and send a share | Adjust detail level/toggles, Share | Live preview, toggles, squad picker | Share-Configuration-Step-Wireframe-Spec-SH1.md (LOCKED) |

### Squads / Communities / Challenges
*(Communities is its own bottom-navigation tab as of 2026-07-07; see §3. Squads and Challenges are unaffected.)*

| Screen | Purpose | Primary action | Key content | Source |
|---|---|---|---|---|
| **S-1 Squads Hub** | Browse my squads | Tap squad card | Squad cards, presence indicator | Squads-Hub-Wireframe-Spec-S1.md (Tier 3 "Explore Communities" row added 2026-07-02, retired 2026-07-07 when Communities became its own tab) |
| **S-2 Squad Detail** | Squad-internal hub (Firewall lifted here) | Check in, view Goal/Mission/Feed/Competitions | Goal, Mission, Check-ins, Streak, Momentum, Feed, Competitions, Members, Honors, Analytics | Squad-Detail-Wireframe-Spec-S2.md (v1.6) |
| **S-3 Squad Management/Permissions** | Owner/Member administration | Edit squad, remove member, transfer ownership | Two-tier permission model | Squad-Management-Permissions-Spec-S3.md |
| **C-1 Challenge Hub** | "What are we competing in?" | Create/join a challenge | Active/Enrollment cards, Champions preview | Challenge-Hub-Wireframe-Spec-C1.md (Lock-ready) |
| **C-2 Create Challenge** | Start a competition | Name, Type, Duration, Publish | System-generated rules preview | Create-Challenge-Wireframe-Spec-C2.md (Lock-ready) |
| **C-3 Challenge Detail** | Live challenge state | Join / view leaderboard/feed | Ranked standings, challenge feed | Challenge-Detail-Wireframe-Spec-C3.md (Lock-ready) |
| **C-4 Challenge Results** | Final standings | View winner, standings | Winner crown, final standings, recognition | Challenge-Results-Wireframe-Spec-C4.md (Lock-ready) |
| **C-5 Hall of Champions** | Chronological squad competition history | Browse, tap result | Year-grouped winner rows | Hall-of-Champions-Wireframe-Spec-C5.md (Lock-ready) |
| **C-6 Squad Records** | Standout squad competitive marks | Browse (read-only) | Record rows (holder + value) | Squad-Records-Wireframe-Spec-C6.md (Lock-ready) |
| **C-7 Current Champions** | Who holds each crown now | Tap tile → C-4 | One tile per challenge type | Current-Champions-Wireframe-Spec-C7.md (Lock-ready) |
| **Communities (architecture only)** | Fourth relationship pillar; own bottom-navigation tab as of 2026-07-07 | Feed, discovery, roles | 9 post types, 11 categories, 4-role model | Community-System/Feed/Discovery/Roles docs (LOCKED architecture; **no wireframe/pixel layout authored yet — Unresolved**). Promoted from a Home/Squads discovery entry point to its own tab 2026-07-07, `Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md`. |

### Settings
| Screen | Purpose | Primary action | Key content | Source |
|---|---|---|---|---|
| **P-4 Settings Root** | Navigation hub | Tap category row / Sign Out | 4 rows (Notifications/Privacy/Subscription/Account) + Sign Out + legal footer | P-4-Settings-Root-Architecture.md / Wireframe-Spec.md (LOCKED) |
| **P-5 Notifications** | Control push delivery only | Toggle rows | Squad Activity, Requests, Challenges, Friend Requests, Communities | P-5-Notifications-Architecture.md v1.4 / Wireframe-Spec.md v1.1 (**Unresolved: wireframe lags architecture — Sections C/D/E not yet drawn**) |
| **P-6 Privacy** | Two independent settings | Toggle Discoverability / Squad check-in cards | Two toggle rows | P-6-Privacy-Architecture.md / Wireframe-Spec.md (LOCKED) |
| **P-8 Subscription** | Plan management (not checkout) | Upgrade / Manage / Restore | Free/Premium comparison, usage | P-8-Subscription-Architecture.md / Wireframe-Spec.md (LOCKED) |
| **P-9 Account** | Export data / delete account | Export My Data / Delete Account | Two rows | P-9-Account-Wireframe-Spec.md (LOCKED) |

---

## 5. User Flows

**Onboarding/account creation:** O-1a Welcome → O-1b/c Create Account+Name (or O-1d Sign In for returning users) → O-2 identity declaration (Athlete Type, username, photo) → O-3 first chapter/goal (or, per the superseding Onboarding Architecture, an expanded 17-step arc culminating in a silently-created "Chapter I") → first Home experience → first workout completion ceremony → first Honor. *(Source: Account-Creation-Wireframe-Spec-O1.md; First-Time-Setup-Wireframe-Spec-O2.md; Onboarding-First-Time-Journey-Architecture-v1.0.md)*

**Home/dashboard:** H-1 renders up to 5 present-or-absent tiers (Chapter, Active Program, Workout CTA, Recent Legacy Activity, Squad) plus the Homepage Principle inscription and the unconditionally-present Tier 6 Explore Communities module; the single always-present primary action is the Workout CTA. Home's **Explore Communities** module (recommended/trending communities → Community Hub) is the primary entry point into Communities, since Communities has no bottom-nav tab. *(Source: Home-Screen-Wireframe-Spec-H1.md v1.3 §9a — see §3)*

**Program discovery:** Workouts tab (opens directly to W-2 Program Browse — its root screen as of 2026-07-08; W-1 Workouts Hub retired) — or H-1's Active Program Card, which routes straight to W-3 instead — → Active/Upcoming/Legacy/Forge tiers on W-2 → W-3 Program Detail (only place "Start Program" lives; triggers a Conflict Resolution Sheet if another program is Active) → W-24 Workout Builder for slot planning. Successor programs surface only in W-3's Graduated state. *(Source: Program-Browse-Wireframe-Spec-W2.md; Program-Detail-Wireframe-Spec-W3.md; Program-Ecosystem-Architecture-v1.0.md; Docs/Amendments/Workouts-Navigation-Amendment-001-Retire-Workouts-Hub.md)*

**Active workout:** W-8 Activity Type Picker (pure router) → W-9–W-16 (activity-specific execution screen) with exercise cards in Active/Completed/Upcoming states, a Set Input Sheet, and a rest overlay with an optional ProgressRing → End Workout → W-17 Workout Summary. *(Source: Activity-Type-Picker-Spec-W8.md; Active-Workout-Flow-Spec-W9-W16.md; Workout-Summary-Spec-W17.md)*

**Exercise detail:** W-21 Exercise Library Hub (browse 6 categories) or W-23 Exercise Picker (task-scoped, from Builder/Active Workout) → W-22 Exercise Detail (hero media, muscles, why-it-matters, how-to, cues, mistakes, alternatives) — purely educational, never shows performance history. *(Source: Exercise-Library-Wireframe-Spec-W21.md; Exercise-Detail-Wireframe-Spec-W22.md; Exercise-Picker-Wireframe-Spec-W23.md)*

**Workout logging:** Set Input Sheet (weight, reps, Log Set/Skip Set) per exercise → automatic rest overlay → repeat until End Workout → W-17 Summary (Done / Share / View in Chapter). Post-workout partner tagging is optional via W-20. *(Source: Active-Workout-Flow-Spec-W9-W16.md; Workout-Summary-Spec-W17.md; Partner-Selection-Sheet-W20.md)*

**Goals:** G-1 Goal Hub (Primary + Supporting goals of the active chapter) → G-2 Goal Detail (Update Progress bottom sheet; "Mark as Achieved" for primary goals only, gated by a confirmation prompt) → M-3 ceremony on primary-goal achievement (secondary goals resolve silently). Goals are created/edited via G-3. *(Source: Goal-Hub-Wireframe-Spec-G1.md; Goal-Detail-Wireframe-Spec-G2.md; Goal-Create-Edit-Wireframe-Spec-G3.md)*

**Challenges:** C-1 Challenge Hub (create via any member, or join an Enrollment challenge) → C-2 Create Challenge (system-generated rules, no self-authored rules) → C-3 Challenge Detail (three state-driven faces: Enrollment/Active/Completed, with a live ranked leaderboard in Active) → C-4 Challenge Results (winner + final standings) → optionally feeds C-5/C-6/C-7 for SQUAD-context challenges only. *(Source: Challenge-Hub/Create/Detail/Results-Wireframe-Spec-C1–C4.md)*

**Legacy/profile:** L-1 Legacy Hub (summary) → L-2 Timeline (full chronological record) / L-3–L-4 Chapter Detail (Active/Archived) → M-5 Sealing confirmation → L-6 Reflection → archive. P-1 Profile is the identity destination, one tap (avatar) away from anywhere, surfacing Pinned Legacy, Rank, Progress, Honors, Accomplishments, and Settings. Legacy also includes the **Transformation Gallery** (L-17 → L-18): a chapter-tied, chronological before/progress/after photo-**and-video** record reached from L-1 §8a, presented as a documentary record rather than a social artifact — no comparison, feed, likes, or other engagement mechanics. *(Source: Legacy-Hub-Wireframe-Spec-L1.md v1.1 §8a; Chapter-Detail-Wireframe-Spec-L3-L4.md; Chapter-Reflection-Wireframe-Spec-L6.md; Profile-Wireframe-Spec-P1.md; Transformation-Gallery-Architecture-v1.0.md; Transformation-Gallery-Wireframe-Spec-L17-L18.md)*

**Communities discovery:** Home's Explore Communities module (recommended/trending, Tier 6) → Community Hub; alternatively, Squads' secondary Explore Communities entry point (Tier 3), for athletes already in the social area, → the same Community Hub. There is no bottom-navigation path into Communities. The Community Hub itself remains architecture-only — no pixel wireframe exists yet. *(Source: Docs/Amendments/Community-Architecture-Amendment-001-Navigation-Entry-Points.md; Home-Screen-Wireframe-Spec-H1.md v1.3 §9a; Squads-Hub-Wireframe-Spec-S1.md v1.5 §9a; Community-System-Architecture-v1.0.md COM-D18)*

**Rank/honors:** Rank advances silently at the sub-tier level; only family-level advancement fires the M-1 ceremony. Honors are evaluated server-side at session save (or chapter sealing, or goal completion, or import); most fire the M-2 ceremony at W-17 load, but chapter-seal and goal-completion honors are delivered silently to L-10. Every earned honor has a permanent record at L-11. *(Source: Rank-System-Architecture.md; Honor-Evaluation-Service-Architecture-v1.0.md; Honor-Earned-Modal-Spec-M2.md; Honor-Detail-Sheet-Spec-L11.md)*

**Records/timeline:** L-2 Legacy Timeline is the narrative, chapter-grouped view of the athlete's whole history (10 canonical event types). The Calendar is the date-indexed view of the same underlying history — "both reference the same underlying history," per its own architecture. Squad-scoped competitive records live separately at C-5/C-6/C-7. *(Source: Legacy-Timeline-Wireframe-Spec-L2.md; Calendar-System-Architecture-v1.0.md; Hall-of-Champions/Squad-Records/Current-Champions specs)*

**Settings:** P-1 → Settings row → P-4 (pure navigation hub) → P-5 Notifications / P-6 Privacy / P-8 Subscription / P-9 Account, each pushed onto the same modal stack; Sign Out and Delete Account both exit the entire modal+tab stack to O-1a. *(Source: P-4/5/6/8/9 specs; Account-Auth-Architecture.md)*

---

## 6. Component Usage Rules

All component IDs below are from the locked 3-tier catalog (Tier 1 Primitives → Tier 2 Composites → Tier 3 Screen-Level Compositions). *(Source: Component-Library-Architecture-v1.0.md §3–§4)*

- **Buttons (CLA-C08):** Classes are Primary / Secondary / Tertiary / Icon. Primary is reserved for the one dominant action per screen (e.g., "Start Workout," "Log Set," ceremony "Continue"). Tertiary is used for low-emphasis exits ("Skip for now," "Maybe Later," "Cancel").
- **Inputs (CLA-C14 InputField / CLA-C15 TextArea):** Single-line for names/short fields (chapter name, goal name, program name — all with explicit character caps, e.g. 60 chars); TextArea for longer free text (reflections, notes, custom exercise notes ≤300 chars).
- **Cards (CLA-C06 Surface → CLA-C07 Card):** Card is Surface plus a standard padding contract, in variants default/hero/elevated. All Tier 3 screen-level cards (ChapterCard, ProgramCard, GoalCard, HonorCard, SquadCard, WorkoutSessionCard) are built on Card, never a bespoke container. The Home "Explore Communities" section and Squads' secondary Communities entry point (finalized 2026-07-02) reuse this same Card primitive for community-recommendation tiles — no new card component is introduced.
- **Modals (CLA-C20):** Reserved exclusively for ceremony moments (M-1 through M-9). Centered overlay, no tap-outside dismiss, no confirmation needed to dismiss unless a destructive action is pending. Never used for ordinary navigation or forms.
- **Bottom sheets (CLA-C21):** The utility surface for everything that is not a ceremony — Profile, Honor Detail (L-11), filters (W-23), confirmations (M-6), action menus, Set Input, Timer Preferences, Share Configuration (SH-1), Squad Options.
- **Badges (CLA-C10):** Numeric count indicator only (e.g., unread notification count). Distinct from Honor/Rank badge artwork, which is bespoke imagery, not the CLA-C10 primitive.
- **Progress components:** CLA-C12 ProgressBar (6dp, fills left-to-right only, never drains) is the general-purpose progress indicator (goal progress, program progress, rank sub-tier/family bars). **ProgressRing** is a separate, standalone component owned exclusively by the Rest Timer surface — it is explicitly excluded from the CLA catalog and may not be reused elsewhere without a formal amendment.
- **Lists (CLA-C16 ListItem):** 3-zone row (leading/center/trailing), fixed heights 48/56/72dp depending on content density (exercise rows use the tallest, 72dp).
- **Tabs/navigation (CLA-C18 AppBar, CLA-C19 TabBar):** AppBar is fixed and hidden only during Active Workout (W-9–W-16). TabBar is exactly 5 tabs — Home, Workouts, Legacy, Squads, Communities (Communities added 2026-07-07); see §3.
- **Toasts/feedback (CLA-C22 Toast):** Auto-dismiss after 3 seconds; used for confirmations that don't need a ceremony (e.g., chapter-started, data-export-requested).
- **Avatars (CLA-C11 Avatar / CLA-C05 AvatarGlyph):** Circular, with fixed size tokens per context — squadStack 28dp, appBar 36dp, listRow 40dp, profile 88dp, modalProfile 96dp. Initials-glyph fallback when no photo is set.
- **Pickers:** Exercise selection uses the dedicated W-23 Exercise Picker pattern (modal, filter-by-Apply not live-filter, MY EXERCISES + ALL EXERCISES by category); Activity Type selection uses the W-8 tile-grid pattern. Neither is a generic "picker" component — each is a purpose-built screen-level composition.
- **Photo thumbnails (CLA-C36 PhotoThumbnail):** used identically for both the general Photos Gallery (L-15/16) and the new Transformation Gallery (L-17/L-18, added 2026-07-02) — the latter groups thumbnails chronologically by chapter rather than in a flat grid, but introduces no new component.

**Skeletons (CLA-C23):** Loading placeholder in row/card/section variants, suppressed entirely if the wait is under 200ms. **Empty states (CLA-C24):** governed by "Smart Omission" — the default behavior for an empty section across the entire product is to omit it silently, not to render a placeholder message (seen repeatedly: W-2 Upcoming/Legacy Programs sections, S-2 Goal/Mission cards, C-6/C-7 category tiles, L-1 sections). *(Source: Component-Library-Architecture-v1.0.md §4)*

---

## 7. Page Composition Rules

- **App shell:** AppBar (top) + TabBar (bottom), both hidden only during Active Workout. Each tab owns an independent navigation stack. *(Source: Forge-Legacy-Master-PRD.md §6)*
- **Screen header:** Pushed-screen convention is `"‹ [Screen Name]"` with a back chevron (seen identically across P-4→P-5/P-6/P-8/P-9); modal-native screens use an `[×]` dismiss instead (e.g., P-8 when entered via M-7). *(Source: P-4-Settings-Root-Wireframe-Spec.md; P-8-Subscription-Wireframe-Spec.md)*
- **Section block:** SectionHeader (CLA-C17), an 11sp ALL-CAPS label, precedes every distinct content group (e.g., "MY SQUAD," "WHO'S IN," category headers on L-10).
- **Hero area:** A single dominant, top-of-scroll element — H-1's Chapter Card, L-1's Identity Strip + FLM card, W-17's Chapter Attribution Card. Heroes never compete with a second equally-weighted element on the same screen.
- **List section:** Reverse-chronological or fixed-order rows with a consistent shape — card/feed entries follow icon + primary line + secondary metadata line + relative timestamp (Squad Feed, Challenge Feed, squad check-in cards all share this shape). Home's Explore Communities section and Squads' secondary Explore Communities entry both follow the existing preview-row + "View All"/entry-point pattern already used for category browsing (W-21) and squad cards — finalized 2026-07-02, not a new layout primitive.
- **Metrics section:** Progress Hub's Overview tab is the canonical metrics-section pattern — a fixed, ordered sequence of preview cards (Strength, Goals, Rank Journey, Program Journey, Honors, Consistency, Body Metrics), each independently omitted if not applicable, ending in a "What's Next" priority block that is always last.
- **Empty state:** "Smart Omission" — sections vanish rather than show placeholder copy; the only screens with an explicit written empty state are ones with no other content at all (e.g., W-2's "No active program." + Browse/Create CTAs).
- **Detail page:** Read-only, sectioned, absent-when-empty (W-19 Activity Detail, W-22 Exercise Detail, L-11 Honor Detail, L-13 Accomplishment Detail) — none of these detail pages are editable in place; edits happen on a separate, dedicated screen (or not at all, for immutable historical records). The new Transformation Gallery's entry detail (L-18) follows this same pattern: a single documentary, read-only view of a before/progress/after photo grouping with date and chapter context — no inline editing, no comparison controls, no social affordances.
- **Form page:** Minimum-required-field pattern with progressive disclosure (G-3's Unit field appears only once Target is set; W-4's requirement is just a name + one workout slot) and no drafts — abandoning a form discards it with a confirmation, rather than auto-saving a draft state.
- **Ceremony page:** Centered modal, M-1 through M-7, each with a fixed, locked line of ceremony copy, a Continue/Share action, and — critically — **no confetti, no sound by default, no numeric/percentage embellishment.** See §15.
- **Workout execution page:** W-9–W-16's shell — Workout Action Bar (top), Chapter/Program context strip, scrollable exercise-card list with Active/Completed/Upcoming states, and a rest overlay that takes over the lower 60% of the screen between sets.
- **Documentary record page (new, 2026-07-02):** Introduced for the Transformation Gallery. A calm, museum-plaque tone — consistent with L-11 Honor Detail's "historical record with celebration" register — applied to physical-transformation photography: chronological, chapter-attributed, premium and reflective rather than motivational. Explicitly excludes any comparison-to-others, scoring, filters, or engagement affordance (like/share/comment/feed).

---

## 8. Rank & Honor System

### Rank tiers
Exact locked order and identity statements *(Source: Rank-System-Architecture.md §2)*:

| # | Family | Sub-tiers | Identity statement |
|---|---|---|---|
| 1 | Foundation | I·II·III·IV | "I've started." |
| 2 | Builder | I·II·III·IV | "I'm building habits." |
| 3 | Craftsman | I·II·III·IV | "I know how to train." |
| 4 | Architect | I·II·III·IV | "I'm intentionally shaping my development." |
| 5 | Established | I·II·III·IV | "I've built something real." |
| 6 | Legend | I·II·III·IV | "My journey has become a meaningful story." |
| 7 | Legacy | (none — final) | "I repeatedly become the person I intend to become." |

25 total levels (6 families × 4 sub-tiers + 1 final). Display format: `"[Family] · [Sub-tier]"` (e.g., "Architect · IV"); Legacy displays alone. Rank never decreases, is never purchased, and sub-tier advances trigger no ceremony — only family-level promotion triggers M-1. *(Source: Rank-System-Architecture.md)*

**Note:** The Master PRD's own §15 still says "final rank names and thresholds to be defined during design phase" — that TBD has since been resolved by the later, LOCKED Rank-System-Architecture.md, which is the authoritative source for the table above.

Rank computation is a **hybrid, multi-requirement convergence** across four primary categories (Training Consistency, Personal Improvement [adaptive per athlete type], Program Progression, Training Volume) and three secondary categories (Chapter Progression, Longevity, Goal Participation) — never a single visible score. Athletes see only directional guidance ("Guided Transparency"), never formulas, weights, or threshold numbers. *(Source: Rank-System-Architecture.md; Rank-Computation-Model.md)*

### Honor categories
13 categories, 167 total types, 34 families *(Source: Honor-Catalog-v1.0-LOCKED.md v1.5; Honors-Spec-L10.md v1.1)*:

| # | Category | Types |
|---|---|---|
| 1 | Training | 23 |
| 2 | Strength | 26 |
| 3 | Endurance | 38 |
| 4 | Goals | 6 |
| 5 | Programs | 7 |
| 6 | Partnership | 3 |
| 7 | Chapters | 14 |
| 8 | Longevity | 7 |
| 9 | Competition | 9 |
| 10 | Communities | 5 |
| 11 | Squad | 15 |
| 12 | Prestige | 8 |
| 13 | Hidden | 6 |

Only earned honors are ever shown; there is no completion percentage, no "X of Y," no rarity label, no denominator anywhere in the product. **Deferred to V2 (fully designed, PO-deferred, not part of the 167):** Sex-Specific Strength Milestones (12) and Relative Strength Milestones (12). *(Source: Honors-Architecture-V1-Final-v1.0.md)*

### Progression moments
- Sub-tier rank advance: silent, no ceremony (only a subtle "[Updated]" indicator on P-2's rank badge).
- Family-level rank advance: **M-1** ceremony.
- Primary chapter-goal achievement: **M-3** ceremony (secondary goals resolve silently).
- Program graduation (final workout of an Active program): **M-4** ceremony.
- Honor earned (most cases): **M-2** ceremony at W-17 load; chapter-seal honors and goal-completion honors are delivered silently to L-10 instead.
- Chapter sealing: **M-5** confirmation gate (not a celebratory ceremony) → L-6 Reflection → any queued M-1 fires only after L-6 is exited.

### Ceremony moments — badge/design implications
Every ceremony modal (M-1–M-4) shares a strict non-behavior list: **no confetti, no particle effects, no sound by default, no "Congratulations," no trophy/star/badge iconography beyond the honor/rank's own artwork, no numeric percentages.** Tone across all four is deliberately restrained — e.g., M-1's locked copy is *"Earned through every session. Welcome to what you've become,"* M-2's is *"A permanent part of your legacy,"* M-3's is *"Set, chased, earned. A permanent mark in your legacy,"* M-4's is *"Finished what you started. A permanent mark in your legacy."* *(Source: Rank-Up-Modal-Spec-M1.md; Honor-Earned-Modal-Spec-M2.md; M-3-Goal-Achieved-Spec.md; M-4-Program-Graduated-Spec.md)*

Honor artwork: L-11 shows a 72pt category badge (7 badge variants mapped to display categories) — this is bespoke badge/insignia artwork, not a Phosphor icon. **Zero honor badge artwork has been produced** as of the current content status (0 of 81+). *(Source: Honor-Detail-Sheet-Spec-L11.md; Forge-Legacy-Master-Status.md Content Status table)*

**Unresolved / needs confirmation:** No document defines the visual system for the 7 rank badge insignia or the per-category honor badge artwork beyond "bespoke, not Phosphor" — actual artwork direction (shape language, material treatment) is not yet specified anywhere in the docs read.

---

## 9. Workout System

### Workout states
- **Session-level:** in-progress (RUNNING), rest overlay active between sets, Partial (saved via "Save & Exit," program position unchanged), Completed (via End Workout → W-17).
- **Exercise-card level (within W-9–W-16):** Active (contains the next unlogged set), Completed (collapsed summary), Upcoming (de-emphasized).
- **Set-row level:** Logged, Current, Pending (shows program target or last-session reference as muted text only), Skipped.
- **Program-instance level:** Active, Future, Graduated, Ended Early.
*(Source: Active-Workout-Flow-Spec-W9-W16.md; Program-Catalog-Architecture-v1.0.md)*

### Active workout requirements
Full-screen, no AppBar/TabBar. Never becomes a performance-analytics surface mid-session — explicitly no trend lines, no comparison to prior sessions, no PR celebration during the workout itself. Nine activity types route to activity-specific variants of the same screen family: STRENGTH (W-9, exercise/set-based), RUN/WALK (W-10/11, elapsed timer + manual distance), BIKE (W-12, + elevation), SWIM (W-13, timer + laps), HIIT (W-14, rounds counter + timer), MOBILITY/YOGA (W-15, timer + notes only), OTHER (W-16, custom name + timer + notes). *(Source: Active-Workout-Flow-Spec-W9-W16.md)*

### Logging requirements
Set Input Sheet (bottom sheet, 40–50% screen height): weight, reps, Log Set / Skip Set. Exercise can be replaced mid-session via W-23 in REPLACEMENT mode, with a Persistence Choice sheet (This session only / Update my template / Update my program). Notes can be attached per-exercise and per-workout. A workout playlist link (Spotify/Apple Music) can be attached. *(Source: Active-Workout-Flow-Spec-W9-W16.md)*

### Rest timer requirements
State machine: INACTIVE → RUNNING → BACKGROUNDED → RECOVERABLE (→ RUNNING on cold-launch recovery, or INACTIVE). Count-**up** display only, never a countdown; starts fresh at 0:00 on every set logged; wall-clock differential strategy (no background process/thread required); ends on Ready tap, next-set tap, or workout completion. Elapsed rest time is **never stored** — it is fully ephemeral and never queryable from history. Only athlete-adjustable parameter is a reference duration (Timer Preferences); no pause/resume, no manual override. No push notification fires from the timer in V1. *(Source: Rest-Timer-Architecture-v1.0.md)*

The optional **ProgressRing** (72–84dp circular arc, 12 o'clock origin, clockwise fill, `accent.primary` fill / `surface.muted` track) fills toward the reference duration and never resets/pulses/changes color at 100% — it simply holds full. It renders only if a reference duration exists and the athlete has enabled it; otherwise it is unmounted entirely, not hidden. It is explicitly **not** part of the general Component Library catalog and may not be reused elsewhere without a formal amendment. *(Source: Rest-Timer-Architecture-v1.0.md §9)*

### Exercise detail requirements
W-22 answers exactly six questions in a locked order: what does it look like (hero GIF, autoplaying — the only screen where this happens), what is it, why does it matter, what does it train, how do I do it, what are the alternatives. No performance history, no PRs, no "Used In" program/chapter relationships are ever shown on this screen — it is purely educational. *(Source: Exercise-Detail-Wireframe-Spec-W22.md)*

### Repeated interaction primitives
- Set Input Sheet pattern (bottom sheet, numeric fields, primary Log action) reused conceptually across all STRENGTH-type logging.
- "Section-first" exercise organization (Warm-up / Main / Cool-down) reused identically across W-24 (program slots) and W-25 (free templates).
- Absent-when-empty sections reused everywhere (Upcoming/Legacy Programs sections on W-2, Goal/Mission cards on S-2, category tiles on W-21/W-23/C-6/C-7).
- Muted-secondary "reference, not target" text convention reused for last-session values (W-9) and program prescriptions (W-24 pre-load into W-9) — prescriptions are always reference-only, never enforced or flagged as deviated-from.

---

## 10. Program System

### Program browser needs
W-2 Program Browse organizes into four tiers: **Active** (progress bar "X of Y," "Next: [Workout]"), **Upcoming/Future** (first 2–3, "See all"), **Legacy Programs** (Graduated + Ended Early unified into one section, visually identical treatment — no separate "failed" styling for Ended Early), and **Forge Programs** (system-curated catalog, "Forge" badge). MVP program sources are strictly two: Forge Programs and "My Programs" (athlete-created/imported/forked) — no community, marketplace, or creator-submitted programs exist or are planned for V1. *(Source: Program-Browse-Wireframe-Spec-W2.md; Program-Catalog-Architecture-v1.0.md)*

### Program detail needs
W-3 Program Detail spans five states (Preview, Future, Active, Graduated, Ended Early) in one screen code, each with a state-specific CTA. It is the **only** place "Start Program" can be triggered (never directly from a W-2 card), which is what fires the Conflict Resolution Sheet if another program is already Active. Contents: program metadata (duration, workout count, category/level/environment), description, the full ordered workout schedule with completion checkmarks in non-Preview states. *(Source: Program-Detail-Wireframe-Spec-W3.md)*

### Program progress states
Active / Future ("Upcoming") / Graduated / Ended Early — enforced as a strict one-Active-program rule via the Conflict Resolution Sheet ("End Current Program & Start New" or "Cancel"). *(Source: Program-Detail-Wireframe-Spec-W3.md; Program-Browse-Wireframe-Spec-W2.md)*

### Successor/continuation behavior
A program can declare a single `successorProgramId` (Forge programs only, one successor max, directional, no branching). It surfaces **only** on W-3's Graduated state, in a "What's Next" section — deliberately never shown at Preview or during Active training, to avoid distraction or premature commitment. "Restart Program" (from Ended Early) and "Run This Program Again" (from Graduated) both create a brand-new, independent Future program instance rather than reactivating the sealed original — the original historical record is never altered. Full succession ladders exist per family (e.g., Strength Foundation I → II → III). *(Source: Program-Detail-Wireframe-Spec-W3.md; Program-Ecosystem-Architecture-v1.0.md)*

**Catalog scale:** MVP launch catalog is 24 Forge Programs across 6 families (Strength, Muscle Building, Running, Conditioning, Full Body & Home, Mobility) — Cycling and Combat Sports categories exist in the taxonomy but have zero programs authored/planned for V1 (deferred to a future creator marketplace). *(Source: Program-Catalog-Architecture-v1.0.md; Program-Ecosystem-Architecture-v1.0.md)*

**Program sharing:** A separate, squad-scoped-only `ProgramShare` mechanism exists (reference-based — never duplicates the program or creates an instance for the recipient), surfacing as a feed card on S-2. Available for published FORGE programs only. *(Source: Program-Ecosystem-Architecture-v1.0.md §11)*

---

## 11. Challenge System

### The governing constraint — Performance Firewall scope
Every other social surface (Friends Feed, Communities, Calendar) is built around a firewall: comparison data is never shown on an always-on surface. The firewall is **lifted only**:
- On **S-2 Squad Detail** (not S-1 Squads Hub) — a squad's own goals, missions, streak, feed, and **this squad's own Competitions section** may show inline standings.
- On the **C-series Challenge screens themselves** (C-1 through C-7) for participants of that specific roster-scoped, opt-in challenge.
It remains fully in force everywhere else — no other squad's page, no Friends Feed, no Community surface, no Calendar view may ever render challenge performance data. *(Source: Squad-System-Architecture-v1.0.md SQ-D2; Challenge-System-Architecture-v1.0.md CS-D2/CS-D22)*

### Challenge hub (C-1)
"What are we competing in, and what have we won?" Cards grouped by state: Active (with neutral personal standing line, e.g. "You're 2nd"), Open for Enrollment (with inline Join CTA), plus a Current Champions preview and a Squad Records row. Non-participants see all squad challenges but no personal standing line. *(Source: Challenge-Hub-Wireframe-Spec-C1.md)*

### Create challenge (C-2)
Name → Type (5 shipping types: Most Workouts, Most Volume, Max Lift [optional target exercise], Most Duration, Most PRs) → Duration → optional Description → Publish. Rules are **system-generated, read-only** — the creator never authors rules, and creating a challenge never auto-enrolls the creator. Three roster contexts exist: SQUAD, FRIENDS, COMMUNITY. *(Source: Create-Challenge-Wireframe-Spec-C2.md; Challenge-System-Architecture-v1.0.md)*

### Challenge detail (C-3)
Three state-driven faces — Enrollment (Join CTA, roster avatar row, Rules, Feed), Active (live ranked leaderboard + Feed), Completed (winner summary → View Final Standings). Leaderboard rows are simple ranked text (rank + name + score), the athlete's own row given a neutral highlight, and the lowest-ranked row is never styled as "last" or shown with any deficit/alarm treatment. A bounded, roster-scoped Challenge Feed logs join/leader-change/PR/completion events — never a product-wide feed. *(Source: Challenge-Detail-Wireframe-Spec-C3.md)*

### Challenge results (C-4)
Winner crown (🏆) + Final Standings ranked list, co-winners named on ties, withdrawn/non-joiners never appear. A "Recognition" section lists derived badges (e.g., "Defending Champion") without ever enumerating other athletes' honors. Immutable once recorded. *(Source: Challenge-Results-Wireframe-Spec-C4.md)*

### Social/leaderboard needs
No document describes anything beyond simple ranked text rows for standings/leaderboards anywhere in the product — there is no chart, bar graph, or visual leaderboard treatment specified for challenges, squad competitions, or any comparison surface. Recognition-row pattern (icon + label + holder name + value, non-tappable or tap-through) is shared identically across C-5 (Hall of Champions), C-6 (Squad Records), C-7 (Current Champions). *(Source: Hall-of-Champions/Squad-Records/Current-Champions specs — this absence of chart treatment is explicit across all three)*

---

## 12. Goals System

### Goal types
Two display models, determined automatically by whether a numeric Target was set at creation — never a manual type picker:
- **Quantifiable** (Target set): progress bar + percentage + "[current] / [target] [unit]."
- **Narrative** (Target left blank): "In Progress" status label only, no bar, no percentage — for identity-level commitments that can't be expressed numerically (e.g., "Rebuild confidence after injury").
Goals are chapter-scoped: exactly one Primary goal per active chapter, unlimited Secondary goals; goals cannot move between chapters and archive with the chapter. *(Source: Goal-Hub-Wireframe-Spec-G1.md; Goal-Detail-Wireframe-Spec-G2.md)*

### Goal detail
G-2 is the only surface that can update progress or mark a goal achieved. Canonical model: Goal Name (required) + Target (optional, numeric) + Unit (optional, only present/stored when Target is set, and snapshotted per history entry). Progress history is a timestamped log, most-recent-first, no pagination. *(Source: Goal-Detail-Wireframe-Spec-G2.md)*

### Progress visualization
A single linear progress bar (accent fill on muted track) + percentage label — never shown as "% remaining," never a chart or ring. *(Source: Goal-Hub-Wireframe-Spec-G1.md)*

### Completion/ceremony behavior
Primary goal achievement is an explicit, manual, irreversible action ("Mark as Achieved" → confirmation prompt → **M-3 ceremony** → Legacy Timeline entry → Home hero shifts to its highest-priority state). Secondary goal achievement is silent — no modal, no Timeline entry, card simply moves to the Achieved section. There is no "fail"/"abandon"/"delete" action at the goal level; an un-achieved goal only resolves to a neutral "Not Achieved" (a plain dash, never a failure indicator) when its chapter is archived. *(Source: Goal-Hub-Wireframe-Spec-G1.md; Goal-Detail-Wireframe-Spec-G2.md)*

---

## 13. Charts & Data Visualization

This is the most tightly-scoped part of the product — Forge Legacy uses **far fewer and simpler visualizations than a typical fitness app**, by explicit design principle ("Story before data"). The following is a complete inventory of every chart/graph/visualization actually described in the source docs; anything not listed here is explicitly **absent by design**, not merely undocumented.

| Visualization | Data shown | Where it appears | Interaction | Source |
|---|---|---|---|---|
| **Rank sub-tier progress bar** | Fill toward next sub-tier (active weeks within current family) — never a number/fraction | P-2 Progress Hub Overview (Rank Journey Preview); P-2.2 Rank Journey Detail | Read-only; label shows destination only, e.g. "· IV" | P-2-Progress-Hub-Spec.md §4.2 |
| **Rank family progress bar** | Composite, multi-signal convergence indicator toward next rank family | Same cards as above, always shown paired with the sub-tier bar | Read-only | P-2-Progress-Hub-Spec.md §4.2 |
| **Rank Ladder** | Full 25-position visual map (7 families × 4 sub-tiers + Legacy), current position marked "You are here," past positions checkmarked, future greyed | P-2.2 Rank Journey Detail | Read-only, not tappable | P-2-Progress-Hub-Spec.md §5 |
| **Strength & Performance trend graph** | "All-time trend graph, zoomable by time range" per tracked metric/exercise; directional trend arrow (improving/flat/declining, based on last 3 data points) on preview cards | P-2 Overview preview (up to 4 metric cards) → Strength & Performance Detail sub-screen | Zoomable by time range on detail view; preview cards are tap-through only | P-2-Progress-Hub-Architecture.md §7 |
| **Goal progress bar** | Current/target + percentage (quantifiable goals only) | G-1, G-2, P-2 Goals Preview | Read-only | Goal-Hub-Wireframe-Spec-G1.md; Goal-Detail-Wireframe-Spec-G2.md |
| **Program progress bar** | "X of Y workouts" linear fill | W-2, W-3, W-17 Program Progress Card | Read-only | Program-Detail-Wireframe-Spec-W3.md; Workout-Summary-Spec-W17.md |
| **Program completion ring** | 64dp filled progress ring + checkmark, no percentage shown | M-4 Program Graduated ceremony | Read-only, ceremony-only | M-4-Program-Graduated-Spec.md |
| **Rest Timer ProgressRing** | Fill toward personal/program rest-time reference; never drains, holds full past 100% | Active Workout (W-9–W-16) rest overlay | Read-only, off by default (opt-in) | Rest-Timer-Architecture-v1.0.md §9 |
| **Consistency & Training metrics (no chart, numeric only)** | Lifetime Workouts, Hours Forged, Workouts/Hours This Month, Avg Workouts/Week (8-week rolling), Current Streak (consecutive Mon–Sun weeks) | P-2 Overview, Consistency & Training Preview | Read-only; explicitly **not the largest/most prominent element** on the screen | P-2-Progress-Hub-Architecture.md §12 |
| **Calendar consistency heat-map** | Backward-looking, private "days you trained" visualization | Calendar surface (cross-cutting) | Read-only, private, never public/squad/friend-compared, feeds nothing into Rank/Legacy Score | Calendar-System-Architecture-v1.0.md CAL-D19 |
| **Challenge/Competition standings** | Ranked text list only (rank + name + score) — **explicitly not a chart or bar graph anywhere** | C-3 (live), C-4 (final), S-2 Competitions section | Tap own/other row → Limited Athlete Profile | Challenge-Detail/Results-Wireframe-Spec-C3/C4.md |
| **Recognition rows (Hall of Champions, Squad Records, Current Champions)** | Holder name + value/label, no numeric chart | C-5, C-6, C-7 | Tap-through to standings (C-6/C-7); non-tappable rows (C-6 in MVP) | Hall-of-Champions/Squad-Records/Current-Champions specs |

**Explicitly NOT shown anywhere in the product** (stated directly and repeatedly across multiple docs): numeric rank thresholds/formulas/weights; percentage-to-next-rank on P-1; honor completion percentages or "X of Y" counts; rarity labels; XP/points; global rankings or percentile comparisons; total workout volume as a headline metric; calorie estimates; week-over-week comparison charts; PR badges/"New PR!" labels (deferred to a future version); streak-as-primary-metric anywhere. *(Source: Workout-Summary-Spec-W17.md; Activity-History-Wireframe-Spec-W18.md; Activity-Detail-Wireframe-Spec-W19.md; P-2-Progress-Hub-Architecture.md; Profile-Wireframe-Spec-P1.md)*

**Unresolved / needs confirmation:** The **Weight & Body Metrics** section of P-2 Progress Hub is visibility-gated (shows if the athlete has ≥1 weight log or ≥1 progress photo) but its actual chart/graph sub-architecture — what metrics, how a weight trend graph is calculated, how progress photos are organized — is explicitly flagged as an open, undesigned question (OQ-5) in `P-2-Progress-Hub-Architecture.md` §16/§20. Do not design this sub-section beyond "it exists and is gated on having data" without further confirmation.

---

## 14. Icons

### Required icon coverage
**Phosphor Icons** is the sole canonical icon library for V1 UI icons — no SF Symbols, Material Icons, or Ionicons anywhere. Semantic icon roles map to specific Phosphor weights:
- **Decorative** → Light/Thin weight
- **Standard** → Regular weight
- **Active** → Bold weight
- **Filled** → Fill weight
*(Source: Component-Library-Architecture-v1.0.md §11)*

### Icon sizing scale
`inline` 16dp · `card` 20dp · `standard` 24dp · `featured` 28–40dp · `emptyState` 48dp · `badge` 72dp. *(Source: Component-Library-Architecture-v1.0.md §11)*

### Icon treatment rules
Bespoke brand assets — the Forge logo, rank insignia, and honor badge artwork — are explicitly **not** Phosphor icons and are not governed by these icon rules; they are separate brand-asset production. *(Source: Component-Library-Architecture-v1.0.md §11.1, §4 CLA-C02)*

Icons observed in actual screen content (from the wireframe specs) include: 9 activity-type icons (Strength/Run/Walk/Bike/Swim/HIIT/Mobility/Yoga/Other, W-8's 3×3 grid), 9 squad icon options (Mountain/Shield/Barbell/Wolf/Eagle/Compass/Tree/Hammer/Fire + None, S-3), a heart icon for favoriting (W-22, direct tap), a trophy/crown glyph (🏆/🏅ish recognition marks in C-4/C-5/C-6/C-7 — these read as emoji-style glyphs in the wireframe text, not confirmed as a specific Phosphor icon choice).

**Unresolved / needs confirmation:** No document specifies an icon grid system, stroke-width value, or corner-radius convention for icon artwork beyond naming "Phosphor Icons" and the weight/size tables above — Phosphor's own default grid (framework-level) appears to be assumed rather than restated. Whether the 🏆/🏅 recognition glyphs used in wireframe copy map to specific Phosphor icons or to bespoke artwork is also not stated.

---

## 15. Motion & Ceremony

### Reduce Motion is first-class (CLA-P5)
Every animated component in the library ships with its Reduce Motion alternative defined alongside it, not as a retrofit. Concrete substitutions: shimmer → static block; crossfades/opacity → instant; springs → instant; layout transitions → instant; ceremony modals (M-1–M-9) appear immediately with no reveal sequence; bottom sheets appear immediately with no slide-up animation; section collapse/expand is instant. *(Source: Component-Library-Architecture-v1.0.md §2 CLA-P5, §8.6, §9.4)*

### Screen transitions
Tab roots replace on tap (no transition animation implied by "replace"); modal/bottom-sheet presentation and dismissal are the primary transition types described; no custom screen-to-screen transition choreography is specified beyond standard platform push/modal conventions. *(Source: Forge-Legacy-Master-PRD.md §6 — no further detail found; treat custom transition choreography as Unresolved)*

### Rank-up ceremony (M-1)
Centered modal, cannot be dismissed by tap-outside/drag/back button — must be explicitly acted on (Continue). No confetti, no XP, no percentages, no progress bars appear. Highest priority (1) in the ceremony queue if multiple ceremonies are pending simultaneously. *(Source: Rank-Up-Modal-Spec-M1.md)*

### PR ceremony
**There is no dedicated PR (personal record) ceremony or modal anywhere in the current architecture.** PR context is implicit — surfaced only via the Strength & Performance trend graph and Honor milestones on P-2, never as a standalone "New PR!" celebration. Explicit PR labels are noted as deferred to a future version (V1.1). *(Source: P-2-Progress-Hub-Architecture.md §7; Active-Workout-Flow-Spec-W9-W16.md — "no personal records celebration mid-workout")*

### Success/error/loading motion
- **Loading:** Skeleton placeholders (row/card/section variants), suppressed entirely under 200ms — no spinner-first pattern described.
- **Success:** Toast (3s auto-dismiss) for non-ceremony confirmations; ceremony modals for the four milestone events (rank-up, honor, goal, program-graduation).
- **Error:** Native platform alerts are used for account-level failures (Sign In lockout, Delete Account confirmation) rather than custom in-app error components.
*(Source: Component-Library-Architecture-v1.0.md §4, CLA-C22/C23; Account-Creation-Wireframe-Spec-O1.md)*

### Ceremony queue and ordering
When multiple ceremonies are pending, they fire in a fixed priority order: M-1 Rank Up (1) → M-3 Goal Achieved (2) → M-4 Program Graduated (3) → M-2 Honor Earned (4, last). Chapter Sealing (M-5) is not part of this auto-queue — it is user-initiated, and if a rank-up is triggered during sealing, M-1 is deliberately deferred to fire only after the subsequent L-6 Reflection screen is exited. *(Source: Rank-Up-Modal-Spec-M1.md; M-3-Goal-Achieved-Spec.md; M-4-Program-Graduated-Spec.md; M-5-Chapter-Sealing-Confirmation-Spec.md)*

**Unresolved / needs confirmation:** No document specifies concrete animation durations/easing curves for standard (non-reduced-motion) transitions — the docs define *what* animates (or is suppressed under Reduce Motion) but not the baseline motion-on timing values themselves (e.g., no "240ms ease-out" style spec was found for any interaction).

---

## 16. Accessibility / Platform

### Supported platforms
iOS and Android via React Native + Expo SDK v56+. "No web-only APIs, no DOM-specific assumptions, no CSS constructs that do not have an equivalent React Native StyleSheet representation." *(Source: Forge-Design-System-Architecture-v1.0.md §2.7; Forge-Legacy-Master-PRD.md "Quick Context")*

**Unresolved / needs confirmation:** A `layout.maxContentWidth` (800dp, centered content) token exists for larger viewports, but no document explicitly states the product ships on web/tablet/desktop — this appears to be a defensive layout rule rather than a committed platform target.

### Dark/light mode
Dark-mode only for V1; light mode is explicitly deferred to a future version, with no conditional light/dark logic to be added until an Architecture Amendment introduces it. *(Source: Component-Library-Architecture-v1.0.md §10, CLA-D12; Forge-Design-System-Architecture-v1.0.md §5.6)*

### Safe area behavior
Top safe-area inset via `react-native-safe-area-context`; bottom safe-area inset = `space.lg` + safe area, to clear the TabBar; content beneath the TabBar must also clear this area. *(Source: Forge-Legacy-Design-System-v1.0.md §5.2, §5.10, §7.2)*

### Touch targets
Minimum 44×44dp for all interactive elements (via `hitSlop` where needed); list/row items 48dp minimum height (56dp for taller rows, 72dp for exercise rows). *(Source: Forge-Design-System-Architecture-v1.0.md §2.6, §9.1; Component-Library-Architecture-v1.0.md §5.1, §8.2)*

### Dynamic Type
All Text component instances scale with the system font-size setting; no fixed-height text containers; text wraps/stacks at larger sizes, with a documented exception for single-line list-item primary text (truncates at 1 line) or explicit 2-line wrap where stated. *(Source: Component-Library-Architecture-v1.0.md §8.5)*

### Reduced motion
See §15 — first-class, not a retrofit; every animated interaction has a defined instant/static fallback. *(Source: Component-Library-Architecture-v1.0.md §2 CLA-P5, §8.6)*

### Additional accessibility contracts
- WCAG 2.1 AA is the V1 target; specific contrast ratios are stated for the primary/secondary/tertiary text tokens against the primary background (~15:1 / ~6:1 / ~3:1, with a documented exception for the 11sp label scale).
- Screen reader: `accessibilityRole`, `accessibilityLabel`, `accessibilityState`, `accessibilityValue` required on interactive elements; decorative elements hidden from the accessibility tree.
- Focus order: top-to-bottom, left-to-right; Modals/BottomSheets trap focus and return it to the trigger element on dismiss.
- Color is never the sole differentiator for state/category/status (e.g., difficulty chips always carry a text label, not just a color dot).
*(Source: Component-Library-Architecture-v1.0.md §8.1–§8.7)*

---

## 17. Real Content & Placeholder Rules

### What real, locked copy exists
- **All ceremony copy (M-1 through M-7)** is fixed, locked, verbatim text — not placeholder. E.g., M-1: *"Earned through every session. Welcome to what you've become"* (final rank: *"Your legacy has been forged"*); M-3: *"Set, chased, earned. A permanent mark in your legacy"*; M-7: *"Build more. Keep everything"* / *"Everything you've already built is yours — forever."* *(Source: M-1/M-3/M-7 specs)*
- **The Homepage Principles Library** is real, curated, final content: **105 Principles + 22 Reflection Questions = 127 entries**, editorially reviewed against a 6-point standard, not placeholder or lorem ipsum. *(Source: Homepage-Principles-Library-v1.0.md)*
- **Rank tier names and identity statements** (§8 table above) are locked, real product copy.
- **Honor category names and counts** (167 types / 13 categories) are locked architecture, though the full descriptive per-honor content pass (L-11's 1–3 line generated descriptions for all 167) is a separate, not-yet-complete authoring task.

### What should use placeholders
- **Programs:** Only ~4 of 24 launch-catalog programs are actually authored (Strength family only); the remaining ~20 across 5 other families exist only as architecture/taxonomy, not real content. Treat program names/descriptions outside the Strength family as **placeholder-appropriate**. *(Source: Forge-Legacy-Master-Status.md Content Status)*
- **Exercises:** All 195 catalog exercises have narrative content authored (name, category, muscles, difficulty, relationships), but **zero have production media** (GIF/video/image/muscle-target-image) — every exercise's visual hero media is a placeholder need, not yet produced. *(Source: Forge-Legacy-Master-Status.md; Exercise-Detail-Wireframe-Spec-W22.md)*
- **Honors:** Architecture/catalog is complete (167 types), but 0% authored as full L-11 descriptive content, and 0 of 81+ badge artworks produced.
- **Photos:** L-15/16 is a real, functioning gallery pattern, but no actual athlete photo content exists pre-launch — treat all photo-grid mockups as placeholder imagery.

### Image-slot rules
- Exercise hero media follows a fallback chain: GIF → video → image → name-initial placeholder (when none of the first three exist). *(Source: Exercise-Detail-Wireframe-Spec-W22.md)*
- Avatar fallback is always an initials glyph (CLA-C05 AvatarGlyph) when no profile photo is set — never a generic silhouette icon.
- Honor badges use a 72pt category-badge system (7 variants) — always render one of the 7 known badge variants, never a truly generic "unknown honor" placeholder, since only earned honors are ever displayed.

### Avoid invented metrics or fake product behavior
Per the explicit non-behavior lists repeated across nearly every screen spec: never invent a total-volume metric, a calorie estimate, a percentage-to-next-rank, a "days since" counter, a PR badge, a rarity label, an XP/points value, or a public leaderboard — these are not merely unstyled, they are architecturally prohibited. When mocking up screens for Claude Design, any numeric metric not explicitly named in this blueprint's §13 chart inventory should be treated as invented and avoided.

---

## 18. Source Document Index

### Architecture (governing, cross-cutting)
FORGE_LEGACY_PRODUCT_DNA.md · Forge-Legacy-Master-PRD.md · FORGE_LEGACY_PRD.md · MVP-Architecture-Audit-v1.0.md · Global-Architecture-Status-Audit.md · Onboarding-First-Time-Journey-Architecture-v1.0.md · Account-Auth-Architecture.md · Calendar-System-Architecture-v1.0.md · Program-Catalog-Architecture-v1.0.md · Program-Ecosystem-Architecture-v1.0.md · Program-Authoring-Standard-v1.0.md · Exercise-Library-Architecture-v1.0.md · Exercise-001/002/003 (Custom/Substitution/Favorites) · Rank-System-Architecture.md · Rank-Computation-Model.md (+ Amendment 001) · Rank-Calibration-Decisions.md · Honors-Architecture-V1-Final-v1.0.md · Honor-Catalog-v1.0-LOCKED.md · Honor-Evaluation-Service-Architecture-v1.0.md · HonorInstance-Architecture-v1.0.md · Social-System-Architecture-v1.0.md · Squad-System-Architecture-v1.0.md · Community-System-Architecture-v1.0.md · Community-Feed-Specification-v1.0.md · Community-Discovery-and-Search-v1.0.md · Community-Roles-and-Moderation-v1.0.md · **Amendments/Community-Architecture-Amendment-001-Navigation-Entry-Points.md** (new, 2026-07-02) · Challenge-System-Architecture-v1.0.md · Global-Search-Architecture-v1.0.md · Component-Library-Architecture-v1.0.md · Forge-Design-System-Architecture-v1.0.md · Rest-Timer-Architecture-v1.0.md · Homepage-Principles-Architecture-v1.0.md · Homepage-Principles-Library-v1.0.md · **Transformation-Gallery-Architecture-v1.0.md** (new, 2026-07-02) · Monetization-Architecture-Amendment-001/002 · Critical-Decisions-Amendment-001.md · **Amendments/Workouts-Navigation-Amendment-001-Retire-Workouts-Hub.md** (new, 2026-07-08)

### Wireframes (screen specs)
O-1 Account-Creation-Wireframe-Spec-O1.md · O-2 First-Time-Setup-Wireframe-Spec-O2.md (+ Amendments 001/002) · O-3 First-Chapter-First-Goal-Wireframe-Spec-O3.md · H-1 Home-Screen-Wireframe-Spec-H1.md · ~~W-1 Workouts-Hub-Wireframe-Spec-W1.md~~ (RETIRED 2026-07-08, not a live screen — see `Amendments/Workouts-Navigation-Amendment-001-Retire-Workouts-Hub.md`; kept here only as a historical citation, dropped from §4's Screen Inventory) · W-8 Activity-Type-Picker-Spec-W8.md · W-9–16 Active-Workout-Flow-Spec-W9-W16.md · W-17 Workout-Summary-Spec-W17.md · W-18 Activity-History-Wireframe-Spec-W18.md · W-19 Activity-Detail-Wireframe-Spec-W19.md · W-20 Partner-Selection-Sheet-W20.md · S-10 Train-Together-Screen-S10.md · WwF Workout-With-Friend-Spec-WwF.md · W-2 Program-Browse-Wireframe-Spec-W2.md · W-3 Program-Detail-Wireframe-Spec-W3.md · W-4 Program-Creation-Wireframe-Spec-W4.md · W-5 Program-Fork-Edit-Wireframe-Spec-W5.md · W-24 Workout-Builder-Wireframe-Spec-W24.md · W-25 Free-Workout-Builder-Spec-W25.md · W-26 Workout-Templates-Hub-Spec-W26.md · W-27 Workout-Template-Detail-Spec-W27.md · W-21 Exercise-Library-Wireframe-Spec-W21.md · W-22 Exercise-Detail-Wireframe-Spec-W22.md · W-23 Exercise-Picker-Wireframe-Spec-W23.md · W-28 W-28-Create-Edit-Custom-Exercise.md · L-1 Legacy-Hub-Wireframe-Spec-L1.md · L-2 Legacy-Timeline-Wireframe-Spec-L2.md · L-3/4 Chapter-Detail-Wireframe-Spec-L3-L4.md · L-5 L-5-Chapter-Creation-Spec.md · L-6 Chapter-Reflection-Wireframe-Spec-L6.md · L-12–14 Accomplishments-Wireframe-Spec-L12-L14.md · L-15/16 Photos-Wireframe-Spec-L15-L16.md · L-17/18 **Transformation-Gallery-Wireframe-Spec-L17-L18.md** (new, 2026-07-02) · L-11 Honor-Detail-Sheet-Spec-L11.md · L-10 Honors-Spec-L10.md · P-1 Profile-Wireframe-Spec-P1.md · P-2 P-2-Progress-Hub-Spec.md / Architecture.md · G-1 Goal-Hub-Wireframe-Spec-G1.md · G-2 Goal-Detail-Wireframe-Spec-G2.md · G-3 Goal-Create-Edit-Wireframe-Spec-G3.md · M-1 Rank-Up-Modal-Spec-M1.md · M-2 Honor-Earned-Modal-Spec-M2.md · M-3 M-3-Goal-Achieved-Spec.md · M-4 M-4-Program-Graduated-Spec.md · M-5 M-5-Chapter-Sealing-Confirmation-Spec.md · M-6 M-6-Destructive-Action-Confirmation-Spec.md · M-7 M-7-Premium-Upsell-Spec.md · S-1 Squads-Hub-Wireframe-Spec-S1.md · S-2 Squad-Detail-Wireframe-Spec-S2.md · S-3 Squad-Management-Permissions-Spec-S3.md · C-1 Challenge-Hub-Wireframe-Spec-C1.md · C-2 Create-Challenge-Wireframe-Spec-C2.md · C-3 Challenge-Detail-Wireframe-Spec-C3.md · C-4 Challenge-Results-Wireframe-Spec-C4.md · C-5 Hall-of-Champions-Wireframe-Spec-C5.md · C-6 Squad-Records-Wireframe-Spec-C6.md · C-7 Current-Champions-Wireframe-Spec-C7.md · SH-1 Share-Configuration-Step-Wireframe-Spec-SH1.md · WSR-001-Workout-Share-Result-Architecture.md · P-4 P-4-Settings-Root-Architecture.md / Wireframe-Spec.md · P-5 P-5-Notifications-Architecture.md / Wireframe-Spec.md · P-6 P-6-Privacy-Architecture.md / Wireframe-Spec.md · P-8 P-8-Subscription-Architecture.md / Wireframe-Spec.md · P-9 P-9-Account-Wireframe-Spec.md

### Design system
Forge-Legacy-Design-System-v1.0.md · Component-Library-Architecture-v1.0.md · Forge-Design-System-Architecture-v1.0.md

### Feature specs / amendments referenced for reconciliation context
O-2-Amendment-001-Athlete-Type-Declaration.md · Amendments/O-2-Amendment-002-Athlete-Type-Correction.md · P-1-Amendment-002-Athlete-Type-Editability.md · Amendments/P-1-Amendment-004-Pinned-Legacy.md · Amendments/Squad-Architecture-Amendment-001/002 · Amendments/Challenge-Architecture-Amendment-002/003/004 · Amendments/Comparison-Philosophy-Amendment-001.md · Amendments/Identity-Amendment-001-Username.md · ExercisePrescription-Amendment-001.md · Program-Ecosystem-Amendment-001-Powerbuilding-Intermediate-Retirement.md (referenced, not directly read) · Program-Architecture-Amendment-001-Active-Program-Rule.md (referenced, not directly read)

### Product docs
Forge-Legacy-Master-Status.md (project status dashboard, consulted per AGENTS.md but not a design-content source)

### Formalized 2026-07-02 (stakeholder-directed decisions, now locked in official architecture)
- **Communities discovery entry points** — `Docs/Amendments/Community-Architecture-Amendment-001-Navigation-Entry-Points.md` (new); reconciled into `Community-System-Architecture-v1.0.md` COM-D18, `Home-Screen-Wireframe-Spec-H1.md` (→ v1.3), `Squads-Hub-Wireframe-Spec-S1.md` (→ v1.5), and `Global-Search-Architecture-v1.0.md` (stray tab-count reference corrected). **Superseded 2026-07-07, see below.**
- **Transformation Gallery** (L-17 Gallery, L-18 Entry Detail) — new Legacy feature; `Transformation-Gallery-Architecture-v1.0.md` and `Transformation-Gallery-Wireframe-Spec-L17-L18.md` (both new); reconciled into `Legacy-Hub-Wireframe-Spec-L1.md` (→ v1.1, new §8a) and `Photos-Wireframe-Spec-L15-L16.md` (differentiation note).

### Formalized 2026-07-07 (stakeholder-directed decision, reverses the 2026-07-02 Communities navigation model)
- **Communities promoted to the 5th bottom-navigation tab** — `Docs/Amendments/Community-Architecture-Amendment-002-Fifth-Tab.md` (new); reconciled into `Community-System-Architecture-v1.0.md` (COM-D18 revised), `Home-Screen-Wireframe-Spec-H1.md` (Tier 6 module retired), `Squads-Hub-Wireframe-Spec-S1.md` (Tier 3 row retired), `Component-Library-Architecture-v1.0.md` (CLA-C19 TabBar → five tabs), `Forge-Legacy-Master-PRD.md` §6/§19, `FORGE_LEGACY_PRD.md`, `Onboarding-First-Time-Journey-Architecture-v1.0.md`, `Calendar-System-Architecture-v1.0.md` (CAL-D2 cross-references), `Legacy-Hub-Wireframe-Spec-L1.md`, and `Global-Search-Architecture-v1.0.md`. Rationale: Communities is designed as a high-frequency, checked-daily feed (Facebook-Group-like — announcements, member posts), not an occasional directory, and meets the same usage bar that earned the other four tabs.

---

## Self-Audit

**Sections most reliant on synthesis/interpretation (flagged, not asserted as verbatim fact):**
- §7 Page Composition Rules — the named pattern categories (App shell, Screen header, etc.) are this document's own organizing labels applied to facts drawn from many screens; the underlying facts are sourced, but the category labels themselves are a synthesis convenience, not verbatim product terminology.
- §14 Icons — icon *sizing/weight* rules are directly sourced; the observation about 🏆/🏅 glyphs in wireframe copy is an inference from reading wireframe text, not a confirmed design decision, and is flagged as such.
- §15 Motion & Ceremony — animation timing/easing values could not be found in any source document; this section states that gap explicitly rather than inventing values.

**Unresolved items requiring confirmation before Claude Design treats them as final** (consolidated from throughout — the navigation/tab-count conflict formerly listed here has been resolved and removed, see §3):
1. **Onboarding flow structure:** the original O-1/O-2/O-3 wireframes vs. the superseding 17-step Onboarding Journey Architecture — the latter's own reconciliation ledger admits O-1/O-2/O-3/H-1/W-17/Rank-Computation-Model have not yet been edited to match.
2. **Color hex values:** fixed in `Forge-Legacy-Design-System-v1.0.md`, but still called "DEFERRED" in `Component-Library-Architecture-v1.0.md` §16 — the two design-system docs have not been reconciled with each other on this point.
3. **Weight & Body Metrics chart sub-architecture** on P-2 Progress Hub — explicitly undesigned (OQ-5).
4. **Global Search entry-point affordance** — deferred to a not-yet-authored Search wireframe spec.
5. **Community wireframes** — architecture is LOCKED but no pixel-level screen layout has been authored for any Community surface.
6. **Squad Invite flow** — referenced as needed by S-2/S-3/Squad-System-Architecture but no wireframe exists yet.
7. **P-5 Notifications wireframe** — lags its own architecture doc (missing Sections C/D/E: Challenges, Friend Requests, Communities toggles).
8. **P-7 Connected Apps** — a reserved-but-entirely-unspecced settings row.
9. **Account deletion timing** (immediate hard-delete vs. grace-period) — explicitly left open as a policy decision.
10. **Icon grid/stroke-width conventions** — not stated beyond "Phosphor Icons" + the size/weight tables.
11. **Standard (non-reduced) motion timing/easing values** — not found in any source document.
12. **Rank badge insignia and honor badge artwork direction** — categories/counts are locked, but visual/material direction for the artwork itself is not specified.
13. **Transformation Gallery monetization limit** — whether entries share the existing 50-photo free-tier cap, get a separate cap, or are uncapped is an explicit open question in `Transformation-Gallery-Architecture-v1.0.md`; the current wireframe spec assumes no limit is enforced until one is locked.
14. **Transformation Gallery chapter cover media display** — the `isChapterCover` field is reserved at the schema level, but where/how it renders on L-3/L-4 or L-1's Chapter Card is deferred to a future reconciliation amendment against those documents.
15. **Transformation Gallery in-progress-original delete policy** — whether an original (pre-seal) entry should be deletable while its own chapter is still Active is explicitly flagged as unresolved; the current spec takes the conservative "no delete" reading, matching the Photos (L-15/16) precedent.
16. **Workout With Friend management queue's new home** — W-1's Claim/Dismiss/Approve/Decline surface for pending partner-tag items had no other specced location; retiring W-1 (`Docs/Amendments/Workouts-Navigation-Amendment-001-Retire-Workouts-Hub.md`, 2026-07-08) removes that surface without replacing it. Explicitly named as an open item there (WNA-D5), not resolved by this blueprint.
17. **Import Training entry point's new home** — W-1's "Import Training" Secondary CTA (added by `Architecture-Amendment-001-Import.md`) has no reassigned surface as of the same retirement amendment. Same status as item 16.

**Confirmation this document invents no new product behavior:** every screen, flow, component, rank tier, honor category, and chart in this document now traces to at least one cited, locked source document. Two items — the Communities Home/Squads discovery entry points and the Transformation Gallery feature — originated as direct stakeholder direction on 2026-07-02 and were, in this document's v1.1, temporarily ahead of the official architecture; as of v1.2 both have been formalized into official `Docs/*.md` architecture and wireframe specs (`Docs/Amendments/Community-Architecture-Amendment-001-Navigation-Entry-Points.md`; `Transformation-Gallery-Architecture-v1.0.md`; `Transformation-Gallery-Wireframe-Spec-L17-L18.md`; and the downstream documents each amends), so they are cited like any other section of this blueprint. Their three remaining open questions (items 14–16 above) are the same open items tracked in those official documents, not gaps unique to this blueprint. Beyond those two now-formalized additions, no speculative screens, features, or metrics have been added; where source material conflicted or was silent, this document surfaces that explicitly rather than resolving it by invention.

**Confirmation of optimization for Claude Design, not Claude Code:** this document intentionally omits implementation-layer detail (file paths, TypeScript interfaces beyond what's needed to describe a data shape conceptually, API/service architecture, folder structure, build tooling) in favor of product intent, screen purpose, visual tone, component behavior, and content rules — the register a design collaborator needs, not an engineering handoff spec.
