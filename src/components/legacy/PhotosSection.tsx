/**
 * ⚠️ LEGACY (2026-07-14) — old `legacy-theme` component, NO LONGER USED BY THE
 * Legacy tab. Superseded this session (STEP D) by the foundation-based
 * `src/app/legacy.tsx`, rebuilt to the handoff `Forge Legacy.dc.html`. Retained
 * (not deleted) as reference — still consumed by the non-tab `/legacy-design-test`
 * dev route.
 */
import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { LC, LS } from '@/constants/legacy-theme'
import { SectionLabel } from './SectionLabel'
import { ViewAllLink } from './ViewAllLink'
import type { LegacyPhoto } from '@/types/legacy'

type Props = {
  photos: LegacyPhoto[]
  totalCount: number
  onPhotoPress?: (photo: LegacyPhoto) => void
  onViewAll?: () => void
}

export function PhotosSection({ photos, totalCount, onPhotoPress, onViewAll }: Props) {
  if (photos.length === 0) return null

  return (
    <View>
      <SectionLabel label="Photos" count={totalCount} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
        style={styles.scroll}
      >
        {photos.map(photo => (
          <TouchableOpacity
            key={photo.id}
            style={[styles.thumb, { backgroundColor: photo.placeholderColor }]}
            onPress={() => onPhotoPress?.(photo)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Photo from ${photo.chapterName}, added ${photo.addedDate}`}
          />
        ))}
      </ScrollView>
      <ViewAllLink
        label={`View All ${totalCount} Photos`}
        onPress={onViewAll}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: {
    marginTop: LS.labelGap,
    marginHorizontal: -LS.screenPadH,
  },
  strip: {
    paddingHorizontal: LS.screenPadH,
    gap: LS.photoGap,
  },
  thumb: {
    width: LS.photoSize,
    height: LS.photoSize,
    borderRadius: 8,
  },
})
