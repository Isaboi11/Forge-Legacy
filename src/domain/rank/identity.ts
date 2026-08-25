import type { RankFamily } from '../rank-artwork/resolver.ts';

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
 * ⚠ THE IDENTITY IS PER FAMILY, NOT PER SUB-TIER, AND THAT IS DELIBERATE — RSA §4.26: *"Sub-tiers are
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
