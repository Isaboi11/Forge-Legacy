# Coach AI — Preflight Gates

## v0.1 | August 2026 · REVIEW — two decisions required before Phase D · D1

Closes the two open items in `Docs/AI-Coach-Capability-Scope-v0.1.md` §4:
**(1)** the `limitations.ts` review the dashboard has been asking for, and **(2)** what history the model
may read. Both are gates on D1, not follow-ups.

**Pricing, tiers and metering are governed by the Pricing Structure & Monetization Build Plan (locked
2026-08-12).** Nothing here touches them.

---

## PART 1 — `limitations.ts` review

`src/domain/coach/rulebook/limitations.ts` self-identifies as *"the closest thing in the app to health
guidance, and it is not reviewed yet,"* and invites a reviewer to disagree with each decision individually.
This is that pass.

**Headline: the file is better than its own warning label suggests.** The stated bar — *remove the movements
that most directly load the complaint, and nothing else* — is the right bar, and the argument for it (over-
exclusion produces a thin program and teaches athletes to stop declaring limitations, which is a worse
safety outcome) is correct. Most individual calls hold up. The problems are structural, not per-entry.

### 1.1 Per-entry verdicts

| Limitation | Removes | Verdict |
|---|---|---|
| `shoulders` | Vertical Push, Shoulder Isolation | **Hold.** Keeping Horizontal Push is defensible and the justification is sound — most cranky shoulders press fine at or below flat, and removing it guts the upper day |
| `knees` | Power / Plyometric, `run` | **Hold, with §1.2.** The file predicts this will surprise a reviewer and then makes the right argument: loading is generally tolerated and often helps; impact is what people mean. This matches current practice |
| `lower_back` | Hinge / Hip Dominant, Carry | **Disagree — see §1.3** |
| `no_jumping` | Power / Plyometric, `run` | **Partly disagree — see §1.4** |
| `no_overhead` | Vertical Push | **Hold.** Correctly distinguished from `shoulders`; the reasons given (low ceiling, healing rib, neck) are real |
| `no_barbell` | The whole `EQUIP_UNLOCK.barbell` group | **Hold.** The bug story — keeping `ezbar` left `plates` and `rack` unlocked, and a `no_barbell` athlete at a full gym got a snatch-grip deadlift in week 4 — is the correct lesson, and deriving from the constant rather than copying it is the right fix |
| `no_running` | `run` | **Hold** |

### 1.2 ⚠ FINDING A — there is no severity axis, and this is the one that matters

`knees` means both *"achy after a long run"* and *"ACL reconstruction six weeks ago."* One rule serves both.
The rule chosen is the correct one for the first athlete and wrong for the second — loaded knee flexion is
appropriate for cranky knees and contraindicated post-op.

The same collapse applies to every entry. `shoulders` covers both a grumpy cuff and a labral tear.

**This was tolerable when limitations came from a fixed chip list** — a human read seven options and picked
the one that fit. **It becomes the central risk under Coach AI**, where the athlete types a sentence and a
model maps prose onto the same seven values. Free text carries severity; the enum cannot hold it. See
Part 2 §2.4 for the mitigation, which already mostly exists.

**Recommendation:** do not add severity to the enum for D1. Route acuity to the medical stop instead — that
is what it is for, and it already works.

### 1.3 FINDING B — `lower_back` drops Carry but keeps Squat, and that is inconsistent

The stated reason for removing `Carry` is axial compression. A loaded back squat puts more compression
through a lumbar spine than a farmer's carry does, and it is kept.

The file's defence is that *"a supported or machine-based squat pattern usually remains available once the
equipment filter has had its say."* **That is a hope, not a guarantee.** An athlete at a full commercial gym
declaring `lower_back` has every barbell unlocked and can be prescribed a barbell back squat — the exact
axial load `Carry` was removed to avoid.

**Recommendation:** either drop `Carry` from the exclusion list (defensible — loaded carries are frequently
prescribed *for* lumbar endurance), or verify what the assembler actually produces for a `lower_back`
athlete with full equipment before shipping. **Do not leave the inconsistency in place unexamined.** The
matrix test that caught the `no_barbell` bug is the right instrument here too.

