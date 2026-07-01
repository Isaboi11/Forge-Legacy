/**
 * ForgeMediaModal
 * Spec: Forge Modal Library.dc.html Â§07
 *
 * Full-bleed viewer for photos and form-check clips.
 * Chrome floats over the media: close + zoom top, caption + metadata bottom.
 * Chrome fades on idle â€” consumers control this via `chromeVisible` prop.
 */

import React from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { color } from '@/constants/tokens'
import type { ForgeMediaModalProps } from './types'

export function ForgeMediaModal({
  visible,
  onClose,
  media,
  caption,
  metadata,
  showZoom = true,
  onZoomIn,
  onZoomOut,
  accessibilityLabel = 'Media viewer',
}: ForgeMediaModalProps) {
  const insets = useSafeAreaInsets()

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <View
        style={styles.container}
        accessibilityLabel={accessibilityLabel}
        
        accessibilityViewIsModal
      >
        {/* Media fills the screen */}
        <View style={styles.mediaArea}>{media}</View>

        {/* Top chrome */}
        <View style={[styles.topChrome, { paddingTop: insets.top + 8 }]}>
          {/* Close */}
          <Pressable
            onPress={onClose}
            accessibilityLabel="Close"
            accessibilityRole="button"
            style={({ pressed }) => [styles.chromeBtn, pressed && styles.chromeBtnPressed]}
          >
            <Feather name="x" size={15} color={color.text.primary} />
          </Pressable>

          {/* Zoom controls */}
          {showZoom ? (
            <View style={styles.zoomGroup}>
              <Pressable
                onPress={onZoomIn}
                accessibilityLabel="Zoom in"
                accessibilityRole="button"
                style={({ pressed }) => [styles.chromeBtn, pressed && styles.chromeBtnPressed]}
              >
                <Feather name="zoom-in" size={15} color={color.text.primary} />
              </Pressable>
              <Pressable
                onPress={onZoomOut}
                accessibilityLabel="Zoom out"
                accessibilityRole="button"
                style={({ pressed }) => [styles.chromeBtn, pressed && styles.chromeBtnPressed]}
              >
                <Feather name="zoom-out" size={15} color={color.text.primary} />
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Bottom chrome */}
        {(caption || metadata) ? (
          <View style={[styles.bottomChrome, { paddingBottom: insets.bottom + 16 }]}>
            {caption ? (
              <Text style={styles.caption}>{caption}</Text>
            ) : null}
            {metadata ? (
              <Text style={styles.metadata}>{metadata}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mediaArea: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topChrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    // gradient-like fade from black to transparent
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  zoomGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  chromeBtn: {
    width: 34,
    height: 34,
    borderRadius: 99,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: color.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chromeBtnPressed: {
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  bottomChrome: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    gap: 4,
  },
  caption: {
    fontSize: 15,
    color: color.text.primary,
    lineHeight: 20,
  },
  metadata: {
    fontSize: 12,
    color: color.text.secondary,
  },
})
