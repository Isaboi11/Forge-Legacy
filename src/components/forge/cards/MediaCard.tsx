/**
 * Unassigned — not yet in the CLA-Cxx registry (Component-Library-Architecture-v1.0.md)
 * Tier: 2 (Composite)
 * Spec: Forge Card Library.dc.html §08
 *
 * User photos and videos, PR media, workout proof.
 * Anatomy: square media area · caption/title · metadata row · action row
 * States: default · loading · uploading · error · selected
 */

import React from 'react'
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { color, space } from '@/constants/tokens'
import { CARD } from './_cardTokens'
import type { MediaCardState } from './types'

export interface MediaCardProps {
  /** URI for the media image */
  imageUri?: string
  title?: string
  meta?: string
  uploadProgress?: number
  state?: MediaCardState
  onPress?: () => void
  actionLabel?: string
  onActionPress?: () => void
}

export function MediaCard({
  imageUri,
  title,
  meta,
  uploadProgress = 0,
  state = 'default',
  onPress,
  actionLabel,
  onActionPress,
}: MediaCardProps) {
  const isLoading   = state === 'loading'
  const isUploading = state === 'uploading'
  const isError     = state === 'error'
  const isSelected  = state === 'selected'

  const borderColor: string = isSelected
    ? color.accent.primary
    : isError
    ? color.danger
    : CARD.BORDER

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.80 : 1}
      style={[styles.base, { borderColor }, isSelected && styles.selectedBase]}
    >
      {/* Top highlight */}
      <View style={styles.topHighlight} pointerEvents="none" />

      {/* Square media area */}
      <View style={styles.mediaArea}>
        {imageUri && !isLoading && !isError ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.mediaPlaceholder}>
            {isLoading && <ActivityIndicator size="large" color={color.accent.primary} />}
            {isError && (
              <View style={styles.errorContent}>
                <Feather name="alert-circle" size={28} color={color.danger} />
                <Text style={styles.errorText}>Failed to load</Text>
              </View>
            )}
            {!isLoading && !isError && (
              <Feather name="image" size={30} color={color.text.tertiary} />
            )}
          </View>
        )}

        {/* Uploading overlay */}
        {isUploading && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator size="small" color={color.accent.primary} />
            <Text style={styles.uploadText}>
              {Math.round(uploadProgress * 100)}%
            </Text>
            <View style={styles.uploadTrack}>
              <View
                style={[
                  styles.uploadFill,
                  { width: `${Math.round(uploadProgress * 100)}%` as `${number}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* Selected indicator */}
        {isSelected && (
          <View style={styles.selectedBadge}>
            <Feather name="check" size={14} color={color.text.inverse} />
          </View>
        )}
      </View>

      {/* Caption */}
      <View style={styles.caption}>
        {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
        {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}

        {actionLabel ? (
          <TouchableOpacity onPress={onActionPress} style={styles.action}>
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: CARD.RADIUS,
    backgroundColor: color.background.surface,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedBase: {
    shadowColor: '#C8A97E',
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 1,
    backgroundColor: CARD.INNER_HIGHLIGHT,
  },
  mediaArea: {
    aspectRatio: 1,
    backgroundColor: color.background.elevated,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181F',
  },
  errorContent: {
    alignItems: 'center',
    gap: space.xs,
  },
  errorText: {
    fontSize: 12,
    color: color.danger,
  },
  uploadOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9,9,12,0.70)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: color.text.primary,
  },
  uploadTrack: {
    width: 80,
    height: 4,
    borderRadius: 99,
    backgroundColor: CARD.BORDER,
    overflow: 'hidden',
  },
  uploadFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: color.accent.primary,
  },
  selectedBadge: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: 26,
    height: 26,
    borderRadius: 99,
    backgroundColor: color.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    padding: CARD.PADDING,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: color.text.primary,
  },
  meta: {
    fontSize: 13,
    color: color.text.tertiary,
  },
  action: {
    marginTop: space.xs,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: color.accent.primary,
  },
})
