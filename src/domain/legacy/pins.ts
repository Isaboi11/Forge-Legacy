/**
 * Pinned Legacy ("My Museum") curation — the pure model behind the L-13 pin sheet.
 *
 * A pin is a curated, cross-type highlight at the TOP of Legacy — distinct from an accomplishment's
 * "featured" star (that lives inside the accomplishments list, capped at 3). The museum is capped at 6
 * and spans kinds: accomplishment · honor · chapter (the live, real content today; record/photo/memory
 * exist in the schema for later).
 *
 * Candidates are assembled from the athlete's real content; whether one is already pinned is decided by
 * matching a pin's (kind, refId) — the soft reference — not its denormalized title.
 */

import type { PinKind } from '@/types/legacy';
import type { SymbolName } from '@/components/forge/ForgeSymbol';
import { formatAccDate, type Accomplishment } from './accomplishments.ts';

export const PIN_CAP = 6;

export interface PinCandidate {
  kind: PinKind;
  refId: string;
  title: string;
  subtitle: string;
  icon: SymbolName;
  /**
   * The keepsake this pin should SHOW, when the thing being pinned has one.
   *
   * ⚠ The museum has always been able to display media — `pins.media_url`, `poster_url` and `is_video`
   * are 0005 columns and `PinnedCard` renders them behind a play button — and nothing ever wrote them.
   * So every pin fell back to its bronze emblem, which is what a pinned photo looked like: an empty
   * card with a small trophy on it.
   *
   * Only accomplishments can carry one today (0118). Honors and chapters have no media of their own, so
   * they keep the emblem, which is correct rather than a gap: `icon` is what a pin looks like when there
   * is nothing to look at.
   */
  mediaUrl?: string | null;
  isVideo?: boolean;
}

/** A current pin, as far as curation cares — its own id, and what it points at. */
export interface PinRef {
  id: string;
  kind: PinKind;
  refId: string | null;
}

const key = (kind: PinKind, refId: string | null) => `${kind}:${refId ?? ''}`;

/** The pin row matching a candidate, or null — matched on the soft (kind, refId) reference. */
export function pinFor(candidate: PinCandidate, pins: readonly PinRef[]): PinRef | null {
  return pins.find((p) => key(p.kind, p.refId) === key(candidate.kind, candidate.refId)) ?? null;
}

export const isPinned = (candidate: PinCandidate, pins: readonly PinRef[]) => pinFor(candidate, pins) != null;

/** Room for another pin? The design's cap makes "6" a real limit, not decorative copy. */
export const canPinMore = (pins: readonly PinRef[]) => pins.length < PIN_CAP;

export const pinCountLabel = (pins: readonly PinRef[]) => `${pins.length} of ${PIN_CAP} pinned`;

export interface ContentForPins {
  accomplishments: readonly Accomplishment[];
  honors: readonly { id: string; name: string; dateEarned: string }[];
  chapters: readonly { id: string; name: string; active: boolean; sealed: boolean }[];
}

/**
 * Build the candidate list from live content — accomplishments first (the athlete's own words), then
 * honors, then chapters. Each carries a soft `refId` so a pin survives its denormalized title going
 * stale, and a per-kind glyph matching the museum.
 */
export function candidatesFromContent(content: ContentForPins): PinCandidate[] {
  const chapterLabel = (id: string) => content.chapters.find((c) => c.id === id)?.name ?? null;

  const acc: PinCandidate[] = content.accomplishments.map((a) => {
    const d = formatAccDate(a.date);
    const ch = a.chapterId ? chapterLabel(a.chapterId) : null;
    return {
      kind: 'accomplishment' as const,
      refId: a.id,
      title: a.name,
      subtitle: [d, ch].filter(Boolean).join(' · ') || 'Accomplishment',
      icon: 'trophy' as const,
      // `mediaKind` is the both-or-neither flag the column pair guarantees, so branching on it and
      // trusting the URL is safe — see the `Accomplishment` model.
      mediaUrl: a.mediaUrl,
      isVideo: a.mediaKind === 'video',
    };
  });

  const honors: PinCandidate[] = content.honors.map((h) => ({
    kind: 'honor' as const,
    refId: h.id,
    title: h.name,
    subtitle: h.dateEarned ? `Honor · ${h.dateEarned}` : 'Honor',
    icon: 'medal' as const,
  }));

  const chapters: PinCandidate[] = content.chapters.map((c) => ({
    kind: 'chapter' as const,
    refId: c.id,
    title: c.name,
    subtitle: c.sealed ? 'Sealed chapter' : c.active ? 'Active chapter' : 'Chapter',
    icon: 'book' as const,
  }));

  return [...acc, ...honors, ...chapters];
}

// ─────────────────────────────────────────────────────────────────────────────
// WHERE A PIN OPENS
// ─────────────────────────────────────────────────────────────────────────────

/** What tapping a pin should open. `null` when the pin references nothing openable. */
export type PinDestination =
  | { screen: 'chapter'; id: string }
  | { screen: 'accomplishment'; id: string }
  | { screen: 'accomplishments' }
  | { screen: 'honors' }
  | { screen: 'video'; url: string }
  | null;

/** The fields of a pin that decide where it goes. */
export interface PinTarget {
  kind: PinKind;
  /** `null` on a pin whose entity was deleted; `undefined` in the view model, which omits it. */
  refId?: string | null;
  isVideo?: boolean;
  mediaUrl?: string | null;
}

/**
 * Resolve a pin to its destination.
 *
 * ══ TWO DEFECTS THIS ORDERING FIXES ══
 *
 * **1. A pin opened the LIST it belonged to, not itself.** Tapping "Deadlift Max 485" in the museum
 * pushed the bare accomplishments route, landing the athlete on every accomplishment they own and
 * leaving them to find again the one they had just tapped. The `refId` needed to open it directly had
 * been stored on the row since 0005.
 *
 * **2. The MEDIA outranked the ENTITY.** The video check ran first, so a pinned accomplishment that
 * happened to carry a clip opened a bare fullscreen player — no title, no date, no note, no way back to
 * the thing the pin points at. An entity now wins: the accomplishment opens, and it shows the clip in
 * place. The player is kept for pins that are ONLY media (`record` / `photo` / `memory`), which
 * reference no entity and for which it was always the right answer.
 *
 * Pure so the ordering is a rule with a test around it, rather than the order of four `if`s inside a
 * screen where nothing can reach it.
 */
export function pinDestination(pin: PinTarget): PinDestination {
  if (pin.kind === 'chapter' && pin.refId) return { screen: 'chapter', id: pin.refId };
  if (pin.kind === 'accomplishment' && pin.refId) return { screen: 'accomplishment', id: pin.refId };
  if (pin.kind === 'honor') return { screen: 'honors' };
  if (pin.isVideo && pin.mediaUrl) return { screen: 'video', url: pin.mediaUrl };
  /*
   * A pin whose entity was deleted keeps its denormalized title and loses its `refId`. The list is the
   * honest destination — it is where the thing used to be — rather than a tap that does nothing.
   */
  if (pin.kind === 'accomplishment') return { screen: 'accomplishments' };
  return null;
}
