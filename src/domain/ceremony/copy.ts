/**
 * Ceremony copy resolver — eyebrow / title / subtitle / body line / footer labels per
 * event. The title/subtitle/body/button strings are the EXACT LOCKED copy from the
 * M-series specs (verbatim); each is cited inline so it can be confirmed against Docs.
 *
 * Sources: Rank-Up-Modal-Spec-M1 (§6.2, §6.5), Honor-Earned-Modal-Spec-M2 (§4.1),
 * M-3-Goal-Achieved-Spec (M3-D13), M-4-Program-Graduated-Spec (§5.1), M-7-Premium-Upsell-Spec (§5.1).
 *
 * The `eyebrow` is the ceremony CATEGORY (the dc Modal Library convention — the reconciled
 * overlay Modal carries an eyebrow label); the specs don't lock an eyebrow string, so those
 * are labels, not spec-verbatim. "Share this …" secondary actions open SH-1 (unit ③).
 */

import type { CeremonyEvent } from './types';
import type { RankTier } from '../rank-artwork/resolver';
import { rankIdentity } from '../rank/identity.ts';

export interface CeremonyCopy {
  eyebrow?: string;
  title: string;
  /** Secondary line under the title (M-3 chapter name). */
  subtitle?: string;
  body: string;
  primary: string;
  /** Secondary action (Share → SH-1, or M-7 "Not Now"); omitted where a ceremony has one action. */
  secondary?: string;
}

const ROMAN = ['', 'I', 'II', 'III', 'IV'] as const;

export function rankTierLabel(rank: RankTier): string {
  const family = rank.family.charAt(0).toUpperCase() + rank.family.slice(1);
  return `${family} ${ROMAN[rank.level] ?? rank.level}`;
}

/** The single terminal rank of the whole system (Rank-Up §6.5 "final rank"). */
function isFinalRank(rank: RankTier): boolean {
  return rank.family === 'legacy' && rank.level === 4;
}

export function ceremonyCopy(event: CeremonyEvent): CeremonyCopy {
  switch (event.kind) {
    case 'rankUp':
      /*
       * M-1 §6.2 (standard) / §6.5 (final rank) — locked ceremony copy.
       *
       * ══ THE RANK NOW SAYS WHAT IT MEANS ══
       *
       * PO: *"it should give the description we came up with for each."* Every rank-up said the same
       * sentence — *"Earned through every session. Welcome to what you've become."* — so the card that
       * announces reaching Architect was word-for-word the card that announced reaching Builder, and the
       * one thing the athlete wanted to know (what does this rank mean?) was the one thing it withheld.
       *
       * ⚠ THE SENTENCE ALREADY EXISTED AND WAS LOCKED. `Rank-System-Architecture.md` §2.2 defines an
       * identity statement per family — *"not marketing copy… self-descriptions the athlete should be
       * able to say honestly when they reach the rank"* — which is precisely a ceremony line. Two other
       * screens were already showing it (and disagreeing about it); see `domain/rank/identity.ts`.
       *
       * ⚠ THE LOCKED GENERIC LINE IS KEPT AS THE FALLBACK, not deleted: M-1 §6.2 is a locked clause, and
       * it remains the right words for a family this build has no statement for.
       */
      return {
        eyebrow: 'Rank Ascended',
        title: rankTierLabel(event.rank),
        body: isFinalRank(event.rank)
          ? 'Your legacy has been forged.'
          : rankIdentity(event.rank.family) || 'Earned through every session. Welcome to what you’ve become.',
        primary: 'Continue',
        secondary: 'Share this advancement',
      };
    case 'honorEarned':
      // M-2 §4.1 — locked.
      return {
        eyebrow: 'Honor Earned',
        title: event.honorName,
        /*
         * ⚠ WHY THEY EARNED IT, WHEN WE KNOW IT. M-2 §4.1 locked the generic line, and it was the only
         * thing every honor said: the athlete was told they had earned something and never what for.
         * PO: *"when earning an honor the card should tell me why I earned it."*
         *
         * The citation is the honor's own rule (`triggerText`, derived from the catalog's metric and
         * threshold), so it is more specific than the locked line rather than different in kind. The
         * locked line remains the fallback for an honor whose catalog row could not be read — which is
         * the state M-2 was actually written for.
         */
        body: event.citation?.trim() || 'A permanent part of your legacy.',
        primary: 'Continue',
        secondary: 'Share this honor',
      };
    case 'goalAchieved':
      // M-3 (M3-D13) — locked, goal-agnostic.
      return {
        eyebrow: 'Goal Achieved',
        title: event.goalName,
        subtitle: event.chapterName,
        body: 'Set, chased, earned. A permanent mark in your legacy.',
        primary: 'Continue',
        secondary: 'Share this achievement',
      };
    case 'programGraduated':
      // M-4 §5.1 — locked, program-agnostic.
      return {
        eyebrow: 'Program Graduated',
        title: event.programName,
        body: 'Finished what you started. A permanent mark in your legacy.',
        primary: 'Continue',
        secondary: 'Share this graduation',
      };
    case 'premiumUpsell':
      /*
       * M-7 §5.1 — fixed heading + reassurance; `trigger_reason` injected per trigger.
       *
       * ⚠ THE FALLBACK IS DELIBERATELY GENERIC NOW. It used to read "You've reached your 3-program
       * limit." — a real cap number, hardcoded, in the one branch that runs when the caller did NOT say
       * which cap fired. So a video gate with a missing reason would have told the athlete about programs,
       * confidently and wrongly. M7-D14 bans cap numbers as literals for exactly this reason: the number
       * belongs to `entitlement_config`, and the only honest thing to say without it is nothing specific.
       */
      return {
        title: 'Build more. Keep everything.',
        /*
         * Reason · four benefit rows · reassurance line, in that order (M-7 §5).
         *
         * The rows are rendered as text with a ✓ prefix rather than through `ForgePremiumModal`, which was
         * built for exactly this and has the check-circle treatment. That component is in the six
         * libraries reclassified LEGACY/REFERENCE pending the visual rebuild, and putting a legacy
         * component into the one path that asks an athlete for money is the wrong trade — the ceremony
         * Modal beside it is already proven in production. Recorded so the choice reads as deliberate
         * rather than as nobody having noticed the better-looking component.
         *
         * ⚠ The reassurance line is FIXED and always present (M7-D6). Never Charge For History is the
         * foundational guarantee, and an upgrade prompt is precisely where the athlete must be told their
         * legacy is not what is at stake.
         */
        body: [
          event.reason ?? 'You’ve reached a free-tier limit.',
          '',
          ...(event.benefits ?? []).slice(0, 4).map((b) => `✓  ${b}`),
          '',
          'Everything you’ve already built is yours — forever.',
        ]
          .join('\n')
          .trim(),
        primary: 'Upgrade',
        secondary: 'Not Now',
      };
  }
}
