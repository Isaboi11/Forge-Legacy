/**
 * CLA-C20 — Modal (ceremony)
 * Tier: 2 (Composite)
 * Spec: Forge Modal Library.dc.html §02 (Ceremony Modal)
 *
 * The ONLY centered-modal class — reserved for earned ceremony moments (M-1/M-3/M-4/
 * M-2, plus M-7 upsell). No tap-outside dismiss: the athlete must act via a footer
 * button. The celebration mark is an Insignia artwork slot (bespoke badge art), never a
 * generic icon; the body is the locked ceremony line.
 *
 * Under Reduce Motion the reveal collapses to instant (no fade). No blur backdrop
 * (expo-blur isn't a dependency) — a solid overlay-dark scrim stands in; accepted delta.
 */

import React from 'react'
import { Modal as RNModal, StyleSheet, Text, View } from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'
import { flColor, flFont, flRadius, flShadow } from '@/constants/foundation'

export interface ModalProps {
  open: boolean
  /** Invoked by a footer action or hardware back — NEVER by tapping the scrim. */
  onClose: () => void
  eyebrow?: string
  title: string
  /** Secondary line under the title (e.g. M-3 chapter name). */
  subtitle?: string
  /** Insignia artwork slot. */
  artwork?: React.ReactNode
  /** The locked ceremony line. */
  children?: React.ReactNode
  /** Action buttons (stacked). */
  footer?: React.ReactNode
}

export function Modal({ open, onClose, eyebrow, title, subtitle, artwork, children, footer }: ModalProps) {
  const reduceMotion = useReducedMotion()
  return (
    <RNModal
      visible={open}
      transparent
      statusBarTranslucent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
    >
      {/* scrim is a plain View — deliberately NOT pressable (no tap-outside dismiss) */}
      <View style={styles.scrim}>
        <View style={styles.card} accessibilityViewIsModal accessibilityRole="alert">
          {artwork ? <View style={styles.artwork}>{artwork}</View> : null}
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {children != null ? <Text style={styles.body}>{children}</Text> : null}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </RNModal>
  )
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: flColor.overlayDark,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
    gap: 14,
    borderRadius: flRadius.xl,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal900,
    boxShadow: flShadow.ambient,
  },
  artwork: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: flColor.bronze400,
  },
  title: {
    fontFamily: flFont.display,
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 30,
    textAlign: 'center',
    color: flColor.cream100,
  },
  subtitle: {
    fontFamily: flFont.display,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.1,
    textAlign: 'center',
    color: flColor.gray400,
    marginTop: -6,
  },
  body: {
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: 'center',
    color: flColor.gray400,
    maxWidth: 300,
  },
  footer: {
    alignSelf: 'stretch',
    marginTop: 8,
    gap: 10,
  },
})
