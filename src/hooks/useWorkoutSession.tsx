import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

import { DEFAULT_LIVE_TRAINING_PRIVACY } from '@/data/live-training-placeholder'

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
 * Presence write path. No backend exists yet, so this is a local stub —
 * swap the body for a real API/socket call once live presence has a server.
 * Call sites don't change: they only ever see start/finish/abandon.
 */
function setLiveWorkoutPresence(active: boolean, workoutName?: string): void {
  if (active && !DEFAULT_LIVE_TRAINING_PRIVACY.shareLiveWorkoutStatus) return
  if (active && DEFAULT_LIVE_TRAINING_PRIVACY.visibility === 'private') return
  void workoutName // TODO(backend): PATCH /presence { active, workoutName, visibility }
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

  const endSession = useCallback(() => {
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
