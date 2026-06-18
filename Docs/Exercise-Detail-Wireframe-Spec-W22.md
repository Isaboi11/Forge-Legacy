# W-22 Exercise Detail
## Wireframe Specification v1.0 | June 2026

**Status:** LOCKED
**Authority:** Exercise Domain Architecture v1.0 + Amendment 001 (LOCKED), ED-1–ED-6 (LOCKED), W-21 (LOCKED), Product DNA (LOCKED)
**Implements:** Architecture § 4.1 (Education Content Fields), § 4.2 (Content Model), § 4.3 (Media Model), § 4.4 (W-22 Content Order — LOCKED), § 4.6 (Non-Behavior Clarification — LOCKED), § 2.6 (Alternatives Model)
**Navigated from:** W-21 (grid, horizontal rows, search, collection detail, see all favorites), future: W-23, W-9
**Navigates to:** W-22 (for alternative exercises), source screen (back)

---

## 1. Screen Purpose

W-22 Exercise Detail is the educational destination for every exercise in Forge Legacy.

It exists to answer six questions in sequence:

1. What does this exercise look like?
2. What is it?
3. Why would I do it?
4. What does it train?
5. How do I perform it?
6. What can I do instead?

It is not a database record. It is not a wiki page. It is not an encyclopedia entry. It is the experience of receiving guidance from a world-class coach — concise, educational, and respectful of the athlete's intelligence.

**What W-22 is:**
- The complete educational profile of a single exercise
- The destination for any exercise card tap in the Forge Legacy ecosystem
- A premium coaching surface
- A Favorites management surface

**What W-22 is not:**
- A workout builder or exercise selector (W-24, W-23)
- A logging surface (W-9)
- A performance analytics surface
- A source of timeline events, honors, or rank progress (Architecture Amendment 001 § 4.6, LOCKED)

Emotional tone: Informative. Inspiring. Premium. Calm.

---

## 2. Entry Points

### 2.1 Current Entry Points (MVP)

| Source | Trigger | Context Passed |
|--------|---------|---------------|
| W-21 Catalog Grid | Tap exercise card | Exercise ID |
| W-21 Favorites Row | Tap exercise card | Exercise ID |
| W-21 Recently Used Row | Tap exercise card | Exercise ID |
| W-21 Search Results | Tap search result row | Exercise ID |
| W-21 Collection Detail | Tap exercise card | Exercise ID |
| W-21 See All Favorites | Tap exercise card | Exercise ID |
| W-22 Alternatives Row | Tap alternative exercise card | Exercise ID (of the alternative) |

All entry points pass only an `exerciseId`. W-22 fetches the full exercise record from that ID. The source context (W-21 vs. W-22-via-alternative) determines back navigation behavior but not content.

### 2.2 Future Entry Points (Noted — Not Specced)

| Source | Trigger | Notes |
|--------|---------|-------|
| W-23 Exercise Picker | Long-press on picker exercise | Opens W-22 as a sheet or modal above W-23 |
| W-9 Active Workout | Tap exercise name in session | Opens W-22 as an informational overlay |
| H-1 Home Screen | Featured exercise highlight | Direct navigation to W-22 |
| App deep link | External URL to a specific exercise | Resolves exercise ID, opens W-22 |

These entry points are not designed here. They are noted so W-22's architecture accommodates them without structural changes.

---

## 3. Exit Points

| Destination | Trigger |
|-------------|---------|
| Source screen (W-21 or W-22) | Back navigation (swipe or back button) |
| W-22 (for alternative exercise) | Tap alternative exercise card in Alternatives section (§ 12) |

W-22 has exactly two exit paths: back, and forward to an alternative exercise. No other navigation originates from W-22.

---

## 4. Information Architecture

### 4.1 Screen Structure

W-22 is a single vertically-scrolling screen with a persistent sticky header. The locked content order (Architecture § 4.4) is implemented as a continuous scroll from top to bottom.

