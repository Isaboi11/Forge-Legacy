# UI Polish Review — whole app

**Date:** 2026-08-26
**Standard:** `better-ui` (interfaces plugin, jakubkrehel/skills v1.6.2)
**Scope:** all 92 route files in `src/app` + ~200 components in `src/components`
**Verdict:** **Block** — two HIGH findings remain.

---

## Verification

Read from code only. **Not verified:** motion replayed at 10% speed, hover/focus/active
states walked in a running app, on-device feel. Every finding below is a value read from
source, not an observed frame.

**Authority caveat.** `Button.dc.html` is **not in the repo** — `_buttonTokens.ts:3` points at
a remote claude.ai design project (`7b89a003`). The press-scale values in the button
components may be transcribed verbatim from that `.dc`. Per PD-7 the design governs, so
finding #3 needs a check against the `.dc` before any value changes.

---

## HIGH

### Give high-frequency interactions instant feedback

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| HIGH | `src/app/workout.tsx:3372` (`checkCurrent`) | `<Pressable style={styles.checkCurrent}>` — no pressed state | Add a pressed style: `scale 0.96` + border/background shift | The single most-tapped control in the app acknowledges nothing until the data round-trips. Mid-set, one-handed, the athlete cannot tell the tap registered. |
| HIGH | `src/app/workout.tsx:3344` (`checkDoneBtn`) | same — no pressed state | same | Un-completing a set has the same dead feel. |
| HIGH | `src/app/workout.tsx` (whole file) | 54 `Pressable`/`TouchableOpacity`, **3** with a pressed style | Every interactive element gets a pressed state | Active Workout is the screen users spend the most time in and it has the least press feedback of any screen. |

Adjacent, out of scope for this skill (`better-accessibility` owns it): `checkCurrent` is
`34×34` (`workout.tsx:5060`), `checkDoneBtn` and `checkPending` are `26×26` — all below the
44pt minimum hit area.

### Motion is never the only feedback channel

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| HIGH | `src/domain/settings/preferences.ts:21,69` | `haptics: boolean` defaults `true`; Settings shows the toggle | Either implement `expo-haptics` or remove the control | `expo-haptics` is **not in `package.json`** and appears in **0** files. The code says so itself: *"the app has no haptics layer"* (`preferences.ts:8`). The one vibration is web-only (`workout-complete.tsx:460`). A settings toggle that changes nothing on device. |

For a gym app this is the missing channel that matters most — completing a set with sweaty
hands, without looking, is exactly where a haptic tick does the work a visual cue cannot.

---

## MEDIUM

### Scale on press — always `0.96`

Seven distinct values app-wide, none of them `0.96`. `0.995` on a 52pt control is a
0.26pt shift: a frame of cost for something invisible.

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `app/competitions.tsx:598`, `app/create-challenge.tsx:853` | `scale: 0.995` | `scale: 0.96` | Below perception. |
| MEDIUM | `app/discover-squads.tsx:527` | `scale: 0.992` | `scale: 0.96` | |
| MEDIUM | `app/competitions.tsx:525`, `discover-squads.tsx:567`, `squad/[id].tsx:1679`, `squad-preview.tsx:640`, `squad-records.tsx:357` | `scale: 0.99` | `scale: 0.96` | |
| MEDIUM | `app/photos.tsx:755` | `scale: 0.985` | `scale: 0.96` | |
| MEDIUM | `app/squad-composer.tsx:961`, `squad-requests.tsx:541`, `buttons/DestructiveButton.tsx:59`, `buttons/IconButton.tsx:64`, `buttons/SecondaryButton.tsx:58` | `scale: 0.98` | `scale: 0.96` | |
| MEDIUM | `buttons/PrimaryButton.tsx:59`, `buttons/FloatingActionButton.tsx:63`, `forge/LegacyArchiveBand.tsx:292` | `scale: 0.975` | `scale: 0.96` | |
| MEDIUM | `app/squad-invite.tsx:532`, `app/trophy-case.tsx:510` | `scale: 0.97` | `scale: 0.96` | |
| MEDIUM | `buttons/GhostButton.tsx:57` | opacity only, **no scale** | Add `scale: 0.96` | Ghost is the one button variant that feels different under the thumb. |

