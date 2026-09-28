import ActivityKit
import ExpoModulesCore
import Foundation

/**
 ══ THE PHONE HALF OF THE LIVE ACTIVITY ══

 `Docs/Live-Activities-Build-Plan.md` §3. Same shape as `ForgeWatchBridgeModule`: it moves JSON and
 refuses nothing. WHEN to start, update or end is decided in TypeScript (`live-activity-plan.ts`), where
 it is unit-tested; this file only does what it is told, because a rule added here is a rule nobody in
 this project can run a test against.

 ⚠ ONE CARD, EVER. `start` ADOPTS a card that is already up (a previous process's, after a kill) rather
   than requesting a second one. Two cards for one workout is the failure the plan's §7 step 7 tests for.

 ⚠ NOTHING HERE TICKS. The rest countdown and the run clock are drawn by the extension with
   `Text(timerInterval:)` from the dates in the state, so they run with the app asleep and need no update.

 ⚠ UNCOMPILED UNTIL BUILD 10. Windows cannot build Swift; the first compiler to see this is EAS.
 */
public class ForgeLiveActivityModule: Module {
  private static let decoder: JSONDecoder = {
    let d = JSONDecoder()
    d.dateDecodingStrategy = .millisecondsSince1970
    return d
  }()

  private typealias Card = Activity<ForgeWorkoutAttributes>

  /// The card that is up, if any — whichever process started it.
  private var current: Card? {
    Card.activities.first { $0.activityState == .active || $0.activityState == .stale }
  }

  private func decodeState(_ json: String) throws -> ForgeWorkoutAttributes.ContentState {
    try Self.decoder.decode(ForgeWorkoutAttributes.ContentState.self, from: Data(json.utf8))
  }

  private func content(_ state: ForgeWorkoutAttributes.ContentState, staleAtMs: Double?) -> ActivityContent<ForgeWorkoutAttributes.ContentState> {
    let stale = staleAtMs.map { Date(timeIntervalSince1970: $0 / 1000) }
    return ActivityContent(state: state, staleDate: stale)
  }

  public func definition() -> ModuleDefinition {
    Name("ForgeLiveActivity")

    /// The athlete's per-app switch in Settings → Forge Legacy → Live Activities.
    Function("isEnabled") { () -> Bool in
      ActivityAuthorizationInfo().areActivitiesEnabled
    }

    /// The id of the card that is up, or nil.
    Function("activeId") { () -> String? in
      self.current?.id
    }

    /**
     Start the card — or adopt the one already up. Returns its id.

     Throws with the ActivityKit reason when the request is refused; the TypeScript side reports it as
     `live_activity_start_failed`. The usual refusals are Live Activities switched off for the app and a
     missing `NSSupportsLiveActivities`, which is why both are called out in the plan.
     */
    Function("start") { (attrsJson: String, stateJson: String, staleAtMs: Double?) throws -> String in
      let state = try self.decodeState(stateJson)
      if let existing = self.current {
        let c = self.content(state, staleAtMs: staleAtMs)
        Task { await existing.update(c) }
        return existing.id
      }
      let attrs = try Self.decoder.decode(ForgeWorkoutAttributes.self, from: Data(attrsJson.utf8))
      do {
        let card = try Card.request(attributes: attrs, content: self.content(state, staleAtMs: staleAtMs), pushType: nil)
        return card.id
      } catch {
        NSLog("[ForgeLiveActivity] request failed: \(error.localizedDescription)")
        throw error
      }
    }

    Function("update") { (stateJson: String, staleAtMs: Double?) throws in
      guard let card = self.current else { return }
      let c = self.content(try self.decodeState(stateJson), staleAtMs: staleAtMs)
      Task { await card.update(c) }
    }

    /// End the card. `dismissAfterSec` 0 removes it at once; more leaves the final state up that long.
    Function("end") { (stateJson: String?, dismissAfterSec: Double) throws in
      guard let card = self.current else { return }
      let last = try stateJson.map { self.content(try self.decodeState($0), staleAtMs: nil) }
      let policy: ActivityUIDismissalPolicy = dismissAfterSec <= 0
        ? .immediate
        : .after(Date().addingTimeInterval(dismissAfterSec))
      Task { await card.end(last, dismissalPolicy: policy) }
    }

    /// Every card this app has up, removed at once. Launch-time cleanup after a kill.
    Function("endAll") { () in
      for card in Card.activities {
        Task { await card.end(nil, dismissalPolicy: .immediate) }
      }
    }
  }
}