### 1.4 FINDING C — `no_jumping` silently removes running, and nothing documents it

`LIMITATION_ACTIVITIES.no_jumping` includes `run`. The file's prose justifies the `knees → run` exclusion
explicitly and never mentions this one.

Running is not jumping. A person who avoids jumping for a downstairs neighbour, a pelvic-floor reason, or a
low ceiling may run perfectly well — and `forbidsRunning()` means this athlete **cannot be given a running
goal at all**. That is a large consequence from an undocumented line, and it violates the file's own stated
bar of removing nothing beyond what the complaint loads.

**Recommendation:** remove `run` from `no_jumping`, or document why it is there. If the intent was impact
generally, the limitation is misnamed and should be `no_impact`.

### 1.5 FINDING D — the architecture only ever removes

Every mechanism in the file subtracts: patterns, equipment, activities. Nothing is ever added.

An athlete declaring `shoulders` loses vertical pressing and all direct deltoid work and gains nothing —
where the conservative answer usually *includes* adding scapular and cuff work. This is a design limit
rather than a defect, and fixing it is out of scope for D1, but it should be recorded: **the app's answer to
a limitation is a smaller program, never a different one.**

### 1.6 FINDING E — cosmetic

Line 101's fallback array duplicates `EQUIP_UNLOCK.barbell` literally. If that constant ever becomes
undefined, the stale copy applies silently — the precise failure the surrounding comment exists to prevent.
Prefer throwing over falling back to a copy.

### 1.7 What this review does not do

It is not a clinical review and does not replace one. It checks internal consistency, documentation, and
whether each rule matches its stated reasoning. **The file still has not been through the human
approve/publish pass the 735 exercise-coaching records went through**, and the honest position is that it
should before Coach AI reasons over it in prose.

---

## PART 2 — What history the model may read

The dashboard raises this at Decision Queue #21 for the help assistant: *"an explicit decision about what
app context it may read: an assistant that can see a chapter, a program and a training history is far more
useful and is also a privacy surface P-6 has never been asked about."* Coach AI needs the same answer.

There are **48 `*-live.ts` modules**. The question is which the Edge Function may query.

### 2.1 The proposed rule

> **The model may read what the athlete did. It may not read what anyone else did.**

One sentence, enforceable at the query layer, and it draws the line where the consent actually is.

### 2.2 Green — the athlete's own training. Read freely.

`lift-history-live` · `lift-maxes-live` · `activity-live` · `runs-live` · `programs-live` ·
`templates-live` · `planned-workout-live` · `continue-workout-live` · `learned-preference-live` ·
`coach-signal-live` · `goals-live` · `weekly-review-live` · `exercise-prefs-live` · `home-gym-live`

This set is exactly what powers capability tier C — *"why has my bench stalled," "you've swapped barbell
rows four weeks running,"* and the training-log read the pricing plan already names. It is the athlete's own
training data, generated by them, about them.

⚠ **`lift-history-live` stores weights un-normalised.** Convert before reasoning or every answer is wrong
for a kg athlete. This is a known trap, already recorded.

### 2.3 Amber — the athlete's body. Only on an explicit, per-request ask.

`body-metrics-live` · `photos-live` · `transformation-live`

Already governed by the pricing plan's four photo rules and the 18+ floor. The binding one is **rule 3 —
only when asked, never volunteered.** That extends here: the model does not get a standing subscription to
body metrics it can bring up unprompted. The athlete hands it a photo, or asks a question about their own
measurements, and that request scopes the read.

### 2.4 Red — never. Other people's data.

`squad-live` · `squad-feed-live` · `squad-records-live` · `squad-discover-live` · `friends-live` ·
`friends-feed-live` · `train-together-live` · `presence-live` · `challenges-live` · `admin-live`

**This is the sharpest line in the document.** Every one of these contains data authored by people who are
not the athlete talking to the model and who have consented to nothing. A squad-mate posted a check-in to
their squad, not to a language model. A friend's workout appearing in a feed is not the asking athlete's
data to send anywhere.