```
┌─────────────────────────────────────────────────────┐
│  STICKY HEADER (always visible)                     │
│  [← ]   [Exercise Name — appears when scrolled]  [♡]│
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │                                               │  │
│  │         HERO MEDIA (GIF — autoplay)           │  │
│  │         Full-width · 16:9 aspect ratio        │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Bench Press                                        │  ← Exercise Name (large)
│                                                     │
│  [Chest] [Triceps]           [+ Front Delt]         │  ← Primary muscles
│  Secondary: [Shoulders] [Core]                      │  ← Secondary muscles (if present)
│                                                     │
│  Barbell  ·  Squat Rack          [● Intermediate]    │  ← Metadata row
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  WHY IT MATTERS                                     │  ← § 7
│  [body copy — warm, editorial treatment]            │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ABOUT                                              │  ← § 8 (Description)
│  [body copy]                                        │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  HOW TO DO IT                                       │  ← § 9 (Instructions)
│  1.  [step text]                                    │
│  2.  [step text]                                    │
│  3.  [step text]                                    │
│  ...                                                │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  COACHING CUES                                      │  ← § 10 (Tips)
│  —  [tip text]                                      │
│  —  [tip text]                                      │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  WATCH OUT FOR                                      │  ← § 11 (Common Mistakes)
│  —  [mistake text]                                  │
│  —  [mistake text]                                  │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ALTERNATIVES                                       │  ← § 12
│  [Card] [Card] [Card]  →                            │  ← Horizontal scroll
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 4.2 Section Visibility Rules

Sections are conditionally shown based on content availability. Sections with null or empty content are hidden entirely — no empty placeholders, no "No content available" messages for system exercises (the content team ensures all system exercises have complete data). For custom exercises, sparse content is expected and graceful degradation is required.

| Section | Visibility Rule |
|---------|----------------|
| Hero Media | Always shown. Fallback chain governs display (§ 5.3). |
| Exercise Name | Always shown. |
| Primary Muscles | Always shown for system exercises; may be absent for custom. |
| Secondary Muscles | Shown when `secondaryMuscles.length > 0`. Hidden if none. |
| Metadata row | Shown when any of: difficulty, equipment, or environment is set. |
| WHY IT MATTERS | Shown when `whyItMatters` is non-null and non-empty. |
| ABOUT | Shown when `description` is non-null and non-empty. |
| HOW TO DO IT | Shown when `instructions.length > 0`. |
| COACHING CUES | Shown when `tips.length > 0`. |
| WATCH OUT FOR | Shown when `commonMistakes.length > 0`. |
| ALTERNATIVES | Shown when `alternativeExerciseIds.length > 0` (system) OR derivation finds at least one alternative (§ 2.6). |

### 4.3 Section Ordering

The locked content order (Architecture § 4.4) is absolute. Sections are not reordered based on available content. If WHY IT MATTERS is absent (null), that section disappears and the next section moves up in the scroll — without reorganizing the remaining order.

### 4.4 Scroll Behavior

W-22 scrolls as a single continuous page. No tabs, no segmented content views, no in-page anchor navigation. The athlete reads from top to bottom or scrolls freely.

**Sticky header collapse:** As the athlete scrolls past the Exercise Name, the sticky header transitions from the source context label ("Exercise Library" or "Alternatives") to the current exercise name. The Favorite icon is always present in the header regardless of scroll position.

---

## 5. Hero Media

### 5.1 GIF Autoplay Behavior

Per ED-5 (LOCKED): GIF autoplays in W-22. This is the only surface in Forge Legacy where GIF media autoplays.

**Autoplay rules:**
- GIF begins playing immediately on W-22 entry — no tap required, no play button
- Loops continuously while W-22 is visible
- Pauses when the app is backgrounded or the device screen locks
- Resumes playing when the athlete returns to W-22
- No playback controls shown (no play/pause button, no progress bar, no loop counter)

**Why autoplay is right here:** The athlete opened the Exercise Detail to understand the exercise. The GIF is the most efficient teacher — it shows the movement before a single word is read. Autoplay serves the athlete's intent without requiring an action.

### 5.2 GIF Presentation

```
┌─────────────────────────────────────────────────────┐
│  [← ]   Exercise Library                       [♡]  │  ← Sticky header
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │                                             │    │
│  │         (GIF animating continuously)        │    │  ← Full-width, 16:9
│  │                                             │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Bench Press                                        │
│  ...                                                │
```

- **Aspect ratio:** 16:9, full screen width (edge to edge, no horizontal margins)
- **Vertical position:** Top of scroll content, immediately below the sticky header
- **Bottom edge:** Straight edge, not rounded; the exercise name content begins directly below
- **Top/side rounding:** None — the GIF fills the full width flush to screen edges
- **Height on screen:** ~52% of a standard screen height at 16:9 on a 390pt-wide display (~203pt)

**Rationale for edge-to-edge GIF:** A contained card for the GIF (rounded corners, horizontal margins) reduces visual impact and frames the exercise as a data item. Full-width treats the movement as the hero — a cinematic first impression.

### 5.3 Fallback Chain

Per Architecture § 4.3 (LOCKED):

```
gif → video → image → exercise name initial
```

| Media State | W-22 Display |
|-------------|-------------|
| `gifUrl` present | GIF autoplays at 16:9 full-width |
| `gifUrl` null, `videoUrl` present | Video plays in the 16:9 hero area (autoplay, muted, loop) |
| `gifUrl` null, `videoUrl` null, `imageUrl` present | Static image shown at 16:9 full-width |
| All media null | Dark 16:9 placeholder: exercise name initial in large warm text, centered |

### 5.4 GIF Loading State

When the GIF has not yet loaded on entry:
- The 16:9 hero area shows the `gifThumbnailUrl` (static frame) immediately — same as the W-21 card thumbnail, already likely cached
- When the full GIF loads, it fades in from the thumbnail and begins playing
- Transition: crossfade, ~200ms — no flash, no jump

If the thumbnail is also not cached: dark placeholder with name initial until either the thumbnail or GIF loads.

### 5.5 Offline GIF Behavior

Offline: show `gifThumbnailUrl` if cached. If thumbnail is not cached, show dark placeholder with name initial. No error indicator in the hero area — the degraded state is visually coherent. The educational content below continues to render from cached data.

### 5.6 Reduce Motion

When the athlete has "Reduce Motion" enabled:
- GIF does NOT autoplay
- `gifThumbnailUrl` is shown as a static image instead
- No animation in the hero area
- All other screen elements function normally
- No explicit user notification that the GIF is paused (the static image speaks for itself)

**Accessibility note:** Continuously looping GIFs can trigger vestibular disorders. Reduce Motion support is therefore not optional — it is required.

---

## 6. Exercise Identity

### 6.1 Exercise Name

```
Bench Press
```

- Typography: 28sp, primary weight (heaviest weight in the type system)
- Placement: Immediately below the hero media, full-width with standard horizontal padding
- Never truncated: exercise names are short enough to fit on one line; two-line wrapping is permitted for long names
- Custom exercise indicator: If the exercise is a custom exercise, a subtle "Custom" secondary label appears below the name (14sp, muted, secondary color)

### 6.2 Primary Muscles

Displayed as chips immediately below the exercise name:

```
[Chest] [Triceps]  [+ Front Delt]
```

- Chip style: filled chips (warm-tinted background, primary text) — higher visual weight than secondary muscles
- Maximum 3 chips shown inline; if more than 3 primary muscles, the first 2 are shown as named chips and the remainder are condensed into "[+ N more]" — tapping the condensed chip expands to show all (inline expansion, no modal)
- Label: No section header above chips — the chips themselves communicate "primary muscles" by their visual treatment and position
- Spacing: 8pt vertical gap between exercise name and primary muscle chips

### 6.3 Secondary Muscles

Shown only when `secondaryMuscles.length > 0`:

```
Secondary  [Shoulders] [Core]
```

- Section label: "Secondary" — 12sp, muted text, preceding the chips on the same line
- Chip style: outlined chips (border only, no fill) — visually lighter than primary chips
- Same expansion behavior as primary: if > 3, condensed into "+ N more"
- Spacing: 6pt vertical gap between primary and secondary chip rows

### 6.4 Metadata Row

Equipment and difficulty are presented in a single line below muscles. Equipment leads; difficulty is subordinated as a trailing chip. This order reflects the athlete's decision sequence: equipment is a gating factor ("can I do this?"), difficulty is supporting context ("is this appropriate for my level?").

**Single-line layout (preferred):**

```
Barbell  ·  Squat Rack                    [● Intermediate]
```

Equipment is displayed as plain primary text, left-aligned. Difficulty is displayed as a trailing chip at the right end of the metadata row. The chip contains the colored dot and the difficulty label. The chip format visually subordinates difficulty without removing it.

**Two-line fallback (long equipment lists):**

```
Barbell  ·  Squat Rack  ·  Resistance Bands
[● Intermediate]
```

When equipment content exceeds available row width, difficulty moves to a second line as a standalone chip beneath the equipment text.

- **Equipment:** Primary equipment tag(s), human-readable, plain text. If multiple items, joined with middle dots (·) up to 3; "+ N more" for additional.
- **Difficulty chip:** Contains colored dot + label. Beginner=green, Intermediate=warm amber, Advanced=warm red. (Bronze not used — functional semantic colors.) Chip border and background match the outlined chip style used for secondary muscles — visually lighter than a filled chip.
- **Spacing:** 10pt vertical gap between muscles and metadata row.

**What is NOT shown in the metadata row:**
- Movement pattern (too technical for the identity surface)
- Environment tags (these are program-level metadata, not exercise-level display in W-22)
- Full equipment list beyond primary items

**Movement pattern availability:** Movement pattern data exists on the exercise entity but is not displayed in W-22's identity section. It is a taxonomy field for discovery (W-21 Browse Categories), not an educational label in the detail view. The athlete does not need to know "this is a push_horizontal exercise" — they need to know what it trains and how to do it.

### 6.5 Custom Exercise Identity Treatment

When W-22 displays a custom exercise:
- "Custom" label below exercise name (14sp, muted)
- Primary muscles: shown if set; hidden if not set (section absent)
- Secondary muscles: shown if set; hidden if not set
- Metadata row: shown if difficulty was set; hidden if not
- Hero media: `imageUrl` if uploaded; name initial placeholder if not
- All educational sections (whyItMatters, description, instructions, tips, commonMistakes): hidden if null — custom exercises are typically sparse
- Alternatives: hidden if none are formally linked (system alternatives not applicable to custom exercises in MVP)

A custom exercise W-22 may be very minimal: name, "Custom" label, and image (or placeholder). This is correct — the athlete created it; they understand it.

---

## 7. Why It Matters

### 7.1 Purpose

This section answers: "Why would I do this exercise? What will it do for me?"

It is not instructional. It is not a movement description. It is educational context — purpose, training adaptation, and situational relevance. (Architecture Amendment 001 — LOCKED.)

### 7.2 Placement and Visual Treatment

WHY IT MATTERS appears immediately after the identity block (name, muscles, metadata). It is the first text section the athlete reads. Its visual treatment must signal that it is distinct from the procedural content below.

**Section label:** "WHY IT MATTERS" — 11sp, uppercase, muted text, with a thin horizontal separator line above the section

**Body text visual treatment:**
- Text size: 17sp (larger than description, instructions, tips — this is the most important educational section)
- Line height: generous (1.5×)
- Color: primary text (highest contrast on dark background)
- A thin warm-accent left border (2pt, bronze or warm amber) runs the full height of the Why It Matters body copy
- This left border is the only bronze treatment on the screen and is used sparingly — reserved for this section only

```
─────────────────────────────────────────────────────
WHY IT MATTERS

