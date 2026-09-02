import SwiftUI

/**
 Artboard 04. A receipt, not a ceremony.

 ⚠ "FINISH ON YOUR PHONE" IS A LABEL, NOT A BUTTON. Sealing a session has weight in this app and a
   45 mm screen is the wrong place to spend it, so the wrist confirms the work and hands you back.
   Styled as an outline so it never invites a tap that cannot work — and it is genuinely inert, not a
   button with an empty action.
 */
struct FinishedView: View {
    @Environment(\.palette) private var p
    let state: WatchState

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Session complete")
                .font(.system(.caption2, design: .rounded).weight(.semibold))
                .tracking(1.4)
                .textCase(.uppercase)
                .foregroundStyle(p.bronzeText)

            Text(state.workoutName ?? "")
                .font(.system(size: 15, design: .serif))
                .foregroundStyle(p.textPrimary)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
                .padding(.top, 5)

            HStack(alignment: .top, spacing: 14) {
                Stat(key: "Time", value: mmss(state.elapsedSec ?? 0))
                Stat(key: "Sets", value: String(state.totalSets ?? 0))
            }
            .padding(.top, 10)

            Spacer(minLength: 8)

            Text("Finish on your phone")
                .font(.system(size: 12, weight: .medium))
                .frame(maxWidth: .infinity, minHeight: 37)
                .foregroundStyle(p.textTertiary)
                .overlay(Capsule().strokeBorder(p.track, lineWidth: 1))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct Stat: View {
    @Environment(\.palette) private var p
    let key: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(key)
                .font(.system(size: 8, weight: .semibold))
                .tracking(1.2)
                .textCase(.uppercase)
                .foregroundStyle(p.textTertiary)
            Text(value)
                .font(.system(size: 17, weight: .semibold))
                .monospacedDigit()
                .foregroundStyle(p.textPrimary)
        }
    }
}
