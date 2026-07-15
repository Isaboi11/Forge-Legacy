/**
 * PersonalRecord — the real domain shape for an athlete's exercise PR (the shape the feed's PR
 * plates carry, unblocking FORGE_DELTAS §11). One honest union whose form varies by what is
 * measured: a weighted load (optionally for reps), a duration, a distance, or a bodyweight
 * rep-count. The display string is DERIVED from this by `formatRecordValue` — the string migrates
 * onto the model, never the reverse.
 *
 * SCOPE: exercise PRs only. Squad *aggregate* records (streaks, workout counts, session volume) are
 * a deliberately separate string-valued concept — folding them in would bend this union toward
 * non-exercise marks (a `kind: 'streak'` polluting a movement-PR type).
 *
 * ⚠ FORWARD (NOT this unit — do not add here): a future records/leaderboard/ranking domain will
 * need a per-kind comparison DIRECTION to rank PRs (load ↑ better, time ↓ better, distance ↑,
 * reps ↑). That is the ranking domain's schema, not §11's — §11 is display-only, and adding a
 * `betterIsHigher` field now would be inventing schema this unit never reads (the same rule that
 * kept PRs as strings until there was a reason to structure them). When ranking lands, direction is
 * added there; it must not be retrofitted onto the display strings or bolted on here.
 */

export type WeightUnit = 'lb' | 'kg'
export type DistanceUnit = 'mi' | 'km' | 'm'

/** The mark itself — the union carves at the real joints of how a PR is measured. */
export type RecordMeasure =
  | { kind: 'load'; value: number; unit: WeightUnit; reps?: number } // 315 lb · 405 lb × 3
  | { kind: 'time'; seconds: number } // 5K in 19:48
  | { kind: 'distance'; value: number; unit: DistanceUnit } // 18.2 mi
  | { kind: 'reps'; reps: number } // 20 bodyweight pull-ups

export interface PersonalRecord {
  /** The movement or event ("Back Squat", "5K"). */
  exercise: string
  measure: RecordMeasure
  /** Optional date the mark was set. */
  achievedOn?: string
}
