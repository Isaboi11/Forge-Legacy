# Handoff: Cardio Blocks (Run / Walk / Ride) in Programs and Active Workout

## Overview

Forge Legacy programs today contain only strength exercises. This feature adds a **cardio block** — a run, walk, or ride authored into a program day like any other block — and gives it a purpose-built card at training time.

Three surfaces change:

1. **Program Builder → Day Builder** — author a cardio block, set its distance and pace target, choose an outdoor/indoor default.
2. **Active Workout** — the cardio block replaces the exercise GIF hero and the set-logging table with a run card. Outdoor hands off to the full-screen tracker; treadmill never leaves the page.
3. **Active Run** — when launched from inside a workout, it suppresses its own completion ceremony and returns its result to the workout.

The governing principle, which shows up in a dozen small decisions below: **outdoor runs have GPS, treadmill runs have only a clock.** The UI must never draw a route, a map, or an incline history for a treadmill session, and must never claim a distance the app did not measure.

## About the Design Files

The files in this bundle are **design references created in HTML** — working prototypes that show intended look and behavior. They are **not production code to copy directly**.

The task is to **recreate these designs in the target codebase's existing environment** (React Native, React, SwiftUI, Kotlin, etc.) using its established components, navigation, and state patterns. If no environment exists yet, choose the most appropriate framework and implement there.

The prototypes are single-file HTML components with an inline logic class. Treat the markup as a spec for structure and styling, and the logic class as a spec for behavior and data flow — not as source to port line for line.

## Fidelity

**High fidelity.** Every color, size, weight, letter-spacing, radius, border, animation duration, and string below is final and was tuned against the Forge Legacy Visual Foundation. Recreate pixel-accurately using the codebase's existing token layer.

Where a value is written as `var(--fl-*)`, it is a design-system token that already exists in `src/constants/tokens.ts` / `tokens/foundation.css`. Use the token, not the resolved hex. Resolved values are listed in **Design Tokens** at the end for reference only.

---

# 1. Data Model

This is the contract every surface shares. Get this right first.

## 1.1 A cardio block inside a program day

A program day holds three arrays — `warmup`, `main`, `cooldown`. Today each entry is a strength item:

```
{ name, equip, sets, reps }
```

A cardio block is a sibling entry in the same array, discriminated by `kind`:

```
{
  kind: 'cardio',              // absent on strength items
  activity: 'run',             // 'run' | 'walk' | 'bike'
  name: 'Outdoor Run',         // derived, see 2.5 — never typed by the author
  equip: 'Road',               // 'Road' | 'Treadmill' | 'Trainer' — derived alongside name
  modality: 'outdoor',         // 'outdoor' | 'indoor'  (author's default)
  targetMi: 3,                 // number | null   — null means NO distance target
  targetPaceSec: 495,          // number | null   — run/walk only; seconds per mile
  targetSpdMph: null           // number | null   — bike only; replaces targetPaceSec
}
```

**`null` is meaningful and must survive persistence.** `targetMi: null` means the program prescribed no distance — an open session. It is not the same as `0` and must not be coerced. Same for `targetPaceSec` / `targetSpdMph`.

Any code that iterates a day's items and reads `it.sets` or `it.reps` must branch on `it.kind === 'cardio'` first. Cardio blocks have neither.

## 1.2 A cardio block during a live workout

At training time the block carries the same authored fields plus runtime state:

```
{
  kind: 'cardio', activity, name, equip, modality, targetMi, targetPaceSec,

  // one synthetic set — see 1.3
  sets: [ { target: 3, weight: null, actual: null, done: false } ],

  cardio: {
    distanceMi: null,          // number | null — what was actually covered
    timeSec: null,             // number | null — elapsed seconds
    inclinePct: null,          // number | null — treadmill only
    loggedModality: null,      // 'outdoor' | 'indoor' | null — see 1.4
    source: null               // 'tracked' | 'manual' | null
  }
}
```

## 1.3 The synthetic set (important)

The existing Active Workout screen computes progress, the nav-dot rail, the overview sheet, and the completion ceremony by walking `exercise.sets`. Rather than special-case all of that, **a cardio block carries exactly one set**.

- `sets[0].done === false` → block not complete
- `sets[0].done === true` → block complete
- On log, write `sets[0].actual = distanceMi` and `sets[0].done = true`
- `sets[0].weight` stays `null`, so the block contributes zero volume

Result: a run counts as **one unit** of workout progress, identical to a single-set exercise. No changes to progress math, the rail, the overview, or the ceremony.

## 1.4 `loggedModality` — do not skip this

The athlete can flip the Outdoor/Treadmill toggle **after** logging a run. Without a record of how the run was actually recorded, a treadmill session flipped to Outdoor would render a solid, GPS-traced route — a lie.

`cardio.loggedModality` is written **once, at log time**, and is the sole input to:

- whether the route renders traced (solid, filled start marker) or ghosted (dashed, hollow)
- whether the Incline cell appears in the result row
- whether the edit form includes an Incline field
- the band caption wording

The live `modality` toggle controls only which *layout* is shown. It must never restyle a recorded result.

## 1.5 Persistence

Session state persists under the app's existing session key. The persisted record per exercise is currently `{ sets }`. For cardio blocks it must become:

