# Status Archive — September 2026

Overflow from `Forge-Legacy-Master-Status.md` § Recently Completed, moved **verbatim** under maintenance rule 6. Nothing here was deleted — several of these entries are the only surviving record of why something was built the way it was.

---

### 0. ⭐ Alabaster's last frozen grounds — four surfaces kept Forge's colours under Paper's ink, and a housekeeping line had stranded every OTA (2026-08-26, Design System / Button / Coach Holt / Cardio Block / 14 screens — **no migration**, ✅ **WEB DEPLOYED** `index-4d3adbd886e3bc5a38a9ced52c38dac1` · ✅ **OTA PUBLISHED TO BUILD 6** iOS `01a03e67-50f5-7e57-8bdb-174baa84b6b2`)

**A correction pass on the light theme, from four PO reports in one sitting.** Every defect was the same
shape and the shape is worth naming: **a hard-coded GROUND under role tokens that flipped correctly.**
The compiler cannot see it — a frozen ground is not a missing token, it is a present literal — and
`foundation.paper.ts`'s shape types only catch a one-sided *addition*, never a one-sided *omission*.

**⭐ THE DISABLED FINISH WORKOUT BUTTON.** PO: *"that color I gave you for the finish workout is because I
hadn't completed any set. So it's showing that I can't click it, but it should be a better color than
that still."* `DISABLED_FILL_COLORS` was `['#1C1E22','#15171B']` — the only hard-coded colour left in the
composite — so on cream the button that could NOT be pressed became the highest-contrast object in the
footer, out-ranking ADD EXERCISE, which could. Paper's answer is a **recessed plate**: its top stop is
`surfaceRecessed` exactly, measuring **1.23:1** against the action bar. The label is measured rather than
picked — Forge's composites to **3.67:1** on its own fill, Paper's `#756D60` lands at **3.70**. The same
sweep took the `destructive`, `secondary` and `text` disabled roles, all of which were pale-on-dark.

**⭐ COACH HOLT.** PO: *"evaluate coach holt and his coloring to make him fit more with the light mode."*
The mark is a bronze relief struck on a **near-black field** (measured: median luminance 11/255), so
cover-filled into a 52px circle on cream it read as a hole punched in the page — wearing a hard black ring
and a black drop shadow besides. A second asset was generated rather than a `tintColor`, which would
flatten the relief that makes it read as struck: `scripts/artwork/holt-mark-paper.py` maps the master's
own luminance onto `bronzeMetallic`'s endpoints (#765B44→#C99767), the one gradient Paper deliberately
refuses to invert. **Four ramps were rendered at the real 52px on the real ground and compared** — two
came out pewter, one olive-brass. His in-session sheet was separately dropping a near-black curtain over
a cream app, having hand-rolled `flShadow.sheet` instead of using it.

**⭐ THE CARDIO BLOCK — and it was never running-specific.** PO: *"This is supposed to be the light version
for running, but I'm sure is all the cardio."* Correct: every cardio activity draws this card.
`backgroundColor: '#0D1116'` was frozen while the title, sub-line, segmented control and stat tile all
flipped — so Paper's **dark ink title was written onto Forge's black slab** and "Outdoor Run" was
invisible. The card now joins the ivory card family and the band across its top becomes a recess
(`surfaceRecessed`), which is how Forge's own below-the-card relationship reads on paper. Apple Maps tiles
were pinned `userInterfaceStyle="dark"` under a comment reading *"the app is dark everywhere"* — true when
it was written, false since Alabaster shipped.

**⚠ AND A DARK-THEME REGRESSION NOBODY HAD SEEN, BECAUSE ONLY THE LIGHT THEME WAS BEING REVIEWED.**
`paperScrim` is a PURE function that cannot import `IS_PAPER` — it is deliberately runtime-import-free so
`node --test` can reach its classifier — so it flips any near-black rgba to cream **in either theme**. The
gate lived at exactly one call site, privately, inside `screen-background.tsx`. **Fifteen other call sites
across fourteen screens** therefore painted a cream commit bar, footer or sheet backdrop over Forge's
near-black: Create Squad, Log Activity, Program Builder, Workout Builder, both Chapter screens, Create
Challenge, Squad Preview, Squad Transfer, Template Detail, Transformation Detail, Progress Photo Post and
Holt's chat sheet. Now `@/constants/theme-scrim`, shared, so skipping the gate is the odd case rather than
the majority — which is the actual fix, since a helper nobody could import from is how this happened.

