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
- **Fidelity status:** base artwork wired ✓ · **per-screen darkening-gradient + overlay treatments
  still open.** Not "none remain."
- **Open — background sub-pass (source-specified `.dc` deltas, NOT cosmetics):** (1) **per-screen
  darkening-gradient opacity** to each `.dc`'s exact stops — Home `rgba(5,5,5,0.15)` · Legacy `0.30` ·
  Squad Detail 3-stop `0.12→0.26→0.38`; this pass uses one shared 3-stop `0.22→0.36→0.55`. (2) **Squad
  Detail frame bronze radial-glows** (catalog #2). (3) the **Legacy scroll-driven mountain-fade** is
  wired (base version) — refine the choreography to the `.dc`. `forge-bg-2` reserved for create/detail
  screens not yet built.
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
  every screen (incl. the Squad Detail #4 hero rebuild + the Legacy mountain-fade). **Still open — a
  background sub-pass (source-specified, NOT cosmetics):** per-screen darkening-gradient opacity to each
  `.dc`'s stops (Home 0.15 · Legacy 0.30 · Squad 0.12→0.26→0.38) · **Squad Detail frame bronze
  radial-glows (catalog #2)** · mountain-fade choreography refinement. See §16.
- **Rank seal per-family COLOR (§17)** — the vector `RankSeal` is DONE, but every family currently
  renders the **Foundation bronze** palette; only the curved arc text differs family-to-family. The
  `Forge Rank Seal.dc` families have **distinct color treatments** (Foundation bronze → … → Legacy).
  A real fidelity gap, **not "done"** — but **DROPPED-FREE**: buildable now with the means in hand
  (a family→palette map fed into the existing gradient stops — the *same shape* as the per-level
  warmth modulation already proven in the seal). No blocker, just unbuilt.
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
- Populate the structured fields across **all** programs/workouts (§6).
- Build the real **asset manifest** (version/aspect/placement); swap prototype crops for high-res masters.
- Implement the resolver **unit-test matrix** (resolver doc §16).
- Reconcile / annotate the blueprint docs so no one treats the superseded sections as current.
