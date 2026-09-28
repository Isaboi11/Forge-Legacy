# Form Check Body Pose: Build Plan

**Date:** 2026-09-28 · **Status:** PLAN, for PO review. Nothing here is built.
**PO decisions 09-28:** all three as recommended — 2D pose only · Holt's mark + depth line on the read, faint skeleton only full-screen · save the numbers (reps, depth, tempo), never the joints.
**Implements:** Phase 3 of `Docs/Coach-Holt-Form-Reading-Plan-v1.0.md` ("the skeleton"), §5.1 Engine B.
**Ships in:** native **Build 10** (queued in `Forge-Legacy-Master-Status.md`, Build 10 queue).
**Why (eval 09-25, `scripts/form-check-eval.mjs`, 21 PO clips):** Holt picks the right frame about 17/19, but his dot lands **on the exact body part only 6/18** (14/18 somewhere on the body). Asking for pixels fixed the frame, not the dot. A vision model's pointing is the ceiling; Apple Vision body pose gives the real joint positions.

---

## 1. Where Phases 0-2 actually stand (checked in code, 09-28)

| Item | State | Where |
|---|---|---|
| Any angle, 10 frames, timestamps, frame sizes | ✅ built | `src/domain/coach/form-check.ts`, `form-check-view.ts` |
| Whole clip up to 30 s + trim | ✅ | `FORM_CLIP_SECONDS = 30`, `trimWindow`, trim screen |
| No charge on an unreadable read | ✅ | quote first, spend after the guard (`0221`, Edge Function) |
| Focus chips, coaching record (`known`), drill, last fix + trend | ✅ | `capFocus`, `capKnown`, `capLast`, `cleanDrill` |
| Marks: frame + x/y in pixels, drawn on the frame | ✅ | `cleanMarks`, `MarkedFrame` in `FormCheckParts.tsx` |
| Useful / Not useful, save, form history | ✅ | `form_checks` (`0221`), `src/app/form-history.tsx` |
| Web frame extraction | ✅ | `src/lib/video-frames.web.ts` |
| Golden eval | ✅ (21 clips, not the planned 40) | `scripts/form-check-eval.mjs` |
| §9.2 filter exceptions (*belly*, *gut*, *strain*, *tear*) | ❌ still banned | `BODY_SENTENCE`, `MEDICAL_SENTENCE` |
| Film from the set row in the logger | ❌ | only doors: Holt chat, form history |
| Nudge to re-film | ❌ | no form nudge in `src/domain/coach/` |

None of the ❌ items blocks this plan. The rep-count check against the logged set (Plan §6.2) needs the set-row door, so it waits for that.

---

## 2. What we build, in one paragraph

