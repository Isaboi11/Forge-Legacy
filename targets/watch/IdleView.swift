import SwiftUI

/// The state the watch shows when no session is running on the phone.
///
/// Copy is deliberate: the watch never starts a workout itself (plan §1), so the only honest thing to
/// say is where to start one. The colour names resolve to the colour sets declared in
/// `expo-target.config.js`; a missing set renders clear rather than failing the build, so the spike
/// checks this screen on a real wrist, not only that it compiled.
struct IdleView: View {
    var body: some View {
        VStack(spacing: 10) {
            Text("FORGE LEGACY")
                .font(.system(.caption2, design: .rounded).weight(.semibold))
                .tracking(2)
                .foregroundStyle(Color.accentColor)

            Text("Start a workout on your phone")
                .font(.system(.body, design: .serif))
                .multilineTextAlignment(.center)
                .foregroundStyle(.white)

            Text("It will show up here.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color("ForgeGround"))
        .ignoresSafeArea()
    }
}

#Preview {
    IdleView()
}
