import ExpoModulesCore
import WatchConnectivity

/**
 ══ THE PHONE HALF OF THE WIRE ══

 `Docs/Apple-Watch-Companion-Build-Plan.md` §4. Two directions, two different primitives, and the
 choice between them is the whole design:

  · STATE goes out on `updateApplicationContext` — latest-wins, queued by the system, delivered
    whenever the watch next becomes reachable. It is the correct primitive for "here is the current
    state" rather than "here is an event", and it is why a watch that was in a locker for ten minutes
    catches up in one delivery instead of replaying ten.

  · COMMANDS come back on `sendMessage`, which is immediate and fails loudly when the phone is not
    reachable. That failure is a feature: the wrist is told, and shows "Phone not reachable" rather
    than queueing a log nothing will ever confirm.

 ⚠ THE REPLY IS A TRANSPORT ACK, NOT A CONFIRMATION. It says the message arrived, and nothing more —
   it cannot say the set was logged, because by the time JavaScript has decided that, this delegate
   callback is long gone. The authoritative answer is the NEXT application context, which carries the
   session with the set in it. That is what the wrist's "Set logged" beat waits for, and it is why the
   beat is specified as firing on the phone's reply rather than on the tap.

 ⚠ EVERY GUARD IS IN TYPESCRIPT, DELIBERATELY. This file does not know what a set is. It moves two
   strings and refuses nothing, because `watch-commands.ts` refuses everything worth refusing and can
   be unit-tested on a machine with no Xcode on it. Keep it that way — a rule added here is a rule
   nobody in this project can run a test against.
 */
public class ForgeWatchBridgeModule: Module {
  private let relay = PhoneRelay()

  public func definition() -> ModuleDefinition {
    Name("ForgeWatchBridge")

    Events("onWatchCommand")

    OnCreate {
      self.relay.onCommand = { [weak self] payload in
        // WCSession delegates call back on a background queue; Expo events are dispatched from here.
        self?.sendEvent("onWatchCommand", ["payload": payload])
      }
      self.relay.activate()
    }

    Function("pushState") { (json: String) in
      self.relay.push(json)
    }

    /**
     Whether there is a watch companion to talk to at all — paired, app installed, session active.

     ⚠ NOT `WCSession.isReachable`. That answers "can I send a message this instant", which is the
     WATCH's question when the athlete taps a button. The phone's question is whether pushing state is
     worth doing, and application context is queued, so a momentarily unreachable watch is still worth
     pushing to. Answering the watch's question here would make the app hide watch affordances every
     time the wrist went to sleep.
     */
    Function("isReachable") { () -> Bool in
      self.relay.hasCompanion
    }
  }
}

/// The `WCSessionDelegate`. Separate from the module because a delegate must be an `NSObject`.
private final class PhoneRelay: NSObject, WCSessionDelegate {
  var onCommand: ((String) -> Void)?

  /**
   Monotonic, and it rides in every context push.

   ⚠ WITHOUT IT A REPEATED PUSH CAN BE SWALLOWED. `updateApplicationContext` replaces what is queued,
   and the system is free to skip delivering a dictionary equal to the one already there. The
   TypeScript side already drops byte-identical payloads, so anything reaching here is a genuine
   change — but "genuine change" and "different dictionary" are not the same claim, and a session that
   returns to a previous state (skip a rest, undo a set) would produce a repeat. The counter makes
   every push distinct without the receiver having to care.
   */
  private var sequence: Int = 0

  private var session: WCSession? {
    guard WCSession.isSupported() else { return nil }
    return WCSession.default
  }

  var hasCompanion: Bool {
    guard let s = session else { return false }
    return s.activationState == .activated && s.isPaired && s.isWatchAppInstalled
  }

  func activate() {
    guard let s = session else { return }
    // The delegate must be set BEFORE activation, or the activation callback has nowhere to land.
    s.delegate = self
    if s.activationState != .activated {
      s.activate()
    }
  }

  func push(_ json: String) {
    guard let s = session, s.activationState == .activated else { return }
    sequence &+= 1
    do {
      try s.updateApplicationContext(["state": json, "seq": sequence])
    } catch {
      // The wrist is a convenience. A phone that cannot reach it still runs the workout.
      NSLog("[ForgeWatchBridge] updateApplicationContext failed: \(error.localizedDescription)")
    }
  }

  // ── WCSessionDelegate ──────────────────────────────────────────────────────────────────────────

  func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
    if let error {
      NSLog("[ForgeWatchBridge] activation failed: \(error.localizedDescription)")
    }
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    // Ack the transport immediately. See the header: this is not a confirmation.
    replyHandler(["ok": true])
    if let payload = message["payload"] as? String {
      onCommand?(payload)
    }
  }

  /// A watch that could not wait for a reply — same payload, no ack. Handled identically.
  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    if let payload = message["payload"] as? String {
      onCommand?(payload)
    }
  }

  /**
   Both are REQUIRED on iOS, and both must reactivate.

   Switching to a different paired watch deactivates the session; not calling `activate()` again leaves
   the app permanently disconnected from the new one, with no error anywhere to explain it.
   */
  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }
}
