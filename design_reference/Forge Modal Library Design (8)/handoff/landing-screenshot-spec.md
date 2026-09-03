# Landing page screenshots — capture spec

Every phone screen on the landing page must come from a **clean test account**. This is a
page-wide constraint, decided 2026-08-16: no identifiable faces anywhere, and no personal
free-text that reads as an in-joke beside marketing copy.

## Status

| Slot | Section | State |
|---|---|---|
| — | 1 · hero | **Built as a mockup**, not a capture. A dummy-account Legacy hub rendered in HTML from the line-by-line spec, auto-scrolling all nine sections. Initials portrait, no photo tiles. Superseded `legacy-identity.jpg` — real faces in the avatar and both pinned tiles, plus a personal "My Standard" line. |
| — | 5 · squads | **Built as a mockup**, not a capture. The S-2 *active squad* screen — hero, current goal, active competition, hall, records, check-ins, and the ledger feed — auto-scrolling. Initials-disc avatars only. Superseded `squads.jpg` — squad named "Da Bois", real member faces. |
| — | 8 · the engine | **Built as a mockup.** The Active Workout screen, animating one set of bench press being logged on a 6s loop. `active-workout-2x.jpg` is no longer referenced by the page; `bench-demo-frame.jpg` is cropped out of it. |

The superseded files stay on disk for reference; no page references them.

## The three mocked screens

All three phones on the page are **mockups built in HTML from the screens' line-by-line specs**,
using a dummy account. None is a capture, and none shows a real person.

### Hero · Legacy hub

All nine sections in spec order, auto-scrolling over 44s and easing back:

| Section | What it shows |
|---|---|
| Hero | Initials portrait in the decorative seal (two concentric circles + a 45°-rotated square), name, `Foundation · II` rank label with its bronze diamond, the fixed subtitle, and the Progress badge |
| My Standard | "I do what I said I would do." |
| Current Chapter | Chapter I — Building Your Foundation, active, primary goal "Squat 315 for five" at 285 lb, 64% bar, Day 61 |
| Pinned Legacy | Two pin cards (chapter, record) with their kind chips and glyph medallions, terminated by the dashed "Pin an item" tile |
| Featured Moment | The derived CHAPTER_SEALED entry plus that chapter's reflection |
| My Story | Newest sealed chapter as the full card, the older one as a compact row |
| Timeline | Three newest entries plus "View all" |
| What Endures | Transformation / Photos / Trophy Case tiles |
| Accomplishments · Honors | Two accomplishment cards; six honor medallions of nine earned |
| Closing | The hairline–diamond–hairline rule and "Memories can be added. History cannot be rewritten." |

**Both mocks use the project's real artwork, not stand-in glyphs.** The rank badge is
`assets/landing/badge-foundation.webp` — the same file § 6's rank ladder renders, so the
Foundation insignia looks identical in both places. The honors strip uses six of the eight real
artworks in `assets/artwork/honors/` (strength, consistency, endurance, milestones, completion,
community) at full opacity; an opacity ladder was rejected because fading honors reads as
"these count less", which contradicts the page's claim that honors are permanent.

**The Progress badge label** is set at a size that cannot wrap or ellipsise; the spec records
that word taking three attempts because the squeeze arrives from the flex row outside it.

### § 5 · The active squad (S-2)

Replaced the Squads *hub* on 2026-08-16. The hub is an index of containers — four cards saying
a squad exists. The active squad is where a visitor sees people doing things, which is what they
are actually deciding about.