```
{ sets, cardio, modality, name, equip }
```

`name` and `equip` are persisted because the modality toggle rewrites them (see 2.5) and that rename must survive reload.

The change-detection signature that triggers a save must also include cardio state, or a modality switch or a logged run will not persist:

```
sig += '|' + exercises.map(e => e.kind === 'cardio'
  ? e.modality + ':' + JSON.stringify(e.cardio || null)
  : '').join(';')
```

---

# 2. Screen: Program Builder → Day Builder

**File reference:** `Forge Program Builder.dc.html`
**Purpose:** the author builds one training day. Cardio blocks are added and configured here, and nowhere else.

## 2.1 The add row

Every section (Warm-up, Main, Cool-down) currently ends with one full-width dashed button. It becomes a **two-button row**:

```
display: flex; gap: 8px;
```

**Left — "Add exercise" (unchanged behavior, now `flex: 1`)**

| Property | Value |
|---|---|
| flex | `1`, `min-width: 0` |
| padding | `10px` |
| border-radius | `var(--fl-radius-md)` |
| border | `1px dashed var(--fl-bronze-border)` |
| background | `var(--fl-bronze-tint)` |
| color | `var(--fl-bronze-bright)` |
| font | `12.5px / 600`, letter-spacing `0.3px` |
| icon | plus, `15px`, stroke-width `2`, gap `7px` |
| label | `Add warm-up` / `Add exercise` / `Add cool-down` |

**Right — "Cardio" (new, deliberately quieter)**

| Property | Value |
|---|---|
| flex | `none` |
| padding | `10px 14px` |
| border-radius | `var(--fl-radius-md)` |
| border | `1px dashed var(--fl-charcoal-500)` |
| background | `transparent` |
| color | `var(--fl-text-secondary)` |
| font | `12.5px / 600`, letter-spacing `0.3px` |
| icon | `ForgeSymbols` **`shoe`**, `19px`, stroke-width `1.7`, gap `6px` |
| label | `Cardio` |
| aria-label | `Add a cardio block` |

The visual hierarchy is intentional: adding an exercise is the common path and stays bronze; adding cardio is available but recessive.

## 2.2 The "Add a cardio block" sheet

Opens on tapping Cardio. Uses the design system's **BottomSheet** component, `title="Add a cardio block"`.

Content: `display: flex; flex-direction: column; gap: 8px; padding-top: 2px;`

**Intro line** — `12.5px`, `line-height: 1.5`, `var(--fl-text-tertiary)`, `margin-bottom: 2px`:

> Set the distance and pace on the card. Leave either one open and the athlete decides.

**Three rows**, each a button:

| Property | Value |
|---|---|
| layout | `flex`, `align-items: center`, `gap: 13px`, `text-align: left` |
| padding | `14px 15px` |
| border-radius | `var(--fl-radius-lg)` |
| border | `1px solid var(--fl-charcoal-600)` |
| background | `var(--fl-surface-card)` |
| icon disc | `36×36`, `var(--fl-radius-round)`, `1px solid var(--fl-bronze-border-subtle)`, bg `var(--fl-icon-container-bg)`, color `var(--fl-icon-bronze)` |
| glyph | `ForgeSymbols`, `19px`, stroke-width `1.7` |
| name | `14px / 600`, `var(--fl-text-primary)` |
| sub | `11.5px`, `var(--fl-text-tertiary)` |
| chevron | right-pointing, `15px`, stroke-width `2`, `var(--fl-text-tertiary)` |

| Row | Glyph | Name | Sub |
|---|---|---|---|
| 1 | `shoe` | Run | Outdoor or treadmill |
| 2 | `footprints` | Walk | Easy, restorative miles |
| 3 | `bicycle` | Ride | Outdoor or trainer |

Tapping a row appends a block to the section the sheet was opened from, closes the sheet, and persists. Defaults:

| Activity | name | equip | modality | targetMi | pace / speed |
|---|---|---|---|---|---|
| run | Outdoor Run | Road | outdoor | `3` | `targetPaceSec: 495` (8:15/mi) |
| walk | Outdoor Walk | Road | outdoor | `2` | `targetPaceSec: 1050` (17:30/mi) |
| bike | Outdoor Ride | Road | outdoor | `10` | `targetSpdMph: 17` |

## 2.3 The cardio card

**It is the existing exercise card.** Same shell, same header, same reorder/remove cluster, same footer geometry. Only two things differ: a modality row is inserted, and the two footer steppers count different units. Do not invent a new card shape — the visual continuity between a lift and a run in the same list is the point.

**Card shell** (identical to the strength card):

```
border-radius: var(--fl-radius-lg);
border: 1px solid var(--fl-charcoal-600);
background: var(--fl-surface-card);
box-shadow: var(--fl-border-inset);
overflow: hidden;
```

**Header row** (identical to strength):

| Element | Spec |
|---|---|
| container | `flex`, `align-items: center`, `gap: 11px`, `padding: 12px 13px` |
| icon disc | `36×36`, `var(--fl-radius-round)`, `1px solid var(--fl-bronze-border-subtle)`, bg `var(--fl-icon-container-bg)`, color `var(--fl-icon-bronze)` |
| glyph | see 2.4 |
| name | `14px / 600`, `var(--fl-text-primary)` |
| equip | `11.5px`, `var(--fl-text-tertiary)` |
| controls | three `26×26` buttons, `var(--fl-radius-sm)`, `1px solid var(--fl-charcoal-600)`, transparent bg, gap `4px`; chevron-up, chevron-down (`13px`, stroke `2.2`, `var(--fl-text-secondary)`, `var(--fl-charcoal-500)` + `cursor: default` when disabled), trash (`var(--fl-red-muted)`) |

