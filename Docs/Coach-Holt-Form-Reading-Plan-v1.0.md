# Coach Holt Form Reading: Full Plan v1.0

**Status:** PROPOSAL, for PO review (2026-09-25). Nothing in §6 onward is built.
**Governs:** capability A5 (`AI-Coach-Capability-Scope-v0.1.md`), CA-D5 (900-token cap), CA2-D5 (praise → fix → cue → encouragement), the Holt medical rules (PO 09-22: *"stay away from anything that would get us into legal trouble"*).
**Goal (PO 09-25):** *"everything an athlete of any kind would ever want"*, from every angle, at any time, and still good quality.

---

## 1. Where it stands today

| Piece | State |
|---|---|
| Screen `/form-check` (from Holt's chat) | Built. Pick a lift, film or choose a clip, get a read |
| Frames | App pulls stills on the phone (`expo-video-thumbnails`, build 9 only; web can't) |
| The read | `coach-form-check` Edge Function, Sonnet 5, 6 credits, 900-token cap |
| Safety | Medical words in the note stop it before any charge; a code filter deletes banned sentences from the answer |
| **Angle fix (09-25, not deployed)** | Prompt now reads ANY angle and says "From the front…"; 10 small frames 1 s apart instead of 5 large 2 s apart; each frame labelled with its second. Tests 959/959, tsc 0. Needs: function paste + OTA |

### What was wrong, and why reads felt weak

1. **Holt was told to refuse front/back angles.** The prompt listed "camera behind them or straight on" as a reason to give up. (Fixed 09-25.)
2. **5 frames, 2 s apart ≈ one frame per rep, at a random point.** The bottom of a rep was often never seen. (Fixed 09-25: 10 frames, 1 s apart.)
3. **Only the first 10 seconds.** A camera-roll clip starts with walking up and unracking. (Open. §6.1 trim.)
4. **The filter deletes real coaching.** Tested: *"breathe into your belly"*, *"take the strain out of the bar"*, *"tear the bar off the floor"*, *"keep your gut tight"* are all deleted. **The app's own Back Squat coaching says "Take a full breath into your belly"**, so Holt can't repeat our own content. (Open. §9.2 decision.)
5. **Charged even when nothing survives.** If the filter empties the read, the athlete paid 6 credits for "I couldn't get a read". (Open. §10.)
6. **Holt knows only the lift's NAME.** He never sees the 797 coaching records we already own (cue hierarchy, common mistakes, corrections, range-of-motion notes). (Open. §6.3.)

---

## 2. Who films a set, and what they want from it

"Any kind of athlete" means these, each with a different idea of a good read:

| Athlete | What they film | What they want back |
|---|---|---|
| **Beginner** | Goblet squat, bench, RDL, push-up | "Am I doing it right?" One thing to fix, said plainly. Confidence. Is it the right exercise? |
| **General gym-goer** | The big lifts at working weight | The biggest fault, a cue, and whether it's better than last time |
| **Powerlifter** | Squat / bench / deadlift, often heavy singles | Depth vs parallel, bar path, lockout, pause on the chest, commands-style standards, rep-to-rep consistency, where it slowed |
| **Bodybuilder** | Machines, cables, dumbbells, isolation | Range of motion, tempo, control on the way down, "am I using momentum", mind-muscle cues |
| **Olympic lifter** | Snatch, clean & jerk, pulls | Positions (first pull, power position, catch), bar path loop, timing of the extension, receiving depth. Needs MORE frames — it's fast |
| **CrossFit / functional** | Kettlebell swings, box jumps, wall balls, pull-ups, thrusters | Efficiency, rhythm, consistency as they tire, standard met (hips open, chin over bar) |
| **Home / bodyweight** | Push-ups, split squats, pistols, dips, rows under a table | Range, body line, tempo; kind to a phone propped on a sofa at a weird angle |
| **Runner** | Treadmill or path, 5–10 s | Cadence, overstride (foot landing ahead of the hips), arm swing, posture. **Not** injury talk |
| **Field / court athlete** | Jumps, landings, sprint starts, lateral cuts | Knees over toes on landing, hip-knee timing, arm drive, symmetry left vs right |
| **Older lifter / returning** | Anything, lighter | Controlled, confident guidance; no alarm; same medical line |
| **Mobility / yoga** | Deep squat hold, hip hinge pattern, overhead reach | Range comparison over time, symmetry. No clearance, no diagnosis |
| **Human coach (Forge Coach CRM)** | Reviews client clips | Holt's draft read, a frame picker, and their own comments on top (§6.9) |

Everything below should work for all of them. The strength-training rows come first because they're our core users.

---

## 3. The experience, end to end

### 3.1 Ways in (anywhere a lifter already is)

1. **From the set they just did.** A small camera icon on each set row in the workout logger: *Film this set*. The clip is attached to that set, so Holt knows the lift, weight, reps and RPE without asking. **This is the main door.**
2. **From Holt's chat.** *"Check my form"* → the screen (today's only door).
3. **From an exercise's detail page.** *Check my form on this* under the coaching tips.
4. **From the camera roll after the gym.** Share sheet → Forge → Form check (iOS share extension, later).
5. **From a friend's or coach's phone.** Any clip, any angle, any length. It doesn't have to be filmed in the app.

### 3.2 Filming (optional helpers, never required)

- **In-app recorder** with a faint silhouette overlay: "whole body in frame". Suggested angle per lift ("side shows bar path best") is a TIP, never a gate.
- **Auto-stop** after the set (motion stops for 3 s), or a 30 s cap.
- **Front or back camera**, propped phone friendly: a 3-2-1 countdown and a loud start beep.
- **Low light** detection: "It's a bit dark, I'll do my best", then reads anyway.

### 3.3 Choosing the part that matters

- **Trim.** A scrubber to drag start/end around the reps. Default: whole clip up to 30 s.
- **Auto-find the reps** (Phase 3, on-device pose): the app marks each rep on the scrubber; the athlete can tap one rep to focus on ("Just rep 4, it felt off").
- **Slow-motion clips** (120/240 fps iPhone) read correctly: timing uses real seconds, not frame count.

### 3.4 What they tell Holt (all optional)

- The lift (auto-filled from the set or the exercise; else pick from the 721-exercise catalogue, not free text only).
- **"What should I look at?"** chips: *Depth · Bar path · Knees · Back · Lockout · Tempo · Everything*. Plus the free-text note (already medical-guarded).
- Weight and reps (auto-filled from the set). Used only as context ("near-max singles" vs "warm-up"). **Never** turned into a load prescription.

### 3.5 The read

The athlete sees, in order (CA2-D5 kept):

1. **The view line.** "From the front, three reps."
2. **What's working.** 1–3 specific, earned points.
3. **One or two things to clean up**, biggest first. **Each one shows the frame it's about**: a still from their clip with a marker (a dot on the knee, a line for the bar path, a depth line). This is the single biggest quality jump. People trust a read they can SEE.
4. **Next-set cue.** "Think: push the floor away."
5. **A drill, when it helps** (from our catalogue, tappable, can be added to today's workout): *Pause squat*, *Tempo RDL*, *Pin press*. Action, never assessment (Capability-Scope photo rule 3 pattern).
6. **Closing encouragement.**
7. **Per-rep strip** (Phase 3): thumbnails of each rep's bottom position, with rep-to-rep notes ("rep 5 was shallower than rep 1").
8. **Buttons:** *Useful / Not useful* · *Ask Holt about this* (opens chat with the read in context) · *Save to form history* · *Share to squad* (opt-in) · *Try another clip*.

### 3.6 After the read (what makes it a coach, not a gadget)

- **Holt remembers the last fix per lift.** Next time: "Last time the bar drifted forward. It's straighter now: good." That's the whole value of a coach.
- **Form history per lift.** A timeline on the exercise page: clips (or saved key frames), the fix each time, a "better / same / different" trend. Side-by-side compare of two dates.
- **A gentle nudge** (existing nudge system, state-only): after 4 weeks on a lift with a saved fix, "Want to film a set of squats and see if the bar path held?"
- **Legacy tie-in:** saved form clips can go in the Transformation Gallery as a technique record (opt-in, the athlete's archive, not a post).

---

## 4. What Holt can read, by movement and angle

Every angle gets a read. This table is what Holt looks for from each. It goes into the prompt as a lookup, and later into the pose engine as rules.

| Pattern | Side | Front / Behind | Diagonal (45°) |
|---|---|---|---|
| **Squat** (back, front, goblet, split, pistol) | Depth, bar over mid-foot, torso angle, hips vs knees rising together | Knees tracking over toes / caving, stance width, hip shift, bar level, heels down | Depth + knee track, both approximately |
| **Hinge** (deadlift, RDL, good morning, swing) | Bar path close to legs, back holding shape, hip-to-knee timing, lockout without leaning back | Grip + stance width, bar level, hips rising evenly, knee track | Most of both |
| **Horizontal press** (bench, push-up, dips) | Bar touch point, bar path, elbow tuck, butt on bench, pause | Grip width, bar level, elbow symmetry, wrist stack | Touch point + elbow flare |
| **Vertical press** (OHP, push press, landmine) | Bar path around the face, lockout over mid-foot, rib flare / lean-back | Symmetry, elbow path, lockout evenness | Both |
| **Pulls** (rows, pull-ups, pulldowns) | Range, torso swing (momentum), full hang/lockout, chin over bar | Symmetry, grip width, shoulder shrug | Both |
| **Lunge / single-leg** | Step length, torso upright, back-knee depth | Knee track, hip drop, balance wobble | Both |
| **Olympic lifts** | Positions, bar path loop, extension timing, catch depth (needs 15–20 frames or pose) | Bar level, foot position in the catch | Positions approx. |
| **Isolation / machines** | Range of motion, tempo, momentum | Symmetry, seat/handle setup | Range |
| **Carries / core** | Posture, body line (plank), hips sagging | Lean to one side, symmetry | Both |
| **Running gait** | Foot landing vs hips (overstride), posture lean, knee drive, cadence | Arm crossover, knee track, hip drop | Cadence + posture |
| **Jumps / landings** | Hip-knee-ankle extension, landing depth, arm swing | Knees in/out on landing, symmetry | Both |

**Rule: what an angle hides is left out, not guessed at, and never a reason to refuse.** (In the prompt 09-25.)

---

## 5. How it works under the hood

### 5.1 Two engines: pictures now, a skeleton next

**Engine A: frames to Claude (today).** Stills go to Sonnet 5 with a prompt. Good at the words, at recognising the movement, at any angle. Weak at precise measurement: it can't reliably say "rep 3 was 4 cm shallower".

**Engine B: on-device body tracking (Phase 3).** Apple Vision's body-pose detector (`VNDetectHumanBodyPoseRequest`) runs on the iPhone, for free, with no upload. Same pattern as the `label-reader` module in build 9. It gives 19 joint positions per frame, so the app can **measure**:

- **Rep detection:** hips going down and up = a rep. Finds each rep's top, bottom and turnaround automatically, which fixes frame selection for good.
- **Depth:** hip crease vs knee height at the bottom of each rep (side or diagonal).
- **Knee tracking:** knee vs ankle/toe line (front/behind).
- **Torso angle, hip shift, symmetry, tempo per rep** (seconds down / pause / up), **rep-to-rep slowdown**.
- **Bar path:** harder (a bar isn't a body joint). Options: track the wrists as a proxy on presses/pulls; Vision object tracking on the plate after the athlete taps it once. Phase 3b.
- **Running cadence** and foot-strike position relative to the hips.

**Then the two combine (the target design).** The skeleton picks the frames (each rep's bottom, top, turnaround) and produces **measurements as plain facts**. Claude gets the best 6–12 frames **plus** the facts ("rep 1 depth: below parallel; rep 5: at parallel; knees 3 cm inside toes on reps 4–5") and writes the coaching. The measuring is code; the model writes the sentences. That's the Holt principle already in place: *engine small, rulebook is the product*.

Engine B works offline, costs nothing per read, and needs **a new native build** (§11).

### 5.2 Grounding every read in our own coaching content

We own 797 coaching records (`src/domain/exercise-coaching/content/coaching_content.json`) with `cueHierarchy`, `commonMistakes`, `mistakeCorrections`, `rangeOfMotionNotes`, `tempoGuidance`. When the lift is a catalogue exercise, the read gets that exercise's record:

- Holt checks the known common mistakes first, rather than inventing faults.
- His cues match the cues on the exercise page, so the app speaks with one voice.
- Drills come from `mistakeCorrections` + the relationship graph (5,678 links: regressions and variations).

Cost: roughly 300–600 extra input tokens per read. Can't be in the cached system block (it varies per lift), so it goes in the user turn.

### 5.3 Frames: how many, which, how big

| Case | Frames | Why |
|---|---|---|
| Normal strength set (today) | 10 at 768 px, 1 s apart | Covers every rep phase across the set |
| One rep chosen (trim or tap) | 12 across that rep | Dense coverage of the part they care about |
| Olympic lift / jump / sprint | 16–20 over 2–3 s | Fast movements; the capability doc already allows 8–20 |
| With pose engine | 6–10 **chosen** (each rep's bottom + top + worst rep) | Better frames, fewer tokens |

Keep frames in time order with timestamps (done 09-25). Up to 20 frames needs the per-request byte cap reviewed (today ~1 MB for 12; 20 is ~1.7 MB, under the 14 MB ceiling).

### 5.4 Multi-angle

Two clips of the same set (a friend films from the side, a phone on the floor from the front) → one read that uses both. Frames labelled "Side, 2.0 s" / "Front, 2.0 s". Phase 4.

### 5.5 Where video lives

- **Default: nothing is stored.** Frames are made on the phone, sent, read, and thrown away (today's behaviour).
- **Save to form history (opt-in):** stores the clip (720p, already compressed by `useMediaPicker`) or just the key frames, in a **private** bucket owned by the athlete. ⚠ Photo buckets are public by PO decision (`project_photo_buckets_public_by_decision`); form clips should NOT follow that. It's a separate decision (§9.5).
- Counts toward the existing 5-persistent-video cap? Decision §9.6.

---

## 6. Features, grouped (the full wish list)

### 6.1 Capture & input
- Trim scrubber; whole clip up to 30 s, not "first 10 s"
- In-app recorder with silhouette overlay, countdown, auto-stop
- Film from the set row in the logger (auto-fills lift, weight, reps)
- Lift picker from the catalogue (721), with free text as fallback
- "What should I look at?" focus chips
- Slow-motion clips handled
- Share-sheet import (iOS share extension)
- Web: upload works by extracting frames in the browser (`<video>` + canvas). **Makes form check testable on forgelegacy.expo.app**, where the PO tests. Needs no native build

### 6.2 The read
- Angle named, any angle read (done)
- Grounded in the exercise's coaching record
- **Marked-up frames** for each fix (dot/line/arrow drawn on the still)
- Drill suggestions from the catalogue, one tap to add to today
- Per-rep strip and rep-to-rep consistency (pose)
- Tempo per rep, and "where it slowed" (pose). Described, never turned into a max or a load
- Powerlifting depth call: "below parallel on all 3" (pose + side/diagonal). Framed as technique, never as a judging ruling
- Left/right symmetry (front/behind, pose)
- Running: cadence, overstride, arm swing
- Rep count check vs what they logged ("I counted 7, you logged 8")

### 6.3 Memory & progress
- Holt remembers the last fix per lift and checks it next time
- Form history timeline on each exercise page
- Side-by-side compare (two dates, synced to the rep bottom)
- "Better / same / changed" trend per fix
- Nudge to re-film a saved fix after N weeks (existing nudge system)

### 6.4 Social & coaching
- Share a clip + Holt's read to a squad (opt-in, per post, like route maps). Squadmates can react
- **Forge Coach CRM:** client uploads → trainer sees Holt's draft read, edits or adds their own notes, draws on frames, sends back. Trainer's words, Holt's help. Fits `trainer_*`, not Coach Holt
- Never comment on anyone else in the frame (other gym-goers). The prompt already says "one athlete"; the pose engine should pick the largest/most central person

### 6.5 Accessibility & trust
- Read aloud (VoiceOver-friendly text; later Holt's voice)
- Big-text layout of the read
- "Useful / Not useful" on every read, with an optional one-line "what was wrong?". That's the quality signal
- Clear credit cost shown **before** the read ("Uses 6 of your 75 this month")
- Honest about limits: "From the front I can't see bar path. Knee tracking looks strong though."

---

## 7. What Holt must never do (unchanged, and stays in code)

Kept exactly. These are the PO's legal line (09-22), enforced in two code layers (note guard before the model, sentence filter after):

- No diagnosis, no pain/injury/symptom talk (even reassuring), no referrals, no "safe/dangerous", nothing about body/physique/weight, no load or max numbers, no guessing.
- A note mentioning pain stops the read, free.
- The pose engine gets the same rule: **measurements describe movement only.** "Knees move inward on reps 4–5" is allowed. "Knee valgus increases injury risk" is not, and the filter deletes it.
- **Under-18 athletes:** video of a minor is a higher-stakes object. Decision §9.4.

---

## 8. Quality: how we know it's good

1. **A golden clip library.** ~40 clips: 8 lifts × side/front/behind/diagonal, plus bad cases (dark, far, partly in frame, gym crowd). Each labelled by a human with the real faults. PO or a tester films them once.
2. **A scored run** before every prompt/engine change: did Holt name the real fault? Invent one? Refuse a readable angle? Use a banned sentence? Target ≥ 85% "named the main fault", 0 invented faults on clean reps, 0 angle refusals.
3. ⚠ **Every golden run spends real API money** (`feedback_live_ai_tests_spend_real_money`). Quote the cost before each run; ~40 reads at today's size.
4. **Live signal:** Useful / Not useful rate per lift and per angle, from the read screen. Weekly look in `/admin`.
5. **Cost check:** `coach_ai_usage` rows for `form_check`. Confirm the system block is cached (`cache_read_input_tokens` > 0) after the first reads.

---

## 9. Decisions for the PO

| # | Decision | Recommendation |
|---|---|---|
| 9.1 | Ship the 09-25 angle fix now (function paste + build-9 OTA)? | **Yes.** It's the fix for what you saw |
| 9.2 | Let the filter allow common cue words: *belly (breath)*, *gut (tight)*, *strain/slack out of the bar*, *tear the bar*, *your frame (for grip/stance width)*? Only those exact phrases; medical words stay blocked | **Yes.** Our own coaching content uses them |
| 9.3 | Don't charge when the read comes back empty (unreadable, or filter left nothing) | **Yes** |
| 9.4 | Minimum age for form check (video of a body) | **16+** with the same rules, or **18+** to match photo coaching. Your call; legal-cautious is 18+ |
| 9.5 | Saved form clips: private bucket (athlete-only), not public like photos | **Private** |
| 9.6 | Do saved form clips count toward the 5 persistent videos? | **No.** Save key frames by default (tiny), full clip opt-in and counted |
| 9.7 | Credits: 6 per read stays; a follow-up question about the same read = 1 (normal chat message) | **Yes** |
| 9.8 | Running gait and jumps in scope for v1? | **Phase 5.** Strength first |
| 9.9 | Powerlifting "depth call" wording: technique language only, never "good lift / no lift" | **Yes** |

---

## 10. Build order

**Phase 0: make today's feature good (OTA only, no new build)**
- ✅ Any-angle prompt, 10 frames, timestamps (built 09-25, not deployed)
- Filter phrase exceptions (after 9.2), with tests both ways
- No charge on empty reads (refund RPC or reserve-then-confirm; server + SQL)
- Read the whole clip up to 30 s; `allowsEditing` trim on iOS
- Lift picker from the catalogue, plus focus chips
- Show which frames were read (thumbnails under the read)
- Useful / Not useful buttons + logging

**Phase 1: grounding & visible reads (OTA + Edge Function)**
- Exercise coaching record in the user turn (§5.2)
- Model returns `frameIndex` per point → the app shows **that frame** next to the fix
- Drill suggestions, one tap to add to today
- Web frame extraction so it works on forgelegacy.expo.app
- Golden clip library + first scored run (quote cost first)

**Phase 2: a coach that remembers (OTA + migration)**
- `form_checks` table: lift, date, the read, the fix, optional key frames (private bucket)
- Film from the set row in the logger (attached to the set)
- Holt follows up on the last fix; form history on the exercise page; compare two dates
- Nudge to re-film

**Phase 3: the skeleton (NEW NATIVE BUILD: add to the Build 10 queue)**
- Local module wrapping Apple Vision body pose (like `modules/label-reader`)
- Rep detection → auto frame selection; depth, knee track, torso angle, tempo, symmetry as facts
- Joint/line overlays drawn on the frames
- Per-rep strip; rep-count check
- 3b: bar-path tracking (tap the plate once)

**Phase 4: more angles & other people**
- Two-clip multi-angle reads
- Share to squad (opt-in)
- Forge Coach trainer review flow

**Phase 5: beyond the barbell**
- Olympic-lift mode (16–20 frames, position checklist)
- Running gait (cadence, overstride), jumps/landings, mobility range tracking over time
- Share-sheet import

---

## 11. Constraints to remember

- **Build 9 is the first build with frame extraction.** Build 8 and web say "arrives with the next build" (web fixable in Phase 1 without a build).
- **Phase 3 needs a native build.** Add "Body pose (Apple Vision) module" to the build queue in `Forge-Legacy-Master-Status.md` when approved.
- **Deploy order for Phase 0:** paste `supabase/apply/deploy-coach-form-check.ts` **first**, then OTA. An older function cuts the new 10-frame request to its old 6-frame cap, so the read would only cover the first ~6 s.
- **One OTA lane for build 9:** `ota/build9-js` only (`feedback_one_ota_branch_per_build`).
- The paste copy is ~33 KB; the dashboard editor truncates near 40 KB. Grounding content must NOT be inlined into the function (load per request or keep a small cue index).

---

## 12. Not building (on purpose)

- Injury-risk scores, "safe to lift" verdicts, or rehab advice. Ever.
- Estimated 1RM or load suggestions from video.
- Body/physique commentary (that's A4 photo coaching, a separate product with its own rules).
- Commenting on other people in the frame.
- Real-time live-camera coaching during the set (battery, heat, distraction). Revisit after Phase 3.
