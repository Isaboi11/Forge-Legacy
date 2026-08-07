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
  /**
   * The kicker above the title. Defaults to "Today's Workout" — the program day this card was built for.
   *
   * It became a prop when the card started serving athletes who have no program: "Today's Workout" over a
   * half-finished session the athlete abandoned yesterday is a small lie, and over a blank slate with
   * nothing planned it is a larger one. One card telling the truth in three modes beats three cards.
   */
  eyebrow?: string
  /**
   * How many exercises are in the session — OMITTED ENTIRELY when there is no session to count.
   *
   * Optional rather than defaulting to 0 on purpose. An athlete about to build their day as they go has no
   * exercise count; "0 Exercises" is not that fact, it is a confident claim of emptiness, and the card
   * drops the whole meta row rather than make it.
   */
  exerciseCount?: number
  onStart?: () => void
  /**
   * Unfinished work waiting in local storage, as "N sets logged" — or null when there is none.
   *
   * The session was ALREADY being autosaved on every set and the logger already offered to resume it.
   * Nothing on Home said so, so the only way to discover your workout survived a crashed tab was to
   * navigate back into the logger and find out. The recovery existed; the sentence announcing it did not.
   */
  resumeSets?: number | null
  onPreview?: () => void
  /**
   * "Not today's" — starts a one-off instead. The hero is where the planned session is proposed, so it
   * is the only place the question "what if I don't want that" actually gets asked.
   */
  onFreestyle?: () => void
}

export function TodaysWorkoutCard({ resolved, title, focus, eyebrow, exerciseCount, onStart, resumeSets, onPreview, onFreestyle }: TodaysWorkoutCardProps) {
  const artSource = resolveArtworkSource(resolved.assetPath)
  const kicker = eyebrow ?? 'Today’s Workout'
  // "1 Exercises" was unreachable while this card only ever drew program days. A one-block cardio resume
  // makes it reachable immediately, so the plural is decided rather than assumed.
  const countLabel = exerciseCount == null ? null : `${exerciseCount} Exercise${exerciseCount === 1 ? '' : 's'}`

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

      {/* resolved workout art — a figure bleeding from the top-right. The assets are pre-processed to
          TRANSPARENT backgrounds (dark → alpha via luminance), so the figure lands directly on the card
          with no panel, edge line, fade, blend, or crop — and it's uniform for every asset shape. */}
      {artSource != null ? (
        <View pointerEvents="none" style={styles.artLayer}>
          <Image source={artSource} style={styles.art} contentFit="contain" contentPosition="top right" />
        </View>
      ) : null}

      <View style={styles.content}>
        {/* Pressable only when there is somewhere to go. Home passes a handler for the PROGRAM face —
            which opens the session preview — and none for `resume` (the logger is already the view of
            that session) or `open` (nothing is planned to preview). */}
        <Pressable
          onPress={onPreview}
          disabled={!onPreview}
          accessibilityRole={onPreview ? 'button' : undefined}
          accessibilityLabel={[
            `${kicker}: ${title}.`,
            focus,
            countLabel != null ? `${countLabel}.` : null,
            onPreview ? 'Double-tap to preview.' : null,
          ]
            .filter(Boolean)
            .join(' ')}
          style={styles.previewRow}
        >
          <View style={styles.iconChip}>
            <BarbellIcon size={24} />
          </View>
          <View style={styles.headText}>
            <Text style={flType.missionEyebrowMuted}>{kicker}</Text>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            {focus ? <Text style={styles.focus}>{focus}</Text> : null}
          </View>
        </Pressable>

        {/* No count, no row. See `exerciseCount` — an unplanned session has nothing to state here, and a
            divider over "0 Exercises" would state it anyway. */}
        {countLabel != null ? (
          <View style={styles.metaBlock}>
            <View style={styles.metaDivider} />
            {/*
              ⚠ THE ROW IS THE BUTTON, not just the chevron's neighbour.
              This was a plain `View`, so the chevron — the one thing on the card that LOOKS like it
              opens something — did nothing at all. The only tappable area was the title above it, which
              carries no affordance. Reported as "the arrow isn't currently working", and it never was:
              it was drawn as a control and mounted as decoration.
            */}
            <Pressable
              onPress={onPreview}
              disabled={!onPreview}
              accessibilityRole={onPreview ? 'button' : undefined}
              accessibilityLabel={onPreview ? `${countLabel}. Double-tap to preview the workout.` : undefined}
              style={styles.metaRow}
            >
              <BarbellIcon size={16} color={flColor.bronze400} />
              <Text style={styles.metaText}>{countLabel}</Text>
              {onPreview ? (
                <View style={styles.metaChevron}>
                  <ChevronRightIcon size={15} color={flColor.gray600} />
                </View>
              ) : null}
            </Pressable>
          </View>
        ) : null}

        <Button
          variant="primary"
          fullWidth
          onPress={onStart}
          icon={<FlameIcon />}
          accessibilityLabel={resumeSets ? `Continue workout — ${resumeSets} sets already logged` : 'Start workout'}
        >
          {resumeSets ? 'Continue Workout' : 'Start Workout'}
        </Button>
        {/* The count is the reassurance. "Continue" alone still leaves you wondering what survived. */}
        {resumeSets ? (
          <Text style={styles.resumeNote}>
            {resumeSets} set{resumeSets === 1 ? '' : 's'} logged — pick up where you left off
          </Text>
        ) : null}

        {/* One line, under the thing it is an alternative to. Not a second button — a one-off is the
            quieter choice and should look like it. */}
        {onFreestyle ? (
          <Pressable
            onPress={onFreestyle}
            accessibilityRole="button"
            accessibilityLabel="Do something else today — start a one-off workout"
            hitSlop={8}
            style={({ pressed }) => [styles.freestyleRow, pressed ? styles.freestylePressed : null]}
          >
            <Text style={styles.freestyleText}>Something else today?</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  resumeNote: { marginTop: 8, textAlign: 'center', fontSize: 12.5, color: flColor.gray600 },
  freestyleRow: { alignSelf: 'center', marginTop: 12, paddingVertical: 4 },
  freestylePressed: { opacity: 0.7 },
  freestyleText: { fontSize: 12.5, fontWeight: '600', color: flColor.gray400 },
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
    opacity: 1,
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