**Modality row** — cardio only, inserted between header and footer:

```
display: flex;
border-top: 1px solid var(--fl-charcoal-700);
```

Two buttons, each:

| Property | Value |
|---|---|
| flex | `1` |
| padding | `8px 0` |
| border | `none`; second button gets `border-left: 1px solid var(--fl-charcoal-700)` |
| font | `11.5px / 600`, letter-spacing `0.3px` |
| **selected** | bg `var(--fl-bronze-tint)`, color `var(--fl-bronze-bright)` |
| **unselected** | bg `transparent`, color `var(--fl-text-tertiary)` |

Labels: `Outdoor` / `Treadmill`. For `activity === 'bike'` the right label is `Indoor`.

**Stepper footer** — the same element for strength and cardio, driven by two generic slots A and B:

```
display: flex;
border-top: 1px solid var(--fl-charcoal-700);
```

Each half:

| Property | Value |
|---|---|
| container | `flex: 1`, `align-items: center`, `justify-content: center`, `gap: 10px`, `padding: 9px 0`; left half gets `border-right: 1px solid var(--fl-charcoal-700)` |
| ± buttons | `26×26`, `flex: none`, `border-radius: 50%`, `1px solid var(--fl-charcoal-500)`, bg `transparent`, color `var(--fl-text-secondary)`, `font-size: 16px`, `line-height: 1`; glyphs are `−` (U+2212, true minus) and `+` |
| value block | `min-width: 62px`, centered, `12.5px`, `var(--fl-text-secondary)` |
| value number | nested span: `var(--fl-font-display)`, `15px / 600`, color per table below |
| unit | plain text after the number span, inherits `12.5px var(--fl-text-secondary)` |

Slot contents:

| Item type | Slot A | Slot B |
|---|---|---|
| strength | `3` **sets** | `10` **reps** |
| run / walk | `3.0` **mi** — or `Open` | `8:15` **/mi** — or `Any` **pace** |
| bike | `10.0` **mi** — or `Open` | `17.0` **mph** — or `Any` **speed** |

Value number color: `var(--fl-text-primary)` when a target is set, **`var(--fl-bronze-bright)` when the value is `Open` or `Any`.** The bronze is what makes "no target" read as a deliberate authored state rather than a missing value.

aria-labels: `Fewer sets` / `More sets` / `Fewer reps` / `More reps` / `Shorter distance` / `Longer distance` / `Faster target pace` / `Slower target pace` / `Lower target speed` / `Higher target speed`.

## 2.4 Icons

Cardio glyphs come from the existing **`forge-symbols.js`** library. Load it on this screen — it is not currently loaded in Program Builder. Do not hand-draw these.

The card icon is keyed off **`activity`**, never `equip`:

| activity | symbol |
|---|---|
| `run` | `shoe` |
| `walk` | `footprints` |
| `bike` | `bicycle` |

This matters because `setModality` rewrites `equip`. Keying off equipment would make Outdoor Run and Outdoor Walk render the same glyph. Modality is already communicated by the toggle row and the block name; the glyph carries activity.

Strength items keep the existing equipment-based icon map (Barbell / Dumbbell / Cable / Machine / Bodyweight).

## 2.5 Modality switch behavior

Tapping Outdoor or Treadmill on the card:

1. Sets `modality`.
2. **Rewrites `name`**, so the block always states what it is:
   - outdoor → `Outdoor Run` / `Outdoor Walk` / `Outdoor Ride`
   - indoor → `Treadmill Run` / `Treadmill Walk` / **`Indoor Ride`** (bike gets the different word)
3. **Rewrites `equip`**: outdoor → `Road`; indoor → `Treadmill`, or `Trainer` for bike.
4. No-ops if the modality is already selected.

## 2.6 Stepper ranges — "Open" is the bottom of the scale

There is no checkbox, switch, or "no target" option. **Stepping below the minimum clears the target.** One control, one gesture, no extra UI.

**Distance**

- step `0.5`, min `0.5`, max `26.2` (the marathon is the natural ceiling)
- from `null`, `+` sets `0.5`
- from `0.5`, `−` sets `null`
- round to 1 decimal each step to avoid float drift
- display `Open` when `null`, otherwise `toFixed(1)` + ` mi`

**Pace** (run / walk) — `+` makes the pace *slower*, matching the numeral going up

- step `5` seconds, min `300` (5:00), max `1200` (20:00)
- from `null`, `+` sets `495`
- below `300`, set `null`
- display `Any pace` when `null`, otherwise `m:ss` + ` /mi`

**Speed** (bike) — `+` makes the speed *higher*

- step `0.5`, min `6`, max `30`
- from `null`, `+` sets `17`
- below `6`, set `null`
- display `Any speed` when `null`, otherwise `toFixed(1)` + ` mph`

