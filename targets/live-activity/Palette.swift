import SwiftUI

/**
 ══ THE TWO PALETTES — COPIED FROM THE WATCH, ON PURPOSE ══

 The values are `targets/watch/Theme.swift`'s, which take theirs from `src/constants/foundation.forge.ts`
 and `foundation.paper.ts`. A COPY, not a share: anything in a root `targets/_shared/` is linked into
 every target, the Watch included, and two `Palette` types in one target would not compile.

 Unlike the Watch, iOS HAS a light mode — but the card follows the APP's theme, not the phone's, so the
 theme travels in every ContentState exactly as it does to the wrist. The Dynamic Island is always black
 (the system decides that), so the Island always paints `.forge`.

 ⚠ If a Forge or Alabaster value changes, change it in `Theme.swift` and here.
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
