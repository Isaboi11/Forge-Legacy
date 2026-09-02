import SwiftUI

/**
 Beat A — roughly 600 ms between the tap and the rest ring.

 ⚠ IT FIRES ON THE PHONE'S ANSWER, NOT ON THE TAP. `PhoneLink` sets `justLogged` when a NEW state
   arrives with more sets done than the last one. So what you see confirms what was WRITTEN, not what
   was sent — and when the phone is unreachable the beat simply does not play, which is the honest
   answer. Silence is better than a checkmark for a set nobody logged.

 ⚠ IT CANNOT BE DISMISSED, BECAUSE IT NEVER HAS TO BE. Mid-workout, a screen you must tap your way out
   of costs an interaction the athlete did not agree to. It passes on its own and a tap during it
   falls through to whatever is underneath.
 */
struct SetLoggedView: View {
    @Environment(\.palette) private var p
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// The target of the set that was just written — "185 lb × 8".
    let target: String?

    @State private var struck = false

    var body: some View {
        VStack(spacing: 10) {
            ZStack {
                Circle().strokeBorder(p.bronze, lineWidth: 2)
                Image(systemName: "checkmark")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundStyle(p.bronze)
            }
            .frame(width: 66, height: 66)
            .scaleEffect(struck ? 1 : 0.62)

            Text("Set logged")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(p.textPrimary)

            if let target {
                Text(target)
                    .font(.system(size: 11))
                    .monospacedDigit()
                    .foregroundStyle(p.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(p.ground)
        .onAppear {
            /* Reduce Motion gets the mark without the stamp. Duration is unchanged — the beat is about
               confirmation, and shortening it for one athlete would make it easier to miss. */
            if reduceMotion {
                struck = true
            } else {
                withAnimation(.spring(response: 0.32, dampingFraction: 0.58)) { struck = true }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(target.map { "Set logged, \($0)" } ?? "Set logged")
    }
}