Four authored combinations fall out of two controls: 3 mi @ 8:15, 3 mi @ any pace, open @ 8:15 (a tempo run of any length), fully open.

---

# 3. Screen: Active Workout → Cardio Block Card

**File reference:** `Forge Active Workout.dc.html`
**Purpose:** the athlete arrives at a run in the middle of a lifting session. Bench press, tap Next, this card.

## 3.1 What it replaces

When `exercise.kind === 'cardio'`, hide **both** the exercise hero (expanded and collapsed strip) **and** the set-logging table. There is no demonstration GIF, no How To, no Memories strip, no sets. Render the cardio card in their place.

The bottom action bar, nav-dot rail, overview link, rest timer, app bar, and tab bar are unchanged.

## 3.2 Card shell

```
flex: none;                    /* ← CRITICAL, see below */
background: linear-gradient(180deg, #0D1116 0%, var(--fl-bg-primary) 58%);
border: 1px solid var(--fl-charcoal-600);
border-radius: var(--fl-radius-xl);
overflow: hidden;
box-shadow: var(--fl-shadow-card-hero);
animation: flHeroSwap 260ms var(--fl-ease-out) both;
```

**`flex: none` is load-bearing.** The scroll body is a column flex container, so children default to `flex-shrink: 1`. Because this card carries `overflow: hidden` (needed to clip the rounded terrain band), a shrunk card silently clips its own content and the parent never overflows — so the clipped region is unreachable, not merely below the fold. The strength cards do not expose this because they are `overflow: visible`.

The colder ground — `#0D1116` fading into the app background — is the only visual departure from the strength cards. Same shell, different light.

## 3.3 Terrain band

`height: 140px; border-bottom: 1px solid var(--fl-charcoal-700); position: relative;`

### Outdoor background

```
repeating-linear-gradient(0deg,  rgba(191,143,79,0.045) 0 1px, transparent 1px 30px),
repeating-linear-gradient(90deg, rgba(191,143,79,0.045) 0 1px, transparent 1px 30px),
radial-gradient(130% 110% at 50% 12%, #131A20, #080C10)
```

A faint bronze map grid built from pure CSS — no tiles, no map library.

### Outdoor route

`<svg viewBox="0 0 372 126" preserveAspectRatio="xMidYMid meet">` filling the band.

Path (single `d`, reused for both treatments):

```
M44 100 C 28 70 70 66 72 46 C 74 24 42 20 66 12 C 92 4 152 14 172 44
C 194 78 262 70 278 40 C 288 22 318 30 320 52
```

| | stroke | width | dasharray | opacity | start circle fill |
|---|---|---|---|---|---|
| **Not yet run** (ghost) | `var(--fl-bronze-border)` | `2.4` | `5 8` | `0.45` | `none` |
| **Run outdoors** (traced) | `var(--fl-bronze-bright)` | `3` | `none` | `0.95` | `var(--fl-bronze-bright)` |
| **Logged on treadmill, viewed in Outdoor** | `var(--fl-bronze-border)` | `2.4` | `5 8` | `0.28` | `none` |

The dashed → solid change, plus the start marker filling in, is the entire tell that the run happened. It must be driven by `loggedModality === 'outdoor'`, never by "is logged."

Markers: `r=5`, `stroke: var(--fl-bronze-primary)`, `stroke-width: 2`. Start at `(44, 100)` opacity `0.85`; end at `(320, 52)` opacity `0.7`, fill always `none`.

**Scrim** (outdoor only) — bottom `52px`, `linear-gradient(0deg, rgba(8,12,16,0.9) 0%, rgba(8,12,16,0) 100%)`, `pointer-events: none`.

**Caption** (outdoor only) — `position: absolute; bottom: 11px; right: 14px; white-space: nowrap; 11px / 600; letter-spacing: 0.2px; var(--fl-text-secondary)`:

| State | Text |
|---|---|
| not logged | `Your route traces as you run` |
| logged outdoors | `3.0 mi · 24:45` |
| logged on treadmill | `Logged on a treadmill · no route` |

### Treadmill band — time, and nothing else

No route. No map grid. No incline graph. A treadmill reports elapsed time and nothing more, and the band shows exactly that.

Background: `linear-gradient(180deg, #10141A 0%, #070A0D 100%)`

**Belt** — full-bleed layer:

```
background-image: repeating-linear-gradient(180deg,
  rgba(191,143,79,0.085) 0 2px, rgba(191,143,79,0) 2px 28px);
animation: flBelt 900ms linear infinite;   /* only while the timer runs */
```

```
@keyframes flBelt { from { background-position: 0 0; } to { background-position: 0 28px; } }
```

The hatch scrolls downward — toward the runner — at 28px per 900ms. When the timer is paused or idle, `animation: none`.

**Vignette** — above the belt, below the text: `radial-gradient(78% 60% at 50% 50%, rgba(8,12,16,0.88) 0%, rgba(8,12,16,0) 100%)`

**Centered clock** — absolutely positioned, full-bleed, column flex, centered, `gap: 7px`:

