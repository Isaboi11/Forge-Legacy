import Foundation
import SwiftUI
import WatchConnectivity
#if canImport(WatchKit)
import WatchKit
#endif

/**
 ══ THE WATCH HALF OF THE WIRE ══

 Mirrors `modules/watch-bridge/ios/ForgeWatchBridgeModule.swift`. State arrives on
 `didReceiveApplicationContext`; commands go out on `sendMessage`.

 ⚠ NOTHING HERE DECIDES ANYTHING. This object holds the last thing the phone said and forwards taps.
   Whether a set may be logged is the phone's answer — `watch-commands.ts` — and it is deliberately not
   duplicated here, because a rule on the wrist is a rule nobody in this project can write a test for.

 ⚠ A FAILED SEND IS SHOWN, NOT QUEUED. `sendMessage` fails immediately when the phone is unreachable
   and `reachableNow` goes false, which is what puts "Phone not reachable" on the button. A queued log
   would be the watch promising something it cannot verify — and a set that lands twice is worse than
   a tap the athlete has to repeat.

 ⚠ THE BEAT WAITS FOR THE PHONE. `justLogged` is set when a NEW state arrives showing more sets done
   than the last one — never when the button is pressed. So the confirmation on the wrist means the
   set was written, not that the tap was registered.
 */
@MainActor
final class PhoneLink: NSObject, ObservableObject {
    @Published private(set) var state: WatchState = .idle
    @Published private(set) var reachableNow: Bool = false
    /// Non-nil for the length of the Set-logged beat, then cleared.
    @Published private(set) var justLogged: String?

    private var beatToken = 0

    override init() {
        super.init()
        guard WCSession.isSupported() else { return }
        let s = WCSession.default
        s.delegate = self
        s.activate()
    }

    // ── out ────────────────────────────────────────────────────────────────────────────────────────

    func setDone() {
        guard let ei = state.exerciseIndex, let si = state.setIndex else { return }
        send(["type": "setDone", "exerciseIndex": ei, "setIndex": si])
    }

    func restSkip() { send(["type": "restSkip"]) }
    func restAdjust(_ deltaSec: Int) { send(["type": "restAdjust", "deltaSec": deltaSec]) }
    func restToggle() { send(["type": "restToggle"]) }

    private func send(_ command: [String: Any]) {
        guard WCSession.isSupported() else { return }
        let s = WCSession.default
        guard s.activationState == .activated, s.isReachable,
              let data = try? JSONSerialization.data(withJSONObject: command),
              let payload = String(data: data, encoding: .utf8)
        else {
            Task { @MainActor in self.reachableNow = false }
            return
        }
        s.sendMessage(
            ["payload": payload],
            replyHandler: { _ in
                Task { @MainActor in self.reachableNow = true }
            },
            errorHandler: { _ in
                Task { @MainActor in self.reachableNow = false }
            }
        )
    }

    // ── in ─────────────────────────────────────────────────────────────────────────────────────────

    fileprivate func apply(_ json: String) {
        let incoming = WatchState.decode(json)
        let previous = state

        // The beat: strictly more sets done on the same exercise than a moment ago.
        let advanced =
            incoming.exerciseIndex == previous.exerciseIndex
            && (incoming.setsDone ?? 0) > (previous.setsDone ?? 0)

        state = incoming
        reachableNow = true

        guard advanced else { return }
        #if canImport(WatchKit)
        WKInterfaceDevice.current().play(.click)
        #endif
        beatToken &+= 1
        let token = beatToken
        justLogged = previous.target
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 600_000_000)
            // The token guards a stale beat from clearing a newer one.
            if self.beatToken == token { self.justLogged = nil }
        }
    }
}

extension PhoneLink: WCSessionDelegate {
    nonisolated func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        let reachable = session.isReachable
        Task { @MainActor in self.reachableNow = reachable }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        guard let json = applicationContext["state"] as? String else { return }
        Task { @MainActor in self.apply(json) }
    }

    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        let reachable = session.isReachable
        Task { @MainActor in self.reachableNow = reachable }
    }
}
