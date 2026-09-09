import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

import { setTrainingStatus } from '@/data/presence-live'
import { clearLiveSession } from '@/data/live-session-live'
import { invalidateEarnedMoments } from '@/hooks/useEarnedMoments'
import { prefetchDemoLoops } from '@/lib/demo-loop-prefetch'
import { useProfile } from '@/lib/profile'
import type { AthleteSex } from '@/domain/exercise-detail/media'

/** One planned lift carried into the session so the Finish log sheet knows what to record. */
export type SessionLift = {
  catalogKey?: string
  name: string
  workingSets: number
}

export type WorkoutSession = {
  workoutName: string
  startedAt: string
  lifts: SessionLift[]
}

export type WorkoutSessionContextValue = {
  session: WorkoutSession | null
  startWorkout: (workoutName: string, lifts?: SessionLift[]) => void
  finishWorkout: () => void
  abandonWorkout: () => void
}

const WorkoutSessionContext = createContext<WorkoutSessionContextValue | null>(null)

/**
 * A session that never gets an explicit finish/abandon call (app killed,
 * crash, forgotten tab) would otherwise stay "live" forever and haunt
 * squad/friend feeds — auto-expire it after a generous window instead.
 */
const STALE_SESSION_TIMEOUT_MS = 4 * 60 * 60 * 1000

/**
 * Presence write path — real since migration 0086.
 *
 * NO PRIVACY CHECK HERE, deliberately. The old stub short-circuited on a local
 * `shareLiveWorkoutStatus` flag, which is the wrong place for the decision twice
 * over: a client that decides whether to broadcast is a client that can be wrong,
 * and the athlete's audience for this is `visibility.training`, which lives on
 * their profile with every other section. `training_now()` applies it at read
 * time, so setting it to "Only me" hides the status from every viewer without
 * this call ever knowing. Writing the fact and gating the read is the honest
 * split — and it means changing the setting takes effect on a workout already
 * in progress.
 *
 * Fire-and-forget: presence must never block starting or finishing a workout.
 */
function setLiveWorkoutPresence(active: boolean, workoutName?: string): void {
  void setTrainingStatus(active, workoutName)
}

export function WorkoutSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<WorkoutSession | null>(null)
  const staleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Safe here: this provider mounts INSIDE ProfileProvider (_layout.tsx). Only `sex` is read, to
  // pick which render of each demo loop to warm — the same variant rule ExerciseLoop applies.
  const { profile } = useProfile()

  const clearStaleTimer = useCallback(() => {
    if (staleTimer.current) {
      clearTimeout(staleTimer.current)
      staleTimer.current = null
    }
  }, [])

  /* Finishing a session is the ONE event that can change a rank, and the earned-moments check is
     throttled to once a minute — so without this, glancing at a tab shortly before training could
     swallow the promotion that training just earned. Dropping the gate here means the next tab the
     athlete lands on evaluates immediately. */
  const endSession = useCallback(() => {
    invalidateEarnedMoments()
    clearStaleTimer()
    setSession(null)
    setLiveWorkoutPresence(false)
    // The published plan-and-log (0181) goes with the presence. Finish, abandon and the stale timer all
    // arrive here, so a row can only outlive its session by the read's own 4-hour ceiling.
    void clearLiveSession()
  }, [clearStaleTimer])

  const startWorkout = useCallback(
    (workoutName: string, lifts: SessionLift[] = []) => {
      setSession({ workoutName, startedAt: new Date().toISOString(), lifts })
      setLiveWorkoutPresence(true, workoutName)

      // Warm every planned lift's demo loop while the athlete is still racking up — the clips are
      // ~1MB each and the hero slot otherwise cold-fetches each one on its first view mid-workout.
      // Fire-and-forget, same contract as presence: never blocks starting a workout.
      prefetchDemoLoops(lifts.map((l) => l.catalogKey), (profile?.sex as AthleteSex | undefined) ?? null)

      clearStaleTimer()
      staleTimer.current = setTimeout(endSession, STALE_SESSION_TIMEOUT_MS)
    },
    [clearStaleTimer, endSession, profile?.sex],
  )

  useEffect(() => clearStaleTimer, [clearStaleTimer])

  return (
    // Finish and abandon both end the session/presence immediately today;
    // exposed as two methods because they diverge once a real workout log
    // exists (finish writes a record, abandon discards one).
    <WorkoutSessionContext.Provider
      value={{ session, startWorkout, finishWorkout: endSession, abandonWorkout: endSession }}
    >
      {children}
    </WorkoutSessionContext.Provider>
  )
}

export function useWorkoutSession(): WorkoutSessionContextValue {
  const ctx = useContext(WorkoutSessionContext)
  if (!ctx) throw new Error('useWorkoutSession must be used within a WorkoutSessionProvider')
  return ctx
}
