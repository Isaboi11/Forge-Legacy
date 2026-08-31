# Monetization Architecture Amendment 005 — What a Coach Asked For Is Not What You Spent
## Forge Legacy | Version 1.0 — August 2026

**Amendment ID:** Monetization-Architecture-Amendment-005
**Status:** 🔒 LOCKED
**Date:** 2026-08-31
**Amends:** `Monetization-Architecture-Amendment-003-Add-On-Tier-And-Launch-Limits.md` §5 (cap table,
MA3-D8 photos), §5.2 (MA3-D10 received programs), §5.1 (Transformation Compare as *"the paid moment"*),
§9 (decision register)
**Related:** `Docs/Forge-Coach-Architecture-v1.0.md` (FC-D7 – FC-D12, which this amendment carries into
effect) · `Monetization-Architecture-Amendment-004-Short-Program-Cap.md`
**Supersedes:** Nothing. MA3 stands; **MA3-D16 is honoured, not amended** — no number here is a constant
in `src/`. In fact this amendment changes no number at all (§2, MA5-D2).
**New decisions:** MA5-D1 – MA5-D7

---

## Section 1 — The problem the existing caps create

`Forge-Coach-Architecture-v1.0.md` authorizes a coached-client level: a human trainer pays Forge a
per-seat monthly fee, and their client receives check-in forms, a message thread, and programs the
trainer writes (FC-D7). The client never pays.

Two locked caps meet that arrangement badly, and in both cases the client is charged for work she did not
choose to do.

**Photos.** MA3-D8 sets the free cap at 75, and MA3 §5.1 says exactly why: *"six poses per entry, one
entry a month, twelve months = 72."* The number was sized to a **monthly** cadence. A weekly check-in is
six poses a week. **75 photos is spent in roughly twelve weeks — a single training block** — and she took
every one of them because her coach asked her to.

**Programs.** MA3-D10 rules that *"a program someone sends you consumes a slot"*, and MA3-D9 that slots
*do not reopen on delete*. The cap is 3, lifetime, monotonic. A coach writing his client a new block each
quarter exhausts her lifetime allowance inside a year, using slots she never spent. ⚠ Compounding it,
`programs_cap_guard()` fires on the **recipient**, so the charge lands on her and not on the trainer whose
seat fee already paid for the relationship.

Neither is a paywall anyone designed. Both are rules meeting a case they were not written for — the same
shape as MA4 §1.

---

## Section 2 — Decisions

### MA5-D1 — The coached level is a third axis, not a fourth tier

A `trainer_client` entitlement flag, on the **`coach_ai` shape** (MA3-D2/D3): concurrent with FREE or
PREMIUM, never a tier above either. A client who separately holds Premium keeps it and the two compose;
a client who does not stays FREE for every purpose this amendment does not name.

**It does not grant Premium** (FC-D8). What it opens is listed in §3 and is deliberately short.

### MA5-D2 — The coached level raises no cap number. It removes rows from the count

This is the mechanism decision, and it is the one that matters.

The obvious implementation — set `caps.photos = -1` while a `trainer_clients` row exists — is **wrong, and
wrong in a way that only shows up months later**. Caps are evaluated live. The moment the trainer's seat
lapses or the client revokes, the cap snaps back to 75 while her account holds 190 photos, and she is
over a limit she was invited to exceed. She would be punished, retroactively, for having been coached.

**So the count excludes the rows instead of the cap admitting them.** Content created under coaching is
never counted, at any tier, at any time, whether or not the relationship still exists. The numbers in
MA3 §5 are untouched — 75 still means 75, and it still means a full year of self-directed progress
photos. It simply never sees what her trainer asked her to produce.

This is `Never Charge For History` and MA3's *"Your legacy is yours forever. The coach is a service"*
applied literally: the service ends, and nothing she made during it is taken back or turned into a debt.

### MA5-D3 — Coached photos never enter `athlete_live_counts()`