**The risk this section runs, and why the screen answers it.** § 5's argument is that the rest of
the category offers either a public feed or a punishing group, so showing anything feed-shaped
invites the wrong pattern-match. The S-2 feed is not feed-shaped: per its own spec the post cards
were deliberately stripped back to hairline-separated **ledger rows** (`feedList` carries
`gap: 0` so each row's own foot hairline is the only separator — a gap on top of it "would put a
gutter between rows and the ledger would read as cards again"), the bronze icon column was
removed, and the scroll terminates in an `EndOfLedger` mark rather than an infinite feed. A
ledger is the opposite of a feed, and showing it makes the argument instead of asserting it.

Iron Vigil's data continues from `Squads Hub.dc.html` — swords crest, 5 members, 3 training
today, "Hold the line, every dawn."

Sections in scroll order, with the spec details that earn their place:

| Section | What it shows |
|---|---|
| Hero | 92pt crest with its bronze ring and glow, the name at 34pt uppercase display with the heavy text shadow it needs over artwork, the motto, then the meta row — member count underlined as a link into the roster, the trained-today readout with a **green** dot rather than bronze, since it is a readout and not an action |
| Current Goal | "Reach 500 workouts", the metallic bronze fill at 62%, "312 / 500 workouts" and "19 days left". The pencil sits beside the section label so editing stays distinct from opening the goal |
| Active Competition | Swords emblem, "Week 3 of 4", two stat columns each with a left hairline (rank 3 of 8, 14 workouts), and a **positive-framed** footer — "3 workouts to catch second", never a deficit |
| Hall of Champions | Metallic bronze crest behind a near-black crown, "3 titles · founded 2026" |
| Squad Records | The unconditional row; content, not administration |
| Check-ins | "Video · disappears in 24h", the dashed check-in tile, then discs — bronze ring with a glow when unwatched, charcoal ring with the avatar at 45% once seen, play badge notched bottom-right |
| Squad Feed | The one filled bronze pill on the screen ("New Post", on its #3D2F1A ground). Then four entries: a PR with its previous best, a shared session with converted stats, a discussion with no attribution line (the body *is* the post), and the generated Weekly Summary, which keeps a card because it is the squad talking rather than a person |
| End | The closing ledger mark |

**No photo posts.** A progress post is the type the spec cares most about — the fix that put a
real image under the attribution line — but every version of it needs a photograph of a person,
which the page-wide no-faces rule rules out. The four entries shown are the types that carry no
photography.

**Squads.** No capture needed — § 5 renders a mocked hub in HTML (decided 2026-08-16, so the
section could show the full depth of the list rather than one static card). What it mocks, and
why each state is there:

| Squad | Crest | Role | Members | Trained | States exercised |
|---|---|---|---|---|---|
| Iron Vigil | swords | owner | 5 | 3 | Favorited (brighter border, bronze glow, 7% top wash), "Your Squad" owner label, filled star, pending-request strip |
| Dawn Patrol | mountain | member | 6 | 6 | "+2" overflow chip (avatars cap at four), fully lit bar |
| The Proving | shield | member | 4 | 0 | Zero-state fraction in grey rather than bronze, all segments unlit |
| Home Forge | flame | member | 1 | 1 | Singular "1 member" |

Each squad draws its own crest from `forge-symbols.js` — the four kinds above are that file's
real paths, not one glyph repeated.

Also drawn: the Favorites / All Squads section headers, the gradient divider that fades at both
ends, the per-member segmented bar, the footer Create-a-Squad button and join-code link, and
the four-tab bar with Squads active.

**Member counts top out at 6**, which is what the canonical data holds and also inside the
range where the segmented bar still reads as a bar — the spec's own finding is that it degrades
past ten and is unusable at the amendment-003 cap of fifty.

**The no-motto state is not shown.** All four canonical squads have mottos, and inventing a
fifth squad to demonstrate the omission would have put fabricated data on the page.

## The capture

- iPhone, 1179×2556 (or any 1179-wide device)
- Scrolled to top, no modals, no toasts, no keyboard
- Crop the iOS status bar — the page frames are set to a 374×766 CSS aspect
- Save as JPEG ~748px wide (2×), quality ~0.86; the page renders them at 374 CSS px

## Dropping them in

Open `Forge Legacy Landing v4.dc.html` and drag each image onto its placeholder — the drop
persists, including on share links and downloads. For the shipped build, save them into
`assets/landing/` and swap each `<image-slot>` back to a plain `<img>` with alt text:

- hero → "The Legacy screen: rank, the athlete's standard, the active chapter with its goal, and pinned accomplishments."
- squads → "The squads screen: two private squads, each showing how many members trained today."

## Do not

- Fabricate any of these screens in HTML. One invented screen beside real ones gets noticed.
- Ship the superseded personal-account shots.
- Add an Apple Watch screen — we don't have that feature, and it is a named strength of a
  competitor.


### § 8 · Active Workout

Animates the one beat the spec names as the most animatable moment: the bronze ring tap, the row
turning green while the fuse races its border, and "Set logged" rising into place. One 6s loop,
every element sharing it so the beats stay in phase.

| Beat | Source timing | How it's built |
|---|---|---|
| Flip to done | instant re-render, "keep it under 120ms" | Row border/fill, set disc, tick, ring swap and ink all cross at 12→13.7% (~100ms) |
| Green fuse | 1200ms easeInOutQuad, opacity holds to 72% then falls, torn down at 1500ms | Two stacked `<rect rx="10">` with `pathLength="100"` — trail #5A9E68 2px offset 100→0, head #8FE6A6 3px `dasharray="10 90"` offset 0→−100. Starts at the top-left corner, per the spec's own note that it used to materialise mid-edge |
| Counter + bar | same frame | Two stacked numerals cross-fade 3→4; the bar animates 18.75%→25% (sets, not exercises) |
| Toast | 180ms in, 1900ms life, no exit animation | `flwToast` — opacity plus an 8px rise |
| Coach line | +200ms, held not toasted, and the coin "hides behind every overlay this screen owns" | "Strong. Next set, go up to 195 lb." — the mid-set nudge, held on the coin |

**The demo loop.** `bench-demo-frame.jpg` is cropped from the real workout screenshot, so the
figure in the 132×172 slot is the shipped `exercise-media/male/barbell-bench-press.webp` render
rather than a drawing. It is a **still**, not the loop — the animated WebP lives in Supabase
storage and isn't in this project. Drop it in if you want the figure pressing while the screen
sequence runs around it, which is what the spec recommends.

**Nav dots** sit between the table and the coach coin: one dot per exercise with a chevron either
side, the current one filled bronze and the rest hollow `#2E2E35`, over "View Plan · 1 / 5". It
carries the one piece of context a landing-page visitor needs — that this is exercise 1 of 5
inside a program. No done or skipped dots appear, since bench press is the first exercise; the
ember `#E0913F` skipped state has no occasion here.

**Constraints the mock respects:**

- **Rest timer shows "Off"** and no rest overlay appears. It is off by default, so a countdown
  would imply behaviour the athlete hasn't enabled.
- **No PR card.** A record needs a prior mark, and this sequence logs 185 × 8 against a standing
  best of 225 × 3.
- **No hero collapse.** That fires once per exercise on the first set resolved; sets 1 and 2 are
  already done here.
- **No exercise seal**, since set 3 of 4 is not the last.
- **Every logged figure is in the display serif** — weight, target, reps, goal, the insight row.
  The sans is only chrome. Per the spec this is "the single most important thing to carry into
  the landing page".
- **The primary button sits left** ("Next Exercise", flex 1.15), deliberately backwards from the
  rest of the app because the athlete reaches for the footer without reading it.
- Em dash on set 4's Actual means "nothing was said" — not zero.


## Icon rendering — the forged DNA

`forge-symbols.js` declares `ICON_ATTRS = { strokeWidth: 2, strokeLinecap: 'square',
strokeLinejoin: 'miter', strokeMiterlimit: 8 }` under the comment "Canonical render attributes —
the forged DNA. Never override per icon." Square caps and mitered joins are the forged
characteristic; round caps soften it.

All 43 glyph attribute runs across the three mocks now carry that DNA. Three deliberate exceptions:

- **The fuse head** in § 8 keeps `stroke-linecap="round"` — the workout spec specifies a round cap
  on the 72px head, and it is a motion element rather than an icon.
- **The wax seal** in § 4 keeps its own weights. It is a bespoke brand mark, and the blueprint
  states brand assets — logo, rank insignia, honor artwork — are explicitly not governed by the
  icon rules.
- **The overflow menu** (⋮) is three filled circles with no stroke, so stroke attributes do not
  apply.

Every symbol that exists in the registry is lifted from it verbatim: `swords`, `mountain`,
`shield`, `flame`, `book`, `medal`, `trophy`, `dumbbell`, `camera`, `scale`, `stopwatch`. Micro-glyphs
with no registry entry — tick, chevron, play, pencil, comment, overflow — are authored, and drawn
with the same DNA.
