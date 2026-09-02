import SwiftUI
#if canImport(WatchKit)
import WatchKit
#endif

/**
 Artboard 03, and Beat B, which is the SAME SCREEN wearing a different header.

 ⚠ EXERCISE-COMPLETE IS NOT ITS OWN STATE. The athlete's job is identical either way — wait, then do
   the next thing — so a separate screen would only add a dismissal to a moment that has none. When the
   set just finished was the last of its exercise, "Rest" becomes what you finished and NEXT is
   promoted to bronze, because it now means *move* rather than *repeat*.

 ⚠ THE RING COUNTS AGAINST THIS DEVICE'S CLOCK, from `restEndsAt`. No ticking messages, so it keeps
   running out of Bluetooth range — the one behaviour that makes the watch worth wearing in a gym with
   the phone in a locker.

 ⚠ REDUCE MOTION GETS A STATIC ARC. The rest timer's accessibility rule on the phone carries over: the
   arc still shows how much is left, it simply does not animate between ticks.
 */
struct RestView: View {
    @Environment(\.palette) private var p
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let state: WatchState
    let onAdjust: (Int) -> Void
    let onSkip: () -> Void

    /// Repaints twice a second — the same cadence the phone's rest ticker uses.
    @State private var now = Date()
    @State private var crown: Double = 0
    private let tick = Timer.publish(every: 0.5, on: .main, in: .common).autoconnect()

    private var complete: Bool { state.exerciseComplete == true }

    var body: some View {
        VStack(spacing: 0) {
            Text(complete ? "\(state.completedExercise ?? "") done" : "Rest")
                .font(.system(.caption2, design: .rounded).weight(.semibold))
                .tracking(1.4)
                .textCase(.uppercase)
                .foregroundStyle(p.bronzeText)
                .lineLimit(1)
                .minimumScaleFactor(0.75)

            ZStack {
                Circle()
                    .stroke(p.track, style: StrokeStyle(lineWidth: 7))
                Circle()
                    .trim(from: 0, to: state.restFraction(now: now))
                    .stroke(p.bronze, style: StrokeStyle(lineWidth: 7, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(reduceMotion ? nil : .linear(duration: 0.5), value: state.restFraction(now: now))

                VStack(spacing: 2) {
                    Text(mmss(state.restRemaining(now: now)))
                        .font(.system(size: 27, weight: .semibold))
                        .monospacedDigit()
                        .foregroundStyle(p.textPrimary)
                    if let total = state.restTotalSec {
                        Text("of \(mmss(total))")
                            .font(.system(size: 9, weight: .semibold))
                            .tracking(1.2)
                            .textCase(.uppercase)
                            .foregroundStyle(p.bronzeText)
                    }
                }
            }
            .frame(width: 104, height: 104)
            .padding(.top, 2)

            VStack(spacing: 1) {
                Text(complete ? "Next exercise" : "Next")
                    .font(.system(size: 9, weight: .semibold))
                    .tracking(1.6)
                    .textCase(.uppercase)
                    .foregroundStyle(complete ? p.bronzeText : p.textTertiary)
                Text(state.nextExercise ?? "")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(p.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
                Text(state.nextTarget ?? "")
                    .font(.system(size: 12, weight: .semibold))
                    .monospacedDigit()
                    .foregroundStyle(p.bronzeText)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }
            .padding(.top, 6)

            Spacer(minLength: 4)

            HStack(spacing: 4) {
                RestControl(label: "−15") { onAdjust(-15) }
                RestControl(label: "Skip", tinted: true, action: onSkip)
                RestControl(label: "+15") { onAdjust(15) }
            }
        }
        .onReceive(tick) { now = $0 }
        /* The Digital Crown adjusts in the same 15s steps the buttons do — plan §1, and the only reason
           the crown is bound at all.

           ⚠ THE PLAIN BINDING FORM ON PURPOSE. The closure-based `digitalCrownRotation(detent:...)`
           overload carries a `RotationalDetent`/velocity API that has moved across watchOS releases,
           and nothing in this project can compile a line of Swift before an EAS build. This overload
           has been stable since watchOS 6: one binding, one `onChange`. */
        .focusable()
        .digitalCrownRotation(
            $crown,
            from: -60, through: 60, by: 1,
            sensitivity: .low,
            isContinuous: false,
            isHapticFeedbackEnabled: true
        )
        .onChange(of: crown) { previous, current in
            /* One notch is one detent; ±15s per notch, and the accumulator resets so a slow turn does
               not compound into a five-minute jump. */
            let delta = current - previous
            guard abs(delta) >= 1 else { return }
            crown = 0
            onAdjust(delta > 0 ? 15 : -15)
        }
    }
}

private struct RestControl: View {
    @Environment(\.palette) private var p
    let label: String
    var tinted: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 13, weight: .semibold))
                .monospacedDigit()
                .frame(maxWidth: .infinity, minHeight: 37)
                .foregroundStyle(tinted ? p.bronzeText : p.textPrimary)
                .background(p.surface, in: Capsule())
                .overlay(Capsule().strokeBorder(p.track, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}
