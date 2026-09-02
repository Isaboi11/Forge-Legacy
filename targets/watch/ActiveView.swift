import SwiftUI

/**
 Artboard 02 in `design-drafts/ForgeWatchCompanion.dc.html`.

 ⚠ THE SET COUNTER LEADS, AND IS ABOVE THE LIFT NAME. Mid-set you look down to check WHICH SET; the
   name only confirms it. That ordering was the design review's own read and it is the reason this
   screen works at a glance.

 ⚠ THE LIFT NAME IS NEVER ABBREVIATED. "Barbell" is which implement to pick up — across 700+ catalogue
   entries that prefix is often the only difference between two of them. Two lines, then truncate.

 ⚠ THE UNIT STAYS IN `target`. It is built on the phone and arrives finished. The wrist is the one
   surface where a kg/lb mix-up reaches a loaded bar unnoticed.

 Sizes are half the artboard's, which is drawn in PIXELS: a 45 mm watch is 396 × 484 px at @2x, so
 198 × 242 points.
 */
struct ActiveView: View {
    @Environment(\.palette) private var p
    let state: WatchState
    let reachable: Bool
    let onSetDone: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(state.setLabel ?? "")
                .font(.system(.caption2, design: .rounded).weight(.semibold))
                .tracking(1.4)
                .textCase(.uppercase)
                .foregroundStyle(p.bronzeText)

            Text(state.exercise ?? "")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(p.textPrimary)
                .lineLimit(2)
                .minimumScaleFactor(0.85)
                .padding(.top, 6)

            Text(state.target ?? "")
                .font(.system(size: 21, weight: .semibold))
                .foregroundStyle(p.textPrimary)
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .padding(.top, 8)

            if let per = state.perLabel {
                Text(per)
                    .font(.system(size: 11))
                    .foregroundStyle(p.textSecondary)
                    .padding(.top, 1)
            }

            SetBars(done: state.setsDone ?? 0, total: state.setsTotal ?? 0)
                .padding(.top, 8)

            Spacer(minLength: 8)

            Button(action: onSetDone) {
                Text(reachable ? "Set done" : "Phone not reachable")
                    .font(.system(size: reachable ? 15 : 12, weight: .semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .foregroundStyle(reachable ? p.onBronze : p.textTertiary)
                    .background(reachable ? p.bronzeSolid : Color.clear, in: Capsule())
                    .overlay(Capsule().strokeBorder(reachable ? Color.clear : p.track, lineWidth: 1))
            }
            .buttonStyle(.plain)
            /* Disabled rather than silently failing: the wrist says why, and never queues a log it
               cannot verify. */
            .disabled(!reachable)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// The row under the target — earned bronze behind you, track ahead. The set you are ON is brighter.
struct SetBars: View {
    @Environment(\.palette) private var p
    let done: Int
    let total: Int

    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<max(total, 0), id: \.self) { i in
                Capsule()
                    .fill(i < done ? p.bronze : (i == done ? p.bronzeHigh : p.track))
                    .frame(height: 3)
            }
        }
        .accessibilityElement()
        .accessibilityLabel("\(done) of \(total) sets done")
    }
}