Photos are a **live count**, not a stored counter: `athlete_live_counts()` (`0145`) sums
`chapter_photos` where `is_video = false` plus every pose key inside each `transformation_entries.photos`
map. The exclusion is therefore a predicate on that function, and nothing else changes.

⚠ **Photos are not enforced in Postgres today.** `programs_cap_guard_trg` is the only cap trigger in the
schema; the photo cap is display-only, decided by `src/lib/entitlement.tsx`. This decision is a forward
contract on the count function — binding whenever photo enforcement lands, and free to implement now.

⚠ **The abuse guard must honour the same exclusion.** `paid_caps.photos` is **1000** — an abuse guard per
Amendment 001 §4A, not a tier feature. A coached client shooting six poses a week reaches 1000 in about
three years. An athlete tripping an abuse guard for doing exactly what her trainer asked, every week,
without missing one, is the guard firing on its best possible user.

### MA5-D4 — A coach-assigned program never increments `athlete_usage.programs_created`

⛔ **This one cannot be retrofitted, and must be right at the first insert.**

`athlete_usage.programs_created` is monotonic *by design and by comment*: *"MONOTONIC. Nothing in this
schema decrements it, and nothing should be written that does."* There is no later correction, no
reconciliation pass, and no supported way to walk the number back. If a coach-assigned program increments
it once, that slot is spent permanently.

Therefore `programs_cap_guard()` must recognise coach provenance **before** it counts — not by a cleanup
job, not by a compensating decrement, and not by a `paid_caps` override. Coach-assigned programs are
exempt from the guard entirely (FC-D11).

MA3-D9 and MA3-D10 are otherwise undisturbed: a program from a *friend or squad-mate* still consumes a
slot, deletes still do not reopen one, and a client who builds her own programs alongside her coach's
spends her own three exactly as before.

### MA5-D5 — Provenance is a column on the row, written once at creation

The exclusions in MA5-D3 and MA5-D4 are keyed to a provenance value stamped on the photo or program row
at the moment it is created — the `trainer_id`, or an equivalent flag — and never recomputed.

⚠ **It must not be a join on `trainer_clients`.** A join asks *"is this athlete coached right now?"*,
which silently re-counts every photo and every program the instant a seat lapses or a client revokes —
reintroducing the exact failure MA5-D2 exists to prevent, by the back door, with no code change to blame
it on. The row remembers who asked for it. The relationship table does not.

### MA5-D6 — Transformation Compare is free to a coached client

MA3 §5.1 names Compare *"the paid moment"* the 75-photo cap creates. That moment does not apply to
somebody whose trainer is paying for her seat and who is shooting six poses a week because he asked.
Her trainer reads that exact then/now comparison every week in the CRM; refusing her the same view of her
own body is not defensible, and it forgoes no revenue, because she is not a free athlete who would have
converted.

⚠ Note Compare is **not gated in code today** — `PaidFeature` in `src/lib/entitlement.tsx` has exactly one
member, `'weekly_review'`. This is a decision taken before a retrofit rather than after one.

### MA5-D7 — Nothing else moves

The coached level opens photos, trainer-built programs and Transformation Compare. **Every other cap and
allowance is unchanged**, and a coached client on the free tier remains a free athlete for all of them.

This is stated as a decision rather than left as an omission, because "she's paid for, so give her
everything" is the natural drift, and it would quietly hand away Premium for a seat fee that was priced
against coaching (FC-D8).

---

## Section 3 — Cap table, as amended

| Cap | Free | Coached client | Changed by this amendment |
|---|---|---|---|
| **Photos** | 75 | 75 — **coached photos are not counted** | MA5-D2, MA5-D3 |
| **Programs** | 3 lifetime, incl. received | 3 lifetime — **coach-assigned are not counted** | MA5-D2, MA5-D4 |
| **Transformation Compare** | paid | **free** | MA5-D6 |
| Squads | 1 | 1 | — |
| Videos | 5 persistent | 5 persistent | — |
| Custom day templates | 5 | 5 | — |
| Short programs | 3 (MA4-D1) | 3 | — |
| Spreadsheet imports | 1 lifetime | 1 lifetime | — |
| Holt programs / days / in-workout | 1 / 2 per month / none | **suppressed** (FC-D13) | — |

