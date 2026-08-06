import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, FeTurbulence, Filter, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { flColor, flFont, flGradient, flRadius, flShadow } from '@/constants/foundation';
import { BarbellIcon, FlameIcon } from '@/components/forge/primitives/icons/HomeIcons';

/**
 * FirstProgramCard — the empty-program (first-run) state, pixel-faithful to `Forge First Program Card.dc`:
 * a forged card (surface-card base + bronze top-wash + inset/elevated/glow shadows + grain), an engraved
 * medallion, serif headline, a bronze-metal "Build Program" button, and a quieter "Start a session now".
 *
 * Grain: `feTurbulence` renders on web (the deploy target); on native it's a graceful no-op (unsupported
 * filter), and RN has no mix-blend-mode, so it reads as a faint additive noise rather than a blended
 * overlay — the one honest divergence from the `.dc`.
 */
export function FirstProgramCard({ onBuild, onStart }: { onBuild: () => void; onStart: () => void }) {
  return (
    <View style={styles.card}>
      {/* dark charcoal-900 base (from styles.card) → bronze top wash → grain — the same forged hero
          surface as the active-program card (TodaysWorkoutCard), not the lighter gray surface-card. */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="fpc-wash" cx="50%" cy="0%" rx="120%" ry="90%">
            <Stop offset="0" stopColor="rgb(186,134,84)" stopOpacity={0.16} />
            <Stop offset="0.62" stopColor="rgb(186,134,84)" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#fpc-wash)" />
      </Svg>
      <Svg style={[StyleSheet.absoluteFill, styles.grain]} width="100%" height="100%">
        <Defs>
          <Filter id="fpc-grain">
            <FeTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
          </Filter>
        </Defs>
        <Rect width="100%" height="100%" filter="url(#fpc-grain)" />
      </Svg>

      <View style={styles.content}>
        {/* engraved medallion */}
        <LinearGradient
          colors={flGradient.bronzeMetallic.colors}
          locations={flGradient.bronzeMetallic.locations}
          start={flGradient.bronzeMetallic.start}
          end={flGradient.bronzeMetallic.end}
          style={styles.medallionRing}
        >
          <View style={styles.medallionInner}>
            <BarbellIcon size={32} color={flColor.bronze300} />
          </View>
        </LinearGradient>

        <Text style={styles.eyebrow}>Chapter I · No program yet</Text>
        <Text style={styles.headline}>Forge your first program</Text>
        <Text style={styles.body}>Build your own from the Forge library — set the split, the weeks, the work. Or start a single session right now.</Text>

        {/* bronze-metal Build Program button */}
        <Pressable onPress={onBuild} accessibilityRole="button" accessibilityLabel="Build Program" style={styles.buildBtn}>
          <LinearGradient
            colors={flGradient.bronzeFill.colors}
            locations={flGradient.bronzeFill.locations}
            start={flGradient.bronzeFill.start}
            end={flGradient.bronzeFill.end}
            style={styles.buildFill}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M4 20h16M6 20V9l6-4 6 4v11M10 20v-5h4v5" stroke={flColor.emberFlame} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={styles.buildText}>Build Program</Text>
          </LinearGradient>
        </Pressable>

        {/* "or" hairline divider */}
        <View style={styles.divider}>
          <LinearGradient colors={['transparent', flColor.charcoal600]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <LinearGradient colors={[flColor.charcoal600, 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.dividerLine} />
        </View>

        <Pressable onPress={onStart} accessibilityRole="button" accessibilityLabel="Start a session now" style={styles.startBtn}>
          <FlameIcon size={15} color={flColor.bronze400} />
          <Text style={styles.startText}>Start a session now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.missionCard,
    paddingTop: 34,
    paddingHorizontal: 26,
    paddingBottom: 26,
  },
  grain: { opacity: 0.06 },
  content: { position: 'relative', zIndex: 1, alignItems: 'center' },

  medallionRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `${flShadow.borderInset}, ${flShadow.shadowImage}, ${flShadow.glowBadge}`,
  },
  medallionInner: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    backgroundColor: flColor.surfaceRecessed,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.5)',
    boxShadow: 'inset 0 2px 7px rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  eyebrow: { marginTop: 20, fontSize: 11, fontWeight: '700', letterSpacing: 2.2, textTransform: 'uppercase', color: flColor.bronze400, textAlign: 'center' },
  headline: { marginTop: 11, fontFamily: flFont.display, fontSize: 27, fontWeight: '600', letterSpacing: -0.4, lineHeight: 30, color: flColor.cream100, textAlign: 'center' },
  body: { marginTop: 11, maxWidth: 274, fontFamily: flFont.sans, fontSize: 13.5, lineHeight: 21, color: flColor.gray400, textAlign: 'center' },

  buildBtn: { width: '100%', marginTop: 24 },
  buildFill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 16,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.bronzeMetalBorder,
    boxShadow: `${flShadow.bronzeMetalTopRim}, ${flShadow.card}`,
  },
  buildText: {
    fontFamily: flFont.sans,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#F7F5F1',
    textShadowColor: 'rgba(8,5,2,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, width: 180, marginTop: 16, marginBottom: 4 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 10.5, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: flColor.gray600 },

  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 6, paddingHorizontal: 4 },
  startText: { fontFamily: flFont.sans, fontSize: 13.5, fontWeight: '700', letterSpacing: 0.3, color: flColor.bronze400 },
});
