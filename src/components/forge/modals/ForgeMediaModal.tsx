/**
 * ForgeMediaModal
 * Spec: Forge Modal Library.dc.html Â§07
 *
 * Full-bleed viewer for photos and form-check clips.
 * Photo chrome: close + zoom top, caption + metadata bottom.
 * Video chrome (spec Â§07 video variant): badge chip top, title +
 * timestamped scrubber bottom — playback Â· scrubber Â· close action.
 */

import React, { useState } from 'react'
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
import { MODAL } from './_modalTokens'
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
  badge,
  videoTitle,
  positionSeconds = 0,
  durationSeconds,
  onSeek,
  accessibilityLabel = 'Media viewer',
}: ForgeMediaModalProps) {
  const insets = useSafeAreaInsets()
  const [trackWidth, setTrackWidth] = useState(0)

  const isVideo = typeof durationSeconds === 'number' && durationSeconds > 0
  const playedFraction = isVideo
    ? Math.min(1, Math.max(0, positionSeconds / durationSeconds))
    : 0

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
            hitSlop={(MODAL.TAP_MIN - 34) / 2}
            style={({ pressed }) => [styles.chromeBtn, pressed && styles.chromeBtnPressed]}
          >
            <Feather name="x" size={15} color={color.text.primary} />
          </Pressable>

          {/* Context badge (e.g. "Form Check") */}
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>{badge}</Text>
            </View>
          ) : null}

          {/* Zoom controls */}
          {showZoom ? (
            <View style={styles.zoomGroup}>
              <Pressable
                onPress={onZoomIn}
                accessibilityLabel="Zoom in"
                accessibilityRole="button"
                hitSlop={(MODAL.TAP_MIN - 34) / 2}
                style={({ pressed }) => [styles.chromeBtn, pressed && styles.chromeBtnPressed]}
              >
                <Feather name="zoom-in" size={15} color={color.text.primary} />
              </Pressable>
              <Pressable
                onPress={onZoomOut}
                accessibilityLabel="Zoom out"
                accessibilityRole="button"
                hitSlop={(MODAL.TAP_MIN - 34) / 2}
                style={({ pressed }) => [styles.chromeBtn, pressed && styles.chromeBtnPressed]}
              >
                <Feather name="zoom-out" size={15} color={color.text.primary} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.chromeSpacer} />
          )}
        </View>

        {/* Bottom chrome */}
        {(isVideo || caption || metadata) ? (
          <View style={[styles.bottomChrome, { paddingBottom: insets.bottom + 16 }]}>
            {isVideo ? (
              <View style={styles.scrubberBlock}>
                {videoTitle ? (
                  <Text style={styles.videoTitle}>{videoTitle}</Text>
                ) : null}
                <View style={styles.scrubberRow}>
                  <Text style={styles.timestamp}>{_fmtTime(positionSeconds)}</Text>
                  <Pressable
                    onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
                    onPress={e => {
                      if (onSeek && trackWidth > 0 && durationSeconds) {
                        const fraction = Math.min(1, Math.max(0, e.nativeEvent.locationX / trackWidth))
                        onSeek(fraction * durationSeconds)
                      }
                    }}
                    accessibilityLabel="Seek"
                    accessibilityRole="adjustable"
                    accessibilityValue={{
                      min: 0,
                      max: Math.round(durationSeconds ?? 0),
                      now: Math.round(positionSeconds),
                    }}
                    hitSlop={12}
                    style={styles.scrubberTrack}
                  >
                    <View style={[styles.scrubberFill, { width: `${playedFraction * 100}%` }]} />
                    <View style={[styles.scrubberThumb, { left: `${playedFraction * 100}%` }]} />
                  </Pressable>
                  <Text style={styles.timestamp}>{_fmtTime(durationSeconds ?? 0)}</Text>
                </View>
              </View>
            ) : null}
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

function _fmtTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const ss = String(s % 60).padStart(2, '0')
  return `${m}:${ss}`
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
  chromeSpacer: {
    width: 34,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: color.border.subtle,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: color.text.primary,
  },
  // Video scrubber — spec §07 video variant
  scrubberBlock: {
    gap: 10,
    marginBottom: 4,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: color.text.primary,
  },
  scrubberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timestamp: {
    fontSize: 11,
    color: color.text.secondary,
    fontVariant: ['tabular-nums'],
  },
  scrubberTrack: {
    flex: 1,
    height: 4,
    borderRadius: 99,
    backgroundColor: color.progressTrack,
  },
  scrubberFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 99,
    backgroundColor: color.accent.primary,
  },
  scrubberThumb: {
    position: 'absolute',
    top: -3.5,
    width: 11,
    height: 11,
    marginLeft: -5.5,
    borderRadius: 99,
    backgroundColor: color.accent.primary,
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
