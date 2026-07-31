/**
 * CeremonyProvider — the app-level overlay host. Owns the ceremony QUEUE (present one at
 * a time in the locked priority order — Modal Library "never stack") and a transient
 * Toast, and renders both above every route. Mirrors WorkoutSessionProvider's Context
 * idiom. Exposes `useCeremony` (enqueue/dismiss/current) and `useToast` (showToast).
 *
 * Production DOES enqueue these now — Legacy fires M-1 on a real rank-up (`legacy.tsx`) and Goals fires
 * M-3 when a primary goal is achieved (`goals.tsx`). The dev harness is no longer the only caller, which
 * is what made the share card's demo values a real defect rather than a dev-only one; see
 * `ceremonyShareValues` and the header of `domain/share/content.ts`.
 *
 * Rank ceremonies show the REAL imported badge; every other ceremony's mark is a pending-asset Insignia
 * placeholder (honor art was never imported — never fabricated).
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

import { Modal } from '@/components/forge/composites/Modal'
import { Toast } from '@/components/forge/composites/Toast'
import { Insignia } from '@/components/forge/composites/Insignia'
import { Button } from '@/components/forge/composites/Button'
import { HonorCeremony } from '@/components/ceremony/HonorCeremony'
import { HonorSymbol } from '@/components/ceremony/HonorSymbol'
import type { CeremonyEvent } from '@/domain/ceremony/types'
import { orderCeremonies } from '@/domain/ceremony/queue'
import { ceremonyCopy, rankTierLabel } from '@/domain/ceremony/copy'
import { RankSeal } from '@/components/forge/RankSeal'
import { useShareSheet } from '@/hooks/useShareSheet'
import { useProfile } from '@/lib/profile'
import type { ShareKind } from '@/domain/share/content'

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
    return <RankSeal family={event.rank.family} level={event.rank.level} size={ARTWORK_SIZE} />
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

/**
 * The card's field values, read off the EVENT — the only thing here that knows what was actually earned.
 *
 * Until this existed, "Share …" built its card from a demo table in `share/content.ts`, so a real rank-up
 * produced a keepsake citing a chapter the athlete had never written and a date months in the past. The
 * card now carries the event's own facts and omits what the event doesn't carry (`buildShareContent`
 * drops empty fields), so it renders shorter rather than wrong.
 *
 * The date is stamped at share time because that is when the ceremony fired — these are all "you just
 * earned this" moments, so now IS the earned date.
 */
function ceremonyShareValues(event: CeremonyEvent, earnedOn: string): Record<string, string> {
  switch (event.kind) {
    case 'rankUp':
      return { current: rankTierLabel(event.rank), date: earnedOn }
    case 'honorEarned':
      return { citation: event.citation ?? '', date: earnedOn }
    case 'goalAchieved':
      return { chapter: event.chapterName ?? '', date: earnedOn }
    case 'programGraduated':
      return { date: earnedOn }
    case 'premiumUpsell':
      return {}
  }
}

/** The SH-1 share type a ceremony's "Share …" secondary opens — null for M-7 (no share). */
function ceremonyShareType(event: CeremonyEvent): ShareKind | null {
  switch (event.kind) {
    case 'rankUp':
      return 'rank'
    case 'honorEarned':
      return 'honor'
    case 'goalAchieved':
      return 'goal'
    case 'programGraduated':
      return 'program'
    case 'premiumUpsell':
      return null
  }
}

export function CeremonyProvider({ children }: { children: React.ReactNode }) {
  const { openShare } = useShareSheet()
  // CeremonyProvider sits inside ProfileProvider (_layout), so the real athlete is always readable here.
  const { profile } = useProfile()
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

  // Shared footer: primary Continue + optional "Share …" (SH-1 pre-scoped to this ceremony; advances the
  // queue like Continue — SH-1 §6.2; M-7's "Not Now" has no share type and just dismisses).
  const ceremonyFooter =
    current && copy ? (
      <>
        <Button variant="primary" fullWidth onPress={dismiss}>
          {copy.primary}
        </Button>
        {copy.secondary ? (
          <Button
            variant="secondary"
            fullWidth
            onPress={() => {
              const shareType = ceremonyShareType(current)
              if (shareType) {
                const earnedOn = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                openShare({
                  shareType,
                  overrides: {
                    title: copy.title,
                    // The signed-in athlete, or no byline at all. This used to read the fixture
                    // `getSelfProfile()`, which signed every athlete's keepsake "Ada Ridge".
                    athlete: profile?.name,
                    values: ceremonyShareValues(current, earnedOn),
                  },
                })
              }
              dismiss()
            }}
          >
            {copy.secondary}
          </Button>
        ) : null}
      </>
    ) : null

  return (
    <CeremonyContext.Provider value={ceremonyValue}>
      <ToastContext.Provider value={toastValue}>
        {children}

        {current && copy ? (
          current.kind === 'honorEarned' ? (
            // Honors earn the forged-medallion ceremony (Forge First Honor Ceremony): the per-honor SYMBOL
            // swaps, the frame/coloring/glow stay constant. Every other ceremony keeps the centered Modal.
            <HonorCeremony
              open
              eyebrow={copy.eyebrow}
              honorName={current.honorName}
              body={copy.body}
              symbol={<HonorSymbol honorName={current.honorName} />}
              footer={ceremonyFooter}
              onRequestClose={dismiss}
            />
          ) : (
            <Modal
              open
              onClose={dismiss}
              eyebrow={copy.eyebrow}
              title={copy.title}
              subtitle={copy.subtitle}
              artwork={ceremonyArtwork(current)}
              footer={ceremonyFooter}
            >
              {copy.body}
            </Modal>
          )
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
