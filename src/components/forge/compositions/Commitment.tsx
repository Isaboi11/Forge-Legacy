import { Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation'

/**
 * The squad Commitment (SQ-D14) — a short values statement, shown wherever an athlete needs to read it
 * and accepted before any join completes.
 *
 * Shared rather than duplicated because it appears in four places (join-by-code, the request sheet on
 * Squad Preview, Preview's own body, and Squad Settings), and a values statement that renders four
 * slightly different ways stops reading like a promise.
 *
 * The panel is deliberately quieter than a card and warmer than a note: a bronze-tinted block with a
 * left rule, and the text in the display serif at reading size. It should feel closer to an inscription
 * than to UI.
 */

export function CommitmentPanel({ text, intro }: { text: string; intro?: string }) {
  return (
    <View>
      {intro ? <Text style={styles.intro}>{intro}</Text> : null}
      <View style={styles.panel}>
        <View style={styles.rule} />
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  )
}

/**
 * The acknowledgement. A checkbox rather than a second button, because accepting values is a considered
 * act and the commit button should stay the one thing that completes the join.
 */
export function AcceptCommitment({ accepted, onToggle, label = 'I accept these values' }: { accepted: boolean; onToggle: () => void; label?: string }) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: accepted }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.accept, accepted ? styles.acceptOn : null, pressed ? styles.acceptPressed : null]}
      hitSlop={4}
    >
      <View style={[styles.box, accepted ? styles.boxOn : null]}>
        {accepted ? (
          <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={flColor.onBronze} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 12.5l4 4 10-10" />
          </Svg>
        ) : null}
      </View>
      <Text style={[styles.acceptLabel, accepted ? styles.acceptLabelOn : null]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  intro: { marginBottom: 12, fontSize: 13, lineHeight: 20, color: flColor.gray400 },

  panel: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 16,
    paddingLeft: 15,
    paddingRight: 16,
    borderRadius: flRadius.lg,
    backgroundColor: flColor.bronzeTint,
    borderWidth: 1,
    borderColor: flColor.bronzeBorderSubtle,
  },
  /** A struck rule rather than a quote mark — the app engraves, it doesn't punctuate. */
  rule: { width: 2, borderRadius: 1, backgroundColor: flColor.bronze400, opacity: 0.7 },
  text: { flex: 1, fontFamily: flFont.displayMedium, fontSize: 15.5, lineHeight: 25, letterSpacing: 0.1, color: flColor.cream100 },

  accept: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: flRadius.md,
    borderWidth: 1,
    borderColor: flColor.charcoal600,
    backgroundColor: flColor.charcoal900,
  },
  acceptOn: { borderColor: flColor.bronzeBorder, backgroundColor: flColor.bronzeTint },
  acceptPressed: { opacity: 0.85 },
  box: {
    width: 21,
    height: 21,
    borderRadius: flRadius.xs,
    borderWidth: 1.5,
    borderColor: flColor.charcoal500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { borderColor: flColor.bronze400, backgroundColor: flColor.bronzeSolid, boxShadow: flShadow.glowSubtle },
  acceptLabel: { flex: 1, fontSize: 13.5, color: flColor.gray400 },
  acceptLabelOn: { color: flColor.cream100, fontWeight: '600' },
})
