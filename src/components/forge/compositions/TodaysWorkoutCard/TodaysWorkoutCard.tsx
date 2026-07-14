/**
 * TodaysWorkoutCard — the Home "Today's Workout" hero.
 * Source of truth: Forge Home.dc.html (§ Today's Workout, lines 112–140).
 *
 * Consumes ONLY the resolved artwork object from the Home Workout Artwork Resolver
 * (`src/domain/home-artwork`) plus display strings — it holds NO classification logic
 * (resolver spec principle). The faint top-right art is the resolver's choice for
 * *today's* session; RN has no mix-blend/mask, so it's approximated with opacity + a
 * LinearGradient edge-fade (accepted platform delta). If the art isn't registered,
 * the card degrades to its bronze wash + icon — never a crash, never a broken image.
 */

import React from 'react'
import { Image } from 'expo-image'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { flColor, flFont, flGradient, flRadius, flShadow, flType } from '@/constants/foundation'
import type { ResolvedArtwork } from '@/domain/home-artwork/types'
import { resolveArtworkSource } from '@/domain/home-artwork/artwork-source'
import { Button } from '../../composites/Button'
import { BarbellIcon, ChevronRightIcon, FlameIcon } from '../../primitives/icons/HomeIcons'

export interface TodaysWorkoutCardProps {
  resolved: ResolvedArtwork
  title: string
  focus?: string
  exerciseCount: number
  onStart?: () => void
  onPreview?: () => void
}

export function TodaysWorkoutCard({ resolved, title, focus, exerciseCount, onStart, onPreview }: TodaysWorkoutCardProps) {
  const artSource = resolveArtworkSource(resolved.assetPath)

  return (
    <View style={styles.card}>
      {/* faint warm wash */}
      <LinearGradient
        pointerEvents="none"
        colors={flGradient.missionCardWash.colors}
        locations={flGradient.missionCardWash.locations}
        start={flGradient.missionCardWash.start}
        end={flGradient.missionCardWash.end}
        style={StyleSheet.absoluteFill}
      />

      {/* resolved workout art — faint, bleeds from the top-right; masked left by a fade */}
      {artSource != null ? (
        <View pointerEvents="none" style={styles.artLayer}>
          <Image source={artSource} style={styles.art} contentFit="contain" contentPosition="top right" />
          <LinearGradient
            colors={[flColor.charcoal900, 'rgba(12,16,19,0.65)', 'rgba(12,16,19,0)']}
            locations={[0, 0.42, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      ) : null}

      <View style={styles.content}>
        <Pressable
          onPress={onPreview}
          accessibilityRole={onPreview ? 'button' : undefined}
          accessibilityLabel={`Today's workout: ${title}. ${focus ?? ''} ${exerciseCount} exercises. Double-tap to preview.`}
          style={styles.previewRow}
        >
          <View style={styles.iconChip}>
            <BarbellIcon size={24} />
          </View>
          <View style={styles.headText}>
            <Text style={flType.missionEyebrowMuted}>Today’s Workout</Text>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            {focus ? <Text style={styles.focus}>{focus}</Text> : null}
          </View>
        </Pressable>

        <View style={styles.metaBlock}>
          <View style={styles.metaDivider} />
          <View style={styles.metaRow}>
            <BarbellIcon size={16} color={flColor.bronze400} />
            <Text style={styles.metaText}>{exerciseCount} Exercises</Text>
            <View style={styles.metaChevron}>
              <ChevronRightIcon size={15} color={flColor.gray600} />
            </View>
          </View>
        </View>

        <Button variant="primary" fullWidth onPress={onStart} icon={<FlameIcon />} accessibilityLabel="Start workout">
          Start Workout
        </Button>
      </View>
    </View>
  )
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
  },
  artLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  art: {
    position: 'absolute',
    top: -18,
    right: -24,
    bottom: -18,
    width: '62%',
    opacity: 0.55,
  },
  content: {
    padding: 22,
    paddingTop: 22,
    gap: 18,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    maxWidth: '78%',
  },
  iconChip: {
    width: 52,
    height: 52,
    marginTop: 4,
    flexShrink: 0,
    borderRadius: flRadius.round,
    borderWidth: 1,
    borderColor: flColor.bronzeBorder,
    backgroundColor: flColor.charcoal800,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: flShadow.glowSubtle,
  },
  headText: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  title: {
    fontFamily: flFont.display,
    fontSize: 30,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 32,
    color: flColor.cream100,
  },
  focus: {
    fontSize: 14,
    color: flColor.gray400,
  },
  metaBlock: {
    gap: 9,
  },
  metaDivider: {
    height: 1,
    maxWidth: 150,
    backgroundColor: flColor.bronzeBorderSubtle,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: flColor.gray400,
  },
  metaChevron: {
    marginLeft: 'auto',
  },
})
