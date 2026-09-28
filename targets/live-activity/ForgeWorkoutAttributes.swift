import ActivityKit
import Foundation

/**
 ══ THE LIVE ACTIVITY'S DATA — ONE STRUCT, TWO COPIES, BYTE-IDENTICAL ══

 `Docs/Live-Activities-Build-Plan.md` §2. ActivityKit matches the app's activity with the extension's
 by TYPE NAME and Codable shape. The local Expo module is its own pod and cannot see Swift in the widget
 target (or the other way round), so this file exists twice:

   · `modules/live-activity/ios/ForgeWorkoutAttributes.swift`  — the app side, which starts the card
   · `targets/live-activity/ForgeWorkoutAttributes.swift`      — the extension side, which draws it

 ⚠ EDIT BOTH OR NEITHER. If they drift, the card silently never renders and nothing reports an error.
   `src/domain/workout/__tests__/live-activity-plan.test.mjs` compares the two files as text and checks
   every field against `LiveActivityContent` in `live-activity-plan.ts`, which is the protocol.

 ⚠ EVERY ContentState FIELD EXCEPT `phase` IS OPTIONAL, for the reason `WatchState.swift` gives: a
   build-11 phone must not break a build-10 extension. Add fields, never repurpose one.

 Dates arrive from JavaScript as epoch MILLISECONDS; the module decodes with `.millisecondsSince1970`.
 */
struct ForgeWorkoutAttributes: ActivityAttributes {
  var workoutName: String
  /// The small elapsed clock on the strength layout: `Text(startedAt, style: .timer)`.
  var startedAt: Date

  struct ContentState: Codable, Hashable {
    /// "active" | "rest" | "finished" | "run"; anything else is drawn as active.
    var phase: String
    /// "forge" | "paper"
    var theme: String?

    // strength
    var exercise: String?
    var setLabel: String?
    var target: String?
    var perLabel: String?
    var setsDone: Int?
    var setsTotal: Int?

    // rest: running → Text(timerInterval: restStart...restEnd); paused → restPausedSec as static text
    var restStart: Date?
    var restEnd: Date?
    var restPausedSec: Int?
    var nextExercise: String?
    var nextTarget: String?
    var exerciseComplete: Bool?

    // finished
    var totalSets: Int?
    var elapsedSec: Int?

    // run: running → Text(timerInterval: clockStart...) counting up; paused → clockPausedSec
    var runLabel: String?
    var distance: String?
    var distanceUnit: String?
    var pace: String?
    var paceUnit: String?
    var clockStart: Date?
    var clockPausedSec: Int?
    var autoPaused: Bool?
  }
}
