import ActivityKit
import SwiftUI
import WidgetKit

/**
 ══ THE WORKOUT CARD — LOCK SCREEN AND DYNAMIC ISLAND ══

 `Docs/Live-Activities-Build-Plan.md` §1. No `.dc.html` covers this yet (the artboards are owed), so the
 plan's table IS the layout, in the Watch's visual language:

   · Forge ground, Forge text. BRONZE IS EARNED: the rest countdown, the drain bar, the "Next" line, the
     set bars and the run's distance — nothing else. No bronze borders, no card inside the card.
   · Every digit is tabular (`monospacedDigit`), so a ticking clock never shuffles its neighbours.
   · The lock screen follows the APP's theme (`state.theme`); the Island is always black, so always Forge.

 ⚠ NOTHING HERE IS COMPUTED THAT JAVASCRIPT COULD HAVE SENT. The phone sends finished strings ("Set 3 of
   5", "185 lb × 8", "3.12"). The only arithmetic is the timers, and those are SwiftUI's own
   (`Text(timerInterval:)`, `Text(_:style: .timer)`, `ProgressView(timerInterval:)`), which keep running
   with the app asleep — the whole reason this card needs no push.

 ⚠ A ClosedRange WITH lower > upper TRAPS. Every range below goes through `window(_:_:)`.

 ⚠ UNCOMPILED UNTIL BUILD 10 — Windows cannot build Swift.
 */
struct WorkoutLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ForgeWorkoutAttributes.self) { context in
            LockScreenCard(context: context)
                .activityBackgroundTint(Palette.named(context.state.theme).ground)
                .activitySystemActionForegroundColor(Palette.named(context.state.theme).textPrimary)
                .widgetURL(URL(string: "forgelegacy://workout"))
        } dynamicIsland: { context in
            let s = context.state
            let p = Palette.forge
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Mark(state: s).padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    IslandTrailing(state: s, palette: p).padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.center) {
                    IslandCenter(context: context, palette: p)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    IslandBottom(state: s, palette: p)
                }
            } compactLeading: {
                Mark(state: s)
            } compactTrailing: {
                IslandTrailing(state: s, palette: p)
            } minimal: {
                IslandMinimal(state: s, palette: p)
            }
            .widgetURL(URL(string: "forgelegacy://workout"))
            .keylineTint(p.bronze)
        }
    }
}

// ── helpers ──────────────────────────────────────────────────────────────────────────────────────────

/// A safe range: never lower > upper, which would trap.
private func window(_ start: Date?, _ end: Date) -> ClosedRange<Date> {
    let s = min(start ?? end, end)
    return s...end
}

/// "52:10", "1:02:04" — the same shape as the app's `fmtClock`.
private func clock(_ totalSec: Int) -> String {
    let s = max(0, totalSec)
    let h = s / 3600
    let m = (s % 3600) / 60
    let ss = s % 60
    return h > 0 ? String(format: "%d:%02d:%02d", h, m, ss) : String(format: "%d:%02d", m, ss)
}

private enum Kind { case active, rest, finished, run }

private func kind(_ s: ForgeWorkoutAttributes.ContentState) -> Kind {
    switch s.phase {
    case "rest": return .rest
    case "finished": return .finished
    case "run": return .run
    default: return .active // unknown phases from a newer phone draw as active
    }
}

/// The leading glyph: a dumbbell for lifting, a runner for a run, a check when it is done.
private struct Mark: View {
    let state: ForgeWorkoutAttributes.ContentState
    var body: some View {
        switch kind(state) {
        case .finished:
            Image(systemName: "checkmark").foregroundColor(Palette.forge.bronze)
        case .run:
            Image(systemName: "figure.run").foregroundColor(Palette.forge.bronze)
        default:
            Image(systemName: "dumbbell.fill").foregroundColor(Palette.forge.bronze)
        }
    }
}

/// Set bars: done in bronze, to-do on the track. Capped so a 20-set block still fits.
private struct SetBars: View {
    let done: Int
    let total: Int
    let palette: Palette
    var body: some View {
        let n = min(max(total, 0), 12)
        HStack(spacing: 4) {
            ForEach(0..<n, id: \.self) { i in
                Capsule()
                    .fill(i < done ? palette.bronze : palette.track)
                    .frame(height: 4)
            }
        }
    }
}

// ── lock screen ──────────────────────────────────────────────────────────────────────────────────────

private struct LockScreenCard: View {
    let context: ActivityViewContext<ForgeWorkoutAttributes>

