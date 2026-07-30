import type { LiveTrainingPrivacySettings } from '@/types/liveTraining'

/**
 * RETIRED: `LIVE_TRAINING_USERS`.
 *
 * It invented two squad-mates mid-workout so Home's Live Now block had something to draw. There is no
 * presence backend and cannot be one yet — an in-progress workout lives in a client-side session, not a
 * table, so no athlete can observe another training. Home now passes an empty list and the block does
 * not draw, which the layout already handled. `LiveTrainingUser` lives on in `@/types/liveTraining` — it
 * is the shape a real presence feed would fill, and the contract `YourCircleCard` still accepts.
 */

/** Default until a real Live Training privacy toggle exists — see `LiveTrainingPrivacySettings`. */
export const DEFAULT_LIVE_TRAINING_PRIVACY: LiveTrainingPrivacySettings = {
  shareLiveWorkoutStatus: true,
  visibility: 'squad',
}
