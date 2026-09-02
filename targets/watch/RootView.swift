import SwiftUI

/**
 ══ ONE STATE, FOUR SCREENS, TWO BEATS ══

 `design-drafts/ForgeWatchCompanion.dc.html`. The phase comes from the phone and this view never
 decides it — the watch cannot move itself between states, which is precisely what makes an unreachable
 phone a DISPLAY problem here instead of a data problem.

 ⚠ THE GROUND IS PAINTED FROM THE PALETTE, NOT INHERITED. watchOS has no light mode, so Alabaster
   arrives in the state or not at all. See `Theme.swift`.
 */
struct RootView: View {
    @StateObject private var link = PhoneLink()

    private var palette: Palette { link.state.palette }

    var body: some View {
        ZStack {
            palette.ground.ignoresSafeArea()

            content
                .padding(.horizontal, 13)
                .padding(.bottom, 13)

            /* Beat A sits OVER whatever is underneath, so a tap during it falls through rather than
               being swallowed by a screen the athlete has to leave. */
            if let target = link.justLogged {
                SetLoggedView(target: target)
                    .transition(.opacity)
                    .allowsHitTesting(false)
            }
        }
        .environment(\.palette, palette)
        .animation(.easeOut(duration: 0.18), value: link.justLogged)
    }

    @ViewBuilder
    private var content: some View {
        switch link.state.kind {
        case .idle:
            IdleView()
        case .active:
            ActiveView(state: link.state, reachable: link.reachableNow) { link.setDone() }
        case .rest:
            RestView(state: link.state, onAdjust: link.restAdjust, onSkip: link.restSkip)
        case .finished:
            FinishedView(state: link.state)
        }
    }
}