    var body: some View {
        let s = context.state
        let p = Palette.named(s.theme)
        VStack(alignment: .leading, spacing: 8) {
            switch kind(s) {
            case .active: active(s, p)
            case .rest: rest(s, p)
            case .finished: finished(s, p)
            case .run: run(s, p)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // Exercise (large) · Set 3 of 5 · target · set bars · workout elapsed, top right.
    @ViewBuilder private func active(_ s: ForgeWorkoutAttributes.ContentState, _ p: Palette) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(s.exercise ?? context.attributes.workoutName)
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(p.textPrimary)
                .lineLimit(1)
            Spacer(minLength: 8)
            Text(context.attributes.startedAt, style: .timer)
                .font(.system(size: 13, weight: .medium).monospacedDigit())
                .foregroundColor(p.textTertiary)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: 70, alignment: .trailing)
        }
        HStack(spacing: 6) {
            if let label = s.setLabel {
                Text(label).foregroundColor(p.textSecondary)
            }
            if let target = s.target {
                Text("·").foregroundColor(p.textTertiary)
                Text(target).foregroundColor(p.textPrimary)
            }
            if let per = s.perLabel {
                Text(per).font(.system(size: 12)).foregroundColor(p.textTertiary)
            }
        }
        .font(.system(size: 15, weight: .medium).monospacedDigit())
        .lineLimit(1)
        if let total = s.setsTotal, total > 0 {
            SetBars(done: s.setsDone ?? 0, total: total, palette: p)
        }
    }

    // REST · big bronze countdown · a draining bronze bar · Next: exercise — target.
    @ViewBuilder private func rest(_ s: ForgeWorkoutAttributes.ContentState, _ p: Palette) -> some View {
        if context.isStale || (s.restEnd.map { $0 <= Date() } ?? false) && s.restPausedSec == nil {
            // The rest ran out with the app asleep. `staleDate` = restEnd, so iOS redraws this by itself.
            Text("REST DONE")
                .font(.system(size: 11, weight: .bold)).tracking(1.4)
                .foregroundColor(p.bronzeText)
            Text(s.setLabel.map { "\($0) next" } ?? "Back to it")
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(p.textPrimary)
            nextLine(s, p)
        } else {
            HStack(alignment: .firstTextBaseline) {
                Text(s.restPausedSec != nil ? "REST · PAUSED" : "REST")
                    .font(.system(size: 11, weight: .bold)).tracking(1.4)
                    .foregroundColor(p.bronzeText)
                Spacer()
            }
            if let paused = s.restPausedSec {
                Text(clock(paused))
                    .font(.system(size: 40, weight: .semibold).monospacedDigit())
                    .foregroundColor(p.textSecondary)
            } else if let end = s.restEnd {
                let r = window(s.restStart, end)
                Text(timerInterval: r, countsDown: true)
                    .font(.system(size: 40, weight: .semibold).monospacedDigit())
                    .foregroundColor(p.bronze)
                ProgressView(timerInterval: r, countsDown: true, label: { EmptyView() }, currentValueLabel: { EmptyView() })
                    .progressViewStyle(.linear)
                    .tint(p.bronze)
            }
            nextLine(s, p)
        }
    }

    @ViewBuilder private func nextLine(_ s: ForgeWorkoutAttributes.ContentState, _ p: Palette) -> some View {
        if let next = s.nextExercise {
            Text("Next: \(next)\(s.nextTarget.map { " — \($0)" } ?? "")")
                .font(.system(size: 14, weight: .medium).monospacedDigit())
                .foregroundColor(p.bronzeText)
                .lineLimit(1)
        }
    }

    // Workout complete · name · "18 sets · 52:10".
    @ViewBuilder private func finished(_ s: ForgeWorkoutAttributes.ContentState, _ p: Palette) -> some View {
        Text("WORKOUT COMPLETE")
            .font(.system(size: 11, weight: .bold)).tracking(1.4)
            .foregroundColor(p.bronzeText)
        Text(context.attributes.workoutName)
            .font(.system(size: 20, weight: .semibold))
            .foregroundColor(p.textPrimary)
            .lineLimit(1)
        Text("\(s.totalSets ?? 0) sets · \(clock(s.elapsedSec ?? 0))")
            .font(.system(size: 15, weight: .medium).monospacedDigit())
            .foregroundColor(p.textSecondary)
    }

    // RUN · big distance · moving time · pace. PO 09-28: runs get the card too.
    @ViewBuilder private func run(_ s: ForgeWorkoutAttributes.ContentState, _ p: Palette) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text((s.runLabel ?? "Run").uppercased())
                .font(.system(size: 11, weight: .bold)).tracking(1.4)
                .foregroundColor(p.textSecondary)
            Spacer()
            if s.clockPausedSec != nil {
                Text(s.autoPaused == true ? "AUTO-PAUSED" : "PAUSED")
                    .font(.system(size: 11, weight: .bold)).tracking(1.4)
                    .foregroundColor(p.textTertiary)
            }
        }
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(s.distance ?? "0.00")
                .font(.system(size: 40, weight: .semibold).monospacedDigit())
                .foregroundColor(p.bronze)
            Text(s.distanceUnit ?? "mi")
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(p.textSecondary)
        }
        HStack(spacing: 18) {
            runClock(s, p)
            if let pace = s.pace {
                HStack(spacing: 3) {
                    Text(pace).foregroundColor(p.textPrimary)
                    Text(s.paceUnit ?? "/mi").foregroundColor(p.textTertiary)
                }
            }
        }
        .font(.system(size: 17, weight: .medium).monospacedDigit())
    }
}