▌  The Bench Press is one of the most effective
▌  exercises for developing upper-body pressing
▌  strength, chest development, and overall
▌  upper-body power. It is commonly used as a
▌  benchmark strength movement and serves as a
▌  cornerstone of many strength-training programs.
```

The left border (▌) is a thin warm-accent line, not a block — a subtle editorial accent, not a decorative element.

### 7.3 Content Expectations

Per Architecture § 4.1: Why It Matters is 1–4 sentences. It explains:
- Why the exercise exists
- What training adaptation it develops (strength, hypertrophy, endurance, athleticism, stability, movement quality)
- When an athlete would typically use it

Content is authored by the Forge Legacy content team for system exercises. Custom exercises will typically have `whyItMatters: null` — the section is hidden for them.

### 7.4 Visibility

Shown when `whyItMatters` is non-null and non-empty. Hidden entirely when null. No "Why It Matters not yet available" placeholder.

---

## 8. Description

### 8.1 Purpose

This section answers: "What is this exercise?"

It is a brief, factual identification of the exercise — what it is and its primary purpose. It is NOT a how-to (that is Instructions). It is NOT purpose-and-context (that is Why It Matters). (Architecture Amendment 001 field distinctiveness table — LOCKED.)

### 8.2 Section Label and Formatting

**Section label:** "ABOUT" — 11sp, uppercase, muted text, with a thin horizontal separator line above

**Body text:**
- Text size: 15sp
- Line height: 1.4×
- Color: primary text

```
─────────────────────────────────────────────────────
ABOUT

The Bench Press is a foundational barbell pressing
movement performed on a flat bench. The athlete lies
supine and presses a loaded barbell from chest height
to full arm extension.
```

### 8.3 Content Limits

Per Architecture § 4.1: 1–3 sentences. Not a how-to paragraph. Not a coaching essay.

### 8.4 Visibility

Shown when `description` is non-null and non-empty. Hidden when null.

---

## 9. Instructions (HOW TO DO IT)

### 9.1 Purpose

This section answers: "How do I perform this exercise?"

Ordered, step-by-step instructions. Each step is one actionable sentence.

### 9.2 Section Label and Formatting

**Section label:** "HOW TO DO IT" — 11sp, uppercase, muted, with separator above

**Step formatting:**

```
─────────────────────────────────────────────────────
HOW TO DO IT

  1   Set the barbell to shoulder height in the
      rack and load your working weight.

  2   Lie flat on the bench with your eyes
      directly below the bar.

  3   Grip the bar slightly wider than shoulder
      width, wrists straight.

  4   Unrack the bar and position it over
      your chest with arms fully extended.

  5   Lower the bar under control to mid-chest,
      keeping elbows at approximately 45°.

  6   Drive the bar back to full extension,
      exhaling through the press.

  7   Re-rack the bar after completing
      your final rep.