| Element | Spec |
|---|---|
| time | `var(--fl-font-display)`, `46px / 600`, `line-height: 0.92`, `letter-spacing: 1px`, `font-variant-numeric: tabular-nums` |
| time color | `var(--fl-bronze-bright)` while running, else `var(--fl-text-primary)` |
| status | `9px / 700`, letter-spacing `1.5px`, uppercase, `var(--fl-text-tertiary)`, `gap: 6px` |
| live dot | `5×5`, `50%`, `var(--fl-status-online)`, `box-shadow: var(--fl-status-online-glow)`, `animation: flPulse 2s ease-in-out infinite` — shown only while running |

Status text:

| State | Text |
|---|---|
| idle, `0:00` | `Time only · no GPS indoors` |
| running | `Belt running` |
| paused | `Paused` |
| logged on treadmill | `3.0 mi on the belt` |
| logged outdoors, viewed in Treadmill | `3.0 mi logged outdoors` |

Time shown is the live timer when unlogged, and `cardio.timeSec` once logged.

### Band overlays (both modalities)

**Label** — `top: 11px; left: 14px`, `flex`, `gap: 6px`, `9px / 700`, letter-spacing `1.5px`, uppercase, `var(--fl-bronze-primary)`: activity glyph at `12px` + the text `Cardio Block`.

**LOGGED badge** — `top: 10px; right: 12px`, shown only when logged:

```
padding: 4px 9px;
border-radius: var(--fl-radius-pill);
border: 1px solid rgba(90,158,104,0.34);
background: rgba(90,158,104,0.12);
```
Check glyph `10px`, stroke-width `3`, `var(--fl-green-muted)`; label `8.5px / 700`, letter-spacing `1px`, uppercase, `var(--fl-green-muted)`; gap `5px`.

## 3.4 Card body

`padding: 15px 16px 16px; display: flex; flex-direction: column; gap: 14px;`

### Name row

`flex`, `align-items: flex-start`, `justify-content: space-between`, `gap: 10px`

- **Name** — `var(--fl-font-display)`, `24px / 600`, letter-spacing `-0.3px`, `line-height: 1.08`, `var(--fl-text-primary)`
- **Subtitle** — `11.5px`, `var(--fl-text-tertiary)`:
  - has target → the authored goal note, e.g. `Hold 8:15 or better`
  - no target → `No distance target — run what you've got`
- **Mark** — `34×34` disc, `var(--fl-radius-round)`, `1px solid var(--fl-bronze-border-subtle)`, bg `var(--fl-icon-container-bg)`, color `var(--fl-icon-bronze)`, glyph `17px`. Symbol is `stopwatch` for treadmill, otherwise the activity glyph. Decorative — `aria-hidden`, not a button.

There is deliberately **no collapse control** on this card. Collapsing it would leave an empty screen, since there is no set table beneath.

### Modality segmented control

```
display: flex; gap: 4px; padding: 4px;
border-radius: var(--fl-radius-lg);
background: var(--fl-surface-recessed);
border: 1px solid var(--fl-charcoal-600);
```

Two options, each `flex: 1`, `height: 42px`, `border-radius: var(--fl-radius-md)`, `gap: 7px`, `transition: background 180ms`, label `13px / 600`, glyph `17px`:

- **Outdoor** — `shoe`
- **Treadmill** — `stopwatch`

Selected: bg `var(--fl-bronze-tint)`, ink `var(--fl-bronze-bright)`. Unselected: bg `transparent`, ink `var(--fl-text-secondary)`.

Must be keyboard-operable — `role="button"`, `tabIndex=0`, and an `onKeyDown` firing on Enter and Space.

Switching modality applies the same rename rules as 2.5, resets the treadmill timer to `0`, and clears any open log draft. **It does not clear `cardio` data** — a logged run survives a toggle (which is precisely why `loggedModality` exists).

### Prescription strip

```
display: flex; padding: 12px 0;
border-top: 1px solid var(--fl-charcoal-700);
border-bottom: 1px solid var(--fl-charcoal-700);
```

Cells are built dynamically — **two or three, never a placeholder cell**:

| # | Condition | Label | Value | Value size | Value ink | Label weight / ink |
|---|---|---|---|---|---|---|
| 1 | `targetMi != null` | `Target` | `3.0 mi` | `20px` | `var(--fl-bronze-bright)` | `700` / `var(--fl-text-bronze-label)` |
| 1 | `targetMi == null` | `Distance` | `Open` | `20px` | `var(--fl-bronze-bright)` | `700` / `var(--fl-text-bronze-label)` |
| 2 | pace/speed set | `Target Pace` (or `Target Speed`) | `8:15 /mi` | `16px` | `var(--fl-text-primary)` | `600` / `var(--fl-text-tertiary)` |
| 2 | pace/speed `null` | *cell omitted entirely* | | | | |
| 3 | always | `Last` | `3.0 mi · 8:28 /mi` | `16px` | `var(--fl-text-primary)` | `600` / `var(--fl-text-tertiary)` |

Cell layout: `flex: 1`, `min-width: 0`, column, `gap: 3px`. First cell `padding: 0 12px 0 0`, no left border. Every other cell `padding: 0 12px`, `border-left: 1px solid var(--fl-charcoal-700)`.

Labels `9px`, letter-spacing `1.2px`, uppercase. Values `var(--fl-font-display)`, `600`, `line-height: 1.15`.

