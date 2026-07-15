/**
 * CeremonyProvider — the app-level overlay host. Owns the ceremony QUEUE (present one at
 * a time in the locked priority order — Modal Library "never stack") and a transient
 * Toast, and renders both above every route. Mirrors WorkoutSessionProvider's Context
 * idiom. Exposes `useCeremony` (enqueue/dismiss/current) and `useToast` (showToast).
 *
 * Nothing enqueues ceremonies in production yet (no rank/honor/goal/program evaluator) —
 * the flagged dev harness (`/ceremony-harness`) is the only caller until real triggers
 * exist. Rank ceremonies show the REAL imported badge; every other ceremony's mark is a
 * pending-asset Insignia placeholder (honor art was never imported — never fabricated).
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

import { Modal } from '@/components/forge/composites/Modal'
import { Toast } from '@/components/forge/composites/Toast'
import { Insignia } from '@/components/forge/composites/Insignia'
import { Button } from '@/components/forge/composites/Button'
import type { CeremonyEvent } from '@/domain/ceremony/types'
import { orderCeremonies } from '@/domain/ceremony/queue'
import { ceremonyCopy } from '@/domain/ceremony/copy'
import { resolveRankArtwork } from '@/domain/rank-artwork/resolver'
import { resolveRankArtworkSource } from '@/domain/rank-artwork/rank-source'

export type CeremonyContextValue = {
  enqueue: (events: CeremonyEvent | CeremonyEvent[]) => void
  dismiss: () => void
  current: CeremonyEvent | null
}
export type ToastContextValue = {
  showToast: (message: string) => void
}

const CeremonyContext = createContext<CeremonyContextValue | null>(null)
const ToastContext = createContext<ToastContextValue | null>(null)

const ARTWORK_SIZE = 104

/** The ceremony's Insignia: real rank badge for rank-ups, graceful placeholder otherwise. */
function ceremonyArtwork(event: CeremonyEvent): React.ReactNode {
  if (event.kind === 'rankUp') {
    const source = resolveRankArtworkSource(resolveRankArtwork({ ...event.rank }).assetPath)
    return <Insignia source={source} size={ARTWORK_SIZE} />
  }
  if (event.kind === 'honorEarned') {
    const initials = event.honorName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    return <Insignia size={ARTWORK_SIZE} placeholderLabel={initials} />
  }
  return <Insignia size={ARTWORK_SIZE} />
}

export function CeremonyProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<CeremonyEvent[]>([])
  const [toast, setToast] = useState<string | null>(null)

  const enqueue = useCallback((events: CeremonyEvent | CeremonyEvent[]) => {
    const list = Array.isArray(events) ? events : [events]
    setQueue((q) => orderCeremonies([...q, ...list]))
  }, [])
  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), [])
  const showToast = useCallback((message: string) => setToast(message), [])
  const hideToast = useCallback(() => setToast(null), [])

  const current = queue[0] ?? null
  const ceremonyValue = useMemo<CeremonyContextValue>(() => ({ enqueue, dismiss, current }), [enqueue, dismiss, current])
  const toastValue = useMemo<ToastContextValue>(() => ({ showToast }), [showToast])

  const copy = current ? ceremonyCopy(current) : null

  return (
    <CeremonyContext.Provider value={ceremonyValue}>
      <ToastContext.Provider value={toastValue}>
        {children}

        {current && copy ? (
          <Modal
            open
            onClose={dismiss}
            eyebrow={copy.eyebrow}
            title={copy.title}
            artwork={ceremonyArtwork(current)}
            footer={
              <>
                {/* primary advances the queue; Share (secondary) opens SH-1 in unit ③ — advances for now */}
                <Button variant="primary" fullWidth onPress={dismiss}>
                  {copy.primary}
                </Button>
                {copy.secondary ? (
                  <Button variant="secondary" fullWidth onPress={dismiss}>
                    {copy.secondary}
                  </Button>
                ) : null}
              </>
            }
          >
            {copy.body}
          </Modal>
        ) : null}

        <Toast open={toast != null} message={toast ?? ''} onDismiss={hideToast} />
      </ToastContext.Provider>
    </CeremonyContext.Provider>
  )
}

export function useCeremony(): CeremonyContextValue {
  const ctx = useContext(CeremonyContext)
  if (!ctx) throw new Error('useCeremony must be used within a CeremonyProvider')
  return ctx
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a CeremonyProvider')
  return ctx
}
