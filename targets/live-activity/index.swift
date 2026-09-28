import SwiftUI
import WidgetKit

/// Entry point for the extension. One widget: the workout Live Activity. There is no home-screen widget.
@main
struct ForgeLegacyLiveBundle: WidgetBundle {
    var body: some Widget {
        WorkoutLiveActivity()
    }
}
