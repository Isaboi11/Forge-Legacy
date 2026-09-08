import type { RankFamily, RankLevel } from '../rank-artwork/resolver.ts';

/**
 * THE SEVEN RANK IDENTITY STATEMENTS — `Rank-System-Architecture.md` §2.2, LOCKED.
 *
 * *"Each rank family carries a locked identity statement — a single sentence that captures the athlete's
 * relationship to their own training at that stage of development. These are not marketing copy. They
 * are self-descriptions the athlete should be able to say honestly when they reach the rank."*
 *
 * ══ WHY THIS MODULE EXISTS ══
 *
 * The sentences were already in the app TWICE, in two screens, and the two did not agree with each other
 * or with the locked table:
 *
 *   · `progress-hub.tsx`'s `LADDER` carried six of the seven correctly and had Established as *"What I
 *     built outlives me"* — the spec says *"I've built something real."* A different claim, not a
 *     rewording: one is about what you leave behind, the other about what you have done.
 *   · `rank-progression.tsx`'s `FAMILIES[].essence` carried a wholly separate set of lines ("The
 *     beginning of every legacy", "The habit takes hold") that appear in no locked document.
 *   · The M-1 ceremony carried NEITHER, and said the same generic sentence at every rank.
 *
 * Three answers to "what does this rank mean", one of them authoritative and none of them shared. Now
 * one, imported by all three.
 *
 * ⚠ THE IDENTITY IS PER FAMILY, NOT PER SUB-TIER, AND THAT IS DELIBERATE — RSA §13.1: *"Sub-tiers are
 * NOT separate identities. Foundation · I and Foundation · IV share the identity 'I've started.' The
 * progression from I to IV represents increasing depth of that identity — not a transition to a new
 * one."* So a sub-tier badge shows its family's sentence. Writing four variants would contradict a
 * locked clause and invent meaning the rank system explicitly says is not there.
 *
 * ⚠ PURE, RELATIVE `.ts` IMPORTS ONLY — reachable from `node --test`.
 */
export const RANK_IDENTITY: Record<RankFamily, string> = {
  foundation: 'I’ve started.',
  builder: 'I’m building habits.',
  craftsman: 'I know how to train.',
  architect: 'I’m intentionally shaping my development.',
  established: 'I’ve built something real.',
  legend: 'My journey has become a meaningful story.',
  legacy: 'I repeatedly become the person I intend to become.',
};

/**
 * The identity statement for a family, or `''` for a family this build does not know.
 *
 * Empty rather than a fallback sentence: every caller renders this as the rank's own words, and a
 * stand-in would put a claim in the athlete's mouth that the spec never made.
 */
export const rankIdentity = (family: RankFamily): string => RANK_IDENTITY[family] ?? '';

/**
 * ══ THE ASCENT STATEMENTS — one sentence per rung, all 28 ══
 *
 * `Amendments/Rank-System-Architecture-Amendment-003-Sub-Tier-Statements.md` (🔒 LOCKED 2026-09-07).
 * PO: *"I do want a different saying for all of them."*
 *
 * ⚠ THIS IS NOT A SECOND IDENTITY TABLE, AND THE DISTINCTION IS THE WHOLE AMENDMENT. §13.1 still holds:
 * there are exactly SEVEN identities, one per family, and `RANK_IDENTITY` above is untouched. An ascent
 * statement is that one identity *expressed at a depth* — which is precisely what §13.1 describes when it
 * says *"the progression from I to IV represents increasing depth of that identity — not a transition to
 * a new one."* Until now nothing in the product said what that difference was.
 *
 * The rule that keeps the two apart is structural rather than editorial: **tier I of every family IS the
 * family's identity statement, verbatim**, and II–IV deepen it. So the four lines provably belong to one
 * identity instead of being four claims that happen to sit near each other. `identity.test.mjs` asserts
 * it against `RANK_IDENTITY`, and asserts the whole table against the amendment's own §4 — the document
 * is the fixture, exactly as it is for the seven above.
 *
 * ⚠ WHICH SURFACE SAYS WHICH IS ALSO LOCKED (RSA-A3-D4). The M-1 ceremony and the rank ascension post
 * announce ONE RUNG, so they say the ascent statement. The Progress Hub and Rank Progression show
 * FAMILIES, so they keep `rankIdentity` — picking one of four rungs to stand for a whole family is the
 * §13.1 error in the other direction.
 *
 * ⚠ PURE, RELATIVE `.ts` IMPORTS ONLY — reachable from `node --test`.
 */
export const RANK_ASCENT: Record<RankFamily, Record<RankLevel, string>> = {
  foundation: {
    1: RANK_IDENTITY.foundation,
    2: 'I keep coming back.',
    3: 'I’ve stopped waiting to feel ready.',
    4: 'I don’t have to talk myself into it.',
  },
  builder: {
    1: RANK_IDENTITY.builder,
    // The PO's own words, both of them.
    2: 'I’m becoming consistent.',
    3: 'I’m putting in the work.',
    4: 'I train whether or not I feel like it.',
  },
  craftsman: {
    1: RANK_IDENTITY.craftsman,
    2: 'I know why every session is there.',
    3: 'I can change the plan without losing it.',
    4: 'I trust my own judgment under the bar.',
  },
  architect: {
    1: RANK_IDENTITY.architect,
    2: 'I train toward something I chose.',
    3: 'I plan in seasons, not sessions.',
    4: 'I know what the next year is for.',
  },
  established: {
    1: RANK_IDENTITY.established,
    2: 'What I’ve built holds under pressure.',
    3: 'My training has outlasted my excuses.',
    4: 'This isn’t something I’m trying any more.',
  },
  legend: {
    1: RANK_IDENTITY.legend,
    2: 'I’ve kept going long enough for it to mean something.',
    3: 'What I’ve done is worth telling.',
    4: 'The work speaks before I do.',
  },
  legacy: {
    1: RANK_IDENTITY.legacy,
    2: 'I change on purpose, and it holds.',
    3: 'Becoming is a habit I keep.',
    4: 'This is who I am, and I chose it.',
  },
};

/**
 * The sentence for one rung.
 *
 * ⚠ FALLS BACK TO THE FAMILY IDENTITY, NOT TO EMPTY — and only for a level this build does not know.
 * A rank engine that one day grows a fifth sub-tier would otherwise announce it in silence; the family's
 * identity is always a true thing to say about any rung of that family, which is the entire premise of
 * §13.1. An unknown FAMILY still yields `''`, exactly as `rankIdentity` does, because there is then
 * nothing true to say at all.
 */
export const rankAscent = (family: RankFamily, level: RankLevel): string =>
  RANK_ASCENT[family]?.[level] ?? rankIdentity(family);