### Bounce is always `0`

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | `DestructiveButton.tsx:63`, `IconButton.tsx:68`, `PrimaryButton.tsx:63`, `SecondaryButton.tsx:62` | `bounciness: 2` | `bounciness: 0` | Press-in is correctly `0`; release overshoots. Asymmetric, and it charges its attention cost on every tap. |
| MEDIUM | `FloatingActionButton.tsx:67` | `bounciness: 3` | `bounciness: 0` | Also inconsistent with the other five. |
| MEDIUM | `app/workout.tsx:4641` | `Animated.spring(s, { friction: 4 })` | damped, no overshoot | Bounce inside Active Workout. |

### One stroke weight per icon set

**26 distinct `strokeWidth` values across 129 files.** The top four — `2` (124×), `1.8` (110×),
`1.7` (66×), `1.9` (63×) — are visually near-identical and mutually inconsistent.

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | 129 files, inline `<Svg>` | 26 widths: `0.9 1 1.1 1.2 1.4 1.5 1.6 1.7 1.8 1.9 2 2.1 2.2 2.3 2.4 2.5 2.6 2.8 3 3.4 4 13 15 20 26 42` | `1.5` beside regular text, `2` beside semibold | Icons drift in optical weight screen to screen. |
| MEDIUM | `(tabs)/index.tsx:93`, `(tabs)/workouts.tsx:861-882`, `(tabs)/legacy.tsx:708` and 40 more | `strokeLinecap="square"` + `strokeLinejoin="miter"` (44×) | pick one | **407 icons use `round`, 44 use `square`.** Two icon personalities — and the square ones are on Home and Workouts, the two most-visited tabs. |

### One icon library per surface

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | 129 files inline `<Svg>` vs 37 files `Feather` from `@expo/vector-icons` | two systems, zero overlap | consolidate on `ForgeSymbol` | No file uses both, so surfaces are internally consistent — but the app has two icon vocabularies with different construction. |

### Image outlines

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| MEDIUM | 57 files with `<Image>` / `expo-image` | **0** have a border or outline | `1px` white at `0.1` alpha (dark), black at `0.1` (light) | Photos — progress shots, avatars, exercise demos — sit edge-to-edge on the surface with no separation. Forge is a dark theme, so a dark photo edge dissolves into the card. |

---

## LOW

### Concentric border radius / token discipline

`flRadius` is `xs 6 · sm 8 · md 10 · lg 12 · xl 16 · pill 999 · round 9999`
(`constants/foundation.shared.ts:15`). Raw values off that scale appear throughout:
`13` (14×), `9` (7×), `20` (7×), `17` (6×), `7` (5×), `5` (5×), `14` (5×), `3` (13×), `1` (13×).

Also three different ways to say "circle": `99` (34×), `999` (15×), `9999` (9×).

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | app-wide, 1183 `borderRadius` declarations | raw numbers off the token scale | `flRadius.*` | Nested radii can't stay concentric when the outer value isn't on the scale. |
| LOW | app-wide | `99` / `999` / `9999` | `flRadius.round` | Three spellings of one intent. |

### Split and stagger enter animations

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | app-wide | **2** `delay:` values total (`200`, `120`) | ~100ms stagger on infrequent staged entrances | Ceremonies and Legacy chapter reveals are exactly the infrequent, hierarchy-communicating entrances this is for. Everything currently arrives at once. |

### Performance

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| LOW | `src/app/workout.tsx:4750` | `duration: 1200, useNativeDriver: false` | move to a native-drivable property, or shorten | 1.2s on the JS thread during an active workout, where set logging is also contending for it. The other six `useNativeDriver: false` sites animate width/colour, which the native driver genuinely can't do — those are fine. |

---

## Not applicable to React Native

Rules in `better-ui` that assume a browser, recorded so they aren't re-litigated:
`will-change`, `transition-property`, CSS keyframes vs transitions, `currentColor`
recolouring, `AnimatePresence initial={false}`, and theme-switch transition suppression
(Alabaster is reload-not-toggle, so no transitions fire).

