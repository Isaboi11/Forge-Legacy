/**
 * ShareProvider — hosts SH-1 (the ShareSheet) above every route and exposes `openShare`.
 * SH-1 is opened from a "Share" action elsewhere (a ceremony's "Share …" secondary, a
 * Legacy/feed share, etc.); the caller passes the fixed `shareType` + any content overrides.
 * Mirrors the WorkoutSession/Ceremony provider idiom.
 *
 * Mounted OUTSIDE CeremonyProvider so the ceremony "Share" secondaries can call `openShare`.
 * No share backend yet — see ShareSheet for the real-vs-placeholder split.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

import { ShareSheet } from '@/components/forge/compositions/ShareSheet'
import { buildShareContent, type ShareContent, type ShareKind, type ShareOverrides } from '@/domain/share/content'
import type { MilestoneCard } from '@/domain/share/milestone-card'

export interface ShareRequest {
  shareType: ShareKind
  overrides?: ShareOverrides
  /**
   * The composed card to POST, when the caller has one — a ceremony always does.
   *
   * ⚠ DELIBERATELY SEPARATE FROM `overrides`. `ShareContent` is the OUTBOUND artifact: the thing the OS
   * share sheet receives, assembled by `buildShareContent` from strings and nothing else. This is the
   * INBOUND one — the payload a Forge destination stores so the post can be drawn as a card rather than
   * flattened to the text snippet. They describe the same moment for two different audiences and neither
   * can be derived from the other: the snippet has no rank family to draw a seal from, and the card has
   * no opinion about the athlete's "include my name" toggle.
   *
   * Absent means the destination writes text, which is every non-ceremony share.
   */
  milestone?: MilestoneCard | null
}

export interface ShareContextValue {
  openShare: (req: ShareRequest) => void
}

const ShareContext = createContext<ShareContextValue | null>(null)

export function ShareProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<ShareContent | null>(null)
  const [milestone, setMilestone] = useState<MilestoneCard | null>(null)

  const openShare = useCallback((req: ShareRequest) => {
    setContent(buildShareContent(req.shareType, req.overrides))
    setMilestone(req.milestone ?? null)
  }, [])
  // Cleared together: a stale card outliving its sheet would be posted under the NEXT share's content.
  const close = useCallback(() => {
    setContent(null)
    setMilestone(null)
  }, [])

  const value = useMemo<ShareContextValue>(() => ({ openShare }), [openShare])

  return (
    <ShareContext.Provider value={value}>
      {children}
      {content ? <ShareSheet open onClose={close} content={content} milestone={milestone} /> : null}
    </ShareContext.Provider>
  )
}

export function useShareSheet(): ShareContextValue {
  const ctx = useContext(ShareContext)
  if (!ctx) throw new Error('useShareSheet must be used within a ShareProvider')
  return ctx
}
