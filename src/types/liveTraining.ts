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
 * `training_now()` (0086) — Home renders one merged list regardless
 * of source — it's reserved for future per-audience surfaces (e.g. a
 * squad-only presence view) once a real Live Training privacy toggle ships.
 */
/**
 * SUPERSEDED by `profiles.visibility.training` (0086). Live status is a profile SECTION on the same
 * audience ladder as every other one, gated server-side at read time — not a device-local flag a client
 * consults before deciding whether to broadcast. Kept as the shape the old placeholder documented; no
 * code reads it.
 */
export type LiveTrainingPrivacySettings = {
  shareLiveWorkoutStatus: boolean
  visibility: 'squad' | 'friends' | 'private'
}
