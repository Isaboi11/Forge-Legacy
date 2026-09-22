# Forge Legacy — Design → App Implementation Map

Two tracks. **Design (this project, `.dc.html`) is essentially complete** — see
`Forge Build Status.dc.html`, every screen "built". **App implementation (Claude Code /
React Native) is partial.** This map is the source of truth for what remains to IMPLEMENT.

Legend:  ✅ implemented in app · 🟡 partial/shell in app · ⬜ designed, not yet implemented

---

## Implemented so far (Claude Code)
- ✅ App shell + 5-tab nav (Home · Workouts · Legacy · Squads · Community)
- ✅ Home — full (H-1 / H-2): ChapterTitleBlock, resolver-driven Today's Workout hero,
  Program|Mission grid, Your Circle, Quick Actions, avatar from profile
- 🟡 Workouts hub (W-2) — My Programs + Discover from real catalog; bottom sheets deferred
- 🟡 Legacy hub (L-1) — foundation rebuild; placeholder data
- 🟡 Squads hub (S-1) — foundation port; placeholder data
- 🟡 Community Home (CM) — foundation port; placeholder data
- ✅ Artwork system — resolver + manifest + 4 workout collections imported
- ✅ Rank badges — 7 families × 4 levels imported + wired (Home medallion, Legacy seal)
- ✅ Data model — profile + training schemas; 2 converted Strength programs

---

## Designed & NOT yet implemented (the implementation backlog)

### Onboarding / Auth  ⬜
- O-1a–d  Welcome · Create · Name · Sign In
- O-2a–f  First-Time Setup (name → username → goals → experience → equipment → schedule → program)
- O-3a/b  First Chapter / Goal ("Begin your Legacy")
- BH-1    Beginner Home (sealed gate) — the post-onboarding first-run state

### Workouts / Active  ⬜
- W-8     Activity Type Picker / Start Training sheet
- W-9c    Cardio Tracker (Run / Walk / Bike)
- W-9–16  Active Workout Flow (exercise cards, Set Input, rest overlay, End ceremony)
- Rest    Rest Timer
- W-17    Workout Summary
- W-18    Activity History
- W-19    Activity Detail
- W-20    Partner Selection Sheet
- S-10    Train Together (shared session)

### Programs / Builder  ⬜  (W-2 hub already 🟡)
- W-3     Program Detail (5 state-dependent CTAs)
- W-4     Program Creation
- W-5     Program Fork / Edit
- W-24    Workout Builder (slot)
- W-25    Free Workout Builder
- W-26    Workout Templates Hub
- W-27    Workout Template Detail

### Exercise Library  ⬜
- HG      Home Gym system (shared equipment profile)
- W-21    Exercise Library Hub
- W-22    Exercise Detail
- W-23    Exercise Picker
- W-28    Create / Edit Custom Exercise

### Legacy / Chapters  ⬜  (L-1 hub already 🟡)
- L-2     Legacy Timeline
- L-3/4   Chapter Detail (Active / Archived)
- L-5     Chapter Creation
- L-6     Chapter Reflection
- L-10    Honors Hub
- L-11    Honor Detail Sheet
- L-12–14 Accomplishments (list / detail / add-edit)
- L-15/16 Photos Albums / Chapter Timeline
- L-17    Transformation Gallery
- L-18    Transformation Entry Detail

### Profile / Progress / Goals  ⬜
- P-1     Profile
- P-2     Progress Hub
- P-3     Public Profile
- TC      Trophy Case
- G-1     Goal Hub
- G-2     Goal Detail
- G-3     Goal Create / Edit

### Modals / Ceremonies  ⬜
- M-1–7   Ceremony Modal Library (Rank Up, Honor Earned, Goal Achieved, Program Graduated,
          Sealing, Destructive, Upsell)
- SH-1    Share Configuration

### Squads  ⬜  (S-1 hub already 🟡)
- S-2     Squad Detail
- S-3     Squad Management
- S-4     Squad Composer

### Friends  ⬜
- SOC-1   Friends Feed
- SOC-2   Friends & Requests

### Challenges  ⬜
- C-1     Challenge Hub
- C-2     Create Challenge
- C-3     Challenge Detail
- C-4     Challenge Results
- C-5     Hall of Champions
- C-6     Squad Records
- C-7     Current Champions

### Communities  ⬜  (CM home already 🟡)
- PD      Post Detail (shared, origin-aware shell — Community / Squad / Friends)
- Discover Communities · Community Profile (pre-join)

### Settings  ⬜
- P-4     Settings Root
- P-5     Notifications
- P-4b    Preferences
- P-6     Privacy
- P-8     Subscription
- P-9     Account

---

## Assets already produced (import like ranks when their screen is implemented)
- ✅ Workout artwork (4 collections) — imported
- ✅ Rank badges (7 families × 4) — imported
- ⬜ **Honors insignia** — `assets/artwork/honors/*` (8: consistency · strength · endurance ·
  leadership · transformation · completion · community · milestones) — NOT yet imported/wired;
  clean next task when Honors Hub (L-10) / Honor Detail (L-11) are implemented.
- ⬜ Legacy collection art, program-theme / exercise-family art already imported for resolver.
- User-supplied (not our assets): squad crests, community banners (uploaded by users).

## Rank evaluation
The full rank logic is designed (`Rank System Reference.dc.html` + `Rank Progression.dc.html`):
active-weeks, sub-tier thresholds, time gates, prestige boundary, promotion triggers. Claude
Code has it. Implementing the **rank evaluation service** turns the current placeholder rank
(Foundation III) into a real earned rank feeding the badge slots.

## Suggested implementation order (dependency-first)
1. Ceremonies + shared stores the screens depend on (M-1–7, SH-1, Post Detail shell).
2. Programs/Builder + Exercise Library (real training data path).
3. Active Workout flow + Activity History/Detail (the core loop).
4. Legacy/Chapters + Honors (import honors art here) + Progress/Goals.
5. Social: Squads detail, Friends, Communities, Challenges.
6. Onboarding + Settings.
7. Rank evaluation service (turns placeholder rank real).
Each screen: its own gate, real-vs-placeholder honest, reuse committed composites, never fabricate.
