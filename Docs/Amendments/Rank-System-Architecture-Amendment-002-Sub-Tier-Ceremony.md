# Rank System Architecture — Amendment 002: the ceremony fires on every rank, sub-tiers included

**Amends:** `Rank-System-Architecture.md` §5 (Promotion Types) and §13.2 (Sub-Tier Ceremony)
**Resolves:** **TBD-2** — sub-tier advancement surfacing
**Status:** LOCKED
**Date:** 2026-08-25
**Decided by:** PO, in review of the rank-card pass

---

## Section 1 — The decision

**RSA-A2-D1 — M-1 fires on every promotion, family-level and sub-tier alike. LOCKED.**

PO: *"Yes I want the card to fire off on every rank and subrank."*

All **28** steps of the ladder are ceremonial: the seven family promotions (Foundation → Builder, and so
on) and the three sub-tier promotions inside each family (Foundation I → II → III → IV).

## Section 2 — What this amends, and what it merely answers

Two different things, and they are worth separating.

**§13.2's first sentence is AMENDED.** It read:

> There is no ceremony for sub-tier advancement. M-1 fires only on family-level promotions (Foundation →
> Builder, Builder → Craftsman, etc.).

That is now false. M-1 fires on both.

**TBD-2 is ANSWERED, not overturned.** The same section left sub-tier surfacing explicitly open —
*"Sub-tier advancement surfacing: TBD-2 (see Section 22)… The most likely surfaces are P-2 Progress Hub
Rank Journey Preview and What's Next section"* — and §22's row `C-3: Sub-tier advancement surfacing`
records it as an architectural gap. The gap is closed: **M-1 is the surface**, and the Progress Hub's
Rank Journey now also shows every earned sub-tier badge at full strength (2026-08-25 pass), so the two
"most likely surfaces" the spec named are both live. C-3 is no longer a gap.

## Section 3 — Why the identity rule is untouched

§13.1 says sub-tiers are **not separate identities** — *"Foundation · I and Foundation · IV share the
identity 'I've started.'"* That stands, and this amendment does not weaken it.

A sub-tier ceremony announces **the same identity, held longer**. That is why the card shows the family's
identity statement (RSA §2.2) rather than inventing four variants of it: `domain/rank/identity.ts` is
keyed by family on purpose, and the ceremony at Foundation II says *"I've started."* exactly as the one
at Foundation IV does. **Do not author per-sub-tier identity statements** — that would contradict §13.1,
which this amendment leaves locked.

## Section 4 — What was already true in the code

⚠ **NO CODE CHANGED FOR THIS AMENDMENT, AND THAT IS THE POINT OF WRITING IT.**

`useEarnedMoments.ts` has always enqueued on either kind of promotion:

```ts
if (cancelled || !res || (!res.promotedFamily && res.promotedSubTier == null)) return;
```

and `refreshRank` reports the two as mutually exclusive — a family change sets `promotedFamily` and a
null sub-tier; a sub-tier-only change sets `promotedSubTier`. So the shipped behaviour has always been
what the PO has now asked for, and the **document** was the thing that was wrong.

**This amendment exists to stop a future session "fixing" it.** A reader who found §13.2 and then saw the
card firing at Foundation II would have every reason to delete that branch as a defect. That is precisely
the failure mode this repository has recorded more than once in the other direction — a locked clause
never applied — and it is no less expensive when the doc is the stale half.

## Section 5 — Two properties that must survive any future change here

- **One ceremony per level, ever.** The queue keys on `rank-${rankLevel}` (1–25), so a level that has
  already been announced cannot be announced twice however many tabs evaluate at once.
- **Family advancement stays capped at one per refresh** (RS-D12, RSA §12 — *"every promotion is
  individually experienced"*). An athlete who clears two families in one evaluation is walked up over
  consecutive visits rather than shown two cards at once. Sub-tiers ride the same path.

## Section 6 — Non-behaviours

- No new artwork. A sub-tier already has its own badge (`resolveRankBadge` is keyed by family **and**
  level, 1–4), and the ceremony has shown the real badge since the 2026-08-25 pass.
- No change to how ranks are *earned*. This is presentation only; the RCM is untouched.
- No push notification. Ceremonies never push (P-5), and that rule is unaffected.
