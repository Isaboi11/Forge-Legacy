# Forge Coach — Architecture v1.0

**Status:** SCOPE DECISION MADE — 2026-08-31. **FC-D1 – FC-D20 decided; FC-D21 – FC-D22 open and non-blocking.**
Build not started. Nothing blocks Phase B.
**Supersedes nothing.** Closes the PRD gate on "Coach / Trainer Accounts".
**Governs:** the coach-facing CRM (a separate web app) and the coached-client level inside the Expo app.
**Companion:** the integration assessment approved 2026-08-15 (`~/.claude/plans/i-want-to-make-greedy-sunrise.md`),
which holds the file-level findings this document decides against. Everything load-bearing is restated here.

---

## Section 1 — What this is, and what it is not

**Forge Coach is a coach-facing CRM for a human personal trainer with paying clients** — roster, weekly
check-ins, messages, programs, and a longitudinal record per client.

**It is not Coach Holt.** Holt is the in-app AI that generates programs for an athlete. Different product,
different user. The codebase cannot express that distinction today, because `/coach` (`src/app/coach.tsx`,
1,441 lines), `athlete_entitlement.coach_ai`, migrations `0138`/`0143`/`0144`, `src/domain/coach/**`,
`supabase/functions/coach-interpret/` and `src/components/forge/Coach*.tsx` are all already Holt.

`Forge-Legacy-Master-PRD.md` lists Coach / Trainer Accounts under *Future Roadmap — Not Scheduled*, gated by
*"None should be designed or built without a separate, documented scope decision."* **This document is that
decision.** It closes Master Status Decision Queue row 23; §7 lists the two non-blocking questions that
remain.

### 1.1 The one-line shape of the problem

**The observation half of the CRM is already collected. The conversation half does not exist.**

Already there, needing a coach-shaped query rather than new capture: `body_entries` (weight),
`transformation_entries` (the exact six poses `rf/rs/rb/ff/su/bf`, plus a working then/now compare),
`program_sessions` (adherence), and every set of every lift in `workout_sets`. That covers Overview, Lifts,
Photos, Program, the roster table and the adherence bars.

Does not exist, on either side: any check-in form, questions, schedule or answers; **any messaging at all**;
the coaching log. `athlete_weekly_reviews` is Holt writing *to* the athlete, and `0049` replaced the original
squad status+note check-in with a 30-second video.

**The coached-client level is therefore almost entirely the conversation half.** The app being otherwise
near-complete does not shorten it, because asking a person a question and storing the answer is the one thing
this product has never done.

---

## Section 2 — Decisions

### Product and placement