**This strip is read-only.** The strength logger above it establishes the rule — Target comes from the program and does not move; Actual is what you log. Making the prescription editable inline would be the only place in a workout where you can quietly rewrite the program, and it would destroy the prescribed-vs-actual comparison. Adjustment happens at the moment of intent instead: on the Active Run pre-run screen (outdoor), or at log time (treadmill).

## 3.5 State A — Outdoor, not yet run

Column, `gap: 9px`.

1. **Start Run** — design-system Button, `variant="primary"`, full width, `54px`. Label `Start Run` / `Start Walk` / `Start Ride`.
2. **`Already did it · log manually`** — design-system Button, `variant="text"`, centered, `38px`. Opens the log form (3.7).
3. **Note** — centered, `11px`, `line-height: 1.5`, `var(--fl-text-tertiary)`:
   > Tracking opens full screen. You'll come straight back here when you finish.

## 3.6 State B — Treadmill, not yet run

The band already *is* the timer, so this section is controls only. Column, `gap: 11px`.

1. **Button row**, `gap: 9px`:
   - Left, `flex: 1` — timer button, `50px`. Label `Start Timer` when `0:00`, `Pause` while running, `Resume` when paused. Variant `primary` when fresh, `secondary` once started.
   - Right, `flex: 1` — **Log Run**, `variant="primary"`, `50px`. Shown only once the timer has run (`timerSec > 0`).
2. **`Skip timer · enter it myself`** — `variant="text"`, centered, shown only while the timer is fresh (`0` and not running).
3. **Note** — centered, `11px`, `line-height: 1.5`, `var(--fl-text-tertiary)`:
   > A treadmill only gives us time. You'll read the distance off the console when you log it.

Timer ticks at `1000ms`. It **keeps running** when the athlete navigates to another exercise and back — you are still on the treadmill. Clear the interval on unmount.

## 3.7 State C — Log form

Column, `gap: 12px`. Fields are decided **once, when the form opens**, from `loggedModality` if the run was already logged, otherwise from the current `modality`. Store that decision on the draft (`hasIncline`, `modality`) so a toggle flipped mid-edit cannot change the form's shape or drop a field on save.

**Field row:**

```
display: flex; align-items: center; justify-content: space-between; gap: 12px;
padding: 10px 12px;
border-radius: var(--fl-radius-md);
background: var(--fl-surface-elevated);
border: 1px solid var(--fl-charcoal-500);
box-shadow: var(--fl-border-inset);
```

- **Label** — `9.5px / 700`, letter-spacing `1.2px`, uppercase, `var(--fl-text-tertiary)`
- **Hint** — beside the label, `gap: 7px`, `9px / 600`, letter-spacing `0.6px`, `var(--fl-text-bronze-label)`
- **Value** — `var(--fl-font-display)`, `22px / 600`, `line-height: 1`, `font-variant-numeric: tabular-nums`, `var(--fl-text-primary)`
- **± buttons** — `40×40`, `var(--fl-radius-round)`, `1px solid var(--fl-bronze-border)`, bg `var(--fl-surface-card)`, color `var(--fl-bronze-bright)`, `font-size: 22px`, gap `8px`

| Field | Shown | Step | Floor | Display | Hint |
|---|---|---|---|---|---|
| Distance | always | `±0.1` | `0` | `3.0 mi` | `Read it off the console` (treadmill only) |
| Time | always | `±15s` | `0` | `24:45` | `From your timer` (treadmill, when the timer ran) |
| Incline | treadmill only | `±0.5` | `0`–`15` | `1.0%` | — |

Prefill on open: distance ← logged value, else the target, else `1`. Time ← logged value, else the treadmill timer, else `target × targetPaceSec`. Incline ← logged value, else `1` for treadmill.

**Computed row** — `padding: 2px 12px 0`, baseline space-between:
- label `Avg Pace` (or `Avg Speed`), `9.5px / 700`, letter-spacing `1.3px`, uppercase, `var(--fl-text-bronze-label)`
- value `var(--fl-font-display)`, `19px / 600`, `var(--fl-bronze-bright)`, tabular-nums — `timeSec / distanceMi` formatted `m:ss /mi`; em-dash when distance < 0.05

**Actions**, `gap: 9px`, `margin-top: 2px`: **Cancel** (`secondary`, `flex: 1`, `50px`) and **Save Run** (`primary`, `flex: 1.15`, `50px`).

On save: write `cardio` (including `loggedModality` from the draft), set `sets[0].actual` and `sets[0].done = true`, reset the timer, persist, and fire a toast — `"Treadmill Run logged"`.

## 3.8 State D — Logged

Column, `gap: 13px`.

**Result row:**

```
display: flex; padding: 14px 0;
border-radius: var(--fl-radius-lg);
background: var(--fl-surface-recessed);
border: 1px solid rgba(90,158,104,0.24);
```

Cells `flex: 1`, column, centered, `gap: 4px`. Value `var(--fl-font-display)`, `24px / 600`, `line-height: 0.95`, tabular-nums. Label `9px / 600`, letter-spacing `1.2px`, uppercase, `var(--fl-text-tertiary)`. Every cell after the first carries `border-left: 1px solid var(--fl-bronze-border-subtle)`.

