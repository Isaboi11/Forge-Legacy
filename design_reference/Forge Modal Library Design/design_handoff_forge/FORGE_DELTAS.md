# Forge Legacy — Deltas & Decisions

This document records where the **built screens diverge from the older architecture / blueprint
docs** (`uploads/Forge-Design-Blueprint-*.md`) and the design decisions made during the design
process. **The screens + this document are the source of truth.** The blueprint is superseded
wherever it conflicts with what is written here.

Each entry: **What changed · Why · What it supersedes.**

---

## 1. Artwork system introduced (new — not in the blueprint)
- **What:** A full illustration system — an engraved, charcoal, bronze-restrained visual language;
  a master reference (`Forge Artwork Reference.dc.html`); and activated collections: Training
  Splits, Workout Modalities, Program Themes, Exercise Families, Legacy, Honors. Assets under
  `assets/artwork/<collection>/<sex|shared>/<key>.png`.
- **Why:** The app needs one consistent, premium illustration language instead of ad-hoc images.
- **Supersedes:** The blueprint had no artwork taxonomy or asset system.

## 2. Sex-specific artwork sets
- **What:** Training Splits, Workout Modalities, Program Themes, and Exercise Families each ship a
  **male** and **female** set. The set is chosen from the user's saved sex only.
- **Why:** Athletes see figures that match their selected sex; both sets are one unified series.
- **Rule:** Sex is **never inferred** from name, photo, behaviour, or body data — saved selection
  only. Missing sex → neutral fallback (see §7).

## 3. Honors — female set is a deliberate subset
- **What:** The female **Honors** collection omits four figure-based emblems — **Strength,
  Endurance, Transformation, Community** — that the male set includes. The female side shows the
  remaining object/emblem honors (Consistency, Leadership, Completion, Milestones).
- **Why:** Explicit direction during review; the omitted four were male-figure illustrations.
- **Supersedes:** No prior spec addressed per-sex honor artwork.

## 4. Legacy & Honors reserved from the workout card
- **What:** Legacy and Honors artwork are shared (one set both sides) and **must never** appear on
  an active "Start Workout" card. Reserved for Legacy, achievement, ceremony, and empty states.
- **Why:** Keeps the workout card about *today's training*, not identity/achievement imagery.
- **Enforcement:** Guard in the resolver; validated by a unit test.

## 5. Home Workout Artwork Resolver (new system)
- **What:** A centralized, deterministic resolver — `resolveHomeWorkoutArtwork()` in
  `forge-artwork-resolver.js`, fully specified in `Forge Home Artwork Resolver.dc.html`. Chooses
  the Home-card artwork by a fixed 7-rung precedence (override → non-strength modality → strength
  split → dominant exercise family → program theme → generic fallback → neutral default), returns
  a typed object `{ collection, key, sexVariant, confidence, reason, source, assetPath }`.
- **Why:** Artwork must describe *today's* workout, deterministically, from structured data — not
  scattered per-screen logic or title string-matching.
- **Supersedes:** The Home card previously hard-coded a single placeholder ("Push Day A" /
  `assets/workout-push.png`). It now consumes only the resolved object and holds no classification
  logic.

## 6. Data-model additions required (structured fields)
- **What:** The resolver depends on structured fields that must be added to the real model:
  `workout.modality`, `workout.split`, `workout.targetMuscleGroups[]`, `workout.artworkOverride`,
  `program.theme`, `program.structure`, session-exercise `catalogKey`, and per-exercise
  `workingSets`.
- **Status:** Only the single active program (`usr-active-powerbuilding`) has
  `modality/split/structure/theme` populated as a demonstration. All others still lack them.
- **Why:** Deterministic resolution over inference. See resolver doc §14 (data-model audit) for
  what exists / is inferred / must be added.
- **Supersedes:** Blueprint program/workout schema did not carry these.

## 7. Sex fallback = neutral (fixes a model default)
- **What:** A missing sex selection must resolve to an explicit **neutral** artwork variant.
- **Status (code): FIXED in the app implementation.** `src/domain/profile/schema.ts` defines
  `Sex = 'male' | 'female' | 'unspecified'` and defaults to **`'unspecified'`** (never coerced to
  male/female); `src/domain/home-artwork/resolver.ts` maps missing/`unspecified` → `sexVariant:
  'neutral'`. Regression-tested: `resolver.test.mjs` ("Missing sex → neutral variant, served from
  male placeholder (never guessed)"; male→male, female→female) + `asset-registry.test.mjs` (the
  neutral asset resolves). The prototype `forge-user.js` (design-reference only) is superseded by
  this implementation.
- **BLOCKED-ON:** a real **neutral artwork set** (Phase-4 assets, never fabricated). Until it
  exists the resolver serves the **male** set for neutral as a *documented, tested, auditable*
  placeholder (`NEUTRAL_SERVED = 'male'`) while still reporting `sexVariant: 'neutral'`. This is a
  waiting-on-an-asset state, not a code defect — the same board vocabulary as §11's waiting-on-a-
  domain-model.
- **Why:** Never guess or default a user's sex.
- **Rank seal (§17) is sex-NEUTRAL by design — a deliberate decision, consistent with this rule.**
  The retired raster badges carried `established-m` / `established-f` variants; the vector `RankSeal`
  is **one seal per family/level, no sex branch**. Leaning neutral (not sex-specific) is the correct
  simplification under this section's principle — identity art should not branch on sex unless the
  design is *emphatic*, and the `Forge Rank Seal.dc` is a single sex-neutral mark. Collapsing the
  Established pair to one seal is therefore **not a fidelity gap**. Revisit ONLY if the design later
  requires a sex-specific Established seal explicitly.