```

- Step number: 14sp, warm accent color (amber/bronze), monospace or tabular figures, left-aligned in a fixed-width column
- Step text: 15sp, primary text, indented to align with the start of the text (not the number)
- Generous vertical spacing between steps: 16pt
- Step numbers do not use bullet points, dashes, or parentheses — the number stands alone

### 9.3 No Icons Per Step

Steps do not have icons, images, or visual indicators per step. The numbered format is clean and sufficient. Adding icons would create a spreadsheet or instruction-manual feeling.

### 9.4 Content Limits

Per Architecture § 4.1: 4–8 steps for most exercises. Content team responsibility.

### 9.5 Visibility

Shown when `instructions.length > 0`. Hidden when empty.

---

## 10. Tips (COACHING CUES)

### 10.1 Purpose

This section answers: "What should I focus on while doing this?"

Coaching cues and technique notes. Unordered — these are equally important focal points, not a sequence. (Architecture § 4.1 — LOCKED.)

### 10.2 Section Label and Formatting

**Section label:** "COACHING CUES" — 11sp, uppercase, muted, with separator above

**Tip formatting:**

```
─────────────────────────────────────────────────────
COACHING CUES

  —   Keep your feet flat on the floor and
      your lower back in a neutral arch.

  —   Squeeze your shoulder blades together
      before unracking the bar.

  —   Drive your feet into the floor through
      the press to create full-body tension.

  —   Control the descent — the lowering
      phase is where the work happens.
```

- Dash (—): warm accent color em dash, left-aligned in a fixed-width column matching the instruction step number column
- Tip text: 15sp, primary text, indented to align with text start
- Vertical spacing: 14pt between tips
- No numbers — these are unordered

### 10.3 The Em Dash as Visual Language

The em dash (—) is used consistently across COACHING CUES and WATCH OUT FOR. It is a subtle warm-accent typographic element — not a bullet, not a checkmark, not an icon. It reinforces Forge Legacy's editorial character without introducing icon complexity.

### 10.4 Content Limits

Per Architecture § 4.1: 2–5 tips per exercise.

### 10.5 Visibility

Shown when `tips.length > 0`. Hidden when empty.

---

## 11. Common Mistakes (WATCH OUT FOR)

### 11.1 Purpose

This section answers: "What should I avoid?"

Framed as descriptions of what to avoid — not as corrections of what the athlete is doing wrong. No shame, no urgency, no "don't" language. (Architecture § 4.1, Product DNA "Accountability Without Shame.")

### 11.2 Section Label and Formatting

**Section label:** "WATCH OUT FOR" — 11sp, uppercase, muted, with separator above

**Mistake formatting:**

```
─────────────────────────────────────────────────────
WATCH OUT FOR

  —   Letting the elbows flare wide — keep
      them at approximately 45° from the torso.

  —   Bouncing the bar off the chest. Control
      the descent and reverse at the bottom.

  —   Losing contact with the bench through
      the lower back during the press.
```

- Same em dash (—) as COACHING CUES — same visual language, same formatting
- Text: 15sp, primary text
- No icons indicating danger, caution, or warning — these are educational notes, not hazard labels

### 11.3 Tone

Mistakes are framed descriptively, not correctively:
- ✓ "Allowing the wrists to bend back under load"
- ✗ "Don't let your wrists bend" (imperative, implies the athlete is doing it wrong)
- ✓ "Excessive bar path forward or backward off the chest"
- ✗ "You're probably pressing the bar in the wrong direction"

The Forge Legacy athlete is trusted. The tone is "here's what to watch for," not "here's what you're doing wrong."

### 11.4 Content Limits

Per Architecture § 4.1: 2–4 mistakes per exercise.

### 11.5 Visibility

Shown when `commonMistakes.length > 0`. Hidden when empty.

---

## 12. Alternatives

### 12.1 Purpose

This section presents exercises that serve a similar training purpose or can be substituted for the current exercise. It is the last section — after the athlete has fully consumed the exercise's content and assessed whether this is the right exercise for them.

### 12.2 Section Label

**Section label:** "ALTERNATIVES" — 11sp, uppercase, muted, with separator above

### 12.3 Alternative Exercise Card

Alternatives are displayed as a horizontal scroll row of exercise cards — the same card anatomy used in W-21 MY EXERCISES horizontal rows:

```
ALTERNATIVES

