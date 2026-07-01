/**
 * ForgeErrorModal
 * Spec: Forge Modal Library.dc.html Â§10
 *
 * Calm, non-alarming failure states. Danger tone marks the icon only.
 * Copy reassures that nothing was lost. Every error offers a way forward.
 *
 * Variants: network | upload | session | generic
 */

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { color } from '@/constants/tokens'
import { MODAL } from './_modalTokens'
import { ForgeModal } from './ForgeModal'
import type { ErrorVariant, ForgeErrorModalProps } from './types'

export function ForgeErrorModal({
  visible,
  onClose,
  variant = 'generic',
  iconName,
  title,
  description,
  primaryAction,
  secondaryAction,
  accessibilityLabel = 'Error',
}: ForgeErrorModalProps) {
  const defaults = _defaults(variant)
  const icon = iconName ?? defaults.icon
  const displayTitle = title ?? defaults.title
  const displayDesc  = description ?? defaults.description

  return (
    <ForgeModal
      visible={visible}
      onClose={onClose}
      dismissible
      variant="small"
      primaryAction={primaryAction ?? defaults.primaryAction}
      secondaryAction={secondaryAction ?? defaults.secondaryAction}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.content}>
        {/* Danger icon circle */}
        <View style={styles.iconCircle}>
          <Feather name={icon as 'wifi-off'} size={24} color={color.danger} />
        </View>

        {/* Text */}
        <View style={styles.textGroup}>
          <Text style={styles.title}>{displayTitle}</Text>
          {displayDesc ? (
            <Text style={styles.description}>{displayDesc}</Text>
          ) : null}
        </View>
      </View>
    </ForgeModal>
  )
}

function _defaults(variant: ErrorVariant) {
  switch (variant) {
    case 'network':
      return {
        icon:        'wifi-off',
        title:       'No Connection',
        description: 'Check your internet and try again. Nothing you did was lost.',
        primaryAction:   { label: 'Retry',   onPress: () => {} },
        secondaryAction: { label: 'Dismiss', onPress: () => {} },
      }
    case 'upload':
      return {
        icon:        'upload-cloud',
        title:       'Upload Failed',
        description: 'Your file couldn\'t be uploaded. It\'s still saved on your device.',
        primaryAction:   { label: 'Try Again', onPress: () => {} },
        secondaryAction: { label: 'Dismiss',   onPress: () => {} },
      }
    case 'session':
      return {
        icon:        'log-out',
        title:       'Session Expired',
        description: 'Sign in again to continue. Your progress is saved.',
        primaryAction:   { label: 'Sign In', onPress: () => {} },
        secondaryAction: { label: 'Dismiss', onPress: () => {} },
      }
    case 'generic':
    default:
      return {
        icon:        'alert-circle',
        title:       'Something Went Wrong',
        description: 'We\'re looking into it. Try again in a moment.',
        primaryAction:   { label: 'Retry',       onPress: () => {} },
        secondaryAction: { label: 'Learn More',  onPress: () => {} },
      }
  }
}

// Type reference
void (undefined as unknown as ErrorVariant)

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: 14,
    paddingTop: 4,
  },
  iconCircle: {
    width: MODAL.ICON_BOX_ERROR,
    height: MODAL.ICON_BOX_ERROR,
    borderRadius: MODAL.RADIUS_PILL,
    backgroundColor: MODAL.DANGER_GLOW,
    borderWidth: 1,
    borderColor: color.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: color.text.primary,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: color.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
  },
})
