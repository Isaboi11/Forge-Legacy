import SwiftUI

/// Entry point for the watch companion. One window, one root view; `RootView` owns the `PhoneLink`
/// and decides which of the four states to show from what the phone last said.
@main
struct ForgeLegacyWatchApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}
