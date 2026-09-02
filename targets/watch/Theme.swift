import SwiftUI

/**
 ══ THE TWO PALETTES, PAINTED RATHER THAN INHERITED ══

 Ground truth is `src/constants/foundation.forge.ts` and `foundation.paper.ts`, and the artboards are
 `design-drafts/ForgeWatchCompanion.dc.html`.

 ⚠ THIS IS A SWIFT STRUCT AND NOT AN ASSET CATALOGUE, AND THAT IS THE WHOLE POINT.
   The iOS way to carry two themes is one colour set with a light and a dark appearance. It does
   nothing here: **watchOS has no user-facing light mode**, and SwiftUI's `ColorScheme` on a watch is
   always `.dark`, so the light variant of a colour set can never resolve. Alabaster on the wrist can
   therefore only be SENT — the phone puts `theme` in every `WatchState` push and these values are
   selected from it.

 ⚠ TOKEN NAMES ARE ROLES, NOT DESCRIPTIONS. `textPrimary` is the darkest value in Alabaster. Renaming
   them per theme is what makes two palettes drift apart.

 ⚠ TWO BRONZES, AND THEY ARE NOT INTERCHANGEABLE. `bronze` is ornament — rings, bars, the stamp.
   `bronzeText` is for words. They are the same value in Forge and deliberately different in Alabaster,
   where the ornament bronze measures 3.40:1 and fails WCAG AA for text. PO review, 2026-08-25:
   *"keep the brighter bronze for borders, icons and ornamental elements … a slightly deeper
   brown-bronze for small text."*
 */
struct Palette {
    let ground: Color
    let surface: Color
    let track: Color
    let textPrimary: Color
    let textSecondary: Color
    let textTertiary: Color
    /// Ornament only: rings, set bars, the stamp mark. Never a word in Alabaster.
    let bronze: Color
    /// `bronzeInk` — every small caps label, the clock, Skip.
    let bronzeText: Color
    let bronzeHigh: Color
    /// `bronzeSolid` — the filled primary action. White sits on it in BOTH themes.
    let bronzeSolid: Color
    let onBronze: Color

    static let forge = Palette(
        ground: Color(hex: 0x0C1013),
        surface: Color(hex: 0x131517),
        track: Color(hex: 0x24242A),
        textPrimary: Color(hex: 0xF0EDE8),
        textSecondary: Color(hex: 0x9E9890),
        textTertiary: Color(hex: 0x888282),
        bronze: Color(hex: 0xBA8654),
        bronzeText: Color(hex: 0xBA8654),
        bronzeHigh: Color(hex: 0xC99767),
        bronzeSolid: Color(hex: 0x765B44),
        onBronze: .white
    )

    static let paper = Palette(
        ground: Color(hex: 0xF6F2E8),
        surface: Color(hex: 0xF9F6EF),
        track: Color(hex: 0xCDBD9F),
        textPrimary: Color(hex: 0x28231D),
        textSecondary: Color(hex: 0x6E6860),
        textTertiary: Color(hex: 0x8B8377),
        bronze: Color(hex: 0xA47A3D),
        bronzeText: Color(hex: 0x88683A),
        bronzeHigh: Color(hex: 0xBD9257),
        bronzeSolid: Color(hex: 0x8C6B3C),
        onBronze: .white
    )

    /// Anything the phone has not said, or said in a version this build predates, is Forge.
    static func named(_ name: String?) -> Palette { name == "paper" ? .paper : .forge }
}

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0,
            opacity: 1.0
        )
    }
}

/// The palette in scope, so a view never has to be handed one explicitly.
private struct PaletteKey: EnvironmentKey {
    static let defaultValue: Palette = .forge
}

extension EnvironmentValues {
    var palette: Palette {
        get { self[PaletteKey.self] }
        set { self[PaletteKey.self] = newValue }
    }
}
