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

export interface ShareRequest {
  shareType: ShareKind
  overrides?: ShareOverrides
}

export interface ShareContextValue {
  openShare: (req: ShareRequest) => void
}

const ShareContext = createContext<ShareContextValue | null>(null)

export function ShareProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<ShareContent | null>(null)

  const openShare = useCallback((req: ShareRequest) => {
    setContent(buildShareContent(req.shareType, req.overrides))
  }, [])
  const close = useCallback(() => setContent(null), [])

  const value = useMemo<ShareContextValue>(() => ({ openShare }), [openShare])

  return (
    <ShareContext.Provider value={value}>
      {children}
      {content ? <ShareSheet open onClose={close} content={content} /> : null}
    </ShareContext.Provider>
  )
}

export function useShareSheet(): ShareContextValue {
  const ctx = useContext(ShareContext)
  if (!ctx) throw new Error('useShareSheet must be used within a ShareProvider')
  return ctx
}