A local Expo module, `modules/body-pose` (`ForgeBodyPose`), same shape as `modules/label-reader`. It samples the trimmed clip **densely on the phone** and returns raw joints per frame, nothing else. All rules (which person, which reps, what the numbers mean) live in pure TypeScript under `src/domain/coach/pose/`, where `node --test` can run them on Windows. The app then (a) picks the frames to send (each rep's bottom and top), (b) sends Holt a short block of **measured facts** alongside the frames, and (c) snaps Holt's mark onto a **real joint** in the frame the athlete sees. If pose can't lock on, the read runs exactly as today.

---

## 3. The native module

**Files:** `modules/body-pose/expo-module.config.json` (`platforms: ["apple"]`, `ForgeBodyPoseModule`), `modules/body-pose/ios/ForgeBodyPose.podspec` (copy of the label-reader podspec, iOS 16.4, Swift 5.9, `ExpoModulesCore` only), `modules/body-pose/ios/ForgeBodyPoseModule.swift`.

**API (TS view):**

```ts
interface NativeBodyPose {
  /** Dense pass over a clip. Resolves when done or cancelled. */
  track(uri: string, opts: { startMs: number; endMs: number; fps: number; maxPeople: number }): Promise<PoseTrack>;
  /** Exact joints on still images (the JPEGs we send and draw on). */
  detect(uris: string[]): Promise<PoseFrame[]>;
  cancel(): void;
}
interface PoseTrack {
  width: number; height: number;       // the upright (orientation-applied) frame size
  nominalFps: number;                  // the file's own rate: > 60 = slow motion (see §9)
  frames: PoseFrame[];
}
interface PoseFrame {
  t: number;                           // ms into the clip, from the sample's real presentation time
  people: number[][];                  // up to maxPeople; each = 19 joints × [x, y, confidence], flat (57 numbers)
}
```

Coordinates are 0-1 from the **top-left** of the upright frame (Vision's origin is bottom-left; flip `y` in Swift, as label-reader does). Joint order is a fixed TS constant (`nose, leftEye, rightEye, leftEar, rightEar, neck, leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist, root, leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle`). Missing joint = confidence 0. Left/right are the athlete's own. Optional event `onPoseProgress` (0-1) for the "Watching" screen.

**Swift outline:** `AVURLAsset` → video track + `preferredTransform` (→ `CGImagePropertyOrientation`, the same lesson label-reader records: never assume upright) → `AVAssetReader` over the trim `timeRange` → keep one sample buffer per `1000/fps` ms by presentation time → `VNImageRequestHandler(cvPixelBuffer:orientation:)` + `VNDetectHumanBodyPoseRequest` → `recognizedPoints(.all)`. Background queue, `autoreleasepool` per frame, cancel flag checked per frame. Pin the request revision so an iOS update doesn't silently change results. `detect` is the same request on `UIImage` files (label-reader's image path).

**TS loader:** `src/lib/body-pose.ts`, `requireOptionalNativeModule<NativeBodyPose>('ForgeBodyPose')` on iOS only, else `null`; `bodyPoseAvailable()`. Never import the module directly (build 9 and web must not crash).

### 2D or 3D?

**Use 2D (`VNDetectHumanBodyPoseRequest`, iOS 14+).** The iOS 17 3D request (`VNDetectHumanBodyPose3DRequest`) gives 17 joints in metres, which would make torso angle and knee track less angle-dependent, but: it needs an `#available(iOS 17)` split (our floor is 16.4); it is slower per frame (bad for a 300-frame dense pass); it tracks one person with no way for us to choose which; its accuracy on gym footage (bar, plates, rack in front of the body) is unproven for us; and it returns a **body height estimate**, a body measurement we would have to make sure never leaves the module. 2D answers everything in §5 from the angles people actually film. Revisit 3D as Phase 3c only if the eval shows angle errors on diagonal clips (PO decision 1).

---

## 4. Dense sampling on the phone, not pose on the 10 frames

Pose on today's 10 frames (1 s apart) can't find reps: a 2-3 s rep gets 2-3 samples and the bottom is usually missed, which is the original problem. So:

- **`track()` samples the whole trim at 10 fps** (15 fps when the trim is ≤ 10 s), capped at **300 samples**. At roughly 10-30 ms per Vision call that is about 3-10 s on a recent iPhone, run during the existing "Watching" screen.
- Decoding is `AVAssetReader` (sequential decode), not `expo-video-thumbnails` (one seek per frame, far too slow at 300).
- Then the app picks the frames to SEND (§6) and pulls them with today's `grabFrame` (768 px JPEG), and runs **`detect()` on those exact JPEGs**, so the joints drawn on screen are the joints of the image the athlete and Holt see (no timestamp drift between the dense pass and the still).

---

## 5. The pure-TS engine (`src/domain/coach/pose/`, import-free, `node --test`)

`@/` imports are type-only in domain code (runtime `@/` breaks `node --test`). `pose-facts.ts` is also imported by the Edge Function, so it must be import-free like `form-check.ts`.

**5.1 `pose-track.ts`: pick the athlete, clean the signal.**
- Athlete = the person with the largest confident box, then followed frame to frame by nearest root position (so a passer-by crossing in front doesn't swap in). Two people of similar size and centrality for > 20% of samples = **ambiguous** (§8).
- Gaps (confidence < 0.3) filled by straight-line interpolation up to 0.3 s; longer gaps split the series.
- Everything is scaled by **torso length** (neck to root, median over the clip), so thresholds don't depend on distance from the camera.
- Smoothing: centred moving average over ~0.2 s (odd window), applied to the signal, not to the drawn joints.

**5.2 `pose-reps.ts`: which signal, per movement pattern** (from the exercise's `movementPattern`, else auto: the joint signal with the biggest repeated swing):

| Pattern | Signal (image y, down = bigger) | Bottom | Top / lockout check |
|---|---|---|---|
| Squat / Knee Dominant, lunges | mid-hip y | hip lowest | knee angle ≥ 165° |
| Hinge / Hip Dominant (deadlift, RDL) | mid-wrist y (bar proxy) | wrists lowest | hip angle (shoulder-hip-knee) ≥ 170° |
| Horizontal Push (bench, push-up) | bench: mid-wrist y · push-up: mid-shoulder y | lowest | elbow angle at top |
| Vertical Push (OHP) | mid-wrist y | wrists at the rack (lowest) | wrists highest + elbow angle |
| Vertical / Horizontal Pull | nose/neck y vs wrists · rows: wrist-to-shoulder distance | hang / arms long | chin over wrists · wrist to torso |
| Elbow Flexion / Extension | elbow angle | open | closed |
| Anything else | auto signal; facts limited to reps + tempo | | |

**Rep finding:** extrema with hysteresis. A rep = top → bottom → top where the swing is at least **0.25 torso lengths** (angles: 30°), lasting 0.4-8 s; extrema closer than 0.35 s merge. Phases per rep: *down* starts when the signal leaves the top by 10% of that rep's range; *pause* = time within 5% of the bottom; *up* ends back within 10% of the top. A half-rep or walk-out that never crosses the threshold is not a rep.

**5.3 `pose-facts.ts`: the facts, as numbers first.** Each fact is computed only when the joints it needs are confident (≥ 0.5) in that rep, and only from a view that shows it (view from pose: shoulder width ÷ torso length small = side, large = front/behind; front vs behind from face-joint confidence; in between = diagonal).

- **Reps:** count, and each rep's start/bottom/end time.
- **Depth** (squat pattern, side or diagonal): hip vs knee height at the bottom → *below / about level with / above* the knee (±0.05 torso). Technique words only, never "good lift / no lift" (§9.9).
- **Knee track** (front/behind): knee spacing ÷ ankle spacing at the bottom vs at the top, per rep → "knees move inward relative to the feet on reps 4-5".
- **Torso angle** (side/diagonal): neck-to-root from vertical at the bottom, rounded to 5°, and its change across the set.
- **Hips vs shoulders out of the bottom** (squat, hinge, side): rise rate over the first 30% of *up* → "hips rise ahead of the shoulders on reps 4-5".
- **Tempo:** down / pause / up seconds per rep; slowest *up*; slowdown vs rep 1.
- **Symmetry** (front/behind): left vs right wrist height at lockout (bar tilt), hip shift sideways vs the midpoint of the ankles.
- **Lockout:** the angle checks in the table above, per rep.

**5.4 How the facts reach Holt.** The app sends **structured numbers**, not sentences: a new optional `pose` field on the request. The function narrows it (`capPose`, same posture as `capFrames`: a client is not a boundary) and turns it into lines with `poseFactLines()` from the shared module, so there is no free-text channel. Every line template is tested to pass `bannedFamily() === null`. They go in the **user turn** after the frames:

```
Measured on the athlete's phone with body tracking. Trust these for positions, rep count and timing; do not contradict them.
- View: side (athlete's right side toward the camera). Reps: 5.
- Frames: 1 rep 1 top · 2 rep 1 bottom · 3 rep 3 bottom · 4 rep 5 bottom · 5 rep 5 halfway up · 6 rep 5 top
- Depth at the bottom: reps 1-3 hip crease below the knee; reps 4-5 about level with it.
- Tempo, down / pause / up (s): 1.8 / 0.2 / 1.1 · 1.7 / 0.1 / 1.2 · ... · rep 5 up was slowest (1.9 s).
- Torso at the bottom: about 40° from vertical on rep 1, about 50° on rep 5.
- Out of the bottom: hips rose ahead of the shoulders on reps 4-5.
- Not measurable from this view: knee tracking, bar tilt.
```

Frame labels (`frameLabel`) gain the rep tag ("Frame 2 of 6 (3.1 s in, rep 1 bottom, 432 x 768 px)"). The **SYSTEM prompt** (cached, stays static) gets one new section: when measurements are given, positions, rep count and timing come from them, not from eyeballing; use them as evidence for a fix, in plain coaching words; never recite a table; never turn a measurement into risk, injury or a verdict. ⚠ The paste copy `supabase/apply/deploy-coach-form-check.ts` is already ~49 KB; §11 of the Form Reading Plan warns the dashboard editor truncates near 40 KB. Confirm how the function is deployed today before adding `pose-facts.ts` to it, and keep that module small.

**5.5 `pose-frames.ts`: frame choice.** With reps found: rep 1 bottom + top, the worst rep's (by the fact that differs most from rep 1) bottom and halfway up, the last rep's bottom and top, then fill with other bottoms, **6-10 frames** in time order (fewer than today's 10-12 = cheaper). No reps found: today's even spacing.

**5.6 `pose-marks.ts`: the mark on a real joint.** Holt's `marks` gain an optional `"joint"` from a fixed list (`left_knee`, `right_hip`, `mid_wrist` for the bar, `mid_hip`, ...). The app looks that joint up in `detect()`'s result for that frame and draws there. If Holt gave only x/y, snap to the nearest confident joint within 12% of the frame's long edge; otherwise keep his point (today's behaviour). A `line` mark for depth is drawn at the measured hip height, with a second short tick at knee height. `cleanMarks` accepts and validates `joint` (unknown names dropped, like every other field).

---

## 6. On screen

- `MarkedFrame` (`src/components/forge/form-check/FormCheckParts.tsx`) keeps its cover/contain mapping; the snapped point goes through the same maths. Overlays are `react-native-svg` (already a dependency) absolutely positioned over the image: the bronze ring + dot (today's), the depth line, and, if PO decision 2 says so, a thin low-contrast skeleton on the full-screen view only.
- **Per-rep strip** (design `Coach Holt Form Check.dc.html`, "Later version adds the per-rep strip"): each rep's bottom thumbnail with its tempo; tap = full screen. Build it to the .dc; report any visual delta before fixing (`feedback_gate_reports_visual_deltas`).
- Trim scrubber (Plan §3.3): rep ticks from the dense pass. Optional in this build.
- Both themes: layout both, colour one (`feedback_two_theme_change_rule`).

---

## 7. Medical and legal line (unchanged, and extended to numbers)

- Facts describe **movement only**. "Knees move inward relative to the feet on reps 4-5" is allowed. Anything about risk, injury, "valgus", posture diagnoses or what a body looks like is not, and the templates never produce it.
- Add clinical terms the pose work makes likelier (`valgus`, `varus`, `kyphos*`, `lordos*`, `scoliosis`) to `MEDICAL_SENTENCE`, with tests both ways (`feedback_verify_guards_empirically`).
- No body measurements ever: no height, limb lengths, proportions (2D gives none in real units; 3D's height estimate is a reason to stay 2D). Torso length is used only as an internal ruler and is never sent.
- No load, no 1RM, no "safe to lift" from pose numbers (Plan §12). Tempo slowdown is described as timing, never as a max estimate.
- Only the chosen athlete is measured; other people in frame are dropped in `pose-track.ts` (Plan §12).
- Medical-note stop, sentence filter and quote-then-spend are untouched.

---

## 8. When pose can't help: fall back to today

Three levels, decided in `pose-track.ts`, all at the **same price** (6 credits):

| Level | When | What happens |
|---|---|---|
| **Full** | athlete's hips, knees, shoulders confident in ≥ 60% of samples, reps found | pose frames + facts + joint marks |
| **Marks only** | athlete found but no clean reps (1 rep, isometric, odd lift) | even frames, no rep facts, joint snapping still on |
| **Off** | no module (web, build ≤ 9), `track` throws or runs > 20 s, athlete in < 60% of samples, two people ambiguous, bad angle (joints mostly < 0.3) | exactly today's read |

Partial views narrow the facts, not the read: lower body cut off = no depth or knee facts, the rest still sent. Fallback is silent except one small line on the read when it happened on a build that has pose: "Body tracking couldn't lock on, so this read is from the frames alone."

---

## 9. Privacy, web, build 9

- **All pose work is on the phone.** The joint series never leaves it and is never stored. What leaves is what leaves today (the chosen frames, to the AI provider, not retained) plus a few numbers in the same request.
- **Privacy labels:** no change. The facts are sent for the request and not kept, like the frames (`Docs/App-Store-Privacy-Labels.md` "considered and NOT collected"). If PO decision 3 saves the numbers with a form-history read, that is workout data already declared under **Fitness**.
- **Privacy policy:** no required change; recommended one sentence under the AI-features paragraph of `site/privacy.html` ("For a form check, your phone measures your movement on the device; only those measurements and the frames you send go to our AI provider"). Batch it with the Sentry policy change already queued for build 10.
- **Web and build 9:** `bodyPoseAvailable()` is false, every pose path is skipped, the read is today's. The new JS can OTA to build 9 safely. The Edge Function change is additive (`pose` and `joint` optional), so deploy it first, then the app, as in Plan §11.
- **Slow-motion clips:** a file with `nominalFps > 60` may carry slowed time. Omit tempo facts for those until we confirm on a real slow-mo clip; positions are unaffected.

---

## 10. Build order and file list

**P3.0 - now, on Windows, no build needed** (OTA-safe, inert without the module)
- `src/domain/coach/pose/joints.ts` (names, order, types) · `pose-track.ts` · `pose-reps.ts` · `pose-facts.ts` (`capPose`, `poseFactLines`) · `pose-frames.ts` · `pose-marks.ts`
- `src/domain/coach/__tests__/pose-*.test.mjs`: synthetic series (clean reps, pause reps, half reps, gaps, a second person walking through, cut-off legs) **plus real ones**
- `scripts/pose-fixtures.py` (Python 3.14 + ffmpeg are on this machine): runs an open-source pose model (MediaPipe) over the PO's 21 clips in `C:\Users\isaia\form-check-clips`, maps its joints to Vision's 19, writes JSON **outside the repo**. Small trimmed fixtures (numbers only) go in `__tests__/fixtures/pose/`. Real input, not tidy fixtures (`feedback_test_fixtures_must_be_real_input`). ⚠ A different model from Vision: thresholds get re-checked on device output in P3.2.
- `src/lib/body-pose.ts` (optional loader, returns null today) · `form-check.ts`: `joint` in `cleanMarks`, `pose` narrowing, frame-label rep tag, new clinical terms · Edge Function: `pose` field + prompt section · `form-check-live.ts`: pose path behind `bodyPoseAvailable()`
- Tests + `tsc` green. No eval run yet (costs money, and there's no device pose).

**P3.1 - native, into build 10** · `modules/body-pose/` (3 files, §3). ⚠ Swift can't compile on Windows: its first compile is the EAS build. Keep the Swift tiny (raw joints only) so a compile error costs one rebuild, not a redesign. Check `fingerprint:compare` changes as expected.

**P3.2 - device check on build 10** · a hidden dev action exports `track()` JSON for a clip via the share sheet. PO runs the 21 clips once; the JSON goes next to the clips (outside the repo). Re-tune thresholds on real Vision output; replace the MediaPipe fixtures where they differ.

**P3.3 - acceptance: the eval re-run** · `form-check-eval.mjs` gets `--pose <dir>`: reads each clip's Vision JSON, applies the same frame choice, facts and joint snapping, then grades as today. **Quote cost first (~$0.33 for 21 clips, PO approves)** (`feedback_live_ai_tests_spend_real_money`). Targets:

| Measure | 09-25 | Target |
|---|---|---|
| Mark on the exact body part | 6/18 | **≥ 15/18** |
| Mark on the body | 14/18 | 18/18 |
| Right frame for the fix | ~17/19 | ≥ 18/19 |
| Rep count right (vs human count) | not measured | ≥ 17/19 readable clips |
| Junk clips declined | 2/2 | 2/2 |
| Banned sentence on screen / invented fault on a clean rep | 0 | 0 |

**P3.4 - screen** · per-rep strip, depth line, optional skeleton, rep ticks on the trim. Design gate against the .dc.

**Later:** 3b bar path (tap the plate, Vision object tracking) · 3c 3D pose if diagonal clips fail · running cadence and landings (Plan Phase 5).

---

## 11. Risks

1. **First Swift compile is on EAS** (nothing native builds on Windows). Mitigation: tiny module, copy label-reader's working podspec/config, build early in the build-10 window.
2. **Green on web ≠ working on device** (`feedback_green_on_web_is_not_working_on_device`). Pose is inert everywhere we can test until build 10 is on a phone; P3.2 is not optional.
3. **Speed and heat** on a 4K 30 s clip. Mitigation: 300-sample cap, cancel, 20 s timeout → fallback.
4. **Gym clutter** (rack uprights, plates hiding knees, mirrors doubling the athlete). Mirrors are the nasty one: two identical people. Ambiguity → fallback, never a guess.
5. **Holt ignores the facts.** Measured by the eval; the prompt says "do not contradict", and marks come from the joint table, not from his pixels.
6. **Paste size** of the Edge Function (§5.4).
7. **Threshold drift** between MediaPipe fixtures and Vision (§10 P3.0).

---

## 12. Decisions for the PO

| # | Decision | Recommendation |
|---|---|---|
| 1 | 2D pose only in build 10, or also Apple's iOS 17 3D pose? | **2D only.** Works back to our iOS floor, faster, no body-height number anywhere. Add 3D later only if diagonal clips score badly |
| 2 | Show a skeleton on the frames, or only Holt's mark (+ depth line)? | **Mark + depth line on the read; faint skeleton only on the full-screen frame.** The mark is the coaching; a skeleton on every card is noise |
| 3 | Save the measured numbers (reps, depth, tempo) with a saved form-history read, so Holt can say "rep 5 was shallower than in August"? | **Yes, numbers only, never the joint series.** Already covered by the Fitness privacy label |