[Dumbbell    ] [Incline     ] [Push-Up     ]  →
[Bench Press ] [Bench Press ] [             ]
```

Each alternative card:
```
┌──────────────────────┐
│                      │
│  [thumbnail — static]│  ← gifThumbnailUrl, static (not animated — § 12.5)
│                      │
│  Dumbbell            │  ← Exercise name, 13sp, primary weight
│  Bench Press         │
│                      │
│  [Chest] [Triceps]   │  ← Primary muscles, 11sp, muted chips
│                      │
└──────────────────────┘
```

- Card width: ~36% screen width — 2.6 cards visible, signaling horizontal scroll
- Thumbnail: static (`gifThumbnailUrl`), NOT animated — GIF autoplay is W-22 detail only; alternatives are presented as selection-ready cards, not playing content
- Exercise name: 13sp, primary weight, max 2 lines
- Primary muscles: chips, max 2 shown

### 12.4 Alternative Card Tap — Navigation

Tapping an alternative exercise card navigates to **W-22 for the alternative exercise** — a new W-22 instance is pushed onto the navigation stack.

```
W-21 Grid → W-22 Bench Press → [tap Dumbbell Bench Press in Alternatives] → W-22 Dumbbell Bench Press
```

Back from "W-22 Dumbbell Bench Press" → returns to "W-22 Bench Press" (at the Alternatives section position, scroll preserved).
Back from "W-22 Bench Press" → returns to W-21 (at the exercise card that was originally tapped).

The navigation stack handles this correctly. W-22 is a standard pushable destination — there is no special routing logic for alternatives.

### 12.5 Alternative Thumbnail — Not Animated

GIF autoplay is reserved for the W-22 Hero Media of the **currently viewed exercise**. Alternative exercise cards in the Alternatives row are not currently-viewed exercises — they are selection options. Their thumbnails are static (`gifThumbnailUrl`), consistent with exercise card behavior throughout Forge Legacy (W-21, W-23).

The "currently viewed exercise" is the one whose W-22 is open. Once the athlete taps an alternative and that W-22 opens, the GIF for that exercise autoplays as the new hero.

### 12.6 Alternatives Data Source

Per Architecture § 2.6 (LOCKED): The relationship is bidirectional. Exercise B is an alternative of A if:
- `A.alternativeExerciseIds.includes(B.id)` OR
- `B.alternativeExerciseIds.includes(A.id)`

W-22 resolves the complete bidirectional set at display time. The ALTERNATIVES section shows all resolved alternatives.

### 12.7 Maximum Alternatives Shown

No hard maximum. All resolved alternative exercises are shown in the horizontal scroll row. If the list is long, the horizontal scroll accommodates.

**Empty state:** Hidden section. If `alternativeExerciseIds.length === 0` and no reverse links exist, ALTERNATIVES is not shown. No "No alternatives available" message.

### 12.8 Favorite State on Alternative Cards

Alternative exercise cards do NOT show a favorite icon. They are selection-to-navigate cards, not cards the athlete interacts with in place. Favoriting happens at the target W-22 after navigation.

---

## 13. Favorite Behavior

### 13.1 Favorite Icon Placement

The Favorite icon is in the sticky header, trailing edge — always visible regardless of scroll position.

```
[← ]   [Exercise Name]                             [♡ / ♥]
```

The header position ensures the athlete can always favorite an exercise without scrolling back to the top. This is especially important for longer exercises where the athlete might scroll through all sections before deciding to save.

### 13.2 Favorite States

| State | Visual | Accessible Label |
|-------|--------|-----------------|
| Not favorited | Heart icon, outline, muted | "Add Bench Press to Favorites" |
| Favorited | Heart icon, filled, warm accent color | "Remove Bench Press from Favorites" |

Transition between states: instant fill/unfill with a subtle spring animation (50ms) — tactile feedback without ostentation.

### 13.3 Toggling

Single tap on the heart icon toggles the favorite state. No confirmation required for either direction — this is a non-destructive, reversible action. The exercise is not deleted; only the athlete's personal Favorites list changes.

### 13.4 Persistence

Favorite state is immediately reflected on W-21 return. If the athlete navigates back from W-22 having just favorited an exercise, the Favorites row in W-21 (MY EXERCISES) immediately includes that exercise. No refresh required — local state updates synchronously.

### 13.5 Offline Behavior

Favorite state changes are stored locally and synced when connectivity resumes. The athlete can favorite an exercise offline — the local state updates immediately; the server sync queues.

---

## 14. Empty States

### 14.1 Individual Section Absent (Content Null)

Any section (WHY IT MATTERS, ABOUT, HOW TO DO IT, COACHING CUES, WATCH OUT FOR, ALTERNATIVES) is hidden when its content is null or empty. No placeholder card, no "Not available" message. The absent section simply does not occupy space.

This is the correct behavior for:
- System exercises being incrementally populated (new exercises added to catalog with partial content)
- Custom exercises (typically sparse)

### 14.2 No Content Sections Present (Minimal Exercise)

A custom exercise with only a name:
- Hero media: name initial placeholder
- Exercise name: displayed
- "Custom" label: displayed
- All content sections: absent
- No UI elements indicating content is "coming" or "unavailable"

This is a valid state. The athlete created this exercise; they understand it.

### 14.3 Alternatives Absent

ALTERNATIVES section not shown when there are no alternative exercises. No "No alternatives found" message. The screen ends at whichever content section was last.

### 14.4 System Exercise With Incomplete Data

If a system exercise is added to the catalog before all content fields are populated, only the available fields render. The athlete does not see gaps or placeholders. This allows incremental content publishing.

---

## 15. Loading States

### 15.1 Initial W-22 Load

On W-22 entry (from any source):

```
┌─────────────────────────────────────────────────────┐
│  [← ]   Exercise Library                       [♡?] │  ← Header visible immediately
├─────────────────────────────────────────────────────┤
│  [████████████████████████████████████]             │  ← GIF area: dark skeleton shimmer
│  [████████████████████████████████████]             │
│  [████████████████████████████████████]             │
│                                                     │
│  [████████████████]                                 │  ← Name skeleton
│  [████] [████] [████]                               │  ← Muscle chip skeletons
│  [███████████████████████████████]                  │  ← Content skeleton rows
│  [█████████████████████]                            │
│  [████████████████████████████]                     │
└─────────────────────────────────────────────────────┘
```

- Header: appears immediately (navigation chrome, no data required)
- Favorite icon: shown in indeterminate state (outline heart, muted) until exercise data loads; updates to correct state on data load
- Hero area: skeleton shimmer at the 16:9 aspect ratio
- Content below: skeleton shimmer rows suggesting the layout
- Skeleton → content: smooth crossfade

If content loads in < 200ms: skeleton suppressed entirely (no flicker).

### 15.2 GIF Loading (After Exercise Data Loads)

When exercise data loads:
- Text content renders immediately
- Hero area: `gifThumbnailUrl` renders (likely already cached from W-21 card)
- GIF loads in the background; when ready, crossfades from thumbnail to GIF and begins playing
- If thumbnail is not cached: dark name-initial placeholder → GIF (direct transition when GIF loads)

### 15.3 Alternatives Row Loading

The ALTERNATIVES section renders after the primary exercise data. Alternative exercise records are fetched as secondary requests:
- Section label appears
- Alternative cards show skeleton state (card-shaped shimmers) while alternative data loads
- When alternative data arrives: smooth fill from skeleton to card content

If no alternatives exist (or the fetch returns empty): section disappears quietly.

### 15.4 Reduce Motion Loading

When Reduce Motion is enabled:
- Skeleton shimmer is replaced with static muted placeholders (no animation)
- Crossfades are instant (no transition animation)
- GIF remains static (§ 5.6)

---

## 16. Offline Behavior

### 16.1 Cached Exercise

When the athlete previously opened W-22 for this exercise and data was cached:
- Full content renders normally
- GIF plays from cache if cached; thumbnail used if GIF is not cached
- No offline indicator shown (cached data is complete; the experience is seamless)

### 16.2 Uncached Exercise (Full Offline)

When the athlete opens W-22 for an exercise they have not previously viewed while offline:

```
┌─────────────────────────────────────────────────────┐
│  [← ]   Exercise Library                       [♡]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Dark placeholder — name initial]                  │  ← No media loaded
│                                                     │
│  Bench Press                                        │
│                                                     │
│  ─────────────────────────────────────────────      │
│  ⚠  Full content unavailable offline.               │
│     Connect to load this exercise.                  │
│  ─────────────────────────────────────────────      │
│                                                     │
│  (if partial data available from W-21 card)         │
│  [Chest] [Triceps]      [● Intermediate]            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

