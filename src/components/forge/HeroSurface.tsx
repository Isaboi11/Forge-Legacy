import { StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { flGradient, IS_PAPER } from '@/constants/foundation'

/**
 * The hero tier — the single most prominent card on a screen (Today's Workout on Home, the current
 * exercise in Active Workout). Drop it as the first child of that card's container, above its
 * background and below its content.
 *
 * ══ IT RENDERS NOTHING IN FORGE, AND THAT IS THE WHOLE DESIGN ══
 *
 * The dark theme never needed a hero tier: on near-black, a bronze edge and a deeper shadow are enough
 * to say "this one matters", and `--fl-surface-card` did double duty as both the hero and the ordinary
 * cards. Paper has no such room. Cream card on cream page is nearly the same colour, so without a
 * lighter hero the screen reads as flat beige-on-beige — the handoff calls this out as the reason
 * `--fl-surface-hero` was added at all.
 *
 * Rather than branch on the theme at every hero card, the branch lives here once. In Forge this is a
 * `null` and the card renders byte-for-byte what it rendered before — which is what lets the "dark is
 * unchanged" gate stay true while heroes get their tier in Paper.
 *
 * ⚠ ONE PER SCREEN. A tier that everything claims is not a tier. If two cards on a screen both want
 *   it, neither is the hero and the screen has a hierarchy problem this component cannot fix.
 */
export function HeroSurface() {
  if (!IS_PAPER) return null
  return (
    <LinearGradient
      pointerEvents="none"
      colors={flGradient.surfaceHero.colors}
      locations={flGradient.surfaceHero.locations}
      start={flGradient.surfaceHero.start}
      end={flGradient.surfaceHero.end}
      style={StyleSheet.absoluteFill}
    />
  )
}