**⭐ THE WHOLE RUN ON THE MAP — without touching D-RTE-1.** PO: *"I want the whole run on the map. The whole
cutting off part of the run I don't want that."* The stored polyline is trimmed 200 m at each end **before
it is written**, which is the condition under which `Route-And-Elevation-Persistence-Amendment-001` lifted
the outright ban on storing routes at all. Nothing about that changed and the mutation-tested suite still
proves it. What changed is that the card stopped discarding what it already had: `useRunTracker.stop()`
leaves the finished track standing, so after a tracked bout the **whole untrimmed run is in memory** — and
the card was drawing the stored shape anyway, showing the athlete less than the app was holding for no
privacy gain. Caption, sheet footer and map pins all now say which of the two shapes they are showing;
`WHOLE_RUN_NOTE` joins `ROUTE_TRIM_NOTE` rather than replacing it. Re-open the workout tomorrow and it
falls back to the stored shape, because the ends were never written down.

**⛔ THE PUBLISH ITSELF FOUND TWO DELIVERY DEFECTS, AND BOTH WOULD HAVE SHIPPED SILENTLY.**

  1. **`fingerprint:compare` refused the OTA.** `9f68311` (this morning, animation tooling) added a
     three-line ignore for `scripts/animation-processing/out/` to `.gitignore`. `@expo/fingerprint` hashes
     `.gitignore` ITSELF, so the runtime version moved off `411fd2b6…` — the runtime every tester's build
     is on — and **every OTA published after that commit would have reported a green publish to nobody.**
     ⚠ **THIS IS THE THIRD TIME** (`eas.json`'s submission block, then `2439b11`'s landing-page lines,
     fixed in `e3eba5e` — whose own message says *"any housekeeping commit can strand the phone, and the
     only way to know is to run the compare"*, eight days before it happened again). Same fix: the rule
     moved to `.git/info/exclude`, which is not hashed. `git check-ignore` confirms it still bites and
     `.gitignore` is byte-identical to build 6's.
  2. **A 22.3.0 deploy landed an EMPTY WORKER and printed success.** 404 for twelve minutes — on the alias,
     on the deployment's own URL, and on a direct asset path — with a `--dry-run` payload verified healthy
     immediately before (20,102 bytes of real `assets.json` entries, not 22.4.0's 295-byte empty object).
     **A good payload is necessary and not sufficient.** The runbook now carries the test that separates
     the two 404s: the alias lags, a deployment's own URL does not — *deployment 200 + alias 404* is
     propagation and must not be re-deployed, *both 404* is an empty worker and waiting cannot fix it. A
     re-deploy of the byte-identical `dist` was live and hash-matched on the first probe.

**Verified, not assumed:** every Forge value asserted byte-identical to the literal it replaced (14 colour
values plus all 10 distinct scrim strings, all OK); `tsc` clean; eslint clean; **2,858 tests pass**. The
live bundle was fetched from production and searched for eight distinct new strings — all found.

**A guard earned its place mid-pass.** `svg-gradient-stops.test.mjs` failed the first `<Stop stopColor={}>`
edit, because `react-native-svg` silently drops the alpha out of an rgba string and paints the stop opaque
on device. The tokens are alpha-free hex, so the fix was to say `stopOpacity={1}` out loud.

**Files:** `src/constants/foundation.forge.ts` + `foundation.paper.ts` (14 new tokens, both sides) ·
`src/constants/theme-scrim.ts` (new) · `Button.tsx` · `HoltMark.tsx` + `assets/images/coach-holt-mark-paper.png`
+ `scripts/artwork/holt-mark-paper.py` (new) · `SessionCoachSheet.tsx` · `CardioBlockCard.tsx` · `RouteMap.tsx`
+ `RouteMap.web.tsx` · `RouteSheet.tsx` · `src/domain/run/route-region.ts` · `screen-background.tsx` +
`CoachChatSheet.tsx` + 12 screens · `.gitignore` · `.claude/skills/deploy-web/SKILL.md` · this board.


### 0. ⭐ Alabaster — the app has a second theme, and the whole colour system had to become one (2026-08-25, Design System / every screen — **no migration**, ✅ **WEB DEPLOYED + ✅ OTA DELIVERABLE ON BUILD 6**)

**Status: SHIPPED, BOTH SURFACES.** Web `index-a2457608…` (200 twice, matching hash, `Alabaster` and
`THEME_IS_SYNC` found in the LIVE bundle) · iOS OTA `01a03b5e-3ea4-76be…` on build 6's runtime,
`fingerprint` an EXACT match before publishing and the manifest endpoint served the new id to an iOS
client afterwards. Pushed to `origin/feat/route-map` (`b312a43`).

⚠ **THE V1 ARCHITECTURE FORBADE THIS AND STILL DOES ON PAPER.** `Component-Library-Architecture`
**CLA-D12**, `Forge-Design-System-Architecture` §5.6 and `Forge-Design-Blueprint` §567 all lock the app
dark-only. ⛔ **The amendment authorising it is NOT written** — the code shipped ahead of the document,
which is this board's recurring failure running in the opposite direction from usual. `Docs/Amendments/
Design-System-Architecture-Amendment-001-Light-Theme.md` with `DSA1-D##` IDs is **owed**.

⭐ **THE MECHANISM IS A RELOAD, AND THAT IS THE DESIGN.** All 277 `StyleSheet.create` calls sit at
MODULE SCOPE — they freeze their colours the moment a module is first required — so a live toggle would
have meant rewriting 240 files into style factories. Instead `foundation.ts` became a SELECTOR over
`foundation.forge.ts` / `foundation.paper.ts` with its public shape unchanged, so **all 184 consumers
compile untouched**. Gate for the split: **all 77 original dark tokens byte-identical**, 0 changed.

⭐ **ONE FILE RE-THEMED 205 SCREENS.** Every caller passes a hardcoded darkening scrim;
`ScreenBackground` flips them centrally, PRESERVING THE ALPHA — that number means *how much of the
plate is suppressed*, which holds in either theme.

⚠ **THE SAME BUG FOUND FIVE TIMES: A ROLE TOKEN FLIPPING UNDER SOMETHING.** `cream100` means "primary
text" — near-white in Forge, DARK INK in Paper. It was used for the Workouts toggle label on a bronze
fill, for titles over a 0.92 black media scrim (the Legacy cards read as blank rectangles — reported as
*"not showing any picture"*), for text over background artwork (a *"weird smear"*), and for a title
with TWO grounds at once. Each needed a fixed-in-both-themes token: `onBronze`, `onMedia`, `textHalo`.
⚠ In Forge every one of those grounds is dark, which is exactly why one value was right for years.

⛔ **AND TWO DEFECTS THE THEME ONLY REVEALED, NEITHER OF THEM A THEME BUG.** (1) The 72 artwork PNGs
were **never actually cut out** — the original pass used luminance directly as alpha, so the dark
background survived at ~40/255 over 87% of every asset. Invisible on black, a warm rectangle on cream.
Re-cut from the opaque masters by `scripts/artwork/alpha.py`. (2) `pins.poster_url` has existed since
`0005` and **nothing ever wrote it**, so video pins fall back to a bare `.mp4` — which native can draw
and **a browser on iOS cannot**, because iOS refuses to fetch video data without a gesture.
`ensurePinPoster` now extracts and stores the frame; ⏳ **native-only and unverified from here.**

⭐ **THE PHONE CAME LAST AND NEEDED A BOOT GATE.** PO: *"I clicked on Paper and it didn't change
anything."* AsyncStorage is a promise, so native could not know the theme before the stylesheets froze.
`expo-router`'s route modules are LAZY, so holding the first render holds the whole token layer:
`package.json` → `main` now points at `src/boot.tsx`. ⚠ **Verified the fingerprint does NOT move before
writing it**, or the fix would have needed a new TestFlight build.

⭐ Also shipped: the wordmark + page title unified across **all 214 AppBar titles** (`serif` removed,
not left inert); **drag-to-dismiss on every sheet that draws a grabber** (the shared composite had none
and 49 files use it); **Squads reordered** to Now → Together → Progress → History, with the guided tour
re-sequenced to match; 15 sticky bottom bars; Coach Holt 48 raw colours → 1.

⚠ **NOT DARK-NEUTRAL, DELIBERATELY.** White-on-bronze and the AppBar change alter Forge too, on the
PO's *"that should be for everything"*. Alabaster itself is **opt-in, Forge stays the default** — no
tester's app changes theme without them choosing it.

⏳ **OPEN:** the amendment above · **~1,130 raw colour literals in 178 files still do not follow the
theme** and the promised `no-raw-color-literals` lint rule is unwritten · the exercise animations need
drive `F:` mounted to re-render (the pipeline is correct and proven on frames, `FL_THEME=paper`) ·
32 rank badges need a light art pass · ceremonies re-theme but have no Paper artboard · bronze-400 as
small text measures **3.74:1** on cream (was 5.78 in Forge) — `--fl-bronze-600` fixes it at 4.74 and is
NOT applied, because it is the PO's accent.

**Gates:** tsc **0** · **2,849/2,849** · lint **at the pre-existing baseline (1 error + 13 warnings)** ·
fingerprint matched build 6 · web export clean, 96 routes prerendering through the new entry.


### 0. ⭐ A coaching cue can finally be written where a workout is built — and three doors were eating the ones Holt already wrote (2026-08-25, W-25 Workout Builder / Active Workout / Coach Holt — **no migration**, ⏳ **NOT DEPLOYED**)

**PO:** *"When I'm either doing final touches on a coach holt program or building a program, I should be
able to leave a note here like 'underhand close grip' that shows up during my active workout either from
coach holt or on the card."*

**The model was already right and had been for a while.** `ProgramExercise.coachNote` /
`TemplateExercise.coachNote` / `SessionExercise.coachNote` exist, are documented at length, and are
emphatic about the one distinction that matters: **the author's cue is not the athlete's log note.** One
is the prescription, written into the plan and shown to whoever trains it every time; the other is
"shoulder felt off", written during a session. Merging them would let a diary entry overwrite a coaching
instruction. Nothing here changes that separation — this pass finishes the field rather than adding one.

⭐ **THE AUTHORING GAP WAS EXACTLY ONE SCREEN.** The Program Builder has had the editor since cues
existed. The **Workout Builder (W-25, "Build a Template")** — the screen in the PO's screenshot — has
**round-tripped `coachNote` through `toTemplateExercises` and `hydrate` the whole time and never had
anywhere to type one.** ⚠ **And it was specified**: `Docs/Free-Workout-Builder-Spec-W25.md` §3.5 draws
`[Notes: Add a note for this exercise...]` in the exercise-card wireframe, §5.3 specifies the interaction,
§5.2 says it is shown for every activity type, and it sits **unticked in the spec's own build checklist**
(§ "Exercise rows", § "Notes: all activity types"). This is the board's recurring pattern — *specified,
locked, never applied* — in its quietest form, because the field round-tripped so nothing looked broken.

⚠ **THE CAP IS 280, NOT THE 200 §5.3 NAMES, AND THAT IS DELIBERATE.** Both builders write the **same
field**, and a program day authored at 280 reaches this screen through a saved template. A shorter cap
here would silently truncate a cue on the way past. §5.3's 200 predates `coachNote` existing.

⛔ **THEN THE READ SIDE, WHERE THE REAL LOSSES WERE — THREE LAUNCH DOORS DROPPED THE CUE ENTIRELY.**
`WorkoutLaunch.exercises` was declared inline as **four fields** (`catalogKey`/`name`/`sets`/`targetReps`)
and its consumer read exactly those and stamped `section: 'main'` on every row. Honest for an **invite**,
which snapshots a workout to its bones. But three other things travel that field:

1. **Home → "Build for later" → Save & Start**, and
2. **Home → the parked hero → start it**, both handing over a whole `TemplateExercise[]`, which arrived
   with **warm-up and cool-down flattened into main, supersets dissolved, cardio blocks turned into sets
   of reps** — and, once cues could be authored, the cue gone too.
3. ⭐ **Coach Holt's chat → "Start it now"**, which is the PO's *"from coach holt"* half. `save-shapes.ts`
   **declared this gap in its own header** — *"The coaching cue does NOT travel… Starting a day Holt built
   loses his cue; saving it as a template keeps it. That is a real gap and it is stated rather than papered
   over."* ⚠ **And `buildDayWorkout` writes cues onto Holt's rows already**, which the rewritten test
   proves — so **every cue he wrote was being thrown away on Start and kept on Save. Same day, same coach,
   two answers, and the athlete got the empty one at the rack.**

⚠ **THE FIX IS A WIDENING, NOT A NEW MECHANISM.** `TemplateExercise` requires precisely the four fields
that were declared inline and makes every other one optional, so **every existing writer type-checks
unchanged** and the four-field invite row is already a valid value. The consumer now runs
`templateToSessionExercises` — the crossing that already existed for this shape — whose set construction
is character-for-character what it replaced (`Math.max(1, e.sets)`, `targetReps || 8`, the same `'main'`
default), so **an invite builds byte-for-byte the session it built before.** `starterId` exists in that
same file specifically to avoid this trap; the planned workout was walking into it anyway.

⭐ **AND ON SCREEN — A LINE, NOT THE CARD THAT WAS DELETED.** `THE PLAN SAYS` used to be a hero card here
and was removed in the 08-24 *"cards are for things you act inside of"* pass — correctly, and its styles
carry a warning against rebuilding it. ⚠ **A cue is information, so it gets a line.** Cream italic under
the exercise name, no border, no background, **no bronze**, in the same voice the ⋯ menu and both builders
already show a cue in. ⚠ **Drawn in BOTH hero faces**, which is the whole point: the hero auto-collapses
on the first resolved set, so from set two onward the collapsed strip is all of the lift the athlete can
see — and *"underhand close grip"* is exactly as true then as it was walking up.

⚠ **HOLT KEEPS HIS ARRIVAL RULE AND CHANGES HIS WORDING — the PO's call.** `coachLine` retires the plan
cue once a set is logged, which is right for *"go up to 95 lb"* (a sentence answered by doing it) and
reads as a broken coach for a grip cue. Rather than exempt it, **he now says it covers the whole
exercise** — `"<cue> — that holds for every set."` — then retires on the first set or the X, as before.
⚠ Added in the **render**, beside `inUnits` and for the same reason: `coachLine` returns the sentence the
plan holds, and stitching presentation into it would put the suffix into the unit tests and the chat
sheet. ⚠ And added **before** the dismiss comparison, which keys on the final text — suffixing after would
mean the athlete closed one string while the next render produced another, and the X would stop working.

⛔ **AND THE ATHLETE'S OWN NOTE HAD THE SAME DISEASE, ONE SCREEN LATER.** PO, on seeing the pass:
*"It doesn't show up anywhere in the active workout though. Like, there's no place to type and leave a
note that's obvious for me."* ⚠ **The field was not missing — it was finished, saved, read back, and
unreachable.** `ex.note` writes to `workout_exercises.notes`, `fetchLastNotes` reads it, and it returns
as the **LAST TIME** block on the hero next session. The only way in was the ⋮ sheet, **eleven rows down
and below the fold**. ⚠ **That is the worst version of the failure**: the OUTPUT was visible and the
INPUT was not, so the app showed the athlete notes with no evident way to have written one.

⭐ **It is now a row on the card**, under Add Set / Remove Set — *"Add a note for next time"*, and the
note itself in cream italic once written. ⚠ **Placed BELOW the three mutually-exclusive bodies, not
inside the set table**, which is the part worth keeping: the table draws for a strength lift, a
`CardioBlockCard` draws for a run, and a superset member draws **neither** — so a row inside the table
would have shipped on exactly one kind of exercise and been missing from every run and every superset.
One instance below all three covers each. ⛔ **The one honest exclusion is the FUSED superset card**,
which merges two exercises, so *"a note about this exercise"* has no referent; tapping a member's name
opens it on its own card, where the row is. ⚠ **And the sheet now says what the note is FOR** — *"How it
went, for next time — you'll see this when this lift comes round again"* — because the note's whole
value is that it comes back, and an athlete who does not know that has no reason to write one.

**Gates:** tsc **0** · **2,328 / 2,328** (2,326 baseline + **2 new**) · eslint **1 error + 13 warnings =
the pre-existing baseline, nothing added** (the error is `use-color-scheme.web.ts`, untouched).

⚠ **ONE TEST NOW ASSERTS THE OPPOSITE OF WHAT IT USED TO, AND THAT IS THE FINDING.** `"the launch shape is
exactly four fields"` guarded the old gap and was correct when written. It had to be **rewritten rather
than relaxed**, because running it against the real `buildDayWorkout` fixture is what proved Holt's cues
were being dropped — the fixture rows carry cues. It now asserts they survive, plus that a row with no cue
grows no key (absent, never `''` — an empty cue would draw an empty italic line for the whole lift).

⏳ **NOT DEPLOYED, AND VISUAL — no test in this repo can see the cue line or the strip.** The authoring
sheet, both hero faces and the coin's new suffix have never been rendered for a human. Needs a web deploy
and an OTA (no native code, so it is OTA-safe on build 6).

### 0. ⭐ Cards are for things you act inside of — Home stops being a stack of rounded rectangles (2026-08-24, Home / ProgramMissionGrid / YourCircleCard — **no migration**, ✅ **WEB DEPLOYED + ✅ OTA DELIVERABLE ON BUILD 6**)

**PO, and it is a RULE rather than a screen fix: *"Cards are reserved for things the user acts inside of. Information doesn't automatically get a card."*** The diagnosis that produced it is worth keeping whole: *"the top of the screen does not feel AI generated"* — the chapter's editorial serif, the diamond rule, the bronze quote line — *"then you get down into the product UI and it gradually becomes more like a premium component library."* Home was running `container → label → content → divider → container` three times, so Today's Workout, Program/Mission and Your Circle all said **"I am a card"** when they are an action, an objective and a group of people.

⚠ **THE FIX IS SUBTRACTION, NOT MORE DESIGN.** PO: *"Don't add more design. Remove some componentization."*

⭐ **PROGRAM + MISSION LOSE THEIR SURFACES IN BOTH STATES.** With a program they are an open two-column region with a single centre hairline — no outer border, no per-column background, no radius, no shadow; without one, Mission stands alone at full width under a section label instead of leaving *"an awkward missing card"*. **Both halves stay independently tappable and keep their chevrons**, so the usability of the tiles survives without their surfaces. ⭐ **The proof it is real is mechanical: `flRadius` and `flShadow` are now unused imports in that file** — nothing left has a corner or an edge to cast one. The `0 / 36` unit label also moved from beside the count to under the bar, because pushing it to the far right was only ever balancing the container.

⭐ **THE HOLT PROMPT BECOMES THE JOINT.** It was a centred 12.5sp line of bold sans reading as a footnote to Mission. It now runs **edge to edge** — `marginHorizontal: -18` cancels the content padding and pays it back inside, so the rules reach the screen edge while the mark stays on Home's left margin — separating the athlete's own material above (chapter · today · objective) from other people below (circle · train together). ⚠ **Its hairlines are NEUTRAL on purpose.** Bronze is Home's "do this now" signal and it was already edging nine separate things; PO: *"if everything receives bronze edging, it starts behaving like a default border colour rather than an accent."*

⭐ **YOUR CIRCLE DROPS THE ROUNDED RECTANGLE INSIDE THE ROUNDED RECTANGLE.** The live session sat in its own bordered, filled, rounded box inside the card's own bordered, filled, rounded box. ⚠ **Nothing is lost by removing it** — the presence dot, the LIVE NOW label, the pulsing avatar ring and the Join button are four signals saying someone is training, and none of them was the border; the card's own edge already warms to bronze (`cardLive`) when the block is present, which is the lighting the box was standing in for.

⚠ **NO COLOUR CHANGED, AND THAT WAS CHECKED MECHANICALLY** — the diff contains **zero new colour literals**, every value being an existing token. **One consequence flagged for veto rather than buried:** the column eyebrows moved `gray600` → `bronze400`, because they are section labels now and that is what `SectionHeader` already uses for every other section on Home (CLA-D14, the one sanctioned all-caps scale).

⛔ **TWO THINGS IN THE MOCKUPS WERE DELIBERATELY NOT BUILT.** A **fifth "Friends" tab** appears in both — it has **never existed in this repo** (four tab files; the layout's own comment says *"the 4-tab bronze shell"*), and bundling an IA change into a layout pass is how one gets approved by accident. And the *"extremely faint gradient behind the whole region"* was offered as a *perhaps* and is a style addition, not layout; the region sits on flat ground below the hero, so it is one line to add if legibility ever suffers against the stone.

⏳ **Visual only — no test in this repo can see it.** tsc **0** · **2,795/2,795** · lint at baseline. ✅ **BOTH SURFACES** — web `entry-3b607e682445b33323b709b2a0ca9166.js` (prod **200** on the first check, live bundle **MD5-identical** to `dist/`, five new style names found in the **LIVE** bundle) + **iOS OTA `01a03706-9c5a-7a69-ad99-d0d92e84dc2c`** on runtime `411fd2b6…`, `fingerprint:compare --build-id 078d2838…` an **exact match before publishing** and the manifest served this update's own id to an iOS client afterwards. Commit `8341f4d`.


### Older entries — `Docs/Status-Archive-2026-08.md`

The **60** entries before this point moved there on 2026-08-18, 2026-08-19, 2026-08-20, 2026-08-22, 2026-08-24 (five times) 2026-08-25 and 2026-08-26 (twice), **verbatim**. Nothing was deleted or
summarised.

This section had grown to 48 entries and 4,378 lines — **81% of a dashboard `AGENTS.md` requires every
session to read first**, all of it written in the single week of 11-18 August. Keeping the 15 most recent
is what "recent" means; the rest is history, and history reads better one file back.

> When the dashboard does not explain why something was built the way it was, the answer is very often in
> the archive. Several of those entries are the only record of a decision.

### 0. ⭐ The coin's rim stopped floating, and Holt stopped repeating himself to an empty history (2026-08-26, Coach Holt medallion / CoachBubble nudges — **no migration**, ✅ **WEB DEPLOYED** `index-3fefea43a5f60eadb8d1d4e555d3abfc` · ✅ **OTA PUBLISHED TO BUILD 6** iOS `01a03fd3-3e7f-7e7c-a06e-f9f86336286e`)

Two PO reports in one sitting, unrelated to each other and both worse than reported.

**⭐ THE SLIVER IS SHADING, NOT AN EDGE.** PO: *"I don't know if I like the 3d look of it. The sliver on
the right side that's outside of the outline."* Measured outward from the coin's fitted centre
(192.5, 207.0 in master pixels): field and figure to R 152, then a **dark ring at R 153–157, median
luminance 4 of 255**, then the rim at R 159–173, then nothing. That trench is the 3D disc's own bevel and
it runs the whole way round — where the light catches it, lower-left, it fills with bronze and the rim
reads as part of the coin; where it does not, upper-right, it stays black and the rim's highlight floats
free as a crescent. **A crop was tried first and did nothing, because there is no stray geometry to
crop.** The trench is filled with the field's own colour and the rim redrawn as one flat ring lit from a
single direction, butted against the field with a 1 px seam.

**⭐ AND ALABASTER HAD COLLAPSED THE FIGURE INTO THE FIELD** — the light-mode complaint from earlier the
same day, which the ramp in **Recently Completed #1** improved but did not measure. Relief against field,
inside the coin:

| | shipped | now |
|---|---|---|
| Forge | 3.89 : 1 | **6.48 : 1** |
| Alabaster | **1.58 : 1** | **4.08 : 1** |

The old ramp squeezed the whole medallion into luminance 95–158. `#745730 → #F7E9D0` lands Paper on
Forge's separation, and the disc measures **5.6:1 against the cream page, up from 4.9** — it gained
presence rather than punching a hole. ⚠ **The light end stops at warm ivory on purpose**: near-white
scores *better* on separation and renders the coach in **pewter**, which `holt-mark-paper.py` had already
recorded once and which was confirmed again by rendering it.

⚠ **NOTHING WAS REDRAWN.** Same coach, same folded arms, same bubble — only the ring around him is new.
Eight vector reconstructions of the folded arms were drawn and rendered at 52/36/24 first and all were
worse than the original (chevron, slash, lectern, nameplate); the master's own artwork wins.

**⚠ THE PRISTINE ARTWORK MOVED to `coach-holt-mark.master.png`.** Both shipped files are now generated
output, so `holt-mark-paper.py`'s *"the Forge master, never written"* premise had quietly become false —
it would re-ramp a ramp. Superseded by `scripts/artwork/holt-mark.py` (both variants, one master) and its
entry point now hard-exits. ⏳ **`site/README.md` derives the landing page's `coach-mark.webp` from the
Forge file and has NOT been regenerated.**

**Home's lead mark 54 → 44.** It was the largest Holt in the app — bigger than the floating coin that is
his actual tap target — while its own comment called it low visual weight, and closing the artwork's 9%
dead margin made the same number read a tenth larger again. The ladder is now hierarchy rather than
drift: **52** floating coin · **44** lead card · **40** chat gutter · **34** session sheet. 52 was already
correct and stays; it simply now draws a coin that fills its box instead of one inset by 9%.

**⭐ AND THE NUDGE WAS SPENT ON THE TAP, NOT THE READ.** PO: *"coach holt as prompted me the same prompt
about honors about three times now… why it's repeating even after I clicked on it, and why other things
haven't come up (is it because I've used everything?)"* `CoachBubble` rendered the invitation on every
arrival at a home surface but only wrote `shown` from `openCoach` — so a line that was **read and not
tapped left no trace**. The effect keys on `pathname` and there are **four** home surfaces, so switching
tabs re-asked the same question.

⚠ **AND IT STARVED THE REST OF THE CATALOGUE**, which is the half that is not obvious and is the answer to
the second question. `honors` is eligible whenever `honors > 0` — **forever, once earned** — and it sits
third in a strictly ordered list. An un-retired nudge at the head is not merely repetitive: **nothing
below it is ever reachable.** `program`, `templates`, `progress`, `squads` and `metrics` were all waiting
behind one row that was never written. **Nothing had been "used up".** The write moves to the display and
is guarded by every suppression that follows it — a session, a ceremony, the tour, or a route off the four
home surfaces — because a nudge recorded while invisible is one the athlete never got, spent.

⛔ **NOT VERIFIED — whether the writes are landing at all.** `markNudge` is best-effort by design and
swallows every failure, so a missing grant or an RLS refusal on `coach_nudge_state` would look **identical
to this bug** from the client. `0179` grants `execute` on `coach_nudge_signals()` but nothing on the table,
relying on Supabase default privileges as every other table migration here does. If `coach_nudge_state` is
empty for an athlete who has tapped through a nudge, there is a second defect and this fix will not hold.
Query recorded in the session; **owed to the next pass.**

Gates: tsc **0** · lint at baseline · nudge domain **12/12** still green (the cadence was always right —
the caller was not doing its part) plus **4 new** in `nudge-repeat.test.mjs` holding both halves.
✅ **Verified against the live host**, not the deploy's own output: alias 200 with a matching bundle hash
on the first probe, and both marks fetched by their content-hashed URLs (`c0c05900d3…`, `d1676d3e77…`) —
the filenames *are* the md5 of the files in the repo, so the served bytes are provably the new artwork.
`fingerprint:compare --build-id 078d2838…` matched build 6 exactly before publishing, and the OTA went out
on runtime `411fd2b6…`. Commit `453d769` on `origin/feat/route-map`.
⏳ Not yet confirmed on a device.


> **Older entries moved to `Docs/Status-Archive-2026-09.md`** (maintenance rule 6 — this section holds the 15 most recent). Moving is not deleting.