- Exercise name: shown (available from W-21 card data that was used to navigate)
- Hero media: name initial placeholder
- Muscle chips and difficulty: shown if the W-21 card carried this data
- All content sections (WHY IT MATTERS through ALTERNATIVES): not shown
- Offline notice: inline, non-blocking, below the identity block
- Favorite icon: functional — the athlete can favorite even offline (syncs later)

### 16.3 Offline Alternative Navigation

If the athlete attempts to navigate to an alternative exercise while offline, and that alternative is not cached:
- The alternative card is tappable
- W-22 opens for the alternative in the uncached offline state (§ 16.2)
- No pre-flight check before navigation — the tap always fires; the offline state is revealed on arrival

---

## 17. Accessibility

### 17.1 Touch Targets

| Element | Minimum |
|---------|---------|
| Back navigation | 44pt |
| Favorite icon | 44pt tap area (extended beyond visual icon size) |
| Muscle chip ("+ N more") | 44pt tap area |
| Alternative exercise card | 48pt height |

### 17.2 Screen Reader Labels

| Element | Accessible Label |
|---------|----------------|
| Hero GIF (playing) | "[Exercise Name] demonstration, animated" |
| Hero GIF (static — Reduce Motion) | "[Exercise Name] demonstration, still image" |
| Hero placeholder (no media) | "[Exercise Name] — no demonstration available" |
| Favorite icon (unfavorited) | "Add [Exercise Name] to Favorites" |
| Favorite icon (favorited) | "[Exercise Name] is in your Favorites. Double-tap to remove." |
| Primary muscle chip | "[Muscle Name], primary target" |
| Secondary muscle chip | "[Muscle Name], secondary target" |
| "+ N more" chip (muscles) | "[N] additional muscles — double-tap to expand" |
| Difficulty chip | "[Level] difficulty" |
| Section heading "WHY IT MATTERS" | Announced as heading |
| Section heading "HOW TO DO IT" | Announced as heading |
| Step number + text | "[Number]. [step text]" — announced as a single unit |
| Tip / Mistake line | "[text]" — dash is not announced |
| Alternative card | "[Exercise Name], [Primary Muscles], double-tap to view" |
| Offline notice | "Content unavailable offline" |

### 17.3 Focus Order

Focus follows the visual top-to-bottom reading order:
1. Back navigation
2. Favorite icon
3. Hero media (as an image element)
4. Exercise name
5. Primary muscle chips (left to right)
6. Secondary muscle chips (if present)
7. Equipment text, then difficulty chip
8. WHY IT MATTERS heading, then body text
9. ABOUT heading, then body text
10. HOW TO DO IT heading, then each numbered step
11. COACHING CUES heading, then each tip
12. WATCH OUT FOR heading, then each mistake
13. ALTERNATIVES heading, then alternative cards (left to right in horizontal scroll)

### 17.4 Reduce Motion

- GIF does not autoplay; `gifThumbnailUrl` shown as static image
- No animation on favorite state toggle
- No crossfade transitions on load — content appears directly
- Alternative cards: no animation

### 17.5 Content Accessibility

**Instructions (HOW TO DO IT):** Rendered as an ordered list (`<ol>` equivalent) so screen readers announce "1 of 7," "2 of 7," etc.

**Tips and Mistakes (COACHING CUES, WATCH OUT FOR):** Rendered as unordered lists. The em dash is decorative — the list item text is the announced content.

**Primary/Secondary muscles:** Chips are interactive when they have a "show more" action; non-interactive otherwise. Non-interactive chips are announced as plain text, not buttons.

**Difficulty chip:** Announced as "[Level] difficulty" — a single accessible label encompassing both the dot (decorative) and the text label.

---

## 18. Navigation Specification

### 18.1 Entry Navigation

W-22 receives a push navigation from any entry point (W-21 grid, row, search, collection, etc.). The transition is a standard horizontal push (right-to-left).

### 18.2 Sticky Header — Source Context Label

The sticky header's center text changes based on scroll position and source context:

| Scroll Position | Header Center Text |
|----------------|-------------------|
| At top of page (exercise name visible in content) | Source context: "Exercise Library" (from W-21) or "Alternatives" (from W-22) |
| Scrolled past exercise name | Current exercise name collapses into header |

This collapse pattern confirms to the athlete which exercise they are viewing without requiring them to scroll back to the top.

### 18.3 Back Navigation

Standard back swipe (gesture) or back button in header. Returns to the source screen:
- From W-21 → back to W-21 at the scroll position of the originating exercise card
- From W-22 (alternative) → back to the prior W-22 at the ALTERNATIVES section scroll position

Back navigation does not trigger any saves, writes, or events. The athlete's favorite state is already updated in real-time (§ 13.4) — no save-on-exit pattern.

### 18.4 W-22 → W-22 (Alternative Exercise Navigation)

Tapping an alternative exercise card:
1. Pushes a new W-22 instance for the alternative exercise onto the navigation stack
2. The header center text on the new W-22 shows "Alternatives" (indicating the source was an alternatives row)
3. The new W-22 loads fully — GIF autoplays, full content renders
4. Back from the new W-22 → returns to the prior W-22

