import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

import { setTrainingStatus } from '@/data/presence-live'
import { invalidateEarnedMoments } from '@/hooks/useEarnedMoments'

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
  }, [clearStaleTimer])

  const startWorkout = useCallback(
    (workoutName: string, lifts: SessionLift[] = []) => {
      setSession({ workoutName, startedAt: new Date().toISOString(), lifts })
      setLiveWorkoutPresence(true, workoutName)

      clearStaleTimer()
      staleTimer.current = setTimeout(endSession, STALE_SESSION_TIMEOUT_MS)
    },
    [clearStaleTimer, endSession],
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
