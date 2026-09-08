/**
 * The milestone a ceremony posts to a feed — the Rank Card and its three siblings, as stored data.
 *
 * ══ THE CARD USED TO BE THROWN AWAY AT THE MOMENT OF POSTING ══
 *
 * `ShareSheet` built a real card, showed it to the athlete, and then posted `shareSnippet(...)` — the
 * plain-text fallback written for platforms that can only take text — as the body of a `discussion`
 * post. So the biggest moment the app has arrived in the squad feed as five stacked grey lines:
 *
 *     Builder I
 *     Builder I
 *     Sep 7, 2026
 *     — Isa Altamirano
 *     Forged in Forge Legacy.
 *
 * The rank was printed twice because the headline and the "New rank" field are the same string; the
 * app signed the athlete's post with its own name; and nothing in it said *ascension* at all. PO:
 * *"It needs to feel special. Needs to feel momentous."*
 *
 * ⚠ THE SNIPPET IS NOT THE POST. It is one of the Share Card Renderer's two artifacts and it exists for
 * the OS share sheet (`Share-Card-Renderer-Architecture` §3.3, §8) — a destination Forge does not draw.
 * A Forge destination can draw the card, so it must. This module is that card as a stored payload.
 *
 * ⚠ RIDES IN `layout`, THE THIRD TIME. `squad_posts.layout` is untyped jsonb (0045) and every read path
 * already returns it; `squad_feed()` and the post-detail read are both `returns table (...)`, which
 * `create or replace` cannot widen (0186's header, and 0043 before it). A progress card (0045) and a
 * posted workout (0192) already share the column behind a `kind` discriminator. So this needs no
 * migration, no column and no RPC change — see `isMilestoneCard`, and the ⚠ on
 * `asTransformationLayout`, which every new `kind` must be excluded from.
 *
 * ⚠ EVERY STRING IS SNAPSHOTTED, LIKE THE RECAP SUMMARY AND THE PROGRESS CARD BESIDE IT. The eyebrow,
 * the headline, the identity line and the date are stored as the words this post was composed with —
 * not as ids to be re-resolved. An athlete's Builder I post must still read "Builder I" after the copy
 * table is edited, the rank engine is re-tuned, or the athlete has climbed three families past it.
 *
 * ⚠ PURE, RELATIVE `.ts` IMPORTS ONLY — reachable from `node --test`.
 */

import type { RankFamily, RankLevel } from '../rank-artwork/resolver.ts';
import type { Sex } from '../profile/schema.ts';

/** Which ceremony this post came from. One value per `ShareKind` that a ceremony can raise. */
export type MilestoneEvent = 'rank' | 'honor' | 'goal' | 'program';

/** The rank half of the card — the seal to draw. Absent on the three non-rank events. */
export interface MilestoneRank {
  family: RankFamily;
  level: RankLevel;
  /** "Builder I" — stored so a reader never has to re-derive it. */
  label: string;
  /**
   * The AUTHOR's sex, snapshotted, because `established` is the one family with -m and -f badges
   * (`badge-art.ts`) and a feed post is read by people who cannot see the author's profile.
   *
   * Without it every squadmate would be served the male Established badge for a woman's own
   * ascension — the same mismatch the ceremony was fixed for, moved one surface along. Optional and
   * ignored by the other six families, so a card that omits it is not wrong, only unspecific.
   */
  sex?: Sex;
}

export interface MilestoneCard {
  kind: 'milestone-card';
  event: MilestoneEvent;
  /** The small uppercase label — "Rank Ascended". */
  eyebrow: string;
  /** The largest thing on the card: the rank, the honor, the goal, the program. */
  headline: string;
  /**
   * The one sentence under the headline.
   *
   * For a rank this is the LOCKED per-family identity statement (`Rank-System-Architecture` §2.2 —
   * *"self-descriptions the athlete should be able to say honestly when they reach the rank"*), which is
   * the same sentence the M-1 ceremony says. It is deliberately not a written-for-the-feed line: the
   * rank already has words, and they are the athlete's own.
   *
   * Null renders nothing rather than a placeholder.
   */
  line: string | null;
  /** Rank events only. Null everywhere else — the card is then typographic, with no insignia. */
  rank?: MilestoneRank | null;
  /**
   * The rank held BEFORE this one, when it is known.
   *
   * ⚠ NULL IS A REAL ANSWER AND MUST STAY ONE. An athlete evaluated for the first time has no previous
   * rank stored, so there is nothing to show — and defaulting it to Foundation I would put a rank they
   * never held on a permanent record. The card omits the transition instead, exactly as
   * `buildShareContent` omits a field it was not given.
   */
  previous?: MilestoneRank | null;
  /** Already formatted at post time — "Sep 7, 2026". */
  date: string;
}

/**
 * Is this `layout` blob a milestone card?
 *
 * Shaped like `isProgressCard` / `isPostedWorkout`: the `kind` tag AND one structural field, so a blob
 * that merely carries the right string cannot be drawn as something it is not.
 */
export const isMilestoneCard = (l: unknown): l is MilestoneCard =>
  !!l &&
  (l as MilestoneCard).kind === 'milestone-card' &&
  typeof (l as MilestoneCard).headline === 'string' &&
  (l as MilestoneCard).headline.length > 0;

/**
 * The transition line a reader gets when the seals cannot carry it — "Foundation IV → Builder I".
 *
 * Returns null when there is no previous rank, which is the same "omit rather than invent" rule as the
 * field itself. Exported because the post-detail screen and the accessibility label both need the
 * sentence and must not each write their own.
 */
export function milestoneTransition(card: MilestoneCard): string | null {
  if (!card.previous || !card.rank) return null;
  return `${card.previous.label} → ${card.rank.label}`;
}

/**
 * What the acknowledge control says on a milestone post.
 *
 * PO: *"I'd keep the familiar controls, but give the acknowledgment a little more significance… the
 * interaction feels connected to the achievement."* So the control is the same control — same tap, same
 * press-and-hold, same four kinds (SOC-A4-D3), same count — and only its resting label changes.
 *
 * ⚠ RANK ONLY, DELIBERATELY. "Acknowledge the Ascension" is a specific sentence about a specific event;
 * applying the pattern to the other three would mean inventing "Acknowledge the Honor" and friends,
 * which reads as a template rather than as recognition. They keep the ordinary word.
 *
 * Null means "leave the control exactly as it is", so callers pass it straight through.
 */
export function milestoneAckLabel(card: MilestoneCard): string | null {
  return card.event === 'rank' ? 'Acknowledge the Ascension' : null;
}

/**
 * What a screen reader is told about the band, in one sentence.
 *
 * The band is artwork to a sighted reader and therefore says nothing at all to anyone else unless this
 * exists — the same gap a `<Image>` with no label leaves.
 */
export function milestoneLabel(card: MilestoneCard): string {
  const transition = milestoneTransition(card);
  return [card.eyebrow, card.headline, transition ? `from ${card.previous!.label}` : null, card.line, card.date]
    .filter(Boolean)
    .join('. ');
}