This creates a natural "explore by alternatives" path. The navigation stack correctly unwinds. No special routing is needed — W-22 is a standard push destination.

**Maximum alternative depth:** No enforced limit. The athlete may navigate through multiple levels of alternatives (W-22 A → W-22 B → W-22 C). The native navigation stack handles back navigation correctly. In practice, the athlete is unlikely to go more than 1–2 levels deep.

### 18.5 No Navigation From Content Sections

None of the content sections (WHY IT MATTERS, ABOUT, HOW TO DO IT, COACHING CUES, WATCH OUT FOR) contain tappable links or navigation triggers. The content is read-only text. The only in-screen navigation from W-22 is the Alternatives row.

---

## 19. Non-Behaviors

W-22 does not and will never:

| Non-Behavior |
|-------------|
| Add an exercise to an active workout (that is W-23) |
| Log a set or start a workout |
| Create a workout template (that is W-24) |
| Show the athlete's workout history for this exercise |
| Show PR records, personal bests, or performance data |
| Show how many times the athlete has done this exercise |
| Show which chapter or program the athlete last used this exercise in |
| Create timeline entries, workout records, chapter activity, honors, rank progress, accomplishments, or legacy events (Architecture Amendment 001 § 4.6, LOCKED) |
| Play GIF animations on alternative exercise cards (thumbnails only — § 12.5) |
| Show social data (how many athletes have favorited this exercise, popularity rankings) |
| Suggest this exercise based on training history or goals |
| Compare the athlete's performance against others |
| Show a "last used" date or recency indicator |
| Animate GIFs on alternative cards (ED-5 — autoplay only in the W-22 hero of the current exercise) |
| Show a "Trained X times" count or any aggregate usage data |
| Display comments, reviews, or community ratings |
| Allow editing the exercise content (system exercises are read-only; custom exercise editing is a future feature) |
| Show notifications, pending partner tags, or honor alerts |
| Require internet connectivity to display the Favorite state |
| Display gap-shaming language or accountability prompts |
| Show alternative exercises' full content inline (alternatives navigate to their own W-22) |
| Surface "Used In" program or chapter relationships (rejected candidate — see § 21 W22-D15 rationale) |

---

## 20. Validation Checklist

### Screen and Navigation
- [ ] W-22 accessible from all W-21 surfaces (grid, Favorites row, Recents row, search results, Collection Detail, See All Favorites)
- [ ] W-22 accessible from W-22 Alternatives row (alternative exercise navigation)
- [ ] Back navigation returns to source screen at correct position
- [ ] W-22 → W-22 (alternative) pushes new instance; back correctly returns to prior W-22
- [ ] Sticky header: center text updates from source context to exercise name on scroll

### Hero Media
- [ ] GIF autoplays on W-22 entry without user action
- [ ] GIF loops continuously while W-22 is visible
- [ ] GIF pauses when app is backgrounded; resumes on return
- [ ] No playback controls shown
- [ ] Fallback chain: gif → video → image → name initial placeholder
- [ ] Static thumbnail shown during GIF load; crossfade to GIF on load
- [ ] Reduce Motion: GIF not animated; thumbnail shown as static image
- [ ] Hero area: full-width 16:9 aspect ratio, edge-to-edge

### Exercise Identity
- [ ] Exercise name: 28sp primary weight, immediately below hero
- [ ] Custom exercise: "Custom" label below name
- [ ] Primary muscles: filled chips; max 3 shown; "+ N more" if additional
- [ ] Secondary muscles: outlined chips; hidden when none; "Secondary" label preceding
- [ ] "+ N more" chip expands inline on tap
- [ ] Metadata row: equipment displayed first (plain text), difficulty displayed as trailing chip
- [ ] Single-line preferred; two-line fallback when equipment list is long
- [ ] Difficulty chip: colored dot + label, outlined chip style
- [ ] Difficulty: Beginner=green, Intermediate=amber, Advanced=red (not bronze)
- [ ] Movement pattern NOT displayed in identity section

### WHY IT MATTERS
- [ ] Section appears immediately after identity block
- [ ] 17sp body text, generous line height
- [ ] Thin warm-accent left border runs height of body copy
- [ ] Section hidden when `whyItMatters` is null
- [ ] No placeholder when absent

### ABOUT (Description)
- [ ] Appears after WHY IT MATTERS (or after identity if WHY IT MATTERS absent)
- [ ] 15sp body text
- [ ] Section hidden when `description` is null

### HOW TO DO IT (Instructions)
- [ ] Ordered numbered steps
- [ ] Step numbers in warm accent color
- [ ] Step text indented, 15sp
- [ ] Generous vertical spacing between steps (16pt)
- [ ] No icons per step
- [ ] Section hidden when `instructions` is empty

### COACHING CUES (Tips)
- [ ] Em dash (—) in warm accent color preceding each tip
- [ ] 15sp body text, indented
- [ ] Unordered (no numbers)
- [ ] Section hidden when `tips` is empty

### WATCH OUT FOR (Common Mistakes)
- [ ] Same em dash (—) treatment as COACHING CUES
- [ ] Framing is descriptive, not corrective
- [ ] No warning/caution icons
- [ ] Section hidden when `commonMistakes` is empty

### Alternatives
- [ ] Horizontal scroll row of exercise cards
- [ ] Each card: static thumbnail, exercise name, primary muscle chips
- [ ] Alternative card thumbnails NOT animated (static gifThumbnailUrl)
- [ ] Tapping alternative card → pushes W-22 for that exercise
- [ ] Section hidden when no alternatives exist
- [ ] No "No alternatives" message

### Favorites
- [ ] Heart icon in sticky header, always visible
- [ ] Outline = not favorited; filled warm accent = favorited
- [ ] Single tap toggles state (no confirmation)
- [ ] State update reflected immediately on W-21 return
- [ ] Works offline (queues sync)