---

## Recommended order

1. Press feedback on Active Workout's set controls — HIGH, one screen, biggest daily impact.
2. Decide haptics: implement `expo-haptics` or remove the Settings toggle — HIGH, currently a control that lies.
3. Icon `strokeLinecap` split on Home/Workouts — MEDIUM, most visible inconsistency.
4. Press-scale consolidation — MEDIUM, but check `Button.dc.html` first (PD-7).
5. The rest as capacity allows.

---

# Outcome — same pass, 2026-08-26

Gates: `tsc` clean · `expo lint` at baseline (1 error + 13 warnings, all pre-existing in
`use-color-scheme.web.ts`) · `ecosystem.test.mjs` 16/16.

## Fixed

**Active Workout press feedback.** 27 controls on `workout.tsx` went from inert to answering the
thumb at `scale: 0.96` — the set-complete and un-complete circles, the weight and actual-reps
cells (all three row states), the rest-timer ±15/pause/skip cluster in both the mini and full
layouts, the exercise arrows, Add Set, Add Round, the hero and overflow buttons, the overview
button and the picker toggle. Each carries a colour or opacity shift alongside the transform, so
the confirmation survives Reduce Motion.

**Haptics is real.** `expo-haptics@~56.0.3` installed; `src/lib/haptics.ts` (native) and
`src/lib/haptics.web.ts` (`navigator.vibrate`) built as the exact sibling of `lib/ding`.
`useHaptics()` in `lib/settings.tsx` returns **pre-gated callables** rather than a boolean, so a
caller cannot forget the `if` and leak a tap the athlete switched off. Wired into `completeSet`
(fires `light` from inside the mutation, so the hold timer and sheet auto-complete get it too, not
just the check button) and the PR branch (`success`). `EXPERIENCE_TOGGLES.haptics.live` flipped to
`true` and the test that guarded the old claim updated with the reason.

⚠ **Needs a new native build.** `expo-haptics` changes the runtime fingerprint — `eas update`
cannot deliver it. On the web preview it is Chrome/Android only; Safari has never implemented
`navigator.vibrate`, so a silent web preview is expected.

**Press scale normalised to `0.96`** at 19 ad-hoc screen sites across 12 files, replacing
`0.97 / 0.975 / 0.98 / 0.985 / 0.99 / 0.992 / 0.995`.

**Button release bounce zeroed.** `bounciness: 2` (×4) and `3` (×1) → `0` across the five animated
button variants. Safe to change because `_buttonTokens.ts` contains no spring config at all — the
bounce was an RN implementation choice, never transcribed from the `.dc`.

## Held — design decisions, not implementation defects

**Icon `strokeLinecap`.** Do not blanket-convert. `HomeIcons.tsx` states it is ported *1:1* from
`Forge Home.dc.html`, so its square caps are design-faithful. But measuring the design source:
across all `.dc.html` files the design is **470 round / 19 square (96% round)**, and `Forge Home`
itself is **11 round / 3 square** — while `HomeIcons.tsx` carries **8** square. The code is
squarer than its own source. Which specific glyphs are meant to be square is a PO/design call per
PD-7, not a sweep.

**Image outlines.** The design uses white borders at `0.08`–`0.55` alpha but has no systematic
image-edge rule. Adding a 1px outline to 57 image sites is a visual change the design does not
specify. Held for the same reason.

**Button press-scale (`0.975` / `0.98`).** Still pending a read of `Button.dc.html`, which is not
in the repo — `_buttonTokens.ts:3` points at claude.ai design project `7b89a003`.

**`popCell` overshoot** (`workout.tsx`, `scale 1.16` then `spring friction: 4`). Left alone. It is
a staged celebration on value change, which the standard permits; with press feedback and a haptic
now on the same interaction, changing it too risked over-correcting. Worth a look on device.

## Still open from the review

Concentric radius / token discipline (LOW), stagger (LOW), and `workout.tsx` line ~4750's
`useNativeDriver: false` (LOW) are untouched.