There is no capability in the scope doc that needs any of it. The cost of the restriction is zero and the
cost of getting it wrong is the kind that ends products.

`admin-live` is red for a different reason: it is operator data, and `isAppAdmin()` already states the rule
that the gate belongs in Postgres.

### 2.5 Amber — the athlete's legacy. Read only what the answer needs.

`legacy-*` · `accomplishments-live` · `chapter-detail-live` · `honors-live` · `trophy-case-live` ·
`rank-live` · `progress-hub-live`

The athlete's own, so not red — but a sealed chapter reflection is the most personal writing in the app, and
sending it to answer *"what should I train today"* is a poor trade. Read on relevance, not by default.

### 2.6 The enforcement note

The read allowlist belongs **in the Edge Function and in Postgres RLS**, not in the prompt. A system prompt
saying "do not look at squad data" is not a security boundary — it is a request. This is the same rule
`entitlement.ts` already states about itself: *"the gate belongs in Postgres, and the client merely avoids
drawing a door it knows is locked."*

---

## PART 3 — ⚠ BLOCKER: the flagship example is a sentence the app refuses

The pricing plan sells *Talk to Holt in plain English* with exactly one example:

> ***"My shoulder hurts, swap tomorrow."***

`isMedical()` in `chat-core.ts:803` tests against a deliberately broad pattern that includes **`hurt\w*`**.
That sentence trips the medical stop and returns:

> **OUT OF MY LANE** — *"That's a physio's job, not mine. Get it looked at — I'll still be here after."*

**The one example used to sell the feature is the one the safety layer blocks.** Not a hypothetical: the
regex is shipped, the example is in the locked plan, and they cannot both stand.

This is not an argument for weakening the check. The reasoning behind it is right, and stated in the file: a
false positive costs an athlete a redirect they can ignore; a false negative is a training app improvising
about an injury. But the current gate also means **an athlete cannot use ordinary words to ask for the
substitution the app already gives away for free** — manual substitution is a free-tier feature, and
refusing to perform it because the athlete said "hurts" is worse service with no safety gain.

### The resolution — split advice from action

The product already has this exact pattern, in the photo rules: *always paired with an action, never an
assessment.* Apply it here.

| Athlete says | Intent | Response |
|---|---|---|
| *"My shoulder hurts, swap tomorrow"* | **Action** — a substitution request | Perform the swap. No commentary on the shoulder, no advice, no reassurance |
| *"My shoulder hurts, what's wrong with it?"* | **Advice** — diagnosis | `MEDICAL_STOP`, unchanged |
| *"I tore my rotator cuff"* | **Acuity** | `MEDICAL_STOP`, unchanged — and never map it onto the `shoulders` enum (Part 1 §1.2) |

Swapping an exercise away from a joint the athlete named is a **mechanical** act — the same one the free
substitution button performs — and doing it silently is honest. Saying anything *about* the shoulder is
medical, and stops.

**Both rules go in the system prompt and in code.** The prompt shapes the reply; `isMedical()` stays as the
backstop, narrowed only to permit the action path, with the mutation itself still routed through the
existing safe-edit layer.

---

## Decisions required before D1

| # | Decision | Recommendation |
|---|---|---|
| 1 | `lower_back` — drop `Carry`, or verify the assembler with full equipment (§1.3) | **Verify first**, using the matrix test that caught the `no_barbell` bug |
| 2 | `no_jumping` — remove `run`, or document and rename to `no_impact` (§1.4) | **Remove `run`** |
| 3 | Does `limitations.ts` go through a human approve/publish pass before D1? (§1.7) | **Yes.** It is the only content in the app touching injury that never had one |
| 4 | Adopt the green/amber/red read allowlist? (Part 2) | **Yes**, enforced in the Edge Function and RLS, not the prompt |
| 5 | Split advice from action on medical language? (Part 3) | **Yes.** Otherwise the flagship example does not work and the plan needs a different one |

---

*Reviews `src/domain/coach/rulebook/limitations.ts` and `src/domain/coach/chat-core.ts` as of 2026-08-12.
Not a clinical review. Authority on pricing and tiers remains the Pricing Structure & Monetization Build
Plan.*