| # | Value | Label | Ink | Shown |
|---|---|---|---|---|
| 1 | `3.0` | `mi` | `var(--fl-text-primary)` | always |
| 2 | `24:45` | `Time` | `var(--fl-text-primary)` | always |
| 3 | `8:15` | `Avg /mi` | `var(--fl-bronze-bright)` | always |
| 4 | `1.0%` | `Incline` | `var(--fl-text-primary)` | **`loggedModality === 'indoor'` and incline present** |

Below: **`Edit these numbers`** — `variant="text"`, centered, reopens the log form.

The bottom bar's primary action becomes **Next Exercise** as it would for any completed block, and workout progress advances by one unit.

---

# 4. Screen: Active Run, launched from a workout

**File reference:** `Forge Active Run.dc.html`

The full-screen tracker already exists. When it is opened from a workout it runs the same three phases with four changes.

## 4.1 Detecting the handoff

Read the handoff payload once at mount and cache it. Presence of a valid payload puts the screen in **in-workout** mode; absence is standalone. Everything below branches on that one flag.

## 4.2 Pre-run screen

- **Activity** comes from the payload, not the URL query.
- **Target** is locked to the payload's `targetMi`, overriding the activity default. The ± stepper stays live — the athlete may cut the run short before starting, which is a decision, not an edit.
- **Goal chooser hidden** when the payload carries a target. Replaced by a pill:

```
display: inline-flex; align-items: center; gap: 8px;
padding: 8px 14px;
border-radius: var(--fl-radius-pill);
border: 1px solid var(--fl-bronze-border);
background: var(--fl-bronze-tint);
```
  `6px` bronze dot + text at `11.5px / 600`, letter-spacing `0.3px`, `var(--fl-bronze-bright)`:
  `Part of Strength Foundation I` (program name, truncated at the first `·`).

- **When the payload's `targetMi` is `null`** the goal chooser is **restored** and the screen defaults to **Open** mode — the ring becomes the per-mile cycle rather than progress toward a fabricated target. The pill reads `Open block · Strength Foundation I`.
- **Eyebrow** shows the block name (`OUTDOOR RUN`) rather than the generic activity label.
- **Back** returns to the workout without writing a result, and clears the handoff.

## 4.3 Finish screen

- **Personal Bests are suppressed.** PBs belong to the workout's own ceremony.
- **The Hold-to-Seal pill and View Record are hidden.** Replaced by:
  - **Add to Workout** — design-system Button, `variant="primary"`, full width, `54px`
  - hint below, centered, `margin-top: 10px`, `11.5px`, `line-height: 1.5`, `var(--fl-text-tertiary)`: `You'll seal the whole session at the end.`
- The run is **not** written to the activity log here. The workout logs it at its own completion. One seal per session.
- Route map, summary triad, and all other finish-screen content are unchanged.

## 4.4 The handoff contract

Two one-shot localStorage keys (or the platform equivalent — a navigation param or shared store is preferable in a real app; the storage round-trip exists only because these prototypes are separate documents).

**On "Start Run", Active Workout writes:**

```
forge_workout_cardio_handoff_v1 = {
  slot: 1,                        // index of the block in exercises[]
  activity: 'run',
  name: 'Outdoor Run',
  targetMi: 3,                    // or null for an open block
  targetPaceSec: 495,
  program: 'Strength Foundation I · Day 1',
  returnTo: 'Forge Active Workout'
}
```

It persists the session before navigating, so nothing logged so far is lost.

**On "Add to Workout", Active Run writes and navigates back:**

```
forge_workout_cardio_result_v1 = {
  slot: 1,
  distanceMi: 3.04,               // 2 decimal places
  timeSec: 1485,
  modality: 'outdoor'
}
```
…and removes the handoff key.

**On mount, Active Workout** reads the result, removes both keys, and — if the named slot is still a cardio block — writes `cardio` (with `loggedModality: 'outdoor'`, `source: 'tracked'`, preserving any existing `inclinePct`), marks `sets[0].done`, jumps `exerciseIdx` to that slot, expands the card, persists, and toasts `Run added to this workout`.

The athlete lands on the run card, filled in and marked done, with Next Exercise ready.

---

# 5. Interactions & Animation

| Name | Spec | Where |
|---|---|---|
| `flHeroSwap` | `260ms var(--fl-ease-out) both` | cardio card entrance |
| `flBelt` | `background-position 0 0 → 0 28px`, `900ms linear infinite` | treadmill belt, only while running |
| `flPulse` | `2s ease-in-out infinite` | live status dot |
| modality segment | `transition: background 180ms` | both segmented controls |
| treadmill timer | `1000ms` interval, survives navigation away, cleared on unmount | State B |

All animation must be suppressed under `prefers-reduced-motion: reduce`.

## Accessibility

- Both segmented controls need `role="button"`, `tabIndex=0`, and `onKeyDown` handling Enter and Space. (The existing prototypes have several `role="button"` elements without keyboard handlers — do not reproduce that.)
- All ± buttons carry descriptive aria-labels (listed in 2.3 and 3.7).
- The decorative mark disc and band overlays are `aria-hidden`.
- Minimum touch target is 44px for the primary run actions; the ± steppers are 40px in the log form and 26px in the builder (matching the existing builder steppers).

---

# 6. State

## Program Builder

| Key | Type | Notes |
|---|---|---|
| `cardioSheet` | `string \| null` | the section key the add sheet was opened from; `null` = closed |

