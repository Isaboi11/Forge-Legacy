import SwiftUI

/// Entry point for the watch companion. One window, one root view; the root view decides which of
/// the four states (Idle / Active / Rest / Finished) to show once the phone bridge exists (Phase 2).
/// For the Phase 1 spike the only state is Idle.
@main
struct ForgeLegacyWatchApp: App {
    var body: some Scene {
        WindowGroup {
            IdleView()
        }
    }
}
