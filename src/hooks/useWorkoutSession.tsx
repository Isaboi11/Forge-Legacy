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
  /**
   * Walked away from a session that is still resumable — the header back arrow, not a finish.
   *
   * ⚠ THE THIRD EXIT, AND THE REASON IT EXISTS IS A NOTIFICATION. Presence ends identically to the other
   * two: "I am training right now" is false the moment they leave the logger, which is the point of the
   * `onLeave` fix in `workout.tsx`. What does NOT end is the record that the squad has already been told
   * about THIS session, so resuming reuses the same outbox key instead of announcing a second start
   * (0202). `finishWorkout` and `abandonWorkout` both clear that record, because both mean the session
   * is over and the next one is genuinely news.
   */
  leaveWorkout: () => void
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
function setLiveWorkoutPresence(active: boolean, workoutName?: string, done = true): void {
  void setTrainingStatus(active, workoutName, done)
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
  /**
   * `done` is the ONE thing that differs between ending a session and stepping away from one.
   *
   * Everything else is identical — the stale timer, the in-memory session, the presence broadcast and
   * the published plan-and-log all stop either way, because none of them is true while the athlete is
   * looking at Home. Only the squad's memory of having been told differs (0202).
   */
  const stopSession = useCallback(
    (done: boolean) => {
      invalidateEarnedMoments()
      clearStaleTimer()
      setSession(null)
      setLiveWorkoutPresence(false, undefined, done)
      // The published plan-and-log (0181) goes with the presence. Finish, abandon, leave and the stale
      // timer all arrive here, so a row can only outlive its session by the read's own 4-hour ceiling.
      void clearLiveSession()
    },
    [clearStaleTimer],
  )
  const endSession = useCallback(() => stopSession(true), [stopSession])
  /*
   * ⚠ THE STALE TIMER IS A FINISH, NOT A LEAVE. Four hours with no explicit end is the ceiling every
   * reader of `training_since` already applies, so by the time it fires the announcement stamp has aged
   * out on the server too and holding it would buy nothing.
   */
  const leaveSession = useCallback(() => stopSession(false), [stopSession])

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
    // exists (finish writes a record, abandon discards one). `leaveWorkout`
    // is the one that genuinely behaves differently today — see its type.
    <WorkoutSessionContext.Provider
      value={{
        session,
        startWorkout,
        finishWorkout: endSession,
        abandonWorkout: endSession,
        leaveWorkout: leaveSession,
      }}
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
