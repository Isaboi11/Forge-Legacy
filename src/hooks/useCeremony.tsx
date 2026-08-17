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

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'expo-router'

import { markHonorsCelebrated } from '@/data/honors-live'

import { Modal } from '@/components/forge/composites/Modal'
import { Toast } from '@/components/forge/composites/Toast'
import { Insignia } from '@/components/forge/composites/Insignia'
import { Button } from '@/components/forge/composites/Button'
import { HonorCeremony } from '@/components/ceremony/HonorCeremony'
import { HonorSymbol } from '@/components/ceremony/HonorSymbol'
import type { CeremonyEvent } from '@/domain/ceremony/types'
import { mergeCeremonies } from '@/domain/ceremony/queue'
import { ceremonyDetails } from '@/domain/ceremony/details'
import { ceremonyCopy, rankTierLabel } from '@/domain/ceremony/copy'
import { RankSeal } from '@/components/forge/RankSeal'
import { useShareSheet } from '@/hooks/useShareSheet'
import { useProfile } from '@/lib/profile'
import type { ShareKind } from '@/domain/share/content'

/**
 * ✅ FLIPPED 2026-08-16 — `src/app/subscription.tsx` exists (Launch Checklist 4.1, P-8).
 *
 * A constant rather than a route-existence probe: expo-router has no reliable "does this route resolve"
 * question from inside a component, and this repo has already shipped a dynamic route that 404s on direct
 * load. One greppable boolean is honest about the state and cannot be wrong at runtime.
 *
 * ⚠ THE ROUTE EXISTING IS NOT THE SAME AS A STORE EXISTING. P-8 renders its Free state complete and says
 * so honestly when no billing SDK is registered (`src/lib/billing.ts`) — which is better than this toast,
 * because the athlete gets the comparison, their usage and the plan structure either way.
 */
const SUBSCRIPTION_ROUTE_BUILT = true

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
  const router = useRouter()
  const { openShare } = useShareSheet()
  // CeremonyProvider sits inside ProfileProvider (_layout), so the real athlete is always readable here.
  const { profile } = useProfile()
  const [queue, setQueue] = useState<CeremonyEvent[]>([])
  const [toast, setToast] = useState<string | null>(null)

  // `mergeCeremonies`, not a bare concat: `CeremonyBase.id` has always been documented as the dedupe key
  // and nothing ever deduped on it. Harmless while every caller enqueued once from an effect that ran
  // once; not harmless now that W-17 enqueues from a `useQuery` result that refetches.
  const enqueue = useCallback((events: CeremonyEvent | CeremonyEvent[]) => {
    const list = Array.isArray(events) ? events : [events]
    setQueue((q) => mergeCeremonies(q, list))
  }, [])
  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), [])
  const showToast = useCallback((message: string) => setToast(message), [])
  const hideToast = useCallback(() => setToast(null), [])

  const current = queue[0] ?? null

  /*
   * Mark an honor celebrated the moment its ceremony STOPS being the current one — the athlete dismissed
   * it, or shared from it, which also advances the queue.
   *
   * ⚠ HERE, NOT ON LEGACY. This used to live in the Legacy tab, which was fine while Legacy was the only
   * screen that could present one. Now that any of the four tabs can, a per-screen copy would be wrong in
   * both directions: an honor dismissed on Home would never be marked and would replay for ever, and four
   * mounted tabs each watching `current` would race to mark the same one. The provider is the single
   * owner of `current`, so it is the only correct home for the acknowledgement.
   *
   * Deliberately not at fetch time. `uncelebrated_honors()` reads and marks nothing precisely so that a
   * force-quit, a crash or a tab closed mid-ceremony leaves the honor still owed. One at a time, as each
   * is dismissed, so walking away after the first of three keeps the other two owed rather than
   * swallowing them together.
   */
  const shownHonorRef = useRef<string | null>(null)
  useEffect(() => {
    const previous = shownHonorRef.current
    const showing = current?.kind === 'honorEarned' ? current.id : null
    if (previous && previous !== showing) {
      void markHonorsCelebrated([previous.slice('honor-'.length)]).catch(() => {
        // Failing to mark replays the ceremony next time. That is the safe direction of this error.
      })
    }
    shownHonorRef.current = showing
  }, [current])

  const ceremonyValue = useMemo<CeremonyContextValue>(() => ({ enqueue, dismiss, current }), [enqueue, dismiss, current])
  const toastValue = useMemo<ToastContextValue>(() => ({ showToast }), [showToast])

  const copy = current ? ceremonyCopy(current) : null

  // Shared footer: primary Continue + optional "Share …" (SH-1 pre-scoped to this ceremony; advances the
  // queue like Continue — SH-1 §6.2; M-7's "Not Now" has no share type and just dismisses).
  /*
   * M-7's "Upgrade" is the one ceremony primary that is not just "Continue" (M-7 §7.1): it dismisses and
   * routes to the subscription surface. **P-8 is not built yet** — it is Launch Checklist item 4.1, and
   * this pass covers 0–3 — so until it exists the athlete gets an honest sentence rather than a dead tap
   * or a 404 on a route that does not resolve.
   *
   * ⚠ NOBODY SEES THIS TODAY. `entitlement_config.default_tier` is 'PREMIUM', so every athlete is
   * entitled and no gate fires; M-7 is reachable only by forcing yourself to FREE in the SQL editor.
   * Flip the constant when `src/app/subscription.tsx` lands and the tap becomes navigation.
   */
  const onUpgrade = () => {
    /*
     * ⚠ DISMISS FIRST, THEN ROUTE (§2.2). M-7 closes and P-8 presents over whichever surface triggered
     * the gate — W-4, S-1, L-15, W-1 — never onto the Settings stack, because the athlete never opened
     * Settings to get here. `?from=gate` is what makes P-8 draw a [×] instead of a back chevron, so its
     * dismiss returns to that same surface, which then re-evaluates its own limit per M-7's contract.
     */
    dismiss()
    if (SUBSCRIPTION_ROUTE_BUILT) router.push('/subscription?from=gate')
    else showToast('Subscriptions open with the next release.')
  }

  const ceremonyFooter =
    current && copy ? (
      <>
        <Button
          variant="primary"
          fullWidth
          onPress={current.kind === 'premiumUpsell' ? onUpgrade : dismiss}
        >
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
              /* M-4 §4's context rows — Started / Graduated / Workouts / Duration. Empty for every other
                 kind: a rank or an honor is a statement, not a record card. */
              details={ceremonyDetails(current)}
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
