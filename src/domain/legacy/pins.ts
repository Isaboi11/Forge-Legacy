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