**FC-D1 — Forge Coach is authorized as a scoped second product.** Invite-only, no directory, no marketplace,
no platform-intermediated coach↔client payment. So scoped, it does not collide with the marketplace bans in
`Community-System-Architecture-v1.0.md`, `Squad-System-Architecture-v1.0.md` §16, or
`Program-Browse-Wireframe-Spec-W2.md` (whose bans are *"permanent product architecture decisions — not
temporary deferrals"*). Three LOCKED docs already pre-cleared pieces: `Exercise-001` §16 reserves
`visibility: 'COACHED_ATHLETES'` (*"No schema change required"*), `Rank-System` FC-7 rules a human coaching
layer **"Compatible"**, `W-28` W28-D9 preserves coach-system `movementPattern` writes.

**FC-D2 — Every schema, route and identifier is `trainer_*`.** The product name "Forge Coach" is unaffected.
Cheap now, unfixable later — see the namespace collisions in §1.

**FC-D3 — The coach CRM is a separate web app against the same Supabase project.** The Expo app has no
responsive layer (zero breakpoints, zero `@media`, zero max-width page containers, zero two-pane layouts
across 89 route files), a mobile-only token vocabulary (type tops at 25px, spacing at 24px,
`tapTargetMin: 44`), no table primitive, and an 11.11 MB single bundle with `asyncRoutes` absent.
`0129_admin_gate.sql` is the guard pattern to copy; `ds-bundle/tokens/forge-legacy-tokens.css` ports directly,
because it is already CSS. **Athlete-side surfaces ship in Expo** (§4).

**FC-D4 — Coach access is athlete-granted consent, never coach privilege.** A `trainer_clients` row is created
by an invitation the athlete accepts; revocation is immediate. Modelled as a new rung on the existing
clearance ladder in `athlete_profile()` (`0073`): `owner > coach > friend > squad > stranger`.
⚠ **That ladder is duplicated in SQL and in `src/domain/visibility/profile-visibility.ts` — both must move
together.** Framed this way, `Squads-Hub-Wireframe-Spec-S1.md` §10.3 (*"not overridden for premium users,
coaches, or squad admins"*) and Squad Amendment 001's *"Consent, not privilege, is the gate"* stand unamended.

**FC-D5 — Invite-only. There is no trainer directory and no discovery.** `SOC-D15` bars discovery outright —
exact-handle-only, no suggestions, no asymmetric relationships. Invite-only sidesteps it and all three
marketplace exclusions; a "find a trainer" surface would require amending four locked decisions.

**FC-D6 — A client may have one coach at a time.** Unique constraint on the client in `trainer_clients`.
Forced by `Program-Architecture-Amendment-001`: *"Program Strip shows exactly one Active program… no
pluralizing of active programs — only one is ever shown."* Two coaches assigning blocks either breaks that
rule or leaves one coach writing into a program the client cannot run. Ending one relationship and starting
another is normal; historical `trainer_id` stamps (FC-D10) persist on the old rows, so the record reads
correctly across a coach change.

### Money and entitlement

**FC-D7 — The coach pays Forge a per-seat monthly fee. The client never pays for coaching through Forge.**
Money moves coach→Forge only, which is an ordinary B2B subscription. **There is no coach→client payment
rail**, so the payments-compliance project the 2026-08-15 assessment warned about does not arise, and the
marketplace fences in FC-D1 stay intact.

**FC-D8 — The coached-client level is not Premium.** It copies the `coach_ai` shape from
`Monetization-Architecture-Amendment-003` (MA3-D2/D3): a concurrent add-on flag, not a fourth tier and not a
tier above Premium. A client who separately holds Premium keeps it; the two compose.

**FC-D9 — The coached level opens exactly what the coaching relationship produces, and nothing else.**

| Opened | Unchanged |
|---|---|
| Photos — uncapped | Squads — stays at 1 free |
| Trainer-built programs — uncapped | Videos — stays at 5 persistent |
| Transformation Compare | Custom day templates — stays at 5 |
| Check-in submission + the coach thread | Spreadsheet imports — stays at 1 lifetime |

Transformation Compare is included because the client shoots six poses a week *because her coach asked*, and
her coach reads that exact comparison weekly in the CRM. Denying her a comparison of her own photos while he
studies it is not defensible, and it is not a monetization loss — she is not a free user who would have
converted, her coach is paying a seat for her. Note Compare is named *"the paid moment"* in MA3 §5.1 but is
**not gated in code today** (`PaidFeature` has exactly one member, `'weekly_review'`), so this is a decision
taken before a retrofit, not after one.

**FC-D10 — Content created under coaching never counts against the free counter, ever.** Provenance is stamped
on the row at creation (`trainer_id`, or an equivalent flag) and never recomputed.
⚠ **It must be the row's own provenance, not a live join on `trainer_clients`** — a join would silently
re-count every photo the moment the seat lapses, which is precisely the outcome this decision rejects.
When the relationship ends she returns to the free tier with her full free headroom intact, and everything she
made under coaching remains permanently readable. This is `Never Charge For History` and MA3's *"Your legacy
is yours forever. The coach is a service"* applied literally.

**FC-D11 — Coach-assigned programs are exempt from `programs_cap_guard()`.** MA3-D10 (*"a program someone
sends you consumes a slot"*) and MA3-D9 (*slots do not reopen on delete*) would otherwise have a coached
client exhaust a lifetime cap of 3 within three months, using slots she did not choose to spend.
⚠ **`programs_cap_guard()` fires on the RECIPIENT, not the sender** — the exemption belongs in the guard, not
in the coach's write path.

**FC-D12 — MA3 requires an amendment.** FC-D9, FC-D10 and FC-D11 each modify a locked monetization decision
(MA3-D8 photos, MA3-D10 received programs, and the cap model generally). **That amendment is now authored:**
`Docs/Amendments/Monetization-Architecture-Amendment-005-Coached-Client-Level.md` (MA5-D1 – MA5-D7), which
carries FC-D9/D10/D11 into effect and **closes FC-D12**. Its central finding sharpens FC-D10 from a
preference into a requirement: the coached level **raises no cap and instead removes rows from the count**,
because uncapping is evaluated live and would snap back to 75 the moment a seat lapsed, leaving the client
over a limit she was invited to exceed. Per **MA3-D16** no cap value is a constant in `src/`; MA5 in fact
changes no number at all.

### Program authoring

> **FC-D19 and FC-D20 were taken on recommendation on 2026-08-31, not by explicit PO ruling.** Both choose
> the option that *preserves* existing architecture rather than reversing it, which is why they were safe to
> take. Either can be reversed in one line; nothing downstream has been built against them yet.

**FC-D19 — Loading is percent-native. There is no absolute-weight field.** The coach prescribes a percentage
and the client sees a weight. `load` is a documented refusal, not a gap — `programs-live.ts:118-133`,
*"This is the one load field in the model, and it is deliberately NOT an absolute weight"* — and loading
resolves as `percentOfMax` / `percentScheme` / `percentOf` against the athlete's `lift_maxes`. The design's
headline override, *"Week 8 bench load drop to 195 with a pause note"*, is expressed as a percentage that
renders as 195 lb for that client. This costs nothing, reverses no decision, and is arguably better
coaching: a percentage travels correctly when the client's max moves, and an absolute number does not.

Rejected: adding `loadLb?` to `ExercisePrescription` (reverses a deliberate architectural decision for
display convenience) and an absolute-only coach layer (makes coach programs and app programs render loads
differently, which is a permanent seam in the one screen both products share).

⚠ **Verify before building on it:** `restSec` and `substitution` exist on the type but are **dead** —
`adopt-core.ts` copies neither, `ProgramExercise` has neither, and `grep '\.substitution'` returns zero
non-test readers. The design shows both prominently.

**FC-D20 — Overrides are applied through `edit-ops.ts`, and stored separately as an intent log.**

There is no override primitive in this codebase: every program edit is a full `structure` jsonb overwrite
via `updateProgram()` (`programs-live.ts:383`), instances are pure copies, and non-propagation is explicit
in `0115` — *"their copy is theirs from the moment they take it."* The design's key
`'W<week>|<workoutCode>|<exerciseName>'` cannot address anything reliably: `code` is discarded at adoption
and re-lettered by position (`adopt-core.ts:143`), `ProgramDay` has no id, and keying by exercise name
breaks under the substitution feature the design itself wants.

So the coach's edits go through the path Holt already proves — ops (`swapExercise`, `setPrescription`,
`setCardioTarget`, `rebuildDay`) mutating in memory, `commit()` returning a whole new `ProgramStructure`,
one `updateProgram` — **addressed by `(weekIndex, dayIndex, rowIndex)` + `catalogKey`, never by name or
letter.** The coach's overrides are additionally stored as an audit/intent log, which the UI needs
regardless for its "was 200 lb" trace and its "Save 3 changes" counter.

⚠ Two consequences to plan for: the first materialising edit flips `vary: false → true` and multiplies the
stored structure by the week count; and the `dayIndex` coordinate divergence in §6.1 must be fixed first,
because this decision makes `dayIndex` load-bearing for a second product.

### Coach Holt in the presence of a human coach

**FC-D13 — Holt changes audience rather than disappearing.**

- **Program generation — suppressed** toward a coached client. Two programming authorities is a contradiction;
  the coach's override copy is the client's real plan.
- **Weekly review — suppressed.** `athlete_weekly_reviews` is Holt writing *to* the athlete; it would arrive
  beside the coach's actual reply, saying overlapping things in a different voice.
- **In-workout help — suppressed for v1.** Form and rest cueing does not strictly contradict the coach, but
  "your coach is the voice" is cleaner. `M7-D13` already provides the mechanism (*in-workout Holt is
  suppressed, not gated*), so this costs nothing to implement.
- **Holt keeps working, pointed at the coach** — which is what the CRM composer's "written by assist"
  pre-written draft already is.

⚠ Open: whether the client is told a reply was drafted by assist. See FC-D22.

### Ending the relationship

**FC-D14 — On revocation: words stay, everything else goes dark.** The instant the athlete revokes, the coach
loses weight, measurements, lifts, adherence and **all photos, including photos attached to past check-ins**.
The message thread and the *text* of past check-in answers remain in an archived roster entry, read-only.
Her body record is hers and the service has ended; correspondence is a two-sided artifact, and nowhere else
does this app delete one person's half of a conversation out of the other person's account. This also places
the liability-sensitive content — physique photos — on the correct side of the line (see FC-D16).

**FC-D15 — A lapsed coach seat suspends; it does not destroy.** Non-payment is not revocation. The coach's
access suspends and restores on payment. The client's side is unaffected either way, because FC-D10 already
guarantees her content never re-counts.

### Security and enforcement

**FC-D16 — Private buckets and signed URLs are a prerequisite, not a follow-up.** All seven storage buckets
are `public: true` and `createSignedUrl` appears **nowhere** in `src/` or `supabase/` — every read is
`getPublicUrl()`. RLS on `transformation_entries` protects the *row*; the object is world-readable to anyone
holding the URL, forever. `0146:298` acknowledges this and `FORGE_DELTAS.md:733` flags it as a
before-real-users item. **A coach holding paying clients' physique photos is a different liability class from
consumer exposure.** No physique photo reaches a coach before this closes.

**FC-D17 — Sealed weeks must be enforced in Postgres.** The design's promise that *"weeks she has already
logged stay sealed"* is not the app's rule. `0123`/`0156` block only structure changes on a sealed state and
session-*count* changes on an active program; **rewriting a week the client already trained is permitted by
SQL** and blocked solely by TypeScript in `edit-ops.ts`, which a coach RPC bypasses. Requires a trigger or RPC
check joining `program_sessions` on `(program_id, week_index, day_index)`. This hardens the athlete path too.

**FC-D18 — Billing UI stays stubbed through v1.** The coach's seat subscription (FC-D7) is handled as a Forge
subscription outside the CRM. The Billing tab keeps its stub.

---

## Section 3 — What must be built (backend, shared)

1. `trainer_*` guard table and `trainer_guard()` on the `0129_admin_gate.sql` pattern — RLS-on-zero-policies,
   guard as the first statement of every RPC, `revoke execute from public`.
2. Consent: invite, accept, revoke; the `coach` rung in `athlete_profile()` **and** `profile-visibility.ts`.
3. Check-in form, questions, schedule, and responses — all new.
4. Threads and messages — all new, both sides. Broadcast delivers as ordinary 1:1 rows (§5).
5. Provenance stamp on photos and programs (FC-D10); `programs_cap_guard()` exemption (FC-D11).
6. Private buckets + `createSignedUrl` (FC-D16).
7. Server-side sealed-week enforcement (FC-D17).
8. Week anchor on `transformation_entries` — entries are freeform today, grouped by chapter, with elapsed time
   `Date`-parsed from a free-text `label` and **silently falling back to now** on anything unparseable.
9. The four missing measurement columns — `hips`/`thigh`/`calf`/`neck` have **zero occurrences repo-wide**;
   only `waist_in`, `chest_in`, `arm_in` exist (`0028`). ⚠ `weight_lb` is NOT NULL, so a measurement cannot be
   logged without a weight.

---

## Section 4 — What must be built (Expo app — the coached-client level)

1. **Check-in submission** — the whole form the CRM's builder produces: progress photos, body weight,
   measurements, the weekly metrics, and the reflection questions, with the due-day unlock and its one nudge.
2. **The coach thread** — the client's side. A submitted check-in renders as a distinct card, not a chat
   bubble. Drafts persist. Media attachments.
3. **Consent surfaces** — accept an invitation, see who coaches you, revoke from Settings.
4. **Weekly photo and weight prompt**, week-anchored (§3.8).
5. **Notifications** — check-in due, coach replied. ⚠ `KINDS` in `notifications-live.ts` **silently drops
   anything missing**, so new kinds must be registered there or the notification vanishes without error.

Everything else the coached client needs — programs, lifts, photos, body log — already exists and is reached
through the screens she already uses.

---

## Section 5 — Notes carried from the design

- **Broadcast is delivered as ordinary 1:1 messages** (*"Nobody sees the group"*). This needs no group object
  and keeps FC-D1's marketplace and community fences intact. Correct as designed.
- **The coaching log's Followed / Partly / Not is counted from the coach's replies, not self-report.** That
  requires a coach instruction to be an addressable object linked to subsequent sessions — a schema
  requirement not present in the 2026-08-15 assessment.
- **Status is fill + weight + bronze, never hue.** The desktop design's rule is the better one and matches the
  app's restraint; the mobile design file is the outlier and should be reconciled toward desktop.
- **Never state an exercise count.** The design's builder toast says 794; the app shows **721**;
  `exercises.json` has 797. Use the visible count or no count.

---

## Section 6 — Two live athlete-app defects surfaced by this work

Both are worth fixing whether or not Forge Coach ships.

1. **The `dayIndex` coordinate divergence.** `scheduleSlots()` emits *filtered* indices (`trainingDays()`
   drops empty days) while `edit-ops.ts materialise()` consumes *unfiltered* ones. **Any week containing an
   empty day lands an edit on the wrong day.**
2. **Public buckets** (FC-D16), already flagged at `FORGE_DELTAS.md:733`.

---

## Section 7 — Still open

**FC-D19 (load model) and FC-D20 (override model) were closed on 2026-08-31** and now sit in §2 under
*Program authoring*, taken on recommendation rather than by explicit PO ruling — see the note there. Neither
of the two below blocks a build.

| ID | Question | Notes |
|---|---|---|
| **FC-D21** | **Does the client see the coaching log's Followed / Partly / Not judgement?** | The coach's private note is explicitly private in the design. The adherence judgement is a rating of her, and the design does not say which side of the glass it sits on. |
| **FC-D22** | **Is the client told when a reply was drafted by assist?** | Raised by FC-D13. |

---

## Section 8 — Verification requirements

- **Prove the consent boundary empirically.** A granted pair reads; a revoked pair does not; a stranger does
  not. Test the **RPC**, not the UI, and assert the SQL ladder and the TS ladder agree.
- **Prove sealing empirically.** Attempt a prescription change on a slot holding a `program_sessions` row via
  direct RPC and confirm Postgres rejects it. TypeScript passing is not evidence.
- **Prove the cap exemption empirically.** A coached client exceeds 75 photos and 3 programs; the same client,
  after revocation, still reads all of it and still has her full free headroom (FC-D10).
- `npx tsc --noEmit` + `node --test`. Domain code imports relatively — `@/` is type-only and breaks
  `node --test`. Lint baseline is 1 error + ~13 warnings.
- Any migration: `ls supabase/migrations | tail` first. Highest is **`0181`** as of 2026-08-31, and `0152` is
  already used twice. Applied ≠ working.

---

## Change log

| Version | Date | Change |
|---|---|---|
| v1.1 | 2026-08-31 | Closed **FC-D19 (loading is percent-native)** and **FC-D20 (overrides apply through `edit-ops.ts`, addressed by `(weekIndex, dayIndex, rowIndex)` + `catalogKey`)**, both on recommendation rather than explicit PO ruling and both choosing the option that preserves existing architecture — flagged as such in §2 and reversible in one line. Closed **FC-D12**: `Monetization-Architecture-Amendment-005-Coached-Client-Level.md` is authored and carries FC-D9/D10/D11. **Nothing now blocks Phase B.** |
| v1.0 | 2026-08-31 | Initial. Closes the PRD scope gate and Master Status Decision Queue row 23. Records FC-D1–D18 decided; FC-D19–D22 open. The coached-client level decided in full: coach pays a per-seat fee (FC-D7), the level is not Premium (FC-D8), it opens photos + trainer-built programs + Compare and nothing else (FC-D9), coached content never counts against the free counter (FC-D10), one coach at a time (FC-D6), Holt changes audience (FC-D13), and revocation keeps the words while everything else goes dark (FC-D14). |
