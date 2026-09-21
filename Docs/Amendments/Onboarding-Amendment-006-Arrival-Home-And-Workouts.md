# Onboarding Amendment 006 — The Arrival Home and Workouts

**Status:** LOCKED
**Date:** 2026-09-21
**Owner:** Product
**Amends:** `Onboarding-Amendment-005` (ONB-A5-D4, and §4's "Explore Forge stays") · `Onboarding-Amendment-002`
**ONB-A2-D4a** (Explore Forge) · the starting-point slot of `Onboarding-Amendment-003` **ONB-A3-D7**
**Implemented by:** `domain/home/composition.ts`, `app/(tabs)/index.tsx`, `app/(tabs)/workouts.tsx`,
`components/forge/CoachBubble.tsx`, `data/rank-live.ts`

---

## 1. The request

The PO walked a brand-new account on 2026-09-21 and supplied two mockups (Home, and Workouts with no
tabs), with:

> *"On the home screen I feel like we need to have a different hierarchy… Same with the workout tab, it
> doesn't look like what we planned… Should just be two prompts and even a description."*
> *"Coach Holt in the bottom right doesn't need to say anything right now."*
> *"Should we keep the explore forge at the bottom? it seems redundant."*

## 2. Decisions

**ONB-A6-D1 — The first workout owns the arrival Home, and nothing is asked in front of it.** Before the
athlete settles (no workout, no start choice, no program), the hero shows its open face with arrival
copy: **TODAY · "Start Your First Workout" · "No workout planned. Get after it." · START A WORKOUT**. The
"How do you want to start?" chooser, its guided-intake stepper and its suggestion card are removed from
Home. Every door they held is still reachable: freestyle and cardio are the hero's own sheet; building
and browsing live on Workouts; Holt is the coin.

**ONB-A6-D2 — GET STARTED replaces the chooser and Explore Forge.** Three rows under the hero, arrival
only: **Set a goal** → Goals · **Explore the app** → the guided tour · **Programs** → Workouts. Explore
Forge is removed. It repeated the tab bar, four tiles to four places one tap away already. The rows ask
nothing and record nothing, and they leave at the same moment the mission tile and the social cards
arrive (`showGetStarted === !showMissionTile`, held by a test).

**ONB-A6-D3 — The arrival Workouts tab is two doors, a sentence and a tip.** While the athlete owns
nothing (no program in any state, no template), "My Workouts" is replaced by: GET STARTED · **"Build
Your Training."** · one sentence · **Build a Program** (the guided lane, `/program-guided`) · **Choose a
Program** (Discover) · a dashed Tip. The My Workouts / Discover control stays hidden, as it already was,
except while on Discover, so "Choose a Program" can always be undone.

**ONB-A6-D4 — The chapter line from ONB-A5-D4 comes off.** The mockup's chapter block is eyebrow, title,
rule and the daily principle. "Written by the workouts you do." is no longer drawn. The `meaning` prop on
`ChapterTitleBlock` remains for any future caller.

**ONB-A6-D5 — Holt's coin is silent until the first logged workout.** The introduction line ("I build
the training…") waits until the athlete has at least one session. The coin itself is unchanged and still
opens him. Exploration nudges already required sessions and are untouched.

**ONB-A6-D6 — The starting rank is not a ceremony.** A first-ever rank evaluation that lands on
Foundation I is written silently. Nobody ascends into the rank they were given at signup, and a Share
button over it had nothing to share. The first M-1 is the first real promotion. An account whose first
evaluation lands above Foundation I (imported history) still gets its ceremony.

**ONB-A6-D7 — Discover from the arrival view has a Back button, not the tabs** (PO, same day). With
nothing owned, "My Workouts" is only the arrival view. The My Workouts / Discover control arrives with
the first thing the athlete owns.

**ONB-A6-D8 — "I'll build my own days."** On the guided builder's split step, after days and weeks, a
fourth choice opens a blank program of that shape (repeat mode, every day empty) in the Day Builder on
Day A, which then walks one day at a time.

**ONB-A6-D9 — Three ways in: Paste text · Upload pictures · From scratch.** Tabs on the guided builder's
first screen. Paste and Pictures open the existing import sheet (`?o=import`), so there is still one
parser and one preview. **Upload pictures appears only when `PHOTO_IMPORT_ENABLED` is true.** The reader
is built but its server half is off (0174 unapplied, `program-photo-read` undeployed, AI spend held for
launch, 2026-08-21). A tab that fails every tap is the Guideline 1.2 defect that flag prevents.

## 3. What this does NOT change

- **No gate, ever** (ONB-A3-D7's core). Nothing stands in front of Home, and the Start button is never
  disabled.
- ONB-A5-D2/D3: the social cards still wait for the athlete to settle.
- The settled Home is unchanged.

## 4. Validation

- A brand-new account's Home shows: chapter block · "Start Your First Workout" hero · GET STARTED (three
  rows) · no chooser, no Explore Forge, no social cards, no mission tile, no Holt speech bubble, no rank
  ceremony.
- Choosing, training or holding a program removes GET STARTED and brings the mission tile and social
  cards together, in the same render.
- A brand-new account's Workouts tab shows the arrival view, with no segmented control. "Choose a
  Program" opens Discover with the control visible, and "My Workouts" returns to the arrival view.
- A returning athlete never sees the arrival Workouts view flash while their programs load.
