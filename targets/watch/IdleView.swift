import SwiftUI

/**
 Artboard 01 — the state the watch shows when no session is running on the phone.

 The copy is deliberate: the watch never starts a workout itself (plan §1), so the only honest thing to
 say is where to start one.

 ⚠ THIS SCREEN ALSO CARRIES THE CARDIO CASE. V1 is strength-only, and a cardio-only session projects to
   Idle rather than an Active screen with nothing to put in it — see `watch-projection.ts`.

 ⚠ AND IT IS THE SCREEN APP REVIEW SEES. A reviewer tests without a live phone session, so this is the
   whole app as far as they are concerned; the reviewer notes explain the dependency (plan §5).

 ⚠ Colours come from `Palette`, not the asset catalogue — watchOS has no light appearance for a colour
   set to resolve against, so Alabaster has to be sent. Was `.white` and `Color("ForgeGround")` before;
   the white was off-brand by a shade and the colour set only ever had one value.
 */
struct IdleView: View {
    @Environment(\.palette) private var p

    var body: some View {
        VStack(spacing: 8) {
            Text("Forge Legacy")
                .font(.system(.caption2, design: .rounded).weight(.semibold))
                .tracking(1.8)
                .textCase(.uppercase)
                .foregroundStyle(p.bronzeText)

            Text("Start a workout\non your phone")
                .font(.system(size: 15, design: .serif))
                .multilineTextAlignment(.center)
                .foregroundStyle(p.textPrimary)

            Text("Your session will appear here.")
                .font(.system(size: 10))
                .multilineTextAlignment(.center)
                .foregroundStyle(p.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    IdleView().environment(\.palette, .forge).background(Palette.forge.ground)
}
