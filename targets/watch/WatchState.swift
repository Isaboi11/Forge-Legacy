import Foundation

/**
 ══ THE PHONE'S SENTENCE, DECODED ══

 The exact mirror of `WatchState` in `src/domain/workout/watch-projection.ts`, which is the protocol.
 That file is the authority; this one follows it.

 ⚠ EVERYTHING EXCEPT `v` AND `phase` IS OPTIONAL, AND NOT OUT OF LAZINESS. A phone on build N+1 will
   talk to a watch on build N for as long as the athlete leaves one of them un-updated, so a field
   added on the phone must decode as absent here rather than failing the whole payload. That is also
   why `phase` is a String with a computed enum rather than a `Decodable` enum: an unknown phase from a
   future build must read as Idle, not throw and leave the wrist frozen on the last thing it drew.

 ⚠ NOTHING IS COMPUTED HERE EXCEPT THE COUNTDOWN. `target` arrives as a finished display string
   because the phone owns units; the wrist must never convert. The one exception is `restEndsAt`,
   which is a deadline the watch counts against its own clock — that is what keeps the ring running
   when the phone is out of range.
 */
struct WatchState: Decodable, Equatable {
    var v: Int = 1
    var phase: String = "idle"
    var theme: String?

    var workoutName: String?

    // active + rest
    var exercise: String?
    var setLabel: String?
    var target: String?
    var perLabel: String?
    var setsDone: Int?
    var setsTotal: Int?
    var exerciseIndex: Int?
    var setIndex: Int?

    // rest
    /// Epoch MILLISECONDS. JavaScript's clock, so it is divided by 1000 on the way into a `Date`.
    var restEndsAt: Double?
    var restRemainingSec: Int?
    var restTotalSec: Int?
    var nextExercise: String?
    var nextTarget: String?
    var exerciseComplete: Bool?
    var completedExercise: String?

    // finished
    var elapsedSec: Int?
    var totalSets: Int?

    enum Phase { case idle, active, rest, finished }

    /// An unrecognised phase reads as Idle — the one screen that is honest about knowing nothing.
    var kind: Phase {
        switch phase {
        case "active": return .active
        case "rest": return .rest
        case "finished": return .finished
        default: return .idle
        }
    }

    var palette: Palette { .named(theme) }

    static let idle = WatchState()

    /// Decode a payload that crossed WatchConnectivity. Anything unreadable is Idle, never a crash.
    static func decode(_ json: String) -> WatchState {
        guard let data = json.data(using: .utf8),
              let state = try? JSONDecoder().decode(WatchState.self, from: data)
        else { return .idle }
        return state
    }

    // ── the countdown, and the only arithmetic on this device ──────────────────────────────────────

    /// Seconds left, against the watch's OWN clock. Paused rests carry a frozen value instead.
    func restRemaining(now: Date = Date()) -> Int {
        if let frozen = restRemainingSec { return max(0, frozen) }
        guard let ms = restEndsAt else { return 0 }
        return max(0, Int((ms / 1000.0 - now.timeIntervalSince1970).rounded(.up)))
    }

    /// 0…1 of the rest still to run — the ring's fill. Zero total never divides.
    func restFraction(now: Date = Date()) -> Double {
        guard let total = restTotalSec, total > 0 else { return 0 }
        return min(1, max(0, Double(restRemaining(now: now)) / Double(total)))
    }
}

/// `m:ss`, the phone's own `fmtMMSS`.
func mmss(_ seconds: Int) -> String {
    let s = max(0, seconds)
    return String(format: "%d:%02d", s / 60, s % 60)
}
