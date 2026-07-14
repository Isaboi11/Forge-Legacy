import type { LiveTrainingPrivacySettings, LiveTrainingUser } from '@/types/liveTraining'

/**
 * Static placeholder for squad/friend members currently training. Mirrors
 * the old HOME_DATA.squad.trainingNowCount (2) for visual parity with the
 * split layout this replaces; swap for the real presence service (e.g. a
 * `GET /presence/live` poll or socket feed) once one exists.
 */
export const LIVE_TRAINING_USERS: LiveTrainingUser[] = [
  {
    id: 'iron-legacy-mara',
    name: 'Mara Voss',
    workoutName: 'Pull Day B',
    startedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    source: 'squad',
  },
  {
    id: 'iron-legacy-devon',
    name: 'Devon Cole',
    workoutName: 'Leg Day',
    startedAt: new Date(Date.now() - 41 * 60 * 1000).toISOString(),
    source: 'squad',
  },
]

/** Default until a real Live Training privacy toggle exists — see `LiveTrainingPrivacySettings`. */
export const DEFAULT_LIVE_TRAINING_PRIVACY: LiveTrainingPrivacySettings = {
  shareLiveWorkoutStatus: true,
  visibility: 'squad',
}
