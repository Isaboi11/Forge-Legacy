# Monetization Architecture Amendment 004 — A Week Is Not a Program Slot
## Forge Legacy | Version 1.0 — August 2026

**Amendment ID:** Monetization-Architecture-Amendment-004
**Status:** 🔒 LOCKED
**Date:** 2026-08-13
**Amends:** `Monetization-Architecture-Amendment-003-Add-On-Tier-And-Launch-Limits.md` §3 (MA3-D4 copy),
§5 (cap table), §9 (decision register), §11 (checklist) · `Monetization-Architecture-Amendment-001.md`
cap table
**Related:** `Program-Architecture-Amendment-002-Short-Programs-And-Completion.md` (PA2-D1) ·
`Rank-Computation-Model-Amendment-003-Minimum-Block-Length.md` (D-RCM-30)
**Supersedes:** Nothing. MA3 stands; **MA3-D16 in particular is honoured, not amended** — every number
here is server-side config. Only the key is new.
**New decisions:** MA4-D1 – MA4-D5

---

## Section 1 — The problem the existing caps create

`caps.programs` is **3 lifetime, including received, and the slots do not reopen on delete** (MA3-D9,
MA3-D10). That rule is right for what it was written about: a program is a multi-week commitment, and
three of them is a real amount of free product.

`Program-Architecture-Amendment-002` now permits a program to be **one week**. Under the existing cap, a
free athlete who builds three deload weeks has **permanently exhausted their program allowance** — three
throwaway weeks, and the door to a real 12-week block is closed forever, with no way to reopen it. That
is not a paywall anybody designed; it is a rule meeting a case it was not written for.

---

## Section 2 — Decisions

### MA4-D1 — A new cap key, `short_programs`

One new server-config allowance, spent by **either** door into a short plan:

- saving a **week template**, and
- creating a **program of fewer than four weeks** by any path.

`caps.programs` continues to govern programs of **four weeks or more**, unchanged at 3 lifetime.

The split runs on exactly the line D-RCM-30 already draws. This is deliberate: the product now has one
threshold, and it means the same thing everywhere — below it a thing is a *week of training*, at or above
it a thing is a *program*. Two different numbers for the same distinction would be two rules to keep in
step, and one of them would eventually drift.

### MA4-D2 — The number is config, and the number is a guess

Per **MA3-D16**, `short_programs` is a column in `entitlement_config`, never a constant in `src/`.

**Launch values: 3 free, unlimited paid.** Recorded as a *guess*, exactly as MA3 §9 records every other
cap number as a guess to be set from real usage after the testers run uncapped. Three is chosen only
because it lets a free athlete keep a deload week, a travel week and a test week — the three cases that
motivated the feature — without paying, and without touching their program slots.

### MA4-D3 — Charged on creation, and it does not reopen

The allowance is spent when the thing is **created**, not when it is started, and a deletion does not
return it — identical to MA3-D9's rule for programs, for identical reasons: *"otherwise the cap never
fires for an athlete running one block at a time."*

**Consequence, stated rather than discovered:** a week template that is saved and never started still
spends a unit. That is the correct trade. The alternative — charging on start — requires tracking whether
a given plan has already been charged, so that starting, ending early and restarting does not charge
three times, and that is materially more machinery than the behaviour difference is worth.

### MA4-D4 — Starting a week template you already paid for is free

Saving a week template spends a unit. **Starting it does not spend a second one.** The program it creates
carries a reference to the template it came from, and a program created that way is not charged.

Without this, one intent costs two units and the cap fires at half its stated number — the kind of
arithmetic error a user experiences as the product lying about its own limits.

### MA4-D5 — A short Holt block spends `short_programs`, not the Holt allowance

MA3-D4 grants **one Holt-authored program, lifetime**, on the reasoning that *"a program is a commitment;
a day is a whim"* — the wall belongs on the commitment.

A one-week block asked of Holt is not that commitment. If it spent the lifetime allowance, an athlete who
asked for a deload week would have **permanently** spent their only Holt program on a week, and would
discover it only when they later asked for the real thing. That is the same trap as Section 1, with a
worse ending, because the Holt allowance is one rather than three.

**So a Holt-authored program of fewer than four weeks charges `short_programs`, and leaves
`caps.holt_programs` untouched.** The MA3-D4 reasoning is preserved, not overturned: the wall is still on
the commitment, and this amendment simply observes that a week is not one.

**Copy consequence:** MA3-D4's row and §3's table say **"Holt four-week programs"**. That phrasing was a
description of the only length Holt could produce, not a decision that four is the qualifying number.
It now reads **"Holt programs (4+ weeks)"**, so the rule is stated rather than implied by a
no-longer-true constraint.

---

## Section 3 — Cap table, as amended

| | Free | Paid |
|---|---|---|
| **Programs** (4+ weeks) — built, generated, *or received* | 3 lifetime | Unlimited |
| **Short programs & week templates** *(new, MA4-D1)* | **3** | **Unlimited** |
| **Holt programs (4+ weeks)** *(copy amended, MA4-D5)* | 1 lifetime | Unlimited |
| Day templates | 5 | Unlimited |

Every other row of MA3 §5 is unchanged.

---

## Section 4 — Implementation contract

Recorded because two of these have already caused live defects in this codebase.

1. **⚠ Changing a column DEFAULT does not backfill the existing row.** `entitlement_config` holds exactly
   one row. If it is not explicitly updated with the new key, every athlete — **including Premium, and
   including the PO** — reads a missing cap as zero and is blocked from the feature entirely. The config
   update must be applied and **verified** before any client that reads the key ships.
2. **The cap is enforced in Postgres**, not in the client. The client's pre-check exists to avoid letting
   someone build a thing they cannot save (MA3's own principle); the database is what decides.
3. **The usage counter is monotonic** and has no delete trigger, per MA3-D9. This is deliberate and
   should be commented as such, because "for symmetry" is how a delete trigger nearly got added to the
   program counter.
4. **M-7 renders four of six canonical rows** and that list is locked at six. `short_programs` maps onto
   the existing Programs row rather than adding a seventh.
5. **A received short program charges the recipient**, per MA3-D10. The accept flow must surface the
   refusal as M-7, not as a raw database error string.

---

## Section 5 — Verification checklist

- [ ] `entitlement_config`'s single existing row carries `short_programs` in both `free_caps` and `paid_caps` — verified by reading it back, not by trusting the DEFAULT
- [ ] A Premium athlete is not blocked from anything by the new key
- [ ] Free athlete at the cap: saving a week template is refused with M-7
- [ ] Free athlete: **starting** a week template already saved is allowed and charges nothing (MA4-D4)
- [ ] Free athlete: building a 4-week program spends `programs`, not `short_programs`
- [ ] Free athlete: building a 2-week program spends `short_programs`, not `programs`
- [ ] Deleting a week template does not return the unit
- [ ] Asking Holt for a 1-week block leaves `caps.holt_programs` untouched
- [ ] MA3 §3's table and MA3-D4's row no longer say "four-week"

---

## Section 6 — Change log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-08-13 | Initial. Adds the `short_programs` cap (MA4-D1) at 3 free / unlimited paid, recorded as a guess (MA4-D2), charged on creation and non-reopening (MA4-D3). Exempts a program created from an already-charged week template (MA4-D4). Rules that a short Holt block spends the new cap rather than the 1-lifetime Holt allowance, and amends MA3-D4's "four-week" copy to state the rule rather than imply it (MA4-D5). |

---

*Monetization Architecture Amendment 004 — A Week Is Not a Program Slot*
