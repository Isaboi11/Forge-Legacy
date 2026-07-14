export type LiveTrainingSource = 'squad' | 'friend'

export type LiveTrainingUser = {
  id: string
  name: string
  avatarUrl?: string
  workoutName: string
  startedAt: string
  source: LiveTrainingSource
}

/**
 * No settings screen owns this yet (P-6 Privacy only covers squad check-in
 * cards today). `visibility` is unenforced by the mock feed in
 * `live-training-placeholder.ts` — Home renders one merged list regardless
 * of source — it's reserved for future per-audience surfaces (e.g. a
 * squad-only presence view) once a real Live Training privacy toggle ships.
 */
export type LiveTrainingPrivacySettings = {
  shareLiveWorkoutStatus: boolean
  visibility: 'squad' | 'friends' | 'private'
}