All block data lives in the existing program draft and persists through the existing save path.

## Active Workout

| Key | Type | Notes |
|---|---|---|
| `cardioTimerRunning` | `boolean` | treadmill belt timer |
| `cardioTimerSec` | `number` | elapsed seconds |
| `cardioDraft` | `object \| null` | `{ distanceMi, timeSec, inclinePct, hasIncline, modality }` while the log form is open |

Plus `exercises[i].cardio` and `exercises[i].modality` as described in 1.2.

## Active Run

| Key | Type | Notes |
|---|---|---|
| handoff payload | cached object \| null | read once at mount |
| `goalMode` | `null \| 'distance' \| 'open'` | must initialize to `null` so the in-workout default can be derived |

---

# 7. Design Tokens

All are existing Forge Legacy Visual Foundation tokens. Use the token names.

**Color**

| Token | Value |
|---|---|
| `--fl-bronze-primary` | `#BF8F4F` |
| `--fl-bronze-bright` | `#CDA063` |
| `--fl-bronze-mid` | `#7A6040` |
| `--fl-bronze-border` | `rgba(186, 146, 92, 0.40)` |
| `--fl-bronze-border-subtle` | `rgba(186, 146, 92, 0.19)` |
| `--fl-bronze-tint` | bronze wash used for selected segments |
| `--fl-charcoal-900` (`--fl-bg-primary`) | `#0C1013` |
| `--fl-charcoal-800` | `#131517` |
| `--fl-charcoal-700` | `#1A1A1E` |
| `--fl-charcoal-600` | `#24242A` |
| `--fl-charcoal-500` | `#2E2E35` |
| `--fl-green-muted` | `#5A9E68` |
| `--fl-red-muted` | `#BE5A4C` |
| `--fl-surface-card` | `linear-gradient(180deg, #181A1C, #131517)` |
| `--fl-surface-elevated` | `linear-gradient(180deg, #1F2024, #1A1A1E)` |
| `--fl-surface-recessed` | `linear-gradient(180deg, #05080A, #0C0C0E)` |
| `--fl-text-primary` / `-secondary` / `-tertiary` / `-bronze-label` | text hierarchy |
| `--fl-icon-container-bg` / `--fl-icon-bronze` | engraved icon disc |
| `--fl-status-online` + `--fl-status-online-glow` | live indicator |

**Literal colors** (new to this feature, not tokenized):

| Value | Use |
|---|---|
| `#0D1116` | cardio card top, colder ground |
| `#10141A` → `#070A0D` | treadmill band |
| `#131A20` / `#080C10` | outdoor map radial |
| `rgba(191,143,79,0.045)` | map grid lines |
| `rgba(191,143,79,0.085)` | belt hatch |
| `rgba(8,12,16,0.9 / 0.88)` | band scrim and vignette |
| `rgba(90,158,104,0.34 / 0.24 / 0.12)` | LOGGED badge and result row |

**Radius:** `--fl-radius-sm`, `-md`, `-lg`, `-xl`, `-pill`, `-round`

**Shadow:** `--fl-border-inset`, `--fl-shadow-card`, `--fl-shadow-card-hero`

**Type:** `--fl-font-display` (Playfair Display, 500/600/700) for every numeral and title; `--fl-font-sans` for labels and body.

**Easing:** `--fl-ease-out`

---

# 8. Assets

No image assets. All glyphs come from the existing **`forge-symbols.js`** library: `shoe`, `footprints`, `bicycle`, `stopwatch`. Strength items keep the existing inline equipment icon map.

Nothing in this feature should be hand-drawn as SVG.

---

# 9. Files in this bundle

| File | Contains |
|---|---|
| `Forge Program Builder.dc.html` | Day Builder, cardio card, add sheet, stepper ranges — sections 2 |
| `Forge Active Workout.dc.html` | Cardio block card, all four states, handoff write, result apply — section 3 |
| `Forge Active Run.dc.html` | In-workout mode, prescription pill, Add to Workout — section 4 |
| `forge-symbols.js` | Icon library — section 8 |
| `tokens/foundation.css` | Design tokens — section 7 |

Each `.dc.html` opens directly in a browser. The relevant logic lives in the `<script data-dc-script>` block at the bottom of each file.

---

# 10. Build order

1. **Data model and persistence** (section 1) — including `loggedModality` and the cardio-aware change signature. Everything else depends on it.
2. **Program Builder** (section 2) — you need a way to author a block before you can train one.
3. **Active Workout card**, treadmill path first (3.1–3.4, 3.6–3.8) — it is self-contained and requires no navigation.
4. **Outdoor handoff** (3.5 + section 4) — the round trip is the last and most delicate piece.

## The five things most likely to be got wrong

1. `flex: none` on the cardio card — without it the card clips its own content unreachably (3.2).
2. `loggedModality` — without it a treadmill run renders a fake GPS route the moment the toggle is flipped (1.4).
3. `targetMi: null` surviving persistence — a coerced `0` turns an open block into a broken 0-mile target (1.1).
4. The log form's field set frozen at open time — otherwise editing an outdoor-toggled treadmill run silently destroys its incline (3.7).
5. Icons keyed off `activity`, not `equip` — otherwise Run and Walk are indistinguishable (2.4).