### Empty and Loading States
- [ ] Individual absent sections: hidden, no placeholder
- [ ] Custom exercise with no content: name + "Custom" label only (graceful)
- [ ] Initial load: skeleton shimmer at correct proportions
- [ ] GIF load: thumbnail → crossfade → GIF playing
- [ ] Alternatives load: skeleton cards → filled cards
- [ ] Reduce Motion: no shimmer animation; static placeholders

### Offline Behavior
- [ ] Cached: full content renders normally
- [ ] Uncached: name initial placeholder + identity data from W-21 card + offline notice
- [ ] Offline notice: inline, non-blocking
- [ ] Favorite toggling works offline (syncs later)
- [ ] Alternative card tap while offline: navigates to W-22 in uncached offline state

### Accessibility
- [ ] Hero GIF: "demonstration, animated" / "demonstration, still image" / "no demonstration"
- [ ] Favorite icon: includes exercise name in accessible label, reflects favorited state
- [ ] Instructions: announced as ordered list ("1 of 7", "2 of 7"...)
- [ ] Tips/Mistakes: announced as unordered list; em dash not announced
- [ ] Muscle chips: announced with "primary target" or "secondary target"
- [ ] Difficulty chip: announced as "[Level] difficulty"
- [ ] "+ N more": announced as interactive element
- [ ] All touch targets meet minimums
- [ ] Reduce Motion: GIF static, no crossfades, no animations

### Non-Behaviors
- [ ] No workout logging or exercise selection
- [ ] No performance data, PRs, or history
- [ ] No timeline, chapter, honor, or rank events from W-22
- [ ] No animated GIFs on alternative cards
- [ ] No social/community data
- [ ] No "Used In" program or chapter relationships

---

## 21. Decisions Record

| Decision | Value |
|----------|-------|
| W22-D1 — GIF presentation | Full-width, edge-to-edge, 16:9 aspect ratio. No rounded corners, no card framing. Rationale: cinematic first impression; the movement is the hero, not a data item in a card. |
| W22-D2 — GIF fallback placeholder | Dark background with exercise name initial in large warm text. Rationale: coherent with Forge Legacy dark aesthetic; avoids broken-image feel. |
| W22-D3 — Sticky header source label | Shows "Exercise Library" (from W-21) or "Alternatives" (from W-22 alternatives). Collapses to exercise name after scrolling past the name. Rationale: the athlete always knows where they are and where they came from without scrolling. |
| W22-D4 — Favorite icon in header | Always visible in sticky header. Rationale: the athlete should be able to favorite at any scroll position; placing it only in the identity section would require scrolling back. |
| W22-D5 — Movement pattern not displayed | Movement pattern is a discovery taxonomy field (W-21 Browse Categories), not an educational label in the detail view. The athlete does not need "push_horizontal" — they need to know what it trains and how. |
| W22-D6 — WHY IT MATTERS visual treatment | 17sp text (larger than other content sections) + thin warm-accent left border. Rationale: the most important educational section earns the most prominent typography; the left border is the single bronze/warm accent use on the screen, used sparingly per Product DNA. |
| W22-D7 — Section labels | "HOW TO DO IT," "COACHING CUES," "WATCH OUT FOR," "ABOUT," "WHY IT MATTERS," "ALTERNATIVES" — not generic "Instructions," "Tips," "Description." Rationale: label language reinforces the coaching voice; avoids encyclopedia or database register. |
| W22-D8 — Em dash (—) as list marker | Used across COACHING CUES and WATCH OUT FOR. Warm accent color. Rationale: editorial, premium typographic treatment — not a bullet point or icon. Consistent across both sections. |
| W22-D9 — Alternative card thumbnails static | Alternatives are selection-to-navigate cards, not currently-viewed exercises. GIF autoplay is reserved for the hero of the current exercise only (ED-5). |
| W22-D10 — Alternatives navigation model | Tap alternative → pushes W-22 for alternative on stack. Back correctly unwinds. No special routing logic needed. Rationale: W-22 is a standard pushable destination; the nav stack handles the rest. |
| W22-D11 — Favorite state offline | Persisted locally; syncs when connectivity resumes. Rationale: the athlete should never feel like the network is gating a simple personal preference. |
| W22-D12 — Muscle chip "show more" | Tapping "+ N more" expands inline — no modal, no new screen. Rationale: minimal navigation depth for an informational interaction. |
| W22-D13 — Absent sections: hidden, not placeholder | All optional sections hidden when null or empty. No "coming soon" or "not available" states. Rationale: clean progressive rendering; absent is cleaner than a placeholder; content team populates incrementally. |
| W22-D14 — Custom exercise W-22 | Minimal W-22 for custom exercises: name, "Custom" label, image (or placeholder), whatever fields the athlete populated at creation. No prompts to "complete" the exercise profile. Rationale: the athlete created it; they understand it. |
| W22-D15 — Equipment leads, difficulty supports | Equipment is the primary actionable metadata signal; difficulty is supporting educational context. Equipment displayed as plain primary text leading the metadata row. Difficulty displayed as a trailing outlined chip — same style as secondary muscle chips — which subordinates it visually without removing it. Rationale: athletes evaluate equipment first (gating factor: "can I do this here?") and difficulty second (context: "is this appropriate for my level?"). The colored dot inside the chip preserves the semantic color signal without dominating the row. "Used In" (program/chapter relationships) rejected as a W-22 candidate — W-22 is a pure educational surface; relational data belongs in program-level views (W-3) or future profile screens. Approved: W22-R1 review, June 2026. |

---

## 22. Change Log

| Version | Date | Change |
|---------|------|--------|
| v1.0 | June 2026 | Initial specification. Implements locked content order (Architecture § 4.4). Implements WHY IT MATTERS (Architecture Amendment 001). Implements GIF autoplay (ED-5). Implements alternatives model (Architecture § 2.6). |
| v1.0 (R1) | June 2026 | W22-R1 resolved. Option B accepted. Equipment leads metadata row as plain text; difficulty moves to trailing outlined chip. Two-line fallback approved for long equipment lists. W22-D15 added. "Used In" rejected as W-22 candidate. Status: LOCKED. |

---

*W-22 Exercise Detail — Wireframe Specification v1.0*
*Forge Legacy | June 2026*