**The Free column is unchanged in every row.** That is the point of MA5-D2: this amendment moves no
number, it narrows what two counts look at.

---

## Section 4 — Implementation contract

1. **`trainer_client` is an entitlement flag**, resolved in `athlete_caps()` alongside `coach_ai`. Per
   MA3-D16 nothing here is a constant in `src/`.
2. **`programs_cap_guard()` gains a provenance check before it counts** (MA5-D4). Order matters: the
   exemption is a `return new` *ahead of* the increment, never a decrement after it.
3. **`athlete_live_counts()` gains a predicate**, not a new cap key (MA5-D3). The `paid_caps.photos = 1000`
   abuse guard reads the same excluded count.
4. **No delete trigger, no reconciliation job, no backfill that decrements.** MA4 §4 already records that
   *"for symmetry" is how a delete trigger nearly got added to the program counter*; the same warning
   applies with more force here, because a coached account is exactly where a well-meaning cleanup would
   look wrong.
5. **Gates have three outcomes** — `allowed` / `blocked` / `unknown`. `unknown` is not `blocked`, and M-7
   must never fire on it. One place answers: `src/lib/entitlement.tsx`.
6. **M-7 renders six canonical rows and that list is locked at six.** A coached client should see no upsell
   for a cap her trainer's seat already covers.

---

## Section 5 — Verification checklist

Per `Docs/Forge-Coach-Architecture-v1.0.md` §8, each of these is proven against the **RPC**, not the UI.

- [ ] `entitlement_config`'s single row is read back and its `free_caps` numbers are **unchanged** by this work
- [ ] A coached client uploads 200 photos; her counted total stays at whatever she uploaded outside coaching
- [ ] Her trainer assigns 6 programs; `athlete_usage.programs_created` is **unchanged** — inspected directly, not inferred from the UI
- [ ] She then builds a program herself: it **does** charge, and her own 3 are intact
- [ ] A program from a friend still charges her (MA3-D10 undisturbed)
- [ ] **Revocation:** she keeps all 200 photos readable, her counted total does not move, and she still has her full free headroom (MA5-D2)
- [ ] **Seat lapse:** same as revocation. A lapsed seat suspends the trainer, it does not re-count the client (FC-D15)
- [ ] A coached free client opens Transformation Compare without an M-7 (MA5-D6)
- [ ] A coached free client is still blocked at 1 squad, 5 videos, 5 templates (MA5-D7)
- [ ] No path in schema or code decrements `programs_created`

---

## Section 6 — Change log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-31 | Initial. Carries FC-D9/D10/D11 into effect, closing FC-D12. Establishes the `trainer_client` flag on the `coach_ai` shape (MA5-D1) and rules that the coached level **raises no cap and instead removes rows from the count** (MA5-D2) — because uncapping reverses on lapse and would re-cap a client at 75 holding 190 photos. Excludes coached photos from `athlete_live_counts()` and from the 1000 abuse guard (MA5-D3); exempts coach-assigned programs from `programs_cap_guard()` **before** the increment, since `programs_created` is monotonic and cannot be walked back (MA5-D4); requires provenance to be a column stamped at creation rather than a live join on `trainer_clients` (MA5-D5); frees Transformation Compare for coached clients, amending MA3 §5.1 (MA5-D6); and states explicitly that nothing else moves (MA5-D7). Every number in MA3 §5 is left as it stands. Carries PO decisions taken 2026-08-31. |

---

*Monetization Architecture Amendment 005 — What a Coach Asked For Is Not What You Spent*