/// The run's MOVING time: counting up natively while running, frozen while paused.
@ViewBuilder
private func runClock(_ s: ForgeWorkoutAttributes.ContentState, _ p: Palette) -> some View {
    if let paused = s.clockPausedSec {
        Text(clock(paused)).foregroundColor(p.textSecondary)
    } else if let start = s.clockStart {
        Text(min(start, Date()), style: .timer).foregroundColor(p.textPrimary)
    }
}

// ── Dynamic Island ───────────────────────────────────────────────────────────────────────────────────

private struct IslandTrailing: View {
    let state: ForgeWorkoutAttributes.ContentState
    let palette: Palette
    var body: some View {
        let s = state
        switch kind(s) {
        case .rest:
            if let paused = s.restPausedSec {
                Text(clock(paused)).font(.system(size: 14, weight: .semibold).monospacedDigit()).foregroundColor(palette.textSecondary)
            } else if let end = s.restEnd {
                Text(timerInterval: window(s.restStart, end), countsDown: true)
                    .font(.system(size: 14, weight: .semibold).monospacedDigit())
                    .foregroundColor(palette.bronze)
                    .frame(maxWidth: 48)
            }
        case .finished:
            Image(systemName: "checkmark").foregroundColor(palette.bronze)
        case .run:
            Text("\(s.distance ?? "0.00")\(s.distanceUnit ?? "mi")")
                .font(.system(size: 14, weight: .semibold).monospacedDigit())
                .foregroundColor(palette.bronze)
        case .active:
            Text("\(s.setsDone ?? 0)/\(s.setsTotal ?? 0)")
                .font(.system(size: 14, weight: .semibold).monospacedDigit())
                .foregroundColor(palette.textPrimary)
        }
    }
}

private struct IslandCenter: View {
    let context: ActivityViewContext<ForgeWorkoutAttributes>
    let palette: Palette
    var body: some View {
        let s = context.state
        switch kind(s) {
        case .rest:
            Text("Rest").font(.system(size: 15, weight: .semibold)).foregroundColor(palette.textSecondary)
        case .finished:
            Text("Workout complete").font(.system(size: 15, weight: .semibold)).foregroundColor(palette.textPrimary)
        case .run:
            Text(s.runLabel ?? "Run").font(.system(size: 15, weight: .semibold)).foregroundColor(palette.textPrimary)
        case .active:
            Text(s.exercise ?? context.attributes.workoutName)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(palette.textPrimary)
                .lineLimit(1)
        }
    }
}

private struct IslandBottom: View {
    let state: ForgeWorkoutAttributes.ContentState
    let palette: Palette
    var body: some View {
        let s = state
        switch kind(s) {
        case .active:
            VStack(alignment: .leading, spacing: 6) {
                Text([s.setLabel, s.target].compactMap { $0 }.joined(separator: " · "))
                    .font(.system(size: 14, weight: .medium).monospacedDigit())
                    .foregroundColor(palette.textSecondary)
                    .lineLimit(1)
                if let total = s.setsTotal, total > 0 {
                    SetBars(done: s.setsDone ?? 0, total: total, palette: palette)
                }
            }
        case .rest:
            if let next = s.nextExercise {
                Text("Next: \(next)\(s.nextTarget.map { " — \($0)" } ?? "")")
                    .font(.system(size: 14, weight: .medium).monospacedDigit())
                    .foregroundColor(palette.bronzeText)
                    .lineLimit(1)
            }
        case .finished:
            Text("\(s.totalSets ?? 0) sets · \(clock(s.elapsedSec ?? 0))")
                .font(.system(size: 14, weight: .medium).monospacedDigit())
                .foregroundColor(palette.textSecondary)
        case .run:
            HStack(spacing: 16) {
                runClock(s, palette)
                if let pace = s.pace {
                    Text("\(pace) \(s.paceUnit ?? "/mi")").foregroundColor(palette.textSecondary)
                }
            }
            .font(.system(size: 14, weight: .medium).monospacedDigit())
        }
    }
}

/// Shared with another app's activity: a countdown ring while resting, the mark otherwise.
private struct IslandMinimal: View {
    let state: ForgeWorkoutAttributes.ContentState
    let palette: Palette
    var body: some View {
        let s = state
        if kind(s) == .rest, s.restPausedSec == nil, let end = s.restEnd {
            ProgressView(timerInterval: window(s.restStart, end), countsDown: true, label: { EmptyView() }, currentValueLabel: { EmptyView() })
                .progressViewStyle(.circular)
                .tint(palette.bronze)
        } else {
            Mark(state: s)
        }
    }
}