## 8. Workout scheduling — queue-based, not day-bound
- **Decision:** Programs remain an **ordered queue** ("next workout is always startable today"),
  **not** date/weekday-bound. Rest is emergent (a day you don't train), not a scheduled slot.
- **Why:** Never present a locked "come back tomorrow" card; matches the rank engine's *active-week*
  consistency metric (any Mon–Sun with ≥1 session) rather than fixed training days; non-punitive.
- **Optional (soft only):** Users may set *preferred* training days for suggestions/notifications —
  never to gate the next workout.
- **Supersedes:** Any reading of the blueprint implying fixed day assignment.

## 9. Calendar — explored and dropped
- **Decision:** No Calendar screen. A lean "consistency heat-map + upcoming sessions" version was
  prototyped and **cut** as redundant: the flexible queue + Home "Today's Workout" + Legacy Timeline
  already cover look-back and look-ahead; a date grid added weight against the app's restraint.
- **Why:** Avoid crowding; the unique value (private consistency view) did not justify a full
  surface.
- **Supersedes:** The blueprint listed a cross-cutting **Calendar** surface. **Removed.** The
  private consistency view can be reconsidered later as a small element, not a screen.

## 10. Squad Detail check-ins — member avatars are initials, not blank tinted discs
- **What:** The "Today's Check-ins" strip in Squad Detail (S-2) renders each member with the
  **Avatar composite's initials**, ringed by status (bronze = trained; muted + dimmed = pending),
  not the dc's blank tinted status disc.
- **Why:** The design system's AvatarGlyph **initials fallback is the sanctioned identity mark**;
  blank silhouettes/discs are not. Initials are more legible and consistent with every other member
  surface (feed authors, roster, comments). A correction *toward* the system, not a divergence.
- **Supersedes:** `Squad Detail.dc.html`'s check-in disc treatment (a preview simplification).

## 11. Feed program + PR plates carry real domain models (both structured — DONE)
- **What:** Feed / Post-Detail **program** plates carry the real Phase-0 `Program` shape
  (`durationWeeks` / `frequencyPerWeek` / `structure` enum) via a shared `formatProgramMeta`; **PR /
  achievement** plates now carry the real **`PersonalRecord`** model (`src/domain/records/` — a
  `load | time | distance | reps` measure union) via a shared `formatRecordValue`. Both are fully
  structured (no half-typed middle state) — swapping in real programs/PRs is a **data change, not a
  renderer change**.
- **Why (history):** Programs always had a schema to back them; PRs did **not**, so PR plates were
  deliberately kept a single uniform display-string convention until a real model existed (inventing
  one ahead of the records system would have risked drift — units, endurance vs weight, rep
  semantics). That model now exists and the plates are migrated onto it.
- **How the PR swap stayed honest:** the string migrated **onto** the model (sources carry a
  structured `PersonalRecord`, not parsed strings), and a golden locks `formatRecordValue(measure)`
  reproducing the exact prior display (`315 lb`, `405 lb × 3`, `19:48`, incl. **h:mm:ss** over an
  hour) — the structuring is provably lossless.
- **FORWARD (the ranking domain's job, NOT this):** a records/leaderboard/ranking domain will need a
  per-kind comparison **direction** (load ↑ better, time ↓ better, distance ↑, reps ↑) to rank PRs.
  Deliberately omitted from `PersonalRecord` — §11 is display-only; direction is added by the ranking
  domain when it lands, never retrofitted onto the display strings or bolted onto the record shape.
  Recorded in `src/domain/records/schema.ts`.
- **Supersedes:** the Community-convergence stopgap free-text program `meta` string; the PR
  uniform-display-string stopgap.

## 12. Modal-family surfaces are render-verified via temp inline render, not static export
- **What:** BottomSheet / Modal / ceremony-overlay content (ConfirmSheet, ShareSheet, the Squad
  Detail roster sheet, …) does **not** appear in `expo export` static HTML — a React Native `Modal`
  renders into a portal the static export doesn't capture. These surfaces are render-verified by a
  **temporary inline render** (swap the sheet for a plain `View` + `generateStaticParams`, grep the
  output, then revert), not the static-export grep used for inline screens.
- **Why:** So a reviewer does not read "absent from the export / no pre-rendered page" as
  "unverified." The content *is* verified; only the verification path differs for the modal/sheet
  family. (Third instance and counting — hence this note.)
- **Supersedes:** n/a — a verification-method note.

---

## 13. Community shelved behind launch (reversible; 4-tab nav while dark)
- **What:** Community is pulled from the app until there is a user base — a **reversible shelf, not a
  deletion**. The tab is removed from `@/components/app-tabs` (→ **4 tabs**: Home · Workouts · Legacy
  · Squads, which matches the design system's finalized TabBar), the screen is preserved **non-routed**
  at `src/deferred/community.tsx`, and `/community` **soft-redirects to Home** (`app/community.tsx`).
- **Why:** Hide the surface + its entry points only. Community was deliberately converged onto the
  shared `FeedPostCard` / `FeedPost` model / origin-config, so it is **not a code island** — the
  shared card/model, the community origin branch, `getCommunityFeed()`, and the community
  characterization + origin-config **golden tests all stay live** (a community-origin post re-shared
  into Friends still renders lean). The engine never left; only the surface is dark.
- **RE-ENABLE:** move the screen back to `app/(tabs)/community.tsx` + re-add its `TabTrigger` (and the
  still-defined `CommunityTabIcon`); delete the redirect stub. **BLOCKED-ON a design-system decision:**
  returning Community makes it a **5th** tab, but the finalized TabBar is 4 — the emphasized-centre
  (Legacy) math must be re-derived for 5 tabs (or Community returns somewhere other than the primary
  bar) **before** the code goes back. That is a layout decision, not a nav toggle.
- **Supersedes:** the earlier 5-tab (Home · Workouts · Legacy · Squads · Community) model — 4 tabs
  while shelved.

## 14. Public Athlete Profile — thin, honest surface (Path 1); rich profile deferred (Path 2)
- **What:** A single full-screen route `app/athlete/[id]` (root-Stack sibling) is the shared
  destination for the two author seams that used to dead-end — the **squad roster row** and the
  **feed-post author** (shared `FeedPostCard` via a new `onAuthorPress`, lit up on Friends + Squad,
  plus the Post Detail author header). The `id` param is the athlete's **name** (the key every seam
  already carries); it renders `getPublicProfile(name)` (`src/data/athlete-profile-placeholder.ts`).
- **Deliberately THIN — honest to the data:** the app has no per-athlete profile store. Only three
  inputs authoritatively exist — the **name**, the **self** identity (`getSelfProfile`), and the
  public identity markers **rank + athleteType** (authored only on the squad rosters). So the profile
  shows identity always, rank/athleteType when the subject is a known roster athlete, and **nothing
  else**. Every rich Legacy section in `Forge Public Profile.dc.html` (Current Chapter, Highlights,
  Featured Moment, Chapter History/Timeline, Transformation, Photos, Accomplishments, Honors, Trophy
  Case, Training Stats) has **no data source and is OMITTED, not fabricated** — the dc's own code
  admits "other athletes are representative mock."
- **No Firewall leak:** the squad-scoped fields **accolades** (squad honors) + **since** (join date)
  are stripped upstream (`findSquadAthlete`), so squad-internal detail never reaches this
  cross-context public surface. rank + athleteType are shown because the design's hero shows them to
  everyone (not visibility-gated).
- **Write paths are inert shells:** the relationship actions (Challenge / Add Friend / Follow) render
  visibly-disabled — never fake mutations.
- **BLOCKED-ON / Path 2:** the full authored profile needs (a) a real **per-athlete dataset**
  (`public-profile-placeholder.ts` with representative, internally-consistent profiles — the app's
  established placeholder pattern) and (b) the **visibility/Firewall clearance model**
  (`forge-visibility.js`: friend > squad-mate > stranger, per-section gating). Deferred as its own
  PO-scoped unit; this route then enriches **additively** (the seams never re-point).
- **Known limitations (noted, not gaps):** comment-author taps stay inert (dense secondary surface —
  same deferral as the record history-row); a feed author that is an **org, not a person** (e.g.
  "Iron Collective") resolves to a thin identity because the data carries no person/org flag; the
  **Community** feed's author seam is wired with its §13 unshelving (the screen is shelved + non-routed).
- **Supersedes:** the blueprint had no athlete-profile surface behind these seams; both seams were inert.

---

## 15. Legacy hero — profile portrait (left) + rank badge (right), corrected
- **What:** The Legacy hero identity row has two distinct slots, per `Forge Legacy.dc.html` (lines
  73–89): the **LEFT** is the athlete's **profile portrait** (a photo `image-slot`, framed by a faint
  rank-seal ring); the **RIGHT** is the **rank badge** — the tappable `FoundationBadge` → Progress Hub,
  with the "Progress" pill. Same split as `Forge Public Profile.dc.html` (photo left, FoundationBadge
  right).
- **The bug (fixed):** commit `d5aeac0` imported the real rank badge art and wired it into the LEFT
  (`SealPortrait`) slot, leaving the RIGHT `FoundationBadge` an empty placeholder shield — so the rank
  badge sat in the profile-photo position and the badge's real slot was blank. Corrected: the badge
  renders in the RIGHT slot; the LEFT is the initials-portrait-in-seal-ring (the sanctioned placeholder
  until a photo system exists). **Home's `ChapterTitleBlock` was checked and IS correct** — its rank
  medallion is an intentional faint top-right *watermark*, not a photo slot, so it was left untouched.
- **Supersedes:** the prior wiring (badge-left / empty-right), which the status board's `d5aeac0` note
  described as intended — it was not.

## 16. Screen backgrounds wired — DROPPED-FREE categorical sweep (DONE)
- **What:** Every product screen now renders its design background via one shared `ScreenBackground`
  component (`src/components/screen-background.tsx`) — design artwork (cover) on a `#050505` base + a
  darkening gradient for legibility — replacing the per-screen `bgAtmospheric` gradient. Assets copied
  to `assets/backgrounds/` behind a `SCREEN_BG` require-map (`src/constants/backgrounds.ts`). Wired:
  Home/Friends/Post/Community → slate; Workouts → slate2; Legacy/Athlete → legacy-bg; Squads Hub →
  squads-hub-bg; Squad Detail → squad-bg-continued. **Legacy** gets `hero-mountains` as a distinct
  **scroll-fading** layer (Animated `scrollY`). **Squad Detail's #4 hero was rebuilt with it**
  (name-left / crest-right) since the header background and the hero are the same region.
- **Asset finding (transport flatten):** the delivered `forge-slate.png` / `forge-slate2.png` /
  `legacy-bg.png` are **byte-identical** (one md5) — the design export collapsed distinct textures into
  one, the same class as the workout-art alpha flatten. So those screens faithfully share one slate
  texture; the genuinely distinct art is `hero-mountains` / `squad-bg-continued` / `squads-hub-bg` /
  `forge-bg-2`.
- **Fidelity status:** base artwork wired ✓ · **background sub-pass DONE (commit `f5915e9`).**
- **Background sub-pass — DONE (commit `f5915e9`):** `ScreenBackground` now takes a **per-screen**
  `overlay` (flat opacity OR stop list), elliptical bronze `radials[]` (SVG rx/ry), an `atmospheric`
  mode (`--fl-bg-atmospheric` steel gradient + cool apex, for the photo-less screens), and a Legacy
  `scrimFade`. (1) **Per-screen overlay opacity** ported verbatim — Home `0.15` · Legacy/Workouts/Athlete
  `0.30` · Post `0.32` (flat) · Squads Hub `0.28/0.5@42%/0.82` on `#060708` · Squad Detail scroll
  `0.12/0.26@38%/0.38`; the fabricated shared `0.22→0.36→0.55` is gone. (2) **Squad Detail frame bronze
  radials** (catalog #2) + a **Friends apex radial** (the `.dc` has one too) — position-verified via a
  high-opacity stress test. (3) **Friends** swapped slate photo → atmospheric gradient + apex radial
  (Ruling A — the 0.05 radial only reads over the atmospheric base). (4) **Legacy scroll choreography**
  fixed to the `.dc`: black scrim fades IN (`0→0.52` over `y/220`) instead of dissolving the artwork out,
  plus hero parallax `translateY(-y*0.12)` + portrait `scale(1-0.24p)`. `forge-bg-2` reserved for
  create/detail screens not yet built.
- **Tracked follow-ups (out of scope for a backgrounds sweep):**
  - **Squad Detail literal frame split** — the `.dc` layers a *top-anchored, natural-height*
    `squad-bg-continued.png` over the atmospheric frame (atmospheric shows below on scroll). The app renders
    the photo full-cover, so the atmospheric layer is occluded (kept as a graceful load/failure fallback,
    per ruling). Replicating the exact top-band-photo-over-atmospheric split is a **layout change**, deferred.
  - **Native-pass check** — eyeball Legacy's live scroll on device (scrim-in · hero parallax · portrait
    scale); code-verified (native-driver interpolation), not statically screenshot-able.
- **Supersedes:** the flat `bgAtmospheric` gradient on every screen; the "Design backgrounds not
  imported" DROPPED-FREE item below is now closed (base layer).

---

## 17. Rank badges — vector RankSeal replaces the alpha-flattened raster (DONE)
- **What:** The raster hexagonal rank badges (`assets/artwork/ranks/<family>-<level>.png`) shipped
  **alpha-flattened** (opaque dark backing → a black square around the hexagon) with **no clean master**
  (the app PNGs were byte-identical to the design_reference "masters" — flattened at the design export,
  same class as the workout-art / background flattens). Replaced by `src/components/forge/RankSeal.tsx`,
  a react-native-svg port of the design's own `{{ seal }}` (`Forge Rank Seal.dc`): a **vector** frame
  (machined rings, bevel gradient, curved family/tier text, recessed disc) + the flame **clipped to the
  disc**. **Circular by construction → transparent corners → the black box is structurally impossible**
  (not masked — the ornate silhouette + glow couldn't survive a clip-path anyway).
- **The flame (hybrid, matching the .dc's own method):** RN-svg supports neither the .dc's CSS `filter`
  on the raster flame nor `mix-blend-mode`. So the filter was **baked ONCE** onto `rank-bowlfire` (real
  soft alpha, honestly un-flattened) → `assets/artwork/ranks/seal-flame.png`, composited clipped-to-disc;
  the two blends (screen glow, multiply vignette) are **approximated in vector** (bronze radial / dark
  stroke at opacity), screenshot-verified against the `.dc`. A **soft-alpha-retention test** guards the
  flame so a future re-export flatten **fails loud**.
- **Categorical swap (all 3 render sites — the pre-retirement grep caught 2 non-obvious ones):** Home
  medallion (`ChapterTitleBlock`), Legacy hero (`ProgressBadge`), and the **rank-up ceremony**
  (`useCeremony`). The 32 flattened PNGs + the raster resolver (`rank-source`/`rank-registry`/
  `resolveRankArtwork`) were retired; `resolver.ts` keeps the tier vocabulary + `RANK_FAMILIES` (used by
  `ceremony/queue` to order rank-ups) + `PLACEHOLDER_RANK`.
- **Commits:** `008617e` (port + swap) · `36e66e8` (retirement).

## 18. Legacy hero seal → real badge artwork, guard-gated (partial reversal of §17, DONE)
- **What:** The Legacy top-right rank seal now renders the **real per-rank badge ARTWORK** when a
  guard-verified clean cutout exists, falling back to the vector `RankSeal` otherwise. `resolveRankBadge`
  (`src/domain/rank-artwork/badge-art.ts`) holds a registry of ONLY alpha-clean families; every other
  family returns null → vector fallback. This partially reverses §17 (RankSeal-as-primary) **for the
  Legacy seal only** — Home medallion + rank-up ceremony still use the vector seal.
- **Alpha forensics (the reason it's gated):** the retired badge PNGs split three ways —
  **BLACK BOX** (opaque rectangular matte → the flatten): `foundation`, `craftsman`, `architect`,
  `builder`(mixed); **CLEAN CUTOUT**: `established-m/f`, `legacy` (legacy is the only set with a true
  soft antialiased rim); **MISSING**: `legend` (no art anywhere). Only the clean sets (12 PNGs) were
  re-imported to `assets/artwork/ranks/`. **The current-rank family, `foundation`, is a black box** —
  so the demo `PLACEHOLDER_RANK` was moved to **Established III** so real clean art actually renders now.
- **Guard rewrite (important):** the committed alpha guard was a `nonOpaque/total > 0.2` FRACTION check
  — which **false-passes a black box that carries a transparent margin** around its matte (foundation-3:
  32% non-opaque, yet a box). Replaced with an **opaque bounding-box FILL-RATIO** guard (rectangular
  matte ≈ 1.00 fill; shaped hexagon ≈ 0.80; threshold 0.90), run at build time over **every registered
  asset**. `rank-art-alpha.test.mjs`. *(A simple corner probe is also fooled — a clean badge's base can
  reach its bbox corners; fill-ratio measures the whole opaque region.)*
- **Sex (do NOT reopen §7):** `established` has `-m`/`-f` variants, **both alpha-clean**. The
  sex-`unspecified` athlete is served **`established-m`** — applying the existing §7 neutral→served-male
  precedent (a documented served placeholder, not a guess). Because both variants are clean, this
  **swaps trivially** the moment a real neutral decision lands — no asset work, one line in `badgeKey`.
- **Guarantee:** the retired black box is structurally unreachable — boxed/missing families are absent
  from the registry (vector fallback), and the build fails if any registered asset is a matte.
- **Forward decision (log, not a blocker):** this makes the Legacy hero render *raster* badge art while
  the **Home medallion + rank-up ceremony still render the vector `RankSeal`** for the same rank. Source
  consistency is intact (all read `PLACEHOLDER_RANK`), so it is NOT the phantom-count class — it is a
  representation *divergence across surfaces*, and defensible today (Home's rank is a faint @0.42
  watermark by design; Legacy's is the prominent hero badge). When a real rank backend lands, make a
  **conscious call**: does clean badge art propagate to Home/ceremony, or do those stay vector-watermark
  by design? Decide it deliberately — don't let it drift silently.

## 19. Home hero rank medallion removed — INTENTIONAL-TEMPORARY (not a fidelity regression)
- **What:** The Home hero's top-right rank medallion (the faint vector `RankSeal` watermark @0.42
  opacity) is **removed** — `ChapterTitleBlock` gained a `showRankMedallion` flag (default true) and
  Home passes `false`. **Product decision:** it was a placeholder; the user will supply **cycling
  artwork** later. A future visual audit should read the empty top-right as *deliberate*, NOT a miss
  vs `Forge Home.dc.html`.
- **Scope:** Home only. **Legacy's hero seal is untouched** — it's a separate component
  (`legacy.tsx` ProgressBadge, the real Established badge art from §18), not `ChapterTitleBlock`.
  Confirmed still rendering after the change.
- **Clean removal:** the medallion was `position:absolute` (a watermark behind the title), so the
  chapter title / week-day / principle keep their exact layout — nothing reflows, and the whole
  medallion (incl. the fallback ring) is gated off, so **no empty ring or placeholder box remains**.
- **Reversal:** trivial — set `showRankMedallion` back to true (or wire the cycling artwork into the
  medallion slot). `PLACEHOLDER_RANK` import dropped from Home; ChapterTitleBlock keeps the medallion
  machinery behind the flag.
- **Commit:** `chore(home): remove placeholder rank medallion pending cycling artwork`.

## 20. Icon system — Forged DNA sweep (DONE) + path-swaps deferred

- **What (DONE, commit `3799751`):** every stroke-based ICON glyph app-wide conformed to the Symbol
  Library's Forged DNA (`forge-symbols.js`): **stroke-width 2, square linecaps, miter joins, miterlimit
  8** — the carved-from-steel language `NavIcons` already followed. 16 files, 58 glyphs. **Paths
  byte-identical** (diff-proven; only stroke attrs changed); decorative/structural strokes (rank/seal
  rings, hairlines, progress arcs — all `sw≤1.4`) untouched via element-level stroke-width gating; the
  two object-spread DNA glyphs (`SourceGlyph`, `KindGlyph`) conformed too.
- **Ruling (a)+(b):** adopt the DNA app-wide (round/lighter was per-file drift, not deliberate softening);
  DNA-conform the chrome glyphs in place. Community (shelved, §13) excluded — conform when it un-shelves.
- **Follow-ups (tracked, NOT done):**
  1. **Canonical-path swaps** for the ~30 divergent ICON-MATCH glyphs (hand-rolled shape → the library's
     actual art). Its own pass — the library-id ambiguities (people-count `friend`/`squad`, doc→`notes`,
     shield-with-check, star-vs-`spark`, globe/`explore`) live here.
  2. **Swords-drawn-as-trophy = BUG — FIXED (commit `83068cf`)** for the 2 LIVE glyphs: `SwordsGlyph`
     (PostContent + athlete) swapped from a trophy-chalice path to the canonical `swords`/"Challenge"
     path (byte-identical to QuickActionsRow's, already correct). The SSoT id was unambiguous, so fixed
     standalone rather than waiting on the path-swap pass. Community `SwordsIcon` still trophy — conforms
     with the §13 un-shelve pass (community excluded from this work).
  3. **Author chrome glyphs into `forge-symbols.js`** (comment/bookmark/overflow/chevron/play/check/plus/
     star) — a real design action; DNA-conformant hand-rolled versions stand in meanwhile.
  4. **Community glyphs** — DNA-conform `src/deferred/community.tsx` when the surface un-shelves (§13).

---

## 21. Legacy + Profile read from Supabase — live spine, one marked transitional half (Phase 2, DONE)

The Legacy hub, the Public Athlete Profile (self), and every AppBar avatar now read **live from Supabase**
instead of the fixtures. The presentation components are byte-for-byte unchanged — only the data source
swapped, through one reusable hook (`src/lib/useQuery.ts` → `{ data, loading, error, refetch }`).

**Live (spine):** rank · My Standard · active + sealed chapters · timeline · **featured moment** (derived
from the most-recent `CHAPTER_SEALED` timeline event + that chapter's reflection, not hardcoded) · the
signed-in identity (`useProfile`) · the self public-profile view.

**The transitional half — the ONLY parts still on the fixture** (their tables are designed in
`supabase/design/0002_full_model.sql` but NOT applied; spine-only through Phase 3). Kept in ONE
clearly-named source so it's never ambiguous which half is real:
- `src/data/legacy-fixture-pending.ts` → `LEGACY_FIXTURE_PENDING` (photos · accomplishments · honors +
  their counts) and `CHAPTER_GOALS_PENDING` (chapter goals, keyed by name — the goals table isn't
  applied; the chapters themselves are live). Every field carries a `// FIXTURE until <table> lands`
  boundary comment.
- When a table lands, delete its entry there and read it live. Nothing else on the screen is fixture.

**Render-proof (data-equivalence, not pixels):** `supabase/seed/render-proof.mjs` runs the live spine
query through the same mapping the app uses and diffs every *rendered* value against the fixture.
Result: **18/19 rendered values byte-match; 0 unexpected diffs.** The single diff is **sanctioned and
was pre-approved** — `dayCount` is now live-derived (days since the active chapter's start = 101) vs the
fixture's stale hardcode (85); it cannot match without changing the "Began Apr 6, 2026" label, so the
fixture value was simply wrong. The seed (`supabase/seed/seed.mjs`) was tightened to mirror the fixture
exactly elsewhere (active-chapter counts; two sealed end dates chosen so the computed compact spans equal
the fixture's 110d/71d). `fetchPublicProfile` was corrected to `@`-prefix the handle (fixture parity).

Verified: tsc 0 · eslint 0 · 183 tests · `expo export` 19 routes (SSR-safe — the Supabase client is
guarded for Node static render; `ProfileProvider`/`useQuery` run clean at render time).

---

## 22. Log a workout → real write (Phase 3, DONE — the first mutation)

"Finish Workout" is now a real write, not an inert session-end. One logged session becomes, via
`src/domain/training/log-workout.ts`: `workouts`(state `saved`) → `workout_exercises` → performed
`workout_sets` → **derived load PRs** (vs the athlete's current max) → an **`ACCOMPLISHMENT` timeline
row per PR** → the active chapter's `workout_count` +1. Sequential-with-cleanup (no client transaction),
so a mid-write failure deletes the parent (cascades children) and any PR/timeline rows — never a partial.

**The reusable WRITE pattern** — `src/lib/useMutation.ts` (`{ mutate, pending, error, reset }`, the
mutation counterpart to `useQuery`): pending tracking, error capture (never throws to the caller),
double-submit guard, and caller-owned optimistic/rollback via `onSuccess`/`onError`. Every later write
screen reuses it.

**Honest scope (forced by the data):** the program prescribes only sets×reps — **no load** — so an
honest load PR *requires* the athlete's real entered weight; there's nothing to fabricate one from. The
full active-workout flow (W-9–W-16) isn't locked, so the Finish screen is a lean **top-set-per-lift**
logger (weight × reps, blank = skip), not a full per-set UI and not prescribed-as-performed.

⚠ **INTERIM surface — the one genuinely-new front end in this phase.** It is built on the forged design
system (`ScreenBackground` · `AppBar` · `Card` · `Button` · foundation tokens; forged inputs with a
bronze focus accent; a hero `Card` PR confirmation) — a deliberate lean flow, NOT a bare form. But it is
scaffolding to enable a real write today, **not** the designed W-9–W-16 logging UI, which is still owed
to spec. Replace it when that surface locks. Optimistic:
Finish flips to the confirmation immediately and rolls back to editing if the write fails; the session
ends only after a confirmed write. Legacy refetches on focus (keeping current data on screen — no
spinner flash) so a new PR shows on return.

**The timeline mapping is deliberate:** `flm_event_type` has no per-workout value — the timeline is
milestone-based — so a logged workout surfaces there through its **PR → ACCOMPLISHMENT**, not a
raw-workout row. A non-PR workout still persists and counts, it just isn't a timeline milestone.

**Proven live (data round-trip, not pixels):**
- `supabase/seed/log-roundtrip.mjs` — logs Back Squat 325 (beats seeded 315 → PR) + Deadlift 395 (below
  405 → correctly NO PR); asserts rows persist, PR derives, the ACCOMPLISHMENT is the **top** timeline
  entry `fetchLegacyData` reads, `workout_count` 47→48; cleans back to the seeded baseline. **PASS.**
- `supabase/seed/rls-write-check.mjs` — every foreign-`athlete_id` insert (workout/PR/timeline) rejected
  by `with check (athlete_id = auth.uid())` with Postgres `42501`. **PASS.**

Verified: tsc 0 · eslint 0 · 183 tests · `expo export` 19 routes (SSR-safe).

**Deferred to a Phase 3 follow-up (flagged, not silent):** Storage media wiring (avatar + workout/PR
images) and the demo-persona swap (Ada Ridge → real subject, once media lands — logged in `seed.mjs`).
Neither is on the write path; this gate is the log→persist→timeline loop.

---

## 23. Avatar from Storage + real persona (Phase 3 follow-up — built, migration-gated)

The athlete's real photo now renders from Supabase Storage instead of initials, across the face
surfaces: Home/Legacy AppBars, Friends, the Athlete profile hero, and the **Legacy hero portrait**
(`SealPortrait` shows the photo inside the seal ring; initials remain the fallback). The `Avatar`
composite already supported `src`, so each is a clean drop-in; `avatarUrl` threads through
`fetchSelfProfile`/`fetchPublicProfile` → `UserProfile`/`PublicProfileView`.

- **`0003_avatar.sql`** — a one-line spine migration adding `profiles.avatar_url` (public URL; the image
  lives in the public `avatars` bucket from Phase 1). **Migration-gated:** the profile fetch now selects
  `avatar_url`, so this must be applied (SQL editor, like Phase 1) before the live reads work — the
  feature commit is held until it's applied + reseeded + verified.
- **Persona swap is a mechanism, not a hardcode** — `seed.mjs` takes `SB_NAME`/`SB_HANDLE`/`SB_AVATAR_URL`/
  etc. as env overrides (default = the Ada fixture), so the real subject drops in at reseed without
  hardcoding anyone's identity. `upload-avatar.mjs` uploads an image to the `avatars` bucket and sets
  `avatar_url` in one command.

**Deferred (flagged, not silent):** the Squads roster self-avatar stays on initials (wiring it means
threading a prop through the shared `SquadCard` — not worth it for a small stacked avatar); and the
**PR media (the 485 deadlift video)** is its own fast-follow — it needs the schema-only `media_assets`
table (or a PR media column) + a video-display surface + the file. PO ruled: avatar + persona first.

---

## 24. Pinned Legacy — real pins + the 485 deadlift video (Phase 3 follow-up, DONE)

The "My Museum · Pinned Legacy" strip renders **real pins from the spine** — starting with the athlete's
actual **485 lb Deadlift video**. This is the design's home for a record lift (the coach tip names exactly
that); an earlier proposal for a new "Featured Record" band was **rejected by the PO as fabricated UI** —
the Pinned strip already exists in `Forge Legacy.dc.html` with a native `isVideo` affordance. The
`PinnedCard` is built faithfully to that `.dc` (150×196, top+bottom scrim, the play button, `kind` chip,
`title`) — not restyled. Tapping a video pin opens a fullscreen player.

- `0005_pins.sql` — a `pins` table (kind/title/media_url/poster_url/is_video/position) + owner RLS
- `0006_storage_media.sql` — the public `media` bucket + owner-write policies (forces `public=true` even
  if a private `media` bucket pre-existed from Phase 1's dashboard step — the bug we hit)
- `PinnedCard` + fullscreen `pin-video` route via **`expo-video` ~56.1.4** (Expo Go-compatible; a custom
  dev build needs one rebuild); `fetchLegacyData` reads pins; `seed-media.mjs` uploads clip + poster and
  upserts the pin; Deadlift PR bumped to **485**
- `avatar_url` is now owned solely by `upload-avatar.mjs` and pin media by `seed-media.mjs`, so a spine
  reseed never wipes the photo or the pin
- **Pinned is now REAL, superseding §21's "pinned transitional"** — the only remaining fixture-pending
  Legacy sections are photos · accomplishments · honors · chapter goals

**Proven live:** render-proof **20/20 match** (incl. `pinned[0] = 485 lb Deadlift · video`) + 1 sanctioned
(`dayCount`) + 0 unexpected · round-trip PASS · RLS-write PASS · clip + poster public URLs return 200.
tsc 0 · eslint 0 · `expo export` SSR-safe.

The pin-curation sheet (L-13) stays inert (the "Pin an item" add-tile) — only the pins table + the real
video pin need to exist for the demo.

---

## 25. Login + Onboarding on real Supabase auth (Gate A + Gate B, DONE)

The bare stand-in sign-in is replaced by the real first-time journey, implemented against Supabase auth.
Enumerated against `Forge Onboarding.dc.html` + the O-1 / Onboarding-First-Time-Journey architecture,
two-gate split, PO-ruled at each gate.

**Gate A — auth boundary (`44101bb`).** `routeFor` pure boot router (unit-tested): no session → auth ·
session+not-onboarded → onboarding · session+onboarded → app. `signUp` + `resetPassword` added;
`profiles.onboarded_at` + `environment` (`0007`); seed marks the demo user onboarded.

**Gate B — the flow.** The design `.dc`'s 9 setup screens + the grafted email/password auth (the `.dc`
has no real auth; O-1 supplies it): Welcome → Create Account → Sign In → Account → Username → Goals →
Experience → Equipment → Schedule → Program → Transition. Answers accumulate in local state (ONB-D2,
orchestration-only); nothing persists until "Enter Forge".

- **Atomic finish** — `complete_onboarding` RPC (`0008`): derive athlete_type (ONB-D8 map) + environment,
  then profile update + Chapter I "Building Your Foundation" (ONB-D14) + `onboarded_at`, ALL-OR-NOTHING
  in one plpgsql transaction. Avatar upload stays outside (storage, orphan-harmless).
- **Username** skippable → `handle` nullable (`0009`, Identity-Amendment-001); real Supabase uniqueness query.
- **Recommendation** maps to the real 2-program catalog, SF I fallback (PO ruling).
- **H-1** minimal awaiting-first-workout hero for a fresh athlete (0-workout active chapter) — never a
  blank/stale Home. Full ONB-D17 hero is a fast-follow.

**Proven live** (`onboarding-roundtrip.mjs`): (A) RPC rollback — force the Chapter I insert to fail →
profile update + `onboarded_at` both roll back (atomic). (B) real-email signup → session → onboarded null
→ onboarding → finish RPC → profile + Chapter I + onboarded_at → app → H-1 awaiting. Both green;
Confirm-email confirmed OFF (soft verification, O-1 Decision 4). tsc 0 · eslint 0 · 191 tests · SSR-safe.

**Deferred (scoped out, flagged):** Forgot-Password screen (function exists), onboarding photo picker
(optional → initials), full ONB-D17 hero, program enrollment (no `program_instances`), Part III ceremony
(D18) / First Honor (D19) / Part IV progressive discovery / Apple-Google social.

**Setting of record:** Supabase Auth → "Confirm email" OFF (required for soft-verification signup).

---

## 26. W-9 Active Workout — real logging → atomic finish → timeline (DONE)

The interim top-set scaffold is replaced by the real W-9 inline logger, enumerated against the LOCKED
spec (`W9-A1..A3`) + `Forge Active Workout.dc.html`. Where spec and design diverged, PO-ruled:
set entry = **design** inline table (Set/Target/Weight/Actual, tap-✓); rest timer = **spec** count-UP
(W9-A3, deferred, default-OFF-sticky when it lands); in-flow PR = **spec** none (all at finish); canonical
completion = the minimal W-17 now, the 4-stage Seal/Record/Reflect/Share later (the inline ceremony modal
is a dead end — never build toward it).

- **Local-first (spec §13):** the session lives in AsyncStorage, autosaved every change → crash/kill →
  Resume prompt. Cloud only ever sees the committed workout.
- **Atomic finish** — `save_workout` RPC (`0010`): workout + exercises + done-sets + PRs + timeline
  (ACCOMPLISHMENT per PR) + chapter `workout_count` bump, all-or-nothing (function only, no table DDL —
  the spine already fit: `section` exists, **no RPE / no per-set notes** in either source).
- **Domain-side** (unit-tested): Epley e1RM, volume, PR detection; session seeded from the real program
  prescription. PR/celebration belong to finish (W-17), not the flow (ONB-D22-consistent).
- **Minimal W-17:** volume/sets/time + New Records → "Save to Legacy".

**Proven** (`workout-roundtrip.mjs`): (A) atomic rollback — malformed PR fails mid-commit → nothing
persists, chapter unchanged; (B) headline — a FRESH athlete logs → 3 sets persist → PR derived → a real
Legacy-timeline ACCOMPLISHMENT is the top entry → chapter `workout_count` 0→1 (Home flips OFF "awaiting
first workout"). tsc 0 · eslint 0 · 196 tests · SSR-safe.

**Soft spot (on the record):** resume is asserted **client-local** (AsyncStorage eyeball), not in the
suite — the one criterion of five not machine-proven. Re-verify resume by hand whenever W-10..W-16 or the
rest timer touch the session model.

**Removed here** (superseded, zero importers): the Phase-3 interim `logWorkout` (`log-workout.ts`) +
`useMutation` — this cut is their replacement, so they retire in the same commit.

**Deferred (ruled):** W-10..W-16 modalities · rest timer · substitution/add-exercise · hero media/How-To ·
4-stage completion · partner/playlist/media/reflection.

---

## 27. W-17 Workout Complete — 4-stage ceremony on committed data (minimal-real, DONE)

W-9 Finish now hands off to a real W-17 completion (replacing the inline stub), canonical per the PO
ruling (the standalone Seal/Record/Reflect/Share — the inline ceremony modal is a dead end, never built).

**The seam — ruled (b):** the atomic commit stays at W-9 Finish; the workout is durable the instant
logging ends. W-17 is a SEPARATE route (`workout-complete?id=…`, `router.replace` — active screen off the
stack) that RE-FETCHES the committed workout (real render on committed data). The Reflect note is the one
post-commit write — an optional single-row owner-scoped UPDATE (`0011` `workouts.reflection`, nullable,
distinct from `chapters.reflection`; no RPC). Data durability > ceremony atomicity: abandoning the
ceremony never costs logged effort.

- **Stage 1 Seal** — seal medallion + volume/duration + a minimal real PR callout (or a forged quote);
  press-&-hold to seal → Legacy.
- **Stage 2 Record** — total volume + per-exercise top set + PR badge (real).
- **Stage 3 Reflect** — "a note for future you" → persists to `workouts.reflection` on "Seal the Note"
  (Skip → null).
- **Stage 4 Share** — shareable card → RN `Share`.

**Design consequence (flagged, not a bug):** Reflect sits on the secondary path (Seal→hold→home is
primary), so most workouts intentionally carry a null reflection — fine for the nullable model, worth
knowing when something later wants to surface reflections.

**Deferred (ruled — don't fake):** honor hero moment (needs Honor Evaluation Service) · "How You Improved"
deltas + resurfaced memory (need set-history + past reflections) · first-run onboarding ceremony variant
(ONB-D18 — lights up on this foundation later) · Chapter-comes-alive animation fidelity.

**Proven** (`workout-complete-roundtrip.mjs`): render-from-DB (volume/duration/PR) · reflection post-commit
(null-on-skip → persists) · seam durability (all committed at Finish, before any W-17 interaction) ·
post-commit invariant · off-awaiting. tsc 0 · eslint 0 · 196 tests · SSR-safe. Ceremony transitions
(seal→home, see-details→reflect) are client-local — eyeball, like resume.

---

## 28. First-run ceremony — Chapter comes alive on Workout #1 (ONB-D18 minimal-real, DONE)

Cashes in the payoff W-17 unblocked: a brand-new athlete's FIRST logged workout plays a distinct
"Chapter comes alive" reveal instead of the generic seal — closing the **payoff half of onboarding Part
III** (the arc peaks at Workout #1). No screen, no migration — a variant on the W-17 Seal stage.

**Detection seam (ruled — id-scoped, not the counter):** `isFirstWorkout` = *this workout is the earliest
saved workout in its chapter* (`fetchCompletion`: `order by saved_at, created_at limit 1` → id match).
Because the completion route is `?id=…` + re-fetches, the predicate is **stable forever** — re-opening
workout #1 after ten more workouts still reads first-run. Never a `workout_count` snapshot. No `chapter_id`
→ false; ties by `created_at`.

**The reveal (minimal-real):** the Seal stage swaps to the **real chapter name** as an animated hero
(restrained bronze fade/scale-in) with **arrival** copy — "Your Chapter begins" / "The first page is
written." Authored (not spec-quoted), deliberately **no reward/rank/honor/streak language** — it's the
chapter arriving, not an achievement citation (honest against D22; leaves the First-Honor check for D19).
Volume/duration + hold-to-seal remain. Workout #2+ = the generic seal, unchanged.

**Deferred (ruled):** the full D18 multi-beat cinematic (title-rises → name → date → Workout-#1 → bring-to-
life) · **First Honor (ONB-D19)** — gated on the Honor Evaluation Service, don't fake it.

**Proven** (`workout-firstrun-roundtrip.mjs`): #1 → reveal · #2 → generic · **re-open #1 after #2 → still
reveal** (id-scoped) · real chapter name · no progression fabricated (timeline holds only real PR
accomplishments — no honor/rank/streak). tsc 0 · eslint 0 · 196 tests · SSR-safe. The animation itself is
client-local (eyeball) — the 3rd such beat, walked by hand alongside resume + the W-17 transitions.

---

## 29. Honor Evaluation Service — minimal slice (D19 + real Legacy honors, DONE)

One system lights up three deferred surfaces: **D19 First Honor**, the **W-17 honor hero**, and **Legacy's
Honors section** (retires `LEGACY_FIXTURE_PENDING.honors`). Delivers the "Earn Recognition" promise.
Scope-disciplined: three count-honors off committed data only, NOT the 82-type pillar.

**The slice (exact predicates, committed data only):**
- `first_workout_logged` (one-time) — `count(workouts) ≥ 1`. **= D19** — fires on workout #1, inside the
  first-run reveal (D18 + D19 together).
- `workouts_in_chapter_10` (repeatable/chapter) — a chapter's `workout_count ≥ 10`.
- `workouts_logged_25` (one-time) — `count(workouts) ≥ 25`.
- **No "first PR" honor** — the catalog has none (its strength honors are absolute thresholds needing
  canonical-exercise mapping + unit); inventing one needs a formal amendment, not a build decision. Held.

**Idempotency — DB-enforced (headline invariant):** the natural key IS the idempotency key, via TWO
partial unique indexes (`WHERE chapter_id IS NULL` / `WHERE chapter_id IS NOT NULL`) — a single 3-col
index would let one-time honors dupe (Postgres NULL distinctness). `evaluate_honors` inserts
`ON CONFLICT DO NOTHING`. Re-run → no second row.

**Seam — inside the atomic commit** (`save_workout` calls `evaluate_honors`): honors commit with the
workout (derived progression, like PRs). Doctrine set: *derived progression inside the atomic commit;
user annotations (reflection) after.* Idempotent `ON CONFLICT` gives the spec's retry-safety without a
worker. **Divergence flagged:** the LOCKED spec (ES-6) stages workout-commit from honor-eval; the minimal
slice collapses them. Consequence proven: a malformed commit rolls back the workout AND its honors.

**Surfacing:** honors earned in a commit share the workout's `saved_at` → `fetchCompletion` matches
`awarded_at = saved_at` (id-scoped, re-open-stable) → the **W-17 honor hero**. Legacy reads
`honor_instances` (fixture retired). Retroactive seed eval uses `source='import'` (silent, no timeline
events) so Isa's demo timeline is untouched.

**Honest artifact (flagged):** Isa's historical chapters carry counts but no workout rows, so her
account-level honors don't fire — only the 4 chapter-depth ones. Sparse, not broken; the fresh user is the
clean headline. Don't backfill speculatively.

**Proven** (`honor-roundtrip.mjs`): rollback-covers-honors · D19 headline · no-fabrication · W-17 hero
(awarded_at=saved_at) · DB idempotency (re-run → no dup) · repeatable-per-chapter (distinct chapter_id) ·
Legacy-from-DB. tsc 0 · eslint 0 · 196 tests · SSR-safe.

**⚠ OPEN — consolidation re-walk NOT done (named, not faked):** the four client-local ceremony beats
(resume · the two W-17 transitions · the first-run reveal) **plus** the new honor hero need a hands-on
Expo runtime, which is unavailable in this build/design environment. Landed as **`[ceremony re-walk
pending]`** — a named open acceptance item, not folded in as passed. Whoever has the running app walks:
resume-after-kill · seal→hold→Legacy · see-details→Record→Reflect · fresh #1 reveal + honor hero /
#2 generic / re-open #1 still reveal · Legacy Honors reads real. Closes when walked; fix any broken beat
before marking done. This is the consolidation pass deferred since D18 — four independent silent-regression
risks, now five with the honor hero.

**Deferred (ruled):** `bench_milestone_1` + all threshold/social/duration honors · full catalog · M-2
modal fidelity · the honor→timeline for retroactive (kept silent).

---

## Still open (carry into implementation)

**Three buckets, and the distinction is load-bearing** — don't let a fixable miss (or a merely
not-yet-authored one) sit in the blocked pile:
- **DROPPED-FREE** — the means are in hand (asset on disk, token/gradient available); it just wasn't
  wired. Fixed by CATEGORY across all screens in one pass — never screen-by-screen whack.
- **AUTHORABLE** — not blocked; just not-yet-authored, exactly like Competition was (squad-scoped
  getter + placeholder data + firewall golden). Buildable now; **derive from existing sources, don't
  re-author** (a mission's "3/5" derives from the check-in count).
- **DEFERRED-HONEST / BLOCKED** — waits on a genuine external: an asset that does not exist, a
  backend, or another domain. Cannot be closed now without fabricating.

### ▸ DROPPED-FREE — fixable now (means in hand)
- **Design base backgrounds** — ✅ **DONE (§16)** — base artwork wired via `ScreenBackground` across
  every screen, then the **background sub-pass DONE (commit `f5915e9`):** per-screen overlay opacities +
  Squad Detail's two frame radials + a Friends apex radial + Friends photo→atmospheric + Legacy
  scrim-fade/parallax/portrait-scale. Two follow-ups remain (Squad Detail literal top-band split ·
  native-pass Legacy live-scroll check) — see §16.
- **Rank seal per-family COLOR (§17/§18)** — **RESOLVED, and the DROPPED-FREE framing was a FALSE
  PREMISE.** The design sources exactly ONE non-bronze family seal — **legend/hall = gold** (badge chrome:
  diamonds `#D6AA5A`, rim `#F4DCA6→#9A7038`, text `#E4C489`/`#B98F4D`) — now built into the vector
  `RankSeal` via a `family→accent` map (ruling A, commit `1a7fcc1`). Every other family is **bronze BY
  SPEC** (`Forge Rank Seal.dc`: "held inside a machined bronze seal"; only *tier-warmth* varies, already
  built) — **not a gap.** The imagined rich 7-family palette is **NOT sourced anywhere portable**: the
  vector seal is monolithic bronze, the per-family raster art is alpha-flattened (mostly black boxes,
  §18), and the Accent Palettes is a **global user theme** (`forge-theme.js`), *not* a per-rank scheme.
  → **DEFERRED-until-authored** for the other six families (a distinct per-family palette is a design
  authoring decision, not a port; mapping to the accent triples would be fabrication — rejected, ruling C).
  *(Optional, derived-not-guess: established/legacy could be **sampled** from their clean raster if those
  vector seals ever surface on a visible site — low payoff today (ceremony + the removed Home medallion).
  Ruling B, held.)*
- **Squad-local cosmetics (held, genuinely cosmetic)** — #3 AppBar empty-title · #12 "Hall of Champions"
  rename — a per-screen cosmetics pass, not now. *(#2 frame radials moved up into the background sub-pass —
  it's source-specified, not cosmetic.)*

### ▸ AUTHORABLE — buildable now (author squad-scoped placeholder + golden; derive, don't re-author)
Surfaced by the Squad Detail catalog; the same shape as the shipped Competition, so **not blocked**:
- **Squad Goal** — title + progress + count (Competition's shape) via a squad-scoped getter + golden.
- **Squad Mission** — week + title + progress; **derive** the count from the check-in/member source
  (the "3/5" relates to "3 trained today") — single source, not a re-authored number.
- **Our Squad stats** — the analytics tiles; several derive from the member source (count, trained-today).
- **Squad Honors (data)** — which honors the squad holds is authorable; only the honor **artwork** is
  blocked (below) — split them, don't lump.

### ▸ DEFERRED-HONEST / BLOCKED — waits on an external
- **Neutral artwork set** (§7) — code FIXED + tested; blocked on Phase-4 neutral assets (don't exist).
- **Squad honor artwork** + **check-in video** — genuinely blocked assets (the honor *data* and the
  check-in *summary* are authorable — see above; only the art/video wait on production).
- **Profile-photo system** — no per-athlete photo store; the `Avatar` `src` slot is everywhere and
  the Legacy hero (§15) uses it correctly, but real photos need the upload/storage backend AND photos
  that don't yet exist. **One system, not per-screen.**
- **Squad crest** — owner-uploaded squad image (distinct from personal photos); needs owner-only
  upload infra + content (`CrestGlyph` placeholder today; "Edit Identity · crest" is an inert shell).
- **Per-kind ranking direction** (§11) — waits on the ranking/leaderboard domain (never retrofitted
  onto the display strings).
- **Public Athlete Profile — Path 2** (§14) — waits on an authored per-athlete dataset + the
  visibility/Firewall clearance model.
- **Squad Record History sheet** — per-holder PR **timeline** + **"beat this record"** write path
  (no backend; read-only by design today).

### ▸ Housekeeping / infra
- **Return `media` to a private bucket + signed/RLS-gated URLs before multi-user.** `0006` flipped the
  `media` bucket to `public=true` to serve the pin clip — but Phase 1's design had media PRIVATE
  (visibility-gated). Public means a "private" pin's video is reachable by anyone with the URL, bypassing
  the visibility firewall. So today **media is NOT governed by the firewall** — the one honest asterisk on
  "the firewall is enforced." Fine for a single-user demo with the owner's own lift; **must be closed
  before real users** (private bucket + `createSignedUrl` / RLS-scoped access, so visibility governs media
  too). `avatars` staying public is fine (public identity); `media` is not.
- **Wire a real migration runner before a second environment (staging/prod).** The Supabase migrations
  (`0001`–`0004`) are applied BY HAND via the SQL editor; the repo files are the source of record but
  nothing enforces they've been run. Fine at one environment — the moment there's a second DB,
  hand-applied migrations drift. Put the runner in place *before* that, not after something's out of sync.
- Populate the structured fields across **all** programs/workouts (§6).
- Build the real **asset manifest** (version/aspect/placement); swap prototype crops for high-res masters.
- Implement the resolver **unit-test matrix** (resolver doc §16).
- Reconcile / annotate the blueprint docs so no one treats the superseded sections as current.
